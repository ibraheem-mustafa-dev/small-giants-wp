"""identity_scan -- read the markup a piece of PHP or JS source can print, from its text alone.

The lexical half of the block identification facts (`block_identity_facts.py`). A source file is split into tokens:
literal text (a PHP or JS string, or the raw HTML outside a `<?php ... ?>` island) and code, with comments dropped and
each interpolation inside a literal (`{$x}`, `$x`, `${x}`) replaced by HOLE. `scan()` then reads, per token stream:

- the tags a literal opens (`<ul`, `<button`), and the tags a JS `createElement( 'x' )` builds;
- the ARIA roles a literal writes (`role="tablist"`), a `'role' => 'x'` array entry, a `set_attribute( 'role', 'x' )` /
  `setAttribute( 'role', 'x' )` call or a `el.role = 'x'` assignment;
- the ARIA attributes written the same ways (`aria-current="page"`, `'aria-label' =>`, `setAttribute( 'aria-x', ..)`,
  `el.ariaExpanded = ..`, `data-wp-bind--aria-expanded`). A selector (`[aria-selected="true"]`) and a read
  (`getAttribute`, `hasAttribute`, `removeAttribute`, `closest`, `querySelector`) are not writes;
- every DYNAMIC site: a tag, role or ARIA name whose value is a variable (`'<' . $tag`, `<%1$s`, `role="' . $r`,
  `createElement( name )`), with the expression that supplies it, so the caller can try to resolve it.

Nothing here knows about blocks; `identity_sources.py` decides which files belong to which block.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

HOLE = "\x00"

# The HTML living standard's elements (https://html.spec.whatwg.org/multipage/indices.html#elements-3) and the SVG 2
# elements an inline icon or diagram uses. A `<word` that is neither, and holds no hyphen (a custom element), is prose
# such as "<email>" and is not counted as a tag.
HTML_ELEMENTS = frozenset(
    "a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col "
    "colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 "
    "h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark menu meta "
    "meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search "
    "section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th "
    "thead time title tr track u ul var video wbr".split()
)
SVG_ELEMENTS = frozenset(
    "svg g path circle ellipse line polyline polygon rect text tspan textPath defs use symbol clipPath mask pattern "
    "linearGradient radialGradient stop filter feGaussianBlur feOffset feBlend feColorMatrix feComposite feFlood "
    "feMerge feMergeNode feTurbulence feDisplacementMap feMorphology image foreignObject marker title desc "
    "animate animateTransform animateMotion set".split()
)
_SVG_LOWER = {t.lower(): t for t in SVG_ELEMENTS}

# WAI-ARIA 1.2 roles (https://www.w3.org/TR/wai-aria-1.2/#role_definitions), plus the graphics module's three.
ARIA_ROLES = frozenset(
    "alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox "
    "complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid "
    "gridcell group heading img insertion link list listbox listitem log main marquee math menu menubar menuitem "
    "menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio "
    "radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong "
    "subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid "
    "treeitem graphics-document graphics-object graphics-symbol".split()
)
# WAI-ARIA 1.2 states and properties (https://www.w3.org/TR/wai-aria-1.2/#state_prop_def).
ARIA_ATTRS = frozenset(
    "aria-activedescendant aria-atomic aria-autocomplete aria-braillelabel aria-brailleroledescription aria-busy "
    "aria-checked aria-colcount aria-colindex aria-colindextext aria-colspan aria-controls aria-current "
    "aria-describedby aria-description aria-details aria-disabled aria-dropeffect aria-errormessage aria-expanded "
    "aria-flowto aria-grabbed aria-haspopup aria-hidden aria-invalid aria-keyshortcuts aria-label aria-labelledby "
    "aria-level aria-live aria-modal aria-multiline aria-multiselectable aria-orientation aria-owns aria-placeholder "
    "aria-posinset aria-pressed aria-readonly aria-relevant aria-required aria-roledescription aria-rowcount "
    "aria-rowindex aria-rowindextext aria-rowspan aria-selected aria-setsize aria-sort aria-valuemax aria-valuemin "
    "aria-valuenow aria-valuetext".split()
)


@dataclass
class Tok:
    kind: str  # 'lit' (a string or raw HTML) or 'code'
    text: str
    pos: int
    src: str = "str"  # 'html' for raw HTML outside <?php ?>, 'str' for a quoted string, 'code'


@dataclass
class Dyn:
    fact: str  # renders-tag | renders-role | renders-aria
    expr: str  # the code expression that supplies the value ('' when it could not be isolated)
    pos: int
    note: str


@dataclass
class Sink:
    """A call that prints content: `wp_kses_post( X )`, `wp_kses( X, A )`, `wp_kses_data( X )`, `nl2br( X )`,
    `wpautop( X )`. `arg` is X's code, `allow` A's (kses only), `kind` the function."""
    kind: str
    arg: str
    allow: str
    pos: int


@dataclass
class Scan:
    tags: dict = field(default_factory=dict)   # value -> char offset of the first write
    roles: dict = field(default_factory=dict)
    arias: dict = field(default_factory=dict)
    dyn: list = field(default_factory=list)    # [Dyn]
    nested: dict = field(default_factory=dict)  # block name -> offset ('blockName' => 'ns/x', <!-- wp:ns/x)
    nested_dyn: list = field(default_factory=list)  # offsets of render_block( <non-literal> )
    sinks: list = field(default_factory=list)  # [Sink]: calls that print content a setting holds


# ---------------------------------------------------------------------------------------------------------------------
# Tokenisers
# ---------------------------------------------------------------------------------------------------------------------

_INTERP_DQ = re.compile(r"\{\$[^}]*\}|\$[A-Za-z_][\w]*(?:->\w+|\[[^\]]*\])*")


def _dq_body(raw: str) -> str:
    """A PHP double-quoted or heredoc body with each interpolation replaced by HOLE and escapes decoded."""
    body = _INTERP_DQ.sub(HOLE, raw)
    return body.replace('\\"', '"').replace("\\'", "'").replace("\\\\", "\\")


def php_tokens(text: str) -> list[Tok]:
    """Tokens of a PHP file: raw HTML outside `<?php ?>` and each string are 'lit'; the rest is 'code'. Comments dropped.
    `<?= x ?>` is code (an echo)."""
    out: list[Tok] = []
    i, n = 0, len(text)
    html_mode = True
    code_start = 0

    def flush_code(end: int) -> None:
        if end > code_start:
            out.append(Tok("code", text[code_start:end], code_start))

    while i < n:
        if html_mode:
            j = text.find("<?", i)
            if j == -1:
                out.append(Tok("lit", text[i:], i, "html"))
                break
            if j > i:
                out.append(Tok("lit", text[i:j], i, "html"))
            if text.startswith("<?php", j):
                i = j + 5
            elif text.startswith("<?=", j):
                i = j + 3
                out.append(Tok("code", "echo ", j))
            else:
                i = j + 2
            html_mode = False
            code_start = i
            continue
        c = text[i]
        if c == "?" and text.startswith("?>", i):
            flush_code(i)
            i += 2
            if i < n and text[i] == "\n":
                i += 1
            html_mode = True
            continue
        if c == "#" and not text.startswith("#[", i) or c == "/" and text.startswith("//", i):
            flush_code(i)
            j = i
            while j < n and text[j] != "\n" and not text.startswith("?>", j):
                j += 1
            i = j
            code_start = i
            continue
        if c == "/" and text.startswith("/*", i):
            flush_code(i)
            j = text.find("*/", i + 2)
            i = n if j == -1 else j + 2
            code_start = i
            continue
        if c in "'\"":
            flush_code(i)
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            raw = text[i + 1:j]
            if c == '"':
                body = _dq_body(raw)
            else:
                body = raw.replace("\\'", "'").replace("\\\\", "\\")
            out.append(Tok("lit", body, i))
            i = j + 1
            code_start = i
            continue
        if c == "<" and text.startswith("<<<", i):
            m = re.match(r"<<<[ \t]*(['\"]?)([A-Za-z_]\w*)\1\r?\n", text[i:])
            if m:
                flush_code(i)
                ident = m.group(2)
                body_start = i + m.end()
                end_m = re.compile(r"^[ \t]*" + re.escape(ident) + r"\b", re.M).search(text, body_start)
                body_end = end_m.start() if end_m else n
                raw = text[body_start:body_end]
                out.append(Tok("lit", raw if m.group(1) == "'" else _dq_body(raw), body_start))
                i = end_m.end() if end_m else n
                code_start = i
                continue
        i += 1
    if not html_mode:
        flush_code(n)
    return out


_JS_REGEX_PREV = set("(,=:[!&|?{};+-*%<>~^")


def js_tokens(text: str) -> list[Tok]:
    """Tokens of a JS file: each string and template literal is 'lit' (a `${...}` becomes HOLE), the rest 'code'.
    Comments and regular-expression literals are dropped."""
    out: list[Tok] = []
    i, n = 0, len(text)
    code_start = 0

    def flush(end: int) -> None:
        if end > code_start:
            out.append(Tok("code", text[code_start:end], code_start))

    def prev_sig(k: int) -> str:
        k -= 1
        while k >= 0 and text[k] in " \t\r\n":
            k -= 1
        if k < 0:
            return "("
        if text[k].isalnum() or text[k] in "_$":
            w = re.search(r"[\w$]+$", text[: k + 1]).group(0)
            return "(" if w in ("return", "typeof", "case", "do", "else", "in", "of", "void", "yield", "await") else "a"
        return text[k]

    while i < n:
        c = text[i]
        if c == "/" and text.startswith("//", i):
            flush(i)
            j = text.find("\n", i)
            i = n if j == -1 else j
            code_start = i
            continue
        if c == "/" and text.startswith("/*", i):
            flush(i)
            j = text.find("*/", i + 2)
            i = n if j == -1 else j + 2
            code_start = i
            continue
        if c == "/" and prev_sig(i) in _JS_REGEX_PREV:
            flush(i)
            j, in_class = i + 1, False
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
            i = j + 1
            while i < n and text[i].isalpha():
                i += 1
            code_start = i
            continue
        if c in "'\"":
            flush(i)
            j = i + 1
            while j < n and text[j] != c and text[j] != "\n":
                j += 2 if text[j] == "\\" else 1
            out.append(Tok("lit", text[i + 1:j].replace("\\" + c, c), i))
            i = j + 1
            code_start = i
            continue
        if c == "`":
            flush(i)
            j, buf, depth = i + 1, [], 0
            while j < n and text[j] != "`":
                if text[j] == "\\":
                    buf.append(text[j + 1: j + 2])
                    j += 2
                    continue
                if text.startswith("${", j):
                    depth, j = 1, j + 2
                    while j < n and depth:
                        depth += {"{": 1, "}": -1}.get(text[j], 0)
                        j += 1
                    buf.append(HOLE)
                    continue
                buf.append(text[j])
                j += 1
            out.append(Tok("lit", "".join(buf), i))
            i = j + 1
            code_start = i
            continue
        i += 1
    flush(n)
    return out


# ---------------------------------------------------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------------------------------------------------

_TAG_OPEN = re.compile(r"<([A-Za-z][A-Za-z0-9-]*)(?=[\s>/" + HOLE + r"]|$)")
_TAG_DYN = re.compile(r"<(?:" + HOLE + r"|%(?:\d+\$)?s)")
_ROLE_ATTR = re.compile(r"(?<![\[\w-])role\s*=\s*\\?[\"']?([a-z" + HOLE + r"%][a-z-]*)?")
_ARIA_ATTR = re.compile(r"(?<![\[\w-])(aria-[a-z]+|aria-(?=" + HOLE + r"|%))\s*=")
_BIND = re.compile(r"data-wp-bind--(aria-[a-z]+|role)\b")
_READ_CALL = re.compile(r"(?:get_attribute|getAttribute|hasAttribute|has_attribute|removeAttribute|remove_attribute|"
                        r"closest|matches|querySelector(?:All)?)\s*\(\s*$")
_SET_CALL = re.compile(r"(?:set_attribute|setAttribute|toggleAttribute)\s*\(\s*$")
# A write whose attribute name is a variable: the name is not settled here.
_SET_VAR_NAME = re.compile(r"(?:set_attribute|setAttribute|toggleAttribute)\s*\(\s*([$A-Za-z_][\w$]*(?:\[[^\]]*\])?)\s*,")
# Calls whose arguments are a diagnostic message, never page markup.
_DIAGNOSTIC = re.compile(r"(?:_doing_it_wrong|_deprecated_\w+|wp_trigger_error|trigger_error|error_log|add_settings_error|wp_die|console\.\w+)\s*\(")
_SINK = re.compile(r"(?<![\w$>:])(wp_kses_post|wp_kses_data|wp_kses|nl2br|wpautop)\s*\(")
_JS_ROLE_KEY = re.compile(r"(?<![\w.$-])role\s*:\s*$")
_CREATE_EL = re.compile(r"createElement(?:NS)?\s*\(\s*(?:[^,()]*,\s*)?$")
# A literal in a search position is a needle or a pattern, never output: the first argument of a pattern or replace
# call (`preg_*`, `str_replace`, a selector), the second of a haystack search (`strpos( $html, '<img' )`).
_SEARCH_CALL = re.compile(r"(?:(?:preg_\w+|str_replace|str_ireplace|explode|querySelector(?:All)?|closest|matches|"
                          r"startsWith|endsWith|includes|indexOf|split|test)\s*\(\s*|"
                          r"(?:strpos|stripos|strrpos|str_contains|str_starts_with|str_ends_with|strstr|stristr|"
                          r"substr_count)\s*\(\s*[^,()]*,\s*)$")
# A PHP regular expression literal (delimiter, pattern holding a tag, delimiter, flags) is a pattern, not output.
_REGEX_LITERAL = re.compile(r"([#/~@!%])\^?\s*<.*\1[imsxuU]*$", re.S)
_JS_PROP_ARIA = re.compile(r"\.aria([A-Z][A-Za-z]+)\s*=(?!=)")
_JS_PROP_ROLE = re.compile(r"\.role\s*=(?!=)\s*$")
_NESTED_MARKUP = re.compile(r"<!--\s*wp:([a-z][a-z0-9-]*(?:/[a-z][a-z0-9-]*)?)")
_RENDER_BLOCK_CALL = re.compile(r"\brender_block\s*\(\s*$")
_VAR_AFTER = re.compile(r"^\s*\.\s*(.+?)\s*(?:\.\s*$|\.\s*['\"]|$|;)", re.S)


def _tag_name(raw: str) -> str | None:
    low = raw.lower()
    if low in HTML_ELEMENTS:
        return low
    if low in _SVG_LOWER:
        return _SVG_LOWER[low]
    if "-" in low and not low.startswith("-"):
        return low
    return None


def _next_code_expr(toks: list[Tok], k: int) -> str:
    """The code expression concatenated straight after literal k (`'<' . esc_attr( $tag ) . '>'` -> `esc_attr( $tag )`)."""
    if k + 1 < len(toks) and toks[k + 1].kind == "code":
        m = re.match(r"\s*\.\s*(.*?)\s*\.?\s*$", toks[k + 1].text, re.S)
        if m:
            return m.group(1).strip()
        m = re.match(r"\s*(?:echo|print)\s+(.*?)\s*;?\s*$", toks[k + 1].text, re.S)
        if m:
            return m.group(1).strip()
    return ""


def _sprintf_arg(toks: list[Tok], k: int, lit: str, at: int) -> str:
    """For a `%N$s` / `%s` placeholder at offset `at` of literal k, the argument expression of the enclosing
    sprintf/printf call, or '' when the call cannot be read."""
    if k == 0 or toks[k - 1].kind != "code" or not re.search(r"(?:s?printf|wp_sprintf)\s*\(\s*$", toks[k - 1].text):
        return ""
    m = re.match(r"%(\d+)\$s", lit[at + 1:])
    if m:
        index = int(m.group(1))
    else:
        index = len(re.findall(r"%(?!%)(?:\d+\$)?[sd]", lit[: at + 1])) + 1
    # Rebuild the argument list text after the format literal, masking nested literals.
    parts, depth = [], 0
    for t in toks[k + 1:]:
        if t.kind == "lit":
            parts.append("'" + t.text.replace(HOLE, "") + "'")
            continue
        seg = []
        for ch in t.text:
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
                if depth < 0:
                    break
            seg.append(ch)
        parts.append("".join(seg))
        if depth < 0:
            break
    args, buf, d = [], [], 0
    for ch in "".join(parts):
        if ch in "([{":
            d += 1
        elif ch in ")]}":
            d -= 1
        if ch == "," and d == 0:
            args.append("".join(buf).strip())
            buf = []
            continue
        buf.append(ch)
    args.append("".join(buf).strip())
    args = [a for a in args if a != ""]
    return args[index - 1] if 0 < index <= len(args) else ""


def scan(toks: list[Tok], jsx: bool = False) -> Scan:
    """Every tag, role and ARIA write in a token stream, and every dynamic site. `jsx` also reads markup written in
    code (a save.js return)."""
    s = Scan()
    toks = _merge_concat(toks)
    _find_sinks(toks, s)

    def add(bucket: dict, value: str, pos: int) -> None:
        bucket.setdefault(value, pos)

    joined = "".join(x.text if x.kind == "code" else "'" + x.text.replace("'", "") + "'" for x in toks)
    diag = 0  # open parentheses of a diagnostic call (_doing_it_wrong, console.warn) still to close
    for k, t in enumerate(toks):
        prev_code = toks[k - 1].text if k > 0 and toks[k - 1].kind == "code" else ""
        nxt = toks[k + 1] if k + 1 < len(toks) else None
        if t.kind == "code":
            diag = _diagnostic_depth(t.text, diag)
        elif diag > 0:
            continue
        if t.kind == "code":
            for m in _SET_VAR_NAME.finditer(t.text):
                verdict = _var_name_source(m.group(1), joined)
                if verdict is None:
                    continue
                if verdict.startswith("lit:"):
                    name = verdict[4:]
                    if name in ARIA_ATTRS:
                        add(s.arias, name, t.pos + m.start())
                    continue
                s.dyn.append(Dyn("renders-aria", "", t.pos + m.start(), f"an attribute named by a variable ({m.group(1)}: {verdict})"))
                s.dyn.append(Dyn("renders-role", "", t.pos + m.start(), f"an attribute named by a variable ({m.group(1)}: {verdict})"))
            if _JS_ROLE_KEY.search(t.text):
                if nxt is not None and nxt.kind == "lit" and HOLE not in nxt.text:
                    if nxt.text in ARIA_ROLES:
                        add(s.roles, nxt.text, nxt.pos)
                elif nxt is None or nxt.kind != "lit":
                    pass  # `role: someVar` in an options object: an object key, not an attribute write
            for m in _JS_PROP_ARIA.finditer(t.text):
                name = "aria-" + re.sub(r"(?<!^)([A-Z])", r"-\1", m.group(1)).lower()
                if name in ARIA_ATTRS:
                    add(s.arias, name, t.pos + m.start())
            if _JS_PROP_ROLE.search(t.text):
                if nxt is not None and nxt.kind == "lit" and nxt.text in ARIA_ROLES:
                    add(s.roles, nxt.text, nxt.pos)
                else:
                    s.dyn.append(Dyn("renders-role", "", t.pos, "a script assigns el.role from a variable"))
            for m in re.finditer(r"createElement\s*\(\s*([A-Za-z_$][\w$.]*)\s*\)|createElementNS\s*\([^,()]*,\s*([A-Za-z_$][\w$.]*)\s*\)", t.text):
                s.dyn.append(Dyn("renders-tag", m.group(1) or m.group(2), t.pos + m.start(), "createElement( variable )"))
            if _RENDER_BLOCK_CALL.search(t.text) and (nxt is None or nxt.kind != "lit"):
                s.nested_dyn.append(t.pos)
            for m in re.finditer(r"\brender_block\s*\(\s*\$", t.text):
                s.nested_dyn.append(t.pos + m.start())
            if jsx:
                _scan_markup(t.text, t.pos, s, toks, k, add)
            continue
        lit = t.text
        # A bare attribute-name literal: 'aria-x' / 'role' as a set_attribute argument or an array key.
        stripped = lit.strip()
        if re.fullmatch(r"aria-[a-z]+", stripped) and stripped in ARIA_ATTRS and not _READ_CALL.search(prev_code):
            if _SET_CALL.search(prev_code) or (nxt is not None and nxt.kind == "code" and re.match(r"\s*(=>|:|\]\s*=(?!=))", nxt.text)):
                add(s.arias, stripped, t.pos)
        if stripped == "role" and not _READ_CALL.search(prev_code) and nxt is not None and nxt.kind == "code":
            if _SET_CALL.search(prev_code) and re.match(r"\s*,\s*$", nxt.text) or re.match(r"\s*(=>|\]\s*=(?!=))\s*$", nxt.text):
                val = toks[k + 2] if k + 2 < len(toks) else None
                if val is not None and val.kind == "lit" and HOLE not in val.text:
                    if val.text in ARIA_ROLES:
                        add(s.roles, val.text, val.pos)
                elif _SET_CALL.search(prev_code) or re.match(r"\s*(=>|\]\s*=(?!=))\s*$", nxt.text):
                    expr = re.match(r"\s*(?:,|=>|\]\s*=)\s*(.*)", nxt.text, re.S).group(1).strip()
                    if expr and not re.match(r"^[)\]]", expr):
                        s.dyn.append(Dyn("renders-role", expr, nxt.pos, "role set from a variable"))
        if _CREATE_EL.search(prev_code) and re.search(r"\bin\s+document\s*\.\s*createElement\w*\s*\(\s*$", prev_code):
            continue  # a feature test ('name' in document.createElement( 'details' )) builds nothing on the page
        if _CREATE_EL.search(prev_code) and HOLE not in lit:
            name = _tag_name(lit.strip())
            if name:
                add(s.tags, name, t.pos)
            continue
        if re.fullmatch(r"[a-z][a-z0-9-]*/[a-z][a-z0-9-]*", stripped) and k >= 2 and toks[k - 2].kind == "lit" \
                and toks[k - 2].text == "blockName" and re.fullmatch(r"\s*=>\s*", prev_code):
            add(s.nested, stripped, t.pos)
        for m in _NESTED_MARKUP.finditer(lit):
            name = m.group(1) if "/" in m.group(1) else "core/" + m.group(1)
            add(s.nested, name, t.pos + m.start())
        if _SEARCH_CALL.search(prev_code) or _REGEX_LITERAL.match(stripped):
            continue  # a needle or a regular expression ('#<style ...>(.*?)</style>#s'), not output
        if t.src == "str" and re.fullmatch(r"<[A-Za-z][\w-]*", stripped) and not (
                nxt is not None and nxt.kind == "code" and re.match(r"\s*(\.|echo\b|print\b)", nxt.text)):
            continue  # a bare quoted '<img' in a list of needles prints nothing (raw HTML `<fieldset <?php` is markup)
        _scan_markup(lit, t.pos, s, toks, k, add, literal=True)
    return s


def _var_name_source(var: str, code: str) -> str | None:
    """Where a variable attribute name comes from. 'lit:<name>' for a constant (`const HIDDEN_ATTR = 'hidden'`); None
    for the key of an array the code builds (`foreach ( $plan['attrs'] as $name => $v )`, `attrs.forEach( ( [ name ] )`):
    its literal keys are read where the array is built; otherwise the reason it is not settled. A parsed document's
    own attributes (`$node->attributes`, `el.attributes`, `getAttributeNames()`) are content, never settled here."""
    bare = var.lstrip("$")
    cm = re.search(r"(?:const|let|var|define\(\s*'|const\s+)?\b" + re.escape(bare) + r"\b\s*=\s*'([^']*)'", code)
    if cm and re.fullmatch(r"[A-Z][A-Z0-9_]*", bare):
        return "lit:" + cm.group(1)
    for src in (re.findall(r"foreach\s*\(\s*(.+?)\s+as\s+\$" + re.escape(bare) + r"\s*=>", code, re.S)
                + re.findall(r"([\w$.\[\]'()]+)\s*\)?\s*\.forEach\s*\(\s*\(\s*\[\s*" + re.escape(bare) + r"\s*,", code)
                + re.findall(r"for\s*\(\s*(?:const|let|var)\s*\[\s*" + re.escape(bare) + r"\s*,[^\]]*\]\s*of\s*([^)]+)\)", code)):
        if re.search(r"->\s*attributes\b|\.attributes\b|getAttributeNames", src):
            return "the attributes of a parsed document"
        return None
    return "not settled here"


def _merge_concat(toks: list[Tok]) -> list[Tok]:
    """Adjacent quoted literals joined only by a concatenation (`'<' . 'section'`, `'<sp' + 'an>'`) read as one."""
    out: list[Tok] = []
    i = 0
    while i < len(toks):
        t = toks[i]
        if t.kind == "lit" and t.src == "str":
            text = t.text
            while i + 2 < len(toks) and toks[i + 1].kind == "code" and re.fullmatch(r"\s*[.+]\s*", toks[i + 1].text) \
                    and toks[i + 2].kind == "lit" and toks[i + 2].src == "str":
                text += toks[i + 2].text
                i += 2
            out.append(Tok("lit", text, t.pos, "str"))
        else:
            out.append(t)
        i += 1
    return out


def _diagnostic_depth(code: str, depth: int) -> int:
    """The parenthesis depth inside a diagnostic call after this code token (0 when outside one)."""
    i = 0
    if depth == 0:
        m = _DIAGNOSTIC.search(code)
        if not m:
            return 0
        i, depth = m.end(), 1
    for ch in code[i:]:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return 0
    return depth


def _find_sinks(toks: list[Tok], s: Scan) -> None:
    """Each content-printing call with its argument expressions (literals quoted back in)."""
    for k, t in enumerate(toks):
        if t.kind != "code":
            continue
        for m in _SINK.finditer(t.text):
            text, depth, args, buf = t.text[m.end():], 1, [], []
            seq = [S_Tok for S_Tok in toks[k + 1:k + 40]]
            pieces = [text] + [("'" + x.text + "'") if x.kind == "lit" else x.text for x in seq]
            done = False
            for piece in pieces:
                for ch in piece:
                    if ch == "(":
                        depth += 1
                    elif ch == ")":
                        depth -= 1
                        if depth == 0:
                            done = True
                            break
                    if ch == "," and depth == 1:
                        args.append("".join(buf).strip())
                        buf = []
                        continue
                    buf.append(ch)
                if done:
                    break
            args.append("".join(buf).strip())
            s.sinks.append(Sink(m.group(1), args[0] if args else "", args[1] if len(args) > 1 else "", t.pos + m.start()))


def _scan_markup(lit: str, base: int, s: Scan, toks: list[Tok], k: int, add, literal: bool = False) -> None:
    for m in _TAG_OPEN.finditer(lit):
        name = _tag_name(m.group(1))
        if name:
            add(s.tags, name, base + m.start())
    for m in _TAG_DYN.finditer(lit):
        expr = _sprintf_arg(toks, k, lit, m.start()) if lit[m.start() + 1] == "%" else ""
        s.dyn.append(Dyn("renders-tag", expr, base + m.start(), "a tag name from a variable"))
    if literal and re.search(r"<\s*$", lit) and not re.search(r"<\s*/\s*$", lit):
        expr = _next_code_expr(toks, k)
        if expr:  # '<' . $tag (a literal '<' passed to strpos() is not markup)
            s.dyn.append(Dyn("renders-tag", expr, base + len(lit), "a tag name from a variable"))
    for m in _ROLE_ATTR.finditer(lit):
        val = m.group(1) or ""
        if val and val[0] not in HOLE + "%":
            if val in ARIA_ROLES:
                add(s.roles, val, base + m.start())
            continue
        if val.startswith("%"):
            expr = _sprintf_arg(toks, k, lit, m.start(1))
        elif val.startswith(HOLE):
            expr = ""
        elif literal and m.end() >= len(lit.rstrip()):
            expr = _next_code_expr(toks, k)
        else:
            continue
        s.dyn.append(Dyn("renders-role", expr, base + m.start(), "a role from a variable"))
    for m in _ARIA_ATTR.finditer(lit):
        name = m.group(1)
        if name.endswith("-"):
            s.dyn.append(Dyn("renders-aria", "", base + m.start(), "an aria-* name from a variable"))
        elif name in ARIA_ATTRS:
            add(s.arias, name, base + m.start())
    for m in _BIND.finditer(lit):
        if m.group(1) == "role":
            s.dyn.append(Dyn("renders-role", "", base + m.start(), "data-wp-bind--role (set at run time)"))
        elif m.group(1) in ARIA_ATTRS:
            add(s.arias, m.group(1), base + m.start())


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, max(0, pos)) + 1
