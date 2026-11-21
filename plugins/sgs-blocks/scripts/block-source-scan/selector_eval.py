"""The selector evaluator: what a PHP expression can hold, as a value tree, and the CSS
rules such a value writes.

A value is a list of items, each literal text, a `Sym` (a setting's value, declarations
a helper builds from settings, a block instance id, or something the source does not
state) or a `Choice` between branches (a ternary, `??`, a conditional assignment, each
call site of a parameter). It is built from string literals and interpolation,
concatenation, variables assigned earlier (each assignment under its condition, `.=` and
`[] =` appends), function parameters bound at each call site (defaults included), array
literals indexed by key, `array_map` with a closure and `implode` over a selector list
(its comma branches), and the return values of the functions it calls. A function whose literals write
rules is evaluated with its parameters bound, so a selector passed to a rule-writing
helper (`sgs_hover_state_rules( $sel, $decls, ':focus-visible', '::after' )`) comes back
as the rules it writes. Anything else is a `Sym('unknown')` with the expression and reason.

`css_emissions` walks a value as CSS text (selector, `{`, body, `}`, at-rules) and
records each setting-carrying item inside a rule body with the rule's selector, the
property it follows or the properties its declarations hold, and the enclosing at-rules.
`analyse_selector` turns a selector into the part it styles, its state and pseudo-element;
it returns no part, never a guess, when the subject is unknown.
"""
from __future__ import annotations

import re

from common import TOKEN_RE, contracts, function_index, part_of, psi, strip_php_comments
from css_read import split_top
from php_lex import COND_HDR, LOOP_HDR, code_mask, frames_of, php_segments

UID, UNK = '\x01', '\x00'
MAX_DEPTH = 5
MAX_STATES = 64
PASS = {'esc_attr', 'esc_html', 'sanitize_html_class', 'trim', 'ltrim', 'rtrim', 'strtolower', 'wp_strip_all_tags', 'sanitize_key', 'strval', 'esc_js', 'wp_kses_post'}
ID_CALLS = {'md5', 'uniqid', 'wp_unique_id', 'hash', 'wp_rand', 'crc32'}
ATTR_RE = re.compile(r"^\$(?:attributes|attrs|atts|block_attributes|chrome_attrs)\s*\[\s*['\"](\w+)['\"]\s*\]$")


class Sym:
    __slots__ = ('kind', 'attrs', 'props', 'keys', 'reason')

    def __init__(self, kind, attrs=(), props=(), keys=None, reason=''):
        self.kind, self.attrs, self.props, self.keys, self.reason = kind, frozenset(attrs), frozenset(props), dict(keys or {}), reason


class Choice:
    __slots__ = ('branches',)

    def __init__(self, branches):
        self.branches = branches  # [(value, condition text)]


def unknown(reason):
    return [Sym('unknown', reason=reason[:160])]


def carried(value, seen=0) -> set:
    """Every setting a value carries."""
    out = set()
    for it in value:
        if isinstance(it, Sym):
            out |= it.attrs
        elif isinstance(it, Choice) and seen < 12:
            for v, _ in it.branches:
                out |= carried(v, seen + 1)
    return out


def flatten(value, limit=24):
    """Up to `limit` alternatives of a value, each (text, conditions); a Sym is UID or UNK."""
    alts = [('', ())]
    for it in value:
        if isinstance(it, str):
            alts = [(t + it, c) for t, c in alts]
        elif isinstance(it, Sym):
            alts = [(t + (UID if it.kind == 'uid' else UNK), c) for t, c in alts]
        else:
            new = []
            for v, cond in it.branches:
                for bt, bc in flatten(v, limit):
                    new += [(t + bt, c + bc + ((cond,) if cond else ())) for t, c in alts]
            alts = new[:limit]
    return alts


# ---------------------------------------------------------------- top-level splitting
def _mask(text):
    return code_mask(text, list(php_segments(text)))


def _top(mask):
    """Depth (0 = top level) at each position of a masked expression."""
    d, out = 0, []
    for ch in mask:
        if ch in ')]}':
            d -= 1
        out.append(d)
        if ch in '([{':
            d += 1
    return out


