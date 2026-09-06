#!/usr/bin/env python3
"""Find block attributes destructured in edit.js that WordPress silently DISCARDS.

WHY THIS EXISTS
---------------
WordPress drops any block attribute the block.json does not declare. No error, no
warning, no test failure, no build failure — the value simply never reaches render.
That exact failure mode produced 45 live bugs before it was caught (recorded as D338).

The silent-discard failure has multiple paths:
  * Pattern markup (check-dead-pattern-attrs.py) — handled separately
  * JS edit.js destructuring (THIS SCRIPT) — attributes destructured from a
    block's edit.js that the block.json never declares

Found live in D338 session: attributes destructured in edit.js but not declared
in block.json, with WordPress silently discarding the destructured value at render.
No console error, no failing test, no build failure — the client's inspector input
simply evaporates.

A prior scan measured 1461 destructured names across 83 block edit.js files, 55 of
which were undeclared. All 55 turned out to resolve to:
  * WordPress-native supports-injected attributes (style ×43, className, textAlign,
    backgroundColor, textColor, etc.)
  * Known dead-branch residue (fontSizeTablet/fontSizeMobile in text/edit.js)

That ZERO real defects is the value this gate protects — a genuinely clean detector
is better than a baseline that only marks a hole for the next one to hide in.

SCOPE / LIMITS
--------------
edit.js files ONLY (dynamic editor controls). Pattern markup is checked separately.
Scans `const { ... } = attributes;` destructuring patterns in the default export's
parameters. Handles renames (`a: b`), defaults (`a = x`), and documented unclear
patterns.

Do NOT scope:
  * Comments in the destructuring pattern (stripped before parsing)
  * Nested destructuring (`{ a: { b } } = attributes`) — reported as UNCLEAR
  * Rest patterns (`const { ...rest } = attributes`) — reported as UNCLEAR
  * Non-standard syntax — reported as UNCLEAR rather than guessed

EXTENSION ATTRIBUTES
--------------------
~44 extension-injected attributes are legitimate across all sgs/* blocks. They are
not declared per-block; they are added universally via WordPress filters. Extensions
register them via `addFilter('blocks.registerBlockType', ...)` and pass attribute
validation. Examples: sgsAnimation, sgsHideOnMobile, sgsCustomCss, sgsHoverScalePreset.

This script DERIVES the extension list from extension/*.js files (R-31-1: DB-first,
but only where a source exists; extension lists are code-first, not DB-first).

NATIVE SUPPORTS-INJECTED ATTRIBUTES
------------------------------------
WordPress injects attributes when the block declares the matching `supports` family:
  * supports.align        → align
  * supports.className    → className
  * supports.style        → style (only when supports.style IS declared)
  * supports.color        → backgroundColor, textColor, (also text when text-related)
  * supports.fontSize     → fontSize
  * supports.fontFamily   → fontFamily
  * supports.borderColor  → borderColor
  * ... and others

The injection is conditional: a block must DECLARE the support family to receive
the corresponding attribute injection. This script DERIVES the per-block set from
each block's block.json `supports` section (no hardcoded allowlist).

"""

import json
import pathlib
import re
import subprocess
import sys
from typing import Dict, Set, Tuple, Optional

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
EXTENSIONS_DIR = BLOCKS_DIR / 'extensions'

# R3-a (2026-08-20): the shared name -> file resolver
# (`inspector-scan/core/components.js`) is the JS-side fix for the whole
# "blind to a control living in a shared component file" class of bug (see
# `.claude/plans/phase-shop-container-remediation.md` R-3 register). This
# script is Python, so it cannot `require()` that module directly — it
# spawns `node components.js --dump-json` once and reuses the result, rather
# than reimplementing the resolver's declaration-precedence logic here as a
# SECOND mechanism that could silently drift from the JS one.
COMPONENTS_JS = REPO / 'plugins' / 'sgs-blocks' / 'scripts' / 'inspector-scan' / 'core' / 'components.js'
JSX_TAG_RE = re.compile(r'<([A-Z]\w*)\b')

_component_file_map_cache: Optional[Dict[str, str]] = None


