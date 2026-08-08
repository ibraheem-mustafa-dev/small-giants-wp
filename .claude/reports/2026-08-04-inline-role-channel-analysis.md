# Inline `"role"` channel in `block.json` — coverage, the 18 nulls, sub-type derivability, and a seeder recommendation

**doc_type:** report
**Date:** 2026-08-04
**Scope:** investigation only, no code/DB writes
**DB state:** freshly reseeded (per session context); all counts below queried read-only via `sgs-db.py sql`

## Zero-th finding: this question is already answered architecturally — I am extending, not discovering

Before doing any independent analysis I found a pre-existing tool that already measures exactly
this gap: `plugins/sgs-blocks/scripts/audit-declared-vs-seeded-roles.py`, backed by
`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:590-591` (FR-31-2.1a) and two OPEN parking entries
(`P-FR-31-2.1A-CLOSURE`, `P-WP7-PLATFORM-ALIGNMENT` item 1). Running it against the freshly
reseeded DB:

```
declared-role attrs: 99
  AGREE (decl==db)         : 8
  NULL in db (would seed)  : 18
  BENIGN conflict (safe)   : 41
  DANGER conflict (BREAKS) : 8
```

(8+18+41+8 = 75; the remaining 24 are the `behaviour` rows — see "a gap in the existing gate" below.)

**The headline fact this tool already establishes (two independent sources: the commit that
introduced the key, and Spec 31 §13.3):** the inline `block.json` `"role"` key is **not an SGS
role-vocabulary channel**. It is **WordPress 7.0's own `contentOnly` pattern-editability
attribute property** — an attribute without `"role":"content"` becomes non-editable when a block
sits inside a WP-7.0 `templateLock:'contentOnly'` pattern. It happens to collide on the key name
`role` with the SGS `block_attributes.role` DB column (an unrelated, SGS-authored semantic
classification used for CSS/content routing). Everything downstream in this report follows from
that fact.

## Q4 answered first, because it reframes Q1-Q3 (intent + history)

**Evidence source 1 — the introducing commit.** `git log -S'"role": "content"' -- plugins/sgs-blocks/src/blocks/` finds `d307c8b0` ("feat(phase-6): markup examples + supports backfill + WP 7.0 audit — Decisions 9/10/23/25/28", 2026-05-21) as the earliest. Its own message, Step 6.3:

> `role:content: added to 87 attrs across 40 block.json files (metadata only, zero rendering change...)` — filed under "WP 7.0 alignment (Decision 23)".

That is a WP-platform-compatibility commit, not a converter-data-model commit. 87 grew to 99 over subsequent sessions (form blocks, hero, media, testimonial, etc. added later — confirmed by `git log --oneline -S'"role": "content"' -- .../button/block.json` showing only that one origin commit for button, and later per-block commits for others not investigated individually; not load-bearing to the conclusion).

