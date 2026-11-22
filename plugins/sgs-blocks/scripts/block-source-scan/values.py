"""Which block settings a PHP expression carries: direct `$attributes['x']` reads,
variables assigned from them (several hops), and the setting that decides a printed
modifier class."""
from __future__ import annotations

import re
from collections import defaultdict

from php_lex import COND_HDR, frames_of, ternary_condition
from common import psi

ATTR_READ_RE = re.compile(r"\$(?:attributes|attrs|atts|a|block_attributes|chrome_attrs)\s*\[\s*['\"](\w+)['\"]\s*\]|attributes\.(\w+)|\battributes\?\.(\w+)")


KEYED_RE = re.compile(r"\$(\w+)\s*\[\s*['\"](\w+)['\"]\s*\]")


class VarMap(dict):
    """Variable -> block settings it carries, plus what the walkers of a statement chain need: `keyed` (a parameter
    that holds an array the caller built key by key: variable -> key -> settings), `rhs` (variable -> the expressions
    it is assigned) and `attr_names`."""
    keyed: dict
    rhs: dict
    attr_names: set


def var_attr_map(src: str, attr_names: set, seed: dict | None = None) -> dict:
    """Variable -> block settings it carries (several hops, one-statement assignments). `seed` binds a function's
    parameters to what its caller passed: {param: {'attrs': set, 'keys': {key: set}}}; `$param['key']` then carries
    only that key's settings, and a bare `$param` all of them."""
    seed = seed or {}
    keyed = {v: s['keys'] for v, s in seed.items() if s.get('keys')}
    direct, via, rhs_of = defaultdict(set), defaultdict(set), defaultdict(list)
    for v, sd in seed.items():
        direct[v] |= set(sd.get('attrs') or ())
    for m in re.finditer(r'\$(\w+)\s*(?<![=!<>.])=(?![=>])\s*(.+?);', src, re.S):
        v, rhs = m.group(1), m.group(2)
        rhs_of[v].append(rhs)
        for g in ATTR_READ_RE.findall(rhs):
            for a in g:
                if a in attr_names:
                    direct[v].add(a)
        for a in re.findall(r"['\"](\w+)['\"]", rhs):
            if a in attr_names and re.search(r'attr|sgs_\w+\(\s*\$attributes', rhs):
                direct[v].add(a)
        rhs_v = rhs
        if keyed:
            for km in KEYED_RE.finditer(rhs):
                if km.group(1) in keyed:
                    direct[v] |= set(keyed[km.group(1)].get(km.group(2), ()))
            rhs_v = KEYED_RE.sub(lambda k: '$_' if k.group(1) in keyed else k.group(0), rhs)
        via[v].update(x for x in re.findall(r'\$(\w+)', rhs_v) if x != v and x not in ('attributes', 'attrs'))
    out = VarMap()
    for v in set(direct) | set(via):
        seen, todo, acc = set(), [v], set()
        while todo:
            x = todo.pop()
            if x in seen:
                continue
            seen.add(x)
            acc |= direct.get(x, set())
            todo.extend(via.get(x, ()))
        if acc:
            out[v] = acc
    out.keyed, out.rhs, out.attr_names = keyed, dict(rhs_of), set(attr_names)
    return out


def call_seed(args: list, params: list, caller_vmap: dict, attr_names: set) -> dict:
    """The callee's parameter seed from the call's argument texts: each argument's settings read in the caller's
    variables; an array literal (`array( 'key' => expr )` or `[ ... ]`) also keeps the settings of each key, and a
    caller's own keyed parameter passed straight on keeps its keys."""
    seed = {}
    for param, arg in zip(params, args):
        arg = arg.strip()
        if re.fullmatch(r"'[^']*'|\"[^\"]*\"", arg):
            continue  # a literal string (a key prefix, a class name) reads no setting
        attrs, keys = attrs_in(arg, caller_vmap, attr_names), {}
        lit = re.match(r'(?:array\s*\(|\[)(.*)(?:\)|\])$', arg, re.S)
        if lit:
            for item in psi.split_top_level_args(lit.group(1)):
                km = re.match(r"\s*['\"](\w+)['\"]\s*=>\s*(.+)$", item, re.S)
                if km:
                    got = attrs_in(km.group(2), caller_vmap, attr_names)
                    keys[km.group(1)] = got
        else:
            pm = re.fullmatch(r'\$(\w+)', arg)
            passed = getattr(caller_vmap, 'keyed', None) or {}
            if pm and pm.group(1) in passed:
                keys = {k: set(v) for k, v in passed[pm.group(1)].items()}
        if keys:
            attrs |= set().union(*keys.values())
        elif len(attrs) > MAX_SUBJECT_ATTRS:
            attrs = set()  # a composite (an array built from many settings) says nothing about one parameter
        if attrs or keys:
            seed[param] = {'attrs': attrs, 'keys': keys}
    return seed


