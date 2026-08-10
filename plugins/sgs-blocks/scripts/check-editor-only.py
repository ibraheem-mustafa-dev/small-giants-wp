#!/usr/bin/env python3
"""check-editor-only.py — visual-diff-gate helper (branch 5).

Decides whether a staged change to a block is EDITOR-ONLY: it touches the block's
inspector/editor component and nothing that WordPress serves to a visitor. Such a
change cannot alter frontend first paint, so demanding a first-paint capture asks
a question the change cannot answer.

WHY THIS EXISTS
---------------
Added 2026-08-11 (D562), for the same reason as the four branches before it, and
in the words the gate itself already uses: *"the gate was asking an inapplicable
question; that is a gate bug, not an honesty problem in the author."*

The trigger: Spec 35 Phase 0 replaced three raw ``TextControl`` corner-radius
boxes with ``UnitControl`` (contract §14.3 → §14.1/§14.2) in ``sgs/card-grid`` and
``sgs/trust-bar``. Those edits live entirely in ``edit.js``. ``render.php``,
``style.css`` and the saved output were untouched, so a first-paint capture would
have compared a page against itself. The three available answers were all bad:
stamp a ``first_paint_capture_passed: true`` nobody measured, revert correct work
to avoid stamping it, or ``--no-verify`` away gitleaks, the wp-* pre-merge gate,
cheat-gate, F5 and F6 — all of which had already passed in the same run.

This is a recurring class, not a one-off: every future inspector-control change
hits the identical wall.

WHAT IT PROVES, AND WHAT IT REFUSES TO GUESS
--------------------------------------------
It does NOT try to decide in general whether JavaScript changes rendering. It
proves a deliberately NARROW sufficient condition and returns "gate applies" for
everything else. Every rule fails SAFE.

A block's staged change is editor-only iff ALL hold:

  1. The block has staged files, and EVERY one of them is ``edit.js``. A staged
     ``render.php`` / ``style.css`` / ``save.js`` / ``view.js`` / ``block.json``
     can all move pixels, so any of them means the gate applies.
     ``editor.css`` is deliberately NOT admitted — it restyles the editor canvas,
     which is a surface an author may legitimately want captured. Widening to it
     needs its own evidence, not this branch's.
  2. ``edit.js`` is MODIFIED — not added, deleted or renamed. A new file could be
     anything, and its history cannot be diffed.
  3. The STAGED ``edit.js`` exposes no named export. This is load-bearing: a
     ``export const FOO`` could be imported by a frontend bundle, at which point
     "editor-only" stops being true. Only a default export (the editor component,
     which WordPress runs exclusively in the editor) is admitted.
     Measured at introduction: 0 of 83 blocks carry a named export in edit.js.
  4. No sibling file in the block directory imports ``./edit``, except
     ``index.js`` — whose import IS the block registration's ``edit:`` field and
     is by definition editor-side. Measured at introduction: 83 index.js import
     it, and 0 save.js / view.js do.

Rules 3 and 4 are CHECKED PER BLOCK on every run, never assumed from the census
above. The census is why the rules are cheap, not a substitute for them.

Exit codes:
  0 — editor-only (the gate may SKIP the visual-report requirement)
  1 — NOT editor-only, or undeterminable → the gate APPLIES (fail safe)

Usage: check-editor-only.py <block_name>
       check-editor-only.py <block_name> --explain
       check-editor-only.py --self-test
"""
from __future__ import annotations

import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

BLOCK_DIR = "plugins/sgs-blocks/src/blocks"

# The one file this branch admits. Anything else in the block is a surface the
# visitor can see (or data that feeds one).
EDITOR_FILE = "edit.js"

# `export const X`, `export function X`, `export class X`, `export { X }`,
# `export default function` is NOT a named export and must not match.
NAMED_EXPORT_RE = re.compile(
    r"^\s*export\s+(?!default\b)(?:const|let|var|function|class|\{|\*)",
    re.MULTILINE,
)

# `from './edit'`, `from "./edit.js"`, `require('./edit')` — any module specifier
# resolving to the block's own edit module.
EDIT_IMPORT_RE = re.compile(r"""(?:from|require\s*\()\s*['"]\./edit(?:\.js)?['"]""")

# Siblings whose import of ./edit is legitimate: index.js registers the block and
# hands the component to registerBlockType's `edit` field, which runs only in the
# editor.
IMPORT_EXEMPT = {"index.js"}


def _run(args: list[str]) -> str:
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stdout


# ---------------------------------------------------------------------------
# Pure verdict function — no git, no filesystem, so the self-test can exercise
# every branch with synthetic inputs (the sibling checkers use the same split).
# ---------------------------------------------------------------------------
def verdict(
    staged_rows: list[tuple[str, str]],
    edit_js_text: str,
    siblings: dict[str, str],
) -> tuple[bool, str]:
    """Return (editor_only, reason).

    staged_rows  — (git status letter, path relative to the block dir)
    edit_js_text — the STAGED bytes of edit.js
    siblings     — {filename: text} for other files in the block directory
    """
    if not staged_rows:
        return False, "no staged files for this block"

    # Rule 1 + 2
    for state, path in staged_rows:
        if path != EDITOR_FILE:
            return False, (
                f"{path} is staged — only {EDITOR_FILE} is editor-only "
                "(render.php/style.css/save.js/view.js/block.json all move pixels)"
            )
        if state != "M":
            return False, f"{path} is {state} (added/deleted/renamed), not a modification"

    # Rule 3
    match = NAMED_EXPORT_RE.search(edit_js_text)
    if match:
        line = edit_js_text[: match.start()].count("\n") + 1
        return False, (
            f"{EDITOR_FILE}:{line} has a NAMED export — a frontend bundle could "
            "import it, so this file is not provably editor-only"
        )

    # Rule 4
    for name, text in sorted(siblings.items()):
        if name in IMPORT_EXEMPT or name == EDITOR_FILE:
            continue
        if EDIT_IMPORT_RE.search(text):
            return False, f"{name} imports ./edit — editor code reaches another surface"

    return True, "only edit.js changed; it has no named export and no non-index sibling imports it"


