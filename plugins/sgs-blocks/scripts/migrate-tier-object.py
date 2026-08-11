#!/usr/bin/env python3
"""migrate-tier-object.py — collapse a flat per-device attribute trio into ONE tier object.

    <prop> / <prop>Tablet / <prop>Mobile   ->   <prop>: {"desktop":…, "tablet":…, "mobile":…}

Spec 35 / D549 / D554. Bean's ruling A is PROPERTY-BY-PROPERTY: one property is migrated
across every block that carries it, then the next. This script takes `--property` and does
exactly that, so each pass is the same edit repeated rather than 41 bespoke edits.

THE TRIAD (D542, and the reason this file exists at all): the thing that finds every
instance, the thing that fixes them and the thing that keeps them fixed are the SAME
detector. `--survey` (census) -> `--fix` (propose a diff) -> `--check` (gate).
⛔ `--fix` NEVER writes without `--apply`. Modelled on scripts/migrate-core-blocks/
(README.md:24 "lint -> judge -> apply"), and it copies that tool's load-bearing rule
(README.md:22): every source attr is mapped, dropped-with-reason, or flagged — a LOUD
failure, never a quiet loss.

WHAT IT DOES NOT DO, deliberately
---------------------------------
* **No stored-content migration.** Ruling B: old canary pages are binned, not converted.
  ⚠ Consequence, and it is not hypothetical — measured on the canary 2026-08-10 for `gap`:
  1,058 stored flat values across 230 posts (31 published, 7 draft, 191 revisions). Every
  one is silently coerced to the `{}` default by WordPress once the attr is object-typed,
  because WP discards a value whose shape contradicts the declaration. Those pages render
  with the CSS default until re-cloned. That is the accepted trade, not an oversight.
* **No render.php REWRITING (S3).** What matters for a render.php read isn't the read
  itself, it's what the surrounding code DOES with the value afterwards — trim()? cast?
  is_array() check? — a judgement call, not a schema edit. This is exactly where D569's
  and D570's real regressions lived (a `trim((string)$attr)` coercing an object to the
  literal string "Array"), so this script only DETECTS a RAW read (`render_state`) and
  never rewrites it. Blocks that delegate entirely to SGS_Container_Wrapper need no
  render.php change at all: the wrapper already reads an object value
  (class-sgs-container-wrapper.php:1948).
* **edit.js REWRITING (S2) is auto-applied, narrowly.** See `fix_edit_js` below — this is
  the one exception to "no JS/PHP rewriting", because the LEGACY control shape turned out
  to be a genuinely repeatable structural pattern (proven against two real historical
  examples, not assumed), unlike render.php's judgement-call problem above.

WHAT IT DOES DO (added Spec 35 pass 3b, 2026-08-11 — D571): CLASSIFY render.php and edit.js
state, not just count references. Session 6/7 evidence for why this exists: pass 3b's first
two dispatch attempts burned real agent time (one ~13 min, one duplicated in parallel for
another ~14 min — see D570) hand-re-reading every block's edit.js/render.php to answer "is
this ALREADY migrated, or does it still need the edit?", because the OLD `render_reads`/
`edit_refs` fields were raw regex hit-counts that stayed non-zero even on an already-correct
file (e.g. `value={ attributes.prop }` inside a working `<ResponsiveOverride>` still matches
a bare `\bprop\b` regex). `--survey` now reports an actual STATE per layer:

    render_state:  DELEGATED   prop never appears in render.php — wrapper handles it, done
                    NORMALISED prop is read via sgs_responsive_normalise_object(), done
                    RAW        prop is read as a raw $attributes['prop'] bracket access —
                               STILL NEEDS the render.php edit
                    UNCLEAR    prop appears but matches neither pattern — READ IT BY HAND,
                               never assume from this field alone

    edit_state:    SHARED      edit.js imports LayoutPanel/ContainerWrapperControls and does
                                NOT also locally destructure/wire this prop — the shared
                                component (fixed once) covers it, done
                    OVERRIDDEN a local <ResponsiveOverride> is wired directly to the object
                                attr (value={attributes.prop}, onChange writes prop: obj),
                                done
                    LEGACY      prop appears via the old flat-attrMap/ResponsiveControl
                                bridging pattern — STILL NEEDS the edit.js edit
                    UNCLEAR     prop appears but matches neither pattern — READ IT BY HAND
                    NONE        prop never appears in edit.js and no shared import found —
                                block does not expose a control for it at all

⛔ UNCLEAR is a REFUSAL to guess, same discipline as the block.json `--fix` refusing to write
invalid JSON. A human (or an agent) reads that specific file before touching it. This
classifier is pattern-matching, not a parser — it will not catch every future JSX/PHP
reshaping of these two controls, so if the shared components change shape again, update the
regexes here in the SAME commit (see `_EDIT_JS_OVERRIDE_RE`/`_RENDER_NORMALISED_RE` below).

`--fix` still only writes block.json (S1). render.php (S3) and edit.js (S2) fixes are NOT
auto-applied by this script — the survey tells you exactly which blocks need them and in
which file, so route those to a human or a small parallel per-block dispatch, not a script
that guesses at JSX. See `plugins/sgs-blocks/CLAUDE.md` "Survey detectors" section for how
this fits the wider census -> fix -> gate triad (D542).

THE THREE FAMILY SHAPES, and why only one of them is a target
-------------------------------------------------------------
    FLAT      base scalar + Tablet/Mobile siblings          -> MIGRATE
    BLENDED   base object + scalar siblings (half-migrated) -> DROP the orphan siblings
    OBJECT    base object, no siblings                      -> already done, skip

⛔ A base object WITH OBJECT siblings is NOT blended and is NOT a target: a per-tier ASSET
family (D521) and a per-tier BOX family (D496) are object at every tier by design. The
sibling's TYPE must differ from the base for the family to be half-migrated — same
discriminator as check-tier-storage-shape.py, deliberately, so gate and codemod agree.
"""

