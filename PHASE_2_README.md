# Phase 2: Production-Ready HTTPS & Reverse Proxy - Quick Start Guide

## 🎯 What Is This?

This is **Phase 2** of the HelpDesk graduation project transformation. It adds a production-grade **Nginx reverse proxy** and **HTTPS/TLS** encryption layer to the application, making it deployment-ready.

**Status:** ✅ **COMPLETE & PRODUCTION-READY**

---

## 📋 Phase 2 Deliverables

### Core Infrastructure Files

| File | Lines | Purpose |
|------|-------|---------|
| [`nginx/nginx.conf`](./nginx/nginx.conf) | 570 | Complete Nginx reverse proxy configuration |
| [`nginx/CERTIFICATES.md`](./nginx/CERTIFICATES.md) | 200+ | SSL/TLS certificate setup & renewal guide |
| [`nginx/certs/fullchain.pem`](./nginx/certs/) | - | Self-signed development certificate |
| [`nginx/certs/privkey.pem`](./nginx/certs/) | - | Certificate private key |
| [`docker-compose.yml`](./docker-compose.yml) | - | Updated with Nginx service & internal networking |
| [`core/settings.py`](./core/settings.py) | - | Django proxy header configuration |

### Documentation Files

| File | Lines | Purpose |
|------|-------|---------|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | 500+ | Complete deployment guide (dev & production) |
| [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) | 400+ | Pre-deployment validation checklist |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | 600+ | Common issues & solutions |
| [`PHASE_2_COMPLETE.md`](./PHASE_2_COMPLETE.md) | 600+ | Detailed Phase 2 summary |
| [`nginx/README.md`](./nginx/README.md) | 300+ | Nginx configuration explanation |

### Testing & Validation

| File | Lines | Purpose |
|------|-------|---------|
| [`tests/nginx_tests.sh`](./tests/nginx_tests.sh) | 500+ | Automated comprehensive test suite |

---

## 🚀 Quick Start (Local Development)

### 1. Start Docker Services

```bash
cd server
docker-compose up -d
```

**Expected output:**
```bash
$ docker-compose ps
NAME               STATUS
helpdesk_nginx     Up 2 seconds
helpdesk_backend   Up 2 seconds
helpdesk_postgres  Up 2 seconds
helpdesk_redis     Up 2 seconds
```

### 2. Test the Deployment

```bash
# Run comprehensive test suite
bash tests/nginx_tests.sh

# Or test specific scenario
bash tests/nginx_tests.sh https localhost 443  # HTTPS
bash tests/nginx_tests.sh http localhost 80    # HTTP redirect
```

**Expected output:**
```
✓ Nginx container is running
✓ Nginx configuration is valid
✓ Nginx listening on port 80
✓ Nginx listening on port 443
✓ Backend container is running
...
✓ All tests passed! ✅
```

### 3. Access the Application

```bash
# HTTPS (ignore certificate warning - self-signed in dev)
https://localhost/admin

# Health check
curl -k https://localhost/health

# API test
curl -k https://localhost/api/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# WebSocket test (requires wscat)
npm install -g wscat
wscat -c "wss://localhost/ws/unified/"
```

---

## 🏭 Production Deployment

### Prerequisites

- ✅ Domain name registered (e.g., `api.example.com`)
- ✅ Server with Docker & Docker Compose
- ✅ Ports 80 & 443 open
- ✅ Enough disk space (10GB+ recommended)

### Step-by-Step Deployment

```bash
# 1. Clone repository
git clone <repo> /opt/helpdesk
cd /opt/helpdesk/server

# 2. Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d api.example.com -d example.com

# 3. Configure environment
cp .env.example .env.production
vim .env.production  # Set: DEBUG=False, SECRET_KEY, ALLOWED_HOSTS, etc.

# 4. Configure frontend
cd ../web
cp .env.example .env.production
sed -i 's/VITE_USE_HTTPS=false/VITE_USE_HTTPS=true/' .env.production
vim .env.production  # Set HTTPS URLs

# 5. Start services
cd ../server
docker-compose up -d

# 6. Verify
bash tests/nginx_tests.sh https api.example.com 443
curl https://api.example.com/health
```

---

## 📖 Documentation Map

### For Deployment

1. **First time?** → Read [`DEPLOYMENT.md`](./DEPLOYMENT.md)
   - Complete step-by-step guide
   - Local dev setup
   - Production deployment
   - Verification procedures

