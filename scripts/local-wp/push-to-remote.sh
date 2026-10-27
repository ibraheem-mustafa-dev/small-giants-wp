#!/usr/bin/env bash
# Copies a local WSL mirror's database and uploads onto its Hostinger test site, so a clone built on the mirror lands on
# the test site with identical post, menu and media ids. The reverse of refresh-from-remote.sh.
# Usage (from Git Bash on Windows, which holds the SSH key):
#   bash scripts/local-wp/push-to-remote.sh <local-site> <remote-target> [--dry-run]
#   e.g. bash scripts/local-wp/push-to-remote.sh local-eye-care eye-care-clone-test --dry-run
# <local-site> and <remote-target> name secrets files: .claude/secrets/<name>.env, each holding WP_URL_<KEY> (the key is
# the name upper-cased with the hyphens removed). SECRETS_DIR overrides the secrets folder (a worktree has none).
# --dry-run performs every read and check and prints each step, but writes nothing on the server and imports nothing.
# The remote database is backed up on the server before anything is written; a failed run prints the restore command.
set -euo pipefail

# The only sites this may overwrite. A production site can never be a target: add a name here only for a test site.
ALLOWED_REMOTE_TARGETS=( eye-care-test eye-care-clone-test indus-test mamas-test )

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
SECRETS_DIR="${SECRETS_DIR:-$REPO/.claude/secrets}"
LOCAL=""
REMOTE=""
DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -*) echo "Unknown option $arg" >&2; exit 2 ;;
    *) if [ -z "$LOCAL" ]; then LOCAL="$arg"; elif [ -z "$REMOTE" ]; then REMOTE="$arg"; else echo "Too many arguments" >&2; exit 2; fi ;;
  esac
done
[ -n "$LOCAL" ] && [ -n "$REMOTE" ] || { echo "Usage: $0 <local-site> <remote-target> [--dry-run]" >&2; exit 2; }

# 1. Guard and URLs.
allowed=0
for name in "${ALLOWED_REMOTE_TARGETS[@]}"; do [ "$name" = "$REMOTE" ] && allowed=1; done
[ "$allowed" = 1 ] || { echo "Refusing: '$REMOTE' is not an allowed push target (${ALLOWED_REMOTE_TARGETS[*]})" >&2; exit 1; }

url_of() {
  local name="$1" key
  key="$( echo "$name" | tr '[:lower:]' '[:upper:]' | tr -d '-' )"
  grep -E "^WP_URL_${key}=" "$SECRETS_DIR/$name.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r' | sed 's:/*$::'
}
REMOTE_URL="$( url_of "$REMOTE" )"
LOCAL_URL="$( url_of "$LOCAL" )"
[ -n "$REMOTE_URL" ] && [ -n "$LOCAL_URL" ] || { echo "No WP_URL_ in the secrets files for $REMOTE / $LOCAL" >&2; exit 1; }
HOST="${REMOTE_URL#*://}"
RROOT="~/domains/$HOST/public_html"
DOCROOT="/var/www/$LOCAL"
SSH=( ssh -i "$HOME/.ssh/id_ed25519" -p 65002 -o ConnectTimeout=30 u945238940@141.136.39.73 )

# Credentials are read on the server inside the remote shell and never stored or printed here.
RDB_ENV='MYSQL_PWD="$(wp config get DB_PASSWORD)"'
RDB_ARGS='-h "$(wp config get DB_HOST)" -u "$(wp config get DB_USER)" "$(wp config get DB_NAME)"'

WORK="$( mktemp -d )"
BACKUP=""
IMPORT_STARTED=0
restore_hint() {
  echo "Restore the remote database with:" >&2
  echo "  ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73 'cd $RROOT && $RDB_ENV mysql $RDB_ARGS < $BACKUP'" >&2
}
on_exit() {
  local code=$?
  rm -rf "$WORK"
  if [ "$code" -ne 0 ] && [ "$IMPORT_STARTED" = 1 ] && [ -n "$BACKUP" ]; then restore_hint; fi
}
trap on_exit EXIT

