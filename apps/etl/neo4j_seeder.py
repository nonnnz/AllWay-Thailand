"""
apps/etl/neo4j_seeder.py

Guide-aligned Neo4j seeder for TripGuard.
Primary model:
  (:Place)-[:DETOUR_TO|SIMILAR_TO|HAS_VIBE|IN_PROVINCE|BEST_IN_SEASON|NEAR_FACILITY]->(...)

This seeder now writes only the guide model and removes legacy graph artifacts.
"""

from __future__ import annotations

import math
import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Iterable

import psycopg2
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

BATCH_SIZE = 1000
FALLBACK_NEIGHBORS = 3
MAX_FALLBACK_DISTANCE_KM = 80.0
AVG_FALLBACK_SPEED_KMPH = 45.0
MAX_FACILITY_DISTANCE_KM = 30.0
MAX_NEAR_FACILITIES = 3


def _chunked(rows: list[dict], size: int = BATCH_SIZE) -> Iterable[list[dict]]:
    for i in range(0, len(rows), size):
        yield rows[i:i + size]


def _normalize_tags(tags: list[str] | None) -> list[str]:
    if not tags:
        return []
    cleaned = {t.strip().lower() for t in tags if isinstance(t, str) and t.strip()}
    return sorted(cleaned)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _estimate_travel_time_min(distance_km: float) -> int:
    minutes = int(math.ceil((distance_km / AVG_FALLBACK_SPEED_KMPH) * 60))
    return max(10, minutes)


def _lower_kind(kind: str | None, fallback: str = "other") -> str:
    if not kind:
        return fallback
    return str(kind).strip().lower()


def _build_fallback_destination_detours(
    destinations: list[dict],
    existing_pairs: set[tuple[str, str]],
) -> list[dict]:
    by_province: dict[str, list[dict]] = defaultdict(list)
    for d in destinations:
        if d["latitude"] is None or d["longitude"] is None:
            continue
        province = d["province"]
        if not province:
            continue
        by_province[province].append(d)

    fallback_rows: list[dict] = []
    for province_dests in by_province.values():
        if len(province_dests) < 2:
            continue

        for origin in province_dests:
            origin_id = origin["id"]
            nearest: list[tuple[float, str]] = []
            for candidate in province_dests:
                candidate_id = candidate["id"]
                if candidate_id == origin_id:
                    continue
                pair = (origin_id, candidate_id)
                if pair in existing_pairs:
                    continue

                dist_km = _haversine_km(
                    origin["latitude"],
                    origin["longitude"],
                    candidate["latitude"],
                    candidate["longitude"],
                )
                if dist_km > MAX_FALLBACK_DISTANCE_KM:
                    continue
                nearest.append((dist_km, candidate_id))

            nearest.sort(key=lambda x: x[0])
            for dist_km, to_id in nearest[:FALLBACK_NEIGHBORS]:
                pair = (origin_id, to_id)
                if pair in existing_pairs:
                    continue
                existing_pairs.add(pair)
                fallback_rows.append(
                    {
                        "fromId": origin_id,
                        "toId": to_id,
                        "routeCount": 0,
                        "source": "fallback_geo",
                        "distanceKm": round(dist_km, 2),
                        "travelMin": _estimate_travel_time_min(dist_km),
                        "score": max(0.2, round(1.0 - (dist_km / MAX_FALLBACK_DISTANCE_KM), 3)),
                        "reason": "geo nearest neighbor in province",
                    }
                )

    return fallback_rows


