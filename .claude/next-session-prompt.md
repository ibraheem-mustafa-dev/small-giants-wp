---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
session_tag: small-giants-wp-2026-06-03-css-transfer-fidelity
generated: 2026-06-02
primary_goal: "CLONING-PIPELINE THREAD. The pipeline is NOT faithfully transferring the draft's CSS — a 4-gap fidelity audit (2026-06-02) proved the framework IMPOSES values the draft never had (section max-width 1200, a hero pink gradient overlay), DROPS draft structure (the __inner content wrappers), and MANGLES grid-template-columns (badge bar, brand 2-col). Fixing faithful CSS transfer is the priority — it is literally the pipeline's whole point (Bean). FR-22-20 universal variant detection is SHIPPED + LIVE-DOM-VERIFIED for the hero (slot-fingerprint); the rollout to other blocks needs the variant-routing-vs-D0-transfer criterion applied + a modifier-class mechanism. Branch feat/fr22-4-1-universal-wrapper, NOT merged (merge-prep pending)."
---

# Next Session — CLONING PIPELINE thread (CSS-transfer fidelity + variant rollout)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. Then read the MANDATORY READING LIST **end-to-end, not grep-skim**. This session's predecessor (2026-06-02) ran a draft-vs-clone computed-style audit that proved the cloning pipeline has FOUR systemic CSS-transfer failures — do NOT re-derive them, READ the audit (decisions D136 + `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md`). Quote the STOP catalogue + the pre-flight ritual back to yourself before acting. There is a SEPARATE theme/blocks thread — see `.claude/next-session-prompt-theme.md` (do not do theme work here).

## Branch + state
- **Branch:** `feat/fr22-4-1-universal-wrapper` (NOT merged to main; merge-prep deferred — split per-block commits + Bean visual sign-off still pending). main clean.
- **Canary page 144** (`/rc-fix-verification-mamas-munches/` on sandybrown) reflects the latest re-clone. Pixel-diff ~61% (informational per FR-22-18; the systemic transfer gaps below are WHY it's high — wrong widths, dropped wrappers, imposed gradient).

## ✅ SHIPPED + VERIFIED — DO NOT re-derive
- **FR-22-20 universal variant detection (slot-fingerprint):** SHIPPED across commits `1a48c602`→`55f42e1b`, **LIVE-DOM VERIFIED** (hero carries `sgs-hero--split` via the reverted clean gate; band-aid gone). decisions D134. The mechanism (db_lookup `variant_attr_for`/`_variant_slots_map`/`detect_variant` + the convert.py emit-path enrichment + `blocks.variant_attr` column + `variant_slots` table + `/sgs-update` population) is built + qc-council-validated (1 real bug caught + fixed: presence-of-meaningful-value `_slot_extracted`, not truthiness).
- **Class-section width band-aid (PARTIAL, committed `e27ff591`):** `emit_sgs_container_wrapping` now emits `widthMode:'full'` so hero + trust-bar (slug-RESOLVED sections) render full-width. **This is a band-aid Bean flagged** — it only covers slug-resolved sections, is the wrong layer, and should be SUPERSEDED by the faithful-transfer fix below. Do NOT extend it with more per-section conditionals (Bean rejected that twice).
- **Static-div editor bug FIXED (committed, re-cloned):** `emit_sgs_container_wrapping` emitted a static `<div class="wp-block-sgs-container">` that fails WP validation against `save()`=`<InnerBlocks.Content/>` → "unexpected/invalid content" on EVERY cloned container in the editor. Now emits children directly (mirrors `_emit_section_container`). **OPEN — Bean to confirm in the editor on canary 144; also verify `sgs/media` "cannot be previewed" (save()=null — likely the same emit-vs-save mismatch class) clears post-reclone. If media persists: check the converter emits `sgs/media` self-closing (`/-->`) with no innerHTML.** The removed static div was also an extra nesting level that breaks grid-on-section → likely also improves audit gap 4.

## ⚡ TASK 1 — NEXT SESSION OPENS WITH THIS: fix the broken BEM div-class routing (editor "invalid content")

**Problem (Bean, 2026-06-02):** Many cloned `sgs/container` (and `sgs/media`) blocks STILL show "unexpected/invalid content" / "cannot be previewed" in the WP editor. Root cause is NOT bare text — it's **broken BEM div-class routing**: divs that HAVE classes which SHOULD resolve to a proper block are FALLING THROUGH to slug-None → emitted as a `sgs/container` with the text as **raw inner content**, which the container's `save()=<InnerBlocks.Content/>` rejects. The routing (FR-22-2 BEM→block resolution via the `slots` table) is failing for these classes. **DO NOT wrap the orphan text in `sgs/text` — that's a band-aid Bean explicitly rejected. The fix is to make the routing resolve these classes to their correct blocks.**

**Concrete mis-routed cases (from canary 144 deployed markup):**
- `sgs-gift-section__card-tag--trial` (text "New? Start here") → should route to **`sgs/label`**.
- The ingredients-section **disclaimer** div class → should route to **`sgs/notice-banner`**.
- The gift-section **card-description** div class → should route to **`sgs/text`**.
- Plus ~15 more containers with raw-text direct children (all the same mis-routing).

**What to do:** root-cause why these BEM elements (`card-tag`, `disclaimer`, `card-description`, …) don't resolve to their blocks — almost certainly missing/incorrect `slots` table rows (slot_name→standalone_block) so `equivalent_block_for()`/`resolve_slug_from_bem()` return None → slug-None container fallthrough. Fix DB-first (R-22-1): add the correct slot mappings so each BEM element resolves to its block (label/notice-banner/text/etc.), universally — NOT per-block Python literals, NOT a text-wrap band-aid. Read `/sgs-db` slots + `resolve_slug_from_bem` + FR-22-2 first. After fixing: NO container should have a raw-text direct child (scan: container open comment immediately followed by non-tag text = 0).

**ALSO (same task): `sgs/media` blocks still broken ("cannot be previewed").** Bean: "doesn't make sense." This is likely a media-block edit/render error OR media routing emitting wrong attrs. Investigate the media block's edit.js + how the converter emits sgs/media (attrs vs the block's expected schema) + whether the image object shape matches.

