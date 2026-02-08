"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  PlayCircle, 
  Ban,
  X
} from "lucide-react"

interface WebhookEvent {
  id: string
  eventId: string
  eventType: string
  version: string
  status: string
  receivedAt: string
  processedAt: string | null
  signatureValid: boolean
  errorMessage: string | null
  retryCount: number
  lastRetriedAt: string | null
  ignoredAt: string | null
  ignoredByUserId: string | null
  relatedEntityId: string | null
  relatedEntityType: string | null
}

interface WebhookEventDetail extends WebhookEvent {
  rawPayload: any
  sourceIp: string | null
  signatureProvided: string | null
  signatureComputed: string | null
  ignoreNote: string | null
}

export default function WebhookEventsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [status, setStatus] = useState("FAILED")
  const [eventType, setEventType] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Detail modal
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [ignoreNote, setIgnoreNote] = useState("")
  const [replayMode, setReplayMode] = useState<"safe" | "force">("safe")
  const [showConfirmForce, setShowConfirmForce] = useState(false)

  useEffect(() => {
    fetchSummary()
    fetchEvents()
  }, [status, eventType, pagination.page])

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/admin/webhooks/events/summary")
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error)
    }
  }

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status,
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      })
      if (eventType) params.set("eventType", eventType)
      if (searchQuery) params.set("q", searchQuery)

      const response = await fetch(`/api/admin/webhooks/events?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch events:", error)
      alert("Failed to load webhook events")
    } finally {
      setLoading(false)
    }
  }

  const fetchEventDetail = async (eventId: string) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/admin/webhooks/events/${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedEvent(data)
        setIgnoreNote("")
      } else {
        alert("Failed to load event details")
      }
    } catch (error) {
      console.error("Failed to fetch event detail:", error)
      alert("Failed to load event details")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 })
    fetchEvents()
  }

  const handleReplay = async (eventId: string, mode: "safe" | "force") => {
    if (mode === "force" && !showConfirmForce) {
      setShowConfirmForce(true)
      return
    }

    try {
      const response = await fetch(`/api/admin/webhooks/events/${eventId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.noop) {
          alert(`Replay completed (no-op): ${data.message}`)
        } else {
          alert(`Replay successful: ${data.message}`)
        }
        setSelectedEvent(null)
        setShowConfirmForce(false)
        fetchSummary()
        fetchEvents()
        // Trigger sidebar badge refresh
        window.dispatchEvent(new Event("refreshNotificationCounts"))
      } else {
        alert(`Replay failed: ${data.message || data.error}`)
      }
    } catch (error) {
      console.error("Failed to replay event:", error)
      alert("Failed to replay event")
    }
  }

  const handleIgnore = async (eventId: string) => {
    if (!ignoreNote.trim()) {
      alert("Ignore note is required")
      return
    }

    try {
      const response = await fetch(`/api/admin/webhooks/events/${eventId}/ignore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: ignoreNote })
      })

      if (response.ok) {
        alert("Event marked as ignored")
        setSelectedEvent(null)
        fetchSummary()
        fetchEvents()
        // Trigger sidebar badge refresh
        window.dispatchEvent(new Event("refreshNotificationCounts"))
      } else {
        const data = await response.json()
        alert(`Failed to ignore event: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to ignore event:", error)
      alert("Failed to ignore event")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "PENDING":
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "DUPLICATE":
        return <RefreshCw className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Events</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and replay webhook events from the WhatsApp bot
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(summary.by_status || {}).map(([statusKey, count]) => (
            <Card key={statusKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(statusKey)}
                  {statusKey}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <select 
                className="w-full border rounded px-3 py-2"
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PROCESSED">Processed</option>
                <option value="DUPLICATE">Duplicate</option>
              </select>
            </div>
            <div>
              <Label>Event Type</Label>
              <select 
                className="w-full border rounded px-3 py-2"
                value={eventType} 
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">All</option>
                <option value="quote_accepted">Quote Accepted</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Search (eventId, phone, email, name)</Label>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Events ({pagination.total})
            {status === "FAILED" && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (excluding ignored)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No events found</div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.status)}
                        <span className="font-mono text-sm">{event.eventId}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {event.eventType}
                        </span>
                        {!event.signatureValid && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                            Invalid Signature
                          </span>
                        )}
                        {event.ignoredAt && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            Ignored
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Received: {new Date(event.receivedAt).toLocaleString()}
                        {event.processedAt && (
                          <> · Processed: {new Date(event.processedAt).toLocaleString()}</>
                        )}
                        {event.retryCount > 0 && (
                          <> · Retries: {event.retryCount}</>
                        )}
                      </div>
                      {event.errorMessage && (
                        <div className="text-sm text-red-600 mt-1">
                          Error: {event.errorMessage.substring(0, 100)}
                          {event.errorMessage.length > 100 && "..."}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchEventDetail(event.eventId)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Event Details</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {selectedEvent.eventId}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedEvent(null)
                  setShowConfirmForce(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <>
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedEvent.status)}
                        {selectedEvent.status}
                      </div>
                    </div>
                    <div>
                      <Label>Event Type</Label>
                      <div className="mt-1">{selectedEvent.eventType}</div>
                    </div>
                    <div>
                      <Label>Version</Label>
                      <div className="mt-1">{selectedEvent.version}</div>
                    </div>
                    <div>
                      <Label>Signature Valid</Label>
                      <div className="mt-1">{selectedEvent.signatureValid ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <Label>Received At</Label>
                      <div className="mt-1">{new Date(selectedEvent.receivedAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <Label>Processed At</Label>
                      <div className="mt-1">
                        {selectedEvent.processedAt
                          ? new Date(selectedEvent.processedAt).toLocaleString()
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <Label>Retry Count</Label>
                      <div className="mt-1">{selectedEvent.retryCount}</div>
                    </div>
                    <div>
                      <Label>Related Entity</Label>
                      <div className="mt-1">
                        {selectedEvent.relatedEntityType && selectedEvent.relatedEntityId
                          ? `${selectedEvent.relatedEntityType}: ${selectedEvent.relatedEntityId}`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {selectedEvent.errorMessage && (
                    <div>
                      <Label>Error Message</Label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {selectedEvent.errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Raw Payload */}
                  <div>
                    <Label>Raw Payload</Label>
                    <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedEvent.rawPayload, null, 2)}
                    </pre>
                  </div>

                  {/* Ignored Info */}
                  {selectedEvent.ignoredAt && (
                    <div>
                      <Label>Ignore Note</Label>
                      <div className="mt-1 p-3 bg-gray-50 border rounded text-sm">
                        {selectedEvent.ignoreNote || "N/A"}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!selectedEvent.ignoredAt && (
                    <div className="space-y-4 pt-4 border-t">
                      <div>
                        <h3 className="font-semibold mb-3">Actions</h3>

                        {/* Replay */}
                        {(selectedEvent.status === "FAILED" || selectedEvent.status === "PROCESSED") && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReplay(selectedEvent.eventId, "safe")}
                                disabled={detailLoading}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Replay (Safe)
                              </Button>
                              {showConfirmForce ? (
                                <Button
                                  variant="destructive"
                                  onClick={() => handleReplay(selectedEvent.eventId, "force")}
                                  disabled={detailLoading}
                                >
                                  Confirm Force Replay
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => setShowConfirmForce(true)}
                                  disabled={detailLoading}
                                >
                                  Replay (Force)
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Safe mode: will not create duplicates. Force mode: use with caution.
                            </p>
                          </div>
                        )}

                        {/* Ignore */}
                        <div className="space-y-2 mt-4">
                          <Label>Ignore Event</Label>
                          <Input
                            placeholder="Reason for ignoring (required)"
                            value={ignoreNote}
                            onChange={(e) => setIgnoreNote(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={() => handleIgnore(selectedEvent.eventId)}
                            disabled={detailLoading || !ignoreNote.trim()}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Mark as Ignored
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