import argparse
import io
import json
import re
import sys
from pathlib import Path

# Windows consoles default to cp1252 and raise UnicodeEncodeError on any non-ASCII
# output — which would crash this tool AFTER it had already written files, leaving a
# half-applied migration. Standing repo rule for Python scripts on this machine.
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
TIERS = ('Tablet', 'Mobile')


def classify(attrs: dict, prop: str):
    """Return (kind, sibling_names). kind in FLAT|BLENDED|OBJECT|ASSET|ABSENT."""
    spec = attrs.get(prop)
    if not isinstance(spec, dict):
        return 'ABSENT', []
    base_type = spec.get('type')
    sibs = [prop + t for t in TIERS if isinstance(attrs.get(prop + t), dict)]
    if base_type == 'object':
        if not sibs:
            return 'OBJECT', []
        # Sibling type must DIFFER from the base for this to be half-migrated.
        if all(attrs[s].get('type') == 'object' for s in sibs):
            return 'ASSET', sibs          # consistent per-tier object family — correct as-is
        return 'BLENDED', sibs
    return ('FLAT', sibs) if sibs else ('ABSENT', [])


def reads_attr_directly(block_dir: Path, prop: str) -> int:
    rp = block_dir / 'render.php'
    if not rp.exists():
        return 0
    src = rp.read_text(encoding='utf-8', errors='replace')
    return len(re.findall(r"\[['\"]" + re.escape(prop) + r"(?:Tablet|Mobile)?['\"]\]", src))


def edit_refs(block_dir: Path, prop: str) -> int:
    ej = block_dir / 'edit.js'
    if not ej.exists():
        return 0
    src = ej.read_text(encoding='utf-8', errors='replace')
    return len(re.findall(r"\b" + re.escape(prop) + r"(?:Tablet|Mobile)?\b", src))


# Added D571 (Spec 35 pass 3b, 2026-08-11) — see the module docstring's
# "WHAT IT DOES DO" section for why these exist and what they refuse to guess at.

_SHARED_CONTROL_IMPORT_RE = re.compile(r'\b(?:LayoutPanel|ContainerWrapperControls)\b')


def _strip_php_comments(src: str) -> str:
    """Best-effort // and /* */ comment stripping, so a comment EXPLAINING what code
    used to read (e.g. "gap is consumed from $attributes['gap']") doesn't get
    classified as the code itself — confirmed against trust-bar/render.php:65, whose
    prose comment produced a false RAW finding before this was added. Not a real PHP
    parser (per the module docstring's own caveat) — a `//` inside a string literal
    would still be mis-stripped, but render.php files in this codebase don't do that
    next to attribute reads."""
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)
    src = re.sub(r'//[^\n]*', '', src)
    return src


