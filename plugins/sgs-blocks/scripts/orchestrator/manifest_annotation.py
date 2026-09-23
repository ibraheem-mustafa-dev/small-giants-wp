"""manifest_annotation: turn a Claude Design draft's block proposals into SGS-BEM class names on the run copy.

A Claude Design draft (`.dc.html`) can carry ``<script type="application/json" data-sgs-manifest>`` with
``sectionBlocks`` (``{root class: {suggestedBlock, confidence, status}}``) and ``repeatedGroups`` (which
section repeats what, and how many). Nothing in the pipeline read it. This stage reads it and rewrites the RUN
COPY of the draft so the declared elements carry SGS-BEM class names; the UNCHANGED converter then recognises
them. It routes nothing itself (R-31-2: recognition stays BEM-only), never touches the converter, and the
annotation classes are inputs to the converter, not output (rule 1 / R-31-15: the converter already keeps
draft BEM element classes off emitted blocks).

What one declaration does
-------------------------
* The block must be a built block in the framework database (R-31-1: nothing here names a block).
* A block with ``blocks.tier = 'class-section'`` may claim a SECTION ROOT from a class, so the block's root
  class (``sgs-<block>``) is put FIRST in the section root's class list (``auto_detect_sections`` builds the
  boundary selector from the first class and the voter takes the first ``sgs-`` class); the draft's own class
  stays after it so the draft CSS still matches.
* Any other block cannot claim a section root (the converter's R1 gate demotes it to ``sgs/container``), so the
  block's root class goes on an element INSIDE the section: the BOX OWNER. From the parent of the repeated items
  (the "rail") the annotator climbs, strictly inside the section root, to the first element that itself paints a
  property the block also declares as part of its box (border, radius, shadow, background; ``_choose_owner``), so a
  header drawn inside the same bordered card belongs to the block. Nothing qualifies: the rail stays the block
  (``climbed: 0``, ``target: "inner"``).
* Header: every text unit and media element inside the block root that is not an item is mapped to one of the block's
  scalar attributes by role and value shape (``_plan_header``: a rating beside a star bar, a count, one shared link
  address) or reported in ``skipped_fields`` with its reason; text with no field and no verdict withholds the section.
* Header links: a block with several link attributes (a "See all" and a "Write a review" pill) has each header anchor decided
  by a ladder that reports the rung it used (``header_link_rungs``): the anchor's wording against each attribute's vocabulary,
  then what the draft calls the anchor (aria-label, data-*, id, class), and only last its position (the order the block
  declares its attributes). An anchor no rung decides is reported in ``skipped_fields``, never guessed.
* Header caption, footnote, structure: a caption made of the block's own name words is the review SOURCE label (an attribute
  the slot vocabulary calls a label), any other caption a business name; the one text after the items that shares a row with
  the draft's own controls is the footnote when the block has exactly one text attribute left; and the structure the block's
  attributes list a class for (``header`` row, ``rail``, ``arrow``, ``google-logo``) is classed from the draft's own structure
  (``header_structure``: the class and the signal, or why not). Every class is one the block's ``derived_selector`` lists.
* Items also carry a per-card rating (a row of star glyphs, when the schema has a ``rating`` field) and a colour
  bound in a style declaration (``data-src-field-style``, when the schema has a ``colour-background`` field).
* Items: the repeated-group row for the section says how many; the items are the run of sibling elements of
  identical shape inside the section (the run copy already has its loops expanded). Each gets the block's item
  class (``sgs-<block>__<array attr, singular>``), which is all the converter's array resolver needs to find them.
* Fields: a loose text node beside an icon is wrapped in a ``<span>`` carrying the field class
  (``sgs-<block>__<field key, kebab>``) ONLY when the mapping is certain: exactly one text element or text
  node per item and exactly one text field in the block's item schema. Anything more ambiguous is reported as
  ``partial`` with the reason; the item classes are still applied and the converter's own matching tiers do what
  they can. Never a silent guess.
* Fields by NAME (FR-31-31 rule 6): when the JS content resolver left ``data-src-field`` markers on the run copy,
  each marked draft field is mapped by a fixed ladder (manifest ``repeatedGroups[].fieldMap``, the block's own
  field key, a DB synonym through a NARROW ``slots`` row; a catch-all slot is no evidence) instead of by
  counting text. Text with no field is reported
  in the row's ``skipped_fields``; it withholds the section only when a free block text field could still be its
  home. Every marker is stripped from the returned HTML (``strip_field_markers``, which the orchestrator also runs
  on the run copy on every path): none reaches the converter.

Every declaration yields exactly one report row (rule 4). ``rejected`` and ``queued`` rows never change the HTML.
A draft with no manifest, or one that does not parse, comes back byte-identical with no rows. The edits are
string-level (source offsets from a span-recording parse), so nothing else in the draft is re-serialised.
Running it twice gives the same HTML.
"""
from __future__ import annotations

import fnmatch
import html as _html
import importlib.util
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Protocol

CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


def _sibling(stem: str):
    """A sibling module of this file, loaded by PATH (this module is itself loaded by path under another name by the
    orchestrator, so a plain ``import`` of a sibling is not guaranteed to resolve). Registered before execution so its
    dataclasses can find their module."""
    name = f"sgs_{stem}"
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(f"{stem}.py"))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_layout = _sibling("manifest_layout_choices")      # the layout-choice rungs (presence, order, placement, pagination)

_MANIFEST_RE = re.compile(
    r"<script\b[^>]*\bdata-sgs-manifest\b[^>]*>(.*?)</script\s*>", re.IGNORECASE | re.DOTALL
)
_VOID = frozenset("area base br col embed hr img input link meta param source track wbr".split())
_OPAQUE = frozenset({"svg", "script", "style", "template"})  # never searched for items or text
_BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__[a-z0-9-]+")
_BLOCK_ROOT_RE = re.compile(r"^sgs-([a-z0-9]+(?:-[a-z0-9]+)*)$")
_ATTR_RE = re.compile(
    r"""\s*([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?"""
)


# ---------------------------------------------------------------------------------------------------------------
# Block facts (injectable)
# ---------------------------------------------------------------------------------------------------------------

@dataclass(frozen=True)
class ItemField:
    key: str
    role: str | None
    text_like: bool


@dataclass(frozen=True)
class ArraySchema:
    attr: str
    fields: tuple[ItemField, ...]


@dataclass(frozen=True)
class ScalarAttr:
    """One of the block's own scalar content attributes (``averageRating``, ``reviewRequestUrl``): its DB role, its
    value kind (``number`` | ``string`` | ``boolean``) and whether its name says it holds a link."""
    name: str
    role: str | None
    kind: str
    link_like: bool = False
    selector: str | None = None      # ``block_attributes.derived_selector``: the element class the converter lifts the value from


# WHY THIS IS A CONSTANT AND NOT A DATABASE READ (the one exception in this module to R-31-1, and the only one).
# ``property_suffixes.role`` says a property PAINTS (``visual`` / ``color`` / ``colour-gradient``); it does not say
# the property gives an element a BOX. The same ``visual`` role holds ``border-radius`` and ``box-shadow`` beside
# ``object-fit``, ``object-position``, ``background-position|size|repeat|attachment``, ``opacity`` and ``overflow``,
# and ``color`` holds ``background-color`` and ``border-color`` beside text ``color`` / ``stroke``. No other column
# separates them either: ``block_attributes.css_layer`` is OUTER for ``background-attachment`` too, and ``box_family``
# only groups inspector controls (margin / padding / border radius / border width). So the box-painting families are
# named once, here, as an INCLUSION list: a property the list does not name (a future ``mask``, ``clip-path``) is not a
# box until someone decides it is, which fails safe. The seed change that removes this constant is a boolean column
# ``makes_box`` on ``property_suffixes`` (``scripts/data/property-suffixes.json``, reseeded by
# ``converter/db/db_lookup.py::_migrate_property_suffixes``), true for the border-*, ``box-shadow``, ``background-color``
# and ``background-image`` rows; ``DbBlockLookup.identity_properties`` would then select on it. That is a shared-database
# schema change and is not made here.
_BOX_PAINT_PROPERTIES = frozenset({"background-color", "background-image", "box-shadow"})
_BORDER_PAINT_LAST_WORDS = frozenset({"width", "style", "color", "radius"})   # border-width, border-top-color, border-top-left-radius...


def _is_box_paint(prop: str) -> bool:
    """``prop`` (a ``block_attributes.css_property``, any ``-gradient`` / ``:tier`` suffix already folded away) is one of
    the properties that paint a container's own box: the border family, ``box-shadow``, ``background-color`` and
    ``background-image``. ``outline``, ``object-*``, ``background-position|size|repeat|attachment``, text ``color``,
    ``fill``, ``stroke``, ``opacity`` and ``overflow`` never are."""
    words = prop.split("-")
    return prop in _BOX_PAINT_PROPERTIES or (words[0] == "border" and len(words) > 1 and words[-1] in _BORDER_PAINT_LAST_WORDS)


_PAINT_ROLES = ("visual", "color", "colour-gradient")


class BlockLookup(Protocol):
    """What the annotator needs to know about blocks. Tests inject a fake; ``DbBlockLookup`` is the real one."""

    def canonical_slug(self, name: str) -> str | None:
        """``'trust-bar'`` or ``'sgs/trust-bar'`` -> ``'sgs/trust-bar'`` when it is a built block, else None."""

    def is_class_section(self, slug: str) -> bool:
        """True when the block may claim a section root from a class (``blocks.tier = 'class-section'``)."""

    def array_schemas(self, slug: str) -> list[ArraySchema] | None:
        """None when the block has no ``arrayContentLift``; else its item schemas (usually exactly one)."""

    # Optional (the annotator asks with ``getattr``, so a lookup without one simply lacks that rung):
    #   def slots_of(self, term: str) -> frozenset[str]:
    #       """Every element slot that has ``term`` as its name or one of its aliases (empty when none)."""
    #   def identity_properties(self, slug: str) -> frozenset[str]:
    #       """The CSS properties that make an element the block's BOX (border, radius, shadow, background) among the
    #       ones the block itself declares. Without it a non-section block's root stays on the repeating parent."""
    #   def scalar_attrs(self, slug: str) -> list[ScalarAttr]:
    #       """The block's own content-bearing scalar attributes (the header field ladder maps onto these)."""
    #   def element_names(self, slug: str) -> frozenset[str]:
    #       """The element slots the block's attributes style (``star``, ``arrow``, ``write-review``...)."""
    #   def derived_classes(self, slug: str) -> frozenset[str]:
    #       """Every element class the block's attributes list in ``derived_selector`` (``sgs-google-reviews__header``): the
    #       classes a draft element may carry for the converter to route an attribute to it. Without it no structure is classed."""
    #   def layout_attrs(self, slug: str) -> list[manifest_layout_choices.LayoutAttr]:
    #       """The block's enum strings and presence booleans with their role, element class, values and default: what the
    #       layout rungs (``manifest_layout_choices``) decide from the draft's structure. Without it no layout choice is read."""


def _norm(token: str) -> str:
    return re.sub(r"[-_\s]", "", token).lower()


