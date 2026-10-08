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

from wf_php import PhpIndex, PhpText, brace_body, loop_literals, rx, split_arg_spans
from wf_returns import CALL_HEAD_RE, KeyedReturns
from wf_tokens import (ARRAY_KW_RE, CP_SET_RE, CSS_KEY_RE, CSS_PROPS, DECL_RE, FWD_ATTRS_RE, FWD_BLOCK_RE, Channel, TokenReader,
                       blank_index, constant_paint_props, open_brackets, paint_prop)

# A map onto CSS property names (`'topLeft' => 'border-top-left-radius'`): a helper that builds its declarations from
# such a map emits CSS though no `prop:` literal appears in its source.
PROP_MAP_RE = re.compile(r"""=>\s*['"]""" + CSS_PROPS + r"""['"]""")
# The join that turns a mapped property name into a declaration (`$property . ':' . $value`). Both are required: a
# map whose values merely look like CSS words (a link type, a token name) builds no declaration.
DYN_DECL_RE = re.compile(r"""\.\s*['"]:['"]\s*\.""")
# A parameter that names the declaration (`$prefix . $side . ':' . $value`): a helper that prints one custom property
# per set side or corner under a caller-supplied name builds a declaration from its argument.
PARAM_DECL_RE_TEMPLATE = r"""\$%s\b[^;]*\.\s*['"]:['"]\s*\."""
# An SGS helper called from a function body; a thin wrapper emits CSS when the helper it calls does.
SGS_CALL_RE = re.compile(r"\b(sgs_\w+)\s*\(")

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
ATTR_INDEX_BEFORE_RE = re.compile(r"""(?:\$\w*attr\w*|\$atts|\[\s*['"]attrs['"]\s*\])\s*\[\s*$""")
SEL_VAR_RE = re.compile(r"\$(\w+)")
NEW_RE = re.compile(r"\s*new\s+[\\\w]")
DYN_KEY_RE = re.compile(r"""\$\w+\s*\.\s*['"]([A-Z][A-Za-z0-9]*)['"]""")
# A query's result is the content a setting selects (which posts, products, terms), not
# the setting's value: `$q = new WP_Query( $args )` does not carry `$args`'s taint on.
QUERY_CALL_RE = re.compile(
    r"\s*(?:new\s+\\?(?:WP_Query|WC_Product_Query|WP_Term_Query|WP_Comment_Query|WP_User_Query)\b"
    r"|\\?(?:get_posts|get_pages|get_terms|get_comments|get_users|wc_get_products|wc_get_orders|wp_get_nav_menu_items|query_posts)\s*\("
    r"|\\?(?:\w+\\)*\w*Query::\w+\s*\()")
# The same calls, read backwards from the `(` that opens their arguments.
QUERY_CALLEE_RE = re.compile(
    r"(?:new\s+\\?(?:WP_Query|WC_Product_Query|WP_Term_Query|WP_Comment_Query|WP_User_Query)"
    r"|\\?(?:get_posts|get_pages|get_terms|get_comments|get_users|wc_get_products|wc_get_orders|wp_get_nav_menu_items|query_posts)"
    r"|\\?(?:\w+\\)*\w*Query::\w+)\s*$")
# Array keys of a query's arguments: which rows come back, how many, in what order.
QUERY_KEY_RE = re.compile(
    r"""['"](?:orderby|order|paged|posts_per_page|numberposts|number|offset|post__in|post__not_in|meta_key|meta_value|"""
    r"""hide_empty|tax_query|meta_query|post_type|taxonomy)['"]\s*=>""")

def reaches_query(stmt: str, offs: list[int]) -> bool:
    """True when a reference sits in the arguments of a query/collection call, or in the
    value of a query-argument key (`'orderby' => $orderby`)."""
    for off in offs:
        for ob in open_brackets(stmt, off):
            if QUERY_CALLEE_RE.search(stmt, 0, ob):
                return True
            for s, e in split_arg_spans(stmt, ob):
                if s <= off < e and QUERY_KEY_RE.match(stmt, s + len(stmt[s:e]) - len(stmt[s:e].lstrip())):
                    return True
    return False


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
        if keyed is None or keyed.match(t.src, p) or not rx(r"\$" + re.escape(var) + r"\s*\[").match(t.src, p):
            out.append(p)
        elif not rx(r"\$" + re.escape(var) + r"""\s*\[\s*['"]""").match(t.src, p) and key in dyn_index_keys(t, p + 1 + len(var), {key}):
            out.append(p)   # a dynamic index resolving to the key
    return out


