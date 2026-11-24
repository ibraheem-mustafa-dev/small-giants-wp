"""Detector 1 follows a `data-*` attribute into the block's view script: text the script writes into the page is content.

A render that prints `esc_attr( $attributes['summaryTextOne'] )` into `data-summary-one` looked machine-facing to
Detector 1, so the attribute earned a veto and the `technical` role. The block's view script reads that attribute and
writes it into visible text, so the verdict is `visible-text`. These tests plant a block folder (block.json, render.php,
view script) and run the real classifier and the real aggregator over it.

Run with: python -m pytest plugins/sgs-blocks/scripts/tests/test_d1_data_attr_view_text.py
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]
DETECT = SCRIPTS / "content-role-detect"
sys.path.insert(0, str(DETECT))


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, DETECT / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


classify = _load("classify_detector1")
flow = _load("view_text_flow")
fingerprint_module = _load("fingerprint_content_roles")

VIEW_WRITES_TEXT = """
const shell = document.querySelector( '[data-sgs-demo]' );
const template = shell.dataset.demoText || '';
const caption = shell.querySelector( '.caption' );
const render = () => {
	const text = format( { template, count: 2 } );
	caption.textContent = text;
};
"""

VIEW_ONLY_PICKS_AN_ENTRY = """
const shell = document.querySelector( '[data-sgs-demo]' );
const axis = shell.dataset.demoText || '';
const labels = parse( shell.dataset.labels );
const caption = shell.querySelector( '.caption' );
caption.textContent = labels[ axis ];
"""


def _block(root: Path, view: str, name: str = "demo") -> Path:
    folder = root / "src" / "blocks" / name
    folder.mkdir(parents=True)
    (folder / "block.json").write_text(json.dumps({"name": f"sgs/{name}", "viewScriptModule": "file:./view.js"}), encoding="utf-8")
    (folder / "view.js").write_text(view, encoding="utf-8")
    (folder / "render.php").write_text("<?php\n", encoding="utf-8")
    return folder


def _row(render_file: Path, attr: str = "demoText", data_attr: str = "data-demo-text", block_slug: str | None = "sgs/demo") -> dict:
    statement = f"$out .= ' {data_attr}=\"' . esc_attr( $value ) . '\"';"
    return {
        "file": str(render_file), "block_slug": block_slug, "line": 10, "attr_key": attr, "func": "esc_attr",
        "statement": statement, "dynamic": False, "printf_context": None, "forward_context": None, "fragment": False,
    }


def _category(row: dict) -> str:
    return classify.resolve_final_category(row, row["func"].lower())


def test_a_data_attribute_the_view_script_writes_into_text_is_visible_text(tmp_path):
    folder = _block(tmp_path, VIEW_WRITES_TEXT)
    assert _category(_row(folder / "render.php")) == "visible-text"


def test_a_data_attribute_used_only_as_a_lookup_key_stays_not_content(tmp_path):
    folder = _block(tmp_path, VIEW_ONLY_PICKS_AN_ENTRY)
    assert _category(_row(folder / "render.php")) == "NOT-content"


def test_a_data_attribute_no_view_script_reads_stays_not_content(tmp_path):
    folder = _block(tmp_path, "const unrelated = 1;\n")
    assert _category(_row(folder / "render.php")) == "NOT-content"


def test_a_block_without_a_view_script_stays_not_content(tmp_path):
    folder = _block(tmp_path, "")
    (folder / "block.json").write_text(json.dumps({"name": "sgs/demo"}), encoding="utf-8")
    assert _category(_row(folder / "render.php")) == "NOT-content"


def test_a_sink_inside_a_comment_does_not_count(tmp_path):
    view = "const t = el.dataset.demoText;\n// caption.textContent = t;\n/* label.innerText = t; */\n"
    folder = _block(tmp_path, view)
    assert _category(_row(folder / "render.php")) == "NOT-content"


def test_the_attribute_read_by_getattribute_and_written_by_a_text_node_is_visible_text(tmp_path):
    view = "const t = el.getAttribute( 'data-demo-text' );\nel.append( document.createTextNode( t ) );\n"
    folder = _block(tmp_path, view)
    assert _category(_row(folder / "render.php")) == "visible-text"


def test_a_shared_include_resolves_the_block_by_its_slug(tmp_path):
    folder = _block(tmp_path, VIEW_WRITES_TEXT)
    include = tmp_path / "includes" / "shared.php"
    include.parent.mkdir()
    include.write_text("<?php\n", encoding="utf-8")
    assert _category(_row(include)) == "visible-text"
    assert _category(_row(include, block_slug=None)) == "NOT-content"
    assert folder.is_dir()


def test_a_name_hint_still_decides_without_a_view_script(tmp_path):
    folder = _block(tmp_path, "")
    assert _category(_row(folder / "render.php", attr="expiredMessage", data_attr="data-expired-message")) == "visible-text"


def test_the_dataset_key_is_the_camel_cased_data_attribute():
    assert flow.data_attr_to_dataset_key("data-summary-one") == "summaryOne"
    assert flow.data_attr_to_dataset_key("data-sgs-pick-group") == "sgsPickGroup"


def test_the_aggregator_files_the_attribute_content_instead_of_vetoing_it(tmp_path):
    folder = _block(tmp_path, VIEW_WRITES_TEXT)
    row = _row(folder / "render.php")
    row["final_category"] = _category(row)
    control = {"block_slug": "sgs/demo", "attr_key": "demoText", "category": "content-control", "control": "TextControl"}
    result = fingerprint_module.fingerprint({"D1": [row], "D2": [control], "D3": []}, {("sgs/demo", "demoText")})
    assert [(a["attr_name"], a["role"]) for a in result["assignments"]] == [("demoText", "text-content")]
    assert result["vetoed"] == []


def test_the_aggregator_still_vetoes_the_attribute_when_the_view_script_never_shows_it(tmp_path):
    folder = _block(tmp_path, VIEW_ONLY_PICKS_AN_ENTRY)
    row = _row(folder / "render.php")
    row["final_category"] = _category(row)
    control = {"block_slug": "sgs/demo", "attr_key": "demoText", "category": "content-control", "control": "TextControl"}
    result = fingerprint_module.fingerprint({"D1": [row], "D2": [control], "D3": []}, {("sgs/demo", "demoText")})
    assert result["assignments"] == []
    assert [v["attr_name"] for v in result["vetoed"]] == ["demoText"]


@pytest.mark.parametrize("source,expected", [
    ("const t = el.dataset.demoText;\nel.textContent = t;", True),
    ("el.textContent = el.dataset.demoText;", True),
    ("const { demoText } = el.dataset;\nel.innerHTML = demoText;", True),
    ("const t = el.dataset.demoText;\nconst f = () => t;\nel.textContent = f;", False),
    ("const t = el.dataset.demoText;\nif ( el.textContent === t ) { run(); }", False),
    ("const t = el.dataset.demoText;\nel.classList.add( t );", False),
])
def test_the_text_sink_rule_on_small_sources(source, expected):
    assert flow.source_reaches_text_sink(source, "data-demo-text") is expected
