"""css_pass.py — Stage 3 §3.A CSS pass: the CSS-declaration resolver dispatch.

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1/§2/§6.

Split out of `extraction.py` (mechanical re-house, EXECUTION Step 4 — zero logic
change). This module owns `_build_css_attrs`, the Spec 31 §3.A CSS branch that
`assembly.build_block_markup` dispatches per node. See `extraction.py`'s module
docstring for the wider Stage 3 content-extraction context.

`extraction.py` re-exports `_build_css_attrs` from here so existing callers and
test monkeypatches (`monkeypatch.setattr(ext_mod, "_build_css_attrs", ...)`)
keep working unchanged — `assembly.build_block_markup` reads it back through the
`converter.services.extraction` module attribute at call time (late binding),
not through a direct import, so a monkeypatch on the extraction module still
intercepts the call.

No block or slot string literals anywhere (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

import sqlite3
from typing import Any

from converter.context import Ctx, Decl, Recognition
from converter.recognition import build_ctx
from converter.orchestrator import process_element
from converter.services.styling_helpers import (
    collect_css_decls_for_element,
    collect_state_decls_for_element,
    serialise_residual_bands,
)
from converter.models import ResidualBand
from converter.services.root_supports import (
    lift_root_supports_to_style,
    _ALWAYS_STRIP_SHORTHANDS,
    expand_background_border_shorthand,
)
from converter.db import db_lookup

# SGS DB path — kept as a module attribute for the pre-existing existence
# checks (here and in fold_helpers.py, which imports this name). The actual
# connection is opened via db_lookup.get_connection() (FR-31-8 accessor
# layer) — never a raw sqlite3.connect() at this call site.
_SGS_DB_PATH = db_lookup.SGS_DB


# ---------------------------------------------------------------------------
# CSS-pass helper — Spec 31 §3.A unification
# ---------------------------------------------------------------------------


def _build_css_attrs(
    rec: Recognition,
    node: Any,
    css_rules: dict,
    is_root: bool,
) -> dict:
    """Run the CSS branch (Spec 31 §3.A) for one node and return the attr dict.

    Steps:
      1. Build a Ctx from the Recognition + node via the recognition.build_ctx adapter.
      2. Collect CSS declarations from the node's css_rules via
         collect_css_decls_for_element → base_decls + bp_decls.
      2a. [ROOT-SUPPORTS LIFT] Before assembling the Decl list, call
          lift_root_supports_to_style to emit padding/background-color/border-radius
          etc. as native WP ``style.*`` attrs (and per-device custom attrs). Returns
          ``(native_attrs, consumed)`` — ``consumed`` names exactly which CSS
          property was actually WRITTEN, per tier (STOP-43, 2026-07-05 council fix).
          PORT SOURCE: convert.py:774-956.
      2b. [PARTITION] Remove from base_decls/bp_decls only the CSS properties the
          native lift ACTUALLY consumed AT THAT TIER (``consumed["Base"]`` for
          base_decls, ``consumed[bp_suffix]`` per bp tier) plus the two always-strip
          composite shorthands (``background``/``border`` — normalisation sources
          only, never independently routable). This prevents double-handling (the
          same property must not flow through BOTH the native style.* path AND the
          process_element dispatch) WITHOUT silently dropping a lift-eligible
          property the supports/schema gate rejected — that must flow through to
          process_element instead (e.g. ``color`` on a block with no native color
          support but a typography-resolver textColour destination; ``gap`` on a
          block with no blockGap support but a grid/outer_box destination). A
          property consumed at the base tier but NOT at a given bp tier (the
          per-device schema-attr gate can reject one tier and not another) still
          flows through for that unconsumed tier only (the "per-tier trap").
          Merge order: native style.* attrs first, then process_element overwrites
          (they target different attr keys so collisions are not expected in practice).
      3. Assemble a list[Decl] from the PARTITIONED decls.
      4. If non-empty, dispatch through process_element and return merged result.
      5. If empty (no css_rules matched), return native attrs only (or {}).

    Conservation errors from process_element PROPAGATE (never swallowed) — a
    leaked/unrouted declaration must fail loud (Rule 4 / STOP-27).

    Opens a read-only SQLite connection to the SGS DB per call.  The connection
    is opened with check_same_thread=False and closed in a finally block so it
    is always released even when process_element raises.

    Returns {} when:
      - css_rules is empty / no rules matched the node, OR
      - the DB file does not exist (test environments without the real DB).
    This keeps the pre-existing content-only behaviour as the no-CSS-rules
    fallback — no regression for callers that omit css_rules.
    """
    if rec.slug is None:
        return {}

    # Open DB connection (read-only; tests that mock db_lookup don't need the file).
    conn: sqlite3.Connection | None = None
    try:
        if _SGS_DB_PATH.exists():
            conn = db_lookup.get_connection()
        else:
            # DB absent (CI / test environment) — CSS pass is a no-op.
            return {}

        ctx = build_ctx(rec, node, is_root=is_root, conn=conn)

        # F-ii residual sink (FR-31-5.2): non-device-tier @media bands that the
        # 3-tier attr model cannot represent are captured here (never dropped) and
        # serialised to this block's ``sgsCustomCss`` below. Captured ONLY at this
        # call site — root_supports.lift_root_supports_to_style re-collects the SAME
        # node with the SAME css_rules, so passing a sink there too would
        # double-count the identical bands.
        residual_sink: list[ResidualBand] = []
        base_decls, bp_decls = collect_css_decls_for_element(
            node, css_rules, residual_sink=residual_sink
        )

        # ---- Step 1b: background/border shorthand expansion (D307) ----
        # lift_root_supports_to_style (step 2a below) does this SAME expansion
        # on its OWN internal collect_css_decls_for_element copy — but that
        # copy is never returned to this caller. Without expanding HERE too, a
        # longhand the native-supports gate REJECTS (e.g. sgs/text declares no
        # color/__experimentalBorder.width|style|color support — see
        # expand_background_border_shorthand's docstring) never reaches
        # process_element at all: the raw background/border shorthand keys in
        # THIS decls copy get stripped by _ALWAYS_STRIP_SHORTHANDS below with
        # no expanded longhand in their place — a silent drop, not a gap.
        expand_background_border_shorthand(base_decls, slug=rec.slug)
        for _tier_decls in bp_decls.values():
            expand_background_border_shorthand(_tier_decls, slug=rec.slug)

        # ---- Step 2a: root-supports native style.* lift (convert.py:774-956) ----
        # Emits padding/background-color/border-radius etc. as WP style.* attrs
        # and per-device custom attrs (paddingTopTablet, etc.) when the block's
        # DB supports record allows them.
        native_attrs, consumed = lift_root_supports_to_style(node, rec.slug, css_rules, conn)

        # ---- Step 2b: partition — remove ONLY per-tier lift-CONSUMED props ----
        # STOP-43 (2026-07-05 council fix): a property is stripped from a tier's
        # decl stream iff the native lift ACTUALLY WROTE a destination for it AT
        # THAT TIER (consumed["Base"] / consumed[bp_suffix]), or it is one of the
        # two always-strip composite shorthands (background/border — normalisation
        # sources only, see root_supports._ALWAYS_STRIP_SHORTHANDS). The old
        # behaviour stripped blanket membership in _LIFT_CSS_PROPS regardless of
        # whether the lift's supports/schema gate actually accepted the property —
        # silently dropping e.g. `color` on a block with no native color support
        # (but a typography-resolver textColour destination) or `gap` on a block
        # with no blockGap support (but a grid/outer_box destination). A property
        # consumed at base but rejected for a specific bp tier (the per-device
        # schema-attr gate is independent per tier) now flows through for THAT
        # tier only, instead of being dropped everywhere.
        base_strip = consumed.get("Base", frozenset()) | _ALWAYS_STRIP_SHORTHANDS
        partitioned_base = {
            prop: val
            for prop, val in base_decls.items()
            if prop not in base_strip
        }
        partitioned_bp = {
            bp_suffix: {
                prop: val
                for prop, val in tier_decls.items()
                if prop not in (consumed.get(bp_suffix, frozenset()) | _ALWAYS_STRIP_SHORTHANDS)
            }
            for bp_suffix, tier_decls in bp_decls.items()
        }

        # ---- Step 3: assemble Decl list from partitioned decls ----
        decls: list[Decl] = [
            Decl(property=prop, value=val, tier="Base")
            for prop, val in partitioned_base.items()
        ]
        for bp_suffix, tier_decls in partitioned_bp.items():
            for prop, val in tier_decls.items():
                decls.append(Decl(property=prop, value=val, tier=bp_suffix))

        # ---- Step 3b: interaction-state Decls (D309, universal hover) ----
        # Collected on the SAME node/rules, keyed by StateSuffix ('Hover'…). Not
        # partitioned against `consumed` — the root-supports native lift handles
        # BASE style.* only, so a state property is never a lift-consumed base
        # prop. Shorthand-expanded for parity with base (a `:hover{background:…}`
        # → background-color). Emitted as Base-tier Decls carrying the state; the
        # resolver appends the suffix + validates the block declares the
        # `{attr}{State}` companion (else an honest gap — R-31-9 universal).
        state_decls = collect_state_decls_for_element(node, css_rules)
        for state_suffix, sdecls in state_decls.items():
            expand_background_border_shorthand(sdecls, slug=rec.slug)
            for prop, val in sdecls.items():
                decls.append(
                    Decl(property=prop, value=val, tier="Base", state=state_suffix)
                )

        # ---- Step 4/5: dispatch and merge ----
        # Native style.* attrs are emitted first; process_element writes to different
        # keys (maxWidth, gridTemplateColumns, etc.) so collisions are not expected.
        # Content ScalarLifts (step 3 in build_block_markup) overwrite both if needed.
        merged: dict = dict(native_attrs)
        if decls:
            result = process_element(ctx, decls)
            merged.update(result.attrs())

        # ---- F-ii residual → sgsCustomCss (FR-31-5.2 passthrough) ----
        # Serialise any captured non-device-tier bands into the block's
        # Additional-CSS field. APPEND (never overwrite) any pre-existing
        # sgsCustomCss (a re-clone could carry client-authored content); the marker
        # comments keep the converter block idempotently replaceable.
        residual_css = serialise_residual_bands(residual_sink)
        if residual_css:
            existing = merged.get("sgsCustomCss", "")
            merged["sgsCustomCss"] = (
                f"{existing}\n{residual_css}" if existing else residual_css
            )

        return merged

    finally:
        if conn is not None:
            conn.close()
