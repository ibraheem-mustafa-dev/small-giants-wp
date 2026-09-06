---
doc_type: design
project: small-giants-wp
created: 2026-08-05
revised: 2026-08-06 (v2 — six-persona review; v1 carried 6 factual errors, all listed in §0)
status: DESIGN v2 — shape approved by Bean (IR-centred, big-bang build, delete-don't-demote).
  Red-team verdict on v1 was NO-GO; v2 answers every objection. Open decisions in §12.
supersedes: Spec 31 §13 once built. Spec 31 is 212KB and ~55-60% build narrative; this becomes
  a NEW spec (39). Mark Spec 31 §13 superseded on APPROVAL of 39, not on landing.
grounded_by:
  - .claude/reports/2026-08-05-stage-inventory-ground-truth.md
  - .claude/reports/2026-08-05-content-styling-split-feasibility.md
  - .claude/reports/2026-08-05-routing-key-coverage.md
  - .claude/reports/2026-08-05-token-snap-ground-truth.md
  - .claude/reports/2026-08-05-variant-conflation-ground-truth.md
  - six-persona review 2026-08-06 (migration / IR / WordPress / red-team / maintainer)
---

# Cloning pipeline — re-architecture design (v2)

## 0. Errata — what v1 got wrong

v1 was reviewed by five personas and a red-team. **Six load-bearing claims were false.** They are
listed here rather than silently corrected, because v1 is already committed and a reader may have it.

| # | v1 claimed | Truth |
|---|---|---|
| E1 | "the **6** conformance goldens are the only regression net" | **39 goldens** on disk; the runner globs and byte-compares all of them. v1 confused *6 failing* with *6 total* — and used that number as the reason to recommend strangler. |
| E2 | composite key "costs nothing — **zero collisions**" | Measured on the UNSPLIT string. **34 rows store comma-separated `css_property` lists**; exploded → **6 collisions**, 4 genuinely ambiguous. |
| E3 | "use SQLite native NULL semantics" for the UNIQUE key | **Backwards.** SQLite treats NULLs as DISTINCT for UNIQUE; 4 of 6 key columns are mostly NULL, so the constraint **cannot fire**. v1 recommended a gate that cannot fail inside a document about deleting gates that cannot fail. |
| E4 | D-E: a role disagreeing with its CSS property is "unrepresentable" | `sgs/nav-drawer.surfaceOpacity` — `role='visual'`, `attr_type='number'`, `css_property='background-color'`. The disagreement is **correct**. v1's rule would push a number through the colour resolver. |
| E5 | Stage 0 theme cache is "**provably dead**" | The inventory says DECORATIVE, removable only *conditionally*. Its evidence is "nothing reads it" — which v1 §10 itself forbids as proof of death. |
| E6 | "~**10** load-bearing" stages | The inventory's own table has **12**. |

**E7 — the flagship exhibit went stale within 48h.** v1 cited `sgs/button.colourBorder` carrying
`role='styling'`. That was true when measured 2026-08-05. **The live DB now returns `role='color'`**
for both `colourBorder` and `colourBorderHover` — healed by `8bb106e1` (2026-08-04, "110 colour
attrs stop losing their role") and further reseeded by `1b957fde` (2026-08-06). A co-active track
is actively working this data. **The requirement stands on its own merits; the exhibit must be
re-measured on a fresh run before it enters Spec 39.** Whether the button still emits a raw
`var(--primary)` is currently UNKNOWN.

Meta-lesson, and the reason §11 exists: **this document was wrong within a day, in a repo whose
stated problem is documents being wrong.** Every figure in v2 carries its source. Nothing is
restated from memory.

## 1. The problem

The pipeline works (CSS 85% / content 99% on the real draft, `computed-parity.json`) but nobody can
say *how*. Half its stages produce artefacts nothing reads, three cannot fire at all, and the names
mislead — stage 0.7 writes `stage-7.json`; `stage_4_5_6_7_8_extract` runs none of 5, 6 or 7. Because
the shape cannot be read off the system, five separate audit rounds have overturned each other.

**Goal: the stage map genuinely describes every mechanism, branch and loop, legibly to someone
uninvolved.**

## 2. Measured position

Stage census: **12 load-bearing, 11 decorative, 3 dead** of ~24.

⚠ **"DECORATIVE" is the inventory's own term of art meaning "no code branch depends on it" — NOT
"worthless".** The inventory names Stage 11.6 explicitly as *"the documented fidelity signal, and
Bean reads it"*. v1 imported the label and dropped the caveat. Do not read DECORATIVE as a warrant
to delete.

**Provably dead** (evidence = incapable of firing, not merely uncalled):
- Stage 9d — reads `m["selector"]`, a key Stage 2's match dicts never contain → always `[]`
- +REGISTER — filters on status `deferred-composed-pattern`; nothing produces it
- The 0.7 D1 bucket; the 4.5 theme-json reflection

**Gates that cannot fail** (four, all verified):
- F5 reads `scripts/content-gaps.json`; the writer writes to the run dir → permanently green
- `no_new_tokens`'s halt branch is unreachable from any CLI flag
- The autonomy unresolved-slots gate — `autonomy_decision()` is called without `coverage=`
- `chrome-skipped.log` requires `branch == "chrome_skip"`; **nothing anywhere emits `branch`**

**A live false negative in the trace** (introduced 2026-08-04 alongside the R4 fix): `trace.py:182`
writes `"_error": "serialisation_failed"` — the writer's only self-report of data loss — but
`_classify` tests `k.startswith("error")`, and `"_error"` does not. **A trace row that lost its
entire payload is filed as `info`.** Verified.

## 3. The constraint that shapes everything

**CSS decides whether a node exists.** The dissolve gate reads the parent's `display`. So
content-first-then-styling is not achievable as stated: a content phase cannot lay out blocks it
does not know exist.

**And there is no intermediate representation** — children are serialised to WP block-comment
strings before their parent finishes, so a later pass would re-parse JSON with the source DOM node
detached. The IR is the enabling piece.

⚠ v1 evidenced this constraint partly by citing `l2_qualify`'s successor rule while §7 deleted
`l2_qualify` as dead code. v2 cites the **live** gate (`extraction.py:380` → `arrangement.py:42-58`)
only.

## 4. Target architecture

```
PREPARE
  P1  theme snapshot + resolved-token index      (see D-C: ask WordPress, don't derive)
  P2  BEM lint                                    → halt if non-conformant
  P3  CSS index                                   → selector → declarations, with match counts

CLONE  (loops, once per section)
  C1  split page into sections; identify each section's block
  C2a BUILD    one IR node per BEM-classed draft node. No CSS. Total.
  C2b ANNOTATE attach declarations; compute the arrangement predicate. No decisions.
  C2c REWRITE  dissolve/fold as named rules, each emitting a Rewrite record
  C3  route CONTENT
  C4  route STYLING
  C4b resolve VARIANT + PRESET  (see D-A — cannot be done before attrs exist)
  C5  another section? → C1   else → V1

VERIFY
  V1  emit + deploy
  V2  computed parity

ALWAYS-ON (not stages — cross-cutting, must survive)
  G1  R-31-15 anti-mirror gate + the 8 cheat-gate checks   ← Rule 1 enforcement
  G2  autonomy chain (block scaffolding + DB rows)          ← the self-extension mechanism
  G3  media sideload (WP media library side effect)
```

**G1–G3 are v2 additions.** v1's 8-stage map omitted all three, and a grep of v1 for
`R-31-15|cheat-gate|scaffold|sideload|9b` returned **one** hit. They would have been **purged by
omission** — and G1 is the structural enforcement of Rule 1 (CONVERT, don't mirror), Bean's first
non-negotiable. A clean-sheet spec that forgets the cheat gate re-legalises div-by-div mirroring.

**Dissolve removes a node from the EMIT tree, not from the IR.** Keep the node, its declarations and
an `absorbed_by` pointer. Two traversals over one tree: `emit_order` skips dissolved nodes;
`css_order` includes them. This is what defuses the predicted regression — the largest CSS-miss
bucket is the arrangement family, whose destination needs the band node, owning slug and held
declarations alive simultaneously.

## 5. The IR

**The unit of information is the `Write`, not an attrs dict.** A typed Write already exists
(`models.py:34-65`: `attr`, `value`, `property`, `tier`; `Decl` carries `state`) and the pipeline
throws it away — `ElementResult.attrs()` flattens to `{attr: value}`, destroying which declaration
produced it, at which tier, through which resolver. **D-C is unbuildable on a dict and trivial on a
Write list.** Two dicts also silently reimport the merge-order problem this design says it removes.

Node fields: `node_id` (stable, `b2/hero/0/1/2` — section + child-index path), `dom_node`,
`block_slug|None`, `declared_css` (tiered: base + per-tier + per-state + residual bands, not flat),
`is_root`, `base_layer`, `area_name`, `container_kind`, `delegates_content`, `destination`,
`variant`, `writes[]` (append-only, provenance-bearing), `retractions[]`, `partitioned_out[]`,
`gaps[]` (typed `GAP`, never stringified), `absorbed_by`, `children[]`.

**Assertable invariants** (a selection; full list in Spec 39):
- **I2 PARTITION** — `{IR nodes} ⊎ {dissolved} == {BEM-classed draft nodes}`. Rule 4 as an equality, not a percentage.
- **I5 C2 READS CSS, NEVER ROUTES IT** — `all(node.writes == [] after C2)`. This is what stops "structural pass" quietly becoming "routing pass".
- **I9 STRUCTURE FROZEN** — `tree_shape_hash(after C3) == tree_shape_hash(after C2)`. **This is what makes the phase split a property rather than a name.**
- **I11 STREAM PURITY** — all C4 writes are STYLING. Kills the current defect where `walk.py:561-563` registers a pure CSS lift as a CONTENT handler.
- **I16 NO STRINGS BEFORE V1** — no IR field contains `'<!-- wp:'`.
- **I17 EMIT IS PURE** — `emit(ir)` twice is byte-identical.

**Persist it.** `<run_dir>/C2-tree.json` per section, one `json.dump` at the end of C4. Without it
C3 and C4 are unfalsifiable from artefacts and the only post-hoc evidence is the string again.
Highest-value artefact available; costs nothing.

## 6. Decisions

**D-A — ONE variant/preset decision, at C4b, NOT C2.** v1 put it at C2. **At C2 zero attributes are
populated**, so the fingerprint tie-break can never fire — D-A would be inert by construction.
`sgs/trust-bar`'s variant is 100% CSS-derived; `sgs/hero`'s is content-derived. Both are undecidable
before C3/C4. Prerequisite: **seed the 9 missing `variant_slots` rows first**, or BEM-primary makes
`sgs-trust-bar--text-only` clone as `icon-circle` permanently. Enforce as a **write-count of exactly
1** (I4) — the value can't be asserted, the count can.

**D-B — composite-key routing on a NORMALISED child table with sentinels.**
`attribute_css_properties(attr_id, css_property, fan_out_rank)` — because `css_property` is
multi-valued today (34 comma-list rows). Index on sentinels or `COALESCE(col,'')` generated columns,
**not** raw NULLs (E3). Two of the 6 exploded collisions are the sanctioned one-declaration-many-
attrs case (`grid-template-columns → gridTemplateColumns + columns`) and get an explicit
`fan_out_rank`; the other 4 are loud ties.

**D-C — a RESOLVABILITY GATE, not a token snapper.** v1's target ("188 raw values, 11%, snap them")
is the wrong invariant and **chasing it regresses fidelity**. The invariant that matters:

> **No value reaches a block attribute unless the target site can resolve it.**

Two jobs behind one door, with opposite risk profiles: **(a) resolve + normalise + validate** —
universal, mandatory, fail loud; **(b) tokenise** — per-family, optional, sometimes wrong.
Conflating them is why `token_snap()` sat as an identity function: nobody could say what it should do.

Per-family, measured against `sites/mamas-munches/theme-snapshot.json`:
- **colour** — exact match on normalised sRGB. **No perceptual ΔE** (the snapshot is extracted *from
  the draft*, so a near-miss means two genuinely different shades). Alpha derivatives stay literal
  but **must normalise to 8-digit hex** — `safecss_filter_attr` strips functional notation.
- **font-size — DO NOT SNAP by default.** `settings.typography.fluid` is set and **5 of 7 font sizes
  carry fluid clamps** — `large` resolves to `clamp(17px…20px)`, not `20px`. Snapping a static 20px
  changes the painted size at every viewport under 1200px. Only the two `fluid:false` entries
  (`x-small` 12px, `medium` 18px) are safe.
- **spacing** — snap ON (no `fluid` key in the schema). ⚠ the rem→px conversion needs the **draft's**
  root font-size; the 94/334 figure assumes 16px and is UNVERIFIED. Verify in P1.
- **font-family** — snap ON, highest ROI (38/38 available, 0 snapped). Match on the normalised stack.
- **shadow** — compare structurally (offset/blur/spread/colour tuple), not by string.

**Value→slug is a RELATION, not a function** — `#3a2e26` maps to both `text` and `footer-bg`;
`#7a6500` to both `accent-dark` and `accent-text`. Today resolved by silent `setdefault` first-wins.
Under D-F that is a tie and must be **loud**.

**Ask WordPress for the index, don't derive it.** One `wp eval` returning
`WP_Theme_JSON_Resolver::get_merged_data()`, cached as a P1 artefact. Then fluid clamps,
`settings.custom` flattening and slug→value are WordPress's answer, not the pipeline's guess.

**D-D — `inspector_control_type` is NOT a routing key** (zero readers in `converter/`).

**D-E — destination derives from the CSS property, not from `role`.** `role` holds 33 distinct
values across 3,201 rows and is answering four different questions at once (value domain / content-
vs-styling stream / control shape / identity). A gate keying on `role='color'` asks the value-domain
question of a column that may be answering the stream question.

⚠ **Corrected from v1 (E4):** the rule is NOT "a role disagreeing with its property is
unrepresentable" — `surfaceOpacity` is a correct disagreement. The rule is: **`role` is never
consulted for a CSS destination.** `ValueDomain` is a TOTAL function of the CSS property, derived
and never stored, so there is no second place to write it and nothing that can disagree. `role`
keeps only its legitimate job — the content-vs-styling fork between C3 and C4.

The one-predicate change: `attr_is_colour_role` must ask `css_property ∈ COLOUR_PROPERTIES`, not
`role = 'color'`. Note the inverse defect it also fixes: **21 rows carry `role='color'` where the
property is not a colour** (17 are `box-shadow`), currently shielded by a **documented rowid
tie-break** in `attr_for_layer_property` — a live D-F violation at a named line.

Make it structural, not conventional: colour Writes take a `SnappedColour` newtype whose only
constructor is the snapper. Then "write a raw draft `var()` to a colour attr" **has no expression**.

**D-F — every branch separates its options by an innate categorical DB fact.** No rowid, document
order, catalogue order or name construction. "No match" is an intended outcome; a tie is loud.

**D-G — presets are a closed governance contract, resolved at C4b.** `preset_implications` exists
(23 rows, live, read at `css_pass.py:253`) but has **zero rows for `sgs/button`**. Populate it; have
C4 **never route a governed property in the first place**; then delete the post-hoc preset strip
(which is keyed on WordPress's channel names and is therefore *structurally incapable* of covering
border, since the button declares no `__experimentalBorder.color`).

## 7. Module layout + naming law

**Reject function-per-file.** `converter/` is 62 files / 21,169 lines / **1,057 functions** —
function-per-file means 1,057 files. Two of this project's own captured lessons predict the failure
(`a-gate-that-globs-a-directory-is-blind-outside-it`, `a-gate-can-be-blind-to-the-file-it-protects`):
the AST collision gate and all 8 cheat-gate checks are path-scoped and would go silently blind.
`services/` already has 34 files and produced `token_snap.py` — a 21-line file that lies about its job.

**The law: one file per name the trace can print. If the trace cannot print a name for it, it does
not get a file.**

```
pipeline/
  run.py            THE entrypoint — 8 stage calls + the C5 loop, nothing else
  stages.py         closed {stage_id -> StageDef(name, module, artefact)} registry
  trace.py          TraceEvent dataclass + closed enums + writer
  ledger.py         record_gap() — the ONE gap writer
  ir.py             Node, node_id minting, tree ops
  values/resolve.py THE single value chokepoint (D-C), one public function
  prepare/  p1_theme_snapshot.py  p2_bem_lint.py  p3_css_index.py
  clone/    c1_sections.py  c2_tree.py  c2_recognise.py  c2_dissolve.py
            c3_content.py  c3_routers/<role>.py
            c4_styling.py  c4_routers/<resolver_id>.py   ← EXHAUSTIVE over the table
            c4b_variant_preset.py
  verify/   v1_emit.py  v2_parity.py
```

`c3_routers/` and `c4_routers/` are **exhaustive** over their dispatch tables — every id gets a file
including `excluded.py` and `unrouted.py`, with a CI test walking the table both ways. C5 gets a
stage id but **no file** (it is a `for` loop in `run.py`) — making it a module is function-per-file
in miniature.

**Also split `db_lookup.py` — 5,748 lines, one file — one module per table.** Every "what did the DB
say?" question lands there. This is worth more than the stage renumbering.

**Naming rules** (the current bug is one line: `stage_name` is taken as an argument then discarded,
and a *correct* implementation already exists unused in `staged_output.py:144`):
1. **Stage ids are opaque strings from a closed registry, never integers** — `P1 P2 P3 C1 C2 C3 C4 C5 V1 V2`. A string cannot be fractionally subdivided; 0.7 / 4.5 / 9b / 9c2 all exist because a number invites it.
2. **Artefact filenames are derived, never passed** — one `artefact_path(stage_id)`, asserting membership. Kills both live collisions.
3. **Module path, function name and artefact stem must agree**, checked by a test. A function running five stages then cannot be registered without lying.
4. **A sub-step is a trace event, not a stage.**
5. **Ban version-suffixed / engine-referencing names** — the 2026-08-04 trace still emits `stage_4_converter_v2`, naming a tree deleted at D276.

## 8. Trace + gap ledger

**Delete `_classify`; do not improve it.** A classifier inferring a declared property generates both
false positives (`error_count=0` filed a clean run as an error) and false negatives (`"_error"` payload
loss filed as info — live). **Severity is declared, never inferred.**

`TraceEvent` (typed, not `**kwargs`): `run_id, stage_id, step, seq` (monotonic — `ts` alone ties at
4ms across 5 subprocesses), `severity` (enum), `kind` (enum), `section_id`, **`node_id`**, `subject`,
`inputs`, `considered[]`, `outcome`, **`because`** (one sentence naming the deciding DB row or rule).

`node_id` and `because`+`considered` are what buy reconstruction. Today the converter traces *lookup
outcomes*, not decisions — and for the button, **the one event that exists reads as a success**
(`attr_for_layer_property_column … attr_name: colourBorder`); the entire failure is downstream of
the only thing traced. Debugging it took **seven hops and a decoy**. Target: **two hops, and the
trace names the deciding fact.**

**ONE gap ledger, one writer.** Today there are **six sinks with three join keys**, and the main one
is dead — `entry.py:432-433` hard-codes `"attribute_gap_candidates": []` as *"Dead channels (no
new-engine producer)"*, so the harvester can never write a row. Two different tables share the name
`attribute_gap_candidates` in two DBs. `recognition_log` is queried on columns it does not have,
behind a `table_exists` guard that makes it a permanent silent no-op. Fold gaps go to
`_LOG.warning` and reach no artefact at all.

Replace with `<run_dir>/run.db`, table `gaps`, **one row per `(node_id, subject, tier, state)`** —
identical granularity to a Write, the only granularity at which "did this transfer?" is yes/no.
`record_gap()` is the only thing that can construct a `GAP`, and `GAP` **requires** `node_id` +
`section_id`, so a gap without provenance is a `TypeError`. Every existing sink becomes a reader.
A gap is a **run** fact, not a framework fact — putting run facts in `sgs-framework.db` is what
forced the UNIQUE dedupe that destroyed the run dimension.

## 9. What gets deleted — and the two controls that make it safe

**You never delete against the spec. You delete against a CONSUMER CENSUS.** The spec decides what
gets *rebuilt*. A clean-sheet spec is a statement of intent and has no standing to certify absence —
it would never mention "the `extraction_failed` leftover bucket" because the new design has no
leftover buckets. Silent, not exculpatory.

**Control 1 — freeze an immutable baseline BEFORE deleting one line** (~15 min; both the migration
engineer and the red-team arrived at this independently). A canary run's `extract.json`, per-section
`block_markup`, `computed-parity.json`, and a byte copy of all **39** goldens as they are. Then:
every step reports a per-section parity delta against it; any section dropping >2 points carries a
written reason or is reverted. **This is what makes "accept regression" a decision rather than a
coin toss** — regression you can see is a choice; regression you can't see is damage.

**Control 2 — a reconciliation table before any deletion.** One row per stage (24), per cheat-gate
check (8), per orchestrator gate. Each names the Spec 39 clause that owns it, **or** records an
explicit deletion with falsifiable proof. ~35 rows. Converts *purge by omission* into *purge by
decision* — which is exactly how G1/G2/G3 vanished from v1.

**Control 3 — `git tag pipeline-legacy-2026-08` immediately before the purge.** Zero working-tree
coexistence (Bean's actual requirement) while keeping a reference implementation one command away.

**Method: prove death by REACHING it.** Before deleting X, make X **raise**, then run the pipeline,
the tests and `/sgs-update`. Nothing raises ⇒ dead. Something raises ⇒ the load-bearing consumer
found itself in 30 seconds. Grep has already failed here once — D276 records a retirement blocked by
a live consumer the "dead output" trace missed.

**One commit per deletion**, with the raise-probe output in the message. Not one purge commit.

⚠ **Do NOT re-seed the goldens wholesale up front** (v1 had this as task one). That converts the
regression net into a photograph of today's bugs. Keep all 39 byte-comparing against the old engine
while both exist; **re-seed per section, at cutover, with the diff read.**

⚠ **Stage 3 is not a merge/coverage footnote — it is the dominant gap signal.** `extraction_failed`
was **339 of 346** leftover entries on the 2026-08-04 run, sourced from `stage_3_slot_list`. Re-home
it into the C3/C4 ledger BEFORE deleting, and assert the gap count does not collapse: a drop from
346 to 7 would read as a fidelity win and be the exact opposite.

⚠ **Do not decide the diagnostics' fate now.** They are the thermometer used to judge the rebuild.
Decide at the end. And note Bean's ruling: **delete, don't demote** — a flag-gated check nothing runs
by default is a fourth gate that cannot fail.

## 10. Ordering

```
Phase 0   provably-dead deletions (no markup risk, no spec needed)
Phase 0.5 naming collisions — rename BEFORE rebuilding so every later diff is readable
Phase 1   freeze the baseline (Control 1) + the reconciliation table (Control 2)
Phase 2   build IR + C1-C4b as a NEW top-level entrypoint — delete nothing, no flag,
          no `if new_engine:` inside any existing function
Phase 3   cutover — ONE commit, ONE call site. This is the entire broken window.
Phase 4   delete the old walker/extraction/arrangement (after tagging)
Phase 5   diagnostics — decide their fate last
```

Rationale for big-bang-on-build (Bean's call, and correct): **there is no seam to strangle across.**
`extraction.py:225` returns fully serialised strings; the IR's purpose is that nothing serialises
until V1. A per-stage cutover needs a bidirectional translator between two data models at every
seam — harder than the rebuild it protects. And the goldens byte-compare `block_markup`, so they
cannot survive a deliberate emit-shape change under *either* strategy; last time this argument was
made they were downgraded to a smoke check, which the test file records as leaving the regression
net *"effectively dead"*.

⚠ Stamp `engine='new'|'old'` on every trace event and gap row from day one of the migration, not
when it first becomes confusing.

## 11. Anti-staleness rules for this document and Spec 39

Written because v2 exists at all (§0).
- Every figure carries its source (query, file:line, or artefact path). No figure restated from memory.
- Any claim about `block_attributes` **role/property data is re-measured at time of use** — a
  co-active track is reseeding it continuously (`8bb106e1`, `1b957fde`, `2ca99d6f`, and more today).
- Spec 31 §13 is marked superseded on **approval** of Spec 39, not on landing — it will be cited by
  every agent working the rebuild, and a live-sounding spec describing the system being deleted is
  how false citations multiply.
- The stage map is **generated from `pipeline/stages.py`**, never hand-maintained. A hand-maintained
  map is the documented failure mode.

## 12. Open decisions for Bean

1. **The button exhibit needs a fresh clone** to establish whether the defect is still live after the
   role healing. 20 minutes. Recommend doing it before Spec 39 cites it.
2. **`variant_slots` seeding (9 rows, 4 blocks) is a prerequisite for D-A**, not a follow-on.
   Recommend it lands in Phase 0.
3. **Two run directories share one `run_id`** (`pipeline-state/<run_id>` and
   `plugins/sgs-blocks/scripts/pipeline-state/sgs-clone/<run_id>`), and the repo-root one is shared
   with unrelated tools. Pick one root and have the run print its absolute path once.
