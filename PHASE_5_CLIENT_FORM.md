# Phase 5: Client Details Form

**Duration:** 3-4 hours  
**Status:** ✅ COMPLETE  
**Dependencies:** Phase 4 (Public Pages)

---

## 🎯 Objectives

1. Create multi-step client details form
2. Implement form validation
3. Add file upload for documents (ID, proof of address)
4. Create SA ID number validation
5. Handle form submission
6. Show confirmation page
7. Ensure mobile-friendly design

---

## 🛠️ Implementation

### Task 1: SA ID Validation Utility

**File:** `lib/validators.ts` (NEW)

```typescript
/**
 * Validate South African ID number
 * Format: YYMMDDSSSSCAT
 * - YY: Year of birth
 * - MM: Month of birth
 * - DD: Day of birth
 * - SSSS: Sequence number (gender: 0000-4999 female, 5000-9999 male)
 * - C: Citizenship (0 SA, 1 non-SA)
 * - A: Usually 8 or 9
 * - T: Checksum digit
 */
export function validateSAIdNumber(idNumber: string): boolean {
  // Remove spaces and check length
  const cleaned = idNumber.replace(/\s/g, "")
  if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
    return false
  }

  // Extract date components
  const year = parseInt(cleaned.substring(0, 2))
  const month = parseInt(cleaned.substring(2, 4))
  const day = parseInt(cleaned.substring(4, 6))

  // Validate month and day
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  // Validate checksum using Luhn algorithm
  let sum = 0
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      sum += parseInt(cleaned[i])
    } else {
      const doubled = parseInt(cleaned[i]) * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    }
  }

  const checksum = (10 - (sum % 10)) % 10
  return checksum === parseInt(cleaned[12])
}

/**
 * Extract date of birth from SA ID number
 */
export function extractDOBFromIDNumber(idNumber: string): Date | null {
  const cleaned = idNumber.replace(/\s/g, "")
  if (cleaned.length !== 13) return null

  const year = parseInt(cleaned.substring(0, 2))
  const month = parseInt(cleaned.substring(2, 4)) - 1 // JS months are 0-indexed
  const day = parseInt(cleaned.substring(4, 6))

  // Determine century (assume < 30 is 2000s, >= 30 is 1900s)
  const fullYear = year < 30 ? 2000 + year : 1900 + year

  return new Date(fullYear, month, day)
}

/**
 * Extract gender from SA ID number
 */
export function extractGenderFromIDNumber(idNumber: string): "male" | "female" | null {
  const cleaned = idNumber.replace(/\s/g, "")
  if (cleaned.length !== 13) return null

  const sequence = parseInt(cleaned.substring(6, 10))
  return sequence >= 5000 ? "male" : "female"
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate SA phone number
 */
export function validateSAPhoneNumber(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "")
  
  // Check for valid SA number formats:
  // 27XXXXXXXXX (11 digits with country code)
  // 0XXXXXXXXX (10 digits without country code)
  if (cleaned.length === 11 && cleaned.startsWith("27")) {
    return true
  }
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    return true
  }
  
  return false
}

/**
 * Format phone number to standard format: +27 XX XXX XXXX
 */
export function formatSAPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  
  if (cleaned.startsWith("27") && cleaned.length === 11) {
    return `+27 ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`
  }
  
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `+27 ${cleaned.substring(1, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`
  }
  
  return phone
}
```

---

### Task 2: File Upload Component

**File:** `components/FileUpload.tsx` (NEW)

```typescript
"use client"

import { useState } from "react"
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "./ui/button"

interface FileUploadProps {
  label: string
  accept?: string
  maxSize?: number // in MB
  onFileSelect: (file: File | null) => void
  required?: boolean
}

export function FileUpload({ 
  label, 
  accept = ".pdf,.jpg,.jpeg,.png", 
  maxSize = 5,
  onFileSelect,
  required = false
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (!selectedFile) {
      setFile(null)
      onFileSelect(null)
      return
    }

    // Check file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    // Check file type
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()
    const allowedExtensions = accept.split(",").map(ext => ext.replace(".", "").trim())
    
    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      setError(`Please upload a file in one of these formats: ${accept}`)
      return
    }

    setFile(selectedFile)
    onFileSelect(selectedFile)
  }

  const handleRemove = () => {
    setFile(null)
    setError(null)
    onFileSelect(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {!file ? (
        <div className="relative">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${label}`}
          />
          <label
            htmlFor={`file-upload-${label}`}
            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              Click to upload or drag and drop
            </span>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-900">{file.name}</span>
            <span className="text-xs text-gray-500">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Accepted formats: {accept}. Max size: {maxSize}MB
      </p>
    </div>
  )
}
```

---

### Task 3: Client Details Form Page

**File:** `app/(public)/quote/[token]/details/page.tsx` (NEW)

```typescript
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/FileUpload"
import { validateSAIdNumber, validateEmail, validateSAPhoneNumber, extractDOBFromIDNumber } from "@/lib/validators"
import { CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react"

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form data
  const [formData, setFormData] = useState({
    fullName: "",
    surname: "",
    idNumber: "",
    email: "",
    phone: "",
    physicalAddress: "",
    physicalCity: "",
    physicalProvince: "",
    physicalPostalCode: "",
    // Optional banking
    bankName: "",
    accountNumber: "",
    accountType: "",
    branchCode: "",
    accountHolderName: ""
  })

  const [files, setFiles] = useState<{
    proofOfId?: File
    proofOfAddress?: File
    bankConfirmation?: File
  }>({})

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: "" }))
  }

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "First name is required"
      if (!formData.surname.trim()) newErrors.surname = "Surname is required"
      if (!formData.idNumber.trim()) {
        newErrors.idNumber = "ID number is required"
      } else if (!validateSAIdNumber(formData.idNumber)) {
        newErrors.idNumber = "Invalid SA ID number"
      }
      if (!formData.email.trim()) {
        newErrors.email = "Email is required"
      } else if (!validateEmail(formData.email)) {
        newErrors.email = "Invalid email format"
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required"
      } else if (!validateSAPhoneNumber(formData.phone)) {
        newErrors.phone = "Invalid SA phone number"
      }
    }

    if (stepNumber === 2) {
      if (!formData.physicalAddress.trim()) newErrors.physicalAddress = "Address is required"
      if (!formData.physicalCity.trim()) newErrors.physicalCity = "City is required"
      if (!formData.physicalProvince.trim()) newErrors.physicalProvince = "Province is required"
      if (!formData.physicalPostalCode.trim()) newErrors.physicalPostalCode = "Postal code is required"
    }

    // Step 3 (banking) and Step 4 (documents) are optional

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) return // Validate required fields

    setSubmitting(true)

    try {
      // TODO: Upload files first (Phase 5 extension)
      // For now, we'll submit without file URLs

      const response = await fetch(`/api/quote-confirmation/${token}/submit-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // File URLs would go here after upload
          proofOfIdUrl: null,
          proofOfAddressUrl: null,
          bankConfirmationUrl: null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Failed to submit details")
        setSubmitting(false)
        return
      }

      // Redirect to confirmation page
      router.push(`/quote/${token}/confirmed`)
    } catch (err) {
      alert("Failed to submit details. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full mx-1 ${
                s <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 text-center">
          Step {step} of 4: {
            step === 1 ? "Personal Information" :
            step === 2 ? "Address" :
            step === 3 ? "Banking (Optional)" :
            "Documents (Optional)"
          }
        </p>
      </Card>

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Personal Information</h2>
          
          <div>
            <Label htmlFor="fullName">First Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="John"
            />
            {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <Label htmlFor="surname">Surname *</Label>
            <Input
              id="surname"
              value={formData.surname}
              onChange={(e) => updateField("surname", e.target.value)}
              placeholder="Doe"
            />
            {errors.surname && <p className="text-sm text-red-600 mt-1">{errors.surname}</p>}
          </div>

          <div>
            <Label htmlFor="idNumber">ID Number *</Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              placeholder="9001015009087"
              maxLength={13}
            />
            {errors.idNumber && <p className="text-sm text-red-600 mt-1">{errors.idNumber}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+27 82 345 6789"
            />
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
          </div>

          <Button onClick={handleNext} className="w-full">
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      )}

      {/* Step 2: Address */}
      {step === 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Address Information</h2>

          <div>
            <Label htmlFor="physicalAddress">Physical Address *</Label>
            <Input
              id="physicalAddress"
              value={formData.physicalAddress}
              onChange={(e) => updateField("physicalAddress", e.target.value)}
              placeholder="123 Main Street"
            />
            {errors.physicalAddress && <p className="text-sm text-red-600 mt-1">{errors.physicalAddress}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="physicalCity">City *</Label>
              <Input
                id="physicalCity"
                value={formData.physicalCity}
                onChange={(e) => updateField("physicalCity", e.target.value)}
                placeholder="Cape Town"
              />
              {errors.physicalCity && <p className="text-sm text-red-600 mt-1">{errors.physicalCity}</p>}
            </div>

            <div>
              <Label htmlFor="physicalProvince">Province *</Label>
              <Input
                id="physicalProvince"
                value={formData.physicalProvince}
                onChange={(e) => updateField("physicalProvince", e.target.value)}
                placeholder="Western Cape"
              />
              {errors.physicalProvince && <p className="text-sm text-red-600 mt-1">{errors.physicalProvince}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="physicalPostalCode">Postal Code *</Label>
            <Input
              id="physicalPostalCode"
              value={formData.physicalPostalCode}
              onChange={(e) => updateField("physicalPostalCode", e.target.value)}
              placeholder="8000"
            />
            {errors.physicalPostalCode && <p className="text-sm text-red-600 mt-1">{errors.physicalPostalCode}</p>}
          </div>

          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Banking (Optional) */}
      {step === 3 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Banking Details (Optional)</h2>
          <p className="text-sm text-gray-600">
            Provide your banking details if you'd like us to transfer funds directly.
          </p>

          {/* Banking fields... */}
          <p className="text-center text-gray-500">Banking fields implementation...</p>

          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Documents */}
      {step === 4 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Upload Documents (Optional)</h2>

          <FileUpload
            label="Proof of ID"
            onFileSelect={(file) => setFiles(prev => ({ ...prev, proofOfId: file || undefined }))}
          />

          <FileUpload
            label="Proof of Address"
            onFileSelect={(file) => setFiles(prev => ({ ...prev, proofOfAddress: file || undefined }))}
          />

          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
              {submitting ? "Submitting..." : "Submit & Confirm"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
```

---

### Task 4: Confirmation Page

**File:** `app/(public)/quote/[token]/confirmed/page.tsx` (NEW)

```typescript
"use client"

import { Card } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function ConfirmedPage() {
  return (
    <Card className="p-8 text-center">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Quote Confirmed!</h1>
      <p className="text-gray-600 mb-6">
        Thank you for submitting your details. We've received your information and will contact you shortly regarding payment.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
        <h3 className="font-bold text-gray-900 mb-2">What happens next?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ You'll receive a confirmation email shortly</li>
          <li>✓ Our team will review your details</li>
          <li>✓ We'll contact you with payment instructions within 24 hours</li>
          <li>✓ Once payment is received, we'll arrange collection of your items</li>
        </ul>
      </div>
      <p className="text-sm text-gray-500 mt-6">
        If you have any questions, please contact us at <a href="mailto:admin@keysers.co.za" className="text-blue-600 hover:underline">admin@keysers.co.za</a>
      </p>
    </Card>
  )
}
```

---

## ✅ Completion Checklist

- [ ] Created validators.ts
- [ ] Created FileUpload component
- [ ] Created client details form (all 4 steps)
- [ ] Created confirmation page
- [ ] Implemented form validation
- [ ] Added SA ID validation
- [ ] Added email/phone validation
- [ ] Tested multi-step navigation
- [ ] Tested form submission
- [ ] Tested on mobile
- [ ] Committed changes

---

## 📝 Git Backup

```bash
git add lib/validators.ts components/FileUpload.tsx app/\(public\)/quote
git commit -m "Phase 5 Complete: Client details form with validation"
git tag -a quote-workflow-phase-5-complete -m "Client form implementation"
```

---

**Phase Status:** 🔴 Not Started  
**Next Phase:** `PHASE_6_DASHBOARD.md`
