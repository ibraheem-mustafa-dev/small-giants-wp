---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline / content-UNIFY (D246)
stage: W3 — child-block / CSS-on-content / arrays
generated: 2026-06-28
status: DRAFT — awaiting Bean sign-off (Rule 7 design-gate)
supersedes_planning_for: next-session-prompt.md Task 3
decision_ref: D248 (to be assigned at first build commit)
---

# W3 Walker Port — Design

**One sentence:** Faithfully port the proven `_route_composite_interior` walker from
the frozen `convert.py` into the new modular engine's content-extraction layer, so
structured-content composites (hero split-image, child-block columns, folded wrappers)
convert to native blocks with their CSS intact — replacing the D245 flat recreation
that currently sits in `run_mechanism_b`.

This is the **child-block / CSS-on-content / arrays** half of the D246 content-UNIFY.
W1+W2 already did the scalar-text half (DONE + LANDED).

---

## 1. Goal & success criteria

- **Goal:** `run_mechanism_b` (currently the flat D245 recreation, extraction.py:121)
  becomes a faithful port of `_route_composite_interior` (convert.py:4124), routing every
  interior column of a `has_inner_blocks=1` composite by its three real branches, with
  the styling-lift wired in and `_bp_decls` consumed.
- **Success (the only signals that close W3):**
  1. **LANDED** (STOP-21 recipe) — the genuine new-engine output deployed to a fresh
     canary page, anonymous `getComputedStyle`/`innerText`, draft-vs-clone, oracle verdict.
     The hero split-image renders + the content column's CSS transfers (the D212/MF-1
     shape that the flat recreation drops).
  2. Per Bean's **full-breadth** choice: LANDED proven across the composites that appear
     in the draft homepage, not hero alone (see §7 proof plan).
  3. 318+ converter+ledger tests green from the canonical cwd (STOP-16); both gates green;
     convert.py byte-identical (D-MODULAR).
  4. Pre-commit `/qc-council` on the BUILT walker port (STOP-23) — findings fact-checked
     against ground truth, all resolved.

---

## 2. Architecture decision (the load-bearing call)

**The new engine has TWO layers; W3 lives in ONE of them.**

| Layer | What it is | W3's relationship |
|-------|-----------|-------------------|
| **Content-extraction glue** (`converter/services/extraction.py` + `converter/resolvers/*` + `converter/services/lift_helpers.py`) | Where W1/W2 landed. `run_mechanism_a/b`, `build_block_markup`, `extract_content`. | **W3 BUILDS HERE.** |
| **Declaration-routing spine** (`converter/orchestrator.py` + `converter/dispatch_table.py` + `REGISTRY`) | The *eventual* unified `(layer, property) → resolver` dispatch. Resolvers are stubs (`scalar_media.py`, `scalar_content.py` both `UNIMPLEMENTED_STUB`); orchestrator docstring: "the full draft walk is step-3 work". | **W3 does NOT wire into it.** That is roadmap item 2 ("separate follow-on wave"). |

**Why (STOP-25 / STOP-22 carve-out):** The rules require *re-housing the working logic*,
never *recreating it*. Building a new dispatch-routed walk from the stub resolvers would be
a recreation (STOP-25 FAIL) **and** would silently fold in roadmap item 2's scope. So W3 =
port the working walker faithfully into the extraction layer, reusing the helpers already
ported in W1 (`lift_helpers.scalar_media_from_img`, `rich_text_content`, etc.). convert.py is
the **read-to-port source only** (STOP-22 carve-out), never the comparison oracle.

**Universality (R-22-9):** the walker is DB-driven — there is no per-composite code. One
universal port makes all 20 `has_inner_blocks=1` composites route correctly. "Full breadth"
(Bean, 2026-06-28) = one universal port + LANDED proof across the draft's composites, NOT
per-block branches.

---

## 3. The three routing branches to port (B1 — port the FULL walker, nothing thinned)

`_route_composite_interior` (convert.py:4124-4308) routes each direct-child column of a
composite. All three branches port; dropping any repeats the D212/MF-1 evaporation:

