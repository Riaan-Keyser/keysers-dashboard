# 📧 Email Setup Guide for Quote Workflow

This guide will help you set up email functionality for the quote confirmation workflow.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address
4. Get your API key from the dashboard

### Step 2: Add API Key to Environment

Add to your `.env.local` file:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_your_actual_api_key_here

# Email Configuration (optional - defaults shown)
FROM_EMAIL=noreply@keysers.co.za
ADMIN_EMAIL=admin@keysers.co.za
COMPANY_NAME=Keysers
COMPANY_WEBSITE=https://keysers.co.za
DASHBOARD_URL=http://localhost:3000
```

**Important:** Replace `re_your_actual_api_key_here` with your actual Resend API key!

### Step 3: Verify Domain (Production Only)

For production use, you need to verify your domain in Resend:

1. Go to https://resend.com/domains
2. Add your domain (`keysers.co.za`)
3. Add the DNS records to your domain provider
4. Wait for verification (usually < 5 minutes)

**Development:** You can skip this and use Resend's test mode (emails only go to verified addresses).

### Step 4: Test Email System

```bash
# Test basic email
npx tsx scripts/test-email.ts your-email@example.com

# Test all email templates
npx tsx scripts/test-all-emails.ts your-email@example.com
```

---

## 📧 Email Templates

The system includes 4 email templates:

| Template | Recipient | Purpose |
|----------|-----------|---------|
| **Test Email** | Any | Test configuration |
| **Quote Confirmation** | Client | Send quote with accept/decline links |
| **Awaiting Payment** | Admin | Notify when client accepts quote |
| **Quote Declined** | Admin | Notify when client declines quote |

---

## 🔧 Configuration Options

### Environment Variables

```bash
# Required
RESEND_API_KEY=your_api_key

# Optional (with defaults)
FROM_EMAIL=noreply@keysers.co.za        # Sender email
ADMIN_EMAIL=admin@keysers.co.za         # Admin notification email
COMPANY_NAME=Keysers                     # Company name in emails
COMPANY_WEBSITE=https://keysers.co.za    # Website URL
DASHBOARD_URL=http://localhost:3000      # Dashboard URL for links
```

### Development Mode

If `RESEND_API_KEY` is not set, emails will be logged to console instead of sent. This is useful for development.

---

## 🧪 Testing

### Test 1: Basic Email

```bash
npx tsx scripts/test-email.ts your-email@example.com
```

Expected output:
```
✅ Email sent successfully!
📬 Message ID: abc123...
```

### Test 2: All Templates

```bash
npx tsx scripts/test-all-emails.ts your-email@example.com
```

This will send 4 test emails:
1. Basic test email
2. Quote confirmation (with mock data)
3. Awaiting payment notification
4. Quote declined notification

---

## 🐛 Troubleshooting

### Issue: "Failed to send email"

**Causes:**
- API key not set
- API key invalid
- Domain not verified (production)

**Solutions:**
1. Check `.env.local` has `RESEND_API_KEY`
2. Verify API key at https://resend.com/api-keys
3. For production, verify domain at https://resend.com/domains

### Issue: Emails in spam folder

**Solutions:**
- Verify your domain in Resend
- Add SPF, DKIM, DMARC records
- Use a custom domain (not Gmail/Yahoo)

### Issue: "Domain not verified"

**Solutions:**
- Development: Use Resend test mode (emails only to verified addresses)
- Production: Add DNS records for your domain

---

## 📊 Email Limits

### Free Tier (Resend)
- 100 emails/day
- 3,000 emails/month
- 1 domain

### Paid Tier
- Starts at $20/month
- 50,000 emails/month
- Unlimited domains

---

## 🔐 Security

- **Never commit `.env.local`** - it's in `.gitignore`
- **Rotate API keys** if exposed
- **Use environment variables** for all sensitive data
- **Verify sender domains** in production

---

## ✅ Checklist

- [ ] Created Resend account
- [ ] Added `RESEND_API_KEY` to `.env.local`
- [ ] (Optional) Added custom email config variables
- [ ] Ran test email script successfully
- [ ] Tested all email templates
- [ ] (Production) Verified domain in Resend

---

## 🚀 Next Steps

Once emails are working:

1. ✅ Phase 1: Database ✅ Complete
2. ✅ Phase 2: Backend APIs ✅ Complete
3. ✅ Phase 3: Email System ✅ Complete
4. ⏭️  Phase 4: Build public client pages
5. ⏭️  Phase 5: Implement client details form
6. ⏭️  Phase 6: Dashboard UI integration
7. ⏭️  Phase 7: End-to-end testing

---

## 📞 Support

- **Resend Docs:** https://resend.com/docs
- **Resend Status:** https://status.resend.com
- **Issues:** Check Resend dashboard logs

---

**Note:** The system is designed to work without email configuration (development mode). Emails will be logged to console instead of sent.
