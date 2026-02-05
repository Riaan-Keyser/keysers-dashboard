import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugIncomingGear() {
  console.log('\n🔍 Debugging Incoming Gear Visibility\n')
  console.log('=' .repeat(60))
  
  // Get all purchases with relevant statuses
  const relevantStatuses = [
    'PENDING_REVIEW',
    'AWAITING_DELIVERY', 
    'INSPECTION_IN_PROGRESS',
    'FINAL_QUOTE_SENT'
  ]
  
  console.log('\n📊 Purchases that SHOULD show in Incoming Gear:\n')
  
  for (const status of relevantStatuses) {
    const purchases = await prisma.pendingPurchase.findMany({
      where: { status },
      select: {
        id: true,
        customerName: true,
        status: true,
        createdAt: true,
        items: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n${status}:`)
    if (purchases.length === 0) {
      console.log('  (none)')
    } else {
      purchases.forEach(p => {
        console.log(`  ✓ ${p.customerName} (${p.items.length} items) - ${p.createdAt.toLocaleString()}`)
      })
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n💡 Troubleshooting:\n')
  console.log('  1. Click the "Refresh" button in top-right of Incoming Gear')
  console.log('  2. Check filter dropdown is set to "All Status"')
  console.log('  3. Open browser console (F12) and check for errors')
  console.log('  4. Try logging out and back in')
  console.log('\n')
}

debugIncomingGear()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
