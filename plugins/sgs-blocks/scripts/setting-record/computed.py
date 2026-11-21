"""Compute a property's value on an element of a rendered page, offline: the cascade (cascade.py), inheritance, var()
substitution, shorthand expansion and unit resolution. A value the page's layout decides (what `auto` or a
percentage works out to) is kept as declared.

Sources of a value, lowest to highest: the CSS initial value (INITIAL), a Chromium user-agent subset (UA_CSS), the
sheets handed to Page in order, the element's style attribute.

Page.computed(el, pseudo, width) -> the resolved values of every property in INITIAL.
Page.raw(el, pseudo, width)      -> the winning declared value of every property that has one (any property).
Page.value(el, pseudo, prop, width) -> the computed value when the property is in INITIAL, else the raw one.
"""
from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup, Tag

import cascade as C

HERE = Path(__file__).resolve().parent

WIDTHS = C.R.WIDTHS  # the reference's breakpoint widths (block-source-scan/reference.py)
VIEWPORT_H = 900

UA_CSS = """
html,address,blockquote,body,div,dl,fieldset,form,h1,h2,h3,h4,h5,h6,ol,p,ul,pre,header,footer,main,nav,section,article,aside,figure,figcaption,details,summary,dialog,legend,hr{display:block}
li{display:list-item}
template,[hidden],script,style,head,dialog:not([open]){display:none}
body{margin:8px}
p,ul,ol{margin-top:1em;margin-bottom:1em}
ul,ol{padding-left:40px}
h2{font-size:1.5em;margin-top:.83em;margin-bottom:.83em;font-weight:bold}
strong,b{font-weight:bold}
a[href]{color:rgb(0, 0, 238);text-decoration-line:underline;cursor:pointer}
button{display:inline-block;color:rgb(0, 0, 0);letter-spacing:normal;word-spacing:normal;text-transform:none;text-indent:0;text-align:center;padding:1px 6px;border-width:2px;border-style:outset;border-color:rgb(118, 118, 118);background-color:rgb(239, 239, 239);box-sizing:border-box;cursor:default;align-items:flex-start;font-size:13.3333px;font-weight:400;font-family:system-ui;line-height:normal}
input,select,textarea{display:inline-block;box-sizing:border-box}
svg:not(:root){overflow-x:hidden;overflow-y:hidden}
dialog{position:absolute;left:0;right:0;margin:auto;border-width:1.5px;border-style:solid;padding:1em;background-color:rgb(255, 255, 255);color:rgb(0, 0, 0);width:fit-content;height:fit-content}
img{overflow-x:clip;overflow-y:clip}
input,textarea,select{letter-spacing:normal;word-spacing:normal;text-transform:none;text-indent:0;text-align:start;font-size:13.3333px;font-weight:400;font-family:system-ui;line-height:normal;color:rgb(0, 0, 0);margin:0}
input{padding:1px 2px;border-width:2px;border-style:inset;border-color:rgb(118, 118, 118);background-color:rgb(255, 255, 255);cursor:text;overflow-x:clip;overflow-y:clip}
input[type="hidden"],input[type="image"],input[type="file"]{padding:initial;background-color:initial;border:initial;cursor:default}
input[type="hidden"]{display:none !important}
input[type="file"]{align-items:baseline}
input[type="checkbox"],input[type="radio"]{margin:3px 3px 3px 4px;padding:initial;border:initial;background-color:initial;cursor:default;box-sizing:border-box}
option{display:block;padding:0 2px 1px;white-space:nowrap;min-height:1.2em}
input[type="submit"],input[type="button"]{cursor:default;box-sizing:border-box}
textarea{padding:2px;border-width:1px;border-style:solid;border-color:rgb(118, 118, 118);background-color:rgb(255, 255, 255);cursor:text;white-space:pre-wrap;overflow-x:auto;overflow-y:auto;resize:both}
select{padding:0;border-width:1px;border-style:solid;border-color:rgb(118, 118, 118);background-color:rgb(255, 255, 255);border-radius:0;cursor:default;white-space:pre;align-items:center;box-sizing:border-box}
fieldset{margin-left:2px;margin-right:2px;padding:.35em .75em .625em;border-width:2px;border-style:groove;border-color:rgb(192, 192, 192);min-width:min-content}
legend{padding-left:2px;padding-right:2px}
label{cursor:default}
"""

