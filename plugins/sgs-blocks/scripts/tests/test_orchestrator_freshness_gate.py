"""FR-33-12 freshness gate: the source-hash decision for Claude Design drafts.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest tests/test_orchestrator_freshness_gate.py -q
"""
from __future__ import annotations

import importlib.util
import json
import sys
import types
from pathlib import Path

import pytest

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from shared_utils import draft_css_sha256, draft_source_sha256  # noqa: E402


def _load_orchestrator() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(
        "sgs_clone_orchestrator_freshness", str(_SCRIPTS_DIR / "sgs-clone-orchestrator.py")
    )
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


orch = _load_orchestrator()

STATIC = "<html><head><style>body{color:red}</style></head><body><p>hi</p></body></html>"
CLAUDE_DESIGN = (
    "<html><head><style>body{margin:0}</style></head><body><x-dc>"
    '<div style="color:#111111">hi</div></x-dc>'
    '<script type="text/x-dc">class P { static ACC = {navy:{acc:"#3A4A6B"}} }</script></body></html>'
)
README = "# Design tokens\n"


def _snap(html, readme=None, with_source=True, source=None):
    ex = {"draft_css_sha256": draft_css_sha256(html), "extractor_version": "1.0"}
    if with_source:
        ex["draft_source_sha256"] = source or draft_source_sha256(html, readme)
    return {"_sgsExtractor": ex}


# --------------------------------------------------------------------------- the pure decision


def test_match_passes():
    assert orch._source_freshness_problem(_snap(CLAUDE_DESIGN, README), CLAUDE_DESIGN, README) is None


def test_mismatch_after_inline_style_change_halts():
    snap = _snap(CLAUDE_DESIGN, README)
    changed = CLAUDE_DESIGN.replace("#111111", "#111112")
    assert "changed" in orch._source_freshness_problem(snap, changed, README)


def test_mismatch_after_script_accent_change_halts():
    snap = _snap(CLAUDE_DESIGN, README)
    changed = CLAUDE_DESIGN.replace("#3A4A6B", "#3A4A6C")
    assert orch._source_freshness_problem(snap, changed, README)


def test_mismatch_after_readme_change_halts():
    snap = _snap(CLAUDE_DESIGN, README)
    assert orch._source_freshness_problem(snap, CLAUDE_DESIGN, README + "x")


def test_missing_key_on_a_claude_design_draft_halts():
    snap = _snap(CLAUDE_DESIGN, README, with_source=False)
    assert "no draft_source_sha256" in orch._source_freshness_problem(snap, CLAUDE_DESIGN, README)


def test_static_draft_ignores_the_field():
    assert orch._source_freshness_problem(_snap(STATIC, with_source=False), STATIC, None) is None
    assert orch._source_freshness_problem(_snap(STATIC, source="0" * 64), STATIC, None) is None


# --------------------------------------------------------------------------- the whole gate


def _setup(tmp_path, monkeypatch, html, snap, readme=None):
    monkeypatch.setattr(orch, "REPO", tmp_path)
    draft_dir = tmp_path / "sites" / "acme" / "mockups"
    draft_dir.mkdir(parents=True)
    draft = draft_dir / "index.html"
    draft.write_text(html, encoding="utf-8")
    if readme is not None:
        (draft_dir / "README.md").write_text(readme, encoding="utf-8")
    (tmp_path / "sites" / "acme" / "theme-snapshot.json").write_text(json.dumps(snap), encoding="utf-8")
    return draft


def test_gate_passes_for_a_fresh_claude_design_snapshot(tmp_path, monkeypatch):
    draft = _setup(tmp_path, monkeypatch, CLAUDE_DESIGN, _snap(CLAUDE_DESIGN, README), README)
    orch._freshness_gate(draft, "acme", False)


def test_gate_halts_when_the_readme_beside_the_original_draft_changes(tmp_path, monkeypatch):
    draft = _setup(tmp_path, monkeypatch, CLAUDE_DESIGN, _snap(CLAUDE_DESIGN, README), README)
    (draft.parent / "README.md").write_text(README + "new row\n", encoding="utf-8")
    with pytest.raises(SystemExit) as exc:
        orch._freshness_gate(draft, "acme", False)
    assert "freshness gate" in str(exc.value) and "extract.py" in str(exc.value)


def test_gate_halts_when_the_snapshot_has_no_source_key(tmp_path, monkeypatch):
    snap = _snap(CLAUDE_DESIGN, README, with_source=False)
    draft = _setup(tmp_path, monkeypatch, CLAUDE_DESIGN, snap, README)
    with pytest.raises(SystemExit) as exc:
        orch._freshness_gate(draft, "acme", False)
    assert "draft_source_sha256" in str(exc.value)


def test_gate_static_draft_behaviour_is_unchanged(tmp_path, monkeypatch):
    draft = _setup(tmp_path, monkeypatch, STATIC, _snap(STATIC, with_source=False))
    orch._freshness_gate(draft, "acme", False)


def test_skip_flag_still_bypasses_a_stale_claude_design_snapshot(tmp_path, monkeypatch):
    snap = _snap(CLAUDE_DESIGN, README, with_source=False)
    draft = _setup(tmp_path, monkeypatch, CLAUDE_DESIGN, snap, README)
    orch._freshness_gate(draft, "acme", True)
