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
- **Auto-repair workflow** - Items flagged during inspection appear after payment
- **Repairs badge** - Red notification for items requiring repair
- Dual tab view: Active Repairs and Requiring Repair

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
- Client gear receiving with one-click "Received" button
- 10-minute undo grace period with centered confirmation modal
- Auto-inspection session creation on gear receipt
- Product preview before gear is received (for search/reference)
- Final quote generation and client approval flow
- **Product selection page** - Client chooses Buy vs Consignment per item
- **5-step details form** - Personal info, address, banking, document upload, terms
- **Dynamic terms & conditions** - Consignment Agreement and/or Purchase Agreement
- **Consignment period tracking** - Client sets end date for consignment
- **Electronic signature** - ECTA-compliant with IP and timestamp logging
- **PDF agreement generation** - Auto-generated Purchase and Consignment agreements
- **Payment tracking** - Awaiting Payment and Payment Completed tabs
- **Invoice generation** - Complete payment invoice with client banking details

✅ **Gear Verification & Inspection System**
- Product identification with auto-search and auto-selection
- **Add additional products** - Modal to add unexpected items to existing inspections
- Condition assessment with multipliers (Like New, Excellent, Very Good, Good, Worn)
- **Serial number moved to Step 1** - Captured earlier in workflow
- Product-specific accessories checklist (Lenses, Camera Bodies, Tripods)
- Smart penalty system for missing accessories
- Dynamic badge visibility (only shows when unchecked)
- Type-specific verification questions
- General notes and observations logging
- Auto-computed pricing based on condition and accessories
- **"Not interested in purchasing"** option with reasons (Damage, Uneconomical, Mold, Other)
- Automatic price zeroing and input disabling for declined items
- **"Mark for repair"** flag with repair notes for items requiring post-purchase repair
- **Purchase Decision moved to Step 2** - After condition assessment, before pricing
- Admin-only price override with mandatory reason tracking
- **Fixed-height containers** - Prevents layout shifts during product selection
- **Expanded client state persistence** - Returns to same client when navigating back
- **Smart search behavior** - Empty for new items, auto-populated for quote items
- **Smooth search experience** - No flashing or visual glitches during searches
- Audit trail for all verification steps

✅ **Accessories Management**
- Product-type-specific accessory templates
- **Lenses**: Front/Rear Caps, Lens Hood, Tripod Collar, Drop-In Filter, Hard Case, Packaging
- **Camera Bodies**: Battery, Charger, Camera Strap, Packaging
- **Tripods**: Baseplate
- Automatic penalty calculation for missing items
- Compact 2-column grid layout
- Optional notes per accessory

✅ **Payment Management**
- **Awaiting Payment tab** - Track active payments with instant payment totals
- **Payment Completed tab** - Historical payment records and tracking
- **Smart calculations** - Separate Buy (instant payment) vs Consignment (paid on sale)
- **Stats dashboard** - Buy items count, Consignment items count, Total Payable Value
- **PDF generation** - Purchase Agreement, Consignment Agreement, and Payment Invoice
- **Email notifications** - Auto-notify admin@keysers.co.za when payment pending
- **Sidebar badges** - Red notification badges on Incoming Gear, Awaiting Payment, and Repairs
- **Mark as Paid** - Move purchases to Payment Completed (triggers repair workflow if flagged)
- **Auto-repair workflow** - Items marked for repair appear in Repairs tab after payment

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui Components
- **Icons**: Lucide React
- **Email**: Resend API for transactional emails
- **PDF Generation**: pdf-lib for agreement and invoice PDFs
- **Bot Integration**: Kapso WhatsApp Bot API
- **WooCommerce**: REST API Integration
- **File Uploads**: Native file handling with validation
- **Security**: ECTA-compliant electronic signatures, POPIA data protection

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
7. Staff Inspects Each Item:
   - Product identification (auto-search & auto-select)
   - Condition selection (Like New → Worn)
   - Accessories checklist (product-type specific)
   - Serial number capture
   - Notes and observations
   - Auto-computed pricing (buy & consignment)
   - **Purchase decision**: Mark as "Not interested" OR continue
   - **Repair flag**: Mark for repair (if needed after purchase)
   - Admin price override (optional with reason)
   ↓
8. Staff Clicks "Confirm - Send Final Quote to Client"
   ↓
9. Final Quote Email Sent with Secure Link
   ↓
10. Client Opens Link → Product Selection Page
    - Reviews each inspected item with full details
    - Selects "Buy" or "Consignment" for EACH item
    - Sees side-by-side pricing comparison
   ↓
