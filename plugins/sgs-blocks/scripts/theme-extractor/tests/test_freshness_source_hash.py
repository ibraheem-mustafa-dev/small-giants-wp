"""FR-33-12 source hash: a Claude Design draft's inline styles, script and README reach the key.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_freshness_source_hash.py -q

Browser-free and network-free: the snapshot tests reuse the checked-in Mama's facts fixture.
"""
from __future__ import annotations

import json
import pathlib
import sys
import types

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
SCRIPTS = PKG.parent
REPO = SCRIPTS.parents[2]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(SCRIPTS))

import extract  # noqa: E402
import shared_utils  # noqa: E402
from shared_utils import draft_css_sha256, draft_source_sha256, read_readme_text  # noqa: E402

MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"
FACTS = PKG / "mamas-computed-facts.json"

CLAUDE_DESIGN = """<!doctype html>
<html><head><style>:root { --x: 1; }</style></head>
<body>
<x-dc data-props='{"accent":{"editor":"enum","default":"taupe"}}'>
<div style="color: #111111; padding: 8px">Hello</div>
<a style="color: #222222" style-hover="color: #333333">Link</a>
</x-dc>
<script type="text/x-dc">
class Page { static ACC = { navy: { acc: '#3A4A6B', ink: '#2B3A55' } }; }
</script>
</body></html>
"""
README = "# Design tokens\n\n| Role | Hex |\n|---|---|\n| Ink | #111111 |\n"


def _h(html=CLAUDE_DESIGN, readme=README):
    return draft_source_sha256(html, readme)


def test_static_draft_returns_none():
    assert draft_source_sha256(MAMAS.read_text(encoding="utf-8"), README) is None


def test_claude_design_draft_returns_a_sha256_hex():
    value = _h()
    assert value is not None and len(value) == 64 and int(value, 16) >= 0


def test_hash_is_deterministic():
    assert _h() == _h()


def test_inline_style_colour_change_changes_the_hash():
    assert _h(CLAUDE_DESIGN.replace("color: #111111", "color: #111112")) != _h()


def test_style_hover_change_changes_the_hash():
    assert _h(CLAUDE_DESIGN.replace("color: #333333", "color: #333334")) != _h()


def test_script_accent_change_changes_the_hash():
    assert _h(CLAUDE_DESIGN.replace("#3A4A6B", "#3A4A6C")) != _h()


def test_readme_change_changes_the_hash():
    assert _h(readme=README + "| Accent | #9C8B78 |\n") != _h()


def test_missing_readme_differs_from_present_readme():
    assert _h(readme=None) != _h()


def test_style_block_change_changes_the_hash():
    assert _h(CLAUDE_DESIGN.replace("--x: 1", "--x: 2")) != _h()


def test_crlf_and_lf_hash_the_same():
    crlf_html = CLAUDE_DESIGN.replace("\n", "\r\n")
    crlf_readme = README.replace("\n", "\r\n")
    assert _h(crlf_html, crlf_readme) == _h()


def test_data_style_attribute_is_not_read_as_an_inline_style():
    # A `data-style` attribute is not a style attribute: changing it must not move the hash.
    with_data = CLAUDE_DESIGN.replace("<div ", '<div data-style="a" ')
    changed = CLAUDE_DESIGN.replace("<div ", '<div data-style="b" ')
    assert _h(with_data) == _h(changed)


def test_css_hash_is_untouched_by_the_new_function():
    # draft_css_sha256 must keep hashing the <style> text only (Mama's key stays as it was).
    html_a = CLAUDE_DESIGN
    html_b = CLAUDE_DESIGN.replace("color: #111111", "color: #999999")
    assert draft_css_sha256(html_a) == draft_css_sha256(html_b)


def test_read_readme_text_is_case_insensitive_and_none_when_missing(tmp_path):
    assert read_readme_text(tmp_path) is None
    assert read_readme_text(None) is None
    (tmp_path / "ReadMe.MD").write_text(README, encoding="utf-8")
    assert read_readme_text(tmp_path) == README


# --------------------------------------------------------------------------- build_snapshot


def _baseline():
    return json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))


def _build(html, draft_dir):
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    css = shared_utils.extract_css(MAMAS.read_text(encoding="utf-8"))
    return extract.build_snapshot("mamas-munches", css, facts, html, _baseline(), [], REPO, draft_dir=draft_dir)


def _dsl_html():
    return MAMAS.read_text(encoding="utf-8") + '\n<x-dc></x-dc>\n<script type="text/x-dc">class P {}</script>\n'


def test_static_draft_snapshot_has_no_source_key_and_identical_bytes():
    html = MAMAS.read_text(encoding="utf-8")
    with_dir = _build(html, MAMAS.parent)
    without_dir = _build(html, None)
    assert set(with_dir["_sgsExtractor"]) == {"draft_css_sha256", "extractor_version"}
    dump = lambda s: json.dumps(s, indent=2, ensure_ascii=False)  # noqa: E731
    assert dump(with_dir) == dump(without_dir)


def test_claude_design_snapshot_embeds_the_source_hash_including_readme(tmp_path):
    (tmp_path / "README.md").write_text(README, encoding="utf-8")
    html = _dsl_html()
    snap = _build(html, tmp_path)
    assert snap["_sgsExtractor"]["draft_source_sha256"] == draft_source_sha256(html, README)
    (tmp_path / "README.md").write_text(README + "more\n", encoding="utf-8")
    assert _build(html, tmp_path)["_sgsExtractor"]["draft_source_sha256"] != snap["_sgsExtractor"]["draft_source_sha256"]


def test_claude_design_snapshot_without_readme_uses_none(tmp_path):
    html = _dsl_html()
    snap = _build(html, tmp_path)
    assert snap["_sgsExtractor"]["draft_source_sha256"] == draft_source_sha256(html, None)


def test_merge_onto_keeps_the_source_hash(tmp_path):
    snap = _build(_dsl_html(), tmp_path)
    expected = snap["_sgsExtractor"]["draft_source_sha256"]
    merged = extract.merge_onto(snap, {"settings": {}, "styles": {}}, [])
    assert merged["_sgsExtractor"]["draft_source_sha256"] == expected


# --------------------------------------------------------------------------- run_measure


def _fake_run(monkeypatch, **result):
    seen = {}

    def fake(cmd, **kwargs):
        seen.update(kwargs)
        return types.SimpleNamespace(**result)

    monkeypatch.setattr(extract.subprocess, "run", fake)
    return seen


def test_run_measure_decodes_utf8_explicitly(monkeypatch):
    seen = _fake_run(monkeypatch, returncode=0, stdout='{"a": "café"}', stderr="")
    assert extract.run_measure(pathlib.Path("x.html")) == {"a": "café"}
    assert seen["encoding"] == "utf-8" and seen["errors"] == "replace"


def test_run_measure_raises_a_clear_error_on_empty_stdout(monkeypatch):
    _fake_run(monkeypatch, returncode=0, stdout=None, stderr="reader thread died")
    with pytest.raises(RuntimeError, match="no output"):
        extract.run_measure(pathlib.Path("x.html"))
    _fake_run(monkeypatch, returncode=0, stdout="  \n", stderr="")
    with pytest.raises(RuntimeError, match="no output"):
        extract.run_measure(pathlib.Path("x.html"))


def test_run_measure_raises_on_non_zero_exit(monkeypatch):
    _fake_run(monkeypatch, returncode=1, stdout=None, stderr=None)
    with pytest.raises(RuntimeError, match="exit 1"):
        extract.run_measure(pathlib.Path("x.html"))
