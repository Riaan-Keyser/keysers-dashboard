// Email service for sending supplier invoices to clients
import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('📧 Sending email to:', options.to)
    
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Keysers Camera Equipment'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    console.log('✅ Email sent successfully:', info.messageId)
    return true
  } catch (error) {
    console.error('❌ Email error:', error)
    return false
  }
}

export function generateSupplierInvoiceEmail(
  customerName: string,
  invoiceNumber: string,
  items: any[],
  total: number,
  acceptToken: string,
  baseUrl: string = 'http://localhost:3001'
): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">R ${item.finalPrice?.toLocaleString() || item.proposedPrice?.toLocaleString() || '-'}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Keysers Camera Equipment</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Supplier Invoice - Indication of Evaluation</p>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 20px 0;">Dear <strong>${customerName}</strong>,</p>
    
    <p style="margin: 0 0 20px 0;">
      Thank you for choosing Keysers Camera Equipment! We're pleased to present your <strong>Indication of Evaluation</strong> for the equipment you're selling to us.
    </p>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">Invoice #${invoiceNumber}</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 15px 12px; font-weight: bold; font-size: 18px;">TOTAL</td>
            <td style="padding: 15px 12px; font-weight: bold; font-size: 18px; color: #059669; text-align: right;">R ${total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p style="margin: 25px 0 20px 0;">
      <strong>Next Steps:</strong><br>
      1. Review the invoice above<br>
      2. Click "Accept" below to proceed with providing your payment details<br>
      3. We'll arrange collection or drop-off of your equipment
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
        <tr>
          <td style="padding-right: 10px;">
            <a href="${baseUrl}/client-details/${acceptToken}?action=accept" 
               style="display: inline-block; background-color: #059669; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              ✓ Accept Invoice
            </a>
          </td>
          <td>
            <a href="${baseUrl}/client-details/${acceptToken}?action=decline" 
               style="display: inline-block; background-color: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              ✗ Decline
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size: 12px; color: #6b7280; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      Questions? Contact us: <a href="mailto:info@keysers.co.za" style="color: #2563eb;">info@keysers.co.za</a><br>
      Keysers Camera Equipment - Quality Pre-Owned Camera Gear
    </p>
  </div>
</body>
</html>
  `
}
