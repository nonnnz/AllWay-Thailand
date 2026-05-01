import csv

csv_path = r'd:\codePublic2\SuperAI - AllWay-Thailand\apps\etl\hand-data\bangkok_restaurants.csv'

with open(csv_path, mode='r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Use csv.reader to parse the header correctly
header_reader = csv.reader([lines[0].strip()])
header = next(header_reader)

data_lines = lines[1:]
fixed_rows = []

for line in data_lines:
    if not line.strip():
        continue
    reader = csv.reader([line.strip()])
    try:
        row = next(reader)
    except StopIteration:
        continue
    
    if len(row) > 7:
        # Check if price is split
        if 'THB' in row[2] and any(c.isdigit() for c in row[1]):
            row = [row[0], f"{row[1].strip()}, {row[2].strip()}"] + row[3:]
    
    fixed_rows.append(row)

with open(csv_path, mode='w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(fixed_rows)

print("Fixed CSV correctly with proper header parsing.")
