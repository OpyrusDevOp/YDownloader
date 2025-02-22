# Use Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install FFmpeg and clean up
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built application
COPY build/dist ./dist
COPY build/main.py .

# Create downloads directory
RUN mkdir downloads

# Set environment variables
ENV FLASK_APP=main.py
ENV FLASK_ENV=production

# Expose the port
EXPOSE 5000

# Run the application
CMD ["python", "main.py"]
