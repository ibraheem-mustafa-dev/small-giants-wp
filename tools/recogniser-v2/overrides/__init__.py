"""Per-block override registry. Dispatcher checks this BEFORE falling through
to the generic role-based extraction path.

Currently only hero has an override; other blocks may gain overrides as
extraction quality demands it (e.g. complex inner-block trees, bespoke
inheritance rules).
"""
from __future__ import annotations
from typing import Any

from .hero import HERO_OVERRIDE


OVERRIDES: dict[str, dict[str, Any]] = {
    'sgs/hero': HERO_OVERRIDE,
}


def get_override(block_name: str) -> dict[str, Any] | None:
    """Return the override entry for *block_name* or None."""
    return OVERRIDES.get(block_name)