**Already fixed this session (committed `df9c5a40`, KEEP):** 2 of the 3 invalid-content variants — `sgs/star-rating` (+28 dynamic blocks) now self-close via DB `block_accepts_inner_blocks`; `core/list`→`sgs/icon-list` (was static self-closing-broken). Verified by re-clone (core/list=0, star-rating self-closing=3, static-div=0), cross-model reviewer PASS. NB the `ul/ol→sgs/icon-list` routing decision should be reviewed for correctness as part of the holistic routing fix (a plain footer nav list may want a different target than an icon-list).

## ⚡ THE PRIORITY 2 — faithful CSS transfer (the 4-gap audit, D136)

**The principle (Bean, locked):** "This is literally just about transferring the CSS values that exist in the draft into the clone — which is literally the whole point." When a cloned element looks wrong, the cause is almost always that the pipeline FAILED TO TRANSFER the draft's CSS, or is IMPOSING a framework default the draft never had. Do NOT bolt converter-side detection/mode hacks — fix the transfer layer. See memory `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`.

**The audit (2026-06-02, draft-vs-deployed-clone computed styles @1440px) found 4 systemic transfer failures:**

1. **Framework IMPOSES `max-width:1200` on full-bleed sections.** Draft: featured-product/ingredients/gift/social-proof have NO section max-width (full-bleed, Bean's deliberate blank-max-width rule); clone applies the theme `wideSize` (1200). The container's own max-width IS neutral — but the WP page template constrains any non-`alignfull` child to wideSize. **Recommended fix (Bean's + my analysis): a theme-CSS rule keyed on structural position** — `.entry-content > .wp-block-sgs-container { max-width:none; }` makes top-level (direct-child) sections full-bleed by POSITION, leaves composite-nested containers alone, and the draft's explicit max-widths (brand 1000, `__inner` 960) still override. Cleaner than changing the block default (no editor-UX impact) or a per-element converter conditional (the rejected band-aid).
2. **Pipeline DROPS the `__inner` content wrappers.** Draft: `…ingredients-section__inner`, `…gift-section__card-inner`, `…social-proof__inner` exist with `max-width:960` (the real content constraint). Clone: **MISSING entirely** — the FR-22-4.1 fold collapses them away. So even a full-width section has no content constraint → content spills. **Fix: the fold must NOT drop content wrappers — preserve the two-level structure (full-bleed section + content-width inner), transferring the inner's max-width.**
3. **Framework PAINTS a hero gradient the draft never had.** Draft hero bg: solid `rgb(245,194,200)`. Clone: `linear-gradient(135°, #C56A7A → #E68A95)` painted over it (the `#C76C7C` from the global measurement-vs-eye rule). **Fix: stop the hero render.php / framework imposing the gradient overlay; transfer the draft's solid background.**
4. **`grid-template-columns` not transferred faithfully.** trust-bar__inner draft `266px ×4` (equal badges) → clone uneven auto `143/132/111/160` (cramped to 584 not 1100). brand draft `122px 782px` (logo|content asymmetric) → clone `450px 450px` (equal). **Fix: transfer the draft's explicit grid-template-columns onto the clone container.**

## REMAINING (cloning thread, priority order)
1. **Faithful CSS transfer (the 4 gaps above)** — the priority. Start with gap 1 (theme-CSS-by-position) + gap 2 (fold stop-dropping-__inner) — they're a pair and fix the section width+content. Then gap 3 (hero gradient) + gap 4 (grid-columns).
2. **Variant-routing rollout** (criterion LOCKED — see below). Build the modifier-class detector for stylistic variants + apply the routing-vs-D0 split. The slot-fingerprint (FR-22-20) only fits content-distinct variants (~2 blocks); most need modifier-class. See decisions D135.
3. **Real image sideload** (media-map) — hero/product images dry-run 404. Biggest pixel lever once structure is faithful.
4. **Merge-prep → main:** split `d6358f32` + `e27ff591` per-block (R-22-5) + Bean visual sign-off (R-22-13) → merge.
5. **hero inner content width** — hero__content rendered 340px (should ~713, fills its split column); a content-max-width imposed it doesn't have. Part of the transfer-fidelity work.

## VARIANT-ROUTING CRITERION (LOCKED this session — the answer to "which blocks need the special matching")
**A block needs ROUTING iff the variant makes specific content/structure/terms APPEAR that plain CSS extraction won't reproduce. Everything else is a CSS setting that transfers via the D0 layer — no routing.** (Bean: "I couldn't care less what we call them.") Full 66-block categorisation + the two "variant" mechanisms (the in-block `variant` attr AND `registerBlockVariation` inserter presets) in `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md`. NEEDS ROUTING: hero, product-card, business-info, announcement-bar(countdown), whatsapp-cta, testimonial-slider(split), trust-bar(badge), team-member(Compact/Detailed), card-grid, mega-menu + carousel/badge VALUES only. D0-TRANSFERABLE (no routing): heading, text, label, quote, mobile-nav, divider, all cardStyle/style presets, grid/masonry/list layout values, button primary/secondary/outline.

## MANDATORY READING LIST (read FULLY before any work)
1. This file.
2. `.claude/handoff.md` (cloning thread, 2026-06-02).
3. `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md` — the variant-routing criterion + 66-block categorisation + the issue register.
4. `.claude/decisions.md` newest: **D136 (CSS-transfer 4-gap audit), D135 (variant-routing finding — slot-fingerprint only fits content-distinct), D134 (FR-22-20 shipped+verified)**, then D130-D133.
5. Root `CLAUDE.md` — "Root-cause methodology (MANDATORY)" + the 14 binding rules (R-22-1..14).
6. `.claude/state.md` — current_phase + blockers.
7. `git log --oneline -14` + read the recent commit messages (each carries root-cause + verification).
8. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — §FR-22-19 (scalar-media, shipped), §FR-22-20 (variant detection, shipped for hero), §FR-22-4/4.1 (the FOLD — gap 2 lives here), §6 (R-22-1..14).
9. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — debug-artefact map (read BEFORE conjecturing).
10. `.claude/cloning-pipeline-flow.md` + `-stages.md` — esp. the D0/D1/D2/D3 CSS router (gaps 1/3/4 are transfer-layer).
11. `sites/mamas-munches/mockups/homepage/index.html` — THE draft truth. The draft pattern is: full-bleed sections (no max-width) + `__inner` wrappers (max-width:960). Read it.
12. `.claude/parking.md` — P-FR2220-VARIANT-DETECTION (PARTIAL), and add a P-CSS-TRANSFER-FIDELITY entry.
13. memory `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks` — the principle. And `feedback_empty_section_false_pixel_diff_win`, `feedback_read_ground_truth_before_concluding`.
14. The converter: `convert.py` walk() ~1986-2090 (the slug-None section path + fold), `db_lookup.py` `emit_sgs_container_wrapping` ~2139, `_collect_css_decls_for_element` (the per-element CSS — where transfer happens).
15. `theme/sgs-theme/theme.json` (contentSize 780 / wideSize 1200) + `container/render.php` widthMode + `container/style.css` width classes.
16. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — product-card/trust-bar dual-mode (FR-24-10 shipped).

## Anti-pattern STOP catalogue — carried forward + EXTENDED (D101; if you find yourself doing X, STOP)

| # | If you find yourself | STOP — because |
|---|---|---|
| 1 | Grep-skimming Spec 22 instead of reading sections end-to-end | Cornerstone §FR-22-2/2.1/2.2/2.5 defines `equivalent_block_for()`. READ FULLY. |
| 2 | Referencing `slot_synonyms`/`legacy_role_lookup` as live tables | DROPPED D99. Live = `slots` (PK `(slot_name,scope)`, 92 element + 4 section) + `roles` (21). |
| 3 | Referencing `slot_synonyms.role_classification` column | Retired D99 → `roles` table. |
| 4 | Treating `.claude/` + `.agents/` sgs-framework.db as two DBs | Same physical file (NTFS junction). Real two DBs = sgs-framework.db + ui-ux-pro-max.db. |
| 5 | Building a bespoke SGS block per mockup section | R-22-9 violation. ~67 reusable primitives; section variation via slots + FR-22-4 default. |
| 6 | Adding `if(empty($content)&&!empty($legacy_attr)){scalar render}` to a migrated render.php | R-22-14 violation. Backwards-compat = roster migration + WP-CLI batch, never per-block fallback. |
| 7 | Batching multiple DB row changes then measuring once | Row-by-row gate: ship one + measure between each. |
| 8 | Routing a section-root BEM class to a content-block primitive | Section roots → sgs/container (or FR-22-4 default). |
| 9 | Proposing a fix-shape without reading the relevant Spec section + flow + stages end-to-end | State the architectural primitive in plain English FIRST. |
| 10 | Acting on a doc/handoff claim without grep-verifying against the codebase | 60s find/grep/ls BEFORE acting. |
| 11 | Using `sgs-db.py sql` for INSERT/UPDATE/DELETE | Wrapper is read-only (silently no-ops). Use direct `sqlite3` for writes. |
| 12 | Shipping a fix without tracing the EXACT emission path of the canary instance | Trace which slug RECEIVES the affected attr now, not which COULD. |
| 13 | Treating the literal-slug-match voter path as live | Retired D107. Voter queries `blocks.tier='class-section'`. |
| 14 | Re-enabling the reverted XS-3 walker condition | Resolved by FR-22-4.1 fold. Don't re-derive the old predicate. |
| 15 | Batching `block_composition`/DB-row changes then measuring once | Ship one row at a time with measurement between. |
| 16 | Hardcoding `__products`/`__cards`/generic BEM slot → specific block slug in Python | R-22-1 violation. Route via DB; fall through to sgs/container default. |
| 17 | Treating "code reverted" as "all related updates deferred" when applying docs | Distinguish: (a) code reverted, (b) DB rows persisted, (c) shipped tasks unaffected. |
| 18 | Accepting a subagent threshold/result without sanity-checking vs architectural intuition | If count is wildly off the expected roster, the threshold is wrong — fix before accepting. |
| 19 | Iterating inline on a failing fix under context pressure when measurement shows regression | Roll back fast; re-tune across a session boundary with evidence baked in. |
| 20 | Trusting a per-section pixel-diff WIN without checking live-DOM textLen | An EMPTY section scores a FALSE win. Verify `el.innerText.trim().length` + element counts (R-22-11). |
| 21 | Assuming the walker runs FR-22-2 content-routing automatically | Confirm leaf content-routing + the fold actually fire; verify emitted markup. |
| 22 | Treating a renamed/migrated block as "done" without verifying its render mode | trust-bar reads scalar `items` (HYBRID) — renders DEFAULTS not cloned content unless §FR-24-10 dual-mode. |
| 23 | Routing pack-size/option pills to `sgs/label` (or `sgs/button`) | Pills → a FUTURE dedicated atomic pill block, NOT label/button. |
| 24 | Trusting a per-section pixel-diff change (either direction) over live DOM | Pixel-diff mis-scores structural change BOTH ways. FR-22-18: structural parity from rendered HTML is the gate. |
| 25 | Shipping a self-labelled "Phase 1" / "simpler-than-spec" shortcut | Implement the spec's ACTUAL mechanism. |
| 26 | Asserting what ANY block can/can't do from a partial attr dump | READ block.json + edit.js + render.php + `/wp-blocks` before asserting capability. |
| 27 | Giving up after one shortcut fails; not using the toolkit | For EVERY gap: root-cause from trace+live-DOM, find why same-class peers PASSED, ONE unified systemic fix. |
| 28 | Using pixel-diff during structural work | Measure from RENDERED HTML for layout/wrapper/logic. Pixel-diff informational-only (FR-22-18). |
| 29 | Over-checkpointing (burning Bean's context with questions) | If evidence is clear, DECIDE + execute. Only ask when a decision genuinely changes direction AND can't be resolved from evidence. |
| 30 | Proposing a block become a "thin shell" without reading its render.php's FULL pipeline | The hero render.php already had a working 169-attr image pipeline + art-direction @media CSS. Read the FULL render.php before deciding the fix LAYER. |
| 31 | Deciding the fix is block-side because "the block looks wrong" | When a render.php "already works" for one input model, the fix may be CONVERTER-side. Verify which layer emits the wrong shape. |
| 32 | Ramming a sensitive/high-blast-radius walker change at a context-heavy session tail | Design + `/qc-council` validate the fix-shape + focused build (extends STOP #19). |
| 33 | **NEW 2026-06-02. Bolting a converter-side detect-property-then-set-mode conditional for something that should just TRANSFER** | Bean rejected this twice (detect max-width → set widthMode). The pipeline's whole job is faithful CSS transfer; a per-element/per-section walker conditional is the wrong LAYER. Fix the transfer (D0/D1/D2 + per-element lift) or a theme-CSS rule keyed on position. Memory `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`. |
| 34 | **NEW 2026-06-02. Trusting a subagent's "fix all instances" sweep without verifying each instance** | A subagent swept `items:{type:object}` onto 19 blocks; 5 were arrays of integers/strings (post-grid categories/tags, table-of-contents headingLevels, form-field-address fields, product-card packSizes) → would CREATE new "Invalid parameter(s)" errors. Verify every swept instance against ground truth before keeping. |
| 35 | **NEW 2026-06-02. Claiming a fix "complete/verified" from a NARROW live-DOM check** | The widthMode fix was "live-DOM verified" on the hero's internal structure but MISSED the section-nesting + backgrounds Bean's eye caught (measurement-vs-eye rule: extend the set). For width/layout fixes, check the FULL section: width vs viewport, max-width, background fill, AND compare against the draft's computed styles (serve the mockup locally + diff). |
| 36 | **NEW 2026-06-02. Conflating a "variant" with a CSS "setting/style"** | A variant needs ROUTING only if it makes distinct content/structure/terms APPEAR (hero split, product-card featured). A font-size/animation-direction preset is a SETTING that transfers via D0 — not a variant. The dropdown being named `variant` does NOT make its values true variants. |

## Pre-flight self-attestation ritual (answer ALL inline before any fix-shape or dispatch)
1. Architectural primitive in plain English (Spec 22 §0)?
2. Which R-22-N binding rule(s) govern this? (esp. R-22-1 DB-first, R-22-3 no-4th-branch, R-22-9 universal, R-22-14 no-fallback)
3. **Is this a CSS-TRANSFER problem (faithfully copy the draft's value / stop imposing a framework default) or a genuine STRUCTURE/CONTENT-routing problem? If transfer — fix the transfer layer, NOT a walker conditional (STOP #33).**
4. Did I READ the draft's actual CSS for this element (serve the mockup + computed styles) AND the clone's, and diff them — not guess? (STOP #35)
5. Is this the spec's ACTUAL mechanism, or a shortcut/band-aid Bean would reject? (STOP #25/#33)
6. Which LAYER emits the wrong shape — converter, block, theme-CSS, or the fold? Did I read BOTH the converter output AND the block/theme expected input? (STOP #31)
7. Root cause from trace + live DOM — why did same-class peers PASS? (STOP #27)
8. Unified systemic + DB/transfer-driven fix (helps all same-class cases, no per-block conditional)? (STOP #16/#33)
9. Measuring from rendered HTML + live-DOM + draft-diff, not pixel-diff alone? (STOP #28/#35)
10. Sensitive/high-blast-radius change at a context-heavy tail → design + qc-council + focused build? (STOP #32)

## Tooling
`/autopilot` (first) · `/sgs-wp-engine` · `/wordpress-router` · `/sgs-clone` · `/wp-blocks` · `/sgs-db` (read) + direct `sqlite3` (writes) · `/systematic-debugging` · `/qc-council` (per converter/block commit — MANDATORY) · `/verify-loop` · `/dispatching-parallel-agents` + `/subagent-driven-development` · `/delegate` · Playwright MCP (serve the mockup locally on a port for draft-vs-clone computed-style diff — `file://` is blocked) · `build-deploy.py --target sandybrown --blocks-only --allow-dirty` · `sgs-clone-orchestrator.py` (NB: path is `plugins/sgs-blocks/scripts/`, NOT `scripts/orchestrator/`) · `/handoff`.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design the transfer-layer fix before coding (sensitive — fold + theme-CSS) |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | If a transfer approach needs the gold-standard (auto-routes tier) |
| `/strategic-plan` | Order the 4-gap fixes |
| `/systematic-debugging` | Root-cause each transfer gap from artefacts + draft-diff |
| `/qc-council` | MANDATORY before every converter/block commit (blub.db 255) |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | Draft-vs-clone computed-style diff (serve mockup on localhost; `file://` blocked) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Schema enumeration before any "missing X" |
| `/sgs-db` (read) + `sqlite3` (writes) | DB ground truth |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy converter/theme-CSS/fold build |
| `design-reviewer` | Visual parity draft-vs-clone after the transfer fix |

## Guardrails
- **Deploy before measure** — `build-deploy.py --blocks-only` + OPcache reset BEFORE any pixel-diff/browser test.
- **Faithful transfer, not detection hacks** (STOP #33) — fix the transfer layer or a theme-CSS-by-position rule; never a per-section walker conditional.
- **Draft-diff, not pixel-diff** for layout — serve the mockup locally, compare computed styles (STOP #35).
- **--converter-v2 required** on orchestrator runs. **WP_DEBUG_DISPLAY false** on staging.
- **/qc-council before every converter/block commit** (blub.db 255). **Verify subagent sweeps** (STOP #34).
- Branch stays open (NOT merged) until merge-prep + Bean sign-off.
