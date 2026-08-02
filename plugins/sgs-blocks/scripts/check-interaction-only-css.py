#!/usr/bin/env python3
"""check-interaction-only-css.py — visual-diff-gate helper.

Decides whether a staged CSS change to a block is INTERACTION-ONLY: a value
change to declarations that live exclusively inside rules whose selector
requires a user gesture (``:hover`` / ``:active`` / ``:focus-visible``). Such a
change cannot alter the first paint, because the rule cannot match until the
user moves a pointer or presses a key.

WHY THIS EXISTS
---------------
On 2026-08-02 the D467 focus-ring residual sweep repointed ten ``:focus-visible``
outline colours onto the shared ``--sgs-focus-color`` token across nine blocks —
one changed value per rule, no selector touched, no markup, no JS. The
visual-diff gate demanded a report per block carrying
``first_paint_capture_passed: true``. That field names a CAPTURE. No capture had
run, and for most of those blocks none could: the block was not present on the
measured canary page.

That left three bad options, and the project had already tried two of them:

* **Stamp the field anyway.** Nine reports did exactly this, reasoning correctly
  that ``:focus-visible`` cannot apply at first paint — but asserting a
  measurement that was never taken. A gate field that is argued rather than
  measured is worth nothing, and it teaches the next agent that the field is
  negotiable.
* **Revert the work.** The day before, a correct, deployed, live-measured
  ``sgs/nav-menu`` focus fix was REVERTED for precisely this reason, because the
  author would not fabricate the field. Discarding good code to keep a gate
  honest is the right instinct pointed at the wrong target.
* **``--no-verify``.** Discards gitleaks, the wp-* pre-merge gate, cheat-gate, F5
  and F6 — all of which were passing — to skip one inapplicable check.

The gate was asking an inapplicable question, so the fix belongs in the gate.
This is the same move ``check-blockjson-metadata-only.py`` made for
``supports.sgs`` edits and ``check-markup-neutral.py`` made for no-output PHP:
replace a documented bypass with a deterministic, auditable check.

WHAT IT PROVES, AND WHAT IT DELIBERATELY DOES NOT
-------------------------------------------------
It does NOT decide in general whether CSS moves pixels — undecidable statically.
It proves ONE narrow sufficient condition and returns "gate applies" for
everything else. Every rule fails SAFE.

A block's staged change is interaction-only iff ALL hold:
  1. Every staged file for the block is ``.css`` or ``.scss``. Any ``.php`` /
     ``.js`` / ``.json`` in the same staged set → the gate applies.
  2. Every staged file is MODIFIED — never added, deleted or renamed.
  3. Every changed line, added or removed, is one of: a comment, a blank, a bare
     brace, a DECLARATION (``prop: value;``), or a SELECTOR line that is itself
     gesture-only. An at-rule line, or anything unrecognised → the gate applies.
  4. Every changed declaration sits inside a rule whose selector carries at
     least one GESTURE pseudo-class and whose every comma-separated compound
     carries one. Every changed selector line is judged the same way on its own
     text, so `.a,\\n.b:hover {` is rejected on the `.a` line — `.a` paints.

WIDENED 2026-08-02, Bean-approved, and the reasoning matters because the first
version of this file was stricter:

  The original rule 5 required the multiset of property names added to EQUAL the
  multiset removed — a pure value substitution — and rejected anything that added
  a declaration or a whole rule. That was stricter than FIRST PAINT actually
  requires, and it blocked a correct `sgs/button` fix that ADDS
  ``.sgs-button:focus-visible { outline: … }``. A rule that cannot match until the
  user gestures cannot paint at first paint whether it is edited, added or
  removed; "what the rule does once it matches" is a real question but it is not
  the question this gate asks. Removing a gesture-only rule is safe for the same
  reason — it never painted at first paint, so its absence cannot change it.

  What did NOT relax: every changed line still has to sit inside, or BE, a
  gesture-only selector. Adding a rule that can match at first paint is still
  rejected, and there is a negative control for exactly that case.

WHY THE PSEUDO-CLASS ALLOWLIST IS SHORT
---------------------------------------
Only three qualify, and the near misses are the point:

* ``:focus`` is EXCLUDED. An element carrying ``autofocus`` is focused during
  load, so ``:focus`` can match at first paint.
* ``:target`` is EXCLUDED. It matches on load whenever the URL carries a
  matching fragment — a deep link paints with it already applied.
* ``:checked`` / ``:disabled`` / ``:visited`` / ``:first-child`` etc. are
  EXCLUDED. They describe document or control STATE, not a gesture, and are all
  live at first paint.

``:hover``, ``:active`` and ``:focus-visible`` each require a pointer or key
event that cannot have happened before the first paint. ``:focus-visible``
specifically will not match an autofocused element unless the UA heuristic
judges the focus keyboard-driven, and a page-load autofocus is not.

Exit codes:
  0 — interaction-only (the gate may SKIP the visual-report requirement)
  1 — NOT interaction-only, or undeterminable → the gate APPLIES (fail safe)

Usage: check-interaction-only-css.py <block_name>
       check-interaction-only-css.py --self-test
"""
from __future__ import annotations

