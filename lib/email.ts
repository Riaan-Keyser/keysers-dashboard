import { Resend } from "resend"
import { PendingItem } from "@prisma/client"
import { emailConfig, getQuoteUrl, getAcceptUrl, getDeclineUrl, getDashboardPurchaseUrl } from "./email-config"

const resend = new Resend(process.env.RESEND_API_KEY)

type EmailResponse = {
  success: boolean
  error?: string
  messageId?: string
}

/**
 * Send quote confirmation email to client
 */
export async function sendQuoteConfirmationEmail({
  customerName,
  customerEmail,
  token,
  items,
  totalAmount
}: {
  customerName: string
  customerEmail: string
  token: string
  items: PendingItem[]
  totalAmount: any
}): Promise<EmailResponse> {
  // If no API key, use placeholder (development mode)
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send quote confirmation email to:", customerEmail)
    console.log("   Token:", token.substring(0, 8) + "...")
    console.log("   Total Amount:", totalAmount)
    return { success: true }
  }

  try {
    const quoteUrl = getQuoteUrl(token)
    const acceptUrl = getAcceptUrl(token)
    const declineUrl = getDeclineUrl(token)

    const itemsList = items
      .map(item => {
        const price = item.finalPrice ? `R${Number(item.finalPrice).toLocaleString()}` : "TBC"
        return `<li><strong>${item.name}</strong>${item.brand ? ` - ${item.brand}` : ''}${item.model ? ` ${item.model}` : ''} - ${price}</li>`
      })
      .join("\n")

    const total = totalAmount 
      ? `R${Number(totalAmount).toLocaleString()}` 
      : `R${items.reduce((sum, item) => sum + (Number(item.finalPrice) || 0), 0).toLocaleString()}`

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [customerEmail],
      subject: `Your Quote from ${emailConfig.companyName} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .items { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .items ul { list-style: none; padding: 0; }
              .items li { padding: 10px 0; border-bottom: 1px solid #eee; }
              .items li:last-child { border-bottom: none; }
              .total { font-size: 24px; font-weight: bold; color: #0066cc; margin: 20px 0; text-align: center; }
              .button { display: inline-block; padding: 15px 30px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .accept-btn { background-color: #28a745; color: white; }
              .decline-btn { background-color: #dc3545; color: white; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${emailConfig.companyName}</h1>
                <p>Your Quote is Ready</p>
              </div>
              
              <div class="content">
                <h2>Hi ${customerName},</h2>
                <p>Thank you for your interest in selling your camera gear to ${emailConfig.companyName}.</p>
                <p>We're pleased to offer you a quote for the following items:</p>
                
                <div class="items">
                  <ul>
                    ${itemsList}
                  </ul>
                </div>
                
                <p class="total">Total Offer: ${total}</p>
                
                <p>Please review your quote and let us know your decision:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${acceptUrl}" class="button accept-btn">✓ Accept Quote</a>
                  <a href="${declineUrl}" class="button decline-btn">✗ Decline Quote</a>
                </div>
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                  Or view the full quote here: <br>
                  <a href="${quoteUrl}">${quoteUrl}</a>
                </p>
                
                <p style="color: #999; font-size: 12px; text-align: center;">⏰ This link expires in 7 days.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 13px; color: #666;">
                  <strong>What happens next?</strong><br>
                  • If you accept, you'll be asked to provide your details<br>
                  • We'll arrange payment and shipping collection<br>
                  • If you have questions, just reply to this email
                </p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                <p><a href="${emailConfig.companyWebsite}" style="color: #0066cc;">${emailConfig.companyWebsite}</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send quote email:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Quote email sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending quote email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification to admin when payment is awaiting
 */
export async function sendAwaitingPaymentEmail({
  customerName,
  customerEmail,
  totalAmount,
  purchaseId,
  adminEmail
}: {
  customerName: string
  customerEmail: string
  totalAmount: any
  purchaseId: string
  adminEmail: string
}): Promise<EmailResponse> {
  // If no API key, use placeholder (development mode)
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send awaiting payment email to admin:", adminEmail)
    console.log("   Customer:", customerName)
    console.log("   Amount:", totalAmount)
    console.log("   Purchase ID:", purchaseId)
    return { success: true }
  }

  try {
    const dashboardUrl = getDashboardPurchaseUrl(purchaseId)
    const total = totalAmount ? `R${Number(totalAmount).toLocaleString()}` : "TBC"

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} System <${emailConfig.from}>`,
      to: [adminEmail],
      subject: `🔔 Payment Awaiting - ${customerName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .info p { margin: 8px 0; }
              .button { display: inline-block; padding: 15px 30px; margin: 20px 0; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔔 Payment Awaiting</h1>
              
              <div class="alert">
                <strong>A client has accepted their quote and submitted their details.</strong>
              </div>
              
              <div class="info">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Total Amount:</strong> ${total}</p>
                <p><strong>Purchase ID:</strong> <code>${purchaseId}</code></p>
              </div>
              
              <a href="${dashboardUrl}" class="button">View in Dashboard →</a>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                This is an automated notification from ${emailConfig.companyName} Dashboard.<br>
                Please process this payment at your earliest convenience.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send admin notification:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Admin notification sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending admin notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send notification to admin when quote is declined
 */
export async function sendQuoteDeclinedEmail({
  customerName,
  customerEmail,
  reason,
  adminEmail
}: {
  customerName: string
  customerEmail: string
  reason?: string
  adminEmail: string
}): Promise<EmailResponse> {
  // If no API key, use placeholder (development mode)
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send quote declined email to admin:", adminEmail)
    console.log("   Customer:", customerName)
    console.log("   Reason:", reason || "No reason provided")
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} System <${emailConfig.from}>`,
      to: [adminEmail],
      subject: `Quote Declined - ${customerName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .info p { margin: 8px 0; }
              .reason { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Quote Declined</h1>
              
              <p>A client has declined their quote.</p>
              
              <div class="info">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
              </div>
              
              ${reason ? `
                <div class="reason">
                  <p><strong>Reason:</strong></p>
                  <p>${reason}</p>
                </div>
              ` : '<p style="font-style: italic; color: #666;">No reason provided.</p>'}
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                This is an automated notification from ${emailConfig.companyName} Dashboard.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send decline notification:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Decline notification sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending decline notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send quote approved email with PDF and delivery options (NEW - Replaces shipping instructions)
 */
export async function sendQuoteApprovedEmail({
  customerName,
  customerEmail,
  token,
  totalAmount
}: {
  customerName: string
  customerEmail: string
  token: string
  totalAmount?: any
}): Promise<EmailResponse> {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send quote approved email to:", customerEmail)
    console.log("   Token:", token.substring(0, 8) + "...")
    return { success: true }
  }

  try {
    const deliveryUrl = `${emailConfig.dashboardUrl}/quote/${token}/delivery`
    const total = totalAmount ? `R${Number(totalAmount).toLocaleString()}` : "TBC"

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [customerEmail],
      subject: `Quote Approved - Choose Your Delivery Method | ${emailConfig.companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 30px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .quote-box { background-color: #e8f4f8; padding: 20px; margin: 20px 0; border-left: 4px solid #0066cc; text-align: center; }
              .cta-button { display: inline-block; padding: 15px 40px; margin: 20px 0; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; font-size: 16px; }
              .steps { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .steps ol { padding-left: 20px; }
              .steps li { margin: 10px 0; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Your Quote Has Been Approved!</h1>
              </div>
              
              <div class="content">
                <h2>Hi ${customerName},</h2>
                <p>Great news! We've reviewed your gear and prepared a preliminary quote for you.</p>
                
                <div class="quote-box">
                  <h3 style="margin: 0 0 10px 0; color: #0066cc;">Preliminary Quote Amount</h3>
                  <p style="font-size: 32px; font-weight: bold; margin: 10px 0; color: #333;">${total}</p>
                  <p style="font-size: 13px; color: #666; margin: 0;">Final amount confirmed after physical inspection</p>
                </div>
                
                <h3>📦 Next Step: Choose Your Delivery Method</h3>
                <p>Click the button below to select how you'd like to get your gear to us:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${deliveryUrl}" class="cta-button">Choose Delivery Method →</a>
                </div>
                
                <p style="font-size: 13px; color: #666; text-align: center;">
                  Or copy this link:<br>
                  <a href="${deliveryUrl}" style="color: #0066cc;">${deliveryUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <h3>🚀 What Happens Next?</h3>
                <div class="steps">
                  <ol>
                    <li><strong>Choose delivery method</strong> - Drop off in person or courier to us</li>
                    <li><strong>We receive your gear</strong> - You'll get an email confirmation</li>
                    <li><strong>Professional inspection</strong> - We verify condition and accessories</li>
                    <li><strong>Final quote sent</strong> - Based on actual inspection (usually within 48-72 hours)</li>
                    <li><strong>You accept & get paid</strong> - Fast, secure payment</li>
                  </ol>
                </div>
                
                <p style="font-size: 13px; color: #666; margin-top: 30px;">
                  <strong>Questions?</strong> Just reply to this email or call us at 072 392 6372.
                </p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                <p><a href="${emailConfig.companyWebsite}" style="color: #0066cc;">${emailConfig.companyWebsite}</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send quote approved email:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Quote approved email sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending quote approved email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send shipping instructions email to client (Sprint 1) - DEPRECATED
 * Use sendQuoteApprovedEmail() instead
 */
export async function sendShippingInstructionsEmail({
  customerName,
  customerEmail,
  token,
  totalAmount
}: {
  customerName: string
  customerEmail: string
  token: string
  totalAmount?: any
}): Promise<EmailResponse> {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send shipping instructions email to:", customerEmail)
    console.log("   Token:", token.substring(0, 8) + "...")
    return { success: true }
  }

  try {
    const trackingUrl = `${emailConfig.dashboardUrl}/quote/${token}/shipping`
    const total = totalAmount ? `R${Number(totalAmount).toLocaleString()}` : "TBC"

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [customerEmail],
      subject: `How to Ship Your Gear to ${emailConfig.companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .address-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #0066cc; }
              .steps { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .steps ol { padding-left: 20px; }
              .steps li { margin: 10px 0; }
              .button { display: inline-block; padding: 15px 30px; margin: 20px 0; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
              .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📦 Ship Your Gear to Us</h1>
                <p>Preliminary Quote Accepted: ${total}</p>
              </div>
              
              <div class="content">
                <h2>Hi ${customerName},</h2>
                <p>Thank you for accepting our preliminary quote! We're excited to inspect your gear and provide you with a final offer.</p>
                
                <div class="alert">
                  <strong>⚠️ Important:</strong> This is a preliminary evaluation. Your final quote will be confirmed after we inspect your gear in person.
                </div>
                
                <h3>📍 Shipping Address</h3>
                <div class="address-box">
                  <strong>${emailConfig.companyName}</strong><br>
                  65 Tennant Street<br>
                  Windsor Park, Kraaifontein<br>
                  7570<br>
                  South Africa
                </div>
                
                <h3>📋 Packaging Instructions</h3>
                <div class="steps">
                  <ol>
                    <li><strong>Pack Securely:</strong> Use original boxes if available, or sturdy packaging with bubble wrap</li>
                    <li><strong>Include Accessories:</strong> Chargers, batteries, straps, lens caps, etc.</li>
                    <li><strong>Remove Memory Cards:</strong> Please remove any personal data</li>
                    <li><strong>Insure Your Shipment:</strong> We recommend insuring high-value items</li>
                    <li><strong>Use a Reliable Courier:</strong> The Courier Guy, DHL, Aramex, or similar</li>
                  </ol>
                </div>
                
                <h3>📦 Submit Your Tracking Number</h3>
                <p>Once you've shipped your gear, please provide us with your tracking number so we can monitor delivery:</p>
                
                <div style="text-align: center;">
                  <a href="${trackingUrl}" class="button">Submit Tracking Info →</a>
                </div>
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                  Or copy this link: <br>
                  <a href="${trackingUrl}">${trackingUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <h3>🔍 What Happens Next?</h3>
                <div class="steps">
                  <ol>
                    <li>Ship your gear to us using a reliable courier</li>
                    <li>Submit your tracking number via the link above</li>
                    <li>We'll notify you when we receive your gear</li>
                    <li>We'll inspect each item thoroughly (serial numbers, condition, accessories)</li>
                    <li>You'll receive a final quote via email</li>
                    <li>Accept the final quote and get paid!</li>
                  </ol>
                </div>
                
                <p style="font-size: 13px; color: #666;">
                  <strong>Questions?</strong> Just reply to this email or call us at 072 392 6372.
                </p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                <p><a href="${emailConfig.companyWebsite}" style="color: #0066cc;">${emailConfig.companyWebsite}</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send shipping instructions email:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Shipping instructions email sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending shipping instructions email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send gear received confirmation email to client (Sprint 1)
 */
export async function sendGearReceivedEmail({
  customerName,
  customerEmail,
  itemCount
}: {
  customerName: string
  customerEmail: string
  itemCount: number
}): Promise<EmailResponse> {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send gear received email to:", customerEmail)
    console.log("   Items:", itemCount)
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [customerEmail],
      subject: `✅ We've Received Your Camera Gear - ${emailConfig.companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; }
              .timeline { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .timeline-item { display: flex; align-items: start; margin: 15px 0; }
              .timeline-icon { background-color: #0066cc; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Gear Received!</h1>
                <p>Your shipment has arrived safely</p>
              </div>
              
              <div class="content">
                <h2>Hi ${customerName},</h2>
                
                <div class="success-box">
                  <strong>Good news!</strong> We've safely received your camera equipment (${itemCount} item${itemCount !== 1 ? 's' : ''}).
                </div>
                
                <p>Your gear is now in our secure facility and we'll start the inspection process soon.</p>
                
                <h3>🔍 What Happens Next</h3>
                <div class="timeline">
                  <div class="timeline-item">
                    <div class="timeline-icon">1</div>
                    <div>
                      <strong>Inspection</strong><br>
                      <span style="color: #666;">Our team will carefully inspect each item, verify serial numbers, check condition, and confirm all included accessories.</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item">
                    <div class="timeline-icon">2</div>
                    <div>
                      <strong>Final Quote</strong><br>
                      <span style="color: #666;">You'll receive a final quote via email based on the actual condition and specifications of your gear.</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item">
                    <div class="timeline-icon">3</div>
                    <div>
                      <strong>Your Decision</strong><br>
                      <span style="color: #666;">Review the final quote and choose between buyout or consignment for each item.</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item">
                    <div class="timeline-icon">4</div>
                    <div>
                      <strong>Get Paid</strong><br>
                      <span style="color: #666;">Once you accept and provide your banking details, we'll process your payment.</span>
                    </div>
                  </div>
                </div>
                
                <p style="background-color: #e7f3ff; padding: 15px; border-radius: 5px;">
                  ⏱️ <strong>Estimated Timeline:</strong> We typically complete inspections within 48-72 hours. You'll receive an email as soon as your final quote is ready.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 13px; color: #666;">
                  <strong>Questions or concerns?</strong><br>
                  Feel free to reply to this email or call us at 072 392 6372.<br>
                  We're here to help!
                </p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                <p><a href="${emailConfig.companyWebsite}" style="color: #0066cc;">${emailConfig.companyWebsite}</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send gear received email:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Gear received email sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending gear received email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Send final quote email to client (Sprint 2)
 * Sent after inspection is complete
 */
export async function sendFinalQuoteEmail({
  customerName,
  customerEmail,
  token,
  itemCount,
  inspectionNotes
}: {
  customerName: string
  customerEmail: string
  token: string
  itemCount: number
  inspectionNotes?: string
}): Promise<EmailResponse> {
  if (!process.env.RESEND_API_KEY) {
    console.log("📧 [DEV MODE] Would send final quote email to:", customerEmail)
    console.log("   Token:", token.substring(0, 8) + "...")
    return { success: true }
  }

  try {
    const quoteUrl = `${emailConfig.dashboardUrl}/quote/${token}/select-products`

    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [customerEmail],
      subject: `Your Final Quote from ${emailConfig.companyName} - Ready to Review`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; }
              .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; }
              .info-box { background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 20px; margin: 20px 0; }
              .timeline { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .timeline-item { display: flex; align-items: start; margin: 15px 0; }
              .timeline-icon { background-color: #0066cc; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: bold; }
              .button { display: inline-block; padding: 15px 30px; margin: 20px 0; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Inspection Complete!</h1>
                <p>Your Final Quote is Ready</p>
              </div>
              
              <div class="content">
                <h2>Hi ${customerName},</h2>
                
                <div class="success-box">
                  <strong>Great news!</strong> We've completed the inspection of your camera gear (${itemCount} item${itemCount !== 1 ? 's' : ''}) and your final quote is ready for review.
                </div>
                
                ${inspectionNotes ? `
                  <div class="info-box">
                    <strong>Inspection Notes:</strong><br>
                    ${inspectionNotes}
                  </div>
                ` : ''}
                
                <p>We've carefully inspected each item, verified serial numbers, checked all accessories, and assessed the condition of your gear.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${quoteUrl}" class="button">📋 Open Your Final Quote →</a>
                </div>
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                  Or copy this link: <br>
                  <a href="${quoteUrl}">${quoteUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <h3>🎯 What Happens Next</h3>
                <div class="timeline">
                  <div class="timeline-item">
                    <div class="timeline-icon">1</div>
                    <div>
                      <strong>Review Your Final Quote</strong><br>
                      <span style="color: #666;">See the final buy and consignment prices for each item based on our inspection.</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item">
                    <div class="timeline-icon">2</div>
                    <div>
                      <strong>Choose Buy or Consignment</strong><br>
                      <span style="color: #666;">For each item, decide if you want us to buy it outright or sell it on consignment.</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item">
                    <div class="timeline-icon">3</div>
                    <div>
                      <strong>Provide Your Details</strong><br>
                      <span style="color: #666;">We'll need your personal and banking information to process payment.</span>
                    </div>
                  </div>
                  
                  <div class="timeline-item">
                    <div class="timeline-icon">4</div>
                    <div>
                      <strong>Get Paid</strong><br>
                      <span style="color: #666;">Once everything is confirmed, we'll process your payment!</span>
                    </div>
                  </div>
                </div>
                
                <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                  ⚠️ <strong>Important:</strong> This link will expire in 7 days. Please review and respond at your earliest convenience.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 13px; color: #666;">
                  <strong>Questions?</strong><br>
                  Feel free to reply to this email or call us at 072 392 6372.<br>
                  We're here to help!
                </p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                <p><a href="${emailConfig.companyWebsite}" style="color: #0066cc;">${emailConfig.companyWebsite}</a></p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error("Failed to send final quote email:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Final quote email sent:", data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error("Error sending final quote email:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Test email configuration
 */
export async function sendTestEmail(toEmail: string): Promise<EmailResponse> {
  if (!process.env.RESEND_API_KEY) {
    return { 
      success: false, 
      error: "RESEND_API_KEY not configured. Please add it to your .env.local file." 
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${emailConfig.companyName} <${emailConfig.from}>`,
      to: [toEmail],
      subject: "✅ Test Email from Keysers Dashboard",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center; }
              .success { background-color: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: left; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Email System Test</h1>
              
              <div class="success">
                <strong>Success!</strong> If you're reading this, your email configuration is working correctly.
              </div>
              
              <div class="info">
                <p><strong>Configuration:</strong></p>
                <p>From: ${emailConfig.from}</p>
                <p>Company: ${emailConfig.companyName}</p>
                <p>Dashboard: ${emailConfig.dashboardUrl}</p>
                <p>Sent at: ${new Date().toISOString()}</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is a test email from ${emailConfig.companyName} Dashboard.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
