---
doc_type: design
title: "Capability routing doctrine — how any capability attaches to a block, and how we verify it did"
status: PART 9 ROLLOUT SHIPPED 2026-08-11 (later session) — shared helper, opt-out flag, 7 dead
  declarations removed, 6 blocks converted (before-after/team-member/testimonial-slider/gallery/
  card-grid/product-card), live-verified on the canary. Commits on `main`: `2759340d`/`11fd1a7f`/
  `cba34778`/`6b17d99b`. Full record: `decisions.md` D585, `.claude/LEDGER.md`. Still open: the
  Part 6 automated effect-verification gate (never built — this was a manual sweep); `testimonial`/
  `image-sequence` (real crop scenario, needs its own per-item design decision first); Part 4's
  multi-image item-schema extension; Part 7's Phase 2.2 native-supports census. Council-validated
  2026-08-11 (5 raters + 3 external research streams) before any of the above was built.
date: 2026-08-11
supersedes: "spec-35-media-positioning-standard-design.md (b202f965) — same session, narrower framing, FOUR factual errors corrected here"
---

> ⚠ **Status line correction (2026-08-11, later session still):** "the Part 6 automated
> effect-verification gate (never built)" is now only true for `imageControls` specifically. A first
> instance of that gate class shipped same day for a DIFFERENT capability —
> `scripts/surveys/survey-background-colour-support.py --check`, wired into `prebuild`, verifies
> native `color.background`/`gradients` support is both complete and actually rendered (not just
> declared). Full record: `go-track-1b-playful-hamster.md` Phase 4 "Background, part 2". The
> `imageControls`-specific gate this doctrine originally scoped is still not built.

> ✅ **SECOND CORRECTION — 2026-08-17 completion audit. The `imageControls` gate IS now built, one day
> after the line above was written.** `plugins/sgs-blocks/scripts/surveys/check-image-controls-support.py`
> shipped 2026-08-12 (`ceec53b3`, "feat(gates): imageControls effect-verification gate"), carries the
> full `--survey`/`--check`/`--self-test` triad, and is wired into `prebuild` plus a standalone
> `npm run check:image-controls-support`. **Nothing under Part 6 remains "never built" for its original
> target.**
>
> ⚠ **But read the wiring, not just the presence:** it is wired as
> `(python scripts/surveys/check-image-controls-support.py --check || echo [ADVISORY] …)` — the `||`
> absorbs its exit 1, so it **cannot fail the build**. Deliberate at introduction (this project's own
> doctrine says never gate on the run that introduces a gate), and the promotion trigger is unchanged:
> fix or remove `sgs/image-sequence`'s dead `imageControls` declaration, then flip it to blocking.
> Evidence: `.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md`.