**Evidence source 2 — the project's own architectural record.** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:590` (FR-31-2.1a, added 2026-07-02/D258, updated 2026-07-16 qc-council) states verbatim: *"the block.json `"role": "content"` key is WP 7.0's `contentOnly` PATTERN-EDITABILITY marker (WP core's own attribute property...), NOT the converter's role vocabulary."* Parking `P-WP7-PLATFORM-ALIGNMENT` item 1 (`.claude/parking.md:1090`) independently confirms the same origin: *"audit every block.json's content-bearing attrs for `role:content` (WP 7.0 makes contentOnly the pattern default; missing it silently locks client editing)."*

**Is it `supports.sgs.attrRoles`, the spec's prescribed channel, under a different shape?** No — they are deliberately kept separate. Spec 31 explicitly instructs that the FR-31-2.1a closure must **add a new, SGS-owned channel** (`supports.sgs.attrRoles`) rather than repurpose or rename WP core's `role` key, precisely because WP core owns that key's semantics and a naive rename/reinterpretation would break client pattern-editing. `supports.sgs.attrRoles` is currently undeclared on all 84 blocks (matches the premise) because the closure is sequenced and not yet executed (`P-FR-31-2.1A-CLOSURE`, OPEN since 2026-07-16) — it is a **predecessor gap**, not evidence the inline `role` key is that channel.

**Why the seeder ignores the key today.** `assign-canonical.py::detect_role_from_block_json` derives role from an attr-NAME regex (`_ATTR_NAME_RULES`) instead of reading the declaration — the exact behaviour FR-31-2.1a forbids, but documented as *currently inert* because the name-regex happens to produce correct results on the 8 (previously 9) DANGER attrs. A naive "read the declaration first" fix was explicitly trialled and rejected (D258) because it would regress those attrs to the generic `content` value.

## Q1 — Coverage: is the ~2,008 "unmarked" figure the right denominator?

**No — it double-counts a population that structurally cannot carry the marker.** `block_attributes` has 2,970 rows total, but 863 of the css-property-less rows belong to `core/*` blocks (WordPress core blocks — paragraph, button, etc.), which are never touched by `plugins/sgs-blocks/src/blocks/*/block.json` and can never carry this SGS-repo-authored key. 2,107 − 99 = 2,008 is the number quoted in the brief; that arithmetic is correct but the **2,107 population it starts from is core+sgs combined**.

**Corrected eligible denominator: `sgs/*` blocks only, css-property-less, `attr_type='string'`** (the marker only ever appears on `type:"string"` attrs — confirmed: 0 of the 99 marked attrs are boolean/number/array/object) **= 921 attributes.** 99 of those carry the marker, leaving **822 unmarked-eligible string attributes**, not ~2,008.

**Miss-rate, measured by full manual review (not a subsample) of the 306 attributes in that 822 that ALSO carry no DB-derived role** (i.e., attributes where both signals — the WP-core marker and the independent DB role-inference — are silent, the population most at risk of being genuinely missed):

I read the full 306-row list (`block_slug`/`attr_name`/`default_value`/`enum_values`) and classified each by what render.php does with it (spot-checked a sample against source, cited below). Two categories are clear content misses:

1. **Visible label/message text that should be `text-content`** (26 instances): `sgs/whatsapp-cta.message`, `sgs/form.submitLabel`, `sgs/buybox.addToCartLabel`/`notifyMeLabel`/`soldOutLabel`/`unavailableLabel` (4), `sgs/cart.checkoutLabel`/`emptyCartCtaLabel`/`emptyCartMessage`/`panelHeading`/`viewCartLabel`/`ariaLabel` (6), `sgs/breadcrumbs.homeLabel`, `sgs/card-grid.emptyMessage`/`productEmptyMessage` (2), `sgs/content-collection.emptyMessage`, `sgs/pricing-table.billingToggleMonthlyLabel`/`billingToggleYearlyLabel` (2), `sgs/countdown-timer.expiredMessage`, `sgs/trustpilot-reviews.trustScoreLabel`, `sgs/product-search.buttonLabel`, `sgs/mega-panel.brandsEyebrow`, `sgs/icon.ariaLabel`, `sgs/button.ariaLabel`.
   - Verified for two: `sgs/form/render.php:337` echoes `submitLabel` via `esc_html()` inside the visible submit `<button>`; `sgs/buybox/render.php:623` echoes `addToCartLabel` via `esc_html()` inside `<span class="buybox__cart-label">`. Both are plainly user-facing content, both unmarked, both role-NULL in the DB.
2. **`svgContent`/`bgSvgContent` family — raw inline-SVG markup passed through `wp_kses`** (5 instances beyond the 2 already covered under Q2): `sgs/container`, `sgs/cta-section`, `sgs/hero`, `sgs/media`, `sgs/trust-bar` all declare `bgSvgContent`/`svgContent` and all render it as sanitised markup via the shared `SGS_Container_Wrapper` (`includes/class-sgs-container-wrapper.php`) or block-private code — confirmed by `grep -rln bgSvgContent includes/ src/` returning all five. None carry the WP-core marker; none carry a DB role.

**Miss-rate quantification (state the denominator each time — per the rule):**
- Against the "both signals silent" bucket (306 attrs): **31 clear misses / 306 = ~10%.**
- Against the full corrected-eligible population (822 unmarked string attrs): **31 / 822 = ~3.8%.**

This is a real, non-trivial gap, and it is not new information to the project — it is the exact backlog `P-WP7-PLATFORM-ALIGNMENT` item 1 already names as OPEN ("audit every block.json's content-bearing attrs for `role:content`"). My contribution is quantifying it (~3.8-10% depending on denominator) rather than leaving it as an unscoped audit item.

**The rest of the 822 (≈ 791 attrs) are genuinely not content** — enum/behaviour selectors with populated `enum_values` (`audioPreload`, `orientation`, `tagName`, `pagination`, `contrastSafe`, `headingRole` itself, etc.), responsive layout tokens (`gapMobile`/`gridTemplateColumnsMobile` family), form-logic plumbing (`conditionalField`/`conditionalOperator`/`conditionalValue`/`fieldName`), and technical HTML attrs (`anchor`, `className`, `rel`, `linkRel`). I did not find evidence these are misses.

## Q2 — The 18 NULLs, resolved with render.php evidence

| Block | Attr | Evidence (`file:line`) | Correct role |
|---|---|---|---|
| `sgs/before-after` | `beforeImageAlt`, `afterImageAlt` | `media-render.php:70` — fed straight into `wp_get_attachment_image()`'s `alt` arg / `<img alt>` | `image-alt` |
| `sgs/before-after` | `beforeVideoAlt`, `afterVideoAlt` | `media-render.php:138` — same pattern for the video element | `image-alt` (or a dedicated `media-alt` if the taxonomy wants video distinguished — functionally identical usage) |
| `sgs/before-after` | `beforeLabel`, `afterLabel` | `render.php:58-59` — assigned to `$before_label`/`$after_label`, echoed as the visible comparison-slider labels | `text-content` |
| `sgs/before-after` | `beforeSvgContent`, `afterSvgContent` | `media-render.php:212-230` — sanitised via `wp_kses( $svg_content, sgs_svg_kses_allowed_tags() )`, output as raw markup | `content` (matches the DB's existing bucket for the sibling `*ImageUrl`/`*VideoUrl` attrs on the same block — see Q3 for why that bucket, not `image-object`) |
| `sgs/counter` | `prefix`, `suffix` | `render.php:360,381` — concatenated directly into the visible `$full_text` string and echoed via `esc_html()` | `text-content` |
| `sgs/form` | `successMessage` | `render.php:55,348` — default visible text, wired to `data-wp-text="context.successMessage"` (Interactivity API text binding) | `text-content` |
| `sgs/heading` | `headingRole` | `render.php:87`, `edit.js:283-285` — an enum control (`heading`/`subheading`) selecting semantic tag, **not content at all** | **not content** — the inline WP-core marker itself looks mis-applied here (see note below) |
| `sgs/product-faq-item` | `question` | `render.php:158` — echoed inside `<span class="sgs-product-faq-item__question-text">` via `wp_kses_post()` | `text-content` |
| `sgs/responsive-logo` | `alt` | `render.php:352,357,377,381,...` — used as `<img alt="...">` across every render branch | `image-alt` |
| `sgs/team-member` | `bio` | `render.php:279,297` — echoed inside `<p class="sgs-team-member__bio">` and an `aria-label` | `text-content` |
| `sgs/testimonial` | `orgName`, `reviewerRole` | `render.php:578-582` — echoed inside `<span class="sgs-testimonial__role/__org">` via `esc_html()` | `text-content` |
| `sgs/testimonial` | `summaryPhrase` | `render.php:563-564,598` — echoed inside `<p class="sgs-testimonial__summary">` and used as the quote-plain fallback | `text-content` |

**16 of 18 are clean wins for `text-content` or `image-alt`** — high-confidence, each backed by a direct render.php citation. **`heading.headingRole` is the one genuine anomaly**: it is not a content attribute at all (it is a semantic-tag selector), yet it carries `"role":"content"` inline. Given the WP-core semantics (content-lock editability), this may be intentional — WP 7.0 could plausibly still want the tag-role picker exposed inside a content-locked pattern — but it is NOT evidence for an SGS content role and should not be treated as one if the inline channel is ever read for that purpose.

## Q3 — Is the marker sufficient alone? Sub-type derivability, ranked, with measured accuracy

Using the 81 attributes that have both a WP-core marker and a non-NULL DB role as ground truth (the `audit-declared-vs-seeded-roles.py` AGREE+BENIGN+DANGER buckets = 8+41+8 = 57, plus the 24 `behaviour` rows the script doesn't bucket = 81 total):

| Candidate signal | Coverage of the 81 | Measured accuracy | Verdict |
|---|---|---|---|
| The WP-core marker value itself | 100% | 0% discriminating (always `"content"`, one bit) | Cannot derive sub-type — confirmed, matches premise |
| Attribute `type` | 100% (all 81 are `string`) | 0% discriminating | Useless alone — every candidate is a string |
| Name-suffix heuristic (`*Alt`→`image-alt`, `*Label`/`*Message`/`*Heading`/`*Text`→`text-content`, `*Url` containing "link"→`link-href`, `*Url` containing "image"→`image-object`, bare `*Url`→`content`) | ~95% of the 81 | **Fails on 4 of 81 (~95% pass, 5% fail) — but the 4 failures are exactly the DANGER-adjacent cases, not noise** | Best available signal, but not 100% deterministic — see inconsistency below |
| `render.php` usage (what element/attr the value feeds — `<img alt>`, `href`, raw `esc_html()` echo, `wp_kses()` markup passthrough) | 100%, but requires per-block code reading, not a static/DB-only signal | 100% on the sample checked (used to resolve all 18 NULLs above) | Most reliable, but **not derivable "deterministically from facts already present"** in the DB — it requires reading source, i.e. it is exactly the kind of code-grounded declaration FR-31-2.1a already mandates, not a free inference |

**The concrete proof the name-suffix heuristic is not fully deterministic:** `sgs/before-after.beforeImageUrl`/`afterImageUrl` are functionally *identical* to `sgs/media.imageUrl` and `sgs/decorative-image.imageUrl` — all four feed `wp_get_attachment_image()` / an `<img src>`, all four are paired with a sibling `*Alt` attribute (confirmed: `before-after/media-render.php:69` vs `media/render.php` `imageUrl` usage). Yet the DB classifies `before-after`'s pair as `content` while `media`'s and `decorative-image`'s pair are `image-object`. **This is drift inside the DB's own "ground truth," not just a gap in the inline marker.** A name-suffix rule trained on `media`/`decorative-image` would misclassify `before-after` — 2 of the 81 ground-truth rows contradict each other on identical semantics. Any deterministic-signal ranking must be read against this caveat: the ground truth itself is not fully self-consistent.

**Conclusion on Q3:** sub-type is **not cleanly derivable from facts already present in `block.json`/DB alone** to full reliability. It needs either (a) a genuine per-attribute declaration (Spec 31's prescribed `supports.sgs.attrRoles`), or (b) a render.php-usage-scanning heuristic that is itself non-trivial to build and would need to resolve the `before-after` vs `media` inconsistency as a prerequisite (otherwise it launders the existing inconsistency into "confirmed" data).

## A gap in the existing gate worth flagging

`audit-declared-vs-seeded-roles.py`'s four buckets (AGREE/NULL/BENIGN/DANGER) only account for 75 of the 99 marked attributes; the 24 `behaviour`-role rows (all `helpText`/`placeholder` on form-field blocks) fall through all four bucket conditions silently — the script's `--check` flag cannot fail on a mismatch in that 24-row zone because nothing classifies them. Manually verified: `sgs/form-field-address/render.php` for `helpText` does render it as visible assistive text under the field (form-field render.php files render these via a shared `form-field-render-helpers.php` include — I confirmed the DB role `behaviour` and the marker `content` do not conflict destructively there, since neither is currently read by the converter's `link-href`/`image-object` identity-resolution paths that DANGER protects), so this is not a live bug — but the script's own coverage claim ("buckets every attr carrying a WP-core role") is inaccurate by 24 rows and should be corrected if anyone relies on its printed counts as exhaustive.

## Q5 — Recommendation

**Should the seeder read this key?** **No, not for SGS role derivation — and Spec 31 already reached this conclusion (FR-31-2.1a, D258) with a sequenced closure plan that this investigation independently corroborates rather than overturns.**

Reasoning, restated in the terms this brief asked for:
- The key's value space is one bit (`"content"`, always). It cannot carry the SGS sub-type vocabulary (`text-content`/`link-href`/`image-object`/`image-alt`/...) — confirmed by 0% discrimination in the table above.
- Reading it as if it were the SGS channel is actively dangerous for 8 attributes today (the DANGER bucket) — it would silently demote `sgs/button.url` from `link-href` to `content`, and the converter's identity resolution (which branches on exact role value) would treat the button's href as generic text, per Spec 31 §13.3's own worked example.
- The correct fix is the one already parked and spec'd: add `supports.sgs.attrRoles` as a new, SGS-owned channel (parallel in shape to the array-item `items.properties.<field>.role` channel that already ships for the 5 array blocks per D258), seed it column-first with a name-regex fallback only where the channel is absent, and only delete the fallback once an audit proves 100% parity. This is `P-FR-31-2.1A-CLOSURE`, still OPEN.
- Two things this investigation adds to that plan rather than just re-stating it: (1) the coverage gap on the *other* channel — WP-core's own `contentOnly` marker — is real and measurable (~3.8-10% of eligible string attrs missing it, concrete list above), and is a **separate, legitimate small fix** (`P-WP7-PLATFORM-ALIGNMENT` item 1) that should not be conflated with the SGS role-channel work even though both keys are named `role`; (2) the `before-after`/`media` inconsistency means the DB's existing `role` column cannot be blindly trusted as ground truth when building or validating any future derivation heuristic — it should be reconciled (both fields should presumably be the same sub-type) as a prerequisite, not discovered later as a false training signal.

**Failure mode of this recommendation:** if the two "role" concepts are conflated by a future session skimming this report out of context (e.g. someone reads "read the key" without reading "not for SGS role derivation"), the danger is exactly the DANGER bucket above — silent identity-resolution corruption on 8 currently-correct attributes, discoverable only via the converter test suite or a live-DOM diff, not via any static check, unless `audit-declared-vs-seeded-roles.py --check` is wired into prebuild (it currently is not — the docstring says "not yet wired"). Wiring that gate is the cheap, cause-agnostic mitigation regardless of when the `supports.sgs.attrRoles` closure actually happens.

## Two-source verification summary (per rule)

| Claim | Source 1 | Source 2 |
|---|---|---|
| 99 declarations, all `"content"` | Direct JSON walk of all 84 `blocks/*/block.json` files (script output) | `sgs-db.py` cross-reference confirms all 99 keys exist as DB rows |
| Key is WP 7.0's `contentOnly` marker, not SGS vocabulary | Introducing commit `d307c8b0` message ("WP 7.0 audit ... Decision 23") | `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:590` + `audit-declared-vs-seeded-roles.py` docstring, independently written 2026-07-16 |
| 18 NULL roles, correct sub-type | `render.php` line citations per attribute (table above) | Cross-checked against the sibling attribute on the same/adjacent block using the identical mechanism (e.g. `beforeImageAlt` vs `media.imageAlt`) |
| `before-after` vs `media`/`decorative-image` inconsistency | `before-after/media-render.php:69` (`<img>` src usage) | DB query showing `content` vs `image-object` for functionally identical usage |
| Coverage gap ≈ 3.8-10% | Manual classification of all 306 rows in the "both signals silent" bucket (not a subsample) | Spot-checked 2 instances (`submitLabel`, `addToCartLabel`) directly against `render.php` `esc_html()` echo sites |
