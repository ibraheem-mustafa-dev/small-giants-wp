#!/usr/bin/env python3
"""Codemod: swap the flat-sibling <ResponsiveBoxControl> wiring for the
tier-of-boxes <ResponsiveOverride> + SgsBoxControl wiring, for one box-family
property (padding / margin / borderRadius) across every block that carries
the EXACT canonical JSX shape.

WHY THIS EXISTS
---------------
Phase 2 (tier-object migration) proved via `migrate-tier-object.py`'s new
BOX_FLAT classifier that padding/margin/borderRadius are still declared as
three flat sibling attributes on most blocks, joined only by a `boxFamilies`
map. The FIX (block.json fold + edit.js control swap) is the SAME two-layer
change already proven safe on `sgs/container` this session — and every other
block's edit.js JSX for this control is byte-identical to container's (down
to the comment text: "mirrors sgs/container's edit.js"). This is a single
mechanical shape, not one migration per block — this script matches it once
and applies it everywhere it matches exactly, refusing (never guessing) on
anything that doesn't.

The shared PHP render mechanism (`class-sgs-container-wrapper.php`, one file,
every block) needs NO changes — verified this session (standalone PHP
execution of the real `sgs_emit_responsive_css()` against both shapes) that
it already reads either shape correctly via `sgs_responsive_normalise_object()`.
This script therefore touches only block.json + edit.js.

TRIAD: --survey (census) -> --fix [--apply] (dry-run diff / write) -> --check
(gate) -> --self-test.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

# Corner-keyed properties nest {topLeft,topRight,bottomRight,bottomLeft} per
# tier instead of {top,right,bottom,left} — the CLAUDE.md canonical contract
# (Phase 2, Step 4). borderRadius is the only one today.
CORNER_PROPS = {'borderRadius'}


def block_json_path(block_dir: Path) -> Path:
    return block_dir / 'block.json'


def classify_block_json(data: dict, prop: str):
    """Return 'FLAT_TRIO' if base+Tablet+Mobile are declared as 3 separate
    object attrs (the shape to fold), 'FOLDED' if already one tier-object
    attr, 'ABSENT' otherwise. Mirrors migrate-tier-object.py's BOX_FLAT
    reasoning but scoped to disk only (no DB dependency needed here — the
    caller already ran the DB-backed survey to pick this property/block)."""
    attrs = data.get('attributes', {})
    base = attrs.get(prop)
    tablet = attrs.get(prop + 'Tablet')
    mobile = attrs.get(prop + 'Mobile')
    if not isinstance(base, dict):
        return 'ABSENT'
    if base.get('type') != 'object':
        return 'ABSENT'
    has_tablet = isinstance(tablet, dict) and tablet.get('type') == 'object'
    has_mobile = isinstance(mobile, dict) and mobile.get('type') == 'object'
    if has_tablet or has_mobile:
        return 'FLAT_TRIO'
    # No siblings at all — either already folded, or a base-only box (borderWidth-
    # style, not in scope for this script since it was never a 3-part family).
    default = base.get('default')
    if isinstance(default, dict) and 'desktop' in default:
        return 'FOLDED'
    return 'ABSENT'


def fix_block_json(block_dir: Path, prop: str, apply: bool):
    """Fold `prop`/`propTablet`/`propMobile` into one tier-of-boxes attribute
    and update `boxFamilies` to the self-referential form. Returns
    (changed: bool, diff_summary: str, error: str|None)."""
    bj = block_json_path(block_dir)
    text = bj.read_text(encoding='utf-8')
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        return False, '', f'invalid JSON: {exc}'

    attrs = data.get('attributes', {})
    state = classify_block_json(data, prop)
    if state != 'FLAT_TRIO':
        return False, '', f'block.json is not a FLAT_TRIO for "{prop}" (state={state})'

    base_spec = attrs[prop]
    old_default = base_spec.get('default')
    # Preserve any real (non-empty) authored default as the desktop tier, same
    # convention migrate-tier-object.py uses for the scalar case.
    new_default = {'desktop': old_default if isinstance(old_default, dict) else {}}
    new_spec = {'type': 'object', 'default': new_default}
    if 'description' in base_spec:
        new_spec['description'] = base_spec['description']
    attrs[prop] = new_spec
    attrs.pop(prop + 'Tablet', None)
    attrs.pop(prop + 'Mobile', None)

    # boxFamilies -> self-referential form (matches contentBandPadding's shape).
    supports = data.get('supports', {}).get('sgs', {})
    box_families = supports.get('boxFamilies')
    bf_changed = False
    if isinstance(box_families, dict) and prop in box_families:
        if box_families[prop] != [prop]:
            box_families[prop] = [prop]
            bf_changed = True

    if not apply:
        return True, f'would fold {prop}/{prop}Tablet/{prop}Mobile -> {prop} (object, tier-of-boxes)' \
            + (f'; boxFamilies["{prop}"] -> ["{prop}"]' if bf_changed else ''), None

    bj.write_text(json.dumps(data, indent='\t', ensure_ascii=False) + '\n', encoding='utf-8')
    return True, f'folded {prop} in {bj.relative_to(REPO)}', None


# --- edit.js JSX transform -----------------------------------------------

def _make_pattern(prop: str) -> re.Pattern:
    """The canonical <ResponsiveBoxControl> shape, tolerant of leading
    whitespace/indentation depth and of the optional `presets` flag and
    trailing comment block inside onChange, but otherwise requiring an EXACT
    structural match: `values={{base:attrs.PROP, tablet:attrs.PROPTablet,
    mobile:attrs.PROPMobile}}` and the canonical `attrFor` breakpoint map
    inside onChange. Any deviation refuses to match (UNCLEAR), never guesses.
    """
    p = re.escape(prop)
    return re.compile(
        r'([ \t]*)<ResponsiveBoxControl\n'
        r'\s*label=\{\s*__\(\s*([\'"])((?:(?!\2).)*)\2\s*,\s*[\'"]sgs-blocks[\'"]\s*\)\s*\}\n'
        r'(\s*presets\n)?'
        r'\s*values=\{\s*\{\n'
        r'\s*base:\s*attributes\.' + p + r'\s*\?\?\s*\{\}\s*,\n'
        r'\s*tablet:\s*attributes\.' + p + r'Tablet\s*\?\?\s*\{\}\s*,\n'
        r'\s*mobile:\s*attributes\.' + p + r'Mobile\s*\?\?\s*\{\}\s*,\n'
        r'\s*\}\s*\}\n'
        r'\s*onChange=\{\s*\(\s*tier,\s*next\s*\)\s*=>\s*\{\n'
        r'(?:(?!\}\s*\}\s*\n\s*/>).)*?'  # any comment/body, non-greedy, up to the closing
        r'const\s+attrFor\s*=\s*\{\s*base:\s*[\'"]' + p + r'[\'"]\s*,\s*tablet:\s*[\'"]'
        + p + r'Tablet[\'"]\s*,\s*mobile:\s*[\'"]' + p + r'Mobile[\'"]\s*\}\s*;\n'
        r'\s*setAttributes\(\s*\{\s*\[\s*attrFor\[\s*tier\s*\]\s*\]:\s*next\s*\}\s*\)\s*;\n'
        r'\s*\}\s*\}\n'
        r'([ \t]*)/>',
        re.MULTILINE | re.DOTALL,
    )


# --- borderRadius: a DIFFERENT shape, feeding SgsBorderControl's own
# radiusValues/onRadiusChange composite prop pair rather than a bare
# <ResponsiveBoxControl>. SgsBorderControl's external API is unchanged (it
# still wants {base,tablet,mobile}); only the block's OWN source/write of
# those three values changes, from three flat attributes to one tier-object
# (whose first key is 'desktop', not 'base' -- SgsBorderControl's own
# vocabulary predates the tier-object convention and is not being renamed
# here, only adapted at the call site).
_RADIUS_VALUE_RE_TEMPLATE = (
    r'radiusValues=\{\s*\{\n'
    r'\s*base:\s*attributes\.borderRadius\s*\?\?\s*\{\}\s*,\n'
    r'\s*tablet:\s*(?:attributes\.)?borderRadiusTablet\s*\?\?\s*\{\}\s*,\n'
    r'\s*mobile:\s*(?:attributes\.)?borderRadiusMobile\s*\?\?\s*\{\}\s*,\n'
    r'\s*\}\s*\}\n'
    r'(\s*)onRadiusChange=\{\s*\(\s*tier,\s*next\s*\)\s*=>\s*\{\n'
    r'\s*const\s+radiusKey\s*=\s*tier\s*===\s*[\'"]base[\'"]\s*\?\s*[\'"]borderRadius[\'"]\s*:\s*'
    r'tier\s*===\s*[\'"]tablet[\'"]\s*\?\s*[\'"]borderRadiusTablet[\'"]\s*:\s*[\'"]borderRadiusMobile[\'"]\s*;\n'
    r'\s*setAttributes\(\s*\{\s*\[\s*radiusKey\s*\]:\s*next\s*\}\s*\)\s*;\n'
    r'(\s*)\}\s*\}'
)
_RADIUS_PATTERN = re.compile(_RADIUS_VALUE_RE_TEMPLATE, re.MULTILINE)


def radius_edit_js_state(edit_js: Path):
    if not edit_js.exists():
        return 'ABSENT', None
    src = edit_js.read_text(encoding='utf-8')
    m = _RADIUS_PATTERN.search(src)
    if m:
        return 'LEGACY', m
    if 'radiusValues' in src and 'borderRadiusTablet' in src:
        return 'UNCLEAR', None
    return 'ABSENT', None


def fix_radius_edit_js(block_dir: Path, apply: bool):
    edit_js = block_dir / 'edit.js'
    state, match = radius_edit_js_state(edit_js)
    if state != 'LEGACY':
        return False, '', f'edit.js is {state} for "borderRadius" (radius shape) — refusing'

    src = edit_js.read_text(encoding='utf-8')
    indent1 = match.group(1)
    indent2 = match.group(2)
    ob, cb = '{', '}'  # brace literals, kept out of the f-strings below for readability
    set_line = (
        f'{indent1}\tsetAttributes( {ob} borderRadius: {ob} ...attributes.borderRadius, '
        f'[ key ]: next {cb} {cb} );'
    )
    replacement = (
        'radiusValues={ {\n'
        '\t\t\t\t\t\t\t\tbase: attributes.borderRadius?.desktop ?? {},\n'
        '\t\t\t\t\t\t\t\ttablet: attributes.borderRadius?.tablet ?? {},\n'
        '\t\t\t\t\t\t\t\tmobile: attributes.borderRadius?.mobile ?? {},\n'
        '\t\t\t\t\t\t\t} }\n'
        f'{indent1}onRadiusChange={ob} ( tier, next ) => {ob}\n'
        f'{indent1}\tconst key = tier === \'base\' ? \'desktop\' : tier;\n'
        f'{set_line}\n'
        f'{indent2}{cb} {cb}'
    )
    new_src = src[:match.start()] + replacement + src[match.end():]

    if not apply:
        return True, f'would rewrite radiusValues/onRadiusChange for borderRadius in {edit_js.relative_to(REPO)}', None
    edit_js.write_text(new_src, encoding='utf-8')
    return True, f'rewrote radius wiring in {edit_js.relative_to(REPO)}', None


def edit_js_state(edit_js: Path, prop: str):
    """Return ('LEGACY', match) if the exact canonical shape is found,
    ('ABSENT', None) if no <ResponsiveBoxControl> for this prop appears at
    all, or ('UNCLEAR', None) if the prop is referenced but doesn't match the
    exact shape (needs a human look, never auto-fixed)."""
    if not edit_js.exists():
        return 'ABSENT', None
    src = edit_js.read_text(encoding='utf-8')
    pattern = _make_pattern(prop)
    m = pattern.search(src)
    if m:
        return 'LEGACY', m
    # Does the prop appear at all in a ResponsiveBoxControl context?
    if re.search(r'<ResponsiveBoxControl[\s\S]{0,400}?attributes\.' + re.escape(prop) + r'\b', src):
        return 'UNCLEAR', None
    return 'ABSENT', None


def _replacement(prop: str, label: str, presets: bool, indent: str, closing_indent: str) -> str:
    box_control = 'SgsBoxControl' if presets else 'BoxControl'
    presets_line = f'{indent}\t\t\tpresets\n' if presets else ''
    return (
        f'{indent}<ResponsiveOverride\n'
        f'{indent}\tvalue={{ attributes.{prop} }}\n'
        f'{indent}\tonChange={{ ( obj ) => setAttributes( {{ {prop}: obj }} ) }}\n'
        f'{indent}>\n'
        f'{indent}\t{{ ( {{ ownValue, setOwnValue }} ) => (\n'
        f'{indent}\t\t<{box_control}\n'
        f'{indent}\t\t\tlabel={{ __( \'{label}\', \'sgs-blocks\' ) }}\n'
        f'{indent}\t\t\tvalues={{ ownValue && typeof ownValue === \'object\' ? ownValue : {{}} }}\n'
        f'{indent}\t\t\tunits={{ BOX_UNITS }}\n'
        f'{presets_line}'
        f'{indent}\t\t\tonChange={{ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }}\n'
        f'{indent}\t\t/>\n'
        f'{indent}\t) }}\n'
        f'{closing_indent}</ResponsiveOverride>'
    )


REQUIRED_IMPORTS = ('ResponsiveOverride', 'BOX_UNITS', 'normaliseResponsiveBox')


def ensure_imports(src: str, needs_sgs_box_control: bool) -> str:
    """Add any of the required named imports to the existing
    `from "../../components"` (or '../../components') import line if missing.
    Refuses (returns src unchanged, caller checks) if no such import line
    exists at all — never invents a new import statement location."""
    wanted = list(REQUIRED_IMPORTS) + (['SgsBoxControl'] if needs_sgs_box_control else [])
    m = re.search(r'import\s*\{([^}]*)\}\s*from\s*(["\'])\.\./\.\./components\2\s*;', src)
    if not m:
        return None
    names = [n.strip() for n in m.group(1).split(',') if n.strip()]
    added = False
    for w in wanted:
        if w not in names:
            names.append(w)
            added = True
    if not added:
        return src
    new_import = 'import { ' + ', '.join(names) + ' } from "' + m.group(2).replace('"', '') + '../../components' + m.group(2).replace('"', '') + '";'
    # Simpler: rebuild using the original quote char.
    q = m.group(2)
    new_import = f'import {{ {", ".join(names)} }} from {q}../../components{q};'
    return src[:m.start()] + new_import + src[m.end():]


def fix_edit_js(block_dir: Path, prop: str, apply: bool):
    edit_js = block_dir / 'edit.js'
    state, match = edit_js_state(edit_js, prop)
    if state != 'LEGACY':
        return False, '', f'edit.js is {state} for "{prop}" — refusing (not an exact LEGACY match)'

    src = edit_js.read_text(encoding='utf-8')
    # Real label text captured from THIS file's own control, never a hardcoded
    # per-property map — a prefixed family (e.g. splitMediaPadding) may label
    # itself differently ("Split media padding") from the plain family.
    label = match.group(3)
    presets = bool(match.group(4))
    indent = match.group(1)
    closing_indent = match.group(5)
    replacement = _replacement(prop, label, presets, indent, closing_indent)
    new_src = src[:match.start()] + replacement + src[match.end():]

    with_imports = ensure_imports(new_src, needs_sgs_box_control=presets)
    if with_imports is None:
        return False, '', 'could not find a "../../components" import line to extend — refusing'
    new_src = with_imports

    if not apply:
        return True, f'would rewrite <ResponsiveBoxControl> ({label}) -> <ResponsiveOverride>+' \
            f'{"SgsBoxControl" if presets else "BoxControl"} in {edit_js.relative_to(REPO)}', None

    edit_js.write_text(new_src, encoding='utf-8')
    return True, f'rewrote {label} control in {edit_js.relative_to(REPO)}', None


# --- driver ----------------------------------------------------------------

def survey(prop: str):
    rows = []
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        block_dir = bj.parent
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        bjson_state = classify_block_json(data, prop)
        if bjson_state == 'ABSENT':
            continue
        if prop == 'borderRadius':
            ejs_state, _ = radius_edit_js_state(block_dir / 'edit.js')
        else:
            ejs_state, _ = edit_js_state(block_dir / 'edit.js', prop)
        rows.append({
            'slug': data.get('name', block_dir.name),
            'dir': block_dir,
            'blockjson': bjson_state,
            'editjs': ejs_state,
        })
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--property')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    if not args.property:
        ap.error('--property is required')
    prop = args.property
    rows = survey(prop)

    if args.survey or not (args.fix or args.check):
        for r in rows:
            print(f"  {r['slug']:28} block.json={r['blockjson']:10} edit.js={r['editjs']}")
        n = sum(1 for r in rows if r['blockjson'] == 'FLAT_TRIO')
        print(f'\n{n} block(s) with a FLAT_TRIO block.json shape for "{prop}".')
        n_legacy = sum(1 for r in rows if r['editjs'] == 'LEGACY')
        print(f'{n_legacy} block(s) with the exact canonical LEGACY edit.js wiring (auto-fixable).')
        n_unclear = sum(1 for r in rows if r['editjs'] == 'UNCLEAR')
        if n_unclear:
            print(f'{n_unclear} block(s) UNCLEAR edit.js wiring — needs individual review:')
            for r in rows:
                if r['editjs'] == 'UNCLEAR':
                    print(f"   {r['slug']}")
        return 0

    if args.fix:
        for r in rows:
            if r['blockjson'] != 'FLAT_TRIO' or r['editjs'] != 'LEGACY':
                continue
            ok_bj, desc_bj, err_bj = fix_block_json(r['dir'], prop, apply=args.apply)
            if prop == 'borderRadius':
                ok_ej, desc_ej, err_ej = fix_radius_edit_js(r['dir'], apply=args.apply)
            else:
                ok_ej, desc_ej, err_ej = fix_edit_js(r['dir'], prop, apply=args.apply)
            tag = 'APPLY' if args.apply else 'DRY-RUN'
            print(f"[{tag}] {r['slug']}")
            print(f"   block.json: {'OK  ' if ok_bj else 'SKIP'} {desc_bj or err_bj}")
            print(f"   edit.js:    {'OK  ' if ok_ej else 'SKIP'} {desc_ej or err_ej}")
        return 0

    if args.check:
        bad = [r for r in rows if r['blockjson'] == 'FLAT_TRIO']
        if bad:
            print(f'[migrate-box-control-wiring --check] {len(bad)} block(s) still FLAT_TRIO for "{prop}":')
            for r in bad:
                print(f"   {r['slug']}")
            return 1
        print(f'[migrate-box-control-wiring --check] OK — no FLAT_TRIO blocks remain for "{prop}".')
        return 0

    return 0


if __name__ == '__main__':
    sys.exit(main())
