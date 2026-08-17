#!/usr/bin/env python3
"""
survey-colour-controls.py — Phase 0.0 "--survey" census of the COLOUR property
family across all sgs/ blocks.

READ-ONLY. This script never writes to any file, never runs npm/build/deploy,
never touches git. It queries sgs-framework.db (read-only connection) and
statically greps plugins/sgs-blocks/src/blocks/*/edit.js (+ imported shared
components under plugins/sgs-blocks/src/components/) to report, per COLOUR
CSS property, which control component(s) actually edit it.

Usage:
    python survey-colour-controls.py               # human-readable report
    python survey-colour-controls.py --json         # machine-readable report
    python survey-colour-controls.py --self-test     # prove the detector can FAIL

Governing doc: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §1 COLOUR.
Canonical component: src/components/DesignTokenPicker.js.
Banned lookalikes (per spec): ColorPalette, ColorGradientControl, GradientPicker,
PanelColorGradientSettings, <TextControl type="color">, and the raw GradientPicker
inside GradientOverlayControl.js (reaches container/hero/trust-bar/cta-section
indirectly, alongside the DesignTokenPicker it ALSO uses for the solid-colour
fallback path — see the ambiguous-wrapper handling below).

This is the SURVEY stage only. It does not propose or apply any fix. A later
"--fix" script (not built here) and a "--gate" script (not built here) are
expected to consume this survey's output.

KNOWN LIMITATION (disclosed, not hidden): the "which component renders this
attribute" resolution is a static heuristic — nearest-preceding-JSX-tag
backward scan for controls NOT wrapped by TypographyControls's own mechanism
(colour controls have no such shared-prefix indirection, so this is the
primary path for colour) — not a full JSX/AST parse. It shares the same
mis-attribution risk documented in survey-length-controls.py's docstring:
a large multi-line JSX props block belonging to an unrelated control can pull
an occurrence to the wrong tag. High-count / single-outlier DIVERGENCE entries
warrant a manual file:line spot-check before being treated as ground truth for
a --fix pass.

KNOWN LIMITATION (extension surface, disclosed per council S1 in the governing
spec): `extensions/hover-effects.js` injects ~3 DesignTokenPicker-driven colour
controls (hover text/border/ripple colour) onto every non-opted-out block via a
`registerBlockType` filter at runtime. Those attrs are NEVER written to
block.json and therefore NEVER appear in `block_attributes` — invisible to this
survey's DB-first census by construction (this is the same "EXTENSION SURFACE
axis" the governing spec documents as an UNBUILT PREREQUISITE for
`inspector-scan`, not a defect unique to this script). This survey reports the
extension's OWN colour-control usage as a separate, DB-independent, file-level
section — informational only, no denominator, not merged into the by-property
DB-backed table.

KNOWN LIMITATION (repeater items): this survey does not implement the D523
repeater-item guard (a control inside a `.map()` iteration over the attribute's
OWN value is a per-item control, not the array attribute's control). Colour
attrs surveyed here are scalar top-level attrs, not the array/object attrs the
guard exists for, so the exposure is believed low but not proven zero.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import defaultdict

# ---------------------------------------------------------------------------
# Paths (read-only). Never modified by this script.
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))
BLOCKS_SRC = os.path.join(REPO_ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks')
COMPONENTS_SRC = os.path.join(REPO_ROOT, 'plugins', 'sgs-blocks', 'src', 'components')
EXTENSIONS_SRC = os.path.join(BLOCKS_SRC, 'extensions')
DB_PATH = os.path.join(
    os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db'
)

# ---------------------------------------------------------------------------
# The COLOUR CSS-property family (task-scoped). 'fill'/'stroke' are SVG paint
# properties that share the same DesignTokenPicker canonical control per the
# governing spec's "no competitor exists" framing for this family.
# ---------------------------------------------------------------------------

COLOUR_FAMILY = {'color', 'background-color', 'border-color', 'fill', 'stroke'}

RESPONSIVE_TIER_SUFFIXES = ['Desktop', 'Tablet', 'Mobile']

# ---------------------------------------------------------------------------
# Known control primitives for the COLOUR family.
# ---------------------------------------------------------------------------

CANONICAL_PRIMITIVE = 'DesignTokenPicker'

# TextControl is only a colour-family primitive when it carries type="color" —
# resolved specially in scan_edit_file_for_attribute(), never assumed.
KNOWN_PRIMITIVES = {
    'DesignTokenPicker',
    'ColorPalette',
    'ColorGradientControl',
    'GradientPicker',
    'PanelColorGradientSettings',
    'TextControl',
}

BANNED_LOOKALIKE_NAMES = {
    'ColorPalette',
    'ColorGradientControl',
    'GradientPicker',
    'PanelColorGradientSettings',
    'TextControl[type=color]',
}

# Shared component files under plugins/sgs-blocks/src/components/ known to
# wrap a real colour primitive. GradientOverlayControl is the one documented
# ambiguous case: it renders BOTH a raw GradientPicker (banned, for the
# gradient stops) AND a DesignTokenPicker (canonical, for the solid-colour
# fallback) inside the SAME file, for different attrs it owns.
SHARED_COMPONENT_FILES = {
    'GradientOverlayControl': 'GradientOverlayControl.js',
}

JSX_OPEN_TAG_RE = re.compile(r'<\s*([A-Za-z_][A-Za-z0-9_.]*)')
LOCAL_FUNC_DEF_RE = re.compile(
    r'^\s*(?:function\s+([A-Za-z_]\w*)\s*\(|const\s+([A-Za-z_]\w*)\s*=\s*(?:\([^)]*\)|[A-Za-z_]\w*)\s*=>)',
)

# A GradientOverlayControl-owned attr whose NAME contains "Gradient" is the
# gradient-stop path (GradientPicker, banned); everything else it owns is the
# solid-colour fallback path (DesignTokenPicker, canonical). Both are real
# possibilities the wrapper offers — this disambiguates by the property NAME,
# same pattern as survey-length-controls.py's _PROPERTY_PRIMITIVE_PREFERENCE.
GRADIENT_NAME_HINT_RE = re.compile(r'Gradient', re.IGNORECASE)


# ---------------------------------------------------------------------------
# DB resolution
# ---------------------------------------------------------------------------

def _normalise_css_property_token(token):
    """property_suffixes.css_property can carry an annotation in parens, e.g.
    'color (on a)' for LinkColor. Strip it for family membership checks."""
    return token.split('(')[0].strip()


def resolve_suffix(attr_name, suffix_map):
    """Resolve an attribute name to a css_property via property_suffixes,
    stripping a trailing responsive-tier suffix first if present. Returns
    (css_property, suffix_matched, tier) or (None, None, None)."""
    tier = None
    base = attr_name
    for tier_suffix in RESPONSIVE_TIER_SUFFIXES:
        if base.endswith(tier_suffix) and len(base) > len(tier_suffix):
            base = base[: -len(tier_suffix)]
            tier = tier_suffix
            break

    for suffix in sorted(suffix_map.keys(), key=len, reverse=True):
        if base.lower().endswith(suffix.lower()):
            return suffix_map[suffix], suffix, tier
    return None, None, tier


def load_colour_attributes(db_path):
    """Query block_attributes for every sgs/ block, resolve each row's
    css_property against BOTH sources, and keep only rows whose resolved
    property(ies) intersect COLOUR_FAMILY.

    Returns (results, unresolved) — same shape contract as
    survey-length-controls.py's load_length_attributes()."""
    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    try:
        suffix_rows = conn.execute(
            'SELECT suffix, css_property FROM property_suffixes WHERE css_property IS NOT NULL'
        ).fetchall()
        suffix_map = {}
        for r in suffix_rows:
            prop = _normalise_css_property_token(r['css_property'])
            if prop:
                suffix_map[r['suffix']] = prop

        attr_rows = conn.execute(
            "SELECT block_slug, attr_name, css_property FROM block_attributes "
            "WHERE block_slug LIKE 'sgs/%' ORDER BY block_slug, attr_name"
        ).fetchall()
    finally:
        conn.close()

    results = []
    unresolved = []

    for row in attr_rows:
        block_slug = row['block_slug']
        attr_name = row['attr_name']
        db_css_property = row['css_property']

        if db_css_property:
            members = [_normalise_css_property_token(p) for p in db_css_property.split(',')]
            members = [p for p in members if p]
            hit_members = [p for p in members if p in COLOUR_FAMILY]
            if hit_members:
                results.append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'css_property': ','.join(hit_members),
                    'resolution_source': 'db_column',
                    'matched_suffix': None,
                    'responsive_tier': None,
                })
            continue

        resolved_prop, matched_suffix, tier = resolve_suffix(attr_name, suffix_map)
        if resolved_prop and resolved_prop in COLOUR_FAMILY:
            results.append({
                'block_slug': block_slug,
                'attr_name': attr_name,
                'css_property': resolved_prop,
                'resolution_source': 'suffix_table',
                'matched_suffix': matched_suffix,
                'responsive_tier': tier,
            })
        elif resolved_prop is None:
            if _looks_colour_shaped(attr_name):
                unresolved.append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'css_property': None,
                    'resolution_source': 'unresolved',
                    'matched_suffix': None,
                    'responsive_tier': None,
                })

    return results, unresolved


