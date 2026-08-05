# Variant vs preset-selector — ground truth (2026-08-05)

**Scope:** read-only investigation of Bean's concern that a WP *block style variation*
(a named preset of the LOOK) and a *preset-selector attr* (e.g. `sgs/button`'s
`inheritStyle`) get conflated in the cloning pipeline. No code changed.

**Method:** file:line reads + live `sgs-framework.db` queries + four synthetic
converter runs through the real `converter.entry.convert_section` path.

---

## 0. Headline

1. **They are NOT conflated in code.** Variant detection and preset-selector
   resolution are two separate mechanisms reading two different signals, and the
   variant path is a hard no-op on `sgs/button` (it has no `blocks.variant_attr`).
2. **`preset_implications` is LIVE**, not dead — 23 rows, read by
   `converter/resolvers/preset_absence.py` via `db_lookup.preset_implications_for`,
   invoked from `css_pass.py:253`. `sgs/button` is **not** on that roster.
3. **The real defect is downstream of the conflation Bean feared:** for a cloned
   button the pipeline picks the preset and then **deliberately discards the draft's
   text + background colours**, keeps the draft's **border** colour, and **drops the
   draft's hover colours entirely** in every case. Measured below.
4. **1 block** (`sgs/nav-drawer`, 6 variants) fails the ambiguity gate. A separate,
   ungated failure mode exists: **9 declared variants across 4 blocks are invisible
   to the BEM detector** because they have no `variant_slots` row at all.

---

## 1. How variant detection works, and when

There are **two** detectors, running at two different pipeline points, on two
different signals. Both are DB-driven off the same `variant_slots` table.

### 1a. BEM detector — recognition time

`plugins/sgs-blocks/scripts/converter/services/variant_detect.py:42`
`detect_variant_for_node(node, slug)`

- Reads `blocks.variant_attr` (`db_lookup.variant_attr_for`,
  `converter/db/db_lookup.py:3034`). `None` → `(None, None)`, total no-op.
- Builds the candidate set from `variant_slots.variant_value` DISTINCT for that
  block (`variant_detect.py:37-39` → `db_lookup._variant_slots_map`,
  `db_lookup.py:3058`).
- **Discriminating signal:** root-element BEM modifiers matching
  `^sgs-<block>--([a-z0-9-]+)$` (`variant_detect.py:61`), intersected with that
  candidate set. Exactly 1 match → that variant. 0 or ≥2 → `(attr, None)`
  (leave the block default; never guess) — `variant_detect.py:66-69`.
- **When:** recognition, called from `converter/recognition.py:76` (named/composite
  branch) and `recognition.py:309` (parent-scoped re-recognition). Before any CSS
  lift or attr assembly.

> Note the coupling: `variant_slots` here is used only for its **key set**, not
> its slot payload. A variant with zero `variant_slots` rows can never be matched
> by BEM even when the draft carries the exact modifier class. See §5.

### 1b. Attr-fingerprint detector — assembly time

`converter/db/db_lookup.py:3234` `detect_variant(block_slug, populated_attrs)`,
called from `converter/services/assembly.py:306` (step 4).

- **Discriminating signal:** how many of each variant's `unique_slot`
  discriminators were actually *extracted this run* into the assembled attrs
  (`_slot_extracted`, `db_lookup.py:3215`). Strictly-highest count wins.
- Returns `None` on: no `variant_slots` rows; top score 0
  (`variant_detect_miss` trace); top-score tie (`variant_detect_tie` trace) —
  `db_lookup.py:3250-3269`.
- **When:** after content/CSS lift, at attr assembly. It **overwrites** whatever
  the BEM detector concluded, because it writes `attrs[_variant_attr] = _detected`
  unconditionally when it returns a string (`assembly.py:304-308`).

**Verdict on Bean's premise for variants:** the mechanism is clean and
DB-derived. Neither detector consults `inheritStyle`, `cardStyle`, `effectHover`,
or anything in `preset_implications`.

---

## 2. `preset_implications` — LIVE, not dead

| Question | Answer | Evidence |
|---|---|---|
| Table exists? | Yes | `sqlite_master` CREATE TABLE `preset_implications (block_slug, preset_attr, enum_value, implied_property, presence, is_neutral, created_at)` |
| Populated? | **23 rows**, seeded 2026-08-05 15:46:44 | `SELECT COUNT(*) FROM preset_implications` |
| Who writes? | `sgs-update-v2.py:1839 _populate_preset_implications`, called at `sgs-update-v2.py:778` | auto-derived from each block's `style.css` keyed on `block.json supports.sgs.presetSelectors` |
| Who READS in `converter/`? | `converter/resolvers/preset_absence.py:192` via `db_lookup.preset_implications_for` (`db_lookup.py:3082`) | invoked as `apply_preset_absence(...)` at `converter/services/css_pass.py:253` (Step 3d), result merged into the block's attrs at `css_pass.py:254-255` |

