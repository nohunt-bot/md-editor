#!/bin/bash
# Skill.md Service - Development Setup Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Skill.md Service Setup"
echo "========================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ Java 17+ is required but not installed."; exit 1; }

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
echo "✓ Java version: $JAVA_VERSION"

# Create .env file if not exists
if [ ! -f "frontend/.env" ]; then
    echo "📝 Creating frontend/.env from example..."
    cp frontend/.env.example frontend/.env
fi

# Download Maven wrapper if not present
if [ ! -f "backend/.mvn/wrapper/maven-wrapper.jar" ]; then
    echo "📦 Downloading Maven wrapper..."
    mkdir -p backend/.mvn/wrapper
    curl -sL https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar \
        -o backend/.mvn/wrapper/maven-wrapper.jar
fi

# Start services
echo "🐳 Starting Docker services..."
if command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d
else
    docker compose up -d
fi

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Access URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8080"
echo "   Swagger:   http://localhost:8080/swagger-ui.html"
echo "   Keycloak:  http://localhost:8081 (admin/admin)"
echo "   MongoDB:   localhost:27017"
echo ""
echo "🔐 Test accounts:"
echo "   admin/admin   - Full admin access"
echo "   editor/editor - Can edit skills"
echo "   viewer/viewer - Read-only access"
echo ""
echo "📋 Useful commands:"
echo "   ./mvnw spring-boot:run     # Run backend locally"
echo "   docker-compose logs -f     # View logs"
echo "   docker-compose down        # Stop services"
echo "   docker-compose restart     # Restart services"
echo ""
