"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ClipboardCheck, RefreshCw, ExternalLink, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Review = {
  id: string
  catalog_item_id: string
  lensfun_lens_id: string
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "AUTO_APPLIED"
  confidence_score: number
  match_reasons: any
  suggested_specs: any
  specs_before: any
  specs_after: any | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  reviewed_by_user_id: string | null
  review_note: string | null
  make: string | null
  output_text: string | null
  product_type: string | null
  is_active: boolean
  current_specs: any
}

function getKeySuggestedSpecs(s: any): {
  mount?: string
  focal?: string
  aperture?: string
} {
  if (!s) return {}
  const mounts = Array.isArray(s.mounts) ? s.mounts : []
  const mount = s.mount || mounts[0]
  const focalMin = s.focal_min_mm
  const focalMax = s.focal_max_mm
  const apertureMin = s.aperture_min
  const apertureMax = s.aperture_max

  const focal = focalMin ? `${focalMin}${focalMax ? `–${focalMax}` : ""}mm` : undefined
  const aperture = apertureMin ? `f${apertureMin}${apertureMax ? `–${apertureMax}` : ""}` : undefined
  return { mount, focal, aperture }
}

export default function EnrichmentReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ pending_review_count: number; by_status: Record<string, number> }>({
    pending_review_count: 0,
    by_status: {},
  })
  const [status, setStatus] = useState<string>("PENDING_REVIEW")
  const [q, setQ] = useState("")
  const [reviews, setReviews] = useState<Review[]>([])
  const [noteById, setNoteById] = useState<Record<string, string>>({})
  const [overwriteById, setOverwriteById] = useState<Record<string, boolean>>({})
  
  // Edit modal state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, listRes] = await Promise.all([
        fetch("/api/admin/enrichment-reviews/summary"),
        fetch(`/api/admin/enrichment-reviews?status=${encodeURIComponent(status)}&page=1&pageSize=200&q=${encodeURIComponent(q)}`),
      ])
      if (sRes.ok) setSummary(await sRes.json())
      if (listRes.ok) {
        const data = await listRes.json()
        setReviews(data.reviews || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return reviews
    return reviews.filter((r) => {
      return (r.make || "").toLowerCase().includes(term) || (r.output_text || "").toLowerCase().includes(term)
    })
  }, [reviews, q])

  const rescanRefreshBadges = () => {
    window.dispatchEvent(new Event("refreshNotificationCounts"))
  }

  const handleApprove = async (id: string) => {
    const note = (noteById[id] || "").trim()
    if (!note) {
      alert("Note is required.")
      return
    }
    setActionLoadingId(id)
    try {
      const overwrite = !!overwriteById[id]
      const res = await fetch(`/api/admin/enrichment-reviews/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite, note }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Approve failed")
        return
      }
      await load()
      rescanRefreshBadges()
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (id: string) => {
    const note = (noteById[id] || "").trim()
    if (!note) {
      alert("Rejection note is required.")
      return
    }
    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/admin/enrichment-reviews/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Reject failed")
        return
      }
      await load()
      rescanRefreshBadges()
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleEditItem = async (catalogItemId: string) => {
    setEditingItemId(catalogItemId)
    setEditingItem(null)
    setEditError(null)
    setEditLoading(true)
    
    try {
      const res = await fetch(`/api/admin/catalog/items/${catalogItemId}`)
      
      if (res.ok) {
        const data = await res.json()
        setEditingItem(data.item || data)
        setEditError(null)
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        setEditError(errorData.error || `Failed to load item (${res.status})`)
      }
    } catch (error) {
      console.error("Failed to load item:", error)
      setEditError("Network error: Could not load catalog item")
    } finally {
      setEditLoading(false)
    }
  }

  const handleSaveItem = async () => {
    if (!editingItem || !editingItemId) return
    
    setEditLoading(true)
    setEditError(null)
    
    try {
      const res = await fetch(`/api/admin/catalog/items/${editingItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specifications: editingItem.specifications,
          is_active: editingItem.is_active
        })
      })
      
      if (res.ok) {
        // Success - close modal and refresh
        setEditingItemId(null)
        setEditingItem(null)
        setEditError(null)
        await load()
        
        // Trigger blocking issues rescan
        window.dispatchEvent(new Event("refreshNotificationCounts"))
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        setEditError(err.error || "Failed to update item")
      }
    } catch (error) {
      console.error("Failed to save item:", error)
      setEditError("Network error: Could not save changes")
    } finally {
      setEditLoading(false)
    }
  }

  const updateEditField = (path: string, value: any) => {
    setEditingItem((prev: any) => {
      if (!prev) return prev
      const specs = { ...prev.specifications }
      specs[path] = value
      return { ...prev, specifications: specs }
    })
  }

  const statusOptions = ["PENDING_REVIEW", "APPROVED", "REJECTED", "AUTO_APPLIED", "SUPERSEDED"]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-orange-600" />
            Pending Enrichment Reviews
          </h1>
          <p className="text-gray-600 mt-1">
            Approve or reject Lens spec suggestions. Default approval is non-destructive (fills only NULL fields).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <a href="/dashboard/settings/database/catalog_items" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open catalog_items
            </Button>
          </a>
        </div>
      </div>

      <Card className="border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="text-orange-900">Summary</CardTitle>
          <CardDescription className="text-orange-700">
            Pending review: <strong>{summary.pending_review_count}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statusOptions.map((s) => (
              <div key={s} className="border rounded-lg p-3 bg-white">
                <div className="text-xs text-gray-500">Status</div>
                <div className="font-semibold text-gray-900">{s}</div>
                <div className="text-sm text-orange-700 mt-1">{summary.by_status?.[s] || 0}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <div className="w-72">
              <Select value={status} onChange={(e: any) => setStatus(e.target.value)} className="w-full">
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by make/output_text..." />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-600">No reviews found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => {
                const key = getKeySuggestedSpecs(r.suggested_specs)
                const busy = actionLoadingId === r.id
                return (
                  <Card key={r.id} className="border-gray-200">
                    <CardHeader className="py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="text-lg">
                            {r.make || "?"} — {r.output_text || "?"}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <div className="text-gray-700">
                              Confidence: <strong>{Number(r.confidence_score).toFixed(3)}</strong> • Status:{" "}
                              <strong>{r.status}</strong>
                            </div>
                            <div className="text-gray-600 mt-1">
                              Suggested:{" "}
                              {key.mount ? <span className="mr-3">Mount: <strong>{key.mount}</strong></span> : null}
                              {key.focal ? <span className="mr-3">Focal: <strong>{key.focal}</strong></span> : null}
                              {key.aperture ? <span>Aperture: <strong>{key.aperture}</strong></span> : null}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditItem(r.catalog_item_id)}
                          >
                            Edit Catalog Item
                          </Button>
                          <a href="/dashboard/settings/database/catalog_enrichment_suggestions" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View (DB)
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 space-y-3">
                      <details className="border rounded-lg p-3 bg-gray-50">
                        <summary className="cursor-pointer text-sm font-medium text-gray-800">
                          Compare: specs_before vs suggested_specs
                        </summary>
                        <div className="grid md:grid-cols-2 gap-3 mt-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">specs_before</div>
                            <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(r.specs_before, null, 2)}</pre>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">suggested_specs</div>
                            <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(r.suggested_specs, null, 2)}</pre>
                          </div>
                        </div>
                      </details>

                      {r.status === "PENDING_REVIEW" && (
                        <div className="border rounded-lg p-3 space-y-3">
                          <div className="text-sm font-medium text-gray-900">Review action</div>
                          <Textarea
                            value={noteById[r.id] || ""}
                            onChange={(e) => setNoteById((p) => ({ ...p, [r.id]: e.target.value }))}
                            placeholder="Review note (required)..."
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!overwriteById[r.id]}
                              onChange={(e) => setOverwriteById((p) => ({ ...p, [r.id]: e.target.checked }))}
                            />
                            <span className="text-sm text-gray-700">
                              Approve + overwrite lens spec keys (requires note; only applies to mount/focal/aperture keys)
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleApprove(r.id)} disabled={busy}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button variant="outline" onClick={() => handleReject(r.id)} disabled={busy}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Back to{" "}
        <Link href="/dashboard/settings" className="text-blue-600 hover:underline">
          Settings
        </Link>
      </div>

      {/* Edit Catalog Item Modal */}
      {editingItemId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Edit Catalog Item</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingItemId(null)
                    setEditingItem(null)
                  }}
                >
                  ✕
                </Button>
              </div>
              <CardDescription>
                ID: {editingItemId}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {editError ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-700">{editError}</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingItemId(null)
                      setEditingItem(null)
                      setEditError(null)
                    }}
                  >
                    Close
                  </Button>
                </div>
              ) : editLoading && !editingItem ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
                  <div className="text-sm text-gray-600">Loading catalog item...</div>
                </div>
              ) : editingItem ? (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Make</div>
                    <div className="text-base">{editingItem.make || "N/A"}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Output Text</div>
                    <div className="text-base">{editingItem.output_text || "N/A"}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Product Type</div>
                    <div className="text-base">{editingItem.product_type || "N/A"}</div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Specifications</div>
                    
                    {/* Mount */}
                    <div className="space-y-2 mb-3">
                      <label className="text-sm font-medium text-gray-700">Mount</label>
                      <Input
                        value={editingItem.specifications?.mount || ""}
                        onChange={(e) => updateEditField("mount", e.target.value || null)}
                        placeholder="e.g., Canon EF, Nikon F"
                      />
                    </div>

                    {/* Focal Length */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Focal Min (mm)</label>
                        <Input
                          type="number"
                          value={editingItem.specifications?.focal_min_mm || ""}
                          onChange={(e) => updateEditField("focal_min_mm", e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="e.g., 24"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Focal Max (mm)</label>
                        <Input
                          type="number"
                          value={editingItem.specifications?.focal_max_mm || ""}
                          onChange={(e) => updateEditField("focal_max_mm", e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="e.g., 70"
                        />
                      </div>
                    </div>

                    {/* Aperture */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Aperture Min</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingItem.specifications?.aperture_min || ""}
                          onChange={(e) => updateEditField("aperture_min", e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="e.g., 2.8"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Aperture Max</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingItem.specifications?.aperture_max || ""}
                          onChange={(e) => updateEditField("aperture_max", e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="e.g., 4"
                        />
                      </div>
                    </div>

                    {/* Is Active */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={editingItem.is_active || false}
                        onChange={(e) => setEditingItem((prev: any) => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Is Active</span>
                    </div>
                  </div>

                  {/* Raw JSON View */}
                  <details className="border rounded-lg p-3 bg-gray-50">
                    <summary className="cursor-pointer text-sm font-medium text-gray-800">
                      View Full Specifications (JSON)
                    </summary>
                    <pre className="text-xs overflow-auto max-h-64 mt-2">
                      {JSON.stringify(editingItem.specifications, null, 2)}
                    </pre>
                  </details>

                  {/* Error Display */}
                  {editError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-700">{editError}</div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={handleSaveItem}
                      disabled={editLoading}
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingItemId(null)
                        setEditingItem(null)
                        setEditError(null)
                      }}
                      disabled={editLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No item data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

