"""The CSS a page carries from the framework theme before any block sheet, and the page frame's measurements.

theme_css(repo_root) is, in the order a page loads it:
  1. the global styles WordPress builds from theme/sgs-theme/theme.json (the framework defaults, no client snapshot):
     preset custom properties, settings.custom as --wp--custom--*, the layout and root-padding properties, the
     is-layout-* and has-global-padding rules, the has-<slug>-* preset classes, and styles (body, elements, blocks);
  2. the colour-role pointers (inc/colour-roles.php) and the restored fluid type ranges (inc/type-scale-ranges.php),
     both read from the same theme.json (the defaults set no colour roles and no fluid size, so both print nothing);
  3. the stylesheets functions.php::enqueue_styles enqueues on every front-end page, in its order (read from the file,
     so a sheet added there joins). A sheet enqueued inside a condition (dark mode, WooCommerce, tick boxes, selection
     colours, the shop's load-more) is left out: a client's tokens or a plugin decide it.
Editor-only sheets (add_editor_style) are never read. Client tokens live in sites/<client>/, never here.

layout(repo_root) gives the page frame: content and wide size, and the root padding at 375, 768 and 1440 px.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

WIDTHS = (375, 768, 1440)
ROOT_FONT = 16.0
THEME_REL = Path('theme') / 'sgs-theme'
_CACHE: dict = {}

# ---------------------------------------------------------------- names and values


def kebab(s: str) -> str:
    """WordPress's camelCase to kebab-case for a custom key: `shadowColour` to `shadow-colour`, `2xl` stays `2xl`."""
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', s)
    s = re.sub(r'([a-zA-Z])([0-9])', r'\1-\2', s)
    return s.lower()


def wp_value(v) -> str:
    """`var:preset|spacing|40` is written `var(--wp--preset--spacing--40)`, as WordPress does."""
    v = str(v)
    m = re.fullmatch(r'var:preset\|([a-z-]+)\|(.+)', v)
    return f'var(--wp--preset--{m.group(1)}--{m.group(2)})' if m else v


def custom_vars(tree: dict, prefix: str = '--wp--custom') -> list:
    """settings.custom as declarations: nested keys joined by `--`, each key kebab-cased."""
    out = []
    for k, v in tree.items():
        name = f'{prefix}--{kebab(k)}'
        if isinstance(v, dict):
            out += custom_vars(v, name)
        elif not isinstance(v, list):
            out.append(f'{name}:{v}')
    return out


def _read_theme_json(repo_root: Path) -> dict:
    return json.loads((Path(repo_root) / THEME_REL / 'theme.json').read_text(encoding='utf-8'))


# ---------------------------------------------------------------- styles to declarations


def style_decls(node: dict) -> list:
    d = []
    col, typ, spc, bor = node.get('color', {}), node.get('typography', {}), node.get('spacing', {}), node.get('border', {})
    for k, css in (('background', 'background-color'), ('text', 'color'), ('gradient', 'background')):
        if k in col:
            d.append(f'{css}:{wp_value(col[k])}')
    for k, v in typ.items():
        d.append(f'{kebab(k)}:{wp_value(v)}')
    for box in ('padding', 'margin'):
        v = spc.get(box)
        if isinstance(v, dict):
            d += [f'{box}-{side}:{wp_value(x)}' for side, x in v.items()]
        elif v:
            d.append(f'{box}:{wp_value(v)}')
    if 'radius' in bor:
        d.append(f'border-radius:{wp_value(bor["radius"])}')
    for k in ('width', 'style', 'color'):
        if k in bor:
            d.append(f'border-{k}:{wp_value(bor[k])}')
    if 'shadow' in node:
        d.append(f'box-shadow:{wp_value(node["shadow"])}')
    return d


ELEMENT_SELECTORS = {
    'link': 'a:where(:not(.wp-element-button))',
    'button': '.wp-element-button, .wp-block-button__link',
    'heading': 'h1, h2, h3, h4, h5, h6',
    'caption': '.wp-element-caption, .wp-block-audio figcaption, .wp-block-embed figcaption, .wp-block-gallery figcaption, '
               '.wp-block-image figcaption, .wp-block-table figcaption, .wp-block-video figcaption',
}


