# 🧠 AI Engine Microservice - Help Desk System

Welcome to the AI Engine repository of our Help Desk Ticketing System. This microservice is responsible for intelligently analyzing customer support tickets, classifying them, detecting sentiment, determining priority, and generating helpful responses using a **Hybrid AI Approach (Classical ML + RAG)**.

This service is decoupled from the main Django backend and exposes a **FastAPI** interface for seamless integration.

---

## 🏛️ Architectural Decisions (Important)

During the development of this project, a strategic architectural pivot was made:
**Transition from Local LLMs to Cloud-based LLM (Groq API):**
Initially, the system was designed to run a local LLM (like Ollama). However, to ensure **low latency**, **hardware resource optimization**, and a smoother deployment process via Docker, we migrated to a Cloud-based LLM via the **Groq API (Llama 3)**. This ensures the system can handle concurrent requests without overloading the host machine's RAM/GPU.

---

## ✨ Features

- **Automatic Ticket Categorization:** (Account, Technical, Billing, Delivery)
- **Sentiment Analysis:** Detects if the customer is frustrated or neutral.
- **Priority Prediction:** Assigns urgency levels automatically.
- **FAQ Retrieval System (FAISS):** Extremely fast vector search to find relevant solutions.
- **RAG-based Response Generation:** Uses Groq LLM to formulate a polite, context-aware reply to the customer.
- **RESTful API (FastAPI):** Ready to be consumed by the Django backend or frontend.

---

## 🧰 Tech Stack

- **Framework:** FastAPI
- **Machine Learning:** Scikit-learn, TF-IDF
- **Vector Database:** FAISS (Facebook AI Similarity Search)
- **Generative AI:** Groq API (Llama 3 Model)
- **Containerization:** Docker

---

## 🤖 Hybrid ML/AI Models

We utilize a hybrid approach to balance speed and intelligence:

| Task | Model Used | Role |
| :--- | :--- | :--- |
| **Category Classification** | Logistic Regression | Fast routing & tagging |
| **Sentiment Analysis** | Linear SVM | Tone detection |
| **Priority Prediction** | Linear SVM | Urgency assignment |
| **Response Generation** | Groq API (Llama 3) | Human-like text generation (RAG) |

---

## 🚀 How to Run the AI Service (Docker)

You don't need to install any heavy ML libraries locally. Everything is containerized.

### 1️⃣ Clone the Repository
```bash
git clone [https://github.com/motamer294/ai-powered-customer-support.git](https://github.com/motamer294/ai-powered-customer-support.git) ai_engine
cd ai_engine