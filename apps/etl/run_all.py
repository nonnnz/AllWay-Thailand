"""
apps/etl/run_all.py

Run all ETL steps in order.
Usage:
  python run_all.py            # run once
  python run_all.py --cron     # run on schedule (every 6 hours)
"""

import sys
import schedule
import time

from tat_fetcher import run as fetch_tat
from neo4j_seeder import seed_graph


def run_pipeline():
    print("=" * 50)
    print("[ETL] Starting AllWay data pipeline...")
    print("=" * 50)

    print("\n[1/2] Fetching TAT API data -> PostgreSQL")
    fetch_tat()

    print("\n[2/2] Seeding Neo4j graph")
    seed_graph()

    print("\n[ETL] Pipeline complete ✓")


if __name__ == "__main__":
    run_pipeline()

    if "--cron" in sys.argv:
        print("\n[ETL] Scheduling pipeline every 6 hours...")
        schedule.every(6).hours.do(run_pipeline)
        while True:
            schedule.run_pending()
            time.sleep(60)
