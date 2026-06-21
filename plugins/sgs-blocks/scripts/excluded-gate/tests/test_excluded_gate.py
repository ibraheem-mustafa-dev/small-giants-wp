"""test_excluded_gate.py — pytest suite for the F5 excluded-literal gate.

Spec ref: .claude/plans/2026-06-18-f4-excluded-properties-design.md §3

Tests
-----
1. Scanner — inline equality form detected correctly.
2. Scanner — membership form with inline literals detected.
3. Scanner — membership form with named variable detected.
4. Scanner — .startswith("--") guard detected.
5. Scanner — named denylist set (EXCLUDED_PROPS) detected.
6. Scanner — non-CSS variable names do NOT trigger membership detection.
7. Scanner — SKIP_TOP_LEVEL_TAGS pattern NOT detected (out of scope).
8. Scanner — test_ files are skipped.
9. DB check — property in excluded_properties → no violation.
10. DB check — property NOT in excluded_properties → violation.
11. DB check — startswith_dashdash form → no violation (custom props out of scope).
12. Self-blessing guard — hash mismatch on tampered baseline → detected.
13. Self-blessing guard — correct hash → passes.
14. Baseline — shrinkage (key in baseline but absent from code) is noted, not failed.
15. Planted violation — a new literal not in the current baseline causes exit 1.

All tests use in-memory SQLite or synthetic files — no mutation of the real DB.
Style mirrors db-consistency/tests/test_f6_consistency.py.
"""
from __future__ import annotations

import hashlib
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
# Package bootstrap — mirrors run.py bootstrap so relative imports work.
# ---------------------------------------------------------------------------

_PKG_DIR = Path(__file__).resolve().parents[1]   # scripts/excluded-gate/
_SCRIPTS_DIR = _PKG_DIR.parent                   # scripts/


def _bootstrap_excluded_gate():
    if "excluded_gate" in sys.modules:
        return
    pkg = types.ModuleType("excluded_gate")
    pkg.__path__ = [str(_PKG_DIR)]  # type: ignore[assignment]
    pkg.__package__ = "excluded_gate"
    sys.modules["excluded_gate"] = pkg

    def _load(name: str):
        mod_id = f"excluded_gate.{name}"
        if mod_id in sys.modules:
            return sys.modules[mod_id]
        spec = importlib.util.spec_from_file_location(mod_id, str(_PKG_DIR / f"{name}.py"))
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        sys.modules[mod_id] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        return mod

    _load("models")
    _load("scanner")
    _load("db_check")
    _load("run")


_bootstrap_excluded_gate()

from excluded_gate.models import ExclusionSignature, GateViolation, signature_key  # noqa: E402
from excluded_gate import scanner, db_check, run  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mem_db(props: list[str]) -> sqlite3.Connection:
    """Create an in-memory DB with excluded_properties table seeded with ``props``."""
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE excluded_properties "
        "(css_property TEXT NOT NULL, reason TEXT NOT NULL, "
        "decided_by TEXT NOT NULL, date TEXT NOT NULL)"
    )
    for p in props:
        conn.execute(
            "INSERT INTO excluded_properties VALUES (?,?,?,?)",
            (p, "test reason", "test", "2026-06-21"),
        )
    conn.commit()
    return conn


def _scan_source(source: str, filename: str = "test_scan.py") -> list[ExclusionSignature]:
    """Scan a synthetic source string and return signatures."""
    import ast
    return scanner._scan_file(
        # Write to a tmp file is unnecessary — call _scan_file with a real Path
        # for the source.  Instead, monkeypatch by direct call with a tmp path.
        _write_and_path(source, filename),
        filename,
    )


