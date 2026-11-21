"""The built-in button kit and the carousel dots kit as sources of wiring links (blind spot: a kit builds its attribute names from a prefix).

A block declares a button in `block.json` `supports.sgs.builtinButtons` (`{prefix, part, label, groups}`); the generator
(`scripts/generate-button-attributes.mjs`) writes `prefix + base` attributes from `src/components/button-kit/registry.json`.
No file of the block names them: `src/components/BuiltinButtonPanel.js` writes `prefix + base` from its `prefix` prop, and
`includes/helpers-button-style.php::sgs_button_kit_css( $attrs, $prefix, $selector )` reads `$prefix . $base` and prints the
CSS. The gate reads attribute names statically, so it sees neither side. This module gives a kit attribute the links the kit
earns it, provided the block really mounts the kit for that prefix:

  L2  the attribute is in the registry, its group is among the declaration's groups, and an editor file the block reaches
      mounts `<BuiltinButtonPanel prefix="…">` with the attribute's prefix (a literal, or a constant in the same file)
  L3  (button kit only) an editor file the block reaches imports the shared canvas twin `button-kit-style.js` and calls
      `buttonKitStyle( attributes, '<prefix>', … )` with the attribute's prefix (a literal, or a constant in the same file),
      and the twin's own source reads the attribute's base (an `attr( 'Base' )` literal, or any base of the type family the
      twin previews through `typographyPreviewStyle`). The twin drops a base, the credit goes with it. A hover base is the
      gate's advisory L3-state and is never in question here.
  L4  the same registry and group test, and a PHP text the block's render reaches calls `sgs_button_kit_css` with the
      attribute's prefix (a literal, a variable assigned or looped over literals, or a parameter every caller in reach
      passes a literal for) as its second argument
  L5  the same call: the kit turns each setting it reads into a declaration (`sgs_button_kit_css` returns the rules)

The carousel dots kit has the same shape: `supports.sgs.carouselDots` (`{prefix, part, label}`, one object; every row of
`src/components/carousel-dots/registry.json`), `<CarouselDotsPanel prefix="…">` for L2, and `sgs_carousel_dots_css(
$attrs, $prefix, … )` for L4 and L5. It has no canvas twin, so its L3 stays the block's own. A panel that is not mounted for
the prefix, or a prefix no emitter call names, earns nothing for its half, and a group the declaration leaves out earns
nothing for either.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from wf_php import PhpIndex, PhpText, loop_literals, lower_first, read, split_args

REGISTRY = "src/components/button-kit/registry.json"
DOTS_REGISTRY = "src/components/carousel-dots/registry.json"
KIT_FUNCTION = "sgs_button_kit_css"
DOTS_FUNCTION = "sgs_carousel_dots_css"
TWIN_FILE = "src/components/button-kit/button-kit-style.js"
TWIN_NAME = "buttonKitStyle"
TWIN_TYPOGRAPHY_GROUP = "typography"   # the registry group the twin previews as one `typographyPreviewStyle` call
TWIN_ATTR_RE = re.compile(r"""\battr\(\s*['"](\w+)['"]\s*\)""")
TWIN_CALL_RE = re.compile(
    r"(?<![\w$.])" + TWIN_NAME + r"""\s*\(\s*[^,()]+,\s*(?:(?P<q>["'`])(?P<lit>\w*)(?P=q)|(?P<id>[A-Za-z_]\w*))\s*[,)]""")
TWIN_IMPORT_RE = re.compile(r"""import\s+""" + TWIN_NAME + r"""\b[^;]*?from\s+['"][^'"]*button-kit-style(?:\.js)?['"]""", re.S)
LITERAL_ARG_RE = re.compile(r"""\s*(['"])(\w*)\1\s*""")
VAR_ARG_RE = re.compile(r"\s*\$(\w+)\s*")
BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT_RE = re.compile(r"(?m)^\s*//.*$")


def _panel_tag_re(tag: str) -> re.Pattern:
    return re.compile(
        r"<" + tag + r"""\b[^<]*?\bprefix=(?:"(?P<dq>\w*)"|'(?P<sq>\w*)'|\{\s*(?:(?P<q>["'`])(?P<lit>\w*)(?P=q)|(?P<id>[A-Za-z_]\w*))\s*\})""",
        re.S)


def _call_re(function: str) -> re.Pattern:
    return re.compile(r"(?<![\w$>:])" + function + r"\s*\(")


def _declared_buttons(bjson: dict) -> list[dict]:
    sgs = (bjson.get("supports") or {}).get("sgs")
    buttons = sgs.get("builtinButtons") if isinstance(sgs, dict) else None
    return [b for b in buttons if isinstance(b, dict) and isinstance(b.get("prefix"), str)] if isinstance(buttons, list) else []


def _declared_dots(bjson: dict) -> list[dict]:
    sgs = (bjson.get("supports") or {}).get("sgs")
    dots = sgs.get("carouselDots") if isinstance(sgs, dict) else None
    return [dots] if isinstance(dots, dict) and isinstance(dots.get("prefix"), str) else []


def declares_kit(bjson: dict) -> bool:
    """True when the block declares a built-in button or carousel dots (so its render path is searched for the emitters)."""
    return bool(_declared_buttons(bjson) or _declared_dots(bjson))


def _name(prefix: str, base: str) -> str:
    return prefix + base if prefix else lower_first(base)


def _enclosing_second_param_fn(src: str, pos: int, ident: str) -> str | None:
    """The name of the last function declared before `pos` whose second parameter is `ident`, else None."""
    found = None
    for m in re.finditer(r"\bfunction\s+(\w+)\s*\(\s*\w+\s*,\s*(\w+)", src[:pos]):
        found = m.group(1) if m.group(2) == ident else None
    return found


def _const_value(src: str, ident: str) -> str | None:
    const = re.search(r"\bconst\s+" + re.escape(ident) + r"\s*=\s*(['\"`])(\w*)\1", src)
    return const.group(2) if const else None


class ButtonKit:
    """The built-in button kit: `supports.sgs.builtinButtons`, `BuiltinButtonPanel`, `sgs_button_kit_css`, the canvas twin."""

    registry_file = REGISTRY
    function = KIT_FUNCTION
    panel_tag = "BuiltinButtonPanel"
    canvas_twin = True

    def __init__(self, plugin: Path) -> None:
        self._plugin = plugin
        self.group_of: dict[str, str] = {}      # registry base -> group
        self.default_groups: list[str] = []
        path = plugin / self.registry_file
        if path.exists():
            self._load(json.loads(path.read_text(encoding="utf-8")))
        self._panel_re = _panel_tag_re(self.panel_tag)
        self._call_re = _call_re(self.function)
        self._mounts: dict[str, set[str]] = {}
        self._twin_calls: dict[str, set[str]] = {}
        self._twin_wrappers: dict[str, set[str]] = {}
        self._twin_bases: set[str] | None = None

    def _load(self, registry: dict) -> None:
        self.default_groups = list(registry.get("defaultGroups", []))
        for group, rows in registry.get("groups", {}).items():
            for row in rows:
                self.group_of[row["base"]] = group

    def _declared(self, bjson: dict) -> list[dict]:
        return _declared_buttons(bjson)

    def match(self, bjson: dict, attr: str) -> str | None:
        """The declared prefix whose registry attribute (in a declared group) is `attr`, or None."""
        for button in self._declared(bjson):
            prefix = button["prefix"]
            groups = button.get("groups")
            shown = groups if isinstance(groups, list) and groups else self.default_groups
            for base, group in self.group_of.items():
                if group in shown and _name(prefix, base) == attr:
                    return prefix
        return None

    def base_of(self, prefix: str, attr: str) -> str | None:
        """The registry base `attr` is for `prefix`, or None."""
        for base in self.group_of:
            if _name(prefix, base) == attr:
                return base
        return None

    # ---- L2: the panel mounted for the prefix

    def _mounted_prefixes(self, rel: str) -> set[str]:
        if rel not in self._mounts:
            out: set[str] = set()
            path = self._plugin / rel
            if rel.endswith((".js", ".jsx")) and path.is_file():
                src = LINE_COMMENT_RE.sub("", BLOCK_COMMENT_RE.sub("", read(path)))
                for m in self._panel_re.finditer(src):
                    if m.group("id"):
                        value = _const_value(src, m.group("id"))
                        if value is not None:
                            out.add(value)
                    else:
                        out.add(next(v for v in (m.group("dq"), m.group("sq"), m.group("lit")) if v is not None))
            self._mounts[rel] = out
        return self._mounts[rel]

    def panel_mounted(self, prefix: str, editor_files: list[str]) -> bool:
        return any(prefix in self._mounted_prefixes(rel) for rel in editor_files)

    # ---- L3: the canvas twin called with the prefix

    def _twin_prefixes(self, rel: str) -> set[str]:
        """The prefixes an editor file passes to `buttonKitStyle()` (it must import the twin from button-kit-style)."""
        if rel not in self._twin_calls:
            out: set[str] = set()
            wrappers: set[str] = set()
            src = self._editor_src(rel)
            if src is not None and TWIN_IMPORT_RE.search(src):
                for m in TWIN_CALL_RE.finditer(src):
                    if m.group("id"):
                        value = _const_value(src, m.group("id"))
                        if value is not None:
                            out.add(value)
                        else:
                            # A wrapper: the enclosing function hands its own second parameter to the twin
                            # (choice-flow's `buttonKitPreview( attributes, prefix, … )`); its callers' literal
                            # second arguments are the prefixes it previews (_wrapper_prefixes).
                            name = _enclosing_second_param_fn(src, m.start(), m.group("id"))
                            if name:
                                wrappers.add(name)
                    else:
                        out.add(m.group("lit"))
            self._twin_calls[rel] = out
            self._twin_wrappers[rel] = wrappers
        return self._twin_calls[rel]

    def _editor_src(self, rel: str) -> str | None:
        path = self._plugin / rel
        if rel.endswith((".js", ".jsx")) and path.is_file():
            return LINE_COMMENT_RE.sub("", BLOCK_COMMENT_RE.sub("", read(path)))
        return None

    def _wrapper_prefixes(self, editor_files: list[str]) -> set[str]:
        """The literal prefixes the block's editor files pass to a wrapper of the twin."""
        names: set[str] = set()
        for rel in editor_files:
            self._twin_prefixes(rel)
            names |= self._twin_wrappers.get(rel, set())
        out: set[str] = set()
        if not names:
            return out
        call_re = re.compile(r"(?<![\w$.])(?:" + "|".join(map(re.escape, sorted(names))) +
                             r""")\s*\(\s*[^,()]+,\s*(["'`])(\w*)\1\s*[,)]""")
        for rel in editor_files:
            src = self._editor_src(rel)
            if src is not None:
                out |= {m.group(2) for m in call_re.finditer(src)}
        return out

    def twin_bases(self) -> set[str]:
        """The registry bases the canvas twin's own source reads."""
        if self._twin_bases is None:
            out: set[str] = set()
            path = self._plugin / TWIN_FILE
            if path.is_file():
                src = LINE_COMMENT_RE.sub("", BLOCK_COMMENT_RE.sub("", read(path)))
                out |= {b for b in TWIN_ATTR_RE.findall(src) if b in self.group_of}
                if "typographyPreviewStyle(" in src:
                    out |= {b for b, g in self.group_of.items() if g == TWIN_TYPOGRAPHY_GROUP}
            self._twin_bases = out
        return self._twin_bases

    def canvas_previewed(self, prefix: str, attr: str, editor_files: list[str]) -> bool:
        if not self.canvas_twin:
            return False
        base = self.base_of(prefix, attr)
        if base is None or base not in self.twin_bases():
            return False
        return any(prefix in self._twin_prefixes(rel) for rel in editor_files) or prefix in self._wrapper_prefixes(editor_files)

    # ---- L4, L5: the emitter called with the prefix

    @staticmethod
    def _literals_of(arg: str, t: PhpText, pos: int, index: PhpIndex, texts: list[PhpText]) -> set[str]:
        m = LITERAL_ARG_RE.fullmatch(arg)
        if m:
            return {m.group(2)}
        vm = VAR_ARG_RE.fullmatch(arg)
        if not vm:
            return set()
        var = vm.group(1)
        out = set(loop_literals(t.src, t.mask, pos, var))
        for am in re.finditer(r"\$" + re.escape(var) + r"\s*=\s*(['\"])(\w*)\1\s*;", t.src):
            out.add(am.group(2))
        entry = index.funcs.get(t.name)
        if entry and var in entry[1]:
            # A parameter: the literals every caller in reach passes for it.
            idx = entry[1].index(var)
            for ct in texts:
                for cm in re.finditer(r"(?<![\w$>:])" + re.escape(t.name) + r"\s*\(", ct.src):
                    args = split_args(ct.src, cm.end() - 1)
                    if idx < len(args):
                        lit = LITERAL_ARG_RE.fullmatch(args[idx])
                        if lit:
                            out.add(lit.group(2))
        return out

    def called_prefixes(self, texts: list[PhpText], index: PhpIndex) -> set[str]:
        out: set[str] = set()
        for t in texts:
            if self.function not in t.src:
                continue
            for m in self._call_re.finditer(t.src):
                args = split_args(t.src, m.end() - 1)
                if len(args) > 1:
                    out |= self._literals_of(args[1], t, m.start(), index, texts)
        return out

    def credits(self, bjson: dict, attr: str, editor_files: list[str], called: set[str]) -> frozenset[str]:
        """The links the kit gives one attribute of one block; `called` is `called_prefixes` over the block's render path."""
        prefix = self.match(bjson, attr)
        if prefix is None:
            return frozenset()
        out: set[str] = set()
        if self.panel_mounted(prefix, editor_files):
            out.add("L2")
        if self.canvas_previewed(prefix, attr, editor_files):
            out.add("L3")
        if prefix in called:
            out |= {"L4", "L5"}
        return frozenset(out)


class CarouselDotsKit(ButtonKit):
    """The carousel dots kit: `supports.sgs.carouselDots`, `CarouselDotsPanel`, `sgs_carousel_dots_css`; no canvas twin."""

    registry_file = DOTS_REGISTRY
    function = DOTS_FUNCTION
    panel_tag = "CarouselDotsPanel"
    canvas_twin = False

    def _load(self, registry: dict) -> None:
        self.default_groups = ["rows"]
        for row in registry.get("rows", []):
            self.group_of[row["base"]] = "rows"

    def _declared(self, bjson: dict) -> list[dict]:
        return _declared_dots(bjson)


class Kits:
    """Both kits behind the one call the scan makes."""

    def __init__(self, plugin: Path) -> None:
        self._kits = (ButtonKit(plugin), CarouselDotsKit(plugin))

    def called_prefixes(self, texts: list[PhpText], index: PhpIndex) -> list[set[str]]:
        return [kit.called_prefixes(texts, index) for kit in self._kits]

    def credits(self, bjson: dict, attr: str, editor_files: list[str], called: list[set[str]]) -> frozenset[str]:
        out: frozenset[str] = frozenset()
        for kit, kit_called in zip(self._kits, called):
            out |= kit.credits(bjson, attr, editor_files, kit_called)
        return out
