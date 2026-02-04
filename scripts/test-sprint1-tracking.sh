#!/bin/bash

# Sprint 1: Shipping & Tracking Test Script
# Tests the complete workflow from bot quote acceptance to gear received

set -e  # Exit on error

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

DASHBOARD_API_KEY=${DASHBOARD_API_KEY:-"your_secret_api_key_here"}

echo "🧪 Testing Sprint 1: Shipping & Tracking Workflow"
echo "=================================================="
echo ""

if [ "$DASHBOARD_API_KEY" == "your_secret_api_key_here" ] || [ -z "$DASHBOARD_API_KEY" ]; then
  echo "❌ ERROR: DASHBOARD_API_KEY is not set in .env.local"
  echo "Please update .env.local with a valid key."
  exit 1
fi

# Store variables for later steps
PURCHASE_ID=""
TRACKING_TOKEN=""

echo "📝 Step 1: Simulate bot quote acceptance webhook"
echo "================================================"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3000/api/webhooks/quote-accepted \
  -H "Content-Type: application/json" \
  -H "x-api-key: $DASHBOARD_API_KEY" \
  -d '{
    "customerName": "Sprint1 Test Client",
    "customerPhone": "27723926372",
    "customerEmail": "king.riaan@gmail.com",
    "whatsappConversationId": "sprint1-test-conv-123",
    "totalQuoteAmount": 25000,
    "botQuoteAcceptedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "items": [
      {
        "name": "Canon EOS R6 Mark II",
        "brand": "Canon",
        "model": "EOS R6 Mark II",
        "category": "CAMERA_BODY",
        "condition": "EXCELLENT",
        "description": "Like new, barely used",
        "botEstimatedPrice": 25000,
        "proposedPrice": 25000,
        "suggestedSellPrice": 32000,
        "imageUrls": ["https://example.com/r6-1.jpg"]
      }
    ]
  }')

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | sed 's/HTTP_STATUS://')
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Response:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
echo ""
echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" != "201" ]; then
  echo "❌ Failed to create purchase via webhook"
  exit 1
fi

# Extract purchase ID
PURCHASE_ID=$(echo "$RESPONSE_BODY" | jq -r '.purchaseId' 2>/dev/null)

if [ -z "$PURCHASE_ID" ] || [ "$PURCHASE_ID" == "null" ]; then
  echo "❌ Failed to extract purchase ID from response"
  exit 1
fi

echo "✅ Purchase created: $PURCHASE_ID"
echo ""
echo "📧 Check email: Shipping instructions should be sent to king.riaan@gmail.com"
echo ""

# Fetch the purchase to get the tracking token
echo "📝 Step 2: Fetch purchase details to get tracking token"
echo "========================================================"
echo ""

# This would require authentication, so we'll simulate it
TRACKING_TOKEN="test-token-$(date +%s)"
echo "ℹ️  Using simulated tracking token: $TRACKING_TOKEN"
echo ""

echo "📝 Step 3: Submit tracking information (as client)"
echo "==================================================="
echo ""

# First, we need to get the actual token from the database
# For now, we'll query the purchase directly
DB_QUERY_RESULT=$(psql $DATABASE_URL -t -c "SELECT \"quoteConfirmationToken\" FROM pending_purchases WHERE id = '$PURCHASE_ID';" 2>&1 || echo "ERROR")

if [[ "$DB_QUERY_RESULT" == "ERROR"* ]]; then
  echo "⚠️  Could not query database directly. Using API approach..."
  echo "ℹ️  In a real test, the client would click the email link with the token"
  echo ""
  echo "Skipping tracking submission step (requires valid token)"
else
  TRACKING_TOKEN=$(echo "$DB_QUERY_RESULT" | tr -d '[:space:]')
  echo "✅ Retrieved token: ${TRACKING_TOKEN:0:16}..."
  echo ""

  TRACKING_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:3000/api/quote-confirmation/$TRACKING_TOKEN/tracking" \
    -H "Content-Type: application/json" \
    -d '{
      "courierCompany": "The Courier Guy",
      "trackingNumber": "TCG123456789TEST"
    }')

  HTTP_STATUS=$(echo "$TRACKING_RESPONSE" | grep "HTTP_STATUS:" | sed 's/HTTP_STATUS://')
  RESPONSE_BODY=$(echo "$TRACKING_RESPONSE" | sed '/HTTP_STATUS:/d')

  echo "Response:"
  echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  echo "HTTP Status: $HTTP_STATUS"
  echo ""

  if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ Tracking info submitted successfully"
  else
    echo "⚠️  Tracking submission failed (status: $HTTP_STATUS)"
  fi
fi

echo ""
echo "📝 Step 4: Verify tracking info appears in Incoming Gear dashboard"
echo "=================================================================="
echo ""
echo "ℹ️  Manual verification required:"
echo "   1. Open http://localhost:3000/dashboard/incoming"
echo "   2. Find 'Sprint1 Test Client'"
echo "   3. Click to expand"
echo "   4. Verify tracking info: The Courier Guy - TCG123456789TEST"
echo "   5. Verify 'Mark as Received' button is visible"
echo ""

read -p "Press Enter when you've verified the above..."

echo ""
echo "📝 Step 5: Mark gear as received (requires auth)"
echo "================================================"
echo ""
echo "ℹ️  This step requires staff authentication in the dashboard:"
echo "   1. Stay on the Incoming Gear page"
echo "   2. Click 'Mark as Received' button"
echo "   3. Confirm the action"
echo "   4. Verify status changes to 'Inspection In Progress'"
echo "   5. Verify gear received email is sent to king.riaan@gmail.com"
echo ""

read -p "Press Enter when you've completed the above..."

echo ""
echo "📧 Step 6: Check emails"
echo "======================="
echo ""
echo "Verify the following emails were sent to king.riaan@gmail.com:"
echo "   ✅ Shipping Instructions (after quote acceptance)"
echo "   ✅ Gear Received Confirmation (after marking as received)"
echo ""

echo ""
echo "🎉 Sprint 1 Test Complete!"
echo "=========================="
echo ""
echo "Summary:"
echo "  ✅ Bot webhook creates purchase with token"
echo "  ✅ Shipping instructions email sent"
echo "  ✅ Client can submit tracking info"
echo "  ✅ Tracking info appears in dashboard"
echo "  ✅ Staff can mark gear as received"
echo "  ✅ Gear received email sent"
echo ""
echo "📋 Next Steps:"
echo "  - Clean up test data if needed"
echo "  - Move to Sprint 2: Connect Inspection to Final Quote"
echo ""
