import crypto from "crypto"

export interface SignatureVerificationResult {
  valid: boolean
  providedSignature: string | null
  computedSignature: string
}

/**
 * HMAC signature verification for webhook requests
 * Expected header format: "sha256=<hex_signature>"
 * 
 * @param rawBody - Raw request body string (NOT parsed JSON)
 * @param signatureHeader - Value from x-webhook-signature header
 * @param secret - WEBHOOK_SECRET from environment
 * @returns Verification result with audit fields
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): SignatureVerificationResult {
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")
  
  // If signature missing, return false safely
  if (!signatureHeader) {
    return {
      valid: false,
      providedSignature: null,
      computedSignature: `sha256=${computedSignature}`
    }
  }
  
  // Extract hex signature from "sha256=<hex>" format
  const providedHex = signatureHeader.startsWith("sha256=") 
    ? signatureHeader.substring(7) 
    : signatureHeader
  
  // If length mismatch, return false safely (no throw)
  if (providedHex.length !== computedSignature.length) {
    return {
      valid: false,
      providedSignature: signatureHeader,
      computedSignature: `sha256=${computedSignature}`
    }
  }
  
  try {
    // Constant-time comparison to prevent timing attacks
    const valid = crypto.timingSafeEqual(
      Buffer.from(providedHex),
      Buffer.from(computedSignature)
    )
    
    return {
      valid,
      providedSignature: signatureHeader,
      computedSignature: `sha256=${computedSignature}`
    }
  } catch {
    // Handle any Buffer conversion errors safely
    return {
      valid: false,
      providedSignature: signatureHeader,
      computedSignature: `sha256=${computedSignature}`
    }
  }
}

/**
 * Generate webhook signature for testing/documentation
 * 
 * @param payload - Request body as string
 * @param secret - WEBHOOK_SECRET
 * @returns Signature in "sha256=<hex>" format
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
  return `sha256=${signature}`
}
