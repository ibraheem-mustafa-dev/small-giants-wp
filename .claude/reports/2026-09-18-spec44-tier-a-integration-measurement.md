# Spec 44 §11 — Tier A (`sc_var_classifier.py`) integration measurement

**Question:** does Tier A become a third Stage B signal, or stay superseded/redundant with
Stage A + Stage B? Rule from Spec 44 §11: *"measure, don't assume additive."*

**Scope:** Eye Care Birmingham draft only
(`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html`).
Frame Card.dc.html is explicitly OUT OF SCOPE — its own Stage A/B baseline hasn't been
measured yet (a separate open item).

**When measured:** 2026-09-18, after the same-day `slots` table fix (D1103 — the stray
`"thumbs"` alias removed and the over-broad `standalone_block='sgs/info-box'` self-mapping
on the generic word "items" nulled out). This is a fresh run against current code + current
DB state, not a reuse of the stale conversation-only "0 of 35" figure from a prior session.

## Method

1. **Group extraction — identical to the existing Stage A/B baseline script**
   (`plugins/sgs-blocks/scripts/recogniser/measure-classless-baseline.py`): `soup.find_all("sc-for")`
   over the real draft, `element = sc_for.parent or sc_for`, `item = classless_draft_adapter.representative_item(element)`.
   Same boundary-id scheme (`eye-care-scfor-NN`, zero-padded index in document order).
2. **Stage A/B baseline — re-run fresh, not trusted from the 2026-09-17 report.**
   `classless_draft_adapter.build_stage_a_group()` / `build_stage_b_group()` feed
   `classless_trust_gate.recognise_classless_group()`, exactly the pipeline
   `measure-classless-baseline.py` calls. The DB fix touched `slots.aliases`, which Stage A
   (`block_render_repeaters`) and Stage B (`array_item_schema`) do not read — so this is a
   genuine re-verification, not an assumption the fix left this half unaffected.
3. **Tier A — called directly**, once per group: `sc_var_classifier.classify_sc_var_deterministic(var_name, hint_placeholder_count, class_signature=None)`. `class_signature=None` because Claude
   Design drafts carry zero BEM classes (confirmed by inspection — this is the correct input,
   not a simplification).
4. **Read-only.** The measurement script does NOT call `gate.append_decision()` — it does not
   grow the real git-tracked `classless-recognition-log.jsonl` with a throwaway run. It does
   not touch `sc_var_classifier.py`, the DB, or any pipeline module.
5. **Ground truth for correctness** — real draft markup read directly around each fired
   boundary (tag structure, `role=`, `onclick=`, `aria-*`, surrounding CSS shape:
   `display:grid` vs `display:flex`, `dc-import name="Frame Card"` presence, etc.), not
   assumption from the variable name alone.