1. **Scalar-media column** — `db.scalar_media_attr_for(slug, element)` returns a non-None
   attr → find `<img>` descendants, read the `--mobile`/`--desktop` BEM modifier to pick
   `{attr}` vs `{attr}Mobile`, lift each via `scalar_media_from_img` (already ported,
   lift_helpers.py:155) into the composite's attrs in-place, emit nothing to markup.
   *(The hero `split` `splitImage`/`splitImageMobile` case.)*
2. **Content-item block** — `db.resolve_slug_from_bem(csgs)` resolves to a registered block
   (e.g. `article.sgs-testimonial`) → emit it AS that block via the recursive child walk
   (NOT folded — folding would swallow it).
3. **Slug-None content-column FOLD + cross-node CSS** — wrapper resolves to no slug →
   `_fold_layout_into_attrs` + `_route_interior_css_to_parent_slot` lift the wrapper's
   layout/box/content CSS onto the composite's mirrored attrs (the hero `__content`
   0%-transfer fix), then recurse its grandchildren into bare InnerBlocks.

The recursion (`walk` callbacks) ports the **minimum leaf-emit path** needed: atomic-tag
swap (h1/p → core/heading/paragraph with typography lift) + BEM→slug resolve + CSS/typography
lift + `emit_block_markup`. We reuse new-engine helpers where they exist; we port the rest
faithfully from `walk()` rather than inventing new logic.

---

## 4. The styling-lift port (B2 — fix the `_bp_decls` drop)

Port `_lift_styling_attrs_by_selector` (convert.py:3903) + its 5 helpers
(`_collect_css_decls_for_element`, `_extract_token_or_hex`, `_split_value_unit`,
`_css_value_to_attr`, `_css_selector_has_class`) into a new-engine service.

**The inherited bug to FIX (not preserve):** the original discards `_bp_decls` (line 4025) —
responsive typography/colour silently dropped to base-only. The port MUST consume `_bp_decls`
into `{attr}Tablet`/`{attr}Mobile`.

**B2-detail (DB-driven, qc-council D247):** emit `{attr}{bp_suffix}` keyed off the existing
`_BP_SUFFIX_MAP` + `property_suffixes` table (the `_lift_typography_to_block_attrs` pattern,
convert.py:~1718) — NOT a new hardcoded map. The `_FONT_WEIGHT_KEYWORDS` 2-entry dict
(`bold→700`, `normal→400`) ports with an explicit `# R-22-1 named-constant exception` comment
(CSS-spec fact, like `SKIP_TOP_LEVEL_TAGS`).

**Wire it in:** the styling-lift is NOT called by Mechanism A today — the port must actually
invoke it in the dispatch so styling attrs land. Double-write tripwire preserved: each key
written only when absent from the already-merged attrs (atomic wins).

---

## 5. Arrays (B3 — port as-is + TODO, do NOT complete FR-22-2.5)

convert.py's array path uses per-block slug literals (`sgs/quote`/`sgs/icon-list`/
`sgs/option-picker` — R-22-1 violations) in `_atomic_attrs_for`; `array_item_slot_for`
exists but is never wired.

**Scope precision (qc-council D247):** the array slug literals live in `_atomic_attrs_for`
(convert.py:~3227), a SIBLING called from the G3 gate — **NOT inside** `_route_composite_interior`.
A faithful walker port carries **NO slug literals** and does **NOT** port or invoke
`_atomic_attrs_for`. Arrays/FR-22-2.5 are out of W3 walker-port scope (deferred). Where the
walker would meet an array case, mark `# TODO FR-22-2.5` so incompleteness is documented, not
silent. No NEW R-22-1 violation enters the new tree.

---

## 6. Two more must-fixes

- **B4 — ambiguous-attr fallback → loud ContentGap.** `build_block_markup`'s
  `emit_block_markup(cb.slug, {}, cb.content)` (extraction.py:311) when `primary_content_attr`
  is None dumps bare inner-HTML a typed render.php may ignore → latent silent drop. Emit a
  tracked `ContentGap` (loud, F5-visible) when ambiguous instead.
