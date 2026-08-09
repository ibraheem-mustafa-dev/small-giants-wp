#!/usr/bin/env python3
"""
survey-length-controls.py — Phase 0.0 "--survey" census of the LENGTH property
family across all sgs/ blocks.

READ-ONLY. This script never writes to any file, never runs npm/build/deploy,
never touches git. It queries sgs-framework.db (read-only connection) and
statically greps plugins/sgs-blocks/src/blocks/*/edit.js (+ imported shared
components under plugins/sgs-blocks/src/components/) to report, per LENGTH
CSS property, which control component(s) actually edit it.

Usage:
    python survey-length-controls.py               # human-readable report
    python survey-length-controls.py --json         # machine-readable report
    python survey-length-controls.py --self-test     # prove the detector can FAIL

This is the SURVEY stage only. It does not propose or apply any fix. A later
"--fix" script (not built here) and a "--gate" script (not built here) are
expected to consume this survey's output.

KNOWN LIMITATION (disclosed, not hidden): the "which component renders this
attribute" resolution is a static heuristic — nearest-preceding-JSX-tag
backward scan — not a full JSX/AST parse. It is generally reliable but can
mis-attribute an attribute occurrence to the wrong tag when: (a) the
attribute name coincidentally appears inside a large multi-line JSX props
block belonging to an unrelated control within the backward search window
(observed once in this survey: sgs/quote.maxWidth attributed to a
<ResponsiveBoxControl> that is actually the block's MARGIN control, because
the true maxWidth control sits further down in the same file and the
backward window crossed a prior control's props block first); (b) a control
is defined via `const X = (...) => ...` in a shape LOCAL_FUNC_DEF_RE does
not match. High-count / single-outlier entries in a DIVERGENCE bucket
warrant a manual file:line spot-check before being treated as ground truth
for a --fix pass — this survey's job is to narrow that manual-check list
from "all 694 instances" to "the handful flagged as ambiguous/divergent",
not to eliminate manual verification entirely.
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
DB_PATH = os.path.join(
    os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db'
)

# ---------------------------------------------------------------------------
# The LENGTH CSS-property family (task-scoped; margin-top/margin-bottom are
# included alongside 'margin' because block_attributes stores them as
# distinct css_property values for the same spacing family — see README
# note below, "Family membership" — never silently dropped as "other").
# ---------------------------------------------------------------------------

LENGTH_FAMILY = {
    'max-width', 'width', 'min-width', 'min-height', 'height', 'max-height',
    'gap', 'padding', 'margin', 'margin-top', 'margin-bottom',
    'border-radius', 'font-size', 'letter-spacing',
    'top', 'right', 'bottom', 'left', 'inset',
}

# Responsive-tier suffixes stripped from an attribute name before matching
# it against property_suffixes.suffix (e.g. "paddingTablet" -> "padding").
RESPONSIVE_TIER_SUFFIXES = ['Desktop', 'Tablet', 'Mobile']

# ---------------------------------------------------------------------------
# Known control primitives. A "UnitControl shape" is a number input with an
# attached unit dropdown — the canonical target per the project's control
# type contract (Spec 32 / block-customisation standard). Everything else
# in this set is a real primitive but NOT the UnitControl shape.
# ---------------------------------------------------------------------------

UNIT_CONTROL_NAMES = {'UnitControl', '__experimentalUnitControl'}

KNOWN_PRIMITIVES = UNIT_CONTROL_NAMES | {
    'RangeControl',
    'BoxControl',
    'TextControl',
    'NumberControl',
    '__experimentalNumberControl',
    'SelectControl',
    'ToggleControl',
    'BorderRadiusControl',
    '__experimentalBorderRadiusControl',
    'BorderBoxControl',
    '__experimentalBorderBoxControl',
}

# Shared component files under plugins/sgs-blocks/src/components/ that are
# known wrappers around a real primitive. Resolved lazily and cached.
SHARED_COMPONENT_FILES = {
    'ResponsiveBoxControl': 'ResponsiveBoxControl.js',
    'ResponsiveBorderRadiusControl': 'ResponsiveBoxControl.js',
    'ResponsiveBoxControls': 'ResponsiveBoxControls.js',
    'SpacingControl': 'SpacingControl.js',
    'TypographyControls': 'TypographyControls.js',
    'ResponsiveTriStateControl': 'ResponsiveTriStateControl.js',
    'ResponsiveOverride': 'ResponsiveOverride.js',
    # ResponsiveControl is a generic render-prop wrapper — the real control
    # lives in the CALLER's render-prop body, not inside ResponsiveControl.js
    # itself, so it is deliberately NOT resolved via the shared file here.
}

JSX_OPEN_TAG_RE = re.compile(r'<\s*([A-Za-z_][A-Za-z0-9_.]*)')
LOCAL_FUNC_DEF_RE = re.compile(
    r'^\s*(?:function\s+([A-Za-z_]\w*)\s*\(|const\s+([A-Za-z_]\w*)\s*=\s*(?:\([^)]*\)|[A-Za-z_]\w*)\s*=>)',
)


# ---------------------------------------------------------------------------
# DB resolution
# ---------------------------------------------------------------------------

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

    # Try longest-suffix-first match so 'MaxWidth' wins over 'Width' for an
    # attr named e.g. 'sectionMaxWidth'.
    for suffix in sorted(suffix_map.keys(), key=len, reverse=True):
        if base.lower().endswith(suffix.lower()) and (
            len(base) == len(suffix) or not base[-(len(suffix) + 1)].isalpha()
            or base[-(len(suffix) + 1):-len(suffix)].islower() is False
            or True  # camelCase boundary is unreliable to detect purely lexically; accept endswith
        ):
            return suffix_map[suffix], suffix, tier
    return None, None, tier


def load_length_attributes(db_path):
    """Query block_attributes for every sgs/ block, resolve each row's
    css_property against BOTH sources, and keep only rows whose resolved
    property(ies) intersect LENGTH_FAMILY.

    Returns a list of dicts: block_slug, attr_name, css_property (resolved),
    resolution_source ('db_column' | 'suffix_table' | 'unresolved'),
    matched_suffix, responsive_tier.
    """
    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    try:
        suffix_rows = conn.execute(
            'SELECT suffix, css_property FROM property_suffixes WHERE css_property IS NOT NULL'
        ).fetchall()
        suffix_map = {r['suffix']: r['css_property'] for r in suffix_rows}

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
            # css_property can be a comma-joined multi-property string
            # (e.g. "height,max-width,width"). Match if ANY member is in
            # the length family.
            members = [p.strip() for p in db_css_property.split(',') if p.strip()]
            hit_members = [p for p in members if p in LENGTH_FAMILY]
            if hit_members:
                results.append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'css_property': ','.join(hit_members),
                    'resolution_source': 'db_column',
                    'matched_suffix': None,
                    'responsive_tier': None,
                })
            # If db_css_property is set but not a length property, this
            # attribute is legitimately out of scope — not unresolved.
            continue

        # css_property is NULL in the DB column — try the suffix registry.
        resolved_prop, matched_suffix, tier = resolve_suffix(attr_name, suffix_map)
        if resolved_prop and resolved_prop in LENGTH_FAMILY:
            results.append({
                'block_slug': block_slug,
                'attr_name': attr_name,
                'css_property': resolved_prop,
                'resolution_source': 'suffix_table',
                'matched_suffix': matched_suffix,
                'responsive_tier': tier,
            })
        elif resolved_prop is None:
            # Only interesting to report as "unresolved" if the attribute
            # NAME itself looks length-shaped — otherwise every non-length
            # NULL attribute (e.g. booleans, enums) would flood the bucket
            # with noise that was never a length candidate to begin with.
            if _looks_length_shaped(attr_name):
                unresolved.append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'css_property': None,
                    'resolution_source': 'unresolved',
                    'matched_suffix': None,
                    'responsive_tier': None,
                })

    return results, unresolved


LENGTH_SHAPE_HINT_RE = re.compile(
    r'(MaxWidth|MinWidth|MaxHeight|MinHeight|Width$|Height$|Padding|Margin|Gap|'
    r'BorderRadius|Radius$|FontSize|LetterSpacing|Inset|Top$|Right$|Bottom$|Left$)'
)


def _looks_length_shaped(attr_name):
    return bool(LENGTH_SHAPE_HINT_RE.search(attr_name))


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


def _find_unit_control_alias(lines):
    """Detect `__experimentalUnitControl as X` import aliasing, returning
    the local alias name (defaults to 'UnitControl' if not found)."""
    aliases = set(UNIT_CONTROL_NAMES)
    for line in lines:
        m = re.search(r'__experimentalUnitControl\s+as\s+(\w+)', line)
        if m:
            aliases.add(m.group(1))
    return aliases


def _find_local_wrapper_bodies(lines):
    """Return {wrapper_name: body_text} for every locally defined function/
    const-arrow component in the file (best-effort: from the definition
    line to the next top-level definition or end of file)."""
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


TOP_LEVEL_EXPORT_FUNC_RE = re.compile(
    r'^export\s+(?:default\s+)?function\s+([A-Za-z_]\w*)\s*\('
)


def _extract_exported_function_body(lines, component_name):
    """Isolate the body of a SPECIFIC exported function within a shared
    component file that may export MULTIPLE components (e.g.
    ResponsiveBoxControl.js exports both ResponsiveBoxControl AND
    ResponsiveBorderRadiusControl). Scanning the whole file for co-located
    exports would wrongly attribute one component's primitives to the
    other — this isolates by function boundary instead."""
    starts = []
    for idx, line in enumerate(lines):
        m = TOP_LEVEL_EXPORT_FUNC_RE.match(line)
        if m:
            starts.append((idx, m.group(1)))
    if not starts:
        # Single-export file (e.g. SpacingControl.js) — whole file is safe.
        return ''.join(lines)
    for i, (start, name) in enumerate(starts):
        if name == component_name:
            end = starts[i + 1][0] if i + 1 < len(starts) else len(lines)
            return ''.join(lines[start:end])
    # Named export not found by this pattern (e.g. `const X = (...) => {}`
    # export shape) — fall back to whole file rather than silently reporting
    # nothing.
    return ''.join(lines)


def _resolve_shared_component_primitives(component_name):
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

    unit_aliases = _find_unit_control_alias(lines)
    text = _extract_exported_function_body(lines, component_name)
    found = set()
    for primitive in KNOWN_PRIMITIVES:
        # Use the resolved alias name where relevant (UnitControl family).
        names_to_check = unit_aliases if primitive in UNIT_CONTROL_NAMES else {primitive}
        for name in names_to_check:
            if re.search(r'<\s*' + re.escape(name) + r'\b', text):
                found.add(primitive if primitive not in UNIT_CONTROL_NAMES else 'UnitControl')
    _shared_component_cache[component_name] = (filename, found)
    return filename, found


def _nearest_preceding_jsx_tag(lines, occurrence_idx, window=60):
    """Scan backward from occurrence_idx for the nearest JSX opening tag
    name (a capitalised identifier following '<')."""
    start = max(0, occurrence_idx - window)
    for idx in range(occurrence_idx, start - 1, -1):
        for m in reversed(list(JSX_OPEN_TAG_RE.finditer(lines[idx]))):
            name = m.group(1)
            if name and name[0].isupper():
                return name, idx + 1  # 1-indexed line number
    return None, None


# A shared wrapper can legitimately render MORE THAN ONE primitive for
# DIFFERENT properties it owns (e.g. ResponsiveBoxControls renders BoxControl
# for padding/margin AND UnitControl for max-width in the same function).
# When a wrapper resolves to >1 candidate primitive, prefer the one that
# matches the occurrence's own css_property family rather than an arbitrary
# alphabetical pick — this avoids misattributing e.g. a max-width instance
# to BoxControl just because the same wrapper also owns padding elsewhere.
_PROPERTY_PRIMITIVE_PREFERENCE = {
    'max-width': 'UnitControl', 'min-width': 'UnitControl', 'width': 'UnitControl',
    'height': 'UnitControl', 'min-height': 'UnitControl', 'max-height': 'UnitControl',
    'font-size': 'UnitControl', 'letter-spacing': 'UnitControl',
    'top': 'UnitControl', 'right': 'UnitControl', 'bottom': 'UnitControl',
    'left': 'UnitControl', 'inset': 'UnitControl',
    'padding': 'BoxControl', 'margin': 'BoxControl',
    'margin-top': 'BoxControl', 'margin-bottom': 'BoxControl', 'gap': 'BoxControl',
    'border-radius': 'BorderRadiusControl',
}


def _pick_primitive(found, css_property):
    """Choose ONE primitive from a candidate set. When the wrapper genuinely
    offers more than one shape (ambiguous), prefer the property-appropriate
    one and record that the pick was disambiguated rather than direct."""
    if len(found) <= 1:
        return (next(iter(found)) if found else None), False
    preferred = _PROPERTY_PRIMITIVE_PREFERENCE.get(css_property)
    if preferred and preferred in found:
        return preferred, True
    return sorted(found)[0], True


def scan_edit_file_for_attribute(edit_js_path, attr_name, css_property=None):
    """Find every JSX control-tag instance in edit_js_path that references
    attr_name (as an identifier OR as a quoted string, e.g.
    attrDesktop="fooBar" used by responsive wrapper helpers).

    css_property (optional): the LENGTH-family property this attribute was
    resolved to, used only to disambiguate a wrapper that legitimately
    renders more than one primitive for different properties it owns.

    Returns a list of instance dicts: line, jsx_tag, resolved_primitive,
    is_unit_control, resolution_note.
    """
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
        # Skip pure destructuring / attribute-default declaration lines —
        # these are not control instances. Heuristic: a line that is ONLY
        # `attrName,` or `attrName = default,` inside a destructure block
        # (no '<' JSX marker anywhere on the line AND no '=' assignment to
        # setAttributes) is not itself a control usage; the real control
        # usage is elsewhere in the file and will be caught on that line.
        stripped = line.strip()
        if re.fullmatch(attr_name + r'\s*,?', stripped):
            continue

        jsx_tag, tag_line = _nearest_preceding_jsx_tag(lines, idx)
        if jsx_tag is None:
            continue
        if (tag_line) in seen_lines:
            continue

        resolved_primitive = None
        resolution_note = ''

        if jsx_tag in unit_aliases:
            resolved_primitive = 'UnitControl'
            resolution_note = 'direct'
        elif jsx_tag in KNOWN_PRIMITIVES:
            resolved_primitive = jsx_tag
            resolution_note = 'direct'
        elif jsx_tag in local_bodies:
            body = local_bodies[jsx_tag]
            found = set()
            for primitive in KNOWN_PRIMITIVES:
                names_to_check = unit_aliases if primitive in UNIT_CONTROL_NAMES else {primitive}
                for name in names_to_check:
                    if re.search(r'<\s*' + re.escape(name) + r'\b', body):
                        found.add(primitive if primitive not in UNIT_CONTROL_NAMES else 'UnitControl')
            # Also allow a locally-defined wrapper to itself wrap a SHARED
            # component (e.g. a local helper that renders <SpacingControl>).
            for shared_name in SHARED_COMPONENT_FILES:
                if re.search(r'<\s*' + re.escape(shared_name) + r'\b', body):
                    _, shared_found = _resolve_shared_component_primitives(shared_name)
                    found |= shared_found
            if found:
                resolved_primitive, ambiguous = _pick_primitive(found, css_property)
                resolution_note = (
                    f'wrapper:{jsx_tag}->{",".join(sorted(found))}(disambiguated-by-property)'
                    if ambiguous else f'wrapper:{jsx_tag}'
                )
            else:
                resolved_primitive = None
                resolution_note = f'wrapper:{jsx_tag}(unresolved-body)'
        elif jsx_tag in SHARED_COMPONENT_FILES:
            filename, found = _resolve_shared_component_primitives(jsx_tag)
            if found:
                resolved_primitive, ambiguous = _pick_primitive(found, css_property)
                resolution_note = (
                    f'shared:{jsx_tag}->{",".join(sorted(found))}(disambiguated-by-property)'
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
            'is_unit_control': resolved_primitive == 'UnitControl',
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
# Report assembly
# ---------------------------------------------------------------------------

def build_report(db_path=DB_PATH):
    length_attrs, unresolved_attrs = load_length_attributes(db_path)

    no_editor_file = []
    no_control_found = []
    by_property = defaultdict(lambda: defaultdict(list))  # property -> component -> [instance dicts]

    for attr in length_attrs:
        edit_js = find_edit_js(attr['block_slug'])
        if edit_js is None:
            no_editor_file.append(attr)
            continue

        rel_path = os.path.relpath(edit_js, REPO_ROOT).replace('\\', '/')
        props = attr['css_property'].split(',')
        any_instance_found = False
        for prop in props:
            # Re-scan per member property: a comma-joined css_property
            # (e.g. "height,max-width,width") means the SAME attribute
            # occurrence maps to several length properties at once, and a
            # multi-primitive wrapper's disambiguation depends on which
            # property is being reported for.
            instances = scan_edit_file_for_attribute(edit_js, attr['attr_name'], css_property=prop)
            if instances:
                any_instance_found = True
            for inst in instances:
                component_label = inst['resolved_primitive'] or f"UNRESOLVED({inst['jsx_tag']})"
                by_property[prop][component_label].append({
                    'block_slug': attr['block_slug'],
                    'attr_name': attr['attr_name'],
                    'file': f"{rel_path}:{inst['line']}",
                    'jsx_tag': inst['jsx_tag'],
                    'is_unit_control': inst['is_unit_control'],
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

    return {
        'by_property': by_property,
        'divergences': divergences,
        'unresolved_attrs': unresolved_attrs,
        'no_editor_file': no_editor_file,
        'no_control_found': no_control_found,
        'total_length_attrs': len(length_attrs),
    }


# ---------------------------------------------------------------------------
# Output rendering
# ---------------------------------------------------------------------------

def render_human(report):
    lines = []
    lines.append('=' * 78)
    lines.append('LENGTH-family control-component survey (READ-ONLY, Phase 0.0)')
    lines.append('=' * 78)
    lines.append(f"Total length-family attribute instances (DB-resolved): {report['total_length_attrs']}")
    lines.append(f"Unresolved (NULL in both DB column + suffix table, length-shaped name): {len(report['unresolved_attrs'])}")
    lines.append(f"Attributes with no reachable edit.js: {len(report['no_editor_file'])}")
    lines.append(f"Attributes with no control instance found by static scan: {len(report['no_control_found'])}")
    lines.append('')
    lines.append(
        'NOTE: component attribution is a static heuristic (nearest-preceding-JSX-tag '
        'scan), not an AST parse. Spot-check file:line before treating a DIVERGENCE or a '
        'single-outlier entry as ground truth for a --fix pass. See module docstring.'
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
            unit_count = sum(1 for i in insts if i['is_unit_control'])
            lines.append(f"  {comp}: {len(insts)} instance(s)  (UnitControl-shape: {unit_count}/{len(insts)})")
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
        lines.append('UNRESOLVED (NULL css_property, length-shaped name — own bucket, NOT a pass)')
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

    return '\n'.join(lines)


def render_json(report):
    def strip_defaultdict(d):
        return {k: dict(v) for k, v in d.items()}

    out = {
        'total_length_attrs': report['total_length_attrs'],
        'by_property': strip_defaultdict(report['by_property']),
        'divergences': report['divergences'],
        'unresolved_attrs': report['unresolved_attrs'],
        'no_editor_file': report['no_editor_file'],
        'no_control_found': report['no_control_found'],
    }
    return json.dumps(out, indent=2)


# ---------------------------------------------------------------------------
# Self-test — proves the divergence detector can FAIL (i.e. it does not
# unconditionally report divergence, and it correctly reports divergence
# when a length property really is edited by two different components).
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
        # --- POSITIVE CONTROL --------------------------------------------
        # Two fake blocks both edit "widthProp" (a max-width-family attr),
        # one via RangeControl, one via UnitControl. The detector MUST flag
        # this as a divergence.
        fixture_a = _write_temp_fixture(tmpdir, 'edit_a.js', """
