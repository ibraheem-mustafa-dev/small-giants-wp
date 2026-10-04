"""Channel tokens: what one PHP statement emits.

  DECL  a CSS declaration (`prop:` in a string, `'css' => 'prop'`, a quoted
        property argument, a style-engine key), or a call to a function whose body
        emits CSS (`wp_style_engine_get_styles`, `sgs_*_css`, a known
        value-to-declaration helper such as `sgs_border_radius_tiers`)
  CP    a custom property set in a string (`--sgs-x:` anywhere, `'--sgs-x' =>`,
        `['--sgs-x'] =`, a dynamic `'--sgs-x-' . $axis` prefix)
  CLASS a class token (`sgs-`/`is-`/`has-`, BEM `__` and `--` shapes, prefixes
        built by concatenation) in a class context or an array append
  DATA  a data attribute (`data-…`) or an interactivity context/state
  FWD   a nested `render_block` / `WP_Block`

Tokens are read from the statement with every `['key']` index blanked (length
kept, so offsets line up), and the attribute's own quoted name is never its own
declaration (`'margin'`, `'gap'`).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from wf_php import rx, split_arg_spans

CSS_PROPS = (
    r"(?:color|background(?:-color|-image|-size|-position|-repeat|-attachment|-blend-mode)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-start|-end)?)?"
    r"(?:-(?:width|style|color|radius))?|border-(?:top|bottom)-(?:left|right)-radius|padding(?:-[a-z-]+)?|margin(?:-[a-z-]+)?|font(?:-(?:size|family|weight|style|variant))?|line-height|"
    r"letter-spacing|word-spacing|text-(?:transform|decoration(?:-[a-z]+)?|align|shadow|indent|wrap|underline-offset)|box-shadow|(?:max-|min-)?(?:width|height|inline-size|block-size)|"
    r"gap|row-gap|column-gap|grid-(?:template-(?:columns|rows|areas)|auto-(?:rows|columns|flow)|column|row|area)|justify-(?:content|items|self)|align-(?:items|self|content)|"
    r"place-(?:items|content|self)|flex(?:-(?:direction|wrap|grow|shrink|basis|flow))?|opacity|transform(?:-origin)?|filter|backdrop-filter|object-(?:fit|position)|aspect-ratio|"
    r"inset(?:-[a-z-]+)?|top|left|right|bottom|z-index|display|order|fill|stroke(?:-width)?|outline(?:-[a-z]+)?|transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?|mix-blend-mode|"
    r"clip-path|mask(?:-[a-z]+)?|columns|column-(?:count|width|rule)|writing-mode|white-space|overflow(?:-[xy])?|position|scale|rotate|translate|cursor|accent-color|caret-color|"
    r"hyphens|vertical-align|list-style(?:-[a-z]+)?|visibility|isolation|content|-webkit-line-clamp|line-clamp|text-overflow|scroll-[a-z-]+|perspective|will-change|"
    r"border-collapse|table-layout|counter-[a-z]+|object-view-box|offset-[a-z]+|stop-color)"
)
DECL_RE = re.compile(r"""['"\s;{(]""" + CSS_PROPS + r"""\s*:(?!:)""")
CSS_KEY_RE = re.compile(r"""['"](?:css|property|prop|css_property)['"]\s*=>\s*['"]([a-z-]+|--sgs-[a-z0-9-]+)['"]""")
QUOTED_PROP_ARG_RE = re.compile(r"""[,(]\s*['"]""" + CSS_PROPS + r"""['"]\s*[,)]""")
STYLE_ENGINE_KEY_RE = re.compile(r"""['"](?:spacing|border|color|typography|dimensions|shadow)['"]\s*=>""")
CP_SET_RE = re.compile(r"(--sgs-[a-z0-9-]*[a-z0-9])\s*['\"]?\s*(?::|=>|\]\s*=(?!=))")
CP_DYN_RE = re.compile(r"""(--sgs-[a-z0-9-]*-)['"]\s*\.""")
# A custom-property name passed as a value (`'attr' => '--sgs-x'`, `array( '--sgs-x' )`).
CP_NAME_RE = re.compile(r"""['"](--sgs-[a-z0-9-]*[a-z0-9])['"]""")
# A custom-property helper given the bare name (`sgs_custom_property_gradient_decls( 'sgs-x', … )`).
CP_HELPER_RE = re.compile(r"""\b\w*custom_propert\w*\s*\(\s*['"](sgs-[a-z0-9-]*[a-z0-9])['"]""")
CLASS_TOKEN_RE = re.compile(r"""(?<![\w-])((?:sgs|is|has)-[a-z0-9][a-z0-9_-]*)""")
PREFIX_TAIL_RE = re.compile(r"""['"]\s*\.(?!=)""")
CLASS_CONTEXT_RE = re.compile(r"""class|\$\w*class\w*\s*\[\s*\]|implode\(\s*['"]\s['"]""", re.I)
DATA_RE = re.compile(r"""(data-[a-z0-9-]+)|wp_interactivity_data_wp_context|wp_interactivity_state|data-wp-context""")
FWD_RE = re.compile(r"""render_block\s*\(|new\s+\\?WP_Block\s*\(|['"]blockName['"]\s*=>""")
EMITTER_NAME_RE = re.compile(
    r"\b(wp_style_engine_get_styles|sgs_\w*(?:_css|_css_rule|_decls?|_rules?|_paint_decl|_state_css|_style)|sgs_emit_\w+|sgs_hover_state_rules|sgs_tier_\w+|"
    r"sgs_typography_css_rule|sgs_serialise_\w+|sgs_border_radius_tiers|sgs_box_\w+|sgs_shadow_\w+|sgs_slider_nav_classes|sgs_media_element_style)\s*\("
)
# Raw stylesheet text: a `<style>` element, or an append onto a CSS buffer (`$css .= $custom`).
RAW_STYLE_RE = re.compile(r"<style\b[^>]*>(.*?)(?:</style|$)", re.I | re.S)
CSS_BUFFER_APPEND_RE = re.compile(r"^\s*\$\w*css\w*\s*(?:\.=|\[\s*\]\s*=)\s*\$\w+\s*;", re.I)
INDEX_LIT_RE = re.compile(r"""\[\s*(['"])[^'"\]]*\1\s*\]""")
SGS_CALL_RE = re.compile(r"\b(sgs_\w*)\s*\(")
# A visual-effect runtime (Spec 38 motion and fx): the emitting statement names it.
FX_RUNTIME_RE = re.compile(r"(?:data-|sgs-|\b)(?:fx|anim|animation|physics|image-sequence|path-draw|lottie|magnet|reactive|parallax|ken-burns)\b", re.I)
TERNARY_RE = re.compile(r"\?(?![?>:])[^:]*:(?!:)")
CALLEE_BEFORE_RE = re.compile(r"(\w+)\s*\($")
VALUE_LIST_FUNCS = frozenset({"in_array", "array_search", "array_key_exists", "array_keys", "array_intersect", "array_diff", "isset"})
ARRAY_KW_RE = re.compile(r"\barray\s*$")
CHILD_SEL_RE = re.compile(r">\s*\.sgs-([a-z][a-z0-9-]*[a-z0-9])(?![\w-])")
# A declaration with a literal value (`border-top:1px solid ' . …`): the statement fixes
# the value itself rather than passing another setting's value on (`color:' . $x`).
CONST_DECL_RE = re.compile(r"""['"\s;{(](""" + CSS_PROPS + r""")\s*:(?!:)\s*(?=[^'"\s;}])""")
# Properties that show, hide, size or place a box rather than paint it: a show/hide
# toggle that only switches these is switching content, not a look.
NON_PAINT_PROPS = frozenset({
    "display", "visibility", "position", "top", "right", "bottom", "left", "z-index", "order", "content",
    "width", "height", "inline-size", "block-size", "overflow", "overflow-x", "overflow-y", "clip", "clip-path",
    "white-space", "gap", "row-gap", "column-gap", "cursor", "will-change", "isolation",
})
NON_PAINT_PREFIXES = ("min-", "max-", "inset", "margin", "padding", "flex", "grid", "justify-", "align-", "place-", "scroll-")
# `'blockName' => 'sgs/x'` beside `'attrs' => …` in a nested render: the attributes forwarded.
FWD_BLOCK_RE = re.compile(r"""['"]blockName['"]\s*=>\s*['"](sgs/[a-z0-9-]+)['"]""")
FWD_ATTRS_RE = re.compile(r"""['"]attrs['"]\s*=>\s*""")


def paint_prop(prop: str) -> bool:
    return prop not in NON_PAINT_PROPS and not prop.startswith(NON_PAINT_PREFIXES)


def constant_paint_props(text: str) -> set[str]:
    """Paint properties `text` declares with a literal value."""
    return {m.group(1) for m in CONST_DECL_RE.finditer(blank_index(text)) if paint_prop(m.group(1))}


@dataclass
class Channel:
    decl: bool = False
    gate_decl: bool = False                        # a declaration only inside a block the value guards
    value_decl: bool = False                       # the value itself is written into a declaration
    decl_props: set = field(default_factory=set)   # CSS properties the reached declarations name
    cps: set = field(default_factory=set)          # linked custom properties (prefixes end in '-')
    cps_any: set = field(default_factory=set)      # every custom property in a tainted statement
    classes: set = field(default_factory=set)
    data: set = field(default_factory=set)
    fx_data: set = field(default_factory=set)      # data attributes a visual-effect runtime reads
    fwd: bool = False
    query: bool = False                            # the value reaches a query/collection call (which rows, in what order)
    gate: bool = False
    helpers: set = field(default_factory=set)
    child_sel: set = field(default_factory=set)    # `> .sgs-<block>` subjects in emitted selectors
    inner_sel: set = field(default_factory=set)    # `__inner > .sgs-<block>` subjects
    ctx_tokens: set = field(default_factory=set)   # classes/CPs only a block-context consumer emits
    fwd_tokens: set = field(default_factory=set)   # classes/CPs only a block the value is forwarded to emits
    forwards: set = field(default_factory=set)     # (block name, attribute) the value is forwarded to
    gate_paint: set = field(default_factory=set)   # paint properties a short block the value guards fixes
    gate_sites: set = field(default_factory=set)   # (text, start, end) of every block the value guards
    stmts: int = 0
    read: bool = False                             # any seed found

    def merge(self, o: "Channel") -> None:
        self.decl |= o.decl
        self.gate_decl |= o.gate_decl
        self.value_decl |= o.value_decl
        self.fwd |= o.fwd
        self.query |= o.query
        self.gate |= o.gate
        self.read |= o.read
        for k in ("cps", "cps_any", "classes", "data", "fx_data", "helpers", "child_sel", "inner_sel", "ctx_tokens",
                  "decl_props", "fwd_tokens", "forwards", "gate_paint", "gate_sites"):
            getattr(self, k).update(getattr(o, k))
        self.stmts += o.stmts

    def kinds(self) -> list[str]:
        out = []
        if self.decl or self.gate_decl:
            out.append("DECL")
        if self.cps:
            out.append("CP")
        if self.classes:
            out.append("CLASS")
        if self.data:
            out.append("DATA")
        if self.fwd:
            out.append("FWD")
        if self.gate and not out:
            out.append("GATE")
        return out


def blank_index(stmt: str) -> str:
    """`['key']` index accesses blanked (length kept, so offsets still line up)."""
    return INDEX_LIT_RE.sub(lambda m: "[" + " " * (len(m.group(0)) - 2) + "]", stmt)


def quoted_prop_arg(clean: str) -> bool:
    """A CSS property name passed as a call argument or held in a descriptor row
    (`sgs_emit( $sel, 'padding', $v )`, `array( ' .x', 'panelBodyPadding', 'padding' )`),
    never an element of a value list (`in_array( $v, array( 'phone', 'top' ) )`)."""
    for m in QUOTED_PROP_ARG_RE.finditer(clean):
        brackets = open_brackets(clean, m.start() + 1)
        if not brackets:
            continue
        if any((cm := CALLEE_BEFORE_RE.search(clean, 0, ob + 1)) and cm.group(1) in VALUE_LIST_FUNCS for ob in brackets):
            continue
        return True
    return False


def has_decl(clean: str) -> bool:
    return bool(DECL_RE.search(clean) or CSS_KEY_RE.search(clean) or quoted_prop_arg(clean) or STYLE_ENGINE_KEY_RE.search(clean)
)


class TokenReader:
    """Caches the attribute-independent tokens of each statement text."""

    def __init__(self, emits_css, block_slugs: set[str]) -> None:
        self.emits_css = emits_css
        self.block_slugs = block_slugs
        self._cache: dict[str, dict] = {}

    def static(self, stmt: str) -> dict:
        hit = self._cache.get(stmt)
        if hit is not None:
            return hit
        clean = blank_index(stmt)
        helpers = {m.group(1) for m in EMITTER_NAME_RE.finditer(clean)}
        helpers |= {n for n in set(SGS_CALL_RE.findall(clean)) if self.emits_css(n)}
        found = {(m.start(), m.group(1)) for m in CP_SET_RE.finditer(stmt)} | {(m.start(), m.group(1)) for m in CP_DYN_RE.finditer(stmt)}
        found |= {(m.start(1), m.group(1)) for m in CP_NAME_RE.finditer(stmt)}
        calls = {}
        for m in CP_HELPER_RE.finditer(stmt):
            found.add((m.start(1), "--" + m.group(1)))
            spans = split_arg_spans(stmt, stmt.index("(", m.start()))
            calls[m.start(1)] = (spans[0][0], spans[-1][1]) if spans else (m.start(), m.end())
        cps = sorted(found)
        classes = set()
        if CLASS_CONTEXT_RE.search(stmt):
            # A token the string closes on and concatenates (`'…__title--w' . $v`) is a
            # class prefix: it is marked with a trailing `*` and matches by prefix.
            classes = {m.group(1) + ("*" if PREFIX_TAIL_RE.match(stmt, m.end()) and not m.group(1).endswith(("-", "_")) else "")
                       for m in CLASS_TOKEN_RE.finditer(stmt) if not m.group(1).startswith(("sgs-blocks", "is-layout", "has-global"))}
        child, inner = self.child_selectors(clean)
        props = {m.group(0)[1:].split(":")[0].strip() for m in DECL_RE.finditer(clean)}
        props |= {m.group(1) for m in CSS_KEY_RE.finditer(clean)}
        out = {"clean": clean, "decl": has_decl(clean), "props": props, "helpers": helpers, "cps": cps, "cp_calls": calls, "classes": classes,
               "data": sorted((m.start(), m.group(1) or m.group(0)) for m in DATA_RE.finditer(stmt)), "fwd": bool(FWD_RE.search(clean)),
               "runtime": bool(FX_RUNTIME_RE.search(stmt)),
               "child": child, "inner": inner}
        self._cache[stmt] = out
        return out

    def child_selectors(self, clean: str) -> tuple[set, set]:
        """`> .sgs-<block>` subjects in a statement, and those with an `__inner >` twin."""
        child, inner = set(), set()
        for m in CHILD_SEL_RE.finditer(clean):
            if m.group(1) in self.block_slugs:
                child.add(m.group(1))
                if re.search(r"__inner\s*>\s*\.sgs-" + re.escape(m.group(1)) + r"(?![\w-])", clean):
                    inner.add(m.group(1))
        return child, inner

    def read(self, stmt: str, attr: str, refs: list[int], ch: Channel) -> None:
        """Add `stmt`'s tokens to `ch`; `refs` are the offsets of the tainted value in it."""
        st = self.static(stmt)
        decl = st["decl"]
        own = rx(r"""(['"])""" + re.escape(attr) + r"""\1""")
        if decl and own.search(st["clean"]):
            decl = has_decl(own.sub(lambda m: m.group(1) + " " * (len(m.group(0)) - 2) + m.group(1), st["clean"]))
        # Raw stylesheet text carrying the value: inside a `<style>` element, or appended
        # whole onto a CSS buffer (`$css .= $custom_css;`).
        if not decl and refs and (CSS_BUFFER_APPEND_RE.match(st["clean"]) or any(
                m.start(1) <= r < m.end(1) for m in RAW_STYLE_RE.finditer(stmt) for r in refs)):
            decl = True
        if decl:
            ch.decl_props |= st["props"]
        ch.decl |= decl or bool(st["helpers"])
        # Written into CSS by value: a declaration in the statement itself, or the style
        # engine (not an indexed function, so its body is never followed).
        ch.value_decl |= decl or "wp_style_engine_get_styles" in st["helpers"]
        ch.helpers |= st["helpers"]
        cps = st["cps"]
        for i, (pos, cp) in enumerate(cps):
            ch.cps_any.add(cp)
            el = st["cp_calls"].get(pos) or _element_span(stmt, pos)
            if el is not None:
                # One pair of an array (`'attr' => '--sgs-x'`): tied when the pair holds the value.
                if any(el[0] <= r < el[1] for r in refs):
                    ch.cps.add(cp)
                continue
            end = cps[i + 1][0] if i + 1 < len(cps) else len(stmt)
            if len(cps) == 1 or any(pos <= r < end for r in refs):
                ch.cps.add(cp)
        ch.classes |= linked_classes(stmt, st["classes"], refs)
        data = st["data"]
        for i, (pos, tok) in enumerate(data):
            end = data[i + 1][0] if i + 1 < len(data) else len(stmt)
            if len(data) == 1 or any(pos <= r < end for r in refs) or not refs:
                ch.data.add(tok)
                if st["runtime"] or FX_RUNTIME_RE.search(tok):
                    ch.fx_data.add(tok)
        ch.fwd |= st["fwd"]
        ch.child_sel |= st["child"]
        ch.inner_sel |= st["inner"]


def _innermost_bracket(stmt: str, pos: int) -> int | None:
    """Offset of the innermost `(` or `[` enclosing `pos` (string-aware), else None."""
    stack = open_brackets(stmt, pos)
    return stack[-1] if stack else None


def open_brackets(stmt: str, pos: int) -> list[int]:
    """Offsets of every `(` or `[` enclosing `pos`, outermost first (string-aware)."""
    stack: list[int] = []
    quote = None
    i = 0
    while i < pos:
        c = stmt[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in ("'", '"'):
            quote = c
        elif c in "([":
            stack.append(i)
        elif c in ")]" and stack:
            stack.pop()
        i += 1
    return stack


def linked_classes(stmt: str, classes: set, refs: list[int]) -> set:
    """Class tokens tied to the tainted value: in a list of several elements (an
    array of class names, a ternary per element), only the element holding a
    reference; a token outside any bracket is tied to the whole statement."""
    if not classes:
        return set()
    out = set()
    for tok in classes:
        for m in rx(r"(?<![\w-])" + re.escape(tok.rstrip("*")) + r"(?![\w-])").finditer(stmt):
            ob = _innermost_bracket(stmt, m.start())
            if ob is None:
                out.add(tok)
                break
            spans = split_arg_spans(stmt, ob)
            el = next(((s, e) for s, e in spans if s <= m.start() < e), None)
            if len(spans) < 2 and el is not None and refs and TERNARY_RE.search(stmt, el[0], el[1]) \
                    and not any(el[0] <= r < el[1] for r in refs):
                continue  # `( $other ? ' x--y' : '' )`: a group another value decides
            if len(spans) < 2 or el is None or any(el[0] <= r < el[1] for r in refs):
                out.add(tok)
                break
    return out


def _element_span(stmt: str, pos: int) -> tuple[int, int] | None:
    """Where a token at `pos` belongs: in an array literal of several elements, the
    element holding it; in a function call, the whole argument list (a name and its
    value travel as separate arguments); otherwise None."""
    ob = _innermost_bracket(stmt, pos)
    if ob is None:
        return None
    spans = split_arg_spans(stmt, ob)
    if len(spans) < 2:
        return None
    is_array = stmt[ob] == "[" or ARRAY_KW_RE.search(stmt[max(0, ob - 8):ob]) is not None
    if not is_array:
        return (spans[0][0], spans[-1][1])
    return next(((s, e) for s, e in spans if s <= pos < e), None)
