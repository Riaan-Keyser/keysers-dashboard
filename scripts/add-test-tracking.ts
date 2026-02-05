import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addTestTracking() {
  // Find the most recent pending purchase without tracking
  const purchase = await prisma.pendingPurchase.findFirst({
    where: {
      status: 'PENDING_REVIEW',
      trackingNumber: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (!purchase) {
    console.log('❌ No purchases found without tracking')
    console.log('ℹ️  Create a purchase via bot first')
    return
  }

  console.log(`Found purchase: ${purchase.customerName} (${purchase.id})`)

  // Add test tracking info
  const updated = await prisma.pendingPurchase.update({
    where: { id: purchase.id },
    data: {
      trackingNumber: 'TEST-TRACKING-123456',
      courierCompany: 'The Courier Guy',
      status: 'AWAITING_DELIVERY'
    }
  })

  console.log('✅ Tracking info added!')
  console.log(`   Courier: ${updated.courierCompany}`)
  console.log(`   Tracking: ${updated.trackingNumber}`)
  console.log(`   Status: ${updated.status}`)
  console.log('\n📋 Next steps:')
  console.log('   1. Refresh the Incoming Gear page')
  console.log('   2. Expand the client')
  console.log('   3. You should see tracking info and "Mark as Received" button')
}

addTestTracking()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
