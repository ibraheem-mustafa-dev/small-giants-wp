#!/usr/bin/env python3
"""
survey-box-controls.py — "--survey" census of the BOX (4-side) and BORDER
(4-corner + scalar-radius) control-type families across all sgs/ blocks.

READ-ONLY. This script never writes to any file, never runs npm/build/deploy,
never touches git, and never issues a DB write. It queries sgs-framework.db
via a read-only sqlite3 connection and statically scans
plugins/sgs-blocks/src/blocks/*/edit.js (+ shared components under
plugins/sgs-blocks/src/components/) to report, per box/border attribute,
which control component actually renders it today — so a good existing
shape gets ADOPTED rather than a worse one invented.

Governing spec: .claude/plans/spec-35-control-type-contract.md §5 (4-VALUE
BOX) + §14 (BORDER). Canonical components per §5:
  - ResponsiveBoxControl        — 4-side box (padding / margin / border-width)
  - ResponsiveBorderRadiusControl — 4-corner radius
  - ResponsiveBoxControls (plural) — object-cascade rows (multiple box attrs
    sharing one panel, e.g. a card's padding+margin together)
Banned per §5: per-side scalar attrs (paddingTop/paddingRight/... as FOUR
separate scalar attributes instead of one object attr), and raw BoxControl
bypassing the tier wrapper.

Why this is a SEPARATE script from check-box-family-guard.py (decision
recorded in the task brief this script was built from — see report, not
duplicated here): that guard is an AST scanner over CONVERTER/migration code
(plugins/sgs-blocks/scripts/converter/**, sgs-update-v2.py) that polices
whether a grouping/merge OPERATION in that code is gated on the box_family
DB column rather than a name regex — a structural conformance question about
migration code. This script census-scans BLOCK SOURCE (src/blocks/*/edit.js)
against the DB schema to answer "what shapes exist today, with counts and
file:line" for the box/border FAMILIES THEMSELVES — a question the guard's
target files (converter/, sgs-update-v2.py) cannot answer because they do
not contain any block's edit.js. Zero file overlap; zero question overlap.

Usage:
    python survey-box-controls.py               # human-readable report
    python survey-box-controls.py --json         # machine-readable report
    python survey-box-controls.py --self-test     # prove the detector can FAIL

KNOWN LIMITATIONS (disclosed, not hidden — same discipline as
survey-length-controls.py, whose docstring this one is modelled on):
  1. Component attribution is a static heuristic (nearest-preceding-JSX-tag
     backward scan), not a full JSX/AST parse. It can mis-attribute an
     attribute occurrence to the wrong tag in a densely nested props block.
     High-count / single-outlier DIVERGENCE entries warrant a manual
     file:line spot-check before being treated as ground truth for a
     later --fix pass.
  2. The per-side-scalar-violation detector is a NAME-PATTERN heuristic
     (strips a trailing side/corner token, groups by remaining prefix,
     flags when all 4 siblings exist as separate non-object attrs). It
     deliberately does NOT use box_family for this leg, because per spec
     §5 field 7 the very thing being hunted for is an attr that ESCAPED
     box_family classification (a per-side scalar that was never merged
     into an object attr in the first place would have box_family NULL by
     construction — gating on box_family here would make the check
     definitionally unable to find the violation it exists to find). This
     is DELIBERATELY DIFFERENT from check-box-family-guard.py's box_family
     gate, which polices CODE that already does DB-driven grouping; this
     leg polices SCHEMA STATE for a shape that was never grouped at all.
  3. A single-direction spacing attr on one named sub-element (e.g.
     sgs/hero.headlineMarginBottom, sgs/quote.attributionMarginTop) is NOT
     a per-side-scalar violation — it is a legitimate one-off spacing
     control on a specific typographic element, not a fragmented 4-side
     box. The detector only flags a (block_slug, prefix) group where ALL
     FOUR sides (or all four corners) exist as separate scalar attrs
     sharing the same prefix. Verified live 2026-08-09: no such group
     exists in the current schema (see report's §5 verdict).
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# Paths (read-only). Never modified by this script.
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))
BLOCKS_SRC = os.path.join(REPO_ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks')
COMPONENTS_SRC = os.path.join(REPO_ROOT, 'plugins', 'sgs-blocks', 'src', 'components')
DB_PATH = os.path.join(
    os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db'
)

# ---------------------------------------------------------------------------
# Known control primitives + shared wrapper files.
# ---------------------------------------------------------------------------

UNIT_CONTROL_NAMES = {'UnitControl', '__experimentalUnitControl'}

KNOWN_PRIMITIVES = UNIT_CONTROL_NAMES | {
    'BoxControl',
    'RangeControl',
    'TextControl',
    'NumberControl',
    '__experimentalNumberControl',
    'SelectControl',
    'BorderRadiusControl',
    '__experimentalBorderRadiusControl',
    'BorderBoxControl',
    '__experimentalBorderBoxControl',
}

# The canonical wrapper names themselves are ALSO tracked as directly
# resolvable JSX tags (a block may mount them straight in edit.js without
# going through a further local wrapper).
CANONICAL_BOX_COMPONENT = 'ResponsiveBoxControl'
CANONICAL_BOX_PLURAL_COMPONENT = 'ResponsiveBoxControls'
CANONICAL_RADIUS_COMPONENT = 'ResponsiveBorderRadiusControl'
CANONICAL_TAGS = {
    CANONICAL_BOX_COMPONENT, CANONICAL_BOX_PLURAL_COMPONENT, CANONICAL_RADIUS_COMPONENT,
}

# Shared component files under plugins/sgs-blocks/src/components/ that are
# known wrappers around a real primitive — used only to resolve what a
# LOCAL wrapper in a block's edit.js itself wraps, not to resolve the
# canonical tags above (which are reported by name directly, never
# "unwrapped" into BoxControl — that would hide the very distinction this
# survey exists to draw between canonical and raw usage).
SHARED_COMPONENT_FILES = {
    'SpacingControl': 'SpacingControl.js',
}

JSX_OPEN_TAG_RE = re.compile(r'<\s*([A-Za-z_][A-Za-z0-9_.]*)')
LOCAL_FUNC_DEF_RE = re.compile(
    r'^\s*(?:function\s+([A-Za-z_]\w*)\s*\(|const\s+([A-Za-z_]\w*)\s*=\s*(?:\([^)]*\)|[A-Za-z_]\w*)\s*=>)',
)

# ---------------------------------------------------------------------------
# Side / corner token vocabulary (mirrors check-box-family-guard.py's own
# vocabulary so a human reading both scripts recognises the same tokens —
# NOT a shared import, since editing that guard is out of scope here).
# ---------------------------------------------------------------------------

SIDE_TOKENS = ('Top', 'Right', 'Bottom', 'Left')
CORNER_TOKENS = ('TopLeft', 'TopRight', 'BottomLeft', 'BottomRight', 'TL', 'TR', 'BL', 'BR')
_CORNER_NORMALISE = {
    'TL': 'TopLeft', 'TR': 'TopRight', 'BL': 'BottomLeft', 'BR': 'BottomRight',
}
RESPONSIVE_TIER_SUFFIXES = ('Tablet', 'Mobile', 'Desktop')


# ---------------------------------------------------------------------------
# DB access
# ---------------------------------------------------------------------------

def _connect_ro(db_path):
    return sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)


def load_block_denominator(db_path):
    conn = _connect_ro(db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute("SELECT COUNT(*) AS n FROM blocks WHERE slug LIKE 'sgs/%'").fetchone()
        return row['n']
    finally:
        conn.close()


def load_all_attr_rows(db_path):
    """Every sgs/ block_attributes row — the single source both the BOX and
    BORDER legs, and the NULL-bucket count, are derived from."""
    conn = _connect_ro(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT block_slug, attr_name, attr_type, box_family, css_property, "
            "inspector_control_type FROM block_attributes WHERE block_slug LIKE 'sgs/%' "
            "ORDER BY block_slug, attr_name"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Static JS scan — resolve which control component renders a given attr.
# (Same nearest-preceding-JSX-tag heuristic as survey-length-controls.py;
# reimplemented standalone here rather than imported, so this file has no
# runtime dependency on a sibling survey being present/unchanged.)
# ---------------------------------------------------------------------------

def _read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            return fh.readlines()
    except (IOError, OSError):
        return None


def _find_unit_control_alias(lines):
    aliases = set(UNIT_CONTROL_NAMES)
    for line in lines:
        m = re.search(r'__experimentalUnitControl\s+as\s+(\w+)', line)
        if m:
            aliases.add(m.group(1))
    return aliases


def _find_local_wrapper_bodies(lines):
    defs = []
    for idx, line in enumerate(lines):
        m = LOCAL_FUNC_DEF_RE.match(line)
        if m:
            name = m.group(1) or m.group(2)
            if name and name[0].isupper():
                defs.append((idx, name))
    bodies = {}
    for i, (start, name) in enumerate(defs):
        end = defs[i + 1][0] if i + 1 < len(defs) else len(lines)
        bodies[name] = ''.join(lines[start:end])
    return bodies


def _resolve_shared_component_primitives(component_name):
    filename = SHARED_COMPONENT_FILES.get(component_name)
    if not filename:
        return set()
    lines = _read_file(os.path.join(COMPONENTS_SRC, filename))
    if lines is None:
        return set()
    text = ''.join(lines)
    found = set()
    for primitive in KNOWN_PRIMITIVES:
        for name in ({primitive} if primitive not in UNIT_CONTROL_NAMES else UNIT_CONTROL_NAMES):
            if re.search(r'<\s*' + re.escape(name) + r'\b', text):
                found.add(primitive if primitive not in UNIT_CONTROL_NAMES else 'UnitControl')
    return found


def _line_is_comment(lines, idx):
    """Is line `idx` inside a // line comment, a /* */ block, or a {/* */} JSX comment?

    Scans from the top of the file tracking block-comment depth, so a multi-line
    `{/* … */}` is covered, not just the line carrying the opener.
    """
    in_block = False
    for i, raw in enumerate(lines):
        line = raw
        if in_block:
            if i == idx:
                return True
            if '*/' in line:
                in_block = False
                # Text after the close on the same line is real code.
                if i == idx:
                    return not line.split('*/', 1)[1].strip()
            continue
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            if i == idx:
                return True
        opener = line.find('/*')
        if opener != -1 and '*/' not in line[opener:]:
            in_block = True
            if i == idx:
                return True
        elif opener != -1 and i == idx:
            # Single-line /* … */ — comment iff nothing but the comment is on it.
            before = line[:opener].strip().rstrip('{')
            after = line.split('*/', 1)[1].strip().lstrip('}')
            return not before and not after
        if i == idx:
            return False
    return False


def _nearest_preceding_jsx_tag(lines, occurrence_idx, window=60):
    """Nearest OPEN JSX element the occurrence is actually INSIDE.

    ⛔ INSTRUMENT DEFECT FIXED 2026-08-11 (D566/P-SPEC35-BORDER-RESIDUALS item 4).
    This used to walk back up to `window` lines and return the first capitalised
    tag it saw, with NO element boundary — so an occurrence AFTER an element had
    already closed was attributed to that element anyway.

    Measured consequence: `sgs/counter` mentions `borderRadiusTablet` in a
    COMMENT at edit.js:216; the nearest preceding tag was the **Margin**
    `<ResponsiveBoxControl>` opened at :196 and closed at :210. The survey
    therefore reported 5 radius attrs as "fed to a 4-SIDE control", and §14
    field 6 carried that as real until a QC council read the code. All 5 were
    this bug. Same shape at `sgs/timeline:390` and `sgs/whatsapp-cta:204`.

    Now: if a self-closing `/>` or a closing `</Tag>` is seen while walking back
    BEFORE an opening tag, that element has ended and the occurrence is outside
    it — return None (unresolved) rather than guessing. Failing to "unresolved"
    is the safe direction: it under-claims instead of mis-attributing.
    """
    start = max(0, occurrence_idx - window)
    for idx in range(occurrence_idx, start - 1, -1):
        line = lines[idx]
        # Element boundary between the occurrence and any earlier open tag.
        # Skip the occurrence's own line, whose trailing `/>` (if any) closes the
        # element the occurrence legitimately sits in.
        if idx != occurrence_idx and ('/>' in line or re.search(r'</\s*[A-Za-z]', line)):
            # A tag that OPENS on this same line still wins — e.g. `<X a={1} />`
            # preceded by nothing else.
            opens = [m for m in JSX_OPEN_TAG_RE.finditer(line)
                     if m.group(1) and m.group(1)[0].isupper()]
            if opens:
                return opens[-1].group(1), idx + 1
            return None, None
        for m in reversed(list(JSX_OPEN_TAG_RE.finditer(line))):
            name = m.group(1)
            if name and name[0].isupper():
                return name, idx + 1
    return None, None


# ---------------------------------------------------------------------------
# Shared-component fallback (D566 instrument fix #4).
# ---------------------------------------------------------------------------

def _shared_control_files():
    """Every shared/panel component file a block's edit.js may delegate to.

    ⛔ INSTRUMENT DEFECT FIXED 2026-08-11. The survey scanned ONLY
    `src/blocks/<block>/edit.js`, so an attribute whose control lives in a shared
    panel was reported as "NO CONTROL INSTANCE FOUND BY STATIC SCAN" — declared
    and rendered but apparently unreachable.

    Measured consequence: `gridItemBorderRadius` on container / cta-section /
    hero / trust-bar was reported as 4 of the 6 no-control findings and carried
    into contract §14 field 6 as real. It HAS a canonical
    `ResponsiveBorderRadiusControl`, in `GridItemDefaultsPanel`
    (`container/components/ContainerWrapperControls.js:1226-1231`), and all four
    blocks render it. The survey simply could not see across the file boundary —
    `SHARED_COMPONENT_FILES` mapped one component, `SpacingControl`.
    """
    out = []
    for base in (COMPONENTS_SRC, BLOCKS_SRC):
        if not os.path.isdir(base):
            continue
        for root, _dirs, files in os.walk(base):
            # A block's own edit.js is scanned directly; only PANEL/COMPONENT
            # files are fallbacks.
            if os.path.basename(root) == 'blocks':
                continue
            for name in files:
                if not name.endswith('.js'):
                    continue
                if name in ('edit.js', 'save.js', 'view.js', 'index.js'):
                    continue
                out.append(os.path.join(root, name))
    return out


_SHARED_FILES_CACHE = None


def scan_with_shared_fallback(edit_js_path, attr_name):
    """edit.js first; if nothing, look in the shared panel components it may use."""
    global _SHARED_FILES_CACHE
    instances = scan_edit_file_for_attribute(edit_js_path, attr_name)
    if instances:
        return instances
    if _SHARED_FILES_CACHE is None:
        _SHARED_FILES_CACHE = _shared_control_files()
    for path in _SHARED_FILES_CACHE:
        found = scan_edit_file_for_attribute(path, attr_name)
        if found:
            for f in found:
                f['note'] = f"shared-file:{os.path.basename(path)}|{f['note']}"
            return found
    return []


def scan_edit_file_for_attribute(edit_js_path, attr_name):
    """Return a list of {line, jsx_tag, resolved_component, note} for every
    JSX-control occurrence of attr_name in edit_js_path. resolved_component
    is one of: a canonical wrapper name (CANONICAL_TAGS), a KNOWN_PRIMITIVES
    name (raw/non-canonical usage — e.g. bare 'BoxControl'), or None if the
    tag could not be resolved."""
    lines = _read_file(edit_js_path)
    if lines is None:
        return []

    unit_aliases = _find_unit_control_alias(lines)
    local_bodies = _find_local_wrapper_bodies(lines)

    identifier_re = re.compile(r'\b' + re.escape(attr_name) + r'\b')
    string_re = re.compile(r'["\']' + re.escape(attr_name) + r'["\']')

    instances = []
    seen_lines = set()

    for idx, line in enumerate(lines):
        if not (identifier_re.search(line) or string_re.search(line)):
            continue
        stripped = line.strip()
        if re.fullmatch(attr_name + r'\s*,?', stripped):
            continue  # pure destructure line, not a control usage

        # ⛔ A MATCH INSIDE A COMMENT IS NOT A USAGE (D566 instrument fix).
        # `sgs/counter:216` is the JSX comment
        # `{/* … the borderRadiusTablet/borderRadiusMobile object attrs. */}`,
        # and counting it as a control occurrence is half of how 5 false
        # "wrong-shape" findings reached contract §14 field 6. Belt and braces
        # with the element-boundary fix in _nearest_preceding_jsx_tag: either
        # alone clears this case, and the pair covers shapes neither catches
        # alone. This is the project's own recorded rule, applied to its own
        # instrument — "a match inside a comment is not a usage".
        if _line_is_comment(lines, idx):
            continue

        jsx_tag, tag_line = _nearest_preceding_jsx_tag(lines, idx)
        if jsx_tag is None or tag_line in seen_lines:
            continue

        resolved = None
        note = ''

        if jsx_tag in CANONICAL_TAGS:
            resolved = jsx_tag
            note = 'direct-canonical'
        elif jsx_tag in unit_aliases:
            resolved = 'UnitControl'
            note = 'direct'
        elif jsx_tag in KNOWN_PRIMITIVES:
            resolved = jsx_tag
            note = 'direct-raw'
        elif jsx_tag in local_bodies:
            body = local_bodies[jsx_tag]
            found = set()
            if any(re.search(r'<\s*' + re.escape(c) + r'\b', body) for c in CANONICAL_TAGS):
                for c in CANONICAL_TAGS:
                    if re.search(r'<\s*' + re.escape(c) + r'\b', body):
                        found.add(c)
            for primitive in KNOWN_PRIMITIVES:
                names = unit_aliases if primitive in UNIT_CONTROL_NAMES else {primitive}
                for name in names:
                    if re.search(r'<\s*' + re.escape(name) + r'\b', body):
                        found.add(primitive if primitive not in UNIT_CONTROL_NAMES else 'UnitControl')
            for shared_name in SHARED_COMPONENT_FILES:
                if re.search(r'<\s*' + re.escape(shared_name) + r'\b', body):
                    found |= _resolve_shared_component_primitives(shared_name)
            if found:
                # Prefer a canonical hit if the wrapper offers one alongside
                # a raw primitive (the wrapper's own internal fallback path).
                canonical_found = found & CANONICAL_TAGS
                resolved = sorted(canonical_found)[0] if canonical_found else sorted(found)[0]
                note = f'wrapper:{jsx_tag}->{",".join(sorted(found))}'
            else:
                note = f'wrapper:{jsx_tag}(unresolved-body)'
        elif jsx_tag in SHARED_COMPONENT_FILES:
            found = _resolve_shared_component_primitives(jsx_tag)
            if found:
                resolved = sorted(found)[0]
                note = f'shared:{jsx_tag}->{",".join(sorted(found))}'
            else:
                note = f'shared:{jsx_tag}(unresolved-body)'
        else:
            note = f'unknown-tag:{jsx_tag}'

        instances.append({
            'line': tag_line, 'jsx_tag': jsx_tag,
            'resolved_component': resolved, 'note': note,
        })
        seen_lines.add(tag_line)

    return instances


def find_edit_js(block_slug):
    dirname = block_slug.split('/', 1)[1]
    block_dir = os.path.join(BLOCKS_SRC, dirname)
    for c in (os.path.join(block_dir, 'edit.js'), os.path.join(block_dir, 'edit', 'index.js')):
        if os.path.isfile(c):
            return c
    return None


# ---------------------------------------------------------------------------
# LEG 1 — BOX census: attr_type='object' AND box_family IS NOT NULL, split
# into 4-side families (padding/margin/border-width-shaped) vs 4-corner
# families (border-radius-shaped) purely by whether css_property (or the
# box_family name itself) says 'radius'.
# ---------------------------------------------------------------------------

def _is_radius_family(row):
    css = (row['css_property'] or '')
    fam = (row['box_family'] or '')
    return 'radius' in css.lower() or 'radius' in fam.lower()


def build_box_census(rows):
    box_rows = [r for r in rows if r['attr_type'] == 'object' and r['box_family']]
    side_rows = [r for r in box_rows if not _is_radius_family(r)]
    corner_rows = [r for r in box_rows if _is_radius_family(r)]

    def scan_group(group_rows, canonical_names):
        by_component = defaultdict(list)
        no_editor_file = []
        no_control_found = []
        for row in group_rows:
            edit_js = find_edit_js(row['block_slug'])
            if edit_js is None:
                no_editor_file.append(row)
                continue
            rel = os.path.relpath(edit_js, REPO_ROOT).replace('\\', '/')
            instances = scan_with_shared_fallback(edit_js, row['attr_name'])
            if not instances:
                no_control_found.append(row)
                continue
            for inst in instances:
                label = inst['resolved_component'] or f"UNRESOLVED({inst['jsx_tag']})"
                is_canonical = label in canonical_names
                by_component[label].append({
                    'block_slug': row['block_slug'],
                    'attr_name': row['attr_name'],
                    'box_family': row['box_family'],
                    'file': f"{rel}:{inst['line']}",
                    'note': inst['note'],
                    'is_canonical': is_canonical,
                    'inspector_control_type_db': row['inspector_control_type'],
                })
        return {
            'by_component': by_component,
            'no_editor_file': no_editor_file,
            'no_control_found': no_control_found,
            'total_attrs': len(group_rows),
        }

    side_census = scan_group(side_rows, {CANONICAL_BOX_COMPONENT, CANONICAL_BOX_PLURAL_COMPONENT})
    corner_census = scan_group(corner_rows, {CANONICAL_RADIUS_COMPONENT})
    return side_census, corner_census


# ---------------------------------------------------------------------------
# LEG 2 — per-side-scalar violation detector (§5 "0 remaining" claim).
# Groups NON-OBJECT attrs by (block_slug, prefix-with-side/corner-and-tier-
# stripped) and flags a group where ALL FOUR siblings of the same axis
# (side OR corner) exist as separate scalar attrs. See module docstring
# limitation #2 for why this deliberately does not gate on box_family.
# ---------------------------------------------------------------------------

def _strip_responsive_tier(name):
    for tier in RESPONSIVE_TIER_SUFFIXES:
        if name.endswith(tier) and len(name) > len(tier):
            return name[: -len(tier)], tier
    return name, None


def _strip_side_or_corner_token(name):
    """Return (prefix, axis, token) where axis is 'side' or 'corner', or
    (name, None, None) if no token matches. Corner tokens are checked first
    (TopLeft etc.) so 'Left' doesn't shadow a 'BottomLeft' match."""
    for tok in CORNER_TOKENS:
        if name.endswith(tok) and len(name) > len(tok):
            return name[: -len(tok)], 'corner', _CORNER_NORMALISE.get(tok, tok)
    for tok in SIDE_TOKENS:
        if name.endswith(tok) and len(name) > len(tok):
            return name[: -len(tok)], 'side', tok
    return name, None, None


