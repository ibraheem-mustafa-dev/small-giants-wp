#!/usr/bin/env python3
"""
survey-typography-controls.py — Phase 0.0 "--survey" census of the TYPOGRAPHY
property family (font-size, font-weight, font-style, line-height,
letter-spacing, text-align, text-transform) across all sgs/ blocks.

READ-ONLY. This script never writes to any file, never runs npm/build/deploy,
never touches git. It queries sgs-framework.db (read-only connection) and
statically scans plugins/sgs-blocks/src/blocks/*/edit.js to report, per
TYPOGRAPHY CSS property, which control component(s) actually edit it.

Usage:
    python survey-typography-controls.py               # human-readable report
    python survey-typography-controls.py --json         # machine-readable report
    python survey-typography-controls.py --self-test     # prove the detector can FAIL

Governing docs:
  - .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §4 LENGTH/UNIT field 6
    ("the TypographyControls consumers conform") + the FOURTH-QUADRANT trap
    box (§E) documenting the exact false-negative/false-positive pair this
    script exists to survive.
  - plugins/sgs-blocks/CLAUDE.md "Block Customisation Standard" — Bean
    R-22-13: shared TypographyControls is MANDATORY for any per-element
    typography; a hand-rolled font-size control is the divergence to find.

CANONICAL COMPONENT: src/components/TypographyControls.js. It is a SHARED,
MULTI-ATTRIBUTE component parameterised by a `prefix` prop — one call site
can drive up to 13 attribute keys per element (fontSize/-Unit/-Tablet/-Mobile,
fontWeight, fontStyle, lineHeight/-Unit, letterSpacing/-Unit, textDecoration,
textTransform, + 3 hover companions), computed at RUNTIME via
`typographyAttrName(prefix, base)` — NEVER written as a literal string in the
consuming block's own edit.js. This is structurally different from the
COLOUR family (one attr, one direct DesignTokenPicker call) and from the
LENGTH survey's plain identifier-scan model, and is why this script's
PRIMARY detection path is call-site + prop parsing of `<TypographyControls>`,
not a literal-name JSX scan (see "THE TWO-DIRECTION TRAP" below).

⛔ text-align is NOT managed by TypographyControls at all (absent from its
`typographyAttrKeys()` set) — a block editing text-align uses its own
SelectControl/ToggleGroupControl (that is ENUM-contract territory, Spec 35
§3, out of this survey's canonical-shape scope). text-align instances are
still censused (it is a real DB css_property in the task's named family) but
are never flagged canonical/divergent against TypographyControls — reported
under their own "NO CANONICAL COMPONENT" heading instead.

THE TWO-DIRECTION TRAP (both confirmed live in this codebase, 2026-08-09,
before writing a single line of detector code):
  (a) MISS — a literal-name scan looking for e.g. "nameFontSizeTablet" as a
      substring/identifier in sgs/brand-strip/edit.js finds NOTHING, because
      the block's own source only ever writes `<TypographyControls
      prefix="name" .../>` — the string "nameFontSizeTablet" is built at
      runtime by `typographyAttrName()` and never appears literally. Verified:
      `grep -n nameFontSizeTablet plugins/sgs-blocks/src/blocks/brand-strip/edit.js`
      returns zero hits, yet the DB row exists
      (block_attributes: sgs/brand-strip.nameFontSizeTablet, css_property=
      'font-size') and IS driven by TypographyControls(prefix="name") — a
      pure literal-name matcher would wrongly bucket this as "no control
      found". THIS SCRIPT AVOIDS THE MISS by resolving every
      `<TypographyControls prefix="X" .../>` call site to its FULL derived
      attribute-key set (respecting each call's actual show*/showResponsive
      props, not just the component's defaults) and matching that computed
      set against the block's real attrs BEFORE ever falling back to a
      literal scan.
  (b) FALSE POSITIVE — `src/blocks/label/edit.js:63-73` defines a local
      helper `resetFontSizeResponsive()` whose BODY literally contains the
      text `fontSizeTablet: null, fontSizeMobile: null` — a plain object
      return, not a JSX control. A naive "nearest preceding JSX tag" scan
      for the identifier `fontSizeTablet` anywhere in the file WOULD walk
      backward from that non-JSX occurrence and misattribute it to whatever
      JSX tag happens to precede it in source order, over-counting an
      instance that isn't a rendered control at all. THIS SCRIPT AVOIDS THE
      FALSE POSITIVE because the primary (call-site) path already resolves
      `label`'s fontSizeTablet via its real `<TypographyControls>` call at
      edit.js:292 — the literal-name FALLBACK scan never runs for an attr
      the primary path already claimed, so it never reaches the reset
      helper's text at all. The fallback path (used only for attrs NO
      TypographyControls call site claims) still carries the same general
      nearest-preceding-JSX-tag mis-attribution risk documented in
      survey-length-controls.py's docstring — disclosed, not eliminated,
      for that residual case.

PHP-side note (out of scope, disclosed): `includes/helpers-typography.php`
builds its own tier keys dynamically (`sgs_typography_attr($prefix,
'LineHeightTablet')` at lines 90/98) to READ the same attrs for RENDERING.
That is render-side attribute CONSUMPTION, not an editor CONTROL — this
survey censuses editor controls only and does not scan render.php/PHP at
all. Recorded here so "brand-strip's tier keys are dynamic" is not silently
re-discovered as a surprise by a future reader of this script.

KNOWN LIMITATION (extension surface): `src/blocks/extensions/*.js` is
scanned separately (informational only, no DB denominator) per the same
EXTENSION SURFACE axis documented in survey-colour-controls.py and the
governing spec's council finding S1.

KNOWN LIMITATION (repeater items): the D523 repeater-item guard (a control
inside a `.map()` over the attribute's OWN value is a per-item control, not
the array attribute's) is not implemented here. Typography attrs surveyed
are scalar per-element attrs, not array attrs, so exposure is believed low
but not proven zero.
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
EXTENSIONS_SRC = os.path.join(BLOCKS_SRC, 'extensions')
DB_PATH = os.path.join(
    os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db'
)

# ---------------------------------------------------------------------------
# The TYPOGRAPHY CSS-property family — task-scoped to exactly the 7 named in
# the brief. The DB also carries 'text-decoration', 'font-family' and
# 'text-wrap' under sgs/% — deliberately OUT of this family (not asked for);
# reported as an informational aside so the denominator is never silently
# padded or shrunk relative to what was actually requested.
# ---------------------------------------------------------------------------

TYPOGRAPHY_FAMILY = {
    'font-size', 'font-weight', 'font-style', 'line-height',
    'letter-spacing', 'text-align', 'text-transform',
}
ADJACENT_OUT_OF_SCOPE_PROPERTIES = {'text-decoration', 'font-family', 'text-wrap'}

RESPONSIVE_TIER_SUFFIXES = ['Desktop', 'Tablet', 'Mobile']

CANONICAL_PRIMITIVE = 'TypographyControls'

# text-align has NO canonical component under TypographyControls/R-22-13 —
# any resolved control for it is reported but never flagged canonical.
PROPERTIES_WITH_NO_CANONICAL_COMPONENT = {'text-align'}

# Fallback-path primitives (used only for attrs no TypographyControls call
# site claims).
UNIT_CONTROL_NAMES = {'UnitControl', '__experimentalUnitControl'}
FALLBACK_KNOWN_PRIMITIVES = UNIT_CONTROL_NAMES | {
    'SelectControl', 'ToggleGroupControl', 'RangeControl',
    'NumberControl', '__experimentalNumberControl', 'TextControl',
}

JSX_OPEN_TAG_RE = re.compile(r'<\s*([A-Za-z_][A-Za-z0-9_.]*)')

# ---------------------------------------------------------------------------
# Port of TypographyControls.js's own key-derivation logic (kept in lock-step
# with the real component — see typographyAttrName()/typographyAttrKeys() in
# src/components/TypographyControls.js). Base names + which `show*` prop
# gates each, and the component's own DEFAULT values for each show* prop —
# both read directly from the component source, 2026-08-09.
# ---------------------------------------------------------------------------

# base (PascalCase) -> gating show-flag name
_BASE_TO_FLAG = {
    'FontSize': 'showSize',
    'FontSizeUnit': 'showSize',
    'FontWeight': 'showWeight',
    'FontStyle': 'showStyle',
    'LineHeight': 'showLineHeight',
    'LineHeightUnit': 'showLineHeight',
    'LetterSpacing': 'showLetterSpacing',
    'LetterSpacingUnit': 'showLetterSpacing',
    'TextDecoration': 'showDecoration',
    'TextTransform': 'showTransform',
    'FontWeightHover': 'showHover',
    'TextDecorationHover': 'showHover',
    'TextTransformHover': 'showHover',
}
# FontSizeTablet/FontSizeMobile additionally require showResponsive.
_RESPONSIVE_ONLY_BASES = {'FontSizeTablet', 'FontSizeMobile'}

_DEFAULT_FLAGS = {
    'showSize': True,
    'showWeight': True,
    'showStyle': True,
    'showLineHeight': True,
    'showResponsive': True,
    'showDecoration': False,
    'showTransform': False,
    'showLetterSpacing': False,
    'showHover': False,
}


def typography_attr_name(prefix, base):
    """Python port of TypographyControls.js's typographyAttrName()."""
    if prefix:
        return prefix + base
    return base[0].lower() + base[1:]


