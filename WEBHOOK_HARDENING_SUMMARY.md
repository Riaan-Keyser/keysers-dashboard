# Production Webhook Hardening - Implementation Summary

**Date:** 2026-02-08  
**Status:** ✅ Complete

## Overview

Successfully implemented production-grade security for all webhook endpoints receiving data from the WhatsApp Bot. The system now enforces HMAC signature verification, DB-enforced idempotency, comprehensive event logging, payload versioning, and strict schema validation.

## Architecture Principles Applied

This implementation adheres to the confirmed system architecture:

1. ✅ **Single PostgreSQL database** - Prisma is the sole schema owner
2. ✅ **Dashboard writes, bot sends events** - Bot only sends HTTP webhooks
3. ✅ **Catalog logic in Dashboard** - All matching, pricing, validation in Dashboard
4. ✅ **OCR text is input-only** - OCR fields for matching, output text for users
5. ✅ **Event-based integration** - Bot sends intent, not database-shaped payloads

## Implementation Details

### 1. Database Schema (`prisma/schema.prisma`)

Added `WebhookEventLog` model with:
- UUID-based IDs (`@db.Uuid`)
- Unique `eventId` constraint (DB-enforced idempotency)
- Signature audit fields (`signatureProvided`, `signatureComputed`)
- Status transitions (`PENDING` → `PROCESSING` → `PROCESSED`/`FAILED`)
- Raw payload storage for replay capability
- Indexed on `[eventType, status, receivedAt]` for performance

Added `WebhookEventStatus` enum with states:
- `PENDING` - Just received
- `PROCESSING` - Currently being processed
- `PROCESSED` - Successfully completed
- `FAILED` - Processing error occurred
- `DUPLICATE` - Duplicate event_id detected

### 2. Security Layer (`lib/webhook-security.ts`)

Implemented HMAC-SHA256 signature verification:
- **Safe signature verification** - No throws on invalid signatures
- **Constant-time comparison** - Prevents timing attacks
- **Header format support** - Accepts `sha256=<hex>` format
- **Audit trail** - Returns both provided and computed signatures
- **Length mismatch protection** - Returns false if lengths differ

### 3. Schema Validation (`lib/webhook-schemas.ts`)

Created Zod schemas for strict validation:

**WebhookEnvelopeSchema:**
- `event_id` - UUID for idempotency
- `event_type` - Enum: `"quote_accepted"`, `"quote_declined"`
- `version` - Regex validation for semver (e.g., `"1.0"`)
- `timestamp` - ISO 8601 datetime
- `payload` - Event-specific payload

**QuoteAcceptedPayloadV1Schema:**
- **OCR fields** (`ocrText`, `ocrBrand`, `ocrModel`) - For matching only
- **Output fields** (`name`, `brand`, `model`) - User-facing canonical names
- **Pricing fields** - Bot estimates and proposed prices
- **Validation** - Required fields, array min length, email format, etc.

### 4. Event Handlers (`lib/webhook-handlers.ts`)

Implemented DB-enforced operations:

**`logWebhookEvent()`:**
- Atomically creates event log entry
- Catches unique constraint violation (P2002)
- Returns `{ isNew: true }` for new events
- Returns `{ isNew: false }` for duplicates (safe retry)
- **Race-condition safe** - PostgreSQL enforces uniqueness

**`updateWebhookEventStatus()`:**
- Manages status transitions
- Sets `processedAt` only on terminal states
- Stores error messages and entity relationships

**`canReplayEvent()`:**
- Checks if related entity exists
- Prevents duplicate entity creation on replay
- Supports safe manual replay from admin UI

### 5. Webhook Route Handler (`app/api/webhooks/quote-accepted/route.ts`)

Complete rewrite with production-safe flow:

**Request Processing Flow:**
1. Extract raw body string (`request.text()`)
2. Verify HMAC signature
3. Parse JSON and detect format (envelope vs legacy)
4. Atomically log event (idempotency check)
5. Return 200 OK if duplicate
6. Update status to PROCESSING
7. Validate version support
8. Validate payload schema (Zod)
9. Process business logic (create PendingPurchase)
10. Update status to PROCESSED with entity link
11. Handle errors → FAILED status

**Backward Compatibility:**
- Detects legacy format (no `event_id`)
- Wraps in envelope with version `"0.9"`
- Logs warning for monitoring
- Generates pseudo UUID (not idempotent)

**Response Codes:**
- `200 OK` - Duplicate event (idempotent)
- `201 Created` - Successfully processed
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid signature
- `500 Internal Server Error` - Processing error

### 6. Environment Configuration (`.env.example`)

Added webhook security variables:
- `WEBHOOK_SECRET` - HMAC signing secret (min 32 chars)
- Documented secret rotation strategy
- Generation command: `openssl rand -hex 32`
- Different secrets per environment

### 7. Developer Documentation (`WEBHOOK_CONTRACT.md`)

Created comprehensive 400+ line contract document:
- Security requirements and HMAC signature generation
- Envelope structure and field descriptions
- Event type schemas with validation rules
- Authentication process and error handling
- Idempotency guarantees and retry policy
- Response codes and their meanings
- **Python example** - Full working implementation
- **cURL example** - Shell script with signature generation
- Migration guide from legacy to new format
- Changelog and version history

## Security Features

### ✅ HMAC Signature Verification
- Algorithm: HMAC-SHA256
- Format: `sha256=<hex_signature>`
- Constant-time comparison (timing attack protection)
- Raw body verification (before parsing)

