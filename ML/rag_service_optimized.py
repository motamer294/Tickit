"""
RAG Service — FAISS-only retrieval (no LLM).
Priority and category come from the trained ML classifiers.
This service only provides: suggested solution via nearest-ticket lookup.

Cache improvements over previous version:
  - True LRU eviction (OrderedDict + move_to_end)
  - TTL enforcement on every read
  - Semantic similarity cache (catches paraphrased queries)
  - High-confidence shortcut (similarity > 0.90 skips merge step)
"""

import os
import pickle
import hashlib
import logging
import time
from collections import OrderedDict
from typing import Dict, List, Tuple

import faiss
import numpy as np

from performance_config import cache_config, faiss_config
from services.embedder import get_embedder

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self, dataset_file='dataset/Synthetic_ITSM_Data_Ready.csv', rebuild_index=False):
        self.index_file    = 'models/faiss_index.pkl'
        self.faq_data_file = 'models/faq_data.pkl'

        # LRU cache: key → (solution, timestamp)
        self.response_cache: OrderedDict = OrderedDict()
        self.cache_hits   = 0
        self.cache_misses = 0

        # Semantic cache: parallel lists of (embedding, cache_key)
        self._sem_embeddings: List[np.ndarray] = []
        self._sem_keys:       List[str]         = []

        self.embedding_model = get_embedder()

        if rebuild_index or not self._index_exists():
            logger.warning("FAISS index not found — please run scripts/train_models.py first.")
        else:
            self._load_index()

        logger.info("RAG service ready (FAISS-only, no LLM).")

    # ── Index ─────────────────────────────────────────────────────────────────

    def _index_exists(self) -> bool:
        return os.path.exists(self.index_file) and os.path.exists(self.faq_data_file)

    def _load_index(self):
        with open(self.index_file, 'rb') as f:
            self.index = pickle.load(f)
        with open(self.faq_data_file, 'rb') as f:
            self.faqs = pickle.load(f)
        logger.info(f"FAISS index loaded: {len(self.faqs)} tickets.")

    # ── Cache helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def _cache_key(query: str, category: str) -> str:
        return hashlib.md5(f"{query}:{category}".encode()).hexdigest()

    def _check_cache(self, query: str, category: str) -> Tuple[bool, str]:
        if not cache_config.CACHE_ENABLED:
            return False, ""

        key = self._cache_key(query, category)

        # 1. Exact match
        if key in self.response_cache:
            solution, ts = self.response_cache[key]
            if time.time() - ts <= cache_config.CACHE_TTL:
                self.response_cache.move_to_end(key)   # refresh LRU position
                self.cache_hits += 1
                logger.debug("Exact cache hit.")
                return True, solution
            else:
                del self.response_cache[key]           # expired — evict

        # 2. Semantic similarity
        if self._sem_embeddings:
            q_emb   = self.embedding_model.encode([query], convert_to_numpy=True)
            matrix  = np.array(self._sem_embeddings)
            dots    = matrix @ q_emb.T
            norms   = np.linalg.norm(matrix, axis=1, keepdims=True) * np.linalg.norm(q_emb)
            cos_sim = (dots / (norms + 1e-8)).flatten()
            best    = int(np.argmax(cos_sim))
            if cos_sim[best] >= cache_config.SIMILARITY_THRESHOLD:
                best_key = self._sem_keys[best]
                if best_key in self.response_cache:
                    solution, ts = self.response_cache[best_key]
                    if time.time() - ts <= cache_config.CACHE_TTL:
                        self.response_cache.move_to_end(best_key)
                        self.cache_hits += 1
                        logger.info(f"Semantic cache hit (cos_sim={cos_sim[best]:.2f}).")
                        return True, solution

        self.cache_misses += 1
        return False, ""

    def _update_cache(self, query: str, category: str, solution: str):
        if not cache_config.CACHE_ENABLED:
            return

        key = self._cache_key(query, category)

        # LRU eviction when full
        if len(self.response_cache) >= cache_config.CACHE_MAX_SIZE:
            evicted_key, _ = self.response_cache.popitem(last=False)
            if evicted_key in self._sem_keys:
                idx = self._sem_keys.index(evicted_key)
                self._sem_keys.pop(idx)
                self._sem_embeddings.pop(idx)

        self.response_cache[key] = (solution, time.time())

        # Store embedding for future semantic lookups
        q_emb = self.embedding_model.encode([query], convert_to_numpy=True)[0]
        self._sem_embeddings.append(q_emb)
        self._sem_keys.append(key)

    # ── FAISS search ──────────────────────────────────────────────────────────

    def search_similar_faqs(self, query: str, top_k: int = None) -> List[Tuple[Dict, float]]:
        if top_k is None:
            top_k = faiss_config.TOP_K

        t0        = time.time()
        q_emb     = self.embedding_model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(q_emb.astype('float32'), top_k)
        elapsed_ms = (time.time() - t0) * 1000

        results = []
        for idx, dist in zip(indices[0], distances[0]):
            if 0 <= idx < len(self.faqs):
                similarity = 1.0 / (1.0 + dist)
                results.append((self.faqs[idx], similarity))

        logger.info(f"FAISS search: {len(results)} results in {elapsed_ms:.1f}ms")
        return results

    # ── Public API ────────────────────────────────────────────────────────────

    def rag_response(self, query: str, category: str = "General IT") -> str:
        """
        Returns a suggested solution string.
        Priority and category come from the ML classifiers — not this service.
        """
        hit, cached = self._check_cache(query, category)
        if hit:
            return cached

        results = self.search_similar_faqs(query, top_k=faiss_config.TOP_K)
        if not results:
            return "No similar cases found in the knowledge base."

        top_faq, top_sim = results[0]

        if top_sim >= 0.90:
            # Very close match — return its resolution directly
            solution = top_faq.get('Resolution', '').strip()[:400]
            logger.info(f"High-confidence match (sim={top_sim:.2f}): returning resolution directly.")
        else:
            # Merge top-2 resolutions for a richer suggestion
            parts = []
            for faq, _ in results[:2]:
                res = faq.get('Resolution', '').strip()
                if res:
                    parts.append(res[:250])
            solution = " | ".join(parts) if parts else "No resolution found."

        self._update_cache(query, category, solution)
        return solution

    def get_cache_stats(self) -> Dict:
        total    = self.cache_hits + self.cache_misses
        hit_rate = (self.cache_hits / total * 100) if total > 0 else 0
        return {
            "cache_hits":   self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_size":   len(self.response_cache),
            "hit_rate":     f"{hit_rate:.1f}%",
            "semantic_entries": len(self._sem_keys),
        }


# Singleton
_rag_instance: RAGService = None


def get_rag_system(rebuild=False) -> RAGService:
    global _rag_instance
    if _rag_instance is None or rebuild:
        _rag_instance = RAGService(rebuild_index=rebuild)
    return _rag_instance