def _split(text, mask, depth, sep):
    out, last, i = [], 0, 0
    while i < len(mask):
        if depth[i] == 0 and mask.startswith(sep, i):
            out.append(text[last:i])
            i += len(sep)
            last = i
            continue
        i += 1
    out.append(text[last:])
    return out


def _concat_points(mask, depth):
    pts = []
    for i, ch in enumerate(mask):
        if ch == '.' and depth[i] == 0 and mask[i + 1:i + 2] not in ('=', '.') and mask[i - 1:i] != '.':
            if not (mask[i - 1:i].isdigit() and mask[i + 1:i + 2].isdigit()):
                pts.append(i)
    return pts


def _ternary(mask, depth):
    for i, ch in enumerate(mask):
        if ch == '?' and depth[i] == 0 and mask[i + 1:i + 2] not in ('?', '-', '>') and mask[i - 1:i] not in ('?', '<'):
            nest = 0
            for j in range(i + 1, len(mask)):
                if depth[j] != 0:
                    continue
                if mask[j] == '?' and mask[j + 1:j + 2] not in ('?', '-', '>') and mask[j - 1:j] != '?':
                    nest += 1
                elif mask[j] == ':' and mask[j + 1:j + 2] != ':' and mask[j - 1:j] != ':':
                    if nest == 0:
                        return i, j
                    nest -= 1
            return None
    return None