# Shape hint built from the property_suffixes rows this survey observed live
# (2026-08-09): Colour, Color, Background, Foreground, TextColour, TextColor,
# BorderColour, BorderColor, BackgroundColour, BackgroundColor, Stroke, Bg,
# LinkColor, BgColour, plus Fill (SVG paint; not in the suffix table but a
# real colour-family attribute name shape used across the icon/svg blocks).
COLOUR_SHAPE_HINT_RE = re.compile(
    r'(Colour|Color|Background$|Foreground$|BorderColour|BorderColor|'
    r'BackgroundColour|BackgroundColor|Stroke$|Bg$|BgColour|Fill$)',
)


def _looks_colour_shaped(attr_name):
    return bool(COLOUR_SHAPE_HINT_RE.search(attr_name))


# ---------------------------------------------------------------------------
# Static JS scan: find which control component edits a given attribute.
# ---------------------------------------------------------------------------

_shared_component_cache = {}


def _read_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            return fh.readlines()
    except (IOError, OSError):
        return None


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
    """Return the set of KNOWN_PRIMITIVES a shared component file renders,
    cached. GradientOverlayControl legitimately resolves to TWO primitives
    (GradientPicker + DesignTokenPicker) for different attrs it owns — that
    ambiguity is resolved per-occurrence by _pick_primitive(), not here."""
    if component_name in _shared_component_cache:
        return _shared_component_cache[component_name]

    filename = SHARED_COMPONENT_FILES.get(component_name)
    if not filename:
        _shared_component_cache[component_name] = (None, set())
        return None, set()

    path = os.path.join(COMPONENTS_SRC, filename)
    lines = _read_file(path)
    if lines is None:
        _shared_component_cache[component_name] = (None, set())
        return None, set()

    text = ''.join(lines)
    found = set()
    for primitive in KNOWN_PRIMITIVES:
        if re.search(r'<\s*' + re.escape(primitive) + r'\b', text):
            found.add(primitive)
    _shared_component_cache[component_name] = (filename, found)
    return filename, found


