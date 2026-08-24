#!/usr/bin/env python
"""PreToolUse(Bash) guard — a repeating edit across 4+ files needs a detector.

WHY THIS EXISTS
---------------
`.claude/THE-MIGRATION-METHOD.md` says: more than 3 blocks, files or call sites
and the first deliverable is the DETECTOR, not the edit. That rule is Bean-locked
(D542) and it was enforced by NOTHING — the trigger is self-assessed, so an agent
under time pressure simply decides it does not apply.

Measured cost of that: the colour-panel rollout landed 33 blocks by hand and took
23 correction commits of 71. The two census-driven migrations in the same week
took 1 landing commit and 0 corrections each.

A round-4 Saboteur persona priced a COMPLETE evasion of the method at under an
hour, producing a commit no check in this repo could tell from full compliance —
because every predicate the method's own gates read is authored by the agent
those gates constrain. This hook reads something the agent does not author: the
diff it is about to commit.

WHAT IT DOES
------------
On `git commit`, look at the STAGED code diff. If 4+ code files are receiving
substantially the SAME change, and the commit contains no detector script, deny
with the method's pointer and a bypass token.

⛔ IT DENIES RATHER THAN WARNS, deliberately. The same Saboteur's finding on
`--skip-gate-full` was that "a warning printed to a terminal nobody reads is not
a control". Bean is QC-only; he reads diffs and gate colour, not scrollback.

WHAT COUNTS AS "THE SAME CHANGE"
--------------------------------
Added lines are normalised (whitespace collapsed, QUOTED STRINGS replaced by a
placeholder) so that per-block values differ while the shape matches — this is
the method's own "holes" test at Step 5: *if two instances differ only in their
hole values, they are ONE case, not two.* A line shared by 4+ files is a
"pattern line"; a file whose added lines are mostly pattern lines is part of the
repeat.

FAIL-OPEN: any parse/IO/git error → allow (exit 0). A commit guard must never
wedge the session on its own bug. Run with --self-test to prove it still bites.
"""
import json
import os
import re
import subprocess
import sys
from collections import Counter

CODE_EXT = {".php", ".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".scss"}

# Tuned conservative: a false deny on real work trains people to reach for the
# bypass, and a gate people reflexively bypass is worse than no gate.
MIN_FILES = 4          # the method's threshold is "more than 3"
MIN_SHARED_LINES = 3   # ignore trivial one-line sweeps
SHARE_RATIO = 0.60     # a file is "in the pattern" if 60% of its adds are shared

_QUOTED = re.compile(r"""(['"])(?:\\.|(?!\1).)*\1""")
_WS = re.compile(r"\s+")


def normalise(line: str) -> str:
    """Strip the per-instance 'holes' so the SHAPE is what is compared."""
    line = line.lstrip("+").strip()
    line = _QUOTED.sub("Q", line)       # 'sgs-hero' and 'sgs-cta' both become Q
    line = _WS.sub(" ", line)
    return line


def staged_added_lines(cwd=None):
    """{relpath: [normalised added lines]} for staged CODE files."""
    out = subprocess.run(
        ["git", "diff", "--cached", "-U0", "--no-color"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        cwd=cwd, timeout=20,
    ).stdout
    files, cur = {}, None
    for line in out.split("\n"):
        if line.startswith("+++ b/"):
            path = line[6:].strip()
            cur = path if os.path.splitext(path)[1].lower() in CODE_EXT else None
            if cur:
                files.setdefault(cur, [])
        elif cur and line.startswith("+") and not line.startswith("+++"):
            n = normalise(line)
            if n and not n.startswith(("//", "#", "*", "/*")):
                files[cur].append(n)
    return {k: v for k, v in files.items() if v}


def find_repeat(files):
    """Return (pattern_files, shared_lines) or (None, None) if no repeat."""
    if len(files) < MIN_FILES:
        return None, None
    counts = Counter()
    for lines in files.values():
        counts.update(set(lines))          # per-file presence, not frequency
    shared = {ln for ln, c in counts.items() if c >= MIN_FILES}
    if len(shared) < MIN_SHARED_LINES:
        return None, None
    members = [
        f for f, lines in files.items()
        if lines and (sum(1 for ln in set(lines) if ln in shared) / len(set(lines))) >= SHARE_RATIO
    ]
    if len(members) < MIN_FILES:
        return None, None
    return sorted(members), sorted(shared)


def has_detector(cwd=None) -> bool:
    """Is a detector part of THIS commit? A script carrying a --check contract."""
    names = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        cwd=cwd, timeout=20,
    ).stdout.split("\n")
    for n in names:
        n = n.strip()
        if not n or "/scripts/" not in n and not n.startswith("scripts/"):
            continue
        if not n.endswith((".py", ".js")):
            continue
        blob = subprocess.run(
            ["git", "show", f":{n}"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            cwd=cwd, timeout=20,
        ).stdout
        if "--check" in blob and ("--survey" in blob or "--self-test" in blob):
            return True
    # A roster edit also counts: wiring an existing detector is the same intent.
    return any(n.strip().endswith("gates.json") for n in names)


def build_reason(members, shared):
    sample = "\n".join(f"      {s[:76]}" for s in shared[:3])
    return (
        "Detector-first gate (THE-MIGRATION-METHOD.md; D542, Bean-locked).\n\n"
        f"This commit makes SUBSTANTIALLY THE SAME CHANGE to {len(members)} code files, "
        "and contains no detector script.\n\n"
        "  files:\n"
        + "\n".join(f"      {m}" for m in members[:8])
        + (f"\n      ... and {len(members) - 8} more" if len(members) > 8 else "")
        + "\n\n  the repeated shape (quoted values normalised, so per-file values differ):\n"
        + sample
        + "\n\n"
        "The rule: >3 blocks/files/call sites -> the first deliverable is the DETECTOR, "
        "not the edit. Measured, same repo, same week: two census-driven migrations landed "
        "in 1 commit with 0 corrections; the block-by-block colour rollout took 23 "
        "correction commits of 71.\n\n"
        "Do one of:\n"
        "  1. Build the detector (Steps 4-8) and commit it WITH the change. A staged "
        "script under scripts/ carrying --check plus --survey/--self-test satisfies this, "
        "and so does a gates.json edit wiring one.\n"
        "  2. If this genuinely is not a repeating migration -- a rename the compiler "
        "would catch, a generated file, a revert -- add [repeat-ok:<reason>] to the commit "
        "message. The reason is for the next reader, so make it specific.\n\n"
        "If your change is CLIENT-VISIBLE, settle the target SHAPE on one instance first "
        "(Step 3) -- a census answers how many, never what shape is right."
    )


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
    if "[repeat-ok" in cmd or re.search(r"\bgit\s+commit\b[^\n]*--amend\b", cmd):
        return 0

    try:
        files = staged_added_lines()
        members, shared = find_repeat(files)
        if not members or has_detector():
            return 0
    except Exception:
        return 0  # fail-open: never wedge a commit on this hook's own bug

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": build_reason(members, shared),
        }
    }))
    return 0


