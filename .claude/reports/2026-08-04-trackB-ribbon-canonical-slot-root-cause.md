---
doc_type: report
title: Track B root-cause — sgs/cta-section `ribbon` attr canonical_slot='price'
created: 2026-08-04
status: FINAL (read-only investigation, no DB/file writes)
---

# Track B — `ribbon` → `canonical_slot='price'` root-cause report

All findings below are from live `SELECT`-only queries against `sgs-framework.db` and direct
file reads of the code paths that consume the data. No seeder, `/sgs-update`, or write query
was run. No file was edited.

## 1. Mechanism (PROVEN, not inferred)

**The `slots` table itself contains the defect — this is a DATA bug, not a code bug.**

```
rowid  slot_name  aliases
18     price      ["amount", "cost", "price-wrapper", "ribbon", "savings-badge"]
89     ribbon     ["price-ribbon", "plan-ribbon"]
```

`price` (rowid 18) lists `"ribbon"` as one of its own aliases. A **separate, dedicated** `ribbon`
slot also exists (rowid 89) with its own distinct aliases (`price-ribbon`, `plan-ribbon`) — but
its own canonical name, `"ribbon"`, is never reachable through the alias map because `price`'s
row is processed first and claims the term.

**Reached the exact code, not reasoned about it** — `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py`:

```python
# lines 79-114, load_slot_aliases()
cur.execute("SELECT slot_name, aliases FROM slots WHERE scope = 'element'")   # no ORDER BY
...
def _add(term, info):
    key = term.lower()
    if key not in mapping:        # <-- FIRST WRITER WINS
        mapping[key] = info
    ...
for slot_name, aliases_json in rows:
    info = {"canonical_slot": slot_name, "role": None}
    _add(slot_name, info)          # canonical name registered
    for alias in aliases:
        _add(alias, info)          # each alias registered, ONLY if not already claimed
```

With no `ORDER BY`, SQLite returns this plain table-scan in rowid order (confirmed empirically:
the query above returned rowid 18 before rowid 89, matching physical/insertion order). Processing
order is therefore: `price` (rowid 18) is loaded first → `_add("ribbon", {canonical_slot:"price"})`
succeeds because `"ribbon"` isn't in the map yet. Later, `ribbon` (rowid 89) is loaded →
`_add("ribbon", {canonical_slot:"ribbon"})` is a no-op because the key is already taken.

`resolve_canonical_slot()` (lines 264-276) is a pure `slot_map[stem.lower()]` lookup — for
`attr_name='ribbon'` on `sgs/cta-section`, `decompose_attr_name` peels no modifier/property
suffix (there is none to peel), so `stem == 'ribbon'`, and the lookup returns
`{'canonical_slot': 'price', ...}`. This is exactly the value stored in
`block_attributes.canonical_slot` for that row, confirmed live:

```
block_slug         attr_name  canonical_slot  role   derived_selector
sgs/cta-section     ribbon     price           None   .sgs-cta-section__price
```

**Root cause: `slots.aliases` row 18 (`price`) wrongly lists `"ribbon"` as an alias, and the
order-sensitive first-writer-wins resolution in `assign-canonical.py` lets that wrong claim
shadow the correct, dedicated `ribbon` slot (row 89) purely because row 18 has a lower rowid.**
This is exactly the leading hypothesis, confirmed by reaching the code path and the exact rows —
not inferred.

## 2. Class size — expected vs actual

**Expectation stated before running the query:** given the ribbon case was found ad hoc and the
`slots` table has on the order of a few dozen element-scope rows, I expected a **handful of
cross-slot alias collisions system-wide (my working guess: 5–15)**, most of which would be
latent (no live attribute currently uses the shadowed term).

