# Capability coverage inventory — is motion the only family left on the floor?

**Date:** 2026-09-10
**Instrument:** ad-hoc DB queries (`sgs-db.py sql`) against `block_attributes` + verified `grep` against `plugins/sgs-blocks/scripts/converter/` (tests excluded)
**Status:** READ-ONLY measurement. No code changed.
**Reproduce:** every number below carries its query/grep inline — re-run rather than trust this snapshot (R7.2).
**Governing inputs:** `.claude/plans/cloning-pipeline-tier-migration-requirements.md` R7 (grep traps), R8 (motion method + numbers), R9 (this task), R10 (colour precondition).

---

## In one paragraph

Motion is not the only capability the pipeline leaves on the floor, but it is the worst one by a wide
margin. Running R8's "declared vs converter-writes" method across every `block_attributes.role` family
turns up a second, genuinely large gap in **colour** (confirmed independently of the parallel colour
investigation — same-size population, ~1,300 attrs) and a set of small, sharp, single-property gaps
scattered through **layout** and **visual** (align-content, justify-items, box-shadow-colour,
object-position) that would each be a same-day fix once picked up. Everything else — typography,
enum-driven controls, the box/spacing families — is genuinely well covered. **No new family of
motion's size was hiding; the two big gaps (motion, colour) were already known going in.**

⛔ Per R9: this is a per-family inventory to say *where to look next*, not a score. No aggregate
percentage appears anywhere below.

---

## 1. The family taxonomy — DB-derived, not invented here

`block_attributes.role` is an existing DB classification (also mirrored in `property_suffixes.role`,
same vocabulary) — it is the project's own family taxonomy, not something this task hardcoded. Query:

```sql
SELECT role, COUNT(*) FROM block_attributes GROUP BY role ORDER BY COUNT(*) DESC
```

`roles` table splits these into two classifications: `content-bearing` (text/image/icon content —
out of scope here, these aren't CSS-styling capabilities) and `styling-behaviour` (the CSS/paint/layout
families this inventory covers). `core`/`unclassified` and the near-empty roles (`position`,
`scalar-media`, `number-css-px`, `number-css-percent` — 1 row each) are noise, excluded from the table
below as negligible.

Two roles carry **no `css_property` at all** on any row: `boolean-visibility` (188 attrs) and
`technical` (110 attrs). These aren't CSS-routed — they're toggle/internal attrs — so "converter writes
to the CSS property" doesn't apply to them; excluded from the coverage table for that reason, not
because they were skipped.

---

## 2. Method (mirrors R8 exactly, with R7's trap already tripped and caught once)

For each family:
1. **Declared** = `COUNT(*) FROM block_attributes WHERE role='<family>'` (live scan, not a cached count).
2. **Distinct css_property tokens** the family declares (`SELECT DISTINCT css_property WHERE role=...`).
3. **Converter-write evidence** = does that literal property token (plus camelCase/underscore variants)
   appear anywhere in `scripts/converter/**/*.py` outside `tests/`? Positive-controlled first (R7):
   `max-width` → 102 hits, `gap` → 2 files, `font-size` → 6 files — the grep syntax is proven to return
   real content before any zero result is trusted.

**One trap this run hit and fixed before reporting it:** the six `*-gradient` `css_property` values
(`background-color-gradient`, `border-color-gradient`, `fill-gradient`, `stroke-gradient`,
`color-link-gradient`, `background-image-gradient`) all returned **zero** literal hits — which looks
exactly like R7's warning describes: a clean-looking "converter writes to nothing" that is actually
wrong. Checking for the generic token `gradient` (not the suffixed property name) found it in 11 files
including `root_supports.py`, `outer_box.py`, `styling_content.py`, `pseudo_overlay.py` — the gradient
variants are handled by the SAME mechanism as their base colour property via a generic suffix-append,
never by a literal per-property string. **Colour-gradient is therefore reported against the colour
family it rides on, not as its own zero-coverage row.** Every other zero-hit result below was
cross-checked the same way (camelCase + underscore variants) before being trusted — see §5.

---

## 3. Per-family table

