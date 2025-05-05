#!/bin/bash

# Exit on any error
set -e

# Define paths
PROJECT_ROOT="$(pwd)"
BUILD_DIR="${PROJECT_ROOT}/build"
CLIENT_DIR="${PROJECT_ROOT}/src/client"
API_DIR="${PROJECT_ROOT}/src/Api"

# Clean previous build
echo "Cleaning previous build..."
rm -rf "${BUILD_DIR}"

# Create necessary directories
echo "Creating build directories..."
mkdir -p "${BUILD_DIR}/downloads"

# Build client
echo "Building client..."
cd "${CLIENT_DIR}"
npm install # More reliable than npm install for CI/CD
npm run build

# Copy files to build directory
echo "Copying files to build directory..."
cp -r dist "${BUILD_DIR}/"
cp "${API_DIR}/main.py" "${BUILD_DIR}/"

echo "Build completed successfully!"

# Validate build
if [ -f "${BUILD_DIR}/main.py" ] && [ -d "${BUILD_DIR}/dist" ] && [ -d "${BUILD_DIR}/downloads" ]; then
  echo "Build validation passed ✓"
else
  echo "Build validation failed! Missing required files or directories"
  exit 1
fi
