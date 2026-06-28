---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline / content-UNIFY (D246)
stage: W3 — interior walker port (Spec 31 §3.B3 implementation)
generated: 2026-06-28
status: DRAFT — awaiting /qc-council (Rule-7 gate) + Bean sign-off
supersedes_planning_for: 2026-06-28-w3-walker-port-design.md §3-§7 (steps 1-2 already shipped b74986b0; this is the corrected remaining scope)
decision_ref: D249 (W3 step 2b shipped 3a6675fb); walker port = D250 at first build commit
---

# W3 — G1–G5 closure map (implement Spec 31 §3.B3)

**This is NOT a fresh design.** Spec 31 §3.B3 + §2 Axis-3 (lines 100–107) already specify
the walker algorithm exactly. This doc maps each of the five named-open gaps (G1–G5 from
§2's v1 status note) to the DB column / accessor / `_route_composite_interior` reference
branch that closes it. The map IS the build spec; the algorithm is the spec's.

## The spec algorithm (Spec 31 §3.B3, verbatim intent)

> For a draft child element under an InnerBlocks parent (`has_inner_blocks=1`), resolve its
> child block by: **(1)** `blocks.parent_block` forced-parentage (overrides the global
> alias); **(2)** else `slots.(aliases, standalone_block)`; **(3)** validate against
> `block_composition.accepts_allowed_blocks`, else a flagged GAP — never silent. Emit a
> child InnerBlock + **recurse** into its own content. `slot_has_equivalent_block` is the
> CSS-fork ONLY — NEVER the child-emission predicate.

The current flat `run_mechanism_b` (extraction.py:122) violates this (G5) and omits G1/G2/G3.

## 0. THE UNIVERSAL PRINCIPLE — the real architecture (Spec 31 §3.B.0)

The five gaps are NOT five patches. They are symptoms of ONE thing: the interior walker
does not delegate every child to the universal machinery. The genuinely universal fix:

> **The interior walker recurses over EVERY child node and routes each one through the
> SAME `recognise()` + resolve-with-parent-context + content-and-CSS path, at every depth.**

`recognise()` (recognition.py:46) already classifies ANY node into four exhaustive kinds —
**named** (section/composite block) / **atomic** (bare tag → block, e.g. `<h1>`→`sgs/heading`) /
**scalar** (BEM element token → slot's block) / **unrecognised** (loud gap). It is a UNIVERSAL
node classifier but CONTEXT-FREE (no parent). The walker's job is to apply it to every node,
WITH parent context (forced-parentage), recursively. Then each G dissolves into a facet of
the one path:

- nested composite → `recognise() → named → recurse` (closes G2)
- bare `<p>`/`<h2>` inside a composite → `recognise() → atomic → core/SGS block` (closes the atomic-inside-composite drop)
- BEM element → `recognise() → scalar`, parent context applied FIRST so an accordion's `__item` resolves to `sgs/accordion-item` not the global `sgs/info-box` (closes G1)
- scalar-vs-child fork + allow-list check = steps in that one path (G4, G3)
- the misused `slot_has_equivalent_block` is simply not part of the emit decision (G5)

### Universal scenario matrix (the completeness check — every element shape × where it sits)

| A content node inside/at a composite is… | Universal destination | Mechanism | Built/wired? |
|---|---|---|---|
| section-level BEM root → composite | section block (+ variant) | `recognise()` named | ✅ built+working |
| BEM-element leaf (`sgs-card__title`) → content scalar | parent scalar attr (B1) + CSS (B2) | Mechanism A + styling | ✅ wired (leaf blocks) |
| BEM-element leaf → standalone block under InnerBlocks parent | child block (B3) | walker (G1→alias→G3 fork) | ⚠️ wrong gate (G5), no parent ctx (G1) |
| **nested composite** (card-grid in a section; accordion-item's own children) | its own block **+ recurse inside** | walker recursion | ❌ STOPPED + dropped (G2) |
| **bare atomic tag** (`<p>`/`<h2>`, no class) inside a composite | `core/paragraph` / `sgs/text` etc. | atomic-tag swap in walker | ❌ becomes a ContentGap |
| **built-in scalar element vs child block** (hero headline) | DB rule decides attr-vs-block | scalar-vs-child fork (G4) | ❌ no fork |
| **scalar-media column** (hero split image) | `splitImage*` attr, emit nothing | walker branch 1 | ❌ branch not ported |
| **array/repeater item** | array item + per-item CSS | Mechanism Array (B4) | ⚠️ content built (D248); per-item CSS NOT done |
| **unrecognised** BEM node (any depth) | loud visible gap | `recognise()` unrecognised | ⚠️ section-level yes; inside composite → generic gap |
| text node / comment / empty wrapper | carried as content / skipped / recursed | walk exceptions | ✅ content_children handles |

**Honest residual gaps even after the recurse-and-delegate rewire (track, do not silent-drop):**
(a) array per-item CSS (§3.B.0 point 3); (b) the built-in-element-vs-child-block DB rule for
Mixed composites (G4) must be explicit and DB-driven; (c) every shape MUST have a defined
destination — an unhandled shape is a loud gap, never a silent skip.

## State of the foundation (verified 2026-06-28 vs live DB + new-engine db_lookup)

| Need | State |
|------|-------|
| `blocks.parent_block` (G1 data) | ✅ 18 rows (accordion-item→accordion, tab→tabs, 16 form-*→form) |
| `block_composition.accepts_allowed_blocks` (G3 data) | ✅ populated for 9 parents; **NULL for hero/info-box/quote** → NULL case is real |
| `child_block_for_parent_token` (G1 accessor) | ✅ exists, **never called** in `converter/` |
| `standalone_block_for`, `content_role_for_slot`, `resolve_slug_from_bem`, `parse_sgs_bem`, `scalar_media_attr_for`, `slot_has_equivalent_block`, `is_class_section_block` | ✅ present in db_lookup |
| `accepts_allowed_blocks` accessor (G3) | ❌ ABSENT — must add a read-only accessor to db_lookup |
| `_route_composite_interior` / `_fold_layout_into_attrs` / `_route_interior_css_to_parent_slot` (reference) | ❌ not ported; `scalar_media_from_img` helper IS ported (lift_helpers.py:155) |

## ⛔ ADVERSARIAL-COUNCIL VERDICT (2026-06-29) — NO-GO AS WRITTEN

A 4-persona blind parallel council (carve-out hunter, spec-lawyer, ground-truth skeptic vs the real Mama's draft, frozen-engine parity auditor) reviewed §0 + the matrix. They CONVERGED. Headline: **the "recurse + delegate to `recognise()`" framing is too simple — `recognise()` is a context-free, root-class-FIRST SECTION classifier, not the universal interior-node router.** It reproduces ~3 of the frozen interior walker's ~16 branches. Two findings fact-checked + CONFIRMED before recording (STOP-15).

### Convergent must-fixes (≥2 personas, fact-checked)
- **CF-1 — wrong port source (CONFIRMED).** `_route_composite_interior` (4124) is RETIRED as a gate (convert.py:4748); the live interior walker is **`_process_container_children` (5895, Commit 4)**. Port THAT (+ `walk()`), not the superseded function.
- **CF-2 — `recognise()` can't route interior nodes.** Root-class-first + context-free → returns `scalar`/`unrecognised` for composite-interior children; it has NO "fold" kind. "Route every child through recognise()" silently fails for the fold, leaf-misresolution, text-leaf, and atomic-inside-composite cases.
- **CF-3 — G1 as designed is a NO-OP on the real draft (CONFIRMED).** `blocks.parent_block` is populated for only 18 rows (accordion-item, tab, 16 form-*) — NONE of the draft's composites (product-card, info-box, gift-section, testimonial). The global alias collides (`card`/`item`/`slide`/`review` → `sgs/info-box`). Fix = **parent-SCOPED slot resolution keyed on the containing composite slug (`rec.slug`)**, not the sparse `parent_block` column. (My G1 generalised from accordion — the one composite NOT in the draft.)
- **CF-4 — G2 recursion is a LIVE silent drop.** `content_children` (content_select.py:129) `continue`s on a nested composite → a grid-of-cards (feature-grid → info-boxes) drops ALL children today, no gap (Rule-4 breach). Frozen `_process_container_children` is direct-children-only → verbatim port won't recurse ≥3 levels (section→grid→card→body→leaf, all present in the draft).
- **CF-5 — slug-None SECTION → `sgs/container` branch missing (CONFIRMED).** 5 of 8 real draft sections aren't registered → `recognise()` returns UNRECOGNISED → whole section clones nothing. Per the existing project lesson, a slug-None section is a legit `sgs/container` target, not a loud-fail.
- **CF-6 — atomic tags inside a composite → ContentGap, not blocks.** A bare `<p>`/`<h2>` never reaches `recognise()`/`atomic_tag_map` in the content path.
- **CF-7 — leaf-misresolution: new engine DROPS where frozen DEMOTES-and-keeps** (trust-bar `__badge`→`sgs/label` swallows icon+text). Active regression vs frozen.
- **CF-8 — the matrix scored ✅ against the wrong dispatch arm.** All draft composites are `has_inner_blocks=1`, no `scalar-content-lift` → Case 2 → the broken `run_mechanism_b`.

### Frozen branches MISSING from the matrix entirely (parity auditor — the ~16-branch checklist)
button-grouping (`_group_loose_buttons`); grid-per-area CSS dissolve (the D207 fix, `_route_area_css_to_block_attrs`); sgs-classed text-leaf ladder (`_route_text_leaf`/`_node_is_text_leaf`/`_is_text_capable_block`); uniform grid-item CSS (`_lift_uniform_grid_item_css`); emit-path attr carries (is-style / arbitrary-modifier / inheritStyle / variantStyle / preset-bg-strip); IN-F direct-text child; non-sgs content-width wrapper fold; core-block reconciliation (core/* vs sgs/* allow-lists + `primary_content_attr(core/*)=None`).

### Single-voice-but-fatal
empty-array no loud gap; NavigableString at section root silently dropped; modifier-only/retired-block root class (`sgs-announcement-bar--send-to-ward`); multi-root same-rank ambiguity → UNRECOGNISED for real content.

### Grades: carve-out **D+** · spec-lawyer **C** · ground-truth **D** · parity **D** → **NO-GO as written**

### The corrected scope (what "universal" actually requires)
W3 is NOT "close 5 Gs via recurse+delegate." It is **a faithful, recursive port of the FULL frozen interior walker (`_process_container_children` + `walk()`) — all ~16 branches** — with parent-SCOPED resolution, a slug-None-section→`sgs/container` branch, loud-gaps-not-silent-drops, and leaf-demote-not-drop. The 5 Gs are 5 of those ~16 branches. This is the original walker-port design's intent, restored to honest scope.

## The closure map (SUPERSEDED by the council verdict above — retained for the G1-G5 mapping; the full branch checklist replaces it)

| Gap | Spec rule (§3.B3 / Axis-3) | Closed by | Reference branch in `convert.py` |
|-----|----------------------------|-----------|----------------------------------|
| **G1** token→child-slug predicate (forced-parentage) | parent_block overrides global alias | Call `db_lookup.child_block_for_parent_token(parent_block, bem.element)` FIRST; if hit, that slug wins. Predicate = `parse_sgs_bem(cls).element` match. | `walk()` 4460–4477 (`parent_scoped_child_token` branch) |
| **G2** recursion into child-of-child | "recurse into its own content" | The walker is a recursive function: each emitted child block recurses (`walk(child, …, parent_block=child_slug)`) so accordion-item's own `__title`/`__content` resolve. | `_route_composite_interior` → `walk()` (branch 2) |
| **G3** NULL `accepts_allowed_blocks` | validate else flagged GAP | Add `db_lookup.accepts_allowed_blocks(slug) -> list|None`. When NULL → **skip validation, do not fail** (parent declares no allow-list); when a list → resolved child MUST be in it, else `ContentGap` (loud, never silent). | (new — spec rule, no v1 branch) |
| **G4** scalar-vs-child fork (FR-22-2.1/2.2) | scalar-content-lift leaf → scalar attr; slot→standalone_block under InnerBlocks → child block | Per child element: scalar-media column (`scalar_media_attr_for` non-None → lift into `{attr}`/`{attr}Mobile`, emit nothing) vs child block vs slug-None fold. The 3 branches of `_route_composite_interior`. | `_route_composite_interior` 4218 / 4266 / 4275 |
| **G5** `slot_has_equivalent_block` misuse | CSS-fork ONLY, never emission predicate | **Keep the function** — it does its real job (styling-routing fork). Only remove its USE as the emission gate in `run_mechanism_b` (extraction.py:144). Emission is decided by the recurse-and-delegate path (recognise + G1→G3 fork), not this predicate. | n/a (stop misusing it; function unchanged) |

## The 3 branches to modularise (from `_route_composite_interior`, convert.py:4124)

1. **Scalar-media column** (hero `splitImage`/`splitImageMobile`): `scalar_media_attr_for(slug, element)` non-None → find `<img>` descendants, read `--mobile`/`--desktop` BEM modifier → `{attr}` vs `{attr}Mobile`, lift via `scalar_media_from_img` (ported) into the composite's attrs in-place, emit nothing.
2. **Content-item block**: child resolves to a registered block via G1→G2 → emit AS that block + recurse (NOT folded).
3. **Slug-None content-column FOLD + cross-node CSS** (hero `__content` 0%-transfer fix): wrapper resolves to no slug → port `_fold_layout_into_attrs` + `_route_interior_css_to_parent_slot` as services to lift the wrapper's layout/box/content CSS onto the composite's mirrored attrs, then recurse grandchildren into bare InnerBlocks.

## B4 (folds in here, design §6)

`build_block_markup._child_markup`: when `primary_content_attr(cb.slug)` is None (ambiguous),
the current code dumps bare inner-HTML a typed render.php may ignore → silent drop. Replace
with a tracked `ContentGap` (loud, F5-visible) routed through the results list (so conservation
+ the F5 gate see it), not a string-only fallback.

## Module layout

- `converter/services/styling_helpers.py` — ✅ shipped (b74986b0)
- `converter/resolvers/styling_content.py` — ✅ shipped + wired (3a6675fb)
- `converter/services/interior_walk.py` — NEW: the recursive interior walker (the 3 branches + leaf-emit recursion)
- `converter/services/fold_helpers.py` — NEW: ported `_fold_layout_into_attrs` + `_route_interior_css_to_parent_slot`
- `orchestrator/converter_v2/db_lookup.py` — ADD `accepts_allowed_blocks` accessor (read-only)
- `converter/services/extraction.py` — `run_mechanism_b` rewritten to call the interior walker; B4 fix in `build_block_markup`

## Build order (B-order — delete dead function LAST)

1. Add `accepts_allowed_blocks` accessor (G3) + test.
2. Port `_fold_layout_into_attrs` + `_route_interior_css_to_parent_slot` → `fold_helpers.py` (read-to-port; verify their deps) + tests.
3. Build `interior_walk.py` — the 3 branches + G1/G2/G4 + recursion; replace flat `run_mechanism_b` body.
4. Remove the G5 `slot_has_equivalent_block` emission gate.
5. B4 ambiguous fallback → loud `ContentGap`.
6. Delete dead `content_attrs_with_selector` (grep-confirm 0 readers) — LAST.

## Gates (every increment)

- Each converter edit emits `GROUND-TRUTH: spec=31 §3.B3 …` (the now-live evidence gate requires it).
- Full converter suite from canonical cwd `plugins/sgs-blocks/scripts`, `--import-mode=importlib`; prove the failure path (STOP-16).
- Pre-commit `/qc-council` on the BUILT walker (STOP-23); fact-check findings (STOP-15).
- convert.py byte-identical (D-MODULAR); new guards `raise` not `assert` (STOP-27).
- Do NOT production-wire the engine (STOP-28).

## LANDED proof (Bean's full-breadth choice, 2026-06-28)

Draft-vs-clone LANDED (STOP-21 recipe: genuine `emit_block_markup` → REST-create fresh canary →
anonymous `getComputedStyle`/`innerText` → oracle verdict) across ALL draft-homepage composites:
**hero** (split-image + content fold), **cta-section**, **info-box**, **card-grid/feature-grid**,
**testimonial-slider** — each earns its OWN proof (A14, never bank from a prior composite); each
needs its `deprecated.js` where the save-shape changes.

## Scope fence (what this does NOT do)

- Does NOT wire the declaration-routing spine (roadmap item 2).
- Does NOT complete FR-22-2.5 arrays beyond what's already shipped (D248 array path).
- Does NOT load the real media-map / build the content conservation-ledger (A1-full / A2 — roadmap item 2).
- Does NOT touch convert.py (frozen port-source only).
