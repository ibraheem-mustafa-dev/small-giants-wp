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
  block's root class goes on the INNER element that repeats (the parent of the repeated items, the "rail").
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
import json
import re
import sqlite3
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Protocol

CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}

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


class BlockLookup(Protocol):
    """What the annotator needs to know about blocks. Tests inject a fake; ``DbBlockLookup`` is the real one."""

    def canonical_slug(self, name: str) -> str | None:
        """``'trust-bar'`` or ``'sgs/trust-bar'`` -> ``'sgs/trust-bar'`` when it is a built block, else None."""

    def is_class_section(self, slug: str) -> bool:
        """True when the block may claim a section root from a class (``blocks.tier = 'class-section'``)."""

    def array_schemas(self, slug: str) -> list[ArraySchema] | None:
        """None when the block has no ``arrayContentLift``; else its item schemas (usually exactly one)."""

    # Optional (the annotator asks with ``getattr``, so a lookup without it simply has no synonym rung):
    #   def slots_of(self, term: str) -> frozenset[str]:
    #       """Every element slot that has ``term`` as its name or one of its aliases (empty when none)."""


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


def _units(item: _Node, src: str) -> list[_Unit]:
    """The text an item shows: a text-only element is one unit, a loose text node beside other elements is one."""
    out: list[_Unit] = []

    def visit(el: _Node) -> None:
        has_elements = any(c.name not in _OPAQUE or c.name == "svg" for c in el.elements)
        for child in el.children:
            if child.kind == "text" and src[child.start:child.end].strip():
                if has_elements:
                    out.append(_Unit(el, child))
                elif not any(u.holder is el for u in out):
                    out.append(_Unit(el, None))
            elif child.kind == "tag" and child.name not in _OPAQUE:
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
                e = _class_edit(src, t.unit.holder, [prefix + _kebab(key)])
                if e:
                    edits.append(e)
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
    lossy = _classify_unmarked(per_item, free, skipped) or lossy
    unique: list[dict[str, str]] = []
    for entry in skipped:
        if entry not in unique:
            unique.append(entry)
    mapped = ", ".join(f"'{owner}' to '{key}'" for key, owner in claimed.items())
    reason = f"items annotated and mapped by the draft's field names ({mapped or 'nothing could be mapped'})"
    if unique:
        reason += "; skipped: " + "; ".join(f"'{s['field']}' ({s['reason']})" for s in unique)
    if lossy:
        reason += "; text the block has a field for could not be placed with certainty, so assigning it would be a guess"
    reason += f"; {_NON_TEXT_NOTE}"
    return edits, [k for k in text_keys if k in done], ("partial" if lossy else "applied"), reason, lossy, unique


def _plan_items(src, run: _Run, block_name: str, schema: ArraySchema, lookup=None, field_map: dict | None = None):
    """Edits and report facts for one run: ``(edits, fields annotated, status, reason, lossy, skipped fields)``.

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
    edits: list[Edit] = []
    for member in run.members:
        e = _class_edit(src, member, [prefix + item_token])
        if e:
            edits.append(e)
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
                e = _class_edit(src, unit.holder, [cls])
                if e:
                    edits.append(e)
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


def _declared_roots(section_blocks: dict) -> set[str]:
    return {k for k, v in section_blocks.items() if isinstance(v, dict) and v.get("suggestedBlock")}


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
    edits: list[Edit] = []
    if class_section:
        edit = _class_edit(src, root, [block_class])
        if edit:
            edits.append(edit)
    if not rows:
        if not class_section:
            return reject("the block cannot claim a section root and the manifest declares no repeated group for "
                          "this section, so there is no inner element to annotate")
        if not edits:
            return src, _row(root_class, slug, conf, "applied",
                             f"the section root already carries '{block_class}'; nothing to change", "root")
        return _apply(src, edits), _row(root_class, slug, conf, "applied",
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
    if not class_section:
        if run is None:
            return reject(issue or "no run of repeated items was found")
        if run.parent is root:
            return reject("the repeated items are direct children of the section root, and a block that cannot "
                          "claim a section root has no inner element to carry its class")
        clash = _bem_conflict(run.parent, block_class, lookup)
        if clash:
            return reject(f"the element that repeats the items already carries '{clash}', the root class of a different block")
        edit = _class_edit(src, run.parent, [block_class])
        if edit:
            edits.append(edit)
    withheld = ("withheld so the converter cannot swallow the section's text: {why}. The section is left as "
                "the draft has it.")
    if run is None:
        if not keep_unmapped_text:
            return reject(withheld.format(why=issue))
        return (_apply(src, edits) if edits else src), _row(
            root_class, slug, conf, "partial", f"root class applied but the items were not annotated: {issue}", target)
    field_map = _field_map(rows[0].get("fieldMap"))
    item_edits, fields, status, reason, lossy, skipped = _plan_items(src, run, block_name, schemas[0], lookup, field_map)
    if lossy and not keep_unmapped_text:
        return reject(withheld.format(why=re.sub(r"^items annotated(?: and mapped[^;]*)?; ", "", reason)))
    edits.extend(item_edits)
    if count_note:
        status, reason = "partial", f"{count_note}; {reason}"
    new_src = _apply(src, edits) if edits else src
    row = _row(root_class, slug, conf, status, reason, target, len(run.members), fields)
    if skipped:
        row["skipped_fields"] = skipped
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
