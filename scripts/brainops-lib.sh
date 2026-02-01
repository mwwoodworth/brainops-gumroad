#!/usr/bin/env bash
# NOTE: This file is intended to be *sourced* by other scripts.
# Do not change the caller's shell options (errexit/nounset/pipefail) here.

# BrainOps Gumroad repo helper.
# - Loads canonical BrainOps env without printing secrets.
# - Provides safe DB/Gumroad helpers used across scripts.

load_brainops_env() {
  # Prefer the canonical loader (handles pooler port switching safely).
  if [ -f "/home/matt-woodworth/dev/scripts/brainops-env.sh" ]; then
    # shellcheck disable=SC1091
    BRAINOPS_ENV_SILENT=1 source "/home/matt-woodworth/dev/scripts/brainops-env.sh" >/dev/null 2>&1 || true
    return 0
  fi

  # Last-resort fallback if this repo is used standalone.
  if [ -f "/home/matt-woodworth/dev/_secure/BrainOps.env" ]; then
    # shellcheck disable=SC1091
    set -a && source "/home/matt-woodworth/dev/_secure/BrainOps.env" >/dev/null 2>&1 && set +a
    return 0
  fi

  return 0
}

require_db_env() {
  export DB_HOST="${DB_HOST:-${PGHOST:-}}"
  export DB_PORT="${DB_PORT:-${PGPORT:-6543}}"
  export DB_NAME="${DB_NAME:-${PGDATABASE:-postgres}}"
  export DB_USER="${DB_USER:-${PGUSER:-}}"
  export DB_PASS="${DB_PASS:-${PGPASSWORD:-}}"

  : "${DB_HOST:?Missing DB_HOST/PGHOST}"
  : "${DB_PORT:?Missing DB_PORT/PGPORT}"
  : "${DB_NAME:?Missing DB_NAME/PGDATABASE}"
  : "${DB_USER:?Missing DB_USER/PGUSER}"
  : "${DB_PASS:?Missing DB_PASS/PGPASSWORD}"
}

brainops_psql() {
  require_db_env
  # Avoid putting secrets on the process command line.
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}

require_gumroad_token() {
  : "${GUMROAD_ACCESS_TOKEN:?Missing GUMROAD_ACCESS_TOKEN}"
}

gumroad_header_file() {
  require_gumroad_token
  local hdr
  hdr="$(mktemp)"
  chmod 600 "$hdr" || true
  printf 'Authorization: Bearer %s\n' "$GUMROAD_ACCESS_TOKEN" > "$hdr"
  echo "$hdr"
}
