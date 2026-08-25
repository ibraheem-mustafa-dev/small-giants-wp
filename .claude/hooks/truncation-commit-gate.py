#!/usr/bin/env python3
"""
truncation-commit-gate — refuse a commit that empties a tracked file.

WHY THIS EXISTS
---------------
Recoverability graded D for three consecutive method rounds and was named the
ceiling on the programme's overall grade. Seventy-plus gates exist in this repo
and NONE inspects the SHAPE of a diff — verified by grep: `detector-first-commit-gate`
and `f5-commit-gate` both read `git diff --cached`, but for file-to-file SIMILARITY
and for the changed-path list respectively. Neither reads `--numstat`, and nothing
anywhere compares changed lines against file length.

⛔ WHY TRUNCATION SPECIFICALLY, and not the whole-file-rewrite case too (Bean,
2026-08-25, reaffirmed 2026-08-26). A reformat — a CRLF flip, a JSON round-trip —
is ugly but RECOVERABLE: the content is still in the file and still in git. It is
a detection nicety. **Truncation is the case that is genuinely undetectable by
every other gate in the chain**, because a file that no longer contains the symbol
a scanner searches for is SKIPPED, not flagged. The scan goes green precisely
BECAUSE the content is gone. That is the same silent-failure shape this repo keeps
being bitten by: a losing rule is indistinguishable from an absent one, and an
empty file is indistinguishable from a file with nothing to say.

WHAT IT DENIES
--------------
A staged MODIFIED file (not new, not deleted, not renamed) that loses
substantially all of its lines while gaining almost none. Thresholds are
deliberately conservative — a false deny on real work trains people to reach for
the bypass, and a gate people reflexively bypass is worse than no gate.

BYPASS
------
`[truncate-ok:<reason>]` in the commit command, matching the house tokens
`[gates-ok:]` / `[repeat-ok:]` / `[batch-ok:]`.

⚠ The approved plan called this `[reformat-ok:]`. Renamed deliberately: the
whole-file-reformat half was dropped from scope, so a token named for a check
this gate does not perform would mislead the next reader into thinking reformats
are guarded. The token names what it actually waives.

FAIL-OPEN: any parse / IO / git error → allow (exit 0). A commit guard must never
wedge the session on its own bug. Run with --self-test to prove it still bites.
"""
import json
import re
import subprocess
import sys

# ── Thresholds ─────────────────────────────────────────────────────────────
# A file must be big enough that emptying it is unambiguous. Below this, losing
# every line is a normal edit (a stub, a one-line config, a short fixture).
MIN_PREIMAGE_LINES = 20

# "Lost substantially everything": deletions as a fraction of the pre-image.
GUTTED_RATIO = 0.90

# "Gained almost nothing": additions allowed, as a fraction of the pre-image.
# The absolute floor lets a genuine "replace the body with a 3-line stub or a
# tombstone pointer" through without a bypass.
REGROWTH_RATIO = 0.05
REGROWTH_FLOOR = 3


def _git(args):
    return subprocess.run(
        ["git"] + args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stdout


def staged_numstat():
    """[(added, deleted, path)] for staged changes; binary files skipped."""
    rows = []
    for line in _git(["diff", "--cached", "--numstat", "--no-color"]).splitlines():
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        added, deleted, path = parts
        if added == "-" or deleted == "-":
            continue  # binary
        rows.append((int(added), int(deleted), path))
    return rows


def staged_statuses():
    """{path: status_letter} — M/A/D/R..., so new files and deletions are excluded."""
    out = {}
    for line in _git(["diff", "--cached", "--name-status", "--no-color"]).splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        out[parts[-1]] = parts[0][:1]
    return out


def preimage_lines(path):
    """Line count of the file as it stands in HEAD (what the commit replaces)."""
    blob = _git(["show", f"HEAD:{path}"])
    if not blob:
        return 0
    return blob.count("\n") + (0 if blob.endswith("\n") else 1)


def find_truncations(rows, statuses, preimage=preimage_lines):
    """The gate's whole decision, isolated so --self-test can drive it directly."""
    hits = []
    for added, deleted, path in rows:
        # Only a MODIFIED file can be truncated. A deletion is explicit and a
        # new file has no pre-image to lose.
        if statuses.get(path) != "M":
            continue
        pre = preimage(path)
        if pre < MIN_PREIMAGE_LINES:
            continue
        if deleted < pre * GUTTED_RATIO:
            continue
        if added > max(REGROWTH_FLOOR, pre * REGROWTH_RATIO):
            continue
        hits.append({"path": path, "pre": pre, "added": added, "deleted": deleted})
    return hits


def build_reason(hits):
    lines = [
        "TRUNCATION GATE — this commit empties a tracked file.",
        "",
    ]
    for h in hits:
        kept = h["pre"] - h["deleted"]
        lines.append(
            f"  {h['path']}: {h['pre']} lines -> {kept + h['added']} "
            f"(-{h['deleted']} / +{h['added']})"
        )
    lines += [
        "",
        "Why this is gated and a reformat is not: a truncated file passes every",
        "scanner in the chain GREEN, because a file that no longer contains the",
        "symbol a scanner searches for is skipped rather than flagged. The suite",
        "goes green BECAUSE the content is gone. No other gate here reads diff",
        "shape, so nothing else can see this.",
        "",
        "If the emptying is deliberate — a real deletion, a file replaced by a",
        "tombstone pointer, a generated artefact regenerating empty — add",
        "[truncate-ok:<reason>] to the commit command.",
        "",
        "If it is NOT deliberate, you have probably rewritten the file from a",
        "partial buffer. Check `git diff --cached --stat` before retrying.",
    ]
    return "\n".join(lines)


def main() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    if data.get("tool_name") != "Bash":
        return 0
    cmd = (data.get("tool_input") or {}).get("command", "")
    if not isinstance(cmd, str) or not re.search(r"\bgit\s+commit\b", cmd):
        return 0
    if "[truncate-ok" in cmd:
        return 0

    try:
        hits = find_truncations(staged_numstat(), staged_statuses())
        if not hits:
            return 0
    except Exception:
        return 0  # fail-open: never wedge a commit on this hook's own bug

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": build_reason(hits),
                }
            }
        )
    )
    return 0


