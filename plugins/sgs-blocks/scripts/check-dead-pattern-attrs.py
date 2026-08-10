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
            for key, value in attrs.items():
                line = src[: m.start()].count('\n') + 1
                rel = path.relative_to(REPO).as_posix()
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
    print(f'[dead-pattern-attrs] {len(findings)} SILENTLY-DISCARDED attribute(s) '
          f'({len(undeclared)} undeclared, {len(shape)} shape-mismatch):\n')
    for rel, line, name, key, kind in findings:
        print(f'  {rel}:{line}')
        if kind == 'undeclared':
            print(f'      {name} -> "{key}" is not declared in its block.json — WP drops it at render.\n')
        else:
            print(f'      {name} -> "{key}" is declared type:"object" but the stored value is a '
                  f'scalar/list — WP coerces it to the default at render.\n')
    print('Fix the attr name (check the block.json), or declare it. A discarded attr is')
    print('not a style bug — the value never reaches render at all.')
    return 1 if check else 0


def self_test() -> int:
    """Three controls, all in-memory/temp — never mutates real repo files.

    1. POSITIVE — a flat scalar against an object declaration MUST be flagged.
    2. NEGATIVE — a correctly-shaped object against the same declaration MUST NOT
       be flagged. Proves the check isn't just always-firing.
    3. CRASH-GUARD — a `_comment_*` string entry inside `attributes` MUST NOT
       raise (several real block.json files carry these — before-after,
       card-grid, brand-strip).
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