def _element_selector(name: str):
    if name in ELEMENT_SELECTORS:
        return ELEMENT_SELECTORS[name]
    return name if re.fullmatch(r'h[1-6]|cite', name) else None


def _rules(selector: str, node: dict) -> list:
    """A node's own declarations, then each pseudo-class state it holds (`:hover` ...), as `:root :where(sel)` rules."""
    out = []
    own = style_decls(node)
    if own:
        out.append(f':root :where({selector}){{{";".join(own)}}}')
    for k, sub in node.items():
        if k.startswith(':') and isinstance(sub, dict) and style_decls(sub):
            out.append(f':root :where({selector}){k}{{{";".join(style_decls(sub))}}}')
    return out


def block_selector(name: str) -> str:
    return '.wp-block-' + name.replace('/', '-').removeprefix('core-')


def _block_rules(styles: dict) -> list:
    css = []
    for name, node in (styles.get('blocks') or {}).items():
        sel = block_selector(name)
        css += _rules(sel, node)
        for el, sub in (node.get('elements') or {}).items():
            es = _element_selector(el)
            if es:
                css += _rules(f'{sel} {es}', sub)
    return css


# ---------------------------------------------------------------- the global stylesheet

FLEX_JUSTIFY = {'left': 'flex-start', 'center': 'center', 'right': 'flex-end', 'space-between': 'space-between'}
LAYOUT_RULES = [
    'body{margin:0}',
    '.wp-site-blocks{padding-top:var(--wp--style--root--padding-top);padding-bottom:var(--wp--style--root--padding-bottom)}',
    '.has-global-padding{padding-right:var(--wp--style--root--padding-right);padding-left:var(--wp--style--root--padding-left)}',
    '.has-global-padding > .alignfull{margin-right:calc(var(--wp--style--root--padding-right) * -1);margin-left:calc(var(--wp--style--root--padding-left) * -1)}',
    '.has-global-padding :where(:not(.alignfull.is-layout-flow) > .has-global-padding:not(.wp-block-block, .alignfull)){padding-right:0;padding-left:0}',
    '.has-global-padding :where(:not(.alignfull.is-layout-flow) > .has-global-padding:not(.wp-block-block, .alignfull)) > .alignfull{margin-left:0;margin-right:0}',
    '.wp-site-blocks > .alignleft{float:left;margin-right:2em}',
    '.wp-site-blocks > .alignright{float:right;margin-left:2em}',
    '.wp-site-blocks > .aligncenter{justify-content:center;margin-left:auto;margin-right:auto}',
    ':where(.wp-site-blocks) > *{margin-block-start:var(--wp--style--block-gap);margin-block-end:0}',
    ':where(.wp-site-blocks) > :first-child{margin-block-start:0}',
    ':where(.wp-site-blocks) > :last-child{margin-block-end:0}',
    ':root :where(.is-layout-flow) > :first-child{margin-block-start:0}',
    ':root :where(.is-layout-flow) > :last-child{margin-block-end:0}',
    ':root :where(.is-layout-flow) > *{margin-block-start:var(--wp--style--block-gap);margin-block-end:0}',
    '.is-layout-flow > .alignleft{float:left;margin-inline-start:0;margin-inline-end:2em}',
    '.is-layout-flow > .alignright{float:right;margin-inline-start:2em;margin-inline-end:0}',
    '.is-layout-flow > .aligncenter{margin-left:auto !important;margin-right:auto !important}',
    '.is-layout-constrained > :where(:not(.alignleft):not(.alignright):not(.alignfull)){max-width:var(--wp--style--global--content-size);margin-left:auto !important;margin-right:auto !important}',
    '.is-layout-constrained > .alignwide{max-width:var(--wp--style--global--wide-size)}',
    '.is-layout-constrained > .alignleft{float:left;margin-inline-start:0;margin-inline-end:2em}',
    '.is-layout-constrained > .alignright{float:right;margin-inline-start:2em;margin-inline-end:0}',
    '.is-layout-constrained > .aligncenter{margin-left:auto !important;margin-right:auto !important}',
    ':root :where(.is-layout-constrained) > :first-child{margin-block-start:0}',
    ':root :where(.is-layout-constrained) > :last-child{margin-block-end:0}',
    ':root :where(.is-layout-constrained) > *{margin-block-start:var(--wp--style--block-gap);margin-block-end:0}',
    ':root :where(.is-layout-flex){gap:var(--wp--style--block-gap)}',
    ':root :where(.is-layout-grid){gap:var(--wp--style--block-gap)}',
    'body .is-layout-flex{display:flex}',
    '.is-layout-flex{flex-wrap:wrap;align-items:center}',
    '.is-layout-flex > :is(*, div){margin:0}',
    'body .is-layout-grid{display:grid}',
    '.is-layout-grid > :is(*, div){margin:0}',
    '.is-vertical{flex-direction:column}',
    '.is-nowrap{flex-wrap:nowrap}',
    *[f'.is-content-justification-{k}{{justify-content:{v}}}' for k, v in FLEX_JUSTIFY.items()],
]


