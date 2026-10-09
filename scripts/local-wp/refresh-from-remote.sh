#!/usr/bin/env bash
# Refreshes a local WSL mirror's database and uploads from its Hostinger test site, so measurements run on the local
# copy see the same content, products, Site Info and global styles as the test site. Code is synced separately
# (sync-build.sh), because the mirror runs the repo's build, not the test site's.
# Usage (from Git Bash on Windows, which holds the SSH key):
#   bash scripts/local-wp/refresh-from-remote.sh <local-site> <remote-target>
#   e.g. bash scripts/local-wp/refresh-from-remote.sh local-eye-care eye-care-test
# <local-site> and <remote-target> name secrets files: .claude/secrets/<name>.env, each holding WP_URL_<KEY> (the key is
# the name upper-cased with the hyphens removed). The local database is backed up in WSL before the import; the local
# safety settings (mail block, local environment type, cron off) live in files and wp-config, which this never touches.
set -euo pipefail

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
LOCAL="${1:-}"
REMOTE="${2:-}"
[ -n "$LOCAL" ] && [ -n "$REMOTE" ] || { echo "Usage: $0 <local-site> <remote-target>" >&2; exit 2; }

url_of() {
  local name="$1" key
  key="$( echo "$name" | tr '[:lower:]' '[:upper:]' | tr -d '-' )"
  grep -E "^WP_URL_${key}=" "$REPO/.claude/secrets/$name.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r' | sed 's:/*$::'
}
REMOTE_URL="$( url_of "$REMOTE" )"
LOCAL_URL="$( url_of "$LOCAL" )"
[ -n "$REMOTE_URL" ] && [ -n "$LOCAL_URL" ] || { echo "No WP_URL_ in the secrets files for $REMOTE / $LOCAL" >&2; exit 1; }
HOST="${REMOTE_URL#*://}"
DOCROOT="/var/www/$LOCAL"
SSH=( ssh -i "$HOME/.ssh/id_ed25519" -p 65002 -o ConnectTimeout=30 u945238940@141.136.39.73 )

WORK="$( mktemp -d )"
trap 'rm -rf "$WORK"' EXIT
echo "== export $REMOTE_URL"
# Hostinger's `wp db export` writes nothing, so mysqldump runs with the credentials wp-config holds (never stored here).
# MariaDB 11 opens its dump with a sandbox-mode line older importers reject; it is dropped.
"${SSH[@]}" 'cd ~/domains/'"$HOST"'/public_html && MYSQL_PWD="$(wp config get DB_PASSWORD)" mysqldump --single-transaction --no-tablespaces -h "$(wp config get DB_HOST)" -u "$(wp config get DB_USER)" "$(wp config get DB_NAME)"' \
  | sed '1{/^\/\*M!999999/d}' > "$WORK/db.sql"
"${SSH[@]}" "cd ~/domains/$HOST/public_html/wp-content && tar czf - uploads" > "$WORK/uploads.tgz"
[ -s "$WORK/db.sql" ] && [ -s "$WORK/uploads.tgz" ] || { echo "Empty export" >&2; exit 1; }

WSL_WORK="$( MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root -- wslpath -a "$( cygpath -m "$WORK" )" | tr -d '\r' )"
ESC_REMOTE="${REMOTE_URL//\//\\\\/}"
ESC_LOCAL="${LOCAL_URL//\//\\\\/}"
echo "== import into $LOCAL_URL ($DOCROOT)"
# --exec runs bash directly: `wsl --` would pass the script through an extra shell that expands \$got before bash sees it.
MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root --exec bash -lc "
  set -euo pipefail
  cd '$DOCROOT'
  [ -d wp-content ] || { echo 'Missing $DOCROOT' >&2; exit 1; }
  wp --allow-root --path='$DOCROOT' db export '$DOCROOT-before-refresh.sql' --quiet
  wp --allow-root --path='$DOCROOT' db import '$WSL_WORK/db.sql' --quiet
  wp --allow-root --path='$DOCROOT' search-replace '$REMOTE_URL' '$LOCAL_URL' --all-tables --skip-columns=guid --quiet
  wp --allow-root --path='$DOCROOT' search-replace '$ESC_REMOTE' '$ESC_LOCAL' --all-tables --skip-columns=guid --quiet
  rm -rf wp-content/uploads.refresh && mkdir wp-content/uploads.refresh
  tar xzf '$WSL_WORK/uploads.tgz' -C wp-content/uploads.refresh
  rm -rf wp-content/uploads && mv wp-content/uploads.refresh/uploads wp-content/uploads && rmdir wp-content/uploads.refresh
  chown -R www-data:www-data wp-content/uploads
  sudo -u www-data wp --path='$DOCROOT' cache flush
  got=\$( wp --allow-root --path='$DOCROOT' option get siteurl )
  [ \"\$got\" = '$LOCAL_URL' ] || { echo \"siteurl is \$got, expected $LOCAL_URL\" >&2; exit 1; }
  echo \"siteurl: \$got\"
"
echo "Done. Previous local database: $DOCROOT-before-refresh.sql (in WSL)."
