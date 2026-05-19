# 🎫 TIKIT - HelpDesk System

A modern, full-stack help desk ticketing system with real-time updates, team collaboration, and intelligent AI-powered ticket analysis.

**Version:** 1.0.0 | **License:** MIT

## Key Features

- **Real-time Collaboration** - WebSocket-powered live updates
- **Team Management** - Department & team organization with role-based access
- **AI-Powered Intelligence** - ML-based ticket categorization & routing
- **Comprehensive Ticketing** - Priority, status, SLA, and audit tracking
- **Admin Dashboard** - Full system analytics and reporting
- **Mobile Responsive** - Works on all devices
- **API-First Architecture** - RESTful API with Ninja framework

## Prerequisites

- **Node.js** 18+ (for frontend & root npm scripts)
- **Python** 3.12+ (for backend & ML services)
- **Docker & Docker Compose** (for database, Redis, Nginx)
- **Git** (for version control)
- **PostgreSQL** 15+ (via Docker)
- **Redis** (via Docker, for caching & Celery)

## Quick Start

```bash

git clone https://github.com/yourusername/ticketme.git
cd TIcketMe
npm run setup
npm run dev
```

This will:

- Install all npm dependencies
- Set up frontend with npm
- Create Python virtual environment & install dependencies
- Configure environment variables
- Start Docker containers
- Launch development servers

## Docker Commands

### Container Management

```bash
npm run docker:up        # Start all containers
npm run docker:down      # Stop & remove containers
npm run docker:stop      # Stop containers (keep state)
npm run docker:status    # View running containers

npm run docker:rebuild   # Rebuild & restart containers
npm run docker:logs      # View real-time container logs
npm run docker:nuke      # Complete cleanup (remove volumes & images)
```

## Database & Migrations

### Migrations

```bash
npm run db:makemigrations   # Create new migrations
npm run db:migrate          # Apply pending migrations
npm run db:seed             # Load seed data
```

### Manual Database Access

```bash
# Connect to PostgreSQL
docker exec -it helpdesk_postgres_db psql -U admin -d helpdesk_db

# View tables
\dt

# Exit
\q
```

## Testing

### Run All Tests

```bash
npm run test        # Frontend + Backend tests
```

### Component-Specific Tests

```bash
npm run test:client  # React component tests
npm run test:server  # Django/pytest tests
```

### Creating Test Data

```bash
# Database shell
docker exec -it helpdesk_postgres_db psql -U admin -d helpdesk_db

# Or in Django shell
cd server
. venv/bin/activate
python manage.py shell
```

### Debugging

```bash
# Backend logs
npm run docker:logs

# Frontend browser dev tools (F12)

# Django debug toolbar included
# Check your browser's Network tab
```

## ML Service

The ML module provides AI-powered ticket analysis:

```bash
# Setup ML environment
cd ML
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Build FAISS index
python scripts/build_faiss.py

# Start ML service
python app.py
```

ML Service runs on: http://localhost:5000/api/

**Features:**

- Ticket categorization
- Priority auto-assignment
- Similar ticket detection
- Customer sentiment analysis

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Nginx Reverse Proxy](server/nginx/README.md)
- [Local Deployment Guide](server/LOCAL_DEPLOYMENT.md)
- [Docker Development Guide](server/DOCKER_DEVELOPMENT_GUIDE.md)
- [Multi-Channel Integration Plan](MULTI_CHANNEL_INTEGRATION_PLAN.md)

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

For questions or issues, please refer to the [troubleshooting section](#-troubleshooting) or open an issue on GitHub.

## API Documentation

API endpoints documented in: `server/docs/HelpDesk_API.postman_collection.json`

Import into Postman to test endpoints.

## Notes

- All database migrations must be applied before starting backend
- WebSocket requires backend to be running
- Frontend build outputs to `dist/` directory
- Static files collected during Docker build
