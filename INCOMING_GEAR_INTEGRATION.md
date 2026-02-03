# Incoming Gear Workflow - WhatsApp Bot Integration

This document explains how to integrate the WhatsApp bot with the Incoming Gear approval workflow in the dashboard.

## Workflow Overview

```
Customer WhatsApp → Bot identifies gear → Customer accepts quote
                           ↓
                  Dashboard "Incoming Gear" tab
                           ↓
          Staff reviews & adjusts prices → Approves items
                           ↓
                  Automatically added to Inventory
```

## Integration Steps

### 1. Bot Webhook Integration

When a customer accepts a quote in the WhatsApp bot, send the data to the dashboard API:

```python
# In your Flask bot (src/handlers/quote_handler.py)
import httpx

async def send_to_dashboard_approval(quote_data):
    """Send accepted quote to dashboard for approval."""
    
    dashboard_url = "http://localhost:3000/api/incoming-gear"
    api_key = "your-internal-api-key"  # You can use NextAuth session token
    
    payload = {
        "customerName": quote_data["customer_name"],
        "customerPhone": quote_data["phone_number"],
        "customerEmail": quote_data.get("email"),
        "whatsappConversationId": quote_data["conversation_id"],
        "totalQuoteAmount": quote_data["total_amount"],
        "botQuoteAcceptedAt": quote_data["accepted_at"],
        "botConversationData": {
            "messages": quote_data.get("messages", []),
            "workflow_id": quote_data.get("workflow_id")
        },
        "items": [
            {
                "name": item["name"],
                "brand": item.get("brand"),
                "model": item.get("model"),
                "category": item.get("category"),
                "condition": item.get("condition"),
                "description": item.get("description"),
                "serialNumber": item.get("serial_number"),
                "botEstimatedPrice": item["estimated_price"],
                "proposedPrice": item["proposed_price"],  # What you're offering
                "suggestedSellPrice": item.get("sell_price"),  # What you'll list it for
                "imageUrls": item.get("image_urls", [])
            }
            for item in quote_data["items"]
        ]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            dashboard_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10.0
        )
        
        if response.status_code == 201:
            logger.info(f"Sent quote to dashboard for approval: {quote_data['customer_name']}")
            return True
        else:
            logger.error(f"Failed to send to dashboard: {response.text}")
            return False
```

### 2. Update Your Quote Handler

Add this to your quote acceptance flow:

```python
# When customer accepts quote
if quote_accepted:
    # Send to dashboard for approval
    success = await send_to_dashboard_approval({
        "customer_name": customer_name,
        "phone_number": phone_number,
        "conversation_id": conversation_id,
        "total_amount": total_quote,
        "accepted_at": datetime.now().isoformat(),
        "items": identified_items  # From your product identification
    })
    
    if success:
        await send_message(
            to=phone_number,
            message="✅ Thank you! Your quote has been submitted for review. We'll contact you shortly."
        )
```

### 3. Dashboard Workflow

Staff members can now:

1. Go to **Incoming Gear** tab in dashboard
2. See list of customers with pending gear
3. Click on customer name to expand and see all items
4. For each item:
   - View bot's estimated price
   - Adjust proposed purchase price
   - Set final price  
   - Set suggested selling price
   - Add review notes
5. Approve or reject individual items
6. Once items are approved, click **"Add to Inventory"**
7. Items automatically move to main Inventory with status "PENDING_INSPECTION"

## API Endpoints

### GET /api/incoming-gear
List all pending purchases
- Query params: `?status=PENDING_REVIEW`

### POST /api/incoming-gear
Create new pending purchase (called by bot)

### PUT /api/incoming-gear/items/{id}
Update item pricing and status

### POST /api/incoming-gear/{id}/approve
Approve purchase and add all approved items to inventory

## Status Flow

### Purchase Status:
```
PENDING_REVIEW → IN_REVIEW → PENDING_APPROVAL → APPROVED → ADDED_TO_INVENTORY
                                                          ↘ REJECTED
```

### Item Status:
```
PENDING → PRICE_ADJUSTED → APPROVED → ADDED_TO_INVENTORY
                        ↘ REJECTED
```

## Example Bot Integration

```python
# Complete example for your Flask bot
from datetime import datetime
import httpx

class DashboardIntegration:
    def __init__(self):
        self.dashboard_url = "http://localhost:3000/api/incoming-gear"
    
    async def submit_quote_for_approval(
        self,
        customer_name: str,
        phone_number: str,
        conversation_id: str,
        items: list
    ):
        """Submit accepted quote to dashboard for approval."""
        
        total = sum(item.get("proposed_price", 0) for item in items)
        
        payload = {
            "customerName": customer_name,
            "customerPhone": phone_number,
            "whatsappConversationId": conversation_id,
            "totalQuoteAmount": total,
            "botQuoteAcceptedAt": datetime.now().isoformat(),
            "items": items
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.dashboard_url,
                    json=payload,
                    timeout=10.0
                )
                return response.status_code == 201
        except Exception as e:
            print(f"Dashboard integration error: {e}")
            return False

# Usage in your quote handler
dashboard = DashboardIntegration()

# After customer accepts
await dashboard.submit_quote_for_approval(
    customer_name="John Doe",
    phone_number="27723926372",
    conversation_id="abc123",
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

## Benefits

✅ **Quality Control**: Review all incoming gear before purchase
✅ **Price Optimization**: Adjust prices based on market conditions
✅ **Audit Trail**: Complete history of reviews and approvals
✅ **Workflow Integration**: Seamless bot-to-dashboard flow
✅ **Batch Processing**: Approve multiple items at once
✅ **Staff Accountability**: Track who reviewed and approved what

## Next Steps

1. Test the workflow manually by creating sample pending purchases
2. Integrate with your Flask bot's quote acceptance flow
3. Train staff on the approval process
4. Set up notifications for new incoming gear
