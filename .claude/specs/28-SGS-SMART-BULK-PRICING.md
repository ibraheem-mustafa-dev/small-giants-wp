---
doc_type: spec
spec_id: 28
spec_version: 1
status: draft — RE-SCOPE REQUIRED (adversarial-council CONDITIONAL GO 2026-06-04; do NOT build FR-28-5 as written — see §Council outcome)
title: "SGS Smart Bulk Pricing — auto-pricing engine + comparative value ladder"
project: small-giants-wp
authors: Bean + Claude (Opus 4.8)
created: 2026-06-04
last_verified: 2026-06-04
depends_on: [27]
absorbs: []
absorbed_by: null
---

# Spec 28 — SGS Smart Bulk Pricing

> ## ⚠ Council outcome (2026-06-04) — read before building
> A 6-persona `/adversarial-council` returned **CONDITIONAL GO**. The architecture (generate-to-WC, never render-override; integer-pence; legal framing) is sound, but the spec as written is **not buildable** — it points at a stall trap and lacks the safety machinery for software that rewrites live prices. **Build per the re-scoped 4-phase order in §"Build order (v2, post-council)" — NOT the original FR order.** The convergent must-fixes + the corrected (self-consistent) maths are in §"Council must-fix register". The FR bodies below are the v1 source; where they conflict with the council sections, the council sections win until a v2 FR rewrite lands.
>
> **The one-line takeaway:** ship the **value-ladder display (P1)** now — it needs no engine and rides on the already-shipped B3. Build the engine as a **preview-only** tool (P2/P3). **Fence the actual write-to-WooCommerce (P4) behind Spec 27 Cluster C / Phase R** — do not pull Phase R forward.

## USP / why this exists

Two halves of one feature that together turn quantity-discount pricing from a mental-energy sink into a one-number decision, and turn pack selection into a guided value ladder:

1. **Auto-pricing engine (the deal-winner).** A non-technical shop owner enters ONE number — the price of a single item (even if a single is never sold) — picks a discount strength, and the engine generates every pack price using a psychologically- and legally-grounded model. No spreadsheet, no guessing, no "is 20% off the 24-pack too much?". Site-wide, per-category, or per-product.
2. **Comparative value ladder (the conversion lift).** The product card shows the per-unit price at EVERY pack size with the saving vs a single item, anchored on the smallest pack and framed as loss ("save 30p each vs buying singly"), so "bigger pack = cheaper per item" becomes an explicit buying cue.

This is the single hardest-to-copy commercial advantage in the shop layer: most WooCommerce shops make the owner hand-set every variation price and never surface the per-unit value ladder. Spec 28 makes both automatic.

**Research basis:** two grounded research streams (2026-06-04) — `/marketing-skills` CRO/UX audit (Top-10) + a pricing-science report (16 cited sources, UK pricing law incl. Price Marking Order 2004 amendments effective 2026-04-06, CMA DMCC Act 2024, ASA 2026). The pricing report's verdict: ONE model dominates this use case (UK small food/FMCG, a few pack sizes) — a power-law per-unit curve with one steepness dial.

## Relationship to Spec 27 (hard architectural rule)

Spec 27 principle 6: **WooCommerce is the single source of truth; SGS never mirrors commerce data.** Spec 28 honours this absolutely:

- The engine is an **AUTHORING-TIME price GENERATOR**, not a runtime display override. It computes pack prices and **writes them into the WooCommerce variation `regular_price`** (via the Cluster C authoring controller, Spec 27 R1/R2). The cart, schema, and SSR manifest then read the real WC price exactly as today. There is NO display-time price substitution and NO parallel price store.
- The **value ladder is pure DISPLAY** of the already-live WC prices: per-unit = WC display price ÷ pack size (the B3 mechanism, FR-27-B3, already shipped). Spec 28 extends B3 from "per-unit of the selected pack" to "comparative per-unit across all packs".
- Therefore Spec 28 re-opens NO two-sources-of-truth wound. The generated price is committed to WC at authoring time; everything downstream is unchanged.

