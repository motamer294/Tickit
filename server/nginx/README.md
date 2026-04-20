# Nginx Reverse Proxy Configuration

## Overview

This Nginx configuration transforms the HelpDesk application into a production-ready deployable system with:

- **HTTPS/TLS encryption** with automatic HTTP → HTTPS redirect
- **Reverse proxy routing** for API and WebSocket connections
- **Real-time support** with proper WebSocket upgrade handling
- **Long-polling fallback** with extended timeouts
- **Security headers** and SSL/TLS best practices
- **Performance optimization** with gzip compression and connection pooling

## File Structure

```
nginx/
├── nginx.conf          ← Main Nginx configuration
└── README.md           ← This file
```

## Key Features

### 1. **Two Server Blocks**

#### HTTP Server (Port 80)

- Automatically redirects all traffic to HTTPS
- Allows Let's Encrypt ACME challenges (certificate renewal)
- Health check endpoint `/health` (responds before redirect)

#### HTTPS Server (Port 443)

- Serves HTTPS/WSS traffic
- SSL/TLS with TLSv1.2+
- All application routes

### 2. **Upstream Backend Pool**

```nginx
upstream backend {
    least_conn;
    server backend:8000 max_fails=3 fail_timeout=30s;
}
```

- Load balancing using least connections algorithm
- Automatic failure detection (3 failures = 30s timeout)
- Can scale to multiple backend instances

### 3. **Routing Configuration**

| Route                 | Purpose               | Key Features                                   |
| --------------------- | --------------------- | ---------------------------------------------- |
| `/admin/`             | Django admin panel    | Standard proxy, 30s timeouts                   |
| `/api/`               | REST API endpoints    | Buffered, 30s timeouts, CORS headers           |
| `/ws/`                | WebSocket connections | **Unbuffered**, 300s timeouts, upgrade headers |
| `/api/message_queue/` | Long-polling fallback | **Unbuffered**, 60s timeouts                   |

### 4. **WebSocket Support**

The `/ws/` location block includes critical settings for WebSocket:

```nginx
location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_buffering off;              # No buffering - real-time!
    proxy_read_timeout 300s;          # 5 minutes for long-running connections
}
```

**Why these settings matter:**

- `Upgrade: websocket` + `Connection: upgrade` → HTTP → WebSocket protocol switch
- `proxy_buffering off` → Messages delivered immediately, not buffered
- `proxy_read_timeout 300s` → Allow 5-minute connections for long-polling

### 5. **SSL/TLS Configuration**

```nginx
ssl_certificate /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...
```

**Development:** Self-signed certificates (browser warning expected ✓)
**Production:** Let's Encrypt certificates via Certbot

### 6. **Security Headers**

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Optional for production (uncommented in recommended security setup):

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
```

### 7. **Performance Optimization**

- **Gzip compression** - Reduces bandwidth for text/JSON responses (6/9 compression)
- **Worker processes** - Auto-detected based on CPU cores
- **Keepalive** - Connection pooling to backend
- **Sendfile** - Efficient file serving with OS system calls
- **TCP tuning** - `tcp_nopush` + `tcp_nodelay` for real-time performance

## Environment Variables

The configuration uses environment variables for SSL certificate paths:

```bash
# Default paths (used when env vars not set)
NGINX_CERT_PATH=/etc/nginx/certs/fullchain.pem
NGINX_KEY_PATH=/etc/nginx/certs/privkey.pem
```

These are typically set in `.env` or Docker Compose:

```yaml
environment:
  NGINX_CERT_PATH: /etc/nginx/certs/fullchain.pem
  NGINX_KEY_PATH: /etc/nginx/certs/privkey.pem
```

## Timeout Settings Explained

| Location              | Timeout | Purpose                                |
| --------------------- | ------- | -------------------------------------- |
| `/api/` (REST)        | 30s     | Standard HTTP request-response         |
| `/ws/` (WebSocket)    | 300s    | Real-time, persistent connection       |
| `/api/message_queue/` | 60s     | Long-polling (max 30s poll + overhead) |

**Why different timeouts?**

- REST API: Quick request-response cycle (typical: 100ms-5s)
- WebSocket: Long-lived connection (typical: minutes to hours)
- Polling: Long wait times intentional (30s polls to reduce CPU load)

## Behind the Scenes: Request Flow

### REST API Request

```
Client -> HTTPS (443) -> Nginx
         -> HTTP proxy (port 8000)
         -> Django backend
         -> Response back through Nginx
         -> HTTPS encrypted to client
         ✅ Total: ~1-10 seconds
