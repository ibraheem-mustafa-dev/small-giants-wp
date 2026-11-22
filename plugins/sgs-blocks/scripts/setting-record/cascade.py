"""A small CSS cascade: flatten stylesheets (nesting, @media, @supports, @layer, @container), match rules to elements
with soupsieve, order them by origin, layer, importance, specificity and source order.

It answers "what does the CSS declare for this element at this screen width" from the declared CSS alone; layout
results (what `auto` works out to) are left as the declared value.

Two evaluation inputs beyond the width:
  * `conditions`: media conditions that are TRUE for this evaluation (forced-colors, reduced motion, ...). The default
    (none) is a plain screen: every one of those queries fails.
  * `held`: element states that are TRUE (hover, focus, current, open, disabled, active, checked). A selector token that
    tests a held state always matches; a dynamic pseudo-class that is not held never matches.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import soupsieve as sv
import tinycss2

HERE = Path(__file__).resolve().parent
SCAN = HERE.parent / 'block-source-scan'
if str(SCAN) not in sys.path:
    sys.path.insert(0, str(SCAN))
import reference as R  # noqa: E402  (norm_state, STATE_WORDS, ROOT)
import vocab as V  # noqa: E402  (EXTRA_STATES: the state names the reference does not list)

DYNAMIC = r'hover|focus-visible|focus-within|focus|active|visited|target|popover-open|open|modal|fullscreen|user-invalid|user-valid|autofill|-webkit-autofill|host|playing|paused|state\([^)]*\)'
# Pseudo-classes the rendered markup decides (an input's checked or placeholder attribute): left to soupsieve unless held.
MARKUP_STATES = r'checked|indeterminate|placeholder-shown'
# A pseudo-element: `::name`, or one of the four legacy names written with one colon. A pseudo-class that starts with
# the same letters (`:placeholder-shown`, `:-webkit-autofill`) is not one.
PSEUDO_EL = re.compile(r'(?:::|(?<!:):(?=(?:before|after|first-letter|first-line)(?![\w-])))'
                       r'(before|after|first-letter|first-line|marker|placeholder|selection|backdrop|file-selector-button|-webkit-[a-z-]+|-moz-[a-z-]+)(?![\w-])(\([^)]*\))?')
NEVER = ':is(.sgs-trial-never)'
ALWAYS = ':is(*)'

STATE_NAMES = {name for name, _ in R.STATE_WORDS} | set(V.EXTRA_STATES)


@dataclass
class Rule:
    selector: str
    pseudo: str | None
    decls: list            # [(prop, value, important)]
    media: tuple           # media preludes that must all hold
    layered: bool
    origin: int            # 0 user agent, 1 author
    order: int
    spec: tuple = (0, 0, 0)
    matcher: object = field(default=None, repr=False)


def _decls_and_children(tokens):
    out, kids = [], []
    for item in tinycss2.parse_blocks_contents(tokens, skip_whitespace=True, skip_comments=True):
        if item.type == 'declaration':
            out.append((item.lower_name, tinycss2.serialize(item.value).strip(), item.important))
        elif item.type in ('qualified-rule', 'at-rule'):
            kids.append(item)
    return out, kids


def _join(parent: str | None, sel: str) -> str:
    sel = sel.strip()
    if not parent:
        return sel.replace('&', ':root')
    parts = []
    for one in split_list(sel):
        one = one.strip()
        if '&' in one:
            parts.append(one.replace('&', f':is({parent})'))
        else:
            parts.append(f':is({parent}) {one}')
    return ', '.join(parts)


def split_list(sel: str) -> list:
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return out


def flatten(css: str, origin: int, start: int, layered=False) -> list:
    """Every style rule of a stylesheet as Rule objects (one per selector of a list), with the @media / @container
    preludes it sits in, including an @media nested inside a style rule."""
    rules = []
    order = [start]

    def walk(nodes, parent, media, layered):
        for n in nodes:
            if n.type == 'qualified-rule':
                sel = _join(parent, tinycss2.serialize(n.prelude))
                decls, kids = _decls_and_children(n.content)
                if decls:
                    order[0] += 1
                    rules.append(Rule(sel, None, decls, media, layered, origin, order[0]))
                walk(kids, sel, media, layered)
            elif n.type == 'at-rule':
                name = n.lower_at_keyword
                pre = tinycss2.serialize(n.prelude).strip()
                if n.content is None or name in ('font-face', 'keyframes', '-webkit-keyframes', 'page', 'property', 'counter-style', 'font-feature-values', 'view-transition', 'position-try'):
                    continue
                if name == 'media':
                    sub_media = media + (pre,)
                elif name == 'container':
                    sub_media = media + ('container ' + pre,)
                else:
                    sub_media = media
                sub_layered = layered or name == 'layer'
                if parent:
                    decls, kids = _decls_and_children(n.content)
                    if decls:
                        order[0] += 1
                        rules.append(Rule(parent, None, decls, sub_media, sub_layered, origin, order[0]))
                    walk(kids, parent, sub_media, sub_layered)
                else:
                    walk(tinycss2.parse_rule_list(n.content, skip_whitespace=True, skip_comments=True), None, sub_media, sub_layered)

    walk(tinycss2.parse_stylesheet(css, skip_whitespace=True, skip_comments=True), None, (), layered)
    out = []
    for r in rules:
        for one in split_list(r.selector):
            one = one.strip()
            m = list(PSEUDO_EL.finditer(one))
            pseudo = m[-1].group(1) if m and m[-1].end() == len(one) else None
            base = one[:m[-1].start()] if pseudo else one
            if PSEUDO_EL.search(base):
                continue  # a pseudo-element in the middle (e.g. ::part) is not drawn on a part we read
            out.append(Rule(base or '*', pseudo, r.decls, r.media, r.layered, r.origin, r.order, specificity(one)))
    return out


# A media condition the evaluation can be told is true. The key is the name callers pass in `conditions`.
CONDITIONS = {
    'forced-colors': re.compile(r'forced-colors:\s*active'),
    'prefers-reduced-motion-reduce': re.compile(r'prefers-reduced-motion:\s*reduce'),
    'hover-none': re.compile(r'\(hover:\s*none\)'),
    'pointer-coarse': re.compile(r'pointer:\s*coarse'),
    'print': re.compile(r'\bprint\b'),
    'prefers-color-scheme-dark': re.compile(r'prefers-color-scheme:\s*dark'),
    'prefers-contrast': re.compile(r'prefers-contrast'),
}
# Media features and when each holds: (pattern, the condition it tests, whether it holds when that condition is set).
# A plain screen at rest has none of the conditions, so `forced-colors: none` holds there and `forced-colors: active` fails.
_FEATURES = (
    (re.compile(r'forced-colors:\s*active'), 'forced-colors', True),
    (re.compile(r'forced-colors:\s*none'), 'forced-colors', False),
    (re.compile(r'prefers-reduced-motion:\s*reduce'), 'prefers-reduced-motion-reduce', True),
    (re.compile(r'prefers-reduced-motion:\s*no-preference'), 'prefers-reduced-motion-reduce', False),
    (re.compile(r'\(\s*prefers-reduced-motion\s*\)'), 'prefers-reduced-motion-reduce', True),
    (re.compile(r'\((?:any-)?hover:\s*none\)'), 'hover-none', True),
    (re.compile(r'\((?:any-)?hover:\s*hover\)'), 'hover-none', False),
    (re.compile(r'pointer:\s*coarse'), 'pointer-coarse', True),
    (re.compile(r'pointer:\s*fine'), 'pointer-coarse', False),
    (re.compile(r'prefers-color-scheme:\s*dark'), 'prefers-color-scheme-dark', True),
    (re.compile(r'prefers-color-scheme:\s*light'), 'prefers-color-scheme-dark', False),
    (re.compile(r'prefers-contrast:\s*(?:more|less|custom)|\(\s*prefers-contrast\s*\)'), 'prefers-contrast', True),
    (re.compile(r'prefers-contrast:\s*no-preference'), 'prefers-contrast', False),
)
_NEVER_FEATURE = re.compile(r'inverted-colors:\s*inverted|scripting:\s*none')


_LEN = r'([\d.]+)(px|rem|em)?'
_UNIT = {'px': 1, 'rem': 16, 'em': 16, None: 1, '': 1}


def _width_ok(c: str, width: float) -> bool:
    """Whether the width tests in a query text (min-/max-width or -inline-size, range syntax either way round) hold at
    `width` px. A query with none holds."""
    ok = True
    for kind, num, unit in re.findall(r'(min|max)-(?:width|inline-size):\s*' + _LEN, c):
        v = float(num) * _UNIT[unit]
        ok = ok and (width >= v if kind == 'min' else width <= v)
    for op, num, unit in re.findall(r'(?:width|inline-size)\s*(>=|<=|<|>)\s*' + _LEN, c):
        v = float(num) * _UNIT[unit]
        ok = ok and {'>=': width >= v, '<=': width <= v, '<': width < v, '>': width > v}[op]
    for num, unit, op in re.findall(_LEN + r'\s*(>=|<=|<|>)\s*(?:width|inline-size)', c):
        v = float(num) * _UNIT[unit]  # `400px <= width` reads width >= 400px
        ok = ok and {'>=': width <= v, '<=': width >= v, '<': width > v, '>': width < v}[op]
    return ok


def _query_holds(q: str, width: int, conditions: frozenset) -> bool:
    """One media query of a comma list. `not` negates the whole query; the media type is screen unless `print` is in
    `conditions` (`all` always matches, other types never do); each feature holds as _FEATURES says; widths are
    checked against `width`."""
    q = q.strip().lower()
    if q.startswith('only '):
        q = q[5:].strip()
    neg = q.startswith('not ')
    if neg:
        q = q[4:].strip()
    ok = True
    m = re.match(r'([a-z-]+)\b', q)
    if m:
        kind = m.group(1)
        if kind == 'print':
            ok = 'print' in conditions
        elif kind == 'screen':
            ok = 'print' not in conditions
        elif kind != 'all':
            ok = False
    for rx, name, holds_when_set in _FEATURES:
        if rx.search(q):
            ok = ok and ((name in conditions) == holds_when_set)
    if _NEVER_FEATURE.search(q):
        ok = False
    ok = ok and _width_ok(q, width)
    return not ok if neg else ok


CONTAINER_FEATURE = re.compile(r'(?<![\w-])(?:min-|max-)?(?:width|inline-size)(?![\w-])')
_CONTAINER_OTHER = re.compile(r'style\s*\(|scroll-state\s*\(|(?<![\w-])(?:min-|max-)?(?:height|block-size|aspect-ratio|orientation)(?![\w-])')


def container_query(prelude: str):
    """(container name or None, query text) of a `container [name] (query)` prelude."""
    body = prelude.strip()[len('container'):].strip()
    m = re.match(r'([a-zA-Z_][\w-]*)\s+(?=[(a-z])', body)
    if m and m.group(1).lower() not in ('not', 'and', 'or', 'style'):
        return m.group(1), body[m.end():].strip()
    return None, body


def container_evaluable(prelude: str) -> bool:
    """Whether a container prelude only tests the container's width (the one thing a container width gives)."""
    q = container_query(prelude)[1].lower()
    return bool(CONTAINER_FEATURE.search(q)) and not _CONTAINER_OTHER.search(q)