## Principles

1. **One number in, all prices out.** The owner sets a single base unit price (or smallest-pack price); the engine derives the rest. The only other owner-facing dials are a 3-notch discount strength and the pack sizes offered.
2. **Generate to WooCommerce, never override at render.** (See the Spec 27 rule above.)
3. **Legally clean by construction.** Savings are always framed as the pack's per-unit price vs the CURRENT single-unit price — never a "was/now" reference price — so the CMA 30-day / 1:2-volume rules never apply. Per-unit price is always displayed (also the Price Marking Order requirement).
4. **One model, one dial.** Power-law `per_unit(n) = P × n^(−k)`; `k` is the single steepness parameter, surfaced as Gentle / Standard / Aggressive (k = 0.08 / 0.12 / 0.18). No model-selection UI — the research verdict is that the model shape is not situational, only `k` is.
5. **Integer pence internally.** All money maths in integer pence; charm-round once on the pack total; derive per-unit from the charmed total (never charm-round per-unit independently — that breaks per-unit × n = pack-total).
6. **Sensible defaults hidden, brand-safe caps enforced.** Margin floor, charm algorithm, the formula itself are not owner-facing. Hard caps: first multi-pack ≥ 8% saving (else admin warning), largest pack ≤ 40% saving (scepticism ceiling), per-unit never ≥ single price after rounding.
7. **Authoring is un-gated (Spec 27 carry-over).** Every control is a friendly editor/settings field — never raw meta.

## Functional requirements

### Engine

- **FR-28-1 — Power-law price generator.** `sgs_auto_pack_prices( int $base_pence, array $pack_sizes, float $k = 0.12, float $margin_floor = 0.40, int $cost_pence = 0 ): array`. For each pack `n`: raw = `base_pence × n^(1−k)`; enforce margin floor if cost known (`min = cost_pence × n / (1 − margin_floor)`); charm-round; derive per-unit + saving. Returns per-pack `{pack_price_pence, per_unit_pence, saving_pct, saving_pence_each, saving_display}`. Pure function, ~12 LOC, unit-tested against the worked example.
- **FR-28-2 — Charm rounding.** `sgs_charm_round( int $pence ): int` — <£5 → .49/.99; <£20 → .99; <£100 → nearest X4.95; ≥£100 → nearest 50p. Site-wide toggle to disable (B2B/wholesale + premium mode → clean £X.00/£X.50).
- **FR-28-3 — Steepness dial.** Owner picks Gentle/Standard/Aggressive → k = 0.08/0.12/0.18. Raw `k` never exposed. Premium mode caps k ≤ 0.10 + disables charm rounding.
- **FR-28-4 — Guardrails.** After generation: if smallest multi-pack saving < 8%, auto-raise k by 0.02 up to 3 iterations, else admin warning. Cap largest-pack saving at 40% (clamp k). If any per-unit ≥ single price after rounding → zero that pack's saving + admin notice. Absolute margin floor at checkout: never below `cost × n × 1.15` regardless of overrides.
- **FR-28-5 — Write to WooCommerce.** The generator output is written to each variation's `regular_price` via the Spec 27 Cluster C authoring controller (R1/R2) — `set_regular_price()` + `save()` + `wc_delete_product_transients()`. Ex-VAT internally; WC's tax layer handles inc-VAT display. Re-runs on base-price/k/pack-size change. NEVER a render-time substitution.

### Override cascade

- **FR-28-6 — Layered config (highest wins): site → category → product.** Site defaults in WooCommerce → Settings → SGS Pack Pricing (`sgs_pack_k`, `sgs_pack_margin_floor`, `sgs_pack_charm_round`, `sgs_pack_sizes`). Category override via `product_cat` term meta (`sgs_pack_k`). Product override via post meta (`_sgs_pack_k`, `_sgs_pack_sizes`) + optional per-pack manual price override that clears the auto-calc for that one pack only. `sgs_get_pack_pricing_config( int $product_id ): array` resolves the cascade.

