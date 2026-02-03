// Kapso API integration
// API Documentation: https://docs.kapso.ai/api/

// Platform API for conversations, contacts, etc (Kapso extensions)
const KAPSO_PLATFORM_API = "https://api.kapso.ai/platform/v1"
// Meta WhatsApp API proxy for sending messages
const KAPSO_META_API = "https://api.kapso.ai/meta/whatsapp/v24.0"
const KAPSO_API_KEY = process.env.KAPSO_API_KEY || ""

interface KapsoRequestOptions {
  method?: string
  body?: any
  phoneNumberId?: string
  usePlatformApi?: boolean  // Use platform API vs Meta proxy API
}

async function kapsoRequest(endpoint: string, options: KapsoRequestOptions = {}) {
  const { method = "GET", body, phoneNumberId, usePlatformApi = false } = options

  const headers: Record<string, string> = {
    "X-API-Key": KAPSO_API_KEY,
    "Content-Type": "application/json",
  }

  const config: RequestInit = {
    method,
    headers,
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const baseUrl = usePlatformApi ? KAPSO_PLATFORM_API : KAPSO_META_API
  const url = `${baseUrl}${endpoint}`
  
  console.log('Kapso API Request:', { url, method, hasApiKey: !!KAPSO_API_KEY })
  
  const response = await fetch(url, config)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Kapso API Error:', { status: response.status, errorText })
    try {
      const errorJson = JSON.parse(errorText)
      throw new Error(errorJson.error || errorJson.message || `Kapso API error: ${response.status}`)
    } catch (e) {
      throw new Error(`Kapso API error ${response.status}: ${errorText}`)
    }
  }

  return response.json()
}

// Conversations API (uses Platform API)
export async function listConversations(phoneNumberId: string, params?: {
  status?: "active" | "ended"
  lastActiveSince?: string
  lastActiveUntil?: string
  limit?: number
  after?: string
}) {
  const searchParams = new URLSearchParams()
  searchParams.append("phone_number_id", phoneNumberId)
  
  if (params?.status) searchParams.append("status", params.status)
  if (params?.limit) searchParams.append("per_page", params.limit.toString())
  if (params?.after) searchParams.append("page", params.after)

  return kapsoRequest(`/whatsapp/conversations?${searchParams.toString()}`, {
    usePlatformApi: true
  })
}

export async function getConversation(conversationId: string) {
  return kapsoRequest(`/whatsapp/conversations/${conversationId}`, {
    usePlatformApi: true
  })
}

export async function updateConversationStatus(conversationId: string, status: "active" | "ended") {
  return kapsoRequest(`/whatsapp/conversations/${conversationId}`, {
    method: "PATCH",
    body: { status },
    usePlatformApi: true
  })
}

// Messages API (uses Platform API)
export async function listMessages(phoneNumberId: string, params?: {
  conversationId?: string
  direction?: "inbound" | "outbound"
  status?: string
  sentAtSince?: string
  sentAtUntil?: string
  limit?: number
  after?: string
}) {
  const searchParams = new URLSearchParams()
  searchParams.append("phone_number_id", phoneNumberId)
  
  if (params?.conversationId) searchParams.append("conversation_id", params.conversationId)
  if (params?.limit) searchParams.append("per_page", params.limit.toString())

  return kapsoRequest(`/whatsapp/messages?${searchParams.toString()}`, {
    usePlatformApi: true
  })
}

export async function sendMessage(phoneNumberId: string, to: string, message: {
  text?: { body: string }
  type: "text" | "image" | "document" | "audio" | "video"
  [key: string]: any
}) {
  return kapsoRequest(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to,
      ...message
    },
    usePlatformApi: false  // Use Meta API for sending
  })
}

// Workflow Executions (uses Platform API)
export async function listConversationWorkflowExecutions(conversationId: string, params?: {
  status?: string
  page?: number
  perPage?: number
}) {
  const searchParams = new URLSearchParams()
  
  if (params?.status) searchParams.append("status", params.status)
  if (params?.page) searchParams.append("page", params.page.toString())
  if (params?.perPage) searchParams.append("per_page", params.perPage.toString())

  return kapsoRequest(`/whatsapp/conversations/${conversationId}/flow_executions?${searchParams.toString()}`, {
    usePlatformApi: true
  })
}

// Assignments (uses Platform API)
export async function assignConversation(conversationId: string, userId: string, notes?: string) {
  return kapsoRequest(`/whatsapp/conversations/${conversationId}/assignments`, {
    method: "POST",
    body: {
      assignment: {
        user_id: userId,
        notes,
        active: true
      }
    },
    usePlatformApi: true
  })
}

export async function listConversationAssignments(conversationId: string) {
  return kapsoRequest(`/whatsapp/conversations/${conversationId}/assignments`, {
    usePlatformApi: true
  })
}
