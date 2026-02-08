import { prisma } from "@/lib/prisma"
import { WebhookEventStatus, Prisma } from "@prisma/client"

export interface LogWebhookEventResult {
  isNew: boolean
  eventLog: any
}

/**
 * DB-enforced idempotency - atomically create event log
 * 
 * This function attempts to create a new event log entry.
 * If the event_id already exists (unique constraint violation),
 * it returns the existing event instead of creating a duplicate.
 * 
 * This is RACE-CONDITION SAFE because Postgres enforces
 * uniqueness at the database level.
 * 
 * @returns { isNew: true, eventLog } if new event created
 * @returns { isNew: false, eventLog } if event_id already exists (duplicate)
 * @throws Error if database error (other than unique constraint)
 */
export async function logWebhookEvent(data: {
  eventId: string
  eventType: string
  version: string
  rawPayload: any
  sourceIp?: string
  signatureProvided?: string
  signatureComputed?: string
  signatureValid: boolean
}): Promise<LogWebhookEventResult> {
  try {
    const eventLog = await prisma.webhookEventLog.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        version: data.version,
        status: "PENDING",
        rawPayload: data.rawPayload,
        sourceIp: data.sourceIp,
        signatureProvided: data.signatureProvided,
        signatureComputed: data.signatureComputed,
        signatureValid: data.signatureValid
      }
    })
    
    return { isNew: true, eventLog }
  } catch (error) {
    // Check if it's a unique constraint violation on event_id
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Duplicate event_id - fetch existing record
      const existing = await prisma.webhookEventLog.findUnique({
        where: { eventId: data.eventId }
      })
      return { isNew: false, eventLog: existing }
    }
    // Re-throw any other database errors
    throw error
  }
}

/**
 * Update event status with proper transitions
 * 
 * Status flow: PENDING -> PROCESSING -> PROCESSED/FAILED
 * 
 * - processedAt is only set when reaching terminal states (PROCESSED/FAILED)
 * - errorMessage is stored on FAILED status
 * - relatedEntityId links the event to created database entities
 * 
 * @param eventId - UUID of the event to update
 * @param status - New status to set
 * @param options - Additional fields to update
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: WebhookEventStatus,
  options?: {
    errorMessage?: string
    relatedEntityId?: string
    relatedEntityType?: string
  }
) {
  const data: any = { status }
  
  // Only set processedAt when reaching terminal state
  if (status === "PROCESSED" || status === "FAILED") {
    data.processedAt = new Date()
  }
  
  if (options?.errorMessage) data.errorMessage = options.errorMessage
  if (options?.relatedEntityId) data.relatedEntityId = options.relatedEntityId
  if (options?.relatedEntityType) data.relatedEntityType = options.relatedEntityType
  
  return await prisma.webhookEventLog.update({
    where: { eventId },
    data
  })
}

/**
 * Check if an event can be safely replayed
 * 
 * An event can only be replayed if:
 * 1. The event exists in the log
 * 2. The related entity (e.g., PendingPurchase) does NOT exist
 * 
 * This prevents creating duplicate entities on replay.
 * 
 * @param eventId - UUID of the event to check
 * @returns true if safe to replay, false otherwise
 */
export async function canReplayEvent(eventId: string): Promise<boolean> {
  const event = await prisma.webhookEventLog.findUnique({
    where: { eventId }
  })
  
  if (!event) return false
  if (!event.relatedEntityId || !event.relatedEntityType) return true
  
  // Check if the related entity exists
  switch (event.relatedEntityType) {
    case "PendingPurchase":
      const purchase = await prisma.pendingPurchase.findUnique({
        where: { id: event.relatedEntityId }
      })
      return purchase === null
    
    // Add other entity types as needed
    default:
      // If we don't know the type, be conservative and don't allow replay
      return false
  }
}
