---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Desktop draft-vs-clone review — separate-issue log + per-issue root-cause investigation protocol"
created: 2026-06-08 direct comparison of the 4 sources of truth above. Ignore all pipeline artefacts/parity2/logs.
- **Killed dead-ends:** parity2 containment fallback (D190 — premise was stale); the "button variant drop" R1 from the emit analysis (Bean's eye: buttons render fine). The earlier `2026-06-08-task2-converter-lift-diagnosis.md` and `...-draft-vs-clone-html-diff-register.md` are superseded by THIS evidence-based per-issue log.
- **Validated by Bean's eye:** brand section renders STACKED 1-col at desktop.
- **Dominant hypothesis (to be PROVEN per-issue, not assumed):** the converter writes responsive CSS as INLINE styles (which beat `@media`) and/or mishandles min-width/max-width cascade semantics — so responsive block-style settings aren't fed into the device-specific slots that exist. Bean: "we literally have responsive block style settings, so all device-specific CSS rules should be fed into the right slot."

## Investigation protocol (per issue — NO shortcuts, NO merging, NO conflation)

Each issue is investigated by its OWN subagent and logged as its OWN entry. Even if two issues look like the same cause, each gets a full independent investigation and its own evidence — we only group AFTER the council + Bean approve the complete list. Each entry MUST contain:

1. **Issue ID + verbatim description** (Bean's own wording, unaltered).
2. **DRAFT evidence:** `index.html` line number(s) + the exact CSS rule / markup.
3. **CLONE evidence:** `current-clone-page-source.html` line number(s) + the exact emitted CSS / markup.
4. **SCRIPT evidence:** the exact `file:line` in the pipeline scripts that produced the behaviour (or, with proof, "not script-caused — block render.php" / "block.json schema" / "DB data").
5. **DB evidence:** the table + row/column involved (`/sgs-db`, `/wp-blocks dump`) or "n/a (proven)".
6. **Root-cause statement:** one plain-English sentence, grounded in 1–5. No speculation/probability/assumption — if it can't be cited, it isn't concluded.
7. **Diagnosis only — NO fix proposed yet.**

After all entries: council (`/adversarial-council` or `/qc-council`) + Bean approve → group by shared root cause → design universal solutions (fix the group + future similar cases) → design-gate (Rule 7) → build via `/subagent-driven-development` → re-clone + re-save page-source + Bean eye-verify.

## Skills for this phase

Bean's list: /systematic-debugging /sgs-wp-engine /sgs-update /wp-blocks /subagent-driven-development /dispatching-parallel-agents /diagnostics /lint /wp-hooks /adversarial-council /qc-council /brainstorming /brain-dump /library-docs /windows /sysadmin-toolbox /verify-loop /writing-clearly-and-concisely.

Proposed additions (relevant, Bean to confirm):
- **/sgs-clone** — re-clone page 8 + re-save page-source for verification after fixes.
- **/delegate** — per-subagent model routing (the dispatching skill consumes it).
- **/playwright** — live computed-style verification at desktop (confirms a responsive bug renders as predicted; the clone HTML shows the rule, Playwright confirms the paint).
- **/capture-lesson** — lock each proven root cause as a durable lesson once grouped.
- **/spec-writer** — for the product-card rebuild spec + the naming-convention/variant-in-class-name addition (Featured-product D/H/L; Brand C).
- **/strategic-plan + /phase-planner** — sequence the universal-fix build once groups are approved.
- **/gap-analysis** — grade the issue log for completeness/evidence before the approval gate.

## SEPARATE ISSUE LOG (desktop only — Bean's review, verbatim intent; one row each, UNINVESTIGATED)

### Hero
- **H-A** — Split variant recognised (2 columns) BUT image column takes the majority of width; content column squashed on the left.
- **H-B** — Image still has padding top/bottom/sides; should have none.
- **H-C** — Heading still centre-aligned; should be left per draft. Block layout text-align is set to "inherit" and doesn't take the draft's alignment. (Suspected GLOBAL text-align non-transfer.)

### Trust Bar
- **TB-A** — Content-width not passed → 4 badges spread across full screen width. Bean's 4-layer model to verify: (1) MAX-WIDTH from top-level container class (`.sgs-trust-bar`, here unset → full) → container bg/external CSS; (2) CONTENT-WIDTH from direct descendant `__inner` (`.sgs-trust-bar__inner`) → must FOLD into sgs/container `content-width` setting (folding stage whenever we hit the container layer — always fold the direct descendant's CSS into specific sgs/container slots); (3) custom column/row TEMPLATE if present (column count + each grid item's share); (4) PER-GRID-ITEM CSS folded into sgs/container (e.g. hero content-half padding vs media-half none).
- **TB-B** — All of TB-A's rules are res
status: ACTIVE — input list for the per-issue subagent investigation loops. NOT YET investigated. Awaiting council + Bean approval of the list before grouping into universal fixes.
sources_of_truth_ONLY:
  - "DRAFT: sites/mamas-munches/mockups/homepage/index.html"
  - "CLONE: sites/mamas-munches/mockups/homepage/current-clone-page-source.html (re-saved page-source after each clone)"
  - "Pipeline SCRIPTS (convert.py / db_lookup.py / sgs-clone-orchestrator.py / render.php files)"
  - "DB tables (sgs-framework.db via /sgs-db + /wp-blocks dump for block.json schema)"
NOT_a_source_of_truth: "parity2, pipeline artefacts (extract.json/trace/leftover-buckets), logs, pixel-diff, council verdicts — Bean-locked 2026-06-08: they misled for weeks. Verify against the 4 sources above only."
---

# Desktop review — separate-issue log + investigation protocol

## Compacted state (what is already established this session — do NOT re-derive)

- **Method (Bean-locked):** diagnose ONLY byponsive → no inline writing, no single-device-only, no min/max mix-ups. Fixing this likely fixes many device-specific issues without targeting them individually.
- **TB-C** — Icons: house icon different; star icon flat-colour in draft vs pink-outline/transparent-inside in clone; truck icon different but clone's is BETTER → exception: update the DRAFT to match the clone truck.

### Featured-product (major rebuild territory)
- **FP-A** — Heading alignment "inherit" → centre; should be left per draft.
- **FP-B** — Font sizing/styles off; e.g. label "OUR SIGNATURE" font-size not carried over.
- **FP-C** — Padding/spacing between all blocks in the section is wonky/inconsistent.
- **FP-D** — `.product-cards` wrapper: planned for sgs/card-grid (has a "Product Cards" inserter variant) but the converter picked sgs/container. INVESTIGATE card-grid's true intended purpose vs sgs/container (read /wp-blocks, block.json, Spec 02).
- **FP-E** — sgs/card-grid functionality is very limited (can't drag blocks in; only manual entries or post-query; query only allows post-type = page/post; no product CPT; no pick/sort/filter; no preview). Question: does it offer any unique value, or is it a dead container-equivalent?
- **FP-F** — Binding sgs/product-card to either live product page → "Error loading block: Invalid parameter(s): attributes" (all 3 variant styles). Real bug.
- **FP-G** — Draft Zookies card had NO black border; clone added one.
- **FP-H** — product-card block design/variants don't match the draft card format; clone uses it as a container with arbitrary child blocks. Need most elements built INTO the block as elements (not child blocks). Possibly related to FP-J.
- **FP-I** — Product-card images different heights, both wrong; draft had a uniform max-height for both.
- **FP-J** — In-card content spacing handled very differently.
- **FP-K** — Clone added a "choose pack size" message above the pills; not in draft.
- **FP-L1** — Pack-size pill styles copied from primary-button style; wrong.
- **FP-M** — Price font wrong.
- **FP-N** — Price-note floats like an exponent. Origin: the `__price-row` wrapper. Draft `.sgs-featured-product__price-row { display:flex; align-items:baseline; gap:10px; margin-bottom:14px }`. Clone sgs/container has `align-items:start` (changed from baseline) + `flex-wrap:wrap` + an htmlTag setting (Bean flags htmlTag as possible exact-code-mirroring concern).
- **FP-O** — The two product cards are different heights; draft makes all cards in the wrapper match height (smaller card spreads its inner elements across the full length).
- **FP-P** — CTA button should fill the max-width available; clone buttons are sized by padding only.
- **FP-DRAFT-FIX** — DRAFT naming is inconsistent and must be standardised. Trial card class `sgs-product-card sgs-gift-section__card--trial` is wrong (matches an unrelated section). Featured card `.sgs-product-card` omits the variant. Bean's proposed ideal: `sgs-product-card--trial` / `sgs-product-card--featured`, standardise all descendants, and support variant-in-class-name as a naming-convention + DB convention. (Bean: "an idea not an order — propose the ideal solution.")

### Brand
- **BR-A** — Stacked 1-col at desktop. Container advanced-grid custom column template: desktop `1fr` (wrong), tablet `1fr 1fr` (correct), mobile unset. Bean's hypothesis: the converter doesn't understand `@media (min-width:768px)` cascades to everything ≥768 (and the inverse for max-width) unless overlapping rules narrow the band — so it mis-assigns the desktop slot.
- **BR-B** — Fixing BR-A may fix the media styles (image has nothing working except the correct src — no rounded corners, wrong height/width).
- **BR-C** — Button style completely different. Draft variant `ghost`; my buttons only have primary/secondary/outline. `ghost` ≈ `outline`. Proposal: rename outline→ghost OR add ghost as a synonym in the DB; primary/secondary logic works → make ghost work too.

### Ingredients
- **IN-A** — Label/heading/text alignment set to "inherit". Heading correct (centre is default) but label + text wrong (their default is left). GLOBAL text-align non-transfer for all text blocks.
- **IN-B** — Missing padding between `sgs-section-heading__intro` and `sgs-feature-grid`.
- **IN-C** — Grid is 2x2 on clone; should be 4-in-one-row per draft.
- **IN-D** — Emojis missing from info boxes → default star icons.
- **IN-E** — Icon + text alignment in info box should be centred; rendered left.
- **IN-F** — Notice-banner looks nothing like `sgs-ingredients-section__disclaimer`: has black outline + default icon (draft has none) + no text carried over.

### Gift section
- **GF-A** — Label/heading/text alignment issues (same as IN-A).
- **GF-B** — Text styles inconsistent across all content.
- **GF-C** — Missing padding between `sgs-section-heading__sub` and `sgs-gift-section__cards` (consistently missed across sections).
- **GF-D** — Card label: font size, colour, padding/size of highlight colour around text all wrong.
- **GF-E** — Heading misalignment (common).
- **GF-F** — Price font wrong.
- **GF-G** — Gap between price and the text above it missing in clone.
- **GF-H** — Draft button has no wrapper, but sgs/multi-button parent auto-adds padding. If no wrapper exists, the sgs/multi-button CSS should be blank.
- **GF-I** — Announcement bar looks nothing like `sgs-announcement-bar--send-to-ward` — wrong on content AND font size (it's the global promo bar).

### Social Proof
- **SP-A** — Heading font-size too small (not scaled up).
- **SP-B** — Missing padding between the sub-heading text and the block below (common miss).
- **SP-C** — Trustpilot bar: stars sit at a different height than the content left/right. Draft `align-items:center; justify-content:center`; clone has `align-items:start`.
- **SP-D** — Review inner elements inconsistent: star size, font size, vertical gap/padding between each.
- **SP-E** — No profile images set → block should HIDE the image, not show a "?" in a circle (looks untrustworthy, not in draft).
- **SP-F** — Each testimonial card has a weird outer colour via `.sgs-testimonial-slider__slide--card { background ... }` (Bean's message was interrupted mid-detail — confirm exact value).

## NOTE — Bean's review messages were interrupted; SP-F and any further items may be incomplete. Confirm the final list with Bean before the approval gate.
