"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Search, Check, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  const hasInitialSearchRun = useRef(false)

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
    setProducts([]) // Clear products to prevent dropdown from showing
    onSelect(product)
  }, [onSelect])

  // Sync selectedProduct with value prop (when parent sets it externally after adding new product)
  useEffect(() => {
    const fetchProductById = async () => {
      if (!value) {
        return
      }
      
      // If we already have this product selected, don't refetch
      if (selectedProduct?.id === value) {
        return
      }

      try {
        const response = await fetch(`/api/products/${value}`)
        if (response.ok) {
          const product = await response.json()
          setSelectedProduct(product)
          setSearchTerm(product.name)
        }
      } catch (error) {
        console.error("Failed to fetch product by ID:", error)
      }
    }
    
    fetchProductById()
  }, [value]) // Only depends on value, intentionally excludes selectedProduct to avoid loops

  // Auto-search when component mounts with initialSearch (only once)
  useEffect(() => {
    if (initialSearch && initialSearch.length >= 2 && !hasInitialSearchRun.current) {
      hasInitialSearchRun.current = true
      searchProducts(initialSearch, autoSelect)
    }
  }, [initialSearch, autoSelect, searchProducts])

  // Debounced manual search (when user types)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't search if a product is already selected
      if (searchTerm && searchTerm !== initialSearch && !selectedProduct) {
        searchProducts(searchTerm, false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, initialSearch, searchProducts, selectedProduct])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            const newValue = e.target.value
            setSearchTerm(newValue)
            
            // Clear selection if user is editing
            if (selectedProduct && newValue !== selectedProduct.name) {
              setSelectedProduct(null)
            }
            
            // Clear everything if input is empty
            if (!newValue) {
              setSelectedProduct(null)
              setProducts([])
              setShowResults(false)
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
      {searchTerm.length >= 2 && !loading && products.length === 0 && !selectedProduct && (
        <Card className="p-6 text-center mt-4">
          <p className="text-gray-600 mb-4">No products found. Try a different search term.</p>
          <p className="text-sm text-gray-500 mb-4">Can't find the product? Add it to the database.</p>
          <Button
            onClick={() => {
              // Trigger add new product - will be handled by parent
              if (onSelect) {
                // @ts-ignore - Pass special flag to parent to trigger add product modal
                onSelect({ __addNewProduct: true, searchTerm } as any)
              }
            }}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Product to Database
          </Button>
        </Card>
      )}
    </div>
  )
}
