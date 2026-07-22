---
doc_type: plan
plan_id: spec31-completion-to-100
project: small-giants-wp
thread: cloning-pipeline (Track 1)
created: 2026-07-22
status: active
progress: "2026-07-22 — A1-A6 DONE, B1 DONE (5a7466cc), B3 DONE (f8a4388e, the Bean-caught transform/filter un-exclude + hover-lift), C1a DONE (51629e37, F3 LANDED runtime + batch runner). REMAINING = C1b/C2: deploy phase-f fixtures as canary pages (the gating dependency), wire check_landed(), drive the 14 baselined UNACCOUNTED to 0, live verify + Bean's eye."
governing_spec: specs/31-UNIVERSAL-CLONING-PIPELINE.md (§5 completion matrix + §12.6 remaining scope)
goal: Drive Spec 31 to provable 100% fulfilment so Track 1 can close it before moving to Spec 35.
---

# Spec 31 → 100% completion plan

## Bottom line (plain English)

**The cloning pipeline is much closer to done than the spec text implies.** A live-code
grounding pass (2026-07-22) found that most of §12.6's "what's left" list is already built —
the spec just lags the code. The genuinely-open work is small, mostly mechanical, and mostly
about *deciding per-property whether to seed a routing row or formally exclude it* — a decision
Bean has ruled: **if a block actually declares a consuming attribute, seed + wire it; only
exclude-with-reason where no block has the attribute at all.**

"Done" = Spec 31 §5's own bar: across the multi-shape fixture set, every draft declaration is
TRANSFERRED-and-LANDED, EXCLUDED-with-reason, or a tracked GAP — **zero UNACCOUNTED, zero
WRITTEN-not-LANDED, zero CHEAT** — proven by the ledger + the render-oracle at scale + a batched
live-homepage check (R-31-11/R-31-13). That last gate is the thing that lets us *say* Spec 31 is
100% and move to Spec 35.

## Success criteria (measurable)

1. Every open CSS property (transform/filter/transition/overflow-x-y/position/inset/z-index/
   item-flex/object-position) is either seeded+wired (block has the attr) or in
   `excluded_properties` with a reason (no block has it). **Zero property in a limbo "route
   exists, no decision recorded" state.**
2. Pseudo-element `::before/::after` declarations have a lift destination (sgsCustomCss residual)
   OR an `excluded_properties` reason — never a silent drop.
3. The multi-shape fixture LANDED batch runner exists and runs; the ledger reports **zero
   UNACCOUNTED + zero WRITTEN-not-LANDED** across the fixture set.
