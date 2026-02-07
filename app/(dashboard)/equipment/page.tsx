"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Vendor {
  id: string
  name: string
}

interface Equipment {
  id: string
  sku: string
  name: string
  brand: string | null
  model: string | null
  condition: string | null
  status: string
  vendors: Vendor | null
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await fetch("/api/equipment")
        if (!response.ok) {
          throw new Error("Failed to fetch equipment")
        }
        const data = await response.json()
        setEquipment(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchEquipment()
  }, [])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING_INSPECTION":
        return "warning"
      case "IN_REPAIR":
        return "destructive"
      case "REPAIR_COMPLETED":
        return "default"
      case "READY_FOR_SALE":
        return "success"
      case "RESERVED":
        return "secondary"
      case "SOLD":
        return "secondary"
      case "RETURNED_TO_VENDOR":
        return "secondary"
      case "RETIRED":
        return "secondary"
      case "INSPECTED":
        return "success"
      default:
        return "default"
    }
  }

  const getConditionVariant = (condition: string | null) => {
    switch (condition) {
      case "NEW":
      case "MINT":
        return "success"
      case "EXCELLENT":
      case "GOOD":
        return "default"
      case "FAIR":
        return "warning"
      case "POOR":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatStatus = (status: string) => {
    const statusLabels: Record<string, string> = {
      PENDING_INSPECTION: "Pending Onboarding",
      INSPECTED: "Onboarded",
      IN_REPAIR: "In Repair",
      REPAIR_COMPLETED: "Repair Completed",
      READY_FOR_SALE: "Ready for Sale",
      RESERVED: "Reserved",
      SOLD: "Sold",
      RETURNED_TO_VENDOR: "Returned to Vendor",
      RETIRED: "Retired"
    }
    return statusLabels[status] || status.replace(/_/g, " ")
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
        <p className="text-gray-500 mt-1">Manage your equipment inventory</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading equipment: {error}
        </div>
      ) : equipment.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
          No equipment found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vendor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.brand || "—"}</TableCell>
                  <TableCell>{item.model || "—"}</TableCell>
                  <TableCell>
                    {item.condition ? (
                      <Badge variant={getConditionVariant(item.condition)}>
                        {item.condition}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)}>
                      {formatStatus(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.vendors?.name || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
