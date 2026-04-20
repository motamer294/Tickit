# Production Checklist

Use this checklist before deploying to production to ensure security, performance, and reliability.

---

## Pre-Deployment (72 hours before go-live)

### Infrastructure Setup

- [ ] **Domain Registration**
  - [ ] Domain registered and accessible
  - [ ] Domain registrar configured
  - [ ] DNS records pending setup

- [ ] **Server Provisioning**
  - [ ] Server provisioned (2GB+ RAM, 1+ vCPU)
  - [ ] SSH access verified
  - [ ] Initial security hardening applied (firewall, fail2ban)
  - [ ] Docker & Docker Compose installed
  - [ ] OS fully updated (apt-get update && upgrade)

### SSL/TLS Certificates

- [ ] **Let's Encrypt Setup**
  - [ ] Email address for Let's Encrypt configured
  - [ ] Ports 80 and 443 accessible from internet (firewall test)
  - [ ] Initial certificate generated: `certbot certonly --standalone`
  - [ ] Certificate location verified: `/etc/letsencrypt/live/example.com/`
  - [ ] Certificate valid for: `openssl x509 -in fullchain.pem -noout -enddate`
  - [ ] Certificate symlinked to Docker mount point

- [ ] **Certificate Renewal Automation**
  - [ ] Renewal script created (`/usr/local/bin/renew-certs.sh`)
  - [ ] Crontab entry added for daily renewal: `0 3 * * * /usr/local/bin/renew-certs.sh`
  - [ ] Renewal dry-run successful: `certbot renew --dry-run -v`

### DNS Configuration

- [ ] **Domain DNS Records**
  - [ ] A record: `api.example.com` → Your server IP
  - [ ] A record: `example.com` → Your server IP
  - [ ] AAAA record (IPv6, if applicable)
  - [ ] MX records configured (if email required)
  - [ ] DNS propagation verified (24-48 hours): `nslookup api.example.com`
  - [ ] Test resolution from multiple locations

---

## Configuration & Secrets

### Environment Variables

- [ ] **Backend Configuration (.env.production)**
  - [ ] `DEBUG=False` (production mode)
  - [ ] `SECRET_KEY` generated and unique
  - [ ] `ALLOWED_HOSTS` includes your domain: `api.example.com,example.com`
  - [ ] `ENVIRONMENT=production`
  - [ ] Database credentials set securely
  - [ ] Redis password set (if applicable)
  - [ ] Email SMTP credentials configured
  - [ ] ML service endpoint configured
  - [ ] API base URLs use HTTPS
  - [ ] Security headers enabled:
    - [ ] `SECURE_SSL_REDIRECT=True`
    - [ ] `SESSION_COOKIE_SECURE=True`
    - [ ] `CSRF_COOKIE_SECURE=True`
    - [ ] `SECURE_HSTS_SECONDS=31536000` (1 year)
    - [ ] `SECURE_HSTS_INCLUDE_SUBDOMAINS=True`

- [ ] **Frontend Configuration (.env.production)**
  - [ ] `VITE_USE_HTTPS=true`
  - [ ] `VITE_API_URL_HTTPS=https://api.example.com/api`
  - [ ] `VITE_WS_URL_HTTPS=wss://api.example.com`
  - [ ] Production API endpoints verified
  - [ ] WebSocket endpoints verified

### Secrets Management

- [ ] **Sensitive Data Protection**
  - [ ] No secrets in git repository
  - [ ] `.env` files not committed
  - [ ] `SECRET_KEY` never shared or logged
  - [ ] Database passwords stored securely
  - [ ] API keys stored securely (cloud KMS, vault, etc.)
  - [ ] Email credentials stored securely
  - [ ] Certificate files readable by Docker (101:101 ownership)

---

## Application Setup

### Database

- [ ] **PostgreSQL Configuration**
  - [ ] Database created: `CREATE DATABASE helpdesk;`
  - [ ] Migrations applied: `python manage.py migrate`
  - [ ] Database user with minimal permissions
  - [ ] Max connections configured (pool size)
  - [ ] Connection SSL enabled (if remote database)
  - [ ] Backup routine configured
  - [ ] Backup tested (restore to verify)