class DbBlockLookup:
    """The real lookup: the framework DB (opened read-only) plus each block's ``block.json`` for field types.

    Never imports ``converter/db/db_lookup.py`` (it runs schema migrations as an import side effect).
    """

    DEFAULT_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
    DEFAULT_BLOCKS_DIR = Path(__file__).resolve().parents[2] / "src" / "blocks"

    def __init__(self, db_path: Path | None = None, blocks_dir: Path | None = None) -> None:
        self._db = Path(db_path or self.DEFAULT_DB)
        self._blocks_dir = Path(blocks_dir or self.DEFAULT_BLOCKS_DIR)
        if not self._db.is_file():
            raise FileNotFoundError(f"framework database not found: {self._db}")
        self._conn = sqlite3.connect(f"file:{self._db.as_posix()}?mode=ro", uri=True)
        self._slot_of: dict[str, str] | None = None
        self._slot_sets: dict[str, frozenset[str]] | None = None
        self._slot_terms: dict[str, int] | None = None

    def close(self) -> None:
        self._conn.close()

    def slots_of(self, term: str) -> frozenset[str]:
        """Every ``element`` slot that has ``term`` as its name or one of its aliases (name-normalised).

        The DB-first synonym source (R-31-1): two field names are synonyms when they share a slot. Unlike
        ``_slot_map`` (one slot per term, first row wins) this keeps EVERY slot, so a term listed under two slots
        (``author`` is an alias of both ``attribution`` and ``text``) is not silently pinned to one of them."""
        self._load_slot_sets()
        return self._slot_sets.get(_norm(term), frozenset())

    def _load_slot_sets(self) -> None:
        if self._slot_sets is not None:
            return
        sets: dict[str, set[str]] = {}
        terms: dict[str, set[str]] = {}
        for name, aliases in self._conn.execute("SELECT slot_name, aliases FROM slots WHERE scope = 'element'"):
            sets.setdefault(_norm(name), set()).add(name)
            terms[name] = {_norm(name)}
            try:
                for alias in json.loads(aliases or "[]"):
                    sets.setdefault(_norm(alias), set()).add(name)
                    terms[name].add(_norm(alias))
            except ValueError:
                pass
        self._slot_sets = {k: frozenset(v) for k, v in sets.items()}
        self._slot_terms = {name: len(names) for name, names in terms.items()}

    def is_broad_slot(self, slot: str) -> bool:
        """True when ``slot`` is a catch-all: it lists more than twice the average number of names (its own name plus
        aliases) of an ``element`` slot. Two names that share ONLY such a slot are not shown to mean the same thing
        (on the live database ``verified``, ``bio``, ``excerpt`` and ``message`` all sit in ``text``), whereas two
        that share a narrow slot are (``who`` and ``author`` in ``attribution``). Measured from the table itself, so
        it moves with the data and names no slot (R-31-1)."""
        self._load_slot_sets()
        counts = self._slot_terms or {}
        return bool(counts) and counts.get(slot, 0) > 2 * (sum(counts.values()) / len(counts))

    def canonical_slug(self, name: str) -> str | None:
        slug = name if "/" in name else f"sgs/{name}"
        row = self._conn.execute(
            "SELECT slug FROM blocks WHERE slug = ? AND status = 'built' AND COALESCE(is_stale, 0) = 0", (slug,)
        ).fetchone()
        return row[0] if row else None

    def is_class_section(self, slug: str) -> bool:
        row = self._conn.execute("SELECT tier FROM blocks WHERE slug = ?", (slug,)).fetchone()
        return bool(row and row[0] == "class-section")

    def array_schemas(self, slug: str) -> list[ArraySchema] | None:
        lifts = self._conn.execute(
            "SELECT 1 FROM block_capabilities WHERE block_slug = ? AND capability = 'array-content-lift' "
            "AND kind = 'functional'", (slug,)
        ).fetchone()
        if not lifts:
            return None
        rows = self._conn.execute(
            "SELECT array_attr, field_key, role FROM array_item_schema WHERE block_slug = ? "
            "ORDER BY array_attr, field_order", (slug,)
        ).fetchall()
        types = self._json_types(slug)
        by_attr: dict[str, list[ItemField]] = {}
        for attr, key, role in rows:
            by_attr.setdefault(attr, []).append(
                ItemField(key, role, self._is_text_like(key, role, types.get((attr, key))))
            )
        return [ArraySchema(attr, tuple(fields)) for attr, fields in by_attr.items()]

    def identity_properties(self, slug: str) -> frozenset[str]:
        """The CSS properties that make an element the block's BOX: what the block itself declares in
        ``block_attributes.css_property`` (a ``-gradient`` or ``:tier`` suffix folded away) whose
        ``property_suffixes`` role is a paint role AND that ``_is_box_paint`` names. Pure layout properties (padding,
        margin, gap, width, position, display) have layout roles and never appear; ``object-fit`` and
        ``background-position`` paint (visual role) without making a box and are excluded by ``_is_box_paint``."""
        paints = {r[0] for r in self._conn.execute(
            "SELECT DISTINCT css_property FROM property_suffixes WHERE css_property IS NOT NULL AND role IN (?, ?, ?)",
            _PAINT_ROLES)}
        declared = {re.sub(r"-gradient$", "", prop.split(":", 1)[0]) for (prop,) in self._conn.execute(
            "SELECT DISTINCT css_property FROM block_attributes WHERE block_slug = ? AND css_property IS NOT NULL", (slug,))}
        return frozenset(p for p in declared if p in paints and _is_box_paint(p))

    def element_names(self, slug: str) -> frozenset[str]:
        return frozenset(r[0] for r in self._conn.execute(
            "SELECT DISTINCT css_element FROM block_attributes WHERE block_slug = ? AND css_element IS NOT NULL", (slug,)))

    def derived_classes(self, slug: str) -> frozenset[str]:
        classes: set[str] = set()
        for (selector,) in self._conn.execute(
                "SELECT DISTINCT derived_selector FROM block_attributes WHERE block_slug = ? AND derived_selector IS NOT NULL", (slug,)):
            classes |= {c[1:] for c in _selector_classes(selector) if c.startswith(".")}
        return frozenset(classes)

    def layout_attrs(self, slug: str) -> list:
        """The block's string attributes with ``enum_values`` and its ``presence-boolean`` attributes, as
        ``manifest_layout_choices.LayoutAttr`` (name, type, role, derived_selector, enum values, JSON default)."""
        out = []
        for name, kind, role, selector, enum, default in self._conn.execute(
                "SELECT attr_name, attr_type, role, derived_selector, enum_values, default_value FROM block_attributes "
                "WHERE block_slug = ? AND ((attr_type = 'string' AND enum_values IS NOT NULL) OR "
                "(attr_type = 'boolean' AND role = 'presence-boolean')) ORDER BY id", (slug,)):
            try:
                values = tuple(v for v in json.loads(enum) if isinstance(v, str)) if enum else ()
            except ValueError:
                values = ()
            try:
                parsed = json.loads(default) if default is not None else None
            except ValueError:
                parsed = None
            out.append(_layout.LayoutAttr(name, kind, role, selector, values, parsed))
        return out

    def scalar_attrs(self, slug: str) -> list[ScalarAttr]:
        """The block's scalar attributes whose role is content-bearing (``roles.classification``). A link attribute
        is one whose last name word is a ``property_suffixes`` content suffix with no CSS property (``Url``, ``Href``,
        ``Link``) and whose role is a content role."""
        link_words = {r[0].lower() for r in self._conn.execute(
            "SELECT suffix FROM property_suffixes WHERE role = 'content' AND css_property IS NULL")}
        out: list[ScalarAttr] = []
        for name, role, kind, selector in self._conn.execute(
            "SELECT ba.attr_name, ba.role, ba.attr_type, ba.derived_selector FROM block_attributes ba "
            "JOIN roles r ON r.role_name = ba.role WHERE ba.block_slug = ? AND r.classification = 'content-bearing' "
            "AND ba.attr_type IN ('string', 'number', 'integer', 'boolean') ORDER BY ba.id", (slug,)):
            link = kind == "string" and role in ("content", "link-href", "url-href") and _kebab(name).split("-")[-1] in link_words
            out.append(ScalarAttr(name, role, "number" if kind in ("number", "integer") else kind, link, selector))
        return out

    def _json_types(self, slug: str) -> dict[tuple[str, str], str | None]:
        path = self._blocks_dir / slug.split("/", 1)[1] / "block.json"
        try:
            attrs = json.loads(path.read_text(encoding="utf-8")).get("attributes", {})
        except (OSError, ValueError):
            return {}
        out: dict[tuple[str, str], str | None] = {}
        for attr, spec in attrs.items():
            items = spec.get("items") if isinstance(spec, dict) else None
            props = items.get("properties") if isinstance(items, dict) else None
            for key, prop in (props if isinstance(props, dict) else {}).items():
                out[(attr, key)] = prop.get("type") if isinstance(prop, dict) else None
        return out

    def _slot_map(self) -> dict[str, str]:
        if self._slot_of is None:
            out: dict[str, str] = {}
            for name, aliases in self._conn.execute("SELECT slot_name, aliases FROM slots WHERE scope = 'element'"):
                out[_norm(name)] = name
                try:
                    for alias in json.loads(aliases or "[]"):
                        out.setdefault(_norm(alias), name)
                except ValueError:
                    pass
            self._slot_of = out
        return self._slot_of

    def _is_text_like(self, key: str, declared_role: str | None, json_type: str | None) -> bool:
        """A field whose value is text. Declared ``text-content`` is text. An undeclared role is text when the
        field name resolves to a slot whose standalone block has exactly one ``text-content`` attribute (the same
        derivation the converter's array resolver uses). Getting this wrong can only under-map, never mis-map:
        an extra "text" field makes the mapping ambiguous, which is reported as ``partial``."""
        if declared_role is not None:
            return declared_role == "text-content"
        if json_type not in (None, "string"):
            return False
        slot = self._slot_map().get(_norm(key))
        if not slot:
            return False
        block = self._conn.execute(
            "SELECT standalone_block FROM slots WHERE slot_name = ? AND scope = 'element'", (slot,)
        ).fetchone()
        if not block or not block[0]:
            return False
        count = self._conn.execute(
            "SELECT COUNT(*) FROM block_attributes WHERE block_slug = ? AND role = 'text-content'", (block[0],)
        ).fetchone()[0]
        return count == 1


# ---------------------------------------------------------------------------------------------------------------
# A span-recording parse: exact source offsets for every tag and text run, so edits are string-level
# ---------------------------------------------------------------------------------------------------------------

class _ParseMismatch(Exception):
    """The parser's reported offsets did not land on the tag they claim to (an offset would corrupt the draft)."""


@dataclass(eq=False)
class _Node:
    kind: str                       # 'tag' | 'text' | 'comment'
    name: str = ""
    attrs: list[tuple[str, str | None]] = field(default_factory=list)
    start: int = 0
    open_end: int = 0               # end of the start tag (tags only)
    inner_end: int = 0              # where the content ends (the close tag's start, or the end when implied)
    end: int = 0
    closed: bool = False
    children: list["_Node"] = field(default_factory=list)
    parent: "_Node | None" = None

    @property
    def classes(self) -> list[str]:
        for name, value in self.attrs:
            if name == "class" and value is not None:
                return _html.unescape(value).split()
        return []

    @property
    def elements(self) -> list["_Node"]:
        return [c for c in self.children if c.kind == "tag"]


class _SpanParser(HTMLParser):
    def __init__(self, source: str) -> None:
        super().__init__(convert_charrefs=False)
        self.src = source
        self._line_starts = [0] + [i + 1 for i, ch in enumerate(source) if ch == "\n"]
        self.root = _Node(kind="tag", name="#root", start=0, open_end=0, inner_end=len(source), end=len(source))
        self._stack: list[_Node] = [self.root]

    def _abs(self) -> int:
        line, col = self.getpos()
        return self._line_starts[line - 1] + col

    def _open(self, tag: str, attrs: list[tuple[str, str | None]], self_closing: bool) -> None:
        start = self._abs()
        raw = self.get_starttag_text() or ""
        if self.src[start:start + len(raw)] != raw or not raw.startswith("<"):
            raise _ParseMismatch(f"start tag {tag!r} not at reported offset {start}")
        node = _Node(kind="tag", name=tag, attrs=attrs, start=start, open_end=start + len(raw), parent=self._stack[-1])
        self._stack[-1].children.append(node)
        if self_closing or tag in _VOID:
            node.inner_end = node.end = node.open_end
            node.closed = True
        else:
            self._stack.append(node)

    def handle_starttag(self, tag, attrs):  # noqa: D401 - HTMLParser hook
        self._open(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._open(tag, attrs, True)

    def handle_endtag(self, tag):
        pos = self._abs()
        for depth in range(len(self._stack) - 1, 0, -1):
            if self._stack[depth].name == tag:
                gt = self.src.find(">", pos)
                end = len(self.src) if gt < 0 else gt + 1
                for implied in self._stack[depth + 1:]:
                    implied.inner_end = implied.end = pos
                target = self._stack[depth]
                target.inner_end, target.end, target.closed = pos, end, True
                del self._stack[depth:]
                return

    def _leaf_span(self, closer: str) -> None:
        start = self._abs()
        stop = self.src.find(closer, start + 1)
        end = len(self.src) if stop < 0 else stop + len(closer)
        self._stack[-1].children.append(
            _Node(kind="comment", start=start, end=end, parent=self._stack[-1])
        )

    def handle_comment(self, data):
        self._leaf_span("-->")

    def handle_decl(self, decl):
        self._leaf_span(">")

    def handle_pi(self, data):
        self._leaf_span(">")

    def finish(self) -> _Node:
        for node in self._stack[1:]:
            node.inner_end = node.end = len(self.src)
        _fill_text(self.root, self.src)
        return self.root


def _fill_text(node: _Node, src: str) -> None:
    """Insert a text node for every gap between an element's tags and comments."""
    kids = [c for c in node.children if c.kind != "text"]
    merged: list[_Node] = []
    cursor = node.open_end if node.name != "#root" else 0
    for kid in kids:
        if kid.start > cursor:
            merged.append(_Node(kind="text", start=cursor, end=kid.start, parent=node))
        merged.append(kid)
        cursor = max(cursor, kid.end)
    if node.inner_end > cursor and not (node.kind == "tag" and node.name in _VOID):
        merged.append(_Node(kind="text", start=cursor, end=node.inner_end, parent=node))
    node.children = merged
    for kid in kids:
        if kid.kind == "tag":
            _fill_text(kid, src)


def _parse(source: str) -> _Node:
    parser = _SpanParser(source)
    parser.feed(source)
    parser.close()
    return parser.finish()


def _walk(node: _Node):
    yield node
    for child in node.children:
        if child.kind == "tag":
            yield from _walk(child)


def _descendants(node: _Node):
    for child in node.elements:
        yield child
        if child.name not in _OPAQUE:
            yield from _descendants(child)


def _ancestors(node: _Node):
    cur = node.parent
    while cur is not None:
        yield cur
        cur = cur.parent


def _is_inside(node: _Node, ancestor: _Node) -> bool:
    return any(a is ancestor for a in _ancestors(node))


# ---------------------------------------------------------------------------------------------------------------
# Edits
# ---------------------------------------------------------------------------------------------------------------

Edit = tuple[int, int, str]


def _class_edit(src: str, node: _Node, classes: list[str]) -> Edit | None:
    """Put ``classes`` FIRST in ``node``'s class list (existing classes stay after them). None when all are present."""
    present = node.classes
    missing = [c for c in classes if c not in present]
    if not missing:
        return None
    lead = " ".join(missing)
    raw = src[node.start:node.open_end]
    pos = 1 + len(node.name)
    while pos < len(raw):
        m = _ATTR_RE.match(raw, pos)
        if not m or m.end() == pos:
            break
        if m.group(1).lower() == "class":
            for grp in (2, 3):
                if m.group(grp) is not None:
                    at = node.start + m.start(grp)
                    old = m.group(grp)
                    return (at, at + len(old), lead if not old.strip() else f"{lead} {old}")
            if m.group(4) is not None:
                return (node.start + m.start(4), node.start + m.end(4), f'"{lead} {m.group(4)}"')
            return (node.start + m.end(), node.start + m.end(), f'="{lead}"')
        pos = m.end()
    at = node.start + 1 + len(node.name)
    return (at, at, f' class="{lead}"')


def _apply(src: str, edits: list[Edit]) -> str:
    out = src
    last_start = len(src) + 1
    for start, end, repl in sorted(edits, key=lambda e: (e[0], e[1]), reverse=True):
        if end > last_start:
            raise _ParseMismatch("overlapping edits")
        out = out[:start] + repl + out[end:]
        last_start = start
    return out


class _Edits(list):
    """The string edits of one declaration. Class requests are collected per element and become ONE edit each, so two
    reasons to class the same element (an item text field and a colour, a header field and the block root) never
    produce two overlapping edits of one ``class`` attribute."""

    def __init__(self, src: str) -> None:
        super().__init__()
        self.src = src
        self._wanted: dict[int, tuple[_Node, list[str]]] = {}

    def add_class(self, node: _Node, cls: str) -> None:
        classes = self._wanted.setdefault(id(node), (node, []))[1]
        if cls not in classes:
            classes.append(cls)

    def resolved(self) -> list[Edit]:
        merged = [e for node, classes in self._wanted.values() if (e := _class_edit(self.src, node, classes))]
        return [*self, *merged]


# ---------------------------------------------------------------------------------------------------------------
# Structure: runs of identical siblings, text units
# ---------------------------------------------------------------------------------------------------------------

def _signature(node: _Node) -> tuple:
    return (node.name, tuple(_signature(c) for c in node.elements if c.name not in _OPAQUE or c.name == "svg"))


@dataclass
class _Run:
    parent: _Node
    members: list[_Node]


def _is_directive(node: _Node) -> bool:
    return node.name.startswith(("sc-", "dc-"))


def _runs(root: _Node, loose: bool) -> list[_Run]:
    """Runs of two or more sibling elements: identical in shape (``loose=False``) or merely the same tag.

    A directive element (``<sc-if>``, ``<sc-for>``) is never a parent of real items, and nothing inside an
    unexpanded ``<sc-for>`` is a real item (it is a template that renders zero to many rows).
    """
    out: list[_Run] = []
    for parent in [root, *_descendants(root)]:
        if _is_directive(parent) or any(a.name == "sc-for" for a in _ancestors(parent) if a is not root and _is_inside(a, root)):
            continue
        groups: dict[object, list[_Node]] = {}
        for kid in parent.elements:
            if kid.name in _OPAQUE or _is_directive(kid):
                continue
            groups.setdefault(kid.name if loose else _signature(kid), []).append(kid)
        out.extend(_Run(parent, members) for members in groups.values() if len(members) >= 2)
    return out


@dataclass(frozen=True)
class _Unit:
    holder: _Node                   # the element that holds the text
    text_node: _Node | None         # a loose text node to wrap; None when the holder itself is the text element


def _units(item: _Node, src: str, skip: tuple[_Node, ...] = ()) -> list[_Unit]:
    """The text an item shows: a text-only element is one unit, a loose text node beside other elements is one.
    Elements in ``skip`` (and everything inside them) are not entered."""
    out: list[_Unit] = []

    def visit(el: _Node) -> None:
        has_elements = any(c.name not in _OPAQUE or c.name == "svg" for c in el.elements)
        for child in el.children:
            if child.kind == "text" and src[child.start:child.end].strip():
                if has_elements:
                    out.append(_Unit(el, child))
                elif not any(u.holder is el for u in out):
                    out.append(_Unit(el, None))
            elif child.kind == "tag" and child.name not in _OPAQUE and not any(child is x for x in skip):
                visit(child)

    visit(item)
    return out


def _kebab(key: str) -> str:
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "-", key).replace("_", "-").lower()