Exact command used for the run: a throwaway script in the session scratchpad, invoking the
three real modules above with no modification —
`python <scratchpad>/measure_tier_a.py` (script content available on request; not committed,
per the task's "read-only investigation" constraint).

## Headline counts

- **39 `<sc-for>` groups found** in the real draft (matches the 2026-09-17 baseline's own
  count — verified fresh, not assumed still 39).
- **Stage A/B baseline, re-measured post-fix: unchanged from 2026-09-17** — 0 auto-completed,
  2 fell to review (`eye-care-scfor-09` → `sgs/trustpilot-reviews`, partial;
  `eye-care-scfor-18` → `sgs/trustpilot-reviews`, partial), 37 no-match. The D1103 fix (which
  touched only `slots.aliases`) does not change Stage A/B's own resolution, as expected.
- **Tier A fired on 37 of 39 groups** — every single fire came from the `sc_var_count`
  signal (repeat cardinality ≥ 2, blanket-guesses `sgs/card-grid`). **Zero fires came from
  the `sc_var_alias` signal** (`slots.aliases` exact/singular match) — the alias half of
  Tier A produced no hits at all on this draft's vocabulary, post-fix. This also means the
  pre-fix "0 of 35 correct, 2 wrong" figure was entirely attributable to the now-removed
  bad alias rows; nothing has replaced them with a correct alias match, so that signal is
  currently a complete no-op here (neither helpful nor harmful, 0/39).
- The 2 groups Tier A correctly stayed silent on (`eye-care-scfor-32`/`33`, `bagItems`,
  hint-placeholder-count 1 and 0) are cart line items, not any block Tier A would guess —
  correct restraint, not counted in either bucket below.

## Bucket classification (all 37 fired groups, individually inspected against real markup)

**(a) REDUNDANT — Tier A agrees with what Stage A/B already resolve: 0.**
Where Stage A/B produced a resolution at all (`eye-care-scfor-03/06/09/18`, all routed to
review, candidate `sgs/trustpilot-reviews`), Tier A's guess was `sgs/card-grid` on every one
— disagreement, not agreement. Tier A never once matched Stage A/B's own candidate block on
this draft.

**(b) ADDITIVE — Tier A correct where Stage A/B are silent: 4.**

| Boundary | var name | Tier A guess | Why it's actually correct |
|---|---|---|---|
| `eye-care-scfor-07` | `featured` | `sgs/card-grid` | Item markup is `<div style="display:grid;grid-template-columns:{{prodCols}}"><sc-for>…<dc-import name="Frame Card" p="{{p}}">` — a genuine product-card CSS grid. |
| `eye-care-scfor-17` | `results` | `sgs/card-grid` | Same `dc-import name="Frame Card"` pattern inside `repeat(auto-fill,minmax(…))`. |
| `eye-care-scfor-28` | `sameBrand` | `sgs/card-grid` | Same `dc-import name="Frame Card"` pattern. |
| `eye-care-scfor-29` | `related` | `sgs/card-grid` | Same `dc-import name="Frame Card"` pattern. |

All four are genuine "related/results/featured product" grids that import a separate `Frame
Card` sub-draft per item — which is exactly why Stage A's structural match reports no-match
for them: the item's own content lives in a component the current draft adapter does not
parse (`derive_draft_roles()` finds no markers inside the boundary itself, because they're
all inside the imported sub-draft). Tier A's blunt cardinality signal happens to land right
on these four because the containing grid genuinely has ≥2 repeated placeholders — real,
independently-derived signal Stage A/B structurally cannot see today.

**(c) HARMFUL — Tier A wrong on a group where Stage A/B are silent or already flagged: 33.**

Every other fire. A representative sample, spanning every content shape in the draft:

| Boundary | var name | Tier A guess | What it actually is |
|---|---|---|---|
| `eye-care-scfor-00` | `ticker` | `sgs/card-grid` | Animated marquee/ticker strip, not a grid |
| `eye-care-scfor-01`–`05` | `megaStyles`/`megaShopBy`/`megaTopBrands`/`megaAllBrands`/`megaLensItems` | `sgs/card-grid` | Mega-menu nav link lists (`<a onclick="{{s.go}}">`) — belongs to the un-deployed `sgs/mega-menu` block, not card-grid |
| `eye-care-scfor-06` | `marquee` | `sgs/card-grid` | Logo marquee strip (`animation:marquee 64s linear infinite`) |
| `eye-care-scfor-08` | `reasons` | `sgs/card-grid` | Numbered stat/reason blocks in a CSS grid — icon-list/process-steps shape, not product cards |
| `eye-care-scfor-09` | `shapeTiles` | `sgs/card-grid` | Selector tile `<button>`s (already flagged for review by Stage A as `sgs/trustpilot-reviews` — a SECOND, contradictory wrong guess on an already-flagged group) |
| `eye-care-scfor-10` | `reviews` | `sgs/card-grid` | Horizontal-scroll review rail (`<figure>`, `overflow-x:auto;scroll-snap-type:x`) — testimonial-slider shape |
| `eye-care-scfor-11` | `activeChips` | `sgs/card-grid` | Removable filter-chip buttons |
| `eye-care-scfor-12` | `filterGroups` | `sgs/card-grid` | Accordion filter groups (`aria-expanded`) |
| `eye-care-scfor-13`–`16` | `g.items` (×4, different meanings each use) | `sgs/card-grid` | Segmented buttons / pill toggles / colour-swatch circles / checkbox list — none are card grids |
| `eye-care-scfor-18` | `thumbs` | `sgs/card-grid` | Buybox thumbnail strip (already flagged for review by Stage A as `sgs/trustpilot-reviews` — a second contradictory wrong guess) |
| `eye-care-scfor-19`/`20` | `colourTiles`/`sizes` | `sgs/card-grid` | Variant-selector swatches/buttons — option-picker shape |
| `eye-care-scfor-21` | `assurances` | `sgs/card-grid` | Icon+text trust list — trust-bar shape |
| `eye-care-scfor-22` | `pdpTabs` | `sgs/card-grid` | `role="tablist"` — tabs, not a grid |
| `eye-care-scfor-23`/`24` | `specs`/`measureKey` | `sgs/card-grid` | Spec/measurement key tables |
| `eye-care-scfor-25` | `pdpAcc` | `sgs/card-grid` | Accordion (`aria-expanded`) |
| `eye-care-scfor-26` | `ratingBars` | `sgs/card-grid` | Rating-breakdown bars |
| `eye-care-scfor-27` | `pdpReviews` | `sgs/card-grid` | Review `<figure>` cards in a flex column — testimonial shape, not a CSS grid of product cards |
| `eye-care-scfor-30` | `faqs` | `sgs/card-grid` | FAQ accordion (`aria-expanded`, `onclick="{{q.toggle}}"`) |
| `eye-care-scfor-31`/`38` | `coRxModes`/`rxModes` | `sgs/card-grid` | Mode-selector buttons |
| `eye-care-scfor-34` | `runningLines` | `sgs/card-grid` | Measurement running-line rows |
| `eye-care-scfor-35`–`37` | `useOptions`/`thickOptions`/`finishOptions` | `sgs/card-grid` | Option-selector buttons with price/description — option-picker/pricing shape, not card-grid |

33 of 37 fires (89%) are wrong. Four of those (`09`, `18`, plus the two review-flagged
boundaries) directly contradict a candidate Stage A had already surfaced; the remaining 29
inject a wrong `sgs/card-grid` guess onto a boundary Stage A/B was correctly silent on.

## Recommendation

**Leave Tier A superseded / do NOT wire it in as an unconditional third Stage B signal.**

The rule from Spec 44 §11 ("wire in only if (b) is non-trivial and (c) is zero/rare and
safely excludable") is not met — (c) is not rare, it is the overwhelming majority (33 of 37
fires, 89%). The `sc_var_count` heuristic (`hint-placeholder-count >= 2` → blanket-guess
`sgs/card-grid`) has no content awareness at all: it fires identically on a marquee, a tab
list, an accordion, a filter-chip row, a variant-swatch grid and a genuine product-card grid,
because all of them repeat ≥2 times. On this draft that means it is wrong roughly 8 times for
every 1 time it is right.

The 4 genuinely correct hits (`07`/`17`/`28`/`29`) share one specific, narrower signature the
current heuristic does not check: a `dc-import name="Frame Card"` reference inside a
`repeat(auto-fill,minmax(…))` CSS grid. If Tier A is worth pursuing further, the next step is
a redesigned, narrower signal keyed to THAT combination (cardinality **plus** a
`dc-import`/genuine-card-grid CSS shape check) — not the current context-free cardinality
count, and not something to wire in unconditionally as currently implemented. The
alias-matching half of Tier A (`sc_var_alias`) is a complete no-op on this draft post-fix (0
fires) — neither helpful nor harmful here, but also not contributing anything Stage A/B
doesn't already provide.

## Counts summary (for the decision write-up)

- (a) REDUNDANT: **0**
- (b) ADDITIVE: **4** (`eye-care-scfor-07`, `-17`, `-28`, `-29` — all `sgs/card-grid`, all via `dc-import name="Frame Card"`)
- (c) HARMFUL: **33**
- Correctly silent (no bucket): 2 (`eye-care-scfor-32`/`33`)
- Total groups measured: 39 (matches the 2026-09-17 baseline's own count)
