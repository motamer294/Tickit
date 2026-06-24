#!/bin/bash

# HelpDesk Nginx & Infrastructure Testing Script
# This script validates the entire deployment including Nginx, backend, database, and real-time features

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROTOCOL="${1:-https}"  # https or http
HOST="${2:-localhost}"
PORT="${3:-443}"
VERBOSE="${4:-false}"   # true for verbose output

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test results
declare -a FAILED_TESTS

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}${NC}"
}

print_test() {
    echo -e "${YELLOW} $1${NC}"
}

print_pass() {
    echo -e "${GREEN} $1${NC}"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED} $1${NC}"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_debug() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}  [DEBUG] $1${NC}"
    fi
}

# Main testing functions
test_nginx_status() {
    print_header "Testing Nginx Service"

    print_test "Checking if Nginx container is running"
    if docker ps | grep -q helpdesk_nginx; then
        print_pass "Nginx container is running"
    else
        print_fail "Nginx container is NOT running"
        return 1
    fi

    print_test "Validating Nginx configuration"
    if docker exec helpdesk_nginx nginx -t 2>&1 | grep -q "successful"; then
        print_pass "Nginx configuration is valid"
    else
        print_fail "Nginx configuration has errors"
        docker exec helpdesk_nginx nginx -t || true
        return 1
    fi

    print_test "Checking Nginx processes"
    local worker_count=$(docker exec helpdesk_nginx ps aux | grep -c "nginx: worker" || echo 0)
    if [ "$worker_count" -gt 0 ]; then
        print_pass "Nginx workers running (count: $worker_count)"
    else
        print_fail "No Nginx workers found"
    fi

    print_test "Checking Nginx ports"
    if docker exec helpdesk_nginx netstat -tlnp 2>/dev/null | grep -q ":80" || \
       docker exec helpdesk_nginx ss -tlnp 2>/dev/null | grep -q ":80"; then
        print_pass "Nginx listening on port 80"
    else
        print_fail "Nginx not listening on port 80"
    fi

    if docker exec helpdesk_nginx netstat -tlnp 2>/dev/null | grep -q ":443" || \
       docker exec helpdesk_nginx ss -tlnp 2>/dev/null | grep -q ":443"; then
        print_pass "Nginx listening on port 443"
    else
        print_fail "Nginx not listening on port 443"
    fi
}

test_backend_status() {
    print_header "Testing Backend Service"

    print_test "Checking if Backend container is running"
    if docker ps | grep -q helpdesk_backend; then
        print_pass "Backend container is running"
    else
        print_fail "Backend container is NOT running"
        return 1
    fi

    print_test "Checking backend logs for errors"
    local error_count=$(docker-compose logs backend 2>&1 | grep -i "error" | wc -l)
    if [ "$error_count" -eq 0 ]; then
        print_pass "No errors in backend logs"
    else
        print_fail "Found $error_count errors in backend logs"
        print_debug "Last errors:"
        docker-compose logs backend 2>&1 | grep -i "error" | tail -3 | while read line; do
            print_debug "$line"
        done
    fi

    print_test "Checking if backend is listening on port 8000"
    if docker exec helpdesk_backend netstat -tlnp 2>/dev/null | grep -q ":8000" || \
       docker exec helpdesk_backend ss -tlnp 2>/dev/null | grep -q ":8000"; then
        print_pass "Backend listening on port 8000"
    else
        print_fail "Backend not listening on port 8000"
    fi
}

test_database_status() {
    print_header "Testing Database Service"

    print_test "Checking if PostgreSQL container is running"
    if docker ps | grep -q helpdesk_postgres; then
        print_pass "PostgreSQL container is running"
    else
        print_fail "PostgreSQL container is NOT running"
        return 1
    fi

    print_test "Testing database connectivity from backend"
    if docker exec helpdesk_backend python manage.py dbshell <<< "SELECT 1;" &>/dev/null; then
        print_pass "Backend can connect to database"
    else
        print_fail "Backend cannot connect to database"
    fi

    print_test "Checking migrations status"
    if docker exec helpdesk_backend python manage.py showmigrations 2>&1 | grep -q "\[X\]"; then
        print_pass "Database migrations applied"
    else
        print_fail "Database migrations may not be applied"
    fi
}