```

### WebSocket Connection

```
Client -> HTTPS (443) -> Nginx
         -> HTTP UPGRADE -> WebSocket proxy
         -> Django Channels (port 8000)
         -> Persistent connection (both directions)
         -> Real-time messages flow
         ✅ Connection: Minutes+ persistent
         ✅ Latency: <100ms typical
```

### Long-Polling Fallback

```
Client -> HTTPS (443) -> Nginx
         -> HTTP long-poll request
         -> Nginx waits unbuffered
         -> Django holds connection 30s
         -> Messages arrive or timeout
         -> Response sent immediately
         -> Client reconnects in 1s
         ✅ Fallback: Works without WebSocket
         ✅ Mobile-friendly: No connection drops
```

## Usage

### Local Development

1. Configuration is automatically used by Docker Compose
2. Self-signed certificate warning in browser is normal
3. Accept the warning to proceed

### SSL Certificate Paths

The configuration expects:

- **Certificate**: `/etc/nginx/certs/fullchain.pem`
- **Private Key**: `/etc/nginx/certs/privkey.pem`

In Docker, these mount from `server/certs/` directory:

```yaml
volumes:
  - ./certs:/etc/nginx/certs:ro
```

## Troubleshooting

### "502 Bad Gateway"

- Backend service not running or not accessible
- Check: `docker-compose ps` - is `backend` service running?
- Check: `docker-compose logs nginx` - what's the error?

### WebSocket Connection Fails

- Verify `/ws/` location block uses `proxy_buffering off`
- Verify `proxy_http_version 1.1` and upgrade headers
- Check browser console for connection URL and errors

### Long-polling Requests Timeout

- Verify `/api/message_queue/` timeouts are 60s+
- Verify `proxy_buffering off` is set
- Check backend is responding to GET `/api/message_queue/receive?timeout=30`

### Certificate Errors

- Development: Self-signed certs are normal, click "Accept risk"
- Production: Use Let's Encrypt (see DEPLOYMENT.md)

### High Response Times

- Check `upstream_response_time` in nginx access logs
- If slow: Backend issue, not Nginx
- Monitor Django backend performance

## Advanced Configuration

### Multiple Backend Instances (Load Balancing)

Replace the upstream block:

```nginx
upstream backend {
    least_conn;

    server backend:8000 weight=1;
    server backend:8001 weight=1;
    server backend:8002 weight=1;
}
```

Benefits:

- Distribute traffic across workers
- Automatic failover
- Scale horizontally with Gunicorn

### Rate Limiting (Production)

Add before server blocks:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=ws:10m rate=10r/s;
```

Then in location blocks:

```nginx
location /api/ {
    limit_req zone=api burst=200 nodelay;
    ...
}
```

### Custom Logging

Modify log format before `http` block:

```nginx
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    'upstream: $upstream_addr rt=$request_time ';
```

## Security Checklist

- [ ] SSL/TLS enabled for production
- [ ] HSTS header enabled after confirming HTTPS
- [ ] X-Frame-Options set to "SAMEORIGIN"
- [ ] Certificate auto-renewal configured
- [ ] Monitor certificate expiration
- [ ] Regular security audits

## Performance Benchmarks

Expected performance with this configuration:

| Metric                    | Target    | Typical   |
| ------------------------- | --------- | --------- |
| HTTPS API latency         | <100ms    | 50-80ms   |
| WebSocket connection      | <500ms    | 100-200ms |
| Long-polling latency      | <2s       | 500ms-1s  |
| Connection throughput     | 1000+ RPS | 2000+ RPS |
| Real-time message latency | <100ms    | 50ms      |

_(Benchmarks assume healthy backend and network)_

## Related Files

- [Docker Compose Configuration](../docker-compose.yml) - Nginx service definition
- [Backend Proxy Settings](../core/settings.py) - Django proxy configuration
- [Production Deployment Guide](../DEPLOYMENT.md) - Full deployment instructions
- [WebSocket Implementation](../../web/src/providers/WebSocketProvider.tsx) - Frontend WebSocket client

## Resources

- [Nginx Official Documentation](https://nginx.org/en/docs/)
- [WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
- [Nginx Security Best Practices](https://nginx.org/en/docs/http/ssl_module.html)
- [Let's Encrypt with Certbot](https://certbot.eff.org/)