def _nearest_preceding_jsx_tag(lines, occurrence_idx, window=60):
    start = max(0, occurrence_idx - window)
    for idx in range(occurrence_idx, start - 1, -1):
        for m in reversed(list(JSX_OPEN_TAG_RE.finditer(lines[idx]))):
            name = m.group(1)
            if name and name[0].isupper():
                return name, idx + 1  # 1-indexed line number
    return None, None


def _pick_gradientoverlay_primitive(attr_name, found):
    """Disambiguate GradientOverlayControl's two owned primitives by the
    OCCURRENCE ATTR NAME rather than an arbitrary pick — mirrors
    survey-length-controls.py's _pick_primitive() property-based
    disambiguation, generalised to a name-hint since GradientOverlayControl's
    owned attrs are all nominally 'color'/'background-color' (no distinct
    css_property to key off)."""
    if len(found) <= 1:
        return (next(iter(found)) if found else None), False
    if GRADIENT_NAME_HINT_RE.search(attr_name) and 'GradientPicker' in found:
        return 'GradientPicker', True
    if 'DesignTokenPicker' in found:
        return 'DesignTokenPicker', True
    return sorted(found)[0], True


TEXTCONTROL_COLOR_TYPE_RE = re.compile(r'type\s*=\s*["\']color["\']')