def _resolve_effective_flags(prop_text):
    """Parse a `<TypographyControls ...props.../>` tag's captured text for
    show*/showResponsive overrides. A bare `showX` (JSX shorthand) means
    True; `showX={false}`/`showX={true}` are explicit; anything unmentioned
    falls back to the component's own default."""
    flags = dict(_DEFAULT_FLAGS)
    for flag_name in list(flags.keys()):
        # Explicit ={true} / ={false}
        m = re.search(r'\b' + flag_name + r'\s*=\s*\{\s*(true|false)\s*\}', prop_text)
        if m:
            flags[flag_name] = (m.group(1) == 'true')
            continue
        # Bare shorthand: the prop name alone, not followed by '='
        m = re.search(r'\b' + flag_name + r'\b(?!\s*=)', prop_text)
        if m:
            flags[flag_name] = True
    return flags


def _resolve_prefix(prop_text):
    """Extract a literal string `prefix="..."` / `prefix='...'`. A dynamic
    `prefix={expr}` cannot be resolved statically — returned as
    (None, True) meaning 'unresolved, dynamic', matching the ELEMENT
    MANIFEST's own "report what it cannot determine, never guess" doctrine
    (Spec 35's contentAttrs binding condition 3)."""
    m = re.search(r'prefix\s*=\s*["\']([^"\']*)["\']', prop_text)
    if m:
        return m.group(1), False
    m = re.search(r'prefix\s*=\s*\{', prop_text)
    if m:
        return None, True  # dynamic — unresolved, not guessed
    return '', False  # prop omitted entirely == default prefix ''


