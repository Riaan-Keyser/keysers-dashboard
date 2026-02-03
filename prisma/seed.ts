import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@keysers.co.za' },
    update: {},
    create: {
      email: 'admin@keysers.co.za',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  })

  console.log('Created admin user:', admin.email)

  // Create a sample vendor
  const vendor = await prisma.vendor.create({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+27 82 123 4567',
      trustScore: 75,
      createdById: admin.id,
    },
  })

  console.log('Created sample vendor:', vendor.name)

  // Create sample equipment
  const equipment = await prisma.equipment.create({
    data: {
      sku: 'KEQ-000001',
      name: 'Canon EOS R5',
      brand: 'Canon',
      model: 'EOS R5',
      category: 'CAMERA_BODY',
      condition: 'EXCELLENT',
      description: 'Professional mirrorless camera in excellent condition',
      serialNumber: 'ABC123456',
      acquisitionType: 'PURCHASED_OUTRIGHT',
      vendorId: vendor.id,
      sellingPrice: 45000,
      costPrice: 35000,
      status: 'READY_FOR_SALE',
      createdById: admin.id,
    },
  })

  console.log('Created sample equipment:', equipment.name)

  // Create another equipment item on consignment
  const consignmentEquipment = await prisma.equipment.create({
    data: {
      sku: 'KEQ-000002',
      name: 'Sony A7 IV',
      brand: 'Sony',
      model: 'A7 IV',
      category: 'CAMERA_BODY',
      condition: 'MINT',
      description: 'Brand new Sony A7 IV on consignment',
      serialNumber: 'XYZ789012',
      acquisitionType: 'CONSIGNMENT',
      vendorId: vendor.id,
      sellingPrice: 38000,
      consignmentRate: 70, // Vendor gets 70%
      status: 'READY_FOR_SALE',
      createdById: admin.id,
    },
  })

  console.log('Created consignment equipment:', consignmentEquipment.name)

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
