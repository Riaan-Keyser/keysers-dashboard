# Quote Confirmation Workflow - Implementation Guide

## 📋 Overview

This document outlines the complete implementation of the **Quote Confirmation & Client Acceptance Workflow** for the Keysers Dashboard.

### Workflow Summary
```
Incoming Gear → Send Quote Email → Client Accepts → Collect Details → Awaiting Payment → Admin Notified
```

---

## 🎯 Feature Goals

1. **Send Quote to Client**: Admin clicks "Confirm Quote" button to send email to client
2. **Client Review**: Client receives email with quote details and Accept/Decline options
3. **Client Acceptance**: If accepted, client fills out digital form with personal details
4. **Details Collection**: Capture client information (personal, address, banking, documents)
5. **Move to Awaiting Payment**: Item moves from "Incoming Gear" to "Awaiting Payment" section
6. **Admin Notification**: Email sent to admin@keysers.co.za when payment is awaiting

---

## 📂 Implementation Phases

### ✅ Phase 1: Database Schema Updates
**File:** `PHASE_1_DATABASE.md`  
**Duration:** 2-3 hours  
**Status:** 🔴 Not Started

- Update `PendingPurchase` model with quote confirmation fields
- Create new `ClientDetails` model
- Add new status types
- Run Prisma migrations

### ✅ Phase 2: Backend API Endpoints
**File:** `PHASE_2_BACKEND_APIS.md`  
**Duration:** 2-3 hours  
**Status:** 🔴 Not Started

- Create "Send Quote" API endpoint
- Token generation logic
- Quote validation endpoints

### ✅ Phase 3: Email System Setup
**File:** `PHASE_3_EMAIL_SETUP.md`  
**Duration:** 1-2 hours  
**Status:** 🔴 Not Started

- Choose and configure email service (Resend recommended)
- Create email templates
- Test email delivery

### ✅ Phase 4: Public Quote Pages
**File:** `PHASE_4_PUBLIC_PAGES.md`  
**Duration:** 3-4 hours  
**Status:** 🔴 Not Started

- Create public quote review page
- Accept/Decline buttons
- Professional, branded layout

### ✅ Phase 5: Client Details Form
**File:** `PHASE_5_CLIENT_FORM.md`  
**Duration:** 3-4 hours  
**Status:** 🔴 Not Started

- Multi-step form for client details
- File upload handling (ID, proof of address)
- Form validation

### ✅ Phase 6: Dashboard Integration
**File:** `PHASE_6_DASHBOARD.md`  
**Duration:** 2 hours  
**Status:** 🔴 Not Started

- Add "Confirm Quote" button to Incoming Gear
- Create "Awaiting Payment" section
- Admin notification system

### ✅ Phase 7: Testing & QA
**File:** `PHASE_7_TESTING.md`  
**Duration:** 2 hours  
**Status:** 🔴 Not Started

- End-to-end workflow testing
- Email delivery testing
- Edge case handling

---

## 🗂️ New File Structure

```
keysers-dashboard/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── incoming/
│   │       │   └── page.tsx (updated - add "Confirm Quote" button)
│   │       └── awaiting-payment/
│   │           └── page.tsx (NEW - awaiting payment section)
│   │
│   ├── (public)/
│   │   └── quote/
│   │       └── [token]/
│   │           ├── page.tsx (NEW - quote review)
│   │           ├── details/
│   │           │   └── page.tsx (NEW - client form)
│   │           ├── confirmed/
│   │           │   └── page.tsx (NEW - success page)
│   │           └── declined/
│   │               └── page.tsx (NEW - decline page)
│   │
│   └── api/
│       ├── incoming-gear/
│       │   └── [id]/
│       │       └── send-quote/
│       │           └── route.ts (NEW)
│       │
│       └── quote-confirmation/
│           └── [token]/
│               ├── route.ts (NEW - GET quote details)
│               ├── accept/
│               │   └── route.ts (NEW - POST accept)
│               ├── submit-details/
│               │   └── route.ts (NEW - POST client details)
│               └── decline/
│                   └── route.ts (NEW - POST decline)
│
├── prisma/
│   └── schema.prisma (updated - add ClientDetails model)
│
├── lib/
│   ├── email.ts (NEW - email utilities)
│   ├── token.ts (NEW - token generation/validation)
│   └── validators.ts (NEW - SA ID validation, etc.)
│
├── components/
│   └── quote/
│       ├── QuoteReviewCard.tsx (NEW)
│       ├── ClientDetailsForm.tsx (NEW)
│       └── FileUpload.tsx (NEW)
│
└── docs/
    ├── QUOTE_CONFIRMATION_WORKFLOW.md (this file)
    ├── PHASE_1_DATABASE.md
    ├── PHASE_2_BACKEND_APIS.md
    ├── PHASE_3_EMAIL_SETUP.md
    ├── PHASE_4_PUBLIC_PAGES.md
    ├── PHASE_5_CLIENT_FORM.md
    ├── PHASE_6_DASHBOARD.md
    └── PHASE_7_TESTING.md
```

