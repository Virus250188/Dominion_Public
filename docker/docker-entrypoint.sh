#!/bin/sh
set -e

echo "================================================"
echo "  Dominion Dashboard"
echo "  Starting up..."
echo "================================================"

# ── Database migrations ──────────────────────────────────────────────────────
echo "[dominion] Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "[dominion] Migrations complete."

# ── Seed on fresh install ────────────────────────────────────────────────────
USER_COUNT=$(node -e "
  const Database = require('better-sqlite3');
  const db = new Database(process.env.DATABASE_URL.replace('file:', ''));
  try {
    const row = db.prepare('SELECT count(*) as c FROM User').get();
    console.log(row.c);
  } catch(e) {
    console.log('0');
  }
  db.close();
")

if [ "$USER_COUNT" = "0" ]; then
  echo "[dominion] Fresh install detected — seeding database..."
  npx prisma db seed
  echo "[dominion] Seed complete. Default login: admin / admin123"
  echo "[dominion] IMPORTANT: Change the default password after first login!"
else
  echo "[dominion] Database OK — ${USER_COUNT} user(s) found."
fi

# ── Start server ─────────────────────────────────────────────────────────────
echo "[dominion] Starting server on port ${PORT:-3000}..."

# Use exec to replace shell with node process (PID 1)
# This ensures SIGTERM from Docker reaches node directly
exec node server.js
