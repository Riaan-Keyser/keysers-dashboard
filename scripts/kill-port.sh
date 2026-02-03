#!/bin/bash
# Kill process using a specific port

if [ -z "$1" ]; then
    echo "Usage: $0 <port>"
    echo "Example: $0 3000"
    exit 1
fi

PORT=$1

echo "🔍 Checking for processes on port $PORT..."

# Get PID using the port
PORT_PID=$(sudo ss -tlnp | grep ":$PORT" | grep -oP '(?<=pid=)[0-9]+' | head -1 2>/dev/null || true)

if [ -z "$PORT_PID" ]; then
    echo "✅ No process found on port $PORT"
    exit 0
fi

echo "⚠️  Found process $PORT_PID on port $PORT"
echo ""
echo "Process details:"
ps -fp $PORT_PID 2>/dev/null || true
echo ""

# Confirm before killing
read -p "Do you want to kill this process? [y/N] " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Stopping process $PORT_PID..."
    
    # Try graceful kill first
    kill $PORT_PID 2>/dev/null || true
    sleep 2
    
    # Check if still running
    if ps -p $PORT_PID > /dev/null 2>&1; then
        echo "Process didn't respond to SIGTERM, using SIGKILL..."
        kill -9 $PORT_PID 2>/dev/null || true
        sleep 1
    fi
    
    # Verify it's gone
    if ps -p $PORT_PID > /dev/null 2>&1; then
        echo "❌ Failed to kill process $PORT_PID"
        exit 1
    else
        echo "✅ Process killed successfully"
        echo "✅ Port $PORT is now free"
    fi
else
    echo "❌ Cancelled"
    exit 0
fi
