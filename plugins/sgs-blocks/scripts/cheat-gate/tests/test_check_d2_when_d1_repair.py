"""test_check_d2_when_d1_repair.py — regression suite for the 2026-07-05 gate repair.

Check #6 (D2-when-D1, Spec 31 §7a item 6) had been a SILENT NO-OP since wiring
(STOP-6 class): its pipeline-state root pointed at scripts/pipeline-state while
the orchestrator writes runs at the REPO ROOT, so it always took the
graceful-skip path and returned 0 violations. Two further blind spots: the slug
regex captured BEM element tails ('.sgs-trust-bar__inner' → slug
'trust-bar__inner', never matching the DB), and non-device F-ii @media rules
(the spec-sanctioned FR-31-5.2.3 passthrough) were flagged as strandings.

Plant-tested per STOP-31: fires on each real stranding shape, silent on the
sanctioned/clean shapes.

Run from the canonical cwd plugins/sgs-blocks/scripts:
    python -m pytest cheat-gate/tests/test_check_d2_when_d1_repair.py -q --import-mode=importlib
"""
from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest

_PKG_DIR = Path(__file__).resolve().parents[1]  # scripts/cheat-gate/
_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def _bootstrap() -> None:
    if "cheat_gate" not in sys.modules:
        pkg = types.ModuleType("cheat_gate")
        pkg.__path__ = [str(_PKG_DIR)]
        pkg.__package__ = "cheat_gate"
        sys.modules["cheat_gate"] = pkg
    for name in ("models", "check_d2_when_d1"):
        mod_id = f"cheat_gate.{name}"
        if mod_id in sys.modules:
            continue
        spec = importlib.util.spec_from_file_location(mod_id, str(_PKG_DIR / f"{name}.py"))
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        sys.modules[mod_id] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]


_bootstrap()

from cheat_gate import check_d2_when_d1 as c6  # noqa: E402

_needs_db = pytest.mark.skipif(not _DB_PATH.exists(), reason="sgs-framework.db absent")


def test_pipeline_state_root_is_repo_root():
    """The orchestrator writes runs at <repo>/pipeline-state — the old
    scripts/pipeline-state root made the whole check a silent no-op."""
    assert c6._PIPELINE_STATE.name == "pipeline-state"
    # repo root = the directory that contains plugins/
    assert (c6._PIPELINE_STATE.parent / "plugins").exists(), c6._PIPELINE_STATE


def _run_on(tmp_path: Path, css: str):
    (tmp_path / "variation-d0-d2.css").write_text(css, encoding="utf-8")
    return c6.run(run_dir=tmp_path)


@_needs_db
def test_fires_on_element_class_stranding(tmp_path):
    """'.sgs-trust-bar__label{font-weight}' must resolve to sgs/trust-bar
    (labelFontWeight exists) — the old regex captured 'trust-bar__label' and
    never matched the DB."""
    v = _run_on(tmp_path, "/* D2 - */\n.page-id-9 .sgs-trust-bar__label{ font-weight: 500 }\n")
    assert [x.key for x in v] == ["d2d1:sgs/trust-bar:font-weight"]


@_needs_db
def test_silent_on_fii_non_device_media(tmp_path):
    """A 600px rule is the spec-sanctioned F-ii passthrough (FR-31-5.2.3) —
    never a stranding, even when a D1 grid attr exists."""
    v = _run_on(
        tmp_path,
        "/* D2 - */\n@media (min-width: 600px) { "
        ".page-id-9 .sgs-feature-grid { grid-template-columns: repeat(4,1fr) } }\n",
    )
    assert v == []


@_needs_db
def test_fires_inside_device_tier_media(tmp_path):
    """A device-tier (768px) rule in D2 with a D1 tier destination IS a
    stranding — device media stays in scope."""
    v = _run_on(
        tmp_path,
        "/* D2 - */\n@media (min-width: 768px) { "
        ".page-id-9 .sgs-heading { font-size: 36px } }\n",
    )
    assert [x.key for x in v] == ["d2d1:sgs/heading:font-size"]


@_needs_db
def test_silent_on_media_without_px(tmp_path):
    """prefers-reduced-motion etc. carry no px threshold — excised, not flagged."""
    v = _run_on(
        tmp_path,
        "/* D2 - */\n@media (prefers-reduced-motion: reduce) { "
        ".page-id-9 .sgs-heading { font-size: 36px } }\n",
    )
    assert v == []


@_needs_db
def test_modifier_class_resolves_to_base_block(tmp_path):
    """'.sgs-button--ghost{...}' resolves to sgs/button (fontSize suffix-matches).

    NOTE deliberately font-size, not border-color: button declares
    `colourBorder`, which does NOT end with the `BorderColour` suffix — that
    attr-naming blindness is the ROUTER/DB defect tracked under the H1 D2 work,
    invisible to this gate by design (the gate answers "does a suffix-matching
    destination exist", and for border-color on button none does)."""
    v = _run_on(tmp_path, "/* D2 - */\n.page-id-9 .sgs-button--ghost{ font-size: 13px }\n")
    assert [x.key for x in v] == ["d2d1:sgs/button:font-size"]


def test_missing_run_dir_still_graceful(tmp_path):
    v = c6.run(run_dir=tmp_path / "nope")
    assert v == []