def derived_attr_keys_for_call(prefix, flags):
    """The full set of attr names a single <TypographyControls> call site
    actually renders, given its resolved prefix + effective show* flags."""
    keys = set()
    for base, flag_name in _BASE_TO_FLAG.items():
        if not flags.get(flag_name, False):
            continue
        keys.add(typography_attr_name(prefix, base))
    if flags.get('showSize') and flags.get('showResponsive'):
        for base in _RESPONSIVE_ONLY_BASES:
            keys.add(typography_attr_name(prefix, base))
    return keys


def find_typography_controls_calls(lines):
    """Scan a file's lines for every `<TypographyControls ... />` call site.
    Returns a list of dicts: line (1-indexed, tag start), prefix,
    prefix_dynamic (bool), flags, derived_keys (set)."""
    calls = []
    idx = 0
    n = len(lines)
    while idx < n:
        if re.search(r'<\s*TypographyControls\b', lines[idx]):
            start = idx
            collected = [lines[idx]]
            scan_idx = idx
            # Accumulate lines until the self-closing '/>' (bounded window
            # to avoid runaway on a malformed/never-closed tag).
            found_close = '/>' in lines[idx]
            steps = 0
            while not found_close and scan_idx + 1 < n and steps < 60:
                scan_idx += 1
                collected.append(lines[scan_idx])
                if '/>' in lines[scan_idx]:
                    found_close = True
                steps += 1
            prop_text = ''.join(collected)
            prefix, prefix_dynamic = _resolve_prefix(prop_text)
            flags = _resolve_effective_flags(prop_text)
            derived_keys = set() if prefix_dynamic else derived_attr_keys_for_call(prefix, flags)
            calls.append({
                'line': start + 1,
                'prefix': prefix,
                'prefix_dynamic': prefix_dynamic,
                'flags': flags,
                'derived_keys': derived_keys,
            })
            idx = scan_idx + 1
            continue
        idx += 1
    return calls


