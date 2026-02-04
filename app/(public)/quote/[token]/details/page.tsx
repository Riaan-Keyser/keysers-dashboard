"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/FileUpload"
import { 
  validateClientIdentity, 
  validateEmail, 
  validatePhoneNumber
} from "@/lib/validators"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"

type IdentityType = "sa_id" | "passport"

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [identityType, setIdentityType] = useState<IdentityType>("sa_id")

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
    accountHolderName: ""
  })

  const [files, setFiles] = useState<{
    proofOfId?: File
    proofOfAddress?: File
    bankConfirmation?: File
  }>({})

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: "" }))
  }

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
    if (!validateStep(1) || !validateStep(2)) return

    setSubmitting(true)

    try {
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
          // File URLs (to be implemented)
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

  const stepTitles = [
    "Personal Information",
    "Address",
    "Banking Details",
    "Upload Documents"
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
          Step {step} of 4: {stepTitles[step - 1]}
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
            <RadioGroup
              value={identityType}
              onValueChange={(value: IdentityType) => setIdentityType(value)}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sa_id" id="sa_id" />
                <Label htmlFor="sa_id" className="font-normal cursor-pointer">
                  South African ID
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="passport" id="passport" />
                <Label htmlFor="passport" className="font-normal cursor-pointer">
                  Passport (International)
                </Label>
              </div>
            </RadioGroup>
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
                value={formData.accountType}
                onValueChange={(value) => updateField("accountType", value)}
              >
                <SelectTrigger className={errors.accountType ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheque">Cheque/Current</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="transmission">Transmission</SelectItem>
                </SelectContent>
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
