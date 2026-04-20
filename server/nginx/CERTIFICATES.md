# SSL/TLS Certificate Setup Guide

## Overview

This guide covers SSL/TLS certificate setup for both **development** and **production** environments.

### Quick Reference

| Environment     | Certificate Type | Tool    | Renewal          | Path                     |
| --------------- | ---------------- | ------- | ---------------- | ------------------------ |
| **Development** | Self-signed      | OpenSSL | Manual (~1/year) | `nginx/certs/`           |
| **Production**  | Let's Encrypt    | Certbot | Automatic        | `/etc/letsencrypt/live/` |

---

## Part 1: Development (Self-Signed Certificates)

### Current Status

✅ **Already generated** in `nginx/certs/`:

- `fullchain.pem` - Certificate (self-signed)
- `privkey.pem` - Private key

**Validity:** 365 days from generation date

### Browser Warning (Expected)

When accessing `https://localhost`, you'll see:

```
⚠️ Your connection is not private
ERR_CERT_AUTHORITY_INVALID (Chrome)
- or -
Certificate is not trusted (Firefox)
```

**This is normal and expected for self-signed certs. ✓**

### How to Accept the Certificate

#### Chrome/Edge

1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"
3. Continue normally

#### Firefox

1. Click "Advanced"
2. Click "Accept the Risk and Continue"
3. Continue normally

#### macOS Safari

1. Click "Show Details"
2. Click "Visit this website"
3. Enter your password when prompted
4. Continue normally

---

## Part 2: Regenerating Development Certificates

If your dev certificate expires or you want to regenerate it:

```bash
cd server/nginx/certs

# Remove old certificates
rm -f fullchain.pem privkey.pem

# Generate new self-signed certificate (valid 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=EG/ST=Cairo/L=Cairo/O=HelpDesk/CN=localhost"

# Reload Nginx
docker-compose restart nginx

echo "✅ Development certificates regenerated"
```

### Custom Certificate Details

To use different organization details:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=localhost"
```

**Common fields:**

- `C` = Country code (e.g., US, EG)
- `ST` = State/Province
- `L` = City/Locality
- `O` = Organization name
- `CN` = Common Name (hostname, e.g., localhost, example.com)

---

## Part 3: Production (Let's Encrypt + Certbot)

### Why Let's Encrypt?

✅ Free SSL certificates (no cost)
✅ Automatic renewal before expiry
✅ Trusted by all major browsers
✅ Industry standard for production

### Prerequisites

- Domain name (e.g., `api.example.com`)
- Domain must be publicly accessible (DNS must resolve)
- Port 80 or 443 must be accessible from internet
- Server accessible from Let's Encrypt servers

### Installation Steps

#### Step 1: Install Certbot

```bash
# Linux (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# macOS (Homebrew)
brew install certbot

# Docker (included in production image)
# Already available in production Dockerfile
```

#### Step 2: Generate Production Certificate

```bash
# Standalone mode (stop Nginx temporarily)
sudo certbot certonly --standalone -d api.example.com -d example.com

# - or -

# Nginx mode (recommended - no downtime)
sudo certbot --nginx -d api.example.com -d example.com

# - or -

# From Docker
docker exec helpdesk_nginx certbot certonly \
  --nginx \
  -d api.example.com \
  -d example.com \
  --agree-tos \
  --email admin@example.com
```

#### Step 3: Deploy Certificates

Certificates are usually stored in: `/etc/letsencrypt/live/api.example.com/`

Add to environment variables:

```bash
# .env.production

# Point to Let's Encrypt certificates
NGINX_CERT_PATH=/etc/letsencrypt/live/api.example.com/fullchain.pem
NGINX_KEY_PATH=/etc/letsencrypt/live/api.example.com/privkey.pem

# Must allow read access for Nginx:
# docker exec helpdesk_nginx chown -R nginx:nginx /etc/letsencrypt/
```

#### Step 4: Mount Certificates in Docker

Update `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro # ← Add this
    - ./nginx/certs:/etc/nginx/certs:ro # Dev fallback
```

#### Step 5: Enable Automatic Renewal

Certbot automatically creates a systemd timer:

```bash
# Check renewal status
sudo certbot renew --dry-run

# View renewal schedule
sudo systemctl list-timers

# Manual renewal
sudo certbot renew
```

### Docker Compose Production Template

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - .env.production:/etc/nginx/.env:ro
      # Development fallback
      - ./nginx/certs:/etc/nginx/certs:ro
      # Production Let's Encrypt certificates
      - /etc/letsencrypt:/etc/letsencrypt:ro
      # Logs
      - ./logs/nginx:/var/log/nginx
    environment:
      NGINX_CERT_PATH: /etc/letsencrypt/live/api.example.com/fullchain.pem
      NGINX_KEY_PATH: /etc/letsencrypt/live/api.example.com/privkey.pem
    depends_on:
      - backend

  backend:
    # ... backend config ...
    environment:
      API_BASE_URL: https://api.example.com
```

