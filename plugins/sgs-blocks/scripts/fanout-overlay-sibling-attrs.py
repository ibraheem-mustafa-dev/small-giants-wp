#!/usr/bin/env python3
"""
fanout-overlay-sibling-attrs.py — D6 (hover + responsive-tier siblings) and
Step 8 (blend mode) fan-out for the overlay paint attrs
(`backgroundOverlayColour` / `overlayGradient`) across the eight blocks that
mount `<BackgroundPanel>`.

WHY A SCRIPT, NOT A HAND EDIT (D542): this touches 8 block.json files with one
fixed key list — the project rule is that anything over ~3 blocks gets a
detector first, not an edit. The triad:

    --survey              census: which blocks already have which sibling
    --fix                 dry-run unified diff (no write)
    --fix --apply         write
    --check                gate: exits 1 when a target block is missing a
                           declared sibling
    --self-test            builds a fixture, breaks it on purpose, OBSERVES
                           --check go red, restores it, OBSERVES --check go
                           green again. Prints both outputs.

WORDPRESS SILENTLY DISCARDS AN ATTRIBUTE A block.json DOES NOT DECLARE (in the
editor — see D338/D704). So this is not cosmetic: a block missing a sibling
here means an operator's hover/tier/blend setting vanishes on reload with no
error and no failing test.

Anchor strategy: the new keys are inserted immediately after the
`overlayGradient` attribute definition — present, identically shaped, in all
8 target files (verified by hand before writing this script; see
`_ANCHOR_RE`). Refuses to write (never emits invalid JSON) if the anchor is
missing or the resulting file fails to json.loads() cleanly. Preserves each
file's existing line-ending convention — opens with `newline=''` so Python
never silently normalises CRLF<->LF (this repo has been bitten by exactly
that: a whole-file diff from a line-ending change looks like every line
changed, per the `preserve-line-endings` lesson).

@package SGS\\Blocks
"""

import argparse
import difflib
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

BLOCKS_DIR = Path(__file__).resolve().parent.parent / 'src' / 'blocks'

# Measured 2026-08-22 by grepping every edit.js under src/blocks for a literal
# `<BackgroundPanel` JSX mount (not a comment mention referencing it). Exactly
# these 8 files matched. Fixed list, not derived at run time — a block.json
# fan-out must be reviewable and reproducible, not re-discovered per run.
TARGET_BLOCKS = [
    'container',
    'cta-section',
    'hero',
    'multi-button',
    'physics-canvas',
    'site-footer',
    'site-header',
    'trust-bar',
]

# Hover + responsive-tier siblings for BOTH overlay paint attrs (D6). Ordered
# so a diff reads "colour hover/tablet/mobile, then gradient hover/tablet/
# mobile" — grouped by base attr, not alphabetically.
# RETARGETED 2026-08-25 (D776) - the tier axis moved OFF colour and ONTO opacity at D739.
# This list previously demanded backgroundOverlayColour{Tablet,Mobile} and
# overlayGradient{Tablet,Mobile}. D739 DELETED all four, deliberately: a heavier scrim on a
# small screen is an OPACITY change, not a different hue, and crossing tier x state gave one
# property three axes living in two different places on screen. Measured 2026-08-25 across
# all 8 target blocks: colour/gradient tiers 0/8, opacity tiers 8/8, hover 8/8, blend 8/8.
#
# RETARGETED AGAIN 2026-09-06 (tier-object migration) - backgroundOverlayOpacity itself
# folded into a single TIER OBJECT {desktop,tablet,mobile}; backgroundOverlayOpacityTablet/
# Mobile are no longer declared by any block.json. Same STOP as D776: --check was about to go
# RED against an OBSOLETE contract, and --fix --apply would have REINTRODUCED the exact two
# scalar sibling attrs this session just folded away. Only the hover siblings (untouched by
# this migration) remain required here.
#
# Each key carries its own SHAPE. Colour/gradient siblings are strings defaulting to empty.
SIBLING_SHAPES = {
    'backgroundOverlayColourHover': ('string', ''),
    'overlayGradientHover': ('string', ''),
}

