"""PHP source model: comment stripping, statement bounds, literal and variable
indexes, the function/class index and call reach.

Everything is regex and brace matching over comment-stripped text (offsets are
kept, so a position in the stripped text is a position in the file). A `PhpText`
is built once per file or function body and shared by every attribute that
touches it, which is what keeps the per-attribute flow analysis fast.
"""
from __future__ import annotations

import bisect
import re
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

LITERAL_RE = re.compile(r"""(['"])([A-Za-z_][A-Za-z0-9_]*)\1""")
VAR_RE = re.compile(r"\$([A-Za-z_]\w*)")
FUNC_RE = re.compile(r"function\s+&?\s*(\w+)\s*\(([^)]*)\)[^{;]*\{")
CLASS_RE = re.compile(r"\bclass\s+(\w+)")
CALL_RE = re.compile(r"\b([A-Za-z_]\w*)\s*\(")
STATIC_RE = re.compile(r"\b([A-Z]\w*)::(\w+)\s*\(")
PHP_KEYWORDS = frozenset(
    "if elseif foreach for while switch array isset empty function return list echo print "
    "unset catch fn match static new and or not".split()
)


def read(path) -> str:
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError:
        return ""


STRING_RE = re.compile(r"""'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*\"""", re.S)
COMMENT_OR_STRING_RE = re.compile(r"""'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|/\*.*?(?:\*/|\Z)|//[^\n]*|#(?!\[)[^\n]*""", re.S)
BOUND_RE = re.compile(r"[;{}]")
BRACE_RE = re.compile(r"[{}]")


def _blank_comment(m: re.Match) -> str:
    t = m.group(0)
    if t[0] in "'\"":
        return t
    if t.startswith("/*"):
        return re.sub(r"[^\n]", " ", t)
    close = t.find("?>")  # a line comment ends where the PHP block closes
    return " " * len(t) if close == -1 else " " * close + t[close:]


def strip_php_comments(src: str) -> str:
    """Blank `//`, `#` and `/* */` comments outside string literals, keeping offsets."""
    return COMMENT_OR_STRING_RE.sub(_blank_comment, src)


def mask_strings(src: str) -> str:
    """String-literal contents blanked (quotes and length kept)."""
    return STRING_RE.sub(lambda m: m.group(0)[0] + " " * (len(m.group(0)) - 2) + m.group(0)[-1], src)


def brace_body(src: str, open_idx: int, mask: str | None = None) -> str:
    """The `{ … }` block starting at `open_idx` (braces inside strings ignored)."""
    mask = mask if mask is not None else mask_strings(src)
    depth = 0
    for m in BRACE_RE.finditer(mask, open_idx):
        depth += 1 if m.group(0) == "{" else -1
        if depth == 0:
            return src[open_idx : m.end()]
    return src[open_idx:]


