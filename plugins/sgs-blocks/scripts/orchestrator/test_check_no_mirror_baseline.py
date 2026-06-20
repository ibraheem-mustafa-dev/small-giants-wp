#!/usr/bin/env python3
"""
test_check_no_mirror_baseline.py — pytest suite for the --baseline / --update-baseline
additions to check_no_mirror.py.

Covers:
  (i)  Real run with committed baseline → exit 0 (all 13 violations grandfathered
       via 10 unique keys).
  (ii) Synthetic run with ONE new draft-class violation not in the baseline
       → exit 1 with the NEW-violation message.
  (iii) --report (no baseline) → always exit 0.

All tests are self-contained: they use a real extract.json from the committed
pipeline-state run plus an in-memory/temp-dir synthetic extract.json.
No network or npm build required.

Run:
    python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_check_no_mirror_baseline.py -v
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Load the module under test (avoids adding orchestrator to sys.path globally)
# ---------------------------------------------------------------------------

HERE = Path(__file__).parent
MODULE_PATH = HERE / "check_no_mirror.py"

_spec = importlib.util.spec_from_file_location("check_no_mirror", MODULE_PATH)
_mod = importlib.util.module_from_spec(_spec)
sys.modules["check_no_mirror"] = _mod
_spec.loader.exec_module(_mod)

# Convenience aliases
main = _mod.main
collect_violation_keys = _mod.collect_violation_keys
write_baseline = _mod.write_baseline
load_baseline = _mod.load_baseline

# ---------------------------------------------------------------------------
# Paths to the committed run and baseline
# ---------------------------------------------------------------------------

REPO_ROOT = HERE.parents[3]
COMMITTED_RUN = REPO_ROOT / "pipeline-state" / "mamas-munches-homepage-2026-06-16-181545"
COMMITTED_BASELINE = HERE / "check-no-mirror-baseline.json"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Minimal block_markup containing one clean sgs/container and one NEW violation
_SYNTHETIC_EXTRA_BLOCK = "sgs/container"
_SYNTHETIC_EXTRA_CLASS = "sgs-fake__widget"

def _make_synthetic_extract(tmp_path: Path, extra_class: str | None = None) -> Path:
    """
    Copy the committed extract.patched.json to tmp_path and optionally inject
    one extra wp:sgs/container block with a NEW draft-class className.
    Returns the path of the synthetic run directory.
    """
    run_dir = tmp_path / "synthetic-run"
    run_dir.mkdir()

    # Load the real extract
    src = COMMITTED_RUN / "extract.patched.json"
    data = json.loads(src.read_text(encoding="utf-8"))
    markup: str = data.get("block_markup", "")

    if extra_class:
        # Append a NEW block with the injected class
        extra_block = (
            f'\n<!-- wp:sgs/container {{"className":"{extra_class}"}} -->'
            f'\n<!-- /wp:sgs/container -->'
        )
        markup = markup + extra_block

    data["block_markup"] = markup
    (run_dir / "extract.patched.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return run_dir


# ---------------------------------------------------------------------------
# (i) Real run + committed baseline → exit 0 (all grandfathered)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not COMMITTED_RUN.exists(),
    reason="Committed pipeline-state run not present in this checkout",
)
@pytest.mark.skipif(
    not COMMITTED_BASELINE.exists(),
    reason="Committed baseline file not present in this checkout",
)
def test_real_run_with_baseline_exits_zero():
    """All 13 legacy violations are in the baseline → exit 0 (PASS)."""
    rc = main([
        str(COMMITTED_RUN),
        "--enforce",
        "--baseline", str(COMMITTED_BASELINE),
    ])
    assert rc == 0, (
        "Expected exit 0: all legacy violations should be grandfathered by the baseline."
    )


# ---------------------------------------------------------------------------
# (ii) Synthetic run with ONE new violation → exit 1
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not COMMITTED_RUN.exists(),
    reason="Committed pipeline-state run not present in this checkout",
)
@pytest.mark.skipif(
    not COMMITTED_BASELINE.exists(),
    reason="Committed baseline file not present in this checkout",
)
def test_synthetic_new_violation_exits_one(tmp_path, capsys):
    """A new draft-class not in the baseline causes exit 1."""
    run_dir = _make_synthetic_extract(tmp_path, extra_class=_SYNTHETIC_EXTRA_CLASS)

    rc = main([
        str(run_dir),
        "--enforce",
        "--baseline", str(COMMITTED_BASELINE),
    ])
    assert rc == 1, (
        "Expected exit 1: one NEW violation not in the baseline should block."
    )

    captured = capsys.readouterr()
    combined = captured.out + captured.err
    assert _SYNTHETIC_EXTRA_CLASS in combined, (
        f"Expected the NEW violating class '{_SYNTHETIC_EXTRA_CLASS}' "
        f"to appear in the output."
    )
    assert "NEW mirror violation not in the baseline" in combined, (
        "Expected the NEW-violation message in the output."
    )


# ---------------------------------------------------------------------------
# (iii) --report (no baseline) → always exit 0
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not COMMITTED_RUN.exists(),
    reason="Committed pipeline-state run not present in this checkout",
)
def test_report_mode_always_exits_zero():
    """--report (default, no baseline) exits 0 even with 13 hard violations."""
    rc = main([str(COMMITTED_RUN), "--report"])
    assert rc == 0, "Expected exit 0: --report mode must always exit 0."


# ---------------------------------------------------------------------------
# Self-contained in-memory tests (no filesystem dependency on the run dir)
# ---------------------------------------------------------------------------

def _make_minimal_run(tmp_path: Path, markup: str) -> Path:
    """Create a minimal run dir with a given block markup string."""
    run_dir = tmp_path / "mini-run"
    run_dir.mkdir(exist_ok=True)
    data = {"block_markup": markup}
    (run_dir / "extract.json").write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )
    return run_dir


def test_baseline_grandfathers_known_violations(tmp_path):
    """In-memory: two known violations in the baseline → exit 0."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-hero__ctas"} -->'
        '<!-- /wp:sgs/container -->'
        '<!-- wp:sgs/text {"className":"sgs-card__body"} -->'
        '<!-- /wp:sgs/text -->'
    )
    run_dir = _make_minimal_run(tmp_path, markup)

    # Write a baseline that covers both violations
    baseline_path = tmp_path / "baseline.json"
    write_baseline(baseline_path, [
        "a:sgs/container:sgs-hero__ctas",
        "a:sgs/text:sgs-card__body",
    ])

    rc = main([str(run_dir), "--enforce", "--baseline", str(baseline_path)])
    assert rc == 0, "Both violations are in the baseline — should exit 0."


