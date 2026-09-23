#!/usr/bin/env python3
"""
fanout-shadow-lift-attr.py — adds the `shadowLiftOnHover` block-level switch (boolean,
default true) to every block that DRAWS a shadow, per design H5
(`.claude/reports/2026-09-23-shadow-hover-lift-design.md`, task lift-2 §3).

WHY A SCRIPT, NOT A HAND EDIT: more than 3 blocks (project rule, CLAUDE.md "MORE THAN 3
BLOCKS? BUILD THE DETECTOR FIRST"). Precedent: `scripts/fanout-surface-ground-attrs.py`
(same triad, same self-test shape, added-lines-only discipline, `ensure_ascii=True`).

TARGET SET — every block confirmed (by hand, against the real block.json + render.php, not
guessed) to declare a real shadow-shape attribute (`boxShadow`/`cardShadow`/`tileShadow`/
`shadow`/`iconCircleShadow`/`badgeImageShadow`/`gridItemShadow`, or the native
`supports.shadow` style-engine key) AND actually emit a `box-shadow` declaration for it in
render.php: before-after, brand-strip, button, card-grid, container, cta-section, heading,
hero, info-box, media, physics-canvas, post-grid, process-steps, quote, site-footer,
site-header, team-member, testimonial, text, timeline, trust-bar.

EXCLUDED ON PURPOSE:
  - `google-reviews` — task lift-2 brief forbids touching `src/blocks/google-reviews/`.
  - `mega-panel`, `nav-drawer` — overlay surfaces (design H5). They also draw a shadow, but
    get `supports.sgs.shadowLift: false` in block.json INSTEAD of this per-instance switch —
    a toggle that can never do anything (the type-level gate already forces the lift off) is
    worse UX than no toggle at all. See the overlay-flag edits made alongside this script.
  - `modal`, `cart` — overlay surfaces named in the brief; `cart` declares no shadow
    attribute of its own today so gets the block.json flag only, no attribute here.
  - `pricing-table`, `whatsapp-cta` — grepped for a shadow-shape attribute; neither declares
    one (the initial broad grep's "shadow" hits were false positives on unrelated keys).

    --survey     census: which targets already have shadowLiftOnHover
    --fix        dry-run unified diff (add --apply to write)
    --check      gate: exits 1 when an ACTIVE target is missing the attribute
    --self-test  fixture-driven regression + an OBSERVED negative control

@package SGS\\Blocks
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / 'src' / 'blocks'

TARGET_BLOCKS = [
    'before-after', 'brand-strip', 'button', 'card-grid', 'container', 'cta-section',
    'heading', 'hero', 'info-box', 'media', 'physics-canvas', 'post-grid', 'process-steps',
    'quote', 'site-footer', 'site-header', 'team-member', 'testimonial', 'text', 'timeline',
    'trust-bar',
]

ATTR_KEY = 'shadowLiftOnHover'

# Anchor: insert right after the opening `"attributes": {` line, matching each file's own
# indentation (read from the file, never assumed — see fanout-surface-ground-attrs.py note
# on why a generic indent capture beats a hardcoded one).
ATTRS_OPEN_RE = re.compile(r'("attributes"\s*:\s*\{)(\r?\n)([ \t]*)')


def block_json_path(slug: str) -> Path:
    return BLOCKS_DIR / slug / 'block.json'


def has_attr(text: str) -> bool:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return False
    return ATTR_KEY in (data.get('attributes') or {})


def build_insertion(indent: str, newline: str) -> str:
    field_indent = indent + '\t'
    return (
        f'{indent}"{ATTR_KEY}": {{{newline}'
        f'{field_indent}"type": "boolean",{newline}'
        f'{field_indent}"default": true{newline}'
        f'{indent}}},{newline}'
    )


def apply_fix(text: str) -> str | None:
    """Insert the attribute right after `"attributes": {`. Returns None when the anchor is
    not found or the attribute is already present (idempotent — --fix on an already-fixed
    file is a no-op diff, never a duplicate key)."""
    if has_attr(text):
        return None
    m = ATTRS_OPEN_RE.search(text)
    if not m:
        return None
    indent = m.group(3)
    newline = m.group(2)
    insertion = build_insertion(indent, newline)
    # Insert BEFORE the captured indent whitespace (group 3), not after it — the existing
    # whitespace belongs to the line that follows and must be left untouched for it.
    pos = m.start(3)
    return text[:pos] + insertion + text[pos:]


def active_targets() -> list[str]:
    return [slug for slug in TARGET_BLOCKS if block_json_path(slug).exists()]


def cmd_survey() -> int:
    rows = []
    for slug in active_targets():
        text = block_json_path(slug).read_text(encoding='utf-8')
        rows.append((slug, has_attr(text)))
    print(f'{"block":<18}{ATTR_KEY}')
    for slug, present in rows:
        print(f'{slug:<18}{"YES" if present else "NO"}')
    missing = [s for s, present in rows if not present]
    print(f'\n{len(rows)} targets, {len(missing)} missing: {", ".join(missing) if missing else "(none)"}')
    return 0


def cmd_fix(apply_: bool) -> int:
    changed = 0
    for slug in active_targets():
        path = block_json_path(slug)
        original = path.read_text(encoding='utf-8')
        fixed = apply_fix(original)
        if fixed is None:
            continue
        # Validate the result still parses as JSON before writing anything.
        json.loads(fixed)
        diff = ''.join(difflib.unified_diff(
            original.splitlines(keepends=True),
            fixed.splitlines(keepends=True),
            fromfile=str(path), tofile=str(path),
        ))
        print(diff)
        if apply_:
            path.write_text(fixed, encoding='utf-8', newline='')
        changed += 1
    print(f'\n{changed} file(s) {"written" if apply_ else "would change"}.')
    return 0


def cmd_check() -> int:
    missing = []
    for slug in active_targets():
        text = block_json_path(slug).read_text(encoding='utf-8')
        if not has_attr(text):
            missing.append(slug)
    if missing:
        print(f'FAIL: {len(missing)} target block(s) missing {ATTR_KEY}: {", ".join(missing)}')
        return 1
    print(f'PASS: all {len(active_targets())} target blocks declare {ATTR_KEY}.')
    return 0


def cmd_self_test() -> int:
    failures = []

    def check(label, cond):
        if not cond:
            failures.append(label)

    # --- fixture: a minimal block.json, tab-indented, LF -------------------------------
    fixture = (
        '{\n'
        '\t"name": "sgs/fixture",\n'
        '\t"attributes": {\n'
        '\t\t"boxShadow": {\n'
        '\t\t\t"type": "string",\n'
        '\t\t\t"default": ""\n'
        '\t\t}\n'
        '\t}\n'
        '}\n'
    )
    check('fixture starts without the attribute', not has_attr(fixture))
    fixed = apply_fix(fixture)
    check('apply_fix returns a change for a missing attribute', fixed is not None)
    check('fixed text parses as JSON', json.loads(fixed) is not None)
    check('fixed text now has the attribute', has_attr(fixed))
    parsed = json.loads(fixed)
    check('attribute is boolean/true default', parsed['attributes'][ATTR_KEY] == {'type': 'boolean', 'default': True})
    check('original boxShadow attribute untouched', parsed['attributes']['boxShadow'] == {'type': 'string', 'default': ''})

    # --- idempotency: re-running on already-fixed text is a no-op ----------------------
    second_pass = apply_fix(fixed)
    check('re-applying to an already-fixed file is a no-op (returns None)', second_pass is None)

    # --- MUST-FLAG / MUST-PASS pair -----------------------------------------------------
    check('MUST-FLAG: fixture without the attribute fails has_attr()', not has_attr(fixture))
    check('MUST-PASS: fixture with the attribute passes has_attr()', has_attr(fixed))

    # --- disabled-rule negative control: prove the check can actually fail -------------
    # A file missing the "attributes" key entirely (malformed/pre-1.0 block.json) — the
    # anchor regex must not find an insertion point, and has_attr() must not crash.
    no_attrs_block = '{\n\t"name": "sgs/no-attrs"\n}\n'
    check('block.json with no attributes key: has_attr() is False, not a crash', not has_attr(no_attrs_block))
    check('block.json with no attributes key: apply_fix() finds no anchor', apply_fix(no_attrs_block) is None)
    # Prove the gate CAN go red: simulate a target missing the attribute and confirm
    # has_attr() reports it missing (the same check cmd_check() relies on).
    would_still_fail = not has_attr(fixture)
    check('negative control: an unfixed target is correctly reported as failing', would_still_fail)

    if failures:
        print('SELF-TEST FAILED:')
        for f in failures:
            print(f'  - {f}')
        return 1
    print(f'SELF-TEST PASSED ({7 + 5} assertions).')
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--survey', action='store_true')
    group.add_argument('--fix', action='store_true')
    group.add_argument('--check', action='store_true')
    group.add_argument('--self-test', action='store_true')
    parser.add_argument('--apply', action='store_true', help='with --fix, write changes (default: dry-run diff only)')
    args = parser.parse_args(argv)

    if args.self_test:
        return cmd_self_test()
    if args.check:
        return cmd_check()
    if args.fix:
        return cmd_fix(args.apply)
    return cmd_survey()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
