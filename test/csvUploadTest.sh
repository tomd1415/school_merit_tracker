#!/bin/bash

FULL_PIN="999999"
LOGIN_URL="http://localhost:3000/check-pin"
UPLOAD_PUPILS_URL="http://localhost:3000/upload/csv/pupils"
UPLOAD_MERITS_URL="http://localhost:3000/upload/csv/merits"
COOKIE_FILE="cookies.txt"

echo "Logging in with FULL PIN..."
login_status=$(
  curl -s -c $COOKIE_FILE -d "pin=$FULL_PIN" -X POST $LOGIN_URL -H "Content-Type: application/x-www-form-urlencoded" -o /dev/null -w "%{http_code}"
)

if [ "$login_status" -eq 303 ] || [ "$login_status" -eq 200 ]; then
  echo "[PASS] Logged in successfully."
else
  echo "[FAIL] Login failed with status $login_status"
  rm cookies.txt
  exit 1
fi

echo ""
echo "Testing Pupils CSV Upload..."
curl -s -b $COOKIE_FILE -F "csvFile=@meritupdate2.csv" $UPLOAD_PUPILS_URL -o pupils_response.txt
if grep -q "Inserted" pupils_response.txt; then
  echo "[PASS] Pupils CSV Upload"
else
  echo "[FAIL] Pupils CSV Upload"
  cat pupils_response.txt
fi

echo ""
echo "Testing Merits CSV Upload..."
curl -s -b $COOKIE_FILE -F "csvFile=@meritupdate2.csv" $UPLOAD_PUPILS_URL -o merits_response.txt
if grep -q "Inserted" merits_response.txt; then
  echo "[PASS] Merits CSV Upload"
else
  echo "[FAIL] Merits CSV Upload"
  cat merits_response.txt
fi

# Cleanup
rm pupils_response.txt merits_response.txt cookies.txt
