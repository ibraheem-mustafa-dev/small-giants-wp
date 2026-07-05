"""
test_inherit_style_modifier.py
===============================
Regression suite for `db_lookup.inherit_style_for_modifier` — the DB-channel
replacement for assembly.py's hardcoded `'ghost'→'outline'` branch (removed by
the post-programme QC session, 2026-07-05; the branch's own comment admitted it
was shaped to evade cheat-gate Check #9).

The mapping's source of truth is the slots alias→default_attrs channel: the
`button-outline` slot's aliases include `ghost-button`/`ghostButton`/
`button-ghost`, each carrying {"inheritStyle": "outline"}. A future synonym is
a slots-row seed, never a code branch (R-31-1).

Run from the canonical cwd plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_inherit_style_modifier.py -q --import-mode=importlib
"""

from __future__ import annotations

import re
from pathlib import Path

from converter.db import db_lookup

_ASSEMBLY = Path(__file__).resolve().parents[1] / "services" / "assembly.py"


def test_ghost_resolves_to_outline_on_button():
    """The draft `--ghost` modifier on sgs/button resolves via the DB aliases."""
    assert db_lookup.inherit_style_for_modifier("ghost", "sgs/button") == "outline"


def test_preset_synonym_case_insensitive():
    assert db_lookup.inherit_style_for_modifier("GHOST", "sgs/button") == "outline"


def test_unknown_modifier_returns_none():
    assert db_lookup.inherit_style_for_modifier("sparkly", "sgs/button") is None


def test_bare_modifier_without_slug_returns_none():
    """'ghost' alone is deliberately NOT a bare alias (it would over-broaden
    element recognition); the compound probe needs the block identity."""
    assert db_lookup.inherit_style_for_modifier("ghost", None) is None


def test_empty_modifier_returns_none():
    assert db_lookup.inherit_style_for_modifier("", "sgs/button") is None


def test_assembly_carries_no_modifier_literal_branch():
    """The hardcoded evasion branch must never return: no string-literal
    comparison against the local modifier variable in assembly.py. (The
    no_slug_literal gate also guards this — modifier idents were added to its
    _TARGET_IDENTS the same day — this is the belt to that brace.)"""
    src = _ASSEMBLY.read_text(encoding="utf-8")
    assert not re.search(r"_mod\s*==\s*['\"]", src), (
        "assembly.py compares the BEM modifier to a string literal — the "
        "synonym belongs in the slots alias→default_attrs DB channel "
        "(db_lookup.inherit_style_for_modifier), never a code branch."
    )
