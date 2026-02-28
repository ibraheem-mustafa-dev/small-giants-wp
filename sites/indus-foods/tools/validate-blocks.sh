#!/usr/bin/env bash
# SGS Block Validator — run after every deploy to confirm all blocks are valid.
# Usage: bash sites/indus-foods/tools/validate-blocks.sh
# Returns: exit code 0 = PASS, exit code 1 = FAIL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_SCRIPT="$SCRIPT_DIR/validate-blocks.php"
REMOTE_TMP="$HOME/validate-blocks-tmp.php"
WP_DIR="domains/palestine-lives.org/public_html"

echo "Uploading validator script to server..."
scp -P 65002 -i ~/.ssh/id_ed25519 "$PHP_SCRIPT" "u945238940@141.136.39.73:$REMOTE_TMP"

echo "Running block validation scan..."
ssh -p 65002 -i ~/.ssh/id_ed25519 u945238940@141.136.39.73 \
    "cd $WP_DIR && wp eval-file ~/${REMOTE_TMP##*/} 2>/dev/null; rm -f $REMOTE_TMP"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "Block validation PASSED."
else
    echo "Block validation FAILED — see details above."
fi

exit $EXIT_CODE
