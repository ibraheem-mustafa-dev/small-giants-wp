"""manifest_layout_choices: read a block's LAYOUT CHOICES from the draft's structure (design 2026-09-23 section 4).

Problem: the pipeline carries CSS values, but some of a block's settings are layout choices (is a per-card mark shown, does the
source logo lead or trail its caption, where the previous / next arrows sit, which progress indicator the slider shows). No
CSS declaration says them, so every one fell back to the block's default, and the defaults were not the draft.

This module is called by ``manifest_annotation._declaration`` once a manifest-declared block has its root, items, rail and
structural classes. Four rungs, each keyed to DATA the framework database declares for the block (the attribute's role, its
``derived_selector`` element class, its ``enum_values`` and ``default_value``), never to a block or attribute name:

* PRESENCE: an attribute whose role is ``presence-boolean``. ``true`` when an element carries (or the annotator puts on it) the
  attribute's element class; for an element named ``<qualifier>-logo`` whose qualifier names the repeated ITEM in the slot
  vocabulary (``card`` lists ``item`` as an alias), the annotator places the class itself on the one decorative mark (the same
  aria-hidden test the header logo uses, so it can never lift as a reviewer photo) in every item, and ``false`` when no item
  holds one.
* ORDER: a string enum whose values each say before or after (``leading`` / ``trailing``, ``start`` / ``end``): the
  attribute's one element is first or last in its row (a ``*-reverse`` flex direction flips it; an ``order`` property makes it
  undecidable).
* PLACEMENT: a string enum whose values name arrow placements: the attribute's elements (the arrows) inside the rail's box, or
  absolutely positioned, give ``overlay``; one before and one after the rail in a horizontal row give ``sides``; after the rail,
  the row that holds them decides ``end`` / ``center`` / ``split``.
* PAGINATION: a string enum whose values name progress indicators: a run of small text-less siblings (dots) gives ``dots``;
  else a rail that scrolls with a visible scrollbar gives ``scrollbar``; else ``none``.

Every decision is reported with its evidence (``layout_choices`` on the declaration's report row); a choice that cannot be
decided from the draft's static structure and CSS is reported with ``value: null`` and nothing is written.

How a value reaches the block (the carrier): two EXISTING converter paths, chosen by the attribute's DB role, nothing new.
* ``css-modifier`` role: the BEM modifier class ``<element class>--<value>`` on the element(s) that carry the attribute's own
  element class. ``converter/resolvers/scalar_content.py::lift_scalar_content`` reads the ``--`` suffix off the first element
  that matches the attribute's ``derived_selector`` (``field_extractors.extract_field_value``, role ``css-modifier``). Not
  written when an element already carries a different ``--`` class (the extractor would read the first one).
* every other role: ``data-sgs-<attribute, kebab>="<value>"`` on the BLOCK ROOT, lifted by
  ``converter/db/db_lookup.py::lift_behavioural_attrs`` section (a) (``converter/services/assembly.py::build_block_markup``
  step 3a1, type-coerced, ``setdefault`` so a content/CSS value wins). That path skips an attribute whose
  ``equivalent_block_for`` names a block, which is why a css-modifier attribute uses its own path above.
A value equal to the block's declared default is not written (it would change nothing), so a draft that matches the
baseline gets no marker at all.

Why the words below are constants: they are LAYOUT GRAMMAR (before / after, below / end / center / split, dots / scrollbar),
the same class of constant as ``manifest_annotation._SIDES`` (CSS side keywords): they say how a value name is read, not which
block or attribute exists. The block's own enum decides which of them apply.
"""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class LayoutAttr:
    """One block attribute a layout rung may decide: DB facts only."""
    name: str
    kind: str                       # block_attributes.attr_type
    role: str | None
    selector: str | None            # block_attributes.derived_selector
    enum: tuple[str, ...] = ()
    default: object = None


