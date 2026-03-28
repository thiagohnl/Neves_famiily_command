#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Supabase Project Migration Script
# Migrates database data + storage files from one Supabase project to another.
#
# BEFORE RUNNING THIS SCRIPT:
#   1. Create a new Supabase project on your new account
#   2. In the new project dashboard, go to Storage and create a bucket called
#      "profile-photos" — set it to PUBLIC
#   3. Add a storage policy allowing all operations for the "anon" role
#   4. Gather the credentials listed below from both projects
#
# PREREQUISITES: psql, curl, jq
# USAGE: bash scripts/migrate_supabase.sh
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXPORT_DIR="$PROJECT_ROOT/migration_export"
PHOTOS_DIR="$EXPORT_DIR/photos"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

# Tables in FK-safe import order
TABLES=(
  "app_settings"
  "family_members"
  "activities"
  "achievements"
  "chores"
  "saved_meals"
  "freezer_meals"
  "meal_plans"
  "schedule_events"
  "fun_ideas"
  "planned_activities"
  "meal_xp_log"
  "user_achievements"
  "weekly_challenges"
  "meal_favorites"
  "meal_votes"
)

# Batch size for REST API imports
BATCH_SIZE=500

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { echo -e "\n\033[1;34m[INFO]\033[0m  $*"; }
ok()    { echo -e "\033[1;32m[OK]\033[0m    $*"; }
warn()  { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
fail()  { echo -e "\033[1;31m[FAIL]\033[0m  $*"; exit 1; }

prompt_var() {
  local var_name="$1" prompt_text="$2" default="${3:-}"
  local value
  if [[ -n "$default" ]]; then
    read -rp "$prompt_text [$default]: " value
    value="${value:-$default}"
  else
    read -rp "$prompt_text: " value
  fi
  [[ -z "$value" ]] && fail "$var_name cannot be empty."
  eval "$var_name='$value'"
}

# ---------------------------------------------------------------------------
# Phase 0: Prerequisites
# ---------------------------------------------------------------------------
phase0_prerequisites() {
  info "Phase 0: Checking prerequisites..."

  for cmd in psql curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      fail "'$cmd' is required but not installed. Please install it and try again."
    fi
    ok "$cmd found"
  done

  # Load current .env as defaults
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    OLD_URL_DEFAULT=$(grep -oP 'VITE_SUPABASE_URL=\K.*' "$PROJECT_ROOT/.env" || true)
    OLD_KEY_DEFAULT=$(grep -oP 'VITE_SUPABASE_ANON_KEY=\K.*' "$PROJECT_ROOT/.env" || true)
  fi

  echo ""
  echo "=== Old Project Credentials ==="
  prompt_var OLD_URL       "Old Supabase URL"      "${OLD_URL_DEFAULT:-}"
  prompt_var OLD_ANON_KEY  "Old Supabase Anon Key"  "${OLD_KEY_DEFAULT:-}"

  echo ""
  echo "=== New Project Credentials ==="
  prompt_var NEW_URL             "New Supabase URL"
  prompt_var NEW_ANON_KEY        "New Supabase Anon Key"
  prompt_var NEW_SERVICE_KEY     "New Supabase Service Role Key"
  prompt_var NEW_DB_CONN_STRING  "New DB Connection String (postgres://...)"

  # Test old project API
  info "Testing old project API access..."
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$OLD_URL/rest/v1/" \
    -H "apikey: $OLD_ANON_KEY")
  [[ "$status" == "200" ]] && ok "Old project API reachable" || fail "Old project API returned HTTP $status"

  # Test new project API
  info "Testing new project API access..."
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$NEW_URL/rest/v1/" \
    -H "apikey: $NEW_ANON_KEY")
  [[ "$status" == "200" ]] && ok "New project API reachable" || fail "New project API returned HTTP $status"

  # Test new project DB connection
  info "Testing new project DB connection..."
  if psql "$NEW_DB_CONN_STRING" -c "SELECT 1;" &>/dev/null; then
    ok "New project DB reachable"
  else
    fail "Cannot connect to new project DB. Check your connection string."
  fi
}

# ---------------------------------------------------------------------------
# Phase 1: Export Data
# ---------------------------------------------------------------------------
phase1_export() {
  info "Phase 1: Exporting data from old project..."

  mkdir -p "$EXPORT_DIR" "$PHOTOS_DIR"

  for table in "${TABLES[@]}"; do
    echo -n "  Exporting $table... "
    local response
    response=$(curl -s \
      "$OLD_URL/rest/v1/$table?select=*" \
      -H "apikey: $OLD_ANON_KEY" \
      -H "Authorization: Bearer $OLD_ANON_KEY")

    # Check if response is valid JSON array
    if echo "$response" | jq -e 'type == "array"' &>/dev/null; then
      local count
      count=$(echo "$response" | jq 'length')
      echo "$response" > "$EXPORT_DIR/$table.json"
      echo "$count rows"
    else
      warn "Could not export $table (may not exist yet): $response"
      echo "[]" > "$EXPORT_DIR/$table.json"
    fi
  done

  # Export storage files
  info "Exporting storage files from profile-photos bucket..."
  local files_json
  files_json=$(curl -s \
    "$OLD_URL/storage/v1/object/list/profile-photos" \
    -H "apikey: $OLD_ANON_KEY" \
    -H "Authorization: Bearer $OLD_ANON_KEY" \
    -d '{"prefix":"","limit":1000}' \
    -H "Content-Type: application/json")

  if echo "$files_json" | jq -e 'type == "array"' &>/dev/null; then
    local file_count
    file_count=$(echo "$files_json" | jq 'length')
    echo "  Found $file_count files in profile-photos bucket"

    echo "$files_json" | jq -r '.[].name // empty' | while read -r filename; do
      [[ -z "$filename" ]] && continue
      echo -n "  Downloading $filename... "
      curl -s -o "$PHOTOS_DIR/$filename" \
        "$OLD_URL/storage/v1/object/public/profile-photos/$filename"
      echo "done"
    done
  else
    warn "No files found in profile-photos bucket (or bucket doesn't exist)"
  fi

  ok "Export complete. Files saved to $EXPORT_DIR"
}

# ---------------------------------------------------------------------------
# Phase 2: Set Up Schema
# ---------------------------------------------------------------------------
phase2_schema() {
  info "Phase 2: Setting up schema on new project..."
  info "Replaying ${MIGRATIONS_DIR} migration files..."

  local count=0
  for f in "$MIGRATIONS_DIR"/*.sql; do
    [[ ! -f "$f" ]] && continue
    local fname
    fname=$(basename "$f")
    echo -n "  Applying $fname... "
    if psql "$NEW_DB_CONN_STRING" -f "$f" &>/dev/null 2>&1; then
      echo "ok"
    else
      warn "Warning applying $fname (may be safe to ignore if table already exists)"
    fi
    count=$((count + 1))
  done

  ok "Applied $count migration files"
}

# ---------------------------------------------------------------------------
# Phase 3: Import Data
# ---------------------------------------------------------------------------
phase3_import() {
  info "Phase 3: Importing data to new project..."

  for table in "${TABLES[@]}"; do
    local file="$EXPORT_DIR/$table.json"
    [[ ! -f "$file" ]] && continue

    local total
    total=$(jq 'length' "$file")
    [[ "$total" -eq 0 ]] && { echo "  $table: 0 rows (skipped)"; continue; }

    echo -n "  Importing $table ($total rows)... "

    # Batch import
    local offset=0
    while [[ $offset -lt $total ]]; do
      local batch
      batch=$(jq ".[$offset:$((offset + BATCH_SIZE))]" "$file")

      local status
      status=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$NEW_URL/rest/v1/$table" \
        -H "apikey: $NEW_SERVICE_KEY" \
        -H "Authorization: Bearer $NEW_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: resolution=merge-duplicates" \
        -d "$batch")

      if [[ "$status" != "201" && "$status" != "200" ]]; then
        warn "HTTP $status importing $table (batch at offset $offset)"
      fi

      offset=$((offset + BATCH_SIZE))
    done

    echo "done"
  done

  ok "Data import complete"
}

# ---------------------------------------------------------------------------
# Phase 4: Migrate Storage
# ---------------------------------------------------------------------------
phase4_storage() {
  info "Phase 4: Migrating storage files..."

  # Check if there are photos to upload
  local photo_count
  photo_count=$(find "$PHOTOS_DIR" -type f 2>/dev/null | wc -l)

  if [[ "$photo_count" -eq 0 ]]; then
    info "No photos to migrate. Skipping."
    return
  fi

  echo "  Uploading $photo_count photos to new project..."

  for filepath in "$PHOTOS_DIR"/*; do
    [[ ! -f "$filepath" ]] && continue
    local filename
    filename=$(basename "$filepath")
    echo -n "  Uploading $filename... "

    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$NEW_URL/storage/v1/object/profile-photos/$filename" \
      -H "apikey: $NEW_SERVICE_KEY" \
      -H "Authorization: Bearer $NEW_SERVICE_KEY" \
      -H "Content-Type: application/octet-stream" \
      --data-binary @"$filepath")

    if [[ "$status" == "200" || "$status" == "201" ]]; then
      echo "ok"
    else
      warn "HTTP $status uploading $filename"
    fi
  done

  ok "Storage migration complete"
}

# ---------------------------------------------------------------------------
# Phase 5: Update Photo URLs + .env
# ---------------------------------------------------------------------------
phase5_update() {
  info "Phase 5: Updating photo URLs in database..."

  # Rewrite photo_url in family_members to point to new project
  local sql="UPDATE family_members SET photo_url = REPLACE(photo_url, '${OLD_URL}', '${NEW_URL}') WHERE photo_url IS NOT NULL AND photo_url LIKE '%${OLD_URL}%';"
  psql "$NEW_DB_CONN_STRING" -c "$sql" 2>/dev/null
  ok "Photo URLs updated"

  info "Updating .env file..."
  local env_file="$PROJECT_ROOT/.env"

  if [[ -f "$env_file" ]]; then
    cp "$env_file" "$env_file.backup"
    ok "Backed up .env to .env.backup"
  fi

  cat > "$env_file" <<EOF
VITE_SUPABASE_URL=${NEW_URL}
VITE_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
EOF

  ok ".env updated with new credentials"
}

# ---------------------------------------------------------------------------
# Phase 6: Verify
# ---------------------------------------------------------------------------
phase6_verify() {
  info "Phase 6: Verifying migration..."

  echo "  Checking tables on new project..."
  for table in "${TABLES[@]}"; do
    local count
    count=$(curl -s \
      "$NEW_URL/rest/v1/$table?select=*" \
      -H "apikey: $NEW_ANON_KEY" \
      -H "Authorization: Bearer $NEW_ANON_KEY" \
      -H "Prefer: count=exact" \
      -o /dev/null -w "%{http_code}")

    if [[ "$count" == "200" ]]; then
      local rows
      rows=$(curl -s \
        "$NEW_URL/rest/v1/$table?select=count" \
        -H "apikey: $NEW_ANON_KEY" \
        -H "Authorization: Bearer $NEW_ANON_KEY" | jq 'length')
      echo "  $table: $rows rows"
    else
      warn "$table: HTTP $count"
    fi
  done

  echo ""
  ok "============================================"
  ok "  Migration complete!"
  ok "============================================"
  echo ""
  echo "  Next steps:"
  echo "    1. Run 'npm run dev' and verify the app works"
  echo "    2. Check that family members, chores, and meals load"
  echo "    3. Verify profile photos display correctly"
  echo "    4. Test parent PIN authentication"
  echo "    5. If deployed (Vercel, etc.), update env vars there too"
  echo ""
  echo "  Your old .env is backed up at: $env_file.backup"
  echo "  Export data is saved at: $EXPORT_DIR"
  echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo "============================================"
  echo "  Supabase Project Migration Script"
  echo "============================================"
  echo ""
  echo "This script will migrate your data from one"
  echo "Supabase project to another."
  echo ""

  phase0_prerequisites
  phase1_export
  phase2_schema
  phase3_import
  phase4_storage
  phase5_update
  phase6_verify
}

main "$@"
