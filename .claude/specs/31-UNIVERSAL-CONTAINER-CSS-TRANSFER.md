---
doc_type: spec
spec_id: 31
spec_version: 0.3-CLEAN-MODULAR-REBUILD
project: small-giants-wp
thread: cloning-pipeline
title: "Universal Container/Grid CSS-Transfer Architecture"
created: 2026-06-17
status: ADVERSARIAL-COUNCIL-CORRECTED (GO on a clean modular stage-by-stage rebuild, 2026-06-17) — §12 is the authoritative build direction; pending /phase-planner
council_register: reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md
pipeline_map: reports/pipeline-routing-map-2026-06-17.html

# ⚠ READ §12 FIRST. As of v0.3 (adversarial-council, Bean-locked) this is a CLEAN MODULAR REBUILD, not a fix-in-place of the legacy converter. §12 supersedes the fix-in-place assumptions in §1 (consolidate-the-8-functions) and §11 (legacy build strategy). §1-§11 remain the canonical ARCHITECTURE (layers, routing, anti-cheat intent); §12 is the corrected BUILD DIRECTION + the Tier-1 foundation the rebuild is sequenced against.
supersedes: plans/2026-06-16-grid-container-extraction-rebuild-design.md (under-specified earlier draft)
amends: specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md §FR-22-5, §FR-22-21
acceptance_baseline: reports/2026-06-14-clone-vs-draft-defect-register.md (families B/C/D/E/F/K)
binding_rules: R-22-1, R-22-2, R-22-3, R-22-6, R-22-9, R-22-11, R-22-15
---

# Spec 31 — Universal Container/Grid CSS-Transfer Architecture

## 0. Plain English (what this is, why it exists)

**What.** Every cloned page section renders through ONE engine — `sgs/container` and its PHP wrapper (`SGS_Container_Wrapper`), which 30 composite blocks share. The cloning converter (`convert.py`) reads a draft mockup's CSS and is supposed to put every value the draft holds into the right block setting, at the right screen size (mobile / tablet / desktop). **Today it transfers only a subset, routes some to the wrong place, runs several competing lift paths that disagree, and still emits raw `sgs/container` instead of the proper composite for whole sections.** That is the entire "55% desktop fidelity" gap.

**Why a full architecture, not patches.** This stage has failed repeatedly because fixes were local: one block made to work in one context, score inflated by a cheat, then collapse everywhere else. This spec defines the *whole* target system — every block type, every layer, every screen tier, every child-shape — plus the completion goals and the cheat-detection that make a partial or cheated implementation **impossible to mistake for done**.

**The one-sentence target.** A single DB-driven, name-free routing engine reads any draft CSS property and places it on the correct block attribute at the correct responsive tier, for `sgs/container` and every container-bearing composite identically — with completeness measured against a live coverage ledger and cheats caught by structural gates, not by eye.

---

## 1. System map — where CSS transfer happens

The pipeline (`cloning-pipeline-flow.md`) touches CSS transfer at exactly these points. Spec 31 governs all of them as ONE system:

| Stage | Role in CSS transfer | Current state |
|-------|---------------------|---------------|
| **0.7 `css_router.py`** | Splits the draft `<style>` into 4 destinations: **D0** global/reset, **D1** typed-attr lift→block attrs (token-snapped), **D2** wrapper-CSS scoped `.page-id-N`, **D3** gap-candidate DB | Routes to D1, but its D1 output is **not consumed** by Stage 4 (the merge was deleted 2026-05-27, convert.py:807) |
| **Stage 2** block-match | Picks the block for a section; no confident match → `sgs/container` fallback | **Method-2 gap:** sections land as raw `sgs/container` (conf 0.10), NOT native composites (`.sgs-hero`→`sgs/hero` routing pending) |
| **Stage 3** slot list | Annotates each attr with `canonical_slot`/`role` from block.json | metadata only (D194/DEC-5) — not the structural router |
| **Stage 4 `convert.py`** | **PRIMARY lift engine** — the universal walker folds wrappers and lifts box/grid/typography CSS onto attrs at 3 viewports | Has **~5 overlapping lift functions** + ~13 per-block `if slug==` carve-outs; the consolidation is the core of this spec |
| **Stage 4.5 / 0.8** | Token-snap (ΔE≤1 / ≤1px) + theme-width detection | works; literal kept + gap logged on miss |
| **Stage 8 / 11 / 11.5** | Live pixel-diff + draft-centric parity gate (375/768/1440) | the verification floor |
| **Stage 9** | 5-bucket leftover router → writes `attribute_gap_candidates` | **the live completeness ledger** — central to Spec 31 |

**Architectural principle #1 — ONE lift path.** The lift functions in `convert.py` (**8 active, not ~5** — `_lift_root_supports_to_style`, `_lift_wrapper_css_to_container_attrs`, `_lift_typography_to_block_attrs`, `_lift_content_band_max_width`, `_lift_uniform_grid_item_css`, `_lift_scalar_attrs_by_selector`, `_lift_styling_attrs_by_selector`, `_lift_scalar_media_from_img`; council-verified count), the css_router D1 path, and any retired sidecar remnant collapse into a single DB-driven dispatch. They have genuinely DIFFERENT destinations (WP supports / container box / typography / grid-item / scalar content / scalar media) — so the consolidation is a larger, higher-regression-risk task than "~5" implied; it MUST gate on both conformance suites. Two paths that can disagree is itself a defect class (Family K duplicate-emit is a symptom). **css_router.py decision (MF-2):** Stage 0.7 routes CSS to D1 but Stage 4 no longer consumes it (merge deleted 2026-05-27). The build MUST formally either (a) retire css_router's D1 path or (b) rewire Stage 4 to consume it — leaving it as a dead stage that silently strands properties is forbidden.

---

## 2. The universal model — four orthogonal axes

Every container-bearing block is described by four independent axes. The routing engine must handle **every combination**, with no per-block code.

### Axis 1 — LAYERS (where in the box a property lives)
Per FR-22-21 + the design-gate doc. A draft wrapper decomposes into at most four layers; each has a distinct attr destination, detected by **CSS signature + structural position, NEVER by class name** (DEC-1/DEC-3, precedent D85):

