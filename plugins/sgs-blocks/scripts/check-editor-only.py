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

  1. Every staged file is JavaScript, sits at the block ROOT or under
     ``components/``, and is NOT a frontend entry. The frontend set is DERIVED
     from ``block.json`` (``viewScript`` / ``viewScriptModule`` / ``script`` /
     ``render`` / ``style``) rather than guessed from filenames — which is how a
     block that keeps its inspector control at the block root
     (``before-after/BooleanResponsiveControl.js``) is handled without a
     hardcoded allowlist. PHP, CSS and ``block.json`` are refused outright, and
     so is any deeper path such as ``assets/sprite.js``.
     ``editor.css`` is deliberately NOT admitted — it restyles the editor canvas,
     which is a surface an author may legitimately want captured.
  2. Every staged file is MODIFIED — not added, deleted or renamed. A new file
     could be anything, and its history cannot be diffed.
  3. The STAGED ``edit.js`` exposes no named export. Load-bearing: an
     ``export const FOO`` could be imported by a frontend bundle, at which point
     "editor-only" stops being true. Measured at introduction: 0 of 83 blocks
     carry a named export in edit.js. ⚠ This rule is edit.js-ONLY — an inspector
     COMPONENT is supposed to export named panels, so its equivalent guarantee is
     rule 5.
  4. No sibling imports ``./edit`` except ``index.js`` — whose import IS the
     block registration's ``edit:`` field and is by definition editor-side.
     Measured at introduction: 83 index.js import it, and 0 save.js / view.js do.
  5. No staged component is REACHABLE from a frontend entry, transitively. The
     first shape of this rule checked direct imports only and was wrong:
     ``view.js`` → ``helper.js`` → the staged file would have been cleared. It
     now walks the import graph from every frontend entry. The sibling map is
     collected RECURSIVELY for the same reason — a flat listing never contained
     ``components/*.js``, so the walk would have passed by being blind rather
     than by proving anything.

  6. No staged ``edit.js`` line sits inside a ``useEffect``/``useLayoutEffect``
     that calls ``setAttributes``. ⛔ ADDED 2026-08-11 (D566) because this file's
     founding premise — "edit.js cannot change frontend first paint" — is FALSE
     for an UNATTENDED write. ``sgs/form``'s edit.js generates ``formId`` in a
     mount effect and ``form/render.php:51,113`` prints it, so editing that
     generation logic changes what a visitor gets, from an edit.js-only diff. A
     ``setAttributes`` in an ``onChange`` is fine — the operator caused it and
     can see it. One that fires on its own is not.

Rules 3, 4, 5 and 6 are CHECKED PER BLOCK on every run, never assumed from the
census above. The census is why the rules are cheap, not a substitute for them.

⛔ WHAT A QC COUNCIL FOUND ON THE DAY THIS SHIPPED (D566) — three real holes, all
demonstrated rather than theorised, all now closed and each with its own control:
  * a lone ``index.js`` was admitted as editor-only. It is the REGISTRATION file
    (``save``, ``deprecated``), so that was a frontend change waved through.
  * the mount-effect hole above.
  * rule 5 first checked DIRECT imports only, and the sibling map was collected
    non-recursively, so it could not see the very ``components/*.js`` files this
    branch was widened to admit.
Read that list before widening this file again: every one of them was a case
where the rule looked right and was blind.

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

# The files this branch admits. Anything else in the block is a surface the
# visitor can see (or data that feeds one).
EDITOR_FILE = "edit.js"

# WIDENED 2026-08-11 (D565, Bean-approved): a block's own inspector components,
# e.g. `container/components/ContainerWrapperControls.js`. These are imported by
# edit.js and WordPress never serves them to a visitor, so — exactly like edit.js
# — they cannot change frontend first paint.
#
# The trigger was the `__experimental*` compat-boundary migration, which rewrote
# an import line in ContainerWrapperControls.js. Splitting that one file out of
# the commit was not an option: leaving it unmigrated while the new gate was
# wired would have failed the build on every fresh clone.
#
# Measured before widening, not assumed: ContainerWrapperControls.js is imported
# by 31 edit.js files plus the device-toggle extension, and by ZERO frontend
# surfaces — the only 4 hits in save.js/view.js/render.php are PHP comments, and
# PHP cannot import JS. Rule 5 below re-checks that per block on every run rather
# than trusting this paragraph.
EDITOR_COMPONENT_DIR = "components"

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

# Files WordPress serves to a visitor (or that build what it serves). If one of
# these imports a staged inspector component, the change is not editor-only.
#
# ⛔ `index.js` IS IN THIS SET, and that is not obvious — it is the block
# REGISTRATION file. It wires `save`, `deprecated` and `edit` into
# registerBlockType. A change to `save` wiring on a static block rewrites what is
# serialised into `post_content`; a change to `deprecated` breaks migration of
# already-saved content. Both are first-order frontend changes.
#
# Found by a QC council 2026-08-11 (D566) and demonstrated, not theorised: a lone
# staged `index.js` was classified EDITOR-ONLY by the first version of this file
# and skipped the visual-diff gate entirely. `IMPORT_EXEMPT` below rationalises
# index.js for RULE 4 only (its import of ./edit is the registration), and that
# narrow exemption was wrongly reading as whole-file admission.
FRONTEND_SURFACES = {
    "save.js", "save.jsx",
    "view.js", "view.jsx",
    "frontend.js",
    "index.js",
}


def mount_effect_write_ranges(text: str) -> list[tuple[int, int]]:
    """Line ranges of `useEffect`/`useLayoutEffect` bodies that call setAttributes.

    WHY (D566, found by QC council 2026-08-11 — demonstrated in live code, not
    theorised): this branch's premise was "edit.js cannot change frontend first
    paint". That is FALSE for a write that happens WITHOUT user interaction.
    `sgs/form`'s edit.js auto-generates `formId` in a mount effect
    (``setAttributes({ formId: `form-${clientId.substr(0,8)}` })``) and
    ``form/render.php`` reads `$attributes['formId']` and prints it into the
    rendered form. Editing that generation logic changes what the VISITOR gets,
    from an edit.js-only diff.

    A setAttributes call in an onChange handler is fine — the operator caused it
    and can see the result. A call in an effect fires on its own.
    """
    ranges: list[tuple[int, int]] = []
    for match in re.finditer(r"use(?:Layout)?Effect\s*\(", text):
        i = text.find("{", match.end())
        if i == -1:
            continue
        depth, j = 0, i
        while j < len(text):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        body = text[i:j]
        if "setAttributes" in body:
            ranges.append(
                (text[:i].count("\n") + 1, text[:j].count("\n") + 1)
            )
    return ranges


def changed_line_numbers(diff: str) -> list[int]:
    """New-file line numbers touched by a unified diff (parsed from @@ hunks)."""
    lines: list[int] = []
    for hunk in re.finditer(r"^@@ -\S+ \+(\d+)(?:,(\d+))? @@", diff, re.MULTILINE):
        start = int(hunk.group(1))
        count = int(hunk.group(2) or 1)
        lines.extend(range(start, start + max(count, 1)))
    return lines


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
    frontend_entries: set | None = None,
    edit_changed_lines: list | None = None,
) -> tuple[bool, str]:
    """Return (editor_only, reason).

    staged_rows  — (git status letter, path relative to the block dir)
    edit_js_text — the STAGED bytes of edit.js
    siblings     — {filename: text} for other files in the block directory
    """
    if not staged_rows:
        return False, "no staged files for this block"

    # The FRONTEND set is derived from block.json, not guessed from filenames.
    # `viewScript` / `viewScriptModule` / `script` / `render` / `style` name what
    # WordPress actually serves; `editorScript` names the editor entry. Deriving
    # it this way is why a block that keeps its inspector control at the block
    # ROOT (before-after/BooleanResponsiveControl.js) is handled correctly
    # without adding its filename to any hardcoded list — the project's
    # detect-by-what-it-does rule, applied here.
    frontend = set(FRONTEND_SURFACES) | set(frontend_entries or ())

    # Rule 1 + 2
    component_files = []
    for state, path in staged_rows:
        norm = path.replace("\\", "/")
        base = norm.rsplit("/", 1)[-1]
        if not norm.endswith((".js", ".jsx")):
            return False, (
                f"{path} is staged and is not JavaScript — PHP, CSS and block.json "
                "all change what the visitor sees"
            )
        # Defence in depth alongside the manifest check: admit only the block
        # ROOT (where before-after/media keep BooleanResponsiveControl.js) and
        # components/. An arbitrary nested path such as assets/sprite.js is
        # refused outright rather than argued about — narrow beats clever, and a
        # deeper tree is where transitive reachability gets hard to prove.
        depth = norm.count("/")
        if depth > 1 or (depth == 1 and not norm.startswith(EDITOR_COMPONENT_DIR + "/")):
            return False, (
                f"{path} is neither at the block root nor under "
                f"{EDITOR_COMPONENT_DIR}/ — not provably an editor surface"
            )
        if base in frontend or norm in frontend:
            return False, (
                f"{path} is a FRONTEND entry for this block (named in block.json "
                "or a save/view surface), so it can change first paint"
            )
        if state != "M":
            return False, f"{path} is {state} (added/deleted/renamed), not a modification"
        if norm != EDITOR_FILE:
            component_files.append(norm)

    # Rule 3 — applies to edit.js only. An inspector COMPONENT is expected to
    # carry named exports (that is how edit.js imports it), so the equivalent
    # guarantee for components is rule 5 below: prove no frontend surface
    # actually imports it, rather than forbidding the export shape.
    match = NAMED_EXPORT_RE.search(edit_js_text)
    if match:
        line = edit_js_text[: match.start()].count("\n") + 1
        return False, (
            f"{EDITOR_FILE}:{line} has a NAMED export — a frontend bundle could "
            "import it, so this file is not provably editor-only"
        )

    # Rule 5 — no FRONTEND surface REACHES a staged component, transitively.
    # Checked per block per run; never inferred from a past census.
    #
    # Direct-import-only was the first shape and it was wrong: view.js could
    # import a helper that imports the staged file, and the check would clear a
    # change that genuinely ships to the visitor. Walk the import graph instead,
    # starting from every frontend entry, following relative specifiers inside
    # the block.
    reachable: set[str] = set()
    queue = [n for n in siblings if n in frontend]
    while queue:
        current = queue.pop()
        if current in reachable:
            continue
        reachable.add(current)
        for spec in re.findall(
            r"""(?:from|require\s*\()\s*['"](\.[^'"]+)['"]""", siblings.get(current, "")
        ):
            stem = spec.split("/")[-1].rsplit(".", 1)[0]
            for cand in siblings:
                cand_stem = cand.rsplit("/", 1)[-1].rsplit(".", 1)[0]
                if cand_stem == stem and cand not in reachable:
                    queue.append(cand)

    for comp in component_files:
        comp_stem = comp.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        for hit in reachable:
            if hit in frontend:
                continue  # the entry itself, not a reached component
            if hit.rsplit("/", 1)[-1].rsplit(".", 1)[0] == comp_stem:
                return False, (
                    f"{comp} is reachable from a frontend entry (via {hit}) — "
                    "it ships to the visitor, so the change is not editor-only"
                )
        # Also catch a frontend entry importing the component directly.
        for name in sorted(siblings):
            if name not in frontend:
                continue
            if re.search(
                r"""(?:from|require\s*\()\s*['"][^'"]*%s(?:\.jsx?)?['"]"""
                % re.escape(comp_stem),
                siblings[name],
            ):
                return False, (
                    f"{name} imports {comp} — a frontend surface reaches this "
                    "component, so the change is not provably editor-only"
                )

    # Rule 4
    for name, text in sorted(siblings.items()):
        if name in IMPORT_EXEMPT or name == EDITOR_FILE:
            continue
        if EDIT_IMPORT_RE.search(text):
            return False, f"{name} imports ./edit — editor code reaches another surface"

    # Rule 6 — a staged edit.js line inside a MOUNT-EFFECT that writes attributes.
    # See mount_effect_write_ranges() for why this is not editor-only.
    if edit_js_text and edit_changed_lines:
        for start, end in mount_effect_write_ranges(edit_js_text):
            hit = [n for n in edit_changed_lines if start <= n <= end]
            if hit:
                return False, (
                    f"edit.js:{hit[0]} is inside a useEffect that calls setAttributes "
                    f"(lines {start}-{end}) — an unattended write to stored attributes "
                    "can change what render.php prints to visitors"
                )

    what = "edit.js"
    if component_files:
        what = ", ".join(component_files) if len(staged_rows) == len(component_files) \
            else "edit.js + " + ", ".join(component_files)
    return True, (
        f"only editor surfaces staged ({what}); no named export on edit.js, "
        "no non-index sibling imports ./edit, and no frontend surface imports "
        "the staged component(s)"
    )


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
        # RECURSIVE, keyed by path relative to the block dir. A flat os.listdir
        # was the first shape and it was wrong: components/*.js never entered the
        # dict, so rule 5's reachability walk could not see the very files this
        # branch was widened to admit — it would have cleared them by being blind
        # rather than by proving anything.
        for root, _dirs, files in os.walk(block_path):
            for name in files:
                if not name.endswith((".js", ".ts", ".jsx", ".tsx")):
                    continue
                full = os.path.join(root, name)
                rel = os.path.relpath(full, block_path).replace(os.sep, "/")
                with open(full, encoding="utf-8", errors="replace") as handle:
                    siblings[rel] = handle.read()

    frontend_entries = set()
    bj = os.path.join(block_path, "block.json")
    if os.path.isfile(bj):
        import json as _json
        try:
            with open(bj, encoding="utf-8") as fh:
                meta = _json.load(fh)
        except Exception:
            # An unreadable manifest means we cannot prove anything — fail safe.
            return False, "block.json could not be parsed; cannot prove editor-only"
        for field in ("script", "viewScript", "viewScriptModule", "render", "style", "viewStyle"):
            val = meta.get(field)
            for item in (val if isinstance(val, list) else [val]):
                if isinstance(item, str) and item:
                    frontend_entries.add(item.replace("file:./", "").replace("file:", "").split("/")[-1])

    edit_changed = None
    if any(p == EDITOR_FILE for _, p in rows):
        edit_changed = changed_line_numbers(
            _run(["git", "diff", "--cached", "-U0", "--", f"{prefix}{EDITOR_FILE}"])
        )

    return verdict(rows, edit_text, siblings, frontend_entries, edit_changed)


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
    # ── Rule 1 widening + rule 5 (D565) ──────────────────────────────────────
    (
        "POSITIVE — a block's own inspector component is editor-only",
        [("M", "components/ContainerWrapperControls.js")],
        "",
        {"index.js": "import Edit from './edit';", "save.js": "export default () => null;"},
        True,
    ),
    (
        "POSITIVE — edit.js AND its inspector component together",
        [("M", "edit.js"), ("M", "components/WidthPanel.js")],
        "export default function Edit() {}",
        {"save.js": "export default () => null;"},
        True,
    ),
    (
        "NEGATIVE (rule 5) — save.js importing the staged component breaks it",
        [("M", "components/ContainerWrapperControls.js")],
        "",
        {"save.js": "import X from './components/ContainerWrapperControls';"},
        False,
    ),
    (
        "NEGATIVE (rule 5) — view.js importing it is caught too",
        [("M", "components/WidthPanel.js")],
        "",
        {"view.js": "const P = require('./components/WidthPanel.js');"},
        False,
    ),
    (
        "POSITIVE (rule 5) — an EDIT.JS importing the component is fine, not frontend",
        [("M", "components/WidthPanel.js")],
        "",
        {"edit.js": "import WidthPanel from './components/WidthPanel';"},
        True,
    ),
    (
        "NEGATIVE — a component that is NOT .js (e.g. a css file) is not admitted",
        [("M", "components/panel.css")],
        "",
        {},
        False,
    ),
    (
        "NEGATIVE (rule 5) — TRANSITIVE reach: view.js -> helper.js -> the staged component",
        [("M", "components/Thing.js")],
        "",
        {
            "view.js": "import h from './helper';",
            "helper.js": "import T from './components/Thing';",
            "components/Thing.js": "export default function Thing() {}",
        },
        False,
    ),
    # ── D566 council findings: index.js + mount-effect writes ────────────────
    (
        "NEGATIVE (D566/B1) — a lone index.js is REGISTRATION, not editor-only",
        [("M", "index.js")],
        "",
        {"index.js": "import Save from './save'; registerBlockType(n,{edit:Edit,save:Save});"},
        False,
    ),
    (
        "NEGATIVE (D566/B1) — edit.js + index.js together is still not editor-only",
        [("M", "edit.js"), ("M", "index.js")],
        "export default function Edit() {}",
        {},
        False,
    ),
    (
        "NEGATIVE — a nested non-component path is not admitted",
        [("M", "assets/sprite.js")],
        "",
        {},
        False,
    ),
]


def _self_test() -> int:
    failures = 0

    # ── Rule 6 (D566): mount-effect writes ───────────────────────────────────
    _EFFECT = chr(10).join([
        "export default function Edit({ attributes, setAttributes, clientId }) {",
        "  useEffect( () => {",
        "    if ( ! formId ) {",
        "      setAttributes( { formId: `form-` + clientId } );",
        "    }",
        "  }, [ formId ] );",
        "  return <UnitControl onChange={ (v) => setAttributes({ radius: v }) } />;",
        "}",
    ])
    r6 = [
        ("POSITIVE (rule 6) — a mount-effect setAttributes range is FOUND",
         lambda: len(mount_effect_write_ranges(_EFFECT)) == 1),
        ("NEGATIVE (rule 6) — an onChange-only file has NO effect range",
         lambda: mount_effect_write_ranges(
             "const E=()=> <X onChange={(v)=>setAttributes({a:v})} />;") == []),
        ("NEGATIVE (rule 6) — a useEffect WITHOUT setAttributes is not flagged",
         lambda: mount_effect_write_ranges(
             "useEffect( () => { console.log(1); }, [] );") == []),
        ("POSITIVE (rule 6) — a line INSIDE the effect gates; one OUTSIDE does not",
         lambda: (verdict([("M", "edit.js")], _EFFECT, {}, None, [4])[0] is False)
                 and (verdict([("M", "edit.js")], _EFFECT, {}, None, [7])[0] is True)),
    ]
    for name, fn in r6:
        ok = False
        try:
            ok = bool(fn())
        except Exception as exc:  # a crashing control is a failing control
            print(f"         raised: {exc}")
        if not ok:
            failures += 1
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")

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
        print(f"self-test: FAIL ({failures} of {len(_CASES) + len(r6)} cases)")
        return 1
    print(
        f"self-test: PASS ({len(_CASES) + len(r6)} cases — rule 1 file scope, rule 2 modification, "
        "rule 3 named exports, rule 4 sibling imports, rule 5 transitive reach, rule 6 mount-effect writes — each with both controls)"
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
