"""
Shared Supabase client initialization.

Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the project root
.env file (one level up from this script's directory).
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env from the project root (one directory above /scripts)
_env_path = Path(__file__).resolve().parent.parent / ".env"

if not _env_path.exists():
    print(f"ERROR: .env file not found at {_env_path}", file=sys.stderr)
    sys.exit(1)

load_dotenv(dotenv_path=_env_path)

_url: str | None = os.getenv("VITE_SUPABASE_URL")
_key: str | None = os.getenv("VITE_SUPABASE_ANON_KEY")

if not _url or not _key:
    print(
        "ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env",
        file=sys.stderr,
    )
    sys.exit(1)

supabase: Client = create_client(_url, _key)
