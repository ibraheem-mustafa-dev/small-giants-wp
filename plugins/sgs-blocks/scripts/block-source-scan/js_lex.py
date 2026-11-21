"""JavaScript lexing for the scanner: string and template literals (nested `${}` included)
and comment stripping that leaves literals intact."""
from __future__ import annotations

import re


def js_string_end(src: str, i: int) -> int:
    """Index of the closing quote of the string or template literal opening at i."""
    q, j, n = src[i], i + 1, len(src)
    while j < n:
        c = src[j]
        if c == '\\':
            j += 2
            continue
        if q == '`' and src.startswith('${', j):
            j = _expr_end(src, j + 2)
            continue
        if c == q:
            return j
        if q != '`' and c == '\n':
            return j  # an unterminated quote (a regex literal or apostrophe): stop at the line end
        j += 1
    return n


def _expr_end(src: str, j: int) -> int:
    depth, n = 0, len(src)
    while j < n:
        c = src[j]
        if c in ("'", '"', '`'):
            j = js_string_end(src, j) + 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            if depth == 0:
                return j + 1
            depth -= 1
        j += 1
    return n


def js_segments(src: str):
    """Yield (start, end, quote, content) for each string and template literal."""
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in ("'", '"', '`'):
            j = js_string_end(src, i)
            yield (i + 1, j, c, src[i + 1:j])
            i = j + 1
            continue
        i += 1


def strip_js_comments(src: str) -> str:
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in ("'", '"', '`'):
            j = js_string_end(src, i)
            out.append(src[i:j + 1])
            i = j + 1
            continue
        if src.startswith('//', i):
            j = src.find('\n', i)
            j = n if j < 0 else j
            out.append(' ' * (j - i))
            i = j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            out.append(re.sub(r'[^\n]', ' ', src[i:j]))
            i = j
            continue
        out.append(c)
        i += 1
    return ''.join(out)
