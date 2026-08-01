#!/usr/bin/env python3
"""check-markup-neutral.py — visual-diff-gate helper.

Decides whether a staged change to a block is MARKUP-NEUTRAL: PHP-only, adding
no output, deleting nothing, and touching no variable that the block actually
prints. Such a change paints byte-identically, so demanding a visual-diff report
(or the ``--no-verify`` sledgehammer) is wrong.

WHY THIS EXISTS
---------------
On 2026-07-30 (W2-a, commit ``bd67a641``) two block ``render.php`` files gained a
single no-output registry call each — ``mark_served()`` and ``note_burger()`` —
with zero deletions. A first-paint capture would have compared a page against
itself. The gate's own message offers ``--no-verify`` for exactly this case, but
``--no-verify`` is all-or-nothing: it discarded gitleaks, the wp-blocks /
wp-hooks / wp-hook-graph pre-merge gate, cheat-gate, F5 and F6 — every one of
which had already run GREEN in the same invocation — in order to skip one
inapplicable check. Turning off six working gates to bypass a seventh is a bad
trade that gets made under time pressure and then becomes a habit.

This is the same move ``check-blockjson-metadata-only.py`` already made for
``supports.sgs`` edits: replace a documented bypass with a deterministic,
auditable check.

WHAT IT DOES AND DOES NOT PROVE
-------------------------------
It does NOT attempt to decide, in general, whether arbitrary PHP changes the
rendered markup — that is undecidable by static inspection and any tool claiming
otherwise is lying. It proves a deliberately NARROW, sufficient condition, and
returns "gate applies" for everything else. Every rule below fails SAFE.

A block's staged change is markup-neutral iff ALL hold:
  1. Every staged file for the block is ``.php`` (a ``.js``/``.css``/``.json``
     change can move pixels, so the gate applies).
  2. No file is newly added or deleted.
  3. The diff REMOVES no line that is not blank or a comment. A deletion can
     silently drop output, and proving otherwise is not worth the complexity.
  4. No ADDED line contains an output construct: ``echo``, ``print``, ``printf``,
     ``vprintf``, ``print_r``, ``var_dump``, ``?>``, ``<?=``, ``include``,
     ``require``, or ``return`` (a changed return value IS the block's output).
  5. No variable ASSIGNED on an added line is referenced anywhere in the file's
     output statements. This is the load-bearing rule: ``$classes[] = 'x';``
     emits nothing by itself, but ``$classes`` reaches ``printf()`` further down,
     so that change is NOT neutral. Without rule 5 this check would wave through
     exactly the edits most likely to move pixels.

Exit codes:
  0 — markup-neutral (the gate may SKIP the visual-report requirement)
  1 — NOT neutral, or undeterminable → the gate APPLIES (fail safe)

Usage: check-markup-neutral.py <block_name>
       check-markup-neutral.py --self-test
"""
from __future__ import annotations

import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

BLOCK_DIR = "plugins/sgs-blocks/src/blocks"

# Constructs that emit, or that change what the block hands back to WordPress.
OUTPUT_TOKENS = (
    "echo", "print", "printf", "vprintf", "print_r", "var_dump",
    "?>", "<?=", "include", "require", "return",
)

# `$foo =`, `$foo[] =`, `$foo['k'] =`, `$foo .=` — the assignment forms that can
# feed an output statement later in the file.
ASSIGN_RE = re.compile(r"\$([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*(?:\.|\+|-|\*|/|\?\?)?=[^=]")
VAR_RE = re.compile(r"\$([A-Za-z_]\w*)")


# File types this gate can reason about. `.php` gets the output-analysis path;
# `.css`/`.js` get the stricter comment-only path (see is_markup_neutral).
# `.json` is deliberately EXCLUDED — a block.json change is data (attributes,
# defaults, supports) and moves pixels without touching a line of code.
_NEUTRAL_SUFFIXES = (".php", ".css", ".js")

# (filename, changed lines, expected_neutral) — exercises the CSS/JS branch.
_NON_PHP_SELF_TEST_CASES = [
    ("style.css comment-only is NEUTRAL", "style.css",
     [" * (Spec 37 §3.6 / FR-37-12, D455).", "/* renamed ref */"], True),
    ("edit.js comment-only is NEUTRAL", "edit.js",
     ["// D455 — mirrors the frontend lock."], True),
    ("NEGATIVE CONTROL — a real CSS declaration is NOT neutral", "style.css",
     ["\tgap: 16px;"], False),
    ("NEGATIVE CONTROL — a real JS statement is NOT neutral", "edit.js",
     ["\tflexWrap: 'wrap',"], False),
    ("NEGATIVE CONTROL — a CSS selector is NOT neutral", "style.css",
     [".sgs-site-header-row > * {"], False),
]


