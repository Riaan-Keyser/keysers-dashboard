"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Mail, Clock, Package, CreditCard } from "lucide-react"
import Link from "next/link"

export default function ConfirmedPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Success Card */}
      <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="mb-6">
          <div className="rounded-full h-24 w-24 bg-green-100 mx-auto flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Quote Confirmed! 🎉
        </h1>
        
        <p className="text-lg text-gray-700 mb-2">
          Thank you for submitting your details!
        </p>
        
        <p className="text-gray-600">
          We've received your information and will contact you shortly regarding payment.
        </p>
      </Card>

      {/* What Happens Next */}
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-600" />
          What Happens Next?
        </h2>

        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">1. Confirmation Email</h3>
              <p className="text-gray-600 text-sm">
                You'll receive a confirmation email within the next few minutes with all the details of your quote.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">2. Details Review</h3>
              <p className="text-gray-600 text-sm">
                Our team will review the information you provided to ensure everything is in order.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">3. Payment Instructions</h3>
              <p className="text-gray-600 text-sm">
                Within 24 hours, we'll contact you with payment instructions and next steps.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">4. Collection Arranged</h3>
              <p className="text-gray-600 text-sm">
                Once payment is received, we'll arrange the collection of your camera equipment.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Important Information */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-gray-900 mb-3">📋 Important Information</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Keep your camera equipment safe until collection is arranged</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Check your email (including spam folder) for our confirmation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>If you don't hear from us within 24 hours, please contact us</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Quote is valid for 7 days from the date you accepted it</span>
          </li>
        </ul>
      </Card>

      {/* Contact Information */}
      <Card className="p-6 text-center">
        <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
        <p className="text-gray-600 text-sm mb-4">
          If you have any questions or concerns, please don't hesitate to contact us:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <a href="mailto:admin@keysers.co.za">
              <Mail className="h-4 w-4 mr-2" />
              admin@keysers.co.za
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="https://keysers.co.za" target="_blank">
              Visit Website
            </Link>
          </Button>
        </div>
      </Card>

      {/* Footer Text */}
      <p className="text-center text-sm text-gray-500 pb-8">
        Thank you for choosing Keysers Camera Equipment! 📸
      </p>
    </div>
  )
}
