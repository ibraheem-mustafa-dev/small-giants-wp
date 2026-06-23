"""orchestrator.py — dispatch + conservation spine (design §3 / §4).

Matches the `walk` / `convert_page` seam (drop-in target, NOT swapped live yet,
D-MODULAR). For the vertical slice it exposes:

  process_element(ctx, decls) -> ElementResult
      route each declaration through dispatch_table → REGISTRY → resolver, collect
      Write/GAP, and enforce the step-2 oracle invariants:
        • TOTALITY     — every declaration produced exactly one Write or GAP
        • DISJOINTNESS — no declaration lands in two buckets (A10)
        • NO-UNROUTED  — a GAP(origin=UNROUTED) is a HARD failure (design §2/§3.2)

The full draft walk (parse → per-node Ctx/Decl) is step-3 work; the slice constructs
Ctx/Decls for a known element and proves the spine on one OUTER property end-to-end.

LANDED is the headline signal, NOT conservation (§10 A1): conservation goes 100%
green while transferring almost nothing (every non-max-width decl → a stub GAP). Only
the WRITE count for `maxWidth`, confirmed by the F3 oracle, measures faithfulness.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from converter.dispatch_table import resolver_id
from converter.models import GAP, GapOrigin, Write
from converter.resolvers import REGISTRY
from converter.services.layer_detect import layer_detect


class ConservationError(AssertionError):
    """Raised when the step-2 oracle invariants are violated (fail-closed)."""


@dataclass
class ElementResult:
    block_slug: str
    writes: list[Write] = field(default_factory=list)
    gaps: list[GAP] = field(default_factory=list)
    decl_count: int = 0

    def attrs(self) -> dict[str, str]:
        """The native block attribute dict the Writes produce (for emit)."""
        return {w.attr: w.value for w in self.writes}

    def unrouted(self) -> list[GAP]:
        return [g for g in self.gaps if g.origin is GapOrigin.UNROUTED]


def _check_conservation(result: ElementResult) -> None:
    # TOTALITY: every input declaration is in exactly one output bucket.
    produced = len(result.writes) + len(result.gaps)
    if produced != result.decl_count:
        raise ConservationError(
            f"TOTALITY: {result.decl_count} declarations produced {produced} results "
            f"({len(result.writes)} writes + {len(result.gaps)} gaps) — a declaration "
            f"leaked or was double-counted."
        )
    # NO-UNROUTED: a suspected routing bug must fail loud, never be absorbed.
    bad = result.unrouted()
    if bad:
        raise ConservationError(
            "UNROUTED: "
            + "; ".join(f"{g.property}@{g.tier}" for g in bad)
            + " — a known-writer_path property found no resolver (design §2/§3.2)."
        )


def process_element(ctx: Any, decls: list[Any]) -> ElementResult:
    """Dispatch every declaration of one element; enforce the step-2 invariants."""
    # Cache the layer ONCE on the base declaration set (tier-invariance §2.1).
    if ctx.base_layer is None:
        base_decls = {d.property: d.value for d in decls if d.tier == "Base"}
        ctx.base_layer = layer_detect(ctx, base_decls)

    result = ElementResult(block_slug=ctx.block_slug, decl_count=len(decls))
    for decl in decls:
        rid = resolver_id(
            ctx.base_layer, decl.property,
            has_inner_blocks=ctx.has_inner_blocks, conn=ctx.conn,
        )
        out = REGISTRY[rid](decl, ctx)
        if isinstance(out, Write):
            result.writes.append(out)
        else:
            result.gaps.append(out)

    _check_conservation(result)
    return result


def emit_block_markup(block_slug: str, attrs: dict[str, str], inner: str = "") -> str:
    """Serialise a native SGS block to WP block markup (for the LANDED deploy).

    e.g. emit_block_markup('sgs/container', {'maxWidth': '1200px'})
        -> '<!-- wp:sgs/container {"maxWidth":"1200px"} --><div ...></div><!-- /wp:sgs/container -->'
    The dynamic block renders server-side from the attrs; inner is optional content.
    """
    attr_json = json.dumps(attrs, separators=(",", ":"), sort_keys=True)
    name = block_slug  # already 'sgs/<x>'
    open_comment = f"<!-- wp:{name} {attr_json} -->" if attrs else f"<!-- wp:{name} -->"
    return f"{open_comment}{inner}<!-- /wp:{name} -->"
