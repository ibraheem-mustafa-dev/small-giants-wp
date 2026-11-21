"""Which block settings a PHP expression carries: direct `$attributes['x']` reads,
variables assigned from them (several hops), and the setting that decides a printed
modifier class."""
from __future__ import annotations

import re
from collections import defaultdict

from php_lex import COND_HDR, frames_of, ternary_condition

ATTR_READ_RE = re.compile(r"\$(?:attributes|attrs|atts|a|block_attributes|chrome_attrs)\s*\[\s*['\"](\w+)['\"]\s*\]|attributes\.(\w+)|\battributes\?\.(\w+)")


def var_attr_map(src: str, attr_names: set) -> dict:
    """Variable -> block settings it carries (several hops, one-statement assignments)."""
    direct, via = defaultdict(set), defaultdict(set)
    for m in re.finditer(r'\$(\w+)\s*(?<![=!<>.])=(?![=>])\s*(.+?);', src, re.S):
        v, rhs = m.group(1), m.group(2)
        for g in ATTR_READ_RE.findall(rhs):
            for a in g:
                if a in attr_names:
                    direct[v].add(a)
        for a in re.findall(r"['\"](\w+)['\"]", rhs):
            if a in attr_names and re.search(r'attr|sgs_\w+\(\s*\$attributes', rhs):
                direct[v].add(a)
        via[v].update(x for x in re.findall(r'\$(\w+)', rhs) if x != v and x not in ('attributes', 'attrs'))
    out = {}
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
    return out


def attrs_in(text: str, vmap: dict, attr_names: set) -> set:
    """Settings an expression reads, directly or through mapped variables (and JS destructured names)."""
    found = set()
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


def switch_attrs(pos: int, lit_end: int, mask: str, src: str, vmap: dict, attr_names: set) -> set:
    """Settings that decide whether a modifier class literal is printed: the value
    concatenated straight after it, else the ternary or enclosing condition around it."""
    after = src[lit_end + 1:lit_end + 160]
    m = re.match(r"\s*\.\s*(.+?)(?:\s*\.\s*['\"]|\s*[,;]|\s*\)\s*[,;.])", after, re.S)
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
