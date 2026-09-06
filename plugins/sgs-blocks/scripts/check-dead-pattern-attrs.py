#!/usr/bin/env python3
"""Find block attributes in theme patterns/parts that WordPress silently DISCARDS
from the EDITOR — while it may still be painting on the frontend right now.

WHY THIS EXISTS
---------------
⚠ CORRECTED 2026-08-20. This file (and several of its siblings) used to claim
WordPress drops an undeclared block attribute "before render" — full stop. That
is only half right, and the wrong half is dangerous: it reads as "safe to
delete", when the attribute may be painting live on the frontend today.

The two surfaces behave DIFFERENTLY (confirmed by reading WP core source —
Gutenberg `packages/blocks/src/api/parser/get-block-attributes.ts`; the PHP
side is analysed rather than locally read, no `class-wp-block-type.php` copy
was found under this repo's `node_modules`/vendor trees — flag any correction
to this note if that changes):

  * EDITOR / JS (`getBlockAttributes()`): builds the block's `attributes`
    object by iterating the REGISTERED schema, so an undeclared key is simply
    never produced. The client cannot see it or edit it — it is an
    uneditable ghost setting in the inspector.
  * PHP / FRONTEND RENDER (`WP_Block_Type::prepare_attributes_for_render()`):
    iterates the incoming attributes and `continue`s past any key the schema
    doesn't recognise — it does NOT `unset()` that key. `unset()` only fires
    for a DECLARED attribute that fails JSON-schema validation. So an
    undeclared attribute written directly into a pattern/template's block
    comment (as every finding below is) reaches `render.php`'s `$attributes`
    array UNCHANGED and can be consumed there.

**Practical effect: a finding here is a value the client can no longer see or
edit, NOT a value proven dead at render.** Before removing an authoring, or
removing a render.php read of one, check whether that block's render.php
actually consumes the key (e.g. `sgs/container/render.php` reads
`backgroundColor` and emits a real `has-{slug}-background-color` class from
it) — if it does, this is a VISUAL change requiring a before/after check, not
a safe cleanup. Nothing in the existing gate set catches this class:

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
#
# NOTE (2026-08-20): `backgroundColor`, `textColor`, `gradient`, `fontSize`,
# `fontFamily`, `borderColor` used to live in this set UNCONDITIONALLY. That was
# wrong the same way an undeclared `style.*` family is wrong (see NATIVE-STYLE
# PATH below): WP only registers these preset attrs when the block's own
# `supports` section actually enables the matching family (`color.background`,
# `color.text`, `color.gradients`, `typography.fontSize`,
# `typography.__experimentalFontFamily`, `__experimentalBorder.color`/
# `border.color`). A pattern authoring e.g. `"backgroundColor": "primary"` on a
# block that never declared `supports.color` gets it dropped from the EDITOR
# schema — the client can't see or edit it — but the value still reaches
# render.php's `$attributes` array unchanged (PHP keeps an unrecognised key;
# see the module docstring's PHP-vs-JS split), identical in class to the
# style.* bug this file already catches.
# These six are now resolved via NATIVE_PRESET_ATTR_MAP / find_dead_native_
# preset_attrs() below, reusing the same declared-vs-truthy logic as
# _native_style_family_declared(). They stay OUT of NATIVE (unconditional) but
# ARE still recognised by is_legit() so the generic loop doesn't double-flag
# them under the wrong kind — find_dead_native_preset_attrs() is the one true
# check for them, reported as the new `native-preset-undeclared` kind.
NATIVE = {
    'align', 'className', 'style', 'lock', 'metadata', 'anchor', 'layout',
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


# ---------------------------------------------------------------------------
# Native-PRESET-attr path (added 2026-08-20) — a pattern's top-level custom
# attr `backgroundColor` / `textColor` / `gradient` / `fontSize` / `fontFamily`
# / `borderColor` is the flat-attribute form of the same native-supports
# machinery `style.*` uses (see NATIVE-STYLE PATH above). WP only registers
# these on a block whose `supports` section actually enables the matching
# family. Each entry: (family support key(s), the sub-key WP checks inside a
# dict-shaped family value, the WP-native default for that sub-key when the
# dict does not mention it explicitly). `border` carries both spellings for
# the same reason NATIVE_STYLE_SUPPORT_KEYS does.
NATIVE_PRESET_ATTR_MAP = {
    'backgroundColor': (('color',), 'background', True),
    'textColor': (('color',), 'text', True),
    'gradient': (('color',), 'gradients', False),
    'fontSize': (('typography',), 'fontSize', False),
    'fontFamily': (('typography',), '__experimentalFontFamily', False),
    'borderColor': (('__experimentalBorder', 'border'), 'color', False),
}


def _native_preset_attr_declared(supports: dict, attr_key: str) -> bool:
    """Is this flat native-preset attr (`backgroundColor` etc.) actually
    registered by `supports`? `family === True` enables every sub-key of that
    family; `family === False` disables it outright; a dict is checked at its
    specific sub-key, falling back to the WP-native default (per
    NATIVE_PRESET_ATTR_MAP) only when that sub-key is absent from the dict —
    an EXPLICIT `false` at the sub-key is a real opt-out, never overridden by
    the default (mirrors _native_style_family_declared's all-false rule)."""
    families, sub_key, dict_default = NATIVE_PRESET_ATTR_MAP[attr_key]
    for supports_key in families:
        val = supports.get(supports_key)
        if val is True:
            return True
        if isinstance(val, dict):
            if sub_key in val:
                if bool(val[sub_key]):
                    return True
            elif dict_default:
                return True
    return False


def find_dead_native_preset_attrs(attrs: dict, supports: dict, declared: dict) -> list:
    """Given a parsed block-instance `attrs` dict, that block's `supports`
    dict, and that block's OWN declared custom-attribute schema, return the
    list of NATIVE_PRESET_ATTR_MAP keys present (truthily) in `attrs` that
    `supports` does not actually register.

    `declared` matters: several blocks (e.g. sgs/heading) declare a CUSTOM
    attribute that happens to share a name with a native preset attr — e.g.
    `fontSize` is heading's own declared attribute (see its `attrMap`:
    `"css:font-size": "fontSize"`), completely unrelated to WP's native
    `typography.fontSize` support (which heading doesn't even declare). If a
    block declares its own attribute of that name, that name is legit via
    the ordinary `declared` schema path — checking it against
    NATIVE_PRESET_ATTR_MAP here would be a false positive, flagging a
    perfectly-alive custom attribute as a dead native one."""
    dead = []
    for attr_key in NATIVE_PRESET_ATTR_MAP:
        if attr_key in declared:
            continue
        value = attrs.get(attr_key)
        if not value:
            continue
        if not _native_preset_attr_declared(supports, attr_key):
            dead.append(attr_key)
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
    # NATIVE_PRESET_ATTR_MAP keys (backgroundColor/textColor/gradient/fontSize/
    # fontFamily/borderColor) are recognised here so the generic undeclared-attr
    # loop never double-flags them — find_dead_native_preset_attrs() is the one
    # true check for whether they're actually registered, reported under its
    # own `native-preset-undeclared` kind.
    if key in declared or key in NATIVE or key in EXT_EXACT or key in NATIVE_PRESET_ATTR_MAP:
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

            block_supports = supports_map.get(name, {})

            for style_key in find_dead_native_style(attrs, block_supports):
                findings.append((rel, line, name, f'style.{style_key}', 'native-style-undeclared'))

            for attr_key in find_dead_native_preset_attrs(attrs, block_supports, declared):
                findings.append((rel, line, name, attr_key, 'native-preset-undeclared'))

            for key, value in attrs.items():
                if key in declared and is_shape_mismatch(declared[key], value):
                    findings.append((rel, line, name, key, 'shape-mismatch'))
                    continue
                if is_legit(key, declared, name, fx_qualifying):
                    continue
                findings.append((rel, line, name, key, 'undeclared'))
    return findings


def compute_exit_code(findings: list, check: bool) -> int:
    """Gate logic, isolated from printing so it can be unit-tested directly.

    Only `undeclared` and `shape-mismatch` are hard-gated (exit 1 under
    `--check`). `native-style-undeclared` and `native-preset-undeclared` are
    BOTH advisory-only (exit 0) — see the comment in main() for why."""
    if not check:
        return 0
    undeclared = [f for f in findings if f[4] == 'undeclared']
    shape = [f for f in findings if f[4] == 'shape-mismatch']
    if undeclared or shape:
        return 1
    return 0


def main() -> int:
    check = '--check' in sys.argv
    findings = scan()
    if not findings:
        print('[dead-pattern-attrs] OK — every sgs/* attr in every theme pattern/part is declared and shape-correct.')
        return 0
    undeclared = [f for f in findings if f[4] == 'undeclared']
    shape = [f for f in findings if f[4] == 'shape-mismatch']
    native_style = [f for f in findings if f[4] == 'native-style-undeclared']
    native_preset = [f for f in findings if f[4] == 'native-preset-undeclared']
    print(f'[dead-pattern-attrs] {len(findings)} EDITOR-INVISIBLE attribute(s) '
          f'({len(undeclared)} undeclared, {len(shape)} shape-mismatch, '
          f'{len(native_style)} native-style-undeclared, '
          f'{len(native_preset)} native-preset-undeclared):\n')
    for rel, line, name, key, kind in findings:
        print(f'  {rel}:{line}')
        if kind == 'undeclared':
            print(f'      {name} -> "{key}" is not declared in its block.json — WP drops it from the '
                  f'EDITOR schema (uneditable ghost setting), but PHP does NOT drop it before '
                  f'render.php runs. Check whether render.php actually reads "{key}" before assuming '
                  f'it is dead.\n')
        elif kind == 'shape-mismatch':
            print(f'      {name} -> "{key}" is declared type:"object" but the stored value is a '
                  f'scalar/list — WP coerces it to the default at render.\n')
        elif kind == 'native-style-undeclared':
            print(f'      {name} -> "{key}" is a native WP style family this block\'s `supports` '
                  f'section does not declare at all — WP drops it from the EDITOR schema, but PHP '
                  f'does NOT drop it before render.php runs (same class as an undeclared custom '
                  f'attr, native path instead).\n')
        else:  # native-preset-undeclared
            print(f'      {name} -> "{key}" is a native WP preset attr (backgroundColor/textColor/'
                  f'gradient/fontSize/fontFamily/borderColor) this block\'s `supports` section does '
                  f'not actually register — WP drops it from the EDITOR schema, but PHP does NOT '
                  f'drop it before render.php runs (flat-attribute sibling of '
                  f'native-style-undeclared).\n')
    print('Fix the attr name (check the block.json), or declare it. An "editor-invisible" attr is')
    print('not proven dead at render — check render.php before deleting the authoring or the read;')
    print('a class="has-{slug}-background-color" or similar may be painting on the frontend today.')
    # `native-style-undeclared` (2026-08-12) and `native-preset-undeclared`
    # (2026-08-20) are ADVISORY finding kinds — held back from the hard gate
    # per this project's own promotion discipline (E6 point 9: never gate a
    # rule on the run that introduces it). The two PRE-EXISTING kinds
    # (`undeclared`, `shape-mismatch`) stay hard-gated exactly as before —
    # this does not weaken an already-proven defence, it only holds the new
    # ones back until their live findings get a proper fix (native-style's
    # one live finding is sgs/multi-button missing supports.spacing, tracked
    # separately; native-preset's ~60 live findings need the same per-block
    # supports-declaration triage before promotion).
    if check and native_style:
        print('\n[dead-pattern-attrs] ADVISORY — native-style-undeclared findings do not fail '
              'the build yet (new finding kind, promote once sgs/multi-button is fixed).')
    if check and native_preset:
        print('\n[dead-pattern-attrs] ADVISORY — native-preset-undeclared findings do not fail '
              'the build yet (new finding kind, promote once the flagged blocks declare the '
              'right `supports` families).')
    return compute_exit_code(findings, check)


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
    7. NATIVE-PRESET mustFlag — `backgroundColor` set on a block whose
       `supports.color` is an all-false opt-out dict (`{"background": false,
       "text": false}`) MUST be flagged.
    8. NATIVE-PRESET mustNotFlag — the identical `backgroundColor` value on a
       block whose `supports.color.background` is genuinely `true` MUST NOT
       be flagged.
    9. `--check` exit code MUST be 0 when the ONLY findings present are
       `native-preset-undeclared` (advisory kind, never gates the build) —
       proven against compute_exit_code() directly, not by scanning the real
       theme tree.
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

    # 7. NATIVE-PRESET mustFlag: supports.color is an all-false opt-out dict,
    #    and the block declares no custom `backgroundColor` attribute of its own.
    all_false_bg_support = {'color': {'background': False, 'text': False}}
    attrs_with_bg = {'backgroundColor': 'primary'}
    dead_preset = find_dead_native_preset_attrs(attrs_with_bg, all_false_bg_support, {})
    if 'backgroundColor' not in dead_preset:
        failures.append('NATIVE-PRESET mustFlag control failed: backgroundColor on a block whose '
                         'supports.color is an all-false opt-out dict was NOT flagged.')

    # 8. NATIVE-PRESET mustNotFlag: supports.color.background genuinely true.
    real_bg_support = {'color': {'background': True, 'text': False}}
    dead_preset2 = find_dead_native_preset_attrs(attrs_with_bg, real_bg_support, {})
    if 'backgroundColor' in dead_preset2:
        failures.append('NATIVE-PRESET mustNotFlag control failed: backgroundColor on a block '
                         'whose supports.color.background IS true was flagged.')

    # 8b. NATIVE-PRESET mustNotFlag (own-declared-attr case): a block that
    #     declares ITS OWN custom `fontSize` attribute (e.g. sgs/heading)
    #     must never be flagged even though supports never enables native
    #     typography.fontSize — the value is going to the block's own
    #     declared attribute, not WP's native one.
    own_declared_fontsize = {'fontSize': {'type': 'string'}}
    no_typography_support = {}
    dead_preset3 = find_dead_native_preset_attrs(
        {'fontSize': '2rem'}, no_typography_support, own_declared_fontsize)
    if 'fontSize' in dead_preset3:
        failures.append('NATIVE-PRESET own-declared-attr control failed: fontSize on a block that '
                         'declares its OWN custom fontSize attribute was flagged as a dead native one.')

    # 9. `--check` exit code stays 0 when only native-preset-undeclared findings exist.
    only_preset_findings = [
        ('theme/parts/example.php', 3, 'sgs/example', 'backgroundColor', 'native-preset-undeclared'),
    ]
    exit_code = compute_exit_code(only_preset_findings, check=True)
    if exit_code != 0:
        failures.append(f'EXIT-CODE control failed: compute_exit_code() with only '
                         f'native-preset-undeclared findings returned {exit_code}, expected 0 — '
                         f'the new advisory kind must never fail the build.')

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
