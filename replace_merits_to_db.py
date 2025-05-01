import psycopg2
import csv

conn = psycopg2.connect(
    dbname="merits",
    user="merit_user",
    password="clover8556",
    host="localhost"
)
cur = conn.cursor()

# Step 1: Create temporary table
cur.execute("""
    CREATE TEMP TABLE merit_upload (
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        merits INTEGER
    )
""")

# Step 2: Load the CSV into the temp table
with open("output.csv", "r") as f:
    next(f)  # skip header
    cur.copy_expert("COPY merit_upload FROM STDIN WITH CSV", f)

# Step 3: Update the main pupils table
cur.execute("""
    UPDATE pupils
    SET merits = pupils.merits + merit_upload.merits
    FROM merit_upload
    WHERE pupils.first_name = merit_upload.first_name
      AND pupils.last_name = merit_upload.last_name
""")

conn.commit()
cur.close()
conn.close()
