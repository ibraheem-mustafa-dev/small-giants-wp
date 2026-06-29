---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline / CSS-resolver spine (Spec 31 §12.4 dispatch resolvers)
generated: 2026-06-29
status: DECISION PENDING — needs /qc-council (Rule 7: shared conservation spine) + Bean sign-off before integration
---

# CSS-resolver seam decision (the gating call before integrating the 6 resolvers)

## What the parallel dispatch surfaced
Six dispatch-table resolvers were built in parallel (each `resolve(decl, ctx) -> Write | GAP`,
following the `outer_box.py` template + shared services). Status:

| Resolver | Status | Seam need |
|----------|--------|-----------|
| `scalar_media` | **Correctly DEFERRED** (evidence-backed) — `media_signal` is A11-deferred; image-object content lift already lives in the content branch (`lift_helpers`+`field_extractors`); the CSS-on-content path is `styling_content.py`. Stub stays `UNIMPLEMENTED_STUB` (accounted, not silent). | none |
| `content_band` | Built. max-width→contentWidth clean; **padding number+unit** worked around by storing raw string `"28px"`. Also found: `sgs/container` uses `contentBandPadding*` not `contentPadding*` (honest gap). | multi-Write |
| `typography` | Built. Wants to return **`list[Write]`** (fontSize **+** fontSizeUnit) per decl; proposed an orchestrator extension. `Write.value` needs `int|float` for number attrs. | multi-Write + value type |
| `grid` | Built. **gridTemplateColumns + columns-integer** dual-attr; worked around by emitting primary + **gapping** the secondary. | multi-Write |
| `outer_box` (extend) | Built. max-width/min-height/padding-sides clean; **padding shorthand → UNIMPLEMENTED_STUB** (one decl→4 sides needs multi-result); **`align:full` needs an `align_finalise()` element-level post-pass hook in the orchestrator** (fires on max-width ABSENCE, not a single decl). | multi-Write + align hook |
| `grid_area` | Built **but BLOCKED**: needs `ctx.area_name` field on `Ctx` + a **`GRID_AREA` branch in `layer_detect`** (none exists today) + the orchestrator to set `area_name`. Also FIX-A per-slot max-width needs the node's full base_decls (not available per-decl). | area-name seam + layer_detect + multi-Write |

**The single coherent finding:** three independent resolvers each needed ONE declaration to
produce MORE THAN ONE block-attribute write (value + unit companion; template + count), and each
invented a different workaround. That is one shared-seam decision, not three resolver quirks.

## THE FULL SEAM/ORCHESTRATOR DECISION SET (all 6 returns; needs ONE coherent design + /qc-council)
The six resolvers do not need six fixes — they need ONE coherent set of seam/orchestrator
changes, all touching shared infrastructure (conservation spine + Ctx/Decl + layer_detect),
i.e. squarely Rule-7 high-blast. Decide + council them together, then integrate all six against them:

1. **Multi-Write per decl** (typography unit companion, grid dual-attr, content_band/grid_area/outer_box padding+unit) — THE core decision, see below.
2. **`Write.value` type** — widen `str` → `int|float|str` (typography/number attrs store numerics, matching convert.py).
3. **`align_finalise()` element-level hook** — outer_box emits `align:"full"` on max-width ABSENCE; the orchestrator must call it after per-decl processing and append the synthetic Write OUTSIDE the conservation count.
4. **`Ctx.area_name` + `layer_detect` GRID_AREA branch** — grid_area is fully BLOCKED without it. `layer_detect` today has no `GRID_AREA` return; the orchestrator must detect the area (BEM token ∈ parent's `grid-template-areas`) and set `ctx.area_name`.
5. **Padding-shorthand expansion** — one `padding` decl → 4 sides. Either the CSS-to-Decl stage expands shorthands BEFORE dispatch (cleanest), or the multi-result contract (#1) covers it. Until then outer_box gaps it UNIMPLEMENTED_STUB (honest).
6. **Node base_decls context (FIX-A)** — grid_area's per-slot max-width needs the node's full base CSS, not one decl. Either enrich Ctx with `base_decls` or accept the documented gap.

### Core decision: Can a single `Decl` produce multiple `Write`s?

- **Option A — yes (recommended).** `process_element` accepts `Write | list[Write] | GAP`; the
  conservation invariant counts **per-declaration-result** ("each decl produced ≥1 result, none
  UNROUTED"), not per-write. `Write.value` widened to `int|float|str`. This is the faithful match
  to `convert.py` (its lifters `setdefault` multiple attrs per element) and avoids synthetic Decls.
  COST: changes `_check_conservation` semantics (TOTALITY no longer `len(writes)+len(gaps)==decl_count`)
  — a shared-spine change → must clear /qc-council (does it still catch a real leak? a double-count?).
- **Option B — no.** One Write per decl; companions (unit, columns-int) are emitted as SEPARATE
  synthetic Decls by the CSS-to-Decl stage. Keeps conservation 1:1 but pushes complexity into
  Decl-generation + risks orphaned companions.

**Recommendation: Option A**, conditioned on /qc-council confirming the revised conservation check
still detects a genuine leak/double-count (the whole point of the spine). Then ALL resolvers use the
same multi-Write contract — no per-resolver workaround.

## Integration sequence (after the decision)
1. `/qc-council` the seam decision (A vs B) — Rule 7, shared conservation spine. Bean sign-off.
2. Apply the chosen seam to `orchestrator.process_element` + `_check_conservation` + `models.Write`.
3. Integrate all 5 buildable resolvers AGAINST the chosen seam (rewrite the three workarounds to the
   consistent contract). content_band's `contentBandPadding*` DB-routing gap → a `property_suffixes`
   seed (STOP-24 override channel) or documented gap.
4. Run the full converter suite from the canonical cwd; prove a planted-leak still fails conservation.
5. `/qc-council` on the BUILT resolver code (STOP-23).
6. LANDED proof (the resolvers ARE the CSS-transfer fix — draft-vs-clone computed-style is the only "done").
7. Path-scoped commit per resolver.

## Where the drafts live (do not lose)
The full code for `content_band` / `typography` / `grid` (+ tests, dependency maps, faithfulness notes)
is in this session's agent task-outputs (`.../tasks/<id>.output`) and this conversation. `outer_box`/
`grid_area` returns pending. They are DRAFTS — to be reconciled to the chosen seam, not committed as-is.

## Rules carried
DB-driven, no slug literals (F5 gate). convert.py byte-identical (D-MODULAR). Do NOT production-wire
the engine (STOP-28). The resolvers are the "broken half" Spec 31 §3.A FIXES — they need LANDED proof,
not just emit-green, before they're trusted.
