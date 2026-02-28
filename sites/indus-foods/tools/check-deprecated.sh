#!/usr/bin/env bash
# Pre-deploy deprecated.js lint — run before deploying to catch missing deprecations.
# Warns if any block's save.js was modified without a corresponding deprecated.js.
#
# Usage: bash sites/indus-foods/tools/check-deprecated.sh
#        Or: add to .git/hooks/pre-commit
#
# Returns: exit code 0 = all good, exit code 1 = missing deprecated.js found

BLOCKS_DIR="plugins/sgs-blocks/src/blocks"
FAIL=0

echo "Checking for modified save.js files without deprecated.js..."

# Check all blocks that have a save.js
for save_file in "$BLOCKS_DIR"/*/save.js; do
    block_dir="$(dirname "$save_file")"
    block_name="$(basename "$block_dir")"
    deprecated_file="$block_dir/deprecated.js"

    if [ ! -f "$deprecated_file" ]; then
        # Only warn if save.js is not returning null (i.e. it generates HTML)
        if grep -q "return null" "$save_file" 2>/dev/null; then
            # save.js returns null — dynamic block, deprecated.js optional but recommended
            echo "  INFO: $block_name/save.js returns null — consider adding deprecated.js for safety"
        else
            echo ""
            echo "  ❌ WARNING: $block_name/save.js generates HTML but has no deprecated.js"
            echo "     Existing posts will show 'This block contains unexpected or invalid content'"
            echo "     Fix: add $block_dir/deprecated.js with save:()=>null"
            echo ""
            FAIL=1
        fi
    fi
done

if [ $FAIL -eq 0 ]; then
    echo "✅ All save.js files have corresponding deprecated.js — safe to deploy."
else
    echo "❌ Fix the above before deploying to avoid block validation errors."
fi

exit $FAIL
