import { z } from "zod"

/**
 * Base webhook envelope - ALL webhooks must follow this structure
 * 
 * This enforces:
 * - Unique event_id for idempotency
 * - Event type identification
 * - Payload versioning
 * - Timestamp for ordering/debugging
 */
export const WebhookEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum(["quote_accepted", "quote_declined"]),
  version: z.string().regex(/^\d+\.\d+$/), // e.g., "1.0"
  timestamp: z.string().datetime(),
  payload: z.unknown() // Event-specific payload
})

/**
 * Quote accepted payload (version 1.0)
 * 
 * Key fields:
 * - ocrText/ocrBrand/ocrModel: OCR text for matching ONLY (never user-facing)
 * - name/brand/model: Output text (canonical, user-facing)
 * - Pricing fields for bot estimates and proposed prices
 */
export const QuoteAcceptedPayloadV1Schema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(7),
  customerEmail: z.string().email().optional(),
  whatsappConversationId: z.string().optional(),
  totalQuoteAmount: z.number().positive().optional(),
  botQuoteAcceptedAt: z.string().datetime().optional(),
  botConversationData: z.record(z.unknown()).optional(),
  items: z.array(z.object({
    // OCR text (for matching only - never user-facing)
    ocrText: z.string().optional(),
    ocrBrand: z.string().optional(),
    ocrModel: z.string().optional(),
    
    // Output text (user-facing - canonical)
    name: z.string().min(1),
    brand: z.string().optional(),
    model: z.string().optional(),
    category: z.string().optional(),
    condition: z.string().optional(),
    description: z.string().optional(),
    serialNumber: z.string().optional(),
    
    // Pricing
    botEstimatedPrice: z.number().nonnegative().optional(),
    proposedPrice: z.number().nonnegative().optional(),
    suggestedSellPrice: z.number().positive().optional(),
    
    imageUrls: z.array(z.string().url()).optional()
  })).min(1)
})

// Export inferred types for use in handlers
export type WebhookEnvelope = z.infer<typeof WebhookEnvelopeSchema>
export type QuoteAcceptedPayloadV1 = z.infer<typeof QuoteAcceptedPayloadV1Schema>