SIBLING_KEYS = list(SIBLING_SHAPES)

BLEND_MODE_KEY = 'backgroundOverlayBlendMode'

# A constrained enum, not a free string (task instruction) — the useful
# subset of CSS mix-blend-mode for a paint-over-media overlay. Excludes the
# "component" family (hue/saturation/color/luminosity) and exotic values
# that read as bugs on a marketing site rather than a deliberate effect.
BLEND_MODE_VALUES = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'soft-light',
    'hard-light',
    'difference',
    'exclusion',
]

ALL_NEW_KEYS = SIBLING_KEYS + [BLEND_MODE_KEY]

# The exact, verified-identical shape of the `overlayGradient` attribute
# definition in all 8 target files (2-tab key indent, 3-tab field indent, LF
# line endings). Used both as the insertion anchor and as the negative-control
# fixture body in --self-test.
_ANCHOR_RE = re.compile(
    r'(\t\t"overlayGradient": \{\n'
    r'\t\t\t"type": "string",\n'
    r'\t\t\t"default": ""\n'
    r'\t\t\},\n)'
)


def _sibling_block(key: str) -> str:
    """One attribute definition, shaped per SIBLING_SHAPES.

    A `default` is emitted ONLY when the shape declares one. The opacity tiers declare
    none on purpose - emitting a null default on a number attr returns 400 from every
    ServerSideRender preview for that block."""
    attr_type, default = SIBLING_SHAPES[key]
    if default is None:
        return f'\t\t\"{key}\": {{\n\t\t\t\"type\": \"{attr_type}\"\n\t\t}},\n'
    return (
        f'\t\t\"{key}\": {{\n\t\t\t\"type\": \"{attr_type}\",\n'
        f'\t\t\t\"default\": {json.dumps(default)}\n\t\t}},\n'
    )

def _blend_mode_block() -> str:
    enum_lines = ',\n'.join(f'\t\t\t\t"{v}"' for v in BLEND_MODE_VALUES)
    return (
        f'\t\t"{BLEND_MODE_KEY}": {{\n'
        f'\t\t\t"type": "string",\n'
        f'\t\t\t"default": "normal",\n'
        f'\t\t\t"enum": [\n'
        f'{enum_lines}\n'
        f'\t\t\t]\n'
        f'\t\t}},\n'
    )


def _insertion_text() -> str:
    return ''.join(_sibling_block(k) for k in SIBLING_KEYS) + _blend_mode_block()


def _read(path: Path) -> str:
    # newline='' — never let Python translate the file's own line endings.
    with open(path, 'r', encoding='utf-8', newline='') as fh:
        return fh.read()


def _write(path: Path, text: str) -> None:
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)


def declared_keys(path: Path) -> set:
    """Which of ALL_NEW_KEYS this block.json already declares (parsed, not regex)."""
    try:
        data = json.loads(_read(path))
    except (json.JSONDecodeError, OSError):
        return set()
    attrs = data.get('attributes', {})
    if not isinstance(attrs, dict):
        return set()
    return {k for k in ALL_NEW_KEYS if k in attrs}


def missing_keys(path: Path) -> list:
    have = declared_keys(path)
    return [k for k in ALL_NEW_KEYS if k not in have]


def compute_fixed_text(original: str) -> str | None:
    """Return the new file text with siblings inserted, or None if the anchor
    is not found (refuse rather than guess)."""
    if not _ANCHOR_RE.search(original):
        return None
    return _ANCHOR_RE.sub(lambda m: m.group(1) + _insertion_text(), original, count=1)


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------

def cmd_survey() -> int:
    print(f'{"block":<16} | {" | ".join(k[:12] for k in ALL_NEW_KEYS)}')
    any_missing = False
    for block in TARGET_BLOCKS:
        path = BLOCKS_DIR / block / 'block.json'
        if not path.exists():
            print(f'{block:<16} | MISSING FILE')
            any_missing = True
            continue
        have = declared_keys(path)
        row = ' | '.join('yes'.ljust(12) if k in have else 'no'.ljust(12) for k in ALL_NEW_KEYS)
        print(f'{block:<16} | {row}')
        if len(have) != len(ALL_NEW_KEYS):
            any_missing = True
    print()
    print('yes = attribute already declared in block.json; no = not yet declared.')
    return 0 if not any_missing else 1


