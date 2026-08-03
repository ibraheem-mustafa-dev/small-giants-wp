---
doc_type: report
project: small-giants-wp
created: 2026-08-02
track: Track 1 — cloning pipeline
status: REVIEW COMPLETE — synthesis of 8 parallel surface audits. No code changed.
inputs:
  - 8 subagent audits, 2026-08-02 (Stage 0.7 / Stages 1-3 / Stage 4 recognition / Stage 4 content / Stage 4 CSS / folds / DB layer / Spec 31 doc audit)
  - lead measurements, same session
supersedes_claims_in: .claude/plans/2026-08-01-wrapper-recognition-cascade-rework.md
---

# The cloning pipeline's routing — full review

Every number below came from a query or an instrumented run on 2026-08-02, against
`main` at D-ceiling 478. Where a claim is READ (code) rather than MEASURED (observed),
it says so. Where this contradicts an earlier document — including my own report from
this morning — the contradiction is stated, not smoothed.

---

## 0. THE ONE-PARAGRAPH ANSWER

The routing engine's **architecture is sound and its data is starved**. The categorical
machinery Bean wants largely exists: a structural-signature registry, a declarative
column key, fail-loud ambiguity handling, a shared role-handler library. It falls back
to fuzzy matching because roughly two-thirds of the rows it would read are unseeded —
through declaration channels that already exist and already have working seeders. The
three things genuinely broken are (1) an entire fuzzy recognition subsystem whose answer
is discarded, (2) three-to-four competing mechanisms for each of four decisions, and
(3) **a severed feedback loop: nothing that fails to route is ever recorded**, so there
is currently no denominator against which any rework could be measured.

---

## 1. THE ROUTING CASCADE, END TO END

Stages as they actually execute. `[M]` = measured this session.

```
Stage -1  theme-extractor            draft computed styles → theme-snapshot.json
Stage 0   theme cache
Stage 0.1 BEM lint                   hard-rejects non-conformant drafts on prod runs
Stage 0.5 token lint
Stage 0.7 css_router.py (977 L)      splits draft CSS into D0/D1/D2/D3
            └─ D1 (the typed-attr lift) IS COMPUTED AND DISCARDED [M]
Stage 1   per-section-convention-voter.py (530 L)   section boundaries + a slug vote
Stage 2   confidence-matrix.py (482 L)              block-type match, 5 confidence tiers
            + wp-blocks.py natural-language query, 0-10 score, 0.3 override threshold
            └─ ITS ANSWER NEVER REACHES THE CONVERTER [M]
Stage 3   slot list                  metadata only; keyed on Stage 2's guess
Stage 4   converter/entry.py         ── THE REAL ROUTER ──
            ├─ chrome-skip (header/footer/nav)
            ├─ recognition.recognise_section()      BEM + DB, categorical
            ├─ assembly.build_block_markup()
            │    ├─ 3a2 tag-identity
            │    ├─ 3b  arrangement → layout attr
            │    ├─ 3c  composite band-fold   ─┐ two fold decision sites,
            │    ├─ 3d  L4 per-area fold       │  one shared gate
            │    ├─ CSS pass  → layer_detect → dispatch_table → 5 resolvers
            │    └─ CONTENT pass → walk.walk_content → registry → 3 child loops
            └─ status: complete | failed | chrome-skipped
Stage 9   leftover-bucket-router     gap classification  ← fed by Stage 2's wrong data
Stage 11.6 computed-parity           the only real fidelity signal
```

**The shape of the problem is visible in that diagram.** Stages 1–2 are a complete,
independent recognition system — ~1,000 lines — whose output routes nothing. Stage 4
re-derives everything categorically. The two agree on the canary by coincidence of two
independent mechanisms, and **provably disagree on other inputs** `[M]`.

---

## 2. THE FOUR DECISIONS, AND HOW MANY MECHANISMS ANSWER EACH

This is the core finding. Every routing decision in the pipeline is answered by more
than one mechanism, and in each case the mechanisms disagree.

### 2.1 "Which block is this section?" — 2 systems