# ---------------------------------------------------------------- environments
class Env:
    """A code body (a block file's top level or a function body) with its assignments and
    the bindings of its parameters: {param: [(argument text, caller Env, position)]}."""

    def __init__(self, src, label, attr_names, params=(), bindings=None, defaults=None, lookup=None, depth=0):
        self.src, self.label, self.attr_names, self.depth = src, label, attr_names, depth
        self.mask = _mask(src)
        self.params, self.bindings, self.defaults = list(params), bindings or {}, defaults or {}
        self.lookup = lookup  # name -> value, for variables a block file's sibling files assign
        self.frames = [f for f in frames_of(self.mask, src) if COND_HDR.search(f[2]) or LOOP_HDR.search(f[2])]
        self.assigns = self._assigns()
        self.memo = {}

    def _assigns(self):
        out = []
        depth = _top(self.mask)
        for m in re.finditer(r'\$(\w+)\s*((?:\[[^\]=;]*\])*)\s*(\.=|=)(?![=>])', self.mask):
            if self.mask[m.start() - 1:m.start()] in ('>', ':'):
                continue
            end = m.end()
            while end < len(self.mask) and not (self.mask[end] == ';' and depth[end] <= depth[m.start()]):
                end += 1
            key = self.src[m.start(2):m.end(2)].strip()
            out.append((m.start(), m.group(1), key, m.group(3), self.src[m.end():end]))
        return out

    def conds_at(self, pos):
        return {(s, e) for s, e, h in self.frames if s < pos < e}

    def cond_text(self, frame):
        for s, e, h in self.frames:
            if (s, e) == frame:
                return h[-120:]
        return ''

    # ------------------------------------------------------------ variables
    def var(self, name, pos, key=None):
        if name == 'this':
            return unknown('$this')
        asg = [a for a in self.assigns if a[1] == name and a[0] < pos]
        sig = (name, key, asg[-1][0] if asg else -1)
        if sig in self.memo:
            return self.memo[sig]
        self.memo[sig] = unknown(f'${name} refers to itself')
        val = self._var(name, pos, key, asg)
        self.memo[sig] = val
        return val

    def _var(self, name, pos, key, asg):
        use = self.conds_at(pos)
        if name in self.bindings or name in self.defaults or name in self.params:
            val = self._param(name)
        elif asg:
            val = []
        elif self.lookup:
            val = self.lookup(name)
        else:
            val = unknown(f'${name} is assigned nowhere the scan reads')
        for apos, _n, akey, op, rhs in asg:
            if key is not None:
                if akey and akey != key and not akey.startswith('[]'):
                    continue
            rel = self.conds_at(apos) - use
            cond = '; '.join(self.cond_text(f) for f in rel)
            if akey and key is None and not akey.startswith('[]'):
                continue  # $x['k'] = ... does not change $x as a string
            new = self.eval(rhs, apos)
            if akey.startswith('[]'):
                new = new + [';']
                op = '.='
            if op == '=':
                val = new if not rel else [Choice([(val, ''), (new, cond)])]
            else:
                val = val + (new if not rel else [Choice([(new, cond), ([], '')])])
        if key is not None and not any(a[2] for a in asg):
            return self._index(val, key)
        return val

    def _param(self, name):
        sites = self.bindings.get(name) or []
        if not sites:
            if name in self.defaults:
                return self.eval(self.defaults[name], 0)
            return unknown(f'parameter ${name} has no call site the scan read')
        vals = []
        for text, env, pos in sites:
            v = env.eval(text, pos) if env is not None else unknown('no caller')
            vals.append((v, f'call site {env.label if env else ""}'))
        return vals[0][0] if len(vals) == 1 else [Choice(vals)]

    def _index(self, val, key):
        k = key.strip('[]').strip().strip('\'"')
        out = []
        for it in val:
            if isinstance(it, Sym) and it.kind == 'array':
                pairs = _array_pairs(it.reason)
                if k in pairs:
                    return it.keys['env'].eval(pairs[k], it.keys['pos'])
                return unknown(f'key {k} not in the array literal')
            if isinstance(it, Sym) and it.kind == 'decls':
                hover = 'hover' in k.lower()
                keep = {a for a in it.attrs if ('hover' in (it.keys.get(a) or '').lower() or a.endswith('Hover') or 'Hover' in a) == hover}
                out.append(Sym('decls', keep, it.props, {a: it.keys.get(a) for a in keep}))
            elif isinstance(it, Choice):
                out.append(Choice([(self._index(v, key), c) for v, c in it.branches]))
            elif isinstance(it, Sym):
                out.append(it)
        return out or unknown(f'index {k} of a value the scan cannot read')

    # ------------------------------------------------------------ expressions
    def eval(self, text, pos, depth=0):
        t = text.strip()
        t = re.sub(r'^(?:\((?:string|int|float|bool|array)\)\s*|@)', '', t).strip()
        if not t:
            return []
        if depth > 40:
            return unknown('expression too deep')
        mask = _mask(t)
        dep = _top(mask)
        if t[0] == '(' and psi.matching_close(t, 0, '(', ')') == len(t) - 1:
            return self.eval(t[1:-1], pos, depth + 1)
        tern = _ternary(mask, dep)
        if tern:
            q, c = tern
            cond, a, b = t[:q], t[q + 1:c], t[c + 1:]
            first = self.eval(a if a.strip() else cond, pos, depth + 1)
            return [Choice([(first, cond.strip()[-120:]), (self.eval(b, pos, depth + 1), 'not ' + cond.strip()[-120:])])]
        if '??' in mask:
            parts = _split(t, mask, dep, '??')
            if len(parts) > 1:
                return [Choice([(self.eval(p, pos, depth + 1), '') for p in parts])]
        if re.search(r'===|!==|==|!=|&&|\|\||<=|>=|(?<![-=])>(?!=)|<(?![<?=])', mask.replace('->', '  ').replace('=>', '  ')) and not t.startswith(('array', '[')):
            if any(d == 0 for d, ch in zip(dep, mask) if ch in '=&|<>!'):
                return unknown('a comparison, not a string')
        pts = _concat_points(mask, dep)
        if pts:
            out, last = [], 0
            for p in pts + [len(t)]:
                out += self.eval(t[last:p], pos, depth + 1)
                last = p + 1
            return out
        return self.atom(t, pos, depth)

    def atom(self, t, pos, depth):
        if t[0] == "'" and t.endswith("'"):
            return [t[1:-1].replace("\\'", "'").replace('\\\\', '\\')]
        if t[0] == '"' and t.endswith('"'):
            return self.interpolate(t[1:-1], pos)
        if re.fullmatch(r'-?\d+(?:\.\d+)?', t):
            return [t]
        m = ATTR_RE.match(t)
        if m:
            return [Sym('val', {m.group(1)} & self.attr_names or {m.group(1)}, reason=t)] if m.group(1) in self.attr_names else unknown(t)
        m = re.fullmatch(r'\$(\w+)((?:\s*\[[^\]]*\])*)', t)
        if m:
            keys = re.findall(r'\[[^\]]*\]', m.group(2))
            if m.group(1) in ('attributes', 'attrs', 'atts') and keys:
                return unknown(t)
            val = self.var(m.group(1), pos, keys[0] if keys else None)
            for k in keys[1:]:
                val = self._index(val, k)
            return val
        if re.match(r'(array\s*\(|\[)', t):
            return [Sym('array', reason=t, keys={'env': self, 'pos': pos})]
        m = re.match(r'(?:new\s+)?\\?([A-Za-z_][\w\\]*(?:::\w+)?)\s*\(', t)
        if m and psi.matching_close(t, m.end() - 1, '(', ')') == len(t) - 1:
            return self.call(m.group(1).split('\\')[-1], psi.split_top_level_args(t[m.end():-1]), pos, depth)
        m = re.match(r'\$(\w+)->(\w+)\s*\(', t)
        if m:
            cands = function_index()[1].get(m.group(2), [])
            if len(cands) == 1 and psi.matching_close(t, m.end() - 1, '(', ')') == len(t) - 1:
                return self.call(cands[0].name, psi.split_top_level_args(t[m.end():-1]), pos, depth)
        if re.fullmatch(r'[A-Z_][A-Z0-9_]*', t) or t in ('true', 'false', 'null'):
            return [] if t == 'null' else unknown(t)
        if t.startswith('static function') or t.startswith('function') or t.startswith('fn'):
            return [Sym('closure', reason=t, keys={'env': self, 'pos': pos})]
        return unknown(t)

    def interpolate(self, body, pos):
        out, i = [], 0
        for m in re.finditer(r'\{\$(\w+)((?:\[[^\]]*\])*)\}|\$(\w+)(\[[\w\'"]+\])?', body):
            if body[m.start() - 1:m.start()] == '\\':
                continue
            out.append(body[i:m.start()].replace('\\"', '"').replace('\\$', '$'))
            name, keys = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4) or '')
            out += self.atom('$' + name + keys, pos, 0)
            i = m.end()
        out.append(body[i:].replace('\\"', '"').replace('\\$', '$'))
        return [x for x in out if x != '']

    # ------------------------------------------------------------ calls
    def call(self, name, args, pos, depth):
        short = name.split('::')[-1]
        if name == 'SGS_Breakpoints::media' or name == 'SGS_Breakpoints::query':
            m = re.match(r"\s*'(\w[\w-]*)'", args[0] if args else '')
            return [f'@media (sgs-tier:{m.group(1)})'] if m else unknown('a breakpoint the source does not name')
        if short in PASS:
            return self.eval(args[0], pos, depth + 1) if args else []
        if short in ID_CALLS or (short == 'substr' and args and re.search(r'md5|hash|uniqid', args[0])):
            return [Sym('uid', reason=name)]
        if short in ('implode', 'join'):
            return self.eval(args[1], pos, depth + 1) if len(args) > 1 else []
        if short == 'array_merge':
            out = []
            for a in args:
                out += self.eval(a, pos, depth + 1)
            return out
        if short == 'explode' and len(args) > 1:
            return self.eval(args[1], pos, depth + 1)  # a list's items are its comma branches (_commas)
        if short == 'array_map' and len(args) > 1:
            return self._array_map(args[0], args[1], pos, depth)
        if short == 'sprintf' and args:
            return self._sprintf(args, pos, depth)
        fn = function_index()[0].get(name)
        if fn is None:
            vals = [self.eval(a, pos, depth + 1) for a in args]
            attrs = set().union(*(carried(v) for v in vals)) if vals else set()
            return [Sym('val', attrs, reason=f'{name}()')] if attrs else unknown(f'{name}() is not a function the scan reads')
        if name in contracts()['prefix_helpers']:
            return [Sym('opaque', reason=f'{name}() (prefix helper, read by its contract)')]
        named = {v: k for k, v in re.findall(r"(?:'(\w+)'\s*=>\s*)?'(\w+)'", ' '.join(args)) if v in self.attr_names}
        if writes_rules(fn) and self.depth < MAX_DEPTH:
            return self._returns(fn, args, pos)
        vals = [self.eval(a, pos, depth + 1) for a in args]
        attrs = set().union(*(carried(v) for v in vals)) if vals else set()
        if named and any(re.search(r'\$(attributes|attrs|atts)\b', a) for a in args):
            attrs |= set(named)
        if attrs:
            from settings import helper_props
            return [Sym('decls', attrs, helper_props(fn.name), keys={a: named.get(a) for a in attrs})]
        if self.depth < MAX_DEPTH and len(fn.body) < 2500:
            return self._returns(fn, args, pos)
        return unknown(f'{name}() returns a value the scan does not evaluate')

    def child(self, fn, args, pos):
        defaults = signature_defaults(fn)
        bindings = {p: [(args[i], self, pos)] for i, p in enumerate(fn.params) if i < len(args)}
        return Env(fn.body, f'{fn.file.name}::{fn.name}', self.attr_names, fn.params, bindings, defaults, depth=self.depth + 1)

    def _returns(self, fn, args, pos):
        env = self.child(fn, args, pos)
        nested = []  # bodies of closures and arrow functions: their returns are not this function's
        for m in re.finditer(r'\bfunction\s*\(', env.mask):
            close = psi.matching_close(env.mask, m.end() - 1, '(', ')')
            brace = env.mask.find('{', close)
            if close > 0 and brace > 0:
                nested.append((brace, psi.matching_close(env.mask, brace, '{', '}')))
        rets = [m for m in re.finditer(r'\breturn\b', env.mask) if not any(s < m.start() < e for s, e in nested)]
        branches = []
        dep = _top(env.mask)
        for m in rets:
            end = m.end()
            while end < len(env.mask) and not (env.mask[end] == ';' and dep[end] <= dep[m.start()]):
                end += 1
            branches.append((env.eval(env.src[m.end():end], m.start()), ''))
        if not branches:
            return []
        return branches[0][0] if len(branches) == 1 else [Choice(branches)]

    def _array_map(self, fn_text, list_text, pos, depth):
        items = _commas(self.eval(list_text, pos, depth + 1))
        f = fn_text.strip()
        if f.strip('\'"') in PASS:
            return [Choice([([x], '') for x in items])]
        m = re.match(r'(?:static\s+)?function\s*\(\s*(?:\w+\s+)?\$(\w+)\s*\)\s*(?:use\s*\(([^)]*)\))?\s*\{', f)
        if not m:
            return unknown('array_map with a callback the scan does not read')
        body_open = m.end() - 1
        body = f[body_open + 1:psi.matching_close(f, body_open, '{', '}')]
        rm = re.search(r'\breturn\b(.*);', body, re.S)
        if not rm:
            return unknown('array_map callback with no return')
        out = []
        for x in items:
            env = Env(body, self.label + '::closure', self.attr_names, [m.group(1)], {}, lookup=lambda n, _p=pos: self.var(n, _p), depth=self.depth)
            env.defaults = {}
            env.bindings = {m.group(1): [(repr_literal(x), None, 0)]}
            env._param = lambda name, _x=x, _p=m.group(1), _env=env: [_x] if name == _p else Env._param(_env, name)
            out.append((env.eval(rm.group(1), len(body)), ''))
        return [Choice(out)] if out else []

    def _sprintf(self, args, pos, depth):
        fmt = self.eval(args[0], pos, depth + 1)
        if not (len(fmt) == 1 and isinstance(fmt[0], str)):
            return unknown('sprintf with a format the source does not state')
        out, i, n = [], 0, 1
        for m in re.finditer(r'%(?:(\d+)\$)?s', fmt[0]):
            out.append(fmt[0][i:m.start()])
            k = int(m.group(1)) if m.group(1) else n
            n += 0 if m.group(1) else 1
            out += self.eval(args[k], pos, depth + 1) if k < len(args) else unknown('sprintf argument missing')
            i = m.end()
        out.append(fmt[0][i:])
        return [x for x in out if x != '']


