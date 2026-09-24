#!/bin/sh
#
# SGS commit gates (version-controlled). Invoked by the per-machine wrapper
# .git/hooks/pre-commit after gitleaks; .githooks/pre-commit runs after this.
#
# Gate A — converter golden-fixture conformance. Runs when the commit stages
# converter code; blocks if the converter's emit diverges from the golden fixtures.
# Re-baseline: run the tests with --regen-golden and commit the new goldens with the
# reason in the commit message.

REPO_ROOT=$(git rev-parse --show-toplevel)
SGS_EXIT=0

STAGED_CONVERTER=$(git diff --cached --name-only --diff-filter=ACM | grep -E \
    'plugins/sgs-blocks/scripts/converter/' || true)
if [ -n "$STAGED_CONVERTER" ]; then
    echo "SGS Gate A: running converter golden-fixture conformance harness..."
    if command -v python.exe >/dev/null 2>&1; then GATE_A_PY=python.exe
    elif command -v python >/dev/null 2>&1; then GATE_A_PY=python
    elif command -v py >/dev/null 2>&1; then GATE_A_PY=py
    else GATE_A_PY=""; fi
    if [ -z "$GATE_A_PY" ]; then
        echo "   Gate A SKIPPED — no python on PATH (install python to enforce)."
    else
        # Capture pytest's own exit status (piping through sed would report sed's).
        GATE_A_OUT=$(cd "$REPO_ROOT" && "$GATE_A_PY" -m pytest \
            plugins/sgs-blocks/scripts/tests/test_converter_conformance.py \
            -q --tb=short 2>&1)
        GATE_A_EXIT=$?
        echo "$GATE_A_OUT" | sed 's/^/  /'
        if [ "$GATE_A_EXIT" -ne 0 ]; then
            echo ""
            echo "COMMIT BLOCKED by Gate A — converter emit diverged from golden fixtures."
            echo "   Fix the regression, or re-baseline with --regen-golden and give the reason in the commit message."
            echo ""
            SGS_EXIT=1
        else
            echo "   Gate A: all conformance fixtures pass."
        fi
    fi
fi

exit $SGS_EXIT