lsh() { MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root --exec bash -lc "$1" | tr -d '\r'; }
lwp() { lsh "wp --allow-root --path='$DOCROOT' $1"; }
rsh() { "${SSH[@]}" "cd $RROOT && $1" | tr -d '\r'; }
step() { echo "== $*"; }
would() { echo "   [dry-run] would: $*"; }

mode="push"; [ "$DRY" = 1 ] && mode="dry run"
echo "Mode: $mode. Mirror $LOCAL ($LOCAL_URL) -> $REMOTE ($REMOTE_URL)"

# 5 (read part). Table prefixes must match, and the mirror must be the site its secrets file says.
step "checks"
lsh "[ -d '$DOCROOT/wp-content' ]" || { echo "Missing $DOCROOT in WSL (is the mirror set up and WSL running?)" >&2; exit 1; }
LOCAL_SITEURL="$( lwp "option get siteurl" )"
[ "$LOCAL_SITEURL" = "$LOCAL_URL" ] || { echo "Mirror siteurl is $LOCAL_SITEURL, the secrets file says $LOCAL_URL" >&2; exit 1; }
LPREFIX="$( lwp "config get table_prefix" )"
RPREFIX="$( rsh "wp config get table_prefix" )"
[ -n "$LPREFIX" ] && [ -n "$RPREFIX" ] || { echo "Could not read a table prefix (mirror '$LPREFIX', remote '$RPREFIX')" >&2; exit 1; }
[ "$LPREFIX" = "$RPREFIX" ] || { echo "Table prefixes differ: mirror '$LPREFIX', remote '$RPREFIX'. Refusing." >&2; exit 1; }
echo "table prefix: $LPREFIX (both sides)"
echo "remote siteurl now: $( rsh "wp option get siteurl" )"

