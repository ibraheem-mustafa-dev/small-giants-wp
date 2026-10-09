#!/bin/sh
#
# SGS commit gates (version-controlled). Invoked by the per-machine wrapper
# .git/hooks/pre-commit after gitleaks; .githooks/pre-commit runs after this.
#
# No gate runs here at present: the wrapper requires this file to exist, and
# new commit-time gates are added below this header. Build-time gates live in
# plugins/sgs-blocks/scripts/gates.json and run through run-gates.py.

exit 0