| Layer | Detected by | Attr destination |
|-------|-------------|------------------|
| **L1 OUTER box** | the section-root element itself | native `style.*` + **`align`**/**`maxWidth`**/`padding*`/`background*`/`min-height`. **Rule (UPDATED — D230 `484d04d9` / D231 `d5416ae8`, SHIPPED + LANDED 2026-06-18):** `max-width` ABSENT → `align:"full"` (WP-native breakout, `supports.align`); PRESENT → `maxWidth` (string **literal**, exact draft value — decimals+unit preserved, no 5% theme-snap, no `int()` truncation) + responsive `maxWidthTablet/Mobile` at 767/1023. **`widthMode`/`customWidth` RETIRED.** |
| **L2 CONTENT-WIDTH (inner band)** | `--content-width` custom-prop decl (deterministic) OR `max-width`+`margin:auto` signature (scraped fallback) | `contentWidth` (token `normal`→content-size / `wide`→wide-size / `full`→no cap, OR a **literal**; **default `full`** = blank fills the outer, D231) + `contentBandPadding*` (via the `max-width ≡ width` CONTENT-layer suffix equivalence) |
| **L3 GRID + PER-ITEM** | the level carrying `display:grid`/columns | `gridTemplateColumns`/`gap`/`gridItem*`. UNIFORM child box-CSS → `gridItem*` defaults; UNIQUE per-item CSS → that child block's own CSS |
| **L4 GRID-PER-AREA** (FR-22-21.3) | named grid areas — flat `<areaName>+<Suffix>` families | `contentPadding*`, `mediaBackground`, … via `db.attr_for_area_property`; areas declared in `supports.sgs.gridAreas` |

Rules that bind every layer: the container **NEVER imposes alignment on children** (step 5); any property with no attr destination is **FLAGGED, never silent-dropped** (step 6); `display`/`grid-template-*` are **EXCLUDED from cross-node inline lift** (GAP-3 — inline beats `@media` and collapses grids).

### Axis 2 — KIND (which layers a block exposes)
`block_composition.container_kind` (31 blocks): **section** (all layers + background/overlay/SVG/shape), **layout** (L1–L4 width+grid, no background layer), **content** (L1+L2 width+padding only, no grid, no background). KIND **gates which attrs exist as a destination**; it does NOT change routing logic (Spec 29 §8, D194).

### Axis 3 — CHILD-SHAPE (where per-item / child CSS goes)
The axis Bean called out explicitly. Decided by `block_composition.has_inner_blocks` + the DEC-4 fork (`canonical_slot` + `role` + `attr_type` read together):

| Child-shape | has_inner_blocks | Per-item / child CSS destination |
|-------------|------------------|----------------------------------|
| **InnerBlocks** (card-grid, feature-grid, accordion, tabs, multi-button…) | 1 | Each grid item IS a child block → that child block's own CSS attrs. UNIFORM item CSS → parent `gridItem*` defaults |
| **Scalar** (testimonial, team-member, trust-bar, option-picker…) | 0 | Child content/style lives in the parent's typed scalar attrs (e.g. per-area `content*`/`media*`) |
| **Mixed** (hero, cta-section…) | 1 + scalar areas | Full wrapper attrs (L1–L4) **plus** per-area scalar attrs (`headline`, `contentPadding*`, `mediaBackground`) — routed by L4 area lookup. The cross-node predicate `slot_has_equivalent_block(block, slot)` forks: TRUE → CSS to child block; FALSE → lift to parent box attrs |

