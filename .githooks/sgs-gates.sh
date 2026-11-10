#!/bin/sh
#
# SGS commit gates (version-controlled). Invoked by the per-machine wrapper
# .git/hooks/pre-commit after gitleaks; .githooks/pre-commit runs after this.
#
# New commit-time gates are added below this header, thin: the logic lives in a script.
# Build-time gates live in plugins/sgs-blocks/scripts/gates.json and run through run-gates.py.

# Spec 49 Stage B folder freeze: refuse staged files in a frozen block folder once
# feature/media-stage-b exists. Reads local refs only; silent when the branch does not exist.
if git diff --cached --name-only | grep -q '^plugins/sgs-blocks/src/blocks/'; then
	if command -v python >/dev/null 2>&1; then
		python scripts/check-stage-b-freeze.py || exit 1
	else
		echo "sgs-gates: python not found on PATH, skipping the Stage B folder freeze check." >&2
	fi
fi

exit 0
