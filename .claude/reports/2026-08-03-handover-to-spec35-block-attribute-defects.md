---
doc_type: handover
project: small-giants-wp
created: 2026-08-03
from: Track 1 — cloning pipeline routing
to: Spec 35 — block component standardisation
status: FINDINGS ONLY — nothing in this document has been fixed. All block/DB changes were reverted deliberately.
---

# Handover — block + DB attribute defects found during a routing audit

Every item was **measured**, not inferred. Each says what the defect is, what it breaks, what I
changed (almost always nothing), and why.

> ## ⛔ SCOPE NOTE — read first
> I was auditing **pipeline routing**. Everything below is a **block or DB-classification** problem
> that routing merely *exposed*. Bean ruled that block/DB standardisation belongs to Spec 35, and
> that a routing session changing the roles vocabulary or classification overrides **oversteps**.
> **All such changes made during the audit have been fully reverted** (files AND the DB rows they
> seeded). Nothing here is half-done. Verify before building on any of it — several of my own
> conclusions in this session were wrong and were corrected by measurement.

---

## 1. `sgs/media` — `.sgs-media__media` is a selector the block never renders

**The defect.** `videoPoster` and `imageUrl` both carry `derived_selector = '.sgs-media__media'`.
That class does not exist in the block. Measured two differently-shaped ways: a grep for
`sgs-media__media` across the block returns nothing, and enumerating every emitted class gives
`__img`, `__video`, `__svg`, `__caption`, `__link`.

Ground truth from the block's own source (the FR-31-2.1a authority):
- `render.php:513` paints `imageUrl` as `<img class="sgs-media__img" src>`
- `render.php:657-669` paints `videoPoster` as `poster=` on `<video class="sgs-media__video">`
  (and `:598/:627` as `data-poster=` on the iframe)

**Origin.** The selector is **synthesised from the canonical slot name** by
`behavioural-analyser/assign-canonical.py::derive_selector:377` — not read from the block. So the
value is a plausible-looking fiction rather than a measurement.

**What it breaks (measured live).** `extraction.py::run_mechanism_leaf` iterates attrs first-wins on
an `image_lifted` flag. `videoPoster` sits at catalogue index 8, `imageUrl` at 17. Executed against
a bare `<img>` recognised as `sgs/media`:

```
ScalarLift videoPoster = '<url>'      # imageUrl never reached
```

**A second symptom:** `imageAlt` declares `alt_companion_attr='imageUrl'`, so a `videoPoster` win
orphans the companion lookup and **the alt text is silently dropped**.

⭐ **BEAN'S RULING — this corrects an agent's diagnosis.** A video poster **IS an image** — it is the
thumbnail shown while the video is not playing. So `role='image-object'` is **CORRECT for both
attrs**. An agent proposed a new `video-object` role on the reasoning "it is not the src of an
`<img>`"; that reasoning confuses *where a value is painted* with *what the value is*. **The
discriminator must be something other than `role`.** The obvious candidate is the true selector
(`__img` vs `__video`), which is also the thing currently fictional.

**WHAT I CHANGED: nothing.** The `video-object` role and the selector corrections were reverted in
full — `data/roles.json`, `attr-classification-overrides.json`, both DB rows, and the tests that
asserted the fixed state. DB backup retained at
`~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-videoposter-20260803`.

**Why not:** wrong conclusion on the role, and out of scope regardless.

---

## 2. The polymorphic `media` slot collapses distinct content into one identity

`slots.slot_name='media'` carries aliases containing **both `image` and `video`** (its own note says
*"Polymorphic image/video slot"*). Every image-ish and video-ish attr on the block therefore peels
to the same `canonical_slot`, which then synthesises the same selector (defect 1).

**Measured consequence beyond defect 1:** `attr_for_slot('sgs/media','media')` also resolves by
catalogue order and returns `videoUrl`. **Six rows** on `sgs/media` share slot `media`.

**WHAT I CHANGED: nothing.** The slot vocabulary is Spec 35 territory.

---

## 3. Four background-media collision groups (Bean's design-gate surface)

`sgs/hero`, `sgs/container`, `sgs/cta-section`, `sgs/trust-bar` — attrs `backgroundImage`,
`backgroundVideo`, `bgVideo` plus `…Mobile` / `…Tablet` variants, all sharing
`canonical_slot='backgroundMedia'`, **all with `css_tier = NULL`**.

Two *different* problems are tangled here and should be separated before either is fixed:
- **image vs video** — same class as defect 1; needs a real discriminator
- **device pairs** — `backgroundImage` / `…Mobile` / `…Tablet`

⚠ **The device-pair half is now handled by routing** (see §"what I DID change"). The image-vs-video
half is not.