def _is_text_control_colour_typed(lines, tag_line_1indexed, window=12):
    """A <TextControl> is only a colour-family primitive when it carries
    type="color" (star-rating/edit.js:155-168 is the documented live case).
    Scans forward from the opening tag to the JSX self-close '/>' or a hard
    cap, since props can appear on any line within the tag's own span."""
    start = tag_line_1indexed - 1
    end = min(len(lines), start + window)
    for idx in range(start, end):
        if TEXTCONTROL_COLOR_TYPE_RE.search(lines[idx]):
            return True
        if '/>' in lines[idx] and idx > start:
            break
    return False


def scan_edit_file_for_attribute(edit_js_path, attr_name):
    """Find every JSX control-tag instance in edit_js_path that references
    attr_name (as an identifier OR as a quoted string).

    Returns a list of instance dicts: line, jsx_tag, resolved_primitive,
    is_canonical, is_banned, resolution_note."""
    lines = _read_file(edit_js_path)
    if lines is None:
        return []

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
            continue

        jsx_tag, tag_line = _nearest_preceding_jsx_tag(lines, idx)
        if jsx_tag is None:
            continue
        if tag_line in seen_lines:
            continue

        resolved_primitive = None
        resolution_note = ''

        if jsx_tag == 'TextControl':
            if _is_text_control_colour_typed(lines, tag_line):
                resolved_primitive = 'TextControl[type=color]'
                resolution_note = 'direct(type=color)'
            else:
                resolved_primitive = None
                resolution_note = 'TextControl(no type=color found — likely mis-attributed occurrence, not a colour control)'
        elif jsx_tag in KNOWN_PRIMITIVES:
            resolved_primitive = jsx_tag
            resolution_note = 'direct'
        elif jsx_tag in local_bodies:
            body = local_bodies[jsx_tag]
            found = set()
            for primitive in KNOWN_PRIMITIVES - {'TextControl'}:
                if re.search(r'<\s*' + re.escape(primitive) + r'\b', body):
                    found.add(primitive)
            for shared_name in SHARED_COMPONENT_FILES:
                if re.search(r'<\s*' + re.escape(shared_name) + r'\b', body):
                    _, shared_found = _resolve_shared_component_primitives(shared_name)
                    found |= shared_found
            if found:
                resolved_primitive, ambiguous = _pick_gradientoverlay_primitive(attr_name, found)
                resolution_note = (
                    f'wrapper:{jsx_tag}->{",".join(sorted(found))}(disambiguated-by-name)'
                    if ambiguous else f'wrapper:{jsx_tag}'
                )
            else:
                resolved_primitive = None
                resolution_note = f'wrapper:{jsx_tag}(unresolved-body)'
        elif jsx_tag in SHARED_COMPONENT_FILES:
            filename, found = _resolve_shared_component_primitives(jsx_tag)
            if found:
                resolved_primitive, ambiguous = _pick_gradientoverlay_primitive(attr_name, found)
                resolution_note = (
                    f'shared:{jsx_tag}->{",".join(sorted(found))}(disambiguated-by-name)'
                    if ambiguous else f'shared:{jsx_tag}'
                )
            else:
                resolved_primitive = None
                resolution_note = f'shared:{jsx_tag}(unresolved-body)'
        else:
            resolved_primitive = None
            resolution_note = f'unknown-tag:{jsx_tag}'

        instances.append({
            'line': tag_line,
            'jsx_tag': jsx_tag,
            'resolved_primitive': resolved_primitive,
            'is_canonical': resolved_primitive == CANONICAL_PRIMITIVE,
            'is_banned': resolved_primitive in BANNED_LOOKALIKE_NAMES,
            'resolution_note': resolution_note,
        })
        seen_lines.add(tag_line)

    return instances