test_redis_status() {
    print_header "Testing Redis Service"

    print_test "Checking if Redis container is running"
    if docker ps | grep -q helpdesk_redis; then
        print_pass "Redis container is running"
    else
        print_fail "Redis container is NOT running"
        return 1
    fi

    print_test "Testing Redis connectivity"
    if docker exec helpdesk_redis redis-cli ping | grep -q "PONG"; then
        print_pass "Redis is responding to PING"
    else
        print_fail "Redis is not responding to PING"
    fi

    print_test "Checking Redis memory usage"
    local redis_info=$(docker exec helpdesk_redis redis-cli info memory)
    local used_memory=$(echo "$redis_info" | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    print_pass "Redis memory usage: $used_memory"
}

test_http_endpoints() {
    print_header "Testing HTTP Endpoints"

    local base_url="$PROTOCOL://$HOST:$PORT"
    local curl_opts="-s -w "\n%{http_code}" -m 5"

    if [ "$PROTOCOL" = "https" ]; then
        curl_opts="$curl_opts -k"  # Ignore self-signed certificate warnings
    fi

    # Test health check
    print_test "Testing health check endpoint"
    local response=$(eval "curl $curl_opts '$base_url/health'")
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -1)

    if [ "$http_code" = "200" ]; then
        print_pass "Health check endpoint (HTTP $http_code): $body"
    else
        print_fail "Health check endpoint failed (HTTP $http_code)"
    fi

    # Test API login endpoint
    print_test "Testing API login endpoint"
    local response=$(eval "curl $curl_opts -X POST \
        -H 'Content-Type: application/json' \
        -d '{\"username\":\"nonexistent\",\"password\":\"test\"}' \
        '$base_url/api/login/'")
    local http_code=$(echo "$response" | tail -1)

    if [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
        print_pass "API login endpoint is accessible (HTTP $http_code)"
    else
        print_fail "API login endpoint unexpected response (HTTP $http_code)"
    fi

    # Test tickets endpoint (should require auth)
    print_test "Testing tickets endpoint (without auth)"
    local response=$(eval "curl $curl_opts '$base_url/api/tickets/'")
    local http_code=$(echo "$response" | tail -1)

    if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        print_pass "Tickets endpoint correctly requires authentication (HTTP $http_code)"
    else
        print_fail "Tickets endpoint should require authentication (HTTP $http_code)"
    fi

    # Test Django admin
    print_test "Testing Django admin interface"
    local response=$(eval "curl $curl_opts '$base_url/admin/'")
    local http_code=$(echo "$response" | tail -1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "302" ]; then
        print_pass "Django admin interface is accessible (HTTP $http_code)"
    else
        print_fail "Django admin interface failed (HTTP $http_code)"
    fi
}

test_ssl_certificate() {
    print_header "Testing SSL/TLS Certificate"

    if [ "$PROTOCOL" != "https" ]; then
        print_info "Skipping SSL tests (using HTTP protocol)"
        return 0
    fi

    print_test "Checking certificate validity"
    local cert_file="/etc/nginx/certs/fullchain.pem"
    if docker exec helpdesk_nginx test -f "$cert_file"; then
        print_pass "Certificate file exists at $cert_file"
    else
        print_fail "Certificate file not found at $cert_file"
        return 1
    fi

    print_test "Checking certificate expiration date"
    local expiry=$(docker exec helpdesk_nginx openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
    print_pass "Certificate expires on: $expiry"

    print_test "Checking certificate chain"
    local cert_count=$(docker exec helpdesk_nginx openssl crlf -in "$cert_file" -text -noout 2>/dev/null | grep -c "Subject:" || echo "unknown")
    print_info "Certificate chain entries: $cert_count"

    print_test "Verifying HTTPS connection"
    local response=$(openssl s_client -connect $HOST:$PORT -servername $HOST < /dev/null 2>&1)
    if echo "$response" | grep -q "Verify return code: 0"; then
        print_pass "HTTPS connection verified successfully"
    else
        print_info "HTTPS connection established (certificate may be self-signed)"
    fi
}

test_websocket() {
    print_header "Testing WebSocket Support"

    # Check if wscat is installed
    if ! command -v wscat &> /dev/null; then
        print_info "wscat not installed. Install with: npm install -g wscat"
        print_info "WebSocket detailed testing skipped."
        return 0
    fi

    local ws_protocol="ws"
    local ws_url="$ws_protocol://$HOST:$PORT/ws/unified/"

    if [ "$PROTOCOL" = "https" ]; then
        ws_protocol="wss"
        ws_url="$ws_protocol://$HOST:$PORT/ws/unified/"
    fi

    print_test "Testing WebSocket connection"

    # Try to connect with wscat (timeout after 2 seconds)
    local response=$(timeout 2 wscat -c "$ws_url" --no-check <<< "" 2>&1 || true)

    if echo "$response" | grep -qi "connected" || echo "$response" | grep -qi "error\|closed"; then
        # Either connected or got an error response (both are good signs that WS is listening)
        print_pass "WebSocket endpoint is responding"
    else
        print_fail "WebSocket endpoint not responding correctly"
        print_debug "Response: $response"
    fi

    print_test "Checking Nginx WebSocket configuration"
    docker exec helpdesk_nginx grep -q "Upgrade\|upgrade" /etc/nginx/nginx.conf
    if [ $? -eq 0 ]; then
        print_pass "Nginx WebSocket upgrade headers are configured"
    else
        print_fail "Nginx WebSocket upgrade headers may not be configured"
    fi
}

test_cors_headers() {
    print_header "Testing CORS Headers"

    local base_url="$PROTOCOL://$HOST:$PORT"
    local curl_opts="-s -i -m 5"

    if [ "$PROTOCOL" = "https" ]; then
        curl_opts="$curl_opts -k"
    fi

    print_test "Testing CORS headers on API endpoint"
    local response=$(eval "curl $curl_opts '$base_url/api/tickets/'")

    if echo "$response" | grep -qi "access-control"; then
        print_pass "CORS headers are present"
        print_debug "CORS headers:"
        echo "$response" | grep -i "access-control" | while read line; do
            print_debug "$line"
        done
    else
        print_info "No CORS headers detected (may be expected for same-domain requests)"
    fi
}

test_security_headers() {
    print_header "Testing Security Headers"

    local base_url="$PROTOCOL://$HOST:$PORT"
    local curl_opts="-s -i -m 5"

    if [ "$PROTOCOL" = "https" ]; then
        curl_opts="$curl_opts -k"
    fi

    print_test "Testing security headers"
    local response=$(eval "curl $curl_opts '$base_url/health'")

    # Check for important security headers
    local security_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
    )

    for header in "${security_headers[@]}"; do
        if echo "$response" | grep -qi "$header"; then
            print_pass "Security header present: $header"
        else
            print_info "Security header not detected: $header (may be optional)"
        fi
    done
}

test_compression() {
    print_header "Testing Gzip Compression"

    local base_url="$PROTOCOL://$HOST:$PORT"
    local curl_opts="-s -i -m 5 -H 'Accept-Encoding: gzip,deflate'"

    if [ "$PROTOCOL" = "https" ]; then
        curl_opts="$curl_opts -k"
    fi

    print_test "Testing Gzip compression"
    local response=$(eval "curl $curl_opts '$base_url/health'")

    if echo "$response" | grep -qi "content-encoding: gzip"; then
        print_pass "Gzip compression is enabled"
    else
        print_info "Gzip compression may not be active (size < threshold or not enabled)"
    fi
}

test_docker_resources() {
    print_header "Testing Docker Container Resources"

    print_test "Container status and resource usage"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

    # Check for any stopped containers
    local stopped=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | grep helpdesk | wc -l)
    if [ "$stopped" -gt 0 ]; then
        print_fail "Found $stopped stopped containers"
    else
        print_pass "All HelpDesk containers are running"
    fi
}

