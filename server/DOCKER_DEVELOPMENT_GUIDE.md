# Docker Development & Local Deployment Guide

Complete guide to run the HelpDesk backend with Docker for development and local deployment.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Development Workflow](#development-workflow)
4. [Environment Configuration](#environment-configuration)
5. [Docker Commands Reference](#docker-commands-reference)
6. [Troubleshooting](#troubleshooting)
7. [Production Considerations](#production-considerations)

---

## Prerequisites

### Required

- **Docker** (version 20.10+)
  ```bash
  docker --version  # Should show Docker 20.10 or higher
  ```
- **Docker Compose** (version 2.0+)
  ```bash
  docker-compose --version  # Should show Docker Compose 2.0 or higher
  ```

### Recommended

- **Git** (for version control)
- **curl** (for testing endpoints)

### Verify Installation

```bash
# Test Docker installation
docker run hello-world

# Test Docker Compose
docker-compose --version
```

---

## Quick Start (5 minutes)

### 1️⃣ Clone/Navigate to Project

```bash
cd /home/essam/graduation_project/server
```

### 2️⃣ Set Up Environment

```bash
# Copy example env file
cp .env.example .env

# Edit if needed (optional for development)
# nano .env
```

### 3️⃣ Start All Services

```bash
# Build and start all containers
docker-compose up -d

# Wait for services to be healthy (30 seconds)
sleep 30

# Verify all services are running
docker-compose ps
```

### 4️⃣ Check Services Status

```bash
# Expected output:
# NAME                   IMAGE      STATUS
# helpdesk_nginx         nginx      Up 5 seconds (healthy)
# helpdesk_django_app    backend    Up 5 seconds
# helpdesk_postgres_db   postgres   Up 5 seconds
# helpdesk_redis         redis      Up 5 seconds
```

### 5️⃣ Test Backend Access

```bash
# Test through Nginx (HTTPS)
curl -k https://localhost/api/health

# Test direct backend (for development)
curl http://localhost:8000/api/health
```

### ✅ You're Ready!

Backend is running:

- **Frontend API:** `https://localhost/api`
- **Admin Panel:** `https://localhost/admin`
- **WebSocket:** `wss://localhost/ws`
- **Direct Backend:** `http://localhost:8000`

---

## Development Workflow

### Daily Development

#### Start Containers

```bash
cd /home/essam/graduation_project/server

# Start all services in background
docker-compose up -d

# Or with logs (to debug issues)
docker-compose up
```

#### View Live Logs

```bash
# Backend logs (follow updates)
docker-compose logs -f backend

# Nginx logs
docker-compose logs -f nginx

# Database logs
docker-compose logs -f db

# All services
docker-compose logs -f
```

#### Make Code Changes

The backend volume is mounted at `/app`, so changes are reflected immediately:

```bash
# Edit files locally (e.g., src/backend/views.py)
# Changes auto-reload in running container (Daphne watches files)
nano accounts/views.py
```

#### Database Migration

```bash
# Apply pending migrations
docker-compose exec backend python manage.py migrate

# Create new migration
docker-compose exec backend python manage.py makemigrations

# View migration status
docker-compose exec backend python manage.py showmigrations
```

#### Create Admin User

```bash
# Interactive admin setup
docker-compose exec backend python manage.py createsuperuser

# Non-interactive (for scripts)
docker-compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Admin user created')
else:
    print('Admin user already exists')
"
```

#### Run Tests

```bash
# All tests
docker-compose exec backend python manage.py test

# Specific app tests
docker-compose exec backend python manage.py test accounts

# With verbosity
docker-compose exec backend python manage.py test --verbosity=2

# Coverage report
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report
```

#### Database Shell

```bash
# Access Django ORM shell
docker-compose exec backend python manage.py shell

# Example commands:
# >>> from accounts.models import User
# >>> User.objects.all()
```

#### PostgreSQL Shell

```bash
# Direct database access
docker-compose exec db psql -U admin -d helpdesk_db

# Common SQL:
# \dt              - list tables
# \d accounts_user - describe table structure
# SELECT * FROM accounts_user;
```

#### Redis Shell

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Common commands:
# PING              - test connection
# KEYS *            - list all keys
# FLUSHDB           - clear database
```

---

## Environment Configuration

### Development Environment (.env)

```bash
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ENVIRONMENT=development

# Database (Docker service names)
DB_ENGINE=django.db.backends.postgresql
DB_HOST=db
DB_NAME=helpdesk_db
DB_USER=admin
DB_PASSWORD=password123
DB_PORT=5432

# Redis (Docker service names)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# WebSocket
CHANNEL_CAPACITY=5000
CHANNEL_EXPIRY=300
WEBSOCKET_PORT=8000

# ML Service (if needed)
ML_SERVICE_URL=http://host.docker.internal:8001/ticket
ML_SERVICE_TIMEOUT=45

# Security (for development)
SECURE_PROXY_HEADER_ENVIRON=HTTP_X_FORWARDED_FOR
SECURE_PROXY_HEADER=HTTP_X_FORWARDED_PROTO
```

### Production Environment (Optional)

```bash
# Enable production mode
DEBUG=False
ENVIRONMENT=production
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Update secret key
SECRET_KEY=generate-from-secrets-manager
```

---

## Docker Commands Reference

### Container Management

```bash
# Start all services
docker-compose up -d

# Stop all services (keep data)
docker-compose stop

# Start stopped services
docker-compose start

# Restart services
docker-compose restart

# Remove containers (keep data)
docker-compose down

# Remove containers AND volumes (WARNING: deletes database!)
docker-compose down -v

# View running containers
docker-compose ps

# View all containers (including stopped)
docker-compose ps -a
```

### Logs & Debugging

```bash
# View logs (last 50 lines)
docker-compose logs --tail 50

# Follow logs in real-time
docker-compose logs -f

# Logs for specific service
docker-compose logs -f backend

# Build output while running
docker-compose up --build

# Full output (not detached)
docker-compose up
```

### Service Execution

```bash
# Run command in container
docker-compose exec backend bash

# Run Django management command
docker-compose exec backend python manage.py <command>

# Run Python script
docker-compose exec backend python my_script.py

# Access shell with user context
docker-compose exec backend python manage.py shell
```

### Building & Rebuilding

```bash
# Build images
docker-compose build

# Force rebuild (ignore cache)
docker-compose build --no-cache

# Build and start
docker-compose up -d --build

# Build specific service
docker-compose build backend
```

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full cleanup (WARNING: removes unused data)
docker system prune -a
```

---

## Troubleshooting

### Issue: "Connection refused" on localhost:8000

**Solution:** Backend may not be fully started

```bash
# Wait a bit longer
sleep 10

# Check logs
docker-compose logs backend

# If issue persists, restart
docker-compose restart backend
```

### Issue: Database connection errors

**Error:** `could not translate host name "db" to address`

**Solution:**

```bash
# Containers not on same network
docker-compose down
docker-compose up -d

# Verify all containers see each other
docker-compose exec backend ping db
docker-compose exec backend ping redis
```

### Issue: Port already in use (e.g., 5432)

**Error:** `Error response from daemon: Bind for 0.0.0.0:5432 failed`

**Solution:**

```bash
# Stop other PostgreSQL instances
sudo systemctl stop postgresql

# Or use different port in docker-compose.yml:
# ports:
#   - "5433:5432"  # Host:Container
```

### Issue: Disk space full

**Solution:**

```bash
# Clean up Docker resources
docker system prune -a

# Remove old containers
docker container prune -f

# Check disk usage
df -h
```

### Issue: Migrations not applied

**Error:** Database errors on first run

**Solution:**

```bash
# Apply migrations manually
docker-compose exec backend python manage.py migrate

# Create admin user
docker-compose exec backend python manage.py createsuperuser
```

### Issue: HTTPS certificate warning

**Expected behavior:** Browser shows certificate warning for self-signed cert

**Solution:**

```bash
# For testing, click "Advanced" → "Proceed anyway"
# For production, use Let's Encrypt (see CERTIFICATES.md)
```

### View Detailed Error Logs

```bash
# Backend with full traceback
docker-compose logs backend --tail 100

# Database errors
docker-compose logs db --tail 50

# Nginx errors
docker-compose logs nginx --tail 50

# All services with timestamps
docker-compose logs --timestamps
```

---

## Production Considerations

### Before Deploying to Production

```bash
# 1. Update .env with production values
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=<new-secure-key>

# 2. Configure real SSL certificate
# (See nginx/CERTIFICATES.md for Let's Encrypt setup)

# 3. Update ALLOWED_HOSTS in settings.py
ALLOWED_HOSTS=['yourdomain.com', 'www.yourdomain.com']

# 4. Enable security headers
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True

# 5. Use production database credentials
DB_PASSWORD=<strong-password>

# 6. Backup database before deployment
docker-compose exec db pg_dump -U admin helpdesk_db > backup.sql
```

### Production Deployment

```bash
# 1. Pull latest code
git pull

# 2. Build with production settings
docker-compose -f docker-compose.yml build --no-cache

# 3. Update containers
docker-compose up -d

# 4. Run migrations
docker-compose exec backend python manage.py migrate

# 5. Collect static files (if needed)
docker-compose exec backend python manage.py collectstatic --noinput

# 6. Verify health
curl https://yourdomain.com/api/health
```

---

## Common Development Tasks

### Running Tests with Coverage

```bash
docker-compose exec backend bash -c "
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
"
```

### Database Reset (⚠️ Development Only)

```bash
# WARNING: Deletes all data
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### Backup Database

```bash
docker-compose exec db pg_dump -U admin helpdesk_db > backup.sql
```

### Restore Database

```bash
docker-compose exec -T db psql -U admin helpdesk_db < backup.sql
```

### Monitor Resources

```bash
# View real-time container stats
docker stats

# View specific container
docker stats helpdesk_django_app
```

---

## Quick Reference Card

| Task          | Command                                                        |
| ------------- | -------------------------------------------------------------- |
| Start all     | `docker-compose up -d`                                         |
| Stop all      | `docker-compose stop`                                          |
| View logs     | `docker-compose logs -f backend`                               |
| Run migration | `docker-compose exec backend python manage.py migrate`         |
| Create admin  | `docker-compose exec backend python manage.py createsuperuser` |
| Run tests     | `docker-compose exec backend python manage.py test`            |
| Django shell  | `docker-compose exec backend python manage.py shell`           |
| DB shell      | `docker-compose exec db psql -U admin helpdesk_db`             |
| Rebuild       | `docker-compose up -d --build`                                 |
| Clean restart | `docker-compose down -v && docker-compose up -d`               |

---

## Support Resources

- **Django Docs:** https://docs.djangoproject.com/
- **Docker Docs:** https://docs.docker.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Redis Docs:** https://redis.io/documentation
- **Nginx Docs:** https://nginx.org/en/docs/
- **Django Channels:** https://channels.readthedocs.io/

---

## Next Steps

✅ **Frontend Setup:** See `../web/README.md` for Vite development server

✅ **Nginx Configuration:** See `nginx/README.md` for reverse proxy details

✅ **SSL/TLS:** See `nginx/CERTIFICATES.md` for certificate setup

✅ **API Documentation:** See `docs/HelpDesk_API.postman_collection.json` for Postman

✅ **Testing:** See `tests/comprehensive_test.py` for integration tests

---

**Last Updated:** April 20, 2026
**Status:** Production-Ready ✅
