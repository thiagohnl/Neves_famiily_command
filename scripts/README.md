# Family Board - Utility Scripts

Python helper scripts for managing the Family Board Supabase backend.

## Prerequisites

- Python 3.10+
- A `.env` file in the project root containing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Installation

```bash
cd scripts
pip install -r requirements.txt
```

## Scripts

### backup_data.py

Export all database tables to timestamped JSON files.

```bash
# Default output to scripts/backups/
python backup_data.py

# Custom output directory
python backup_data.py --output-dir /path/to/backups
```

### reset_weekly_chores.py

Reset recurring chores for a new week (sets `is_completed=false` and `completed_at=null` for chores with `recurring_days`).

```bash
# Reset chores only
python reset_weekly_chores.py

# Reset chores AND reset all member points to 0
python reset_weekly_chores.py --reset-points
```

### progress_report.py

Print a formatted weekly progress report to the terminal.

```bash
# Default: last 7 days
python progress_report.py

# Custom window: last 14 days
python progress_report.py --days 14
```

## Project Structure

```
scripts/
  config.py              # Shared Supabase client (reads ../.env)
  requirements.txt       # Python dependencies
  backup_data.py         # Table export utility
  reset_weekly_chores.py # Weekly chore reset
  progress_report.py     # Progress report generator
  backups/               # Default backup output directory
  README.md              # This file
```
