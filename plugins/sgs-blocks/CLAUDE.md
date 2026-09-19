# SGS Blocks — Claude Code Instructions

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/THE-MIGRATION-METHOD.md` before the 4th file edit.** A census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What matters is not only the census but that the TARGET SHAPE is settled first. See THE-MIGRATION-METHOD.md Step 3.

## What This Is

A custom Gutenberg block library (WordPress plugin) that replaces Spectra Pro. Produces clean semantic markup that reads design tokens from the SGS Theme. Per-block status: see "Per-block status" below.

Full spec: `.claude/specs/02-SGS-BLOCKS.md` (blocks) + `.claude/specs/04-SGS-FORMS.md` (forms)

## Plugin Structure

```
sgs-blocks/
├── sgs-blocks.php               # Plugin bootstrap
├── package.json                  # @wordpress/scripts + dependencies
├── webpack.config.js             # Build config
├── src/
│   ├── blocks/                   # One folder per block (block.json, edit.js, save.js, style.css, view.js)
│   ├── components/               # Shared editor components (ResponsiveControl, DesignTokenPicker, etc.)
│   ├── extensions/               # Block extensions (animation, visibility, spacing)
│   └── utils/                    # Token reader, responsive helpers
├── build/                        # Compiled output (deploy this, not src/)
└── includes/
    ├── class-sgs-blocks.php      # Main plugin class
    ├── block-categories.php      # Register SGS block categories
    ├── device-visibility.php     # Server-side render_block filter for responsive visibility
    ├── heading-anchors.php       # Auto-generates heading IDs for Table of Contents
    ├── lucide-icons.php          # Auto-generated Lucide icon library (1963 lines, exempt from limit)
    ├── render-helpers.php        # Shared colour/font-size helper functions
    ├── review-schema.php         # Schema.org review/rating output
    └── forms/                    # Form processing engine (REST API, DB, submissions)
```

## Block Pattern (Every Block Follows This)

```
block-name/
├── block.json       # Metadata, attributes, supports, scripts, styles
├── edit.js          # Editor component
├── save.js          # Static save (or null for dynamic blocks)
├── render.php       # Server-side render (dynamic blocks only)
├── editor.css       # Editor-only styles
├── style.css        # Frontend + editor styles
├── view.js          # Frontend interactivity (viewScriptModule)
└── index.js         # Block registration
```

## Block Categories

- `sgs-layout` — Container, Hero
- `sgs-content` — Info Box, Counter, Trust Bar, Card Grid, Testimonial, etc.
- `sgs-interactive` — Accordion, Testimonial Slider, WhatsApp CTA, Option Picker
- `sgs-forms` — Form, Form Step, Form Fields, Form Review

## Build Commands

```bash
npm run build         # Production (includes --experimental-modules for viewScriptModule)
npm run start         # Dev with hot reload
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
```

### Survey detectors — the census half of the script triad (Spec 35)

```bash
npm run survey:inspector-surface   # OWN vs EXTENSION vs CORE control split, all blocks
npm run survey:length              # length/unit control divergence
npm run survey:colour              # colour control divergence
npm run survey:typography          # typography control divergence
npm run survey:box                 # 4-side box + border conformance
npm run survey:responsive-shape    # TIER-vs-BOX axis conflation
npm run survey:selftest            # every survey/gate self-test in one chain
npm run audit:post-content -- <path>   # stored post_content vs current block schemas
npm run audit:element-manifest         # Spec 35 element-manifest conformance
npm run audit:placement-reach          # placement-rule reach
```

**The triad (Bean-locked):** the thing that finds every instance, the thing that fixes them and
the thing that keeps them fixed are the SAME detector — `--survey` (census, run BEFORE the design) →
`--fix` (parameterised codemod) → `--check` (the gate). **If an item touches more than ~3 blocks, the
first deliverable is the detector, not the edit.** Each phase builds its own `--fix` when it reaches
its migration.

⛔ **These are NOT in `prebuild` and must not be added to it** — they are censuses with no `--check`
mode. Putting a non-gating script in a gate chain is enforcement theatre.
⚠ **A built detector that nothing calls is the recorded failure mode of this repo. Never assume one is
reachable: run `npm run gate:list` before believing it runs.** The `prebuild` chain lives in
`scripts/gates.json` + `scripts/run-gates.py`. Every gate keeps a standalone `check:*` alias in
`package.json`, so grepping `package.json` proves only that the ALIAS exists, not that the gate runs on
a build. `npm run gate:list` prints each gate's tier and measured cost; `npm run gate:wired` proves the
pre-deploy tier is reachable.
⚠ **`survey-inspector-surface.js` counts DECLARED rows**, not DEFAULT-VISIBLE ones, and its
OWN-vs-EXTENSION split does NOT reproduce live editor measurement (its own calibration table reports
"Ordering (row-count) MATCHES live: false"; the declared:live ratio varies 1.15x–3.2x across blocks, not
constant). Only OWN *panel*-count has been verified to match live measurement, and only on a single
block. Do not quote ANY of its totals as "what the client sees" without a fresh live check.

### Grid-item defaults — which blocks qualify

`gridItem*` attrs (padding/gap/border/shadow/colour defaults for a grid's children) are
consumed by exactly **ONE** CSS rule: `.sgs-container--grid > .sgs-container` in
`src/blocks/container/style.css`. That selector paints ONLY a **direct child that itself
carries `.sgs-container`** — so a block qualifies for `gridItem*` attrs only when its own
grid cells are themselves container-wrapper-routed blocks. **`sgs/container` is the only
qualifying block.** A block whose children sit inside its own content wrapper or badge divs
(as `sgs/cta-section` and `sgs/trust-bar` do) matches none of it, so declaring `gridItem*`
attrs or mounting `GridItemDefaultsPanel` there would ship client-facing controls that paint
nothing.

⛔ **`block_composition.container_kind` (section/layout/content) is IRRELEVANT to this
qualification.** It describes the draft-layer model (Spec 31 §13.6), not what CSS a
block's own children actually match. Do not reason from `container_kind` when deciding
whether a block should carry `gridItem*` attrs — check the selector.

### A control that "doesn't work" — diff it against a block where it ALREADY works (Bean-locked)

⛔ **Do not design a fix from first principles.** Ask which blocks already have the attribute:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql   "SELECT block_slug, attr_name, css_property, css_element, css_tier
     FROM block_attributes WHERE css_property='object-fit'"
```

then read the WORKING block's `render.php` + `style.css` and compare. The DB query also surfaces
blocks a hand-written survey of "media blocks" misses (`sgs/brand-strip` `logoFit`, `sgs/trust-bar`
`badgeImageObjectFit`).

⛔ **Never weigh "this changes what the canary currently renders."** Pre-production, no content to
protect. Whether a default is RIGHT is a separate question decided on merits — what do the other
surfaces measure? — never on preserving the current page.

**The two findings that came out of it, both gated:**

1. **A shared rule at (0,1,0) silently beats a block's own `:where()` default at (0,0,0).** The atom
   stylesheet fires unconditionally, so `var( --x, initial )` overrides `sgs/media`'s own
   `:where( .sgs-media__img ){ object-fit: cover }`. A shared fallback must be the value the surfaces
   actually MEASURE (all four say `cover`), never `initial`/`unset`/`revert` — banned by
   `check-media-atom-purity.js`. A rule that loses is indistinguishable from an absent one; a rule
   that silently wins is worse.
2. **Scope per ELEMENT, not per block.** Atoms emit fixed custom-property names
   (`--sgs-media-object-fit`) because the shared stylesheet is static CSS and cannot know a prefix.
   That is only safe when each media element carries its own scope class —
   `sgs_media_element_scope_class( $uid, $prefix )` → `{uid}--{prefix}`, consumed by
   `sgs_media_element_style()`. Without it a two-element block (`sgs/before-after`) sets the same
   property twice on one scope and the second wins: the client sets before=contain, after=fill, and
   both render fill. `sgs/hero` already had the right answer from the other direction — it scopes its
   selector to `.{uid} .sgs-hero__split-media--image`. Gated in `scripts/tests/test-media-atom-parity.mjs`.

### Detector blind spots — both real

- **`check-dead-controls.js` asks "is this attribute read by the render surface?"** It
  cannot see "the attribute IS read and emits CSS custom properties that no selector ever
  matches" — that distinction is invisible to a render-corpus scan. A `gridItem*` control on a
  non-qualifying block (above) passes every gate for exactly this reason.
- **`check-duplicate-controls.js` CHECK 2 scans literal JSX control elements** in a block's
  own `edit.js`. It cannot see a duplicate writer living inside a **row OBJECT LITERAL**
  passed as a config prop — e.g. a `SgsColourPanel` `rows` array entry that writes the same
  attribute another literal JSX control also writes. A duplicate `textColour` writer in
  a `SgsColourPanel` row survives this gate.

Neither gap is closed — read them as known scope limits before trusting either gate's
"0 findings" on a new colour/grid-item-shaped change.

### Editor-canvas mirrors — the shared-wrapper pattern + 4 traps (CHECK A)

`check-editor-render-parity.js` CHECK A finds attributes a control WRITES and `render.php`
uses correctly, where the editor canvas shows nothing — the client moves a control and sees
no change. The pattern and traps below are the live guidance for any canvas mirror.

**The pattern that scales.** A shared thing is mirrorable ONCE only if it OWNS THE SELECTOR:

| Kind | Example | Owns selector? | Mirror once? |
|---|---|---|---|
| Shared **renderer** | `SGS_Container_Wrapper` | yes — markup + uid class + rule | ✅ |
| Shared **atom** | `includes/media/atoms/*` | yes — one property on a scoped class | ✅ |
| Shared **control panel** | `BackgroundPanel`, `GridItemDefaultsPanel` | no — only writes the attr | ❌ |
| Shared **value helper** | `sgs_colour_value`, `sgs_text_decls` | no — caller places the value | ❌ |

A shared CONTROL creates the illusion of a shared mechanism: `BackgroundPanel` is mounted by
several blocks, but the sharing that matters is the WRAPPER underneath, not the panel.
Shared-on-the-way-in is not shared-on-the-way-out.

Reference implementation: `svgBackgroundPreview()` in `src/utils/background-preview.js`,
adopted by the blocks that mirror an SVG background. It renders the SAME element with
the SAME class names as the frontend, so the rules already in `style.css` — which `block.json`'s
`style` field loads into the canvas as well as the front end — do all the painting, with ZERO new
CSS and no second vocabulary to drift.

**⛔ FOUR TRAPS. Each has shipped, or nearly shipped, a defect.**

1. **Enumerate attributes explicitly at the call site.** CHECK A resolves an attribute as
   canvas-reflected only when its NAME appears outside `InspectorControls`/`BlockControls`.
   Handing a preview helper `attributes` wholesale renders CORRECTLY and still reads as a
   desync. The ServerSideRender pass-through exemption matches only the bare identifier
   `attributes={ attributes }`, so `attributes={ omitNullAttributes( attributes ) }` flags every
   attribute of the block while its canvas shows real `render.php` output.
2. **A gate's scope is not the defect's scope.** `svgBackgroundPreview()` returns `className`
   as a string ARRAY; its sibling `backgroundPreview()` returns a STRING.
   `[ a, [ 'x','y' ] ].join(' ')` is `"a x,y"` — one unusable comma-joined token, so all four
   SVG classes were silently dead while the layer still rendered. **CHECK A passed throughout.**
   Read the emitted CSS; never close on green. (`check-text-gradient-companion` can pass while
   `sgs_text_decls()` emits an invalid bare `color:` for gradients.)
3. **Block CSS is LIFTED, not inline** — `wp-content/uploads/sgs-css/*.css`. Grepping page HTML
   for a rule proves NOTHING; a verification pass reported ABSENT for three working fixes
   because of exactly this. Follow the linked stylesheet.
4. **`curl` the canary with `-L`** — pages 301-redirect; without it you get an empty body and
   conclude the block did not render.

**Before wiring a canvas mirror, confirm the FRONTEND actually paints it.** A control can be
offered in a panel while `render.php` nulls its value on the very array passed to the wrapper, so
the wrapper's gate (e.g. `$has_bg_svg`) is permanently false. Mirroring a layer the page never
renders is the INVERSE of what CHECK A exists for. Check for a back door before concluding —
a helper, atom or `render_block` injector could paint it — rather than trusting a grep of the
block's own files.