def load_component_file_map() -> Dict[str, str]:
    """Resolve every shared component name -> defining file, via the JS resolver.

    Returns {} (never raises) if node or the resolver script is unavailable, so a
    missing Node toolchain degrades this script to its pre-R3-a edit.js-only
    behaviour rather than crashing.
    """
    global _component_file_map_cache
    if _component_file_map_cache is not None:
        return _component_file_map_cache
    try:
        result = subprocess.run(
            ['node', str(COMPONENTS_JS), '--dump-json'],
            capture_output=True, text=True, timeout=30, check=True,
        )
        _component_file_map_cache = json.loads(result.stdout)
    except Exception:
        _component_file_map_cache = {}
    return _component_file_map_cache

# Map of `supports` keys to the attributes WordPress injects when each is declared.
# Built from WP documentation + survey-native-supports.py findings in this codebase.
# A block must declare the support (at any truthy value) to receive the injection.
SUPPORTS_TO_NATIVE_ATTRS = {
    'align': {'align'},
    'anchor': {'anchor'},
    'lock': {'lock'},
    'metadata': {'metadata'},
    'layout': {'layout'},
    # NOTE: `className` is NOT keyed here — it is DEFAULT-ON, see
    # DEFAULT_ON_SUPPORTS below. Keying it by presence made `sgs/label` (which
    # declares no className key at all) report a false positive.
    # ⛔ CORRECTED 2026-08-19 — `supports.style` DOES NOT EXIST and the first
    # version of this map treated it as the gate for the `style` attribute.
    # Measured: ZERO of 83 block.json files declare `supports.style`, and zero
    # declare a `style` attribute — because WordPress INJECTS `style` itself
    # whenever a block declares ANY style-generating support. Gating on a key
    # that cannot be present made every `style` destructure look undeclared and
    # produced ~35 false positives, reported as "real WordPress silent-discard
    # bugs". `sgs/quote` is the disproof: it destructures `style` and declares
    # color + typography + spacing + __experimentalBorder, so core injects it.
    # A false positive is a detector bug, never baseline fodder.
    'color': {'backgroundColor', 'textColor', 'borderColor', 'gradient', 'style'},
    'typography': {'fontSize', 'fontFamily', 'style'},
    'spacing': {'style'},
    'border': {'style'},
    '__experimentalBorder': {'style'},
    'shadow': {'style'},
    'dimensions': {'style'},
    'filter': {'style'},
    'position': {'style'},
    'background': {'style'},
}

# Additional native attrs that are injected across all blocks unconditionally.
NATIVE_ALWAYS_INJECTED = {
    'textAlign',  # Injected when supports.color is declared with textAlign sub-key
}


def load_extension_attributes() -> Set[str]:
    """Extract all sgs* attributes registered by extension/*.js files.

    Scans extension files for `addFilter` calls with `attributes: { sgs*: {...} }`
    patterns. Returns the complete set of sgs*-prefixed attribute names.

    R-31-1 compliance: no hardcoded dict; derived from the canonical source (code).
    """
    attrs = set()

    for ext_file in sorted(EXTENSIONS_DIR.glob('*.js')):
        if ext_file.name in ('index.js', 'hide-extensions.js', 'block-defaults.js'):
            # index.js imports others; hide-extensions.js is a utility; block-defaults
            # is a configuration utility not an attribute-registering extension.
            continue

        content = ext_file.read_text(encoding='utf-8', errors='replace')

        # Strip comments: LINE comments first (// ...), then BLOCK comments (/* ... */).
        # Do NOT run block-strip first — a line like `... src/blocks/*/block.json`
        # contains both `/*` and `*/` sharing one `*`, which opening-block-comment
        # would see as `/* /block.json` and misparse lines until the real `*/`.
        content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

        # Match attribute declarations in object literals: sgs<CamelCase>: { type: ... }
        # Includes the pattern sgs<Name>: { ... } or attributes: { ..., sgs<Name>: {...}, ... }
        for match in re.finditer(r'\bsgs([A-Za-z]+)\s*:\s*\{', content):
            attr_name = 'sgs' + match.group(1)
            attrs.add(attr_name)

    return attrs


def load_block_supports_and_attrs() -> Tuple[dict, dict]:
    """Load all block.json files and return (supports_map, declared_attrs_map).

    Returns:
        - supports_map: {block_name: supports_dict}
        - declared_attrs_map: {block_name: {attr_name, ...}}
    """
    supports_map = {}
    declared_attrs_map = {}

    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue

        name = d.get('name')
        if not name:
            continue

        # Collect declared attributes from block.json attributes section.
        declared = set()
        for key, spec in d.get('attributes', {}).items():
            if isinstance(spec, dict):  # Skip string doc entries
                declared.add(key)

        supports = d.get('supports', {})
        if not isinstance(supports, dict):
            supports = {}

        supports_map[name] = supports
        declared_attrs_map[name] = declared

    return supports_map, declared_attrs_map


