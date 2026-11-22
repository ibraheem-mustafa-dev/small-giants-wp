"""What one setting changes: a plain render and a changed render of the same block compared, as placements.

A placement is (part, props, state, tiers) plus how it was found:
  run-css         a rule the block prints changed
  run-var         a custom property the block prints changed; every rule reading it (through relays) is placed
  run-style(-var) an inline style changed (a property, or a custom property read by a stylesheet)
  run-class(-var) a class appeared or went; every rule naming it is placed
  run-data        a data attribute changed; every rule naming it is placed
Rules come from the CSS the render prints and from the front-end stylesheets of the block, its rendered children, the
blocks those children belong in (block.json parent/ancestor), src/shared and assets/css.
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'block-source-scan'))
from css_read import split_top  # noqa: E402
from selector_eval import analyse_selector  # noqa: E402

UID_RE = re.compile(r'\b([a-z][a-z0-9-]*?-[0-9a-f]{8})\b')
PROP_RE = re.compile(r'-{0,2}[a-z][a-z0-9-]*')
EXCLUDED_SHEET = re.compile(r'editor|admin|inspector')


# ---------------------------------------------------------------- CSS reading
def read_css(text: str, media: str = '', out: list | None = None, parent: str | None = None) -> list:
    """Every (selector list, declarations, at-rule) in a stylesheet. Nested rules are unrolled at any depth: a nested
    selector joins its parent (`&` replaced, else a descendant), and an at-rule nested inside a rule keeps its condition
    for the declarations inside it. Each at-rule a rule sits in is a condition (joined by TIER_SEP, outermost first);
    @keyframes, @font-face and the other at-rules that hold no element's style are skipped. For flat CSS and one level of selector
    nesting the output equals block-source-scan/css_read.py::parse_css."""
    out = [] if out is None else out
    text = re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)
    i, n = 0, len(text)
    while i < n:
        b = text.find('{', i)
        if b < 0:
            break
        header = text[i:b].strip()
        if ';' in header:
            # Statements before the block (an @import, or a parent's own declarations ahead of a nested rule).
            header = header[header.rindex(';') + 1:].strip()
        if header.startswith('}'):
            header = header.lstrip('}').strip()
        depth, j = 1, b + 1
        while j < n and depth:
            depth += {'{': 1, '}': -1}.get(text[j], 0)
            j += 1
        body = text[b + 1:j - 1]
        if header.startswith('@'):
            if NON_STYLE_AT.match(header):
                i = j
                continue
            cond = f'{media}{TIER_SEP}{header}' if media else header
            if parent is None:
                read_css(body, cond, out)
            else:
                own = _own_decls(body)
                if own.strip():
                    out.append((parent, own, cond))
                read_css(body, cond, out, parent)
        elif header:
            full = header if parent is None else _join(parent, header)
            if '{' in body:
                out.append((full, _own_decls(body), media))
                read_css(body, media, out, full)
            else:
                out.append((full, body, media))
        i = j
    return out


def _own_decls(body: str) -> str:
    """A rule body's own declarations, nested blocks removed."""
    out, depth, cur = [], 0, ''
    for ch in body:
        if ch == '{':
            if depth == 0:
                # the text since the last ';' is the nested block's header, not a declaration
                cur = cur[:cur.rfind(';') + 1] if ';' in cur else ''
            depth += 1
        elif ch == '}':
            depth -= 1
        elif depth == 0:
            cur += ch
    out.append(cur)
    return ''.join(out)


def _join(parent: str, sel: str) -> str:
    """A nested selector list joined to its parent's list: every pair, `&` replaced by the parent, else a descendant."""
    out = []
    for p in split_top(parent):
        p = p.strip()
        for one in split_top(sel):
            one = one.strip()
            if one:
                out.append(one.replace('&', p) if '&' in one else f'{p} {one}')
    return ', '.join(out)


# At-rules that hold no style rules for an element: their blocks are skipped whole.
NON_STYLE_AT = re.compile(r'@(?:-webkit-|-moz-)?(?:keyframes|font-face|page|property|counter-style|font-feature-values|font-palette-values|view-transition|position-try|import|namespace|charset)\b', re.I)
# The joiner between two at-rule conditions a rule sits in (one inside the other): each becomes its own tier.
TIER_SEP = ' &&& '


