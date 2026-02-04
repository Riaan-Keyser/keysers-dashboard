"use client"

import { useState } from "react"
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react"

interface FileUploadProps {
  label: string
  accept?: string
  maxSize?: number // in MB
  onFileSelect: (file: File | null) => void
  required?: boolean
  error?: string
}

export function FileUpload({ 
  label, 
  accept = ".pdf,.jpg,.jpeg,.png", 
  maxSize = 5,
  onFileSelect,
  required = false,
  error: externalError
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (!selectedFile) {
      setFile(null)
      onFileSelect(null)
      return
    }

    // Check file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    // Check file type
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()
    const allowedExtensions = accept.split(",").map(ext => ext.replace(".", "").trim())
    
    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      setError(`Please upload a file in one of these formats: ${accept}`)
      return
    }

    setFile(selectedFile)
    onFileSelect(selectedFile)
  }

  const handleRemove = () => {
    setFile(null)
    setError(null)
    onFileSelect(null)
  }

  const displayError = error || externalError

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {!file ? (
        <div className="relative">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${label.replace(/\s/g, '-')}`}
          />
          <label
            htmlFor={`file-upload-${label.replace(/\s/g, '-')}`}
            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              Click to upload or drag and drop
            </span>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-gray-900 truncate">{file.name}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Accepted formats: {accept}. Max size: {maxSize}MB
      </p>
    </div>
  )
}
