"""emit_shape -- how does a block carry one content attribute: its own element, or a child block?

``classify_emit_shape(ctx, slug, attr)`` returns ``(shape, proof)`` for ONE content-bearing attribute.
``sgs-update-v2.py::_populate_emit_shape`` stores both in ``block_attributes.emit_shape`` and
``block_attributes.emit_shape_proof``. Source-only: it never reads or writes the DB itself (the slot rows
come in through ``EmitContext``).

SHAPES (a NULL emit_shape means "not a content attribute", the question does not apply)

* ``nested``          the block's own render emits the attribute as an element of its own.
* ``repeater``        an array attribute the block's own render reads: one item per element it prints. The proof
                      ends ``:items=object|string|untyped`` (the ``items.type`` in block.json). Where the block has
                      declared item fields they are in ``array_item_schema`` (join on block_slug + array_attr).
* ``child``           the content lives in a child block the block declares (its inner-blocks template or
                      ``allowedBlocks``); the attribute is only a name for that child's slot.
* ``parent-rendered`` another block's render reads it off this block (``$inner_block->attributes['x']``), the
                      way a tabs block builds its tab strip from each tab's label.
* ``unresolved``      content-bearing, but no proof either way. The proof column says why.

ORDER (the first step that gives an answer wins; the proof records which step it was)

1. own render reads ``$attributes['x']`` (render.php plus statically required helpers, up to three hops)
   -> ``nested`` / ``render-read``. If the attribute's name is also a slot alias for a block this block
   declares as a child, the proof is ``render-read+child-candidate``: both readings are true, so an agent
   must not assume the attribute is the whole story.
2. own render builds the key from a literal fragment plus a variable (``'media' . $suffix``): the
   attribute starts with the fragment (or is the whole fragment, as in ``'imageUrl' . $suffix``), or ends
   with a ``$var . 'Fragment'`` -> ``nested`` / ``render-key-family:<fragment>`` (weaker than a direct
   read, so the proof says so).
3. the attribute's name is a slot name or alias whose standalone block is among the block's declared
   children -> ``child`` / ``template-alias:<block>``.
4. another block's render reads it off an inner block AND that block is this block's declared parent
   (block.json ``parent`` / ``ancestor``) or lists this block among its declared children
   -> ``parent-rendered`` / ``parent-read:<block>``. An unrelated block reading a same-named attribute
   proves nothing.
   An array attribute that would otherwise be ``nested`` is stored as ``repeater`` instead (same proof).
5. otherwise ``unresolved`` with one of: ``quoted-key-in-render`` (named in render.php but not a plain
   read), ``shared-include-only``, ``editor-only``, ``save-only``, ``no-reader-found``. ``no-reader-found``
   is the signal for a leftover attribute: nothing in the block's render, editor, save or the shared
   includes mentions it by key.

``unresolved`` is never guessed into ``child``. A block that passes ``$attributes`` wholesale into a helper can
hide a read, so ``no-reader-found`` is strong evidence, not a proof of deadness.

Run ``python emit_shape.py --self-test`` for the fixtures (including negative controls).
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_emits as RE  # noqa: E402

_BLOCK_NAME_RE = re.compile(r"""['"]((?:sgs|core)/[a-z0-9-]+)['"]""")
_DECL_RE = re.compile(r"\b(template|allowedBlocks)\s*[:=][\s{]*(\[|[A-Za-z_]\w*)")
_PREFIX_RE = re.compile(r"""['"]([A-Za-z][A-Za-z0-9]{3,})['"]\s*\.\s*\$""")
_SUFFIX_RE = re.compile(r"""\$\w+(?:\[[^\]]*\])?\s*\.\s*['"]([A-Za-z][A-Za-z0-9]{3,})['"]""")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""