**Method:** a self-join finding every alias in every `slots` row that equals another slot's own
`slot_name` (a case-insensitive "an alias claims a term that is also someone else's canonical
name" collision):

```sql
SELECT s1.slot_name AS owner_slot, s1.rowid AS owner_rowid, je.value AS collided_alias,
       s2.slot_name AS shadowed_slot, s2.rowid AS shadowed_rowid
FROM slots s1
JOIN json_each(s1.aliases) je
JOIN slots s2 ON s2.scope='element' AND lower(s2.slot_name)=lower(je.value) AND s2.rowid!=s1.rowid
WHERE s1.scope='element'
ORDER BY s1.rowid
```

**Actual: 9 raw collisions**, all with `owner_rowid < shadowed_rowid` (i.e. every one of them is
a *live* shadow under the same first-writer-wins mechanism, not just an accidental symmetric
name clash):

| owner_slot (wins) | collided term | shadowed_slot (loses) |
|---|---|---|
| text (4) | attribution | attribution (104) |
| text (4) | caption | caption (8) |
| items (12) | nav | nav (85) |
| items (12) | social | social (84) |
| price (18) | ribbon | ribbon (89) |
| card (51) | review | review (83) |
| card (51) | slot | slot (88) |
| card (51) | step | step (87) |
| bar (77) | progress | progress (86) |

I then scoped to `sgs/%` and checked which of these 9 collided terms is actually used as an
`attr_name` (or its stem) on a real `sgs/*` block — because a collision only matters if some
attribute actually resolves through it:

```sql
SELECT block_slug, attr_name, canonical_slot, role
FROM block_attributes
WHERE block_slug LIKE 'sgs/%'
AND lower(attr_name) IN ('attribution','caption','nav','social','ribbon','review','slot','step','progress')
```

**4 hits**, all `sgs/%`-scoped as required:

| block_slug | attr_name | canonical_slot (stored) | Correct per structural evidence? |
|---|---|---|---|
| sgs/quote | attribution | attribution | **Correct — already patched** (see below) |
| sgs/media | caption | text | **WRONG** — should be `caption` |
| sgs/cta-section | ribbon | price | **WRONG** — should be `ribbon` (our defect) |
| sgs/form-field-number | step | card | **WRONG** — see caveat below |

`sgs/quote`'s `attribution` is NOT actually broken today: `plugins/sgs-blocks/scripts/attr-classification-overrides.json`
(the 175-entry hand-authored override layer, line ~1174) carries an explicit
`{"slug":"sgs/quote","attr":"attribution","fields":{"canonical_slot":"attribution", ...}}`
entry that forces the correct value after `assign-canonical.py` runs. This is independent
evidence the SAME bug class has bitten this project before and was worked around per-row rather
than fixed at the data source.

Verified the other two structurally (read `render.php`, not assumed):
- `plugins/sgs-blocks/src/blocks/media/render.php:412` emits
  `<figcaption class="sgs-media__caption">` — the BEM element token is literally `caption`, so
  `canonical_slot='text'` is a genuine structural mismatch (same bug class as `ribbon`).
- `plugins/sgs-blocks/src/blocks/form-field-number/render.php:21,34` — `step` is the numeric
  HTML `step="1"` attribute on an `<input type=number>` (the input's increment granularity). It
  is not a content slot at all; `canonical_slot='card'` is nonsensical for it. This one may
  actually belong to a DIFFERENT class of bug (a non-content HTML attribute getting a
  canonical_slot assigned in the first place) rather than purely a "which slot wins" collision —
  flagged as uncertain, see §6.

**Expected-vs-actual: I expected 5–15 raw collisions; got 9 (mid-range, not suspiciously low).
Of those 9, I expected roughly a third to touch a live `sgs/%` attribute; got 4/9 (44%, same
order of magnitude). Of those 4, 1 is already patched, leaving 3 currently-wrong live
instances** (`sgs/media.caption`, `sgs/cta-section.ribbon`, `sgs/form-field-number.step`).

## 3. Blast radius — traced against the actual consuming code, not inferred

**This is the most important and most surprising finding: I could not confirm the "wrong slot →
draft content lands in the wrong attribute or is dropped" story for `ribbon` specifically. The
evidence points to it being currently INERT for this one attribute, by accident, via two
independent facts that happen to cancel out.**

I read every place in `plugins/sgs-blocks/scripts/converter/` that consumes
`block_attributes.canonical_slot` / `derived_selector`:

1. **`resolvers/scalar_content.py` `lift_scalar_content()`** (the universal scalar text/rating/
   media lifter) — gates on `role in ('text-content','content') and attr_type=='string'` (text),
   `role=='rating'` (stars), or `role=='image-object'` (media). `ribbon`'s stored `role` is
   `None`. The gate fails before `derived_selector` (`.sgs-cta-section__price`, wrong) is ever
   read. **No-op for this attr.**
2. **`resolvers/styling_content.py` `lift_styling_content()`** — gates on `role in ('color',
   'typography')`. Same reason, same result: **no-op**.
3. **`db/db_lookup.py` `content_attr_for_element()`** (lines ~5490-5528) — this is the actual
   primary "which attr does this draft BEM element belong to" resolver used elsewhere in the
   converter. Its tier-0 match is `canonical_slot == bem_element OR attr_name == bem_element`;
   its tier-1 fallback is `bem_element in slot_aliases.get(canonical_slot, ())`. For a draft
   element classed `sgs-cta-section__ribbon` (`bem_element='ribbon'`): tier-0 fails
   (`canonical_slot='price' != 'ribbon'`), **but tier-1 succeeds**, because `slot_aliases` here
   is built live from the *same* buggy `slots.aliases` data — `'ribbon'` is still listed as an
   alias of `'price'`, and `ribbon`'s stored `canonical_slot` IS `'price'`, so
   `'ribbon' in slot_aliases['price']` is true. **Result: `ribbon` still gets correctly matched,
   by a second bug (the alias itself) reconnecting to the first (the wrong canonical_slot).**
   I confirmed `sgs/cta-section` has no OTHER attribute whose `canonical_slot` is also `'price'`
   (checked all 84 of its attribute rows), so there is no rowid-order ambiguity between two
   competing attrs here — the accidental correctness is not itself fragile against a second
   collision *today*, though it would become fragile the moment a second price-shaped attr is
   added to `sgs/cta-section`.
4. **`db/db_lookup.py` `_slot_synonyms()`** (walker-time BEM-element recognition, used by
   `bem_element_to_canonical_slot()` in `services/recognise_helpers.py`, which drives
   `recognition.py`'s scalar/child-block recognition and `resolvers/array_content.py`'s item-field
   matching) — this is a **separate, independently-built** live map with the **opposite**
   collision behaviour: `out[canonical] = canonical` then `out[alias] = canonical` for every row,
   plain dict overwrite (**last writer wins**, not first). Because `ribbon` (rowid 89) is
   processed after `price` (rowid 18), its self-mapping `out['ribbon']='ribbon'` overwrites
   `price`'s claim. **This function resolves `'ribbon'` correctly.**
5. `sgs/pricing-table`'s `plans[].ribbonText` array field (tested in
   `converter/tests/test_array_content.py:118-141`) does not go through `canonical_slot` at all —
   it matches via `_field_owns_token()`, a direct BEM-token-prefix match (`__ribbon` → `ribbonText`
   because the normalised child token is a prefix of the normalised field key). **Unaffected by
   this bug.**

**Verdict on blast radius for `sgs/cta-section.ribbon` specifically: REFUTED as currently
harmful.** The wrong `canonical_slot='price'` / `derived_selector='.sgs-cta-section__price'`
value is written to the DB and is real, but every content/style-transfer code path I found either
(a) never reads it because it's gated on `role`, which is `NULL` for this attr, or (b) reads it
but reaches the right answer anyway via the alias-list bug reconnecting it. **This is fragile
accidental correctness, not a safe design** — it would break the moment: `role` gets set on
`ribbon` (e.g. a future `assign-canonical.py` rerun that also derives role, or a manual edit)
which would activate `lift_scalar_content()`/`lift_styling_content()` against the wrong
`.sgs-cta-section__price` selector and silently drop the draft's ribbon text (both lifters are a
strict no-op — "an attr whose selector matches nothing emits NO key" — not a misroute into
someone else's content, so the failure mode would be silent loss, not corruption).

**For the two OTHER live-and-currently-wrong instances** (`sgs/media.caption`,
`sgs/form-field-number.step`), I did not have time in this track to trace their full consumer
chain the way I did for `ribbon` — flagged as undetermined, see §6. Given `caption`'s role is
`text-content`-shaped in its own render (a `<figcaption>` element), it is plausible its wrong
`canonical_slot='text'` DOES activate `lift_scalar_content()` (role would need checking) — this
is exactly the kind of case where the wrong slot could cause real content misrouting, unlike
`ribbon`.

## 4. Proposed end condition

**Candidate condition (as given, refined with proof):**

> A `canonical_slot` assignment must be corroborated by a structural signal (what the block's
> `render.php`/`edit.js` actually does with the attribute — element class, role, or emitted tag),
> AND no alias in the `slots` table may name a term that is also another slot's own `slot_name`
> (self-collision), unless that collision is provably harmless (i.e. the colliding attribute is
> proven to route through a mechanism that does not consult the collided value).

**This is a NEW condition, not a refinement of an existing row.** I read
`.claude/plans/spec-35-inspector-DONE-checklist.md` in full — it governs the block-editor
**inspector UX** (tab layout, ToolsPanel, colour-picker alpha, LinkControl, etc.), not the DB
data-layer that produces `canonical_slot`. None of its 16 end conditions mention `slots`,
`aliases`, or `canonical_slot`. There is no sibling entry to extend.

The closer relative already in the codebase is
`plugins/sgs-blocks/scripts/converter/gates/check_content_attr_collisions.py`, which enforces a
**different but adjacent** condition: it catches two attrs **on the same block** sharing an
identical `(role, canonical_slot, derived_selector)` tuple (the tier-0/tier-1 rowid-order
ambiguity in `content_attr_for_element()`). Our bug is upstream of that: it's about the `slots`
table itself assigning the WRONG canonical_slot to a single attribute in the first place, because
one slot's alias list wrongly claims another slot's own name. **A gate for our condition would
run against the `slots` table alone** (the query in §2 above, generalised: any alias whose
lowercased value equals another `slot_name`), independent of and prior to
`check_content_attr_collisions.py`, which only sees the downstream `block_attributes` rows.

**Blind spots of the proposed condition (state explicitly):**
- It catches "alias claims another slot's own name" but NOT "alias claims another slot's OTHER
  alias" (two slots both listing, say, `"tag"` as an alias with neither slot named `tag`) — that
  variant needs a second query (`GROUP BY alias HAVING COUNT(DISTINCT slot_name) > 1` across the
  full alias set, not just against `slot_name`). I did not run that broader query in this track —
  it may surface additional collisions beyond the 9 found.
- It only checks `scope='element'` slots (matching the leading hypothesis and
  `load_slot_aliases()`'s own scope filter) — section-scope `slots` rows were not checked and
  could carry the identical defect shape independently.
- "Corroborated by a structural signal" requires reading `render.php`/`edit.js` per attribute —
  this is not mechanically derivable from the DB alone (I had to open source files by hand for
  `ribbon`, `caption`, and `step`); a fully automated gate can only catch the *alias-collision*
  half, not the *does-this-match-what-the-block-actually-does* half, without either an
  attr_type/role heuristic or human review.
- It says nothing about the SECOND bug found here — the inconsistency between
  `assign-canonical.py`'s first-writer-wins and `db_lookup.py`'s `_slot_synonyms()` last-writer-
  wins over the *same* underlying `slots` table. Two independent alias-resolution implementations
  disagreeing on collision order is itself a latent defect class this condition doesn't name.

## 5. Proposed fix (NOT applied — proposal only)

**Cause is proven for the DATA defect** (§1): `slots` row 18 (`price`) should not list
`"ribbon"` in its `aliases` JSON array — `"ribbon"` is already the dedicated slot at row 89 with
its own more specific aliases (`price-ribbon`, `plan-ribbon`).

Per this project's fix discipline for these order-sensitive tables (`property_suffixes` /
`modifier_suffixes` / `slots`): **compare-first + DELETE + ordered re-INSERT, never
`INSERT OR REPLACE`** (an UPDATE of the single `aliases` JSON value in place is equivalent here
since it's one column on one existing row — no reordering of surrounding rows is implied — but
the DELETE+re-INSERT discipline should still be followed if the fix is applied as a migration
script rather than a hand-run UPDATE, so the row's rowid/position is provably unchanged).

**Proposed change:**
```sql
-- BEFORE (rowid 18, slot_name='price'):
-- aliases = ["amount", "cost", "price-wrapper", "ribbon", "savings-badge"]

-- AFTER:
UPDATE slots
SET aliases = '["amount", "cost", "price-wrapper", "savings-badge"]'
WHERE rowid = 18 AND slot_name = 'price' AND scope = 'element';
```

Then re-run `assign-canonical.py`'s Tier-A pass (which only touches rows where
`canonical_slot IS NULL` — per its own docstring, existing non-NULL rows are never revisited
automatically) — the `ribbon` row on `sgs/cta-section` will need an explicit re-resolution, since
it already has `canonical_slot='price'` set and won't be picked up by the `WHERE canonical_slot
IS NULL` scope. The safest path matching this project's existing precedent (the `attribution`
override) is to add a matching entry to `attr-classification-overrides.json` for
`sgs/cta-section.ribbon` forcing `canonical_slot='ribbon'` + `derived_selector='.sgs-cta-section__ribbon'`,
so the fix survives a future `/sgs-update` reseed without depending on rowid ordering ever again.

**Also apply the same alias-column fix + override-or-reassignment to the two other live,
currently-wrong instances found in §2** (`sgs/media.caption`, `sgs/form-field-number.step`) —
per the project's "fix comprehensively" rule, not just the one reported instance. `step`
additionally needs a decision on whether it should carry a `canonical_slot` at all (see §6).

**Verification command** (would prove the fix, once approved and applied — NOT run in this
track):
```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "
SELECT slot_name, aliases FROM slots WHERE scope='element' AND slot_name IN ('price','ribbon')"
# expect: price's aliases no longer contains "ribbon"; ribbon's aliases unchanged.

python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "
SELECT block_slug, attr_name, canonical_slot, derived_selector
FROM block_attributes WHERE block_slug='sgs/cta-section' AND attr_name='ribbon'"
# expect: canonical_slot='ribbon', derived_selector='.sgs-cta-section__ribbon'
```
Then re-run the 9-row collision query from §2 to confirm the collision count dropped and no new
one was introduced.

## 6. What I could NOT determine

- **Whether `sgs/media.caption`'s wrong `canonical_slot='text'` is ACTIVELY causing content loss
  today** — I proved it's structurally wrong (render.php emits a `caption`-classed `<figcaption>`)
  and proved the collision mechanism, but did not trace whether `caption`'s stored `role` value
  makes it eligible for `lift_scalar_content()` (which would mean the wrong `.sgs-media__text`-shaped
  selector, if any, actively misroutes or drops draft caption text). This needs the same
  role/derived_selector/consumer trace I did for `ribbon` in §3, not done here for time.
- **Whether `sgs/form-field-number.step` should carry a `canonical_slot` at all** — it's a numeric
  HTML input attribute (`step="1"`), not draft content. It's possible the correct fix is to null
  out its `canonical_slot` entirely (it doesn't represent a content slot the cloning pipeline
  should ever populate from a draft), rather than pointing it at the `ribbon`/`step` content slot.
  I did not determine which of "wrong slot" vs "shouldn't have a slot" is the right frame — that
  needs a decision, not a query.
  - Note this may not even belong to the *same* bug class as `ribbon`/`caption` — those two are
    genuine "alias claims another slot's name" collisions on content-bearing attrs; `step` being
    a non-content HTML attribute that ended up with ANY `canonical_slot` may be a separate
    upstream gap (should `card`'s "step" alias — presumably meant for "process step" content —
    ever have matched a numeric-input `step` attr name in the first place?).
- **Whether the broader "alias claims another alias" collision variant exists** (see §4 blind
  spots) — not queried in this track; the 9-row count in §2 covers only "alias claims a
  `slot_name`", not "two slots' alias lists overlap on a shared alias term that is neither slot's
  own name."
- **Whether `content_attr_for_element()`'s tier-1 accidental-correctness for `ribbon` holds on
  EVERY block that has a `ribbon`-named or `ribbon`-aliased attr**, not just `sgs/cta-section` —
  I checked only the one block named in the defect. A broader sweep across all `sgs/%` blocks
  with any attr whose `canonical_slot='price'` would be needed to state this holds universally.
- I did not check section-scope `slots` rows (`scope != 'element'`) for the same collision shape
  — the leading hypothesis and the code (`load_slot_aliases` filters `scope='element'`) both
  scope to element-level, so this was out of scope for THIS defect, but is an open question for
  the broader condition proposed in §4.
