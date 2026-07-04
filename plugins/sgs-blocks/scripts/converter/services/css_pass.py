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

import pathlib
import sqlite3
from typing import Any

from converter.context import Ctx, Decl, Recognition
from converter.recognition import build_ctx
from converter.orchestrator import process_element
from converter.services.styling_helpers import collect_css_decls_for_element
from converter.services.root_supports import lift_root_supports_to_style, _LIFT_CSS_PROPS

# SGS DB path — used to open a read-only connection for the CSS resolver dispatch.
# Path is relative to the user's home dir (same convention as dev-setup.md).
_SGS_DB_PATH = (
    pathlib.Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
)


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
          etc. as native WP ``style.*`` attrs (and per-device custom attrs).
          PORT SOURCE: convert.py:774-956.
      2b. [PARTITION] Remove from base_decls/bp_decls every CSS property that the
          native lift already consumed (those in _LIFT_CSS_PROPS AND in the block's
          supports). This prevents double-handling: the same property must not flow
          through BOTH the native style.* path AND the process_element dispatch.
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
            conn = sqlite3.connect(str(_SGS_DB_PATH), check_same_thread=False)
        else:
            # DB absent (CI / test environment) — CSS pass is a no-op.
            return {}

        ctx = build_ctx(rec, node, is_root=is_root, conn=conn)

        base_decls, bp_decls = collect_css_decls_for_element(node, css_rules)

        # ---- Step 2a: root-supports native style.* lift (convert.py:774-956) ----
        # Emits padding/background-color/border-radius etc. as WP style.* attrs
        # and per-device custom attrs (paddingTopTablet, etc.) when the block's
        # DB supports record allows them.
        native_attrs: dict = lift_root_supports_to_style(node, rec.slug, css_rules, conn)

        # ---- Step 2b: partition — remove lift-consumed props from the Decl stream ----
        # Any CSS property that (a) is in _LIFT_CSS_PROPS AND (b) was actually
        # consumed by the native lift (i.e. appears as a key somewhere under
        # native_attrs["style"] or as a responsive custom attr) must NOT also be
        # dispatched through process_element, or the same value lands twice on
        # different attr paths.
        #
        # Implementation: remove _LIFT_CSS_PROPS from both base_decls and each
        # bp_decls tier.  _LIFT_CSS_PROPS is a frozenset of the CSS property names
        # the lift rules handle (padding-top, background-color, border-radius, etc.
        # plus the shorthand keys padding/margin/background/border).  Properties
        # NOT in _LIFT_CSS_PROPS (e.g. max-width, grid-template-columns, color
        # variants handled by process_element's own resolvers) are unaffected and
        # continue to the Decl list unchanged.
        #
        # This partition is safe even when lift_root_supports_to_style returned {}
        # (block has no matching supports): removing the props from base_decls means
        # process_element never sees unsupported native-style props either, which
        # is the correct behaviour (they have no custom-attr destination).
        partitioned_base = {
            prop: val
            for prop, val in base_decls.items()
            if prop not in _LIFT_CSS_PROPS
        }
        partitioned_bp = {
            bp_suffix: {
                prop: val
                for prop, val in tier_decls.items()
                if prop not in _LIFT_CSS_PROPS
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

        # ---- Step 4/5: dispatch and merge ----
        # Native style.* attrs are emitted first; process_element writes to different
        # keys (maxWidth, gridTemplateColumns, etc.) so collisions are not expected.
        # Content ScalarLifts (step 3 in build_block_markup) overwrite both if needed.
        merged: dict = dict(native_attrs)
        if decls:
            result = process_element(ctx, decls)
            merged.update(result.attrs())

        return merged

    finally:
        if conn is not None:
            conn.close()
