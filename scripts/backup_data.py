#!/usr/bin/env python3
"""
Export all Supabase tables to timestamped JSON files.

Usage:
    python backup_data.py
    python backup_data.py --output-dir ./my_backups
    python backup_data.py --keep 60

Exit codes:
    0 - backup succeeded
    1 - one or more tables failed to export, or nothing was exported
        (e.g. the Supabase project is paused/unreachable)

Each run also appends a one-line summary to <output-dir>/backup.log so
scheduled runs can be audited after the fact.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from config import supabase

# Keep in sync with supabase/combined_schema.sql (all application tables).
TABLES = [
    "achievements",
    "activities",
    "activity_plans",
    "app_settings",
    "chores",
    "family_members",
    "freezer_meals",
    "fun_ideas",
    "grocery_items",
    "meal_favorites",
    "meal_plans",
    "meal_votes",
    "meal_xp_log",
    "meals",
    "pantry_items",
    "planned_activities",
    "saved_meals",
    "schedule_events",
    "user_achievements",
    "weekly_challenges",
]

PAGE_SIZE = 1000  # Supabase caps a single select at 1000 rows; paginate past it.


def fetch_all_rows(table_name: str) -> list:
    """Fetch every row from a table, paginating past the 1000-row API cap."""
    rows: list = []
    while True:
        response = (
            supabase.table(table_name)
            .select("*")
            .range(len(rows), len(rows) + PAGE_SIZE - 1)
            .execute()
        )
        batch = response.data
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            return rows


def backup_table(table_name: str, output_dir: Path, timestamp: str) -> int | None:
    """Fetch all rows from a table and write them to a JSON file.

    Returns the number of rows exported, or None if the fetch failed
    (distinct from 0, which means the table exists but is empty).
    """
    try:
        rows = fetch_all_rows(table_name)
    except Exception as exc:
        print(f"  WARNING: Could not fetch '{table_name}': {exc}", file=sys.stderr)
        return None

    filename = f"{table_name}_{timestamp}.json"
    filepath = output_dir / filename

    with open(filepath, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=2, default=str)

    return len(rows)


def prune_old_backups(output_dir: Path, keep: int) -> int:
    """Delete backup sets beyond the newest `keep`, grouped by timestamp.

    Returns the number of files removed. keep=0 disables pruning.
    """
    if keep <= 0:
        return 0

    groups: dict[str, list[Path]] = {}
    for f in output_dir.glob("*.json"):
        parts = f.stem.rsplit("_", 2)  # <table>_<YYYYmmdd>_<HHMMSS>
        if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
            groups.setdefault(f"{parts[1]}_{parts[2]}", []).append(f)

    removed = 0
    for stamp in sorted(groups)[:-keep]:
        for f in groups[stamp]:
            f.unlink()
            removed += 1
    return removed


def append_run_log(output_dir: Path, message: str) -> None:
    """Append a one-line summary of this run to backup.log."""
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(output_dir / "backup.log", "a", encoding="utf-8") as fh:
        fh.write(f"{stamp} | {message}\n")


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
    parser.add_argument(
        "--keep",
        type=int,
        default=30,
        help="Number of backup sets to retain, oldest pruned first (default: 30, 0 = keep all)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"Backing up {len(TABLES)} tables to: {output_dir}")
    print(f"Timestamp: {timestamp}")
    print("-" * 50)

    total_rows = 0
    failed: list[str] = []
    for table in TABLES:
        count = backup_table(table, output_dir, timestamp)
        if count is None:
            failed.append(table)
            print(f"  {table}: FAILED")
        else:
            total_rows += count
            print(f"  {table}: {count} rows exported")

    print("-" * 50)

    if failed:
        print(
            f"Backup INCOMPLETE: {len(failed)} table(s) failed: {', '.join(failed)}",
            file=sys.stderr,
        )
        append_run_log(
            output_dir,
            f"FAILED | {len(failed)}/{len(TABLES)} tables failed | {total_rows} rows exported",
        )
        sys.exit(1)

    if total_rows == 0:
        # A healthy project always has seeded rows (app_settings, achievements),
        # so an all-empty export means something is wrong upstream.
        print(
            "Backup suspicious: 0 rows across all tables — is the project paused or empty?",
            file=sys.stderr,
        )
        append_run_log(output_dir, "FAILED | 0 rows exported across all tables")
        sys.exit(1)

    pruned = prune_old_backups(output_dir, args.keep)
    if pruned:
        print(f"Pruned {pruned} old backup file(s) (keeping newest {args.keep} sets).")

    print(f"Backup complete. {total_rows} total rows across {len(TABLES)} tables.")
    append_run_log(output_dir, f"OK | {total_rows} rows across {len(TABLES)} tables")


if __name__ == "__main__":
    main()
