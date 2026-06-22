"""
Performance configuration for the ML service.
OllamaConfig removed — the service now uses pure classical ML + FAISS.
"""

import os
from dataclasses import dataclass


@dataclass
class CacheConfig:
    CACHE_ENABLED:        bool  = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
    CACHE_TTL:            int   = int(os.getenv('CACHE_TTL', '3600'))       # seconds
    CACHE_MAX_SIZE:       int   = int(os.getenv('CACHE_MAX_SIZE', '1000'))
    SIMILARITY_THRESHOLD: float = float(os.getenv('SIMILARITY_THRESHOLD', '0.85'))


@dataclass
class FAISSConfig:
    TOP_K:        int  = int(os.getenv('FAISS_TOP_K', '3'))
    BATCH_ENCODE: bool = os.getenv('BATCH_ENCODE', 'true').lower() == 'true'


cache_config = CacheConfig()
faiss_config = FAISSConfig()
