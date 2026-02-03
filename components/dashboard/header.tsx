"use client"

import { useSession } from "next-auth/react"
import { Bell, User } from "lucide-react"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
      <div className="flex-1">
        {/* Search or breadcrumbs can go here */}
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-full">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
            <p className="text-xs text-gray-500">{session?.user?.role}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  )
}
