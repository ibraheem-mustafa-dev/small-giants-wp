"""Front-end value flow (links L4 and L5, and the tokens L6/L7/C1/B3 read).

For one attribute the seeds are every place a reached PHP text names it: the
quoted literal, a dynamic key `$attributes[ $k . 'Suffix' ]` whose prefix
literal is present, or a block-context key. From each seed the value is followed
to the end of its function, with no hop limit:

- a plain assignment taints its target; when the right-hand side is an array
  literal of several `'key' => value` pairs, only the pair holding the value is
  tainted (`$params['showTitle']`), so an options array never spreads one
  setting's taint to every other key;
- accumulator writes (`$a[] =`, `$a['k'] =`, `.=`) are read for their own tokens
  but do not taint the accumulator, which every setting shares;
- `foreach` over a tainted value taints its key and value;
- a tainted argument to an indexed function analyses that function with the
  parameter seeded (memoised, recursion-guarded), keyed when an options array
  is passed whole;
- a function whose tainted value reaches `return` seeds every call site (the
  caller walk lives in wf_frontend.FrontEnd.flow_texts);
- an `if`/`while`/`switch` on a tainted value is a read, and the block it guards
  counts as a channel (GATE) when it emits tokens.
"""
from __future__ import annotations

import re

from wf_php import PhpIndex, PhpText, brace_body, rx, split_arg_spans
from wf_tokens import CP_SET_RE, CSS_KEY_RE, Channel, DECL_RE, TokenReader, blank_index

# A statement may open with template HTML (`?> <div …> <?php`); heads are matched after it.
HEAD = r"^\s*(?:(?:\?>.*?)?<\?php\s*)?"
GATE_HEAD_RE = re.compile(HEAD + r"(?:\}\s*)?(?:if|elseif|else\s+if|while|switch|case)\b", re.S)
# `$v =` taints v; `$v['k'] =` taints only key k; `$v[ $k ] =` taints v; `$v[] =` and `.=`
# (accumulators every setting appends to) taint nothing beyond their own statement.
ASSIGN_RE = re.compile(HEAD + r"\$(\w+)\s*(?:\[([^\]]*)\]\s*)?(?:\?\?=|=(?!=|>))", re.S)
GATE_BODY_MAX = 800
FOREACH_RE = re.compile(r"foreach\s*\((.*?)\bas\s+(?:\$(\w+)\s*=>\s*)?&?\$(\w+)", re.S)
PREG_OUT_RE = re.compile(r"preg_match(?:_all)?\s*\([^;]*?,\s*\$(\w+)\s*\)")
TARGET_RE = re.compile(HEAD + r"\$(\w+)\s*(?:\[[^\]]*\]\s*)?(?:\.=|\?\?=|\+=|=(?!=|>))", re.S)
LIST_ASSIGN_RE =re.compile(HEAD + r"(?:list\s*\(|\[)([^=;]*?)[\])]\s*=(?!=|>)", re.S)
RETURN_RE = re.compile(HEAD + r"return\b", re.S)
RETURN_IN_BODY_RE = re.compile(r"\breturn\b")
FUNC_SPAN_RE = re.compile(r"\bfunction\b\s*&?\s*\w*\s*\(([^)]*)\)\s*(?:use\s*\(([^)]*)\))?[^{;]*\{")
CALL_NAME_RE = re.compile(r"\b([a-z_]\w*)\s*\(")
ARRAY_OPEN_RE = re.compile(r"\s*(?:\(\s*\w+\s*\)\s*)?(array\s*\(|\[)")
PAIR_KEY_RE = re.compile(r"""\s*(['"])([^'"]+)\1\s*=>""")
DYN_KEY_RE = re.compile(r"""\$\w+\s*\.\s*['"]([A-Z][A-Za-z0-9]*)['"]""")

def func_spans(t: PhpText) -> list[tuple[int, int, set]]:
    """Function and closure body spans in a text, with each closure's `use` list."""
    if "fspans" not in t.cache:
        spans = []
        for m in FUNC_SPAN_RE.finditer(t.mask):
            body = brace_body(t.src, m.end() - 1, t.mask)
            spans.append((m.end() - 1, m.end() - 1 + len(body), set(re.findall(r"\$(\w+)", m.group(2) or ""))))
        t.cache["fspans"] = spans
    return t.cache["fspans"]