def _singular(attr: str) -> str:
    kebab = _kebab(attr)
    if kebab.endswith("ies"):
        return kebab[:-3] + "y"
    if kebab.endswith("s") and not kebab.endswith("ss"):
        return kebab[:-1]
    return kebab + "-item"


# ---------------------------------------------------------------------------------------------------------------
# Declarations
# ---------------------------------------------------------------------------------------------------------------

def _row(root_class: str, block, confidence, status: str, reason: str, target: str | None,
         items: int = 0, fields: list[str] | None = None) -> dict:
    return {"root_class": root_class, "block": block, "confidence": confidence, "status": status,
            "reason": reason, "target": target, "items": items, "fields": list(fields or [])}


def _field_map(raw) -> dict[str, str | None]:
    """The optional ``repeatedGroups[].fieldMap``: ``{draft field name: block field key, or null for "not lifted"}``.
    Anything that is not that shape is ignored (a bad map must not break a declaration that does not need it)."""
    if not isinstance(raw, dict):
        return {}
    return {k: v for k, v in raw.items() if isinstance(k, str) and (v is None or isinstance(v, str))}


def _read_manifest(source: str) -> dict | None:
    match = _MANIFEST_RE.search(source)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def _group_rows(groups, root_class: str) -> list[dict]:
    """The ``repeatedGroups`` rows for a section: ``sgs-x``, ``sgs-x (grid)``, or a comma list / glob such as
    ``sgs-bag-drawer, sgs-checkout-*``."""
    out: list[dict] = []
    for row in groups if isinstance(groups, list) else []:
        section = row.get("section") if isinstance(row, dict) else None
        if not isinstance(section, str):
            continue
        for part in section.split(","):
            name = re.sub(r"\s*\(.*\)\s*$", "", part.strip())
            if name and fnmatch.fnmatchcase(root_class, name):
                out.append(row)
                break
    return out


def _bem_conflict(node: _Node, own_class: str, lookup: BlockLookup) -> str | None:
    """A different built block's root class already on the element (the draft already names another block)."""
    for cls in node.classes:
        m = _BLOCK_ROOT_RE.match(cls)
        if m and cls != own_class and lookup.canonical_slug(m.group(1)):
            return cls
    return None


def _choose_run(root: _Node, hint: int | None) -> tuple[_Run | None, str | None]:
    """The run that holds the declared items: ``(run, note)`` with a note when it is not a clean match, or
    ``(None, why not)``. The count in ``repeatedGroups`` picks the run; the largest run is the fallback."""
    strict = _runs(root, False)
    have_hint = isinstance(hint, int) and hint >= 2
    if have_hint:
        for pool in (strict, _runs(root, True)):
            exact = [r for r in pool if len(r.members) == hint]
            if len(exact) == 1:
                return exact[0], None
            if len(exact) > 1:
                return None, (f"{len(exact)} different runs have the declared {hint} items, so the items "
                              "cannot be told apart")
    if not strict:
        loops = sum(1 for n in _descendants(root) if n.name == "sc-for")
        if loops:
            return None, (f"the section still holds {loops} unexpanded <sc-for> loop(s), so its items are not "
                          "concrete elements the converter can see")
        return None, "no run of two or more identical sibling elements was found inside the section"
    top = max(len(r.members) for r in strict)
    biggest = [r for r in strict if len(r.members) == top]
    if len(biggest) > 1:
        return None, (f"{len(biggest)} different runs tie for the most repeated siblings ({top}), so the items "
                      "cannot be told apart")
    run = biggest[0]
    if have_hint:
        return run, f"the manifest declares {hint} items but the largest run of identical siblings has {top}"
    same_tag = sum(1 for k in run.parent.elements if k.name == run.members[0].name)
    if same_tag > top:
        return run, (f"{same_tag} siblings share the tag but only {top} share the same shape; only those "
                     f"{top} were treated as items")
    return run, None


_NON_TEXT_NOTE = "the block's non-text fields (icons, images, links) are left to the converter's own matching"

# The field markers the JS content resolver leaves on run-copy elements (js_content_resolver.TEXT_MARKER and
# ATTR_MARKER_PREFIX). The annotator reads the text marker, then strips every marker from what it returns.
_TEXT_MARKER = "data-src-field"

# What `strip_field_markers` looks at, in one left-to-right pass so that each region is claimed by exactly one
# alternative: a comment and a raw-text element (`<script>`, `<style>`, `<textarea>`; their content is data or text,
# never markup) are matched and handed back untouched; a start tag is matched with quote-aware attributes and only
# THAT is edited. Text nodes and `<pre>` text are never in a start tag, so they cannot be reached.
_STRIP_SCAN_RE = re.compile(
    r"""(?P<skip><!--.*?-->|<(?P<raw>script|style|textarea)\b(?:[^<>"']|"[^"]*"|'[^']*')*>.*?</(?P=raw)\s*>)"""
    r"""|(?P<tag><(?P<name>[a-zA-Z][\w:-]*)(?P<attrs>(?:[^<>"']|"[^"]*"|'[^']*')*)>)""",
    re.IGNORECASE | re.DOTALL,
)
_MARKER_ATTR_RE = re.compile(
    r"""\s+data-src-field(?:-[a-z0-9-]+)?(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>=`]+))?(?=[\s/>]|$)""",
    re.IGNORECASE,
)


def strip_field_markers(html: str) -> str:
    """``html`` without the resolver's field markers (``data-src-field`` and ``data-src-field-<attr>``).

    The one strip used by the annotator (every return) and by the orchestrator (any run copy that still carries
    markers after Stage -1.44, whatever happened there). Only real attributes of real start tags are removed:
    the same words in a text node, a ``<pre>`` sample, a ``<script>``, a ``<style>``, a ``<textarea>`` or a
    comment are content and stay. Anything else in the document is returned byte for byte."""
    if _TEXT_MARKER not in html.lower():
        return html

    def _sub(match: re.Match) -> str:
        if match.group("skip") is not None:
            return match.group(0)
        attrs = _MARKER_ATTR_RE.sub("", match.group("attrs"))
        if attrs == match.group("attrs"):
            return match.group(0)
        return "<" + match.group("name") + attrs + ">"

    return _STRIP_SCAN_RE.sub(_sub, html)


def _squash(text: str) -> str:
    return " ".join(_html.unescape(text).split())


@dataclass(frozen=True)
class _ItemText:
    """One piece of text an item shows, with what the draft says about it."""
    unit: _Unit
    field: str | None               # the draft field name from the marker; None for unmarked text
    text: str
    conditional: bool               # sits inside a retained <sc-if>: it is there for some cards only


def _marker_of(unit: _Unit) -> str | None:
    if unit.text_node is not None:
        return None                 # a loose text node beside other elements is never a whole-content field
    for name, value in unit.holder.attrs:
        if name == _TEXT_MARKER and value:
            return value
    return None


def _item_texts(member: _Node, src: str) -> list[_ItemText]:
    out: list[_ItemText] = []
    for unit in _units(member, src):
        node = unit.text_node
        raw = src[node.start:node.end] if node is not None else src[unit.holder.open_end:unit.holder.inner_end]
        chain, cur = [], unit.holder
        while cur is not None and cur is not member:
            chain.append(cur)
            cur = cur.parent
        out.append(_ItemText(unit, _marker_of(unit), _squash(raw), any(n.name == "sc-if" for n in chain)))
    return out


def _resolve_field(name: str, text_keys: list[str], lookup, field_map: dict) -> tuple[str | None, str]:
    """The mapping ladder for ONE draft field: ``(block key or None, how / why not)``.

    1. The manifest's ``fieldMap`` (an explicit author decision; ``null`` means "deliberately not lifted").
    2. The name is the block's own field key.
    3. DB-first synonym: the name and exactly one of the block's text keys share a NARROW ``slots`` row (name or
       alias). A catch-all slot (``lookup.is_broad_slot``) is no evidence: many unrelated names live in it, so a
       field that shares only that is left unmapped, and the section is withheld while a text key is still free.
    Anything else stays unmapped; a guess is never made."""
    if name in field_map:
        target = field_map[name]
        if target is None:
            return None, "the manifest's fieldMap marks it as not lifted"
        if target in text_keys:
            return target, "the manifest's fieldMap"
        return None, f"the manifest's fieldMap sends it to '{target}', which is not a text field of the block"
    same = [k for k in text_keys if _norm(k) == _norm(name)]
    if same:
        return same[0], "the same name"
    slots_of = getattr(lookup, "slots_of", None)
    if slots_of is None:
        return None, "no block field has that name and no synonym source is available"
    is_broad = getattr(lookup, "is_broad_slot", lambda _slot: False)
    mine = slots_of(name)
    shared = {k: mine & slots_of(k) for k in text_keys}
    found = [k for k, slots in shared.items() if any(not is_broad(s) for s in slots)]
    if len(found) == 1:
        return found[0], "a synonym in the framework database"
    if len(found) > 1:
        return None, f"it is a synonym of more than one block field ({', '.join(found)}), so it cannot be told apart"
    broad = sorted({s for slots in shared.values() for s in slots if is_broad(s)})
    if broad:
        return None, (f"it shares only the catch-all slot '{broad[0]}' (a slot that many unrelated names map to) "
                      "with the block's fields, which does not show it means the same thing")
    return None, "no block field has that name and the framework database lists no synonym for it"


