/**
 * Webhook Processing Logic (Refactored for Replay Safety)
 * 
 * This module contains the core business logic for processing webhook events.
 * It can be called from both:
 * - The actual webhook route (incoming POST)
 * - The replay route (admin-triggered re-execution)
 * 
 * All functions are idempotent and transaction-safe.
 */

import { prisma } from "@/lib/prisma"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"
import { sendQuoteApprovedEmail } from "@/lib/email"
import { QuoteAcceptedPayloadV1 } from "@/lib/webhook-schemas"

export interface ProcessingResult {
  ok: boolean
  relatedEntityId?: string
  relatedEntityType?: string
  message: string
  noop?: boolean // true if already applied
  errorDetails?: any
}

/**
 * Process quote_accepted webhook event
 * 
 * Idempotency:
 * - Checks if pendingPurchase already exists by customerPhone + whatsappConversationId
 * - If exists, returns noop_already_applied
 * - If not, creates new purchase
 * 
 * @param payload Validated webhook payload
 * @param eventId UUID for tracing
 * @returns Processing result
 */
export async function processQuoteAccepted(
  payload: QuoteAcceptedPayloadV1,
  eventId: string
): Promise<ProcessingResult> {
  try {
    // Idempotency check: does a purchase already exist for this customer/conversation?
    const existing = await prisma.pendingPurchase.findFirst({
      where: {
        customerPhone: payload.customerPhone,
        whatsappConversationId: payload.whatsappConversationId || undefined,
        // Only check recent purchases (within last 7 days) to avoid false positives
        botQuoteAcceptedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    if (existing) {
      console.log(`🔁 Purchase already exists for ${payload.customerPhone}: ${existing.id}`)
      return {
        ok: true,
        noop: true,
        relatedEntityId: existing.id,
        relatedEntityType: "PendingPurchase",
        message: `Purchase already exists: ${existing.id} (no duplicate created)`
      }
    }

    // Create new purchase
    const trackingToken = generateConfirmationToken()
    const tokenExpiry = getTokenExpiry()

    const pendingPurchase = await prisma.pendingPurchase.create({
      data: {
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail || null,
        whatsappConversationId: payload.whatsappConversationId || null,
        totalQuoteAmount: payload.totalQuoteAmount || null,
        botQuoteAcceptedAt: payload.botQuoteAcceptedAt ? new Date(payload.botQuoteAcceptedAt) : new Date(),
        botConversationData: payload.botConversationData ? JSON.stringify(payload.botConversationData) : null,
        status: "PENDING_REVIEW",
        quoteConfirmationToken: trackingToken,
        quoteTokenExpiresAt: tokenExpiry,
        items: {
          create: payload.items.map((item) => ({
            name: item.name,
            brand: item.brand || null,
            model: item.model || null,
            category: item.category || null,
            condition: item.condition || null,
            description: item.description || null,
            serialNumber: item.serialNumber || null,
            botEstimatedPrice: item.botEstimatedPrice || null,
            proposedPrice: item.proposedPrice || item.botEstimatedPrice || null,
            suggestedSellPrice: item.suggestedSellPrice || null,
            imageUrls: item.imageUrls || [],
            status: "PENDING"
          }))
        }
      },
      include: {
        items: true
      }
    })

    console.log(`✅ Created purchase ${pendingPurchase.id} for ${payload.customerName} with ${payload.items.length} items`)

    // Send quote approved email (optional, best-effort)
    if (payload.customerEmail) {
      try {
        const emailResult = await sendQuoteApprovedEmail({
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          token: trackingToken,
          totalAmount: payload.totalQuoteAmount
        })

        if (emailResult.success) {
          console.log(`✅ Quote approved email sent to ${payload.customerEmail}`)
        } else {
          console.warn(`⚠️ Failed to send quote approved email: ${emailResult.error}`)
        }
      } catch (emailError) {
        // Don't fail the webhook if email fails
        console.warn(`⚠️ Email send exception:`, emailError)
      }
    }

    return {
      ok: true,
      relatedEntityId: pendingPurchase.id,
      relatedEntityType: "PendingPurchase",
      message: `Purchase created: ${pendingPurchase.id} with ${pendingPurchase.items.length} items`
    }
  } catch (error) {
    console.error(`❌ processQuoteAccepted error:`, error)
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error",
      errorDetails: error
    }
  }
}

/**
 * Main webhook event processor (router)
 * 
 * Routes to appropriate handler based on event_type.
 * 
 * @param eventLog Webhook event log row from DB
 * @returns Processing result
 */
export async function processWebhookEvent(eventLog: {
  eventId: string
  eventType: string
  version: string
  rawPayload: any
}): Promise<ProcessingResult> {
  const { eventType, rawPayload, eventId } = eventLog

  // Extract payload from envelope (if present) or use rawPayload directly
  const payload = rawPayload.payload || rawPayload

  switch (eventType) {
    case "quote_accepted":
      return await processQuoteAccepted(payload, eventId)

    default:
      return {
        ok: false,
        message: `Unsupported event type: ${eventType}`
      }
  }
}
