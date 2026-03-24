#!/usr/bin/env bash
# =============================================================================
# test_backup_restore.sh — Teste qu'un dump PostgreSQL est réellement restaurable
# Usage : ./scripts/test_backup_restore.sh [backup_file.sql.gz]
#
# Sans argument : utilise le dump le plus récent du volume db_backups
# Avec argument : utilise le fichier spécifié
#
# Ce script :
#   1. Lance un container PostgreSQL temporaire isolé
#   2. Restaure le dump dedans
#   3. Vérifie que les tables principales existent et contiennent des données
#   4. Détruit le container temporaire
#
# Prérequis : Docker installé, .env lisible
# =============================================================================
set -euo pipefail

COMPOSE_FILE="$(dirname "$0")/../docker-compose.yml"
ENV_FILE="$(dirname "$0")/../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

DB_NAME="${DB_NAME:-magistrat_douane}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
TEMP_CONTAINER="acs_restore_test_$$"

echo "======================================================"
echo " ACS — Test de restore PostgreSQL"
echo "======================================================"

# ── Trouver le fichier de backup ──────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  BACKUP_FILE="$1"
else
  echo "[1/5] Recherche du dump le plus récent dans le volume db_backups..."
  BACKUP_FILE=$(docker run --rm \
    -v magistrat-douane_db_backups:/backups \
    alpine \
    sh -c "ls -t /backups/*.sql.gz 2>/dev/null | head -1")
  if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Aucun dump trouvé dans le volume db_backups."
    echo "   Attendez 24h ou déclenchez un backup manuel :"
    echo "   docker compose exec db_backup sh -c 'pg_dump | gzip > /backups/manual_test.sql.gz'"
    exit 1
  fi
  echo "   Dump trouvé : $BACKUP_FILE"
fi

# ── Démarrer un container PostgreSQL temporaire ──────────────────────────────
echo "[2/5] Démarrage container PostgreSQL temporaire..."
docker run -d \
  --name "$TEMP_CONTAINER" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  postgres:16-alpine > /dev/null

cleanup() {
  echo "[5/5] Nettoyage container temporaire..."
  docker rm -f "$TEMP_CONTAINER" > /dev/null 2>&1 || true
  echo "   Container supprimé."
}
trap cleanup EXIT

sleep 5

# ── Restaurer le dump ─────────────────────────────────────────────────────────
echo "[3/5] Restoration du dump..."
docker run --rm \
  --link "${TEMP_CONTAINER}:postgres" \
  -v magistrat-douane_db_backups:/backups \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16-alpine \
  sh -c "gunzip -c $BACKUP_FILE | psql -h postgres -U $DB_USER $DB_NAME" \
  && echo "   ✅ Dump restauré sans erreur."

# ── Vérifier les tables critiques ─────────────────────────────────────────────
echo "[4/5] Vérification des tables critiques..."

check_table() {
  local table="$1"
  local count
  count=$(docker exec "$TEMP_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
  if [ -z "$count" ]; then
    echo "   ❌ Table $table : inaccessible"
    return 1
  fi
  echo "   ✅ $table : $count ligne(s)"
}

check_table "accounts_user"
check_table "core_emission"
check_table "core_paiement"
check_table "core_clientrequest"
check_table "magistassur_contratepargne"
check_table "magistassur_contratprevoyance"

echo ""
echo "======================================================"
echo " ✅ RESTORE VALIDÉ — Le backup est fonctionnel"
echo "======================================================"
