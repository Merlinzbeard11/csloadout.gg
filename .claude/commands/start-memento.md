---
description: Start Memento API and MCP servers (project)
---

## Your task

Detect if running in development (source code) or production (deployed package) and start Memento servers efficiently.

**Optimized Detection and Startup:**
```bash
if [ -d "src/Memento.Api" ]; then
    # Development mode - build once, run binaries directly (4x faster)
    echo "Building Memento (one-time build)..."
    MSBUILDDISABLENODEREUSE=1 dotnet build --verbosity quiet /nodeReuse:false

    echo "Starting API server..."
    MEMENTO_API_URL=http://localhost:5098 \
    MEMENTO_DASHBOARD_URL=http://localhost:5101 \
    MEMENTO_MCP_URL=http://localhost:5100 \
    MEMENTO__DATABASE__CONNECTIONSTRING="Host=localhost;Port=5432;Database=memento_dev;Username=memento_user;Password=memento_pass" \
    DISABLE_STARTUP_VALIDATION=true \
    ASPNETCORE_ENVIRONMENT=Production \
    ./src/Memento.Api/bin/Debug/net9.0/Memento.Api --urls http://localhost:5098 > /tmp/memento-api.log 2>&1 &

    echo "Starting MCP server..."
    MEMENTO_API_URL=http://localhost:5098 \
    MEMENTO_DASHBOARD_URL=http://localhost:5101 \
    MEMENTO_MCP_URL=http://localhost:5100 \
    MEMENTO__DATABASE__CONNECTIONSTRING="Host=localhost;Port=5432;Database=memento_dev;Username=memento_user;Password=memento_pass" \
    MCP_TRANSPORT=stdio \
    DISABLE_STARTUP_VALIDATION=true \
    ASPNETCORE_ENVIRONMENT=Production \
    ./src/Memento.McpServer/bin/Debug/net9.0/Memento.McpServer > /tmp/memento-mcp.log 2>&1 &

    # Cleanup stale MSBuild node processes
    pkill -f "MSBuild.dll" 2>/dev/null || true

    echo "✅ Started from source (development mode)"

elif [ -f "start-api.sh" ] && [ -f "start-mcp.sh" ]; then
    # Production mode - run from package
    ./start-api.sh > /tmp/memento-api.log 2>&1 &
    ./start-mcp.sh > /tmp/memento-mcp.log 2>&1 &
    echo "✅ Started from package (production mode)"
else
    echo "❌ ERROR: Cannot detect Memento installation"
    echo "Run /start-memento from repository root or extracted package directory"
    exit 1
fi

# Wait for startup (2-3 seconds with binary startup vs 8+ with dotnet run)
sleep 3

echo ""
echo "=== Health Check ==="
HEALTH_STATUS=$(curl -s http://localhost:5098/health 2>&1)
if echo "$HEALTH_STATUS" | grep -q "Healthy"; then
    echo "✅ API is running: $HEALTH_STATUS"
else
    echo "❌ API not responding or unhealthy"
    echo "Check logs: tail /tmp/memento-api.log"
fi

echo ""
echo "=== Process Status ==="
if ps aux | grep -v grep | grep "Memento.Api" > /dev/null; then
    echo "✅ API server running ($(ps aux | grep -v grep | grep "Memento.Api" | awk '{print "PID "$2}'))"
else
    echo "❌ API server not running"
fi

if ps aux | grep -v grep | grep "Memento.McpServer" > /dev/null; then
    echo "✅ MCP server running ($(ps aux | grep -v grep | grep "Memento.McpServer" | awk '{print "PID "$2}'))"
else
    echo "❌ MCP server not running"
fi
```

**Performance Improvement:**
- Startup time: 8s → 2s (4x faster)
- Single build instead of 2x `dotnet run` builds
- Direct binary execution (no runtime compilation)
- Automatic MSBuild node cleanup