def split_arg_spans(src: str, open_paren: int) -> list[tuple[int, int]]:
    """(start, end) offsets of the top-level arguments of the call or array literal
    whose opening bracket sits at `open_paren`."""
    depth = 0
    i, n = open_paren, len(src)
    spans: list[tuple[int, int]] = []
    start = open_paren + 1
    quote = None
    while i < n:
        c = src[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                if src[start:i].strip():
                    spans.append((start, i))
                return spans
        elif c == "," and depth == 1:
            spans.append((start, i))
            start = i + 1
        i += 1
    return spans


def split_args(src: str, open_paren: int) -> list[str]:
    """Top-level argument strings of the call whose `(` sits at `open_paren`."""
    depth = 0
    i = open_paren
    args: list[str] = []
    cur: list[str] = []
    quote = None
    n = len(src)
    while i < n:
        c = src[i]
        if quote:
            cur.append(c)
            if c == "\\" and i + 1 < n:
                cur.append(src[i + 1])
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ('"', "'"):
            quote = c
            cur.append(c)
        elif c in "([{":
            depth += 1
            if depth > 1:
                cur.append(c)
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                args.append("".join(cur).strip())
                return args
            cur.append(c)
        elif c == "," and depth == 1:
            args.append("".join(cur).strip())
            cur = []
        else:
            cur.append(c)
        i += 1
    return args


class PhpText:
    """One comment-stripped PHP text with statement bounds and token indexes."""

    __slots__ = ("name", "path", "src", "mask", "_bounds", "literals", "variables", "_stmt_cache", "cache")

    def __init__(self, src: str, name: str = "", path: str = "", mask: str | None = None) -> None:
        self.name = name
        self.path = path
        self.src = src
        self.mask = mask if mask is not None else mask_strings(src)
        # Statement boundaries: positions of `;`, `{` and `}` outside strings.
        self._bounds = [-1] + [m.start() for m in BOUND_RE.finditer(self.mask)] + [len(src)]
        lits: dict[str, list[int]] = defaultdict(list)
        for m in LITERAL_RE.finditer(src):
            lits[m.group(2)].append(m.start())
        self.literals = dict(lits)
        vars_: dict[str, list[int]] = defaultdict(list)
        for m in VAR_RE.finditer(src):
            vars_[m.group(1)].append(m.start())
        self.variables = dict(vars_)
        self._stmt_cache: dict[int, tuple[int, int]] = {}
        self.cache: dict[str, object] = {}  # per-text derived facts (function spans, dynamic-key sites)

    def stmt_span(self, pos: int) -> tuple[int, int]:
        """(start, end) of the statement holding `pos`; end includes the terminator."""
        k = bisect.bisect_left(self._bounds, pos)
        if k in self._stmt_cache:
            return self._stmt_cache[k]
        start = self._bounds[k - 1] + 1 if k > 0 else 0
        end = self._bounds[k] if k < len(self._bounds) else len(self.src)
        span = (start, min(end + 1, len(self.src)))
        self._stmt_cache[k] = span
        return span

    def stmt(self, pos: int) -> str:
        s, e = self.stmt_span(pos)
        return self.src[s:e]

    def block_after(self, pos: int) -> str:
        """The `{ … }` body opened by the statement at `pos` (an `if`/`foreach` head)."""
        _s, e = self.stmt_span(pos)
        if e - 1 < len(self.src) and self.src[e - 1] == "{":
            return brace_body(self.src, e - 1, self.mask)
        return ""


class PhpIndex:
    """Function and class index over every plugin PHP file, plus per-file texts."""

    def __init__(self, files: list[Path]) -> None:
        self.files: dict[str, PhpText] = {}
        self.funcs: dict[str, tuple[str, list[str], PhpText]] = {}
        self.classes: dict[str, PhpText] = {}
        for f in sorted(files):
            raw = strip_php_comments(read(f))
            key = Path(f).as_posix()
            text = PhpText(raw, name=Path(f).name, path=key)
            self.files[key] = text
            mask = text.mask
            for m in CLASS_RE.finditer(mask):
                ob = mask.find("{", m.end())
                if ob != -1 and m.group(1) not in self.classes:
                    body = brace_body(raw, ob, mask)
                    self.classes[m.group(1)] = PhpText(body, name=m.group(1), path=key, mask=mask[ob:ob + len(body)])
            for m in FUNC_RE.finditer(mask):
                name = m.group(1)
                if name in self.funcs:
                    continue
                pnames = []
                for p in m.group(2).split(","):
                    mm = re.search(r"\$(\w+)", p)
                    pnames.append(mm.group(1) if mm else "")
                ob = m.end() - 1
                body = brace_body(raw, ob, mask)
                self.funcs[name] = (key, pnames, PhpText(body, name=name, path=key, mask=mask[ob:ob + len(body)]))
        self._reach_cache: dict[str, tuple[list[PhpText], frozenset]] = {}

    def reach(self, start_texts: list[PhpText], max_depth: int = 6) -> tuple[list[PhpText], set[str]]:
        """Texts reachable from `start_texts` by function and static-method calls."""
        texts = list(start_texts)
        seen: set[str] = set()
        queue = [(t, 0) for t in start_texts]
        while queue:
            t, d = queue.pop()
            if d >= max_depth:
                continue
            for m in STATIC_RE.finditer(t.src):
                cls = m.group(1)
                if cls in self.classes and cls not in seen:
                    seen.add(cls)
                    body = self.classes[cls]
                    texts.append(body)
                    queue.append((body, d + 1))
            for name in _call_names(t.src):
                if name in seen or name not in self.funcs:
                    continue
                seen.add(name)
                body = self.funcs[name][2]
                texts.append(body)
                queue.append((body, d + 1))
        return texts, seen


@lru_cache(maxsize=None)
def _call_names_cached(src: str) -> tuple[str, ...]:
    return tuple(sorted({m.group(1) for m in CALL_RE.finditer(src) if m.group(1) not in PHP_KEYWORDS}))


def _call_names(src: str) -> tuple[str, ...]:
    return _call_names_cached(src)


@lru_cache(maxsize=None)
def rx(pattern: str, flags: int = 0) -> re.Pattern:
    """Compiled-pattern cache without the `re` module's 512-entry limit (the flow
    analysis builds one pattern per variable and attribute)."""
    return re.compile(pattern, flags)


def lower_first(s: str) -> str:
    return s[:1].lower() + s[1:]


LOOP_HEAD_RE = re.compile(r"foreach\s*\(\s*(.*?)\s+as\s+(?:\$(\w+)\s*=>\s*)?&?\$(\w+)\s*\)", re.S)
ARRAY_LIT_RE = re.compile(r"\s*(?:array\s*\(|\[)")
KEY_LIT_RE = re.compile(r"""\s*(['"])([^'"]*)\1\s*(=>)?""")


def _array_open(src: str, at: int) -> int | None:
    m = ARRAY_LIT_RE.match(src, at)
    return m.end() - 1 if m else None


def loop_literals(src: str, mask: str, pos: int, var: str) -> list[str]:
    """The literal strings `$var` takes at `pos` when it is the key or value of an
    enclosing `foreach` over an array literal (inline, or a variable assigned one
    earlier): `foreach ( array( 'title' => '.t' ) as $prefix => $sel )` gives
    ['title'] for `$prefix`; a list of tuples gives each tuple's first element."""
    for m in reversed(list(LOOP_HEAD_RE.finditer(mask, 0, pos))):
        key_var, val_var = m.group(2), m.group(3)
        if var not in (key_var, val_var):
            continue
        ob = mask.find("{", m.end())
        if ob == -1 or len(brace_body(src, ob, mask)) + ob < pos:
            continue
        expr_at = m.start(1)
        open_at = _array_open(src, expr_at)
        vm = re.match(r"\$(\w+)\s*$", src[m.start(1):m.end(1)])
        if open_at is None and vm:
            assigns = list(re.finditer(r"\$" + re.escape(vm.group(1)) + r"\s*=(?!=|>)", mask[:m.start()]))
            if assigns:
                open_at = _array_open(src, assigns[-1].end())
        if open_at is None:
            return []
        out = []
        for s, e in split_arg_spans(src, open_at):
            km = KEY_LIT_RE.match(src, s)
            if var == key_var:
                if km and km.group(3):
                    out.append(km.group(2))
            elif km and not km.group(3):
                out.append(km.group(2))
            else:
                inner = _array_open(src, s)
                if inner is not None:
                    first = split_arg_spans(src, inner)
                    fm = KEY_LIT_RE.match(src, first[0][0]) if first else None
                    if fm and not fm.group(3):
                        out.append(fm.group(2))
        return out
    return []