def tiers_of(media: str) -> list:
    """The tiers a read_css condition string stands for: one per at-rule it sits in, outermost first."""
    return [t.strip() for t in media.split(TIER_SEP.strip()) if t.strip()] if media else []


def decls_of(body: str):
    for d in re.split(r';(?![^(]*\))', body):
        if ':' not in d:
            continue
        p, _, v = d.partition(':')
        p = p.strip().lower()
        if p:
            yield p, v.strip()


# ---------------------------------------------------------------- one render
class Tree(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.els, self.rootkids = [], [], {}

    def handle_starttag(self, tag, attrs):
        if tag == 'style':
            return
        a = dict(attrs)
        classes = (a.get('class') or '').split()
        parts = sorted(c for c in classes if c.startswith('sgs-') and '--' not in c and not UID_RE.fullmatch(c))
        sig = tag + '.' + '.'.join(parts)
        parent = self.stack[-1] if self.stack else None
        counts = parent['kids'] if parent else self.rootkids
        k = counts.get(sig, 0)
        counts[sig] = k + 1
        path = (parent['path'] + ' > ' if parent else '') + f'{sig}[{k}]'
        el = {'path': path, 'tag': tag, 'classes': classes, 'attrs': a, 'kids': {}}
        self.els.append(el)
        if tag not in self.VOID and not tag.endswith('/'):
            self.stack.append(el)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1]['tag'] == tag and tag not in self.VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag == 'style':
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                break


def uid_map(html: str, short: str) -> dict:
    """Each instance-id token -> the block class of the element carrying it (stable across renders)."""
    m = {}
    first = re.search(r'<(?!style)[a-z][^>]*>', re.sub(r'<style.*?</style>', '', html, flags=re.S))
    for tok in UID_RE.findall(first.group(0) if first else ''):
        m[tok] = f'sgs-{short}'
    for el in re.finditer(r'<[a-z][^>]*>', html):
        t = el.group(0)
        toks = UID_RE.findall(t)
        if not toks:
            continue
        cls = re.search(r'class="([^"]*)"', t)
        blocks = [c for c in (cls.group(1).split() if cls else []) if c.startswith('sgs-') and '__' not in c and '--' not in c and not UID_RE.fullmatch(c)]
        for tok in toks:
            if tok not in m:
                m[tok] = blocks[0] if blocks else f'sgs-{short}'
    return m


def read(res: dict, short: str):
    """(rules {(at-rule, selector, prop): value}, elements {path: {classes, attrs}}) of one render, instance ids
    replaced by the class of the block carrying them so two renders compare."""
    html = res.get('html', '')
    um = uid_map(html, short)
    css = res.get('css', '')
    for t in re.finditer(r'<[a-z][^>]*>', html):
        cm = re.search(r'class="([^"]*)"', t.group(0))
        cl = cm.group(1).split() if cm else []
        own = [c for c in cl if c.startswith('sgs-') and '--' not in c and not UID_RE.search(c)]
        for c in cl:
            if UID_RE.search(c) and not UID_RE.fullmatch(c) and c not in um:
                um[c] = own[0] if own else f'sgs-{short}'
    for tok, cls in sorted(um.items(), key=lambda x: -len(x[0])):
        css = re.sub(r'([.#])' + re.escape(tok) + r'(?![\w-])', '.' + cls, css)
    css = re.sub(r'(sgs-[a-z0-9-]+?)-[0-9a-f]{8}(?=-[a-z])', r'\1', css)  # a uid-scoped part the markup does not carry (drawn outside the block)
    rules = {}
    for sel, body, media in read_css(css):
        for p, v in decls_of(body):
            for s in split_top(sel):
                rules[(media.strip(), s.strip(), p)] = v
    t = Tree()
    t.feed(re.sub(r'<style\b.*?</style>', '', html, flags=re.S))
    els = {}
    for el in t.els:
        cl = [('UID' if UID_RE.fullmatch(c) else c) for c in el['classes']]
        at = {k: (v or '') for k, v in el['attrs'].items() if k.startswith('data-') or k in ('style', 'hidden', 'aria-hidden', 'aria-expanded', 'open', 'role', 'type')}
        at = {k: UID_RE.sub('UID', v) for k, v in at.items()}
        els[el['path']] = {'classes': set(cl), 'attrs': at}
    return rules, els


