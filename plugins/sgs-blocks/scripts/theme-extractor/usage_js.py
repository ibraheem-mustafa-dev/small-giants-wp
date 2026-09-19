"""Quote-aware bracket structure of a draft's script, for the colour census' JS-bound scan.

``bracket_spans`` walks the script once, skipping string literals (single, double, backtick, with
backslash escapes) and comments, and records every ``{`` ``(`` ``[`` with the index of its matching
close. ``enclosing_keys`` then answers "which object keys sit around this position" without treating a
brace inside a string (``note: 'use the { sign'``) as structure. It is a bracket matcher, not a parser:
regex literals and template-literal interpolation are not understood.
"""
from __future__ import annotations

import bisect
import re

WINDOW = 2000  # how far either side of a position the enclosing object may reach
_OPEN, _CLOSE = "{([", "})]"
_KEY_RE = re.compile(r"(?:^|[{,])\s*['\"]?(\w+)['\"]?\s*:", re.M)


def bracket_spans(script: str) -> tuple[list[int], list[int]]:
    """(opens, closes): each bracket's open index, ascending, and its close (``len(script)`` if never closed)."""
    opens: list[int] = []
    closes: list[int] = []
    stack: list[int] = []
    quote, i, n = "", 0, len(script)
    while i < n:
        ch = script[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote or (ch == "\n" and quote != "`"):   # an unterminated ' or " ends at the line
                quote = ""
        elif ch in "'\"`":
            quote = ch
        elif script.startswith("//", i) or script.startswith("/*", i):
            end = script.find("\n" if script[i + 1] == "/" else "*/", i + 2)
            i = n if end < 0 else end + (0 if script[i + 1] == "/" else 2)
            continue
        elif ch in _OPEN:
            opens.append(i)
            closes.append(n)
            stack.append(len(opens) - 1)
        elif ch in _CLOSE and stack:
            closes[stack.pop()] = i
        i += 1
    return opens, closes


def enclosing_keys(script: str, spans: tuple[list[int], list[int]], pos: int) -> set[str]:
    """Keys of the innermost bracketed literal around ``pos`` (within ``WINDOW`` characters)."""
    opens, closes = spans
    start, end = max(0, pos - WINDOW), min(len(script), pos + WINDOW)
    k = bisect.bisect_left(opens, pos) - 1
    while k >= 0 and opens[k] >= pos - WINDOW:
        if closes[k] >= pos:
            start, end = opens[k], min(closes[k], end)
            break
        k -= 1
    return set(_KEY_RE.findall(script[start:end]))