DYN_INDEX_RE = re.compile(r"""\s*\[\s*\$(\w+)\s*(?:\.\s*['"]([A-Za-z0-9_-]+)['"]\s*)?\]""")


def dyn_index_keys(t: PhpText, at: int, keys: set[str]) -> set[str]:
    """The keys among `keys` a dynamic index at `at` (`[ $k ]`, `[ $p . 'Suffix' ]`) can
    name: a loop variable over literals gives those literals; a suffix concatenation
    gives the keys ending in that suffix. Anything else names none."""
    m = DYN_INDEX_RE.match(t.src, at)
    if not m:
        return set()
    if m.group(2):
        return {k for k in keys if k.endswith(m.group(2)) and len(k) > len(m.group(2))}
    return set(loop_literals(t.src, t.mask, at, m.group(1))) & keys


def dyn_sites(t: PhpText) -> dict[str, list[int]]:
    if "dyn" not in t.cache:
        d: dict[str, list[int]] = {}
        for m in DYN_KEY_RE.finditer(t.src):
            d.setdefault(m.group(1), []).append(m.start())
        t.cache["dyn"] = d
    return t.cache["dyn"]


def attr_seeds(t: PhpText, attr: str, own: bool = True) -> list[int]:
    """`'attr'`, or `$k . 'Suffix'` where attr = prefix + Suffix and the prefix literal is present.

    In the block's own files every quoted occurrence is a read, and so is a
    camelCase name anywhere (descriptor tables such as
    `'panelFooterBorderColour' => array( … )` in includes/). In a shared text (a
    helper or class the render reaches) a one-word name such as `'width'` or
    `'gap'` is mostly a CSS key or an option, so there only an attribute index
    (`$attributes['width']`, `$block['attrs']['width']`) or a call that passes the
    attributes alongside the name counts."""
    seeds = list(t.literals.get(attr, ()))
    if not own and attr.isalpha() and attr.islower():
        seeds = [p for p in seeds if ATTR_INDEX_BEFORE_RE.search(t.src, max(0, p - 48), p) or "$attributes" in t.stmt(p)]
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
        self.returns = KeyedReturns(self)

    def reset_memo(self) -> None:
        """Forget every parameter channel (a memo filled inside a recursion carries
        that recursion's cut, so a fresh start keeps results order-independent)."""
        self._param_memo.clear()
        self._stack.clear()

    def emits_css(self, fname: str) -> bool:
        if fname not in self._emits:
            self._emits[fname] = False
            entry = self.index.funcs.get(fname)
            if entry is not None:
                src = blank_index(entry[2].src)
                self._emits[fname] = bool(DECL_RE.search(src) or CSS_KEY_RE.search(src) or CP_SET_RE.search(src)
                                          or ( PROP_MAP_RE.search(src) and DYN_DECL_RE.search(src) )
                                          or any(re.search(PARAM_DECL_RE_TEMPLATE % re.escape(p.lstrip('$')), src) for p in entry[1])
                                          or "wp_style_engine_get_styles" in src)
                if not self._emits[fname] and entry[1]:
                    # A thin wrapper: it hands its own first argument straight to a helper that emits CSS. Only that
                    # hand-over counts, so a function that merely calls a CSS helper for something else does not turn
                    # every attribute it reads into a painted one. The False set above stops a recursion.
                    first = entry[1][0].lstrip('$')
                    self._emits[fname] = any(
                        callee != fname and re.search(r"\b" + re.escape(callee) + r"\s*\(\s*\$" + re.escape(first) + r"\b", src)
                        and self.emits_css(callee)
                        for callee in set(SGS_CALL_RE.findall(src)))
        return self._emits[fname]

    @staticmethod
    def _refs(stmt: str, attr: str, taint: dict, t: PhpText | None = None, base: int = 0) -> list[tuple[int, str, str | None, bool]]:
        """(offset, var, key, keyed_read) for each tainted reference in `stmt` (at
        `base` in `t`); var '' marks a direct read of the attribute."""
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
                elif stmt[m.end():].lstrip().startswith("["):
                    hit = dyn_index_keys(t, base + m.end(), keys) if t is not None else set()
                    out.extend((m.start(), var, k, True) for k in sorted(hit))
                else:
                    out.extend((m.start(), var, k, False) for k in keys)
        if attr:
            for m in rx(r"""(['"])""" + re.escape(attr) + r"""\1""").finditer(stmt):
                out.append((m.start(), "", None, True))
        return out

    def flow(self, t: PhpText, seeds: list[int], attr: str, ch: Channel, taint: dict | None = None,
             taint_out: dict | None = None) -> bool:
        """Follow the value from `seeds` through `t`; True if it reaches a `return`.
        `taint_out` receives the variables the value reached."""
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
            refs = self._refs(stmt, attr, taint, t, span[0])
            if not refs and pos not in seeds:
                continue
            offs = [r[0] for r in refs] or [pos - span[0]]
            ch.stmts += 1
            ch.read = True
            self.reader.read(stmt, attr, offs, ch)
            if reaches_query(stmt, offs):
                ch.query = True
            if ch.decl or ch.cps:
                self._selector_vars(t, span[0], stmt, taint, ch)
            if RETURN_RE.match(stmt):
                returns = True
            if GATE_HEAD_RE.match(stmt):
                body = t.block_after(pos)
                if body:
                    ch.gate_sites.add((t, span[1] - 1, span[1] - 1 + len(body)))
                    sub = Channel()
                    self.reader.read(body, attr, [], sub)
                    if sub.kinds():
                        ch.gate = True
                        if len(body) <= GATE_BODY_MAX:
                            sub.read = False
                            ch.gate_decl |= sub.decl
                            ch.gate_paint |= constant_paint_props(body)
                            sub.decl = False
                            sub.value_decl = False
                            ch.merge(sub)  # a short guarded block is the toggle's own output
                    if RETURN_IN_BODY_RE.search(body):
                        returns = True  # the function's result depends on the value
            if "blockName" in stmt:
                ch.forwards |= self._forwards(stmt, refs)
            new: list[tuple[str, str | None]] = []
            for pm in PREG_OUT_RE.finditer(stmt):
                if any(pm.start() <= o < pm.end() for o in offs):
                    new.append((pm.group(1), None))  # preg_match( $re, <value>, $out ) fills $out
            m = ASSIGN_RE.match(stmt)
            head, hoffs, at = stmt, offs, span[0]
            if not m and refs:
                # A closure inside an array literal splits the statement at its braces:
                # the assignment head sits before them (`$a = array( 'f' => function () { … }, 'k' => $v );`).
                ls, le = t.logical_span(span[0])
                if ls < span[0]:
                    head, hoffs, at = t.src[ls:le], [o + span[0] - ls for o in offs], ls
                    m = ASSIGN_RE.match(head)
            if m and m.group(1) not in ("attributes", "this") and not QUERY_CALL_RE.match(head, m.end()):
                index = m.group(2)
                if index is None:
                    if not rx(r"\$" + re.escape(m.group(1)) + r"\b").search(head, m.end()):
                        # `$x = array_merge( $x, … )` accumulates like `$x[] =`; anything else taints x.
                        key = self._pair_key(head, m.end(), hoffs)
                        if key is None and NEW_RE.match(head, m.end()):
                            key = self._enclosing_pair_key(head, hoffs)
                        keys = self._returned_keys(head, m.end(), hoffs) if key is None else None
                        if keys is None:
                            new.append((m.group(1), key))
                        else:
                            new += [(m.group(1), k) for k in sorted(keys)]
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
                work.extend(var_refs(t, var, at, key))
        if taint_out is not None:
            taint_out.update(taint)
        return returns

    @staticmethod
    def is_gate(stmt: str) -> bool:
        return bool(GATE_HEAD_RE.match(stmt))

    def _returned_keys(self, head: str, rhs_at: int, offs: list[int]) -> set[str] | None:
        """`$r = f( … $v … )` with `f` returning array literals: the keys the value
        reaches (wf_returns); None when the call is not that shape."""
        cm = CALL_HEAD_RE.match(head, rhs_at)
        if not cm or cm.group(1) not in self.index.funcs:
            return None
        spans = split_arg_spans(head, cm.end() - 1)
        # The call must be the whole right-hand side (`)` then `;`) and hold every reference.
        if not spans or head[spans[-1][1]:spans[-1][1] + 1] != ")" or head[spans[-1][1] + 1:].strip() not in ("", ";") \
                or not all(any(s <= o < e for s, e in spans) for o in offs):
            return None
        out: set[str] = set()
        for i, (s, e) in enumerate(spans):
            if any(s <= o < e for o in offs):
                keys = self.returns.keys_for(cm.group(1), i)
                if keys is None:
                    return None
                out |= keys
        return out

    def _selector_vars(self, t: PhpText, at: int, stmt: str, taint: dict, ch: Channel) -> None:
        """A selector held in a variable (`$sel = '.' . $uid . ' > .sgs-card';` then
        `sgs_hover_state_rules( $sel, $decl )`): the latest assignment of each
        untainted variable the emitting statement names, in the same scope, is read
        for its child-selector subjects."""
        scope = _scope_of(t, at)
        for name in set(SEL_VAR_RE.findall(stmt)) - set(taint) - {"attributes", "this"}:
            for p in reversed(t.variables.get(name, ())):
                if p >= at or not (scope[0] <= p < scope[1]):
                    continue
                s, e = t.stmt_span(p)
                text = t.src[s:e]
                am = ASSIGN_RE.match(text)
                if am and am.group(1) == name and am.group(2) is None:
                    child, inner = self.reader.child_selectors(text)
                    ch.child_sel |= child
                    ch.inner_sel |= inner
                    break

    @staticmethod
    def _forwards(stmt: str, refs: list) -> set[tuple[str, str]]:
        """(block, attribute) pairs a nested render forwards the value to:
        `render_block( array( 'blockName' => 'sgs/x', 'attrs' => array( 'k' => $v ) ) )`,
        or `'attrs' => $a` where `$a` carries the value under key `k`."""
        bm = FWD_BLOCK_RE.search(stmt)
        if not bm:
            return set()
        out: set[tuple[str, str]] = set()
        for am in FWD_ATTRS_RE.finditer(stmt):
            ob = open_brackets(stmt, am.start())
            if not ob:
                continue
            el = next(((s, e) for s, e in split_arg_spans(stmt, ob[-1]) if s <= am.start() < e), None)
            if el is None:
                continue
            arr = ARRAY_OPEN_RE.match(stmt, am.end())
            if arr:
                for s, e in split_arg_spans(stmt, arr.end() - 1):
                    km = PAIR_KEY_RE.match(stmt, s)
                    if km and any(s <= r[0] < e for r in refs):
                        out.add((bm.group(1), km.group(2)))
                continue
            for off, var, key, keyed_read in refs:
                if am.end() <= off < el[1] and var and key and not keyed_read:
                    out.add((bm.group(1), key))
        return out

    def control_paint(self, sites) -> bool:
        """Control dependence: a variable the guarded block reassigns (`$v = …`, not an
        accumulator; `$v` already assigned before the guard in the same scope, so the
        toggle switches an existing value rather than introducing its own content),
        followed to the end of its function, reaches a paint declaration or a custom
        property (a toggle that switches `$colour` to a computed contrast colour later
        written as `color:` paints)."""
        for t, s, e in sorted(sites, key=lambda x: (x[0].path, x[0].name, x[1])):
            scope = _scope_of(t, s)
            for p in t.stmt_starts(s, e):
                span = t.stmt_span(p)
                m = ASSIGN_RE.match(t.src[span[0]:span[1]])
                if not m or m.group(2) is not None or m.group(1) in ("attributes", "this"):
                    continue
                if not self._assigned_before(t, m.group(1), scope[0], s):
                    continue
                seeds = var_refs(t, m.group(1), span[0], None)
                if not seeds:
                    continue
                ctl = Channel()
                self.flow(t, seeds, "", ctl, taint={m.group(1): None})
                if (ctl.value_decl and any(paint_prop(x) for x in ctl.decl_props)) or ctl.cps:
                    return True
        return False

    @staticmethod
    def _assigned_before(t: PhpText, var: str, start: int, end: int) -> bool:
        """`$var = …` (or `$var ??=`) as a statement head in [start, end)."""
        for p in t.variables.get(var, ()):
            if start <= p < end:
                s, e = t.stmt_span(p)
                am = ASSIGN_RE.match(t.src[s:e])
                if am and am.group(1) == var and am.group(2) is None and s <= p < s + am.end():
                    return True
        return False

    @staticmethod
    def _enclosing_pair_key(stmt: str, offs: list[int]) -> str | None:
        """The pair key of the innermost multi-pair array literal holding the value
        (`new C( $a, array( 'align' => $v, … ) )` carries the value under 'align')."""
        if not offs:
            return None
        for ob in reversed(open_brackets(stmt, offs[0])):
            if stmt[ob] != "[" and not ARRAY_KW_RE.search(stmt[max(0, ob - 8):ob]):
                continue
            spans = split_arg_spans(stmt, ob)
            if len(spans) < 2:
                continue
            el = next(((s, e) for s, e in spans if s <= offs[0] < e), None)
            km = PAIR_KEY_RE.match(stmt, el[0]) if el else None
            return km.group(2) if km else None
        return None

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
                    if not s <= off < e:
                        continue
                    # A value inside an array-literal argument (`f( array( 'count' => $v, … ) )`,
                    # `$v` a tainted local or the attribute read itself) reaches the parameter
                    # under its pair's key only.
                    pair = self._pair_key(stmt, s, [off]) if keyed_read else None
                    if var or pair:
                        ch.merge(self.param_channel(fname, i, pair or (None if keyed_read else key)))

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