# ---------------------------------------------------------------------------
# DB resolution
# ---------------------------------------------------------------------------

def _normalise_css_property_token(token):
    return token.split('(')[0].strip()


def resolve_suffix(attr_name, suffix_map):
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


def load_typography_attributes(db_path):
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

        adjacent_rows = conn.execute(
            "SELECT COUNT(*) AS c FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND ("
            "css_property = 'text-decoration' OR css_property = 'font-family' OR css_property = 'text-wrap')"
        ).fetchone()
        adjacent_count = adjacent_rows['c'] if adjacent_rows else 0
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
            hit_members = [p for p in members if p in TYPOGRAPHY_FAMILY]
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
        if resolved_prop and resolved_prop in TYPOGRAPHY_FAMILY:
            results.append({
                'block_slug': block_slug,
                'attr_name': attr_name,
                'css_property': resolved_prop,
                'resolution_source': 'suffix_table',
                'matched_suffix': matched_suffix,
                'responsive_tier': tier,
            })
        elif resolved_prop is None:
            if _looks_typography_shaped(attr_name):
                unresolved.append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'css_property': None,
                    'resolution_source': 'unresolved',
                    'matched_suffix': None,
                    'responsive_tier': None,
                })

    return results, unresolved, adjacent_count


TYPOGRAPHY_SHAPE_HINT_RE = re.compile(
    r'(FontSize|FontWeight|FontStyle|LineHeight|LetterSpacing|TextAlign|TextTransform)',
)


def _looks_typography_shaped(attr_name):
    return bool(TYPOGRAPHY_SHAPE_HINT_RE.search(attr_name))


# ---------------------------------------------------------------------------
# Fallback static JS scan (only for attrs NOT claimed by any
# TypographyControls call site — see the false-positive avoidance note in
# the module docstring).
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


def _nearest_preceding_jsx_tag(lines, occurrence_idx, window=60):
    start = max(0, occurrence_idx - window)
    for idx in range(occurrence_idx, start - 1, -1):
        for m in reversed(list(JSX_OPEN_TAG_RE.finditer(lines[idx]))):
            name = m.group(1)
            if name and name[0].isupper():
                return name, idx + 1
    return None, None