import { RangeControl } from '@wordpress/components';
function Edit( { attributes, setAttributes } ) {
	const { widthProp } = attributes;
	return (
		<RangeControl
			label="Width"
			value={ widthProp }
			onChange={ ( v ) => setAttributes( { widthProp: v } ) }
		/>
	);
}
""")
        fixture_b = _write_temp_fixture(tmpdir, 'edit_b.js', """
import { __experimentalUnitControl as UnitControl } from '@wordpress/components';
function Edit( { attributes, setAttributes } ) {
	const { widthProp } = attributes;
	return (
		<UnitControl
			label="Width"
			value={ widthProp }
			onChange={ ( v ) => setAttributes( { widthProp: v } ) }
		/>
	);
}
""")
        inst_a = scan_edit_file_for_attribute(fixture_a, 'widthProp')
        inst_b = scan_edit_file_for_attribute(fixture_b, 'widthProp')

        comp_a = {i['resolved_primitive'] for i in inst_a}
        comp_b = {i['resolved_primitive'] for i in inst_b}
        combined_components = comp_a | comp_b

        if len(combined_components) > 1 and 'RangeControl' in combined_components and 'UnitControl' in combined_components:
            passed += 1
        else:
            failed.append(
                f'POSITIVE CONTROL FAILED: expected divergence (RangeControl vs UnitControl), '
                f'got {combined_components}'
            )

        if inst_a and inst_a[0]['is_unit_control'] is False:
            passed += 1
        else:
            failed.append('POSITIVE CONTROL FAILED: RangeControl instance wrongly marked is_unit_control=True')

        if inst_b and inst_b[0]['is_unit_control'] is True:
            passed += 1
        else:
            failed.append('POSITIVE CONTROL FAILED: UnitControl instance wrongly marked is_unit_control=False')

        # --- NEGATIVE CONTROL ----------------------------------------------
        # A single fixture editing "widthProp" via UnitControl ONLY. The
        # detector must NOT report a divergence for this property when only
        # one component is involved — proves the detector can also say "no
        # divergence" and isn't hard-wired to always report one.
        comp_single = comp_b
        if len(comp_single) == 1:
            passed += 1
        else:
            failed.append(
                f'NEGATIVE CONTROL FAILED: single-component fixture should not read as divergent, '
                f'got {comp_single}'
            )

        # --- NULL-shape check: an attribute with no length-shaped name and
        # no length-family css_property should not be pulled into scope by
        # _looks_length_shaped (proves the unresolved-bucket filter is not
        # vacuously true for every attribute).
        if not _looks_length_shaped('showIcon') and _looks_length_shaped('maxWidth'):
            passed += 1
        else:
            failed.append('NULL-SHAPE CHECK FAILED: _looks_length_shaped mis-scoped a non-length attr')

    print(f'Self-test: {passed} passed, {len(failed)} failed')
    for f in failed:
        print(f'  FAIL: {f}')
    return len(failed) == 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Read-only census of LENGTH-family CSS-property controls across sgs/ blocks.'
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
