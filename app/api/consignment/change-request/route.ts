import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { generateConfirmationToken, getTokenExpiry } from "@/lib/token"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/consignment/change-request - Create change request for payout/end date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { equipmentId, proposedPayout, proposedEndDate, adminId, adminPassword } = body

    // Validation
    if (!equipmentId) {
      return NextResponse.json(
        { error: "Equipment ID required" },
        { status: 400 }
      )
    }

    // Get equipment
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        client: true,
      },
    })

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 })
    }

    if (equipment.acquisitionType !== "CONSIGNMENT") {
      return NextResponse.json(
        { error: "Equipment is not a consignment item" },
        { status: 400 }
      )
    }

    // Admin approval required
    if (!adminId || !adminPassword) {
      return NextResponse.json(
        { error: "Admin approval required" },
        { status: 400 }
      )
    }

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Invalid admin" }, { status: 403 })
    }

    const passwordValid = await bcrypt.compare(adminPassword, admin.password)
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 403 })
    }

    // Generate confirmation token
    const token = generateConfirmationToken()

    // Create change request
    const changeRequest = await prisma.consignmentChangeRequest.create({
      data: {
        equipmentId,
        currentPayout: equipment.purchasePrice,
        currentEndDate: null, // TODO: Add consignment end date to Equipment model
        proposedPayout: proposedPayout ? parseFloat(proposedPayout) : null,
        proposedEndDate: proposedEndDate ? new Date(proposedEndDate) : null,
        initiatedByUserId: session.user.id,
        adminApprovedById: admin.id,
        adminApprovedAt: new Date(),
        clientConfirmationToken: token,
        status: "PENDING_CLIENT",
      },
    })

    // Send email to client (if client exists and has email)
    if (equipment.client?.email && process.env.RESEND_API_KEY) {
      const reviewUrl = `${process.env.NEXTAUTH_URL}/consignment-review/${token}`
      
      await resend.emails.send({
        from: `Keysers Camera Equipment <${process.env.FROM_EMAIL || "noreply@keysers.co.za"}>`,
        to: [equipment.client.email],
        subject: "Consignment Terms Update - Your Review Required",
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0066cc;">Consignment Terms Update</h1>
                
                <p>Hi ${equipment.client.firstName},</p>
                
                <p>We'd like to propose an update to the consignment terms for your item:</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #0066cc;">
                  <h3 style="margin-top: 0;">${equipment.name}</h3>
                  <p><strong>SKU:</strong> ${equipment.sku}</p>
                  
                  ${proposedPayout ? `
                    <div style="margin: 15px 0;">
                      <p style="margin: 5px 0;"><strong>Current Payout:</strong> R${Number(equipment.purchasePrice || 0).toLocaleString()}</p>
                      <p style="margin: 5px 0;"><strong>Proposed Payout:</strong> R${Number(proposedPayout).toLocaleString()}</p>
                    </div>
                  ` : ''}
                  
                  ${proposedEndDate ? `
                    <div style="margin: 15px 0;">
                      <p style="margin: 5px 0;"><strong>Proposed End Date:</strong> ${new Date(proposedEndDate).toLocaleDateString()}</p>
                    </div>
                  ` : ''}
                </div>
                
                <p><strong>Please review and confirm these changes:</strong></p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${reviewUrl}" style="display: inline-block; padding: 15px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Review Changes
                  </a>
                </div>
                
                <p style="font-size: 13px; color: #666;">
                  Note: You may accept the proposed terms or request a lower payout amount. This link is valid for 7 days.
                </p>
                
                <p style="font-size: 13px; color: #666;">
                  Questions? Reply to this email or call us at 072 392 6372.
                </p>
              </div>
            </body>
          </html>
        `
      })

      console.log(`✅ Consignment change request email sent to ${equipment.client.email}`)
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED_CONSIGNMENT_CHANGE_REQUEST",
        entityType: "EQUIPMENT",
        entityId: equipment.id,
        details: JSON.stringify({
          sku: equipment.sku,
          proposedPayout,
          proposedEndDate,
          approvedBy: admin.name,
        }),
      },
    })

    console.log(`✅ Consignment change request created for ${equipment.sku}`)

    return NextResponse.json({
      success: true,
      changeRequest: {
        ...changeRequest,
        currentPayout: changeRequest.currentPayout ? Number(changeRequest.currentPayout) : null,
        proposedPayout: changeRequest.proposedPayout ? Number(changeRequest.proposedPayout) : null,
      },
    })
  } catch (error) {
    console.error("Failed to create consignment change request:", error)
    return NextResponse.json(
      { error: "Failed to create change request" },
      { status: 500 }
    )
  }
}
