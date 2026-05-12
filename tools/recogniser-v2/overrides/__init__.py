"""Per-block override registry. Dispatcher checks this BEFORE falling through
to the generic role-based extraction path.

Currently only hero has an override; other blocks may gain overrides as
extraction quality demands it (e.g. complex inner-block trees, bespoke
inheritance rules).

Spec 15 Phase 3 step 3.2 (hero override deletion) is DEFERRED: standalone
convention-path verify produced 35-attr regression on hero — content-identity
attrs (label / variant / splitImage / headlineColour / subHeadline*) that
the override uniquely produces. The convention path needs deeper
content-extraction strategies in role-templates.json before hero can run
override-free. Tracked for Phase 3 follow-up after Phase 3.8 gap
remediation expands the role taxonomy.
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
