---
doc_type: strategic-plan
project: small-giants-wp
thread: sgs-theme
plan_id: spec27-28-council-mustfix-wave
created: 2026-06-06
status: AWAITING-BEAN-SIGNOFF
source_backlog: parking P-SPEC27-28-COUNCIL-MUSTFIX-WAVE
---

# Wave-Plan — clear the Spec 27/28 adversarial-council must-fix backlog

**Goal (one sentence):** clear all ~20 fact-checked council backlog items in three file-disjoint waves of haiku+sonnet subagents under Opus orchestration, then continue Spec 27/28 to 100% (R4+F2, P2/P3) — excluding the cloning HTML-draft product page.

**Done looks like:** every must-fix (1–5) + should-fix (6–17) + missing (18–20) shipped + live-verified on canary 540, legal fixes grounded in researched UK consumer-law rules, Bean R-22-13 sign-off on the consumer-facing Wave 2, configurator still renders 16 pills.

## Orchestration model (Bean-locked)
Opus = orchestrator: plan + decompose + dispatch + **fact-check every subagent claim against live ground truth** + deploy + commit by explicit path. Subagents have **NO commit/deploy authority** — they return uncommitted diffs. haiku = mechanical/enumerative; sonnet = code_gen. `/qc-council` before any commit touching a WC-write / cart / consumer-price path. Fan-out ≤3 concurrent, ≤2 sonnet at once (memory `dont-fan-out-many-heavy-agents-at-once`).

## File-disjointness proof (the load-bearing planning fact)
Verified against real code 2026-06-06. The backlog's 20 items map to these files:

| File (line count) | Items | Wave |
|---|---|---|
| `includes/class-cart-proxy.php` (988) | #3 £0 is_purchasable · #17 split | 1A · 3B |
| `includes/class-product-authoring-security.php` (180) | #6 rate-limit · #7 WP_Error 403 | 1B |
| `includes/class-product-provisioning-args.php` (327) | #8 WP_DEBUG gate | 1B |
| `includes/class-product-provisioning.php` (838) | #12 rollback return-check | 1B |
| `includes/class-product-preflight.php` (622) | #10 cron rotate · #11 placeholder | 1D |
| `includes/class-configurator-edit-safety.php` (277) | #15 TTL · #16 dual-fire | 1C |
| `tests/js/lean-seed-size.test.js` (NEW) | #18 ≤24KB assert | 1E |
| `includes/render-helpers.php` (1514) | #1 saving · #5 decoy · #13 sale-tail · #20 VAT-basis · #17 split | **2** · 3B |
| `src/blocks/product-card/render.php` (956) | #5 badge text · #9 termLabel axis | **2** |
| `src/blocks/product-card/edit.js` (414) | #1 controls · #2 prepublish | **2** · 3A |
| `src/blocks/product-card/block.json` (212) | #1 attrs | **2** |
| `includes/class-configurator-meta.php` (330) | #1 field · #4 ref-price · #14 deny-list · #19 audit | **2** |
| `src/.../PrePublishPanel.js` (NEW) + provisioning | #2 visibility + auto-variesBy | **3A** |

**Wave 1 lanes touch 7 mutually-disjoint files — zero overlap with each other OR with Wave 2's shared set.** Wave 2 is the 5-file shared cluster (one coordinated implementer, no parallel sub-lanes). Wave 3 depends on Wave 2 (edit.js) and Wave 3B moves functions every prior wave edited → strictly LAST.

## The three waves

### Wave 1 — parallel, file-disjoint (clears 9 items)
| Lane | Files | Items | Model | Commit gate |
|---|---|---|---|---|
| 1A | class-cart-proxy.php | #3 override `woocommerce_is_purchasable`→false when price ≤0 | sonnet | **/qc-council** (cart/purchasability path) |
| 1B | security + provisioning-args + provisioning | #6 budget-by-variations · #7 WP_Error 403 · #8 gate test-hook behind WP_DEBUG · #12 check `wp_delete_post` return + surface manual-cleanup IDs | sonnet | /qc-council (WC-write rollback) |
| 1C | configurator-edit-safety.php | #15 TTL→DAY_IN_SECONDS · #16 trash-vs-permanent gate + copy | haiku | php -l + live |
| 1D | product-preflight.php | #10 rotate/randomise cron selection · #11 catch WC placeholder in no_image | haiku | php -l + live |
| 1E | tests/js/ (new) | #18 assert lean-seed `data-wp-context` ≤24KB (baseline 22408B) | haiku | test runs green |