_PRESENCE_ROLE = "presence-boolean"
_MODIFIER_ROLE = "css-modifier"
_ITEM_TERM = "item"                                   # the slot vocabulary's word for one repeated item
_LINK_WORD = "link"                                   # an element class naming a link the block draws
_BEFORE = frozenset({"leading", "start", "before", "first"})
_AFTER = frozenset({"trailing", "end", "after", "last"})
_PLACEMENTS: dict[str, tuple[frozenset[str], ...]] = {
    "overlay": (frozenset({"overlay"}), frozenset({"inset"}), frozenset({"inside"})),
    "sides": (frozenset({"side"}), frozenset({"flank"})),
    "end": (frozenset({"below", "end"}), frozenset({"bottom", "end"})),
    "center": (frozenset({"below", "center"}), frozenset({"below", "centre"}), frozenset({"bottom", "center"})),
    "split": (frozenset({"below", "split"}), frozenset({"bottom", "split"})),
}
_INDICATORS: dict[str, tuple[frozenset[str], ...]] = {
    "dots": (frozenset({"dot"}), frozenset({"bullet"})),
    "scrollbar": (frozenset({"scrollbar"}),),
    "none": (frozenset({"none"}), frozenset({"off"})),
}
_DOT_WORDS = frozenset({"dot", "bullet", "indicator", "pagination", "pager"})
_DOT_MAX_PX = 20.0
_MEDIA = frozenset({"img", "svg", "picture", "video", "canvas", "iframe"})
_PX_RE = re.compile(r"^(\d+(?:\.\d+)?)px$")


def _value_words(value: str, ma) -> set[str]:
    return set(ma._attr_words(value))


def _matches(value: str, alternatives: tuple[frozenset[str], ...], ma) -> bool:
    words = _value_words(value, ma)
    return any(alt <= words for alt in alternatives)


def _value_for(attr: LayoutAttr, observation: str, table: dict, ma) -> str | None:
    """The one enum value that names ``observation``, else None."""
    found = [v for v in attr.enum if _matches(v, table[observation], ma)]
    return found[0] if len(found) == 1 else None


def _rung_of(attr: LayoutAttr, ma) -> str | None:
    """Which rung decides this attribute, from its role and enum values alone (None: no rung, or more than one)."""
    if attr.role == _PRESENCE_ROLE and attr.kind == "boolean":
        return "presence"
    if attr.kind != "string" or len(attr.enum) < 2:
        return None
    rungs = []
    sides = [(bool(_value_words(v, ma) & _BEFORE), bool(_value_words(v, ma) & _AFTER)) for v in attr.enum]
    if all(b != a for b, a in sides) and any(b for b, _a in sides) and any(a for _b, a in sides):
        rungs.append("order")
    if sum(1 for v in attr.enum if any(_matches(v, alts, ma) for alts in _PLACEMENTS.values())) >= 2:
        rungs.append("placement")
    hits = {o for o, alts in _INDICATORS.items() for v in attr.enum if _matches(v, alts, ma)}
    if len(hits) >= 2 and hits & {"dots", "scrollbar"}:
        rungs.append("pagination")
    return rungs[0] if len(rungs) == 1 else None


# --------------------------------------------------------------------------------------------------------------------
# Reading the draft
# --------------------------------------------------------------------------------------------------------------------