def seed_signature(seed: dict) -> str:
    return repr(sorted((p, sorted(s['attrs']), sorted((k, sorted(v)) for k, v in s['keys'].items())) for p, s in seed.items()))


def attrs_in(text: str, vmap: dict, attr_names: set) -> set:
    """Settings an expression reads, directly or through mapped variables (and JS destructured names)."""
    found = set()
    keyed = getattr(vmap, 'keyed', None)
    if keyed:
        for km in KEYED_RE.finditer(text):
            if km.group(1) in keyed:
                found |= set(keyed[km.group(1)].get(km.group(2), ()))
        text = KEYED_RE.sub(lambda k: '$_' if k.group(1) in keyed else k.group(0), text)
    for g in ATTR_READ_RE.findall(text):
        for a in g:
            if a in attr_names:
                found.add(a)
    for v in re.findall(r'\$(\w+)', text):
        found |= vmap.get(v, set())
    for a in re.findall(r'\b([a-z][A-Za-z0-9]+)\b', text):
        if a in attr_names and len(a) > 3 and not re.search(r'\$' + a, text) and re.search(r'[A-Z]', a):
            found.add(a)
    return found


def switch_attrs(pos: int, lit_end: int, mask: str, src: str, vmap: dict, attr_names: set, concat: bool = True) -> set:
    """Settings that decide whether a modifier class literal is printed: the value
    concatenated straight after it, else the ternary or enclosing condition around it.
    `concat=False` reads the conditions only (a data attribute literal such as ` data-x`, whose concatenated
    neighbour is another attribute, not its switch)."""
    after = src[lit_end + 1:lit_end + 160]
    m = re.match(r"\s*\.\s*(.+?)(?:\s*\.\s*['\"]|\s*[,;]|\s*\)\s*[,;.])", after, re.S) if concat else None
    found = set()
    if m:
        found = attrs_in(m.group(1), vmap, attr_names)
    if not found:
        c = ternary_condition(pos, mask, src)
        if c:
            found = attrs_in(c, vmap, attr_names)
    if not found:
        enclosing = sorted((f for f in frames_of(mask, src) if f[0] < pos < f[1] and COND_HDR.search(f[2])), key=lambda f: f[0], reverse=True)
        for f in enclosing:
            found = attrs_in(f[2], vmap, attr_names)
            if found:
                break
    return found


# ---------------------------------------------------------------- the values a condition compares a setting against
CMP_OPS = r'(?:===|!==|==|!=)'
STR_LIT = r"""(?P<q>['"])(?P<v>(?:\\.|(?!(?P=q)).)*)(?P=q)"""
EQ_RIGHT_RE = re.compile(CMP_OPS + r'\s*' + STR_LIT)
EQ_LEFT_RE = re.compile(STR_LIT + r'\s*' + CMP_OPS)
NUM_RIGHT_RE = re.compile(CMP_OPS + r'\s*(-?\d+)\b')
NUM_LEFT_RE = re.compile(r'\b(-?\d+)\s*' + CMP_OPS)
DEFAULT_RE = re.compile(r'\?\?\s*' + STR_LIT)
NEEDLE_FUNCS = {'strpos': 'contains', 'stripos': 'contains', 'mb_strpos': 'contains', 'str_contains': 'contains',
                'str_starts_with': 'start', 'str_ends_with': 'end'}
CALL_RE = re.compile(r'\b(in_array|' + '|'.join(NEEDLE_FUNCS) + r')\s*\(')
SAMPLE_WORD = 'Sample'
MAX_LITERALS = 12


def _operand_before(text: str, end: int) -> str:
    """The expression that ends at `end`: back to the nearest `&&`, `||`, `?`, `:`, `,`, `;`, `{` or unbalanced `(`."""
    depth, i = 0, end
    while i > 0:
        ch = text[i - 1]
        if ch in ')]':
            depth += 1
        elif ch in '([':
            if depth == 0:
                break
            depth -= 1
        elif depth == 0 and (ch in ',;{?' or (ch in '&|' and text[i - 2:i] in ('&&', '||')) or (ch == ':' and text[i - 2:i] != '::')):
            break
        i -= 1
    return text[i:end]


