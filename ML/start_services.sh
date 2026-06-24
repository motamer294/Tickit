#!/bin/bash
# Start ML Services - FastAPI + Ollama
# Usage: bash start_services.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"

echo ""
echo "     Starting TICKIT ML Services      "
echo ""
echo ""

# Check if venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo " Virtual environment not found at $VENV_DIR"
    echo "Please run: python3 -m venv $VENV_DIR && source $VENV_DIR/bin/activate && pip install -r requirements.txt"
    exit 1
fi

cd "$PROJECT_DIR"

# 1. Start Ollama
echo "1⃣  Starting Ollama (LLM Engine on port 11434)..."
if lsof -i :11434 &>/dev/null; then
    echo "     Port 11434 already in use (Ollama might be running)"
else
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    echo "    Ollama started (PID: $OLLAMA_PID)"
    sleep 3
fi

# Verify Ollama is responding
for i in {1..10}; do
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        echo "    Ollama responding on localhost:11434"
        MODEL_COUNT=$(curl -s http://localhost:11434/api/tags 2>/dev/null | grep -o '"name"' | wc -l)
        echo "    Models loaded: $MODEL_COUNT"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "    Ollama not responding after 10 seconds"
        echo "    Check logs: tail -f /tmp/ollama.log"
        exit 1
    fi
    echo "    Waiting for Ollama... attempt $i/10"
    sleep 1
done

echo ""

# 2. Start FastAPI
echo "2⃣  Starting FastAPI (ML API on port 8001)..."
if lsof -i :8001 &>/dev/null; then
    echo "     Port 8001 already in use"
    echo "    Killing existing process..."
    pkill -f "app_optimized.py" || true
    sleep 1
fi

# Activate venv and start FastAPI
source "$VENV_DIR/bin/activate"
nohup python app_optimized.py > /tmp/fastapi.log 2>&1 &
FASTAPI_PID=$!
echo "    FastAPI started (PID: $FASTAPI_PID)"
sleep 4

# Verify FastAPI is responding
for i in {1..10}; do
    if curl -s http://localhost:8001/health &>/dev/null; then
        echo "    FastAPI responding on localhost:8001"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "    FastAPI not responding after 10 seconds"
        echo "    Check logs: tail -f /tmp/fastapi.log"
        exit 1
    fi
    echo "    Waiting for FastAPI... attempt $i/10"
    sleep 1
done

echo ""
echo ""
echo "    All Services Started Successfully "
echo ""
echo ""
echo " Service Status:"
echo "   • Ollama LLM:  http://localhost:11434"
echo "   • FastAPI API: http://localhost:8001"
echo ""
echo " Useful Commands:"
echo "   • Health Check:    curl http://localhost:8001/health"
echo "   • Cache Stats:     curl http://localhost:8001/cache_stats"
echo "   • Stop Services:   bash stop_services.sh"
echo "   • View Logs:       tail -f /tmp/ollama.log /tmp/fastapi.log"
echo ""
echo " Next: Test with:"
echo "   curl -X POST http://localhost:8001/ticket \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"title\":\"Test\",\"description\":\"Testing\"}'"
echo ""
