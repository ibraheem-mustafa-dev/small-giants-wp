#!/usr/bin/env python3
"""Find block attributes in theme patterns/parts that WordPress silently DISCARDS.

WHY THIS EXISTS
---------------
WordPress drops any block attribute the block.json does not declare. No error, no
warning, no test failure, no build failure — the value simply never reaches render.
Nothing in the existing gate set catches it:

  * check-dead-controls.js   catches control-WITHOUT-render (the inverse).
  * check-hardcoded-render-defaults.js only fires when a block DECLARES the attr.
  * The build never parses pattern markup at all.

Found live 2026-07-15: `sgs/business-info` was passed `"type"` (the real attr is
`displayType`, default `"phone"`) in 19 places and American `"textColor"` (the real
attr is British `"textColour"`) in 17 places, across 5 shipped framework patterns.
Every one of those blocks silently rendered a phone number, or rendered with no
colour on a dark footer. Shipped, untested, invisible.

NATIVE-STYLE PATH (added 2026-08-12)
-------------------------------------
The same silent-discard failure exists on a SECOND path: a pattern's `"style"` key
(the native WP style object — `style.color.text`, `style.spacing.padding.top`,
`style.border.radius`, `style.typography.fontSize`, `style.filter.duotone`,
`style.dimensions.aspectRatio`, …) is set on an `sgs/*` block instance whose own
block.json never declares that native `supports` family at all. WordPress discards
that value identically to an undeclared custom attribute — no error, no gate, no
build failure. This check cross-references each top-level `style.*` family against
whether the block's `supports` section declares it (at any truthy sub-key), reported
as a distinct `native-style-undeclared` finding kind alongside the existing
`undeclared` (custom attr) and `shape-mismatch` findings. Detection only, per-family
granularity (not per nested property) — this is advisory, no `--fix`.

SCOPE / LIMITS
--------------
Theme patterns + parts ONLY (static markup we control and commit). It does NOT scan
`post_content` — that is page/post data, lives in the DB, and is a different track's
problem. It only checks `sgs/*` blocks; core blocks have their own (differently
spelled) native attrs and are out of scope.

`--check` exits 1 on any finding (wire into prebuild). Default run reports only.
"""

import json
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
THEME_DIR = REPO / 'theme' / 'sgs-theme'

# Attrs WP accepts on ANY block via supports/global machinery — never declared in
# `attributes`, so they are legitimate and must not be flagged.
NATIVE = {
    'align', 'className', 'style', 'backgroundColor', 'textColor', 'gradient',
    'fontSize', 'fontFamily', 'borderColor', 'lock', 'metadata', 'anchor', 'layout',
}

# SGS universal extensions injected server-side (device-visibility, animation,
# custom CSS) — real, just not per-block declarations. Genuinely universal:
# applied identically to every block, so a blanket prefix match is sound.
EXT_PREFIXES = ('sgsHideOn', 'sgsAnim')
EXT_EXACT = {'sgsCustomCss'}

# `fx` (Spec 38 FR-38-4/§11.2, Motion Wave D) is the Tier G motion-preset
# extension — but unlike EXT_PREFIXES above it is NOT universal: `fx.js`
# `addFxAttributes()` registers the `fx*` attribute family via a
# `blocks.registerBlockType` filter gated on `shouldHaveFx()`, which is
# `fxOptionsForBlock(name).length > 1` — true only for blocks listed in
# `generated-fx-qualifying-blocks.json`. A block absent from that roster
# never gets the filter, so `fx*` on it is exactly the D338 trap: WordPress
# discards it silently. A bare prefix match here would blind the gate to the
# one failure mode it exists to catch — so the fx branch is block-aware
# (`load_fx_qualifying_blocks()`, reading that same generated artefact) as
# well as name-aware (`FX_ATTR_NAMES`).
#
# FX_ATTR_NAMES is hardcoded, not generated: `generated-fx-qualifying-blocks
# .json` enumerates which BLOCKS qualify and for which EFFECTS, not the
# attribute names themselves. Those are defined once in `fx.js`'s own
# `addFxAttributes()` attribute-registration block and mirrored in
# `includes/fx-attributes.php`'s `FX_ATTR_MAP` — there is no generated/DB
# artefact naming them, so R-31-1 (DB-first, but only where a source exists)
# permits hardcoding here with the source cited.
FX_QUALIFYING_BLOCKS_PATH = (
    REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks' / 'extensions'
    / 'generated-fx-qualifying-blocks.json'
)
FX_ATTR_NAMES = {
    'fx', 'fxTrigger', 'fxStart', 'fxEnd', 'fxHold', 'fxScrub', 'fxStagger',
    'fxDuration', 'fxEase', 'fxSplit', 'fxMask', 'fxPath', 'fxPathAsset',
    'fxPathRotate', 'fxPreset',
}

