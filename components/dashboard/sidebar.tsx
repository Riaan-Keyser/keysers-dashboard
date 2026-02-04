"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Keysers Camera</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
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