def fallback_scan_for_attribute(lines, attr_name):
    """Nearest-preceding-JSX-tag heuristic — same class as
    survey-length-controls.py, and carrying the SAME disclosed
    mis-attribution risk. Only invoked for attrs the primary
    TypographyControls-call-site path did not already resolve."""
    unit_aliases = _find_unit_control_alias(lines)
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
        if jsx_tag is None or tag_line in seen_lines:
            continue

        if jsx_tag in unit_aliases:
            resolved = 'UnitControl'
        elif jsx_tag in FALLBACK_KNOWN_PRIMITIVES:
            resolved = jsx_tag
        else:
            resolved = None

        instances.append({
            'line': tag_line,
            'jsx_tag': jsx_tag,
            'resolved_primitive': resolved,
            'resolution_note': 'direct(fallback-scan)' if resolved else f'unknown-tag:{jsx_tag}(fallback-scan)',
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
# Extension-surface scan (informational, NOT DB-backed)
# ---------------------------------------------------------------------------

def scan_extension_surface():
    findings = defaultdict(list)
    if not os.path.isdir(EXTENSIONS_SRC):
        return findings, []
    files = [f for f in os.listdir(EXTENSIONS_SRC) if f.endswith('.js')]
    scanned = []
    all_primitives = FALLBACK_KNOWN_PRIMITIVES | {'TypographyControls'}
    for fname in sorted(files):
        path = os.path.join(EXTENSIONS_SRC, fname)
        lines = _read_file(path)
        if lines is None:
            continue
        scanned.append(fname)
        for idx, line in enumerate(lines):
            for primitive in all_primitives:
                if re.search(r'<\s*' + re.escape(primitive) + r'\b', line):
                    findings[primitive].append(f'{fname}:{idx + 1}')
    return findings, scanned


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------

def build_report(db_path=DB_PATH):
    typo_attrs, unresolved_attrs, adjacent_count = load_typography_attributes(db_path)

    # Group attrs by block so we parse each block's edit.js exactly once.
    attrs_by_block = defaultdict(list)
    for a in typo_attrs:
        attrs_by_block[a['block_slug']].append(a)

    no_editor_file = []
    no_control_found = []
    by_property = defaultdict(lambda: defaultdict(list))
    typography_controls_call_sites = defaultdict(list)  # block_slug -> [call dicts]
    dynamic_prefix_warnings = []

    for block_slug, attrs in attrs_by_block.items():
        edit_js = find_edit_js(block_slug)
        if edit_js is None:
            no_editor_file.extend(attrs)
            continue
        rel_path = os.path.relpath(edit_js, REPO_ROOT).replace('\\', '/')
        lines = _read_file(edit_js)
        if lines is None:
            no_editor_file.extend(attrs)
            continue

        calls = find_typography_controls_calls(lines)
        typography_controls_call_sites[block_slug] = calls
        for c in calls:
            if c['prefix_dynamic']:
                dynamic_prefix_warnings.append(
                    f"{block_slug} @ {rel_path}:{c['line']} — <TypographyControls prefix={{...}}> "
                    f"is a DYNAMIC expression, not a literal string. Not resolved; attrs it may "
                    f"cover fall through to the fallback scan."
                )

        # Union of every attr key any call site on this block derives, each
        # tagged with which call (prefix/line) produced it — a block may
        # legitimately have MULTIPLE TypographyControls calls (one per
        # element, e.g. product-card's title/desc/tag).
        derived_map = {}  # attr_name -> call dict
        for c in calls:
            for key in c['derived_keys']:
                derived_map[key] = c

        for attr in attrs:
            prop = attr['css_property']
            attr_name = attr['attr_name']

            if attr_name in derived_map:
                c = derived_map[attr_name]
                prefix_label = c['prefix'] if c['prefix'] else '(none)'
                by_property[prop][CANONICAL_PRIMITIVE].append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'file': f"{rel_path}:{c['line']}",
                    'resolved_via': f'TypographyControls(prefix={prefix_label})',
                    'is_canonical': prop not in PROPERTIES_WITH_NO_CANONICAL_COMPONENT,
                    'resolution_note': 'primary(call-site-derived-key)',
                    'attr_resolution_source': attr['resolution_source'],
                    'responsive_tier': attr['responsive_tier'],
                })
                continue

            # Fallback path — attr not claimed by any TypographyControls call.
            instances = fallback_scan_for_attribute(lines, attr_name)
            real_instances = [i for i in instances if i['resolved_primitive'] is not None]
            if not real_instances:
                no_control_found.append(attr)
                continue
            for inst in real_instances:
                by_property[prop][inst['resolved_primitive']].append({
                    'block_slug': block_slug,
                    'attr_name': attr_name,
                    'file': f"{rel_path}:{inst['line']}",
                    'resolved_via': inst['resolved_primitive'],
                    'is_canonical': False,
                    'resolution_note': inst['resolution_note'],
                    'attr_resolution_source': attr['resolution_source'],
                    'responsive_tier': attr['responsive_tier'],
                })

    divergences = {}
    for prop, components in by_property.items():
        if prop in PROPERTIES_WITH_NO_CANONICAL_COMPONENT:
            continue
        if len(components) > 1:
            divergences[prop] = {comp: len(insts) for comp, insts in components.items()}
        elif len(components) == 1 and CANONICAL_PRIMITIVE not in components:
            # Single component, but it's not the canonical one — still a
            # divergence (every instance non-canonical), just not a "split".
            divergences[prop] = {comp: len(insts) for comp, insts in components.items()}

    ext_findings, ext_files_scanned = scan_extension_surface()

    return {
        'by_property': by_property,
        'divergences': divergences,
        'unresolved_attrs': unresolved_attrs,
        'no_editor_file': no_editor_file,
        'no_control_found': no_control_found,
        'total_typography_attrs': len(typo_attrs),
        'adjacent_out_of_scope_count': adjacent_count,
        'dynamic_prefix_warnings': dynamic_prefix_warnings,
        'extension_findings': ext_findings,
        'extension_files_scanned': ext_files_scanned,
    }


