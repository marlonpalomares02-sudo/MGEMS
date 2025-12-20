# MGEMS Docker Startup Executable Scripts

This directory contains executable scripts to easily start MGEMS Interview Buddy using Docker Desktop.

## Available Scripts

### Windows
- **`start-mgems.bat`** - Double-click to run (Command Prompt version)
- **`start-mgems.ps1`** - PowerShell version with colored output

### macOS/Linux
- **`start-mgems.sh`** - Shell script for Unix systems

## How to Use

### Windows
1. Ensure Docker Desktop is installed and running
2. Double-click `start-mgems.bat` or run `start-mgems.ps1` in PowerShell
3. Wait for the script to build and start the container
4. Open http://localhost:3000 in your browser

### macOS/Linux
1. Ensure Docker Desktop is installed and running
2. Make the script executable: `chmod +x start-mgems.sh`
3. Run: `./start-mgems.sh`
4. Open http://localhost:3000 in your browser

## What the Scripts Do

1. **Check Docker Status**: Verify Docker Desktop is running
2. **Clean Up**: Stop any existing containers
3. **Build & Start**: Build the Docker image and start the container
4. **Verify**: Check if the container started successfully
5. **Provide Instructions**: Show the URL and management commands

## Manual Commands (Alternative)

If you prefer to run manually:
```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Troubleshooting

### Docker Not Running
The scripts will detect if Docker Desktop is not running and provide instructions to start it.

### Port Already in Use
If port 3000 is already in use, you can change it in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change to different port
```

### Build Issues
If the build fails, try:
```bash
docker-compose down
docker system prune -f
docker-compose up --build
```