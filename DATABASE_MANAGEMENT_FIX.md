# Database Management Fix - Summary

**Date:** 2026-02-08  
**Issue:** SASL authentication error when accessing Database Management in Settings  
**Status:** ✅ Fixed

## Problem

When trying to access the **Database Management** section under **Settings**, you encountered this error:

```
SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

## Root Cause

The `keysers_inventory` database connection credentials were not configured in the `.env` file. The password was defaulting to an empty string, which PostgreSQL's SASL authentication mechanism rejects.

## What Was Fixed

### 1. Added Missing Environment Variables

Updated `.env.example` with the required inventory database credentials:

```bash
INVENTORY_DB_HOST=localhost
INVENTORY_DB_PORT=5432
INVENTORY_DB_NAME=keysers_inventory
INVENTORY_DB_USER=keysers
INVENTORY_DB_PASSWORD=your_inventory_db_password_here
```

### 2. Improved Connection Validation

Updated `lib/inventory-db.ts`:
- Added validation check for missing credentials
- Changed password default from empty string to `undefined`
- Added helpful console warnings on startup

### 3. Enhanced Error Handling

Updated `app/api/admin/inventory-db/route.ts`:
- Pre-flight check for missing credentials (returns 503 with helpful message)
- Specific error messages for SASL/password issues
- Specific error messages for connection refused errors
- Clear instructions in error responses

### 4. Created Setup Documentation

Added comprehensive guide: `INVENTORY_DB_SETUP.md`

## How to Fix This Issue

### Step 1: Create the Inventory Database (if not exists)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE keysers_inventory;

# Create a user (if needed)
CREATE USER keysers WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE keysers_inventory TO keysers;

# Exit
\q
```

### Step 2: Configure Your `.env` File

Open your `.env` file (NOT `.env.example`) and add these lines:

```bash
# Inventory Database Configuration
INVENTORY_DB_HOST=localhost
INVENTORY_DB_PORT=5432
INVENTORY_DB_NAME=keysers_inventory
INVENTORY_DB_USER=keysers
INVENTORY_DB_PASSWORD=your_actual_password_here
```

**Important:** Replace `your_actual_password_here` with the real password you set in Step 1.

### Step 3: Restart Your Server

```bash
# Stop the current server (Ctrl+C if running)

# Start again
npm run dev
```

### Step 4: Test the Connection

1. Navigate to **Settings** → **Database Management**
2. You should now see a list of tables from the `keysers_inventory` database
3. Click on any table to view/edit data

## Verification

If everything is working correctly, you should see:

✅ No error message in the Database Management section  
✅ A list of tables (if any exist in `keysers_inventory`)  
✅ Ability to click on tables and view data

If you still see errors, check the troubleshooting section in `INVENTORY_DB_SETUP.md`.

## Common Issues After Fix

### "Database does not exist"

**Solution:** The `keysers_inventory` database hasn't been created yet. Follow Step 1 above.

### "Password authentication failed"

**Solution:** The password in `.env` doesn't match the PostgreSQL user password. Verify with:

```bash
psql -h localhost -U keysers -d keysers_inventory
```

If this works in the terminal but not in the app, check for typos in your `.env` file.

### Still getting SASL error

**Solution:** 
1. Ensure you edited `.env` (not `.env.example`)
2. Restart the dev server completely
3. Check the password has no quotes or extra spaces: `INVENTORY_DB_PASSWORD=mypassword`

## Testing the Fix

To verify the fix is working:

```bash
# Check if credentials are loaded
cd /home/riaan/keysers-dashboard
node -e "require('dotenv').config(); console.log('Password set:', !!process.env.INVENTORY_DB_PASSWORD)"

# Should output: "Password set: true"
```

## Architecture Note

The Keysers Dashboard uses **two separate databases**:

1. **`keysers_dashboard`** (Prisma-managed)
   - Operational data: users, orders, webhooks, etc.
   - Configured via `DATABASE_URL`

2. **`keysers_inventory`** (Direct SQL)
   - Catalog data: products, specifications, etc.
   - Configured via `INVENTORY_DB_*` variables
   - Accessed through Database Management UI

## Files Changed

- ✅ `.env.example` - Added inventory DB variables
- ✅ `lib/inventory-db.ts` - Improved validation and warnings
- ✅ `app/api/admin/inventory-db/route.ts` - Enhanced error handling
- ✅ `INVENTORY_DB_SETUP.md` - Complete setup guide
- ✅ This file - Fix summary

## Next Steps

Once the Database Management is working:

1. **Import catalog data** (if not already done)
2. **Run catalog cleanup plan** - See `CATALOG_DATABASE_CLEANUP.md`
3. **Enrich with Lensfun** - See `LENSFUN_INTEGRATION.md`

## Git Status

Changes committed to branch `develop`:
```
commit b92015d
fix: resolve inventory database SASL authentication error
```

## Support

If you need further assistance:
1. Check `INVENTORY_DB_SETUP.md` for detailed troubleshooting
2. Review server logs for specific error messages
3. Test database connection manually with `psql`
4. Contact: admin@keysers.co.za
