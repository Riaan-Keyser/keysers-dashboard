# Quote Acceptance Webhook - Kapso Bot Integration

## Overview

When a customer accepts a quote via the Kapso WhatsApp bot, the bot should call this webhook to push the quote data into the dashboard's "Incoming Gear" section.

## Webhook Details

**Endpoint:** `POST https://your-domain.com/api/webhooks/quote-accepted`

**Authentication:** API Key (sent in headers)

**Content-Type:** `application/json`

---

## Setup Instructions

### 1. Generate a Secure API Key

```bash
# Generate a random API key
openssl rand -base64 32
# Example output: wK7xR3pV9mN2qT5sL8jH4fD6gB1nA0cE

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Add API Key to Environment Variables

Edit your `.env.local` file:

```bash
# Dashboard API Key (for webhooks and bot integration)
DASHBOARD_API_KEY=wK7xR3pV9mN2qT5sL8jH4fD6gB1nA0cE
```

**Important:** Keep this key secret! Don't commit it to git.

### 3. Configure Your Kapso Bot

In your bot code (Python Flask/FastAPI, Node.js, etc.), add the webhook call when a quote is accepted.

---

## Request Format

### Headers

```json
{
  "Content-Type": "application/json",
  "x-api-key": "your_dashboard_api_key_here"
}
```

### Body Schema

```typescript
{
  // Required fields
  "customerName": string,
  "customerPhone": string,  // Format: "27723926372" (with country code)
  "items": [
    {
      "name": string,  // Required - e.g., "Canon EOS R5"
      
      // Optional item details
      "brand"?: string,
      "model"?: string,
      "category"?: string,  // e.g., "CAMERA_BODY", "LENS", etc.
      "condition"?: string,  // e.g., "EXCELLENT", "GOOD", "FAIR"
      "description"?: string,
      "serialNumber"?: string,
      
      // Pricing (all optional numbers)
      "botEstimatedPrice"?: number,
      "proposedPrice"?: number,  // What you're offering to pay
      "suggestedSellPrice"?: number,  // What you'll list it for
      
      // Media
      "imageUrls"?: string[]  // Array of image URLs
    }
  ],
  
  // Optional purchase details
  "customerEmail"?: string,
  "whatsappConversationId"?: string,  // Your bot's conversation ID
  "totalQuoteAmount"?: number,
  "botQuoteAcceptedAt"?: string,  // ISO date string
  "botConversationData"?: object  // Any additional data you want to store
}
```

---

## Example Implementations

### Python (requests)

```python
import requests
from datetime import datetime

def send_quote_to_dashboard(customer_data, items):
    """Send accepted quote to dashboard webhook."""
    
    url = "https://your-domain.com/api/webhooks/quote-accepted"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": "your_dashboard_api_key_here"
    }
    
    payload = {
        "customerName": customer_data["name"],
        "customerPhone": customer_data["phone"],
        "customerEmail": customer_data.get("email"),
        "whatsappConversationId": customer_data.get("conversation_id"),
        "totalQuoteAmount": sum(item.get("proposedPrice", 0) for item in items),
        "botQuoteAcceptedAt": datetime.now().isoformat(),
        "items": items
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Quote submitted successfully! Purchase ID: {data['purchaseId']}")
        return True
    else:
        print(f"❌ Failed to submit quote: {response.text}")
        return False

# Example usage
customer = {
    "name": "John Doe",
    "phone": "27723926372",
    "email": "john@example.com",
    "conversation_id": "conv_123456"
}

items = [
    {
        "name": "Canon EOS R5",
        "brand": "Canon",
        "model": "EOS R5",
        "category": "CAMERA_BODY",
        "condition": "EXCELLENT",
        "description": "Mint condition, low shutter count",
        "botEstimatedPrice": 35000,
        "proposedPrice": 32000,
        "suggestedSellPrice": 45000,
        "imageUrls": ["https://example.com/image1.jpg"]
    },
    {
        "name": "Canon RF 24-70mm f/2.8L",
        "brand": "Canon",
        "model": "RF 24-70mm f/2.8L",
        "category": "LENS",
        "condition": "GOOD",
        "botEstimatedPrice": 18000,
        "proposedPrice": 16000,
        "suggestedSellPrice": 22000,
        "imageUrls": []
    }
]

send_quote_to_dashboard(customer, items)
```

### Python (httpx - async)

```python
import httpx
from datetime import datetime

async def send_quote_to_dashboard_async(customer_data, items):
    """Send accepted quote to dashboard webhook (async)."""
    
    url = "https://your-domain.com/api/webhooks/quote-accepted"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": "your_dashboard_api_key_here"
    }
    
    payload = {
        "customerName": customer_data["name"],
        "customerPhone": customer_data["phone"],
        "customerEmail": customer_data.get("email"),
        "whatsappConversationId": customer_data.get("conversation_id"),
        "totalQuoteAmount": sum(item.get("proposedPrice", 0) for item in items),
        "botQuoteAcceptedAt": datetime.now().isoformat(),
        "items": items
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=10.0)
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Quote submitted! Purchase ID: {data['purchaseId']}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False

# Usage in async function
await send_quote_to_dashboard_async(customer, items)
```

### Node.js (axios)

```javascript
const axios = require('axios');

async function sendQuoteToDashboard(customerData, items) {
  const url = 'https://your-domain.com/api/webhooks/quote-accepted';
  
  const payload = {
    customerName: customerData.name,
    customerPhone: customerData.phone,
    customerEmail: customerData.email,
    whatsappConversationId: customerData.conversationId,
    totalQuoteAmount: items.reduce((sum, item) => sum + (item.proposedPrice || 0), 0),
    botQuoteAcceptedAt: new Date().toISOString(),
    items: items
  };
  
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your_dashboard_api_key_here'
      },
      timeout: 10000
    });
    
    console.log('✅ Quote submitted!', response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to submit quote:', error.response?.data || error.message);
    return false;
  }
}

