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
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || "consignment" // "consignment" or "purchase"

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
    
    // Filter items based on type
    const items = purchase.inspectionSession?.incomingItems.filter(item => {
      if (type === "consignment") {
        return item.clientSelection === "CONSIGNMENT"
      } else {
        return item.clientSelection === "BUY"
      }
    }) || []

    if (items.length === 0) {
      return NextResponse.json({ 
        error: `No ${type} items found for this purchase` 
      }, { status: 404 })
    }

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
    addText("KEYSERS CAMERA EQUIPMENT", 20, true, 200)
    addText("P.O. Box 459, Brackenfell, Cape Town, 7560", 10, false, 150)
    addText("Reg. No. 2007/200275/23 | VAT No. 4450277977", 10, false, 150)
    y -= 20

    if (type === "consignment") {
      addText("CONSIGNMENT AGREEMENT", 18, true, 200)
    } else {
      addText("SUPPLIER'S INVOICE - PURCHASE AGREEMENT", 18, true, 120)
    }
    
    y -= 20

    // Client Information
    addText("CLIENT INFORMATION", 14, true)
    addText(`Name: ${clientDetails.fullName} ${clientDetails.surname}`, 11)
    addText(`ID/Passport: ${clientDetails.idNumber || clientDetails.passportNumber || "N/A"}`, 11)
    addText(`Email: ${clientDetails.email}`, 11)
    addText(`Phone: ${clientDetails.phone}`, 11)
    addText(`Address: ${clientDetails.physicalAddress}, ${clientDetails.physicalCity}, ${clientDetails.physicalProvince} ${clientDetails.physicalPostalCode}`, 11)
    
    y -= 20

    // Items List
    addText("EQUIPMENT LIST", 14, true)
    y -= 5

    items.forEach((item, index) => {
      const itemName = item.clientName
      const brand = item.clientBrand || ""
      const model = item.clientModel || ""
      
      let price = 0
      if (type === "consignment") {
        price = item.verifiedItem?.pricingSnapshot?.finalConsignPrice 
          ? parseFloat(item.verifiedItem.pricingSnapshot.finalConsignPrice.toString()) 
          : 0
      } else {
        price = item.verifiedItem?.pricingSnapshot?.finalBuyPrice 
          ? parseFloat(item.verifiedItem.pricingSnapshot.finalBuyPrice.toString()) 
          : 0
      }

      addText(`${index + 1}. ${itemName} ${brand} ${model}`, 11)
      addText(`   ${type === "consignment" ? "Consignment" : "Buy"} Price: R${price.toLocaleString()}`, 11, false, 70)
      y -= 5
    })

    y -= 20

    // Banking Details (for buy purchases)
    if (type === "purchase" && clientDetails.bankName) {
      addText("BANKING DETAILS FOR PAYMENT", 14, true)
      addText(`Bank: ${clientDetails.bankName}`, 11)
      addText(`Account Type: ${clientDetails.accountType}`, 11)
      addText(`Account Number: ${clientDetails.accountNumber}`, 11)
      addText(`Branch Code: ${clientDetails.branchCode}`, 11)
      addText(`Account Holder: ${clientDetails.accountHolderName}`, 11)
      y -= 20
    }

    // Payment Terms
    if (type === "purchase") {
      addText("PAYMENT TERMS", 14, true)
      addText("• Payment will be made via direct bank transfer (EFT)", 10)
      addText("• Payment will be processed within 48 hours of form submission", 10)
      addText("• The Supplier is responsible for ensuring banking details are accurate", 10)
      addText("• Keysers Camera Equipment will not be liable for payments made to", 10)
      addText("  incorrect banking details provided by the Supplier", 10)
    }

    // Signature Section
    y -= 30
    addText("SIGNATURES", 14, true)
    y -= 10
    addText("Client Signature: _________________________  Date: ______________", 11)
    y -= 30
    addText("Keysers Representative: ___________________  Date: ______________", 11)

    // Footer
    page.drawText(`Document generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, {
      x: 50,
      y: 30,
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
        "Content-Disposition": `attachment; filename="${type}-agreement-${purchase.customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error: any) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ 
      error: "Failed to generate PDF",
      details: error.message 
    }, { status: 500 })
  }
}
