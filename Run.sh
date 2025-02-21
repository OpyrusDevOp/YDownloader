#!/bin/bash

# Exit on any error
set -e

# Store the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the build directory
cd "$SCRIPT_DIR/build"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install it first."
    exit 1
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg is not installed. Please install it first."
    exit 1
fi

# Check if required directories exist
if [ ! -d "dist" ]; then
    echo "Error: 'dist' directory not found. Please run build.sh first."
    exit 1
fi

if [ ! -d "downloads" ]; then
    echo "Creating downloads directory..."
    mkdir -p downloads
fi

# Check if requirements.txt exists and install dependencies
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    python3 -m pip install -r requirements.txt
else
    echo "Installing minimal required packages..."
    pipx install flask flask-cors pytubefix --include-deps
fi

# Start the Flask application
echo "Starting YouTube Downloader..."
echo "Access the application at http://localhost:5000"
python3 main.py
