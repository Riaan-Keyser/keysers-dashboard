# Bot → Dashboard Integration Summary

## Overview

Your Keysers Dashboard now has **complete integration** for accepting quotes from the Kapso WhatsApp bot and managing them through to payment and inventory.

---

## ✅ What's Already Built

### 1. Incoming Gear Section (ALREADY EXISTS)
- **Accordion View**: Only one client dropdown open at a time ✅
- **Customer Grouping**: Each customer name appears as a header
- **Item Details**: Click customer to expand and see all their gear
- **Price Management**: Adjust buy prices, consignment rates, sell prices
- **Approval Workflow**: Approve/reject individual items
- **Image Gallery**: View customer-uploaded photos with lightbox

### 2. Quote Acceptance Webhook (NEWLY CREATED)
- **Endpoint**: `POST /api/webhooks/quote-accepted`
- **Purpose**: Receives quote data from bot when customer accepts
- **Authentication**: API key via `x-api-key` header
- **Automatic Processing**: Creates pending purchase + items in database

### 3. Database Schema (ALREADY EXISTS)
- **PendingPurchase**: Stores customer info and quote details
- **PendingItem**: Individual items with pricing and status
- **Full Audit Trail**: Tracks who reviewed, approved, and when

---

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Customer Interaction                               │
│  ────────────────────────────                               │
│  • Customer sends photos to WhatsApp bot                    │
│  • Bot identifies gear using AI                             │
│  • Bot generates quote                                       │
│  • Customer ACCEPTS quote                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Bot Calls Webhook                                  │
│  ──────────────────────────                                 │
│  POST /api/webhooks/quote-accepted                          │
│  {                                                           │
│    customerName: "John Doe",                                │
│    customerPhone: "27723926372",                            │
│    items: [...gear with prices and images...]               │
│  }                                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Dashboard Creates Pending Purchase                 │
│  ────────────────────────────────────────                   │
│  • Record appears in "Incoming Gear" section                │
│  • Status: PENDING_REVIEW                                   │
│  • Customer name shows in accordion list                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Staff Reviews in Dashboard                         │
│  ────────────────────────────────                           │
│  • Navigate to "Incoming Gear" tab                          │
│  • Click customer name to expand (accordion opens)          │
│  • See all items with images and bot prices                 │
│  • Review each item:                                        │
│    - Adjust purchase price                                  │
│    - Set consignment rate                                   │
│    - Set selling price                                      │
│    - Add notes                                              │
│  • Click "Approve" or "Reject" for each item                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Staff Approves for Payment                         │
│  ────────────────────────────────                           │
│  • Click "Approve for Payment" button                       │
│  • System generates supplier invoice (INV-XXXXXX)           │
│  • Email sent to customer with:                             │
│    - Invoice PDF                                            │
│    - Accept button                                          │
│    - Decline button                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Customer Accepts Invoice                           │
│  ────────────────────────────                               │
│  • Clicks "Accept" in email                                 │
│  • Directed to secure form (no login required)              │
│  • Fills in details:                                        │
│    - ID Number                                              │
│    - Full Address                                           │
│    - Bank Name                                              │
│    - Account Number                                         │
│    - Branch Code                                            │
│    - Account Type                                           │
│  • Submits form                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Moves to Awaiting Payment                          │
│  ────────────────────────────────                           │
│  • Purchase appears in "Awaiting Payment" section           │
│  • Status: PENDING_APPROVAL                                 │
│  • Staff can see all customer bank details                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 8: Payment & Inventory                                │
│  ────────────────────────────                               │
│  • Staff makes payment to customer                          │
│  • Clicks "Mark as Paid" in dashboard                       │
│  • Items automatically added to main Inventory              │
│  • Status: ADDED_TO_INVENTORY                               │
│  • Items ready for sale (synced to WooCommerce if enabled)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### Accordion Behavior (IMPLEMENTED)
```typescript
// Already working in incoming/page.tsx
const toggleExpand = (purchaseId: string) => {
  if (expandedPurchases.has(purchaseId)) {
    setExpandedPurchases(new Set())  // Collapse current
  } else {
    setExpandedPurchases(new Set([purchaseId]))  // Expand this one only
  }
}
```

✅ **Only one client dropdown open at a time**
✅ **Clicking another client closes the previous one**
✅ **Clean, organized view**

### Status Flow

**Purchase Statuses:**
```
PENDING_REVIEW          → Waiting for staff review
IN_REVIEW               → Staff currently reviewing
APPROVED                → Invoice sent to client (awaiting acceptance)
PENDING_APPROVAL        → Client accepted & submitted bank details
ADDED_TO_INVENTORY      → Paid and added to inventory
REJECTED/CANCELLED      → Not proceeding
```

**Item Statuses:**
```
PENDING           → Awaiting review
PRICE_ADJUSTED    → Prices have been changed
APPROVED          → Ready to purchase
REJECTED          → Not buying this item
ADDED_TO_INVENTORY → Successfully in inventory
```

---