# ---------------------------------------------------------------- static stylesheets
def sheet_files(plugin: Path, short: str, children) -> list:
    """The front-end stylesheets a render of the block loads: its own and its rendered children's, those of any block a
    child belongs in (block.json parent / ancestor), src/shared and assets/css."""
    blocks_dir = plugin / 'src' / 'blocks'
    names = {short, *children}
    for c in list(children):
        bj = blocks_dir / c / 'block.json'
        if bj.is_file():
            meta = json.loads(bj.read_text(encoding='utf-8'))
            names |= {n.split('/', 1)[1] for n in (meta.get('parent') or []) + (meta.get('ancestor') or []) if n.startswith('sgs/')}
    files = []
    for b in sorted(names):
        d = blocks_dir / b
        if d.is_dir():
            files += [f for f in d.rglob('*.css') if 'editor' not in f.name]
    files += [f for f in (plugin / 'src' / 'shared').rglob('*.css') if 'editor' not in f.name]
    files += [f for f in (plugin / 'assets' / 'css').glob('*.css') if not EXCLUDED_SHEET.search(f.name)]
    return sorted(set(files))


def static_rules(plugin: Path, short: str, children) -> list:
    """(selector, prop, value, at-rule, file) of every declaration in the block's front-end stylesheets."""
    out = []
    for f in sheet_files(plugin, short, children):
        for sel, body, media in read_css(f.read_text(encoding='utf-8', errors='ignore')):
            for p, v in decls_of(body):
                if re.fullmatch(r'-{0,2}[a-z][a-z0-9-]*', p):
                    for s in split_top(sel):
                        out.append((s.strip(), p, v, media.strip(), f.relative_to(plugin).as_posix()))
    return out


def var_consumers(name, rules, seen=None):
    """Every (selector, prop, at-rule, source) whose value reads var(--name), through custom properties that relay it."""
    seen = set() if seen is None else seen
    if name in seen:
        return []
    seen.add(name)
    pat = re.compile(r'var\(\s*' + re.escape(name) + r'\s*[,)]')
    out = []
    for sel, p, v, media, src in rules:
        if pat.search(v):
            if p.startswith('--'):
                out += [(s2, p2, m2 or media, src2) for s2, p2, m2, src2 in var_consumers(p, rules, seen)]
            else:
                out.append((sel, p, media, src))
    return out


def live_consumers(name, allrules, rm, em, short, changed=frozenset()):
    """var_consumers kept only where the consumer's element is drawn in the changed render and no other block in it
    re-sets the same custom property on itself (a child block's own default shadows the inherited value). A rule in
    `changed` (the setting moved it) is the value's source, never a shadow: a helper part outside the block's class
    (the scrim, `.sgs-scrim`) that the setting writes the property onto passes it to its own consumers."""
    drawn = {c for e in em.values() for c in e['classes']}
    shadow = set()
    for (m, sel, p), v in rm.items():
        if p == name and (m, sel, p) not in changed:
            part, _, _ = analyse_selector(sel, short)
            if part and part.split('__')[0].split('::')[0] != f'sgs-{short}':
                shadow.add(part.split('__')[0].split('::')[0])
    out = []
    for s2, p2, m2, src in var_consumers(name, allrules):
        part, _, _ = analyse_selector(s2, short)
        head = (part or '').split(' ')[0].split('::')[0]
        if part and head != f'sgs-{short}' and head not in drawn:
            continue
        if part and head.split('__')[0] in shadow:
            continue
        out.append((s2, p2, m2, src))
    return out


ATTR_TEST = re.compile(r'''\[\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*(i)?)?\s*\]''')