| | Stage 2 | Stage 4 |
|---|---|---|
| Data | filesystem `src/blocks/*/block.json` + `patterns/*.php` | DB (`blocks`, `slots`, `block_composition`) |
| Method | 5 confidence tiers + a free-text keyword query | categorical BEM → DB lookup |
| Multi-root | first class wins, then a 0.5 secondary scan | dedupe → rank → LOUD on a true tie |
| No match | hardcoded `"sgs/container"` @ 0.0 | `container_default_slug()` |
| **Consumed by** | **reports, buckets, Stage 3's block.json choice** | **the emitted markup** |

`[M]` Rosters already differ: 85 blocks in the DB, 84 `block.json` files. A section whose
block exists in the DB but not on disk gets the wrong slot list, a coverage percentage
against the wrong attribute set, a **false high-severity gap**, and a scaffold attempt on
a block that already exists.

`[M]` On the canary, **7 of 9 sections that convert correctly score 0.0** and are filed as
high-severity `unrecognised_section` gaps.

`[M]` The natural-language override is **unreachable** (max achievable score 0.30 against a
`>0.30` trigger) — but the line after it still runs `confidence = max(cm, wp)`, inflating
the 0.0 sentinel to 0.3 and defeating a design a comment 200 lines earlier exists to
protect. Dead code with a live side effect.

> ⛔ **THIS PARAGRAPH WAS WRONG AND IS CORRECTED IN PLACE (QC gate, 2026-08-03).** It read:
> *"If Stage 2 were deleted, nothing in the emitted markup would change. Its only structural
> coupling is telling Stage 3 which `block.json` to read."* The second sentence is FALSE.

**Stage 2's block CHOICE never reaches the emitted markup — but its `matches` list is a live
structural input.** `[M]` `sgs-clone-orchestrator.py:1249-1253`, inside
`stage_4_5_6_7_8_extract`:

```python
matches = match_output.get("matches", [])
if not matches:
    errors = ["no matches from stage 2 -- nothing to extract"]
    return output          # Stage 4 aborts. Zero markup.
```

Stage 4 does not iterate boundaries — it iterates **Stage 2's matches list** and looks
boundaries up by id. Together with Stage 3's `block.json` choice, the coverage pass
(`:2144`) and the leftover-bucket router, that is **at least 7 distinct read sites**
(measured independently at the QC gate; an earlier "eight consumers" figure in `LEDGER.md`
and D480 was never enumerated in this report and should be read as ~7).

**Deletion is therefore a re-plumbing, not a delete** — Stage 4's loop must be re-sourced
from `voter.json` boundaries first. Moving Stage 3 after Stage 4 solves one coupling of
several, not the whole thing.

### 2.2 "Which block does this BEM token mean?" — 2 resolvers that disagree

`[M]` Two DB paths, both live, both reachable for the same node:

```
recognise() branch 3 : canonical_slot_for(token) → standalone_block_for(slot)
resolve_slug_from_bem: the _slot_alias_to_standalone map
```

**31 of 295** slot terms resolve differently. **9 of 89** classes on the real homepage
draft disagree. `sgs-footer__social` resolves to `sgs/social-icons` at recognition and
`sgs/info-box` at child-dispatch — same element, same run.

**Two independent causes, not one:**
1. The alias map filters `WHERE standalone_block IS NOT NULL`, so a slot correctly
   declaring "structural, no block" can never win — 20 tokens.
2. `_put` is **first-writer-wins over an unordered query** — 11 tokens whose winner is
   decided by SQLite row order. `stat`, `step`, `social`, `review`, `filter` are each
   claimed by two slot rows.

⛔ **These must be fixed together.** Fixing the filter changes the row order, which can
silently flip the other 11.

⛔ **A live bug found here, independent of any rework:** `resolve_slug_from_bem` can
return a block that does not exist. `sgs-foo__divider` → `sgs/divider`, which is not
built, and `extraction.py:660` passes it straight into a `ChildBlock` with no
validation. Six terms affected. This produces "this block contains unexpected content"
in the editor. The sibling accessor `standalone_block_for` guards against exactly this;
the alias map does not.

⚠ **Neither path dominates.** The canonical path has the built-check and camelCase reach;
the alias path is the *only* one resolving `card-tag` / `card-price` / `card-description`
on the live draft, via a compound prefix-strip. **Deleting either loses capability — the
merge must be designed.**

### 2.3 "Where does this element's content go?" — 3 loops, 3 different answers

`[M]` All three in `services/extraction.py`, all answering "what is a slug-None wrapper":