def test_baseline_blocks_new_violation(tmp_path):
    """In-memory: one known + one NEW violation → exit 1."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-hero__ctas"} -->'
        '<!-- /wp:sgs/container -->'
        '<!-- wp:sgs/text {"className":"sgs-brand__new-thing"} -->'
        '<!-- /wp:sgs/text -->'
    )
    run_dir = _make_minimal_run(tmp_path, markup)

    # Baseline only covers the first violation
    baseline_path = tmp_path / "baseline.json"
    write_baseline(baseline_path, ["a:sgs/container:sgs-hero__ctas"])

    rc = main([str(run_dir), "--enforce", "--baseline", str(baseline_path)])
    assert rc == 1, "sgs-brand__new-thing is NOT in the baseline — should exit 1."


def test_report_mode_exits_zero_with_violations(tmp_path):
    """In-memory: --report exits 0 even when violations exist, no baseline."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-hero__ctas"} -->'
        '<!-- /wp:sgs/container -->'
    )
    run_dir = _make_minimal_run(tmp_path, markup)
    rc = main([str(run_dir), "--report"])
    assert rc == 0, "--report must exit 0 regardless of violations."


def test_update_baseline_writes_correct_keys(tmp_path):
    """--update-baseline writes sorted, deterministic keys and exits 0."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-hero__ctas"} -->'
        '<!-- /wp:sgs/container -->'
        '<!-- wp:sgs/text {"className":"sgs-card__body"} -->'
        '<!-- /wp:sgs/text -->'
    )
    run_dir = _make_minimal_run(tmp_path, markup)
    baseline_path = tmp_path / "out-baseline.json"

    rc = main([str(run_dir), "--update-baseline", str(baseline_path)])
    assert rc == 0, "--update-baseline should exit 0."
    assert baseline_path.exists(), "Baseline file should have been written."

    keys = json.loads(baseline_path.read_text(encoding="utf-8"))
    assert keys == sorted(keys), "Baseline keys must be sorted."
    assert "a:sgs/container:sgs-hero__ctas" in keys
    assert "a:sgs/text:sgs-card__body" in keys


def test_collect_violation_keys_deduplicates():
    """collect_violation_keys deduplicates identical (slug, class) pairs."""
    viol_a = [
        {"block": "sgs/container", "violating_class": "sgs-hero__ctas"},
        {"block": "sgs/container", "violating_class": "sgs-hero__ctas"},  # duplicate
        {"block": "sgs/text", "violating_class": "sgs-card__body"},
    ]
    keys = collect_violation_keys(viol_a, [])
    assert len(keys) == 2, "Duplicate (slug, class) pairs must be merged."
    assert keys == sorted(keys), "Keys must be sorted."


def test_empty_baseline_blocks_all(tmp_path):
    """An empty baseline with --enforce blocks all violations."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-hero__ctas"} -->'
        '<!-- /wp:sgs/container -->'
    )
    run_dir = _make_minimal_run(tmp_path, markup)
    baseline_path = tmp_path / "empty-baseline.json"
    write_baseline(baseline_path, [])

    rc = main([str(run_dir), "--enforce", "--baseline", str(baseline_path)])
    assert rc == 1, "Empty baseline + violation → exit 1."


def test_no_violations_exits_zero_no_baseline(tmp_path):
    """Clean markup with no BEM element classes → exit 0 in --enforce mode."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-hero"} -->'
        '<!-- /wp:sgs/container -->'
    )
    run_dir = _make_minimal_run(tmp_path, markup)
    rc = main([str(run_dir), "--enforce"])
    assert rc == 0, "No violations → exit 0 in --enforce mode."
