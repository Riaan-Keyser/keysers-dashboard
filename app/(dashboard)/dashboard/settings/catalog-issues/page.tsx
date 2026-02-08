"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/ui/modal"

type Issue = {
  id: string
  catalog_item_id: string
  issue_type: string
  severity: string
  status: "OPEN" | "RESOLVED"
  message: string
  details: any
  first_detected_at: string
  last_detected_at: string
  resolved_at: string | null
  resolved_by_user_id: string | null
  resolution_note: string | null
  make: string | null
  output_text: string | null
  product_type: string | null
  is_active: boolean
}

export default function CatalogIssuesPage() {
  const [loading, setLoading] = useState(true)
  const [rescanLoading, setRescanLoading] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const [summary, setSummary] = useState<{ open_blocking_count: number; by_type: Record<string, number> }>({
    open_blocking_count: 0,
    by_type: {},
  })
  const [filterType, setFilterType] = useState<string>("")
  const [search, setSearch] = useState("")
  const [resolutionNoteById, setResolutionNoteById] = useState<Record<string, string>>({})
  const [fixingIssue, setFixingIssue] = useState<Issue | null>(null)
  const [fixLoading, setFixLoading] = useState(false)
  const [fixError, setFixError] = useState<string | null>(null)
  const [catalogItem, setCatalogItem] = useState<any | null>(null)
  const [fixForm, setFixForm] = useState<any>({
    make: "",
    output_text: "",
    product_type: "",
    is_active: false,
    buy_low: "",
    buy_high: "",
    consign_low: "",
    consign_high: "",
    specifications: {
      mount: "",
      focal_min_mm: "",
      focal_max_mm: "",
      aperture_min: "",
      aperture_max: "",
    },
  })

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, listRes] = await Promise.all([
        fetch("/api/admin/catalog/issues/summary"),
        fetch(`/api/admin/catalog/issues?status=OPEN&page=1&pageSize=200${filterType ? `&type=${encodeURIComponent(filterType)}` : ""}`),
      ])

      if (sRes.ok) setSummary(await sRes.json())
      if (listRes.ok) {
        const data = await listRes.json()
        setIssues(data.issues || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  const filteredIssues = useMemo(() => {
    if (!search.trim()) return issues
    const q = search.toLowerCase()
    return issues.filter((i) => {
      return (
        (i.output_text || "").toLowerCase().includes(q) ||
        (i.make || "").toLowerCase().includes(q) ||
        (i.issue_type || "").toLowerCase().includes(q) ||
        (i.message || "").toLowerCase().includes(q)
      )
    })
  }, [issues, search])

  const handleRescan = async () => {
    setRescanLoading(true)
    try {
      const res = await fetch("/api/admin/catalog/issues/rescan", { method: "POST" })
      if (res.ok) {
        const updated = await res.json()
        setSummary(updated)
        // reload list after rescan
        await load()
        // update sidebar badges if present
        window.dispatchEvent(new Event("refreshNotificationCounts"))
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Rescan failed")
      }
    } finally {
      setRescanLoading(false)
    }
  }

  const handleResolve = async (id: string) => {
    const note = (resolutionNoteById[id] || "").trim()
    if (!note) {
      alert("Resolution note is required.")
      return
    }
    const res = await fetch(`/api/admin/catalog/issues/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution_note: note }),
    })
    if (res.ok) {
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || "Failed to resolve issue")
    }
  }

  const openFix = async (issue: Issue) => {
    setFixingIssue(issue)
    setFixLoading(true)
    setFixError(null)
    try {
      const res = await fetch(`/api/admin/catalog/items/${issue.catalog_item_id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load catalog item")
      }
      const data = await res.json()
      const item = data.item
      setCatalogItem(item)

      const specs = item.specifications || {}
      setFixForm({
        make: item.make ?? "",
        output_text: item.output_text ?? "",
        product_type: item.product_type ?? "",
        is_active: !!item.is_active,
        buy_low: item.buy_low ?? "",
        buy_high: item.buy_high ?? "",
        consign_low: item.consign_low ?? "",
        consign_high: item.consign_high ?? "",
        specifications: {
          mount: specs.mount ?? "",
          focal_min_mm: specs.focal_min_mm ?? "",
          focal_max_mm: specs.focal_max_mm ?? "",
          aperture_min: specs.aperture_min ?? "",
          aperture_max: specs.aperture_max ?? "",
        },
      })
    } catch (e: any) {
      setFixError(e.message || "Failed to load item")
    } finally {
      setFixLoading(false)
    }
  }

  const closeFix = () => {
    setFixingIssue(null)
    setCatalogItem(null)
    setFixError(null)
  }

  const saveFix = async () => {
    if (!fixingIssue) return
    setFixLoading(true)
    setFixError(null)
    try {
      const payload: any = {}

      // Common editable fields (only send for relevant issue types)
      if (fixingIssue.issue_type === "PRICING_NULL_OR_INVALID") {
        payload.buy_low = fixForm.buy_low
        payload.buy_high = fixForm.buy_high
        payload.consign_low = fixForm.consign_low
        payload.consign_high = fixForm.consign_high
      }

      if (fixingIssue.issue_type === "REQUIRED_FIELD_VIOLATION_ON_ACTIVE") {
        payload.make = fixForm.make
        payload.output_text = fixForm.output_text
        payload.product_type = fixForm.product_type
        payload.is_active = fixForm.is_active
      }

      if (fixingIssue.issue_type === "LENS_MISSING_MOUNT") {
        payload.specifications = { mount: fixForm.specifications.mount }
      }

      if (fixingIssue.issue_type === "LENS_MISSING_FOCAL_AND_APERTURE") {
        payload.specifications = {
          focal_min_mm: fixForm.specifications.focal_min_mm,
          focal_max_mm: fixForm.specifications.focal_max_mm,
          aperture_min: fixForm.specifications.aperture_min,
          aperture_max: fixForm.specifications.aperture_max,
        }
      }

      const res = await fetch(`/api/admin/catalog/items/${fixingIssue.catalog_item_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to save")
      }

      // Rescan and refresh
      await handleRescan()
      closeFix()
    } catch (e: any) {
      setFixError(e.message || "Failed to save")
    } finally {
      setFixLoading(false)
    }
  }

  const typeOptions = Object.keys(summary.by_type || {}).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-red-600" />
            Blocking Catalog Issues
          </h1>
          <p className="text-gray-600 mt-1">
            These issues require human intervention before catalog items can be used safely.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRescan} disabled={rescanLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${rescanLoading ? "animate-spin" : ""}`} />
            Rescan now
          </Button>
          <a
            href="/dashboard/settings/database/catalog_items"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open catalog_items table
            </Button>
          </a>
        </div>
      </div>

      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-900">Open blocking issues</CardTitle>
          <CardDescription className="text-red-700">
            {summary.open_blocking_count > 0 ? (
              <span>
                <strong>{summary.open_blocking_count}</strong> open blocking issue(s) detected.
              </span>
            ) : (
              <span>No blocking issues detected.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {typeOptions.length === 0 && (
              <div className="text-sm text-gray-600">No issue types currently open.</div>
            )}
            {typeOptions.map((t) => (
              <div key={t} className="border rounded-lg p-3 bg-white">
                <div className="text-xs text-gray-500">Issue type</div>
                <div className="font-semibold text-gray-900">{t}</div>
                <div className="text-sm text-red-700 mt-1">{summary.by_type[t]} open</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <div className="w-72">
              <Select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="w-full"
              >
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues..." />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.length === 0 ? (
                <div className="text-sm text-gray-600">No matching issues.</div>
              ) : (
                filteredIssues.map((i) => (
                  <Card key={i.id} className="border-gray-200">
                    <CardHeader className="py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="text-lg">
                            {i.issue_type}{" "}
                            <span className="text-sm font-normal text-gray-500">
                              • Last detected {new Date(i.last_detected_at).toLocaleString()}
                            </span>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <div className="text-gray-700">{i.message}</div>
                            <div className="text-gray-500 mt-1">
                              Item: <strong>{i.make || "?"}</strong> — {i.output_text || "?"}{" "}
                              <span className="ml-2 text-xs bg-gray-100 rounded px-2 py-0.5">
                                {i.product_type || "unknown"}
                              </span>
                              {i.is_active ? (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 rounded px-2 py-0.5">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                                  INACTIVE
                                </span>
                              )}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openFix(i)}>
                            Fix
                          </Button>
                          <a
                            href={`/dashboard/settings/database/catalog_items`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View item (DB)
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 space-y-3">
                      <details className="border rounded-lg p-3 bg-gray-50">
                        <summary className="cursor-pointer text-sm font-medium text-gray-800">
                          Details (JSON)
                        </summary>
                        <pre className="text-xs mt-2 overflow-auto max-h-64">
{JSON.stringify(i.details, null, 2)}
                        </pre>
                      </details>

                      <div className="border rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Mark resolved (manual)
                        </div>
                        <Textarea
                          value={resolutionNoteById[i.id] || ""}
                          onChange={(e) =>
                            setResolutionNoteById((prev) => ({ ...prev, [i.id]: e.target.value }))
                          }
                          placeholder="Resolution note (required)..."
                        />
                        <div className="mt-2">
                          <Button onClick={() => handleResolve(i.id)} variant="outline">
                            Mark resolved
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
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

      <Modal
        isOpen={!!fixingIssue}
        onClose={closeFix}
        title={fixingIssue ? `Fix: ${fixingIssue.issue_type}` : "Fix"}
        size="lg"
      >
        {fixLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : fixingIssue ? (
          <div className="space-y-4">
            {fixError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {fixError}
              </div>
            )}

            <div className="text-sm text-gray-600">
              Item: <strong>{catalogItem?.make || fixingIssue.make || "?"}</strong> — {catalogItem?.output_text || fixingIssue.output_text || "?"}
            </div>

            {fixingIssue.issue_type === "LENS_MISSING_MOUNT" && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">Mount</div>
                <Input
                  value={fixForm.specifications.mount}
                  onChange={(e) =>
                    setFixForm((p: any) => ({ ...p, specifications: { ...p.specifications, mount: e.target.value } }))
                  }
                  placeholder="e.g. Canon EF, Nikon F, Sony E"
                />
              </div>
            )}

            {fixingIssue.issue_type === "LENS_MISSING_FOCAL_AND_APERTURE" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Focal min (mm)</div>
                  <Input
                    type="number"
                    value={fixForm.specifications.focal_min_mm}
                    onChange={(e) =>
                      setFixForm((p: any) => ({ ...p, specifications: { ...p.specifications, focal_min_mm: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Focal max (mm)</div>
                  <Input
                    type="number"
                    value={fixForm.specifications.focal_max_mm}
                    onChange={(e) =>
                      setFixForm((p: any) => ({ ...p, specifications: { ...p.specifications, focal_max_mm: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Aperture min</div>
                  <Input
                    type="number"
                    step="0.1"
                    value={fixForm.specifications.aperture_min}
                    onChange={(e) =>
                      setFixForm((p: any) => ({ ...p, specifications: { ...p.specifications, aperture_min: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Aperture max</div>
                  <Input
                    type="number"
                    step="0.1"
                    value={fixForm.specifications.aperture_max}
                    onChange={(e) =>
                      setFixForm((p: any) => ({ ...p, specifications: { ...p.specifications, aperture_max: e.target.value } }))
                    }
                  />
                </div>
              </div>
            )}

            {fixingIssue.issue_type === "PRICING_NULL_OR_INVALID" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Buy low</div>
                  <Input type="number" value={fixForm.buy_low} onChange={(e) => setFixForm((p: any) => ({ ...p, buy_low: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Buy high</div>
                  <Input type="number" value={fixForm.buy_high} onChange={(e) => setFixForm((p: any) => ({ ...p, buy_high: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Consign low</div>
                  <Input type="number" value={fixForm.consign_low} onChange={(e) => setFixForm((p: any) => ({ ...p, consign_low: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Consign high</div>
                  <Input type="number" value={fixForm.consign_high} onChange={(e) => setFixForm((p: any) => ({ ...p, consign_high: e.target.value }))} />
                </div>
              </div>
            )}

            {fixingIssue.issue_type === "REQUIRED_FIELD_VIOLATION_ON_ACTIVE" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Make</div>
                    <Input value={fixForm.make} onChange={(e) => setFixForm((p: any) => ({ ...p, make: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Product type</div>
                    <Input value={fixForm.product_type} onChange={(e) => setFixForm((p: any) => ({ ...p, product_type: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-900">Output text</div>
                  <Input value={fixForm.output_text} onChange={(e) => setFixForm((p: any) => ({ ...p, output_text: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!fixForm.is_active}
                    onChange={(e) => setFixForm((p: any) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={closeFix}>
                Cancel
              </Button>
              <Button onClick={saveFix} disabled={fixLoading}>
                Save & Rescan
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