### `scripts/placement-reach.py` — how far THE PLACEMENT RULE actually reaches

Implements THE PLACEMENT RULE (Spec 35, two-tier: TIER 1 = one panel per declared element;
TIER 2 = property-family panel for a `wrapper` element or any control scoped to no element) against
real `block.json` data. `python scripts/placement-reach.py [--block sgs/x] [--self-test]`. Reports
the tier-1/tier-2 split (re-run for current figures) and a **CONTESTED** list: attributes claimable by 2+ elements
per the manifest — a real manifest gap (needs an explicit `attrMap` entry), never guessed at or
silently tie-broken. Companion prebuild gate: `check-element-manifest-conformance.js` (a hard gate).

### Live motion QA — `scripts/motion-qa/` + `npm run qa:motion`

```bash
npm run qa:motion                    # all standing live probes (what the deploy runs)
npm run qa:motion:morph              # fx-morph changes SVG geometry (page 2113)
npm run qa:motion:motion-path        # motion-path re-animates on pass 2 (page 2109)
npm run qa:motion:good-by-default    # scrub/scramble/split-reveal/pin-scrub (pages 2103, 2603)
```

**Wired into `build-deploy.py` as `step_motion_qa()`** — ON by default for blocks deploys,
after `step_verify_payload()`, opt out `--skip-motion-qa`.

⛔ **NOT in `prebuild`, on purpose.** These need a LIVE canary. A network-dependent check
in a BUILD gate can only fail when the canary is merely unreachable, or warn-and-pass —
and warn-and-pass is exactly the vacuity `check-no-inline.py --live-default` already
carries (it PASSES on a disconnected machine, so a green run there proves nothing).
Post-deploy is the honest home: the canary is up by definition, and the payload gate has
just proven the live plugin IS this run's payload.

⚠ **The runner registers only the THREE probes that are standing checks with negative controls and
stable fixtures** (`PROBES` in `scripts/motion-qa/run-live-probes.mjs`). The other probes in the
directory are one-shot artefacts, runnable by hand, NOT claimed as covered. Promoting one means
giving it a fixture and a negative control first, then adding it to `PROBES`.

**LOAD-BEARING CANARY FIXTURES — the deploy gate depends on these pages:**

| Page | What it feeds |
|---|---|
| 2103 | scrub / scramble / split-reveal (good-by-default) |
| 2109 | motion-path repeat-trigger |
| 2113 | fx-morph geometry |
| 2603 | pin-scrub pin + good-by-default |
| 2740 | FR-38-31 flowing gradient, single `pastel` instance |
| 3037 | wave-gradient SIX-variant canvas split — the 0/0/0/0/1/1 proof |

All are titled `[GATE — DO NOT DELETE] …` on the canary so they survive a tidy-up.
⛔ Deleting or emptying any of them **breaks every blocks deploy** until the fixture is
rebuilt. Probes reference pages by **ID** (`?p=`), so renaming a title is safe but re-creating a
page under a new ID is not.

⚠ **Canary fixtures rot, and a probe cannot tell you which failure you have.** Every probe reports
UNANSWERED separately from a real failure — read its output rather than assuming a regression.
⛔ A fixture authored before a schema change carries the old shape (e.g. `"minHeight":"90vh"` as a
flat string where `minHeight` is a tier object), which is silently coerced to `{}` so every
spacer collapses. Never restore a trashed fixture — author fresh.

### Shared-helper adoption — `scripts/migrate-render-closures.py`

`includes/helpers-box.php` carries the shared forms of three sanitiser closures, auto-loaded via
`render-helpers.php`, with docblocks saying they replace the local `$sgs_css_length` closures. A block
`render.php` must call the shared helper, not define its own closure. This script owns that migration.

```bash
python scripts/migrate-render-closures.py --survey        # census
python scripts/migrate-render-closures.py --fix           # dry run
python scripts/migrate-render-closures.py --fix --apply   # write
python scripts/migrate-render-closures.py --check         # gate
python scripts/migrate-render-closures.py --self-test     # assertions + negative control
```

⛔ **It is a script and not `sed` for one specific reason:** several files use ALIGNED assignment
(`$sgs_css_keyword  = static function`, two spaces). A literal-space find/replace silently skips
them. The self-test asserts this case.

**The corner family is covered.** `$sgs_corner_shorthand` / `$sgs_radius_shorthand` are
CORNER-keyed (topLeft/topRight/bottomRight/bottomLeft), structurally a different function from
`sgs_box_object_shorthand()`'s top/right/bottom/left. `includes/helpers-box.php` provides the sibling
**`sgs_corner_object_shorthand()`** for them, and the script owns the family.

⛔ **The shared helper is UNTYPED on purpose — do not "tidy" it to `array`.**
`before-after/render.php` invokes it with a raw `null` (`$attributes['borderRadiusTablet'] ?? null`)
and relies on the helper's own `is_array()` guard. A typed-`array` parameter would throw TypeError
and fatal the page. The riskiest existing caller sets the signature.

**Length sanitising has its own codemod**, `scripts/migrate-length-sanitiser.py` (same
survey/fix/check/self-test shape), kept separate from the closure script because a behaviour change
stacked onto a refactor makes both unfalsifiable — it is never a mode of `migrate-render-closures.py`:

```bash
python scripts/migrate-length-sanitiser.py --survey        # census
python scripts/migrate-length-sanitiser.py --fix           # dry run
python scripts/migrate-length-sanitiser.py --fix --apply   # write
python scripts/migrate-length-sanitiser.py --check         # gate
python scripts/migrate-length-sanitiser.py --self-test     # assertions + negative controls
```

Call sites use `sgs_css_length_value()`. Two sites are deliberately EXCLUDED, named in the script's
`EXCLUDE` list, never guessed at: `testimonial`'s `quoteLineHeight` (unitless-legal — feeds
`line-height`) and `google-reviews`' `gr_pct` (a bare percentage the caller appends its own `%`
onto — preset-wrapping it would emit invalid CSS). A per-block closure corrupts a `calc()` value
(`border-top-left-radius:calc20px1vw`); the shared function emits `calc(20px + 1vw)`.
⚠ **Spec 32 §6.1(a2)'s comparison table overclaims one cell** — it says the hardened function
*resolves* `var:preset|spacing|40`; measured, it passes the value through UNCHANGED (not corrupted,
but not resolved).

### Vacuous core-function guards — `scripts/remove-vacuous-style-engine-guard.py`

A `function_exists()` check on a CORE function is only meaningful when that function landed AFTER
the plugin's declared minimum. `sgs-blocks.php` and the theme's `style.css` both declare
**"Requires at least: 6.7"**, so a guard testing for a function that floor guarantees is a false
branch never reachable on any supported install. Removal is behaviour-neutral BY CONSTRUCTION, not
by measurement.

⛔ **Verify the floor against core LOAD ORDER, not just the version number.** `style-engine.php`,
`script-modules.php` and `interactivity-api.php` are `require`d at `wp-settings.php` lines
437/450/453 — before mu-plugins (508) and plugins (582) — and core never wraps those definitions in
`function_exists`, so no bootstrap window exists in which SGS code runs and the function is absent.
The same check proves the rule DISCRIMINATES rather than being blanket: `pluggable.php` loads at
line **612, AFTER plugins**, so `wp_get_current_user` guards are REAL. Likewise the `wp_*connector*`
family is `@since 7.0` — ABOVE the floor. Both are correctly still in the tree.

```bash
python scripts/remove-vacuous-style-engine-guard.py --survey      # census
python scripts/remove-vacuous-style-engine-guard.py --fix          # dry run
python scripts/remove-vacuous-style-engine-guard.py --fix --apply  # write
python scripts/remove-vacuous-style-engine-guard.py --check        # gate
python scripts/remove-vacuous-style-engine-guard.py --self-test    # assertions + negative control
```

⛔ **There are TWO shapes and they are NOT interchangeable.** STANDALONE (the whole `if` goes, body
de-indents one tab) and COMPOUND — the dead call ANDed with a REAL condition (`&& ! empty(
$base_margin_obj )`, `! $inherit_style && …`, and one spanning multiple lines). Deleting the wrapper
on a compound guard silently drops a live condition; only the dead conjunct is removed there.
Enumerate before assuming a guard is standalone.

⛔ **`} else {` is brace-NEUTRAL, so naive depth-counting sails straight past it** to the final `}`
and lifts a body that isn't the whole story. Checking the closing line for the word "else" does NOT
work — the real close is detected structurally (a body line at the guard's own indent starting with
`}`). A guard with an `else` is REFUSED, never guessed at. The self-test asserts this.

⛔ **Deleting the `if` line outright merges phpcs alignment groups.** The guard line was a visual
separator; without it the statement above becomes adjacent to the de-indented first body line and
`Generic.Formatting.MultipleStatementAlignment` reports a new warning. The script leaves a BLANK
LINE in its place. **The fix for a merged group is a blank
line, NEVER `phpcbf`** — that realigns whole files and turns a scoped change into an unreviewable diff.

⛔ **NEVER remove a POLYFILL DEFINITION.** `if ( ! function_exists( 'x' ) ) { function x() {…} }`
is correct code that makes a file runnable outside WordPress. `helpers-css-safety.php`'s `esc_attr`
guard is exactly this — inside a CLI `--self-test` block, with `scripts/diff-gap-sanitiser.php`
requiring the file standalone. It is KEPT, and the gate exempts that shape. Before deleting any
guard, grep `scripts/` and `tests/` for the filename: several `includes/` files ARE loaded by
standalone harnesses.

⚠ **A `src/blocks/*/render.php`-only grep misses sites that live in `includes/`.** Do not trust a
figure from a convenient subset; run `--check`, which scans `src/` + `includes/` + the theme.

⚠ **The floor is PARSED from the plugin header, never hardcoded.** A lowered floor makes the
affected family load-bearing again, and the gate drops it rather than asserting a stale claim; it
fails closed if the header cannot be read. Wired into `prebuild` + `npm run check:vacuous-guards`.

### Comment-narrative detector — `scripts/extract-comment-narrative.py`

FIND-only. It never edits. Comments must explain what the code DOES, not narrate its past.

```bash
python scripts/extract-comment-narrative.py --survey --top 20   # rank by narrative DENSITY
python scripts/extract-comment-narrative.py --extract --only <slug>  # candidates + line ranges
python scripts/extract-comment-narrative.py --prohibitions      # gate-backed vs UNENFORCED
python scripts/extract-comment-narrative.py --self-test
```

⚠ **Deliberately has no `--fix`.** Measured on a pilot: only 27% of removable lines carry a
detectable marker; **the other 73% are continuation lines** of a paragraph whose first line had
one. A marker-tuned regex finds a quarter and cannot tell where to stop inside a block; a
paragraph-tuned one over-cuts into functional text. **This is also why haiku is the wrong model
for the edit** — a wrong cut deletes knowledge silently and irreversibly.

`--prohibitions` is the more valuable mode: it splits every prohibition into GATE-BACKED (the
prose names a real executable check — compress it to a pointer, the gate is the defence) and
UNENFORCED (nothing checks it — keep verbatim, or promote it into a gate). ⛔ A STOP-catalogue
reference is PROSE, not a gate — the detector does not count it as enforcement, and the self-test
asserts that. Register: `.claude/reports/2026-08-21-unenforced-prohibition-register.md`.

### Tier-object migration triad — `scripts/migrate-tier-object.py` (Spec 35)

The flat-scalar-trio → tier-object migration (`<prop>` / `<prop>Tablet` / `<prop>Mobile` →
`<prop>: {desktop,tablet,mobile}`) runs PROPERTY-BY-PROPERTY across every block, driven by one
script with the full census → fix → gate triad, covering all THREE layers a migration touches:

```bash
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --survey       # census
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --fix           # dry-run diff
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --fix --apply    # write it
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --check          # CI gate
python plugins/sgs-blocks/scripts/migrate-tier-object.py --self-test                        # assertions
```

