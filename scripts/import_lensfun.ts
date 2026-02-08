#!/usr/bin/env tsx
/**
 * Lensfun XML Import Script
 * 
 * Downloads and imports Lensfun lens database XML files into our local database.
 * 
 * Usage:
 *   npx tsx scripts/import_lensfun.ts [--offline]
 * 
 * Options:
 *   --offline  Skip download, use existing XML files in data/lensfun/
 * 
 * The script will:
 * 1. Download XML files from Lensfun repo (if not offline)
 * 2. Parse lens entries
 * 3. Normalize and tokenize for matching
 * 4. Insert into lensfun_lenses table
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import { XMLParser } from 'fast-xml-parser'
import { prisma } from '@/lib/prisma'
import { normalizeString, extractKeyTokens } from '@/lib/lensfunMatchConfidence'

const DATA_DIR = path.join(process.cwd(), 'data', 'lensfun')
const LENSFUN_BASE_URL = 'https://raw.githubusercontent.com/lensfun/lensfun/master/data/db'

// Common Lensfun XML files (camera-specific)
const XML_FILES = [
  'slr-canon.xml',
  'slr-nikon.xml',
  'slr-sony.xml',
  'slr-fujifilm.xml',
  'slr-panasonic.xml',
  'slr-olympus.xml',
  'slr-pentax.xml',
  'slr-leica.xml',
  'compact-canon.xml',
  'compact-nikon.xml',
  'compact-sony.xml',
  'compact-fujifilm.xml',
  'compact-panasonic.xml',
  'mil-canon.xml',      // Mirrorless
  'mil-nikon.xml',
  'mil-sony.xml',
  'mil-fujifilm.xml',
  'mil-panasonic.xml',
  'mil-olympus.xml',
  // Third-party lenses
  'slr-sigma.xml',
  'slr-tamron.xml',
  'slr-tokina.xml',
  'slr-samyang.xml',
  'slr-zeiss.xml',
  'slr-voigtlander.xml',
]

interface ParsedLens {
  maker: string
  model: string
  variant?: string
  mounts: string[]
  cropFactor?: number
  aspectRatio?: string
  type?: string
  focalMin?: number
  focalMax?: number
  apertureMin?: number
  apertureMax?: number
  hasDistortion: boolean
  hasVignetting: boolean
  hasTca: boolean
  raw: any
  rawXml: string
  sourceFile: string
}

function collectNumericValues(value: any): number[] {
  const out: number[] = []
  const visit = (v: any) => {
    if (v === null || v === undefined) return
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.push(v)
      return
    }
    if (typeof v === 'string') {
      const n = Number(v)
      if (Number.isFinite(n)) out.push(n)
      return
    }
    if (Array.isArray(v)) {
      v.forEach(visit)
      return
    }
    if (typeof v === 'object') {
      Object.values(v).forEach(visit)
    }
  }
  visit(value)
  return out
}

function gatherCalibrationNumbers(calibration: any): { focals: number[]; apertures: number[] } {
  const focals: number[] = []
  const apertures: number[] = []

  const visit = (node: any) => {
    if (!node) return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (typeof node !== 'object') return

    // Lensfun calibration nodes commonly use attributes like focal/aperture/distance
    if ('focal' in node) focals.push(...collectNumericValues((node as any).focal))
    if ('aperture' in node) apertures.push(...collectNumericValues((node as any).aperture))

    Object.values(node).forEach(visit)
  }

  visit(calibration)
  return { focals, apertures }
}

function parseFocalFromModel(model: string): { min?: number; max?: number } {
  const normalized = normalizeString(model)

  // Zoom ranges like "70-200mm"
  const zoom = normalized.match(/\b(\d{1,4}(?:\.\d+)?)\s*-\s*(\d{1,4}(?:\.\d+)?)mm\b/)
  if (zoom) {
    const min = Number(zoom[1])
    const max = Number(zoom[2])
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) }
    }
  }

  // Prime like "500mm"
  const prime = normalized.match(/\b(\d{1,4}(?:\.\d+)?)mm\b/)
  if (prime) {
    const f = Number(prime[1])
    if (Number.isFinite(f)) return { min: f, max: f }
  }

  return {}
}

function parseApertureFromModel(model: string): { min?: number; max?: number } {
  const normalized = normalizeString(model)

  // Variable max aperture like "f4.5-5.6" or "f/4.5-5.6"
  const range = normalized.match(/\bf(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(?=[a-z\s]|$)/)
  if (range) {
    const a = Number(range[1])
    const b = Number(range[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { min: Math.min(a, b), max: Math.max(a, b) }
    }
  }

  // Constant max aperture like "f2.8"
  const single = normalized.match(/\bf(\d+(?:\.\d+)?)(?=[a-z\s]|$)/)
  if (single) {
    const a = Number(single[1])
    if (Number.isFinite(a)) return { min: a, max: a }
  }

  return {}
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

/**
 * Download all Lensfun XML files
 */
