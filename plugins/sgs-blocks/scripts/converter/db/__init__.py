"""converter/db — the modular engine's own DB-accessor package.

Home of ``db_lookup`` (DB-backed canonical lookups: blocks, slots, roles,
property_suffixes, block_attributes, variant_slots, etc. — Spec 31/§4).

Moved here from ``orchestrator/converter_v2/db_lookup.py`` in EXECUTION Step 9
(Phase 3, 2026-07-04) as part of decoupling the modular engine (``converter/``)
from the frozen ``orchestrator/converter_v2/`` tree. The old path now holds a
thin re-export shim (dies with the frozen tree in Phase 6) so the 4 importlib
by-path loaders and the frozen ``convert.py`` keep working unmodified.
"""