---

## 🔐 Security Considerations

1. **Token Security**: 
   - Use cryptographically secure random tokens (32 bytes)
   - Tokens expire after 7 days
   - One-time use only

2. **Public Endpoints**:
   - Rate limiting on all public APIs
   - CSRF protection on forms
   - Input sanitization

3. **File Uploads**:
   - Max size: 5MB per file
   - Allowed types: PDF, JPEG, PNG
   - Store in secure location (Vercel Blob or AWS S3)

4. **Data Validation**:
   - SA ID number format validation
   - Email validation
   - Phone number format validation

---

## 📧 Email Service Recommendation

**Recommended: Resend** (https://resend.com)

**Why Resend?**
- Modern, developer-friendly API
- 100 emails/day on free tier
- React Email component support
- Excellent deliverability
- Easy setup with Next.js

**Alternative Options:**
- SendGrid (robust, enterprise-ready)
- AWS SES (if using AWS infrastructure)
- Postmark (great for transactional emails)

---

## ❓ Questions to Clarify Before Starting

### 1. Client Details Required
What specific information do you need from clients?
- ✅ Full Name
- ✅ Surname
- ✅ ID Number (South African)
- ✅ Email
- ✅ Phone
- ✅ Physical Address
- ❓ Postal Address (if different)
- ❓ Banking Details (for future payouts?)
- ❓ Tax Number?

### 2. Document Uploads
Which documents should clients upload?
- ❓ Proof of ID (required?)
- ❓ Proof of Address (required?)
- ❓ Banking Confirmation (if banking details required?)

### 3. Payment Method
How will clients pay?
- ❓ Bank Transfer (EFT)
- ❓ Cash in-store
- ❓ Card payment (online/in-person)
- ❓ PayFast integration?

### 4. Quote Validity
- ❓ How long should quote links be valid? (Recommended: 7 days)
- ❓ Can admin extend expired quotes?
- ❓ Should clients receive reminder emails?

### 5. Branding
- ❓ Do you have Keysers logo in SVG/PNG format?
- ❓ Brand colors (hex codes)?
- ❓ Any specific branding guidelines?

---

## 📊 Estimated Timeline

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Database Schema | 2-3 hours | None |
| 2 | Backend APIs | 2-3 hours | Phase 1 |
| 3 | Email Setup | 1-2 hours | None (parallel) |
| 4 | Public Pages | 3-4 hours | Phase 2, 3 |
| 5 | Client Form | 3-4 hours | Phase 4 |
| 6 | Dashboard Updates | 2 hours | Phase 2, 5 |
| 7 | Testing | 2 hours | All phases |

**Total Estimated Time:** 15-20 hours

---

## 🚀 Getting Started

1. **Read Phase 1 Documentation**: `PHASE_1_DATABASE.md`
2. **Clarify Questions**: Answer the questions in this document
3. **Begin Implementation**: Start with database schema updates
4. **Test Each Phase**: Don't move forward until current phase works
5. **Document Changes**: Update phase files with actual implementation notes

---

## 📝 Progress Tracking

Use this checklist to track progress:

- [ ] Phase 1: Database Schema Complete
- [ ] Phase 2: Backend APIs Complete
- [ ] Phase 3: Email System Working
- [ ] Phase 4: Public Pages Built
- [ ] Phase 5: Client Form Functional
- [ ] Phase 6: Dashboard Integrated
- [ ] Phase 7: Full Testing Complete
- [ ] Production Deployment

---

## 🔗 Related Documentation

- `BOT_INTEGRATION_SUMMARY.md` - Webhook integration from bot
- `INCOMING_GEAR_UI_UPDATES.md` - Current Incoming Gear UI
- `QUOTE_WEBHOOK_INTEGRATION.md` - Bot quote acceptance flow
- `.env.example` - Environment variables needed

---

## 💾 Backup Points

Before starting each phase, create a git backup:

```bash
git add .
git commit -m "Pre-Phase X: Quote Confirmation Workflow"
git tag -a quote-workflow-phase-X-start -m "Starting Phase X"
```

After completing each phase:

```bash
git add .
git commit -m "Complete Phase X: [Phase Name]"
git tag -a quote-workflow-phase-X-complete -m "Phase X Complete"
```

---

## 📞 Support

If you need to resume implementation in a new chat:
1. Share this file: `QUOTE_CONFIRMATION_WORKFLOW.md`
2. Share the current phase file (e.g., `PHASE_3_EMAIL_SETUP.md`)
3. Mention which tasks are complete
4. Continue from where you left off

---

**Last Updated:** 2026-02-03  
**Status:** Planning Complete - Ready for Implementation  
**Next Step:** Review Phase 1 Documentation