> ✅ **THIRD CORRECTION — 2026-09-04 session close-out audit. All four items this doc's `status`
> line still calls open are now closed. Read each individually — they closed in different ways,
> not by one sweep:**
>
> 1. **Part 6 gate promotion (the `||` above).** STALE — the `||`-wrapped `prebuild` chain it
>    describes no longer exists. The 2026-08-24 `gates.json` refactor (commit `5d2ee0b17`,
>    documented in `plugins/sgs-blocks/CLAUDE.md`) moved every gate into `scripts/gates.json` +
>    `run-gates.py`, which has no advisory/`||` concept — a listed `tier:"fast"` gate fails the
>    whole `prebuild` on any non-zero exit. `surveys-check-image-controls-support` (`gates.json`
>    `order:13`, added `D585`/`ceec53b3`) is a plain hard gate today. Verified live: `--check`
>    exits 0, 0 violations. Nothing to promote.
> 2. **`testimonial`/`image-sequence` per-item design decision.** Both closed, separately:
>    `image-sequence`'s dead `imageControls` declaration carries its own removal reason directly
>    in `block.json` (2026-08-17) — the JS canvas that takes over from the SSR thumbnail always
>    centre-crops with zero configurability, so no control could ever be honoured.
>    `sgs/testimonial` turned out NOT to be the flat-array-of-N-items shape this doc's Part 4
>    assumed — it's a single instance with three fixed named media slots. All three are already
>    resolved: `avatarMedia` (object-fit atom, shipped), `workMedia` (object-fit + focal-point
>    atoms, shipped, full crop control), `orgLogo` (deliberately fixed —
>    `max-width:140px;height:auto;max-height:56px;object-fit:contain` as a component-owned
>    constant, NOT client-overridable, "a logo must never be cropped" — decided 2026-08-17,
>    **reconfirmed 2026-09-03**). No remaining build.
> 3. **Part 4's multi-image item-schema extension.** Still genuinely open — but narrower than
>    this doc's Part 4 list: `before-after` is done (a 2-named-slot block via the same atom
>    mechanism, not a true array), so the real worklist is `gallery`/`card-grid`/`trust-bar`/
>    `testimonial` [-slider, not the singular block above] plus checking `brand-strip`. Not yet
>    built as of this correction.
> 4. **Part 7 Phase 2.2 native-supports census.** DONE 2026-09-04.
>    `scripts/surveys/survey-native-supports.py` existed and self-tested (29/0) but had never
>    been run. Run and committed:
>    `reports/migrations/native-supports-census-2026-09-04.json` — 106 (block,family) pairs, 0
>    `NEEDS-INNER-ROUTING`/`ZERO-CAPABILITY`/`SKIP-STRANDED`/`UNCLEAR`. Native `supports.color` is
>    declared on 60 blocks with every sub-flag `false` (verified directly against every
>    `block.json`, not just the script's own count) — `SgsColourPanel` is the real mechanism
>    everywhere, per `plugins/sgs-blocks/CLAUDE.md`'s "Colour controls" section.
>
> **Net: only item 3 remains open**, and its real scope is 4 blocks, not the 5 this doc's Part 4
> originally named.

# Capability routing doctrine

## Context — what this is, and why it is not a media doc

The investigation started narrow: hero has two object-position controls, which do we keep? It ended
somewhere else. The universal `imageControls` extension turned out to be **functionally dead on 13
of the 15 blocks that declare it** — the editor renders a focal-point crosshair, the client drags
it, nothing happens, no error.

The interesting part is not the bug. It is that **nothing noticed for as long as it existed**,
because SGS has no rule for *how a capability should attach to a block*, and no gate that checks
whether a declared capability actually does anything. Both gaps are general. Media positioning is
just where they became visible.

⛔ **This document supersedes `spec-35-media-positioning-standard-design.md`, committed earlier the
same day.** That version was narrower (media only), and a five-rater council found **four factual
errors** in it, three of which would have caused bad edits to governing specs. The corrections are
recorded in Part 7 rather than quietly fixed, because the errors are instructive.

---

## Part 1 — The doctrine: five mechanisms, one decision procedure

Any capability in SGS attaches by exactly one of these. Today the choice is made ad hoc, which is
why the same defect recurs in different clothes.

| | Mechanism | What it is |
|---|---|---|
| **(a)** | **Native WP support** | Declared in `block.json` `supports`; with `skipSerialization` + block-owned scoped CSS when it must not land on the root |
| **(b)** | **Auto-injected universal extension** | A `render_block` filter that adds a class or custom property |
| **(c)** | **Explicitly-wired shared helper** | A shared hook/PHP function; each block passes **its own** selector. SGS's existing `TypographyControls` / `sgs_typography_css_rule` pattern |
| **(d)** | **Nested child block** | Each item is a real block owning its own attributes |
| **(e)** | **Block context** | `providesContext` / `usesContext` — a parent supplies shared values to descendant **block instances** |

⭐ **(e) is already in production in SGS** — `accordion/block.json:287-294` provides header
colour/icons to `accordion-item` (`accordion-item/block.json:78`); `container/block.json:518-525`
provides grid-item padding/background/border/shadow to its children. It was missing from the first
version of this document.

### The decision procedure

1. Does the capability apply to the block's **own root** and never need to reach a descendant?
   → **(a) native support.** Skip-serialise if it must avoid root-only landing (see Part 3).
2. Does applying it require **inferring the block's internal DOM shape**? → **disqualified from
   (b)**. If the target is the root, or derivable from the parsed block array / `block.json` / a
   class the filter itself wrote → **(b) is legitimate**.
3. Is the setting owned by one block but consumed by its **own registered child block type**?
   → **(e) block context.** Cheaper than (d): no new block registration.
4. Must the behaviour attach to a **caller-chosen element** inside markup the shared code does not
   own? → **(c) explicit hook + props-spread.**
5. Does each sub-item need its **own independent attribute set, insertion order and editor
   identity** (movers, per-item toolbar, drag-reorder)? → **(d) nested block.**

**Tie-breakers.** (e) beats (d) whenever the parent→child relationship is fixed. (d) wins only when
items are genuinely independent, reorderable, addable/removable. **(e) is NOT an alternative to (d)
for per-item data** — see Part 4.

---

## Part 2 — When auto-injection is legitimate

Core **uses** `render_block` injection heavily — `wp_render_layout_support_flag()` and
`WP_Duotone::render_duotone_support()` are both such filters. Auto-injection is not intrinsically
wrong. The difference is that core never *guesses*: where it advances past the outermost tag it
matches a class captured from the block's own parsed `innerContent`. It is **reading**, not
assuming. And it uses `WP_HTML_Tag_Processor`, never regex.

> ### THE RULE
> **Auto-injection is correct when the filter can identify its target from information it
> legitimately owns. It is wrong when it must infer the block's internal DOM shape.**

### The tests (corrected — the first version had two broken tests)

| # | Test |
|---|---|
| **1** | Target is the **root tag**, or derivable from `$block` / declared metadata — never "probably the first `<img>`". **And** the CSS consuming the injected class/property must be a uniform cascade rule (root, or inherited-descendant) — never a selector assuming one specific inner DOM shape (`> img`, `figure > img`) |
| **2** | Behaviour is **uniform across every block** it applies to — no per-block internal-structure knowledge |
| **3** | Payload is a **class, custom property, or suppression** — NOT new structural markup (a wrapping element, an inserted sibling node) |
| **4a** | *(permitted)* Bounded regex may be used to locate a known-safe `<style>`/`<script>` boundary |
| **4b** | *(gating)* All class/attribute **mutation** on the found tag uses `WP_HTML_Tag_Processor` |

⛔ **Corrections from the council:**
- The old test 2 ("payload is a class or custom property, not computed geometry") **never
  independently failed anything** — every injector emits custom properties, and
  `--sgs-object-position` is literally a custom property carrying computed geometry. It was fully
  subsumed by tests 1 and 3. Its real intent — *the consuming CSS must not assume DOM shape* — has
  been folded into test 1, where it belongs.
- The old test 4 disqualified **12 of 14** injectors, including three the document then recommended
  KEEPING. "All four must hold" contradicted its own verdicts. Split into 4a/4b resolves it: bounded
  boundary-finding regex is fine; mutation must use the Tag Processor.

### The census — 14 injectors, not 7

The first version examined seven. There are fourteen `render_block`-family injectors.

| Extension | Verdict |
|---|---|
| `device-visibility.php:170-201` | **PASS** — pure `WP_HTML_Tag_Processor`, root-scoped, uniform |
| `parallax.php:91-105,113-117`, `animation-attributes.php:236-247` | **PASS** — bounded regex only to find the `<style>` offset; Tag Processor does the mutation (4a/4b satisfied) |
| `hover-effects.php:341-362` | **FAILS 4b** — class injection is plain `preg_replace`. Separately **fails test 3**: the block-link overlay is inserted via `strrpos()` + `substr_replace()` as new `<a>` markup |
| `custom-css.php:48-53` | **FAILS 4b** (plain `preg_replace`, not the Tag Processor) — but ⛔ **NOT BROKEN. Corrected 2026-08-11 after investigation.** An earlier draft called this "a live latent defect of the same class as image-controls". **Refuted.** Its mechanism differs fundamentally from the four siblings': they match a **tag shape** (`next_tag()` / first-tag regex), which a bare `<style>` satisfies — hence their skip guard. This matches an **attribute string** (`/class="/`, limit 1). Verified: no `<style>` tag emitted anywhere in `src/` carries a `class` attribute (grep: 0 matches), and no emitted CSS contains the literal `class="`. So the leading-`<style>` failure mode is structurally impossible here, across all 25 leading-`<style>` blocks. Converting it to `WP_HTML_Tag_Processor` is **hardening, not a bug fix** — and shipping it as a fix would violate the project's own prove-the-cause rule. Route it through its own design gate if wanted |
| `image-controls.php:184-201` | **FAILS TEST 1 OUTRIGHT** — the subject of this document |
| `fx-attributes.php:660` | **PASS all.** Target = root, derived from `$block['attrs']['fx']` (legitimately owned parsed block data). Tag Processor throughout |
| `fx-cursor-field.php:219` | **PASS all.** Class on root + a prepended scoped `<style>` — the sanctioned Spec-32 pattern, not a visible DOM node. Its condition reads a data attribute `fx-attributes.php` wrote on that same root — owned, not inferred |
| `fx-shape-routes.php:376-402`, `fx-path-routes.php:323-346` | **FAIL test 3 as originally written — but EXEMPT, see below.** Root mutation is clean (Tag Processor, and the consuming `:has(> .sgs-fx-shape-visual)` is keyed off a class the filter itself wrote). They append new `<svg>` siblings, which no class/property could substitute — GSAP's morph/motion-path plugins need real animatable geometry. ⛔ **Separately, they carry a LIVE defect — see the box below** |

⭐ **ALL FOUR carry the leading-`<style>` guard**, via a shared helper `sgs_fx_root_offset()`
(`fx-attributes.php:453-464`), each call site citing the historical `sgs/container` bug. On that axis
the FX family is structurally **ahead** of `custom-css.php`.

> ### Test 3 exemption — GSAP-plugin geometry hosts (added 2026-08-11)
>
> The original test 3 was **too strict** and would have forced a pointless rewrite of a working
> system. A `render_block` injector may **append new sibling markup — never wrap, never insert
> mid-tree** — when all four hold:
> 1. the payload is consumed by a Tier-G GSAP plugin needing live SVG/DOM geometry no CSS mechanism
>    can substitute for;
> 2. the block choosing the effect is unmodified — the new node carries only the effect, never content;
> 3. positioning is out-of-flow (`position:absolute`, zero layout cost);
> 4. the injection is uniform and opt-in via a data attribute, never per-block DOM inference.
>
> `fx-shape-routes.php` and `fx-path-routes.php` qualify. **A future injector claiming this exemption
> must be re-tested against it, not assumed to inherit it.**
>
> Why this is an exemption and not a loophole: pre-baking the SVG into every one of ~28 eligible
> blocks' own `render.php`/`save.js` would multiply identical dead markup into blocks that *could*
> use FX rather than only those that *do* — a worse R-31-9 violation than one shared filter.

> ### ⛔ BLOCKER — the FX route-box defect (already measured, still open)
>
> Both `fx-shape-routes` and `fx-path-routes` rely on `:has(> .sgs-fx-shape-visual)` to give the
> appended SVG's **DOM parent** `position:relative`, so the absolutely-positioned SVG fills "the
> block's own box". But that parent is whatever contains the block instance in the page —
> `.entry-content`, or a container's shared child area — **not** the block's own box, unless the block
> happens to be that parent's only child.
>
> **`decisions.md` D435 measured this live on the canary:** a motion-path traveller outside an
> `.sgs-container` resolved its route box against `.entry-content` at **1200×7934px** — the height of
> the entire page. D435 records two CSS-only fixes attempted and **measured not to close it**. Open.
>
> `fx-shape-routes` uses the **identical** mechanism and has **never been live-verified** — same
> failure expected. This is the same "works by operator-configuration accident" shape as hero's
> background layer (Part 9): correct only while the DOM happens to cooperate.
>
> **Ranked:** BLOCKER `fx-path-routes` (proven, open) · MAJOR `fx-shape-routes` (unverified, same
> mechanism) · PASS `fx-attributes`, `fx-cursor-field`.
| `conditional-visibility.php:41-160` | **OUT OF FRAME** — it never injects; it returns `''` or the content unchanged. It *suppresses*. Recorded explicitly as not-applicable rather than silently cleared |

⛔ **Correction:** the first version cleared `hover-effects` "on mechanism" while D551 removes it on
demand. It does **not** pass on mechanism — it fails 4b and 3. The D551 removal stands regardless;
the mechanism verdict is now correct too. And **block-link is not a separate extension** — it is the
same function in the same file (`inject_hover_effects()`), so it leaves with hover-effects
mechanically. Its risk is also **not** nested `<a>` (the code deliberately appends a sibling, never
wraps, `hover-effects.php:365-372`) — it is a **duplicate tab stop**, since the overlay lands as the
last child after any genuine link inside the block.

---

## Part 3 — ⛔ The Block Selectors API is NOT a routing option (verified)

The obvious-looking wrong answer, recorded before someone reaches for it.

The `selectors` key in `block.json` (WP 6.3) routes **Global Styles / theme.json CSS only**. It does
**not** reroute an individual block instance's support styles.

**Verified by exhaustive census.** `wp_get_block_css_selector()`
(`wp-includes/global-styles-and-settings.php:504`) has exactly six callers repo-wide:
`class-wp-theme-json.php`, `global-styles-and-settings.php`, `block-supports/settings.php:108`
(block-level preset *variables* only), `class-wp-duotone.php:985,992`, `block-supports/states.php:597`
(WP 7.1), and its own test. The block-support functions never see it — `wp_apply_colors_support()`
ends at `colors.php:138-145` building a plain attribute array; same in `typography.php:251-258`,
`border.php:127-134`, `spacing.php:58`, `dimensions.php`. Grepping those for `selector` returns zero.
Their returns are merged by `WP_Block_Supports::apply_block_supports()`
(`class-wp-block-supports.php:133-150`) into `get_block_wrapper_attributes()` — the root wrapper,
unconditionally.

Confirmed independently by the dev note
([Make Core 2023-07-17](https://make.wordpress.org/core/2023/07/17/introducing-the-block-selectors-api/)),
Aaron Robertshaw: *"Block instances, aka. individual blocks, do not use the selectors API to
manipulate the styles applied to inner elements."*

**Carve-outs:** duotone genuinely honours `selectors.filter.duotone` per-instance; WP 7.1's `states`
support adds a second such path. Neither is reachable by colour/typography/spacing/border/dimensions.
⚠ Canary is **WP 7.0.2**; 7.1 lands 19 Aug 2026 — re-check `states.php` then.

**Therefore mechanism (a) requires `__experimentalSkipSerialization` + self-application whenever a
support must reach an inner element** — already SGS's locked rule (Spec 32 / D402). The rule is
right; this is the authoritative reason for it.

---

## Part 4 — Per-item settings inside one block (the multi-image problem)

Five blocks render **N media items from ONE flat array attribute** and carry **one** block-level set
of position attributes: `gallery`, `card-grid`, `trust-bar`, `before-after`, `testimonial`. Even a
correct selector would apply one crop to every image.

⛔ **The first version recommended nesting. That was wrong as a first move**, for two independent
reasons the council and external research each found separately.

### Why nesting is not the cheap answer

`converter/resolvers/array_content.py` is ~480 lines of DB-driven multi-item matching machinery built
**for the flat-array shape**, with its own `array_item_schema` table carrying live rows for
`card-grid` (`items`/`media`) and `trust-bar` (`items`/`icon`). Its own docstring (`:34-37`) states
the nested alternative *"is a future branch; no current block uses that shape."* Converting would
need a **fourth walker exception** — Spec 31 caps it at three (R-31-3) — plus a new resolver, a DB
reshape, and re-validation of every golden fixture and Stage 11.6 computed-parity. That is the
cosmetics-phase-risks-the-cloning-engine inverted-risk trade this project already warns about.

### Why block context does not rescue it

**(e) is refuted for this specific problem.** Context propagates through the **block tree** and
carries one value per key per subtree position. There is no mechanism to hand context key N to array
index N inside a single block's own render — context has no concept of "which loop iteration."
Every real-world use of context for per-item behaviour does so by making each item an actual child
block, using context only for values *shared* by all items. So (e) is the shared-defaults layer
**on top of** (d), never a substitute for it.

### ⭐ The answer: extend the item schema, key CSS by a stable per-item UID

**PROVEN precedent.** Kadence's `iconlist` stores per-item `icon`, `color`, `background`, `border`,
`borderRadius`, `padding`, `borderWidth` **inside its flat array items**. Adding `focalPoint {x,y}`,
`objectFit` and `maxWidth` to SGS's existing `array_item_schema`-typed item objects is the same move,
additive to a pattern already in production here.

**CSS emission — one hard constraint.** Kadence's actual flat-array mechanism is per-item **inline
`style`**, which Spec 32 bans outright, so it cannot be copied as-is. And `:nth-child` keying is a
documented anti-pattern for reorderable content — index shifts on add/remove/reorder (the CSSWG added
`:nth-child(An+B of S)` precisely because of this). **The SGS-compatible route is a stable per-item
UID** written as a data attribute and matched from the block's scoped `<style>` — never index, never
nth-child, never inline.

**Supporting evidence:** Kadence's `advancedgallery` **is still flat and offers no per-item styling at
all** — our exact problem, unsolved by a competitor. And when core did nest (gallery refactor, Aug
2021 dev note), the migration was **graceful**: the legacy path kept rendering, WP 5.9 auto-transformed
on editor load with a manual "Update" button, via a deprecation + transform chain. Nothing was lost.
That is the template **if** nesting is ever chosen later.

**Ranked:**
1. **Extend the item schema + UID-keyed scoped CSS** — cheap, proven, no walker change, no DB reshape,
   Spec 32 compliant. **Do this.**
2. **Nest each item as a real child block + (e) for shared settings** — architecturally right when
   items need movers/toolbars/reorder; high blast radius. A separate, costed programme.
3. ⛔ Block context alone on a flat array — **refuted, no mechanism exists**.
4. ⛔ nth-child keying, and per-item inline style — **refuted for SGS**.

⚠ **Thin evidence, flagged honestly:** Stackable/Spectra/Otter source could not be inspected before
GitHub rate limits. "Competitors converge on nesting for rich per-item styling" rests on Kadence plus
WP core — two strong data points, not a market survey.

---

## Part 5 — Responsive declaration: the destination shape is already correct

The first version claimed SGS could get "declare once, get tiers" from the DB `modifier_suffixes`
table, modelled on Stackable's `expandAttributes()`.

⛔ **Factually wrong, twice over.**

`modifier_suffixes` is a 19-row **validation set** (`suffix, kind, notes` — `Mobile`/`breakpoint`,
`Hover`/`state`, `TL`/`corner`) with exactly one consumer, `tier_suffix.py:41`, which uses it to answer
"is this string a legitimate device tier" during the **cloning walker**. It carries no expansion
metadata and nothing editor-side reads it. It cannot do what `expandAttributes()` does. And no codegen
writing to `block.json` exists anywhere in the plugin.

**The Fact-A/Fact-B puzzle, resolved.** WordPress silently discards undeclared attributes — yet
Stackable expands at runtime. Both are true, at different layers: Stackable's expansion runs
**client-side at module-evaluation**, and its `block.json` declares **no `attributes` key at all**, so
the JS-expanded schema is the only one. Persistence is decided in the browser by the serializer
(`getCommentAttributes()`), looping over *client-registered* attributes — no dependency on `block.json`
or PHP. PHP's `WP_Block_Type::prepare_attributes_for_render()` validates and defaults known keys and
explicitly `continue`s past unknown ones, passing them through to render.

**Why SGS hits the trap and Stackable does not:** SGS blocks build `registerBlockType`'s attributes
*from* `block.json` (`metadata.attributes`, no JS override), so "declared in JS" and "declared in
block.json" are the same set. Stackable escapes only by deliberately decoupling them.

⭐ **The recommendation is to DROP the declare-once idea, not repair it.** Spectra's newest architecture
(apiVersion 3) deliberately moved **away** from minting `xTablet`/`xMobile` siblings, toward **one
attribute holding an object of tier values**, resolved at read-time by a device-fallback utility, with
custom properties + media queries rendering it. That is exactly what SGS's Spec 35 flat-to-object
migration is already doing. A serious competitor rebuilt from scratch and landed on the same
destination. **Continue the tier-object migration; do not adopt Stackable's pattern.**

For genuine runtime attribute injection, the canonical mechanism is the `register_block_type_args` /
`block_type_metadata` PHP filter — production-proven, and already used here
(`includes/extension-attrs-rest-register.php:64-79`).

⚠ **Unresolved, worth a proper pass before committing the long tail:** whether core is heading toward
fluid typography / container queries in a way that would obsolete device-tier attributes. The research
tooling returned nothing usable; this is a gap, not a finding.

---

## Part 6 — The general defect: declared but never verified

`supports.sgs.imageControls: true` is declared on 15 blocks and functionally reaches 2. Nothing
noticed, because **nothing checks effect — only declaration**. That is a *class* of bug, and it is not
confined to media.

### The register

| Declaration | Scale | Effect-checking gate? |
|---|---|---|
| `supports.sgs.imageControls` | 15 blocks | **NONE.** Proven to reach 2 |
| `hideExtensions` | per-block arrays | `check-universal-fit.js` — **WARN-ONLY** (`process.exit(0)` at 4 sites; real exit only at `:884`) |
| `block_capabilities.capability` | 300+ distinct free-text tags, ~1 per block | **NONE found** — no gate script references the table |
| `inspector_control_type` | written by `sgs-update-v2.py` | **Written, never read by any gate** (zero hits across `scripts/inspector-scan/rules/*.js`) |
| `block_composition.container_kind` | 36 of 211 rows non-NULL | Read by the converter (D152) — has a consumer |
| `blocks.variant_attr` | 5 of ~211 rows | Read by `/sgs-update` → `variant_slots` — has a consumer |

`audit-feature-parity.py` **exists** but — verified by reading it — builds a capability set from
`block_attributes`/`block_supports` DB rows and diffs it against the core-block equivalent. Pure
**declaration matching**: no rendering, no DOM. So the contract's CO-9 claim that the obligation is
*"Enforced by `audit-feature-parity.py`"* genuinely overstates.

### The rule

> **A capability declaration must be verifiable by effect, and something must verify it.**
> A flag nothing checks is a wish, not a contract.

### The gate (corrected)

Fail the build when a block declares a capability but nothing implements it. For media positioning:
declares `imageControls: true` but neither calls the shared helper **nor** satisfies the per-item
schema route **nor** delegates to a capable nested child.

⛔ **The first version's gate contradicted its own recommendation** — a block that nests media
legitimately never calls the helper in its own `render.php`, so the gate would fail correctly-converted
blocks. Three satisfying conditions, checked structurally, not by grep.

**Build it on `check-dead-controls.js`**, not from scratch: it already solves shared-component delivery
by deriving consumption from scanning the shared component + PHP rather than per-block text — the exact
false-positive that would otherwise break any block using a shared panel. ⚠ Note it **explicitly exempts
`sgs*`-prefixed extension attributes** (`:59-67`) — the precise family this gate must cover — so that
exemption is the thing to change. Ships with `--self-test` carrying positive **and** negative controls,
wired into `prebuild` **in the same commit**, then `grep package.json` to prove the wiring.

---

## Part 7 — Impact on Phases 2 and 3

### 2.1 — extensions → opt-in

**CONFIRMED, with a tightened acceptance test and a changed scope.**

- `hideExtensions` opt-in is a **block-slug allowlist** — orthogonal to the routing rule, so Part 2
  does not block the inversion.
- ⛔ **But scope changes:** `image-controls` is a *mechanism* failure. Making a broken mechanism opt-in
  still ships a broken control. 2.1 can no longer treat all extensions as one uniform inversion —
  `image-controls`, `custom-css` and `fx-shape-routes` need mechanism fixes, not just re-scoping.
- ⭐ **Acceptance test:** the plan's *"the declaration becomes the enforcement roster"* is exactly the
  declared-but-unverified trap. The derivation must ship as `check-universal-fit.js`'s **real exit
  code**, in the same commit as the inversion — otherwise the new allowlist is the same bug reborn on
  day one.

### 2.2 — native supports

**CONFIRMED by Part 3** — keep supports declared + `skipSerialization` + own the CSS is core's own
intent.

⛔ **But 2.2 is a principle with no worklist.** ~57 blocks declare `color` and ~51 declare
`__experimentalBorder` (order-of-magnitude, not exact). Under Part 3 every one of those lands on the
block **root** unless it skip-serialises. Which of them actually need inner-element routing has never
been surveyed. **2.2 needs its own census before "purge only zero-capability supports" can execute.**
That census is new work, currently unscoped.

### 3.2b / 3.3 — canonical control per property

- ⭐ **The `ContainerWrapperControls` façade is mechanism (c), not a gap.** It takes
  `attributes`+`setAttributes` wholesale and drives 29 blocks — the same shape as `useBlockProps`.
  **The fix-shape changes:** don't add a `control_owner` column trying to name one attribute per façade
  call. Recognise **"façade-owned" as its own category** — not NULL, not a named component. Keying
  single-attribute provenance onto a multi-attribute mechanism is a category error in the gate design.
- **3.3 is not racing a live false-positive gate — it is building the first one.**
  `inspector_control_type` is written by `sgs-update-v2.py` and **read by nothing**. That lowers the
  urgency and removes the "migrated blocks read non-compliant" hazard, but the façade-classification
  design is still a genuine blocker for the build.
- `extract-signatures.py:2450-2453` **already documents** why façades and panels are excluded. The
  plan's "replace the 16-name tuple with composition-shape detection" is the right direction; Part 2's
  tests are a candidate basis, and this aligns with the existing rule *detect a control by what it
  does, not its component name*.

### Sequencing

1. **2.2's census** — new, currently absent — must precede 2.2's purge.
2. **3.3's façade-classification design** must precede the 3.2b/3.3 build.
3. **2.1's derivation must flip to a real exit code in the same commit** as the inversion.
4. **Phase 1.6 (flat→object) is unaffected** — orthogonal file sets, and Part 5 **validates its
   destination shape**.
5. ⚠ **New:** audit `block_capabilities` for a live consumer **before** Phase 1.5's variant-scoping
   schema proposes another declaration column — otherwise it repeats this defect's shape before the
   first instance is fixed.

---

## Part 8 — Corrections to the governing docs (line numbers council-verified)

⛔ **Three claims from the first version have been REMOVED as wrong.** They are listed here so nobody
re-derives them.

### ❌ WITHDRAWN — do not act on these

| Withdrawn claim | Why |
|---|---|
| *"Spec 35 contains, at `:210-213`, the fact that falsifies its own BUILT/DONE claim"* | **Unsupported logical leap.** The naked-mode note (Part D5, 2026-08-07, and it starts at `:211` not `:210`) is about CSS **tier-selector construction** for per-device art-direction swaps. The BUILT/DONE claim (Part I/M, 2026-07-28) is about control completeness. Different subsystems, different dates. Nothing says FocalPointPicker fails there. An edit on this basis would invent a contradiction |
| *"BUILT/DONE also appears at `:372` and `:496-500`"* | **Both citations miss.** `:372` is an unstatused Part-J roadmap bullet with no status marker. "BUILD status: COMPLETE" is at **`:466`**; `:496-500` is unrelated Part-K gate evidence |
| *"The flat-to-object doc's writer census misses `extensions/` by construction"* | **Refuted.** Its rule at `:248-249` explicitly covers `edit.js`, `components/` **and** `extensions/`. An edit here would "fix" a gap that does not exist |

### ✅ VERIFIED — safe to act on

**`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`**

| Line | Correction |
|---|---|
| `:352` (exact), `:475-476` | Records focal point / object-fit as **BUILT … DONE (Wave 2)**. False — reaches 2 of 15. Restate with the census. Note the *only* thing ruled not-forcible was the size dropdown, on data-availability grounds; the deeper limit is DOM-shape inference |
| `:466` | "BUILD status: COMPLETE" — same correction |
| Part H `:325-338` | `focal point → FocalPointPicker` at `:333`, but **no row for `object-fit` or `object-position`**, though Part B `:92` and Part C `:106-107` list them as table stakes. Add both |
| Part L `:393-395` | *"focal point where relevant"* and *"multi-item data is array-shaped"* are adjacent and in tension. Add Part 4's rule: positioning attributes must be **per-item** when the media attribute is an array |
| new | No rule for when auto-injection is legitimate; `hideExtensions` is opt-**out** only. Add Part 1's decision procedure + Part 2's tests |
| `:266-267`, `:487-489` | **VALIDATED** — D402's skip-serialisation + scoped-emission rule is exactly core's intent. Cite Part 3, and record the Selectors API explicitly as the obvious-looking wrong answer (the doc never mentions it — verified by grep — so nobody has erred yet) |

**`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` PART O**

| Line | Correction |
|---|---|
| §13 `:1015` | `FocalPointPicker \| 1 site` — the unheard alarm. Annotate with the census |
| CO-9 `:1330-1333` | *"Enforced by `audit-feature-parity.py`"* **overstates — verified by reading the script**: it diffs DB-declared capability sets, no rendering, no DOM. Declaration, not effect |
| §13 register `:1000-1001`, rows `:1006-1016` | `object-position` / `object-fit` **absent**, violating the register's own standard that each uncontracted shape is given a contract or recorded with a reason. Add it |
| `:483`, `:1315-1316` | Sharpest existing statement of the extension problem — but frames injection as a **visibility** problem (`inspector-scan` has no `extensionsDir`), never a **legitimacy** one. Add Part 2 |
| `:1307`, `:1511` | `image-controls.js:157` appears only as a tab-group placement defect, never a CSS-reach defect |
| §7.2 `:759-760`, §7.3 `:761-762`, §7.5 `:769-770` | Reuse-by-prop-presence has **no per-item or nested-block vocabulary**. §7.5 anchors scope to the 15 `imageControls` blocks — an unreliable denominator |
| `:305` + new | **Silent on `skipSerialization`** (grep: zero hits) while recording 27 blocks declaring native `color` and 48 `__experimentalBorder`. Under Part 3 those land on the root. Live constraint on Phase 2.2 |
| §12 `:919`, `:981` | Records three incompatible storage shapes; **zero hits for declare-once/auto-expand**. Part 5 settles the destination shape — cite it |

**`.claude/plans/archive/spec-35-flat-to-object-migration-design.md`**

| Line | Correction |
|---|---|
| `:82`, `:245-249` | **VALIDATED** — "fully flat or fully object, never blended", the same-commit writer rule, and the extension-inclusive writer census are all correct as written |
| `:98`, `:110-111` | **VALIDATED destination shape** — Part 5 confirms tier objects independently (Spectra apiVersion 3 rebuilt to the same shape). Add the citation; drop nothing |

---

## Part 9 — Media positioning: the worked example

> ⭐ **UPDATE 2026-08-11 (same day, later session) — hero's OVERLAY (not media-position) mechanism
> was found broken in a different, more basic way than anything analysed below, and is now fixed.**
> This Part 9 analysis is about `imageObjectPosition`/media crosshair positioning specifically —
> it never covered hero's colour/gradient OVERLAY (`overlayGradient`/`backgroundOverlayColour`),
> which turned out to have its own, unrelated, more severe defect: `hero/render.php` never read
> the gradient attributes AT ALL (not a conditional-DOM-shape problem like the one below — a
> flat-out missing read). Separately, a CSS specificity collision in the shared wrapper
> (`.sgs-container > *:not(.sgs-container__overlay)`) collapsed hero's overlay span to 0×0
> regardless. Both fixed; native `supports.color` was also removed from hero (it was live and
> conflicting with the overlay mechanism, not dead as assumed elsewhere in this doc). Full detail:
> `decisions.md` D581, `.claude/plans/archive/background-panel-redesign.md`. The `:not(.has-background)`
> conditional-DOM-shape fragility described just below for `.sgs-hero__bg-img`/`.sgs-hero__video-bg`
> is a SEPARATE, still-real issue — not addressed by this fix.

The original question, answered by the doctrine.

- **Background image/video (hero)** — mechanism **(c)**. ⚠ Today's apparent "it works" is
  **conditional**: `.sgs-hero__bg-img` / `.sgs-hero__video-bg` are direct children of the root only
  while no band props are set. Set `contentWidth` or band padding and the wrapper inserts
  `.sgs-container__inner` (`class-sgs-container-wrapper.php:2534,2548`), breaking the `> img` match.
  So one of the two "working" blocks works by operator-configuration accident.
- **Foreground split image (hero)** — mechanism **(c)**. Hero's own
  `imageObjectPosition`/`Tablet`/`splitImageMobileObjectPosition` (`edit.js:1099-1126`) is the control
  that actually works and is already responsive. **Upgrade it to a crosshair, keep the tiers.**
  ⛔ The original Phase 4 instruction — delete hero's box, keep the crosshair — would have deleted the
  working responsive control and kept the desktop-only one.
- **Multi-image blocks** — Part 4, option 1.
- **`decorative-image`** — its root **is** the `<img>`, so the injected class lands on the element
  itself and no selector can match. Mechanism **(c)**, trivially: it owns its one element.
- **`info-box`** — declares `imageControls: true` with **no `<img>`/`<video>`/`sgs_render_media()`
  anywhere**. Remove the dead declaration.

**The shape of (c), concretely.** Not novel here — it is the existing, Bean-mandated
`TypographyControls` / `sgs_typography_css_rule` pattern:
- **Editor:** a hook returning the control **plus props the block spreads onto its own element**. If a
  block never spreads them, the control never renders — failure becomes **loud**.
- **PHP:** `sgs_media_position_css( string $selector, array $attrs ): string` — pure, no filter, no
  injection; the block passes its own selector and echoes into its scoped `<style>`.
- **Conversion:** extract the `{x,y}` → `"X% Y%"` maths from `includes/image-controls.php:71-80`
  (clamp 0-1, ×100, round 2dp, suppress at 0.5/0.5, plus the `:108` regex re-check) into **one** shared
  function, so rounding can never drift.

This satisfies R-31-9 rather than violating it: one uniform mechanism, per-block selector — the
established pattern, not a carve-out.

### Rollout

1. Build the hook + PHP helper + the corrected gate.
2. **Convert the 2 currently-working paths FIRST** — they are the only known-good output. If the
   explicit path reproduces their rendered CSS byte-for-byte, the mechanism is proven. Converting a
   broken block first proves nothing.
3. Keep the old filter running but **skip blocks that registered explicitly**. ⚠ **No such mechanism
   exists today** — `image-controls.php:96-105` bails only on default attrs. This needs a real signal
   (e.g. a `supports.sgs` flag checked at `:55`), which is new work the first version hand-waved.
4. Convert the remaining blocks one at a time, each closed by **dragging the crosshair on the live
   canary and watching the image move**.
5. Remove `info-box`'s dead declaration.
6. **Audit `custom-css.php` and the FX family** — surfaced by this work, same defect class, never
   examined.

---

## Open questions — NOT decided

1. **Per-block label mechanism** for the shared control (a prop, or a `supports.sgs` string) — must not
   be a hardcoded per-block branch in shared code.
2. **Is core heading toward fluid typography / container queries** in a way that obsoletes device-tier
   attributes? Unresolved — the research pass returned nothing usable. Worth settling before the
   tier-object long tail.
3. **`block_capabilities`** — 300+ tags, no consumer found. Real, or fossil? (Part 7 sequencing item 5.)
4. **Whether `sgs/media` becomes the nested primitive** if option 2 is ever taken. ⚠ It currently
   **deliberately opts OUT** of `imageControls` (`media/block.json:8`), and adopting it means rebuilding
   host blocks' repeater UIs — plus a `templateLock` hazard (locked templates reapply over existing
   children).

## Verification

- Gate ships with `--self-test` (positive + negative controls), wired into `prebuild` in the same
  commit; `grep package.json` proves the wiring.
- Each converted block closed by dragging the crosshair on the **live canary**, not by reading CSS.
- The 2 known-good paths reproduce their rendered CSS **byte-for-byte** post-conversion.
- Per-block visual-diff report bound to `source_sha` (existing gate already enforces this).

## ⛔ Deploying from a worktree onto a SHARED canary — the D576 incident

**Caused by this track, 2026-08-11. Read before any verification deploy.**

To verify the gradient work I deployed from an isolated worktree — chosen deliberately, because the
main tree held ~90 staged files belonging to a concurrent session and deploying those would have
shipped someone else's unfinished work. The worktree sat at `HEAD` + my 4 files.

**The failure:** `HEAD` predated the concurrent session's 41-property migration, so the deployed
`block.json` files carried the **pre-migration schema**. WordPress then discarded every migrated
per-device attribute *before any block code ran* — the values were gone upstream, so no amount of PHP
debugging on their side could have found it. It became **D576** for them, cost real diagnostic time,
and contributed to their needing a visual-diff gate bypass (D577).

**The rule:** the canary is **shared, single, and stateful**. A worktree gives you an isolated *tree*;
it does **not** give you an isolated *deploy target*. Deploying `HEAD`+mine is not neutral — it is an
active rollback of anything committed or staged elsewhere since that `HEAD`.

Before any verification deploy while another track is live:
1. **Check whether another session is mid-flight** (`git status` for foreign staged files; file mtimes).
2. If yes, the deploy is a **cross-track action** — it needs their state included, or their agreement,
   or it waits. `--payload` scopes the *dirty gate*; it does **not** scope what the tarball overwrites.
3. If you deploy anyway, **say so to the other track immediately** — a silent schema rollback presents
   as an unrelated, unfalsifiable bug at the far end.

Sibling rule: `a-shared-db-reseed-is-a-cross-track-action`. This is the same shape, one layer down.

## Provenance

Council 2026-08-11: 5 raters (code-path trace, quote verification, SGS-architecture adversary,
rule-decidability adversary, systems generalist) + 3 external research streams. Findings that changed
this document versus its predecessor: the 5th mechanism (block context), the 14-injector census, tests
2 and 4 rewritten, Part 4 inverted from nesting to item-schema, Part 5 inverted from declare-once to
tier-objects, and three withdrawn doc-corrections.

**Sources.** Core: Block API v2 handbook; Gallery Block Refactor dev note (Aug 2021); `gutenberg#38899`;
`gutenberg#64420`; `gutenberg#39054`; `gutenberg#16471`;
[Selectors API dev note](https://make.wordpress.org/core/2023/07/17/introducing-the-block-selectors-api/);
[block-selectors handbook](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-selectors/);
[The HTML API](https://developer.wordpress.org/news/2023/09/the-html-api-process-your-tags-not-your-pain/).
Ecosystem: `gambitph/Stackable`, `stellarwp/kadence-blocks`, `brainstormforce/wp-spectra-blocks`,
`Codeinwp/otter-blocks`. ⚠ GenerateBlocks has no public repo; Kadence/Otter responsive mechanisms and
Stackable/Spectra/Otter per-item patterns were **not** verifiable before rate limits — recorded as thin
evidence, not claimed. Pattern: Fowler, *Headless Component* (2023); Dodds, prop getters.