INHERITED = {'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-indent',
             'text-transform', 'white-space', 'direction', 'writing-mode', 'cursor', 'visibility', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
             'stroke-linecap', 'stroke-linejoin', '-webkit-text-stroke-color', '-webkit-text-stroke-width', 'accent-color', 'pointer-events',
             'scrollbar-color', 'font-variant-numeric', 'text-underline-offset', 'word-spacing', 'text-wrap', 'list-style-type'}
INITIAL = {
    'display': 'inline', 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'opacity': '1', 'border-radius': '0px', 'box-shadow': 'none',
    'grid-template-columns': 'none', 'grid-template-rows': 'none', 'column-gap': 'normal', 'row-gap': 'normal', 'gap': 'normal', 'justify-content': 'normal',
    'align-items': 'normal', 'align-content': 'normal', 'align-self': 'auto', 'justify-items': 'normal', 'object-fit': 'fill', 'aspect-ratio': 'auto',
    'min-height': 'auto', 'min-width': 'auto', 'max-height': 'none', 'max-width': 'none', 'width': 'auto', 'height': 'auto', 'flex-grow': '0', 'flex-shrink': '1',
    'flex-basis': 'auto', 'flex-direction': 'row', 'flex-wrap': 'nowrap', 'order': '0', 'transform': 'none', 'rotate': 'none', 'scale': 'none', 'translate': 'none',
    'backdrop-filter': 'none', 'filter': 'none', 'outline-style': 'none', 'outline-width': '3px', 'outline-color': 'currentcolor', 'outline-offset': '0px',
    'text-decoration-line': 'none', 'text-decoration-color': 'currentcolor', 'text-decoration-thickness': 'auto', 'text-decoration-style': 'solid',
    'text-underline-offset': 'auto', 'left': 'auto', 'top': 'auto', 'right': 'auto', 'bottom': 'auto', 'transition-duration': '0s', 'transition-delay': '0s',
    'transition-timing-function': 'ease', 'transition-property': 'all', 'transition-behavior': 'normal', 'animation-duration': '0s', 'animation-delay': '0s',
    'animation-timing-function': 'ease', 'direction': 'ltr', 'column-count': 'auto', 'column-width': 'auto', 'grid-auto-columns': 'auto', 'grid-auto-rows': 'auto',
    'grid-auto-flow': 'row', 'stroke': 'none', 'fill': 'rgb(0, 0, 0)', 'stroke-width': '1px', 'stroke-dasharray': 'none', 'stroke-linecap': 'butt',
    'stroke-linejoin': 'miter', 'writing-mode': 'horizontal-tb', 'background-attachment': 'scroll', 'background-size': 'auto', 'background-position': '0% 0%',
    'background-clip': 'border-box', 'background-origin': 'padding-box', 'background-repeat': 'repeat', 'border-image-source': 'none', 'object-position': '50% 50%',
    'text-indent': '0px', '-webkit-line-clamp': 'none', '-webkit-text-stroke-color': 'currentcolor', '-webkit-text-stroke-width': '0px', 'accent-color': 'auto',
    'box-sizing': 'content-box', 'clip-path': 'none', 'content': 'normal', 'cursor': 'auto', 'float': 'none', 'font-variant-numeric': 'normal', 'mix-blend-mode': 'normal',
    'overflow-x': 'visible', 'overflow-y': 'visible', 'overscroll-behavior-x': 'auto', 'overscroll-behavior-y': 'auto', 'pointer-events': 'auto', 'position': 'static',
    'resize': 'none', 'scroll-behavior': 'auto', 'scroll-margin-top': '0px', 'scroll-padding-top': 'auto', 'scroll-padding-right': 'auto', 'scroll-padding-bottom': 'auto',
    'scroll-padding-left': 'auto', 'scroll-snap-align': 'none', 'scroll-snap-type': 'none', 'scrollbar-color': 'auto', 'scrollbar-width': 'auto', 'white-space': 'normal',
    'z-index': 'auto', 'color': 'rgb(0, 0, 0)', 'font-size': '16px', 'font-family': 'Times New Roman', 'font-weight': '400', 'line-height': 'normal', 'letter-spacing': 'normal',
    'text-align': 'start', 'text-transform': 'none', 'visibility': 'visible', 'word-spacing': '0px', 'text-wrap': 'wrap',
}
for side in ('top', 'right', 'bottom', 'left'):
    INITIAL[f'margin-{side}'] = '0px'
    INITIAL[f'padding-{side}'] = '0px'
    INITIAL[f'border-{side}-width'] = '3px'
    INITIAL[f'border-{side}-style'] = 'none'
    INITIAL[f'border-{side}-color'] = 'currentcolor'
