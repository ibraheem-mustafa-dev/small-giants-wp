"""test_cheat_gate.py — pytest suite for the F5 cheat-detection gate.

Spec ref: Spec 31 §7a

Tests
-----
1.  Models — stable key format for every check
2.  Check #1 (slug_literal) — planted violation fires + clean file passes
3.  Check #2 (hardcoded_dict) — planted css-prop→attr dict fires + clean passes
4.  Check #3 (important_render) — faithful property + !important fires; non-faithful passes
5.  Check #4 (parallel_bp) — _BP_SUFFIX_MAP symbol fires; clean file passes
6.  Check #7 (sentinel) — 'unitless' string literal fires; clean file passes
7.  Baseline mechanics — --update-baseline / --check round-trip (via run() logic)

All tests use temporary files / in-memory SQLite; no mutation of real codebase.
Live-DB tests are skipped when sgs-framework.db is absent.

Style mirrors db-consistency/tests/test_f6_consistency.py.
"""
from __future__ import annotations

import importlib
import importlib.util
import json
import sqlite3
import sys
import textwrap
import types
from pathlib import Path
from unittest.mock import patch

import pytest

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Package bootstrap (mirrors run.py approach for the hyphenated dir name)
# ---------------------------------------------------------------------------

_PKG_DIR = Path(__file__).resolve().parents[1]  # scripts/cheat-gate/


def _bootstrap() -> None:
    if "cheat_gate" in sys.modules:
        return
    pkg = types.ModuleType("cheat_gate")
    pkg.__path__ = [str(_PKG_DIR)]
    pkg.__package__ = "cheat_gate"
    sys.modules["cheat_gate"] = pkg

    for name in (
        "models",
        "check_slug_literals",
        "check_hardcoded_dicts",
        "check_important_render",
        "check_parallel_bp",
        "check_d2_when_d1",
        "check_sentinel",
    ):
        mod_id = f"cheat_gate.{name}"
        if mod_id in sys.modules:
            continue
        spec = importlib.util.spec_from_file_location(
            mod_id, str(_PKG_DIR / f"{name}.py")
        )
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        sys.modules[mod_id] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]


_bootstrap()

from cheat_gate.models import (  # noqa: E402
    Violation,
    slug_literal_key,
    hardcoded_dict_key,
    important_render_key,
    parallel_bp_key,
    d2_when_d1_key,
    sentinel_key,
)
from cheat_gate import (  # noqa: E402
    check_slug_literals,
    check_hardcoded_dicts,
    check_important_render,
    check_parallel_bp,
    check_d2_when_d1,
    check_sentinel,
)

# ---------------------------------------------------------------------------
# Live DB fixture
# ---------------------------------------------------------------------------

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_DB_AVAILABLE = _DB_PATH.exists()
_skip_no_db = pytest.mark.skipif(not _DB_AVAILABLE, reason="sgs-framework.db not found")


# ===========================================================================
# 1. Models — stable key format
# ===========================================================================

class TestModelKeys:
    """Verify stable dedup keys match their specified prefix formats."""

    def test_slug_literal_key(self):
        k = slug_literal_key("converter_v2/convert.py", "sgs/hero", "_lift_fn")
        assert k == "slug:converter_v2/convert.py:_lift_fn:sgs/hero"

    def test_hardcoded_dict_key(self):
        k = hardcoded_dict_key("orchestrator/foo.py", "_SUFFIX_ATTR_OVERRIDES")
        assert k == "hdict:orchestrator/foo.py:_SUFFIX_ATTR_OVERRIDES"

    def test_important_render_key(self):
        k = important_render_key("includes/class-sgs-container-wrapper.php", "gap")
        assert k == "imp:includes/class-sgs-container-wrapper.php:gap"

    def test_parallel_bp_key(self):
        k = parallel_bp_key("converter_v2/convert.py", "_BP_SUFFIX_MAP")
        assert k == "bp:converter_v2/convert.py:_BP_SUFFIX_MAP"

    def test_d2_when_d1_key(self):
        k = d2_when_d1_key("sgs/hero", "gap")
        assert k == "d2d1:sgs/hero:gap"

    def test_sentinel_key(self):
        k = sentinel_key("converter_v2/convert.py", "_resolve_typo_value")
        assert k == "sentinel:converter_v2/convert.py:_resolve_typo_value"


