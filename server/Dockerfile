# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing pyc files to disc
# PYTHONUNBUFFERED: Ensures python output is sent straight to terminal (logs)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Make pip tolerant of slow/flaky networks (e.g. WSL2)
ENV PIP_DEFAULT_TIMEOUT=120
ENV PIP_RETRIES=10

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (needed for PostgreSQL)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the dependencies file to the working directory
COPY requirements.txt /app/

# Install Python dependencies
# (pip 25.x from the base image is fine; no separate upgrade step needed)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Run the Django server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
