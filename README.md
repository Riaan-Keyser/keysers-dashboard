# Keysers Camera Equipment Dashboard

A comprehensive business management system for Keysers Camera Equipment, built with Next.js, TypeScript, and PostgreSQL.

## Features

✅ **Inventory Management**
- Track all camera equipment and accessories
- Real-time status tracking (Pending, In Repair, Ready for Sale, Sold, etc.)
- Complete equipment details including brand, model, serial numbers
- Image gallery support
- Automatic SKU generation

✅ **Vendor/Client Management**
- Track vendors who sell equipment to you
- Trust score system
- Contact information and history
- Equipment sourcing tracking

✅ **Consignment Tracking**
- Dedicated consignment module
- Commission rate management
- Automatic profit split calculations (vendor share vs store share)
- Days on hand tracking
- Alerts for long-standing consignment items

✅ **Repair Management**
- Send equipment to technicians
- Track repair status and duration
- Estimated vs actual cost tracking
- Complete repair history
- Integration with inventory status

✅ **Pricing & WooCommerce Sync**
- Centralized price management
- Price history tracking with reasons
- Automatic WooCommerce synchronization
- Profit margin calculations
- Bulk sync capabilities

✅ **User Management & Permissions**
- Role-based access control (Admin, Manager, Staff, Technician, Viewer)
- Secure authentication with NextAuth.js
- Activity logging for all operations

✅ **Timestamp Tracking**
- All operations timestamped automatically
- Created/Updated timestamps on all records
- Complete audit trail via activity logs
- Last login tracking for users

✅ **Dashboard Analytics**
- Real-time business metrics
- Pending actions overview
- Recent activity feed
- Inventory value tracking

✅ **Quote Confirmation & Client Workflow**
- Bot-generated preliminary quotes via Kapso integration
- Shipping instructions and tracking management
- Client gear receiving with 10-minute undo grace period
- Final quote generation and client approval flow
- Mixed product selection (Buy vs Consignment per item)
- Integrated personal details form (address, banking, ID upload)
- Digital consignment agreement with auto-populated items
- Payment tracking and status management

✅ **Gear Verification & Inspection System**
- Product identification with auto-search and selection
- Condition assessment with multipliers (Like New, Excellent, Very Good, Good, Worn)
- Serial number tracking
- Product-specific accessories checklist (Lenses, Camera Bodies, Tripods)
- Smart penalty system for missing accessories
- Dynamic badge visibility (only shows when unchecked)
- Type-specific verification questions
- General notes and observations logging
- Auto-computed pricing based on condition and accessories
- Admin-only price override with mandatory reason tracking
- Audit trail for all verification steps

✅ **Accessories Management**
- Product-type-specific accessory templates
- **Lenses**: Front/Rear Caps, Lens Hood, Tripod Collar, Drop-In Filter, Hard Case, Packaging
- **Camera Bodies**: Battery, Charger, Camera Strap, Packaging
- **Tripods**: Baseplate
- Automatic penalty calculation for missing items
- Compact 2-column grid layout
- Optional notes per accessory

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui Components
- **Icons**: Lucide React
- **Email**: Resend API for transactional emails
- **Bot Integration**: Kapso WhatsApp Bot API
- **WooCommerce**: REST API Integration
- **File Uploads**: Native file handling with validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
```bash
cd /home/riaan/keysers-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your credentials
DATABASE_URL="postgresql://user:password@localhost:5432/keysers_dashboard"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email configuration (Resend)
RESEND_API_KEY="re_xxxxx"
FROM_EMAIL="noreply@keysers.co.za"

# Kapso Bot Integration
KAPSO_API_KEY="your_kapso_api_key"
KAPSO_PHONE_NUMBER_ID="your_phone_number_id"

# Dashboard API Key (for webhook authentication)
DASHBOARD_API_KEY="generate-secure-random-string"
```

4. Set up the database
```bash
# Run migrations and seed data
npm run db:setup
```

This will:
- Create all database tables
- Generate Prisma client
- Seed with an admin user and sample data

5. Start the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Default Credentials

After seeding, you can login with:
- **Email**: admin@keysers.co.za
- **Password**: admin123

⚠️ **Important**: Change the admin password immediately in production!

## Key Workflows

### Quote Confirmation Flow

```
1. Bot Quote Generated (Kapso)
   ↓
2. Client Accepts → Webhook → Incoming Gear
   ↓
3. Shipping Instructions Email Sent
   ↓
4. Client Submits Tracking Info (Optional)
   ↓
5. Staff Marks as Received (10-min undo grace period)
   ↓
6. Email Sent to Client (gear received confirmation)
   ↓
7. Inspection Session Created
   ↓
8. Staff Inspects Each Item:
   - Product identification (auto-search & select)
   - Condition selection
   - Accessories checklist
   - Serial number capture
   - Notes and observations
   - Auto-computed pricing
   - Admin price override (optional)
   ↓
9. Final Quote Sent to Client
   ↓
10. Client Reviews Products → Selects Buy/Consignment per item
   ↓
11. Client Submits Personal Details + Banking + ID Upload
   ↓
12. Consignment Agreement (if any consignment items)
   ↓
13. Client Confirms → Moves to Awaiting Payment
   ↓
14. Admin Notified via Email
   ↓
15. Staff Marks as Paid → Equipment Enters Inventory
```

