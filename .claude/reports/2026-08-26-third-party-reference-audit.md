# Third-party reference audit — 2026-08-26

**Scope:** `grep -rn -i "stripe" plugins/ theme/ --include=*.js --include=*.php --include=*.css`
(payment-integration files/context excluded per brief: `stripe-settings.php`, `stripe_payment_id`,
and the `sgs-blocks.php` lines that load/init `Stripe_Settings`).

## Count reconciliation

The raw grep (after excluding `node_modules/`, `striped`, `stripe_payment_id`, and
`stripe-settings.php`) returned **20 lines**. That total does **not** equal the number of real
third-party ("Stripe the company") references, for two reasons, both explicit below so no line is
silently dropped:

| Category | Count | Why |
|---|---|---|
| Payment-integration context (excluded per brief) | 2 | `sgs-blocks.php:235,237` — comment + `Stripe_Settings::init()` call, legitimate payments plumbing, out of scope |
| False-positive substring matches (not a "Stripe" reference at all) | 6 | `-i "stripe"` matches the substring inside unrelated words: "diagonal **stripe**s" (visual pattern, 1 line) and `$strip**E**quals`/`stripEncapsulating*`/`stripEncoding*`-shaped vendor identifiers (5 lines, all in `vendor/nikic/php-parser`, none of which is "Stripe" the company) |
| **Real third-party references — classified below** | **12** | — |

20 = 2 (payment, excluded) + 6 (false positive, noted) + 12 (classified a/b/c). Reconciled.

### False positives (excluded from bucket classification, listed for completeness)

| File:line | Text | Why excluded |
|---|---|---|
| `plugins/sgs-blocks/assets/css/fx-cursor-field.css:212` | `` `repeating-linear-gradient(115deg, …)` IS diagonal stripes. That is what `` | "stripes" = the visual line pattern, not the company Stripe |
| `plugins/sgs-blocks/vendor/nikic/php-parser/lib/PhpParser/PrettyPrinterAbstract.php:1428,1439,1446,1454,1456` | `$stripEquals = ['left' => '='];` (+4 call sites) | `stripEquals` = "strip" + "Equals" (a PHP variable name), matched only because `-i` treats `stripE` as a case-insensitive substring of "stripe" |

### Payment-integration context (excluded per brief)

| File:line | Text |
|---|---|
| `plugins/sgs-blocks/sgs-blocks.php:235` | `// Stripe payment settings and PaymentIntent AJAX handler.` |
| `plugins/sgs-blocks/sgs-blocks.php:237` | `Stripe_Settings::init();` |

## Bucket counts

| Bucket | Count |
|---|---|
| (a) MIT attribution — KEEP | 2 |
| (b) Design rationale attributed to a third party — RESTATE | 9 |
| (c) Pointer to internal study material — DELETE | 1 |
| **Total classified** | **12** |

---

## (a) MIT ATTRIBUTION — KEEP (2)

Both lines are inside `wave-gradient.js`'s "LICENCE PROVENANCE" docblock. The MIT licence on
`sa3dany/wave-gradient` requires retaining the lineage note, including the naming of the source
project's own quoted claim. **Do not delete or reword these.**

| File:line | Current text | Bucket | Notes |
|---|---|---|---|
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:59` | `* is "based on the original vertex shader used by stripe for their gradient".` | (a) KEEP | Verbatim quote from the MIT-licensed source's own shader header — required for accurate licence provenance |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:62` | `* what this block is for) and must stay; it is not a claim about stripe.com now.` | (a) KEEP | Same provenance note — clarifies the quote is historical, still part of the required attribution passage |

---

## (b) DESIGN RATIONALE attributed to a third party — RESTATE (9)

