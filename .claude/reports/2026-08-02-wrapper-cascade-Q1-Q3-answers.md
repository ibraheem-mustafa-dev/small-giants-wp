---
doc_type: report
project: small-giants-wp
created: 2026-08-02
track: Track 1 — cloning pipeline
register: .claude/plans/2026-08-01-wrapper-recognition-cascade-rework.md
status: Q1/Q3 ANSWERED with measurement; Q2 PARTIAL (decision half mapped, transfer half read but not re-measured)
---

# Wrapper recognition — Q1 / Q2 / Q3 answered, with measurement

Every claim below is a measurement or a read of the live code, taken 2026-08-02 on
`main` (D-ceiling 478). Where it contradicts the register, the contradiction is
stated explicitly — the register was written 2026-08-01 and three of its load-bearing
claims have since drifted or were wrong when written.

---

## ⛔ FOUR CORRECTIONS TO THE REGISTER — read before using it

### C1. There are THREE competing mechanisms, not four. #3 is already deleted.

The register's "FOUR COMPETING MECHANISMS" table lists `_is_absorbable_wrapper()`
at `converter/services/section_passes.py:57`. **That function no longer exists.** It
was deleted at D440 (2026-08-01) along with `_absorb_transparent_wrappers`,
`_ABSORB_GAP_PROPS` and `_ABSORB_POSITIONING_PROPS`; `section_passes.py:45-54` is now
a tombstone comment explaining why. The pre-pass that called it was deleted from
`entry.py` in the same change (`entry.py:281-298`).

**Consequence for the plan:** the register's headline evidence — "#3 treats
padding/margin/gap as DISQUALIFYING a wrapper while #1 uses max-width + margin as the
IDENTIFYING signature" — describes a contradiction that **no longer exists in the
code**. It is still the correct *rationale* for why the rework is needed (it is why
D440 happened), but it is history, not a live defect. Do not go looking for it.

Live mechanisms today:

| # | mechanism | file | decides from | status |
|---|---|---|---|---|
| 1 | `layer_detect()` | `services/layer_detect.py` | CSS signature + `ctx.is_root` | sound, name-free. **Exactly ONE caller** (`orchestrator.py:205`) and it runs only after a node is already committed to being a block. |
| 2 | `_sole_passthrough_child()` | `services/extraction.py:360` | `recognise()` + parent-not-arranging + **exactly ONE** element child | the live DECISION gate. Two call sites: `extraction.py:447` (container default) and `assembly.py:222` (composite band-fold, step 3c). |
| 4 | `resolve_slug_from_bem() is None` | `db/db_lookup.py` | the slot-alias map | alias-hijacked (see C2). Consumed by `l2_qualify` requirement B and by `extraction.py:660,796` child routing. |
| 5 | `l2_qualify.qualify()` | `services/l2_qualify.py` | RELATIONAL (parent identity) + 7 requirements | BUILT, self-tested, **UNWIRED**. Zero non-test callers. |

### C2. The alias hijack is real but does NOT reach `_sole_passthrough_child`. The register's tabs blocker #1 is FALSE.

