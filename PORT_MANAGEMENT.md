# Port 3000 Management Guide

## Quick Reference

### Check What's Using Port 3000
```bash
sudo ss -tlnp | grep :3000
# or
npm run check-port
```

### Kill All Next.js Dev Servers
```bash
npm run kill-dev
```

### Start Clean Dev Server
```bash
npm run dev:clean
# or use the script
./scripts/dev-clean.sh
```

### Kill Specific Port
```bash
./scripts/kill-port.sh 3000
```

---

## Common Scenarios

### 1. "Port 3000 is already in use"

**Quick Fix:**
```bash
npm run dev:clean
```

**Manual Fix:**
```bash
# Find the process
sudo ss -tlnp | grep :3000

# Kill it (replace PID with actual process ID)
kill -9 <PID>

# Start your dev server
npm run dev
```

### 2. Orphaned Process After SSH Disconnect

**Prevention:**
- Always use `Ctrl+C` to stop dev server before closing terminal
- Or use PM2 for production: `pm2 start ecosystem.config.js`

**Fix:**
```bash
./scripts/dev-clean.sh
```

### 3. Multiple Dev Servers Running

```bash
# List all Next.js processes
ps aux | grep next-server

# Kill all of them
npm run kill-dev

# Start fresh
npm run dev
```

---

## Production Deployment

### Using PM2 (Recommended)

Port 3001 is configured for production in `ecosystem.config.js`:

```bash
# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Enable auto-start on reboot
pm2 startup
# Run the command it outputs
pm2 save

# Manage
pm2 status
pm2 logs keysers-dashboard
pm2 restart keysers-dashboard
pm2 stop keysers-dashboard
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run dev:clean` | Kill existing dev servers and start fresh |
| `npm run kill-dev` | Kill all Next.js dev servers |
| `npm run check-port` | Check if port 3000 is in use |
| `./scripts/dev-clean.sh` | Interactive cleanup and start |
| `./scripts/kill-port.sh 3000` | Kill process on specific port |

---

## Troubleshooting

### Process Won't Die
```bash
# Force kill with -9
kill -9 <PID>
```

### Can't Find Process But Port Still In Use
```bash
# List all processes on port 3000
sudo lsof -i :3000
sudo netstat -tlnp | grep :3000
sudo ss -tlnp | grep :3000

# Kill by port (if lsof shows the PID)
sudo fuser -k 3000/tcp
```

### After Reboot Port Still Occupied
Check for systemd services or PM2 auto-start:
```bash
# Check systemd services
sudo systemctl list-units --type=service | grep next

# Check PM2
pm2 list

# Disable PM2 auto-start if needed
pm2 unstartup
```

---

## Best Practices

1. **Development**: Use `npm run dev` or `npm run dev:clean`
2. **Production**: Use PM2 with `ecosystem.config.js` (port 3001)
3. **Always stop servers gracefully**: Use `Ctrl+C` in terminal
4. **Before closing SSH**: Stop running dev servers
5. **Regular checks**: Run `ps aux | grep next-server` to check for orphans

---

## Files

- `scripts/dev-clean.sh` - Clean and start dev server
- `scripts/kill-port.sh` - Kill process on specific port  
- `ecosystem.config.js` - PM2 configuration (production, port 3001)
- `package.json` - NPM scripts for port management

---

## Emergency Recovery

If everything fails and you can't start the server:

```bash
# Nuclear option: Kill everything Node-related
pkill -9 node

# Wait a moment
sleep 2

# Start fresh
cd /home/riaan/keysers-dashboard
npm run dev
```

**Warning**: This will kill ALL Node processes, including PM2 and other Node apps!