- [ ] **Database Optimization**
  - [ ] Indexes created on frequently queried columns
  - [ ] `VACUUM ANALYZE` scheduled
  - [ ] `pg_stat_statements` enabled for slow query monitoring

### Redis Cache

- [ ] **Redis Configuration**
  - [ ] Redis password set (strong, 16+ characters)
  - [ ] Maxmemory policy configured: `maxmemory-policy allkeys-lru`
  - [ ] Maxmemory set appropriately (50-75% of available RAM)
  - [ ] Persistence enabled (RDB snapshots or AOF)
  - [ ] Backups scheduled
  - [ ] Sentinel or Cluster configured (if high availability required)

### Backend (Django + Channels)

- [ ] **Application Startup**
  - [ ] Migrations applied: `docker exec helpdesk_backend python manage.py migrate`
  - [ ] Static files collected: `docker exec helpdesk_backend python manage.py collectstatic --noinput`
  - [ ] Superuser created: `docker exec helpdesk_backend python manage.py createsuperuser`
  - [ ] No DEBUG output visible in responses
  - [ ] CSRF middleware enabled
  - [ ] Session security cookies enabled
  - [ ] Admin interface accessible: `/admin/`

- [ ] **Channels & WebSocket**
  - [ ] Channel layer configured for production (Redis)
  - [ ] Worker settings configured (`WEB_CONCURRENCY`, `CHANNEL_LAYERS`)
  - [ ] WebSocket timeout set appropriately (300s)
  - [ ] Message persistence enabled (if required)

### Frontend (React + Vite Build)

- [ ] **Production Build**
  - [ ] `npm run build` executed successfully
  - [ ] No build warnings or errors
  - [ ] Build output optimized (minified, tree-shaken)
  - [ ] Source maps generated (for debugging)
  - [ ] Environment variables embedded
  - [ ] API endpoints point to production
  - [ ] WebSocket endpoints point to production

---

## Nginx Reverse Proxy

### Configuration Validation

- [ ] **Nginx Config Verification**
  - [ ] Configuration file syntax valid: `nginx -t`
  - [ ] SSL/TLS certificates configured
  - [ ] Server blocks for all domains
  - [ ] Upstream backend pointing to internal service
  - [ ] WebSocket upgrade headers present
  - [ ] Long-polling timeouts configured (60s)
  - [ ] Security headers set:
    - [ ] `X-Content-Type-Options: nosniff`
    - [ ] `X-Frame-Options: DENY`
    - [ ] `X-XSS-Protection: 1; mode=block`
    - [ ] `Referrer-Policy: strict-origin`
    - [ ] `HSTS: max-age=31536000` (commented, ready to enable)

### Performance Optimization

