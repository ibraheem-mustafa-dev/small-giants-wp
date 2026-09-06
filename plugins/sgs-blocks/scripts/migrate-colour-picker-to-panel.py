#!/usr/bin/env python3
"""migrate-colour-picker-to-panel.py -- migrate raw <DesignTokenPicker> colour mounts in a
block's edit.js into row descriptors inside that block's ONE <SgsColourPanel>, per the
standard ruled this session (D890 / Spec 35 Part O 9e-9f / golden-controls.json
controls.colour.placement): colour lives in ONE SgsColourPanel per block
(65 of 83 blocks mount it, each exactly once), and a variant-specific row is OMITTED
(rows.filter(Boolean)) rather than disabled when it doesn't apply.

SCOPE (this run, verified live): 6 blocks still mount a raw <DesignTokenPicker> instead of
routing through SgsColourPanel -- hero (2), info-box (1), mega-panel (1), multi-button (3),
pricing-table (1), trust-bar (1) = 9 raw mounts total (grep -l "<DesignTokenPicker"
src/blocks/*/edit.js). The scan below is written UNIVERSALLY over every src/blocks/*/edit.js
(R-31-9 -- no per-block carve-out), so it will also classify any NEW raw mount a future block
introduces; it is not hardcoded to the 6 names above.

CLASSIFICATION IS THE HARD PART -- refuse rather than guess (Bean's rule, this session).
Every raw mount sorts into exactly one bucket:

    MIGRATABLE-FILL   -- a plain block attribute, background/fill colour -> fillRow()
    MIGRATABLE-TEXT   -- a plain block attribute, text colour            -> textRow()
    MIGRATABLE-BORDER -- a border colour that is a plain block attribute (owner-overruled
                                        2026-08-30 -- borderRow() is NOT the target; every
                                        border colour routes through SgsBorderControl, the
                                        44-adopter composite that already pairs colour+width+
                                        style+radius. Where the block has NO existing
                                        SgsBorderControl for the SURFACE this picker paints
                                        (e.g. sgs/hero's splitMediaBorderColour targets the
                                        split-media column, not the root the block's existing
                                        SgsBorderControl already governs; sgs/multi-button has
                                        ZERO SgsBorderControl mounts at all), the fix is a NEW
                                        SgsBorderControl mount for that surface -- never a
                                        merge into an unrelated existing mount, never
                                        borderRow(). This script does not yet auto-apply this
                                        category (see WHAT --fix --apply DOES below); Task 2
                                        builds that mechanism.
    MIGRATABLE-BORDER-NATIVE-PURGE  -- binds to WP-native-SHAPED attributes.style.border.color
                                        (the "Border colour"/"Border gradient" rows on
                                        sgs/hero:1543 + sgs/info-box:517). Owner-overruled
                                        2026-08-30 (D751 precedent -- native colour UI is
                                        purged, not accommodated, no back-compat path): this is
                                        NOT a refusal reason, it is precisely the shape to
                                        remove. **Verified live (this session) that neither
                                        block actually declares `supports.__experimentalBorder`
                                        / `supports.border` at all** -- so there is no
                                        WordPress-registered native Border panel duplicating
                                        this control; `attributes.style` is merely a generic
                                        object attribute WP auto-registers whenever ANY visual
                                        support (color/spacing/typography/shadow) is declared,
                                        and these bespoke pickers write into it by hand. On
                                        sgs/hero the solid-colour half writes to a value
                                        render.php NEVER reads (dead code, confirmed by full
                                        grep of hero/render.php for any `style`+`border`
                                        reference); on both blocks the GRADIENT half
                                        (`onGradientChange`) writes `borderColourGradient`,
                                        the EXACT SAME attribute the block's own
                                        already-mounted root `SgsBorderControl` also writes via
                                        its `onColourGradientChange` prop -- a live duplicate
                                        writer, the identical defect class as trust-bar's
                                        duplicate `textColour` (commit `99d2204da`). The correct
                                        fix is DELETION of the whole bespoke mount (root
                                        border colour+gradient is already fully covered by the
                                        existing SgsBorderControl), not a row-insertion --
                                        different apply mechanism from fillRow/textRow, not yet
                                        built (Task 2).
    REFUSED-NOT-BLOCK-ATTRIBUTE     -- the picker's value lives INSIDE an object-typed block
                                        attribute (e.g. sgs/mega-panel's
                                        asideSeparator.colour) rather than being itself a
                                        top-level block attribute. fillRow/textRow require
                                        attrs.base to name a block attribute directly; there is
                                        nowhere to point them.
    REFUSED-REPEATER-ITEM           -- the picker sits inside one item of a repeater
                                        (sgs/pricing-table's plan.ribbonColour via
                                        updatePlan(), sgs/trust-bar's item.fillColour via
                                        update()) -- writes go through a per-item callback,
                                        never setAttributes directly. sgs/trust-bar's case is
                                        additionally the icon-fill/SVG-paint mechanism
                                        (render.php resolves it via sgs_colour_value() and
                                        paints an SVG `fill`, not a CSS background/text
                                        colour -- a third mechanism, neither fill nor text)
                                        and is reported with that extra detail when the
                                        block's render.php confirms it.
    AMBIGUOUS                       -- a plain block attribute whose label does not clearly
                                        say fill/background or text. Never guessed at --
                                        surfaced for a human hand-edit (Task 2).
    REFUSED-UNRESOLVED-BINDING      -- the value/onChange expressions don't match any of the
                                        shapes above. Refused, never guessed.

⛔ A WRONG MIGRATION IS WORSE THAN A REFUSAL. It silently moves a client-facing control and
can drop `linked` (which decides whether a picked colour stores the palette TOKEN SLUG or a
baked hex -- D881: without it a client's colour freezes against a re-skin). fillRow()/
textRow() set `linked: true` themselves unconditionally (colour-variants/fillRow.js:73,
textRow.js:51) -- verified by reading the source, not assumed.

WHAT --fix --apply DOES, for a MIGRATABLE-FILL / MIGRATABLE-TEXT mount only
------------------------------------------------------
1. Removes the raw `<DesignTokenPicker ... />` JSX mount from the block's edit.js.
2. Inserts a `fillRow({ key, label, attrs: { base: <attr> }, attributes, setAttributes })`
   (or `textRow(...)` for MIGRATABLE-TEXT) call as a new element of the block's
   `<SgsColourPanel rows={ [ ... ] } />` array, immediately before the closing `]`.
3. Ensures `fillRow`/`textRow` (whichever is used) is imported from '../../components' --
   inserted next to the other colour-variants import if missing.

⚠ MIGRATABLE-BORDER / MIGRATABLE-BORDER-NATIVE-PURGE have NO --fix --apply support yet
(Task 1b classifies them only; their apply mechanism differs from a SgsColourPanel row
insertion -- one is a NEW SgsBorderControl mount per surface, the other is a MOUNT
DELETION -- and is Task 2's job). --fix / --check currently still scope to
MIGRATABLE-FILL/-TEXT only; a MIGRATABLE-BORDER* mount is reported as a refusal-style
line in --fix output and is NOT counted by --check.
A block with NO `<SgsColourPanel` mount at all is refused outright (nowhere to migrate onto)
-- REFUSED-NO-COLOUR-PANEL.

WHY BRACKET-BALANCED TEXT SCANNING, NOT A JS AST (mirrors migrate-box-control-presets.py's
own justification note, same reasoning applies here): the target shapes are bounded and
already fully enumerated by the live 9-mount population -- a JSX prop object (`states={[...]}`)
or a single `value={...} onChange={...}` pair, both parseable with a depth-aware character
walk over `{`/`(`/`[`. No @babel dependency needed, so `--self-test`/`--check` run with the
Python already on PATH.

USAGE
-----
    python migrate-colour-picker-to-panel.py --survey        # census; classify every raw mount
    python migrate-colour-picker-to-panel.py --fix            # dry run, prints a diff
    python migrate-colour-picker-to-panel.py --fix --apply    # write
    python migrate-colour-picker-to-panel.py --check          # gate: exit 1 on any MIGRATABLE mount not yet migrated
    python migrate-colour-picker-to-panel.py --self-test
"""

import argparse
import difflib
import json
import os
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

TAG_RE = re.compile(r'<DesignTokenPicker(?![A-Za-z])')
PANEL_OPEN_RE = re.compile(r'<SgsColourPanel(?![A-Za-z])')

STYLE_BORDER_RE = re.compile(r'\.style\??\.\s*border')
ATTRS_MEMBER_RE = re.compile(r'^attributes\.([A-Za-z_$][\w$]*)\s*(?:\?\?.*|\|\|.*)?$')
BARE_IDENT_RE = re.compile(r'^([A-Za-z_$][\w$]*)\s*(?:\?\?.*|\|\|.*)?$')
OBJ_MEMBER_RE = re.compile(r'^([A-Za-z_$][\w$]*)\s*\??\.\s*([A-Za-z_$][\w$]*)')
BORDER_WORD_RE = re.compile(r'border', re.I)
TEXT_WORD_RE = re.compile(r'\btext\b', re.I)
FILL_WORD_RE = re.compile(r'background|fill|\bbg\b', re.I)


# ── Generic bracket-balanced helpers (mirrors migrate-box-control-presets.py) ──────────────

def find_tag_span(text, start, tag_len):
    """Bracket-balanced scan from a tag's `<Name` to its own self-closing `/>`.

    Returns end_exclusive, or None if the tag never returns to depth 0 within a bounded
    window (2000 chars -- every real mount in this tree is well under 1000) or is not
    self-closing (this codebase's DesignTokenPicker/SgsColourPanel mounts always are).
    """
    depth = 0
    limit = min(len(text), start + 4000)
    i = start + tag_len
    while i < limit:
        ch = text[i]
        if ch in '{([':
            depth += 1
        elif ch in '})]':
            depth -= 1
        elif depth == 0 and text[i:i + 2] == '/>':
            return i + 2
        elif depth == 0 and ch == '>':
            return None  # non-self-closing -- not a shape this tree uses; refuse
        i += 1
    return None


def extract_brace_prop(tag_text, prop_name):
    """Extract the `{ ... }` expression bound to `prop_name={ ... }` inside a JSX tag's
    text. Returns the trimmed inner text, or None if the prop is absent or not brace-form."""
    m = re.search(r'\b' + re.escape(prop_name) + r'\s*=\s*\{', tag_text)
    if not m:
        return None
    i = m.end()  # just past the opening '{'
    depth = 1
    start = i
    n = len(tag_text)
    while i < n and depth > 0:
        ch = tag_text[i]
        if ch in '{([':
            depth += 1
        elif ch in '})]':
            depth -= 1
        i += 1
    if depth != 0:
        return None
    return tag_text[start:i - 1].strip()


def has_bare_bool_prop(tag_text, prop_name):
    """True if `prop_name` appears as a bare boolean-shorthand prop (not `prop_name=`)."""
    return re.search(r'(?<![\w-])' + re.escape(prop_name) + r'\b(?!\s*=)', tag_text) is not None


def find_top_level_brace_objects(text):
    """Every top-level `{ ... }` span in `text` (used to split a states array's elements).

    Tracks ONLY curly-brace depth, deliberately -- every real state object's body is valid
    JS, so any `(`/`)`/`[`/`]` inside it is already self-balanced and never needs separate
    tracking. (An earlier version tracked parens too and double-counted them, desyncing
    depth on a single-line arrow function like `onChange: ( val ) => setAttributes( {...} )`
    -- caught by this script's own --self-test, which is why this note exists.)
    """
    spans = []
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0:
                start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start is not None:
                spans.append(text[start:i + 1])
                start = None
    return spans


def extract_obj_prop(obj_text, prop_name):
    """Extract the value expression bound to `prop_name:` inside an object-literal's text
    body (NOT a JSX prop -- terminates at a top-level comma or end of text, not `}`)."""
    m = re.search(r'(?<![\w$])' + re.escape(prop_name) + r'\s*:\s*', obj_text)
    if not m:
        return None
    i = m.end()
    depth = 0
    n = len(obj_text)
    start = i
    while i < n:
        ch = obj_text[i]
        if ch in '{([':
            depth += 1
        elif ch in '})]':
            if depth == 0:
                break
            depth -= 1
        elif ch == ',' and depth == 0:
            break
        i += 1
    return obj_text[start:i].strip()


def line_of(text, index):
    return text.count('\n', 0, index) + 1


# ── Mount model ──────────────────────────────────────────────────────────────────────────