**Roster (5 blocks, 2 preset attrs):**

| block | preset_attr | enum values seeded |
|---|---|---|
| `sgs/card-grid` | `effectHover` | lift, zoom, none |
| `sgs/google-reviews` | `cardStyle` | elevated, bordered, flat |
| `sgs/info-box` | `cardStyle` | bordered, filled, subtle, flat, elevated |
| `sgs/info-box` | `effectHover` | border-accent, lift, glow, none |
| `sgs/team-member` | `cardStyle` | flat, filled, elevated, bordered |
| `sgs/testimonial` | `effectHover` | scale, lift, glow, none |

`sgs/button` has **no** `supports.sgs.presetSelectors` and **zero** rows —
`preset_absence` is a no-op for it. Confirmed by reading
`plugins/sgs-blocks/src/blocks/button/block.json` (searched full file; the only
`sgs` supports keys are `boxFamilies` and `elements`).

**Cross-check on the conflation surface:** `sgs/testimonial` is the ONLY block
carrying **both** a `variant_attr` (`variant`) and a `presetSelectors` attr
(`effectHover`). They do not collide: the variant detector only matches modifiers
whose token is in `{classic-card, pull-quote-editorial, rating-led,
avatar-spotlight, corporate-logo, case-study-media}` (from `variant_slots`), and
`effectHover` is resolved from *collected CSS declarations*, never from a BEM
modifier (`preset_absence.py`, driven by `base_decls`/`state_decls` at
`css_pass.py:253`). Two disjoint signals.

---

## 3. `sgs/button` — what it actually is, and what a clone does

### 3a. Its style-preset attrs

`plugins/sgs-blocks/src/blocks/button/block.json`:

- `inheritStyle` — `type: string`, `default: "primary"`, `enum: [primary, secondary, outline, custom]`. This is the ONE style-preset attr.
- `variations[]` — three **WP editor block variations** (`primary`/`secondary`/`outline`), each `isActive: ["inheritStyle"]` and setting only `attributes.inheritStyle`. These are editor-inserter entries, **not** `supports.sgs.variants`; `/sgs-update` does not read them into `blocks.variant_attr` (confirmed: `sgs/button` is absent from the 5-row `variant_attr` result set).

**So `sgs/button` has no block-variant identity at all in the pipeline's sense.**
Bean's "it can get treated as a block variant" is **not** what happens —
`variant_attr_for('sgs/button')` returns `None` and both detectors short-circuit.

### 3b. What each preset implies (CSS)

`plugins/sgs-blocks/src/blocks/button/style.css:84-118`. Each
`.sgs-button--{preset}` rule sets **seven CSS custom properties only** — never a
property declaration:

`--sgs-btn-color`, `--sgs-btn-bg`, `--sgs-btn-border`,
`--sgs-btn-color-hover`, `--sgs-btn-bg-hover`, `--sgs-btn-border-hover`,
`--sgs-btn-transform-hover`

each as `var(--wp--custom--button-presets--{preset}--{role}, <framework fallback>)`.
The base `.sgs-button` rule (`style.css:16-47`) *consumes* those vars. Hover is a
stylesheet `:hover` rule (`style.css:65-81`) that inline styling cannot express.

Net: **a preset's implied CSS is entirely the per-client `buttonPresets` tokens
from `theme-snapshot.json` (Spec 33)** — not any value from the draft.

### 3c. How the converter sets it

