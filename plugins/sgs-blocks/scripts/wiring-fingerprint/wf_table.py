"""The names the Cart and Checkout look table builds (`includes/woocommerce/commerce-look/selectors.json`).

The table names each setting as a row prefix plus a column suffix, so no editor file or PHP emitter holds the name as a
literal. The one reader of that JSON is `scripts/generate-commerce-look-table.js` (`--names`), the same code that writes
the roster rows, so this gate and the generator cannot disagree about which settings the table defines. A setting whose
column is dropped from its row is absent from this set and is reported like any other unwired attribute.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from wf_paths import SCRIPTS

GENERATOR = SCRIPTS / "generate-commerce-look-table.js"
TABLE_REL = Path("includes") / "woocommerce" / "commerce-look" / "selectors.json"


def table_attribute_names(plugin: Path, node: str = "node") -> frozenset[str]:
    """Every setting name the table in `plugin` defines; empty when the plugin has no table."""
    table = plugin / TABLE_REL
    if not table.exists():
        return frozenset()
    proc = subprocess.run([node, str(GENERATOR), "--names", str(table)], capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"generate-commerce-look-table.js --names failed (exit {proc.returncode}): {proc.stderr[:800]}")
    return frozenset(json.loads(proc.stdout))
