#!/usr/bin/env bash
# Test for prune-db-backups.sh against a fake backup folder.
# Usage: bash scripts/local-wp/test-prune-db-backups.sh
set -euo pipefail
HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$HERE/prune-db-backups.sh"
DIR="$( mktemp -d "$( [ -d E:/sgs-tmp ] && echo E:/sgs-tmp || echo "${TMPDIR:-/tmp}" )/prune-test-XXXXXX" )"
trap 'rm -rf "$DIR"' EXIT
HOST=example.com
touch "$DIR/$HOST-20260101-000001-before-button-kit-sweep.sql.gz" "$DIR/$HOST-20260101-000002-before-box-string-sweep.sql.gz" "$DIR/other.org-20260101-000003.sql.gz"
for n in $(seq 1 15); do
	f="$DIR/$HOST-202602$(printf %02d "$n")-120000.sql.gz"
	touch -d "2026-02-$(printf %02d "$n") 12:00" "$f"
done
# The labelled dumps are the oldest files: a prune by age alone would take them first.
touch -d "2026-01-01" "$DIR/$HOST-20260101-000001-before-button-kit-sweep.sql.gz" "$DIR/$HOST-20260101-000002-before-box-string-sweep.sql.gz" "$DIR/other.org-20260101-000003.sql.gz"
prune_db_backups "$DIR" "$HOST" 12
fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got $2, want $3"; fail=1; fi; }
check "twelve routine dumps stay" "$(ls "$DIR"/$HOST-2026[0-9][0-9][0-9][0-9]-120000.sql.gz | wc -l | tr -d ' ')" 12
check "the three oldest routine dumps go" "$(ls "$DIR"/$HOST-20260201-120000.sql.gz "$DIR"/$HOST-20260202-120000.sql.gz "$DIR"/$HOST-20260203-120000.sql.gz 2>/dev/null | wc -l | tr -d ' ')" 0
check "the newest routine dump stays" "$(ls "$DIR/$HOST-20260215-120000.sql.gz" | wc -l | tr -d ' ')" 1
check "a labelled dump stays" "$(ls "$DIR/$HOST-20260101-000001-before-button-kit-sweep.sql.gz" | wc -l | tr -d ' ')" 1
check "another labelled dump stays" "$(ls "$DIR/$HOST-20260101-000002-before-box-string-sweep.sql.gz" | wc -l | tr -d ' ')" 1
check "another host's dump stays" "$(ls "$DIR/other.org-20260101-000003.sql.gz" | wc -l | tr -d ' ')" 1
exit $fail