def cmd_fix(apply: bool) -> int:
    changed = 0
    refused = 0
    for block in TARGET_BLOCKS:
        path = BLOCKS_DIR / block / 'block.json'
        if not path.exists():
            print(f'REFUSED {block}: block.json not found at {path}')
            refused += 1
            continue

        original = _read(path)
        already_has_all = not missing_keys(path)
        if already_has_all:
            print(f'SKIP    {block}: all {len(ALL_NEW_KEYS)} siblings already declared')
            continue

        new_text = compute_fixed_text(original)
        if new_text is None:
            print(f'REFUSED {block}: anchor ("overlayGradient" attribute block) not found — '
                  f'file shape differs from the verified 8, will not guess')
            refused += 1
            continue

        # Refuse to write anything that would not parse as JSON.
        try:
            json.loads(new_text)
        except json.JSONDecodeError as exc:
            print(f'REFUSED {block}: computed edit would not be valid JSON ({exc}) — not writing')
            refused += 1
            continue

        diff = difflib.unified_diff(
            original.splitlines(keepends=True),
            new_text.splitlines(keepends=True),
            fromfile=f'{block}/block.json (before)',
            tofile=f'{block}/block.json (after)',
        )
        sys.stdout.writelines(diff)
        changed += 1

        if apply:
            _write(path, new_text)
            print(f'APPLIED {block}: +{len(ALL_NEW_KEYS)} attributes')

    print()
    print(f'{"Applied" if apply else "Would change"}: {changed}   Refused: {refused}')
    return 1 if refused else 0


def cmd_check() -> int:
    failures = []
    for block in TARGET_BLOCKS:
        path = BLOCKS_DIR / block / 'block.json'
        if not path.exists():
            failures.append((block, ['<file missing>']))
            continue
        miss = missing_keys(path)
        if miss:
            failures.append((block, miss))

    if not failures:
        print(f'PASS — all {len(TARGET_BLOCKS)} blocks declare all {len(ALL_NEW_KEYS)} overlay siblings.')
        return 0

    print('FAIL — missing overlay sibling attributes:')
    for block, miss in failures:
        print(f'  {block}: missing {miss}')
    return 1


# --------------------------------------------------------------------------
# Self-test — triad regression + an OBSERVED negative control
# --------------------------------------------------------------------------

_FIXTURE_BODY = (
    '{\n'
    '\t"attributes": {\n'
    '\t\t"backgroundOverlayColour": {\n'
    '\t\t\t"type": "string"\n'
    '\t\t},\n'
    '\t\t"backgroundOverlayOpacity": {\n'
    '\t\t\t"type": "number",\n'
    '\t\t\t"default": 30\n'
    '\t\t},\n'
    '\t\t"overlayGradient": {\n'
    '\t\t\t"type": "string",\n'
    '\t\t\t"default": ""\n'
    '\t\t},\n'
    '\t\t"bgVideo": {\n'
    '\t\t\t"type": "object"\n'
    '\t\t}\n'
    '\t}\n'
    '}\n'
)


def _check_single_file(path: Path):
    """Same logic as cmd_check but scoped to one arbitrary path — used by
    --self-test so the negative control never touches the real 8 files."""
    return missing_keys(path)