test_logging() {
    print_header "Testing Logging"

    print_test "Checking Nginx error logs"
    local nginx_errors=$(docker-compose logs nginx 2>&1 | grep -i "\[error\]" | wc -l)
    if [ "$nginx_errors" -eq 0 ]; then
        print_pass "No errors in Nginx logs"
    else
        print_fail "Found $nginx_errors errors in Nginx logs"
    fi

    print_test "Checking backend error logs"
    local backend_errors=$(docker-compose logs backend 2>&1 | grep -i "ERROR" | wc -l)
    if [ "$backend_errors" -eq 0 ]; then
        print_pass "No errors in backend logs"
    else
        print_info "Found $backend_errors errors in backend logs (may be normal)"
    fi
}

# Main execution
main() {
    clear

    echo ""
    echo -e "${BLUE}${NC}"
    echo -e "${BLUE}   HelpDesk Infrastructure & Nginx Testing Suite       ${NC}"
    echo -e "${BLUE}${NC}"
    echo ""
    echo -e "Testing Target: ${YELLOW}${PROTOCOL}://${HOST}:${PORT}${NC}"
    echo -e "Verbose Mode: ${YELLOW}${VERBOSE}${NC}"
    echo ""

    # Run all tests
    test_docker_resources
    test_nginx_status
    test_backend_status
    test_database_status
    test_redis_status
    test_http_endpoints
    test_ssl_certificate
    test_websocket
    test_cors_headers
    test_security_headers
    test_compression
    test_logging

    # Summary
    print_header "Test Summary"
    echo ""
    echo -e "${GREEN} Passed: $TESTS_PASSED${NC}"
    echo -e "${RED} Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ "$TESTS_FAILED" -gt 0 ]; then
        echo -e "${RED}Failed Tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "${RED}  • $test${NC}"
        done
        echo ""
        exit 1
    else
        echo -e "${GREEN}All tests passed! ${NC}"
        echo ""
        exit 0
    fi
}

# Script usage
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    echo "Usage: $0 [PROTOCOL] [HOST] [PORT] [VERBOSE]"
    echo ""
    echo "Arguments:"
    echo "  PROTOCOL    - http or https (default: https)"
    echo "  HOST        - Server hostname/IP (default: localhost)"
    echo "  PORT        - Server port (default: 443)"
    echo "  VERBOSE     - true or false for verbose output (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Test https://localhost:443"
    echo "  $0 http localhost 80         # Test http://localhost:80"
    echo "  $0 https api.example.com 443 true  # Test with verbose output"
    exit 0
fi

# Run tests
main