def _container_holds(prelude: str, container) -> bool:
    """A `container` prelude against `container(name) -> content width in px or None`. No width, or a query on anything
    but width, never holds."""
    if container is None or not container_evaluable(prelude):
        return False
    name, q = container_query(prelude)
    px = container(name)
    if px is None:
        return False
    q = q.lower()
    ors = re.split(r'\)\s+or\s+\(', q)
    if len(ors) > 1:
        return any(_width_ok(o, px) for o in ors)
    neg = q.startswith('not ')
    ok = _width_ok(q[4:] if neg else q, px)
    return not ok if neg else ok


def media_holds(conds: tuple, width: int, conditions=frozenset(), container=None) -> bool:
    """Whether every media prelude holds on a page `width` px wide. A prelude is a comma list of queries and holds when
    any one of them does; `not` negates its own query only. With no `conditions` the page is a plain screen at rest (no
    forced colours, motion allowed, a hovering fine pointer, light scheme); a name in `conditions` (a key of CONDITIONS)
    makes that condition true, and `print` makes the page print, not screen. A container query holds against
    `container(name)`, the container's content width in px (see _container_holds); with no `container` it never holds."""
    conditions = frozenset(conditions)
    for c in conds:
        c = c.strip()
        if c.lower().startswith('container'):
            if not _container_holds(c, container):
                return False
            continue
        if not any(_query_holds(q, width, conditions) for q in split_list(c)):
            return False
    return True