import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

BLOCK_DIR = "plugins/sgs-blocks/src/blocks"

CSS_SUFFIXES = (".css", ".scss")

# Pseudo-classes that CANNOT match before the user has interacted. Adding to
# this tuple widens what the gate waves through — do not extend it without
# arguing, in this docstring, why the new entry cannot be live at first paint.
GESTURE_PSEUDOS = (":hover", ":active", ":focus-visible")

# Deliberately NOT gesture pseudo-classes, kept explicit so a future reader sees
# they were considered and rejected rather than forgotten. `:focus` and `:target`
# are the dangerous lookalikes — see the module docstring.
_REJECTED_PSEUDOS = (":focus", ":target", ":checked", ":disabled", ":visited")

DECL_RE = re.compile(r"^\s*[-A-Za-z_][-A-Za-z0-9_]*\s*:\s*[^;{}]+;?\s*$")
PROP_RE = re.compile(r"^\s*([-A-Za-z_][-A-Za-z0-9_]*)\s*:")


def _is_comment_or_blank(line: str) -> bool:
    s = line.strip()
    return (
        not s
        or s.startswith("//")
        or s.startswith("/*")
        or s.startswith("*")
        or s.startswith("*/")
    )


def _run(args: list[str]) -> str:
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stdout


def _strip_css_comments(line: str, in_comment: bool) -> tuple[str, bool]:
    """Remove `/* … */` content from one line, carrying state across lines.

    Returns (code_only_line, still_inside_a_comment). Handles a comment that
    opens and closes on the same line, one that spans many lines, and several
    comments on one line.
    """
    out = []
    i = 0
    while i < len(line):
        if in_comment:
            end = line.find("*/", i)
            if end == -1:
                return "".join(out), True
            i = end + 2
            in_comment = False
        else:
            start = line.find("/*", i)
            if start == -1:
                out.append(line[i:])
                return "".join(out), False
            out.append(line[i:start])
            i = start + 2
            in_comment = True
    return "".join(out), in_comment


def _selector_context(text: str) -> dict[int, str]:
    """Map 1-based line number → the innermost selector governing that line.

    A deliberately small brace scanner, not a CSS parser. It tracks the text
    accumulated since the last ``{``/``}``/``;`` and pushes it as the selector
    when a ``{`` opens. At-rule blocks (``@media``) push their prelude too, so a
    declaration nested inside one still resolves to the RULE around it, which is
    what rule 4 needs. Anything it cannot attribute gets ``""`` and therefore
    fails rule 4 — the safe direction.
    """
    context: dict[int, str] = {}
    stack: list[str] = []
    pending = ""
    in_comment = False
    for lineno, raw in enumerate(text.splitlines(), start=1):
        # Strip comments with MULTI-LINE state. Without this the body of a
        # block comment accumulates into `pending` and is then pushed as the
        # "selector" of the next rule — which made a correct :focus-visible
        # rule report its own docblock as a first-paint-matching selector.
        # Fails safe, but for a reason that is nonsense to read.
        line, in_comment = _strip_css_comments(raw, in_comment)
        line = re.split(r"//", line, maxsplit=1)[0]
        context[lineno] = stack[-1] if stack else ""
        for ch in line:
            if ch == "{":
                stack.append(pending.strip())
                pending = ""
            elif ch == "}":
                if stack:
                    stack.pop()
                pending = ""
            elif ch == ";":
                pending = ""
            else:
                pending += ch
        # A declaration on the same line as its opening brace belongs INSIDE.
        if "{" in line:
            context[lineno] = stack[-1] if stack else ""
    return context