class _Ctx:
    """What the rungs read: the block root, its items and rail, the classes placed so far, the draft's CSS."""

    def __init__(self, ma, src, owner, members, rail, block_name, edits, lookup):
        self.ma, self.src, self.owner, self.members, self.rail = ma, src, owner, members, rail
        self.prefix = f"sgs-{block_name}__"
        self.name_words = set(ma._words(block_name.replace("-", " ")))
        self.edits, self.lookup = edits, lookup
        self.full_sheet = "\n".join(ma._STYLE_TAG_RE.findall(src))
        self.sheet = ma._unconditional_css(self.full_sheet)

    def decls(self, node) -> dict[str, str]:
        return self.ma._own_declarations(node, self.sheet)

    def in_item(self, node) -> bool:
        return any(node is m or self.ma._is_inside(node, m) for m in self.members)

    def carriers(self, cls: str, items: bool) -> list:
        """Every element in the block that carries ``cls`` in the draft or has it requested by the annotator."""
        wanted = {i for i, (_n, classes) in self.edits._wanted.items() if cls in classes}
        return [n for n in [self.owner, *self.ma._descendants(self.owner)]
                if (cls in n.classes or id(n) in wanted) and (items or not self.in_item(n))]

    def class_driven(self, item) -> bool:
        """The item's content is already named by classes of this block (the field ladder classed at least one element
        inside it), so the converter lifts it by class and one more class inside it changes nothing about how it lifts."""
        wanted = {i for i, (_n, classes) in self.edits._wanted.items() if any(c.startswith(self.prefix) for c in classes)}
        return any(id(d) in wanted or any(c.startswith(self.prefix) for c in d.classes) for d in self.ma._descendants(item))

    def own_classes(self, attr: LayoutAttr) -> list[str]:
        return [c[1:] for c in sorted(self.ma._selector_classes(attr.selector))
                if c.startswith("." + self.prefix) and re.fullmatch(r"\.[a-z0-9_-]+", c)]


def _decorative(node, ma) -> bool:
    return node.name == "img" and (ma._attr(node, "aria-hidden") == "true" or ma._attr(node, "role") in ("presentation", "none"))


def _names_item(word: str, ctx: _Ctx) -> bool:
    slots_of = getattr(ctx.lookup, "slots_of", None)
    return slots_of is not None and bool(slots_of(word) & slots_of(_ITEM_TERM))


def _presence(attr: LayoutAttr, ctx: _Ctx) -> tuple[object, str]:
    ma = ctx.ma
    for cls in ctx.own_classes(attr):
        found = ctx.carriers(cls, items=True)
        if found:
            return True, f"{len(found)} element(s) in the block carry '{cls}'"
    for cls in ctx.own_classes(attr):
        words = set(ma._attr_words(cls[len(ctx.prefix):]))
        if _LINK_WORD in words:
            link = _item_link(cls, words, ctx)
            if link is not None:
                return link
            continue
        qualifier = words - {ma._LOGO_WORD} - ctx.name_words
        if ma._LOGO_WORD not in words or not qualifier or not all(_names_item(q, ctx) for q in qualifier):
            continue
        if not ctx.members:
            return None, f"'{cls}' is a mark in each item, but the block has no items to look in"
        marks = [[d for d in ma._descendants(m) if _decorative(d, ma)] for m in ctx.members]
        if all(not m for m in marks):
            return False, f"'{cls}' names a mark in each item ('{', '.join(sorted(qualifier))}' is the item in the slot vocabulary); none of the {len(marks)} items holds a decorative image"
        sources = {ma._attr(m[0], "src") for m in marks if len(m) == 1}
        if all(len(m) == 1 for m in marks) and len(sources) == 1:
            found = (f"every one of the {len(marks)} items holds one decorative (aria-hidden) image, the same mark "
                     f"('{next(iter(sources))}')")
            if not all(ctx.class_driven(m) for m in ctx.members):
                return True, (f"{found}; the mark is NOT classed, because the items carry no field classes and one class "
                              "inside an item switches the converter's item lift from role matching to class matching")
            for m in marks:
                ctx.edits.add_class(m[0], cls)
            return True, f"{found}, so each got '{cls}'"
        return None, f"'{cls}': the items do not each hold one identical decorative mark ({[len(m) for m in marks]} per item), so it is not certain"
    return None, "no element carries the attribute's class and no structural rule places it"


