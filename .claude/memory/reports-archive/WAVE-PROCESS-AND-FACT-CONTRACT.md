---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Draft-vs-clone fidelity — WAVE process + Wave-1 fact-entry contract (Bean-locked 2026-06-08)"
created: 2026-06-08
status: ACTIVE PROCESS. Supersedes the by-problem-type Loop-1 approach (NO-GO per the 2026-06-08 adversarial council). All fidelity diagnosis now runs in waves, section by section.
---

# The Wave process (Bean-locked 2026-06-08)

Replaces the failed by-problem-type loop. Three waves; each is SECTION-BY-SECTION and ISSUE-INDEPENDENT.

## Wave 1 — FACT-FINDING (facts only; NO root cause, NO solution, NO clustering)
Go through every issue **in original-mention order**. One SECTION at a time. Each issue gets its own fact-entry (independent — never merged). After a section's entries are complete + QC'd + Bean-approved, move to the next section. Section order: **Hero → Trust Bar → Featured-product → Brand → Ingredients → Gift → Social Proof.**

## Wave 2 — ROOT CAUSE + SOLUTION (still section-by-section, issue-independent)
Only after Wave 1 facts for a section are approved. Each issue: root cause (grounded in the Wave-1 facts) + proposed solution. Verified/evidenced/validated per issue before Wave 3.

## Wave 3 — MERGE + IMPLEMENT
Only after Wave 2 is validated. Merge issues with overlapping root causes/solutions into universal fixes. Push each merged fix to a FRESH session to implement (sgs-update + sgs-clone + adversarial-council in that session). Pipelined: while a fresh session implements, the diagnosis session runs the next wave/section.

---

# Wave-1 fact-entry CONTRACT (every field mandatory; EXACT refs, no `~`)

For each issue, record ONLY verifiable facts — no interpretation, no root cause, no fix:

