---
doc_type: report
created: 2026-11-24
---

# Clone faults re-derived from the specs (2026-11-24)

Every fault in `.claude/plans/2026-11-24-clone-root-fixes.md`, with its governing requirement, the spec's design and its class: (a) the code departs from a sound spec, (b) the code follows the spec but fails, (c) the spec does not fit. Produced read-only by a helper from the specs, the framework DB, git and the investigation reports under `E:\sgs-tmp\general-cloning\` (index `hunt\INDEX.md`).

**Correction (same day):** this table's "never built", "half built" and "partly built" verdicts were then checked against the project's own record (every plan, live and archived, the area specs, git history and the track sessions' outputs). Several were wrong: the Eye Care collapse point, the structured-breakpoint reader, social icon sizes and the filter-chip wrapper were built and later lost or broken; `disabledItemIds` works; the mega panel cap has a working general mechanism the mega rule bypasses. Those checks govern where they differ: `E:\sgs-tmp\general-cloning\deep\BC1.out`, `BC2.out`, `BC3.out`.

Spec-first re-derivation done, read only; nothing was edited. Across 66 rows, 29 are (a) the code departs from a sound spec, 26 are (b) the code follows the spec and the result is wrong, and 11 are (c) the spec cannot give the right result. Spec 48 is large, so I read the requirements each fault touches plus Specs 04, 27, 36, 37, 48A and 49, and used the plan's hunt reports for code and history. I did not run any code; where a row rests on something I only inferred, it says so.

The method is right: the spec already holds a design for almost every fault, and the plan agrees with it on most rows. The plan has six conflicts with a spec rule or Bean ruling, and eight places where it invents what the spec or a lost commit already holds. It also leaves out six faults the hunts found, which are listed below the table.

**Checked directly (read-only):**
- The framework DB's `setting_placements` has a `selector` column. The `featuredBgHover` rows carry `…__item--featured…` in it, so the record already holds the variant and `rowPaths` drops it.
- The cart's `pillBorderRadius` and `iconTriggerRadius` rows are identical in part, properties, selector and values, so the record cannot tell them apart.
- Every restore commit exists, with its date, and `d79135af4`→`0ea1a6cb2` spans 560 commits.
- The lost `fill-current-attr.mjs` header comment reads the draft's `attr:aria-current` hole from the fact record and the values from other pages.

## Table

Columns: **#**, **fault**, **governing FR and Status**, **spec's design**, **class and reason**, **fix that follows**, **differs from the plan?**

### RF1: matching a value to the right setting

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs from plan? |
|---|---|---|---|---|---|---|
| 1 | A variant-only setting offered to every node (`featuredBgHover` on plain links) | §3.2, R-47-6 "the record is the slot truth"; FR-48-3 (built 2026-11-23) | The record holds part, properties, state and selector per setting | **(b)** The record holds `__item--featured`; `rowPaths` slices `comps.slice(at+1)` and drops it (`7349c1c7b`, a "wip" commit, 2026-11-23) | `rowPaths` tests the compounds before the part (`compoundHolds` exists); gate from the record's `selector` | Yes. The plan reads the setting's `css_element`. R-47-6 says that column "seeds, never replaces", and the seeder cross-check found it wrong (cart `iconTriggerRadius`). Use the record's selector |
| 2 | Cart `pillBorderRadius` and `iconTriggerRadius` tie | §3.2; no FR for device-mode gating (nearest FR-48-79) | The look carries `variants`; Fill gates by fixture variant (`fill-device-mode.mjs`) | **(c)** The two record rows are identical, so no reader can separate them. The spec has no requirement saying a placement carries the mode it paints under | The seeder tags each placement with its fixture variant (`setting-record/instances.py` already has `variant: vi`). Fill offers it only to a node whose per-device `triggerStyle` matches. Add one sentence to §3.2 | Yes. The plan says "the cart's per-device triggerStyle says which" and names no source on the setting side |
| 3 | A setting that paints `::before` or `::after` never matches the draft's plain element | FR-48-86 layer 4 (partly built) | The record holds every computed longhand a setting changes and on which part; the draft longhand matches the setting whose effect equals it | **(b)** The mechanism exists; the pseudo part is not counted as painting the element | Fix inside layer 4 (`lib/css-equivalence/effect.mjs`) | Partly. "Pseudo-layer equivalence" restates layer 4 as a new rule |
| 4 | Value and placement sit on different elements of one part (cart button against label, burger bar against icon box) | §3.2 "Reading a declared look" (same-box); FR-48-101 `rootIsPart` (built 2026-11-19) | Root and its only child part count as one box where the record names them | **(b)** The same-box and part-pairing conditions do not cover these cases | Extend `fill-same-box.mjs` and `fill-part-pairing.mjs` | No |
| 5 | Settings with no CSS property (`collapsePoint`, `triggerMode`, `disabledItemIds`, `featuredItemIds`) | FR-48-79 (not built); FR-48-50 step 2 | "Write the block setting whose meaning the framework DB records, by query" (`block_attributes.meaning`, 50 rows) | **(a)** Never built | Build FR-48-79 over `meaning`; lost calibration `enumReads` is the source for the rules | Yes. The plan's "small map from what the draft shows" is an invention FR-48-79 already covers |
| 6 | Menu current-page look (links written one by one, `aria-current="{{ cur.<key> }}"`, `background: {{ act.<key> }}`) | FR-48-6 rule 3 (`drawsChildren` childSlots: resting and current item link); FR-48-81 (partly built: "current item's colour and indicator … not built"); FR-48-98 (not built); FR-48-13 | The nav block's current slot is read at the draft's current link; states are reached by setting the logic's state directly | **(a)** Built and proven 2026-10-29 (`7721da8e2`, register C3), then lost in the rewind with its tests and `fill-state-parts.mjs`. The surviving `fill-current-item.mjs` reads only an `sc-for` flag | Restore `7721da8e2` with its tests. Note it reads the values from the render of other pages, not from the `cur === k` code; forcing each page through FR-48-13 and reading declared values gives the same result inside the spec | No |
| 7 | Mama's logo `maxHeight` and `sgs/media` ratio and height | §3.2 declared look; Spec 48 intrinsic-ratio row (retired 2026-11-11: "an image's height never becomes a max-height"); FR-48-86 layer 4; FR-49-35 (built) | The look holds sizes as declared; effect equivalence decides which setting holds a height | **(b)** `blockPaint` keeps only px values, so a declared `none` or `auto` is never "larger". `sgs/responsive-logo` has `maxHeight` only, no `height` | The small fix: `blockPaint` treats a declared `max-*: none` as unbounded | Yes. The plan's `_box` measured-box port contradicts §3.2 (conflict C3) |

### RF2: one validity contract

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs from plan? |
|---|---|---|---|---|---|---|
| 8 | Strict mode is on by default | §3.4 Paint conservation: "a listed look never stops the clone … a strict switch … exists for tests" (Bean 2026-11-21); FR-48-113 (built with fakes) says the surface command runs `--strict` | Strict is test-only | **(c)** The spec contradicts itself | Default off in `siteRunArgs`; change FR-48-113's text (S1) | No |
| 9 | Five bad shapes: handover string, kind `layout`, `process-steps` style values, order heading `level: 1`, `::before` slot | R-47-10; §3.3 handover (owner, kind, detail); FR-48-82 (partly built); FR-48-97 (headings keep their level); FR-48-109 | One handover shape; lint refuses style values in a skeleton | **(a)** The writers depart. The spec is silent on kind `layout` and on pseudo-layer slots | Fix each writer at source; write the shapes into the spec (S11) | Partly. The plan adds a new shared validator module; extend `lint.mjs` and Fill's handover validator instead (R-47-1 and R-47-10 make `lint.mjs` the gate) |
| 10 | `lintSkeleton` treats any truthy `css_property` as a style value, though 37 DB values are not CSS (`tag`, `fx:*`, …) | R-47-10 | "Fails a skeleton carrying any attribute whose `css_property` is not null" | **(c)** The rule as written refuses legitimate non-CSS kinds | Predicate that knows the non-CSS kinds; reword R-47-10 | The plan has the predicate but lists no spec change |

### RF3: later stages overriding earlier decisions

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 11 | Fill overwrites the skeleton's `splitSide` | §3.4 (skeleton writes structure, Fill writes values); FR-48-3 `resolveDiscovered` `owned` | Silent on a skeleton-owned setting | **(b)** The `owned` mechanism exists and is not used for this setting | Skeleton puts it in `decided` (S8 wording) | No |
| 12 | Mega panel cap and padding never read | §3.4 Paint conservation ("a wrapper's CSS is never dropped"); FR-48-98 (not built) | Every conserve kind has a reader | **(a)** Half built (`822b6b400`, `7ff6ea088`) | `megaPanelRow` carries `decided` per device | No |
| 13 | Footer list heading look lost (`listHeading`) | FR-48-108 (not built): part pairing is one mechanism | The absorbed element is paired to its part | **(a)** Half built (`289a0b54c`) | Emit the heading's `draftSlots` | No |
| 14 | Trust bar dots (`textBadgeSeparator`) | FR-48-79, §3.4 (a painted svg glyph is read or listed), FR-48-108 | The glyph sibling becomes the separator setting | **(a)** Never built | `headerStripBar` writes the separator and its colour | No |
| 15 | Drawer lists both bind the header menu (`boundMenu`) | FR-48-98 Drawer bullet (not built): "each drawer `<nav>` group binds to the menu the page map made for it by surface kind and order" | Bound by kind and order | **(a)** Lost in the rewind | Restore `421c512f9` (drawer, drawer-N, drawer close) with its tests | The plan states it twice (RF3 and the Restore map); it is one fix |

### RF4: reading the draft completely

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 16 | Eye Care width conditions read 0 of 134 (`return Object.assign(…)`); `collapsePoint` unwritten | FR-48-7; FR-48-27 (built, Eye Care basis is root width); FR-48-50 (built); FR-48A-13 Status says the route reads `breakpoint` first, and today's code does not | One logic reader; thresholds with their basis | **(b)** The reader's shape coverage misses `Object.assign`. It never worked for Eye Care. The 48A Status is false | One shared value-node reader. `collapsePoint` reads `breakpoint` or `state_keys.w` before the prose, with the prose regex deleted | No |
| 17 | Phone button hide bound as `display: {{phoneDisplay}}` | FR-48-8 step 1 (bindings evaluated per width); FR-48-50 step 3 | A bound value is a condition; written as scoped Custom CSS | **(b)** Only `sc-if` is read as a width condition | Treat a bound display or visibility value as a condition and feed `widthGateWrites` | No |
| 18 | Presence steps unwritten; sweep edges 16px off the threshold | FR-48-50; FR-48-27 (±1px test) | Thresholds tested at ±1px | **(b)** | Edges from the code's thresholds | Conflicts with FR-48-50 step 1 (5% snap first) until Bean decides D3 (conflict C2) |
| 19 | Eye Care FAQ answers (7 of 8): `const C = Component; C.FAQS` | FR-48-7, FR-48-38, FR-48-85 (in progress) | Static content arrays are read | **(b)** The reader resolves `this.<name>` only | `memberRefs` resolves a class alias's statics | No |
| 20 | Script-injected custom elements (Indus logo) invisible | FR-48-85 (in progress: "custom elements the draft defines") | The inventory reads them | **(a)** Lost | Restore `2a393e23a`, `82bc238bf`, `99770b683` | No |
| 21 | Clock-decided words | R-47-4; 48A `surfaces.json` time dependence | Content the clock decides is read from the code | **(a)** Lost | Restore `7f18560bd` | No |
| 22 | Surfaces opened through the draft's store call (MIC's shop) | FR-48A-13 and 48A §3 (Status "store-call openers built", false: "not in the running route"); FR-48-95 | The route reads `setState` and `storeCalls` before the prose | **(a)** Lost | Restore `19b0b1395` and `8c48dec56`, plus the reach-call reader the 48A Status names (`6fb7356c8`) | The plan omits the reach-call reader. That hash's subject reads "product flow links", so confirm it before restoring |
| 23 | Link labels from plain href anchors | FR-48-97 last bullet (in build); FR-48-30 | Menu labels are the draft link's text | **(a)** Lost (`5a2679014`'s branch); the spec's cross-reference "FR-48-55 part 3" is wrong | Restore the branch beside `dff980b6e` | No |
| 24 | Single-file draft links | FR-48-6 rule Links (Status "built 2026-10-27", stale); FR-48-97 bullet 1 | Links resolve to the page map | **(a)** Lost (`a98de66c4`) | Restore | No |

