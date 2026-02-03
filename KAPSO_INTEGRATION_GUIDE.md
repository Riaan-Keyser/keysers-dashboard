# Kapso WhatsApp Integration Guide

This dashboard now includes full integration with Kapso for managing WhatsApp conversations and messages.

## Setup

### 1. Add Kapso API Key to Environment Variables

Edit your `.env.local` file and add:

```bash
# Kapso API Integration
KAPSO_API_KEY=your_kapso_api_key_here
```

You can get your API key from your Kapso dashboard at: https://app.kapso.ai/

### 2. Find Your Phone Number ID

1. Log into your Kapso dashboard
2. Navigate to your WhatsApp phone number settings
3. Copy the **Phone Number ID** (looks like: `123456789012345`)
4. You'll need to enter this in the dashboard when connecting

## Features

### WhatsApp Messages Tab

The dashboard now includes a **WhatsApp Messages** tab in the sidebar with the following features:

#### 📥 **Inbox Management**
- View all active WhatsApp conversations in real-time
- Search conversations by contact name, phone number, or message content
- See unread message counts and conversation status
- Auto-refresh every 30 seconds to stay up-to-date

#### 💬 **Message Viewing**
- Click any conversation to view full message history
- See inbound and outbound messages with timestamps
- View message delivery status (sent, delivered, read)
- Auto-refresh messages every 10 seconds

#### 📤 **Send Messages**
- Reply directly to customers from the dashboard
- Type messages with support for multi-line text
- Press Enter to send, Shift+Enter for new line
- Real-time sending status

#### 👤 **Contact Information**
- Display contact names (if available in Kapso)
- Show phone numbers for all conversations
- View last activity timestamps
- See conversation metadata

## API Endpoints

The integration uses the following Kapso API endpoints:

- `GET /whatsapp/conversations` - List conversations
- `GET /whatsapp/messages` - List messages for a conversation
- `POST /whatsapp/phone_numbers/{id}/messages` - Send messages
- `PATCH /whatsapp/conversations/{id}` - Update conversation status

## Usage

1. Navigate to **WhatsApp Messages** in the sidebar
2. Enter your Kapso Phone Number ID and click **Connect**
3. View your active conversations in the left panel
4. Click on any conversation to view and send messages
5. Use the search box to find specific conversations

## Troubleshooting

### "Failed to fetch conversations"
- Verify your `KAPSO_API_KEY` is correctly set in `.env.local`
- Ensure your API key has the necessary permissions
- Check that your Phone Number ID is correct

### Messages not appearing
- The Phone Number ID must match your WhatsApp Business Account
- Ensure the conversation is active in Kapso
- Check the browser console for API errors

### Cannot send messages
- Verify the conversation is still active (not ended)
- Check that the recipient's phone number is valid
- Ensure your Kapso account has messaging permissions

## Security Notes

- API keys are never exposed to the client
- All Kapso API calls are proxied through Next.js API routes
- Phone Number ID is stored in browser localStorage for convenience
- Session authentication is required to access WhatsApp features

## Additional Resources

- [Kapso Documentation](https://docs.kapso.ai/)
- [Kapso API Reference](https://docs.kapso.ai/api/)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