class Mount:
    def __init__(self, block, file, start, end, tag_text, line):
        self.block = block
        self.file = file
        self.start = start
        self.end = end
        self.tag_text = tag_text
        self.line = line
        self.label = None
        self.category = None
        self.attr_name = None
        self.detail = None
        self.shape = None  # 'states' | 'single'
        # 'attrs' (top-level attribute, attrs.base binding) or 'getset' (object-attribute
        # field / repeater-item field, reached via fillRow/textRow's 2026-08-30 get/set
        # binding override). Only meaningful on MIGRATABLE-FILL/-TEXT.
        self.binding_kind = 'attrs'
        self.get_expr = None   # raw source text of the original `value` expression
        self.set_expr = None   # raw source text of the original `onChange` expression


def extract_label(tag_text):
    m = re.search(r"label\s*=\s*\{\s*__\(\s*(['\"])(.*?)\1", tag_text, re.S)
    return m.group(2) if m else ''


def resolve_nonattr_colour_mechanism(block, prop, label):
    """For a colour whose value lives at `base.prop` -- an object-attribute field
    (mega-panel's asideSeparator.colour) or a repeater-item field (pricing-table's
    plan.ribbonColour, trust-bar's item.fillColour) -- neither attrs.base binding
    is reachable, but the 2026-08-30 fillRow/textRow get/set override can reach
    either shape. What was previously a blanket structural refusal
    (REFUSED-NOT-BLOCK-ATTRIBUTE / REFUSED-REPEATER-ITEM) is reclassified here by
    TRACING THE ACTUAL RENDER MECHANISM in the block's own render.php + style
    sheet -- never guessed from the JS shape alone (2026-08-30 owner ruling).

    Evidence-driven, universal (R-31-9): this walks render.php looking for the
    PHP array key `['<prop>']`, then asks what CSS mechanism the resolved value
    ultimately feeds --
      - a CSS custom property that is consumed by an SVG `fill:` declaration
        (in render.php's own emitted CSS or the block's style.css/scss) is a
        THIRD colour mechanism, distinct from both fillRow (background) and
        textRow (text/background-clip) -- refused, never migrated onto either.
      - a custom property consumed by `background`/`background-color` (direct,
        or via that indirection) -> MIGRATABLE-FILL.
      - failing that, a direct declaration near the key that paints a
        border/line colour (not a text colour) -> MIGRATABLE-FILL (fillRow is
        the generic "solid colour, not text-clip" bucket -- see fillRow.js's
        own docstring; a border colour that does not warrant a full
        SgsBorderControl composite, e.g. a single decorative divider line,
        still routes here rather than through the border family).
      - a label saying 'text' -> MIGRATABLE-TEXT; a label saying fill/
        background -> MIGRATABLE-FILL.
      - nothing confirmable -> None (caller falls back to the existing
        structural refusal, never guesses).

    Returns (category, detail) or None.
    """
    block_dir = BLOCKS_DIR / block.split('/')[-1]
    render_php = block_dir / 'render.php'
    if not render_php.exists():
        return None
    render_src = render_php.read_text(encoding='utf-8', errors='ignore')
    style_src = ''
    for sf in list(block_dir.glob('style.*')):
        style_src += sf.read_text(encoding='utf-8', errors='ignore')

    key_re = re.compile(r'''\[\s*['"]''' + re.escape(prop) + r'''['"]\s*\]''')
    key_m = key_re.search(render_src)
    if not key_m:
        return None  # cannot confirm the mechanism from render.php -- refuse to guess

    css_var_names = set(re.findall(r'--([a-z0-9-]+)\s*:', render_src))
    svg_fill_vars = set()
    bg_vars = set()
    for var in css_var_names:
        fill_re = re.compile(r'\bfill\s*:\s*[^;]*--' + re.escape(var) + r'\b')
        bg_re = re.compile(r'\bbackground(?:-color)?\s*:\s*[^;]*--' + re.escape(var) + r'\b')
        if fill_re.search(render_src) or fill_re.search(style_src):
            svg_fill_vars.add(var)
        if bg_re.search(render_src) or bg_re.search(style_src):
            bg_vars.add(var)

    if svg_fill_vars:
        return (
            'REFUSED-SVG-FILL-MECHANISM',
            'CONFIRMED via render.php + style sheet: resolves through a CSS custom '
            f'property ({", ".join(sorted(svg_fill_vars))}) consumed by an SVG `fill:` '
            'declaration -- a THIRD colour mechanism, neither CSS background/fill nor '
            'text colour. Would be wrong to migrate onto fillRow even though the value '
            'is a plain repeater-item/object-attribute field the get/set path CAN reach.',
        )
    if bg_vars:
        return ('MIGRATABLE-FILL', None)

    window = render_src[max(0, key_m.start() - 400): key_m.end() + 800]
    if TEXT_WORD_RE.search(label or ''):
        return ('MIGRATABLE-TEXT', None)
    if (
        re.search(r'\bborder(?:-left|-right|-top|-bottom)?\s*:', window)
        or FILL_WORD_RE.search(label or '')
    ):
        return ('MIGRATABLE-FILL', None)
    return None


def classify_binding(value_expr, onchange_expr, label, block=None):
    """Returns (category, attr_name_or_binding, detail). `block` (e.g. 'sgs/hero')
    is required to resolve the object-attr/repeater-item get/set reclassification
    below; every real scan call supplies it."""
    ve = (value_expr or '').strip()
    oe = (onchange_expr or '').strip()

    if not ve:
        return ('REFUSED-UNRESOLVED-BINDING', None, 'no value expression found on this state/mount')

    if STYLE_BORDER_RE.search(ve):
        return (
            'MIGRATABLE-BORDER-NATIVE-PURGE',
            None,
            'binds to WP-native-SHAPED attributes.style.border(.color) -- owner-overruled '
            '2026-08-30 (D751 precedent, native colour UI is purged not accommodated): '
            'neither hero nor info-box declares supports.__experimentalBorder/border at all, '
            'so no WP-registered native panel exists here -- verify per-block before assuming '
            'one does. The fix is DELETION of this bespoke mount: its gradient half writes '
            'borderColourGradient, the SAME attribute the block\'s own already-mounted root '
            'SgsBorderControl also writes (a live duplicate writer, the trust-bar textColour '
            'defect class); its solid-colour half may be fully dead (verified true for hero: '
            'render.php never reads style.border at all). Not yet auto-applied by this script.',
        )

    m = ATTRS_MEMBER_RE.match(ve) or BARE_IDENT_RE.match(ve)
    if m:
        attr_name = m.group(1)
        literal_key_re = re.compile(r'setAttributes\(\s*\{\s*' + re.escape(attr_name) + r'\s*:')
        if 'setAttributes(' in oe and literal_key_re.search(oe):
            if BORDER_WORD_RE.search(attr_name) or BORDER_WORD_RE.search(label or ''):
                return (
                    'MIGRATABLE-BORDER',
                    attr_name,
                    'border colour, plain block attribute -- owner-overruled 2026-08-30: '
                    'target is SgsBorderControl (44 adopters), NOT borderRow (zero adopters, '
                    'still refused as a helper). Verify per-mount whether an existing '
                    'SgsBorderControl on this block already governs the SAME surface -- if '
                    'so this needs to route into that mount; if the surface has no existing '
                    'mount (e.g. a child-group-defaults surface, or a non-root element like '
                    'split-media), this needs a NEW SgsBorderControl mount for that surface, '
                    'never a merge into an unrelated one. Not yet auto-applied by this script.',
                )
            if TEXT_WORD_RE.search(label or ''):
                return ('MIGRATABLE-TEXT', attr_name, None)
            if FILL_WORD_RE.search(label or ''):
                return ('MIGRATABLE-FILL', attr_name, None)
            return (
                'AMBIGUOUS',
                attr_name,
                f'label {label!r} does not clearly say fill/background or text -- hand-edit in Task 2',
            )
        # Bare identifier / attributes.X resolved, but onChange doesn't confirm a plain
        # literal-key setAttributes write -- don't guess at what it does instead.
        return (
            'REFUSED-UNRESOLVED-BINDING',
            attr_name,
            f'value resolves to a plain identifier but onChange does not write it back via '
            f'a literal-key setAttributes({{ {attr_name}: ... }}) call: {oe!r}',
        )

    m2 = OBJ_MEMBER_RE.match(ve)
    if m2:
        base, prop = m2.group(1), m2.group(2)
        binding = f'{base}.{prop}'

        # 2026-08-30 reclassification pass: the get/set override on fillRow/textRow
        # can now REACH this shape (object-attribute field or repeater-item field).
        # Whether it SHOULD is decided by tracing the actual render mechanism, never
        # guessed from the JS shape -- see resolve_nonattr_colour_mechanism's own
        # docstring. A block passed in (every real scan call supplies one; only the
        # unit-test fixtures that exercise this branch without one fall through to
        # the pre-2026-08-30 blanket refusal below).
        resolved = resolve_nonattr_colour_mechanism(block, prop, label) if block else None
        if resolved:
            cat, extra_detail = resolved
            if cat == 'REFUSED-SVG-FILL-MECHANISM':
                return (cat, binding, extra_detail)
            if cat in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT'):
                verb = 'setAttributes(...)' if 'setAttributes(' in oe else 'a repeater-item callback'
                return (
                    cat,
                    binding,
                    f'CONFIRMED via render.php{"+ style sheet" if "svg" in (extra_detail or "").lower() else ""}: '
                    f'value lives at "{binding}" (reached via {verb}), unreachable by attrs.base, but the '
                    '2026-08-30 fillRow/textRow get/set override binds it directly -- get: reads the '
                    f'original value expression, set: reuses the original onChange as the writer verbatim. '
                    'No --fix --apply support yet for this binding shape (Task 2 scope was the two border '
                    'mechanics only); reclassified here so the census stops mislabelling it a structural refusal.',
                )

        if 'setAttributes(' in oe:
            return (
                'REFUSED-NOT-BLOCK-ATTRIBUTE',
                binding,
                f'value lives inside object-typed attribute "{base}", not itself a top-level '
                f'block attribute -- fillRow/textRow need attrs.base to name a block attribute directly',
            )
        callee_m = re.search(r'=>\s*([A-Za-z_$][\w$]*)\s*\(', oe) or re.match(r'^([A-Za-z_$][\w$]*)\s*\(', oe)
        callee = callee_m.group(1) if callee_m else 'a local callback'
        return (
            'REFUSED-REPEATER-ITEM',
            binding,
            f'value/onChange are wired through a repeater-item callback ("{callee}(...)"), '
            f'never setAttributes directly -- this picker lives inside one item of a repeater',
        )

    return (
        'REFUSED-UNRESOLVED-BINDING',
        None,
        f'value expression {ve!r} does not match any known shape -- refusing rather than guessing',
    )


def scan_mounts_in_file(block, path, text=None):
    text = text if text is not None else path.read_text(encoding='utf-8')
    mounts = []
    for m in TAG_RE.finditer(text):
        start = m.start()
        end = find_tag_span(text, start, len('<DesignTokenPicker'))
        if end is None:
            mnt = Mount(block, path, start, None, text[start:start + 100], line_of(text, start))
            mnt.category = 'REFUSED-UNRESOLVED-BINDING'
            mnt.detail = 'could not locate a self-closing `/>` for this mount within the scan window'
            mounts.append(mnt)
            continue
        tag_text = text[start:end]
        mount = Mount(block, path, start, end, tag_text, line_of(text, start))
        mount.label = extract_label(tag_text)

        states_blob = extract_brace_prop(tag_text, 'states')
        if states_blob is not None:
            mount.shape = 'states'
            objs = find_top_level_brace_objects(states_blob)
            if not objs:
                mount.category = 'REFUSED-UNRESOLVED-BINDING'
                mount.detail = 'states={...} present but no parseable state object found'
                mounts.append(mount)
                continue
            # Classify off the FIRST ('normal') state -- every real mount's states share one
            # binding shape (same base attribute family), confirmed live across all 9 mounts.
            first = objs[0]
            value_expr = extract_obj_prop(first, 'value')
            onchange_expr = extract_obj_prop(first, 'onChange')
            cat, attr, detail = classify_binding(value_expr, onchange_expr, mount.label, block)
        else:
            mount.shape = 'single'
            value_expr = extract_brace_prop(tag_text, 'value')
            onchange_expr = extract_brace_prop(tag_text, 'onChange')
            cat, attr, detail = classify_binding(value_expr, onchange_expr, mount.label, block)

        mount.category = cat
        mount.attr_name = attr
        mount.detail = detail
        # get/set binding (2026-08-30 reclassification): the object-attr/repeater-item
        # shape can't be named by attrs.base, so record the ORIGINAL value/onChange
        # source text -- get/set reuse it verbatim once an apply mechanic exists.
        if cat in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') and attr and '.' in attr:
            mount.binding_kind = 'getset'
            mount.get_expr = (value_expr or '').strip()
            mount.set_expr = (onchange_expr or '').strip()
        mounts.append(mount)
    return mounts


