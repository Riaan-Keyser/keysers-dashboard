# Inventory Database Setup Guide

## Overview

The Keysers Dashboard uses **two separate PostgreSQL databases**:

1. **`keysers_dashboard`** - Main application database (managed by Prisma)
2. **`keysers_inventory`** - Catalog/inventory database (managed separately)

## Why Two Databases?

- **`keysers_dashboard`** contains operational data (users, orders, inspections, webhooks, etc.)
- **`keysers_inventory`** contains catalog data imported from Excel/external sources

This separation allows for independent management of catalog data while keeping the main application database clean and Prisma-managed.

## Setting Up the Inventory Database

### Step 1: Create the Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE keysers_inventory;

# Create a user (if not exists)
CREATE USER keysers WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE keysers_inventory TO keysers;

# Exit psql
\q
```

### Step 2: Configure Environment Variables

Add the following to your `.env` file (NOT `.env.example`):

```bash
# Inventory Database Configuration
INVENTORY_DB_HOST=localhost
INVENTORY_DB_PORT=5432
INVENTORY_DB_NAME=keysers_inventory
INVENTORY_DB_USER=keysers
INVENTORY_DB_PASSWORD=your_secure_password_here
```

**Important:** Make sure the password matches what you set in Step 1.

### Step 3: Verify Connection

Restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Start again
npm run dev
```

Navigate to **Settings** → **Database Management** in the dashboard. You should now see the inventory database tables.

## Common Issues

### Error: "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string"

**Cause:** `INVENTORY_DB_PASSWORD` is not set or is empty in `.env`

**Solution:**
1. Open your `.env` file (NOT `.env.example`)
2. Add or update: `INVENTORY_DB_PASSWORD=your_actual_password`
3. Restart the dev server

### Error: "ECONNREFUSED"

**Cause:** PostgreSQL is not running or the connection details are incorrect

**Solution:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or `brew services list` (Mac)
2. Verify `INVENTORY_DB_HOST` and `INVENTORY_DB_PORT` in `.env`
3. Test connection manually: `psql -h localhost -U keysers -d keysers_inventory`

### Error: "Database does not exist"

**Cause:** The `keysers_inventory` database hasn't been created

**Solution:** Follow Step 1 above to create the database

### Error: "Password authentication failed"

**Cause:** Incorrect username or password in `.env`

**Solution:**
1. Verify credentials: `psql -h localhost -U keysers -d keysers_inventory`
2. If it works in psql but not in the app, check for typos in `.env`
3. Ensure no extra spaces or quotes around the password value

## Database Structure

The `keysers_inventory` database should contain:

- **Catalog tables** - Product listings, specifications, pricing
- **Imported data** - Data from "Keysers inventory data - Cleaning up.xlsx"
- **Future tables** - `catalog_items`, `catalog_ocr_aliases` (from cleanup plan)

## Accessing the Database

### Via Dashboard

1. Navigate to **Settings** → **Database Management**
2. Click on any table name to view/edit data
3. Admin-only access required

### Via CLI

```bash
# Connect to database
psql -h localhost -U keysers -d keysers_inventory

# List tables
\dt

# Query data
SELECT * FROM your_table_name LIMIT 10;

# Exit
\q
```

### Via pgAdmin / DBeaver

- **Host:** localhost
- **Port:** 5432
- **Database:** keysers_inventory
- **Username:** keysers
- **Password:** (from your `.env`)

## Security Notes

- ✅ Never commit `.env` to git (it's in `.gitignore`)
- ✅ Use strong passwords for production
- ✅ Keep `keysers_inventory` on the same server as `keysers_dashboard`
- ✅ Backup both databases regularly
- ⚠️ The inventory database is accessed via raw SQL queries (not Prisma)

## Next Steps

Once the inventory database is connected:

1. **Import catalog data** - Use the database management UI or SQL scripts
2. **Run catalog cleanup** - Follow `CATALOG_DATABASE_CLEANUP.md` plan
3. **Enrich with Lensfun** - Follow `LENSFUN_INTEGRATION.md` guide

## Troubleshooting

If you continue to have issues:

1. Check server logs for detailed error messages
2. Verify PostgreSQL is listening on the correct port: `netstat -an | grep 5432`
3. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
4. Ensure firewall allows connections to port 5432
5. Test with minimal connection: `psql -h localhost -U keysers -d keysers_inventory -c "SELECT 1;"`

## Support

For additional help, contact: admin@keysers.co.za
