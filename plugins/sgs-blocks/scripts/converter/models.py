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
    """A declaration that transferred to a native attribute.

    `value` is `int | float | str | dict[str, str]` (widened from `str` per the
    2026-06-29 seam decision Option A, grounded in Spec 31 §3.A.5; further widened
    to `dict` per the box-object interface contract, `.claude/plans/2026-07-09-
    box-object-interface-contract.md` §3/§4, 2026-07-09): number attrs (fontSize,
    columns, lineHeight-unitless) store numerics faithful to convert.py's lifters.
    A `dict[str, str]` value is a PARTIAL box-object write — e.g.
    `Write(attr='contentBandPaddingTablet', value={'top': '10px'}, ...)` — one
    side of a merged box family (`{top,right,bottom,left}` or
    `{topLeft,topRight,bottomLeft,bottomRight}`). Multiple dict-valued Writes for
    the SAME attr are a deliberate, sanctioned exception to the ordinary
    duplicate-attr COLLISION rule (`orchestrator._check_conservation`) — they are
    MERGED (first-write-per-key wins, matching the fold `setdefault` contract),
    never treated as data loss. A dict value mixed with a non-dict value for the
    same attr, or two dict writes sharing a KEY, both remain hard collisions.
    emit_block_markup serialises via json.dumps so a numeric value renders unquoted
    in the block comment, matching the native block schema (number attrs are JSON
    numbers); a dict value renders as a nested JSON object.
    """
    attr: str                  # the (tier-suffixed) block attribute, e.g. 'maxWidth' / 'maxWidthTablet'
    value: int | float | str | dict  # the serialised value written (numeric for number attrs; dict for a box-object partial side write)
    property: str              # source CSS property (for the ledger/coverage join).
                               # SYNTHETIC writes that have no source declaration (the
                               # element-level align_finalise post-pass) carry a
                               # SENTINEL property (e.g. '__align_finalise__') instead
                               # of a real CSS property, so the F5 ledger join (D240)
                               # does not mis-key them onto a real declaration.
    tier: str                  # Base|Mobile|Tablet|Desktop|Other:<cond>


@dataclass
class ResidualBand:
    """A non-device-tier @media band peeled from an element's CSS (FR-31-5.2).

    The 3-tier attr model (Mobile/Tablet/Desktop, fixed at 768/1024) cannot
    represent a breakpoint that SPLITS a tier — a D228 "arbitrary visual
    breakpoint" whose threshold ∉ {767,768,1023,1024} (e.g. min-width:1280 inside
    Desktop, min-width:600 inside Mobile). Such a band is CAPTURED here — never
    snapped to a tier, never dropped — and serialised to the owning block's
    ``sgsCustomCss`` (Additional-CSS) field, the client-editable destination
    (STOP-52: the page must never depend on non-block-settings pipeline CSS).

    ``selector`` is the element's own SGS-BEM class as a CSS selector
    (e.g. '.sgs-hero__content'), which the rendered clone preserves by
    construction; an EMPTY string means the band targets the block ROOT itself
    (serialised as a bare ``&selector`` with no descendant). Not frozen — it
    carries a mutable ``decls`` dict and is never hashed.
    """
    selector: str          # e.g. '.sgs-hero__content'  ('' = block root)
    media_cond: str        # e.g. '@media (min-width: 1280px)' (verbatim, incl. @media)
    decls: dict            # {css_property: value}


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
