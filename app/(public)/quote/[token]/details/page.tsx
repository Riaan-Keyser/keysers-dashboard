"use client"

import { Card } from "@/components/ui/card"
import { FileText, CheckCircle } from "lucide-react"

export default function DetailsPage() {
  return (
    <div className="space-y-6">
      <Card className="p-8 md:p-12 text-center">
        <div className="mb-6">
          <div className="rounded-full h-24 w-24 bg-blue-100 mx-auto flex items-center justify-center">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Details Form
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          This is where clients will provide their details.
        </p>
        <div className="bg-green-50 rounded-lg p-6 max-w-md mx-auto">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-700 font-medium mb-2">
            ✅ Your quote has been accepted!
          </p>
          <p className="text-sm text-gray-600">
            The details collection form will be implemented in Phase 5.
          </p>
        </div>
        <p className="text-sm text-gray-500 mt-8">
          For now, we'll contact you directly at the email address you provided.
        </p>
      </Card>
    </div>
  )
}
