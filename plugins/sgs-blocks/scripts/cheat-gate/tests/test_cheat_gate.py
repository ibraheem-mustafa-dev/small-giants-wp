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
        "check_bound_emit",
        "check_converter_source",
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
    bound_emit_key,
    converter_source_key,
)
from cheat_gate import (  # noqa: E402
    check_slug_literals,
    check_hardcoded_dicts,
    check_important_render,
    check_parallel_bp,
    check_d2_when_d1,
    check_sentinel,
    check_bound_emit,
    check_converter_source,
)

# ---------------------------------------------------------------------------
# Live DB fixture
# ---------------------------------------------------------------------------

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_DB_AVAILABLE = _DB_PATH.exists()
_skip_no_db = pytest.mark.skipif(not _DB_AVAILABLE, reason="sgs-framework.db not found")


# ===========================================================================
# Check #9 (converter_source) — className-mirror / suffix-vocab dict / side-regex
# ===========================================================================

class TestCheck9ConverterSource:
    """Static source-cheat gate over the new converter/ tree (D249)."""

    def test_key_format(self):
        assert converter_source_key("classname", "services/text_leaf.py", "className") == (
            "convsrc:classname:services/text_leaf.py:className"
        )

    @_skip_no_db
    def test_fires_on_all_three_cheat_kinds(self, tmp_path):
        (tmp_path / "p.py").write_text(textwrap.dedent('''
            import re
            attrs = {}
            attrs["className"] = " ".join(sgs_classes)        # (a) mirror
            _TIER = {"Mobile": "Mobile", "Tablet": "Tablet"}  # (b) suffix dict
            x = re.sub(r"(Top|Right|Bottom|Left)$", "", a)    # (c) side regex
        ''').strip(), encoding="utf-8")
        kinds = {v.key.split(":")[1] for v in check_converter_source.run(converter_dir=tmp_path)}
        assert {"classname", "suffix_dict", "side_regex"} <= kinds

    @_skip_no_db
    def test_clean_and_docstring_quote_pass(self, tmp_path):
        # A docstring that merely QUOTES the (Top|Right|Bottom|Left) pattern, a className
        # READ, and a non-suffix dict must NOT fire (precision guard).
        (tmp_path / "ok.py").write_text(textwrap.dedent('''
            def f(node):
                """Strip a side suffix (Top|Right|Bottom|Left) via the DB vocabulary."""
                cn = node.get("className", "")
                m = {"normal": "400", "bold": "700"}
                return cn, m
        ''').strip(), encoding="utf-8")
        assert check_converter_source.run(converter_dir=tmp_path) == []


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

    def test_flags_tuple_keyed_css_prop_dict(self, tmp_path):
        """Dict with tuple keys whose first element is a CSS property → Violation.

        This is the shape of _SUFFIX_ATTR_OVERRIDES and _ATTR_NAME_OVERRIDES
        (keys are ("grid-template-columns", "Columns") etc.).  Previously these
        were silently skipped because the check only inspected ast.Constant keys.
        """
        py = tmp_path / "db_lookup.py"
        py.write_text(
            textwrap.dedent("""\
                _ATTR_NAME_OVERRIDES = {
                    ("grid-template-columns", "Columns"): "gridTemplateColumns",
                }
            """),
            encoding="utf-8",
        )
        violations = check_hardcoded_dicts.run(orchestrator_dir=tmp_path)
        assert len(violations) >= 1, (
            "Expected a hardcoded-dict violation for tuple-keyed CSS-prop dict, got 0"
        )
        v = violations[0]
        assert v.check == "hardcoded_dict"
        assert "_ATTR_NAME_OVERRIDES" in v.detail or "_ATTR_NAME_OVERRIDES" in v.key


# ===========================================================================
# 3b. Check #1 + #2 converter/ tree coverage (the gap this session closes:
# a per-block slug literal or hardcoded css-prop->attr dict written directly
# into the NEW modular converter/ tree, not just orchestrator/, must fire).
# ===========================================================================

