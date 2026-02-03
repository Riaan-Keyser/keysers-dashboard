#!/bin/bash
# Clean up any stray Next.js processes on port 3000 and start fresh

set -e

echo "🔍 Checking for processes on port 3000..."

# Check if port 3000 is in use
PORT_PID=$(sudo ss -tlnp | grep :3000 | grep -oP '(?<=pid=)[0-9]+' | head -1 2>/dev/null || true)

if [ -n "$PORT_PID" ]; then
    echo "⚠️  Found process $PORT_PID on port 3000"
    echo "   Process details:"
    ps -fp $PORT_PID 2>/dev/null || true
    echo ""
    echo "   Stopping it..."
    
    # Try graceful kill first
    kill $PORT_PID 2>/dev/null || true
    sleep 2
    
    # Check if still running, force kill if needed
    if ps -p $PORT_PID > /dev/null 2>&1; then
        echo "   Process didn't respond to SIGTERM, using SIGKILL..."
        kill -9 $PORT_PID 2>/dev/null || true
        sleep 1
    fi
    
    echo "✅ Port 3000 cleared"
else
    echo "✅ Port 3000 is free"
fi

# Kill any other stray next-server processes
echo ""
echo "🧹 Cleaning up any orphaned Next.js dev servers..."
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo ""
echo "🚀 Starting Next.js dev server on port 3000..."
echo ""

cd /home/riaan/keysers-dashboard
npm run dev