**S1 (block.json shape) — full triad, auto-applied.** `--fix --apply` rewrites the flat trio into
one object attr, folding the authored default as the desktop tier so no un-set instance silently
re-renders differently. Refuses (writes nothing) rather than emit invalid JSON.

**S2 (edit.js control wiring) — full triad, auto-applied, narrowly.** `--survey` classifies every
block's control as `SHARED` (delegates to `LayoutPanel`/`ContainerWrapperControls`, nothing to
do), `OVERRIDDEN` (already on `<ResponsiveOverride>`, done), `LEGACY` (the old
`<ResponsiveControl>` + breakpoint-keyed attrMap + one child control — needs the edit), `NONE`
(no local control), or `UNCLEAR` (refuses to guess — read it by hand). `--fix --apply` rewrites
`LEGACY` blocks automatically, but ONLY when the block matches the exact known shape byte-for-byte
(`ContainerWrapperControls.js` and `site-footer-row/edit.js` pre-fix are the reference shapes).
Anything that doesn't match exactly is refused, never guessed at or partially rewritten.

**S3 (render.php reads) — detect only, deliberately NOT auto-applied.** `--survey` classifies
`DELEGATED` (prop never appears — the shared wrapper handles it), `NORMALISED` (already read via
`sgs_responsive_normalise_object( $attributes['prop'] ?? null )`), `RAW` (still a raw
`$attributes['prop']` bracket read — needs the edit), or `UNCLEAR`. There is no `--fix` for this
layer. What makes a render.php read safe or unsafe isn't the read itself, it's what the
surrounding code DOES with the value afterwards (`trim()`? cast? `is_array()` check?): an
unguarded `trim((string)$attr)` PHP-coerces an object attr to the literal string `"Array"`.
Auto-rewriting the read without inspecting what consumes it downstream risks that exact bug
class, so this stays a flagged judgement call for a human or a targeted agent, never a blind
rewrite.

⛔ **A census must tell done from not-done.** `--survey` classifies S2/S3 rather than reporting raw
regex hit-COUNTS, because a count stays non-zero even on an already-correct file. The classifier
regexes are pattern-matching, not a parser: a comment merely MENTIONING `$attributes['gap']` as
prose, and `sgs_responsive_normalise_object()`'s positional (not string-keyed) call signature, are
both covered by the self-test's negative controls. If the shared control/normaliser shapes change,
update the regexes in the SAME commit.

⛔ **Do not run a project-wide JS formatter (`wp-scripts lint-js --fix`, prettier, etc.) as a
post-step on this script's edit.js output "to tidy the indentation".** Passing an out-of-tree
scratch-fixture path to `wp-scripts lint-js --fix` silently falls back to its default `src/` glob
and reformats every file in the plugin to a different, stricter style config. The fixer handles
its own re-indentation (dedent-by-one-level + explicit newline normalisation) so it never needs an
external formatter pass.

### S4 (theme pattern/template folding) — `scripts/migrate-theme-tier-scalars.py`

The FOURTH place a flat scalar can hide, alongside block.json (S1)/edit.js (S2)/render.php (S3):
hand-authored `wp:sgs/*` block comments in `theme/sgs-theme/{patterns,templates,parts}`. Same
triad, same refuse-rather-than-guess discipline, as a standalone script (different parsing
primitives — JSON inside an HTML comment, not a schema file, so it doesn't share code with
`migrate-tier-object.py`, but the shape philosophy is identical on purpose):

```bash
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --property <prop> --survey
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --property <prop> --fix --apply
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --property <prop> --check
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --self-test    # assertions
```

**Full triad, auto-applied — but gated on the block's OWN schema, not just the theme text.** A
scalar `"prop":"V"` in a theme file is only a migration target when that block's `block.json`
has ALREADY moved `prop` to `"type":"object"` (S1 runs before S4, by design). Parses each
`wp:sgs/*` comment's JSON via `json.JSONDecoder().raw_decode()` (robust against nested objects
like `spacing`/`padding` — no hand-rolled brace matching), folds the base value + any Tablet/
Mobile siblings into one object, drops the orphan sibling keys, and writes back the minimal JSON
diff so everything else in the attributes object stays byte-identical.

**Proven against REAL git history, not an invented fixture:** `--self-test` replays a real
pre-migration fold — the actual pre-migration state of real theme files (`patterns/*.php` +
`templates/single.html`), fed through the fold, must byte-match the actual committed post-migration
state.

⛔ **Classification is gated on the block's OWN schema.** A scalar value for `prop` is a migration
target only when that block's `block.json` declares `prop` as `"type":"object"`
(`_object_typed_blocks(prop)`, a live scan of every block.json). `sgs/nav-bar-menu` declares `gap`
as a plain string, so the migration skips it. Folding it would wrap a value into a shape the
block's own schema doesn't declare, and WordPress would silently discard it on load. A dedicated
self-test regression control pins this case.

The `--experimental-modules` flag is required for `viewScriptModule` in block.json. Check if stabilised in the installed @wordpress/scripts version.

The `--webpack-copy-php` flag copies `render.php` to `build/` automatically — dynamic blocks won't render without this.

`prebuild`/`prestart` also run `node scripts/check-dead-controls.js --check` — the **dead-control guard** (HC2). It FAILS the build if any block declares an editor control for an attribute that nothing renders (consumes in render.php/save.js/view.js/shared includes). Run standalone with `npm run check:dead-controls`. Accepted exceptions live in `scripts/dead-controls-baseline.json` (empty = zero tolerance). If it false-positives a legit consumption pattern, broaden `collectControlledAttrs`/`isConsumed` in the script — do NOT dump the finding into the baseline. See `.claude/reports/wave2/HC2-COMPLETION-2026-06-09.md`.

**Gates born from bugs that shipped through a green build** — all in `scripts/gates.json`; confirm with `npm run gate:list`:
- **`scripts/check-dead-pattern-attrs.py`** — the editor surface DISCARDS any attr a block.json doesn't declare (no error, no gate, no build failure). Parses every `sgs/*` block instance in theme patterns/parts against its block.json. **No other gate covers this class:** `check-dead-controls.js` catches the INVERSE (control-without-render); the F3 gate only fires when a block DECLARES the attr; the build never parses pattern markup. `--check` exits 1 on any finding. Runs every build via `prebuild` + standalone `npm run check:dead-pattern-attrs`.
- **`check-hardcoded-render-defaults.js` → F3b** — reads block.json `default` VALUES, not only attribute NAMES. It reads theme.json `styles.elements` and flags a literal default that flattens a theme-differentiated property (a hardcoded `fontSize` on a heading block flattens theme.json's per-h-tag scale). Gated on the block declaring an enum of element keys, so single-element blocks (`sgs/label`'s `<span>`) never trip it.

**`check-dead-api-calls.py`** — catches a call to a function that does not exist (e.g. a hallucinated `wc_get_price_html()`; the real API is `$product->get_price_html()`). Every other gate is a STATIC source check that never executes the handler, so a plausible-but-nonexistent function name is invisible to all of them. PHP-tokenizer-based (not regex — a naive text match is the class of miss `check-hardcoded-render-defaults.js`'s `stripComments()` demonstrates), self-tested to prove it catches that exact call and does not flag real functions, PHP builtins, locally-defined functions or comment text. It is a hard `--check` gate in the `fast` tier of `scripts/gates.json` and in `prestart`. A real WP/WC function it flags is added to the curated allowlist `scripts/dead-api-checker/wp-wc-function-allowlist.json` (hand-verified, never scraped), not baselined. Standalone: `npm run check:dead-api-calls` (survey/self-test modes in the script's own header).

**Two more prebuild gates:**
- **`scripts/check-empty-inspector-containers.js`** — an inspector container rendered with **no children**. An empty `<ToolsPanelItem>` still appears in its ToolsPanel's "+" disclosure menu and still takes part in `resetAll`/`onDeselect`, so a client can find it, switch it on, and be shown nothing; an empty `<PanelBody>` opens onto blank space. Both are dead controls in the Spec 35A Part F sense. `check-dead-controls.js` checks the OPPOSITE direction (an attribute with a control but no renderer) — a container with its children removed still has valid attribute wiring, so it reads clean. ⛔ **It is an AST walk, and must stay one — do NOT "simplify" it to a regex.** Two regexes are wrong in opposite directions: `<(Tag)[^>]*?>\s*</\1>` finds nothing (the char class cannot cross the `=>` in an arrow-function prop, and every real container has one) and `>\s*\n\s*</(Tag)>` floods (it matches the closing `>` of the last self-closing CHILD). JSX children are a tree. Both failure shapes are `--self-test` fixtures. Standalone: `npm run check:empty-inspector-containers`.
- **`scripts/check-wrapper-capability-preconditions.js`** — two rules over each block's `supports.sgs` (Spec 35A §F.2.1/§F.2.2). **Rule 1 (BLOCKING):** a block declaring `gridItems` in `enabledExtensions` must also declare `layout` — `GridItemDefaultsPanel`'s own `if ( layout !== 'grid' ) return null` is a RENDER-TIME bail that hides the panel once the wrong combination already exists; it is not a guarantee the combination can't be declared. **Rule 2:** `supports.sgs.gridAreas` is NOT a permitted declaration — any declaration fails the build, including an empty array (`gridAreas: []` would otherwise be the obvious way to keep the key and silence the gate). The converter derives area names from the DRAFT's own BEM ELEMENT TOKEN (`assembly.py` step 3d: `parse_sgs_bem(cls).element`, so `sgs-hero__content` -> area `content`), routing through `db.attr_for_area_property()`; the per-area attrs ARE the definition of the regions, so the flag is redundant by construction. Ships with **no baseline** — a baseline would only be a hole for the next violation. **No `--fix` mode**, deliberately: a codemod injecting `layout` would change a block's rendered capability set as a side effect of a lint run. Rule 2's `dbWriter` input is INJECTABLE — a `--self-test` fixture that falls through to the real tree stops testing while still printing PASS, so keep fixtures hermetic. Standalone: `npm run check:wrapper-capability` (or `node scripts/check-wrapper-capability-preconditions.js --check`).

**Run `npm run gate:list` before believing any gate in this file runs** — the gate chain lives in `scripts/gates.json`, and every standalone `check:*` alias in `package.json` proves only that the alias exists.

**Conformance gates.** **Gate A** — the converter golden-fixture regression (`scripts/tests/test_converter_conformance.py`). **Gate B — `scripts/check-hardcoded-render-defaults.js`**, wired into `prebuild`: it blocks the build when a `render.php`/`style.css` hardcodes a layout/visual constant for a property the block declares an attr for (the F3 family defence). **Selector-aware governance (E11):** a PREFIXED-HELPER attr (consumed by `sgs_button_element_style_css` / `sgs_typography_css_rule`, which build the CSS key by `$prefix.'Suffix'` concatenation and apply it to a SPECIFIC call-site selector) governs ONLY those selectors — the gate parses render.php for the helper call, extracts the prefix + selector class tokens, and flags a hardcoded value of that attr's property ONLY when the containing style.css rule references a governed token. Native-attr E1/E6 behaviour is unaffected. So adding e.g. `ctaBorderRadius` does not false-flag an unrelated `.pill`/tag border-radius. Do NOT baseline a prefixed-helper false positive — the E11 governance is the fix.

### S5 (STORED post_content) — `scripts/migrate-stored-tier-scalars.py`

The FIFTH place a flat scalar hides, after block.json (S1) / edit.js (S2) / render.php (S3) /
theme files (S4): **stored `post_content` on a live site**. A page cloned or authored before a
property migrated still holds the flat value, and WordPress does not error —
`WP_Block_Type::prepare_attributes_for_render()` silently substitutes the attribute's DEFAULT
when a stored value fails schema validation. The authored value vanishes with no error, no
log, and no failing gate.

```bash
python plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py --survey <dir>
python plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py --fix <dir>          # dry run
python plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py --fix --apply <dir>  # write
python plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py --check <dir>        # gate
python plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py --self-test          # assertions + watched controls
```

Takes a directory of `<post-id>.txt` files (pull them with one `wp post list --format=json`),
matching `audit-post-content-blocks.py`'s input shape.

