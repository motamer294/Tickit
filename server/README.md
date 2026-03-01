# 🚑 Help Desk Backend API

This is the backend for the Graduation Project. It uses Django, Ninja, and PostgreSQL, fully containerized with Docker.

## 🚀 How to Run (The Magic Command)
You don't need to install Python or PostgreSQL. You just need **Docker Desktop**.

1. **Clone the repo:**
   ```bash
   git clone <https://github.com/motamer294/graduation_project.git>
   cd server
  
2. Start the Server:
Run this single command to build the environment and start the database:

Bash:
docker-compose up --build
3. Wait for it...
Wait until you see the log: Listening on http://0.0.0.0:8000.

📖 API Documentation
Once the server is running, you can access the interactive API docs here:
👉 http://localhost:8000/api/docs

Swagger UI: You can test endpoints directly in the browser.

OpenAPI Schema: You can download the openapi.json from here to generate frontend clients if needed.

🔑 Authentication & Users
The API uses JWT (JSON Web Tokens). You must obtain a token to access protected endpoints.

1. Default Credentials
Use these users to test different roles:
Role,Username,Password,Access Level
Manager,rescue_admin,password123,Can view ALL tickets.
Customer,test_customer,user123,Can only view OWN tickets.
(Note: If these users do not exist, run the setup command in the Troubleshooting section below).

2. How to Log In
POST to /api/token/pair with the username and password.

Copy the access token from the response.

Add it to your Headers:

Authorization: Bearer <YOUR_ACCESS_TOKEN>


Base URL: http://localhost:8000/api

CORS: Enabled for all origins (*). You should not face CORS issues when calling from React/Vue/Angular on localhost:3000.

🛠️ Common Commands (Docker)
If you need to run Django commands, use docker-compose exec:

Create a Superuser (if DB is empty):

Bash
docker-compose exec web python manage.py createsuperuser
Make Migrations:

Bash
docker-compose exec web python manage.py makemigrations
docker-compose exec web python manage.py migrate
Open Python Shell:

Bash
docker-compose exec web python manage.py shell