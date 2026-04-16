"""
RAG Service V2 (Enterprise IT Help Desk Edition - Smart Ollama)
Features:
- Sentence embeddings for semantic search (all-MiniLM-L6-v2)
- FAISS vector store for fast similarity search
- Local Fine-Tuned Llama via Ollama (nexus-ai model)
- Smart AI Priority & Solution Generation (No blind copying)
"""

import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import os
import requests
import logging
import re

logger = logging.getLogger(__name__)

class RAGServiceV2:
    def __init__(self, dataset_file='dataset/Synthetic_ITSM_Data_Ready.csv', rebuild_index=False):
        """
        Initialize RAG system with FAISS embeddings. 
        Ollama is used externally via REST API.
        """
        self.dataset_file = dataset_file
        self.index_file = 'models/faiss_index.pkl'
        self.embeddings_file = 'models/faq_embeddings.pkl'
        self.faq_data_file = 'models/faq_data.pkl'       

        # 1. Initialize embedding model (FAISS)
        print("Loading embedding model (all-MiniLM-L6-v2)...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Load or build index
        if rebuild_index or not self._index_exists():
            print("Building new FAISS index from ITSM data...")
            self._build_index()
        else:
            print("Loading existing FAISS index...")
            self._load_index()
            
        print("RAG system FAISS Index ready. Connected to Local Ollama.")

    def _index_exists(self):
        return (os.path.exists(self.index_file) and 
                os.path.exists(self.embeddings_file) and
                os.path.exists(self.faq_data_file))
    
    def _build_index(self):
        if not os.path.exists(self.dataset_file):
            raise FileNotFoundError(f"Dataset not found at {self.dataset_file}.")

        df = pd.read_csv(self.dataset_file)
        df['Description'] = df['Description'].fillna('')
        df['Resolution'] = df['Resolution'].fillna('')
        self.faqs = df.to_dict('records')
        
        texts = [f"{ticket['Description']} {ticket['Resolution']}" for ticket in self.faqs]
        print(f"Generating embeddings for {len(texts)} IT tickets...")
        
        self.embeddings = self.embedding_model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
        dimension = self.embeddings.shape[1]
        
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(self.embeddings)
        
        os.makedirs('models', exist_ok=True)
        with open(self.index_file, 'wb') as f: pickle.dump(self.index, f)
        with open(self.embeddings_file, 'wb') as f: pickle.dump(self.embeddings, f)
        with open(self.faq_data_file, 'wb') as f: pickle.dump(self.faqs, f)
        print("Index built and saved successfully.")
    
    def _load_index(self):
        with open(self.index_file, 'rb') as f: self.index = pickle.load(f)
        with open(self.embeddings_file, 'rb') as f: self.embeddings = pickle.load(f)
        with open(self.faq_data_file, 'rb') as f: self.faqs = pickle.load(f)
    
    def search_similar_faqs(self, query, top_k=3):
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_embedding, top_k)
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(self.faqs):
                faq = self.faqs[idx]
                similarity = 1 / (1 + distance)
                results.append((faq, similarity))
        return results
    
    def generate_priority_and_solution_ollama(self, query, category, relevant_faqs):
        """Generate Smart Priority & Solution using Ollama Local API (nexus-ai)"""
        
        faiss_context = ""
        for i, (ticket, score) in enumerate(relevant_faqs, 1):
            faiss_context += f"{i}. Past Issue: {ticket.get('Description', 'N/A')}\n"
            faiss_context += f"   Past Resolution: {ticket.get('Resolution', 'N/A')}\n\n"
        
        prompt_text = f"""You are an Expert IT Support Agent for an enterprise.
Analyze the following ticket and provide the Priority (LOW, MEDIUM, HIGH, CRITICAL) and a logical Suggested Solution.

Current Ticket: {query}
Ticket Category: {category}

Past Historical Solution (FOR REFERENCE ONLY - DO NOT copy this if the current issue is a simple request like a password reset):
{faiss_context}

Provide your response exactly in this format:
Priority: [Your Priority]
Solution: [Your Solution]
"""
        
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "nexus-ai",
            "prompt": prompt_text,
            "stream": False,
            "options": {
                "temperature": 0.1,  
                "num_predict": 80,
                "num_thread": 4   
            }
        }
        
        try:
            response = requests.post(url, json=payload, timeout=90)
            if response.status_code == 200:
                ai_text = response.json().get("response", "").strip()
                
                # Extract priority and solution
                priority = "LOW"
                solution = ai_text
                
                pri_match = re.search(r"Priority:\s*(.*?)(?:\n|$)", ai_text, re.IGNORECASE)
                sol_match = re.search(r"Solution:\s*(.*)", ai_text, re.IGNORECASE | re.DOTALL)
                
                if pri_match:
                    priority = pri_match.group(1).strip().upper()
                if sol_match:
                    solution = sol_match.group(1).strip()
                    
                return priority, solution
            else:
                logger.error(f"Ollama Error: {response.text}")
                return "LOW", "Could not generate solution at this time."
        except Exception as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            return "LOW", "AI Engine is currently offline."
    
    def rag_response(self, query, category="General IT", use_ai=True, top_k=3):
        relevant_faqs = self.search_similar_faqs(query, top_k=top_k)
        
        if not relevant_faqs:
            return "LOW", "No similar historical tickets found. A human IT agent will review this shortly."
        
        if use_ai:
            return self.generate_priority_and_solution_ollama(query, category, relevant_faqs)
        else:
            top_ticket = relevant_faqs[0][0]
            return "LOW", f"Historical Fix for similar {category} issue: {top_ticket.get('Resolution', 'N/A')}"
    
    def get_relevant_context(self, query, top_k=3):
        relevant_faqs = self.search_similar_faqs(query, top_k=top_k)
        results = []
        for ticket, score in relevant_faqs:
            results.append({
                'description': ticket.get('Description', 'N/A'),
                'resolution': ticket.get('Resolution', 'N/A'),
                'topic': ticket.get('Topic', 'N/A'),
                'similarity_score': round(score, 3)
            })
        return results

_rag_system = None

def get_rag_system(rebuild=False):
    global _rag_system
    if _rag_system is None or rebuild:
        _rag_system = RAGServiceV2(rebuild_index=rebuild)
    return _rag_system

if __name__ == "__main__":
    # Test script updated to unpack both priority and solution
    print("Initializing Enterprise IT RAG system (Smart Ollama Edition)...")
    rag = RAGServiceV2(rebuild_index=False) 
    
    test_queries = [
        ("I forgot my outlook password and cannot access my emails since morning.", "Software Issue"),
        ("My laptop is randomly showing a blue screen and restarting", "Hardware Failure"),
    ]
    
    print("\n" + "=" * 70)
    print("Testing Smart Priority & Solution Generation")
    print("=" * 70)
    
    for query, category in test_queries:
        print(f"\nUser Query: {query}")
        print(f"Predicted ML Category: {category}")
        
        smart_priority, smart_solution = rag.rag_response(query, category, use_ai=True)
        print(f"AI Priority: {smart_priority}")
        print(f"AI Solution:\n{smart_solution}")
        print("=" * 70)