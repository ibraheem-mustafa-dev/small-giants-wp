#!/usr/bin/env python3
"""Flag every Custom CSS declaration for which the framework already has a setting on that block.

  python check-custom-css-has-setting.py --site <wsl-site-folder> [--out <dir>] [--strict]
  python check-custom-css-has-setting.py --site <wsl-site-folder> [--out <dir>] [--custom-css custom-css.json | --posts <export or folder>] [--emit-map emit-map.json] [--json out.json]
  python check-custom-css-has-setting.py --self-test

By default it reads <out>/posts-raw.json (export-custom-css.py writes it) and <out>/emit-map.json (build-emit-map.py writes it; without it only
the static routes run) and writes every finding to <out>/detector-results.json. <out> defaults to E:/sgs-tmp/render-check/census/<site>/.

A block's `sgsCustomCss` is split into rules and declarations. For each declaration the detector resolves which part of the block the
selector addresses and looks for a setting of that block that paints the same property on the same part, in this order:

  emit       the emit map (build-emit-map.py): the block was rendered with one setting changed at a time, so the map records the selector
             and property each setting really prints. Tier `confirmed`.
  table      woocommerce/cart and woocommerce/checkout: plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json, joined to the
             database's css_element (a row's element is its id with dashes, or its own `element`). Tier `confirmed`. A row that has no
             selector for this block is tier `inert`: the attribute exists on the block but prints nothing there.
  motion     a transform on a part that motion_targets lists, held by a motion_fields rest or hover field. Tier `confirmed` on the block root.
  recorded   block_attributes.derived_selector or block_selectors. Tier `likely` (these selectors are derived, not read from a render).
  name       block_attributes.css_element (or, where css_property is NULL, the attribute-name prefix with the property taken from
             property_suffixes) matched against the BEM element of the selector's subject class. Tier `likely`.
  property   the block has a setting for the property, but the part could not be resolved. Tier `candidate`.

Exit 1 when there is any `confirmed` or `likely` finding (`--strict` adds `candidate`). The database is opened read-only.
"""
import argparse
import glob
import json
import os
import re
import sqlite3
import sys
from collections import Counter, defaultdict

from census_common import REPO, add_site_args, resolve

sys.path.insert(0, os.path.join(REPO, 'plugins', 'sgs-blocks', 'scripts', 'lib'))
from framework_db import framework_db_path  # noqa: E402

DB = str(framework_db_path())
SELECTORS = 'plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json'
COMMERCE = {'woocommerce/cart': 'cart', 'woocommerce/checkout': 'checkout'}   # plugins/sgs-blocks/includes/woocommerce/commerce-look/writer.php::SGS_COMMERCE_LOOK_BLOCKS
TIER_WIDTHS = {768.0, 1024.0}   # Spec 32 FR-32-13; widened by whatever widths the emit map's settings print
TIERS = ('confirmed', 'likely', 'inert', 'candidate')
EMIT_MODE_SWITCH = 40   # an emit-map setting whose probe changed more rules than this switched a layout mode
EMIT_SHARED_MAX = 12    # an emit-map rule that more settings than this all change is scaffolding, not any one setting's output

# CSS knowledge (not framework knowledge): which longhands a shorthand sets.
SIDES = ('top', 'right', 'bottom', 'left')
SHORTHAND = {
    'padding': ['padding-' + s for s in SIDES], 'margin': ['margin-' + s for s in SIDES],
    'padding-inline': ['padding-left', 'padding-right'], 'padding-block': ['padding-top', 'padding-bottom'],
    'margin-inline': ['margin-left', 'margin-right'], 'margin-block': ['margin-top', 'margin-bottom'],
    'padding-inline-start': ['padding-left'], 'padding-inline-end': ['padding-right'], 'margin-inline-start': ['margin-left'], 'margin-inline-end': ['margin-right'],
    'padding-block-start': ['padding-top'], 'padding-block-end': ['padding-bottom'], 'margin-block-start': ['margin-top'], 'margin-block-end': ['margin-bottom'],
    'inset': list(SIDES), 'inset-inline': ['left', 'right'], 'inset-block': ['top', 'bottom'],
    'gap': ['row-gap', 'column-gap'], 'overflow': ['overflow-x', 'overflow-y'],
    'background': ['background-color', 'background-image'],
    'border-width': ['border-%s-width' % s for s in SIDES], 'border-style': ['border-%s-style' % s for s in SIDES], 'border-color': ['border-%s-color' % s for s in SIDES],
    'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
    'flex': ['flex-grow', 'flex-shrink', 'flex-basis'], 'flex-flow': ['flex-direction', 'flex-wrap'],
    'text-decoration': ['text-decoration-line', 'text-decoration-color', 'text-decoration-style', 'text-decoration-thickness'],
    'font': ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height'],
    'place-items': ['align-items', 'justify-items'], 'place-content': ['align-content', 'justify-content'], 'place-self': ['align-self', 'justify-self'],
    'grid-template': ['grid-template-columns', 'grid-template-rows', 'grid-template-areas'], 'grid-area': ['grid-row', 'grid-column'],
    'transition': ['transition-duration', 'transition-timing-function', 'transition-delay', 'transition-property'],
    'outline': ['outline-width', 'outline-style', 'outline-color'],
}
for _s in SIDES:
    SHORTHAND['border-' + _s] = ['border-%s-width' % _s, 'border-%s-style' % _s, 'border-%s-color' % _s]
