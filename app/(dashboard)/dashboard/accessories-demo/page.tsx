"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatPrice } from "@/lib/inspection-pricing"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

// Sample data for demo
const sampleAccessories = [
  { id: "1", accessoryName: "Original Front Lens Cap", isRequired: false, penaltyAmount: 50, accessoryOrder: 1 },
  { id: "2", accessoryName: "Original Rear Lens Cap", isRequired: false, penaltyAmount: 50, accessoryOrder: 2 },
  { id: "3", accessoryName: "Original Lens Hood", isRequired: false, penaltyAmount: 200, accessoryOrder: 3 },
  { id: "4", accessoryName: "Original Tripod Collar Ring", isRequired: false, penaltyAmount: 500, accessoryOrder: 4 },
  { id: "5", accessoryName: "Original Drop-In Filter", isRequired: false, penaltyAmount: 300, accessoryOrder: 5 },
  { id: "6", accessoryName: "Original Hard Case", isRequired: false, penaltyAmount: 400, accessoryOrder: 6 },
  { id: "7", accessoryName: "Original Packaging", isRequired: false, penaltyAmount: 100, accessoryOrder: 7 }
]

export default function AccessoriesDemoPage() {
  const [accessoryStates, setAccessoryStates] = useState<Record<string, { isPresent: boolean; notes: string }>>({})
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})

  return (
    <div className="space-y-12 max-w-6xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accessories Checklist - Layout Options</h1>
        <p className="text-gray-600">Compare all 4 layout options and choose your favorite!</p>
      </div>

      {/* OPTION 1: COMPACT GRID (2 COLUMNS) */}
      <div className="border-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-blue-500 text-white text-lg px-4 py-1">OPTION 1</Badge>
          <h2 className="text-2xl font-bold text-gray-900">Compact Grid (2 Columns)</h2>
        </div>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Accessories Checklist</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {sampleAccessories.map((acc) => (
              <div key={acc.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={accessoryStates[acc.accessoryName]?.isPresent || false}
                    onChange={(e) => setAccessoryStates({
                      ...accessoryStates,
                      [acc.accessoryName]: {
                        ...accessoryStates[acc.accessoryName],
                        isPresent: e.target.checked
                      }
                    })}
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-sm flex-1">{acc.accessoryName}</span>
                  {acc.penaltyAmount && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      {formatPrice(acc.penaltyAmount)}
                    </Badge>
                  )}
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={accessoryStates[acc.accessoryName]?.notes || ""}
                  onChange={(e) => setAccessoryStates({
                    ...accessoryStates,
                    [acc.accessoryName]: {
                      ...accessoryStates[acc.accessoryName],
                      notes: e.target.value
                    }
                  })}
                  className="text-xs h-8"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* OPTION 2: TABLE LAYOUT */}
      <div className="border-4 border-green-500 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-green-500 text-white text-lg px-4 py-1">OPTION 2</Badge>
          <h2 className="text-2xl font-bold text-gray-900">Table Layout</h2>
        </div>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Accessories Checklist</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700 w-12">Present</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Accessory</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700 w-32">Penalty</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sampleAccessories.map((acc, idx) => (
                  <tr key={acc.id} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={accessoryStates[acc.accessoryName]?.isPresent || false}
                        onChange={(e) => setAccessoryStates({
                          ...accessoryStates,
                          [acc.accessoryName]: {
                            ...accessoryStates[acc.accessoryName],
                            isPresent: e.target.checked
                          }
                        })}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">{acc.accessoryName}</td>
                    <td className="py-3 px-3 text-center">
                      {acc.penaltyAmount && (
                        <Badge className="bg-red-100 text-red-800">
                          {formatPrice(acc.penaltyAmount)}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Input
                        placeholder="Optional..."
                        value={accessoryStates[acc.accessoryName]?.notes || ""}
                        onChange={(e) => setAccessoryStates({
                          ...accessoryStates,
                          [acc.accessoryName]: {
                            ...accessoryStates[acc.accessoryName],
                            notes: e.target.value
                          }
                        })}
                        className="text-sm h-8"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* OPTION 3: CARDS WITH VISUAL HIERARCHY */}
      <div className="border-4 border-purple-500 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-purple-500 text-white text-lg px-4 py-1">OPTION 3</Badge>
          <h2 className="text-2xl font-bold text-gray-900">Cards with Visual Hierarchy</h2>
        </div>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Accessories Checklist</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {sampleAccessories.map((acc) => {
              const penaltyLevel = acc.penaltyAmount 
                ? acc.penaltyAmount >= 400 ? "high" 
                : acc.penaltyAmount >= 200 ? "medium" 
                : "low"
                : "none"
              
              const borderColor = {
                high: "border-red-300 bg-red-50",
                medium: "border-orange-300 bg-orange-50",
                low: "border-yellow-300 bg-yellow-50",
                none: "border-gray-200 bg-white"
              }[penaltyLevel]

              return (
                <Card key={acc.id} className={`p-4 border-2 ${borderColor}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={accessoryStates[acc.accessoryName]?.isPresent || false}
                      onChange={(e) => setAccessoryStates({
                        ...accessoryStates,
                        [acc.accessoryName]: {
                          ...accessoryStates[acc.accessoryName],
                          isPresent: e.target.checked
                        }
                      })}
                      className="h-5 w-5 mt-0.5"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{acc.accessoryName}</span>
                      </div>
                      {acc.penaltyAmount && (
                        <Badge className="bg-red-600 text-white">
                          Missing: -{formatPrice(acc.penaltyAmount)}
                        </Badge>
                      )}
                      <Input
                        placeholder="Add notes..."
                        value={accessoryStates[acc.accessoryName]?.notes || ""}
                        onChange={(e) => setAccessoryStates({
                          ...accessoryStates,
                          [acc.accessoryName]: {
                            ...accessoryStates[acc.accessoryName],
                            notes: e.target.value
                          }
                        })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      </div>

      {/* OPTION 4: INLINE COMPACT */}
      <div className="border-4 border-orange-500 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-orange-500 text-white text-lg px-4 py-1">OPTION 4</Badge>
          <h2 className="text-2xl font-bold text-gray-900">Inline Compact (Expandable)</h2>
        </div>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Accessories Checklist</h3>
          <div className="space-y-2">
            {sampleAccessories.map((acc) => (
              <div key={acc.id} className="border rounded-lg">
                <div 
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedNotes({
                    ...expandedNotes,
                    [acc.accessoryName]: !expandedNotes[acc.accessoryName]
                  })}
                >
                  <input
                    type="checkbox"
                    checked={accessoryStates[acc.accessoryName]?.isPresent || false}
                    onChange={(e) => {
                      e.stopPropagation()
                      setAccessoryStates({
                        ...accessoryStates,
                        [acc.accessoryName]: {
                          ...accessoryStates[acc.accessoryName],
                          isPresent: e.target.checked
                        }
                      })
                    }}
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-gray-900 flex-1">{acc.accessoryName}</span>
                  {acc.penaltyAmount && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      -{formatPrice(acc.penaltyAmount)}
                    </Badge>
                  )}
                  {expandedNotes[acc.accessoryName] ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                {expandedNotes[acc.accessoryName] && (
                  <div className="px-3 pb-3 pt-0">
                    <Input
                      placeholder="Add notes..."
                      value={accessoryStates[acc.accessoryName]?.notes || ""}
                      onChange={(e) => setAccessoryStates({
                        ...accessoryStates,
                        [acc.accessoryName]: {
                          ...accessoryStates[acc.accessoryName],
                          notes: e.target.value
                        }
                      })}
                      className="text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="text-center py-8">
        <p className="text-gray-600 text-lg">
          👆 Choose your favorite option above and let me know which one you prefer!
        </p>
      </div>
    </div>
  )
}