def find_per_side_scalar_violations(rows):
    groups = defaultdict(lambda: defaultdict(list))  # (block, prefix, axis) -> token -> [row]
    candidates_considered = []

    for row in rows:
        if row['attr_type'] == 'object':
            continue  # object attrs are exactly the already-merged shape; not a candidate
        base, tier = _strip_responsive_tier(row['attr_name'])
        prefix, axis, token = _strip_side_or_corner_token(base)
        if axis is None:
            continue
        candidates_considered.append(row)
        key = (row['block_slug'], prefix, axis)
        groups[key][token].append({**row, 'responsive_tier': tier})

    violations = []
    single_direction = []
    for (block_slug, prefix, axis), token_map in groups.items():
        required = set(('TopLeft', 'TopRight', 'BottomLeft', 'BottomRight') if axis == 'corner' else SIDE_TOKENS)
        present = set(token_map.keys())
        if required.issubset(present):
            violations.append({
                'block_slug': block_slug, 'prefix': prefix, 'axis': axis,
                'tokens': sorted(present),
                'instances': {tok: [f"{r['attr_name']}" for r in rs] for tok, rs in token_map.items()},
            })
        else:
            single_direction.append({
                'block_slug': block_slug, 'prefix': prefix, 'axis': axis,
                'tokens': sorted(present),
                'attr_names': [r['attr_name'] for rs in token_map.values() for r in rs],
            })

    return violations, single_direction, len(candidates_considered)