def all_edit_files():
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        edit_js = block_dir / 'edit.js'
        if edit_js.is_file():
            yield 'sgs/%s' % block_dir.name, edit_js


def census():
    out = []
    for block_slug, path in all_edit_files():
        out.extend(scan_mounts_in_file(block_slug, path))
    return out


# ── --fix / --apply ─────────────────────────────────────────────────────────────────────

def find_colour_panel_rows_span(text):
    """Locate the `<SgsColourPanel ... rows={ [ ... ] } ... />` mount and return
    (rows_array_open_idx, rows_array_close_idx) -- indices of the `[` and matching `]` --
    or None if no SgsColourPanel mount exists in this file."""
    m = PANEL_OPEN_RE.search(text)
    if not m:
        return None
    panel_end = find_tag_span(text, m.start(), len('<SgsColourPanel'))
    if panel_end is None:
        return None
    panel_text = text[m.start():panel_end]
    rows_m = re.search(r'\brows\s*=\s*\{\s*\[', panel_text)
    if not rows_m:
        return None
    open_idx_local = rows_m.end() - 1  # index of '['
    depth = 0
    i = open_idx_local
    n = len(panel_text)
    while i < n:
        ch = panel_text[i]
        if ch in '{([':
            depth += 1
        elif ch in '})]':
            depth -= 1
            if depth == 0 and ch == ']':
                close_idx_local = i
                return (m.start() + open_idx_local, m.start() + close_idx_local)
        i += 1
    return None


def slugify_key(attr_name):
    # camelCase attr name -> a stable, readable row key. Not cosmetic-critical (SgsColourPanel
    # only needs uniqueness) but kept human-legible for the array a reviewer will read.
    s = re.sub(r'(?<!^)(?=[A-Z])', '-', attr_name).lower()
    return s


def build_row_call(helper, attr_name, label, item_indent):
    """`item_indent` is the indentation of a top-level rows-array ENTRY (matching the
    file's own existing entries) -- NEVER hardcoded, so the emitted row sits at the same
    depth as its siblings regardless of a file's own tab/nesting convention."""
    key = slugify_key(attr_name)
    field_indent = item_indent + '\t'
    return (
        f"{item_indent}{helper}( {{\n"
        f"{field_indent}key: '{key}',\n"
        f"{field_indent}label: __( '{label}', 'sgs-blocks' ),\n"
        f"{field_indent}attrs: {{ base: '{attr_name}' }},\n"
        f"{field_indent}attributes,\n"
        f"{field_indent}setAttributes,\n"
        f"{item_indent}" + "} ),\n"
    )


def ensure_helper_imported(text, helper):
    """Insert `helper,` into the '../../components' named-import block if not already
    imported. Anchors on the existing `fillRow,`/`SgsColourPanel,` line -- refuses (returns
    text unchanged, flag False) if that import block can't be found, rather than guessing
    where to splice."""
    if re.search(r'\b' + re.escape(helper) + r'\b\s*,?\s*\n', text) and re.search(
        r"from\s+'\.\./\.\./components'", text
    ):
        # crude but sufficient: if the bare token already appears anywhere before the import
        # closes AND the components import exists, assume it's already imported.
        import_block_m = re.search(
            r"import\s*\{([^}]*)\}\s*from\s*'\.\./\.\./components';", text, re.S
        )
        if import_block_m and re.search(r'\b' + re.escape(helper) + r'\b', import_block_m.group(1)):
            return text, True
    import_block_m = re.search(
        r"(import\s*\{)([^}]*)(\}\s*from\s*'\.\./\.\./components';)", text, re.S
    )
    if not import_block_m:
        return text, False
    body = import_block_m.group(2)
    if re.search(r'\b' + re.escape(helper) + r'\b', body):
        return text, True
    new_body = body.rstrip()
    if not new_body.endswith(','):
        new_body += ','
    new_body += f'\n\t{helper},'
    new_text = (
        text[: import_block_m.start()]
        + import_block_m.group(1)
        + new_body
        + '\n'
        + import_block_m.group(3)
        + text[import_block_m.end():]
    )
    return new_text, True


def apply_fixes_to_file(path, migratable_mounts, write):
    """migratable_mounts: Mount objects for ONE file, all MIGRATABLE-FILL/-TEXT. Returns
    (changed, diff_lines, refused_insert)."""
    original = path.read_text(encoding='utf-8', newline='')
    if not migratable_mounts:
        return False, [], None
    text = original

    rows_span = find_colour_panel_rows_span(text)
    if rows_span is None:
        return False, [], 'no <SgsColourPanel rows={[...]}> mount found in this file'

    # Remove mounts FIRST, working from the END of the file backwards so earlier offsets
    # (including rows_span, which is always before these DesignTokenPicker mounts in every
    # real file) stay valid.
    ordered = sorted(migratable_mounts, key=lambda m: m.start, reverse=True)
    for mount in ordered:
        # Consume the mount's own leading indentation + trailing newline so removal doesn't
        # leave a blank line.
        seg_start = mount.start
        line_start = text.rfind('\n', 0, seg_start) + 1
        seg_end = mount.end
        if text[seg_end:seg_end + 1] == '\n':
            seg_end += 1
        text = text[:line_start] + text[seg_end:]

    # Re-locate rows_span in the (possibly shifted, but only shifted at offsets AFTER it if
    # any removed mount sat before it -- verified false for every known mount, checked here
    # defensively) mutated text, then insert the new row calls before the closing ']'.
    rows_span2 = find_colour_panel_rows_span(text)
    if rows_span2 is None:
        return False, [], 'SgsColourPanel rows array vanished unexpectedly after removing mounts'
    open_idx, close_idx = rows_span2

    # Derive indentation from the file's OWN `rows={ [` line -- never hardcoded, so the
    # emitted rows sit at whatever depth this particular file already uses (verified this
    # matters: an earlier hardcoded-tabs version misindented every real file, caught by
    # inspecting a --apply'd scratch copy of sgs/multi-button before trusting the diff).
    open_line_start = text.rfind('\n', 0, open_idx) + 1
    base_indent = re.match(r'[ \t]*', text[open_line_start:open_idx]).group(0)
    item_indent = base_indent + '\t'

    insertion = ''
    for mount in migratable_mounts:
        helper = 'fillRow' if mount.category == 'MIGRATABLE-FILL' else 'textRow'
        insertion += build_row_call(helper, mount.attr_name, mount.label, item_indent)
        text, ok = ensure_helper_imported(text, helper)
        if not ok:
            return False, [], f"couldn't locate the '../../components' import block to add {helper}"
        # re-locate close_idx after a possible import-block length change
        rows_span3 = find_colour_panel_rows_span(text)
        if rows_span3 is None:
            return False, [], 'SgsColourPanel rows array vanished unexpectedly after import edit'
        close_idx = rows_span3[1]

    # Insert at the START of the closing-`]` line, never at the `]` character itself --
    # close_idx sits right after that line's OWN leading indent, so splicing there would
    # swallow the existing indent as a prefix of our insertion (leaving the ']' line's
    # indent orphaned mid-insertion). Caught by inspecting a real --apply'd scratch copy
    # of sgs/multi-button, not by the diff alone (the diff line noise hid it).
    close_line_start = text.rfind('\n', 0, close_idx) + 1
    text = text[:close_line_start] + insertion + text[close_line_start:]

    if not write and text == original:
        return False, [], None

    diff = list(
        difflib.unified_diff(
            original.splitlines(keepends=True),
            text.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path) + ' (fixed)',
            lineterm='\n',
        )
    )
    if write and text != original:
        tmp = path.with_suffix(path.suffix + '.tmp')
        tmp.write_text(text, encoding='utf-8', newline='')
        os.replace(tmp, path)
    return text != original, diff, None


# ── MIGRATABLE-FILL/-TEXT get/set apply mechanic (Task 3, 2026-08-30) ──────────────────────
# For a mount whose value lives at `base.prop` -- an object-attribute field
# (mega-panel's `asideSeparator.colour`) or a repeater-item field (pricing-table's
# `plan.ribbonColour`) -- reclassified MIGRATABLE-FILL/-TEXT with `binding_kind == 'getset'`
# by resolve_nonattr_colour_mechanism() above. attrs.base cannot name either shape, so
# fillRow/textRow's get/set override (fillRow.js, 2026-08-30) is used instead: `get` reads
# the ORIGINAL value expression, `set` reuses the ORIGINAL onChange handler VERBATIM.
#
# IN-PLACE, deliberately never lifted into the file's other top-level `<SgsColourPanel
# rows={[...]}>` (the attrs.base mechanism's target). Two independent reasons, both real:
#   1. Scope -- pricing-table's get/set close over `plan`/`planIndex`, loop-locals from
#      the `plans.map(...)` callback. Lifting the row into the top-level array (defined
#      OUTSIDE that callback) would be a ReferenceError at runtime -- those names don't
#      exist there. mega-panel's `asideSeparator` IS a top-level attribute and COULD be
#      lifted, but doing so would move a "Divider colour" control out of its own Divider
#      panel into the unrelated top-level Colour panel -- a UX relocation this task never
#      asked for. IN-PLACE is the one mechanism that is correct for both without a
#      per-block special case.
#   2. Task 3's own instruction for pricing-table -- "USE that [updatePlan] callback; do
#      not hand-roll a second array-rebuild path" -- is satisfied for free: `set_expr` is
#      reused byte-for-byte, and it already calls `updatePlan(...)`.
#
# The raw `<DesignTokenPicker>` mount is replaced, at its own JSX position, with a
# minimal `<SgsColourPanel rows={[ fillRow/textRow({...}) ]} />` -- one row, one panel,
# same slot in the tree, so no other sibling control shifts panel or position.

def build_row_call_getset(helper, mount, item_indent):
    """Builds a fillRow/textRow call using get/set (2026-08-30 binding). `mount.get_expr`
    was a bare value expression (e.g. `asideSeparator?.colour`, `plan.ribbonColour ||
    'accent'`) -- wrapped in a `() => ...` arrow, since fillRow's `get` prop is a function.
    `mount.set_expr` was ALREADY a full arrow function (the original onChange handler, e.g.
    `( value ) => setAttributes( { asideSeparator: { ...asideSeparator, colour: value || '' } } )`
    or `( val ) => updatePlan( planIndex, 'ribbonColour', val )`) -- reused verbatim, no
    re-wrapping, so the exact original write path (including any existing repeater
    callback) survives unchanged."""
    key = slugify_key(re.sub(r'[.\[\]]+', '-', mount.attr_name).strip('-'))
    field_indent = item_indent + '\t'
    label = mount.label or mount.attr_name
    return (
        f"{item_indent}{helper}( {{\n"
        f"{field_indent}key: '{key}',\n"
        f"{field_indent}label: __( '{label}', 'sgs-blocks' ),\n"
        f"{field_indent}get: () => {mount.get_expr},\n"
        f"{field_indent}set: {mount.set_expr},\n"
        f"{item_indent}" + "} ),\n"
    )


