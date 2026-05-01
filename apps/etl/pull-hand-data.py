#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

ROOT = Path(__file__).parent / "hand-data"
DEFAULT_CSV = ROOT / "tat_master.csv"
DEFAULT_JSON = ROOT / "tat_master.json"
DEFAULT_RESTAURANTS_CSV = ROOT / "bangkok_restaurants.csv"
MAX_PREVIEW_ROWS = 3
MAX_PREVIEW_COLS = 30

KIND_MAP = {
    "attraction": "ATTRACTION",
    "สถานที่ท่องเที่ยว": "ATTRACTION",
    "restaurant": "RESTAURANT",
    "ร้านอาหาร": "RESTAURANT",
    "accommodation": "ACCOMMODATION",
    "ที่พัก": "ACCOMMODATION",
    "event": "EVENT",
    "กิจกรรม": "EVENT",
    "route": "ROUTE",
    "article": "ARTICLE",
}


def now_utc() -> datetime:
    return datetime.now(UTC)


def clean_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def to_int(value: object) -> int | None:
    text = clean_text(value)
    if text is None:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def to_float(value: object) -> float | None:
    text = clean_text(value)
    if text is None:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def to_iso_datetime(value: object) -> datetime | None:
    text = clean_text(value)
    if text is None:
        return None
    normalized = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def normalize_kind(value: object) -> str:
    text = (clean_text(value) or "").lower()
    return KIND_MAP.get(text, "OTHER")


def parse_tags(value: object) -> list[str]:
    text = clean_text(value)
    if text is None:
        return []
    if text.startswith("[") and text.endswith("]"):
        try:
            maybe_json = json.loads(text)
            if isinstance(maybe_json, list):
                return [str(item).strip() for item in maybe_json if str(item).strip()]
        except json.JSONDecodeError:
            pass
    return [part.strip() for part in text.split("|") if part.strip()]


PRICE_RANGE_PATTERN = re.compile(
    r"^\s*([\d,]+(?:\.\d+)?)\s*-\s*([\d,]+(?:\.\d+)?)\s*THB\s*$",
    re.IGNORECASE,
)


def parse_price_range(value: object) -> tuple[float | None, float | None]:
    text = clean_text(value)
    if text is None:
        return (None, None)
    match = PRICE_RANGE_PATTERN.match(text)
    if not match:
        return (None, None)
    low = float(match.group(1).replace(",", ""))
    high = float(match.group(2).replace(",", ""))
    return (low, high)


def parse_lat_lon(value: object) -> tuple[float | None, float | None]:
    text = clean_text(value)
    if text is None:
        return (None, None)
    pieces = [piece.strip() for piece in text.split(",")]
    if len(pieces) != 2:
        return (None, None)
    lat = to_float(pieces[0])
    lon = to_float(pieces[1])
    if lat is None or lon is None:
        return (None, None)
    return (lat, lon)


def parse_location_parts(value: object) -> tuple[str | None, str | None]:
    text = clean_text(value)
    if text is None:
        return (None, None)
    parts = [part.strip() for part in text.split("/")]
    area = parts[0] if parts and parts[0] else None
    district = parts[1] if len(parts) > 1 and parts[1] else None
    return (area, district)