def _map_marked_fields(per_item: list[list[_ItemText]], text_keys: list[str], lookup, field_map: dict):
    """The ladder over every marked draft field: ``(resolved, claimed, free, skipped, lossy)``.

    ``resolved`` is ``{draft field: (block key or None, how / why not)}`` after the collision rule (two draft
    fields for one block key: neither is trusted, both are dropped and the section is lossy). ``claimed`` are the
    block keys with exactly one owner; ``free`` are the text keys nobody claimed; ``skipped`` has one entry per
    unmapped draft field. An unmapped field is lossy only while a free text key could still be its home."""
    names = list(dict.fromkeys(t.field for texts in per_item for t in texts if t.field))
    resolved = {n: _resolve_field(n, text_keys, lookup, field_map) for n in names}
    by_key: dict[str, list[str]] = {}
    for n, (key, _how) in resolved.items():
        if key is not None:
            by_key.setdefault(key, []).append(n)
    lossy = False
    for key, owners in by_key.items():
        if len(owners) > 1:
            lossy = True
            for n in owners:
                resolved[n] = (None, f"'{owners[0]}' and '{owners[1]}' would both fill '{key}'")
    claimed = {k: owners[0] for k, owners in by_key.items() if len(owners) == 1}
    free = [k for k in text_keys if k not in claimed]
    skipped: list[dict[str, str]] = []
    for n, (key, why) in resolved.items():
        if key is None:
            skipped.append({"field": n, "reason": why})
            lossy = lossy or (bool(free) and "not lifted" not in why)
    return resolved, claimed, free, skipped, lossy


def _annotate_marked(src, run: _Run, prefix: str, per_item: list[list[_ItemText]], resolved: dict,
                     edits: list[Edit], skipped: list[dict[str, str]]) -> list[str]:
    """Put the field class on the holder of each mapped marked text (the first use of a field per card). Returns
    the block keys annotated, in first-use order."""
    done: list[str] = []
    for member, texts in zip(run.members, per_item):
        seen: set[str] = set()
        for t in texts:
            key = resolved.get(t.field or "", (None, ""))[0]
            if key is None:
                continue
            if key in seen:
                skipped.append({"field": t.field, "reason": f"shown more than once in a card; only the first is lifted to '{key}'"})
            elif t.unit.holder is member:
                skipped.append({"field": t.field, "reason": "the card is its own text, so there is no element to mark"})
            else:
                seen.add(key)
                if key not in done:
                    done.append(key)
                edits.add_class(t.unit.holder, prefix + _kebab(key))
    return done


def _classify_unmarked(per_item: list[list[_ItemText]], free: list[str], skipped: list[dict[str, str]]) -> bool:
    """Report every distinct piece of unmarked item text; True when one of them is lossy.

    Text that sits in every card, or only inside an optional part of one (a retained ``<sc-if>``), is card
    FURNITURE (a star glyph, a link label): the block draws its own, so it is reported and never blocks. Text that
    differs between cards with no field name is unexplained content: lossy while a free text field remains."""
    where: dict[str, set[int]] = {}
    for i, texts in enumerate(per_item):
        for t in texts:
            if t.field is None:
                where.setdefault(t.text, set()).add(i)
    lossy = False
    for text, cards in where.items():
        furniture = len(cards) == len(per_item) or all(
            t.conditional for texts in per_item for t in texts if t.field is None and t.text == text)
        label = f"unmarked text '{text[:40]}'"
        if furniture:
            skipped.append({"field": label, "reason": "the same text sits in every card (or only in an optional part of "
                                                      "one), so it is card furniture, not the card's content; the block draws its own"})
        else:
            skipped.append({"field": label, "reason": "the text varies between cards but no field name says what it is"})
            lossy = lossy or bool(free)
    return lossy


_RATING_ROLE = "rating"
_COLOUR_ROLE = "colour-background"   # DB role: a colour read from the element's OWN inline background (roles table)
_STYLE_MARKER = "data-src-field-style"
_BACKGROUND_PROPS = frozenset({"background", "background-color"})


def _claim_rating(src, run: _Run, prefix: str, schema: ArraySchema, per_item: list[list[_ItemText]],
                  edits: _Edits) -> tuple[list[tuple[str, str]], list[list[_ItemText]]]:
    """A text unit made only of star glyphs, in a block whose item schema has ONE ``rating``-role field, is that field:
    the element gets the field's class (the first such unit of each card) and leaves the furniture report. With no
    rating field in the schema the glyph row stays card furniture (reported, never withheld). Returns
    ``([(key, plain sentence)], the per-card text still to classify)``."""
    keys = [f.key for f in schema.fields if f.role == _RATING_ROLE]
    if len(keys) != 1:
        return [], per_item
    remaining: list[list[_ItemText]] = []
    claimed = False
    for member, texts in zip(run.members, per_item):
        taken = False
        keep: list[_ItemText] = []
        for t in texts:
            if (not taken and t.field is None and not t.conditional and t.unit.text_node is None
                    and t.unit.holder is not member and _is_rating_row(t.text)):
                edits.add_class(t.unit.holder, prefix + _kebab(keys[0]))
                taken = claimed = True
            else:
                keep.append(t)
        remaining.append(keep)
    if not claimed:
        return [], per_item
    return [(keys[0], "each card's row of star glyphs to '%s' (the block's rating field)" % keys[0])], remaining


def _style_marks(member: _Node) -> list[tuple[_Node, str, str]]:
    """``(element, draft field, css property)`` for every ``data-src-field-style="field:property,..."`` marker the
    resolver left inside one card."""
    out: list[tuple[_Node, str, str]] = []
    for el in [member, *_descendants(member)]:
        for name, value in el.attrs:
            if name == _STYLE_MARKER and value:
                for entry in value.split(","):
                    fld, _sep, prop = entry.partition(":")
                    if fld.strip() and prop.strip():
                        out.append((el, fld.strip(), prop.strip().lower()))
    return out


def _colour_key(name: str, keys: list[str], field_map: dict) -> tuple[str | None, str]:
    """The colour item field a draft's style-bound field belongs to: the manifest's ``fieldMap`` first (``null`` =
    deliberately not lifted), then the field whose name words contain the draft name (``avatarColour`` for ``colour``,
    ``badgeColour`` for ``badge``; more than one match is not guessed), then the block's only colour field."""
    if name in field_map:
        target = field_map[name]
        if target is None:
            return None, "the manifest's fieldMap marks it as not lifted"
        return (target, "the manifest's fieldMap") if target in keys else (
            None, f"the manifest's fieldMap sends it to '{target}', which is not a colour field of the block")
    by_name = [k for k in keys if _norm(k) == _norm(name) or f"-{_kebab(name)}-" in f"-{_kebab(k)}-"]
    if len(by_name) == 1:
        return by_name[0], "its name is a word of the field's name"
    if len(keys) == 1:
        return keys[0], "the block has exactly one colour field"
    return None, ("it matches no colour field of the block by name" if not by_name
                  else f"it matches more than one colour field ({', '.join(by_name)})")


def _claim_colours(src, run: _Run, prefix: str, schema: ArraySchema, field_map: dict, edits: _Edits,
                   skipped: list[dict[str, str]]) -> list[tuple[str, str]]:
    """A colour the draft binds to a card through a style declaration (``background: {{ r.colour }}``) is the block's
    ``colour-background`` item field (a colour read from the element's own inline background), by ``fieldMap``, name,
    or being the only such field. The element that carries it gets the field's class (the first per card). Only a
    ``background`` declaration is taken, because that is what the role reads; a text colour is a different thing.
    Every style-bound field that is not taken is reported."""
    keys = [f.key for f in schema.fields if f.role == _COLOUR_ROLE]
    marks = [(m, el, fld, prop) for m in run.members for el, fld, prop in _style_marks(m)]
    if not marks:
        return []
    done: list[tuple[str, str]] = []
    seen: set[tuple[int, str]] = set()
    reported: set[tuple[str, str]] = set()
    for member, el, fld, prop in marks:
        key, how = _colour_key(fld, keys, field_map) if keys else (None, "the block has no background-colour item field")
        if key is not None and prop not in _BACKGROUND_PROPS:
            key, how = None, f"it is the '{prop}' of the element, and the block's colour field is an element's background"
        if key is None:
            if (fld, prop) not in reported:
                reported.add((fld, prop))
                skipped.append({"field": f"style value '{fld}' ({prop})", "reason": how})
            continue
        if (id(member), key) in seen:
            continue
        seen.add((id(member), key))
        edits.add_class(el, prefix + _kebab(key))
        if all(k != key for k, _d in done):
            done.append((key, f"the draft's '{fld}' ({prop}) to '{key}' ({how})"))
    return done


def _plan_marked_items(src, run: _Run, prefix: str, schema: ArraySchema, per_item: list[list[_ItemText]], lookup,
                       field_map: dict, edits: list[Edit]):
    """The field-marker mapping for one run: ``(edits, fields annotated, status, reason, lossy, skipped)``.

    Every marked field goes through ``_resolve_field``. Text the block has no field for (a derived initial, a
    star glyph, a static link label) is reported as skipped with its reason and never blocks the section. Text
    the block DOES have a free field for, that no rung could place, makes the declaration lossy (withheld by
    default), exactly like the unmarked case: guessing would put the text in the wrong field or lose it."""
    text_keys = [f.key for f in schema.fields if f.text_like]
    resolved, claimed, free, skipped, lossy = _map_marked_fields(per_item, text_keys, lookup, field_map)
    done = _annotate_marked(src, run, prefix, per_item, resolved, edits, skipped)
    extra, per_item = _claim_rating(src, run, prefix, schema, per_item, edits)
    extra += _claim_colours(src, run, prefix, schema, field_map, edits, skipped)
    lossy = _classify_unmarked(per_item, free, skipped) or lossy
    unique: list[dict[str, str]] = []
    for entry in skipped:
        if entry not in unique:
            unique.append(entry)
    mapped = ", ".join([f"'{owner}' to '{key}'" for key, owner in claimed.items()] + [text for _key, text in extra])
    reason = f"items annotated and mapped by the draft's field names ({mapped or 'nothing could be mapped'})"
    if unique:
        reason += "; skipped: " + "; ".join(f"'{s['field']}' ({s['reason']})" for s in unique)
    if lossy:
        reason += "; text the block has a field for could not be placed with certainty, so assigning it would be a guess"
    reason += f"; {_NON_TEXT_NOTE}"
    return edits, [k for k in text_keys if k in done] + [k for k, _text in extra], ("partial" if lossy else "applied"), reason, lossy, unique


def _plan_items(src, run: _Run, block_name: str, schema: ArraySchema, lookup=None, field_map: dict | None = None,
                edits: _Edits | None = None):
    """Edits and report facts for one run: ``(edits, fields annotated, status, reason, lossy, skipped fields)``. The
    edits are collected into ``edits`` (the same object comes back).

    ``lossy`` is True when the items hold text that cannot be assigned to a text field with certainty. Measured
    on the Eye Care reviews rail: once the converter claims the block and finds items it cannot fully match, it
    lifts the fields it can and drops the rest of the card text, with no content gap reported. The caller
    therefore withholds the whole declaration unless told to keep it.

    When the resolver left field markers on the run copy the mapping is by NAME (``_plan_marked_items``);
    otherwise it is the older count-and-shape rule below, which only maps the one certain case.
    """
    item_token = _singular(schema.attr)
    field_tokens = {_kebab(f.key) for f in schema.fields}
    if item_token in field_tokens:
        item_token += "-item"
    prefix = f"sgs-{block_name}__"
    other_bem = [c for m in run.members for c in m.classes if _BEM_ELEMENT_RE.match(c) and not c.startswith(prefix)]
    if other_bem:
        return [], [], "partial", (f"the items already carry the BEM class '{other_bem[0]}' of another block, "
                                   "so they were left as the draft has them"), False, []
    edits = edits if edits is not None else _Edits(src)
    for member in run.members:
        edits.add_class(member, prefix + item_token)
    text_fields = [f for f in schema.fields if f.text_like]
    per_item = [_units(m, src) for m in run.members]
    counts = {len(u) for u in per_item}
    if counts == {0}:
        return edits, [], "applied", f"items annotated; they hold no text; {_NON_TEXT_NOTE}", False, []
    marked = [_item_texts(m, src) for m in run.members]
    if any(t.field for texts in marked for t in texts):
        return _plan_marked_items(src, run, prefix, schema, marked, lookup, field_map or {}, edits)
    if len(counts) != 1:
        return edits, [], "partial", ("items annotated; the items do not all hold the same amount of text, so no "
                                      "field could be mapped"), True, []
    unit_count = counts.pop()
    if not text_fields:
        return edits, [], "partial", (f"items annotated; each item holds {unit_count} piece(s) of text but the "
                                      "block has no text field to carry it"), True, []
    if len(text_fields) == 1 and unit_count == 1:
        fld = text_fields[0]
        cls = prefix + _kebab(fld.key)
        for member, units in zip(run.members, per_item):
            unit = units[0]
            if unit.text_node is None:
                if unit.holder is member:            # the item is its own text: the converter reads it directly
                    continue
                edits.add_class(unit.holder, cls)
            else:
                raw = src[unit.text_node.start:unit.text_node.end]
                lead = raw[:len(raw) - len(raw.lstrip())]
                trail = raw[len(raw.rstrip()):]
                edits.append((unit.text_node.start, unit.text_node.end,
                              f'{lead}<span class="{cls}">{raw.strip()}</span>{trail}'))
        return edits, [fld.key], "applied", f"items annotated and the item text mapped to '{fld.key}'; {_NON_TEXT_NOTE}", False, []
    names = ", ".join(f.key for f in text_fields)
    return edits, [], "partial", (f"items annotated; each item has {unit_count} piece(s) of text and the block has "
                                  f"{len(text_fields)} text field(s) ({names}), so assigning them by order would be a guess"), True, []


