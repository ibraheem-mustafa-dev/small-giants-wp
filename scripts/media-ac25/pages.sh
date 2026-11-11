#!/usr/bin/env bash
# Lists every published front-end URL path of a local mirror, one per line (read only).
# Usage: bash scripts/media-ac25/pages.sh local-mediatest-eye-care > urls.txt   (counts go to stderr)
# Covers: home, posts page, shop page, one blog category, one product category, and every published
# post of every public post type (pages, posts, products, custom types) except attachments.
set -euo pipefail
export MSYS_NO_PATHCONV=1
SITE="${1:?usage: pages.sh <local-site-folder-under-/var/www>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WSLPHP="$(wsl -d Ubuntu -u root -- wslpath -a "$(cygpath -m "$HERE" 2>/dev/null || echo "$HERE")" | tr -d "")/list-urls.php"
OUT="$(wsl -d Ubuntu -u root -- wp --path="/var/www/$SITE" --allow-root eval-file "$WSLPHP" 2>&1 | tr -d '\r' | grep -E '^/' || true)"
printf '%s\n' "$OUT"
printf 'pages.sh: %s -> %s URLs\n' "$SITE" "$(printf '%s\n' "$OUT" | grep -c . || true)" >&2
