@echo off
echo Starting MGEMS Interview Buddy with Docker...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    echo.
    echo To start Docker Desktop:
    echo 1. Open Docker Desktop from Start Menu
    echo 2. Wait for Docker to fully start (green indicator)
    echo 3. Run this script again
    pause
    exit /b 1
)

echo Docker is running. Building and starting MGEMS container...
echo.

REM Build and run the container
docker-compose down 2>nul
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start MGEMS container
    pause
    exit /b 1
)

echo.
echo MGEMS is starting up...
echo.
timeout /t 5 /nobreak >nul

REM Check if container is running
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo SUCCESS! MGEMS is now running!
    echo.
    echo Open your browser and go to: http://localhost:3000
    echo.
    echo NEW FEATURE: Save Built-in Template functionality is now available!
    echo - Select a built-in template from the dropdown
    echo - Click the green "Save Built-in Template" button
    echo - Enter a name and save it as your own template
    echo - You'll be automatically redirected to the main UI
    echo.
    echo To stop MGEMS, run: docker-compose down
    echo To view logs, run: docker-compose logs -f
) else (
    echo ERROR: Container failed to start properly
    echo Check logs with: docker-compose logs
)

echo.
pause