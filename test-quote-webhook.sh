#!/bin/bash
# Test the quote acceptance webhook

echo "🧪 Testing Quote Acceptance Webhook"
echo "===================================="
echo ""

API_KEY="35c7ad905e8d6ed324e9785d598f98df147c76d951022fd4c8bd0ca33f9c6081"
URL="http://localhost:3000/api/webhooks/quote-accepted"

echo "📤 Sending test quote to webhook..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "customerName": "Test Customer - John Doe",
    "customerPhone": "27723926372",
    "customerEmail": "john@example.com",
    "whatsappConversationId": "test_conv_123",
    "totalQuoteAmount": 50000,
    "botQuoteAcceptedAt": "2026-02-03T10:30:00Z",
    "items": [
      {
        "name": "Canon EOS R5 Camera Body",
        "brand": "Canon",
        "model": "EOS R5",
        "category": "CAMERA_BODY",
        "condition": "EXCELLENT",
        "description": "Mint condition, low shutter count, includes original box",
        "serialNumber": "123456789",
        "botEstimatedPrice": 35000,
        "proposedPrice": 32000,
        "suggestedSellPrice": 45000,
        "imageUrls": ["https://example.com/canon-r5-front.jpg", "https://example.com/canon-r5-back.jpg"]
      },
      {
        "name": "Canon RF 24-70mm f/2.8L IS USM",
        "brand": "Canon",
        "model": "RF 24-70mm f/2.8L IS USM",
        "category": "LENS",
        "condition": "GOOD",
        "description": "Great condition, minimal wear, works perfectly",
        "botEstimatedPrice": 18000,
        "proposedPrice": 16000,
        "suggestedSellPrice": 22000,
        "imageUrls": ["https://example.com/rf24-70.jpg"]
      }
    ]
  }')

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "📊 Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "🔢 HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "201" ]; then
    echo "✅ SUCCESS! Quote submitted successfully"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Open dashboard: http://localhost:3000"
    echo "  2. Navigate to 'Incoming Gear' tab"
    echo "  3. Look for 'Test Customer - John Doe'"
    echo "  4. Click to expand and see the 2 items"
else
    echo "❌ FAILED! HTTP Status: $HTTP_STATUS"
    echo ""
    echo "Common issues:"
    echo "  • API key mismatch - check DASHBOARD_API_KEY in .env.local"
    echo "  • Database not connected - check DATABASE_URL"
    echo "  • Dev server not running - run 'npm run dev'"
fi