def _is_comment_or_blank(line: str) -> bool:
    s = line.strip()
    return (
        not s
        or s.startswith("//")
        or s.startswith("#")
        or s.startswith("/*")
        or s.startswith("*")
        or s.startswith("*/")
    )


def _strip_comment(line: str) -> str:
    """Remove a trailing // comment so a token inside prose does not trip rule 4."""
    return re.split(r"//", line, maxsplit=1)[0]


def _run(args: list[str]) -> str:
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stdout


def _output_variables(text: str) -> set[str]:
    """Variables referenced by any output statement in the file.

    Deliberately greedy: any line carrying an output token contributes every
    variable on it. Over-collecting makes the check STRICTER (more changes are
    judged non-neutral), which is the safe direction.
    """
    found: set[str] = set()
    for line in text.splitlines():
        if _is_comment_or_blank(line):
            continue
        code = _strip_comment(line)
        if any(tok in code for tok in OUTPUT_TOKENS):
            found.update(VAR_RE.findall(code))
    return found


def is_markup_neutral(block: str) -> tuple[bool, str]:
    """Return (neutral, human-readable reason)."""
    prefix = f"{BLOCK_DIR}/{block}/"

    status = _run(["git", "diff", "--cached", "--name-status", "--", prefix]).strip()
    if not status:
        return False, "no staged files for this block"

    for row in status.splitlines():
        parts = row.split("\t")
        state, path = parts[0], parts[-1]
        if state != "M":
            return False, f"{path} is {state} (added/deleted/renamed), not a modification"
        if not path.endswith(_NEUTRAL_SUFFIXES):
            return False, (
                f"{path} is not PHP/CSS/JS — a JSON or asset change can move pixels"
            )

    # CSS/JS admitted 2026-08-01, under a STRICTER rule than PHP.
    #
    # Why widen at all: a sweep retargeting dead-spec citations changed only
    # comments, but three blocks were blocked because a comment in a .css/.js
    # file counted as "can move pixels". The only ways past were to fabricate a
    # visual-diff PASS for a change with no visual effect, or to bypass the hook
    # entirely — both worse than teaching the gate to recognise the case.
    #
    # Why STRICTER: the PHP path below tolerates added non-comment lines and
    # then proves them harmless by checking they emit no output and touch no
    # printed variable. That analysis is PHP-specific and would WRONGLY pass a
    # real CSS declaration — `gap: 16px;` matches no PHP output construct, so it
    # would sail through as "neutral". For CSS/JS the rule is therefore absolute:
    # EVERY changed line, added or removed, must be a comment or blank.
    for row in status.splitlines():
        path = row.split("\t")[-1]
        if path.endswith(".php"):
            continue
        file_diff = _run(["git", "diff", "--cached", "--unified=0", "--", path])
        for line in file_diff.splitlines():
            if line.startswith(("+++", "---", "@@", "diff ", "index ")):
                continue
            if line.startswith(("+", "-")) and not _is_comment_or_blank(line[1:]):
                return False, (
                    f"{path} changes a non-comment line: {line[1:].strip()[:70]}"
                )

    diff = _run(["git", "diff", "--cached", "--unified=0", "--", prefix])

    added: list[str] = []
    for line in diff.splitlines():
        if line.startswith("+++") or line.startswith("---"):
            continue
        if line.startswith("-"):
            body = line[1:]
            if not _is_comment_or_blank(body):
                return False, f"deletes a non-comment line: {body.strip()[:70]}"
        elif line.startswith("+"):
            body = line[1:]
            if not _is_comment_or_blank(body):
                added.append(body)

    if not added:
        return True, "only comments/blank lines changed"

    for body in added:
        code = _strip_comment(body)
        for tok in OUTPUT_TOKENS:
            if re.search(rf"(?<![\w$]){re.escape(tok)}", code):
                return False, f"adds an output construct ({tok}): {body.strip()[:70]}"

    assigned: set[str] = set()
    for body in added:
        assigned.update(ASSIGN_RE.findall(_strip_comment(body)))

    if assigned:
        for row in status.splitlines():
            path = row.split("\t")[-1]
            staged = _run(["git", "show", f":{path}"])
            clash = assigned & _output_variables(staged)
            if clash:
                return False, (
                    "assigns a variable the block prints: $"
                    + ", $".join(sorted(clash))
                )

    return True, f"{len(added)} added line(s), no output, no deletions, no printed variable touched"