def _scope_of(t: PhpText, pos: int) -> tuple[int, int]:
    best = (0, len(t.src))
    for s, e, _u in func_spans(t):
        if s <= pos < e and (e - s) < (best[1] - best[0]):
            best = (s, e)
    return best


def var_refs(t: PhpText, var: str, after: int, key: str | None) -> list[int]:
    """Reads of `$var` (or `$var['key']`) after `after`, in the scope where it was
    assigned (closures that `use` it included)."""
    s, e = _scope_of(t, after)
    keyed = rx(r"\$" + re.escape(var) + r"""\s*\[\s*['"]""" + re.escape(key) + r"""['"]\s*\]""") if key else None
    out = []
    for p in t.variables.get(var, ()):
        if p <= after or not (s <= p < e):
            continue
        inner = _scope_of(t, p)
        if inner != (s, e) and not any(fs == inner[0] and var in u for fs, _fe, u in func_spans(t)):
            continue
        if keyed is None or keyed.match(t.src, p) or not rx(r"\$" + re.escape(var) + r"\s*\[").match(t.src[p:p + len(var) + 8]):
            out.append(p)
    return out


def dyn_sites(t: PhpText) -> dict[str, list[int]]:
    if "dyn" not in t.cache:
        d: dict[str, list[int]] = {}
        for m in DYN_KEY_RE.finditer(t.src):
            d.setdefault(m.group(1), []).append(m.start())
        t.cache["dyn"] = d
    return t.cache["dyn"]


def attr_seeds(t: PhpText, attr: str) -> list[int]:
    """`'attr'`, or `$k . 'Suffix'` where attr = prefix + Suffix and the prefix literal is present."""
    seeds = list(t.literals.get(attr, ()))
    sites = dyn_sites(t)
    if sites:
        for i in range(1, len(attr)):
            if attr[i].isupper():
                sfx = attr[i:]
                if sfx in sites and attr[:i] in t.literals:
                    seeds.extend(sites[sfx])
    return sorted(set(seeds))


def quoted_seeds(t: PhpText, key: str) -> list[int]:
    return [m.start() for m in re.finditer(r"""(['"])""" + re.escape(key) + r"""\1""", t.src)]


