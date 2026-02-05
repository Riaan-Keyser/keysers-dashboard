"use client"

import { Modal } from "./modal"
import { Button } from "./button"
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react"

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: "success" | "error" | "info" | "warning"
  confirmText?: string
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "OK"
}: AlertModalProps) {
  const icons = {
    success: <CheckCircle className="h-12 w-12 text-green-600" />,
    error: <XCircle className="h-12 w-12 text-red-600" />,
    warning: <AlertCircle className="h-12 w-12 text-amber-600" />,
    info: <Info className="h-12 w-12 text-blue-600" />
  }

  const colors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200"
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || ""} size="sm">
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">{icons[type]}</div>
        <p className="text-gray-700 text-lg mb-6 whitespace-pre-line">{message}</p>
        <Button onClick={onClose} className="w-full max-w-xs mx-auto">
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
