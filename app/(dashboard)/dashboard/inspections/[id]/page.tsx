"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/ui/modal"
import {
  ArrowLeft,
  Edit,
  Save,
  Play,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Package
} from "lucide-react"

interface IncomingItem {
  id: string
  clientName: string
  clientBrand: string | null
  clientModel: string | null
  clientDescription: string | null
  clientSerialNumber: string | null
  clientCondition: string | null
  clientImages: string[]
  inspectionStatus: string
  createdAt: string
  verifiedItem: {
    product: {
      name: string
      brand: string
      model: string
    }
    verifiedCondition: string
    approvedAt: string | null
    approvedBy: {
      name: string
    } | null
  } | null
}

interface InspectionSession {
  id: string
  sessionName: string
  shipmentReference: string | null
  status: string
  notes: string | null
  createdAt: string
  completedAt: string | null
  vendor: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
  createdBy: {
    name: string
    email: string
  }
  incomingItems: IncomingItem[]
}

const statusColors = {
  UNVERIFIED: "bg-gray-100 text-gray-800 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  VERIFIED: "bg-purple-100 text-purple-800 border-purple-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  REOPENED: "bg-yellow-100 text-yellow-800 border-yellow-200"
}

export default function InspectionSessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<InspectionSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editedSession, setEditedSession] = useState<Partial<InspectionSession>>({})

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inspections/${sessionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch session")
      }
      const data = await response.json()
      setSession(data.session)
      setEditedSession(data.session)
    } catch (error) {
      console.error("Failed to fetch session:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/inspections/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: editedSession.sessionName,
          shipmentReference: editedSession.shipmentReference,
          notes: editedSession.notes,
          status: editedSession.status
        })
      })

      if (!response.ok) {
        throw new Error("Failed to update session")
      }

      await fetchSession()
      setEditing(false)
    } catch (error) {
      console.error("Failed to update session:", error)
      alert("Failed to update session")
    }
  }

  const getActionButton = (item: IncomingItem) => {
    switch (item.inspectionStatus) {
      case "UNVERIFIED":
        return (
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/inspections/${sessionId}/items/${item.id}`)}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Verification
          </Button>
        )
      case "IN_PROGRESS":
      case "VERIFIED":
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/dashboard/inspections/${sessionId}/items/${item.id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Continue
          </Button>
        )
      case "APPROVED":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/inspections/${sessionId}/items/${item.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {/* TODO: Add admin-only reopen button */}
          </div>
        )
      case "REJECTED":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/inspections/${sessionId}/items/${item.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )
      default:
        return null
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Session not found</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/inspections")}>
          Back to Inspections
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/inspections")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Session</h1>
            <p className="text-gray-500 mt-1">Review and verify incoming items</p>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Session
          </Button>
        )}
      </div>

      {/* Session Details Card */}
      <Card className="p-6">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Name</label>
              <Input
                value={editedSession.sessionName || ""}
                onChange={(e) => setEditedSession({ ...editedSession, sessionName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipment Reference
              </label>
              <Input
                value={editedSession.shipmentReference || ""}
                onChange={(e) =>
                  setEditedSession({ ...editedSession, shipmentReference: e.target.value })
                }
                placeholder="e.g., SHIP-001, Tracking #12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={editedSession.status || "IN_PROGRESS"}
                onChange={(e) => setEditedSession({ ...editedSession, status: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="PARTIALLY_COMPLETED">Partially Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <Textarea
                value={editedSession.notes || ""}
                onChange={(e) => setEditedSession({ ...editedSession, notes: e.target.value })}
                rows={4}
                placeholder="Add any notes or comments about this inspection session..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Session Name</p>
              <p className="font-semibold text-gray-900">{session.sessionName}</p>
            </div>

            {session.vendor && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Vendor</p>
                <p className="font-semibold text-gray-900">{session.vendor.name}</p>
                {session.vendor.phone && (
                  <p className="text-sm text-gray-600">{session.vendor.phone}</p>
                )}
              </div>
            )}

            {session.shipmentReference && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Shipment Reference</p>
                <p className="font-semibold text-gray-900">{session.shipmentReference}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 mb-1">Created</p>
              <p className="font-semibold text-gray-900">{formatDate(session.createdAt)}</p>
              <p className="text-sm text-gray-600">by {session.createdBy.name}</p>
            </div>

            {session.notes && (
              <div className="md:col-span-2 lg:col-span-4">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-900">{session.notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Items List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Items ({session.incomingItems.length})
        </h2>

        {session.incomingItems.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in this session</h3>
              <p className="text-gray-500">Add items to start the inspection process</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {session.incomingItems.map((item) => (
              <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{item.clientName}</h3>
                      <Badge className={statusColors[item.inspectionStatus as keyof typeof statusColors]}>
                        {item.inspectionStatus.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Client Submitted Info */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Client Submitted
                        </p>
                        <div className="space-y-1 text-sm">
                          {item.clientBrand && (
                            <p>
                              <span className="text-gray-600">Brand:</span>{" "}
                              <span className="font-medium">{item.clientBrand}</span>
                            </p>
                          )}
                          {item.clientModel && (
                            <p>
                              <span className="text-gray-600">Model:</span>{" "}
                              <span className="font-medium">{item.clientModel}</span>
                            </p>
                          )}
                          {item.clientCondition && (
                            <p>
                              <span className="text-gray-600">Condition:</span>{" "}
                              <span className="font-medium">{item.clientCondition}</span>
                            </p>
                          )}
                          {item.clientSerialNumber && (
                            <p>
                              <span className="text-gray-600">Serial:</span>{" "}
                              <span className="font-medium font-mono text-xs">
                                {item.clientSerialNumber}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Verified Info */}
                      {item.verifiedItem && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                            Verified As
                          </p>
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-gray-900">
                              {item.verifiedItem.product.name}
                            </p>
                            <p>
                              <span className="text-gray-600">Condition:</span>{" "}
                              <span className="font-medium">
                                {item.verifiedItem.verifiedCondition.replace(/_/g, " ")}
                              </span>
                            </p>
                            {item.verifiedItem.approvedAt && (
                              <p className="text-xs text-green-600">
                                ✓ Approved by {item.verifiedItem.approvedBy?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {item.clientDescription && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                            Description
                          </p>
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {item.clientDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-6">{getActionButton(item)}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
