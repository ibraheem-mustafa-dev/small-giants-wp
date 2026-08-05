# Content/Styling two-phase split — feasibility report

**Date:** 2026-08-05
**Scope:** read-only investigation. No code changed.
**Proposal under test (Bean's):** split the cloner into CONTENT phase then STYLING phase — lay out the content-bearing/structural blocks first, then apply matched styling attributes to the matched blocks/elements separately.
**Root under test:** `plugins/sgs-blocks/scripts/converter/` (the ONLY converter; the `converter/` path quoted in the brief does not exist at repo root).

**Verdict: PARTIAL — and the partiality is load-bearing.** The two passes are already *textually* separate and share no data (neither reads the other's output dict). But the CONTENT pass's decision about *which nodes become blocks at all* is taken from CSS, and one block's *variant* (a render-structure fork) is decided 100% from CSS-derived attrs. A content-first phase therefore cannot know the node set or the variant it is laying out.

---

## 1. What `build_block_markup` actually does, in order

File: `plugins/sgs-blocks/scripts/converter/services/assembly.py`, function `build_block_markup` (lines 78–448).

| # | Line | Step | Reads | Writes |
|---|---|---|---|---|
| 0 | 118–120 | late-bind `extraction`; `_css_rules = css_rules or {}` | — | — |
| A | **124** | **CSS pass** — `_ext._build_css_attrs(rec, section_root, _css_rules, is_root)` | `rec`, node, raw `css_rules`, `is_root` | `css_attrs` |
| B | **127** | **CONTENT pass** — `_ext.extract_content(rec, section_root, media_map, _css_rules)` | `rec`, node, `media_map`, raw `css_rules` | `results` (ScalarLift / ChildBlock / ContentGap) |
| 1 | 130 | variant attrs from Recognition | `rec` | `attrs` |
| 2 | 131 | merge CSS attrs | A | `attrs` |
| 3 | 139–154 | merge content ScalarLifts; `gridItem*`-prefixed lifts use `setdefault` so the CSS pass wins; ContentGaps recorded | A + B | `attrs` |
| 3a2 | 167–172 | tag-identity write (`heading.level`) from node tag | node, DB | `attrs` |
| 3a3 | 186–190 | `textWrap` from the node's **effective CSS** | CSS | `attrs` |
| 3b | 202–206 | **arrangement `layout` trigger** — `arrangement.layout_attrs(node, css_rules)` | CSS | `attrs` |
| 3c | 221–242 | **composite band-fold** — `_sole_passthrough_child` then `fold_band_css` | CSS + DOM | `attrs` |
| 3d | 259–291 | **per-area fold** — iterate `section_root.children`, key on BEM `__element`, `route_area_css_to_block_attrs` | DOM structure + CSS | `attrs`, `sgsCustomCss` |
| 4 | 303–308 | **variant detection** — `db_lookup.detect_variant(rec.slug, attrs)` over the **merged** dict | A **and** B | `attrs[variantAttr]` |
| 5 | 317–355 | `inheritStyle` preset from the node's BEM `--modifier` class | DOM classes, DB | `attrs` |
| 5b | 368–376 | **strips** `style.color.text` / `.background` when a preset is set | step 5 | deletes CSS-pass output |
| 6 | 384–393 | second background strip (same gate) | step 5 | deletes CSS-pass output |
| 7 | 408–418 | `align:"full"` when the section root has no `max-width` | CSS + DB supports | `attrs` |
| 8 | 434–436 | token-resolution advisory check over final `attrs` | A + B | findings only |
| 9 | 444–448 | concatenate `ChildBlock.content` strings → `emit_block_markup(slug, attrs, inner)` | B | **markup string** |

**The single most important fact for the proposal:** steps A and B do **not** exchange data. `extract_content` is never passed `css_attrs` (assembly.py:127), and `_build_css_attrs` is never passed `results`. Both read the *raw* `css_rules` dict independently. The coupling is not a data pipe — it is that **both passes make structural decisions from the same CSS**, and the merge afterwards is order-sensitive.

---

## 2. Order dependencies that block a clean split

### D1 — [INTRINSIC] The fold/dissolve gate is a CSS decision that changes the node set
`extraction.py:380` — `_sole_passthrough_child` returns `None` if `arrangement.carries_arrangement(parent, css_rules)`.
`arrangement.py:42–58` — that function is pure CSS: `display:grid|flex` in base decls **or any @media tier**, or the presence of `grid-template-columns`.

Consequence at `extraction.py:447–465`: when the gate passes, the child wrapper **does not become a block**. Its CSS folds onto the parent (`fold_band_css`) and `_descend_container_children` re-descends *through* it. When the gate fails, that same DOM node becomes its own `sgs/container` (`extraction.py:335–349`).

So: *whether a DOM node exists in the output block tree* is answered by the parent's `display` property. A content-first phase would have to make that call blind, then a styling phase would have to add or delete blocks — which is not "applying styling to matched blocks", it is re-running layout.

### D2 — [INTRINSIC] The uniform grid-item fold is CSS-gated
`extraction.py:435` computes `parent_arranges` from CSS; `extraction.py:483–488` only runs `arrangement.lift_uniform_grid_item_css` when `parent_arranges` and ≥2 element children. Which per-item CSS folds to the container vs stays on the child (`arrangement.py:138–163`) is decided by comparing every item's declarations. This is a *cross-node* CSS decision that must know the item set — i.e. it needs content structure **and** CSS at the same moment.

### D3 — [PARTIALLY REMOVABLE] `arrangement.layout_attrs` reads CSS to set a render-structure attr
`assembly.py:202–206` → `arrangement.py:61–102`. The `layout` attr is what makes `SGS_Container_Wrapper` render `display:grid`; `gridTemplateColumns` is inert without it (documented at `arrangement.py:65–70`). This is CSS→structure, but only at *render* level — the block tree is unaffected. It could sit in a styling phase **provided** nothing in the content phase branches on it. Nothing currently does (grep: `layout_attrs` has exactly two call sites, `assembly.py:205` and `fold_helpers.py:548`).

### D4 — [REMOVABLE — already unwired] `l2_qualify.qualify` is the purest form of the blocker
`services/l2_qualify.py:234–316`. Requirement **A** (line 257): parent arranges → child is a grid item, reject. Requirement **F** (lines 301–314): a child is only dissolvable if **every CSS property it declares has an attribute destination on the parent** (`_lands_on_parent`, lines 168–227).

That is the split's core problem stated as a rule: *"does this node survive as a block"* is answered by *"where does its CSS go"*. The module's own docstring (lines 7–16) records the reverse contradiction — a node cannot be required to be recognised as a block before its layer is classified, because an L2 by definition is not a block.

**Verified unwired:** grep for `l2_qualify` / `qualify(` across the converter returns only the module itself plus three prose references (`entry.py:314`, `fold_helpers.py:505–518`, `section_passes.py:51`). Nothing calls it. So D4 is a *designed-but-unwired* blocker, not a live one.

### D5 — [INTRINSIC] Variant detection reads the merged CSS+content dict
`assembly.py:303–308` → `db_lookup.detect_variant(rec.slug, attrs)` (`db/db_lookup.py:3234–3270`) scores each variant by how many of its `variant_slots` rows are populated in `attrs` — the dict that already contains **both** CSS attrs (step 2) and content lifts (step 3).

Measured against the live DB (`variant_slots` + `block_attributes`):

| Block | Variant | Discriminating slots | Provenance |
|---|---|---|---|
| `sgs/hero` | standard / split / video / svg-animated | `backgroundImage`, `splitImage`, `splitImageMobile`, `backgroundVideo`, `bgVideo`, `svgContent` | **content** (roles `image-object` / `scalar-media` / `svg`; `css_property` NULL) |
| `sgs/trust-bar` | icon-circle | `iconCircleSize`, `iconCircleBackground`, `iconColour`, `iconCircleBorderRadius`, `iconCircleShadow` | **CSS** (`css_property` = `height`, `background-color`, `color`, `border-radius`, `box-shadow`) |
| `sgs/trust-bar` | image-badge | `badgeImageBorderRadius`, `badgeImageSize`, `badgeImageShadow`, `badgeImageObjectFit` | **CSS** (`border-radius`, `height`, `box-shadow`, `object-fit`) |

`sgs/trust-bar`'s variant is **100% CSS-determined**. The variant feeds `render.php`'s structural fork. Under a strict content-first phase, trust-bar's structure is undecidable until styling has run.

### D6 — [INTRINSIC] `layer_detect` routes CSS by a structural label read off CSS
`orchestrator.py:205` calls `layer_detect(ctx, base_decls)` once per element. `services/layer_detect.py:26–47`: `is_root` → OUTER; `ctx.area_name` → GRID_AREA; `display:grid` or `grid-template-columns` → GRID; `max-width`+`margin` → CONTENT; else CONTENT. Which resolver family owns the node's declarations — and therefore which attrs get written — is decided from the declarations themselves plus one structural bit (`is_root`).

### D7 — [INTRINSIC] Routing one property changes the destination of another
`fold_helpers.py:682–714`: `display` and `grid-template-*` are **held back** from the band's main cascade because "including `grid-template-columns` in the main stream turns `max-width` from `contentWidth` into an UNIMPLEMENTED_STUB" (fold_helpers.py:684–688 — measured claim in-source). They are re-routed by `_fold_band_arrangement` (`fold_helpers.py:467–601`), which needs the **band node**, the **owning slug** and the **held decls** simultaneously.

### D8 — [REMOVABLE] The content walk contains a CSS pass
`walk.py:561–563` registers `styling_content` (priority 31) as a **CONTENT_HANDLERS** entry. It runs `extraction.run_mechanism_styling` (`extraction.py:903–938`), which is `lift_styling_content` + `lift_per_element_state` — pure CSS lifting emitted as `ScalarLift`s indistinguishable from content lifts. This is styling work wearing a content handler's coat; it is cleanly relocatable.

### D9 — [REVERSE, INTRINSIC] Content structure decides CSS destinations
`assembly.py:263–291` iterates `section_root.children`, reads each child's BEM `__element` token, and routes that child's box-CSS to `{area}Padding*` etc. The DOM/BEM structure is the key into the CSS destination map. Same shape at `fold_helpers.py:247–256` (`route_area_css_to_block_attrs(child_node, area, …)`).

### D10 — [REVERSE, REMOVABLE] Identity deletes styling
`assembly.py:317–355` sets `inheritStyle` from the node's BEM `--modifier`; `assembly.py:368–393` then **deletes** `style.color.text` and `style.color.background` that the CSS pass lifted. A structural/identity fact overrides styling output. This is post-merge cleanup and would sit naturally at the end of a styling phase.

### D11 — [REMOVABLE] Merge precedence is order-sensitive
`assembly.py:139–145`: content lifts overwrite CSS attrs **except** those whose name starts with the DB `GRID` layer prefix, which use `setdefault` so the CSS pass wins. Any re-ordering must preserve this asymmetry explicitly; it is currently implicit in the call order at lines 124/127.

### D12 — [INTRINSIC TO THE CURRENT EMIT MODEL] There is no intermediate tree
`extraction.py:225–227` (`_child_content_for_node`) calls `build_block_markup` recursively and returns the child's **complete serialised WP markup string**; `assembly.py:444–448` concatenates those strings and `orchestrator.py:330–357` `json.dumps` the attrs into a block comment. By the time the parent finishes, every descendant is already a string with its attrs baked into JSON.

A second styling phase would therefore have to **re-parse WP block comments** to reach child attrs, and the draft DOM node each block came from is no longer associated with it. There is no IR to hang phase 2 off.

---

## 3. Things that are NOT blockers (positive feasibility facts)

- **Recognition is CSS-free.** `recognition.py:59` accepts a `css_rules` parameter and **never uses it** (verified: no reference in the body, lines 59–116). Block identity comes from BEM root class → atomic tag → BEM element slot, all DB lookups. Identity is safely a phase-1 concern.
- **`build_ctx` is CSS-free** (`recognition.py:137–167`) — it carries slug/kind/variant/node/is_root only.
- **The two passes exchange no data** (assembly.py:124 vs 127) — there is no `css_attrs → content` or `results → css` argument anywhere.
- **Mechanism B threads `css_rules` without consuming it** — every use in `run_mechanism_b` / `_route_generic_child` (extraction.py:668, 686, 740, 834, 864) is pass-through to `_child_content_for_node`.
- **Content routing (`_route_container_child`, `_emit_content_leaf`)** is DOM+DB only (extraction.py:288–357) apart from the threaded `css_rules`.

---

## 4. Would a two-phase design fix the known defect?

**The defect as recorded:** `.claude/reports/2026-08-02-pipeline-routing-review.md:256` — "161 of 255 layer resolutions missed, and 20+ fold-gaps printed to stdout. None reached the ledger"; lines 233–242 — the per-element `cross_node_gap_candidate` / `no_area_attr` events "are genuinely lost… zero matches" across all 44 artefact files.

**Verified independently, four code facts:**

1. `css_pass.py:213–214` — `result = process_element(ctx, decls); merged.update(result.attrs())`. `result.gaps` is never read. Confirmed by reading the whole function (lines 57–261): the identifier `gaps` does not appear.
2. `record_gap=` has **no caller-supplied value** anywhere. Grep across the converter returns `fold_helpers.py:713` (an internal pass-through of its own default) plus two docstrings and one test. So `_noop_record_gap` (`fold_helpers.py:95`) is what always runs.
3. `entry.py:265, 292, 358, 432` — `"attribute_gap_candidates": []` at all four exits.
4. `trace=` IS now wired at `assembly.py:237` and `assembly.py:282`, but only to `_fold_trace` (`assembly.py:40–63`), which calls `_LOG.warning`. That reaches stdout, not an artefact — consistent with "printed to stdout, none reached the ledger".

**Assessment: a two-phase split neither fixes nor causes this.** All four are single-line wiring omissions in the *destination* of gap objects, orthogonal to when the CSS pass runs. Reordering the phases would carry the same four omissions across unchanged.

**One directional risk, reasoned not measured (UNVERIFIED as a prediction):** the report's most-missed property list is topped by `display` (35), `align-items` (14), `justify-content` (12), `flex-direction` (7) — the arrangement family. Those are precisely the properties whose destination is resolved by the *band/fold* machinery (`fold_helpers.py:682–714` GAP-3 partition; `_fold_band_arrangement` lines 546–601), which requires the band DOM node, the owning slug, and the held declarations to be alive at the same instant. If a styling phase runs after the content phase has serialised the tree (D12), the dissolved band node is gone and that re-routing has nothing to operate on. So the split would most plausibly **worsen the largest miss bucket** unless phase 1 preserves an IR that retains dissolved nodes. I have not measured this — it follows from the code paths, not from a run.

**Second observation:** `--content-width` misses 10 times per the same report, while `l2_qualify._lands_on_parent` (`l2_qualify.py:198–199`) treats any `--*` custom property as *always landing*. Two components disagree about whether a custom property has a destination. Flagged, not diagnosed.

---

## 5. Answers

**(a) Can it be split cleanly?** **PARTIAL.** The mechanical separation already exists (assembly.py:124 vs 127, zero shared data). What cannot be separated is the *sequence*: the content phase cannot determine its own node set or variant without CSS.

**(b) Order-dependencies that block it** — D1 (fold gate), D2 (uniform grid-item fold), D5 (variant from merged attrs), D6 (layer_detect), D7 (GAP-3 partition), D9 (BEM structure keys per-area CSS), D12 (no IR — children are serialised strings). Softer: D3, D8, D10, D11.

**(c) Removable vs intrinsic**

| Removable (mechanical) | Intrinsic (semantic) |
|---|---|
| D4 `l2_qualify` — unwired, nothing to unpick yet | D1 — dissolution is definitionally a CSS decision |
| D8 styling handler in the content registry — relocatable | D2 — cross-item CSS comparison needs both at once |
| D10 preset colour strip — post-merge cleanup | D5 — `sgs/trust-bar` variant is 100% CSS-derived |
| D11 merge precedence — make explicit | D6/D7 — layer is read off CSS and gates other CSS |
| D3 `layout` trigger — no content branch reads it | D9 — BEM/DOM is the key into per-area CSS attrs |
| | D12 — no IR exists; blocks are strings by the time the parent returns |

**(d) The single hardest coupling:** **the fold/dissolve decision (D1, generalised by D4).** Whether a draft node appears in the output block tree at all is answered by CSS — the parent's `display` (`extraction.py:380` → `arrangement.py:42–58`) and, in the designed successor, whether every one of the child's declarations has a destination on the parent (`l2_qualify.py:301–314`). A content-first phase cannot lay out blocks it does not yet know exist, and a styling-second phase that adds or removes blocks is not a styling phase.

Runner-up: D12 — even if every semantic coupling were resolved, there is no intermediate representation to apply phase 2 to.