def repr_literal(x):
    return x


RULE_LITERAL_RE = re.compile(r"""['"][^'"\n]*\{(?!\$)""")
_WRITES: dict = {}


def writes_rules(fn, depth=0) -> bool:
    """Whether a function writes CSS rules: a literal opening a rule body, or a call to a function that does."""
    if fn.name in _WRITES:
        return _WRITES[fn.name]
    _WRITES[fn.name] = False
    hit = bool(RULE_LITERAL_RE.search(fn.body) or re.search(r'\{\$\w+\}\{', fn.body))
    if not hit and depth < 3:
        index = function_index()[0]
        hit = any(c in index and writes_rules(index[c], depth + 1) for c in fn.calls)
    _WRITES[fn.name] = hit
    return hit


def _commas(value):
    """The items of a list value: the elements of an array literal, else the comma-separated
    branches of a selector list, each a plain text alternative."""
    if len(value) == 1 and isinstance(value[0], Sym) and value[0].kind == 'array':
        sym = value[0]
        m = re.match(r'(?:array\s*\(|\[)', sym.reason)
        out = []
        for el in psi.split_top_level_args(sym.reason[m.end():-1] if m else sym.reason):
            el = re.sub(r"^\s*['\"][^'\"]*['\"]\s*=>", '', el)
            out += [t for t, _c in flatten(sym.keys['env'].eval(el, sym.keys['pos']))]
        return out or ['']
    if len(value) == 1 and isinstance(value[0], Choice):
        out = []
        for v, _c in value[0].branches:
            out += [x for x in _commas(v) if x not in out]
        return out or ['']
    out = []
    for text, _c in flatten(value):
        out += [p for p in split_top(text) if p.strip()]
    return out or ['']


