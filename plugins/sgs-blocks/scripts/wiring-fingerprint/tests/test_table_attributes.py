"""Settings the commerce-look table builds (row prefix plus column suffix) are wired through the table, not by literal:
the panels file credits the control (L2) and table.php the front end (L4). The names come from the table's own
selectors.json through the generator's reader (wf_table.py), so a column dropped from its row is reported again."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from wf_channel import Channel  # noqa: E402
from wf_extensions import scan_extensions  # noqa: E402
from wf_paint import PaintClassifier  # noqa: E402
from wf_table import TABLE_REL, table_attribute_names  # noqa: E402

PANELS = "src/blocks/extensions/commerce-look/table-panels.js"
TABLE_PHP = "includes/woocommerce/commerce-look/table.php"
COLUMNS = {"gap": {"kind": "length", "css": "gap", "role": "layout", "attrs": [["Gap", "string"]]},
           "margin": {"kind": "box", "css": "margin", "role": "layout", "attrs": [["Margin", "object"]]}}


def _plugin(tmp_path: Path, row_columns: list[str]) -> Path:
    table = tmp_path / TABLE_REL
    table.parent.mkdir(parents=True)
    table.write_text(json.dumps({"columns": COLUMNS, "rows": {"bar": {"columns": row_columns}}}), encoding="utf-8")
    return tmp_path


def _run(tmp_path: Path, row_columns: list[str], with_files: bool = True):
    names = table_attribute_names(_plugin(tmp_path, row_columns))
    entry = {"id": "commerce-look", "file": "commerce-look/index.js", "rule": {"mode": "named", "blocks": ["woocommerce/cart"]},
             "attributes": {"sgsBarGap": {"type": "string", "role": "layout", "css_property": "gap"},
                            "sgsBarMargin": {"type": "object", "role": "layout", "css_property": "margin"}}}
    files = {PANELS: {"prefixJsx": [], "prefixSuffixes": [], "setKeys": [], "literals": [], "callsSet": False,
                      "canvasReads": {}, "blockListBlock": False}}
    inp = SimpleNamespace(roster=[entry], table_names=names,
                          facts={"extensions": [PANELS] if with_files else [], "extensionReach": {}, "files": files})
    fe = SimpleNamespace(
        flow_texts=lambda *a, **k: Channel(),
        hook_reach=lambda: [SimpleNamespace(path=TABLE_PHP)] if with_files else [],
        hook_derived=lambda: {},
        analyser=SimpleNamespace(emits_css=lambda h: True),
    )
    css = SimpleNamespace(has_class=lambda c: False, cp_read=lambda c: False)
    findings, _records = scan_extensions(inp, fe, css, "", SimpleNamespace(files=files, plugin=tmp_path), PaintClassifier([]))
    return names, {(f["attr"], f["link"]) for f in findings}


def test_reader_names_row_prefix_plus_column_suffix(tmp_path):
    names, _ = _run(tmp_path, ["gap", "margin"])
    assert names == {"sgsBarGap", "sgsBarMargin"}


def test_table_attribute_is_credited_a_control_and_an_emitter(tmp_path):
    _, got = _run(tmp_path, ["gap", "margin"])
    assert not {g for g in got if g[1] in ("L2", "L4")}, got


def test_attribute_whose_column_is_dropped_from_its_row_is_still_reported(tmp_path):
    names, got = _run(tmp_path, ["margin"])
    assert "sgsBarGap" not in names
    assert ("sgsBarGap", "L2") in got and ("sgsBarGap", "L4") in got, got
    assert not {g for g in got if g[0] == "sgsBarMargin" and g[1] in ("L2", "L4")}, got


def test_table_attribute_is_not_credited_when_the_panels_file_and_emitter_are_not_reached(tmp_path):
    _, got = _run(tmp_path, ["gap", "margin"], with_files=False)
    assert ("sgsBarGap", "L2") in got and ("sgsBarGap", "L4") in got, got