### RF5: exact values, only where they apply

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 25 | The 0.5px tolerance decides whether to write | R-47-7; FR-48-36 (provisional); FR-48-86 layer 5; Bean 2026-11-24 | Snap within ±0.5px | **(c)** The spec's snap gives wrong output by Bean's current ruling | Amend those four texts so tolerance applies only when comparing renders (S3). Keep the colour ΔE ≤ 2 snap | No |
| 26 | Initial values written (`grid-template-columns: none`, `flex-grow: 0`, default fonts on `sgs/media`) | R-47-5; FR-48-43 (built); FR-48-86 layer 3 (partly built); FR-48-109 `unneeded` class | An unpainted initial value is held inert | **(a)** | `appliesIn` inside `resolveProperty` and the residual writer | No |
| 27 | Unwrapped hero content squeezed into a grid (Indus, 21 surfaces) | FR-48-6 hero rule (`heroInner`: "its wrappers removed") | Wrappers go | **(a)** Proven working at `0ea1a6cb2~1` | Restore the unwrap; re-deriving tracks becomes a guard | No. The trigger is unproven |
| 28 | A residual rule cancels a setting (`list-style` against `markerType`) | FR-48-109 `classifyRow` `route` | "Never Custom CSS, which would fight that setting" | **(b)** | Classify it as `route` | No |
| 29 | Residual writer refuses a fixed copy (burger bar 3) and single-width layout values (basket icon) | FR-48-109 (partly built); FR-48-94 | Single-width lengths written per device | **(c)** The refusal list contradicts FR-48-94 | Narrow the refusal list (S4) | No |
| 30 | Mama's header order (`mergeWidthAlternatives` drops moved nodes) | FR-48-6 header-slots text; §3.4 | Width alternatives merged | **(b)** | Moved nodes keep their own slot per width | No |
| 31 | Indus section widths wrong (careers 720 against 1240) | FR-48-94 targets; FR-48-7 Freshness ("a reader refuses a stale record, never falls back") | Pairs come from fresh Fill and origin files | **(b)** The code follows an older "refreshed pairs replace" design; 34 committed `.pairs.json` files from 2026-11-02 are stale | A freshness stamp that refuses a stale pairs file | Yes. The plan says "origin wins, delete stale files"; the spec principle is refuse-when-stale |

