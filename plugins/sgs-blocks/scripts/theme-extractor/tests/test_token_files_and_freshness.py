"""FR-33-1 / FR-33-3 / FR-33-9 / FR-33-12: token files, no synthesised base, MANIFEST freshness key.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_token_files_and_freshness.py -q

Browser-free and network-free: facts come from the checked-in fixture, drafts are written to tmp_path.
"""
from __future__ import annotations

import copy
import hashlib
import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
SCRIPTS = PKG.parent
REPO = SCRIPTS.parents[2]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(SCRIPTS))

import extract  # noqa: E402
import typography  # noqa: E402
from shared_utils import draft_source_sha256, manifest_source_hashes  # noqa: E402

FACTS = json.loads((HERE / "fixtures" / "eye-care-computed-facts.json").read_text(encoding="utf-8"))

COLORS_CSS = """/* Brand palette. One-off colours (the review star #D9981C) stay hex in the drafts. */
:root {
  --brand: #0A7EA8;
  --unused-teal: #123456;
  --star: #D9981C;
  --veil: rgba(10, 126, 168, .3);
}
"""
DRAFT = """<!doctype html><html><head><style>body { margin: 0; }</style></head>
<body><x-dc>
<a style="background: #0A7EA8; color: #FFFFFF">Book</a>
<span style="color: #D9981C">star</span>
<button style="background: #ABCDEF; color: #FFFFFF">a</button><button style="background: #ABCDEF; color: #FFFFFF">b</button><button style="background: #ABCDEF; color: #FFFFFF">c</button>
</x-dc><script type="text/x-dc">class P {}</script></body></html>
"""


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _export(root: pathlib.Path, colors: str = COLORS_CSS, readme: str = "# README\n") -> pathlib.Path:
    (root / "tokens").mkdir(parents=True)
    (root / "tokens" / "colors.css").write_text(colors, encoding="utf-8")
    (root / "README.md").write_text(readme, encoding="utf-8")
    (root / "Home.dc.html").write_text(DRAFT, encoding="utf-8")
    files = [{"path": "Home.dc.html", "bytes": 1, "sha256": _sha(DRAFT)},
             {"path": "README.md", "bytes": 1, "sha256": _sha(readme)},
             {"path": "tokens/colors.css", "bytes": 1, "sha256": _sha(colors)}]
    (root / "MANIFEST.json").write_text(json.dumps({"entry_drafts": ["Home.dc.html"], "files": files}),
                                        encoding="utf-8")
    return root


def _build(root: pathlib.Path, trace: list, facts: dict | None = None) -> dict:
    html = (root / "Home.dc.html").read_text(encoding="utf-8")
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    return extract.build_snapshot("acme", extract.extract_css(html), facts or FACTS, html, baseline, trace, REPO,
                                  draft_dir=root, draft_name="Home.dc.html")


# --------------------------------------------------------------------------- FR-33-1 / FR-33-9


def test_a_token_the_code_uses_is_emitted_declared_and_an_unused_one_is_gap_logged(tmp_path):
    root = _export(tmp_path / "export")
    trace: list = []
    snap = _build(root, trace)
    palette = {e["slug"]: e for e in snap["settings"]["color"]["palette"]}
    assert palette["custom-brand"]["color"] == "#0A7EA8"
    assert palette["custom-brand"]["_source"] == "declared"
    assert "custom-unused-teal" not in palette
    gaps = [r for r in trace if r.get("kind") == "gap" and "--unused-teal" in r.get("what", "")]
    assert gaps and "never uses this exact value" in gaps[0]["reason"]


def test_a_value_the_token_file_marks_one_off_stays_a_one_off(tmp_path):
    root = _export(tmp_path / "export")
    trace: list = []
    snap = _build(root, trace)
    assert "custom-star" not in {e["slug"] for e in snap["settings"]["color"]["palette"]}
    notes = [r for r in trace if "--star" in r.get("what", "")]
    assert notes and "one-off" in notes[0]["reason"]


