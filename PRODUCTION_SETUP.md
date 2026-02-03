# Production Setup Guide - Keysers Dashboard

This guide will help you set up the dashboard to run 24/7 and automatically restart after power loss or crashes.

## Prerequisites

- Node.js 18+
- PM2 installed globally
- PostgreSQL database running

## Step 1: Build the Production Version

```bash
cd /home/riaan/keysers-dashboard
npm run build
```

This creates an optimized production build.

## Step 2: Create Logs Directory

```bash
mkdir -p /home/riaan/keysers-dashboard/logs
```

## Step 3: Start with PM2

```bash
pm2 start ecosystem.config.js
```

This will:
- Start the dashboard on port 3000
- Run in production mode
- Auto-restart on crashes
- Log all output to `/home/riaan/keysers-dashboard/logs/`

## Step 4: Enable Auto-Start on Boot

This ensures the dashboard starts automatically after power loss or server reboot:

```bash
# Save the current PM2 process list
pm2 save

# Generate and configure startup script
pm2 startup

# Follow the command it outputs (it will look like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u riaan --hp /home/riaan
```

**Important**: Run the `sudo env PATH=...` command that PM2 outputs!

## Step 5: Verify Setup

```bash
# Check status
pm2 status

# View logs
pm2 logs keysers-dashboard

# Monitor in real-time
pm2 monit
```

## Managing the Dashboard

### Start/Stop/Restart

```bash
# Start
pm2 start keysers-dashboard

# Stop
pm2 stop keysers-dashboard

# Restart
pm2 restart keysers-dashboard

# Reload (zero-downtime restart)
pm2 reload keysers-dashboard
```

### View Logs

```bash
# Real-time logs
pm2 logs keysers-dashboard

# Last 100 lines
pm2 logs keysers-dashboard --lines 100

# Error logs only
pm2 logs keysers-dashboard --err
```

### Monitor Performance

```bash
# Dashboard view
pm2 monit

# List all processes
pm2 list

# Detailed info
pm2 info keysers-dashboard
```

## Update After Code Changes

When you make changes to the code:

```bash
cd /home/riaan/keysers-dashboard

# Build new version
npm run build

# Restart with zero downtime
pm2 reload keysers-dashboard
```

## Running Both Servers

You'll have two PM2 processes running:

1. **keysers-bot** (Flask server on port 5002)
2. **keysers-dashboard** (Next.js dashboard on port 3000)

```bash
# View both
pm2 list

# Should show:
# ┌────┬──────────────────────┬─────────┬─────────┐
# │ id │ name                 │ status  │ port    │
# ├────┼──────────────────────┼─────────┼─────────┤
# │ 0  │ keysers-bot          │ online  │ 5002    │
# │ 1  │ keysers-dashboard    │ online  │ 3000    │
# └────┴──────────────────────┴─────────┴─────────┘
```

## Nginx Reverse Proxy (Optional but Recommended)

For production, set up Nginx to:
- Serve dashboard on a domain (e.g., dashboard.keysers.co.za)
- Add SSL certificate
- Handle caching

Create `/etc/nginx/sites-available/keysers-dashboard`:

```nginx
server {
    listen 80;
    server_name dashboard.keysers.co.za;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.keysers.co.za;

    # SSL certificates (use certbot to generate)
    ssl_certificate /etc/letsencrypt/live/dashboard.keysers.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.keysers.co.za/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/keysers-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Dashboard won't start

```bash
# Check logs
pm2 logs keysers-dashboard --err

# Check if port 3000 is in use
lsof -i :3000

# Restart PM2
pm2 restart keysers-dashboard
```

### After system reboot, PM2 not starting

```bash
# Check PM2 startup status
systemctl status pm2-riaan

# Re-run startup command
pm2 startup
pm2 save
```

### Check auto-restart is working

```bash
# Kill the process (PM2 will auto-restart it)
pm2 stop keysers-dashboard
sleep 2
pm2 list
# It should show "online" again
```

## System Resources

The dashboard uses approximately:
- **Memory**: 200-500MB
- **CPU**: 1-5% (idle), up to 50% (under load)

Combined with Flask bot:
- **Total Memory**: ~700MB-1GB
- **Total CPU**: 2-10% average

## Security Checklist

- [ ] Changed default admin password
- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured (ufw)
- [ ] Database backups scheduled
- [ ] PM2 logs rotation configured
- [ ] Environment variables secure
- [ ] Regular system updates

## Backup Strategy

Set up automated backups:

```bash
# Database backup script
cat > /home/riaan/backup-dashboard-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/riaan/backups/dashboard"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump keysers_dashboard > $BACKUP_DIR/dashboard_$DATE.sql
pg_dump keysers_inventory > $BACKUP_DIR/inventory_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/riaan/backup-dashboard-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/riaan/backup-dashboard-db.sh") | crontab -
```

## Support

For issues:
- Check PM2 logs: `pm2 logs keysers-dashboard`
- Check system logs: `journalctl -u pm2-riaan`
- Restart: `pm2 restart keysers-dashboard`
