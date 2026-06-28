---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-28
---

# Session Handoff — 2026-06-28 (D246 content-UNIFY: W1+W2 modularised the scalar content path into the one dispatch; W3 teed-up, not built)

> Prior handoffs (D245 Stage-3 content build, D244 Stage-2 recognition) are in git history + `memory/`.

## Plain-English summary (what we did, why it matters)
Last session (D246) Bean caught an architecture mistake: the D245 build had created a **separate, parallel content-extraction engine** that *recreated* two functions that already work in the frozen `convert.py`. Spec 31 §1 says content and CSS must flow through **ONE dispatch**, not two. This session executed the first half of the correction — **modularising** (re-housing) the working content functions into the one dispatch instead of rebuilding them.

Two verified refactor waves shipped (W1, W2). The scalar content path — the testimonial/team-member worked example, the thing that actually LANDED — now runs on the proven working function, not the D245 recreation. The third wave (W3 — the child-block / CSS-on-content / arrays half) is **defined and teed-up but deliberately NOT built**: it needs a fresh, substantial read-and-port of the big `convert.py` walker, and Bean banked at the milestone for fresh care. Bean's instruction for next session: run `/qc-council` over the W1+W2 *built code* to catch cheats/rule-breaks, then a second `/qc-council` over the W3 *plan + functions* before building it.

## Completed This Session

1. **Root-cause council → doc fixes → unified §3.** Spec 31 §3 rewritten as the UNIFIED content+CSS routing algorithm (commit `661d3357`) — the D246 keystone fix. The corrected understanding is now locked in the spec.
2. **W1 — MODULARISED the working scalar-content lift (commit `a4c0de86`), QC'd behaviour-identical across every case.** Faithful port, no `convert.py` import, no block-slug literals, no module-global media map (passed explicitly):
   - NEW `converter/services/lift_helpers.py` (+170) — ports `_safe_href`, `_rich_text_content`→`rich_text_content`, `_extract_star_count`→`extract_star_count`, `_resolve_media_url`→`resolve_media_url` (global `_MEDIA_MAP`→param), `_lift_scalar_media_from_img`→`scalar_media_from_img`, plus `_RICH_TEXT_INLINE_TAGS` / safe-href schemes verbatim.
   - EXTENDED `converter/resolvers/scalar_content.py` (+152) — `lift_scalar_content(node, slug, media_map) -> dict`, the modularised `_lift_scalar_attrs_by_selector`; DB-driven (gates on the `scalar-content-lift` capability, iterates the attrs catalogue, matches per-attr `derived_selector`); absent draft elements emit no key (the working function's no-op-on-absent behaviour). The existing `resolve()` stub is left untouched — the unified-dispatch-table WIRING of this resolver is itself a noted SEPARATE follow-on (scalar_content.py:12), not done in W2.
3. **W2 — WIRED the modularised lift into the live path + RETIRED the D245 from-scratch scalar logic (commit `57209f48`); re-LANDED live.** `run_mechanism_a` is now a thin wrapper: `lift_scalar_content(section_root, rec.slug, media_map={})` → wrap each item as a `ScalarLift`. The D245 from-scratch scalar path (`content_attrs_with_selector` iteration + `extract_payload` + bespoke object-shaping + per-attr `ContentGap`) is **dead for scalar**; `content_attrs_with_selector` is now unused. Completeness for scalar = the F2 draft-derived ledger (Spec 31 §12.2.1) + `expected_content_gaps`. `build_block_markup` unchanged. **Re-LANDED live on the canary — quote + name + avatar all render via the modularised path.**
4. **Verified (STOP-21 recipe).** Genuine `build_block_markup()` emit byte-identical; 318 converter+ledger tests + gates green; `convert.py` byte-identical (D-MODULAR) throughout.
5. **Kept (legit):** the `avatarMedia` role/selector migration stays — real DB data the working function consumes, not part of the superseded from-scratch engine.

## W3 — DEFINED + TEED-UP, NOT BUILT (the work Bean wants `/qc-council`'d before building)
W3 is the larger, qualitatively different remainder. The four pieces (from the W2 commit message + Bean's milestone note):

1. **The child-block path — `run_mechanism_b`.** To modularise this faithfully requires reading + porting the `convert.py` **single-recursive walker / `_route_composite_interior`** (the big FR-22-3 walker) — **NOT yet read.** A meaty read-and-port on its own; this is the bulk of W3 and why Bean banked for fresh care.
2. **`_lift_styling_attrs_by_selector`** (CSS-on-content, the "B2" path) + its 5-helper closure.
3. **Arrays** (the "B4" path, FR-22-2.5) — was only PARTIAL even in `convert.py`.
4. **Dead-code cleanup** — remove the now-unused `content_attrs_with_selector` accessor once nothing reads it.

No W3 code is committed. The residual D245 engine in `converter/services/extraction.py` (`run_mechanism_b`, `extract_content`, `payload.py`, `content_select.py`, the unused `content_attrs_with_selector`) is the material to **repurpose/port**, NOT extend — and W3 must port FROM the working `convert.py` walker, not bless the D245 recreation.

## Current State
- **Branch:** `main` (W2 `57209f48` is HEAD of this thread's work).
- **Tests:** 318 converter+ledger pass + gate-suite green at the W2 commit.
- **Uncommitted changes:** NONE of mine. The dirty files (`plugins/sgs-blocks/includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/handoff-theme.md`, `.claude/next-session-prompt-theme.md`) are pre-existing and NOT mine — leave them.
- **convert.py:** byte-identical (D-MODULAR). **D-ceiling:** D246 (W1/W2 implement D246's corrected direction — no new D-number).

## Known Issues / Blockers
- None block the next session. W3 is designed-not-built BY INTENT — Bean wants the two `/qc-council` gates run first, and the walker-port given fresh care.

## Next Priorities (in order) — Bean's explicit instruction
1. **`/qc-council` on the W1+W2 BUILT code** (commits `a4c0de86` + `57209f48`) — did the modularisation introduce any cheats / rule-breaks (the 7 rules + R-22-* + STOP catalogue)? Did porting drop any draft content silently? Does the thin-wrapper `run_mechanism_a` preserve the working function's behaviour exactly? Is anything from the dead from-scratch path still reachable? (STOP-23 — qc-council on built code, blub 255.)
2. **`/qc-council` on the W3 functions + plan** — before building W3, validate the plan to repurpose `run_mechanism_b` / the `convert.py` walker-interior + `_lift_styling_attrs_by_selector` + arrays against Spec 31 §1's "ONE dispatch" + the D246 architectural-completeness pre-question ("does this RECREATE something §1 already names as working?"). Confirm the `content_attrs_with_selector` deletion is safe (nothing reads it).
3. **Build W3** only after both councils GO + Bean sign-off (Rule 7 design-gate) — starting with the walker read-and-port.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/lift_helpers.py` | NEW — ported working content/media helpers (W1) |
| `plugins/sgs-blocks/scripts/converter/resolvers/scalar_content.py` | EXTENDED — `lift_scalar_content` modularised lift (W1) |
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | `run_mechanism_a` now a thin wrapper; from-scratch scalar path retired (W2) |
| `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` | §3 rewritten as the unified content+CSS routing algorithm |
