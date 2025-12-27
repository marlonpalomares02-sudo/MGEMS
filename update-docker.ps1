# MGEMS Docker Update Script
# This script updates the Docker container with the latest changes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MGEMS Docker Update with Latest Changes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host ""
    Write-Host "To start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop from Start Menu" -ForegroundColor Yellow
    Write-Host "2. Wait for Docker to fully start (green indicator)" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Read-Host "Press ENTER to exit"
    exit 1
}

Write-Host "Docker is running. Updating MGEMS container with latest changes..." -ForegroundColor Green
Write-Host ""

# Stop and remove existing containers
Write-Host "Step 1: Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Remove old images to ensure clean build
Write-Host "Step 2: Cleaning up old images..." -ForegroundColor Yellow
docker image prune -f

# Build fresh container with latest changes
Write-Host "Step 3: Building new container with latest changes..." -ForegroundColor Yellow
docker-compose build --no-cache

# Start the new container
Write-Host "Step 4: Starting updated container..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build or start the updated container" -ForegroundColor Red
    Read-Host "Press ENTER to exit"
    exit 1
}

Write-Host ""
Write-Host "Waiting for container to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if container is running properly
Write-Host "Step 5: Verifying container health..." -ForegroundColor Yellow
$containerStatus = docker-compose ps | Select-String "Up"

if ($containerStatus) {
    Write-Host ""
    Write-Host "SUCCESS! MGEMS has been updated with the latest changes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The Save Built-in Template functionality is now available in Docker!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Open your browser and go to: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To test the new feature:" -ForegroundColor Yellow
    Write-Host "1. Select a built-in template from the dropdown" -ForegroundColor Yellow
    Write-Host "2. Click the green 'Save Built-in Template' button" -ForegroundColor Yellow
    Write-Host "3. Enter a name and save the template" -ForegroundColor Yellow
    Write-Host "4. You'll be automatically redirected to the main UI" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Management commands:" -ForegroundColor Cyan
    Write-Host "- View logs: docker-compose logs -f" -ForegroundColor Cyan
    Write-Host "- Stop: docker-compose down" -ForegroundColor Cyan
    Write-Host "- Restart: docker-compose restart" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Container failed to start properly" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press ENTER to exit"