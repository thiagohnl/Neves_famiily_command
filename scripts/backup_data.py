#!/usr/bin/env python3
"""
Export all Supabase tables to timestamped JSON files.

Usage:
    python backup_data.py
    python backup_data.py --output-dir ./my_backups
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from config import supabase

TABLES = [
    "family_members",
    "chores",
    "app_settings",
    "saved_meals",
    "freezer_meals",
    "meal_plans",
    "schedule_events",
    "fun_ideas",
    "planned_activities",
]


def backup_table(table_name: str, output_dir: Path, timestamp: str) -> int:
    """Fetch all rows from a table and write them to a JSON file.

    Returns the number of rows exported.
    """
    try:
        response = supabase.table(table_name).select("*").execute()
        rows = response.data
    except Exception as exc:
        print(f"  WARNING: Could not fetch '{table_name}': {exc}", file=sys.stderr)
        return 0

    filename = f"{table_name}_{timestamp}.json"
    filepath = output_dir / filename

    with open(filepath, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=2, default=str)

    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export all Supabase tables to timestamped JSON files."
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).resolve().parent / "backups"),
        help="Directory to store backup files (default: scripts/backups/)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"Backing up {len(TABLES)} tables to: {output_dir}")
    print(f"Timestamp: {timestamp}")
    print("-" * 50)

    total_rows = 0
    for table in TABLES:
        count = backup_table(table, output_dir, timestamp)
        total_rows += count
        print(f"  {table}: {count} rows exported")

    print("-" * 50)
    print(f"Backup complete. {total_rows} total rows across {len(TABLES)} tables.")


if __name__ == "__main__":
    main()
