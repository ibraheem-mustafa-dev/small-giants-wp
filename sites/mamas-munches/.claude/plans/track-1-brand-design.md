# Mama's Munches — Track 1: Brand + Mockup Design

**Status:** Phase 1 active (2026-04-30)
**Goal:** Bean-signed-off homepage + product page mockups, ready for SGS block build once Ecom Plugin Phase 1 lands.

---

## Phase 1 — Audience + pricing research (active)

**Why first:** Brief forbids reading prior workspace memory until fresh independent research lands. Audience clarity (mums vs gifting vs B2B) reshapes homepage hierarchy and tone — cheapest insurance against mockup rework.

**Steps**
1. Run `/lead-research-assistant` covering: B2C target mum segments, lactation-supplement pricing benchmarks (UK), gifting market sizing, B2B angle (NHS, midwives, baby boxes), competitor positioning.
2. Save report to `sites/mamas-munches/research/lead-research-2026-04-30.md`.
3. After fresh research lands, cross-check against `~/.openclaw/workspace/memory/research/` (Zainab's prior business notes) — flag confirmations and contradictions.

**Done-when:** Research report saved + cross-check complete + Bean has read it.

---

## Phase 2 — Product photography pull (parallel with Phase 1)

**Why parallel:** Mechanical work, no design decisions, doesn't bias research.

**Steps**
1. Pull all product photos from `https://mamasmunches.com/` (live site → `wp-content/uploads/`) and Instagram `@mamasmunches` via Playwright.
2. Save to `sites/mamas-munches/research/photography/` organised by source (`live-site/`, `instagram/`).
3. Note resolution, format, and whether each looks AI-generated or real (Bean said it's a mix).

**Done-when:** All retrievable assets saved + inventory note (`photography/INVENTORY.md`) lists each file with source + apparent type.

---

## Phase 3 — Homepage + product page mockup (next session)

**Inputs:** Phase 1 research + Phase 2 photography + brand brief in `CLAUDE.md`.

**Steps**
1. `/sgs-discover` for 3–5 reference sites in lactation / mum-care / artisan-bakery / gifting space.
2. `/ui-ux-pro-max` for palette + typography + UX rules anchored to the captured brand identity (coral pink + cream + warm yellow + Inter/warm-display).
3. Mockup homepage at 375 / 768 / 1440px in `mockups/homepage/`.
4. Mockup product page (8/20/40 pack variants, allergens, ingredient education slot) in `mockups/product/`.
5. Bean review session — single sign-off touchpoint per zero-QC promise.

**Done-when:** Bean approves both mockups + design direction → Track 1 closes; Track 2 (SGS Ecom Plugin) becomes the gating critical path.

---

## Out of scope for Track 1

- Subscription UX (Phase 2 ecom feature)
- Allergen FSA-compliant labelling copy (TBC with Zainab)
- Trustpilot review-seeding flow (post-launch)
- B2B sales materials (Track 1 is consumer-facing only)