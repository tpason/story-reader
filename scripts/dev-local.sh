#!/usr/bin/env bash
# Thin wrapper — see docker/scripts/dev-story-reader.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec bash "$ROOT/docker/scripts/dev-story-reader.sh" "$@"