def render_state(block_dir: Path, prop: str) -> str:
    """Classify how render.php currently reads `prop`. See module docstring."""
    rp = block_dir / 'render.php'
    if not rp.exists():
        return 'DELEGATED'
    src = _strip_php_comments(rp.read_text(encoding='utf-8', errors='replace'))
    # A bare \bprop\b also matches plain-English prose — a docblock listing "gap" as a
    # feature, or "a real WCAG 2.1 gap" — which is not a code usage. Require a code-like
    # marker ($, ' or ") immediately before the token: `$gap`, `$attributes['gap']`,
    # `"gap"`. Confirmed against form/render.php:8,301, which mention "gap" only in
    # prose and correctly fall through to DELEGATED once this gate is applied.
    if not re.search(r"[\$'\"]" + re.escape(prop) + r"\b", src):
        return 'DELEGATED'
    # NORMALISED: the object is read through the shared normaliser. Real call shape
    # (confirmed against gallery/render.php:58) is POSITIONAL —
    # `sgs_responsive_normalise_object( $attributes['prop'] ?? null )` — the helper
    # never takes the property name as a string argument, only the already-indexed
    # value. Anchor on the bracket-indexed argument, not a string-literal parameter.
    if re.search(r"sgs_responsive_normalise_object\(\s*\$attributes\[['\"]"
                 + re.escape(prop) + r"['\"]\]", src):
        return 'NORMALISED'
    # RAW: the OLD flat-scalar bracket read — `$attributes['prop']` or `['propTablet']`,
    # the exact pattern that PHP array-to-string-coerces to "Array" when the attr is
    # actually object-typed (D569/D570's root cause).
    if re.search(r"\[['\"]" + re.escape(prop) + r"(?:Tablet|Mobile)?['\"]\]", src):
        return 'RAW'
    return 'UNCLEAR'


def edit_state(block_dir: Path, prop: str) -> str:
    """Classify how edit.js currently wires the control for `prop`. See module docstring."""
    ej = block_dir / 'edit.js'
    if not ej.exists():
        return 'NONE'
    src = ej.read_text(encoding='utf-8', errors='replace')
    prop_re = re.escape(prop)
    has_shared_import = bool(_SHARED_CONTROL_IMPORT_RE.search(src))
    # A local <ResponsiveOverride ... value={attributes.prop} ...
    #   onChange={... setAttributes({ prop: ... })} pattern — the DONE shape, matching
    # exactly how ContainerWrapperControls.js wires gridTemplateColumns/gridTemplateRows
    # and how site-footer-row/site-header-row wire their own bespoke object attrs. Window
    # the match to a <ResponsiveOverride>...</ResponsiveOverride> block so a DIFFERENT
    # prop's onChange two controls away can't false-positive this one.
    for block_match in re.finditer(r'<ResponsiveOverride\b.*?</ResponsiveOverride>', src, re.DOTALL):
        block_src = block_match.group(0)
        # `value={attributes.prop}` (ContainerWrapperControls' pattern) OR a bare
        # `value={prop}` where `prop` was destructured from attributes at the top of the
        # file (site-footer-row/site-header-row's pattern) — both are equally DONE, the
        # variable's origin doesn't change the wiring's correctness.
        value_bound = (
            re.search(r'\battributes(?:\.|\[[\'"])' + prop_re + r'\b', block_src)
            or (
                re.search(r'value=\{\s*' + prop_re + r'\s*\}', block_src)
                and re.search(r'\b' + prop_re + r'\s*,?\s*\}\s*=\s*attributes\b'
                               r'|\{[^{}]*\b' + prop_re + r'\b[^{}]*\}\s*=\s*attributes\b',
                               src)
            )
        )
        if not value_bound:
            continue
        if re.search(r'setAttributes\(\s*\{\s*(?:\[[^\]]*\]|' + prop_re + r')\s*:', block_src):
            return 'OVERRIDDEN'
    # LEGACY: the old flat-attrMap-inside-<ResponsiveControl> bridging pattern (what
    # site-footer-row's gridTemplateRows looked like before pass 3b) — a plain object
    # literal mapping breakpoint names to `prop`/`propTablet`/`propMobile` string values.
    if re.search(r"(?:desktop|tablet|mobile)\s*:\s*['\"]" + prop_re + r"(?:Tablet|Mobile)?['\"]", src):
        return 'LEGACY'
    if re.search(r"\b" + prop_re + r"\b", src):
        return 'SHARED' if has_shared_import else 'UNCLEAR'
    return 'SHARED' if has_shared_import else 'NONE'