### RF6: motion and timing

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 32 | A block's own transition survives where the draft has none | FR-48-104 (not built); FR-48-81 | A full default-residue pass with guards and MUST FAILs, through a setting, else Custom CSS | **(a)** | Build FR-48-104's pass | Yes. The plan makes a point fix in `notPainted` |
| 33 | `holdDefaults` makes `sgs/text` emit a fixed 300ms | FR-48-81 (partly built) | Hold the default state look | **(b)** | No hover state when hover equals rest (S9 wording) | No |
| 34 | Timing-only hover has no home | FR-48-81 (built: `paintDuration` and `shadowDuration`) | The hover layer's timing fields | **(b)** | `paintTimings` creates the state | No |
| 35 | `rowShrinkDuration` and `rowShrinkEasing` have no writer | FR-48-98 (not built); FR-48-80 | Recognisers write settings by DB query | **(a)** | A `rowShrink` writer in `fill-behaviour.mjs` | No |
| 36 | The inner padding transition is emitted only when a duration is set | Spec 37 ("`rowAnimate` off removes … shrink transitions"; `sgs_row_shrink_settings_css`) | Shrink is animated by default | **(a)** Framework departs; Spec 37 governs, not Spec 48 | Emit it by default; list in render-scope | No |
| 37 | Instagram gradient hover has no holder (`groundOf`) | FR-48-81 | A ground never without its text colour | **(a)** Lost | Restore `4d7f98389` with `5b74d432b` | No |
| 38 | Script reveals and the scrolled-header reader | FR-48-102 (not built); FR-48-77 and FR-48-80 | Recognise by mechanism | **(a)** Lost | Restore `36044f919`, `e8a7a8916`, `a979a54c9` | No |
| 39 | Hover speed-up loop to Custom CSS (`99770b683`) | FR-48-109 bullet 2; FR-48-112 ("a mapping fault, not a gap") | Use the SGS setting first | **(a)** | Check the setting first; Custom CSS is the fallback | Mild |