def attr_holds(op, want, value) -> bool:
    """Whether an attribute selector `[name op want]` holds for the attribute's value (None: the attribute is absent)."""
    if value is None:
        return False
    if op is None:
        return True
    return {'=': value == want, '~=': want in value.split(), '|=': value == want or value.startswith(want + '-'),
            '^=': bool(want) and value.startswith(want), '$=': bool(want) and value.endswith(want), '*=': bool(want) and want in value}[op]


def attr_test_moves(sel: str, name: str, changes) -> bool:
    """True when some attribute test on `name` in the selector answers differently for a plain and a changed value of
    the same element (a rule on [data-x~="marquee"] does not move when data-x changes from "" to "magnet"). A test
    inside :not() counts the same way: its answer flips too."""
    tests = [(m.group(2), next((g for g in m.group(3, 4, 5) if g is not None), None)) for m in ATTR_TEST.finditer(sel) if m.group(1) == name]
    return any(attr_holds(op, want, a) != attr_holds(op, want, b) for op, want in tests for a, b in changes)


def _unwrap_where(sel: str) -> str | None:
    """A selector written whole inside one :where() (zero specificity, `:where(.x:has(.y))`), without it; else None."""
    sel = sel.strip()
    if not sel.startswith(':where(') or not sel.endswith(')'):
        return None
    depth = 0
    for i, ch in enumerate(sel[6:], 6):
        depth += {'(': 1, ')': -1}.get(ch, 0)
        if depth == 0:
            return sel[7:-1] if i == len(sel) - 1 and ',' not in sel[7:-1] else None
    return None


def placement(sel, prop, media, short, mech, src):
    part, state, why = analyse_selector(sel, short)
    if part is None and _unwrap_where(sel):
        # the selector reader does not look inside a :where() that wraps the whole selector; its content names the part
        part, state, why = analyse_selector(_unwrap_where(sel), short)
    return {'part': part, 'props': [prop], 'state': state, 'tiers': tiers_of(media), 'mechanism': mech, 'selector': sel, 'where': src,
            **({'why': why} if part is None else {})}


_STEP_CLASSES = re.compile(r'(^|> )([a-z0-9-]+)\.[^\[> ]*\[')


def element_pairs(eb: dict, em: dict):
    """(path, plain element, changed element) for every element in both renders. An element's path names its part
    classes, so a class the setting adds (a utility class such as sgs-hide-mobile) changes its path: an element only in
    one render is paired with the one only in the other whose path is the same once classes are left out, when exactly
    one of each has it."""
    for path in set(eb) & set(em):
        yield path, eb[path], em[path]
    only_b, only_m = {}, {}
    for path in set(eb) - set(em):
        only_b.setdefault(_STEP_CLASSES.sub(r'\1\2[', path), []).append(path)
    for path in set(em) - set(eb):
        only_m.setdefault(_STEP_CLASSES.sub(r'\1\2[', path), []).append(path)
    for bare, paths in only_b.items():
        if len(paths) == 1 and len(only_m.get(bare, ())) == 1:
            yield only_m[bare][0], eb[paths[0]], em[only_m[bare][0]]


def element_part(classes, short: str, token: str) -> str:
    """The part an element is: ROOT for the block root, else its shortest part class (vocab.same_element's rule)."""
    cls = {c for c in classes if c != token}
    if f'sgs-{short}' in cls:
        return 'ROOT'
    parts = sorted((c for c in cls if c.startswith('sgs-') and '__' in c and '--' not in c), key=lambda c: (len(c), c))
    return parts[0] if parts else 'ROOT'


