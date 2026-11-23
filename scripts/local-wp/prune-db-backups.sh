# Sourced by backup-remote-db.sh (its text is sent to the server) and by test-prune-db-backups.sh.
# prune_db_backups <dir> <host> <keep>: keeps the newest <keep> routine dumps (<host>-YYYYMMDD-HHMMSS.sql.gz) and
# deletes the rest. A labelled dump (<host>-YYYYMMDD-HHMMSS-<label>.sql.gz) is a deliberate safety backup taken before
# a content or settings change, so it is never pruned: routine runs would otherwise push it out after <keep> runs.
prune_db_backups() {
	local dir="$1" host="$2" keep="$3" routine
	# A folder with no routine dump (the host's first backup, or only labelled ones) makes `ls` fail on the unmatched glob;
	# under the remote shell's `set -eo pipefail` that would end the script after a good dump, so it is not an error here.
	routine="$(ls -1t "$dir"/"$host"-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9].sql.gz 2>/dev/null || true)"
	if [ -n "$routine" ]; then
		printf '%s\n' "$routine" | tail -n +"$((keep + 1))" | xargs -r rm -f
	fi
}
