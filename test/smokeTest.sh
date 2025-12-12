#!/bin/bash

# Simple smoke test using staff auth. Set STAFF_USERNAME and STAFF_PASSWORD in your env.
USERNAME="${STAFF_USERNAME:-}"
PASSWORD="${STAFF_PASSWORD:-}"
LOGIN_URL="http://localhost:3000/staff/login"
COOKIE_FILE="cookies.txt"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Set STAFF_USERNAME and STAFF_PASSWORD to run this smoke test."
  exit 0
fi

echo "Logging in for Smoke Test..."
curl -s -c "$COOKIE_FILE" -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  -o /dev/null -w "%{http_code}"

URLS=(
  "http://localhost:3000/"
  "http://localhost:3000/pupils"
  "http://localhost:3000/prizes"
  "http://localhost:3000/purchase"
  "http://localhost:3000/forms"
  "http://localhost:3000/upload/csv/pupils"
  "http://localhost:3000/upload/csv/merits"
)

echo ""
echo "Running Smoke Tests..."
for url in "${URLS[@]}"; do
  status=$(curl -o /dev/null -s -w "%{http_code}\n" -b "$COOKIE_FILE" -L "$url")
  if [ "$status" -eq 200 ] || [ "$status" -eq 303 ]; then
    echo "[PASS] $url"
  else
    echo "[FAIL] $url - Status: $status"
  fi
done

rm "$COOKIE_FILE"
