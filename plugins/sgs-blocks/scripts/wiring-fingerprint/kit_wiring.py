#!/usr/bin/env python3
"""The kit attributes each block really wires, for detectors that read attribute names literally.

The built-in button kit and the carousel dots kit build a block's attribute names from a prefix (`ctaColourBackground` is
the kit's `ColourBackground` under prefix `cta`), so a detector that looks for the literal name in edit.js or render.php
finds neither the control nor the reader. This credits an attribute exactly as the wiring-fingerprint gate does
(wf_button_kit.Kits.credits): L2 when the block's editor mounts the kit's panel for that prefix, L4 and L5 when its
render path calls the kit's CSS printer with that prefix, and only for a group the block's declaration shows. Editor
files are the block's own scripts (its edit.js and components), not the Node import graph the full gate uses.

    python plugins/sgs-blocks/scripts/wiring-fingerprint/kit_wiring.py [plugin dir]   prints {block: {attr: [links]}} as JSON

Used by scripts/audit-block-file-consistency.py and scripts/inspector-scan (rules 21 and 34).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from wf_button_kit import Kits, declares_kit  # noqa: E402
from wf_pass import FrontPass  # noqa: E402
from wf_paths import Roots, fixture_roots, real_roots  # noqa: E402

# A block's front-end scripts are never where its inspector panel is mounted.
FRONT_END_SCRIPTS = ("view.js", "view-module.js", "frontend.js")


def editor_files(roots: Roots, bdir: Path) -> list[str]:
    return [roots.rel(p) for p in sorted(bdir.rglob("*.js")) if p.name not in FRONT_END_SCRIPTS and "__tests__" not in p.parts]


def kit_wiring(roots: Roots | None = None) -> dict[str, dict[str, list[str]]]:
    roots = roots or real_roots()
    front = FrontPass(roots)
    kits = Kits(roots.plugin)
    out: dict[str, dict[str, list[str]]] = {}
    for bdir in sorted(roots.blocks.iterdir()) if roots.blocks.exists() else []:
        path = bdir / "block.json"
        if not path.exists():
            continue
        bjson = json.loads(path.read_text(encoding="utf-8"))
        if not declares_kit(bjson):
            continue
        called = kits.called_prefixes(front.fe.block_texts(bdir)[0], front.index)
        files = editor_files(roots, bdir)
        for attr in sorted(bjson.get("attributes") or {}):
            links = kits.credits(bjson, attr, files, called)
            if links:
                out.setdefault(bjson.get("name", "sgs/" + bdir.name), {})[attr] = sorted(links)
    return out


if __name__ == "__main__":
    # A plugin folder other than this one (a fixture tree) is read with the real node_modules; no database is opened.
    roots = fixture_roots(Path(sys.argv[1]), Path(sys.argv[1]) / "unused.db") if len(sys.argv) > 1 else None
    print(json.dumps(kit_wiring(roots), indent=1, sort_keys=True))
