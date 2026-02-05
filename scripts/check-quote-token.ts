import { prisma } from "../lib/prisma"

async function checkToken() {
  const token = "c2b0f5ef7e118fc69eab33d718e97e4e033f809afee1cf9cd1882f3f949cbff5"
  
  console.log("🔍 Checking token:", token.substring(0, 20) + "...")
  
  const purchase = await prisma.pendingPurchase.findFirst({
    where: { quoteConfirmationToken: token },
    include: {
      inspectionSession: {
        include: {
          incomingItems: {
            include: {
              verifiedItem: {
                include: {
                  product: true,
                  pricingSnapshot: true,
                  priceOverride: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!purchase) {
    console.log("❌ Purchase not found")
    return
  }

  console.log("✅ Purchase found:", {
    id: purchase.id,
    customerName: purchase.customerName,
    status: purchase.status,
    hasInspectionSession: !!purchase.inspectionSessionId,
    inspectionSessionId: purchase.inspectionSessionId
  })

  if (purchase.inspectionSession) {
    console.log("✅ Inspection Session:", {
      id: purchase.inspectionSession.id,
      sessionName: purchase.inspectionSession.sessionName,
      status: purchase.inspectionSession.status,
      itemCount: purchase.inspectionSession.incomingItems.length
    })

    purchase.inspectionSession.incomingItems.forEach((item, i) => {
      console.log(`\nItem ${i + 1}:`, {
        id: item.id,
        clientName: item.clientName,
        inspectionStatus: item.inspectionStatus,
        hasVerifiedItem: !!item.verifiedItem,
        verifiedItemApproved: item.verifiedItem?.approvedAt ? "Yes" : "No"
      })

      if (item.verifiedItem?.pricingSnapshot) {
        console.log(`  Pricing:`, {
          buyPrice: item.verifiedItem.pricingSnapshot.computedBuyPrice,
          consignPrice: item.verifiedItem.pricingSnapshot.computedConsignPrice
        })
      }
    })
  } else {
    console.log("❌ No inspection session linked!")
  }

  await prisma.$disconnect()
}

checkToken().catch(console.error)
