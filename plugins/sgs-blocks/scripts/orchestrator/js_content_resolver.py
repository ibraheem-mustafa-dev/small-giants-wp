"""js_content_resolver.py — expand `<sc-for>` loops whose repeated content lives ONLY in a draft's
JS `static ARRAY = [...]` class property, never as static text in the DOM.

Problem (Spec 31 FR-31-26, `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §15, design-gated with Bean
2026-09-19; extended to multi-field items by plan step A2b, D1134): a Claude Design draft's `<sc-for>`
item template binds to `{{ r.title }}` / `{{ r.body }}` mustaches, and the real content exists only inside a
`static X = [...]` class property, resolved at runtime by the draft's own JS. Every extraction signal this
pipeline has operates on DOM text, so such a loop hands them nothing.

Mechanism (proven live, not guessed): render the draft with its OWN JS runtime in a real browser — NOT parse
the JS ourselves. The draft's `support.js` resolves `<sc-for>` / `{{ }}` / `dc-import` for real when the draft
is served over actual HTTP and loaded with Playwright (`file://` blocks the runtime's own `fetch()` calls).
Same pattern as Spec 33's `theme-extractor/measure.js`.

Capture is PER FIELD, keyed by marker, never by document order (FR-31-26.2). In a TEMPORARY served copy every
`{{ }}` in the item body that mentions the loop variable gets a carrier: a text-position mustache is wrapped
in `<span data-sgs-f="fK">`, an attribute-position mustache gets a sibling `data-sgs-a-fK="{{ ... }}"`
attribute, and the item's first element gets `data-sgs-resolve-id="rN"`. The runtime clones that element once
per array row, so reading `fK` from each clone gives every field of every row. A mustache that does not
mention the loop variable (`{{ secPad }}`, a width-driven style value) is never touched: the script-bindings
stage (A1) resolves those per device, and baking a desktop value here would undo that.

Splice-back is SURGICAL STRING-LEVEL patching, exactly mirroring `dc_import_resolver.py`'s discipline: the
`<sc-for>` is replaced by N copies of its ORIGINAL body with each captured mustache replaced by its
HTML-escaped value. This module never parses the pipeline-bound mockup through BeautifulSoup.

Never silent: a mustache that could not be captured (a branch that did not render, a handler, a computed value
that is a function) stays as it was and is listed in the report with its loop, item number and expression. A
loop that renders zero rows at load (empty bag, nothing selected), starts with a conditional, or contains a
nested loop is skipped with its reason.

Field markers (FR-31-31, Spec 31 section 13.2): when the draft carries a `data-sgs-manifest` block (the only
consumer of the markers is `manifest_annotation.py`), a `{{ var.field }}` that is the WHOLE content of the
element that receives it (a text node that is the element's only child, or a whole attribute value) leaves a
marker on that element: `data-src-field="field"` for text, `data-src-field-<attr>="field"` for an attribute.
The annotator maps the draft's field names to the block's item fields by those names instead of by counting
and ordering text, and strips every marker again. Mixed content (`Free delivery {{ i.x }}`, `{{ i.a }} {{ i.b }}`) is never marked:
no single field name describes it.

A mustache that is the WHOLE VALUE of one CSS declaration inside a `style` attribute (`background: {{ r.colour }}`) is
whole content too: it leaves `data-src-field-style="<field>:<property>"` on that element (`colour:background`). An
element with several such declarations gets ONE marker, its entries comma-separated, because an attribute name may
appear once. The annotator uses it to route a colour the draft binds to an item (an avatar circle) onto the block's
colour item field; every other consumer ignores it, and `strip_field_markers` removes it like every other marker. The marker name deliberately sits OUTSIDE the `data-sgs-`
namespace, because the converter's `lift_behavioural_attrs` reads any `data-sgs-<x>` as a candidate value for a
block attribute called `x`, which would make `data-sgs-field` collide with any block that ever gains a `field`
attribute.

Loop-duplicate collapse: a seamless marquee is written as a list doubled in the draft script
(`mBrands.concat(mBrands)`) so its CSS loop has no visible seam. The SGS block clones its own set at runtime, so
keeping both halves shows every brand twice. A resolved loop whose second half repeats its first half field for
field is collapsed to one set, but ONLY when the draft itself says it is a seamless-loop duplicate: the script
binds that loop's variable to `x.concat(x)` / `[...x, ...x]`, OR an ancestor of the loop runs an infinite CSS
animation whose `@keyframes` shift the strip by half (`translateX(-50%)`, the seamless-loop signature). Without
that evidence a repeated list is content (an FAQ may repeat an entry) and is never touched. The report entry says
`loop_duplicate_collapsed: true` with the counts before and after and the evidence. `collapse_loop_duplicates=False`
(the orchestrator's `--no-collapse-loop-duplicates`) turns the collapse off alone: the loops are still expanded, every
row is kept, and an entry that had evidence says `loop_duplicate_collapse_skipped` instead.

What the CSS evidence reads (and does not): an ancestor's animation is taken from its inline `style` and from
top-level rules whose selector is exactly one class (`.strip { }`, or a list of them). A rule inside `@media`,
`@supports`, `@container` or `@layer` is skipped, and so is a rule for a descendant or compound selector
(`.wrap .strip`, `.a.strip`): each applies only under a condition, or only to a different element, than this one, so
counting it would over-match. Cascade ORDER and `!important` between two rules on the same element are not evaluated
(all matching top-level rules are read together). The evidence text in the report says so.

Regression safety (FR-31-26.3): (1) a draft with no `<sc-for>` returns the same string with no subprocess
spawned; (2) fail-soft: ANY failure (server, Playwright, timeout, an unrendered runtime) returns the ORIGINAL
html unchanged and never raises. The pipeline runs it by default; `--no-resolve-js-content` opts out.
"""
from __future__ import annotations

