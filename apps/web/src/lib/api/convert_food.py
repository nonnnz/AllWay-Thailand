import csv
import json

csv_path = r'd:\codePublic2\SuperAI - AllWay-Thailand\apps\etl\hand-data\bangkok_restaurants.csv'
output_path = r'd:\codePublic2\SuperAI - AllWay-Thailand\apps\web\src\lib\api\foodData.ts'

food_data = []

with open(csv_path, mode='r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    header = next(reader)
    
    for i, row in enumerate(reader):
        if not row or len(row) < 5:
            continue
            
        if len(row) == 8:
             name = row[0]
             price = f"{row[1]}, {row[2]}"
             location = row[3]
             wongnai = row[4]
             coords_raw = row[5]
             gmaps = row[6]
             img = row[7]
        elif len(row) == 7:
             name = row[0]
             price = row[1]
             location = row[2]
             wongnai = row[3]
             coords_raw = row[4]
             gmaps = row[5]
             img = row[6]
        else:
             continue
             
        try:
            coords = coords_raw.strip('"').split(',')
            lat = float(coords[0].strip())
            lng = float(coords[1].strip())
        except Exception:
            continue
        
        import re
        
        def parse_price_range(p_str):
            # Matches strings like "50 - 100 THB" or "1,000 - 2,500 THB"
            # Some entries have extra quotes or spaces
            clean = p_str.replace(',', '').replace('"', '').replace('THB', '').strip()
            match = re.search(r'(\d+)\s*-\s*(\d+)', clean)
            if match:
                return int(match.group(1)), int(match.group(2))
            # Fallback for single numbers or messy data
            match_single = re.search(r'(\d+)', clean)
            if match_single:
                val = int(match_single.group(1))
                return val, val
            return None, None

        min_p, max_p = parse_price_range(price)
        
        # Mapping to the structure expected by csvToCard/csvToDetail in client.ts
        item = {
            "name": name,
            "price": price,
            "min_avg": min_p,
            "max_avg": max_p,
            "location": location,
            "wongnai": wongnai,
            "lat": lat,
            "lng": lng,
            "imageUrl": img,
            "googleMapsUrl": gmaps
        }
        food_data.append(item)

ts_content = f"export const FOOD_CSV_DATA: any[] = {json.dumps(food_data, indent=2)};\n"

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Successfully converted {len(food_data)} restaurants to {output_path}")