4. Batched live-homepage verification passes per section (computed-parity + Bean's eye).
5. Spec 31 front-matter + §12.6 updated to reflect true state (card CTA/ALT done; residuals closed).

## Scope boundary — NOT in this plan

- **Spec 35** (editor-sidebar / inspector-control completeness) — the NEXT Track-1 front, starts
  only after this closes.
- **packSizes / option-picker schema** — Bean-deferred by design to the option-picker design
  discussion; a design talk, not a Spec-31 engineering gap (parking P-GATE-A-CARD-RESIDUALS).
- Building animation/layout attrs a block does NOT already declare (Bean: exclude-with-reason
  instead) — and building attrs no draft exercises (avoids R-31-9 over-broad universality).

---

## Work units + dependency map

Legend: **T0** = script/DB-seed (cheapest), **T1** = Haiku mechanical, **T2** = Sonnet reasoning.
`‖` = parallelisable. Model tier is advisory (final pick via /delegate at dispatch).

### Wave 1 — investigate + independent mechanicals (all ‖, no shared state)

```
A1  PROPERTY-ATTR AUDIT                                    [T0/T1 · Haiku]  ON-CRITICAL-PATH
  PURPOSE: For each open property, does ANY block declare a consuming attr? → per-property
           SEED (attr exists) vs EXCLUDE-with-reason (absent) decision, with the exact
           (block, attr) evidence.
  PROPS:   transform, filter (general), transition, overflow-x/-y, position, inset/top/right/
           bottom/left, z-index, flex-grow/-shrink/-basis, object-position
  FILES:   read-only — /sgs-db queries over block_attributes + block.json grep
  OUTPUTS: the seed/exclude decision table → A2, A3, B2 consume it
  TEST:    standalone (produces a decision table; each row cites block+attr or "absent")

A4  CHECK-VARIANTS FAIL-LOUD                               [T0 · Haiku]     off-critical-path
  PURPOSE: fix P-CHECK-VARIANTS-ENUM-SILENT-CONTINUE — gate must not silently `continue` on a
           missing/malformed variant enum.
  FILES:   plugins/sgs-blocks/scripts/cheat-gate/check_variants.py
  TEST:    plant a broken-enum variant_attr block fixture → gate now FAILS (negative control)

A5  OBJECT-POSITION WIRING VERIFY                          [T1 · Sonnet]    off-critical-path
  PURPOSE: object-position has a DB row but is undocumented in outer_box.py — prove it wires or
           fix it.
  FILES:   converter/resolvers/outer_box.py + a converter test
  TEST:    unit — a draft object-position lands on the block's objectPosition attr (or honest gap)

A6  SPEC/DOC FRONT-MATTER REFRESH                          [T0 · Haiku]     off-critical-path
  PURPOSE: Spec 31 front-matter + §12.6 mark card CTA/ALT done, A2/residual built, card-residual
           parking → PARTIAL(packSizes only).
  FILES:   specs/31-UNIVERSAL-CLONING-PIPELINE.md (front-matter + §12.6), parking.md entry
  TEST:    standalone (doc accuracy vs the grounding findings)
```

### Wave 2 — seed / exclude (‖ each other; both BLOCK on A1)

```
A2  SEED PROPERTY-SUFFIXES (attr-present props)            [T1 · Haiku]     ON-CRITICAL-PATH
  PURPOSE: dated migration adds property_suffixes rows for every open prop A1 found a block attr
           for; full /sgs-update reseed reproduces it.
  FILES:   plugins/sgs-blocks/scripts/migrations/2026-07-22-*.py + /sgs-update
  INPUTS:  A1 decision table
  TEST:    unit — reseed is byte-reproducible; each seeded prop resolves to its attr in db_lookup

A3  EXCLUDE-WITH-REASON (attr-absent props)               [T1 · Haiku]     ON-CRITICAL-PATH
  PURPOSE: dated migration adds excluded_properties(css_property, reason, decided_by, date) rows
           for props A1 found NO block attr for (still D2-passthrough for fidelity).
  FILES:   migrations/2026-07-22-exclude-*.py
  INPUTS:  A1 decision table
  TEST:    unit — excluded props raise no UNACCOUNTED (excluded ≠ dropped) but still D2-passthrough
```

### Wave 3 — lift destinations (Sonnet)

```
B1  PSEUDO-ELEMENT LIFT DESTINATION                        [T2 · Sonnet]    ON-CRITICAL-PATH
  PURPOSE: ::before/::after declarations → route to the built sgsCustomCss residual channel
           (client-editable, STOP-52-compliant) OR excluded_properties. No silent drop.
  FILES:   converter/services/css_pass.py (+ the parse/selector path) + fixture rt-pseudo-before
  TEST:    unit — rt-pseudo-before.expected.md: the ::before decl appears in sgsCustomCss (or a
           logged gap), never silently dropped

B2  WIRE NEWLY-SEEDED PROPS TO LAND                        [T2 · Sonnet]    ON-CRITICAL-PATH
  PURPOSE: for each A2-seeded prop, confirm the resolver actually emits onto the block attr (not
           just routes) so it LANDS, not merely WRITTEN.
  FILES:   converter/resolvers/outer_box.py (+ others per A1) + tests
  INPUTS:  A2
  TEST:    unit — a fixture exercising each seeded prop LANDS its value on the attr
```

### Wave 4 — the closing gate (sequential; this is what proves 100%)

```
C1  MULTI-SHAPE FIXTURE LANDED BATCH RUNNER               [T2 · Sonnet]    ON-CRITICAL-PATH
  PURPOSE: F3 at scale — a batch runner over tests/fixtures/phase-f/* that runs the ledger +
           computed-parity per fixture and asserts zero UNACCOUNTED + zero WRITTEN-not-LANDED.
  FILES:   converter/oracle/ (new batch entry) + fixture expansion if the corpus is too thin
  INPUTS:  A2, A3, B1, B2 (all lifts in place before measuring completeness)
  TEST:    4-layer — happy (clean fixture → 0 UNACCOUNTED); edge (excluded prop → not counted);
           fail (planted drop → UNACCOUNTED>0 fails); integration (full corpus green)

C2  BATCHED LIVE-HOMEPAGE LANDED VERIFY                    [T2 · Playwright] ON-CRITICAL-PATH
  PURPOSE: the R-31-11/R-31-13 closing gate — computed-parity vs draft per section on the live
           canary + Bean's eye. Batchable (Bean deferred clone-verify; this is where it's repaid).
  FILES:   scripts/parity/computed-parity.js run over the deployed canary
  INPUTS:  C1
  TEST:    per-section computed-parity match + Bean sign-off (numbers alone don't close)
```

### Dependency graph

```
A1 ─┬─> A2 ─> B2 ─┐
    └─> A3 ────────┼─> C1 ─> C2   (GATE: Spec 31 = 100%)
B1 ───────────────┘
A4, A5, A6  (independent — land any time)
```

Critical path: **A1 → A2 → B2 → C1 → C2** (longest chain = minimum timeline).
Parallel: Wave 1 all at once (A1‖A4‖A5‖A6); Wave 2 A2‖A3; B1 runs alongside Wave 2/3.

---

## Milestone gates

```
GATE 1 — DECISIONS RECORDED (auto-gate)
AFTER: A1, A2, A3
PASS:  every open property is SEEDED (in property_suffixes + resolves in db_lookup) or EXCLUDED
       (in excluded_properties with a reason). No property in "route-exists-no-decision" limbo.
FAIL:  any open property with neither a suffix row nor an exclusion reason.
READINESS: 90 (deps clear, mechanical, calibrated by the grounding pass)

GATE 2 — ALL LIFTS IN PLACE (auto-gate)
AFTER: B1, B2, A5
PASS:  converter suite green; each seeded prop LANDS on its attr in a unit fixture; pseudo-element
       decl reaches sgsCustomCss or a logged gap; object-position wired-or-honest-gap.
FAIL:  any WRITTEN-not-LANDED prop, or a silent pseudo-element drop.
READINESS: 80 (B1 is the one genuinely novel bit)

GATE 3 — SPEC 31 = 100% (go/no-go — Bean co-authoritative, R-31-13)
AFTER: C1, C2
PASS:  ledger 0 UNACCOUNTED + 0 WRITTEN-not-LANDED across the fixture set; live computed-parity
       per section passes; Bean's eye signs off. THEN Spec 31 status → COMPLETE, Track 1 → Spec 35.
FAIL:  any UNACCOUNTED, any live section regressed, or Bean's eye rejects.
READINESS: 75 (the live batch is the one thing not yet exercised at scale)
```

## Effort (default-low per the estimates rule; ADHD tax in brackets)

| Unit | Raw | ×tax | Tier |
|------|-----|------|------|
| A1 | 15m | 30m | audit |
| A2 | 10m | 20m | mech |
| A3 | 5m  | 10m | mech |
| A4 | 5m  | 10m | mech |
| A5 | 10m | 20m | mech |
| A6 | 5m  | 10m | mech |
| B1 | 20m | 40m | reason |
| B2 | 15m | 30m | reason |
| C1 | 30m | 60m | reason |
| C2 | 20m | 40m | verify |

Raw ~2h15m; wall-clock with Wave-1/2 fan-out ≈ one focused session for A→B, a second for C.
**These are small numbers on purpose — the grounding pass shrank the real work dramatically.**

## Constraints / guardrails carried in

- **Shared `main` with co-active Track 2** — path-scope every commit, re-check `git branch` +
  `git log -1` in the SAME command; never `git add -A`. Plan files + converter files are Track-1-safe;
  parking/STOP/LEDGER/decisions are Track-2-contended (re-check before touching).
- **Converter changes**: /qc-council multi-rater before commit (blub.db 255); verify on the REAL
  draft + live code path, not synthetic unit-green.
- **DB-first**: never hardcode a count; migrations + /sgs-update reseed, never manual DB edits.
- **STOP-29**: every deferral maps to a named stage — packSizes → option-picker design (Spec 27/35),
  never "out of scope".
- **R-31-13**: Spec 31 cannot be marked 100% on numbers alone — C2 needs Bean's eye.

---

## ⚠ AUDIT CORRECTION (2026-07-22, Bean-caught) — A1's exclude list was partly WRONG

**What happened.** A1 decided seed-vs-exclude by searching attribute NAMES containing the CSS
property (`%transform%`, `%filter%`…). Bean challenged it: *"wouldn't hover effects on buttons
that increase scale be a transform prop?"* — and he was right. The consumers exist but are named
**semantically**, not after the property:

| Property | Real consumers (missed by the name search) |
|---|---|
| `transform` | `scaleHover` on button, card-grid, gallery, heading, icon, info-box, post-grid, quote, team-member, testimonial, text; `imageZoomHover` on card-grid, gallery, post-grid, team-member |
| `filter` | `grayscaleHover` on card-grid, gallery, info-box, team-member |
| `top` | `sgs/decorative-image.positionY` (carries `css_property='top'`) |
| `left` | `sgs/decorative-image.positionX` (carries `css_property='left'`) |

**Effect:** every draft hover scale / zoom / grayscale effect is currently DROPPED — a real,
visible fidelity loss on exactly the interactions clients notice.

**The lesson (generalises):** audit by the DECLARED SEMANTIC (`block_attributes.css_property`,
`role`) — never by the identifier's name. A control called `scaleHover` consumes `transform`; a
name-keyed search can never see that. Note even `css_property` alone is INSUFFICIENT here (it is
only partly seeded: card-grid.scaleHover has it, button.scaleHover is NULL) — the reliable audit
needs BOTH signals plus a semantic sweep. Sibling rules: `verify-wider-than-the-agent-did`,
`dedup-by-identity-not-name-challenge-uniqueness`.

**Still genuinely excluded** (zero consumers by either signal): `transition` (its
duration/easing/delay sub-props already cover it), `position`, `overflow-x/y`, `right`, `bottom`,
`inset`, `flex-grow/shrink/basis`.

**Data bug flagged (separate):** `sgs/nav-menu.underlineOffset` carries `css_property='position'`
— almost certainly a mis-seed (it is `text-underline-offset`). Not a real `position` consumer.

### NEW UNIT — B3: coupled un-exclude + hover-lift  [T2 · Sonnet] ON-CRITICAL-PATH
  PURPOSE: un-exclude transform/filter/top/left AND build the semantic lift that consumes them,
           in ONE change (un-excluding without the lift turns those decls UNACCOUNTED → gate fail).
  WORK:    seed the missing `css_property` on the NULL consumers (declarative channel + dated
           migration, FR-31-2.1a); idempotent DELETE migration for the 4 un-excluded props;
           semantic VALUE parse (`transform:scale(1.05)`→1.05, `filter:grayscale(1)`→attr type,
           top/left→positionY/positionX) routed via the Front-1 declarative resolver + the D309
           `:hover` state mechanism (§3.A step 4a) — no slug literal (R-31-1/R-31-9); honest gap
           on anything unparseable (§3.A step 8).
  FILES:   migrations/2026-07-22-*.py, converter resolver path, new phase-f fixtures + tests
  TEST:    fixtures proving a hover-scale/grayscale/top-left LANDS; coverage gate stays 0 NEW
           UNACCOUNTED; no_slug_literal clean; live-verify batched to C2 (hover is visible).

## Next action (≤5 min, zero deps)

**Dispatch A1** — the property-attr audit (read-only /sgs-db + block.json grep). It resolves the
seed-vs-exclude fork empirically and unblocks the whole critical path. Run it ‖ with A4/A5/A6.
