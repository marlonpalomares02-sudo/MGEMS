@echo off
echo ========================================
echo MGEMS Docker Update with Latest Changes
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Docker is running. Updating MGEMS container with latest changes...
echo.

REM Stop and remove existing containers
echo Step 1: Stopping existing containers...
docker-compose down

REM Remove old images to ensure clean build
echo Step 2: Cleaning up old images...
docker image prune -f

REM Build fresh container with latest changes
echo Step 3: Building new container with latest changes...
docker-compose build --no-cache

REM Start the new container
echo Step 4: Starting updated container...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to build or start the updated container
    pause
    exit /b 1
)

echo.
echo Waiting for container to start...
timeout /t 10 /nobreak >nul

REM Check if container is running properly
echo Step 5: Verifying container health...
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! MGEMS has been updated with the latest changes!
    echo.
    echo The Save Built-in Template functionality is now available in Docker!
    echo.
    echo Open your browser and go to: http://localhost:3000
    echo.
    echo To test the new feature:
    echo 1. Select a built-in template from the dropdown
    echo 2. Click the green "Save Built-in Template" button
    echo 3. Enter a name and save the template
    echo 4. You'll be automatically redirected to the main UI
    echo.
    echo Management commands:
    echo - View logs: docker-compose logs -f
    echo - Stop: docker-compose down
    echo - Restart: docker-compose restart
) else (
    echo ERROR: Container failed to start properly
    echo Check logs with: docker-compose logs
)

echo.
pause