| File:line | Current text | Proposed replacement |
|---|---|---|
| `plugins/sgs-blocks/assets/css/fx-cursor-field.css:226` | `* three. This is the documented mesh-gradient technique (Stripe/Apple), not an` (continues `* invention.` on line 227) | `* three. This is a documented mesh-gradient technique, not an` `* invention.` |
| `plugins/sgs-blocks/includes/fx-wave-gradient.php:33` (block, lines 33-36) | `* THREE IS NOT ARBITRARY — it is what stripe.com ships, and the MIT reference` `* this technique is modelled on carries the same shape (a base colour plus an` `* array of wave layers, each with its own colour and noise field). The` `* shader's ` + "`" + `WAVE_LAYERS` + "`" + ` constant must match this count.` | `* THREE IS NOT ARBITRARY — it matches the layer count used by the MIT-licensed` `* reference implementation this technique is modelled on (a base colour plus an` `* array of wave layers, each with its own colour and noise field). The` `* shader's ` + "`" + `WAVE_LAYERS` + "`" + ` constant must match this count.` |
| `plugins/sgs-blocks/src/shared/effects/fx-wave-gradient.js:10` (block, lines 10-11) | ` * Bean's ruling (2026-08-25): model stripe.com, which animates autonomously` ` * rather than following a pointer. That choice fixes the mobile problem — a` | ` * Bean's ruling (2026-08-25): animate autonomously rather than following a` ` * pointer. That choice fixes the mobile problem — a` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:8-9` | `* ⛔ THIS IS NOT STRIPE'S CURRENT TECHNIQUE. Corrected 2026-08-25 — an earlier` `* version of this docblock said "this is the stripe.com landing-page technique",` `* which is false and was actively misleading.` | `* ⛔ THIS IS NOT A MODEL OF ANY LIVE COMMERCIAL SITE'S CURRENT TECHNIQUE.` `* Corrected 2026-08-25 — an earlier version of this docblock claimed it matched` `* a specific landing-page's technique; that claim was false and actively` `* misleading.` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:12-13` | `* The noise-displaced-plane technique is stripe.com's hero from roughly 2020-21.` `* Every tutorial and port describing "the Stripe gradient" documents that` (continues `* retired version. Their CURRENT hero was recovered...`) | `* The noise-displaced-plane technique matches a well-known reference` `* implementation circulated widely from roughly 2020-21 (see the licence-` `* provenance note below). Every tutorial and port describing this technique` (continues `* documents that older version — it is not what modern production sites of` `* this kind use today...`) |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:21` | `* not read this file as a faithful model of what stripe.com does today.` | `* not read this file as a faithful model of any current commercial` `* implementation.` |
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:122` | `/** Number of colour layers blended on top of the base. Stripe ships 3. */` | `/** Number of colour layers blended on top of the base — matches the reference implementation's layer count (see licence-provenance note above). */` |

⚠ **Flag for Bean's review before applying the lines-8-21 restatement above.** Unlike the other
rows in this bucket, that passage's entire point is correcting a *specific* prior false claim about
one named company's technique ("this is not what stripe.com's CURRENT hero does"). Genericising it
to "any live commercial site" preserves the technical facts (mesh density, texture-sampled colour,
blur+grain pass) but weakens the passage as a correction — a future maintainer re-reading it won't
know which specific misattribution it was originally guarding against. The MIT-attribution block
immediately below (bucket a, kept verbatim) still carries the "stripe" name for licence-provenance
reasons, so the corrective context isn't entirely lost from the file — but this is a judgement call,
not a mechanical rename, and is flagged rather than silently applied.

---

## (c) POINTER to internal study material — DELETE (1)

| File:line | Current text | Notes |
|---|---|---|
| `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js:22` | `` * Anatomy of the real one: `.claude/reports/2026-08-25-stripe-hero-anatomy.md`. `` | Points shipped source at an internal research/study artefact path (`.claude/reports/...`). Not licence-relevant, not needed at runtime or by future maintainers of the shipped file — delete the line outright (no replacement needed; the preceding sentence in the (b) restatement above stands alone without it). |

---

## Summary

- **12 real third-party ("Stripe the company") references found in shipped, non-payment source.**
- **2** in bucket (a) — MIT attribution, kept verbatim, no action.
- **9** in bucket (b) — design rationale, restatement text proposed above (2 of the 9 lines flagged
  for Bean's judgement call on the lines-8-21 passage before applying).
- **1** in bucket (c) — internal-report pointer, propose deleting the line.
- **6** additional grep hits were false-positive substring matches (not "Stripe" the company at
  all) and **2** were legitimate payment-integration lines already out of scope — both listed above
  so the 20 raw grep hits are fully accounted for.
- **No source files were modified.** This report is read-only output; all proposed replacements
  above are for Bean/an implementer to apply as a follow-up edit.