def test_a_translucent_token_goes_to_the_trace_not_the_palette(tmp_path):
    root = _export(tmp_path / "export")
    trace: list = []
    snap = _build(root, trace)
    assert "custom-veil" not in {e["slug"] for e in snap["settings"]["color"]["palette"]}
    assert any("--veil" in r.get("what", "") for r in trace)


def test_the_readme_never_supplies_palette_colours_for_an_export_with_tokens(tmp_path):
    readme = "| Token | Hex | Use |\n|---|---|---|\n| Accent | #ABCDEF | accent buttons |\n"
    root = _export(tmp_path / "export", readme=readme)
    snap = _build(root, [])
    assert "#ABCDEF" not in {e["color"].upper() for e in snap["settings"]["color"]["palette"]}


# --------------------------------------------------------------------------- FR-33-3


def test_no_representative_paragraph_refuses_and_names_what_is_missing():
    facts = copy.deepcopy(FACTS)
    facts["paragraphs"] = []
    with pytest.raises(typography.DeclaredValueMissing, match="no representative rendered <p>"):
        typography.base_typography(facts, [])


def test_a_paragraph_without_a_measured_value_refuses_rather_than_filling_it():
    facts = copy.deepcopy(FACTS)
    facts["paragraphs"] = [{"inChrome": False, "textLen": 80, "area": 10, "fontFamily": "Outfit, sans-serif",
                            "fontSize": "17px", "lineHeight": "", "fontWeight": "400"}]
    with pytest.raises(typography.DeclaredValueMissing, match="lineHeight"):
        typography.base_typography(facts, [])


def test_a_representative_paragraph_emits_the_measured_values():
    facts = copy.deepcopy(FACTS)
    facts["paragraphs"] = [{"inChrome": False, "textLen": 80, "area": 10, "fontFamily": "Outfit, sans-serif",
                            "fontSize": "17px", "lineHeight": "28px", "fontWeight": "300", "textSample": "x"}]
    out = typography.base_typography(facts, [])
    assert (out["fontSize"], out["lineHeight"], out["fontWeight"]) == ("17px", "1.647", "300")


def test_the_extractor_exits_non_zero_when_it_has_no_paragraph(tmp_path, capsys):
    root = _export(tmp_path / "export")
    facts = copy.deepcopy(FACTS)
    facts["paragraphs"] = []
    facts_path = tmp_path / "facts.json"
    facts_path.write_text(json.dumps(facts), encoding="utf-8")
    code = extract.main(["--client", "acme", "--draft", str(root / "Home.dc.html"), "--facts", str(facts_path),
                         "--out", str(tmp_path / "out.json"), "--trace", str(tmp_path / "t.json")])
    assert code == 8
    assert "no representative rendered <p>" in capsys.readouterr().err
    assert not (tmp_path / "out.json").exists()


def test_no_heading_line_height_is_never_synthesised():
    facts = copy.deepcopy(FACTS)
    facts["headings"] = {}
    trace: list = []
    assert "lineHeight" not in typography.heading_base(facts, trace)
    assert any(r.get("kind") == "gap" for r in trace)


# --------------------------------------------------------------------------- FR-33-12


def test_the_manifest_key_ignores_the_readme_and_follows_the_token_files(tmp_path):
    a = _export(tmp_path / "a")
    b = _export(tmp_path / "b", readme="# A completely different README\n")
    c = _export(tmp_path / "c", colors=COLORS_CSS.replace("#0A7EA8", "#0A7EA9"))
    html = DRAFT
    assert draft_source_sha256(html, a) == draft_source_sha256(html, b)
    assert draft_source_sha256(html, a) != draft_source_sha256(html, c)


def test_the_snapshot_records_the_manifest_hashes_of_drafts_and_tokens_only(tmp_path):
    root = _export(tmp_path / "export")
    hashes = manifest_source_hashes(root)
    assert sorted(hashes) == ["Home.dc.html", "tokens/colors.css"]
    snap = _build(root, [])
    assert snap["_sgsExtractor"]["manifest_sha256"] == hashes
    assert snap["_sgsExtractor"]["draft_source_sha256"] == draft_source_sha256(DRAFT, root)
