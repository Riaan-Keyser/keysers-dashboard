"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Wrench, 
  DollarSign, 
  Settings,
  LogOut,
  ShoppingCart,
  BarChart3,
  MessageCircle,
  PackagePlus,
  CreditCard,
  Calendar,
  Upload,
  ClipboardCheck,
  Webhook
} from "lucide-react"
import { signOut } from "next-auth/react"

interface NavItem {
  name: string
  href: string
  icon: any
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Incoming Gear", href: "/dashboard/incoming", icon: PackagePlus },
  { name: "Awaiting Payment", href: "/dashboard/awaiting-payment", icon: CreditCard },
  { name: "Uploading Stock", href: "/dashboard/uploading-stock", icon: Upload },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Consignment", href: "/dashboard/consignment", icon: ShoppingCart },
  { name: "Clients", href: "/dashboard/vendors", icon: Users },
  { name: "Repairs", href: "/dashboard/repairs", icon: Wrench },
  { name: "Pricing", href: "/dashboard/pricing", icon: DollarSign },
  { name: "WhatsApp Messages", href: "/dashboard/whatsapp", icon: MessageCircle },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Enrichment Reviews", href: "/dashboard/settings/enrichment-reviews", icon: ClipboardCheck },
  { name: "Webhook Events", href: "/dashboard/settings/webhook-events", icon: Webhook },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [notificationCounts, setNotificationCounts] = useState({
    calendar: 0,
    incomingGear: 0,
    awaitingPayment: 0,
    uploadingStock: 0,
    inventory: 0,
    consignment: 0,
    repairs: 0,
    blockingCatalogIssues: 0,
    pendingEnrichmentReviews: 0,
    failedWebhooks: 0,
  })

  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        const response = await fetch("/api/notifications/counts")
        if (response.ok) {
          const counts = await response.json()
          setNotificationCounts(counts)
        }
      } catch (error) {
        console.error("Failed to fetch notification counts:", error)
      }
    }

    const fetchBlockingCatalogIssues = async () => {
      try {
        const response = await fetch("/api/admin/catalog/issues/summary")
        if (!response.ok) return
        const data = await response.json()
        setNotificationCounts((prev) => ({
          ...prev,
          blockingCatalogIssues: data.open_blocking_count || 0,
        }))
      } catch {
        // ignore
      }
    }

    const fetchPendingEnrichmentReviews = async () => {
      try {
        const response = await fetch("/api/admin/enrichment-reviews/summary")
        if (!response.ok) return
        const data = await response.json()
        setNotificationCounts((prev) => ({
          ...prev,
          pendingEnrichmentReviews: data.pending_review_count || 0,
        }))
      } catch {
        // ignore
      }
    }

    const fetchFailedWebhooks = async () => {
      try {
        const response = await fetch("/api/admin/webhooks/events/summary")
        if (!response.ok) return
        const data = await response.json()
        setNotificationCounts((prev) => ({
          ...prev,
          failedWebhooks: data.failed_not_ignored_count || 0,
        }))
      } catch {
        // ignore
      }
    }

    fetchNotificationCounts()
    fetchBlockingCatalogIssues()
    fetchPendingEnrichmentReviews()
    fetchFailedWebhooks()

    // Refresh counts every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationCounts()
      fetchBlockingCatalogIssues()
      fetchPendingEnrichmentReviews()
      fetchFailedWebhooks()
    }, 30000)
    
    // Listen for manual refresh requests from other components
    const handleRefreshCounts = () => {
      fetchNotificationCounts()
      fetchBlockingCatalogIssues()
      fetchPendingEnrichmentReviews()
      fetchFailedWebhooks()
    }
    window.addEventListener('refreshNotificationCounts', handleRefreshCounts)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('refreshNotificationCounts', handleRefreshCounts)
    }
  }, [])

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Keysers Camera</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          // Determine badge count for this nav item
          let badgeCount = 0
          if (item.href === "/dashboard/calendar") badgeCount = notificationCounts.calendar
          else if (item.href === "/dashboard/incoming") badgeCount = notificationCounts.incomingGear
          else if (item.href === "/dashboard/awaiting-payment") badgeCount = notificationCounts.awaitingPayment
          else if (item.href === "/dashboard/uploading-stock") badgeCount = notificationCounts.uploadingStock
          else if (item.href === "/dashboard/inventory") badgeCount = notificationCounts.inventory
    else if (item.href === "/dashboard/consignment") badgeCount = notificationCounts.consignment
    else if (item.href === "/dashboard/repairs") badgeCount = notificationCounts.repairs
    else if (item.href === "/dashboard/settings") badgeCount = notificationCounts.blockingCatalogIssues + notificationCounts.failedWebhooks
    else if (item.href === "/dashboard/settings/enrichment-reviews") badgeCount = notificationCounts.pendingEnrichmentReviews
    else if (item.href === "/dashboard/settings/webhook-events") badgeCount = notificationCounts.failedWebhooks
          
          const showBadge = badgeCount > 0
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
