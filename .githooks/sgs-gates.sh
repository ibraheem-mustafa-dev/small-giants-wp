#!/bin/sh
#
# SGS commit gates (version-controlled). Invoked by the per-machine wrapper
# .git/hooks/pre-commit after gitleaks; .githooks/pre-commit runs after this.
#
# New commit-time gates are added below this header, thin: the logic lives in a script.
# Build-time gates live in plugins/sgs-blocks/scripts/gates.json and run through run-gates.py.

# Cloning-route tests are proofs: a commit that deletes one states why (SGS_TESTS_REMOVED_OK, scripts/check-route-test-deletions.py).
if command -v python >/dev/null 2>&1; then
	python scripts/check-route-test-deletions.py --check || exit 1
else
	echo "sgs-gates: python not found on PATH, skipping the route test deletion check." >&2
fi

exit 0