# ---------------------------------------------------------------------------------------------------------------
# The box owner: which element of the draft IS the block (FR-31-31 rule 8)
# ---------------------------------------------------------------------------------------------------------------
# A block that cannot claim a section root goes on an element INSIDE the section. The parent of the repeated items is
# the wrong element when the draft draws the block's box (its border, radius, background) around the items AND their
# header: the header would then sit outside the block and fall into generic text blocks. So the annotator climbs from
# that parent, strictly inside the section root, to the first element that itself declares a property the block also
# declares as part of its own box (``lookup.identity_properties``). Only two sources of an element's own styling are
# read: its inline ``style`` and top-level single-class rules of the run copy's ``<style>`` blocks (a rule inside
# ``@media`` / ``@supports`` / ``@container`` / ``@layer``, or with a descendant, compound or pseudo selector, applies
# conditionally or to another element and is NOT read). Cascade order and ``!important`` are not evaluated.

_SIDES = frozenset({"top", "right", "bottom", "left", "inline", "block", "start", "end"})
_NO_PAINT = frozenset({"", "none", "0", "0px", "transparent", "initial", "inherit", "unset", "revert"})
_STYLE_TAG_RE = re.compile(r"<style\b[^>]*>(.*?)</style\s*>", re.IGNORECASE | re.DOTALL)
_CONDITIONAL_AT_RE = re.compile(r"@(?:media|supports|container|layer|document|scope)\b[^{};]*\{")


def _declarations(text: str) -> dict[str, str]:
    """``{property: value}`` for one declaration block (the last declaration of a property wins). A ``;`` inside
    parentheses (``url(data:...;base64,...)``) does not end a declaration."""
    out: dict[str, str] = {}
    for part in re.split(r";(?![^()]*\))", text):
        name, sep, value = part.partition(":")
        if sep and name.strip():
            out[name.strip().lower()] = value.strip()
    return out


def _unconditional_css(sheet: str) -> str:
    """``sheet`` without every conditional at-rule block (nested braces included)."""
    out, pos = [], 0
    for m in _CONDITIONAL_AT_RE.finditer(sheet):
        if m.start() < pos:
            continue
        depth, i = 1, m.end()
        while i < len(sheet) and depth:
            depth += {"{": 1, "}": -1}.get(sheet[i], 0)
            i += 1
        out.append(sheet[pos:m.start()])
        pos = i
    out.append(sheet[pos:])
    return "".join(out)


def _own_declarations(node: _Node, sheet: str) -> dict[str, str]:
    """The declarations that belong to ``node`` alone: its inline ``style`` over its single-class rules."""
    merged: dict[str, str] = {}
    for cls in node.classes:
        for block in re.findall(r"(?:^|[}{;,])\s*\." + re.escape(cls) + r"(?![\w-])\s*(?:,[^{}]*)?\{([^}]*)\}", sheet):
            merged.update(_declarations(block))
    for name, value in node.attrs:
        if name == "style" and value:
            merged.update(_declarations(_html.unescape(value)))
    return merged


def _matches_identity(prop: str, identity: frozenset[str]) -> bool:
    """``prop`` (a declared CSS property) is, or is a shorthand or side longhand of, an identity property.
    ``border`` and ``border-top`` are shorthands of ``border-color``; ``border-top-color`` and ``border-top-left-radius``
    are side longhands of ``border-color`` / ``border-radius``; ``background`` is a shorthand of ``background-color``."""
    words = prop.split("-")
    for q in identity:
        qw = q.split("-")
        if prop == q or (words[0] == qw[0] and (
                len(words) == 1
                or (len(words) == 2 and words[1] in _SIDES and qw[0] == "border")
                or (len(words) > len(qw) and words[1] in _SIDES and words[-1] == qw[-1]))):
            return True
    return False


def _paints_identity(declared: dict[str, str], identity: frozenset[str]) -> list[str]:
    """The identity properties an element's declarations actually paint (a value of ``none``, ``0`` or
    ``transparent`` paints nothing), in declaration order."""
    return [prop for prop, value in declared.items()
            if _matches_identity(prop, identity) and not all(w in _NO_PAINT for w in value.lower().split() or [""])]


_FOUR_SIDES = ("top", "right", "bottom", "left")


def _sides_of(part: str) -> "tuple[str, ...] | None":
    """The physical sides a border property name part covers (CSS logical sides included: ``inline`` is left and right),
    or None when the part is not a side at all (``width``, ``color``, ``radius``...). Grammar, not a property lookup."""
    if part in _FOUR_SIDES:
        return (part,)
    if part == "inline":
        return ("left", "right")
    if part == "block":
        return ("top", "bottom")
    if part == "start":
        return ("left",)
    if part == "end":
        return ("right",)
    return None
_NO_LINE = frozenset({"none", "hidden", "0", "0px", "transparent"})     # a border shorthand token that draws no line


def _tokens(value: str) -> list[str]:
    """The whitespace-separated tokens of a CSS value, a parenthesised group (``rgb(0, 0, 0)``) staying one token."""
    return [t for t in re.split(r"\s+(?![^()]*\))", value.lower().strip()) if t]


def _expand_sides(toks: list[str]) -> dict[str, str]:
    """CSS one-to-four value expansion (top, right, bottom, left)."""
    n = len(toks)
    if n == 0:
        return {}
    if n == 1:
        t = toks * 4
    elif n == 2:
        t = toks * 2
    elif n == 3:
        t = [toks[0], toks[1], toks[2], toks[1]]
    else:
        t = toks[:4]
    return dict(zip(_FOUR_SIDES, t))


def _border_sides(declared: dict[str, str], props: list[str]) -> tuple[set[str], bool]:
    """``(the sides a border is drawn on, whether a radius is set)`` from the border properties in ``props``.

    A shorthand (``border``, ``border-top``) draws its sides unless one of its tokens is a no-line value. A
    ``border-width`` / ``border-style`` longhand (with or without a side, one to four values) draws a side when the
    width is not zero and the style is not ``none`` / ``hidden``; a width alone counts (the style may come from
    somewhere this reader cannot see, and someone who wrote a width meant a border). A colour alone never draws a
    line. Declarations are read as a set (cascade order is not evaluated, see the reader's limits above)."""
    width: dict[str, bool] = {}
    style: dict[str, bool] = {}
    radius = False
    for prop in props:
        words, toks = prop.split("-"), _tokens(declared[prop])
        if words[0] != "border":
            continue
        if words[-1] == "radius":
            radius = True
            continue
        kind = words[-1] if words[-1] in ("width", "style", "color") else None
        parts = words[1:-1] if kind else words[1:]
        if kind == "color" or len(parts) > 1 or (parts and _sides_of(parts[0]) is None):
            continue
        if kind is None:                                 # ``border`` / ``border-top``: one verdict for its sides
            draws = not any(t in _NO_LINE for t in toks)
            for side in (_sides_of(parts[0]) if parts else _FOUR_SIDES):
                width[side] = style[side] = draws
            continue
        values = _expand_sides(toks) if not parts else {side: toks[0] for side in _sides_of(parts[0]) if toks}
        for side, tok in values.items():
            (width if kind == "width" else style)[side] = tok not in _NO_LINE
    return {s for s in _FOUR_SIDES if width.get(s, True) and (style.get(s) or (s not in style and width.get(s)))}, radius


def _makes_box(declared: dict[str, str], identity: frozenset[str]) -> list[str]:
    """The identity properties that make this element a CONTAINING BOX, else ``[]``. A box is: a non-transparent
    background colour or image, a box shadow, a border on ALL FOUR sides (the ``border`` shorthand does that), or a
    border radius together with a border on any side. A divider (one side's border), an outline, a radius with
    nothing drawn, and every property that paints without enclosing (``object-fit``, ``background-position``) are
    not: a layout wrapper with a single rule under it is not the block's box, and stopping the climb on it would
    leave the block's header outside the block root."""
    painted = _paints_identity(declared, identity)
    sides, radius = _border_sides(declared, painted)
    fills = [p for p in painted if p == "background" or p in _BOX_PAINT_PROPERTIES]   # never background-position / -size / -repeat
    if not fills and not (len(sides) == 4 or (radius and sides)):
        return []
    return fills + [p for p in painted if p.split("-")[0] == "border"]


def _box_owner(start: _Node, root: _Node, sheet: str, identity: frozenset[str], stop_classes: set[str],
               is_other_block) -> tuple[_Node | None, int, list[str]]:
    """``(owner, levels climbed, properties that made it the owner)`` for the first element from ``start`` up to (never
    including) ``root`` that is a containing box (``_makes_box``), else ``(None, 0, [])``. The climb stops, finding
    nothing, at an element that carries another declared section's class or another built block's root class. A
    directive element (``<sc-if>``, ``<sc-for>``) cannot carry a class and is passed through without counting as a
    level."""
    levels = 0
    for node in [start, *_ancestors(start)]:
        if node is root:
            break
        if _is_directive(node):
            continue
        if any(c in stop_classes for c in node.classes) or is_other_block(node):
            break
        painted = _makes_box(_own_declarations(node, sheet), identity)
        if painted:
            return node, levels, painted
        levels += 1
    return None, 0, []


def _unit_text(unit: _Unit, src: str) -> str:
    node = unit.text_node
    return _squash(src[node.start:node.end] if node is not None else src[unit.holder.open_end:unit.holder.inner_end])


# ---------------------------------------------------------------------------------------------------------------
# The header field ladder: furniture inside the block root that has no class and no marker (FR-31-31 rule 9)
# ---------------------------------------------------------------------------------------------------------------
# Once the block root is the box that also holds the header (an average rating, a review count, a link), every unit of
# text and every media element inside it that is not an item is either MAPPED to one of the block's scalar attributes by
# role and value shape, or REPORTED as skipped with a reason. A converter that claims the block drops what it cannot
# place, so a text unit that ends as neither is unexplained content and withholds the declaration (exactly like an
# unexplained item text). Nothing here reads a block name: the attributes, their roles, the element slots the block
# styles and the slot vocabulary all come from the lookup.

_STAR_GLYPHS = frozenset("★☆⭐✩✭✮✯")
# The glyphs a per-card rating row may be made of and still be lifted correctly. ``converter/services/lift_helpers.py::
# extract_star_count`` counts ``★`` and ``⭐`` (a filled star) and nothing else, so ``★★★★☆`` lifts as 4 (right) and
# ``☆☆☆☆☆`` as 0 (right), but ``✭✭✭✭✭`` lifts as 0 (wrong): a row holding any other star glyph is not claimed as a rating.
# ``test_star_glyph_sets_agree_with_the_converters_star_count`` compares this set with the converter so they cannot drift.
_RATING_ROW_GLYPHS = frozenset("★⭐☆✩")
_RATING_NUMBER_RE = re.compile(r"^\d(?:\.\d+)?$")
_COUNT_TEXT_RE = re.compile(r"^(\d[\d,]*)\s+([A-Za-z][A-Za-z-]*)$")
_NUMERAL_RE = re.compile(r"\d+(?:\.\d+)?")
_SCALE_RE = re.compile(r"(?:out of|/|of)\s*(\d+(?:\.\d+)?)", re.IGNORECASE)   # the scale maximum in '4.7 out of 5', not a rating
_NUMERIC_ROLE = "numeric-content"
_TEXT_ROLE = "text-content"
_STAR_TERM = "stars"      # the DB slot vocabulary's word for what a star bar shows (slot `rating`, alias `stars`)
_STAR_WORD = "star"       # a block that styles an element called `star` / `arrow` draws that thing itself
_ARROW_WORD = "arrow"
# Structure the header ladder can name with the same certainty as a field: each word names an ELEMENT of a block (`header`,
# `rail`, `arrow`, `logo`), never a block. The classes the block's attributes list in ``derived_selector``
# (``DbBlockLookup.derived_classes``) decide whether the block cares and what the class is called; the draft's own structure
# (the row that holds the mapped fields, the parent of the repeated items, a text-less control, a decorative mark) decides
# which node gets it. The slot vocabulary has one word for a short caption text (`label`, aliases eyebrow / tag / kicker) and
# it tells a source label from a business name.
_HEADER_WORD = "header"
_RAIL_WORD = "rail"
_LOGO_WORD = "logo"
_LABEL_TERM = "label"
_CONTROL_TAGS = frozenset({"button"})
_MEDIA_TAGS = frozenset({"img", "picture", "video", "audio", "canvas", "iframe", "input", "select", "textarea", "svg"})


def _is_star_run(text: str) -> bool:
    return bool(text.strip()) and all(ch in _STAR_GLYPHS or ch.isspace() for ch in text)


def _is_rating_row(text: str) -> bool:
    """A run of star glyphs the converter counts correctly (``_RATING_ROW_GLYPHS``): the only kind claimed as a rating."""
    return bool(text.strip()) and all(ch in _RATING_ROW_GLYPHS or ch.isspace() for ch in text)