⛔ **IT FOLDS ONLY WHAT IT CAN PROVE, AND THE REFUSALS ARE THE POINT.** An early revision
folded `padding:"22px"` into `{"desktop":"22px"}` — padding is a BOX object
(`{top,right,bottom,left}`), so that would silently destroy spacing site-wide. Four
buckets, per `surveys/survey-responsive-shape.py`'s settled doctrine (Spec 35 Phase 1.4,
Bean-locked): **BOX is a CLOSED, NAMED set** — `padding` / `margin` / `borderWidth` /
`borderRadius` and their prefixed variants (`cardPadding`, `gridItemBorderRadius`, …).
Anything else object-typed is a TIER. That rule classifies every object attribute in the
tree with **none** left ambiguous **for THIS script's own question** — see the scoping caveat
below before reusing it to answer a different one.

⚠ **Scoping caveat — this doctrine answers "should a flat family be folded
into an object?", NOT "can this attribute vary per device?"** `survey-responsive-shape.py`'s
`classify()` is only ever reached from `find_families()`, which iterates attrs that ALREADY have
declared tier siblings — so its TIER/BOX binary is correct for that narrower question, but is
demonstrably wrong if reused to answer the second one: `is_responsive`'s own detection needed a
two more shapes this doctrine cannot express — **TIER-of-BOXES** (an attr that is box-NAMED
but genuinely per-device, e.g. `gridItemPadding` — proven by render evidence, not by name) and
**RECORD/ASSET** (object-typed, but neither a tier nor a box — e.g. `shapeDividerTopScale`
`{x,y}`, `testimonial.orgLogo` `{id,url,alt}`). See `scripts/sgs-update-v2.py::_compute_is_responsive`
for the five-shape detection.

**The canonical TIER-of-BOXES envelope — settle this once, do not re-derive it per
property.** Every TIER-of-BOXES attribute (`contentBandPadding`, `gridItemPadding`,
`gridItemBorderRadius`, and `padding`/`margin`/`borderRadius` where declared as a box per tier —
`migrate-tier-object.py`'s `classify()` reports the flat form as `BOX_FLAT`, not `ASSET`, so
`--survey` can see them) is ONE attribute holding `{desktop:{...}, tablet:{...}, mobile:{...}}` — always this envelope,
never a variant of it. What differs is what lives INSIDE each tier's object, driven by
whether the property is SIDE-keyed or CORNER-keyed:
- **SIDE-keyed** (padding, margin): each tier holds `{top, right, bottom, left}`, read via
  `sgs_box_object_shorthand()`.
- **CORNER-keyed** (borderRadius): each tier holds `{topLeft, topRight, bottomRight,
  bottomLeft}`, read via `sgs_corner_object_shorthand()` — NOT the side helper. This makes
  explicit what `gridItemBorderRadius`'s `transform` escape hatch in
  `includes/class-sgs-container-wrapper.php` already does implicitly: it exists
  because radius keys are corners, not sides, not because corner properties need a
  different outer envelope.

⚠ **WordPress provides ZERO schema-level protection for what's inside a tier's object.**
Every tier-object attribute in this codebase declares `{"type": "object", "default": {}}` with no
nested `properties` schema constraining sub-keys. A post written with `maxWidth:
{"desktop":"90vh","tablet":123,"mobile":null}` (a malformed `tablet` value) and read back through
`WP_Block_Type::prepare_attributes_for_render()` on the live canary passes the malformed value
through completely UNCHANGED — no coercion, no rejection, no whole-object wipe. This means **the PHP helper (`sgs_responsive_normalise_object()`) and
the JS write helper are the ENTIRE defence**, not a backstop behind a WP-native check. Two
concrete obligations follow: (1) every write into a tier-object attribute must go through a
helper that spreads the existing object first (never a bare `setAttributes({attr:
{tier: value}})`, which silently drops the other two tiers with nothing to catch it — see
`patchTier()`), and (2) every PHP read must defensively handle a missing/wrong-typed
sub-key itself, since WordPress will hand it through as-authored.

⚠ **Do NOT re-derive the shape from `default`.** A `"default": {}` proves nothing — most object
attrs declare exactly that. A reading based on the default alone concludes the shapes are
"undeclared" and proposes a migration to add information that already exists in the survey script.
Read the doctrine, not the defaults.

⛔ **ENUM violations are a separate class and are NEVER auto-fixed.** A value can be the right
TYPE and still not a permitted one — `layout:"grid"` on `sgs/testimonial-slider`, whose enum
is `["full","split"]`, coerced to `"full"` and rendered the slider at width 0. There is no
correct fold; it is reported and refused.

**Companion gate — `audit-post-content-blocks.py` checks attribute TYPES** as well as unparseable
attrs / unknown blocks / undeclared attrs / stranded content. It emits `type-mismatch` and
`enum-violation` (separate classes, for the reason above), handles union types
(`["string","number"]` is legal and is NOT a finding), and tests bool BEFORE number because `bool`
subclasses `int` in Python. It runs on every deploy via `build-deploy.py`'s
`step_oldshape_audit()`, so this class of drift fails the deploy rather than shipping.

⚠ **NEVER write `post_content` to a page the operator has open in the block editor.** A save
from the editor writes its in-memory state — loaded BEFORE your writes — over everything; only
the last write survives.


## Deploy

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

Targets: `sandybrown` (default), `indus-test` and `eye-care-test` (`--target`; the last two
need explicit opt-in; see `TARGETS` in `scripts/build-deploy.py`).

⛔ **NEVER hand-roll tar/scp/ssh.** A hand-rolled deploy that deletes the live plugin directory
before extracting the new copy takes client sites down.

`build-deploy.py` is the ONE path: dirty-tree gate, `--payload` deadlock-breaker, pre-deploy
stored-content audit, default-ON fail-closed smoke test, `.bak` rollback rotation, and a
post-deploy purge of BOTH cache layers via `step_purge_caches()` — OPcache (compiled PHP, reset
over HTTPS because the CLI pool keeps a separate one) and the LiteSpeed page cache (rendered
HTML). Scope with `--blocks-only` / `--theme-only`; `--skip-build` reuses `build/`. Do not reach
for `--allow-dirty` (an uncommitted edit is what breaks a deploy) or `--skip-verify` (it removes
the check that catches a broken deploy).

## Per-block status

Per-block status: query `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` / `/wp-blocks`; live status: `.claude/LEDGER.md`.

## Backend Integrations

| Integration | Settings page | Option key (read by) | Auto-sync |
|---|---|---|---|
| Google Reviews | Settings > SGS Google Reviews | `sgs_google_reviews_settings` (sgs/google-reviews block) | Cache TTL (1-168h transient) |
| Trustpilot Sync | Settings > SGS Trustpilot Sync | `sgs_trustpilot_data` (sgs/trustpilot-reviews block, `dataSource: synced`) | WP-cron `sgs_trustpilot_sync_event` weekly/daily |
| Font Library Collection | Site Editor > Styles > Typography > Manage fonts | n/a — `wp_register_font_collection( 'sgs-google-fonts' )` on init | Manifest fetched on modal open only |