| Loop | Entry | Answer to "slug-None wrapper?" | Fires |
|---|---|---|---|
| **1** `_descend_container_children` | `slug == container_default` | promote it to its own `sgs/container` | 14 invocations, 32 children |
| **2** `run_mechanism_b` composite-interior | `is_class_section_block(slug)` | descend exactly one level | **3 invocations — hero ×2, cta-section ×1, nothing else** |
| **3** `run_mechanism_b` generic | everything else | dissolve recursively | 30 invocations, 13 blocks |

`[M]` **Loop 2 branch profile: branch B fires ZERO times, branch A once, branch C three
times.** Its only unique capability is art-directed `--mobile`/`--desktop` image routing.
Branch C is a strictly weaker version of loop 3's recursive dissolve.

**Loop 2 is the vestigial one** — Bean's instinct, confirmed with the mechanism. It exists
because `is_class_section_block`, a *recognition tier* flag, is being used as a *content
routing* switch: an R-31-9 carve-out for exactly two blocks.

⛔ **It cannot be deleted until art-direction is re-homed**, and that is blocked on a
missing DB fact (§4.2).

### 2.4 "Which attribute does this CSS property land on?" — 4 routers

`[M]` `attr_for_layer_property` (layer-keyed) · `attr_for_property` (layer-**blind**, and
used by `grid.py` for the two most structural properties in the system) ·
`attr_for_area_property` (declarative-only) · `typography_css_to_attrs` (its own map).
Plus `content_band._layer_priorities` re-deciding the layer *after* `layer_detect`
already decided it, and three separate state-suffix mechanisms.

### 2.5 "Does this wrapper dissolve?" — 1 live, 1 built-and-unwired, 1 deleted

`[M]` `_sole_passthrough_child` is the only live gate (2 call sites). `l2_qualify.qualify`
is built, self-tested, and has **zero non-test callers**. `_is_absorbable_wrapper` was
deleted at D440 — the rework register still lists it as live.

⛔ **Wiring `l2_qualify` as-is is a regression.** Under the substitution the pipeline
actually performs (container-default for *every* slug-None wrapper, not just section
roots), it passes 8 pairs and **disagrees on 3**, all destructive widenings — including
`sgs-gift-section__cards`, which Spec 31 §2.7 explicitly names as a nested own-container.
Cause: its grid-item test asks only whether the *parent* arranges, never the *child*, and
it dropped the sibling-count rule.

⚠ **This corrects my own measurement from earlier today.** I reported "7 passes, zero
disagreements" — that holds only under a section-roots-only substitution, which is not
what the code does.

⚠ **The register's "zero parents yield >1 band" is also false.** `sgs-gift-section__card-inner`
yields **two** qualifying bands, both arrangement-bearing (one grid, one flex). They race
on `setdefault` — first wins, silently, no trace.

✅ **Good news, measured properly:** the D446 transfer *is* lossless for arrangement.
On trust-bar's band, `display`, `gap`, `grid-template-columns` (including the Mobile
tier) and `contentWidth` all land.

---

## 3. THE FEEDBACK LOOP — CORRECTED BY A LIVE RUN

> ⛔ **THE STATIC CLAIM BELOW IS HALF WRONG. A live `/sgs-clone` run (Bean-directed,
> run `mamas-munches-homepage-2026-08-02-220510`, fresh canary page 2130) disproved it.**
>
> **What the live run measured:**
> - `attribute_gap_candidates` **GAINED 18 ROWS during the run** (2947 → 2965), each
>   stamped with this run's ID. The writer is `converter/db/db_lookup.py:2742`
>   (`INSERT OR IGNORE`) — **a side channel that never touches `entry.py`'s return value.**
>   The static audit read the return value, saw `[]` at four exits, and concluded nothing
>   persists. The return value IS empty in all 9 sections; the conclusion drawn from it
>   was wrong. **The audit was reading the wrong pipe.**
> - Stage 9 also wrote **346 `recognition_log` rows** and a 346-entry
>   `leftover-buckets.json` — so there are THREE ledgers, not zero.
>
> **What the live run CONFIRMED:** the per-element `[fold-gap] cross_node_gap_candidate`
> / `no_area_attr` events are genuinely lost. Grepped across all 44 artefact files: **zero
> matches**; none of the 18 new DB rows carry that shape. Sample losses observed on stdout
> and findable nowhere: the whole `sgs-testimonial__stars`/`__text`/`__author` typography
> set (emitted 3×), `sgs-gift-section__card` padding on all four sides,
> `sgs-social-proof__trustpilot-logo` colour/font-size/font-weight.
>
> **Corrected finding: one class of gap persists (class-level `add attr:` rows), one class
> vanishes entirely (per-element cross-node fold gaps).** There IS a denominator; it is
> partial, and the missing part is precisely the CSS the fold layer drops.