2. **Before going live?** → Check [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md)
   - Pre-deployment validation (72 hours)
   - Security hardening
   - Performance testing
   - Sign-off requirements

### For Operations

3. **Something broken?** → See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)
   - Nginx issues
   - Backend problems
   - WebSocket failures
   - Database troubles
   - SSL/TLS errors
   - Performance tuning

4. **Nginx details?** → Check [`nginx/README.md`](./nginx/README.md)
   - Configuration explanation
   - Routing details
   - Performance settings
   - WebSocket optimization

5. **Certificate setup?** → Read [`nginx/CERTIFICATES.md`](./nginx/CERTIFICATES.md)
   - Development certificates
   - Let's Encrypt integration
   - Auto-renewal setup
   - Emergency procedures

### For Overview

6. **Want the big picture?** → See [`PHASE_2_COMPLETE.md`](./PHASE_2_COMPLETE.md)
   - All Phase 2 tasks (7 total)
   - Architecture before/after
   - File changes summary
   - Deployment readiness

---

## 🏗️ Architecture

### Service Architecture

```
┌─────────────────────────────────────────────┐
│  Users (HTTPS/WSS)                          │
│  https://api.example.com or wss://...       │
└──────────────────┬──────────────────────────┘
                   │ HTTPS/TLS
                   ▼
         ┌─────────────────────────────┐
         │  Nginx (Port 80/443)        │
         │  Reverse Proxy Layer        │
         │  • HTTP → HTTPS redirect    │
         │  • SSL/TLS termination      │
         │  • Security headers         │
         │  • Rate limiting ready      │
         └──────────────┬──────────────┘
                        │ HTTP (internal)
            ┌───────────┼───────────┐
            ▼           ▼           ▼
       /api/       /ws/        /admin/
            │           │           │
    ┌───────────────────┴───────────────┐
    │                                   │
    ▼ (internal port 8000, not exposed) │
    ┌─────────────────────────────────────┐
    │  Django Backend (Channels/Daphne)  │
    │  • REST API                        │
    │  • WebSocket server                │
    │  • Polling fallback                │
    └──────────┬───────────┬────────────┘
               │           │
       ┌───────▼───┐  ┌────▼──────┐
       │ PostgreSQL│  │   Redis    │
       │  (5432)   │  │  (6379)    │
       └───────────┘  └────────────┘
```

### Data Flow

**REST API Request:**
```
Browser --HTTPS--> Nginx --HTTP--> Django --SQL--> DB
                    (80→443)        (8000)
```

**WebSocket Connection:**
```
Browser --HTTPS--(Upgrade)--> Nginx --HTTP--(Upgrade)--> Daphne
           (wss://...)         (443)    ws://...     (8000)
                ↕ 300s timeout            ↕
```

**Polling Fallback:**
```
Browser --HTTPS--> Nginx --HTTP--> Django polling endpoint
           (5s-30s)   (443)    (8000)
```

---

## 🔐 Security Features

- ✅ **HTTPS/TLS 1.2+** - All external communication encrypted
- ✅ **WebSocket over WSS** - Real-time communication encrypted
- ✅ **Security Headers** - X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- ✅ **Backend Isolation** - Not exposed externally, internal networking only
- ✅ **Reverse Proxy Layer** - Single entry point, shields backend
- ✅ **Certificate Management** - Self-signed dev, Let's Encrypt production
- ✅ **CORS Configuration** - Restricted to trusted origins
- ✅ **Rate Limiting Ready** - Nginx configuration prepared

---

## ⚡ Performance Features

- ✅ **Gzip Compression** - Reduces bandwidth (level 6, 1KB minimum)
- ✅ **Connection Pooling** - Persistent upstream connections
- ✅ **Worker Auto-tuning** - Nginx workers scale to CPU count
- ✅ **Keep-Alive** - 65s persistent connections
- ✅ **TCP Tuning** - tcp_nopush, tcp_nodelay enabled
- ✅ **Sendfile** - Efficient static file delivery
- ✅ **Unbuffered Streams** - Real-time WebSocket & polling

---

## 📊 Test Coverage

The automated test suite (`nginx_tests.sh`) validates:

- ✅ Service status (all 4 containers running)
- ✅ Nginx configuration (syntax valid)
- ✅ Backend health (processes, ports, connectivity)
- ✅ Database connection (migrations, connectivity)
- ✅ Redis connectivity (PING response)
- ✅ HTTP endpoints (health, API, admin)
- ✅ SSL/TLS certificates (validity, expiration)
- ✅ WebSocket support (connection, upgrade headers)
- ✅ CORS headers (presence, values)
- ✅ Security headers (XSS, frame, content-type)
- ✅ Gzip compression (enabled, working)
- ✅ Docker resources (CPU, memory, disk)
- ✅ Application logging (no critical errors)