The register says: *"Why tabs cannot fold today — two independent blockers: 1. `__nav`
has false block identity, so `only_rec.slug is None` fails (mechanism #2)."*

**Measured — this is wrong.** `_sole_passthrough_child` resolves identity through
`recognise()`, which uses a **different** DB path from `resolve_slug_from_bem`:

```
recognise() branch 3 : canonical_slot_for(token) -> standalone_block_for(slot)
resolve_slug_from_bem : _slot_alias_to_standalone() map   <-- the NULL-filtered one
```

Only the second is hijacked. Measured on the live DB:

```
canonical_slot_for('nav')  -> 'nav'   ; standalone_block_for('nav')  -> None   CORRECT
resolve_slug_from_bem(['sgs-tabs__nav'])                              -> sgs/info-box  WRONG
```

And on the actual fixture node:

```
sgs-tabs__nav    recognise() -> kind=unrecognised  slug=None      <-- NO false identity
sgs-tabs__panel  recognise() -> kind=scalar        slug=sgs/info-box
sgs-tabs__trigger recognise() -> kind=atomic       slug=sgs/button
```

So:
* **`__nav` has no false block identity under mechanism #2.** The register's blocker #1
  does not exist for `__nav` on the live decision gate.
* **`__panel` DOES have false identity** — but via the *correct* canonical path, because
  the `panel` slot genuinely carries `standalone_block='sgs/info-box'` in the DB. That is
  a **data** defect (a seeded value), not the NULL-filter defect. A different fix.
* Tabs' only real blocker under mechanism #2 is therefore the **exactly-one-element-child
  rule** (`.sgs-tabs` has two: `__nav`, `__panel`). Blocker #2 stands; blocker #1 does not.

**But the hijack bites the REPLACEMENT.** `l2_qualify` requirement B uses
`resolve_slug_from_bem`, so it *does* see `__nav` as `sgs/info-box`. Measured on the
tabs fixture: `sgs-tabs > sgs-tabs__nav -> REJECT (B-child-has-block-identity, 'sgs/info-box')`.

> **Therefore: wiring `l2_qualify` WITHOUT first fixing the alias map would be a
> REGRESSION on `__nav`, not a fix.** The two gates disagree about `__nav` today
> precisely because they read two different tables. This is the single most important
> sequencing fact for the rework.

### C3. Blast radius is 14 hijacked tokens across 7 slots, not 4.

The register lists 4 (`__attribution`, `__nav`, `__ribbon`, `__slot`). Measured over
all 64 element-scope slots with a NULL/empty `standalone_block`, probing every
slot name **and every alias**:

```
total no-block element slots: 64
HIJACKED tokens: 14
  attribution / attribution      -> sgs/text
  attribution / author           -> sgs/text
  badge       / pill             -> sgs/label
  bar         / progress-step    -> sgs/process-steps
  nav         / menu-nav         -> sgs/info-box
  nav         / nav              -> sgs/info-box
  overlay     / lightbox-caption -> sgs/text
  ribbon      / plan-ribbon      -> sgs/text
  ribbon      / price-ribbon     -> sgs/text
  ribbon      / ribbon           -> sgs/text
  slot        / slot             -> sgs/info-box
  slot        / slot-img         -> sgs/media
  slot        / slot-label       -> sgs/label
  slot        / slot-preview     -> sgs/info-box
```

The register's under-count came from probing slot NAMES only, not their alias lists.
`__author` (a testimonial/quote standard, same family as `__attribution`) and
`__pill` were both missed.

### C4. The product draft is NOT an SGS-BEM draft and cannot serve as a Q3 corpus.

`sites/mamas-munches/mockups/product/index.html` contains **zero** `sgs-` classes
(measured: `grep -o 'sgs-[a-z-]*' | sort -u | wc -l` = 0). Every recognition path is
BEM-triggered, so the qualifier can produce no data from it.

This invalidates one third of Q3's prescribed corpus, and it means the register's
D441 claim — *"Measured across the homepage draft, the product draft and
`sgs-tabs-realistic`: ZERO parents yield >1 qualifying band, and the two gates
disagree on ZERO parents"* — drew its "zero" from a file that could only ever
return zero. (`sgs-tabs-realistic` also does not exist; it is what TASK 0 is meant
to create.)

---

## Q1 — universal or per-site? ANSWER: universal, and the roster is small.

**Are any of the current fake-wrapper mechanisms used outside the cascade?** No.
Measured call sites (excluding tests and comments):

* `layer_detect` — **1** caller: `orchestrator.py:205`, inside the per-element CSS pass.
* `_sole_passthrough_child` — **2** callers: `extraction.py:447`, `assembly.py:222`.
* `resolve_slug_from_bem` — **4** non-test callers: `l2_qualify.py:265`,
  `extraction.py:660`, `extraction.py:796`, `walk.py:332`. Only the first is a
  wrapper decision; the other three are child-block ROUTING (a different question).
* `_is_absorbable_wrapper` — **0** (deleted).

**So: one universal script can replace all of them**, and the replacement has exactly
**two** wiring points (`extraction.py:447`, `assembly.py:222`) — the same two the
register already identified as the DECISION half. The other `resolve_slug_from_bem`
call sites must be left alone by the wrapper rework; they belong to the CHILD-ROUTING
cascade, which is a separate question with its own correctness rules (G1
forced-parentage, G3 validation).

**Can L1/L3/L4 be universalised the same way?** Partly, and the answer differs per L:

| L | current signal | universalisable? |
|---|---|---|
| **L1 OUTER** | `ctx.is_root` — a structural fact the caller supplies | **already universal.** Nothing to rework. |
| **L2 CONTENT** | 3 disagreeing mechanisms | **yes — this is the rework.** |
| **L3 GRID** | `arrangement.carries_arrangement()` — pure CSS signature, tier-aware | **already universal and correct.** It is `l2_qualify` requirement A and `_sole_passthrough_child`'s first guard — both already delegate to it. Do not rebuild. |
| **L4 GRID_AREA** | `ctx.area_name`, set by the Ctx-builder from the parent's `grid-template-areas` | **already relational** — the same shape Bean's L2 model asks for. It is the existing precedent for "the parent decides the child's layer". |

**Recommendation:** L2 is the only L that needs the rework. L1/L3/L4 are already
name-free and relational; extending the work to them would be scope invention.

---

## Q2 — the full cascade in execution order

### The two halves (the register's own seam, confirmed against code)

```
DECISION  — does this wrapper dissolve?    _sole_passthrough_child   -> to be replaced
TRANSFER  — where does its CSS go?         fold_helpers.fold_band_css -> NOT in scope
```

### Execution order, start to finish

```
convert_section (entry.py)
 └─ 1. CHROME-SKIP            entry.py:265   header/footer/nav at top level -> skipped
 └─ 2. RECOGNISE SECTION      recognition.recognise_section(root)
       ├─ recognise() branch 1  NAMED     BEM root class -> block_exists -> pick_root (kind-ranked)
       ├─ recognise() branch 2  ATOMIC    no sgs- root class + atomic_tag_map hit
       ├─ recognise() branch 3  SCALAR    BEM __element -> canonical_slot_for -> standalone_block_for
       ├─ recognise() branch 4  UNRECOGNISED
       └─ FR-31-4 promotion     genuine no-match + has BEM root -> container_default_slug()
                                (an AMBIGUOUS tie stays loud — never silently a container)
 └─ 3. BUILD BLOCK MARKUP     assembly.build_block_markup(rec, root)
       ├─ step 3a2  tag-identity attrs         (FR-31-2.9)
       ├─ step 3b   ARRANGEMENT trigger        arrangement.layout_attrs(root)  -> layout:grid|flex
       │            DB-gated on the block declaring a `layout` attr
       ├─ step 3c   COMPOSITE BAND-FOLD        <-- DECISION SITE #1
       │            gate: rec.slug != container_default AND _sole_passthrough_child(root)
       │            transfer: fold_band_css(inner, rec.slug, attrs, css)
       ├─ step 3d   L4 PER-AREA FOLD           route_area_css_to_block_attrs per named-area child
       │            + residual @media bands -> sgsCustomCss
       ├─ CSS pass  css_pass -> orchestrator.process_element per element
       │            └─ layer_detect(ctx, base_decls)   <-- the ONLY layer_detect call
       │               is_root -> OUTER | ctx.area_name -> GRID_AREA
       │               display:grid|grid-template-columns -> GRID | else CONTENT
       │            -> dispatch_table -> outer_box / content_band / grid / grid_area / typography
       └─ CONTENT pass  walk.walk_content(rec, node)
             ├─ pre-registry gates: delegates_content None -> loud gap; D212 -> raise
             ├─ signature_for(rec) computed ONCE (kind, holder|composite, delegates_content,
             │  scalar_lift, array_lift, content_leaf)
             └─ ADDITIVE handlers by explicit priority:
                 10  container_default   (holder)  -> extraction.run_container_default
                     └─ _descend_container_children      <-- DECISION SITE #2
                        gate: _sole_passthrough_child(parent)
                        transfer: fold_band_css(only, container_default, band, css)
                        then RE-DESCEND the folded inner (loop while sole pass-through)
                        else: route each child (grid item / own-container recurse)
                        then: lift_uniform_grid_item_css across the items (§2.5)
                 20  universal_walk      (composite) -> run_universal_content_walk
                     ├─ NESTED leg 1  lift_scalar_content, emit_shape='child' filtered out
                     ├─ NESTED leg 2  per-element content_attr_for_element (+ foreign-identity arm)
                     ├─ CHILD leg     delegates_content==1 -> run_mechanism_b (G1/G3 child routing)
                     └─ LEAF fallback run_mechanism_leaf
                 31  styling_content   (composite, self-gated on capability)
                 40  array_content     (array_lift)
             └─ conservation floor: zero results -> ONE explanatory ContentGap
```

### The branch that decides "wrapper?" — all of it, in one place

There is **no single wrapper predicate**. The decision is spread across four
independent tests that must ALL hold, evaluated at two call sites:

```
_sole_passthrough_child(parent, css):
    1. NOT arrangement.carries_arrangement(parent)      # §2.4 grid-item-test-first
    2. len(element_children) == 1 AND no loose text     # "sole"
    3. recognise(only).slug is None OR kind=='unrecognised'
    4. NOT node_is_text_leaf(only) AND only.find(True) is not None
```

versus the built replacement:

```
l2_qualify.qualify(parent, child, css, parent_slug):
    T. _is_container_kind(parent_slug)                  # THE TRIGGER — relational
    A. NOT arrangement.carries_arrangement(parent)      # identical to (1)
    B. resolve_slug_from_bem(child classes) is None     # DIFFERENT TABLE from (3)
    C. child.name not in atomic_tag_map()               # tag is shape
    D. child.find(True) is not None                     # never a leaf
    E. no own text node                                 # ~ (4)
    F. every declared CSS property lands on the parent  # typography-homeless rejects
```

**Deltas that matter, all measured:**

| | `_sole_passthrough_child` | `l2_qualify` |
|---|---|---|
| trigger | none — runs on any parent | **parent must be container-kind** |
| sibling count | **exactly 1 element child** | no requirement (this is what unblocks tabs) |
| child identity table | `recognise()` (canonical_slot path) | `resolve_slug_from_bem` (**hijacked**) |
| CSS test | none | requirement F |

### Measured behaviour of the replacement on the real corpus

Homepage draft (`sites/mamas-munches/mockups/homepage/index.html`), all 377 parent-child
pairs, section roots resolved via `recognise_section`:

```
-- L2 PASSES (7) --
  sgs-header            > sgs-header__inner              [parent=sgs/container]
  sgs-trust-bar         > sgs-trust-bar__inner           [parent=sgs/trust-bar]
  sgs-featured-product  > sgs-featured-product__inner    [parent=sgs/container]
  sgs-ingredients-section > sgs-ingredients-section__inner [parent=sgs/container]
  sgs-gift-section      > sgs-gift-section__card-inner   [parent=sgs/container]
  sgs-social-proof      > sgs-social-proof__inner        [parent=sgs/container]
  sgs-footer            > sgs-footer__inner              [parent=sgs/container]

-- DISAGREEMENTS between the two gates: 0 --
```

That is Spec 31 §2.7's acceptance table exactly (5 content sections) plus header and
footer, which the pipeline chrome-skips before either gate ever runs. **Zero parents
yield more than one qualifying band**, so the register's setdefault-race hazard does
not materialise on this draft — confirmed, not assumed.

> ⚠ **PROBE DEFECT FOUND AND FIXED MID-MEASUREMENT.** My first harness keyed
> "section root" on `parent is body` and reported **4 false disagreements**
> (featured-product / ingredients-section / gift-section / social-proof), all
> `T-parent-is-not-a-container-kind-block`. Every section on this draft lives inside
> `<main>`, so none was ever treated as a root, so none got the FR-31-4 container
> promotion, so `parent_slug` was `None` and T rejected. The correct predicate is
> "no ANCESTOR carries an sgs- class". Four "defects" that were measuring the probe.
> This is the fourth instance of that failure class in a week — see the LEDGER.

### What Q2 does NOT yet answer

The register requires re-measuring that the TRANSFER half is lossless before wiring
(`fold_helpers._fold_band_arrangement`, D446). **I have read it but not re-measured
it.** `l2_qualify._lands_on_parent` returns True for `display` on every container-kind
block, so requirement F passes a band partly *because* `display` is believed to have a
destination — a belief that was false until D446. That re-measurement is the
outstanding piece of Q2 and must happen before any wiring.

---

## Q3 — build the qualifier WITHOUT background/border, then measure

**It is already built that way.** `l2_qualify` has no allowlist at all. Requirement F
resolves every property per-block from the DB (`block.json supports.sgs.elements.*.attrMap`
first, then `attr_for_property` / `attr_for_layer_property` across OUTER/CONTENT/GRID),
and it splits homeless properties into two classes:

* **homeless STRUCTURAL** (e.g. `margin` on the default container) — reported on the
  verdict, does **not** disqualify. Correct: `max-width` + `margin:auto` IS the §2.3
  band definition; the centring margin is consumed by the fold.
* **homeless CONTENT-BEARING** (`db_lookup._TYPOGRAPHY_CSS_SCOPE`) — disqualifies. A node
  that styles text is styling content.

`background` and `border` are therefore neither admitted nor banned globally — they
are resolved per block, per layer, which is exactly what Bean asked for and is why the
register's "do not special-case them" instruction is already satisfied.

**What the measurement says the allowlist needs:** nothing added. Across the whole
homepage draft, **not one** rejection fired on requirement F. The rejection profile is:

```
 151  T-parent-is-not-a-container-kind-block      (correct — these parents are not containers)
  22  B-child-has-block-identity                  (21 correct; see the hijack caveat)
  21  A-parent-arranges-so-child-is-a-grid-item   (correct — §2.4 grid-item-test-first)
  13  C-child-tag-is-content-shaped               (correct — <p>/<h3> are content)
   0  D / E / F
```

Bean predicted `__nav`-shaped cases would surface here. **They surfaced on B, not F** —
and on B for the wrong reason (the alias hijack), not because the child genuinely
carries a block identity. The one real F-shaped case in the corpus is the tabs
`__nav`, which carries `border-bottom` + `gap` — and on the current DB both land on
`sgs/tabs`, so F would pass it. It is B that blocks it.

**Debug channel:** the `Verdict` dataclass already carries `failed` + `value` +
`homeless_css` per rejection, which is what produced the tables above. Per the
register, the durable channel for this is `content_gap_collector` →
`content-gaps.json`; the harness above is a throwaway that reads the same verdicts
directly. Nothing new needs inventing.

---

## What this means for the build order

The register's sequencing needs one change, forced by C2:

1. **Fix `_slot_alias_to_standalone`'s NULL filter FIRST** — a slot declaring
   `standalone_block IS NULL` must be able to WIN, so `__nav`/`__attribution`/
   `__ribbon`/`__slot` (+ 10 more tokens) resolve to "structural, no block". Without
   this, wiring `l2_qualify` regresses `__nav` relative to the gate it replaces.
   This is also the fix for register acceptance item 6.
2. **Re-measure the TRANSFER half is lossless** (the outstanding half of Q2).
3. **TASK 0** — the realistic tabs fixture. The existing one is 29 lines and renders
   broken; it is also the only thing that can prove acceptance items 2 and 5.
4. **Then** wire `l2_qualify` at the two call sites, deleting
   `_sole_passthrough_child`.
5. `__panel` is a **separate, data-only** fix (the `panel` slot's seeded
   `standalone_block='sgs/info-box'`), not part of the NULL-filter change.

Steps 1 and 2 are independent of each other and of step 3.
