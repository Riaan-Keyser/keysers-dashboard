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
  rawXml: string
  sourceFile: string
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
      const maker = lens.maker?._text || lens.maker || 'Unknown'
      const model = lens.model?._text || lens.model
      
      if (!model) continue // Skip if no model
      
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
      
      // Try to extract focal/aperture from calibration
      if (lens.calibration) {
        const cal = Array.isArray(lens.calibration) ? lens.calibration[0] : lens.calibration
        
        // Distortion might have focal attribute
        if (cal.distortion) {
          const dist = Array.isArray(cal.distortion) ? cal.distortion[0] : cal.distortion
          if (dist.focal) {
            const focal = parseFloat(dist.focal)
            if (!isNaN(focal)) {
              focalMin = focalMin ? Math.min(focalMin, focal) : focal
              focalMax = focalMax ? Math.max(focalMax, focal) : focal
            }
          }
        }
      }
      
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
async function importLensesToDatabase(lenses: ParsedLens[]): Promise<void> {
  console.log(`💾 Importing ${lenses.length} lenses into database...\n`)
  
  let imported = 0
  let skipped = 0
  let errors = 0
  
  for (const lens of lenses) {
    try {
      const makerNormalized = normalizeString(lens.maker)
      const modelNormalized = normalizeString(lens.model)
      const searchTokens = extractKeyTokens(modelNormalized)
      
      // Check if already exists
      const existing = await prisma.lensfunLens.findFirst({
        where: {
          makerNormalized,
          modelNormalized,
          sourceFile: lens.sourceFile
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
          rawXml: lens.rawXml,
          sourceFile: lens.sourceFile,
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
    await importLensesToDatabase(allLenses)
    
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