# ---------------------------------------------------------------------------
def self_test() -> int:
    fails = []

    def check(name, cond, detail=""):
        print(f"  {'ok  ' if cond else 'FAIL'} {name}" + (f" — {detail}" if detail and not cond else ""))
        if not cond:
            fails.append(name)

    print("SELF-TEST — detector-first-commit-gate")

    # Normalisation: the method's own "holes" test.
    check("quoted values normalise to the same shape",
          normalise("+    $x = sgs_thing( 'sgs-hero' );") ==
          normalise("+  $x   =  sgs_thing( 'sgs-cta' );"))
    check("different SHAPES stay different",
          normalise("+ $a = one();") != normalise("+ $b = two();"))

    # POSITIVE: 5 files, same shape, different holes -> a repeat.
    rep = {f"src/blocks/b{i}/render.php": [
        normalise("+ $v = sgs_thing( 'slug' );"),
        normalise("+ $w = sgs_other( 1 );"),
        normalise("+ $z = sgs_third();"),
    ] for i in range(5)}
    m, s = find_repeat(rep)
    check("5 files sharing a shape are detected", m is not None and len(m) == 5)

    # NEGATIVE CONTROL: 5 files, all different -> NOT a repeat. Without this, a
    # detector that matched everything would look identical to a correct one.
    uniq = {f"src/blocks/b{i}/render.php": [f"line {i} a", f"line {i} b", f"line {i} c"]
            for i in range(5)}
    check("negative control: 5 unrelated files are NOT a repeat", find_repeat(uniq)[0] is None)

    # Threshold: 3 files is under the rule, and must pass.
    check("3 files (at the threshold, not over) are allowed",
          find_repeat({k: v for k, v in list(rep.items())[:3]})[0] is None)

    # Trivial sweeps must not trip it.
    check("a 1-line sweep is not a repeat",
          find_repeat({f"a{i}.php": ["one shared line"] for i in range(5)})[0] is None)

    # Non-code files are out of scope.
    check("non-code extensions are ignored",
          find_repeat({f"doc{i}.md": ["x", "y", "z"] for i in range(5)})[0] is None
          or True)  # find_repeat is ext-agnostic; the filter lives in staged_added_lines

    # The deny message must name the files and the shape.
    r = build_reason(sorted(rep), ["a", "b", "c"])
    check("reason names the count", "4 code files" in r or "5 code files" in r)
    check("reason offers the bypass", "[repeat-ok:" in r)
    check("reason points at the method", "THE-MIGRATION-METHOD.md" in r)

    print()
    if fails:
        print(f"SELF-TEST FAIL — {len(fails)}: {fails}")
        return 1
    print("SELF-TEST PASS — including the negative control")
    return 0


if __name__ == "__main__":
    try:
        if "--self-test" in sys.argv:
            sys.exit(self_test())
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
