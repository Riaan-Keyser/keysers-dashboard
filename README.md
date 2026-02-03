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

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + Custom Components
- **Icons**: Lucide React
- **WooCommerce**: REST API Integration

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

## Database Schema

### Core Models

- **User** - System users with role-based permissions
- **Vendor** - Clients selling equipment to you
- **Equipment** - Main inventory items
- **RepairLog** - Repair tracking records
- **PriceHistory** - Price change audit trail
- **ActivityLog** - Complete system audit log
- **WooSettings** - WooCommerce integration settings

### Equipment Status Flow

```
PENDING_INSPECTION → INSPECTED → READY_FOR_SALE → SOLD
                          ↓
                     IN_REPAIR → REPAIR_COMPLETED
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
│   │   └── login/         # Login page
│   ├── (dashboard)/       # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx           # Main dashboard
│   │       ├── inventory/         # Inventory management
│   │       ├── vendors/           # Vendor management
│   │       ├── repairs/           # Repair tracking
│   │       ├── pricing/           # Price management
│   │       ├── consignment/       # Consignment tracking
│   │       ├── reports/           # Analytics & reports
│   │       └── settings/          # System settings
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Reusable UI components
│   └── dashboard/         # Dashboard-specific components
├── lib/
│   ├── auth.ts            # Authentication logic
│   ├── prisma.ts          # Prisma client
│   ├── woocommerce.ts     # WooCommerce integration
│   └── types.ts           # TypeScript types
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
└── public/                # Static assets
```

## Future Enhancements

- [ ] Advanced analytics and reporting
- [ ] Email notifications for low stock
- [ ] Automated vendor payouts for consignment
- [ ] Mobile app
- [ ] Barcode/QR code scanning
- [ ] Multi-location support
- [ ] Customer management (buyers)
- [ ] Sales order processing
- [ ] Invoice generation
- [ ] Integration with accounting software

## Support

For issues or questions, contact: admin@keysers.co.za

## License

Proprietary - Keysers Camera Equipment © 2026
