#!/usr/bin/env python3
"""
Reset recurring chores for a new week.

Sets is_completed=false and completed_at=null for every chore that has a
non-empty recurring_days value.  Optionally resets all family member points
to 0.

Usage:
    python reset_weekly_chores.py
    python reset_weekly_chores.py --reset-points
"""

import argparse
import sys

from config import supabase


def reset_recurring_chores() -> int:
    """Reset completion status for all recurring chores.

    Returns the number of chores that were reset.
    """
    # Fetch recurring chores (recurring_days is not null and not empty)
    response = (
        supabase.table("chores")
        .select("id, title, recurring_days")
        .neq("recurring_days", None)
        .execute()
    )

    chores = [
        c for c in response.data
        if c.get("recurring_days") is not None and c.get("recurring_days") != ""
        and c.get("recurring_days") != []
    ]

    if not chores:
        print("No recurring chores found.")
        return 0

    chore_ids = [c["id"] for c in chores]

    # Update all recurring chores in a single batch
    for chore_id in chore_ids:
        supabase.table("chores").update(
            {"is_completed": False, "completed_at": None}
        ).eq("id", chore_id).execute()

    return len(chore_ids)


def reset_member_points() -> int:
    """Reset all family member points to 0.

    Returns the number of members updated.
    """
    response = supabase.table("family_members").select("id, name").execute()
    members = response.data

    if not members:
        print("No family members found.")
        return 0

    for member in members:
        supabase.table("family_members").update(
            {"points": 0}
        ).eq("id", member["id"]).execute()

    return len(members)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset recurring chores for a new week."
    )
    parser.add_argument(
        "--reset-points",
        action="store_true",
        default=False,
        help="Also reset all family member points to 0.",
    )
    args = parser.parse_args()

    print("Resetting recurring chores...")
    chore_count = reset_recurring_chores()
    print(f"  {chore_count} recurring chore(s) reset (is_completed=false, completed_at=null).")

    if args.reset_points:
        print("Resetting family member points...")
        member_count = reset_member_points()
        print(f"  {member_count} member(s) points reset to 0.")

    print("Done.")


if __name__ == "__main__":
    main()
