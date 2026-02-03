# Phase 2 - Advanced Quote-to-Payment Workflow

## Overview

Complete workflow from bot quote acceptance to payment with client details capture.

## Workflow Steps

```
1. WhatsApp Bot → Customer accepts quote
         ↓
2. Incoming Gear → Staff reviews & approves items
         ↓
3. Staff clicks "Approve for Payment" → Generates Supplier Invoice
         ↓  
4. Email sent to client with:
   - Supplier Invoice (PDF)
   - Accept/Decline buttons
         ↓
5. Client clicks "Accept" → Directed to details capture page
         ↓
6. Client fills in details:
   - ID Number
   - Full Address
   - Bank Details (Name, Account, Branch, Type)
         ↓
7. Details submitted → Appears in "Awaiting Payment" section
         ↓
8. Staff marks payment received → Moves to Inventory
```

## Features Being Built

### 1. Supplier Invoice Generation
- Auto-generate invoice number (INV-XXXXXX)
- Calculate totals from approved items
- Track invoice status

### 2. Email with Accept/Decline
- Professional email template
- "Accept" button → Client details page
- "Decline" button → Thank you message
- Embedded supplier invoice

### 3. Public Client Details Page
- No login required (token-based access)
- Secure one-time use token
- Capture all required client information
- Form validation

### 4. Updated "Awaiting Payment" Section
- Shows purchases with captured client details
- Display bank details for reference
- Mark as paid functionality

## Technical Implementation

### Database Fields Added:
- `invoiceNumber` - Unique invoice reference
- `invoiceTotal` - Total amount
- `invoiceEmailSentAt` - When email was sent
- `invoiceAcceptToken` - Secure access token
- `clientDetails*` - All client information fields
- `clientDetailsSubmitted` - Boolean flag

### API Endpoints:
- `POST /api/incoming-gear/[id]/approve-for-payment` - Generate invoice & send email
- `GET /api/client-details/[token]` - Get purchase details by token
- `POST /api/client-details/[token]` - Submit client details
- `POST /api/incoming-gear/[id]/mark-paid` - Record payment (existing)

### Pages:
- `/client-details/[token]` - Public client details form
- Updated `/dashboard/incoming` - With "Approve for Payment" button
- Updated `/dashboard/awaiting-payment` - Shows client details

## Email Template

Subject: "Supplier Invoice - Keysers Camera Equipment"

```
Dear [Customer Name],

Thank you for choosing Keysers Camera Equipment!

We're pleased to present your Supplier Invoice for the equipment you're selling to us:

[INVOICE SUMMARY TABLE]
Total Amount: R [AMOUNT]

To proceed with this transaction, please:
1. Click "Accept" below to confirm
2. Provide your details for payment
3. We'll arrange collection/drop-off

[ACCEPT BUTTON] [DECLINE BUTTON]

Best regards,
Keysers Camera Equipment Team
```

## Client Details Form

Fields to capture:
- Full Name (pre-filled)
- ID Number
- Phone Number (pre-filled)
- Email Address (pre-filled)
- Physical Address
- City
- Province
- Postal Code
- Bank Name
- Account Number
- Branch Code
- Account Type (Cheque/Savings)

## Status Flow

```
PENDING_REVIEW → IN_REVIEW → PENDING_APPROVAL 
     → APPROVED (Invoice sent, awaiting client acceptance)
     → CLIENT_DETAILS_SUBMITTED (Awaiting Payment section)
     → ADDED_TO_INVENTORY (Payment received)
```

## Next Steps

After Phase 2 completion:
- Phase 3: Automated notifications
- Phase 4: SMS integration
- Phase 5: Advanced reporting
