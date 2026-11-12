"""The shared media system as a source of wiring links (Spec 49 §8, §9.3).

An adopted block (a `supports.sgs.mediaElements` entry that declares `kinds`) never names its media attributes in its
own files: the shared panels write `{prefix}{Base}`, the shared renderer and the canvas's emitters read it, each building
the name at run time. `media_system_facts.mjs` computes, from the registry the generator, the panels and the renderer
share, which attribute each adopted slot is *offered* by the panels (the row's `slots` allow the slot's context and one of
its kinds) and whether the renderer and the canvas's emitters read that setting's base by name. This module turns those
facts into the links a block gets from the shared system, provided the block really mounts it:

  L2  the panels offer the setting for the slot, and the block's editor reaches the shared panels
  L4  the renderer reads the base, and the block's PHP calls the shared renderer (a slot or the background wrapper)
  L5  the same read reaches CSS through the atom's emitters
  L3  the canvas's emitters read the base, and the block's editor reaches the shared canvas preview

A setting the panels never offer for that slot's context and kinds earns nothing, so it stays a finding. A block that does
not mount a half of the system earns nothing for that half.
"""
from __future__ import annotations

import re
from pathlib import Path

PANEL_DIR = "src/components/media/panels/"
# The editor files that draw an adopted slot in the canvas: the element-slot preview and the background-layer mirror.
CANVAS_FILES = ("src/components/media/mediaPreview.js", "src/utils/background-media-preview.js")
RENDERER_CALL_RE = re.compile(r"SGS_Media_Element::render\b|sgs_media_render_(?:slot|background)\b|SGS_Container_Wrapper\b")
# Shared PHP includes that call the renderer for a block (one hop): a block whose own files call one of these includes' functions
# prints through the renderer without naming it. Each must itself call the renderer, which `MediaSystem` checks at start-up.
RENDERER_WRAPPER_FILES = ("includes/product-card-media.php",)
FUNCTION_DEF_RE = re.compile(r"(?<![\w$>])function\s+(\w+)\s*\(")
# A block that mounts the shared aspect-ratio field by hand (`<AspectRatioField prefix="x" />`) has a control for `xRatio`
# even where the slot's own atoms never offered Ratio (the control writes the name at run time).
RATIO_FIELD_FILE = "src/components/media/SizingFields.js"
RATIO_FIELD_RE = re.compile(r"<AspectRatioField[^>]*?\sprefix=\{?\s*[\"'](\w+)[\"']", re.DOTALL)
CANVAS_LINKS = frozenset({"L3", "L3-tier", "L3-state", "L3-runtime"})


class MediaSystem:
    def __init__(self, facts: dict, plugin: Path) -> None:
        self.blocks: dict[str, dict] = facts.get("blocks", {})
        self._plugin = plugin
        self._renders: dict[Path, bool] = {}
        # A renamed entry point would silently drop every credit; fail loudly instead.
        if self.blocks:
            missing = [f for f in CANVAS_FILES if not (plugin / f).exists()]
            for rel in RENDERER_WRAPPER_FILES:
                wrapper = plugin / rel
                if not wrapper.exists() or not RENDERER_CALL_RE.search(wrapper.read_text(encoding="utf-8", errors="replace")):
                    missing.append(rel + " (must exist and call the renderer)")
            if not (plugin / PANEL_DIR).is_dir():
                missing.append(PANEL_DIR)
            if missing:
                raise RuntimeError("wf_media_system: shared media system entry point(s) not found: " + ", ".join(missing))

    def _wrapper_functions(self) -> re.Pattern | None:
        """A call to any function the shared wrapper includes define (they call the renderer), or None when there are none."""
        if not hasattr(self, "_wrapper_re"):
            names: list[str] = []
            for rel in RENDERER_WRAPPER_FILES:
                wrapper = self._plugin / rel
                if wrapper.exists():
                    names += FUNCTION_DEF_RE.findall(wrapper.read_text(encoding="utf-8", errors="replace"))
            self._wrapper_re = re.compile(r"(?<![\w:>$])(?:" + "|".join(map(re.escape, sorted(set(names)))) + r")\s*\(") if names else None
        return self._wrapper_re

    def _calls_renderer(self, bdir: Path) -> bool:
        """The block's own PHP calls the renderer, or calls a function of a shared wrapper include that does (one hop)."""
        if bdir not in self._renders:
            wrapped = self._wrapper_functions()
            texts = [p.read_text(encoding="utf-8", errors="replace") for p in sorted(bdir.rglob("*.php"))]
            self._renders[bdir] = any(RENDERER_CALL_RE.search(t) or (wrapped is not None and wrapped.search(t)) for t in texts)
        return self._renders[bdir]

    def _mounts_ratio_field(self, attr: str, editor_files: list[str], bdir: Path) -> bool:
        """The block's own editor mounts `<AspectRatioField prefix="x">` and the attribute is `xRatio`: the control writes it."""
        if not attr.endswith("Ratio") or RATIO_FIELD_FILE not in editor_files:
            return False
        for p in sorted(bdir.rglob("*.js")):
            if any(prefix + "Ratio" == attr for prefix in RATIO_FIELD_RE.findall(p.read_text(encoding="utf-8", errors="replace"))):
                return True
        return False

    def no_css(self, block: str, attr: str) -> bool:
        """The shared system declares the attribute with no CSS property and no emitter: it changes no appearance."""
        fact = self.blocks.get(block, {}).get(attr)
        return bool(fact) and not fact["paints"]

    def credits(self, block: str, attr: str, editor_files: list[str], bdir: Path) -> frozenset[str]:
        """The links the shared system gives one attribute of one block."""
        fact = self.blocks.get(block, {}).get(attr)
        if not fact or not fact["offered"]:
            return frozenset({"L2"}) if self._mounts_ratio_field(attr, editor_files, bdir) else frozenset()
        out: set[str] = set()
        if any(f.startswith(PANEL_DIR) for f in editor_files):
            out.add("L2")
        if fact["reads"]["php"] and self._calls_renderer(bdir):
            out |= {"L4", "L5"}
        if fact["reads"]["js"] and any(f in CANVAS_FILES for f in editor_files):
            out |= CANVAS_LINKS
        return frozenset(out)
