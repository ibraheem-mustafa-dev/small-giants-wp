#!/usr/bin/env python3
"""check-editor-canvas-css.py — visual-diff-gate helper (branch 6).

Decides whether a staged change is EDITOR-CANVAS-ONLY: confined to `edit.js`
and/or `editor.css` for a block, with nothing else staged. `editor.css`
compiles to the editor-only `index.css` bundle (see plugins/sgs-blocks/
CLAUDE.md, "style.css vs editor.css are independent") — WordPress never
enqueues it on the frontend, so a change confined to it cannot alter what a
site visitor sees, full stop, by construction of this repo's build.

WHY THIS EXISTS, AND WHY IT DOES NOT JUST WIDEN check-editor-only.py
----------------------------------------------------------------------
check-editor-only.py already proves edit.js-only changes cannot reach the
frontend and lets them SKIP the gate entirely. It deliberately refuses
`editor.css` (its own comment: "editor.css is deliberately NOT admitted — it
restyles the editor canvas, which is a surface an author may legitimately
want captured"), with its own self-test negative control asserting exactly
that. That is a reasoned, tested design choice — an editor-canvas restyle CAN
have a real visible effect worth checking, just never on the frontend. This
file does not touch that choice.

Trigger (2026-08-14): a fix nested a `<ToolsPanel>` inside a `PanelBody` and
added one CSS rule per block, in `editor.css`, to hide the ToolsPanel's own
duplicate `<h2>` title while keeping the PanelBody's collapse behaviour and
the "..." reset-all menu intact — verified live via Playwright DOM inspection
+ screenshot on the sandybrown canary. `check-editor-only.py` correctly
refused (rule 1: CSS is not admitted), and `make-visual-diff-reports.py` is
built for FRONTEND before/after captures, which is not the surface that
changed here and cannot answer a question about the editor sidebar. Bean:
"Need diffs to be more flexible so we're able to actually verify with
screenshots that are legit." This is that flexibility — a narrow, deterministic
gate that proves the FILE SCOPE is editor-canvas-only, still requiring a real
captured report (not a free skip), just one that asks the RIGHT question.

WHAT IT PROVES, AND WHAT IT DOES NOT
-------------------------------------
This checker proves only file scope — that nothing staged for the block can
reach the frontend. It does NOT prove the editor canvas itself renders
correctly; that is the report's job (see the gate wiring in
.githooks/sgs-gates.sh), which requires `editor_capture_passed: true` backed
by a real Playwright/DOM capture, exactly parallel to how the frontend branch
requires `first_paint_capture_passed: true`. A report claiming
`editor_capture_passed: true` without a real capture is exactly the dishonest
stamp this whole gate family exists to prevent — this script cannot check
that; the human (or agent) writing the report is on the hook for it, same as
every other branch in this family.

A block's staged change is editor-canvas-only iff ALL hold:
  1. Every staged file is exactly `edit.js` or `editor.css`, at the block
     ROOT — nothing under components/, nothing nested deeper. (A component
     file is already covered by check-editor-only.py if it's JS; admitting
     nested CSS here would need the same reachability proof that file does,
     which this narrow checker does not attempt.)
  2. Every staged file is MODIFIED — not added, deleted or renamed.
  3. `editor.css` is not itself referenced by block.json's `style` field
     (i.e. it truly is the editor-only entry, not something misregistered as
     the frontend stylesheet — defence in depth against a renamed/repointed
     file).

Exit codes:
  0 — editor-canvas-only (the gate may require an editor_capture report
      instead of a first-paint one)
  1 — NOT editor-canvas-only, or undeterminable -> the gate applies as before

Usage: check-editor-canvas-css.py <block_name>
       check-editor-canvas-css.py <block_name> --explain
       check-editor-canvas-css.py --self-test
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

BLOCK_DIR = "plugins/sgs-blocks/src/blocks"
ADMITTED_FILES = {"edit.js", "editor.css"}


def _run(args: list[str]) -> str:
    return subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stdout


def verdict(staged_rows: list[tuple[str, str]], style_field_names: set) -> tuple[bool, str]:
    """Pure verdict function — no git, no filesystem (self-test exercises this
    directly with synthetic inputs, same split as check-editor-only.py)."""
    if not staged_rows:
        return False, "no staged files for this block"

    for state, path in staged_rows:
        norm = path.replace("\\", "/")
        if norm not in ADMITTED_FILES:
            return False, (
                f"{path} is staged and is not edit.js or editor.css at the block "
                "root — not provably editor-canvas-only"
            )
        if state != "M":
            return False, f"{path} is {state} (added/deleted/renamed), not a modification"
        if norm == "editor.css" and norm in style_field_names:
            return False, (
                "editor.css is named in block.json's frontend `style` field — "
                "it is not actually editor-only for this block"
            )

    what = ", ".join(sorted(p for _, p in staged_rows))
    return True, f"only {what} staged, neither reaches the frontend"


def is_editor_canvas_only(block: str) -> tuple[bool, str]:
    prefix = f"{BLOCK_DIR}/{block}/"
    status = _run(["git", "diff", "--cached", "--name-status", "--", prefix]).strip()
    rows: list[tuple[str, str]] = []
    for row in status.splitlines():
        if not row:
            continue
        parts = row.split("\t")
        rows.append((parts[0], parts[-1][len(prefix):]))

    if not rows:
        return False, "no staged files for this block"

    style_field_names: set = set()
    bj = os.path.join(*prefix.rstrip("/").split("/"), "block.json")
    if os.path.isfile(bj):
        try:
            with open(bj, encoding="utf-8") as fh:
                meta = json.load(fh)
        except Exception:
            return False, "block.json could not be parsed; cannot prove editor-canvas-only"
        val = meta.get("style")
        for item in (val if isinstance(val, list) else [val] if val else []):
            if isinstance(item, str) and item:
                style_field_names.add(item.replace("file:./", "").replace("file:", "").split("/")[-1])

    return verdict(rows, style_field_names)


# ---------------------------------------------------------------------------
# Self-test — every rule gets a positive and a negative control.
# ---------------------------------------------------------------------------
_CASES = [
    (
        "POSITIVE — editor.css alone is editor-canvas-only",
        [("M", "editor.css")],
        set(),
        True,
    ),
    (
        "POSITIVE — edit.js + editor.css together is editor-canvas-only",
        [("M", "edit.js"), ("M", "editor.css")],
        set(),
        True,
    ),
    (
        "POSITIVE — edit.js alone is editor-canvas-only (subset already covered "
        "by check-editor-only.py, but this checker must not wrongly refuse it)",
        [("M", "edit.js")],
        set(),
        True,
    ),
    (
        "NEGATIVE (rule 1) — a staged style.css is NOT editor-canvas-only",
        [("M", "editor.css"), ("M", "style.css")],
        set(),
        False,
    ),
    (
        "NEGATIVE (rule 1) — a staged render.php is NOT editor-canvas-only",
        [("M", "editor.css"), ("M", "render.php")],
        set(),
        False,
    ),
    (
        "NEGATIVE (rule 1) — a staged block.json is NOT editor-canvas-only",
        [("M", "editor.css"), ("M", "block.json")],
        set(),
        False,
    ),
    (
        "NEGATIVE (rule 1) — a nested components/*.css is not admitted here",
        [("M", "components/Panel.css")],
        set(),
        False,
    ),
    (
        "NEGATIVE (rule 2) — a newly ADDED editor.css is not a modification",
        [("A", "editor.css")],
        set(),
        False,
    ),
    (
        "NEGATIVE (rule 3) — editor.css misregistered as the frontend style is refused",
        [("M", "editor.css")],
        {"editor.css"},
        False,
    ),
    (
        "NEGATIVE — nothing staged means the gate applies",
        [],
        set(),
        False,
    ),
]


def _self_test() -> int:
    failures = 0
    for label, rows, style_names, expected in _CASES:
        got, reason = verdict(rows, style_names)
        ok = got == expected
        if not ok:
            failures += 1
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        if not ok:
            print(f"         expected editor_canvas_only={expected}, got {got} — {reason}")
    print()
    if failures:
        print(f"self-test: FAIL ({failures} of {len(_CASES)} cases)")
        return 1
    print(f"self-test: PASS ({len(_CASES)} cases — file scope, modification-only, "
          "misregistered-style, empty-stage — each with a control)")
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
        print("usage: check-editor-canvas-css.py <block_name>")
        return 1

    ok, reason = is_editor_canvas_only(block)
    if explain or not ok:
        print(f"[check-editor-canvas-css] {block}: {'EDITOR-CANVAS-ONLY' if ok else 'gate applies'} — {reason}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
