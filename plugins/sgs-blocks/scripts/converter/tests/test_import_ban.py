"""test_import_ban.py — proves the import-ban gate catches frozen-engine imports.

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_import_ban.py

STOP-16: each planted case writes a synthetic converter file importing the frozen
engine and asserts the gate flags it.

EXECUTION Step 9 (Phase 3, 2026-07-04): db_lookup and icon_resolver moved OUT of
orchestrator.converter_v2 to converter.db.db_lookup / converter.services.icon_resolver.
The gate's db_lookup/icon_resolver allowlist is retired — ALL orchestrator.converter_v2
imports are now banned unconditionally, and the new-home imports (which never touch
orchestrator.converter_v2) are proven to pass clean.
"""
from __future__ import annotations

from pathlib import Path

from converter.gates.import_ban import run


def _scan(tmp_path: Path, source: str) -> list[dict]:
    (tmp_path / "probe.py").write_text(source, encoding="utf-8")
    return run(converter_dir=tmp_path)


def _scan_named(tmp_path: Path, filename: str, source: str) -> list[dict]:
    (tmp_path / filename).write_text(source, encoding="utf-8")
    return run(converter_dir=tmp_path)


# -- banned ----------------------------------------------------------------

def test_bans_import_convert(tmp_path):
    assert len(_scan(tmp_path, "import convert\n")) == 1


def test_bans_import_convert_page(tmp_path):
    assert len(_scan(tmp_path, "import convert_page\n")) == 1


def test_bans_from_converter_v2_import_convert(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2 import convert\n")
    assert len(v) == 1


def test_bans_from_convert_submodule(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2.convert import walk\n")
    assert len(v) == 1


def test_bans_dotted_import_convert(tmp_path):
    v = _scan(tmp_path, "import orchestrator.converter_v2.convert\n")
    assert len(v) == 1


def test_bans_importlib_dynamic(tmp_path):
    src = "import importlib\ndef r():\n    return importlib.import_module('orchestrator.converter_v2.convert')\n"
    assert len(_scan(tmp_path, src)) == 1


def test_bans_dunder_import_dynamic(tmp_path):
    assert len(_scan(tmp_path, "def r():\n    return __import__('convert')\n")) == 1


def test_bans_importlib_db_lookup(tmp_path):
    """Post-Step-9: db_lookup is no longer a permitted leaf — importlib-dynamic
    reach into orchestrator.converter_v2.db_lookup is banned like any other symbol."""
    src = "import importlib\ndef r():\n    return importlib.import_module('orchestrator.converter_v2.db_lookup')\n"
    assert len(_scan(tmp_path, src)) == 1


# -- banned (db_lookup / icon_resolver — allowlist retired Step 9) ---------

def test_bans_from_pkg_import_db_lookup(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2 import db_lookup\n")
    assert len(v) == 1


def test_bans_from_db_lookup_import_symbol(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2.db_lookup import attr_for_property\n")
    assert len(v) == 1


def test_bans_dotted_db_lookup(tmp_path):
    v = _scan(tmp_path, "import orchestrator.converter_v2.db_lookup\n")
    assert len(v) == 1


def test_bans_from_pkg_import_icon_resolver(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2 import icon_resolver\n")
    assert len(v) == 1


def test_bans_from_icon_resolver_import_symbol(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2.icon_resolver import resolve_icon\n")
    assert len(v) == 1


# -- allowed (the new homes — never touch orchestrator.converter_v2) ------

def test_allows_from_converter_db_import_db_lookup(tmp_path):
    v = _scan(tmp_path, "from converter.db import db_lookup\n")
    assert v == []


def test_allows_from_converter_db_db_lookup_import_symbol(tmp_path):
    v = _scan(tmp_path, "from converter.db.db_lookup import attr_for_property\n")
    assert v == []


def test_allows_from_converter_services_import_icon_resolver(tmp_path):
    v = _scan(tmp_path, "from converter.services import icon_resolver\n")
    assert v == []


def test_allows_from_converter_services_icon_resolver_import_symbol(tmp_path):
    v = _scan(tmp_path, "from converter.services.icon_resolver import resolve_icon\n")
    assert v == []


def test_allows_unrelated_import(tmp_path):
    v = _scan(tmp_path, "import json\nfrom pathlib import Path\n")
    assert v == []


# -- STOP-28 fallback exemption (EXECUTION Step 10, 2026-07-04) ------------
# Plant-tests for BOTH narrowing axes described in import_ban.py's module
# docstring ("ONE NARROW EXEMPTION"): file identity (must be exactly
# entry.py) AND a per-import marker comment (must be on the import's own
# source line). Either axis missing must still fail the gate.

def test_stop28_exempt_marked_import_in_entry_py(tmp_path):
    """The exact shape used in converter/entry.py — file=entry.py + marker
    comment on the import line — is exempted."""
    src = (
        "def f():\n"
        "    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16\n"
        "    return v3\n"
    )
    v = _scan_named(tmp_path, "entry.py", src)
    assert v == []


def test_stop28_unmarked_import_in_entry_py_still_banned(tmp_path):
    """Axis 2 (marker) is enforced even inside entry.py — an unmarked
    frozen-tree import in the exempt FILE is still a violation."""
    src = (
        "def f():\n"
        "    from orchestrator.converter_v2 import convert as v3\n"
        "    return v3\n"
    )
    v = _scan_named(tmp_path, "entry.py", src)
    assert len(v) == 1


def test_stop28_marked_import_outside_entry_py_still_banned(tmp_path):
    """Axis 1 (file identity) is enforced even with the marker comment present
    — the exact same marked import in a DIFFERENT file is still a violation.
    Proves the exemption cannot be copy-pasted into another converter/ file."""
    src = (
        "def f():\n"
        "    from orchestrator.converter_v2 import convert as v3  # STOP-28 fallback — dies at Step 16\n"
        "    return v3\n"
    )
    v = _scan_named(tmp_path, "not_entry.py", src)
    assert len(v) == 1


def test_real_entry_py_has_no_unmarked_frozen_imports():
    """The real converter/entry.py, scanned in place, is all-clear: every one
    of its frozen-tree imports carries the STOP-28 marker."""
    real_converter_dir = Path(__file__).resolve().parents[1]  # scripts/converter/
    assert (real_converter_dir / "entry.py").exists()
    violations = run(converter_dir=real_converter_dir)
    assert violations == [], violations