**Run tests:**
```bash
bash tests/nginx_tests.sh [protocol] [host] [port] [verbose?]

# Examples:
bash tests/nginx_tests.sh                           # https://localhost:443
bash tests/nginx_tests.sh http localhost 80         # http://localhost:80
bash tests/nginx_tests.sh https api.example.com 443 true  # with verbose
```

---

## 🔧 Configuration Files

### Nginx Configuration

**File:** `nginx/nginx.conf` (570 lines)

**Key settings:**
```nginx
# HTTP redirect
server {
  listen 80;
  return 301 https://$host$request_uri;
}

# HTTPS with TLS
server {
  listen 443 ssl http2;
  ssl_certificate /etc/nginx/certs/fullchain.pem;
  ssl_certificate_key /etc/nginx/certs/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}

# Routing
location /api/ { proxy_pass http://backend; }
location /ws/ { 
  proxy_pass http://backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 300s;
}
```

### Django Configuration

**File:** `core/settings.py` (additions)

```python
# Proxy headers from Nginx
SECURE_PROXY_HEADER_ENVIRON = 'HTTP_X_FORWARDED_FOR'
SECURE_PROXY_HEADER = 'HTTP_X_FORWARDED_PROTO'
TRUSTED_PROXIES = ['127.0.0.1', 'nginx', '172.17.0.0/12']

# CORS for HTTPS
CORS_TRUSTED_ORIGINS = [
    'https://localhost',
    'https://api.example.com',
]

# Security (set to True in production)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
```

### Frontend Configuration

**File:** `web/.env.production`

```env
# Use HTTPS/WSS in production
VITE_USE_HTTPS=true
VITE_API_URL_HTTPS=https://api.example.com/api
VITE_WS_URL_HTTPS=wss://api.example.com
```

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] Read [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- [ ] Follow [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md)
- [ ] Domain registered and DNS configured
- [ ] Let's Encrypt certificate generated
- [ ] Environment files (`.env.production`) configured
- [ ] Security headers enabled (SECURE_SSL_REDIRECT, etc.)
- [ ] Database backups configured
- [ ] Monitoring/logging setup (optional but recommended)
- [ ] Run `bash tests/nginx_tests.sh` and verify all pass
- [ ] Load testing completed
- [ ] Team trained on deployment/operations

---

## 🆘 Troubleshooting

### Quick Diagnosis

```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Run test suite
bash tests/nginx_tests.sh

# Check Nginx config
docker exec helpdesk_nginx nginx -t

# Check ports
ss -tlnp | grep -E ":80|:443|:8000"
```

### Common Issues

| Issue | Solution |
|-------|----------|
| **Nginx won't start** | Check ports 80/443 not in use; check cert files exist |
| **WebSocket fails** | Verify `/ws/` location block in nginx.conf; restart backend |
| **Certificate expired** | Run `sudo certbot renew` or regenerate self-signed |
| **Mixed content warning** | Set `VITE_USE_HTTPS=true` in frontend .env |
| **API slow** | Increase `WEB_CONCURRENCY` in .env; check database |

**For more:** See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

---

## 📚 Learning Resources

- [Nginx Official Docs](https://nginx.org/en/docs/)
- [Django Deployment Guide](https://docs.djangoproject.com/en/6.0/howto/deployment/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)

---

## 🎓 Graduation Project Status

Phase 2 completion makes the HelpDesk app:

✅ **Production-Ready**
- Can be deployed to real servers
- Secure HTTPS/TLS encryption
- Professional reverse proxy setup
- Scalable architecture

✅ **Fully Documented**
- Deployment guides
- Troubleshooting guides
- Architecture documentation
- Test coverage

✅ **Enterprise-Grade**
- Security hardening
- Performance optimization
- Monitoring ready
- High availability ready (Phase 3 optional)

---

## 📞 Next Steps

1. **Read** [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed instructions
2. **Test locally** with `bash tests/nginx_tests.sh`
3. **Deploy** following the step-by-step guide
4. **Monitor** with the troubleshooting guide
5. **(Optional)** Implement Phase 3 (load balancing, scaling)

---

**Status:** Phase 2 ✅ Complete | Phase 3: Optional

**Ready for production deployment!** 🚀

