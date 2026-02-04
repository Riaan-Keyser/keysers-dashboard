import { NextRequest, NextResponse } from "next/server"
import { validateQuoteToken, invalidateToken } from "@/lib/token"
import { prisma } from "@/lib/prisma"
import { validateSAIdNumber, extractDOBFromIdNumber } from "@/lib/validators"
import { sendAwaitingPaymentEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate token
    const purchase = await validateQuoteToken(token)

    if (!purchase) {
      return NextResponse.json({ 
        error: "Invalid or expired quote link" 
      }, { status: 404 })
    }

    // Check if client accepted quote
    if (!purchase.clientAcceptedAt) {
      return NextResponse.json({
        error: "Please accept the quote first"
      }, { status: 400 })
    }

    // Check if details already submitted
    if (purchase.clientDetails) {
      return NextResponse.json({
        error: "Details already submitted"
      }, { status: 400 })
    }

    // Validate required fields
    const requiredFields = ["fullName", "surname", "idNumber", "email", "phone", "physicalAddress"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Validate SA ID number
    if (!validateSAIdNumber(body.idNumber)) {
      return NextResponse.json({ 
        error: "Invalid South African ID number" 
      }, { status: 400 })
    }

    // Extract date of birth from ID number
    const dateOfBirth = extractDOBFromIdNumber(body.idNumber)

    // Create client details
    const clientDetails = await prisma.clientDetails.create({
      data: {
        pendingPurchaseId: purchase.id,
        fullName: body.fullName,
        surname: body.surname,
        idNumber: body.idNumber,
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

    // Update purchase status to AWAITING_PAYMENT
    await prisma.pendingPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "AWAITING_PAYMENT"
      }
    })

    // Invalidate token (one-time use)
    await invalidateToken(purchase.id)

    // Send notification to admin
    await sendAwaitingPaymentEmail({
      customerName: `${body.fullName} ${body.surname}`,
      customerEmail: body.email,
      totalAmount: purchase.totalQuoteAmount,
      purchaseId: purchase.id,
      adminEmail: "admin@keysers.co.za"
    })

    return NextResponse.json({
      success: true,
      message: "Details submitted successfully. You will be contacted shortly regarding payment."
    }, { status: 200 })

  } catch (error: any) {
    console.error("POST /api/quote-confirmation/[token]/submit-details error:", error)
    return NextResponse.json({ 
      error: "Failed to submit details" 
    }, { status: 500 })
  }
}
