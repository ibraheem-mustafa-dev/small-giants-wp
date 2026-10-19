#!/usr/bin/env bash
# Copies the repo's built plugins and theme into the local WSL mirror sites.
# Usage (from Windows): wsl -d Ubuntu -u root -- bash /mnt/c/Users/Bean/Projects/small-giants-wp/scripts/local-wp/sync-build.sh <local-eye-care|local-sandybrown|local-indus|all>
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${1:-}"

sync_site() {
  local site="$1" dir="/var/www/$1"
  [ -d "$dir/wp-content" ] || { echo "Missing $dir" >&2; exit 1; }
  echo "== $site"

  # sgs-blocks: the built plugin without sources, tests or dev dependencies.
  rsync -a --delete \
    --exclude=node_modules --exclude=/src --exclude=/tests --exclude=/.phpunit.cache \
    "$REPO/plugins/sgs-blocks/" "$dir/wp-content/plugins/sgs-blocks/"

  # Every other plugins/sgs-* folder that already exists on this site's copy.
  for p in "$REPO"/plugins/sgs-*/; do
    name="$(basename "$p")"
    [ "$name" = "sgs-blocks" ] && continue
    if [ -d "$dir/wp-content/plugins/$name" ]; then
      rsync -a --delete --exclude=node_modules --exclude=/tests --exclude=/.phpunit.cache \
        "$p" "$dir/wp-content/plugins/$name/"
    fi
  done

  rsync -a --delete --exclude=node_modules "$REPO/theme/sgs-theme/" "$dir/wp-content/themes/sgs-theme/"
  # The theme.json its test site runs: the client snapshot a deploy ships there, so default paint measured here
  # carries that snapshot's paint key (mirror_theme_json.py).
  local tj
  tj="$(mktemp)"
  python3 "$REPO/scripts/local-wp/mirror_theme_json.py" "$site" "$tj"
  install -m 644 "$tj" "$dir/wp-content/themes/sgs-theme/theme.json"
  rm -f "$tj"

  chown -R www-data:www-data "$dir/wp-content/plugins" "$dir/wp-content/themes"
  sudo -u www-data wp --path="$dir" cache flush
}

case "$TARGET" in
  local-eye-care|local-sandybrown|local-indus) sync_site "$TARGET" ;;
  all) sync_site local-eye-care; sync_site local-sandybrown; sync_site local-indus ;;
  *) echo "Usage: $0 <local-eye-care|local-sandybrown|local-indus|all>" >&2; exit 2 ;;
esac
