"""motion_source_scan.py - comment-aware source reading for the motion gates (PHP and JS/JSX).

`strip(text, lang)` returns two strings the same length as `text`, so offsets line up:
  code   comments replaced by spaces; string literals kept (the module path of an import and the 'sgsMotion' array
         key both live in strings)
  skel   comments replaced AND string, template and regex-literal contents replaced by spaces; quotes kept. Brace and
         parenthesis matching, function discovery and keyword tests run on this one.
Newlines are always kept. A JS single- or double-quoted string ends at a line break (an apostrophe in JSX text can
only damage its own line). Heredocs, JSX text and JS regex literals after `)` are not modelled (blind spots).

`scopes(skel, lang)` lists every function-like body as (start, end, name): `function` declarations, methods, closures,
arrow functions with a block body, and arrow or `fn` functions with an expression body.
"""
from __future__ import annotations

import re

KEYWORDS_BEFORE_PAREN = {"if", "for", "foreach", "while", "switch", "catch", "with", "elseif", "match", "declare",
                         "return", "array", "list", "isset", "empty", "unset", "and", "or", "new"}
REGEX_PRECEDERS = set("(,=:[!&|?{};+-*%<>~^")


def strip(text: str, lang: str) -> tuple[str, str]:
    code = list(text)
    skel = list(text)
    n = len(text)
    i = 0
    prev = ""

    def blank(buf: list[str], a: int, b: int) -> None:
        for k in range(a, b):
            if buf[k] != "\n":
                buf[k] = " "

    while i < n:
        c = text[i]
        two = text[i:i + 2]
        if two == "//" or (lang == "php" and c == "#" and text[i:i + 2] != "#["):
            j = text.find("\n", i)
            j = n if j < 0 else j
            blank(code, i, j)
            blank(skel, i, j)
            i = j
            continue
        if two == "/*":
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            blank(code, i, j)
            blank(skel, i, j)
            i = j
            continue
        if c in "'\"" or (lang == "js" and c == "`"):
            j = i + 1
            while j < n:
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == c:
                    break
                if text[j] == "\n" and lang == "js" and c != "`":
                    j -= 1
                    break
                j += 1
            blank(skel, i + 1, min(j, n))
            prev = c
            i = min(j, n - 1) + 1
            continue
        if lang == "js" and c == "/" and prev and prev in REGEX_PRECEDERS:
            j = i + 1
            in_class = False
            while j < n and text[j] != "\n":
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == "[":
                    in_class = True
                elif text[j] == "]":
                    in_class = False
                elif text[j] == "/" and not in_class:
                    break
                j += 1
            blank(skel, i + 1, min(j, n))
            prev = "/"
            i = j + 1
            continue
        if not c.isspace():
            prev = c
        i += 1
    return "".join(code), "".join(skel)


def match_forward(skel: str, open_at: int) -> int:
    """Index of the bracket closing the one at `open_at`, or len(skel) when unbalanced."""
    pairs = {"(": ")", "{": "}", "[": "]"}
    stack = [pairs[skel[open_at]]]
    for k in range(open_at + 1, len(skel)):
        ch = skel[k]
        if ch in pairs:
            stack.append(pairs[ch])
        elif stack and ch == stack[-1]:
            stack.pop()
            if not stack:
                return k
    return len(skel)


def match_backward(skel: str, close_at: int) -> int:
    pairs = {")": "(", "}": "{", "]": "["}
    stack = [pairs[skel[close_at]]]
    for k in range(close_at - 1, -1, -1):
        ch = skel[k]
        if ch in pairs:
            stack.append(pairs[ch])
        elif stack and ch == stack[-1]:
            stack.pop()
            if not stack:
                return k
    return -1


def _word_before(skel: str, at: int) -> str:
    m = re.search(r"([A-Za-z_$][\w$]*)\s*$", skel[max(0, at - 80):at])
    return m.group(1) if m else ""


def _expression_end(skel: str, start: int) -> int:
    depth = 0
    for k in range(start, len(skel)):
        ch = skel[k]
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                return k
            depth -= 1
        elif depth == 0 and ch in ",;":
            return k
    return len(skel)


def scopes(skel: str, lang: str) -> list[tuple[int, int, str]]:
    found: dict[int, tuple[int, int, str]] = {}
    for m in re.finditer(r"\{", skel):
        at = m.start()
        head = skel[:at].rstrip()
        if lang == "php":
            head = re.sub(r":\s*\??[\w\|]+$", "", head).rstrip()
        if not head.endswith(")"):
            if head.endswith("=>") and lang == "js":
                found[at] = (at, match_forward(skel, at), "{arrow}")
            continue
        open_paren = match_backward(skel, len(head) - 1)
        name = _word_before(skel, open_paren)
        if name == "use" and lang == "php":
            before = skel[:open_paren].rstrip()
            if before.endswith(")"):
                open_paren = match_backward(skel, len(before) - 1)
                name = _word_before(skel, open_paren)
        if name in KEYWORDS_BEFORE_PAREN or not name:
            continue
        found[at] = (at, match_forward(skel, at), "{closure}" if name == "function" else name)
    pattern = r"\bfn\b[^;{}]*?=>" if lang == "php" else r"=>"
    for m in re.finditer(pattern, skel):
        k = m.end()
        while k < len(skel) and skel[k].isspace():
            k += 1
        if k < len(skel) and skel[k] != "{":
            found[k] = (k, _expression_end(skel, k), "{arrow-expression}")
    return sorted(found.values())


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1
