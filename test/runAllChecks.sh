#!/bin/bash

GREEN="\\e[32m"
RED="\\e[31m"
YELLOW="\\e[33m"
BLUE="\\e[34m"
RESET="\\e[0m"

echo -e "${BLUE}===================="
echo -e " Running All Checks "
echo -e "====================${RESET}"

echo ""
echo -e "${YELLOW}1️⃣  API Checks...${RESET}"
node apiCheck.js

echo ""
echo -e "${YELLOW}2️⃣  Smoke Tests...${RESET}"
bash smokeTest.sh

echo ""
echo -e "${YELLOW}3️⃣  Database Integrity Checks...${RESET}"
psql -U merit_user -d merits -f dbCheck.sql

echo ""
echo -e "${YELLOW}4️⃣  CSV Upload Tests...${RESET}"
bash csvUploadTest.sh

echo ""
echo -e "${GREEN}✅ All checks completed.${RESET}"
