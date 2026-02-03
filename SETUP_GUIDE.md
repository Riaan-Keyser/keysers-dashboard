# Keysers Dashboard - Setup Guide

## Step-by-Step Installation

### 1. Configure Environment Variables

Edit `/home/riaan/keysers-dashboard/.env.local`:

```bash
# Database - Create a new database or use existing
DATABASE_URL="postgresql://keysers:YOUR_PASSWORD@localhost:5432/keysers_dashboard"

# NextAuth - Generate secret with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YOUR_GENERATED_SECRET_HERE"

# WooCommerce (Optional - configure later in dashboard)
WOO_STORE_URL="https://yourstore.com"
WOO_CONSUMER_KEY=""
WOO_CONSUMER_SECRET=""
```

### 2. Create Database

If you don't have a database yet:

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE keysers_dashboard;
CREATE USER keysers WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE keysers_dashboard TO keysers;
\q
```

### 3. Run Database Setup

```bash
cd /home/riaan/keysers-dashboard
npm run db:setup
```

This will:
- Create all tables
- Generate Prisma client
- Create admin user (admin@keysers.co.za / admin123)
- Add sample data

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and login with:
- Email: admin@keysers.co.za
- Password: admin123

### 5. Configure WooCommerce (Optional)

1. In your WordPress admin:
   - Go to WooCommerce → Settings → Advanced → REST API
   - Click "Add key"
   - Description: "Keysers Dashboard"
   - User: Select your admin user
   - Permissions: Read/Write
   - Click "Generate API key"
   - Copy the Consumer key and Consumer secret

2. In Keysers Dashboard:
   - Go to Settings → WooCommerce Integration
   - Paste your Store URL, Consumer Key, and Consumer Secret
   - Enable auto-sync if desired
   - Click Save

### 6. Change Admin Password

1. Login to dashboard
2. Go to Settings → User Management (coming soon)
3. Or update directly in database:

```bash
# Generate new password hash
node -e "console.log(require('bcryptjs').hashSync('your_new_password', 10))"

# Update in database
psql keysers_dashboard -c "UPDATE users SET password='PASTE_HASH_HERE' WHERE email='admin@keysers.co.za'"
```

## Production Deployment

### Option 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
cd /home/riaan/keysers-dashboard
npm run build

# Start with PM2
pm2 start npm --name "keysers-dashboard" -- start

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup
```

### Option 2: Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/keysers-dashboard
server {
    listen 80;
    server_name dashboard.keysers.co.za;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql "postgresql://keysers:password@localhost:5432/keysers_dashboard" -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 PID
```

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Add Users**: Create accounts for your team members
2. **Import Existing Inventory**: Add your current equipment
3. **Add Vendors**: Register your existing vendors/clients
4. **Configure WooCommerce**: Set up automatic sync
5. **Start Using**: Begin tracking new equipment arrivals

## Support

If you encounter issues:
1. Check the logs: `npm run dev` will show errors
2. Check database connection
3. Ensure all environment variables are set
4. Review the README.md for API documentation

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong NEXTAUTH_SECRET
- [ ] Database password is secure
- [ ] .env.local is in .gitignore
- [ ] SSL certificate installed (production)
- [ ] Firewall configured properly
- [ ] Regular backups scheduled