def specificity(sel: str) -> tuple:
    a = b = c = 0
    i = 0
    s = sel
    while i < len(s):
        ch = s[i]
        if ch == '#':
            a += 1
            i += 1
            while i < len(s) and re.match(r'[\w-]', s[i]):
                i += 1
        elif ch == '.':
            b += 1
            i += 1
            while i < len(s) and re.match(r'[\w-]', s[i]):
                i += 1
        elif ch == '[':
            b += 1
            i = s.index(']', i) + 1 if ']' in s[i:] else len(s)
        elif s.startswith('::', i):
            c += 1
            i += 2
            while i < len(s) and re.match(r'[\w-]', s[i]):
                i += 1
            if i < len(s) and s[i] == '(':
                i = _close(s, i) + 1
        elif ch == ':':
            m = re.match(r':([\w-]+)', s[i:])
            name = m.group(1) if m else ''
            j = i + 1 + len(name)
            if j < len(s) and s[j] == '(':
                k = _close(s, j)
                inner = s[j + 1:k]
                if name == 'where':
                    pass
                elif name in ('is', 'not', 'has', 'matches'):
                    best = max((specificity(x) for x in split_list(inner)), default=(0, 0, 0))
                    a, b, c = a + best[0], b + best[1], c + best[2]
                elif name in ('nth-child', 'nth-last-child') and ' of ' in inner:
                    best = max((specificity(x) for x in split_list(inner.split(' of ', 1)[1])), default=(0, 0, 0))
                    a, b, c = a + best[0], b + best[1] + 1, c + best[2]
                else:
                    b += 1
                i = k + 1
            else:
                if name in ('before', 'after', 'first-letter', 'first-line'):
                    c += 1
                elif name:
                    b += 1
                i = j
        elif re.match(r'[a-zA-Z]', ch) and (i == 0 or s[i - 1] in ' >+~(,'):
            c += 1
            while i < len(s) and re.match(r'[\w-]', s[i]):
                i += 1
        else:
            i += 1
    return (a, b, c)