# ---------------------------------------------------------------------------
# LEG 3 — BORDER census (§14). Radius/width attrs where box_family IS NULL
# and attr_type is scalar (string/number) — i.e. attrs that CORRECTLY sit
# outside the box_family column's scope (it only covers 4-side/4-corner
# OBJECT attrs) but still need their own conformance picture, which §14
# field 6 records as "not yet measured".
# ---------------------------------------------------------------------------

def build_border_census(rows):
    radius_scalar = [
        r for r in rows
        if r['attr_type'] != 'object' and r['box_family'] is None
        and r['css_property'] and 'border-radius' in r['css_property']
    ]
    width_scalar = [
        r for r in rows
        if r['attr_type'] != 'object' and r['box_family'] is None
        and r['css_property'] and 'border-width' in r['css_property']
    ]

    def scan_group(group_rows):
        by_component = defaultdict(list)
        no_editor_file = []
        no_control_found = []
        for row in group_rows:
            edit_js = find_edit_js(row['block_slug'])
            if edit_js is None:
                no_editor_file.append(row)
                continue
            rel = os.path.relpath(edit_js, REPO_ROOT).replace('\\', '/')
            instances = scan_with_shared_fallback(edit_js, row['attr_name'])
            if not instances:
                no_control_found.append(row)
                continue
            for inst in instances:
                label = inst['resolved_component'] or f"UNRESOLVED({inst['jsx_tag']})"
                by_component[label].append({
                    'block_slug': row['block_slug'],
                    'attr_name': row['attr_name'],
                    'file': f"{rel}:{inst['line']}",
                    'note': inst['note'],
                    'inspector_control_type_db': row['inspector_control_type'],
                })
        return {
            'by_component': by_component,
            'no_editor_file': no_editor_file,
            'no_control_found': no_control_found,
            'total_attrs': len(group_rows),
        }

    return scan_group(radius_scalar), scan_group(width_scalar)