def apply_getset_fixes_to_file(path, getset_mounts, write):
    """getset_mounts: Mount objects for ONE file, all MIGRATABLE-FILL/-TEXT with
    binding_kind == 'getset'. IN-PLACE only -- see the module comment above for why.
    Returns (changed, diff_lines, refusal)."""
    original = path.read_text(encoding='utf-8', newline='')
    if not getset_mounts:
        return False, [], None
    text = original

    ordered = sorted(getset_mounts, key=lambda m: m.start, reverse=True)
    helpers_needed = set()
    for mount in ordered:
        seg_start = strip_preceding_comment(text, mount.start)
        line_start = text.rfind('\n', 0, seg_start) + 1
        seg_end = mount.end
        if text[seg_end:seg_end + 1] == '\n':
            seg_end += 1
        indent = re.match(r'[ \t]*', text[line_start:]).group(0)
        helper = 'fillRow' if mount.category == 'MIGRATABLE-FILL' else 'textRow'
        helpers_needed.add(helper)
        row_indent = indent + '\t\t'
        new_block = (
            f"{indent}<SgsColourPanel\n"
            f"{indent}\trows={{ [\n"
            f"{build_row_call_getset(helper, mount, row_indent)}"
            f"{indent}\t] }}\n"
            f"{indent}/>\n"
        )
        text = text[:line_start] + new_block + text[seg_end:]

    for helper in sorted(helpers_needed | {'SgsColourPanel'}):
        text, ok = ensure_helper_imported(text, helper)
        if not ok:
            return False, [], f"couldn't locate the '../../components' import block to add {helper}"

    if not write and text == original:
        return False, [], None

    diff = list(
        difflib.unified_diff(
            original.splitlines(keepends=True),
            text.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path) + ' (fixed)',
            lineterm='\n',
        )
    )
    if write and text != original:
        tmp = path.with_suffix(path.suffix + '.tmp')
        tmp.write_text(text, encoding='utf-8', newline='')
        os.replace(tmp, path)
    return text != original, diff, None


# ── MIGRATABLE-BORDER-NATIVE-PURGE apply mechanic (Task 2a) ────────────────────────────────
# DELETES the bespoke WP-native-shaped `attributes.style.border.color` + `borderColourGradient`
# DesignTokenPicker mount -- its gradient half always duplicates the block's own root
# SgsBorderControl's `onColourGradientChange` write (a live duplicate writer); its solid half
# is either dead (hero -- render.php never reads style.border) or a live secondary source
# info-box's SgsBorderControl doesn't override when its OWN colour is unset (see the
# stored-value note in this script's own --fix output for that block).

def find_matching_close(text, open_tag_start, tag_name):
    """From a `<TagName` open position, find (close_end, body_start, body_end) for its
    matching `</TagName>`, counting nesting of the SAME tag name. `close_end` is the index
    just past `</TagName>`; `body_start`/`body_end` bound the children between the open
    tag's own `>` and the matching `</TagName`. Returns None if unmatched or if the tag is
    self-closing (`/>`) at its own open -- callers only use this for container tags
    (PanelBody/InspectorControls) that are never self-closing in this tree."""
    open_re = re.compile(r'<' + tag_name + r'(?![A-Za-z])')
    close_re = re.compile(r'</' + tag_name + r'\s*>')
    depth = 0
    j = open_tag_start + len('<' + tag_name)
    n = len(text)
    while j < n:
        ch = text[j]
        if ch in '{([':
            depth += 1
        elif ch in '})]':
            depth -= 1
        elif depth == 0 and text[j:j + 2] == '/>':
            return None  # self-closing -- no body, not a container to recurse into
        elif depth == 0 and ch == '>':
            break
        j += 1
    if j >= n:
        return None
    body_start = j + 1
    nest = 1
    pos = body_start
    while pos < n:
        om = open_re.search(text, pos)
        cm = close_re.search(text, pos)
        if cm is None:
            return None
        if om and om.start() < cm.start():
            nest += 1
            pos = om.end()
        else:
            nest -= 1
            pos = cm.end()
            if nest == 0:
                return (pos, body_start, cm.start())
    return None


def find_enclosing_container(text, tag_name, inner_start):
    """The TIGHTEST `<tag_name>...</tag_name>` span containing `inner_start`, as
    (open_start, close_end, body_start, body_end), or None."""
    open_re = re.compile(r'<' + tag_name + r'(?![A-Za-z])')
    best = None
    for om in open_re.finditer(text):
        result = find_matching_close(text, om.start(), tag_name)
        if result is None:
            continue
        close_end, body_start, body_end = result
        if body_start <= inner_start < close_end:
            span_len = close_end - om.start()
            if best is None or span_len < best[1] - best[0]:
                best = (om.start(), close_end, body_start, body_end)
    return best


def is_effectively_empty_jsx(body_text):
    """True if `body_text` holds nothing but whitespace and JS/JSX comments -- i.e. a
    PanelBody would render with zero children if left in place."""
    stripped = re.sub(r'\{\s*/\*.*?\*/\s*\}', '', body_text, flags=re.S)
    stripped = re.sub(r'/\*.*?\*/', '', stripped, flags=re.S)
    return stripped.strip() == ''


def strip_preceding_comment(text, start):
    r"""If a `{/* ... */}` JSX comment sits immediately before `start` (only whitespace
    between them), return the index of that comment's OWN line start, so removal takes
    the comment along with the mount rather than leaving a stale explanation behind.
    Otherwise return `start`'s own line start.

    BOUNDED BACKWARD SCAN, not a whole-prefix regex search -- an earlier version used
    `re.search(r'\{\s*/\*.*?\*/\s*\}\s*\Z', prefix, re.S)`, which (found by inspecting a
    real --apply'd scratch copy, not by the diff alone) matched from the FIRST `{ /*`
    ANYWHERE in the entire file down to the true end of `prefix`, because `\Z` is only
    satisfiable at one position and DOTALL `.` happily spans every intervening line --
    it deleted an unrelated `<WidthPanel>` mount on hero along with the intended comment.
    This version only ever looks at the literal tail of `prefix` outward -- it cannot
    reach past the nearest comment boundary."""
    line_start = text.rfind('\n', 0, start) + 1
    prefix = text[:line_start].rstrip()
    if not prefix.endswith('}'):
        return line_start
    close_brace_idx = len(prefix) - 1
    star_close = prefix.rfind('*/', 0, close_brace_idx)
    if star_close == -1 or prefix[star_close + 2:close_brace_idx].strip() != '':
        return line_start
    open_comment = prefix.rfind('/*', 0, star_close)
    if open_comment == -1:
        return line_start
    open_brace = prefix.rfind('{', 0, open_comment)
    if open_brace == -1 or prefix[open_brace + 1:open_comment].strip() != '':
        return line_start
    comment_line_start = text.rfind('\n', 0, open_brace) + 1
    return comment_line_start


def apply_border_purge_to_file(path, purge_mounts, write):
    """purge_mounts: Mount objects for ONE file, all MIGRATABLE-BORDER-NATIVE-PURGE.
    Returns (changed, diff_lines, notes) -- notes report whether an enclosing PanelBody
    was also removed (only when it would otherwise render empty)."""
    original = path.read_text(encoding='utf-8', newline='')
    if not purge_mounts:
        return False, [], []
    text = original
    notes = []
    ordered = sorted(purge_mounts, key=lambda m: m.start, reverse=True)
    for mount in ordered:
        seg_start = strip_preceding_comment(text, mount.start)
        seg_end = mount.end
        if text[seg_end:seg_end + 1] == '\n':
            seg_end += 1

        container = find_enclosing_container(text, 'PanelBody', mount.start)
        removed_panel = False
        if container:
            open_start, close_end, body_start, body_end = container
            remaining = text[body_start:seg_start] + text[seg_end:body_end]
            if is_effectively_empty_jsx(remaining):
                panel_line_start = text.rfind('\n', 0, open_start) + 1
                panel_seg_end = close_end
                if text[panel_seg_end:panel_seg_end + 1] == '\n':
                    panel_seg_end += 1
                text = text[:panel_line_start] + text[panel_seg_end:]
                removed_panel = True
                notes.append(
                    f'{mount.block}:{mount.line} -- removed the now-empty enclosing '
                    '<PanelBody> too (it existed only to host this one mount)'
                )
        if not removed_panel:
            text = text[:seg_start] + text[seg_end:]

    if not write and text == original:
        return False, [], notes

    diff = list(
        difflib.unified_diff(
            original.splitlines(keepends=True),
            text.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path) + ' (fixed)',
            lineterm='\n',
        )
    )
    if write and text != original:
        tmp = path.with_suffix(path.suffix + '.tmp')
        tmp.write_text(text, encoding='utf-8', newline='')
        os.replace(tmp, path)
    return text != original, diff, notes


# ── MIGRATABLE-BORDER apply mechanic (Task 2b): a NEW SgsBorderControl mount ────────────────
# For a border-colour attribute with no existing SgsBorderControl governing its surface.
# Consolidates whatever bespoke width/style/radius/colour controls already exist for that
# surface into ONE canonical `<SgsBorderControl>` mount, mirroring the shape already proven
# at this block's own root (or info-box's) call site. Refuses -- never fabricates a control
# bound to an attribute block.json doesn't declare -- when the surface has no
# `{prefix}BorderWidth` + `{prefix}BorderStyle` attrs: SgsBorderControl unconditionally
# renders its width editor, so mounting it without a real attribute behind that editor
# would either crash (no onWidthChange) or silently discard every edit (D338 -- WP drops
# an attribute block.json doesn't declare), which is worse than leaving the raw picker.

def block_json_attrs(block):
    path = BLOCKS_DIR / block.split('/')[-1] / 'block.json'
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding='utf-8'))
    return set((data.get('attributes') or {}).keys())


def plan_new_border_mount(block, base_attr_name):
    """base_attr_name e.g. 'splitMediaBorderColour'. Derives the surface prefix and checks
    which sibling border attrs block.json actually declares. Returns (plan_dict, None) or
    (None, refusal_reason)."""
    if not base_attr_name.endswith('BorderColour'):
        return None, f'attribute "{base_attr_name}" does not end in "BorderColour" -- cannot derive a surface prefix'
    prefix = base_attr_name[: -len('BorderColour')]
    attrs = block_json_attrs(block)
    width_attr = f'{prefix}BorderWidth'
    style_attr = f'{prefix}BorderStyle'
    if width_attr not in attrs or style_attr not in attrs:
        missing = [a for a in (width_attr, style_attr) if a not in attrs]
        return None, (
            f'block.json declares no {" or ".join(missing)} for the "{prefix}" surface -- '
            'SgsBorderControl unconditionally renders a width editor, so mounting it without '
            'a real width attribute behind it would crash (no onWidthChange) or silently '
            'discard edits (D338). This is a block.json gap; out of this script\'s file scope '
            '(edit.js only). Needs a decision -- add the attrs, or leave this mount raw -- '
            'before a full SgsBorderControl mount can land here.'
        )
    radius_attr = f'{prefix}BorderRadius'
    gradient_attr = f'{prefix}BorderColourGradient'
    return {
        'prefix': prefix,
        'width_attr': width_attr,
        'style_attr': style_attr,
        'radius_attr': radius_attr if radius_attr in attrs else None,
        'radius_tablet_attr': f'{prefix}BorderRadiusTablet' if f'{prefix}BorderRadiusTablet' in attrs else None,
        'radius_mobile_attr': f'{prefix}BorderRadiusMobile' if f'{prefix}BorderRadiusMobile' in attrs else None,
        'gradient_attr': gradient_attr if gradient_attr in attrs else None,
    }, None


def find_simple_tag_span(text, tag_name, attr_needle, search_from=0):
    """Find a `<TagName ... attr_needle ... />` self-closing mount whose tag text contains
    `attr_needle` (e.g. an attribute name it reads/writes). Returns (start, end) or None."""
    for m in re.finditer(r'<' + tag_name + r'(?![A-Za-z])', text[search_from:]):
        start = search_from + m.start()
        end = find_tag_span(text, start, len('<' + tag_name))
        if end is None:
            continue
        if attr_needle in text[start:end]:
            return (start, end)
    return None