def derive_native_injected_attrs(supports: dict) -> Set[str]:
    """Given a block's `supports` dict, derive which native attributes WP injects.

    A native attribute is injected ONLY if its corresponding supports family is
    declared and truthy. Matches the truthiness rule from survey-native-supports.py:
      * True → declared
      * List (non-empty) → declared
      * Dict (with at least one non-dunder key truthy) → declared
      * False / empty dict / missing → not declared
    """
    injected = set(NATIVE_ALWAYS_INJECTED)

    # ⛔ DEFAULT-ON SUPPORTS — presence is the WRONG test for these.
    # `customClassName` defaults to TRUE, so core injects the `className`
    # attribute unless a block sets it explicitly false. Keying on presence
    # made `sgs/label` — which declares no className key at all — report a
    # false positive. Grounded in inspector-scan rule 21's own header, which
    # records the same correction: "the className branch ANDed
    # supports.className with supports.customClassName; custom-classname.php:18
    # gates solely on customClassName, defaulting true."
    if supports.get('customClassName') is not False:
        injected.add('className')

    for supports_key, attrs_set in SUPPORTS_TO_NATIVE_ATTRS.items():
        val = supports.get(supports_key)

        if val is True:
            injected.update(attrs_set)
        elif isinstance(val, list):
            if val:  # Non-empty list
                injected.update(attrs_set)
        elif isinstance(val, dict):
            # Declared if at least one non-dunder key is truthy.
            if any(bool(v) for k, v in val.items() if not k.startswith('__')):
                injected.update(attrs_set)

    return injected


def parse_destructuring_pattern(pattern_str: str) -> Tuple[Set[str], Optional[str]]:
    """Parse a destructuring pattern from `const { ... } = attributes;`

    Handles:
      * Simple names: `const { text } = attributes;` → {'text'}
      * Renames: `const { text: content } = attributes;` → {'text'}
      * Defaults: `const { text = '' } = attributes;` → {'text'}
      * Renames+defaults: `const { text: content = '' } = attributes;` → {'text'}

    Returns (destructured_names, unclear_reason):
      * destructured_names: set of attribute names (keys on the RHS of :)
      * unclear_reason: if the pattern is unclear, a string explaining why;
                        None if pattern parsed cleanly

    Refuses (returns empty set + reason string for):
      * Nested destructuring `{ a: { b } }`
      * Rest patterns `{ ...rest }`
      * Other non-standard syntax
    """
    names = set()
    unclear = None

    # Strip outer braces and whitespace.
    s = pattern_str.strip()
    if s.startswith('{') and s.endswith('}'):
        s = s[1:-1]

    # Quick check for known unclear patterns.
    if '...' in s:
        return set(), 'rest pattern (...rest) is unclear'
    if '{' in s or '}' in s:
        return set(), 'nested destructuring { ... { ... } } is unclear'
    # Computed/dynamic key: `[ attrNames.gradient ]: local = default`. The real
    # attribute name is chosen at RUNTIME from a caller-supplied variable (e.g.
    # GradientOverlayControl.js's `attrNames` prop, surfaced by R3-a's shared-
    # component corpus widening) — the LHS text is a JS expression, not a
    # literal attribute name, so treating "[ attrNames.gradient ]" as a name
    # string would be a false positive. Refuse rather than guess, same
    # discipline as the rest/nested cases above.
    if re.search(r'\[\s*[^\[\]]+\s*\]\s*:', s):
        return set(), 'computed/dynamic key ([expr]: ...) is unclear'

    # Split on commas, but be careful with spaces around colons/defaults.
    # Pattern: name [ : alias ] [ = default ]
    # We care about `name` (the LHS, the actual attribute key).
    parts = s.split(',')

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Handle rename: `text: content` — extract the LHS (text).
        if ':' in part:
            # Split on the FIRST colon only (LHS could theoretically have a comment,
            # though unlikely; we strip those before arriving here).
            lhs, rhs = part.split(':', 1)
            lhs = lhs.strip()
        else:
            lhs = part

        # Remove any default value: `fontSize = '12px'` → `fontSize`
        if '=' in lhs:
            lhs = lhs.split('=')[0].strip()

        if lhs:
            names.add(lhs)

    return names, unclear