### Inspection Workflow

```
Incoming Gear → Start Inspection → Inspection Session Created
   ↓
For Each Item:
   Step 1: Identify Product (auto-search, auto-select if match found)
   Step 2: Verify & Condition
      - Select condition (Like New, Excellent, Very Good, Good, Worn)
      - Serial number
      - Accessories checklist (product-type specific)
      - Notes
   Step 3: Review Pricing
      - Auto-computed prices
      - Admin-only override with reason
   Step 4: Approve Item (locks record)
   ↓
All Items Inspected → Send Final Quote
```

## Database Schema

### Core Models

- **User** - System users with role-based permissions
- **Vendor** - Clients selling equipment to you
- **Equipment** - Main inventory items
- **Product** - Canonical product catalog
- **PendingPurchase** - Client quote workflow tracking
- **InspectionSession** - Inspection session per shipment
- **IncomingGearItem** - Items under inspection
- **VerifiedGearItem** - Verified product data
- **AccessoryTemplate** - Product-type-specific accessory lists
- **VerifiedAccessory** - Actual accessories present
- **RepairLog** - Repair tracking records
- **PriceHistory** - Price change audit trail
- **ActivityLog** - Complete system audit log
- **ConsignmentAgreement** - Digital consignment agreements
- **WooSettings** - WooCommerce integration settings

### Equipment Status Flow

```
PENDING_INSPECTION → INSPECTED → READY_FOR_SALE → SOLD
                          ↓
                     IN_REPAIR → REPAIR_COMPLETED
```

### Purchase Status Flow

```
PENDING_REVIEW → AWAITING_DELIVERY → INSPECTION_IN_PROGRESS
   ↓
FINAL_QUOTE_SENT → CLIENT_ACCEPTED → AWAITING_PAYMENT
   ↓
PAID → Equipment enters inventory
```

## User Roles & Permissions

- **ADMIN** - Full system access, user management
- **MANAGER** - Inventory, pricing, settings (no admin user management)
- **STAFF** - View and update inventory, cannot manage users or critical settings
- **TECHNICIAN** - Update repair status, view assigned repairs
- **VIEWER** - Read-only access to all modules

## WooCommerce Integration

### Setup

1. Generate WooCommerce API keys:
   - Go to WooCommerce → Settings → Advanced → REST API
   - Create new API key with Read/Write permissions
   
2. Configure in Dashboard:
   - Navigate to Settings → WooCommerce Integration
   - Enter Store URL, Consumer Key, and Consumer Secret
   - Enable auto-sync if desired

### Features

- Automatic product creation
- Price synchronization
- Inventory status updates
- Manual and automatic sync modes

## API Routes

### Equipment
- `GET /api/equipment` - List all equipment
- `POST /api/equipment` - Create new equipment
- `GET /api/equipment/[id]` - Get equipment details
- `PUT /api/equipment/[id]` - Update equipment
- `DELETE /api/equipment/[id]` - Delete equipment
- `PUT /api/equipment/[id]/price` - Update price with history
- `POST /api/equipment/[id]/sync` - Sync to WooCommerce

### Vendors
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create new vendor

### Repairs
- `GET /api/repairs` - List all repairs
- `POST /api/repairs` - Create repair log

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Incoming Gear
- `GET /api/incoming-gear` - List all pending purchases with auto-refresh
- `POST /api/incoming-gear/[id]/mark-received` - Mark gear as received (with undo grace period)
- `POST /api/incoming-gear/[id]/undo-received` - Undo mark as received (within 10 minutes)
- `POST /api/incoming-gear/[id]/notify-client` - Send gear received email after grace period
- `POST /api/incoming-gear/[id]/start-inspection` - Create inspection session
- `POST /api/incoming-gear/[id]/send-final-quote` - Send final quote to client
- `GET /api/incoming-gear/pending-items/[id]` - Get item inspection details
- `PUT /api/incoming-gear/pending-items/[id]/inspection` - Update item inspection data

### Quote Confirmation (Public)
- `GET /api/quote-confirmation/[token]` - Get quote details
- `POST /api/quote-confirmation/[token]/tracking` - Submit tracking info
- `POST /api/quote-confirmation/[token]/decline` - Decline quote
- `POST /api/quote-confirmation/[token]/accept` - Accept quote
- `POST /api/quote-confirmation/[token]/submit-details` - Submit client details
- `POST /api/quote-confirmation/[token]/submit-consignment` - Submit consignment agreement

