#!/usr/bin/env bash
# Link missing cover files from parent story_data/covers into public/covers
# for local npm next (:3000). Docker :3002 already bind-mounts story_data/covers.
#
# Keeps public/covers/ as a directory (and .gitkeep). Does not replace the dir
# with a symlink. Idempotent. Never deletes existing files unless --force.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/covers"
SRC="$(cd "$ROOT/../story_data/covers" 2>/dev/null && pwd || true)"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help)
      echo "Usage: bash scripts/link-local-covers.sh [--force]"
      echo "  Links/copies missing files from ../story_data/covers into public/covers."
      exit 0
      ;;
  esac
done

if [[ -z "$SRC" || ! -d "$SRC" ]]; then
  echo "[covers] Missing source: $ROOT/../story_data/covers" >&2
  exit 1
fi

mkdir -p "$DEST"
if [[ ! -e "$DEST/.gitkeep" ]]; then
  : >"$DEST/.gitkeep"
fi

linked=0
skipped=0
replaced=0

shopt -s nullglob
for src in "$SRC"/*; do
  [[ -f "$src" ]] || continue
  name="$(basename "$src")"
  [[ "$name" == .* ]] && continue
  dest="$DEST/$name"

  if [[ -e "$dest" || -L "$dest" ]]; then
    if [[ "$FORCE" -eq 1 ]]; then
      rm -f "$dest"
      if ln -s "$src" "$dest" 2>/dev/null || ln "$src" "$dest" 2>/dev/null; then
        replaced=$((replaced + 1))
      else
        cp -f "$src" "$dest"
        replaced=$((replaced + 1))
      fi
    else
      skipped=$((skipped + 1))
    fi
    continue
  fi

  if ln -s "$src" "$dest" 2>/dev/null || ln "$src" "$dest" 2>/dev/null; then
    linked=$((linked + 1))
  else
    cp -f "$src" "$dest"
    linked=$((linked + 1))
  fi
done

echo "[covers] src=$SRC"
echo "[covers] dest=$DEST"
echo "[covers] linked_or_copied=$linked skipped_existing=$skipped replaced=$replaced"
echo "[covers] Done. Restart/local next on :3000 if covers still 404."
