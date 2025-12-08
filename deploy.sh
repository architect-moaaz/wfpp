#!/bin/bash

# WorkflowPP One-Click Deployment Script
# This script helps you deploy to your chosen platform

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║  WorkflowPP One-Click Deployment        ║"
echo "║  AI-Powered Workflow Platform            ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git repository not initialized${NC}"
    read -p "Initialize git repository? (y/n): " init_git
    if [ "$init_git" = "y" ]; then
        git init
        git add .
        git commit -m "Initial commit"
        echo -e "${GREEN}✅ Git initialized${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Choose your deployment platform:${NC}"
echo ""
echo "  1) 🎨 Render.com          - Recommended (Easiest, $25/mo)"
echo "  2) 🚂 Railway.app         - Fastest Setup (3 min, $20/mo)"
echo "  3) ✈️  Fly.io              - Global Edge (Best performance)"
echo "  4) ☁️  Heroku              - Enterprise Ready ($50/mo)"
echo "  5) 🌊 DigitalOcean        - Balanced ($40/mo)"
echo "  6) ℹ️  More Info           - Compare all options"
echo "  7) ❌ Exit"
echo ""
read -p "Enter your choice [1-7]: " choice

case $choice in
  1)
    echo ""
    echo -e "${GREEN}🎨 Deploying to Render.com${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Steps:"
    echo "1. Visit https://render.com and sign up (free)"
    echo "2. Click 'New +' → 'Blueprint'"
    echo "3. Connect your GitHub repository"
    echo "4. Render will auto-detect render.yaml"
    echo "5. Set your ANTHROPIC_API_KEY in the dashboard"
    echo "6. Click 'Apply' and wait 5-10 minutes"
    echo ""
    echo "Cost: ~$25/month (starter plan)"
    echo ""
    read -p "Open Render.com in browser? (y/n): " open_render
    if [ "$open_render" = "y" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "https://render.com/deploy"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "https://render.com/deploy"
        else
            echo "Visit: https://render.com/deploy"
        fi
    fi
    ;;

  2)
    echo ""
    echo -e "${GREEN}🚂 Deploying to Railway.app${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi

    echo "Logging in to Railway..."
    railway login

    echo ""
    echo "Initializing Railway project..."
    railway init

    echo ""
    echo "Adding PostgreSQL database..."
    railway add --plugin postgresql

    echo ""
    echo "Adding Redis cache..."
    railway add --plugin redis

    echo ""
    echo "Setting environment variables..."
    read -p "Enter your ANTHROPIC_API_KEY: " api_key
    railway variables set ANTHROPIC_API_KEY="$api_key"

    echo ""
    echo "Deploying application..."
    railway up

    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "Getting your app URL..."
    railway domain

    echo ""
    echo "View logs with: railway logs"
    echo "Open dashboard with: railway open"
    ;;

  3)
    echo ""
    echo -e "${GREEN}✈️  Deploying to Fly.io${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if flyctl is installed
    if ! command -v flyctl &> /dev/null; then
        echo "Installing Fly.io CLI..."
        curl -L https://fly.io/install.sh | sh
        export FLYCTL_INSTALL="/home/$USER/.fly"
        export PATH="$FLYCTL_INSTALL/bin:$PATH"
    fi

    echo "Logging in to Fly.io..."
    flyctl auth login

    echo ""
    echo "Launching application..."
    flyctl launch --now

    echo ""
    echo "Creating PostgreSQL database..."
    flyctl postgres create

    echo ""
    echo "Creating Redis cache..."
    flyctl redis create

    echo ""
    echo "Setting secrets..."
    read -p "Enter your ANTHROPIC_API_KEY: " api_key
    flyctl secrets set ANTHROPIC_API_KEY="$api_key"

    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo "Access your app with: flyctl open"
    ;;

  4)
    echo ""
    echo -e "${GREEN}☁️  Deploying to Heroku${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        echo "Installing Heroku CLI..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew tap heroku/brew && brew install heroku
        else
            curl https://cli-assets.heroku.com/install.sh | sh
        fi
    fi

    echo "Logging in to Heroku..."
    heroku login

    echo ""
    read -p "Enter app name (e.g., my-workflow-app): " app_name

    echo "Creating Heroku app..."
    heroku create "$app_name"

    echo ""
    echo "Adding PostgreSQL..."
    heroku addons:create heroku-postgresql:mini

    echo ""
    echo "Adding Redis..."
    heroku addons:create heroku-redis:mini

    echo ""
    echo "Setting environment variables..."
    read -p "Enter your ANTHROPIC_API_KEY: " api_key
    heroku config:set ANTHROPIC_API_KEY="$api_key"

    echo ""
    echo "Deploying to Heroku..."
    git push heroku main

    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo "Open your app with: heroku open"
    ;;

  5)
    echo ""
    echo -e "${GREEN}🌊 Deploying to DigitalOcean App Platform${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Steps:"
    echo "1. Visit https://cloud.digitalocean.com/apps/new"
    echo "2. Connect your GitHub repository"
    echo "3. DigitalOcean will auto-detect your app"
    echo "4. Add a Managed Database (PostgreSQL)"
    echo "5. Add a Redis database"
    echo "6. Set ANTHROPIC_API_KEY in environment variables"
    echo "7. Click 'Create Resources'"
    echo ""
    read -p "Open DigitalOcean App Platform? (y/n): " open_do
    if [ "$open_do" = "y" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "https://cloud.digitalocean.com/apps/new"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "https://cloud.digitalocean.com/apps/new"
        else
            echo "Visit: https://cloud.digitalocean.com/apps/new"
        fi
    fi
    ;;

  6)
    echo ""
    echo "📊 Platform Comparison"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat ONE_CLICK_DEPLOY.md | head -50
    echo ""
    echo "See ONE_CLICK_DEPLOY.md for full comparison"
    ;;

  7)
    echo "Goodbye!"
    exit 0
    ;;

  *)
    echo -e "${RED}❌ Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for deployment to finish (5-10 minutes)"
echo "2. Check deployment logs on your platform dashboard"
echo "3. Test your application at the provided URL"
echo "4. Set up custom domain (optional)"
echo "5. Enable SSL certificate (usually automatic)"
echo ""
echo "Need help? Check:"
echo "- ONE_CLICK_DEPLOY.md for detailed instructions"
echo "- DEPLOYMENT.md for production deployment guide"
echo ""