def seed_graph() -> None:
    run_id = datetime.now(timezone.utc).isoformat()
    driver = GraphDatabase.driver(
        os.environ["NEO4J_URI"],
        auth=(os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"]),
    )

    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  id, name, "nameEn", province, "provinceId", "crowdScore", "trustScore",
                  "localValueScore", latitude, longitude, category, "vibeTags", "seasonCode",
                  "seasonFitScore", "accessibilityScore", "isSecondaryCity", "tatPlaceId",
                  "migrateId", "sourceKind", "shaName", "sourceUpdatedAt", "updatedAt"
                FROM destinations
                """
            )
            destination_rows = []
            for row in cur.fetchall():
                destination_rows.append(
                    {
                        "id": row[0],
                        "name": row[1],
                        "nameEn": row[2] or row[1],
                        "province": row[3],
                        "provinceId": row[4],
                        "crowdScore": row[5],
                        "trustScore": row[6],
                        "localValueScore": row[7],
                        "latitude": row[8],
                        "longitude": row[9],
                        "category": row[10] or [],
                        "vibeTags": row[11] or [],
                        "seasonCode": row[12],
                        "seasonFitScore": row[13],
                        "accessibilityScore": row[14],
                        "isSecondaryCity": row[15],
                        "tatPlaceId": row[16],
                        "migrateId": row[17],
                        "sourceKind": row[18],
                        "shaName": row[19],
                        "sourceUpdatedAt": row[20],
                        "updatedAt": row[21],
                    }
                )

            cur.execute(
                """
                SELECT id, "nameTh", "nameEn", region, "isSecondary", latitude, longitude
                FROM provinces
                """
            )
            province_rows = [
                {
                    "id": row[0],
                    "nameTh": row[1],
                    "nameEn": row[2],
                    "region": row[3],
                    "isSecondary": row[4],
                    "latitude": row[5],
                    "longitude": row[6],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT
                  id, kind, "sourceId", "migrateId", name, "nameEn",
                  "categoryId", "categoryName", latitude, longitude,
                  "provinceId", tags, "shaName", "updatedAtSource", "destinationId"
                FROM tat_pois
                """
            )
            tat_poi_rows = [
                {
                    "id": row[0],
                    "kind": row[1],
                    "sourceId": row[2],
                    "migrateId": row[3],
                    "name": row[4],
                    "nameEn": row[5],
                    "categoryId": row[6],
                    "categoryName": row[7],
                    "latitude": row[8],
                    "longitude": row[9],
                    "provinceId": row[10],
                    "tags": row[11] or [],
                    "shaName": row[12],
                    "updatedAtSource": row[13],
                    "destinationId": row[14],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT
                  id, "facilityType", "placeName", "placeCategory", "provinceId",
                  latitude, longitude,
                  "hasRamp", "hasWheelchairToilet", "hasElevator", "hasBraille", "hasDisabledParking"
                FROM accessibility_facilities
                """
            )
            facility_rows = [
                {
                    "uid": f"facility:{row[0]}",
                    "type": row[1],
                    "name": row[2],
                    "placeCategory": row[3],
                    "provinceId": row[4],
                    "lat": row[5],
                    "lon": row[6],
                    "hasRamp": row[7],
                    "hasWheelchairToilet": row[8],
                    "hasElevator": row[9],
                    "hasBraille": row[10],
                    "hasDisabledParking": row[11],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT id, "tatRouteId", slug, title, "titleEn", "distanceKm", "durationDays", "provinceId", "updatedAt"
                FROM travel_routes
                """
            )
            route_rows = [
                {
                    "id": row[0],
                    "uid": f"tat:route:{row[1] or row[0]}",
                    "sourceRouteId": row[1],
                    "slug": row[2],
                    "title": row[3],
                    "titleEn": row[4],
                    "distanceKm": row[5],
                    "durationDays": row[6],
                    "provinceId": row[7],
                    "updatedAt": row[8],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT "routeId", "destinationId", "tatPoiId", "dayIndex", "stopOrder", note
                FROM travel_route_stops
                """
            )
            route_stop_rows = [
                {
                    "routeId": row[0],
                    "destinationId": row[1],
                    "tatPoiId": row[2],
                    "dayIndex": row[3],
                    "stopOrder": row[4],
                    "note": row[5],
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT "provinceId", "seasonCode", "seasonFitScore", recommendation
                FROM province_season_profiles
                """
            )
            season_profile_rows = [
                {
                    "provinceId": row[0],
                    "seasonCode": str(row[1]) if row[1] is not None else None,
                    "score": row[2],
                    "note": row[3],
                }
                for row in cur.fetchall()
            ]

    destination_by_id = {row["id"]: row for row in destination_rows}
    destination_by_tat_place_id = {
        str(row["tatPlaceId"]): row
        for row in destination_rows
        if row.get("tatPlaceId") is not None
    }

    place_rows: list[dict] = []
    tat_poi_id_to_uid: dict[str, str] = {}
    tat_source_to_uid: dict[str, str] = {}
    destination_to_place_uid: dict[str, str] = {}

    for poi in tat_poi_rows:
        uid = f"tat:{_lower_kind(poi['kind'])}:{poi['sourceId']}"
        tat_poi_id_to_uid[poi["id"]] = uid
        if poi.get("sourceId") is not None:
            tat_source_to_uid[str(poi["sourceId"])] = uid
        dest = destination_by_id.get(poi["destinationId"])
        if dest is None and poi.get("sourceId") is not None:
            dest = destination_by_tat_place_id.get(str(poi["sourceId"]))

        if dest and poi.get("sourceId") and dest.get("tatPlaceId"):
            if str(dest["tatPlaceId"]) == str(poi["sourceId"]):
                destination_to_place_uid[dest["id"]] = uid
        if dest and dest["id"] not in destination_to_place_uid:
            destination_to_place_uid[dest["id"]] = uid

        source_updated = poi["updatedAtSource"] or (dest["sourceUpdatedAt"] if dest else None) or (dest["updatedAt"] if dest else None)
        category_list = []
        if dest:
            category_list.extend(dest["category"] or [])
        if poi["categoryName"]:
            category_list.append(poi["categoryName"])
        vibe_tags = []
        if dest:
            vibe_tags.extend(dest["vibeTags"] or [])
        vibe_tags.extend(poi["tags"] or [])

        place_rows.append(
            {
                "uid": uid,
                "kind": _lower_kind(poi["kind"]),
                "sourceId": poi["sourceId"],
                "migrateId": poi["migrateId"] or (dest["migrateId"] if dest else None),
                "name": poi["nameEn"] or poi["name"] or (dest["nameEn"] if dest else None) or (dest["name"] if dest else None),
                "provinceId": poi["provinceId"] or (dest["provinceId"] if dest else None),
                "categoryId": poi["categoryId"],
                "categoryName": poi["categoryName"],
                "lat": poi["latitude"] if poi["latitude"] is not None else (dest["latitude"] if dest else None),
                "lon": poi["longitude"] if poi["longitude"] is not None else (dest["longitude"] if dest else None),
                "shaFlag": bool(poi["shaName"] or (dest["shaName"] if dest else None)),
                "trustScore": dest["trustScore"] if dest else None,
                "crowdScore": dest["crowdScore"] if dest else None,
                "localValueScore": dest["localValueScore"] if dest else None,
                "accessibilityScore": dest["accessibilityScore"] if dest else None,
                "isSecondaryCity": bool(dest["isSecondaryCity"]) if dest else False,
                "updatedAt": source_updated.isoformat() if source_updated else None,
                "category": _normalize_tags(category_list),
                "vibeTags": _normalize_tags(vibe_tags),
                "destinationId": dest["id"] if dest else None,
                "seasonCode": str(dest["seasonCode"]) if (dest and dest["seasonCode"]) else None,
                "seasonFitScore": dest["seasonFitScore"] if dest else None,
            }
        )

    # Secondary linkage path: destination.tatPlaceId -> tat_pois.sourceId
    for dest in destination_rows:
        if dest["id"] in destination_to_place_uid:
            continue
        tat_place_id = dest.get("tatPlaceId")
        if tat_place_id is None:
            continue
        mapped_uid = tat_source_to_uid.get(str(tat_place_id))
        if mapped_uid:
            destination_to_place_uid[dest["id"]] = mapped_uid

    for dest in destination_rows:
        if dest["id"] in destination_to_place_uid:
            continue
        uid = f"app:destination:{dest['id']}"
        destination_to_place_uid[dest["id"]] = uid
        updated_at = dest["sourceUpdatedAt"] or dest["updatedAt"]
        place_rows.append(
            {
                "uid": uid,
                "kind": _lower_kind(dest["sourceKind"], "other"),
                "sourceId": dest["id"],
                "migrateId": dest["migrateId"],
                "name": dest["nameEn"] or dest["name"],
                "provinceId": dest["provinceId"],
                "categoryId": None,
                "categoryName": None,
                "lat": dest["latitude"],
                "lon": dest["longitude"],
                "shaFlag": bool(dest["shaName"]),
                "trustScore": dest["trustScore"],
                "crowdScore": dest["crowdScore"],
                "localValueScore": dest["localValueScore"],
                "accessibilityScore": dest["accessibilityScore"],
                "isSecondaryCity": bool(dest["isSecondaryCity"]),
                "updatedAt": updated_at.isoformat() if updated_at else None,
                "category": _normalize_tags(dest["category"]),
                "vibeTags": _normalize_tags(dest["vibeTags"]),
                "destinationId": dest["id"],
                "seasonCode": str(dest["seasonCode"]) if dest["seasonCode"] else None,
                "seasonFitScore": dest["seasonFitScore"],
            }
        )

    place_by_uid = {row["uid"]: row for row in place_rows}

    place_vibe_rows: list[dict] = []
    for place in place_rows:
        merged_tags = set(place["vibeTags"]) | set(place["category"])
        for tag in sorted(merged_tags):
            place_vibe_rows.append({"placeUid": place["uid"], "vibe": tag})

    place_province_rows = [
        {"placeUid": place["uid"], "provinceId": place["provinceId"]}
        for place in place_rows
        if place["provinceId"] is not None
    ]

    mapped_route_stops: list[dict] = []
    for stop in route_stop_rows:
        place_uid = None
        if stop["destinationId"] and stop["destinationId"] in destination_to_place_uid:
            place_uid = destination_to_place_uid[stop["destinationId"]]
        elif stop["tatPoiId"] and stop["tatPoiId"] in tat_poi_id_to_uid:
            place_uid = tat_poi_id_to_uid[stop["tatPoiId"]]
        if not place_uid:
            continue
        mapped_route_stops.append(
            {
                "routeId": stop["routeId"],
                "placeUid": place_uid,
                "dayIndex": stop["dayIndex"] if stop["dayIndex"] is not None else 0,
                "stopOrder": stop["stopOrder"],
                "note": stop["note"],
            }
        )

    stops_by_route_day: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for stop in mapped_route_stops:
        stops_by_route_day[(stop["routeId"], stop["dayIndex"])].append(stop)

    route_pair_counts: dict[tuple[str, str], int] = defaultdict(int)
    for stop_list in stops_by_route_day.values():
        ordered = sorted(stop_list, key=lambda x: x["stopOrder"])
        for i in range(len(ordered) - 1):
            from_uid = ordered[i]["placeUid"]
            to_uid = ordered[i + 1]["placeUid"]
            if from_uid == to_uid:
                continue
            route_pair_counts[(from_uid, to_uid)] += 1

    detour_rows: list[dict] = []
    for (from_uid, to_uid), route_count in route_pair_counts.items():
        a = place_by_uid.get(from_uid)
        b = place_by_uid.get(to_uid)
        distance_km = None
        if a and b and a.get("lat") is not None and a.get("lon") is not None and b.get("lat") is not None and b.get("lon") is not None:
            distance_km = round(_haversine_km(a["lat"], a["lon"], b["lat"], b["lon"]), 2)
        detour_rows.append(
            {
                "fromUid": from_uid,
                "toUid": to_uid,
                "distanceKm": distance_km,
                "travelMin": _estimate_travel_time_min(distance_km) if distance_km is not None else None,
                "reason": "route sequence",
                "score": 0.8,
                "routeCount": route_count,
                "source": "travel_route",
            }
        )

    fallback_dest_detours = _build_fallback_destination_detours(destination_rows, set())
    existing_place_pairs = {(row["fromUid"], row["toUid"]) for row in detour_rows}
    fallback_count = 0
    for row in fallback_dest_detours:
        from_uid = destination_to_place_uid.get(row["fromId"])
        to_uid = destination_to_place_uid.get(row["toId"])
        if not from_uid or not to_uid or from_uid == to_uid:
            continue
        pair = (from_uid, to_uid)
        if pair in existing_place_pairs:
            continue
        existing_place_pairs.add(pair)
        fallback_count += 1
        detour_rows.append(
            {
                "fromUid": from_uid,
                "toUid": to_uid,
                "distanceKm": row["distanceKm"],
                "travelMin": row["travelMin"],
                "reason": row["reason"],
                "score": row["score"],
                "routeCount": 0,
                "source": row["source"],
            }
        )

    vibe_by_place: dict[str, set[str]] = defaultdict(set)
    for row in place_vibe_rows:
        vibe_by_place[row["placeUid"]].add(row["vibe"])

    similar_pairs: dict[tuple[str, str], dict] = {}
    for detour in detour_rows:
        a = detour["fromUid"]
        b = detour["toUid"]
        if a == b:
            continue
        key = tuple(sorted((a, b)))
        tags_a = vibe_by_place.get(a, set())
        tags_b = vibe_by_place.get(b, set())
        shared = sorted(tags_a & tags_b)
        if not shared:
            continue
        union = tags_a | tags_b
        score = round(len(shared) / len(union), 3) if union else 0.0
        similar_pairs[key] = {
            "fromUid": key[0],
            "toUid": key[1],
            "sharedTags": shared[:5],
            "score": score,
        }
    similar_rows = list(similar_pairs.values())

    facilities_by_province: dict[int, list[dict]] = defaultdict(list)
    for fac in facility_rows:
        if fac["provinceId"] is not None:
            facilities_by_province[fac["provinceId"]].append(fac)

    near_facility_rows: list[dict] = []
    for place in place_rows:
        if place["provinceId"] is None or place["lat"] is None or place["lon"] is None:
            continue
        candidates = facilities_by_province.get(place["provinceId"], [])
        nearest: list[tuple[float, dict]] = []
        for fac in candidates:
            if fac["lat"] is None or fac["lon"] is None:
                continue
            dist = _haversine_km(place["lat"], place["lon"], fac["lat"], fac["lon"])
            if dist <= MAX_FACILITY_DISTANCE_KM:
                nearest.append((dist, fac))
        nearest.sort(key=lambda x: x[0])
        for dist, fac in nearest[:MAX_NEAR_FACILITIES]:
            near_facility_rows.append(
                {
                    "placeUid": place["uid"],
                    "facilityUid": fac["uid"],
                    "distanceKm": round(dist, 2),
                    "accessScore": max(0.1, round(1.0 - (dist / MAX_FACILITY_DISTANCE_KM), 3)),
                }
            )

    season_rows = [
        {"code": "HOT", "label": "Hot Season"},
        {"code": "RAIN", "label": "Rainy Season"},
        {"code": "COOL", "label": "Cool Season"},
        {"code": "YEAR_ROUND", "label": "Year Round"},
    ]

    best_season_map: dict[tuple[str, str], dict] = {}
    for place in place_rows:
        if place["seasonCode"]:
            key = (place["uid"], place["seasonCode"])
            best_season_map[key] = {
                "placeUid": place["uid"],
                "seasonCode": place["seasonCode"],
                "score": place["seasonFitScore"],
                "note": "destination override",
            }

    province_to_place_uids: dict[int, list[str]] = defaultdict(list)
    for place in place_rows:
        if place["provinceId"] is not None:
            province_to_place_uids[place["provinceId"]].append(place["uid"])

    for profile in season_profile_rows:
        if profile["provinceId"] is None or not profile["seasonCode"]:
            continue
        for place_uid in province_to_place_uids.get(profile["provinceId"], []):
            key = (place_uid, profile["seasonCode"])
            current = best_season_map.get(key)
            if current is None or (current.get("score") is None and profile.get("score") is not None):
                best_season_map[key] = {
                    "placeUid": place_uid,
                    "seasonCode": profile["seasonCode"],
                    "score": profile["score"],
                    "note": profile["note"] or "province season profile",
                }
    best_season_rows = list(best_season_map.values())

    session_kwargs = {}
    neo4j_database = os.getenv("NEO4J_DATABASE")
    if neo4j_database:
        session_kwargs["database"] = neo4j_database

    with driver.session(**session_kwargs) as session:
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Province) REQUIRE p.id IS UNIQUE").consume()
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Place) REQUIRE p.uid IS UNIQUE").consume()
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (f:Facility) REQUIRE f.uid IS UNIQUE").consume()
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (r:Route) REQUIRE r.uid IS UNIQUE").consume()
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Season) REQUIRE s.code IS UNIQUE").consume()
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (v:VibeTag) REQUIRE v.name IS UNIQUE").consume()
        session.run("CREATE INDEX IF NOT EXISTS FOR (p:Place) ON (p.kind)").consume()
        session.run("CREATE INDEX IF NOT EXISTS FOR (p:Place) ON (p.provinceId)").consume()
        session.run("CREATE INDEX IF NOT EXISTS FOR (p:Place) ON (p.isSecondaryCity)").consume()

        for batch in _chunked(province_rows):
            session.run(
                """
                UNWIND $rows AS row
                MERGE (p:Province {id: row.id})
                SET p.nameTh = row.nameTh, p.nameEn = row.nameEn, p.region = row.region,
                    p.isSecondary = row.isSecondary, p.latitude = row.latitude, p.longitude = row.longitude
                """,
                rows=batch,
            ).consume()

        for batch in _chunked(place_rows):
            session.run(
                """
                UNWIND $rows AS row
                MERGE (p:Place {uid: row.uid})
                SET p.kind = row.kind, p.sourceId = row.sourceId, p.migrateId = row.migrateId,
                    p.name = row.name, p.provinceId = row.provinceId, p.categoryId = row.categoryId,
                    p.categoryName = row.categoryName, p.lat = row.lat, p.lon = row.lon,
                    p.latitude = row.lat, p.longitude = row.lon, p.shaFlag = row.shaFlag,
                    p.trustScore = row.trustScore, p.crowdScore = row.crowdScore, p.localValueScore = row.localValueScore,
                    p.accessibilityScore = row.accessibilityScore, p.isSecondaryCity = row.isSecondaryCity,
                    p.updatedAt = row.updatedAt, p.category = row.category, p.vibeTags = row.vibeTags,
                    p.destinationId = row.destinationId, p.seedRunId = $runId
                """,
                rows=batch,
                runId=run_id,
            ).consume()

        session.run(
            """
            MATCH (p:Place)
            WHERE p.seedRunId IS NULL OR p.seedRunId <> $runId
            DETACH DELETE p
            """,
            runId=run_id,
        ).consume()

        for batch in _chunked(season_rows):
            session.run(
                """
                UNWIND $rows AS row
                MERGE (s:Season {code: row.code})
                SET s.label = row.label
                """,
                rows=batch,
            ).consume()

        for batch in _chunked(facility_rows):
            session.run(
                """
                UNWIND $rows AS row
                MERGE (f:Facility {uid: row.uid})
                SET f.type = row.type, f.name = row.name, f.placeCategory = row.placeCategory,
                    f.provinceId = row.provinceId, f.lat = row.lat, f.lon = row.lon,
                    f.hasRamp = row.hasRamp, f.hasWheelchairToilet = row.hasWheelchairToilet,
                    f.hasElevator = row.hasElevator, f.hasBraille = row.hasBraille,
                    f.hasDisabledParking = row.hasDisabledParking, f.seedRunId = $runId
                """,
                rows=batch,
                runId=run_id,
            ).consume()

        session.run(
            """
            MATCH (f:Facility)
            WHERE f.seedRunId IS NULL OR f.seedRunId <> $runId
            DETACH DELETE f
            """,
            runId=run_id,
        ).consume()

        for batch in _chunked(route_rows):
            session.run(
                """
                UNWIND $rows AS row
                MERGE (r:Route {uid: row.uid})
                SET r.sourceRouteId = row.sourceRouteId, r.slug = row.slug, r.title = row.title,
                    r.titleEn = row.titleEn, r.distanceKm = row.distanceKm, r.durationDays = row.durationDays,
                    r.provinceId = row.provinceId, r.updatedAt = row.updatedAt, r.seedRunId = $runId
                """,
                rows=batch,
                runId=run_id,
            ).consume()

        session.run(
            """
            MATCH (r:Route)
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DETACH DELETE r
            """,
            runId=run_id,
        ).consume()

        if place_vibe_rows:
            for batch in _chunked(place_vibe_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (p:Place {uid: row.placeUid})
                    MERGE (v:VibeTag {name: row.vibe})
                    MERGE (p)-[r:HAS_VIBE]->(v)
                    SET r.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:HAS_VIBE]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()

        session.run(
            """
            MATCH (v:VibeTag)
            WHERE NOT ( (:Place)-[:HAS_VIBE]->(v) )
            DELETE v
            """
        ).consume()

        if place_province_rows:
            for batch in _chunked(place_province_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (p:Place {uid: row.placeUid})
                    MATCH (prov:Province {id: row.provinceId})
                    MERGE (p)-[r:IN_PROVINCE]->(prov)
                    SET r.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:IN_PROVINCE]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()

        if mapped_route_stops:
            route_uid_by_id = {r["id"]: r["uid"] for r in route_rows}
            includes_rows = [
                {
                    "routeUid": route_uid_by_id[row["routeId"]],
                    "placeUid": row["placeUid"],
                    "dayIndex": row["dayIndex"],
                    "stopOrder": row["stopOrder"],
                    "note": row["note"],
                }
                for row in mapped_route_stops
                if row["routeId"] in route_uid_by_id
            ]
            for batch in _chunked(includes_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (r:Route {uid: row.routeUid})
                    MATCH (p:Place {uid: row.placeUid})
                    MERGE (r)-[rel:INCLUDES_STOP {dayIndex: row.dayIndex, stopOrder: row.stopOrder, placeUid: row.placeUid}]->(p)
                    SET rel.note = row.note, rel.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:INCLUDES_STOP]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()

        if best_season_rows:
            for batch in _chunked(best_season_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (p:Place {uid: row.placeUid})
                    MATCH (s:Season {code: row.seasonCode})
                    MERGE (p)-[r:BEST_IN_SEASON]->(s)
                    SET r.score = row.score, r.note = row.note, r.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:BEST_IN_SEASON]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()

        if near_facility_rows:
            for batch in _chunked(near_facility_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (p:Place {uid: row.placeUid})
                    MATCH (f:Facility {uid: row.facilityUid})
                    MERGE (p)-[r:NEAR_FACILITY]->(f)
                    SET r.distanceKm = row.distanceKm, r.accessScore = row.accessScore, r.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:NEAR_FACILITY]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()

        if detour_rows:
            for batch in _chunked(detour_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (a:Place {uid: row.fromUid})
                    MATCH (b:Place {uid: row.toUid})
                    MERGE (a)-[r:DETOUR_TO]->(b)
                    SET r.distanceKm = row.distanceKm, r.travelMin = row.travelMin, r.reason = row.reason,
                        r.score = row.score, r.routeCount = row.routeCount, r.source = row.source, r.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:DETOUR_TO]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()

        if similar_rows:
            directed_rows = []
            for row in similar_rows:
                directed_rows.append(row)
                directed_rows.append(
                    {
                        "fromUid": row["toUid"],
                        "toUid": row["fromUid"],
                        "sharedTags": row["sharedTags"],
                        "score": row["score"],
                    }
                )
            for batch in _chunked(directed_rows):
                session.run(
                    """
                    UNWIND $rows AS row
                    MATCH (a:Place {uid: row.fromUid})
                    MATCH (b:Place {uid: row.toUid})
                    MERGE (a)-[r:SIMILAR_TO]->(b)
                    SET r.sharedTags = row.sharedTags, r.score = row.score, r.seedRunId = $runId
                    """,
                    rows=batch,
                    runId=run_id,
                ).consume()

        session.run(
            """
            MATCH ()-[r:SIMILAR_TO]->()
            WHERE r.seedRunId IS NULL OR r.seedRunId <> $runId
            DELETE r
            """,
            runId=run_id,
        ).consume()
        # Hard cleanup for deprecated legacy model.
        session.run("MATCH ()-[r:DETOUR_FROM]->() DELETE r").consume()
        session.run("MATCH (d:Destination) DETACH DELETE d").consume()

    driver.close()
    print(
        "[ETL] Neo4j graph seeded successfully. "
        f"places={len(place_rows)} provinces={len(province_rows)} routes={len(route_rows)} facilities={len(facility_rows)} "
        f"vibes={len(place_vibe_rows)} detours={len(detour_rows)} detours_fallback={fallback_count} "
        f"similar={len(similar_rows)}"
    )


if __name__ == "__main__":
    seed_graph()