### The original static claim, retained for the record

**Spec 31 §3.A step 8 — "No destination? → write to `attribute_gap_candidates`. NEVER
silent-drop" — is unimplemented end to end.** `[M]`

- `gap_writer` produces a `GAP` object; `ElementResult.gaps` collects them.
- `css_pass._build_css_attrs` uses only `.attrs()` — **`result.gaps` is discarded**.
- `entry.convert_section` returns `"attribute_gap_candidates": []` at **all four exits**.
- `record_gap=` has **zero call sites**; the fold path's recorder is a no-op.
- Band-fold gaps go to a stdout trace only.

`[M]` On the Mama's homepage: **161 of 255 layer resolutions missed**, and 20+ fold-gaps
printed to stdout. **None reached the ledger.** Most-missed properties: `display` (35),
`border-color` (22), `align-items` (14), `justify-content` (12), `cursor` (10),
`background` (10), `--content-width` (10), `margin` (10), `flex-direction` (7).

That `--content-width` misses 10 times is its own finding: Spec §2.9 names it the
*deterministic* content-band signal, and it resolves to nothing on the primary draft.

> **Consequence for sequencing: there is currently no denominator.** Every "no
> destination" outcome is a silent drop wearing a GAP object's clothes. Until this is
> repaired, no rework can be measured, and no claim that a change "didn't regress
> anything" can be honest.

---

## 3b. THE LIVE RUN — what only running it could show

Run `mamas-munches-homepage-2026-08-02-220510` → canary page **2130** (fresh, disposable).
All `[M]`.

**It works better than the static audits implied.** Computed parity: **content 99%** at all
three viewports; CSS **83% / 84% / 89%** at 375 / 768 / 1440. 629 attrs extracted. 7 of 9
sections emitted (header/footer are intentional chrome-skips), producing 59 blocks between
the five "low-confidence" sections alone.

**Parity is worst at MOBILE, best at desktop** — 83% vs 89%, mismatched elements 54 vs 25.
The mobile-only excess is dominated by `line-height` (36 at 375px vs 5 at 1440px) and
`font-size` (35 vs 7). **That is a responsive-tier signature, not scattered noise** — and it
lines up exactly with §4.2's 145 unseeded tier rows.

**The trace does not trace the pipeline.** `trace.jsonl` + `summary.log` stop at **stage 4**.
Stages 7, 9, 9b, 9c, 4i, 4j, 10 and 11.6 all ran and all left artefacts; none appear in the
trace. **`errors.log` was never created at all**, though Spec 31 Appendix C lists it as
inventory — so a consumer globbing for it cannot distinguish "no errors" from "stage never
ran". **Any analysis anchored on the trace is reading a third of the run.**

**Stage 2, measured live:** agrees with Stage 4 on **7 of 7** emitting sections — but 5 of
those agreements are both sides *independently defaulting* to `sgs/container` at confidence
0.0–0.3 with `tie_breaker: "deferred-no-match"`. Stage 2 carried real signal on **2 of 9**
boundaries. Its `wp_blocks` leg proposed `sgs/site-header` and `sgs/brand-strip`; neither
reached the markup. So the deletion case stands, but on "it contributes almost nothing",
not on "it disagrees".

**Confidence is decoupled from correctness in BOTH directions:** `ingredients-section`
emitted **21 correct blocks at confidence 0.0**; `header`/`footer` are filed
`unrecognised_section` at **HIGH severity** for behaving exactly as designed, while the
`chrome_skipped` bucket built for them reads **0**.

**Three silent losses the artefacts admit to:**
- Stage 7 reports `css_body_chars: 23159` but wrote `total_chars: 17132` — **~6KB of parsed
  CSS did not reach the output file**, with `malformed: 0` and `passed: true`.
- The anti-mirror gate raised **103 soft warnings** for D2-stranded layout CSS (29×
  `display`, 18× `gap`, 16× `align-items`…), several layout-critical. Non-blocking, and in
  **no artefact** — stdout only.
