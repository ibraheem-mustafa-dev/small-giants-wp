"""An extension that builds attribute names from a prefix is wired through the declared families, not by literal:
`<CardControls prefix="sgsItem">` plus a `prefix + 'Background'` suffix credits the control (L2); the PHP helpers that
take a prefix credit the front end (L4, `FrontEnd.hook_derived`); `canvasSource: "rest"` credits the canvas (L3) when
a file of the extension names a `sgs/v1` route. A family attribute with no control and no emitter is still flagged."""
from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from wf_channel import Channel  # noqa: E402
from wf_extensions import scan_extensions  # noqa: E402
from wf_paint import PaintClassifier  # noqa: E402

FILE = "src/blocks/extensions/shop/index.js"


def _run(tmp_path: Path, canvas_source: str | None, route: bool):
    ext_dir = tmp_path / "src" / "blocks" / "extensions" / "shop"
    ext_dir.mkdir(parents=True)
    (ext_dir / "index.js").write_text("fetch( '/sgs/v1/shop/css' );" if route else "// no route", encoding="utf-8")
    entry = {"id": "shop", "file": "shop/index.js", "rule": {"mode": "named", "blocks": ["woocommerce/cart"]},
             "attributes": {
                 "sgsItemBackground": {"type": "string", "role": "colour-background", "css_property": "background-color"},
                 "sgsItemOrphan": {"type": "string", "role": "colour-background", "css_property": "background-color"},
             }}
    if canvas_source:
        entry["canvasSource"] = canvas_source
    files = {FILE: {"prefixJsx": [{"tag": "CardControls", "prefix": "sgsItem"}], "prefixSuffixes": ["Background"],
                    "setKeys": [], "literals": [], "callsSet": False, "canvasReads": {}, "blockListBlock": False}}
    inp = SimpleNamespace(roster=[entry], facts={"extensions": [FILE], "extensionReach": {}, "files": files})
    fe = SimpleNamespace(
        flow_texts=lambda *a, **k: Channel(),
        hook_reach=lambda: [],
        hook_derived=lambda: {"sgsItemBackground": ["sgs_card_css"]},
        analyser=SimpleNamespace(emits_css=lambda h: True),
    )
    css = SimpleNamespace(has_class=lambda c: False, cp_read=lambda c: False)
    editor = SimpleNamespace(files=files, plugin=tmp_path)
    findings, _records = scan_extensions(inp, fe, css, "", editor, PaintClassifier([]))
    return {(f["attr"], f["link"]) for f in findings}


def test_family_attribute_is_wired_through_prefix_suffix_helper_and_rest_canvas(tmp_path):
    got = _run(tmp_path, "rest", True)
    assert not {g for g in got if g[0] == "sgsItemBackground"}, got


def test_family_attribute_with_no_control_or_emitter_is_still_flagged(tmp_path):
    got = _run(tmp_path, "rest", True)
    assert ("sgsItemOrphan", "L2") in got and ("sgsItemOrphan", "L4") in got, got


def test_rest_canvas_needs_the_route_and_the_declaration(tmp_path):
    assert ("sgsItemBackground", "L3") in _run(tmp_path / "a", "rest", False)
    assert ("sgsItemBackground", "L3") in _run(tmp_path / "b", None, True)
