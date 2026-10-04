"""Gate inputs: the framework DB (read-only), block.json files, the extension
roster, and the two Node collectors (editor facts and the check-dead-controls
dump), regenerated on every run so their facts are never stale.

Never reads the calibration cache (`scripts/computed-route/cache/`); that is a
test oracle only.
"""
from __future__ import annotations

import json
import sqlite3
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from wf_paths import COLLECTOR_JS, Roots

ATTR_COLUMNS = (
    "block_slug", "attr_name", "attr_type", "css_property", "css_element", "css_state",
    "role", "tier_shape", "box_family", "source",
)


class Collectors:
    """The two Node collectors, started at once and collected on first use, so the
    Python side indexes PHP and CSS while Node parses the editor files."""

    def __init__(self, roots: Roots, with_dump: bool) -> None:
        self._facts_p = _spawn(["node", str(COLLECTOR_JS), str(roots.plugin), str(roots.node_modules)], roots.plugin)
        self._dump_p = _spawn(["node", "scripts/check-dead-controls.js", "--dump-json"], roots.plugin) if with_dump else None
        self._facts: dict | None = None
        self._dump: dict | None = None

    @property
    def facts(self) -> dict:
        if self._facts is None:
            self._facts = json.loads(_collect(self._facts_p, "editor_facts.js"))
        return self._facts

    @property
    def dump(self) -> dict[tuple[str, str], dict]:
        if self._dump is None:
            self._dump = {}
            if self._dump_p is not None:
                for r in json.loads(_collect(self._dump_p, "check-dead-controls.js --dump-json")):
                    self._dump[(r["block"], r["attr"])] = r
        return self._dump


@dataclass
class Inputs:
    rows: list[dict]
    suffixes: list[tuple[str, str]]          # (suffix, css_property), longest first
    blockjson: dict[str, tuple[Path, dict]]  # block name -> (dir, block.json)
    uses_context: dict[str, set[str]]        # context key -> consumer block names
    roster: list[dict]
    collectors: Collectors
    seeded: set = field(default_factory=set)  # (block, attr) rows of every DB source

    @property
    def facts(self) -> dict:
        return self.collectors.facts

    @property
    def dump(self) -> dict[tuple[str, str], dict]:
        return self.collectors.dump


def open_db(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)


def load_rows(db: sqlite3.Connection) -> list[dict]:
    cols = ", ".join(ATTR_COLUMNS)
    cur = db.execute(
        f"SELECT {cols} FROM block_attributes WHERE source = 'sgs' ORDER BY block_slug, attr_name"
    )
    return [dict(zip(ATTR_COLUMNS, r, strict=True)) for r in cur.fetchall()]


def load_suffixes(db: sqlite3.Connection) -> list[tuple[str, str]]:
    rows = db.execute("SELECT suffix, css_property FROM property_suffixes WHERE css_property IS NOT NULL").fetchall()
    return [(s, c) for s, c in rows if s and c]


def load_blockjson(roots: Roots) -> tuple[dict, dict]:
    bj: dict[str, tuple[Path, dict]] = {}
    uses: dict[str, set[str]] = {}
    for p in sorted(roots.blocks.glob("*/block.json")):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        name = d.get("name")
        if not name:
            continue
        bj[name] = (p.parent, d)
        for k in d.get("usesContext", []) or []:
            uses.setdefault(k, set()).add(name)
    return bj, uses


def load_roster(roots: Roots) -> list[dict]:
    p = roots.blocks / "extensions" / "extension-roster.json"
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8")).get("extensions", [])


def _spawn(cmd: list[str], cwd: Path) -> subprocess.Popen:
    return subprocess.Popen(cmd, cwd=str(cwd), stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def _collect(proc: subprocess.Popen, what: str) -> str:
    out, err = proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"{what} failed (exit {proc.returncode}): {err.decode('utf-8', 'replace')[:800]}")
    return out.decode("utf-8")


def load_inputs(roots: Roots, with_dump: bool = True) -> Inputs:
    collectors = Collectors(roots, with_dump)
    db = open_db(roots.db)
    try:
        rows = load_rows(db)
        suffixes = load_suffixes(db)
        seeded = set(db.execute("SELECT block_slug, attr_name FROM block_attributes").fetchall())
    finally:
        db.close()
    bj, uses = load_blockjson(roots)
    return Inputs(rows=rows, suffixes=suffixes, blockjson=bj, uses_context=uses,
                  roster=load_roster(roots), collectors=collectors, seeded=seeded)
