# Sprint 2: Connect Inspection to Final Quote

## Overview
Connect the existing Gear Verification/Product Inspection system to the Incoming Gear workflow. Allow staff to start inspections, track completion, and send final quotes to clients.

## Objectives
1. Add "Start Inspection" button in Incoming Gear tab
2. Create `InspectionSession` from `PendingPurchase`
3. Track inspection completion status
4. Add "Send Final Quote" button after inspection complete
5. Email client with "Open Quote" link
6. Update status to `FINAL_QUOTE_SENT`

---

## Database Changes

### New Relation
Link `PendingPurchase` to `InspectionSession`:

```prisma
model PendingPurchase {
  // ... existing fields ...
  inspectionSessionId   String?           @unique
  inspectionSession     InspectionSession? @relation(fields: [inspectionSessionId], references: [id])
  finalQuoteSentAt      DateTime?         // When final quote email sent
}

model InspectionSession {
  // ... existing fields ...
  pendingPurchase       PendingPurchase?  // One-to-one back-relation
}
```

### Status Flow
```
INSPECTION_IN_PROGRESS
  ↓ (staff clicks "Start Inspection")
INSPECTION_IN_PROGRESS (with inspectionSessionId)
  ↓ (inspection UI: items verified)
INSPECTION_IN_PROGRESS (all items approved)
  ↓ (staff clicks "Send Final Quote")
FINAL_QUOTE_SENT
```

---

## API Endpoints

### 1. Create Inspection Session
**Endpoint**: `POST /api/incoming-gear/[id]/start-inspection`
**Auth**: Staff only
**Action**:
- Check if `status === INSPECTION_IN_PROGRESS` and `gearReceivedAt` exists
- Create `InspectionSession` with `sessionNumber` auto-generated
- Create `IncomingGearItem` for each `PendingItem`
- Link session to purchase via `inspectionSessionId`
- Return session ID and redirect URL

**Response**:
```json
{
  "success": true,
  "sessionId": "clxyz...",
  "redirectUrl": "/dashboard/inspections/clxyz..."
}
```

### 2. Send Final Quote
**Endpoint**: `POST /api/incoming-gear/[id]/send-final-quote`
**Auth**: Staff only
**Validation**:
- Must have `inspectionSession` linked
- All items in session must be `APPROVED`
- Customer must have email

**Action**:
- Update purchase status to `FINAL_QUOTE_SENT`
- Set `finalQuoteSentAt` timestamp
- Send email with "Open Quote" link
- Log activity

**Response**:
```json
{
  "success": true,
  "emailSent": true,
  "message": "Final quote sent to customer"
}
```

---

## Email Template

### Final Quote Email
**Function**: `sendFinalQuoteEmail()`
**Trigger**: Staff clicks "Send Final Quote" button
**To**: Customer email
**Subject**: "Your Final Quote from Keysers - Ready to Review"

**Content**:
- Inspection complete message
- Brief summary (X items inspected)
- **"Open Quote" button** (links to `/quote/[token]/select-products`)
- No Accept/Decline buttons (different from preliminary quote)
- What happens next: product selection, personal details, payment

---

## UI Changes: Incoming Gear Page

### New Buttons (Conditional)

#### "Start Inspection" Button
**Conditions to Show**:
- `status === INSPECTION_IN_PROGRESS`
- `gearReceivedAt !== null`
- `inspectionSessionId === null` (not yet started)

**UI**:
- Primary blue button with Package icon
- Positioned below tracking info, above items list
- Click → API call → Redirect to inspection page

#### "Continue Inspection" Button
**Conditions to Show**:
- `inspectionSessionId !== null`
- Inspection not yet complete

**UI**:
- Blue outline button with ArrowRight icon
- Links to `/dashboard/inspections/[sessionId]`

#### "Send Final Quote" Button
**Conditions to Show**:
- `inspectionSessionId !== null`
- All items in session are `APPROVED`
- `status === INSPECTION_IN_PROGRESS`

**UI**:
- Green button with Send icon
- Shows inspection summary (5/5 items approved)
- Click → Confirmation modal → Send email

---

## Inspection Status Display

### New UI Elements
Show inspection progress in the expanded purchase section:

```
┌─────────────────────────────────────────────────┐
│ 🔍 Inspection In Progress                       │
│                                                 │
│ Session #INS-001234                            │
│ Started: Feb 4, 2026 by John Smith             │
│                                                 │
│ Progress: 3/5 items approved                    │
│ ▓▓▓▓▓▓▓▓░░░░ 60%                               │
│                                                 │
│ [Continue Inspection] [Send Final Quote]        │
└─────────────────────────────────────────────────┘
```

---

## Implementation Order

1. ✅ Update Prisma schema
2. ✅ Run migration
3. ✅ Create `POST /api/incoming-gear/[id]/start-inspection`
4. ✅ Create `POST /api/incoming-gear/[id]/send-final-quote`
5. ✅ Add `sendFinalQuoteEmail()` to `lib/email.ts`
6. ✅ Update Incoming Gear UI (buttons + status display)
7. ✅ Test workflow end-to-end
8. ✅ Create test script

---

## Testing Checklist
- [x] Start Inspection button appears after gear marked as received
- [x] Clicking creates InspectionSession correctly
- [x] Redirects to inspection page
- [x] All PendingItems copied to IncomingGearItems
- [x] Continue Inspection button shows if session exists
- [x] Inspection status/progress displays correctly
- [x] Send Final Quote button appears when all items approved
- [x] Final quote email sent successfully
- [x] Email contains correct "Open Quote" link
- [x] Status updates to FINAL_QUOTE_SENT
- [ ] Client can access product selection page (Sprint 3)

## Testing Guide
See `scripts/test-sprint2-inspection.md` for comprehensive testing instructions.

---

**Status**: ✅ COMPLETED
**Started**: 2026-02-04
**Completed**: 2026-02-04
