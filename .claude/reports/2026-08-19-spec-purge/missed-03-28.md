# Specs 03 + 28 — audited by the dispatcher

These two specs were omitted from the Phase-1 branch allocation (a completeness error in the
dispatch plan itself, caught by `coverage-check.py` reporting them as "not registered yet").
Audited directly rather than dispatched — 13 vocabulary hits between them.

# Spec 03 — 03-SGS-BOOKING.md

### 03-SGS-BOOKING.md:111
RULE: EXCLUDE
BEFORE: "- **UK English** in all user-facing text, code comments, and variable names (organisation, colour, cancelled)."
AFTER: N/A
NOTE:   "cancelled" is a UK-spelling EXAMPLE inside a live naming rule, not a status marker.

### 03-SGS-BOOKING.md:260
RULE: EXCLUDE
BEFORE: "| Availability slots | **Never cached** | N/A | Real-time data — stale cache = double bookings |"
AFTER: N/A
NOTE:   "stale" is live technical vocabulary describing a caching hazard. Live rule, no dead text.

### 03-SGS-BOOKING.md:275
RULE: EXCLUDE
BEFORE: "Must start with `https://` (HTTP rejected with error notice)"
AFTER: N/A
NOTE:   "rejected" describes runtime validation behaviour, not a rejected design option.

### 03-SGS-BOOKING.md:680
RULE: EXCLUDE
BEFORE: "Webhook receiver: booking system notifies WP on booking create/cancel (for cache invalidation or WP-side actions)"
AFTER: N/A
NOTE:   Domain vocabulary — cancelling a booking. Live rule.

### 03-SGS-BOOKING.md:686
RULE: EXCLUDE
BEFORE: "All notifications (email, SMS, WhatsApp) are triggered by the booking system when bookings are created, cancelled, or when reminders are due."
AFTER: N/A
NOTE:   Domain vocabulary. Live rule.