# ---------------------------------------------------------------------------
# NULL bucket — inspector_control_type population (zeroIsAClaim doctrine:
# NULL is its own bucket, never counted as pass or fail).
# ---------------------------------------------------------------------------

def build_null_bucket(rows):
    total = len(rows)
    null_count = sum(1 for r in rows if r['inspector_control_type'] is None)
    return {'total': total, 'null_count': null_count, 'pct_null': (null_count / total * 100) if total else 0.0}


# ---------------------------------------------------------------------------
# Report assembly + rendering
# ---------------------------------------------------------------------------

def build_report(db_path=DB_PATH):
    denominator = load_block_denominator(db_path)
    rows = load_all_attr_rows(db_path)

    side_census, corner_census = build_box_census(rows)
    violations, single_direction, per_side_candidates = find_per_side_scalar_violations(rows)
    radius_scalar_census, width_scalar_census = build_border_census(rows)
    null_bucket = build_null_bucket(rows)

    return {
        'denominator': denominator,
        'side_census': side_census,
        'corner_census': corner_census,
        'per_side_violations': violations,
        'per_side_single_direction': single_direction,
        'per_side_candidates_considered': per_side_candidates,
        'radius_scalar_census': radius_scalar_census,
        'width_scalar_census': width_scalar_census,
        'null_bucket': null_bucket,
    }


