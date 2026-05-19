#!/usr/bin/env bash
# Diagnose "Invalid credentials" issue. READ-ONLY against the database.
# Run on the VPS after sourcing .env (or from the project dir that has .env).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

echo "==> User table snapshot (look for: NULL/empty role, password length != 60)"
docker exec -i dynamic-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" <<'SQL'
SELECT
  id,
  email,
  role,
  LENGTH(password) AS pw_len,
  LENGTH(email)    AS email_len,
  CASE WHEN email <> TRIM(email)                 THEN 'YES' ELSE '' END AS has_whitespace,
  CASE WHEN email <> LOWER(email)                THEN 'YES' ELSE '' END AS has_uppercase,
  CASE WHEN LEFT(password,4) IN ('$2a$','$2b$','$2y$') THEN '' ELSE 'BAD' END AS pw_hash_format,
  createdAt
FROM User
ORDER BY createdAt DESC;
SQL

echo ""
echo "==> Distinct roles in DB (should only be: stock_manager, account_manager, branch_manager, salesman)"
docker exec -i dynamic-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" <<'SQL'
SELECT role, COUNT(*) AS n FROM User GROUP BY role;
SQL