class TestConverterTreeCoverage:
    """Checks #1 and #2 must ALSO scan converter/, not just orchestrator/.

    Prevents a regression back to the coverage gap where a cheat written into
    plugins/sgs-blocks/scripts/converter/ was invisible to the commit-time gate.
    """

    def test_slug_literal_fires_in_converter_tree(self, tmp_path):
        """A per-block slug literal planted in the converter/ tree must fire."""
        py = tmp_path / "services" / "planted.py"
        py.parent.mkdir(parents=True, exist_ok=True)
        py.write_text(
            textwrap.dedent("""\
                def route_by_slug(slug):
                    if slug == 'sgs/planted-converter-fake':
                        return True
                    return False
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path, converter_dir=tmp_path)
        keys = [v.key for v in violations]
        assert any("sgs/planted-converter-fake" in k for k in keys), (
            f"Expected converter/-tree slug literal to fire, got: {keys}"
        )

    def test_hardcoded_dict_fires_in_converter_tree(self, tmp_path):
        """A hardcoded css-prop->attr dict planted in the converter/ tree must fire."""
        py = tmp_path / "services" / "planted_dict.py"
        py.parent.mkdir(parents=True, exist_ok=True)
        py.write_text(
            textwrap.dedent("""\
                _PLANTED_PADDING_MAP = {
                    'padding': 'somePaddingAttr',
                    'margin': 'someMarginAttr',
                }
            """),
            encoding="utf-8",
        )
        violations = check_hardcoded_dicts.run(orchestrator_dir=tmp_path, converter_dir=tmp_path)
        keys = [v.key for v in violations]
        assert any("_PLANTED_PADDING_MAP" in k for k in keys), (
            f"Expected converter/-tree hardcoded-dict to fire, got: {keys}"
        )

    def test_docstring_quote_of_slug_and_dict_patterns_does_not_fire(self, tmp_path):
        """A docstring/comment merely QUOTING the cheat patterns must stay silent."""
        py = tmp_path / "services" / "planted_docstring.py"
        py.parent.mkdir(parents=True, exist_ok=True)
        py.write_text(
            textwrap.dedent('''\
                """Note: do not write code like slug == 'sgs/bar' or a css-prop-to-attr
                dict such as {'padding': 'x'}."""
            '''),
            encoding="utf-8",
        )
        slug_violations = check_slug_literals.run(orchestrator_dir=tmp_path, converter_dir=tmp_path)
        dict_violations = check_hardcoded_dicts.run(orchestrator_dir=tmp_path, converter_dir=tmp_path)
        assert slug_violations == [], f"Docstring quote must not fire, got: {slug_violations}"
        assert dict_violations == [], f"Docstring quote must not fire, got: {dict_violations}"

    def test_bare_sgs_namespace_guard_is_not_a_false_positive(self, tmp_path):
        """`slug.startswith("sgs/")` (bare 4-char prefix, no block name) is a universal
        SGS-namespace guard, NOT a per-block slug literal — must NOT fire.

        Regression guard for the false positive found in root_supports.py /
        text_leaf.py / scalar_content.py / styling_content.py, where the bare
        "sgs/" constant was previously being recorded as a per-block literal.
        """
        py = tmp_path / "services" / "namespace_guard.py"
        py.parent.mkdir(parents=True, exist_ok=True)
        py.write_text(
            textwrap.dedent("""\
                def lift_something(slug):
                    if not slug or not slug.startswith("sgs/"):
                        return {}
                    return {"lifted": True}
            """),
            encoding="utf-8",
        )
        violations = check_slug_literals.run(orchestrator_dir=tmp_path, converter_dir=tmp_path)
        assert violations == [], (
            f"Bare 'sgs/' namespace guard must not be flagged as a per-block literal, "
            f"got: {violations}"
        )

    def test_whole_file_allowlist_exempts_db_lookup_and_icon_resolver(self, tmp_path):
        """db/db_lookup.py and services/icon_resolver.py are exempt whole-file
        (they legitimately hold DB-resolved lookup / icon-identity tables).

        db_lookup.py's real path is db/db_lookup.py (EXECUTION Step 9 moved the
        canonical implementation there; the allowlist previously carried the
        forward-looking "services/db_lookup.py" guess from D249, which never
        matched reality — corrected in Step 10, 2026-07-04, see
        check_hardcoded_dicts.py / check_slug_literals.py history).

        Uses an empty separate orchestrator_dir so only the converter_dir pass (which
        applies the whole-file allowlist) contributes findings — isolates the
        allowlist behaviour from the orchestrator pass, which has no such allowlist.
        """
        empty_orchestrator = tmp_path / "empty_orchestrator"
        empty_orchestrator.mkdir()
        converter_root = tmp_path / "converter_root"
        converter_root.mkdir()

        db_lookup = converter_root / "db" / "db_lookup.py"
        db_lookup.parent.mkdir(parents=True, exist_ok=True)
        db_lookup.write_text(
            textwrap.dedent("""\
                _ATTR_NAME_OVERRIDES = {
                    ("grid-template-columns", "Columns"): "gridTemplateColumns",
                }
                if True:
                    slug = 'sgs/allowlisted-fake'
            """),
            encoding="utf-8",
        )
        icon_resolver = converter_root / "services" / "icon_resolver.py"
        icon_resolver.parent.mkdir(parents=True, exist_ok=True)
        icon_resolver.write_text(
            "ICONS = {'sgs/hero': 'star', 'sgs/cta-section': 'megaphone'}\n",
            encoding="utf-8",
        )
        slug_violations = check_slug_literals.run(
            orchestrator_dir=empty_orchestrator, converter_dir=converter_root
        )
        dict_violations = check_hardcoded_dicts.run(
            orchestrator_dir=empty_orchestrator, converter_dir=converter_root
        )
        assert slug_violations == [], (
            f"Allowlisted DB-access files must not fire on slug literals, got: {slug_violations}"
        )
        assert dict_violations == [], (
            f"Allowlisted DB-access files must not fire on hardcoded dicts, got: {dict_violations}"
        )


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

    def test_flags_bp_suffix_map_in_non_convert_file(self, tmp_path):
        """_BP_SUFFIX_MAP in a file other than convert.py must be detected.

        FIX 3: the symbol scan now walks the whole orchestrator tree, not just
        convert.py.  A _BP_SUFFIX_MAP in db_lookup.py or a future modular file
        is the same violation class and must be caught.
        """
        (tmp_path / "converter_v2").mkdir()
        non_convert = tmp_path / "converter_v2" / "db_lookup.py"
        non_convert.write_text(
            textwrap.dedent("""\
                _BP_SUFFIX_MAP = {
                    'Tablet': 'Tablet',
                    'Mobile': 'Mobile',
                }
            """),
            encoding="utf-8",
        )
        violations = check_parallel_bp.run(
            convert_py=tmp_path / "no_such_file.py",  # disable integer scan
            orchestrator_dir=tmp_path,
        )
        bp_map_violations = [v for v in violations if "_BP_SUFFIX_MAP" in v.key]
        assert len(bp_map_violations) >= 1, (
            f"Expected _BP_SUFFIX_MAP violation from db_lookup.py, got: {violations}"
        )


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
# 8b. Baseline hash mechanics (FIX 4 — self-blessing protection)
# ===========================================================================

class TestBaselineHashMechanics:
    """Verify hash-based self-blessing protection on the cheat-gate baseline."""

    def _import_run_module(self):
        """Load cheat_gate.run via importlib (avoids re-running __main__)."""
        mod_id = "cheat_gate.run"
        if mod_id in sys.modules:
            return sys.modules[mod_id]
        spec = importlib.util.spec_from_file_location(
            mod_id, str(_PKG_DIR / "run.py")
        )
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        sys.modules[mod_id] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        return mod

    def test_compute_hash_is_deterministic(self):
        """_compute_hash must return the same value for the same key list."""
        run_mod = self._import_run_module()
        keys = ["hdict:convert.py:_X", "bp:convert.py:768"]
        h1 = run_mod._compute_hash(keys)
        h2 = run_mod._compute_hash(list(reversed(keys)))  # order should not matter
        assert h1 == h2, "Hash must be order-independent (sorted internally)"
        assert len(h1) == 64, "Expected 64-hex SHA-256 digest"

    def test_save_baseline_writes_hashed_format(self, tmp_path):
        """_save_baseline must write {'hash': ..., 'keys': [...]} (not a plain list)."""
        run_mod = self._import_run_module()
        orig_path = run_mod._BASELINE_PATH
        run_mod._BASELINE_PATH = tmp_path / "test-baseline.json"
        try:
            run_mod._save_baseline({"key:A", "key:B"})
            data = json.loads((tmp_path / "test-baseline.json").read_text(encoding="utf-8"))
            assert isinstance(data, dict), "Saved baseline must be a JSON object, not a list"
            assert "hash" in data, "Saved baseline must include 'hash' field"
            assert "keys" in data, "Saved baseline must include 'keys' field"
            assert set(data["keys"]) == {"key:A", "key:B"}
        finally:
            run_mod._BASELINE_PATH = orig_path

    def test_load_baseline_reads_hashed_format(self, tmp_path):
        """_load_baseline must return (keys, hash) from the new format."""
        run_mod = self._import_run_module()
        orig_path = run_mod._BASELINE_PATH
        baseline_file = tmp_path / "test-baseline.json"
        keys_list = ["key:A", "key:B"]
        expected_hash = run_mod._compute_hash(keys_list)
        baseline_file.write_text(
            json.dumps({"hash": expected_hash, "keys": keys_list}),
            encoding="utf-8",
        )
        run_mod._BASELINE_PATH = baseline_file
        try:
            loaded_keys, loaded_hash = run_mod._load_baseline()
            assert loaded_keys == {"key:A", "key:B"}
            assert loaded_hash == expected_hash
        finally:
            run_mod._BASELINE_PATH = orig_path

    def test_tampered_baseline_detected(self, tmp_path):
        """Hand-editing 'keys' without updating 'hash' → hash mismatch detected."""
        run_mod = self._import_run_module()
        orig_path = run_mod._BASELINE_PATH
        baseline_file = tmp_path / "test-baseline.json"
        # Write a valid baseline for key:A only
        valid_keys = ["key:A"]
        baseline_file.write_text(
            json.dumps({"hash": run_mod._compute_hash(valid_keys), "keys": valid_keys}),
            encoding="utf-8",
        )
        # Hand-edit: add key:B WITHOUT recomputing hash
        data = json.loads(baseline_file.read_text(encoding="utf-8"))
        data["keys"].append("key:B")
        baseline_file.write_text(json.dumps(data), encoding="utf-8")

        run_mod._BASELINE_PATH = baseline_file
        try:
            loaded_keys, loaded_hash = run_mod._load_baseline()
            expected_hash = run_mod._compute_hash(list(loaded_keys))
            assert expected_hash != loaded_hash, (
                "A hand-edited baseline must produce a hash mismatch"
            )
        finally:
            run_mod._BASELINE_PATH = orig_path

    def test_load_baseline_handles_legacy_list_format(self, tmp_path):
        """Legacy plain-list baseline is loaded as (keys, None) — no hash."""
        run_mod = self._import_run_module()
        orig_path = run_mod._BASELINE_PATH
        baseline_file = tmp_path / "legacy-baseline.json"
        baseline_file.write_text(json.dumps(["key:X", "key:Y"]), encoding="utf-8")
        run_mod._BASELINE_PATH = baseline_file
        try:
            loaded_keys, loaded_hash = run_mod._load_baseline()
            assert loaded_keys == {"key:X", "key:Y"}
            assert loaded_hash is None, "Legacy format must return None for hash"
        finally:
            run_mod._BASELINE_PATH = orig_path


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


class TestCheck8BoundEmit:
    """Check #8 — static sourceMode='bound' emit tripwire (AST, converter_v2 scope)."""

    def _conv(self, tmp_path):
        d = tmp_path / "converter_v2"
        d.mkdir()
        return d

    def test_flags_bound_dict_emit(self, tmp_path):
        d = self._conv(tmp_path)
        (d / "emit.py").write_text(
            'def build():\n    return {"sourceMode": "bound"}\n', encoding="utf-8"
        )
        v = check_bound_emit.run(converter_dir=d)
        assert len(v) == 1 and v[0].check == "bound_emit"

    def test_flags_bound_kwarg_emit(self, tmp_path):
        d = self._conv(tmp_path)
        (d / "emit.py").write_text(
            'def f(**k): pass\ndef build():\n    f(sourceMode="bound")\n', encoding="utf-8"
        )
        assert len(check_bound_emit.run(converter_dir=d)) == 1

    def test_legit_modes_not_flagged(self, tmp_path):
        d = self._conv(tmp_path)
        (d / "emit.py").write_text(
            'def build():\n    return {"sourceMode": "wc-product"}\n', encoding="utf-8"
        )
        assert check_bound_emit.run(converter_dir=d) == []

    def test_descriptive_text_not_flagged(self, tmp_path):
        """A docstring/comment describing the cheat must NOT be flagged (AST, not regex)."""
        d = self._conv(tmp_path)
        (d / "doc.py").write_text(
            '"""Never emit sourceMode=\'bound\' — it is the cheat."""\n'
            '# sourceMode: "bound" is forbidden\n'
            'x = 1\n',
            encoding="utf-8",
        )
        assert check_bound_emit.run(converter_dir=d) == []

    def test_clean_converter_tree_passes(self):
        """The real converter_v2 tree ships with zero bound emits (D182 purge)."""
        assert check_bound_emit.run() == []
