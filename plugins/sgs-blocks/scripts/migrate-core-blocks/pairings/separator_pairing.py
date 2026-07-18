#!/usr/bin/env python3
"""core/separator -> sgs/separator transformer (Track C pairing module).

Ground truth (separator/block.json read 2026-07-18):
  lineStyle  string  enum solid/dashed/dotted/double/none, default 'solid'
  width      number  default 100        widthUnit  enum px/%, default '%'
  thickness  number  default 1          thicknessUnit string, default 'px'
  colour     string  default ''
  alignment  string  enum left/center/right, default 'center'
  gradientEnabled      boolean default false
  gradientColourStart  string  default ''
  gradientColourEnd    string  default ''
  gradientAngle        number  default 90
  supports   className:true, html:false, color:false, spacing (margin+padding,
             __experimentalSkipSerialization) -> `style.spacing` carries 1:1
             (declared as the shared 'style' key by the driver's
             load_target_schema); colour is a TYPED attr, not a native
             support, so style.color / backgroundColor / gradient must map to
             the typed colour/gradient attrs, never pass through as `style`.

CORE/SEPARATOR is a void static block (`<hr {...} />`, no inner content, no
children — the whole instance is its own attrs). Ground truth for its own
attrs/supports (WP core `@wordpress/block-library/src/separator/block.json`,
apiVersion 3, styles default/wide/dots):
  opacity  string default 'alpha-channel' (enum alpha-channel/css)
  supports: anchor, align, html:false,
    color {background:true, gradients:true, text:false},
    spacing {margin:[top,bottom]},
    __experimentalBorder {color:true, width:true, default width '1px'}
  style variations via className: is-style-default / is-style-wide / is-style-dots.

THE STYLE-VARIATION TRAP: core expresses "dotted line" and "wide thick line"
as `className: is-style-dots` / `is-style-wide`, NOT as a typed attribute —
sgs/separator has no equivalent style-slug concept, so the className must be
PARSED and translated into the typed lineStyle/width attrs, then the
recognised token stripped from the passthrough className (mirrors the D338
class of bug: leaving `is-style-dots` in a passthrough className would do
nothing on sgs/separator, silently losing the dotted look).

THE BORDER-AS-LINE TRAP: core renders the `<hr>` with a genuine CSS border
(__experimentalBorder), which is visually THE divider line itself for this
block — border-color IS the line colour, border-width IS the line thickness.
Mapped onto sgs/separator's typed `colour` / `thickness` attrs accordingly.
Only literal `px` widths are safely convertible; anything else is a gap.
"""

import re
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

# style groups sgs/separator declares as a skip-serialised native support.
PASSTHROUGH_STYLE_GROUPS = ('spacing',)

# core/separator's 3 built-in style variations, expressed via className.
STYLE_CLASS_RE = re.compile(r'\bis-style-(default|wide|dots)\b')

# A simple 2-stop linear-gradient, exactly as WP core serialises a CUSTOM
# gradient into style.color.gradient (named/theme-preset gradients arrive as
# a bare slug string instead and are NOT parseable into start/end/angle —
# handled as a GapError below, never guessed at).
GRADIENT_RE = re.compile(
    r'^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+?)\s+0%\s*,\s*(.+?)\s+100%\s*\)$'
)

# A literal px length, as WP core serialises __experimentalBorder.width.
PX_WIDTH_RE = re.compile(r'^(-?\d+(?:\.\d+)?)px$')


def _split_style_classes(class_name):
    """Return (recognised_style_or_None, remaining_className_or_None)."""
    if not class_name:
        return None, None
    m = STYLE_CLASS_RE.search(class_name)
    if not m:
        return None, class_name
    remaining = STYLE_CLASS_RE.sub('', class_name)
    remaining = re.sub(r'\s+', ' ', remaining).strip() or None
    return m.group(1), remaining