`converter/services/assembly.py` step 5 (lines ~315-335):
gated on the block declaring a **string** `inheritStyle` (distinguishing the
button's enum from the boolean `inheritStyle` on text/heading/quote), it calls
`db_lookup.preset_style_for_element(node_classes, slug)` (`db_lookup.py:3500`),
which matches the element's own BEM `--modifier` against
`inherit_style_presets()` (`db_lookup.py:3487`, derived from
`slots.standalone_block_default_attrs`) plus the slots alias channel
(`--ghost` → `outline`).

Fallback UX-Q2 / D279 (`assembly.py:336-356`): if no modifier resolved **and** the
element carries no `sgs-button*` class of its own, set `inheritStyle: "custom"`
so a bare cloned `<a>` isn't forced to a primary look.

Then **steps 5b and 6** (`assembly.py:359-395`) strip the draft's lifted colour
when a preset was resolved:
- step 5b pops `style.color.text` **and** `style.color.background`;
- step 6 pops `style.color.background` again (redundant with 5b).

### 3d. Measured behaviour — real converter runs

Ran `converter.entry.convert_section` on synthetic sections. Emitted block
comments verbatim:

| case | draft `<a>` classes | draft CSS | emitted attrs |
|---|---|---|---|
| A | `sgs-button sgs-button--primary` | bg `#E4572E`, colour `#FFFFFF`, border-color `#E4572E`, radius 4px, `:hover` bg `#B33F1E` | `{"colourBorder":"#E4572E","inheritStyle":"primary","label":"Go","style":{"border":{"radius":"4px"}},"url":"/x"}` |
| B | `sgs-button sgs-button--primary` | (none) | `{"inheritStyle":"primary","label":"Go","url":"/x"}` |
| C | `sgs-button sgs-button--naked` | bg `#123456`, colour `#ABCDEF` | `{"label":"Go","style":{"color":{"background":"#123456","text":"#ABCDEF"}},"url":"/x"}` |
| D | *(bare `<a>`, no class)* | (none) | `{"inheritStyle":"custom","label":"Go","url":"/x"}` |
| E | `sgs-button--naked` | base + `:hover` colours | `{"label":"Go","style":{"color":{"background":"#123456","text":"#ABCDEF"}},"url":"/x"}` |
| F | `sgs-button--primary` | base + `:hover` colours | `{"inheritStyle":"primary","label":"Go","url":"/x"}` |

**Answer to "(a) detect the preset, (b) copy raw CSS, or (c) both/neither":
it is (a) OR (b), decided by whether a preset modifier resolved — with a leak.**

- Preset resolved → preset set, draft text+bg **discarded** (by design, steps 5b/6),
  but draft **border colour survives** into `colourBorder` (case A).
- No preset modifier → raw CSS copied to the WP-native `style.color.*` channel,
  and `inheritStyle` is **left unset** (case C/E).

---

## 4. Quantified risk — do preset and raw values fight?

### 4a. Cascade mechanics (verified in source)

`render.php` never emits a colour *property declaration*. Non-empty `colour*`
attrs become custom-property **values** `--sgs-btn-color/bg/border(+ -hover)`
(`button/render.php:260-277`), and `style.color.*` becomes a scoped rule
`.{uid}.sgs-button { color:…; background-color:… }` via
`wp_style_engine_get_styles` (`render.php:433-451`).

- Base state: `.{uid}.sgs-button` (0,2,0) beats `.sgs-button` (0,1,0) → the draft's
  raw colour wins. **No fight; raw wins.**
- Preset var overrides vs preset class vars: both set the same vars; the
  `.{uid}` rule is more specific → raw wins. **No fight.**

### 4b. The three real defects measured

**Defect 1 — a preset button loses its draft colours to client tokens (case A/F).**
`inheritStyle:"primary"` renders `.sgs-button--primary`, which paints from
`--wp--custom--button-presets--primary--*`. The draft's `#E4572E`/`#FFFFFF` are
gone. This is only faithful if `sites/<client>/theme-snapshot.json`'s
`buttonPresets` were extracted from that same draft. **The preset path silently
delegates button fidelity to the Spec-33 snapshot.**

**Defect 2 — partial strip: border colour is NOT stripped (case A).**
Steps 5b/6 pop only `style.color.text`/`.background`. `colourBorder` was lifted
via `block_attributes` routing (`border-color`/`wrapper`, confirmed by DB query)
and survives into the emit → `--sgs-btn-border:#E4572E`. So a preset button
paints **client-token background + text with a draft-hex border ring**. If the
client's primary token is not `#E4572E`, that is a visible mismatch. This is
an asymmetry between the two lift channels, not an intended carve-out.

**Defect 3 — hover colour is dropped for EVERY button, preset or not (cases E, F).**
`colourTextHover`/`colourBackgroundHover` carry routing rows
(`css_state='hover'`) yet neither case emitted them. Consequences:
- Preset button: hover paints the client's `--…--{preset}--hover-*` tokens.
- **Non-preset button (case C/E) is worse:** `inheritStyle` is left unset, so
  `render.php:26` falls through to the block.json default `"primary"` and
  `render.php:615-617` emits `.sgs-button--primary` anyway. Base state is
  correct (the `.{uid}` rule wins) but **on hover the button jumps to the
  client's primary hover tokens** — a colour the draft never had. A draft button
  cloned with explicit colours and an explicit hover will change to an unrelated
  brand colour on mouse-over.
  - Specificity note: `.sgs-button:hover` is (0,2,0) and `.{uid}.sgs-button` is
    also (0,2,0), so even a hypothetical base-only override would tie and be
    decided by source order. **UNVERIFIED** which rule lands later live; not
    load-bearing for the finding above, since no hover value is emitted at all.

**Conversely, "preset set but elements NOT auto-set" (Bean's second half):**
that is exactly the *designed* state — steps 5b/6 make it so deliberately. What
renders is the client's token look, which is correct only under the Spec-33
snapshot assumption. Defects 2 and 3 are where the design is not held
consistently.

---

## 5. Ambiguous / empty variant discriminators — measured

### 5a. The gate's own verdict

Executed `plugins/sgs-blocks/scripts/db-consistency/check_variants.py::run`
against the live DB:

```
VIOLATIONS: 1
 - sgs/nav-drawer: variants ['anchored-card-stack','centred-statement',
   'editorial-ghost-list','solid-brand-light','split-zone-serif',
   'two-column-editorial'] share the same discriminator signature —
   empty (no discriminating attrs at all).
```

**Count of blocks with colliding/empty-shared discriminators: 1 of 5
variant-bearing blocks (6 variants affected).** No other block collides. The
known baselined finding is the whole population under this rule.

### 5b. An UNGATED second failure mode (BEM detector blind spots)

The gate permits exactly one empty-signature variant per block (the intentional
fallback). But `detect_variant_for_node` (§1a) builds its candidate set from
`variant_slots` rows only — so **any variant with zero rows is unmatchable by BEM
even when the draft carries the exact modifier class.**

Declared roster (`block_attributes.enum_values`) vs `variant_slots` coverage:

| block | declared | in `variant_slots` | unmatchable by BEM | attr default |
|---|---|---|---|---|
| `sgs/hero` | standard, split, video, svg-animated | 4 | **0** | `standard` |
| `sgs/product-card` | standard, trial, featured | 2 | 1 — `standard` | `standard` (harmless) |
| `sgs/trust-bar` | icon-circle, text-only, image-badge | 2 | 1 — `text-only` | `icon-circle` (**harmful**) |
| `sgs/testimonial` | `""` + 7 named | 6 | 1 — `minimal-quote` | `""` |
| `sgs/nav-drawer` | `""` + 7 named | 1 | 6 — all but `floating-capped-card` | `""` |

**9 named variants across 4 blocks are BEM-unmatchable.** Of those, only
`product-card/standard` is benign (it equals the attr default). A draft carrying
`sgs-trust-bar--text-only` will clone as `icon-circle`; a draft carrying any of
the six nav-drawer looks clones to the empty default.

---

## 6. Conflation points (the actual list)

1. **None between block-variant and preset-selector.** Separate tables
   (`variant_slots` vs `preset_implications`), separate signals (root BEM
   modifier / lifted attr fingerprint vs collected CSS declarations), separate
   pipeline stages. `sgs/button` is outside both.
2. **Real conflation is between the two COLOUR LIFT CHANNELS on the button:**
   `style.color.*` (WP-native supports) is preset-stripped; `colourBorder`
   (`block_attributes` routing) is not. One block, two channels, one strip.
3. **Second-order:** `inheritStyle` unset ≠ no preset. `render.php` defaults to
   `primary` and emits the class, so a "raw CSS" cloned button still carries a
   preset's hover behaviour.
4. **`variant_slots` is doing double duty** — a discriminator payload for the
   attr-fingerprint detector AND a key roster for the BEM detector. That
   overload is why nav-drawer's 6 look-only variants are invisible to *both*.

---

## Evidence index

- `plugins/sgs-blocks/scripts/converter/services/variant_detect.py:37,42,61,66-69`
- `plugins/sgs-blocks/scripts/converter/recognition.py:76,309`
- `plugins/sgs-blocks/scripts/converter/db/db_lookup.py:3034,3058,3082,3215,3234,3250-3269,3487,3500`
- `plugins/sgs-blocks/scripts/converter/services/assembly.py:304-308, 315-335, 336-356, 359-395`
- `plugins/sgs-blocks/scripts/converter/services/css_pass.py:243-255`
- `plugins/sgs-blocks/scripts/converter/resolvers/preset_absence.py:183,192`
- `plugins/sgs-blocks/scripts/sgs-update-v2.py:536,778,1839`
- `plugins/sgs-blocks/src/blocks/button/block.json` (attributes.inheritStyle; variations[]; no `presetSelectors`)
- `plugins/sgs-blocks/src/blocks/button/style.css:16-47,65-81,84-118`
- `plugins/sgs-blocks/src/blocks/button/render.php:26,260-277,433-451,610-617`
- `plugins/sgs-blocks/scripts/db-consistency/check_variants.py` (executed)
- DB: `preset_implications` (23 rows), `variant_slots` (27 rows), `blocks.variant_attr` (5 rows), `block_attributes` colour routing for `sgs/button`
