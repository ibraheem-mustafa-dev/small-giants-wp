#!/usr/bin/env python3
"""
fanout-surface-ground-attrs.py — U-1 commit 4e fan-out of `surfaceBlur` /
`surfaceSaturate` (backdrop blur + saturate, the surface-ground vocabulary of
`includes/helpers-surface-ground.php`) across every block that mounts the
shared `<BackgroundPanel>` AND really renders through `SGS_Container_Wrapper`.

WHY A SCRIPT, NOT A HAND EDIT: more than 3 blocks (project rule, CLAUDE.md
"MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST"). Precedent:
`scripts/fanout-overlay-sibling-attrs.py` (D6/Step 8 overlay siblings) —
same triad, same self-test shape, same line-ending discipline.

WHAT MAKES THIS ONE DIFFERENT FROM THE PRECEDENT: the precedent's 8 target
files all share ONE indentation convention (2-tab key / 3-tab field) and are
all LF. This fan-out's target set has TWO indent conventions —
`multi-button/block.json` is 2-space indented, the other 7 are tab-indented —
AND two line-ending conventions — `hero/block.json` and
`physics-canvas/block.json` are CRLF, the other 6 are LF (confirmed by
reading the raw bytes, not assumed from the rest of the repo being LF). The
anchor is therefore a GENERIC `[ \t]+` indent capture plus an `\r?\n` line
ending, and both are read from each file's own `overlayGradient` attribute
block and reproduced exactly for the two new attributes, rather than
assuming tabs-and-LF everywhere.

TARGET SET (Bean's ruling, 2026-09-21 design doc, "4e"): a block qualifies
only when BOTH are true —
  (a) its `edit.js` (or a component it imports) mounts `<BackgroundPanel`
  (b) its `render.php` REALLY calls `SGS_Container_Wrapper::render(` — a
      comment merely mentioning the call does not count, so comments are
      stripped (`//` and `/* */`) before the source is searched.
Verified by hand before writing this script: container, cta-section, hero,
multi-button, physics-canvas, site-footer, site-header, trust-bar — exactly
the 8 the design doc names. `site-header` already declares both attributes
(it shipped them in an earlier sub-commit of this unit), so `--fix` reports
it SKIP rather than writing anything.

TRUST-BAR EXCLUSION GUARD: this repo is a shared worktree; another session
may be mid-edit on a target file. Before every run this script shells out to
`git status --short -- src/blocks/trust-bar` and, if it reports ANY
uncommitted change, EXCLUDES trust-bar from the active target set for that
run and prints the stated reason (never silently drops it — an omitted row
in `--survey`/`--check` output would look like trust-bar was never a
candidate at all).

WORDPRESS SILENTLY DISCARDS AN ATTRIBUTE A block.json DOES NOT DECLARE (in
the editor — D338/D704). A target block missing one of these two keys means
an operator's blur/saturate setting from the shared panel vanishes on reload
with no error and no failing test — that is the failure `--check` gates.

    --survey              census: which targets already have which attr
    --fix                 dry-run unified diff (add --apply to write)
    --check                gate: exits 1 when an ACTIVE target is missing
                           either attribute
    --self-test            fixture-driven regression + an OBSERVED negative
                           control (a disabled/broken rule is caught, not
                           just assumed to be)

@package SGS\\Blocks
"""

import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / 'src' / 'blocks'

# Measured by hand against the U-1 commit-4e design doc
# (`.claude/reports/2026-09-21-u1-c4-surface-ground-design.md`, "Bean's ruling
# on the shared background panel") and verified against the real tree:
# `<BackgroundPanel` mounted in edit.js AND `SGS_Container_Wrapper::render(`
# a real (non-comment) call in render.php. Fixed list, not re-derived at run
# time — reviewable and reproducible, matching the overlay-sibling precedent.
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

