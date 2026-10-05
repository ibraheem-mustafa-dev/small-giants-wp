"""Source rewrites that let the seeder's statement scanner read more PHP shapes.

Every function here takes comment-stripped PHP text and returns rewritten text
with the same meaning for the purpose of "which value lands in which CSS
declaration". None of them evaluates PHP; each rewrites one documented idiom
into the plain `'prop:' . $attributes['attrName']` concatenation shape that
`extract-signatures.py::_attr_to_raw_props_php` already reads.

- `expand_double_quoted`: `"{$sel}{transition:all {$d}ms}"` becomes
  `'' . $sel . '{transition:all ' . $d . 'ms}'`.
- `normalise_attr_index`: `$attributes[ 'x' ]` becomes `$attributes['x']`.
- `rewrite_reader_closures`: a closure that reads the attribute array by key
  (`$read = function ( $base ) use ( $attrs, $prefix ) { return $attrs[ $prefix . $base ]; }`)
  turns each `$read( 'X' )` call into `$attributes['<prefix>X']`.
- `inline_array_variables`: a call argument naming a variable that was assigned
  one array literal is replaced by that literal (config maps passed by variable).
- `expand_prefix_loops`: `foreach ( $map as $prefix => $sel ) { helper( $attributes, $prefix, $p . ' ' . $sel ); }`
  over a literal `'prefix' => 'selector'` map gains one literal call per entry.
- `paint_table_props`: an attribute-keyed `'attr' => array( '<selector>', '<property>' )`
  table pairs each attribute with its property and selector.
"""

from __future__ import annotations

import re

from php_source_index import matching_close, split_top_level_args


def _escape_single(text: str) -> str:
    return text.replace("\\", "\\\\").replace("'", "\\'")


def _interpolation_parts(content: str) -> "list[tuple[str, str]] | None":
    """Split a double-quoted string body into ('lit', text) / ('expr', php) parts.

    Returns None when the string holds no interpolation."""
    parts: list[tuple[str, str]] = []
    lit: list[str] = []
    i = 0
    n = len(content)
    found = False
    while i < n:
        ch = content[i]
        if ch == "\\" and i + 1 < n:
            lit.append(content[i : i + 2])
            i += 2
            continue
        if ch == "{" and i + 1 < n and content[i + 1] == "$":
            close = matching_close(content, i, "{", "}")
            if close < 0:
                lit.append(ch)
                i += 1
                continue
            parts.append(("lit", "".join(lit)))
            lit = []
            parts.append(("expr", content[i + 1 : close]))
            found = True
            i = close + 1
            continue
        if ch == "$" and i + 1 < n and (content[i + 1].isalpha() or content[i + 1] == "_"):
            m = re.match(r"\$\w+(?:\[[^\]]*\]|->\w+)?", content[i:])
            if m:
                parts.append(("lit", "".join(lit)))
                lit = []
                expr = m.group(0)
                # PHP's simple syntax takes an unquoted array key: "$a[key]".
                expr = re.sub(r"\[(\w+)\]$", r"['\1']", expr)
                parts.append(("expr", expr))
                found = True
                i += len(m.group(0))
                continue
        lit.append(ch)
        i += 1
    parts.append(("lit", "".join(lit)))
    return parts if found else None


def expand_double_quoted(src: str) -> str:
    """Rewrite every interpolating double-quoted string as a concatenation."""
    out: list[str] = []
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch == "'":
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "'":
                    break
                j += 1
            out.append(src[i : j + 1])
            i = j + 1
            continue
        if ch == '"':
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == '"':
                    break
                j += 1
            content = src[i + 1 : j]
            parts = _interpolation_parts(content)
            if parts is None:
                out.append(src[i : j + 1])
            else:
                pieces = []
                for kind, text in parts:
                    if kind == "lit":
                        pieces.append("'" + _escape_single(text) + "'")
                    else:
                        pieces.append(text)
                out.append("( " + " . ".join(pieces) + " )")
            i = j + 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def normalise_attr_index(src: str, attrs_names: "tuple[str, ...]" = ("attributes", "attrs")) -> str:
    """`$attributes[ 'x' ]` -> `$attributes['x']` (the scanner's literal shape)."""
    names = "|".join(attrs_names)
    return re.sub(
        r"\$(" + names + r")\[\s*(['\"])(\w*)\2\s*\]", lambda m: f"$attributes['{m.group(3)}']", src
    )