def _palette_classes(st: dict) -> list:
    out = []
    for c in st.get('color', {}).get('palette', []):
        s = c['slug']
        out += [f'.has-{s}-color{{color:var(--wp--preset--color--{s}) !important}}',
                f'.has-{s}-background-color{{background-color:var(--wp--preset--color--{s}) !important}}',
                f'.has-{s}-border-color{{border-color:var(--wp--preset--color--{s}) !important}}']
    for g in st.get('color', {}).get('gradients', []):
        out.append(f'.has-{g["slug"]}-gradient-background{{background:var(--wp--preset--gradient--{g["slug"]}) !important}}')
    for f in st.get('typography', {}).get('fontSizes', []):
        out.append(f'.has-{f["slug"]}-font-size{{font-size:var(--wp--preset--font-size--{f["slug"]}) !important}}')
    for f in st.get('typography', {}).get('fontFamilies', []):
        out.append(f'.has-{f["slug"]}-font-family{{font-family:var(--wp--preset--font-family--{f["slug"]}) !important}}')
    return out


def global_css(theme: dict) -> str:
    st, sty = theme.get('settings', {}), theme.get('styles', {})
    v = []
    for c in st.get('color', {}).get('palette', []):
        v.append(f'--wp--preset--color--{c["slug"]}:{c["color"]}')
    for g in st.get('color', {}).get('gradients', []):
        v.append(f'--wp--preset--gradient--{g["slug"]}:{g["gradient"]}')
    for f in st.get('typography', {}).get('fontSizes', []):
        v.append(f'--wp--preset--font-size--{f["slug"]}:{f["size"]}')
    for f in st.get('typography', {}).get('fontFamilies', []):
        v.append(f'--wp--preset--font-family--{f["slug"]}:{f["fontFamily"]}')
    for s in st.get('spacing', {}).get('spacingSizes', []):
        v.append(f'--wp--preset--spacing--{s["slug"]}:{s["size"]}')
    for s in st.get('shadow', {}).get('presets', []):
        v.append(f'--wp--preset--shadow--{s["slug"]}:{s["shadow"]}')
    v += custom_vars(st.get('custom', {}))
    lay = st.get('layout', {})
    if lay.get('contentSize'):
        v.append(f'--wp--style--global--content-size:{lay["contentSize"]}')
    if lay.get('wideSize'):
        v.append(f'--wp--style--global--wide-size:{lay["wideSize"]}')
    v.append(f'--wp--style--block-gap:{wp_value(sty.get("spacing", {}).get("blockGap", "24px"))}')
    pad = sty.get('spacing', {}).get('padding') or {}
    root_pad = [f'--wp--style--root--padding-{s}:{wp_value(pad[s]) if s in pad else "0px"}' for s in ('top', 'right', 'bottom', 'left')]
    css = [':root{' + ';'.join(v) + '}']
    body = style_decls({k: sty[k] for k in ('color', 'typography') if k in sty})
    css.append('body{' + ';'.join([*root_pad, *body]) + '}')
    css += LAYOUT_RULES
    css += _palette_classes(st)
    for name, node in (sty.get('elements') or {}).items():
        sel = _element_selector(name)
        if sel:
            css += _rules(sel, node)
    css += _block_rules(sty)
    return '\n'.join(css)


# ---------------------------------------------------------------- the PHP parts, ported (inc/colour-roles.php, inc/type-scale-ranges.php)

_SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
_HEX = re.compile(r'^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$')


