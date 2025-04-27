#!/bin/bash

FULL_PIN="999999"
LOGIN_URL="http://localhost:3000/check-pin"
COOKIE_FILE="cookies.txt"

echo "Logging in for Smoke Test..."
curl -s -c $COOKIE_FILE -d "pin=$FULL_PIN" -X POST $LOGIN_URL -H "Content-Type: application/x-www-form-urlencoded" -o /dev/null -w "%{http_code}"

SESSION_COOKIE=$(grep connect.sid $COOKIE_FILE | awk '{print $7"="$8}')
echo $SESSION_COOKIE >session_cookie.txt

URLS=(
  "http://localhost:3000/"
  "http://localhost:3000/pupils"
  "http://localhost:3000/prizes"
  "http://localhost:3000/purchase"
  "http://localhost:3000/forms"
  "http://localhost:3000/upload/csv/pupils"
  "http://localhost:3000/upload/csv/merits"
  "http://localhost:3000/logout"
)

echo ""
echo "Running Smoke Tests..."
for url in "${URLS[@]}"; do
  status=$(curl -o /dev/null -s -w "%{http_code}\n" -b $COOKIE_FILE -L $url)
  if [ "$status" -eq 200 ] || [ "$status" -eq 303 ]; then
    echo "[PASS] $url"
  else
    echo "[FAIL] $url - Status: $status"
  fi
done

rm $COOKIE_FILE