def diff_placements(base, changed, short, sheets):
    """Every placement the changed render differs from the plain one by, and a summary of what differed."""
    (rb, eb), (rm, em) = base, changed
    out = []
    runtime = [(s, p, v, m, 'runtime') for (m, s, p), v in rm.items()]
    allrules = sheets + runtime
    changed_rules = [k for k in set(rb) | set(rm) if rb.get(k) != rm.get(k) and PROP_RE.fullmatch(k[2])]
    consumers = lambda name: live_consumers(name, allrules, rm, em, short, frozenset(changed_rules))  # noqa: E731
    for media, sel, prop in changed_rules:
        if prop.startswith('--'):
            for s2, p2, m2, src in consumers(prop):
                out.append(placement(s2, p2, media or m2, short, 'run-var', src))
        else:
            out.append(placement(sel, prop, media, short, 'run-css', 'runtime'))
    toks, dattrs, tok_parts, attr_parts = set(), {}, {}, {}
    for path, a, b in element_pairs(eb, em):
        moved = (a['classes'] ^ b['classes']) - {'UID'}
        toks |= moved
        for t in moved:
            tok_parts.setdefault(t, set()).add(element_part(b['classes'] | a['classes'], short, t))
        for k in set(a['attrs']) | set(b['attrs']):
            if a['attrs'].get(k) == b['attrs'].get(k):
                continue
            if k != 'style':
                dattrs.setdefault(k, set()).add((a['attrs'].get(k), b['attrs'].get(k)))
                attr_parts.setdefault(k, set()).add(element_part(b['classes'] | a['classes'], short, ''))
                continue
            sa = dict(re.findall(r'([-\w]+)\s*:\s*([^;]+)', a['attrs'].get(k, '')))
            sb = dict(re.findall(r'([-\w]+)\s*:\s*([^;]+)', b['attrs'].get(k, '')))
            for p in set(sa) | set(sb):
                if sa.get(p) == sb.get(p):
                    continue
                if p.startswith('--'):
                    for s2, p2, m2, src in consumers(p):
                        out.append(placement(s2, p2, m2, short, 'run-style-var', src))
                else:
                    tok = next((c for c in sorted(b['classes']) if c.startswith('sgs-')), None)
                    out.append({'part': tok, 'props': [p], 'state': None, 'tiers': [], 'mechanism': 'run-style', 'where': 'inline'})
    for tok in sorted(toks):
        pat = re.compile(r'\.' + re.escape(tok) + r'(?![\w-])')
        for sel, p, v, media, src in allrules:
            if pat.search(sel) and not p.startswith('--'):
                pl = placement(sel, p, media, short, 'run-class', src)
                utility = '__' not in tok and tok != f'sgs-{short}'
                if (pl['part'] is None or (utility and pl['part'] == tok)) and len(tok_parts.get(tok, ())) == 1:
                    # a utility class, not a part (sgs-hide-mobile): the part is the element it was put on
                    pl['part'] = next(iter(tok_parts[tok]))
                    pl.pop('why', None)
                out.append(pl)
            elif pat.search(sel):
                for s2, p2, m2, src2 in consumers(p):
                    out.append(placement(s2, p2, media or m2, short, 'run-class-var', src2))
    for k in sorted(dattrs):
        pat = re.compile(r'\[' + re.escape(k) + r'(?![\w-])')
        for sel, p, v, media, src in allrules:
            if pat.search(sel) and not p.startswith('--') and attr_test_moves(sel, k, dattrs[k]):
                pl = placement(sel, p, media, short, 'run-data', src)
                if pl['part'] is None and len(attr_parts.get(k, ())) == 1 and re.fullmatch(r'(?::where\()?\[[^\]]+\](?::not\(\[[^\]]+\]\))?\)?', sel.strip()):
                    # a rule on the attribute alone (`[data-sgs-fx~="magnet"]`): the part is the element whose attribute moved
                    pl['part'] = next(iter(attr_parts[k]))
                    pl.pop('why', None)
                out.append(pl)
    uniq, seen = [], set()
    for pl in out:
        sig = json.dumps([pl['part'], pl['props'], pl['state'], pl['tiers']])
        if sig not in seen:
            seen.add(sig)
            uniq.append(pl)
    appeared, gone = sorted(set(em) - set(eb)), sorted(set(eb) - set(em))
    return uniq, {'changedRules': len(changed_rules), 'classTokens': sorted(toks), 'dataAttrs': sorted(dattrs),
                  'appeared': appeared[:6], 'gone': gone[:6], 'nAppeared': len(appeared), 'nGone': len(gone)}
