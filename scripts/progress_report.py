#!/usr/bin/env python3
"""
Generate a weekly progress report for the family board.

Shows:
  - Chores completed per member
  - Points earned per member
  - Meals planned this week
  - Top performer

Usage:
    python progress_report.py
    python progress_report.py --days 14
"""

import argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from config import supabase


def get_completed_chores(since: datetime) -> list[dict]:
    """Return chores completed since the given datetime."""
    since_iso = since.isoformat()
    response = (
        supabase.table("chores")
        .select("*, family_members(name)")
        .eq("is_completed", True)
        .gte("completed_at", since_iso)
        .execute()
    )
    return response.data


def get_family_members() -> list[dict]:
    """Return all family members."""
    response = supabase.table("family_members").select("*").execute()
    return response.data


def get_meal_plans(since: datetime) -> list[dict]:
    """Return meal plans since the given datetime."""
    since_iso = since.date().isoformat()
    response = (
        supabase.table("meal_plans")
        .select("*")
        .gte("date", since_iso)
        .execute()
    )
    return response.data


def print_header(title: str, width: int = 55) -> None:
    """Print a formatted section header."""
    print()
    print("=" * width)
    print(f"  {title}")
    print("=" * width)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a weekly family board progress report."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of days to look back (default: 7).",
    )
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=args.days)

    print_header(f"FAMILY BOARD PROGRESS REPORT  ({args.days}-day window)")
    print(f"  Period: {since.strftime('%Y-%m-%d')} to {now.strftime('%Y-%m-%d')}")

    # ------------------------------------------------------------------
    # Family members & points
    # ------------------------------------------------------------------
    members = get_family_members()
    member_name_map: dict[str, str] = {}
    member_points: dict[str, int] = {}
    for m in members:
        member_name_map[m["id"]] = m.get("name", "Unknown")
        member_points[m["id"]] = m.get("points", 0)

    # ------------------------------------------------------------------
    # Chores completed per member
    # ------------------------------------------------------------------
    chores = get_completed_chores(since)

    chores_per_member: dict[str, int] = defaultdict(int)
    for chore in chores:
        assigned = chore.get("assigned_to")
        if assigned:
            chores_per_member[assigned] += 1

    print_header("CHORES COMPLETED PER MEMBER")
    if chores_per_member:
        for member_id, count in sorted(
            chores_per_member.items(), key=lambda x: x[1], reverse=True
        ):
            name = member_name_map.get(member_id, member_id)
            print(f"  {name:<25} {count:>4} chore(s)")
    else:
        print("  No chores completed in this period.")

    total_chores = sum(chores_per_member.values())
    print(f"\n  Total: {total_chores} chore(s) completed")

    # ------------------------------------------------------------------
    # Points per member
    # ------------------------------------------------------------------
    print_header("POINTS PER MEMBER (current totals)")
    if members:
        for member_id, points in sorted(
            member_points.items(), key=lambda x: x[1], reverse=True
        ):
            name = member_name_map.get(member_id, member_id)
            print(f"  {name:<25} {points:>6} pts")
    else:
        print("  No family members found.")

    # ------------------------------------------------------------------
    # Meals planned
    # ------------------------------------------------------------------
    meals = get_meal_plans(since)

    print_header("MEALS PLANNED THIS PERIOD")
    if meals:
        for meal in sorted(meals, key=lambda m: m.get("date", "")):
            date_str = meal.get("date", "N/A")
            meal_type = meal.get("meal_type", "meal")
            title = meal.get("title", meal.get("name", "Untitled"))
            print(f"  {date_str}  [{meal_type:<10}]  {title}")
        print(f"\n  Total: {len(meals)} meal(s) planned")
    else:
        print("  No meals planned in this period.")

    # ------------------------------------------------------------------
    # Top performer
    # ------------------------------------------------------------------
    print_header("TOP PERFORMER")
    if chores_per_member:
        top_id = max(chores_per_member, key=chores_per_member.get)  # type: ignore[arg-type]
        top_name = member_name_map.get(top_id, top_id)
        top_count = chores_per_member[top_id]
        top_points = member_points.get(top_id, 0)
        print(f"  {top_name} -- {top_count} chore(s) completed, {top_points} pts")
    else:
        print("  Not enough data to determine a top performer.")

    print()
    print("-" * 55)
    print("  Report generated at", now.strftime("%Y-%m-%d %H:%M:%S UTC"))
    print("-" * 55)
    print()


if __name__ == "__main__":
    main()