def _operand_after(text: str, start: int) -> str:
    """The expression that starts at `start`: on to the nearest `&&`, `||`, `?`, `:`, `,`, `;` or unbalanced `)`."""
    depth, i, n = 0, start, len(text)
    while i < n:
        ch = text[i]
        if ch in '([':
            depth += 1
        elif ch in ')]':
            if depth == 0:
                break
            depth -= 1
        elif depth == 0 and (ch in ',;?' or text[i:i + 2] in ('&&', '||') or (ch == ':' and text[i:i + 2] != '::' and text[i - 1:i] != ':')):
            break
        i += 1
    return text[start:i]


def _unescape(v: str) -> str:
    return re.sub(r"\\(['\"\\])", r'\1', v)


def _needle_sample(kind: str, needle: str) -> str:
    return f'{needle} {SAMPLE_WORD.lower()}' if kind == 'start' else f'{SAMPLE_WORD} {needle}'


def _add(out: dict, attrs, values) -> None:
    for a in sorted(attrs):
        cur = out.setdefault(a, [])
        for v in values:
            if v not in cur and len(cur) < MAX_LITERALS:
                cur.append(v)


MAX_SUBJECT_ATTRS = 4  # an expression carrying more settings than this is a composite (an array built from many), not one compared setting


def _subject_attrs(subject: str, vmap: dict, attr_names: set) -> set:
    got = attrs_in(subject, vmap, attr_names)
    return got if len(got) <= MAX_SUBJECT_ATTRS else set()


def _literals_in(text: str, vmap: dict, attr_names: set, out: dict) -> None:
    """Comparisons in `text` between a setting-carrying expression and a literal: `=== 'x'` (either side),
    `in_array( ..., array( 'a', 'b' ) )`, `strpos` / `str_contains` / `str_starts_with` (a sample string holding the
    needle), then `?? 'default'` (the default the code assumes)."""
    for m in EQ_RIGHT_RE.finditer(text):
        if m.group('v') != '':
            _add(out, _subject_attrs(_operand_before(text, m.start()), vmap, attr_names), [_unescape(m.group('v'))])
    for m in EQ_LEFT_RE.finditer(text):
        if m.group('v') != '':
            _add(out, _subject_attrs(_operand_after(text, m.end()), vmap, attr_names), [_unescape(m.group('v'))])
    for m in NUM_RIGHT_RE.finditer(text):
        _add(out, _subject_attrs(_operand_before(text, m.start()), vmap, attr_names), [int(m.group(1))])
    for m in NUM_LEFT_RE.finditer(text):
        _add(out, _subject_attrs(_operand_after(text, m.end()), vmap, attr_names), [int(m.group(1))])
    for m in CALL_RE.finditer(text):
        close = psi.matching_close(text, m.end() - 1, '(', ')')
        if close < 0:
            continue
        args = psi.split_top_level_args(text[m.end():close])
        if len(args) < 2:
            continue
        if m.group(1) == 'in_array':
            if re.match(r'\s*(?:array\s*\(|\[)', args[1]):
                vals = [_unescape(x.group('v')) for x in re.finditer(STR_LIT, args[1])]
                _add(out, _subject_attrs(args[0], vmap, attr_names), [v for v in vals if v != ''])
        else:
            nm = re.fullmatch(r'\s*' + STR_LIT + r'\s*', args[1])
            if nm and nm.group('v'):
                _add(out, _subject_attrs(args[0], vmap, attr_names), [_needle_sample(NEEDLE_FUNCS[m.group(1)], _unescape(nm.group('v')))])
    for m in DEFAULT_RE.finditer(text):
        if m.group('v') != '':
            _add(out, _subject_attrs(_operand_before(text, m.start()), vmap, attr_names), [_unescape(m.group('v'))])


def condition_literals(expr: str, vmap: dict, _seen=None, _depth: int = 4) -> dict:
    """Per setting, the values the code compares it against in `expr`, walking the same variable chain `var_attr_map`
    walks (a variable in the condition is followed to the expressions assigned to it): {setting: [value, ...]}. A
    setting a condition only tests for being set (`! empty`, `'' !== $x`) has no value here; the caller lists it
    through the condition's settings (`attrs_in`)."""
    attr_names = getattr(vmap, 'attr_names', None) or set()
    out: dict = {}
    _literals_in(expr, vmap, attr_names, out)
    seen = _seen if _seen is not None else set()
    if _depth > 0:
        for v in re.findall(r'\$(\w+)', expr):
            if v in seen or v in ('attributes', 'attrs'):
                continue
            seen.add(v)
            for rhs in (getattr(vmap, 'rhs', None) or {}).get(v, ()):
                for a, vals in condition_literals(rhs, vmap, seen, _depth - 1).items():
                    _add(out, [a], vals)
    return out
