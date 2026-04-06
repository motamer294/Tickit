"""
RAG Service V2 with Embeddings and Ollama
Features:
- Sentence embeddings for semantic search
- FAISS vector store for fast similarity search
- Ollama for LLM-powered response generation
- Context-aware answers
"""

import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import os
import ollama

class RAGServiceV2:
    def __init__(self, faq_file='dataset/faq.csv', rebuild_index=False):
        """
        Initialize RAG system with embeddings and Ollama
        
        Args:
            faq_file: Path to FAQ CSV file
            rebuild_index: Force rebuild of embeddings and FAISS index
        """
        self.faq_file = faq_file
        self.index_file = 'models/faiss_index.pkl'
        self.embeddings_file = 'models/faq_embeddings.pkl'
        self.faq_data_file = 'models/faq_data.pkl'       

        # Initialize embedding model
        print("Loading embedding model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        # This model: 384 dimensions, fast, good for semantic search
        
        # Load or build index
        if rebuild_index or not self._index_exists():
            print("Building new FAISS index...")
            self._build_index()
        else:
            print("Loading existing FAISS index...")
            self._load_index()
        
        print(f"✅ RAG system ready with {len(self.faqs)} FAQs")
    
    def _index_exists(self):
        """Check if pre-built index exists"""
        return (os.path.exists(self.index_file) and 
                os.path.exists(self.embeddings_file) and
                os.path.exists(self.faq_data_file))
    
    def _build_index(self):
        """Build FAISS index from FAQ data"""
        # Load FAQs
        df = pd.read_csv(self.faq_file)
        self.faqs = df.to_dict('records')
        
        # Create text corpus for embedding
        # Combine question and answer for better semantic matching
        texts = [f"{faq['question']} {faq['answer']}" for faq in self.faqs]
        
        print(f"Generating embeddings for {len(texts)} FAQs...")
        # Generate embeddings
        self.embeddings = self.embedding_model.encode(
            texts, 
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        # Build FAISS index
        dimension = self.embeddings.shape[1]  # 384 for all-MiniLM-L6-v2
        print(f"Building FAISS index (dimension: {dimension})...")
        
        # Use IndexFlatL2 for exact search (good for small datasets)
        # For larger datasets, consider IndexIVFFlat or IndexHNSW
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
        
        print("✅ Index built and saved")
    
    def _load_index(self):
        """Load pre-built FAISS index"""
        with open(self.index_file, 'rb') as f:
            self.index = pickle.load(f)
        
        with open(self.embeddings_file, 'rb') as f:
            self.embeddings = pickle.load(f)
        
        with open(self.faq_data_file, 'rb') as f:
            self.faqs = pickle.load(f)
    
    def search_similar_faqs(self, query, top_k=3):
        """
        Search for similar FAQs using semantic similarity
        
        Args:
            query: User query text
            top_k: Number of similar FAQs to retrieve
        
        Returns:
            List of (faq, score) tuples
        """
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
        
        # Search in FAISS index
        distances, indices = self.index.search(query_embedding, top_k)
        
        # Get matching FAQs with scores
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(self.faqs):  # Valid index
                faq = self.faqs[idx]
                # Convert L2 distance to similarity score (lower is better)
                # Normalize to 0-1 range where 1 is most similar
                similarity = 1 / (1 + distance)
                results.append((faq, similarity))
        
        return results
    
    def generate_response_ollama(self, query, category, relevant_faqs):
        """
        Generate response using Ollama with retrieved context
        
        Args:
            query: User query
            category: Predicted category
            relevant_faqs: List of relevant FAQ dictionaries
        
        Returns:
            Generated response string
        """
        # Build context from retrieved FAQs
        context = "Here are some relevant FAQs:\n\n"
        for i, (faq, score) in enumerate(relevant_faqs, 1):
            context += f"{i}. Q: {faq['question']}\n"
            context += f"   A: {faq['answer']}\n\n"
        
        # Create prompt for Ollama
        prompt = f"""You are a helpful customer support assistant. Based on the following FAQs and the user's question, provide a helpful, concise response.

{context}

Category: {category}
User Question: {query}

Provide a direct, helpful answer based on the FAQs above. If the FAQs don't fully answer the question, provide general guidance. Keep the response concise (2-3 sentences).

Response:"""
        
        try:
            # Call Ollama
            response = ollama.generate(
                model='llama3.2',  # or 'llama2', 'mistral', etc.
                prompt=prompt,
                options={
                    'temperature': 0.7,  # Creativity level
                    'top_p': 0.9,
                    'max_tokens': 200,  # Keep responses concise
                }
            )
            
            return response['response'].strip()
        
        except Exception as e:
            print(f"Ollama error: {e}")
            # Fallback to first FAQ answer if Ollama fails
            if relevant_faqs:
                return f"Based on your issue: {relevant_faqs[0][0]['answer']}"
            return "I apologize, but I'm having trouble generating a response. Please contact support directly."
    
    def rag_response(self, query, category, use_ollama=True, top_k=3):
        """
        Main RAG pipeline: Retrieve + Generate
        
        Args:
            query: User query text
            category: Predicted category from ML model
            use_ollama: Whether to use Ollama for generation
            top_k: Number of FAQs to retrieve
        
        Returns:
            Generated response string
        """
        # Step 1: Retrieve relevant FAQs
        relevant_faqs = self.search_similar_faqs(query, top_k=top_k)
        
        if not relevant_faqs:
            return "I couldn't find relevant information. Please contact support for assistance."
        
        # Step 2: Generate response
        if use_ollama:
            # Use Ollama to generate contextual response
            return self.generate_response_ollama(query, category, relevant_faqs)
        else:
            # Simple fallback: return top FAQ answer
            top_faq = relevant_faqs[0][0]
            return f"Based on your issue ({category}): {top_faq['answer']}"
    
    def get_relevant_context(self, query, top_k=3):
        """
        Get relevant FAQs without generation (for debugging/inspection)
        
        Returns:
            List of (question, answer, category, score) tuples
        """
        relevant_faqs = self.search_similar_faqs(query, top_k=top_k)
        
        results = []
        for faq, score in relevant_faqs:
            results.append({
                'question': faq['question'],
                'answer': faq['answer'],
                'category': faq['category'],
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
    """
    Backward-compatible function for existing code
    
    Args:
        text: Query text
        category: Predicted category
    
    Returns:
        Generated response
    """
    rag_system = get_rag_system()
    return rag_system.rag_response(text, category, use_ollama=True, top_k=3)


if __name__ == "__main__":
    # Test the RAG system
    print("Initializing RAG system...")
    rag = RAGServiceV2(rebuild_index=True)
    
    # Test queries
    test_queries = [
        ("I haven't received my refund yet", "billing"),
        ("The app keeps crashing on my phone", "technical"),
        ("I can't remember my password", "account"),
        ("Where is my package?", "delivery"),
    ]
    
    print("\n" + "=" * 70)
    print("Testing RAG System")
    print("=" * 70)
    
    for query, category in test_queries:
        print(f"\nQuery: {query}")
        print(f"Category: {category}")
        print("-" * 70)
        
        # Get relevant context
        context = rag.get_relevant_context(query, top_k=2)
        print("Relevant FAQs:")
        for i, ctx in enumerate(context, 1):
            print(f"  {i}. {ctx['question']} (score: {ctx['similarity_score']})")
        
        # Generate response
        response = rag.rag_response(query, category, use_ollama=True)
        print(f"\nGenerated Response:\n{response}")
        print("=" * 70)