def build_border_control_call(mount, plan, item_indent):
    """Builds the replacement `<SgsBorderControl ... />` JSX, keyed off `plan`'s resolved
    attribute names. `mount` supplies the original label + colour/gradient attr names."""
    lines = [f'{item_indent}<SgsBorderControl']
    lines.append(f"{item_indent}\twidthValues={{ attributes.{plan['width_attr']} ?? {{}} }}")
    lines.append(f"{item_indent}\tonWidthChange={{ ( next ) => setAttributes( {{ {plan['width_attr']}: next }} ) }}")
    lines.append(f"{item_indent}\twidthPresets={{ [ '10', '20', '30' ] }}")
    lines.append(f"{item_indent}\tstyleValue={{ attributes.{plan['style_attr']} }}")
    lines.append(f"{item_indent}\tonStyleChange={{ ( val ) => setAttributes( {{ {plan['style_attr']}: val }} ) }}")
    label = mount.label or 'Border colour'
    lines.append(f"{item_indent}\tcolourLabel={{ __( '{label}', 'sgs-blocks' ) }}")
    lines.append(f"{item_indent}\tcolourValue={{ attributes.{mount.attr_name} }}")
    lines.append(f"{item_indent}\tonColourChange={{ ( val ) => setAttributes( {{ {mount.attr_name}: val ?? '' }} ) }}")
    if plan['gradient_attr']:
        lines.append(f"{item_indent}\tcolourGradientValue={{ attributes.{plan['gradient_attr']} }}")
        lines.append(
            f"{item_indent}\tonColourGradientChange={{ ( val ) => setAttributes( {{ {plan['gradient_attr']}: val ?? '' }} ) }}"
        )
    # colourLinked -- LOAD-BEARING (D881): without it the picker stores a baked hex instead
    # of the palette token, freezing the colour against a re-skin. Unconditional, mirroring
    # every existing SgsBorderControl call site.
    lines.append(f"{item_indent}\tcolourLinked={{ true }}")
    if plan['radius_attr']:
        if plan['radius_tablet_attr'] and plan['radius_mobile_attr']:
            # Exact 3-tier shape -- mirrors hero's own root SgsBorderControl radius
            # handler verbatim (edit.js:895-899), just re-keyed to this surface's attrs.
            radius_values = (
                f"{{\n"
                f"{item_indent}\t\tbase: attributes.{plan['radius_attr']} ?? {{}},\n"
                f"{item_indent}\t\ttablet: attributes.{plan['radius_tablet_attr']} ?? {{}},\n"
                f"{item_indent}\t\tmobile: attributes.{plan['radius_mobile_attr']} ?? {{}},\n"
                f"{item_indent}\t}}"
            )
            radius_key_map = (
                "tier === 'base' ? '%s' : tier === 'tablet' ? '%s' : '%s'"
                % (plan['radius_attr'], plan['radius_tablet_attr'], plan['radius_mobile_attr'])
            )
            lines.append(f"{item_indent}\tradiusValues={{ {radius_values} }}")
            lines.append(f"{item_indent}\tonRadiusChange={{ ( tier, next ) => {{")
            lines.append(f"{item_indent}\t\tconst radiusKey = {radius_key_map};")
            lines.append(f"{item_indent}\t\tsetAttributes( {{ [ radiusKey ]: next }} );")
            lines.append(f'{item_indent}\t}} }}')
        else:
            lines.append(f"{item_indent}\tradiusValues={{ {{ base: attributes.{plan['radius_attr']} ?? {{}} }} }}")
            lines.append(
                f"{item_indent}\tonRadiusChange={{ ( _tier, next ) => setAttributes( {{ {plan['radius_attr']}: next }} ) }}"
            )
    lines.append(f'{item_indent}/>')
    return '\n'.join(lines) + '\n'


def apply_new_border_mount_to_file(path, mounts_for_file, write):
    """mounts_for_file: MIGRATABLE-BORDER Mount objects for ONE file. For each, plans the
    surface via plan_new_border_mount; when a plan exists, removes the raw colour picker
    PLUS any sibling bespoke width/style/radius controls for the SAME surface (found by
    attribute-name reference, not by block name) and replaces the FIRST removed control's
    position with one consolidated <SgsBorderControl>. Refuses per-mount (leaves that
    mount's file untouched) when no plan exists. Returns (changed, diff, refusals) where
    refusals is a list of (mount, reason)."""
    original = path.read_text(encoding='utf-8', newline='')
    if not mounts_for_file:
        return False, [], []
    text = original
    refusals = []
    applied_any = False

    for mount in mounts_for_file:
        plan, reason = plan_new_border_mount(mount.block, mount.attr_name)
        if plan is None:
            refusals.append((mount, reason))
            continue

        # Re-locate the raw picker mount in the (possibly already-mutated-by-an-earlier-
        # mount-in-this-file) text by its attribute name, rather than trusting the
        # ORIGINAL start/end offsets (which shift once anything upstream is edited).
        picker_span = find_simple_tag_span(text, 'DesignTokenPicker', mount.attr_name)
        if picker_span is None:
            refusals.append((mount, f'could not re-locate the <DesignTokenPicker> mount for {mount.attr_name} to replace'))
            continue

        spans_to_remove = [picker_span]
        select_span = find_simple_tag_span(text, 'SelectControl', plan['style_attr'])
        if select_span:
            spans_to_remove.append(select_span)
        width_span = find_simple_tag_span(text, 'ResponsiveBoxControl', plan['width_attr'])
        if width_span:
            spans_to_remove.append(width_span)
        if plan['radius_attr']:
            radius_span = find_simple_tag_span(text, 'ResponsiveBorderRadiusControl', plan['radius_attr'])
            if radius_span:
                spans_to_remove.append(radius_span)

        # Each removed control's own preceding {/* comment */} or bare heading <p> travels
        # with it (never leaves a stale explanation/heading for a control that's gone).
        HEADING_P_RE = re.compile(r'<p\b[^>]*>\s*\{\s*__\(\s*[\'"][^\'"]*[\'"]')
        full_spans = []
        for s, e in spans_to_remove:
            seg_start = strip_preceding_comment(text, s)
            # Also swallow an immediately-preceding bare `<p>heading</p>` (the "Border
            # radius" / "Border" section dividers hero uses) -- same immediate-predecessor
            # test as strip_preceding_comment, generalised to a <p> tag instead of a comment.
            probe_line_start = text.rfind('\n', 0, seg_start) + 1
            prev_line_start = text.rfind('\n', 0, probe_line_start - 1) + 1 if probe_line_start > 0 else 0
            candidate = text[prev_line_start:probe_line_start]
            if HEADING_P_RE.search(candidate) and '</p>' in candidate:
                seg_start = prev_line_start
            seg_end = e
            if text[seg_end:seg_end + 1] == '\n':
                seg_end += 1
            full_spans.append((seg_start, seg_end))

        # Insert the new mount at the position of the FIRST (earliest) removed span.
        insert_at = min(s for s, _ in full_spans)
        # insert_at is already a LINE START (the earliest removed span's own line, after
        # strip_preceding_comment/heading-swallow above) -- its indentation is the
        # whitespace run starting AT insert_at, not before it.
        indent = re.match(r'[ \t]*', text[insert_at:]).group(0)
        new_mount = build_border_control_call(mount, plan, indent)

        ordered = sorted(full_spans, key=lambda sp: sp[0], reverse=True)
        for seg_start, seg_end in ordered:
            if seg_start == insert_at:
                text = text[:seg_start] + new_mount + text[seg_end:]
            else:
                text = text[:seg_start] + text[seg_end:]
        applied_any = True

    if not applied_any:
        return False, [], refusals

    # A conditional JSX fragment left with NOTHING inside once its width/colour controls
    # are consolidated into the new SgsBorderControl mount (e.g. hero's
    # `{ splitMediaBorderStyle !== 'none' && ( <> ... </> ) }` wrapper, once every child
    # is gone) renders nothing but is dead JSX left behind -- strip it rather than leave
    # a stray empty conditional. Bounded to the exact shape this removal can produce: a
    # `{ <cond> && (\n\t*<>\n\t*</>\n\t*) }` block on its own lines.
    text = re.sub(
        r'[ \t]*\{[^\n{}]*&&\s*\(\s*\n\s*<>\s*\n\s*</>\s*\n\s*\)\s*\}\s*\n',
        '',
        text,
    )

    if not write and text == original:
        return False, [], refusals

    diff = list(
        difflib.unified_diff(
            original.splitlines(keepends=True),
            text.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path) + ' (fixed)',
            lineterm='\n',
        )
    )
    if write and text != original:
        tmp = path.with_suffix(path.suffix + '.tmp')
        tmp.write_text(text, encoding='utf-8', newline='')
        os.replace(tmp, path)
    return text != original, diff, refusals


# ── Commands ─────────────────────────────────────────────────────────────────────────────

def cmd_survey():
    mounts = census()
    by_cat = {}
    for m in mounts:
        by_cat.setdefault(m.category, []).append(m)
    print(f'RAW <DesignTokenPicker> MOUNTS FOUND: {len(mounts)}\n')
    order = [
        'MIGRATABLE-FILL', 'MIGRATABLE-TEXT', 'MIGRATABLE-BORDER',
        'MIGRATABLE-BORDER-NATIVE-PURGE', 'AMBIGUOUS',
        'REFUSED-NOT-BLOCK-ATTRIBUTE', 'REFUSED-REPEATER-ITEM', 'REFUSED-SVG-FILL-MECHANISM',
        'REFUSED-NO-COLOUR-PANEL', 'REFUSED-UNRESOLVED-BINDING',
    ]
    seen = set(order)
    for cat in order + sorted(k for k in by_cat if k not in seen):
        ms = by_cat.get(cat)
        if not ms:
            continue
        print(f'{cat}: {len(ms)}')
        for m in ms:
            attr = f' attr={m.attr_name}' if m.attr_name else ''
            print(f'    {m.block}:{m.line}  label={m.label!r}{attr}')
            if m.detail:
                print(f'        {m.detail}')
        print()
    print(f'TOTAL: {len(mounts)} mount(s) across '
          f'{len({m.block for m in mounts})} block(s)')
    return 0


def cmd_fix(apply_):
    mounts = census()
    handled_ids = set()

    # 1) MIGRATABLE-FILL/-TEXT, attrs.base binding (unchanged mechanism -- multi-button
    #    childBtnBackground/childBtnTextColour today).
    migratable_attrs = [
        m for m in mounts
        if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') and m.binding_kind == 'attrs'
    ]
    by_file = {}
    for m in migratable_attrs:
        by_file.setdefault(m.file, []).append(m)
    changed_files = 0
    total_rows = 0
    for path, ms in sorted(by_file.items()):
        changed, diff, refusal = apply_fixes_to_file(path, ms, apply_)
        if refusal:
            print(f'  REFUSED (insert-site) {ms[0].block} -- {refusal}')
            continue
        handled_ids.update(id(m) for m in ms)
        if changed:
            changed_files += 1
            total_rows += len(ms)
            if not apply_:
                sys.stdout.write(''.join(diff))

    # 2) MIGRATABLE-BORDER-NATIVE-PURGE -- delete the mount (Task 2a).
    purge_mounts = [m for m in mounts if m.category == 'MIGRATABLE-BORDER-NATIVE-PURGE']
    purge_by_file = {}
    for m in purge_mounts:
        purge_by_file.setdefault(m.file, []).append(m)
    purged_files = 0
    purged_mounts_n = 0
    for path, ms in sorted(purge_by_file.items()):
        changed, diff, notes = apply_border_purge_to_file(path, ms, apply_)
        handled_ids.update(id(m) for m in ms)
        for note in notes:
            print(f'  NOTE {note}')
        if changed:
            purged_files += 1
            purged_mounts_n += len(ms)
            if not apply_:
                sys.stdout.write(''.join(diff))

    # 3) MIGRATABLE-BORDER -- a NEW SgsBorderControl mount (Task 2b), per-mount refusal
    #    when the surface has no width/style attrs to back it (e.g. multi-button
    #    childBtnBorderColour today).
    border_mounts = [m for m in mounts if m.category == 'MIGRATABLE-BORDER']
    border_by_file = {}
    for m in border_mounts:
        border_by_file.setdefault(m.file, []).append(m)
    new_mount_files = 0
    new_mount_n = 0
    border_refusals = []
    for path, ms in sorted(border_by_file.items()):
        changed, diff, refusals = apply_new_border_mount_to_file(path, ms, apply_)
        applied_ms = [m for m in ms if not any(m is rm for rm, _ in refusals)]
        handled_ids.update(id(m) for m in applied_ms)
        for m, reason in refusals:
            print(f'  BLOCKED {m.category} {m.block}:{m.line} attr={m.attr_name} -- {reason}')
            border_refusals.append((m, reason))
        if changed:
            new_mount_files += 1
            new_mount_n += len(applied_ms)
            if not apply_:
                sys.stdout.write(''.join(diff))

    # 4) MIGRATABLE-FILL/-TEXT, get/set binding (Task 3, 2026-08-30) -- mega-panel
    #    asideSeparator.colour, pricing-table plan.ribbonColour today. IN-PLACE mount,
    #    see apply_getset_fixes_to_file's module comment for why never lifted.
    getset_mounts = [
        m for m in mounts
        if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') and m.binding_kind == 'getset'
    ]
    getset_by_file = {}
    for m in getset_mounts:
        getset_by_file.setdefault(m.file, []).append(m)
    getset_files = 0
    getset_rows = 0
    for path, ms in sorted(getset_by_file.items()):
        changed, diff, refusal = apply_getset_fixes_to_file(path, ms, apply_)
        if refusal:
            print(f'  REFUSED (insert-site) {ms[0].block} -- {refusal}')
            continue
        handled_ids.update(id(m) for m in ms)
        if changed:
            getset_files += 1
            getset_rows += len(ms)
            if not apply_:
                sys.stdout.write(''.join(diff))

    # 5) Everything else -- structural refusals + any MIGRATABLE-BORDER mount that got
    #    BLOCKED above (already reported).
    remaining = [m for m in mounts if id(m) not in handled_ids and not any(m is rm for rm, _ in border_refusals)]
    for m in remaining:
        verb = 'NOT-YET-APPLIED' if m.category.startswith('MIGRATABLE-') else 'REFUSED'
        print(f'  {verb} {m.category} {m.block}:{m.line} -- {m.detail}')

    total_refusals = len(remaining) + len(border_refusals)
    print(
        f"\n{'APPLIED' if apply_ else 'DRY RUN'} -- colour rows: {changed_files} file(s)/{total_rows} row(s); "
        f"native-purge deletions: {purged_files} file(s)/{purged_mounts_n} mount(s); "
        f"new border mounts: {new_mount_files} file(s)/{new_mount_n} mount(s); "
        f"get/set rows: {getset_files} file(s)/{getset_rows} row(s); "
        f"{total_refusals} refusal(s)/not-yet-applied"
    )
    if not apply_:
        print('pass --apply to write')
    return 0