- `stage-4i.json` says `"uploaded": 12` while stdout says `2 new, 10 reused`. The field
  overstates by 6×.

**A misleading message:** the run printed `skipped per --skip-autonomy-gate` for a flag the
operator never passed. `--mode draft` skips it and blames a flag.

## 4. THE DATA — what categorical routing would need

> ⛔ **THIS SECTION WAS WRONG IN THE FIRST DRAFT AND IS CORRECTED HERE (Bean, same day).**
> The original divided every column by ALL `sgs/%` attribute rows. That is the wrong
> denominator: a boolean toggle cannot carry a `css_property`, a styling attr cannot carry
> an `emit_shape`, a non-container block cannot carry a `container_kind`. A ratio over the
> wrong population is fabricated, not weak
> (`feedback_establish_the_denominator_before_quoting_a_percentage`). Re-measured below
> against the population that can legitimately carry each value.

### 4.1 Coverage against the ELIGIBLE population (MEASURED)

| Column | Eligible population | Naive (first draft) | **Eligible coverage** | Verdict |
|---|---|---|---|---|
| `container_kind` | blocks that wrap the container (37) | 36/89 = 40% | **36/37 = 97.3%** | **essentially complete** |
| `variant_attr` | blocks that HAVE variants (5) | 5/85 = 6% | **5/5 = 100%** | **complete** |
| `emit_shape` | content-bearing attrs (124) | 4.7% | **116/124 = 93.5%** | **near-complete** |
| `css_state` | state siblings (94) | 3.9% | **80/94 = 85.1%** | **healthy** |
| `css_property` | genuinely CSS-destined attrs | 34.7% | 0% of content attrs (**correct**); 54–73% of styling attrs | mixed — see 4.2 |
| `css_layer` | attrs with a `css_property` (863) | 14.2% | **352/863 = 40.8%** | real gap, smaller than stated |
| `css_tier` | tier siblings whose base carries a `css_property` (238) | 6.2% | **93/238 = 39%** | **real gap — see 4.2** |
| `accepts_allowed_blocks` | blocks that accept InnerBlocks | 18/89 = 20% | NULL is **spec-defined as permissive** (FR-31-2.6 G3) | not a gap |

`[M]` **Content-bearing attributes carry `css_property` on 0 of 124 rows — which is
correct, not starved.** That single crosstab is the proof the original denominator was wrong.

**Four of the six columns called "starved" in the first draft are essentially complete.**
The Track 1 Phase 0/1/1b/2/3 work (D464, D470–D478) did what it claimed.

### 4.2 The REAL remaining gap, precisely sized

`[M]` **145 tier-sibling rows** whose BASE attribute carries a `css_property`, but which
themselves carry **neither `css_property` nor `css_tier`**:

```
tier siblings whose base HAS a css_property : 238   <- the defensible eligible set
   ...css_tier set                          :  93
   REAL GAP                                 : 145   (all 145 also lack css_property)
```

Examples: `sgs/accordion.gridTemplateColumnsTablet` (base → `grid-template-columns`),
`sgs/button.fontSizeMobile` (base → `font-size`), `sgs/button.minHeightTablet` (base →
`min-height`). Each is unambiguously CSS-destined and its base row already proves the
property — so these are **mechanically derivable**, not judgement calls.

**That is the honest size of the seeding gap: ~145 rows, not ~2,130.**

⚠ The `role` column is NULL on 65.5% of rows, and 439 of those NULL-role rows *do* carry a
`css_property` — so a NULL role does **not** imply CSS-ineligible. This makes eligibility
hard to compute automatically and is the one column where "what qualifies a row" still
needs Bean's ruling rather than a query. **UNVERIFIED: whether a NULL `role` is legitimate
for most of those 1,629 rows, or a genuine classification gap.**

### 4.3 Resolution share (unchanged, and it was measured correctly)

Of the calls that actually resolve on a live run: **73.4% declarative / 26.6% name-built**
(static census over the whole DB: 70.5% / 29.5%). The name-built fallback is load-bearing
for **172 `(block, property)` pairs** with no declarative row at all.

### 4.3 Genuinely missing data (not just unseeded)