# 6. The search-replace pairs: the mirror's URL (and its other scheme) in plain, JSON-escaped and scheme-relative form.
LOCAL_SCHEME="${LOCAL_URL%%://*}"
LOCAL_HOSTPART="${LOCAL_URL#*://}"
if [ "$LOCAL_SCHEME" = "http" ]; then ALT_URL="https://$LOCAL_HOSTPART"; else ALT_URL="http://$LOCAL_HOSTPART"; fi
json_escape() { printf '%s' "$1" | sed 's#/#\\/#g'; }
FROMS=( "$LOCAL_URL" "$( json_escape "$LOCAL_URL" )" "$ALT_URL" "$( json_escape "$ALT_URL" )" "//$LOCAL_HOSTPART" "$( json_escape "//$LOCAL_HOSTPART" )" )
TOS=( "$REMOTE_URL" "$( json_escape "$REMOTE_URL" )" "$REMOTE_URL" "$( json_escape "$REMOTE_URL" )" "//$HOST" "$( json_escape "//$HOST" )" )
echo "search-replace pairs (applied in order, --all-tables-with-prefix --skip-columns=guid):"
for i in "${!FROMS[@]}"; do echo "   ${FROMS[$i]}  ->  ${TOS[$i]}"; done

# 3. Dump the mirror inside WSL (wp-cli, as refresh imports with it).
step "dump the mirror database"
WSL_WORK="$( MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root -- wslpath -a "$( cygpath -m "$WORK" )" | tr -d '\r' )"
lwp "db export '$WSL_WORK/db.sql' --quiet"
sed -i '1{/^\/\*M!999999/d}' "$WORK/db.sql"
[ -s "$WORK/db.sql" ] || { echo "Empty mirror dump" >&2; exit 1; }
echo "mirror dump: $( wc -c < "$WORK/db.sql" ) bytes"
for i in "${!FROMS[@]}"; do
  echo "   occurrences of '${FROMS[$i]}' in the dump: $( grep -oF -- "${FROMS[$i]}" "$WORK/db.sql" | wc -l )"
done

# Counts of posts by type on both sides, so a wrong pairing shows before anything is written.
POSTS_SQL="SELECT post_type, COUNT(*) AS n FROM ${LPREFIX}posts GROUP BY post_type ORDER BY post_type"
echo "posts by type, mirror:"
lwp "db query '$POSTS_SQL'" | sed 's/^/   /'
echo "posts by type, remote (before):"
rsh "wp db query \"$POSTS_SQL\"" | sed 's/^/   /'
echo "mirror uploads: $( lsh "du -sh '$DOCROOT/wp-content/uploads' | cut -f1" ) in $( lsh "find '$DOCROOT/wp-content/uploads' -type f | wc -l" ) files"

# 2. Back up the remote database on the server, outside public_html.
step "back up the remote database on the server"
if [ "$DRY" = 1 ]; then
  would "mysqldump the remote database to ~/backups/push-to-remote/${HOST}-<timestamp>.sql on the server (fails if empty)"
else
  BACKUP="$( rsh 'mkdir -p ~/backups/push-to-remote && f=~/backups/push-to-remote/'"$HOST"'-$(date +%Y%m%d-%H%M%S).sql && '"$RDB_ENV"' mysqldump --single-transaction --no-tablespaces '"$RDB_ARGS"' > "$f" && [ -s "$f" ] && echo "$f"' | tail -1 )"
  [ -n "$BACKUP" ] || { echo "Remote backup is empty or failed; nothing was changed" >&2; exit 1; }
  echo "remote backup: $BACKUP ($( rsh "wc -c < $BACKUP" ) bytes)"
fi

# 4. Uploads: additive, nothing on the server is deleted.
step "uploads"
if [ "$DRY" = 1 ]; then
  would "tar czf the mirror's wp-content/uploads and extract it over $RROOT/wp-content/uploads (additive)"
else
  lsh "tar czf '$WSL_WORK/uploads.tgz' -C '$DOCROOT/wp-content' uploads"
  [ -s "$WORK/uploads.tgz" ] || { echo "Empty uploads archive" >&2; exit 1; }
  "${SSH[@]}" "cd $RROOT/wp-content && tar xzf -" < "$WORK/uploads.tgz"
  echo "uploads extracted over the remote uploads"
fi

# 5. Import the dump.
step "import the dump into the remote database"
if [ "$DRY" = 1 ]; then
  would "mysql import of the mirror dump on the server"
else
  IMPORT_STARTED=1
  "${SSH[@]}" "cd $RROOT && $RDB_ENV mysql $RDB_ARGS" < "$WORK/db.sql"
  echo "imported"
fi

# 6. Search-replace.
step "search-replace on the server"
if [ "$DRY" = 1 ]; then
  for i in "${!FROMS[@]}"; do would "wp search-replace '${FROMS[$i]}' '${TOS[$i]}' --all-tables-with-prefix --skip-columns=guid --report-changed-only"; done
else
  for i in "${!FROMS[@]}"; do
    rsh "wp search-replace '${FROMS[$i]}' '${TOS[$i]}' --all-tables-with-prefix --skip-columns=guid --report-changed-only"
  done
fi

# 7. Caches.
step "flush caches on the server"
if [ "$DRY" = 1 ]; then
  would "wp cache flush; wp litespeed-purge all (if LiteSpeed Cache is active); wp rewrite flush; opcache_reset"
else
  rsh "wp cache flush"
  rsh "if wp plugin is-active litespeed-cache; then wp litespeed-purge all; fi"
  rsh "wp rewrite flush"
  rsh "wp eval 'if(function_exists(\"opcache_reset\"))opcache_reset();'"
fi

# 8. Verify.
step "verify"
if [ "$DRY" = 1 ]; then
  would "check siteurl and home on the server equal $REMOTE_URL exactly"
  echo "Dry run complete: nothing was written."
  exit 0
fi
for opt in siteurl home; do
  got="$( rsh "wp option get $opt" )"
  if [ "$got" != "$REMOTE_URL" ]; then
    echo "$opt is '$got', expected '$REMOTE_URL'" >&2
    restore_hint
    exit 1
  fi
  echo "$opt: $got"
done
echo "posts by type, remote (after):"
rsh "wp db query \"$POSTS_SQL\"" | sed 's/^/   /'
echo "Done. Previous remote database: $BACKUP (on the server)."
