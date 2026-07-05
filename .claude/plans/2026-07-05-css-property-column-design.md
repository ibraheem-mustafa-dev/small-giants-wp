---
doc_type: design-gate
thread: cloning-pipeline / CSS-routing rework (point 5)
created: 2026-07-05
status: COUNCIL-REVIEWED → RE-SCOPED (awaiting Bean's pick between the re-scoped column vs tactical-first)
governing_spec: 31-UNIVERSAL-CLONING-PIPELINE.md §3.A / §4 / §13.4 (FR-31-5.2/5.3)
---

# ⛔ COUNCIL OUTCOME (5-persona adversarial pre-mortem, 2026-07-05) — the design below is SUPERSEDED by the re-scope

**Grades:** Cynic C · Spec-Lawyer C · Ship-PM C+ · Data-Integrity C · End-Goal C+. **Verdict: GO on the MECHANISM (declare, don't name-guess — sound + R-31-1-clean), NO-GO on the design AS WRITTEN (the mass bootstrap-seed).**

**Convergent findings (2+ voices):**
1. **Over-scoped; partial-fix framed as root** (Ship-PM + Cynic + End-Goal). The all-734 seed buys nothing (only ~50–80 attrs strand). The column fixes ONLY the naming-mismatch cause — 1 of the 4 causes behind the 50 should-lift rules; channel-blindness, shorthand, hover, the 42 genuine gaps and 36 chrome are ALL untouched. It does NOT empty D2 alone — it's 1 of ~5 workstreams.
2. **The "byte-identical" mass-seeder is broken** (Spec-Lawyer + Cynic + Data-Integrity, with evidence). The seeder's "longest-suffix" reverse-derivation is NOT the inverse of the live resolver (which is rowid-first-match / exact-candidate + loud-fail). Data-Integrity hand-traced 3 cases and ALL broke: `contentWidth` (38 rows) → mis-seeds `width` not `max-width` (the design's OWN headline example); `borderWidthTop` (25 rows) → mis-seeds to `top`/`bottom` (position); `box-shadow` → kind-overload (`Shadow` colour-kind vs `BoxShadow` string-kind both collapse); plus 479 Mobile/Tablet rows NULL out if tier isn't stripped first.
3. **Underspecified seams** (Spec-Lawyer + Cynic): two merged functions with contradictory contracts (loud-fail vs first-wins), NULL overloaded (OUTER vs unseeded), dropped ORDER BY, ≥5 consumers of the matcher not 3.

**THE RE-SCOPE (dissolves every finding — this is what to build if Bean picks the column path):**
- Add the two columns `css_property` + `css_layer` — the clean declarative home (not a growing Python dict).
- **Populate ONLY the ~50–80 attrs that actually strand today** — NOT all 734. No mass reverse-derivation seeder at all.
- Resolver reads **column-first; if NULL → fall back to today's exact suffix resolver UNCHANGED.**
- Consequences: the ~650 untouched attrs are **byte-identical by construction** (never enter the new path — the whole contentWidth/borderWidth/box-shadow/479-tier breakage vanishes because we never seed them); NULL cleanly means "not corrected → fallback" (overload gone); the loud-fail contract stays intact in the fallback; each correction = **one commit that empties a real D2 rule, visible from commit #1** (stall-trap gone).
- Corrections declared **per-block in `block.json supports.sgs` (cssProperty/cssLayer per attr)** → seeder materialises to the column → no central-dict bloat (answers the Cynic's ceiling concern; full D258 end-state).
- Remaining must-dos even for the re-scope: grep-confirm the ≥5 consumers (drift-validator, fingerprint-builder) aren't broken by column-first; a `check_css_property_reseed.py` diff test for the corrected subset; state the loud-fail contract per call site.

**Honest scope (End-Goal):** even re-scoped, this is 1 of ~5 workstreams to empty D2 — it fixes naming-mismatch only. The others: router channel-blindness (native supports) + shorthand expansion + hover routing (the H1 patches), genuine-gap attr seeding (42 rules), `sgsResponsiveOverrides` (the 9 F-ii rules — already approved), chrome exclusion-with-reason (36 rules), and the end-gate that deletes D2 at 100% parity. Do NOT sell the column as "the root that empties D2."

---

## ⬇ ORIGINAL DESIGN (v1 — superseded by the re-scope above; kept for the record)

# Declarative CSS-property routing — `block_attributes.css_property` + `css_layer`

## Plain English — what this is and why

Today, when the pipeline sees a draft CSS rule like `border-color: red`, it works out *which block setting owns it* by **guessing from the setting's name** — it checks whether any of the block's attribute names *ends with* a known suffix (`BorderColour`). That guess is fragile: a setting named `colourBorder` doesn't end with `BorderColour`, so the rule is stranded into the page-scoped D2 block (the thing you deleted that broke the page). About **50 of the 129 D2 rules strand for exactly this reason.**

The fix (your idea): stop guessing from the name. **Declare** the mapping — each styling setting says, in the database, "I am the `border-color` setting." Then the pipeline looks it up directly. This is the same principle the project already proved with `canonical_slot` (the D258 lesson: ownership comes from a declaration, never from parsing the name).

## The one refinement the research forced

A single "css_property" column is **not enough** — WordPress core's own style engine (verified from live source) never maps a property to a setting from the property alone, because one property routinely owns **two** settings: `max-width` belongs to *both* the outer box (`maxWidth`) and the inner content band (`contentWidth`); `border-color` has an all-sides form and a per-side form. So the mapping needs a second key = **which layer** the setting sits on. SGS already computes that layer structurally (`layer_detect`) — we just need each setting to *declare* which layer it belongs to.

**Result: two columns.**
```sql
ALTER TABLE block_attributes ADD COLUMN css_property TEXT;  -- 'max-width', 'padding-top', 'border-color'; NULL for non-CSS attrs
ALTER TABLE block_attributes ADD COLUMN css_layer    TEXT;  -- 'OUTER'|'CONTENT'|'GRID'|'GRID_AREA'; NULL = self/OUTER
```
- `css_property` — the canonical CSS longhand this setting accepts.
- `css_layer` — only the **73** layered (`content*`/`gridItem*`) attrs need it; the other 661 are NULL (self/outer).

## What changes vs what stays (precise — the 6-step CSS branch, §3.A)

| Step | Today | After |
|---|---|---|
| 1. layer detect (structural) | keep | **KEEP** — still structural, reads the node not the name |
| 2. property → attr **match** | name-guess: `property_suffixes` suffix + `endswith` | **REPLACE** → `SELECT attr_name WHERE block_slug=? AND css_property=? AND (css_layer=? OR css_layer IS NULL)` |
| 3. tier suffix (Mobile/Tablet) | keep | **KEEP** |
| 4. serialise (kind_override) | keep | **KEEP** — kind still from `property_suffixes` |
| 5. token-snap | keep | **KEEP** |
| 6. validate | keep | **KEEP** |

**`property_suffixes` does NOT retire.** It loses only the *match* job; it keeps being the global catalogue of: the **kind** (number_unitless / string — the serialise step), the **role**, and the **liftability gate** (is this property liftable at all → D3 gap). Clean seam: *global CSS semantics stay global; per-block ownership moves from guessed to declared.*

Three call sites change together (comprehensive-fix rule): `db_lookup.attr_for_layer_property`, `db_lookup.attr_for_property`, `css_router._css_prop_maps_to_typed_attr`.

## What this does NOT fix (honest — not a silver bullet)

1. **Shorthand expansion** — `padding: 6px 0` still splits into 4 longhands *before* the column matches each. Separate upstream step (one of the H1 router blindnesses — still needed).
2. **`:hover`/pseudo routing** — the column maps property→attr; it doesn't create hover attrs. Hover rules still need their own routing fix (the other H1 blindness).
3. **Missing attrs** — if a block has no setting for a property, the column can't invent one — still an honest D3 gap.

So the column is the **root fix for the naming-mismatch class** (~50 D2 rules); shorthand-expansion and hover-routing remain as their own small fixes to fully empty D2.

## Seeding — bootstrap then correct the tail (default-LOW effort)

Do **not** hand-audit 734 attrs. Two-step, via the proven channels:
1. **Bootstrap seeder** (`/sgs-update`, new `_populate_css_property` step mirroring `_populate_emit_shape`): for each styling attr, run today's resolver *in reverse* — longest matching suffix → its `property_suffixes.css_property`, strip the layer prefix → `css_layer`. This **freezes current behaviour** into the columns and auto-fills ~90%. ~30–45 min.
2. **Correct the tail** via the existing `ATTR_CLASSIFICATION_OVERRIDES` map (the same sanctioned channel already used for `role`/`tag-identity`/`emit_shape`): the ~50–80 genuine mismatches — `colourBorder`, `borderWidth*`-vs-`maxWidth` collisions (all end `Width`, mean different properties — the exact trap), the 73 layered attrs' `css_layer`. ~1–2 hrs.
3. **Long-term (optional):** promote the corrected composite-wrapper attrs to `block.json supports.sgs` declarations so `/sgs-update` reads a declaration not a heuristic — the full D258 end state. Only for the attrs that matter.

**Binding drift rule** (per `db-is-runtime-source-data-file-is-rebuild-insurance`): `css_property`/`css_layer` are DERIVED columns — wiped every reseed. Corrections go in the override map (+ eventually block.json), applied by the seeder every run — **never a bare SQLite UPDATE** (a no-op that vanishes on the next reseed).

## Staging (the key insight — parity-safe)

- **Phase 1 — the refactor, PARITY-NEUTRAL.** Bootstrap freezes current behaviour → the emit is **byte-identical** to today (provable via the conformance goldens). This lands the mechanism with zero parity risk on a working, tested resolver used by 3 call sites. Design-gated.
- **Phase 2 — the tail corrections, INCREMENTAL PARITY.** Each corrected mismatch (colourBorder etc.) lifts a rule out of D2 → a measurable parity gain, one safe step at a time. This is where D2 actually empties, alongside the shorthand + hover fixes.

So the column refactor itself moves no parity number (safe); the *corrections* it unlocks are where the D2 gain comes from — and they're incremental and individually verifiable.

## Multi-button reconciliation (shared container KEPT — Bean-decided)

Constraint: keep the shared container wrapper (gap + the other layout settings live there — removing it loses more than it fixes). The block currently duplicates the layout vocabulary: it has its own `direction*`/`wrap*` **and** the shared-wrapper `flexDirection`/`flexWrap`. Reconciliation (design sub-item, to confirm at build):
- Pick **one** owner per layout property — the shared-container layout attrs (since the container stays) — and remove the block's duplicate `direction*`/`flexWrap` OR make them alias the container attrs, so the editor shows one control, not two.
- Fix the render bug where the mobile tier doesn't apply when it differs from desktop (H6 traced multi-button's non-standard 768/769 bands — confirm on the live element).
- The column then maps the draft's `flex-direction`/`flex-wrap` straight onto the single surviving attr — no vocabulary-unification-across-the-roster needed (withdraws the earlier roster-wide `flexDirection*` proposal).

## Spec 31 amendments required

- **FR-31-5.3** — `attr_for_layer_property` wording: "layer-prefix + `property_suffixes` membership" → "declared `css_property` + `css_layer` columns". DEC-1/DEC-3 (D194) note updated.
- **FR-31-5.2** — the D1 match (`_css_prop_maps_to_typed_attr`) — same substitution.
- **§4 DB-column utilisation map** — add the two columns; narrow `property_suffixes` to "kind/role/liftability catalogue" (no longer the matcher).

## Cheat-safety (§7a)

R-31-1 clean: the map lives in DB columns seeded from git-tracked block.json / the override channel — no hardcoded routing dict in code. It *removes* a code-resident name-parsing heuristic (net reduction in guessing). Shared-mechanism change → Rule 7 / R-31-7 design-gate → this doc.

## Decisions only Bean can make

1. **Include `css_layer`? (Recommend YES.)** Without it, only half the guessing dies (property declared, layer still parsed). Cost tiny (one column, ~73 attrs). Saying no = the max-width/contentWidth disambiguation stays name-based — a half-measure.
2. **Seeding source-of-truth: hybrid (bootstrap + override now, block.json later) — recommended — vs full block.json-declaration up front (slower).**
3. **Timing: Phase 1 now vs after the current parity push. (Recommend: Phase 1 can go now BECAUSE it's parity-neutral and provable byte-identical; Phase 2 corrections interleave with the ongoing D2 work.)** It's an architecture cleanup, not a parity fix — the safety comes from the byte-identical bootstrap.

## Verification plan

- Phase 1: conformance goldens byte-identical (proves parity-neutral) + all 3 call sites re-pointed + F6 db-consistency green + 806 tests + 4 gates.
- Phase 2: per correction — emit-diff shows only the intended attr now lifting; LANDED on page 8; the D2-when-D1 gate (now repaired) confirms the rule left D2; parity delta measured.
