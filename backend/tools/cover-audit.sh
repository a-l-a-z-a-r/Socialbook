#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "MONGODB_URI is required"
  exit 1
fi

export COVER_MIN_BYTES="${COVER_MIN_BYTES:-2048}"
export COVER_MIN_DIMENSION="${COVER_MIN_DIMENSION:-2}"
export COVER_PROBE_BYTES="${COVER_PROBE_BYTES:-16384}"
export COVER_TIMEOUT_MS="${COVER_TIMEOUT_MS:-5000}"
export COVER_AUDIT_CONCURRENCY="${COVER_AUDIT_CONCURRENCY:-5}"

node "$(dirname "$0")/cover-audit.js"