def colour_roles_css(theme: dict) -> str:
    """inc/colour-roles.php::colour_roles_css: each role pointed at its palette shade (or a raw hex)."""
    st = theme.get('settings', {})
    roles = (st.get('custom') or {}).get('colourRoles') or {}
    palette = {c['slug'] for c in st.get('color', {}).get('palette', [])}
    decls = []
    for role, target in roles.items():
        if not isinstance(role, str) or not isinstance(target, str) or not _SLUG.match(role):
            continue
        if _HEX.match(target):
            decls.append(f'--wp--preset--color--{role}:{target}')
        elif target != role and _SLUG.match(target) and target in palette:
            decls.append(f'--wp--preset--color--{role}:var(--wp--preset--color--{target})')
    return ':root{' + ';'.join(decls) + '}' if decls else ''


_FLUID_UNIT = r'(?:vmin|vmax|svw|lvw|dvw|cqw|cqi|vw|vh|vi|vb)(?![a-z])'


def is_fluid_size(size: str) -> bool:
    """inc/type-scale-ranges.php::is_fluid_size."""
    if '/*' in size or '*/' in size:
        return False
    if re.fullmatch(r'-?[0-9]*\.?[0-9]+' + _FLUID_UNIT, size, re.I):
        return True
    m = re.fullmatch(r'(clamp|min|max|calc)\(([0-9a-z.,+\-*/% ()]*)\)', size, re.I)
    if not m or size.count('(') != size.count(')'):
        return False
    return m.group(1).lower() == 'clamp' or re.search(r'[0-9.]' + _FLUID_UNIT, size, re.I) is not None


def type_scale_ranges_css(theme: dict) -> str:
    """inc/type-scale-ranges.php::type_scale_ranges_css: a fluid x-large, xx-large or hero size restored at the tablet tier."""
    sizes = {f['slug']: str(f['size']) for f in theme.get('settings', {}).get('typography', {}).get('fontSizes', [])}
    css = ''
    for slug in ('x-large', 'xx-large', 'hero'):
        size = sizes.get(slug, '')
        if size and is_fluid_size(size):
            css += f'@media(max-width:1023.98px){{:root:root{{--wp--preset--font-size--{slug}:{size};}}}}'
    return css


# ---------------------------------------------------------------- the theme's own front-end sheets


def _php_function_body(src: str, name: str) -> str:
    m = re.search(r'function\s+' + re.escape(name) + r'\s*\([^)]*\)[^{]*\{', src)
    if not m:
        return ''
    depth, i = 1, m.end()
    while i < len(src) and depth:
        depth += {'{': 1, '}': -1}.get(src[i], 0)
        i += 1
    return src[m.end():i - 1]


def front_end_sheets(theme_dir: Path) -> list:
    """The stylesheets functions.php::enqueue_styles enqueues on every page (outside any block), in enqueue order."""
    src = (Path(theme_dir) / 'functions.php').read_text(encoding='utf-8')
    body = _php_function_body(src, 'enqueue_styles')
    body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
    body = re.sub(r'(?m)^\s*//.*$', '', body)
    names, depth = [], 0
    for tok in re.finditer(r"[{}]|get_theme_file_uri\(\s*'(assets/css/[^']+\.css)'", body):
        t = tok.group(0)
        if t == '{':
            depth += 1
        elif t == '}':
            depth -= 1
        elif depth == 0 and tok.group(1) not in names:
            names.append(tok.group(1))
    return [Path(theme_dir) / n for n in names]


def theme_css(repo_root: Path) -> str:
    key = ('css', str(Path(repo_root).resolve()))
    if key not in _CACHE:
        root = Path(repo_root)
        theme = _read_theme_json(root)
        parts = [global_css(theme), colour_roles_css(theme)]
        parts += [f.read_text(encoding='utf-8') for f in front_end_sheets(root / THEME_REL)]
        parts.append(type_scale_ranges_css(theme))  # printed inline after type-scale.css
        _CACHE[key] = '\n'.join(p for p in parts if p)
    return _CACHE[key]


# ---------------------------------------------------------------- the page frame


