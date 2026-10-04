"""Path resolution for the wiring-fingerprint gate.

Every path comes from this file's own location (the plugin and repo roots) or
from the home directory (the framework DB), so the gate runs the same from any
working directory and on any machine. A `Roots` object carries them so the test
fixtures can point the whole gate at a miniature plugin tree.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent            # scripts/wiring-fingerprint/
SCRIPTS = HERE.parent                             # plugins/sgs-blocks/scripts/
PLUGIN = SCRIPTS.parent                           # plugins/sgs-blocks/
REPO = PLUGIN.parent.parent                       # repo root

# The same resolver the other DB-reading gates use
# (check-hover-state-classification.py::SGS_DB, check-css-layer-orphans.py::DB_PATH).
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

BASELINE = SCRIPTS / "wiring-fingerprint-baseline.json"
COLLECTOR_JS = HERE / "editor_facts.js"


@dataclass(frozen=True)
class Roots:
    """The trees one gate run reads. `node_modules` always comes from the real
    plugin (the fixtures have none of their own)."""

    plugin: Path
    theme: Path
    db: Path
    node_modules: Path

    @property
    def src(self) -> Path:
        return self.plugin / "src"

    @property
    def blocks(self) -> Path:
        return self.plugin / "src" / "blocks"

    @property
    def includes(self) -> Path:
        return self.plugin / "includes"

    def rel(self, path: str | os.PathLike) -> str:
        """A plugin-relative, forward-slash path for reports (never absolute)."""
        p = Path(path)
        try:
            return p.resolve().relative_to(self.plugin.resolve()).as_posix()
        except ValueError:
            try:
                return "theme:" + p.resolve().relative_to(self.theme.resolve()).as_posix()
            except ValueError:
                return p.name


def real_roots() -> Roots:
    return Roots(
        plugin=PLUGIN,
        theme=REPO / "theme" / "sgs-theme",
        db=DB_PATH,
        node_modules=PLUGIN / "node_modules",
    )


def fixture_roots(plugin_dir: Path, db: Path) -> Roots:
    return Roots(
        plugin=plugin_dir,
        theme=plugin_dir / "_theme",
        db=db,
        node_modules=PLUGIN / "node_modules",
    )