Batch: dispatch 1A+1B (sonnet) + 1C (haiku); then 1D+1E (haiku). Verify + commit each lane by explicit path before the next batch.

**∥ optimisation:** kick off the **legal gold-standard research** (DMCC 2024 / CPRs / ASA price-comparison rules — `/research-check`) *during* Wave 1 execution (read-only, zero file conflict) so Wave 2's design is ready the moment Wave 1 closes.

### Wave 2 — the value-ladder + legal cluster (SHARED files, single sequential implementer)
Items: #1 authoring UI (framingMode SelectControl + decoyEnabled ToggleControl + VALIDATED `_sgs_base_price_pence` field) · #4 reference-price validation · #5 non-superlative decoy badge · #14 label word-deny-list · #9 termLabel axis-pick · #13 sale-tail denominator · #20 VAT-basis guard · #19 claim audit-trail.

**Opus designs** #1 (authoring UI) + #4/#5/#14 (legal fix-shapes, grounded in the Wave-1 research) → **sonnet builds** in ONE coordinated pass (shared files, no sub-lanes). Live-verify on canary 540: set `_sgs_base_price_pence` via token one-shot to exercise the savings path → confirm ladder shows savings + correct non-superlative decoy label + inc-VAT basis → restore to 0. Re-run axe (saving-text contrast bit once before). **/qc-council before commit. Bean R-22-13 sign-off (consumer-facing + legal).**

### Wave 3 — sequenced after Wave 2
| Lane | Items | Model | Depends on |
|---|---|---|---|
| 3A | #2 PREFLIGHT block-editor visibility — new `PluginPrePublishPanel` JS calling `GET /preflight` + actionable no_variesby message + auto-set variesBy at provisioning | opus design → sonnet | Wave 2 (shared edit.js) |
| 3B | #17 file-cohesion split — render-helpers.php → colour / configurator-pricing / value-ladder / svg-kses; cart-proxy split | sonnet | ALL prior waves (moves edited functions) — apply `shared-helper-must-require-its-own-deps` lesson + live render-verify |

## Gates
- **Gate 1 (after Wave 1):** 5 lanes live-verified; 1A/1B /qc-council passed; each committed by explicit path. Readiness to start Wave 2.
- **Gate 2 (after Wave 2):** legal fixes cite researched rules; authoring controls render + save; savings path exercised on canary; axe 0; /qc-council passed; **Bean R-22-13 sign-off** (go/no-go).
- **Gate 3 (after Wave 3):** PREFLIGHT reason visible in block editor; file split — all consumers resolve (live render, not just php -l); regression: 16 pills still render.

## Effort (optimistic, subagent-parallelised — verify-as-you-go)
Wave 1 ~25–35 min wall (parallel lanes + orchestrator verify + commits). Legal research ∥ ~15–30 min. Wave 2 ~45–60 min (heaviest — shared-file sequential + legal + sign-off). Wave 3 ~40 min. **Backlog total ~2–2.5 h wall.** Then Spec 27/28-to-100% (R4+F2, P2/P3) is a separate phase.

## Wave 2 — grounded design (locked from Spec 28 P1 PD/KJC + DMCC/CPRs research)

Single coordinated implementer on the 5 shared files, sequenced. The value-ladder helpers already exist (`sgs_saving_display`, `sgs_value_ladder` in render-helpers.php); `framingMode`/`decoyEnabled` attrs + `_sgs_base_price_pence`/`_sgs_decoy_enabled` metas already exist (read-only). Wave 2 adds the authoring UI + makes the claims legally safe.

