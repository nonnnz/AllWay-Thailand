"""
apps/etl/tat_fetcher.py

Fetches destination and attraction data from TAT (Tourism Authority of Thailand) API
and upserts into PostgreSQL.

TAT API docs: https://tatapi.tourismthailand.org/
Register for key at the same URL.

Provinces in scope for POC:
  Bangkok, Nonthaburi, Pathum Thani, Samut Prakan,
  Nakhon Pathom, Ayutthaya, Chachoengsao, Ratchaburi
"""

import os
import httpx
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

TAT_API_KEY = os.environ["TAT_API_KEY"]
TAT_BASE = os.getenv("TAT_API_BASE", "https://tatapi.tourismthailand.org/tatapi/v5")
DB_URL = os.environ["DATABASE_URL"]

# Provinces to fetch
SCOPE_PROVINCES = [
    "Bangkok", "Nonthaburi", "Pathum Thani", "Samut Prakan",
    "Nakhon Pathom", "Phra Nakhon Si Ayutthaya", "Chachoengsao", "Ratchaburi"
]

HEADERS = {
    "Authorization": f"Bearer {TAT_API_KEY}",
    "Accept-Language": "en",
}


def fetch_places(province: str, category_code: str = "ATTRACTION") -> list[dict]:
    """
    Fetch places from TAT API for a given province.
    category_code: ATTRACTION | ACCOMMODATION | RESTAURANT | SHOP | ACTIVITY
    <!-- DEEP DIVE: TAT API supports geosearch by lat/lon radius too -->
    """
    url = f"{TAT_BASE}/places/search"
    params = {
        "province": province,
        "categorycodes": category_code,
        "numberofresult": 50,
        "pagenumber": 1,
        "destination": province,
    }
    try:
        resp = httpx.get(url, headers=HEADERS, params=params, timeout=15, verify=False)
        resp.raise_for_status()
        data = resp.json()
        return data.get("result", [])
    except Exception as e:
        print(f"[TAT] Error fetching {province}/{category_code}: {e}")
        return []


def upsert_destinations(conn, places: list[dict], province: str):
    """Insert or update destinations in PostgreSQL."""
    cursor = conn.cursor()

    rows = []
    for p in places:
        location = p.get("location", {})
        rows.append((
            p.get("placeId", ""),        # tat_place_id
            p.get("placeName", ""),       # name (Thai)
            p.get("placeNameEn", p.get("placeName", "")),  # name (EN)
            province,
            location.get("latitude"),
            location.get("longitude"),
            p.get("categoryDescription", ""),
            p.get("coverImage", {}).get("url"),
            p.get("introduction", ""),
        ))

    if not rows:
        return

    execute_values(
        cursor,
        """
        INSERT INTO destinations ("tatPlaceId", name, "nameEn", province, latitude, longitude, category, "imageUrl", description, "createdAt", "updatedAt")
        VALUES %s
        ON CONFLICT ("tatPlaceId") DO UPDATE SET
          name = EXCLUDED.name,
          "imageUrl" = EXCLUDED."imageUrl",
          description = EXCLUDED.description,
          "updatedAt" = NOW()
        """,
        # Note: columns must match your actual Prisma-generated table columns
        # Prisma uses camelCase in schema but snake_case in DB
        [(
            r[0], r[1], r[2], r[3], r[4], r[5],
            [r[6]],   # category is text[] in schema
            r[7], r[8],
            "NOW()", "NOW()"
        ) for r in rows],
        template="(%s, %s, %s, %s, %s, %s, %s::text[], %s, %s, %s, %s)"
    )
    conn.commit()
    cursor.close()
    print(f"[TAT] Upserted {len(rows)} destinations for {province}")


def run():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    print("[ETL] Starting TAT destination fetch...")

    for province in SCOPE_PROVINCES:
        places = fetch_places(province, "ATTRACTION")
        upsert_destinations(conn, places, province)

    conn.close()
    print("[ETL] Done.")


if __name__ == "__main__":
    run()
