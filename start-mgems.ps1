# MGEMS Docker Startup Script
# PowerShell version for Windows

Write-Host "Starting MGEMS Interview Buddy with Docker..." -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host ""
    Write-Host "To start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop from Start Menu"
    Write-Host "2. Wait for Docker to fully start (green indicator)"
    Write-Host "3. Run this script again"
    Read-Host -Prompt "Press Enter to exit"
    exit 1
}

Write-Host "Docker is running. Building and starting MGEMS container..." -ForegroundColor Green
Write-Host ""

# Stop any existing containers
try {
    docker-compose down 2>$null | Out-Null
} catch {
    # Ignore errors if no containers are running
}

# Build and start the container
$buildResult = docker-compose up --build -d 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start MGEMS container" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    Read-Host -Prompt "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "MGEMS is starting up..." -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 5

# Check if container is running
$containerStatus = docker-compose ps
if ($containerStatus -match "Up") {
    Write-Host "SUCCESS! MGEMS is now running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Open your browser and go to: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To stop MGEMS, run: docker-compose down" -ForegroundColor Yellow
    Write-Host "To view logs, run: docker-compose logs -f" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Container failed to start properly" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs" -ForegroundColor Red
}

Write-Host ""
Read-Host -Prompt "Press Enter to continue"