| # | Item | Grounded fix-shape | File(s) |
|---|---|---|---|
| **1** | Authoring UI | `framingMode` SelectControl (savings/loss-aversion/neutral) + `decoyEnabled` ToggleControl in the Inspector; a `_sgs_base_price_pence` product field (entered as £, stored pence) **with an attestation checkbox** (see #4) | edit.js, block.json, class-configurator-meta.php |
| **4** | LEGAL ref-price | Validate on save: base must be **≥ the smallest pack's per-unit** (a genuine single can't be cheaper per-unit than a multipack — reject otherwise); REQUIRE an explicit `_sgs_base_price_attested` checkbox ("this single price is genuinely available"); suppress the "vs buying singly" claim unless base>0 **AND** attested (extends FR-28-16). Robust "pull from a real linked single-unit SKU" is a P3 enhancement. | class-configurator-meta.php |
| **5** | LEGAL badge | Reserve "Best value" for the actually-cheapest-per-unit row; when `decoyEnabled` (badge on 2nd-largest, NOT cheapest per-unit) use **"Most popular"** (research: superlative on a non-cheapest pack = DMCC misleading action) | render.php |
| **9** | Axis pick | Replace the English `/size/i` first-axis fallback with an operator-chosen pack-size axis (new meta/attr); detect-by-unitDivisor-correlation as fallback | render.php, class-configurator-meta.php |
| **13** | Sale-tail | Make the tail describe the ACTUAL denominator (saving is vs the single-item anchor, not the sale price) — fix the "vs sale price" wording in `sgs_saving_display` | render-helpers.php |
| **14** | LEGAL deny-list | discount-label sanitiser: reject/strip a word deny-list (save, free, half price, % off, cheapest, lowest, best value, guaranteed, deal, bogof, off, sale, discount) + length cap | class-configurator-meta.php |
| **19** | Audit trail | On `_sgs_base_price_pence` save, log `{timestamp, single_unit_product_id, base_pence, smallest_pack_per_unit, attested}` (DMCC substantiation record) | class-configurator-meta.php |
| **20** | VAT basis | Force the consumer ladder per-unit inc-VAT (Price Marking Order / DMCC s.230), or label the basis — fix the `ex-plus-vat` branch in the ladder | render-helpers.php |

**Gate 2:** legal fixes cite the researched rules; controls render+save; savings path exercised on canary (set base via one-shot); axe 0; /qc-council; **Bean R-22-13 sign-off**. Build the value-ladder BLOCK in the editor + canary 540, NOT via a page re-clone (memory `composite-mirror-is-separate-from-cloning-fidelity`).

## Wave 2 — BUILD STATE (PARTIAL, 2026-06-06 — resume here)

The coordinated implementer cut off mid-build. **Uncommitted, undeployed, UNREVIEWED — zero live risk.** Resume in a fresh session.

**DONE (php -l clean, but NOT yet fact-checked/gated):**
- `plugins/sgs-blocks/includes/class-configurator-meta.php` (+298 lines) — claims to cover #1 meta reg (`_sgs_base_price_pence` pounds→pence + `_sgs_base_price_attested` + `_sgs_decoy_enabled` + `_sgs_pack_size_axis`), #4 ref-price validation (base ≥ smallest-pack per-unit + attestation), #14 discount-label word deny-list + length cap, #19 audit-trail meta. **MUST fact-check every claim against real code (Wave-1 showed sonnet introduces invented APIs + cut-offs).**
- `plugins/sgs-blocks/includes/configurator-product-fields.php` (NEW, 8736B, php -l clean) — product-level authoring UI (#1 fields + #9 axis picker via woocommerce_wp_* fields). **NOT WIRED** — needs require_once + the WC product-data hooks registered (check `shared-helper-must-require-its-own-deps`).

**NOT STARTED (resume):**
- render-helpers.php — #13 sale-tail denominator wording; #20 force consumer ladder inc-VAT.
- render.php — #5 badge "Best value"→"Most popular" when target≠cheapest-per-unit; #9 read `_sgs_pack_size_axis` for axis pick.
- edit.js — #1 InspectorControls (framingMode SelectControl + decoyEnabled ToggleControl).

**RESUME SEQUENCE:** (1) fact-check the 2 done files against ground truth + wire the new file; (2) finish the 3 remaining files (small, but #5/#20 are legal); (3) npm build; (4) /qc-council the full diff; (5) /verify-loop the 4 legal claims (#4 validation, #5 wording, #14 deny-list, #20 inc-VAT); (6) deploy + live-verify on canary 540 (set base via one-shot to exercise savings; badge wording; inc-VAT; axe 0); (7) Bean R-22-13 sign-off; (8) commit path-scoped. Decide first: salvage the partial OR `git restore`/`rm` the 2 done files + rebuild clean from the locked design above (STOP #19 favours a clean rebuild if the fact-check finds problems).

## Excluded (do NOT action)
The 2 refuted council claims (unmanaged-stock cap; discount-label-as-code-bug). The cloning HTML-draft product page (parallel cloning thread). Spec 28 P4 WC-write + R5 AI-builder (deferred — the real first-shop blocker is the converter, cloning D178).
