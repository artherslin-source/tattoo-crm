#!/bin/bash

# API Smoke Test Script for Admin Endpoints
# This script tests all admin API endpoints

BASE_URL="http://localhost:4000"
ADMIN_EMAIL="admin@test.com"
ADMIN_PASSWORD="12345678"

echo "🔍 Starting Admin API Smoke Test..."
echo "=================================="

# Function to get access token
get_token() {
    echo "🔐 Getting access token..."
    local response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    local token=$(echo "$response" | jq -r '.accessToken // empty')
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo "❌ Failed to get access token"
        echo "Response: $response"
        exit 1
    fi
    
    echo "✅ Access token obtained"
    echo "$token"
}

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local token="$3"
    local description="$4"
    
    echo ""
    echo "🧪 Testing: $description"
    echo "   $method $endpoint"
    
    local response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)
    
    echo "   Status: $status_code"
    
    if [ "$status_code" = "200" ]; then
        echo "   ✅ Success"
        # Show first 100 characters of response
        echo "   Response: $(echo "$body" | head -c 100)..."
    elif [ "$status_code" = "401" ]; then
        echo "   ⚠️  Unauthorized"
    elif [ "$status_code" = "404" ]; then
        echo "   ❌ Not Found"
    else
        echo "   ❌ Error ($status_code)"
        echo "   Response: $body"
    fi
}

# Main execution
main() {
    # Get access token
    TOKEN=$(get_token)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Cannot proceed without access token"
        exit 1
    fi
    
    echo ""
    echo "🚀 Testing Admin API Endpoints..."
    echo "=================================="
    
    # Test all admin endpoints
    test_endpoint "GET" "/admin/services" "$TOKEN" "Admin Services"
    test_endpoint "GET" "/admin/members" "$TOKEN" "Admin Members"
    test_endpoint "GET" "/admin/artists" "$TOKEN" "Admin Artists"
    test_endpoint "GET" "/admin/appointments" "$TOKEN" "Admin Appointments"
    test_endpoint "GET" "/admin/orders" "$TOKEN" "Admin Orders"
    test_endpoint "GET" "/admin/diag/ping" "$TOKEN" "Diagnostics Ping"
    test_endpoint "GET" "/admin/diag/routes" "$TOKEN" "Diagnostics Routes"
    
    echo ""
    echo "🎉 Admin API Smoke Test Complete!"
    echo "=================================="
}

# Run main function
main