def survey(prop: str):
    out = []
    for bj in sorted(BLOCKS_DIR.glob('*/block.json')):
        try:
            data = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        attrs = data.get('attributes', {})
        kind, sibs = classify(attrs, prop)
        if kind in ('ABSENT',):
            continue
        d = bj.parent
        out.append({
            'slug': data.get('name', d.name),
            'dir': d,
            'kind': kind,
            'siblings': sibs,
            'default': attrs.get(prop, {}).get('default'),
            'base_type': attrs.get(prop, {}).get('type'),
            'render_reads': reads_attr_directly(d, prop),
            'edit_refs': edit_refs(d, prop),
            'render_state': render_state(d, prop),
            'edit_state': edit_state(d, prop),
        })
    return out


def build_object_default(rows) -> dict:
    """Preserve the authored default as the DESKTOP tier — dropping it would silently
    change every un-set instance's rendering, which is precisely the quiet loss this
    tool refuses to do."""
    obj = {}
    base = rows.get('default')
    if base not in (None, ''):
        obj['desktop'] = base
    for suffix, key in (('Tablet', 'tablet'), ('Mobile', 'mobile')):
        v = rows.get('sib_defaults', {}).get(suffix)
        if v not in (None, ''):
            obj[key] = v
    return obj


def apply_block_json(entry, prop: str, apply: bool):
    """Rewrite one block.json. Returns (changed, description, error)."""
    bj = entry['dir'] / 'block.json'
    raw = io.open(bj, encoding='utf-8', newline='').read()
    data = json.loads(raw)
    attrs = data['attributes']

    sib_defaults = {}
    for t in TIERS:
        name = prop + t
        if name in attrs:
            sib_defaults[t] = attrs[name].get('default')

    # A BLENDED base is ALREADY the tier object — its default is correct and must be
    # left exactly as it is. Only its orphan scalar siblings are deleted. Feeding it
    # through build_object_default would wrap the object inside itself
    # ({"desktop": {"desktop": …}}), which the retype below never applies for BLENDED —
    # but it WOULD be printed as the proposed change, and a human approving a diff
    # reads the description, not the code path. So compute it honestly per kind.
    if entry['kind'] == 'BLENDED':
        new_default = attrs[prop].get('default')
    else:
        new_default = build_object_default({'default': attrs[prop].get('default'),
                                            'sib_defaults': sib_defaults})

    out = raw
    # Delete sibling entries by exact key, preserving the file's own formatting.
    for t in TIERS:
        name = prop + t
        if name not in attrs:
            continue
        pat = re.compile(r'\n\s*"' + re.escape(name) + r'":\s*\{[^{}]*\},?')
        new = pat.sub('', out, count=1)
        if new == out:
            return False, None, f'could not delete "{name}" (nested braces? hand-edit)'
        out = new

    if entry['kind'] == 'FLAT':
        # Retype the base and swap its default for the tier object.
        pat = re.compile(r'"' + re.escape(prop) + r'":\s*\{[^{}]*\}')
        m = pat.search(out)
        if not m:
            return False, None, f'could not locate base "{prop}" declaration'
        indent = '\t\t\t'
        body = f'"{prop}": {{\n{indent}"type": "object",\n{indent}"default": ' \
               + json.dumps(new_default) + f'\n\t\t}}'
        out = out[:m.start()] + body + out[m.end():]

    # Deleting the LAST entry of an object leaves the previous entry's comma dangling.
    # JSON permits no trailing comma anywhere, so stripping one is always a repair and
    # never a semantic change — but only attempt it when the document is actually broken,
    # so a well-formed file is never rewritten by a blunt regex. Then re-validate: if it
    # still will not parse, REFUSE. Writing invalid JSON would take the block out of the
    # registry silently, which is exactly the quiet loss this tool exists to prevent.
    try:
        json.loads(out)
    except json.JSONDecodeError:
        out = re.sub(r',(\s*[}\]])', r'\1', out)
        try:
            json.loads(out)
        except json.JSONDecodeError as exc:
            return False, None, f'result would be invalid JSON ({exc.msg}) — refused'
    if apply:
        io.open(bj, 'w', encoding='utf-8', newline='').write(out)
    return True, f'default -> {json.dumps(new_default)}', None