def _close(s, i):
    depth = 0
    for k in range(i, len(s)):
        if s[k] == '(':
            depth += 1
        elif s[k] == ')':
            depth -= 1
            if depth == 0:
                return k
    return len(s) - 1


_DYNAMIC_RE = re.compile(r':(' + DYNAMIC + r')(?![\w-])')
_DISABLED_RE = re.compile(r':disabled(?![\w-])')
_MARKUP_RE = re.compile(r':(' + MARKUP_STATES + r')(?![\w-])')
_ARIA_RE = re.compile(r'''\[\s*aria-(current|expanded|selected|checked|disabled|pressed)\s*(?:[~|^$*]?=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*[is]?\s*)?\]''')
_IS_CLASS_RE = re.compile(r'\.is-([a-z][a-z0-9-]*)(?![\w-])')
_OPEN_ATTR_RE = re.compile(r'''\[\s*open\s*(?:=\s*(?:""|''))?\s*\]''')
_BEM_STATE_RE = re.compile(r'\.sgs-[a-z0-9-]+(?:__[a-z0-9-]+)?--(active|current|open|expanded|checked|selected|disabled)(?![\w-])')


def _state_of(word: str) -> str | None:
    """The reference state (hover, focus, current, open, disabled, active, checked) a word names, or None."""
    s = R.norm_state(word)
    return s if s in STATE_NAMES else None


