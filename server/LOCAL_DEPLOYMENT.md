# Local Deployment with Docker

Complete step-by-step guide to deploy the HelpDesk application locally using Docker. This follows production practices but runs on your local machine.

---

## 🚀 Quick Start (10 minutes)

### Step 1: Navigate to Server Directory

```bash
cd /home/essam/graduation_project/server
```

### Step 2: Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit for local deployment (optional)
nano .env
```

**Recommended .env for Local Deployment:**

```bash
# Django Settings
SECRET_KEY=django-insecure-test-key-change-in-production
DEBUG=False
ENVIRONMENT=local

# Database
DB_ENGINE=django.db.backends.postgresql
DB_HOST=db
DB_NAME=helpdesk_db
DB_USER=admin
DB_PASSWORD=password123
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# WebSocket
WEBSOCKET_PORT=8000
CHANNEL_CAPACITY=5000
CHANNEL_EXPIRY=300

# Security (local)
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
```

### Step 3: Deploy with Docker

```bash
# Build and start all services
docker-compose up -d --build

# Wait for services to initialize (30 seconds)
sleep 30

# Verify all services running
docker-compose ps
```

### Step 4: Initialize Database

```bash
# Apply migrations
docker-compose exec backend python manage.py migrate

# Create admin user
docker-compose exec backend python manage.py createsuperuser \
  --username admin \
  --email admin@example.com \
  --noinput

# Set admin password
docker-compose exec backend python manage.py shell -c \
  "from django.contrib.auth import get_user_model; \
   User = get_user_model(); \
   u = User.objects.get(username='admin'); \
   u.set_password('admin123'); \
   u.save(); \
   print('✅ Admin created: admin / admin123')"
```

### Step 5: Verify Deployment

```bash
# Test backend health
curl -k https://localhost/api/health

# Expected output: {"status":"ok"}

# Test frontend (if running)
# Open browser: https://localhost
# (Accept certificate warning if prompted)
```

### ✅ Deployment Complete!

Access points:

- **Frontend:** https://localhost
- **API:** https://localhost/api
- **Admin Panel:** https://localhost/admin
- **WebSocket:** wss://localhost/ws

---

## 📋 Deployment Checklist

- [ ] Docker & Docker Compose installed
- [ ] .env file configured
- [ ] Services started: `docker-compose ps` shows all "Up"
- [ ] Database initialized: migrations applied
- [ ] Admin user created and working
- [ ] Frontend environment configured (.env.local)
- [ ] HTTPS certificate accepted in browser
- [ ] Can access https://localhost
- [ ] Login works

---

## 🔧 Service Status & Monitoring

### Check All Services

```bash
# Detailed status
docker-compose ps

# Expected output:
# NAME                 SERVICE   STATUS
# helpdesk_nginx       nginx     Up 2 minutes (healthy)
# helpdesk_django_app  backend   Up 2 minutes
# helpdesk_postgres_db db        Up 2 minutes
# helpdesk_redis       redis     Up 2 minutes
```

### Monitor Logs

```bash
# Live logs (all services)
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Each service
docker-compose logs -f nginx
docker-compose logs -f db
docker-compose logs -f redis
```

### Check Container Resource Usage

```bash
# Real-time resource monitoring
docker stats
```

---

## 🌐 Frontend Setup (Parallel)

While backend is running:

### 1. Configure Frontend (.env.local)

```bash
cd ../web

# Create .env.local
cat > .env.local << 'EOF'
# API Configuration
VITE_API_URL=https://localhost/api
VITE_API_PORT=443
VITE_API_TIMEOUT=30000

# WebSocket Configuration
VITE_WS_URL=wss://localhost/ws
VITE_WS_PORT=443
VITE_WS_TIMEOUT=60000

# HTTPS Configuration
VITE_USE_HTTPS=true

# Polling Fallback (if WebSocket fails)
VITE_USE_POLLING=true
VITE_POLLING_INTERVAL=5000

# Development
VITE_DEBUG=true
VITE_DEBUG_WS=true
EOF
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Frontend Dev Server

```bash
npm run dev

# Frontend available at: http://localhost:5173
```

---

## 🐛 Troubleshooting Local Deployment

### Issue: Services Won't Start

```bash
# Check Docker installed
docker --version

# Check Docker daemon running
docker ps

# View detailed errors
docker-compose up  # Remove -d flag to see output
```

### Issue: Database Connection Fails

```bash
# Restart all services
docker-compose down
docker-compose up -d

# Wait longer for database
sleep 5
docker-compose ps

# Verify connectivity
docker-compose exec backend ping db
```

### Issue: Port Already in Use

```bash
# Find process using port
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :80    # HTTP
lsof -i :443   # HTTPS

# Change docker-compose.yml ports (example for PostgreSQL):
# Change: ports: ["5432:5432"]
# To:     ports: ["5433:5432"]
```

### Issue: HTTPS Certificate Warning

**Expected:** Browser shows "Not Secure" warning for self-signed certificate

**Solution:**

- Click "Advanced" → "Proceed anyway" (development mode)
- For production, use CERTIFICATES.md guide for Let's Encrypt

### Issue: Frontend Can't Reach API

```bash
# Verify backend is accessible
curl -k https://localhost/api/login

# Check frontend .env.local
cat web/.env.local

# Verify URLs point to: https://localhost/api
```

### Issue: Migrations Not Applied

```bash
# Apply manually
docker-compose exec backend python manage.py migrate

# Check migration status
docker-compose exec backend python manage.py showmigrations
```

### Database Error in Logs

```bash
# View full backend logs
docker-compose logs backend --tail 100

# If "relation doesn't exist" error:
# → Migrations haven't run yet
# → Run: docker-compose exec backend python manage.py migrate
```