SHORTHAND['border'] = [x for s in SIDES for x in SHORTHAND['border-' + s]]


def longhands(prop):
    prop = prop.strip().lower()
    out, todo = set(), [prop]
    while todo:
        p = todo.pop()
        if p in SHORTHAND:
            todo.extend(SHORTHAND[p])
        else:
            out.add(p)
    return out


# ----------------------------------------------------------------------------------------------- text splitting
def split_top(text, sep):
    """Split on `sep` outside brackets and quotes."""
    out, depth, quote, cur, i = [], 0, '', [], 0
    while i < len(text):
        ch = text[i]
        if quote:
            cur.append(ch)
            if ch == '\\' and i + 1 < len(text):
                i += 1
                cur.append(text[i])
            elif ch == quote:
                quote = ''
        elif ch in '"\'':
            quote = ch
            cur.append(ch)
        else:
            if ch in '([':
                depth += 1
            elif ch in ')]':
                depth -= 1
            if ch == sep and depth == 0:
                out.append(''.join(cur))
                cur = []
            else:
                cur.append(ch)
        i += 1
    out.append(''.join(cur))
    return out


def parse_rules(css, media=''):
    """Custom CSS text -> [{selector, declarations, media, text}]. A bare declaration is a rule on the block itself (`&`)."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    rules, pos, n = [], 0, len(css)
    while pos < n:
        depth, quote, i, brace = 0, '', pos, -1
        while i < n:
            ch = css[i]
            if quote:
                if ch == '\\':
                    i += 1
                elif ch == quote:
                    quote = ''
            elif ch in '"\'':
                quote = ch
            elif ch in '([':
                depth += 1
            elif ch in ')]':
                depth -= 1
            elif ch == '{' and depth == 0:
                brace = i
                break
            i += 1
        if brace < 0:
            bare = css[pos:].strip()
            if bare and ':' in bare:
                rules.append(dict(selector='&', declarations=bare, media=media, text=bare, bare=True))
            break
        prelude = css[pos:brace]
        if ';' in prelude and not prelude.lstrip().startswith('@'):
            head, _, prelude = prelude.rpartition(';')
            if head.strip():
                rules.append(dict(selector='&', declarations=head.strip() + ';', media=media, text=head.strip() + ';', bare=True))
        prelude = prelude.strip()
        depth, i, quote = 1, brace + 1, ''
        while i < n and depth:
            ch = css[i]
            if quote:
                if ch == '\\':
                    i += 1
                elif ch == quote:
                    quote = ''
            elif ch in '"\'':
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
            i += 1
        body = css[brace + 1:i - 1]
        text = css[pos:i].strip()
        pos = i
        if prelude.startswith('@'):
            if re.match(r'@(media|supports|container|layer)\b', prelude, re.I):
                rules.extend(parse_rules(body, (media + ' ' + re.sub(r'\s+', ' ', prelude)).strip()))
            else:
                rules.append(dict(selector=re.sub(r'\s+', ' ', prelude), declarations=body.strip(), media=media, text=text, at_rule=True))
            continue
        rules.append(dict(selector=re.sub(r'\s+', ' ', prelude), declarations=body.strip(), media=media, text=text))
    return rules


def parse_declarations(text):
    out = []
    for d in split_top(text, ';'):
        if ':' not in d:
            continue
        prop, _, value = d.partition(':')
        prop = prop.strip().lower()
        if prop:
            out.append((prop, value.strip()))
    return out


BLOCK_RE = re.compile(r'<!--\s+wp:([a-z0-9-]+(?:/[a-z0-9-]+)?)\s+(\{.*?\})\s+/?-->', re.S)


def records_from_posts(posts):
    """Exported posts -> one record per sgsCustomCss attribute (the custom-css.json shape, plus the block's other attributes)."""
    records = []
    for p in posts:
        for index, m in enumerate(BLOCK_RE.finditer(p.get('post_content') or '')):
            if 'sgsCustomCss"' not in m.group(2):
                continue
            try:
                attrs = json.loads(m.group(2))
            except ValueError:
                continue
            css = attrs.get('sgsCustomCss')
            if not isinstance(css, str) or not css.strip():
                continue
            name = m.group(1) if '/' in m.group(1) else 'core/' + m.group(1)
            rules = parse_rules(css)
            records.append(dict(post_id=str(p.get('ID')), post_type=p.get('post_type', ''), slug=p.get('post_name', ''), block=name, block_index=index,
                                className=attrs.get('className', ''), sgsCustomCssId=attrs.get('sgsCustomCssId', ''), chars=len(css), rule_count=len(rules), rules=rules,
                                attrs={k: v for k, v in attrs.items() if not k.startswith('sgsCustomCss')}))
    return records


def load_posts(path):
    if os.path.isdir(path):
        posts = []
        for f in sorted(glob.glob(os.path.join(path, '*'))):
            if f.endswith('.json'):
                data = json.load(open(f, encoding='utf-8'))
                posts.extend(data if isinstance(data, list) else [data])
            elif f.endswith(('.html', '.txt')):
                posts.append(dict(ID=os.path.splitext(os.path.basename(f))[0], post_content=open(f, encoding='utf-8').read()))
        return posts
    return json.load(open(path, encoding='utf-8'))


# ----------------------------------------------------------------------------------------------- selectors
class Compound:
    __slots__ = ('tag', 'classes', 'attrs', 'quals', 'pe', 'amp', 'states', 'comb')

    def __init__(self):
        self.tag, self.classes, self.attrs, self.quals, self.pe, self.amp, self.states, self.comb = '', set(), set(), [], '', False, set(), ' '

    def ident(self):
        return bool(self.tag or self.classes or self.attrs)

    def __repr__(self):
        return (self.tag + ''.join('.' + c for c in sorted(self.classes)) + ''.join(sorted(self.attrs)) + ''.join(self.quals) + self.pe) or '&'


TOKEN = re.compile(r'&selector|&|\*|::?[A-Za-z-]+(?:\((?:[^()]|\([^()]*\))*\))?|\.-?[_A-Za-z][\w-]*|#[\w-]+|\[[^\]]*\]|[A-Za-z][\w-]*')
PSEUDO_ELEMENTS = {'before', 'after', 'placeholder', 'marker', 'selection', 'first-line', 'first-letter', 'backdrop', 'file-selector-button'}


class States:
    """The states table: which selector tokens name a state (hover, focus, current, open, ...)."""

    def __init__(self, con):
        self.pseudo, self.cls, self.cls_suffix, self.attr = {}, {}, {}, []
        for state, family, kind, token in con.execute('select state, family, kind, token from states'):
            if family == 'environment' or kind == 'media':
                continue
            if kind == 'pseudo-class':
                self.pseudo[token.lstrip(':')] = state
            elif kind == 'class':
                (self.cls_suffix if token.startswith('--') else self.cls)[token] = state
            elif token.startswith('['):
                self.attr.append((re.sub(r'[\s"\']', '', token.rstrip(']')), state))

    def of_attr(self, attr):
        flat = re.sub(r'[\s"\']', '', attr)
        for token, state in self.attr:
            if flat.startswith(token):
                return state
        return None


def parse_compound(text, states):
    c = Compound()
    for tok in TOKEN.findall(text):
        if tok in ('&', '&selector'):
            c.amp = True
        elif tok == '*':
            pass
        elif tok.startswith('.'):
            name = tok[1:]
            if name in states.cls:
                c.states.add(states.cls[name])
            else:
                c.classes.add(name)
                for suffix, st in states.cls_suffix.items():
                    if name.endswith(suffix):
                        c.states.add(st)
        elif tok.startswith('#'):
            c.attrs.add(tok)
        elif tok.startswith('['):
            st = states.of_attr(tok)
            if st:
                c.states.add(st)
            else:
                c.attrs.add(re.sub(r'[\s"\']', '', tok))
        elif tok.startswith(':'):
            name = tok.lstrip(':').split('(')[0].lower()
            if tok.startswith('::') or name in PSEUDO_ELEMENTS:
                c.pe = '::' + name
            elif name in states.pseudo:
                c.states.add('focus-visible' if name == 'focus-visible' else states.pseudo[name])
            elif name in ('where', 'is') and '(' in tok:
                inner = parse_compound(tok[tok.index('(') + 1:-1], states)
                c.classes |= inner.classes
                c.tag = c.tag or inner.tag
            else:
                c.quals.append(re.sub(r'\s+', '', tok))
        else:
            c.tag = tok.lower()
    return c


def parse_selector(sel, states, scope_class=None):
    """One complex selector -> (ancestors [Compound], subject Compound, states) relative to the block root, or None.

    `scope_class` names the emitted instance scope (the emit map writes it as SGSUID); a Custom CSS selector uses `&` / `&selector`
    and is a descendant of the block when it names neither."""
    parts, depth, quote, cur, comb = [], 0, '', [], ' '
    for ch in sel.strip():
        if quote:
            cur.append(ch)
            if ch == quote:
                quote = ''
            continue
        if ch in '"\'':
            quote = ch
            cur.append(ch)
            continue
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if depth == 0 and ch in ' >+~':
            if cur:
                parts.append((comb, ''.join(cur)))
                cur, comb = [], ' '
            if ch != ' ':
                comb = ch
            continue
        cur.append(ch)
    if cur:
        parts.append((comb, ''.join(cur)))
    comps = []
    for comb, text in parts:
        c = parse_compound(text, states)
        c.comb = comb
        comps.append(c)
    if not comps:
        return None
    root_at, prefix = -1, []
    for i, c in enumerate(comps):
        if c.amp or (scope_class and scope_class in c.classes):
            root_at = i
    if root_at >= 0:
        root = comps[root_at]
        prefix = [repr(c) for c in comps[:root_at] if c.ident()]
        root.classes = {k for k in root.classes if k != scope_class and not k.startswith('wp-block-')}
        root.tag = ''
        comps = comps[root_at:]
        if not root.ident() and not root.quals and not root.pe and len(comps) > 1:
            lead_states = root.states
            comps = comps[1:]
            comps[0].states |= lead_states
        elif not root.ident():
            root.amp = True
    all_states = set()
    for c in comps:
        all_states |= c.states
    subject = comps[-1]
    is_root = len(comps) == 1 and not subject.ident() and not subject.pe and (root_at >= 0)
    return dict(anc=comps[:-1], subject=subject, states=all_states, root=is_root, prefix=prefix)


def sub(a, b):
    """Every simple selector of compound a is on compound b."""
    return (not a.tag or a.tag == b.tag) and a.classes <= b.classes and a.attrs <= b.attrs


def compat(a, b):
    return sub(a, b) or sub(b, a)


def states_fit(rule_states, setting_states):
    r = {'focus' if s == 'focus-visible' else s for s in rule_states}
    s = {'focus' if x == 'focus-visible' else x for x in setting_states}
    if not r and not s:
        return True
    if r == s:
        return True
    # SGS paints a hover setting on :hover and :focus-visible together (states table, hover row).
    if 'hover' in setting_states and rule_states and rule_states <= {'hover', 'focus-visible'}:
        return True
    return False


def relate(rule, setting, alias=None):
    """How a Custom CSS selector relates to a selector a setting prints: None, or 'same' / 'setting-broader' / 'setting-narrower' / 'overlap'.

    With `alias` (class -> the classes seen on the same element elsewhere in this block's selectors), a second pass accepts a setting whose
    classes the rule's element is known to carry too (`.totals-coupon__input` is also `.text-input`); it answers 'co-occurrence'."""
    found = _relate(rule, setting, compat)
    if found or not alias:
        return found

    def carries(e, c):   # every class the setting names is on the rule's element, directly or by co-occurrence
        known = set(c.classes)
        for k in c.classes:
            known |= alias.get(k, set())
        return (not e.tag or not c.tag or e.tag == c.tag) and bool(e.classes) and e.classes <= known and e.attrs <= c.attrs

    return 'co-occurrence' if _relate(rule, setting, lambda a, b: compat(a, b) or carries(b, a), strict_setting_path=True) else None


def _relate(rule, setting, same, strict_setting_path=False):
    cs, es = rule['subject'], setting['subject']
    if cs.pe != es.pe or not states_fit(rule['states'], setting['states']):
        return None
    if rule['root'] or setting['root']:
        if not (rule['root'] and setting['root']):
            return None
        broader, narrower = bool(set(cs.quals) - set(es.quals)) or bool(rule.get('prefix')), bool(set(es.quals) - set(cs.quals))
        return 'overlap' if broader and narrower else 'setting-broader' if broader else 'setting-narrower' if narrower else 'same'
    if cs.classes and es.classes:
        if not same(cs, es):
            return None
    elif cs.classes or es.classes:
        return None
    else:
        if cs.tag != es.tag or not (cs.attrs <= es.attrs or es.attrs <= cs.attrs):
            return None
        ca = next((a for a in reversed(rule['anc']) if a.classes), None)
        ea = next((a for a in reversed(setting['anc']) if a.classes), None)
        if (ca is None) != (ea is None) or (ca is not None and not same(ca, ea)):
            return None
        if ca is None and len(rule['anc']) != len(setting['anc']):
            return None
    c_un = [a for a in rule['anc'] if a.ident() and not any(same(a, e) for e in setting['anc'])]
    e_un = [a for a in setting['anc'] if a.ident() and not any(same(c, a) for c in rule['anc'])]
    if any(a.classes for a in c_un) and any(a.classes for a in e_un):
        return None   # each names an ancestor the other does not: different places
    if strict_setting_path and any(a.classes for a in e_un):
        return None
    # The rule is the narrower one when it names an ancestor, class, structural condition (:empty, :not(..)) or page (body.x) the setting does not.
    broader = bool(c_un) or cs.classes > es.classes or bool(set(cs.quals) - set(es.quals)) or bool(rule.get('prefix'))
    narrower = bool(e_un) or es.classes > cs.classes or bool(set(es.quals) - set(cs.quals))
    if broader and narrower:
        return 'overlap'
    return 'setting-broader' if broader else 'setting-narrower' if narrower else 'same'


def media_widths(media):
    return [float(x) for x in re.findall(r'(?:min|max)-width\s*:\s*([\d.]+)px', media or '')]


# ----------------------------------------------------------------------------------------------- the framework's settings
def norm_name(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


class Framework:
    def __init__(self, db=DB, repo=REPO, emit_map=None):
        self.con = sqlite3.connect('file:%s?mode=ro' % db.replace('\\', '/'), uri=True)
        self.states = States(self.con)
        self.suffixes = sorted([(s, p) for s, p in self.con.execute('select suffix, css_property from property_suffixes') if p and re.fullmatch(r'[a-z-]+', p)], key=lambda x: -len(x[0]))
        self.modifiers = {s: k for s, k in self.con.execute('select suffix, kind from modifier_suffixes')}
        table = json.load(open(os.path.join(repo, SELECTORS), encoding='utf-8'))
        self.rows, self.columns = table['rows'], table['columns']
        self.emit = emit_map or {}
        self.tier_widths = set(TIER_WIDTHS)
        for block in self.emit.values():
            for a in (block.get('attrs') or {}).values():
                for media, *_ in a['rules']:
                    for w in media_widths(media):
                        self.tier_widths.add(round(w))
        self._cache = {}
        self.motion_blocks = {b for (b,) in self.con.execute('select distinct block_slug from motion_targets')}

    def attrs(self, block):
        return self.con.execute('select attr_name, css_property, css_element, css_state, css_tier, derived_selector, is_responsive, tier_shape, attr_type from block_attributes where block_slug=?', (block,)).fetchall()

    def attr_props(self, block):
        """attribute -> the longhands the database (css_property, else the property_suffixes table) says it drives."""
        key = ('props', block)
        if key not in self._cache:
            out = {}
            for attr, prop, *_ in self.attrs(block):
                if not prop:
                    derived = self.property_of(attr)
                    prop = derived[0] if derived else None
                if prop and re.fullmatch(r'[a-z-]+', prop):
                    out[attr] = longhands(prop)
            self._cache[key] = out
        return self._cache[key]

    def switches(self, block):
        return {n for (n,) in self.con.execute("select attr_name from block_attributes where block_slug=? and attr_type='boolean'", (block,))}

    def property_of(self, name):
        """A setting's CSS property from its name, by the property_suffixes table: (property, name prefix, state, per-device)."""
        state, tiered, base = None, False, name
        changed = True
        while changed:
            changed = False
            for mod, kind in self.modifiers.items():
                if base.endswith(mod) and len(base) > len(mod) and kind in ('state', 'breakpoint', 'unit'):
                    if kind == 'unit':
                        return None
                    base = base[:-len(mod)]
                    state = mod.lower() if kind == 'state' else state
                    tiered = tiered or kind == 'breakpoint'
                    changed = True
        for suffix, prop in self.suffixes:
            if base.endswith(suffix) and len(base) > len(suffix):
                return prop, base[:-len(suffix)], state, tiered
        return None

    def settings(self, block):
        """Every (attribute, property, selector-or-name) the framework records for a block, by resolution method."""
        if block in self._cache:
            return self._cache[block]
        out = []   # dict(attr, props:set, method, sel (parsed) | element (name), state, per_device, note)
        which = COMMERCE.get(block)
        em = self.emit.get(block, {})
        emitted = set()
        shared = Counter((m, sel, p) for info in (em.get('attrs') or {}).values() for m, sel, p, *_ in info['rules'])
        for attr, info in (em.get('attrs') or {}).items():
            if info.get('total', 0) > EMIT_MODE_SWITCH:
                continue   # the probe value switched a mode (dozens of rules changed): not a property setting, left to the static routes
            # per device: the setting printed a tier media query, or it took a {desktop, tablet, mobile} probe value
            per_device = any(media_widths(m) for m, *_ in info['rules']) or (isinstance(info.get('value'), dict) and 'desktop' in info['value'])
            leaves = probe_leaves(info.get('value'))
            for media, selector, prop, value, sign in info['rules']:
                if media and not media_widths(media):
                    continue   # a reduced-motion or hover-capability twin of the same rule
                if shared[(media, selector, prop)] > EMIT_SHARED_MAX:
                    continue   # a scaffold rule the block prints once any of many settings is set
                for one in split_top(selector, ','):
                    parsed = parse_selector(one, self.states, 'SGSUID')
                    if parsed:
                        out.append(dict(attr=attr, props=longhands(prop), method='emit', sel=parsed, sel_text=one.strip(), per_device=per_device, value=value,
                                        fixed=sign != '-' and not any(leaf in value for leaf in leaves)))
                        emitted.add(attr)
        rows_by_element = defaultdict(list)
        for rid, row in self.rows.items():
            rows_by_element[row.get('element') or rid.replace('_', '-')].append((rid, row))
        for attr, prop, element, state, tier, derived, responsive, tier_shape, atype in self.attrs(block):
            per_device = bool(responsive) or tier_shape == 'tier_object'
            derived_prop = None
            if not prop:
                derived_prop = self.property_of(attr)
                if not derived_prop:
                    continue
                prop, prefix, dstate, dtier = derived_prop
                element, state, per_device = element or prefix, state or dstate, per_device or dtier
            if not re.fullmatch(r'[a-z-]+', prop):
                continue
            props = longhands(prop)
            if which and element in rows_by_element:
                for rid, row in rows_by_element[element]:
                    here = row.get(which)
                    other = row.get('checkout' if which == 'cart' else 'cart')
                    if here and attr in emitted:
                        continue   # the render already says where this setting prints on this block (a mode such as sgsSummaryWrapsButton can move it)
                    for one in split_top(here or other or '', ','):
                        one = one.strip()
                        parsed = parse_selector('& ' + one if one != '&' else '&', self.states)
                        if parsed:
                            out.append(dict(attr=attr, props=props, method='table' if here else 'table-other-block', sel=parsed, sel_text=one, per_device=per_device, row=rid, state=state))
                continue
            if attr in emitted:
                continue   # the render already says where this setting prints
            for one in split_top(derived or '', ','):
                parsed = parse_selector('& ' + one.strip(), self.states) if one.strip() else None
                if parsed:
                    out.append(dict(attr=attr, props=props, method='recorded', sel=parsed, sel_text=one.strip(), per_device=per_device, state=state))
            if element:
                out.append(dict(attr=attr, props=props, method='name' if not derived_prop else 'name-suffix', element=element, per_device=per_device, state=state))
            out.append(dict(attr=attr, props=props, method='property', per_device=per_device, state=state))
        for element, selector in self.con.execute('select element, selector from block_selectors where block_slug=?', (block,)):
            pass   # block_selectors holds the root class and one typography selector per block: no attribute to name
        self._cache[block] = out
        return out

    def motion(self, block, parsed, prop, value):
        """A transform the Motion panel holds: motion_targets has the part, motion_fields has a rest or hover field for the function."""
        if block not in self.motion_blocks:
            return []
        targets = self.con.execute('select target, css_element, kind from motion_targets where block_slug=?', (block,)).fetchall()
        target = None
        if parsed['root']:
            target = next((t for t, e, k in targets if k == 'root'), None)
        else:
            for t, e, k in targets:
                if e.startswith('.'):
                    es = parse_selector('& ' + e, self.states)
                    if es and relate(dict(parsed, states=set()), es):
                        target = t
                elif norm_name(e) in {norm_name(x) for x in element_names(parsed['subject'])}:
                    target = t
        if not target:
            return []
        want = 'hover' if parsed['states'] & {'hover', 'focus-visible', 'focus'} else 'rest'
        # `transform: rotate(..)` and the single-function properties `rotate` / `scale` / `translate` name a transform function; any other
        # property matches a motion field only when the field records that very property (transform-origin).
        functions = [f.lower() for f in re.findall(r'([A-Za-z]+)\(', value)] if prop == 'transform' else [prop] if prop in ('rotate', 'scale', 'translate') else []
        found = []
        for field, fprop, state in self.con.execute("select field, css_property, state from motion_fields where def_name='HoverStateValues' and state=?", (want,)):
            bare = field[4:] if want == 'rest' and field.startswith('rest') else field
            if bare.lower() in functions or (fprop and fprop == prop):
                found.append('sgsMotion.elements.%s.hover.%s' % (target, field))
        return found


def probe_leaves(value):
    """The scalar values inside a probe value ('7px' in {desktop: {top: '7px'}}), as text; a boolean has none."""
    if isinstance(value, bool) or value is None:
        return []
    if isinstance(value, dict):
        return [x for v in value.values() for x in probe_leaves(v)]
    if isinstance(value, list):
        return [x for v in value for x in probe_leaves(v)]
    return [str(value)]


def functions_of(value):
    return {f.lower() for f in re.findall(r'([A-Za-z][A-Za-z0-9-]*)\(', value)} - {'var', 'calc', 'min', 'max', 'clamp', 'env'}


def saved_state(saved, wanted):
    """Is the setting already saved on this block, and to the rule's value? 'unset', 'same' or 'different' (a text comparison of the value's tokens)."""
    if saved is None:
        return 'unset'
    text = json.dumps(saved, ensure_ascii=False).lower()
    tokens = re.findall(r'--(?:color|font-family|font-size|spacing|shadow)--([a-z0-9-]+)|(-?\d*\.?\d+)[a-z%]*|([a-z][a-z-]+)', re.sub(r'var\(--wp--preset', '', wanted.lower()))
    for slug, number, word in tokens:
        if slug and slug not in text:
            return 'different'
        if number and not re.search(r'(?<![\d.])' + re.escape(number.lstrip('0') or '0') + r'(?![\d.])', text.replace('"0', '"').replace(' 0.', ' .')) and not re.search(r'(?<![\d.])' + re.escape(number) + r'(?![\d.])', text):
            return 'different'
        if word and word not in ('var', 'solid', 'none', 'px') and not slug and not number and word not in text:
            return 'different'
    return 'same'


def element_names(compound):
    """The element names a subject compound could be: each class's BEM element, with and without its modifier."""
    names = set()
    for cls in compound.classes:
        base = cls.split('--')[0]
        names.add(base.split('__', 1)[1] if '__' in base else base)
        if '__' in cls:
            names.add(cls.split('__', 1)[1])
    return names


# ----------------------------------------------------------------------------------------------- the check
def check(records, fw):
    findings = []
    for rec in records:
        block = rec['block']
        settings = fw.settings(block)
        switches = fw.switches(block)
        alias = defaultdict(set)
        compounds = [c for s in settings if 'sel' in s for c in s['sel']['anc'] + [s['sel']['subject']]]
        for r2 in records:
            if r2['block'] == block:
                for rule in r2['rules']:
                    if not rule.get('at_rule'):
                        for one in split_top(rule['selector'], ','):
                            parsed = parse_selector(one, fw.states)
                            if parsed:
                                compounds.extend(parsed['anc'] + [parsed['subject']])
        for c in compounds:
            for k in c.classes:
                alias[k] |= c.classes - {k}
        for ri, rule in enumerate(rec['rules']):
            if rule.get('at_rule'):
                continue
            widths = media_widths(rule['media'])
            media_fit = '' if not rule['media'] else ('tier' if widths and all(round(w) in fw.tier_widths or round(w + 0.02) in fw.tier_widths or round(w) + 1 in fw.tier_widths for w in widths) else 'off-tier' if widths else 'no-width')
            parsed_list = [(s.strip(), parse_selector(s, fw.states)) for s in split_top(rule['selector'], ',')]
            for prop, value in parse_declarations(rule['declarations']):
                if prop.startswith('--'):
                    continue
                want = longhands(prop)
                best = {}   # attr -> (tier rank, detail)
                for sel_text, parsed in parsed_list:
                    if not parsed:
                        continue
                    names = {norm_name(n) for n in element_names(parsed['subject'])}
                    for m in fw.motion(block, parsed, prop, value):
                        best.setdefault(m, (0 if parsed['root'] else 1, dict(method='motion', relation='same', selector=sel_text)))
                    for s in settings:
                        if not (want & s['props']):
                            continue
                        method = s['method']
                        if 'sel' in s:
                            if method == 'emit' or s['sel']['states'] or not s.get('state'):
                                rel = relate(parsed, s['sel'], alias)
                            else:
                                rel = relate(dict(parsed, states=set()), s['sel'], alias) if states_fit(parsed['states'], {s['state']}) else None
                            if not rel:
                                continue
                            tier = 1 if rel == 'co-occurrence' and method in ('emit', 'table') else {'emit': 0, 'table': 0, 'table-other-block': 2, 'recorded': 1}[method]
                            detail = dict(method=method, relation=rel, setting_selector=s['sel_text'], selector=sel_text)
                            seen, wanted = s.get('value', ''), value.strip()
                            if method == 'emit' and prop == 'transform' and functions_of(seen) and functions_of(wanted) and not (functions_of(seen) & functions_of(wanted)):
                                # the setting drives another transform function (a scale where the rule moves): same property, a different thing
                                tier, detail['value_note'] = 3, "the setting prints %s; the rule wants %s" % (seen[:40], wanted[:40])
                            elif method == 'emit' and s.get('fixed') and seen != wanted:
                                # The printed value did not come from the probe value: a switch, or a side effect of the setting.
                                keywords = re.fullmatch(r'[a-z-]+', wanted) and re.fullmatch(r'[a-z-]+', seen)
                                tier = 3 if keywords else max(tier, 1)
                                detail['value_note'] = "the setting prints the fixed value '%s'; the rule wants '%s'" % (seen[:40], wanted[:40])
                            if s.get('row'):
                                detail['row'] = s['row']
                        elif method in ('name', 'name-suffix'):
                            if not states_fit(parsed['states'], {s['state']} if s.get('state') else set()):
                                continue
                            el = norm_name(s['element'])
                            if parsed['root']:
                                if el not in ('wrapper', 'root') or parsed['subject'].quals or parsed.get('prefix'):
                                    continue
                            elif parsed['subject'].pe or el not in names:
                                continue
                            tier, detail = 1, dict(method=method, relation='name' if not parsed.get('prefix') else 'name, but the rule applies only under ' + ' '.join(parsed['prefix']), element=s['element'], selector=sel_text)
                        else:
                            if not states_fit(parsed['states'], {s['state']} if s.get('state') else set()):
                                continue
                            tier, detail = 3, dict(method='property', relation='unresolved', selector=sel_text)
                        detail['per_device'] = s['per_device']
                        if s['attr'] in switches:
                            detail['kind'] = 'switch: turns the property on or off, the value comes from elsewhere'
                        detail['covers'] = 'all' if want <= s['props'] else 'part'
                        if s['attr'] not in best or best[s['attr']][0] > tier:
                            best[s['attr']] = (tier, detail)
                if not best:
                    continue
                top = min(t for t, _ in best.values())
                keep = [(a, d) for a, (t, d) in best.items() if t == top]
                agree = [(a, d) for a, d in keep if want & fw.attr_props(block).get(a, set())]
                if agree and top != 3:
                    keep = agree
                if top == 3:
                    keep = keep[:4]
                per_device = any(d.get('per_device') for _, d in keep)
                findings.append(dict(post_id=rec['post_id'], block=block, cssId=rec.get('sgsCustomCssId', ''), className=rec.get('className', ''), rule_index=ri,
                                     selector=rule['selector'], media=rule['media'], declaration='%s:%s' % (prop, value), tier=TIERS[top],
                                     media_fit=media_fit if not rule['media'] else (media_fit if media_fit != 'tier' else ('tier' if per_device else 'tier-but-setting-not-per-device')),
                                     settings=[dict(attr=a, **d, **({'saved_value': json.dumps(rec['attrs'][a], ensure_ascii=False)[:120], 'saved': saved_state(rec['attrs'][a], value)} if a in rec.get('attrs', {}) else {'saved': 'unset'} if 'attrs' in rec else {})) for a, d in sorted(keep)]))
    return findings


def summarise(findings, records, strict=False):
    lines = []
    per_post = defaultdict(Counter)
    for f in findings:
        per_post[f['post_id']][f['tier']] += 1
    totals = Counter(f['tier'] for f in findings)
    rules = sum(len(r['rules']) for r in records)
    decls = sum(len(parse_declarations(ru['declarations'])) for r in records for ru in r['rules'] if not ru.get('at_rule'))
    lines.append('%d records, %d rules, %d declarations read' % (len(records), rules, decls))
    lines.append('post       ' + '  '.join('%-9s' % t for t in TIERS))
    for post in sorted(per_post, key=lambda p: (len(p), p)):
        lines.append('%-10s ' % post + '  '.join('%-9d' % per_post[post][t] for t in TIERS))
    lines.append('%-10s ' % 'total' + '  '.join('%-9d' % totals[t] for t in TIERS))
    rule_keys = {t: len({(f['post_id'], f['cssId'], f['className'], f['rule_index']) for f in findings if f['tier'] == t}) for t in TIERS}
    lines.append('rules with at least one finding: ' + ', '.join('%s %d' % (t, rule_keys[t]) for t in TIERS))
    saved = Counter(s2.get('saved', 'not read (give --posts)') for f in findings if f['tier'] in ('confirmed', 'likely') for s2 in f['settings'][:1])
    lines.append('confirmed or likely findings by the first named setting\'s saved state on that block: ' + ', '.join('%s %d' % kv for kv in sorted(saved.items())))
    off = sum(1 for f in findings if f['tier'] in ('confirmed', 'likely') and f['media_fit'] not in ('', 'tier'))
    if off:
        lines.append('%d confirmed or likely findings sit in a media query the per-device setting cannot hold as written (see media_fit)' % off)
    failing = totals['confirmed'] + totals['likely'] + (totals['candidate'] if strict else 0)
    return '\n'.join(lines), failing


# ----------------------------------------------------------------------------------------------- self-test
def self_test(fw):
    """One planted positive per route that needs no emit map, and planted negatives. Fails (exit 2) if any plant is misjudged."""
    def rec(block, css):
        return dict(post_id='plant', block=block, sgsCustomCssId='plant', className='', rules=parse_rules(css))
    plants = [
        ('positive: the commerce-look table holds the checkout tick-box label size', rec('woocommerce/checkout', '&selector .wc-block-components-checkbox__label{font-size:15px}'), 'confirmed', 'sgsCheckboxLabelFontSize'),
        ('positive: a named part of an SGS block', rec('sgs/buybox', '& .sgs-buybox__bar .buybox__add-to-cart{min-height:52px}'), 'likely', 'addToCartMinHeight'),
        ('positive: a shorthand against a longhand setting, inside a tier media query', rec('woocommerce/checkout', '@media (max-width:767.98px){&selector .wc-block-components-checkout-step{padding-left:4px}}'), 'confirmed', 'sgsStepPadding'),
        ('negative: a part no setting names, a property no setting holds', rec('woocommerce/checkout', '&selector .zz-not-a-part{caret-shape:block}'), None, None),
        ('negative: a real part, a property no setting holds for it', rec('woocommerce/checkout', '&selector .wc-block-components-checkbox__label{caret-color:red}'), None, None),
        ('negative: a real property, a different part (coupon button text is not the place-order text)', rec('woocommerce/checkout', '&selector .wc-block-components-totals-coupon__button .wc-block-components-button__text{width:10px}'), 'not-confirmed', 'sgsPlaceOrderTextWidth'),
        ('negative: the cart has no selector for the totals wrapper row, so the attribute is inert there', rec('woocommerce/cart', '&selector .wc-block-components-totals-wrapper{padding:8px 0}'), 'inert', 'sgsTotalsWrapperPadding'),
    ]
    bad = 0
    for label, record, tier, attr in plants:
        found = check([record], fw)
        hits = [(f['tier'], s['attr']) for f in found for s in f['settings']]
        if tier is None:
            ok = not any(t in ('confirmed', 'likely') for t, _ in hits)
        elif tier == 'not-confirmed':
            ok = not any(t in ('confirmed', 'likely') and a == attr for t, a in hits)
        else:
            ok = (tier, attr) in hits
        print(('PASS  ' if ok else 'FAIL  ') + label + ('' if ok else '   got ' + repr(hits[:6])))
        bad += 0 if ok else 1
    rules = parse_rules('a{b:c}\n@media (min-width:768px){& x{d:e;f:g}}\n/* note */&selector{h:i}\n@keyframes k{0%{j:k}100%{j:l}}')
    ok = [r['selector'] for r in rules] == ['a', '& x', '&selector', '@keyframes k'] and rules[1]['media'] == '@media (min-width:768px)'
    print(('PASS  ' if ok else 'FAIL  ') + 'parser: rules, a media wrapper, a comment and a keyframes block')
    bad += 0 if ok else 1
    print('self-test: %s' % ('ok' if not bad else '%d FAILED' % bad))
    return 0 if not bad else 2


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--custom-css', help='custom-css.json (records[] with rules[])')
    ap.add_argument('--posts', help='posts-raw.json from export-posts.php, or a folder of exported post content')
    add_site_args(ap, site_required=False)
    ap.add_argument('--emit-map', help='emit-map.json from build-emit-map.py (default: <out>/emit-map.json, if present)')
    ap.add_argument('--no-emit-map', action='store_true')
    ap.add_argument('--json', help='write every finding here (default: <out>/detector-results.json)')
    ap.add_argument('--strict', action='store_true', help='candidate findings fail too')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--db', default=DB)
    ap.add_argument('--repo', default=REPO)
    a = ap.parse_args()
    if a.self_test:
        return self_test(Framework(a.db, a.repo, None))
    if not a.site:
        ap.error('--site is required (except with --self-test)')
    out_dir = resolve(a)
    default_emit = os.path.join(out_dir, 'emit-map.json')
    emit_path = None if a.no_emit_map else (a.emit_map or (default_emit if os.path.exists(default_emit) else None))
    emit = json.load(open(emit_path, encoding='utf-8')) if emit_path else None
    fw = Framework(a.db, a.repo, emit)
    if not a.posts and not a.custom_css:
        a.posts = os.path.join(out_dir, 'posts-raw.json')
    if a.posts:
        records = records_from_posts(load_posts(a.posts))
    elif a.custom_css:
        records = json.load(open(a.custom_css, encoding='utf-8'))['records']
    else:
        ap.error('give --custom-css, --posts or --self-test')
    findings = check(records, fw)
    text, failing = summarise(findings, records, a.strict)
    print('emit map: %s' % (emit_path or 'none (static routes only)'))
    print(text)
    json_path = a.json or os.path.join(out_dir, 'detector-results.json')
    json.dump(dict(emit_map=emit_path, counts=Counter(f['tier'] for f in findings), findings=findings), open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('findings: %s' % json_path)
    return 1 if failing else 0


if __name__ == '__main__':
    sys.exit(main())