# Added D571 (Spec 35 pass 3b, 2026-08-11). See the module docstring: S2 (edit.js) is
# safe to auto-apply because the LEGACY shape — <ResponsiveControl> + a breakpoint-keyed
# attrMap + one self-closing child control — has now been seen TWICE in this codebase
# (ContainerWrapperControls.js pre-fix, site-footer-row/edit.js pre-fix) and both were
# byte-for-byte identical in structure, differing only in label/help text and which
# control component (TextControl etc) they wrap. S3 (render.php) is deliberately NOT
# given a --fix: what matters there is what the surrounding code DOES with the value
# after the read (trim()? cast? is_array() check?) — exactly where D569/D570's real
# regressions lived — so it stays detect-and-flag, never auto-rewritten.

_LEGACY_BLOCK_RE = re.compile(
    r'(?P<indent>[ \t]*)<ResponsiveControl\s+label=\{(?P<label>[^}]*)\}\s*>\s*\n'
    r'\s*\{\s*\(\s*breakpoint\s*\)\s*=>\s*\{\s*\n'
    r'(?P<map_body>[\s\S]*?)\n'
    r'\s*return\s*\(\s*\n'
    r'(?P<child>\s*<[A-Za-z][\s\S]*?/>\s*)\n'
    r'\s*\)\s*;\s*\n'
    r'\s*\}\s*\}\s*\n'
    r'\s*</ResponsiveControl>',
)