def _stem(word: str) -> str:
    word = word.lower()
    return word[:-1] if word.endswith("s") and not word.endswith("ss") and len(word) > 3 else word


def _words(text: str) -> list[str]:
    return [_stem(w) for w in re.findall(r"[A-Za-z]+", text)]


def _attr_words(name: str) -> list[str]:
    return [_stem(w) for w in _kebab(name).split("-") if w]


def _text_of(node: _Node, src: str) -> str:
    parts: list[str] = []
    for child in node.children:
        if child.kind == "text":
            parts.append(src[child.start:child.end])
        elif child.kind == "tag" and child.name not in _OPAQUE:
            parts.append(_text_of(child, src))
    return _squash(" ".join(parts))


def _attr(node: _Node, name: str) -> str | None:
    for key, value in node.attrs:
        if key == name:
            return _html.unescape(value) if value is not None else ""
    return None


def _quote(prefix: str, text: str) -> str:
    return f"{prefix} '{text[:40]}'"


@dataclass
class _Header:
    """What the header ladder decided: ``fields`` mapped, ``skipped`` (every unit and element not mapped, each with its
    reason), ``notes`` (one plain sentence per mapping) and ``unexplained`` (the text or media that has no field and no
    furniture verdict, which withholds the section)."""
    fields: list[str] = field(default_factory=list)
    claimed: list[tuple[_Node, ScalarAttr]] = field(default_factory=list)      # each element a field class was requested for, and the field
    skipped: list[dict[str, str]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    unexplained: list[str] = field(default_factory=list)
    rungs: list[dict[str, str]] = field(default_factory=list)          # one entry per header link: the rung of the link ladder that decided it
    structure: list[dict[str, str]] = field(default_factory=list)      # each structural element the block declares: classed (by which signal) or not recognised (why)

    def skip(self, label: str, reason: str) -> None:
        entry = {"field": label, "reason": reason}
        if entry not in self.skipped:
            self.skipped.append(entry)

    def unplaced(self, label: str, reason: str) -> None:
        self.skip(label, reason)
        if label not in self.unexplained:
            self.unexplained.append(label)


def _label_agrees(label: str, number: float) -> bool | None:
    """Does a star bar's ``aria-label`` name the rating ``number``? None when the label has no numeral at all (it gives
    no evidence: 'Five stars'). Otherwise every numeral in it must equal ``number``, the scale maximum after 'out of'
    or '/' excepted; so '4.7 out of 5' and 'Rated 4.7 out of 5' agree with 4.7, while 'Rated 3.2 out of 5' and
    '4.7 out of 5, based on 15 reviews' do not (a label that says something else about the rating is not evidence
    that the bar shows this number, and withholding on it is the safe side)."""
    scales = {m.start(1) for m in _SCALE_RE.finditer(label)}
    numerals = [m for m in _NUMERAL_RE.finditer(label) if m.start() not in scales]
    if not numerals:
        return None
    return all(abs(float(m.group()) - number) < 0.05 for m in numerals)


def _star_bar_after(holder: _Node, number: float, src: str) -> _Node | None:
    """The star bar right after a number element: the next sibling element (whitespace between is fine), when its
    ``aria-label`` agrees with the number (``_label_agrees``) or, when the label has no numeral to compare, it holds
    nothing but star glyphs (glyph geometry is then the only evidence there is, and it is no evidence of the value)."""
    if holder.parent is None:
        return None
    seen = False
    for sibling in holder.parent.children:
        if sibling is holder:
            seen = True
        elif not seen or (sibling.kind == "text" and not src[sibling.start:sibling.end].strip()) or sibling.kind == "comment":
            continue
        elif sibling.kind != "tag":
            return None
        else:
            agrees = _label_agrees(_attr(sibling, "aria-label") or "", number)
            if agrees is not None:
                return sibling if agrees else None
            return sibling if _is_star_run(_text_of(sibling, src)) else None
    return None


def _shares_slot(name: str, term: str, lookup) -> bool:
    """The attribute's name has a word that lives in the same DB slot as ``term`` (that slot's name or one of its aliases)."""
    slots_of = getattr(lookup, "slots_of", None)
    if slots_of is None:
        return False
    slots = slots_of(term)
    return bool(slots) and any(slots_of(w) & slots for w in _kebab(name).split("-") if w)


def _shares_star_slot(name: str, lookup) -> bool:
    """The attribute's name has a word that lives in the same DB slot as the star bar's own term (``rating``)."""
    return _shares_slot(name, _STAR_TERM, lookup)


def _declares(elements: frozenset[str], word: str) -> bool:
    return any(word == _stem(w) for name in elements for w in _kebab(name).split("-") if w)


def _link_hits(anchor_text: str, attr: ScalarAttr, elements: frozenset[str]) -> list[str]:
    """The anchor's words that are words of the attribute's name or of an element slot the block styles that shares a
    word with the attribute's name (``write-review`` for ``reviewRequestUrl``)."""
    vocab = set(_attr_words(attr.name))
    for element in elements:
        if vocab & set(_attr_words(element)):
            vocab |= set(_attr_words(element))
    return [w for w in _words(anchor_text) if w in vocab]


def _link_score(anchor_text: str, attr: ScalarAttr, elements: frozenset[str]) -> int:
    return len(_link_hits(anchor_text, attr, elements))


def _selector_classes(selector: str | None) -> set[str]:
    """The element classes a ``block_attributes.derived_selector`` lists (it may list the block's own class and the class
    the annotator puts on a draft element, comma separated)."""
    return {part.strip() for part in (selector or "").split(",") if part.strip()}


def _own_class(attr: ScalarAttr, prefix: str) -> bool:
    """The attribute lists, among the element classes it is lifted from, the one this annotator would put on its element."""
    return "." + prefix + _kebab(attr.name) in _selector_classes(attr.selector)


def _declared_element(classes: frozenset[str], prefix: str, word: str, name_words: set[str]) -> str | None:
    """The BEM element (the part after ``prefix``) among the classes the block's attributes list that names ``word`` and
    nothing but ``word`` and words of the block's own name: ``header`` for ``header``, ``google-logo`` for ``logo`` in
    ``google-reviews`` (``google`` is a word of the block's name), never ``show-arrows`` (a toggle), ``card-logo`` (a
    different mark) or ``arrow-colour``. Exactly one, else None (the block lists none, or which is meant is not certain)."""
    found = sorted(e for e in (c[len(prefix):] for c in classes if c.startswith(prefix))
                   if word in _attr_words(e) and set(_attr_words(e)) - name_words == {word})
    return found[0] if len(found) == 1 else None


def _link_label(link: ScalarAttr, attrs: list[ScalarAttr], prefix: str) -> ScalarAttr | None:
    """The block's text attribute that carries the visible label of ``link``: the one ``text-content`` string whose
    ``derived_selector`` lists the class of the link's own element (``seeAllLabel`` and ``seeAllUrl`` are both lifted from
    the anchor that carries ``sgs-google-reviews__see-all-url``), so the anchor's text IS that attribute and it needs no
    second class. Exactly one, or None."""
    own = "." + prefix + _kebab(link.name)
    found = [a for a in attrs if a.kind == "string" and not a.link_like and a.role == _TEXT_ROLE and own in _selector_classes(a.selector)]
    return found[0] if len(found) == 1 else None


def _own_names(node: _Node) -> str:
    """What the draft calls an anchor besides its visible text: ``aria-label``, ``title``, ``id``, ``name``, every
    ``data-*`` attribute (the resolver's own ``data-src-field*`` markers excepted) and the classes that are not SGS ones."""
    bits: list[str] = []
    for key, value in node.attrs:
        k = key.lower()
        if k in ("aria-label", "title", "id", "name") or (k.startswith("data-") and not k.startswith("data-src-field")):
            bits += [k if k.startswith("data-") else "", _html.unescape(value or "")]
    bits += [c for c in node.classes if not c.startswith("sgs-")]
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", " ".join(bits))


def _assign_links(anchors: list[_Node], clues: list[tuple[str, dict[int, str]]], link_attrs: list[ScalarAttr],
                  elements: frozenset[str]) -> dict[int, tuple[ScalarAttr, str, str]]:
    """``{id(anchor): (link attribute, rung, evidence)}`` for the header anchors the ladder could decide.

    Rungs, strongest first. Each ``clues`` entry is ``(rung name, {id(anchor): text})``: the anchor's visible text, then what
    the draft calls it (``_own_names``). Words of the text are scored against each attribute's vocabulary (``_link_hits``);
    a pair is decided only when the score is the STRICT maximum of both its anchor's row and its attribute's column, so a
    tie decides nothing and the anchors left over go to the next rung. The last rung is POSITION and the weakest: only when
    as many anchors are left as link attributes, the n-th anchor in document order takes the n-th attribute in the order
    the block declares them. Nothing else about the anchors is read (not their colours, not their addresses: two
    header links may share one address, and a filled and an outlined pill are told apart by no framework data)."""
    decided: dict[int, tuple[ScalarAttr, str, str]] = {}
    for rung, texts in clues:
        while True:
            free_a = [n for n in anchors if id(n) not in decided]
            taken = {d[0].name for d in decided.values()}
            free_x = [x for x in link_attrs if x.name not in taken]
            hits = {(id(n), x.name): _link_hits(texts[id(n)], x, elements) for n in free_a for x in free_x}
            picks = []
            for n in free_a:
                for x in free_x:
                    score = len(hits[(id(n), x.name)])
                    if (score and all(len(hits[(id(n), y.name)]) < score for y in free_x if y is not x)
                            and all(len(hits[(id(m), x.name)]) < score for m in free_a if m is not n)):
                        picks.append((n, x, hits[(id(n), x.name)]))
            if not picks:
                break
            for n, x, found in picks:
                words = ", ".join(f"'{w}'" for w in dict.fromkeys(found))
                decided[id(n)] = (x, rung, f"its {rung} has {words} in common with '{x.name}' (its own name, or an element the "
                                           "block styles for it) and more than with any other link attribute")
    free_a = [n for n in anchors if id(n) not in decided]
    taken = {d[0].name for d in decided.values()}
    free_x = [x for x in link_attrs if x.name not in taken]
    if free_a and len(free_a) == len(free_x):
        for i, (n, x) in enumerate(zip(free_a, free_x), 1):
            decided[id(n)] = (x, "position", f"no wording told the links apart, so it is link {i} of {len(free_a)} left in the header, "
                                              f"matched to link attribute {i} in the order the block declares them (weak evidence)")
    return decided


def _name_attrs(attrs: list[ScalarAttr], prefix: str, lookup) -> list[ScalarAttr]:
    """The block's string attributes that can carry a header caption (a business name): a ``text-content`` string
    that (a) declares the element class the converter lifts its value from, and that class is exactly the one this
    annotator would put on the caption (``block_attributes.derived_selector`` == ``.sgs-<block>__<attribute>``), and
    (b) has a word in its name that the slot vocabulary knows (``name`` is an alias of the ``heading`` slot; no
    attribute name is read here). The caller maps a caption only when exactly ONE attribute qualifies: two candidates,
    or none, and the caption is unexplained and the section is withheld. The ``identity`` role is NOT a candidate: on
    the live database it names icon identities (``iconName``, ``iconSource``), never a business name."""
    slots_of = getattr(lookup, "slots_of", None)
    return [a for a in attrs
            if a.kind == "string" and not a.link_like and a.role == _TEXT_ROLE and _own_class(a, prefix)
            and slots_of is not None and any(slots_of(w) for w in _kebab(a.name).split("-") if w)]


def _common_ancestor(nodes: list[_Node]) -> _Node | None:
    """The closest element that contains every node of ``nodes`` (a node is not its own ancestor)."""
    for anc in _ancestors(nodes[0]):
        if all(_is_inside(n, anc) for n in nodes[1:]):
            return anc
    return None


def _handler_of(node: _Node) -> str:
    """The draft's own click handler on a control (``onClick="{{ revPrev }}"``), or its ``aria-label``, as evidence text."""
    return _attr(node, "onclick") or _attr(node, "aria-label") or ""


def _classify_structure(head: _Header, src: str, root: _Node, members: list[_Node], rail: _Node | None, prefix: str,
                        classes: frozenset[str], name_words: set[str], edits: _Edits, images: list[_Node],
                        controls: list[_Node]) -> None:
    """Class the structure the block styles (each entry of ``head.structure``: the class put on the draft, by which signal,
    or why it was not recognised). Only a class the block's attributes LIST (``derived_selector``) is looked for; the
    class is that listed one, and it never changes an attribute of the draft's node (the decorative mark keeps its
    ``aria-hidden``)."""
    def note(element: str, cls: str | None, why: str) -> None:
        head.structure.append({"element": element, "class": cls or "", "recognised": "yes" if cls else "no", "signal": why})

    def apply(element: str, node: _Node, why: str) -> None:
        edits.add_class(node, prefix + _kebab(element))
        note(element, prefix + _kebab(element), why)

    inside_items = lambda n: any(n is m or _is_inside(n, m) or _is_inside(m, n) for m in members)   # noqa: E731

    element = _declared_element(classes, prefix, _HEADER_WORD, name_words)
    if element:
        # the header is what sits BEFORE the items: a field mapped after them (a footnote) belongs to the footer row
        fields = list({id(n): n for n, _a in head.claimed if not members or n.start < members[0].start}.values())
        row = _common_ancestor(fields) if len(fields) > 1 else None
        if len(fields) < 2:
            pass                                    # nothing to recognise: a row of one field is not a row
        elif row is None or row is root:
            note(element, None, "the mapped header fields share no element below the block root, so the root itself is their row")
        elif inside_items(row):
            note(element, None, "the closest element holding the mapped header fields also holds the repeated items")
        else:
            apply(element, row, f"the closest element that holds all {len(fields)} mapped header fields "
                                f"({', '.join(sorted({a.name for n, a in head.claimed if n in fields}))}) and none of the items")
    element = _declared_element(classes, prefix, _RAIL_WORD, name_words)
    if element and rail is not None and rail is not root:       # a rail that IS the block root is already the block
        apply(element, rail, f"the element that directly holds the {len(members)} repeated items")
    element = _declared_element(classes, prefix, _ARROW_WORD, name_words)
    if element:
        if controls:
            for button in controls:
                edits.add_class(button, prefix + _kebab(element))
            names = ", ".join(f"'{_handler_of(b)}'" for b in controls if _handler_of(b))
            note(element, prefix + _kebab(element),
                 f"{len(controls)} text-less button(s) in the block outside the items" + (f", calling / labelled {names}" if names else ""))
    element = _declared_element(classes, prefix, _LOGO_WORD, name_words)
    if element:
        # the converter's own test for a decorative image (lift_helpers.is_decorative_img): the class goes only on a mark
        # the converter will never lift as content, so an author who merely left the alt text off keeps a lifted photo
        marks = [i for i in images if _attr(i, "aria-hidden") == "true" or _attr(i, "role") in ("presentation", "none")]
        if len(marks) == 1:
            apply(element, marks[0], "the block's only decorative (aria-hidden) image outside the items")
        elif marks:
            note(element, None, f"{len(marks)} decorative images sit in the block outside the items, so which is the source mark is not certain")


def _plan_header(src: str, root: _Node, members: list[_Node], block_name: str, attrs: list[ScalarAttr],
                 elements: frozenset[str], lookup, edits: _Edits, rail: _Node | None = None,
                 classes: frozenset[str] = frozenset()) -> _Header:
    """Map or report every text unit and media element of ``root`` that is not inside an item."""
    prefix = f"sgs-{block_name}__"
    head = _Header()
    keep = tuple(members)
    units = [(u, _unit_text(u, src)) for u in _units(root, src, skip=keep)]
    used: set[int] = set()

    def inside_item(node: _Node) -> bool:
        return any(node is m or _is_inside(node, m) for m in members)

    def claim(node: _Node, attr: ScalarAttr) -> None:
        edits.add_class(node, prefix + _kebab(attr.name))
        head.claimed.append((node, attr))
        if attr.name not in head.fields:
            head.fields.append(attr.name)

    def rating_attr(a: ScalarAttr) -> bool:
        return a.kind == "number" and a.role == _NUMERIC_ROLE and _shares_star_slot(a.name, lookup)

    # 1. Links: every header anchor, mapped to ONE link attribute only when all of them carry one identical address.
    anchors = [n for n in _descendants(root) if n.name == "a" and not inside_item(n)]
    link_attrs = [a for a in attrs if a.link_like]
    hrefs = {_attr(n, "href") or "" for n in anchors}
    hrefs.discard("")
    link_labels = {l.name: lab for l in link_attrs if len(link_attrs) > 1 and (lab := _link_label(l, attrs, prefix))}
    if anchors:
        texts = {id(n): _text_of(n, src) for n in anchors}
        if len(link_attrs) > 1:
            addressed = [n for n in anchors if (_attr(n, "href") or "").strip()]
            for n in anchors:
                if n not in addressed:
                    head.skip(_quote("header link", texts[id(n)]), "it has no address to lift")
                    head.rungs.append({"link": texts[id(n)][:40], "attribute": "", "rung": "none", "evidence": "the anchor has no href"})
            decided = _assign_links(addressed, [("link text", texts), ("own names", {id(n): _own_names(n) for n in addressed})],
                                    link_attrs, elements)
            for n in addressed:
                pick = decided.get(id(n))
                if pick is None:
                    names = ", ".join(f"'{x.name}'" for x in link_attrs)
                    head.skip(_quote("header link", texts[id(n)]),
                              f"no evidence which of the block's link attributes ({names}) it is: its wording and its own names "
                              "did not tell them apart, and the links left over do not match the attributes left over one for one")
                    head.rungs.append({"link": texts[id(n)][:40], "attribute": "", "rung": "none", "evidence": "no rung decided it"})
                    continue
                attr, rung, evidence = pick
                claim(n, attr)
                if attr.name in link_labels and link_labels[attr.name].name not in head.fields:
                    head.fields.append(link_labels[attr.name].name)          # same element, same class: lifted as the anchor's text
                head.notes.append(f"'{texts[id(n)][:40]}' (a link to {_attr(n, 'href')}) to '{attr.name}'"
                                  + (f" and its text to '{link_labels[attr.name].name}'" if attr.name in link_labels else "")
                                  + f" (rung '{rung}': {evidence})")
                head.rungs.append({"link": texts[id(n)][:40], "attribute": attr.name, "rung": rung, "evidence": evidence})
        elif len(link_attrs) != 1:
            why = ("the block has no link attribute" if not link_attrs
                   else "the block has more than one link attribute, so which one an address belongs to is not certain")
            for n in anchors:
                head.skip(_quote("header link", texts[id(n)]), why)
        elif len(hrefs) != 1:
            for n in anchors:
                head.skip(_quote("header link", texts[id(n)]),
                          "the header's links point to different addresses, so no single address can be tied to "
                          f"'{link_attrs[0].name}'")
        elif len(anchors) > 1 and max(_link_score(texts[id(n)], link_attrs[0], elements) for n in anchors) == 0:
            for n in anchors:      # several links, one address, and no word of any of them ties it to the attribute
                head.skip(_quote("header link", texts[id(n)]),
                          f"no evidence which link is the block's '{link_attrs[0].name}' (none of their words is a word of the "
                          "attribute or of an element the block styles for it)")
        else:
            best = max(_link_score(texts[id(n)], link_attrs[0], elements) for n in anchors)
            winner = next(n for n in anchors if _link_score(texts[id(n)], link_attrs[0], elements) == best)
            claim(winner, link_attrs[0])
            head.notes.append(f"'{texts[id(winner)][:40]}' (a link to {next(iter(hrefs))}) to '{link_attrs[0].name}', "
                              "the one address every header link shares")
            for n in anchors:
                if n is not winner:
                    head.skip(_quote("header link", texts[id(n)]),
                              f"no block attribute for a second link ('{link_attrs[0].name}' already carries the address)")
        for n in anchors:
            for i, (u, _t) in enumerate(units):
                if u.holder is n or _is_inside(u.holder, n):
                    used.add(i)

    # 2. Numbers: a rating beside a star bar, a count beside a noun the block names.
    for i, (unit, text) in enumerate(units):
        if i in used or unit.text_node is not None:
            continue
        if _RATING_NUMBER_RE.match(text) and float(text) <= 5:
            bar = _star_bar_after(unit.holder, float(text), src)
            if bar is None:
                continue
            found = [a for a in attrs if rating_attr(a)]
            if len(found) == 1:
                claim(unit.holder, found[0])
                head.notes.append(f"'{text}' to '{found[0].name}' (a number straight before a star bar showing the same rating)")
                used.add(i)
                for j, (u2, _t2) in enumerate(units):
                    if u2.holder is bar or _is_inside(u2.holder, bar):
                        used.add(j)
                        head.skip(_quote("header star bar", _text_of(bar, src)),
                                  f"it repeats '{found[0].name}' as stars; the block draws its own stars from that value")
            else:
                head.unplaced(_quote("header text", text),
                              "a rating beside a star bar, but the block has " + (
                                  "no numeric rating attribute" if not found else "more than one they could fill"))
                used.add(i)
            continue
        count = _COUNT_TEXT_RE.match(text)
        if count is not None:
            noun = _stem(count.group(2))
            found = [a for a in attrs if a.kind == "number" and a.role == _NUMERIC_ROLE and not rating_attr(a)
                     and noun in _attr_words(a.name)]
            if len(found) == 1:
                claim(unit.holder, found[0])
                head.notes.append(f"'{text}' to '{found[0].name}' (a whole number followed by '{count.group(2)}', a word of the attribute's name)")
                used.add(i)

    # 3. Star glyphs, controls, the caption and everything else.
    star_drawn, arrows_drawn = _declares(elements, _STAR_WORD), _declares(elements, _ARROW_WORD)
    name_words = set(_words(block_name.replace("-", " ")))
    label_ids = {id(a) for a in link_labels.values()}                # a link's own label is that link's, not a caption's
    name_cands = [a for a in _name_attrs(attrs, prefix, lookup) if id(a) not in label_ids]
    source_attrs = [a for a in name_cands if _shares_slot(a.name, _LABEL_TERM, lookup)]      # a short caption text: the review SOURCE
    identity_attrs = ([a for a in name_cands if a not in source_attrs] or name_cands) if source_attrs else name_cands
    free_text = [a for a in attrs if a.kind == "string" and not a.link_like and a.role == _TEXT_ROLE and _own_class(a, prefix)
                 and id(a) not in label_ids and a not in name_cands]   # the block's text attributes no rung above owns
    footnote_taken = False

    def hidden(unit: _Unit) -> bool:
        """The unit's text sits in an ``aria-hidden="true"`` element (or inside one): decorative, not content."""
        node = unit.holder
        while node is not None and node is not root:
            if _attr(node, "aria-hidden") == "true":
                return True
            node = node.parent
        return False

    def has_control(node: _Node) -> bool:
        return any(d.name in _CONTROL_TAGS and not _text_of(d, src) for d in [node, *_descendants(node)])

    def control_row(unit: _Unit) -> bool:
        """The unit sits in a row that also holds the draft's own text-less controls (previous / next buttons)."""
        return unit.holder.parent is not None and any(
            s is not unit.holder and has_control(s) and not _text_of(s, src) for s in unit.holder.parent.elements)

    loose = [i for i, (u, t) in enumerate(units) if i not in used and not _is_star_run(t) and not control_row(u) and not hidden(u)]
    for i, (unit, text) in enumerate(units):
        if i in used:
            continue
        holder = unit.holder
        if _is_star_run(text):
            if star_drawn:
                head.skip(_quote("header star glyphs", text), "star glyphs: the block draws its own stars")
            else:
                head.unplaced(_quote("header star glyphs", text), "star glyphs the block has no star element for")
        elif hidden(unit):
            head.skip(_quote("header text", text), "decorative: the draft hides it from assistive technology (aria-hidden), "
                      "so it is not content the block should carry")
        elif control_row(unit):
            if (len(free_text) == 1 and unit.text_node is None and not footnote_taken and members
                    and holder.start >= members[-1].end):
                claim(holder, free_text[0])
                footnote_taken = True
                head.notes.append(f"'{text[:40]}' to '{free_text[0].name}' (the only text after the items that shares a row with "
                                  "the draft's own controls, and the only text attribute of the block left unassigned)")
            else:
                head.skip(_quote("header text", text), "it sits in the row of the draft's own scroll controls; the block draws "
                          "its own previous / next controls and has no field for a scroll hint")
        elif (identity_attrs and len(identity_attrs) == 1 and len(loose) == 1 and unit.text_node is None
              and not set(_words(text)) <= name_words):
            claim(holder, identity_attrs[0])
            head.notes.append(f"'{text}' to '{identity_attrs[0].name}' (the only unexplained header text, and not the block's own name)")
        elif (len(source_attrs) == 1 and unit.text_node is None and set(_words(text)) and set(_words(text)) <= name_words):
            claim(holder, source_attrs[0])
            head.notes.append(f"'{text}' to '{source_attrs[0].name}' (these are the block's own name words, so it names the "
                              "review source and not a business; the attribute is a caption text the slot vocabulary calls a label)")
        elif set(_words(text)) and set(_words(text)) <= name_words:
            head.skip(_quote("header text", text), "these are the block's own name words, so it is the review source label "
                      "and not a business name; the block draws its own source logo")
        else:
            head.unplaced(_quote("header text", text), "text inside the block's box with no field and no verdict; "
                          "the block would drop it")

    # 4. Media and controls: each element reported once, an empty control or a decorative image is furniture.
    def walk(node: _Node):
        for child in node.elements:
            if inside_item(child) or child.name in _OPAQUE - {"svg"}:
                continue
            if child.name in _MEDIA_TAGS or child.name in _CONTROL_TAGS:
                yield child
            if child.name not in _MEDIA_TAGS and child.name not in _CONTROL_TAGS:
                yield from walk(child)

    images: list[_Node] = []
    controls: list[_Node] = []
    for el in walk(root):
        name = f"header <{el.name}>"
        if el.name == "img":
            shown = (_attr(el, "src") or "").rsplit("/", 1)[-1]
            decorative = (_attr(el, "aria-hidden") == "true" or _attr(el, "alt") in (None, "") or _attr(el, "role") == "presentation")
            label = _quote("header image", shown)
            if decorative:
                images.append(el)
                head.skip(label, "a decorative image (aria-hidden or no alt text): not content; the block draws its own source logo")
            else:
                head.unplaced(label, "an image the block has no field for")
        elif el.name in _CONTROL_TAGS:
            if not _text_of(el, src):
                controls.append(el)
                head.skip(_quote("header button", _attr(el, "aria-label") or ""),
                          "the block draws its own previous / next arrows" if arrows_drawn
                          else "a control the block has no equivalent for")
        elif el.name == "svg":
            head.skip(name, "a graphic with no text: not lifted as content")
        else:
            head.unplaced(name, "an element the block has no field for")
    _classify_structure(head, src, root, members, rail, prefix, classes, name_words, edits, images, controls)
    return head


_HEADING_TAGS = frozenset({"h1", "h2", "h3", "h4", "h5", "h6"})
_OUTSIDE_WHY = ("sits outside the block root: the block's box does not contain it, so the block does not carry it and it is "
                "left to the converter as content beside the block")


def _beside_the_block(src: str, root: _Node, owner: _Node, members: list[_Node], block_name: str,
                      attrs: list[ScalarAttr], elements: frozenset[str], lookup) -> tuple[list[dict[str, str]], list[str]]:
    """``(skipped entries, labels)`` for the text and links that sit BESIDE the block's box, not inside it.

    Walking up from ``owner``, the first container that holds such a unit is the one the repeated items share with their
    header. Every unit of it outside ``owner`` is reported (``skipped``), so nothing that misses the block root vanishes
    silently, except the section's heading region: the text of a branch that contains an ``h1``-``h6`` (the heading with
    its eyebrow and lede), unless it is a link. The units the header ladder would MAP by shape (a rating beside a star
    bar, a count beside a noun the block names: numeric fields; the link and caption rungs pick by elimination and are
    only reported) are returned as ``labels`` in every case, heading region or not: they belong to the block and the
    block root cannot reach them, so the caller withholds the declaration."""
    def analyse(container: _Node):
        outside = _units(container, src, skip=(owner,))
        if not outside:
            return [], []
        mapped = {id(n) for n, a in _plan_header(src, container, members, block_name, attrs, elements, lookup,
                                                     _Edits(src)).claimed if a.kind == "number" and not _is_inside(n, owner)}
        skipped: list[dict[str, str]] = []
        labels: list[str] = []
        for unit in outside:
            chain = [unit.holder]
            while chain[-1] is not container and chain[-1].parent is not None:
                chain.append(chain[-1].parent)
            text = _unit_text(unit, src)
            branch = chain[-2] if len(chain) > 1 else chain[-1]
            in_link = any(n.name == "a" for n in chain)
            if any(id(n) in mapped for n in chain):
                labels.append(_quote("text", text))
            elif in_link or not any(n.name in _HEADING_TAGS for n in [branch, *_descendants(branch)]):
                skipped.append({"field": _quote("header link" if in_link else "header text", text), "reason": _OUTSIDE_WHY})
        return skipped, labels

    container = owner.parent
    while container is not None:
        if not _is_directive(container):
            skipped, labels = analyse(container)
            if skipped or labels or container is root:
                return skipped, labels
        container = container.parent
    return [], []


def _declared_roots(section_blocks: dict) -> set[str]:
    return {k for k, v in section_blocks.items() if isinstance(v, dict) and v.get("suggestedBlock")}


def _call(lookup, method: str, slug: str, default):
    """An optional lookup method's answer for ``slug``, or ``default`` when this lookup does not have the method."""
    fn = getattr(lookup, method, None)
    return fn(slug) if fn is not None else default


def _choose_owner(src: str, run: _Run, root: _Node, slug: str, lookup, block_class: str,
                  other_roots: set[str]) -> tuple[_Node, int, str]:
    """``(the element that carries the block's root class, levels climbed above the repeating parent, plain-English
    note)``. Falls back to the repeating parent (0 levels) when the lookup gives no box properties or no element
    between the parent and the section root paints one."""
    identity = _call(lookup, "identity_properties", slug, frozenset())
    if not identity:
        return run.parent, 0, ("no box properties are known for the block, so its root class stays on the element that "
                               "repeats the items")
    sheet = _unconditional_css(chr(10).join(_STYLE_TAG_RE.findall(src)))
    owner, levels, painted = _box_owner(run.parent, root, sheet, identity, other_roots,
                                        lambda node: _bem_conflict(node, block_class, lookup) is not None)
    if owner is None:
        return run.parent, 0, ("no element between the repeated items and the section root paints a border, radius, "
                               "shadow or background the block also has, so its root class stays on the element that "
                               "repeats the items")
    where = "the element that repeats the items" if levels == 0 else f"{levels} level(s) above the element that repeats the items"
    return owner, levels, (f"the block's root class went on {where}, the first to paint {', '.join(painted)} "
                           "(properties the block draws its own box with), so what sits beside the items in that box belongs to the block")


def _declaration(src: str, root_class: str, decl, groups, section_blocks: dict, lookup: BlockLookup, min_rank: int,
                 keep_unmapped_text: bool):
    """``(new source, row)`` for one ``sectionBlocks`` entry."""
    if not isinstance(decl, dict):
        return src, _row(root_class, None, None, "rejected", "the declaration is not an object", None)
    raw_block, conf = decl.get("suggestedBlock"), decl.get("confidence")
    if not isinstance(raw_block, str) or not raw_block.strip():
        return src, _row(root_class, raw_block, conf, "rejected",
                         "the manifest proposes no block for this section (suggestedBlock is empty)", None)
    slug = lookup.canonical_slug(raw_block.strip())
    if slug is None:
        return src, _row(root_class, raw_block, conf, "rejected",
                         f"'{raw_block}' is not a built block in the framework database", None)
    class_section = lookup.is_class_section(slug)
    target = "root" if class_section else "inner"
    rank = CONFIDENCE_RANK.get(conf if isinstance(conf, str) else "", 0)
    if rank < min_rank:
        note = "" if conf in CONFIDENCE_RANK else " (the confidence value is not recognised, so it counts as low)"
        floor = next(k for k, v in CONFIDENCE_RANK.items() if v == min_rank)
        return src, _row(root_class, slug, conf, "queued",
                         f"confidence '{conf}' is below the '{floor}' threshold{note}; left for an operator to confirm", target)

    def reject(reason: str):
        return src, _row(root_class, slug, conf, "rejected", reason, target)

    try:
        tree = _parse(src)
    except _ParseMismatch as exc:
        return reject(f"the draft's markup could not be located exactly ({exc}), so nothing was changed")
    carriers = [n for n in _walk(tree) if n.kind == "tag" and root_class in n.classes]
    top = [n for n in carriers if not any(_is_inside(n, o) for o in carriers if o is not n)]
    if not top:
        return reject(f"no element in the draft carries the class '{root_class}'")
    if len(top) > 1:
        return reject(f"more than one element carries the class '{root_class}' ({len(top)}); a declaration must name exactly one")
    root = top[0]
    block_name = slug.split("/", 1)[1]
    block_class = f"sgs-{block_name}"
    rows = _group_rows(groups, root_class)
    schemas = lookup.array_schemas(slug)
    if rows and schemas is None:
        return reject(f"a repeated group is declared for this section but {slug} has no arrayContentLift, "
                      "so its items cannot be lifted")
    if class_section:
        clash = _bem_conflict(root, block_class, lookup)
        if clash:
            return reject(f"the section root already carries '{clash}', the root class of a different block")
        other_roots = _declared_roots(section_blocks) - {root_class}
        if any(o in other_roots for anc in _ancestors(root) for o in anc.classes):
            return reject("a class-section block can only claim a section root, and this element sits inside "
                          "another declared section")
    edits = _Edits(src)
    if class_section:
        edits.add_class(root, block_class)
    if not rows:
        if not class_section:
            return reject("the block cannot claim a section root and the manifest declares no repeated group for "
                          "this section, so there is no inner element to annotate")
        if not edits.resolved():
            return src, _row(root_class, slug, conf, "applied",
                             f"the section root already carries '{block_class}'; nothing to change", "root")
        return _apply(src, edits.resolved()), _row(root_class, slug, conf, "applied",
                                                   f"'{block_class}' put first in the section root's classes; no repeated group is declared", "root")
    issue: str | None = None
    if len(rows) > 1:
        issue = (f"{len(rows)} repeated groups are declared for this section, so the block's items cannot be "
                 "attributed to one of them")
    elif len(schemas) != 1:
        issue = f"{slug} declares {len(schemas)} item schemas, so its items cannot be attributed to one of them"
    run: _Run | None = None
    count_note: str | None = None
    if issue is None:
        run, note = _choose_run(root, rows[0].get("count"))
        if run is None:
            issue = note
        else:
            count_note = note
    owner: _Node = root
    climbed, climb_note = 0, ""
    if not class_section:
        if run is None:
            return reject(issue or "no run of repeated items was found")
        if run.parent is root:
            return reject("the repeated items are direct children of the section root, and a block that cannot "
                          "claim a section root has no inner element to carry its class")
        owner, climbed, climb_note = _choose_owner(src, run, root, slug, lookup, block_class,
                                                   _declared_roots(section_blocks) - {root_class})
        target = "ancestor" if climbed else "inner"
        clash = _bem_conflict(owner, block_class, lookup)
        if clash:
            return reject(f"the element that carries the block's box already carries '{clash}', the root class of a different block")
        edits.add_class(owner, block_class)
    withheld = ("withheld so the converter cannot swallow the section's text: {why}. The section is left as "
                "the draft has it.")
    if run is None:
        if not keep_unmapped_text:
            return reject(withheld.format(why=issue))
        return (_apply(src, edits.resolved()) if edits.resolved() else src), _row(
            root_class, slug, conf, "partial", f"root class applied but the items were not annotated: {issue}", target)
    field_map = _field_map(rows[0].get("fieldMap"))
    _edits, fields, status, reason, lossy, skipped = _plan_items(src, run, block_name, schemas[0], lookup, field_map, edits)
    header = _plan_header(src, owner, run.members, block_name, _call(lookup, "scalar_attrs", slug, []),
                          _call(lookup, "element_names", slug, frozenset()), lookup, edits, rail=run.parent,
                          classes=_call(lookup, "derived_classes", slug, frozenset()))
    layout = _layout.plan_layout_choices(sys.modules[__name__], src, owner, run.members, run.parent, block_name,
                                         _call(lookup, "layout_attrs", slug, []), edits, lookup)
    header_why = (f"the block's own box holds {', '.join(header.unexplained)}, which no block field can carry"
                  if header.unexplained else None)
    beside, beside_fields = ([], [])
    if not class_section:
        beside, beside_fields = _beside_the_block(src, root, owner, run.members, block_name,
                                                  _call(lookup, "scalar_attrs", slug, []),
                                                  _call(lookup, "element_names", slug, frozenset()), lookup)
    if beside_fields:
        header_why = "; ".join(filter(None, [header_why, f"{', '.join(beside_fields)} belong(s) to the block's fields but "
                                                            "sit outside the block root, which cannot reach it"]))
    if (lossy or header_why) and not keep_unmapped_text:
        why = ([re.sub(r"^items annotated(?: and mapped[^;]*)?; ", "", reason)] if lossy else []) + ([header_why] if header_why else [])
        return reject(withheld.format(why="; ".join(why)))
    if header.notes:
        reason += "; header: mapped " + "; ".join(header.notes)
    if header_why:
        reason += f"; {header_why}"
        status = "partial"
    if not class_section:
        reason += f"; {climb_note}"
    for entry in [*header.skipped, *beside]:
        if entry not in skipped:
            skipped.append(entry)
    if count_note:
        status, reason = "partial", f"{count_note}; {reason}"
    resolved = edits.resolved()
    new_src = _apply(src, resolved) if resolved else src
    row = _row(root_class, slug, conf, status, reason, target, len(run.members), fields)
    if skipped:
        row["skipped_fields"] = skipped
    if header.fields:
        row["header_fields"] = header.fields
    if header.rungs:
        row["header_link_rungs"] = header.rungs
    if header.structure:
        row["header_structure"] = header.structure
    if layout:
        row["layout_choices"] = layout
    if not class_section:
        row["climbed"] = climbed
    return new_src, row


def annotate_from_manifest(html: str, block_lookup: BlockLookup, min_confidence: str = "medium",
                           keep_unmapped_text: bool = False) -> tuple[str, list[dict]]:
    """``(annotated html, report rows)``. The same string and ``[]`` when the draft has no usable manifest.

    One row per ``sectionBlocks`` entry, in manifest order. ``rejected`` and ``queued`` rows never change the HTML.

    ``keep_unmapped_text`` (default False): a declaration whose items hold text that cannot be assigned to the
    block's text fields with certainty is WITHHELD (``rejected``), because the converter then drops that text
    (measured, see ``_plan_items``). True applies the root/inner class anyway and reports ``partial``.
    """
    if min_confidence not in CONFIDENCE_RANK:
        raise ValueError(f"min_confidence must be one of {sorted(CONFIDENCE_RANK)}, not {min_confidence!r}")
    manifest = _read_manifest(html)
    section_blocks = (manifest or {}).get("sectionBlocks")
    if not isinstance(section_blocks, dict) or not section_blocks:
        return strip_field_markers(html), []
    groups = manifest.get("repeatedGroups")
    current = html
    rows: list[dict] = []
    for root_class, decl in section_blocks.items():
        current, row = _declaration(current, root_class, decl, groups, section_blocks, block_lookup,
                                    CONFIDENCE_RANK[min_confidence], keep_unmapped_text)
        rows.append(row)
    # The field markers are a private handshake with the JS content resolver: they served the mapping above and
    # must not reach the converter. Every declaration has run, so they all go, in every section.
    return strip_field_markers(current), rows