**WHAT I CHANGED: nothing on the data.** This is a shared high-blast-radius surface requiring
Bean's Rule 7 design-gate. An agent correctly stopped short of it.

---

## 4. `sgs/hero.splitImage` / `splitImageMobile` — a per-block cheat, Bean-ruled

Both carry `role='scalar-media'`, which the `roles` table classifies **`styling-behaviour`**. That
classification exists specifically to keep them OUT of the universal content walk so a per-block
branch (`extraction.py:592-655`, gated on `is_class_section_block`) can claim them. That branch is
the **only** code in the entire codebase that reads a `--mobile` BEM modifier and routes it to a
`*Mobile` attr (`extraction.py:652`).

`role='scalar-media'` exists on **exactly 2 rows in the whole DB**, both `sgs/hero`.

⭐ **BEAN'S RULING:** this is a cheat that violates universality — one block, one bespoke role, one
bespoke branch. `sgs/container` already has a per-device background-image concept covering the same
need generically (though its mobile picker is not settable in the editor). The standard should be a
**responsive override toggle on every attribute including content**, excluding only things it cannot
apply to (visibility conditions and similar advanced controls).

**WHAT I CHANGED: nothing.** Reclassifying those two rows to a content-bearing role is the step that
lets the new tier axis absorb them — but it moves attrs between routing worlds and deserves its own
negative-controlled change. **Flagging it as the single highest-value Spec 35 item for cloning.**

---

## 5. `role` is NULL on 65.5% of attrs — and it is causing a LIVE VISUAL DEFECT

**Measured:** of 207 attrs whose `css_property` is a colour property, **106 across 34 blocks have
`role IS NULL`**. Uniformly NULL — not a mix. (A uniform NULL is a *seeding omission*; a mixed set
would be a *classification* problem. Different fixes.)

**What it breaks.** `converter/resolvers/styling_content.py:~437` calls the colour resolver **only**
when `role == 'color'`. With `role=None` the value falls through and the draft's raw `var(--primary)`
is written verbatim. `--primary` is draft-local and undefined on the WP page → CSS
guaranteed-invalid → `border-color: var(--sgs-btn-border, transparent)` takes the **transparent**
fallback.

**Live on the canary:** the hero secondary button, the hero *primary* button and the brand button all
render with no border. Hover borders are dead on every affected button. The preset chain
(`--wp--preset--color--primary`) was already correct — **the emitted override shadows a correct
value.**

**Fix shape (executed, not guessed):** with the palette loaded,
`extract_token_or_hex('var(--primary)')` returns `primary`. So seeding `role='color'` where
`css_property` is a colour property genuinely resolves.

⚠ **Do NOT "fix" this by deleting the override.** It appears to work for `var(--primary)` only
because both presets default to the same colour. For the brand button's `var(--border)` the outline
preset defaults to `border-subtle` — deleting there silently substitutes a **different colour** that
looks fine.

**WHAT I CHANGED: nothing.** 106 rows across 34 blocks is a Spec 35 seeding job, and it wants a
converter-side assertion alongside it (see §"recommended gate").

---

## 6. `sgs/business-info` — two booleans mis-roled as text content

`linkPhone` and `linkEmail` are **boolean** attrs carrying `role='text-content'`. Different root
cause from the others. **WHAT I CHANGED: nothing** — bundling it would have violated
one-change-at-a-time.

---

## 7. `sgs/team-member` — legacy duplicate with no legacy marker

`memberMedia` and `photo` share `derived_selector='.sgs-team-member__photo'`. `photo` is **legacy**:
`render.php:56` reads *"prefer memberMedia, fall back to legacy photo"*, and `edit.js:232` hydrates
the same way. They differ on `canonical_slot`, so they are technically distinguishable — **not a
defect**.

**But** the converter's leaf loop is first-wins on catalogue order, so if `photo` were ordered first
a clone would write the **deprecated** attr. There is no DB fact marking an attr as legacy.

**WHAT I CHANGED: nothing.** A `legacy`/`superseded_by` flag is a schema decision.

---

## 8. `sgs/media` has `emit_shape` NULL on every attribute

All six of its content-bearing attrs (`videoUrl`, `videoPoster`, `imageUrl`, `imageAlt`, `caption`,
`linkUrl`) have `emit_shape = NULL` — **six of the eight unseeded content rows in the whole DB sit on
this one block**.

Also: `converter/walk.py:413-427` contains a branch for exactly this case whose comment claims it is
*"unreachable today (139/139 seeded)"*. **It is reachable.** `sgs/media` disproves the comment.

**WHAT I CHANGED: nothing.**

---