- **B5 — §3.B3 G1–G5 disposition table (Task-2 council deliverable).** Each gap labelled
  DONE-BY-PORT / CLOSE-IN-W3 / DEFER-TO-ROADMAP-ITEM-3-with-blocker. From reading the source:
  - **G1** (parent-scoped child-token predicate) — DONE-BY-PORT (`walk` lines 4460-4477,
    `child_block_for_parent_token`).
  - **G2** (recursion) — DONE-BY-PORT (`_route_composite_interior` recurses via `walk`).
  - **G3** (NULL `accepts_allowed_blocks`) — CLOSE-IN-W3 (verify the slot-keyed predicate
    `slot_has_equivalent_block` handles NULL; it is the new engine's existing Mechanism B gate).
  - **G4** (scalar-vs-child fork, FR-22-2.1/2.2) — DONE-BY-PORT (the branch-2 vs branch-3 split
    + the leaf-misresolution guard, `walk` lines 4479-4505).
  - **G5** (`slot_has_equivalent_block` integration) — DONE-BY-PORT (already the Mechanism B
    gate, extraction.py:143).
  *(Confirm each against the live code during build; this table is the hypothesis to verify.)*

---

## 7. Build order + module layout (B-order — delete the dead function LAST)

Safe sequence (deleting `content_attrs_with_selector` before the monkeypatch cleanup breaks
the suite — STOP-11/B-order):

1. **Port the styling 5-helpers** → `converter/services/styling_helpers.py`.
2. **Port `_lift_styling_attrs_by_selector`** → `converter/resolvers/styling_content.py`
   (+ consume `_bp_decls` per B2) + **wire into the dispatch**.
3. **Port the interior walk** (the 3 branches + minimum leaf-emit recursion) → replace the
   flat body of `run_mechanism_b` (extraction.py); port `_fold_layout_into_attrs` +
   `_route_interior_css_to_parent_slot` as services.
4. **Arrays** — port-as-is + `# TODO FR-22-2.5` (no `_atomic_attrs_for`, no slug literals).
5. **B4** — ambiguous fallback → loud ContentGap in `build_block_markup`.
6. **Remove the dead test monkeypatch** (A3 cleanup already done — confirm).
7. **THEN delete `content_attrs_with_selector`** — grep-confirm 0 readers first (STOP-11).

`payload.py` + `content_select.py` are clean pure helpers — carry as-is. Do NOT keep
`content_children` as the walker if it diverges from `_route_composite_interior` (the D246 trap).

---

## 8. Proof plan (Bean's full-breadth choice)

LANDED across the draft homepage's composites, not hero alone. Candidate set from the
20 `has_inner_blocks=1` blocks — proof targets = those present in the draft (confirm at build):
**hero** (split-image + content fold — the headline case), plus **cta-section**, **info-box**,
**card-grid/feature-grid**, **testimonial-slider** as they appear. Each earns its OWN
draft-vs-clone LANDED proof (A14 — never bank from a prior composite). Each needs its
`deprecated.js` where the save-shape changes.

---

## 9. Gates (every increment)

- Build from canonical cwd `plugins/sgs-blocks/scripts`, `--import-mode=importlib`; re-run the
  suite + gate `--check` MYSELF, prove the FAILURE path (STOP-16).
- Pre-commit `/qc-council` on the BUILT increment (STOP-23) — fact-check findings (STOP-15).
- `/subagent-driven-development` for per-file implementation; subagents implement assigned
  files only, RETURN data, never touch the shared tree (STOP-2).
- Path-scoped commits (`-m` before `--`, exclude `__pycache__`); verify HEAD after any rename
  (STOP-19). D-ceiling check before any new D (→ D247 now; W3 build = D248).
- convert.py stays byte-identical (D-MODULAR). New guards `raise`, never `assert` (STOP-27).
- Do NOT production-wire the new engine (STOP-28) — A1-full + A2 are roadmap item 2 preconditions.

---

## 10. What this design does NOT do (scope fence)

- Does NOT wire the declaration-routing spine (roadmap item 2).
- Does NOT complete FR-22-2.5 arrays (B3 — deferred, TODO-marked).
- Does NOT load the real media-map / build the content conservation-ledger (A1-full / A2 —
  roadmap item 2, folded into engine-wiring per Bean 2026-06-28).
- Does NOT touch convert.py (frozen port-source only).
