/**
 * Validate South African ID Number
 * Format: YYMMDD SSSS C A Z
 * - YYMMDD: Date of birth
 * - SSSS: Gender and sequence number
 * - C: Citizenship (0 = SA citizen, 1 = permanent resident)
 * - A: Always 8 or 9
 * - Z: Checksum digit
 */
export function validateSAIdNumber(idNumber: string): boolean {
  if (!idNumber || typeof idNumber !== 'string') {
    return false
  }

  // Remove spaces and dashes
  const cleanId = idNumber.replace(/[\s-]/g, '')

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleanId)) {
    return false
  }

  // Validate date of birth (YYMMDD)
  const year = parseInt(cleanId.substring(0, 2), 10)
  const month = parseInt(cleanId.substring(2, 4), 10)
  const day = parseInt(cleanId.substring(4, 6), 10)

  if (month < 1 || month > 12) {
    return false
  }

  if (day < 1 || day > 31) {
    return false
  }

  // Validate checksum using Luhn algorithm
  let sum = 0
  let alternate = false

  for (let i = cleanId.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanId.charAt(i), 10)

    if (alternate) {
      digit *= 2
      if (digit > 9) {
        digit = digit - 9
      }
    }

    sum += digit
    alternate = !alternate
  }

  return sum % 10 === 0
}

/**
 * Extract date of birth from SA ID number
 */
export function extractDOBFromIdNumber(idNumber: string): Date | null {
  if (!validateSAIdNumber(idNumber)) {
    return null
  }

  const cleanId = idNumber.replace(/[\s-]/g, '')
  
  let year = parseInt(cleanId.substring(0, 2), 10)
  const month = parseInt(cleanId.substring(2, 4), 10)
  const day = parseInt(cleanId.substring(4, 6), 10)

  // Determine century (assume < 30 = 2000s, >= 30 = 1900s)
  const currentYear = new Date().getFullYear() % 100
  year = year <= currentYear ? 2000 + year : 1900 + year

  return new Date(year, month - 1, day)
}

/**
 * Validate South African phone number
 * Accepts: +27821234567, 0821234567, 27821234567
 */
export function validateSAPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }

  // Remove spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-()]/g, '')

  // Check various formats
  const patterns = [
    /^0[0-9]{9}$/, // 0821234567
    /^\+27[0-9]{9}$/, // +27821234567
    /^27[0-9]{9}$/ // 27821234567
  ]

  return patterns.some(pattern => pattern.test(cleanPhone))
}

/**
 * Format phone number to standard SA format: +27 82 123 4567
 */
export function formatSAPhoneNumber(phone: string): string {
  if (!phone) return ''

  const cleanPhone = phone.replace(/[\s\-()]/g, '')

  // Convert to +27 format
  let normalized = cleanPhone
  if (cleanPhone.startsWith('0')) {
    normalized = '27' + cleanPhone.substring(1)
  } else if (cleanPhone.startsWith('+27')) {
    normalized = cleanPhone.substring(1)
  }

  // Format as +27 82 123 4567
  if (normalized.length === 11 && normalized.startsWith('27')) {
    return `+${normalized.substring(0, 2)} ${normalized.substring(2, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`
  }

  return phone // Return original if can't format
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate passport number (basic format check)
 * Most passports are 6-9 alphanumeric characters
 */
export function validatePassportNumber(passportNumber: string): boolean {
  if (!passportNumber || typeof passportNumber !== 'string') {
    return false
  }

  const cleaned = passportNumber.replace(/[\s-]/g, '')
  
  // Basic check: 6-9 alphanumeric characters
  return /^[A-Z0-9]{6,9}$/i.test(cleaned)
}

/**
 * Validate international phone number
 * Accepts E.164 format: +[country code][number]
 */
export function validateInternationalPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }

  const cleaned = phone.replace(/[\s\-()]/g, '')
  
  // E.164 format: +[1-3 digit country code][4-14 digits]
  // Examples: +1234567890, +447123456789, +861234567890
  return /^\+[1-9]\d{1,2}\d{4,14}$/.test(cleaned)
}

/**
 * Smart validation: SA ID OR Passport
 */
export function validateClientIdentity(data: {
  idNumber?: string
  passportNumber?: string
}): { valid: boolean; error?: string } {
  
  // Must have at least one form of ID
  if (!data.idNumber && !data.passportNumber) {
    return {
      valid: false,
      error: "Please provide either a South African ID number or passport number"
    }
  }

  // If SA ID provided, validate it
  if (data.idNumber) {
    if (!validateSAIdNumber(data.idNumber)) {
      return {
        valid: false,
        error: "Invalid South African ID number"
      }
    }
  }

  // If passport provided, validate it
  if (data.passportNumber) {
    if (!validatePassportNumber(data.passportNumber)) {
      return {
        valid: false,
        error: "Invalid passport number (must be 6-9 alphanumeric characters)"
      }
    }
  }

  return { valid: true }
}

/**
 * Smart phone validation: SA or International
 */
export function validatePhoneNumber(phone: string): boolean {
  // Try SA format first
  if (validateSAPhoneNumber(phone)) {
    return true
  }
  
  // Fall back to international format
  return validateInternationalPhoneNumber(phone)
}
