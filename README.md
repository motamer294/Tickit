# TICKIT — Help Desk & Ticketing System

A full-stack help desk platform with real-time collaboration, role-based access control, and an AI-powered ML service for automatic ticket classification and routing.

**Version:** 1.0.0 &nbsp;|&nbsp; **License:** MIT

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 7, TanStack Query, Zustand, React Router v7 |
| Backend | Django 6, Django Ninja, Django Channels (WebSocket), Celery, Daphne |
| ML Service | FastAPI, scikit-learn, FAISS, sentence-transformers, Ollama (LLaMA 3.2) |
| Infrastructure | Docker, PostgreSQL 15, Redis, Nginx |

---

## Project Structure

```
TICKIT/
├── web/          # React frontend (Vite)
├── server/       # Django backend + Docker config
├── ML/           # FastAPI ML service (classification, RAG, Ollama)
└── package.json  # Root npm scripts for the entire project
```

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.12+
- **Docker** and **Docker Compose**
- **Ollama** (for the LLM component of the ML service)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/motamer294/Tickit.git
cd TICKIT
npm run setup
```

`npm run setup` handles everything for the main app:

- Installs root and frontend npm dependencies
- Creates a Python virtual environment for the Django backend
- Installs backend Python dependencies
- Copies `.env.example` files to `.env` for both `web/` and `server/`

### 2. Configure environment

Edit the generated `.env` files before starting:

```
web/.env
server/.env
```

### 3. Start development servers

```bash
npm run dev
```

This starts the Docker containers (PostgreSQL, Redis, Nginx, Django) and the Vite frontend dev server concurrently.

---

## All npm Scripts

### Development

```bash
npm run dev              # Start frontend + backend together
npm run dev:client       # Start Vite frontend only
npm run dev:server       # Start Docker containers only
```

### Setup

```bash
npm run setup            # Full install: npm deps + Python venv + .env files
npm run setup:client     # Install frontend npm packages
npm run setup:server     # Create backend venv + install Python deps
npm run setup:env        # Copy .env.example files
```

### Docker

```bash
npm run docker:up        # Start all containers (detached)
npm run docker:down      # Stop and remove containers
npm run docker:stop      # Stop containers, keep state
npm run docker:status    # List running containers
npm run docker:logs      # Stream container logs
npm run docker:rebuild   # Rebuild images and restart
npm run docker:nuke      # Full teardown: remove containers, volumes, and images
```

### Database & Migrations

> These commands run inside the backend container.

```bash
npm run db:makemigrations   # Generate new Django migrations
npm run db:migrate          # Apply pending migrations
npm run db:seed             # Load seed data
npm run db:superuser        # Create a Django superuser
npm run db:shell            # Open Django shell
```

### ML Service

```bash
npm run ml:setup         # Create ML venv, install deps, train models
npm run ml:run           # Start Ollama + FastAPI ML service
npm run ml:stop          # Stop ML services
```

### Testing

```bash
npm run test             # Run frontend and backend tests
npm run test:client      # React component tests (Vitest)
npm run test:server      # Django tests via pytest (inside container)
```

### Production

```bash
npm run build            # Build frontend for production (outputs to web/dist/)
```

---

## ML Service

The ML service runs independently from the main Django backend. It exposes a FastAPI server on port `8001` and uses Ollama on port `11434` for LLM inference.

### First-time setup

```bash
npm run ml:setup
```

This creates `ML/venv`, installs all Python dependencies, and trains the classification models from the dataset, generating the required `.pkl` files under `ML/models/`.

### Pull the LLM model (one-time)

```bash
ollama pull llama3.2
```

### Start and stop

```bash
npm run ml:run     # Starts Ollama and FastAPI
npm run ml:stop    # Stops both processes
```

**Endpoints:**

| URL | Description |
|---|---|
| `http://localhost:8001/health` | Health check |
| `http://localhost:8001/ticket` | Classify and route a ticket |
| `http://localhost:8001/cache_stats` | Cache statistics |

**ML capabilities:**

- Ticket category classification (SVM + LR ensemble)
- Priority auto-assignment
- Sentiment analysis
- Similar ticket detection via FAISS

---

## Database Access

```bash
# Connect directly to PostgreSQL
docker exec -it helpdesk_postgres_db psql -U admin -d helpdesk_db

# Or use the Django shell
npm run db:shell
```

---

## API Documentation

The full REST API is documented as a Postman collection:

```
server/docs/HelpDesk_API.postman_collection.json
```

Import it into Postman to explore and test all endpoints. Django Ninja also generates automatic interactive docs at `http://localhost:8000/api/docs` when the backend is running.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

---

## License

MIT License — see [LICENSE](LICENSE) for details.