def cmd_self_test() -> int:
    passed = 0
    failed = 0

    def check(label, condition):
        nonlocal passed, failed
        if condition:
            print(f'  PASS: {label}')
            passed += 1
        else:
            print(f'  FAIL: {label}')
            failed += 1

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / 'block.json'

        # --- 1. Anchor detection on the known fixture shape. ---
        _write(tmp_path, _FIXTURE_BODY)
        check('anchor found in fixture', _ANCHOR_RE.search(_FIXTURE_BODY) is not None)

        # --- 2. Before the fix: all 7 siblings are missing. ---
        before_missing = _check_single_file(tmp_path)
        check('fixture starts missing all 7 new keys', len(before_missing) == len(ALL_NEW_KEYS))

        # --- 3. Apply the fix; result must be valid JSON with all keys. ---
        fixed_text = compute_fixed_text(_FIXTURE_BODY)
        check('compute_fixed_text() returns a result', fixed_text is not None)
        try:
            parsed = json.loads(fixed_text)
            valid_json = True
        except json.JSONDecodeError:
            parsed = {}
            valid_json = False
        check('fixed text is valid JSON', valid_json)
        attrs = parsed.get('attributes', {})
        check(
            'fixed text declares all 7 new keys',
            all(k in attrs for k in ALL_NEW_KEYS),
        )
        # Original keys must survive untouched (no destructive rewrite).
        check(
            'original attrs (bgVideo, backgroundOverlayOpacity) preserved',
            'bgVideo' in attrs and 'backgroundOverlayOpacity' in attrs,
        )

        _write(tmp_path, fixed_text)
        after_missing = _check_single_file(tmp_path)
        check('after fix: --check-equivalent reports 0 missing', len(after_missing) == 0)

        # --- 4. Refuse-rather-than-guess: anchor absent -> None, no write. ---
        no_anchor_text = '{\n\t"attributes": {\n\t\t"foo": { "type": "string" }\n\t}\n}\n'
        check(
            'missing anchor refuses (returns None) rather than guessing',
            compute_fixed_text(no_anchor_text) is None,
        )

        # --- 5. THE OBSERVED NEGATIVE CONTROL ---------------------------------
        # Construct a block that is missing exactly ONE declared sibling
        # (as if a future edit added 6 of 7 by hand) and prove --check's
        # underlying logic actually goes red for it — not just that it CAN.
        print()
        print('  --- negative control: observe --check go RED, then GREEN ---')
        broken = json.loads(fixed_text)
        removed_key = SIBLING_KEYS[0]
        del broken['attributes'][removed_key]
        broken_text = json.dumps(broken, indent='\t')
        _write(tmp_path, broken_text)
        red_result = _check_single_file(tmp_path)
        print(f'  RED  run  -> missing_keys() = {red_result}')
        check(
            f'negative control (missing {removed_key}) is DETECTED as missing',
            removed_key in red_result,
        )

        # Restore and prove it goes green again — a control that only ever
        # fails is as useless as one that only ever passes.
        _write(tmp_path, fixed_text)
        green_result = _check_single_file(tmp_path)
        print(f'  GREEN run -> missing_keys() = {green_result}')
        check('restored fixture is DETECTED as complete (green)', len(green_result) == 0)

        # --- 6. Line-ending preservation. ---
        crlf_fixture = _FIXTURE_BODY.replace('\n', '\r\n')
        _write(tmp_path, crlf_fixture)
        reread = _read(tmp_path)
        check('CRLF fixture round-trips with CRLF intact', '\r\n' in reread and reread.count('\r\n') == crlf_fixture.count('\r\n'))
        crlf_fixed = compute_fixed_text(crlf_fixture)
        # The anchor regex is LF-specific by design (all 8 real files are LF —
        # verified before writing this script), so a CRLF file correctly
        # fails to match and the tool refuses rather than mangling it.
        check('CRLF file (unsupported shape) is REFUSED, not silently corrupted', crlf_fixed is None)

    print()
    print(f'{passed} passed, {failed} failed')
    return 0 if failed == 0 else 1


# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--survey', action='store_true', help='Census: which blocks have which sibling attrs')
    group.add_argument('--fix', action='store_true', help='Dry-run diff (add --apply to write)')
    group.add_argument('--check', action='store_true', help='Gate: exit 1 if any block is missing a sibling')
    group.add_argument('--self-test', action='store_true', help='Run the regression suite + observed negative control')
    parser.add_argument('--apply', action='store_true', help='With --fix: actually write the files')
    args = parser.parse_args()

    if args.survey:
        return cmd_survey()
    if args.fix:
        return cmd_fix(apply=args.apply)
    if args.check:
        return cmd_check()
    if args.self_test:
        return cmd_self_test()
    return 1


if __name__ == '__main__':
    sys.exit(main())