### Axis 4 — VARIANT (which extra slots exist this run)
`blocks.variant_attr` names the selector attr; `variant_slots(block_slug, variant_value, unique_slot)` holds each variant's **discriminating** slots (set-difference vs siblings). The detector counts how many of each variant's `variant_slots` were populated **from the draft extract THIS run** (never the block's stored attrs — that was the `$is_split` cheat) and sets the highest-count variant. Code is universal (`detect_variant`, `variant_attr_for`); the gap is DATA (block.json `variants` maps unpopulated for most blocks). Query, never guess (e.g. hero `split` = `gridTemplateColumns`/`splitGap`/`splitImage*` → 2-col ≥768, stacked <768).

---

## 3. The routing algorithm (DB-driven, name-free) — the heart of the system

For each draft CSS declaration `(css_property, value)` resolved for an element at a given tier:

1. **Detect the LAYER** (L1–L4) by CSS signature + structural position (§2 Axis 1). Never the class name. **MF-3 structural-position guard (council RISK 2, HIGH):** the current `_detect_content_layer` sees only CSS declarations, not whether the node is the section ROOT or an inner band — so a section-root that legitimately declares `max-width:1200px;margin:0 auto` would misroute its `max-width` to `contentWidth` instead of the OUTER `customWidth`. The detector MUST be passed (and enforce) the node's structural position: **CONTENT-WIDTH (L2) detection fires ONLY on a non-root, direct-descendant inner element.** This precondition is a build requirement, not an assumption — document it at the detector + add a guard that rejects a root node.
2. **Resolve the destination attr** via a per-block lookup `(block_slug, layer, css_property) → attr_name` (`db.attr_for_layer_property` / `attr_for_area_property`). NOT prefix string-concat — attr names vary per block.
3. **Disambiguate** where one css_property maps to multiple suffixes (the completeness audit's bite-list). **MF-4 mechanism reconciliation (council RISK 3, MED):** `attr_for_layer_property` today returns the FIRST DB-rowid match, NOT a `block_selectors.element` lookup. For current blocks this is safe (only one of each ambiguous pair exists per block), but it is insert-order-fragile if a block ever declares both. The build MUST either (a) make `block_selectors.element` the actual disambiguation key, or (b) add a hard guard: when ≥2 candidate attrs exist for one (block, layer, property), FAIL loudly rather than silently rowid-pick. Do not ship the rowid-first-match as the "intended" mechanism.
   - `max-width` → **by LAYER (UPDATED D230/D231):** L1 OUTER → `maxWidth` (literal) when present, else `align:"full"`; L2 band → `contentWidth` (token or literal). The old 3-way `MaxWidth`/`ContentSize`/`WideSize` widthMode-snap is RETIRED — the OUTER no longer snaps to a token. Resolve by LAYER (structurally guarded per MF-3) + the MF-4 disambiguation.
   - `align-items` → `AlignItems` vs **`VerticalAlign`** — **LOCKED** (D172 + memory `converter-attr-must-match-the-attr-render-reads`): container-wrapper blocks render `verticalAlign`, so target `VerticalAlign` for them. Ratified, not reopened.
   - `box-shadow` → `Shadow`(role=color) vs `BoxShadow`(role=visual) — genuinely unbuilt; resolve by querying `block_attributes` for the shadow attr the target block actually declares, then map to that (DB-first, no new code).
   - colour/bg/border-radius spelling aliases → pick the attr the **target block actually declares** (`block_attributes`).
4. **Resolve the TIER attr.** Tier siblings (`…Mobile/…Tablet/…Desktop`) have **NULL `canonical_slot`/`role`** and `is_responsive` is unreliable (211 flagged vs 527 real). So: resolve the BASE attr via slot/role, then **re-append the breakpoint modifier suffix** from `modifier_suffixes(kind='breakpoint')`. Never slot-lookup a tier attr directly.
5. **Parse + serialise** the value by `property_suffixes.kind_override` (`number_unitless`/`number_px_or_em`/`string`) + `block_attributes.attr_type`. (Family B = the `unitless` sentinel must round-trip and be stripped at render — verify render.php.)
6. **Token-snap** when `property_suffixes.is_token_matched=1`: snap to the nearest `design_tokens.css_var` (ΔE≤1 / ≤1px) else keep literal + log gap. Per-client divergences only emit as raw instance values (FR-26-C6); repeated values are candidates for derived globals (deferred).
7. **Validate** against `block_attributes.enum_values` (reject `widthMode='banana'`) and `block_supports` (gate L1 full-bleed on the block declaring `align:["full"]`).
8. **No destination?** → write to `attribute_gap_candidates` with `proposed_action='add attr: css=… raw=… class=… run=…'`. NEVER silent-drop, NEVER emit as inline `@media` (R-22-6), NEVER fall to D2 scoped CSS when a D1 attr destination exists (R-22-15c).

### Responsive: device-tier vs visual breakpoint (the F-fork — council to ratify)
- **Device-tier system** = the SGS Mobile/Tablet/Desktop attrs, rendered by the wrapper + mapped by the converter, fixed at **768/1024**. ONE vocabulary: delete the parallel hardcoded `_GRID_TABLET_BP`/`_GRID_DESKTOP_BP` constants; route grid through the same `db.breakpoint_suffix_rules()` every other lift path uses.
- **Arbitrary visual breakpoint** = a single draft rule at 600/640/781 for a design reason. **D228 lock: these are DISTINCT and must NOT be coerced into a device tier.** Family F is the converter *remapping* a draft 640 onto 768 — the forbidden conflation.
- **Recommended resolution (F-ii, per R-22-6 + FR-22-5.2):** map draft `@media` thresholds that ARE device-tier values (767/768/1023/1024) to the tier attrs; **faithfully preserve** any non-device-tier threshold as a raw uid-scoped rule (passthrough), or log to D3 if no passthrough path — **never snap, never drop**. The council ratifies F-i (snap) vs F-ii (preserve), grounded in whether Mama's grid breakpoints are device-tier or visual.

---

## 4. DB-column utilisation map (every useful column → its role)

Spec 31 derives the entire routing table from the DB (R-22-1). Columns in active use:

| Table.column | Role in the engine |
|--------------|--------------------|
| `property_suffixes.(css_property, suffix, role, kind_override, is_token_matched, token_source)` | THE property→attr-suffix→parse map (step 2/5/6) |
| `block_attributes.(attr_name, attr_type, canonical_slot, role, enum_values, derived_selector)` | the destination table; slot/role join (step 2), serialise (step 5), validate (step 7), verify-landed (`derived_selector`) |
| `block_composition.(container_kind, has_inner_blocks, wraps_block)` | KIND = which layers exist (Axis 2); has_inner_blocks = per-item destination (Axis 3) |
| `modifier_suffixes.(suffix, kind)` | breakpoint (tier), side/corner (shorthand decomposition), state (`:hover`) suffix grammar (step 4) |
| `blocks.variant_attr` + `variant_slots.(variant_value, unique_slot)` | variant detection (Axis 4) |
| `block_supports.(support_name='align'/'spacing'/'border'/…)` | gate L1 full-bleed + native-vs-custom attr (step 7) |
| `block_capabilities.(capability)` | `grid-layout`/`full-width-banner` gates; `scalar-styling-lift`/`scalar-content-lift` = the existing DB opt-in precedent for a new `container-css-lift` capability |
| `block_selectors.(element, selector)` | OUTER/CONTENT/typography layer disambiguation (step 3 max-width 3-way) |
| `design_tokens.(default_value, css_var, token_type)` | token-snap normalisation (step 6) |
| `roles.(role_name, classification)` | join-vocabulary integrity for property/attr role |
| `slots.(slot_name, aliases, standalone_block)` | element recognition (which BEM element → which block) — Stage 3, not CSS routing |
| `attribute_gap_candidates.(proposed_action)` | the LIVE completeness ledger / prioritised backlog / anti-cheat evidence (2,373 rows; the `add attr: css=…` rows name every dropped property) |
| `html_tag_to_core_block` | atomic-tag-swap shape fallback only (R-22-2: tag is shape, not recognition) |

Columns with **no CSS-lift utility** (documented so a reviewer knows they were considered, not missed): `block_styles.*` (named presets), `variations.*` (editor preset bundles), `components.*` (editor JS), `block_changes.*` (audit log), `blocks.(grade/source/has_render_php)`.

---

## 5. Coverage matrix — the completeness instrument

The matrix is the artefact that makes "everything accounted for" measurable. **NOTE (v0.3 supersession): §12.2.1's draft-derived CSS Accounting Ledger is now the PRIMARY completeness instrument — the matrix only sees cells it already knows about (it cannot see the ~15 no-suffix-row property classes), whereas the ledger accounts for the whole draft declaration stream. The matrix is a secondary validation/dashboard, not the completeness gate.** **Rows** = every container-bearing block (30 composites + `sgs/container` + `sgs/media`). **Columns** = every capability × layer × tier × child-shape destination. **MF-7: the matrix MUST be an auto-generated artefact (`generate-coverage-matrix.py`)** — rows enumerated from `block_composition`, columns from the DB — so it can never silently under-count. It does not yet exist; building it is a completion task, not prose.

For each cell the state is one of:
- **COVERED** — a draft value for this (block, layer, property, tier) round-trips to the live clone via the universal path, live-verified per §7b (element present, draft value ≠ wrapper default).
- **GAP** — no destination attr or no property_suffixes row (→ seed via the canonical path; tracked in `attribute_gap_candidates`).
- **BLOCKED** — destination attr exists but is unreachable on a real clone until a sibling phase lands (e.g. L4 per-area + scalar composite attrs are unreachable until Method-2 routes sections to native composites — see §9 Q2).
- **UNVERIFIED** — not live-probed on a fixture that actually exercises it (block absent from the canary, or only tested where the draft value equals the default). NOT the same as COVERED.
- **CHEAT** — the cell "passes" only via a forbidden mechanism. **MF-7: CHEAT is classified from the §7a gate OUTPUT, not human/LLM judgment** — a cell is CHEAT iff a gate flagged the mechanism that produced its value (per-block branch / hardcoded dict / `!important` / mirror-emit / D2-when-D1). This removes the gameable judgment call the red-team flagged. **A CHEAT cell scores ZERO**, never partial — this is what stops score inflation.
- **N/A** — the KIND doesn't expose this layer (e.g. grid on a content-KIND block).

**Completion = every non-N/A cell is COVERED or explicitly BLOCKED-with-sibling-phase, with zero CHEAT cells, zero UNVERIFIED cells, and the open GAP set explicitly listed** (each GAP either fixed or logged with a reason).

### Known property GAPs to seed (from the live ledger + audit)
HIGH-impact missing `property_suffixes` rows the container/grid system needs: `order`, `grid-area`, `grid-template-areas`, `grid-row`, `grid-column`, `overflow`(+x/y), `object-fit`, `object-position`, `position`/`inset`/`top`/`right`/`bottom`/`left`/`z-index`, `background-size`/`-position`/`-repeat`/`-attachment`, `flex` shorthand, `aspect-ratio`. Each seeds via block.json `supports.sgs` OR a dated `migrations/*.py` row + a full `/sgs-update` reseed — **never a code branch, never a manual DB edit**.

---

## 6. Completion goals (the gate — Spec 31 is NOT done until all pass)

1. **One lift path.** The **8** `convert.py` lift functions (§1) + the css_router D1 path collapse into a single DB-driven dispatch; `grep` finds no second path writing the same attr; css_router's D1 fate is formally decided (MF-2). Gate on BOTH conformance suites.
2. **Zero per-block literals + zero hardcoded dicts.** No per-block branch in ANY orchestrator `.py` (the ~13 carve-outs de-literalised), including indirect forms (dict/frozenset/`.get(slug)`); `_SUFFIX_ATTR_OVERRIDES` (972) + `prop_map` (1519) removed/DB-sourced. Only `iconCircleBackground` in `_atomic_attrs_for` may remain, justified inline.
3. **One breakpoint vocabulary.** ALL THREE parallel systems unified onto `db.breakpoint_suffix_rules()`: delete `_GRID_TABLET_BP`/`_GRID_DESKTOP_BP` (convert.py:5232-33), eliminate the in-code `_BP_SUFFIX_MAP` (convert.py:980), and wire the wrapper-css lift path (currently uses neither). The F-ii decision (§9 Q1) implemented.
4. **Coverage matrix green.** Every non-N/A cell COVERED for all 31 blocks × 4 layers × 3 tiers × 3 child-shapes; zero CHEAT cells; GAP set listed.
5. **All 6 register families flip defect→match** on a live computed-style probe (page 8, 375/768/1440) — B/C/D/E/F/K each verified per-row (R-22-11), not by aggregate score.
6. **Both conformance suites green** (Gate A `scripts/tests/test_converter_conformance.py` + `converter_v2/tests/`) + a fresh `/sgs-update` reseed reproduces every DB change.
7. **Method-2 is IN-SCOPE, foundational** (resolved — §9 Q2 + §12.0, Bean-locked): native-composite routing (`.sgs-hero`→`sgs/hero`) is built at its pipeline stage (Stage 2/3 recognition/match) alongside every other block, NOT deferred to a sibling phase. (Supersedes this goal's earlier "decision to be recorded" framing.)
8. **Parity full-fidelity rises measurably** from baseline (61.82% M / 59.09% T / 55.45% D), desktop most.

---

## 7. Anti-cheat detection — making cheats impossible to hide

Bean's core requirement: a cheat must be **structurally obvious**, not score-inflating. Two complementary defences.

### 7a. Cheat-detection gate — `check-converter-cheats.py` (NEW; Python not JS, council MF-6)
The red-team proved the naive grep signatures have HIGH-severity bypasses. The gate is a **Python script that queries the DB**, scans the WHOLE `orchestrator/` tree (not one function), and **scans the PHP/CSS render surface, not just converter output**. It fails the build on any of:

1. **Per-block literal — WHOLE-tree + indirect forms.** Not just `if slug == 'sgs/`. Scan every `.py` under `orchestrator/` for: `slug ==`/`slug in`/`slug.startswith('sgs/`/`.get(slug)` against slug strings; dict/`frozenset`/`set`/`list` literals whose keys/members match `"sgs/[a-z-]+"`. Allowlist carries **function scope** (e.g. `iconCircleBackground` legitimate only in `_atomic_attrs_for`). *(Existing guard `check-atomic-slug-literals.py` covers only `_atomic_attrs_for` — HOLE 1; this supersedes it.)*
2. **Hardcoded property→attr dict — R-22-1.** Scan all `orchestrator/*.py` for dict literals with CSS-property string keys → attr-name strings. **Two such violations ALREADY EXIST and must be removed/DB-sourced as part of this work:** `_SUFFIX_ATTR_OVERRIDES` (convert.py:972) and `prop_map` (convert.py:1519). *(HOLE 8.)*
3. **`!important` over a faithful property — scan PHP/CSS, NOT converter output.** The converter already strips `!important` (`_strip_important`), so the real cheat lives in `class-sgs-container-wrapper.php` + block `style.css`/`editor.css`. The gate queries `property_suffixes.css_property`, then greps those render files for `<prop>...!important`. *(HOLE 3 — gate was scanning the wrong surface.)*
4. **Parallel breakpoint vocabulary — numeric-literal scan + dict-ban.** Ban integer literals 640–1100 in `convert.py` outside a `db.breakpoint_suffix_rules()` call (a name-scan misses coincidental literals); AND eliminate the in-code `_BP_SUFFIX_MAP` (convert.py:980) — it must derive from `modifier_suffixes`. *(HOLE 4.)*
5. **Mirror-emit / `sourceMode='bound'` / BEM-element className — WIRE THE EXISTING GATE.** `check_no_mirror.py` already has the right logic but runs `--report` (exit 0) and is NOT in `prebuild`/`pipeline-stage-gate.py` (its own `WIRE POINT` comment, line 17). After two consecutive zero-violation `--report` runs, switch it to `--enforce` and wire it. *(HOLE 5 — gate exists but enforces nothing.)*
6. **D2-when-D1-exists — DB cross-join at pipeline close, not grep.** A Python check at pipeline end: for each property stranded in `variation-d0-d2.css`, query `property_suffixes`+`block_attributes`; if a D1 destination exists for that (block, property), FAIL. Also: a D3 gap-candidate entry that is ALSO routed to D2 is a CHEAT (silently drops to scoped CSS while looking like an honest GAP). *(HOLE 6.)*
7. **Sentinel leakage.** Scan emitted block attrs for the literal `"unitless"` (and any parse sentinel) AND scan the live rendered DOM. Family B's render-side strip must be confirmed per block.

### 7b. The structural-insufficiency rule (R-22-15 / FR-22-18 — load-bearing)
**Rendered-DOM structural parity is necessary but NOT sufficient as a closing gate** — a faithful *mirror* (the cheat) satisfies structural parity by construction, so structure-match alone would pass the very cheat the rules ban. Therefore:
- the **closing gate is the live-homepage per-section visual check vs the DRAFT** (R-22-11: compare to ground truth, not internal tree shape) **+ Bean's co-authoritative eye** (R-22-13).
- internal metrics (emit-green, conformance-green, "mechanism fires", aggregate parity %) are **progress signals, never closing gates**. A cell is COVERED only when a live computed-style read equals the draft.
- the `attribute_gap_candidates` ledger is checked every run: a row count that DROPS without a corresponding seeded property is suspicious (a property silently stopped being logged = possible silent-drop cheat).

**Three live-probe false-win guards the closing gate MUST add (council MF-7):**
- **Empty-section false-win** (known trap): an empty/soft-failed section contributes no DOM, so a computed-style probe trivially "matches". Gate every probe on `el.innerText.length > 0` (and element-present) FIRST — a missing element is a FAIL, never a match.
- **Single-canary blind spot**: page 8 (Mama's) does NOT contain all 31 blocks × variants (tabs, accordion, gallery, the `sgs/media` image family E are absent). A page-8 match does NOT prove the universal engine. The coverage matrix's live-verify must run across **a fixture set that exercises every block × variant × layer**, not one page — blocks absent from any live page are `UNVERIFIED`, never `COVERED`.
- **Coincidental-default match**: a clone value can match the draft because the wrapper's hardcoded default happens to equal it (transfer never tested). Each COVERED cell must be verified on a section whose draft value **differs from the wrapper default** — otherwise the cell is `UNVERIFIED`.

---

## 8. Reconciliation with the 6-family defect register

Every register family resolves to a Spec-31 mechanism — no family is orphaned:

| Family | Spec-31 mechanism |
|--------|-------------------|
| **B** `1.65unitless` | §3 step 5 — sentinel round-trip + render-side strip (verify render.php) |
| **C** dropped mobile font tier | §3 step 4 — tier-attr re-append + the F-fork breakpoint vocabulary reaching `…Mobile` |
| **D** dropped max-width | §3 step 3 — max-width by layer. **RESOLVED for the OUTER box (D230/D231 SHIPPED 2026-06-18):** OUTER `max-width` → `maxWidth` literal (exact) or `align:"full"`; `widthMode`/`customWidth` retired. L2 band → `contentWidth` (token/literal). The clean rebuild re-implements this as a per-resolver module. |
| **E** dropped image styling | §5 — seed `order`/`object-fit`/`border-radius`-shorthand GAP rows; route media box-CSS to `sgs/media` |
| **F** grid breakpoint inversion | §3 — one breakpoint vocabulary + F-i/F-ii; delete parallel constants |
| **K** duplicate emit | §1 — one lift path (collapse the ~5 functions); cascade last-wins fix |

DEC-1…5 (block-match / Bean's-eye) and HF-1…7 (theme template-part) are **explicitly out of scope** for Spec 31 — they are recognition / theme-layer, not container-CSS transfer.

---

## 9. Open questions — RESOLVED by the 2026-06-17 qc-council (historically grounded)
1. **F-i vs F-ii → F-ii (preserve draft breakpoints).** Bean-mandated, not a fresh call: D228 + the `device-tier-vs-visual-breakpoints-are-distinct` memory rule lock it (device-tier attrs use 768/1024; arbitrary visual thresholds preserved). Implement the passthrough case. **One residual check:** confirm Mama's 640px grid breakpoint is visual, not device-tier, before routing it.
2. **Method-2 → FOUNDATIONAL, NOT deferred (Bean override 2026-06-17).** The council recommended deferring composite routing; Bean overruled: deferring it lets route-specific decisions be made now that harm other routes later, and forces rebuilds. Native-composite routing (`.sgs-hero`→`sgs/hero`) is in scope and built at its pipeline STAGE (block recognition/match) alongside every other block — not as a sibling phase. No matrix cell is BLOCKED-for-later; every route is made reachable when its STAGE is built. (The D163 premature-lift trap is avoided not by deferring, but by building the stage completely + cheat-checked before moving on.)
3. **Consolidate the lift paths FIRST, then seed.** D225 sequencing model (fix the foundational collector, then lift on top). Seeding new properties into a still-split dispatch produces Family-K duplicate-emit + non-isolatable regressions (the documented anti-pattern). Gate on BOTH conformance suites (the D222 lesson — a "conformance passed" that ran only one suite is unsafe).
4. **`align-items` LOCKED → `verticalAlign`** (D172 + memory rule, ratified). **`box-shadow`** is genuinely unbuilt → resolve by DB-querying the shadow attr the target block declares, then map (no new code). Mechanism already in §3 step 3.
5. **GAP backlog → both, orthogonally.** Seed the structural-hole properties (`order`/`grid-area`/`grid-template-areas`/`position`/`inset`/`overflow`/`object-fit`/bg-positioning/`flex`) in the DB NOW via `migrations/*.py` (cheap, cannot regress Mama's, and §7b NO-SKIPPING demands the GAP set be explicit — D110 XS-4 precedent: data-only seeds land at 0 risk). Prioritise the LIFT-path work in `attribute_gap_candidates`-frequency order (Mama's-driven).

## 10. Council audit trail (2026-06-17) — verdict + must-fix register

**Panel:** 4 cross-family raters (Haiku symbol-check + 3× Sonnet: routing-soundness, anti-cheat red-team, historical-context), each verifying claims empirically against the real code/DB. **Convergence:** high, no HOLD-level disagreement. **Verdict: GO — conditional on the must-fixes below being folded in (now applied to this doc).** The foundation is real (zero phantom symbols), the open questions are historically resolved, and the council caught the score-inflation holes BEFORE any build — which is the point.

| MF | Source | Fix (applied to this spec) |
|----|--------|----------------------------|
| MF-1 | Raters 1+2 | Lift-function count corrected ~5→**8** (§1); consolidation reframed as higher-risk. |
| MF-2 | Rater 2 | css_router D1 dead-stage: build must formally retire OR rewire (§1, §6 goal 1). |
| MF-3 | Rater 2 RISK 2 (HIGH) | Layer-detection structural-position guard: L2 fires only on non-root inner element (§3 step 1). |
| MF-4 | Rater 2 RISK 3 (MED) | Disambiguation: `attr_for_layer_property` uses rowid-first-match, NOT `block_selectors.element` as claimed — build must make element the key OR fail-loud on ≥2 candidates (§3 step 3). |
| MF-5 | Rater 2 RISK 6 (LOW) | L4 `attr_for_area_property` has NO converter call-site — L4 unwired; matrix cells = BLOCKED until wired (§5, §9 Q2). |
| MF-6 | Rater 3 (PARTIAL→holes 1-8) | Anti-cheat gate rewritten: whole-tree + indirect slug forms; scan PHP/CSS for `!important` not converter output; numeric-literal breakpoint scan + kill `_BP_SUFFIX_MAP`; WIRE `check_no_mirror.py` to `--enforce`; D2-when-D1 DB cross-join; catch existing `_SUFFIX_ATTR_OVERRIDES`+`prop_map` R-22-1 violations (§7a). |
| MF-7 | Rater 3 | Coverage matrix auto-generated + CHEAT classified from gate output (not LLM judgment); §7b empty-section + multi-fixture + non-default-value false-win guards (§5, §7b). |
| MF-8 | Rater 4 | All 5 open questions resolved with historical grounding (§9). |

**Saved:** catching MF-3/MF-4/MF-6 pre-build avoided shipping a converter that would misroute max-width on centred sections, silently rowid-pick ambiguous attrs, and pass a cheat through 8 gate holes — i.e. the exact "looks done, collapses later, inflated score" failure Bean named. Estimate ≥2 build+revert waves avoided.

## 11. Build strategy — STAGE-BY-STAGE, no deferrals (Bean-locked 2026-06-17)

The build is sequenced by **pipeline STAGE, not by route**. Rationale (Bean): building one route at a time bakes in route-specific decisions that harm other routes and forces countless rebuilds + hides cheats. Instead:

1. **Start at the pipeline's beginning.** Take the first stage; make it handle **every** block, variable, and possible outcome universally — proven reachable via the logic + DB-data matching, and cheat-checked by the §7 gates — *before* touching the next stage. Example: recognition + routing for ALL blocks (including composite/native routing) is completed and proven universal at its stage before any CSS-lift stage begins.
2. **Universality is proven per stage**, not per route — so progress can't be undone by a later route's needs.
3. **No "later phase" deferrals** — every routing choice that a stage owns is decided when that stage is built, with all routes in view.

**Prerequisite to ALL building: the exhaustive pipeline routing/logic HTML chart** (`.claude/reports/pipeline-routing-map-2026-06-17.html`). It maps the WHOLE pipeline start→every finish point: every routing choice, branch/if, DB table/column check, and terminal outcome, with an explanation of each. The chart is the ground truth the stage-by-stage build is sequenced against and checked for completeness against. Building begins only after the chart proves every stage's every-route reachability.

---

## 12. Clean modular rebuild — authoritative build direction (adversarial-council-corrected, Bean-locked 2026-06-17)

A 5-persona adversarial council (cynic / ship-PM / spec-lawyer / transpiler-correctness expert / maintenance-realist) red-teamed the v0.2 approach. Verdict: **CONDITIONAL GO** — the diagnosis is sound but the plan-as-written would automate the score-inflation it set out to kill. Full register + grades: `reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md`. This section folds the corrections in and is the authoritative build direction.

### 12.0 Bean's locked decisions (supersede the council where they conflict)
- **CLEAN REBUILD, not spot-fixes.** Mama's=100% is a METRIC of pipeline effectiveness, not the goal. The holes are systemic (sgs/container, composites with scalar/child elements, blocks with child blocks), not hero-only. Trust-bar precedent proved spot-fixes don't generalise and *regress*. (The council's "fix-6-HIGH-first" path is OVERRULED; its evidence reinforces the rebuild.)
- **MODULAR FILE ARCHITECTURE.** Split the converter into per-resolver files dispatched by branch logic; remake the orchestrator against the pipeline chart. Fresh code, not chained to the 6,379-line legacy `convert.py`. Rationale: in the giant scripts, functions/cheats/DB-calls get missed by humans AND subagents (demonstrated this session). Small single-purpose files = locatable failures, visible cheats, wirable gates.
- **STAGE-BY-STAGE = BUILD ORDER + per-stage universality test.** Build + test each pipeline stage is universal across ALL block-shapes; do not start stage N+1 until stage N passes; if stage 4 fails, only stage 4 needs fixing. Never build on a flawed lower stage.

### 12.1 The reconciliation (this answers the council, does not ignore it)
The council's sharpest critique — "stage is the wrong axis, correctness is cross-stage" — is RESOLVED, not overruled: **stage-by-stage is the build ORDER; the draft-derived ledger + render-oracle (12.2) is the cross-stage TEST that gates each stage's universality claim.** Complementary. A stage passes only when its declarations are end-to-end accounted on a multi-shape fixture set.

### 12.2 TIER-1 FOUNDATION — designed + built BEFORE any stage (the spine)
These supersede §6/§7's v0.2 form. The build does not start a single pipeline stage until this foundation exists and is armed.

1. **Draft-derived CSS Accounting Ledger (MF-1, the keystone).** `declare_input` = the draft's parsed `(selector, property, value)` stream captured at Stage 0.7 BEFORE any routing — NOT the converter's recognised set / the `property_suffixes` table. `UNACCOUNTED = draft_decls − (transferred ∪ excluded-with-reason ∪ gap)`. Any UNACCOUNTED = hard fail. This is what makes the ~15 no-suffix-row classes (background-image, filter, opacity, transform, object-fit, pseudo-elements, font shorthand) impossible to silently drop. (Supersedes the §5 matrix as the primary completeness instrument — the matrix only sees cells it knows about; the ledger sees the whole draft.)
2. **WRITTEN vs LANDED (MF-2).** WRITTEN = attr emitted (progress signal, never a gate). LANDED = live computed-style on a NON-DEFAULT fixture equals the draft (the only "done"). WRITTEN-not-LANDED count >0 = hard fail (catches wrong-layer transfer in the ledger, not the eye).
3. **Differential render-oracle + metamorphic relations (MF-3).** Closing gate = render the DRAFT and render the CLONE, pixel-diff the two renders at 375/768/1440 per section (the draft is its own exact non-circular oracle). Plus metamorphic tests: source-order permutation → identical output; BEM-synonym rename → identical output (tests name-free routing); px-scaling by k → all transferred values scale by k.
4. **Closed, audited EXCLUDED set (MF-4).** `excluded_properties(css_property, reason, decided_by, date)` DB table; a gate fails the build on any in-code exclusion literal or any growth without a migration+reason. Excluded-from-lift ≠ excluded-from-clone (must still D2-passthrough for fidelity).
5. **Gates EXIST + WIRED as prerequisites (MF-5).** Build `check-converter-cheats.py`, `generate-coverage-matrix.py`, the ledger pipeline-close check; wire `check_no_mirror.py --enforce` + `check-converter-cheats.py --check` into `package.json prebuild`; add a `PreToolUse` git-commit hook in `.claude/settings.json` (closes the commit-without-build bypass). Plain-English failure messages for a non-coder QC owner. (All verified ABSENT/asleep today.)
6. **The ledger is the build spine (MF-6).** A stage is "done" only when, for the declaration classes it owns, the end-to-end ledger shows zero UNACCOUNTED AND zero WRITTEN-not-LANDED on the multi-shape fixture set — not an in-stage conformance suite, not page 8 alone.

### 12.3 TIER-2 — HIGH correctness gaps (each gets a gate + completion goal; most auto-surface once 12.2.1 lands)
No-suffix-row property class (seed row OR exclude-with-reason) · pseudo-elements (`::before`/`::after`, currently mis-parsed) · broad-except fail-silent → fail-CLOSED on every ledger/DB path · stale `has_inner_blocks` → derive at convert-time from save.js, not a cached column · scalar-media `<video>`/caption swallow (no content-dropping `continue`) · classification exhaustiveness (unknown slug → hard fail, no empty-content emit) · non-device-tier breakpoints (600px) preserved or UNACCOUNTED.

### 12.4 TIER-3 — modular architecture (Bean's D-MODULAR, first-class)
- **Per-resolver files behind ONE dispatch table** `(block, layer, property, tier) → resolver`. One entry point + one DB-sourced routing table — NOT one mega-function. Each resolver = its own file + frozen golden + metamorphic test. Remake the orchestrator against the chart.
- **DB-as-code consistency suite** (name-free routing is safe only if the DATA is tested): no `(block, layer, property)` resolves to ≥2 attrs without a `block_selectors.element` disambiguator; every `has_inner_blocks` agrees with save.js; no `variant_slots` discriminator name-collides with a liftable structural attr.
- **Multi-shape fixture set** exercising every block-shape incl. blocks absent from page 8 (tabs/accordion/gallery/sgs-media) = the universality test bed. Page 8 = one fixture, not the gate.

### 12.5 TIER-4 — negative corpus + idempotency
A red-team fixture per HIGH gap (a `::before` section, a `<video>` hero media column, a `@media 600px` rule, a `background:url()`, a centred `max-width:1200px;margin:0 auto` section). An idempotency/fixed-point test (re-cloning a clone = identity).

### 12.6 Build sequence (replaces §11's legacy sequence)
1. **Foundation first** (12.2): the draft-derived ledger + WRITTEN/LANDED + render-oracle + closed EXCLUDED + all gates, built and ARMED against the current/legacy output (today's cheats show as CHEAT/GAP) so any later change is provably non-regressing.
2. **Modular scaffold** (12.4): the dispatch table + empty per-resolver file structure + the multi-shape fixture set + DB-consistency suite.
3. **Stage-by-stage rebuild**, in pipeline order, each stage gated by 12.2.6 (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the fixture set) before the next stage starts. Composite/native routing (Method-2) is built at its stage (recognition), foundational, not deferred (§9 Q2).
4. Each stage = a proven-universal increment (the ship-PM's milestone cadence, satisfied per-stage rather than per-route).

**Completion (supersedes §6):** every draft declaration across the multi-shape fixture set is TRANSFERRED-and-LANDED, EXCLUDED-with-reason, or a tracked GAP — zero UNACCOUNTED, zero WRITTEN-not-LANDED, zero CHEAT cells, all gates armed and green, and the draft-vs-clone render-diff passes per section at 3 breakpoints.

### 12.7 Foundation build order + gap-to-stage map (execution detail — closes the verification gap)

**Phase F — the Tier-1 foundation, built + armed against CURRENT output before any stage rebuild** (each step is independently testable; today's legacy cheats/drops show as CHEAT/GAP/UNACCOUNTED, establishing the non-regression baseline):

| # | Build step | Depends on | Done-when |
|---|-----------|-----------|-----------|
| **F1** ✅ **DONE 2026-06-18** | **Multi-shape fixture set** — a draft per block-shape (InnerBlocks / scalar / mixed) incl. blocks absent from page 8 (tabs, accordion, gallery, sgs/media) + a red-team fixture per HIGH gap (§12.5). **BUILT:** corpus at `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/` — `README.md` (coverage index referencing the existing conformance fixtures for standard shapes) + `sgs-media` (the absent atomic-media shape) + 5 red-team fixtures (`rt-pseudo-before`, `rt-video-media`, `rt-media-600`, `rt-background-url`, `rt-centred-maxwidth`), each with a `.expected.md` (HIGH gap + current-converter-failure + target behaviour + non-default-value table). | — | ✅ corpus exists; each fixture has a known-correct expected render |
| **F2** | **Draft-declaration parser → input ledger** — tinycss2 parses each fixture's CSS into the surjective `declare_input` set `(selector, property, value)` at Stage 0.7, BEFORE any routing (MF-1) | F1 | every declaration in every fixture is in the input ledger; count is stable + reproducible |
| **F3** | **Render-diff oracle** — render the draft + render the clone, pixel-diff at 375/768/1440 per section; gated on `innerText.length>0` + element-present + non-default-value (MF-3). + the 3 metamorphic relations | F1 | oracle runs on a fixture and returns a per-section LANDED/not verdict |
| **F4** | **Closed EXCLUDED set** — `excluded_properties(css_property, reason, decided_by, date)` table + dated migration (MF-4) | — | table seeded with today's legit exclusions (width/max-width with reasons) |
| **F5** | **The gates, built + ARMED** — `check-converter-cheats.py` (§7a, whole-tree) + `generate-coverage-matrix.py` (§5, secondary dashboard) + the pipeline-close ledger checker (UNACCOUNTED>0 / WRITTEN-not-LANDED>0 → fail); wire `check_no_mirror.py --enforce` + `check-converter-cheats.py --check` into `package.json prebuild`; add the `PreToolUse` git-commit hook in `.claude/settings.json`; the EXCLUDED-literal gate (MF-4); plain-English failure messages (MF-5) | F2, F4 | all gates run automatically on prebuild + pre-commit; against current output they flag the known cheats/drops (baseline captured) |
| **F6** | **DB-as-code consistency suite** (§12.4) — no `(block,layer,property)`→≥2 attrs without disambiguator; `has_inner_blocks` agrees with save.js; no variant discriminator collides with a liftable structural attr | — | suite runs in prebuild; current DB violations enumerated |

Phase F output: the ledger + oracle + armed gates form the spine. The current converter's output now has a **measured baseline** (its UNACCOUNTED set, its CHEAT cells, its render-diff deltas) — any rebuild step is provably non-regressing against it.

**Gap-to-stage map** — each Tier-2 HIGH gap is owned by the stage that rebuilds it (so no gap is orphaned between stages):

| Tier-2 gap | Owning stage in the rebuild | Fix |
|-----------|----------------------------|-----|
| Classification exhaustiveness (unknown slug → empty emit) | **Stage 2** (recognition / classification fork) | `assert_never` on unknown class; hard fail, never silent empty emit |
| Stale `has_inner_blocks` mis-routes a block type | **Stage 2 / 4f** (child-shape fork) + F6 pre-flight | derive at convert-time from the save.js marker, not a cached column |
| Scalar-media `<video>`/caption swallowed by `continue` | **Stage 3c** (fold tree, Rule 0) | no content-dropping `continue`; route unconsumed children to walk/gap |
| Pseudo-elements `::before`/`::after` never collected | **Stage 4b** (cascade resolver) | fix the `::`-as-media-separator parse so pseudo CSS reaches the lift |
| Non-device-tier breakpoints (600px) silently dropped | **Stage 4b** (@media bucketing) | preserve as faithful passthrough OR mark UNACCOUNTED — never drop |
| No-suffix-row property class (background-image, filter, …) | **Stage 0.7 input + Stage 4c/4e lift** | surfaces as UNACCOUNTED via F2; fix = seed `property_suffixes` row OR EXCLUDED-with-reason |
| Broad-except fail-silent (drops responsive CSS / gap register) | **cross-cutting coding standard, all stages** | every DB/ledger path fails-CLOSED; a swallowed declaration = UNACCOUNTED, enforced by F5 |

With Phase F + this map, the stage-by-stage rebuild (§12.6 step 3) proceeds in pipeline order, each stage gated by the ledger (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the fixture set) and owning its mapped gaps. **Spec 31 is now complete as the build blueprint.**