# The two new attributes, in insertion order. Each entry is the exact field
# list (order matters — it is what gets written). `surfaceBlur` carries a
# `default: ""` (a string attr with no default silently becomes `undefined`
# in the editor, which the `SgsLengthControl` value prop does not like);
# `surfaceSaturate` carries NO default, on purpose — B2 of the U-1 council
# (2026-09-21 design doc): "no new blur by default", and an explicit
# `default: 0` would be indistinguishable from an operator choosing 0
# (0 is a legal saturate value; F7 of that same council). Both descriptions
# are the task's own wording, generic ("this block"), not site-header's
# header-specific phrasing — this fan-out is a general capability.
NEW_ATTRS = [
    (
        'surfaceBlur',
        (
            ('type', 'string'),
            ('default', ''),
            (
                'description',
                'Backdrop blur: a single CSS length (for example 24px) that '
                'blurs whatever sits behind this block. Emitted by '
                'SGS_Container_Wrapper via includes/helpers-surface-ground.php; '
                'empty emits nothing.',
            ),
        ),
    ),
    (
        'surfaceSaturate',
        (
            ('type', 'number'),
            (
                'description',
                'Backdrop saturation as a whole-number percentage (for '
                'example 150), paired with surfaceBlur. Unset emits nothing; '
                '0 is a legal value.',
            ),
        ),
    ),
]

NEW_KEYS = [name for name, _fields in NEW_ATTRS]

# Blocks already known to declare both attrs before this script ever runs
# (site-header shipped them in an earlier U-1 sub-commit) — `--fix` reports
# these as SKIP, not as a target to touch.
_PRE_EXISTING = {'site-header'}

# Generic anchor: captures whatever indent whitespace (tabs OR spaces) the
# file itself uses around its `overlayGradient` attribute block, so the same
# regex works on both the tab-indented 7 and the space-indented multi-button
# without a per-file special case. Group 1 = the attribute-key indent level;
# group 2 = the field indent level (one level deeper). The closing brace is
# required to reuse group 1's exact text (`(?P=g1)`), which is what proves
# the match is a genuinely well-formed, still-closed JSON object and not a
# coincidental substring.
#
# `\r?\n` (not a bare `\n`): measured by hand across the 8 real files —
# `hero/block.json` and `physics-canvas/block.json` are CRLF, the other 6 are
# LF. A bare `\n` anchor silently refused to match on those two (proved
# during this fan-out's own build, not assumed), which would have looked
# like "file shape differs" when the real cause was the line ending. The
# insertion text is built with the SAME convention the match observed
# (`_line_ending_of`), so a CRLF file stays CRLF and an LF file stays LF.
_ANCHOR_RE = re.compile(
    r'(?P<g1>[ \t]+)"overlayGradient": \{\r?\n'
    r'(?P<g2>[ \t]+)"type": "string",\r?\n'
    r'(?P=g2)"default": ""\r?\n'
    r'(?P=g1)\},\r?\n'
)


def _line_ending_of(text: str) -> str:
    """'\r\n' if the file uses CRLF anywhere, else '\n'. All 8 real target
    files are consistently one or the other (verified by hand); this is not
    a per-line mixed-ending resolver."""
    return '\r\n' if '\r\n' in text else '\n'

# Block-comment / line-comment stripper for the render.php scan — a
# `// SGS_Container_Wrapper::render()` MENTION does not count as a real call
# (task instruction). Good enough for this repo's PHP (no `//` or `/* */`
# inside a string literal that also contains the exact call text — checked
# by hand against all 8 render.php files).
_PHP_COMMENT_RE = re.compile(r'/\*.*?\*/|//[^\n]*', re.DOTALL)

_WRAPPER_CALL_RE = re.compile(r'SGS_Container_Wrapper::render\s*\(')
_BACKGROUND_PANEL_RE = re.compile(r'<BackgroundPanel\b')


def _read(path: Path) -> str:
    # newline='' — never let Python translate the file's own line endings
    # (this repo has been bitten before by a whole-file diff that was really
    # just a silent CRLF<->LF normalisation).
    with open(path, 'r', encoding='utf-8', newline='') as fh:
        return fh.read()


def _write(path: Path, text: str) -> None:
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)


# --------------------------------------------------------------------------
# Trust-bar shared-worktree guard
# --------------------------------------------------------------------------