def find_edit_js(block_slug):
    dirname = block_slug.split('/', 1)[1]
    block_dir = os.path.join(BLOCKS_SRC, dirname)
    candidates = [
        os.path.join(block_dir, 'edit.js'),
        os.path.join(block_dir, 'edit', 'index.js'),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


# ---------------------------------------------------------------------------
# Extension-surface scan (informational, NOT DB-backed — see module docstring)
# ---------------------------------------------------------------------------

def scan_extension_surface():
    """Grep src/blocks/extensions/*.js for DesignTokenPicker / banned-colour
    lookalike usage. These attrs are registered onto blocks at runtime via a
    `registerBlockType` filter (block_attributes never sees them), so this is
    reported as its own section with no DB denominator — informational only."""
    findings = defaultdict(list)
    if not os.path.isdir(EXTENSIONS_SRC):
        return findings, []
    files = [f for f in os.listdir(EXTENSIONS_SRC) if f.endswith('.js')]
    scanned = []
    for fname in sorted(files):
        path = os.path.join(EXTENSIONS_SRC, fname)
        lines = _read_file(path)
        if lines is None:
            continue
        scanned.append(fname)
        for idx, line in enumerate(lines):
            for primitive in KNOWN_PRIMITIVES:
                if re.search(r'<\s*' + re.escape(primitive) + r'\b', line):
                    findings[primitive].append(f'{fname}:{idx + 1}')
    return findings, scanned


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------

def build_report(db_path=DB_PATH):
    colour_attrs, unresolved_attrs = load_colour_attributes(db_path)

    no_editor_file = []
    no_control_found = []
    by_property = defaultdict(lambda: defaultdict(list))

    for attr in colour_attrs:
        edit_js = find_edit_js(attr['block_slug'])
        if edit_js is None:
            no_editor_file.append(attr)
            continue

        rel_path = os.path.relpath(edit_js, REPO_ROOT).replace('\\', '/')
        props = attr['css_property'].split(',')
        any_instance_found = False
        for prop in props:
            instances = scan_edit_file_for_attribute(edit_js, attr['attr_name'])
            real_instances = [i for i in instances if i['resolved_primitive'] is not None]
            if real_instances:
                any_instance_found = True
            for inst in real_instances:
                component_label = inst['resolved_primitive']
                by_property[prop][component_label].append({
                    'block_slug': attr['block_slug'],
                    'attr_name': attr['attr_name'],
                    'file': f"{rel_path}:{inst['line']}",
                    'jsx_tag': inst['jsx_tag'],
                    'is_canonical': inst['is_canonical'],
                    'is_banned': inst['is_banned'],
                    'resolution_note': inst['resolution_note'],
                    'attr_resolution_source': attr['resolution_source'],
                    'responsive_tier': attr['responsive_tier'],
                })

        if not any_instance_found:
            no_control_found.append(attr)

    divergences = {}
    for prop, components in by_property.items():
        if len(components) > 1:
            divergences[prop] = {comp: len(insts) for comp, insts in components.items()}

    ext_findings, ext_files_scanned = scan_extension_surface()

    return {
        'by_property': by_property,
        'divergences': divergences,
        'unresolved_attrs': unresolved_attrs,
        'no_editor_file': no_editor_file,
        'no_control_found': no_control_found,
        'total_colour_attrs': len(colour_attrs),
        'extension_findings': ext_findings,
        'extension_files_scanned': ext_files_scanned,
    }


# ---------------------------------------------------------------------------
# Output rendering
# ---------------------------------------------------------------------------

def render_human(report):
    lines = []
    lines.append('=' * 78)
    lines.append('COLOUR-family control-component survey (READ-ONLY, Phase 0.0)')
    lines.append('=' * 78)
    lines.append(f"Total colour-family attribute instances (DB-resolved): {report['total_colour_attrs']}")
    lines.append(f"Unresolved (NULL in both DB column + suffix table, colour-shaped name): {len(report['unresolved_attrs'])}")
    lines.append(f"Attributes with no reachable edit.js: {len(report['no_editor_file'])}")
    lines.append(f"Attributes with no control instance found by static scan: {len(report['no_control_found'])}")
    lines.append('')
    lines.append(f"Canonical component: {CANONICAL_PRIMITIVE}")
    lines.append(f"Banned lookalikes tracked: {', '.join(sorted(BANNED_LOOKALIKE_NAMES))}")
    lines.append('')
    lines.append(
        'NOTE: component attribution is a static heuristic (nearest-preceding-JSX-tag '
        'scan), not an AST parse. Spot-check file:line before treating a DIVERGENCE or a '
        'BANNED-lookalike finding as ground truth for a --fix pass. See module docstring.'
    )
    lines.append('')

    lines.append('-' * 78)
    lines.append('BY CSS PROPERTY')
    lines.append('-' * 78)
    for prop in sorted(report['by_property'].keys()):
        components = report['by_property'][prop]
        is_divergent = prop in report['divergences']
        marker = '  *** DIVERGENCE ***' if is_divergent else ''
        lines.append(f"\n[{prop}]{marker}")
        for comp, insts in sorted(components.items(), key=lambda kv: -len(kv[1])):
            canon = insts[0]['is_canonical']
            banned = insts[0]['is_banned']
            flag = '  [CANONICAL]' if canon else ('  [BANNED LOOKALIKE]' if banned else '')
            lines.append(f"  {comp}: {len(insts)} instance(s){flag}")
            for inst in insts:
                tier = f" [{inst['responsive_tier']}]" if inst['responsive_tier'] else ''
                lines.append(
                    f"    - {inst['block_slug']}.{inst['attr_name']}{tier} "
                    f"@ {inst['file']} (resolved via {inst['attr_resolution_source']}, "
                    f"{inst['resolution_note']})"
                )

    lines.append('')
    lines.append('-' * 78)
    lines.append('DIVERGENCE SUMMARY (property -> components -> counts)')
    lines.append('-' * 78)
    if not report['divergences']:
        lines.append('  None found.')
    else:
        for prop, comp_counts in sorted(report['divergences'].items()):
            comp_str = ', '.join(f"{c}={n}" for c, n in sorted(comp_counts.items(), key=lambda kv: -kv[1]))
            lines.append(f"  {prop}: {comp_str}")

    if report['unresolved_attrs']:
        lines.append('')
        lines.append('-' * 78)
        lines.append('UNRESOLVED (NULL css_property, colour-shaped name — own bucket, NOT a pass)')
        lines.append('-' * 78)
        for a in report['unresolved_attrs']:
            lines.append(f"  {a['block_slug']}.{a['attr_name']}")

    if report['no_editor_file']:
        lines.append('')
        lines.append('-' * 78)
        lines.append('NO EDIT.JS FOUND')
        lines.append('-' * 78)
        for a in report['no_editor_file']:
            lines.append(f"  {a['block_slug']}.{a['attr_name']}")

    if report['no_control_found']:
        lines.append('')
        lines.append('-' * 78)
        lines.append('NO CONTROL INSTANCE FOUND BY STATIC SCAN (edit.js exists, attr not located)')
        lines.append('-' * 78)
        for a in report['no_control_found']:
            lines.append(f"  {a['block_slug']}.{a['attr_name']}")

    lines.append('')
    lines.append('-' * 78)
    lines.append('EXTENSION SURFACE (src/blocks/extensions/*.js) — INFORMATIONAL ONLY')
    lines.append('NOT DB-backed: these attrs are registered at runtime via a registerBlockType')
    lines.append('filter and never appear in block_attributes. No denominator, not merged above.')
    lines.append('-' * 78)
    lines.append(f"Files scanned: {', '.join(report['extension_files_scanned']) or '(none found)'}")
    if not report['extension_findings']:
        lines.append('  No colour-family primitive usage found in extensions/*.js.')
    else:
        for comp, sites in sorted(report['extension_findings'].items(), key=lambda kv: -len(kv[1])):
            flag = '  [CANONICAL]' if comp == CANONICAL_PRIMITIVE else (
                '  [BANNED LOOKALIKE]' if comp in BANNED_LOOKALIKE_NAMES else ''
            )
            lines.append(f"  {comp}: {len(sites)} site(s){flag}")
            for site in sites:
                lines.append(f"    - {site}")

    return '\n'.join(lines)


def render_json(report):
    def strip_defaultdict(d):
        return {k: dict(v) if isinstance(v, defaultdict) else v for k, v in d.items()}

    out = {
        'total_colour_attrs': report['total_colour_attrs'],
        'by_property': strip_defaultdict(report['by_property']),
        'divergences': report['divergences'],
        'unresolved_attrs': report['unresolved_attrs'],
        'no_editor_file': report['no_editor_file'],
        'no_control_found': report['no_control_found'],
        'extension_findings': dict(report['extension_findings']),
        'extension_files_scanned': report['extension_files_scanned'],
    }
    return json.dumps(out, indent=2)


# ---------------------------------------------------------------------------
# Self-test — proves the divergence + banned-lookalike detector can FAIL.
# ---------------------------------------------------------------------------

def _write_temp_fixture(tmpdir, filename, content):
    path = os.path.join(tmpdir, filename)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(content)
    return path


def self_test():
    import tempfile

    passed = 0
    failed = []

    with tempfile.TemporaryDirectory() as tmpdir:
        # --- POSITIVE CONTROL ------------------------------------------------
        # Two fake blocks both edit "titleColour" (a colour-family attr), one
        # via the canonical DesignTokenPicker, one via the banned ColorPalette.
        # The detector MUST flag this as a divergence AND flag the banned one.
        fixture_a = _write_temp_fixture(tmpdir, 'edit_a.js', """
import { ColorPalette } from '@wordpress/components';
function Edit( { attributes, setAttributes } ) {
	const { titleColour } = attributes;
	return (
		<ColorPalette
			value={ titleColour }
			onChange={ ( v ) => setAttributes( { titleColour: v } ) }
		/>
	);
}
""")
        fixture_b = _write_temp_fixture(tmpdir, 'edit_b.js', """
import DesignTokenPicker from '../../components/DesignTokenPicker';
function Edit( { attributes, setAttributes } ) {
	const { titleColour } = attributes;
	return (
		<DesignTokenPicker
			label="Title colour"
			value={ titleColour }
			onChange={ ( v ) => setAttributes( { titleColour: v } ) }
		/>
	);
}
""")
        inst_a = scan_edit_file_for_attribute(fixture_a, 'titleColour')
        inst_b = scan_edit_file_for_attribute(fixture_b, 'titleColour')

        comp_a = {i['resolved_primitive'] for i in inst_a}
        comp_b = {i['resolved_primitive'] for i in inst_b}
        combined = comp_a | comp_b

        if len(combined) > 1 and 'ColorPalette' in combined and 'DesignTokenPicker' in combined:
            passed += 1
        else:
            failed.append(
                f'POSITIVE CONTROL FAILED: expected divergence (ColorPalette vs '
                f'DesignTokenPicker), got {combined}'
            )

        if inst_a and inst_a[0]['is_banned'] is True and inst_a[0]['is_canonical'] is False:
            passed += 1
        else:
            failed.append('POSITIVE CONTROL FAILED: ColorPalette instance not flagged banned')

        if inst_b and inst_b[0]['is_canonical'] is True and inst_b[0]['is_banned'] is False:
            passed += 1
        else:
            failed.append('POSITIVE CONTROL FAILED: DesignTokenPicker instance not flagged canonical')

        # --- TextControl type="color" detection (the star-rating live shape) --
        fixture_c = _write_temp_fixture(tmpdir, 'edit_c.js', """
import { TextControl } from '@wordpress/components';
function Edit( { attributes, setAttributes } ) {
	const { starColour } = attributes;
	return (
		<TextControl
			label="Star colour"
			value={ starColour }
			onChange={ ( v ) => setAttributes( { starColour: v } ) }
			type="color"
		/>
	);
}
""")
        inst_c = scan_edit_file_for_attribute(fixture_c, 'starColour')
        if inst_c and inst_c[0]['resolved_primitive'] == 'TextControl[type=color]' and inst_c[0]['is_banned']:
            passed += 1
        else:
            failed.append(
                f'POSITIVE CONTROL FAILED: TextControl type="color" not detected as '
                f'TextControl[type=color] banned lookalike, got {inst_c}'
            )

        # --- NEGATIVE CONTROL: a plain TextControl with NO type="color" must
        # NOT be reported as a colour-family control at all (proves the
        # detector does not over-fire on every TextControl it sees).
        fixture_d = _write_temp_fixture(tmpdir, 'edit_d.js', """
import { TextControl } from '@wordpress/components';
function Edit( { attributes, setAttributes } ) {
	const { starColour } = attributes;
	return (
		<TextControl
			label="Star colour label (plain text, not a colour picker)"
			value={ starColour }
			onChange={ ( v ) => setAttributes( { starColour: v } ) }
		/>
	);
}
""")
        inst_d = scan_edit_file_for_attribute(fixture_d, 'starColour')
        real_d = [i for i in inst_d if i['resolved_primitive'] is not None]
        if len(real_d) == 0:
            passed += 1
        else:
            failed.append(
                f'NEGATIVE CONTROL FAILED: plain TextControl (no type="color") wrongly '
                f'resolved as a colour control: {real_d}'
            )

        # --- NEGATIVE CONTROL: single-component fixture must NOT read as
        # divergent (proves the detector can also say "no divergence").
        if len(comp_b) == 1:
            passed += 1
        else:
            failed.append(
                f'NEGATIVE CONTROL FAILED: single-component fixture should not read as '
                f'divergent, got {comp_b}'
            )

        # --- NULL-shape check ---------------------------------------------
        if not _looks_colour_shaped('showIcon') and _looks_colour_shaped('backgroundColour'):
            passed += 1
        else:
            failed.append('NULL-SHAPE CHECK FAILED: _looks_colour_shaped mis-scoped a non-colour attr')

    print(f'Self-test: {passed} passed, {len(failed)} failed')
    for f in failed:
        print(f'  FAIL: {f}')
    return len(failed) == 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Read-only census of COLOUR-family CSS-property controls across sgs/ blocks.'
    )
    parser.add_argument('--json', action='store_true', help='Emit machine-readable JSON instead of the human report.')
    parser.add_argument('--self-test', action='store_true', help='Run the detector self-test (proves it can FAIL) and exit.')
    parser.add_argument('--db-path', default=DB_PATH, help='Override the sgs-framework.db path (read-only).')
    args = parser.parse_args()

    if args.self_test:
        ok = self_test()
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
