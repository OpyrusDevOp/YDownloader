pipeline {
    agent { label 'Python-Agent' }

    environment {
        VENV = "venv"
        IMAGE_NAME = "flask-app"
        CONTAINER_NAME = "flask_prod"
        PORT = "5000"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                docker build -t ${IMAGE_NAME}:latest .
                """
            }
        }

        stage('Deploy to Container') {
            steps {
                sh """
                echo "Stopping old container if exists"
                docker rm -f ${CONTAINER_NAME} || true

                echo "Starting new container"
                docker run -d \
                  --name ${CONTAINER_NAME} \
                  -p ${PORT}:5000 \
                  ${IMAGE_NAME}:latest
                """
            }
        }
    }

    post {
        success { echo "✅ Build & deployment complete!" }
        failure { echo "❌ Something failed" }
    }
}
