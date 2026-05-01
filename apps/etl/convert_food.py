import csv
import json
import os
import re

def parse_price(price_str):
    if not price_str:
        return 0, 0
    # Try to extract numbers from "50 - 100 THB" or "1,500 - 3,000 THB"
    # Remove commas and non-numeric chars except spaces and dashes
    clean = re.sub(r'[^\d\-\s]', '', price_str.replace(',', ''))
    parts = [p.strip() for p in clean.split('-') if p.strip()]
    
    min_avg = 0
    max_avg = 0
    
    try:
        if len(parts) >= 1:
            min_avg = int(parts[0])
        if len(parts) >= 2:
            max_avg = int(parts[1])
        else:
            max_avg = min_avg
    except ValueError:
        pass
        
    return min_avg, max_avg

def convert():
    csv_path = r'D:\codePublic2\SuperAI - AllWay-Thailand\apps\etl\hand-data\bangkok_restaurants.csv'
    output_path = r'D:\codePublic2\SuperAI - AllWay-Thailand\apps\web\src\lib\api\foodData.ts'
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return

    data = []
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Restaurant Name')
            price_raw = row.get('Average Price')
            location = row.get('Location')
            wongnai = row.get('Wongnai Link')
            coords = row.get('Coordinates (Lat, Long)')
            google_maps = row.get('Google Maps Search Link')
            image_url = row.get('imageUrl')
            
            if not name: continue
            
            min_avg, max_avg = parse_price(price_raw)
            
            lat = 0.0
            lng = 0.0
            if coords:
                c_parts = [p.strip() for p in coords.split(',')]
                if len(c_parts) >= 2:
                    try:
                        lat = float(c_parts[0])
                        lng = float(c_parts[1])
                    except:
                        pass
            
            data.append({
                "name": name,
                "price": price_raw,
                "min_avg": min_avg,
                "max_avg": max_avg,
                "location": location,
                "wongnai": wongnai,
                "lat": lat,
                "lng": lng,
                "imageUrl": image_url,
                "googleMapsUrl": google_maps
            })
            
    ts_content = f"export const FOOD_CSV_DATA: any[] = {json.dumps(data, indent=2)};\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    
    print(f"Successfully converted {len(data)} restaurants to {output_path}")

if __name__ == "__main__":
    convert()