### RF7: commerce and forms

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 40 | The product card is paired with the loop cell | FR-48-96 (in build); FR-48-14 | The working pieces sit inside the template's fixed structure | **(b)** | `commerceRegion` adds a `card` field for the component root | No |
| 41 | Card, buy-box and account options are never written (part-look not in the run) | FR-48-87: "Fill and the site run do not call it yet" | Part looks are written once on the block | **(a)** | Make part-look a site-run stage | No. Reword FR-48-87 to say "site-run stage" |
| 42 | Buy-box layout not chosen from the draft | FR-48-60 step 1 (fallback: one `sgs/buybox` plus listed Custom CSS); FR-30-16 (not built); FR-27-PS3 (built); FR-48-96 `takeColumn` (built) | The layout settings exist | **(a)** | Write the existing settings from the draft; do not build parts | No, as long as no parts block is started |
| 43 | Shop filter chips with no wrapper | FR-48-61 | `woocommerce/product-filters` wraps the taxonomy filter | **(a)** | Wrap it with `overlayMode: off` | `913dadb49` is the commit that emits it unwrapped, so this is a change to it, not a restore |
| 44 | Catalogue chain, "pick up to 3", per-cookie price | FR-48-92 (built 2026-10-27); FR-48-112 | Mapping faults, not framework gaps | **(a)** | The plan's restores (`ca6cc7ca5`, `463bd4d9a`, `23a3b93cb`, `a3e7fc27e`) | I did not verify these hashes |
| 45 | Cart kind `layout`; order `level: 1` | R-47-10; FR-48-87 | Valid shapes | **(a)** | Row 9 | No |
| 46 | Eye Care shop shows test products | FR-48-92; line under FR-48-96: fixtures "stay … deleted only after the clone is confirmed complete" | The draft catalogue replaces them after confirmation | **(a)** | Run the catalogue step, delete after confirmation | Yes. "Hide fixtures" contradicts that rule (conflict C5) |
| 47 | Form card and field paint dropped; focus looks judged on the field | FR-48-14b; §3.4 conservation | The host's part-wide setting is written once | **(b)** | Resolve state looks through `sgs/form`'s `fieldFocus*` | No |
| 48 | Conditional fields break field pairing | FR-48-100 (built, `form-scif-fields.mjs`) | Built as conditional fields | **(b)** | Pair by `fieldName` | No |
| 49 | "Companies House" shown always (`['Limited company','LLP'].includes(…)`) | Spec 04 Conditional Logic (all conditions AND; operators equals, not_equals, contains, greater_than, is_empty) | No list-membership operator | **(c)** The spec cannot express "any of" | Add an `in` operator to Spec 04 and `form/view.js` | The plan calls it "block gap" and lists no spec change |
| 50 | Indus stepper 4 labels; review always visible | FR-48-57; Spec 04 tree (review at form level) | A form step becomes `sgs/form-step` | **(b)** The code follows the spec's tree and `7f957c87c` (2026-10-23) made the review a sibling by design; the answer key holds it in a fifth step | A schema step with no fields becomes a `form-step` holding `form-review`. Update Spec 04's tree. Why every step shows at once is unproven | No |
| 51 | Indus trade form card and aside lost; form prefill lost | FR-48-95; FR-48-57 (`valueFromParam`) | The form stands on the card | **(a)** Lost | Restore `bfb53147d`, `52aca34ef`, `1294b5ae3` with tests | No |
| 52 | Forms, modals and flows cloned after pages | FR-48-57 (forms embedded by reference, ids made at site build); FR-48-95 (`modalRef` from the page map); FR-48-113 (foundation runs header, footer and nav drawer first) | By reference, so an id exists before content | **(c)** The spec is silent on build order (Bean's ruling is new) | Add forms, modals and flows (and mega menus) to FR-48-113's foundation order | No |

### RF8 to RF10: plumbing, measurement, protection

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 53 | `startSolve` passes no draft address; `solve.mjs` secrets path unresolved | FR-48-113; FR-48-55 `secretsPath`; FR-48-100 Status (site run passes `--draft-url`) | The draft address is passed | **(a)** | One launch helper | No |
| 54 | Strip keeps layout ids; "same ids" uses `siteOf` not `mirrorOf` | FR-48-113 mentions strip only | Silent | **(b)** | Strip clears ids; use `mirrorOf` (S7) | No |
| 55 | Rerun content marker; stored option scalars; surfaces the run did not build | FR-48-55; FR-48-18 exit (options "read back as the page map says"); FR-48-113 ("exits 0 only when every stage ran") | Resume by row id; compare in stored form | **(a)** Lost (`9cb1e201c`, `2d65a2be7`) | Restore with tests | No |
| 56 | Indus posts carry two titles and breadcrumbs | FR-48-56 and FR-48-96 ("Where one template serves many instances (… blog posts) the draft's fixed outer structure is the template's own design … only … body … becomes the working piece") | The `single` copy owns the frame; the post holds the body | **(a)** The proof ran posts with a whole draft page | Post body only | Yes. The plan calls narrowing "new design: Bean's call"; the spec already states it |
| 57 | Page parents and titles on rerun | FR-48-98 Status ("re-apply only if a clone shows the fault"); FR-48-55 step 2 | Set after create | **(a)** The proof shows the fault | Restore `489e48e65`; check `39d3ea2c1` | No |
| 58 | Site check does not scroll a form into view | FR-48-83 Status (scripted checks) | The check reaches the form | **(a)** Lost | Restore `f4f63ec77` | No |
| 59 | Stale page map; modal openers and lens flow measured on the wrong page | FR-48-95 (built in part); FR-48-30; §3.6 item 25 | `opens` in the page map | **(b)** The reader is current; the stored page maps pre-date it | Rerun `intake --page-map` for all three clients; refuse a map older than its reader (S7) | No |
| 60 | The walker refuses a quarter of its runs ("auto-scrolled") | §3.6 items 20 and 25 (built) | A refused state is one open `not-at-rest` row | **(b)** The refusal is by design; failing the whole walk exceeds "one open row". Cause unproven (item 25's route fragment is the leading suspect) | Prove the cause first, then one open row | No |
| 61 | Parity text carrier; status failure class; `run-tests` without a browser | No spec (nearest §3.6 item 19) | n/a | n/a | Restore `e2a7b0767`; tooling fixes | No |
| 62 | `content-coverage.mjs` removed (`53ee1a6c1`) | No spec (nearest FR-48-103, FR-48-66) | n/a | n/a | Restore it | No |
| 63 | Route tests deleted with no gate | No spec (nearest R-47-1) | n/a | n/a | Add the check to `lint.mjs` | No |

### Further rows from the Restore map

| # | Fault | Governing FR (Status) | Spec design | Class and reason | Fix that follows | Differs? |
|---|---|---|---|---|---|---|
| 64 | Page dimming behind drawers | Spec 36 scrim section: `supports.sgs.scrim`, `scrimColour`, `scrimOpacity`, `scrimBlur` on the drawer and bar; FR-48-95 (modal frame's scrim) | The dimming is block settings | **(a)** Never built for drawers | Map the draft's backdrop to those settings | The plan names no target |
| 65 | Mega cards: `sgs/media` ratio and height | FR-49-35: style rows and absorption "stay pure modules … never twice" | The universal route writes them | **(b)** The record puts ratio and height on `sgs-media-el`, a part inside the figure, while the paired element is the root | Fix part pairing in the universal route (FR-48-101 `rootIsPart` conditions) | Yes. The plan wires `slotFromReads`, which contradicts FR-49-35 (conflict C3) |
| 66 | `sgs/media` and stale statuses: eight "built" FRs the proof shows broken | §3.2 and FR-48-3, FR-48-6 Links, FR-48A-13, FR-48-113, FR-48-55, FR-48-81, FR-48-94, §3.6 item 20 | n/a | Status text is wrong | Correct them (S15), and add FR-48A-13 plus its line-65 "store-call openers built" | No |

## New inventions the spec or a lost commit already holds

1. "Small map" for settings with no CSS property (row 5): FR-48-79's `meaning` query.
2. "Pseudo-layer equivalence" (row 3): FR-48-86 layer 4.
3. "New shared validator module" (row 9): `lint.mjs` and Fill's handover validator.
4. "Narrowing a with-content post body is new design" (row 56): FR-48-96 and FR-48-56.
5. Page dimming "reuse the modal frame's backdrop" (row 64): the drawer's own scrim settings exist.
6. "Origin wins" for stale pairs (row 31): FR-48-7's refuse-when-stale rule.
7. Point fix to `notPainted` (row 32): FR-48-104's whole pass.
8. "Glasses (soon)" ruling and S6's soon entries: already in FR-48-30, so only the href-anchor part of S6 is needed.

## Plan fixes that contradict a spec rule or Bean ruling

- **C1** RF5 exact values against R-47-7, FR-48-36 and FR-48-86 layer 5. It is Bean's own 2026-11-24 ruling, so the spec changes, not the fix.
- **C2** RF4/D3 exact thresholds against FR-48-50 step 1 and Spec 32 FR-32-13 (Bean's ruling: 1060 snaps to 1024).
- **C3** RF1's `_box` port against §3.2 "Reading a declared look" and the retired intrinsic-ratio row, and L3's wiring of style rows against FR-49-35's "never twice".
- **C4** RF2's strict-off against FR-48-113's literal text (the spec itself conflicts).
- **C5** Hiding or removing fixture products in Eye Care's shop against the "deleted only after the clone is confirmed complete" rule.
- **C6** RF1's gate on `css_element` against R-47-6 ("seed, never replace").

## Plan omissions

These are faults the hunts found that no fix group names:
- `sgs/social-icons` `draftSlots`: FR-48-108 (a).
- The trust bar's layout placed on `.sgs-container__inner`, which the block never draws. Fix the record per R-47-6, not a reader-side mapping.
- Eye Care's 25 "Click Here" buttons at 375: FR-48-97 "Default text does not survive" (a).
- `682a34d40`, link-only lists (S5): it appears only in D2, with no fix group.
- The mega-panel drawer look trio `0a9a631bf`, `cc0e44f8a`, `91031aba3`, plus `774432a98` and `aefa71710`.
- C9 (footer link underline ties) and C10 (apply halts three Indus surfaces).

## Spec changes Bean must approve

- **S1:** drop `--strict` from FR-48-113 and state that strict is test-only (row 8).
- **S2 (narrow):** one sentence in §3.2: a placement records the fixture variant it paints under, and Fill offers it only to a node in that variant (row 2).
- **S3:** exact stated values. Tolerance applies only when comparing renders (R-47-5, R-47-7, FR-48-36, FR-48-86 layer 5). I recommend lengths only, with colour ΔE ≤ 2 kept.
- **D3:** the 5% breakpoint snap, whether `collapsePoint` and Custom CSS write the exact value. I recommend exact there.
- **R-47-10 reword:** "a style-valued css_property" instead of "any non-null" (row 10).
- **S4:** narrow FR-48-109's refusals (row 29).
- **S11:** write the handover shape and the content-attribute storage shapes into the spec.
- **Spec 04:** add an `in` (any-of) conditional operator, and fix the tree so a schema step with no fields holds the review (rows 49 and 50).
- **FR-48-113:** add forms, modals, flows and mega menus before pages (row 52).
- **FR-48-87:** part-look is a site-run stage (row 41).
- **S7:** page-map freshness refusal.
- **S5, S8, S9 and S10:** wording only; S5 and S9 follow later rulings that already govern.
- **S15:** status corrections (row 66).
- **Not needed:** S12 and S13 are unnecessary on this evidence. S12 only matters if the `_box` port goes ahead, and I advise dropping that port. S13's ticker default I did not evaluate. Spec 48A's motion row (S14) I did not re-check.

## Calls I made

- Treated spec.out and the L1–L5 reports as evidence and spot-checked them against the specs, the framework DB and git; I did not re-investigate code or run anything.
- Counted a case as (c) only where I could name why the spec's own design cannot give the right result; a spec that is merely silent counts as (a) or (b) plus a spec sentence.
- Where two spec texts conflict (FR-48-113 against §3.4), I took the later Bean ruling as governing.
- Left row 36 under Spec 37, not Spec 48, because the framework side governs it.
- Did not verify the catalogue-chain hashes (row 44) or the hash `6fb7356c8`.
- Scratch helper only: `E:\sgs-tmp\deep-spec-first\fr.py`.
