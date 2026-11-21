"""kit_wiring.py: the kit attributes a block really wires, the one answer the file-consistency audit and inspector-scan's
rules 21 and 34 read (before it, each read the kit's attribute names literally and called all 518 of them unwired).
Negative controls: a prefix the editor never mounts gets no control, a prefix the render path never prints gets no
reader, and a group the declaration does not show gets nothing."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

from kit_wiring import kit_wiring  # noqa: E402
from test_button_kit_credit import MOUNT, RENDER_LITERAL, RENDER_NO_CALL, build  # noqa: E402


def test_mounted_and_printed_kit_attributes_are_wired_and_nothing_else(tmp_path):
    roots = build(tmp_path, {
        "kit-ok": {"groups": ["colour"], "attrs": ("ColourBackground", "ColourText"), "mount": MOUNT, "render": RENDER_LITERAL},
        "kit-nopanel": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": None, "render": RENDER_LITERAL},
        "kit-nocall": {"groups": ["colour"], "attrs": ("ColourBackground",), "mount": MOUNT, "render": RENDER_NO_CALL},
        "kit-group": {"groups": ["colour"], "attrs": ("ColourBackground", "TextTransform"), "mount": MOUNT, "render": RENDER_LITERAL},
    })
    got = kit_wiring(roots)
    # MUST FAIL before kit_wiring.py: no shared answer existed, and the audit called these orphans.
    assert set(got["sgs/kit-ok"]["ctaColourBackground"]) >= {"L2", "L4", "L5"}
    assert set(got["sgs/kit-ok"]["ctaColourText"]) >= {"L2", "L4", "L5"}
    assert "L2" not in got.get("sgs/kit-nopanel", {}).get("ctaColourBackground", [])
    assert "L4" not in got.get("sgs/kit-nocall", {}).get("ctaColourBackground", [])
    assert "ctaTextTransform" not in got.get("sgs/kit-group", {})


def test_every_generated_kit_attribute_of_the_real_plugin_is_wired():
    import json

    got = kit_wiring()
    plugin = HERE.parents[2]
    unwired = []
    for path in sorted((plugin / "src" / "blocks").glob("*/block.json")):
        bjson = json.loads(path.read_text(encoding="utf-8"))
        for attr, spec in (bjson.get("attributes") or {}).items():
            if isinstance(spec, dict) and spec.get("_generated") in ("button-kit", "carousel-dots"):
                links = set(got.get(bjson["name"], {}).get(attr, []))
                if not {"L2", "L4"} <= links:
                    unwired.append(f"{bjson['name']}::{attr} {sorted(links)}")
    assert unwired == [], unwired[:20]