def _is_gesture_selector(selector: str) -> bool:
    """True iff EVERY comma-separated compound needs a gesture to match.

    All-of, not any-of, on purpose: ``.a, .b:hover { }`` matches ``.a`` at first
    paint, so a value change inside it is visible immediately.
    """
    sel = selector.strip()
    if not sel or sel.startswith("@"):
        return False
    parts = [p.strip() for p in sel.split(",") if p.strip()]
    if not parts:
        return False
    for part in parts:
        if not any(p in part for p in GESTURE_PSEUDOS):
            return False
        # `:focus-visible` contains `:focus` as a substring; strip the longer
        # tokens before hunting for a rejected one, or every :focus-visible rule
        # would be wrongly rejected.
        stripped = part
        for p in GESTURE_PSEUDOS:
            stripped = stripped.replace(p, "")
        if any(bad in stripped for bad in _REJECTED_PSEUDOS):
            return False
    return True


def _changed_lines(path: str, side: str) -> list[tuple[int, str]]:
    """Changed lines with their line number in the given side ('+' new, '-' old)."""
    diff = _run(["git", "diff", "--cached", "--unified=0", "--", path])
    out: list[tuple[int, str]] = []
    old_no = new_no = 0
    for line in diff.splitlines():
        m = re.match(r"^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if m:
            old_no, new_no = int(m.group(1)), int(m.group(2))
            continue
        if line.startswith(("+++", "---", "diff ", "index ", "new file", "deleted")):
            continue
        if line.startswith("+"):
            if side == "+":
                out.append((new_no, line[1:]))
            new_no += 1
        elif line.startswith("-"):
            if side == "-":
                out.append((old_no, line[1:]))
            old_no += 1
    return out


def _evaluate(changed: list[tuple[int, str]], context: dict[int, str],
              label: str) -> tuple[bool, str, list[str]]:
    """Apply rules 3 and 4 to one side. Returns (ok, reason, property names).

    Every changed line must be one of:
      * a comment or blank                                        — ignored
      * a bare brace                                              — structure only
      * a SELECTOR line that is itself gesture-only               — rule 3a
      * a DECLARATION inside a gesture-only rule                  — rules 3b + 4

    Anything else fails safe.
    """
    props: list[str] = []
    for lineno, body in changed:
        if _is_comment_or_blank(body):
            continue

        stripped = body.strip()

        # Bare structural braces carry no paint of their own.
        if stripped in ( "{", "}", "};" ):
            continue

        if DECL_RE.match(body):
            selector = context.get(lineno, "")
            if not _is_gesture_selector( selector ):
                return False, (
                    f"{label} line {lineno} is in a rule that can match at first "
                    f"paint: {selector.strip()[:70] or '<unattributed>'}"
                ), []
            m = PROP_RE.match(body)
            if m:
                props.append(m.group(1).lower())
            continue

        # A selector line — either opening a rule (`… {`) or one member of a
        # multi-line selector list (`… ,`). Judged on ITS OWN text, so each
        # member of a list must independently need a gesture: `.a,\n.b:hover {`
        # is rejected on the `.a` line, which is correct — `.a` paints.
        if stripped.endswith( "{" ) or stripped.endswith( "," ):
            candidate = stripped.rstrip( "{," ).strip()
            if candidate and _is_gesture_selector( candidate ):
                continue
            return False, (
                f"{label} line {lineno} adds or removes a rule that CAN match at "
                f"first paint: {candidate[:70] or '<empty selector>'}"
            ), []

        return False, (
            f"{label} line {lineno} is not a declaration, brace or gesture-only "
            f"selector: {stripped[:70]}"
        ), []
    return True, "", props


def is_interaction_only(block: str) -> tuple[bool, str]:
    """Return (interaction_only, human-readable reason)."""
    prefix = f"{BLOCK_DIR}/{block}/"

    status = _run(["git", "diff", "--cached", "--name-status", "--", prefix]).strip()
    if not status:
        return False, "no staged files for this block"

    paths: list[str] = []
    for row in status.splitlines():
        parts = row.split("\t")
        state, path = parts[0], parts[-1]
        if state != "M":
            return False, f"{path} is {state} (added/deleted/renamed), not a modification"
        if not path.endswith(CSS_SUFFIXES):
            return False, f"{path} is not CSS/SCSS — this check only reasons about stylesheets"
        paths.append(path)

    added_props: list[str] = []
    removed_props: list[str] = []

    for path in paths:
        new_ctx = _selector_context(_run(["git", "show", f":{path}"]))
        old_ctx = _selector_context(_run(["git", "show", f"HEAD:{path}"]))

        ok, reason, props = _evaluate(_changed_lines(path, "+"), new_ctx, f"{path} (added)")
        if not ok:
            return False, reason
        added_props += props

        ok, reason, props = _evaluate(_changed_lines(path, "-"), old_ctx, f"{path} (removed)")
        if not ok:
            return False, reason
        removed_props += props

    # NOTE: there is deliberately no "properties added == properties removed"
    # check here any more. It was rule 5 until 2026-08-02 and it was stricter
    # than first paint requires — see the WIDENED note in the module docstring.
    # Every changed line has already been proven to sit inside, or to BE, a
    # gesture-only selector, which is the whole question this gate asks.
    if not added_props and not removed_props:
        return True, "only comments/blank lines changed inside gesture-only rules"

    touched = sorted(set(added_props) | set(removed_props))
    return True, (
        f"{len(added_props)} added / {len(removed_props)} removed declaration(s) "
        f"on {touched}, all inside :hover/:active/:focus-visible rules — "
        "cannot match at first paint"
    )


# --------------------------------------------------------------------------- #
# NEGATIVE CONTROLS — a gate that cannot fail reads green forever.
# --------------------------------------------------------------------------- #

_SELF_TEST_CSS = """.sgs-x__link {
\tcolor: #111;
}
.sgs-x__link:focus-visible {
\toutline: 2px solid currentColor;
\toutline-offset: 3px;
}
.sgs-x__btn:hover,
.sgs-x__btn:focus-visible {
\tbackground: #eee;
}
.sgs-x__row, .sgs-x__row:hover {
\tgap: 8px;
}
.sgs-x__in:focus {
\toutline: 1px solid red;
}
@media (max-width: 767px) {
\t.sgs-x__link:hover {
\t\tcolor: #222;
\t}
}
"""

# (name, 1-based line number in _SELF_TEST_CSS, replacement text, expected_ok,
#  expected_reason_fragment)
#
# The reason fragment is not decoration. During construction, three of these
# controls "passed" while landing on a `}` line, so they were rejected by the
# not-a-declaration rule rather than by the rule each was written to exercise —
# a control that fails for the wrong reason proves nothing and hides a gap.
# Asserting the reason is what turns them into real controls.
_SELF_TEST_CASES = [
    ("value swap inside :focus-visible is INTERACTION-ONLY",
     5, "\toutline: 2px solid var(--sgs-focus-color, currentColor);", True, ""),
    ("value swap inside a :hover nested in @media is INTERACTION-ONLY",
     20, "\t\tcolor: #333;", True, ""),
    ("value swap in an all-gesture selector LIST is INTERACTION-ONLY",
     10, "\tbackground: #ddd;", True, ""),
    ("NEGATIVE CONTROL — a base rule is NOT interaction-only",
     2, "\tcolor: #222;", False, "can match at first paint"),
    ("NEGATIVE CONTROL — a MIXED selector list is NOT interaction-only",
     13, "\tgap: 12px;", False, "can match at first paint"),
    ("NEGATIVE CONTROL — :focus is NOT a gesture pseudo (autofocus)",
     16, "\toutline: 1px solid blue;", False, "can match at first paint"),
    ("NEGATIVE CONTROL — two declarations crammed on one line are not parseable",
     5, "\toutline: 2px solid currentColor; box-shadow: 0 0 4px red;", False,
     "not a declaration, brace or gesture-only selector"),
]

# Whole-rule ADD/REMOVE cases — the 2026-08-02 widening. Each supplies a full
# synthetic file plus the line numbers that changed, so the selector-context
# scanner is exercised on real structure rather than a single spliced line.
# (name, css, changed_line_numbers, expected_ok, reason_fragment)
_SELF_TEST_RULE_CASES = [
    (
        "adding a whole GESTURE-ONLY rule is INTERACTION-ONLY (the sgs/button case)",
        ".sgs-button {\n\tcolor: #111;\n}\n"
        ".sgs-button:focus-visible {\n\toutline: 2px solid var(--sgs-focus-color);\n}\n",
        [4, 5, 6], True, "",
    ),
    (
        "NEGATIVE CONTROL — adding a rule that CAN match at first paint is blocked",
        ".sgs-button {\n\tcolor: #111;\n}\n"
        ".sgs-button__label {\n\tfont-weight: 700;\n}\n",
        [4, 5, 6], False, "match at first paint",
    ),
    (
        "NEGATIVE CONTROL — a gesture rule nested in a MIXED list is still blocked",
        ".sgs-button {\n\tcolor: #111;\n}\n"
        ".sgs-button__label,\n.sgs-button:hover {\n\tfont-weight: 700;\n}\n",
        [4, 5, 6, 7], False, "match at first paint",
    ),
]


def _apply(lineno: int, replacement: str) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """Synthesise the (added, removed) line lists for a one-line edit."""
    original = _SELF_TEST_CSS.splitlines()
    return [(lineno, replacement)], [(lineno, original[lineno - 1])]


def _self_test() -> int:
    """Exercise the decision rules against synthetic edits — no git required."""
    ok_all = True
    ctx = _selector_context(_SELF_TEST_CSS)

    for name, lineno, replacement, expected, want_reason in _SELF_TEST_CASES:
        added, removed = _apply(lineno, replacement)
        ok, reason, _ = _evaluate(added, ctx, "added")
        if ok:
            ok, reason, _ = _evaluate(removed, ctx, "removed")
        got = ok
        failed = got != expected
        # A control that fails for the wrong reason is not a control.
        wrong_reason = (not expected) and want_reason and want_reason not in reason
        status = "PASS" if not (failed or wrong_reason) else "FAIL"
        if failed or wrong_reason:
            ok_all = False
        print(f"  [{status}] {name}")
        if failed:
            print(f"          expected interaction_only={expected}, got {got} ({reason})")
        elif wrong_reason:
            print(f"          rejected for the WRONG reason — wanted {want_reason!r}, "
                  f"got {reason!r}")

    # Whole-rule add/remove cases (the 2026-08-02 widening).
    for name, css, linenos, expected, want_reason in _SELF_TEST_RULE_CASES:
        rule_ctx = _selector_context(css)
        lines = css.splitlines()
        changed = [(n, lines[n - 1]) for n in linenos]
        got, reason, _ = _evaluate(changed, rule_ctx, "added")
        failed = got != expected
        wrong_reason = (not expected) and want_reason and want_reason not in reason
        status = "PASS" if not (failed or wrong_reason) else "FAIL"
        if failed or wrong_reason:
            ok_all = False
        print(f"  [{status}] {name}")
        if failed:
            print(f"          expected interaction_only={expected}, got {got} ({reason})")
        elif wrong_reason:
            print(f"          rejected for the WRONG reason — wanted {want_reason!r}, "
                  f"got {reason!r}")

    # Vacuity control: the whole check must be capable of returning False at all.
    if all(c[3] for c in _SELF_TEST_CASES):
        print("  [FAIL] vacuity — every case expects True; the check could not fail")
        ok_all = False

    # Guard the allowlist itself: a rejected pseudo must never read as a gesture.
    for bad in _REJECTED_PSEUDOS:
        if _is_gesture_selector(f".x{bad}"):
            print(f"  [FAIL] allowlist leak — '{bad}' accepted as a gesture pseudo")
            ok_all = False
    for good in GESTURE_PSEUDOS:
        if not _is_gesture_selector(f".x{good}"):
            print(f"  [FAIL] allowlist gap — '{good}' rejected as a gesture pseudo")
            ok_all = False

    print("\nself-test:", "PASS" if ok_all else "FAIL")
    return 0 if ok_all else 1


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    if sys.argv[1] == "--self-test":
        return _self_test()

    interaction_only, reason = is_interaction_only(sys.argv[1])
    print(("INTERACTION-ONLY: " if interaction_only else "GATE APPLIES: ") + reason)
    return 0 if interaction_only else 1


if __name__ == "__main__":
    raise SystemExit(main())