def _render_group_census(lines, title, census, canonical_names):
    lines.append('-' * 78)
    lines.append(title)
    lines.append('-' * 78)
    lines.append(f"Total attrs in scope: {census['total_attrs']}")
    for comp, insts in sorted(census['by_component'].items(), key=lambda kv: -len(kv[1])):
        tag = ' [CANONICAL]' if comp in canonical_names else ' [non-canonical/raw]'
        lines.append(f"  {comp}{tag}: {len(insts)} instance(s)")
        for inst in insts:
            lines.append(f"    - {inst['block_slug']}.{inst['attr_name']} @ {inst['file']} ({inst['note']})")
    if census['no_editor_file']:
        lines.append(f"  NO EDIT.JS FOUND: {len(census['no_editor_file'])}")
        for r in census['no_editor_file']:
            lines.append(f"    - {r['block_slug']}.{r['attr_name']}")
    if census['no_control_found']:
        lines.append(f"  NO CONTROL INSTANCE FOUND BY STATIC SCAN: {len(census['no_control_found'])}")
        for r in census['no_control_found']:
            lines.append(f"    - {r['block_slug']}.{r['attr_name']}")
    lines.append('')


def render_human(report):
    lines = []
    lines.append('=' * 78)
    lines.append('BOX / BORDER control-component survey (READ-ONLY)')
    lines.append('=' * 78)
    lines.append(f"Block denominator (sgs/% in `blocks` table): {report['denominator']}")
    lines.append('')

    lines.append('=' * 78)
    lines.append('LEG 1 — BOX CENSUS (object attrs, box_family IS NOT NULL)')
    lines.append('=' * 78)
    _render_group_census(
        lines, '4-SIDE families (padding / margin / border-width-shaped)',
        report['side_census'], {CANONICAL_BOX_COMPONENT, CANONICAL_BOX_PLURAL_COMPONENT},
    )
    _render_group_census(
        lines, '4-CORNER families (border-radius-shaped)',
        report['corner_census'], {CANONICAL_RADIUS_COMPONENT},
    )

    lines.append('=' * 78)
    lines.append('LEG 2 — PER-SIDE SCALAR VIOLATION CHECK (§5 "0 remaining" claim)')
    lines.append('=' * 78)
    lines.append(f"Candidate scalar attrs considered (name ends in a side/corner token): {report['per_side_candidates_considered']}")
    lines.append(f"VIOLATIONS (all 4 siblings exist as separate scalar attrs): {len(report['per_side_violations'])}")
    for v in report['per_side_violations']:
        lines.append(f"  *** {v['block_slug']}.{v['prefix']}* ({v['axis']}) — tokens present: {v['tokens']}")
        for tok, names in v['instances'].items():
            lines.append(f"      {tok}: {names}")
    if not report['per_side_violations']:
        lines.append('  None found.')
    lines.append('')
    lines.append(f"Single-direction scalars (NOT a violation — one-off spacing on a named element): {len(report['per_side_single_direction'])}")
    for s in report['per_side_single_direction']:
        lines.append(f"  {s['block_slug']}.{s['prefix']}* ({s['axis']}, only {s['tokens']}): {s['attr_names']}")
    lines.append('')

    lines.append('=' * 78)
    lines.append('LEG 3 — BORDER CENSUS (§14 — scalar attrs OUTSIDE box_family scope)')
    lines.append('=' * 78)
    # ⛔ INSTRUMENT DEFECT FIXED 2026-08-11 (D566/P-SPEC35 item 4). These two legs
    # passed an EMPTY canonical set, so every mount printed `[non-canonical/raw]`
    # — including the 11 correct `UnitControl` radius mounts. A leg that can only
    # ever report non-conformance is not a measurement; it reads as 100% broken
    # forever and no remediation can ever clear it.
    #
    # A SCALAR length is contract §4's territory, not §14.3's 4-value box:
    # §4.1 makes `UnitControl` canonical for a single length value, and §14.5
    # explicitly notes a scalar radius is "correctly NULL" in box_family and must
    # be picked up by the css_property leg. So the canonical shape here is
    # UnitControl (bare or inside ResponsiveControl for a tiered one).
    _SCALAR_LENGTH_CANONICAL = {'UnitControl', 'ResponsiveControl'}
    _render_group_census(
        lines, 'Scalar RADIUS (css_property has border-radius, box_family IS NULL, non-object)',
        report['radius_scalar_census'], _SCALAR_LENGTH_CANONICAL,
    )
    _render_group_census(
        lines, 'Scalar BORDER-WIDTH (css_property has border-width, box_family IS NULL, non-object)',
        report['width_scalar_census'], _SCALAR_LENGTH_CANONICAL,
    )

    lines.append('=' * 78)
    lines.append('NULL BUCKET — inspector_control_type (never counted as pass or fail)')
    lines.append('=' * 78)
    nb = report['null_bucket']
    lines.append(f"Total sgs/% block_attributes rows: {nb['total']}")
    lines.append(f"NULL inspector_control_type: {nb['null_count']} ({nb['pct_null']:.1f}%)")
    lines.append('')

    return '\n'.join(lines)


