"""
ledger.tests.test_content_coverage — F5 CONTENT coverage-conservation gate tests
(Spec 31 §12.2.1, extended to the CONTENT routing-unit stream — Step 11/A2).

STOP-16 plant test: prove the FAILURE path, not just the happy path.

Scenarios:
  1. A declared text unit present in the emitted markup → accounted (not unaccounted).
  2. A declared unit named in content-gaps.json → accounted.
  3. A declared unit nested under a top-level <header>/<footer>/<nav> → excluded
     (chrome-skip), never counted as unaccounted.
  4. A PLANTED DROPPED unit (in draft, absent from markup + gaps + not chrome)
     → UNACCOUNTED; check() returns exit 1 and names the unit.
  5. Baseline round-trip: --update-baseline then --check → exit 0.
  6. Absent markup artefact → fail-safe exit 0 (no run to check against).
  7. Tampered baseline (hash mismatch) → exit 1.

No live DB, no network, no Playwright, no convert.py — mirrors
test_content_gap_check.py's independence.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent  # scripts/
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from ledger.content_coverage_check import (
    _compute_hash,
    _content_key,
    _load_baseline,
    _media_basename,
    _save_baseline,
    analyse,
    check,
)


# ---------------------------------------------------------------------------
# Synthetic fixtures
# ---------------------------------------------------------------------------

_DRAFT_HTML = """
<html><body>
<header class="sgs-header"><nav><a href="#">Home</a></nav></header>
<section class="sgs-hero">
  <h1 class="sgs-hero__heading">Welcome To Mamas Munches</h1>
  <p class="sgs-hero__text">This is the dropped paragraph never rendered anywhere.</p>
  <img src="/uploads/hero-banner.jpg" alt="banner">
