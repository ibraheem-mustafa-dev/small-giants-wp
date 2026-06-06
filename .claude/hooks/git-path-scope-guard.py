#!/usr/bin/env python
"""PreToolUse(Bash) guard — enforce path-scoped git commits on the shared `main`.

Doc-council enforcement fix (2026-06-06): the rule "commit by EXPLICIT PATH
(`git commit -- <paths>`) — two co-active threads share main, a bare commit
flushes the WHOLE staged index" lived only as prose in CLAUDE.md + the prompts,
and was ignored (memory `git-commit-must-be-path-scoped-with-coactive-sessions`).
This converts it to a bypassable structural gate (ADHD Rule 10: trust-by-enforcement).

Behaviour: on a `git commit` Bash command that has NEITHER a `--` pathspec NOR an
explicit `[batch-ok:<reason>]` token in the command, DENY with a reason telling the
session to either path-scope or add the token. Everything else passes silently.

FAIL-OPEN: any parse/IO error → allow (exit 0). A commit guard must never wedge the
session on its own bug.
"""
import json
import re
import sys


def main() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0  # fail-open

    if data.get("tool_name") != "Bash":
        return 0
    cmd = (data.get("tool_input") or {}).get("command", "")
    if not isinstance(cmd, str) or not cmd:
        return 0

    # Only care about an actual `git commit` (not `git commit-tree`, not log/etc.).
    if not re.search(r"\bgit\s+commit\b", cmd):
        return 0
    # Allow a conscious bypass for a deliberate whole-index commit.
    if "[batch-ok" in cmd:
        return 0
    # Path-scoped commit: `git commit ... -- <paths>` (the `--` pathspec separator).
    # Match ` -- ` as a standalone token (space-double-dash-space) anywhere in the cmd.
    if re.search(r"\s--\s", cmd):
        return 0
    # `git commit --amend`/flags-only without a pathspec still flushes the index — but
    # --amend is a distinct, usually-intentional op; let it through to avoid friction.
    if re.search(r"\bgit\s+commit\b[^\n]*--amend\b", cmd):
        return 0

    reason = (
        "Path-scoped-commit gate (R: git-commit-must-be-path-scoped-with-coactive-sessions). "
        "This `git commit` has no `-- <paths>` pathspec. Two co-active threads (sgs-theme + "
        "cloning) share `main`; a bare commit flushes the WHOLE staged index and can sweep in "
        "the other thread's staged files under your message. Re-run as "
        "`git commit -- <your explicit paths>` (check `git diff --cached --stat` first). "
        "If you genuinely intend to commit the entire current index, add a `[batch-ok:<reason>]` "
        "token to the commit message to bypass this gate."
    )
    out = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