### Value-ladder display (extends FR-27-B3)

- **FR-28-7 — Comparative per-unit ladder.** On the configurator card, render per-unit price at every pack size with the saving vs a single item. Anchor: smallest pack first; the largest (or decoy-target) row gets a visual delta + the "Best value" `sgs/label` badge (FR-27-B3). Per-unit derived live from the WC manifest (B3 mechanism) — display only, no new price store.
- **FR-28-8 — Framing modes.** A `framingMode` control (enum: savings | loss-aversion | neutral) on the display. Loss-aversion default for sub-£ items ("save Xp each vs buying singly"). Rule of 100: show % under £1/item, lead with pence ≥ £1/item. Strings auto-generated by `sgs_saving_display()`.
- **FR-28-9 — Per-unit always shown (legal).** Per-unit price is always displayed alongside the pack price (Price Marking Order). This requirement is met by FR-27-B3 already; Spec 28 makes it comparative.

### Authoring UI

- **FR-28-10 — One-number authoring.** Product editor: a "Smart pricing" panel — base single-item price (the one number) + Gentle/Standard/Aggressive radio + pack-sizes checkboxes (6/12/24/48 + custom) + optional per-pack manual override + a live preview table (generated prices + per-unit + saving) before commit. "Generate prices" writes to WC variations (FR-28-5). Friendly, no raw meta (Spec 27 un-gated rule).
- **FR-28-11 — Site + category settings.** A WooCommerce settings tab (site defaults) + a `product_cat` term field (category override). Both expose only the owner-safe controls (FR-28-6); margin floor + cost set once at site level.

### Compliance

- **FR-28-12 — UK pricing-law guardrails.** No "was/now" claims generated. Per-unit always shown. VAT: compute ex-VAT internally, display inc-VAT for B2C (Consumer Contracts Regs); site-wide "VAT registered?" toggle. DMCC/CPUT: every displayed saving must be real (per-unit < single price enforced, FR-28-4). Document the Price Marking Order 2004 (2026 amendment) + CMA position in the spec's compliance appendix.

## Phase success criteria (done when)

- [ ] Owner sets ONE base price + a strength → all pack prices generated, charm-rounded, written to WC variations; cart charges the generated WC price (single source of truth verified).
- [ ] Worked example reproduced: £1/cookie, [6,12,24,48], Standard → £4.99/£8.99/£16.99/£29.99 (17/25/29/38% per-unit saving), top pack < 40%.
- [ ] Value ladder shows comparative per-unit + loss-framed saving across packs on the card; anchored smallest-first; "Best value" badge on target pack.
- [ ] Override cascade proven: site → category → product, highest wins; per-pack manual override holds.
- [ ] Guardrails proven: <8% first-pack auto-raises k / warns; >40% clamps; per-unit-≥-single zeroes the saving.
- [ ] UK-legal: no "was" price emitted; per-unit always shown; inc-VAT display; saving strings accurate.
- [ ] Authoring is fully UI-driven (zero raw meta); a non-coder generates a full price set end-to-end.
- [ ] `sgs_auto_pack_prices` + `sgs_charm_round` unit-tested; engine logic ≤ ~100 LOC.

## Open questions / KJCs (resolve at council / build)

