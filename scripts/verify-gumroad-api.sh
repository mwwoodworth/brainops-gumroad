#!/usr/bin/env bash
# Gumroad API Verification Script
# Run this after regenerating your access token to verify connectivity

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/brainops-lib.sh"
load_brainops_env

echo "=========================================="
echo "Gumroad API Verification"
echo "=========================================="

if [ -z "$GUMROAD_ACCESS_TOKEN" ]; then
    echo "ERROR: GUMROAD_ACCESS_TOKEN not set!"
    echo "Please set it in the BrainOps env (see /home/matt-woodworth/dev/_secure/BrainOps.env)"
    exit 1
fi

echo "Token found (${#GUMROAD_ACCESS_TOKEN} chars)"
echo ""

hdr_file="$(gumroad_header_file)"
cleanup() { rm -f "$hdr_file"; }
trap cleanup EXIT

# Test 1: User/Account Info
echo "1. Testing account access..."
USER_RESPONSE=$(curl -s "https://api.gumroad.com/v2/user" \
    -H @"$hdr_file")

if echo "$USER_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    EMAIL=$(echo "$USER_RESPONSE" | jq -r '.user.email')
    NAME=$(echo "$USER_RESPONSE" | jq -r '.user.name')
    echo "   SUCCESS - Logged in as: $NAME ($EMAIL)"
else
    echo "   FAILED - Token may be invalid"
    echo "   Response: $USER_RESPONSE"
    exit 1
fi
echo ""

# Test 2: List Products
echo "2. Checking products..."
PRODUCTS_RESPONSE=$(curl -s "https://api.gumroad.com/v2/products" \
    -H @"$hdr_file")

if echo "$PRODUCTS_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    PRODUCT_COUNT=$(echo "$PRODUCTS_RESPONSE" | jq '.products | length')
    echo "   SUCCESS - Found $PRODUCT_COUNT products"

    if [ "$PRODUCT_COUNT" -gt 0 ]; then
        echo "   Products:"
        echo "$PRODUCTS_RESPONSE" | jq -r '.products[] | "   - \(.name) (\(.published | if . then "PUBLISHED" else "DRAFT" end))"'
    fi
else
    echo "   FAILED to list products"
fi
echo ""

# Test 3: Check Sales (last 30 days)
echo "3. Checking recent sales..."
AFTER_DATE=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)
SALES_RESPONSE=$(curl -s "https://api.gumroad.com/v2/sales?after=$AFTER_DATE" \
    -H @"$hdr_file")

if echo "$SALES_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    SALES_COUNT=$(echo "$SALES_RESPONSE" | jq '.sales | length')
    echo "   SUCCESS - Found $SALES_COUNT sales in last 30 days"
else
    echo "   Could not retrieve sales data"
fi
echo ""

# Test 4: Check existing webhooks
echo "4. Checking webhook subscriptions..."
SUBS_RESPONSE=$(curl -s "https://api.gumroad.com/v2/resource_subscriptions" \
    -H @"$hdr_file")

if echo "$SUBS_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    SUBS_COUNT=$(echo "$SUBS_RESPONSE" | jq '.resource_subscriptions | length')
    echo "   Found $SUBS_COUNT webhook subscriptions"
    if [ "$SUBS_COUNT" -gt 0 ]; then
        echo "$SUBS_RESPONSE" | jq -r '.resource_subscriptions[] | "   - \(.resource_name): \(.post_url)"'
    fi
else
    echo "   Could not retrieve webhook info (may need to register)"
fi
echo ""

echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. If no webhooks registered, run: python3 /home/matt-woodworth/dev/brainops-ai-agents/gumroad_revenue_agent.py register_webhook"
echo "2. If no products on Gumroad, run: python3 /home/matt-woodworth/dev/brainops-ai-agents/gumroad_revenue_agent.py publish_products"
echo "3. Deploy to Render with updated GUMROAD_ACCESS_TOKEN"