def _bracket_literal(text: str, start: int) -> str:
    """The balanced ``[...]`` literal beginning at ``text[start]``, skipping quoted strings."""
    depth = 0
    quote = ""
    i = start
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 1
            elif ch == quote:
                quote = ""
        elif ch in "'\"`":
            quote = ch
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
        i += 1
    return text[start:]


def _declared_children(block_dir: Path) -> frozenset[str]:
    """Block names listed in the block's inner-blocks ``template`` / ``allowedBlocks`` literals."""
    js_files = [p for p in sorted(block_dir.glob("*.js")) if p.name not in ("view.js", "save.js")]
    sources = [_read(p) for p in js_files]
    names: set[str] = set()
    for text in sources:
        for m in _DECL_RE.finditer(text):
            token = m.group(2)
            if token == "[":
                names.update(_BLOCK_NAME_RE.findall(_bracket_literal(text, m.end() - 1)))
                continue
            definition = re.compile(r"\b(?:const|let|var)\s+" + re.escape(token) + r"\s*=\s*\[")
            for other in sources:
                d = definition.search(other)
                if d:
                    names.update(_BLOCK_NAME_RE.findall(_bracket_literal(other, d.end() - 1)))
                    break
    return frozenset(names)


def _declared_parents(block_dir: Path) -> frozenset[str]:
    """``parent`` / ``ancestor`` from the block's own block.json (WordPress enforces both)."""
    try:
        data = json.loads(_read(block_dir / "block.json") or "{}")
    except ValueError:
        return frozenset()
    return frozenset(str(x) for key in ("parent", "ancestor") for x in (data.get(key) or []))


class EmitContext:
    """Everything the classifier needs, built once per run."""

    def __init__(self, slot_rows: list[tuple[str, str | None, str | None]]):
        # slot_rows: (slot_name, aliases JSON text or None, standalone_block or None)
        self.slot_blocks: dict[str, set[str]] = {}
        for slot_name, aliases, standalone in slot_rows:
            if not standalone:
                continue
            names = [slot_name]
            try:
                names += list(json.loads(aliases)) if aliases else []
            except (TypeError, ValueError):
                pass
            for n in names:
                self.slot_blocks.setdefault(str(n).lower(), set()).add(standalone)
        self._children: dict[str, frozenset[str]] = {}
        self._parent_reads: dict[str, dict[str, set[str]]] | None = None
        self._includes: str | None = None

    def children(self, slug: str) -> frozenset[str]:
        short = RE._short(slug)
        if short not in self._children:
            self._children[short] = _declared_children(RE._BLOCKS_DIR / short)
        return self._children[short]

    def parent_reads(self) -> dict[str, dict[str, set[str]]]:
        """attr -> {reader block short name} for ``->attributes['attr']`` on an inner block."""
        if self._parent_reads is None:
            out: dict[str, dict[str, set[str]]] = {}
            for render in sorted(RE._BLOCKS_DIR.glob("*/render.php")):
                reader = render.parent.name
                for a in re.findall(r"""->attributes\s*\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]""", _read(render)):
                    out.setdefault(a, {}).setdefault(reader, set())
            self._parent_reads = out
        return self._parent_reads

    def includes_text(self) -> str:
        if self._includes is None:
            self._includes = "\n".join(_read(p) for p in sorted(RE._INCLUDES_DIR.rglob("*.php")))
        return self._includes


def _quoted(attr: str) -> re.Pattern[str]:
    return re.compile("['\"]" + re.escape(attr) + "['\"]")


def _js_use(attr: str) -> re.Pattern[str]:
    return re.compile(r"attributes\." + re.escape(attr) + r"\b|[{,]\s*" + re.escape(attr) + r"\s*[,}:]")


def _items_type(block_dir: Path, attr: str) -> str:
    try:
        schema = json.loads(_read(block_dir / "block.json") or "{}").get("attributes", {}).get(attr, {})
    except ValueError:
        return "untyped"
    items = schema.get("items")
    return str(items.get("type")) if isinstance(items, dict) and items.get("type") else "untyped"


