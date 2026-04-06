from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

from services.ml_service import predict_ml
from services.nlp_service import analysis_sentiment
from rag_service import rag_response
from services.text_cleaner import clean_text_list


logging.basicConfig(level=logging.INFO)


app = FastAPI(title="AI Ticket System")


# -----------------------------
# Request / Response Models
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
# Endpoint
# -----------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ticket", response_model=TicketResponse)
def process_ticket(ticket: TicketRequest):

    try:
        # Combine text
        text = f"{ticket.title} {ticket.description}"

        # Clean text
        cleaned_text = clean_text_list([text])[0]

        # ML prediction
        category, priority = predict_ml(cleaned_text)
        # map index number category and priority to actual labels (the inverse of {'account':0,'technical':1,'billing':2,'delivery':3})
        category_mapping = {0: 'account', 1: 'technical', 2: 'billing', 3: 'delivery'}
        priority_mapping = {0: 'low', 1: 'medium', 2: 'high'}
        category = category_mapping.get(category, "unknown")
        priority = priority_mapping.get(priority, "unknown")
        # Sentiment
        sentiment = analysis_sentiment(cleaned_text)
        # map index number sentiment to actual labels (the inverse of {'negative':0,'neutral':1,'positive':2})
        sentiment_mapping = {0: 'negative', 1: 'neutral', 2: 'positive'}
        sentiment = sentiment_mapping.get(sentiment, "unknown")
        # RAG solution
        solution = rag_response(cleaned_text, category)

        return TicketResponse(
            category=category,
            priority=priority,
            sentiment=sentiment,
            suggested_solution=solution
        )

    except Exception as e:
        logging.exception("Ticket processing failed")
        raise HTTPException(status_code=500, detail="Internal Server Error")