def fix_edit_js(entry, prop: str, apply: bool):
    """Rewrite ONE <ResponsiveControl>+attrMap LEGACY block to <ResponsiveOverride>.
    Returns (changed: bool, description, error). Refuses on anything that doesn't match
    the exact known LEGACY shape byte-for-byte — never guesses at unfamiliar JSX."""
    ej = entry['dir'] / 'edit.js'
    src = io.open(ej, encoding='utf-8', newline='').read()

    matches = [m for m in _LEGACY_BLOCK_RE.finditer(src)
               if re.search(r"desktop\s*:\s*['\"]" + re.escape(prop) + r"['\"]", m.group('map_body'))]
    if not matches:
        return False, None, 'no exact LEGACY <ResponsiveControl>+attrMap block found for this prop — hand-edit'
    if len(matches) > 1:
        return False, None, f'{len(matches)} matching blocks found — ambiguous, hand-edit'
    m = matches[0]
    child = m.group('child')

    # The child's value/onChange must reference the attrMap's derived `attr` variable —
    # if they reference something else, this isn't the known shape.
    value_m = re.search(r"value=\{\s*attributes\[\s*attr\s*\]\s*\|\|\s*('[^']*'|\"[^\"]*\")\s*\}", child)
    onchange_m = re.search(
        r"onChange=\{\s*\(\s*val\s*\)\s*=>\s*setAttributes\(\s*\{\s*\[\s*attr\s*\]:\s*val\s*\}\s*\)\s*\}", child)
    if not value_m or not onchange_m:
        return False, None, 'child control value/onChange do not match the known attrMap[attr] shape — hand-edit'

    # The value= line's own leading whitespace is what the inserted placeholder= line
    # should match — read it back from the source rather than guessing a tab count.
    value_line_start = child.rfind('\n', 0, value_m.start()) + 1
    value_line_indent = re.match(r'[ \t]*', child[value_line_start:]).group(0)

    # Rebuild precisely: replace the value= prop, insert a placeholder= prop right after
    # it, replace the onChange= prop — in that order, using the ORIGINAL child so offsets
    # don't drift across the two substitutions.
    new_child = child[:value_m.start()] \
        + f"value={{ ownValue || {value_m.group(1)} }}\n{value_line_indent}" \
        + f"placeholder={{ inherited ? effectiveValue || {value_m.group(1)} : '' }}" \
        + child[value_m.end():onchange_m.start()] \
        + "onChange={ ( val ) => setOwnValue( val ) }" \
        + child[onchange_m.end():]

    # The captured child sat one nesting level deeper than it will under the new wrapper
    # (the old shape had an extra `return (` level that the new shape's `=> (` doesn't
    # need) — dedent every line by exactly one tab, preserving each line's RELATIVE
    # indentation (multi-line props like `help={ __( ... ) }` keep their own internal
    # structure). Then normalise trailing whitespace so the closing `) }` always lands
    # on its own line — the ORIGINAL regex capture can end up with none, which is
    # exactly the glued-together `/>) }` bug found by testing this against a real
    # pre-migration file (site-footer-row's original gridTemplateRows block).
    lines = [(ln[1:] if ln.startswith('\t') else ln) for ln in new_child.rstrip('\n').split('\n')]
    new_child = '\n'.join(lines) + '\n'

    indent = m.group('indent')
    new_block = (
        f"{indent}<ResponsiveOverride\n"
        f"{indent}\tlabel={{{m.group('label')}}}\n"
        f"{indent}\tvalue={{ attributes.{prop} }}\n"
        f"{indent}\tonChange={{ ( obj ) => setAttributes( {{ {prop}: obj }} ) }}\n"
        f"{indent}>\n"
        f"{indent}\t{{ ( {{ ownValue, effectiveValue, inherited, setOwnValue }} ) => (\n"
        f"{new_child}"
        f"{indent}\t) }}\n"
        f"{indent}</ResponsiveOverride>"
    )
    out = src[:m.start()] + new_block + src[m.end():]

    # `ResponsiveOverride` must already be imported, or the build fails loudly at compile
    # time rather than at runtime — cheap to check here, no reason to make the build do it.
    if not re.search(r'^\s*import\s*\{[^}]*\bResponsiveOverride\b[^}]*\}', out, re.MULTILINE):
        return False, None, 'ResponsiveOverride is not imported in this file — add the import, then re-run'

    if apply:
        io.open(ej, 'w', encoding='utf-8', newline='').write(out)
    return True, f'ResponsiveControl+attrMap -> ResponsiveOverride for "{prop}"', None


_LEGACY_FIXTURE = """import { ResponsiveOverride, ResponsiveControl } from '../../../components';

function LayoutPanel( { attributes, setAttributes } ) {
\treturn (
\t\t<>
\t\t\t<ResponsiveControl label={ __( 'Row template', 'sgs-blocks' ) }>
\t\t\t\t{ ( breakpoint ) => {
\t\t\t\t\tconst attrMap = {
\t\t\t\t\t\tdesktop: 'gridTemplateRows',
\t\t\t\t\t\ttablet: 'gridTemplateRowsTablet',
\t\t\t\t\t\tmobile: 'gridTemplateRowsMobile',
\t\t\t\t\t};
\t\t\t\t\tconst attr = attrMap[ breakpoint ];
\t\t\t\t\treturn (
\t\t\t\t\t\t<TextControl
\t\t\t\t\t\t\tvalue={ attributes[ attr ] || '' }
\t\t\t\t\t\t\tonChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
\t\t\t\t\t\t\thelp={ __(
\t\t\t\t\t\t\t\t"CSS grid-template-rows e.g. 'auto 1fr'. Leave empty for browser default.",
\t\t\t\t\t\t\t\t'sgs-blocks'
\t\t\t\t\t\t\t) }
\t\t\t\t\t\t\t__nextHasNoMarginBottom
\t\t\t\t\t\t/>
\t\t\t\t\t);
\t\t\t\t} }
\t\t\t</ResponsiveControl>
\t\t</>
\t);
}
"""