async function downloadLensfunFiles(): Promise<void> {
  console.log('📥 Downloading Lensfun XML files...')
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  
  let downloaded = 0
  let skipped = 0
  
  for (const filename of XML_FILES) {
    const url = `${LENSFUN_BASE_URL}/${filename}`
    const dest = path.join(DATA_DIR, filename)
    
    if (fs.existsSync(dest)) {
      console.log(`  ⏭️  Skipping ${filename} (already exists)`)
      skipped++
      continue
    }
    
    try {
      console.log(`  ⬇️  Downloading ${filename}...`)
      await downloadFile(url, dest)
      downloaded++
    } catch (error: any) {
      console.warn(`  ⚠️  Failed to download ${filename}: ${error.message}`)
    }
  }
  
  console.log(`✅ Downloaded ${downloaded} files, skipped ${skipped} existing\n`)
}

/**
 * Parse a Lensfun XML file
 */
function parseLensfunXML(filePath: string): ParsedLens[] {
  const xmlContent = fs.readFileSync(filePath, 'utf-8')
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_text',
    parseAttributeValue: true
  })
  
  const result = parser.parse(xmlContent)
  const lenses: ParsedLens[] = []
  
  // Navigate to lensdatabase > lens array
  const lensdatabase = result.lensdatabase
  if (!lensdatabase || !lensdatabase.lens) {
    return lenses
  }
  
  const lensArray = Array.isArray(lensdatabase.lens) ? lensdatabase.lens : [lensdatabase.lens]
  
  for (const lens of lensArray) {
    try {
      // Handle maker field which can be string, object, or array
      let maker: string
      if (typeof lens.maker === 'string') {
        maker = lens.maker
      } else if (lens.maker?._text) {
        maker = lens.maker._text
      } else if (Array.isArray(lens.maker)) {
        maker = lens.maker.map((m: any) => m?._text || m).filter(Boolean).join(' ')
      } else if (typeof lens.maker === 'object') {
        maker = JSON.stringify(lens.maker)
      } else {
        maker = 'Unknown'
      }
      
      // Handle model field which can be string, object, or array
      let model: string
      if (typeof lens.model === 'string') {
        model = lens.model
      } else if (lens.model?._text) {
        model = lens.model._text
      } else if (Array.isArray(lens.model)) {
        // If array, join or take first element
        model = lens.model.map((m: any) => m._text || m).filter(Boolean).join(', ')
      } else if (typeof lens.model === 'object') {
        // If object, try to extract text or stringify
        model = JSON.stringify(lens.model)
      } else {
        model = ''
      }
      
      if (!model || typeof model !== 'string') continue // Skip if no valid model
      
      // Parse mounts
      let mounts: string[] = []
      if (lens.mount) {
        const mountArray = Array.isArray(lens.mount) ? lens.mount : [lens.mount]
        mounts = mountArray
          .map((m: any) => m._text || m)
          .filter((m: string) => m && m.trim())
      }
      
      // Parse calibration data (focal ranges might be nested)
      let focalMin: number | undefined
      let focalMax: number | undefined
      let apertureMin: number | undefined
      let apertureMax: number | undefined
      
      // Check for calibration data
      const hasDistortion = !!lens.calibration?.distortion
      const hasVignetting = !!lens.calibration?.vignetting
      const hasTca = !!lens.calibration?.tca
      
      // Prefer parsing focal/aperture specs from model text (these represent lens specs),
      // and only fall back to calibration-derived ranges when model text lacks them.
      const modelFocal = parseFocalFromModel(model)
      const modelAperture = parseApertureFromModel(model)

      // Try to extract focal/aperture from calibration as a fallback (or to fill missing focal for fixed-lens compacts)
      let calFocalMin: number | undefined
      let calFocalMax: number | undefined
      let calApertureMin: number | undefined
      let calApertureMax: number | undefined
      if (lens.calibration) {
        const cal = Array.isArray(lens.calibration) ? lens.calibration[0] : lens.calibration
        const { focals, apertures } = gatherCalibrationNumbers(cal)
        if (focals.length > 0) {
          const sorted = focals.filter(Number.isFinite).sort((a, b) => a - b)
          calFocalMin = sorted[0]
          calFocalMax = sorted[sorted.length - 1]
        }
        if (apertures.length > 0) {
          const sorted = apertures.filter(Number.isFinite).sort((a, b) => a - b)
          calApertureMin = sorted[0]
          calApertureMax = sorted[sorted.length - 1]
        }
      }

      // Focal: use model-derived if present, else calibration-derived
      if (modelFocal.min !== undefined) focalMin = modelFocal.min
      else if (calFocalMin !== undefined) focalMin = calFocalMin
      if (modelFocal.max !== undefined) focalMax = modelFocal.max
      else if (calFocalMax !== undefined) focalMax = calFocalMax

      // Aperture: use model-derived max aperture range if present, else calibration-derived
      if (modelAperture.min !== undefined) apertureMin = modelAperture.min
      else if (calApertureMin !== undefined) apertureMin = calApertureMin
      if (modelAperture.max !== undefined) apertureMax = modelAperture.max
      else if (calApertureMax !== undefined) apertureMax = calApertureMax
      
      // Parse variant
      const variant = lens.variant?._text || lens.variant
      
      // Parse other attributes
      const cropFactor = lens.cropfactor ? parseFloat(lens.cropfactor) : undefined
      const aspectRatio = lens.aspect?._text || lens.aspect
      const type = lens.type?._text || lens.type
      
      lenses.push({
        maker,
        model,
        variant,
        mounts,
        cropFactor,
        aspectRatio,
        type,
        focalMin,
        focalMax,
        apertureMin,
        apertureMax,
        hasDistortion,
        hasVignetting,
        hasTca,
        raw: lens,
        rawXml: JSON.stringify(lens),
        sourceFile: path.basename(filePath)
      })
    } catch (error: any) {
      console.warn(`⚠️  Failed to parse lens in ${filePath}: ${error.message}`)
    }
  }
  
  return lenses
}