1. **A tier/state discriminator on CONTENT attrs.** `content_attr_for_element` takes no
   modifier, so `splitImage` and `splitImageMobile` are indistinguishable and resolve by
   **rowid** — the lower always wins. This is what blocks deleting loop 2.
2. **`css_layer IS NULL` matches every layer**, and CONTENT/GRID queries apply **no
   element filter at all**. `[M]` **511** attrs carry `css_property` with NULL `css_layer`;
   **317 of those name a non-root element** (`label` ×26, `item` ×20, `title` ×18,
   `caption` ×18, `pill` ×15). A leaf sub-element attr is a live candidate for the block's
   own content-band declaration. **This is a correctness bug inside the path the spec
   calls the good one.**
3. **Element→attr binding for `child`-shaped attrs.** `emit_shape='child'` is used *only*
   as a suppression filter (three `continue` statements). Positive child routing still runs
   off `delegates_content` — the block-level flag FR-31-2.6 declares retired — and
   re-derives identity from BEM. **The spec's headline claim, that a per-attr fork replaced
   the block-level dispatch, is half-implemented.**
4. **Alias uniqueness.** 11 terms claimed by ≥2 slot rows, resolved by row order.
5. **FK on `slots.standalone_block`** → `blocks.slug WHERE status='built'`.

### 4.4 Dead weight

`[M]` ~4,000 populated cells across `signature_confidence` (100% NULL, no writer, no
reader), `output_signature` (1,390), `equivalent_implementations` (2,109),
`inspector_control_type` (951), `block_selectors` (87), `legacy_role_lookup` (15),
`design_tokens.css_var`, `markup_examples` — **none read by `converter/`**.

**10 of 111 `db_lookup` functions have no production caller.** One (`variation_attrs_for`)
queries a table dropped at D469 — it would raise on call.

Module-level: `services/content_select.py` is entirely dead (148 lines, confirmed by two
search shapes); `run_mechanism_a` has tests as its only callers; `resolvers/scalar_media.py`
is a 27-line docstring; `fold_helpers.grid_item_areas` has zero call sites; the CG-8
image-alt lift is implemented verbatim **twice**; BEM `__element` extraction exists in
**six** places.

---

## 5. GATES THAT CANNOT FAIL

`[M]` Found across five surfaces. Each reads green and proves nothing:

1. `test_per_section_convention_voter.py` — **fails 5 of 9 cases and exits 0**.
2. `STAGE_2_CONFIDENCE_THRESHOLD` is documented as a "Spec 31 Stage 2 Hard Gate".
   **No such gate exists in Spec 31.** Fabricated authority in a docstring; it gates no
   routing branch.
3. The Stage-9d functionality-gap detector reads a key Stage 2 has never emitted —
   **it has never produced a row from a real run**.
4. `test_css_router.py` mocks `db_lookup` wholesale, so it exercises the branch skeleton
   against invented data and cannot catch a routing defect.
5. The coverage matrix §6 goal 4 gates on reads **0 COVERED cells out of 1,452**.
6. The NO-UNROUTED conservation check is **vacuous** for the layer path — `layer_detect`'s
   four return values all have resolver entries, so `UNROUTED` can never fire from there.

---

## 6. THE SPEC AS A DOCUMENT

Buildability: **0 PASS / 4 PARTIAL / 4 FAIL.**

**Four of eight routing surfaces have no specification at all** — Stage 1 boundary
detection (7 grep hits, all incidental), Stage 2's confidence model, Stage 0.7's D0/D2/D3
predicates, Stage 9's five buckets. They exist in the document only as filenames.

**~55–60% of the bytes are build narrative**, and it is not inert — it carries
live-sounding requirements against deleted code: a mandated test asserting a dropped
column, a required disambiguator on a zero-reader table, three completion goals citing
line numbers in a file deleted at D276. Appendix A's walker pseudocode describes a
function that was never written, calls a resolver the live recogniser never calls, and
contradicts FR-31-4 on its third exception.