def resting(sel: str, held=()) -> str:
    """The selector as it matches a page at rest, with the states in `held` switched on. A selector token that tests a
    held state becomes :is(*) (always true, so :not(:hover) becomes false when hover is held). A dynamic pseudo-class
    that is not held never matches. A markup token that is not held (an attribute, an .is- class, a BEM modifier,
    :disabled, :checked, :indeterminate, :placeholder-shown) is
    left to match the markup as rendered; aria-*="false" is never replaced, because it describes the markup as it is."""
    held = frozenset(held)
    for h in held:
        if h.startswith('.'):  # a class the state is written as (.is-detached): held means the element carries it
            sel = re.sub(re.escape(h) + r'(?![\w-])', ALWAYS, sel)
    sel = re.sub(r':dir\(\s*ltr\s*\)', '', sel)
    sel = re.sub(r':dir\(\s*rtl\s*\)', NEVER, sel)
    sel = re.sub(r':(?:any-)?link\b', '[href]', sel)
    sel = re.sub(r':defined\b', '', sel)
    if held:
        sel = _DISABLED_RE.sub(lambda m: ALWAYS if 'disabled' in held else m.group(0), sel)
        sel = _MARKUP_RE.sub(lambda m: ALWAYS if (m.group(1) in held or _state_of(m.group(1)) in held) else m.group(0), sel)

        def aria(m):
            value = next((g for g in m.group(2, 3, 4) if g is not None), None)
            if value is not None and value.strip().lower() == 'false':
                return m.group(0)
            name = m.group(1)
            return ALWAYS if (_state_of(name) in held or name in held) else m.group(0)

        sel = _ARIA_RE.sub(aria, sel)
        sel = _OPEN_ATTR_RE.sub(lambda m: ALWAYS if 'open' in held else m.group(0), sel)
        sel = _IS_CLASS_RE.sub(lambda m: ALWAYS if _state_of(m.group(1)) in held else m.group(0), sel)
        sel = _BEM_STATE_RE.sub(lambda m: ALWAYS if _state_of(m.group(1)) in held else m.group(0), sel)

    def dynamic(m):
        return ALWAYS if _state_of(m.group(1)) in held else NEVER

    sel = _DYNAMIC_RE.sub(dynamic, sel)
    sel = re.sub(r':-(?:webkit|moz)-[\w-]+(?:\([^)]*\))?', NEVER, sel)
    return sel


_REQUIRED = {}
_FUNCTIONAL = re.compile(r':(?:not|is|where|has|nth-child|nth-last-child|host|host-context)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)')


def required_classes(sel: str) -> frozenset:
    """The classes an element (or its ancestors) must carry for the selector to match: every class outside a
    functional pseudo-class (:not, :is, :where, :has, :nth-child of). A page holding none of one of them cannot match."""
    got = _REQUIRED.get(sel)
    if got is None:
        bare = sel
        while True:
            nxt = _FUNCTIONAL.sub('', bare)
            if nxt == bare:
                break
            bare = nxt
        got = _REQUIRED[sel] = frozenset(re.findall(r'\.(-?[_a-zA-Z][\w-]*)', re.sub(r'\[[^\]]*\]', '', bare)))
    return got


class Cascade:
    def __init__(self, soup, rules: list, held=()):
        self.soup = soup
        self.rules = rules
        self.held = frozenset(held)
        self.errors = 0
        self.match = {}   # id(element) -> [rule]
        present = {c for el in soup.find_all(True) for c in (el.get('class') or [])}
        for r in rules:
            sel = resting(r.selector, self.held)
            if not required_classes(sel) <= present:
                continue  # a class the selector needs is on no element: the rule cannot match
            try:
                hits = sv.select(sel, soup)
            except Exception:
                self.errors += 1
                continue
            for el in hits:
                self.match.setdefault(id(el), []).append(r)

    PRESENTATION = ('fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity')

    def declared(self, el, pseudo, width, conditions=frozenset(), container=None):
        """Every declaration that applies to the element (or its pseudo-element) at this width, lowest priority first.
        An SVG presentation attribute is an author declaration of specificity 0 before every stylesheet; a style
        attribute beats every author rule."""
        rs = [r for r in self.match.get(id(el), []) if r.pseudo == pseudo and media_holds(r.media, width, conditions, container)]
        out = []
        if pseudo is None:
            for a in self.PRESENTATION:
                if el.has_attr(a):
                    out.append(((1, 0, (0, 0, 0), 0), a, str(el[a]), None))
            for d in (el.get('style') or '').split(';'):
                if ':' in d:
                    k, _, v = d.partition(':')
                    out.append(((1, 0, (1, 0, 0, 0), 10 ** 9), k.strip().lower(), v.strip(), None))
        for r in rs:
            for prop, value, imp in r.decls:
                # Priority: origin and importance band, then unlayered over layered (reversed for !important), then specificity, then order.
                band = (3 - r.origin) if imp else r.origin  # UA normal < author normal < author !important < UA !important
                layer = (0 if not r.layered else -1) if not imp else (1 if r.layered else 0)
                out.append(((band, layer, r.spec, r.order), prop, value, r))
        out.sort(key=lambda x: x[0])
        return out
