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


def extract_label(tag_text):
    m = re.search(r"label\s*=\s*\{\s*__\(\s*(['\"])(.*?)\1", tag_text, re.S)
    return m.group(2) if m else ''


def classify_binding(value_expr, onchange_expr, label):
    """Returns (category, attr_name_or_binding, detail)."""
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


def enrich_trust_bar_icon_fill(block, attr_name, detail):
    """sgs/trust-bar's item.fillColour is additionally the icon-fill/SVG-paint mechanism --
    confirm against render.php rather than asserting it from the JS alone, and append the
    extra detail only when confirmed."""
    if block != 'sgs/trust-bar' or not attr_name or 'fillColour' not in attr_name:
        return detail
    render_php = BLOCKS_DIR / 'trust-bar' / 'render.php'
    if not render_php.exists():
        return detail
    src = render_php.read_text(encoding='utf-8', errors='ignore')
    if "item['fillColour']" in src and 'sgs_colour_value' in src:
        return (
            detail
            + ' -- CONFIRMED via render.php: resolved through sgs_colour_value() and painted '
              'as an SVG `fill` attribute, a THIRD colour mechanism (neither CSS fill/background '
              'nor text colour); would be wrong to migrate onto fillRow even if it were a plain attribute'
        )
    return detail


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
            cat, attr, detail = classify_binding(value_expr, onchange_expr, mount.label)
        else:
            mount.shape = 'single'
            value_expr = extract_brace_prop(tag_text, 'value')
            onchange_expr = extract_brace_prop(tag_text, 'onChange')
            cat, attr, detail = classify_binding(value_expr, onchange_expr, mount.label)

        detail = enrich_trust_bar_icon_fill(block, attr, detail) if detail else detail
        mount.category = cat
        mount.attr_name = attr
        mount.detail = detail
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
        'REFUSED-NOT-BLOCK-ATTRIBUTE', 'REFUSED-REPEATER-ITEM',
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
    migratable = [m for m in mounts if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')]
    by_file = {}
    for m in migratable:
        by_file.setdefault(m.file, []).append(m)

    changed_files = 0
    total_rows = 0
    for path, ms in sorted(by_file.items()):
        changed, diff, refusal = apply_fixes_to_file(path, ms, apply_)
        if refusal:
            print(f'  REFUSED (insert-site) {ms[0].block} -- {refusal}')
            continue
        if changed:
            changed_files += 1
            total_rows += len(ms)
            if not apply_:
                sys.stdout.write(''.join(diff))

    refused = [m for m in mounts if m.category not in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')]
    for m in refused:
        verb = 'NOT-YET-APPLIED' if m.category.startswith('MIGRATABLE-') else 'REFUSED'
        print(f'  {verb} {m.category} {m.block}:{m.line} -- {m.detail}')

    print(
        f"\n{'APPLIED' if apply_ else 'DRY RUN'} -- {changed_files} file(s), {total_rows} "
        f"row(s) {'migrated' if apply_ else 'would be migrated'}, {len(refused)} refusal(s)"
    )
    if not apply_:
        print('pass --apply to write')
    return 0


def cmd_check():
    mounts = census()
    outstanding = [m for m in mounts if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')]
    if outstanding:
        print(f'FAIL -- {len(outstanding)} migratable <DesignTokenPicker> mount(s) not yet in SgsColourPanel:')
        for m in outstanding:
            print(f'   {m.block}:{m.line} ({m.category}) attr={m.attr_name}')
        return 1
    print('PASS -- no migratable raw <DesignTokenPicker> mounts remain outside SgsColourPanel')
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
        #     the icon-fill enrichment must fire when the block slug + render.php shape match.
        real_trust_bar_mounts = scan_mounts_in_file(
            'sgs/trust-bar', BLOCKS_DIR / 'trust-bar' / 'edit.js'
        )
        fill_colour_mounts = [m for m in real_trust_bar_mounts if m.attr_name == 'item.fillColour']
        check('real trust-bar: item.fillColour mount found in the live file', len(fill_colour_mounts) == 1)
        if fill_colour_mounts:
            check(
                'real trust-bar: classified REFUSED-REPEATER-ITEM',
                fill_colour_mounts[0].category == 'REFUSED-REPEATER-ITEM',
            )
            check(
                'real trust-bar: detail carries the CONFIRMED icon-fill/SVG note from render.php',
                'CONFIRMED' in (fill_colour_mounts[0].detail or ''),
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

        # 8. Live full-tree survey sanity: must find exactly the 9 known mounts across the
        #    6 named blocks, with the RECLASSIFIED split ruled 2026-08-30 (owner overrule of
        #    the border refusal categories, Task 1b): 2 MIGRATABLE-FILL/-TEXT (multi-button,
        #    unchanged), 2 MIGRATABLE-BORDER-NATIVE-PURGE (hero's + info-box's WP-native-
        #    shaped style.border.color pickers), 2 MIGRATABLE-BORDER (hero's
        #    splitMediaBorderColour + multi-button's childBtnBorderColour, each needing a NEW
        #    SgsBorderControl mount for their own surface per the owner's ruling), and 3
        #    genuinely-still-refused (mega-panel's object-attr, pricing-table's + trust-bar's
        #    repeater-item mounts). This is the load-bearing regression control -- if the live
        #    tree's shapes ever drift, this is the assertion that catches it rather than a
        #    silently-stale self-test.
        live_mounts = census()
        named_blocks = {'sgs/hero', 'sgs/info-box', 'sgs/mega-panel', 'sgs/multi-button',
                         'sgs/pricing-table', 'sgs/trust-bar'}
        live_named = [m for m in live_mounts if m.block in named_blocks]
        check('live tree: exactly 9 raw mounts across the 6 named blocks', len(live_named) == 9)
        live_fill_text = [m for m in live_named if m.category in ('MIGRATABLE-FILL', 'MIGRATABLE-TEXT')]
        live_border_purge = [m for m in live_named if m.category == 'MIGRATABLE-BORDER-NATIVE-PURGE']
        live_border_new_mount = [m for m in live_named if m.category == 'MIGRATABLE-BORDER']
        live_still_refused = [
            m for m in live_named
            if m.category not in (
                'MIGRATABLE-FILL', 'MIGRATABLE-TEXT', 'MIGRATABLE-BORDER',
                'MIGRATABLE-BORDER-NATIVE-PURGE', 'AMBIGUOUS',
            )
        ]
        check('live tree: exactly 2 MIGRATABLE-FILL/-TEXT mounts (multi-button fill+text)', len(live_fill_text) == 2)
        check(
            'live tree: exactly 2 MIGRATABLE-BORDER-NATIVE-PURGE mounts (hero + info-box native-style border)',
            len(live_border_purge) == 2,
        )
        check(
            'live tree: exactly 2 MIGRATABLE-BORDER mounts, each needing a NEW SgsBorderControl mount '
            '(hero splitMediaBorderColour + multi-button childBtnBorderColour)',
            len(live_border_new_mount) == 2,
        )
        check(
            'live tree: exactly 3 genuinely-still-refused mounts (mega-panel object-attr, '
            'pricing-table + trust-bar repeater-items), 0 ambiguous -- proves the reclassification '
            'did NOT over-broaden into these',
            len(live_still_refused) == 3,
        )
        for m in live_still_refused:
            check(
                f'live tree: {m.block}:{m.line} still classified {m.category} (never a MIGRATABLE-* category)',
                m.category in ('REFUSED-NOT-BLOCK-ATTRIBUTE', 'REFUSED-REPEATER-ITEM'),
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
