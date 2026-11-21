"""Stylesheet reading for the scanner: rules (with their at-rule), selector lists and the
part a selector styles."""
from __future__ import annotations

import re

from common import PSEUDO_EL_RE, TOKEN_RE, part_of


def parse_css(text: str, media: str = '', out: list | None = None) -> list:
    """Every (selector list, declarations, at-rule) in a stylesheet; one level of SCSS nesting is unrolled."""
    out = [] if out is None else out
    text = re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)
    i, n = 0, len(text)
    while i < n:
        b = text.find('{', i)
        if b < 0:
            break
        header = text[i:b].strip()
        if header.startswith('@') and ';' in header:
            header = header[header.rindex(';') + 1:].strip()
        depth, j = 1, b + 1
        while j < n and depth:
            depth += {'{': 1, '}': -1}.get(text[j], 0)
            j += 1
        body = text[b + 1:j - 1]
        if header.startswith('@'):
            parse_css(body, header, out)
        elif header:
            if '{' in body:
                decls = re.sub(r'[^{};]*\{[^{}]*\}', '', body)
                out.append((header, decls, media))
                for sub_h, sub_b in re.findall(r'([^{};]+)\{([^{}]*)\}', body):
                    sh = sub_h.strip()
                    full = sh.replace('&', header) if '&' in sh else f'{header} {sh}'
                    out.append((full, sub_b, media))
            else:
                out.append((header, body, media))
        i = j
    return out


def split_top(sel: str) -> list:
    """A selector list split on its top-level commas."""
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def subject_of(sel: str):
    """The part a selector styles: the last class token in its last compound (or the
    nearest earlier one when the last compound is a bare tag), with any pseudo-element."""
    sel = re.sub(r':(?:not|is|where|has)\((?:[^()]|\([^()]*\))*\)', '', sel)
    comps = re.split(r'\s*[>+~]\s*|\s+', sel.strip())
    for c in reversed(comps):
        toks = TOKEN_RE.findall(c)
        if toks:
            tok = part_of(toks[-1][0])
            pe = PSEUDO_EL_RE.search(c)
            if pe and pe.group(0).startswith('::') or (pe and pe.group(1) in ('before', 'after')):
                return f'{tok}::{pe.group(1)}' if c is comps[-1] else tok
            return tok
    return None


def decl_props(body: str) -> list:
    """The property names a declaration block sets."""
    return re.findall(r'(?:^|;)\s*([a-z-]+)\s*:', body)
