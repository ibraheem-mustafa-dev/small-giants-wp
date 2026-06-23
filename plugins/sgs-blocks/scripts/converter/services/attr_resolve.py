"""attr_resolve — name-free (block, layer, property) → attr resolution (design §3.1).

Wraps db_lookup.attr_for_layer_property (the vetted per-block layer→attr resolver,
db_lookup.py:2400) — NAME resolution only; the value transfer is the resolver's job.

MF-4 (≥2-candidate ambiguity, design §3.1 / D-C): enforced GLOBALLY and report-only
by F6 (db-consistency/check_routing.py #1, which runs resolver_bridge.enumerate_candidates
over EVERY (block, css_property, writer_path) and is wired into prebuild + the commit
gate, baseline 0 today). attr_for_layer_property returns the first-by-rowid candidate —
identical to the live resolver — so re-running the ambiguity check here would duplicate
F6's logic (the drift trap). The full (block, layer, property) identity F6 keys on is a
superset of the slice's need; no per-call re-check is added.
"""
from __future__ import annotations

from typing import Any

from orchestrator.converter_v2.db_lookup import attr_for_layer_property


def attr_resolve(ctx: Any, layer: str, css_property: str) -> str | None:
    """Return the block's actual attr for (layer, css_property), or None (→ gap)."""
    return attr_for_layer_property(ctx.block_slug, layer, css_property)