COLOUR_PROPS = {'color', 'background-color', 'outline-color', 'text-decoration-color', '-webkit-text-stroke-color', 'accent-color', 'fill', 'stroke',
                'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'}
TIME_PROPS = {'transition-duration', 'transition-delay', 'animation-duration', 'animation-delay'}
LAYOUT_PROPS = {'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'left', 'right', 'top', 'bottom', 'flex-basis', 'margin-left', 'margin-right',
                'margin-top', 'margin-bottom', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'grid-template-columns', 'grid-template-rows',
                'background-position', 'object-position', 'transform', 'translate', 'column-width', 'line-height', 'gap', 'row-gap', 'column-gap', 'border-radius'}
NAMED = {'transparent': (0, 0, 0, 0), 'white': (255, 255, 255, 1), 'black': (0, 0, 0, 1), 'red': (255, 0, 0, 1), 'canvastext': (0, 0, 0, 1),
         'canvas': (255, 255, 255, 1), 'buttonface': (239, 239, 239, 1), 'buttontext': (0, 0, 0, 1), 'buttonborder': (118, 118, 118, 1), 'inherit': None}



# ---------------------------------------------------------------- values
def split_top(v: str, sep=' ') -> list:
    out, depth, cur = [], 0, ''
    for ch in v:
        depth += ch == '('
        depth -= ch == ')'
        if (ch == sep or (sep == ' ' and ch in '\t\n')) and depth == 0:
            if cur.strip():
                out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def substitute(value: str, custom: dict, depth=0):
    """var() substitution; None when a var() has no value and no fallback (the declaration is then invalid)."""
    if depth > 30 or 'var(' not in value:
        return value
    i = value.find('var(')
    k = C._close(value, i + 3)
    inner = value[i + 4:k]
    parts = C.split_list(inner)
    name = parts[0].strip()
    fb = inner[inner.index(',') + 1:].strip() if ',' in inner else None
    got = custom.get(name)
    rep = substitute(got, custom, depth + 1) if got is not None else None
    if rep is None:
        rep = substitute(fb, custom, depth + 1) if fb is not None else None
    if rep is None:
        return None
    return substitute(value[:i] + rep + value[k + 1:], custom, depth + 1)


SIDES = ('top', 'right', 'bottom', 'left')


def four(v):
    t = split_top(v)
    t = t + [t[0]] * (1 - len(t)) if t else ['0']
    if len(t) == 1:
        t = t * 4
    elif len(t) == 2:
        t = [t[0], t[1], t[0], t[1]]
    elif len(t) == 3:
        t = [t[0], t[1], t[2], t[1]]
    return dict(zip(SIDES, t[:4]))


BORDER_STYLES = {'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'}


def border_parts(v):
    w, s, c = 'medium', 'none', 'currentcolor'
    for t in split_top(v):
        if t in BORDER_STYLES:
            s = t
        elif re.match(r'^-?[\d.]+[a-z%]*$|^(thin|medium|thick)$|^calc\(|^clamp\(|^min\(|^max\(', t):
            w = t
        else:
            c = t
    return w, s, c