def rename_variable(src: str, old: str, new: str) -> str:
    """Rename `$old` to `$new` as a whole variable token."""
    if old == new:
        return src
    return re.sub(r"\$" + re.escape(old) + r"\b", "$" + new, src)


_CLOSURE_RE = re.compile(
    r"\$(\w+)\s*=\s*(?:static\s+)?function\s*\(\s*(?:\??\w+\s+)?\$(\w+)[^)]*\)\s*"
    r"use\s*\(([^)]*)\)\s*(?::\s*\??\w+\s*)?\{"
)


def rewrite_reader_closures(src: str, prefix_var: "str | None" = None, literal_prefix: str = "") -> str:
    """Inline attribute-reader closures.

    A closure qualifies when its body indexes `$attributes` by its own first
    parameter, optionally behind `$prefix_var . $param`. Each call
    `$reader( 'Key' )` then becomes `$attributes['<literal_prefix>Key']`.
    """
    readers: dict[str, bool] = {}
    for m in _CLOSURE_RE.finditer(src):
        name, param = m.group(1), m.group(2)
        open_idx = m.end() - 1
        close_idx = matching_close(src, open_idx, "{", "}")
        if close_idx < 0:
            continue
        body = src[open_idx:close_idx]
        key_expr = r"\$" + re.escape(param)
        prefixed = False
        if prefix_var:
            pk = re.compile(
                r"\$" + re.escape(prefix_var) + r"\s*\.\s*" + key_expr + r"\b"
            )
            if pk.search(body):
                prefixed = True
                # `$key = $prefix . $base; ... $attributes[ $key ]`
                key_var = re.search(
                    r"\$(\w+)\s*=\s*\$" + re.escape(prefix_var) + r"\s*\.\s*" + key_expr + r"\b", body
                )
                direct = re.search(r"\$attributes\[\s*\$" + re.escape(prefix_var) + r"\s*\.\s*" + key_expr, body)
                via_var = key_var and re.search(
                    r"\$attributes\[\s*\$" + re.escape(key_var.group(1)) + r"\s*\]", body
                )
                if not (direct or via_var):
                    continue
        if not prefixed:
            if not re.search(r"\$attributes\[\s*" + key_expr + r"\s*\]", body):
                continue
        readers[name] = prefixed
    for name, prefixed in readers.items():
        pre = literal_prefix if prefixed else ""
        src = re.sub(
            r"\$" + re.escape(name) + r"\s*\(\s*'(\w+)'\s*\)",
            lambda m, pre=pre: f"$attributes['{pre}{m.group(1)}']",
            src,
        )
    return src


def propagate_string_constants(src: str) -> str:
    """Replace reads of a variable assigned exactly one string literal.

    `$k_size = 'titleFontSize'; ... $attributes[ $k_size ]` becomes
    `$attributes['titleFontSize']`. A variable assigned more than once is left alone.
    """
    assigns = re.findall(r"\$(\w+)\s*=\s*'(\w*)'\s*;", src)
    counts: dict[str, int] = {}
    for var, _ in re.findall(r"\$(\w+)\s*(=)(?![=>])", src):
        counts[var] = counts.get(var, 0) + 1
    consts = {var: val for var, val in assigns if counts.get(var) == 1}
    for var, val in consts.items():
        src = re.sub(
            r"\$" + re.escape(var) + r"\b(?!\s*=(?![=>]))", "'" + val + "'", src
        )
    return normalise_attr_index(src)