// Example usage
const customer = {
  name: 'John Doe',
  phone: '27723926372',
  email: 'john@example.com',
  conversationId: 'conv_123456'
};

const items = [
  {
    name: 'Canon EOS R5',
    brand: 'Canon',
    model: 'EOS R5',
    category: 'CAMERA_BODY',
    condition: 'EXCELLENT',
    botEstimatedPrice: 35000,
    proposedPrice: 32000,
    suggestedSellPrice: 45000,
    imageUrls: ['https://example.com/image1.jpg']
  }
];

sendQuoteToDashboard(customer, items);
```

### cURL (for testing)

```bash
curl -X POST https://your-domain.com/api/webhooks/quote-accepted \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_dashboard_api_key_here" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "27723926372",
    "customerEmail": "john@example.com",
    "whatsappConversationId": "conv_123456",
    "totalQuoteAmount": 48000,
    "botQuoteAcceptedAt": "2026-02-03T10:30:00Z",
    "items": [
      {
        "name": "Canon EOS R5",
        "brand": "Canon",
        "model": "EOS R5",
        "category": "CAMERA_BODY",
        "condition": "EXCELLENT",
        "description": "Mint condition, low shutter count",
        "botEstimatedPrice": 35000,
        "proposedPrice": 32000,
        "suggestedSellPrice": 45000,
        "imageUrls": ["https://example.com/image1.jpg"]
      },
      {
        "name": "Canon RF 24-70mm f/2.8L",
        "brand": "Canon",
        "model": "RF 24-70mm f/2.8L",
        "category": "LENS",
        "condition": "GOOD",
        "botEstimatedPrice": 18000,
        "proposedPrice": 16000,
        "suggestedSellPrice": 22000
      }
    ]
  }'
```

---

## Response Format

### Success (201 Created)

```json
{
  "success": true,
  "purchaseId": "clxxx123456789",
  "message": "Quote submitted for review",
  "itemCount": 2
}
```

### Error (400 Bad Request)

```json
{
  "error": "customerName and customerPhone are required"
}
```

### Error (401 Unauthorized)

```json
{
  "error": "Unauthorized - Invalid API key"
}
```

### Error (500 Server Error)

```json
{
  "error": "Failed to process quote acceptance",
  "details": "Database connection error"
}
```

---

## What Happens After Webhook is Called?

1. **Quote is Created** in "Incoming Gear" section with status `PENDING_REVIEW`
2. **Customer's Name Appears** in the list with accordion behavior
3. **Staff Can Click** on customer name to expand and see all items
4. **One Accordion Open at a Time** - clicking another customer closes the previous one
5. **Staff Reviews & Adjusts** prices for each item
6. **Staff Approves Items** individually
7. **Supplier Invoice Generated** and sent to customer
8. **Customer Accepts** and provides bank details
9. **Payment Made** and items added to inventory

---

## Dashboard Workflow After Quote Submission

```
Bot Calls Webhook (Quote Accepted)
         ↓
Incoming Gear Tab (Client Name Listed)
         ↓
Staff Clicks Client Name (Accordion Opens)
         ↓
All Items Displayed (with prices, images, actions)
         ↓
Staff Reviews & Adjusts Prices
         ↓
Staff Approves Items
         ↓
Staff Clicks "Approve for Payment"
         ↓
Email Sent to Client with Supplier Invoice
         ↓
Client Accepts & Submits Bank Details
         ↓
Moves to "Awaiting Payment" Section
         ↓
Staff Marks Payment Received
         ↓
Items Added to Inventory Automatically
```

---

## Testing the Webhook

### 1. Health Check (GET)

```bash
curl https://your-domain.com/api/webhooks/quote-accepted
```

Returns webhook documentation and health status.

### 2. Test Quote Submission (POST)

Use the cURL example above or create a test script in your bot.

### 3. Verify in Dashboard

1. Log into dashboard
2. Navigate to **Incoming Gear** tab
3. Look for the customer name you just submitted
4. Click to expand and verify all items are present

---

## Security Best Practices

1. **Use HTTPS Only** - Never send API keys over HTTP
2. **Keep API Key Secret** - Store in environment variables, not in code
3. **Rotate Keys Periodically** - Change your API key every few months
4. **Monitor Logs** - Check for unauthorized webhook attempts
5. **Rate Limiting** - Consider implementing rate limits on the webhook

---

## Troubleshooting

### "Unauthorized - Invalid API key"
- Check that `x-api-key` header is set correctly
- Verify `DASHBOARD_API_KEY` is set in `.env.local`
- Make sure the API key matches exactly (no extra spaces)

### "customerName and customerPhone are required"
- Ensure both fields are present in request body
- Check that values are not empty strings or null

### "At least one item is required"
- Verify `items` array is present and not empty
- Check that items array contains at least one item

### Webhook times out
- Check that dashboard is running and accessible
- Verify network connectivity from bot to dashboard
- Check dashboard logs for errors

### Items not appearing in dashboard
- Verify webhook returned 201 status code
- Check dashboard database for pending purchases
- Look for errors in dashboard terminal/logs

---

## Support

For issues or questions:
1. Check dashboard logs: `npm run dev` output
2. Check database: Navigate to **Settings > Database** in dashboard
3. Review `pending_purchases` and `pending_items` tables

---

## Next Steps

1. ✅ Copy example code for your bot's language
2. ✅ Generate and set `DASHBOARD_API_KEY` in `.env.local`
3. ✅ Test webhook with cURL or Postman
4. ✅ Integrate webhook call into your quote acceptance flow
5. ✅ Train staff on reviewing incoming gear in dashboard
