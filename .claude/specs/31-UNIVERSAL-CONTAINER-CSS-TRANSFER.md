---
doc_type: spec
spec_id: 31
spec_version: 0.3-CLEAN-MODULAR-REBUILD
project: small-giants-wp
thread: cloning-pipeline
title: "Universal Container/Grid CSS-Transfer Architecture"
created: 2026-06-17
status: active
status_detail: ADVERSARIAL-COUNCIL-CORRECTED (GO on a clean modular stage-by-stage rebuild, 2026-06-17) — §12 is the authoritative build direction. Foundation Phase F COMPLETE (D232–D241); next = stage-by-stage modular rebuild (§12.6 step 2).
council_register: reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md
pipeline_map: reports/pipeline-routing-map-2026-06-17.html

# ⚠ READ §12 FIRST. As of v0.3 (adversarial-council, Bean-locked) this is a CLEAN MODULAR REBUILD, not a fix-in-place of the legacy converter. §12 supersedes the fix-in-place assumptions in §1 (consolidate-the-8-functions) and §11 (legacy build strategy). §1-§11 remain the canonical ARCHITECTURE (layers, routing, anti-cheat intent); §12 is the corrected BUILD DIRECTION + the Tier-1 foundation the rebuild is sequenced against.
supersedes: plans/archive/2026-06-16-grid-container-extraction-rebuild-design.md (under-specified earlier draft; archived 2026-06-23)
absorbs_spec_22: true  # merged in full -> §13 (D253). R-22-N == R-31-N.
acceptance_baseline: reports/2026-06-14-clone-vs-draft-defect-register.md (families B/C/D/E/F/K)
binding_rules: R-31-1, R-31-2, R-31-3, R-31-4, R-31-5, R-31-6, R-31-7, R-31-8, R-31-9, R-31-10, R-31-11, R-31-12, R-31-13, R-31-14, R-31-15  # full set defined in §13.1
---

# Spec 31 — Universal Container/Grid Content + CSS Transfer Architecture

> ## ⛔ SCOPE CONTRACT / DEFINITION OF DONE — read BEFORE scoping ANY work on this spec (STOP-29, D248)
>
> This is a UNIVERSAL pipeline. It does NOT have ad-hoc "out-of-scope gaps." Anything not done is a named STAGE (mapped in §12) or a data-model item to finish — never a vague exception.
>
> **The one universal stream (§3):** for EVERY element on the page — `sgs/container`, every composite, every **nested child block**, every **built-in element / scalar attr** (content the block renders itself instead of as a nested child), and every **array item** — the pipeline must **A. identify it correctly → B. migrate its content → C. transfer its directly-attached CSS**, through ONE dispatch. The "block vs element" fork chooses only the OUTPUT destination (child InnerBlock vs scalar attr); recognition + content + CSS extraction is the SAME shared machinery (§3.B.0).
>
> **Definition-of-done for ANY increment of this spec:** done = the spec's FULL universal scope for the surface you touch — NOT "the minimum that ships." Before building, READ §1 (the complete function inventory) + §3 (the universal algorithm) + §3.B.0 (universality) + the §12 stage map IN FULL (holistically, not greps). Then:
> 1. State the surface's full universal scope in plain English first.
> 2. If shipping an increment, **map every not-yet-built part to its named §12 STAGE** (or a named data-model item). Present that map. NEVER write "out of scope" / silently defer.
> 3. If a deferral can't be mapped to a §12 stage, that is the signal the scope wasn't read — go read it.
>
> A minimum increment that ignores the spec's full scope is a HALF-JOB even if it passes its gates. (Captured 2026-06-28 after repeated content-only/array-private builds that the spec already answered — `feedback_bind_done_to_full_spec_scope.md`; extends STOP-26 to definition-of-done.)



> **Scope (D246):** ALL draft→block transfer through the one container dispatch — **content (text/media/array/child-block) AND CSS** — not CSS alone. The historical title "CSS-Transfer" predates the content-unification correction; read it as "Content + CSS Transfer."

## 0. Plain English (what this is, why it exists)

**What.** Every cloned page section renders through ONE engine — `sgs/container` and its PHP wrapper (`SGS_Container_Wrapper`), which 30 composite blocks share. The cloning converter (`convert.py`) reads a draft mockup's CSS and is supposed to put every value the draft holds into the right block setting, at the right screen size (mobile / tablet / desktop). **Today it transfers only a subset, routes some to the wrong place, runs several competing lift paths that disagree, and still emits raw `sgs/container` instead of the proper composite for whole sections.** That is the entire "55% desktop fidelity" gap.

**Why a full architecture, not patches.** This stage has failed repeatedly because fixes were local: one block made to work in one context, score inflated by a cheat, then collapse everywhere else. This spec defines the *whole* target system — every block type, every layer, every screen tier, every child-shape — plus the completion goals and the cheat-detection that make a partial or cheated implementation **impossible to mistake for done**.

**The one-sentence target.** A single DB-driven, name-free routing engine reads any draft routing unit — a CSS property OR a content node (text/media/array) — and places it on the correct block attribute (or child InnerBlock) at the correct responsive tier, for `sgs/container` and every container-bearing composite identically — with completeness measured against a live coverage ledger and cheats caught by structural gates, not by eye.

> **SCOPE — content extraction is IN, and UNIFIED with CSS (added 2026-06-27, D246).** Despite the title saying "CSS-Transfer", this spec governs the WHOLE draft→block transfer through the one container dispatch: **CSS routing AND content routing (scalar text lift, scalar media object-shaping, array/repeater lift, child-block emission)**. Content is NOT a separate engine, NOT a separate stage, NOT out-of-scope. The content fork (which child becomes a block vs a scalar attr — FR-31-2/2.1/2.2/2.5, §13.3) is INCORPORATED here as part of the same name-free DB dispatch; CSS simply adds the L1–L4 layers + more DB columns on top of the SAME recognise→resolve-destination→tier→serialise pipeline. Spec 22's content logic is now ABSORBED (§13, D253 2026-06-30) and the standalone Spec 22 is archived. **Do not infer content is excluded because the title or §8 says "container-CSS transfer."**

---

## 1. System map — where CSS transfer happens

The pipeline (`cloning-pipeline-flow.md`) touches CSS transfer at exactly these points. Spec 31 governs all of them as ONE system:

| Stage | Role in CSS transfer | Current state |
|-------|---------------------|---------------|
| **0.7 `css_router.py`** | Splits the draft `<style>` into 4 destinations: **D0** global/reset, **D1** typed-attr lift→block attrs (token-snapped), **D2** wrapper-CSS scoped `.page-id-N`, **D3** gap-candidate DB | Routes to D1, but its D1 output is **not consumed** by Stage 4 (the merge was deleted 2026-05-27, convert.py:807) |
| **Stage 2** block-match | Picks the block for a section; no confident match → `sgs/container` fallback | **STALE-FRAMING CORRECTED 2026-06-26 (qc-council, verified vs the 2026-06-21 live run):** the FROZEN engine ALREADY routes `.sgs-hero`→`sgs/hero` AND `.sgs-trust-bar`→`sgs/trust-bar` with the `variant` attr set — composite recognition is NOT a live bug, and there is no "conf 0.10" mis-recognition for hero. Sections that emit `sgs/container` (featured-product, brand, ingredients, gift, social-proof) have NO registered composite block → container is the CORRECT slug-None target, not a miss. The real Stage-2 work is a **PORT**: the FRESH `converter/` engine has no recognition yet, so reproduce the (already-correct) composite recognition + variant there to enable retiring `convert.py` (D-MODULAR). Baseline/oracle = the draft + the empty new-engine, NEVER the frozen output. |
| **Stage 3** slot list | Annotates each attr with `canonical_slot`/`role` from block.json | metadata only (D194/DEC-5) — not the structural router |
| **Stage 4 `convert.py`** | **PRIMARY lift engine** — the universal walker folds wrappers and lifts box/grid/typography CSS onto attrs at 3 viewports | Has **8 overlapping lift functions** (council-verified, §6 goal 1) + ~13 per-block `if slug==` carve-outs; the consolidation is the core of this spec |
| **Stage 4.5 / 0.8** | Token-snap (ΔE≤1 / ≤1px) + theme-width detection | works; literal kept + gap logged on miss |
| **Stage 8 / 11 / 11.5** | Live pixel-diff + draft-centric parity gate (375/768/1440) | the verification floor |
| **Stage 9** | 5-bucket leftover router → writes `attribute_gap_candidates` | **the live completeness ledger** — central to Spec 31 |

**Architectural principle #1 — ONE lift path. CONTENT AND CSS ARE THE SAME DISPATCH — do not build them separately.** The lift functions in `convert.py` (**8 active, not ~5** — `_lift_root_supports_to_style`, `_lift_wrapper_css_to_container_attrs`, `_lift_typography_to_block_attrs`, `_lift_content_band_max_width`, `_lift_uniform_grid_item_css`, `_lift_scalar_attrs_by_selector`, `_lift_styling_attrs_by_selector`, `_lift_scalar_media_from_img`; council-verified count), the css_router D1 path, and any retired sidecar remnant collapse into a single DB-driven dispatch. They have genuinely DIFFERENT destinations (WP supports / container box / typography / grid-item / scalar content / scalar media) — so the consolidation is a larger, higher-regression-risk task than "~5" implied; it MUST gate on both conformance suites. Two paths that can disagree is itself a defect class (Family K duplicate-emit is a symptom). **css_router.py decision (MF-2):** Stage 0.7 routes CSS to D1 but Stage 4 no longer consumes it (merge deleted 2026-05-27). The build MUST formally either (a) retire css_router's D1 path or (b) rewire Stage 4 to consume it — leaving it as a dead stage that silently strands properties is forbidden.