- [ ] **Nginx Optimization**
  - [ ] Worker processes: `auto` or manually set
  - [ ] Worker connections: `10000` (adjust per server capacity)
  - [ ] Keepalive connections enabled
  - [ ] Gzip compression enabled (level 6)
  - [ ] Gzip types configured (text/*, application/json, etc.)
  - [ ] Sendfile enabled
  - [ ] TCP tuning enabled:
    - [ ] `tcp_nopush on`
    - [ ] `tcp_nodelay on`
  - [ ] Upstream keepalive pool configured
  - [ ] Connection buffering disabled for WebSocket

### Logging & Monitoring

- [ ] **Access & Error Logs**
  - [ ] Access logs location: `/var/log/nginx/access.log`
  - [ ] Error logs location: `/var/log/nginx/error.log`
  - [ ] Log rotation configured
  - [ ] Monitoring set up (alerts on 5xx errors)
  - [ ] Health checks logged and monitored

---

## Security

### TLS/SSL

- [ ] **HTTPS Enforcement**
  - [ ] HTTP redirect to HTTPS functional
  - [ ] SSL version: TLSv1.2 minimum
  - [ ] Cipher suites strong and modern
  - [ ] Perfect Forward Secrecy (PFS) enabled
  - [ ] HSTS header set to 31536000 seconds
  - [ ] Certificate chain valid and complete
  - [ ] Certificate pinning considered (optional)

### Application Security

- [ ] **CSRF & XSS Protection**
  - [ ] CSRF tokens implemented
  - [ ] Content Security Policy (CSP) header set
  - [ ] X-XSS-Protection header present
  - [ ] Input validation on all endpoints
  - [ ] Output encoding applied

- [ ] **Authentication & Authorization**
  - [ ] JWT tokens signed with strong secret
  - [ ] Token expiration set appropriately
  - [ ] Refresh token rotation implemented
  - [ ] Password requirements enforced
  - [ ] Rate limiting on login endpoint
  - [ ] Admin interface password-protected
  - [ ] User roles and permissions verified

- [ ] **API Security**
  - [ ] CORS properly configured (trusted origins only)
  - [ ] API rate limiting enabled (per user/IP)
  - [ ] Request size limits enforced
  - [ ] SQL injection prevention verified
  - [ ] XSS prevention verified

### Firewall & Network

- [ ] **Firewall Rules**
  - [ ] Port 22 (SSH): Open to Admin IPs only
  - [ ] Port 80 (HTTP): Open to all (redirect to 443)
  - [ ] Port 443 (HTTPS): Open to all
  - [ ] All other ports: Closed
  - [ ] Outbound: Configured for necessary services only

- [ ] **DDoS Protection**
  - [ ] Rate limiting configured in Nginx
  - [ ] Fail2ban installed and configured
  - [ ] IP whitelist for admin access
  - [ ] Black hole routing for attack traffic (if applicable)

### Secrets & Credentials

- [ ] **Secret Management**
  - [ ] Database password not visible in logs
  - [ ] API keys rotated regularly
  - [ ] Email passwords stored securely
  - [ ] ML service credentials secured
  - [ ] No hardcoded secrets in code
  - [ ] Audit trail maintained for secret access

---

## Monitoring & Logging

### Application Monitoring

- [ ] **Uptime & Health**
  - [ ] Health check endpoint working
  - [ ] Monitoring service (Prometheus, DataDog, etc.) configured
  - [ ] Alert thresholds set:
    - [ ] Response time > 2s
    - [ ] Error rate > 1%
    - [ ] Disk usage > 80%
    - [ ] Memory usage > 85%

- [ ] **Error Tracking**
  - [ ] Sentry or Rollbar configured
  - [ ] Error notifications sent to team
  - [ ] Production errors logged and reviewed
  - [ ] Alert escalation policy defined

### Database Monitoring

- [ ] **Database Health**
  - [ ] Slow query logs enabled
  - [ ] Query performance monitored
  - [ ] Connection pool monitored
  - [ ] Backup completion verified daily

- [ ] **Database Backup**
  - [ ] Daily automated backups
  - [ ] Backups stored off-site
  - [ ] Restore test conducted (success verified)
  - [ ] Backup retention policy: Minimum 30 days

### WebSocket & Real-time Monitoring

- [ ] **Real-time Connectivity**
  - [ ] Active WebSocket connections monitored
  - [ ] Fallback to polling tracked
  - [ ] Message delivery verified
  - [ ] Connection drop-off alerts set

### Logging

- [ ] **Centralized Logging**
  - [ ] All logs sent to central location (ELK, Splunk, etc.)
  - [ ] Log retention: Minimum 30 days
  - [ ] Log search enabled
  - [ ] Critical errors alerted
  - [ ] Compliance logging enabled (audit trail)

---

## Performance

### Load Testing

- [ ] **Capacity Validation**
  - [ ] Load test conducted: Minimum 100 concurrent users
  - [ ] Response time: < 2s for API, < 500ms for WebSocket
  - [ ] Error rate: < 0.1% under load
  - [ ] Memory stability verified (no leaks)
  - [ ] Results documented

### Benchmarking

- [ ] **Performance Metrics**
  - [ ] API Response times recorded
  - [ ] WebSocket message latency recorded
  - [ ] Database query times recorded
  - [ ] Memory usage baseline established
  - [ ] CPU usage baseline established

### Caching

- [ ] **Cache Configuration**
  - [ ] Redis cache hits > 80% for frequent queries
  - [ ] Cache TTL set appropriately
  - [ ] Cache invalidation strategy verified
  - [ ] Stale cache policy defined

---

## Disaster Recovery & Business Continuity

### Backup & Recovery

- [ ] **Data Protection**
  - [ ] Database daily backups: Tested restore working
  - [ ] File uploads backed up (if applicable)
  - [ ] Backup encryption enabled
  - [ ] Off-site backup replication (AWS S3, backup service)
  - [ ] Recovery Time Objective (RTO): < 1 hour defined
  - [ ] Recovery Point Objective (RPO): < 1 day defined

- [ ] **Disaster Recovery Plan**
  - [ ] Documented and reviewed
  - [ ] Tested with simulated failure
  - [ ] Team trained on procedures
  - [ ] Contact list updated
  - [ ] Alert contacts notified

### High Availability (Optional)

- [ ] **Redundancy**
  - [ ] Database replication configured (if applicable)
  - [ ] Load balancer configured (if applicable)
  - [ ] Failover tested
  - [ ] Service health checks active

---

## Testing

### Functional Testing

- [ ] **Core Features**
  - [ ] User login/logout working
  - [ ] Create ticket functionality
  - [ ] WebSocket notifications real-time
  - [ ] Ticket updates reflected immediately
  - [ ] Admin interface accessible
  - [ ] All API endpoints responding
  - [ ] Database queries returning correct data

### End-to-End Testing

- [ ] **Complete User Flows**
  - [ ] User registration → Login → Create Ticket → Receive Notification
  - [ ] Multiple concurrent users tested
  - [ ] WebSocket fallback (manual disconnect) verified
  - [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
  - [ ] Mobile responsiveness verified
  - [ ] Network latency scenarios tested

### Security Testing

- [ ] **Vulnerability Assessment**
  - [ ] OWASP Top 10 vulnerabilities checked
  - [ ] SQL injection attempts blocked
  - [ ] XSS attacks prevented
  - [ ] CSRF protection verified
  - [ ] Authentication bypass attempts blocked
  - [ ] Authorization boundary enforced
  - [ ] Penetration testing (if applicable)

### Load & Stress Testing

- [ ] **Performance Under Load**
  - [ ] 1000+ concurrent WebSocket connections
  - [ ] API response time < 2s at 50% load
  - [ ] No memory leaks at sustained load
  - [ ] Recovery from load demonstrated
  - [ ] Graceful degradation verified

---

## Documentation

### Knowledge Transfer

- [ ] **Deployment Documentation**
  - [ ] [DEPLOYMENT.md](./DEPLOYMENT.md) reviewed and up-to-date
  - [ ] Nginx configuration explained
  - [ ] SSL/TLS setup documented
  - [ ] Environment variables documented
  - [ ] Backup procedures documented

- [ ] **Runbooks**
  - [ ] Emergency procedures documented
  - [ ] Common issues and resolutions
  - [ ] Incident response procedure
  - [ ] Maintenance window procedure
  - [ ] Team contact list

### Operations Manual

- [ ] **Day-to-Day Operations**
  - [ ] Log monitoring procedure
  - [ ] Alert handling procedure
  - [ ] User support escalation path
  - [ ] Release deployment procedure
  - [ ] Health check verification

---

## Post-Deployment

### Launch Day (Zero-day)

- [ ] **Go-Live Validation**
  - [ ] All services running: `docker-compose ps`
  - [ ] Health checks passing
  - [ ] SSL certificate valid: `openssl x509 -in fullchain.pem -text -noout`
  - [ ] Database migrated successfully
  - [ ] No errors in logs for first 1 hour
  - [ ] User access verified
  - [ ] WebSocket connections verified
  - [ ] Admin dashboard accessible
  - [ ] Support team briefed and on standby

### Post-Deployment (First 24 hours)

- [ ] **Stability Monitoring**
  - [ ] Errors < 0.1% of requests
  - [ ] Response times stable
  - [ ] Memory usage stable (no leaks)
  - [ ] Database performance acceptable
  - [ ] User feedback monitored
  - [ ] On-call support available

### Week 1 Follow-up

- [ ] **Performance Verification**
  - [ ] No degradation in performance
  - [ ] All features working as expected
  - [ ] User adoption monitored
  - [ ] Issues tracked and resolved
  - [ ] Metrics collected and analyzed

---

## Sign-off

**Deployment Owner:** _________________ **Date:** _________

**QA Lead:** _________________ **Date:** _________

**DevOps Lead:** _________________ **Date:** _________

**Product Manager:** _________________ **Date:** _________

---

## Notes

```
Use this section for any additional notes, approvals, or sign-offs from stakeholders.


```