def _array_pairs(text):
    m = re.match(r'(?:array\s*\(|\[)', text)
    inner = text[m.end():-1] if m else text
    pairs = {}
    for a in psi.split_top_level_args(inner):
        km = re.match(r"\s*['\"]([^'\"]+)['\"]\s*=>\s*(.*)$", a, re.S)
        if km:
            pairs[km.group(1)] = km.group(2)
    return pairs


_DEFAULTS: dict = {}


def signature_defaults(fn) -> dict:
    """{param: default expression} read from the function's signature in its file."""
    if fn.name in _DEFAULTS:
        return _DEFAULTS[fn.name]
    out = {}
    try:
        src = strip_php_comments(fn.file.read_text(encoding='utf-8', errors='ignore'))
        m = re.search(r'\bfunction\s+&?\s*' + re.escape(fn.name.split('::')[-1]) + r'\s*\(', src)
        if m:
            close = psi.matching_close(src, m.end() - 1, '(', ')')
            for raw in psi.split_top_level_args(src[m.end():close]):
                pm = re.search(r'\$(\w+)\s*=\s*(.+)$', raw.strip(), re.S)
                if pm:
                    out[pm.group(1)] = pm.group(2).strip()
    except OSError:
        pass
    _DEFAULTS[fn.name] = out
    return out


