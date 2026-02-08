#!/usr/bin/env tsx
/**
 * Create a test FAILED webhook event for Category C testing
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()

async function main() {
  console.log("🧪 Creating test FAILED webhook event...")

  const eventId = randomUUID()

  const event = await prisma.webhookEventLog.create({
    data: {
      eventId,
      eventType: "quote_accepted",
      version: "1.0",
      status: "FAILED",
      receivedAt: new Date(),
      rawPayload: {
        event_id: eventId,
        event_type: "quote_accepted",
        version: "1.0",
        timestamp: new Date().toISOString(),
        payload: {
          customerName: "Test Customer",
          customerPhone: "+27821234567",
          customerEmail: "test@example.com",
          totalQuoteAmount: 5000,
          botQuoteAcceptedAt: new Date().toISOString(),
          items: [
            {
              name: "Canon EOS R5",
              brand: "Canon",
              model: "EOS R5",
              category: "camera",
              condition: "excellent",
              proposedPrice: 5000
            }
          ]
        }
      },
      sourceIp: "127.0.0.1",
      signatureValid: true,
      signatureProvided: "sha256=test",
      signatureComputed: "sha256=test",
      errorMessage: "Test error: Simulated failure for testing replay functionality",
      retryCount: 0
    }
  })

  console.log(`✅ Created test FAILED webhook event:`)
  console.log(`   Event ID: ${event.eventId}`)
  console.log(`   Status: ${event.status}`)
  console.log(`   Error: ${event.errorMessage}`)
  console.log("\nYou can now:")
  console.log("1. View it in /dashboard/settings/webhook-events")
  console.log("2. Test replay functionality")
  console.log("3. Test ignore functionality")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
