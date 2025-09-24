#!/bin/bash

BASE_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:4001"

echo "🔍 Starting Admin API Smoke Test..."
echo "=================================="

# 1. Attempt to login and get a token
echo "Attempting to login as BOSS to get token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "12345678"}')

ACCESS_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.accessToken')

if [ "${ACCESS_TOKEN}" == "null" ] || [ -z "${ACCESS_TOKEN}" ]; then
  echo "❌ Failed to get access token. Please ensure backend is running and seed data is correct."
  echo "Login Response: ${LOGIN_RESPONSE}"
  exit 1
else
  echo "✅ Successfully obtained access token."
  # echo "Access Token: ${ACCESS_TOKEN}" # Uncomment to debug token
fi

echo ""
echo "🚀 Testing Admin API Endpoints..."
echo "=================================="

# Function to test an endpoint
test_endpoint() {
  local METHOD=$1
  local PATH=$2
  local EXPECTED_STATUS=$3
  local DESCRIPTION=$4

  echo "🧪 Testing: ${DESCRIPTION}"
  echo "   ${METHOD} ${PATH}"

  RESPONSE=$(curl -s -X "${METHOD}" "${BASE_URL}${PATH}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" \
    -o /dev/stdout)

  HTTP_STATUS=$(echo "${RESPONSE}" | tail -n 1)
  BODY=$(echo "${RESPONSE}" | head -n -1 | head -c 200) # Get first 200 chars of body

  if [ "${HTTP_STATUS}" == "${EXPECTED_STATUS}" ]; then
    echo "   Status: ${HTTP_STATUS}"
    echo "   ✅ OK"
  else
    echo "   Status: ${HTTP_STATUS}"
    echo "   ❌ Error (${HTTP_STATUS})"
  fi
  echo "   Response: ${BODY}..."
  echo ""
}

# Test Admin Services
test_endpoint "GET" "/admin/services" "200" "Admin Services"

# Test Admin Members
test_endpoint "GET" "/admin/members" "200" "Admin Members"

# Test Admin Artists
test_endpoint "GET" "/admin/artists" "200" "Admin Artists"

# Test Admin Appointments
test_endpoint "GET" "/admin/appointments" "200" "Admin Appointments"

# Test Admin Orders
test_endpoint "GET" "/admin/orders" "200" "Admin Orders"

# Test Diagnostics Ping
test_endpoint "GET" "/admin/diag/ping" "200" "Diagnostics Ping"

# Test Diagnostics Routes
test_endpoint "GET" "/admin/diag/routes" "200" "Diagnostics Routes"

echo "🎉 Admin API Smoke Test Complete!"
echo "=================================="