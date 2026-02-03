import axios from 'axios'

interface WooCommerceConfig {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

export class WooCommerceAPI {
  private api: any
  
  constructor(config: WooCommerceConfig) {
    this.api = axios.create({
      baseURL: `${config.storeUrl}/wp-json/wc/v3`,
      auth: {
        username: config.consumerKey,
        password: config.consumerSecret
      }
    })
  }

  async createProduct(productData: any) {
    try {
      const response = await this.api.post('/products', productData)
      return response.data
    } catch (error: any) {
      console.error('WooCommerce create product error:', error.response?.data)
      throw error
    }
  }

  async updateProduct(productId: string, productData: any) {
    try {
      const response = await this.api.put(`/products/${productId}`, productData)
      return response.data
    } catch (error: any) {
      console.error('WooCommerce update product error:', error.response?.data)
      throw error
    }
  }

  async updateProductPrice(productId: string, price: number) {
    try {
      const response = await this.api.put(`/products/${productId}`, {
        regular_price: price.toString()
      })
      return response.data
    } catch (error: any) {
      console.error('WooCommerce update price error:', error.response?.data)
      throw error
    }
  }

  async deleteProduct(productId: string) {
    try {
      const response = await this.api.delete(`/products/${productId}`, {
        params: { force: true }
      })
      return response.data
    } catch (error: any) {
      console.error('WooCommerce delete product error:', error.response?.data)
      throw error
    }
  }

  async getProduct(productId: string) {
    try {
      const response = await this.api.get(`/products/${productId}`)
      return response.data
    } catch (error: any) {
      console.error('WooCommerce get product error:', error.response?.data)
      throw error
    }
  }
}

export async function syncEquipmentToWooCommerce(equipmentId: string) {
  const { prisma } = await import('./prisma')
  
  // Get WooCommerce settings
  const settings = await prisma.wooSettings.findFirst()
  if (!settings) {
    throw new Error('WooCommerce settings not configured')
  }

  // Get equipment
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { vendor: true }
  })

  if (!equipment) {
    throw new Error('Equipment not found')
  }

  const woo = new WooCommerceAPI({
    storeUrl: settings.storeUrl,
    consumerKey: settings.consumerKey,
    consumerSecret: settings.consumerSecret
  })

  const productData = {
    name: equipment.name,
    type: 'simple',
    regular_price: equipment.sellingPrice.toString(),
    description: equipment.description || '',
    short_description: `${equipment.brand} ${equipment.model}`,
    sku: equipment.sku,
    stock_quantity: 1,
    manage_stock: true,
    in_stock: equipment.status === 'READY_FOR_SALE',
    categories: [{ name: equipment.category }],
    images: equipment.images.map(url => ({ src: url })),
    meta_data: [
      { key: '_dashboard_id', value: equipment.id },
      { key: '_brand', value: equipment.brand },
      { key: '_model', value: equipment.model },
      { key: '_condition', value: equipment.condition },
      { key: '_serial_number', value: equipment.serialNumber || '' }
    ]
  }

  let wooProduct
  if (equipment.woocommerceId) {
    // Update existing product
    wooProduct = await woo.updateProduct(equipment.woocommerceId, productData)
  } else {
    // Create new product
    wooProduct = await woo.createProduct(productData)
    
    // Update equipment with WooCommerce ID
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        woocommerceId: wooProduct.id.toString(),
        syncedToWoo: true,
        lastSyncedAt: new Date()
      }
    })
  }

  return wooProduct
}
