#!/usr/bin/env bash
# Copies a local WSL mirror's database and uploads onto its Hostinger test site, so a clone built on the mirror lands on
# the test site with identical post, menu and media ids. The reverse of refresh-from-remote.sh.
# Usage (from Git Bash on Windows, which holds the SSH key):
#   bash scripts/local-wp/push-to-remote.sh <local-site> <remote-target> [--dry-run] [--client <slug>]
#   e.g. bash scripts/local-wp/push-to-remote.sh local-eye-care eye-care-clone-test --dry-run
# <local-site> and <remote-target> name secrets files: .claude/secrets/<name>.env, each holding WP_URL_<KEY> (the key is
# the name upper-cased with the hyphens removed). SECRETS_DIR overrides the secrets folder (a worktree has none).
# --dry-run performs every read and check and prints each step, but writes nothing on the server and imports nothing;
# it also has the server syntax-check the uploads copy script it would run.
# Before anything is read from the database, the sgs-blocks build on the mirror is compared with the one on the test site
# (scripts/computed-route/build-compare.mjs, --dry-run included); a mismatch refuses, with the build-deploy.py fix.
# After the copy, `--client <slug>` runs scripts/computed-route/site-check.mjs against the test site; without it the exact
# command is printed as the last step.
# The remote database is backed up on the server before anything is written; a failed run prints the restore command.
#
# This is the one sanctioned mirror-to-test-site copy (root CLAUDE.md, Build and deploy). The sites it may write to,
# their server paths and the SSH endpoint come from plugins/sgs-blocks/scripts/deploy_common.py::TARGETS through
# push_target.py: only a site of kind "test" is accepted, so the canary and a reference site (eye-care-test) are
# refused. Uploads are additive: the archive is unpacked into a temporary folder on the server, checked, then copied
# into wp-content/uploads; nothing already there is deleted.
set -euo pipefail

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
SECRETS_DIR="${SECRETS_DIR:-$REPO/.claude/secrets}"
LOCAL=""
REMOTE=""
DRY=0
CLIENT=""
NEXT_IS_CLIENT=0
for arg in "$@"; do
  if [ "$NEXT_IS_CLIENT" = 1 ]; then CLIENT="$arg"; NEXT_IS_CLIENT=0; continue; fi
  case "$arg" in
    --dry-run) DRY=1 ;;
    --client) NEXT_IS_CLIENT=1 ;;
    -*) echo "Unknown option $arg" >&2; exit 2 ;;
    *) if [ -z "$LOCAL" ]; then LOCAL="$arg"; elif [ -z "$REMOTE" ]; then REMOTE="$arg"; else echo "Too many arguments" >&2; exit 2; fi ;;
  esac
done
[ "$NEXT_IS_CLIENT" = 0 ] || { echo "--client needs a value" >&2; exit 2; }
[ -n "$LOCAL" ] && [ -n "$REMOTE" ] || { echo "Usage: $0 <local-site> <remote-target> [--dry-run] [--client <slug>]" >&2; exit 2; }

# 1. Guard and URLs. push_target.py refuses anything that is not a test site in the deploy roster.
TARGET_VARS="$( python "$REPO/scripts/local-wp/push_target.py" "$REMOTE" )" || exit 1
TARGET_HOST="" TARGET_DOCROOT="" SSH_USER_HOST="" SSH_PORT="" SSH_KEY=""
eval "$TARGET_VARS"
[ -n "$TARGET_HOST" ] && [ -n "$TARGET_DOCROOT" ] && [ -n "$SSH_USER_HOST" ] || { echo "push_target.py returned no settings for $REMOTE" >&2; exit 1; }

url_of() {
  local name="$1" key
  key="$( echo "$name" | tr '[:lower:]' '[:upper:]' | tr -d '-' )"
  grep -E "^WP_URL_${key}=" "$SECRETS_DIR/$name.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r' | sed 's:/*$::'
}
REMOTE_URL="$( url_of "$REMOTE" )"
LOCAL_URL="$( url_of "$LOCAL" )"
[ -n "$REMOTE_URL" ] && [ -n "$LOCAL_URL" ] || { echo "No WP_URL_ in the secrets files for $REMOTE / $LOCAL" >&2; exit 1; }
HOST="${REMOTE_URL#*://}"
[ "$HOST" = "$TARGET_HOST" ] || { echo "Refusing: the secrets file's URL host '$HOST' is not the roster's host '$TARGET_HOST' for $REMOTE" >&2; exit 1; }
RROOT="~/$TARGET_DOCROOT"
DOCROOT="/var/www/$LOCAL"
SSH=( ssh -i "$SSH_KEY" -p "$SSH_PORT" -o ConnectTimeout=30 "$SSH_USER_HOST" )