def expand(prop: str, v: str) -> dict:
    logical = {'inline-start': 'left', 'inline-end': 'right', 'block-start': 'top', 'block-end': 'bottom'}
    m = re.fullmatch(r'(margin|padding|inset|scroll-padding|scroll-margin|border)-(inline|block)(-start|-end)?(-width|-style|-color)?', prop)
    if m:
        base, axis, edge, sub = m.group(1), m.group(2), m.group(3), m.group(4) or ''
        sides = [logical[f'{axis}{edge}']] if edge else (['left', 'right'] if axis == 'inline' else ['top', 'bottom'])
        vals = split_top(v) if not edge else [v]
        if not edge and len(vals) == 1:
            vals = vals * 2
        out = {}
        for s, x in zip(sides, vals):
            name = (s if base == 'inset' else f'{base}-{s}{sub}')
            out.update(expand(name, x) if base == 'border' and not sub else {name: x})
        return out
    if prop in ('margin', 'padding', 'scroll-padding', 'scroll-margin'):
        return {f'{prop}-{s}': x for s, x in four(v).items()}
    if prop == 'inset':
        return dict(four(v))
    if prop in ('border-width', 'border-style', 'border-color'):
        kind = prop.split('-')[1]
        return {f'border-{s}-{kind}': x for s, x in four(v).items()}
    if prop == 'border' or re.fullmatch(r'border-(top|right|bottom|left)', prop):
        w, s, c = border_parts(v)
        sides = SIDES if prop == 'border' else (prop.split('-')[1],)
        out = {}
        for sd in sides:
            out.update({f'border-{sd}-width': w, f'border-{sd}-style': s, f'border-{sd}-color': c})
        if prop == 'border':
            out['border-image-source'] = 'none'
        return out
    if prop == 'outline':
        w, s, c = border_parts(v)
        return {'outline-width': w, 'outline-style': s, 'outline-color': c}
    if prop in ('background',):
        out = {'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none'}
        layers = C.split_list(v)
        imgs = []
        for i, layer in enumerate(layers):
            toks = split_top(layer.strip())
            img = next((t for t in toks if re.match(r'(repeating-)?(linear|radial|conic)-gradient\(|url\(|image-set\(', t)), 'none')
            imgs.append(img)
            if i == len(layers) - 1:
                for t in toks:
                    if t != img and colourish(t):
                        out['background-color'] = t
        out['background-image'] = ', '.join(imgs)
        return out
    if prop == 'gap':
        t = split_top(v)
        return {'row-gap': t[0], 'column-gap': t[1] if len(t) > 1 else t[0]}
    if prop == 'flex':
        t = split_top(v)
        if v.strip() == 'none':
            return {'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto'}
        if v.strip() == 'auto':
            return {'flex-grow': '1', 'flex-shrink': '1', 'flex-basis': 'auto'}
        nums = [x for x in t if re.fullmatch(r'[\d.]+', x)]
        basis = next((x for x in t if not re.fullmatch(r'[\d.]+', x)), '0%')
        return {'flex-grow': nums[0] if nums else '1', 'flex-shrink': nums[1] if len(nums) > 1 else '1', 'flex-basis': basis}
    if prop == 'flex-flow':
        out = {}
        for x in split_top(v):
            out['flex-wrap' if 'wrap' in x else 'flex-direction'] = x
        return out
    if prop == 'overflow':
        t = split_top(v)
        return {'overflow-x': t[0], 'overflow-y': t[1] if len(t) > 1 else t[0]}
    if prop == 'overscroll-behavior':
        t = split_top(v)
        return {'overscroll-behavior-x': t[0], 'overscroll-behavior-y': t[1] if len(t) > 1 else t[0]}
    if prop == 'text-decoration':
        out = {'text-decoration-line': 'none', 'text-decoration-style': 'solid', 'text-decoration-color': 'currentcolor', 'text-decoration-thickness': 'auto'}
        lines = []
        for t in split_top(v):
            if t in ('underline', 'overline', 'line-through', 'none'):
                lines.append(t)
            elif t in ('solid', 'double', 'dotted', 'dashed', 'wavy'):
                out['text-decoration-style'] = t
            elif re.match(r'^[\d.]', t) or t in ('auto', 'from-font'):
                out['text-decoration-thickness'] = t
            else:
                out['text-decoration-color'] = t
        out['text-decoration-line'] = ' '.join(lines) or 'none'
        return out
    if prop in ('transition', 'animation'):
        pre = prop
        durs, dels, fns, props = [], [], [], []
        for item in C.split_list(v):
            times = [t for t in split_top(item) if re.fullmatch(r'-?[\d.]+m?s', t)]
            fn = next((t for t in split_top(item) if re.match(r'(ease|linear|step|cubic-bezier)', t)), 'ease')
            other = [t for t in split_top(item) if t not in times and t != fn]
            durs.append(times[0] if times else '0s')
            dels.append(times[1] if len(times) > 1 else '0s')
            fns.append(fn)
            props.append(other[0] if other else 'all')
        out = {f'{pre}-duration': ', '.join(durs), f'{pre}-delay': ', '.join(dels), f'{pre}-timing-function': ', '.join(fns)}
        if pre == 'transition':
            out['transition-property'] = ', '.join(props)
            out['transition-behavior'] = ', '.join('allow-discrete' if 'allow-discrete' in item else 'normal' for item in C.split_list(v))
        return out
    if prop == 'place-items':
        t = split_top(v)
        return {'align-items': t[0], 'justify-items': t[1] if len(t) > 1 else t[0]}
    if prop == 'place-content':
        t = split_top(v)
        return {'align-content': t[0], 'justify-content': t[1] if len(t) > 1 else t[0]}
    if prop == 'border-top-left-radius' or prop.endswith('-radius') and prop != 'border-radius':
        return {f'_{prop}': v}
    if prop == '-webkit-text-stroke':
        w, _, c = border_parts(v)
        return {'-webkit-text-stroke-width': w, '-webkit-text-stroke-color': c}
    if prop == 'grid-column-gap':
        return {'column-gap': v}
    if prop == 'grid-row-gap':
        return {'row-gap': v}
    return {prop: v}