# --------------------------------------------------------------------------- #
# NEGATIVE CONTROLS — a gate that cannot fail reads green forever.
# --------------------------------------------------------------------------- #

_SELF_TEST_FILE = """<?php
$classes = array( 'a' );
$uid = 'x';
printf( '<div class="%1$s">%2$s</div>', implode( ' ', $classes ), $uid );
"""

_SELF_TEST_CASES = [
    # (name, added lines, removed lines, expected_neutral)
    ("no-output registry call is NEUTRAL",
     ["if ( class_exists( 'X' ) ) {", "\tX::mark_served( 'drawer' );", "}"], [], True),
    ("comment-only change is NEUTRAL",
     ["// explanatory note"], [], True),
    ("NEGATIVE CONTROL — adding echo is NOT neutral",
     ["echo '<span>hi</span>';"], [], False),
    ("NEGATIVE CONTROL — deleting a code line is NOT neutral",
     [], ["$uid = 'x';"], False),
    ("NEGATIVE CONTROL — assigning a PRINTED variable is NOT neutral",
     ["$classes[] = 'extra';"], [], False),
    ("NEGATIVE CONTROL — changing a return is NOT neutral",
     ["return '';"], [], False),
]


def _self_test() -> int:
    """Exercise the decision rules against synthetic diffs, no git required."""
    ok = True
    printed = _output_variables(_SELF_TEST_FILE)
    for name, added, removed, expected in _SELF_TEST_CASES:
        neutral, reason = True, "no rule tripped"

        for body in removed:
            if not _is_comment_or_blank(body):
                neutral, reason = False, "deletes a non-comment line"

        if neutral:
            code_added = [b for b in added if not _is_comment_or_blank(b)]
            for body in code_added:
                code = _strip_comment(body)
                for tok in OUTPUT_TOKENS:
                    if re.search(rf"(?<![\w$]){re.escape(tok)}", code):
                        neutral, reason = False, f"adds output construct {tok}"
                        break
                if not neutral:
                    break
            if neutral:
                assigned: set[str] = set()
                for body in code_added:
                    assigned.update(ASSIGN_RE.findall(_strip_comment(body)))
                clash = assigned & printed
                if clash:
                    neutral, reason = False, f"assigns printed var {clash}"

        passed = neutral == expected
        ok = ok and passed
        print(f"{'PASS' if passed else 'FAIL'}  {name}")
        print(f"      expected neutral={expected}, got neutral={neutral} ({reason})")

    # CSS/JS branch — the rule is absolute: every changed line must be a comment
    # or blank. These cases exist because the PHP output-analysis above would
    # WRONGLY pass a CSS declaration (`gap: 16px;` matches no PHP output token),
    # so the widened suffix allowlist is only safe while these keep failing.
    for name, filename, changed, expected in _NON_PHP_SELF_TEST_CASES:
        neutral, reason = True, "all changed lines are comments or blank"
        for body in changed:
            if not _is_comment_or_blank(body):
                neutral = False
                reason = f"{filename} changes a non-comment line: {body.strip()[:40]}"
                break
        passed = neutral == expected
        ok = ok and passed
        print(f"{'PASS' if passed else 'FAIL'}  {name}")
        print(f"      expected neutral={expected}, got neutral={neutral} ({reason})")

    print()
    if ok:
        # Count BOTH suites. This read "6/6" while 11 cases ran, because it was
        # never updated when the CSS/JS suite was added — a gate that
        # under-reports what it ran is a misleading number, which is the exact
        # failure class this file exists to catch.
        _total = len(_SELF_TEST_CASES) + len(_NON_PHP_SELF_TEST_CASES)
        print(f"{_total}/{_total} self-tests passed "
              f"({len(_SELF_TEST_CASES)} PHP, {len(_NON_PHP_SELF_TEST_CASES)} CSS/JS).")
        print("check-markup-neutral can still REFUSE when it should. Its 0 means something.")
    else:
        print("SELF-TEST FAILED — do not trust this check until it is fixed.")
    return 0 if ok else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return _self_test()
    if len(sys.argv) < 2:
        print("Usage: check-markup-neutral.py <block_name> | --self-test")
        return 1

    neutral, reason = is_markup_neutral(sys.argv[1])
    print(f"{'NEUTRAL' if neutral else 'NOT-NEUTRAL'}: {reason}")
    return 0 if neutral else 1


if __name__ == "__main__":
    sys.exit(main())