def _item_link(cls: str, words: set[str], ctx: _Ctx) -> "tuple[object, str] | None":
    """A per-item LINK the block draws itself (``review-link``: the link inside one review).

    The class names the item either through the slot vocabulary (``card-link``) or through the block's OWN noun
    (``review`` in a ``google-reviews`` block), so it is per-item by name; the draft must agree by structure: every
    anchor with that role sits inside an item, at most one per item, all with the same visible label (the block's
    furniture label, e.g. "Read the full review"; optional per item, as a retained ``<sc-if>`` makes it). Then each
    gets ``cls`` so the converter can route its own styles to the attributes that name it. None: not this rung.
    """
    ma = ctx.ma
    rest = words - {_LINK_WORD}
    qualifier = rest - ctx.name_words
    per_item = bool(rest) and (all(_names_item(q, ctx) for q in qualifier) if qualifier else rest <= ctx.name_words)
    if not per_item:
        return None
    if not ctx.members:
        return None, f"'{cls}' is a link in each item, but the block has no items to look in"
    anchors = [[d for d in ma._descendants(m) if d.name == "a" and ma._text_of(d, ctx.src)
                and not any(c.startswith(ctx.prefix) for c in d.classes)] for m in ctx.members]
    present = [a for a in anchors if a]
    if not present:
        return False, f"'{cls}' names a link in each item; none of the {len(anchors)} items holds one"
    labels = {ma._text_of(a[0], ctx.src) for a in present}
    if any(len(a) > 1 for a in anchors) or len(labels) != 1:
        return None, (f"'{cls}': the items' links are not one link each with one shared label "
                      f"({[len(a) for a in anchors]} per item, labels {sorted(labels)[:3]}), so it is not certain")
    found = f"{len(present)} of the {len(anchors)} items hold one link labelled '{next(iter(labels))}'"
    if not all(ctx.class_driven(m) for m in ctx.members):
        return True, (f"{found}; the link is NOT classed, because the items carry no field classes and one class "
                      "inside an item switches the converter's item lift from role matching to class matching")
    for a in present:
        ctx.edits.add_class(a[0], cls)
    return True, f"{found}, so each got '{cls}'"


def _order(attr: LayoutAttr, ctx: _Ctx) -> tuple[object, str]:
    ma = ctx.ma
    subjects = [n for c in ctx.own_classes(attr) for n in ctx.carriers(c, items=False)]
    if len(subjects) != 1:
        return None, f"{len(subjects)} elements carry the attribute's class; the order rung needs exactly one"
    node = subjects[0]
    while (node.parent is not None and node.parent is not ctx.owner and len(node.parent.elements) == 1
           and not any(c.kind == "text" and ctx.src[c.start:c.end].strip() for c in node.parent.children)):
        node = node.parent                                   # the element's own wrapper (a span around an img) moves with it
    row = node.parent
    if row is None:
        return None, "the element has no row"
    parts = [c for c in row.children if (c.kind == "tag") or (c.kind == "text" and ctx.src[c.start:c.end].strip())]
    others = [c for c in parts if c is not node]
    if not any(c.kind == "text" or ma._text_of(c, ctx.src) for c in others):
        return None, "nothing with text shares the element's row, so there is nothing for it to lead or trail"
    if any("order" in ctx.decls(c) for c in row.elements):
        return None, "an element of the row sets the CSS 'order' property, so document order is not visual order"
    index = next(i for i, c in enumerate(parts) if c is node)
    if index not in (0, len(parts) - 1):
        return None, "the element sits between other content in its row"
    first = index == 0
    direction = ctx.decls(row).get("flex-direction", "").strip().lower()
    if direction.endswith("-reverse"):
        first = not first
    side = _BEFORE if first else _AFTER
    found = [v for v in attr.enum if ma._attr_words(v) and set(ma._attr_words(v)) & side]
    if len(found) != 1:
        return None, "the attribute has no single value for that side"
    where = "first" if index == 0 else "last"
    flip = f", and the row's flex-direction '{direction}' reverses it" if direction.endswith("-reverse") else ""
    return found[0], f"the element is {where} in its row{flip}, so it is shown {'before' if first else 'after'} the row's text"