def self_test() -> int:
    """Regression fixture, sourced from a REAL pre-migration file (site-footer-row's
    gridTemplateRows block, before pass 3b hand-fixed it — captured verbatim, not
    invented), not a synthetic guess at the shape. Run standalone:
        python migrate-tier-object.py --self-test
    Exits non-zero and prints the failing assertion on any failure — CI-safe."""
    import tempfile
    failures = []

    def check(label, cond):
        mark = 'OK  ' if cond else 'FAIL'
        print(f'  [{mark}] {label}')
        if not cond:
            failures.append(label)

    with tempfile.TemporaryDirectory() as td:
        d = Path(td) / 'test-block'
        d.mkdir()
        (d / 'edit.js').write_text(_LEGACY_FIXTURE, encoding='utf-8')

        # --- positive control: the known LEGACY shape gets fixed correctly ---
        ok, desc, err = fix_edit_js({'dir': d}, 'gridTemplateRows', apply=True)
        check('positive control: fix reports success, no error', ok and err is None)
        out = (d / 'edit.js').read_text(encoding='utf-8')
        check('positive control: ResponsiveOverride now present',
              '<ResponsiveOverride' in out and '<ResponsiveControl' not in out)
        check('positive control: value bound to attributes.gridTemplateRows',
              'value={ attributes.gridTemplateRows }' in out)
        check('positive control: onChange writes the object attr directly',
              'onChange={ ( obj ) => setAttributes( { gridTemplateRows: obj } ) }' in out)
        check('positive control: child value reads ownValue', 'value={ ownValue || \'\' }' in out)
        check('positive control: child onChange calls setOwnValue',
              "onChange={ ( val ) => setOwnValue( val ) }" in out)
        check('positive control: placeholder inserted', 'placeholder={ inherited ? effectiveValue' in out)
        check('positive control: help text preserved verbatim',
              "CSS grid-template-rows e.g. 'auto 1fr'" in out)
        check('positive control: closing ) } lands on its own line, not glued to />',
              '/>\n' in out and '/>\t' not in out)
        check('positive control: re-running on the FIXED file now correctly refuses '
              '(no LEGACY block left to match)',
              fix_edit_js({'dir': d}, 'gridTemplateRows', apply=False)[2] is not None)
        check('positive control: survey now classifies this file as OVERRIDDEN, not LEGACY',
              edit_state(d, 'gridTemplateRows') == 'OVERRIDDEN')

        # --- negative control: an UNFAMILIAR shape must be refused, never mangled ---
        d2 = Path(td) / 'test-block-unfamiliar'
        d2.mkdir()
        unfamiliar = _LEGACY_FIXTURE.replace(
            "value={ attributes[ attr ] || '' }",
            "value={ someOtherHelper( attributes, attr ) }",
        )
        (d2 / 'edit.js').write_text(unfamiliar, encoding='utf-8')
        ok2, desc2, err2 = fix_edit_js({'dir': d2}, 'gridTemplateRows', apply=True)
        check('negative control: unfamiliar value= shape is REFUSED, not guessed at',
              not ok2 and err2 is not None)
        check('negative control: file was NOT written on refusal',
              (d2 / 'edit.js').read_text(encoding='utf-8') == unfamiliar)

        # --- negative control: render_state must not fire on a prose comment ---
        d3 = Path(td) / 'test-block-prose'
        d3.mkdir()
        (d3 / 'render.php').write_text(
            "<?php\n// gap is consumed from $attributes['gap'] by the shared wrapper.\n",
            encoding='utf-8')
        check('negative control: a comment mentioning $attributes[\'gap\'] does not '
              'classify as RAW (confirmed against trust-bar/render.php\'s real false '
              'positive before comment-stripping was added)',
              render_state(d3, 'gap') == 'DELEGATED')

    if failures:
        print(f'\n{len(failures)} FAILURE(S): {failures}')
        return 1
    print('\nALL PASS')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--property', help='attribute base name, e.g. gap (not required with --self-test)')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--fix', action='store_true', help='propose; writes nothing without --apply')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true', help='exit 1 if any FLAT/BLENDED remain')
    ap.add_argument('--self-test', action='store_true',
                     help='run the built-in regression fixture and exit; no --property needed')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.property:
        ap.error('--property is required unless --self-test is given')
    prop = args.property
    rows = survey(prop)

    if args.survey or not (args.fix or args.check):
        for kind in ('FLAT', 'BLENDED', 'OBJECT', 'ASSET'):
            group = [r for r in rows if r['kind'] == kind]
            if not group:
                continue
            print(f'\n{kind} ({len(group)}):')
            for r in group:
                print(f"   {r['slug']:28} default={json.dumps(r['default']):26} "
                      f"render={r['render_state']:10} edit={r['edit_state']}")
        targets = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
        print(f'\n{len(targets)} block(s) to migrate for "{prop}" (block.json shape).')
        # S2/S3 follow-up applies to EVERY block carrying the prop, not just S1 targets —
        # an OBJECT-kind block (block.json already done) can still have LEGACY edit.js or
        # RAW render.php, which is exactly what pass 3b's wasted re-discovery was about.
        needs_render = [r for r in rows if r['render_state'] in ('RAW', 'UNCLEAR')]
        needs_edit = [r for r in rows if r['edit_state'] in ('LEGACY', 'UNCLEAR')]
        if needs_render or needs_edit:
            print(f'\n⚠ S2/S3 follow-up still needed for "{prop}" (independent of block.json shape):')
            for r in needs_render:
                print(f"   {r['slug']:28} render.php is {r['render_state']} "
                      "— read via sgs_responsive_normalise_object(), or read by hand if UNCLEAR")
            for r in needs_edit:
                print(f"   {r['slug']:28} edit.js is {r['edit_state']} "
                      "— move to <ResponsiveOverride>, or read by hand if UNCLEAR")
        else:
            print(f'\nrender.php + edit.js are clean for every block carrying "{prop}" '
                  '(DELEGATED/NORMALISED, SHARED/OVERRIDDEN).')
        return 0

    if args.check:
        bad = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
        if bad:
            print(f'[migrate-tier-object --check] {len(bad)} block(s) still un-migrated for "{prop}":')
            for r in bad:
                print(f"   {r['slug']:28} {r['kind']}")
            return 1
        print(f'[migrate-tier-object --check] OK - "{prop}" is fully object-shaped everywhere.')
        return 0

    targets = [r for r in rows if r['kind'] in ('FLAT', 'BLENDED')]
    if not targets:
        print(f'Nothing to do for "{prop}".')
        return 0

    print(f'{"APPLYING" if args.apply else "PROPOSED (dry-run; pass --apply to write)"} '
          f'- "{prop}" across {len(targets)} block(s)\n')
    follow_up, errors = [], []
    for r in targets:
        ok, desc, err = apply_block_json(r, prop, args.apply)
        if err:
            errors.append((r['slug'], err))
            print(f"   {r['slug']:28} ⛔ REFUSED: {err}")
            continue
        verb = 'siblings dropped; default UNCHANGED' if r['kind'] == 'BLENDED' else desc
        print(f"   {r['slug']:28} {r['kind']:8} {verb}")
        if r['render_reads']:
            follow_up.append((r['slug'], 'render.php', r['render_reads']))
        if r['edit_refs']:
            follow_up.append((r['slug'], 'edit.js', r['edit_refs']))

    if follow_up:
        print('\n⚠ MANUAL FOLLOW-UP REQUIRED (reported, never silently skipped):')
        for slug, f, n in follow_up:
            print(f'   {slug:28} {f:12} {n} reference(s)')
        print('   render.php: read the object via sgs_responsive_normalise_object().')
        print('   edit.js   : move the control to <ResponsiveOverride>.')

    # S2 auto-fix — LEGACY edit.js only. See fix_edit_js's docstring + the module
    # docstring for why this is safe to auto-apply while S3 (render.php) is not: the
    # LEGACY shape is a narrow, byte-for-byte-repeatable structural pattern; render.php's
    # RAW reads need per-block judgement about downstream usage, so they stay flagged
    # above, never auto-rewritten.
    legacy = [r for r in rows if r['edit_state'] == 'LEGACY']
    if legacy:
        print(f'\n{"APPLYING" if args.apply else "PROPOSED (dry-run)"} '
              f'edit.js LEGACY -> ResponsiveOverride for "{prop}" across {len(legacy)} block(s):')
        for r in legacy:
            ok, desc, err = fix_edit_js(r, prop, args.apply)
            if err:
                errors.append((r['slug'], err))
                print(f"   {r['slug']:28} ⛔ REFUSED: {err}")
                continue
            print(f"   {r['slug']:28} {desc}")

    if errors:
        print(f'\n⛔ {len(errors)} block(s) REFUSED — nothing was written for them.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
