"""identity_values -- the values a block's code settles (the resolving half of `identity_markup.py`).

`ValueReader` is mixed into `identity_markup.Extractor`:
- `resolve()` settles a dynamic tag or role in PHP: an assignment's literals, an in_array() allowlist, a block.json enum,
  a repo function's returns, or the literal a caller passes for an options key (`'tag' => 'details'`); a ternary's
  condition gives nothing. `_resolve_js()` does the same for a JS site: a parameter whose every call passes a literal, a
  destructured default plus what a repo caller passes, or a literal (or all-literal ternary) assignment.
- `_content()` reads content a setting, post field or function argument holds, printed through wp_kses_post,
  wp_kses_data, wp_kses, nl2br or wpautop: every tag and ARIA attribute the allowlist lets through (`_allow()` reads a
  literal allowlist, a variable, array_merge, a repo function's return or a core kses context from the pinned snapshot).
"""
from __future__ import annotations

import re
from functools import lru_cache

import identity_scan as S
import identity_sources as I

MARKUP = ("renders-tag", "renders-role", "renders-aria")


class ValueReader:
    # -- content a setting holds ---------------------------------------------------------------------------------------
    def _content(self, m, sink, u: I.Unit, units: list, slug: str, target: dict, label: str) -> None:
        """A call that prints content (wp_kses_post, wp_kses, wp_kses_data, nl2br, wpautop) of a value that comes from a
        setting, a function argument or a post field can print every tag the call lets through: `yes` for each tag and
        ARIA attribute of the allowlist; a `role` the allowlist accepts carries any value, so roles stay unknown."""
        if not self._tainted(sink.arg, u, 0):
            return
        where = f"{label}{u.key} \"{self._snippet(u.file, sink.pos)}\""
        if sink.kind == "nl2br":
            got = ({"br"}, set(), False, "nl2br")
        elif sink.kind == "wpautop":
            got = ({"p", "br"}, set(), False, "wpautop")
        elif sink.kind in ("wp_kses_post", "wp_kses_data"):
            got = self._kses_context("post" if sink.kind == "wp_kses_post" else "data")
        else:
            got = self._allow(sink.allow, u, 0)
        if got is None:
            for fact in MARKUP:
                m.unknown_all[fact].append(f"content printed through {sink.kind} with an allowlist that is not settled at {where}")
            return
        tags, arias, role_any, how = got
        for v in tags:
            target["renders-tag"].setdefault(v, f"content a setting holds, printed through {sink.kind} ({how}) at {where}")
        for v in arias:
            target["renders-aria"].setdefault(v, f"content a setting holds, printed through {sink.kind} ({how}) at {where}")
        if role_any:
            m.unknown_all["renders-role"].append(f"content printed through {sink.kind} ({how}) may carry any role at {where}")

    def _kses_context(self, ctx: str):
        spec = (self.core.get("kses") or {}).get(ctx)
        if not spec:
            return None
        return set(spec["tags"]), set(spec["aria"]), bool(spec["role"]), f"WordPress {self._core_version} kses '{ctx}', scripts/data/core-markup-facts.json"

    def _allow(self, expr: str, u: I.Unit, depth: int):
        """The tags, ARIA attributes and role allowance of a kses allowlist expression, or None when not settled."""
        expr = expr.strip()
        if depth > 8 or not expr:
            return None
        if re.fullmatch(r"null|false|array\s*\(\s*\)|\[\s*\]", expr):
            return set(), set(), False, "empty"
        m = re.fullmatch(r"'(post|data|strip|entities)'", expr)
        if m:
            return self._kses_context(m.group(1)) if m.group(1) in ("post", "data") else (set(), set(), False, f"kses '{m.group(1)}'")
        m = re.search(r"wp_kses_allowed_html\s*\(\s*'(post|data)'\s*\)", expr)
        if m and re.fullmatch(r"wp_kses_allowed_html\s*\(\s*'(post|data)'\s*\)", expr):
            return self._kses_context(m.group(1))
        if re.match(r"(array\s*\(|\[)", expr):
            return _array_allowlist(expr, _code_text(self.index.unit_tokens(u)))
        merge = re.fullmatch(r"array_merge\s*\((.*)\)", expr, re.S)
        if merge:
            parts, buf, d = [], [], 0
            for ch in merge.group(1):
                if ch in "([":
                    d += 1
                elif ch in ")]":
                    d -= 1
                if ch == "," and d == 0:
                    parts.append("".join(buf).strip()); buf = []
                    continue
                buf.append(ch)
            parts.append("".join(buf).strip())
            tags, arias, role_any, hows = set(), set(), False, []
            for part in [x for x in parts if x]:
                got = self._allow(part, u, depth + 1)
                if got is None:
                    return None
                tags |= got[0]; arias |= got[1]; role_any |= got[2]; hows.append(got[3])
            return tags, arias, role_any, " + ".join(hows)
        call = re.fullmatch(r"(?:\\?\w+\\)*([A-Za-z_]\w*)\s*\(\s*\)", expr)
        if call and call.group(1) in self.index.functions:
            tags, arias, role_any = set(), set(), False
            for fu in self.index.functions[call.group(1)]:
                text = _code_text(self.index.unit_tokens(fu))
                rets = [x.strip() for x in re.findall(r"\breturn\b(.*?);\s*(?:\}|$|//|/\*|\n)", text, re.S)]
                if not rets:
                    return None
                for r in rets:
                    got = self._allow(r, fu, depth + 1)
                    if got is None:
                        return None
                    tags |= got[0]; arias |= got[1]; role_any |= got[2]
            return tags, arias, role_any, f"{call.group(1)}()"
        v = re.fullmatch(r"\$([A-Za-z_]\w*)", expr)
        if not v:
            return None
        toks = self.index.unit_tokens(u)
        text = _code_text(toks)
        tags, arias, role_any, hows, found = set(), set(), False, [], False
        for am in re.finditer(r"\$" + v.group(1) + r"\s*=(?![=>])\s*(.*?);", text, re.S):
            found = True
            got = self._allow(am.group(1), u, depth + 1)
            if got is None:
                return None
            tags |= got[0]; arias |= got[1]; role_any |= got[2]; hows.append(got[3])
        for am in re.finditer(r"\$" + v.group(1) + r"\s*\[\s*'([a-z][a-z0-9-]*)'\s*\]\s*=(?!=)\s*(.*?);", text, re.S):
            found = True
            if S._tag_name(am.group(1)):
                tags.add(S._tag_name(am.group(1)))
            if re.search(r"'role'\s*=>", am.group(2)):
                role_any = True
            arias |= {a for a in re.findall(r"'(aria-[a-z]+)'\s*=>", am.group(2)) if a in S.ARIA_ATTRS}
        for am in re.finditer(r"\$" + v.group(1) + r"\s*\[\s*\$(\w+)\s*\]\s*=(?!=)\s*(.*?);", text, re.S):
            # A tag added under a computed key: settled only by a loop over a literal list, its value read from a
            # settled allowlist (`foreach ( array( 'svg', 'path' ) as $tag ) { $allowed[ $tag ] = $shared[ $tag ]; }`).
            found = True
            loop = re.search(r"foreach\s*\(\s*array\s*\(([^)]*)\)\s+as\s+\$" + am.group(1) + r"\s*\)", text)
            if not loop:
                return None
            tags |= {S._tag_name(t) for t in re.findall(r"'([^']*)'", loop.group(1)) if S._tag_name(t)}
            src = re.match(r"\s*(\$\w+)\s*\[", am.group(2))
            if src:
                got = self._allow(src.group(1), u, depth + 1)
                if got is None:
                    return None
                arias |= got[1]; role_any |= got[2]; hows.append(got[3])
        return (tags, arias, role_any, "; ".join(sorted(set(hows))) or "the allowlist built here") if found else None

    def _tainted(self, expr: str, u: I.Unit, depth: int) -> bool:
        """Whether a printed value can come from a setting, a post field or a function argument (content), rather than
        markup the code builds itself. InnerBlocks content ($content, $block_content) is its child blocks' markup."""
        if depth > 3:
            return True
        if re.search(r"\$(?:attributes|attrs|item|items|block|context)\b|\bget_\w+\s*\(|\$_(?:GET|POST|REQUEST)", expr):
            return True
        params = self._params(u)
        text = None
        for v in re.findall(r"\$([A-Za-z_]\w*)", expr):
            if v in ("content", "block_content", "this"):
                continue
            if v in params:
                return True
            text = text if text is not None else _code_text(self.index.unit_tokens(u))
            for am in re.finditer(r"\$" + v + r"\s*(?:\.|\?\?)?=(?![=>])\s*(.*?);", text, re.S):
                if self._tainted(am.group(1), u, depth + 1):
                    return True
        return False

    def _params(self, u: I.Unit) -> set:
        head = self.index.masked(u.file)[max(0, u.start - 600):u.start]
        m = list(re.finditer(r"function\s*&?\s*\w*\s*\(([^)]*)\)[^{(]*$", head, re.S))
        return set(re.findall(r"\$([A-Za-z_]\w*)", m[-1].group(1))) if m else set()

    # -- dynamic value resolution --------------------------------------------------------------------------------------
    def resolve(self, d: S.Dyn, unit: I.Unit, closure: list, slug: str, depth: int = 0) -> set | None:
        valid = _valid_for(d.fact)
        if valid is None:
            return None
        var = re.search(r"\$([A-Za-z_]\w*)", d.expr or "")
        if not var:
            return None
        return self._resolve_var(var.group(1), unit, closure, slug, valid, depth)

    def _resolve_var(self, var: str, unit: I.Unit, closure: list, slug: str, valid, depth: int) -> set | None:
        if depth > 4:
            return None
        toks = self.index.unit_tokens(unit)
        values: set = set()
        resolved = True
        found = False
        allow: set | None = None
        for k, t in enumerate(toks):
            if t.kind != "code":
                continue
            for am in re.finditer(r"in_array\s*\(\s*\$" + re.escape(var) + r"\s*,\s*(\$\w+|array\s*\(|\[)?", t.text):
                allow = (allow or set()) | self._allowlist(toks, k, am, unit, valid)
            for am in re.finditer(r"\$" + re.escape(var) + r"\s*(?:\?\?)?=(?![=>])", t.text):
                found = True
                rhs = _rhs(toks, k, am.end())
                got = self._rhs_values(rhs, unit, closure, slug, valid, depth, var)
                if got is None:
                    resolved = False
                else:
                    values |= got
        if not found and allow is None:
            return None  # a parameter or a value set elsewhere: not settled here
        if allow is not None:
            return values & allow if resolved else allow
        return values if resolved else None

    def _allowlist(self, toks, k, am, unit, valid) -> set:
        out: set = set()
        if am.group(1) and am.group(1).startswith("$"):
            name = am.group(1)[1:]
            for j, t in enumerate(toks):
                if t.kind == "code" and re.search(r"\$" + re.escape(name) + r"\s*=(?![=>])", t.text):
                    for x in _rhs(toks, j, re.search(r"\$" + re.escape(name) + r"\s*=(?![=>])", t.text).end()):
                        if x.kind == "lit" and valid(x.text):
                            out.add(_norm(x.text))
            return out
        for x in _rhs(toks, k, am.end(), stop=")"):
            if x.kind == "lit" and valid(x.text):
                out.add(_norm(x.text))
        return out

    def _rhs_values(self, rhs: list, unit: I.Unit, closure: list, slug: str, valid, depth: int, var: str) -> set | None:
        """The values an assignment's right-hand side can give, or None when any part of it is not settled: a call to
        code outside the repo that is not a sanitiser, a property, an array read by a computed key, or a variable that
        cannot be resolved. A sanitiser passes its argument through (`esc_attr( $tag )`); a repo function gives what it
        returns; a ternary's condition gives nothing. A capture of a regular-expression match inside a rewriter
        (`$m[1]` under preg_replace_callback) re-prints a tag the content already holds and adds no value."""
        full = " ".join(t.text if t.kind == "code" else "'" + t.text.replace("'", "") + "'" for t in rhs)
        code = " ".join(t.text if t.kind == "code" else "'" + t.text.replace("'", "") + "'" for t in _branches(rhs))
        out: set = set()
        for cm in list(re.finditer(r"(?<![\w$>:])([A-Za-z_]\w*)\s*\(", code)):
            name = cm.group(1)
            if name in I.PHP_KEYWORDS or name in _PASS:
                continue
            if name in self.index.functions:
                got = self._returns(name, closure, slug, valid, depth)
                if got is None:
                    return None
                out |= got
            elif name not in _PURE:
                return None
        code = _drop_call_args(code)
        if re.search(r"->\s*\w+", code):
            return None
        for lm in re.finditer(r"'([^']*)'(\s*\.)?", code):
            if valid(lm.group(1)):
                out.add(_norm(lm.group(1)))
            elif lm.group(1) == "h" and lm.group(2):
                out |= {f"h{n}" for n in range(1, 7)}
        for am in re.finditer(r"\$attributes\s*\[\s*'([^']+)'", code):
            enum = ((self.block_json[slug].get("attributes") or {}).get(am.group(1)) or {}).get("enum")
            if enum and all(valid(str(e)) or e == "" for e in enum):
                out |= {_norm(str(e)) for e in enum if e}
            elif "in_array" not in full:
                return None
        rewriter = re.search(r"preg_replace_callback|preg_match", self.index.masked(unit.file)[unit.start:unit.end])
        for am in re.finditer(r"\$(?!attributes\b|this\b)([A-Za-z_]\w*)\s*\[\s*([^\]]*)\]", code):
            key = am.group(2).strip()
            if re.fullmatch(r"\d+", key) and rewriter:
                continue
            if not re.fullmatch(r"'[^']+'", key):
                return None
            got = self._caller_key(key.strip("'"), closure, slug, valid, depth)
            if got is None:
                return None
            out |= got
        for am in re.finditer(r"\$([A-Za-z_]\w*)\b(?!\s*\[)", code):
            name = am.group(1)
            if name in (var, "attributes", "this", "block", "content"):
                continue
            got = self._resolve_var(name, unit, closure, slug, valid, depth + 1)
            if got is None:
                return None
            out |= got
        return out

    def _returns(self, name: str, closure: list, slug: str, valid, depth: int) -> set | None:
        """The values a repo function returns (each `return` read as an assignment's right-hand side)."""
        if depth > 4:
            return None
        out: set = set()
        for fu in self.index.functions[name]:
            toks = self.index.unit_tokens(fu)
            for k, t in enumerate(toks):
                if t.kind != "code":
                    continue
                for rm in re.finditer(r"\breturn\b", t.text):
                    got = self._rhs_values(_rhs(toks, k, rm.end()), fu, closure, slug, valid, depth + 1, "")
                    if got is None:
                        return None
                    out |= got
        return out or None

    def _caller_key(self, key: str, closure: list, slug: str, valid, depth: int) -> set | None:
        """Values the block's own code passes for an options key (`'tag' => 'details'`)."""
        out: set = set()
        hit = False
        for u in closure:
            toks = self.index.unit_tokens(u)
            for k, t in enumerate(toks):
                if t.kind == "lit" and t.text == key and k + 1 < len(toks) and toks[k + 1].kind == "code" \
                        and re.match(r"\s*=>\s*$", toks[k + 1].text):
                    hit = True
                    nxt = toks[k + 2] if k + 2 < len(toks) else None
                    if nxt is not None and nxt.kind == "lit" and valid(nxt.text):
                        out.add(_norm(nxt.text))
                    else:
                        expr = re.match(r"\s*=>\s*(\$[A-Za-z_]\w*)", toks[k + 1].text + (nxt.text if nxt and nxt.kind == "code" else ""))
                        got = self._resolve_var(expr.group(1)[1:], u, closure, slug, valid, depth + 1) if expr else None
                        if got is None:
                            return None
                        out |= got
        return out if hit else None


