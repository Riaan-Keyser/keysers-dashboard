"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Check, X } from "lucide-react"

export default function ClientDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const action = searchParams.get("action")

  const [purchase, setPurchase] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [declined, setDeclined] = useState(false)

  const [formData, setFormData] = useState({
    idNumber: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    bankName: "",
    accountNumber: "",
    branchCode: "",
    accountType: "CHEQUE"
  })

  useEffect(() => {
    fetchPurchaseDetails()
    if (action === "decline") {
      handleDecline()
    }
  }, [token, action])

  const fetchPurchaseDetails = async () => {
    try {
      const response = await fetch(`/api/client-details/${token}`)
      if (response.ok) {
        const data = await response.json()
        setPurchase(data)
      } else {
        alert("Invalid or expired link")
      }
    } catch (error) {
      console.error("Failed to fetch:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    try {
      await fetch(`/api/client-details/${token}/decline`, {
        method: "POST"
      })
      setDeclined(true)
    } catch (error) {
      console.error("Failed to decline:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`/api/client-details/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert("Failed to submit details. Please try again.")
      }
    } catch (error) {
      console.error("Failed to submit:", error)
      alert("Failed to submit details")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Invoice Declined</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Thank you for your time. If you change your mind, please contact us directly.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Keysers Camera Equipment<br />
              info@keysers.co.za
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Details Submitted Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Thank you, <strong>{purchase?.customerName}</strong>!
            </p>
            <p className="text-gray-600">
              Your details have been received. We'll arrange payment and collection within 24-48 hours.
            </p>
            <p className="mt-6 text-sm text-gray-500">
              You'll receive confirmation via email and WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Invalid or expired link</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center bg-gray-900 text-white rounded-t-lg">
            <h1 className="text-2xl font-bold">Keysers Camera Equipment</h1>
            <p className="text-sm opacity-90 mt-1">Supplier Invoice #{purchase.invoiceNumber}</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Invoice Summary</h2>
              <p className="text-gray-600">Total Amount: <span className="text-2xl font-bold text-green-600">R {purchase.invoiceTotal?.toLocaleString()}</span></p>
              <p className="text-sm text-gray-500 mt-2">{purchase.items.length} item(s)</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Please provide your details below</strong> so we can process payment and arrange collection.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Personal Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Full Name</Label>
                    <Input value={purchase.customerName} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={purchase.customerPhone} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input value={purchase.customerEmail || ""} disabled className="bg-gray-50" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="idNumber">ID Number *</Label>
                    <Input
                      id="idNumber"
                      required
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                      placeholder="Your South African ID number"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Physical Address</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="province">Province *</Label>
                      <Select
                        id="province"
                        required
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      >
                        <option value="">Select Province</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="Western Cape">Western Cape</option>
                        <option value="Eastern Cape">Eastern Cape</option>
                        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                        <option value="Free State">Free State</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Mpumalanga">Mpumalanga</option>
                        <option value="Northern Cape">Northern Cape</option>
                        <option value="North West">North West</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      required
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="0000"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Bank Details for Payment</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Select
                      id="bankName"
                      required
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    >
                      <option value="">Select Bank</option>
                      <option value="FNB">FNB</option>
                      <option value="Standard Bank">Standard Bank</option>
                      <option value="ABSA">ABSA</option>
                      <option value="Nedbank">Nedbank</option>
                      <option value="Capitec">Capitec</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        required
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branchCode">Branch Code *</Label>
                      <Input
                        id="branchCode"
                        required
                        value={formData.branchCode}
                        onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                        placeholder="250655"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accountType">Account Type *</Label>
                    <Select
                      id="accountType"
                      required
                      value={formData.accountType}
                      onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                    >
                      <option value="CHEQUE">Cheque Account</option>
                      <option value="SAVINGS">Savings Account</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = `?action=decline`}
                >
                  Decline
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? "Submitting..." : "Submit Details & Accept"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
