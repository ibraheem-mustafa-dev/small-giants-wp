"""Keyed call returns (used by wf_channel.ChannelAnalyser.flow).

`$r = f( $a, $v )` where `f` returns array literals
(`return array( 'before' => $before, 'beforeCart' => $before_cart );`) carries a
value passed at parameter i only under the keys whose value depends on that
parameter: by data flow, or because a block the parameter guards writes the
key's variable (`if ( $index < $before_count ) { $before .= $markup; }`). A
function that returns anything other than array literals is unknown (`None`),
and the caller taints the whole result as before.
"""
from __future__ import annotations

import re

from wf_php import PhpText, split_arg_spans

RETURN_HEAD_RE = re.compile(r"^\s*return\b")
ARRAY_AT_RE = re.compile(r"\s*(array\s*\(|\[)")
PAIR_RE = re.compile(r"""\s*(['"])([^'"]+)\1\s*=>""")
WRITE_HEAD_RE = re.compile(r"^\s*\$(\w+)\s*(?:\[[^\]]*\]\s*)?(?:\.=|\+=|-=|\?\?=|=(?!=|>))")
VAR_RE = re.compile(r"\$(\w+)")
FOREACH_VARS_RE = re.compile(r"foreach\s*\((.*?)\bas\s+(?:\$(\w+)\s*=>\s*)?&?\$(\w+)", re.S)
# The callee of an assignment's right-hand side: `f(`, `\f(`, `Cls::f(`.
CALL_HEAD_RE = re.compile(r"\s*(?:\\?[A-Za-z_][\w\\]*::)?\\?(\w+)\s*\(")


class KeyedReturns:
    def __init__(self, analyser) -> None:
        self.an = analyser
        self._returned: dict[str, dict[str, set[str]] | None] = {}
        self._keys: dict[tuple[str, int], set[str] | None] = {}

    def returned(self, fname: str) -> dict[str, set[str]] | None:
        """key -> variables its value reads, over every top-level `return` of the
        function; None when one returns anything but an array literal of pairs."""
        if fname in self._returned:
            return self._returned[fname]
        from wf_channel import _scope_of

        body: PhpText = self.an.index.funcs[fname][2]
        top = (0, len(body.src))
        out: dict[str, set[str]] | None = {}
        seen = False
        for p in body.stmt_starts(0, len(body.src)):
            s, e = body.stmt_span(p)
            stmt = body.src[s:e]
            rm = RETURN_HEAD_RE.match(stmt)
            if not rm or _scope_of(body, s) != top:
                continue
            seen = True
            am = ARRAY_AT_RE.match(stmt, rm.end())
            spans = split_arg_spans(stmt, am.end() - 1) if am else []
            pairs = [(PAIR_RE.match(stmt, a), a, b) for a, b in spans]
            if not am or not pairs or not all(km for km, _a, _b in pairs):
                out = None
                break
            for km, _a, b in pairs:
                out.setdefault(km.group(2), set()).update(VAR_RE.findall(stmt, km.end(), b))
        self._returned[fname] = out if seen else None
        return self._returned[fname]

    def keys_for(self, fname: str, idx: int) -> set[str] | None:
        """The returned keys a value passed at parameter `idx` reaches; None when unknown."""
        memo = (fname, idx)
        if memo in self._keys:
            return self._keys[memo]
        self._keys[memo] = None   # a recursive call meets "unknown"
        returned = self.returned(fname)
        _f, pnames, body = self.an.index.funcs[fname]
        if returned is None or idx >= len(pnames) or not pnames[idx]:
            return None
        from wf_channel import var_refs
        from wf_tokens import Channel

        p = pnames[idx]
        taint: dict = {}
        seeds = var_refs(body, p, -1, None)
        if seeds:
            self.an.flow(body, seeds, "", Channel(), taint={p: None}, taint_out=taint)
        keys = {k for k, used in returned.items() if used & self._dependents(body, set(taint) | {p})}
        self._keys[memo] = keys
        return keys

    def _dependents(self, body: PhpText, dep: set[str]) -> set[str]:
        """Close `dep` over the function: a write (`=`, `.=`, `[] =`, …) whose
        statement reads a dependent variable, every write inside a block a dependent
        variable guards, and the variables of a `foreach` over a dependent one. Wider
        than the value flow on purpose (accumulators count), so a key is never missed."""
        dep = set(dep)
        stmts = []
        for q in body.stmt_starts(0, len(body.src)):
            s, e = body.stmt_span(q)
            stmts.append((q, s, e, body.src[s:e]))
        for _round in range(6):
            grown = False
            for q, s, e, stmt in stmts:
                used = set(VAR_RE.findall(stmt))
                if not dep & used:
                    continue
                targets: set[str] = set()
                wm = WRITE_HEAD_RE.match(stmt)
                if wm and dep & set(VAR_RE.findall(stmt, wm.end())):
                    targets.add(wm.group(1))
                fm = FOREACH_VARS_RE.search(stmt)
                if fm:
                    targets |= {v for v in fm.groups()[1:] if v}
                if self.an.is_gate(stmt):
                    block = body.block_after(q)
                    for w in body.stmt_starts(e - 1, e - 1 + len(block)) if block else ():
                        ws, we = body.stmt_span(w)
                        bm = WRITE_HEAD_RE.match(body.src[ws:we])
                        if bm:
                            targets.add(bm.group(1))
                if targets - dep:
                    dep |= targets
                    grown = True
            if not grown:
                break
        return dep