import html as _html
import json
import logging
import re
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

_LOG = logging.getLogger(__name__)

# Same explicit-close-only, non-greedy span convention as `dc_import_resolver.py::_DC_IMPORT_RE`.
_SC_FOR_RE = re.compile(r"<sc-for\b([^>]*)>(.*?)</sc-for>", re.IGNORECASE | re.DOTALL)
_ATTR_RE = re.compile(r'([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"')
_MUSTACHE_RE = re.compile(r"\{\{[^}]*\}\}")
_SC_IF_RE = re.compile(r"<sc-if\b[^>]*>(.*?)</sc-if>", re.IGNORECASE | re.DOTALL)
# A start tag with quoted attribute values (a `>` inside quotes does not end it).
_TAG_RE = re.compile(r"""<([a-zA-Z][\w-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>""")
_TAG_ATTR_RE = re.compile(r"""([a-zA-Z_:@][-\w:.@]*)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
# The item template's own opening tag: the FIRST element inside `<sc-for>...</sc-for>`.
_FIRST_CHILD_RE = re.compile(r"^\s*<([a-zA-Z][\w-]*)", re.DOTALL)
_UNUSABLE_VALUE_RE = re.compile(r"^\s*(?:function\b|\(?[\w$,\s]*\)?\s*=>)|\[object ")
_NEVER_CAPTURED_ATTRS = frozenset({"ref", "key"})

_MANIFEST_MARK_RE = re.compile(r"\bdata-sgs-manifest\b")
_VOID_TAGS = frozenset("area base br col embed hr img input link meta param source track wbr".split())
_MARKER_ATTR_NAME_RE = re.compile(r"^[a-z][a-z0-9-]*$")
# Marker attribute names. Outside the `data-sgs-` namespace on purpose (see the module docstring).
TEXT_MARKER = "data-src-field"
ATTR_MARKER_PREFIX = "data-src-field-"
STYLE_MARKER = ATTR_MARKER_PREFIX + "style"

_RESOLVE_SCRIPT = Path(__file__).with_name("resolve-js-content.js")
_RENDER_TIMEOUT_SECONDS = 90


def _parse_attrs(attr_str: str) -> dict[str, str]:
    return {name: value for name, value in _ATTR_RE.findall(attr_str)}


def _mentions(expr: str, var: str) -> bool:
    return bool(re.search(r"(?<![\w$.])" + re.escape(var) + r"(?![\w$])", expr))


def _is_directive(tag: str) -> bool:
    """`sc-if`, `sc-for`, `dc-import` ...: the draft runtime consumes these, so a carrier on one is lost."""
    return tag.lower().startswith(("sc-", "dc-"))


def item_slots(body: str, var: str) -> list[dict[str, Any]]:
    """Every `{{ ... }}` in `body` that mentions the loop variable, in document order.

    ``{"id": "fK", "kind": "text"|"attr", "start", "end", "mustache", "tag_insert"}`` where ``start``/``end``
    are offsets in ``body`` and ``tag_insert`` (attr only) is the offset just after the tag name, where a
    carrier attribute can be added without disturbing anything else.

    A slot that is the WHOLE content of its holder element also carries ``field`` (the property name in
    ``{{ var.field }}``), ``marker_at`` (the offset just after the holder's tag name) and ``marker`` (the marker
    attribute name to stamp there). Mixed content never has them: no single field name describes it. A slot that is
    the whole value of one CSS declaration in a ``style`` attribute also carries ``style_prop`` (the property name), and
    its marker is ``STYLE_MARKER``.
    """
    slots: list[dict[str, Any]] = []
    field_re = re.compile(r"^\{\{\s*" + re.escape(var) + r"\.([A-Za-z_$][\w$]*)\s*\}\}$")

    def add(kind: str, start: int, end: int, tag_insert: int | None = None,
            whole: tuple[int, str] | tuple[int, str, str] | None = None) -> None:
        text = body[start:end]
        inner = text[2:-2].strip()
        # A bare `{{ p }}` is the whole row (in a product loop, a nested card): no single value to capture.
        if inner != var and _mentions(inner, var):
            slot: dict[str, Any] = {"id": "f%d" % len(slots), "kind": kind, "start": start, "end": end,
                                    "mustache": text, "tag_insert": tag_insert}
            named = field_re.match(text)
            if whole is not None and named is not None:
                slot.update({"field": named.group(1), "marker_at": whole[0], "marker": whole[1]})
                if len(whole) == 3:
                    slot["style_prop"] = whole[2]
            slots.append(slot)

    pos = 0
    for tag in _TAG_RE.finditer(body):
        for m in _MUSTACHE_RE.finditer(body, pos, tag.start()):
            add("text", m.start(), m.end(), whole=_text_holder(body, m.start(), m.end()))
        if not _is_directive(tag.group(1)):
            attrs_at = tag.start(2)
            for a in _TAG_ATTR_RE.finditer(tag.group(2)):
                if a.group(1).lower().startswith("on") or a.group(1).lower() in _NEVER_CAPTURED_ATTRS:
                    continue
                value = a.group(2) if a.group(2) is not None else a.group(3)
                value_at = attrs_at + a.start(2) if a.group(2) is not None else attrs_at + a.start(3)
                for m in _MUSTACHE_RE.finditer(value):
                    marker = ATTR_MARKER_PREFIX + a.group(1).lower()
                    whole = (tag.end(1), marker) if (
                        m.start() == 0 and m.end() == len(value) and _MARKER_ATTR_NAME_RE.match(a.group(1).lower())) else None
                    if whole is None and a.group(1).lower() == "style":
                        whole = _style_declaration_holder(value, m, tag.end(1))
                    add("attr", value_at + m.start(), value_at + m.end(), tag.end(1), whole=whole)
        pos = tag.end()
    for m in _MUSTACHE_RE.finditer(body, pos):
        add("text", m.start(), m.end(), whole=_text_holder(body, m.start(), m.end()))
    return slots


def _style_declaration_holder(value: str, mustache: re.Match, insert_at: int) -> tuple[int, str, str] | None:
    """``(offset just after the holder's tag name, STYLE_MARKER, property)`` when the mustache is the whole value of one
    declaration of a ``style`` attribute (``background: {{ r.colour }}``), else None. Whole means: a ``property:``
    directly before it (start of the value or after a ``;``) and only whitespace before the next ``;`` or the end
    after it. ``{{ r.a }}px`` or ``a {{ r.b }}`` inside one value is mixed content and never qualifies."""
    before = re.search(r"(?:^|;)\s*([a-zA-Z-]+)\s*:\s*$", value[:mustache.start()])
    if before is None or re.match(r"\s*(?:;|$)", value[mustache.end():]) is None:
        return None
    return insert_at, STYLE_MARKER, before.group(1).lower()


def _text_holder(body: str, start: int, end: int) -> tuple[int, str] | None:
    """``(offset just after the holder's tag name, TEXT_MARKER)`` when the mustache at ``body[start:end]`` is the
    only thing inside an ordinary element (whitespace aside), else None. The element must be opened immediately
    before the mustache and closed immediately after it."""
    lt = body.rfind("<", 0, start)
    if lt < 0:
        return None
    tag = _TAG_RE.match(body, lt)
    if tag is None or tag.end() > start or body[tag.end():start].strip() or _is_directive(tag.group(1)):
        return None
    if tag.group(1).lower() in _VOID_TAGS:
        return None
    if not re.match(r"\s*</" + re.escape(tag.group(1)) + r"\s*>", body[end:], re.IGNORECASE):
        return None
    return tag.end(1), TEXT_MARKER


def find_expandable_sc_fors(html: str) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """``(candidates, skipped)``: every `<sc-for>` this module can expand, and each one it cannot with why.

    A candidate has a loop variable, at least one capturable mustache, an ordinary HTML element as its first
    child (the runtime clones exactly that element per row) and no nested `<sc-for>`. ``span`` is the
    `(start, end)` of the whole `<sc-for>...</sc-for>` in `html`.
    """
    candidates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    for m in _SC_FOR_RE.finditer(html):
        attrs = _parse_attrs(m.group(1))
        loop = attrs.get("list", "")
        body = m.group(2)
        var = attrs.get("as", "")

        def skip(reason: str, _loop: str = loop) -> None:
            skipped.append({"loop": _loop, "reason": reason})

        if not var:
            skip("no loop variable (`as`)")
            continue
        if re.search(r"<sc-for\b", body, re.IGNORECASE):
            skip("contains a nested loop")
            continue
        first = _FIRST_CHILD_RE.match(body)
        if first is None or _is_directive(first.group(1)):
            skip("item template does not start with an ordinary element (a conditional or bare text)")
            continue
        slots = item_slots(body, var)
        if not slots:
            continue                                  # nothing bound to the loop variable: nothing to resolve
        candidates.append({
            "span": (m.start(), m.end()), "list_expr": loop, "as_name": var, "body": body,
            "slots": slots, "first_child_insert": first.end(1), "branches": if_branches(body),
        })
    return candidates, skipped


def _carrier(slot: dict[str, Any]) -> str | None:
    mustache = slot["mustache"]
    quote = '"' if '"' not in mustache else ("'" if "'" not in mustache else None)
    return None if quote is None else " data-sgs-a-%s=%s%s%s" % (slot["id"], quote, mustache, quote)


def _apply(body: str, edits: list[tuple[int, int, str, int]]) -> str:
    """Apply ``(start, end, replacement, order)`` edits from the last offset back so earlier offsets stay valid."""
    for start, end, text, _order in sorted(edits, key=lambda e: (e[0], e[3]), reverse=True):
        body = body[:start] + text + body[end:]
    return body


def inject_capture_markers(html: str, candidates: list[dict[str, Any]]) -> tuple[str, dict[str, dict[str, Any]]]:
    """Mark a COPY of `html` for capture. Returns `(marked_html, {marker id: candidate})`; never mutates `html`."""
    if not candidates:
        return html, {}
    marker_map: dict[str, dict[str, Any]] = {}
    marked = html
    for idx, cand in sorted(enumerate(candidates), key=lambda p: p[1]["span"][0], reverse=True):
        marker_id = "r%d" % (idx + 1)
        marker_map[marker_id] = cand
        edits: list[tuple[int, int, str, int]] = [
            (cand["first_child_insert"], cand["first_child_insert"], ' data-sgs-resolve-id="%s"' % marker_id, 0)]
        for order, slot in enumerate(cand["slots"], start=1):
            if slot["kind"] == "text":
                edits.append((slot["start"], slot["end"],
                              '<span data-sgs-f="%s">%s</span>' % (slot["id"], slot["mustache"]), order))
            else:
                carrier = _carrier(slot)
                if carrier is not None:
                    edits.append((slot["tag_insert"], slot["tag_insert"], carrier, order))
        for b in cand["branches"]:
            edits.append((b["open_end"], b["open_end"], '<span data-sgs-b="%s" hidden></span>' % b["id"], 0))
        new_body = _apply(cand["body"], edits)
        start, end = cand["span"]
        whole = marked[start:end]
        marked = marked[:start] + whole.replace(cand["body"], new_body, 1) + marked[end:]
    return marked, marker_map


def _usable(value: Any) -> bool:
    return isinstance(value, str) and "{{" not in value and "}}" not in value and not _UNUSABLE_VALUE_RE.search(value)


def if_branches(body: str) -> list[dict[str, Any]]:
    """Each `<sc-if>...</sc-if>` in `body`: ``{id, start, end, open_end}``; ``open_end`` is the offset just after
    the opening tag, where a presence marker goes.

    A branch containing another `<sc-if>` is skipped (the non-greedy close would mis-pair it)."""
    out: list[dict[str, Any]] = []
    for m in _SC_IF_RE.finditer(body):
        if re.search(r"<sc-if\b", m.group(1), re.IGNORECASE):
            continue
        out.append({"id": "b%d" % len(out), "start": m.start(), "end": m.end(), "open_end": m.start(1)})
    return out


def _not_rendered(branch: dict[str, Any], fields: dict[str, Any]) -> bool:
    """True when the runtime did NOT render this branch for this row: its presence marker (a hidden span the
    temporary copy carries inside every branch) is missing from the row's clone. Exact: it does not depend on
    what the branch contains, so a branch of attributes only or of static text is decided the same way."""
    return branch["id"] not in fields


def _expand(cand: dict[str, Any], items: list[dict[str, Any]], report: dict[str, Any],
            stamp_fields: bool = False, collapse: dict[str, Any] | None = None) -> str:
    pieces: list[str] = []
    captured = 0
    pruned = 0
    stamped = 0
    for number, item in enumerate(items, start=1):
        fields = item.get("fields") or {}
        edits: list[tuple[int, int, str, int]] = []
        style_marks: dict[int, tuple[int, list[str]]] = {}
        dead = [b for b in cand.get("branches", []) if _not_rendered(b, fields)]
        for b in dead:
            edits.append((b["start"], b["end"], "", -1))
            pruned += 1
        for order, slot in enumerate(cand["slots"]):
            if any(b["start"] <= slot["start"] and slot["end"] <= b["end"] for b in dead):
                continue                                   # inside a branch the runtime did not render: gone with it
            value = fields.get(slot["id"])
            if _usable(value):
                edits.append((slot["start"], slot["end"],
                              _html.escape(value, quote=(slot["kind"] == "attr")), order))
                captured += 1
                if stamp_fields and slot.get("field") and slot.get("style_prop"):
                    entry_list = style_marks.setdefault(slot["marker_at"], (order, []))[1]
                    entry_list.append("%s:%s" % (slot["field"], slot["style_prop"]))
                    stamped += 1
                elif stamp_fields and slot.get("field"):
                    edits.append((slot["marker_at"], slot["marker_at"],
                                  ' %s="%s"' % (slot["marker"], _html.escape(slot["field"], quote=True)), order))
                    stamped += 1
            else:
                report["gaps"].append({
                    "loop": cand["list_expr"], "item": number, "expr": slot["mustache"],
                    "reason": "the draft's runtime produced no plain value for it (a handler, a computed value or an unrendered branch)"})
        for at, (order, entries) in style_marks.items():
            edits.append((at, at, ' %s="%s"' % (STYLE_MARKER, _html.escape(",".join(entries), quote=True)), order))
        pieces.append(_apply(cand["body"], edits))
    entry: dict[str, Any] = {"loop": cand["list_expr"], "items": len(items),
                             "fields_captured": captured, "fields_per_item": len(cand["slots"]),
                             "branches_pruned": pruned}
    if stamped:
        entry["fields_marked"] = stamped
    if collapse is not None:
        entry.update(collapse)
    report["resolved"].append(entry)
    return "".join(pieces)


# ---------------------------------------------------------------------------------------------------------------
# Seamless-loop duplicates (FR-31-31)
# ---------------------------------------------------------------------------------------------------------------

_LOOP_VAR_RE = re.compile(r"^\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}$")
_DOUBLED_RE = re.compile(
    r"([A-Za-z_$][\w$.]*)\s*\.concat\(\s*\1\s*\)|\[\s*\.\.\.\s*([A-Za-z_$][\w$.]*)\s*,\s*\.\.\.\s*\2\s*\]")
_HALF_SHIFT_RE = re.compile(r"translate(?:X|3d)?\(\s*-50%")


def is_exact_repeat(items: list[dict[str, Any]]) -> bool:
    """True when the item list is one set written out twice: even length, and the second half equals the first
    half in every field of every row."""
    half, rest = divmod(len(items), 2)
    if rest or half == 0:
        return False
    return all((items[i].get("fields") or {}) == (items[i + half].get("fields") or {}) for i in range(half))


def _script_doubles_loop(source: str, list_expr: str) -> bool:
    """The draft's script binds this loop's variable to a list added to itself (`x.concat(x)`, `[...x, ...x]`)."""
    named = _LOOP_VAR_RE.match(list_expr.strip())
    if named is None:
        return False
    binding = re.compile(r"(?<![\w$.])" + re.escape(named.group(1)) + r"\s*[:=](?!=)([^;\n]{0,400})")
    return any(_DOUBLED_RE.search(m.group(1)) for m in binding.finditer(source))


def _half_shift_keyframes(source: str) -> set[str]:
    """Names of `@keyframes` blocks that move the element by half of its own width (`translateX(-50%)`)."""
    names: set[str] = set()
    for m in re.finditer(r"@keyframes\s+([\w-]+)\s*\{", source):
        depth, i = 1, m.end()
        while i < len(source) and depth:
            depth += {"{": 1, "}": -1}.get(source[i], 0)
            i += 1
        if _HALF_SHIFT_RE.search(source[m.end():i]):
            names.add(m.group(1))
    return names


class _Reached(Exception):
    """The parser reached the loop's own start tag."""


class _AncestorScan(HTMLParser):
    """The open elements (tag, attributes) at a source offset: the ancestors of whatever starts there."""

    def __init__(self, source: str, stop: int) -> None:
        super().__init__(convert_charrefs=False)
        self._lines = [0] + [i + 1 for i, ch in enumerate(source) if ch == "\n"]
        self._stop = stop
        self.stack: list[tuple[str, dict[str, str]]] = []

    def _here(self) -> int:
        line, col = self.getpos()
        return self._lines[line - 1] + col

    def handle_starttag(self, tag, attrs):  # noqa: D401 - HTMLParser hook
        if self._here() >= self._stop:
            raise _Reached
        if tag not in _VOID_TAGS:
            self.stack.append((tag, {k: (v or "") for k, v in attrs}))

    def handle_startendtag(self, tag, attrs):
        if self._here() >= self._stop:
            raise _Reached

    def handle_endtag(self, tag):
        for depth in range(len(self.stack) - 1, -1, -1):
            if self.stack[depth][0] == tag:
                del self.stack[depth:]
                return


def _ancestors_at(source: str, offset: int) -> list[tuple[str, dict[str, str]]]:
    scan = _AncestorScan(source, offset)
    try:
        scan.feed(source)
        scan.close()
    except _Reached:
        pass
    return scan.stack


_AT_RULE_RE = re.compile(r"@(?:media|supports|container|layer|document|scope)\b[^{};]*\{")


def _without_conditional_blocks(source: str) -> str:
    """``source`` with every conditional at-rule block (`@media ... { ... }`, nested braces included) removed, so a
    rule that holds only under a condition is never mistaken for one that always holds. `@keyframes` and
    `@font-face` are left in (they are not conditional, and `_half_shift_keyframes` reads the former)."""
    out, pos = [], 0
    for m in _AT_RULE_RE.finditer(source):
        if m.start() < pos:
            continue                                        # inside a block already removed
        depth, i = 1, m.end()
        while i < len(source) and depth:
            depth += {"{": 1, "}": -1}.get(source[i], 0)
            i += 1
        out.append(source[pos:m.start()])
        pos = i
    out.append(source[pos:])
    return "".join(out)


def _animation_text(source: str, attrs: dict[str, str]) -> str:
    """Every `animation*` declaration that applies to one element: inline, and from a top-level rule whose selector is
    exactly `.class` (alone or in a comma list). Rules inside `@media`/`@supports`/`@container`/`@layer` and rules for a
    descendant or compound selector are NOT read (see the module docstring): they apply conditionally or to another
    element, so reading them would over-match. Cascade order is not evaluated."""
    plain = _without_conditional_blocks(source)
    blocks = [attrs.get("style", "")]
    for cls in attrs.get("class", "").split():
        blocks += re.findall(r"(?:^|[}{;,])\s*\." + re.escape(cls) + r"(?![\w-])\s*(?:,[^{}]*)?\{([^}]*)\}", plain)
    return " ".join(d for b in blocks for d in re.findall(r"animation[\w-]*\s*:[^;]*", b))


def _looping_ancestor(source: str, span_start: int) -> str | None:
    """The name of a `@keyframes` that shifts by half, run infinitely by an ancestor of the loop, else None."""
    shifting = _half_shift_keyframes(source)
    if not shifting:
        return None
    for _tag, attrs in _ancestors_at(source, span_start):
        decl = _animation_text(source, attrs)
        if re.search(r"\binfinite\b", decl):
            for name in re.findall(r"[A-Za-z_][\w-]*", decl):
                if name in shifting:
                    return name
    return None


def duplicate_evidence(source: str, cand: dict[str, Any]) -> str | None:
    """Why the draft itself says this loop is a seamless-marquee duplicate, or None when it does not say so."""
    if _script_doubles_loop(source, cand["list_expr"]):
        return "the draft script builds the list as the same list added to itself (x.concat(x))"
    looping = _looping_ancestor(source, cand["span"][0])
    if looping is not None:
        return ("an ancestor runs the infinite animation '%s', which shifts the strip by half (a seamless loop); read "
                "from inline styles and top-level single-class rules only, so media queries and cascade order were not "
                "evaluated" % looping)
    return None


def splice_expanded_items(html: str, marker_map: dict[str, dict[str, Any]],
                          captured: dict[str, list[dict[str, Any]]],
                          stamp_fields: bool = False,
                          collapse_loop_duplicates: bool = True) -> tuple[str, int, dict[str, Any]]:
    """Replace each rendered loop's `<sc-for>` with its expanded items. Returns `(html, loops, report)`.

    ``stamp_fields`` leaves a field marker on every element whose whole content is one field (see the module
    docstring); the caller turns it on only for a draft that carries a manifest. ``collapse_loop_duplicates=False``
    keeps every row of a loop the draft doubled (the entry records that it had evidence and was left alone).
    """
    report: dict[str, Any] = {"resolved": [], "gaps": [], "skipped": []}
    count = 0
    source = html
    for _marker, cand in sorted(marker_map.items(), key=lambda kv: kv[1]["span"][0], reverse=True):
        items = captured.get(_marker) or []
        if not items:
            report["skipped"].append({"loop": cand["list_expr"], "reason": "rendered 0 items at load (state-driven or hidden)"})
            continue
        if any(not _usable(v) and isinstance(v, str) and ("{{" in v or "}}" in v)
               for item in items for v in (item.get("fields") or {}).values()):
            _LOG.warning("js_content_resolver: loop %s came back as unrendered template text; leaving it untouched", cand["list_expr"])
            report["skipped"].append({"loop": cand["list_expr"], "reason": "the draft's runtime did not render it"})
            continue
        collapse: dict[str, Any] | None = None
        if is_exact_repeat(items):
            evidence = duplicate_evidence(source, cand)
            if evidence is not None and not collapse_loop_duplicates:
                collapse = {"loop_duplicate_collapse_skipped": "switched off (--no-collapse-loop-duplicates)",
                            "duplicate_evidence": evidence}
            elif evidence is not None:
                collapse = {"loop_duplicate_collapsed": True, "items_before_collapse": len(items),
                            "items_after_collapse": len(items) // 2, "duplicate_evidence": evidence}
                items = items[:len(items) // 2]
        start, end = cand["span"]
        html = html[:start] + _expand(cand, items, report, stamp_fields, collapse) + html[end:]
        count += 1
    return html, count, report


def resolve_js_array_content_with_report(html: str, mockup_dir: Path,
                                         collapse_loop_duplicates: bool = True) -> tuple[str, int, dict[str, Any]]:
    """Top-level entry point: `(html, loops expanded, report)`. Fail-soft at every stage; never raises.

    ``collapse_loop_duplicates`` (default True) is the seamless-marquee collapse of the module docstring; False leaves
    every row in place.

    A `html` with no expandable `<sc-for>` returns at once with no subprocess spawned.
    """
    candidates, skipped = find_expandable_sc_fors(html)
    report: dict[str, Any] = {"resolved": [], "gaps": [], "skipped": list(skipped)}
    if not candidates:
        return html, 0, report

    marked_html, marker_map = inject_capture_markers(html, candidates)
    tmp_dir = None
    try:
        tmp_dir = tempfile.TemporaryDirectory(prefix="sgs-js-resolve-")
        tmp_path = Path(tmp_dir.name)
        marked_file = tmp_path / "marked.dc.html"
        marked_file.write_text(marked_html, encoding="utf-8")
        # Sibling assets (support.js, image-slot.js, other .dc.html components) must be reachable at the SAME
        # relative paths the runtime expects.
        for sibling in mockup_dir.iterdir():
            if sibling.is_file():
                dest = tmp_path / sibling.name
                if not dest.exists():
                    dest.write_bytes(sibling.read_bytes())

        proc = subprocess.run(["node", str(_RESOLVE_SCRIPT), "--draft", str(marked_file)],
                              capture_output=True, text=True, encoding="utf-8", timeout=_RENDER_TIMEOUT_SECONDS)
        if proc.returncode != 0:
            _LOG.warning("js_content_resolver: render script exited %s; leaving draft unchanged (%s)",
                         proc.returncode, proc.stderr[:500])
            return html, 0, report
        payload = json.loads(proc.stdout)
        if isinstance(payload, dict) and "error" in payload:
            _LOG.warning("js_content_resolver: render failed (%s); leaving draft unchanged", payload["error"])
            return html, 0, report
    except Exception as exc:  # noqa: BLE001 — fail-soft is the whole point here
        _LOG.warning("js_content_resolver: soft-failed (%s); leaving draft unchanged", exc)
        return html, 0, report
    finally:
        if tmp_dir is not None:
            tmp_dir.cleanup()

    new_html, count, spliced = splice_expanded_items(html, marker_map, payload,
                                                     stamp_fields=_MANIFEST_MARK_RE.search(html) is not None,
                                                     collapse_loop_duplicates=collapse_loop_duplicates)
    spliced["skipped"] = report["skipped"] + spliced["skipped"]
    return new_html, count, spliced


def resolve_js_array_content(html: str, mockup_dir: Path) -> tuple[str, int]:
    """`(html, loops expanded)`: `resolve_js_array_content_with_report` without the report."""
    new_html, count, _report = resolve_js_array_content_with_report(html, mockup_dir)
    return new_html, count
