"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Shield, Loader2 } from "lucide-react"

interface Admin {
  id: string
  name: string
  email: string
}

interface AdminApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onApprove: (adminId: string, password: string) => Promise<void>
  loading?: boolean
}

export function AdminApprovalModal({ isOpen, onClose, onApprove, loading = false }: AdminApprovalModalProps) {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState("")
  const [password, setPassword] = useState("")
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchAdmins()
      setPassword("")
      setError("")
    }
  }, [isOpen])

  const fetchAdmins = async () => {
    setLoadingAdmins(true)
    try {
      const response = await fetch("/api/admin/list")
      const data = await response.json()
      setAdmins(data.admins || [])
      if (data.admins && data.admins.length > 0) {
        setSelectedAdmin(data.admins[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error)
      setError("Failed to load admin list")
    } finally {
      setLoadingAdmins(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedAdmin || !password) {
      setError("Please select an admin and enter password")
      return
    }

    try {
      await onApprove(selectedAdmin, password)
    } catch (error: any) {
      setError(error.message || "Approval failed")
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Approval Required" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Authorization Required</h3>
          </div>
          <p className="text-sm text-amber-700">
            Adding a new product to the database requires admin approval. Please select an admin and enter their password to continue.
          </p>
        </div>

        {loadingAdmins ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Loading admins...</p>
          </div>
        ) : (
          <>
            <div>
              <Label>Select Admin *</Label>
              <Select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                required
              >
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name} ({admin.email})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Admin Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={loading || !selectedAdmin || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Product...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Approve & Add Product
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
