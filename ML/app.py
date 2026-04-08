from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging


from services.ml_service import predict_ml
from services.nlp_service import analysis_sentiment
from services.text_cleaner import clean_text_list

from rag_service import get_rag_system

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Enterprise ITSM AI Engine")

# Load our AI brain (FAISS + Llama) into memory when the server starts
print("Loading AI Engine into memory...")
rag_system = get_rag_system(rebuild=False)

# -----------------------------
# Request / Response Models (unchanged so Django doesn't get upset)
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
    return {"status": "ok", "engine": "Llama 3.2 (Local) + FAISS"}

@app.post("/ticket", response_model=TicketResponse)
def process_ticket(ticket: TicketRequest):
    try:
        # Combine title with description so the model understands the full context
        full_text = f"{ticket.title}. {ticket.description}"

        # TODO: We will update this part later
        # Currently using default values (Mock Data) to prevent the server from crashing
        predicted_category = "General IT" 
        predicted_priority = "High"
        detected_sentiment = "Neutral"

        # Generate professional solution using RAG and Llama 3.2
        solution = rag_system.rag_response(query=full_text, category=predicted_category)

        return TicketResponse(
            category=predicted_category,
            priority=predicted_priority,
            sentiment=detected_sentiment,
            suggested_solution=solution
        )

    except Exception as e:
        logging.exception("Ticket processing failed")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # We'll run it on port 8001 since Django is running on 8000
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)