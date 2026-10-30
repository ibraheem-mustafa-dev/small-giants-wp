"""identity_editor -- the editor-side and stylesheet reads behind two `block_identity_facts` facts.

- `icon_pickers(src, block_dir)`: every `<IconPicker>` the block's editor code mounts (its own folder's scripts and the
  repo modules they import by relative path), with the setting it writes and the icon sources it offers: the literal
  `sources={ [ ... ] }` list, a `sources={ NAME }` constant declared in the same file, or, with no `sources` prop, every
  source of `components/IconPicker/icon-data.js::ICON_SOURCES` that is not `optIn` (`enabledIconSources`). A list that
  cannot be settled is None. Feeds `accepts-kind`: a setting an IconPicker writes holds every kind that picker offers.
- `custom_property_moves(src_roots, name)`: whether a custom property a view script sets moves something along the
  inline axis: True when any stylesheet or render declaration consumes it in `transform`, `translate`, a left / right /
  inline inset or an inline-start margin, False when every consumer is another property (a header offset under `top`,
  a stagger under `animation-delay`, an arc under `stroke-dashoffset`), None when no consumer is found. Feeds
  `self-moving`.
"""
from __future__ import annotations

import re
from pathlib import Path

_IMPORT = re.compile(r"""(?:^|\n)\s*import\s[^;]*?from\s*['"](\.{1,2}/[^'"]+)['"]""")
_PICKER = re.compile(r"<IconPicker\b")
_SOURCES_LIST = re.compile(r"\bsources=\{\s*\[([^\]]*)\]")
_SOURCES_NAME = re.compile(r"\bsources=\{\s*([A-Za-z_$][\w$]*)\s*\}")
_LIT = re.compile(r"'([\w-]+)'|\"([\w-]+)\"")
# The setting the picker writes: a key handed the picked name (`iconName: name`, `icon: val.name`), a field name passed
# beside it (`update( 'glyph', name )`), else the first key of its setAttributes call (`triggerIcon: next`).
_KEY_GETS_NAME = re.compile(r"\b([A-Za-z_]\w*)\s*:\s*(?:name|[A-Za-z_]\w*\.name)\b")
_FIELD_ARG = re.compile(r"\(\s*(?:[\w.]+\s*,\s*)?'([A-Za-z_]\w*)'\s*,\s*(?:name|[A-Za-z_]\w*\.name)\b(?!\s*:)")
_SET_FIRST = re.compile(r"setAttributes\(\s*\{\s*([A-Za-z_]\w*)\s*:")
_ICON_SOURCES = re.compile(r"export\s+const\s+ICON_SOURCES\s*=\s*\[(.*?)\n\];", re.S)
_ENTRY = re.compile(r"\{[^{}]*?\bkey:\s*'([\w-]+)'[^{}]*\}")
_INLINE_AXIS = re.compile(r"^(?:transform|translate|left|right|inset|inset-inline|inset-inline-start|inset-inline-end|"
                          r"margin-left|margin-inline-start)$")


def _strip_comments(code: str) -> str:
    return re.sub(r"/\*.*?\*/", "", re.sub(r"(?m)^\s*//.*$", "", code), flags=re.S)


def default_sources(src: Path) -> list | None:
    """`enabledIconSources( undefined )`: the ICON_SOURCES keys that are not opt-in, read from icon-data.js."""
    f = src / "components" / "IconPicker" / "icon-data.js"
    if not f.is_file():
        return None
    m = _ICON_SOURCES.search(_strip_comments(f.read_text(encoding="utf-8")))
    if not m:
        return None
    return [e.group(1) for e in _ENTRY.finditer(m.group(1)) if not re.search(r"\boptIn:\s*true\b", e.group(0))]


def editor_files(src: Path, block_dir: Path) -> list[Path]:
    """The block folder's scripts and every repo module under `src` they import by relative path, transitively."""
    picker_dir = (src / "components" / "IconPicker").resolve()
    todo = sorted(p for p in block_dir.rglob("*.js") if p.is_file())
    seen: list[Path] = []
    while todo:
        f = todo.pop(0).resolve()
        if f in seen or picker_dir in f.parents:
            continue
        seen.append(f)
        for rel in _IMPORT.findall(f.read_text(encoding="utf-8", errors="replace")):
            base = (f.parent / rel).resolve()
            for cand in (base, base.with_suffix(".js"), base / "index.js"):
                if cand.is_file() and src.resolve() in cand.parents:
                    todo.append(cand)
                    break
    return seen


def _element(code: str, start: int) -> str:
    """The JSX element text from `<IconPicker` to its closing `/>` or `>` at brace depth 0 (an arrow's `=>` is skipped)."""
    depth, i = 0, start
    while i < len(code):
        c = code[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == ">" and depth == 0 and code[i - 1] != "=":
            return code[start:i + 1]
        i += 1
    return code[start:]


def icon_pickers(src: Path, block_dir: Path) -> list[tuple]:
    """[(setting key or None, offered sources or None, evidence)] for every IconPicker the block's editor mounts."""
    defaults = default_sources(src)
    out = []
    for f in editor_files(src, block_dir):
        code = _strip_comments(f.read_text(encoding="utf-8", errors="replace"))
        for m in _PICKER.finditer(code):
            el = _element(code, m.start())
            lit = _SOURCES_LIST.search(el)
            named = _SOURCES_NAME.search(el)
            if lit:
                sources, how = [a or b for a, b in _LIT.findall(lit.group(1))], "its sources list"
            elif named:
                decl = re.search(r"\bconst\s+" + re.escape(named.group(1)) + r"\s*=\s*\[([^\]]*)\]", code)
                sources = [a or b for a, b in _LIT.findall(decl.group(1))] if decl else None
                how = f"sources={named.group(1)}" + ("" if decl else " (not declared in the file)")
            else:
                sources, how = defaults, "no sources prop (enabledIconSources: every source that is not opt-in)"
            key = next((r.group(1) for r in (_KEY_GETS_NAME.search(el), _FIELD_ARG.search(el), _SET_FIRST.search(el)) if r), None)
            rel = f.as_posix().split("/plugins/sgs-blocks/", 1)[-1]
            out.append((key, sources, f"{rel} <IconPicker> writes {key or 'an untraced setting'}; {how}: {sources}"))
    return out


class StyleIndex:
    """Every stylesheet and PHP file under the roots, read once, for custom-property consumers."""

    def __init__(self, roots: list[Path]):
        self.texts: list[str] = []
        for root in roots:
            if root.is_file():
                files = [root]
            elif root.is_dir():
                files = [p for ext in ("*.css", "*.scss", "*.php") for p in root.rglob(ext)
                         if "node_modules" not in p.parts and "build" not in p.parts]
            else:
                continue
            for p in files:
                self.texts.append(p.read_text(encoding="utf-8", errors="replace"))
        self._cache: dict[str, bool | None] = {}

    def moves(self, name: str) -> bool | None:
        if name in self._cache:
            return self._cache[name]
        props = []
        pat = re.compile(r"var\(\s*" + re.escape(name) + r"(?![\w-])")
        for text in self.texts:
            for m in pat.finditer(text):
                head = re.sub(r"/\*.*?\*/", "", text[max(0, m.start() - 400):m.start()], flags=re.S)
                cut = max(head.rfind(c) for c in ";{}'\"")
                decl = re.match(r"\s*([a-z-]+)\s*:", head[cut + 1:])
                if decl:
                    props.append(decl.group(1))
        res = None if not props else any(_INLINE_AXIS.match(p) for p in props)
        self._cache[name] = res
        return res