---

## Part 4: Certificate Renewal Strategy

### Automatic (Best Practice)

```bash
# Certbot handles everything automatically
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check status
sudo systemctl status certbot.timer
```

### Manual Renewal

```bash
# Renew all certificates expiring within 30 days
sudo certbot renew

# Force renewal (testing)
sudo certbot renew --force-renewal

# Renew specific domain
sudo certbot renew --cert-name api.example.com
```

### Renewal Notifications

Certbot sends email notifications:

- 20 days before expiry: Renewal reminder
- At renewal failure: Error notification

To update email:

```bash
sudo certbot update_account --email newemail@example.com
```

---

## Part 5: Troubleshooting

### Certificate Won't Renew

```bash
# Check certificate details
openssl x509 -in /etc/letsencrypt/live/api.example.com/fullchain.pem -text -noout

# Check renewal log
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Manual test
sudo certbot renew --dry-run -v

# Force renewal
sudo certbot renew --force-renewal
```

### Domain Resolution Issues

```bash
# Verify domain resolves
nslookup api.example.com

# Check if accessible from internet
curl -I https://api.example.com/health
```

### Port Access Issues

```bash
# Certbot needs port 80 for standalone or 443 for renewal
# Check if ports are open
sudo lsof -i :80
sudo lsof -i :443

# If Nginx is running, use --nginx mode instead
sudo certbot --nginx -d api.example.com
```

### Permissions Issues in Docker

```bash
# If Nginx can't read certificate files:
sudo chown -R 101:101 /etc/letsencrypt/  # Nginx user in Docker

# Or use volumes with proper permissions
docker exec helpful_nginx chown -R nginx:nginx /etc/letsencrypt/
```

---

## Part 6: Certificate Validation

### Verify Self-Signed Certificate (Dev)

```bash
# View certificate details
openssl x509 -in nginx/certs/fullchain.pem -text -noout

# Verify it's self-signed (Issuer = Subject)
openssl x509 -in nginx/certs/fullchain.pem -noout -issuer -subject

# Check expiration date
openssl x509 -in nginx/certs/fullchain.pem -noout -dates
```

### Verify Let's Encrypt Certificate (Prod)

```bash
# View certificate
openssl x509 -in /etc/letsencrypt/live/api.example.com/fullchain.pem -text -noout

# Check expiration
openssl x509 -in /etc/letsencrypt/live/api.example.com/fullchain.pem -noout -enddate

# Verify full chain
openssl verify -CAfile /etc/letsencrypt/live/api.example.com/chain.pem \
  /etc/letsencrypt/live/api.example.com/fullchain.pem
```

### Browser-Based Verification

1. Navigate to `https://api.example.com`
2. Click the lock icon (address bar)
3. Click "Certificate"
4. View issuer, validity dates, domain coverage

---

## Part 7: Production Checklist

Before deploying to production:

- [ ] Domain name registered and DNS configured
- [ ] Domain resolves publicly (`nslookup api.example.com`)
- [ ] Port 80 and 443 accessible from internet
- [ ] Certbot installed on production server
- [ ] Certificate generated: `sudo certbot certonly --nginx -d api.example.com`
- [ ] Certificate permissions set: `chown -R nginx:nginx /etc/letsencrypt/`
- [ ] Docker Compose updated with `/etc/letsencrypt` volume
- [ ] Environment variables point to correct cert paths
- [ ] Nginx reloaded: `docker-compose restart nginx`
- [ ] HTTPS working and accessible: `curl -I https://api.example.com/health`
- [ ] Certificate renewal scheduled: `sudo systemctl enable certbot.timer`
- [ ] Browser shows valid certificate (green lock 🔒)
- [ ] Certificate warning emails configured

---

## Part 8: Emergency: Certificate Expired

If certificate expires (should not happen with Certbot):

```bash
# Immediate workaround: Use self-signed temporarily
cd /etc/nginx/certs
openssl req -x509 -nodes -days 90 -newkey rsa:2048 \
  -keyout privkey-emergency.pem \
  -out fullchain-emergency.pem \
  -subj "/CN=api.example.com"

# Update Nginx certificate path temporarily
# NGINX_CERT_PATH=/etc/nginx/certs/fullchain-emergency.pem

# Then renew properly
sudo certbot renew --force-renewal
```

---

## References

- [Let's Encrypt Official](https://letsencrypt.org/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [OpenSSL Manual](https://www.openssl.org/docs/)
- [ACME Protocol RFC 8555](https://tools.ietf.org/html/rfc8555)
