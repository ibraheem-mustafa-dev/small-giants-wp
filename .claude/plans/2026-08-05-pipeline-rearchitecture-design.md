---
doc_type: design
project: small-giants-wp
created: 2026-08-05
status: DESIGN — Bean approved the shape (IR-centred rebuild) 2026-08-05; open decisions in §9
supersedes: Spec 31 §13 (walker/content-fork/routing) once built. Spec 31 itself is 212KB and
  ~55-60% build narrative; this design becomes a NEW spec (39) rather than another layer on it.
grounded_by:
  - .claude/reports/2026-08-05-stage-inventory-ground-truth.md
  - .claude/reports/2026-08-05-content-styling-split-feasibility.md
  - .claude/reports/2026-08-05-routing-key-coverage.md
  - .claude/reports/2026-08-05-token-snap-ground-truth.md
  - .claude/reports/2026-08-05-variant-conflation-ground-truth.md
---

# Cloning pipeline — re-architecture design

## 1. The problem, in one paragraph

The pipeline works (85% CSS parity, 99% content on the real draft) but nobody can say *how*.
Roughly half its stages produce artefacts nothing reads, three are incapable of firing at all, and
the stage names actively mislead (stage 0.7 writes `stage-7.json`; `stage_4_5_6_7_8_extract` runs
none of 5, 6 or 7). Because the shape cannot be read off the system, every audit round overturns
the previous round's numbers — five separate rounds of refutation are on record. Bean's stated
goal: **the stage map should genuinely describe every mechanism, branch and loop, legibly to
someone uninvolved.**

## 2. What the ground-truth council measured

Five parallel agents, 2026-08-05, all read-only, all evidence-gated. Verdicts on Bean's premises:

