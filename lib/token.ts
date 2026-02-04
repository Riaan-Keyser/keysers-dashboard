import crypto from "crypto"
import { prisma } from "@/lib/prisma"

/**
 * Generate a secure random token for quote confirmation
 */
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Generate token expiry date (7 days from now)
 */
export function getTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  return expiry
}

/**
 * Validate quote confirmation token
 * Returns purchase if valid, null if invalid/expired
 */
export async function validateQuoteToken(token: string) {
  if (!token) return null
  
  const purchase = await prisma.pendingPurchase.findUnique({
    where: { quoteConfirmationToken: token },
    include: {
      items: true,
      clientDetails: true
    }
  })
  
  if (!purchase) return null
  
  // Check if token is expired
  if (purchase.quoteTokenExpiresAt && purchase.quoteTokenExpiresAt < new Date()) {
    return null
  }
  
  // Check if already accepted/declined
  if (purchase.clientAcceptedAt || purchase.clientDeclinedAt) {
    return { ...purchase, alreadyResponded: true } as any
  }
  
  return purchase
}

/**
 * Invalidate token after use (one-time use)
 */
export async function invalidateToken(purchaseId: string) {
  await prisma.pendingPurchase.update({
    where: { id: purchaseId },
    data: { 
      quoteConfirmationToken: null,
      quoteTokenExpiresAt: null
    }
  })
}
