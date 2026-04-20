# Troubleshooting Guide

This guide helps diagnose and resolve common issues with the HelpDesk application deployment.

## Table of Contents

1. [General Diagnostics](#general-diagnostics)
2. [Nginx Issues](#nginx-issues)
3. [Backend/Django Issues](#backenddjango-issues)
4. [WebSocket Issues](#websocket-issues)
5. [Database Issues](#database-issues)
6. [SSL/TLS Issues](#ssltls-issues)
7. [Performance Issues](#performance-issues)
8. [Docker Issues](#docker-issues)

---

## General Diagnostics

### Check All Services Status

```bash
# List all running containers
docker-compose ps

# Expected output:
# NAME               STATUS
# helpdesk_nginx     Up 2 hours
# helpdesk_backend   Up 2 hours
# helpdesk_postgres  Up 2 hours
# helpdesk_redis     Up 2 hours
```

**Issue:** One or more services not running

```bash
# Restart all services
docker-compose restart

# Or start them
docker-compose up -d

# Check detailed logs
docker-compose logs <service-name>
```

### System Resource Check

```bash
# Check Docker container resources
docker stats --no-stream

# Check server disk usage
df -h

# Check server memory
free -h

# Check server CPU
top -bn1 | head -20
```

**Issue:** Low disk space (> 80% used)

```bash
# Free up Docker resources
docker system prune -a  # WARNING: Removes unused images
docker volume prune      # WARNING: Removes unused volumes

# Check log file sizes
du -h /var/log/
# Consider rotating logs
```

### Network Connectivity

```bash
# Check port availability
netstat -tlnp | grep -E ":80|:443|:8000"
# or with ss (newer systems)
ss -tlnp | grep -E ":80|:443|:8000"

# Expected output should show:
# Port 80:   nginx listening
# Port 443:  nginx listening
# Port 8000: Only internal (docker network)
```

**Issue:** Ports already in use

```bash
# Find process using port
lsof -i :80    # or :443 or :8000

# Kill the process (if needed)
kill -9 <PID>

# Or change port in docker-compose.yml
```

---

## Nginx Issues

### Nginx Container Not Starting

**Symptoms:** `docker-compose up` shows `helpdesk_nginx` exited

**Diagnosis:**

```bash
# Check Nginx logs
docker-compose logs nginx

# Common errors:
# "bind() to 0.0.0.0:80 failed (98: Address already in use)"
# "cannot open "/etc/nginx/certs/fullchain.pem": No such file or directory"
# "[emerg] unknown directive" - syntax error
```

**Solutions:**

1. **Port already in use:**
   ```bash
   # Find and kill process
   sudo lsof -i :80
   sudo kill -9 <PID>
   
   # Or change port in docker-compose.yml
   ports:
     - "8080:80"   # Change external port
   ```

2. **Certificate file not found:**
   ```bash
   # Check certificate existence
   ls -la /home/essam/graduation_project/server/nginx/certs/
   
   # If missing, generate self-signed cert
   cd server/nginx/certs
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout privkey.pem \
     -out fullchain.pem \
     -subj "/CN=localhost"
   ```

3. **Nginx config syntax error:**
   ```bash
   # Validate config inside container
   docker-compose exec nginx nginx -t
   
   # Or before starting
   docker-compose config  # Validates docker-compose.yml
   
   # Check specific config file
   docker run --rm -v $(pwd)/server/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
     nginx nginx -t
   ```

### Nginx Configuration Errors

**Symptom:** `nginx -t` shows errors

```bash
# Full validation output
docker-compose exec nginx nginx -t

# Example error: "[emerg] invalid number of arguments in "upstream" directive"
```

**Common fixes:**

1. **Upstream block syntax:**
   ```nginx
   # WRONG:
   upstream backend {
     server backend:8000;
   }
   
   # RIGHT:
   upstream backend {
     server backend:8000;
   }
   ```

2. **Location block regex:**
   ```nginx
   # WRONG:
   location ^~ /api/ {  # Missing ~ or ~*
   
   # RIGHT:
   location ~ /api/ {    # Regex match
   location /api/        # Exact prefix match
   ```

### High CPU/Memory Usage

**Symptoms:** Nginx consuming excessive resources

```bash
docker stats nginx

# If CPU > 100% or memory > 500MB
```

**Diagnosis:**

```bash
# Check number of workers
docker exec nginx ps aux | grep nginx

# Check error logs for issues
docker-compose logs nginx | grep error
```

**Solutions:**

1. **Reduce worker processes:**
   ```nginx
   # In nginx.conf
   worker_processes 2;  # Instead of auto
   ```

2. **Reduce worker connections:**
   ```nginx
   events {
     worker_connections 5000;  # Reduced from 10000
   }
   ```

3. **Enable rate limiting:**
   ```nginx
   limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;
   
   location / {
     limit_req zone=general burst=200;
     proxy_pass http://backend;
   }
   ```

---

## Backend/Django Issues

### Backend Container Crashes on Startup

**Symptoms:** `docker-compose logs backend` shows errors

**Common causes:**

1. **Database migration failed:**
   ```bash
   # Check logs
   docker-compose logs backend | grep -i "migration\|error\|failed"
   
   # Fix: Run migrations manually
   docker-compose exec backend python manage.py migrate --verbosity 2
   
   # Rollback if needed
   docker-compose exec backend python manage.py migrate <app> <number>
   ```

2. **Environment variables missing:**
   ```bash
   # Check .env file exists and is readable
   ls -la server/.env
   
   # Check specific variables
   docker-compose config | grep -A 20 "backend:"
   
   # Add missing variables to .env
   ```

3. **Secret key issues:**
   ```bash
   # Regenerate secret key
   python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   
   # Update in .env
   SECRET_KEY=<generated-key>
   ```

### Backend Responding Slowly

**Symptoms:** API requests taking > 2 seconds

**Diagnosis:**

```bash
# Check backend logs for slow requests
docker-compose logs backend | grep "duration\|slow"

# Monitor real-time
docker-compose logs -f backend

# Check container resources
docker stats backend
```

**Solutions:**

1. **Increase Gunicorn workers:**
   ```bash
   # In .env file
   WEB_CONCURRENCY=8  # Increase from default 4
   
   # Restart
   docker-compose restart backend
   ```

2. **Enable query logging:**
   ```python
   # In settings.py
   LOGGING = {
       'version': 1,
       'disable_existing_loggers': False,
       'handlers': {
           'console': {
               'class': 'logging.StreamHandler',
           },
       },
       'loggers': {
           'django.db.backends': {
               'handlers': ['console'],
               'level': 'DEBUG',
           },
       },
   }
   ```

3. **Check database performance:**
   ```bash
   # Connect to database
   docker-compose exec postgres psql -U postgres -d helpdesk
   
   # Find slow queries
   SELECT query, calls, total_time, mean_time 
   FROM pg_stat_statements 
   ORDER BY total_time DESC LIMIT 10;
   ```

### Import/Syntax Errors

**Symptom:** `ModuleNotFoundError` or `SyntaxError` in logs

```bash
# Check specific import error
docker-compose logs backend | grep -i "modulenotfound\|import\|syntax"

# Verify Python files syntax
docker-compose exec backend python -m py_compile /app/core/settings.py
```

**Solutions:**

1. **Missing package:**
   ```bash
   # Add to requirements.txt and rebuild
   echo "package-name==1.0.0" >> server/requirements.txt
   docker-compose build backend
   docker-compose up -d backend
   ```

2. **File path not in PYTHONPATH:**
   ```bash
   # Check file exists
   docker-compose exec backend ls -la /app/path/to/file.py
   ```

---

## WebSocket Issues

### WebSocket Connection Refused

**Symptoms:** Browser shows "WebSocket connection failed"

**Diagnosis:**

```bash
# Check if Nginx is routing WebSocket
docker exec nginx grep "Upgrade" /etc/nginx/nginx.conf

# Test WebSocket endpoint directly through Nginx
wscat -c "ws://localhost/ws/unified/"

# Test WebSocket directly to backend (bypassing Nginx)
wscat -c "ws://localhost:8000/ws/unified/"
```

**Common causes:**

1. **Nginx routing not configured:**
   ```bash
   # Check websocket location block exists in nginx.conf
   docker exec nginx grep -A 10 "location /ws/"
   
   # Should contain:
   # proxy_http_version 1.1;
   # proxy_set_header Upgrade $http_upgrade;
   # proxy_set_header Connection "upgrade";
   ```

2. **Backend not listening on WebSocket:**
   ```bash
   # Check Daphne process
   docker-compose exec backend ps aux | grep daphne
   
   # If not running, restart
   docker-compose restart backend
   ```

3. **Firewall blocking WebSocket:**
   ```bash
   # On server, check firewall for port 80/443
   sudo ufw status
   
   # Allow if needed
   sudo ufw allow 80
   sudo ufw allow 443
   ```

### WebSocket Timeout

**Symptoms:** WebSocket disconnects after some time

**Diagnosis:**

```bash
# Check Nginx timeout settings
docker exec nginx grep "proxy_read_timeout\|proxy_send_timeout" \
  /etc/nginx/nginx.conf

# For WebSocket, should be >= 300s
```

**Solution:** Update Nginx config:

```nginx
location /ws/ {
  proxy_pass http://backend;
  
  # Increase timeouts for long-lived WebSocket connections
  proxy_read_timeout 300s;
  proxy_send_timeout 300s;
  
  # WebSocket headers
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

### WebSocket Authentication Failed

**Symptoms:** WebSocket connects but immediately disconnects

**Diagnosis:**

```bash
# Check backend WebSocket handler
docker-compose logs backend | grep -i "websocket\|auth\|token"

# Test with explicit token
wscat -c "ws://localhost/ws/unified/?token=YOUR_JWT_TOKEN"
```

**Solutions:**

1. **Generate valid JWT token:**
   ```bash
   # Via API
   curl -X POST http://localhost/api/login/ \
     -H "Content-Type: application/json" \
     -d '{"username":"user","password":"pass"}'
   
   # Use returned token
   ```

2. **Check token format in WebSocket:**
   ```javascript
   // Frontend code should send token properly
   const ws = new WebSocket('wss://localhost/ws/unified/');
   
   ws.onopen = () => {
     ws.send(JSON.stringify({
       type: 'authenticate',
       token: 'your-jwt-token'
     }));
   };
   ```

### Polling Fallback Not Working

**Symptoms:** WebSocket falls back to polling but no messages received

**Diagnosis:**

```bash
# Check if polling endpoint exists
curl -v http://localhost/api/message_queue/receive/

# Check backend logs for polling requests
docker-compose logs backend | grep "message_queue\|receive"
```

**Solutions:**

1. **Enable polling in frontend .env:**
   ```env
   VITE_POLLING_FALLBACK_ENABLED=true
   VITE_POLLING_INTERVAL=5000
   ```

2. **Check polling hook implementation:**
   ```bash
   # Verify usePollingFallback.ts exists
   ls -la web/src/hooks/usePollingFallback.ts
   ```

---

## Database Issues

### Database Connection Failed

**Symptoms:** Backend logs show "could not connect to server"

**Diagnosis:**

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1;"

# Check connection string
docker-compose config | grep DATABASE_URL
```

**Solutions:**

1. **Database crashed:**
   ```bash
   # Restart database
   docker-compose restart postgres
   
   # Wait for startup (may take 10-30 seconds)
   sleep 15
   docker-compose ps postgres
   ```

2. **Wrong credentials:**
   ```bash
   # Check .env file
   cat server/.env | grep DATABASE
   
   # Should match docker-compose environment variables
   # POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
   ```

3. **Database volume corrupted:**
   ```bash
   # WARNING: This deletes all data
   docker-compose down -v
   docker-compose up -d postgres
   
   # Reinitialize database
   docker-compose exec backend python manage.py migrate
   ```

### Database Slow Queries

**Symptoms:** Queries taking > 1 second

**Diagnosis:**

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d helpdesk

# Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
SELECT pg_reload_conf();

# View logs
SHOW log_min_duration_statement;
```

**Solutions:**

1. **Add database indexes:**
   ```sql
   -- For frequently filtered fields
   CREATE INDEX idx_ticket_status ON tickets(status);
   CREATE INDEX idx_ticket_user ON tickets(user_id);
   CREATE INDEX idx_ticket_created ON tickets(created_at DESC);
   ```

2. **Analyze query plans:**
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM tickets WHERE user_id = 1 ORDER BY created_at DESC;
   ```

### Database Backup Issues

**Symptoms:** Backups failing or taking too long

**Diagnosis:**

```bash
# Check backup script logs (if using automated backup)
ls -la /var/log/postgres-backup*.log

# Manual backup test
docker-compose exec postgres pg_dump -U postgres helpdesk > backup.sql

# Check file size
du -h backup.sql
```

**One-time manual backup:**

```bash
# Export database
docker-compose exec postgres pg_dump -U postgres helpdesk | gzip > helpdesk-$(date +%Y%m%d-%H%M%S).sql.gz

# Restore from backup
gunzip < helpdesk-20240101-120000.sql.gz | \
  docker-compose exec -T postgres psql -U postgres
```

---

## SSL/TLS Issues

### Certificate Not Found

**Symptoms:** Nginx shows "cannot open certificate file"

**Diagnosis:**

```bash
# Check certificate files exist
ls -la server/nginx/certs/

# Check Docker volume mount
docker inspect helpdesk_nginx | grep -A 5 "Mounts"
```

**Solutions:**

1. **Generate self-signed certificate (development):**
   ```bash
   cd server/nginx/certs
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout privkey.pem \
     -out fullchain.pem \
     -subj "/CN=localhost"
   ```

2. **For production with Let's Encrypt:**
   ```bash
   # Generate certificate
   sudo certbot certonly --standalone \
     -d api.example.com \
     --agree-tos \
     --email admin@example.com
   
   # Create symlink
   sudo ln -sf /etc/letsencrypt/live/api.example.com/fullchain.pem \
     server/nginx/certs/fullchain.pem
   ```

### Certificate Expired

**Symptoms:** Browser shows "Certificate has expired" warning

**Diagnosis:**

```bash
# Check certificate expiry
openssl x509 -in server/nginx/certs/fullchain.pem -noout -enddate

# Example output: notAfter=Jan 20 12:34:56 2024 GMT
```

**Solutions:**

1. **For Let's Encrypt (production):**
   ```bash
   # Renew certificate
   sudo certbot renew --force-renewal -v
   
   # Reload Nginx
   docker exec helpdesk_nginx nginx -s reload
   ```

2. **For self-signed (development):**
   ```bash
   # Regenerate
   cd server/nginx/certs
   rm fullchain.pem privkey.pem
   
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout privkey.pem \
     -out fullchain.pem \
     -subj "/CN=localhost"
   
   # Reload Nginx
   docker-compose down
   docker-compose up -d nginx
   ```

### HTTPS/WSS Not Working

**Symptoms:** `https://` and `wss://` connections fail, but `http://` and `ws://` work

**Diagnosis:**

```bash
# Check HTTPS connectivity
curl -v --insecure https://localhost/

# Check WSS connectivity
openssl s_client -connect localhost:443
```

**Solutions:**

1. **Update Nginx HTTPS configuration:**
   ```bash
   # Restart Nginx
   docker-compose restart nginx
   
   # Check logs
   docker-compose logs nginx
   ```

2. **Update frontend environment:**
   ```env
   # web/.env
   VITE_USE_HTTPS=true
   VITE_API_URL_HTTPS=https://api.example.com/api
   VITE_WS_URL_HTTPS=wss://api.example.com
   ```

3. **Clear browser cache:**
   - DevTools (F12) → Storage → Clear Site Data
   - Reload page (Ctrl+F5)

### Mixed Content Warning

**Symptoms:** Browser console shows "Mixed content: page is HTTPS but resource is HTTP"

**Diagnosis:**

```bash
# Check frontend environment
cat web/.env.production | grep VITE

# Should have:
# VITE_USE_HTTPS=true
# VITE_API_URL_HTTPS=https://...
```

**Solutions:**

1. **Ensure all resources use HTTPS:**
   ```env
   VITE_USE_HTTPS=true
   VITE_API_URL_HTTPS=https://api.example.com/api
   VITE_WS_URL_HTTPS=wss://api.example.com
   ```

2. **Rebuild frontend:**
   ```bash
   cd web
   npm run build
   # Output goes to dist/
   ```

---

## Performance Issues

### High Response Times (> 2 seconds)

**Diagnosis:**

```bash
# Monitor response times
docker-compose logs backend | grep "duration\|time"

# Check server resources
docker stats

# Profile slow requests
curl -w "Time: %{time_total}s\n" -o /dev/null https://localhost/api/tickets/
```

**Solutions:**

1. **Database indexes:**
   ```sql
   CREATE INDEX idx_fast_queries ON tickets(status, user_id);
   ```

2. **Increase Gunicorn workers:**
   ```env
   WEB_CONCURRENCY=8
   ```

3. **Enable caching:**
   ```python
   # In settings.py
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': 'redis://redis:6379/1',
       }
   }
   ```

### High Memory Usage

**Symptoms:** `docker stats` shows memory > 500MB

**Diagnosis:**

```bash
docker stats  # Check which container

# For Django backend
docker-compose logs backend | grep "memory\|MemoryError"
```

**Solutions:**

1. **Reduce gunicorn worker threads:**
   ```env
   WEB_CONCURRENCY=4  # Reduce from 8
   ```

2. **Check for memory leaks:**
   ```bash
   # Monitor over time
   for i in {1..10}; do
     docker stats --no-stream backend
     sleep 60
   done
   ```

3. **Reduce Django cache timeout:**
   ```python
   CACHES = {
       'default': {
           'TIMEOUT': 300,  # 5 minutes instead of default 300 seconds
       }
   }
   ```

### Disk Space Full

**Symptoms:** Services crash, Docker won't start

**Diagnosis:**

```bash
df -h  # Check usage

# Find large files
du -sh /var/lib/docker/*
du -sh /var/log/*
```

**Solutions:**

```bash
# Clean up Docker resources
docker system prune -a

# Clean up logs
docker exec helpdesk_backend truncate -s 0 /var/log/nginx/access.log

# Remove old backups
find server/backups -mtime +30 -delete
```

---

## Docker Issues

### Cannot Connect to Docker Daemon

**Symptom:** "Cannot connect to Docker daemon"

**Solution:**

```bash
# Start Docker daemon
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker  # Apply group changes without logout

# Or use sudo
sudo docker-compose up -d
```

### Containers Keep Restarting

**Diagnosis:**

```bash
# Check restart policy
docker-compose config | grep restart_policy

# Check logs
docker-compose logs <service-name>
```

**Solutions:**

1. **Remove restart policy temporarily:**
   ```yaml
   # In docker-compose.yml
   backend:
     restart_policy:
       condition: none  # Disable auto-restart
   ```

2. **Check application logs:**
   ```bash
   docker-compose logs backend --tail 100
   ```

### Out of Disk Space in Docker

**Solution:**

```bash
# See where space is used
docker system df

# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Complete cleanup (WARNING: removes everything!)
docker system prune -a --volumes
```

---

## Quick Reference Commands

```bash
# System Health Check
docker-compose ps
docker stats --no-stream
df -h
free -h

# View Logs
docker-compose logs nginx      # Nginx
docker-compose logs backend    # Django
docker-compose logs postgres   # Database
docker-compose logs -f         # Follow all

# Restart Services
docker-compose restart
docker-compose restart nginx
docker-compose restart backend

# Database Operations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec postgres psql -U postgres -d helpdesk

# Testing
bash server/tests/nginx_tests.sh           # Run full test suite
curl https://localhost/health -k           # Health check
wscat -c "wss://localhost/ws/unified/"    # WebSocket test

# Debugging
docker-compose config  # Validate compose file
docker exec helpdesk_nginx nginx -t        # Validate Nginx config
docker logs <container-id> --tail 50       # Last 50 lines
```

---

## Getting Help

1. **Check logs first:** `docker-compose logs <service>`
2. **Validate configs:** `docker-compose config` and `nginx -t`
3. **Restart services:** `docker-compose restart`
4. **Read error messages carefully** - they usually point to the issue
5. **Check resource usage:** `docker stats`
6. **Search documentation:** [Docker Docs](https://docs.docker.com/), [Nginx Docs](https://nginx.org/en/docs/), [Django Docs](https://docs.djangoproject.com/)

