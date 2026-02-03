# Incoming Gear UI Updates

## Changes Made

### 1. Product Row Layout Improvements

**Before:** Single row with cramped layout
**After:** Grid-based layout with proper spacing

#### Layout Structure:
```
[Product Name (2fr)] | [Status] | [Buy Low] | [Buy High] | [Consign Low] | [Consign High] | [Image] | [Actions]
```

**Key Improvements:**
- Product name column gets **2x more space** (2fr) to accommodate lengthy product names
- Product names now **wrap properly** instead of truncating
- Brand and model shown as subtitle under product name
- All price columns are **center-aligned** in a consistent grid
- Status badge is center-aligned
- Actions always aligned to the right

### 2. Button Changes

**Changed:** "Adjust" → "Edit"
- More intuitive verb for modifying item details
- Consistent with standard UI patterns

### 3. Delete Client Feature

**Location:** Red X button next to the date (top-right of customer row)

**Functionality:**
- Clicking shows confirmation dialog: "Are you sure you want to delete all items for [Customer Name]?"
- If confirmed, deletes the entire pending purchase and all associated items
- Uses cascade delete (database handles cleanup automatically)
- Logs deletion in activity log for audit trail

**Visual:**
```
[Customer Name]  [Items count] [Status] [Date] [❌]
```

### 4. Column Alignment

All columns are now perfectly aligned:
- Product Name: Left-aligned (with wrapping)
- Status: Center-aligned
- Buy Low: Center-aligned
- Buy High: Center-aligned
- Consignment Low: Center-aligned
- Consignment High: Center-aligned
- Image: Fixed width (48px)
- Actions: Right-aligned

### 5. Spacing Improvements

- Increased padding in product cards (p-4)
- Better gap between columns (gap-6)
- Consistent vertical spacing between products (space-y-3)
- Price labels now have margin-bottom for better separation

## Technical Details

### Grid Layout
```css
grid-cols-[2fr_auto_1fr_1fr_1fr_1fr_auto_auto]
```

This means:
- Column 1 (Product): 2 fractional units (most space)
- Column 2 (Status): auto-sized
- Columns 3-6 (Prices): 1 fractional unit each (equal width)
- Columns 7-8 (Image + Actions): auto-sized

### Delete API Endpoint
- **Method:** DELETE
- **Endpoint:** `/api/incoming-gear/[id]`
- **Auth:** Requires session
- **Action:** Deletes `PendingPurchase` record
- **Cascade:** Automatically deletes all associated `PendingItem` records
- **Logging:** Creates activity log entry

## Before vs After

### Before:
```
[Canon EOS R5 Camera Body with...] [PENDING] Buy Low: R35k | Buy High: R45k | ... [Adjust] [Approve] [Reject]
```

### After:
```
Canon EOS R5 Camera Body          [PENDING]    R 35,000    R 45,000    R 22,400    R 31,500    [📷]    [Edit] [Approve] [Reject]
Canon RF 24-70mm f/2.8L IS USM
```

## User Experience Improvements

1. **Readability:** Products with long names are fully visible
2. **Scanning:** Center-aligned numbers are easier to compare
3. **Consistency:** All price columns have same width and alignment
4. **Actions:** Edit button is clearer than Adjust
5. **Cleanup:** Easy to remove unwanted customers with one click
6. **Safety:** Confirmation dialog prevents accidental deletions

## Database Schema

The delete functionality relies on the existing cascade relationship:

```prisma
model PendingPurchase {
  id    String
  items PendingItem[]  // Cascade delete configured
  ...
}

model PendingItem {
  id                String
  pendingPurchaseId String
  pendingPurchase   PendingPurchase @relation(fields: [pendingPurchaseId], references: [id], onDelete: Cascade)
  ...
}
```

When a `PendingPurchase` is deleted, all related `PendingItem` records are automatically removed.