- **KJC-1 — base = single-item vs smallest-pack.** Owner enters a single-item notional price (cleanest for the power-law) OR the smallest-pack price (more intuitive if singles are never sold). Lean: accept EITHER via a toggle ("I'll enter: price per item / price of my smallest pack"); back-solve P from the smallest pack if the latter.
- **KJC-2 — decoy pack.** Whether to auto-apply a decoy nudge (price the 2nd-largest pack 3-5% worse to push the largest) by default, or leave it as an opt-in per-product control. Lean: opt-in (auto-decoy risks looking manipulative + complicates the clean curve).
- **KJC-3 — does the engine own the variation prices, or seed them once?** If the engine writes WC prices and the owner later hand-edits a variation in WC, re-running the engine overwrites it. Need a "manual override" flag per variation so the engine skips owner-edited prices. (Ties to FR-28-6 per-pack override + FR-28-5.)
- **KJC-4 — relationship to Spec 27 Cluster C.** FR-28-5/10 depend on the R1/R2 authoring controller. Build Spec 28 as part of Cluster C, or as a standalone that the controller calls? Lean: Spec 28 engine is standalone (pure functions + settings); the WC-write integration rides on Cluster C R1/R2.

## CRO backlog (from the 2026-06-04 audit — NOT in this spec's build scope)

Theme/block candidates to schedule separately: social-proof line on the card; configurator above-the-fold + sticky mobile CTA; "your box" live IKEA-effect summary; pack-size "how many do I need?" calculator. Marketing-ops items (abandoned-cart + post-purchase email sequences, exit-intent/post-ATC popups, referral scheme, paid-ads pixels, occasion programmatic-SEO pages) belong in **client onboarding / plugins**, not the SGS theme — captured here as a pointer, owned elsewhere.

## Compliance appendix (sources)

Price Marking Order 2004 (amended 2025, effective 2026-04-06; unit-price display) · CMA Groceries Unit Pricing analysis (Jan 2024) · DMCC Act 2024 (CMA fining powers to 10% global turnover, 2025) · ASA/CAP promotional-savings guidance (2026) · Consumer Contracts Regs 2013 (inc-VAT B2C). Pricing-science: power-law quantity discount (Monahan 1984; Chen & Krass 2001); decoy/asymmetric-dominance (Huber/Payne/Puto 1982; Ariely/Loewenstein/Prelec 2003); left-digit/charm (Thomas & Morwitz 2005; Manning & Sprott 2009; context-dependence PMC9387778 2022); Rule of 100 (Berger, Contagious 2013); loss aversion (Kahneman & Tversky 1979); mental accounting (Thaler 1985); 25-35% sweet spot (ResearchGate 2026). Full URLs in the 2026-06-04 research deliverable (session transcript).

---

## Build order (v2, post-council) — THE canonical sequence

Ship in this order, not the FR order. The cut-line de-risks the stall trap: the deal-winner UX (one number → all pack prices) is visible as a **preview** long before the deferred WC-write controller exists.

| Phase | What | FRs | Ships | Depends on |
|---|---|---|---|---|
| **28-P1 — Value ladder (MVP, the conversion lift)** | comparative per-unit across packs + loss-framing + Rule-of-100, DISPLAY ONLY on live WC prices | FR-28-7/8/9 | first | **B3 (shipped ✓)** — no engine, no WC write |
| **28-P2 — Engine pure functions + tests** | re-derived power-law + charm (see corrected maths below) + guardrail order; 100% unit-tested | FR-28-1/2/3 | standalone | nothing (pure PHP, `declare(strict_types=1)`) |
| **28-P3 — Authoring as a PREVIEW-ONLY table** | owner enters one number → sees all pack prices/per-unit/saving live; cascade + settings + guardrails; **writes NOTHING to WC** | FR-28-3/4/6/10/11 | after P1/P2 | nothing (preview only) |
| **28-P4 — Commit-to-WooCommerce (headline)** | the actual `regular_price` write + ALL safety machinery (below) | FR-28-5 (+ new FRs) | **DEFERRED** | **Spec 27 Cluster C / Phase R (R1/R2)** — do NOT pull forward |

**Sequencing lock:** Spec 28 does not start until Spec 27 Phase 2 B3 is verified live (it is — `ceb4e04a`). 28-P1 rides B3. The engine (P2/P3) is a fill-in workstream — never a reason to deprioritise remaining Spec 27 Cluster A (A4 gallery / C2 / demand analytics). Honest effort: P1 ~½ session; P2 ~½ session; P3 ~1-1.5 sessions (3 surfaces + preview UI + guardrails); P4 blocked. **"~100 LOC" applies ONLY to the P2 pure core; the feature is a 6-8 file module ≤300 LOC/file (CLAUDE.md limit).**

