"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { InspectionStepper } from "@/components/inspection/InspectionStepper"
import { ProductSearch } from "@/components/inspection/ProductSearch"
import { AddProductModal } from "@/components/products/AddProductModal"
import { AdminApprovalModal } from "@/components/products/AdminApprovalModal"
import { AlertModal } from "@/components/ui/alert-modal"
import { formatPrice } from "@/lib/inspection-pricing"
import { ArrowLeft, ArrowRight, Save, Check, X, ChevronDown, ChevronUp } from "lucide-react"

const STEPS = [
  { id: "identify", name: "Identify", description: "Select product" },
  { id: "verify", name: "Verify", description: "Check details" },
  { id: "price", name: "Price", description: "Set pricing" },
  { id: "approve", name: "Approve", description: "Final review" }
]

const CONDITION_MULTIPLIERS = {
  LIKE_NEW: { label: "Like New", multiplier: 1.0, description: "Essentially new, no signs of use" },
  EXCELLENT: { label: "Excellent", multiplier: 0.95, description: "Minimal signs of use" },
  VERY_GOOD: { label: "Very Good", multiplier: 0.90, description: "Light signs of use" },
  GOOD: { label: "Good", multiplier: 0.82, description: "Moderate signs of use" },
  WORN: { label: "Worn", multiplier: 0.70, description: "Heavy signs of use but functional" }
}

interface Product {
  id: string
  name: string
  brand: string
  model: string
  variant: string | null
  productType: string
  buyPriceMin: number
  buyPriceMax: number
  consignPriceMin: number
  consignPriceMax: number
}

interface IncomingItem {
  id: string
  clientName: string
  clientBrand: string | null
  clientModel: string | null
  clientDescription: string | null
  clientSerialNumber: string | null
  clientCondition: string | null
  inspectionStatus: string
  verifiedItem: {
    id: string
    product: Product
    serialNumber: string | null
    verifiedCondition: string
    generalNotes: string | null
    locked: boolean
    approvedAt: string | null
    approvedBy: { name: string } | null
    answers: Array<{
      questionText: string
      answer: string
      notes: string | null
    }>
    accessories: Array<{
      accessoryName: string
      isPresent: boolean
      notes: string | null
    }>
    pricingSnapshot: {
      baseBuyMax: number
      baseConsignMax: number
      conditionMultiplier: number
      computedBuyPrice: number
      computedConsignPrice: number
      accessoryPenalty: number
      finalBuyPrice: number
      finalConsignPrice: number
    } | null
    priceOverride: {
      overrideBuyPrice: number | null
      overrideConsignPrice: number | null
      overrideReason: string
      notes: string | null
      overriddenBy: { name: string }
      overriddenAt: string
    } | null
  } | null
}

interface QuestionTemplate {
  id: string
  question: string
  category: string | null
  isRequired: boolean
}

interface AccessoryTemplate {
  id: string
  accessoryName: string
  isRequired: boolean
  penaltyAmount: number | null
}

