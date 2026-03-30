#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python -c "import psycopg2; psycopg2.connect(host='$DB_HOST', dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD')" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn (${WEB_CONCURRENCY:-3} workers)..."
exec gunicorn config.asgi:application \
    -k uvicorn.workers.UvicornWorker \
    --workers ${WEB_CONCURRENCY:-3} \
    --bind 0.0.0.0:8000 \
    --timeout 60 \
    --keep-alive 5 \
    --access-logfile -