## Council must-fix register (fold into the v2 FR rewrite + P4)

Convergence-ordered (number of personas who independently flagged it in brackets). Convergent + fatal first.

1. **[5] Engine-vs-manual-edit overwrite — promote KJC-3 to a hard FR (FR-28-13).** Lock flag `_sgs_price_owner_locked` + store `_sgs_price_engine_value` per variation; the write path DETECTS a WC price ≠ last-engine-value and auto-locks + surfaces it; the preview shows a lock icon + "you hand-edited this — engine won't touch it" + one-click release; re-run summary "generated N, skipped M locked". (Cynic M2, Competitor MF-5, Spec-lawyer S4, Abuse S-3, Support M1.)
2. **[5+] No audit / undo — add FR-28-14.** Per-run log (timestamp + config + per-variation before→after) in a `sgs_pack_pricing_runs` option/meta; snapshot `regular_price` to `_sgs_pack_price_backup` before any write; one-click "Revert last generation". (Cynic MISS-1, Competitor MF-3, Ship-PM, Abuse GAP-2/3, Support Missing-1/4.)
3. **[3] No go-live confirm — two-step apply (into FR-28-10).** "Calculate preview" (JS only, no WC write) → explicit "Apply prices to your live shop" modal showing current→new per pack + a Cancel. The ONLY write trigger; never an auto `save_post` hook. (Competitor MF-3, Abuse M-6, Support M2.)
4. **[5] VAT breaks charm — charm-round on the inc-VAT DISPLAY price, back-solve ex-VAT `regular_price` per the variation's tax class (FR-28-2/5/12).** UK food mixes zero-rated + standard-rated; charm-rounding the ex-VAT value is invisible to the shopper. Also detect `wc_prices_include_tax()` for the INPUT basis. (Cynic M3, Competitor MF-4, Spec-lawyer M5, Abuse GAP-5, Support.)
5. **[2, FATAL] Re-derive the engine + charm; the v1 worked example is unreproducible.** Adopt the simplified, idempotent charm rule: `<£5 → nearest of {floor+.49, floor+.99}`; `<£100 → floor(£)+.99`; `≥£100 → nearest 50p`. Corrected self-consistent worked example (P=£1, k=0.12): see table below. (Spec-lawyer M1/M2/M3, Competitor.)
6. **[~5] Define guardrail evaluation order (FR-28-4).** Canonical: (1) power-law → (2) cost margin floor → (3) charm-round on inc-VAT → (4) per-unit≥single → clamp price (not just zero the label) → (5) 8% min on smallest → raise k ≤3× → (6) 40% cap on largest → reduce k. **On 5↔6 conflict, the 40% cap WINS.** If 8% unachievable at k≤0.18, ABORT the write + blocking error (never write sub-floor). (Spec-lawyer M4, Cynic S3, Abuse S-1/2/4, Support S5.)
7. **[3, FATAL] £0-price abuse gates.** `sgs_validate_base_pence` (integer, ≥ a hard 10p min, reject 0/neg/float/sci-notation); `sgs_validate_pack_sizes` (each n≥2, ≤ max 500, array len ≤10); `cost_pence=0` ⇒ "unknown" ⇒ apply a configurable min-floor, never collapse to 0; post-generation reject any pack ≤1p; `declare(strict_types=1)`. (Abuse M-1/2/3.)
8. **[1, FATAL] XSS — `esc_html()` every string input to `sgs_saving_display()` + the unit label** (`sanitize_text_field` on save, `esc_html` on output); saving strings are plain-text only; never `echo $saving_display` raw. (Abuse M-5.)
9. **[2] Re-anchor the moat (USP + Principle 1).** The engine is commodity (5 plugins do quantity discounts; the 12-line formula clones by lunch). The defensible asset is the **integrated clone→theme→WC→ladder closed loop** a standalone plugin can't touch. State table-stakes vs moat so the engine isn't over-trusted as the differentiator. Add a "Custom %" k notch (back-solve k from "savings on largest pack") as a flexibility escape hatch. (Competitor MF-1/2.)
10. **[3] Resolve KJC-1 in the spec: P = the owner-entered single-item price, stored `_sgs_base_price_pence`, labelled "your reference price for discounts".** If NO real single is sold and the owner can't honour that price, `sgs_saving_display()` SUPPRESSES the saving claim (do not invent a comparison to an unsellable reference — DMCC/CPUT exposure). Back-solve from smallest pack stores the derived P raw (unrounded). (Cynic M5, Spec-lawyer M6, Support S2.)
11. **[4] WC `sale_price` / coupon / tax-class interaction (FR-28-5/7).** On write, if active `sale_price` ≥ new `regular_price` → clear/flag + warn. Ladder reads the ACTIVE price (matches WC) but shows "savings calculated vs sale price" when a sale is live. Coupons stack below the engine; the 40% ceiling is pre-coupon. Multi-currency = explicit non-goal that DISABLES the engine. (Cynic M3, Competitor, Abuse S-5, Support M5.)
12. **[3] Performance — explicit-trigger-only + batch.** Site/category change does NOT auto-reprice the catalogue; applied on the NEXT per-product "Generate" (or a rate-limited background WP-Cron batch). Store a hash of `(base,k,packs)` and skip if unchanged. Capability gate on category `sgs_pack_k` term meta = `manage_woocommerce` (not `edit_product_terms`) + nonce + audit. (Competitor, Abuse M-4/M-6/S-6, Support Missing-5.)
13. **[3] Missing-variation path (FR-28-5/10).** "Generate" either CREATES missing variations for ticked pack sizes (via Cluster C R2) or validates they exist + blocks with a clear message. Define. (Competitor SF-4, Spec-lawyer X4, Support Missing-2.)
14. **[2] Owner legal-disclosure panel + monotonicity guard.** A dismissible in-editor notice ("you are responsible that your single-item price is a genuine selling price; don't use this if you never sell singles"). Per-unit must strictly DECREASE as pack size increases post-rounding (else the ladder/badge lies — CPUT). (Support M4, Cynic S4, Support S3.)
15. **[2] Error-states FR + monetary success criteria.** Enumerate every failure (empty base, <2 packs, no variation, floor-impossible, WC write fail, no tax class) with plain-English inline messages; add a round-trip integration fixture (generate→write→read-back→cart-charges-it across a tax-class + sale boundary) as an acceptance artefact; inline the magic-number derivations (k values, 8%/40% caps) into the spec, not the transcript. (Support M3/Missing, Cynic MISS-3/4, Ship-PM.)

## Corrected worked example (must-fix #5) — P = £1.00/item, packs [6,12,24,48], k = 0.12 (Standard)

`raw_pack = base_pence × n^(1−k)` → charm (simplified idempotent rule) → per-unit derived from the charmed total:

| Pack | raw n^0.88 | raw £ | charmed | per-unit | saving vs £1 |
|---|---|---|---|---|---|
| 6 | 4.83 | £4.83 | **£4.99** | 83p | 17% |
| 12 | 8.89 | £8.89 | **£8.99** | 75p | 25% |
| 24 | 16.36 | £16.36 | **£16.99** | 71p | 29% |
| 48 | 30.16 | £30.16 | **£30.99** | 65p | 35% |

(v1 asserted £29.99/38% for the 48-pack; that was unreproducible from any stated band. £30.99/35% is what `<£100 → floor(£)+.99` actually yields, is idempotent on re-run, and keeps the top pack under the 40% scepticism ceiling.) **This table is the canonical P2 unit-test fixture.**