## 📁 Files Created/Modified

### New Files
1. **`/app/api/webhooks/quote-accepted/route.ts`**
   - Webhook endpoint for bot to call
   - Creates pending purchases from quote acceptance
   - API key authentication

2. **`QUOTE_WEBHOOK_INTEGRATION.md`**
   - Complete integration guide for your bot
   - Code examples in Python (requests, httpx) and Node.js
   - cURL examples for testing

3. **`BOT_INTEGRATION_SUMMARY.md`**
   - This file - complete overview

### Existing Files (Already Working)
1. **`/app/(dashboard)/dashboard/incoming/page.tsx`**
   - Accordion UI (already implemented)
   - Item review and pricing
   - Approval workflow

2. **`/app/api/incoming-gear/route.ts`**
   - GET: Fetch pending purchases
   - POST: Create purchases (alternative to webhook)

3. **`prisma/schema.prisma`**
   - PendingPurchase model
   - PendingItem model
   - All necessary fields already defined

---

## 🔧 Setup Instructions

### 1. Generate Dashboard API Key

```bash
# Generate a secure random key
openssl rand -base64 32

# Example output:
# wK7xR3pV9mN2qT5sL8jH4fD6gB1nA0cE
```

### 2. Add to Environment Variables

Edit `/home/riaan/keysers-dashboard/.env.local`:

```bash
# Dashboard API Key (for webhooks and bot integration)
DASHBOARD_API_KEY=wK7xR3pV9mN2qT5sL8jH4fD6gB1nA0cE
```

### 3. Restart Dashboard

```bash
# In terminal where dashboard is running
Ctrl+C

# Start again
npm run dev
```

### 4. Test Webhook

```bash
# Test with cURL
curl -X POST http://localhost:3000/api/webhooks/quote-accepted \
  -H "Content-Type: application/json" \
  -H "x-api-key: wK7xR3pV9mN2qT5sL8jH4fD6gB1nA0cE" \
  -d '{
    "customerName": "Test Customer",
    "customerPhone": "27723926372",
    "items": [
      {
        "name": "Canon EOS R5",
        "brand": "Canon",
        "model": "EOS R5",
        "category": "CAMERA_BODY",
        "condition": "EXCELLENT",
        "botEstimatedPrice": 35000,
        "proposedPrice": 32000,
        "suggestedSellPrice": 45000
      }
    ]
  }'
```

### 5. Verify in Dashboard

1. Open dashboard at `http://localhost:3000`
2. Navigate to **Incoming Gear**
3. You should see "Test Customer" in the list
4. Click to expand and see the Canon EOS R5

---

## 🤖 Bot Integration Code

### Python Example (Quick Start)

```python
import requests

DASHBOARD_URL = "http://localhost:3000/api/webhooks/quote-accepted"
API_KEY = "wK7xR3pV9mN2qT5sL8jH4fD6gB1nA0cE"

def send_quote_to_dashboard(customer_name, phone, items):
    """Send accepted quote to dashboard."""
    payload = {
        "customerName": customer_name,
        "customerPhone": phone,
        "items": items
    }
    
    response = requests.post(
        DASHBOARD_URL,
        json=payload,
        headers={"x-api-key": API_KEY},
        timeout=10
    )
    
    if response.status_code == 201:
        print(f"✅ Quote submitted: {response.json()}")
        return True
    else:
        print(f"❌ Failed: {response.text}")
        return False

# When customer accepts quote in your bot:
send_quote_to_dashboard(
    customer_name="John Doe",
    phone="27723926372",
    items=[
        {
            "name": "Canon EOS R5",
            "brand": "Canon",
            "model": "EOS R5",
            "category": "CAMERA_BODY",
            "condition": "EXCELLENT",
            "botEstimatedPrice": 35000,
            "proposedPrice": 32000,
            "suggestedSellPrice": 45000,
            "imageUrls": ["https://..."]
        }
    ]
)
```

For complete code examples, see **`QUOTE_WEBHOOK_INTEGRATION.md`**

---

## 📊 Database Schema

