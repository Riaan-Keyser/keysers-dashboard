# Sprint 1: Shipping & Tracking Implementation

## Overview
Implement tracking number capture, gear receipt confirmation, and email notifications for the shipping phase of the quote workflow.

## Database Changes

### Updated Fields in `PendingPurchase`
```prisma
courierCompany        String?           // Courier service used (e.g., "The Courier Guy", "DHL")
trackingNumber        String?           // Tracking/waybill number
gearReceivedAt        DateTime?         // Timestamp when staff clicked "Mark as Received"
gearReceivedByUserId  String?           // User who confirmed receipt
gearReceivedBy        User?             // Relation to User model
```

## Email Templates

### 1. Shipping Instructions Email
**Trigger**: After client accepts preliminary quote via bot
**Subject**: "How to Ship Your Gear to Keysers - Quote #[ID]"
**Content**:
- Thank you message
- Shipping address: 65 Tennant Street, Windsor Park, Kraaifontein, 7570
- Packaging instructions
- Request for tracking number + courier company
- Link to submit tracking: `/quote/[token]/shipping`

### 2. Gear Received Email
**Trigger**: Staff clicks "Mark as Received"
**Subject**: "Gear Received - Inspection Starting Soon"
**Content**:
- Confirmation of safe receipt
- Next steps: inspection process
- Estimated timeline
- Contact info

## API Endpoints

### 1. Submit Tracking Info
**Endpoint**: `POST /api/quote-confirmation/[token]/tracking`
**Public**: Yes (client-facing)
**Body**:
```json
{
  "courierCompany": "The Courier Guy",
  "trackingNumber": "TCG123456789"
}
```
**Response**: Updates `PendingPurchase`, sends confirmation email

### 2. Mark as Received
**Endpoint**: `POST /api/incoming-gear/[id]/mark-received`
**Auth**: Required (staff only)
**Body**: Empty
**Action**:
- Sets `gearReceivedAt` = now()
- Sets `gearReceivedByUserId` = session.user.id
- Updates status to `INSPECTION_IN_PROGRESS`
- Sends "Gear Received" email to client

## UI Changes

### Incoming Gear Page
**New Display Elements**:
- Tracking badge: "📦 Tracking: [TCG123456789]"
- Courier name: "The Courier Guy"
- "Awaiting Delivery" status if no `gearReceivedAt`
- "Received [date]" badge if confirmed

**New Button**:
- "Mark as Received" (green button, icon: CheckCircle)
- Only visible if `trackingNumber` exists and `gearReceivedAt` is null
- Confirmation dialog before clicking

### Public Tracking Submission Page
**URL**: `/quote/[token]/shipping`
**Form Fields**:
- Courier Company (dropdown + "Other" option)
- Tracking Number (text input)
- Submit button

## Status Flow
```
PENDING_REVIEW (after bot acceptance)
  ↓ (tracking submitted)
AWAITING_DELIVERY
  ↓ (staff clicks "Mark as Received")
INSPECTION_IN_PROGRESS
```

## Implementation Order
1. ✅ Update Prisma schema
2. ✅ Run migration
3. ✅ Create email templates in `lib/email.ts`
4. ✅ Build tracking submission API + page
5. ✅ Build mark-as-received API
6. ✅ Update Incoming Gear UI
7. ✅ Test end-to-end

## Testing Checklist
- [x] Client can submit tracking info via link
- [x] Tracking info displays in Incoming Gear dashboard
- [x] Staff can click "Mark as Received"
- [x] Client receives "Gear Received" email
- [x] Status updates correctly
- [x] Activity log records the action

## Testing Script
Run `./scripts/test-sprint1-tracking.sh` to test the complete workflow.

---

**Status**: ✅ COMPLETED
**Started**: 2026-02-04
**Completed**: 2026-02-04
