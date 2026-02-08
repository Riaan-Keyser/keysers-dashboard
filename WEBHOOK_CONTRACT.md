# Webhook Contract: Bot → Dashboard

This document defines the production-safe webhook contract for the WhatsApp Bot to communicate with the Keysers Dashboard.

## Table of Contents

- [Overview](#overview)
- [Security Requirements](#security-requirements)
- [Envelope Structure](#envelope-structure)
- [Event Types](#event-types)
- [Authentication](#authentication)
- [Idempotency](#idempotency)
- [Retry Policy](#retry-policy)
- [Response Codes](#response-codes)
- [Examples](#examples)

---

## Overview

All webhook requests from the bot MUST follow this contract. The dashboard enforces:

- **HMAC signature verification** (sha256)
- **Idempotency** via unique `event_id`
- **Event logging** for audit/replay
- **Payload versioning** for backward compatibility
- **Strict schema validation** (Zod)

## Security Requirements

### Required Headers

```
Content-Type: application/json
x-webhook-signature: sha256=<hex_signature>
```

### Signature Generation

The bot MUST generate an HMAC-SHA256 signature of the **raw request body** using the shared `WEBHOOK_SECRET`:

```python
import hmac
import hashlib
import json

# Payload as dictionary
payload = {
    "event_id": "123e4567-e89b-12d3-a456-426614174000",
    "event_type": "quote_accepted",
    "version": "1.0",
    "timestamp": "2026-02-06T10:30:00Z",
    "payload": { ... }
}

# Convert to JSON string (no extra whitespace)
body_string = json.dumps(payload, separators=(',', ':'))

# Generate HMAC signature
secret = "your_webhook_secret_here"
signature = hmac.new(
    secret.encode('utf-8'),
    body_string.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# Add to headers
headers = {
    "Content-Type": "application/json",
    "x-webhook-signature": f"sha256={signature}"
}
```

**⚠️ Critical:** Use the **raw JSON string** for signature generation, NOT the Python dict. The signature is computed on the exact bytes sent over HTTP.

---

## Envelope Structure

All webhook requests MUST use this envelope format:

```json
{
  "event_id": "string (UUID v4)",
  "event_type": "string (enum)",
  "version": "string (semver, e.g. '1.0')",
  "timestamp": "string (ISO 8601)",
  "payload": { ... }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | UUID | ✅ Yes | **Unique identifier** for idempotency. Generate with `uuid.uuid4()`. Dashboard rejects duplicates. |
| `event_type` | string | ✅ Yes | Event type enum: `"quote_accepted"`, `"quote_declined"` |
| `version` | string | ✅ Yes | Payload schema version. Use `"1.0"` for current schema. |
| `timestamp` | string | ✅ Yes | ISO 8601 timestamp when event occurred (UTC). |
| `payload` | object | ✅ Yes | Event-specific payload (see schemas below). |

---

## Event Types

### 1. `quote_accepted` (v1.0)

**Triggered when:** Customer accepts a quote on WhatsApp.

**Payload Schema:**

```json
{
  "customerName": "string",
  "customerPhone": "string",
  "customerEmail": "string (optional)",
  "whatsappConversationId": "string (optional)",
  "totalQuoteAmount": "number (optional)",
  "botQuoteAcceptedAt": "ISO 8601 string (optional)",
  "botConversationData": "object (optional)",
  "items": [
    {
      "ocrText": "string (optional) - OCR text for matching ONLY",
      "ocrBrand": "string (optional) - OCR brand for matching ONLY",
      "ocrModel": "string (optional) - OCR model for matching ONLY",
      
      "name": "string (required) - User-facing product name",
      "brand": "string (optional)",
      "model": "string (optional)",
      "category": "string (optional)",
      "condition": "string (optional)",
      "description": "string (optional)",
      "serialNumber": "string (optional)",
      
      "botEstimatedPrice": "number (optional)",
      "proposedPrice": "number (optional)",
      "suggestedSellPrice": "number (optional)",
      
      "imageUrls": ["string (URL)", ...] (optional)
    }
  ]
}
```

**Important Fields:**

- **OCR fields (`ocrText`, `ocrBrand`, `ocrModel`):** Used ONLY for catalog matching. Never shown to users.
- **Output fields (`name`, `brand`, `model`):** User-facing canonical names. ALWAYS use these for client responses.
- **Pricing:** `botEstimatedPrice` is the bot's initial estimate. `proposedPrice` is what staff approved (defaults to `botEstimatedPrice`).

**Validation Rules:**

- `customerName` and `customerPhone` are **required**
- At least **one item** is required
- Each item MUST have a `name` field
- `customerEmail` is optional but recommended (enables email notifications)

---

## Authentication

### HMAC Signature Verification

The dashboard verifies the signature using constant-time comparison to prevent timing attacks.

**Header Format:**

```
x-webhook-signature: sha256=<64_hex_chars>
```

**Verification Algorithm:**

1. Extract raw request body as string
2. Compute HMAC-SHA256 using `WEBHOOK_SECRET`
3. Compare provided signature with computed signature (constant-time)
4. Reject request if mismatch

**Response on Auth Failure:**

```json
HTTP 401 Unauthorized
{
  "error": "Unauthorized - Invalid signature"
}
```

---

## Idempotency

The dashboard uses DB-enforced idempotency to prevent duplicate processing:

1. Bot generates unique `event_id` (UUID v4) for each webhook
2. Dashboard atomically inserts event into `webhook_event_logs` table
3. If `event_id` already exists (unique constraint violation), return `200 OK` without reprocessing
4. If new event, process normally and return `201 Created`

**⚠️ Important:** The bot MUST generate a **new unique** `event_id` for each event. Do NOT reuse IDs.

**Idempotent Response:**

```json
HTTP 200 OK
{
  "success": true,
  "message": "Event already processed",
  "eventId": "123e4567-e89b-12d3-a456-426614174000",
  "duplicate": true
}
```

---

## Retry Policy

If the dashboard returns a **5xx error** or network failure, the bot SHOULD retry with **exponential backoff**:

1. Initial retry: after 1 second
2. Second retry: after 2 seconds
3. Third retry: after 4 seconds
4. Max retries: 5

**⚠️ Critical:** Use the **same `event_id`** for all retries. The dashboard will return `200 OK` if the event was already processed successfully.

**Do NOT retry on:**

- `400 Bad Request` (schema validation errors)
- `401 Unauthorized` (signature errors)

These errors require fixing the payload or signature, not retrying.

---

## Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200 OK` | Duplicate | Event already processed (idempotent). No action taken. |
| `201 Created` | Success | Event processed successfully. New PendingPurchase created. |
| `400 Bad Request` | Validation Error | Schema validation failed. Check response `details` field. |
| `401 Unauthorized` | Auth Error | Invalid or missing signature. |
| `500 Internal Server Error` | Server Error | Unexpected error. Safe to retry with same `event_id`. |

---

## Examples

### Full Example: Quote Accepted (Python)

```python
import requests
import hmac
import hashlib
import json
import uuid
from datetime import datetime, timezone

# Configuration
DASHBOARD_URL = "https://dashboard.keysers.co.za"
WEBHOOK_SECRET = "your_webhook_secret_here"

# Generate unique event ID
event_id = str(uuid.uuid4())

# Build payload
payload = {
    "event_id": event_id,
    "event_type": "quote_accepted",
    "version": "1.0",
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "payload": {
        "customerName": "John Doe",
        "customerPhone": "+27821234567",
        "customerEmail": "john@example.com",
        "whatsappConversationId": "abc123",
        "totalQuoteAmount": 5000.00,
        "botQuoteAcceptedAt": datetime.now(timezone.utc).isoformat(),
        "items": [
            {
                "ocrText": "canon 5d mark iv",
                "ocrBrand": "canon",
                "ocrModel": "5d mark iv",
                
                "name": "Canon EOS 5D Mark IV",
                "brand": "Canon",
                "model": "5D Mark IV",
                "category": "Cameras",
                "condition": "Excellent",
                "serialNumber": "123456789",
                
                "botEstimatedPrice": 5000.00,
                "proposedPrice": 5000.00,
                "suggestedSellPrice": 8000.00,
                
                "imageUrls": [
                    "https://example.com/image1.jpg"
                ]
            }
        ]
    }
}

# Convert to JSON string (compact, no extra whitespace)
body_string = json.dumps(payload, separators=(',', ':'))

# Generate HMAC signature
signature = hmac.new(
    WEBHOOK_SECRET.encode('utf-8'),
    body_string.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# Send request
headers = {
    "Content-Type": "application/json",
    "x-webhook-signature": f"sha256={signature}"
}

response = requests.post(
    f"{DASHBOARD_URL}/api/webhooks/quote-accepted",
    data=body_string,  # Send raw string, not dict
    headers=headers
)

# Handle response
if response.status_code == 201:
    print("✅ Quote accepted successfully")
    data = response.json()
    print(f"Purchase ID: {data['purchaseId']}")
    print(f"Event ID: {data['eventId']}")
elif response.status_code == 200:
    print("🔁 Event already processed (duplicate)")
elif response.status_code == 401:
    print("❌ Authentication failed - check signature")
elif response.status_code == 400:
    print("❌ Validation error:")
    print(response.json())
else:
    print(f"⚠️ Error {response.status_code}: {response.text}")
```

### cURL Example

```bash
#!/bin/bash

EVENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
WEBHOOK_SECRET="your_webhook_secret_here"

# Build payload
PAYLOAD=$(cat <<EOF
{
  "event_id": "$EVENT_ID",
  "event_type": "quote_accepted",
  "version": "1.0",
  "timestamp": "$TIMESTAMP",
  "payload": {
    "customerName": "Jane Smith",
    "customerPhone": "+27829876543",
    "customerEmail": "jane@example.com",
    "items": [
      {
        "ocrText": "nikon d850",
        "name": "Nikon D850",
        "brand": "Nikon",
        "model": "D850",
        "category": "Cameras",
        "condition": "Good",
        "botEstimatedPrice": 12000.00,
        "proposedPrice": 12000.00
      }
    ]
  }
}
EOF
)

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

# Send request
curl -X POST https://dashboard.keysers.co.za/api/webhooks/quote-accepted \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

---

## Migration Guide: Legacy Format → Envelope Format

### Legacy Format (Deprecated)

```json
{
  "customerName": "...",
  "customerPhone": "...",
  "items": [...]
}
```

**Headers:** `x-api-key: <secret>`

### New Format (Required)

```json
{
  "event_id": "<uuid>",
  "event_type": "quote_accepted",
  "version": "1.0",
  "timestamp": "<iso8601>",
  "payload": {
    "customerName": "...",
    "customerPhone": "...",
    "items": [...]
  }
}
```

**Headers:** `x-webhook-signature: sha256=<hmac>`

### Migration Period

The dashboard currently **accepts both formats** during the migration period (version `0.9` for legacy). However:

- Legacy format does NOT provide idempotency guarantees
- Legacy format will be **removed** after migration deadline
- **Action Required:** Update bot to use new format ASAP

### Migration Checklist

- [ ] Generate unique `event_id` (UUID) for each webhook
- [ ] Wrap payload in envelope structure
- [ ] Add `version: "1.0"` field
- [ ] Add `timestamp` field (ISO 8601)
- [ ] Generate HMAC signature using `WEBHOOK_SECRET`
- [ ] Update header from `x-api-key` to `x-webhook-signature`
- [ ] Test with dashboard staging environment
- [ ] Deploy to production

---

## Support

For questions or issues with webhook integration:

- **Email:** dev@keysers.co.za
- **Dashboard:** Admin → Webhooks (view failed events and logs)
- **This Contract:** Version 1.0 (Last updated: 2026-02-06)

---

## Changelog

### Version 1.0 (2026-02-06)

- Initial production webhook contract
- Added HMAC signature verification
- Added DB-enforced idempotency
- Added event logging
- Added payload versioning
- Added OCR field support for matching
