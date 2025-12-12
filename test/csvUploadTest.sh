#!/bin/bash

# CSV upload smoke test using staff auth. Set STAFF_USERNAME and STAFF_PASSWORD.
USERNAME="${STAFF_USERNAME:-}"
PASSWORD="${STAFF_PASSWORD:-}"
LOGIN_URL="http://localhost:3000/staff/login"
UPLOAD_PUPILS_URL="http://localhost:3000/upload/csv/pupils"
UPLOAD_MERITS_URL="http://localhost:3000/upload/csv/merits"
COOKIE_FILE="cookies.txt"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Set STAFF_USERNAME and STAFF_PASSWORD to run this test."
  exit 0
fi

echo "Logging in as admin..."
login_status=$(
  curl -s -c "$COOKIE_FILE" -X POST "$LOGIN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
    -o /dev/null -w "%{http_code}"
)

if [ "$login_status" -eq 200 ]; then
  echo "[PASS] Logged in successfully."
else
  echo "[FAIL] Login failed with status $login_status"
  rm -f "$COOKIE_FILE"
  exit 1
fi

echo ""
echo "Testing Pupils CSV Upload..."
curl -s -b "$COOKIE_FILE" -F "csvFile=@meritupdate2.csv" "$UPLOAD_PUPILS_URL" -o pupils_response.txt
if grep -q "Inserted" pupils_response.txt; then
  echo "[PASS] Pupils CSV Upload"
else
  echo "[FAIL] Pupils CSV Upload"
  cat pupils_response.txt
fi

echo ""
echo "Testing Merits CSV Upload..."
curl -s -b "$COOKIE_FILE" -F "csvFile=@meritupdate2.csv" "$UPLOAD_MERITS_URL" -o merits_response.txt
if grep -q "Inserted" merits_response.txt; then
  echo "[PASS] Merits CSV Upload"
else
  echo "[FAIL] Merits CSV Upload"
  cat merits_response.txt
fi

# Cleanup
rm -f pupils_response.txt merits_response.txt "$COOKIE_FILE"
