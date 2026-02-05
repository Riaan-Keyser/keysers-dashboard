import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔍 Checking inspection data...\n")

  const sessions = await prisma.inspectionSession.findMany({
    include: {
      incomingItems: true,
      _count: {
        select: { incomingItems: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  })

  console.log(`Found ${sessions.length} inspection sessions:\n`)

  for (const session of sessions) {
    console.log(`📋 Session: ${session.sessionName}`)
    console.log(`   ID: ${session.id}`)
    console.log(`   Status: ${session.status}`)
    console.log(`   Items: ${session._count.incomingItems}`)
    
    if (session.incomingItems.length > 0) {
      console.log(`   Item IDs:`)
      session.incomingItems.forEach((item, idx) => {
        console.log(`     ${idx + 1}. ${item.clientName} (ID: ${item.id})`)
      })
    }
    console.log("")
  }

  const totalItems = await prisma.incomingGearItem.count()
  console.log(`\n📊 Total IncomingGearItems in database: ${totalItems}`)
}

main()
  .catch((e) => {
    console.error("❌ Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