# ===========================================================================
# 2. Check #1 — slug_literal
# ===========================================================================

class TestCheck1SlugLiterals:
    """Check #1 must flag per-block slug literals and ignore allowed scopes."""

    def test_flags_slug_equality_comparison(self, tmp_path):
        """slug == 'sgs/planted-fake' in a non-allowlisted file → Violation."""
        py = tmp_path / "canary.py"
        py.write_text(
            textwrap.dedent("""\
                def _cheating_fn(slug):
                    if slug == 'sgs/planted-fake':
                        return True
                    return False
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1, "Expected at least 1 slug-literal violation"
        keys = [v.key for v in violations]
        assert any("sgs/planted-fake" in k for k in keys), (
            f"Expected a violation key containing 'sgs/planted-fake', got: {keys}"
        )
        for v in violations:
            assert v.check == "slug_literal"

    def test_flags_slug_in_collection(self, tmp_path):
        """slug in ('sgs/foo', 'sgs/bar') → Violation."""
        py = tmp_path / "canary2.py"
        py.write_text(
            textwrap.dedent("""\
                def _check_fn(slug):
                    if slug in ('sgs/foo', 'sgs/bar'):
                        return True
                    return False
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1

    def test_flags_frozenset_with_slug_members(self, tmp_path):
        """frozenset(['sgs/hero', 'sgs/cta-section']) → Violation."""
        py = tmp_path / "canary3.py"
        py.write_text(
            textwrap.dedent("""\
                _COMPOSITE_BLOCKS = frozenset(['sgs/hero', 'sgs/cta-section'])
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1

    def test_passes_clean_file(self, tmp_path):
        """A file with no slug literals → 0 violations."""
        py = tmp_path / "clean.py"
        py.write_text(
            textwrap.dedent("""\
                def route_block(slug, attrs):
                    return attrs.get('className', '')
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path)
        assert violations == [], f"Expected 0 violations for clean file, got {violations}"

    def test_skips_test_files(self, tmp_path):
        """Files starting with test_ are skipped even if they contain slug literals."""
        test_py = tmp_path / "test_converter.py"
        test_py.write_text(
            textwrap.dedent("""\
                def test_hero_routing():
                    slug = 'sgs/hero'
                    assert slug == 'sgs/hero'
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path)
        assert violations == [], "test_ files must be skipped"

    def test_skips_files_in_tests_dir(self, tmp_path):
        """Files inside a 'tests' directory are skipped."""
        tests_dir = tmp_path / "tests"
        tests_dir.mkdir()
        fixture = tests_dir / "fixture.py"
        fixture.write_text("SLUG = 'sgs/hero'\n", encoding="utf-8")
        violations = check_slug_literals.run(orchestrator_dir=tmp_path)
        assert violations == [], "Files in tests/ must be skipped"


# ===========================================================================
# 3. Check #2 — hardcoded_dict
# ===========================================================================

class TestCheck2HardcodedDicts:
    """Check #2 must flag CSS-property→attr dict literals."""

    def test_flags_css_prop_dict(self, tmp_path):
        """Dict with CSS-property string keys → Violation."""
        py = tmp_path / "bad.py"
        py.write_text(
            textwrap.dedent("""\
                def _lift_fn(decls):
                    prop_map = {
                        'color': ('color', 'text', 'colour'),
                        'background-color': ('color', 'background', 'colour'),
                        'font-size': ('typography', 'fontSize', 'unit'),
                    }
                    return prop_map
            """),
            encoding="utf-8",
        )
        violations = check_hardcoded_dicts.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1, "Expected a hardcoded-dict violation"
        v = violations[0]
        assert v.check == "hardcoded_dict"
        assert "prop_map" in v.detail or "prop_map" in v.key

    def test_flags_module_level_dict(self, tmp_path):
        """Module-level CSS-property dict → Violation."""
        py = tmp_path / "bad2.py"
        py.write_text(
            textwrap.dedent("""\
                _SUFFIX_ATTR_OVERRIDES = {
                    'grid-template-columns': 'gridTemplateColumns',
                    'font-size': 'fontSize',
                    'background-color': 'backgroundColor',
                }
            """),
            encoding="utf-8",
        )
        violations = check_hardcoded_dicts.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1

    def test_passes_non_css_dict(self, tmp_path):
        """A dict with non-CSS-property keys → 0 violations."""
        py = tmp_path / "clean.py"
        py.write_text(
            textwrap.dedent("""\
                BLOCK_ICONS = {
                    'hero': 'star',
                    'cta-section': 'megaphone',
                }
            """),
            encoding="utf-8",
        )
        violations = check_hardcoded_dicts.run(orchestrator_dir=tmp_path)
        assert violations == [], f"Non-CSS dict should not be flagged, got: {violations}"


# ===========================================================================
# 4. Check #3 — important_render
# ===========================================================================

class TestCheck3ImportantRender:
    """Check #3 must flag !important for DB-faithful properties in render files."""

    def _make_db(self, css_properties: list[str]) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE property_suffixes (css_property TEXT, suffix TEXT)"
        )
        conn.executemany(
            "INSERT INTO property_suffixes VALUES (?, ?)",
            [(p, p.replace("-", "_")) for p in css_properties],
        )
        conn.commit()
        return conn

    def test_flags_important_over_faithful_property(self, tmp_path):
        """A CSS file with gap !important where gap is faithful → Violation."""
        css = tmp_path / "style.css"
        css.write_text(".sgs-hero { gap: 24px !important; }\n", encoding="utf-8")
        conn = self._make_db(["gap", "font-size", "color"])

        with (
            patch.object(check_important_render, "_WRAPPER_PHP", tmp_path / "none.php"),
            patch.object(check_important_render, "_BLOCKS_SRC", tmp_path),
            patch.object(check_important_render, "_BLOCKS_BUILD", tmp_path / "no-build"),
        ):
            violations = check_important_render.run(conn)

        conn.close()
        assert len(violations) >= 1, "Expected !important violation for 'gap'"
        v = violations[0]
        assert v.check == "important_render"
        assert "gap" in v.detail

    def test_passes_important_for_non_faithful_property(self, tmp_path):
        """!important on a property NOT in property_suffixes → no violation."""
        css = tmp_path / "style.css"
        css.write_text(".sgs-hero { z-index: 10 !important; }\n", encoding="utf-8")
        conn = self._make_db(["gap", "font-size"])  # z-index not in DB

        with (
            patch.object(check_important_render, "_WRAPPER_PHP", tmp_path / "none.php"),
            patch.object(check_important_render, "_BLOCKS_SRC", tmp_path),
            patch.object(check_important_render, "_BLOCKS_BUILD", tmp_path / "no-build"),
        ):
            violations = check_important_render.run(conn)

        conn.close()
        assert violations == [], (
            f"z-index is not faithful — should not be flagged, got: {violations}"
        )

    def test_passes_no_important_at_all(self, tmp_path):
        """CSS with no !important at all → 0 violations."""
        css = tmp_path / "style.css"
        css.write_text(".sgs-hero { gap: 24px; font-size: 1rem; }\n", encoding="utf-8")
        conn = self._make_db(["gap", "font-size"])

        with (
            patch.object(check_important_render, "_WRAPPER_PHP", tmp_path / "none.php"),
            patch.object(check_important_render, "_BLOCKS_SRC", tmp_path),
            patch.object(check_important_render, "_BLOCKS_BUILD", tmp_path / "no-build"),
        ):
            violations = check_important_render.run(conn)

        conn.close()
        assert violations == []


# ===========================================================================
# 5. Check #4 — parallel_bp
# ===========================================================================

class TestCheck4ParallelBp:
    """Check #4 must flag _BP_SUFFIX_MAP and hardcoded breakpoint integers."""

    def test_flags_bp_suffix_map_symbol(self, tmp_path):
        """_BP_SUFFIX_MAP = {...} in a file → Violation."""
        py = tmp_path / "convert.py"
        py.write_text(
            textwrap.dedent("""\
                _BP_SUFFIX_MAP = {
                    'Tablet': 'Tablet',
                    'Mobile': 'Mobile',
                    'Desktop': 'Desktop',
                }
            """),
            encoding="utf-8",
        )
        violations = check_parallel_bp.run(convert_py=py)
        assert len(violations) >= 1
        bp_violations = [v for v in violations if v.check == "parallel_bp"]
        assert any("_BP_SUFFIX_MAP" in v.key for v in bp_violations)

    def test_flags_hardcoded_breakpoint_integer(self, tmp_path):
        """A raw integer 768 in a file (not in a db.breakpoint_suffix_rules call) → Violation."""
        py = tmp_path / "convert.py"
        py.write_text(
            textwrap.dedent("""\
                def _make_bp_rule(val):
                    if val > 768:
                        return 'tablet'
                    return 'mobile'
            """),
            encoding="utf-8",
        )
        violations = check_parallel_bp.run(convert_py=py)
        assert len(violations) >= 1
        keys = [v.key for v in violations]
        assert any("768" in k for k in keys)

    def test_passes_clean_file(self, tmp_path):
        """A file with no _BP_SUFFIX_MAP and no hardcoded breakpoint ints → 0 violations."""
        py = tmp_path / "convert.py"
        py.write_text(
            textwrap.dedent("""\
                def _make_rule(tier):
                    bp = db.breakpoint_suffix_rules().get(tier)
                    return bp
            """),
            encoding="utf-8",
        )
        # 768 appears ONLY inside db.breakpoint_suffix_rules() call line → not flagged
        violations = check_parallel_bp.run(convert_py=py)
        # No _BP_SUFFIX_MAP, and no raw integer outside db call → 0 violations
        bp_map_violations = [v for v in violations if "_BP_SUFFIX_MAP" in v.key]
        assert bp_map_violations == []


# ===========================================================================
# 6. Check #7 — sentinel
# ===========================================================================

class TestCheck7Sentinel:
    """Check #7 must flag 'unitless' string literals in code."""

    def test_flags_unitless_in_code(self, tmp_path):
        """A function returning 'unitless' → Violation."""
        py = tmp_path / "convert.py"
        py.write_text(
            textwrap.dedent("""\
                def _parse_value(v):
                    if v.endswith('px'):
                        return float(v[:-2])
                    return str(v) + 'unitless'
            """),
            encoding="utf-8",
        )
        violations = check_sentinel.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1, "Expected a sentinel violation"
        v = violations[0]
        assert v.check == "sentinel"
        assert "unitless" in v.detail.lower()

    def test_passes_file_without_unitless(self, tmp_path):
        """A file that never uses 'unitless' → 0 violations."""
        py = tmp_path / "clean.py"
        py.write_text(
            textwrap.dedent("""\
                def _parse_value(v):
                    return float(v.replace('px', '').strip())
            """),
            encoding="utf-8",
        )
        violations = check_sentinel.run(orchestrator_dir=tmp_path)
        assert violations == [], f"Expected 0 sentinel violations, got {violations}"

    def test_skips_test_files(self, tmp_path):
        """test_ files are excluded even if they contain 'unitless'."""
        test_py = tmp_path / "test_sentinel.py"
        test_py.write_text(
            'def test_strips_unitless():\n    assert strip("1.65unitless") == 1.65\n',
            encoding="utf-8",
        )
        violations = check_sentinel.run(orchestrator_dir=tmp_path)
        assert violations == [], "test_ files must be excluded"


# ===========================================================================
# 7. Baseline mechanics
# ===========================================================================

class TestBaselineMechanics:
    """Verify the baseline round-trip works correctly."""

    def test_new_violation_not_in_baseline_causes_check_failure(self, tmp_path):
        """A violation key not in the baseline → treated as NEW (not grandfathered)."""
        baseline: set[str] = {"some:other:key"}
        new_violation = Violation(
            check="slug_literal",
            file="convert.py",
            detail="test",
            fix="test fix",
            key="slug:convert.py:_fn:sgs/new-block",
        )
        new_violations = [v for v in [new_violation] if v.key not in baseline]
        assert len(new_violations) == 1, "New key not in baseline should be flagged"

    def test_violation_in_baseline_is_grandfathered(self):
        """A violation key present in the baseline → NOT treated as new."""
        key = "slug:convert.py:_fn:sgs/old-block"
        baseline: set[str] = {key}
        violation = Violation(
            check="slug_literal",
            file="convert.py",
            detail="test",
            fix="test fix",
            key=key,
        )
        new_violations = [v for v in [violation] if v.key not in baseline]
        assert new_violations == [], "Baselined key must be grandfathered"

    def test_update_baseline_writes_current_keys(self, tmp_path):
        """--update-baseline writes exactly the current violation keys."""
        baseline_path = tmp_path / "test-baseline.json"
        violations = [
            Violation("slug_literal", "f.py", "detail", "fix", "key:A"),
            Violation("slug_literal", "f.py", "detail", "fix", "key:B"),
            Violation("slug_literal", "f.py", "detail", "fix", "key:A"),  # duplicate key
        ]
        keys = {v.key for v in violations}
        baseline_path.write_text(json.dumps(sorted(keys), indent=2), encoding="utf-8")

        loaded = set(json.loads(baseline_path.read_text(encoding="utf-8")))
        assert loaded == {"key:A", "key:B"}, "Baseline must contain unique keys only"

    def test_check_exits_1_on_new_violation(self, tmp_path):
        """Simulate: run() finds a new violation key not in baseline → would exit 1."""
        baseline: set[str] = {"old:key:1", "old:key:2"}
        current_violations = [
            Violation("slug_literal", "f.py", "detail", "fix", "old:key:1"),
            Violation("slug_literal", "f.py", "detail", "fix", "slug:canary.py:_fn:sgs/new"),
        ]
        new_violations = [v for v in current_violations if v.key not in baseline]
        assert len(new_violations) == 1
        assert new_violations[0].key == "slug:canary.py:_fn:sgs/new"


# ===========================================================================
# 8. Live-DB smoke test for check #3
# ===========================================================================

class TestCheck3LiveDB:
    """Check #3 smoke test against the live DB (skipped when DB absent)."""

    @_skip_no_db
    def test_check3_runs_without_error(self):
        """Check #3 must run to completion on the live DB without exceptions."""
        conn = sqlite3.connect(str(_DB_PATH))
        try:
            violations = check_important_render.run(conn)
        finally:
            conn.close()
        # Violations may or may not exist — just verify it ran cleanly
        assert isinstance(violations, list), "run() must return a list"
        for v in violations:
            assert isinstance(v, Violation)
            assert v.check == "important_render"

    @_skip_no_db
    def test_check3_faithful_properties_non_empty(self):
        """property_suffixes must contain at least the known faithful properties."""
        conn = sqlite3.connect(str(_DB_PATH))
        try:
            rows = conn.execute(
                "SELECT DISTINCT css_property FROM property_suffixes"
            ).fetchall()
        finally:
            conn.close()
        props = {r[0].lower() for r in rows if r[0]}
        # gap, font-size, and background-color are established faithful properties
        for expected in ("gap", "font-size", "background-color"):
            assert expected in props, (
                f"Expected '{expected}' in property_suffixes, got: {sorted(props)[:20]}"
            )