# Calls whose argument is the value (a sanitiser or case change passes a tag through), and calls that give no tag or
# role of their own (a test, a count, a number).


_PASS = frozenset("esc_attr esc_html tag_escape sanitize_key sanitize_html_class sanitize_text_field strtolower trim "
                  "strval".split())
_PURE = frozenset("isset empty is_string is_array is_numeric in_array array_key_exists absint intval count strlen "
                  "max min".split())


def _drop_call_args(code: str) -> str:
    """The code with the arguments of every call that is not a pass-through removed (`absint( $level )` -> `absint()`)."""
    out, i = [], 0
    for m in re.finditer(r"(?<![\w$>:])([A-Za-z_]\w*)\s*\(", code):
        if m.start() < i or m.group(1) in _PASS or m.group(1) in I.PHP_KEYWORDS:
            continue
        depth, j = 0, m.end() - 1
        while j < len(code):
            depth += {"(": 1, ")": -1}.get(code[j], 0)
            if depth == 0:
                break
            j += 1
        out.append(code[i:m.end()])
        i = j
    out.append(code[i:])
    return "".join(out)


def _valid_for(fact: str):
    if fact == "renders-tag":
        return lambda v: S._tag_name(v.strip()) is not None and v.strip() == v
    if fact == "renders-role":
        return lambda v: v in S.ARIA_ROLES
    return None