# ---------------------------------------------------------------------------
def self_test() -> int:
    """Prove the gate BITES and prove it stays quiet on healthy diffs.

    A gate never seen failing is not a gate. Every must-deny case below is a
    shape that would otherwise reach main silently.
    """
    fails = []

    def check(name, cond, detail=""):
        print(f"  {'ok  ' if cond else 'FAIL'} {name}" + (f" — {detail}" if detail and not cond else ""))
        if not cond:
            fails.append(name)

    pre = {"big.py": 400, "small.py": 10, "mid.js": 100}
    stub = lambda p: pre.get(p, 0)  # noqa: E731

    # ── MUST DENY ──────────────────────────────────────────────────────────
    hits = find_truncations([(0, 400, "big.py")], {"big.py": "M"}, stub)
    check("gutted to nothing is denied", len(hits) == 1)

    hits = find_truncations([(2, 398, "big.py")], {"big.py": "M"}, stub)
    check("gutted, replaced by a 2-line stub is denied", len(hits) == 1)

    hits = find_truncations([(1, 100, "mid.js")], {"mid.js": "M"}, stub)
    check("a 100-line file emptied is denied", len(hits) == 1)

    # ── MUST NOT DENY (the negative controls) ──────────────────────────────
    hits = find_truncations([(380, 400, "big.py")], {"big.py": "M"}, stub)
    check("whole-file REFORMAT is allowed (out of scope by design)", not hits)

    hits = find_truncations([(0, 400, "big.py")], {"big.py": "D"}, stub)
    check("an explicit file DELETION is allowed", not hits)

    hits = find_truncations([(400, 0, "big.py")], {"big.py": "A"}, stub)
    check("a NEW file is allowed", not hits)

    hits = find_truncations([(0, 10, "small.py")], {"small.py": "M"}, stub)
    check("a tiny file emptied is allowed (below MIN_PREIMAGE_LINES)", not hits)

    hits = find_truncations([(30, 400, "big.py")], {"big.py": "M"}, stub)
    check("gutted but regrown 30 lines is allowed (real rewrite)", not hits)

    hits = find_truncations([(5, 20, "big.py")], {"big.py": "M"}, stub)
    check("an ordinary edit is allowed", not hits)

    # ── the deny message must be actionable ────────────────────────────────
    r = build_reason([{"path": "big.py", "pre": 400, "added": 0, "deleted": 400}])
    check("reason names the file", "big.py" in r)
    check("reason shows the shape", "-400" in r and "+0" in r)
    check("reason offers the bypass", "[truncate-ok:" in r)
    check("reason explains why scanners miss it", "GREEN" in r)

    print()
    if fails:
        print(f"SELF-TEST FAILED — {len(fails)} check(s): {', '.join(fails)}")
        return 1
    print("SELF-TEST PASSED — the gate bites on truncation and stays quiet otherwise.")
    return 0


if __name__ == "__main__":
    try:
        if "--self-test" in sys.argv:
            sys.exit(self_test())
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
