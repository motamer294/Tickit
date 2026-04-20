# HelpDesk Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment](#production-deployment)
6. [Verification & Testing](#verification--testing)
7. [Production Checklist](#production-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying the HelpDesk application using:

- **Docker Compose** for container orchestration
- **Nginx** as a reverse proxy (HTTP/HTTPS gateway)
- **Django + Channels** for backend (WebSocket + REST API)
- **PostgreSQL** for database
- **Redis** for caching and real-time messaging

### Architecture

```
┌─────────────────────────────────────────────┐
│  Users (Browser/Mobile)                     │
│  https://api.example.com (Production)       │
│  or http://localhost (Development)          │
└──────────────────┬──────────────────────────┘
                   │ HTTPS/WSS
                   ▼
         ┌─────────────────────┐
         │     Nginx (80/443)  │
         │   Reverse Proxy     │
         └──────────┬──────────┘
                    │ HTTP
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    /api/      /ws/        /admin/
       │            │            │
       └────────────┼────────────┘
                    │ Internal (8000)
                    ▼
         ┌──────────────────────┐
         │    Django Backend    │
         │  (Daphne on 8000)    │
         └──────────┬───────────┘
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   PostgreSQL   Redis      ML Service
     (5432)     (6379)      (8001)
```

---

## Prerequisites

### For Local Development

- **Docker & Docker Compose** (v20.10+)
- **Git** (for version control)
- **Node.js** (v18+, for frontend build)
- **Python 3.10+** (optional, for local testing)

### For Production

- **Linux Server** (Ubuntu 20.04+ recommended)
- **Docker & Docker Compose**
- **Domain name** (e.g., api.example.com)
- **DNS configuration** pointing to your server
- **Open ports**: 80 (HTTP), 443 (HTTPS)
- **Let's Encrypt access** (for SSL certificate generation)
- **Minimum resources**: 2GB RAM, 1 vCPU, 10GB storage

### Installation

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd graduation_project
```

### 2. Backend Setup

```bash
cd server

# Create .env file from template
cp .env.example .env

# Configure environment variables (optional for dev)
# vim .env

# Ensure certificates exist (already generated)
ls nginx/certs/fullchain.pem nginx/certs/privkey.pem
```

### 3. Frontend Setup

```bash
cd ../web

# Create .env file from template
cp .env.example .env.local

# Development environment - HTTPS disabled
# vim .env.local
# VITE_USE_HTTPS=false
```

### 4. Start Docker Compose

```bash
cd ../server

# Start all services
docker-compose up -d

# Watch logs (in separate terminal)
docker-compose logs -f

# Services available at:
# - HTTP:       http://localhost or http://127.0.0.1
# - HTTPS:      https://localhost (self-signed cert warning expected)
# - API:        http://localhost/api/ or https://localhost/api/
# - WebSocket:  ws://localhost/ws/ or wss://localhost/ws/
# - Admin:      http://localhost/admin or https://localhost/admin
```

### 5. Frontend Development Server (Optional)

In a separate terminal:

```bash
cd web

# Install dependencies
npm install

# Start Vite dev server
npm run dev

# App runs at http://localhost:5173
# API calls proxy to Nginx at http://localhost:8000/api
# WebSocket connects to ws://localhost:8000/ws/
```

### 6. Test the Setup

```bash
# Health check (before certificate warning)
curl -k https://localhost/health
# Response: "healthy\n"

# API test (with certificate ignore)
curl -k https://localhost/api/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# WebSocket test (with wscat)
npm install -g wscat
wscat -c "wss://localhost/ws/unified/" --no-check
# or for HTTP
wscat -c "ws://localhost/ws/unified/"
```

### 7. Stop Services

```bash
cd server

# Stop all containers
docker-compose down

# Remove volumes (careful - deletes database!)
docker-compose down -v
```

---

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Create application directory
sudo mkdir -p /opt/helpdesk
cd /opt/helpdesk

# Clone repository
sudo git clone <repository-url> .

# Set permissions
sudo chown -R $USER:$USER .
```

### 2. SSL Certificate Setup

```bash
cd /opt/helpdesk/server

# Generate Let's Encrypt certificate (requires open port 80/443)
sudo certbot certonly --standalone \
  -d api.example.com \
  -d example.com \
  --agree-tos \
  --email admin@example.com

# Create symlink for Docker access
sudo mkdir -p /opt/helpdesk/server/nginx/certs
sudo ln -sf /etc/letsencrypt/live/api.example.com/fullchain.pem \
  nginx/certs/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/api.example.com/privkey.pem \
  nginx/certs/privkey.pem

# Allow Docker to read certificates
sudo chown -R 101:101 /etc/letsencrypt/
```

### 3. Environment Configuration

```bash
cd /opt/helpdesk/server

# Create production .env file
cp .env.example .env.production

# Edit configuration
sudo vim .env.production

# Key settings for production:
DEBUG=False
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
ALLOWED_HOSTS=api.example.com,example.com
ENVIRONMENT=production
SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
API_BASE_URL=https://api.example.com
```

### 4. Nginx SSL Configuration

Update `server/docker-compose.yml`:

```yaml
nginx:
  environment:
    - NGINX_CERT_PATH=/etc/letsencrypt/live/api.example.com/fullchain.pem
    - NGINX_KEY_PATH=/etc/letsencrypt/live/api.example.com/privkey.pem
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro # Let's Encrypt certs
    - /opt/helpdesk/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

### 5. Frontend HTTPS Configuration

Create `web/.env.production`:

```env
VITE_USE_HTTPS=true
VITE_API_URL_HTTPS=https://api.example.com/api
VITE_WS_URL_HTTPS=wss://api.example.com
VITE_API_HOST=api.example.com
VITE_API_PORT=443
```

### 6. Start Production Services

```bash
cd /opt/helpdesk/server

# Use production env file
export ENV_FILE=.env.production

# Start services
docker-compose --env-file $ENV_FILE up -d

# Watch logs
docker-compose logs -f nginx backend

# Verify services
docker-compose ps
```

### 7. Setup Auto-Renewal (Let's Encrypt)

```bash
# Create renewal script
sudo cat > /usr/local/bin/renew-certs.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
docker exec helpdesk_nginx nginx -s reload
EOF

sudo chmod +x /usr/local/bin/renew-certs.sh

# Add to crontab (runs daily)
sudo crontab -e
# Add: 0 3 * * * /usr/local/bin/renew-certs.sh
```

---

## Verification & Testing

### Health Checks

```bash
# HTTPS Health Check
curl -k https://api.example.com/health
# Expected: "healthy\n"

# API Test (Login)
curl -X POST https://api.example.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
# Expected: JWT tokens in response

# WebSocket Test
wscat -c "wss://api.example.com/ws/unified/"
# Expected: Connection established
```

### Browser Testing

1. **Open** https://api.example.com/admin
   - Expected: Django admin panel
   - Check: Green lock icon (valid SSL certificate)

2. **Navigate** to frontend UI
   - Expected: HelpDesk application loads
   - Check: Console shows no HTTPS/CORS warnings
   - Check: WebSocket connects (DevTools → Network → WS)

3. **Test WebSocket**
   - Create a new ticket
   - Expected: Instant notification update (no page refresh needed)
   - Check: WebSocket connection active (DevTools → Network → WS)

4. **Test Polling Fallback**
   - Open DevTools → Network
   - Disconnect WebSocket: `chrome://net-internals/#sockets` → Close socket
   - Create another ticket
   - Expected: Still receive notification (via polling)
   - Check: GET /api/message_queue/receive in Network tab

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API endpoint
ab -n 1000 -c 100 https://api.example.com/api/tickets/

# Test WebSocket with artillery
npm install -g artillery
cat > websocket-load-test.yml << EOF
config:
  target: wss://api.example.com
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: WebSocket Load Test
    flow:
      - ws.send: '{"type": "authenticate", "token": "YOUR_TOKEN"}'
      - think: 5
EOF

artillery run websocket-load-test.yml
```

---

## Production Checklist

Before going live:

- [ ] Domain registered and DNS configured
- [ ] Domain resolves publicly: `nslookup api.example.com`
- [ ] SSL certificate generated and validated: `sudo certbot certificates`
- [ ] Certificate permissions set: `sudo chown -R 101:101 /etc/letsencrypt/`
- [ ] .env.production created with all production values
- [ ] DEBUG=False in production env
- [ ] SECRET_KEY is unique and strong
- [ ] ALLOWED_HOSTS includes your domain
- [ ] Database backups configured
- [ ] Docker services running: `docker-compose ps`
- [ ] All 4 services healthy (nginx, backend, db, redis)
- [ ] HTTPS works: `curl -I https://api.example.com`
- [ ] WebSocket connects: `wscat -c "wss://api.example.com/ws/unified/"`
- [ ] Polling fallback works (test by disconnecting WebSocket)
- [ ] Certificate renewal scheduled (crontab)
- [ ] Logs monitored: `docker-compose logs -f`
- [ ] Firewall configured (80, 443 open; others closed)
- [ ] Email notifications sent and received
- [ ] Database backups verified
- [ ] Disaster recovery plan documented

---

## Troubleshooting

### Nginx Not Starting

```bash
# Check logs
docker-compose logs nginx

# Validate config
docker exec helpdesk_nginx nginx -t

# Possible issues:
# - Certificates not found: Check NGINX_CERT_PATH, NGINX_KEY_PATH
# - Port already in use: sudo lsof -i :80 or :443
# - Config syntax error: Check nginx/nginx.conf
```

### WebSocket Connection Failed

```bash
# Check backend logs
docker-compose logs backend

# Verify connection path
wscat -c "ws://localhost:8000/ws/unified/" (direct)
wscat -c "ws://localhost/ws/unified/" (through Nginx)

# Possible issues:
# - Backend not running: docker-compose restart backend
# - Nginx not routing: Check /ws/ location block in nginx.conf
# - Token expired: Authenticate first
```

### Certificate Issues

```bash
# Certificate expiry
openssl x509 -in /etc/letsencrypt/live/api.example.com/fullchain.pem -noout -enddate

# Check why renewal failed
sudo certbot renew --dry-run -v

# Manual renewal
sudo certbot renew --force-renewal

# Reload Nginx
docker exec helpdesk_nginx nginx -s reload
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check Nginx workers
docker exec helpdesk_nginx ps aux | grep nginx

# Increase Gunicorn workers (in .env)
WEB_CONCURRENCY=8

# Increase Redis memory (if needed)
docker exec helpdesk_redis redis-cli CONFIG GET maxmemory
```

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Manual](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt / Certbot](https://certbot.eff.org/)
- [Django Deployment](https://docs.djangoproject.com/en/6.0/howto/deployment/)
- [Django Channels](https://channels.readthedocs.io/)
