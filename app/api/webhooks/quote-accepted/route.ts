import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"
import { sendQuoteApprovedEmail } from "@/lib/email"
import { verifyWebhookSignature } from "@/lib/webhook-security"
import { 
  WebhookEnvelopeSchema, 
  QuoteAcceptedPayloadV1Schema,
  type WebhookEnvelope,
  type QuoteAcceptedPayloadV1 
} from "@/lib/webhook-schemas"
import { 
  logWebhookEvent, 
  updateWebhookEventStatus 
} from "@/lib/webhook-handlers"
import { ZodError } from "zod"

/**
 * Production-safe webhook endpoint for Kapso bot
 * 
 * POST /api/webhooks/quote-accepted
 * 
 * Security features:
 * - HMAC signature verification (sha256)
 * - DB-enforced idempotency via unique event_id
 * - Event logging for audit/replay
 * - Payload versioning
 * - Strict input validation (Zod)
 * 
 * Headers:
 *   x-webhook-signature: sha256=<hex_signature>
 *   Content-Type: application/json
 * 
 * Body (Envelope v1.0):
 *   {
 *     event_id: string (UUID)
 *     event_type: "quote_accepted"
 *     version: "1.0"
 *     timestamp: string (ISO 8601)
 *     payload: { ... }
 *   }
 * 
 * Legacy format (no envelope) is supported during migration period.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let eventId: string | undefined
  
  try {
    // Step 1: Extract raw body for HMAC verification
    const rawBody = await request.text()
    const sourceIp = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    
    // Step 2: Verify HMAC signature
    const signatureHeader = request.headers.get("x-webhook-signature")
    const webhookSecret = process.env.WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error("❌ WEBHOOK_SECRET not configured")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }
    
    const signatureResult = verifyWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret
    )
    
    if (!signatureResult.valid) {
      console.warn("⚠️ Invalid webhook signature", {
        provided: signatureResult.providedSignature,
        computed: signatureResult.computedSignature,
        sourceIp
      })
      
      return NextResponse.json(
        { error: "Unauthorized - Invalid signature" },
        { status: 401 }
      )
    }
    
    // Step 3: Parse and validate JSON
    const body = JSON.parse(rawBody)

    // Step 4: Detect format (envelope or legacy)
    let envelope: WebhookEnvelope
    let isLegacyFormat = false
    
    // Check if this is the new envelope format (has event_id field)
    if (body.event_id) {
      // New envelope format
      try {
        envelope = WebhookEnvelopeSchema.parse(body)
      } catch (error) {
        if (error instanceof ZodError) {
          console.warn("⚠️ Invalid envelope structure", error.errors)
          return NextResponse.json(
            { 
              error: "Invalid webhook envelope", 
              details: error.errors 
            },
            { status: 400 }
          )
        }
        throw error
      }
    } else {
      // Legacy format - wrap in envelope
      console.warn("⚠️ Legacy webhook format detected (no event_id)")
      isLegacyFormat = true
      
      // Generate a pseudo event_id for legacy requests (NOT idempotent)
      const crypto = require("crypto")
      const pseudoEventId = crypto.randomUUID()
      
      envelope = {
        event_id: pseudoEventId,
        event_type: "quote_accepted",
        version: "0.9", // Mark as legacy
        timestamp: new Date().toISOString(),
        payload: body
      }
    }
    
    eventId = envelope.event_id
    
    // Step 5: DB-enforced idempotency check + event logging
    const logResult = await logWebhookEvent({
      eventId: envelope.event_id,
      eventType: envelope.event_type,
      version: envelope.version,
      rawPayload: body,
      sourceIp,
      signatureProvided: signatureResult.providedSignature || undefined,
      signatureComputed: signatureResult.computedSignature,
      signatureValid: signatureResult.valid
    })
    
    // If this is a duplicate event, return 200 OK (idempotent)
    if (!logResult.isNew) {
      console.log(`🔁 Duplicate event ${envelope.event_id} - returning 200 OK`)
      return NextResponse.json(
        {
          success: true,
          message: "Event already processed",
          eventId: envelope.event_id,
          duplicate: true
        },
        { status: 200 }
      )
    }
    
    // Step 6: Update status to PROCESSING
    await updateWebhookEventStatus(envelope.event_id, "PROCESSING")
    
    // Step 7: Validate version (only support v1.0)
    if (envelope.version !== "1.0" && envelope.version !== "0.9") {
      await updateWebhookEventStatus(
        envelope.event_id, 
        "FAILED",
        { errorMessage: `Unsupported version: ${envelope.version}` }
      )
      
      return NextResponse.json(
        { 
          error: "Unsupported webhook version", 
          version: envelope.version,
          supported: ["1.0"]
        },
        { status: 400 }
      )
    }
    
    // Step 8: Validate payload schema
    let payload: QuoteAcceptedPayloadV1
    try {
      payload = QuoteAcceptedPayloadV1Schema.parse(envelope.payload)
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn("⚠️ Invalid payload schema", error.errors)
        await updateWebhookEventStatus(
          envelope.event_id,
          "FAILED",
          { errorMessage: `Schema validation failed: ${JSON.stringify(error.errors)}` }
        )
        
        return NextResponse.json(
          { 
            error: "Invalid payload schema", 
            details: error.errors 
          },
          { status: 400 }
        )
      }
      throw error
    }
    
    // Step 9: Process business logic - Create pending purchase
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

    // Step 10: Update event status to PROCESSED
    await updateWebhookEventStatus(
      envelope.event_id,
      "PROCESSED",
      {
        relatedEntityId: pendingPurchase.id,
        relatedEntityType: "PendingPurchase"
      }
    )

    const processingTime = Date.now() - startTime
    console.log(`✅ Quote accepted webhook processed in ${processingTime}ms: Purchase ${pendingPurchase.id} for ${payload.customerName} with ${payload.items.length} items`)

    // Send quote approved email with delivery options link
    if (payload.customerEmail) {
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
    }

    return NextResponse.json(
      {
        success: true,
        eventId: envelope.event_id,
        purchaseId: pendingPurchase.id,
        message: "Quote submitted for review",
        itemCount: pendingPurchase.items.length,
        processingTimeMs: processingTime
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/webhooks/quote-accepted error:", error)
    
    // Log failure if we have an event_id
    if (eventId) {
      try {
        await updateWebhookEventStatus(
          eventId,
          "FAILED",
          { 
            errorMessage: error instanceof Error ? error.message : "Unknown error" 
          }
        )
      } catch (logError) {
        console.error("Failed to update event log:", logError)
      }
    }
    
    return NextResponse.json(
      {
        error: "Failed to process quote acceptance",
        details: error instanceof Error ? error.message : "Unknown error",
        eventId: eventId || undefined
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "quote-accepted webhook",
    version: "1.0",
    method: "POST",
    security: {
      signatureVerification: "HMAC-SHA256",
      idempotency: "event_id (UUID)",
      eventLogging: true
    },
    requiredHeaders: ["x-webhook-signature"],
    envelopeFormat: {
      event_id: "string (UUID)",
      event_type: "quote_accepted",
      version: "1.0",
      timestamp: "ISO 8601",
      payload: "QuoteAcceptedPayloadV1"
    }
  })
}
