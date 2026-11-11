#!/usr/bin/env bash
# Idempotent: creates or updates the page "gr-gradient-border-fixture" on a local mirror and prints its URL.
# Usage (inside WSL): install.sh <wp-path> [content-file]   e.g. install.sh /var/www/local-mediatest-pkg-gr
set -euo pipefail
WP_PATH="${1:?wp path}"
CONTENT="${2:-$(dirname "$0")/page-content.html}"
cd "$WP_PATH"
IMG="$(wp --allow-root option get siteurl)/wp-content/uploads/2026/05/cookies-stacked.jpeg"
BODY="$(sed "s#__IMG__#${IMG}#g" "$CONTENT")"
ID="$(wp --allow-root post list --post_type=page --name=gr-gradient-border-fixture --post_status=any --field=ID | head -1)"
if [ -n "$ID" ]; then
  wp --allow-root post update "$ID" --post_status=publish --post_content="$BODY" >/dev/null
else
  ID="$(wp --allow-root post create --post_type=page --post_status=publish --post_name=gr-gradient-border-fixture --post_title='Gradient border fixture' --post_content="$BODY" --porcelain)"
fi
wp --allow-root post get "$ID" --field=url
