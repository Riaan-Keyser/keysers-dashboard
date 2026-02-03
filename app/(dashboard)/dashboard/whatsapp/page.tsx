"use client"

import { useEffect, useState } from "react"
import { MessageCircle, RefreshCw, Send, Search, Phone, User, Clock, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  type: string
  text?: { body: string }
  timestamp?: string
  from?: string
  to?: string
  interactive?: any
  kapso?: {
    direction: "inbound" | "outbound"
    status?: string
    content: string
    contact_name?: string
  }
}

interface Conversation {
  id: string
  phone_number: string
  status: "active" | "ended"
  last_active_at: string
  metadata?: {
    contact_name?: string
    messages_count?: number
    unread_count?: number
    last_message_text?: string
    last_message_timestamp?: string
  }
}

export default function WhatsAppPage() {
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)

  const [isConnected, setIsConnected] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("active")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")

  // Auto-connect on page load
  useEffect(() => {
    // Check localStorage first, then try to auto-connect
    const savedPhoneId = localStorage.getItem("kapso_phone_number_id")
    if (savedPhoneId) {
      setPhoneNumberId(savedPhoneId)
      setIsConnected(true)
    } else {
      // Auto-connect with environment phone number
      const autoConnect = async () => {
        try {
          const response = await fetch("/api/kapso/phone-config")
          if (response.ok) {
            const data = await response.json()
            if (data.phone_number_id) {
              setPhoneNumberId(data.phone_number_id)
              localStorage.setItem("kapso_phone_number_id", data.phone_number_id)
              setIsConnected(true)
            }
          }
        } catch (err) {
          console.error("Failed to auto-connect:", err)
        }
      }
      autoConnect()
    }
  }, [])

  useEffect(() => {
    if (phoneNumberId && isConnected) {
      fetchConversations()
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchConversations, 30000)
      return () => clearInterval(interval)
    }
  }, [phoneNumberId, isConnected, statusFilter])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      // Auto-refresh messages every 10 seconds
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 10000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const messagesContainer = document.getElementById('messages-container')
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    }
  }, [messages])

  const fetchConversations = async () => {
    if (!phoneNumberId) return
    
    setLoading(true)
    setError(null)
    try {
      // Fetch based on status filter (only if not "all")
      const statusParam = statusFilter === "all" ? "" : `&status=${statusFilter}`
      const response = await fetch(
        `/api/kapso/conversations?phone_number_id=${phoneNumberId}${statusParam}&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        console.log('Conversations response:', data)
        setConversations(data.data || data.whatsapp_conversations || [])
      } else {
        const err = await response.json()
        setError(err.error)
      }
    } catch (err: any) {
      setError("Failed to fetch conversations")
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    if (!phoneNumberId) return
    
    setMessagesLoading(true)
    try {
      console.log('Fetching messages for conversation:', conversationId)
      const response = await fetch(
        `/api/kapso/messages?phone_number_id=${phoneNumberId}&conversation_id=${conversationId}&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        console.log('Messages response:', data)
        const messagesList = data.data || data.whatsapp_messages || []
        // Sort messages: oldest first (newest at bottom)
        const sortedMessages = messagesList.sort((a: Message, b: Message) => {
          // Timestamps are Unix timestamps in seconds, convert to milliseconds
          const getTime = (msg: Message) => {
            const ts = msg.timestamp
            if (!ts) return 0
            // If it's a string of numbers (Unix timestamp), parse and multiply by 1000
            const num = parseInt(ts)
            return num * 1000
          }
          return getTime(a) - getTime(b)
        })
        setMessages(sortedMessages)
        
        // Auto-scroll to bottom after messages load
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container')
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
          }
        }, 100)
      } else {
        const error = await response.json()
        console.error("Failed to fetch messages:", error)
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !phoneNumberId) return

    setSending(true)
    try {
      const response = await fetch("/api/kapso/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          to: selectedConversation.phone_number,
          message: {
            type: "text",
            text: { body: messageText }
          }
        })
      })

      if (response.ok) {
        setMessageText("")
        // Refresh messages after sending and scroll to bottom
        setTimeout(() => {
          fetchMessages(selectedConversation.id)
        }, 1000)
      } else {
        const err = await response.json()
        alert(`Failed to send: ${err.error}`)
      }
    } catch (err) {
      alert("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const savePhoneNumberId = () => {
    if (!phoneNumberId.trim()) return
    localStorage.setItem("kapso_phone_number_id", phoneNumberId)
    setIsConnected(true)
  }

  // Filter conversations by assignee
  const assigneeFilteredConversations = assigneeFilter === "all" 
    ? conversations 
    : assigneeFilter === "unassigned"
    ? conversations.filter(conv => !conv.metadata?.assignee_user_id)
    : conversations.filter(conv => conv.metadata?.assignee_name === assigneeFilter || conv.metadata?.assignee_email === assigneeFilter)

  // Then apply search filter
  const filteredConversations = searchTerm
    ? assigneeFilteredConversations.filter(conv =>
        conv.phone_number.includes(searchTerm) ||
        conv.metadata?.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.metadata?.last_message_text?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : assigneeFilteredConversations

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ""
    
    try {
      // Unix timestamp in seconds - convert to milliseconds
      const ts = parseInt(timestamp) * 1000
      const date = new Date(ts)
      if (isNaN(date.getTime())) return ""
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch (e) {
      return ""
    }
  }

  const getMessageContent = (msg: Message): string => {
    // Use Kapso's formatted content field (best source!)
    if (msg.kapso?.content) {
      return msg.kapso.content
    }
    
    // Fallback to text body
    if (msg.text?.body) return msg.text.body
    
    // Handle other media types
    if (msg.type === "image") return "📷 Image"
    if (msg.type === "video") return "🎥 Video"
    if (msg.type === "audio") return "🎵 Audio"
    if (msg.type === "document") return "📄 Document"
    if (msg.type === "location") return "📍 Location"
    if (msg.type === "contacts") return "👤 Contact"
    if (msg.type === "sticker") return "😊 Sticker"
    
    return "[Message]"
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Messages</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {!phoneNumberId && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g., 123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phoneNumberId.trim()) {
                      savePhoneNumberId()
                    }
                  }}
                  className="w-80"
                />
                <Button 
                  onClick={savePhoneNumberId} 
                  size="sm"
                  disabled={!phoneNumberId.trim()}
                >
                  Connect
                </Button>
              </div>
            )}
            {phoneNumberId && (
              <>
                <span className="text-sm text-gray-500">
                  Connected: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{phoneNumberId.substring(0, 12)}...</code>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchConversations}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem("kapso_phone_number_id")
                    setPhoneNumberId("")
                    setIsConnected(false)
                    setConversations([])
                    setSelectedConversation(null)
                  }}
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!phoneNumberId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to Kapso</h3>
            <p className="text-gray-500 mb-4">Enter your Kapso Phone Number ID to manage WhatsApp conversations</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
              <h4 className="font-semibold text-blue-800 mb-2">📍 Where to find your Phone Number ID:</h4>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Log into <a href="https://app.kapso.ai/" target="_blank" rel="noopener noreferrer" className="underline">app.kapso.ai</a></li>
                <li>Navigate to your WhatsApp phone number settings</li>
                <li>Look for "Phone Number ID" (15-digit number)</li>
                <li>Copy and paste it into the field above</li>
              </ol>
              <p className="mt-2 text-xs text-blue-600">
                <strong>Note:</strong> This is NOT your phone number (+27...). It's a unique ID from Kapso like "123456789012345"
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 border-r bg-white flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b space-y-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "ended")}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>

              {/* Assignee Filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                <option value="Riaan Keyser">Riaan Keyser</option>
                <option value="Ryan Engelbrecht">Ryan Engelbrecht</option>
                <option value="sonettehiggo11@gmail.com">sonettehiggo11@gmail.com</option>
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active conversations</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conv.id ? "bg-green-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {conv.metadata?.contact_name || conv.phone_number}
                          </span>
                          {conv.metadata?.unread_count ? (
                            <Badge className="bg-green-600 text-white">
                              {conv.metadata.unread_count}
                            </Badge>
                          ) : null}
                        </div>
                        {!conv.metadata?.contact_name && (
                          <div className="text-xs text-gray-500 mb-1">
                            <Phone className="h-3 w-3 inline mr-1" />
                            {conv.phone_number}
                          </div>
                        )}
                        {conv.metadata?.last_message_text && (
                          <p className="text-sm text-gray-600 truncate">
                            {conv.metadata.last_message_text}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(conv.last_active_at)}
                          </span>
                          {conv.status === "ended" && (
                            <Badge variant="secondary" className="text-xs">Ended</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages View */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="bg-white border-b px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.metadata?.contact_name || selectedConversation.phone_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {selectedConversation.phone_number}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  id="messages-container"
                  className="flex-1 overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-gray-50 to-white"
                >
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const messageContent = getMessageContent(msg)
                      const messageTime = msg.timestamp
                      const direction = msg.kapso?.direction || "inbound"
                      const isUserReply = direction === "inbound" && messageContent.startsWith("Selected:")
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${direction === "outbound" ? "justify-end" : "justify-start"} px-12`}
                        >
                          {direction === "outbound" ? (
                            /* Bot/Business messages - Dark card style like Kapso */
                            <div className="max-w-[65%] rounded-lg bg-gray-800 text-white px-5 py-4 shadow-lg">
                              <div className="flex items-start gap-2 mb-2">
                                <span className="text-xs font-semibold text-green-400">📱 Business</span>
                              </div>
                              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                {messageContent}
                              </div>
                              <div className="flex justify-end mt-2 text-xs text-gray-400">
                                {formatTimestamp(messageTime)}
                              </div>
                            </div>
                          ) : isUserReply ? (
                            /* User button/list reply - Show "Selected: X" format */
                            <div className="max-w-[60%] rounded-lg bg-gray-700 text-white px-4 py-3">
                              <p className="text-sm font-medium">{messageContent}</p>
                              <div className="text-xs text-gray-300 mt-1">
                                {formatTimestamp(messageTime)}
                              </div>
                            </div>
                          ) : (
                            /* Regular user text message */
                            <div className="max-w-[60%] rounded-lg bg-white border border-gray-200 px-4 py-2 shadow-sm">
                              <p className="text-sm whitespace-pre-wrap text-gray-900">{messageContent}</p>
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                <span>{formatTimestamp(messageTime)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="bg-white border-t p-4">
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="flex-1 min-h-[60px] max-h-[120px]"
                      rows={2}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Press Enter to send • Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