**Contradictions that matter for this rework:**
- The fold predicate is defined two incompatible ways **7 lines apart** (§2.4 keys on the
  child's identity; D441 states the trigger is relational and *"the child's own identity
  is never the input"*).
- `scalar-media` reads as dead in the canonical content section and alive in §4. `[M]` §4
  is right (2 rows). Rebuilding it would duplicate D474.
- §2.1 states `container_kind` is *"NOT a routing input"*; `pick_root` uses it as **the**
  tie-break.

**Counts that are wrong:** container roster is **36, not 31** (6 occurrences, and it is the
denominator of a completion gate); `parent_block` 23 not 18; `attribute_gap_candidates`
2,947 not 2,373.

✅ **Genuinely good, preserve verbatim:** §4's DB-column map (source + reader +
seeded/derived + fact-check verdict per row — the shape the whole spec should have);
§2.4's three definitions (*pass-through / real child / sole*); FR-31-5.2 + D303's residual
architecture.

**One thing I flagged that turned out clean:** the "permitted walker exceptions" count.
The spec says three consistently, everywhere. The real pressure on R-31-3 is that **nine**
branch points now answer "what block is this node", each admitted by a docstring calling
itself *a refinement, not a fourth branch* — an escape hatch the rule's own wording grants.

---

## 7. THE CATEGORICAL TARGET

Converged from four independent agents. One composite-key lookup per declaration:

```sql
block_attributes(
  block_slug,   -- from recognition
  css_property, -- from the declaration
  css_layer,    -- NOT NULL, enum OUTER|CONTENT|GRID|GRID_AREA
  css_element,  -- NOT NULL, '' = the block's own root
  css_state,    -- '' = resting
  css_tier      -- '' = base/desktop
) → attr_name, attr_type, box_family, unit_companion_attr
UNIQUE(block_slug, css_property, css_layer, css_element, css_state, css_tier)
```

What that deletes: the suffix loop, the D307 fallback, `attr_for_property`,
`attr_for_area_property`, `attr_for_state_property`, `typography_css_to_attrs`,
`_layer_priorities`, `unit_companion_attr`'s string arithmetic, and both tier/state
suffix-append mechanisms — tier and state become **key columns, not string surgery**.
The `UNIQUE` constraint replaces four runtime ambiguity exceptions with a seed-time
failure. Zero rows for a key = a gap, written by the one resolver. **No silent path exists.**

Equivalent target for recognition: 1 parse + ≤4 ordered, mutually exclusive DB lookups
(registered root → parent-scoped child token → element-slot map → atomic tag → container
default), every one exact-match and fail-loud.

**Blocking quantities:** ~2,130 attr rows need `css_property`; 511 need `css_layer`; 97
`(block, layer, property)` triples **already raise** `AmbiguousLayerAttrError` and two
call sites invoke the resolver without catching — a data change that makes one reachable
is a hard crash, not a gap.

---

## 8. WHAT THIS MEANS FOR THE PROGRAMME

The reframe: **less "rebuild the routing engine", more "feed the engine, then delete what
it only needed while starving."** That is cheaper, lower-risk, and testable — every
fallback removed should change no output if the data behind it is complete.

Suggested order, with reasoning:

| # | Step | Why here |
|---|---|---|
| **0** | **Repair the gap ledger** (§3) | Nothing else can be measured until this works. Cheapest item on the list. |
| **0b** | **Fix or delete the 6 gates that cannot fail** (§5) | Otherwise the rework starts from a false green. |
| **1** | **Fix the two live correctness bugs** — unbuilt-slug emission (§2.2), `css_layer IS NULL` matching every layer (§4.3) | Both ship today, both independent of the rework. |
| **2** | **Seed the 145 derivable tier rows** (§4.2) | Mechanically derivable from each base row. Much smaller than the first draft claimed. |
| **3** | **Delete Stage 2**, move Stage 3 after Stage 4 | Removes ~1,000 lines and the whole fuzzy subsystem. Zero markup change. |
| **4** | **Merge the two BEM resolvers** (§2.2) | Needs design — neither dominates. |
| **5** | **Add the tier/state discriminator**, then re-home art-direction and **delete loop 2** | Ordered: the DB fact must land first. |
| **6** | **Collapse the four CSS routers to the composite key** (§7) | Depends on step 2's seeding. |
| **7** | **Redesign the fold gate** — relational trigger + the missing "child arranges or has siblings" half | The original front. Now correctly scoped. |

Steps 0, 0b, 1 are independent of each other and of everything below.

---

## 9. OPEN DECISIONS FOR BEAN