BLOCK_RE = re.compile(r'<!--\s*wp:(sgs/[a-z0-9-]+)\s*(\{.*?\})?\s*/?-->', re.S)


def parse_block_attribute_types(d: dict) -> dict:
    """Given a parsed block.json dict, return {attr_name: declared_type}.

    Several shipped block.json files embed documentation as plain STRING
    values inside `attributes` (e.g. before-after's `_comment_ssr_nullable`,
    card-grid's `_comment_items_media`, brand-strip's `_comment_logos_media`).
    Those entries are not attribute declarations — skip any non-dict entry
    explicitly rather than calling `.get('type')` on a string, which raises
    AttributeError.
    """
    out = {}
    for key, spec in d.get('attributes', {}).items():
        if not isinstance(spec, dict):
            continue
        out[key] = spec.get('type')
    return out


def load_schemas() -> dict:
    out = {}
    for bj in BLOCKS_DIR.glob('*/block.json'):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        if 'name' in d:
            out[d['name']] = parse_block_attribute_types(d)
    return out


# ---------------------------------------------------------------------------
# Native-style path — a pattern's `"style"` key (color/spacing/border/
# typography/filter/dimensions) is silently discarded the same way an
# undeclared custom attr is, if the block's own `supports` section never
# declares that family. See NATIVE-STYLE PATH in the module docstring.
# ---------------------------------------------------------------------------

# Each `style.*` top-level key, mapped to the `supports` key(s) that would
# legitimately enable it. `border` maps to BOTH spellings because this repo's
# block.json files use the WP-native `__experimentalBorder` key (per
# survey-native-supports.py's own STYLE_FAMILIES); `border` alone is included
# for forward-compat with any block.json that has migrated off the
# experimental spelling.
NATIVE_STYLE_SUPPORT_KEYS = {
    'color': ('color',),
    'spacing': ('spacing',),
    'border': ('__experimentalBorder', 'border'),
    'typography': ('typography',),
    'filter': ('filter',),
    'dimensions': ('dimensions',),
}


def load_block_supports() -> dict:
    """{block_name: supports_dict} for every sgs/* block.json. A missing or
    non-dict `supports` key yields {} for that block (fails CLOSED: every
    style.* family then reads as "not declared", so a real native-style
    value on such a block is flagged rather than silently passed)."""
    out = {}
    for bj in BLOCKS_DIR.glob('*/block.json'):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        name = d.get('name')
        if not name:
            continue
        supports = d.get('supports')
        out[name] = supports if isinstance(supports, dict) else {}
    return out


def _native_style_family_declared(supports: dict, style_key: str) -> bool:
    """Is this `style.<style_key>` family actually enabled by `supports`?
    Mirrors survey-native-supports.py's own `_extract_family_declaration`
    truthiness rule: `True` declares it; a dict declares it only if at least
    one non-dunder sub-key is truthy (an all-`False` opt-out dict, e.g.
    `{"text": false, "background": false}`, does NOT count as declared)."""
    for supports_key in NATIVE_STYLE_SUPPORT_KEYS.get(style_key, ()):
        val = supports.get(supports_key)
        if val is True:
            return True
        if isinstance(val, list):
            if val:
                return True
        elif isinstance(val, dict):
            if any(bool(v) for k, v in val.items() if not k.startswith('__')):
                return True
    return False


def find_dead_native_style(attrs: dict, supports: dict) -> list:
    """Given a parsed block-instance `attrs` dict and that block's `supports`
    dict, return the list of top-level `style.*` family keys present in
    `attrs['style']` that `supports` does not actually declare. Only
    top-level families recognised in NATIVE_STYLE_SUPPORT_KEYS are checked
    (per-family granularity, not per nested property — this check is
    advisory/detect-only, matching the task's scope)."""
    style_val = attrs.get('style')
    if not isinstance(style_val, dict):
        return []
    dead = []
    for style_key, family_val in style_val.items():
        if style_key not in NATIVE_STYLE_SUPPORT_KEYS:
            continue
        if not family_val:
            continue
        if not _native_style_family_declared(supports, style_key):
            dead.append(style_key)
    return dead


