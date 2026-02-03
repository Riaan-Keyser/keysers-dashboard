"use client"

import React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  name: string
  description: string
}

interface InspectionStepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepIndex: number) => void
  allowStepNavigation?: boolean
}

export function InspectionStepper({
  steps,
  currentStep,
  onStepClick,
  allowStepNavigation = false
}: InspectionStepperProps) {
  return (
    <div className="w-full">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => {
            const isCompleted = stepIdx < currentStep
            const isCurrent = stepIdx === currentStep
            const canClick = allowStepNavigation && onStepClick && stepIdx <= currentStep

            return (
              <li key={step.id} className={cn("relative flex-1", stepIdx !== steps.length - 1 && "pr-8")}>
                {/* Connector Line */}
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-4 left-[50%] -right-4 h-0.5 transition-colors",
                      isCompleted ? "bg-blue-600" : "bg-gray-300"
                    )}
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  onClick={() => canClick && onStepClick(stepIdx)}
                  disabled={!canClick}
                  className={cn(
                    "group relative flex flex-col items-center focus:outline-none",
                    canClick && "cursor-pointer"
                  )}
                >
                  {/* Step Circle */}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                      isCompleted && "border-blue-600 bg-blue-600",
                      isCurrent && "border-blue-600 bg-white",
                      !isCompleted && !isCurrent && "border-gray-300 bg-white",
                      canClick && "group-hover:border-blue-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isCurrent ? "text-blue-600" : "text-gray-500"
                        )}
                      >
                        {stepIdx + 1}
                      </span>
                    )}
                  </span>

                  {/* Step Label */}
                  <span className="mt-2 text-center">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        isCurrent ? "text-blue-600" : "text-gray-900"
                      )}
                    >
                      {step.name}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">{step.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
