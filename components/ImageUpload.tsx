"use client"

import { useState, useCallback } from "react"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageUploadProps {
  equipmentId: string
  existingImages?: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUpload({
  equipmentId,
  existingImages = [],
  onImagesChange,
  maxImages = 10
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = async (files: FileList) => {
    if (images.length >= maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    const remainingSlots = maxImages - images.length
    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    setUploading(true)
    const uploadedUrls: string[] = []

    for (const file of filesToUpload) {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("equipmentId", equipmentId)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        const data = await response.json()
        uploadedUrls.push(data.url)
      } catch (error) {
        console.error("Upload failed:", error)
        alert(`Failed to upload ${file.name}`)
      }
    }

    const newImages = [...images, ...uploadedUrls]
    setImages(newImages)
    onImagesChange(newImages)
    setUploading(false)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [images])

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onImagesChange(newImages)
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [removed] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, removed)
    setImages(newImages)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="image-upload"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleChange}
          disabled={uploading || images.length >= maxImages}
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                Drag and drop images here, or{" "}
                <label htmlFor="image-upload" className="text-blue-600 hover:underline cursor-pointer">
                  browse
                </label>
              </p>
              <p className="text-xs text-gray-500">
                Max {maxImages} images • JPG, PNG, WebP • Max 10MB per image
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("text/plain", index.toString())
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
              }}
              onDrop={(e) => {
                e.preventDefault()
                const fromIndex = parseInt(e.dataTransfer.getData("text/plain"))
                handleReorder(fromIndex, index)
              }}
            >
              <img
                src={url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              {index === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-500">
          {images.length} / {maxImages} images • Drag to reorder • First image is primary
        </p>
      )}
    </div>
  )
}