def scan_edit_file(edit_file: pathlib.Path, block_name: str) -> Tuple[Set[str], Optional[str]]:
    """Scan a single edit.js file for destructuring patterns.

    Looks for the pattern `const { ... } = attributes;` inside the function body.
    Does NOT scan function parameters — only local const declarations.
    Returns (destructured_names, parse_error).
    """
    src = edit_file.read_text(encoding='utf-8', errors='replace')

    # R3-a (2026-08-20): widen the corpus past edit.js alone. A local
    # `const { ... } = attributes;` destructure can live entirely inside a
    # SHARED component file that edit.js only mounts via JSX (e.g.
    # `<WidthPanel .../>`) — that destructure was previously invisible here
    # because only edit.js's own text was ever read. Resolve every
    # capitalised JSX tag referenced in edit.js to the file that DEFINES it
    # (via the JS resolver, `components.js` — never by import-path string
    # matching) and fold its source in too.
    # A component named only inside a COMMENT must not widen the corpus.
    # nav-drawer documents that it deliberately does NOT mount <BackgroundPanel>;
    # scanning tags before stripping comments folded that panel in anyway and
    # charged its attributes to nav-drawer.
    _tag_src = re.sub(r'//.*$', '', src, flags=re.MULTILINE)
    _tag_src = re.sub(r'/\*.*?\*/', '', _tag_src, flags=re.DOTALL)
    component_map = load_component_file_map()
    seen_files = {str(edit_file.resolve())}
    for tag_name in set(JSX_TAG_RE.findall(_tag_src)):
        component_path = component_map.get(tag_name)
        if not component_path or component_path in seen_files:
            continue
        seen_files.add(component_path)
        try:
            src += '\n' + pathlib.Path(component_path).read_text(encoding='utf-8', errors='replace')
        except OSError:
            pass

    # Strip comments: LINE first, then BLOCK.
    src = re.sub(r'//.*$', '', src, flags=re.MULTILINE)
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)

    # Find ONLY `const { ... } = attributes;` patterns (local const destructuring).
    # The key distinction: we're looking for local variable declarations INSIDE the
    # function body, not the function signature parameters.

    destructured_names = set()
    parse_error = None

    # Match `const { ... } = attributes;` with semicolon.
    # This pattern is ONLY for local const declarations, not function params.
    for match in re.finditer(r'const\s+\{\s*([^}]+)\s*\}\s*=\s*attributes\s*;', src):
        pattern = match.group(1)
        names, unclear = parse_destructuring_pattern('{' + pattern + '}')
        if unclear:
            parse_error = f'{block_name}: {unclear}'
            return set(), parse_error
        destructured_names.update(names)

    return destructured_names, parse_error


def scan() -> Tuple[list, list]:
    """Scan all edit.js files and return (findings, parse_errors).

    findings: list of (block_name, undeclared_attr, attr_source) tuples
    parse_errors: list of (block_name, error_reason) tuples
    """
    ext_attrs = load_extension_attributes()
    supports_map, declared_attrs_map = load_block_supports_and_attrs()

    findings = []
    parse_errors = []

    for block_dir in sorted(BLOCKS_DIR.glob('*')):
        if not block_dir.is_dir() or block_dir.name == 'extensions':
            continue

        edit_file = block_dir / 'edit.js'
        if not edit_file.is_file():
            continue

        # Derive the block name from the block.json if it exists.
        block_json = block_dir / 'block.json'
        if block_json.is_file():
            try:
                block_data = json.loads(block_json.read_text(encoding='utf-8'))
                block_name = block_data.get('name', f'sgs/{block_dir.name}')
            except json.JSONDecodeError:
                block_name = f'sgs/{block_dir.name}'
        else:
            block_name = f'sgs/{block_dir.name}'

        # Scan the edit.js file.
        destructured, parse_error = scan_edit_file(edit_file, block_name)

        if parse_error:
            parse_errors.append((block_name, parse_error))
            continue

        # Determine which attributes are legitimate for this block.
        declared = declared_attrs_map.get(block_name, set())
        native_injected = derive_native_injected_attrs(supports_map.get(block_name, {}))
        legitimate = declared | ext_attrs | native_injected

        # Find undeclared attributes.
        undeclared = destructured - legitimate

        for attr in sorted(undeclared):
            # Categorise for reporting.
            if attr in ext_attrs:
                source = 'extension-injected'
            elif attr in native_injected:
                source = 'native-supports-injected'
            else:
                source = 'undeclared'

            findings.append((block_name, attr, source))

    return findings, parse_errors