def render_json(report):
    def strip_dd(d):
        return {k: dict(v) if isinstance(v, defaultdict) else v for k, v in d.items()}

    def clean_census(c):
        return {
            'by_component': {k: v for k, v in c['by_component'].items()},
            'no_editor_file': c['no_editor_file'],
            'no_control_found': c['no_control_found'],
            'total_attrs': c['total_attrs'],
        }

    out = {
        'denominator': report['denominator'],
        'side_census': clean_census(report['side_census']),
        'corner_census': clean_census(report['corner_census']),
        'per_side_violations': report['per_side_violations'],
        'per_side_single_direction': report['per_side_single_direction'],
        'per_side_candidates_considered': report['per_side_candidates_considered'],
        'radius_scalar_census': clean_census(report['radius_scalar_census']),
        'width_scalar_census': clean_census(report['width_scalar_census']),
        'null_bucket': report['null_bucket'],
    }
    return json.dumps(out, indent=2)


# ---------------------------------------------------------------------------
# Self-test — positive control, negative control, and a demonstrated FAIL.
# ---------------------------------------------------------------------------

def _write_temp_fixture(tmpdir, filename, content):
    path = os.path.join(tmpdir, filename)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(content)
    return path


def self_test(demonstrate_failure=False):
    import tempfile

    passed = 0
    failed = []

    with tempfile.TemporaryDirectory() as tmpdir:
        # === Component-resolution: POSITIVE CONTROL =========================
        # A block edits "cardPadding" (an object box_family attr) via the
        # CANONICAL <ResponsiveBoxControl>. Must resolve to the canonical tag.
        fixture_canonical = _write_temp_fixture(tmpdir, 'edit_canonical.js', """
import { ResponsiveBoxControl } from '../../components';
function Edit( { attributes, setAttributes } ) {
	const { cardPadding } = attributes;
	return (
		<ResponsiveBoxControl
			label="Card padding"
			value={ cardPadding }
			onChange={ ( v ) => setAttributes( { cardPadding: v } ) }
		/>
	);
}
""")
        inst = scan_edit_file_for_attribute(fixture_canonical, 'cardPadding')
        if inst and inst[0]['resolved_component'] == CANONICAL_BOX_COMPONENT:
            passed += 1
        else:
            failed.append(f'POSITIVE CONTROL FAILED: expected {CANONICAL_BOX_COMPONENT}, got {inst}')

        # === Component-resolution: RAW/NON-CANONICAL detection ==============
        # A DIFFERENT block edits the same-shaped attr via a bare <BoxControl>
        # (§13's "raw BoxControl bypassing the tier wrapper"). Must resolve
        # to 'BoxControl' and be distinguishable from the canonical case.
        fixture_raw = _write_temp_fixture(tmpdir, 'edit_raw.js', """
import { BoxControl } from '@wordpress/components';
function Edit( { attributes, setAttributes } ) {
	const { cardPadding } = attributes;
	return (
		<BoxControl
			label="Card padding"
			values={ cardPadding }
			onChange={ ( v ) => setAttributes( { cardPadding: v } ) }
		/>
	);
}
""")
        inst_raw = scan_edit_file_for_attribute(fixture_raw, 'cardPadding')
        if inst_raw and inst_raw[0]['resolved_component'] == 'BoxControl':
            passed += 1
        else:
            failed.append(f'RAW-DETECTION CONTROL FAILED: expected bare BoxControl, got {inst_raw}')

        if demonstrate_failure:
            # Deliberately assert the WRONG thing to prove the self-test can
            # fail rather than being unconditionally green.
            if inst_raw and inst_raw[0]['resolved_component'] == CANONICAL_BOX_COMPONENT:
                passed += 1
            else:
                failed.append(
                    'DEMONSTRATION FAILURE (expected): asserted raw BoxControl resolves as '
                    f'canonical {CANONICAL_BOX_COMPONENT} — it does not (got '
                    f'{inst_raw[0]["resolved_component"] if inst_raw else None}). This failure '
                    'is intentional, proving the self-test is not hard-wired to pass.'
                )

        # === D566 instrument fixes: mis-attribution (both halves) ============
        # REGRESSION GUARDS for the defect that put 5 phantom "wrong-shape"
        # findings into contract §14 field 6. Fixture is the real shape from
        # sgs/counter/edit.js:196-223 — a Margin ResponsiveBoxControl that CLOSES,
        # then a comment naming the radius attrs, then the real radius control.
        fixture_attr = _write_temp_fixture(tmpdir, 'd566-misattribution.js', """
export default function Edit() {
	return (
		<>
			<ResponsiveBoxControl
				label="Margin"
				values={ { base: {}, tablet: marginTablet } }
				onChange={ ( t, n ) => setAttributes( { marginTablet: n } ) }
			/>
			{/* Border radius — tiers are the borderRadiusTablet object attrs. */}
			<ResponsiveBorderRadiusControl
				label="Border radius"
				values={ { base: {}, tablet: borderRadiusTablet } }
				onChange={ ( t, n ) => setAttributes( { borderRadiusTablet: n } ) }
			/>
		</>
	);
}
""")
        d566 = scan_edit_file_for_attribute(fixture_attr, 'borderRadiusTablet')
        resolved_d566 = {i['resolved_component'] for i in d566}
        # (a) the Margin box control must NOT be attributed this radius attr
        if CANONICAL_BOX_COMPONENT not in resolved_d566:
            passed += 1
        else:
            failed.append(
                'D566 MIS-ATTRIBUTION GUARD FAILED: the Margin '
                f'{CANONICAL_BOX_COMPONENT} was attributed borderRadiusTablet again '
                f'(got {d566}). That is the exact bug that produced 5 false '
                '"wrong-shape" findings in contract §14 field 6.'
            )
        # (b) the REAL radius control must still be found — a fix that clears the
        #     false positive by seeing nothing at all is not a fix.
        if CANONICAL_RADIUS_COMPONENT in resolved_d566:
            passed += 1
        else:
            failed.append(
                'D566 SIGNAL-PRESERVATION GUARD FAILED: expected '
                f'{CANONICAL_RADIUS_COMPONENT} to still resolve, got {d566}. '
                'Clearing a false positive by going blind is a worse defect.'
            )

        # === Per-side-scalar violation: POSITIVE CONTROL =====================
        # Four separate scalar attrs sharing a prefix, one per side — MUST
        # be flagged as a violation.
        violation_rows = [
            {'block_slug': 'sgs/fake', 'attr_name': 'panelPaddingTop', 'attr_type': 'number', 'box_family': None, 'css_property': 'padding-top', 'inspector_control_type': None},
            {'block_slug': 'sgs/fake', 'attr_name': 'panelPaddingRight', 'attr_type': 'number', 'box_family': None, 'css_property': 'padding-right', 'inspector_control_type': None},
            {'block_slug': 'sgs/fake', 'attr_name': 'panelPaddingBottom', 'attr_type': 'number', 'box_family': None, 'css_property': 'padding-bottom', 'inspector_control_type': None},
            {'block_slug': 'sgs/fake', 'attr_name': 'panelPaddingLeft', 'attr_type': 'number', 'box_family': None, 'css_property': 'padding-left', 'inspector_control_type': None},
        ]
        violations, singles, _ = find_per_side_scalar_violations(violation_rows)
        if len(violations) == 1 and violations[0]['block_slug'] == 'sgs/fake':
            passed += 1
        else:
            failed.append(f'PER-SIDE POSITIVE CONTROL FAILED: expected 1 violation, got {violations}')

        # === Per-side-scalar violation: NEGATIVE CONTROL =====================
        # A single-direction scalar (only *MarginBottom) on a named element —
        # the real live shape (sgs/hero.headlineMarginBottom etc.) — must
        # NOT be flagged as a violation.
        single_direction_rows = [
            {'block_slug': 'sgs/fake2', 'attr_name': 'headlineMarginBottom', 'attr_type': 'number', 'box_family': None, 'css_property': 'margin-bottom', 'inspector_control_type': None},
        ]
        v2, s2, _ = find_per_side_scalar_violations(single_direction_rows)
        if len(v2) == 0 and len(s2) == 1:
            passed += 1
        else:
            failed.append(f'PER-SIDE NEGATIVE CONTROL FAILED: expected 0 violations / 1 single-direction, got v={v2} s={s2}')

        # === Per-side-scalar violation: object attrs excluded ================
        # An already-merged OBJECT attr must never be pulled into the
        # candidate pool (it is the CORRECT shape, not a candidate).
        object_rows = [
            {'block_slug': 'sgs/fake3', 'attr_name': 'padding', 'attr_type': 'object', 'box_family': 'padding', 'css_property': 'padding', 'inspector_control_type': 'ResponsiveBoxControl'},
        ]
        v3, s3, considered3 = find_per_side_scalar_violations(object_rows)
        if considered3 == 0:
            passed += 1
        else:
            failed.append(f'OBJECT-EXCLUSION CHECK FAILED: object attr was pulled into candidate pool ({considered3})')

    print(f'Self-test: {passed} passed, {len(failed)} failed')
    for f in failed:
        print(f'  {"EXPECTED FAIL" if demonstrate_failure and "DEMONSTRATION" in f else "FAIL"}: {f}')
    return len(failed) == (1 if demonstrate_failure else 0)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Read-only census of BOX (4-side) + BORDER (4-corner/scalar) controls across sgs/ blocks.'
    )
    parser.add_argument('--json', action='store_true', help='Emit machine-readable JSON instead of the human report.')
    parser.add_argument('--self-test', action='store_true', help='Run the detector self-test (proves it can pass) and exit.')
    parser.add_argument('--self-test-demonstrate-failure', action='store_true',
                         help='Run the self-test WITH one deliberately-wrong assertion, to prove it can FAIL, then exit.')
    parser.add_argument('--db-path', default=DB_PATH, help='Override the sgs-framework.db path (read-only).')
    args = parser.parse_args()

    if args.self_test or args.self_test_demonstrate_failure:
        ok = self_test(demonstrate_failure=args.self_test_demonstrate_failure)
        sys.exit(0 if ok else 1)

    if not os.path.isfile(args.db_path):
        print(f'ERROR: sgs-framework.db not found at {args.db_path}', file=sys.stderr)
        sys.exit(2)

    report = build_report(args.db_path)

    if args.json:
        print(render_json(report))
    else:
        print(render_human(report))


if __name__ == '__main__':
    main()
