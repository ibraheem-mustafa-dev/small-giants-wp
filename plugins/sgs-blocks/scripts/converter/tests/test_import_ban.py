"""test_import_ban.py — proves the import-ban gate catches frozen-engine imports.

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_import_ban.py

STOP-16: each planted case writes a synthetic converter file importing the frozen
engine and asserts the gate flags it; the allowed cases (db_lookup) assert zero
false positives.
"""
from __future__ import annotations

from pathlib import Path

from converter.gates.import_ban import run


def _scan(tmp_path: Path, source: str) -> list[dict]:
    (tmp_path / "probe.py").write_text(source, encoding="utf-8")
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


def test_allows_importlib_db_lookup(tmp_path):
    src = "import importlib\ndef r():\n    return importlib.import_module('orchestrator.converter_v2.db_lookup')\n"
    assert _scan(tmp_path, src) == []


# -- allowed (db_lookup) ---------------------------------------------------

def test_allows_from_pkg_import_db_lookup(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2 import db_lookup\n")
    assert v == []


def test_allows_from_db_lookup_import_symbol(tmp_path):
    v = _scan(tmp_path, "from orchestrator.converter_v2.db_lookup import attr_for_property\n")
    assert v == []


def test_allows_dotted_db_lookup(tmp_path):
    v = _scan(tmp_path, "import orchestrator.converter_v2.db_lookup\n")
    assert v == []


def test_allows_unrelated_import(tmp_path):
    v = _scan(tmp_path, "import json\nfrom pathlib import Path\n")
    assert v == []
