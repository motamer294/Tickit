# Backend Development & Local Deployment Guide

Complete guide for running the Django backend locally for development or Docker-based local deployment.

---

## 🚀 Quick Start (Development Mode)

### 1. Install Prerequisites

```bash
# Python 3.12+
python3 --version  # Should be 3.12 or higher

# Install PostgreSQL (if running locally, not in Docker)
# macOS:
brew install postgresql@15

# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# Windows: Download from https://www.postgresql.org/download/windows/
```

### 2. Setup Environment

```bash
cd /home/essam/graduation_project/server

# Create virtual environment
python3 -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure .env File

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env  # or your preferred editor
```

**Example `.env` for local development:**

```env
# Django Settings
SECRET_KEY=django-insecure-your-secret-key-here
DEBUG=True
ENVIRONMENT=development

# Database Settings (LOCAL - not Docker)
DB_ENGINE=django.db.backends.postgresql
DB_HOST=localhost        # Change to 'db' for Docker
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=admin
DB_PASSWORD=password123

# Redis Settings (LOCAL - not Docker)
REDIS_HOST=localhost     # Change to 'redis' for Docker
REDIS_PORT=6379
REDIS_DB=0

# WebSocket & Channels
WEBSOCKET_PORT=8000
CHANNEL_CAPACITY=5000
CHANNEL_EXPIRY=300

# Django Allowed Hosts
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Security (for development only)
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# ML Service
ML_SERVICE_URL=http://host.docker.internal:8001/ticket
ML_SERVICE_TIMEOUT=45

# Logging
LOG_LEVEL=DEBUG
```

---

## 🗄️ Database Setup

### Option A: Local PostgreSQL (Native)

```bash
# 1. Create database and user
sudo -u postgres psql

# Inside psql:
CREATE DATABASE helpdesk_db;
CREATE USER admin WITH PASSWORD 'password123';
ALTER ROLE admin SET client_encoding TO 'utf8';
ALTER ROLE admin SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin SET default_transaction_deferrable TO on;
ALTER ROLE admin SET default_transaction_read_uncommitted TO off;
GRANT ALL PRIVILEGES ON DATABASE helpdesk_db TO admin;
\q
```

**Verify connection:**
```bash
psql -h localhost -U admin -d helpdesk_db -c "\dt"
```

### Option B: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name helpdesk_postgres \
  -e POSTGRES_DB=helpdesk_db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 \
  postgres:15

# Test connection:
docker exec helpdesk_postgres psql -U admin -d helpdesk_db -c "\dt"
```

---

## 🏃 Running the Backend

### Option 1: Development Server (Local)

```bash
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run migrations
python manage.py migrate

# Create superuser (if needed)
python manage.py createsuperuser

# Start development server
python manage.py runserver 0.0.0.0:8000
```

**Output should show:**
```
Starting development server at http://0.0.0.0:8000/
```

### Option 2: Daphne ASGI Server (WebSocket Support - Local)

```bash
# Activate virtual environment
source venv/bin/activate

# Run migrations
python manage.py migrate

# Run with Daphne (ASGI server with WebSocket support)
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

**Output should show:**
```
Listening on TCP address 0.0.0.0:8000
```

### Option 3: Docker Compose (Full Stack - Recommended)

```bash
# Navigate to server directory
cd /home/essam/graduation_project/server

# Update .env for Docker (DB_HOST=db, REDIS_HOST=redis)
# See .env.docker example below

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

**Expected output from `docker-compose ps`:**
```
NAME                   IMAGE            STATUS
helpdesk_nginx         nginx:alpine     Up (healthy)
helpdesk_django_app    server-backend   Up
helpdesk_postgres_db   postgres:15      Up
helpdesk_redis         redis:alpine     Up
```

---

## 📋 Environment File Examples

### `.env.local` (Local Development)

```env
# Django Settings
SECRET_KEY=django-insecure-dev-key-12345
DEBUG=True
ENVIRONMENT=development

# Database (LOCAL PostgreSQL - not Docker)
DB_ENGINE=django.db.backends.postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=admin
DB_PASSWORD=password123

