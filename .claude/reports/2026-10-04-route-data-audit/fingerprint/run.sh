#!/bin/bash
# Rerun the wiring-fingerprint scan (read-only on the repo).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO=/c/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks
node "$HERE/editor-facts.js" > "$HERE/editor-facts.json"
( cd "$REPO" && node scripts/check-dead-controls.js --dump-json ) > "$HERE/dump.json"
python "$HERE/fingerprint_scan.py" "$@"