def is_editor_only(block: str) -> tuple[bool, str]:
    prefix = f"{BLOCK_DIR}/{block}/"

    status = _run(["git", "diff", "--cached", "--name-status", "--", prefix]).strip()
    rows: list[tuple[str, str]] = []
    for row in status.splitlines():
        parts = row.split("\t")
        rows.append((parts[0], parts[-1][len(prefix):]))

    if not rows:
        return False, "no staged files for this block"

    # Read the STAGED bytes — that is what is being committed, which may differ
    # from the working tree.
    edit_text = ""
    if any(p == EDITOR_FILE for _, p in rows):
        edit_text = _run(["git", "show", f":{prefix}{EDITOR_FILE}"])

    siblings: dict[str, str] = {}
    block_path = os.path.join(*prefix.rstrip("/").split("/"))
    if os.path.isdir(block_path):
        for name in os.listdir(block_path):
            if not name.endswith((".js", ".ts", ".jsx", ".tsx")):
                continue
            full = os.path.join(block_path, name)
            if not os.path.isfile(full):
                continue
            with open(full, encoding="utf-8", errors="replace") as handle:
                siblings[name] = handle.read()

    return verdict(rows, edit_text, siblings)


# ---------------------------------------------------------------------------
# Self-test — every rule gets a POSITIVE and a NEGATIVE control. A branch that
# cannot fail reads green forever, which is this repo's recorded failure mode.
# ---------------------------------------------------------------------------
_CASES = [
    (
        "POSITIVE — an inspector control swap in edit.js alone is editor-only",
        [("M", "edit.js")],
        "export default function Edit() { return <UnitControl /> }",
        {"index.js": "import Edit from './edit';", "save.js": "export default () => null;"},
        True,
    ),
    (
        "NEGATIVE (rule 1) — a staged render.php is NOT editor-only",
        [("M", "edit.js"), ("M", "render.php")],
        "export default function Edit() {}",
        {},
        False,
    ),
    (
        "NEGATIVE (rule 1) — a staged style.css is NOT editor-only",
        [("M", "style.css")],
        "",
        {},
        False,
    ),
    (
        "NEGATIVE (rule 1) — a staged block.json is NOT editor-only (data moves pixels)",
        [("M", "block.json")],
        "",
        {},
        False,
    ),
    (
        "NEGATIVE (rule 1) — editor.css is deliberately NOT admitted",
        [("M", "editor.css")],
        "",
        {},
        False,
    ),
    (
        "NEGATIVE (rule 2) — a newly ADDED edit.js is not a modification",
        [("A", "edit.js")],
        "export default function Edit() {}",
        {},
        False,
    ),
    (
        "NEGATIVE (rule 3) — a NAMED export in edit.js could reach a frontend bundle",
        [("M", "edit.js")],
        "export const SHARED_DEFAULT = 8;\nexport default function Edit() {}",
        {},
        False,
    ),
    (
        "POSITIVE (rule 3) — `export default function` is not a named export",
        [("M", "edit.js")],
        "export default function Edit() {}",
        {},
        True,
    ),
    (
        "NEGATIVE (rule 4) — save.js importing ./edit breaks editor-only",
        [("M", "edit.js")],
        "export default function Edit() {}",
        {"save.js": "import Edit from './edit';"},
        False,
    ),
    (
        "NEGATIVE (rule 4) — view.js require('./edit') is caught too",
        [("M", "edit.js")],
        "export default function Edit() {}",
        {"view.js": "const E = require('./edit');"},
        False,
    ),
    (
        "POSITIVE (rule 4) — index.js importing ./edit is the block registration",
        [("M", "edit.js")],
        "export default function Edit() {}",
        {"index.js": "import Edit from './edit';\nregisterBlockType(meta, { edit: Edit });"},
        True,
    ),
    (
        "NEGATIVE — nothing staged means the gate applies",
        [],
        "",
        {},
        False,
    ),
]


def _self_test() -> int:
    failures = 0
    for label, rows, edit_text, siblings, expected in _CASES:
        got, reason = verdict(rows, edit_text, siblings)
        ok = got == expected
        if not ok:
            failures += 1
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        if not ok:
            print(f"         expected editor_only={expected}, got {got} — {reason}")

    print()
    if failures:
        print(f"self-test: FAIL ({failures} of {len(_CASES)} cases)")
        return 1
    print(
        f"self-test: PASS ({len(_CASES)} cases — rule 1 file scope, rule 2 modification, "
        "rule 3 named exports, rule 4 sibling imports, each with both controls)"
    )
    return 0


def main() -> int:
    args = [a for a in sys.argv[1:]]
    if "--self-test" in args:
        return _self_test()
    if not args:
        print(__doc__)
        return 1

    explain = "--explain" in args
    block = next((a for a in args if not a.startswith("-")), "")
    if not block:
        print("usage: check-editor-only.py <block_name>")
        return 1

    ok, reason = is_editor_only(block)
    if explain or not ok:
        print(f"[check-editor-only] {block}: {'EDITOR-ONLY' if ok else 'gate applies'} — {reason}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
