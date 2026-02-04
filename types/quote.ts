import { ClientDetails, PendingPurchase, PendingItem } from "@prisma/client"

export type PurchaseWithDetails = PendingPurchase & {
  items: PendingItem[]
  clientDetails?: ClientDetails | null
}

export type ClientDetailsFormData = {
  // Personal Info
  fullName: string
  surname: string
  idNumber: string
  email: string
  phone: string
  dateOfBirth?: string
  
  // Address
  physicalAddress: string
  physicalStreet?: string
  physicalCity?: string
  physicalProvince?: string
  physicalPostalCode?: string
  
  postalAddress?: string
  postalCity?: string
  postalProvince?: string
  postalPostalCode?: string
  
  // Banking (optional)
  bankName?: string
  accountNumber?: string
  accountType?: string
  branchCode?: string
  accountHolderName?: string
  
  // Files
  proofOfIdFile?: File
  proofOfAddressFile?: File
  bankConfirmationFile?: File
}

export type QuoteConfirmationResponse = {
  success: boolean
  token?: string
  message: string
  expiresAt?: string
}

export type QuoteDeclineReason = 
  | "PRICE_TOO_LOW"
  | "CHANGED_MIND"
  | "FOUND_ALTERNATIVE"
  | "OTHER"

export type ClientDetailsSubmission = {
  pendingPurchaseId: string
  token: string
  clientDetails: ClientDetailsFormData
}