# ---------------------------------------------------------------- CSS emissions
def css_emissions(value) -> list:
    """(selector text, at-rules, property or None, Sym) for each setting-carrying item in a rule body."""
    out = []
    _walk(value, {('out', '', '', ())}, out, 0)
    return out


def _walk(value, states, out, depth):
    for it in value:
        if isinstance(it, str):
            states = {_feed(s, it) for s in states}
        elif isinstance(it, Sym):
            new = set()
            for s in states:
                mode, sel, buf, media = s
                if mode == 'body' and it.attrs and it.kind in ('val', 'decls'):
                    pm = re.search(r'(-{0,2}[a-zA-Z][\w-]*)\s*:\s*[^;:{}]*$', buf)
                    out.append((sel, media, pm.group(1).lower() if pm and it.kind == 'val' else None, it))
                new.add((mode, sel, (buf + UNK)[-200:], media) if mode == 'body' else (mode, sel, buf + (UID if it.kind == 'uid' else UNK), media))
            states = new
        elif isinstance(it, Choice) and depth < 30:
            new = set()
            for v, _c in it.branches:
                new |= _walk(v, states, out, depth + 1)
            states = new
        if len(states) > MAX_STATES:
            states = set(sorted(states)[:MAX_STATES])
    return states


def _feed(state, text):
    mode, sel, buf, media = state
    for ch in text:
        if mode == 'out':
            if ch == '{':
                if buf.strip().startswith('@'):
                    media, buf = media + (buf.strip(),), ''
                else:
                    mode, sel, buf = 'body', buf.strip(), ''
            elif ch == '}':
                media, buf = media[:-1], ''
            elif ch == ';':
                buf = ''
            else:
                buf += ch
        else:
            if ch == '}':
                mode, sel, buf = 'out', '', ''
            elif ch == ';':
                buf = ''
            else:
                buf = (buf + ch)[-200:]
    return (mode, sel, buf, media)