# Redis (LOCAL - not Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# WebSocket
WEBSOCKET_PORT=8000
CHANNEL_CAPACITY=5000
CHANNEL_EXPIRY=300

# Security (development only)
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# CORS
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### `.env.docker` (Docker Compose)

```env
# Django Settings
SECRET_KEY=django-insecure-docker-key-12345
DEBUG=True
ENVIRONMENT=development

# Database (Docker service names)
DB_ENGINE=django.db.backends.postgresql
DB_HOST=db
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=admin
DB_PASSWORD=password123

# Redis (Docker service name)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# WebSocket
WEBSOCKET_PORT=8000
CHANNEL_CAPACITY=5000
CHANNEL_EXPIRY=300

# Nginx reverse proxy
SECURE_PROXY_HEADER_ENVIRON=HTTP_X_FORWARDED_FOR
SECURE_PROXY_HEADER=HTTP_X_FORWARDED_PROTO

# Security (for Docker with HTTPS)
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# CORS
ALLOWED_HOSTS=localhost,127.0.0.1,nginx
CORS_ALLOWED_ORIGINS=https://localhost,http://localhost
```

---

## 🔄 Database Migrations

### Run Migrations

```bash
# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Check migration status
python manage.py showmigrations

# Rollback last migration
python manage.py migrate accounts zero
```

### Create Superuser

```bash
python manage.py createsuperuser
# Follow prompts to create admin account
```

---

## 🧪 Testing Endpoints

### Login Endpoint

```bash
# Local (port 8000)
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Docker with Nginx (HTTPS)
curl -k -X POST https://localhost/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Create Ticket

```bash
# Get token from login first
TOKEN="your_jwt_token_here"

# Create ticket
curl -X POST http://localhost:8000/api/tickets/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Ticket",
    "description":"Test description",
    "priority":"medium",
    "category":"general"
  }'
```

### WebSocket Connection

```bash
# Test WebSocket locally
wscat -c ws://localhost:8000/ws/notifications/

# Test WebSocket through Docker Nginx (HTTPS)
wscat -c wss://localhost/ws/notifications/
```

---

## 🐳 Docker Compose Management

### Start Services

```bash
# Start all services
docker-compose up -d

# Start and watch logs
docker-compose up

# Start specific service
docker-compose up -d backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f db

# Last 50 lines
docker-compose logs --tail 50
```

### Manage Services

```bash
# Restart a service
docker-compose restart backend

# Stop all services
docker-compose stop

# Remove all containers and networks
docker-compose down

# Full rebuild
docker-compose down --remove-orphans
docker-compose up -d --build
```

---

## 🔍 Debugging

### Django Shell

```bash
# Interactive Python shell with Django context
python manage.py shell

# Example queries:
from django.contrib.auth.models import User
User.objects.all()
```

### Check Database Connection

```bash
# From Django shell
from django.db import connection
connection.ensure_connection()
print("✓ Database connected")
```

### Enable Debug Logging

**In `.env`:**
```env
DEBUG=True
LOG_LEVEL=DEBUG
```

**In Django settings:**
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Connection refused" for PostgreSQL

```
django.db.utils.OperationalError: connection to server at "localhost" (127.0.0.1), port 5432 failed
```

**Solution:**
- Ensure PostgreSQL is running: `postgres -D /usr/local/var/postgres`
- Or use Docker: `docker run -d -p 5432:5432 postgres:15`
- Check `.env` has correct `DB_HOST` and `DB_PORT`

### Issue 2: "Port 8000 already in use"

```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>

# Or use different port
python manage.py runserver 0.0.0.0:8001
```

### Issue 3: Migrations not applied in Docker

```bash
# Run migrations manually in Docker
docker-compose exec backend python manage.py migrate