1. **Issue ID + VERBATIM user description** (unaltered; traces to the user's list).
2. **DRAFT facts** — every relevant CSS rule + markup from `sites/mamas-munches/mockups/homepage/index.html`, each tagged `index.html:<line>`. Quote the actual code.
3. **CLONE facts** — every relevant emitted CSS/markup from `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`, each tagged `current-clone-page-source.html:<line>` (inline `style=`, inline `<style>` blocks, classes). Quote the actual code.
4. **DB facts** — exact relevant rows/columns from `sgs-framework.db` (via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` + `python ~/.claude/hooks/wp-blocks.py dump`). Record table + attr/row + value. State existence/absence explicitly (e.g. "sgs/container has gridTemplateColumnsTablet but NOT gridTemplateColumnsDesktop").
5. **SPEC/DOC refs** — the docs that govern the topic: block reference **Spec 02 (full, not the ref)**, naming conventions **Spec 00**, container-equivalent **Spec 29**, pipeline **Spec 22 (FR id)**, plus any block-specific spec (27/28 for product-card). Cite doc + section/line.
6. **PIPELINE-LOCATION refs** — where in the pipeline/sgs-clone flow the issue arises: stage / layer / flow route. Cite `cloning-pipeline-flow.md`, `cloning-pipeline-stages.md`, `dev-setup.md`, `architecture.md`, and the relevant `convert.py`/`db_lookup.py`/`render.php` `file:line` (EXACT).

## Completion gate per section (council-mandated)
- Every issue in the section has all 6 fields populated with EXACT refs (no `~`, no "approximate", no "UNPROVEN" left as a terminal state — if a fact can't be found, state the exact blocker).
- Every entry traces to a VERBATIM user issue ID. No invented issues. Nothing "cleared" (clearing is a Wave-2/Bean decision, not Wave-1).
- A coverage checklist lists every issue in the section = fact-complete | blocked-with-reason.
- QC: citations spot-checked against the real files before Bean sees it. Run `/gap-analysis` on the section doc before the approval gate.

## Sources of truth (ONLY)
draft index.html · clone current-clone-page-source.html · pipeline scripts · DB · the spec/flow docs above. NOT parity2/pipeline-artefacts/logs.

---

# PROGRESS LEDGER (read this first after any compaction / new session)

**Where we are:** Wave 1 (fact-finding), going section by section in original-mention order. Each section is dispatched to a fact-finder subagent, QC'd (citations spot-checked against the real files), then approved by Bean before the next section.

**Wave 1 section status:**
| # | Section | Status | Doc |
|---|---------|--------|-----|
| 1 | Hero (H-A/B/C) | ✅ fact-complete, QC-passed, **Bean-approved** | `.claude/reports/wave1/01-hero.md` |
| 2 | Trust Bar (TB-A/B/C) | ✅ fact-complete, QC-passed, **Bean-approved** | `.claude/reports/wave1/02-trust-bar.md` |
| 3 | Brand (BR-A/B/C) | ✅ fact-complete, QC-passed, **Bean-approved** | `.claude/reports/wave1/03-brand.md` |
| 4 | Featured-product (FP-A..P + draft-fix) | ✅ fact-complete, QC-passed (FP-F = blocked-with-reason: needs live request tracing) — **Bean review pending** | `04a-` + `04a2-featured-product-styling.md` + `04b-featured-product-architecture.md` |
| 5 | Ingredients (IN-A..F) | ✅ fact-complete, QC-passed — **Bean review pending** | `.claude/reports/wave1/05-ingredients.md` |
| 6 | Gift (GF-A..I) | ✅ fact-complete, QC-passed — **Bean review pending** | `06a-gift.md` + `06b-gift.md` |
| 7 | Social Proof (SP-A..G) | ✅ fact-complete, QC-passed (SP-G binding error = blocked-with-reason) — **Bean review pending** | `07a-social-proof.md` + `07b-social-proof.md` |

## ✅ WAVE 1 COMPLETE (2026-06-08) — all 7 sections fact-complete + QC-passed.
Section docs: `.claude/reports/wave1/01-hero.md` · `02-trust-bar.md` · `03-brand.md` · `04a-` + `04a2-featured-product-styling.md` + `04b-featured-product-architecture.md` · `05-ingredients.md` · `06a-` + `06b-gift.md` · `07a-` + `07b-social-proof.md`.

**Two items BLOCKED-WITH-REASON (need a live REST request trace, not static reading):** FP-F + SP-G — ✅ **RESOLVED 2026-06-08 via live trace → `.claude/reports/wave1/08-binding-error-trace.md`.** Both are the SAME cause: the editor injects universal `sgs*` extension attributes (animation/visibility/hover) client-side; `ServerSideRender` sends them to `GET /wp/v2/block-renderer/<block>?context=edit`; WP-core validates with `properties=$block->get_attributes()` + `additionalProperties:false` (`class-wp-rest-block-renderer-controller.php:67-71`) and rejects the first `sgs*` attr the block.json doesn't register (`rest_additional_properties_forbidden`, `rest-api.php:2421-2423`). Product-card fails on `sgsAnimation` (registers 0 `sgs*` attrs); trustpilot fails on `sgsAnimationDelay` (registers `sgsAnimation` but not `Delay`). The three PHP includes hook `render_block` only — never register the attrs server-side. Prior FP-F doc's 3 candidate emitters REFUTED live.
> **✅ FIXED + SHIPPED to main (commits `8694aebc` fix + `df691994` docs):** new `register_block_type_args` filter (`includes/extension-attrs-rest-register.php`) registers the `sgs*` schema on every className-supporting block; attr list generated from the extension JS (`scripts/generate-extension-attributes.js` → `includes/extension-attributes.generated.php`, wired into prebuild/prestart). qc-council validated, no regressions. Affected blocks confirmed: product-card (bound), trustpilot-reviews, business-info, content-collection (post-grid was a false positive — no SSR). **→ FP-F + SP-G are DONE (diagnosed + fixed). EXCLUDE them from Wave 2.** Verified on sandybrown canary only (palestine-lives.org test site skipped). A new pre-commit gate runs `generate-extension-attributes.js --check` when extension JS is staged. `decisions.md` D190 is in the working tree (uncommitted) — keep it on next decisions.md commit.

**Cross-attested fact clusters (independently found by ≥2 section fact-finders — high-confidence Wave-2/Wave-3 input; do NOT pre-merge, just noted):**
- text-align not transferred (ancestor-inherited or omitted-left → heading block CSS defaults to center): H-C, FP-A, IN-A, IN-E, GF-A, GF-E.
- font-family excluded from typography lift (`db_lookup.py:1101`) → wrong price font: FP-M, GF-F, GF-B.
- margin/padding between blocks not lifted onto text blocks: FP-C, IN-B, GF-C, GF-G, SP-B, SP-D.
- `sgs/container` `verticalAlign` default `start` + `flex-wrap:wrap` hardcoded (`class-sgs-container-wrapper.php`): FP-N, FP-O, SP-C.
- `min-width:640` breakpoint not in `_BREAKPOINT_RULES`: SP-A.
- responsive grid (missing `*Desktop` slot + inline-beats-@media + feature-grid `auto-flex` override): BR-A, H-A, IN-C, TB-A.
- media/image attrs not lifted (`_atomic_attrs_for` only sets imageUrl/imageAlt): BR-B, FP-I.
- content not transferred for certain blocks (notice-banner/announcement-bar/testimonial name): IN-F, GF-I, SP-E.
- block ROUTING (review/testimonial→sgs/testimonial not trustpilot-reviews; `.sgs-products`→sgs/container not card-grid; card-grid lacks product capability): SP-G, FP-D, FP-E.

## NEXT: Wave 2 — root cause + proposed solution, per issue, section by section, independent (after Bean approves Wave 1 + compacts).

**The verbatim issue list** is in `.claude/reports/2026-06-08-desktop-review-issue-log-and-protocol.md`.
**Why the old Loop-1 docs are NOT trusted:** the by-problem-type attempt failed an adversarial council (`.claude/reports/2026-06-08-loop1-adversarial-council-verdict.md`, NO-GO). Confirmed seeds salvageable from it: RC-8 (selector-ancestor bug), RC-2 DB-fact (no `*Desktop` slots), RC-6, RC-9. Everything else must be re-derived by-section. Do NOT reuse the Loop-1 root causes as fact.

**To resume after compaction:** read this ledger + the WAVE contract above + the section docs already done, then continue Wave 1 at the NEXT section. Dispatch a fact-finder (Sonnet) with the 6-field contract; QC its citations against the real files; present for Bean's approval; tick the ledger; move on. No fixes, no root cause — that's Wave 2 (after all of Wave 1 is approved).
