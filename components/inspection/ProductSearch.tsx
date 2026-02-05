"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Search, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatPrice } from "@/lib/inspection-pricing"

interface Product {
  id: string
  name: string
  brand: string
  model: string
  variant: string | null
  productType: string
  buyPriceMin: number
  buyPriceMax: number
  consignPriceMin: number
  consignPriceMax: number
  description: string | null
}

interface ProductSearchProps {
  value?: string // selected product ID
  onSelect: (product: Product) => void
  initialSearch?: string
  autoSelect?: boolean // Auto-select first result if available
}

export function ProductSearch({ value, onSelect, initialSearch = "", autoSelect = false }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  // Debounced search
  const searchProducts = useCallback(
    async (term: string, shouldAutoSelect: boolean = false) => {
      if (term.length < 2) {
        setProducts([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(term)}&limit=20`)
        const data = await response.json()
        const fetchedProducts = data.products || []
        setProducts(fetchedProducts)
        
        // If autoSelect is enabled and we have results, select first one immediately
        if (shouldAutoSelect && fetchedProducts.length > 0 && !hasAutoSelected) {
          const firstProduct = fetchedProducts[0]
          setSelectedProduct(firstProduct)
          setSearchTerm(firstProduct.name)
          setShowResults(false)
          setHasAutoSelected(true)
          onSelect(firstProduct)
        } else {
          setShowResults(true)
        }
      } catch (error) {
        console.error("Failed to search products:", error)
      } finally {
        setLoading(false)
      }
    },
    [hasAutoSelected, onSelect]
  )

  const handleSelect = useCallback((product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(product.name)
    setShowResults(false)
    onSelect(product)
  }, [onSelect])

  // Auto-search when component mounts with initialSearch
  useEffect(() => {
    if (initialSearch && initialSearch.length >= 2 && !selectedProduct) {
      searchProducts(initialSearch, autoSelect)
    }
  }, [initialSearch, autoSelect, searchProducts, selectedProduct])

  // Debounced manual search (when user types)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm !== initialSearch) {
        searchProducts(searchTerm, false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, initialSearch, searchProducts])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!e.target.value) {
              setSelectedProduct(null)
              setProducts([])
            }
          }}
          onFocus={() => {
            if (products.length > 0) {
              setShowResults(true)
            }
          }}
          placeholder="Search by brand, model, or name..."
          className="pl-10"
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && products.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg">
          <div className="p-2 space-y-1">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(product)
                  setShowResults(false)
                }}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between pointer-events-none">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      {product.id === value && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {product.brand} {product.model}
                      {product.variant && ` - ${product.variant}`}
                    </p>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <Badge variant="secondary" className="mb-1">
                      {product.productType.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-xs text-gray-600">
                      Buy: {formatPrice(product.buyPriceMin)} - {formatPrice(product.buyPriceMax)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Product Display */}
      {selectedProduct && !showResults && (
        <Card className="mt-4 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600">
                {selectedProduct.brand} {selectedProduct.model}
                {selectedProduct.variant && ` - ${selectedProduct.variant}`}
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  <span className="text-gray-600">Buy Range:</span>{" "}
                  <span className="font-medium">
                    {formatPrice(selectedProduct.buyPriceMin)} - {formatPrice(selectedProduct.buyPriceMax)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">Consign Range:</span>{" "}
                  <span className="font-medium">
                    {formatPrice(selectedProduct.consignPriceMin)} - {formatPrice(selectedProduct.consignPriceMax)}
                  </span>
                </p>
              </div>
            </div>
            <Badge>{selectedProduct.productType.replace(/_/g, " ")}</Badge>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute top-full left-0 right-0 mt-2">
          <Card className="p-4 text-center text-sm text-gray-600">
            Searching...
          </Card>
        </div>
      )}

      {/* No results */}
      {searchTerm.length >= 2 && !loading && products.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2">
          <Card className="p-4 text-center text-sm text-gray-600">
            No products found. Try a different search term.
          </Card>
        </div>
      )}
    </div>
  )
}