def load_fx_qualifying_blocks() -> dict:
    try:
        return json.loads(FX_QUALIFYING_BLOCKS_PATH.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        # Missing/unreadable artefact fails CLOSED: no block is treated as
        # fx-qualifying, so a real fx attr would be flagged as a false
        # positive (loud, fixable) rather than a gap swallowing a true
        # discard (silent, the exact failure this gate exists to catch).
        return {}


def is_legit(key: str, declared: dict, block_name: str, fx_qualifying: dict) -> bool:
    if key in declared or key in NATIVE or key in EXT_EXACT:
        return True
    if key in FX_ATTR_NAMES:
        return block_name in fx_qualifying
    return key.startswith(EXT_PREFIXES)


def is_shape_mismatch(declared_type, value) -> bool:
    """WP coerces a value whose SHAPE contradicts the declared `type` to the
    attribute's default — same silent-discard failure as an undeclared attr,
    just one layer in. Scope (per the live D555-adjacent migration risk):
    declared `type: "object"` but the stored value is a scalar (str/int/
    float/bool) or a list. `None` is deliberately excluded — a null default
    is the documented inherit-nothing pattern, not a shape violation.
    """
    if declared_type != 'object':
        return False
    if value is None or isinstance(value, dict):
        return False
    return isinstance(value, (str, int, float, bool, list))


def scan() -> list:
    schemas = load_schemas()
    supports_map = load_block_supports()
    fx_qualifying = load_fx_qualifying_blocks()
    findings = []
    for path in sorted(THEME_DIR.rglob('*')):
        if path.suffix not in ('.php', '.html') or not path.is_file():
            continue
        src = path.read_text(encoding='utf-8', errors='replace')
        for m in BLOCK_RE.finditer(src):
            name, raw = m.group(1), m.group(2)
            if not raw or name not in schemas:
                continue
            try:
                attrs = json.loads(raw)
            except json.JSONDecodeError:
                continue
            declared = schemas[name]
            line = src[: m.start()].count('\n') + 1
            rel = path.relative_to(REPO).as_posix()

            for style_key in find_dead_native_style(attrs, supports_map.get(name, {})):
                findings.append((rel, line, name, f'style.{style_key}', 'native-style-undeclared'))

            for key, value in attrs.items():
                if key in declared and is_shape_mismatch(declared[key], value):
                    findings.append((rel, line, name, key, 'shape-mismatch'))
                    continue
                if is_legit(key, declared, name, fx_qualifying):
                    continue
                findings.append((rel, line, name, key, 'undeclared'))
    return findings


def main() -> int:
    check = '--check' in sys.argv
    findings = scan()
    if not findings:
        print('[dead-pattern-attrs] OK — every sgs/* attr in every theme pattern/part is declared and shape-correct.')
        return 0
    undeclared = [f for f in findings if f[4] == 'undeclared']
    shape = [f for f in findings if f[4] == 'shape-mismatch']
    native_style = [f for f in findings if f[4] == 'native-style-undeclared']
    print(f'[dead-pattern-attrs] {len(findings)} SILENTLY-DISCARDED attribute(s) '
          f'({len(undeclared)} undeclared, {len(shape)} shape-mismatch, '
          f'{len(native_style)} native-style-undeclared):\n')
    for rel, line, name, key, kind in findings:
        print(f'  {rel}:{line}')
        if kind == 'undeclared':
            print(f'      {name} -> "{key}" is not declared in its block.json — WP drops it at render.\n')
        elif kind == 'shape-mismatch':
            print(f'      {name} -> "{key}" is declared type:"object" but the stored value is a '
                  f'scalar/list — WP coerces it to the default at render.\n')
        else:  # native-style-undeclared
            print(f'      {name} -> "{key}" is a native WP style family this block\'s `supports` '
                  f'section does not declare at all — WP silently discards the value at render '
                  f'(same class as an undeclared custom attr, native path instead).\n')
    print('Fix the attr name (check the block.json), or declare it. A discarded attr is')
    print('not a style bug — the value never reaches render at all.')
    # `native-style-undeclared` is a NEW finding kind (2026-08-12) — advisory
    # first per this project's own promotion discipline (E6 point 9: never
    # gate a rule on the run that introduces it). The two PRE-EXISTING kinds
    # (`undeclared`, `shape-mismatch`) stay hard-gated exactly as before —
    # this does not weaken an already-proven defence, it only holds the new
    # one back until its one live finding (sgs/multi-button missing
    # supports.spacing, 9 pattern instances) gets a proper fix (spacing
    # support + skip-serialised render.php CSS emission per Spec 32's
    # no-inline contract — bigger than a one-line declare, tracked
    # separately, not silently swallowed here).
    if check and (undeclared or shape):
        return 1
    if check and native_style:
        print('\n[dead-pattern-attrs] ADVISORY — native-style-undeclared findings do not fail '
              'the build yet (new finding kind, promote once sgs/multi-button is fixed).')
    return 0


def self_test() -> int:
    """Six controls, all in-memory/temp — never mutates real repo files.

    1. POSITIVE — a flat scalar against an object declaration MUST be flagged.
    2. NEGATIVE — a correctly-shaped object against the same declaration MUST NOT
       be flagged. Proves the check isn't just always-firing.
    3. CRASH-GUARD — a `_comment_*` string entry inside `attributes` MUST NOT
       raise (several real block.json files carry these — before-after,
       card-grid, brand-strip).
    4. NATIVE-STYLE mustFlag — `style.color` set on a block whose `supports`
       does not declare `color` at all MUST be flagged.
    5. NATIVE-STYLE mustNotFlag — the identical `style.color` value on a
       block whose `supports.color` IS declared MUST NOT be flagged.
    6. NATIVE-STYLE all-false negative control — `supports.color` present
       but every sub-key `false` (a deliberate opt-out, matching
       survey-native-supports.py's own truthiness rule) MUST still flag
       `style.color` as undeclared — an opt-out is not a declaration.
    """
    failures = []

    # 1. POSITIVE control.
    if not is_shape_mismatch('object', '2rem'):
        failures.append('POSITIVE control failed: flat "gap": "2rem" against an '
                         'object declaration was NOT flagged.')

    # 2. NEGATIVE control.
    if is_shape_mismatch('object', {'desktop': '2rem'}):
        failures.append('NEGATIVE control failed: correctly-shaped '
                         '"gap": {"desktop": "2rem"} was flagged.')

    # 3. CRASH-GUARD.
    synthetic_block_json = {
        'name': 'sgs/self-test-fixture',
        'attributes': {
            '_comment_something': 'this is documentation, not an attribute',
            'gap': {'type': 'object', 'default': {}},
        },
    }
    try:
        types = parse_block_attribute_types(synthetic_block_json)
    except AttributeError as exc:
        failures.append(f'CRASH-GUARD failed: parse_block_attribute_types raised {exc!r} '
                         f'on a string attribute entry.')
    else:
        if '_comment_something' in types:
            failures.append('CRASH-GUARD failed: the string doc entry was not skipped '
                             '— it leaked into the declared-type map.')
        if types.get('gap') != 'object':
            failures.append('CRASH-GUARD failed: the real dict attribute entry '
                             '("gap") was not parsed correctly alongside the string entry.')

    # 4. NATIVE-STYLE mustFlag: no `supports.color` at all.
    no_color_support = {'spacing': {'padding': True}}
    style_with_color = {'style': {'color': {'text': '#fff'}}}
    dead = find_dead_native_style(style_with_color, no_color_support)
    if 'color' not in dead:
        failures.append('NATIVE-STYLE mustFlag control failed: style.color on a block with '
                         'no supports.color declaration was NOT flagged.')

    # 5. NATIVE-STYLE mustNotFlag: supports.color IS declared.
    with_color_support = {'color': {'text': True}, 'spacing': {'padding': True}}
    dead2 = find_dead_native_style(style_with_color, with_color_support)
    if 'color' in dead2:
        failures.append('NATIVE-STYLE mustNotFlag control failed: style.color on a block '
                         'whose supports.color IS declared was flagged.')

    # 6. NATIVE-STYLE all-false opt-out — must still flag (an explicit
    #    {"text": false, "background": false} opt-out is not a declaration,
    #    matching survey-native-supports.py's own _extract_family_declaration
    #    truthiness rule).
    all_false_color_support = {'color': {'text': False, 'background': False}}
    dead3 = find_dead_native_style(style_with_color, all_false_color_support)
    if 'color' not in dead3:
        failures.append('NATIVE-STYLE all-false control failed: style.color on a block whose '
                         'supports.color is an all-false opt-out dict was NOT flagged.')

    if failures:
        print('[dead-pattern-attrs --self-test] FAILED:\n')
        for f in failures:
            print(f'  - {f}')
        return 1

    print('[dead-pattern-attrs --self-test] OK — positive, negative, and crash-guard '
          'controls all behaved as expected.')
    return 0


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    sys.exit(main())