# Or rebuild
docker-compose down --remove-orphans
docker-compose up -d --build
```

### Issue 4: Redis connection failed

```
ConnectionError: Error 61 connecting to localhost:6379
```

**Solution:**
- Start Redis locally: `redis-server`
- Or use Docker: `docker run -d -p 6379:6379 redis:alpine`
- Check `.env` has correct `REDIS_HOST`

### Issue 5: WebSocket connection fails

**Reason:** Using Django development server instead of Daphne
```bash
# Use Daphne instead:
daphne -b 0.0.0.0 -p 8000 core.asgi:application

# Or via Docker (already configured)
docker-compose up -d
```

---

## 📊 Monitoring

### Django Admin

```bash
# Access at http://localhost:8000/admin
# Username: admin (created with createsuperuser)

# Or through Nginx:
https://localhost/admin (with certificate warning)
```

### API Health Check

```bash
# Health endpoint
curl http://localhost:8000/health

# Nginx health (Docker)
curl -k https://localhost/health
```

### Service Status

```bash
# Check all Docker services
docker-compose ps

# Check individual service logs
docker-compose logs backend --tail 20
```

---

## 🛠️ Development Workflow

### 1. Start Services

```bash
# Terminal 1: Docker services (if using Docker)
cd /home/essam/graduation_project/server
docker-compose up -d

# Terminal 2: Backend server
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
# OR for WebSocket support:
daphne -b 0.0.0.0 -p 8000 core.asgi:application

# Terminal 3: Frontend dev server
cd /home/essam/graduation_project/web
npm run dev
```

### 2. Make Changes

```bash
# Edit Django code
# Changes auto-reload in dev server

# If you modify models:
python manage.py makemigrations
python manage.py migrate

# If you modify settings, restart server
```

### 3. Test Changes

```bash
# Run tests
python manage.py test

# Or specific test:
python manage.py test accounts.tests.TestUserAuthentication

# Run integration tests
pytest
```

---

## 📦 Running Tests

### Run All Tests

```bash
# Django test runner
python manage.py test

# Pytest (if configured)
pytest

# With verbose output
pytest -v

# Run specific test file
pytest tests/test_login.py
```

### Coverage Report

```bash
pip install coverage

coverage run --source='.' manage.py test
coverage report
```

---

## 📝 Environment Variables Reference

| Variable | Local | Docker | Purpose |
|----------|-------|--------|---------|
| `DB_HOST` | `localhost` | `db` | PostgreSQL hostname |
| `DB_PORT` | `5432` | `5432` | PostgreSQL port |
| `REDIS_HOST` | `localhost` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | `6379` | Redis port |
| `DEBUG` | `True` | `True/False` | Django debug mode |
| `WEBSOCKET_PORT` | `8000` | `8000` | Daphne listen port |
| `SECURE_SSL_REDIRECT` | `False` | `False` | Force HTTPS redirect |
| `SESSION_COOKIE_SECURE` | `False` | `False/True` | HTTPS-only cookies |

---

## 🎯 Quick Reference

### Start Development (Local)

```bash
# Terminal 1: Database
docker-compose up -d db redis  # or start PostgreSQL locally

# Terminal 2: Backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Terminal 3: Frontend
cd ../web
npm run dev
```

### Start Development (Docker)

```bash
# Terminal 1: All services
docker-compose up -d

# Terminal 2: Frontend
cd ../web
npm run dev

# Or rebuild if needed:
docker-compose down --remove-orphans
docker-compose up -d --build
```

### Deploy Locally (HTTPS)

```bash
# All services with HTTPS through Nginx
docker-compose up -d

# Access at https://localhost (with self-signed cert warning)
```

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django Channels](https://channels.readthedocs.io/)
- [Daphne ASGI Server](https://github.com/django/daphne)
- [Docker Compose](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ✅ Verification Checklist

- [ ] Python 3.12+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file configured
- [ ] PostgreSQL running (local or Docker)
- [ ] Redis running (local or Docker)
- [ ] Migrations applied (`python manage.py migrate`)
- [ ] Backend server running (port 8000)
- [ ] Login endpoint responding
- [ ] WebSocket connection ready
- [ ] Frontend can reach backend API

---

**Last Updated:** April 20, 2026  
**Version:** 2.0 (Production-Ready)
