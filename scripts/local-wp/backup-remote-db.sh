#!/usr/bin/env bash
# Backs up a deploy target's database on its own server, outside public_html, and proves the backup is whole.
# Usage (from Git Bash on Windows, which holds the SSH key):
#   bash scripts/local-wp/backup-remote-db.sh <target> [label]
#   e.g. bash scripts/local-wp/backup-remote-db.sh mamas-test before-content-edits
# Any site in plugins/sgs-blocks/scripts/deploy_common.py::TARGETS is accepted, a live site included: the dump only
# reads the database. Run it before any script edits a live site's content or settings (a deploy can roll code back,
# never a database change). Hostinger's `wp db export` writes nothing, so mysqldump runs with the credentials
# wp-config holds, read on the server and never stored or printed here.
# The file is ~/backups/db/<host>-<timestamp>[-label].sql.gz on the server (mode 600: it holds customer details and
# payment settings, so it never leaves the server). The run fails unless the file is not empty, passes gzip's own check
# and ends with mysqldump's "Dump completed" line. The newest 12 unlabelled (routine) backups per host are kept; a
# labelled backup is a deliberate safety copy and is never pruned (prune-db-backups.sh).
# The last line printed is the restore command.
set -euo pipefail

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
TARGET="${1:-}"
LABEL="${2:-}"
[ -n "$TARGET" ] || { echo "Usage: $0 <target> [label]" >&2; exit 2; }
case "$LABEL" in *[!A-Za-z0-9_-]*) echo "The label may hold letters, digits, - and _ only" >&2; exit 2 ;; esac

TARGET_VARS="$( python "$REPO/scripts/local-wp/push_target.py" --any-kind "$TARGET" )" || exit 1
TARGET_HOST="" TARGET_DOCROOT="" SSH_USER_HOST="" SSH_PORT="" SSH_KEY=""
eval "$TARGET_VARS"
[ -n "$TARGET_HOST" ] && [ -n "$TARGET_DOCROOT" ] && [ -n "$SSH_USER_HOST" ] || { echo "push_target.py returned no settings for $TARGET" >&2; exit 1; }

PRUNE_FN="$( cat "$REPO/scripts/local-wp/prune-db-backups.sh" )"
SSH=( ssh -i "$SSH_KEY" -p "$SSH_PORT" -o ConnectTimeout=30 "$SSH_USER_HOST" )
NAME="${TARGET_HOST}-\$(date +%Y%m%d-%H%M%S)${LABEL:+-$LABEL}.sql.gz"

# One remote shell: dump, compress, check, prune. `set -o pipefail` makes a failed mysqldump fail the pipe.
OUT="$( "${SSH[@]}" "set -eo pipefail
$PRUNE_FN
cd ~/$TARGET_DOCROOT
umask 077
mkdir -p ~/backups/db
f=~/backups/db/$NAME
MYSQL_PWD=\"\$(wp config get DB_PASSWORD)\" mysqldump --single-transaction --no-tablespaces -h \"\$(wp config get DB_HOST)\" -u \"\$(wp config get DB_USER)\" \"\$(wp config get DB_NAME)\" | gzip > \"\$f\"
[ -s \"\$f\" ] || { echo 'the backup file is empty' >&2; exit 1; }
gzip -t \"\$f\"
zcat \"\$f\" | tail -1 | grep -q 'Dump completed' || { echo 'the dump has no completion line' >&2; exit 1; }
tables=\$(zcat \"\$f\" | grep -c '^CREATE TABLE')
prune_db_backups ~/backups/db ${TARGET_HOST} 12
echo \"BACKUP \$f \$(wc -c < \"\$f\") \$tables\"
" | tr -d '\r' | grep '^BACKUP ' | tail -1 )" || { echo "Backup of $TARGET failed; nothing was written that can be trusted" >&2; exit 1; }

set -- $OUT
[ "${1:-}" = "BACKUP" ] && [ -n "${2:-}" ] || { echo "Backup of $TARGET failed: the server reported no file" >&2; exit 1; }
echo "backup of $TARGET ($TARGET_HOST): $2, $3 bytes compressed, $4 tables, complete"
echo "restore: ssh into the server, then: cd ~/$TARGET_DOCROOT && zcat $2 | MYSQL_PWD=\"\$(wp config get DB_PASSWORD)\" mysql -h \"\$(wp config get DB_HOST)\" -u \"\$(wp config get DB_USER)\" \"\$(wp config get DB_NAME)\""