def _norm(v: str) -> str:
    return S._tag_name(v) or v


def _rhs(toks: list, k: int, offset: int, stop: str = ";") -> list:
    """Tokens of an assignment's right-hand side: from `offset` in code token k to the statement's `;` (or the call's
    closing `)` when `stop` is ')'), at bracket depth 0."""
    out, depth = [], 0
    first = toks[k].text[offset:]
    seq = [S.Tok("code", first, toks[k].pos + offset)] + toks[k + 1:]
    for t in seq:
        if t.kind == "lit":
            out.append(t)
            continue
        buf = []
        for ch in t.text:
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
                if depth < 0 and stop == ")":
                    out.append(S.Tok("code", "".join(buf), t.pos))
                    return out
            if ch == ";" and depth <= 0:
                out.append(S.Tok("code", "".join(buf), t.pos))
                return out
            buf.append(ch)
        out.append(S.Tok("code", "".join(buf), t.pos))
    return out


def _branches(rhs: list) -> list:
    """A right-hand side without its leading ternary condition (`$a ? 'nav' : 'div'` -> `'nav' : 'div'`): the condition
    selects a branch and gives no value. A condition holding an in_array() allowlist is kept (it names the values)."""
    depth = 0
    for i, t in enumerate(rhs):
        if t.kind != "code":
            continue
        for j, ch in enumerate(t.text):
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif ch == "?" and depth == 0 and t.text[j + 1:j + 2] not in ("?", "-", ">") and t.text[j - 1:j] != "?":
                cond = " ".join(x.text for x in rhs[:i]) + t.text[:j]
                if "in_array" in cond:
                    return rhs
                return [S.Tok("code", t.text[j + 1:], t.pos + j + 1)] + rhs[i + 1:]
    return rhs