# Credentials are read on the server inside the remote shell and never stored or printed here.
RDB_ENV='MYSQL_PWD="$(wp config get DB_PASSWORD)"'
RDB_ARGS='-h "$(wp config get DB_HOST)" -u "$(wp config get DB_USER)" "$(wp config get DB_NAME)"'

WORK="$( mktemp -d )"
BACKUP=""
IMPORT_STARTED=0
restore_hint() {
  echo "The test site may now hold the mirror's users and password hashes (the login restore did not finish): restore it now." >&2
  echo "Restore the remote database with:" >&2
  echo "  ssh -i $SSH_KEY -p $SSH_PORT $SSH_USER_HOST 'cd $RROOT && $RDB_ENV mysql $RDB_ARGS < $BACKUP'" >&2
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
# The plugin build the clone was made with must be the build the test site runs.
node "$REPO/scripts/computed-route/build-compare.mjs" --local "$LOCAL" --target "$REMOTE" || { echo "Refusing: the sgs-blocks build differs (see above); nothing was written" >&2; exit 1; }
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

# The test site keeps its own logins: the mirror's passwords are set by reset-login.mjs from the mirror's secrets file,
# so each remote user's password hash and application passwords are saved on the server (never fetched here) and put
# back by login name after the import. A user only the mirror has gets a random password nobody knows and no
# application passwords, and every user's login sessions are cleared, so no credential or session made on the mirror
# works on the internet-facing test site. Only logins are printed, never a hash or a password.
LOGINS="~/backups/push-to-remote/${HOST}-logins.json"
SAVE_LOGINS_PHP='<?php
$out = array();
foreach ( get_users( array( "fields" => "all" ) ) as $u ) {
	$out[] = array( "login" => $u->user_login, "email" => strtolower( (string) $u->user_email ), "pass" => $u->user_pass, "app" => get_user_meta( $u->ID, "_application_passwords", true ) );
}
$f = $args[0];
file_put_contents( $f, wp_json_encode( $out ) );
chmod( $f, 0600 );
echo count( $out ) . " login(s) saved\n";'
RESTORE_LOGINS_PHP='<?php
global $wpdb;
$rows = json_decode( (string) file_get_contents( $args[0] ), true );
if ( ! is_array( $rows ) ) { fwrite( STDERR, "No saved logins\n" ); exit( 1 ); }
$saved = array();
foreach ( $rows as $r ) {
	$saved[ (string) $r["login"] ] = $r;
}
$restored = array();
$locked   = array();
foreach ( get_users( array( "fields" => "all" ) ) as $u ) {
	// A test-site login comes back only to the same person: the same login and the same email. A mirror account that
	// shares a login with a different test-site account is locked like a mirror-only one, so no password moves between people.
	$r = $saved[ $u->user_login ] ?? null;
	if ( $r && isset( $r["email"] ) && strtolower( (string) $u->user_email ) === $r["email"] ) {
		$wpdb->update( $wpdb->users, array( "user_pass" => $r["pass"] ), array( "ID" => $u->ID ) );
		if ( $r["app"] ) { update_user_meta( $u->ID, "_application_passwords", $r["app"] ); } else { delete_user_meta( $u->ID, "_application_passwords" ); }
		$restored[] = $u->user_login;
	} else {
		// The plain password is never kept, so the stored hash matches nothing anyone can type.
		$wpdb->update( $wpdb->users, array( "user_pass" => wp_hash_password( wp_generate_password( 64, true, true ) ) ), array( "ID" => $u->ID ) );
		delete_user_meta( $u->ID, "_application_passwords" );
		$locked[] = $u->user_login;
	}
	clean_user_cache( $u->ID );
}
WP_Session_Tokens::destroy_all_for_all_users();
$left = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key = %s", "session_tokens" ) );
echo count( $restored ) . " login(s) restored: " . implode( ", ", $restored ) . "\n";
echo count( $locked ) . " mirror-only or unmatched login(s) given a random unusable password and no application passwords: " . ( $locked ? implode( ", ", $locked ) : "none" ) . "\n";
echo "login sessions cleared for every user (" . $left . " session_tokens rows left)\n";
if ( 0 !== $left ) { fwrite( STDERR, "session_tokens rows remain\n" ); exit( 1 ); }'
step "save the test site's logins"
if [ "$DRY" = 1 ]; then
  would "save each remote user's password hash and application passwords to $LOGINS on the server (mode 600)"
else
  printf '%s' "$SAVE_LOGINS_PHP" | "${SSH[@]}" "cd $RROOT && wp eval-file - $LOGINS" | tr -d '\r'
fi

# 4. Uploads: additive, nothing on the server is deleted. The archive goes to a fresh temporary folder on the server
# (outside public_html), is checked (size, every entry under uploads/, no "..", no absolute path, no link, file count),
# unpacked there, and only then copied into wp-content/uploads. The temporary folder is removed afterwards.
# Arguments: <temp folder> <site docroot> <archive bytes> <file count>.
UPLOADS_REMOTE_SH='set -euo pipefail
T="$1"; ROOT="$2"; WANT_BYTES="$3"; WANT_FILES="$4"
case "$T" in "$HOME"/backups/push-to-remote/uploads-*) ;; *) echo "Refusing: unexpected temporary folder $T" >&2; exit 1 ;; esac
trap "rm -rf -- \"$T\"" EXIT
DEST="$ROOT/wp-content/uploads"
[ -d "$ROOT/wp-content" ] || { echo "No wp-content under $ROOT" >&2; exit 1; }
A="$T/uploads.tgz"
GOT_BYTES="$( wc -c < "$A" )"
[ "$GOT_BYTES" = "$WANT_BYTES" ] || { echo "Archive is $GOT_BYTES bytes on the server, $WANT_BYTES sent" >&2; exit 1; }
tar tzf "$A" > "$T/list.txt"
if grep -vqE "^uploads(/|$)" "$T/list.txt"; then echo "Refusing: an archive entry lies outside uploads/" >&2; exit 1; fi
if grep -qE "(^|/)\.\.(/|$)" "$T/list.txt"; then echo "Refusing: an archive entry contains .." >&2; exit 1; fi
if tar tvzf "$A" | grep -qE "^[lh]"; then echo "Refusing: the archive holds a link" >&2; exit 1; fi
mkdir "$T/x"
tar xzf "$A" -C "$T/x" --no-same-owner --no-same-permissions
GOT_FILES="$( find "$T/x/uploads" -type f | wc -l )"
[ "$GOT_FILES" = "$WANT_FILES" ] || { echo "Unpacked $GOT_FILES files, the mirror has $WANT_FILES" >&2; exit 1; }
mkdir -p "$DEST"
cp -R "$T/x/uploads/." "$DEST/"
echo "uploads: $GOT_FILES file(s) copied into $DEST (additive; nothing deleted)"'
step "uploads"
UPLOAD_FILES="$( lsh "find '$DOCROOT/wp-content/uploads' -type f | wc -l" )"
if [ "$DRY" = 1 ]; then
  printf '%s' "$UPLOADS_REMOTE_SH" | "${SSH[@]}" "bash -n" || { echo "The uploads copy script does not parse on the server" >&2; exit 1; }
  echo "   uploads copy script parses on the server (bash -n)"
  "${SSH[@]}" "command -v tar mktemp find cp >/dev/null && [ -d $RROOT/wp-content/uploads ] && echo '   server has tar, mktemp, find, cp and $RROOT/wp-content/uploads'" | tr -d '\r'
  would "tar czf the mirror's wp-content/uploads ($UPLOAD_FILES files), send it to a new ~/backups/push-to-remote/uploads-XXXXXX on the server, check it, unpack it there and copy it into $RROOT/wp-content/uploads (additive)"
