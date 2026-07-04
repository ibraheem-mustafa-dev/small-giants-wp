"""db_lookup.py — RE-EXPORT SHIM (EXECUTION Step 9) — dies with the tree in Phase 6.

The canonical implementation moved to ``converter/db/db_lookup.py`` in EXECUTION
Step 9 (Phase 3, 2026-07-04), decoupling the modular engine (``converter/``) from
this frozen tree. This module exists ONLY so the following keep working
unmodified until their Phase-4 rewire:

  - the frozen ``orchestrator/converter_v2/convert.py`` (``from . import db_lookup``)
  - ``orchestrator/converter_v2/icon_resolver.py`` shim (no dependency today, but
    kept symmetrical)
  - the 4 importlib by-PATH loaders that load this file directly:
      essence_match_detector.py:47, recogniser/per-section-convention-voter.py:71,
      db-consistency/resolver_bridge.py:40, behavioural-analyser/assign-canonical.py
      (sys.path-inserts this file's directory, then ``import db_lookup``)

Do NOT add new logic here. Do NOT import this module from anything under
``converter/`` — the modular engine imports ``converter.db.db_lookup`` directly
(``converter/gates/import_ban.py`` bans all ``orchestrator.converter_v2.*``
imports from ``converter/`` post-Step-9).

sys.path guard: a by-PATH loader (``importlib.util.spec_from_file_location``)
executes this file with NO package context, so the absolute
``converter.db.db_lookup`` import below would fail unless ``scripts/`` (the repo's
import root) is already on ``sys.path``. Guard it here defensively — cheap,
idempotent, and harmless when the caller already set it up.
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS_ROOT = Path(__file__).resolve().parents[2]  # .../sgs-blocks/scripts
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.db.db_lookup import *  # noqa: F401,F403 — re-export shim
from converter.db.db_lookup import (  # noqa: F401 — explicit underscore re-exports
    # Public "from .db_lookup import *" above does not carry underscore-prefixed
    # names (Python's `import *` rule). These are read directly (as
    # `db_lookup._X` / `db_mod._X` / `_db_lookup._X`, or via a bare
    # `from db_lookup import _X`) by consumers still on the frozen-tree path:
    #   _BEM_ELEMENT_RE            — behavioural-analyser/assign-canonical.py
    #                                 (`from db_lookup import _BEM_ELEMENT_RE`)
    #   _resolve_slug_from_bem_tuple — orchestrator/converter_v2/tests/
    #                                 test_walker_helpers.py (`_db_lookup._resolve_slug_from_bem_tuple`)
    #   _slot_synonyms              — orchestrator/converter_v2/test_attribute_gap_candidate.py
    #                                 (`db_mod._slot_synonyms`)
    #   _ATTR_NAME_OVERRIDES        — db-consistency/resolver_bridge.py
    #                                 (`_db_lookup_mod._ATTR_NAME_OVERRIDES`, hasattr-gated)
    #   _TYPOGRAPHY_CSS_SCOPE       — db-consistency/resolver_bridge.py
    #                                 (`_db_lookup_mod._TYPOGRAPHY_CSS_SCOPE`, hasattr-gated)
    #   _LEGACY_ROLE_CACHE          — recogniser/test_voter_db_legacy.py assigns
    #                                 `db_lookup._LEGACY_ROLE_CACHE = None` (a WRITE,
    #                                 doesn't strictly need re-export, but kept for
    #                                 parity/documentation of the legacy-role-cache
    #                                 reset pattern)
    _BEM_ELEMENT_RE,
    _resolve_slug_from_bem_tuple,
    _slot_synonyms,
    _ATTR_NAME_OVERRIDES,
    _TYPOGRAPHY_CSS_SCOPE,
    _LEGACY_ROLE_CACHE,
)