@lru_cache(maxsize=None)
def _js_code(text: str) -> str:
    return _code_text(S.js_tokens(text))


def _array_allowlist(expr: str, body: str = ""):
    """A literal kses allowlist (`array( 'span' => array( 'class' => true ), 'br' => array() )`): the keys directly in
    the outer array are the tags; every `'aria-*'` / `'role'` key in it, or in `body` (the function that builds it, whose
    shared attribute arrays it merges in), is an attribute the content may carry."""
    tags, depth = set(), 0
    for m in re.finditer(r"'([^']*)'\s*=>|([(\[])|([)\]])", expr):
        if m.group(2):
            depth += 1
        elif m.group(3):
            depth -= 1
        elif depth == 1 and S._tag_name(m.group(1)):
            tags.add(S._tag_name(m.group(1)))
    keys = re.findall(r"'([a-z][a-z-]*)'\s*=>", expr + "\n" + body)
    return tags, {k for k in keys if k in S.ARIA_ATTRS}, "role" in keys, "a literal allowlist"


def _resolve_js(d, text: str, callers: str) -> set | None:
    """A JS tag or role from a variable: a parameter whose every call passes a literal, a destructured default plus the
    literal a repo caller passes for that option, or a literal assignment. None when any source is not a literal."""
    valid = _valid_for(d.fact)
    var = (d.expr or "").split(".")[-1]
    if valid is None or not re.fullmatch(r"[A-Za-z_$][\w$]*", var):
        return None
    code = _js_code(text)
    lit = r"'([^']*)'"
    out: set = set()
    # A parameter of the function the site sits in.
    head = text[:d.pos]
    fm = None
    for fm in re.finditer(r"(?:function\s+([\w$]+)\s*\(([^)]*)\)|([\w$]+)\s*=\s*(?:function\s*[\w$]*\s*)?\(([^)]*)\)\s*(?:=>)?)", head):
        pass
    if fm:
        name, params = (fm.group(1), fm.group(2)) if fm.group(1) else (fm.group(3), fm.group(4))
        plist = [x.strip().split("=")[0].strip() for x in params.split(",")]
        if var in plist:
            i = plist.index(var)
            calls = [cm for cm in re.finditer(r"(?<![\w$.])" + re.escape(name) + r"\s*\(([^()]*)\)", code)
                     if not re.search(r"function\s*$", code[:cm.start()][-12:])]
            calls = [c for c in calls if not re.match(r"\s*\(\s*" + re.escape(params.strip()), code[c.start() + len(name):])]
            vals = []
            for cm in calls:
                args = [a.strip() for a in cm.group(1).split(",")]
                a = args[i] if i < len(args) else ""
                lm = re.fullmatch(lit, a)
                if not lm or not valid(lm.group(1)):
                    return None
                vals.append(_norm(lm.group(1)))
            return set(vals) or None
    # A destructured option with a default, and what a repo caller passes for it.
    dm = re.search(r"\{[^{}]*\b" + re.escape(var) + r"\s*=\s*" + lit + r"[^{}]*\}\s*=", code)
    if dm:
        if not valid(dm.group(1)):
            return None
        out.add(_norm(dm.group(1)))
        for cm in re.finditer(r"(?<![\w$.-])" + re.escape(var) + r"\s*:\s*([^,}\n]+)", callers):
            lm = re.fullmatch(lit, cm.group(1).strip())
            if not lm or not valid(lm.group(1)):
                return None
            out.add(_norm(lm.group(1)))
        return out
    for am in re.finditer(r"(?<![\w$.])" + re.escape(var) + r"\s*=(?![=>])\s*([^;\n]+)", code):
        rhs = am.group(1).strip().rstrip(",").strip()
        # A literal, or a ternary chain whose every branch is a literal (`svg ? i ? 'rect' : 'g' : 'div'`).
        lits = re.findall(lit, rhs)
        rest = re.sub(lit, "", rhs)
        if not lits or not re.fullmatch(r"[\s\w$.!?:()&|]*", rest) or ("?" in rhs) != (":" in rest):
            return None
        if "?" not in rhs and len(lits) != 1:
            return None
        for v in lits:
            if not valid(v):
                return None
            out.add(_norm(v))
    return out or None


def _code_text(toks: list) -> str:
    return "".join(t.text if t.kind == "code" else "'" + t.text.replace(S.HOLE, "") + "'" for t in toks)
