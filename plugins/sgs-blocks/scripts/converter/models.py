"""models.py — the Write / GAP result types every resolver returns.

Design ref: `.claude/plans/2026-06-23-modular-scaffold-design.md` §3.1 (contract) +
§3.2 (GAP origin enum).

    resolver(decl, ctx) -> Write | GAP

A Write means "this declaration transferred to a native block attribute".
A GAP means "this declaration did not transfer", and its `origin` says WHY —
the stub/real/excluded/unrouted distinction that keeps an honest empty stub
distinguishable from a finished engine and a real gap from a silent drop.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass


class GapOrigin(str, enum.Enum):
    """Why a declaration produced a GAP rather than a Write (design §3.2)."""
    UNIMPLEMENTED_STUB = "UNIMPLEMENTED_STUB"   # resolver (or this branch) not built yet
    NO_DESTINATION = "NO_DESTINATION"           # real gap — the block has no attr for it (add one)
    EXCLUDED = "EXCLUDED"                        # F4 excluded_properties — intentional non-lift
    UNROUTED = "UNROUTED"                        # suspected routing bug — must FAIL, never laundered
    UNRECOGNISED = "UNRECOGNISED"               # Stage-2 recognition: a BEM node resolved to NO registered
                                                # block (distinct from UNROUTED, a known-writer-path property
                                                # finding no attr). Loud RED, never a silent empty sgs/container
                                                # emit (Spec 31 §12.7 classification exhaustiveness).
    CONTENT_GAP = "CONTENT_GAP"                # Stage 3-4 content extraction: a content child that did not
                                                # transfer (distinct from UNRECOGNISED block-id and UNROUTED
                                                # CSS-decl). Loud, never a silent drop.


@dataclass(frozen=True)
class Write:
    """A declaration that transferred to a native attribute."""
    attr: str          # the (tier-suffixed) block attribute, e.g. 'maxWidth' / 'maxWidthTablet'
    value: str         # the serialised value written
    property: str      # source CSS property (for the ledger/coverage join)
    tier: str          # Base|Mobile|Tablet|Desktop|Other:<cond>


@dataclass(frozen=True)
class GAP:
    """A declaration that did not transfer, with the reason."""
    origin: GapOrigin
    property: str
    tier: str
    detail: str = ""
    f4_ref: str | None = None   # populated for origin=EXCLUDED

    def __post_init__(self) -> None:
        if not isinstance(self.origin, GapOrigin):
            raise TypeError(f"GAP.origin must be a GapOrigin, got {self.origin!r}")