def _array_literal_end(src: str, start: int) -> int:
    m = re.compile(r"array\s*\(|\[").match(src, start)
    if not m:
        return -1
    if m.group(0) == "[":
        return matching_close(src, start, "[", "]")
    return matching_close(src, m.end() - 1, "(", ")")


def inline_array_variables(src: str, callee_names: "set[str]") -> str:
    """For each call to one of `callee_names`, replace an argument that is a bare
    variable assigned one array literal earlier in the source with that literal."""
    assigned: dict[str, list[tuple[int, str]]] = {}
    for m in re.finditer(r"\$(\w+)\s*=\s*(?=array\s*\(|\[)", src):
        end = _array_literal_end(src, m.end())
        if end > 0:
            assigned.setdefault(m.group(1), []).append((m.start(), src[m.end() : end + 1]))
    if not assigned:
        return src
    pattern = re.compile(r"\b(" + "|".join(re.escape(c) for c in sorted(callee_names)) + r")\s*\(")
    out: list[str] = []
    pos = 0
    for m in pattern.finditer(src):
        close = matching_close(src, m.end() - 1, "(", ")")
        if close < 0:
            continue
        args = split_top_level_args(src[m.end() : close])
        changed = False
        new_args = []
        for a in args:
            vm = re.fullmatch(r"\s*\$(\w+)\s*", a)
            literal = None
            if vm and vm.group(1) in assigned:
                earlier = [lit for at, lit in assigned[vm.group(1)] if at < m.start()]
                if len(assigned[vm.group(1)]) == 1 and earlier:
                    literal = earlier[-1]
            if literal is not None:
                new_args.append(" " + literal + " ")
                changed = True
            else:
                new_args.append(a)
        if changed:
            out.append(src[pos : m.end()])
            out.append(",".join(new_args))
            pos = close
    out.append(src[pos:])
    return "".join(out)


_FOREACH_RE = re.compile(r"\bforeach\s*\(")
_KEY_VALUE_RE = re.compile(r"\s*'(\w*)'\s*=>\s*(.+?)\s*$", re.DOTALL)


def _literal_pairs(literal: str) -> "list[tuple[str, str]] | None":
    """[(key, value expression)] of an `array( 'k' => <expr>, ... )` literal whose keys
    are all string literals, else None."""
    m = re.match(r"\s*(?:array\s*\(|\[)", literal)
    if not m:
        return None
    inner = literal[m.end() : literal.rstrip().rfind(")" if "(" in m.group(0) else "]")]
    pairs = []
    for item in split_top_level_args(inner):
        if not item.strip():
            continue
        kv = _KEY_VALUE_RE.match(item)
        if not kv:
            return None
        pairs.append((kv.group(1), kv.group(2)))
    return pairs or None


def expand_prefix_loops(src: str, helper_names: "set[str]") -> str:
    """Append one literal helper call per entry of a literal prefix-map loop.

    Handles `foreach ( <map> as $key => $value ) { ... helper( ..., $key, ... $value ... ) ... }`
    where `<map>` is an array literal, or a variable assigned one, whose keys are
    string literals. Each synthesised call substitutes `$key` with the entry's key
    literal and `$value` with its value expression; the calls are appended to the
    source (the loop itself is kept)."""
    if not helper_names:
        return src
    maps: dict[str, list[tuple[str, str]]] = {}
    for m in re.finditer(r"\$(\w+)\s*=\s*(?=array\s*\(|\[)", src):
        end = _array_literal_end(src, m.end())
        if end < 0:
            continue
        pairs = _literal_pairs(src[m.end() : end + 1])
        if pairs:
            maps.setdefault(m.group(1), pairs)
    call_re = re.compile(r"\b(" + "|".join(re.escape(h) for h in sorted(helper_names)) + r")\s*\(")
    extra: list[str] = []
    for m in _FOREACH_RE.finditer(src):
        head_end = matching_close(src, m.end() - 1, "(", ")")
        if head_end < 0:
            continue
        head = src[m.end() : head_end]
        hm = re.match(r"\s*(.+?)\s+as\s+\$(\w+)\s*=>\s*\$(\w+)\s*$", head, re.DOTALL)
        if not hm:
            continue
        source_expr, key_var, val_var = hm.groups()
        vm = re.fullmatch(r"\$(\w+)", source_expr.strip())
        pairs = maps.get(vm.group(1)) if vm else _literal_pairs(source_expr)
        if not pairs:
            continue
        open_idx = src.find("{", head_end)
        if open_idx < 0 or src[head_end + 1 : open_idx].strip():
            continue
        close_idx = matching_close(src, open_idx, "{", "}")
        if close_idx < 0:
            continue
        body = src[open_idx + 1 : close_idx]
        for cm in call_re.finditer(body):
            cclose = matching_close(body, cm.end() - 1, "(", ")")
            if cclose < 0:
                continue
            call = body[cm.start() : cclose + 1]
            if not re.search(r"\$" + re.escape(key_var) + r"\b", call):
                continue
            for key, value in pairs:
                c = re.sub(r"\$" + re.escape(key_var) + r"\b", "'" + key + "'", call)
                c = re.sub(r"\$" + re.escape(val_var) + r"\b", lambda _m, v=value: "( " + v + " )", c)
                extra.append(c + ";")
    if not extra:
        return src
    return src + "\n" + "\n".join(extra) + "\n"