## Counts
IN SCOPE: 0   (CUT: 0, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  5

# Spec 28 — 28-SGS-SMART-BULK-PRICING.md

### 28-SGS-SMART-BULK-PRICING.md:145-166
RULE: K5
BEFORE: "## Council must-fix register (PROVENANCE — all folded into v2 FRs above)  /  > **Status: all 15 folded into the v2 FRs.** This register is retained for provenance only. Resolution map: #1→FR-28-13 · #2→FR-28-14 · #3→FR-28-10 (two-step apply) · … [followed by all 15 items retained at full length, lines 149-166]"
AFTER: "## Council must-fix register — CLOSED\n\nAll 15 must-fix items from the v1 `/adversarial-council` are folded into the v2 FRs. Resolution map: #1→FR-28-13 · #2→FR-28-14 · #3→FR-28-10 · #4→FR-28-2/5/12 · #5→FR-28-1/2 (+ the worked example below) · #6→FR-28-4 · #7→FR-28-3 · #8→FR-28-6 · #9→USP/Principle 1 · #10→FR-28-8 · #11→FR-28-5/7 · #12→FR-28-9 · #13→FR-28-5/10 · #14→FR-28-11 · #15→FR-28-12.\n\nTwo rationales that live ONLY here and are not restated in any FR, so they survive the collapse:\n- **The moat is not the engine (item 9).** The formula is commodity — five plugins already do quantity discounts and the 12-line formula clones by lunch. The defensible asset is the surrounding system, not the maths.\n- **P is the owner-entered single-item price (item 10)**, stored `_sgs_base_price_pence`, labelled to the client as \"your reference price for discounts\"."
NOTE:   ⚠ TWO CAUTIONS FOR THE APPLIER. (1) The resolution map above must be copied VERBATIM from line 147 — the FR targets in this AFTER text beyond #5 are reconstructed and MUST be verified against the real line before applying. (2) Line 167's heading reads "## Corrected worked example (must-fix #5)" and cites the item numbering, so the numbered map must stay findable or that heading needs updating in the same edit — deleting the register outright leaves a dangling citation.

### 28-SGS-SMART-BULK-PRICING.md:19
RULE: EXCLUDE
BEFORE: "A 6-persona `/adversarial-council` returned **CONDITIONAL GO** on v1. The architecture (generate-to-WC, never render-override; integer-pence; legal framing) was sound, but v1 lacked the safety machinery…"
AFTER: N/A
NOTE:   Correctly-stated provenance: says what happened and what was sound, drags no dead v1 text with it.

### 28-SGS-SMART-BULK-PRICING.md:61
RULE: EXCLUDE
BEFORE: "**FR-28-1 — Power-law price generator.** `sgs_auto_pack_prices( int $base_pence, array $pack_sizes, float $k = 0.12, … )`"
AFTER: N/A
NOTE:   Live FR signature. Vocabulary match is incidental.

### 28-SGS-SMART-BULK-PRICING.md:102
RULE: EXCLUDE
BEFORE: "- [ ] Corrected worked example reproduced: £1/item, [6,12,24,48], Standard → **£4.99 / £8.99 / £16.99 / £30.99**…"
AFTER: N/A
NOTE:   Live acceptance criterion. "Corrected" names the CURRENT example, not a stale one.

### 28-SGS-SMART-BULK-PRICING.md:128
RULE: EXCLUDE
BEFORE: "Price Marking Order 2004 (amended 2025, effective 2026-04-06; unit-price display) · CMA Groceries Unit Pricing analysis…"
AFTER: N/A
NOTE:   External legal citation — explicit EXCLUDE per contract.

### 28-SGS-SMART-BULK-PRICING.md:139
RULE: EXCLUDE
BEFORE: "**28-P2 — Engine pure functions + tests — SHIPPED 2026-06-09 (`bf769cee`, D198)** | re-derived power-law + charm (see corrected maths below)…"
AFTER: N/A
NOTE:   Live status row pointing forward to the current maths. No dead text retained.

### 28-SGS-SMART-BULK-PRICING.md:155
RULE: EXCLUDE
BEFORE: "5. **[2, FATAL] Re-derive the engine + charm; the v1 worked example is unreproducible.**…"
AFTER: N/A
NOTE:   Subsumed by the K5 row at 145-166 — listed separately so the Phase-3 gate maps this line rather than reporting it as an unexplained survivor.

### 28-SGS-SMART-BULK-PRICING.md:167
RULE: EXCLUDE
BEFORE: "## Corrected worked example (must-fix #5) — P = £1.00/item, packs [6,12,24,48], k = 0.12 (Standard)"
AFTER: N/A
NOTE:   Live section — this IS the current worked example. Flagged in the K5 row as a citation dependency, not rot in itself.

## Counts
IN SCOPE: 1   (CUT: 0, CONDENSE: 1)
ESCALATE: 0
EXCLUDE:  7

# Spec 26 — 26-SGS-GLOBAL-STYLES-AND-THEMING.md (dispatcher tail-sweep)

Six hits left unregistered by the light branch, closed here. All six are EXCLUDE: Spec 26's
"supersedes" language forward-declares what THIS spec replaces elsewhere. That is roster
function — the same category as README's index rows — not retained dead text.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:42
RULE: EXCLUDE
BEFORE: "## Corrected mental model (the foundation)"
AFTER: N/A
NOTE:   Live section heading. "Corrected" names the CURRENT model; no superseded model retained beneath it.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:81
RULE: EXCLUDE
BEFORE: "**FR-26-A2 — Scoped variations (privacy-leak fix, supersedes Decision 18).** Reinstate WP style variations, but deploy ONLY the relevant client's variation file…"
AFTER: N/A
NOTE:   Live FR. Forward-declares what it supersedes; drags no dead Decision-18 text with it.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:82
RULE: EXCLUDE
BEFORE: "*Done when:* a client site's editor shows only that client's variation … `decisions.md` carries the Decision-18 superseding note."
AFTER: N/A
NOTE:   Live acceptance criterion naming an action still owed.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:255
RULE: EXCLUDE
BEFORE: "## Supersedes / cross-references"
AFTER: N/A
NOTE:   Live section heading — this section's JOB is to declare supersession.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:257
RULE: EXCLUDE
BEFORE: "**Supersedes** Spec 01 §\"Per-site theme.json Model\" D156 \"Live-style precedence\" wording (the \"override precedence\" framing). Update Spec 01 to reference this spec when shipped."
AFTER: N/A
NOTE:   Live cross-reference carrying an open action. ⚠ Pairs with the Spec 01:598 CONDENSE row in `02-01-11.md` — the applier should confirm the two edits stay consistent.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:258
RULE: EXCLUDE
BEFORE: "**Decision 18** (variation retirement) gets a superseding note (FR-26-A2): it over-corrected a deploy-scoping bug."
AFTER: N/A
NOTE:   Live statement of what is owed to decisions.md. No dead text.

## Counts
IN SCOPE: 0   (CUT: 0, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  6
