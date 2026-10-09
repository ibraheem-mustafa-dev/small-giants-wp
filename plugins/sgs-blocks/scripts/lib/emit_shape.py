"""emit_shape -- how does a block carry one content attribute?

``classify_emit_shape(ctx, slug, attr, attr_type)`` returns ``(shape, proof)`` for ONE content-bearing
attribute. ``sgs-update-v2.py::_populate_emit_shape`` stores both in ``block_attributes.emit_shape`` and
``block_attributes.emit_shape_proof``. Source-only: it never reads or writes the DB itself (the slot rows
come in through ``EmitContext``).

SHAPES (a NULL emit_shape means "not a content attribute", the question does not apply)

* ``nested``          the block itself carries the attribute as an element: its own render, a helper it calls,
                      a template it owns, or its saved markup.
* ``repeater``        an array the block's own render reads, one item per element. The proof ends
                      ``:items=object|string|untyped`` (``items.type`` in block.json). Declared item fields are
                      in ``array_item_schema`` (join on block_slug + array_attr).
* ``child``           the content lives in a child block the block declares (inner-blocks template or
                      ``allowedBlocks``); the attribute only names that child's slot.
* ``parent-rendered`` another block's render reads it off this block (``$inner_block->attributes['x']``) and
                      that block is this block's declared parent.
* ``context``         the block hands it to its child blocks as block context (block.json ``providesContext``).
* ``script-rendered`` the block's front-end script prints it (the value is handed over in the markup).
* ``output-only``     a shared include reads it and emits it outside the block's own markup (canonical URL,
                      schema, head tags).
* ``editor-only``     block.json itself says it is editor-only ("never rendered").
* ``unresolved``      content-bearing, and NO test found anything that reads it. Reserved for attributes we
                      cannot identify, which in practice means a leftover or a control that is not wired.
                      ``editor-only`` as a proof means the editor writes it and nothing renders it.

ORDER (the first test that answers wins; the proof records which one)

1.  own render reads ``$attributes['x']`` (render.php plus statically required helpers, up to three hops)
    -> ``nested`` / ``render-read``; ``+child-candidate`` when the name is also a slot alias for a declared child.
2.  own render builds the key from a literal fragment plus a variable (``'media' . $suffix``)
    -> ``nested`` / ``render-key-family:<fragment>``.
3.  own render passes the name to a local closure (``$tier( 'desktopFramesUrl' )``)
    -> ``nested`` / ``closure-key``.
4.  own render calls a function defined under includes/ WITH ``$attributes`` as an argument, and that
    function's body reads ``$attributes['x']`` (or ``$attrs`` / ``$atts``)
    -> ``nested`` / ``helper-read:<function>`` (one call deep). A function called without the attributes,
    or one that reads some other array's ``['x']``, proves nothing.
5.  block.json ``providesContext`` maps a context key to the attribute -> ``context`` / ``provides-context:<key>``.
6.  the name is a slot name or alias whose standalone block is among the declared children
    -> ``child`` / ``template-alias:<block>``.
7.  another block's render reads it off an inner block AND is this block's declared parent (block.json
    ``parent`` / ``ancestor``) or lists this block among its declared children
    -> ``parent-rendered`` / ``parent-read:<block>``.
8.  named in render AND used by one of the block's front-end scripts -> ``script-rendered`` / ``view-js:<file>``.
9.  block.json's own description says editor-only / never rendered -> ``editor-only`` / ``declared-in-block-json``.
10. save.js uses it -> ``nested`` / ``save-read``.
11. the name is declared by exactly one block and an includes/ file reads ``$attrs['x']``: inside a folder named for
    the block -> ``nested`` / ``include-read:<file>``; elsewhere -> ``output-only`` / ``include-read:<file>``.
12. otherwise ``unresolved``: ``editor-only`` (edit.js uses it, nothing renders it) or ``no-reader-found``.

An array that would be ``nested`` is stored as ``repeater``. ``unresolved`` is never guessed into ``child``.
A block that passes ``$attributes`` wholesale into something this module cannot follow can still hide a read,
so ``no-reader-found`` is strong evidence, not proof.

Run ``python emit_shape.py --self-test`` for the fixtures (including negative controls).
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_emits as RE  # noqa: E402

_BLOCK_NAME_RE = re.compile(r"""['"]((?:sgs|core)/[a-z0-9-]+)['"]""")
_DECL_RE = re.compile(r"\b(template|allowedBlocks)\s*[:=][\s{]*(\[|[A-Za-z_]\w*)")
_PREFIX_RE = re.compile(r"""['"]([A-Za-z][A-Za-z0-9]{3,})['"]\s*\.\s*\$""")
_SUFFIX_RE = re.compile(r"""\$\w+(?:\[[^\]]*\])?\s*\.\s*['"]([A-Za-z][A-Za-z0-9]{3,})['"]""")
_FUNCTION_RE = re.compile(r"\bfunction\s+&?([A-Za-z_]\w*)\s*\(")
_CALL_ARGS_RE = re.compile(r"\b([A-Za-z_]\w*)\s*\(([^;]{0,240})")
_EDITOR_ONLY_RE = re.compile(r"editor[- ]only|never rendered", re.I)
_PHP_WORDS = frozenset(
    "if elseif foreach for while switch array isset empty function fn return echo print list match catch "
    "unset exit die include require include_once require_once and or".split()
)
_NOT_FRONTEND_JS = frozenset(
    {"edit.js", "index.js", "save.js", "canvas-preview.js", "preview-style.js", "deprecated.js"}
)


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""


