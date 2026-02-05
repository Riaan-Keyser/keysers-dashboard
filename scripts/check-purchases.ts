import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPurchases() {
  const purchases = await prisma.pendingPurchase.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    select: {
      id: true,
      customerName: true,
      status: true,
      trackingNumber: true,
      gearReceivedAt: true,
      createdAt: true
    }
  })

  console.log('\n📊 Last 10 Purchases:\n')
  console.log('Status'.padEnd(25), '| Customer'.padEnd(25), '| Tracking', '| Received')
  console.log('-'.repeat(90))

  purchases.forEach(p => {
    const status = p.status.padEnd(24)
    const name = p.customerName.padEnd(24)
    const tracking = p.trackingNumber ? '✓' : '✗'
    const received = p.gearReceivedAt ? '✓' : '✗'
    console.log(status, '|', name, '|', tracking.padEnd(8), '|', received)
  })

  console.log('\n📈 Status Breakdown:\n')
  const statusCounts = await prisma.pendingPurchase.groupBy({
    by: ['status'],
    _count: true
  })

  statusCounts.forEach(s => {
    console.log(`  ${s.status}: ${s._count} purchase(s)`)
  })

  console.log('\n✅ All purchases should be visible in Incoming Gear dashboard')
  console.log('   If not, check the status filter dropdown\n')
}

checkPurchases()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
