#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@db:5432/github-rag}"

echo "==> Initializing PostgreSQL Database Schema via Prisma..."
max_retries=30
count=0
until npx prisma db push --accept-data-loss || [ $count -eq $max_retries ]; do
  count=$((count + 1))
  echo "Database not ready yet. Retrying ($count/$max_retries)..."
  sleep 2
done

if [ $count -eq $max_retries ]; then
  echo "Error: Database connection failed after $max_retries attempts."
  exit 1
fi

echo "==> Database schema synced successfully!"
echo "==> Starting Next.js application..."
exec "$@"