def trust_bar_exclusion_reason() -> str | None:
    """None when trust-bar's tree is clean and safe to touch; otherwise the
    stated reason to exclude it from THIS run's active target set."""
    try:
        result = subprocess.run(
            ['git', 'status', '--short', '--', 'src/blocks/trust-bar'],
            cwd=str(PLUGIN_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        # Cannot verify clean vs dirty at all — refuse to guess; exclude and
        # say why, rather than risk touching another session's WIP.
        return f'could not run git status ({exc}) — excluded rather than risk a collision'

    if result.returncode != 0:
        return f'git status exited {result.returncode} — excluded rather than risk a collision'

    dirty = result.stdout.strip()
    if dirty:
        return (
            'src/blocks/trust-bar has uncommitted changes from another session '
            f'(git status --short):\n{dirty}\n'
            '  -> excluded from this run per task-4e-brief.md instruction'
        )
    return None


def active_target_blocks() -> tuple[list, str | None]:
    """(active list, exclusion note or None) — trust-bar dropped + explained
    when its tree is dirty, present otherwise."""
    reason = trust_bar_exclusion_reason()
    if reason is None:
        return list(TARGET_BLOCKS), None
    return [b for b in TARGET_BLOCKS if b != 'trust-bar'], reason


# --------------------------------------------------------------------------
# Qualification check (independent of the fixed TARGET_BLOCKS list — used to
# PROVE the survey list is still correct, not just asserted)
# --------------------------------------------------------------------------

def mounts_background_panel(block_dir: Path) -> bool:
    edit_js = block_dir / 'edit.js'
    if edit_js.exists() and _BACKGROUND_PANEL_RE.search(_read(edit_js)):
        return True
    # A block may mount it via a component it imports rather than inline —
    # scan every .js file under the block's own directory (components/ etc.)
    for js_file in block_dir.rglob('*.js'):
        try:
            if _BACKGROUND_PANEL_RE.search(_read(js_file)):
                return True
        except OSError:
            continue
    return False


def calls_wrapper_render(block_dir: Path) -> bool:
    render_php = block_dir / 'render.php'
    if not render_php.exists():
        return False
    stripped = _PHP_COMMENT_RE.sub('', _read(render_php))
    return bool(_WRAPPER_CALL_RE.search(stripped))


def qualifies(block: str) -> bool:
    block_dir = BLOCKS_DIR / block
    return block_dir.exists() and mounts_background_panel(block_dir) and calls_wrapper_render(block_dir)


# --------------------------------------------------------------------------
# block.json inspection + fix
# --------------------------------------------------------------------------

def declared_keys(path: Path) -> set:
    try:
        data = json.loads(_read(path))
    except (json.JSONDecodeError, OSError):
        return set()
    attrs = data.get('attributes', {})
    if not isinstance(attrs, dict):
        return set()
    return {k for k in NEW_KEYS if k in attrs}


def missing_keys(path: Path) -> list:
    have = declared_keys(path)
    return [k for k in NEW_KEYS if k not in have]


def _attr_block_text(name: str, fields: tuple, key_indent: str, field_indent: str, newline: str) -> str:
    lines = [f'{key_indent}"{name}": {{']
    for i, (fkey, fval) in enumerate(fields):
        comma = ',' if i < len(fields) - 1 else ''
        lines.append(f'{field_indent}"{fkey}": {json.dumps(fval)}{comma}')
    lines.append(f'{key_indent}}},')
    return newline.join(lines) + newline


def _insertion_text(key_indent: str, field_indent: str, newline: str) -> str:
    return ''.join(
        _attr_block_text(name, fields, key_indent, field_indent, newline)
        for name, fields in NEW_ATTRS
    )


def compute_fixed_text(original: str) -> str | None:
    """New file text with both attrs inserted right after `overlayGradient`,
    using THAT file's own indent (tabs or spaces) AND its own line ending
    (CRLF or LF) — or None if the anchor is not found (refuse rather than
    guess at a differently-shaped file)."""
    match = _ANCHOR_RE.search(original)
    if not match:
        return None
    key_indent = match.group('g1')
    field_indent = match.group('g2')
    newline = _line_ending_of(original)
    insertion = _insertion_text(key_indent, field_indent, newline)
    return original[: match.end()] + insertion + original[match.end():]


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------

def cmd_survey() -> int:
    active, exclusion_note = active_target_blocks()
    if exclusion_note:
        print(f'NOTE: {exclusion_note}')
        print()

    print(f'{"block":<16} | qualifies? | {" | ".join(k for k in NEW_KEYS)}')
    any_missing = False
    for block in TARGET_BLOCKS:
        if block not in active:
            print(f'{block:<16} | EXCLUDED (see note above)')
            continue
        path = BLOCKS_DIR / block / 'block.json'
        qual = qualifies(block)
        if not qual:
            print(f'{block:<16} | NO — does not mount BackgroundPanel + call the wrapper (survey list may be stale)')
            any_missing = True
            continue
        if not path.exists():
            print(f'{block:<16} | yes        | MISSING FILE')
            any_missing = True
            continue
        have = declared_keys(path)
        row = ' | '.join('yes'.ljust(len(k)) if k in have else 'no'.ljust(len(k)) for k in NEW_KEYS)
        print(f'{block:<16} | yes        | {row}')
        if len(have) != len(NEW_KEYS):
            any_missing = True
    print()
    print('yes = attribute already declared in block.json; no = not yet declared.')
    return 0 if not any_missing else 1


def cmd_fix(apply: bool) -> int:
    active, exclusion_note = active_target_blocks()
    if exclusion_note:
        print(f'NOTE: {exclusion_note}')
        print()

    changed = 0
    refused = 0
    for block in TARGET_BLOCKS:
        if block not in active:
            print(f'EXCLUDED {block}: see note above (shared worktree, another session\'s uncommitted work)')
            continue

        if not qualifies(block):
            print(f'REFUSED {block}: no longer qualifies (BackgroundPanel mount / wrapper call not found) — survey list may be stale, will not guess')
            refused += 1
            continue

        path = BLOCKS_DIR / block / 'block.json'
        if not path.exists():
            print(f'REFUSED {block}: block.json not found at {path}')
            refused += 1
            continue

        if block in _PRE_EXISTING and not missing_keys(path):
            print(f'SKIP    {block}: already declares both attrs (shipped in an earlier U-1 sub-commit)')
            continue

        original = _read(path)
        already_has_all = not missing_keys(path)
        if already_has_all:
            print(f'SKIP    {block}: all {len(NEW_KEYS)} surface-ground attrs already declared')
            continue

        new_text = compute_fixed_text(original)
        if new_text is None:
            print(f'REFUSED {block}: anchor ("overlayGradient" attribute block) not found — file shape differs, will not guess')
            refused += 1
            continue

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
            print(f'APPLIED {block}: +{len(NEW_KEYS)} attributes')

    print()
    print(f'{"Applied" if apply else "Would change"}: {changed}   Refused: {refused}')
    return 1 if refused else 0


def cmd_check() -> int:
    active, exclusion_note = active_target_blocks()
    if exclusion_note:
        print(f'NOTE: {exclusion_note}')
        print()

    failures = []
    for block in active:
        path = BLOCKS_DIR / block / 'block.json'
        if not path.exists():
            failures.append((block, ['<file missing>']))
            continue
        miss = missing_keys(path)
        if miss:
            failures.append((block, miss))

    if not failures:
        print(f'PASS — all {len(active)} active blocks declare both surface-ground attrs.')
        return 0

    print('FAIL — missing surface-ground attributes:')
    for block, miss in failures:
        print(f'  {block}: missing {miss}')
    return 1


# --------------------------------------------------------------------------
# Self-test — triad regression + an OBSERVED negative control, for BOTH
# indentation conventions this fan-out actually has to handle
# --------------------------------------------------------------------------

_TAB_FIXTURE = (
    '{\n'
    '\t"attributes": {\n'
    '\t\t"backgroundOverlayColour": {\n'
    '\t\t\t"type": "string"\n'
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

_SPACE_FIXTURE = (
    '{\n'
    '  "attributes": {\n'
    '    "backgroundOverlayColour": {\n'
    '      "type": "string"\n'
    '    },\n'
    '    "overlayGradient": {\n'
    '      "type": "string",\n'
    '      "default": ""\n'
    '    },\n'
    '    "bgVideo": {\n'
    '      "type": "object"\n'
    '    }\n'
    '  }\n'
    '}\n'
)


def _check_single_file(path: Path):
    return missing_keys(path)


def _run_fixture_case(label: str, fixture: str, passed_ref: list, failed_ref: list) -> None:
    def check(sub_label, condition):
        full = f'{label}: {sub_label}'
        if condition:
            print(f'  PASS: {full}')
            passed_ref[0] += 1
        else:
            print(f'  FAIL: {full}')
            failed_ref[0] += 1

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / 'block.json'

        # --- must-flag case: fixture starts missing both new keys. ---
        _write(tmp_path, fixture)
        before_missing = _check_single_file(tmp_path)
        check('fixture starts missing both new keys', len(before_missing) == len(NEW_KEYS))

        # --- fix computes valid JSON with both keys, indent preserved. ---
        fixed_text = compute_fixed_text(fixture)
        check('compute_fixed_text() returns a result', fixed_text is not None)
        try:
            parsed = json.loads(fixed_text)
            valid_json = True
        except json.JSONDecodeError:
            parsed = {}
            valid_json = False
        check('fixed text is valid JSON', valid_json)
        attrs = parsed.get('attributes', {})
        check('fixed text declares both new keys', all(k in attrs for k in NEW_KEYS))
        check(
            'original attrs (bgVideo, backgroundOverlayColour) preserved',
            'bgVideo' in attrs and 'backgroundOverlayColour' in attrs,
        )
        check(
            'surfaceSaturate has NO default (0 must stay distinguishable from unset — B2/F7)',
            'default' not in attrs.get('surfaceSaturate', {'default': None}),
        )

        # --- must-pass case: after fix, --check-equivalent reports 0 missing. ---
        _write(tmp_path, fixed_text)
        after_missing = _check_single_file(tmp_path)
        check('after fix: 0 missing (must-pass case)', len(after_missing) == 0)

        # --- OBSERVED negative control: a disabled/broken rule IS caught. ---
        broken = json.loads(fixed_text)
        del broken['attributes'][NEW_KEYS[0]]
        broken_text = json.dumps(broken, indent='\t' if '\t' in fixture else 2)
        _write(tmp_path, broken_text)
        red_result = _check_single_file(tmp_path)
        print(f'  RED  run ({label}) -> missing_keys() = {red_result}')
        check(f'negative control (missing {NEW_KEYS[0]}) is DETECTED as missing', NEW_KEYS[0] in red_result)

        _write(tmp_path, fixed_text)
        green_result = _check_single_file(tmp_path)
        print(f'  GREEN run ({label}) -> missing_keys() = {green_result}')
        check('restored fixture is DETECTED as complete (green)', len(green_result) == 0)


def cmd_self_test() -> int:
    passed = [0]
    failed = [0]

    def check(label, condition):
        if condition:
            print(f'  PASS: {label}')
            passed[0] += 1
        else:
            print(f'  FAIL: {label}')
            failed[0] += 1

    print('--- tab-indented fixture (matches 7 of the 8 real target files) ---')
    _run_fixture_case('tab-indent', _TAB_FIXTURE, passed, failed)

    print()
    print('--- space-indented fixture (matches multi-button/block.json) ---')
    _run_fixture_case('space-indent', _SPACE_FIXTURE, passed, failed)

    print()
    # CRLF fixture — matches hero/block.json + physics-canvas/block.json,
    # BOTH confirmed CRLF by hand (`b'\r\n' in <raw bytes>`) while the other
    # 6 target files are LF. The first version of this script's anchor was
    # LF-only and silently REFUSED both CRLF files ("anchor not found"),
    # which read exactly like "file shape differs" — the negative control
    # below is what a run against these two files actually exercises.
    print('--- CRLF fixture (matches hero + physics-canvas block.json) ---')
    _run_fixture_case('crlf', _TAB_FIXTURE.replace('\n', '\r\n'), passed, failed)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp) / 'block.json'
        crlf_fixture = _TAB_FIXTURE.replace('\n', '\r\n')
        crlf_fixed = compute_fixed_text(crlf_fixture)
        check(
            'CRLF fixture: fixed text stays ALL-CRLF (no stray LF-only lines introduced)',
            crlf_fixed is not None and '\r\n' in crlf_fixed and _line_ending_of(crlf_fixed) == '\r\n'
            and crlf_fixed.replace('\r\n', '').count('\n') == 0,
        )
        _write(tmp_path, crlf_fixture)
        reread = _read(tmp_path)
        check(
            'CRLF fixture round-trips with CRLF intact',
            '\r\n' in reread and reread.count('\r\n') == crlf_fixture.count('\r\n'),
        )

    print()
    print('--- anchor refuses rather than guesses when absent ---')
    no_anchor_text = '{\n\t"attributes": {\n\t\t"foo": { "type": "string" }\n\t}\n}\n'
    check('missing anchor refuses (returns None) rather than guessing', compute_fixed_text(no_anchor_text) is None)

    print()
    print('--- self-consistency: TARGET_BLOCKS matches the qualification rule on the real tree ---')
    for block in TARGET_BLOCKS:
        block_dir = BLOCKS_DIR / block
        if not block_dir.exists():
            check(f'{block}: directory exists', False)
            continue
        check(f'{block}: qualifies() confirms BackgroundPanel + wrapper call', qualifies(block))

    print()
    print(f'{passed[0]} passed, {failed[0]} failed')
    return 0 if failed[0] == 0 else 1


# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--survey', action='store_true', help='Census: which targets already have which attr')
    group.add_argument('--fix', action='store_true', help='Dry-run diff (add --apply to write)')
    group.add_argument('--check', action='store_true', help='Gate: exit 1 if any ACTIVE target is missing an attr')
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