def colourish(t):
    return t.startswith('#') or re.match(r'(rgb|rgba|hsl|hsla|color-mix|oklch|oklab|color)\(', t) is not None or t.lower() in NAMED or t.lower() == 'currentcolor'


def parse_colour(v: str, current):
    v = v.strip().lower()
    if v == 'currentcolor':
        return current
    if v in NAMED and NAMED[v] is not None:
        return NAMED[v]
    m = re.fullmatch(r'#([0-9a-f]{3,8})', v)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = ''.join(c * 2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        a = round(int(h[6:8], 16) / 255, 3) if len(h) == 8 else 1
        return (r, g, b, a)
    m = re.fullmatch(r'rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)', v)
    if m:
        a = m.group(4)
        a = 1 if a is None else (float(a[:-1]) / 100 if a.endswith('%') else float(a))
        return (round(float(m.group(1))), round(float(m.group(2))), round(float(m.group(3))), a)
    m = re.fullmatch(r'color-mix\(\s*in\s+srgb\s*,\s*(.+)\)', v)
    if m:
        args = C.split_list(m.group(1))
        if len(args) == 2:
            cols, pcts = [], []
            for a in args:
                mm = re.fullmatch(r'(.+?)\s+([\d.]+)%', a.strip())
                cols.append(parse_colour(mm.group(1) if mm else a.strip(), current))
                pcts.append(float(mm.group(2)) / 100 if mm else None)
            if None not in cols:
                p1 = pcts[0] if pcts[0] is not None else (1 - pcts[1] if pcts[1] is not None else 0.5)
                p2 = 1 - p1
                a = cols[0][3] * p1 + cols[1][3] * p2
                ch = [((cols[0][i] * cols[0][3] * p1 + cols[1][i] * cols[1][3] * p2) / a) if a else 0 for i in range(3)]
                return (round(ch[0]), round(ch[1]), round(ch[2]), round(a, 3))
    return None


def fmt_colour(c):
    r, g, b, a = c
    return f'rgb({r}, {g}, {b})' if a == 1 else f'rgba({r}, {g}, {b}, {round(a, 3):g})'


def px(v: str, fs: float, width: int, pct_base=None):
    """A length in px, or None when it depends on layout (a percentage with no base, auto)."""
    v = v.strip()
    if v in ('0', '0px'):
        return 0.0
    m = re.fullmatch(r'(-?[\d.]+)(px|rem|em|vw|vh|vmin|vmax|%|svh|dvh|lvh|ch|ex)?', v)
    if m:
        n, u = float(m.group(1)), m.group(2) or ''
        return {'px': n, 'rem': n * 16, 'em': n * fs, 'vw': n * width / 100, 'vh': n * VIEWPORT_H / 100, 'svh': n * VIEWPORT_H / 100,
                'dvh': n * VIEWPORT_H / 100, 'lvh': n * VIEWPORT_H / 100, 'vmin': n * min(width, VIEWPORT_H) / 100,
                'vmax': n * max(width, VIEWPORT_H) / 100, 'ch': n * fs * 0.5, 'ex': n * fs * 0.5, '': n if n == 0 else None,
                '%': (n * pct_base / 100) if pct_base is not None else None}[u]
    m = re.fullmatch(r'(calc|clamp|min|max)\((.*)\)', v, flags=re.S)
    if m:
        fn, inner = m.group(1), m.group(2)
        if fn == 'calc':
            expr = inner
            for tok in sorted(set(re.findall(r'-?[\d.]+(?:px|rem|em|vw|vh|%|svh|dvh)?|(?:calc|min|max|clamp)\([^()]*\)', expr)), key=len, reverse=True):
                if re.fullmatch(r'-?[\d.]+', tok):
                    continue
                val = px(tok, fs, width, pct_base)
                if val is None:
                    return None
                expr = expr.replace(tok, repr(val))
            if not re.fullmatch(r'[\d.\s+\-*/()e]+', expr):
                return None
            try:
                return float(eval(expr, {'__builtins__': {}}))  # noqa: S307 - digits and operators only, checked above
            except Exception:
                return None
        args = [px(a, fs, width, pct_base) for a in C.split_list(inner)]
        if None in args:
            return None
        return {'min': min(args), 'max': max(args), 'clamp': max(args[0], min(args[1], args[2])) if len(args) == 3 else None}[fn]
    return None


def fmt_px(n: float) -> str:
    r = round(n, 3)
    return f'{int(r)}px' if r == int(r) else f'{r:g}px'


def fmt_time(v: str) -> str:
    out = []
    for t in C.split_list(v):
        t = t.strip()
        m = re.fullmatch(r'(-?[\d.]+)(ms|s)', t)
        out.append(f'{(float(m.group(1)) / (1000 if m.group(2) == "ms" else 1)):g}s' if m else t)
    return ', '.join(out)

# ---------------------------------------------------------------- the computation
class Page:
    """A block's rendered HTML inside the page frame WordPress gives it, with the sheets that style it.

    `sheets` is a list of CSS texts in cascade order (later wins at equal priority); `short` is the block's short name
    (button for sgs/button). `held` are element states that are true (see cascade.resting); `conditions` are media
    conditions that are true (see cascade.media_holds). Both default to a plain screen at rest."""

    def __init__(self, html: str, sheets: list, short: str, held=(), conditions=frozenset(), base_rules=None):
        frame = ('<html><body><div class="wp-site-blocks"><main class="wp-block-group">'
                 '<div class="entry-content wp-block-post-content is-layout-constrained has-global-padding">' + html + '</div></main></div></body></html>')
        self.soup = BeautifulSoup(frame, 'html.parser')
        for s in self.soup.find_all('style'):
            s.decompose()
        self.short = short
        self.held = frozenset(held)
        self.conditions = frozenset(conditions)
        # base_rules: rules flattened once and shared by many pages (static_rules below), ahead of `sheets`.
        rules = list(base_rules) if base_rules is not None else C.flatten(UA_CSS, 0, 0)
        n = (max(r.order for r in rules) // 100_000 + 1) * 100_000 + 10_000 if base_rules else 10_000
        for css in sheets:
            rules += C.flatten(css, 1, n)
            n += 100_000
        self.rules = rules
        self.memo = {}
        self.raw_memo = {}
        self.root = self.soup.select_one(f'.sgs-{short}')
        # WordPress's get_block_wrapper_attributes() adds the block's generated class; the offline renderer's stub
        # does not, so it is added here as WordPress would.
        if self.root is not None:
            self.root['class'] = list(self.root.get('class', [])) + [f'wp-block-sgs-{short}']
        self.cascade = C.Cascade(self.soup, self.rules, self.held)

    @staticmethod
    def static_rules(sheets: list) -> list:
        """The user-agent rules and the given sheets flattened once, in cascade order, to pass as base_rules."""
        rules = C.flatten(UA_CSS, 0, 0)
        n = 10_000
        for css in sheets:
            rules += C.flatten(css, 1, n)
            n += 100_000
        return rules

    # -- the parts of a page
    def elements(self, part: str) -> list:
        """The elements a part key names, as [(element, pseudo or None)]. Keys are the reference's: 'ROOT' (the block
        root), 'sgs-x__y' (every element with that class), 'sgs-x__y svg' (a descendant tag of that class), a bare tag,
        each optionally ending in '::before' or '::after' (returned as the pseudo)."""
        key, _, pe = part.partition('::')
        pseudo = pe or None
        head, _, tag = key.strip().partition(' ')
        if head == 'ROOT':
            base = [self.root] if self.root is not None else []
        elif head.startswith('sgs-') or head.startswith('wp-'):
            base = self.soup.select(f'.{head}')
        else:
            base, tag = self.soup.select(head), ''
        if tag:
            seen, found = set(), []
            for b in base:
                for el in b.select(tag.strip()):
                    if id(el) not in seen:
                        seen.add(id(el))
                        found.append(el)
            base = found
        return [(el, pseudo) for el in base]

    # -- the declared values
    def _declared(self, el, pseudo, width):
        """(raw, custom): the winning declared value of every non-custom property after var() substitution and
        shorthand expansion, and the custom properties in force on the element (or its pseudo-element)."""
        key = (id(el), pseudo, width)
        if key in self.raw_memo:
            return self.raw_memo[key]
        if pseudo:
            parent_custom = self.computed(el, None, width)['_custom']
        elif isinstance(el.parent, Tag) and el.parent.name != '[document]':
            parent_custom = self.computed(el.parent, None, width)['_custom']
        else:
            parent_custom = {}
        decls = self.cascade.declared(el, pseudo, width, self.conditions)
        custom = dict(parent_custom)
        for _, prop, value, _ in decls:
            if prop.startswith('--'):
                custom[prop] = parent_custom.get(prop) if value.strip() == 'inherit' else value
        raw = {}
        for _, prop, value, _ in decls:
            if prop.startswith('--'):
                continue
            v = substitute(value, custom)
            if v is None:
                v = 'unset'
            v = re.sub(r'\s*!important\s*$', '', v)
            for k, x in expand(prop, v).items():
                raw[k] = x.strip()
        self.raw_memo[key] = (raw, custom)
        return self.raw_memo[key]

    def raw(self, el, pseudo, width) -> dict:
        """The winning declared value of every property the CSS sets on the element, longhands expanded, var()
        substituted, nothing resolved: for comparing properties INITIAL does not list."""
        return dict(self._declared(el, pseudo, width)[0])

    def value(self, el, pseudo, prop, width):
        """The computed value when INITIAL lists the property, else the raw declared value (None when none is set)."""
        if prop in INITIAL:
            return self.computed(el, pseudo, width).get(prop)
        return self._declared(el, pseudo, width)[0].get(prop)

    def computed(self, el, pseudo, width) -> dict:
        key = (id(el), pseudo, width)
        if key in self.memo:
            return self.memo[key]
        if pseudo:
            parent = self.computed(el, None, width)
        elif isinstance(el.parent, Tag) and el.parent.name != '[document]':
            parent = self.computed(el.parent, None, width)
        else:
            parent = {'_custom': {}, **INITIAL, '_display': 'block'}
        raw, custom = self._declared(el, pseudo, width)
        out = {'_custom': custom, '_tag': el.name, '_cc': set()}
        fs_parent = float(parent['font-size'][:-2]) if parent['font-size'].endswith('px') else 16.0
        for prop in list(INITIAL):
            v = raw.get(prop)
            if v in ('inherit',) or (v in ('unset', 'revert', 'revert-layer') and prop in INHERITED) or (v is None and prop in INHERITED):
                # currentcolor inherits as the keyword and resolves against this element's own colour.
                out[prop] = 'currentcolor' if prop in parent.get('_cc', ()) else parent[prop]
                continue
            if v is None or v in ('initial', 'unset', 'revert', 'revert-layer'):
                v = INITIAL[prop]
            out[prop] = v
        fs = px(out['font-size'], fs_parent, width, fs_parent) if out['font-size'] != parent['font-size'] or 'font-size' in raw else fs_parent
        out['font-size'] = fmt_px(fs if fs is not None else fs_parent)
        fsn = float(out['font-size'][:-2])
        cur = parse_colour(out['color'], parse_colour(parent['color'], (0, 0, 0, 1))) if 'color' in raw else parse_colour(parent['color'], (0, 0, 0, 1))
        out['color'] = fmt_colour(cur) if cur else out['color']
        for prop in list(INITIAL):
            if prop in ('font-size', 'color'):
                continue
            v = out[prop]
            if prop in COLOUR_PROPS and str(v).strip().lower() == 'currentcolor':
                out['_cc'].add(prop)
            if prop in INHERITED and prop not in raw and v == parent.get(prop) and prop not in COLOUR_PROPS:
                continue
            out[prop] = self.normalise(prop, v, fsn, cur, width, out)
        # The used display: a child of a flex or grid container, or an absolutely positioned or floated box, is blockified.
        pdisp = parent.get('display', 'block') if not pseudo else out.get('display')
        d = out['display']
        if d not in ('none', 'contents') and (pdisp in ('flex', 'inline-flex', 'grid', 'inline-grid') and not pseudo or out['position'] in ('absolute', 'fixed') or out['float'] != 'none'):
            out['display'] = {'inline': 'block', 'inline-block': 'block', 'inline-flex': 'flex', 'inline-grid': 'grid', 'inline-table': 'table'}.get(d, d)
        if pseudo in ('before', 'after', 'marker') and out['content'] in ('normal', 'none'):
            out['_absent'] = True
        # One overflow axis that scrolls makes a visible other axis compute to auto (CSS Overflow 3).
        ox, oy = out['overflow-x'], out['overflow-y']
        if ox == 'visible' and oy not in ('visible', 'clip'):
            out['overflow-x'] = 'auto'
        if oy == 'visible' and ox not in ('visible', 'clip'):
            out['overflow-y'] = 'auto'
        # min-width/min-height auto reads 0px unless the element is a flex or grid item (the browser's resolved value).
        if not pseudo and parent.get('display') not in ('flex', 'inline-flex', 'grid', 'inline-grid'):
            for mprop in ('min-width', 'min-height'):
                if out[mprop] == 'auto':
                    out[mprop] = '0px'
        # An element with no box (display: none on it or an ancestor) reads transform as none (the browser's resolved value).
        out['_nobox'] = out['display'] == 'none' or parent.get('_nobox', False)
        if out['_nobox']:
            out['transform'] = 'none'
        self.memo[key] = out
        return out

    def normalise(self, prop, v, fs, cur, width, out):
        if prop in COLOUR_PROPS:
            if prop in ('fill', 'stroke') and v.strip() == 'none':
                return 'none'
            if v == 'auto':
                return v
            c = parse_colour(v, cur)
            return fmt_colour(c) if c else v
        if prop in TIME_PROPS:
            return fmt_time(v)
        if re.fullmatch(r'border-(top|right|bottom|left)-width', prop):
            if out[prop.replace('width', 'style')] in ('none', 'hidden'):
                return '0px'
            v = {'thin': '1px', 'medium': '3px', 'thick': '5px'}.get(v, v)
        if prop == 'outline-width':
            if out['outline-style'] == 'none':
                return '0px'
            v = {'thin': '1px', 'medium': '3px', 'thick': '5px'}.get(v, v)
        if prop == 'line-height' and re.fullmatch(r'[\d.]+', v):
            return fmt_px(float(v) * fs)
        if prop in ('stroke-width', 'outline-offset', 'text-indent') and re.fullmatch(r'-?[\d.]+', v):
            return fmt_px(float(v))  # an SVG attribute's bare number is a length in px
        if prop in ('box-shadow',) and v != 'none':
            items = []
            for item in C.split_list(v):
                toks = split_top(item)
                col = next((t for t in toks if colourish(t)), 'currentcolor')
                lens = [t for t in toks if t != col and t != 'inset']
                vals = [px(t, fs, width) for t in lens]
                if None in vals:
                    return v
                vals += [0.0] * (4 - len(vals))
                c = parse_colour(col, cur)
                items.append(' '.join([fmt_colour(c) if c else col] + [fmt_px(x) for x in vals[:4]] + (['inset'] if 'inset' in toks else [])))
            return ', '.join(items)
        if prop == 'border-radius':
            vals = [px(t, fs, width) for t in split_top(v)]
            return ' '.join(fmt_px(x) for x in vals) if None not in vals else v
        if prop == 'font-weight':
            return {'normal': '400', 'bold': '700'}.get(v, v)
        if prop in ('opacity',) and v.endswith('%'):
            return f'{float(v[:-1]) / 100:g}'
        if v.strip() == '0' and prop not in ('opacity', 'flex-grow', 'flex-shrink', 'order', 'z-index', 'column-count', '-webkit-line-clamp'):
            return '0px'
        n = px(v, fs, width) if re.match(r'^(-?[\d.]|calc\(|clamp\(|min\(|max\()', v) else None
        if n is not None and not re.fullmatch(r'-?[\d.]+', v):
            return fmt_px(n)
        return v
