#!/bin/bash

# ConvertKit Integration Setup Script
# Automates the setup of ConvertKit sequences and webhook integration

echo "🚀 ConvertKit Integration Setup for BrainOps Revenue Engine"
echo "=========================================================="
echo ""

# Configuration
CONVERTKIT_API_KEY="${CONVERTKIT_API_KEY:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUMROAD_DIR="$(dirname "$SCRIPT_DIR")"

# Step 1: Check dependencies
echo "📦 Checking dependencies..."
cd "$GUMROAD_DIR"

if [ ! -f "package.json" ]; then
    echo "   Creating package.json..."
    cat > package.json << 'EOF'
{
  "name": "brainops-gumroad-integration",
  "version": "1.0.0",
  "description": "Gumroad to ConvertKit automation",
  "scripts": {
    "setup-sequence": "node scripts/setup-convertkit-sequence.js",
    "webhook-server": "node scripts/gumroad-convertkit-webhook.js",
    "test-webhook": "curl -X POST http://localhost:3456/test -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"name\":\"Test User\"}'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  }
}
EOF
fi

echo "   Installing Node.js dependencies..."
npm install express axios --save

echo ""
echo "✅ Dependencies installed"
echo ""

# Step 2: Test ConvertKit API connection
echo "🔑 Testing ConvertKit API connection..."
API_TEST=$(curl -s "https://api.convertkit.com/v3/account?api_key=${CONVERTKIT_API_KEY}" | grep -c "primary_email")

if [ "$API_TEST" -eq 1 ]; then
    echo "   ✅ ConvertKit API key is valid"

    # Get account info
    ACCOUNT_INFO=$(curl -s "https://api.convertkit.com/v3/account?api_key=${CONVERTKIT_API_KEY}")
    echo "   Account: $(echo "$ACCOUNT_INFO" | grep -o '"name":"[^"]*' | cut -d'"' -f4)"
    echo "   Email: $(echo "$ACCOUNT_INFO" | grep -o '"primary_email":"[^"]*' | cut -d'"' -f4)"
else
    echo "   ❌ ConvertKit API key is invalid or connection failed"
    echo "   Please check your API key: ${CONVERTKIT_API_KEY}"
    exit 1
fi

echo ""

# Step 3: Get or create forms and sequences
echo "📝 Checking ConvertKit forms..."
FORMS=$(curl -s "https://api.convertkit.com/v3/forms?api_key=${CONVERTKIT_API_KEY}")
FORM_COUNT=$(echo "$FORMS" | grep -o '"id"' | wc -l)

echo "   Found ${FORM_COUNT} forms"

# Extract first form ID for default use
FORM_ID=$(echo "$FORMS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$FORM_ID" ]; then
    echo "   ⚠️ No forms found. Creating default form..."
    CREATE_FORM=$(curl -s -X POST "https://api.convertkit.com/v3/forms" \
        -d "api_key=${CONVERTKIT_API_KEY}" \
        -d "name=BrainOps Gumroad Customers")
    FORM_ID=$(echo "$CREATE_FORM" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "   Created form ID: ${FORM_ID}"
else
    echo "   Using form ID: ${FORM_ID}"
fi

echo ""

# Step 4: Create environment file
echo "🔧 Creating environment configuration..."
cat > "$GUMROAD_DIR/.env" << EOF
# ConvertKit Integration Configuration
CONVERTKIT_API_KEY=${CONVERTKIT_API_KEY}
CONVERTKIT_FORM_ID=${FORM_ID}

# Gumroad Webhook Configuration (update after Gumroad setup)
GUMROAD_WEBHOOK_SECRET=

# Server Configuration
PORT=3456
EOF

echo "   Created .env file with configuration"
echo ""

# Step 5: Create systemd service file (for production deployment)
echo "🚀 Creating deployment configuration..."
cat > "$GUMROAD_DIR/gumroad-webhook.service" << EOF
[Unit]
Description=Gumroad to ConvertKit Webhook Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$GUMROAD_DIR
ExecStart=/usr/bin/node $GUMROAD_DIR/scripts/gumroad-convertkit-webhook.js
Restart=on-failure
RestartSec=10
EnvironmentFile=$GUMROAD_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

echo "   Created systemd service file"
echo ""

# Step 6: Create deployment script for cloud platforms
cat > "$GUMROAD_DIR/deploy-webhook.sh" << 'EOF'
#!/bin/bash

# Deployment script for webhook server
echo "🚀 Deploying Gumroad-ConvertKit Webhook Server"
echo ""
echo "Choose deployment platform:"
echo "1) Local (development)"
echo "2) Render"
echo "3) Railway"
echo "4) Vercel (serverless)"
echo "5) Self-hosted (systemd)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo "Starting local development server..."
        npm run webhook-server
        ;;
    2)
        echo "Deploying to Render..."
        echo "1. Go to https://render.com"
        echo "2. Create new Web Service"
        echo "3. Connect GitHub repo"
        echo "4. Set build command: npm install"
        echo "5. Set start command: npm run webhook-server"
        echo "6. Add environment variables from .env"
        ;;
    3)
        echo "Deploying to Railway..."
        echo "1. Install Railway CLI: npm i -g @railway/cli"
        echo "2. Run: railway login"
        echo "3. Run: railway init"
        echo "4. Run: railway add"
        echo "5. Run: railway up"
        ;;
    4)
        echo "Creating Vercel serverless function..."
        mkdir -p api
        cp scripts/gumroad-convertkit-webhook.js api/webhook.js
        echo "Run: vercel deploy"
        ;;
    5)
        echo "Installing as system service..."
        sudo cp gumroad-webhook.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable gumroad-webhook
        sudo systemctl start gumroad-webhook
        echo "Service installed and started"
        ;;
esac
EOF

chmod +x "$GUMROAD_DIR/deploy-webhook.sh"

echo "   Created deploy-webhook.sh script"
echo ""

# Step 7: Test webhook locally
echo "🧪 Starting webhook server for testing..."
echo ""
echo "The server will start on port 3456"
echo "You can test it with:"
echo "  curl -X POST http://localhost:3456/test"
echo ""
echo "Press Ctrl+C to stop the server when done testing"
echo ""

# Create logs directory
mkdir -p "$GUMROAD_DIR/logs"

# Display summary
echo "==============================================="
echo "✅ ConvertKit Integration Setup Complete!"
echo "==============================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up email sequence:"
echo "   npm run setup-sequence"
echo ""
echo "2. Deploy webhook server:"
echo "   ./deploy-webhook.sh"
echo ""
echo "3. Configure Gumroad:"
echo "   - Go to: https://gumroad.com/settings/webhooks"
echo "   - Add webhook URL: https://your-domain.com/webhook/gumroad"
echo "   - Copy webhook secret to .env file"
echo ""
echo "4. Test integration:"
echo "   - Make a test purchase"
echo "   - Check ConvertKit for new subscriber"
echo ""
echo "📁 Important Files:"
echo "   Configuration: $GUMROAD_DIR/.env"
echo "   Webhook Server: $GUMROAD_DIR/scripts/gumroad-convertkit-webhook.js"
echo "   Sequence Setup: $GUMROAD_DIR/scripts/setup-convertkit-sequence.js"
echo "   Deployment: $GUMROAD_DIR/deploy-webhook.sh"
echo ""

# Optionally start the server
read -p "Start webhook server now? (y/n): " start_server
if [ "$start_server" = "y" ]; then
    cd "$GUMROAD_DIR"
    node scripts/gumroad-convertkit-webhook.js
fi