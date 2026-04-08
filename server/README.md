Here is the updated, modernized `README.md` for your `server` directory. I have significantly upgraded it to reflect your transition to **Django 6.0, Django Ninja, ASGI/WebSockets, Redis, and the new Analytics/SLA features**.

***

### `HELPDESK_AI_WORKSPACE/Nexus_Ai/server/README.md`

```markdown
# ⚙️ Nexus AI: Core Backend Server

Welcome to the Core Backend (The "Body") of the Nexus AI Help Desk System. This service handles all central business logic, database management, user authentication, and real-time live chat communications. 

It is built for high performance using **Django 6.0** and **Django Ninja** (FastAPI-style routing), with an **ASGI** architecture powered by **Daphne** and **Redis** for WebSocket support.

---

## 📌 Key Features

- ✅ **High-Speed RESTful API** – Built with Django Ninja for Pydantic-validated, fast routing.
- ✅ **Real-Time WebSockets** – Room-based live chat per ticket via Django Channels, Daphne, and Redis, complete with message persistence.
- ✅ **Advanced Analytics & SLA tracking** – Manager-only dashboard endpoints utilizing complex PostgreSQL aggregations (`Count`, `Avg`, `F` expressions) and MTTR (Mean Time To Resolution) tracking.
- ✅ **AI Microservice Integration** – Seamless REST communication with the isolated FastAPI RAG engine.
- ✅ **JWT Authentication & RBAC** – Secure role-based access control (Roles: `CUSTOMER`, `EMPLOYEE`, `MANAGER`).
- ✅ **Fully Containerized** – Postgres and Redis run via Docker for zero-friction local development.

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:

- Python 3.10+
- [Git](https://git-scm.com/downloads)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

---

## 💻 1. Local Setup (For VS Code / IDE Support)

For the best development experience (IDE autocomplete & linting), you should set up a local Python virtual environment.

### Step 1: Navigate and Create Virtual Environment
```bash
cd server
python -m venv venv
```

### Step 2: Activate the Environment
**For Windows:**
```bash
venv\Scripts\activate
```
**For Mac/Linux:**
```bash
source venv/bin/activate
```

### Step 3: Install Requirements
```bash
pip install -r requirements.txt
```
*(After this, make sure to select this `venv` as your Python Interpreter in VS Code by pressing `Ctrl+Shift+P` -> `Python: Select Interpreter`)*.

---

## 🚀 2. Running the Infrastructure (Database & Redis)

We use Docker to instantly spin up **PostgreSQL** (for relational data) and **Redis** (as the message broker for WebSockets).

### Step 1: Set Up Environment Variables
Copy the example environment file (if available) or ensure your `.env` is configured for local defaults:
```bash
cp .env.example .env
```

### Step 2: Start the Dockerized Services
Run this command from the root directory (where `docker-compose.yml` lives) to start Postgres and Redis in the background:
```bash
docker compose up -d
```

---

## 🏃 3. Running the Django Server

Because we are using WebSockets, we run the server using **Daphne** (an ASGI server) instead of the standard WSGI `runserver`.

### Step 1: Run Database Migrations
Ensure your database schema is up to date:
```bash
python manage.py migrate
```

### Step 2: Create a Superuser (Admin)
To access the Django Admin panel:
```bash
python manage.py createsuperuser
```

### Step 3: Start the ASGI Server
Start the real-time server:
```bash
daphne -p 8001 core.asgi:application
```
*(Note: Ensure the ML Microservice is also running on its designated port if you plan to test AI ticket analysis features).*

---

## 🌅 4. Daily Routine (How to start working)

When you open your computer to work, simply:
1. Make sure Docker is running (`docker compose up -d`).
2. Activate your virtual environment (`source venv/bin/activate`).
3. Start Daphne (`daphne -p 8001 core.asgi:application`).

---

## 🌐 Access the System

| Service                            | URL                              |
|------------------------------------|----------------------------------|
| Django API Base                    | `http://localhost:8001/api/`     |
| **Interactive API Docs** (Swagger) | `http://localhost:8001/api/docs` |
| Django Admin Panel                 | `http://localhost:8001/admin`    |
| WebSocket Chat Connection          | `ws://localhost:8001/ws/chat/<ticket_id>/` |

You can also test the API using the provided Postman collection:  
`HelpDesk_API.postman_collection.json`

---

## 🛑 Useful Commands

| Action                             | Command                                                          |
|------------------------------------|------------------------------------------------------------------|
| Open Django shell                  | `python manage.py shell`                                         |
| Create new DB migrations           | `python manage.py makemigrations`                                |
| Run Unit Tests                     | `pytest`                                                         |
| Stop Docker infrastructure         | `docker compose down`                                            |
| Wipe Docker DB & Redis clean       | `docker compose down -v`                                         |

---
Happy Coding! 💻🚀


