import OpenAI from "openai"

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

interface ProductInfo {
  brand: string
  model: string
  name: string
  condition: string
  category: string
  serialNumber?: string | null
  generalNotes?: string | null
  accessories?: Array<{ name: string; present: boolean }>
}

/**
 * Generate a professional product description using OpenAI
 * @param product Product information
 * @returns Generated description
 */
export async function generateProductDescription(product: ProductInfo): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI API key not configured")
  }

  try {
    // Build accessories list
    const presentAccessories = product.accessories?.filter(a => a.present).map(a => a.name) || []
    const missingAccessories = product.accessories?.filter(a => !a.present).map(a => a.name) || []

    // Construct prompt
    const prompt = `Write a concise, professional product listing description for a used camera equipment store. Keep it factual and seller-focused.

Product Details:
- Brand: ${product.brand}
- Model: ${product.model}
- Category: ${product.category}
- Condition: ${product.condition}
${product.serialNumber ? `- Serial Number: ${product.serialNumber}` : ""}
${presentAccessories.length > 0 ? `- Included Accessories: ${presentAccessories.join(", ")}` : ""}
${missingAccessories.length > 0 ? `- Not Included: ${missingAccessories.join(", ")}` : ""}
${product.generalNotes ? `- Additional Notes: ${product.generalNotes}` : ""}

Write a 3-4 sentence product description that:
1. States what the product is and its condition
2. Highlights key features or specifications
3. Lists what's included
4. Mentions any important notes about condition or accessories

Keep it professional and concise. Do not add marketing fluff or superlatives unless the condition truly warrants it.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional product description writer for a used camera equipment store. Write clear, accurate, and concise descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 250,
    })

    const description = response.choices[0]?.message?.content?.trim()

    if (!description) {
      throw new Error("No description generated")
    }

    console.log(`✅ AI description generated for ${product.brand} ${product.model}`)
    return description

  } catch (error: any) {
    console.error("Failed to generate AI description:", error)
    throw new Error(`AI description generation failed: ${error.message}`)
  }
}