---

## 🔄 Common Operations

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Code & Restart

```bash
# Backend code changes
# (Daphne auto-reloads in development)

# For production-like behavior, restart:
docker-compose restart backend
```

### Database Operations

**Backup:**

```bash
docker-compose exec db pg_dump -U admin helpdesk_db > backup.sql
echo "✅ Backup saved to backup.sql"
```

**Restore:**

```bash
docker-compose exec -T db psql -U admin helpdesk_db < backup.sql
echo "✅ Database restored from backup.sql"
```

**Reset (⚠️ WARNING: Deletes all data):**

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

### Database Shell

```bash
# Access PostgreSQL
docker-compose exec db psql -U admin helpdesk_db

# Common commands:
# \dt                    → List tables
# \d accounts_user       → Show table structure
# SELECT * FROM accounts_user LIMIT 5;  → Query data
# \q                     → Exit
```

### Django Admin Commands

```bash
# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Run tests
docker-compose exec backend python manage.py test

# Check migrations
docker-compose exec backend python manage.py showmigrations

# Django shell
docker-compose exec backend python manage.py shell
```

---

## 📊 Service Details

### Nginx (Reverse Proxy)

- **Port:** 80 (redirects to 443), 443 (HTTPS)
- **Role:** Public-facing, routes to backend
- **Certificate:** Self-signed (see nginx/certs/)
- **Config:** nginx/nginx.conf

### Django Backend

- **Port:** 8000 (internal only, not exposed)
- **Role:** API, WebSocket, Admin panel
- **Server:** Daphne (ASGI)
- **Database:** PostgreSQL

### PostgreSQL Database

- **Port:** 5432
- **Database:** helpdesk_db
- **User:** admin (change password in production!)
- **Data:** Persisted in docker volume

### Redis Cache

- **Port:** 6379
- **Role:** Channel layer, caching
- **Data:** Persisted in docker volume

---

## 🔐 Security Notes for Local Deployment

### ✅ Already Configured

- HTTPS/TLS encryption (self-signed cert)
- Database inside Docker network (not exposed)
- Redis inside Docker network (not exposed)
- Backend inside Docker network (only via Nginx)

### ⚠️ For Production (Not local)

- Replace self-signed cert with Let's Encrypt
- Change all default passwords
- Set `DEBUG=False`
- Use strong `SECRET_KEY`
- Configure proper `ALLOWED_HOSTS`
- Enable `SESSION_COOKIE_SECURE=True`

### 🔒 Local Development Only

Current setup is suitable for:

- Development testing
- Graduation project demo
- Local CI/CD pipeline
- Team testing on local machine

---

## 📈 Scaling Beyond Local

### When Ready for Production

1. **Get Real Domain:** Purchase domain name
2. **SSL Certificate:** Use Let's Encrypt (CERTIFICATES.md)
3. **Environment:** Move to cloud (AWS, DigitalOcean, etc.)
4. **Load Balancing:** Add multiple backend instances
5. **Monitoring:** Setup logging & alerting

See DEPLOYMENT.md for production guide.

---

## 🆘 Support & Debugging

### Enable Debug Mode (Temporary)

```bash
# Update .env
DEBUG=True
ENVIRONMENT=development

# Restart backend
docker-compose restart backend

# View detailed error messages
docker-compose logs backend -f
```

### Get Container Shell

```bash
# Backend bash shell
docker-compose exec backend bash

# Run commands inside container
docker-compose exec backend python manage.py <command>
```

### Container Disk Usage

```bash
# Check Docker disk space
docker system df

# Clean up if needed
docker system prune -a
```

---

## ✅ Verification Tests

Run these to verify everything works:

```bash
# 1. Services running
echo "=== Services Status ===" && docker-compose ps

# 2. Backend health
echo -e "\n=== Backend Health ===" && curl -k https://localhost/api/health

# 3. Database connected
echo -e "\n=== Database Status ===" && \
docker-compose exec db pg_isready -U admin -d helpdesk_db

# 4. Redis connected
echo -e "\n=== Redis Status ===" && \
docker-compose exec redis redis-cli PING

# 5. View Nginx status
echo -e "\n=== Nginx Logs ===" && \
docker-compose logs nginx --tail 5
```

---

## 📞 Quick Reference

| Task          | Command                                                        |
| ------------- | -------------------------------------------------------------- |
| Deploy        | `docker-compose up -d --build`                                 |
| Stop          | `docker-compose stop`                                          |
| Status        | `docker-compose ps`                                            |
| Logs          | `docker-compose logs -f backend`                               |
| Migrate       | `docker-compose exec backend python manage.py migrate`         |
| Create admin  | `docker-compose exec backend python manage.py createsuperuser` |
| Test API      | `curl -k https://localhost/api/health`                         |
| DB shell      | `docker-compose exec db psql -U admin helpdesk_db`             |
| Clean restart | `docker-compose down -v && docker-compose up -d`               |

---

## 🎯 Next Steps

After successful local deployment:

1. ✅ **Test Login Flow**
   - Go to https://localhost
   - Enter credentials: admin / admin123

2. ✅ **Create Test Ticket**
   - Navigate to Dashboard
   - Create new ticket

3. ✅ **Test Real-time Updates**
   - Open admin panel in another window
   - Update ticket → should see real-time update

4. ✅ **Check Admin Panel**
   - https://localhost/admin
   - View users, tickets, logs

5. ✅ **Run Tests**
   - `docker-compose exec backend python manage.py test`

---

**Last Updated:** April 20, 2026
**Version:** 1.0
**Status:** Production-Ready ✅