# ---------------------------------------------------------------------------
# Output rendering
# ---------------------------------------------------------------------------

def render_human(report):
    lines = []
    lines.append('=' * 78)
    lines.append('TYPOGRAPHY-family control-component survey (READ-ONLY, Phase 0.0)')
    lines.append('=' * 78)
    lines.append(f"Total typography-family attribute instances (DB-resolved): {report['total_typography_attrs']}")
    lines.append(f"Unresolved (NULL in both DB column + suffix table, typography-shaped name): {len(report['unresolved_attrs'])}")
    lines.append(f"Attributes with no reachable edit.js: {len(report['no_editor_file'])}")
    lines.append(f"Attributes with no control instance found (primary + fallback both missed): {len(report['no_control_found'])}")
    lines.append(f"Adjacent out-of-scope rows seen in DB (text-decoration/font-family/text-wrap, NOT counted above): {report['adjacent_out_of_scope_count']}")
    lines.append('')
    lines.append(f"Canonical component: {CANONICAL_PRIMITIVE} (src/components/TypographyControls.js)")
    lines.append(f"Properties with NO canonical component under this rule: {', '.join(sorted(PROPERTIES_WITH_NO_CANONICAL_COMPONENT))}")
    lines.append('')
    lines.append(
        'NOTE: primary detection resolves <TypographyControls prefix="X" .../> call sites to '
        'their FULL derived attribute-key set (respecting real show*/showResponsive props) — '
        'this is what avoids the literal-name MISS trap (see module docstring). Fallback scan '
        '(nearest-preceding-JSX-tag) runs only for attrs no call site claims and carries the '
        'same mis-attribution risk documented in survey-length-controls.py.'
    )
    if report['dynamic_prefix_warnings']:
        lines.append('')
        lines.append('DYNAMIC prefix={...} call sites (NOT resolved — reported, not guessed):')
        for w in report['dynamic_prefix_warnings']:
            lines.append(f'  - {w}')
    lines.append('')

    lines.append('-' * 78)
    lines.append('BY CSS PROPERTY')
    lines.append('-' * 78)
    for prop in sorted(report['by_property'].keys()):
        components = report['by_property'][prop]
        is_divergent = prop in report['divergences']
        no_canon = prop in PROPERTIES_WITH_NO_CANONICAL_COMPONENT
        marker = '  *** DIVERGENCE ***' if is_divergent else ('  (no canonical component for this property)' if no_canon else '')
        lines.append(f"\n[{prop}]{marker}")
        for comp, insts in sorted(components.items(), key=lambda kv: -len(kv[1])):
            canon = insts[0]['is_canonical']
            flag = '  [CANONICAL]' if canon else ''
            lines.append(f"  {comp}: {len(insts)} instance(s){flag}")
            for inst in insts:
                tier = f" [{inst['responsive_tier']}]" if inst['responsive_tier'] else ''
                lines.append(
                    f"    - {inst['block_slug']}.{inst['attr_name']}{tier} "
                    f"@ {inst['file']} (resolved via {inst['attr_resolution_source']}, "
                    f"{inst['resolved_via']}, {inst['resolution_note']})"
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
        lines.append('UNRESOLVED (NULL css_property, typography-shaped name — own bucket, NOT a pass)')
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
        lines.append('NO CONTROL INSTANCE FOUND (edit.js exists, attr not located by primary OR fallback)')
        lines.append('-' * 78)
        for a in report['no_control_found']:
            lines.append(f"  {a['block_slug']}.{a['attr_name']}")

    lines.append('')
    lines.append('-' * 78)
    lines.append('EXTENSION SURFACE (src/blocks/extensions/*.js) — INFORMATIONAL ONLY')
    lines.append('NOT DB-backed: any typography-family attrs injected here are registered at')
    lines.append('runtime via a registerBlockType filter and never appear in block_attributes.')
    lines.append('-' * 78)
    lines.append(f"Files scanned: {', '.join(report['extension_files_scanned']) or '(none found)'}")
    if not report['extension_findings']:
        lines.append('  No typography-family primitive usage found in extensions/*.js.')
    else:
        for comp, sites in sorted(report['extension_findings'].items(), key=lambda kv: -len(kv[1])):
            flag = '  [CANONICAL]' if comp == CANONICAL_PRIMITIVE else ''
            lines.append(f"  {comp}: {len(sites)} site(s){flag}")
            for site in sites:
                lines.append(f"    - {site}")

    return '\n'.join(lines)


def render_json(report):
    def strip_defaultdict(d):
        return {k: dict(v) if isinstance(v, defaultdict) else v for k, v in d.items()}

    out = {
        'total_typography_attrs': report['total_typography_attrs'],
        'adjacent_out_of_scope_count': report['adjacent_out_of_scope_count'],
        'by_property': strip_defaultdict(report['by_property']),
        'divergences': report['divergences'],
        'unresolved_attrs': report['unresolved_attrs'],
        'no_editor_file': report['no_editor_file'],
        'no_control_found': report['no_control_found'],
        'dynamic_prefix_warnings': report['dynamic_prefix_warnings'],
        'extension_findings': dict(report['extension_findings']),
        'extension_files_scanned': report['extension_files_scanned'],
    }
    return json.dumps(out, indent=2)


# ---------------------------------------------------------------------------
# Self-test — proves the detector can FAIL, and specifically exercises BOTH
# directions of the documented trap.
# ---------------------------------------------------------------------------

def self_test():
    passed = 0
    failed = []

    # --- POSITIVE CONTROL: derived-key resolution for a prefixed call -------
    # Mirrors sgs/brand-strip's real shape: <TypographyControls prefix="name"
    # showDecoration showTransform showLetterSpacing /> — must derive
    # nameFontSize, nameFontSizeTablet, nameFontSizeMobile, nameFontSizeUnit,
    # nameFontWeight, nameFontStyle, nameLineHeight, nameLineHeightUnit,
    # nameLetterSpacing, nameLetterSpacingUnit, nameTextDecoration,
    # nameTextTransform — 12 keys, showResponsive defaults true.
    brand_strip_fixture = [
        "\t\t\t<TypographyControls\n",
        "\t\t\t\tattributes={ attributes }\n",
        "\t\t\t\tsetAttributes={ setAttributes }\n",
        "\t\t\t\tprefix=\"name\"\n",
        "\t\t\t\tshowDecoration\n",
        "\t\t\t\tshowTransform\n",
        "\t\t\t\tshowLetterSpacing\n",
        "\t\t\t/>\n",
    ]
    calls = find_typography_controls_calls(brand_strip_fixture)
    if len(calls) == 1:
        passed += 1
    else:
        failed.append(f'POSITIVE CONTROL FAILED: expected exactly 1 call site, got {len(calls)}')

    if calls:
        derived = calls[0]['derived_keys']
        expected = {
            'nameFontSize', 'nameFontSizeUnit', 'nameFontSizeTablet', 'nameFontSizeMobile',
            'nameFontWeight', 'nameFontStyle', 'nameLineHeight', 'nameLineHeightUnit',
            'nameLetterSpacing', 'nameLetterSpacingUnit', 'nameTextDecoration', 'nameTextTransform',
        }
        if derived == expected:
            passed += 1
        else:
            failed.append(
                f'POSITIVE CONTROL FAILED: derived key set mismatch.\n'
                f'    expected: {sorted(expected)}\n'
                f'    got:      {sorted(derived)}'
            )
        # showHover NOT passed -> hover companions must be ABSENT.
        if not any('Hover' in k for k in derived):
            passed += 1
        else:
            failed.append('POSITIVE CONTROL FAILED: hover keys present despite showHover not set')

    # --- THE MISS TRAP, directly exercised: an attribute the block DECLARES
    # (simulated) is never written literally in edit.js, only reachable via
    # the derived-key set. Prove the derived set is what a real caller would
    # use to resolve it (not a literal scan, which we prove separately finds
    # nothing).
    literal_scan_hit = 'nameFontSizeTablet' in ''.join(brand_strip_fixture)
    if not literal_scan_hit:
        passed += 1
    else:
        failed.append('MISS-TRAP SETUP FAILED: fixture unexpectedly contains the literal string (test invalid)')
    if calls and 'nameFontSizeTablet' in calls[0]['derived_keys']:
        passed += 1
    else:
        failed.append('MISS-TRAP FAILED: derived-key resolution did not recover nameFontSizeTablet despite it never appearing literally')

    # --- THE FALSE-POSITIVE TRAP, directly exercised: the label/edit.js
    # shape — a non-JSX helper function containing the literal text
    # "fontSizeTablet" — must NOT be picked up by the PRIMARY path (it has
    # no <TypographyControls> tag at all), and the fallback scan is only
    # reached when the primary path has not already claimed the attr.
    reset_helper_fixture = [
        "function resetFontSizeResponsive() {\n",
        "\treturn {\n",
        "\t\tfontSizeTablet: null,\n",
        "\t\tfontSizeMobile: null,\n",
        "\t};\n",
        "}\n",
    ]
    calls_in_helper = find_typography_controls_calls(reset_helper_fixture)
    if len(calls_in_helper) == 0:
        passed += 1
    else:
        failed.append(f'FALSE-POSITIVE-TRAP FAILED: no <TypographyControls> tag exists in this fixture, but {len(calls_in_helper)} call site(s) were found')

    # --- NEGATIVE CONTROL: a dynamic prefix must be reported as unresolved,
    # never guessed at, and must NOT contribute any derived keys.
    dynamic_fixture = [
        "\t\t\t<TypographyControls\n",
        "\t\t\t\tattributes={ attributes }\n",
        "\t\t\t\tsetAttributes={ setAttributes }\n",
        "\t\t\t\tprefix={ dynamicPrefixVar }\n",
        "\t\t\t/>\n",
    ]
    dyn_calls = find_typography_controls_calls(dynamic_fixture)
    if dyn_calls and dyn_calls[0]['prefix_dynamic'] is True and dyn_calls[0]['derived_keys'] == set():
        passed += 1
    else:
        failed.append(f'NEGATIVE CONTROL FAILED: dynamic prefix should resolve to prefix_dynamic=True with EMPTY derived_keys, got {dyn_calls}')

    # --- NEGATIVE CONTROL: default (no props overridden) call site must
    # match the component's OWN defaults exactly — proves the detector is
    # not hard-wired to always report every optional key.
    default_fixture = [
        "\t\t\t<TypographyControls attributes={ attributes } setAttributes={ setAttributes } />\n",
    ]
    default_calls = find_typography_controls_calls(default_fixture)
    if default_calls:
        d = default_calls[0]['derived_keys']
        expected_default = {
            'fontSize', 'fontSizeUnit', 'fontSizeTablet', 'fontSizeMobile',
            'fontWeight', 'fontStyle', 'lineHeight', 'lineHeightUnit',
        }
        if d == expected_default:
            passed += 1
        else:
            failed.append(
                f'NEGATIVE CONTROL FAILED: default-prop derived set mismatch.\n'
                f'    expected: {sorted(expected_default)}\n'
                f'    got:      {sorted(d)}'
            )
    else:
        failed.append('NEGATIVE CONTROL FAILED: no call site parsed from a minimal valid <TypographyControls /> tag')

    # --- NULL-shape check --------------------------------------------------
    if not _looks_typography_shaped('showIcon') and _looks_typography_shaped('titleFontSize'):
        passed += 1
    else:
        failed.append('NULL-SHAPE CHECK FAILED: _looks_typography_shaped mis-scoped a non-typography attr')

    print(f'Self-test: {passed} passed, {len(failed)} failed')
    for f in failed:
        print(f'  FAIL: {f}')
    return len(failed) == 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Read-only census of TYPOGRAPHY-family CSS-property controls across sgs/ blocks.'
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
