from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

# Importing classical ML services (fast for classification)
from services.ml_service import predict_ml
from services.nlp_service import analysis_sentiment
from services.text_cleaner import clean_text_list

# Importing AI engine (FAISS + Ollama Fine-Tuned Model)
from rag_service import get_rag_system

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Nexus AI Enterprise Engine (Hybrid ML + Smart RAG)")

# 1. Load the RAG engine into memory
print("Loading FAISS Index and connecting to Local Ollama Model...")
rag_system = get_rag_system(rebuild=False)

# -----------------------------
# Request / Response Schemas
# -----------------------------
class TicketRequest(BaseModel):
    title: str
    description: str

class TicketResponse(BaseModel):
    category: str
    priority: str
    sentiment: str
    suggested_solution: str

# -----------------------------
# Endpoints
# -----------------------------
@app.get("/health")
def health():
    return {"status": "ok", "engine": "FastAPI + FAISS + Local Fine-Tuned Ollama (Smart Priority)"}

@app.post("/ticket", response_model=TicketResponse)
def process_ticket(ticket: TicketRequest):
    try:
        # 1. Combine title with description to form full context
        full_text = f"{ticket.title}. {ticket.description}"

        # 2. Clean the text
        cleaned_text = clean_text_list([full_text])[0]

        # 3. Use Machine Learning for fast classification (ONLY Category is used)
        predicted_category, _ = predict_ml(cleaned_text) 
        
        # 4. Sentiment analysis
        detected_sentiment = analysis_sentiment(cleaned_text)

        # 5. The real magic: AI generates BOTH the Smart Priority and the Solution
        smart_priority, smart_solution = rag_system.rag_response(
            query=full_text, 
            category=predicted_category
        )

        return TicketResponse(
            category=predicted_category,
            priority=smart_priority,      # Using Ollama's Priority
            sentiment=detected_sentiment,
            suggested_solution=smart_solution # Using Ollama's Solution
        )

    except Exception as e:
        logging.exception("Ticket processing failed")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run on port 8001
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)