#!/bin/bash
echo "Running DB Integrity Checks..."
psql -U merit_user -d merits -f test/dbCheck.sql