> **MODULARISE, do not RECREATE (added 2026-06-27, D246 — the doc-council root-cause fix).** Of the 8 functions, **`_lift_scalar_attrs_by_selector` (scalar CONTENT) and `_lift_scalar_media_from_img` (scalar MEDIA) are WORKING** (content was ~100% draft→clone in the legacy engine — the broken half is the CSS side). The clean modular rebuild (§12.0) **MODULARISES these working functions into resolvers inside the ONE `(block, layer, property/role, tier) → resolver` dispatch (§12.4), alongside the CSS resolvers — it does NOT recreate content with a separate engine, new `run_mechanism_*` logic, or new DB columns.** The existing DB data (`derived_selector`, `canonical_slot`, `standalone_block`, `parent_block`, `accepts_allowed_blocks`, `slots.aliases`) already drives content routing — query it, do not duplicate it. **Reading these two functions in full to port them faithfully is MANDATORY and sanctioned** — the STOP-22 "never read convert.py" ban targets the BROKEN CSS-side assumptions, NOT the working content functions §1 names here (reading-to-port ≠ importing-brokenness). The D245 separate `converter/services/extraction.py` engine (extract_content / run_mechanism_a/b + new accessors) violated this and is SUPERSEDED (D246).

---

## 2. The universal model — four orthogonal axes

Every container-bearing block is described by four independent axes. The routing engine must handle **every combination**, with no per-block code.

### Axis 1 — LAYERS (where in the box a property lives)
Per FR-31-21 + the design-gate doc. A draft wrapper decomposes into at most four layers; each has a distinct attr destination, detected by **CSS signature + structural position, NEVER by class name** (DEC-1/DEC-3, precedent D85):

| Layer | Detected by | Attr destination |
|-------|-------------|------------------|
| **L1 OUTER box** | the section-root element itself | native `style.*` + **`align`**/**`maxWidth`**/`padding*`/`background*`/`min-height`. **Rule (UPDATED — D230 `484d04d9` / D231 `d5416ae8`, SHIPPED + LANDED 2026-06-18):** `max-width` ABSENT → `align:"full"` (WP-native breakout, `supports.align`); PRESENT → `maxWidth` (string **literal**, exact draft value — decimals+unit preserved, no 5% theme-snap, no `int()` truncation) + responsive `maxWidthTablet/Mobile` at 767/1023. **`widthMode`/`customWidth` RETIRED.** **STATUS (D250, 2026-06-30): The native WP `style.*` lift (`_lift_root_supports_to_style` / `_root_lift_rules`) is PORTED into the new engine as `converter/services/root_supports.py`** — `padding`/`background-color`/`border-radius` now emit nested `style.spacing.padding`/`style.color.background`/`style.border.radius` respectively; the conductor partitions block-supported props out of the per-declaration Decl stream before handing off to outer_box. New engine only; frozen `convert.py` unchanged. |
| **L2 CONTENT-WIDTH (inner band)** | `--content-width` custom-prop decl (deterministic) OR `max-width`+`margin:auto` signature (scraped fallback) | `contentWidth` (token `normal`→content-size / `wide`→wide-size / `full`→no cap, OR a **literal**; **default `full`** = blank fills the outer, D231) + `contentBandPadding*` (via the `max-width ≡ width` CONTENT-layer suffix equivalence) |
| **L3 GRID + PER-ITEM** | the level carrying `display:grid`/columns | `gridTemplateColumns`/`gap`/`gridItem*`. UNIFORM child box-CSS → `gridItem*` defaults; UNIQUE per-item CSS → that child block's own CSS |
| **L4 GRID-PER-AREA** (FR-31-21.3) | named grid areas — flat `<areaName>+<Suffix>` families | `contentPadding*`, `mediaBackground`, … via `db.attr_for_area_property`; areas declared in `supports.sgs.gridAreas` |

Rules that bind every layer: the container **NEVER imposes alignment on children** (step 5); any property with no attr destination is **FLAGGED, never silent-dropped** (step 6); `display`/`grid-template-*` are **EXCLUDED from cross-node inline lift** (GAP-3 — inline beats `@media` and collapses grids). **STATUS (D250, 2026-06-30): `grid-template-*` routing UPDATED** — on a section root, properties in `dispatch_table._GRID_LAYOUT_PROPS` now route PRE-LAYER directly to the grid resolver (a section root is simultaneously OUTER for box CSS and GRID for child-track declarations); this resolves the ambiguity where the layer-detector could not distinguish an OUTER `max-width` from a GRID `grid-template-columns` on the same root element.

### Axis 2 — KIND (which layers a block exposes)
`block_composition.container_kind` (31 blocks): **section** (all layers + background/overlay/SVG/shape), **layout** (L1–L4 width+grid, no background layer), **content** (L1+L2 width+padding only, no grid, no background). KIND **gates which attrs exist as a destination**; it does NOT change routing logic (Spec 29 §8, D194).

### Axis 3 — CHILD-SHAPE (where per-item / child CONTENT **and** CSS goes)
The axis Bean called out explicitly. Decided by `block_composition.has_inner_blocks` + the DEC-4 fork (`canonical_slot` + `role` + `attr_type` read together). **NOTE (D246): this axis governs BOTH "which child block / scalar attr the element's CONTENT becomes" AND "where the child's CSS goes" — they are the SAME fork in the SAME dispatch, not separate stages. The content-resolution body below (the 2026-06-27 child-block CONTENT resolution subsection) is first-class, not a footnote; its full integration into §3's unified algorithm + closing the v1 G1–G5 gaps is Step 2a.** The table's column says "CSS destination" but read it as content+CSS destination (per Step-2a rewrite):

| Child-shape | has_inner_blocks | Per-item / child CSS destination |
|-------------|------------------|----------------------------------|
| **InnerBlocks** (card-grid, feature-grid, accordion, tabs, multi-button…) | 1 | Each grid item IS a child block → that child block's own CSS attrs. UNIFORM item CSS → parent `gridItem*` defaults |
| **Scalar** (testimonial, team-member, trust-bar, option-picker…) | 0 | Child content/style lives in the parent's typed scalar attrs (e.g. per-area `content*`/`media*`) |
| **Mixed** (hero, cta-section…) | 1 + scalar areas | Full wrapper attrs (L1–L4) **plus** per-area scalar attrs (`headline`, `contentPadding*`, `mediaBackground`) — routed by L4 area lookup. The cross-node predicate `slot_has_equivalent_block(block, slot)` forks: TRUE → CSS to child block; FALSE → lift to parent box attrs |

#### Child-block CONTENT resolution (added 2026-06-27 — the routing mechanism the v0.3 table omitted)

> **STATUS: v1 (HISTORICAL — the G1–G5 content gaps below are CLOSED by §13.3; retained for context). qc-council NO-GO for full-handover completeness (2026-06-27 manual-simulation, 4 raters).** This subsection correctly adds the child-block *routing data sources* (the data IS in the DB), but a fresh-session v2 must close: (G1) the token→child-slug **matching predicate** is undefined ("identity matches the token" — state the algorithm, e.g. strip the `sgs/<parent>-` prefix so `accordion-item` matches `__item`); (G2) **no recursion rule** for child-of-child InnerBlocks (accordion-item's own `__title`/`__content`); (G3) the **NULL `accepts_allowed_blocks`** case is unhandled (gate can't run); (G4) **contradiction with the Mixed row** — it lists `headline` as a *scalar attr* while this resolution makes it a *child block*; Spec 31 must decide per-child scalar-vs-child-block (the FR-31-2.1/2.2 content fork (now canonical in §13.3)); (G5) `slot_has_equivalent_block` CSS-fork is described here + in the Mixed row but **never integrated into the §3 algorithm**. SEPARATELY the council found Spec 31 has **no content-extraction mechanism at all** (scalar text lift / media object-shaping — §3 is CSS-only) and **no array/repeater case** (FR-31-2.5) — both are now ABSORBED into §13.3 (FR-31-2/2.1/2.2/2.5) — the canonical content fork that closes G1–G5; this v1 status note is retained as history.


The table above answers "where does child **CSS** go". It did NOT answer "**which child block** does a draft child element become" — the prerequisite for an `InnerBlocks` parent (accordion/tabs/multi-button/form/product-faq/testimonial-slider…) to emit any child at all. That mechanism is **distinct from the `slot_has_equivalent_block` CSS-fork** and was missing: `slot_has_equivalent_block(parent, slot)` checks the parent's own content **attributes**, which a LAYOUT container legitimately has none of — so keying child-block emission off it wrongly produces zero children for every layout-container composite. The correct, DB-driven resolution (the data already exists — it is the same forced-parentage mechanism as **§13.3 / FR-31-5.3**, ratified there but never pulled into this child-shape fork):

> For a draft child element carrying a BEM token under an `InnerBlocks` parent, resolve its child block by: (1) **`blocks.parent_block` (forced-parentage)** — if the parent has a registered child whose identity matches the element's token, that child wins (`sgs/accordion __item → sgs/accordion-item`; `sgs/tabs __tab → sgs/tab`; `sgs/form __step → sgs/form-step`), overriding the global alias (so `__item` under accordion does NOT mis-resolve to the global `card`-alias `sgs/info-box`); (2) otherwise **`slots.(aliases, standalone_block)`** — the token → canonical slot → `standalone_block` (`__button → button → sgs/button`); (3) **`block_composition.accepts_allowed_blocks`** is the VALIDATION gate — the resolved child must be in the parent's allowed-blocks list, else it is a flagged GAP (never silently dropped, never a per-block carve-out, R-31-9). `slot_has_equivalent_block` is the CSS-fork ONLY; it is NEVER the child-block-emission predicate. `wraps_block` names the parent's own built-in wrapper (e.g. `sgs/container`), NOT its content children — do not confuse the two.