def _branch(node, top):
    """The child of ``top`` that is ``node`` or holds it."""
    while node.parent is not None and node.parent is not top:
        node = node.parent
    return node if node.parent is top else None


def _justify(ctx: _Ctx, row) -> str:
    d = ctx.decls(row)
    if d.get("display", "").strip().lower() in ("flex", "inline-flex"):
        return d.get("justify-content", "normal").strip().lower()
    return {"center": "center", "right": "flex-end", "end": "flex-end"}.get(d.get("text-align", "").strip().lower(), "normal")


def _below(ctx: _Ctx, subjects, top) -> tuple[str | None, str]:
    row = _branch(subjects[0], top)
    if row is None or any(_branch(s, top) is not row for s in subjects):
        return None, "the controls after the rail do not share one row"
    group = subjects[0] if len(subjects) == 1 else ctx.ma._common_ancestor(subjects)
    justify = _justify(ctx, row)
    if group is row or row in subjects:
        els = row.elements
        if len(subjects) >= 2 and justify in ("space-between", "space-around", "space-evenly") and els and els[0] is subjects[0] and els[-1] is subjects[-1]:
            return "split", f"the controls are the first and last items of a row laid out '{justify}'"
        if justify == "center":
            return "center", "the row holding the controls is centred"
        if justify in ("flex-end", "end", "right"):
            return "end", f"the row holding the controls is aligned '{justify}'"
        return None, f"the row holding the controls is aligned '{justify}' (start), which no value names"
    unit = _branch(group, row) or group
    if ctx.decls(unit).get("margin-left", "").strip() == "auto" or ctx.decls(unit).get("margin-inline-start", "").strip() == "auto":
        return "end", "the controls' group is pushed to the end of its row (margin-left:auto)"
    els = row.elements
    if justify in ("space-between",) and els and els[-1] is unit and len(els) > 1:
        return "end", "the controls' group is the last item of a row laid out 'space-between' (other content, such as a footnote, leads)"
    if justify == "center":
        return "center", "the row holding the controls' group is centred"
    if justify in ("flex-end", "end", "right"):
        return "end", f"the row holding the controls' group is aligned '{justify}'"
    return None, f"the controls' group sits in a row aligned '{justify}', which places it at the start or not at all"


def _placement(attr: LayoutAttr, ctx: _Ctx) -> tuple[object, str]:
    ma = ctx.ma
    subjects = sorted({id(n): n for c in ctx.own_classes(attr) for n in ctx.carriers(c, items=False)}.values(), key=lambda n: n.start)
    rail = ctx.rail
    if not subjects:
        return None, "no element carries the attribute's class"
    if rail is None or rail is ctx.owner:
        return None, "the block has no rail separate from its root to place the controls against"
    top = ma._common_ancestor([rail, *subjects])
    for s in subjects:
        if ma._is_inside(s, rail):
            return "overlay", "the controls sit inside the rail's own box"
        node = s
        while node is not None and node is not top:
            if ctx.decls(node).get("position", "").strip().lower() in ("absolute", "fixed"):
                return "overlay", "the controls are absolutely positioned over the rail's box"
            node = node.parent
    before = [s for s in subjects if s.end <= rail.start]
    after = [s for s in subjects if s.start >= rail.end]
    if before and after:
        d = ctx.decls(top) if top is not None else {}
        horizontal = (d.get("display", "").strip().lower() in ("flex", "inline-flex") and "column" not in d.get("flex-direction", "")) \
            or (d.get("display", "").strip().lower() in ("grid", "inline-grid") and len(d.get("grid-template-columns", "").split()) >= 3)
        if horizontal:
            return "sides", "one control before and one after the rail, in a row that lays them out side by side"
        return None, "one control before and one after the rail, but their container stacks them (above and below)"
    if after and len(after) == len(subjects):
        return _below(ctx, subjects, top)
    return None, "the controls sit before the rail (above it), which no value names"