### PendingPurchase
```prisma
model PendingPurchase {
  id                      String
  customerName            String
  customerPhone           String
  customerEmail           String?
  whatsappConversationId  String?
  totalQuoteAmount        Decimal?
  status                  PurchaseStatus  @default(PENDING_REVIEW)
  
  botQuoteAcceptedAt      DateTime?
  botConversationData     String?
  
  invoiceNumber           String?  @unique
  invoiceTotal            Decimal?
  invoiceAcceptToken      String?  @unique
  
  clientDetailsSubmitted  Boolean  @default(false)
  clientIdNumber          String?
  clientBankName          String?
  clientAccountNumber     String?
  
  items                   PendingItem[]
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

### PendingItem
```prisma
model PendingItem {
  id                  String
  pendingPurchaseId   String
  
  name                String
  brand               String?
  model               String?
  category            String?
  condition           String?
  description         String?
  serialNumber        String?
  
  botEstimatedPrice   Decimal?
  proposedPrice       Decimal?
  finalPrice          Decimal?
  suggestedSellPrice  Decimal?
  
  status              ItemStatus  @default(PENDING)
  reviewNotes         String?
  
  imageUrls           String[]
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

---

## 🎨 UI Features

### Incoming Gear Page

**Layout:**
- Stats cards at top (Pending Review, Ready to Add, Total Items, Total Value)
- Filter dropdown (All Status, Pending Review, In Review, etc.)
- Accordion list of customers

**Customer Row (Collapsed):**
```
[▶] John Doe          3 items | R 48,000    [PENDING REVIEW]  2026-02-03
    27723926372
```

**Customer Row (Expanded):**
```
[▼] John Doe          3 items | R 48,000    [PENDING REVIEW]  2026-02-03
    27723926372
    
    ┌──────────────────────────────────────────────────────────────────┐
    │ Canon EOS R5  [PENDING]                                          │
    │ Buy Low: R35,000  Buy High: R45,000  Consign Low: R22,400       │
    │ [🖼️ Photo]  [Adjust] [✓ Approve] [✗ Reject]                      │
    └──────────────────────────────────────────────────────────────────┘
    
    ┌──────────────────────────────────────────────────────────────────┐
    │ Canon RF 24-70mm  [APPROVED]                                     │
    │ Buy Low: R18,000  Buy High: R22,000  Consign Low: R12,600       │
    │ [🖼️ Photo]  [Adjust]                                              │
    └──────────────────────────────────────────────────────────────────┘
    
    [✓ Approve for Payment] ← Generates invoice & sends email
```

---

## 🔐 Security

1. **API Key Authentication**: Webhook requires valid API key
2. **Token-Based Access**: Client details form uses one-time tokens
3. **No Login Required**: Customers don't need dashboard accounts
4. **HTTPS Only**: Always use HTTPS in production
5. **Audit Trail**: All actions logged with user and timestamp

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `QUOTE_WEBHOOK_INTEGRATION.md` | Complete webhook integration guide for bot |
| `BOT_INTEGRATION_SUMMARY.md` | This file - overall summary |
| `INCOMING_GEAR_INTEGRATION.md` | Original integration documentation |
| `PHASE2_WORKFLOW.md` | Quote-to-payment workflow details |
| `KAPSO_INTEGRATION_GUIDE.md` | Kapso WhatsApp API integration |
| `PORT_MANAGEMENT.md` | Development server management |

---

## ✅ Testing Checklist

- [ ] Generate API key
- [ ] Add API key to `.env.local`
- [ ] Restart dashboard
- [ ] Test webhook with cURL
- [ ] Verify quote appears in "Incoming Gear"
- [ ] Test accordion behavior (one client open at a time)
- [ ] Test item approval workflow
- [ ] Test "Approve for Payment" button
- [ ] Test email sending
- [ ] Test client details submission
- [ ] Test "Mark as Paid" functionality
- [ ] Verify items added to inventory

---

## 🚀 Production Deployment

### Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com

# Dashboard API (for bot integration)
DASHBOARD_API_KEY=...

# Email (for sending invoices)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@keysers.co.za

# Kapso WhatsApp API
KAPSO_API_KEY=...

# WooCommerce (optional)
WOO_STORE_URL=...
WOO_CONSUMER_KEY=...
WOO_CONSUMER_SECRET=...
```

### Deployment Steps

1. Deploy dashboard to production server
2. Update webhook URL in bot to use production domain
3. Configure HTTPS/SSL certificates
4. Set up email service (Gmail, SendGrid, etc.)
5. Test webhook from bot to production URL
6. Train staff on incoming gear workflow

---

## 💡 Tips & Best Practices

1. **Always Review Prices**: Don't blindly accept bot estimates
2. **Check Photos**: Verify item condition matches description
3. **One Client at a Time**: Use accordion to focus on one customer
4. **Add Notes**: Use review notes for future reference
5. **Bulk Actions**: Approve multiple items before generating invoice
6. **Follow Up**: Contact customers who don't respond to invoice emails

---

## 🆘 Troubleshooting

### Webhook Not Working
- Check API key is set correctly in both places
- Verify dashboard is running and accessible
- Check dashboard logs for errors
- Test with cURL first

### Customer Not Appearing in List
- Check "All Status" filter is selected
- Verify webhook returned 201 status
- Look in database: Settings > Database > pending_purchases

### Accordion Not Opening
- Check browser console for JavaScript errors
- Refresh page
- Try different browser

### Email Not Sending
- Verify SMTP settings in `.env.local`
- Check email service logs
- Test email configuration separately

---

## 🎉 You're All Set!

Your dashboard is now ready to receive quote acceptances from the Kapso bot and manage the complete workflow through to payment and inventory.

**Next Steps:**
1. Follow the setup instructions above
2. Test the webhook with the cURL command
3. Integrate the webhook call into your bot's quote acceptance flow
4. Start processing real quotes!

For any questions or issues, refer to the documentation files listed above.