1. **Documentation target.** Spec 31 cannot absorb this rework as-is. The proposal from
   the doc audit: split normative from historical; one decision table per routing decision
   (input data → predicate → outcomes → precedence → undefined-case behaviour); explicit
   precedence per stage; a provenance line per routing fact. **This decides what "update
   the docs" means for every subsequent step**, so it should be settled before step 2.
2. **Stage 2's fate** — delete, or demote to an explicitly-labelled operator-review
   heuristic that is never called routing.
3. **Whether the gap ledger repair is in scope now.** I recommend yes and first; it is the
   only thing standing between us and a measurable programme.

---

## APPENDIX — corrections to earlier claims made this session

| Claim | Source | Correction |
|---|---|---|
| "14 hijacked tokens across 7 slots" | lead, this morning | **31 of 295 terms**, two independent causes. `progress-step` agrees on both paths. |
| "the alias map is the fix" | lead | Neither path dominates; the merge must be designed. |
| "l2_qualify: 7 passes, 0 disagreements" | lead | Scope-sensitive. Under the real substitution: **8 passes, 3 destructive disagreements**. |
| "loop 1 routed 36 children" | lead | **32**. |
| "four competing wrapper mechanisms" | rework register | **Three** — `_is_absorbable_wrapper` was deleted at D440. |
| "`__nav` has false block identity, blocking the fold" | rework register | False for the live gate. `recognise()` returns None correctly. The false identity belongs to `__panel`, via a *correct* path reading *wrong data*. |
| "zero parents yield >1 qualifying band" | rework register / `fold_helpers` docstring | False. `sgs-gift-section__card-inner` yields two, both arrangement-bearing. |
| "the product draft is a Q3 corpus" | rework register | It contains **zero** `sgs-` classes. |
| "four permitted walker exceptions is a contradiction" | lead, in the agent brief | Clean. The spec says three, consistently. |
| **"the DB is data-starved across every routing axis"** | **lead + DB agent, first draft of this report** | **WRONG DENOMINATOR.** Divided by all attribute rows instead of the eligible population. Re-measured: `container_kind` 97.3%, `variant_attr` 100%, `emit_shape` 93.5%, `css_state` 85.1% of their eligible sets. Real gap is ~145 tier rows, not ~2,130. See §4. |
| "~2,130 attr rows need `css_property` seeded" | CSS-pass agent, quoted by the lead | Counted every NULL row including content attrs, booleans and enums that must never carry one. Correct figure: 145 mechanically-derivable tier rows. |
| "`accepts_allowed_blocks` validation is vacuous for 80% of parents" | DB agent | NULL is spec-defined as PERMISSIVE (FR-31-2.6 G3) — a legitimate value, not a missing one. |
| "static analysis is sufficient" | lead, implicitly | It was not. No agent ran the pipeline. Bean directed a live run; it contradicted two headline findings. |
| **"gaps are never recorded — there is no denominator"** | **CSS-pass agent, amplified by the lead** | **DISPROVED by the live run.** `attribute_gap_candidates` gained **18 rows**, written via a side channel (`db_lookup.py:2742`) that bypasses the return value the audit inspected. Plus 346 `recognition_log` rows and a 346-entry `leftover-buckets.json`. THREE ledgers, not zero. **Only the per-element fold-gap class is genuinely lost.** |
| "161 of 255 resolutions missed, none recorded" | CSS-pass agent | The miss count is a probe-scoped figure, not a fidelity measure. Live parity: **content 99%, CSS 83–89%**. |
| "Stage 2 provably disagrees with Stage 4" | Stages 1-3 agent + lead | Live: agrees **7/7** on emitting sections. The deletion case rests on it contributing signal on only **2 of 9** boundaries, not on disagreement. |
| "the artefacts are the authority" | lead, in the run brief | Partly. `trace.jsonl` stops at stage 4 and `errors.log` is never created — the artefact set covers ~a third of the run. |
| **"deleting Stage 2 changes nothing in the markup; its only coupling is Stage 3"** | **lead, §2.1 of this report** | **FALSE — corrected in place above (QC gate, 2026-08-03).** Stage 4 iterates Stage 2's `matches` list and hard-fails on empty (`orchestrator:1249-1253`). ~7 read sites, not 1. Deletion is a re-plumbing. |
| "EIGHT consumers of Stage 2" | lead, in `LEDGER.md` + D480 | Never enumerated in a committed report. Independently measured at the QC gate: **7** distinct read sites. Treat 8 as unsourced. |
