# Session Handoff — 2026-06-02 (CLONING PIPELINE thread)

> Two-thread close. THIS file = cloning pipeline. Theme/blocks work → `.claude/handoff-theme.md`.

## Completed This Session
1. **FR-22-20 universal variant detection — SHIPPED + LIVE-DOM VERIFIED** (commits `1a48c602`→`55f42e1b`). DB schema (`blocks.variant_attr` + `variant_slots`) + hero `supports.sgs.variants` + `/sgs-update` population + converter `detect_variant` (db_lookup) + emit-path enrichment (convert.py) + hero `$is_split` band-aid reverted. 3-rater qc-council caught 1 real bug (truthiness dropped numeric-0 → fixed via `_slot_extracted`). Hero renders `sgs-hero--split` via the clean gate on canary 144. (D134)
2. **Variant-routing criterion LOCKED** + all 66 blocks categorised (`.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md`). The slot-fingerprint only fits content-distinct variants (~2 blocks); the rest need a modifier-class mechanism (D135). Criterion: a block needs ROUTING iff the variant makes distinct content/structure/terms APPEAR; else it's a CSS setting (D0-transferable).
3. **CSS-transfer fidelity audit (D136)** — draft-vs-clone computed-style diff proved 4 systemic transfer failures: imposed section max-width 1200; dropped `__inner` wrappers (fold); imposed hero gradient; mangled grid-template-columns. This is the new priority.
4. **Class-section width band-aid** (committed `e27ff591`) — `widthMode:'full'` on slug-resolved section wraps; hero/trust-bar now full-width. PARTIAL — to be superseded by the faithful-transfer fix. Rejected two converter detect-mode band-aids (Bean).
5. **Static-div editor bug FIXED** (latest commit) — `emit_sgs_container_wrapping` emitted a static `<div class="wp-block-sgs-container">` that fails WP validation against `save()`=`<InnerBlocks.Content/>` → "unexpected/invalid content" on every cloned container. Now emits children directly (mirrors `_emit_section_container`). Re-cloned to deploy.

## Current State
- **Branch:** `feat/fr22-4-1-universal-wrapper` at HEAD (static-div fix). NOT merged (merge-prep pending).
- **Tests:** converter emit-tests pass; no full suite run. **Build:** blocks build green.
- **Uncommitted:** none (band-aid reverted; pre-existing lucide/trust-badges/reports unchanged).
- **Canary 144:** re-cloned (run 113800 then a static-div-fix re-clone in flight). Pixel-diff ~61.5% (informational; the transfer gaps are why).

## Known Issues / Blockers
- **CSS transfer is unfaithful (4 gaps, D136)** — the priority; section widths/backgrounds/grids/hero-gradient diverge from the draft.
- **Editor "unexpected content" on containers** — fix committed + re-cloning; Bean to confirm in editor. Media "cannot be previewed" (save()=null) — likely same class; verify post-reclone.
- **Variant rollout incomplete** — only hero (slot-fingerprint); stylistic-variant majority needs the modifier-class mechanism.

## Next Priorities (in order)
1. **Faithful CSS transfer (the 4 gaps, D136)** — start with theme-CSS-by-position (gap 1) + fold stop-dropping-`__inner` (gap 2); then hero gradient + grid-columns. NOT converter band-aids.
2. **Variant-routing rollout** — modifier-class mechanism for stylistic variants (D135).
3. **Real image sideload** (media-map) — hero/product 404.
4. **Merge-prep → main** — split per-block (R-22-5) + Bean sign-off.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | FR-22-20 detector + widthMode:full + static-div removal |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | FR-22-20 emit enrichment (committed); band-aid reverted |
| `plugins/sgs-blocks/src/blocks/hero/{block.json,render.php}` | variant declaration + $is_split revert |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | variant_attr/variant_slots population |
| `.claude/decisions.md`, `next-session-prompt.md`, `scratch/2026-06-02-*` | D134-D136 + audit + criterion |

## Notes for Next Session
- The pipeline's job is **faithful CSS transfer**; converter detect-mode conditionals are the wrong layer (Bean rejected twice — memory `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`).
- The draft pattern: full-bleed sections (no max-width) + `__inner` wrappers (max-width:960). Serve the mockup on localhost to diff computed styles (`file://` blocked in Playwright MCP).
- Orchestrator path is `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (NOT `scripts/orchestrator/`).

## Next Session Prompt
See `.claude/next-session-prompt.md` (cloning thread — full orchestration plan, STOP catalogue #1-#36, reading list, pre-flight ritual). Theme thread: `.claude/next-session-prompt-theme.md`.