### ✅ DB-Enforced Idempotency
- Unique constraint on `event_id` (PostgreSQL)
- Atomic insert operation (race-condition safe)
- Duplicate detection returns 200 OK
- Same `event_id` can be retried safely

### ✅ Event Logging & Audit Trail
- All webhooks logged to `webhook_event_logs` table
- Raw payload stored (JSONB)
- Signature verification results stored
- Source IP tracking
- Status transitions tracked
- Processing timestamps recorded

### ✅ Payload Versioning
- Version field in envelope (`"1.0"`)
- Version-specific schema validation
- Unsupported versions rejected with clear error
- Future-proof for API evolution

### ✅ Strict Input Validation
- Zod schema validation at API boundary
- Type safety with TypeScript inference
- Clear validation error messages
- OCR vs output text separation enforced

### ✅ Replay Safety
- Check if related entity exists before replay
- Prevent duplicate database records
- Admin-only replay capability (future)
- Audit log for all replay attempts

## Testing Checklist

### Local Testing (Without Bot)

Use the provided Python script or cURL command from `WEBHOOK_CONTRACT.md`:

```bash
# Generate test signature
EVENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
WEBHOOK_SECRET="your_webhook_secret_here"
# ... (see WEBHOOK_CONTRACT.md for full example)
```

### Verification Steps

1. ✅ **Valid signature** → 201 Created
2. ✅ **Invalid signature** → 401 Unauthorized
3. ✅ **Duplicate event_id** → 200 OK (idempotent)
4. ✅ **Missing required fields** → 400 Bad Request
5. ✅ **Invalid version** → 400 Bad Request
6. ✅ **Legacy format** → 201 Created (with warning)
7. ✅ **Server error** → 500 with FAILED status in log

### Database Verification

```sql
-- Check event logs
SELECT * FROM webhook_event_logs ORDER BY received_at DESC LIMIT 10;

-- Check for duplicates
SELECT event_id, COUNT(*) FROM webhook_event_logs GROUP BY event_id HAVING COUNT(*) > 1;

-- Check status distribution
SELECT status, COUNT(*) FROM webhook_event_logs GROUP BY status;
```

## Migration Strategy

### For Bot Developers

**Phase 1: Dual Support (Current)**
- Dashboard accepts both legacy and new formats
- Legacy format logs warning but still works
- Update bot to use new format

**Phase 2: Bot Migration**
- Update bot to generate `event_id` (UUID)
- Wrap payload in envelope structure
- Generate HMAC signatures
- Test in staging environment

**Phase 3: Legacy Deprecation (Future)**
- Set sunset date for legacy format
- Monitor webhook logs for legacy usage
- Remove legacy support after migration complete

### Breaking Changes for Bot

The bot MUST update to include:
1. ✅ `event_id` (UUID v4) in envelope
2. ✅ `version` field (use `"1.0"`)
3. ✅ `event_type` field
4. ✅ `timestamp` (ISO 8601)
5. ✅ HMAC signature in `x-webhook-signature` header
6. ✅ Wrap current payload in `payload` field

## Files Created

```
lib/webhook-security.ts          - HMAC verification utilities
lib/webhook-schemas.ts            - Zod validation schemas
lib/webhook-handlers.ts           - Idempotency and event logging
WEBHOOK_CONTRACT.md               - Developer documentation (400+ lines)
WEBHOOK_HARDENING_SUMMARY.md      - This file
```

## Files Modified

```
prisma/schema.prisma                              - WebhookEventLog model
app/api/webhooks/quote-accepted/route.ts         - Production-safe handler
.env.example                                      - WEBHOOK_SECRET configuration
```

## Benefits

### For Operations
- **Audit trail** - Every webhook logged with full payload
- **Replay capability** - Manually reprocess failed events
- **Monitoring** - Track webhook status and failure rates
- **Debugging** - Inspect raw payloads and signature verification

### For Security
- **Authentication** - HMAC signature verification
- **Integrity** - Tamper-proof payloads
- **Protection** - Constant-time comparison prevents timing attacks
- **Secret rotation** - Documented strategy for zero-downtime rotation

### For Reliability
- **Idempotency** - Safe retries without duplicates
- **Race condition protection** - DB-enforced uniqueness
- **Error handling** - Graceful failures with status tracking
- **Backward compatibility** - Smooth migration from legacy format

### For Developers
- **Type safety** - Zod schemas with TypeScript inference
- **Clear contract** - Comprehensive documentation
- **Examples** - Working Python and cURL examples
- **Versioning** - API evolution without breaking changes

## Next Steps (Optional Enhancements)

### 1. Admin Replay Interface
Create dashboard page at `/dashboard/webhooks` with:
- List failed events
- View raw payloads
- Replay with safety checks
- Search and filter capabilities

### 2. Monitoring & Alerts
- Set up alerts for signature failures
- Monitor event processing latency
- Track duplicate event rates
- Dashboard for webhook health

### 3. Rate Limiting
- Per-bot rate limiting
- IP-based throttling
- Burst protection

### 4. Webhook Versioning
- Support multiple payload versions simultaneously
- Version negotiation
- Deprecation warnings

## Conclusion

The webhook layer is now **production-ready** with enterprise-grade security, reliability, and auditability. All non-negotiable requirements have been implemented:

1. ✅ Webhook authentication + verification (HMAC)
2. ✅ Idempotency (DB-enforced via unique `event_id`)
3. ✅ Event logging + replay (with safety checks)
4. ✅ Payload versioning (with validation)
5. ✅ Strict input validation (Zod schemas)

The system is **backward compatible** during the migration period and provides a clear path for the bot to upgrade to the new secure format.

**Status:** Ready for bot integration testing and production deployment.