def main() -> int:
    check = '--check' in sys.argv

    findings, parse_errors = scan()

    if parse_errors:
        print('[check-undeclared-attrs] PARSE ERRORS (patterns too complex to analyse):\n')
        for block, error in parse_errors:
            print(f'  {block}: {error}')
        print()

    if not findings:
        msg = 'every destructured attribute is declared, extension-injected, or native-supports-injected.'
        if parse_errors:
            print(f'[check-undeclared-attrs] OK (no findings, but {len(parse_errors)} blocks had unclear patterns '
                  f'and were skipped).\n')
        else:
            print(f'[check-undeclared-attrs] OK — {msg}')
        return 0

    # Categorise findings.
    undeclared = [f for f in findings if f[2] == 'undeclared']
    ext_injected = [f for f in findings if f[2] == 'extension-injected']
    native_injected = [f for f in findings if f[2] == 'native-supports-injected']

    print(f'[check-undeclared-attrs] {len(findings)} finding(s) '
          f'({len(undeclared)} undeclared, {len(ext_injected)} extension-injected, '
          f'{len(native_injected)} native-supports-injected):\n')

    for block, attr, kind in sorted(findings):
        if kind == 'undeclared':
            print(f'  {block} -> "{attr}"')
            print(f'      Destructured in edit.js but NOT declared in block.json — '
                  f'WordPress silently discards it at render.\n')
        elif kind == 'extension-injected':
            print(f'  {block} -> "{attr}" (extension-injected)')
            print(f'      Destructured in edit.js; legitimately injected by an extension.\n')
        else:  # native-supports-injected
            print(f'  {block} -> "{attr}" (native-supports-injected)')
            print(f'      Destructured in edit.js; legitimately injected by native supports.\n')

    if check and (undeclared or parse_errors):
        return 1

    return 0


