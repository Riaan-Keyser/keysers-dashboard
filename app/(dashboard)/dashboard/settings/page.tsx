"use client"

import { useEffect, useState } from "react"
import { Save, Database, Globe, Users, ChevronDown, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InventoryDatabaseManager } from "@/components/dashboard/inventory-database-manager"
import Link from "next/link"

export default function SettingsPage() {
  const [wooSettings, setWooSettings] = useState({
    storeUrl: "",
    consumerKey: "",
    consumerSecret: "",
    autoSync: false,
    syncInterval: 60
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [blockingCatalogSummary, setBlockingCatalogSummary] = useState<{ open_blocking_count: number }>({
    open_blocking_count: 0,
  })
  const [pendingEnrichmentSummary, setPendingEnrichmentSummary] = useState<{ pending_review_count: number }>({
    pending_review_count: 0,
  })
  const [failedWebhooksSummary, setFailedWebhooksSummary] = useState<{ failed_not_ignored_count: number }>({
    failed_not_ignored_count: 0,
  })

  useEffect(() => {
    fetchSettings()
    fetchBlockingCatalogIssues()
    fetchPendingEnrichmentReviews()
    fetchFailedWebhooks()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/woocommerce")
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setWooSettings(data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/settings/woocommerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wooSettings)
      })

      if (response.ok) {
        alert("Settings saved successfully!")
      }
    } catch (error) {
      console.error("Failed to save settings:", error)
      alert("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const fetchBlockingCatalogIssues = async () => {
    try {
      const res = await fetch("/api/admin/catalog/issues/summary")
      if (!res.ok) return
      const data = await res.json()
      setBlockingCatalogSummary({ open_blocking_count: data.open_blocking_count || 0 })
    } catch {
      // ignore
    }
  }

  const fetchPendingEnrichmentReviews = async () => {
    try {
      const res = await fetch("/api/admin/enrichment-reviews/summary")
      if (!res.ok) return
      const data = await res.json()
      setPendingEnrichmentSummary({ pending_review_count: data.pending_review_count || 0 })
    } catch {
      // ignore
    }
  }

  const fetchFailedWebhooks = async () => {
    try {
      const res = await fetch("/api/admin/webhooks/events/summary")
      if (!res.ok) return
      const data = await res.json()
      setFailedWebhooksSummary({ failed_not_ignored_count: data.failed_not_ignored_count || 0 })
    } catch {
      // ignore
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage system configuration and integrations</p>
      </div>

      {/* Database Management - Primary Section */}
      <Card className="border-2 border-blue-200">
        <CardHeader 
          className="cursor-pointer bg-blue-50"
          onClick={() => toggleSection('database')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-blue-900">Database Management</CardTitle>
                <CardDescription className="text-blue-700">
                  View and edit the Keysers Inventory database (keysers_inventory)
                </CardDescription>
              </div>
            </div>
            {expandedSection === 'database' ? (
              <ChevronDown className="h-5 w-5 text-blue-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-blue-500" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'database' && (
          <CardContent className="pt-6">
            <InventoryDatabaseManager />
          </CardContent>
        )}
      </Card>

      {/* Accessories Management */}
      <Link href="/dashboard/settings/accessories">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-purple-600" />
                <div>
                  <CardTitle className="text-purple-900">Accessories Management</CardTitle>
                  <CardDescription className="text-purple-700">
                    Configure default accessories for each product type
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
        </Card>
      </Link>

      {/* Blocking Catalog Issues (Category A) */}
      <Link href="/dashboard/settings/catalog-issues">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-red-600" />
                <div>
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    Blocking Catalog Issues
                    {blockingCatalogSummary.open_blocking_count > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {blockingCatalogSummary.open_blocking_count}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    Admin-only: review and resolve catalog items that are unsafe/incomplete
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
        </Card>
      </Link>

      {/* Pending Enrichment Reviews (Category B) */}
      <Link href="/dashboard/settings/enrichment-reviews">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-orange-200">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-orange-600" />
                <div>
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    Pending Enrichment Reviews
                    {pendingEnrichmentSummary.pending_review_count > 0 && (
                      <span className="bg-orange-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {pendingEnrichmentSummary.pending_review_count}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    Admin-only: approve or reject Lens spec enrichment suggestions
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
        </Card>
      </Link>

      {/* Failed Webhook Events (Category C) */}
      <Link href="/dashboard/settings/webhook-events">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-red-600" />
                <div>
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    Failed Webhook Events
                    {failedWebhooksSummary.failed_not_ignored_count > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {failedWebhooksSummary.failed_not_ignored_count}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    Admin-only: monitor and replay webhook events from the WhatsApp bot
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
        </Card>
      </Link>

      {/* WooCommerce Integration */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('woocommerce')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-purple-500" />
              <div>
                <CardTitle>WooCommerce Integration</CardTitle>
                <CardDescription>
                  Connect your WordPress/WooCommerce store to automatically sync products
                </CardDescription>
              </div>
            </div>
            {expandedSection === 'woocommerce' ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'woocommerce' && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="storeUrl">Store URL</Label>
              <Input
                id="storeUrl"
                placeholder="https://yourstore.com"
                value={wooSettings.storeUrl}
                onChange={(e) => setWooSettings({ ...wooSettings, storeUrl: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="consumerKey">Consumer Key</Label>
              <Input
                id="consumerKey"
                placeholder="ck_xxxxxxxxxxxxx"
                value={wooSettings.consumerKey}
                onChange={(e) => setWooSettings({ ...wooSettings, consumerKey: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="consumerSecret">Consumer Secret</Label>
              <Input
                id="consumerSecret"
                type="password"
                placeholder="cs_xxxxxxxxxxxxx"
                value={wooSettings.consumerSecret}
                onChange={(e) => setWooSettings({ ...wooSettings, consumerSecret: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={wooSettings.autoSync}
                onChange={(e) => setWooSettings({ ...wooSettings, autoSync: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="autoSync">Enable automatic sync</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
              <Input
                id="syncInterval"
                type="number"
                value={wooSettings.syncInterval}
                onChange={(e) => setWooSettings({ ...wooSettings, syncInterval: parseInt(e.target.value) })}
              />
            </div>
            
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => toggleSection('users')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage system users and permissions
                </CardDescription>
              </div>
            </div>
            {expandedSection === 'users' ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {expandedSection === 'users' && (
          <CardContent className="border-t pt-4">
            <p className="text-gray-500 text-sm mb-4">
              User management features coming soon. For now, you can manage users via the Database Management section.
            </p>
            <Button variant="outline" disabled>
              Manage Users (Coming Soon)
            </Button>
          </CardContent>
        )}
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Application</p>
              <p className="font-medium">Keysers Dashboard v1.0</p>
            </div>
            <div>
              <p className="text-gray-500">Inventory Database</p>
              <p className="font-medium text-green-600">keysers_inventory</p>
            </div>
            <div>
              <p className="text-gray-500">Framework</p>
              <p className="font-medium">Next.js 16</p>
            </div>
            <div>
              <p className="text-gray-500">Database</p>
              <p className="font-medium">PostgreSQL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
