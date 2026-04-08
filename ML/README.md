```markdown
# 🧠 Nexus AI: Machine Learning Microservice

This repository contains the Machine Learning microservice for the AI-Powered Help Desk project. It operates as a standalone RESTful API built with **FastAPI**, responsible for handling all natural language processing(NLP), ticket classification, and automated resolution generation.

A core architectural pillar of this microservice is **data privacy and security**. It relies entirely on local models—specifically **Llama 3.2 via Ollama**—ensuring that zero sensitive IT data is sent to external or cloud-based APIs.

---

## 🏗️ Technical Stack

* **Framework:** FastAPI
* **LLM Engine:** Llama 3.2 (Local execution via Ollama)
* **Vector Database:** FAISS (Facebook AI Similarity Search)
* **Embeddings:** `all-MiniLM-L6-v2` (SentenceTransformers)
* **Classical ML:** Scikit-learn (Logistic Regression, Linear SVM)
* **NLP Processing:** NLTK / spaCy (via custom `nlp_service.py` & `text_cleaner.py`)

---

## 📂 Architecture & Directory Structure

```text
ML/
├── dataset/                   # Synthetic ITSM training data
├── models/                    # Serialized ML pipelines and FAISS vector indices
├── services/                  # Core logic modules
│   ├── ml_service.py          # Wrappers for scikit-learn predictions
│   ├── nlp_service.py         # Sentiment and intent analysis functions
│   └── text_cleaner.py        # Text sanitization and preprocessing
├── app.py                     # Main FastAPI application and route definitions
├── build_faiss.py             # Script to generate vector embeddings from historical data
├── rag_service.py             # Orchestrates retrieval (FAISS) and generation (Llama 3.2)
└── train_models.py            # Script to train and export classification models (.pkl)
```

---

## 🚀 Features

1.  **Automated Ticket Classification:** Predicts the appropriate `Category` and `Priority` for incoming tickets using trained scikit-learn models (Logistic Regression & Linear SVM).
2.  **Sentiment Analysis:** Analyzes the tone of the user's request to help prioritize urgent or frustrated queries.
3.  **Local RAG System (Retrieval-Augmented Generation):** Searches a FAISS database of over 1000+ historical IT resolutions to provide accurate, context-aware solutions using Llama 3.2.

---

## 🛠️ Setup & Installation

**1. Install Dependencies**
Ensure you have Python 3.10+ installed, then install the required packages:
```bash
pip install -r requirements.txt
```

**2. Setup Ollama (Local LLM)**
You must have Ollama installed and the Llama 3.2 model pulled locally.
```bash
# Pull the model
ollama run llama3.2
```
*Ensure the Ollama service is running in the background before starting the FastAPI server.*

**3. Data Preparation (First-time setup)**
Before running the API, you need to train the classification models and build the FAISS index based on the historical dataset.
```bash
# Train category and priority classification models
python train_models.py

# Build the FAISS vector database
python build_faiss.py
```

**4. Start the FastAPI Server**
Run the server using Uvicorn:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📡 API Documentation

Once the server is running, FastAPI provides automatic, interactive API documentation. You can explore the endpoints and test requests directly in your browser:

* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Endpoints
* `POST /analyze_ticket_with_ai`: Accepts a raw user ticket and returns structured JSON containing the predicted category, priority, sentiment, and a suggested AI resolution generated via the RAG pipeline.
```