</section>
<footer><p>copyright footer text</p></footer>
</body></html>
"""


def _write(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


def _baseline_path(tmp_path: Path) -> Path:
    return tmp_path / "content-coverage-baseline.json"


# ---------------------------------------------------------------------------
# 1. Accounted via emitted markup
# ---------------------------------------------------------------------------

class TestAccountedViaMarkup:
    def test_text_unit_present_in_markup_is_accounted(self, tmp_path):
        markup = "<html><body><h1>Welcome To Mamas Munches</h1></body></html>"
        summary = analyse(_DRAFT_HTML, "fx", markup, gaps=None)
        values = {e["value"] for e in summary["unaccounted"]}
        assert "Welcome To Mamas Munches" not in values
        assert summary["accounted_markup_count"] >= 1

    def test_media_unit_present_via_basename(self, tmp_path):
        markup = '<html><body><img src="https://cdn.example.com/x/hero-banner.jpg?v=2"></body></html>'
        summary = analyse(_DRAFT_HTML, "fx", markup, gaps=None)
        values = {e["value"] for e in summary["unaccounted"]}
        assert "/uploads/hero-banner.jpg" not in values


# ---------------------------------------------------------------------------
# 2. Accounted via content-gaps.json
# ---------------------------------------------------------------------------

class TestAccountedViaGaps:
    def test_gap_record_covers_the_unit(self, tmp_path):
        # Markup that has NEITHER the heading nor the paragraph nor the image.
        markup = "<html><body><p>unrelated</p></body></html>"
        gaps = [{
            "block": "sgs/hero",
            "attr_or_slot": "text",
            "fixture": "fx",
            "detail": "This is the dropped paragraph never rendered anywhere.",
        }]
        summary = analyse(_DRAFT_HTML, "fx", markup, gaps=gaps)
        values = {e["value"] for e in summary["unaccounted"]}
        assert "This is the dropped paragraph never rendered anywhere." not in values
        assert summary["accounted_gap_count"] >= 1


# ---------------------------------------------------------------------------
# 3. Chrome-excluded units are never counted as unaccounted
# ---------------------------------------------------------------------------

class TestChromeExcluded:
    def test_header_nav_and_footer_text_are_excluded_not_unaccounted(self, tmp_path):
        # Markup that reproduces NONE of the chrome text — if the gate didn't
        # exclude chrome, "Home" and "copyright footer text" would appear as
        # unaccounted below (they don't, because they are chrome-excluded).
        markup = "<html><body><h1>Welcome To Mamas Munches</h1><img src=\"/uploads/hero-banner.jpg\"></body></html>"
        gaps = [{
            "block": "sgs/hero", "attr_or_slot": "text", "fixture": "fx",
            "detail": "This is the dropped paragraph never rendered anywhere.",
        }]
        summary = analyse(_DRAFT_HTML, "fx", markup, gaps=gaps)
        unaccounted_values = {e["value"] for e in summary["unaccounted"]}
        excluded_values = {e["value"] for e in summary["excluded"]}

        assert "Home" in excluded_values
        assert "copyright footer text" in excluded_values
        assert "Home" not in unaccounted_values
        assert "copyright footer text" not in unaccounted_values
        assert summary["excluded_chrome_count"] == 2


# ---------------------------------------------------------------------------
# 4. PLANTED DROPPED unit — the STOP-16 failure-path proof
# ---------------------------------------------------------------------------

class TestPlantedDrop:
    def test_dropped_unit_is_unaccounted(self, tmp_path):
        """The paragraph is in the draft, absent from markup, absent from gaps,
        and not chrome — it MUST surface as UNACCOUNTED."""
        markup = "<html><body><h1>Welcome To Mamas Munches</h1><img src=\"/uploads/hero-banner.jpg\"></body></html>"
        summary = analyse(_DRAFT_HTML, "fx", markup, gaps=None)
        unaccounted_values = {e["value"] for e in summary["unaccounted"]}
        assert "This is the dropped paragraph never rendered anywhere." in unaccounted_values

    def test_check_returns_exit_1_and_names_the_unit(self, tmp_path):
        draft_path = _write(tmp_path, "fx.html", _DRAFT_HTML)
        markup_path = _write(
            tmp_path, "markup.html",
            "<html><body><h1>Welcome To Mamas Munches</h1><img src=\"/uploads/hero-banner.jpg\"></body></html>",
        )
        gaps_path = tmp_path / "content-gaps.json"  # absent — no gaps this run
        baseline_path = _baseline_path(tmp_path)  # absent — nothing baselined yet

        exit_code, violations = check(draft_path, markup_path, gaps_path, baseline_path)
        assert exit_code == 1
        assert any("dropped paragraph" in v for v in violations)
        assert any("NEW UNACCOUNTED" in v for v in violations)


# ---------------------------------------------------------------------------
# 5. Baseline round-trip
# ---------------------------------------------------------------------------

class TestBaselineRoundTrip:
    def test_update_baseline_then_check_is_green(self, tmp_path):
        draft_path = _write(tmp_path, "fx.html", _DRAFT_HTML)
        markup_path = _write(
            tmp_path, "markup.html",
            "<html><body><h1>Welcome To Mamas Munches</h1><img src=\"/uploads/hero-banner.jpg\"></body></html>",
        )
        gaps_path = tmp_path / "content-gaps.json"
        baseline_path = _baseline_path(tmp_path)

        # Before baselining: exit 1 (the paragraph is unaccounted).
        exit_code, _ = check(draft_path, markup_path, gaps_path, baseline_path)
        assert exit_code == 1

        # Baseline the current unaccounted set.
        draft_html = draft_path.read_text(encoding="utf-8")
        markup_html = markup_path.read_text(encoding="utf-8")
        summary = analyse(draft_html, "fx", markup_html, gaps=None)
        keys = {e["key"] for e in summary["unaccounted"]}
        _save_baseline(keys, baseline_path)

        # After baselining: exit 0 — same drop, now known/tracked.
        exit_code2, violations2 = check(draft_path, markup_path, gaps_path, baseline_path)
        assert exit_code2 == 0
        assert violations2 == []

    def test_save_and_load_round_trip(self, tmp_path):
        baseline_path = _baseline_path(tmp_path)
        keys = {"fx|content-text|p.x|hello", "fx|content-media|img|/a.jpg"}
        _save_baseline(keys, baseline_path)
        loaded_keys, stored_hash = _load_baseline(baseline_path)
        assert loaded_keys == keys
        assert stored_hash == _compute_hash(sorted(keys))


# ---------------------------------------------------------------------------
# 6. Absent markup artefact — fail-safe
# ---------------------------------------------------------------------------

class TestFailSafe:
    def test_absent_markup_is_green(self, tmp_path):
        draft_path = _write(tmp_path, "fx.html", _DRAFT_HTML)
        missing_markup_path = tmp_path / "does-not-exist.html"
        gaps_path = tmp_path / "content-gaps.json"
        baseline_path = _baseline_path(tmp_path)

        exit_code, violations = check(draft_path, missing_markup_path, gaps_path, baseline_path)
        assert exit_code == 0
        assert violations == []

    def test_none_markup_is_green(self, tmp_path):
        draft_path = _write(tmp_path, "fx.html", _DRAFT_HTML)
        gaps_path = tmp_path / "content-gaps.json"
        baseline_path = _baseline_path(tmp_path)

        exit_code, violations = check(draft_path, None, gaps_path, baseline_path)
        assert exit_code == 0
        assert violations == []


# ---------------------------------------------------------------------------
# 7. Tampered baseline (hash mismatch)
# ---------------------------------------------------------------------------

class TestTamperedBaseline:
    def test_hand_edited_keys_without_recomputed_hash_is_rejected(self, tmp_path):
        draft_path = _write(tmp_path, "fx.html", _DRAFT_HTML)
        markup_path = _write(
            tmp_path, "markup.html",
            "<html><body><h1>Welcome To Mamas Munches</h1><img src=\"/uploads/hero-banner.jpg\"></body></html>",
        )
        gaps_path = tmp_path / "content-gaps.json"
        baseline_path = _baseline_path(tmp_path)

        _save_baseline({"fx|content-text|p.sgs-hero__text|This is the dropped paragraph never rendered anywhere."}, baseline_path)

        # Hand-tamper: add a key without recomputing the hash.
        data = json.loads(baseline_path.read_text(encoding="utf-8"))
        data["keys"].append("fx|content-text|sneaky|sneaky-value")
        baseline_path.write_text(json.dumps(data), encoding="utf-8")

        exit_code, violations = check(draft_path, markup_path, gaps_path, baseline_path)
        assert exit_code == 1
        assert any("TAMPERED" in v for v in violations)


# ---------------------------------------------------------------------------
# Small helpers — key format + media basename
# ---------------------------------------------------------------------------

class TestHelpers:
    def test_content_key_format(self):
        key = _content_key("fx", "content-text", "h1.heading", "Hello")
        assert key == "fx|content-text|h1.heading|Hello"

    def test_media_basename_strips_query_and_path(self):
        assert _media_basename("https://cdn.example.com/a/b/hero.jpg?v=2") == "hero.jpg"
        assert _media_basename("/uploads/hero.jpg") == "hero.jpg"
        assert _media_basename("img") == "img"
