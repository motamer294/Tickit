# Developer Setup Guide

Quick start guide for developers to get the project running locally.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Python 3.12+
- Git

## Quick Start

### 1. Backend Setup

```bash
cd server
docker-compose up -d
docker-compose exec -T backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

Backend running at: http://localhost:8000/api/

### 2. Frontend Setup

```bash
cd web
npm install
npm run dev
```

Frontend running at: http://localhost:5173

### 3. ML Service Setup (Optional)

```bash
cd ML
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/build_faiss.py
python app.py
```

ML Service running at: http://localhost:5000/api/

## Environment Variables

### Backend (server/.env)

```
DEBUG=False
SECRET_KEY=dev-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://postgres:postgres@db:5432/helpdesk
REDIS_URL=redis://redis:6379/0
```

### Frontend (web/.env.local)

```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

## Common Commands

### Backend

```bash
# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec -T backend python manage.py migrate

# Create test data
docker-compose exec backend python manage.py shell

# Run tests
docker-compose exec -T backend python manage.py test

# Access database
docker-compose exec db psql -U postgres -d helpdesk

# Stop services
docker-compose down
```

### Frontend

```bash
# Build for production
npm run build

# Type check
npm run type-check

# Run linter
npm run lint

# Run tests
npm run test
```

## Verify Setup

```bash
# Backend API
curl http://localhost:8000/api/

# Frontend
curl http://localhost:5173/

# Admin panel
http://localhost:8000/admin/
```

## Database Migrations

```bash
# Check migration status
docker-compose exec -T backend python manage.py showmigrations

# Create new migration
docker-compose exec -T backend python manage.py makemigrations app_name

# Apply migration
docker-compose exec -T backend python manage.py migrate
```

## Testing

```bash
# Backend tests
cd server
docker-compose exec -T backend python manage.py test

# Frontend tests
cd web
npm run test
```

## Troubleshooting

**Port 8000 already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

**Database connection failed:**
```bash
docker-compose restart db
```

**WebSocket not connecting:**
Check that backend is running and VITE_WS_URL is correct in `.env.local`.

**Frontend not loading:**
Ensure npm install completed and no TypeScript errors:
```bash
npm run type-check
```

## Project Structure

```
server/          - Django backend and API
web/             - React frontend
ML/              - Machine learning service
```

## API Documentation

API endpoints documented in: `server/docs/HelpDesk_API.postman_collection.json`

Import into Postman to test endpoints.

## Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Test locally
4. Commit with clear message
5. Push and create pull request

## Architecture

Backend: Django 6.0 + DRF + Daphne ASGI + WebSocket
Frontend: React 19 + Vite + TypeScript + Mantine UI
Database: PostgreSQL 15
Cache: Redis
Real-time: Django Channels + WebSocket

## Features Implemented

1. Ticket Management System
2. Category and Tags
3. Status Workflow
4. File Attachments
5. Advanced Search and Filtering
6. Analytics Dashboard
7. User Admin Panel
8. SLA Tracking
9. Comprehensive Audit Logging with Real-time Updates

## Notes

- All database migrations must be applied before starting backend
- WebSocket requires backend to be running
- Frontend build outputs to `dist/` directory
- Static files collected during Docker build