### Webhooks
- `POST /api/webhooks/quote-accepted` - Receive bot quote acceptance (requires API key)

### Settings
- `GET /api/settings/woocommerce` - Get WooCommerce settings
- `POST /api/settings/woocommerce` - Update WooCommerce settings

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Prisma commands
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed database
npm run prisma:studio      # Open Prisma Studio

# Complete database setup
npm run db:setup           # Migrate + Generate + Seed
```

## Project Structure

```
keysers-dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/                 # Login page
│   ├── (dashboard)/               # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx           # Main dashboard
│   │       ├── inventory/         # Inventory management
│   │       ├── vendors/           # Vendor management
│   │       ├── repairs/           # Repair tracking
│   │       ├── pricing/           # Price management
│   │       ├── consignment/       # Consignment tracking
│   │       ├── reports/           # Analytics & reports
│   │       ├── incoming/          # Incoming Gear management
│   │       ├── awaiting-payment/  # Payment tracking
│   │       ├── inspections/       # Gear inspection sessions
│   │       ├── accessories-demo/  # Demo page for UI options
│   │       └── settings/          # System settings
│   ├── (public)/                  # Public-facing pages
│   │   └── quote/[token]/
│   │       ├── page.tsx           # Quote review
│   │       ├── shipping/          # Shipping & tracking
│   │       ├── decline/           # Decline quote
│   │       ├── details/           # Client details form
│   │       ├── consignment/       # Consignment agreement
│   │       └── confirmation/      # Final confirmation
│   ├── api/                       # API routes
│   │   ├── equipment/             # Equipment CRUD
│   │   ├── vendors/               # Vendor management
│   │   ├── incoming-gear/         # Incoming gear & inspection
│   │   ├── quote-confirmation/    # Quote workflow
│   │   └── webhooks/              # Bot integration
│   └── layout.tsx                 # Root layout
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── dashboard/                 # Dashboard components
│   └── inspection/                # Inspection components
│       ├── ProductSearch.tsx      # Product search with auto-select
│       └── InspectItemModal.tsx   # Inspection modal (deprecated)
├── lib/
│   ├── auth.ts                    # Authentication logic
│   ├── prisma.ts                  # Prisma client
│   ├── woocommerce.ts             # WooCommerce integration
│   ├── email.ts                   # Email templates (Resend)
│   ├── tokens.ts                  # Secure token generation
│   └── types.ts                   # TypeScript types
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── seed.ts                    # Seed data
├── scripts/                       # Utility scripts
│   ├── add-accessory-templates.ts # Populate accessory templates
│   ├── add-test-products.ts       # Add test products
│   ├── create-fresh-test-purchase.ts # Create test purchase
│   └── check-inspection-data.ts   # Debug inspection data
└── public/                        # Static assets
```

## Future Enhancements

### In Progress
- [ ] Choose accessories checklist layout (4 options in demo page)
- [ ] Complete consignment workflow integration

### Planned
- [ ] Advanced analytics and reporting
- [ ] Email notifications for low stock
- [ ] Automated vendor payouts for consignment
- [ ] Mobile app for inspections and tracking
- [ ] Barcode/QR code scanning for equipment
- [ ] Multi-location support
- [ ] Customer management (buyers)
- [ ] Sales order processing
- [ ] Invoice generation
- [ ] Integration with accounting software (Xero, QuickBooks)
- [ ] SMS notifications via Kapso
- [ ] Bulk accessory template management
- [ ] Advanced price override analytics

## Documentation

Detailed implementation documentation is available in the following files:

### Project Status & Planning
- **PROJECT_STATUS.md** - Overall project status and roadmap
- **QUOTE_CONFIRMATION_IMPLEMENTATION.md** - Complete quote workflow documentation

### Sprint Documentation
- **SPRINT_1_SHIPPING_TRACKING.md** - Shipping & tracking feature implementation
- **SPRINT_1_SUMMARY.md** - Sprint 1 summary and achievements
- **SPRINT_2_INSPECTION_INTEGRATION.md** - Inspection system integration
- **SPRINT_2_SUMMARY.md** - Sprint 2 summary and achievements

### Feature-Specific Documentation
- **GEAR_VERIFICATION_IMPLEMENTATION.md** - Complete gear verification system guide
- **INSPECTION_MODAL_IMPLEMENTATION.md** - Inspection modal implementation details
- **TEST_INSPECTION_MODAL.md** - Testing guide for inspection modal
- **UNDO_MARK_AS_RECEIVED.md** - Undo feature implementation and UX details

### Testing
- **scripts/test-sprint1-tracking.sh** - Automated Sprint 1 tests
- **scripts/test-sprint2-inspection.md** - Manual Sprint 2 test procedures

## Support

For issues or questions, contact: admin@keysers.co.za

## License

Proprietary - Keysers Camera Equipment © 2026