### Axis 4 — VARIANT (which extra slots exist this run)
`blocks.variant_attr` names the selector attr; `variant_slots(block_slug, variant_value, unique_slot)` holds each variant's **discriminating** slots (set-difference vs siblings). The detector counts how many of each variant's `variant_slots` were populated **from the draft extract THIS run** (never the block's stored attrs — that was the `$is_split` cheat) and sets the highest-count variant. Code is universal (`detect_variant`, `variant_attr_for`); the gap is DATA (block.json `variants` maps unpopulated for most blocks). Query, never guess (e.g. hero `split` = `gridTemplateColumns`/`splitGap`/`splitImage*` → 2-col ≥768, stacked <768).

---

## 3. The routing algorithm (DB-driven, name-free) — the heart of the system

**The dispatch routes a draft ROUTING UNIT to its native destination. A routing unit is EITHER (a) a CSS declaration `(css_property, value)` at a tier, OR (b) a CONTENT payload (an element's text / media / rating, or a child element that becomes a child block).** Both classes go through the SAME `(block, layer/role, property/selector, tier) → resolver` dispatch (§12.4) — content and CSS are branches of one algorithm, NOT separate engines (§1, D246). Per element, route every CSS declaration through the **CSS branch (§3.A)** AND route its content through the **CONTENT branch (§3.B)**; both write into the same emitted block attrs + child InnerBlocks and feed the same conservation ledger.

### 3.B — CONTENT branch (modularised from the WORKING functions — `_lift_scalar_attrs_by_selector` / `_lift_styling_attrs_by_selector` / `_lift_scalar_media_from_img`; NOT recreated, D246)

These are existing, working resolvers (content was ~100% draft→clone). The rebuild MODULARISES them into the dispatch; it does not rewrite them. All four sub-routes are DB-driven (R-31-1), capability-gated, no-op when their trigger is absent, and name no block.

- **B1 — Scalar CONTENT lift** (block has `scalar-content-lift` capability; `has_inner_blocks=0`). For each attr in `block_attrs(slug)` with a non-empty `derived_selector`, find the FIRST descendant matching the selector (comma-separated BEM classes, first-non-None wins — handles `__text`↔`__quote` drift), and lift by `(role, attr_type)`: `text-content`/`content`+`string` → `_rich_text_content(el)` → scalar text attr; `rating`+`number` → star count (`aria-label` digit, else ★/⭐ glyph count, 0–5) → rating attr; `image-object`+`object` → first `<img>` → `_lift_scalar_media_from_img` → `{url: resolve_media_url(src), id:0, alt}`. `showRating` coupled to a positive rating. An attr whose selector matches nothing emits NO key (strict no-op). This is `_lift_scalar_attrs_by_selector` (convert.py:3781). **STATUS (W1/W2, 2026-06-28, D246): MODULARISED + LANDED.** Ported faithfully to `converter/resolvers/scalar_content.py:lift_scalar_content` (+ helpers in `converter/services/lift_helpers.py`), wired via the thin wrapper `run_mechanism_a` (`extraction.py`); the strict-no-op behaviour above is preserved verbatim. **A1 (tracked, folded into the W3 engine-wiring):** `media_map` is now a threaded parameter (the hardcoded `{}` seam is gone, `afbcaa99`) but the new engine has NO media-map LOADER/driver yet (no production caller of `build_block_markup`), so `resolve_media_url` stays a no-op until the engine is pipeline-wired — image srcs are NOT remapped to uploaded WP URLs until then.
- **B2 — Scalar STYLING lift** (block has `scalar-styling-lift` capability) — the **CSS-on-content** route. For each attr with `role∈{color,typography}` + non-empty `derived_selector` (excluding `__hover`/`__active`/`__focus`) + a non-NULL `css_property` (peeled longest-suffix vs `property_suffixes`), collect the matched element's CSS declarations and normalise per `css_property` (colour→token/hex, font-weight→numeric, font-size→raw or split+Unit companion). This is `_lift_styling_attrs_by_selector` (convert.py:3903) — it is what the D245 `scalar_content.py`/`scalar_media.py` CSS-resolver stubs must become (do NOT rebuild it).
- **B3 — Child-block CONTENT resolution** (`has_inner_blocks=1`). For each content-leaf child element, resolve which child block it becomes: (1) `blocks.parent_block` forced-parentage (`sgs/accordion __item → sgs/accordion-item`) overriding the global alias; (2) else `slots.(aliases, standalone_block)`; (3) validate against `block_composition.accepts_allowed_blocks`, else a flagged GAP — never silent. Emit a child InnerBlock + recurse into its own content. (The Axis-3 child-routing; close the v1 G1–G5 gaps from §2's status note: define the token-match predicate, the recursion rule, the NULL-`accepts_allowed_blocks` case.)
- **B4 — Array / repeater** (`attr_type=array` — FR-31-2.5). Sibling-class DOM traversal of the array container; emit one child block per item; per-item attrs lift via B1's role-aware mechanism.

**The content fork (scalar-attr vs child-InnerBlock) is the same DB decision throughout (FR-31-2.1/2.2, §13.3):** a content-bearing slot that maps to a `standalone_block` AND whose parent composes InnerBlocks → child block (B3); a `scalar-content-lift` leaf → scalar attr (B1). `slot_has_equivalent_block`/`equivalent_block_for` are the CONTENT fork — never confused with the CSS layer fork.

#### 3.B.0 — UNIVERSAL element extraction: ONE shared recognise→content→CSS machinery for EVERY element (added 2026-06-28, Bean — load-bearing universal principle)

> **The recognise → extract-content → extract-CSS machinery is UNIVERSAL across EVERY element on the page, regardless of its OUTPUT form.** The block-vs-element fork (§3.B above) decides ONLY the DESTINATION; the recognition + content-value extraction + per-element CSS lift is the SAME shared mechanism whether the element becomes:
> - a standalone **section block**,
> - a **nested child block** (B3 — emitted as InnerBlocks),
> - a **BUILT-IN element / scalar attr** — the same content the block renders ITSELF instead of as a nested child block (e.g. a testimonial's avatar/quote, a card's built-in heading, an icon-list item's icon),
> - an **array-item field** (B4).
>
> The SAME draft `<h3>` / `<a>` / `<img>` / icon / `<span>` — by CONTEXT — becomes EITHER a nested child block OR a built-in scalar element OR an array-item field; but its content AND its CSS are recognised + lifted by the SAME shared extractors either way (**R-31-2:** tag is shape, context is meaning; the bare-tag→block/element map `html_tag_to_core_block` is that shape layer. **R-31-9:** one universal mechanism). Bean's example: a `<p>` inside a `sgs/container` becomes a `sgs/text` child block; the SAME `<p>` inside a `sgs/button` is the button's built-in text element — different output, identical recognition+extraction.
>
> **Binding consequences:**
> 1. The **role-handler library** (the per-element value extractors: `text-content`, `image-object`, `rating`, `icon-slug`, `url-href`, `plain-integer`, …) MUST live in ONE shared module used by B1 / B2 / B3 / B4 + the atomic-tag swap. Building a handler block-private or array-private (as the 2026-06-28 array build did, `array_content.py`) is an **R-31-9 violation to refactor into the shared library** — content extraction for a built-in element and for an array item is the SAME operation.
> 2. The shared **recognition primitives** (`icon_resolver.resolve_icon` for icon identity, `html_tag_to_core_block` for tag shape, `_safe_href` for hrefs, `lift_styling_content` for per-element CSS) MUST be reusable from EVERY extraction path. The `import_ban` gate's allowlist therefore extends beyond `db_lookup` to these shared recognition modules (`icon_resolver` etc.) — walling them off forces per-path duplication, the exact R-31-9 break this principle forbids.
> 3. **CSS follows content at EVERY granularity** (§3 unification): every recognised element — built-in, nested-block, or array-item — carries its own typography/colour/box CSS that the per-element styling-lift (B2 `lift_styling_content`) must transfer. The array path's 2026-06-28 content-only handling is INCOMPLETE until the per-item CSS lift is applied (the "CSS step after content"). This is not array-specific — it is the universal per-element content+CSS pairing.

### 3.A — CSS branch
For each draft CSS declaration `(css_property, value)` resolved for an element at a given tier:

1. **Detect the LAYER** (L1–L4) by CSS signature + structural position (§2 Axis 1). Never the class name. **MF-3 structural-position guard (council RISK 2, HIGH):** the current `_detect_content_layer` sees only CSS declarations, not whether the node is the section ROOT or an inner band — so a section-root that legitimately declares `max-width:1200px;margin:0 auto` would misroute its `max-width` to `contentWidth` instead of the OUTER `customWidth`. The detector MUST be passed (and enforce) the node's structural position: **CONTENT-WIDTH (L2) detection fires ONLY on a non-root, direct-descendant inner element.** This precondition is a build requirement, not an assumption — document it at the detector + add a guard that rejects a root node.
2. **Resolve the destination attr** via a per-block lookup `(block_slug, layer, css_property) → attr_name` (`db.attr_for_layer_property` / `attr_for_area_property`). NOT prefix string-concat — attr names vary per block.
3. **Disambiguate** where one css_property maps to multiple suffixes (the completeness audit's bite-list). **MF-4 mechanism reconciliation (council RISK 3, MED):** `attr_for_layer_property` today returns the FIRST DB-rowid match, NOT a `block_selectors.element` lookup. For current blocks this is safe (only one of each ambiguous pair exists per block), but it is insert-order-fragile if a block ever declares both. The build MUST either (a) make `block_selectors.element` the actual disambiguation key, or (b) add a hard guard: when ≥2 candidate attrs exist for one (block, layer, property), FAIL loudly rather than silently rowid-pick. Do not ship the rowid-first-match as the "intended" mechanism.
   - `max-width` → **by LAYER (UPDATED D230/D231):** L1 OUTER → `maxWidth` (literal) when present, else `align:"full"`; L2 band → `contentWidth` (token or literal). The old 3-way `MaxWidth`/`ContentSize`/`WideSize` widthMode-snap is RETIRED — the OUTER no longer snaps to a token. Resolve by LAYER (structurally guarded per MF-3) + the MF-4 disambiguation.
   - `align-items` → `AlignItems` vs **`VerticalAlign`** — **LOCKED** (D172 + memory `converter-attr-must-match-the-attr-render-reads`): container-wrapper blocks render `verticalAlign`, so target `VerticalAlign` for them. Ratified, not reopened.
   - `box-shadow` → `Shadow`(role=color) vs `BoxShadow`(role=visual) — genuinely unbuilt; resolve by querying `block_attributes` for the shadow attr the target block actually declares, then map to that (DB-first, no new code). **STATUS (D250, 2026-06-30): NOW BUILT.** `converter/resolvers/outer_box.py` resolves `box-shadow` → the block's `shadow` attr (DB-first: Shadow row wins over BoxShadow by rowid) via a token-snap to `design_tokens` shadow presets (sm/md/lg/glow); a raw box-shadow with no matching preset emits an honest `NO_DESTINATION` gap. The "genuinely unbuilt" claim is no longer accurate.
   - colour/bg/border-radius spelling aliases → pick the attr the **target block actually declares** (`block_attributes`).
4. **Resolve the TIER attr.** Tier siblings (`…Mobile/…Tablet/…Desktop`) have **NULL `canonical_slot`/`role`** and `is_responsive` is unreliable (211 flagged vs 527 real). So: resolve the BASE attr via slot/role, then **re-append the breakpoint modifier suffix** from `modifier_suffixes(kind='breakpoint')`. Never slot-lookup a tier attr directly.
5. **Parse + serialise** the value by `property_suffixes.kind_override` (`number_unitless`/`number_px_or_em`/`string`) + `block_attributes.attr_type`. (Family B = the `unitless` sentinel must round-trip and be stripped at render — verify render.php.)
6. **Token-snap** when `property_suffixes.is_token_matched=1`: snap to the nearest `design_tokens.css_var` (ΔE≤1 / ≤1px) else keep literal + log gap. Per-client divergences only emit as raw instance values (FR-26-C6); repeated values are candidates for derived globals (deferred).
7. **Validate** against `block_attributes.enum_values` (reject `contentWidth='banana'`) and `block_supports` (gate L1 full-bleed on the block declaring `align:["full"]`).
8. **No destination?** → write to `attribute_gap_candidates` with `proposed_action='add attr: css=… raw=… class=… run=…'`. NEVER silent-drop, NEVER emit as inline `@media` (responsive values go to tier attrs — §3 F-fork), NEVER fall to D2 scoped CSS when a D1 attr destination exists (R-31-15c).

### Responsive: device-tier vs visual breakpoint (the F-fork — council to ratify)
- **Device-tier system** = the SGS Mobile/Tablet/Desktop attrs, rendered by the wrapper + mapped by the converter, fixed at **768/1024**. ONE vocabulary: delete the parallel hardcoded `_GRID_TABLET_BP`/`_GRID_DESKTOP_BP` constants; route grid through the same `db.breakpoint_suffix_rules()` every other lift path uses.
- **Arbitrary visual breakpoint** = a single draft rule at 600/640/781 for a design reason. **D228 lock: these are DISTINCT and must NOT be coerced into a device tier.** Family F is the converter *remapping* a draft 640 onto 768 — the forbidden conflation.
- **Resolution — RESOLVED → F-ii (preserve), Bean-mandated (D228, §9 Q1); per FR-31-5.2:** map draft `@media` thresholds that ARE device-tier values (767/768/1023/1024) to the tier attrs; **faithfully preserve** any non-device-tier threshold as a raw uid-scoped rule (passthrough), or log to D3 if no passthrough path — **never snap, never drop**. (F-i/F-ii is LOCKED to F-ii per §9 Q1 — not an open question.)

---

## 4. DB-column utilisation map (every useful column → its role)

Spec 31 derives the entire routing table from the DB (R-31-1). Columns in active use:

| Table.column | Role in the engine |
|--------------|--------------------|
| `property_suffixes.(css_property, suffix, role, kind_override, is_token_matched, token_source)` | THE property→attr-suffix→parse map (step 2/5/6) |
| `block_attributes.(attr_name, attr_type, canonical_slot, role, enum_values, derived_selector)` | the destination table; slot/role join (step 2), serialise (step 5), validate (step 7), verify-landed (`derived_selector`) |
| `block_composition.(container_kind, has_inner_blocks, wraps_block, accepts_allowed_blocks)` | KIND = which layers exist (Axis 2); `has_inner_blocks` = per-item destination (Axis 3); `wraps_block` = the parent's OWN built-in wrapper (not its children); **`accepts_allowed_blocks`** = the parent's allowed child-block list — the VALIDATION gate for child-block CONTENT resolution (Axis 3 child-routing, added 2026-06-27) |
| `blocks.parent_block` (forced-parentage, 18 rows) | **child-block CONTENT resolution (Axis 3 child-routing, added 2026-06-27 — §13.3 / FR-31-5.3)** — a draft child token under an `InnerBlocks` parent resolves to the registered child whose identity matches, overriding the global `slots` alias (`sgs/accordion __item → sgs/accordion-item`, not the `card`-alias). NOT a CSS-routing column. |
| `modifier_suffixes.(suffix, kind)` | breakpoint (tier), side/corner (shorthand decomposition), state (`:hover`) suffix grammar (step 4) |
| `blocks.variant_attr` + `variant_slots.(variant_value, unique_slot)` | variant detection (Axis 4) |
| `block_supports.(support_name='align'/'spacing'/'border'/…)` | gate L1 full-bleed + native-vs-custom attr (step 7) |
| `block_capabilities.(capability)` | `grid-layout`/`full-width-banner` gates; `scalar-styling-lift`/`scalar-content-lift` = the existing DB opt-in precedent for a new `container-css-lift` capability |
| `block_selectors.(element, selector)` | OUTER/CONTENT/typography layer disambiguation (step 3 max-width 3-way) |
| `design_tokens.(default_value, css_var, token_type)` | token-snap normalisation (step 6) |
| `roles.(role_name, classification)` | join-vocabulary integrity for property/attr role |
| `slots.(slot_name, aliases, standalone_block)` | element recognition (which BEM element → which block), Stage 3 — NOT CSS routing. **Also the step-2 fallback for child-block CONTENT resolution (Axis 3 child-routing): token → canonical slot → `standalone_block`, used when `blocks.parent_block` has no forced-parentage match, validated against `accepts_allowed_blocks` (added 2026-06-27).** |
| `attribute_gap_candidates.(proposed_action)` | the LIVE completeness ledger / prioritised backlog / anti-cheat evidence (2,373 rows; the `add attr: css=…` rows name every dropped property) |
| `html_tag_to_core_block` | atomic-tag-swap shape fallback only (R-31-2: tag is shape, not recognition) |

Columns with **no CSS-lift utility** (documented so a reviewer knows they were considered, not missed): `block_styles.*` (named presets), `variations.*` (editor preset bundles), `components.*` (editor JS), `block_changes.*` (audit log), `blocks.(grade/source/has_render_php)`.

---

## 5. Coverage matrix — the completeness instrument

The matrix is the artefact that makes "everything accounted for" measurable. **NOTE (v0.3 supersession): §12.2.1's draft-derived CSS Accounting Ledger is now the PRIMARY completeness instrument — the matrix only sees cells it already knows about (it cannot see the ~15 no-suffix-row property classes), whereas the ledger accounts for the whole draft declaration stream. The matrix is a secondary validation/dashboard, not the completeness gate.** **Rows** = every container-bearing block (30 composites + `sgs/container` + `sgs/media`). **Columns** = every capability × layer × tier × child-shape destination. **MF-7: the matrix MUST be an auto-generated artefact (`generate-coverage-matrix.py`)** — rows enumerated from `block_composition`, columns from the DB — so it can never silently under-count. ~~It does not yet exist; building it is a completion task, not prose.~~ **SHIPPED 2026-06-21 (D239), `scripts/coverage-matrix/`** — 33 DB-derived rows × 44 cols, auto-generated; COVERED/CHEAT classification still pending the F3-RUNTIME LANDED leg.

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

**STATUS (D250, 2026-06-30): ALL LISTED PROPERTIES NOW SEEDED** — `migrations/2026-06-30-property-suffixes-grid-position-bg-flex.py` added 20 `property_suffixes` rows covering every property listed above (new role `'position'` + `CssPosition` suffix for the inset/top/right/bottom/left/z-index family). Important caveats: SEEDED = data rows exist in the DB; the LIFT-PATH for most is a later stage. Exceptions: `background-size`/`background-position`/`background-repeat`/`background-attachment` DO lift now via `outer_box.py`; the rest (`order`/`grid-*`/`overflow`/`object-fit`/`position`/`flex`/`aspect-ratio`) are data-only — their resolver is a future stage-by-stage step.

---

## 6. Completion goals (the gate — Spec 31 is NOT done until all pass)

1. **One lift path.** The **8** `convert.py` lift functions (§1) + the css_router D1 path collapse into a single DB-driven dispatch; `grep` finds no second path writing the same attr; css_router's D1 fate is formally decided (MF-2). Gate on BOTH conformance suites.
2. **Zero per-block literals + zero hardcoded dicts.** No per-block branch in ANY orchestrator `.py` (the ~13 carve-outs de-literalised), including indirect forms (dict/frozenset/`.get(slug)`); `_SUFFIX_ATTR_OVERRIDES` (972) + `prop_map` (1519) removed/DB-sourced. Only `iconCircleBackground` in `_atomic_attrs_for` may remain, justified inline.
3. **One breakpoint vocabulary.** ALL THREE parallel systems unified onto `db.breakpoint_suffix_rules()`: delete `_GRID_TABLET_BP`/`_GRID_DESKTOP_BP` (convert.py:5232-33), eliminate the in-code `_BP_SUFFIX_MAP` (convert.py:980), and wire the wrapper-css lift path (currently uses neither). The F-ii decision (§9 Q1) implemented.
4. **Coverage matrix green.** Every non-N/A cell COVERED for all 31 blocks × 4 layers × 3 tiers × 3 child-shapes; zero CHEAT cells; GAP set listed.
5. **All 6 register families flip defect→match** on a live computed-style probe (page 8, 375/768/1440) — B/C/D/E/F/K each verified per-row (R-31-11), not by aggregate score.
6. **Both conformance suites green** (Gate A `scripts/tests/test_converter_conformance.py` + `converter_v2/tests/`) + a fresh `/sgs-update` reseed reproduces every DB change.
7. **Method-2 is IN-SCOPE, foundational** (resolved — §9 Q2 + §12.0, Bean-locked): native-composite routing (`.sgs-hero`→`sgs/hero`) is built at its pipeline stage (Stage 2/3 recognition/match) alongside every other block, NOT deferred to a sibling phase. **CLARIFIED 2026-06-26 (qc-council):** this routing already WORKS in the frozen engine (hero+trust-bar emit native composites with variant, live-verified); the rebuild's Stage-2 task is to PORT that correct recognition into the fresh `converter/` engine (which has none yet) — not to fix a live mis-recognition. The success metric is "the fresh engine reproduces correct recognition + variant, draft-vs-clone, zero cheats", measured against the draft, never the frozen output.
8. **Parity full-fidelity rises measurably** from baseline (61.82% M / 59.09% T / 55.45% D), desktop most.

---

## 7. Anti-cheat detection — making cheats impossible to hide

Bean's core requirement: a cheat must be **structurally obvious**, not score-inflating. Two complementary defences.

### 7a. Cheat-detection gate — `check-converter-cheats.py` (NEW; Python not JS, council MF-6)
The red-team proved the naive grep signatures have HIGH-severity bypasses. The gate is a **Python script that queries the DB**, scans the WHOLE `orchestrator/` tree (not one function), and **scans the PHP/CSS render surface, not just converter output**. It fails the build on any of:

1. **Per-block literal — WHOLE-tree + indirect forms.** Not just `if slug == 'sgs/`. Scan every `.py` under `orchestrator/` for: `slug ==`/`slug in`/`slug.startswith('sgs/`/`.get(slug)` against slug strings; dict/`frozenset`/`set`/`list` literals whose keys/members match `"sgs/[a-z-]+"`. Allowlist carries **function scope** (e.g. `iconCircleBackground` legitimate only in `_atomic_attrs_for`). *(Existing guard `check-atomic-slug-literals.py` covers only `_atomic_attrs_for` — HOLE 1; this supersedes it.)*
2. **Hardcoded property→attr dict — R-31-1.** Scan all `orchestrator/*.py` for dict literals with CSS-property string keys → attr-name strings. Two such violations exist: `_SUFFIX_ATTR_OVERRIDES` (convert.py:972) and `prop_map` (convert.py:1519). *(HOLE 8.)* **CORRECTION (D236, D-MODULAR):** "must be removed" is superseded — convert.py is FROZEN legacy (§12.0/§12.4); the gate BASELINES these legacy violations (the §12.6-step-1 armed-against-legacy pattern) and they vanish when the modular rebuild replaces that code path. Do NOT edit convert.py to remove them.
3. **`!important` over a faithful property — scan PHP/CSS, NOT converter output.** The converter already strips `!important` (`_strip_important`), so the real cheat lives in `class-sgs-container-wrapper.php` + block `style.css`/`editor.css`. The gate queries `property_suffixes.css_property`, then greps those render files for `<prop>...!important`. *(HOLE 3 — gate was scanning the wrong surface.)* **STATUS (D250, 2026-06-30): `check_important_render.py` is now SELECTOR-AWARE** — it skips variant-scoped or state-scoped `!important` rules (selectors containing `--modifier` or `:pseudo`-class variants) and only flags base-selector `!important`. This removes false positives on legitimate modifier/state overrides while still catching the real cheat pattern.
4. **Parallel breakpoint vocabulary — numeric-literal scan + dict-ban.** Ban integer literals 640–1100 in `convert.py` outside a `db.breakpoint_suffix_rules()` call (a name-scan misses coincidental literals); AND eliminate the in-code `_BP_SUFFIX_MAP` (convert.py:980) — it must derive from `modifier_suffixes`. *(HOLE 4.)*
5. **Mirror-emit / `sourceMode='bound'` / BEM-element className — WIRE THE EXISTING GATE.** `check_no_mirror.py` already has the right logic but runs `--report` (exit 0) and is NOT in `prebuild`/`pipeline-stage-gate.py` (its own `WIRE POINT` comment, line 17). After two consecutive zero-violation `--report` runs, switch it to `--enforce` and wire it. ~~*(HOLE 5 — gate exists but enforces nothing.)*~~ **CORRECTION (D238, `2341e761`):** WIRED — `check_no_mirror.py` auto-runs post-clone via the orchestrator (after `stage_9_report()`, pre-deploy) and HARD-HALTS on a NEW mirror violation; 13 legacy violations grandfathered via baseline. A commit-time static `sourceMode='bound'` AST tripwire (`scripts/cheat-gate/check_bound_emit.py`) was added D241. HOLE 5 CLOSED.
6. **D2-when-D1-exists — DB cross-join at pipeline close, not grep.** A Python check at pipeline end: for each property stranded in `variation-d0-d2.css`, query `property_suffixes`+`block_attributes`; if a D1 destination exists for that (block, property), FAIL. Also: a D3 gap-candidate entry that is ALSO routed to D2 is a CHEAT (silently drops to scoped CSS while looking like an honest GAP). *(HOLE 6.)*
7. **Sentinel leakage.** Scan emitted block attrs for the literal `"unitless"` (and any parse sentinel) AND scan the live rendered DOM. Family B's render-side strip must be confirmed per block.

### 7b. The structural-insufficiency rule (R-31-11 + R-31-13 — load-bearing)
**Rendered-DOM structural parity is necessary but NOT sufficient as a closing gate** — a faithful *mirror* (the cheat) satisfies structural parity by construction, so structure-match alone would pass the very cheat the rules ban. Therefore:
- the **closing gate is the live-homepage per-section visual check vs the DRAFT** (R-31-11: compare to ground truth, not internal tree shape) **+ Bean's co-authoritative eye** (R-31-13).
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
| **D** dropped max-width | §3 step 3 — max-width by layer. **RESOLVED for the OUTER box via the D230/D231 architectural width-model upgrade (SHIPPED 2026-06-18):** OUTER `max-width` → `maxWidth` literal (exact) or `align:"full"`; `widthMode`/`customWidth` retired. L2 band → `contentWidth` (token/literal). This is a genuine universal architectural primitive (not a spot-fix); the clean rebuild ADOPTS it as a per-resolver module rather than redoing it. |
| **E** dropped image styling | §5 — seed `order`/`object-fit`/`border-radius`-shorthand GAP rows; route media box-CSS to `sgs/media` |
| **F** grid breakpoint inversion | §3 — one breakpoint vocabulary + F-i/F-ii; delete parallel constants |
| **K** duplicate emit | §1 — one lift path (collapse the ~5 functions); cascade last-wins fix |

DEC-1…5 (block-match / Bean's-eye) and HF-1…7 (theme template-part) are **explicitly out of scope** for Spec 31 — they are recognition / theme-layer, not container-CSS transfer. **CLARIFICATION (D246): "out of scope" here means recognition + theme-layer ONLY. Content EXTRACTION (scalar text lift, media object-shaping, array/repeater lift, child-block emission) is IN scope and UNIFIED into the same dispatch (§0 scope note + §1 ONE-lift-path + §3 unified). Do NOT read "not container-CSS transfer" as "content is excluded" — that misread is exactly the D246 root cause.**

---

## 9. Open questions — RESOLVED by the 2026-06-17 qc-council (historically grounded)
1. **F-i vs F-ii → F-ii (preserve draft breakpoints).** Bean-mandated, not a fresh call: D228 + the `device-tier-vs-visual-breakpoints-are-distinct` memory rule lock it (device-tier attrs use 768/1024; arbitrary visual thresholds preserved). Implement the passthrough case. **One residual check:** confirm Mama's 640px grid breakpoint is visual, not device-tier, before routing it.
2. **Method-2 → FOUNDATIONAL, NOT deferred (Bean override 2026-06-17).** The council recommended deferring composite routing; Bean overruled: deferring it lets route-specific decisions be made now that harm other routes later, and forces rebuilds. Native-composite routing (`.sgs-hero`→`sgs/hero`) is in scope and built at its pipeline STAGE (block recognition/match) alongside every other block — not as a sibling phase. No matrix cell is BLOCKED-for-later; every route is made reachable when its STAGE is built. (The D163 premature-lift trap is avoided not by deferring, but by building the stage completely + cheat-checked before moving on.)
3. **Consolidate the lift paths FIRST, then seed.** D225 sequencing model (fix the foundational collector, then lift on top). Seeding new properties into a still-split dispatch produces Family-K duplicate-emit + non-isolatable regressions (the documented anti-pattern). Gate on BOTH conformance suites (the D222 lesson — a "conformance passed" that ran only one suite is unsafe).
4. **`align-items` LOCKED → `verticalAlign`** (D172 + memory rule, ratified). **`box-shadow`** is genuinely unbuilt → resolve by DB-querying the shadow attr the target block declares, then map (no new code). Mechanism already in §3 step 3. **STATUS (D250, 2026-06-30): `box-shadow` is NOW BUILT** — `converter/resolvers/outer_box.py`; token-snap to shadow presets; DB-first rowid resolution; NO_DESTINATION gap on unmatched raw values. This item is resolved.
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
| MF-6 | Rater 3 (PARTIAL→holes 1-8) | Anti-cheat gate rewritten: whole-tree + indirect slug forms; scan PHP/CSS for `!important` not converter output; numeric-literal breakpoint scan + kill `_BP_SUFFIX_MAP`; WIRE `check_no_mirror.py` to `--enforce`; D2-when-D1 DB cross-join; catch existing `_SUFFIX_ATTR_OVERRIDES`+`prop_map` R-31-1 violations (§7a). |
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

1. **Draft-derived CSS Accounting Ledger (MF-1, the keystone).** `declare_input` = the draft's parsed `(selector, property, value)` stream captured at Stage 0.7 BEFORE any routing — NOT the converter's recognised set / the `property_suffixes` table. `UNACCOUNTED = draft_decls − (transferred ∪ excluded-with-reason ∪ gap)`. Any UNACCOUNTED = hard fail. This is what makes the ~15 no-suffix-row classes (background-image, filter, opacity, transform, object-fit, pseudo-elements, font shorthand) impossible to silently drop. (Supersedes the §5 matrix as the primary completeness instrument — the matrix only sees cells it knows about; the ledger sees the whole draft.) **CONTENT-LEDGER GAP (A2, 2026-06-28, qc-council): `declare_input` currently captures ONLY the CSS `(selector, property, value)` stream — it does NOT yet capture CONTENT routing units (the draft's content nodes per §3 line 101).** Therefore a dropped SCALAR content node (selector matched nothing / empty text / no `<img>`) is currently UNGATED — and it MUST stay that way in the lift, because §3.B1 mandates the lift's strict no-op (a per-attr `ContentGap` inside the lift would breach §3.B1 + re-introduce a D245-style parallel tracker, STOP-25). **The spec-aligned fix = extend `declare_input` to capture CONTENT routing units** so `UNACCOUNTED` catches a dropped content node through this ONE ledger (not a second mechanism). Design-gated; folded into the W3 engine-wiring (next-session-prompt Register A / A2). Until it lands, scalar-content completeness is a tracked, documented gap (not a silent claim).
2. **WRITTEN vs LANDED (MF-2).** WRITTEN = attr emitted (progress signal, never a gate). LANDED = live computed-style on a NON-DEFAULT fixture equals the draft (the only "done"). WRITTEN-not-LANDED count >0 = hard fail (catches wrong-layer transfer in the ledger, not the eye).
3. **Differential render-oracle + metamorphic relations (MF-3).** Render-diff oracle (DIAGNOSTIC — the closing gate is computed-style-vs-draft per R-31-4 / §7b): render the DRAFT and render the CLONE, pixel-diff the two renders at 375/768/1440 per section (the draft is its own exact non-circular oracle). Plus metamorphic tests: source-order permutation → identical output; BEM-synonym rename → identical output (tests name-free routing); px-scaling by k → all transferred values scale by k.
4. **Closed, audited EXCLUDED set (MF-4).** `excluded_properties(css_property, reason, decided_by, date)` DB table; a gate fails the build on any in-code exclusion literal or any growth without a migration+reason. Excluded-from-lift ≠ excluded-from-clone (must still D2-passthrough for fidelity).
5. **Gates EXIST + WIRED as prerequisites (MF-5).** Build `check-converter-cheats.py`, `generate-coverage-matrix.py`, the ledger pipeline-close check; wire `check_no_mirror.py --enforce` + `check-converter-cheats.py --check` into `package.json prebuild`; add a `PreToolUse` git-commit hook in `.claude/settings.json` (closes the commit-without-build bypass). Plain-English failure messages for a non-coder QC owner. ~~(All verified ABSENT/asleep today.)~~ **DONE 2026-06-21 (D239/D240/D241):** all built, armed + WIRED — see the §12.7 F5 row. The git-commit hook is `.claude/hooks/f5-commit-gate.py` + `.githooks/pre-commit`.
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

> **STATUS (2026-06-23, D243): Step 1 (Phase F foundation) + Step 2 (modular scaffold, VERTICAL SLICE) COMPLETE.** Step 1: F1–F6 + the F5 gate cluster built/armed/wired/hardened (D240/D241). Step 2 (D242 design-gate → D243 build): the fresh `plugins/sgs-blocks/scripts/converter/` modular home — 2 armed static anti-cheat gates + block-naming-free dispatch table + typed Ctx/Decl + 7 services + the ONE real `outer_box` resolver (max-width→maxWidth) + 6 honest GAP-stubs + orchestrator (conservation spine) + coverage report — **LANDED-proven on a live canary** (oracle/verdict.py = LANDED). 580+6xfail tests; convert.py byte-identical (D-MODULAR). The current next action is **Step 3 (stage-by-stage rebuild)**, **Stage 2 (recognition / Method-2) first** — each stage its own design-gate + LANDED proof (A14, never bank from the slice).
>
> **STATUS (D250, 2026-06-30): Step 3 PARTIAL — §12.6/§12.7 Steps 1–7 are now BUILT inside the new `converter/` engine. Specifically:** Step 4 = full `_route_composite_interior` walker PORTED to `converter/services/extraction.py run_mechanism_b` (scalar-media column / content-block recurse / slug-None fold / generic G1 parent-token / G3 validation). Step 7 (KEYSTONE) = `build_block_markup._build_css_attrs` now drives BOTH `process_element` (CSS) AND `extract_content` (content) into ONE emit — Finding A FIXED (process_element now has a production caller; the two inert halves are wired). Grid-template-* also route PRE-LAYER to the grid resolver on a section root via `dispatch_table._GRID_LAYOUT_PROPS`. **CRITICAL: all D250 work is WRITTEN not LANDED — the new engine is still INERT in production** (frozen `convert.py` runs live clones per STOP-28); Step 10 LANDED proof is owed before any step can be marked done per §12.2.2.
>
> **STATUS (D252, 2026-06-30): W3 keystone — UNIVERSAL CHILD-LIFT done + new engine WIRED into `/sgs-clone` (flag-gated).** Two fixes (commit `df9798a9`): (1) the child-lift collapse — every child routes through `build_block_markup` (one unified content+CSS+variant dispatch); a new `run_mechanism_leaf` arm lifts a capability-less leaf's OWN element content (primary text + one image + one url via the SHARED `field_extractors`) + the inheritStyle preset resolution + R6 background-strip (port of `convert.py:3364-3366` / `4994-5028`); a pre-commit 2-rater review caught + fixed an over-lift (the tight one-per-shape gate). (2) **recognition.py scalar branch now DERIVES `has_inner_blocks` from the DB** (was hardcoded 0) — an element-class-recognised InnerBlocks parent (`.sgs-hero__ctas`→`sgs/multi-button`) was mis-typed as a leaf → its buttons silently dropped. **The new engine is now reachable from the live pipeline behind `SGS_NEW_ENGINE=1`** (commit `798febc7`, `converter_v2/__init__.py:_convert_section_body`): per section it uses the new engine when the section recognises to a registered block + emits non-empty markup, else falls back to the frozen `walk()`. Flag UNSET = 100% frozen (unchanged).
>
> ### CURRENT BUILD STATE vs FULL SCOPE (D252, 2026-06-30) — read this for "what's built / what's left"
> A genuine full-homepage run of the new engine on the Mama's draft (9 top-level sections) is the universality measure:
> - **BUILT + recognises + emits faithfully (2/9):** `sgs/hero` (incl. CTAs landing via the child-lift, variant=split, both art-directed images, label/heading/sub) and `sgs/trust-bar`. These are sections whose BEM root maps to a registered composite block.
> - **HONESTLY GAPS — `recognise()`=`unrecognised`, emits nothing (7/9):** `sgs-header`, `sgs-featured-product`, `sgs-brand`, `sgs-ingredients-section`, `sgs-gift-section`, `sgs-social-proof`, `sgs-footer`. These are **slug-None pattern/container sections** with no registered composite block — they need **FR-31-4 / FR-31-4.1 (section base is always `sgs/container`; wrap the unrecognised section + recurse its children)**, which the frozen `walk()` does but the new engine has NOT built. **This is the single biggest remaining gap** — it is what takes the new engine from "the 2 composite sections" to "any real homepage." No cheats were emitted (gaps, not fakes) — the R-31-9 single-use-case-cheat trap is avoided.
>
> ### ⛔ DEFAULT-IS-CONTAINER (Bean, 2026-06-30 — the load-bearing rule Spec 31 had buried)
> **The DEFAULT for EVERY top-level class-section is `sgs/container` with its blocks recursed inside it. A registered-composite name-match (hero, trust-bar, cta-section — `blocks.tier='class-section'`) is the EXCEPTION, not the norm.** Most sections on a real page have NO block of their own and MUST emit `sgs/container` + children — this is **FR-31-4 ("Section base is always sgs/container") + FR-31-4.1** (the fold/recurse procedure), not a "fallback." A no-name-match section is the COMMON case, never a failure.
> **NEW-ENGINE DEVIATION (the real cause of the 7/9 "gap"):** `converter/recognition.py`'s 4th branch codes a no-match section as a LOUD RED failure ("never a silent empty `sgs/container` emit") — this CONTRADICTS FR-31-4. D244 over-corrected: it conflated an *empty* `sgs/container` (bad) with `sgs/container` *carrying its recursed children* (the correct default). **Fix = the slug-None section root defaults to `sgs/container` + recurse children (the walker already recurses; recognition/dispatch must default, not fail).** This is the #1 remaining engine fix and the unlock for 7/9 real sections.
>
> **WHAT'S LEFT TO BUILD (prioritised; each is a named §12 stage, NOT an ad-hoc gap):**
> 1. **`sgs/container` DEFAULT for slug-None sections (Stage 2 + FR-31-4/4.1)** — make the new engine default a no-name-match section to `sgs/container` + recurse children (per the DEFAULT-IS-CONTAINER box above), instead of failing loud. Unblocks 7/9 real sections. **HIGHEST PRIORITY.**
> 2. **CSS-branch resolver completeness (§3.A / §5)** — the §5 properties are SEEDED but most have no LIFT resolver yet (`order`/`grid-*`/`overflow`/`object-fit`/`position`/`flex`/`aspect-ratio`); only `outer_box` (box/bg/box-shadow), `root_supports` (native `style.*`), and grid-template lift today. B2 per-element styling lift (typography/colour on nested children) is partial.
> 3. **Content-conservation ledger extension (A2, §12.2.1)** — `declare_input` must capture CONTENT routing units (not just CSS) so a dropped scalar content node is UNACCOUNTED, not silent.
> 4. **media-map loader (A1)** — the new engine has no media-map driver, so image `src`s are not remapped to uploaded WP URLs.
> 5. **Stage 4b** — pseudo-elements (`::before`/`::after`), non-device-tier breakpoints preserved-or-UNACCOUNTED.
> 6. **F3-RUNTIME render-oracle (Playwright leg)** + the multi-shape fixture LANDED gate at scale.
> 7. **LANDED proof on the canary** (now achievable via `SGS_NEW_ENGINE=1`) — then production-wire + retire `convert.py` (D-MODULAR end state) + **Spec 22 ABSORBED (§13) + archived (D253).**

1. **Foundation first** (12.2): the draft-derived ledger + WRITTEN/LANDED + render-oracle + closed EXCLUDED + all gates, built and ARMED against the current/legacy output (today's cheats show as CHEAT/GAP) so any later change is provably non-regressing. **[DONE — Phase F, D232–D241.]**
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
| **F4** ✅ **DONE 2026-06-18 (D235, `870f48aa`)** | **Closed EXCLUDED set** — `excluded_properties(css_property, reason, decided_by, date)` table + dated migration (MF-4) | — | **CORRECTION (D235):** the table SHIPS EMPTY — "seed width/max-width" was WRONG (width/max-width are excluded-from-LIFT, still cloned; not clone-exclusions). The literal-ban gate the original F4 proposed OVERCLAIMS (a 3-rater /qc-council found it a tripwire blind to inline/anonymous/transform/None-lookup/out-of-tree drops) and MOVED to F5; the real no-drop guarantee is F2+F3+the css_router coverage invariant+F5's ledger checker. Design: `.claude/plans/archive/2026-06-18-f4-excluded-properties-design.md`. |
| **F5** ✅ **DONE 2026-06-21 (D239/D240/D241)** | **The gates, built + ARMED + WIRED** — `check-converter-cheats.py` (§7a, whole-tree) + `generate-coverage-matrix.py` (§5, secondary dashboard) + the pipeline-close ledger checker (UNACCOUNTED>0 / WRITTEN-not-LANDED>0 → fail); `check_no_mirror.py` auto-runs post-clone; `check-converter-cheats.py --check`; the `PreToolUse` git-commit hook `.claude/hooks/f5-commit-gate.py` + `.githooks/pre-commit`; the EXCLUDED-literal gate (MF-4); plain-English failure messages (MF-5) | F2, F4 | **SHIPPED (D239):** all 5 gates built, baseline-armed (STOP-14), WIRED to run (STOP-6) — `check_no_mirror` auto-fires on every clone via the orchestrator (D238, `2341e761`); the 4 static gates run on every `git commit` via `f5-commit-gate.py` + `.githooks/pre-commit`. **HARDENED (D240):** adversarial-council fixed a fatal tier-blind coverage-join (surfaced 19 hidden cross-tier drops, now baselined), count-blind check_no_mirror, vacuous tuple-key cheat-check, + SHA-256 self-blessing on all baselines. **RESIDUALS fact-checked + closed (D241):** only 2 evidenced deferrals remain (`P-F5-RESIDUALS`) — F3-RUNTIME LANDED leg (needs a Playwright render-harness; arms with the rebuild) + css_router D1 media-axis (D1 is a dead output; the gate fails-safe; the rebuild's MF-2 owns it). 544 tests green; convert.py untouched (D-MODULAR). |
| **F6** | **DB-as-code consistency suite** (§12.4) — no `(block,layer,property)`→≥2 attrs without disambiguator; `has_inner_blocks` agrees with save.js; no variant discriminator collides with a liftable structural attr | — | suite runs in prebuild; current DB violations enumerated |

Phase F output: the ledger + oracle + armed gates form the spine. The current converter's output now has a **measured baseline** (its UNACCOUNTED set, its CHEAT cells, its render-diff deltas) — any rebuild step is provably non-regressing against it.

**Gap-to-stage map** — each Tier-2 HIGH gap is owned by the stage that rebuilds it (so no gap is orphaned between stages). **NOTE (D246): the "Stage 3c (fold tree)" + "Stage 4f (child-shape fork)" content rows below are CONTENT RESOLVERS inside the ONE dispatch table (§12.4) — built by MODULARISING the working `_lift_scalar_attrs_by_selector` / `_lift_scalar_media_from_img` functions (§1) into the same `(block, layer, property/role, tier) → resolver` table as the CSS resolvers. They are NOT a separate content engine or a parallel pipeline. "Stage 3c/4f" names a fork/branch within the unified dispatch at that stage, never a second system (the D245 separate-engine misread of this framing is what D246 corrects).**

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

---

## 13. Pipeline architecture — binding rules, walker, content fork, variant detection

The pipeline's binding rules + recognition/walker/content-fork architecture. **ID note:** `R-22-N` ≡ `R-31-N` and `FR-22-N` ≡ `FR-31-N` (same N) — the frozen `convert.py` (D-MODULAR) keeps the `22` series, everything else uses `31`.

### 13.1 Binding rules (R-31-1 … R-31-15) — the single authoritative list

Every commit on the pipeline is gated by these. (Sibling project-methodology rules live in `decisions.md` + `~/.claude/rules/`.)

| Rule | Statement |
|------|-----------|
| **R-31-1** | **DB-first, no hardcoded dicts.** All lookups via DB tables; the only permitted constant is `SKIP_TOP_LEVEL_TAGS` (3 bounded HTML tags: header/footer/nav). Role classification lives in the `roles` table. No Python block/property dicts. |
| **R-31-2** | **BEM is the only recognition signal** (Spec 00 §3.1). HTML tag is rendering-shape only, except in the bounded atomic-tag-swap exception. |
| **R-31-3** | **Three permitted walker exceptions, no others** (FR-31-3). A 4th branch needs a spec amendment with empirical justification; a deferred refinement lands as a refinement to the FR-31-4 container-default behaviour or as enrichment of an existing exception, NEVER as a 4th conditional. |
| **R-31-4** | **Pixel-diff is a per-commit DIAGNOSTIC, not the closing gate.** §7b's live-homepage-vs-draft computed-style check + Bean's eye is the closing gate; pixel-diff mis-scores reflowed/empty sections. `/sgs-clone --debug-trace` Stage 11 captures pre/post deltas for the commit message. |
| **R-31-5** | **Phases never ship as single commits.** A walker/architecture phase splits into ≥3 commits. |
| **R-31-6** | **Output-only inference is a trap.** Verify mockup HTML AND extract.json AND live DOM at each milestone. |
| **R-31-7** | **Council fix-shapes are hypotheses, not specs.** Multi-rater proposals require empirical pre/post measurement before subagent dispatch. |
| **R-31-8** | **Schema enumeration before "missing X".** Query `sgs-framework.db` via `/sgs-db` before claiming any column/table/row gap. |
| **R-31-9** | **Universal mechanisms, no per-block hyperfocus.** Over-broad universality (firing where it should not) is ALSO a break. |
| **R-31-10** | **Read the full spec before proposing a fix-shape.** State the architectural primitive in plain English first. |
| **R-31-11** | **Verify rendered output vs the DRAFT, not internal metrics.** A rendered-DOM *structure* assertion is itself an internal metric (a faithful mirror satisfies it) — the closing check compares the rendered output against the draft ground truth, not the tree's internal shape. |
| **R-31-12** | **QC gates are structural, not prompt.** `/qc-council` pre-commit enforced via `pipeline-stage-gate.py`. |
| **R-31-13** | **Bean visual sign-off is co-authoritative.** Script numbers + Bean's eye + cropped-pair artefacts together close a section. Numbers alone do not close; eye alone does not close. |
| **R-31-14** | **FR-31-6 migrations never carry server-side legacy fallback hacks.** The "render.php reads scalar attrs + builds inner HTML, ignoring `$content`" problem is exclusively SGS-framework debt. NEVER add a legacy-scalar-render fallback (`if empty content and not-empty legacy_attr`) to a migrated render.php. (Bean P1-locked.) |
| **R-31-15** | **No mirror emit.** The converter MUST convert every recognised node to native attrs. It MUST NOT (a) emit a block whose `className` carries a draft BEM ELEMENT class (`sgs-<block>__<element>`); (b) set `sourceMode='bound'` / echo-`$content` passthrough on a converter-emitted block (live WC configurator `wc-product`/`sgs-cpt` is the only legitimate non-typed mode); (c) route layout CSS to D2 scoped CSS when a D1 native-attr destination exists. Enforced by the commit-gating anti-mirror gate (`check_no_mirror.py`). |

### 13.2 Recognition + the single-recursive walker contract (FR-31-1 / FR-31-3 / FR-31-16 / FR-31-15)

- **FR-31-1 — BEM recognition.** The walker reads the `class` attr, parses BEM, and resolves a block slug via the DB (`slots scope='element'`, `blocks`). No hardcoded class→block dict (R-31-1); the HTML tag is shape only (R-31-2).
- **FR-31-3 — exactly three permitted walker exceptions.** The walker is ONE recursive function whose only branching surface is three conditionals: **(1)** atomic-tag swap (`not sgs_classes and node.name in atomic_tag_map`); **(2)** chrome-skip at top level (`is_top_level and node.name in SKIP_TOP_LEVEL_TAGS`); **(3)** top-level container wrap (`is_top_level and resolved_slug != 'sgs/container'`). All other divergence comes from DB row variation, never code. A 4th branch fails the contract (R-31-3).
- **FR-31-4 — section base is always `sgs/container`** — the load-bearing DEFAULT (see the **DEFAULT-IS-CONTAINER** box in §12.6): a top-level class-section emits `sgs/container` with its children recursed, UNLESS its root class is registered `blocks.tier='class-section'` (hero, cta-section, trust-bar), which returns from the voter at confidence 1.0 and emits its composite directly. A no-name-match section is the COMMON case, never a failure. **FR-31-4.1** is the universal fold/recurse procedure, in precedence order: block-match wins → a direct-descendant slug-None wrapper FOLDS its CSS into the container (grid/flex descendant → the container absorbs the layout, its items become grid items) → a block-resolved direct-descendant becomes its block (and IS the grid item) → a non-direct wrapper gets its own `sgs/container` → a text-only sgs-classed leaf becomes a CONTENT block (text-capable target), NEVER a `sgs/container` wrapping raw text (which fails block validation).
- **FR-31-16 — voter tier-driven recognition.** Recognition consults `blocks.tier='class-section'` (a DB signal, not a slug literal) via `is_class_section_block()`; class-section blocks emit their composite, all others fall to the FR-31-4 default.
- **FR-31-15 — capability-aware tiebreaking.** When a draft BEM class has ≥2 candidate slugs, rank by `block_capabilities` (`_capability_rank` / `capabilities_for`) — DB-driven, no per-block branch.

- **FR-31-11 — non-sgs pass-through.** A DOM node with NO `sgs-` classes (not an atomic-tag swap) emits NO block of its own: its children recurse into the nearest emitting ancestor's InnerBlocks, any non-sgs classes are preserved on that ancestor, at unlimited depth. Preserving a draft BEM *element* class on an emitted block is a LAST-RESORT only and MUST raise a FAIL-able warning when the node's CSS could not be lifted (R-31-15(a)) — never the success path.
- **FR-31-12 — Stage-2 artefact preservation.** Stage 2 writes a `stage-2.json` entry for EVERY section boundary even when the BEM resolves unambiguously (so a recognition decision is never silently un-recorded). PASS: every section in `extract.json` has a `stage-2.json` entry. (Artefact catalogue: Spec 21.)

### 13.3 The content fork — scalar attr vs child block (FR-31-2 family; canonical mechanism, closes the §3.B G1–G5 gaps)

This is the **single authoritative content fork** for §3.B (it supersedes §3.B's earlier acknowledged-incomplete restatement and closes its G1–G5 open gaps):

- **FR-31-2 — block-equivalent attrs become child blocks; only behavioural attrs become scalar.** `equivalent_block_for(parent, slot)` drives the fork: non-NULL → the slot's content emits as a child InnerBlock; NULL → the content lifts to a scalar attr. The SAME `equivalent_block_for` is the only call-site for BOTH the CSS-D1 child-attribution (FR-31-5) and the content fork — one authoritative implementation in `db_lookup.py`, two callers.
- **FR-31-2.1 — two-tier derivation** (the G1 token-match predicate): **Tier A** = direct join on `canonical_slot` + `role` + `attr_type`; **Tier B** = BEM-element segment from `derived_selector` (strip the `sgs/<parent>-` prefix so `accordion-item` matches `__item`). (Tier C role-derivation is RETIRED, D85.)
- **FR-31-2.2 — role-exclusion allowlist** (the G4 scalar-vs-child decision): `equivalent_block_for` returns a slug ONLY when the attr's `role` is in the **content-bearing positive allowlist** (5 roles); the ~16 styling/behaviour roles (incl. `scalar-media`) return NULL → scalar lift. This is why `splitImage`/`sideImage` (role `scalar-media`, D128) lift to scalar, not a `sgs/media` child — by design, not a carve-out.
- **FR-31-2.5 — array/repeater resolution** (the B4 mechanism): an `attr_type=array` attr resolves its item schema via `array_item_slot_for()`; sibling-class DOM traversal of the array container emits one entry per item, each item's fields lifting via the same role-aware mechanism (FR-31-2.2).
- **Recursion rule (G2):** an emitted child block recurses into its own content via the same dispatch (a child can itself be an InnerBlocks parent — accordion-item's `__title`/`__content`). **NULL `accepts_allowed_blocks` (G3):** treated as permissive (admit + trace), never a silent drop.

### 13.4 CSS routing completions (FR-31-5 / FR-31-5.1 / FR-31-5.3)

- **FR-31-5 — four-destination CSS router (D0/D1/D2/D3):** D0 global tokens → theme.json; **D1** typed-attr lift → block attr (when a `property_suffixes` row matches an attr the emitted block declares); D2 scoped variation CSS (`variation-d0-d2.css`, inline at Stage 10); D3 `attribute_gap_candidates`. The D1 child-attribution rule routes a `.sgs-X__Y` rule to the CHILD block when `equivalent_block_for(X, Y)` is non-NULL (the FR-31-2 fork).
- **FR-31-5.1 — inherited / absent-value resolution:** an inheritable CSS property (e.g. `text-align`) absent on an element resolves by walking the ancestor chain; a genuinely-absent inheritable value defaults to its CSS initial (LTR `start`), never invented.
- **FR-31-5.3 — cross-node interior box-CSS → parent per-slot attr group:** a direct child's box-CSS (padding/max-width/min-height/gap/margin) folds onto the parent's per-slot/area attrs when `slot_has_equivalent_block(parent, slot)` is FALSE (no child block owns it); when TRUE the CSS goes to the child block. (`slot_has_equivalent_block` is the CSS-fork ONLY; never the child-block-emission predicate.)

### 13.5 Variant detection (FR-31-20)

`blocks.variant_attr` names the selector attr; `variant_slots(block_slug, variant_value, unique_slot)` holds each variant's **discriminating** slots (set-difference vs siblings). The detector (`detect_variant` / `variant_attr_for`) counts how many of each variant's `variant_slots` were populated **from the draft extract THIS run** (never the block's stored attrs — that was the banned `$is_split` cheat) and sets the highest-count variant. Universal + DB-driven (R-31-1/R-31-9), gated by `blocks.variant_attr IS NOT NULL`, NOT a 4th walker branch (R-31-3). The code is universal; the remaining gap is DATA (`block.json supports.sgs.variants` unpopulated for most blocks). For class-modifier-encoded style presets (e.g. `sgs/button` `inheritStyle` primary/secondary/outline), the BEM `--modifier` maps to the enum attr gated on a string-typed `inheritStyle`/`variantStyle` (D252; not the slot-set-difference path, which cannot discriminate structurally-identical variants).

### 13.6 Composite-mirror + render.php migration (FR-31-21.1 / FR-31-21.2 / FR-31-6)

- **FR-31-21.1 — composite-mirror rule:** every composite with a built-in wrapper (`block_composition.wraps_block='sgs/container'`, 31-block roster) MIRRORS `sgs/container`'s wrapper capabilities per its `container_kind` (section/layout/content) — never diverges with per-block CSS hacks. Missing capabilities are gap candidates to add to the composite, never converter workarounds.
- **FR-31-21.2 — auto-propagation:** `/sgs-update` Stage 11 propagates a new container capability to all 31 composites (writer + scanner WIRED; `--apply` build-pending).
- **FR-31-6 — hybrid render.php migration:** a composite whose content was scalar attrs migrates to emit `<InnerBlocks.Content />` + a `deprecated.js` covering the old shape; **never** a server-side legacy fallback (R-31-14). The 61-block roster is DB/report-derived (query `/sgs-db`, never hardcode).

- **FR-31-6.1 — parallel-session migration protocol.** When render.php migrations are dispatched across parallel subagents: each agent is confined to its own block directory; an agent that needs a shared helper HALTS and RETURNS rather than editing a shared file (STOP-2 / `subagents-must-not-write-shared-files`); agents have NO git-commit authority (the main session reviews + commits); the legacy-cleanup phase is BLOCKED until every agent has closed. This prevents the `rater-agents-must-never-git-revert-shared-tree` failure class.
- **R-31-14 correct path (not a fallback hack):** the sanctioned way to give a migrated block backwards-compat is the FULL FR-31-6 roster migration (deprecated.js for the old shape) + a WP-CLI batch sweep of existing posts — never a server-side `if empty($content)` legacy-scalar-render branch in render.php.

### 13.7 Data interface (FR-31-8 / FR-31-8.1)

All DB access via the `db_lookup.py` accessor layer + `wp-blocks.py` CLI — **never raw `sqlite3` in pipeline scripts**. Cross-DB authority: `sgs-framework.db` is authoritative for block schema/composition/variants; `uimax` is a recognition oracle for gap-writing only (the walker never queries uimax at runtime — FR-31-9 down-scoped). Performance: `db_lookup` ≤2ms cache-warm.

### 13.8 Appendices (implementation reference)

**Appendix A — the single-recursive walker** (the FR-31-3 three-exception contract, pseudocode):

```text
walk(node, css_rules, is_top_level):
    sgs_classes = [c for c in node.classes if c.startswith('sgs-')]
    # Exception 1 — atomic-tag swap
    if not sgs_classes and node.name in atomic_tag_map():   -> emit atomic block
    # Exception 2 — chrome-skip
    if is_top_level and node.name in SKIP_TOP_LEVEL_TAGS:    -> recurse children, no wrapper
    slug = resolve_slug_from_bem(sgs_classes)                # DB, name-free
    # Exception 3 — top-level container wrap
    if is_top_level and slug != 'sgs/container':             -> wrap emit in sgs/container
    -> emit block(slug) with attrs from DB; recurse children per FR-31-4.1 fold/recurse
```

**Appendix B — `atomic_tag_map()` resolution** (FR-31-3 exception 1): a reverse-walk of `blocks.replaces` (Tier 1) then `html_tag_to_core_block` (Tier 2 shape fallback) maps a bare HTML tag to its block (`h1→sgs/heading`, `img→sgs/media`, `a→core/button`, `blockquote→sgs/quote`, `p→sgs/text`). Tag is shape, context is meaning (R-31-2).