_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}")
_ZERO = ("0", "0px")


def _scrollbar_hidden(ctx: _Ctx, rail) -> str | None:
    """Why the rail's scrollbar is hidden, else None. Reads the rail's own declarations and EVERY rule of the draft's
    sheet, conditional ones included (hiding it at any width is enough to not call it a visible scrollbar): a
    ``scrollbar-width:none`` on a rail class, or a ``::-webkit-scrollbar`` rule (of a rail class, or unscoped) that sets
    ``display:none`` or a zero size."""
    if ctx.decls(rail).get("scrollbar-width", "").strip().lower() == "none":
        return "the rail sets scrollbar-width:none"
    own = [re.compile(r"\." + re.escape(c) + r"(?![\w-])") for c in rail.classes]
    for m in _RULE_RE.finditer(ctx.full_sheet):
        body = {k: v.lower() for k, v in ctx.ma._declarations(m.group(2)).items()}
        for sel in (s.strip() for s in m.group(1).split(",")):
            bar = re.search(r"::-webkit-scrollbar(?![\w-])", sel)
            mine = any(p.search(sel) for p in own) or (bar is not None and sel.split("::")[0] in ("", "*", "html", "body"))
            if not mine:
                continue
            if bar and (body.get("display") == "none" or (body.get("width") in _ZERO and body.get("height", "0") in _ZERO)):
                return f"the draft hides the rail's scrollbar ('{sel}')"
            if not bar and "::" not in sel and body.get("scrollbar-width") == "none":
                return f"the draft sets scrollbar-width:none on '{sel}'"
    return None


def _is_dot(node, ctx: _Ctx) -> bool:
    ma = ctx.ma
    if ma._text_of(node, ctx.src) or any(d.name in _MEDIA for d in [node, *ma._descendants(node)]):
        return False
    d = ctx.decls(node)
    sizes = [_PX_RE.match(d.get(p, "").strip().lower()) for p in ("width", "height")]
    if all(sizes) and all(float(s.group(1)) <= _DOT_MAX_PX for s in sizes):
        return True
    names = " ".join([*node.classes, ma._attr(node, "role") or "", ma._attr(node, "aria-label") or ""]).lower()
    return bool(set(ma._words(names)) & _DOT_WORDS) or ma._attr(node, "role") == "tab"


def _pagination(attr: LayoutAttr, ctx: _Ctx) -> tuple[object, str]:
    ma, rail = ctx.ma, ctx.rail
    for parent in [ctx.owner, *ma._descendants(ctx.owner)]:
        if ctx.in_item(parent) or parent is rail:
            continue
        groups: dict = {}
        for kid in parent.elements:
            groups.setdefault(ma._signature(kid), []).append(kid)
        for run in groups.values():
            if len(run) >= 2 and not any(ctx.in_item(k) for k in run) and all(_is_dot(k, ctx) for k in run):
                value = _value_for(attr, "dots", _INDICATORS, ma)
                return value, f"{len(run)} small text-less sibling elements (dot indicators) in the block"
    if rail is None or rail is ctx.owner:
        return None, "the block has no rail separate from its root to read a scrollbar from"
    d = ctx.decls(rail)
    overflow = (d.get("overflow-x") or d.get("overflow", "")).strip().lower().split()
    if not overflow or overflow[0] not in ("auto", "scroll"):
        return _value_for(attr, "none", _INDICATORS, ma), "no dot indicators, and the rail does not scroll (no overflow auto/scroll)"
    hidden = _scrollbar_hidden(ctx, rail)
    if hidden:
        return _value_for(attr, "none", _INDICATORS, ma), f"no dot indicators, and {hidden}"
    return _value_for(attr, "scrollbar", _INDICATORS, ma), f"no dot indicators, and the rail scrolls (overflow {overflow[0]}) with its scrollbar shown"


