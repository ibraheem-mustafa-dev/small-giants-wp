"""C4 on a Spec 48A export: a folder holding ``MANIFEST.json`` reads no README at all.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_manifest_export_readme.py -q

The draft and facts are the cached optician-client ones (no browser, no network). A README stating a 1100px
max width and a 14px radius must leave ``settings.layout`` and the radii exactly as a folder with no README
leaves them; the same README beside a pre-48A draft (no MANIFEST) still applies.
"""
from __future__ import annotations

import json
import pathlib
import shutil
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(PKG.parent))

import extract  # noqa: E402

DRAFT = REPO / "sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html"
FACTS = HERE / "fixtures" / "eye-care-computed-facts.json"
README = """# Handoff

## Design tokens

**Colour**
| Token | Value | Use |
|---|---|---|
| Page background | `#faf8f5` | Body |
| Ink | `#141414` | Primary text |

**Spacing**
- Max content width: `1100px`, centred.

**Other**
- Border radius: `14px` on every card.
"""


@pytest.fixture(autouse=True)
def _no_font_network(monkeypatch):
    monkeypatch.setattr(extract, "_self_host_google_font", lambda *a, **k: None)


def _snapshot(folder: pathlib.Path) -> dict:
    html = DRAFT.read_text(encoding="utf-8")
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    return extract.build_snapshot("optician-client", extract.extract_css(html), facts, html, baseline, [], REPO,
                                  draft_dir=folder)


def _folder(tmp_path: pathlib.Path, name: str, manifest: bool, readme: bool) -> pathlib.Path:
    folder = tmp_path / name
    folder.mkdir()
    shutil.copy(DRAFT, folder / DRAFT.name)
    if manifest:
        (folder / "MANIFEST.json").write_text(json.dumps({"schema_version": "1.0", "entry_drafts": [DRAFT.name],
                                                          "files": []}), encoding="utf-8")
    if readme:
        (folder / "README.md").write_text(README, encoding="utf-8")
    return folder


def _layout_and_radii(snap: dict) -> tuple:
    settings = snap.get("settings", {})
    return (json.dumps(settings.get("layout"), sort_keys=True),
            json.dumps((settings.get("custom") or {}).get("borderRadius"), sort_keys=True))


def test_a_manifest_export_ignores_the_readme_layout_and_radius(tmp_path):
    with_readme = _snapshot(_folder(tmp_path, "with", manifest=True, readme=True))
    without = _snapshot(_folder(tmp_path, "without", manifest=True, readme=False))
    assert _layout_and_radii(with_readme) == _layout_and_radii(without)
    assert "1100px" not in json.dumps(with_readme["settings"].get("layout"))
    assert "14px" not in json.dumps((with_readme["settings"].get("custom") or {}).get("borderRadius"))


def test_a_manifest_export_gets_no_readme_declared_design(tmp_path):
    folder = _folder(tmp_path, "m", manifest=True, readme=True)
    design = extract._declared_design(folder, "<html></html>", False)
    assert design is None


def test_a_pre_48a_draft_still_reads_the_readme(tmp_path):
    folder = _folder(tmp_path, "old", manifest=False, readme=True)
    design = extract._declared_design(folder, "<html></html>", False)
    assert design is not None
    assert design[0]["layout"].get("max_content_width") == "1100px"
    snap = _snapshot(folder)
    assert "1100px" in json.dumps(snap["settings"].get("layout"))
    assert "14px" in json.dumps(snap["settings"]["custom"]["borderRadius"])
