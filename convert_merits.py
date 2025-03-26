import csv
from collections import defaultdict

# Input and output file names
input_file = "input.csv"
output_file = "output.csv"

# Dictionary to store merit totals
merit_totals = defaultdict(int)

# Read and aggregate data
with open(input_file, mode='r', encoding='utf-8-sig') as file:
    reader = csv.DictReader(file)
    for row in reader:
        name = row["Name"].strip()
        try:
            points = int(row["Points"])
        except ValueError:
            continue  # Skip rows with invalid merit values
        merit_totals[name] += points

# Process and write output
with open(output_file, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["first_name", "last_name", "merits"])

    for name, total_merits in sorted(merit_totals.items()):
        parts = name.strip().split(maxsplit=1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''
        writer.writerow([first_name, last_name, total_merits])

print(f"Processed data written to '{output_file}'.")
