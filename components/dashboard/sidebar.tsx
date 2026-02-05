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
  CreditCard
} from "lucide-react"
import { signOut } from "next-auth/react"

interface NavItem {
  name: string
  href: string
  icon: any
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Incoming Gear", href: "/dashboard/incoming", icon: PackagePlus },
  { name: "Awaiting Payment", href: "/dashboard/awaiting-payment", icon: CreditCard },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Vendors/Clients", href: "/dashboard/vendors", icon: Users },
  { name: "Repairs", href: "/dashboard/repairs", icon: Wrench },
  { name: "Pricing", href: "/dashboard/pricing", icon: DollarSign },
  { name: "Consignment", href: "/dashboard/consignment", icon: ShoppingCart },
  { name: "WhatsApp Messages", href: "/dashboard/whatsapp", icon: MessageCircle },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [incomingGearCount, setIncomingGearCount] = useState(0)
  const [awaitingPaymentCount, setAwaitingPaymentCount] = useState(0)
  const [repairsRequiredCount, setRepairsRequiredCount] = useState(0)

  useEffect(() => {
    // Fetch incoming gear count (inspection in progress)
    const fetchIncomingGearCount = async () => {
      try {
        const response = await fetch("/api/incoming-gear?status=INSPECTION_IN_PROGRESS")
        if (response.ok) {
          const data = await response.json()
          setIncomingGearCount(data.length || 0)
        }
      } catch (error) {
        console.error("Failed to fetch incoming gear count:", error)
      }
    }

    // Fetch awaiting payment count
    const fetchAwaitingPaymentCount = async () => {
      try {
        const response = await fetch("/api/incoming-gear?status=AWAITING_PAYMENT")
        if (response.ok) {
          const data = await response.json()
          setAwaitingPaymentCount(data.length || 0)
        }
      } catch (error) {
        console.error("Failed to fetch awaiting payment count:", error)
      }
    }

    // Fetch repairs required count
    const fetchRepairsRequiredCount = async () => {
      try {
        const response = await fetch("/api/repairs")
        if (response.ok) {
          const data = await response.json()
          const count = data.itemsRequiringRepair?.length || 0
          setRepairsRequiredCount(count)
        }
      } catch (error) {
        console.error("Failed to fetch repairs required count:", error)
      }
    }

    fetchIncomingGearCount()
    fetchAwaitingPaymentCount()
    fetchRepairsRequiredCount()

    // Refresh counts every 30 seconds
    const interval = setInterval(() => {
      fetchIncomingGearCount()
      fetchAwaitingPaymentCount()
      fetchRepairsRequiredCount()
    }, 30000)
    return () => clearInterval(interval)
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
          const showIncomingGearBadge = item.href === "/dashboard/incoming" && incomingGearCount > 0
          const showAwaitingPaymentBadge = item.href === "/dashboard/awaiting-payment" && awaitingPaymentCount > 0
          const showRepairsBadge = item.href === "/dashboard/repairs" && repairsRequiredCount > 0
          
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
              {showIncomingGearBadge && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {incomingGearCount}
                </span>
              )}
              {showAwaitingPaymentBadge && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {awaitingPaymentCount}
                </span>
              )}
              {showRepairsBadge && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {repairsRequiredCount}
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
