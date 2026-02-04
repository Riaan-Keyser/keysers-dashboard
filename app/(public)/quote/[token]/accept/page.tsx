"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check } from "lucide-react"

export default function AcceptRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  useEffect(() => {
    // Small delay for better UX, then redirect to details form
    const timer = setTimeout(() => {
      router.push(`/quote/${token}/details`)
    }, 1500)

    return () => clearTimeout(timer)
  }, [token, router])

  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-md">
        <div className="mb-6 relative">
          <div className="animate-pulse rounded-full h-24 w-24 bg-green-100 mx-auto flex items-center justify-center">
            <Check className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Quote Accepted!</h2>
        <p className="text-lg text-gray-600 mb-2">
          Thank you for accepting our offer.
        </p>
        <p className="text-gray-500">
          Redirecting you to the details form...
        </p>
        <div className="mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}