def iter_rows(csv_path: Path) -> Iterable[dict[str, object]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            yield row


def preview_files() -> None:
    print(f"ROOT: {ROOT}")
    for file_path in sorted(ROOT.rglob("*")):
        if not file_path.is_file():
            continue
        ext = file_path.suffix.lower()
        print("\n" + "=" * 80)
        print(f"FILE: {file_path.relative_to(ROOT)}")
        print(f"SIZE: {file_path.stat().st_size} bytes")

        if ext in [".csv", ".txt"]:
            with file_path.open("r", encoding="utf-8-sig", newline="") as file:
                reader = csv.DictReader(file)
                columns = (reader.fieldnames or [])[:MAX_PREVIEW_COLS]
                rows = []
                for idx, row in enumerate(reader):
                    if idx >= MAX_PREVIEW_ROWS:
                        break
                    rows.append({key: row.get(key) for key in columns})
                print(json.dumps({"columns": columns, "sample_rows": rows}, ensure_ascii=False, indent=2))
        elif ext == ".json":
            with file_path.open("r", encoding="utf-8") as file:
                data = json.load(file)
            if isinstance(data, list):
                rows = data[:MAX_PREVIEW_ROWS]
                columns = list({k for row in rows if isinstance(row, dict) for k in row.keys()})[:MAX_PREVIEW_COLS]
                sample_rows = [{k: row.get(k) if isinstance(row, dict) else row for k in columns} for row in rows]
                print(json.dumps({"columns": columns, "sample_rows": sample_rows}, ensure_ascii=False, indent=2))
            elif isinstance(data, dict):
                columns = list(data.keys())[:MAX_PREVIEW_COLS]
                sample_rows = [{k: data.get(k) for k in columns}]
                print(json.dumps({"columns": columns, "sample_rows": sample_rows}, ensure_ascii=False, indent=2))
            else:
                print(json.dumps({"columns": [], "sample_rows": [data]}, ensure_ascii=False, indent=2))
        else:
            print(json.dumps({"note": f"preview not implemented for {ext}"}, ensure_ascii=False))


def build_province_row(raw: dict[str, object]) -> tuple[int, str, str] | None:
    province_id = to_int(raw.get("province_id"))
    province_name_th = clean_text(raw.get("province"))
    if province_id is None or province_name_th is None:
        return None
    return (province_id, province_name_th, province_name_th)


def build_tat_poi_row(raw: dict[str, object]) -> tuple | None:
    source_id = clean_text(raw.get("id"))
    name = clean_text(raw.get("name"))
    if source_id is None or name is None:
        return None

    return (
        f"tatpoi:{normalize_kind(raw.get('kind')).lower()}:{source_id}",
        normalize_kind(raw.get("kind")),
        source_id,
        clean_text(raw.get("migrate_id")),
        clean_text(raw.get("slug")),
        clean_text(raw.get("status")),
        name,
        name,
        to_int(raw.get("category_id")),
        clean_text(raw.get("category_name")),
        clean_text(raw.get("introduction")),
        to_float(raw.get("latitude")),
        to_float(raw.get("longitude")),
        clean_text(raw.get("address")),
        to_int(raw.get("province_id")),
        to_int(raw.get("district_id")),
        clean_text(raw.get("district")),
        to_int(raw.get("subdistrict_id")),
        clean_text(raw.get("subdistrict")),
        clean_text(raw.get("postcode")),
        clean_text(raw.get("thumbnail_url")),
        parse_tags(raw.get("tags")),
        to_int(raw.get("viewer")),
        clean_text(raw.get("sha_name")),
        clean_text(raw.get("sha_type")),
        clean_text(raw.get("sha_category")),
        clean_text(raw.get("sha_thumbnail")),
        to_iso_datetime(raw.get("start_date")),
        to_iso_datetime(raw.get("end_date")),
        to_iso_datetime(raw.get("created_at")),
        to_iso_datetime(raw.get("updated_at")),
    )


def build_destination_row(raw: dict[str, object]) -> tuple | None:
    tat_place_id = clean_text(raw.get("id"))
    name = clean_text(raw.get("name"))
    if tat_place_id is None or name is None:
        return None

    category_name = clean_text(raw.get("category_name")) or "other"
    return (
        f"dest:tat:{tat_place_id}",
        name,
        name,
        clean_text(raw.get("province")),
        to_int(raw.get("province_id")),
        clean_text(raw.get("district")),
        clean_text(raw.get("subdistrict")),
        clean_text(raw.get("postcode")),
        to_float(raw.get("latitude")),
        to_float(raw.get("longitude")),
        [category_name],
        [],
        [],
        [],
        tat_place_id,
        clean_text(raw.get("migrate_id")),
        normalize_kind(raw.get("kind")),
        to_iso_datetime(raw.get("updated_at")),
        clean_text(raw.get("sha_name")),
        clean_text(raw.get("sha_type")),
        clean_text(raw.get("sha_category")),
        clean_text(raw.get("sha_thumbnail")),
        clean_text(raw.get("thumbnail_url")),
        clean_text(raw.get("introduction")),
    )


def build_restaurant_price_row(raw: dict[str, object], source_file: str) -> tuple | None:
    name = clean_text(raw.get("Restaurant Name"))
    avg_price_text = clean_text(raw.get("Average Price"))
    location_text = clean_text(raw.get("Location"))
    wongnai_url = clean_text(raw.get("Wongnai Link"))
    google_maps_url = clean_text(raw.get("Google Maps Search Link"))
    lat, lon = parse_lat_lon(raw.get("Coordinates (Lat, Long)"))
    if name is None or avg_price_text is None or lat is None or lon is None:
        return None

    area, district = parse_location_parts(location_text)
    price_min, price_max = parse_price_range(avg_price_text)
    source_external_id = wongnai_url or google_maps_url or f"{name}:{lat:.6f}:{lon:.6f}"
    row_hash = hashlib.sha1(
        json.dumps(raw, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return (
        f"restprice:{row_hash}",
        name,
        area,
        district,
        location_text,
        lat,
        lon,
        avg_price_text,
        price_min,
        price_max,
        "THB",
        wongnai_url,
        google_maps_url,
        "bangkok_restaurants_csv",
        source_external_id,
        row_hash,
        source_file,
    )


def ensure_restaurant_price_points_table(conn) -> None:
    query = """
        CREATE TABLE IF NOT EXISTS restaurant_price_points (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            area TEXT,
            district TEXT,
            "locationText" TEXT,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            "avgPriceText" TEXT NOT NULL,
            "priceMin" DOUBLE PRECISION,
            "priceMax" DOUBLE PRECISION,
            currency TEXT NOT NULL DEFAULT 'THB',
            "wongnaiUrl" TEXT,
            "googleMapsUrl" TEXT,
            source TEXT NOT NULL DEFAULT 'bangkok_restaurants_csv',
            "sourceExternalId" TEXT,
            "sourceRowHash" TEXT NOT NULL UNIQUE,
            "sourceFile" TEXT,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_restaurant_price_points_lat_lon ON restaurant_price_points(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_restaurant_price_points_district ON restaurant_price_points(district);
        CREATE INDEX IF NOT EXISTS idx_restaurant_price_points_price ON restaurant_price_points("priceMin", "priceMax");
        CREATE INDEX IF NOT EXISTS idx_restaurant_price_points_source_ext ON restaurant_price_points(source, "sourceExternalId");
    """
    with conn.cursor() as cursor:
        cursor.execute(query)


def upsert_restaurant_price_points(conn, rows: list[tuple]) -> None:
    if not rows:
        return
    deduped: dict[str, tuple] = {}
    for row in rows:
        deduped[row[15]] = row
    query = """
        INSERT INTO restaurant_price_points (
            id, name, area, district, "locationText",
            latitude, longitude, "avgPriceText", "priceMin", "priceMax", currency,
            "wongnaiUrl", "googleMapsUrl", source, "sourceExternalId", "sourceRowHash", "sourceFile",
            "createdAt", "updatedAt"
        )
        VALUES %s
        ON CONFLICT ("sourceRowHash") DO UPDATE SET
            name = EXCLUDED.name,
            area = EXCLUDED.area,
            district = EXCLUDED.district,
            "locationText" = EXCLUDED."locationText",
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            "avgPriceText" = EXCLUDED."avgPriceText",
            "priceMin" = EXCLUDED."priceMin",
            "priceMax" = EXCLUDED."priceMax",
            currency = EXCLUDED.currency,
            "wongnaiUrl" = EXCLUDED."wongnaiUrl",
            "googleMapsUrl" = EXCLUDED."googleMapsUrl",
            source = EXCLUDED.source,
            "sourceExternalId" = EXCLUDED."sourceExternalId",
            "sourceFile" = EXCLUDED."sourceFile",
            "updatedAt" = NOW()
    """
    payload = [(*row, now_utc(), now_utc()) for row in deduped.values()]
    with conn.cursor() as cursor:
        execute_values(cursor, query, payload)


def upsert_provinces(conn, rows: list[tuple[int, str, str]]) -> None:
    if not rows:
        return
    query = """
        INSERT INTO provinces (id, "nameTh", "nameEn", region, "isSecondary", "createdAt", "updatedAt")
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            "nameTh" = EXCLUDED."nameTh",
            "nameEn" = EXCLUDED."nameEn",
            "updatedAt" = NOW()
    """
    payload = [(row[0], row[1], row[2], None, False, now_utc(), now_utc()) for row in rows]
    with conn.cursor() as cursor:
        execute_values(cursor, query, payload)


def upsert_tat_pois(conn, rows: list[tuple]) -> None:
    if not rows:
        return
    deduped: dict[tuple[str, str], tuple] = {}
    for row in rows:
        deduped[(row[1], row[2])] = row

    query = """
        INSERT INTO tat_pois (
            id, kind, "sourceId", "migrateId", slug, status, name, "nameEn",
            "categoryId", "categoryName", introduction, latitude, longitude, address,
            "provinceId", "districtId", district, "subdistrictId", subdistrict, postcode,
            "thumbnailUrl", tags, "viewerCount", "shaName", "shaType", "shaCategory", "shaThumbnail",
            "startDate", "endDate", "createdAtSource", "updatedAtSource", "lastSyncedAt"
        )
        VALUES %s
        ON CONFLICT (kind, "sourceId") DO UPDATE SET
            "migrateId" = EXCLUDED."migrateId",
            slug = EXCLUDED.slug,
            status = EXCLUDED.status,
            name = EXCLUDED.name,
            "nameEn" = EXCLUDED."nameEn",
            "categoryId" = EXCLUDED."categoryId",
            "categoryName" = EXCLUDED."categoryName",
            introduction = EXCLUDED.introduction,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            address = EXCLUDED.address,
            "provinceId" = EXCLUDED."provinceId",
            "districtId" = EXCLUDED."districtId",
            district = EXCLUDED.district,
            "subdistrictId" = EXCLUDED."subdistrictId",
            subdistrict = EXCLUDED.subdistrict,
            postcode = EXCLUDED.postcode,
            "thumbnailUrl" = EXCLUDED."thumbnailUrl",
            tags = EXCLUDED.tags,
            "viewerCount" = EXCLUDED."viewerCount",
            "shaName" = EXCLUDED."shaName",
            "shaType" = EXCLUDED."shaType",
            "shaCategory" = EXCLUDED."shaCategory",
            "shaThumbnail" = EXCLUDED."shaThumbnail",
            "startDate" = EXCLUDED."startDate",
            "endDate" = EXCLUDED."endDate",
            "createdAtSource" = EXCLUDED."createdAtSource",
            "updatedAtSource" = EXCLUDED."updatedAtSource",
            "lastSyncedAt" = NOW()
    """
    payload = [(*row, now_utc()) for row in deduped.values()]
    with conn.cursor() as cursor:
        execute_values(cursor, query, payload)


def upsert_destinations(conn, rows: list[tuple]) -> None:
    if not rows:
        return
    deduped: dict[str, tuple] = {}
    for row in rows:
        deduped[row[14]] = row

    query = """
        INSERT INTO destinations (
            id, name, "nameEn", province, "provinceId", district, subdistrict, postcode,
            latitude, longitude, category, "vibeTags", "culturalDos", "culturalDonts",
            "tatPlaceId", "migrateId", "sourceKind", "sourceUpdatedAt",
            "shaName", "shaType", "shaCategory", "shaThumbnail", "imageUrl", description,
            "createdAt", "updatedAt"
        )
        VALUES %s
        ON CONFLICT ("tatPlaceId") DO UPDATE SET
            name = EXCLUDED.name,
            "nameEn" = EXCLUDED."nameEn",
            province = EXCLUDED.province,
            "provinceId" = EXCLUDED."provinceId",
            district = EXCLUDED.district,
            subdistrict = EXCLUDED.subdistrict,
            postcode = EXCLUDED.postcode,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            category = EXCLUDED.category,
            "migrateId" = EXCLUDED."migrateId",
            "sourceKind" = EXCLUDED."sourceKind",
            "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt",
            "shaName" = EXCLUDED."shaName",
            "shaType" = EXCLUDED."shaType",
            "shaCategory" = EXCLUDED."shaCategory",
            "shaThumbnail" = EXCLUDED."shaThumbnail",
            "imageUrl" = EXCLUDED."imageUrl",
            description = EXCLUDED.description,
            "updatedAt" = NOW()
    """
    payload = [(*row, now_utc(), now_utc()) for row in deduped.values()]
    with conn.cursor() as cursor:
        execute_values(cursor, query, payload)


def run_import(
    csv_path: Path,
    dry_run: bool,
    limit: int | None,
    chunk_size: int,
    restaurants_csv_path: Path | None,
) -> None:
    total_rows = 0
    valid_tat_pois = 0
    valid_destinations = 0
    restaurant_rows_ready = 0

    discovered_provinces: set[int] = set()
    province_batch: list[tuple[int, str, str]] = []
    poi_batch: list[tuple] = []
    destination_batch: list[tuple] = []

    conn = None
    if not dry_run:
        load_dotenv(Path(__file__).parent / ".env")
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL is missing. Put it in apps/etl/.env")
        conn = psycopg2.connect(database_url)
        ensure_restaurant_price_points_table(conn)

    try:
        for raw in iter_rows(csv_path):
            if limit and total_rows >= limit:
                break
            total_rows += 1

            province_row = build_province_row(raw)
            if province_row and province_row[0] not in discovered_provinces:
                discovered_provinces.add(province_row[0])
                province_batch.append(province_row)

            poi_row = build_tat_poi_row(raw)
            if poi_row:
                poi_batch.append(poi_row)
                valid_tat_pois += 1

            destination_row = build_destination_row(raw)
            if destination_row:
                destination_batch.append(destination_row)
                valid_destinations += 1

            should_flush = (
                len(province_batch) >= chunk_size
                or len(poi_batch) >= chunk_size
                or len(destination_batch) >= chunk_size
            )
            if should_flush and conn is not None:
                upsert_provinces(conn, province_batch)
                province_batch.clear()

                upsert_tat_pois(conn, poi_batch)
                poi_batch.clear()

                upsert_destinations(conn, destination_batch)
                destination_batch.clear()
                conn.commit()

        if conn is not None:
            upsert_provinces(conn, province_batch)
            upsert_tat_pois(conn, poi_batch)
            upsert_destinations(conn, destination_batch)
            conn.commit()

        if restaurants_csv_path and restaurants_csv_path.exists():
            if dry_run:
                for restaurant_raw in iter_rows(restaurants_csv_path):
                    restaurant_row = build_restaurant_price_row(
                        restaurant_raw, str(restaurants_csv_path.name)
                    )
                    if restaurant_row:
                        restaurant_rows_ready += 1
            elif conn is not None:
                restaurant_batch: list[tuple] = []
                for restaurant_raw in iter_rows(restaurants_csv_path):
                    restaurant_row = build_restaurant_price_row(
                        restaurant_raw, str(restaurants_csv_path.name)
                    )
                    if restaurant_row:
                        restaurant_batch.append(restaurant_row)
                        restaurant_rows_ready += 1
                    if len(restaurant_batch) >= chunk_size:
                        upsert_restaurant_price_points(conn, restaurant_batch)
                        restaurant_batch.clear()
                        conn.commit()
                if restaurant_batch:
                    upsert_restaurant_price_points(conn, restaurant_batch)
                    conn.commit()
    finally:
        if conn is not None:
            conn.close()

    print(f"scanned_rows={total_rows}")
    print(f"unique_provinces={len(discovered_provinces)}")
    print(f"tat_poi_rows_ready={valid_tat_pois}")
    print(f"destination_rows_ready={valid_destinations}")
    print(f"restaurant_price_rows_ready={restaurant_rows_ready}")
    print("mode=dry_run" if dry_run else "mode=imported")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import hand-data raw files into AllWay PostgreSQL")
    parser.add_argument("--preview", action="store_true", help="Preview files without importing")
    parser.add_argument("--source-csv", default=str(DEFAULT_CSV), help="Path to tat_master.csv")
    parser.add_argument("--source-json", default=str(DEFAULT_JSON), help="Path to tat_master.json (fallback info only)")
    parser.add_argument(
        "--restaurants-csv",
        default=str(DEFAULT_RESTAURANTS_CSV),
        help="Path to bangkok_restaurants.csv",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate without writing database")
    parser.add_argument("--limit", type=int, default=None, help="Max rows to process")
    parser.add_argument("--chunk-size", type=int, default=500, help="Batch size for upsert")
    args = parser.parse_args()

    if args.preview:
        preview_files()
        return

    csv_path = Path(args.source_csv)
    if not csv_path.exists():
        json_path = Path(args.source_json)
        raise FileNotFoundError(f"CSV not found: {csv_path} (JSON present={json_path.exists()})")

    restaurants_csv_path = Path(args.restaurants_csv) if args.restaurants_csv else None
    run_import(
        csv_path=csv_path,
        dry_run=args.dry_run,
        limit=args.limit,
        chunk_size=args.chunk_size,
        restaurants_csv_path=restaurants_csv_path,
    )


if __name__ == "__main__":
    main()