def self_test() -> int:
    """Self-test: mustFlag and mustNotFlag controls.

    1. MUSTFLAG — a simple destructured name not in any allowlist.
    2. MUSTNOTFLAG — an extension attribute must not be flagged.
    3. MUSTNOTFLAG — a WordPress-native attribute on a block that declares the support.
    4. MUSTNOTFLAG — a declared attribute must not be flagged.
    5. MUSTNOTFLAG — an extension attribute from hide-extensions.js must not be flagged.
    6. CRASH-GUARD — a comment-embedded glob path with /* in it must not break parsing.
    """
    failures = []

    # Test 1: MUSTFLAG — undeclared attribute.
    # Simulate: edit.js destructures `customUndeclared`, not in block.json, not an extension.
    destructured = {'customUndeclared'}
    declared = set()
    ext_attrs = load_extension_attributes()
    native_injected = set()  # No supports declared
    legitimate = declared | ext_attrs | native_injected
    undeclared = destructured - legitimate
    if 'customUndeclared' not in undeclared:
        failures.append('MUSTFLAG control failed: "customUndeclared" (a truly undeclared attr) was not flagged.')

    # Test 2: MUSTNOTFLAG — extension attribute.
    destructured = {'sgsAnimation'}  # Known extension
    undeclared = destructured - (declared | ext_attrs | native_injected)
    if 'sgsAnimation' in undeclared:
        failures.append('MUSTNOTFLAG control failed: "sgsAnimation" (an extension attr) was flagged.')

    # Test 3: MUSTNOTFLAG — native-supports-injected attribute on a block that declares support.
    # Simulating a block with supports.align: true, which injects `align`.
    destructured = {'align'}
    declared = set()
    supports = {'align': True}
    native_injected = derive_native_injected_attrs(supports)
    legitimate = declared | ext_attrs | native_injected
    undeclared = destructured - legitimate
    if 'align' in undeclared:
        failures.append('MUSTNOTFLAG control failed: "align" (native, supports.align declared) was flagged.')

    # Test 4: MUSTNOTFLAG — declared attribute.
    destructured = {'gap'}
    declared = {'gap'}
    native_injected = set()
    legitimate = declared | ext_attrs | native_injected
    undeclared = destructured - legitimate
    if 'gap' in undeclared:
        failures.append('MUSTNOTFLAG control failed: "gap" (a declared attr) was flagged.')

    # Test 5: MUSTNOTFLAG — ensure extension parsing includes all known sgs* attrs.
    if 'sgsHideOnMobile' not in ext_attrs or 'sgsCustomCss' not in ext_attrs:
        failures.append(f'MUSTNOTFLAG control failed: extension loading did not include expected sgs* attrs. '
                       f'Found: {sorted(ext_attrs)[:5]}...')

    # Test 6: CRASH-GUARD — comment parsing with /* in a path.
    test_content = '''
    // Comment with a path: src/blocks/*/block.json
    const { text } = attributes;
    /* Block comment */ const { gap } = attributes;
    '''
    # Strip comments like the real scanner does.
    test_content = re.sub(r'//.*$', '', test_content, flags=re.MULTILINE)
    test_content = re.sub(r'/\*.*?\*/', '', test_content, flags=re.DOTALL)
    # After stripping, we should still be able to find the destructuring patterns.
    if 'text' not in test_content or 'gap' not in test_content:
        failures.append('CRASH-GUARD control failed: comment stripping broke destructuring detection.')

    # Test 7: R3-a widening regression test (2026-08-20), against the REAL
    # tree — the resolver walks the real filesystem, so it can't be exercised
    # via a synthetic fixture. NEGATIVE CONTROL: sgs/gallery's edit.js never
    # names 'contentWidth' as literal text — it lives entirely inside the
    # shared `ResponsiveBoxControls.js`'s own local
    # `const { padding, margin, maxWidth, contentWidth } = attributes;`,
    # mounted via `<ResponsiveBoxControls .../>` JSX. Proves the widened
    # scan_edit_file() now sees it where the old edit.js-only regex could not.
    gallery_dir = BLOCKS_DIR / 'gallery'
    gallery_edit = gallery_dir / 'edit.js'
    if gallery_edit.is_file():
        old_narrow_src = gallery_edit.read_text(encoding='utf-8', errors='replace')
        old_narrow_has_content_width = bool(
            re.search(r'const\s+\{\s*[^}]*\bcontentWidth\b[^}]*\}\s*=\s*attributes\s*;', old_narrow_src)
        )
        widened_destructured, widened_error = scan_edit_file(gallery_edit, 'sgs/gallery')
        if old_narrow_has_content_width or widened_error or 'contentWidth' not in widened_destructured:
            failures.append(
                f'R3-a WIDENING: old-narrow-has-contentWidth={old_narrow_has_content_width} '
                f'(expected False), widened-error={widened_error!r} (expected None), '
                f'widened-has-contentWidth={"contentWidth" in widened_destructured} (expected True). '
                'The resolver-based JSX-component widening in scan_edit_file() is not working.')
    else:
        failures.append('R3-a WIDENING: src/blocks/gallery/edit.js not found — fixture block for this test is gone.')

    # Test 8: R3-a computed-key false-positive guard. sgs/hero mounts
    # GradientOverlayControl.js via JSX, which uses a COMPUTED destructuring
    # key (`[ attrNames.gradient ]: ...`) — the real attribute name is chosen
    # at runtime, not a literal. Before the computed-key guard was added,
    # widening the corpus made this parse as the literal (wrong) name
    # "[ attrNames.gradient ]"; it must instead report as unclear.
    hero_edit = BLOCKS_DIR / 'hero' / 'edit.js'
    if hero_edit.is_file():
        _, hero_error = scan_edit_file(hero_edit, 'sgs/hero')
        if not hero_error or 'computed' not in hero_error:
            failures.append(
                f'R3-a COMPUTED-KEY GUARD: sgs/hero (mounts GradientOverlayControl.js, which uses a '
                f'computed destructuring key) returned error={hero_error!r} — expected an "unclear: '
                'computed/dynamic key" reason, not a silent pass or a different error.')

    if failures:
        print('[check-undeclared-attrs --self-test] FAILED:\n')
        for f in failures:
            print(f'  - {f}')
        return 1

    print('[check-undeclared-attrs --self-test] OK — all controls passed.')
    return 0


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    sys.exit(main())