def _read_json(path: Path) -> dict:
    try:
        data = json.loads(_read(path) or "{}")
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def _balanced(text: str, start: int, open_ch: str, close_ch: str) -> str:
    """The balanced literal beginning at ``text[start]``, skipping quoted strings."""
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
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
        i += 1
    return text[start:]


def _function_bodies(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in _FUNCTION_RE.finditer(text):
        brace = text.find("{", m.end())
        if brace != -1:
            out[m.group(1)] = _balanced(text, brace, "{", "}")
    return out


def _declared_children(block_dir: Path) -> frozenset[str]:
    """Block names listed in the block's inner-blocks ``template`` / ``allowedBlocks`` literals."""
    js_files = [p for p in sorted(block_dir.glob("*.js")) if p.name not in ("view.js", "save.js")]
    sources = [_read(p) for p in js_files]
    names: set[str] = set()
    for text in sources:
        for m in _DECL_RE.finditer(text):
            token = m.group(2)
            if token == "[":
                names.update(_BLOCK_NAME_RE.findall(_balanced(text, m.end() - 1, "[", "]")))
                continue
            definition = re.compile(r"\b(?:const|let|var)\s+" + re.escape(token) + r"\s*=\s*\[")
            for other in sources:
                d = definition.search(other)
                if d:
                    names.update(_BLOCK_NAME_RE.findall(_balanced(other, d.end() - 1, "[", "]")))
                    break
    return frozenset(names)


def _declared_parents(block_dir: Path) -> frozenset[str]:
    """``parent`` / ``ancestor`` from the block's own block.json (WordPress enforces both)."""
    data = _read_json(block_dir / "block.json")
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
        self._include_files: list[tuple[str, str]] | None = None
        self._functions: dict[str, list[str]] | None = None
        self._attr_blocks: dict[str, int] | None = None
        self._handed: dict[int, list[str]] = {}

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

    def include_files(self) -> list[tuple[str, str]]:
        """(posix path relative to includes/, text) for every PHP file under includes/."""
        if self._include_files is None:
            self._include_files = [
                (p.relative_to(RE._INCLUDES_DIR).as_posix(), _read(p))
                for p in sorted(RE._INCLUDES_DIR.rglob("*.php"))
            ]
        return self._include_files

    def functions(self) -> dict[str, list[str]]:
        """function name -> bodies, for every function defined under includes/."""
        if self._functions is None:
            out: dict[str, list[str]] = {}
            for _rel, text in self.include_files():
                for name, body in _function_bodies(text).items():
                    out.setdefault(name, []).append(body)
            self._functions = out
        return self._functions

    def handed_functions(self, src: str) -> list[str]:
        """Functions under includes/ that this render source calls with ``$attributes`` as an argument."""
        key = hash(src)
        if key not in self._handed:
            known = self.functions()
            handed = {
                m.group(1)
                for m in _CALL_ARGS_RE.finditer(src)
                if m.group(1) in known and m.group(1) not in _PHP_WORDS and "$attributes" in m.group(2)
            }
            self._handed[key] = sorted(handed)
        return self._handed[key]

    def attr_block_count(self, attr: str) -> int:
        """How many blocks declare an attribute of this name in their own block.json."""
        if self._attr_blocks is None:
            counts: dict[str, int] = {}
            for bj in sorted(RE._BLOCKS_DIR.glob("*/block.json")):
                for name in _read_json(bj).get("attributes", {}):
                    counts[name] = counts.get(name, 0) + 1
            self._attr_blocks = counts
        return self._attr_blocks.get(attr, 0)


def _quoted(attr: str) -> re.Pattern[str]:
    return re.compile("['\"]" + re.escape(attr) + "['\"]")


def _php_read(attr: str) -> re.Pattern[str]:
    """``$attributes['x']`` (or ``$attrs`` / ``$atts``): a read off an attributes array, never any other array."""
    return re.compile(
        r"\$(?:attributes|attrs|atts|block_attributes)\s*\[\s*['\"]" + re.escape(attr) + r"['\"]\s*\]"
    )


def _js_use(attr: str) -> re.Pattern[str]:
    return re.compile(r"attributes\." + re.escape(attr) + r"\b|[{,]\s*" + re.escape(attr) + r"\s*[,}:]")


def _js_prop(attr: str) -> re.Pattern[str]:
    return re.compile(r"\." + re.escape(attr) + r"\b|['\"]" + re.escape(attr) + r"['\"]|[{,]\s*" + re.escape(attr) + r"\s*[,}:]")


def _items_type(block_dir: Path, attr: str) -> str:
    items = _read_json(block_dir / "block.json").get("attributes", {}).get(attr, {}).get("items")
    return str(items.get("type")) if isinstance(items, dict) and items.get("type") else "untyped"


Verdict = tuple[str, str] | None


def _family_key(src: str, attr: str) -> Verdict:
    for frag in sorted(set(_PREFIX_RE.findall(src))):
        if attr.startswith(frag):
            return "nested", f"render-key-family:{frag}"
    for frag in sorted(set(_SUFFIX_RE.findall(src))):
        if attr.endswith(frag) and attr != frag:
            return "nested", f"render-key-family:{frag}"
    return None


def _closure_key(src: str, attr: str) -> Verdict:
    if re.search(r"\$\w+\s*\(\s*['\"]" + re.escape(attr) + r"['\"]", src):
        return "nested", "closure-key"
    return None


def _helper_read(ctx: EmitContext, slug: str, attr: str) -> Verdict:
    """Only the block's OWN files count as the caller (render.php plus the helpers it requires directly)."""
    read = _php_read(attr)
    known = ctx.functions()
    for name in ctx.handed_functions(RE._own_source(slug)):
        if any(read.search(body) for body in known.get(name, [])):
            return "nested", f"helper-read:{name}"
    return None


def _provided_context(block_dir: Path, attr: str) -> Verdict:
    for key, value in sorted((_read_json(block_dir / "block.json").get("providesContext") or {}).items()):
        if value == attr:
            return "context", f"provides-context:{key}"
    return None


def _script_rendered(block_dir: Path, src: str, attr: str) -> Verdict:
    if not _quoted(attr).search(src):
        return None
    use = _js_prop(attr)
    for js in sorted(block_dir.glob("*.js")):
        if js.name not in _NOT_FRONTEND_JS and use.search(_read(js)):
            return "script-rendered", f"view-js:{js.name}"
    return None


def _declared_editor_only(block_dir: Path, attr: str) -> Verdict:
    schema = _read_json(block_dir / "block.json").get("attributes", {}).get(attr, {})
    if _EDITOR_ONLY_RE.search(str(schema.get("description", ""))):
        return "editor-only", "declared-in-block-json"
    return None


def _include_read(ctx: EmitContext, short: str, attr: str) -> Verdict:
    if ctx.attr_block_count(attr) != 1:
        return None
    read = _php_read(attr)
    for rel, text in ctx.include_files():
        if read.search(text):
            return ("nested" if f"/{short}/" in f"/{rel}" else "output-only"), f"include-read:{rel}"
    return None


def classify_emit_shape(ctx: EmitContext, slug: str, attr: str, attr_type: str | None = None) -> tuple[str, str]:
    """``attr_type`` is the attribute's declared type; pass it so arrays become ``repeater``."""
    shape, proof = _classify(ctx, slug, attr)
    if shape == "nested" and attr_type == "array":
        return "repeater", f"{proof}:items={_items_type(RE._BLOCKS_DIR / RE._short(slug), attr)}"
    return shape, proof


def _classify(ctx: EmitContext, slug: str, attr: str) -> tuple[str, str]:
    short = RE._short(slug)
    block_dir = RE._BLOCKS_DIR / short
    child_hit = sorted(ctx.slot_blocks.get(attr.lower(), set()) & ctx.children(slug))

    if RE.render_reads_attr(slug, attr):
        return "nested", "render-read" + ("+child-candidate" if child_hit else "")

    src = RE._render_reach_source(slug)
    verdict = (
        _family_key(src, attr)
        or _closure_key(src, attr)
        or _helper_read(ctx, slug, attr)
        or _provided_context(block_dir, attr)
    )
    if verdict:
        return verdict
    if child_hit:
        return "child", f"template-alias:{child_hit[0]}"

    parents = _declared_parents(block_dir)
    related = sorted(
        r for r in ctx.parent_reads().get(attr, {})
        if r != short and (f"sgs/{r}" in parents or slug in ctx.children(f"sgs/{r}"))
    )
    if related:
        return "parent-rendered", f"parent-read:{related[0]}"

    verdict = _script_rendered(block_dir, src, attr) or _declared_editor_only(block_dir, attr)
    if verdict:
        return verdict
    if _js_use(attr).search(_read(block_dir / "save.js")):
        return "nested", "save-read"
    verdict = _include_read(ctx, short, attr)
    if verdict:
        return verdict
    if _js_use(attr).search(_read(block_dir / "edit.js")):
        return "unresolved", "editor-only"
    return "unresolved", "no-reader-found"


# --------------------------------------------------------------------------- self-test


def _write(root: Path, rel: str, text: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def _fixtures(root: Path) -> None:
    demo = "src/blocks/demo/"
    _write(root, demo + "render.php",
           "<?php\n$t = $attributes['title'];\n$u = $attributes[ 'media' . $suffix ];\n"
           "$g = $attributes['gatedText'];\n$r = $attributes['rows'];\n$k = $attributes['tags'];\n"
           "$tier = function ( $k ) { return $attributes[ $k ]; };\n$f = $tier( 'framesUrl' );\n"
           "echo field_input_attrs( $id, $attributes );\n$labels = array( 'errorText' => 'x' );\n"
           "echo brand_registry();\necho helper_two( $other );\n")
    _write(root, demo + "block.json", json.dumps({
        "name": "sgs/demo",
        "providesContext": {"sgs/demoHidden": "hiddenLinks"},
        "attributes": {
            "rows": {"type": "array", "items": {"type": "object"}},
            "tags": {"type": "array", "items": {"type": "string"}},
            "gatedText": {"type": "string"}, "unusedList": {"type": "array"},
            "listName": {"type": "string", "description": "Editor-only name shown in the list view. Never rendered."},
            "label": {"type": "string"}, "indexUrl": {"type": "string"}, "savedText": {"type": "string"}}}))
    _write(root, demo + "edit.js",
           "const DEMO_TEMPLATE = [ [ 'sgs/heading', {} ], [ 'sgs/button', {} ] ];\n"
           "useInnerBlocksProps( {}, { template: DEMO_TEMPLATE } );\nconst { noteText } = attributes;\n")
    _write(root, demo + "save.js", "export default ( { attributes } ) => attributes.savedText;\n")
    _write(root, demo + "labels.js", "export const text = ( d ) => d.errorText;\n")
    _write(root, "src/blocks/bare/render.php", "<?php\n// no reads\n")
    _write(root, "src/blocks/bare/block.json", json.dumps({"name": "sgs/bare", "attributes": {"label": {"type": "string"}}}))
    _write(root, "src/blocks/bare/edit.js", "useInnerBlocksProps( {}, {} );\n")
    _write(root, "src/blocks/tabs/render.php", "<?php\n$l = $inner_block->attributes['label'];\n")
    _write(root, "src/blocks/tab/render.php", "<?php\n// tab prints only its children\n")
    _write(root, "src/blocks/tab/block.json", json.dumps({"name": "sgs/tab", "parent": ["sgs/tabs"]}))
    # A decoy: an UNRELATED block that also reads a `label` off some inner block.
    _write(root, "src/blocks/form/render.php", "<?php\n$l = $field->attributes['label'];\n")
    _write(root, "src/blocks/account/render.php", "<?php\n// template does the printing\n")
    _write(root, "src/blocks/account/block.json", json.dumps({"name": "sgs/account", "attributes": {"noOrdersText": {"type": "string"}}}))
    _write(root, "includes/forms/helpers.php",
           "<?php\nfunction field_input_attrs( $id, array $attributes ) {\n\t$p = $attributes['placeholder'] ?? '';\n}\n")
    _write(root, "includes/brand.php",
           "<?php\nfunction brand_registry() {\n\treturn $entry['wibble'];\n}\n"
           "function helper_two( $x ) {\n\treturn $attributes['wobble'];\n}\n")
    _write(root, "includes/account/dash.php", "<?php\necho $attrs['noOrdersText'];\n")
    _write(root, "includes/canonical.php", "<?php\n$v = $attrs['indexUrl'];\n$l = $attrs['label'];\n")


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
    demo, bare, tab = "sgs/demo", "sgs/bare", "sgs/tab"
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        RE._PLUGIN_DIR, RE._BLOCKS_DIR, RE._INCLUDES_DIR = root, root / "src/blocks", root / "includes"
        _fixtures(root)
        reset()
        ctx = EmitContext(slots)
        c = lambda a, t=None, s=demo: classify_emit_shape(ctx, s, a, t)  # noqa: E731
        print("emit_shape --self-test")
        check("direct read", c("gatedText"), "nested", "render-read")
        check("direct read that is also a child slot alias", c("title"), "nested", "render-read+child-candidate")
        check("literal fragment + variable key", c("mediaTablet"), "nested", "render-key-family:media")
        check("whole name + variable key", c("media"), "nested", "render-key-family:media")
        check("name passed to a local closure", c("framesUrl"), "nested", "closure-key")
        check("read inside a function the render calls", c("placeholder"), "nested", "helper-read:field_input_attrs")
        check("array, items are objects", c("rows", "array"), "repeater", "render-read:items=object")
        check("array, items are strings", c("tags", "array"), "repeater", "render-read:items=string")
        check("provided to child blocks as context", c("hiddenLinks", "array"), "context", "provides-context:sgs/demoHidden")
        check("declared child, never read", c("headline"), "child", "template-alias:sgs/heading")
        check("parent reads it off an inner block", c("label", None, tab), "parent-rendered", "parent-read:tabs")
        check("printed by the block's front-end script", c("errorText"), "script-rendered", "view-js:labels.js")
        check("block.json says editor-only", c("listName"), "editor-only", "declared-in-block-json")
        check("saved markup carries it", c("savedText"), "nested", "save-read")
        check("unique name read by the block's own include folder", c("noOrdersText", None, "sgs/account"),
              "nested", "include-read:account/dash.php")
        check("unique name read by an unrelated include", c("indexUrl"), "output-only", "include-read:canonical.php")
        check("editor writes it, nothing renders it", c("noteText"), "unresolved", "editor-only")
        check("nothing mentions it", c("ghostText"), "unresolved", "no-reader-found")
        # NEGATIVE CONTROLS: each removes the one fact the verdict rests on and the verdict must change.
        check("NEG: same read, attribute is not an array", c("rows", "string"), "nested", "render-read")
        check("NEG: array nobody reads", c("unusedList", "array"), "unresolved", "no-reader-found")
        check("NEG: alias, but the block declares no children", c("headline", None, bare), "unresolved", "no-reader-found")
        check("NEG: shared name is not unique, so an include read proves nothing", c("label", None, bare),
              "unresolved", "no-reader-found")
        check("NEG: called function reads some other array's key", c("wibble"), "unresolved", "no-reader-found")
        check("NEG: called function reads $attributes but was not handed them", c("wobble"),
              "unresolved", "no-reader-found")
        check("NEG: block never calls the helper", c("placeholder", None, bare), "unresolved", "no-reader-found")
        check("NEG: no context provided for this name", c("shape", "array"), "unresolved", "no-reader-found")
        _write(root, "src/blocks/tabs/render.php", "<?php\n// reader removed\n")
        check("NEG: declared parent stops reading it (the unrelated block still does)",
              classify_emit_shape(EmitContext(slots), tab, "label"), "unresolved", "no-reader-found")
        (root / "src/blocks/demo/labels.js").unlink()
        check("NEG: no front-end script uses it", classify_emit_shape(EmitContext(slots), demo, "errorText"),
              "unresolved", "no-reader-found")
        _write(root, "src/blocks/demo/render.php", "<?php\n// reads removed\n")
        reset()
        check("NEG: render no longer reads it", classify_emit_shape(EmitContext(slots), demo, "gatedText"),
              "unresolved", "no-reader-found")
    RE._PLUGIN_DIR, RE._BLOCKS_DIR, RE._INCLUDES_DIR = saved
    reset()
    print("-" * 74)
    print("SELF-TEST PASSED" if not failures else f"SELF-TEST FAILED ({failures})")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else 0)
