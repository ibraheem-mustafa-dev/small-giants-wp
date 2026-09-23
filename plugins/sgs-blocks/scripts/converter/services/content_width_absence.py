"""content_width_absence.py — the CONTENT-WIDTH layer's absence rule (Spec 31 §13.6 / FR-31-21).

Problem this closes (proven on the Eye Care clone, 2026-09-23): a draft section with
``padding: 104px 52px`` and NO max-width on its content spans the whole section, but the
converter wrote nothing to the block's content-width attr. ``sgs/container`` then fell
back to its block.json default ``{"desktop": "normal"}``, which the shared wrapper
resolves to the theme content-size (1200px) on the ``.sgs-container__inner`` band — so
every heading in the clone started 60px right of the draft.

Rule (project CLAUDE.md, composite-mirror scope: "faithful transfer includes a property's
absence (no max-width -> full-width, overriding the theme default)"): the OUTER layer's
absence is handled by ``resolvers/outer_box.py::align_finalise`` (``align:"full"``); this
module is the same rule for the CONTENT-WIDTH layer. It runs once per emitted block, after
every CSS / fold / content path has merged into the block's attrs
(``services/assembly.py::build_block_markup``), because the band's max-width can arrive
from several places (the root CSS pass, the default-container sole pass-through fold, the
composite band fold) and only the merged dict knows whether ANY of them wrote it.

Fires only when ALL hold (DB-driven, no block-name literal — R-31-1 / R-31-9):
  • the block owns a CONTENT-layer max-width destination
    (``db_lookup.attr_for_layer_property(slug, "CONTENT", "max-width")``);
  • the block renders that layer through the shared container vocabulary — it IS the
    DB default container or carries a ``block_composition.container_kind`` (the
    composite-mirror roster). The no-cap token below is that vocabulary's, so a block
    outside it never receives it;
  • the attr's DB default IMPOSES a cap (a non-empty desktop value other than the no-cap
    token). A block whose default is ``{}`` / ``full`` already renders uncapped when the
    attr is absent, so writing anything there would be noise;
  • no path wrote the attr for this draft element (a draft max-width at any tier always
    wins — it is already in ``attrs``).
"""
from __future__ import annotations

import json
from typing import Any

from converter.db import db_lookup

# The content-width vocabulary's "no inner cap" token. Owned by the shared wrapper's
# resolver, ``includes/class-sgs-container-wrapper.php::$sgs_resolve_content_width``
# (``'full'`` -> '' -> no band max-width), and used as the declared default by every
# full-bleed roster block (site-header, site-footer, physics-canvas). A single vocabulary
# token, the CONTENT-layer twin of ``outer_box.align_finalise``'s ``"full"``.
NO_CAP_TOKEN = "full"

# Tier-object key the Base tier lands in (Spec 35 tier shape).
_BASE_TIER_KEY = "desktop"


def _declared_default(block_slug: str, attr_name: str) -> Any:
    """The attr's block.json default as stored in ``block_attributes.default_value``
    (JSON text), or None when absent/unparseable."""
    conn = db_lookup.get_connection()
    try:
        row = conn.execute(
            "SELECT default_value FROM block_attributes WHERE block_slug=? AND attr_name=?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    raw = row[0] if row is not None else None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return raw


def _default_imposes_cap(default: Any) -> bool:
    """True when the declared default renders a content-band cap with the attr absent."""
    base = default.get(_BASE_TIER_KEY) if isinstance(default, dict) else default
    return isinstance(base, str) and base.strip() not in ("", NO_CAP_TOKEN)


def _uses_container_vocabulary(block_slug: str) -> bool:
    """The block is the DB default container or on the composite-mirror roster."""
    if block_slug == db_lookup.container_default_slug():
        return True
    from converter.services.recognise_helpers import get_container_kind

    return bool(get_container_kind(block_slug))


def content_width_absence_attr(block_slug: str | None, attrs: dict) -> tuple[str, Any] | None:
    """Return ``(attr_name, value)`` to write for a content band the draft left uncapped,
    or None when the rule does not apply. Never overwrites a value already in ``attrs``."""
    if not block_slug:
        return None
    attr_name = db_lookup.attr_for_layer_property(block_slug, "CONTENT", "max-width")
    if not attr_name or attr_name in attrs:
        return None
    if not _uses_container_vocabulary(block_slug):
        return None
    if not _default_imposes_cap(_declared_default(block_slug, attr_name)):
        return None
    if db_lookup.tier_object_base(block_slug, attr_name):
        return attr_name, {_BASE_TIER_KEY: NO_CAP_TOKEN}
    return attr_name, NO_CAP_TOKEN
