```markdown
# 🛠️ Help Desk Ticketing System - Core Backend

Welcome to the Core Backend of our Help Desk Ticketing System. This service is built with **Django & Django REST Framework / Ninja** and uses **PostgreSQL** as the primary database.

This repository is containerized using **Docker** for running the server, but we also recommend setting up a local virtual environment for the best development experience (IDE autocomplete & linting).

---

## 📌 Features

- ✅ **Ticket management** – create, update, assign, and track support tickets  
- ✅ **User authentication & roles** – customers, support agents, admins  
- ✅ **RESTful API** – fully documented, ready for frontend integration  
- ✅ **Dockerised** – run anywhere with zero local dependencies  
- ✅ **PostgreSQL** – production‑ready relational database  

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:

- Python 3.11+
- [Git](https://git-scm.com/downloads)
- [Docker](https://docs.docker.com/get-docker/)

---

## 💻 1. Local Setup (For VS Code / IDE Support)

While Docker runs the code, you need a local virtual environment so your IDE (like VS Code) recognizes Django imports and provides autocomplete.

### Step 1: Clone the Repository
```bash
git clone https://github.com/motamer294/graduation_project.git django_backend
cd django_backend
```

### Step 2: Create and Activate Virtual Environment
**For Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```
**For Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Requirements
```bash
pip install -r requirements.txt
```
*(After this, make sure to select this `venv` as your Python Interpreter in VS Code by pressing `Ctrl+Shift+P` -> `Python: Select Interpreter`)*.

---

## 🚀 2. Docker Setup (Running the Server)

### Step 1: Set Up Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
*(Default values for local development are already pre‑filled in the `.env` file).*

### Step 2: Build and Start the Containers (First Time Only)
Run this command to build the images and start the database and Django server:
```bash
docker compose up --build
```
*(Wait a few minutes for Docker to download PostgreSQL and install Python libraries inside the container).*

### Step 3: Run Database Migrations
Open a **new terminal window** (keep the server running in the first one) and execute:
```bash
docker exec -it helpdesk_django_app python manage.py migrate
```

### Step 4: Create a Superuser (Admin)
To access the admin panel, create your account:
```bash
docker exec -it helpdesk_django_app python manage.py createsuperuser
```
Follow the prompts to set your email, username, and password.

---

## 🌅 3. Daily Routine (How to start working every day)

You **do not** need to rebuild or migrate every day. When you open your computer to work, simply open the terminal in the project folder and run:
```bash
docker compose up
```
To stop the server when you are done, press `Ctrl+C` or run:
```bash
docker compose down
```

---

## 🌐 Access the System

| Service                            | URL                              |
|------------------------------------|----------------------------------|
| Django Backend / API               | `http://localhost:8000`          |
| Django Admin Panel                 | `http://localhost:8000/admin`    |
| **Interactive API Docs** (Swagger) | `http://localhost:8000/api/docs` |

You can also test the API using the provided Postman collection:  
`HelpDesk_API.postman_collection.json`

---

## 🛑 Useful Docker Commands

| Action                             | Command                                                          |
|------------------------------------|------------------------------------------------------------------|
| Stop all containers                | `docker compose down`                                            |
| Stop + remove volumes (fresh DB)   | `docker compose down -v`                                         |
| View logs                          | `docker compose logs -f`                                         |
| Open Django shell                  | `docker exec -it helpdesk_django_app python manage.py shell`     |
| Run any `manage.py` command        | `docker exec -it helpdesk_django_app python manage.py <command>` |
| Run Tests                          | `docker exec -it helpdesk_django_app pytest`                     |

---
Happy Coding! 💻🚀
```