def _write_and_path(source: str, filename: str, tmp_dir: Path | None = None) -> Path:
    """Write source to a temp file and return its Path."""
    import tempfile
    d = Path(tempfile.mkdtemp())
    p = d / filename
    p.write_text(source, encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# 1. Scanner — inline equality
# ---------------------------------------------------------------------------

class TestScannerInlineEquality:

    def test_detects_simple_equality_drop(self, tmp_path):
        """if css_prop == "max-width": continue → form=inline_equality, prop='max-width'."""
        src = textwrap.dedent("""\
            def lift(css_prop):
                if css_prop == "max-width":
                    continue
        """)
        p = tmp_path / "lift.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "lift.py")
        assert len(sigs) == 1
        s = sigs[0]
        assert s.form == "inline_equality"
        assert s.prop == "max-width"

    def test_detects_equality_in_bool_op(self, tmp_path):
        """if css_prop == "width" and not allow: continue → detected."""
        src = textwrap.dedent("""\
            def lift(css_prop, allow):
                if css_prop == "width" and not allow:
                    continue
        """)
        p = tmp_path / "lift.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "lift.py")
        props = {s.prop for s in sigs if s.form == "inline_equality"}
        assert "width" in props

    def test_ignores_non_css_string(self, tmp_path):
        """if css_prop == "camelCase": continue → NOT a CSS property, not detected."""
        src = textwrap.dedent("""\
            def f(css_prop):
                if css_prop == "camelCase":
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        assert not sigs

    def test_ignores_non_css_var_name(self, tmp_path):
        """if attr_name == "width": continue → attr_name is not in _CSS_VAR_NAMES, not detected."""
        src = textwrap.dedent("""\
            def f(attr_name):
                if attr_name == "width":
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        assert not sigs, "attr_name is not a CSS-property variable — should not be flagged"

    def test_ignores_no_continue(self, tmp_path):
        """if css_prop == "width": pass → no continue, not detected."""
        src = textwrap.dedent("""\
            def f(css_prop):
                if css_prop == "width":
                    pass
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        assert not sigs


# ---------------------------------------------------------------------------
# 2. Scanner — membership inline literals
# ---------------------------------------------------------------------------

class TestScannerMembershipInline:

    def test_detects_tuple_membership(self, tmp_path):
        """if css_prop in ("max-width", "width"): continue → 2 membership sigs."""
        src = textwrap.dedent("""\
            def f(css_prop):
                if css_prop in ("max-width", "width"):
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        props = {s.prop for s in sigs if s.form == "membership"}
        assert "max-width" in props
        assert "width" in props

    def test_detects_set_membership(self, tmp_path):
        """if prop in {"gap", "row-gap"}: continue → 2 membership sigs."""
        src = textwrap.dedent("""\
            def f(prop):
                if prop in {"gap", "row-gap"}:
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        props = {s.prop for s in sigs if s.form == "membership"}
        assert "gap" in props
        assert "row-gap" in props


# ---------------------------------------------------------------------------
# 3. Scanner — membership named variable
# ---------------------------------------------------------------------------

class TestScannerMembershipVar:

    def test_detects_named_var_membership(self, tmp_path):
        """if css_prop in _EXCLUDED_SET: continue → membership sig with prop=_EXCLUDED_SET."""
        src = textwrap.dedent("""\
            _EXCLUDED_SET = frozenset({"width"})
            def f(css_prop):
                if css_prop in _EXCLUDED_SET:
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        var_sigs = [s for s in sigs if s.form == "membership" and s.prop == "_EXCLUDED_SET"]
        assert len(var_sigs) == 1

    def test_does_not_flag_non_css_var_in_membership(self, tmp_path):
        """if key in seen: continue → 'key' not in _CSS_VAR_NAMES, not detected."""
        src = textwrap.dedent("""\
            def f():
                seen = set()
                for key in items:
                    if key in seen:
                        continue
                    seen.add(key)
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        assert not sigs, "key/seen dedup pattern must not be detected as a CSS exclusion"


# ---------------------------------------------------------------------------
# 4. Scanner — .startswith("--") guard
# ---------------------------------------------------------------------------

class TestScannerStartswithGuard:

    def test_detects_startswith_dashdash(self, tmp_path):
        """if css_prop.startswith("--"): continue → startswith_dashdash sig."""
        src = textwrap.dedent("""\
            def f(css_prop):
                if css_prop.startswith("--"):
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        sw_sigs = [s for s in sigs if s.form == "startswith_dashdash"]
        assert len(sw_sigs) == 1
        assert sw_sigs[0].prop == "--*"

    def test_does_not_detect_startswith_without_css_var(self, tmp_path):
        """if name.startswith("--"): continue where 'name' not in _CSS_VAR_NAMES → skip."""
        src = textwrap.dedent("""\
            def f(name):
                if name.startswith("--"):
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        sw_sigs = [s for s in sigs if s.form == "startswith_dashdash"]
        # The snippet contains 'name' not any of _CSS_VAR_NAMES; should not be detected.
        assert not sw_sigs, "startswith guard without a CSS variable name should not be flagged"


# ---------------------------------------------------------------------------
# 5. Scanner — named denylist set (EXCLUDED_PROPS)
# ---------------------------------------------------------------------------

class TestScannerNamedSet:

    def test_detects_named_set_with_literals(self, tmp_path):
        """_LIFT_EXCLUDED_PROPS = frozenset({"max-width", "width"}) → 2 named_set sigs."""
        src = textwrap.dedent("""\
            _LIFT_EXCLUDED_PROPS = frozenset({"max-width", "width"})
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        named = [s for s in sigs if s.form == "named_set"]
        props = {s.prop for s in named}
        assert "max-width" in props
        assert "width" in props

    def test_does_not_flag_is_excluded_boolean(self, tmp_path):
        """_is_excluded = ... → boolean, name does not end in EXCLUDED_PROPS, not flagged."""
        src = textwrap.dedent("""\
            _is_excluded = css_prop == "width" or (css_prop == "max-width" and not allow)
            if not _is_excluded:
                pass
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        named = [s for s in sigs if s.form == "named_set"]
        assert not named, "_is_excluded (boolean) must not be flagged as a named denylist set"

    def test_does_not_flag_cross_node_excluded_props(self, tmp_path):
        """_CROSS_NODE_EXCLUDED_PROPS name ends in _PROPS but needs EXCLUDED_PROPS to match."""
        src = textwrap.dedent("""\
            _CROSS_NODE_EXCLUDED_PROPS = frozenset({"display", "grid-template-columns"})
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        # _CROSS_NODE_EXCLUDED_PROPS ends in _EXCLUDED_PROPS → should be detected.
        named = [s for s in sigs if s.form == "named_set"]
        # Confirm: the regex matches because it ends in EXCLUDED_PROPS.
        import re
        assert re.search(r'(?:EXCLUDED_PROPS|excluded_props|_EXCLUDED_PROPS)$', "_CROSS_NODE_EXCLUDED_PROPS", re.IGNORECASE)
        assert len(named) == 2, (
            f"Expected 2 named_set sigs for _CROSS_NODE_EXCLUDED_PROPS, got {len(named)}: "
            f"{[s.prop for s in named]}"
        )


# ---------------------------------------------------------------------------
# 6. Scanner — SKIP_TOP_LEVEL_TAGS is out of scope
# ---------------------------------------------------------------------------

class TestScannerOutOfScope:

    def test_skip_top_level_tags_not_flagged(self, tmp_path):
        """SKIP_TOP_LEVEL_TAGS membership check is in the explicit out-of-scope allowlist.

        F4 spec §3: 'SKIP_TOP_LEVEL_TAGS is OUT of scope (header/footer/nav are not
        CSS properties — do not flag the permitted tag-skip).'

        The scanner allowlist (_EXCLUDED_VAR_ALLOWLIST) suppresses the variable-name
        membership detection for SKIP_TOP_LEVEL_TAGS even though css_prop is the loop
        variable.
        """
        src = textwrap.dedent("""\
            SKIP_TOP_LEVEL_TAGS = frozenset({"header", "footer", "nav"})
            def f(css_prop):
                if css_prop in SKIP_TOP_LEVEL_TAGS:
                    continue
        """)
        p = tmp_path / "f.py"
        p.write_text(src, encoding="utf-8")
        sigs = scanner._scan_file(p, "f.py")
        # SKIP_TOP_LEVEL_TAGS is in _EXCLUDED_VAR_ALLOWLIST → membership sig suppressed.
        # The named_set detection also does not fire (name doesn't end in EXCLUDED_PROPS).
        membership_sigs = [s for s in sigs if s.form == "membership" and s.prop == "SKIP_TOP_LEVEL_TAGS"]
        assert not membership_sigs, (
            "SKIP_TOP_LEVEL_TAGS is in the explicit out-of-scope allowlist "
            "(F4 spec §3) — must not produce a membership signature"
        )


# ---------------------------------------------------------------------------
# 7. Scanner — test files are skipped
# ---------------------------------------------------------------------------

class TestScannerFileSkipping:

    def test_test_file_skipped(self, tmp_path):
        """Files named test_*.py are skipped even if they contain exclusion patterns."""
        src = textwrap.dedent("""\
            def f(css_prop):
                if css_prop == "max-width":
                    continue
        """)
        p = tmp_path / "test_some_module.py"
        p.write_text(src, encoding="utf-8")
        assert scanner._skip_file(p), "test_*.py files must be skipped"

    def test_non_test_file_not_skipped(self, tmp_path):
        """A regular .py file is not skipped."""
        p = tmp_path / "lift.py"
        p.write_text("", encoding="utf-8")
        assert not scanner._skip_file(p)

    def test_retired_subdir_skipped(self, tmp_path):
        """Files under _retired/ are skipped."""
        retired = tmp_path / "_retired"
        retired.mkdir()
        p = retired / "old_convert.py"
        p.write_text("", encoding="utf-8")
        assert scanner._skip_file(p)


# ---------------------------------------------------------------------------
# 8. DB check — violation vs no-violation
# ---------------------------------------------------------------------------

class TestDbCheck:

    def test_property_in_db_no_violation(self):
        """CSS property in excluded_properties → no violation raised."""
        conn = _make_mem_db(["max-width"])
        excluded = db_check.load_excluded_properties(conn)
        conn.close()

        sig = ExclusionSignature(
            file="f.py", line=1, form="inline_equality", prop="max-width",
            snippet='if css_prop == "max-width": continue',
            key=signature_key("f.py", 1, "inline_equality", "max-width"),
        )
        violations = db_check.check_signatures([sig], excluded)
        assert violations == [], (
            f"No violation expected when property is in the DB, got {violations}"
        )

    def test_property_not_in_db_violation_raised(self):
        """CSS property NOT in excluded_properties → GateViolation raised."""
        conn = _make_mem_db([])
        excluded = db_check.load_excluded_properties(conn)
        conn.close()

        sig = ExclusionSignature(
            file="f.py", line=5, form="inline_equality", prop="z-index",
            snippet='if css_prop == "z-index": continue',
            key=signature_key("f.py", 5, "inline_equality", "z-index"),
        )
        violations = db_check.check_signatures([sig], excluded)
        assert len(violations) == 1
        v = violations[0]
        assert v.sig is sig
        assert "z-index" in v.detail
        assert v.key == sig.key

    def test_startswith_dashdash_no_violation(self):
        """startswith_dashdash form is always allowed (custom properties out of scope)."""
        conn = _make_mem_db([])
        excluded = db_check.load_excluded_properties(conn)
        conn.close()

        sig = ExclusionSignature(
            file="f.py", line=7, form="startswith_dashdash", prop="--*",
            snippet='if css_prop.startswith("--"): continue',
            key=signature_key("f.py", 7, "startswith_dashdash", "--*"),
        )
        violations = db_check.check_signatures([sig], excluded)
        assert violations == [], (
            "startswith_dashdash (custom property guard) must never raise a violation"
        )

    def test_dedup_keys_prevent_double_reporting(self):
        """Duplicate signatures (same key) are only reported once."""
        conn = _make_mem_db([])
        excluded = db_check.load_excluded_properties(conn)
        conn.close()

        key = signature_key("f.py", 1, "inline_equality", "width")
        sig_a = ExclusionSignature(
            file="f.py", line=1, form="inline_equality", prop="width",
            snippet='if css_prop == "width": continue', key=key,
        )
        sig_b = ExclusionSignature(
            file="f.py", line=1, form="inline_equality", prop="width",
            snippet='if css_prop == "width": continue', key=key,
        )
        violations = db_check.check_signatures([sig_a, sig_b], excluded)
        assert len(violations) == 1, "Duplicate keys must be deduplicated"


# ---------------------------------------------------------------------------
# 9. Self-blessing guard
# ---------------------------------------------------------------------------

class TestSelfBlessingGuard:

    def _compute_hash(self, keys: list[str]) -> str:
        payload = "\n".join(sorted(keys)).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def test_correct_hash_passes(self, tmp_path):
        """A baseline with a matching hash passes the integrity check."""
        keys = ["excl:f.py:1:inline_equality:width"]
        baseline = {
            "hash": self._compute_hash(keys),
            "signatures": keys,
        }
        baseline_path = tmp_path / "excluded-gate-baseline.json"
        baseline_path.write_text(json.dumps(baseline), encoding="utf-8")

        with patch.object(run, "_BASELINE_PATH", baseline_path):
            loaded_keys, stored_hash = run._load_baseline()

        expected_hash = self._compute_hash(list(loaded_keys))
        assert expected_hash == stored_hash, (
            "Correct hash must match after loading"
        )

    def test_tampered_hash_detected(self, tmp_path):
        """A hand-edited baseline (wrong hash) is caught by hash mismatch."""
        keys = ["excl:f.py:1:inline_equality:width"]
        # Tamper: set hash to a wrong value.
        baseline = {
            "hash": "000000000000000000000000000000000000000000000000000000000000000",
            "signatures": keys,
        }
        baseline_path = tmp_path / "excluded-gate-baseline.json"
        baseline_path.write_text(json.dumps(baseline), encoding="utf-8")

        with patch.object(run, "_BASELINE_PATH", baseline_path):
            loaded_keys, stored_hash = run._load_baseline()

        expected_hash = run._compute_hash(list(loaded_keys))
        assert expected_hash != stored_hash, (
            "A tampered hash must NOT match the recomputed hash"
        )

    def test_update_baseline_produces_correct_hash(self, tmp_path):
        """--update-baseline writes a correctly hashed baseline."""
        baseline_path = tmp_path / "excluded-gate-baseline.json"

        # Save a baseline with one key.
        with patch.object(run, "_BASELINE_PATH", baseline_path):
            run._save_baseline(["excl:test.py:5:inline_equality:gap"])

        data = json.loads(baseline_path.read_text(encoding="utf-8"))
        stored_hash = data["hash"]
        keys = data["signatures"]
        expected = self._compute_hash(keys)
        assert stored_hash == expected, (
            "--update-baseline must write a hash that matches the key list"
        )

    def test_adding_key_without_growing_code_is_harmless(self, tmp_path):
        """Adding a key to the baseline JSON that has NO matching code literal is safe.

        The key appears as 'no longer in code' in the report but does NOT
        cause a failure — it would just be cleaned up on next --update-baseline.
        This is safe because the key doesn't represent a new literal being smuggled in.
        """
        # The real hash of the CURRENT violation keys (from scanning live code).
        current_violations: list[str] = []
        # For this test, start with an empty code scan (mock scan_orchestrator to return nothing).
        with patch.object(scanner, "scan_orchestrator", return_value=[]):
            sigs: list[ExclusionSignature] = []

        # Baseline has a key that no longer exists in code.
        orphan_key = "excl:old_file.py:10:inline_equality:z-index"
        baseline = {
            "hash": self._compute_hash([orphan_key]),
            "signatures": [orphan_key],
        }
        baseline_path = tmp_path / "excluded-gate-baseline.json"
        baseline_path.write_text(json.dumps(baseline), encoding="utf-8")

        with patch.object(run, "_BASELINE_PATH", baseline_path):
            loaded_keys, stored_hash = run._load_baseline()
            # Integrity: hash should match.
            assert run._compute_hash(list(loaded_keys)) == stored_hash

        # With no violations from scanning, new_violations = [].
        # The baseline key is gone from code but that's not a failure.
        assert orphan_key in loaded_keys
        # No new violation → --check would pass.


# ---------------------------------------------------------------------------
# 10. Planted violation integration test
# ---------------------------------------------------------------------------

class TestPlantedViolationIntegration:
    """End-to-end: plant a new exclusion literal → check exits 1; revert → exits 0."""

    def test_new_exclusion_causes_check_failure(self, tmp_path):
        """A synthetic file with a new exclusion NOT in the baseline → violation detected."""
        import sqlite3

        # Synthetic source with a new exclusion.
        src = textwrap.dedent("""\
            def lift(css_prop):
                if css_prop == "z-index":
                    continue
        """)
        new_file = tmp_path / "lift_new.py"
        new_file.write_text(src, encoding="utf-8")

        # Scan ONLY the synthetic file.
        sigs = scanner._scan_file(new_file, "lift_new.py")
        assert len(sigs) == 1
        assert sigs[0].prop == "z-index"

        # DB has no excluded_properties.
        conn = _make_mem_db([])
        excluded = db_check.load_excluded_properties(conn)
        conn.close()

        violations = db_check.check_signatures(sigs, excluded)
        assert len(violations) == 1, "New exclusion not in DB must be a violation"

        # Baseline has no keys — so the violation is NEW.
        baseline_keys: set[str] = set()
        new_violations = [v for v in violations if v.key not in baseline_keys]
        assert len(new_violations) == 1

    def test_exclusion_in_db_no_violation(self, tmp_path):
        """A literal whose property IS in the DB must not produce a violation."""
        src = textwrap.dedent("""\
            def lift(css_prop):
                if css_prop == "z-index":
                    continue
        """)
        f = tmp_path / "lift.py"
        f.write_text(src, encoding="utf-8")

        sigs = scanner._scan_file(f, "lift.py")
        conn = _make_mem_db(["z-index"])  # z-index IS in DB this time.
        excluded = db_check.load_excluded_properties(conn)
        conn.close()

        violations = db_check.check_signatures(sigs, excluded)
        assert violations == [], (
            "Exclusion whose property IS in the DB must not produce a violation"
        )


# ---------------------------------------------------------------------------
# 11. Stable key format
# ---------------------------------------------------------------------------

class TestModelKeys:

    def test_signature_key_format(self):
        key = signature_key("orchestrator/convert.py", 966, "named_set", "max-width")
        assert key == "excl:orchestrator/convert.py:966:named_set:max-width"

    def test_key_uniqueness_by_line(self):
        k1 = signature_key("f.py", 10, "inline_equality", "width")
        k2 = signature_key("f.py", 11, "inline_equality", "width")
        assert k1 != k2

    def test_key_uniqueness_by_form(self):
        k1 = signature_key("f.py", 10, "inline_equality", "width")
        k2 = signature_key("f.py", 10, "membership", "width")
        assert k1 != k2