| Family (role) | Declared | Distinct css_property tokens | Converter-write evidence | Gap |
|---|---|---|---|---|
| **motion** (role=`motion`, 116) + fx roster (`attr_name LIKE 'fx%'`, spans `behaviour`/`select-from-enum`/`visual`/`color`/`motion` roles) | **2,880** (`fx%`, 32 blocks) / 116 pure `role=motion` | `anim:duration/easing/preset/stagger`, `fx:duration`, `transition-duration`, `transition-timing-function` — **9 tokens, 0 reached CSS-property routing** | `anim:*`/`fx:*` are attribute-LIFT tokens (draft-authored `data-sgs-fx-*` only, per R8's FR-38-22 finding) — not routed via `css_property`. `transition`/`transition-duration`/`transition-timing-function`: **0 literal hits**, and `test_outer_box_step12_properties.py:215-217` documents it explicitly — *"transition — still EXCLUDED from LIFT (F4): genuinely zero consumers"*. `preset_absence.py:47` reads `transition` only as a preset-ABSENCE detection signal, never to write a value (same pattern R8 found for `transform`). | **Largest gap, already known (R8).** Confirmed again this pass, no new info. |
| **colour** (`color` + `colour-gradient` + `colour-text`) | **1,303** (802 + 501 + 0 exact-role, `colour-text` role currently has 0 rows but is in the vocabulary) | 9 base tokens + 9 gradient variants (generic mechanism, see §2) | 7/9 base tokens referenced in converter source (`background-color` 17 files, `color` 27, `border-color` 9, `background-image` 14, `fill` 16, `stroke` 2, `outline-color` 1). **`box-shadow-color` and `color-link`: 0 hits in any variant** — 26+1=27 declared attrs (17 blocks) and 5 declared attrs (4 blocks) respectively, genuinely unrouted. | **Second-largest gap.** R10's parallel investigation reports 389/1,286 colour attrs UNRESOLVED (~30%) at the live resolution layer — this pass's population (1,303) is within 17 of R10's 1,286, so the two investigations are measuring the same set: **confirmed, not re-derived.** My property-presence method only catches the ~32 attrs with literally NO code path (box-shadow-color, color-link); R10's number is bigger because most colour properties DO have a code path but still fail to resolve for a given attr at runtime — the two numbers aren't contradictory, they're measuring different layers of the same gap (see §4). |
| **typography** | 693 | 12 tokens | Dedicated resolver `resolvers/typography.py`. 11/12 tokens referenced (`font-size` 6 files, `font-weight` 8, `letter-spacing` 4, `line-height` 6, `text-align` 11, `text-decoration` 6, `text-transform` 3, `text-wrap` 2, `column-count` 2, `font-family` 1, `font-style` 5). **`text-indent`: 0 hits** — 1 declared attr, 1 block. | Small, single-attr gap. Otherwise well covered. |
| **layout** | 603 | 31 tokens (some composite, e.g. `flex,grid-template-columns`) | Strong coverage on the high-volume tokens (`gap` 80 files, `padding` 30, `width` 49, `order` 57, `max-width` 28, `margin`+variants 35, `height` 22, `grid-template-columns` 15). **Zero-hit (verified camelCase too): `align-content`** (18 declared attrs, 18 blocks), **`justify-items`** (18 declared attrs, 18 blocks), **`outline-width`** (1 attr), **`--sgs-card-grid-columns`** (1 attr, custom-property route, unverified whether it resolves through a different generic mechanism). `justify-content` looked like a gap on the literal-string grep but the camelCase variant `justifyContent` returns 2 hits — **not** a gap; caught before reporting. | `align-content`/`justify-items` are the real find here — 36 declared attrs across 18 blocks (flex/grid alignment on both axes) with no converter reference found by any variant tried. |
| **visual** | 440 | 15 tokens | Strong coverage (`border-radius` 11, `border-width` 12, `border-style` 6, `box-shadow` 8, `object-fit` 4, `opacity` 6, `overflow` 2, background-* 2 each). **Zero-hit: `object-position`** (3 declared attrs, 2 blocks), **`box-shadow-color`** (1 attr on this role — the other 26 sit under `color` role, see above), **`fx:treatment-shadow`** (32 declared attrs, 32 blocks — motion-routed token, same non-coverage pattern as the fx roster above, not double-counted as a new finding). | `object-position` is the standalone real find; `box-shadow-color`/`fx:treatment-shadow` are already counted under colour/motion. |
| **select-from-enum** | 343 | 8 tokens | `font-size`/`height`/`width` shared with typography/layout (covered), `transform` 12 files. **Zero-hit: `clip-path,left,top`** (1 attr), **`writing-mode`** (2 attrs, 2 blocks), **`fx:preset`** (32 attrs, 32 blocks — motion-routed, already counted under motion). | Small, mostly already-counted via motion; `writing-mode` is the one standalone new find (2 attrs). |
| **styling** | 67 | 19 tokens (small, mixed) | `max-width`/`background-image`/`border-width`/`height`/`flex`/`outline-offset`/`top`/`left`/`bottom` mostly covered by shared tokens above. `anim:duration`/`anim:parallax`/`anim:trigger` — motion-routed, already counted. `text-indent` (typography role, already counted) reappears here with 4 declared attrs on this role too. | No new distinct finding beyond what motion/typography already cover. |
| **enum-mode** | 65 | 1 token (`tag`) | `tag` returns 65 file hits — **treat as an unverified/weak signal**, `tag` is a common variable name across the whole codebase and this count is almost certainly inflated by unrelated matches. Not trusted as evidence either way without a narrower re-check. | Unresolved — flag for a follow-up with a tighter grep (e.g. `sgs_tag_name`, `$attributes['tag']`), not claimed here. |
| **enum-class-probe** | 63 | 1 token (`max-width`, shared/covered) | Covered via the shared `max-width` token. | None found. |
| **css-gate** | 14 | 3 tokens | `filter` 15 files (covered), `transform` 12 files (covered, shared with select-from-enum). **`animation`: 0 hits in any variant** — 6 declared attrs on `css-gate` role + 1 on `behaviour` role = 7 total. | Small, real gap — consistent with the motion finding (the whole `animation` shorthand is absent from the converter, matching `transition`'s absence). |
| **boolean-visibility** (188) / **technical** (110) | 188 / 110 | 0 / 0 | Not CSS-routed at all (no `css_property` on any row in either family) — excluded from the coverage comparison by construction, not by oversight. | Out of scope for this inventory (not a styling-capability gap in R8/R9's sense). |

---

## 4. Colour: confirming/refreshing R10's number, without re-deriving it

R10 states Rule 31's own resolver reports **389 of 1,286 colour attributes UNRESOLVED (~30%)** and
flags that number as unmeasured/unowned going in. This pass did not re-run that resolver (that's the
parallel investigation's job, per the task brief) — but the population size lines up:

```sql
SELECT COUNT(*) FROM block_attributes WHERE role IN ('color','colour-gradient','colour-text')
-- → 1,303
```

1,303 vs R10's 1,286 is within 17 rows of the same set — strong corroboration the two investigations
are looking at the same population, not two different ones that happen to share a number. What this
pass adds on top: of that population, **only ~32 attrs (`box-shadow-color` + `color-link`, 4a) have
literally zero converter code path** — the rest of R10's ~389 unresolved must be attrs that DO have a
code path (a resolver references the property) but still fail to resolve for that specific attribute at
runtime (wrong element, wrong state, wrong tier — the kind of thing G5/G6 in this same requirements doc
already describe for the tier-shape problem). That distinction — "no code path at all" vs "code path
exists but doesn't resolve for this instance" — is worth carrying into whichever session picks up R10's
resolver work, since the fix shape differs (add a route vs debug an existing one).

---

## 5. Traps checked and closed (R7 discipline applied to every zero-hit result)

Every "0 hits" result reported above as a genuine gap was re-checked with camelCase and underscore
variants before being trusted (R7.2's discipline: a zero result is only as good as the grep that
produced it):

```
box-shadow-color / box_shadow_color / boxShadowColor        → 0/0/0
color-link / color_link / colorLink / linkColour             → 0/0/0/0
text-indent / textIndent                                     → 0/0
align-content / alignContent                                 → 0/0
justify-content / justifyContent                              → 0/2  (NOT a gap — caught)
justify-items / justifyItems                                  → 0/0
outline-width / outlineWidth                                  → 0/0
object-position / objectPosition                               → 0/0
writing-mode / writingMode                                    → 0/0
clip-path                                                      → 0
animation                                                      → 0
```

The one case this caught (`justify-content`) would have been reported as a gap on the literal-string
grep alone — the camelCase variant proved it isn't. Applying the same discipline to every other
zero-hit result increases confidence in the remaining genuine gaps (`align-content`, `justify-items`,
`box-shadow-color`, `color-link`, `text-indent`, `outline-width`, `object-position`, `writing-mode`,
`clip-path`, `animation`).

---

## 6. What this means for "is motion the only one nobody's noticed"

**No.** Two real findings beyond what R8/R10 already flagged:

1. **`align-content` + `justify-items`** — 36 declared attrs across 18 blocks (flex/grid
   cross-axis alignment), zero converter reference by any variant tried. This is a plain layout gap,
   nothing exotic — a block declares these controls, a client could set them in the editor, and cloning
   a draft that used them would silently drop the value.
2. **`animation` (the CSS shorthand, css-gate role)** — 0 hits, same non-coverage pattern as
   `transition`, confirming the gap in R8 extends beyond the `fx:`/`anim:` attribute-lift roster into
   plain CSS animation/transition properties too — i.e. even a *non*-SGS-authored draft using vanilla
   `animation:`/`transition:` CSS would not be recognised, which is exactly R8's stated "real gap."

Everything else that showed a zero-hit result on the first pass (the six `-gradient` properties) turned
out to be a false negative from the same trap R7 warns about — caught and excluded, not reported as new.

**Recommended next look, ranked by declared-attr count (not urgency — that's a separate call):**
1. Colour (`box-shadow-color`, `color-link` — 32 attrs, but the real R10 number is much bigger and sits
   at a different layer, see §4)
2. `align-content`/`justify-items` (36 attrs, 18 blocks, layout)
3. `animation`/`transition` CSS properties (7+15 attrs) — same root cause as the motion finding, likely
   the same fix session
4. `object-position`, `writing-mode`, `text-indent`, `outline-width`, `--sgs-card-grid-columns` — small,
   single-digit-attr, low-priority tidy-ups
