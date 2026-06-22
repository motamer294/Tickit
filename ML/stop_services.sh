#!/bin/bash
# Stop ML Services - FastAPI + Ollama
# Usage: bash stop_services.sh

echo "╔════════════════════════════════════════╗"
echo "║   🛑 Stopping TIcketMe ML Services     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Kill FastAPI
echo "1️⃣  Stopping FastAPI (port 8001)..."
if pgrep -f "app_optimized.py" > /dev/null; then
    FASTAPI_PID=$(pgrep -f "app_optimized.py")
    echo "   🔎 Found FastAPI process (PID: $FASTAPI_PID)"
    kill -TERM $FASTAPI_PID 2>/dev/null
    sleep 2

    # Force kill if still running
    if pgrep -f "app_optimized.py" > /dev/null; then
        echo "   ⚠️  Forcing kill..."
        kill -9 $FASTAPI_PID 2>/dev/null
    fi
    echo "   ✅ FastAPI stopped"
else
    echo "   ℹ️  FastAPI not running"
fi

echo ""

# Kill Ollama
echo "2️⃣  Stopping Ollama (port 11434)..."
if pgrep -f "ollama serve" > /dev/null; then
    OLLAMA_PID=$(pgrep -f "ollama serve")
    echo "   🔎 Found Ollama process (PID: $OLLAMA_PID)"
    kill -TERM $OLLAMA_PID 2>/dev/null
    sleep 2

    # Force kill if still running
    if pgrep -f "ollama serve" > /dev/null; then
        echo "   ⚠️  Forcing kill..."
        kill -9 $OLLAMA_PID 2>/dev/null
    fi
    echo "   ✅ Ollama stopped"
else
    echo "   ℹ️  Ollama not running"
fi

echo ""

# Kill any lingering Python processes on port 8001
if lsof -i :8001 &>/dev/null; then
    echo "⚠️  Port 8001 still in use, killing..."
    pkill -9 -f "python.*8001" 2>/dev/null || true
fi

# Kill any lingering connections to port 11434
if lsof -i :11434 &>/dev/null; then
    echo "⚠️  Port 11434 still in use, killing..."
    pkill -9 -f "ollama" 2>/dev/null || true
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ✅ All Services Stopped Successfully ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Verification:"
echo "   • Ollama status:  $(lsof -i :11434 &>/dev/null && echo '❌ Running' || echo '✅ Stopped')"
echo "   • FastAPI status: $(lsof -i :8001 &>/dev/null && echo '❌ Running' || echo '✅ Stopped')"
echo ""
