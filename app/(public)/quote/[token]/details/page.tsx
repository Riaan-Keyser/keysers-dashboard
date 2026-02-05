"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { FileUpload } from "@/components/FileUpload"
import { 
  validateClientIdentity, 
  validateEmail, 
  validatePhoneNumber
} from "@/lib/validators"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Package, DollarSign } from "lucide-react"

type IdentityType = "sa_id" | "passport"

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [identityType, setIdentityType] = useState<IdentityType>("sa_id")
  
  // Check if any consignment items selected
  const [hasConsignmentItems, setHasConsignmentItems] = useState(false)
  const [hasBuyItems, setHasBuyItems] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    // Personal
    fullName: "",
    surname: "",
    idNumber: "",
    passportNumber: "",
    passportCountry: "",
    nationality: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    // Address
    physicalAddress: "",
    physicalStreet: "",
    physicalCity: "",
    physicalProvince: "",
    physicalPostalCode: "",
    postalAddress: "",
    postalCity: "",
    postalProvince: "",
    postalPostalCode: "",
    // Banking (optional)
    bankName: "",
    accountNumber: "",
    accountType: "",
    branchCode: "",
    accountHolderName: "",
    // Consignment-specific
    consignmentPeriodMonths: "3", // Default 3 months
    consignmentEndDate: "",
    // Terms acceptance
    acceptBuyTerms: false,
    acceptConsignmentTerms: false
  })

  const [files, setFiles] = useState<{
    proofOfId?: File
    proofOfAddress?: File
    bankConfirmation?: File
  }>({})

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: "" }))
  }

  // Check product selections on mount
  useEffect(() => {
    const selectionsJSON = localStorage.getItem(`quote_selections_${token}`)
    if (selectionsJSON) {
      const selections = JSON.parse(selectionsJSON) as Record<string, "BUY" | "CONSIGNMENT">
      const hasConsignment = Object.values(selections).some(sel => sel === "CONSIGNMENT")
      const hasBuy = Object.values(selections).some(sel => sel === "BUY")
      
      setHasConsignmentItems(hasConsignment)
      setHasBuyItems(hasBuy)

      // Calculate default consignment end date (3 months from now)
      if (hasConsignment) {
        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
        setFormData(prev => ({
          ...prev,
          consignmentEndDate: threeMonthsFromNow.toISOString().split('T')[0]
        }))
      }
    }
  }, [token])

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      // Personal info validation
      if (!formData.fullName.trim()) newErrors.fullName = "First name is required"
      if (!formData.surname.trim()) newErrors.surname = "Surname is required"
      
      // Identity validation (SA ID or Passport)
      const identityValidation = validateClientIdentity({
        idNumber: identityType === "sa_id" ? formData.idNumber : undefined,
        passportNumber: identityType === "passport" ? formData.passportNumber : undefined
      })
      
      if (!identityValidation.valid) {
        if (identityType === "sa_id") {
          newErrors.idNumber = identityValidation.error || "Invalid ID"
        } else {
          newErrors.passportNumber = identityValidation.error || "Invalid passport"
        }
      }

      // Additional passport fields
      if (identityType === "passport") {
        if (!formData.passportCountry.trim()) {
          newErrors.passportCountry = "Country of issue is required"
        }
        if (!formData.dateOfBirth.trim()) {
          newErrors.dateOfBirth = "Date of birth is required"
        }
      }

      // Email validation
      if (!formData.email.trim()) {
        newErrors.email = "Email is required"
      } else if (!validateEmail(formData.email)) {
        newErrors.email = "Invalid email format"
      }

      // Phone validation
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required"
      } else if (!validatePhoneNumber(formData.phone)) {
        newErrors.phone = "Invalid phone number format"
      }
    }

    if (stepNumber === 2) {
      // Address validation
      if (!formData.physicalAddress.trim()) {
        newErrors.physicalAddress = "Physical address is required"
      }
      if (!formData.physicalCity.trim()) {
        newErrors.physicalCity = "City is required"
      }
      if (!formData.physicalProvince.trim()) {
        newErrors.physicalProvince = "Province/State is required"
      }
      if (!formData.physicalPostalCode.trim()) {
        newErrors.physicalPostalCode = "Postal code is required"
      }
    }

    if (stepNumber === 3) {
      // Banking details validation (NOW REQUIRED)
      if (!formData.bankName.trim()) {
        newErrors.bankName = "Bank name is required"
      }
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = "Account number is required"
      }
      if (!formData.accountType.trim()) {
        newErrors.accountType = "Account type is required"
      }
      if (!formData.branchCode.trim()) {
        newErrors.branchCode = "Branch code is required"
      }
      if (!formData.accountHolderName.trim()) {
        newErrors.accountHolderName = "Account holder name is required"
      }
    }

    if (stepNumber === 4) {
      // Document upload validation (Proof of ID is NOW REQUIRED)
      if (!files.proofOfId) {
        newErrors.proofOfId = "Proof of ID is required"
      }
    }

    if (stepNumber === 5) {
      // Terms & Conditions validation
      if (hasConsignmentItems) {
        if (!formData.consignmentEndDate) {
          newErrors.consignmentEndDate = "Consignment end date is required"
        }
        if (!formData.acceptConsignmentTerms) {
          newErrors.acceptConsignmentTerms = "You must accept the Consignment Agreement to continue"
        }
      }
      
      if (hasBuyItems) {
        if (!formData.acceptBuyTerms) {
          newErrors.acceptBuyTerms = "You must accept the Purchase Agreement to continue"
        }
      }
    }

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
    // Validate all steps
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4) || !validateStep(5)) {
      return
    }

    setSubmitting(true)

    try {
      // Get product selections from localStorage (set in select-products page)
      const selectionsJSON = localStorage.getItem(`quote_selections_${token}`)
      const selections = selectionsJSON ? JSON.parse(selectionsJSON) : null

      console.log("📝 Submitting with selections:", selections)
      console.log("📝 Form data preview:", {
        fullName: formData.fullName,
        email: formData.email,
        hasConsignment: hasConsignmentItems,
        hasBuy: hasBuyItems,
        acceptedConsignment: formData.acceptConsignmentTerms,
        acceptedBuy: formData.acceptBuyTerms
      })

      // TODO: Upload files first (will add in Task 4)
      // For now, submit without file URLs

      const response = await fetch(`/api/quote-confirmation/${token}/submit-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Clear unused identity field
          idNumber: identityType === "sa_id" ? formData.idNumber : undefined,
          passportNumber: identityType === "passport" ? formData.passportNumber : undefined,
          // Include product selections (Buy vs Consignment)
          productSelections: selections,
          // Terms acceptance
          acceptedBuyTerms: hasBuyItems ? formData.acceptBuyTerms : null,
          acceptedConsignmentTerms: hasConsignmentItems ? formData.acceptConsignmentTerms : null,
          consignmentEndDate: hasConsignmentItems ? formData.consignmentEndDate : null,
          // File URLs (to be implemented)
          proofOfIdUrl: null,
          proofOfAddressUrl: null,
          bankConfirmationUrl: null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ Submit failed:", data)
        console.error("   Response status:", response.status)
        console.error("   Error message:", data.error)
        
        const errorMessage = data.error || "Failed to submit details. Please check all fields and try again."
        alert(errorMessage)
        setSubmitting(false)
        return
      }

      console.log("✅ Submit successful:", data)

      // Clean up localStorage
      localStorage.removeItem(`quote_selections_${token}`)

      // Redirect to confirmation page
      router.push(`/quote/${token}/confirmed`)
    } catch (err: any) {
      console.error("❌ Submit error:", err)
      alert("Failed to submit details. Please check your internet connection and try again.")
      setSubmitting(false)
    }
  }

  const stepTitles = [
    "Personal Information",
    "Address",
    "Banking Details",
    "Upload Documents",
    "Terms & Conditions"
  ]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Progress Indicator */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  s < step
                    ? "bg-green-600 text-white"
                    : s === step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    s < step ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm md:text-base text-gray-700 text-center font-medium">
          Step {step} of 5: {stepTitles[step - 1]}
        </p>
      </Card>

      {/* Step 1: Personal Information */}
      {step === 1 && (
        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Personal Information
            </h2>
            <p className="text-gray-600">
              Please provide your personal details to confirm the quote
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">First Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="John"
                className={errors.fullName ? "border-red-500" : ""}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="surname">Surname *</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => updateField("surname", e.target.value)}
                placeholder="Doe"
                className={errors.surname ? "border-red-500" : ""}
              />
              {errors.surname && (
                <p className="text-sm text-red-600 mt-1">{errors.surname}</p>
              )}
            </div>
          </div>

          {/* Identity Type Selection */}
          <div>
            <Label>Identity Document Type *</Label>
            <div className="flex gap-6 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sa_id"
                  name="identityType"
                  value="sa_id"
                  checked={identityType === "sa_id"}
                  onChange={(e) => setIdentityType(e.target.value as IdentityType)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="sa_id" className="font-normal cursor-pointer">
                  South African ID
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="passport"
                  name="identityType"
                  value="passport"
                  checked={identityType === "passport"}
                  onChange={(e) => setIdentityType(e.target.value as IdentityType)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="passport" className="font-normal cursor-pointer">
                  Passport (International)
                </Label>
              </div>
            </div>
          </div>

          {/* SA ID Number */}
          {identityType === "sa_id" && (
            <div>
              <Label htmlFor="idNumber">South African ID Number *</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => updateField("idNumber", e.target.value)}
                placeholder="9001015009087"
                maxLength={13}
                className={errors.idNumber ? "border-red-500" : ""}
              />
              {errors.idNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.idNumber}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                13-digit South African ID number
              </p>
            </div>
          )}

          {/* Passport Fields */}
          {identityType === "passport" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="passportNumber">Passport Number *</Label>
                <Input
                  id="passportNumber"
                  value={formData.passportNumber}
                  onChange={(e) => updateField("passportNumber", e.target.value)}
                  placeholder="AB1234567"
                  className={errors.passportNumber ? "border-red-500" : ""}
                />
                {errors.passportNumber && (
                  <p className="text-sm text-red-600 mt-1">{errors.passportNumber}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passportCountry">Country of Issue *</Label>
                  <Input
                    id="passportCountry"
                    value={formData.passportCountry}
                    onChange={(e) => updateField("passportCountry", e.target.value)}
                    placeholder="e.g., United Kingdom"
                    className={errors.passportCountry ? "border-red-500" : ""}
                  />
                  {errors.passportCountry && (
                    <p className="text-sm text-red-600 mt-1">{errors.passportCountry}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => updateField("nationality", e.target.value)}
                    placeholder="e.g., British"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth}</p>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="john@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+27 82 345 6789"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Include country code, e.g., +27 for South Africa
              </p>
            </div>
          </div>

          <Button onClick={handleNext} className="w-full" size="lg">
            Next: Address Information
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Card>
      )}

      {/* Step 2: Address */}
      {step === 2 && (
        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Address Information
            </h2>
            <p className="text-gray-600">
              Where should we send correspondence?
            </p>
          </div>

          <div>
            <Label htmlFor="physicalAddress">Street Address *</Label>
            <Input
              id="physicalAddress"
              value={formData.physicalAddress}
              onChange={(e) => updateField("physicalAddress", e.target.value)}
              placeholder="123 Main Street"
              className={errors.physicalAddress ? "border-red-500" : ""}
            />
            {errors.physicalAddress && (
              <p className="text-sm text-red-600 mt-1">{errors.physicalAddress}</p>
            )}
          </div>

          <div>
            <Label htmlFor="physicalStreet">Suburb/Area (Optional)</Label>
            <Input
              id="physicalStreet"
              value={formData.physicalStreet}
              onChange={(e) => updateField("physicalStreet", e.target.value)}
              placeholder="Gardens"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="physicalCity">City *</Label>
              <Input
                id="physicalCity"
                value={formData.physicalCity}
                onChange={(e) => updateField("physicalCity", e.target.value)}
                placeholder="Cape Town"
                className={errors.physicalCity ? "border-red-500" : ""}
              />
              {errors.physicalCity && (
                <p className="text-sm text-red-600 mt-1">{errors.physicalCity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="physicalProvince">Province/State *</Label>
              <Input
                id="physicalProvince"
                value={formData.physicalProvince}
                onChange={(e) => updateField("physicalProvince", e.target.value)}
                placeholder="Western Cape"
                className={errors.physicalProvince ? "border-red-500" : ""}
              />
              {errors.physicalProvince && (
                <p className="text-sm text-red-600 mt-1">{errors.physicalProvince}</p>
              )}
            </div>

            <div>
              <Label htmlFor="physicalPostalCode">Postal Code *</Label>
              <Input
                id="physicalPostalCode"
                value={formData.physicalPostalCode}
                onChange={(e) => updateField("physicalPostalCode", e.target.value)}
                placeholder="8001"
                className={errors.physicalPostalCode ? "border-red-500" : ""}
              />
              {errors.physicalPostalCode && (
                <p className="text-sm text-red-600 mt-1">{errors.physicalPostalCode}</p>
              )}
            </div>
          </div>

          {/* Optional Postal Address */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              <strong>Postal Address (Optional)</strong> - If different from physical address
            </p>

            <div className="grid gap-3">
              <Input
                placeholder="Postal Address"
                value={formData.postalAddress}
                onChange={(e) => updateField("postalAddress", e.target.value)}
              />
              <div className="grid md:grid-cols-3 gap-3">
                <Input
                  placeholder="City"
                  value={formData.postalCity}
                  onChange={(e) => updateField("postalCity", e.target.value)}
                />
                <Input
                  placeholder="Province/State"
                  value={formData.postalProvince}
                  onChange={(e) => updateField("postalProvince", e.target.value)}
                />
                <Input
                  placeholder="Postal Code"
                  value={formData.postalPostalCode}
                  onChange={(e) => updateField("postalPostalCode", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1" size="lg">
              Next: Banking Details
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Banking (REQUIRED) */}
      {step === 3 && (
        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Banking Details
            </h2>
            <p className="text-gray-600">
              Required - Provide banking details for payment transfer
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              💳 <strong>Important:</strong> We need your banking details to transfer funds directly to your account.
              Please ensure all information is accurate.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
                placeholder="e.g., Standard Bank"
                className={errors.bankName ? "border-red-500" : ""}
              />
              {errors.bankName && (
                <p className="text-sm text-red-600 mt-1">{errors.bankName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="accountType">Account Type *</Label>
              <Select
                id="accountType"
                value={formData.accountType}
                onChange={(e) => updateField("accountType", e.target.value)}
                className={errors.accountType ? "border-red-500" : ""}
              >
                <option value="">Select account type</option>
                <option value="cheque">Cheque/Current</option>
                <option value="savings">Savings</option>
                <option value="transmission">Transmission</option>
              </Select>
              {errors.accountType && (
                <p className="text-sm text-red-600 mt-1">{errors.accountType}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => updateField("accountNumber", e.target.value)}
                placeholder="1234567890"
                className={errors.accountNumber ? "border-red-500" : ""}
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.accountNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="branchCode">Branch Code *</Label>
              <Input
                id="branchCode"
                value={formData.branchCode}
                onChange={(e) => updateField("branchCode", e.target.value)}
                placeholder="250655"
                className={errors.branchCode ? "border-red-500" : ""}
              />
              {errors.branchCode && (
                <p className="text-sm text-red-600 mt-1">{errors.branchCode}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="accountHolderName">Account Holder Name *</Label>
            <Input
              id="accountHolderName"
              value={formData.accountHolderName}
              onChange={(e) => updateField("accountHolderName", e.target.value)}
              placeholder="John Doe"
              className={errors.accountHolderName ? "border-red-500" : ""}
            />
            {errors.accountHolderName && (
              <p className="text-sm text-red-600 mt-1">{errors.accountHolderName}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Must match the name on your ID/Passport
            </p>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1" size="lg">
              Next: Upload Documents
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Documents (ID REQUIRED) */}
      {step === 4 && (
        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Upload Documents
            </h2>
            <p className="text-gray-600">
              Required - Upload proof of identity
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              🔐 <strong>Important:</strong> Proof of ID is required for verification and compliance purposes.
              Proof of address is optional but recommended for faster processing.
            </p>
          </div>

          <FileUpload
            label="Proof of ID"
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={5}
            required={true}
            error={errors.proofOfId}
            onFileSelect={(file) => {
              setFiles(prev => ({ ...prev, proofOfId: file || undefined }))
              if (file) {
                setErrors(prev => ({ ...prev, proofOfId: "" }))
              }
            }}
          />

          <FileUpload
            label="Proof of Address (Optional)"
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={5}
            onFileSelect={(file) => setFiles(prev => ({ ...prev, proofOfAddress: file || undefined }))}
          />

          <FileUpload
            label="Bank Confirmation Letter (Optional)"
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={5}
            onFileSelect={(file) => setFiles(prev => ({ ...prev, bankConfirmation: file || undefined }))}
          />

          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1" size="lg">
              Next: Terms & Conditions
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Terms & Conditions */}
      {step === 5 && (
        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Terms & Conditions
            </h2>
            <p className="text-gray-600">
              Please review and accept the applicable agreements
            </p>
          </div>

          {/* Consignment Agreement (if applicable) */}
          {hasConsignmentItems && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Consignment Agreement
              </h3>
              
              <div className="bg-white rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto border border-blue-200">
                <h4 className="font-semibold text-gray-900 text-center mb-4">CONSIGNMENT AGREEMENT</h4>
                
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="text-xs leading-relaxed">
                    This Consignment Agreement states the terms and conditions that govern the contractual agreement between 
                    you (the "Consignor") and <strong>Riaan Keyser</strong>, located at <strong>65 Tennant Street, Windsor Park, Kraaifontein, 7570</strong> (the "Consignee"), 
                    who agree to be bound by this Agreement.
                  </p>

                  <p className="text-xs leading-relaxed">
                    <strong>WHEREAS,</strong> the Consignor owns right and title to the inspected items (the "Consigned Items"), and the Consignee desires to take 
                    possession of the Consigned Items with the intention of selling it to a third party.
                  </p>

                  <div className="border-t pt-3 mt-3">
                    <p><strong>1. RIGHT TO SELL</strong></p>
                    <p className="text-xs">The Consignor hereby grants to the Consignee the exclusive right to display and sell the Consigned Items according to the terms and conditions of this Agreement.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>2. MINIMUM PRICE</strong></p>
                    <p className="text-xs">The minimum price at which the Consignee may sell the Consigned Items shall be the consignment price agreed upon during inspection (the "Minimum Price"). The minimum price will be listed in South African Rand ("R"). In the event the Consignee sells the Consigned Items for less than the Minimum Price, the Consignor shall be entitled to the same payment the Consignor would receive as its share of the sale price under this Agreement had the Consigned Items been sold for the Minimum Amount.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>3. CONSIGNMENT FEE</strong></p>
                    <p className="text-xs">The Consignee shall be entitled the difference between the Consignor's minimum selling price and the full purchase price of the Consigned Items (the "Consignment Fee"). Within 7 days from the sale of the Consigned Items, the Consignee shall deliver to the Consignor the sale price of the Consigned Items less the Consignment Fee.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>4. INSURANCE</strong></p>
                    <p className="text-xs">The Consignee represents and warrants that the Consignee shall maintain insurance coverage sufficient to compensate the Consignor for the fair market value of the Consigned Items in the event of damage due to fire, theft, or otherwise.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>5. LOCATION OF ITEMS</strong></p>
                    <p className="text-xs">The Consignee agrees and acknowledges that the Consigned Items shall only be kept and stored at 65 Tennant Street, Windsor Park, Kraaifontein, 7570 unless otherwise agreed upon by the Consignor in writing.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>6. TIMEFRAME</strong></p>
                    <p className="text-xs">In the event that all the Consigned Items are not sold by the specified consignment end date, all unsold Consigned Items shall be returned to the Consignor with all delivery costs borne by the Consignee.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>7. CONSIGNOR REPRESENTATION</strong></p>
                    <p className="text-xs">The Consignor hereby represents and warrants that the Consignor holds full title (or has received, in writing, the authorization to sell the Consigned Items by any necessary parties) to the Consigned Items. The Consignor hereby represents and warrants that the Consigned items are free from any defects.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>8. EXPENSES</strong></p>
                    <p className="text-xs">The Consignee shall bear all expenses for shipping the Consigned Items.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>9. NO MODIFICATION UNLESS IN WRITING</strong></p>
                    <p className="text-xs">No modification of this Agreement shall be valid unless in writing and agreed upon by both Parties.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>10. APPLICABLE LAW</strong></p>
                    <p className="text-xs">This Agreement and the interpretation of its terms shall be governed by and construed in accordance with the laws of South Africa and subject to the exclusive jurisdiction of the federal and provincial courts located in South Africa.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>11. NOTICE AND DOMICILIA (Address for legal notices)</strong></p>
                    <p className="text-xs">The parties select as their respective domicilia citandi et executandi the addresses provided in this form. Any notice addressed to a party at its physical or postal address must be sent by prepaid registered post, delivered by hand, sent by telefax or sent by electronic mail (e-mail).</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>12. BREACH</strong></p>
                    <p className="text-xs">If either party commits a material breach of this Agreement and fails to remedy it within 14 days of written notice requiring it to do so, then the party giving the notice may: (a) cancel this Agreement and claim damages; or (b) claim specific performance of all the defaulting party's obligations, together with damages, whether or not such obligations are due for performance.</p>
                  </div>
                </div>
              </div>

              {/* Consignment Period Selector */}
              <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-blue-300">
                <Label htmlFor="consignmentEndDate" className="text-base font-semibold">6. TIMEFRAME - Consignment Period End Date *</Label>
                <Input
                  id="consignmentEndDate"
                  type="date"
                  value={formData.consignmentEndDate}
                  onChange={(e) => updateField("consignmentEndDate", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.consignmentEndDate ? "border-red-500" : "border-blue-400 border-2"}
                />
                {errors.consignmentEndDate && (
                  <p className="text-sm text-red-600">{errors.consignmentEndDate}</p>
                )}
                <p className="text-xs text-gray-600">
                  <strong>Required:</strong> Select the date until which you authorize Riaan Keyser (Keysers Camera Equipment) to sell your consigned items. 
                  If items remain unsold by this date, they will be returned to you with all delivery costs borne by the Consignee.
                </p>
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                  💡 <strong>Tip:</strong> A typical consignment period is 3-6 months. This gives adequate time for items to sell while keeping a reasonable timeframe.
                </p>
              </div>

              {/* Acceptance Checkbox */}
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-blue-300">
                <input
                  type="checkbox"
                  id="acceptConsignmentTerms"
                  checked={formData.acceptConsignmentTerms}
                  onChange={(e) => updateField("acceptConsignmentTerms", e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="acceptConsignmentTerms" className="cursor-pointer font-normal text-sm">
                  I have read and fully understand the <strong>Consignment Agreement</strong> terms and conditions above. 
                  I confirm that I hold full title to the consigned items and warrant that they are free from any defects. 
                  I authorize <strong>Riaan Keyser (Keysers Camera Equipment)</strong> to display and sell my consigned items 
                  until <strong>{formData.consignmentEndDate ? new Date(formData.consignmentEndDate).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : '[please select end date above]'}</strong>, 
                  in accordance with the terms specified in this agreement.
                </Label>
              </div>
              {errors.acceptConsignmentTerms && (
                <p className="text-sm text-red-600">{errors.acceptConsignmentTerms}</p>
              )}
            </div>
          )}

          {/* Buy/Supplier Agreement (if applicable) */}
          {hasBuyItems && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Purchase Agreement
              </h3>
              
              <div className="bg-white rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto border border-green-200">
                <h4 className="font-semibold text-gray-900 text-center mb-4">SUPPLIER'S INVOICE - PURCHASE AGREEMENT</h4>
                
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="text-xs leading-relaxed">
                    By submitting this form and accepting these terms, you (the "Supplier") agree to sell the inspected camera equipment to 
                    <strong> Keysers Camera Equipment</strong> (Reg. No. 2007/200275/23, VAT No. 4450277977), located at 
                    <strong> P.O. Box 459, Cape Gate, Brackenfell, Cape Town, 7560</strong> (the "Buyer"), under the following terms and conditions:
                  </p>

                  <div className="border-t pt-3 mt-3">
                    <p><strong>1. SALE AND PURCHASE</strong></p>
                    <p className="text-xs">The Supplier agrees to sell and the Buyer agrees to purchase the camera equipment items as described in the inspection report at the agreed "Buy" prices. Title and ownership of the equipment shall transfer to the Buyer upon acceptance of this agreement and receipt of payment.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>2. PAYMENT TERMS</strong></p>
                    <p className="text-xs">
                      • Payment will be made via direct bank transfer (EFT) to the banking details provided in this form<br/>
                      • Payment will be processed within 48 hours of this form submission and verification of details<br/>
                      • The Supplier is responsible for ensuring all banking details provided are accurate<br/>
                      • Keysers Camera Equipment will not be liable for payments made to incorrect banking details provided by the Supplier
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>3. SUPPLIER WARRANTIES AND REPRESENTATIONS</strong></p>
                    <p className="text-xs">The Supplier warrants and represents that:</p>
                    <p className="text-xs ml-4">
                      • They are the lawful owner of the equipment with full right and authority to sell it<br/>
                      • The equipment is free from any liens, charges, security interests, or encumbrances<br/>
                      • The condition and description of the equipment is accurate as per the inspection report<br/>
                      • All information provided in this form is true, accurate, and complete<br/>
                      • The equipment is not stolen property and has been lawfully acquired<br/>
                      • They hold valid proof of identity (SA ID or Passport)
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>4. INSPECTION ACCEPTANCE</strong></p>
                    <p className="text-xs">The Supplier acknowledges that the equipment has been physically inspected by Keysers Camera Equipment staff. The Supplier accepts the inspection findings, condition assessment, and agreed purchase prices as final and binding.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>5. RISK AND OWNERSHIP TRANSFER</strong></p>
                    <p className="text-xs">Risk in the equipment remains with the Supplier until physical possession is transferred to the Buyer. Ownership transfers to the Buyer upon acceptance of this agreement. The Supplier has no further claim to the equipment once payment has been made.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>6. REQUIRED DOCUMENTATION</strong></p>
                    <p className="text-xs">The Supplier must provide valid proof of identity (certified copy of SA ID or Passport). Additional documentation may be required for compliance purposes. The Buyer reserves the right to verify the identity and ownership claims of the Supplier.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>7. INDEMNITY</strong></p>
                    <p className="text-xs">The Supplier indemnifies and holds harmless Keysers Camera Equipment against any and all claims, demands, losses, damages, costs, and expenses arising from any breach of the Supplier's warranties or any third-party claims relating to the equipment.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>8. APPLICABLE LAW</strong></p>
                    <p className="text-xs">This agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of the South African courts.</p>
                  </div>

                  <div className="border-t pt-3">
                    <p><strong>9. ELECTRONIC SIGNATURE</strong></p>
                    <p className="text-xs">By checking the acceptance box below, the Supplier agrees that this constitutes a valid electronic signature with the same legal effect as a handwritten signature, in accordance with the Electronic Communications and Transactions Act (ECTA).</p>
                  </div>
                </div>
              </div>

              {/* Acceptance Checkbox */}
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-green-300">
                <input
                  type="checkbox"
                  id="acceptBuyTerms"
                  checked={formData.acceptBuyTerms}
                  onChange={(e) => updateField("acceptBuyTerms", e.target.checked)}
                  className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <Label htmlFor="acceptBuyTerms" className="cursor-pointer font-normal text-sm">
                  I have read and fully understand the <strong>Supplier's Invoice - Purchase Agreement</strong> terms and conditions above. 
                  I warrant that I am the lawful owner of the equipment with full right and authority to sell it, 
                  that the equipment is free from any liens, charges, or encumbrances, and that all information provided is true and accurate. 
                  I agree to sell the inspected camera equipment to <strong>Keysers Camera Equipment (Reg. No. 2007/200275/23)</strong> 
                  at the agreed purchase prices, and I accept that payment will be made via EFT to my provided banking details within 48 hours of verification. 
                  This electronic acceptance constitutes my binding signature.
                </Label>
              </div>
              {errors.acceptBuyTerms && (
                <p className="text-sm text-red-600">{errors.acceptBuyTerms}</p>
              )}
            </div>
          )}

          {/* General Terms & Reminders */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-600">
                <strong>📋 Document Requirements:</strong> As per the agreement terms, you must provide a copy of your ID or Passport (uploaded in Step 4). 
                This is required for verification and compliance purposes.
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-600">
                <strong>🔐 Data Protection:</strong> Your personal information will be processed in accordance with the Protection of Personal Information Act (POPIA). 
                We will use your information solely for the purpose of processing this transaction and will not share it with third parties without your consent.
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-600">
                <strong>✍️ Electronic Signature:</strong> By checking the acceptance box(es) above and submitting this form, you are providing your legally binding electronic signature 
                in accordance with the Electronic Communications and Transactions Act (ECTA). This has the same legal effect as a handwritten signature.
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Submit & Confirm
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