def classify_emit_shape(ctx: EmitContext, slug: str, attr: str, attr_type: str | None = None) -> tuple[str, str]:
    """``attr_type`` is the attribute's declared type; pass it so arrays become ``repeater``."""
    shape, proof = _classify(ctx, slug, attr)
    if shape == "nested" and attr_type == "array":
        return "repeater", f"{proof}:items={_items_type(RE._BLOCKS_DIR / RE._short(slug), attr)}"
    return shape, proof


def _classify(ctx: EmitContext, slug: str, attr: str) -> tuple[str, str]:
    short = RE._short(slug)
    block_dir = RE._BLOCKS_DIR / short
    children = ctx.children(slug)
    child_hit = sorted(ctx.slot_blocks.get(attr.lower(), set()) & children)

    if RE.render_reads_attr(slug, attr):
        return "nested", "render-read" + ("+child-candidate" if child_hit else "")

    src = RE._render_reach_source(slug)
    for frag in sorted(set(_PREFIX_RE.findall(src))):
        if attr.startswith(frag):
            return "nested", f"render-key-family:{frag}"
    for frag in sorted(set(_SUFFIX_RE.findall(src))):
        if attr.endswith(frag) and attr != frag:
            return "nested", f"render-key-family:{frag}"

    if child_hit:
        return "child", f"template-alias:{child_hit[0]}"

    parents = _declared_parents(block_dir)
    related = sorted(
        r for r in ctx.parent_reads().get(attr, {})
        if r != short and (f"sgs/{r}" in parents or slug in ctx.children(f"sgs/{r}"))
    )
    if related:
        return "parent-rendered", f"parent-read:{related[0]}"

    q = _quoted(attr)
    if q.search(src):
        return "unresolved", "quoted-key-in-render"
    if q.search(ctx.includes_text()):
        return "unresolved", "shared-include-only"
    use = _js_use(attr)
    if use.search(_read(block_dir / "edit.js")):
        return "unresolved", "editor-only"
    if use.search(_read(block_dir / "save.js")):
        return "unresolved", "save-only"
    return "unresolved", "no-reader-found"


# --------------------------------------------------------------------------- self-test