else
  lsh "tar czf '$WSL_WORK/uploads.tgz' -C '$DOCROOT/wp-content' uploads"
  [ -s "$WORK/uploads.tgz" ] || { echo "Empty uploads archive" >&2; exit 1; }
  UPLOAD_BYTES="$( wc -c < "$WORK/uploads.tgz" | tr -d ' ' )"
  UPLOAD_TMP="$( rsh 'mkdir -p ~/backups/push-to-remote && mktemp -d ~/backups/push-to-remote/uploads-XXXXXX' | tail -1 )"
  [ -n "$UPLOAD_TMP" ] || { echo "Could not make a temporary folder on the server" >&2; exit 1; }
  "${SSH[@]}" "cat > '$UPLOAD_TMP/uploads.tgz'" < "$WORK/uploads.tgz"
  printf '%s' "$UPLOADS_REMOTE_SH" | "${SSH[@]}" "bash -s -- '$UPLOAD_TMP' $RROOT '$UPLOAD_BYTES' '$UPLOAD_FILES'" | tr -d '\r'
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

step "restore the test site's logins"
if [ "$DRY" = 1 ]; then
  would "put back each saved login's password hash and application passwords, by login name; give each mirror-only user a random unusable password and no application passwords; clear every user's login sessions"
else
  printf '%s' "$RESTORE_LOGINS_PHP" | "${SSH[@]}" "cd $RROOT && wp eval-file - $LOGINS" | tr -d '\r'
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
CHECK_CMD="node scripts/computed-route/site-check.mjs ${CLIENT:-<client>} --site $REMOTE"
if [ -n "$CLIENT" ]; then
  step "site check on the test site"
  ( cd "$REPO" && node scripts/computed-route/site-check.mjs "$CLIENT" --site "$REMOTE" ) || { echo "The site check failed on $REMOTE; the copy itself completed. Re-run: $CHECK_CMD" >&2; exit 1; }
else
  echo "Last step, not run here (it needs the client): $CHECK_CMD"
fi
