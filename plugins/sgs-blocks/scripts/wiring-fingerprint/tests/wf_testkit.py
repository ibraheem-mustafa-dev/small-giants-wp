"""Test helpers for the wiring-fingerprint gate: build the fixture tree and its
framework DB, and read findings back."""
from __future__ import annotations

import json
import shutil
import sqlite3
from pathlib import Path

from wf_paths import fixture_roots

HERE = Path(__file__).resolve().parent
FIXTURES = HERE / "fixtures"

COLUMNS = ("block_slug", "attr_name", "attr_type", "css_property", "css_element", "css_state", "role",
           "tier_shape", "box_family", "source")


def build_db(path: Path, spec: dict) -> Path:
    db = sqlite3.connect(path)
    db.execute(f"CREATE TABLE block_attributes ({', '.join(COLUMNS)})")
    db.execute("CREATE TABLE property_suffixes (suffix, role, css_property, is_token_matched, token_source, notes, kind_override)")
    for r in spec["block_attributes"]:
        row = {"css_element": None, "box_family": None, "source": "sgs", **r}
        db.execute(f"INSERT INTO block_attributes VALUES ({', '.join('?' * len(COLUMNS))})", [row[c] for c in COLUMNS])
    for s in spec["property_suffixes"]:
        db.execute("INSERT INTO property_suffixes (suffix, role, css_property) VALUES (?, ?, ?)", (s["suffix"], s["role"], s["css_property"]))
    db.commit()
    db.close()
    return path


def make_roots(tmp: Path):
    plugin = tmp / "plugin"
    shutil.copytree(FIXTURES / "plugin", plugin)
    db = build_db(tmp / "fixture.db", json.loads((FIXTURES / "db.json").read_text(encoding="utf-8")))
    return fixture_roots(plugin, db)


def links_of(report: dict, block: str, attr: str | None = None) -> set[str]:
    return {f["link"] for f in report["findings"] if f["block"] == block and (attr is None or f["attr"] == attr)}


def record(report: dict, block: str, attr: str) -> dict:
    return next(r for r in report["records"] if r["block"] == block and r["attr"] == attr)
