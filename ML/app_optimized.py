"""
 ML Service — Pure Classical ML Edition
All predictions (category, priority, sentiment) come from trained sklearn models.
Solutions come from FAISS nearest-ticket retrieval. No LLM required.
"""

from contextlib import asynccontextmanager
import logging
import time
import asyncio
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn

from services.ml_service import predict_ml
from services.nlp_service import analysis_sentiment
from services.text_cleaner import clean_text_list
from rag_service_optimized import get_rag_system
from performance_config import cache_config, faiss_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

rag_system = None


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_system
    logger.info("Starting ML Service (classical ML + FAISS)...")
    rag_system = get_rag_system(rebuild=False)
    logger.info("All systems ready.")
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ML Service",
    description="Classical ML ticket classification + FAISS solution retrieval",
    lifespan=lifespan,
)


# ── Performance tracker ───────────────────────────────────────────────────────

class _Tracker:
    def __init__(self):
        self.total_requests  = 0
        self.total_time      = 0.0
        self.avg_response_ms = 0.0

    def track(self, elapsed: float):
        self.total_requests += 1
        self.total_time     += elapsed
        self.avg_response_ms = self.total_time / self.total_requests * 1000

tracker = _Tracker()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TicketRequest(BaseModel):
    title:       str = Field(..., min_length=5,  max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)

class TicketResponse(BaseModel):
    category:           str
    priority:           str
    sentiment:          str
    suggested_solution: str
    response_time_ms:   float

class HealthResponse(BaseModel):
    status:       str
    engine:       str
    metrics:      dict
    cache_config: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        engine="Classical ML (SVM + sentence-transformers) + FAISS",
        metrics={
            "total_requests":  tracker.total_requests,
            "avg_response_ms": round(tracker.avg_response_ms, 1),
            "cache_stats":     rag_system.get_cache_stats() if rag_system else {},
        },
        cache_config={
            "enabled":              cache_config.CACHE_ENABLED,
            "ttl_seconds":          cache_config.CACHE_TTL,
            "max_size":             cache_config.CACHE_MAX_SIZE,
            "similarity_threshold": cache_config.SIMILARITY_THRESHOLD,
        },
    )


@app.post("/ticket", response_model=TicketResponse)
async def process_ticket(ticket: TicketRequest):
    start = time.time()
    try:
        full_text = f"{ticket.title}. {ticket.description}"

        # Clean text + sentiment in parallel (both fast)
        cleaned_list, sentiment = await asyncio.gather(
            asyncio.to_thread(clean_text_list, [full_text]),
            asyncio.to_thread(analysis_sentiment, full_text),
        )
        cleaned = cleaned_list[0]

        # ML classification — both outputs used now (category + priority)
        category, priority = await asyncio.to_thread(predict_ml, cleaned)

        # FAISS retrieval for solution (no LLM — sub-second)
        solution = await asyncio.to_thread(rag_system.rag_response, full_text, category)

        elapsed_ms = (time.time() - start) * 1000
        tracker.track(time.time() - start)

        logger.info(
            f"Ticket processed in {elapsed_ms:.0f}ms | "
            f"cat={category} pri={priority} sent={sentiment}"
        )

        return TicketResponse(
            category=category,
            priority=priority,
            sentiment=sentiment,
            suggested_solution=solution,
            response_time_ms=round(elapsed_ms, 1),
        )

    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        logger.exception(f"Error after {elapsed_ms:.0f}ms")
        raise HTTPException(status_code=500, detail=str(e)[:200])


@app.post("/batch_tickets")
async def batch_process(tickets: list[TicketRequest]):
    """Process multiple tickets concurrently using asyncio.gather."""
    logger.info(f"Batch: {len(tickets)} tickets")
    results = await asyncio.gather(
        *[process_ticket(t) for t in tickets],
        return_exceptions=True,
    )
    processed = [r for r in results if not isinstance(r, Exception)]
    errors    = [str(r) for r in results if isinstance(r, Exception)]
    return {
        "total":     len(tickets),
        "processed": len(processed),
        "errors":    errors,
        "results":   processed,
    }


@app.get("/cache_stats")
async def cache_stats():
    if not rag_system:
        return {"error": "RAG system not initialized"}
    return {
        "cache_config": {
            "enabled":   cache_config.CACHE_ENABLED,
            "ttl":       cache_config.CACHE_TTL,
            "max_size":  cache_config.CACHE_MAX_SIZE,
            "sim_threshold": cache_config.SIMILARITY_THRESHOLD,
        },
        "cache_stats":     rag_system.get_cache_stats(),
        "request_metrics": {
            "total_requests":  tracker.total_requests,
            "avg_response_ms": round(tracker.avg_response_ms, 1),
        },
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "app_optimized:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        workers=1,
        log_level="info",
    )
