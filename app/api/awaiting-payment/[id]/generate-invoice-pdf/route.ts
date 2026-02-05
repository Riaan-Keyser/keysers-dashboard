import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Fetch purchase with all details
    const purchase = await prisma.pendingPurchase.findUnique({
      where: { id },
      include: {
        clientDetails: true,
        inspectionSession: {
          include: {
            incomingItems: {
              include: {
                verifiedItem: {
                  include: {
                    pricingSnapshot: {
                      select: {
                        finalBuyPrice: true,
                        finalConsignPrice: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!purchase || !purchase.clientDetails) {
      return NextResponse.json({ error: "Purchase or client details not found" }, { status: 404 })
    }

    const clientDetails = purchase.clientDetails
    
    // Get all items (both buy and consignment for complete invoice)
    const allItems = purchase.inspectionSession?.incomingItems || []
    const buyItems = allItems.filter(item => item.clientSelection === "BUY")
    const consignItems = allItems.filter(item => item.clientSelection === "CONSIGNMENT")

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const page = pdfDoc.addPage([595, 842]) // A4 size
    const { width, height } = page.getSize()
    
    let y = height - 50

    // Helper function to add text
    const addText = (text: string, size: number, isBold: boolean = false, xPos: number = 50) => {
      page.drawText(text, {
        x: xPos,
        y,
        size,
        font: isBold ? boldFont : font,
        color: rgb(0, 0, 0)
      })
      y -= size + 8
    }

    // Header
    addText("KEYSERS CAMERA EQUIPMENT", 20, true, 180)
    addText("PAYMENT INVOICE", 16, true, 220)
    addText("P.O. Box 459, Brackenfell, Cape Town, 7560", 10, false, 150)
    addText("Reg. No. 2007/200275/23 | VAT No. 4450277977", 10, false, 150)
    y -= 20

    // Invoice Details
    addText(`Invoice Date: ${new Date().toLocaleDateString()}`, 11, false, 50)
    addText(`Invoice No: INV-${purchase.id.substring(0, 8).toUpperCase()}`, 11, false, 50)
    y -= 10

    // Client Information
    addText("PAYMENT TO:", 14, true)
    addText(`${clientDetails.fullName} ${clientDetails.surname}`, 11)
    addText(`ID/Passport: ${clientDetails.idNumber || clientDetails.passportNumber || "N/A"}`, 11)
    addText(`Email: ${clientDetails.email}`, 11)
    addText(`Phone: ${clientDetails.phone}`, 11)
    y -= 15

    // Banking Details
    addText("BANKING DETAILS FOR PAYMENT:", 14, true)
    addText(`Bank: ${clientDetails.bankName}`, 11)
    addText(`Account Type: ${clientDetails.accountType}`, 11)
    addText(`Account Number: ${clientDetails.accountNumber}`, 11)
    addText(`Branch Code: ${clientDetails.branchCode}`, 11)
    addText(`Account Holder: ${clientDetails.accountHolderName}`, 11)
    y -= 20

    // Buy Items (Instant Payment)
    if (buyItems.length > 0) {
      addText("INSTANT PAYMENT ITEMS (Buy)", 14, true)
      y -= 5

      let buyTotal = 0
      buyItems.forEach((item, index) => {
        const price = item.verifiedItem?.pricingSnapshot?.finalBuyPrice 
          ? parseFloat(item.verifiedItem.pricingSnapshot.finalBuyPrice.toString())
          : 0
        buyTotal += price

        addText(`${index + 1}. ${item.clientName} ${item.clientBrand || ''} ${item.clientModel || ''}`, 10)
        addText(`   Buy Price: R${price.toLocaleString()}`, 10, false, 70)
        y -= 3
      })

      y -= 10
      addText(`INSTANT PAYMENT TOTAL: R${buyTotal.toLocaleString()}`, 12, true, 50)
      y -= 20
    }

    // Consignment Items (For Information)
    if (consignItems.length > 0) {
      addText("CONSIGNMENT ITEMS (Paid on Sale)", 14, true)
      y -= 5

      consignItems.forEach((item, index) => {
        const price = item.verifiedItem?.pricingSnapshot?.finalConsignPrice 
          ? parseFloat(item.verifiedItem.pricingSnapshot.finalConsignPrice.toString())
          : 0

        addText(`${index + 1}. ${item.clientName} ${item.clientBrand || ''} ${item.clientModel || ''}`, 10)
        addText(`   Consignment Price: R${price.toLocaleString()} (paid when sold)`, 10, false, 70)
        y -= 3
      })
      y -= 20
    }

    // Payment Terms
    addText("PAYMENT TERMS:", 14, true)
    addText("• Payment will be made via direct bank transfer (EFT)", 10)
    addText("• Payment will be processed within 48 hours of marking as paid", 10)
    addText("• For consignment items, payment will be made when items are sold", 10)
    addText("• Please ensure banking details are correct", 10)
    y -= 20

    // Signature Section
    addText("APPROVED BY:", 14, true)
    y -= 10
    addText("Keysers Representative: ___________________  Date: ______________", 10)

    // Footer
    page.drawText(`Document generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    })

    page.drawText(`Generated by: ${session.user.name}`, {
      x: 50,
      y: 20,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    })

    const pdfBytes = await pdfDoc.save()

    // Return PDF
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${purchase.customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error: any) {
    console.error("Error generating invoice PDF:", error)
    return NextResponse.json({ 
      error: "Failed to generate invoice PDF",
      details: error.message 
    }, { status: 500 })
  }
}
