#!/bin/bash

echo "🚀 Setting up LLM Tester UI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# LLM Tester UI Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_OLLAMA_URL=http://localhost:11434
EOF
    echo "✅ .env file created"
fi

# Create data directories for Electron app
echo "📁 Creating data directories..."
mkdir -p data/projects
mkdir -p data/uploads
mkdir -p data/exports
echo "✅ Data directories created"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start your LLM service (e.g., Ollama): ollama serve"
echo ""
echo "Development options:"
echo "2a. Run as web app: npm start"
echo "2b. Run as Electron app: npm run electron-dev"
echo ""
echo "3. Open the application:"
echo "   - Web: http://localhost:3000"
echo "   - Electron: Desktop application will open automatically"
echo ""
echo "Build options:"
echo "- Build for production: npm run build"
echo "- Package Electron app: npm run electron-pack"
echo "- Create distributable: npm run dist"
echo ""
echo "For more information, see README.md" 