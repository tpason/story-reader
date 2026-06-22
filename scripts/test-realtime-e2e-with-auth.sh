#!/usr/bin/env bash
# Run realtime Playwright specs with a generated token (server must use the same token).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TOKEN="$(bash "$ROOT/docker/scripts/generate-reader-realtime-token.sh")"
export READER_REALTIME_TOKEN="$TOKEN"
export PLAYWRIGHT_READER_REALTIME_TOKEN="$TOKEN"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3003}"

echo "Using PLAYWRIGHT_BASE_URL=$PLAYWRIGHT_BASE_URL"
echo "Start server in another terminal:"
echo "  READER_REALTIME_TOKEN=$TOKEN PORT=3003 npm run dev:ws"
echo

cd "$ROOT/story_reader"
npm run test:e2e:realtime
