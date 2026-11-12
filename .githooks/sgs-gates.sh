#!/bin/sh
#
# SGS commit gates (version-controlled). Invoked by the per-machine wrapper
# .git/hooks/pre-commit after gitleaks; .githooks/pre-commit runs after this.
#
# New commit-time gates are added below this header, thin: the logic lives in a script.
# Build-time gates live in plugins/sgs-blocks/scripts/gates.json and run through run-gates.py.

exit 0
