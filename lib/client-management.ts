import { prisma } from "@/lib/prisma"

interface ClientData {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
}

/**
 * Find or create a client with auto-merge logic
 * Merges by email OR phone if a match is found
 * @param data Client data
 * @returns Client record (existing or new)
 */
export async function findOrCreateClient(data: ClientData) {
  // Search for existing client by email or phone
  const existingClient = await prisma.client.findFirst({
    where: {
      OR: [
        { phone: data.phone },
        data.email ? { email: data.email } : { phone: "IMPOSSIBLE_MATCH" },
      ],
    },
  })

  if (existingClient) {
    console.log(`✅ Found existing client: ${existingClient.id} (${existingClient.firstName} ${existingClient.lastName})`)
    
    // Update email if it was missing and is now provided
    if (!existingClient.email && data.email) {
      await prisma.client.update({
        where: { id: existingClient.id },
        data: { email: data.email },
      })
      console.log(`✅ Updated client email: ${data.email}`)
    }

    return existingClient
  }

  // Create new client
  const client = await prisma.client.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || null,
    },
  })

  console.log(`✅ Created new client: ${client.id} (${client.firstName} ${client.lastName})`)

  return client
}

/**
 * Manually merge two client records
 * All equipment from sourceClient will be moved to targetClient
 * @param sourceClientId Client to merge from (will be deleted)
 * @param targetClientId Client to merge into (will remain)
 * @returns Updated target client
 */
export async function mergeClients(sourceClientId: string, targetClientId: string) {
  // Validate that both clients exist
  const [sourceClient, targetClient] = await Promise.all([
    prisma.client.findUnique({ where: { id: sourceClientId } }),
    prisma.client.findUnique({ where: { id: targetClientId } }),
  ])

  if (!sourceClient || !targetClient) {
    throw new Error("One or both clients not found")
  }

  if (sourceClientId === targetClientId) {
    throw new Error("Cannot merge a client with itself")
  }

  // Move all equipment from source to target
  await prisma.equipment.updateMany({
    where: { clientId: sourceClientId },
    data: { clientId: targetClientId },
  })

  // Mark source client with merge info
  await prisma.client.update({
    where: { id: sourceClientId },
    data: {
      mergedFromVendorId: targetClientId, // Track merge for audit
    },
  })

  // Soft delete source client by updating a flag (or hard delete if preferred)
  // For now, we'll keep the record but mark it as merged
  console.log(`✅ Merged client ${sourceClient.firstName} ${sourceClient.lastName} into ${targetClient.firstName} ${targetClient.lastName}`)

  return targetClient
}

/**
 * Get client with all historical equipment
 * @param clientId Client ID
 * @returns Client with equipment history
 */
export async function getClientWithHistory(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      equipment: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!client) {
    throw new Error("Client not found")
  }

  return client
}

/**
 * List all clients with equipment counts
 * @returns Array of clients with item counts
 */
export async function listClientsWithCounts() {
  const clients = await prisma.client.findMany({
    where: {
      mergedFromVendorId: null, // Exclude merged clients
    },
    include: {
      equipment: {
        select: {
          id: true,
          acquisitionType: true,
          status: true,
          createdAt: true,
          purchasePrice: true,
          sellingPrice: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Calculate stats for each client
  return clients.map(client => ({
    ...client,
    itemCount: client.equipment.length,
    buyItemsCount: client.equipment.filter(e => e.acquisitionType === "PURCHASED_OUTRIGHT").length,
    consignmentItemsCount: client.equipment.filter(e => e.acquisitionType === "CONSIGNMENT").length,
    totalPaid: client.equipment
      .filter(e => e.acquisitionType === "PURCHASED_OUTRIGHT")
      .reduce((sum, e) => sum + (e.purchasePrice ? Number(e.purchasePrice) : 0), 0),
  }))
}
