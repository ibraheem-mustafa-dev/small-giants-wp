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
CANVAS_LINKS = frozenset({"L3", "L3-tier", "L3-state", "L3-runtime"})


class MediaSystem:
    def __init__(self, facts: dict, plugin: Path) -> None:
        self.blocks: dict[str, dict] = facts.get("blocks", {})
        self._plugin = plugin
        self._renders: dict[Path, bool] = {}
        # A renamed entry point would silently drop every credit; fail loudly instead.
        if self.blocks:
            missing = [f for f in CANVAS_FILES if not (plugin / f).exists()]
            if not (plugin / PANEL_DIR).is_dir():
                missing.append(PANEL_DIR)
            if missing:
                raise RuntimeError("wf_media_system: shared media system entry point(s) not found: " + ", ".join(missing))

    def _calls_renderer(self, bdir: Path) -> bool:
        if bdir not in self._renders:
            self._renders[bdir] = any(RENDERER_CALL_RE.search(p.read_text(encoding="utf-8", errors="replace"))
                                      for p in sorted(bdir.rglob("*.php")))
        return self._renders[bdir]

    def no_css(self, block: str, attr: str) -> bool:
        """The shared system declares the attribute with no CSS property and no emitter: it changes no appearance."""
        fact = self.blocks.get(block, {}).get(attr)
        return bool(fact) and not fact["paints"]

    def credits(self, block: str, attr: str, editor_files: list[str], bdir: Path) -> frozenset[str]:
        """The links the shared system gives one attribute of one block."""
        fact = self.blocks.get(block, {}).get(attr)
        if not fact or not fact["offered"]:
            return frozenset()
        out: set[str] = set()
        if any(f.startswith(PANEL_DIR) for f in editor_files):
            out.add("L2")
        if fact["reads"]["php"] and self._calls_renderer(bdir):
            out |= {"L4", "L5"}
        if fact["reads"]["js"] and any(f in CANVAS_FILES for f in editor_files):
            out |= CANVAS_LINKS
        return frozenset(out)
