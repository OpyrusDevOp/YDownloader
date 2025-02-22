#!/bin/bash

# Exit on any error
set -e

# Store the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
APP_NAME="youtube-downloader"
IMAGE_NAME="youtube-downloader"
CONTAINER_PORT=5000
HOST_PORT=5000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check Docker installation
if ! command -v docker &>/dev/null; then
  log_error "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check if build directory exists
if [ ! -d "$SCRIPT_DIR/build" ]; then
  log_error "Build directory not found. Please run build.sh first."
  exit 1
fi

# Stop and remove existing container
if docker ps -a --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
  log_warn "Found existing container. Stopping and removing..."
  docker stop ${APP_NAME} >/dev/null 2>&1 || true
  docker rm ${APP_NAME} >/dev/null 2>&1 || true
fi

# Build the Docker image
log_info "Building Docker image..."
docker build -t ${IMAGE_NAME} . || {
  log_error "Failed to build Docker image"
  exit 1
}

# Create Docker volume if it doesn't exist
if ! docker volume ls --format '{{.Name}}' | grep -q "^${APP_NAME}-downloads$"; then
  log_info "Creating Docker volume for downloads..."
  docker volume create ${APP_NAME}-downloads >/dev/null
fi

# Run the container
log_info "Starting container..."
docker run -d \
  --name ${APP_NAME} \
  -p ${HOST_PORT}:${CONTAINER_PORT} \
  -v ${APP_NAME}-downloads:/app/downloads \
  --restart unless-stopped \
  ${IMAGE_NAME} || {
  log_error "Failed to start container"
  exit 1
}

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
  log_info "Container started successfully!"
  log_info "Application is running at http://localhost:${HOST_PORT}"

  # Show container logs
  log_info "Showing container logs (Ctrl+C to exit logs, container will keep running):"
  echo "----------------------------------------"
  docker logs -f ${APP_NAME}
else
  log_error "Container failed to start"
  exit 1
fi