class ChannelAnalyser:
    def __init__(self, index: PhpIndex, block_slugs: set[str]) -> None:
        self.index = index
        self.block_slugs = block_slugs
        self._emits: dict[str, bool] = {}
        self._param_memo: dict[tuple, Channel] = {}
        self._stack: set[tuple] = set()
        self.reader = TokenReader(self.emits_css, block_slugs)

    def emits_css(self, fname: str) -> bool:
        if fname not in self._emits:
            self._emits[fname] = False
            entry = self.index.funcs.get(fname)
            if entry is not None:
                src = blank_index(entry[2].src)
                self._emits[fname] = bool(DECL_RE.search(src) or CSS_KEY_RE.search(src) or CP_SET_RE.search(src)
                                          or "wp_style_engine_get_styles" in src)
        return self._emits[fname]

    @staticmethod
    def _refs(stmt: str, attr: str, taint: dict) -> list[tuple[int, str, str | None, bool]]:
        """(offset, var, key, keyed_read) for each tainted reference in `stmt`;
        var '' marks a direct read of the attribute."""
        out = []
        head = TARGET_RE.match(stmt)
        target_at = head.start(1) - 1 if head else -1  # the written variable is not a read
        for var, keys in taint.items():
            for m in rx(r"\$" + re.escape(var) + r"\b").finditer(stmt):
                if m.start() == target_at:
                    continue
                if keys is None:
                    out.append((m.start(), var, None, True))
                    continue
                km = re.match(r"""\s*\[\s*['"]([^'"]+)['"]\s*\]""", stmt[m.end():])
                if km:
                    if km.group(1) in keys:
                        out.append((m.start(), var, km.group(1), True))
                elif not stmt[m.end():].lstrip().startswith("["):
                    out.extend((m.start(), var, k, False) for k in keys)
        if attr:
            for m in rx(r"""(['"])""" + re.escape(attr) + r"""\1""").finditer(stmt):
                out.append((m.start(), "", None, True))
        return out

    def flow(self, t: PhpText, seeds: list[int], attr: str, ch: Channel, taint: dict | None = None) -> bool:
        """Follow the value from `seeds` through `t`; True if it reaches a `return`."""
        done: set[tuple[int, int]] = set()
        taint = dict(taint or {})
        work = list(seeds)
        returns = False
        while work:
            pos = work.pop()
            span = t.stmt_span(pos)
            if span in done:
                continue
            done.add(span)
            stmt = t.src[span[0]:span[1]]
            refs = self._refs(stmt, attr, taint)
            if not refs and pos not in seeds:
                continue
            offs = [r[0] for r in refs] or [pos - span[0]]
            ch.stmts += 1
            ch.read = True
            self.reader.read(stmt, attr, offs, ch)
            if RETURN_RE.match(stmt):
                returns = True
            if GATE_HEAD_RE.match(stmt):
                body = t.block_after(pos)
                if body:
                    sub = Channel()
                    self.reader.read(body, attr, [], sub)
                    if sub.kinds():
                        ch.gate = True
                        if len(body) <= GATE_BODY_MAX:
                            sub.read = False
                            ch.gate_decl |= sub.decl
                            sub.decl = False
                            ch.merge(sub)  # a short guarded block is the toggle's own output
                    if RETURN_IN_BODY_RE.search(body):
                        returns = True  # the function's result depends on the value
            new: list[tuple[str, str | None]] = []
            for pm in PREG_OUT_RE.finditer(stmt):
                if any(pm.start() <= o < pm.end() for o in offs):
                    new.append((pm.group(1), None))  # preg_match( $re, <value>, $out ) fills $out
            m = ASSIGN_RE.match(stmt)
            if m and m.group(1) not in ("attributes", "this"):
                index = m.group(2)
                if index is None:
                    if not rx(r"\$" + re.escape(m.group(1)) + r"\b").search(stmt, m.end()):
                        # `$x = array_merge( $x, … )` accumulates like `$x[] =`; anything else taints x.
                        new.append((m.group(1), self._pair_key(stmt, m.end(), offs)))
                elif index.strip():
                    lit = re.fullmatch(r"""\s*(['"])([^'"]+)\1\s*""", index)
                    new.append((m.group(1), lit.group(2) if lit else None))
            fm = FOREACH_RE.search(stmt)
            if fm:
                new += [(v, None) for v in (fm.group(2), fm.group(3)) if v]
            lm = LIST_ASSIGN_RE.match(stmt)
            if lm:
                new += [(v, None) for v in re.findall(r"\$(\w+)", lm.group(1))]
            for name in set(CALL_NAME_RE.findall(stmt)):
                if name in self.index.funcs:
                    self._into_callee(name, stmt, refs, ch)
            for var, key in new:
                cur = taint.get(var, set())
                if cur is None:
                    continue
                if key is None:
                    taint[var] = None
                elif key in cur:
                    continue
                else:
                    taint[var] = cur | {key}
                work.extend(var_refs(t, var, span[0], key))
        return returns

    @staticmethod
    def _pair_key(stmt: str, rhs_at: int, offs: list[int]) -> str | None:
        """The array key holding the tainted value when the right-hand side is a
        multi-pair array literal, else None (whole-variable taint)."""
        am = ARRAY_OPEN_RE.match(stmt, rhs_at)
        if not am:
            return None
        spans = split_arg_spans(stmt, am.end() - 1)
        if len(spans) < 2:
            return None
        for s, e in spans:
            if any(s <= o < e for o in offs):
                km = PAIR_KEY_RE.match(stmt, s)
                return km.group(2) if km else None
        return None

    def _into_callee(self, fname: str, stmt: str, refs: list, ch: Channel) -> None:
        _f, pnames, _body = self.index.funcs[fname]
        for m in rx(r"\b" + re.escape(fname) + r"\s*\(").finditer(stmt):
            for i, (s, e) in enumerate(split_arg_spans(stmt, m.end() - 1)):
                if i >= len(pnames) or not pnames[i] or pnames[i] == "attributes":
                    continue
                for off, var, key, keyed_read in refs:
                    if s <= off < e and var:
                        ch.merge(self.param_channel(fname, i, None if keyed_read else key))

    def param_channel(self, fname: str, idx: int, key: str | None = None) -> Channel:
        memo = (fname, idx, key)
        if memo in self._param_memo:
            return self._param_memo[memo]
        if memo in self._stack or len(self._stack) > 8:
            return Channel()
        self._stack.add(memo)
        _f, pnames, body = self.index.funcs[fname]
        sub = Channel()
        p = pnames[idx]
        seeds = var_refs(body, p, -1, key)
        if seeds:
            self.flow(body, seeds, "", sub, taint={p: ({key} if key else None)})
        sub.read = False
        self._stack.discard(memo)
        self._param_memo[memo] = sub
        return sub
