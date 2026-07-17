# Adversarial-council synthesis — array-lift reconciliation design

**Date:** 2026-07-02. **Artefact:** `.claude/reports/2026-07-02-array-lift-reconciliation-design.md`.
**Panel:** cynic (maintainability), spec-lawyer, ship-PM (scope), universality red-team (R-31-9), data-integrity realist, transpiler-correctness. All read Spec 31 in full + queried the live DB; deprecation objection barred.

## VERDICT: NO-GO on the design as written. GO on the de-scoped plan below.

**Grades:** Cynic **D+** · Universality **C** · Ship-PM **D+** · Correctness **C** · Spec-lawyer **D** · Data-integrity **D**.

The *diagnosis* under the design is correct and verified (the client-copy default, the trust-bar-not-wired, the §2.7/§2.9 clash). The *proposed fix* — pure slot/alias-driven array resolution replacing hardcoded selectors — is **empirically broken against the live DB** and must not be built as specified.

## Convergence map (independent flags; strongest signal first)

| # | Finding | Personas | Verdict |
|---|---------|----------|---------|
| **C1** | **Pure slot-driven resolution drops trust-bar's OWN labels** — field `label` (slot `label`) ≠ draft `.sgs-trust-bar__text` (slot `text`); the design's own worked example fails on the live DB. Plus ~40% of real fields (icon-list, pricing-table, social-icons) return no slot; same-slot collisions (`price`/`priceYearly`, `badge`/`badgeVariant`, `platform`/`url`, `ctaText`/`ctaUrl`) can't be disambiguated; `items.properties` exists in only **2 of 9** array blocks. | **ALL 6** | Keep explicit per-field `selector`+`role` as PRIMARY. Slot/alias = FALLBACK only. Do NOT rip out the working mechanism. |
| **C2** | **trust-bar was never wired** — no `array-content-lift` capability, no `array_item_fields` rows, `arrayItemSchema` null; the design's stated seed source doesn't exist. It falls to the leaf/Case-4 path → renders the client-copy default. | **ALL 6** | Grant the capability + seed the schema (the real per-block work). |
| **C3** | **Delete the client-copy `items.default` (D5) = the real unlock** — it's what faked "trust-bar works" (the default rendered, nothing was lifted). Highest value, lowest risk. | Cynic, Ship-PM, Correctness, Spec-lawyer | Do this first. |
| **C4** | **Design fixes only 1 of 3 targets.** ingredient info-boxes = InnerBlocks child-emit (render.php IGNORES scalar attrs → any scalar lift renders BLANK — the D212 trap); product-card pills = scalar/Mixed. Both need `scalar-content-lift` + B3, untouched by D1–D5. | Ship-PM, Correctness | Ingredients must go pure child-block (B3), not array/scalar. |
| **C5** | **Icon handling is broken.** The star badge inverts to a checkmark (icon-slug handler discards the raw SVG → render falls back to lucide `check`); the emoji has NO handler at all. | Correctness, Cynic | Real, universal converter fixes (preserve raw_svg→iconSvg; add emoji-glyph handler). |
| **C6** | **FR-31-2.5 / `array_item_slot_for` already exists, is dead code, and CONTRADICTS D1** — trust-bar `items.canonical_slot='items'` → its Tier-A rule says each item becomes a child block, the opposite of D1's scalar-array collapse. The design never referenced it. | Spec-lawyer, Data-integrity | Reconcile before adding a third array mechanism. |
| **C7** | **The slot→role map + slots.aliases is a drift-prone second source of truth with STOP-24 holes** — no DB home for slot→role (a code dict = R-31-1 violation), `roles` table already missing 5 of 7 production roles, `circle` alias not reseed-surviving (only a standalone unwired script writes `slots.aliases`), aliases already mis-resolve (`badge-number`→wrong slot). | Cynic, Universality, Data-integrity | Any DB change must be migration-based + reseed-reproducible; add an alias-uniqueness gate. |
| **C8** | **`has_inner_blocks` is per-BLOCK but arrays are per-ATTR** — hero/cta-section/quote are InnerBlocks blocks that ALSO carry array attrs (the "Mixed" case); D1's binary fork is false. String-arrays (`quote.body`) must be excluded from grid collapse. | Universality | Restate D1 per-attr. |
| **C9** | **"Uniform" is misused** — §2.5's "uniform" = CSS-value equality; the items collapse needs "same child-SHAPE" (badges have different text/icon). | Correctness, Spec-lawyer | Rename/redefine the predicate. |
| **C10** | **3 stale in-repo `sgs-framework.db` copies** throw "no such table" — a live hazard for anyone querying the wrong DB. | Data-integrity | Delete/gitignore + assert canonical path. |

## The corrected, de-scoped plan (what the panel converges on)

**DEFER** the universal slot/alias-driven array-resolver rebuild — it's multi-day, would regress the 8 working array blocks, creates a second source of truth, and needs the roles-table/slot→role-table/alias-gate/DB-cleanup groundwork first. Legitimate future architecture pass, NOT this arc.

**SHIP now, via the EXISTING mechanism + targeted converter fixes:**
- **trust-bar:** (1) delete the client-copy `items.default` → generic placeholders; (2) grant `array-content-lift` + seed the schema (block's own canonical BEM); (3) fix grid-driven item detection so it finds the 4 `__badge` (current selector misses them); (4) fix the icon-slug handler to preserve the raw SVG (star ≠ checkmark). Keep explicit selector+role.
- **ingredients (info-box):** route via **B3 child-blocks** (`__icon`→`sgs/icon`, `<h4>`→heading, `<p>`→`sgs/text`); add the emoji-glyph handler to the shared icon library.
- **product-card:** `scalar-content-lift` + B3, separate ticket.

## The one decision for Bean (the recurring crux)

The Mama's draft trust-bar uses `.sgs-trust-bar__text` / `__icon`; the block renders `.sgs-trust-bar__label` / `__circle`. Reconcile by: (A) **conform the draft** to the block's canonical BEM (SGS-BEM-correct per Spec 00 §3.1; no aliases, no drift; edits the mockup); (B) **seed the schema to the draft's classes** (pragmatic; block self-describes the real clone input; but diverges from the block's render BEM); (C) **alias-tolerate** the synonyms (drift-prone; not reseed-surviving today).
