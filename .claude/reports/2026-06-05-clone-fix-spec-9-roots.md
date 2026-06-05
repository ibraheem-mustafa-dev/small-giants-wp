---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Clone-fidelity FIX SPEC — the 9 pipeline root causes (actionable, evidence-grounded, QC+council-checked)"
created: 2026-06-05
status: BUILD — next session fixes these in the pipeline; verify by symptom-resolution on the live clone (homepage page 8)
source: v2 root-cause reports + QC-corrections + 3-persona adversarial council (all 2026-06-05)
---

# Clone-fidelity FIX SPEC — 9 pipeline root causes

**Objective (Bean-directed 2026-06-05):** fix the pipeline ONLY. No verifier-build this session. **Verification = re-clone + check the named symptom is gone on the live clone.** Deploy to the **actual homepage = page 8** on sandybrown (NOT page 144 — `--deploy-target page:8`; `page_on_front=8`). Re-clone command base: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8`.

**Rules:** no cheating / no per-section band-aids (R-22-1 DB-first, R-22-9 universal). Every fix passes "does this apply to all SGS blocks/clients, not just Mama's?". Build via Sonnet subagents, edit-only-named-files, verify each on the live clone, commit by explicit path (theme thread shares the tree — `git log -1 --stat`). **Never conclude no-fault from one DB column or script logic — read the block's actual capability (block.json attrs + render.php).**

---

## The 9 roots (fix these)

### R1 — Composite double-wrap (IMPL) — symptoms #1, #2, #4
`convert.py:~2901` exception-3 wrap-gate `if is_top_level and slug != "sgs/container":` wraps EVERY top-level non-container slug, with no exemption for mirror-roster composites. `_is_container_mirror_block()` exists (`convert.py:~874`, DB-driven) but is only called in the lift path.
**Fix:** add `and not _is_container_mirror_block(slug)` to the gate → hero/trust-bar populate their OWN built-in container, no redundant outer `sgs/container`.
**Symptom-check:** hero is a single `sgs/hero` (no wrapping `sgs/container`); hero image fills the right column (no bg wrapping it — #2); trust-bar is NOT a 4-col container holding a 4-col trust-bar (#4).

### R2 — Ancestor text-align/inheritable CSS not transferred (IMPL) — symptoms #13, #16(align), #19(align)
The collector matches an element's OWN-class rules but not inheritable properties (`text-align`, `color`, `font-*`) set on an ANCESTOR (e.g. `.sgs-ingredients-section__inner{text-align:center}` line 507 → children).
**Fix (Bean-directed):** give each text block (heading/text/label) a **per-instance `textAlign` control**; **theme default = left (LTR)**; the converter sets `textAlign` from the draft's EFFECTIVE alignment (own-class first, else inherited ancestor). Owner/AI can override per instance. (Absence in the draft = left, do not impose centre.)
**Symptom-check:** ingredients/gift/social labels+intros render centred where the draft centres them, left where it doesn't.

### R3 — Own-class layout/typography properties dropped (IMPL, DISTINCT from R2) — symptoms #14, #20, #24(font/margin), #27, #28, #12A
Even for OWN-class rules, the harvest/lift map omits `margin-bottom`, `align-items`, `justify-content`, `font-family`, `background`, `max-width`. Proven by #27/#28: `text-align`/`gap` extract from a rule while `margin-bottom`/`align-items` from the SAME rule do not.
**Fix:** add those properties to the harvest/lift map (DB-driven). `max-width`→`contentWidth` (#12A). **Do NOT merge with R2 — separate fix.**
**Symptom-check:** gaps/margins between section-heading and content render (#20/#27); trustpilot strip aligned (#28); brand capped at 1000 (#12A); gift price font + card-description correct (#24).

### R4 — Missing `__experimentalBorder` block support (IMPL) — symptoms #6, #7 (audit #10, #12C)
`sgs/product-card` block.json declares no `__experimentalBorder` → `border-radius`/`border` gated out (`convert-trace-b4.jsonl`: `lift_gap_candidate reason no_matching_container_attr`).
**Fix:** **codebase-wide audit** of blocks rendering a styleable box lacking `__experimentalBorder` (product-card, media, info-box at least); add `__experimentalBorder.radius`/`.width`. Then the existing lift transfers them. (VERIFY each block's block_supports BEFORE adding — #12C/#10 are "almost certainly" until checked.)
**Symptom-check:** product cards show rounded corners + the featured card's 1px border; brand image rounded (#12C).

### R5 — Icon/emoji identity not transferred (IMPL) — symptoms #5A, #15
Trust-bar: draft inline `<svg>` not mapped → `sgs/icon` emitted attr-less → default star (#5A). Ingredients: emoji glyph routed into `linkUrl` (then `esc_url`-stripped) instead of `emojiChar`+`iconSource:"emoji"` (#15).
**Fix:** map the draft's icon identity — emoji text → `emojiChar`+`iconSource:"emoji"`; inline SVG → a faithful `sgs/icon` representation (named-icon match or raw-SVG carry).
**Symptom-check:** trust-bar shows the real icons (not stars); ingredients shows 🌾🍺🌿 (not stars).

### R6 — Button background-lift paints the wrapper (IMPL) — symptoms #9, #23
`_lift_root_supports_to_style` (`convert.py:~2659`) lifts `background-color` onto `sgs/button` (it has `supports.color.background`); render.php's `$is_custom = 'custom' === $inherit_style` is false for `"primary"`, so WP applies `style.color.background` to the `.sgs-button-wrapper` div.
**Fix:** skip the `background-color` lift for `sgs/button` when `inheritStyle` is a preset value (preset CSS already styles the button face).
**Symptom-check:** no coloured box around any primary button (page-wide); buttons look correct.

### R7 — Array-driven content blocks: not routed-to, not populated (IMPL + the one DOC gap) — symptoms #18, #26, #31
The converter doesn't handle blocks that hold content via an ARRAY attr (not InnerBlocks): `sgs/card-grid.items` (block.json `"items":{"type":"array"}`), `sgs/announcement-bar.messages`, trust-bar badges; and notice-banner's content is now an InnerBlock child (FR-22-6) but the converter emits the dead scalar `text` (#18). The router gates on `has_inner_blocks` and so falls back to `sgs/container` for array-driven blocks (#31 — card-grid/products/gift).
**Fix:** (a) router capability gate must consider array-content attrs (`items`/`messages`/badges), not only `has_inner_blocks`; (b) add array extractors that populate them from the draft's repeated child DOM; (c) notice-banner: emit a `sgs/text` InnerBlock child, not scalar `text`. **DOC:** add a §FR-22-21 clause for content-synthesis / array-population of non-container blocks (the one genuine doc gap).
**Symptom-check:** notice-banner shows the disclaimer text (#18); announcement-bar shows the draft's send-to-ward content + format (#26); products/gift grids route to the right grid block populated with cards (#31).

### R8 — Missing specific lift mappings (IMPL) — symptoms #3, #5B, #11d, #12D
No DB suffix / not in `_root_lift_rules` for: child→parent cross-level (`.sgs-hero__sub max-width`→hero `subHeadlineMaxWidth`, #3); the trust-bar `__icon` wrapper CSS `border-radius:50%`/`background:white`/dims/box-shadow — the D2 lift dropped them (#5B; OR set the REAL `sgs/icon` attr `backgroundShape:"circle"`); BEM modifier `--trial`→`variantStyle:"trial"` (#11d dashed border); `object-fit`/`border-radius`→`sgs/media` (#12D brand image zoom/corners).
**Fix:** add each mapping (DB-driven, R-22-1).
**Symptom-check:** hero subheading capped (#3); trust-bar icon white circle present (#5B); trial card dashed border (#11d); brand image object-fit cover + rounded (#12D).

### R9 — (folded into R7) — array-driven routing is the same systemic gap; tracked under R7.

---

## UNVERIFIED-on-arrival — fix the relevant root, then JUST CHECK the symptom (Bean: no elaborate verifier)
These had no confirmed cause; do NOT build speculative fixes — re-clone after the R-fixes land and see if they resolved as a side-effect, else live-diagnose then:
#8 (product image height — bound CSS hardcodes 220px), #11a (button full-width), #11b (card heights), #11c (price-note position), #25 (gift card heights), #17 (info-box grid gap — emit correct 14px; render/cache), #19-origin (gift-sub centre source), #29e (avatar), #30 (review container bg — may be fine if `sgs/testimonial` adds its class). Several likely resolve via R1 (double-wrap) / R3 / R7.

## NOT a defect — do NOT fix
#12B (the draft's OWN CSS applies text-muted), #22-h3 (draft has no `text-align`), #21/#24-text (emit is per-card correct — only font/margin via R3), productId (cards render real content — falsified). #32 = a block-capability request (feasible: `displayMode` slider|grid + `showAuthorImage` toggles on the slider/testimonial block) — separate from the pipeline.

## Doc-vs-impl bottom line
**Overwhelmingly IMPLEMENTATION.** Spec §FR-22-21/§FR-22-5 correctly mandates faithful transfer; the converter doesn't deliver it (R1-R8). **The single DOCUMENTATION gap is R7** — content-synthesis / array-population for non-container blocks is undefined; add the clause.
