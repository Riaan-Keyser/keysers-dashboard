import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken, invalidateToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"
import { validateClientIdentity, validatePhoneNumber, extractDOBFromIdNumber } from "@/lib/validators"
import { sendAwaitingPaymentEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    console.log("📝 Submit details - Token:", token.substring(0, 20) + "...")
    console.log("📝 Body keys:", Object.keys(body))

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      console.log("❌ Token validation failed")
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    console.log("✅ Purchase found:", purchase.id, "Status:", purchase.status)

    // Check if details already submitted
    // Note: clientAcceptedAt will be set when submitting this form (new flow)
    if (purchase.clientDetails) {
      console.log("❌ Details already submitted")
      return NextResponse.json({
        error: "Details already submitted"
      }, { status: 400 })
    }

    // Validate required fields (relaxed for international clients)
    const requiredFields = ["fullName", "surname", "email", "phone", "physicalAddress"]
    for (const field of requiredFields) {
      if (!body[field]) {
        console.log(`❌ Missing field: ${field}`)
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    console.log("✅ All required fields present")

    // Validate identity (SA ID OR Passport)
    const identityValidation = validateClientIdentity({
      idNumber: body.idNumber,
      passportNumber: body.passportNumber
    })

    if (!identityValidation.valid) {
      console.log(`❌ Identity validation failed: ${identityValidation.error}`)
      return NextResponse.json({ 
        error: identityValidation.error 
      }, { status: 400 })
    }

    console.log("✅ Identity validated")

    // Validate phone number (SA or international)
    if (!validatePhoneNumber(body.phone)) {
      console.log(`❌ Phone validation failed: ${body.phone}`)
      return NextResponse.json({ 
        error: "Invalid phone number format" 
      }, { status: 400 })
    }

    console.log("✅ Phone validated")

    // Extract date of birth (from SA ID or manual entry)
    const dateOfBirth = body.idNumber 
      ? extractDOBFromIdNumber(body.idNumber) 
      : body.dateOfBirth 
        ? new Date(body.dateOfBirth) 
        : null

    console.log("💾 Creating client details record...")

    // Create client details
    const clientDetails = await prisma.clientDetails.create({
      data: {
        pendingPurchaseId: purchase.id,
        fullName: body.fullName,
        surname: body.surname,
        idNumber: body.idNumber || null,
        passportNumber: body.passportNumber || null,
        passportCountry: body.passportCountry || null,
        nationality: body.nationality || null,
        email: body.email,
        phone: body.phone,
        dateOfBirth: dateOfBirth || undefined,
        physicalAddress: body.physicalAddress,
        physicalStreet: body.physicalStreet,
        physicalCity: body.physicalCity,
        physicalProvince: body.physicalProvince,
        physicalPostalCode: body.physicalPostalCode,
        postalAddress: body.postalAddress,
        postalCity: body.postalCity,
        postalProvince: body.postalProvince,
        postalPostalCode: body.postalPostalCode,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountType: body.accountType,
        branchCode: body.branchCode,
        accountHolderName: body.accountHolderName,
        proofOfIdUrl: body.proofOfIdUrl, // URL from file upload
        proofOfAddressUrl: body.proofOfAddressUrl,
        bankConfirmationUrl: body.bankConfirmationUrl,
        ipAddress: request.headers.get("x-forwarded-for") || request.ip,
        userAgent: request.headers.get("user-agent")
      }
    })

    console.log("✅ Client details created:", clientDetails.id)

    // Handle product selections (Buy vs Consignment)
    if (body.productSelections) {
      console.log("💾 Saving product selections...")
      const selections = body.productSelections as Record<string, "BUY" | "CONSIGNMENT">
      
      // Update each incoming item with the selection
      for (const [itemId, selection] of Object.entries(selections)) {
        await prisma.incomingGearItem.update({
          where: { id: itemId },
          data: {
            clientSelection: selection // Store whether client chose BUY or CONSIGNMENT
          }
        })
      }
      console.log(`✅ ${Object.keys(selections).length} product selections saved`)
    }

    // Update purchase status to AWAITING_PAYMENT and mark as accepted
    console.log("💾 Updating purchase status to AWAITING_PAYMENT...")
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "AWAITING_PAYMENT",
        clientAcceptedAt: new Date() // Mark as accepted when submitting details (new flow)
      }
    })
    console.log("✅ Purchase status updated")

    // Invalidate token (one-time use)
    console.log("🔒 Invalidating token...")
    await invalidateToken(purchase.id)
    console.log("✅ Token invalidated")

    // Send notification to admin
    console.log("📧 Sending admin notification...")
    await sendAwaitingPaymentEmail({
      customerName: `${body.fullName} ${body.surname}`,
      customerEmail: body.email,
      totalAmount: purchase.totalQuoteAmount,
      purchaseId: purchase.id,
      adminEmail: "admin@keysers.co.za"
    })
    console.log("✅ Admin notification sent")

    console.log("🎉 Submission complete!")

    return NextResponse.json({
      success: true,
      message: "Details submitted successfully. You will be contacted shortly regarding payment."
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ POST /api/quote-confirmation/[token]/submit-details error:", error)
    console.error("   Error name:", error.name)
    console.error("   Error message:", error.message)
    
    // Return a more specific error message
    const errorMessage = error.message || "Failed to submit details"
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 })
  }
}