# --------------------------------------------------------------------------------------------------------------------
# Deciding and writing
# --------------------------------------------------------------------------------------------------------------------

def _kebab_to_camel(name: str) -> str:
    """The converter's reverse of the carrier's name (``converter/db/db_lookup.py::_kebab_to_camel``)."""
    parts = name.split("-")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:] if p)


def _as_marker(value: object) -> str:
    return ("true" if value else "false") if isinstance(value, bool) else str(value)


def _modifier_carrier(attr: LayoutAttr, value: str, ctx: _Ctx) -> tuple[bool, str]:
    """Queue ``<element class>--<value>`` on every element carrying the attribute's element class; ``(written, note)``."""
    for cls in ctx.own_classes(attr):
        nodes = ctx.carriers(cls, items=True)
        if not nodes:
            continue
        want = f"{cls}--{value}"
        wanted = {i: classes for i, (_n, classes) in ctx.edits._wanted.items()}
        other = sorted({c for n in nodes for c in [*n.classes, *wanted.get(id(n), [])] if "--" in c and c != want})
        if other:
            return False, f"; '{other[0]}' already sits on the element, and the converter reads the first modifier, so it is not written"
        for n in nodes:
            ctx.edits.add_class(n, want)
        return True, f"; carried as the modifier class '{want}' on {len(nodes)} element(s)"
    return False, "; no element carries the attribute's class to hold the modifier, so it is not written"


def plan_layout_choices(ma, src: str, owner, members: list, rail, block_name: str, attrs: list[LayoutAttr], edits,
                        lookup) -> list[dict]:
    """Decide every layout attribute a rung applies to and queue its carrier on ``owner`` (one edit). Returns the report
    entries: ``{attribute, rung, value, written, evidence}`` (``value`` None when the draft does not decide it)."""
    ctx = _Ctx(ma, src, owner, members, rail, block_name, edits, lookup)
    decide = {"presence": _presence, "order": _order, "placement": _placement, "pagination": _pagination}
    entries: list[dict] = []
    markers: list[str] = []
    present = {k.lower(): v for k, v in owner.attrs}
    for attr in attrs:
        rung = _rung_of(attr, ma)
        if rung is None:
            continue
        value, evidence = decide[rung](attr, ctx)
        if rung in ("placement",) and isinstance(value, str) and value in _PLACEMENTS:
            picked = _value_for(attr, value, _PLACEMENTS, ma)
            if picked is None:
                evidence += f"; the attribute offers no value for '{value}'"
            value = picked
        entry = {"attribute": attr.name, "rung": rung, "value": value, "written": False, "evidence": evidence}
        entries.append(entry)
        if value is None:
            continue
        if value == attr.default:
            entry["evidence"] += "; equals the block's default, so nothing is written"
            continue
        if attr.role == _MODIFIER_ROLE and attr.kind == "string":
            entry["written"], note = _modifier_carrier(attr, str(value), ctx)
            entry["evidence"] += note
            continue
        marker = "data-sgs-" + ma._kebab(attr.name)
        if _kebab_to_camel(marker[len("data-sgs-"):]) != attr.name:
            entry["evidence"] += f"; the name does not survive the '{marker}' carrier, so it is not written"
            continue
        if marker in present:
            same = (present[marker] or "") == _as_marker(value)
            entry["written"] = same
            if not same:
                entry["evidence"] += f"; the draft already sets {marker}=\"{present[marker]}\", which is kept"
            continue
        markers.append(f' {marker}="{_as_marker(value)}"')
        entry["written"] = True
        entry["evidence"] += f"; carried as {marker} on the block root"
    if markers:
        raw = src[owner.start:owner.open_end]
        at = owner.open_end - (2 if raw.endswith("/>") else 1)
        edits.append((at, at, "".join(markers)))
    return entries