# ---------------------------------------------------------------- selectors
STATE_MODS = re.compile(r'--(active|current|open|expanded|checked|selected|disabled)\b')
SEL_STATE = re.compile(r':hover|:focus-visible|:focus-within|:focus\b|:active|:checked|:disabled|\[aria-(?:current|expanded|selected|checked|disabled|pressed)[^\]]*\]|\.is-[a-z0-9-]+|\[open\]|:open|:popover-open')


def _compound(core: str, short: str):
    """('root' or None, element parts) of one compound: a class holding the instance id,
    `wp-block-sgs-<short>` or `sgs-<short>` marks the root; other `sgs-` classes are parts."""
    root, kind, els = f'sgs-{short}', None, []
    for cls in re.findall(r'\.([^.#:\[\s>+~]+)', core):
        if UID in cls or cls in (root, f'wp-block-sgs-{short}'):
            kind = 'root'
        elif cls.startswith('sgs-'):
            els.append(part_of(cls))
    return kind, els


def analyse_selector(sel: str, short: str):
    """(part or None, state or None, reason) for one selector of a list. The root is
    `sgs-<short>`: a compound holding the block's instance id, its `wp-block-sgs-<short>`
    class or `sgs-<short>` itself."""
    root = f'sgs-{short}'
    s = sel.strip()
    if not s:
        return None, None, 'empty selector'
    state = None
    positive = re.sub(r':not\((?:[^()]|\([^()]*\))*\)', '', s)  # a state inside :not() is its absence
    sm = SEL_STATE.search(positive.replace(UNK, ''))
    mm = STATE_MODS.search(positive)
    if sm:
        state = sm.group(0)
    elif mm:
        state = mm.group(1)
    plain = re.sub(r':(?:not|is|where|has)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)', '', s)
    comps = [c for c in re.split(r'\s*[>+~]\s*|\s+', plain.strip()) if c]
    if not comps:
        return None, state, 'no compound'
    last = comps[-1]
    pe = re.search(r'::?(before|after|placeholder|marker|first-letter|first-line|selection|backdrop)\b', last)
    pseudo = f'::{pe.group(1)}' if pe else ''
    core = re.sub(r'::?[a-z-]+(\([^)]*\))?|\[[^\]]*\]', '', last)
    if UNK in core:
        return None, state, f'the subject holds a value the source does not state: {sel.replace(UNK, "?").replace(UID, "{uid}")[:120]}'
    kind, els = _compound(core, short)
    if els:
        return els[-1] + pseudo, state, ''
    if kind == 'root':
        return root + pseudo, state, ''
    tag = re.match(r'([a-zA-Z][a-zA-Z0-9]*)', core)
    if tag:
        anc = None
        for c in reversed(comps[:-1]):
            c_kind, ct = _compound(re.sub(r'::?[a-z-]+(\([^)]*\))?|\[[^\]]*\]', '', c), short)
            if ct:
                anc = ct[-1]
                break
            if c_kind == 'root':
                anc = root
                break
        if anc is None:
            return None, state, f'a bare tag under an ancestor the source does not state: {sel[:120]}'
        return f'{anc} {tag.group(1).lower()}{pseudo}', state, ''
    return None, state, f'no class or tag in the subject: {sel.replace(UID, "{uid}")[:120]}'