11. Client Redirected to 5-Step Details Form:
    Step 1: Personal Information (Name, ID/Passport, Email, Phone, DOB)
    Step 2: Address (Physical & Postal addresses)
    Step 3: Banking Details (Bank, Account, Branch Code - REQUIRED)
    Step 4: Document Upload (ID, Proof of Address, Bank Confirmation)
    Step 5: Terms & Conditions
       - If BUY items: Purchase Agreement (Supplier's Invoice terms)
       - If CONSIGNMENT items: Consignment Agreement + End Date
       - ECTA electronic signature notice
       - POPIA data protection notice
   ↓
12. Client Clicks "Submit & Confirm"
    - Client selections saved (Buy/Consignment per item)
    - Client details saved to database
    - Terms acceptance logged with timestamp
    - Status: FINAL_QUOTE_SENT → AWAITING_PAYMENT
    - Token invalidated (one-time use)
   ↓
13. Client Sees Thank You Page
    - "Keysers has received your paperwork!"
    - Timeline of next steps
   ↓
14. Admin Auto-Notified via Email (admin@keysers.co.za)
    - Payment Awaiting notification
    - Customer details, total amount, purchase ID
    - Link to dashboard
   ↓
15. Dashboard Updates Automatically:
    - Purchase removed from "Incoming Gear"
    - Purchase appears in "Awaiting Payment" tab
    - Red badge "1" appears on sidebar
   ↓
16. Staff Reviews Awaiting Payment:
    - Sees instant payment total (BUY items only)
    - Views all client details (personal, address, banking)
    - Sees item selections (Buy vs Consignment badges)
    - Downloads PDF agreements:
      * Purchase Agreement (for Buy items)
      * Consignment Agreement (for Consignment items)
    - Downloads Payment Invoice (complete record)
   ↓
17. Staff Clicks "Mark as Paid"
    - Status: AWAITING_PAYMENT → PAYMENT_RECEIVED
    - Purchase moves to "Payment Completed" tab
    - **Items marked for repair** automatically appear in Repairs tab
    - **Repairs badge** updates with count
    - Activity logged for audit trail
    - Badge counts update
   ↓
18. Equipment Ready to Enter Inventory
    - Buy items: Paid and ready for sale
    - Consignment items: Tracked for payment on sale
    - **Repair items**: Visible in Repairs tab for technician assignment
```

### Inspection Workflow

```
Incoming Gear → Click "Received" → Auto-creates Inspection Session
   ↓
For Each Item:
   Step 1: Identify Product
      - Search and select product (auto-populated for quote items, empty for new items)
      - Serial number capture (moved to Step 1 for early capture)
      - Fixed-height layout prevents shifting
   
   Step 2: Verify & Condition
      - Select condition (Like New, Excellent, Very Good, Good, Worn)
      - Accessories checklist (product-type specific with penalties)
      - Type-specific verification questions
      - General notes and observations
      - **Purchase Decision** (moved to Step 2):
         • Mark as "Not interested" with reason (Damage, Uneconomical, Mold, Other)
           - Automatically zeros all pricing fields
           - Disables price inputs
         • Mark for repair with repair notes
           - Item moves to Repairs tab after payment
   
   Step 3: Review Pricing
      - Auto-computed prices based on condition and accessories
      - Admin-only price override with mandatory reason
   
   Step 4: Approve Item (locks record)
   ↓
Add Additional Items (Optional):
   - Click "Add Products" button
   - Fill in client-provided details via modal
   - Item added to inspection with empty search bar
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
- **VerifiedGearItem** - Verified product data with purchase decision flags
  - `notInterested` (Boolean) - Flag for declined items
  - `notInterestedReason` (Enum) - Reason: DAMAGE, UNECONOMICAL_TO_REPAIR, MOLD_IN_PRODUCT, OTHER
  - `notInterestedReasonOther` (String) - Custom reason when OTHER selected
  - `requiresRepair` (Boolean) - Flag for items requiring post-purchase repair
  - `repairNotes` (String) - Description of repair requirements
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
PENDING_REVIEW → AWAITING_DELIVERY → INSPECTION_IN_PROGRESS (auto-created)
   ↓
FINAL_QUOTE_SENT → (Client submits details) → AWAITING_PAYMENT
   ↓
PAYMENT_RECEIVED → Items marked for repair → Repairs Tab
   ↓
PAYMENT_RECEIVED → COMPLETED → Equipment enters inventory
```

**Key Status Transitions:**
- `FINAL_QUOTE_SENT` - After staff sends final quote email
- `AWAITING_PAYMENT` - After client submits details form (appears in Awaiting Payment tab)
- `PAYMENT_RECEIVED` - After staff marks as paid (appears in Payment Completed tab)
- `COMPLETED` - Final state, equipment ready for inventory

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
- `GET /api/repairs` - List all repairs (includes items requiring repair from paid purchases)
- `POST /api/repairs` - Create repair log

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Incoming Gear
- `GET /api/incoming-gear` - List all pending purchases with auto-refresh
- `POST /api/incoming-gear/[id]/mark-received` - Mark gear as received (auto-creates inspection session)
- `POST /api/incoming-gear/[id]/undo-received` - Undo mark as received (within 10 minutes)
- `POST /api/incoming-gear/[id]/notify-client` - Send gear received email after grace period
- `POST /api/incoming-gear/[id]/start-inspection` - Create inspection session (now auto-created on received)
- `POST /api/incoming-gear/[id]/send-final-quote` - Send final quote to client
- `POST /api/incoming-gear/[id]/mark-paid` - Mark purchase as paid (triggers repair workflow if flagged)
- `POST /api/incoming-gear/sessions/[sessionId]/add-item` - Add additional product to existing inspection
- `GET /api/incoming-gear/pending-items/[id]` - Get item inspection details
- `PUT /api/incoming-gear/pending-items/[id]/inspection` - Update item inspection data
- `PATCH /api/inspections/items/[itemId]` - Update purchase decision (not interested, mark for repair, repair notes)

### Quote Confirmation (Public)
- `GET /api/quote-confirmation/[token]` - Get quote details
- `GET /api/quote-confirmation/[token]/inspection` - Get detailed inspection data
- `POST /api/quote-confirmation/[token]/tracking` - Submit tracking info
- `POST /api/quote-confirmation/[token]/decline` - Decline quote
- `POST /api/quote-confirmation/[token]/submit-details` - Submit client details with product selections

### Awaiting Payment & PDFs
- `GET /api/awaiting-payment/[id]/generate-agreement-pdf?type=purchase` - Generate Purchase Agreement PDF
- `GET /api/awaiting-payment/[id]/generate-agreement-pdf?type=consignment` - Generate Consignment Agreement PDF
- `GET /api/awaiting-payment/[id]/generate-invoice-pdf` - Generate Payment Invoice PDF

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
│   │       ├── select-products/   # Product selection (Buy vs Consignment)
│   │       ├── details/           # 5-step client details form
│   │       └── confirmed/         # Thank you confirmation
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
│       ├── ProductSearch.tsx      # Product search with auto-select and smooth UX
│       ├── AddItemModal.tsx       # Modal for adding additional products to inspections
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

### Recently Completed ✅
- [x] Client product selection page (Buy vs Consignment)
- [x] 5-step client details form with validation
- [x] Dynamic terms & conditions (Purchase + Consignment agreements)
- [x] Awaiting Payment dashboard with filtering
- [x] Payment Completed tracking
- [x] PDF generation (Purchase Agreement, Consignment Agreement, Invoice)
- [x] Smart payment calculations (instant payment vs consignment)
- [x] Email notifications for pending payments
- [x] Sidebar notification badges (Incoming Gear, Awaiting Payment, Repairs)
- [x] "Not interested in purchasing" workflow with reasons (Damage, Uneconomical, Mold, Other)
- [x] Automatic price zeroing and input disabling for declined items
- [x] "Mark for repair" workflow with repair notes and post-payment tracking
- [x] Auto-inspection session creation on gear receipt
- [x] Product visibility before gear receipt (for search/reference)
- [x] Add Item modal for adding unexpected products to inspections
- [x] Serial Number moved to Step 1 for earlier capture
- [x] Purchase Decision moved to Step 2 (after condition assessment)
- [x] Fixed-height containers to prevent layout shifts
- [x] Expanded client state persistence using sessionStorage
- [x] Smart ProductSearch with no flashing or visual glitches
- [x] Empty search bar for new items vs auto-populated for quote items

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

### Latest Enhancements
- **INSPECTION_WORKFLOW_ENHANCEMENTS_SUMMARY.md** - "Not interested" and "Mark for repair" features
- **INSPECTION_WORKFLOW_ENHANCEMENTS_TESTING.md** - Testing guide for new inspection features

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
- **COMPLETE_QUOTE_FLOW_SUMMARY.md** - End-to-end quote flow from inspection to payment
- **AWAITING_PAYMENT_ENHANCEMENTS.md** - Payment management and PDF generation
- **AWAITING_PAYMENT_FIXES.md** - Latest payment page fixes and calculations

### Testing
- **scripts/test-sprint1-tracking.sh** - Automated Sprint 1 tests
- **scripts/test-sprint2-inspection.md** - Manual Sprint 2 test procedures

## Support

For issues or questions, contact: admin@keysers.co.za

## License

Proprietary - Keysers Camera Equipment © 2026
