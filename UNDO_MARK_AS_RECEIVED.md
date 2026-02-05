# Undo "Mark as Received" Feature

## Overview
Added an undo feature with a 10-minute grace period for the "Mark as Received" action, preventing accidental premature client notifications.

## Date Implemented
February 4, 2026

## User Requirements
- When staff clicks "Mark as Received", it should be undoable
- 10-minute grace period before client is notified
- Button states: **Mark as Received** → **Undo** (10 min) → **Client Informed**
- Email only sent after 10 minutes (or if undo not clicked)

## Implementation

### 1. Database Schema Change

Added new field to `PendingPurchase`:
```prisma
clientNotifiedAt  DateTime? // When client was notified (10 min after gearReceivedAt)
```

This separates "gear received" timestamp from "client notified" timestamp.

### 2. API Endpoints

#### Updated: `/api/incoming-gear/[id]/mark-received` (POST)
- **Changed**: No longer sends email immediately
- **Returns**: `undoExpiresAt` timestamp (10 minutes from now)
- **Allows**: Re-marking if undone

**Response**:
```json
{
  "success": true,
  "message": "Gear marked as received. Client will be notified in 10 minutes.",
  "canUndo": true,
  "undoExpiresAt": "2026-02-04T22:15:00.000Z"
}
```

#### New: `/api/incoming-gear/[id]/undo-received` (POST)
- **Purpose**: Undo the "mark as received" action
- **Validation**:
  - Must be within 10 minutes of marking as received
  - Client must not have been notified yet
  - Gear must be marked as received

**Response**:
```json
{
  "success": true,
  "message": "Gear received status undone successfully"
}
```

**Resets**:
- `gearReceivedAt` → `null`
- `gearReceivedByUserId` → `null`
- `clientNotifiedAt` → `null`
- `status` → `AWAITING_DELIVERY`

#### New: `/api/incoming-gear/[id]/notify-client` (POST)
- **Purpose**: Send notification email to client
- **Validation**:
  - 10 minutes must have passed since marking as received
  - Client must not have been notified yet
  - Gear must be marked as received

**Response**:
```json
{
  "success": true,
  "message": "Client notified successfully"
}
```

**Sets**:
- `clientNotifiedAt` → `NOW()`

### 3. UI Changes (`app/(dashboard)/dashboard/incoming/page.tsx`)

#### Three Button States

**State 1: Initial - "Mark as Received" Button**
- Shown when gear not yet marked as received
- Green border, green text
- Icon: CheckCircle
- Action: Calls `handleMarkAsReceived()`

**State 2: Grace Period - "Undo" Button with Countdown**
- Shown for 10 minutes after marking as received
- Orange border, orange text
- Shows countdown timer (e.g., "9:45")
- Icon: X (close icon)
- Action: Calls `handleUndoReceived()`
- Background: Yellow (warning color)

**State 3: Finalized - "Client Informed" Text**
- Shown after 10 minutes OR after client notified
- Green background badge
- Icon: CheckCircle
- Not clickable (just text)
- Background: Green (success color)

#### Countdown Timer

- Updates every second via `useEffect` with 1-second interval
- Format: "M:SS" (e.g., "9:45", "0:30")
- When timer reaches 0:00, auto-triggers `handleNotifyClient()`

#### Auto-Notification

When countdown reaches zero:
- Shows "Notifying client..." with spinner
- Automatically calls `/api/incoming-gear/[id]/notify-client`
- Updates UI to "Client Informed" state
- Refreshes purchase list

### 4. Activity Logging

All actions are logged in `ActivityLog`:

- **GEAR_RECEIVED**: When staff marks as received
- **GEAR_RECEIVED_UNDONE**: When staff undoes within 10 minutes
- **CLIENT_NOTIFIED_GEAR_RECEIVED**: When client is notified

## User Flow

### Happy Path (No Undo)

1. Staff clicks **"Mark as Received"**
2. Confirmation dialog: "Client will be notified in 10 minutes"
3. Status changes to "Inspection In Progress"
4. Button changes to **"Undo"** with countdown: "10:00"
5. Countdown ticks down: "9:59", "9:58", ... "0:01", "0:00"
6. At 0:00, shows "Notifying client..." spinner
7. API sends email to client
8. Button changes to **"Client Informed"** (no longer clickable)

### Undo Path (Staff Corrects Mistake)

1. Staff clicks **"Mark as Received"** (wrong client!)
2. Button changes to **"Undo"** with countdown: "10:00"
3. Staff realizes mistake and clicks **"Undo"**
4. Confirmation dialog: "This will reset the status"
5. Status resets to "Awaiting Delivery"
6. Button changes back to **"Mark as Received"**
7. No email sent to client

### Edge Cases

**Undo after 10 minutes**: Not allowed
- API returns error: "Cannot undo - more than 10 minutes have passed"
- Button already shows "Client Informed"

**Undo after client notified**: Not allowed
- API returns error: "Cannot undo - client has already been notified"

**Multiple staff members**: First to mark wins
- If undone, any staff can re-mark

**Page refresh during countdown**: Timer recalculates
- Based on `gearReceivedAt` timestamp
- No state lost

## Testing Checklist

- [ ] Click "Mark as Received" - shows "Undo" button
- [ ] Countdown timer updates every second
- [ ] Click "Undo" within 10 minutes - resets successfully
- [ ] Try to undo after 10 minutes - shows error
- [ ] Wait 10 minutes - client receives email automatically
- [ ] After notification, button shows "Client Informed"
- [ ] "Client Informed" is not clickable
- [ ] Refresh page during countdown - timer recalculates correctly
- [ ] Multiple purchases can have different countdown states
- [ ] Activity logs are created for all actions

## Configuration

**Undo Grace Period**: 10 minutes (600,000 milliseconds)

To change the duration, update in:
1. `app/api/incoming-gear/[id]/undo-received/route.ts`: Line 47
2. `app/api/incoming-gear/[id]/notify-client/route.ts`: Line 44
3. `app/api/incoming-gear/[id]/mark-received/route.ts`: Line 83
4. `app/(dashboard)/dashboard/incoming/page.tsx`: Line 451

**Search for**: `10 * 60 * 1000` (10 minutes in milliseconds)

## Future Enhancements

1. **Admin Override**: Allow admins to undo even after 10 minutes
2. **Configurable Duration**: Make 10-minute period configurable per staff role
3. **Notification Scheduling**: Show scheduled notification time in dashboard
4. **Undo History**: Track how many times a purchase was undone
5. **Email Preview**: Let staff preview notification email before auto-send

## Files Modified

1. `prisma/schema.prisma` - Added `clientNotifiedAt` field
2. `app/api/incoming-gear/[id]/mark-received/route.ts` - Removed immediate email
3. `app/api/incoming-gear/[id]/undo-received/route.ts` - New endpoint (96 lines)
4. `app/api/incoming-gear/[id]/notify-client/route.ts` - New endpoint (117 lines)
5. `app/(dashboard)/dashboard/incoming/page.tsx` - UI updates:
   - Added `clientNotifiedAt` to interface
   - Added undo state variables
   - Added countdown timer useEffect
   - Added `handleUndoReceived()` function
   - Added `handleNotifyClient()` function
   - Added `getTimeRemaining()` helper
   - Added `formatTimeRemaining()` helper
   - Replaced button UI with three-state logic

## Summary

This feature prevents accidental premature notifications and gives staff a 10-minute window to correct mistakes. The countdown timer provides clear visual feedback, and the automatic notification ensures clients are always informed even if staff forget to manually trigger it.

All state is persisted in the database, so countdown survives page refreshes and server restarts.