_PAINT_ROW_RE = re.compile(
    r"'(\w+)'\s*=>\s*(?:array\s*\(|\[)\s*'([^'\\]*)'\s*,\s*'([a-z-]+)'\s*(?:\)|\])"
)


def paint_table_props(src: str, vocab: "frozenset[str]") -> "list[tuple[str, str, str]]":
    """(attr, property, selector) for each `'attr' => array( 'selector', 'property' )` row
    whose second string is a real CSS property."""
    return [(a, p, s) for a, s, p in _PAINT_ROW_RE.findall(src) if p in vocab]


_TRANSITION_DECL_RE = re.compile(r"(?:^|[{;\s])(transition|animation)\s*:", re.IGNORECASE)


def composite_transition_props(
    statements: "list[str]", var_attr: "dict[str, str]"
) -> "dict[str, set[str]]":
    """Longhand for each value fed into a `transition:` or `animation:` shorthand.

    Inside the declaration (until the next `;` or `}` literal), the first value
    immediately followed by a `ms`/`s` unit literal in each comma-separated item is
    the duration; for `transition`, the value that follows it is the timing
    function (an `animation` item's second time value is its delay, so only its
    duration is read).
    """
    frag_re = re.compile(
        r"'([^'\\]*(?:\\.[^'\\]*)*)'|\$attributes\['(\w+)'\]|\$(\w+)"
    )
    out: dict[str, set[str]] = {}
    for stmt in statements:
        if "transition" not in stmt:
            continue
        frags = list(frag_re.finditer(stmt))
        shorthand: "str | None" = None
        after_duration = False
        seen_duration = False
        for idx, fm in enumerate(frags):
            lit, direct, var = fm.groups()
            if lit is not None:
                text = lit
                decl = None
                for decl in _TRANSITION_DECL_RE.finditer(text):
                    pass
                if decl is not None:
                    shorthand = decl.group(1).lower()
                    after_duration = seen_duration = False
                    if re.search(r"[;}]", text[decl.end():]):
                        shorthand = None
                elif shorthand:
                    if re.search(r"[;}]", text):
                        shorthand = None
                    if "," in text:
                        after_duration = seen_duration = False
                continue
            if not shorthand:
                continue
            attr = direct or var_attr.get(var or "")
            nxt = frags[idx + 1].group(1) if idx + 1 < len(frags) else None
            if nxt is not None and re.match(r"m?s\b", nxt) and not seen_duration:
                if attr:
                    out.setdefault(attr, set()).add(shorthand + "-duration")
                after_duration = seen_duration = True
            elif after_duration and shorthand == "transition":
                if attr:
                    out.setdefault(attr, set()).add("transition-timing-function")
                after_duration = False
    return out