def cmd_check():
    mounts = census()
    # Gate on every category with a REAL apply mechanism today: attrs-bound FILL/TEXT,
    # every MIGRATABLE-BORDER-NATIVE-PURGE mount (deletion always applies), and only the
    # MIGRATABLE-BORDER mounts that actually PLAN (a surface with no width/style attrs
    # has no fix this script can apply, so gating on it would fail the build with no
    # resolution path in scope -- that mount is reported by --fix as BLOCKED instead).
    outstanding = [
        m for m in mounts
        if (m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') and m.binding_kind in ('attrs', 'getset'))
        or m.category == 'MIGRATABLE-BORDER-NATIVE-PURGE'
        or (m.category == 'MIGRATABLE-BORDER' and plan_new_border_mount(m.block, m.attr_name)[0] is not None)
    ]
    if outstanding:
        print(f'FAIL -- {len(outstanding)} migratable <DesignTokenPicker> mount(s) not yet fixed:')
        for m in outstanding:
            print(f'   {m.block}:{m.line} ({m.category}) attr={m.attr_name}')
        return 1
    print('PASS -- no migratable raw <DesignTokenPicker> mounts remain with an unapplied fix')
    return 0


# ── Self-test ────────────────────────────────────────────────────────────────────────────

FIXTURE_HEADER = """\
import { __ } from '@wordpress/i18n';
import {
\tSgsColourPanel,
\tfillRow,
\tDesignTokenPicker,
} from '../../components';

export default function Edit( { attributes, setAttributes } ) {
\tconst { fooBg, fooText, fooBorder } = attributes;
\treturn (
\t\t<>
"""

FIXTURE_FOOTER = """\
\t\t</>
\t);
}
"""

FIXTURE_PANEL_SIMPLE = """\
\t\t\t<SgsColourPanel
\t\t\t\trows={ [
\t\t\t\t\tfillRow( {
\t\t\t\t\t\tkey: 'existing',
\t\t\t\t\t\tlabel: __( 'Existing colour', 'sgs-blocks' ),
\t\t\t\t\t\tattrs: { base: 'existingColour' },
\t\t\t\t\t\tattributes,
\t\t\t\t\t\tsetAttributes,
\t\t\t\t\t} ),
\t\t\t\t] }
\t\t\t/>
"""

# POSITIVE fixture: a clean fill mount (plain block attribute, background label).
FIXTURE_POSITIVE_FILL = """\
\t\t\t<DesignTokenPicker
\t\t\t\tlabel={ __( 'Foo background colour', 'sgs-blocks' ) }
\t\t\t\tvalue={ fooBg }
\t\t\t\tonChange={ ( val ) => setAttributes( { fooBg: val ?? '' } ) }
\t\t\t/>
"""

FIXTURE_POSITIVE_TEXT = """\
\t\t\t<DesignTokenPicker
\t\t\t\tlabel={ __( 'Foo text colour', 'sgs-blocks' ) }
\t\t\t\tvalue={ fooText }
\t\t\t\tonChange={ ( val ) => setAttributes( { fooText: val ?? '' } ) }
\t\t\t/>
"""

# NEGATIVE fixture 1: currentColor/stroke icon-fill mount inside a repeater item -- the real
# trust-bar shape (item.fillColour via a local update() callback, not setAttributes).
FIXTURE_NEGATIVE_REPEATER_ICON_FILL = """\
\t\t\t{ item.fillStyle === 'filled' && (
\t\t\t\t<DesignTokenPicker
\t\t\t\t\tlabel={ __( 'Fill colour', 'sgs-blocks' ) }
\t\t\t\t\tvalue={ item.fillColour || '' }
\t\t\t\t\tonChange={ ( val ) => update( 'fillColour', val ) }
\t\t\t\t/>
\t\t\t) }
"""

# POSITIVE fixture (was NEGATIVE pre-2026-08-30 owner overrule): a border colour, plain
# block attribute -- MIGRATABLE-BORDER, target SgsBorderControl, never borderRow.
FIXTURE_POSITIVE_BORDER = """\
\t\t\t<DesignTokenPicker
\t\t\t\tlabel={ __( 'Foo border colour', 'sgs-blocks' ) }
\t\t\t\tvalue={ fooBorder }
\t\t\t\tonChange={ ( val ) => setAttributes( { fooBorder: val } ) }
\t\t\t/>
"""

# POSITIVE fixture (was NEGATIVE pre-2026-08-30 owner overrule): native WP-shaped
# style.border binding (hero/info-box shape) -- MIGRATABLE-BORDER-NATIVE-PURGE.
FIXTURE_POSITIVE_NATIVE_STYLE_BORDER = """\
\t\t\t<DesignTokenPicker
\t\t\t\tlabel={ __( 'Border colour', 'sgs-blocks' ) }
\t\t\t\tstates={ [
\t\t\t\t\t{
\t\t\t\t\t\tkey: 'normal',
\t\t\t\t\t\tlabel: __( 'Normal', 'sgs-blocks' ),
\t\t\t\t\t\tvalue: attributes.style?.border?.color,
\t\t\t\t\t\tonChange: ( val ) =>
\t\t\t\t\t\t\tsetAttributes( {
\t\t\t\t\t\t\t\tstyle: { ...attributes.style, border: { ...attributes.style?.border, color: val || undefined } },
\t\t\t\t\t\t\t} ),
\t\t\t\t\t\tlinked: true,
\t\t\t\t\t\tgradientValue: borderColourGradient,
\t\t\t\t\t\tonGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
\t\t\t\t\t},
\t\t\t\t] }
\t\t\t/>
"""

# NEGATIVE fixture 4: value lives inside an object-typed attribute (mega-panel shape).
FIXTURE_NEGATIVE_OBJECT_ATTR = """\
\t\t\t<DesignTokenPicker
\t\t\t\tlabel={ __( 'Divider colour', 'sgs-blocks' ) }
\t\t\t\tvalue={ asideSeparator?.colour }
\t\t\t\tonChange={ ( value ) => setAttributes( { asideSeparator: { ...asideSeparator, colour: value || '' } } ) }
\t\t\t\tlinked
\t\t\t/>
"""


def _write_fixture(tmp_dir, name, body):
    p = Path(tmp_dir) / name
    p.write_text(FIXTURE_HEADER + FIXTURE_PANEL_SIMPLE + body + FIXTURE_FOOTER, encoding='utf-8', newline='')
    return p


def self_test():
    import tempfile

    failures = []
    total = [0]

    def check(name, cond):
        total[0] += 1
        status = 'PASS' if cond else 'FAIL'
        print(f'  {status}  {name}')
        if not cond:
            failures.append(name)

    with tempfile.TemporaryDirectory() as tmp:
        # 1. POSITIVE: clean fill mount classifies MIGRATABLE-FILL.
        p1 = _write_fixture(tmp, 'positive_fill.js', FIXTURE_POSITIVE_FILL)
        mounts1 = scan_mounts_in_file('sgs/fixture', p1)
        check('positive fill: exactly 1 mount found', len(mounts1) == 1)
        if mounts1:
            check('positive fill: classified MIGRATABLE-FILL', mounts1[0].category == 'MIGRATABLE-FILL')
            check('positive fill: attr resolved to fooBg', mounts1[0].attr_name == 'fooBg')

        # 1b. POSITIVE: clean text mount classifies MIGRATABLE-TEXT.
        p1b = _write_fixture(tmp, 'positive_text.js', FIXTURE_POSITIVE_TEXT)
        mounts1b = scan_mounts_in_file('sgs/fixture', p1b)
        check('positive text: classified MIGRATABLE-TEXT', mounts1b and mounts1b[0].category == 'MIGRATABLE-TEXT')

        # 1c. POSITIVE end-to-end apply: the row lands in SgsColourPanel, carries `linked`
        #     via fillRow() itself (verified by inspecting fillRow.js's own source, since
        #     this script emits a fillRow(...) CALL rather than a literal object -- fillRow
        #     unconditionally sets linked:true, checked directly here as the load-bearing
        #     proof this migration cannot silently drop it).
        fillrow_src = (
            REPO / 'plugins' / 'sgs-blocks' / 'src' / 'components' / 'colour-variants' / 'fillRow.js'
        ).read_text(encoding='utf-8')
        check(
            'fillRow.js unconditionally sets linked:true (the row helper owns `linked`, not this codemod)',
            'linked: true' in fillrow_src,
        )
        textrow_src = (
            REPO / 'plugins' / 'sgs-blocks' / 'src' / 'components' / 'colour-variants' / 'textRow.js'
        ).read_text(encoding='utf-8')
        check(
            'textRow.js unconditionally sets linked:true',
            'linked: true' in textrow_src,
        )

        p1c = _write_fixture(tmp, 'positive_apply.js', FIXTURE_POSITIVE_FILL)
        before = p1c.read_text(encoding='utf-8')
        mounts1c = scan_mounts_in_file('sgs/fixture', p1c)
        changed, diff, refusal = apply_fixes_to_file(p1c, mounts1c, write=True)
        check('apply: file changed', changed and refusal is None)
        after = p1c.read_text(encoding='utf-8')
        check('apply: raw <DesignTokenPicker> mount removed', '<DesignTokenPicker' not in after)
        check('apply: fillRow( row inserted for fooBg', "fillRow( {" in after and "base: 'fooBg'" in after)
        check('apply: SgsColourPanel still has exactly one rows={ [ opening', after.count('rows={ [') == 1)
        # Re-scan the fixed file: --check must now find zero outstanding migratable mounts.
        mounts_after = scan_mounts_in_file('sgs/fixture', p1c)
        check(
            'apply: re-scan finds zero migratable mounts post-fix',
            not any(m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') for m in mounts_after),
        )

        # 2. NEGATIVE (the real trust-bar case): currentColor/SVG-fill icon colour inside a
        #    repeater item MUST be refused, never migrated.
        p2 = _write_fixture(tmp, 'negative_repeater_icon.js', FIXTURE_NEGATIVE_REPEATER_ICON_FILL)
        before2 = p2.read_text(encoding='utf-8')
        mounts2 = scan_mounts_in_file('sgs/fixture', p2)
        check('negative repeater/icon-fill: exactly 1 mount found', len(mounts2) == 1)
        if mounts2:
            check(
                'negative repeater/icon-fill: classified REFUSED-REPEATER-ITEM (not migrated)',
                mounts2[0].category == 'REFUSED-REPEATER-ITEM',
            )
            check('negative repeater/icon-fill: attr binding is item.fillColour', mounts2[0].attr_name == 'item.fillColour')
        changed2, _diff2, _r2 = apply_fixes_to_file(
            p2, [m for m in mounts2 if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')], write=True
        )
        after2 = p2.read_text(encoding='utf-8')
        check('negative repeater/icon-fill: file BYTE-IDENTICAL after --fix --apply (nothing to fix)', before2 == after2 and not changed2)

        # 2b. The SAME fixture, confirmed against the real trust-bar render.php shape --
        #     the SVG-fill-mechanism reclassification (2026-08-30) must fire when the
        #     block slug + render.php + style.css shape match, and must STAY REFUSED
        #     even though the get/set path CAN technically reach a repeater-item field --
        #     this is the trap the task explicitly warns to re-verify, not assume.
        real_trust_bar_mounts = scan_mounts_in_file(
            'sgs/trust-bar', BLOCKS_DIR / 'trust-bar' / 'edit.js'
        )
        fill_colour_mounts = [m for m in real_trust_bar_mounts if m.attr_name == 'item.fillColour']
        check('real trust-bar: item.fillColour mount found in the live file', len(fill_colour_mounts) == 1)
        if fill_colour_mounts:
            check(
                'real trust-bar: classified REFUSED-SVG-FILL-MECHANISM (stays refused, never MIGRATABLE-*)',
                fill_colour_mounts[0].category == 'REFUSED-SVG-FILL-MECHANISM',
            )
            check(
                'real trust-bar: detail carries the CONFIRMED SVG `fill:` note from render.php + style.css',
                'CONFIRMED' in (fill_colour_mounts[0].detail or '') and 'fill:' in (fill_colour_mounts[0].detail or ''),
            )

        # 2c. POST-APPLY (2026-08-30 Task 3): mega-panel's asideSeparator.colour was a
        #     get/set-reclassified mount (an object-attribute field the get/set path CAN
        #     reach, CONFIRMED via render.php to paint a border-left divider colour, not
        #     text -> MIGRATABLE-FILL) and has NOW been migrated in-place by
        #     apply_getset_fixes_to_file(). The raw <DesignTokenPicker> is gone from the
        #     live file; what remains is proof the migration actually landed: get/set
        #     row calling the ORIGINAL asideSeparator/setAttributes expressions verbatim,
        #     inside a real <SgsColourPanel> mount.
        mega_panel_src = (BLOCKS_DIR / 'mega-panel' / 'edit.js').read_text(encoding='utf-8')
        real_mega_panel_mounts = scan_mounts_in_file('sgs/mega-panel', BLOCKS_DIR / 'mega-panel' / 'edit.js', text=mega_panel_src)
        aside_mounts = [m for m in real_mega_panel_mounts if m.attr_name == 'asideSeparator.colour']
        check('real mega-panel: raw asideSeparator.colour mount is GONE (post-apply)', len(aside_mounts) == 0)
        check(
            'real mega-panel: get/set row landed in the live file (asideSeparator get + setAttributes set, inside SgsColourPanel)',
            "get: () => asideSeparator?.colour" in mega_panel_src
            and '<SgsColourPanel' in mega_panel_src
            and mega_panel_src.count('<SgsColourPanel') >= 2,  # the pre-existing top-level panel + this new in-place one
        )

        # 2d. POST-APPLY (2026-08-30 Task 3): pricing-table's plan.ribbonColour was a
        #     get/set-reclassified mount (a repeater-item field, CONFIRMED via render.php
        #     to feed a CSS custom property consumed by `background-color` -> MIGRATABLE-FILL)
        #     and has NOW been migrated in-place, reusing the existing updatePlan(...)
        #     callback verbatim as the writer (Task 3's own instruction -- never a second
        #     array-rebuild path).
        pricing_table_src = (BLOCKS_DIR / 'pricing-table' / 'edit.js').read_text(encoding='utf-8')
        real_pricing_table_mounts = scan_mounts_in_file('sgs/pricing-table', BLOCKS_DIR / 'pricing-table' / 'edit.js', text=pricing_table_src)
        ribbon_mounts = [m for m in real_pricing_table_mounts if m.attr_name == 'plan.ribbonColour']
        check('real pricing-table: raw plan.ribbonColour mount is GONE (post-apply)', len(ribbon_mounts) == 0)
        check(
            'real pricing-table: get/set row landed in the live file, writer calls updatePlan (not a hand-rolled rebuild)',
            "get: () => plan.ribbonColour" in pricing_table_src
            and "updatePlan( planIndex, 'ribbonColour', val )" in pricing_table_src,
        )

        # 3. POSITIVE (2026-08-30 owner overrule): border colour, plain block attribute --
        #    classified MIGRATABLE-BORDER, targeting SgsBorderControl. borderRow() STILL
        #    never emitted -- this script has no --fix --apply support for this category
        #    yet (Task 2 builds it), so the file must stay untouched by --fix --apply too.
        p3 = _write_fixture(tmp, 'positive_border.js', FIXTURE_POSITIVE_BORDER)
        mounts3 = scan_mounts_in_file('sgs/fixture', p3)
        check('positive border: classified MIGRATABLE-BORDER', mounts3 and mounts3[0].category == 'MIGRATABLE-BORDER')
        check(
            'positive border: detail names SgsBorderControl as the target',
            mounts3 and 'SgsBorderControl' in (mounts3[0].detail or ''),
        )
        check(
            'positive border: attr resolved to fooBorder (not the word "borderRow")',
            mounts3 and mounts3[0].attr_name == 'fooBorder',
        )
        before3 = p3.read_text(encoding='utf-8')
        changed3, _d3, _r3 = apply_fixes_to_file(
            p3, [m for m in mounts3 if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')], write=True
        )
        after3 = p3.read_text(encoding='utf-8')
        check(
            'positive border: file untouched by --fix --apply (no apply support yet), borderRow never emitted',
            before3 == after3 and not changed3 and 'borderRow(' not in after3,
        )

        # 4. POSITIVE (2026-08-30 owner overrule): native WP-SHAPED style.border binding --
        #    classified MIGRATABLE-BORDER-NATIVE-PURGE (the real hero/info-box shape).
        #    Same no-apply-yet guarantee as case 3.
        p4 = _write_fixture(tmp, 'positive_native_style_border.js', FIXTURE_POSITIVE_NATIVE_STYLE_BORDER)
        mounts4 = scan_mounts_in_file('sgs/fixture', p4)
        check(
            'positive native-style border: classified MIGRATABLE-BORDER-NATIVE-PURGE',
            mounts4 and mounts4[0].category == 'MIGRATABLE-BORDER-NATIVE-PURGE',
        )
        check(
            'positive native-style border: detail explains the purge (duplicate/dead writer), not a refusal',
            mounts4 and 'SgsBorderControl' in (mounts4[0].detail or ''),
        )
        before4 = p4.read_text(encoding='utf-8')
        changed4, _d4, _r4 = apply_fixes_to_file(
            p4, [m for m in mounts4 if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')], write=True
        )
        after4 = p4.read_text(encoding='utf-8')
        check('positive native-style border: file untouched by --fix --apply (no apply support yet)', before4 == after4 and not changed4)

        # 5. NEGATIVE: value inside an object-typed attribute (mega-panel shape) -- refused.
        p5 = _write_fixture(tmp, 'negative_object_attr.js', FIXTURE_NEGATIVE_OBJECT_ATTR)
        mounts5 = scan_mounts_in_file('sgs/fixture', p5)
        check(
            'negative object-attr: classified REFUSED-NOT-BLOCK-ATTRIBUTE',
            mounts5 and mounts5[0].category == 'REFUSED-NOT-BLOCK-ATTRIBUTE',
        )
        check('negative object-attr: binding names asideSeparator.colour', mounts5 and mounts5[0].attr_name == 'asideSeparator.colour')

        # 6. NEGATIVE: a block with ZERO raw mounts produces zero changes; --check-equivalent
        #    finds nothing to fix.
        p6 = Path(tmp) / 'clean_block.js'
        p6.write_text(FIXTURE_HEADER + FIXTURE_PANEL_SIMPLE + FIXTURE_FOOTER, encoding='utf-8', newline='')
        mounts6 = scan_mounts_in_file('sgs/fixture', p6)
        check('clean block: zero raw mounts found', len(mounts6) == 0)

        # 7. --check PROVEN able to fail: mutate a clean fixture by adding a migratable mount,
        #    confirm the outstanding-count logic (the same one cmd_check uses) is non-zero;
        #    then remove it again and confirm it returns to zero. Proves the gate can both
        #    fail and pass, not just always pass.
        p7 = _write_fixture(tmp, 'check_can_fail.js', FIXTURE_POSITIVE_FILL)
        mounts7 = scan_mounts_in_file('sgs/fixture', p7)
        outstanding7 = [m for m in mounts7 if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')]
        check('--check can FAIL: outstanding migratable mount detected pre-fix', len(outstanding7) == 1)
        apply_fixes_to_file(p7, mounts7, write=True)
        mounts7b = scan_mounts_in_file('sgs/fixture', p7)
        outstanding7b = [m for m in mounts7b if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')]
        check('--check returns to PASS after the same fixture is fixed', len(outstanding7b) == 0)

        # 8. Live full-tree survey sanity -- POST-APPLY state (2026-08-30 Task 3: the
        #    get/set apply mechanic has now ALSO run for real on mega-panel + pricing-table,
        #    on top of Task 2's hero/info-box/multi-button attrs-bound + purge + new-mount
        #    passes). multi-button's childBtnBorderColour is no longer a raw picker at all
        #    -- it was hand-mounted onto a NEW SgsBorderControl (childBtnBorderWidth/
        #    childBtnBorderStyle added to block.json, same session, different file scope
        #    than this script) -- so census() finds no DesignTokenPicker there any more.
        #    What's LEFT raw, deliberately: only trust-bar's item.fillColour
        #    (REFUSED-SVG-FILL-MECHANISM, the trap that must never reclassify). If the live
        #    tree's shapes ever drift, this is the assertion that catches it rather than a
        #    silently-stale self-test. (If this test is ever run against a PRE-apply tree,
        #    e.g. cherry-picking just the codemod script change, these counts will
        #    legitimately differ -- that is not this test's job to detect.)
        live_mounts = census()
        named_blocks = {'sgs/hero', 'sgs/info-box', 'sgs/mega-panel', 'sgs/multi-button',
                         'sgs/pricing-table', 'sgs/trust-bar'}
        live_named = [m for m in live_mounts if m.block in named_blocks]
        check('live tree (post-apply): exactly 1 raw mount remains across the 6 named blocks', len(live_named) == 1)
        live_fill_text_attrs = [
            m for m in live_named
            if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') and m.binding_kind == 'attrs'
        ]
        live_fill_text_getset = [
            m for m in live_named
            if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT') and m.binding_kind == 'getset'
        ]
        live_border_purge = [m for m in live_named if m.category == 'MIGRATABLE-BORDER-NATIVE-PURGE']
        live_border_new_mount = [m for m in live_named if m.category == 'MIGRATABLE-BORDER']
        live_still_refused = [
            m for m in live_named
            if m.category not in (
                'MIGRATABLE-FILL', 'MIGRATABLE-TEXT', 'MIGRATABLE-BORDER',
                'MIGRATABLE-BORDER-NATIVE-PURGE', 'AMBIGUOUS',
            )
        ]
        check('live tree (post-apply): 0 attrs.base-bound MIGRATABLE-FILL/-TEXT remain raw (multi-button applied)', len(live_fill_text_attrs) == 0)
        check(
            'live tree (post-apply): 0 getset-bound MIGRATABLE-FILL/-TEXT mounts remain raw '
            '(Task 3: mega-panel asideSeparator.colour + pricing-table plan.ribbonColour both applied in-place)',
            len(live_fill_text_getset) == 0,
        )
        check(
            'live tree (post-apply): 0 MIGRATABLE-BORDER-NATIVE-PURGE mounts remain raw (hero + info-box purged)',
            len(live_border_purge) == 0,
        )
        check(
            'live tree (post-apply): 0 MIGRATABLE-BORDER mounts remain raw '
            '(hero splitMedia applied by the codemod; multi-button childBtnBorderColour hand-mounted '
            'onto a new SgsBorderControl once childBtnBorderWidth/Style existed -- different file scope, same session)',
            len(live_border_new_mount) == 0,
        )
        check(
            'live tree (post-apply): exactly 1 genuinely-still-refused mount (trust-bar item.fillColour, the '
            'SVG-fill-mechanism trap) -- proves the reclassification did NOT over-broaden into it '
            'despite sharing pricing-table\'s exact JS shape',
            len(live_still_refused) == 1,
        )
        for m in live_still_refused:
            check(
                f'live tree: {m.block}:{m.line} still classified {m.category} (never a MIGRATABLE-* category)',
                m.category == 'REFUSED-SVG-FILL-MECHANISM',
            )

        # 9. MIGRATABLE-BORDER-NATIVE-PURGE apply mechanic (Task 2a) -- fixture mirrors the
        #    REAL hero shape: a dedicated PanelBody hosting ONLY the native-style picker, so
        #    deletion must take the whole PanelBody with it (an empty titled panel left
        #    behind is a UI regression, not a clean fix).
        p9 = _write_fixture(tmp, 'purge_dedicated_panel.js', '')
        p9.write_text(
            FIXTURE_HEADER
            + FIXTURE_PANEL_SIMPLE
            + "\t\t\t<PanelBody title={ __( 'Border gradient', 'sgs-blocks' ) } initialOpen={ false }>\n"
            + "\t\t\t\t{ /* stale explanation comment */ }\n"
            + FIXTURE_POSITIVE_NATIVE_STYLE_BORDER.replace('\t\t\t<', '\t\t\t\t<')
            + '\t\t\t</PanelBody>\n'
            + FIXTURE_FOOTER,
            encoding='utf-8',
            newline='',
        )
        mounts9 = scan_mounts_in_file('sgs/fixture', p9)
        purge9 = [m for m in mounts9 if m.category == 'MIGRATABLE-BORDER-NATIVE-PURGE']
        check('purge fixture: exactly 1 MIGRATABLE-BORDER-NATIVE-PURGE mount found', len(purge9) == 1)
        changed9, _diff9, notes9 = apply_border_purge_to_file(p9, purge9, write=True)
        after9 = p9.read_text(encoding='utf-8')
        check('purge (dedicated panel): file changed', changed9)
        check('purge (dedicated panel): raw <DesignTokenPicker> mount removed', '<DesignTokenPicker' not in after9)
        check('purge (dedicated panel): its stale comment removed too', 'stale explanation comment' not in after9)
        check(
            'purge (dedicated panel): the now-empty <PanelBody title="Border gradient"> removed too',
            'Border gradient' not in after9,
        )
        check('purge (dedicated panel): a NOTE was reported for the panel removal', len(notes9) == 1)
        check('purge (dedicated panel): the OTHER PanelBody (SgsColourPanel host) survives', '<SgsColourPanel' in after9)

        # 9b. Same mechanic on a SHARED panel (mirrors hero's real shape: the picker sits
        #     alongside a genuinely unrelated control, <WidthPanel>) -- deletion must NOT
        #     take the whole panel, must NOT touch the sibling control. This is the exact
        #     regression this script nearly shipped: an earlier version of
        #     strip_preceding_comment matched from the FIRST `{ /* ... */ }` comment
        #     ANYWHERE EARLIER IN THE FILE down to the mount, deleting an unrelated
        #     <WidthPanel> mount on a real --apply'd copy of hero/edit.js. Caught by
        #     inspecting that copy directly, not by any assertion that existed before this
        #     one -- this fixture is the regression control so it can never recur silently.
        p9b = _write_fixture(tmp, 'purge_shared_panel.js', '')
        p9b.write_text(
            FIXTURE_HEADER
            + FIXTURE_PANEL_SIMPLE
            + "\t\t\t<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) } initialOpen={ false }>\n"
            + "\t\t\t\t<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />\n"
            + "\t\t\t\t{ /* D701 explanation comment for the border picker only */ }\n"
            + FIXTURE_POSITIVE_NATIVE_STYLE_BORDER.replace('\t\t\t<', '\t\t\t\t<')
            + '\t\t\t</PanelBody>\n'
            + FIXTURE_FOOTER,
            encoding='utf-8',
            newline='',
        )
        mounts9b = scan_mounts_in_file('sgs/fixture', p9b)
        purge9b = [m for m in mounts9b if m.category == 'MIGRATABLE-BORDER-NATIVE-PURGE']
        changed9b, _diff9b, notes9b = apply_border_purge_to_file(p9b, purge9b, write=True)
        after9b = p9b.read_text(encoding='utf-8')
        check('purge (shared panel): file changed', changed9b)
        check('purge (shared panel): raw <DesignTokenPicker> mount removed', '<DesignTokenPicker' not in after9b)
        check(
            'purge (shared panel): its OWN comment removed, unrelated WidthPanel survives',
            'D701 explanation' not in after9b and '<WidthPanel' in after9b,
        )
        check(
            'purge (shared panel): the enclosing <PanelBody title="Section (outer)"> survives (not empty)',
            'Section (outer)' in after9b,
        )
        check('purge (shared panel): no panel-removal NOTE (panel was not empty)', len(notes9b) == 0)

        # 10. MIGRATABLE-BORDER apply mechanic (Task 2b) -- a fixture with the full
        #     width/style/radius/colour+gradient attribute family (mirrors hero's
        #     splitMediaBorderColour) must produce one consolidated <SgsBorderControl>,
        #     dropping colourLinked/onColourGradientChange NEVER (D881).
        # plan_new_border_mount is exercised directly against hero's REAL block.json (a
        # fixture attribute like 'fooBorder' has no block.json to plan against; this is
        # what --fix --apply actually consults on the live tree).
        plan10, refusal10 = plan_new_border_mount('sgs/hero', 'splitMediaBorderColour')
        check('plan (hero splitMedia): plan resolves (all sibling attrs exist)', plan10 is not None and refusal10 is None)
        if plan10:
            check('plan (hero splitMedia): width/style attrs resolved', plan10['width_attr'] == 'splitMediaBorderWidth' and plan10['style_attr'] == 'splitMediaBorderStyle')
            check('plan (hero splitMedia): gradient attr resolved', plan10['gradient_attr'] == 'splitMediaBorderColourGradient')
            check('plan (hero splitMedia): radius attr + both tiers resolved', plan10['radius_attr'] == 'splitMediaBorderRadius' and plan10['radius_tablet_attr'] and plan10['radius_mobile_attr'])

        # 10b. FORMERLY BLOCKED, NOW RESOLVES (2026-08-30, item 2 of this same session's
        #      3-item pass): multi-button's real gap -- no {prefix}BorderWidth/BorderStyle
        #      declared -- is CLOSED. block.json now declares childBtnBorderWidth (object)
        #      + childBtnBorderStyle (string), added by hand in edit.js/block.json (a
        #      different file scope than this script -- render.php wiring is a separate,
        #      still-open follow-up, see check-dead-controls.js). plan_new_border_mount()
        #      only reads block.json, so it now resolves exactly like hero's 10a case.
        plan10b, refusal10b = plan_new_border_mount('sgs/multi-button', 'childBtnBorderColour')
        check('plan (multi-button childBtn): now resolves (childBtnBorderWidth/Style added)', plan10b is not None and refusal10b is None)
        if plan10b:
            check(
                'plan (multi-button childBtn): width/style attrs resolved',
                plan10b['width_attr'] == 'childBtnBorderWidth' and plan10b['style_attr'] == 'childBtnBorderStyle',
            )

        # 10c. End-to-end apply on a SYNTHETIC fixture reproducing hero's pre-migration
        #      splitMedia shape (bespoke SelectControl/ResponsiveBoxControl/
        #      ResponsiveBorderRadiusControl/DesignTokenPicker quartet), planned against
        #      hero's REAL block.json (so plan_new_border_mount resolves genuine attrs).
        #      Self-contained rather than reading the live hero/edit.js file, so this test
        #      stays valid whether or not this session has already applied the real fix to
        #      the live tree (idempotent regression coverage, not a one-shot check). The new
        #      SgsBorderControl mount must land, colourLinked/onColourGradientChange must
        #      survive (D881), the superseded bespoke controls it replaces must be gone --
        #      but WidthPanel (a genuinely unrelated control in a DIFFERENT PanelBody, never
        #      touched by this mechanic) must survive untouched.
        hero_scratch = Path(tmp) / 'hero_edit_scratch.js'
        hero_scratch.write_text(
            FIXTURE_HEADER
            + FIXTURE_PANEL_SIMPLE
            + "\t\t\t<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) } initialOpen={ false }>\n"
            + "\t\t\t\t<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />\n"
            + '\t\t\t</PanelBody>\n'
            + "\t\t\t<p style={ { fontWeight: 600 } }>{ __( 'Border radius', 'sgs-blocks' ) }</p>\n"
            + "\t\t\t<ResponsiveBorderRadiusControl\n"
            + "\t\t\t\tlabel={ __( 'Image border radius', 'sgs-blocks' ) }\n"
            + "\t\t\t\tvalues={ { base: splitMediaBorderRadius ?? {}, tablet: splitMediaBorderRadiusTablet ?? {}, mobile: splitMediaBorderRadiusMobile ?? {} } }\n"
            + "\t\t\t\tonChange={ ( tier, next ) => setAttributes( { [ tier ]: next } ) }\n"
            + "\t\t\t/>\n"
            + "\t\t\t<p style={ { fontWeight: 600 } }>{ __( 'Border', 'sgs-blocks' ) }</p>\n"
            + "\t\t\t<SelectControl label={ __( 'Border style', 'sgs-blocks' ) } value={ splitMediaBorderStyle } onChange={ ( val ) => setAttributes( { splitMediaBorderStyle: val } ) } />\n"
            + "\t\t\t<ResponsiveBoxControl\n"
            + "\t\t\t\tlabel={ __( 'Border width', 'sgs-blocks' ) }\n"
            + "\t\t\t\tvalues={ { base: splitMediaBorderWidth ?? {} } }\n"
            + "\t\t\t\tshowResponsive={ false }\n"
            + "\t\t\t\tonChange={ ( tier, next ) => setAttributes( { splitMediaBorderWidth: next } ) }\n"
            + "\t\t\t/>\n"
            + "\t\t\t<DesignTokenPicker\n"
            + "\t\t\t\tlabel={ __( 'Border colour', 'sgs-blocks' ) }\n"
            + "\t\t\t\tstates={ [ { key: 'normal', label: __( 'Normal', 'sgs-blocks' ), value: splitMediaBorderColour, onChange: ( val ) => setAttributes( { splitMediaBorderColour: val } ), gradientValue: splitMediaBorderColourGradient, onGradientChange: ( val ) => setAttributes( { splitMediaBorderColourGradient: val ?? '' } ) } ] }\n"
            + "\t\t\t/>\n"
            + FIXTURE_FOOTER,
            encoding='utf-8', newline='',
        )
        hero_scratch_mounts = [
            m for m in scan_mounts_in_file('sgs/hero', hero_scratch)
            if m.category == 'MIGRATABLE-BORDER' and m.attr_name == 'splitMediaBorderColour'
        ]
        check('hero scratch: splitMediaBorderColour MIGRATABLE-BORDER mount found', len(hero_scratch_mounts) == 1)
        changed10c, _diff10c, refusals10c = apply_new_border_mount_to_file(hero_scratch, hero_scratch_mounts, write=True)
        after10c = hero_scratch.read_text(encoding='utf-8')
        check('hero scratch: applied with zero refusals', changed10c and not refusals10c)
        check('hero scratch: one new <SgsBorderControl> mount for splitMediaBorderWidth landed', 'widthValues={ attributes.splitMediaBorderWidth' in after10c)
        check('hero scratch: colourLinked={ true } present (D881)', 'colourLinked={ true }' in after10c)
        check('hero scratch: gradient pair present', 'onColourGradientChange' in after10c and 'splitMediaBorderColourGradient' in after10c)
        check(
            'hero scratch: superseded bespoke controls for THIS surface are gone '
            '(SelectControl/ResponsiveBoxControl/ResponsiveBorderRadiusControl for splitMedia)',
            'value={ splitMediaBorderStyle }' not in after10c
            and 'values={ { base: splitMediaBorderWidth' not in after10c
            and "base: splitMediaBorderRadius ?? {}" not in after10c.split('SgsBorderControl')[0],
        )
        check(
            'hero scratch: unrelated <WidthPanel> (a different surface, different PanelBody) untouched',
            '<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />' in after10c,
        )

    ok = not failures
    print(f'\nSELF-TEST: {total[0]} assertion(s), {len(failures)} failure(s)')
    for f in failures:
        print(f'  FAIL: {f}')
    print(f'SELF-TEST {"PASS" if ok else "FAIL"}')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--survey', action='store_true', help='census; classify every raw mount; writes nothing')
    ap.add_argument('--fix', action='store_true', help='dry-run diff unless --apply is also given')
    ap.add_argument('--apply', action='store_true', help='actually write (only with --fix)')
    ap.add_argument('--check', action='store_true', help='CI gate: exit 1 if any MIGRATABLE mount remains raw')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.check:
        return cmd_check()
    if args.fix:
        return cmd_fix(args.apply)
    if args.survey:
        return cmd_survey()
    ap.error('one of --survey / --fix / --check / --self-test is required')


if __name__ == '__main__':
    sys.exit(main())