**Font Library Collection notes:**
- PHP class at `includes/class-font-collection.php` (`SGS\Blocks\Font_Collection`) — registers the collection with `wp_register_font_collection()` on `init`.
- Manifest at `assets/font-collections/google-fonts.json` — pre-built from the uimax `google_fonts` table by `scripts/build-font-collection.py` (idempotent; re-run when uimax google_fonts is refreshed). Gzip + 30-day immutable cache via `assets/font-collections/.htaccess` (Apache + LiteSpeed directives).
- **ZERO frontend cost**: WP's editor fetches the manifest only when the "Manage fonts" modal opens. No `@font-face` is enqueued until an operator explicitly installs and activates a typeface (writes to `wp_global_styles`, then enqueued per page).
- **Critical constraint**: do NOT add fonts from the collection to `theme.json` `settings.typography.fontFamilies` to make them "available" — WP enqueues every entry in fontFamilies on every page (WP Core issue #39332). The collection IS the available-fonts catalogue; theme.json is the active-fonts list.
- Re-build the manifest: `python plugins/sgs-blocks/scripts/build-font-collection.py` (writes back to `assets/font-collections/google-fonts.json` idempotently; `--self-test` validates).

**Trustpilot Sync notes:**
- Backend at `includes/trustpilot/` — 4 classes (Trustpilot_Sync, Trustpilot_REST, Trustpilot_Cron, Trustpilot_Settings)
- Admin JS at `assets/admin/trustpilot-sync.js` (Sync-now button via wp.apiFetch + X-WP-Nonce)
- REST endpoint `POST /wp-json/sgs/v1/trustpilot-sync` (manage_options gated)
- Browserless `/content` REST endpoint — `?token=<key>` auth (NOT `Authorization: Bearer` — that returns HTTP 500 on this endpoint). Key encrypted AES-256-CBC at rest, keyed off `wp_salt('auth')`.
- JSON-LD parser harvests standalone `Review` entities from `@graph` (Trustpilot's reference pattern — `LocalBusiness.review[]` holds `@id` pointers, not inline entities)
- Activity log (last 5 attempts) + `last_sync_status` badge on settings page = operator failure surface. No Telegram/n8n side channel.

## Block Customisation Standard (MANDATORY)

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

> **TYPOGRAPHY — use the SHARED component, never bespoke font controls (MANDATORY, Bean R-22-13).** For ANY per-element typography (font size / weight / style / line-height on a title, label, pill, link, price, etc.) use the shared **`TypographyControls`** component (`src/components/TypographyControls.js`, exported from `../../components`) in edit.js + the shared **`sgs_typography_css_rule( $attributes, $prefix, $selector )`** helper (`includes/helpers-typography.php`, auto-loaded via `render-helpers.php`) in render.php. This gives the canonical SGS inspector UI everywhere: **font size = `<ResponsiveControl>` wrapping a `<UnitControl>` (number + unit in one integrated input — NOT a RangeControl + separate SelectControl dropdown)**, **weight + style = SelectControl dropdowns**,
>
> `ResponsiveControl` renders no device switcher of its own. The device tier is chosen ONCE, in the global toggle docked at the bottom of the inspector (`src/blocks/extensions/responsive-device-toggle.js`), a text-labelled `ToggleGroupControl`; `ResponsiveControl` wraps the control and passes the tier to its child. ⛔ Do NOT add a per-control switcher: `inspector-scan` rule 25 (`scripts/inspector-scan/rules/25-no-own-device-switcher.js`) flags it. **line-height = `<UnitControl>` (number + unit; empty string unit = unitless, matching the PHP helper's `''` → unitless semantic)**. Attr shape per element: `{prefix}FontSize` (number) + `{prefix}FontSizeUnit`/`Tablet`/`Mobile` + `{prefix}FontWeight`/`FontStyle` + `{prefix}LineHeight`/`Unit`; the helper emits a per-instance uid-scoped `<style>` (base + tablet + mobile) and honours a legacy STRING fontSize verbatim. Do NOT hand-roll a TextControl/SelectControl font-size or emit `--x-font-size` CSS vars per block — that path produces inconsistent stacked-RangeControl + unit-dropdown controls. Adopt it for every new typography control + keep all blocks aligned.
>
> WordPress's native `supports.typography` block support is BANNED outright — no block declares it; rule `45-typography-full-replacement.js` (`scripts/inspector-scan/rules/`) gates on any native declaration. A real CSS rule on the root cascades to unset children from ANY source, native or not, so there is no inheritance blocker to root-level typography. The helper resolves a theme font-size PRESET SLUG stored inside a *tiered* `{desktop,tablet,mobile}` object's `desktop` key (as well as the flat legacy-string shape) via its `transform` extension point on the tiered spec. Never cache which blocks have migrated here — query rule 45's live output instead.

1. Native WordPress `supports` for wrapper-level controls (colour, typography, spacing, border)
2. Custom attributes + controls for each inner text element (colour via `SgsColourPanel` — see "Colour controls" below; font size/weight/style/line-height via the shared `TypographyControls` component — see box above)
3. Custom attributes + controls for interactive elements like CTAs (text colour, background colour)
4. Do NOT use `:not([style*="…"])` fallback guards. Under Spec 32 no block emits an inline `style` property declaration, so the guard always matches and the fallback becomes unconditional — it blocks contextual inheritance and can out-rank the operator's own scoped rule. Instead: let the value inherit (no rule), or emit the fallback inside `:where()` so any `.{uid}` scoped rule wins.
5. Use Block Selectors API in `block.json` to target native typography to primary text element
6. **Variant-bearing blocks MUST declare `supports.sgs.variants`** in `block.json` — a map of `variant_value → [attr/slot names that variant uses]` — so the cloning converter can detect the correct variant from what the draft extracted, without per-block code. The variant-selector attr name (e.g. `variant`, `variantStyle`, `layout`) MUST also be registerable to the `blocks.variant_attr` DB column via `/sgs-update`. (FR-31-20; see Spec 31 §13.)

### Border controls — `SgsBorderControl` is the one shape

`<SgsBorderControl>` (`src/components/SgsBorderControl.js`) is the border control every block mounts.
**Never cache a mount count — run `git grep -l "<SgsBorderControl" -- "src/blocks/*/edit.js"`**, and
note that grep alone under-counts: `sgs/media` mounts it only via the shared `box-shape` atom's
composition chain (`box-shape.control.js` → `MediaPanelLayout` → `MediaBoxShapeControls.js`), fed the
atom's own `borderWidthValue`/`borderStyleValue`/`borderColourValue`/`borderRadiusValues` props with
zero custom logic. `survey-border-control-migration.py` follows that delegation chain: a block
declaring the `box-shape` atom in `supports.sgs.mediaElements[].atoms` has its border classification
resolved by checking whether `MediaBoxShapeControls.js` mounts `SgsBorderControl`, not by
text-searching only the block's own `edit.js`. A block that declares no
`borderWidth`/`borderStyle`/`borderColour` (radius-private-only, e.g. `sgs/whatsapp-cta`, whose
radius rides `__experimentalBorder`) correctly does NOT mount it. Blocks whose `block.json` still
declares native `__experimentalBorder` are the unmigrated set: list them with
`git grep -l __experimentalBorder -- "src/blocks/*/block.json"`; the codemod's own `--survey`
refuses ambiguous ones as `ambiguous-anchor`.

Census + ratcheted gate: `scripts/survey-border-control-migration.py`
(the ratcheted ceilings live in `CEILING` in the script — read it rather than trusting a prose
figure; a ceiling is lowered only when a block is genuinely migrated, and raised only with a
stated reason).
Codemod for the edit.js swap: `scripts/migrate-border-control.js`
(`--survey`/`--fix`/`--check`/`--self-test`). Codemod for the broader Shape-B storage migration
(radius+width+colour off WP-native, per-block): `scripts/migrate-border-shape-b.js`.

The control is a PAIR: border width (box object) + colour, with **border STYLE
inside the colour popover** (native `BorderBoxControl` opens both from one
swatch), plus the SGS-wrapped native radius as the second control when the
caller wires `onRadiusChange`.

⚑ **`showColour` prop (Spec 41 FR-41-33/FR-41-2b).** `true` (the default) renders the colour
swatch as part of the control. Pass
`showColour={false}` when a block wants border COLOUR to live in `SgsColourPanel`
(via a `fillRow`/`textRow`-built row, see below) while border width/style/radius
stay in the element's own settings panel. `false` OMITS the swatch
(`GradientCapableColourControl`) entirely — not a disabled empty picker — and
re-parents `BorderStyleControl` as `SgsBorderControl`'s own sibling (gated on
`typeof onStyleChange === 'function'`, so a caller that never wired style gets no
orphan control). Twelve props become INERT under `showColour={false}` — still
accepted, but nothing reads them because `GradientCapableColourControl` is not
mounted: `colourStates`, `colourValue`, `onColourChange`, `colourGradientValue`,
`onColourGradientChange`, `colourLinked`, `colourLabel`, `clearable`,
`enableAlpha`, `contrastAgainst`, `contrastLabel`, `contrastLargeText`. ⚠ The
contrast trio is the dangerous one of the twelve — a caller can wire a full WCAG
contrast check that then silently never runs. `borderStyle` is NOT on this list;
it is re-parented, not dropped. Live example: the nav menus' submenu border row
(`src/shared/nav-menu-panels/DropdownStylePanel.js`).

⛔ **`linked` is load-bearing — never drop it when wiring a colour row.**
`GradientCapableColourControl` reads it to decide whether a picked colour is
stored as the palette token SLUG or a baked hex. Without it the client's colour
is frozen against every future re-skin. Multi-state carries `linked` per state;
single-state uses `SgsBorderControl`'s `colourLinked` prop. Hand migrations and codemods
both drop it easily, and a green assertion suite does not notice.

⛔ **Per-device border WIDTH is not supported** (Bean-locked). No use case, and it would
cost `borderWidthTablet`/`Mobile` attrs plus `@media` emission in every block. Do not build it.

⚠ **A palette SLUG is not a paintable value.** `sgs_border_states_css()` feeds
its result into `background:` inside a masked `::before` ring that also sets
`border-color:transparent` — so an unresolved slug paints NOTHING rather than
degrading visibly. It resolves through `sgs_colour_value()`. Any new
border path handing a raw slug to CSS has this defect; a raw hex hides it.

**Live check:** `node scripts/qa/check-border-roundtrip.js --blocks sgs/x,sgs/y`
— positive instance + a `borderStyle:"none"` negative control, frontend computed
styles, fail-closed (a missing browser exits non-zero, never green). ⚠ It measures
the OUTERMOST `.wp-block-sgs-<name>`, so it cannot target `sgs/container` on a
page with a header, and NOT RUN is not a pass.

### Colour controls — `SgsColourPanel` is the standard

Blocks mount `<SgsColourPanel` in their `edit.js` (verify: `git grep -l "<SgsColourPanel" -- "src/blocks/*/edit.js" | wc -l`)
— **never cache the count, re-run the grep.** It is ONE SGS-owned `PanelBody` titled
"Colour" (`src/components/SgsColourPanel.js`), rendered in the `styles` InspectorControls
group, that takes a `rows` array and renders one `DesignTokenPicker`
(or `GradientCapableColourControl` for a `gradientCapable: true` row) per entry. Do NOT
hand-roll a bespoke colour `PanelBody` — mount this component instead.

**THE PLACEMENT RULE FOR COLOUR: every fill/text/link colour on a block lives in
`SgsColourPanel`** (the rule is also recorded in `SgsColourPanel.js`'s own docblock). The
gradient-colour helper set (`fillRow`/`textRow`, the `gradientCapable` row shape,
`sgs_resolve_text_colour_or_gradient()` and friends) exists so every fill/text/link colour can
live in ONE shared panel without losing gradient/hover capability per row. The only exemptions
are border colour, media/section overlay colour, and shadow colour — those stay element-scoped
because each pairs a colour with a genuinely non-colour sibling control (style/width,
opacity/blend-mode, blur/spread) that `SgsColourPanel` has no slot for. Do not add "element-scoped
colour belongs in its own TIER 1 panel" placement language.

- **A row that doesn't apply is OMITTED, not disabled.** `SgsColourPanel`
  runs `rows.filter(Boolean)` and returns `null` outright if every row is falsy — no empty
  panel, no greyed-out control. The caller inlines the condition directly in the array
  literal (`showIconColourRow && { key: "icon", … }`). Reference implementation:
  `src/blocks/icon-list/edit.js` — read the comment above its `rows={[…]}` block.
- **Row helpers `fillRow`/`textRow`** (`src/components/colour-variants/`) return row
  DESCRIPTOR objects, not JSX — they build the `{ key, label, states, … }` shape
  `SgsColourPanel` expects from an attrs+attributes+setAttributes triple. ⚠ **There is no
  `borderRow` helper** — `ls src/components/colour-variants/` returns only `fillRow.js` and
  `textRow.js`. Border colour is owned by `SgsBorderControl`, which has its own built-in
  colour+gradient picker — do not build a `borderRow.js`.
- **Third state — `attrs.current`/`attrs.currentGradient` (Spec 41 FR-41-3/FR-41-2).**
  Both `fillRow` and `textRow` accept an optional `attrs.current` and `attrs.currentGradient`
  (feeding `gradientCapable` the same way `attrs.gradient`/`attrs.hoverGradient` do),
  appending a THIRD "Current" state entry after Normal/Hover. A caller supplying no
  `attrs.current` gets a two-state descriptor. `attrs.current` REQUIRES `attrs.hover` (both helpers throw otherwise) —
  Current is the third state of the three-state model, never a substitute for Hover. Every
  state entry is a literal array element, never `.map()`-generated, because
  `describeRow()` in `scripts/inspector-scan/core/golden.js` resolves a row's state count
  STATICALLY; if either helper's states logic changes, that function must change in the same
  commit. The `get`/`set` (non-top-level binding) path renders ONLY the Normal state and does
  not accept a `current` param. Live example: `sgs/nav-bar-menu`'s `item` colour rows
  (Normal/Hover/Current, matching the block's `[aria-current="page"]` current-page state).
- **Colour lives inside an ELEMENT's own panel only where a purpose-built paired composite
  exists** (colour + a non-colour control sharing one row — e.g. border colour sitting next
  to border style/width in `SgsBorderControl`). There is NO general mechanism for mounting a
  colour row inside an element's own panel, and none should be built without a design gate —
  `SgsColourPanel` hardcodes its own `InspectorControls`/`PanelBody`, and zero blocks render
  a colour control directly inside another panel.
- **Per-row `heading` and `after` (Spec 41 §9.6 / FR-41-23 / FR-41-24).**
  A row descriptor may carry `heading` (a string rendered as a non-interactive
  `BaseControl.VisualLabel` immediately BEFORE the row's control — e.g. "Menu" / "Submenu" /
  "Menu button" grouping headings inside one Colour panel) and/or `after` (an arbitrary React
  node rendered immediately AFTER the row's control, inside the same row wrapper — e.g. a
  hover-treatment `ToggleGroupControl` that must sit directly beneath a specific row's Hover
  swatch). `after` is a SLOT, not a component — `SgsColourPanel` makes no assumption about
  its content. Both are omitted entirely when absent. Live example: `sgs/nav-bar-menu`'s Colour panel groups rows under "Menu"/"Submenu"/
  "Menu button" headings and hangs each hover-treatment picker off its own row via `after`.
- **`contrastLargeText` reaches the gradient-capable branch (FR-41-33).**
  `SgsColourPanel` forwards `contrastLargeText` alongside `contrastAgainst`/`contrastLabel`
  when a row is `gradientCapable`, so a row passing `contrastAgainst` + `contrastLargeText: true`
  gets WCAG 1.4.11's 3:1 UI-component threshold rather than the 4.5:1 body-text one.
  `SgsBorderControl` forwards it with its own `contrastLargeText = true` default; this covers a
  border colour rendered as a `SgsColourPanel` row instead (i.e. paired with `SgsBorderControl`'s
  `showColour={false}`, above). ⚠ The whole contrast trio reaches
  `GradientCapableColourControl` ONLY — a non-`gradientCapable` row renders `DesignTokenPicker`,
  which carries no contrast check at all, so the trio is inert there.
- **Blocks that mount a raw `<DesignTokenPicker>` instead of routing through `SgsColourPanel`
  are unmigrated colour surfaces** — list them with
  `git grep -l "<DesignTokenPicker" -- "src/blocks/*/edit.js"`. `sgs/product-card` is the
  fully-standardised reference (one `SgsColourPanel` mount, no raw pickers).

### `supports.sgs.colourExemptions` — declaring a structurally Normal-only colour (Spec 41)

A manifest escape hatch that tells the golden-colour-control detector (`inspector-scan` rule
31) that a specific colour row is DELIBERATELY Normal-only (or otherwise short of the full
Hover/Current family) for a structural reason, rather than an unmigrated gap. Shape, per
element key: `{ "<element-or-row-key>": { "rule": "states", "reason": "<plain-English why>" } }`.
Use it when a colour genuinely cannot carry a state the golden shape expects — e.g. the
element is structurally unhoverable (`pointer-events:none`), or its hover-perceivable surface
is a different, already-stated element. Do NOT use it to paper over a colour row that simply
hasn't been built out yet — the reason must name a real structural constraint, not a TODO.

Live example: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.colourExemptions`
declares three — `indicator` (the sliding pill is `pointer-events:none`, so it paints from the
`item` element's own Hover swatch under `itemBgHoverTreatment === 'highlight'`, never its own
pair), `submenu-bg` and `submenu-border` (the submenu panel's visibility is a binary open/closed
disclosure — once open, the pointer is always over an interactive child link, so a pointer-driven
change on the panel surface itself is never perceivable; the link's own three-state family is
where a hover fill belongs instead).

### Ungated paint detector — `scripts/check-ungated-paint-rules.py` (Spec 41 FR-41-35)

Framework-wide static detector for a `background`/`border` CSS declaration — emitted in a
block's `render.php` or authored in its `style.css` — that is ungated on any corresponding
operator attribute. A human review that searches one notch narrower than the defect under-counts
it (an unconditional shorthand resetting `background-image` to `none` silently erases a
text-sweep gradient on hover), which is why this is a mechanical detector. Modes:

```bash
python scripts/check-ungated-paint-rules.py --survey [--block sgs/x]   # three-bucket census
python scripts/check-ungated-paint-rules.py --check [--block sgs/x]    # fails only for blocks in HARD_FAIL_BLOCKS
python scripts/check-ungated-paint-rules.py --self-test                # fixture round-trip
```

**Mode: HARD for the blocks listed in `HARD_FAIL_BLOCKS` (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`);
WARN-ONLY for every other block** — a finding on an unlisted block prints but `--check` still
exits 0, so a block joins the hard-fail list once its tree is clean. Wired into `gates.json` +
`package.json`. Framework-wide by design — never a per-block lint: the classification input ("is
this gated on an operator attribute?") is read from each file's own PHP/CSS structure (an
enclosing `if`), never a block-name lookup. A block or selector name appearing in the script's own
source (outside `HARD_FAIL_BLOCKS`/`--block`/fixtures) would BE a lint, not a gate.

Three buckets, always all three, always printed with the script's own disclosed limits:
**GATED** (wrapped in an `if` on an operator attribute), **DISMISSED** (ungated but
structurally incapable of the defect — a `:where()` zero-specificity default, a
`forced-colors`/`@supports` a11y rule, a wrapper-delegated paint, or an attribute-driven
`var()` with a verified guarded writer), **CENSUSED** (real hardcoded/ungated paint — the
thing to fix). Disclosed limits (always printed, never silent): NOT variable-aware (a
declaration assembled into an intermediate PHP variable in one statement and appended to the
CSS accumulator in a later, separate statement is invisible — the nav menus'
`$sgs_nm_featured_vars` assembly in `includes/nav-menu-item-border-featured-css.php` is a live
instance, harmless there only because those are custom-property assignments); the reset
exemption is evaluated PER STATEMENT/RULE only, not against the whole file; the
wrapper-delegated exemption fires on the `Container_Wrapper` name appearing in the text, without
walking into that class's own source; the var()-writer exemption verifies the writer exists and
is guarded, NOT that the reading statement is also conditional on the write having happened.

### Touch-safe HOVER helpers — `includes/helpers-hover-state.php`

**The ONE place a `:hover` rule is built.** On a touchscreen a tap engages `:hover` and it
STICKS until the user taps elsewhere — clients report it as "I tap it and the colour won't go
back", indistinguishable from a broken control. Call one of these rather than writing a bare
`{sel}:hover{…}` anywhere.

| Function | Signature | Use when |
|---|---|---|
| `sgs_hover_state_rules()` | `( string $selector, string $decls, string $focus = ':focus-visible', string $suffix = '' ): string` | **The default.** You have a base selector and want the hover + focus pair built correctly. Splits the focus rule out and leaves it unguarded, which is what keyboard users need. |
| `sgs_hover_guarded_rule()` | `( string $hover_selector, string $decls ): string` | You already hold `:hover` selectors and want just the guarded rule. Pass ONLY `:hover` selectors — emit focus separately, yourself, unguarded. |
| `sgs_hover_media_wrap()` | `( string $rule ): string` | You have a complete rule and need only layer 1 wrapped around it. |

**Two layers, both required. Neither covers the other's devices.**

| Constant | Layer | Covers |
|---|---|---|
| `SGS_HOVER_MEDIA` = `@media (hover: hover) and (pointer: fine)` | 1 — pure CSS, works on a page shipping no JS | Phones, pure-touch tablets |
| `SGS_HOVER_NOT_TOUCH` = `:where(:root:not(.sgs-touch-input))` | 2 — reactive class set from the last `pointerdown` | Hybrids: touchscreen laptops, Surface, iPad + trackpad |

⛔ **Layer 1 alone is not enough.** The media feature
describes the device's PRIMARY pointer only — a hybrid reports hover-capable and KEEPS
reporting it for the whole session even while being poked with a finger. Do not delete either
layer believing the other covers it.

⚠ **`:focus-visible` / `:focus-within` stay OUTSIDE both guards** — they are keyboard-reachable,
and a keyboard user on a touchscreen laptop still needs the focus state. Callers split the
hover selector from the focus selector rather than emitting one combined rule.

⚠ **Layer 2 is wrapped in `:where()` so it contributes ZERO specificity.** A hover rule must
keep out-ranking its own resting rule by the `:hover` pseudo-class alone. A guard that raises
specificity produces a rule that silently loses — indistinguishable from one that is absent.

**Static `style.css` is a SECOND surface this helper cannot reach.** Per-block `style.css`
files are enqueued by WordPress as ordinary stylesheets and never pass through PHP, so a
motion `:hover` rule written there gets no guard from these functions. That surface is covered
at build time instead, by `scripts/hover-guard/`:

| Script | Does |
|---|---|
| `run-transform.js` | Wraps motion-only `:hover` rules in BOTH guards, operating on compiled CSS in `build/blocks/*/style.css`. Idempotent; nests correctly inside an existing `@media`; splits a selector list that mixes `:hover` with `:focus-visible`. |
| `check.js` | Fails on any `:hover` rule the transform cannot classify confidently, so an odd shape surfaces as a build error rather than being silently mangled. Scans BOTH surfaces — the block CSS files AND these PHP emitters — so an unguarded hover rule added on either one is caught by a single check rather than falling between two half-checks. |

Out of scope by design, and not a bug: colour-family hover rules (the PHP helpers above already
own those) and `text-decoration`-only hover on links (a stuck underline is cosmetic, not a
control that looks broken — but `text-decoration` COMBINED with a motion property is still
guarded).

⚠ **The transform runs on BUILD OUTPUT, so `src/**/style.css` still reads as unguarded.** That
is expected. Do not "fix" a source file by hand-adding a guard — read `check.js`'s output for
the real state.

⚠ **The PHP half's finding count means "none this method can detect", not "none exist".** Its
scan is per-function-body, so a hover rule reached through a cross-file data flow is invisible
to it — one such case is known in `helpers-tokens.php`'s `sgs_border_gradient_css()`.

### Known precedent-function registry

**Check this table BEFORE designing any new colour-emission mechanism** — a working precedent
(e.g. `sgs_svg_stroke_gradient()` for SVG paint-gradient) gets rediscovered otherwise. Add a row
here whenever a session finds a working precedent for a problem shape not yet listed.

| Problem shape | Known precedent | Where |
|---|---|---|
| SVG paint (fill/stroke) gradient | `sgs_svg_stroke_gradient()` + `sgs_svg_inject_defs()` | `includes/helpers-svg-gradient.php::sgs_svg_stroke_gradient`, `::sgs_svg_inject_defs` |
| Icon gradient where the icon's SOURCE varies (lucide/wp-icon render `<svg>`, dashicon/emoji render `<span>` and paint via `color:` like any other text node) — picks SVG stroke-gradient or the text-gradient trio per source, never a bare `sgs_svg_stroke_gradient()` call that silently no-ops on dashicon/emoji | `sgs_icon_gradient_css( $iconSource, $gradientCss, $uniqueId, $selector )` — used by `sgs/icon`, `notice-banner` (its source genuinely varies), and `cart`/`accordion-item`/`before-after`/`social-icons` (lucide-only, for one call shape). `icon-list` is a KNOWN DIFFERENT SHAPE — its list items can each declare a different source, so one call can't resolve the whole row; open gap. | `includes/helpers-svg-gradient.php::sgs_icon_gradient_css` |
| Text colour/gradient, base OR ancestor-hover, one owned scoped rule | `sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()` (+ `sgs_hover_state_rules()`'s 4-arg form for ancestor-hover) | `includes/helpers-tokens.php::sgs_resolve_text_colour_or_gradient` + worked examples in `src/blocks/post-grid/render.php` and `src/blocks/brand-strip/render.php` |
| Per-item dynamic-loop colour (repeater/query loop) | `:nth-child(N)`-scoped rule per iteration | `src/blocks/pricing-table/render.php` (`ribbonColour`) |
| Fill or text colour, base+hover, flat-or-gradient, one owned rule | `sgs_fill_states_css()` / `sgs_text_states_css()` | `includes/helpers-colour-variants.php::sgs_fill_states_css`, `::sgs_text_states_css` |
| Background/border custom-property gradient (static compiled stylesheet consumer) | `sgs_custom_property_gradient_decls()` — emits `--var` + `--var-gradient` siblings; stylesheet needs one added `background-image:var(--x-gradient,none)` (or `border-image`) line next to the existing `background-color:var(--x)` line | `includes/helpers-tokens.php::sgs_custom_property_gradient_decls` — proven on `brand-strip`, `post-grid`, `social-icons`, `form`, `gallery`, `before-after` |
| A block's own `$root_sel`/`$sel_*`-scoped per-instance `<style>` rule needs to override a static compiled stylesheet default (incl. across a block's own WP style variants) | Emit the override into the block's own `$scoped_css[]` array, keyed to its own already-defined selector (e.g. `$sel_pill`) — the scoped `<style>` block is enqueued after the compiled stylesheet, so equal-or-greater specificity wins by source order. No new mechanism needed; every block that assembles `$scoped_css` already relies on this | `src/blocks/option-picker/render.php` (see the comment on rules rooted at `$root_sel`, which "out-specify the variant") |

⚠ The custom-property-gradient row above is BACKGROUND/BORDER only — every live use
feeds a `background-color` or `border-color` custom property. A `color:`-consuming
custom property is the TEXT row above, not this one — even when the block has multiple
WP style variants consuming the same custom property (the variants differ only in
fallback DEFAULT, not in selector/property shape, so they don't change which mechanism
applies).

### Colour EMISSION helpers — the render.php side

This is the "which one do I call" reference: check it before hand-fixing render.php CSS
assembly one block at a time, because several of these helpers already do the job. All live in `includes/helpers-tokens.php` (the
primitives) and `includes/helpers-colour-variants.php` (the per-mechanism composers) unless
noted. Every one is autoloaded via `render-helpers.php`.

**The primitives (everything else is built from these two):**

| Function | Signature | Does |
|---|---|---|
| `sgs_colour_value()` | `( ?string $value ): string` | Resolves a token slug to `var(--wp--preset--color--X)` or passes a raw CSS colour through. The floor every other helper reads through. |
| `sgs_background_paint_decl()` | `( ?string $colour, ?string $gradient ): string` | ONE declaration — `background-color:X` or `background-image:linear-gradient(...)` (gradient wins when valid), no trailing `;`. The single shared gate for "does this fill paint a gradient". |

**The state emitter (the thing every mechanism ultimately calls to become real CSS):**

| Function | Signature | Does |
|---|---|---|
| `sgs_emit_state_colour_css()` | `( string $selector, array $decls_normal, array $decls_hover ): string` | Given a selector + raw declaration arrays, emits `{sel}{…}` plus a touch-guarded `:hover`/`:focus-visible` pair via `sgs_hover_state_rules()`. The lowest-level shared primitive — every mechanism below either calls this directly or is this shape hand-inlined. |

**Per-mechanism composers — pick ONE based on what the element actually paints:**

| Mechanism | Function | Returns | When to use |
|---|---|---|---|
| **Fill (background)** | `sgs_fill_decls( $attributes, $map )` | `{normal:string[], hover:string[]}` — raw declarations, NOT finished CSS | The element shares its selector with OTHER declarations you're already assembling (compose into one rule yourself, then call `sgs_emit_state_colour_css()` once). |
| **Fill (background)** | `sgs_fill_states_css( $selector, $attributes, $map )` | Finished CSS | The element owns its own standalone rule for JUST this fill — no composing needed. |
| **Text** | `sgs_text_decls( $attributes, $map )` | `{normal:string[], hover:string[]}` | ⚠ Returns ONLY the `color:` declaration. If the resolved value is a gradient, you MUST separately call `sgs_text_colour_gradient_fallback_rule()` (below) — this function will not do it for you, and a bare `color:linear-gradient(...)` is invalid CSS the browser silently drops. |
| **Border** | `sgs_border_states_css( $selector, $attributes, $map )` | Finished CSS (the ONLY one of the four that returns finished CSS unconditionally) | A border gradient needs a masked `::before` ring construct that requires BOTH states at once (delegates to `sgs_border_gradient_css()`), so there is no honest per-state-declaration form. |

All four `$map` shapes are identical: `['base'=>attr, 'hover'=>attr, 'gradient'=>attr, 'hover_gradient'=>attr]` — only `base` is required, everything else optional. **Attribute names are the caller's own** (Bean-locked) — the map adapts to whatever a block already calls its attrs; nothing gets renamed to fit the helper.

**The button-element aggregate — for a genuinely button-shaped element only:**

| Function | Signature | Does |
|---|---|---|
| `sgs_button_element_style_css()` | `( array $attrs, string $prefix, string $selector ): string` (`includes/helpers-button-style.php`) | ONE call reads `{prefix}ColourBackground`/`ColourText`/`ColourBorder` + `Hover` siblings + `ColourBackgroundGradient`/`ColourBackgroundHoverGradient` + `ColourBorderGradient`/`ColourBorderHoverGradient`, plus border-style/width/radius, font-weight/size, padding, width-type — ALL from one prefixed attribute set. |

⛔ **This helper supports fill gradient and border gradient, but deliberately NOT text
gradient.** A button-shaped element paints text and background on the SAME selector, and a
text gradient needs `background-clip:text` — which would clip that same-selector background
paint to the glyph shapes. Adding text gradient here needs the `::after`-layer treatment
below applied FIRST; it cannot be bolted onto this helper as-is. `sgs/button` itself does not
use this helper (it has its own, richer emitter) — this one is for OTHER blocks' built-in
CTA-shaped elements (product-card's CTA, container's CTA, etc.) and also modal's close
button / form's prev button, google-reviews' write-review and arrow buttons.

**Real text gradient — the only path that supports it, and its precondition:**

| Function | Signature | Does |
|---|---|---|
| `sgs_resolve_text_colour_or_gradient()` | `( ?string $flat, ?string $gradient ): string` | Picks the gradient when valid, else the flat colour. |
| `sgs_text_colour_decl()` | `( ?string $value ): string` | For a flat colour: `color:X`. For a gradient: `background-image:X;-webkit-background-clip:text;background-clip:text;color:transparent`. |
| `sgs_text_colour_gradient_fallback_rule()` | `( string $selector, ?string $value ): string` | No-op for a flat colour. For a gradient: emits the MANDATORY `@supports not ((background-clip:text))` fallback. **Always call this alongside `sgs_text_colour_decl()`** — omit it and a gradient degrades to invisible text on any browser lacking `background-clip:text`. |

⛔ **Precondition: the element must NOT also paint a background on the same selector.**
`background-clip:text` clips the element's WHOLE background painting area — background
colour included — to the glyph shapes. If the element needs both a text gradient AND a
background, move the background onto a `::after` layer first:

| Function | Signature | Does |
|---|---|---|
| `sgs_block_background_layer_css()` | `( string $selector, string $paint_decl, string $hover_paint_decl = '' ): string` (`helpers-tokens.php`) | Moves a block's background paint off the element itself onto a `::after` pseudo-element, freeing the element for `background-clip:text`. Uses `::after` specifically because `sgs_border_gradient_css()` already owns `::before` on every block this applies to. |

**Which blocks need this precondition solved before they can offer a text gradient:** those
with an element declaring BOTH a `css:color*` and a genuinely separate `css:background*` member
on the same `supports.sgs.elements` entry (NOT the attribute's own `{attr}Gradient` sibling).
`scripts/inspector-scan/rules/31-golden-colour-control.js::textSharesElementWithBackground` is
the existing, adopted exemption mechanism — it reads the element manifest, so no block list is
hardcoded and none needs to be kept in sync by hand; do not hand-derive per block. This is a
sizeable backlog (button, container, hero, product-card, trust-bar, cta-section, info-box, and
more) — closing all of it is its own project, not a quick follow-up.

**Icon/SVG gradient where the icon's source can vary:**

| Function | Signature | Does |
|---|---|---|
| `sgs_icon_gradient_css()` | `( string $iconSource, string $gradientCss, string $uniqueId, string $selector ): array{defs,css,fallback_rule}` (`includes/helpers-svg-gradient.php`) | Picks the correct gradient mechanism per icon source — SVG stroke-gradient (delegates to `sgs_svg_stroke_gradient()`) for `lucide`/`wp-icon`, the text-gradient trio (delegates to `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()`) for `dashicon`/`emoji`, since those render a `<span>` not an `<svg>` and paint via `color:` like any other text node. |

⛔ **Never call `sgs_svg_stroke_gradient()` directly on a block whose icon source can be `dashicon` or `emoji`** — it targets an `<svg>` selector that doesn't exist for those sources, a silent no-op. Use `sgs_icon_gradient_css()` instead; for a block whose icon is provably always lucide/wp-icon (no source picker, or the picker's value never reaches render), a direct `sgs_svg_stroke_gradient()` call is not wrong, but `sgs_icon_gradient_css('lucide', ...)` is the standard convention — matches every other icon-hosting block on one call shape. **Open gap:** a block whose REPEATED items each declare their own icon source (e.g. `sgs/icon-list`) can't be fixed by one `sgs_icon_gradient_css()` call — that needs a per-item design, not a call-site swap.

**The bespoke custom-property pattern — NOT a shared helper, block-private by design:**

`sgs/option-picker`'s ENTIRE colour system (base/hover/selected/border, across three style
variants — outlined/filled/ghost) is built this way rather than through any of the above:
render.php emits `--sgs-op-*` CSS custom-property VALUES (`$var_decls[] = '--sgs-op-bg-hover:'
. sgs_colour_value(...)`), and style.css's per-variant rules consume them via a `var(--sgs-op-
bg-hover, var(--sgs-op-bg, <preset-default>))` fallback chain. **Use this pattern only when a
block has multiple STYLE VARIANTS sharing one underlying colour concept with different
property combinations per variant** — the button/fill/text/border helpers above all assume
one selector with one flat set of colour states, which doesn't fit that shape. There is no
shared helper for this pattern; every adopter hand-rolls its own `--sgs-x-*` chain. It does
NOT support gradient without extra work: a gradient needs `background-image`, and a
`var(--x, …)` chain feeding a fixed `background-color:` declaration can't switch CSS property
based on whether the resolved value is a gradient — that would need a second custom property
or a conditional PHP branch choosing which property to emit, not yet built anywhere.

**Decision table:**

| Element shape | Use |
|---|---|
| One selector, needs background AND/OR border AND/OR text colour, all flat-or-gradient except text | `sgs_button_element_style_css()` if genuinely button-shaped (has border/font-weight/padding too); otherwise compose `sgs_fill_decls()`/`sgs_text_decls()`/`sgs_border_states_css()` yourself |
| One selector, background/border only, no text | `sgs_fill_states_css()` and/or `sgs_border_states_css()` directly |
| One selector, text gradient needed AND no background on that same selector | `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` (MANDATORY companion) |
| One selector, text gradient needed AND a background too | Same as above, but first move the background to `sgs_block_background_layer_css()` |
| Multiple style variants, one colour concept, different properties per variant | The bespoke `--sgs-x-*` custom-property pattern (option-picker is the reference) — gradient needs its own design here, not a drop-in |

### Hover Controls Spec

Blocks with interactive hover states MUST expose these controls in the editor inspector:
- **Per-element colour shifts** — background, text, border colour on hover
- **Scale transform** — `transform: scale()` on hover (GPU-composited, safe)
- **Shadow elevation** — box-shadow transition on hover
- **Image zoom (inner)** — `overflow:hidden` + scale on `<img>` on hover
- **Transition duration** — CSS transition-duration control (default 300ms)
- **Transition easing** — CSS transition-timing-function (ease, ease-in-out, etc.)

These are not just colour shifts. Kadence and Spectra offer transform and shadow controls — SGS must match or exceed.

#### What the UNIVERSAL hover panel is for — and what it is not

Read this before adding `"hover"` to any block's `supports.sgs.enabledExtensions`.

**The one rule: the panel governs a block whose hover target IS the block root.** Nothing else.
`inject_hover_effects()` is a `render_block` filter — it finds the block's first real tag and
classes THAT. It fires once per block, never once per card, tile, step or link. So on a block
whose hover belongs to a repeated child, the panel is not "less useful", it is aimed at the
wrong element, and switching it on gives the client one control acting on the wrapper beside
another acting on the item.

| Panel SUITS (hover target = root) | Panel does NOT suit (hover target = a child) |
|---|---|
| `cta-section` · `team-member` · `info-box` · `pricing-table` · `google-reviews` · `whatsapp-cta` | `card-grid` → `__item` · `post-grid` → `__card` · `gallery` → `__item` · `process-steps` → `__step` · `icon` → `__link` |

**Which effects the panel actually owns.** Scale and shadow it owns outright.

**Zoom/grayscale are scoped per block, not by a root-level rule.** Of the root-hover blocks, only
`cta-section` has a real image to zoom/desaturate — it uses a scoped `::before` rule in
`cta-section/style.css`. `pricing-table` / `google-reviews` / `whatsapp-cta` have no image
element at all (icons or none), so their zoom/grayscale toggles are **withdrawn** via the
`supports.sgs.hoverExcludeControls` block.json declaration (read by both `hover-effects.php` and
its JS twin), gated at both the class-injection point and the inspector UI. `team-member` and
`info-box` have a working toggle. **Net: every root-hover block either has a working
zoom/grayscale toggle or doesn't offer one at all — never a silent no-op.**

**Its shadow vocabulary is four slugs** (`subtle` / `raised` / `floating` / `glow`) **with no
colour input anywhere.** That is why a block-owned `shadowHover` + `shadowHoverColour` pair is
NOT a duplicate of the panel's `sgsHoverShadow` and must not be removed for looking like one —
deleting it swaps a brand-colour swatch for a four-word dropdown.

**Defaults are separate from the panel and are declared by the block.** `supports.sgs.hoverDefaults`
(`{scalePreset, shadow, imageZoom, focusRing}`) is read by `resolve_hover_defaults()` in
`includes/hover-effects.php` and its JS twin, and is honoured **only when the block also opts the
panel in**. A block can have the panel and declare no defaults — that is `cta-section`, and it is
the fix for a banner that scaled whenever the cursor crossed it. There is no block-name list in
either file; a new block declares its own or gets nothing.

⚠ **`focusRing` is near-inert and must not be trusted as a11y cover.** It emits
`.sgs-has-focus-ring:focus-visible` on the block ROOT, and a `<div>`/`<section>` root is not
focusable without `tabindex` (card-grid, post-grid, process-steps, gallery and icon carry none),
so it never matches on them. Real focus styling belongs on the focusable descendant.

## Utility Functions

Import from `../../utils`:

```js
import { colourVar, fontSizeVar, spacingVar, shadowVar, borderRadiusVar, transitionVar } from '../../utils';
```

| Function | Returns |
|---|---|
| `colourVar('primary')` | `var(--wp--preset--color--primary)` |
| `fontSizeVar('large')` | `var(--wp--preset--font-size--large)` |
| `spacingVar('40')` | `var(--wp--preset--spacing--40)` |
| `shadowVar('medium')` | `var(--wp--preset--shadow--medium)` |
| `borderRadiusVar('medium')` | `var(--wp--custom--border-radius--medium)` |
| `transitionVar('fast')` | `var(--wp--custom--transition--fast)` |

Use `DesignTokenPicker` component for colour selection from theme.json palette in the editor sidebar.

## Gotchas

- **Never pin a WooCommerce loop to one product with `core/query` + `include:[id]` — the filter can silently drop and render a different product.** An empty gallery on the wrong product is then misreported as a `sgs/buybox` bug: `buybox`, `product-card` and `Product_Manifest` are keyed purely on product ID, never on ambient loop state. **Use `woocommerce/product-collection` for product loops, or pass `productId` as an explicit attribute** (which is why `sgs/card-grid` is immune by construction). This is WordPress Query-Loop mechanics, not an SGS defect — check WHICH product actually rendered (`context.postId`) before diagnosing an empty product block.
- **NO block deprecations** — see "Block deprecations — not used" below.
- **Core block attribute mismatches** — when `core/heading`, `core/button`, etc. show "unexpected content", the cause is a JSON attribute that doesn't match stored HTML. Fix via the Site Editor: open the template/page, click "Attempt Block Recovery" on each invalid block, then save. NEVER fix via WP-CLI `str_replace` on `post_content` — this breaks block validation and creates cascading failures.
- **Never use `source: html` on dynamic blocks** — if a block's `save()` returns `null` (dynamic render via render.php), attributes with `"source": "html"` can never be read from storage because there is no inner HTML. Use plain `"type": "string", "default": ""` instead.
- **Dynamic blocks with InnerBlocks slots MUST `save: () => <InnerBlocks.Content />`** — `save: () => null` causes WordPress to drop InnerBlocks from `post_content` during save. Editor shows the right structure in memory, save round-trip emits only the parent. Render.php still drives 100% of frontend output; save's only job is to emit the InnerBlocks marker. Pattern: `import { InnerBlocks } from '@wordpress/block-editor'; export default function Save() { return <InnerBlocks.Content />; }`. (`sgs/product-card` has no InnerBlocks slot, so its save is `null`; the rule binds every block that DOES have a slot.) Full detail in `.claude/specs/common-wp-styling-errors.md` row B4.
- **Writing `post_content` via WP-CLI / REST is ALLOWED for sgs/* blocks (Bean-locked).**
  Static blocks store `save.js` output as HTML inside post_content, so hand-edited markup that no
  longer matches `save.js` triggers "this block contains unexpected content". **Every SGS block is
  dynamic** — only a block comment plus an attributes JSON blob is stored, with no saved HTML to
  mismatch, so that failure cannot occur for an sgs/* block. `~/.claude/hooks/wp-content-guard.py`
  is ADVISORY (it notes, never blocks).
  ⚠ **Still take care with:** CORE blocks (static — hand-edited markup DOES break their validation),
  slot-bearing composites whose serialised CHILDREN may be core blocks, and hand-written attributes
  (WP drops any attr the block.json doesn't declare FROM THE EDITOR — client can't see/edit it — but
  PHP does NOT drop it before render.php runs, so a hand-written undeclared attr may render fine
  until the next editor save deletes it). Verify the rendered result.
  For editor-state work (`wp.data.dispatch`) Playwright is still the route.
- **Canary credentials are ALWAYS available — use them, don't ask and don't work around them.**
  `.claude/secrets/sandybrown.env` (gitignored) carries `WP_USER_SANDYBROWN`/`WP_PWD_SANDYBROWN` for
  browser login and `WP_APP_PWD_SANDYBROWN` for REST/Store-API Basic auth. Creating a probe page to
  verify a render change live is a REST call, not a blocker.
- **`style.css` vs `editor.css` are independent** — `style.css` compiles to the frontend-only `style-index.css`. `editor.css` compiles to the editor-only `index.css`. A layout fix in one does not affect the other. When fixing a visual issue in `style.css`, add matching rules to `editor.css` separately if the editor preview should match.
- **`viewScriptModule` vs `viewScript`** — use `viewScriptModule` (ES modules, deferred). Don't use `viewScript` (classic scripts).
- **CSS `color` fallback pattern** — do NOT use `:not([style*="…"])` fallback guards. Under Spec 32 no block emits an inline `style` property declaration, so the guard always matches and the fallback becomes unconditional — it blocks contextual inheritance and can out-rank the operator's own scoped rule. Instead: let the value inherit (no rule), or emit the fallback inside `:where()` so any `.{uid}` scoped rule wins. (A guard at (0,3,0) out-ranks the block's own `.{uid}` title-colour rule at (0,2,0).)
- **`useInnerBlocksProps`** — always use this (not `InnerBlocks` component directly) for proper block editor integration.
- **CPT `custom-fields` support required for meta REST exposure** — a custom post type must declare `'supports' => [ ..., 'custom-fields' ]` in `register_post_type()` for any `register_meta()` call with `'show_in_rest' => true` to expose the `meta` field in REST responses. Without it, meta round-trips silently return nothing.
- **Theme CSS cache-busts off the theme `style.css` Version header, not `block.json`** — SGS theme enqueues `style.css` with `?ver=` derived from the `Version:` field in `theme/sgs-theme/style.css`. Any theme-CSS change (including token updates) requires bumping that Version header (e.g. 1.3.5 → 1.3.6) to bust the browser cache. Bumping `block.json` or plugin version has no effect on theme CSS.
- **No dead controls — parent owns LAYOUT, child owns TYPOGRAPHY (HC2).** When a composite renders its text via child InnerBlocks (`sgs/heading`/`sgs/text`/`sgs/label`), all typography/colour/font-size (every breakpoint) belongs on the CHILD, NOT the parent. A parent control duplicating a child capability is BOTH a forbidden duplicate AND usually **dead by CSS specificity** — a parent scoped rule `.{uid} .sgs-x__y{color}` (0,2,0) cannot beat the child's inline style (1,0,0,0), so it renders nothing. The `check-dead-controls.js` prebuild guard fails the build on any editor-controlled attr that nothing renders. **This scopes the "Block Customisation Standard" §2 ("custom controls per inner text element"): that applies ONLY to blocks that render their own text element — NOT to FR-22-6 InnerBlocks composites, whose text is child-owned.** Verify a control renders via the live DOM (computed style on the actual painted element), not just "the attr appears in render.php".

**HC2 bans a parent PER-ELEMENT typography control, NOT a wrapper inheritable default.** What HC2 forbids is a parent control targeting a specific child element (a rule like `.{uid} .sgs-x__y{font-size}`) — that is a dead duplicate of the child's own typography by CSS specificity. What HC2 PERMITS is the WordPress-native `supports.typography` (`fontSize`/`lineHeight`) declared on the block ROOT (the wrapper element, e.g. `.wp-block-sgs-quote`): WP emits it as an inline style on the wrapper that children INHERIT via normal CSS, and any child's own explicit typography setting still overrides it by cascade. These are two different mechanisms — an inheritable wrapper default vs. a per-element override control — and only the per-element-parent-control form is banned.

## Block deprecations — not used

This project does **not** use block deprecations, because the framework is pre-production (no live content to migrate) and the deprecation pattern is a precedent future agents wrongly copy on every block change. No block ships a `deprecated.js` and none wires `deprecated` into `registerBlockType`.

**Do NOT** create a `deprecated.js`, wire `deprecated` into `registerBlockType`, or add block slugs to a deprecation test. **No version bumps pre-production.** When a static block's `save.js` output or a stored-attribute schema changes, just rebuild; existing dev/canary instances are re-cloned or recovered via the Site Editor's "Attempt Block Recovery" (a block that shows "This block contains unexpected content" is re-inserted or re-cloned). Revisit this policy only when the framework goes to production with real client content to preserve.

## Forms (Built Into This Plugin)

Forms are NOT a separate plugin. The form blocks (`sgs/form`, `sgs/form-step`, `sgs/form-field-*`, `sgs/form-review`) and the form processing engine all live here.

Database table: `{prefix}sgs_form_submissions`
REST namespace: `sgs-forms/v1`
Notifications: N8N webhooks (not wp_mail)

## Key Rules

- Every block reads colours/fonts from theme.json tokens — never hardcode
- **THE DEFAULT-vs-HARDCODE TEST (Bean-locked).** The question is NOT *"is it a literal?"* — it is **"does it override a theme-wide default, or hinder the pipeline?"**
  - **A block literal that DUPLICATES a theme.json `styles.elements` default is a silent override that disables the theme** — not a "helpful default". **Check `theme/sgs-theme/theme.json` BEFORE adding any typography literal to a block.** Example: a heading block carrying `fontSize` + `font-weight` + `line-height` literals beats theme.json at `(0,2,0)` vs `:root :where(h1..h6)` `(0,1,0)`, so an `<h1>` and an `<h6>` render **identically** on every client, through a green build. theme.json already defines the whole scale (`elements.h1..h6` fontSize; `elements.heading` weight/lineHeight/family; h5/h6 per-tag overrides).
  - **A component's OWN constant STAYS** — it overrides no theme-wide default and is overridable per instance: `sgs/label` `fontSize:12` (an eyebrow/kicker `<span>`, NOT an h-tag equivalent — an `<h5>` above an `<h2>` would fragment the heading outline), `sgs/business-info`'s `#d4a73c` credit hover colour (its
    hover effect ships BOTH a `background-clip:text` colour sweep AND a separate `::after`
    underline growing in sync, because the two travelling at different speeds look broken —
    see Spec 02 §business-info),
    `SGS_ATTRIBUTION_URL/TEXT`. Sibling rule: a hardcoded CLIENT value is a bug (`framework-block-client-hardcode-is-a-bug-not-a-constant`); the component's own constant is not.
  - **`null` default = inherit** is the canonical pattern (`sgs/button`, `sgs/heading`, `sgs/product-card` `ctaFontSize`). The shared responsive emitter's contract (`includes/helpers-responsive.php`) is *"`''` when nothing is set"*, so a null default emits no rule and the theme wins.
  - Enforced by **F3b** in `check-hardcoded-render-defaults.js` — it reads theme.json `styles.elements` and flags a literal block.json `default` that flattens a theme-differentiated property. It fires ONLY on blocks declaring an enum of element keys (`sgs/heading` `level: h1..h6`), so a single-element block never trips it.
