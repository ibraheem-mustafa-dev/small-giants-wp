"""The built-in button kit as a source of wiring links (blind spot: the kit builds its attribute names from a prefix).

A block declares a button in `block.json` `supports.sgs.builtinButtons` (`{prefix, part, label, groups}`); the generator
(`scripts/generate-button-attributes.mjs`) writes `prefix + base` attributes from `src/components/button-kit/registry.json`.
No file of the block names them: `src/components/BuiltinButtonPanel.js` writes `prefix + base` from its `prefix` prop, and
`includes/helpers-button-style.php::sgs_button_kit_css( $attrs, $prefix, $selector )` reads `$prefix . $base` and prints the
CSS. The gate reads attribute names statically, so it sees neither side. This module gives a kit attribute the links the kit
earns it, provided the block really mounts the kit for that prefix:

  L2  the attribute is in the registry, its group is among the declaration's groups, and an editor file the block reaches
      mounts `<BuiltinButtonPanel prefix="…">` with the attribute's prefix (a literal, or a constant in the same file)
  L4  the same registry and group test, and a PHP text the block's render reaches calls `sgs_button_kit_css` with the
      attribute's prefix (a literal, a variable assigned or looped over literals, or a parameter every caller in reach
      passes a literal for) as its second argument
  L5  the same call: the kit turns each setting it reads into a declaration (`sgs_button_kit_css` returns the rules)

The kit gives no editor-canvas preview, so L3 is never credited here: the canvas links stay the block's own. A panel that is
not mounted for the prefix, or a prefix no `sgs_button_kit_css` call names, earns nothing for its half, and a group the
declaration leaves out earns nothing for either.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from wf_php import PhpIndex, PhpText, loop_literals, lower_first, read, split_args

REGISTRY = "src/components/button-kit/registry.json"
KIT_FUNCTION = "sgs_button_kit_css"
PANEL_TAG_RE = re.compile(
    r"""<BuiltinButtonPanel\b[^<]*?\bprefix=(?:"(?P<dq>\w*)"|'(?P<sq>\w*)'|\{\s*(?:(?P<q>["'`])(?P<lit>\w*)(?P=q)|(?P<id>[A-Za-z_]\w*))\s*\})""",
    re.S)
KIT_CALL_RE = re.compile(r"(?<![\w$>:])" + KIT_FUNCTION + r"\s*\(")
LITERAL_ARG_RE = re.compile(r"""\s*(['"])(\w*)\1\s*""")
VAR_ARG_RE = re.compile(r"\s*\$(\w+)\s*")
BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT_RE = re.compile(r"(?m)^\s*//.*$")


def _declared_buttons(bjson: dict) -> list[dict]:
    sgs = (bjson.get("supports") or {}).get("sgs")
    buttons = sgs.get("builtinButtons") if isinstance(sgs, dict) else None
    return [b for b in buttons if isinstance(b, dict) and isinstance(b.get("prefix"), str)] if isinstance(buttons, list) else []


def _name(prefix: str, base: str) -> str:
    return prefix + base if prefix else lower_first(base)


class ButtonKit:
    def __init__(self, plugin: Path) -> None:
        self._plugin = plugin
        self.group_of: dict[str, str] = {}      # registry base -> group
        self.default_groups: list[str] = []
        path = plugin / REGISTRY
        if path.exists():
            registry = json.loads(path.read_text(encoding="utf-8"))
            self.default_groups = list(registry.get("defaultGroups", []))
            for group, rows in registry.get("groups", {}).items():
                for row in rows:
                    self.group_of[row["base"]] = group
        self._mounts: dict[str, set[str]] = {}

    def match(self, bjson: dict, attr: str) -> str | None:
        """The declared prefix whose registry attribute (in a declared group) is `attr`, or None."""
        for button in _declared_buttons(bjson):
            prefix = button["prefix"]
            groups = button.get("groups")
            shown = groups if isinstance(groups, list) and groups else self.default_groups
            for base, group in self.group_of.items():
                if group in shown and _name(prefix, base) == attr:
                    return prefix
        return None

    # ---- L2: the panel mounted for the prefix

    def _mounted_prefixes(self, rel: str) -> set[str]:
        if rel not in self._mounts:
            out: set[str] = set()
            path = self._plugin / rel
            if rel.endswith((".js", ".jsx")) and path.is_file():
                src = LINE_COMMENT_RE.sub("", BLOCK_COMMENT_RE.sub("", read(path)))
                for m in PANEL_TAG_RE.finditer(src):
                    if m.group("id"):
                        const = re.search(r"\bconst\s+" + re.escape(m.group("id")) + r"\s*=\s*(['\"`])(\w*)\1", src)
                        if const:
                            out.add(const.group(2))
                    else:
                        out.add(next(v for v in (m.group("dq"), m.group("sq"), m.group("lit")) if v is not None))
            self._mounts[rel] = out
        return self._mounts[rel]

    def panel_mounted(self, prefix: str, editor_files: list[str]) -> bool:
        return any(prefix in self._mounted_prefixes(rel) for rel in editor_files)

    # ---- L4, L5: the kit called with the prefix

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
            if KIT_FUNCTION not in t.src:
                continue
            for m in KIT_CALL_RE.finditer(t.src):
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
        if prefix in called:
            out |= {"L4", "L5"}
        return frozenset(out)
