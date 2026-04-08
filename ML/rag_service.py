"""
RAG Service V2 (Enterprise IT Help Desk Edition)
Features:
- Sentence embeddings for semantic search (all-MiniLM-L6-v2)
- FAISS vector store for fast similarity search
- Local Ollama (llama3.2:1b) for secure, offline IT response generation
- Context-aware answers based on ITSM Synthetic Data
"""

import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import os
import ollama

class RAGServiceV2:
    def __init__(self, dataset_file='dataset/Synthetic_ITSM_Data_Ready.csv', rebuild_index=False):
        """
        Initialize RAG system with embeddings and Local Ollama
        
        Args:
            dataset_file: Path to the new ITSM CSV file
            rebuild_index: Force rebuild of embeddings and FAISS index
        """
        self.dataset_file = dataset_file
        self.index_file = 'models/faiss_index.pkl'
        self.embeddings_file = 'models/faq_embeddings.pkl'
        self.faq_data_file = 'models/faq_data.pkl'       

        # Initialize embedding model (Lightweight and fast for CPU)
        print("Loading embedding model (all-MiniLM-L6-v2)...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Load or build index
        if rebuild_index or not self._index_exists():
            print("Building new FAISS index from ITSM data...")
            self._build_index()
        else:
            print("Loading existing FAISS index...")
            self._load_index()
        
        print(f"✅ RAG system ready with {len(self.faqs)} IT resolutions.")
    
    def _index_exists(self):
        """Check if pre-built index exists"""
        return (os.path.exists(self.index_file) and 
                os.path.exists(self.embeddings_file) and
                os.path.exists(self.faq_data_file))
    
    def _build_index(self):
        """Build FAISS index from the Synthetic ITSM data"""
        if not os.path.exists(self.dataset_file):
            raise FileNotFoundError(f"Dataset not found at {self.dataset_file}. Please ensure the synthetic data is generated.")

        # Load Data
        df = pd.read_csv(self.dataset_file)
        
        # Ensure we don't have NaN values in text columns
        df['Description'] = df['Description'].fillna('')
        df['Resolution'] = df['Resolution'].fillna('')
        
        self.faqs = df.to_dict('records')
        
        # Create text corpus for embedding
        # We combine the user's complaint (Description) and the fix (Resolution)
        texts = [f"{ticket['Description']} {ticket['Resolution']}" for ticket in self.faqs]
        
        print(f"Generating embeddings for {len(texts)} IT tickets... (This might take a moment)")
        # Generate embeddings
        self.embeddings = self.embedding_model.encode(
            texts, 
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        # Build FAISS index
        dimension = self.embeddings.shape[1]  # 384 dimensions
        print(f"Building FAISS index (dimension: {dimension})...")
        
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(self.embeddings)
        
        # Save everything
        os.makedirs('models', exist_ok=True)
        
        with open(self.index_file, 'wb') as f:
            pickle.dump(self.index, f)
        
        with open(self.embeddings_file, 'wb') as f:
            pickle.dump(self.embeddings, f)
        
        with open(self.faq_data_file, 'wb') as f:
            pickle.dump(self.faqs, f)
        
        print("✅ Index built and saved successfully.")
    
    def _load_index(self):
        """Load pre-built FAISS index"""
        with open(self.index_file, 'rb') as f:
            self.index = pickle.load(f)
        
        with open(self.embeddings_file, 'rb') as f:
            self.embeddings = pickle.load(f)
        
        with open(self.faq_data_file, 'rb') as f:
            self.faqs = pickle.load(f)
    
    def search_similar_faqs(self, query, top_k=3):
        """Search for similar IT tickets using semantic similarity"""
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_embedding, top_k)
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(self.faqs):
                faq = self.faqs[idx]
                similarity = 1 / (1 + distance)
                results.append((faq, similarity))
        
        return results
    
    def generate_response_ollama(self, query, category, relevant_faqs):
        """Generate response using Local Llama 3.2 (1B) with retrieved context"""
        
        # Build context from retrieved IT Resolutions
        context = "Here are similar past IT incidents and how they were resolved:\n\n"
        for i, (ticket, score) in enumerate(relevant_faqs, 1):
            context += f"{i}. User Issue: {ticket.get('Description', 'N/A')}\n"
            context += f"   IT Resolution: {ticket.get('Resolution', 'N/A')}\n\n"
        
        # Enterprise IT Prompt Engineering
        prompt = f"""You are an expert L2 IT Help Desk Agent in a large enterprise. 
Based on the historical IT ticket resolutions provided below, help the user with their current issue.

{context}

Issue Category: {category}
Current User Issue: {query}

Provide a direct, professional, and technical (yet understandable) solution based ONLY on the resolutions above. Keep the response concise (3-4 sentences max).

Response:"""
        
        try:
            # Call Local Ollama API
            response = ollama.generate(
                model='llama3.2:1b',  # Pointing to your specific lightweight model
                prompt=prompt,
                options={
                    'temperature': 0.3,  # Low temperature for factual, technical accuracy
                    'top_p': 0.9,
                    'num_predict': 150,  # Ensure it doesn't ramble (equivalent to max_tokens)
                }
            )
            
            return response['response'].strip()
        
        except Exception as e:
            print(f"Ollama connection error: {e}")
            if relevant_faqs:
                return f"System note: Reverting to exact historical fix. Solution: {relevant_faqs[0][0].get('Resolution', 'N/A')}"
            return "Local AI Engine is currently offline. Please contact the IT admin."
    
    def rag_response(self, query, category="General IT", use_ollama=True, top_k=3):
        """Main RAG pipeline: Retrieve + Generate"""
        relevant_faqs = self.search_similar_faqs(query, top_k=top_k)
        
        if not relevant_faqs:
            return "No similar historical tickets found. A human IT agent will review this shortly."
        
        if use_ollama:
            return self.generate_response_ollama(query, category, relevant_faqs)
        else:
            top_ticket = relevant_faqs[0][0]
            return f"Historical Fix for similar {category} issue: {top_ticket.get('Resolution', 'N/A')}"
    
    def get_relevant_context(self, query, top_k=3):
        """Get relevant tickets without generation (for debugging/inspection)"""
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

# Initialize global RAG system (singleton pattern)
_rag_system = None

def get_rag_system(rebuild=False):
    """Get or create RAG system instance"""
    global _rag_system
    if _rag_system is None or rebuild:
        _rag_system = RAGServiceV2(rebuild_index=rebuild)
    return _rag_system

def rag_response(text, category):
    """Backward-compatible function for existing code"""
    rag_system = get_rag_system()
    return rag_system.rag_response(text, category, use_ollama=True, top_k=3)

if __name__ == "__main__":
    # Test the Enterprise IT RAG system
    print("Initializing Enterprise IT RAG system...")
    # Set rebuild_index=True for the first run to process the new CSV
    rag = RAGServiceV2(rebuild_index=True) 
    
    # IT-Specific Test queries
    test_queries = [
        ("I can't connect to the corporate VPN from home", "Network Issue"),
        ("My laptop is randomly showing a blue screen and restarting", "Hardware Failure"),
        ("I need access to the shared marketing drive on SharePoint", "Access Request"),
        ("I forgot my Active Directory password", "Authentication"),
    ]
    
    print("\n" + "=" * 70)
    print("Testing IT RAG System")
    print("=" * 70)
    
    for query, category in test_queries:
        print(f"\nUser Query: {query}")
        print(f"Detected Category: {category}")
        print("-" * 70)
        
        # Get relevant context
        context = rag.get_relevant_context(query, top_k=2)
        print("Retrieved Historical Fixes (FAISS):")
        for i, ctx in enumerate(context, 1):
            print(f"  {i}. [Score: {ctx['similarity_score']}] {ctx['resolution']}")
        
        # Generate response
        response = rag.rag_response(query, category, use_ollama=True)
        print(f"\nGenerated IT Response (Llama 3.2:1b):\n{response}")
        print("=" * 70)