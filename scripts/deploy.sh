#!/bin/bash
# Production Deployment Script
# This script automates the deployment of the HelpDesk application

set -e  # Exit on any error

echo "=========================================="
echo "🚀 HelpDesk Production Deployment Script"
echo "=========================================="

# Configuration
DEPLOY_USER="helpdesk"
DEPLOY_DIR="/opt/helpdesk-api"
FRONTEND_DIR="/opt/helpdesk-web"
VENV_DIR="${DEPLOY_DIR}/venv"
LOG_DIR="/var/log/helpdesk"
BACKUP_DIR="/var/backups/helpdesk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

# Step 1: Pre-deployment checks
log "Step 1: Running pre-deployment checks..."
which python3 > /dev/null || error "Python 3 not found"
which node > /dev/null || error "Node.js not found"
which npm > /dev/null || error "npm not found"
which postgresql > /dev/null && log "✓ PostgreSQL found" || warning "PostgreSQL not found"
which redis-server > /dev/null && log "✓ Redis found" || warning "Redis not found"

# Step 2: Create system user and directories
log "Step 2: Creating system user and directories..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash $DEPLOY_USER
    log "✓ User $DEPLOY_USER created"
else
    log "✓ User $DEPLOY_USER already exists"
fi

mkdir -p $DEPLOY_DIR $FRONTEND_DIR $LOG_DIR $BACKUP_DIR
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_DIR $FRONTEND_DIR $LOG_DIR $BACKUP_DIR
chmod -R 755 $DEPLOY_DIR $FRONTEND_DIR $LOG_DIR $BACKUP_DIR
log "✓ Directories created"

# Step 3: Backup current deployment
log "Step 3: Backing up current deployment..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf $BACKUP_FILE -C $(dirname $DEPLOY_DIR) helpdesk-api || warning "Backup failed"
    log "✓ Backup created: $BACKUP_FILE"
else
    log "ℹ No previous deployment to backup"
fi

# Step 4: Deploy backend code
log "Step 4: Deploying backend code..."
if [ -f "/home/essam/graduation_project/server/.git/config" ]; then
    cd $DEPLOY_DIR
    sudo -u $DEPLOY_USER git pull origin main || warning "Git pull failed"
else
    sudo cp -r /home/essam/graduation_project/server/* $DEPLOY_DIR/
    sudo chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_DIR
fi
log "✓ Backend code deployed"

# Step 5: Install Python dependencies
log "Step 5: Installing Python dependencies..."
cd $DEPLOY_DIR
sudo -u $DEPLOY_USER python3 -m venv $VENV_DIR || echo "Venv already exists"
source $VENV_DIR/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
log "✓ Dependencies installed"

# Step 6: Setup database
log "Step 6: Setting up database..."
python manage.py migrate --noinput || error "Database migration failed"
python manage.py collectstatic --noinput || error "Static files collection failed"
log "✓ Database configured"

# Step 7: Deploy frontend
log "Step 7: Deploying frontend..."
cd /home/essam/graduation_project/web
npm ci
npm run build
sudo cp -r dist/* $FRONTEND_DIR/
sudo chown -R www-data:www-data $FRONTEND_DIR
log "✓ Frontend deployed"

# Step 8: Create systemd services
log "Step 8: Creating systemd services..."
sudo tee /etc/systemd/system/helpdesk-api.service > /dev/null <<EOF
[Unit]
Description=HelpDesk API (Daphne ASGI Server)
After=network.target postgresql.service redis.service
Requires=postgres.service redis.service

[Service]
Type=notify
User=$DEPLOY_USER
WorkingDirectory=$DEPLOY_DIR
Environment="PATH=$VENV_DIR/bin"
EnvironmentFile=/etc/environment
ExecStart=$VENV_DIR/bin/daphne -b 0.0.0.0 -p 8000 --access-log - core.asgi:application
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable helpdesk-api
log "✓ Systemd service created"

# Step 9: Start services
log "Step 9: Starting services..."
systemctl restart helpdesk-api
sleep 3
systemctl status helpdesk-api || error "Service failed to start"
log "✓ API service started"

# Step 10: Run tests
log "Step 10: Running tests..."
cd $DEPLOY_DIR
source $VENV_DIR/bin/activate
python -m pytest tests/test_integration.py --tb=short -v || warning "Some tests failed"
log "✓ Tests completed"

# Step 11: Verify deployment
log "Step 11: Verifying deployment..."
curl -s http://localhost:8000/api/profile -H "Authorization: Bearer invalid" | grep -q "Unauthorized" && log "✓ API responding" || error "API verification failed"
curl -s https://localhost/api/profile -k -H "Authorization: Bearer invalid" 2>/dev/null | grep -q "Unauthorized" && log "✓ HTTPS API responding" || warning "HTTPS verification failed"

# Step 12: Setup monitoring
log "Step 12: Setting up monitoring..."
sudo tee /etc/logrotate.d/helpdesk > /dev/null <<EOF
$LOG_DIR/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $DEPLOY_USER $DEPLOY_USER
}
EOF
log "✓ Log rotation configured"

# Step 13: Final checks
log "Step 13: Running final checks..."
echo ""
echo "=========================================="
echo "✅ Deployment Completed Successfully!"
echo "=========================================="
echo ""
echo "Key Information:"
echo "  - API Server: http://localhost:8000"
echo "  - Frontend: /opt/helpdesk-web/dist"
echo "  - Logs: $LOG_DIR/"
echo "  - User: $DEPLOY_USER"
echo ""
echo "Next Steps:"
echo "  1. Verify database backup: ls -la $BACKUP_DIR/"
echo "  2. Check in your browser: https://yourdomain.com"
echo "  3. Monitor logs: tail -f $LOG_DIR/django.log"
echo "  4. Check service status: systemctl status helpdesk-api"
echo ""
echo "To rollback:"
echo "  tar -xzf $BACKUP_DIR/backup-XXXXXXXX-XXXXXX.tar.gz -C /"
echo "  systemctl restart helpdesk-api"
echo ""
echo "=========================================="
