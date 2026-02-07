import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Creating test incoming gear...')

  // Get admin user for creating records
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!adminUser) {
    console.error('❌ No admin user found. Please seed the database first.')
    return
  }

  console.log('✅ Found admin user:', adminUser.name)

  // Get or create vendor/client
  let vendor = await prisma.vendor.findFirst({
    where: { email: 'king.riaan@gmail.com' }
  })

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'Riaan King (Test)',
        email: 'king.riaan@gmail.com',
        phone: '+27 12 345 6789',
        trustScore: 80,
        notes: 'Test vendor for inspection workflow testing',
        createdById: adminUser.id
      }
    })
    console.log('✅ Created vendor:', vendor.name)
  } else {
    console.log('✅ Found existing vendor:', vendor.name)
  }

  // Get 3 products from inventory
  const products = await prisma.product.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' }
  })

  if (products.length === 0) {
    console.error('❌ No products found in inventory. Please add products first.')
    return
  }

  console.log(`📦 Found ${products.length} products:`)
  products.forEach(p => console.log(`   - ${p.name} (${p.brand} ${p.model})`))

  // Create pending purchase
  const purchase = await prisma.pendingPurchase.create({
    data: {
      vendorId: vendor.id,
      customerName: vendor.name,
      customerEmail: vendor.email || '',
      customerPhone: vendor.phone || '+27 12 345 6789',
      status: 'AWAITING_DELIVERY', // Start in AWAITING_DELIVERY so products show before "Received" is clicked
      totalQuoteAmount: products.reduce((sum, p) => sum + Number(p.buyPriceMax), 0)
    }
  })
  console.log('✅ Created purchase:', purchase.id)

  // Create PendingItems (products that show BEFORE gear is received)
  for (const product of products) {
    await prisma.pendingItem.create({
      data: {
        pendingPurchaseId: purchase.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        category: product.productType,
        condition: 'Good',
        description: `${product.brand} ${product.model} - Test item`,
        botEstimatedPrice: Number(product.buyPriceMax),
        status: 'PENDING',
        imageUrls: [] // Add empty array for images
      }
    })
    console.log(`   ✅ Added pending item: ${product.name}`)
  }

  console.log('\n🎉 SUCCESS! Test data created.')
  console.log('\n📋 Next steps:')
  console.log('1. Go to Dashboard → Incoming Gear')
  console.log(`2. Find purchase for: ${vendor.name}`)
  console.log('3. You should see 3 products listed BEFORE clicking "Received"')
  console.log('4. Click "Received" button')
  console.log('5. Click "Start Inspection"')
  console.log('6. Test the "Not interested" and "Mark for repair" features')
  console.log('\n💡 Products are now visible BEFORE gear is received!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
