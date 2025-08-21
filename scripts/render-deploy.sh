
#!/bin/bash

# BrillPrime Render Deployment Script
set -e

echo "🚀 Preparing BrillPrime for Render deployment..."

# Validate critical environment variables for Render
echo "🔍 Validating Render environment..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set - will be provided by Render PostgreSQL service"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET not set - configure in Render dashboard"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  SESSION_SECRET not set - configure in Render dashboard"
fi

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Build client for production
echo "🏗️  Building client application..."
cd client && npm run build && cd ..

# Run database migrations (will run on Render)
echo "📊 Database migrations will run automatically on Render..."

# Create production build
echo "🔧 Preparing production build..."
npm run build

echo "✅ Render deployment preparation completed!"
echo ""
echo "📝 Next steps for Render deployment:"
echo "1. Push code to GitHub repository"
echo "2. Connect repository to Render"
echo "3. Configure environment variables in Render dashboard:"
echo "   - DATABASE_URL (auto-configured with PostgreSQL add-on)"
echo "   - JWT_SECRET (generate 32+ character string)"
echo "   - SESSION_SECRET (generate 32+ character string)"
echo "   - PAYSTACK_SECRET_KEY (optional)"
echo "   - PAYSTACK_PUBLIC_KEY (optional)"
echo "   - REDIS_URL (auto-configured with Redis add-on)"
echo "4. Deploy using render.yaml configuration"
