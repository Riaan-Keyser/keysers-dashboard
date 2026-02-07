import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const emailConfig = {
  companyName: "Keysers Camera Equipment",
  from: process.env.FROM_EMAIL || "noreply@keysers.co.za",
  dashboardUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
}

// POST /api/cron/tracking-reminders - Daily cron job to send reminders
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔔 Running tracking reminders cron job...")

    // Find bookings that need reminders:
    // - Courier method
    // - No tracking number
    // - Created more than 1 day ago
    // - Less than 7 reminders sent
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const bookingsNeedingReminders = await prisma.deliveryBooking.findMany({
      where: {
        deliveryMethod: "COURIER",
        trackingNumber: null,
        createdAt: {
          lt: oneDayAgo,
        },
        remindersSent: {
          lt: 7,
        },
        flaggedForFollowUp: false,
      },
      include: {
        purchases: {
          select: {
            id: true,
            customerName: true,
            customerEmail: true,
            quoteConfirmationToken: true,
          },
        },
      },
    })

    console.log(`Found ${bookingsNeedingReminders.length} bookings needing reminders`)

    let remindersSent = 0
    let bookingsFlagged = 0

    for (const booking of bookingsNeedingReminders) {
      const purchase = booking.purchases[0]
      if (!purchase || !purchase.customerEmail) {
        continue
      }

      // Check if this is the 7th reminder - flag for follow-up instead of sending
      if (booking.remindersSent >= 6) {
        // Flag for manual follow-up
        await prisma.deliveryBooking.update({
          where: { id: booking.id },
          data: {
            flaggedForFollowUp: true,
            lastReminderAt: new Date(),
          },
        })
        bookingsFlagged++
        console.log(`📌 Flagged booking ${booking.id} for manual follow-up`)
        continue
      }

      // Send reminder email
      try {
        if (process.env.RESEND_API_KEY) {
          const trackingUrl = `${emailConfig.dashboardUrl}/quote/${purchase.quoteConfirmationToken}/delivery`

          await resend.emails.send({
            from: `${emailConfig.companyName} <${emailConfig.from}>`,
            to: [purchase.customerEmail],
            subject: `Reminder: Add Tracking Number for Your Shipment | ${emailConfig.companyName}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 30px; }
                    .button { display: inline-block; padding: 15px 30px; margin: 20px 0; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>📦 Tracking Number Reminder</h1>
                    </div>
                    
                    <div class="content">
                      <h2>Hi ${purchase.customerName},</h2>
                      <p>We noticed you've chosen to courier your gear to us, but we haven't received your tracking number yet.</p>
                      
                      <p>Please provide your tracking number so we can monitor your shipment and notify you when it arrives.</p>
                      
                      <div style="text-align: center;">
                        <a href="${trackingUrl}" class="button">Add Tracking Number →</a>
                      </div>
                      
                      <p style="font-size: 13px; color: #666;">
                        <strong>Questions?</strong> Just reply to this email or call us at 072 392 6372.
                      </p>
                    </div>
                    
                    <div class="footer">
                      <p>&copy; ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          })

          // Update reminder count
          await prisma.deliveryBooking.update({
            where: { id: booking.id },
            data: {
              remindersSent: booking.remindersSent + 1,
              lastReminderAt: new Date(),
            },
          })

          remindersSent++
          console.log(`✅ Sent reminder ${booking.remindersSent + 1}/7 to ${purchase.customerEmail}`)
        } else {
          console.log(`📧 [DEV MODE] Would send reminder to ${purchase.customerEmail}`)
        }
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      bookingsFlagged,
      totalProcessed: bookingsNeedingReminders.length,
    })
  } catch (error) {
    console.error("Failed to run tracking reminders cron:", error)
    return NextResponse.json(
      { error: "Failed to run tracking reminders" },
      { status: 500 }
    )
  }
}

// GET - Allow manual trigger for testing
export async function GET(request: NextRequest) {
  return POST(request)
}
