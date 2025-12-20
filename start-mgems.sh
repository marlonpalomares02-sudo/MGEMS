#!/bin/bash

# MGEMS Docker Startup Script
# Unix/Mac version

echo "Starting MGEMS Interview Buddy with Docker..."
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker Desktop first."
    echo ""
    echo "To start Docker Desktop:"
    echo "• Mac: Open Docker.app from Applications"
    echo "• Linux: Start Docker service with: sudo systemctl start docker"
    echo "• Wait for Docker to fully start (green indicator)"
    echo "• Run this script again"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Docker is running. Building and starting MGEMS container..."
echo ""

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Build and start the container
if ! docker-compose up --build -d; then
    echo "ERROR: Failed to start MGEMS container"
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "MGEMS is starting up..."
echo ""
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "SUCCESS! MGEMS is now running!"
    echo ""
    echo "Open your browser and go to: http://localhost:3000"
    echo ""
    echo "To stop MGEMS, run: docker-compose down"
    echo "To view logs, run: docker-compose logs -f"
else
    echo "ERROR: Container failed to start properly"
    echo "Check logs with: docker-compose logs"
fi

echo ""
read -p "Press Enter to continue..."