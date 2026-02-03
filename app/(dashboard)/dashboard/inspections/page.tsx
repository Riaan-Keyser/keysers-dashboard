"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { Plus, Package, Clock, CheckCircle2, PauseCircle, XCircle } from "lucide-react"

interface InspectionSession {
  id: string
  sessionName: string
  shipmentReference: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  vendor: {
    id: string
    name: string
  } | null
  createdBy: {
    id: string
    name: string
    email: string
  }
  incomingItems: Array<{
    id: string
    inspectionStatus: string
  }>
}

const statusConfig = {
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2
  },
  PARTIALLY_COMPLETED: {
    label: "Partially Completed",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Package
  },
  ON_HOLD: {
    label: "On Hold",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: PauseCircle
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle
  }
}

export default function InspectionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<InspectionSession[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  useEffect(() => {
    fetchSessions()
  }, [statusFilter])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const url = statusFilter === "ALL" 
        ? "/api/inspections"
        : `/api/inspections?status=${statusFilter}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch sessions")
      }
      
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error("Failed to fetch inspection sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const getItemStats = (items: InspectionSession["incomingItems"]) => {
    const total = items.length
    const verified = items.filter(item => 
      ["VERIFIED", "APPROVED"].includes(item.inspectionStatus)
    ).length
    const approved = items.filter(item => item.inspectionStatus === "APPROVED").length
    
    return { total, verified, approved }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return <Badge variant="secondary">{status}</Badge>
    
    const Icon = config.icon
    return (
      <Badge className={`${config.color} flex items-center gap-1 px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gear Inspections</h1>
            <p className="text-gray-500 mt-1">Verify and approve incoming camera equipment</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading inspection sessions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gear Inspections</h1>
          <p className="text-gray-500 mt-1">Verify and approve incoming camera equipment</p>
        </div>
        <Button onClick={() => router.push("/dashboard/inspections/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Inspection Session
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="ALL">All Sessions</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIALLY_COMPLETED">Partially Completed</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <div className="ml-auto text-sm text-gray-600">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </div>
        </div>
      </Card>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inspection sessions found</h3>
            <p className="text-gray-500 mb-6">
              {statusFilter === "ALL" 
                ? "Get started by creating your first inspection session"
                : `No sessions with status "${statusFilter}"`
              }
            </p>
            {statusFilter === "ALL" && (
              <Button onClick={() => router.push("/dashboard/inspections/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Inspection Session
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const { total, verified, approved } = getItemStats(session.incomingItems)
            
            return (
              <Card
                key={session.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/inspections/${session.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {session.sessionName}
                      </h3>
                      <StatusBadge status={session.status} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      {/* Vendor */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vendor</p>
                        <p className="text-sm font-medium text-gray-900">
                          {session.vendor?.name || "No vendor"}
                        </p>
                      </div>

                      {/* Shipment Reference */}
                      {session.shipmentReference && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                            Shipment Ref
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {session.shipmentReference}
                          </p>
                        </div>
                      )}

                      {/* Items Progress */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Items</p>
                        <p className="text-sm font-medium text-gray-900">
                          {total} total
                          <span className="text-gray-500 ml-2">
                            ({approved} approved, {verified} verified)
                          </span>
                        </p>
                      </div>

                      {/* Created */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(session.createdAt)}
                        </p>
                        <p className="text-xs text-gray-500">by {session.createdBy.name}</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {session.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 line-clamp-2">{session.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  <div className="ml-6 text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {total > 0 ? Math.round((approved / total) * 100) : 0}%
                    </div>
                    <p className="text-xs text-gray-500">Complete</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
