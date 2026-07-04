"""icon_resolver.py — RE-EXPORT SHIM (EXECUTION Step 9) — dies with the tree in Phase 6.

The canonical implementation moved to ``converter/services/icon_resolver.py`` in
EXECUTION Step 9 (Phase 3, 2026-07-04), decoupling the modular engine
(``converter/``) from this frozen tree. This module exists ONLY so the frozen
``orchestrator/converter_v2/convert.py`` (``from .icon_resolver import
resolve_icon`` at its trust-bar/product-card icon-identity call site) keeps
working unmodified until its Phase-4 rewire.

Do NOT add new logic here. Do NOT import this module from anything under
``converter/`` — the modular engine imports ``converter.services.icon_resolver``
directly (``converter/gates/import_ban.py`` bans all ``orchestrator.converter_v2.*``
imports from ``converter/`` post-Step-9).

sys.path guard: mirrors the db_lookup.py shim — a by-PATH loader
(``importlib.util.spec_from_file_location``) executes this file with no package
context, so the absolute ``converter.services.icon_resolver`` import below would
fail unless ``scripts/`` is already on ``sys.path``. No current by-PATH loader of
THIS file is known (icon_resolver has no importlib-by-path consumers today,
unlike db_lookup's 4), but the guard is kept symmetrical and harmless.
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS_ROOT = Path(__file__).resolve().parents[2]  # .../sgs-blocks/scripts
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.services.icon_resolver import *  # noqa: F401,F403 — re-export shim

# No external consumer reads an underscore-prefixed name from this module
# (verified 2026-07-04: grep for `icon_resolver\._[A-Za-z0-9_]+` across the
# whole scripts/ tree returns zero hits) — `import *` (public names only:
# resolve_icon, is_filled_glyph) is sufficient.
