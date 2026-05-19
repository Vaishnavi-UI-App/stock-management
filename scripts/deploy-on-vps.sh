#!/usr/bin/env bash
# Safe deploy script — run this ON the VPS (root@72.61.244.31), inside the project directory.
#
# Guarantees:
#   1. Snapshots the live MySQL database to a timestamped .sql file BEFORE anything changes.
#   2. Never runs `docker compose down -v` (the -v would wipe the database volume).
#   3. Never runs `prisma db push --accept-data-loss` (Dockerfile fix already removed it).
#   4. Only rebuilds frontend + backend. The `database` service is left running untouched.
#   5. Aborts on first error (`set -e`).
#
# Usage:
#   cd /path/to/StockManagement   (wherever the docker-compose.yml lives on the VPS)
#   bash scripts/deploy-on-vps.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$PROJECT_DIR/db-backups"
mkdir -p "$BACKUP_DIR"

echo "==> Deploy starting in $PROJECT_DIR at $TIMESTAMP"

# Load env (need MYSQL_ROOT_PASSWORD and MYSQL_DATABASE for the backup)
if [[ -f .env ]]; then
  set -a; source .env; set +a
else
  echo "FATAL: .env not found in $PROJECT_DIR — cannot read MYSQL_ROOT_PASSWORD." >&2
  exit 1
fi

# --- 1. Sanity check: is the database container running? ---
if ! docker ps --format '{{.Names}}' | grep -q '^dynamic-mysql$'; then
  echo "FATAL: container 'dynamic-mysql' is not running. Aborting before any changes." >&2
  exit 1
fi

# --- 2. Snapshot the live DB (mysqldump, no locks, single transaction) ---
BACKUP_FILE="$BACKUP_DIR/${MYSQL_DATABASE}-${TIMESTAMP}.sql"
echo "==> Dumping database '$MYSQL_DATABASE' to $BACKUP_FILE"
docker exec dynamic-mysql sh -c \
  "exec mysqldump --single-transaction --quick --routines --triggers \
     -uroot -p'$MYSQL_ROOT_PASSWORD' '$MYSQL_DATABASE'" \
  > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "FATAL: backup file is empty. Aborting deploy." >&2
  exit 1
fi
echo "==> Backup OK ($(wc -c < "$BACKUP_FILE") bytes)"

# --- 3. Pull latest code ---
echo "==> git fetch + pull"
git fetch --all --prune
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> on branch: $CURRENT_BRANCH"
git pull --ff-only

# --- 4. Rebuild ONLY frontend + backend. Database is untouched. ---
echo "==> Rebuilding backend image"
docker compose build --no-cache backend
echo "==> Rebuilding frontend image"
docker compose build --no-cache frontend

echo "==> Recreating backend + frontend containers (database is left running)"
docker compose up -d --no-deps --force-recreate backend frontend

# --- 5. Wait + smoke test ---
echo "==> Waiting 10s for backend to come up"
sleep 10

echo "==> Backend container status:"
docker ps --filter name=dynamic-backend --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "==> Frontend container status:"
docker ps --filter name=dynamicinventory --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "==> Tail of backend logs (last 30 lines):"
docker logs --tail 30 dynamic-backend || true

echo "==> Smoke test: GET http://127.0.0.1:3101/api/auth/me (expect 401, NOT 500/connection refused)"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3101/api/auth/me || echo '000')"
echo "==> /api/auth/me returned HTTP $HTTP_CODE"
if [[ "$HTTP_CODE" != "401" ]]; then
  echo "WARNING: expected 401 (no token) but got $HTTP_CODE. Investigate backend logs above." >&2
fi

echo ""
echo "==> Deploy complete."
echo "    Backup:  $BACKUP_FILE"
echo "    Restore: docker exec -i dynamic-mysql sh -c 'exec mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" $MYSQL_DATABASE' < $BACKUP_FILE"