export default function ItemVerificationPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const itemId = params.itemId as string
  const { data: session } = useSession()

  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [item, setItem] = useState<IncomingItem | null>(null)

  // Step 1: Identify
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [questions, setQuestions] = useState<QuestionTemplate[]>([])
  const [accessories, setAccessories] = useState<AccessoryTemplate[]>([])

  // Step 2: Verify
  const [verifiedCondition, setVerifiedCondition] = useState<string>("GOOD")
  const [serialNumber, setSerialNumber] = useState<string>("")
  const [answers, setAnswers] = useState<Record<string, { answer: string; notes: string }>>({})
  const [accessoryStates, setAccessoryStates] = useState<Record<string, { isPresent: boolean; notes: string }>>({})
  const [customAccessories, setCustomAccessories] = useState<string[]>([])
  const [newAccessoryName, setNewAccessoryName] = useState<string>("")
  const [generalNotes, setGeneralNotes] = useState<string>("")

  // Step 3: Price
  const [showOverride, setShowOverride] = useState(false)
  const [overrideBuyPrice, setOverrideBuyPrice] = useState<string>("")
  const [overrideConsignPrice, setOverrideConsignPrice] = useState<string>("")
  const [overrideReason, setOverrideReason] = useState<string>("")
  const [overrideNotes, setOverrideNotes] = useState<string>("")

  // Add Product Workflow
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showAdminApprovalModal, setShowAdminApprovalModal] = useState(false)
  const [pendingProductData, setPendingProductData] = useState<any>(null)
  const [addingProduct, setAddingProduct] = useState(false)

  // Alert Modal
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    type: "success" | "error" | "info" | "warning"
  }>({
    isOpen: false,
    message: "",
    type: "info"
  })

  useEffect(() => {
    fetchItem()
  }, [itemId])

  const fetchItem = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inspections/items/${itemId}`)
      if (!response.ok) throw new Error("Failed to fetch item")
      
      const data = await response.json()
      setItem(data.item)

      // If already identified, load product and move to appropriate step
      if (data.item.verifiedItem) {
        setSelectedProduct(data.item.verifiedItem.product)
        setSerialNumber(data.item.verifiedItem.serialNumber || "")
        setVerifiedCondition(data.item.verifiedItem.verifiedCondition)
        setGeneralNotes(data.item.verifiedItem.generalNotes || "")
        
        // Load question templates and accessory templates
        setQuestions(data.item.verifiedItem.product.questionTemplates || [])
        setAccessories(data.item.verifiedItem.product.accessories || [])
        
        // Load answers
        const answersMap: Record<string, { answer: string; notes: string }> = {}
        data.item.verifiedItem.answers.forEach((a: any) => {
          answersMap[a.questionText] = { answer: a.answer, notes: a.notes || "" }
        })
        setAnswers(answersMap)

        // Load accessories (existing verified accessories + initialize missing ones from templates)
        const accessoriesMap: Record<string, { isPresent: boolean; notes: string }> = {}
        
        // First, initialize all accessories from templates with default values
        data.item.verifiedItem.product.accessories.forEach((template: any) => {
          accessoriesMap[template.accessoryName] = { isPresent: false, notes: "" }
        })
        
        // Then, overwrite with verified accessories (if they exist)
        data.item.verifiedItem.accessories.forEach((a: any) => {
          accessoriesMap[a.accessoryName] = { isPresent: a.isPresent, notes: a.notes || "" }
        })
        
        setAccessoryStates(accessoriesMap)

        // Load override if exists
        if (data.item.verifiedItem.priceOverride) {
          setShowOverride(true)
          const override = data.item.verifiedItem.priceOverride
          setOverrideBuyPrice(override.overrideBuyPrice?.toString() || "")
          setOverrideConsignPrice(override.overrideConsignPrice?.toString() || "")
          setOverrideReason(override.overrideReason)
          setOverrideNotes(override.notes || "")
        }

        // Always start at step 0 (Identify Product) so user can review and click "Next: Verification"
        setCurrentStep(0)
      }
    } catch (error) {
      console.error("Failed to fetch item:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = useCallback(async (product: Product | any) => {
    // Check if this is the "add new product" trigger
    if (product.__addNewProduct) {
      setShowAddProductModal(true)
      return
    }
    
    setSelectedProduct(product)
    
    // If this product is already linked (same as existing verifiedItem), skip API call
    if (item?.verifiedItem?.product?.id === product.id) {
      return
    }
    
    try {
      // Identify the product
      const response = await fetch(`/api/inspections/items/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Product identification failed:", response.status, errorData)
        setAlertModal({
          isOpen: true,
          message: errorData.error || "Failed to identify product",
          type: "error"
        })
        return
      }
      
      // Refresh item data to get updated clientName and all related data
      await fetchItem()
    } catch (error) {
      // Silent fail - product is already selected in UI, no need to show error
      if (process.env.NODE_ENV === 'development') {
        console.log("Product select error:", error)
      }
    }
  }, [item?.verifiedItem?.product?.id, itemId])

  const handleAddProductSubmit = (productData: any) => {
    setPendingProductData(productData)
    setShowAddProductModal(false)
    setShowAdminApprovalModal(true)
  }

  const handleAdminApproval = async (adminId: string, adminPassword: string) => {
    setAddingProduct(true)
    try {
      const response = await fetch("/api/products/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingProductData,
          adminId,
          adminPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add product")
      }

      // Product added successfully! Now select it
      setShowAdminApprovalModal(false)
      setAddingProduct(false)
      setPendingProductData(null)

      // Select the newly added product
      await handleProductSelect(data.product)
      
      // Show success message
      setAlertModal({
        isOpen: true,
        message: "Product added successfully to the database!",
        type: "success"
      })
    } catch (error: any) {
      setAddingProduct(false)
      setAlertModal({
        isOpen: true,
        message: error.message || "Failed to add product",
        type: "error"
      })
      throw error
    }
  }

  const handleVerify = async () => {
    try {
      setSaving(true)
      
      const answersArray = Object.entries(answers).map(([questionText, data]) => ({
        questionText,
        answer: data.answer,
        notes: data.notes
      }))

      const accessoriesArray = Object.entries(accessoryStates).map(([accessoryName, data]) => ({
        accessoryName,
        isPresent: data.isPresent,
        notes: data.notes
      }))

      const response = await fetch(`/api/inspections/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          verifiedCondition,
          serialNumber,
          answers: answersArray,
          accessories: accessoriesArray,
          generalNotes
        })
      })

      if (!response.ok) throw new Error("Failed to verify item")
      
      await fetchItem()
      setCurrentStep(2) // Move to pricing step
    } catch (error) {
      console.error("Failed to verify item:", error)
      setAlertModal({
        isOpen: true,
        message: "Failed to verify item. Please try again.",
        type: "error"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleApplyOverride = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/inspections/items/${itemId}/price-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideBuyPrice: overrideBuyPrice ? parseFloat(overrideBuyPrice) : undefined,
          overrideConsignPrice: overrideConsignPrice ? parseFloat(overrideConsignPrice) : undefined,
          overrideReason,
          notes: overrideNotes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to apply override")
      }
      
      const currentStepValue = currentStep // Preserve current step
      await fetchItem()
      setCurrentStep(currentStepValue) // Restore step after refresh
    } catch (error: any) {
      console.error("Failed to apply override:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleRevertOverride = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/inspections/items/${itemId}/price-override`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Failed to revert override")
      
      const currentStepValue = currentStep // Preserve current step
      await fetchItem()
      setCurrentStep(currentStepValue) // Restore step after refresh
      setShowOverride(false)
      setOverrideBuyPrice("")
      setOverrideConsignPrice("")
      setOverrideReason("")
      setOverrideNotes("")
    } catch (error) {
      console.error("Failed to revert override:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/inspections/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" })
      })

      if (!response.ok) throw new Error("Failed to approve item")
      
      router.push(`/dashboard/incoming`)
    } catch (error) {
      console.error("Failed to approve item:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading item...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Item not found</p>
        <Button className="mt-4" onClick={() => router.push(`/dashboard/incoming`)}>
          Back to Incoming Gear
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push(`/dashboard/incoming`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Item</h1>
        </div>
        {item.verifiedItem?.locked && (
          <Badge className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Approved & Locked
          </Badge>
        )}
      </div>

      {/* Stepper */}
      <InspectionStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(index) => {
          // Only allow navigation if product is selected
          if (selectedProduct && index <= currentStep) {
            setCurrentStep(index)
          }
        }}
        allowStepNavigation={!!selectedProduct}
      />

      {/* Step Content */}
      <div className="mt-8">
        {/* STEP 1: IDENTIFY PRODUCT */}
        {currentStep === 0 && (
          <div className="relative">
            <Card className="p-6 pb-24">
              <h2 className="text-xl font-semibold mb-4">Identify Product</h2>
              <p className="text-gray-600 mb-6">
                Search for and select the canonical product that matches this item
              </p>

              <ProductSearch
                value={selectedProduct?.id}
                onSelect={handleProductSelect}
                onClear={() => setSelectedProduct(null)}
              />
            </Card>

            {/* Fixed Next Button at Bottom Right */}
            <div className="fixed bottom-8 right-8 z-10">
              <Button 
                onClick={() => setCurrentStep(1)}
                disabled={!selectedProduct}
                className={`${!selectedProduct ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Next: Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFY */}
        {currentStep === 1 && selectedProduct && (
          <div className="space-y-6">
            {/* Condition */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Condition Assessment</h3>
              <div className="space-y-3">
                {Object.entries(CONDITION_MULTIPLIERS).map(([key, config]) => (
                  <label
                    key={key}
                    className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor: verifiedCondition === key ? "#3b82f6" : "#e5e7eb"
                    }}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value={key}
                      checked={verifiedCondition === key}
                      onChange={(e) => setVerifiedCondition(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{config.label}</span>
                        <Badge variant="secondary">{(config.multiplier * 100).toFixed(0)}%</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* Serial Number */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Serial Number</h3>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Enter serial number"
                className="font-mono"
              />
            </Card>

            {/* Questions */}
            {questions.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Verification Questions</h3>
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900">{q.question}</p>
                        {q.category && (
                          <Badge variant="secondary" className="text-xs">{q.category}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mb-2">
                        {["YES", "NO", "NOT_TESTED"].map((option) => (
                          <Button
                            key={option}
                            size="sm"
                            variant={answers[q.question]?.answer === option ? "default" : "outline"}
                            onClick={() => setAnswers({
                              ...answers,
                              [q.question]: { ...answers[q.question], answer: option }
                            })}
                          >
                            {option.replace("_", " ")}
                          </Button>
                        ))}
                      </div>
                      <Input
                        placeholder="Optional notes..."
                        value={answers[q.question]?.notes || ""}
                        onChange={(e) => setAnswers({
                          ...answers,
                          [q.question]: { ...answers[q.question], notes: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Accessories */}
            {(accessories.length > 0 || customAccessories.length > 0) && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Accessories Checklist</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Default accessories */}
                  {accessories.map((acc) => {
                    const isChecked = accessoryStates[acc.accessoryName]?.isPresent || false
                    return (
                      <div key={acc.id} className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setAccessoryStates({
                              ...accessoryStates,
                              [acc.accessoryName]: {
                                ...accessoryStates[acc.accessoryName],
                                isPresent: e.target.checked
                              }
                            })}
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-sm flex-1">{acc.accessoryName}</span>
                          {!isChecked && acc.penaltyAmount && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              -{formatPrice(acc.penaltyAmount)}
                            </Badge>
                          )}
                        </div>
                        <Input
                          placeholder="Notes (optional)"
                          value={accessoryStates[acc.accessoryName]?.notes || ""}
                          onChange={(e) => setAccessoryStates({
                            ...accessoryStates,
                            [acc.accessoryName]: {
                              ...accessoryStates[acc.accessoryName],
                              notes: e.target.value
                            }
                          })}
                          className="text-xs h-8"
                        />
                      </div>
                    )
                  })}
                  
                  {/* Custom accessories */}
                  {customAccessories.map((accName, index) => {
                    const isChecked = accessoryStates[accName]?.isPresent || false
                    return (
                      <div key={`custom-${index}`} className="p-3 space-y-2 border-l-2 border-blue-400">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setAccessoryStates({
                              ...accessoryStates,
                              [accName]: {
                                ...accessoryStates[accName],
                                isPresent: e.target.checked
                              }
                            })}
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-sm flex-1">{accName}</span>
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                          <button
                            onClick={() => {
                              setCustomAccessories(customAccessories.filter(a => a !== accName))
                              const newStates = { ...accessoryStates }
                              delete newStates[accName]
                              setAccessoryStates(newStates)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Input
                          placeholder="Notes (optional)"
                          value={accessoryStates[accName]?.notes || ""}
                          onChange={(e) => setAccessoryStates({
                            ...accessoryStates,
                            [accName]: {
                              ...accessoryStates[accName],
                              notes: e.target.value
                            }
                          })}
                          className="text-xs h-8"
                        />
                      </div>
                    )
                  })}
                </div>
                
                {/* Add custom accessory */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Add Custom Accessory</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Accessory name (e.g., Extra Battery)"
                      value={newAccessoryName}
                      onChange={(e) => setNewAccessoryName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newAccessoryName.trim()) {
                            setCustomAccessories([...customAccessories, newAccessoryName.trim()])
                            setAccessoryStates({
                              ...accessoryStates,
                              [newAccessoryName.trim()]: { isPresent: false, notes: "" }
                            })
                            setNewAccessoryName("")
                          }
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (newAccessoryName.trim()) {
                          setCustomAccessories([...customAccessories, newAccessoryName.trim()])
                          setAccessoryStates({
                            ...accessoryStates,
                            [newAccessoryName.trim()]: { isPresent: false, notes: "" }
                          })
                          setNewAccessoryName("")
                        }
                      }}
                      disabled={!newAccessoryName.trim()}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* General Notes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">General Notes</h3>
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={4}
                placeholder="Additional notes, issues, or observations..."
              />
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleVerify} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save & Continue to Pricing"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PRICING */}
        {currentStep === 2 && item.verifiedItem?.pricingSnapshot && (
          <div className="space-y-6">
            {/* Auto Pricing Display */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📊 Auto-Computed Pricing
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Base Prices (from Product):</p>
                  <p className="text-sm">
                    <span className="text-gray-700">Buy Range:</span>{" "}
                    <span className="font-medium">
                      {formatPrice(selectedProduct!.buyPriceMin)} - {formatPrice(selectedProduct!.buyPriceMax)}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-700">Consign Range:</span>{" "}
                    <span className="font-medium">
                      {formatPrice(selectedProduct!.consignPriceMin)} - {formatPrice(selectedProduct!.consignPriceMax)}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Condition Applied:</p>
                  <p className="text-sm font-medium">
                    {item.verifiedItem.verifiedCondition.replace(/_/g, " ")} (
                    {(item.verifiedItem.pricingSnapshot.conditionMultiplier * 100).toFixed(0)}%)
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    Computed Buy: <span className="font-medium">{formatPrice(item.verifiedItem.pricingSnapshot.computedBuyPrice)}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Computed Consign: <span className="font-medium">{formatPrice(item.verifiedItem.pricingSnapshot.computedConsignPrice)}</span>
                  </p>
                </div>
              </div>

              {item.verifiedItem.pricingSnapshot.accessoryPenalty > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-300">
                  <p className="text-sm text-red-700 font-medium">
                    Accessory Penalty: -{formatPrice(item.verifiedItem.pricingSnapshot.accessoryPenalty)}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-blue-300">
                <p className="text-sm text-gray-700 mb-1">Final Auto Prices:</p>
                <div className="flex gap-6">
                  <p className="text-lg font-bold text-blue-900">
                    Buy: {formatPrice(item.verifiedItem.pricingSnapshot.finalBuyPrice)}
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    Consign: {formatPrice(item.verifiedItem.pricingSnapshot.finalConsignPrice)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Override Section - Admin Only */}
            {session?.user?.role === "ADMIN" && (
              <Card className="p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-6 p-6 rounded-t-lg transition-colors"
                  onClick={() => setShowOverride(!showOverride)}
                >
                  <h3 className="text-lg font-semibold">Price Override</h3>
                  {showOverride ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {showOverride && (
                <div className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buy Price Override (R)
                      </label>
                      <Input
                        type="number"
                        value={overrideBuyPrice}
                        onChange={(e) => setOverrideBuyPrice(e.target.value)}
                        placeholder="Leave empty to use auto"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Consign Price Override (R)
                      </label>
                      <Input
                        type="number"
                        value={overrideConsignPrice}
                        onChange={(e) => setOverrideConsignPrice(e.target.value)}
                        placeholder="Leave empty to use auto"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Override Reason <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a reason...</option>
                      <option value="MARKET_RESEARCH">Market Research</option>
                      <option value="DEMAND_HIGH">High Demand</option>
                      <option value="DEMAND_LOW">Low Demand</option>
                      <option value="CONDITION_EXCEPTION">Condition Exception</option>
                      <option value="CLIENT_NEGOTIATION">Client Negotiation</option>
                      <option value="BULK_DISCOUNT">Bulk Discount</option>
                      <option value="DAMAGED_NOT_OBVIOUS">Hidden Damage</option>
                      <option value="RARE_ITEM">Rare/Collectible Item</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {overrideReason === "OTHER" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes <span className="text-red-600">*</span>
                      </label>
                      <Textarea
                        value={overrideNotes}
                        onChange={(e) => setOverrideNotes(e.target.value)}
                        rows={3}
                        placeholder="Explain the reason for override..."
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleApplyOverride} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      Apply Override
                    </Button>
                    {item.verifiedItem.priceOverride && (
                      <Button variant="outline" onClick={handleRevertOverride} disabled={saving}>
                        <X className="h-4 w-4 mr-2" />
                        Revert to Auto
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {item.verifiedItem.priceOverride && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    ✓ Price Override Applied
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Reason:</span> {item.verifiedItem.priceOverride.overrideReason.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">By:</span> {item.verifiedItem.priceOverride.overriddenBy.name}
                  </p>
                  {item.verifiedItem.priceOverride.notes && (
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Notes:</span> {item.verifiedItem.priceOverride.notes}
                    </p>
                  )}
                </div>
              )}
              </Card>
            )}

            {/* Final Prices */}
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="text-lg font-semibold mb-4">💰 Final Prices</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Buy Price:</p>
                  <div className="text-2xl font-bold text-green-900 flex items-center gap-2">
                    <span>
                      {formatPrice(
                        item.verifiedItem.priceOverride?.overrideBuyPrice ??
                        item.verifiedItem.pricingSnapshot.finalBuyPrice
                      )}
                    </span>
                    {item.verifiedItem.priceOverride?.overrideBuyPrice && (
                      <Badge className="bg-yellow-100 text-yellow-800">Overridden</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Consignment Price:</p>
                  <div className="text-2xl font-bold text-green-900 flex items-center gap-2">
                    <span>
                      {formatPrice(
                        item.verifiedItem.priceOverride?.overrideConsignPrice ??
                        item.verifiedItem.pricingSnapshot.finalConsignPrice
                      )}
                    </span>
                    {item.verifiedItem.priceOverride?.overrideConsignPrice && (
                      <Badge className="bg-yellow-100 text-yellow-800">Overridden</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Verification
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Next: Approve
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: APPROVE */}
        {currentStep === 3 && item.verifiedItem && (
          <div className="space-y-6">
            {/* Comparison Table */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Comparison Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Field</th>
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Client Submitted</th>
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 font-medium">Name</td>
                      <td className="py-3 px-4">{item.clientName}</td>
                      <td className="py-3 px-4">{item.verifiedItem.product.name}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 font-medium">Brand</td>
                      <td className="py-3 px-4">{item.clientBrand || "-"}</td>
                      <td className="py-3 px-4">{item.verifiedItem.product.brand}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 font-medium">Model</td>
                      <td className="py-3 px-4">{item.clientModel || "-"}</td>
                      <td className="py-3 px-4">{item.verifiedItem.product.model}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 font-medium">Condition</td>
                      <td className="py-3 px-4">{item.clientCondition || "-"}</td>
                      <td className="py-3 px-4">{item.verifiedItem.verifiedCondition.replace(/_/g, " ")}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 font-medium">Serial Number</td>
                      <td className="py-3 px-4 font-mono text-sm">{item.clientSerialNumber || "-"}</td>
                      <td className="py-3 px-4 font-mono text-sm">{item.verifiedItem.serialNumber || "-"}</td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-green-50">
                      <td className="py-3 px-4 font-medium">Buy Price</td>
                      <td className="py-3 px-4">N/A</td>
                      <td className="py-3 px-4 font-bold text-green-900">
                        {formatPrice(
                          item.verifiedItem.priceOverride?.overrideBuyPrice ??
                          item.verifiedItem.pricingSnapshot?.finalBuyPrice ?? 0
                        )}
                      </td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="py-3 px-4 font-medium">Consign Price</td>
                      <td className="py-3 px-4">N/A</td>
                      <td className="py-3 px-4 font-bold text-green-900">
                        {formatPrice(
                          item.verifiedItem.priceOverride?.overrideConsignPrice ??
                          item.verifiedItem.pricingSnapshot?.finalConsignPrice ?? 0
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">Questions Answered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.verifiedItem.answers.length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">Accessories Present</p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.verifiedItem.accessories.filter(a => a.isPresent).length} / {item.verifiedItem.accessories.length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">Price Overridden</p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.verifiedItem.priceOverride ? "Yes" : "No"}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Badge className={item.verifiedItem.locked ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                  {item.verifiedItem.locked ? "Approved" : "Ready"}
                </Badge>
              </Card>
            </div>

            {/* Approval Status */}
            {item.verifiedItem.approvedAt ? (
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Item Approved & Locked</h3>
                </div>
                <p className="text-sm text-gray-700">
                  Approved by <span className="font-medium">{item.verifiedItem.approvedBy?.name}</span> on{" "}
                  {new Date(item.verifiedItem.approvedAt).toLocaleString("en-ZA")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/dashboard/incoming`)}
                >
                  Back to Incoming Gear
                </Button>
              </Card>
            ) : (
              <>
                {/* Actions */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Pricing
                  </Button>
                  <Button onClick={handleApprove} disabled={saving} size="lg">
                    <Check className="h-5 w-5 mr-2" />
                    {saving ? "Approving..." : "Approve & Lock Item"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => {
          setShowAddProductModal(false)
          setPendingProductData(null)
        }}
        initialSearchTerm={item?.clientName || ""}
        onSubmit={handleAddProductSubmit}
      />

      {/* Admin Approval Modal */}
      <AdminApprovalModal
        isOpen={showAdminApprovalModal}
        onClose={() => {
          setShowAdminApprovalModal(false)
          setPendingProductData(null)
        }}
        onApprove={handleAdminApproval}
        loading={addingProduct}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  )
}
