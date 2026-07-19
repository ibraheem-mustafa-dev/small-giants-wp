#!/usr/bin/env python3
"""audit-block-file-consistency.py — WHOLE-BLOCK CROSS-FILE CONSISTENCY CHECKER.

WHY THIS EXISTS
----------------
Every SGS block is defined across up to 5 files (block.json, edit.js, render.php,
save.js, view.js). Nothing in the existing gate set checks that these files agree
with each other on the block's attribute set:

  * scripts/check-dead-controls.js catches an attr with a CONTROL but no RENDER
    consumption (edit.js -> render/save/view). That direction is COVERED here —
    this script does NOT rebuild it.
  * scripts/check-dead-pattern-attrs.py catches an attr used in THEME PATTERN
    markup that block.json doesn't declare. Different scope (patterns, not a
    block's own files).
  * scripts/audit-block-uniformity.py checks block.json shape uniformity ACROSS
    blocks. Different axis (cross-block, not cross-file within one block).

This script covers the OTHER directions check-dead-controls does not:

  1. ORPHAN ATTR       — declared in block.json, no control in edit.js, AND never
                          consumed anywhere (edit.js read, render.php, save.js,
                          view.js, shared includes/components). A fully unused
                          attribute — distinct from a dead control, which requires
                          a control to exist in the first place.
  2. UNDECLARED-RENDER  — render.php / save.js / view.js reads
                          $attributes['X'] / attributes.X for an X that block.json
                          does not declare. WP silently drops an undeclared attr
                          at parse time (the same class check-dead-pattern-attrs.py
                          catches in theme patterns) — this is that class inside
                          the block's OWN files, which no existing gate checks.
  3. UNDECLARED-CONTROL — edit.js writes an attr via setAttributes()/update()/a
                          responsive control prop for an X block.json doesn't
                          declare. Silently dropped the same way.
  4. STATIC/DYNAMIC MISMATCH — block.json's own "render" field (dynamic) doesn't
                          line up with the actual files on disk: declares
                          "render" but render.php is missing; render.php exists
                          but "render" isn't declared (orphaned, never invoked);
                          or a dynamic block's save.js/index.js "save" returns
                          real markup instead of null/<InnerBlocks.Content/>
                          (the double-render / stale-content bug class documented
                          in this repo's own CLAUDE.md gotchas).

CONSUMPTION-PATH HANDLING (avoiding false positives)
-----------------------------------------------------
An attr is NOT an orphan / NOT undeclared if it is legitimately handled by one of
these paths (each mirrored from check-dead-controls.js's own hard-won rules):

  * Extension attrs (`sgs*`) — injected server-side by the universal extension
    system (animation/visibility/click-effect/etc). Loaded from the generated
    includes/extension-attributes.generated.php, same as check-dead-controls.js.
  * WP-native supports attrs (align, className, style, backgroundColor, ...) —
    same NATIVE set as check-dead-pattern-attrs.py, PLUS a per-block computed
    set derived from the block's OWN declared `supports` (compute_support_
    injected_attrs()) — e.g. a block declaring `supports.typography.textAlign`
    legitimately gets a flat top-level `textAlign` attribute WP injects itself
    (5 blocks — countdown-timer, cta-section, hero, notice-banner, team-member
    — were false-flagged `undeclared_render_ref` on this before the map was
    added).
  * Theme pattern / part markup — an attr set as block markup in
    theme/sgs-theme/patterns/*.php or theme/sgs-theme/parts/*.php|*.html (a
    `<!-- wp:sgs/<block> {"attr":"value",...} /-->` JSON-attrs block comment)
    counts as real consumption for the ORPHAN check even though nothing in
    the block's own files references the attribute name textually (hero's
    subHeadline/ctaPrimaryText/etc. are set this way, never read back by
    name in hero's own corpus).
  * Shared "prefixed attribute set" PHP helpers (sgs_typography_css_rule,
    sgs_button_element_style_css) — build $attributes[$prefix.'Suffix'] via
    string concatenation, so the literal name never appears in source text.
    Ported verbatim from check-dead-controls.js's PREFIXED_HELPER_SUFFIXES.
  * Responsive breakpoint variants ({base}Tablet/Mobile/Desktop) — consumed if
    the base is consumed AND the block's own corpus builds responsive keys
    dynamically / emits @media (same rule as check-dead-controls.js).
  * providesContext — an attr named as a context VALUE in the block's own
    block.json is consumed by a child block, not textually in this block's
    files.
  * Shared JS component corpus (src/components/**/*.js, src/utils/**/*.js,
    src/blocks/extensions/**/*.js, and any block's own components/ subdir) —
    e.g. ContainerWrapperControls.js renders controls used by every block that
    mounts it.

BASELINE + FLAGS
-----------------
  python scripts/audit-block-file-consistency.py            # human report
  python scripts/audit-block-file-consistency.py --json      # machine-readable
  python scripts/audit-block-file-consistency.py --check     # same report; still
                                                               exits 0 (see below)

WARN-ONLY: this script exits 0 ALWAYS, regardless of findings or --check. It is
diagnostic, not a build gate. Baseline file (scripts/block-file-consistency-
baseline.json, default {}) is supported for future net-new-only comparison but
does not change the exit code. NOT wired into prebuild.

Never crashes: a missing/unparseable file is logged as a per-block problem and
the run continues over the rest of the roster.
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_DIR = SCRIPT_DIR.parent
REPO_ROOT = PLUGIN_DIR.parent.parent
BLOCKS_DIR = PLUGIN_DIR / 'src' / 'blocks'
INCLUDES_DIR = PLUGIN_DIR / 'includes'
COMPONENTS_DIR = PLUGIN_DIR / 'src' / 'components'
UTILS_DIR = PLUGIN_DIR / 'src' / 'utils'
EXTENSIONS_DIR = BLOCKS_DIR / 'extensions'
ROSTER_FILE = SCRIPT_DIR / 'consistency' / 'roster.json'
BASELINE_FILE = SCRIPT_DIR / 'block-file-consistency-baseline.json'
EXTENSION_ATTRS_FILE = INCLUDES_DIR / 'extension-attributes.generated.php'
THEME_DIR = REPO_ROOT / 'theme' / 'sgs-theme'
PATTERNS_DIR = THEME_DIR / 'patterns'
PARTS_DIR = THEME_DIR / 'parts'

# ---------------------------------------------------------------------------
# Structural allowlists (constant, each justified — not per-block dicts)
# ---------------------------------------------------------------------------

# WP-native supports attrs — never declared per-block, populated by core
# block-supports machinery. Mirrors check-dead-pattern-attrs.py's NATIVE set.
NATIVE_ATTRS = {
    'align', 'className', 'style', 'backgroundColor', 'textColor', 'gradient',
    'fontSize', 'fontFamily', 'borderColor', 'lock', 'metadata', 'anchor', 'layout',
}

# Object-literal keys that show up inside setAttributes()-adjacent callbacks
# (MediaUpload onSelect shapes, ternary results) but are never attribute names.
KEY_NOISE = {'id', 'url', 'alt', 'true', 'false', 'null', 'undefined'}

# Editor-only-by-design attrs that legitimately have no render consumption.
# Keep tiny + justified (mirrors check-dead-controls.js EDITOR_ONLY_ATTRS).
EDITOR_ONLY_ATTRS = {
    'templateMode',  # container: drives allowedBlocks in the editor only.
}


def compute_support_injected_attrs(supports):
    """Given a block.json `supports` object, return the set of top-level
    attribute names WordPress' block-supports machinery auto-injects into the
    block type at registration time — attributes that legitimately do NOT
    (and must NOT) have their own entry in block.json `attributes`, so a
    render/save/view read of one is NOT an undeclared-attr bug.

    Mirrors the real WP core hooks (`packages/block-editor/src/hooks/*.js`
    on WordPress/gutenberg) + this repo's own empirically-verified live
    behaviour:

      * anchor.js            -> `anchor`                (supports.anchor:true)
      * custom-class-name.js -> `className`              (default true unless
                                 explicit false)
      * align.js             -> `align`                  (true, or an array
                                 of allowed alignments)
      * layout.js            -> `layout`                 (true or object;
                                 separate from `style`)
      * color.js             -> `backgroundColor` (+`style`) for
                                 color.background; `textColor` (+`style`) for
                                 color.text; `gradient` (+`style`) for
                                 color.gradients; color.link contributes to
                                 `style` only (style.elements.link), no
                                 dedicated top-level attr
      * font-size.js         -> `fontSize`  (+`style`)    (typography.fontSize
                                 / __experimentalFontSize)
      * font-family.js       -> `fontFamily` (+`style`)   (typography
                                 .__experimentalFontFamily)
      * text-align.js        -> `textAlign` (top-level, flat string; the ONE
                                 that shipped 5 false positives here) for
                                 typography.textAlign / __experimentalTextAlign
                                 — CONFIRMED against this repo's own live
                                 render.php comments (hero, cta-section,
                                 notice-banner, team-member, countdown-timer
                                 all read `$attributes['textAlign']` with a
                                 documented "WP core applies has-text-align-*
                                 from the textAlign attribute" comment,
                                 verified against real rendering — this
                                 in-repo empirical evidence is treated as
                                 ground truth for this project over generic
                                 upstream source reading, which disagreed).
      * style.js (generic)   -> `style` only, no dedicated top-level attr, for:
                                 remaining typography sub-supports (lineHeight,
                                 fontWeight, fontStyle, letterSpacing,
                                 textTransform, textDecoration, writingMode),
                                 spacing.* (margin/padding/blockGap),
                                 shadow, dimensions.* (aspectRatio/minHeight),
                                 position
      * border.js            -> `style` for any of
                                 __experimentalBorder.{radius,width,style,color};
                                 PLUS a dedicated top-level `borderColor`
                                 (+`style`) specifically for
                                 __experimentalBorder.color (mirrors
                                 backgroundColor/textColor)

    `__experimentalSkipSerialization` does NOT change whether an attribute is
    injected/populated — it only changes whether
    get_block_wrapper_attributes() auto-inlines it as HTML style="..."; the
    attribute itself is still stored + readable. So it is ignored here.
    """
    injected = set()
    if not isinstance(supports, dict):
        return injected

    if supports.get('anchor') is True:
        injected.add('anchor')

    if supports.get('customClassName', True) is not False:
        injected.add('className')

    align = supports.get('align')
    if align is True or (isinstance(align, list) and align):
        injected.add('align')

    layout = supports.get('layout')
    if layout is True or isinstance(layout, dict):
        injected.add('layout')

    color = supports.get('color')
    if isinstance(color, dict):
        if color.get('background'):
            injected.add('backgroundColor')
            injected.add('style')
        if color.get('text'):
            injected.add('textColor')
            injected.add('style')
        if color.get('gradients') or color.get('gradient'):
            injected.add('gradient')
            injected.add('style')
        if color.get('link') or color.get('button') or color.get('heading'):
            injected.add('style')

    typography = supports.get('typography')
    if isinstance(typography, dict):
        if typography.get('textAlign') or typography.get('__experimentalTextAlign'):
            injected.add('textAlign')
        if typography.get('fontSize') or typography.get('__experimentalFontSize'):
            injected.add('fontSize')
            injected.add('style')
        if typography.get('__experimentalFontFamily') or typography.get('fontFamily'):
            injected.add('fontFamily')
            injected.add('style')
        style_only_typography_keys = (
            'lineHeight', 'fontWeight', 'fontStyle', 'letterSpacing',
            'textTransform', 'textDecoration', 'writingMode',
            '__experimentalWritingMode',
        )
        if any(typography.get(k) for k in style_only_typography_keys):
            injected.add('style')

    spacing = supports.get('spacing')
    if isinstance(spacing, dict) and any(
        spacing.get(k) for k in ('margin', 'padding', 'blockGap', '__experimentalMargin', '__experimentalPadding')
    ):
        injected.add('style')

    border = supports.get('__experimentalBorder')
    if isinstance(border, dict):
        if any(border.get(k) for k in ('radius', 'width', 'style', 'color')):
            injected.add('style')
        if border.get('color'):
            injected.add('borderColor')

    if supports.get('shadow'):
        injected.add('style')

    dimensions = supports.get('dimensions')
    if isinstance(dimensions, dict) and any(dimensions.get(k) for k in ('aspectRatio', 'minHeight')):
        injected.add('style')

    if supports.get('position'):
        injected.add('style')

    return injected

# Shared prefixed-attribute-set PHP helpers: each reads
# $attributes[$prefix . 'Suffix'] via string concatenation, so the literal
# attribute name never appears verbatim in source text. Ported from
# check-dead-controls.js PREFIXED_HELPER_SUFFIXES — keep in sync with that
# file's own doc-comment / the helpers' own doc-comments.
PREFIXED_HELPER_SUFFIXES = {
    'sgs_typography_css_rule': [
        'FontSize', 'FontSizeUnit', 'FontSizeTablet', 'FontSizeMobile',
        'FontWeight', 'FontStyle', 'TextTransform', 'TextDecoration',
        'LineHeight', 'LineHeightUnit', 'LineHeightTablet', 'LineHeightMobile',
        'LetterSpacing', 'LetterSpacingUnit', 'LetterSpacingTablet', 'LetterSpacingMobile',
    ],
    'sgs_button_element_style_css': [
        'ColourBackground', 'ColourText', 'ColourBorder',
        'ColourBackgroundHover', 'ColourTextHover', 'ColourBorderHover',
        'BorderStyle', 'BorderWidth', 'BorderRadius', 'FontWeight', 'FontSize',
        'PaddingY', 'PaddingX', 'WidthType',
    ],
}

BREAKPOINT_SUFFIX_RE = re.compile(r'(Tablet|Mobile|Desktop)$')
BREAKPOINT_TOKEN_RE = re.compile(r"['\"`](?:Tablet|Mobile|Desktop)['\"`]|@media")

# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------


def read_text(path):
    if not path.exists() or not path.is_file():
        return ''
    try:
        return path.read_text(encoding='utf-8', errors='replace')
    except OSError:
        return ''


def strip_comments(src):
    """Strip /* */, //, and PHP # comments so a name surviving only in a
    doc-comment is never counted as consumed/used. Applied to both PHP and JS
    corpora — crude but sufficient (proven on live source: quote/render.php's
    "$attributes['body']" and multi-button/render.php's "$attributes['flexDirection']"
    both appear ONLY inside comments and must not be treated as real consumption
    or real usage — hand-verified during this script's build)."""
    if not src:
        return ''
    src = re.sub(r'/\*[\s\S]*?\*/', ' ', src)
    src = re.sub(r'(^|[^:])//[^\n]*', r'\1 ', src)
    src = re.sub(r'^\s*#[^\n]*', ' ', src, flags=re.MULTILINE)
    return src


def word_present(name, corpus):
    if not name:
        return False
    return re.search(r'\b' + re.escape(name) + r'\b', corpus) is not None


def load_extension_attrs():
    src = read_text(EXTENSION_ATTRS_FILE)
    return set(re.findall(r"'(sgs[A-Za-z0-9]+)'\s*=>", src))


def is_extension_attr(name, extension_attrs):
    if extension_attrs:
        return name in extension_attrs
    # Fallback prefix heuristic only if the generated file is missing.
    return bool(re.match(r'^sgs[A-Z]', name))


def load_dir_corpus(directory, suffix):
    """Concatenate every file under `directory` (recursively) ending in `suffix`.
    Missing directory -> empty string; never raises."""
    buf = []
    if not directory.exists():
        return ''
    for path in directory.rglob('*' + suffix):
        if path.is_file():
            buf.append(read_text(path))
    return '\n'.join(buf)


# ---------------------------------------------------------------------------
# JS "controlled attrs" extraction — ported from check-dead-controls.js
# collectControlledAttrs(), same four patterns.
# ---------------------------------------------------------------------------

SET_ATTRS_RE = re.compile(r'setAttributes\(\s*\{\s*([^}]*)\}')
SET_ATTRS_KEY_RE = re.compile(r'(?:^|[\s,])(?:[\'"]?)([A-Za-z_$][\w$]*)(?:[\'"]?)\s*:')
ATTR_MAP_RE = re.compile(r'\b(?:attrMap|ATTR_MAP)\s*=\s*\{([^}]*)\}')
ATTR_MAP_VAL_RE = re.compile(r"['\"]([A-Za-z_$][\w$]*)['\"]")
UPDATE_RE = re.compile(r"\bupdate\(\s*['\"]([A-Za-z_$][\w$]*)['\"]")
# A per-item repeater closure that shadows the house-style `update(attr, value)`
# block-attribute setter check-dead-controls.js's UPDATE_RE assumes. See the
# doc-comment on collect_controlled_attrs_strict() for the hand-verified
# false-positive this guards against (brand-strip / team-member / timeline).
LOCAL_ITEM_UPDATE_RE = re.compile(
    r'\bupdate\s*=\s*\([^)]*\)\s*=>\s*onChange\('
)
ATTR_PROP_RE = re.compile(r"\battr(?:Desktop|Tablet|Mobile|Base)?\s*=\s*['\"]([A-Za-z_$][\w$]*)['\"]")


def collect_controlled_attrs(src):
    """Attribute names WRITTEN via setAttributes()/update()/attr* props in a JS
    source. Same four shapes check-dead-controls.js recognises. PERMISSIVE by
    design (naive non-brace-balanced regex on the setAttributes() body, same as
    check-dead-controls.js) — used only to EXCLUDE candidates from the orphan
    check (Check 1), where over-matching is safe (it can only suppress a false
    orphan, never invent one, since Check 1 only tests names already declared
    in block.json). Do NOT reuse this for the undeclared-control check (Check
    3) — use collect_controlled_attrs_strict for that; the naive regex bleeds
    nested/ternary object keys (e.g. "spacing", "Tablet" out of a template-
    literal ternary) which would flood Check 3 with false undeclared-attr
    findings (hand-verified against accordion/edit.js + audio/edit.js while
    building this script)."""
    controlled = set()
    if not src:
        return controlled

    for m in SET_ATTRS_RE.finditer(src):
        for k in SET_ATTRS_KEY_RE.finditer(m.group(1)):
            if k.group(1) not in KEY_NOISE:
                controlled.add(k.group(1))

    for m in ATTR_MAP_RE.finditer(src):
        for v in ATTR_MAP_VAL_RE.finditer(m.group(1)):
            controlled.add(v.group(1))

    for m in UPDATE_RE.finditer(src):
        controlled.add(m.group(1))

    for m in ATTR_PROP_RE.finditer(src):
        controlled.add(m.group(1))

    return controlled


def _find_balanced_bodies(src, call_re):
    """Find every call matching `call_re` (must end just before the opening
    paren) whose FIRST argument is an object literal, and return each
    object's inner text using proper brace/bracket/quote-aware balancing (not
    a naive "up to the first }" regex, which breaks on nested objects)."""
    bodies = []
    n = len(src)
    for m in call_re.finditer(src):
        start = m.end()
        # Skip whitespace to the opening '{' of the first argument.
        i = start
        while i < n and src[i] in ' \t\r\n':
            i += 1
        if i >= n or src[i] != '{':
            continue  # first arg isn't an object literal (e.g. a variable) — skip
        brace_idx = i
        depth = 0
        in_string = None
        j = brace_idx
        while j < n:
            c = src[j]
            if in_string:
                if c == '\\' and j + 1 < n:
                    j += 2
                    continue
                if c == in_string:
                    in_string = None
                j += 1
                continue
            if c in ('"', "'", '`'):
                in_string = c
                j += 1
                continue
            if c in '{[(':
                depth += 1
            elif c in '}])':
                depth -= 1
                if depth == 0:
                    bodies.append(src[brace_idx + 1:j])
                    break
            j += 1
    return bodies


def _split_top_level(body):
    """Split an object-literal body on TOP-LEVEL commas only (depth/quote
    aware), so a nested object's own keys never leak into the split."""
    segments = []
    depth = 0
    current = []
    in_string = None
    i = 0
    n = len(body)
    while i < n:
        c = body[i]
        if in_string:
            current.append(c)
            if c == '\\' and i + 1 < n:
                current.append(body[i + 1])
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            in_string = c
            current.append(c)
            i += 1
            continue
        if c in '{[(':
            depth += 1
            current.append(c)
            i += 1
            continue
        if c in '}])':
            depth -= 1
            current.append(c)
            i += 1
            continue
        if c == ',' and depth == 0:
            segments.append(''.join(current))
            current = []
            i += 1
            continue
        current.append(c)
        i += 1
    if current:
        segments.append(''.join(current))
    return segments


TOP_LEVEL_KEY_RE = re.compile(r"^['\"]?([A-Za-z_$][\w$]*)['\"]?\s*:")
SHORTHAND_KEY_RE = re.compile(r'^([A-Za-z_$][\w$]*)$')
SET_ATTRIBUTES_CALL_RE = re.compile(r'setAttributes\s*\(')


def collect_controlled_attrs_strict(src):
    """STRICT variant for Check 3 (undeclared-control): only TOP-LEVEL,
    literal (non-computed) object keys in a setAttributes({...}) call, found
    via brace-balanced parsing — so a nested value like
    `spacing: { ...x, padding: next }` yields ONLY "spacing" (the real
    top-level write), never "padding" leaking out of the nested object, and a
    computed key [ template-literal-expr ]: next is skipped entirely (cannot be
    resolved statically, so it is never claimed as either controlled or
    undeclared). Plus the same update()/attr* prop patterns as the permissive
    version — EXCEPT update(), which is conditionally excluded (see
    LOCAL_ITEM_UPDATE_RE below).

    Repeater sub-component false positive (hand-verified while building this
    script): brand-strip/edit.js, team-member/edit.js and timeline/edit.js all
    define a LOCAL `update` closure inside a per-item repeater sub-component —
    `const update = (key, value) => onChange({ ...item, [key]: value })` —
    which shadows the house-style block-level `update(attrName, value)` wrapper
    check-dead-controls.js's UPDATE_RE assumes. Calling this local `update`
    with a per-item field name ('alt', 'platform', 'date', ...) is NOT a
    block-level attribute write; it mutates one array item via `onChange`, and
    the array itself is written back via a SEPARATE `setAttributes({ items:
    next })` call already caught by the setAttributes-body parser above. If
    this per-item shadow shape is present anywhere in the file, `update(...)`
    call sites are UNRELIABLE for this file and are excluded here."""
    controlled = set()
    if not src:
        return controlled

    for body in _find_balanced_bodies(src, SET_ATTRIBUTES_CALL_RE):
        for seg in _split_top_level(body):
            seg = seg.strip()
            if not seg or seg.startswith('[') or seg.startswith('...'):
                continue  # computed key or spread — not statically resolvable
            m = TOP_LEVEL_KEY_RE.match(seg)
            if m:
                if m.group(1) not in KEY_NOISE:
                    controlled.add(m.group(1))
                continue
            m2 = SHORTHAND_KEY_RE.match(seg)
            if m2 and m2.group(1) not in KEY_NOISE:
                controlled.add(m2.group(1))

    # attrMap literal values ARE real target attr names by convention (used
    # together with a computed key the block above deliberately skips), so
    # still worth capturing here — same source regex as the permissive path.
    for m in ATTR_MAP_RE.finditer(src):
        for v in ATTR_MAP_VAL_RE.finditer(m.group(1)):
            controlled.add(v.group(1))

    if not LOCAL_ITEM_UPDATE_RE.search(src):
        for m in UPDATE_RE.finditer(src):
            controlled.add(m.group(1))

    for m in ATTR_PROP_RE.finditer(src):
        controlled.add(m.group(1))

    return controlled


# ---------------------------------------------------------------------------
# JS "read attrs" extraction — destructuring `{ ... } = attributes` blocks.
# Broader than "controlled": proves an attr is READ in edit.js even if it only
# gates conditional editor UI rather than being written back. Used ONLY for
# the orphan check (Check 1), not for undeclared-control (Check 3), which must
# stay strict to "written" per the task's own definition.
# ---------------------------------------------------------------------------

DESTRUCTURE_RE = re.compile(r'\{([^{}]*)\}\s*=\s*attributes\b', re.DOTALL)
DESTRUCTURE_KEY_RE = re.compile(r'(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*(?::|,|$|\})')


def collect_read_attrs(src):
    read = set()
    if not src:
        return read
    for m in DESTRUCTURE_RE.finditer(src):
        body = m.group(1)
        for k in DESTRUCTURE_KEY_RE.finditer(body):
            name = k.group(1)
            if name and name not in KEY_NOISE:
                read.add(name)
    # attributes.X direct property reads (not destructured).
    for m in re.finditer(r'\battributes\.([A-Za-z_$][\w$]*)', src):
        read.add(m.group(1))
    for m in re.finditer(r"\battributes\[\s*['\"]([A-Za-z_$][\w$]*)['\"]\s*\]", src):
        read.add(m.group(1))
    return read


# ---------------------------------------------------------------------------
# Undeclared-attr-reference extraction (Check 2 / Check 3 raw-name collectors)
# ---------------------------------------------------------------------------

PHP_ATTR_RE = re.compile(r"\$attributes\[\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\s*\]")


def collect_php_attr_refs(src):
    return set(PHP_ATTR_RE.findall(src)) if src else set()


def collect_js_attr_refs(src):
    """Attribute names referenced as `attributes.X` / `attributes['X']` / a
    `{ ...X... } = attributes` destructure in a JS source (save.js / view.js)."""
    if not src:
        return set()
    return collect_read_attrs(src)


def collect_prefixed_helper_consumed(corpus):
    consumed = set()
    for fn_name, suffixes in PREFIXED_HELPER_SUFFIXES.items():
        pattern = re.compile(re.escape(fn_name) + r"\s*\(\s*[^,]+,\s*['\"]([A-Za-z0-9_]*)['\"]")
        for m in pattern.finditer(corpus):
            prefix = m.group(1)
            for suffix in suffixes:
                if prefix:
                    consumed.add(prefix + suffix)
                else:
                    consumed.add(suffix[0].lower() + suffix[1:])
    return consumed


# ---------------------------------------------------------------------------
# Check 4 helpers — save-return-type classification
# ---------------------------------------------------------------------------

INNER_BLOCKS_RE = re.compile(r'<InnerBlocks(?:\.Content)?\s*/?>')
RETURN_NULL_RE = re.compile(r'\breturn\s+null\b')
ARROW_NULL_RE = re.compile(r'=>\s*null\b')
JSX_RE = re.compile(r'<[A-Za-z]')


def classify_save_src(src):
    if not src or not src.strip():
        return 'absent'
    if INNER_BLOCKS_RE.search(src):
        return 'innerblocks'
    if RETURN_NULL_RE.search(src) or ARROW_NULL_RE.search(src):
        return 'null'
    if 'RichText.Content' in src or JSX_RE.search(src):
        return 'markup'
    return 'unknown'


SAVE_KEY_RE = re.compile(r"save\s*:\s*([^,]*?)(?:,\s*\n|\}\s*\)|\}\s*;|\n\s*\}\s*\))", re.DOTALL)
SAVE_KEY_PRESENT_RE = re.compile(r'\bsave\s*:')


def detect_save_return_type(block_dir, index_js_src):
    """Classify what the block's save shape actually emits: 'null',
    'innerblocks', 'markup', 'unknown', or 'absent' (no save.js AND no inline
    `save:` key in index.js — WP treats this identically to `save: () => null`,
    proven live for decorative-image / google-reviews / trustpilot-reviews)."""
    save_path = block_dir / 'save.js'
    if save_path.exists():
        return classify_save_src(strip_comments(read_text(save_path)))

    idx = strip_comments(index_js_src)
    m = SAVE_KEY_RE.search(idx)
    if m:
        return classify_save_src(m.group(1))
    if SAVE_KEY_PRESENT_RE.search(idx):
        return 'unknown'
    return 'absent'


def collect_nested_declared_names(attributes_schema):
    """Walk every attribute's JSON-schema and collect any key named under a
    nested 'properties' (object-typed attr) or 'items.properties' (array-of-
    objects / repeater attr), recursively. WP genuinely persists these as
    real per-item sub-properties — a repeater attr like `logos` can formally
    declare its item shape (`items.properties.alt`, `.name`, `.linkUrl`,
    `.linkTarget`) without those names ever being their OWN top-level
    block.json attribute key. Confirmed live: brand-strip's `logos` attr
    declares exactly this shape, and its edit.js legitimately reads/writes
    `alt`/`name`/`linkUrl`/`linkTarget` via a per-item `update(key, value)`
    closure — that is NOT an undeclared attribute, it is a declared nested
    property. Hand-verified during this script's build; 12 attrs across the
    roster use this schema shape."""
    names = set()

    def walk(node):
        if not isinstance(node, dict):
            return
        props = node.get('properties')
        if isinstance(props, dict):
            for key, val in props.items():
                names.add(key)
                walk(val)
        items = node.get('items')
        if isinstance(items, dict):
            walk(items)

    for attr_def in attributes_schema.values():
        walk(attr_def)
    return names


# ---------------------------------------------------------------------------
# Theme pattern / part scan (Check 1 support) — an attr set as block markup
# in a pattern/part IS real consumption even though nothing in the block's
# OWN files (edit.js/render.php/save.js/view.js) references the attribute
# name textually. Confirmed live: theme/sgs-theme/patterns/hero-centred.php
# emits `<!-- wp:sgs/hero {"subHeadline":"...","ctaPrimaryText":"...",...} /-->`
# — a single-line self-closing block comment carrying the full JSON attrs
# object. WP writes these straight into post_content on pattern insert; the
# operator then edits them via the block's own inspector, same as any other
# instance.
# ---------------------------------------------------------------------------

BLOCK_COMMENT_SLUG_RE = re.compile(r"<!--\s*wp:(sgs/[a-z0-9-]+)\b")


def _extract_balanced_json_bodies(src, slug):
    """Find every `<!-- wp:{slug} {...json...} ... -->` occurrence of the
    given block slug in `src` and return the raw JSON-attributes text for
    each (the balanced `{...}` immediately following the slug), using
    brace/quote-aware scanning so a nested object inside the attrs (e.g. a
    `variants` map) never truncates the match early. A block instance with
    no JSON attrs at all (`<!-- wp:sgs/x /-->`) yields nothing for that
    occurrence."""
    bodies = []
    pattern = re.compile(r'<!--\s*wp:' + re.escape(slug) + r'\b\s*')
    n = len(src)
    for m in pattern.finditer(src):
        i = m.end()
        if i >= n or src[i] != '{':
            continue
        depth = 0
        in_string = None
        j = i
        while j < n:
            c = src[j]
            if in_string:
                if c == '\\' and j + 1 < n:
                    j += 2
                    continue
                if c == in_string:
                    in_string = None
                j += 1
                continue
            if c in ('"', "'"):
                in_string = c
                j += 1
                continue
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    bodies.append(src[i:j + 1])
                    break
            j += 1
    return bodies


def load_pattern_attr_corpus_by_slug():
    """Build a per-block-slug corpus of every `wp:sgs/<slug>` JSON-attributes
    region found across theme/sgs-theme/patterns/*.php and
    theme/sgs-theme/parts/*.php|*.html. Never raises — missing directories
    yield an empty dict, same fail-soft contract as the rest of this
    script."""
    corpus_by_slug = {}
    files = []
    if PATTERNS_DIR.exists():
        files += sorted(PATTERNS_DIR.glob('*.php'))
    if PARTS_DIR.exists():
        files += sorted(PARTS_DIR.glob('*.php'))
        files += sorted(PARTS_DIR.glob('*.html'))

    full_src = '\n'.join(read_text(f) for f in files)
    if not full_src:
        return corpus_by_slug

    for slug in sorted(set(BLOCK_COMMENT_SLUG_RE.findall(full_src))):
        bodies = _extract_balanced_json_bodies(full_src, slug)
        if bodies:
            corpus_by_slug[slug] = '\n'.join(bodies)
    return corpus_by_slug


def attr_in_pattern_corpus(attr, pattern_corpus):
    """True if `attr` appears as a JSON object key (`"attr":`) inside the
    block's own pattern/part attrs corpus — i.e. some pattern/part
    explicitly sets this attribute on an instance of the block."""
    if not pattern_corpus:
        return False
    return re.search(r'"' + re.escape(attr) + r'"\s*:', pattern_corpus) is not None


# ---------------------------------------------------------------------------
# Per-block loading
# ---------------------------------------------------------------------------


class BlockFiles:
    def __init__(self, slug, block_dir):
        self.slug = slug
        self.dir = block_dir
        self.problems = []  # missing/unparseable file notes (never fatal)

        bj_path = block_dir / 'block.json'
        self.block_json = None
        if not bj_path.exists():
            self.problems.append('block.json missing')
        else:
            try:
                self.block_json = json.loads(read_text(bj_path))
            except json.JSONDecodeError as e:
                self.problems.append(f'block.json unparseable: {e}')

        attributes_schema = (self.block_json or {}).get('attributes', {})
        self.attrs = set(attributes_schema.keys())
        self.nested_declared = collect_nested_declared_names(attributes_schema)
        self.provides_context = (self.block_json or {}).get('providesContext', {}) or {}
        self.declared_dynamic = bool(self.block_json) and 'render' in self.block_json
        self.support_injected = compute_support_injected_attrs((self.block_json or {}).get('supports', {}))

        self.edit_js_raw = read_text(block_dir / 'edit.js')
        self.render_php_raw = read_text(block_dir / 'render.php')
        self.save_js_raw = read_text(block_dir / 'save.js')
        self.view_js_raw = read_text(block_dir / 'view.js')
        self.index_js_raw = read_text(block_dir / 'index.js')

        self.edit_js = strip_comments(self.edit_js_raw)
        self.render_php = strip_comments(self.render_php_raw)
        self.save_js = strip_comments(self.save_js_raw)
        self.view_js = strip_comments(self.view_js_raw)
        self.index_js = strip_comments(self.index_js_raw)

        self.has_render_php_file = (block_dir / 'render.php').exists()
        self.has_save_js_file = (block_dir / 'save.js').exists()

        self.own_corpus = '\n'.join([self.edit_js, self.render_php, self.save_js, self.view_js])


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def check_orphan_attrs(block, shared_php_corpus, shared_js_corpus, extension_attrs, pattern_corpus_by_slug):
    findings = []
    controlled = collect_controlled_attrs(block.edit_js)
    read_in_edit = collect_read_attrs(block.edit_js)
    full_corpus = block.own_corpus + '\n' + shared_php_corpus + '\n' + shared_js_corpus
    prefixed_consumed = collect_prefixed_helper_consumed(full_corpus)
    context_values = set(block.provides_context.values())
    pattern_corpus = pattern_corpus_by_slug.get(block.slug, '')

    for attr in sorted(block.attrs):
        if is_extension_attr(attr, extension_attrs) or attr in NATIVE_ATTRS or attr in EDITOR_ONLY_ATTRS:
            continue
        if attr.startswith('_comment_'):
            # Deliberate JSON-comment convention (block.json has no native comment
            # syntax): a fake "attribute" whose sole purpose is inline documentation.
            # Confirmed live across 9 block.json files (brand-strip, card-grid,
            # cta-section, decorative-image, feature-grid, hero, info-box,
            # responsive-logo, testimonial) — never meant to be read by any file.
            continue
        if attr in controlled or attr in read_in_edit:
            continue
        if attr in context_values:
            continue
        if attr in prefixed_consumed:
            continue
        if attr_in_pattern_corpus(attr, pattern_corpus):
            continue

        suffix = BREAKPOINT_SUFFIX_RE.search(attr)
        if suffix:
            base = attr[: -len(suffix.group(1))]
            if base and word_present(base, full_corpus) and BREAKPOINT_TOKEN_RE.search(block.own_corpus):
                continue

        if word_present(attr, full_corpus):
            continue

        findings.append({
            'type': 'orphan_attr',
            'block': block.slug,
            'attr': attr,
            'reason': (
                'declared in block.json, no control in edit.js, and its name appears in no '
                'render.php / save.js / view.js / shared includes / theme pattern or part '
                'markup — fully unused'
            ),
        })
    return findings


def check_undeclared_render_refs(block, extension_attrs):
    findings = []
    sources = [
        ('render.php', block.render_php),
        ('save.js', block.save_js),
        ('view.js', block.view_js),
    ]
    for filename, src in sources:
        if not src:
            continue
        if filename == 'render.php':
            refs = collect_php_attr_refs(src)
        else:
            refs = collect_js_attr_refs(src)
        for attr in sorted(refs):
            if attr in block.attrs or attr in block.nested_declared:
                continue
            if attr in NATIVE_ATTRS or attr in block.support_injected or is_extension_attr(attr, extension_attrs):
                continue
            findings.append({
                'type': 'undeclared_render_ref',
                'block': block.slug,
                'attr': attr,
                'file': filename,
                'reason': (
                    f'{filename} reads {attr!r} from attributes but block.json does not declare it — '
                    'WP silently discards an undeclared attribute at parse time, so this read is dead'
                ),
            })
    return findings


def check_undeclared_controls(block, extension_attrs):
    findings = []
    controlled = collect_controlled_attrs_strict(block.edit_js)
    for attr in sorted(controlled):
        if attr in block.attrs or attr in block.nested_declared:
            continue
        if attr in NATIVE_ATTRS or attr in block.support_injected or is_extension_attr(attr, extension_attrs):
            continue
        findings.append({
            'type': 'undeclared_control',
            'block': block.slug,
            'attr': attr,
            'reason': (
                f'edit.js binds a control to {attr!r} but block.json does not declare it — '
                'WP silently drops the value on save'
            ),
        })
    return findings


def check_static_dynamic_mismatch(block):
    findings = []
    save_type = detect_save_return_type(block.dir, block.index_js_raw)

    if block.declared_dynamic and not block.has_render_php_file:
        findings.append({
            'type': 'static_dynamic_mismatch',
            'block': block.slug,
            'reason': "block.json declares a \"render\" field but render.php is missing on disk",
        })

    if block.has_render_php_file and not block.declared_dynamic and block.block_json is not None:
        findings.append({
            'type': 'static_dynamic_mismatch',
            'block': block.slug,
            'reason': (
                'render.php exists on disk but block.json has no "render" field — WP never invokes '
                'it; the file is orphaned'
            ),
        })

    if block.declared_dynamic and save_type == 'markup':
        findings.append({
            'type': 'static_dynamic_mismatch',
            'block': block.slug,
            'reason': (
                'block.json declares "render" (dynamic, server-rendered) but save.js/index.js '
                'returns real markup instead of null or <InnerBlocks.Content/> — double-render / '
                'stale-content risk on re-save'
            ),
        })

    if (not block.declared_dynamic) and save_type in ('null', 'absent') and not block.has_render_php_file:
        findings.append({
            'type': 'static_dynamic_mismatch',
            'block': block.slug,
            'reason': (
                'block.json has no "render" field (static) and save.js/index.js produces no markup, '
                'and there is no render.php — nothing will ever render on the frontend'
            ),
        })

    return findings


# ---------------------------------------------------------------------------
# Baseline
# ---------------------------------------------------------------------------


def load_baseline():
    if not BASELINE_FILE.exists():
        return set()
    try:
        data = json.loads(read_text(BASELINE_FILE))
    except json.JSONDecodeError:
        return set()
    accepted = data.get('accepted', []) if isinstance(data, dict) else []
    keys = set()
    for f in accepted:
        keys.add(finding_key(f))
    return keys


def finding_key(f):
    return f"{f.get('type')}:{f.get('block')}:{f.get('attr', '')}:{f.get('file', '')}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def load_roster():
    if not ROSTER_FILE.exists():
        return None, f'roster file missing: {ROSTER_FILE}'
    try:
        data = json.loads(read_text(ROSTER_FILE))
    except json.JSONDecodeError as e:
        return None, f'roster file unparseable: {e}'
    blocks = data.get('blocks', [])
    if not blocks:
        return None, 'roster file has no blocks[]'
    return [b['slug'] for b in blocks if 'slug' in b], None


def main():
    as_json = '--json' in sys.argv
    # --check is accepted for CLI-shape consistency with sibling gates, but per
    # this script's WARN-ONLY design it never changes the exit code (see module
    # docstring). Left as a no-op flag rather than silently rejected.
    _check = '--check' in sys.argv  # noqa: F841

    slugs, roster_err = load_roster()
    file_problems = []
    if roster_err:
        # Fail-closed but non-fatal: fall back to scanning every directory under
        # src/blocks/ directly so the tool still produces a report.
        file_problems.append(f'[roster] {roster_err} — falling back to directory scan')
        if BLOCKS_DIR.exists():
            slugs = [
                f'sgs/{d.name}'
                for d in sorted(BLOCKS_DIR.iterdir())
                if d.is_dir() and d.name != 'extensions'
            ]
        else:
            slugs = []

    extension_attrs = load_extension_attrs()
    shared_php_corpus = strip_comments(load_dir_corpus(INCLUDES_DIR, '.php'))
    shared_js_corpus = strip_comments(
        load_dir_corpus(COMPONENTS_DIR, '.js')
        + '\n' + load_dir_corpus(UTILS_DIR, '.js')
        + '\n' + load_dir_corpus(EXTENSIONS_DIR, '.js')
    )
    # Also fold in each block's own components/ subdir (card-grid, container,
    # content-collection) so their shared controls count as consumption for
    # THEIR OWN attrs — handled naturally since own_corpus is built from files
    # inside the block's own directory tree only for edit/render/save/view; a
    # components/ subdir is separate, so add it to the shared JS pool too.
    for block_dir in BLOCKS_DIR.glob('*/components'):
        shared_js_corpus += '\n' + strip_comments(load_dir_corpus(block_dir, '.js'))

    pattern_corpus_by_slug = load_pattern_attr_corpus_by_slug()

    per_block_findings = {}
    all_findings = []

    for slug in slugs:
        name = slug.split('/')[-1]
        block_dir = BLOCKS_DIR / name
        if not block_dir.exists():
            per_block_findings[slug] = {
                'findings': [],
                'problems': [f'block directory missing: {block_dir}'],
            }
            continue

        try:
            block = BlockFiles(slug, block_dir)
        except Exception as e:  # never crash the whole run over one bad block
            per_block_findings[slug] = {
                'findings': [],
                'problems': [f'unexpected error loading block: {e}'],
            }
            continue

        findings = []
        try:
            findings += check_orphan_attrs(
                block, shared_php_corpus, shared_js_corpus, extension_attrs, pattern_corpus_by_slug
            )
            findings += check_undeclared_render_refs(block, extension_attrs)
            findings += check_undeclared_controls(block, extension_attrs)
            findings += check_static_dynamic_mismatch(block)
        except Exception as e:  # per-check isolation — one bad regex can't kill the run
            block.problems.append(f'check error: {e}')

        per_block_findings[slug] = {'findings': findings, 'problems': block.problems}
        all_findings.extend(findings)

    baseline = load_baseline()
    net_new = [f for f in all_findings if finding_key(f) not in baseline]
    accepted = [f for f in all_findings if finding_key(f) in baseline]

    clean_blocks = [
        slug for slug, v in per_block_findings.items() if not v['findings'] and not v['problems']
    ]
    flagged_blocks = [slug for slug, v in per_block_findings.items() if v['findings']]

    counts_by_type = {}
    for f in net_new:
        counts_by_type[f['type']] = counts_by_type.get(f['type'], 0) + 1

    if as_json:
        sys.stdout.write(json.dumps({
            'roster_problems': file_problems,
            'blocks_scanned': len(slugs),
            'clean_blocks': len(clean_blocks),
            'flagged_blocks': len(flagged_blocks),
            'counts_by_type': counts_by_type,
            'net_new': net_new,
            'accepted': accepted,
            'per_block': per_block_findings,
        }, indent=2) + '\n')
        sys.exit(0)

    print('[audit-block-file-consistency] Whole-block cross-file consistency audit (WARN-ONLY)\n')
    if file_problems:
        for p in file_problems:
            print(f'  ! {p}')
        print()

    print(f'Blocks scanned : {len(slugs)}')
    print(f'Clean           : {len(clean_blocks)}')
    print(f'Flagged         : {len(flagged_blocks)}')
    if accepted:
        print(f'Baselined       : {len(accepted)} (accepted findings, not shown below)')
    print()

    if counts_by_type:
        print('By type:')
        for t, c in sorted(counts_by_type.items()):
            print(f'  {t}: {c}')
        print()

    if net_new:
        print(f'{len(net_new)} finding(s):\n')
        by_block = {}
        for f in net_new:
            by_block.setdefault(f['block'], []).append(f)
        for slug in sorted(by_block):
            print(f'  {slug}')
            for f in by_block[slug]:
                loc = f" [{f['file']}]" if f.get('file') else ''
                attr = f" :: {f['attr']}" if f.get('attr') else ''
                print(f"    - ({f['type']}){loc}{attr} — {f['reason']}")
            print()
    else:
        print('OK — 0 net-new findings across the roster.\n')

    problem_blocks = [
        (slug, v['problems']) for slug, v in per_block_findings.items() if v['problems']
    ]
    if problem_blocks:
        print(f'{len(problem_blocks)} block(s) had file-loading problems (logged, not fatal):\n')
        for slug, problems in problem_blocks:
            print(f'  {slug}')
            for p in problems:
                print(f'    - {p}')
        print()

    print('WARN-ONLY: this script always exits 0. Not wired into prebuild.')
    sys.exit(0)


if __name__ == '__main__':
    main()
