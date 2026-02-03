"use client"

import { useEffect, useState } from "react"
import { Save, Database, Globe, Users, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InventoryDatabaseManager } from "@/components/dashboard/inventory-database-manager"

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

  useEffect(() => {
    fetchSettings()
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