class _Calc:
    """A CSS length expression (calc, clamp, min, max, + - * /, px rem em vw %) evaluated to px at one viewport width."""

    FUNC = re.compile(r'(clamp|min|max|calc)?\(')
    NUM = re.compile(r'(-?[0-9]*\.?[0-9]+)(px|rem|em|vw|%)?')

    def __init__(self, text: str, width: float):
        self.t, self.i, self.w = text.strip(), 0, width

    def ws(self):
        while self.i < len(self.t) and self.t[self.i] == ' ':
            self.i += 1

    def parse(self) -> float:
        v = self.expr()
        self.ws()
        if self.i != len(self.t):
            raise ValueError(f'unreadable length: {self.t!r}')
        return v

    def expr(self) -> float:
        v = self.term()
        while True:
            self.ws()
            if self.i < len(self.t) and self.t[self.i] in '+-' and self.t[self.i - 1] == ' ':
                op = self.t[self.i]
                self.i += 1
                r = self.term()
                v = v + r if op == '+' else v - r
            else:
                return v

    def term(self) -> float:
        v = self.atom()
        while True:
            self.ws()
            if self.i < len(self.t) and self.t[self.i] in '*/':
                op = self.t[self.i]
                self.i += 1
                r = self.atom()
                v = v * r if op == '*' else v / r
            else:
                return v

    def atom(self) -> float:
        self.ws()
        m = self.FUNC.match(self.t, self.i)
        if m:
            self.i = m.end()
            args = [self.expr()]
            self.ws()
            while self.t[self.i] == ',':
                self.i += 1
                args.append(self.expr())
                self.ws()
            self.i += 1  # the closing bracket
            fn = m.group(1) or 'calc'
            if fn == 'clamp':
                return max(args[0], min(args[1], args[2]))
            return {'min': min, 'max': max, 'calc': lambda *a: a[0]}[fn](*args)
        m = self.NUM.match(self.t, self.i)
        if not m:
            raise ValueError(f'unreadable length: {self.t!r}')
        self.i = m.end()
        n, unit = float(m.group(1)), m.group(2)
        return n * {'rem': ROOT_FONT, 'em': ROOT_FONT, 'vw': self.w / 100, '%': self.w / 100}.get(unit, 1.0)


def to_px(length: str, width: float) -> float:
    """A CSS length (px, rem, em, vw, calc, clamp, min, max) in px at a viewport width."""
    return _Calc(length, width).parse()


def _resolve_vars(value: str, theme: dict, depth: int = 0) -> str:
    """var(--wp--preset--spacing--N) and var(--wp--custom--a--b) replaced by their theme.json values."""
    st = theme['settings']
    spacing = {s['slug']: s['size'] for s in st.get('spacing', {}).get('spacingSizes', [])}
    custom = dict(d.split(':', 1) for d in custom_vars(st.get('custom', {})))

    def sub(m):
        name = m.group(1)
        pm = re.fullmatch(r'--wp--preset--spacing--(.+)', name)
        got = spacing.get(pm.group(1)) if pm else custom.get(name)
        if got is None:
            raise ValueError(f'unresolved {name}')
        return str(got)

    out = re.sub(r'var\((--[a-z0-9-]+)\)', sub, wp_value(value))
    return _resolve_vars(out, theme, depth + 1) if 'var(' in out and depth < 6 else out


def layout(repo_root: Path) -> dict:
    """{'contentSize': px, 'wideSize': px, 'rootPadding': {375: px, 768: px, 1440: px}} from theme.json. The sizes are
    evaluated at 1440. The root padding is the left side the way the page sets it: layout-tokens.css moves it to the
    mobile, tablet or desktop gutter token at the tier edges (< 768, < 1024, then desktop); with no tokens it is
    styles.spacing.padding.left."""
    key = ('layout', str(Path(repo_root).resolve()))
    if key in _CACHE:
        return _CACHE[key]
    theme = _read_theme_json(Path(repo_root))
    lay = theme['settings'].get('layout', {})
    gutter = (theme['settings'].get('custom') or {}).get('gutter') or {}
    base = (theme.get('styles', {}).get('spacing', {}).get('padding') or {}).get('left', '0px')
    pad = {}
    for w in WIDTHS:
        tier = 'mobile' if w < 768 else 'tablet' if w < 1024 else 'desktop'
        pad[w] = to_px(_resolve_vars(gutter.get(tier, base), theme), w)
    out = {'contentSize': to_px(_resolve_vars(lay['contentSize'], theme), 1440),
           'wideSize': to_px(_resolve_vars(lay['wideSize'], theme), 1440), 'rootPadding': pad}
    _CACHE[key] = out
    return out
