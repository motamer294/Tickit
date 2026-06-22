# 🚀 TIcketMe ML Service (neural-chat)

## 🚀 Quick Start

```bash
# Start both services
bash start_services.sh

# Stop both services
bash stop_services.sh
```

---

## 📂 Directory Layout

### Core Application

- `app_optimized.py` → FastAPI server (port 8001)
- `rag_service_optimized.py` → RAG with caching
- `performance_config.py` → Service configuration
- `requirements.txt` → Python dependencies

### Service Management

- `start_services.sh` → Start Ollama + FastAPI
- `stop_services.sh` → Stop all services

### Documentation

- `QUICK_START.md` → 2-minute quick reference
- `SERVICE_MANAGEMENT.md` → Complete guide
- `README_SERVICES.md` → Documentation index
- `SETUP_COMPLETE.txt` → Setup summary

### Python Environment

- `venv/` → Virtual environment (ready to use)

### ML Components

- `services/` → ML services (ml_service, nlp_service, text_cleaner)
- `scripts/` → Utility scripts
- `dataset/` → Training data

---

## 📊 System Status

✅ **FastAPI**: Ready on port 8001
✅ **Ollama**: Ready on port 11434
✅ **Cache**: LRU enabled (3600s TTL)
✅ **Performance**: CPU-only (24.5s avg)

---

## 🧪 Test It

```bash
# Health check
curl http://localhost:8001/health

# Process ticket
curl -X POST http://localhost:8001/ticket \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Testing"}'

# View cache stats
curl http://localhost:8001/cache_stats
```

---

## 🎯 What to Do Next

1. **Read** `QUICK_START.md` (2 minutes)
2. **Run** `bash start_services.sh`
3. **Test** with the sample curl commands above
4. **Monitor** performance with cache_stats

---

## 🗑️ What Was Removed

- ❌ Old disabled app versions
- ❌ Old/redundant setup scripts
- ❌ Planning documents (blueprint.md)
- ❌ GPU setup guides (archived in docs_archive/)

**Keeping only:** Essential app files, clean docs, and service scripts

---

## 📞 Need Help?

- `QUICK_START.md` → Fast reference
- `SERVICE_MANAGEMENT.md` → Detailed guide
- `README_SERVICES.md` → Documentation index

---

**Status: Clean & Ready** ✅