## 9. FR-31-2.1a is still live and its replacement channel is empty

`behavioural-analyser/assign-canonical.py::_ATTR_NAME_RULES` derives `role` from an attribute-**name**
regex — the violation Spec 31 documents as known-open. Its prescribed fix channel
`supports.sgs.attrRoles` is declared by **0 of 84 block.json files**, so the sequenced closure has
not begun.

Two further name-regex fallbacks survive *inside* the classifier that produces the supposedly
declarative columns: `_classify_css_layer` and a `Tablet$`/`Mobile$` tier regex. **41 `css_layer`
rows sit on blocks that declare no layer at all**, so those can only be name-derived.

⚠ **`css-property-classifications.json` records no per-field provenance**, so "is this value
declarative or name-guessed?" is currently unanswerable by query. Adding a `source` key per field
and re-running the classifier would make it answerable forever. **Cheap, high leverage.**

**WHAT I CHANGED: nothing.**

---

## 10. Denominator warning — for whoever measures seeding coverage next

An audit in this session reported the DB as "starved across every routing axis". **That was wrong**
— it divided by ALL attribute rows instead of the rows that can legitimately carry each value.
Corrected, against eligible populations:

| Column | Naive | **Eligible coverage** |
|---|---|---|
| `container_kind` | 40% | **97.3%** (36/37 container-equivalents) |
| `variant_attr` | 6% | **100%** (5/5 blocks that have variants) |
| `emit_shape` | 4.7% | **93.5%** (116/124 content attrs) |
| `css_state` | 3.9% | **85.1%** (80/94 state siblings) |
| `accepts_allowed_blocks` | "80% missing" | NULL is **spec-defined as permissive** (FR-31-2.6 G3) |

**Content-bearing attrs carry `css_property` on 0 of 124 rows — which is correct, not starved.**

**The one genuinely-derivable gap:** **145 tier-sibling rows** whose BASE attr carries a
`css_property` but which carry neither `css_property` nor `css_tier` (e.g.
`accordion.gridTemplateColumnsTablet` where the base resolves `grid-template-columns`;
`button.fontSizeMobile` where the base resolves `font-size`). Each is mechanically derivable from its
own base row.

**Corroborating evidence this matters:** live computed-parity is **worst at mobile** (83% vs 89%
desktop), and the mobile-only excess is dominated by `line-height` (36 diffs at 375px vs 5 at 1440px)
and `font-size` (35 vs 7). Two independent measurements pointing at the same 145 rows.

---

## WHAT I *DID* CHANGE — routing only, and it stays

| File | Change |
|---|---|
| `converter/db/db_lookup.py` | `content_attr_for_element` gained a `tier` param; base resolution now **excludes tier-suffixed attrs** (name ends in a `modifier_suffixes(kind='breakpoint')` suffix AND the base name is also a declared attr); tier given but sibling absent → **loud gap, no fallback** |
| `converter/walk.py` | parses the BEM modifier, maps it case-insensitively to a tier via the same DB vocabulary, passes it through; emits a `ContentGap` on the loud-gap path |
| `converter/tests/test_content_attr_resolver.py` | 6 new tests, each proven to FAIL against pre-change code |
| `converter/tests/test_walk_registry.py` | one monkeypatch lambda signature (additive kwarg) |

**Verified:** `sgs/hero.backgroundImage` + `…Mobile` + `…Tablet` now route by tier. Negative control
proven — the pre-fix algorithm was shown to wrongly return `imageMobile` on a reversed-rowid fixture;
post-fix returns `image`. Suite: **597 passed, 1 skipped.**

**No DB writes persist from my work.** The only DB changes from today are the pipeline run's own
(+18 `attribute_gap_candidates`, +346 `recognition_log`) — normal behaviour, not an edit.

---

## RECOMMENDED GATE (for whoever fixes §5)

Pair the `role='color'` seeding with a converter-side assertion: **no emitted attribute value may
contain a `var(--X)` that is neither a `--wp--*` token nor a validated palette slug.** Today this
class of defect paints transparent and fails silently. That assertion turns it loud, and would have
caught the button borders on the first clone rather than months later.

---

## PRIORITY, IF IT HELPS

1. **§5 colour `role`** — the only item causing a *visible* live defect, on every client site.
2. **§4 `scalar-media`** — unblocks retiring a per-block cheat and a whole duplicated code path.
3. **§10's 145 tier rows** — mechanically derivable, and the best-evidenced cause of the mobile parity gap.
4. **§1 + §2 `sgs/media`** — a real content drop, but scoped to bare `<img>` drafts.
5. **§9 provenance key** — cheap, and makes every future "is this declarative?" question a query.