| Premise | Verdict |
|---|---|
| Stage 3 is decoration | **CONFIRMED** — changes no markup; its one gate (`autonomy_decision`'s unresolved-slots deploy block) can never fire because it is called without `coverage=` |
| Stage 4 is the pipeline body | **CONFIRMED** — the only markup producer |
| 0.7 + 4.5 belong to the walker | **HALF** — 4.5 is literally inside stage 4; 0.7 is a genuine, load-bearing pre-pass |
| Content/styling can be split | **PARTIAL** — blocked by (a) CSS deciding whether a node exists, (b) no intermediate representation |
| A button style-variant is treated as a block variant | **REFUTED** — `sgs/button` has no `variant_attr`; both detectors are no-ops on it |

Stage census: **~10 load-bearing, 11 decorative, 3 dead** of ~24.

**Provably dead** (not merely unused — incapable of firing):
- Stage 9d — reads `m["selector"]`, a key Stage 2's match dicts never contain → always `[]`
- +REGISTER — filters on status `deferred-composed-pattern`; nothing produces that status
- Stage 0 theme cache, the D1 bucket in 0.7, the theme-json reflection in 4.5

**Two gates that cannot fail:** `content-gaps.json` is written to the run dir while the F5 gate
reads `scripts/content-gaps.json` (permanently "absent → green"); Stage 11.6's parity score has no
consumer left now that +REGISTER is dead.

## 3. The load-bearing constraint that shapes everything

**CSS decides whether a node exists.** `extraction.py:380` → `arrangement.py:42-58`: the
dissolve gate asks whether the parent's CSS is `display:grid|flex`. Pass ⇒ the child never becomes
a block; fail ⇒ it becomes its own container. The successor rule states it outright — a node
dissolves iff every CSS property it declares has a destination on the parent.

Therefore **content-first-then-styling is not achievable as stated.** A content phase cannot lay
out blocks it does not yet know exist. The honest cut is three phases behind one shared structural
pass.

**The enabling gap: there is no intermediate representation.** `extraction.py:225-227` — children
are serialised into complete WP block-comment strings before their parent finishes. A later styling
phase would have to re-parse block JSON with the source DOM node no longer associated. The IR is
what makes content and styling separable at all.

## 4. Target architecture

```
PREPARE
  P1  Draft global styles  → theme-snapshot.json          (Spec 33, unchanged)
  P2  BEM lint             → halt if the draft is non-conformant
  P3  CSS index            → parse draft CSS into a selector lookup

CLONE  (loops, once per section)
  C1  Split the page into sections; identify each section's block
  C2  Build the node tree (IR) — recognition, dissolve, arrangement, variant
  C3  Route CONTENT  → per-node content attributes
  C4  Route STYLING  → per-node styling attributes
  C5  Another section? → C1   else → V1

VERIFY
  V1  Emit + deploy
  V2  Computed parity
```

Eight stages. Every one is a sentence a non-coder can follow. The loop and its exit condition are
explicit, which is the property the current map lacks.

## 5. The IR

A node tree held in memory for the lifetime of one section. Each node carries:

| Field | Source | Why |
|---|---|---|
| `block_slug` \| None | C2 recognition | identity; None = dissolved/pass-through |
| `dom_node` | the draft | keeps the source associated through C3 **and** C4 — the thing serialisation currently destroys |
| `declared_css` | P3 index | every declaration matching this node |
| `variant` | C2 | resolved ONCE (see §6) |
| `content_attrs` | C3 | filled by the content router |
| `styling_attrs` | C4 | filled by the styling router |
| `gaps[]` | C3 + C4 | one ledger, one writer |
| `children[]` | C2 | the tree |

Serialisation happens only at V1. Nothing upstream of V1 produces a string.

## 6. Decisions this design makes

**D-A — One variant decision, at C2.** Today two detectors answer "which variant is this?": a BEM
detector at recognition (`variant_detect.py:42`) and an attr-fingerprint detector at assembly
(`db_lookup.py:3234`) that **overwrites** it. Collapse to one, at C2, with the BEM modifier as the
primary categorical signal and the fingerprint as a tie-break — never a silent overwrite. A tie is
loud.

**D-B — Composite-key styling routing, with SQLite NULL semantics.** Route every declaration on
`(block_slug, css_property, css_layer, css_element, css_state, css_tier)`. **Measured: zero
collisions** among the 1,050 rows carrying a `css_property`, so the UNIQUE constraint costs nothing
today. Use native NULL semantics rather than the `NOT NULL` + `''` form proposed in the routing
review — the latter makes adoption hostage to finishing the whole seeding backlog first, for the
same invariant.

**D-C — One global-check chokepoint, before every write.** `token_snap()` is currently an identity
function (4 lines, returns its input on both branches, 4 no-op call sites) while Spec 31 §3.A step 6
names it as *the* token-snapping step. Measured cost: **188 of 1,704 values (11%) written raw while
an exact-matching snapshot global existed; zero snapped** — including font-family 38/38 and draft
`var()` colours 22/22. In the new design a value reaches a block attribute through exactly one
function, and that function consults the theme snapshot first.

**D-D — `inspector_control_type` is NOT a routing key.** It has zero readers in `converter/`.
Routing on it would be new wiring, not a population gap. Excluded from D-B.

**D-E — The button border bug is a requirement, not a patch.** `sgs/button.colourBorder` and
`colourBorderHover` carry `role='styling'` while `css_property='border-color'`, so the colour gate
(`attr_is_colour_role`, keyed on `role='color'`) declines them and the raw draft value is written
verbatim. Separately, the preset strip only pops the WP-native `style.color.*` channel, so
background and text get client tokens while `colourBorder` survives with the draft value. Measured
emit on the real run:

```
"Try 3 for £5"           inheritStyle: "secondary"  colourBorder: "var(--primary)"
"Read the full story →"  inheritStyle: "outline"    colourBorder: "var(--border)"
```

Both are draft custom properties that do not exist in the SGS theme, so the border paints
undefined — exactly the defect Bean reported by eye. **13 attrs across 6 blocks are in the same
state.** The design requirement: destination must be derivable from the CSS property itself, so a
hand-maintained `role` label disagreeing with its own property is **unrepresentable** rather than
merely caught.

**D-F — Every branch separates its options by an innate categorical DB fact.** No rowid, document
order, catalogue order or name construction. "No match" is an intended outcome (→ container
default), never a fallback. A tie is a loud failure. Nine sites currently violate this.

## 7. What gets deleted

Dead (delete outright): stage 9d, +REGISTER, stage 0 theme cache, the 0.7 D1 bucket, the 4.5
theme-json reflection, `l2_qualify` (zero callers).

Decorative (demote or delete — see §9 open decision): stage 0.5 token lint, stage 3 slot list,
stage 4j, 9c/9c2/9e, 11.6, the autonomy tail, 4k.

Naming collisions to fix: stage 0.7 writing `stage-7.json`; `stage_4_5_6_7_8_extract` running none
of 5/6/7; stage 9b writing `stage-91.json`; 4k scanning a different directory from where the
artefacts live.

⚠ **Stage 3 is decorative but NOT free to delete** — it still feeds the `extraction_failed`
leftover bucket, coverage numbers, the review HTML and a `staged_merge` schema check. Removing it
means re-homing those four consumers first.

## 8. Non-negotiables carried forward

- R-31-1 DB-first, no hardcoded dicts. R-31-2 BEM is the only recognition signal.
- R-31-9 universal mechanisms — no per-block carve-outs.
- FR-31-4 / FR-31-16 — container is the section default; only `blocks.tier='class-section'` may be
  a section root (shipped 2026-08-04 as R1).
- R-31-13 — Bean's eye is co-authoritative; a number never closes fidelity alone.
- No silent drops: every unrouted declaration lands in one gap ledger with one writer.

## 9. Open decisions for Bean

1. **Decorative stages — delete, or demote behind a `--report` flag?** Deleting is leaner and is
   what "no bloat" implies. Demoting keeps operator diagnostics available without them masquerading
   as pipeline stages. Recommendation: delete the dead, demote the genuinely useful diagnostics
   (11.6 parity, gap review) behind an explicit flag, delete the rest.
2. **Migration: big-bang or strangler?** Big-bang rewrites the converter against the IR in one
   branch. Strangler builds the IR alongside the current path, cuts over per stage, and keeps the
   conformance goldens green throughout. Recommendation: **strangler** — the goldens are the only
   regression net and a big-bang invalidates all of them at once.
3. **Does this become Spec 39, or amend Spec 31?** Spec 31 is 212KB and ~55-60% build narrative
   carrying live-sounding requirements against deleted code. Recommendation: **new Spec 39**, with
   Spec 31 §13 marked superseded on the day 39 lands.

## 10. Verification strategy

- The 6 conformance goldens are the regression net; they must stay green through every strangler
  step (they currently encode pre-R1 output and need re-seeding first — the deploy proof exists).
- Every step ends with a live `/sgs-clone` to the canary and a computed-parity comparison against
  the 2026-08-04 baseline (CSS 85% / 83-84-89 / content 99%, now with honest denominators).
- No step closes on a number alone (R-31-13).
- Each deletion ships with proof the deleted thing could not fire, not merely that nothing called
  it — the D474 lesson: prove a path is dead by REACHING it, never by observing it not fire.