/**
 * Import lenses into database
 */
async function importLensesToDatabase(
  lenses: ParsedLens[],
  meta: { mode: 'ONLINE' | 'OFFLINE'; sourceUrl: string; sourceRef?: string }
): Promise<void> {
  console.log(`💾 Importing ${lenses.length} lenses into database...\n`)

  // Create an immutable import run (do NOT overwrite previous runs)
  const run = await prisma.lensfunImportRun.create({
    data: {
      sourceUrl: meta.sourceUrl,
      sourceRef: meta.sourceRef,
      mode: meta.mode,
      startedAt: new Date(),
      notes: `Imported via scripts/import_lensfun.ts (${meta.mode})`
    }
  })
  console.log(`🧾 Import run: ${run.id}\n`)
  
  let imported = 0
  let skipped = 0
  let errors = 0
  
  for (const lens of lenses) {
    try {
      // Ensure maker and model are strings
      const makerStr = String(lens.maker || 'Unknown')
      const modelStr = String(lens.model || '')
      
      if (!modelStr) {
        errors++
        continue
      }
      
      const makerNormalized = normalizeString(makerStr)
      const modelNormalized = normalizeString(modelStr)
      const searchTokens = extractKeyTokens(modelNormalized)
      
      // Check if already exists
      const existing = await prisma.lensfunLens.findFirst({
        where: {
          makerNormalized,
          modelNormalized,
          sourceFile: lens.sourceFile,
          importRunId: run.id
        }
      })
      
      if (existing) {
        skipped++
        continue
      }
      
      await prisma.lensfunLens.create({
        data: {
          maker: lens.maker,
          model: lens.model,
          variant: lens.variant,
          mounts: lens.mounts,
          cropFactor: lens.cropFactor,
          aspectRatio: lens.aspectRatio,
          type: lens.type,
          focalMin: lens.focalMin,
          focalMax: lens.focalMax,
          apertureMin: lens.apertureMin,
          apertureMax: lens.apertureMax,
          hasDistortion: lens.hasDistortion,
          hasVignetting: lens.hasVignetting,
          hasTca: lens.hasTca,
          raw: lens.raw,
          rawXml: lens.rawXml,
          sourceFile: lens.sourceFile,
          importRunId: run.id,
          makerNormalized,
          modelNormalized,
          searchTokens
        }
      })
      
      imported++
      
      if (imported % 100 === 0) {
        console.log(`  ✅ Imported ${imported}/${lenses.length}...`)
      }
    } catch (error: any) {
      errors++
      console.error(`  ❌ Error importing ${lens.maker} ${lens.model}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Import complete:`)
  console.log(`   Imported: ${imported}`)
  console.log(`   Skipped (duplicates): ${skipped}`)
  console.log(`   Errors: ${errors}`)

  await prisma.lensfunImportRun.update({
    where: { id: run.id },
    data: { completedAt: new Date() }
  })
}

/**
 * Main import function
 */
async function main() {
  const args = process.argv.slice(2)
  const offline = args.includes('--offline')
  
  console.log('🔧 Lensfun Database Import\n')
  console.log(`Mode: ${offline ? 'OFFLINE' : 'ONLINE'}\n`)
  
  try {
    // Step 1: Download files (unless offline)
    if (!offline) {
      await downloadLensfunFiles()
    } else {
      console.log('📂 Using existing XML files in data/lensfun/\n')
    }
    
    // Step 2: Parse all XML files
    console.log('📖 Parsing XML files...')
    const allLenses: ParsedLens[] = []
    
    const xmlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.xml'))
    
    if (xmlFiles.length === 0) {
      console.error('❌ No XML files found in data/lensfun/.')
      console.error('   Run without --offline to download files.')
      process.exit(1)
    }
    
    for (const filename of xmlFiles) {
      const filePath = path.join(DATA_DIR, filename)
      console.log(`  📄 Parsing ${filename}...`)
      const lenses = parseLensfunXML(filePath)
      console.log(`     Found ${lenses.length} lenses`)
      allLenses.push(...lenses)
    }
    
    console.log(`\n✅ Parsed ${allLenses.length} total lenses from ${xmlFiles.length} files\n`)
    
    // Step 3: Import to database
    await importLensesToDatabase(allLenses, {
      mode: offline ? 'OFFLINE' : 'ONLINE',
      sourceUrl: LENSFUN_BASE_URL,
      sourceRef: 'master'
    })
    
    // Step 4: Show summary stats
    const stats = await prisma.lensfunLens.groupBy({
      by: ['maker'],
      _count: true
    })
    
    console.log('\n📊 Database summary by maker:')
    stats
      .sort((a, b) => b._count - a._count)
      .forEach(s => {
        console.log(`   ${s.maker}: ${s._count}`)
      })
    
    console.log('\n✅ Lensfun import complete!')
    
  } catch (error: any) {
    console.error('❌ Import failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
