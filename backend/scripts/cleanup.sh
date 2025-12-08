#!/bin/bash

# Cleanup script for workflowpp development servers
# Kills all node processes on development ports and cleans up stale processes

echo "=== Workflowpp Cleanup Utility ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill processes on a port
kill_port() {
    local port=$1
    local name=$2

    pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Killing $name processes on port $port...${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null
        echo -e "${GREEN}  Killed PIDs: $pids${NC}"
    else
        echo -e "${GREEN}  Port $port is clear${NC}"
    fi
}

# Kill backend and UI servers
echo "Stopping development servers..."
kill_port 5000 "Backend"
kill_port 3000 "UI"

# Kill any orphaned node processes related to workflowpp
echo ""
echo "Checking for orphaned node processes..."
orphans=$(ps aux | grep -E 'node.*workflowpp' | grep -v grep | awk '{print $2}')
if [ -n "$orphans" ]; then
    echo -e "${YELLOW}Killing orphaned workflowpp node processes...${NC}"
    echo "$orphans" | xargs kill -9 2>/dev/null
    echo -e "${GREEN}  Killed orphaned PIDs: $orphans${NC}"
else
    echo -e "${GREEN}  No orphaned processes found${NC}"
fi

# Clean up checkpoint files older than 1 hour
echo ""
echo "Cleaning up stale checkpoint files..."
checkpoint_dir="$(dirname "$0")/../data/checkpoints"
if [ -d "$checkpoint_dir" ]; then
    stale_files=$(find "$checkpoint_dir" -name "*.checkpoint.json" -mmin +60 2>/dev/null)
    if [ -n "$stale_files" ]; then
        echo -e "${YELLOW}Removing stale checkpoints:${NC}"
        echo "$stale_files" | while read f; do
            rm -f "$f"
            echo -e "${GREEN}  Removed: $(basename "$f")${NC}"
        done
    else
        echo -e "${GREEN}  No stale checkpoints found${NC}"
    fi
else
    echo -e "${GREEN}  Checkpoint directory does not exist yet${NC}"
fi

# Optional: Clear webpack cache
if [ "$1" == "--clear-cache" ]; then
    echo ""
    echo "Clearing webpack cache..."
    ui_cache="$(dirname "$0")/../../ui/node_modules/.cache"
    if [ -d "$ui_cache" ]; then
        rm -rf "$ui_cache"
        echo -e "${GREEN}  UI webpack cache cleared${NC}"
    fi
fi

echo ""
echo -e "${GREEN}=== Cleanup Complete ===${NC}"
echo ""
echo "To start servers fresh:"
echo "  Backend: cd backend && npm start"
echo "  UI:      cd ui && npm start"
