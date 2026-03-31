#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:5286"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

step() { echo -e "\n${YELLOW}[$1/5]${NC} $2"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗ FAILED — $1${NC}"; exit 1; }

# 1 — env vars
step 1 "Checking environment variables"
: "${POSTGRES_DB:?not set — open a fresh terminal so .bashrc sources .env}"
: "${POSTGRES_USER:?not set}"
: "${POSTGRES_PASSWORD:?not set}"
ok "Environment variables present"

# 2 — API reachable
step 2 "Checking API at $API_URL"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
  -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
[ "$STATUS" = "000" ] && fail "cannot connect — is the backend running? (dotnet run --launch-profile http)"
ok "API is reachable (HTTP $STATUS)"

# 3 — wipe non-demo users
step 3 "Wiping non-demo users"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "DELETE FROM \"AspNetUsers\" WHERE \"Email\" != 'demo@jobtracker.com';" \
  || fail "psql DELETE failed — check DB connection (is the container running?)"
ok "Non-demo users wiped"

# 4 — register accounts
step 4 "Registering dev accounts"

register() {
  local EMAIL="$1" PASS="$2"
  local STATUS
  STATUS=$(curl -s -o /tmp/seed_resp.json -w "%{http_code}" \
    -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
  if [ "$STATUS" = "000" ]; then
    fail "register $EMAIL — lost connection to API"
  elif [ "$STATUS" != "200" ]; then
    echo "  Response: $(cat /tmp/seed_resp.json)"
    fail "register $EMAIL — HTTP $STATUS"
  fi
  ok "Registered $EMAIL"
}

register "alice@test.com"   "Alice1!dev"
register "bob@test.com"     "Bob1!dev"
register "charlie@test.com" "Charlie1!dev"

# 5 — confirm emails (bypass email flow in dev)
step 5 "Setting EmailConfirmed = true for dev accounts"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "UPDATE \"AspNetUsers\" SET \"EmailConfirmed\" = true
   WHERE \"Email\" IN ('alice@test.com','bob@test.com','charlie@test.com');" \
  || fail "psql UPDATE failed"
ok "Email confirmed for all dev accounts"

echo -e "\n${GREEN}Done.${NC} See docs/dev-accounts.md for credentials."