- **WordPress silently DROPS any block attribute the block.json does not declare — but only on the EDITOR/JS surface.** `getBlockAttributes()` builds `attributes` from the registered schema, so the client can't see or edit an undeclared attr — no error, no warning, no failing test, no failing build. ⚠ **PHP does NOT drop it** — `WP_Block_Type::prepare_attributes_for_render()` `continue`s past an unrecognised key rather than `unset()`-ing it (unset only fires for a DECLARED attr that fails schema validation). A value hand-authored into a theme pattern/template (as opposed to saved through the editor, which filters before writing `post_content`) reaches `render.php`'s `$attributes` unchanged and may be painting the frontend right now — e.g. `sgs/container/render.php` genuinely consumes an undeclared `backgroundColor` to emit a live `has-{slug}-background-color` class. **Treat a finding as "editor can't touch this", not "dead at render" — check render.php before deleting an authoring or a read.** Typical findings: `"type"` where `sgs/business-info` declares `displayType`; American `"textColor"` where it declares British `"textColour"`. Gate: `python scripts/check-dead-pattern-attrs.py`. **Never blanket-rename `textColor`→`textColour`** — American spelling is CORRECT on core blocks; scope any rename inside `wp:sgs/*` comments only.
- Frontend JS: vanilla only, no jQuery, no external libraries — **bounded by the four-tier motion doctrine (Spec 38 §1). Tier V (vanilla/CSS) is the default for every effect. Sanctioned exceptions, all npm-bundled and conditionally loaded: Tier G (GSAP) for effects vanilla cannot reach; Tier H — a CLOSED list of single-purpose helpers, currently Lenis alone for site-level smooth scrolling, admitted per §1.2a; Tier W — a WebGL rendering substrate admitted only on its own five-part test. A page using none ships zero bytes of any, and no CDN ever**
- Use `viewScriptModule` (ES modules) for frontend interactivity
- CSS scroll-snap for carousels, Intersection Observer for animations
- Progressive enhancement: blocks must render meaningful content without JS
- All inner blocks use `useInnerBlocksProps` correctly
- All REST endpoints: nonces, capability checks, sanitised input, prepared statements
- Responsive: every layout block has mobile/tablet/desktop controls