def _write(root: Path, rel: str, text: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def self_test() -> int:
    saved = (RE._PLUGIN_DIR, RE._BLOCKS_DIR, RE._INCLUDES_DIR)
    failures = 0

    def check(label: str, got: tuple[str, str], want_shape: str, want_proof_prefix: str) -> None:
        nonlocal failures
        ok = got[0] == want_shape and got[1].startswith(want_proof_prefix)
        failures += 0 if ok else 1
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}: {got} (expected {want_shape} / {want_proof_prefix}*)")

    def reset() -> None:
        RE._render_reach_source.cache_clear()
        RE._own_source.cache_clear()
        RE.render_reads_attr.cache_clear()

    slots = [("heading", json.dumps(["headline", "title"]), "sgs/heading"), ("button", "[]", "sgs/button")]
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        RE._PLUGIN_DIR, RE._BLOCKS_DIR, RE._INCLUDES_DIR = root, root / "src/blocks", root / "includes"
        (root / "includes").mkdir(parents=True, exist_ok=True)
        _write(root, "src/blocks/demo/render.php",
               "<?php\n$t = $attributes['title'];\n$u = $attributes[ 'media' . $suffix ];\n"
               "$g = $attributes['gatedText'];\n$r = $attributes['rows'];\n$k = $attributes['tags'];\n")
        _write(root, "src/blocks/demo/block.json", json.dumps({"name": "sgs/demo", "attributes": {
            "rows": {"type": "array", "items": {"type": "object"}},
            "tags": {"type": "array", "items": {"type": "string"}},
            "gatedText": {"type": "string"},
            "unusedList": {"type": "array"}}}))
        _write(root, "src/blocks/demo/edit.js",
               "const DEMO_TEMPLATE = [ [ 'sgs/heading', {} ], [ 'sgs/button', {} ] ];\n"
               "useInnerBlocksProps( {}, { template: DEMO_TEMPLATE } );\n"
               "const { noteText } = attributes;\n")
        _write(root, "src/blocks/bare/render.php", "<?php\n// no reads\n")
        _write(root, "src/blocks/bare/edit.js", "useInnerBlocksProps( {}, {} );\n")
        _write(root, "src/blocks/tabs/render.php", "<?php\n$l = $inner_block->attributes['label'];\n")
        _write(root, "src/blocks/tab/render.php", "<?php\n// tab prints only its children\n")
        _write(root, "src/blocks/tab/block.json", json.dumps({"name": "sgs/tab", "parent": ["sgs/tabs"]}))
        # A decoy: an UNRELATED block that also reads a `label` off some inner block.
        _write(root, "src/blocks/form/render.php", "<?php\n$l = $field->attributes['label'];\n")
        reset()
        ctx = EmitContext(slots)
        print("emit_shape --self-test")
        check("direct read", classify_emit_shape(ctx, "sgs/demo", "gatedText"), "nested", "render-read")
        check("direct read that is also a child slot alias", classify_emit_shape(ctx, "sgs/demo", "title"),
              "nested", "render-read+child-candidate")
        check("literal fragment + variable key", classify_emit_shape(ctx, "sgs/demo", "mediaTablet"),
              "nested", "render-key-family:media")
        check("whole name + variable key", classify_emit_shape(ctx, "sgs/demo", "media"),
              "nested", "render-key-family:media")
        check("array the render reads, items are objects",
              classify_emit_shape(ctx, "sgs/demo", "rows", "array"), "repeater", "render-read:items=object")
        check("array the render reads, items are strings",
              classify_emit_shape(ctx, "sgs/demo", "tags", "array"), "repeater", "render-read:items=string")
        check("NEG: same read, attribute is not an array",
              classify_emit_shape(ctx, "sgs/demo", "rows", "string"), "nested", "render-read")
        check("NEG: array nobody reads stays unresolved",
              classify_emit_shape(ctx, "sgs/demo", "unusedList", "array"), "unresolved", "no-reader-found")
        check("declared child, never read", classify_emit_shape(ctx, "sgs/demo", "headline"), "child", "template-alias:sgs/heading")
        check("parent reads it off an inner block", classify_emit_shape(ctx, "sgs/tab", "label"),
              "parent-rendered", "parent-read:tabs")
        check("editor only", classify_emit_shape(ctx, "sgs/demo", "noteText"), "unresolved", "editor-only")
        check("nothing mentions it", classify_emit_shape(ctx, "sgs/demo", "ghostText"), "unresolved", "no-reader-found")
        # NEGATIVE CONTROLS: each removes the one fact the verdict rests on and the verdict must change.
        check("NEG: same alias, block declares no children", classify_emit_shape(ctx, "sgs/bare", "headline"),
              "unresolved", "no-reader-found")
        _write(root, "src/blocks/tabs/render.php", "<?php\n// reader removed\n")
        ctx2 = EmitContext(slots)
        check("NEG: declared parent stops reading it (the unrelated block still does)",
              classify_emit_shape(ctx2, "sgs/tab", "label"), "unresolved", "no-reader-found")
        _write(root, "src/blocks/demo/render.php", "<?php\n// read removed\n")
        reset()
        check("NEG: render no longer reads it", classify_emit_shape(EmitContext(slots), "sgs/demo", "gatedText"),
              "unresolved", "no-reader-found")
    RE._PLUGIN_DIR, RE._BLOCKS_DIR, RE._INCLUDES_DIR = saved
    reset()
    print("-" * 74)
    print("SELF-TEST PASSED" if not failures else f"SELF-TEST FAILED ({failures})")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else 0)