def transform(node, text):
    attrs_in = node.attrs or {}
    out = {}
    accounting = {}
    notes = []

    # THE STYLE-VARIATION TRAP: extract is-style-* before the general
    # className passthrough handles what's left over.
    style_variant, remaining_class = _split_style_classes(attrs_in.get('className'))
    if style_variant == 'dots':
        out['lineStyle'] = 'dotted'
        notes.append('is-style-dots -> lineStyle:"dotted"')
    elif style_variant == 'wide':
        out['width'] = 100
        out['widthUnit'] = '%'
        notes.append('is-style-wide -> width:100% (core\'s wide-line variant has no independent '
                     'thickness token beyond the default 1px border-width, which carries through '
                     'the border.width mapping below if the source set one)')
    # 'default' needs no explicit emit — sgs/separator's own default IS solid/100%/1px.

    for key, value in attrs_in.items():
        if key == 'className':
            if style_variant and remaining_class:
                out['className'] = remaining_class
                accounting[key] = (
                    'mapped',
                    f'is-style-{style_variant} extracted to typed attrs; remainder passthrough as className')
            elif style_variant:
                accounting[key] = ('mapped', f'is-style-{style_variant} extracted to typed attrs; no remainder')
            elif remaining_class:
                out['className'] = remaining_class
                accounting[key] = ('mapped', 'className passthrough')
            else:
                accounting[key] = ('dropped', 'className present but empty after normalisation')
        elif key == 'anchor':
            out[key] = value
            accounting[key] = ('mapped', 'anchor passthrough')
        elif key == 'metadata':
            out[key] = value
            accounting[key] = ('mapped', 'metadata passthrough (no bindings — sgs/separator has no bindable attr)')
        elif key == 'align':
            if value not in ('wide', 'full'):
                raise GapError(f'align {value!r} has no sgs/separator mapping (only wide/full are '
                               f'meaningful on an hr — anything else is a WP core impossibility for '
                               f'this block, refusing to guess)')
            out['width'] = 100
            out['widthUnit'] = '%'
            accounting[key] = ('mapped', f'align:{value} -> width:100% (full-bleed divider)')
        elif key == 'opacity':
            # sgs/separator now has a typed `opacity` (0-100 %, default 100).
            # core 'alpha-channel' (with the has-alpha-channel-opacity class)
            # is core's FULL-opacity mode -> sgs opacity:100 (no visual change).
            # core 'css' WITHOUT that class is core's legacy has-css-opacity
            # default of 0.4 -> sgs opacity:40.
            has_alpha_class = bool(remaining_class and 'has-alpha-channel-opacity' in remaining_class)
            if value in (None, 'alpha-channel') or has_alpha_class:
                out['opacity'] = 100
                accounting[key] = ('mapped', "opacity 'alpha-channel' (or has-alpha-channel-opacity "
                                             "class) = core's full-opacity mode -> opacity:100")
            elif value == 'css':
                out['opacity'] = 40
                accounting[key] = ('mapped', "opacity 'css' without has-alpha-channel-opacity = core's "
                                             "legacy has-css-opacity default (0.4) -> opacity:40")
            else:
                raise GapError(f'opacity {value!r} has no sgs/separator mapping — extend before swapping')
        elif key == 'backgroundColor':
            out['colour'] = f'var(--wp--preset--color--{value})'
            accounting[key] = ('mapped', 'colour (named preset -> CSS custom property)')
        elif key == 'gradient':
            raise GapError(f'gradient {value!r} is a named/preset gradient slug — sgs/separator needs '
                           f'discrete gradientColourStart/End/Angle and a preset slug cannot be '
                           f'decomposed without a theme.json gradient-preset lookup this module does '
                           f'not have; refusing to guess the stops')
        elif key == 'style':
            detail = []
            style_out = {}
            for group, group_value in (value or {}).items():
                if group in PASSTHROUGH_STYLE_GROUPS:
                    style_out[group] = group_value
                    detail.append(f'style.{group} 1:1 (skip-serialised native support)')
                elif group == 'color':
                    for ck, cv in (group_value or {}).items():
                        if ck == 'background':
                            out['colour'] = cv
                            detail.append('style.color.background -> colour')
                        elif ck == 'gradient':
                            m = GRADIENT_RE.match((cv or '').strip())
                            if not m:
                                raise GapError(f'style.color.gradient {cv!r} is not a simple 2-stop '
                                               f'linear-gradient(ANGLEdeg, C1 0%, C2 100%) this module '
                                               f'can decompose into gradientColourStart/End/Angle')
                            out['gradientEnabled'] = True
                            out['gradientAngle'] = float(m.group(1)) if '.' in m.group(1) else int(m.group(1))
                            out['gradientColourStart'] = m.group(2)
                            out['gradientColourEnd'] = m.group(3)
                            detail.append('style.color.gradient -> gradientEnabled + start/end/angle')
                        else:
                            raise GapError(f'style.color.{ck} has no sgs/separator mapping '
                                          f'(color.text is not a support core/separator declares)')
                elif group == 'border':
                    for bk, bv in (group_value or {}).items():
                        if bk == 'color':
                            if 'colour' in out and out['colour'] != bv:
                                raise GapError('style.border.color conflicts with an already-mapped '
                                              'colour source (background/gradient) — ambiguous which '
                                              'one is the intended line colour')
                            out['colour'] = bv
                            detail.append('style.border.color -> colour (the border IS the divider line)')
                        elif bk == 'width':
                            m = PX_WIDTH_RE.match(str(bv))
                            if not m:
                                raise GapError(f'style.border.width {bv!r} is not a literal px length — '
                                              f'sgs/separator thickness is a plain number+unit and this '
                                              f'module only converts px widths safely')
                            out['thickness'] = float(m.group(1)) if '.' in m.group(1) else int(m.group(1))
                            out['thicknessUnit'] = 'px'
                            detail.append('style.border.width -> thickness/thicknessUnit (px)')
                        elif bk in ('style', 'radius', 'top', 'right', 'bottom', 'left'):
                            raise GapError(f'style.border.{bk} has no sgs/separator mapping — a divider '
                                          f'is a single flat line, no per-side/radius equivalent')
                        else:
                            raise GapError(f'style.border.{bk} has no sgs/separator mapping')
                else:
                    raise GapError(f'style.{group} has no sgs/separator mapping — extend before swapping')
            if style_out:
                out['style'] = style_out
            accounting[key] = ('mapped', '; '.join(detail) or 'empty style')
        else:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    replacement = serialize_comment('sgs/separator', out, void=True)
    return TransformResult(replacement, out, 'sgs/separator', accounting, notes)
