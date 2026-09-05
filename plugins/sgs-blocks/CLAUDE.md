# SGS Blocks — Claude Code Instructions

⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST — read
`.claude/THE-MIGRATION-METHOD.md` before the 4th file edit.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here. What separated them was not the census — the slow rollout had one on day 2 —
but whether the TARGET SHAPE was settled first. See THE-MIGRATION-METHOD.md Step 3.

## What This Is

A custom Gutenberg block library (WordPress plugin) that replaces Spectra Pro. Produces clean semantic markup that reads design tokens from the SGS Theme. See build status below for what's built vs. planned.

Full spec: `specs/02-SGS-BLOCKS.md` (blocks) + `specs/04-SGS-FORMS.md` (forms)

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
- `sgs-content` — Info Box, Counter, Trust Bar, Heritage Strip, Card Grid, Testimonial, etc.
- `sgs-interactive` — Accordion, Testimonial Slider, WhatsApp CTA, Option Picker
- `sgs-forms` — Form, Form Step, Form Fields, Form Review

## Build Commands

```bash
npm run build         # Production (includes --experimental-modules for viewScriptModule)
npm run start         # Dev with hot reload
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
```

### Survey detectors — the census half of the script triad (Spec 35 / D542)

```bash
npm run survey:inspector-surface   # OWN vs EXTENSION vs CORE control split, all 83 blocks
npm run survey:length              # length/unit control divergence
npm run survey:colour              # colour control divergence
npm run survey:typography          # typography control divergence
npm run survey:box                 # 4-side box + border conformance
npm run survey:responsive-shape    # TIER-vs-BOX axis conflation (D549)
npm run survey:selftest            # all six self-tests (47 assertions) in one chain
npm run audit:post-content -- <path>   # stored post_content vs current block schemas
npm run audit:element-manifest         # Spec 35 element-manifest conformance
npm run audit:placement-reach          # D537 placement-rule reach
```

**The triad (D542, Bean-locked):** the thing that finds every instance, the thing that fixes them and
the thing that keeps them fixed are the SAME detector — `--survey` (census, run BEFORE the design) →
`--fix` (parameterised codemod) → `--check` (the gate). **If an item touches more than ~3 blocks, the
first deliverable is the detector, not the edit.** Only `--survey` exists today; each phase builds its
own `--fix` when it reaches its migration.

⛔ **These are NOT in `prebuild` and must not be added to it** — they are censuses with no `--check`
mode. Putting a non-gating script in a gate chain is enforcement theatre.
⚠ **They were built and left UNWIRED** (zero `package.json` refs) until 2026-08-09 — this repo's
recorded failure mode, the same one D493 caught running for three weeks. **Never assume a built
detector is reachable: run `npm run gate:list` before believing it runs.**
⚠ **`grep package.json` NO LONGER ANSWERS THIS (changed 2026-08-24, commit `5d2ee0b17`).** The 61-command `prebuild` chain was split into `scripts/gates.json` + `run-gates.py`. Every gate kept its standalone `check:*` alias in `package.json`, so grepping still finds a hit — it now proves the ALIAS exists, not that the gate runs on a build. That is a false positive in exactly the direction this warning exists to prevent. `npm run gate:list` prints each gate's tier and measured cost; `npm run gate:wired` proves the pre-deploy tier is reachable.
⚠ **`survey-inspector-surface.js` counts DECLARED rows**, while D544's live-editor figures count
DEFAULT-VISIBLE ones. **Corrected 2026-08-13 — the OWN-vs-EXTENSION split does NOT reproduce live
measurement** (the script's own D544 calibration table says "Ordering (row-count) MATCHES live:
false"; re-verified live across 4 blocks with a declared:live ratio ranging 1.15x–3.2x, not
constant). Only OWN *panel*-count (not row-count, not the EXTENSION split) has been verified to
match live measurement. Do not quote ANY of its totals — panel-count included, once beyond a single
verified block — as "what the client sees" without a fresh live check.

### Grid-item defaults — scope correction (`b59f8cd3f`, 2026-08-30)

`gridItem*` attrs (padding/gap/border/shadow/colour defaults for a grid's children) are
consumed by exactly **ONE** CSS rule: `.sgs-container--grid > .sgs-container` in
`src/blocks/container/style.css`. That selector paints ONLY a **direct child that itself
carries `.sgs-container`** — so a block qualifies for `gridItem*` attrs only when its own
grid cells are themselves container-wrapper-routed blocks. **`sgs/container` is the only
qualifying block today.** `sgs/cta-section` and `sgs/trust-bar` had declared 15 `gridItem*`
attrs each and rendered `GridItemDefaultsPanel` (~30 client-facing controls total) while
painting nothing — `cta-section` wraps children in `.sgs-cta-section__content`,
`trust-bar` renders `.sgs-trust-bar__badge` divs, neither matches the selector. Removed in
`b59f8cd3f`.

⛔ **`block_composition.container_kind` (section/layout/content) is IRRELEVANT to this
qualification.** It describes the draft-layer model (Spec 31 §13.6), not what CSS a
block's own children actually match. Do not reason from `container_kind` when deciding
whether a block should carry `gridItem*` attrs — check the selector.

### A control that "doesn't work" — diff it against a block where it ALREADY works (Bean-locked 2026-08-31)

⛔ **Do not design a fix from first principles.** Ask which blocks already have the attribute:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql   "SELECT block_slug, attr_name, css_property, css_element, css_tier
     FROM block_attributes WHERE css_property='object-fit'"
```

then read the WORKING block's `render.php` + `style.css` and compare. Measured 2026-08-31 across the
media-atom layer: every "these controls don't mesh" problem resolved this way in minutes, and the DB
query surfaced two blocks (`sgs/brand-strip` `logoFit`, `sgs/trust-bar` `badgeImageObjectFit`) a
hand-written survey of "media blocks" had missed outright.

⛔ **Never weigh "this changes what the canary currently renders."** Pre-production, no content to
protect. Whether a default is RIGHT is a separate question decided on merits — what do the other
surfaces measure? — never on preserving the current page.

**The two findings that came out of it, both now gated:**

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
   selector to `.{uid} .sgs-hero__split-media--image`. Gated in `test-media-atom-parity.mjs`.

### Detector blind spots — both real, both shipped a defect before being found

- **`check-dead-controls.js` asks "is this attribute read by the render surface?"** It
  cannot see "the attribute IS read and emits CSS custom properties that no selector ever
  matches" — that distinction is invisible to a render-corpus scan. This is exactly how the
  ~30 dead `gridItem*` controls above shipped and stayed green through every existing gate.
- **`check-duplicate-controls.js` CHECK 2 scans literal JSX control elements** in a block's
  own `edit.js`. It cannot see a duplicate writer living inside a **row OBJECT LITERAL**
  passed as a config prop — e.g. a `SgsColourPanel` `rows` array entry that writes the same
  attribute another literal JSX control also writes. This is how `sgs/trust-bar`'s duplicate
  `textColour` writer survived undetected.

Neither gap is fixed yet — read them as known scope limits, not solved problems, before
trusting either gate's "0 findings" on a new colour/grid-item-shaped change.

### `scripts/scattered-element-controls.js` — DELETED 2026-09-02, do not rebuild it

⛔ **Retired via `/qc-council` (Bean-directed) after it produced ~600 false-positive findings in
one session.** Its model was "every element (including a block's own `wrapper`) needs its
controls in exactly ONE panel" — flat grouping purely on the DB's `css_element` column, with
zero knowledge of `isWrapper`, `clusters`, or THE PLACEMENT RULE's two-tier structure (D537,
Spec 35 §"THE PLACEMENT RULE"). A `wrapper` element (`isWrapper: true`) is explicitly TIER 2
territory — its controls are SUPPOSED to split across separate property-family panels (Colour /
Border / Padding & margin are three deliberately different panels, not scatter) — so every
"wrapper"-element finding it produced was a false positive by design, not a bug to patch. The
script also self-declared as a "PROTOTYPE (design + feasibility task)" in its own header and was
never wired into any gate. **Use `scripts/placement-reach.py` instead** (below) — it already
implements THE PLACEMENT RULE correctly, is self-tested, and its "CONTESTED" output is the
real, spec-conformant version of what this script was trying to approximate.

### `scripts/placement-reach.py` — how far THE PLACEMENT RULE actually reaches (D537)

Implements THE PLACEMENT RULE (Spec 35, two-tier: TIER 1 = one panel per declared element;
TIER 2 = property-family panel for a `wrapper` element or any control scoped to no element) against
real `block.json` data. `python scripts/placement-reach.py [--block sgs/x] [--self-test]`. Reports
the tier-1/tier-2 split (2,945 declared attrs: 67.6% element panel, 32.4% tier-2 as of 2026-09-02 —
re-run rather than trusting this line) and a **CONTESTED** list: attributes claimable by 2+ elements
per the manifest — a real manifest gap (needs an explicit `attrMap` entry), never guessed at or
silently tie-broken. Companion prebuild gate: `check-element-manifest-conformance.js` (promoted
WARN-ONLY → hard gate at D622).

### Live motion QA — `scripts/motion-qa/` + `npm run qa:motion` (D730)

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

⚠ **Before D730 this directory held 13 probes with ZERO `package.json` references** — the
D338/D493 "built but never wired" failure at directory scale. The runner registers only the
THREE probes that are standing checks with negative controls and stable fixtures; the rest
are one-shot incident artefacts, runnable by hand, NOT claimed as covered. Promoting one
means giving it a fixture and a negative control first.

**LOAD-BEARING CANARY FIXTURES — the deploy gate depends on these four pages:**

| Page | What it feeds |
|---|---|
| 2103 | scrub / scramble / split-reveal (good-by-default) |
| 2109 | motion-path repeat-trigger (D451) |
| 2113 | fx-morph geometry (D452) |
| 2603 | pin-scrub pin + good-by-default |
| 2740 | FR-38-31 flowing gradient, single `pastel` instance (D852/D871) |
| 3037 | wave-gradient SIX-variant canvas split — the 0/0/0/0/1/1 proof (D871) |

All four are titled `[GATE — DO NOT DELETE] …` on the canary so they survive a tidy-up.
⛔ Deleting or emptying any of them **breaks every blocks deploy** until the fixture is
rebuilt. This is a live risk, not a theoretical one: the hero verification report explicitly
invited deletion of its own rig ("probe page 2602 is a test rig and can be deleted"), and
D451's page 2083 is already a 404. Probes reference pages by **ID** (`?p=`), so renaming a
title is safe but re-creating a page under a new ID is not.

⚠ **Canary fixtures rot, and a probe cannot tell you which failure you have.** D451 named
page 2083; it is now a 404. Every probe reports UNANSWERED separately from a real failure —
read its output rather than assuming a regression. ⛔ **The trashed fixtures 2023 / 2114
carry PRE-migration authoring** (`"minHeight":"90vh"` as a flat string); `minHeight` became
a tier object on 2026-08-11, so a flat value is silently coerced to `{}` and every spacer
collapses. Restoring one gives a silently-broken page — author fresh instead.

### Shared-helper adoption — `scripts/migrate-render-closures.py` (D722)

`includes/helpers-box.php` has carried byte-identical shared forms of three sanitiser closures
since 2026-07-12 (`cef1fca9`), auto-loaded via `render-helpers.php`, with docblocks saying they
exist to replace "the local `$sgs_css_length` closures". Only 4 blocks ever adopted them. This
script finished that migration — **121 closure definitions across 57 files** onto three helpers.

```bash
python scripts/migrate-render-closures.py --survey        # census
python scripts/migrate-render-closures.py --fix           # dry run
python scripts/migrate-render-closures.py --fix --apply   # write
python scripts/migrate-render-closures.py --check         # gate
python scripts/migrate-render-closures.py --self-test     # 10 assertions + negative control
```

⛔ **It is a script and not `sed` for one specific reason:** several files use ALIGNED assignment
(`$sgs_css_keyword  = static function`, two spaces). A literal-space find/replace silently skips
them — which is why the closure count read 45 before it read 52. The self-test asserts this case.

**The corner family is now CLOSED (2026-08-21).** `$sgs_corner_shorthand` / `$sgs_radius_shorthand`
are CORNER-keyed (topLeft/topRight/bottomRight/bottomLeft), structurally a different function from
`sgs_box_object_shorthand()`'s top/right/bottom/left — which is why there was nothing to call and
the family was carved out. `includes/helpers-box.php` now provides the missing sibling
**`sgs_corner_object_shorthand()`**, and all 8 definitions + 17 call sites are migrated; the script
owns the family rather than skipping it.

⛔ **The shared helper is UNTYPED on purpose — do not "tidy" it to `array`.**
`before-after/render.php` invokes it with a raw `null` (`$attributes['borderRadiusTablet'] ?? null`)
and relied on its own `is_array()` guard, which the helper now owns internally. A typed-`array`
parameter would throw TypeError and fatal the page. The riskiest existing caller sets the signature.

✅ **The hardened-function migration is DONE (D734, 2026-08-22).** It shipped as its own change,
deliberately separate from this script — a real behaviour change stacked onto a refactor makes
both unfalsifiable, so it never became a mode of `migrate-render-closures.py`. Own codemod,
`scripts/migrate-length-sanitiser.py` (same survey/fix/check/self-test shape):

```bash
python scripts/migrate-length-sanitiser.py --survey        # census
python scripts/migrate-length-sanitiser.py --fix           # dry run
python scripts/migrate-length-sanitiser.py --fix --apply   # write
python scripts/migrate-length-sanitiser.py --check         # gate
python scripts/migrate-length-sanitiser.py --self-test      # 18 assertions + 2 negative controls
```

**204 call sites across 56 files** migrated to `sgs_css_length_value()` (the earlier "207 across
56" line here, and "247 across 58" before that, both counted the definition and
`function_exists` guards as call sites — corrected by classifying each match rather than
counting raw hits). Two sites deliberately EXCLUDED, named in the script's `EXCLUDE` list, never
guessed at: `testimonial`'s `quoteLineHeight` (unitless-legal — feeds `line-height`) and
`google-reviews`' `gr_pct` (a bare percentage the caller appends its own `%` onto — preset-
wrapping it would emit invalid CSS). Live-proven pre/post deploy on a dedicated probe page:
`border-top-left-radius:calc20px1vw` (corrupted, before) → `border-top-left-radius:calc(20px + 1vw)`
(correct, after). ⚠ **Spec 32 §6.1(a2)'s comparison table overclaims one cell** — it says the
hardened function *resolves* `var:preset|spacing|40`; measured, it passes the value through
UNCHANGED (no longer corrupted, but still not resolved). See D734.

### Vacuous core-function guards — `scripts/remove-vacuous-style-engine-guard.py` (D732/D733)

A `function_exists()` check on a CORE function is only meaningful when that function landed AFTER
the plugin's declared minimum. `sgs-blocks.php` and the theme's `style.css` both declare
**"Requires at least: 6.7"**, so **109 guards** (73 at D732 + 36 at D733) were testing for functions
their own floor guarantees — a false branch never reachable on any supported install. Removal is
behaviour-neutral BY CONSTRUCTION, not by measurement.

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
python scripts/remove-vacuous-style-engine-guard.py --self-test    # 14 assertions + negative control
```

⛔ **There were TWO shapes and they are NOT interchangeable.** 64 were STANDALONE (the whole `if`
goes, body de-indents one tab). **9 were COMPOUND** — the dead call ANDed with a REAL condition
(`&& ! empty( $base_margin_obj )`, `! $inherit_style && …`, and one spanning multiple lines).
Deleting the wrapper on those would have silently dropped a live condition. Only the dead conjunct
is removed there. Enumerate before assuming a guard is standalone.

⛔ **`} else {` is brace-NEUTRAL, so naive depth-counting sails straight past it** to the final `}`
and lifts a body that isn't the whole story. Checking the closing line for the word "else" does NOT
work — the real close is detected structurally (a body line at the guard's own indent starting with
`}`). A guard with an `else` is REFUSED, never guessed at. The self-test asserts this, and it caught
the bug for real during the build.

⛔ **Deleting the `if` line outright merges phpcs alignment groups.** The guard line was a visual
separator; without it the statement above becomes adjacent to the de-indented first body line and
`Generic.Formatting.MultipleStatementAlignment` reports a warning HEAD did not have (caught on
`accordion`). The script leaves a BLANK LINE in its place. **The fix for a merged group is a blank
line, NEVER `phpcbf`** — that realigns whole files and turns a scoped change into an unreviewable diff.

⛔ **NEVER remove a POLYFILL DEFINITION.** `if ( ! function_exists( 'x' ) ) { function x() {…} }`
is correct code that makes a file runnable outside WordPress. `helpers-css-safety.php`'s `esc_attr`
guard is exactly this — inside a CLI `--self-test` block, with `scripts/diff-gap-sanitiser.php`
requiring the file standalone. It is KEPT, and the gate exempts that shape. Before deleting any
guard, grep `scripts/` and `tests/` for the filename: several `includes/` files ARE loaded by
standalone harnesses.

⚠ **Counts here were wrong TWICE, the same way: a `src/blocks/*/render.php`-only grep.** "73" was
really 74 and "4 and 3" were really 5 and 5 — every missed site lived in `includes/`. Do not trust a
figure from a convenient subset; run `--check`, which scans `src/` + `includes/` + the theme.

⚠ **The floor is PARSED from the plugin header, never hardcoded.** A lowered floor makes the
affected family load-bearing again, and the gate drops it rather than asserting a stale claim; it
fails closed if the header cannot be read. Wired into `prebuild` + `npm run check:vacuous-guards`.

### Comment-narrative detector — `scripts/extract-comment-narrative.py` (D727)

FIND-only. It never edits. Comments must explain what the code DOES, not what it used to do.

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
UNENFORCED (nothing checks it — keep verbatim, or promote it into a gate). First run: 11
gate-backed, 37 unenforced. ⛔ A STOP-catalogue reference is PROSE, not a gate — counting it as
enforcement was a real bug caught by the self-test, and would have hidden the very list the
script exists to surface.

Open track + ready prompt: `.claude/plans/2026-08-21-comment-narrative-cleanup-track.md`,
`.claude/prompts/2026-08-21-owed-C-comment-narrative-cleanup.md`. Register:
`.claude/reports/2026-08-21-unenforced-prohibition-register.md`.

### Tier-object migration triad — `scripts/migrate-tier-object.py` (Spec 35 / D549 / D554 / D571)

The flat-scalar-trio → tier-object migration (`<prop>` / `<prop>Tablet` / `<prop>Mobile` →
`<prop>: {desktop,tablet,mobile}`) runs PROPERTY-BY-PROPERTY across every block, driven by one
script with the full census → fix → gate triad, now covering all THREE layers a migration touches:

```bash
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --survey       # census
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --fix           # dry-run diff
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --fix --apply    # write it
python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <prop> --check          # CI gate
python plugins/sgs-blocks/scripts/migrate-tier-object.py --self-test                        # 14 assertions
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
— proven safe against two real historical examples (`ContainerWrapperControls.js` and
`site-footer-row/edit.js`, both pre-fix), not invented. Anything that doesn't match exactly is
refused, never guessed at or partially rewritten.

**S3 (render.php reads) — detect only, deliberately NOT auto-applied.** `--survey` classifies
`DELEGATED` (prop never appears — the shared wrapper handles it), `NORMALISED` (already read via
`sgs_responsive_normalise_object( $attributes['prop'] ?? null )`), `RAW` (still a raw
`$attributes['prop']` bracket read — needs the edit), or `UNCLEAR`. There is no `--fix` for this
layer. What makes a render.php read safe or unsafe isn't the read itself, it's what the
surrounding code DOES with the value afterwards (`trim()`? cast? `is_array()` check?) — exactly
where pass 3a's and 3b's real regressions lived (D569/D570: an unguarded `trim((string)$attr)`
PHP-coerced an object attr to the literal string `"Array"`). Auto-rewriting the read without
inspecting what consumes it downstream would risk reintroducing that exact bug class, so this
stays a flagged judgement call for a human or a targeted agent, never a blind rewrite.

⛔ **Why this exists (D571, 2026-08-11):** before the S2/S3 classifier, `--survey` only reported
raw regex hit-COUNTS for edit.js/render.php, which stayed non-zero even on an already-correct
file — so an agent doing pass 3b's migration burned real time (twice, once duplicated in parallel
by another session) hand-re-reading every block to answer "is this already done?" A census that
can't tell done from not-done isn't a census. The classifier regexes are pattern-matching, not a
parser — confirmed to false-positive twice during build (a comment merely MENTIONING
`$attributes['gap']` as prose, and `sgs_responsive_normalise_object()`'s real call signature being
positional, not a string-keyed argument) — both now covered by the self-test's negative controls.
If the shared control/normaliser shapes change again, update the regexes in the SAME commit.

⛔ **Do not run a project-wide JS formatter (`wp-scripts lint-js --fix`, prettier, etc.) as a
post-step on this script's edit.js output "to tidy the indentation".** Tried once during D571's
build: passing an out-of-tree scratch-fixture path to `wp-scripts lint-js --fix` silently fell
back to its default `src/` glob and reformatted **~250 files across the entire plugin** to a
different, stricter style config — caught only because `git status` was checked immediately after
(STOP-CATALOGUE pre-flight ritual), reverted before it touched anything committed. The fixer's own
Python code now handles its own re-indentation (dedent-by-one-level + explicit newline
normalisation) precisely so it never needs an external formatter pass.

### S4 (theme pattern/template folding) — `scripts/migrate-theme-tier-scalars.py` (D571)

The FOURTH place a flat scalar can hide, alongside block.json (S1)/edit.js (S2)/render.php (S3):
hand-authored `wp:sgs/*` block comments in `theme/sgs-theme/{patterns,templates,parts}`. Same
triad, same refuse-rather-than-guess discipline, as a standalone script (different parsing
primitives — JSON inside an HTML comment, not a schema file, so it doesn't share code with
`migrate-tier-object.py`, but the shape philosophy is identical on purpose):

```bash
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --property <prop> --survey
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --property <prop> --fix --apply
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --property <prop> --check
python plugins/sgs-blocks/scripts/migrate-theme-tier-scalars.py --self-test    # 7 assertions
```

**Full triad, auto-applied — but gated on the block's OWN schema, not just the theme text.** A
scalar `"prop":"V"` in a theme file is only a migration target when that block's `block.json`
has ALREADY moved `prop` to `"type":"object"` (S1 runs before S4, by design). Parses each
`wp:sgs/*` comment's JSON via `json.JSONDecoder().raw_decode()` (robust against nested objects
like `spacing`/`padding` — no hand-rolled brace matching), folds the base value + any Tablet/
Mobile siblings into one object, drops the orphan sibling keys, and writes back the minimal JSON
diff so everything else in the attributes object stays byte-identical.

**Proven against REAL git history, not an invented fixture (D571, 2026-08-11):** `--self-test`
replays commit `7b272d81` (pass 3a's real theme fold) — the actual pre-migration state of 4 real
files (3 `patterns/*.php` + `templates/single.html`), fed through the fold, must byte-match the
actual committed post-migration state. It does.

⛔ **A real false-positive this exact ground-truth testing caught before shipping:** the first
version classified ANY scalar value for `prop` as a migration target, with no cross-check against
the block's own schema. Run for real against `gap`, it reported **7 false findings** on
`sgs/nav-menu` instances in header patterns — but `sgs/nav-menu` declares `gap` as plain
`"type":"string"`, never grew Tablet/Mobile siblings, and was never part of this migration at
all. Folding it would have wrapped a value into a shape the block's own schema doesn't declare,
and WordPress would have silently discarded it on load — the exact "quiet loss" this whole
toolchain exists to prevent. Fixed by gating every classification on
`_object_typed_blocks(prop)` (a live scan of every block.json), with a dedicated self-test
regression control so this specific case can never silently regress.

The `--experimental-modules` flag is required for `viewScriptModule` in block.json. Check if stabilised in the installed @wordpress/scripts version.

The `--webpack-copy-php` flag copies `render.php` to `build/` automatically — dynamic blocks won't render without this.

`prebuild`/`prestart` also run `node scripts/check-dead-controls.js --check` — the **dead-control guard** (HC2, D192). It FAILS the build if any block declares an editor control for an attribute that nothing renders (consumes in render.php/save.js/view.js/shared includes). Run standalone with `npm run check:dead-controls`. Accepted exceptions live in `scripts/dead-controls-baseline.json` (empty = zero tolerance). If it false-positives a legit consumption pattern, broaden `collectControlledAttrs`/`isConsumed` in the script — do NOT dump the finding into the baseline. See `.claude/reports/wave2/HC2-COMPLETION-2026-06-09.md`.

**Two gates added 2026-07-15 (D338) — both born from bugs that shipped through a green build:**
- **`scripts/check-dead-pattern-attrs.py`** — WP silently DISCARDS any attr a block.json doesn't declare (no error, no gate, no build failure). Parses every `sgs/*` block instance in theme patterns/parts against its block.json. Found 45; 39 fixed. **No existing gate covered this class:** `check-dead-controls.js` catches the INVERSE (control-without-render); the F3 gate only fires when a block DECLARES the attr; the build never parses pattern markup at all. `--check` exits 1 on any finding. **⚠ Built at D338 but NOT wired into `prebuild` until 2026-08-05 (D493, commit `2d413758`)** — `package.json` had zero references to it for three weeks, so nothing stopped the 45 findings' class of bug recurring even though this section documented it as a standing defence. Verified clean before wiring. Now runs every build via `prebuild` + standalone `npm run check:dead-pattern-attrs`.
- **`check-hardcoded-render-defaults.js` → F3b** — the gate previously read block.json for attribute NAMES only, never their `default` VALUES, which is exactly how `sgs/heading`'s `fontSize: 28` shipped and flattened theme.json's per-h-tag scale for months. It now reads theme.json `styles.elements` and flags a literal default that flattens a theme-differentiated property. Gated on the block declaring an enum of element keys, so single-element blocks (`sgs/label`'s `<span>`) never trip it. Verified by regression-injection, not reasoning.

**`check-dead-api-calls.py` — added 2026-08-16 (D641), a subagent invented `wc_get_price_html()`,
a WooCommerce function that does not exist (the real API is `$product->get_price_html()`), and it
shipped clean through the entire ~50-gate `prebuild` chain because every other gate is a STATIC
source check — none of them execute the PHP handler against real data, so a hallucinated-but-
plausible function name is invisible to all of them. Fatal-erroring in production on every search
that matched a real product until Bean caught it live.** PHP-tokenizer-based (not regex — a naive
text match is exactly the class of miss `check-hardcoded-render-defaults.js`'s own
`stripComments()` bug demonstrated the same session), self-tested to prove it catches the exact
incident call and does not flag real functions/PHP builtins/locally-defined functions/comment
text. Wired into `prebuild` **advisory-only** (`(python scripts/check-dead-api-calls.py --check ||
echo [ADVISORY] ...)`, same pattern as `check-image-controls-support.py`/
`audit-declared-vs-seeded-roles.py` above) — NOT a hard gate yet. First run: 305 baselined
findings (real WP/WC functions not yet in the ~250-entry curated allowlist seed
`scripts/dead-api-checker/wp-wc-function-allowlist.json`); trim the baseline as real functions get
promoted into the allowlist, promote to a hard `--check` gate once it runs quiet on a genuinely
clean baseline. Run standalone: `npm run check:dead-api-calls` (survey/self-test modes documented
in the script's own header).

**Two gates added 2026-08-16 (D639), both wired into `prebuild` in the same commit that built them — see the D338 lesson directly above for why "built but not wired for three weeks" is not acceptable:**
- **`scripts/check-empty-inspector-containers.js`** — an inspector container rendered with **no children**. An empty `<ToolsPanelItem>` still appears in its ToolsPanel's "+" disclosure menu and still takes part in `resetAll`/`onDeselect`, so a client can find it, switch it on, and be shown nothing; an empty `<PanelBody>` opens onto blank space. Both are dead controls in the Spec 35 Part F sense. **No existing gate covered this class, and one shipped through all ~50 gates to prove it:** `check-dead-controls.js` checks the OPPOSITE direction (an attribute with a control but no renderer) — a container whose children were deleted still has perfectly valid attribute wiring, so it reads clean. Earned when moving `<BackgroundPanel>` out of `sgs/site-header` deleted the mount and left the wrapper standing. ⛔ **It is an AST walk, and must stay one — do NOT "simplify" it to a regex.** Two were tried first and both were wrong in opposite directions: `<(Tag)[^>]*?>\s*</\1>` found **0** (the char class cannot cross the `=>` in an arrow-function prop, and every real container has one) and `>\s*\n\s*</(Tag)>` found **471** (it matches the closing `>` of the last self-closing CHILD). A false absence and a false flood from one question; JSX children are a tree. Both failure shapes are `--self-test` fixtures. Standalone: `npm run check:empty-inspector-containers`.
- **`scripts/check-wrapper-capability-preconditions.js`** — two rules over each block's `supports.sgs` (Spec 35 §F.2.1/§F.2.2). **Rule 1 (BLOCKING):** a block declaring `gridItems` in `enabledExtensions` must also declare `layout` — `GridItemDefaultsPanel`'s own `if ( layout !== 'grid' ) return null` is a RENDER-TIME bail that hides the panel once the wrong combination already exists; it is not a guarantee the combination can't be declared. **Rule 2:** `supports.sgs.gridAreas` is **RETIRED** (D639) — any declaration fails the build, including an empty array (`gridAreas: []` would otherwise be the obvious way to keep the key and silence the gate). It began as an orphan guard ("must have ≥1 live reader", Spec 35 Part N's N-2) and building that reader is what proved none was ever needed: `GridAreaPanel` was unreachable and wrote a storage shape D580 retired, and the converter derives area names from the DRAFT's own BEM ELEMENT TOKEN (`assembly.py` step 3d: `parse_sgs_bem(cls).element`, so `sgs-hero__content` -> area `content`), routing through `db.attr_for_area_property()` — `assembly.py:250` states plainly that "no gridAreas lookup is needed". ⚠ Mechanism corrected by /qc-council: this first credited `resolvers/grid_area.py` + `grid_item_areas()`, which are BOTH dead in production (zero callers; `ctx.area_name` never set outside tests). The flag was redundant by construction: the per-area attrs ARE the definition of the regions. Ships with **no baseline** — there were zero violations, and a baseline would only be a hole for the next one. **No `--fix` mode**, deliberately: a codemod injecting `layout` would change a block's rendered capability set as a side effect of a lint run. Rule 2's `dbWriter` input is INJECTABLE — when the real Stage-1 writer landed, four `--self-test` fixtures went green by reading the real tree instead of their fixture, i.e. the self-test silently stopped testing while still printing PASS. Standalone: `npm run check:wrapper-capability` (or `node scripts/check-wrapper-capability-preconditions.js --check`). ⚠ **NOT actually wired into `prebuild` until D643 (2026-08-16), despite this section, Spec 35 §F.2.1 and `dev-setup.md` all stating it was from the day it was built.** It had no `package.json` reference of any kind and no `check:` alias, unlike every sibling gate — the exact D338 "built but not wired" failure recorded three paragraphs above, repeated within a day of writing it down. Wired + aliased at D643 after verifying it passes standalone. **Run `npm run gate:list` before believing any gate in this file runs** — and see the 2026-08-24 note at the top of this file: grepping `package.json` now returns a FALSE POSITIVE, because the gate chain moved to `scripts/gates.json` while every standalone `check:*` alias stayed behind.

**Conformance gates — WIRED (update 2026-07-06 D283).** **Gate A** — the converter golden-fixture regression (`tests/test_converter_conformance.py`) is live (D276 programme). **Gate B — `scripts/check-hardcoded-render-defaults.js` is LIVE + wired into `prebuild`** (it blocks the build when a `render.php`/`style.css` hardcodes a layout/visual constant for a property the block declares an attr for — the F3 family defence; 17 baselined debt items). **E11 selector-aware governance (D283, `d7039a79`):** a PREFIXED-HELPER attr (consumed by `sgs_button_element_style_css` / `sgs_typography_css_rule`, which build the CSS key by `$prefix.'Suffix'` concatenation and apply it to a SPECIFIC call-site selector) governs ONLY those selectors — the gate parses render.php for the helper call, extracts the prefix + selector class tokens, and flags a hardcoded value of that attr's property ONLY when the containing style.css rule references a governed token. Native-attr E1/E6 behaviour is unchanged. This is why adding e.g. `ctaBorderRadius` no longer false-flags an unrelated `.pill`/tag border-radius. Do NOT baseline a prefixed-helper false positive — the E11 governance is the fix. (Original "planned" note: `.claude/reports/wave2/STAGE0-FRS-AND-GATE.md`.)

### S5 (STORED post_content) — `scripts/migrate-stored-tier-scalars.py` (D788, 2026-08-25)

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
python plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py --self-test          # 15 assertions, 3 watched controls
```

Takes a directory of `<post-id>.txt` files (pull them with one `wp post list --format=json`),
matching `audit-post-content-blocks.py`'s input shape.

⛔ **IT FOLDS ONLY WHAT IT CAN PROVE, AND THE REFUSALS ARE THE POINT.** An early revision
folded `padding:"22px"` into `{"desktop":"22px"}` — padding is a BOX object
(`{top,right,bottom,left}`), so that would have silently destroyed spacing site-wide. Four
buckets, per `surveys/survey-responsive-shape.py`'s settled doctrine (Spec 35 Phase 1.4, Bean
2026-08-10): **BOX is a CLOSED, NAMED set** — `padding` / `margin` / `borderWidth` /
`borderRadius` and their prefixed variants (`cardPadding`, `gridItemBorderRadius`, …).
Anything else object-typed is a TIER. That rule classifies all 533 object attributes in the
tree with **zero** left ambiguous.

⚠ **Do NOT re-derive the shape from `default`.** A `"default": {}` proves nothing — 448 of 532
object attrs declare exactly that. A reading based on the default alone concluded 234 were
"undeclared" and proposed an 83-file migration to add information that already existed in the
survey script. Read the doctrine, not the defaults.

⛔ **ENUM violations are a separate class and are NEVER auto-fixed.** A value can be the right
TYPE and still not a permitted one — `layout:"grid"` on `sgs/testimonial-slider`, whose enum
is `["full","split"]`, coerced to `"full"` and rendered the slider at width 0. There is no
correct fold; it is reported and refused.

**Companion gate — `audit-post-content-blocks.py` now checks attribute TYPES.** It previously
checked unparseable attrs / unknown blocks / undeclared attrs / stranded content and passed a
canary page completely clean while that page held **102** type-broken values. It now emits
`type-mismatch` and `enum-violation` (separate classes, for the reason above), handles union
types (`["string","number"]` is legal and is NOT a finding), and tests bool BEFORE number
because `bool` subclasses `int` in Python. It runs on every deploy via `build-deploy.py`'s
`step_oldshape_audit()`, so this class of drift now fails the deploy rather than shipping.

⚠ **NEVER write `post_content` to a page the operator has open in the block editor.** A save
from the editor writes its in-memory state — loaded BEFORE your writes — over everything. It
silently reverted a full session of content fixes on 2026-08-25; only the last write survived.


## Deploy

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

⛔ **NEVER hand-roll tar/scp/ssh.** The recipe that used to sit here did
`rm -rf $WP/plugins/sgs-blocks` **before** extracting the new copy — it deleted the live directory
first, and on 2026-07-14 (D336) that took two client sites down for ~2.5h. It also targeted
`palestine-lives.org`, which no longer exists (removed from `TARGETS` 2026-08-10). Deleted here
2026-08-10 so nobody copies it back.

`build-deploy.py` is the ONE path: dirty-tree gate, `--payload` deadlock-breaker, pre-deploy
stored-content audit, default-ON fail-closed smoke test, `.bak` rollback rotation, and a
post-deploy purge of BOTH cache layers — OPcache (compiled PHP, reset over HTTPS because the CLI
pool keeps a separate one) and the LiteSpeed page cache (rendered HTML). ⚠ This sentence listed
"OPcache reset" as a shipped feature until 2026-08-21, when it was checked and found false; it
is true now because `step_purge_caches()` exists, not because the doc said so.
Scope with `--blocks-only` / `--theme-only`; `--skip-build` reuses `build/`. Do not reach for
`--allow-dirty` (an uncommitted edit was D336's trigger) or `--skip-verify` (it removes the check
that catches a broken deploy).

## Block Build Status

### Content/Layout Blocks

| Block | Status |
|---|---|
| Container | Deployed (SVG background layer added 2026-05-28 D93 — `bgSvg*` attrs + SVG tab in Background panel. **2026-08-17 (D647)** — `main` removed from the `tagName` HTML-tag option (it's always a page-unique landmark, no nesting exception); `nav`/`aside` gained a new `ariaLabel` attr + "Landmark label" control, shown only for those two tags.) **2026-08-21 (D710) — PARTLY REVERSED:** `main` is BACK in the `tagName` option, because removing it outright meant ALL NINE templates authored `tagName:"main"` and ZERO pages rendered a `<main>` landmark (measured live). D647's reasoning still holds and is preserved by a per-request singleton guard in the shared wrapper: the FIRST container claiming `main` renders it, any later one falls back to `section`, so a client duplicating a container still cannot produce two landmarks.) **2026-08-28 correction:** D710 only ever restored `main` to `block.json`'s `tagName` enum — `edit.js`'s `TAG_NAME_OPTIONS` array (the dropdown an operator actually sees) never got the matching entry, so the schema allowed it but the UI couldn't select it. Fixed same day. ⚠ Also found live: `sgs/hero`/`sgs/trust-bar`/`sgs/cta-section` reference `attributes.tagName` only inside their `nav`/`aside` `ariaLabel` conditional — none of the three has an actual tag-picker dropdown at all; only `sgs/container` does. Not fixed this session — flagged for triage. **2026-08-22 (D742) — shop-archive Phase 2 close-out:** `layout` default `""`→`"flex"` (retroactive, matches CSS's own `row` default — same generic gap closed on `sgs/form` too, given its own `"stack"` default); new `minColumnWidth`/`minColumnWidthUnit` grid-column-floor attrs, reusing `sgs/site-footer-row`'s `sgs_intrinsic_columns_track()` mechanism via a new optional `$basis` parameter; editor canvas now mirrors padding/margin/background+text colour+gradient/`bgParallax`/`gridAutoRows`/the background overlay (colour/gradient/opacity/blend-mode) — the overlay mirror reuses `sgs_overlay_decls()` (`helpers-tokens.php`) as its spec rather than a third hand-rolled implementation. `sgs-framework.db` reseeded — `sgs/container: 93 attributes`. ⚠ `bgSvg*` (7 attrs) and grid-item-scoped colour/gradient/shadow attrs remain unmirrored on canvas — named debt, not silently dropped; the grid-item family specifically needs a per-child scoped-CSS mechanism `edit.js` doesn't have yet.) |
| Hero | Deployed (**Split-media per-device TYPE 2026-08-13** — `splitMediaType`/`Tablet`/`Mobile` + `splitVideo*`/`splitSvg*` families replace the old unified `splitMedia` attribute outright, deleted (`4fe39e6d`); a split hero can now be an image on desktop and an SVG on mobile. **Split-media overlay + motion, same session (D596/D597):** `mediaOverlayColour`/`Gradient*` on the split column, separate from the section's own `backgroundOverlayColour` (legacy `overlayColour` deleted — it was a dead duplicate control); `mediaParallax`/`mediaKenBurns`/`mediaAnimationDuration` as a motion pair scoped to the split-media element, mutually exclusive same as the section's own `bgParallax`/`bgKenBurns` pair. **D597 fix:** `hero/style.css` and `container/style.css` each declared a DIFFERENT animation under the identical global `@keyframes sgs-ken-burns` name — silently overwriting whichever loaded last, across every block sharing the wrapper — renamed both. **D598 fix:** the split-order control's swap now applies live in the editor canvas, not just on the published page. **D600 (same day):** `splitImageBleed` tested live (was assumed dead, wasn't) and defaulted to `true` — full-bleed is now the standard split-hero look, not opt-in; then found and fixed to also reach `video`/`svg` tiers (previously image-only — a bled video kept its native aspect ratio and overflowed its column), by targeting the type-modifier class `sgs_tier_media_render()` already emits, no `render.php` change needed. ⚠ Video/SVG tiers still have NO width/height/border/padding/object-fit controls of their own at all — a separate, bigger, still-open gap. **2026-08-15** — a `split-media` element was declared in `supports.sgs.elements` to close a `css_element` drift orphan on `splitImageMobileObjectPosition`. Important correction worth recording: `split-media` and `split-image` are BOTH current, intentional class names carried simultaneously on the same node by `sgs_tier_media_render()` — `split-media` is the type-agnostic base, `split-image` the image-type extra class. Neither is a stale leftover from the D595 image→image/video/svg generalisation, and the compound selector `.split-image.split-media--mobile` is deliberate (dropping either half weakens specificity from (0,3,0) to (0,2,0)). Manifest-only, no render.php change. See `decisions.md` for the D-number.) |
| Info Box | Deployed |
| Counter | Deployed |
| Trust Bar | Deployed (merged certification-bar capability + auto-scroll 2026-05-29 D95 — badgeStyle variants: icon-circle (default), text-only, image-badge; auto-scroll marquee when items overflow columns. Renamed from Trust Badges 2026-05-31. Dual-mode shipped 2026-06-01 FR-24-10. **sourceMode='bound' RETIRED for cloning D182 2026-06-06** (6-persona adversarial-council gated) — converter now emits `sourceMode='typed'` with native item attrs via icon-identity resolver. Canonical modes: `typed` (curated repeater, 3 variants — THE mode for cloned + authored trust-bars) / `wc-product` / `sgs-cpt` (live WC configurator only). `bound` is dead — do NOT add new `bound` emits. version 1.0.0+. **2026-08-15** — a new `badge-label` element was declared in `supports.sgs.elements` to close a `css_element` drift orphan. It exists as a SEPARATE element from the existing `label` element (rather than being merged into it) because `label`'s `css:color` slot is already legitimately owned by the `textColour` attribute for the icon-circle variant — merging was attempted first and produced a routing-determinism build failure. `labelColour` (text-only/image-badge variants, `.sgs-trust-bar__badge-label`) now claims `css:color` on the new element. Manifest-only, no render.php change. See `decisions.md` for the D-number. **2026-08-17 (D647)** — same `main`-removal + `nav`/`aside` `ariaLabel` landmark-label fix as `sgs/container`, applied identically here.) **2026-08-21 (D710) — PARTLY REVERSED:** `main` is BACK in the `tagName` option, because removing it outright meant ALL NINE templates authored `tagName:"main"` and ZERO pages rendered a `<main>` landmark (measured live). D647's reasoning still holds and is preserved by a per-request singleton guard in the shared wrapper: the FIRST container claiming `main` renders it, any later one falls back to `section`, so a client duplicating a container still cannot produce two landmarks.) |
| Icon List | Deployed |
| Card Grid | Deployed |
| CTA Section | Deployed (**2026-08-17 (D647)** — `main` removed from `tagName`; `nav`/`aside` gained an `ariaLabel` + "Landmark label" control, same fix as `sgs/container`.) **2026-08-21 (D710) — PARTLY REVERSED:** `main` is BACK in the `tagName` option, because removing it outright meant ALL NINE templates authored `tagName:"main"` and ZERO pages rendered a `<main>` landmark (measured live). D647's reasoning still holds and is preserved by a per-request singleton guard in the shared wrapper: the FIRST container claiming `main` renders it, any later one falls back to `section`, so a client duplicating a container still cannot produce two landmarks.) |
| Process Steps | Deployed |
| Testimonial | Deployed (D8/D206/D209 2026-06-11 — typed-attr **7-VARIANT** rebuild: classic-card / pull-quote-editorial / rating-led / avatar-spotlight / corporate-logo / case-study-media / minimal-quote; visual thumbnail picker; rich gated optional fields [quote / summary-phrase / name / role / org / avatar / logo / work-image+video / stars-OR-/10-scale / date / verified / source] + per-element typography + hover scale/shadow. save.js→null; deprecated.js v8 migrates legacy scalar+InnerBlocks shapes [page-8 3-testimonial round-trip live-verified]. version 0.3.1. **MERGED to main (D209).** **⚠ Cloning gotcha (D212, 2026-06-11):** `block_composition.has_inner_blocks` MUST be 0 for this block (it's a TYPED leaf now) — it was left STALE at 1 after the D8 rebuild, so the converter still emits child blocks the typed render.php ignores → empty slides on a clone. Fix = the universal DB-driven lift + flag flip (NOT a bespoke handler); plan `.claude/plans/2026-06-11-testimonial-universal-lift-build.md`. **Avatar art-direction tiers 2026-08-07 (D521)** — `avatarMediaTablet`/`Mobile`, object-typed to MATCH `avatarMedia` (a flat value on an object-typed attr is silently coerced to the default, dropping the whole thing). Each tier gets its own `.sgs-testimonial__avatar--{tier}` WRAPPER because `sgs_render_media()` takes no class arg. Deliberately NOT that helper's `mobile_url` `<picture>` path: mobile-only, no tablet step, and not the BEM modifier the cloning pipeline reads.) |
| Testimonial Slider | Deployed |
| Heritage Strip | Deployed |
| Brand Strip | Deployed |
| Notice Banner | Deployed (FR-22-6 InnerBlocks migration 2026-06-02 — render.php echoes `$content` + `sgs/text` child; deprecated.js v3. **E9/D206:** variant bg/border/colour made operator-overridable (`:where()`); dead `dismissible` button (no control / no JS handler) removed. **D209:** `displayMode=announcement` (sticky top/bottom, full-width, z-1000, accessible close + WP-Interactivity dismiss with session/permanent storage, anti-flash script) — announcement-bar block retired and absorbed. Merged to main D209 2026-06-11. version 0.7.0) |
| Icon | Deployed (shape backgrounds 2026-06-02 — `backgroundShape`: none/circle/pill/square/outline; clickable via existing linkUrl/linkTarget; hover controls: hoverIconColour / hoverShapeColour / hoverScale; deprecated.js v1. version 0.2.0) |
| WhatsApp CTA | Deployed |
| Accordion + Accordion Item | Deployed |
| Table of Contents | Deployed (broken — needs debugging) |
| Google Reviews | Deployed |
| Trustpilot Reviews | Deployed (2026-05-11 — looping carousel, white pill header, theme-inherited typography, hover scale + theme-primary border, Schema.org JSON-LD). Sync infrastructure shipped 2026-05-11 commit `06df2807` — see Backend Integrations below. |
| Pricing Table | Built (L14, needs build + deploy) |
| Modal | Built (L14, needs build + deploy) |
| Media | Deployed (image / video / SVG. Video support D97 — mediaType toggle, YouTube/Vimeo/MP4 external embeds, WP-library internal video, poster. **Branded video player 2026-07-04 D269** — a new `view.js` viewScriptModule replaces the native `<video controls>` chrome for DIRECT video with a themed player: centre-play overlay + hover-reveal bottom bar [play/pause, scrubber, timecode, mute+volume, fullscreen], keyboard-operable, accent = theme primary; YouTube/Vimeo iframes untouched; SSR native `<video controls>` = no-JS fallback. **VIDEO-source + poster art-direction tiers 2026-08-07 (D521)** — `videoUrl/Id` + `thumbnail` gain Tablet/Mobile. ⚠ **Video tiers are a RUNTIME SWAP in `view.js`, deliberately NOT the image blocks' sibling-markup pattern**: three `<video>`s each begin fetching and three embeds each load a player. Uses sgs/hero's `data-src-desktop/tablet/mobile` contract; the desktop source still renders as real server markup for no-JS. Bean accepted the embed cost (D521): crossing a breakpoint mid-watch rebuilds the iframe and loses playback position. ⛔ Any node the swap REBUILDS must carry the tier `data-*` forward or the swap is ONE-WAY — that bug shipped-and-was-caught live. **Audio mode REMOVED D269** — the D266 audio mode moved to the dedicated `sgs/audio` block; `replaces=[core/image,core/video]`; version 1.5.0. **SVG art-direction tiers + a CASCADE FIX 2026-08-13 (D595)** — `svgContentTablet`/`Mobile` (string, matching the base type), one `<ResponsiveControl>` gated on the base SVG, sibling `<div>`s toggled by scoped `@media` (the images pattern; inline SVG costs no extra fetch). Every tier passes the SAME `wp_kses()` allowlist as the base — verified live that `<script>`/`onload`/`<foreignObject>` in a TIER are all stripped and never execute. ⛔ The same commit fixed a cascade bug in the ALREADY-SHIPPED image tiers: tablet-set + mobile-empty fell back to DESKTOP at mobile width instead of inheriting TABLET, contradicting `sgs_resolve_tier()`. Both families now call ONE closure that COMPUTES band ownership rather than enumerating rules by hand. Hide rules are COMPOUND (`.base.base--tier`, 0,3,0) because style.css sets `display:block` at 0,2,0 and a bare modifier rule would tie on source order.) |
| Audio | Deployed (NEW 2026-07-04 D268 — `sgs/audio`: a native `<audio>` player upgraded by `view.js` to one of 7 `playerStyle` variants — minimal / waveform / spectrum / radial / oscilloscope / gradient-pulse / hidden. The 4 reactive styles use one shared `AudioContext` + per-instance `AnalyserNode` [`createMediaElementSource`, guarded]; visibility-gated RAF + reduced-motion freeze + first-play graph. Client controls: source [external/media-library], style picker, playback toggles, brand accent+spectrum via `DesignTokenPicker`. AudioObject JSON-LD schema. Progressive enhancement [SSR native player = no-JS fallback; save.js null → no deprecation]. `replaces=[core/audio]`. /qc PASS on sandybrown. version 1.0.0.) |
| Decorative Image | Deployed (status corrected 2026-08-07 — this row still said "Built (L14, needs build + deploy)" long after it shipped). **Art-direction tiers 2026-08-07 (D521)** — per-device media source (`{base}`/`{base}Tablet`/`{base}Mobile`, empty tier falls back up), one `<ResponsiveControl>`-wrapped picker gated on the base media existing. Canonical pattern + the traps: Spec 35 Part D5. ⚠ **NAKED MODE**: `sgs_responsive_image()` emits the `<img>` AS the block root, so tier siblings each carry the uid class themselves and the toggles are COMPOUND selectors (`.{uid}.sgs-decorative-image--mobile`), never descendant — there is no ancestor to descend from. Image media only; the `decorMedia` video branch returns before tiers are built.) |
| Image Sequence | Deployed — **AGENCY-ONLY** (`inserter: false`; setup needs a Python/ffmpeg CLI, not a client task). Scroll-scrubbed canvas frame sequence. **Art-direction tiers 2026-08-07 (D521)** — per-device media source (`{base}`/`{base}Tablet`/`{base}Mobile`, empty tier falls back up), one `<ResponsiveControl>`-wrapped picker gated on the base media existing. Canonical pattern + the traps: Spec 35 Part D5. Tiers apply to the FAIL-OPEN `<img>` thumbnail only — the canvas already art-directs itself via its own per-tier frame pipelines. ⛔ Its `<style>` is assembled ONCE and printed inside the opening `printf`; tier CSS appended after that compiles fine and emits nothing. |
| Image Gallery | Deployed — grid/masonry/carousel + Interactivity API lightbox. **⚠ Corrected 2026-08-10 — this table omitted a row for it entirely while a stale duplicate sat under "Phase 2 — Not Started" describing it as unbuilt.** **Migrated to the FR-37-16 object model 2026-08-10 (D548)**: declares **NO `supports.spacing`** at all (`contentWidth`/`maxWidth`/`padding`/`margin` are object-typed attrs it owns outright) — the last mount of `ResponsiveSpacingPanel`, which is now DELETED (it wrote tablet/mobile attrs no block.json declared, so WP silently discarded them on save; see D548 for the full defect + the deliberate D542 reversal this block accepts). |
| Before / After | Deployed — image/video/SVG per comparison SLOT. Per-device video-autoplay tiers + `BooleanResponsiveControl` (2026-08-07). **IMAGE-pair art-direction tiers 2026-08-07 (D521)** on `{before,after}Image{Id,Url}{Tablet,Mobile}`; tier siblings render INSIDE their own slot or the divider will not clip them. Alt is not tiered (`ImagePickerRow` gained `showAlt`). ⚠ YouTube/Vimeo unsupported by design in the video slot — both sides must stay frame-synced, which needs a CDN player SDK the motion doctrine excludes. ⚠ Tier keys are written as WHOLE literal suffixes (`$prefix . 'ImageIdTablet'`) because `check-dead-controls.js` cannot follow a key whose tail is a second variable — writing them in three parts reports all 8 attrs as fully dead. |
| Mega Menu | Built (L3, needs build + deploy) |
| Option Picker | Deployed (sgs-interactive — exclusive radio-group pill chooser; Spec 24 FR-24-15 / D144 Phase A; no-JS-safe SSR + bubbling `sgs:option-selected` event; WCAG contrast fix on selected pill + overridable `--sgs-option-picker-*` colour vars. **C7/D206:** group-label font-size + colour controls (legend inline style). Merged to main D209. version 0.1.7) |
| Product Card | Deployed (dual-mode: Typed = built-in elements rendered from block attributes — **legacy InnerBlocks machinery PURGED D275 2026-07-04** (no `allowedBlocks`, `save: () => null`, no `$content` bridge, no legacy editor path); Bound = live WooCommerce/CPT. **Spec 27 Phase-1 CONFIGURATOR SHIPPED D164:** Bound variable products read WC's live 48-SKU manifest (`includes/class-product-manifest.php`) seeded into per-instance `data-wp-context`; Size+Flavour pickers swap price/sale/stock/image with 0 XHR; secure add-to-cart via `/sgs/v1/cart/add-item` proxy; cross-attribute availability grey-out + `GET /sgs/v1/cart/availability/{id}`; all 4 a11y gates pass. Colon-event bridge via `data-wp-init` (WP won't bind `data-wp-on--` colon events). overridable `--sgs-product-card-*` vars + cardMaxWidth. **Spec 28 P1 value-ladder SHIPPED 2026-06-05 (D-pending):** SSR comparative per-unit ladder (Bound-mode only, NOT seeded into the 24KB client context) — one row per pack size with per-unit price + Rule-of-100 saving + "Best value" badge; monotonicity guard suppresses worse-value rows; honest claim-suppression when no `_sgs_base_price_pence` single-item reference is set (`framingMode`/`decoyEnabled` attrs; `sgs_value_ladder()`/`sgs_saving_display()` helpers; live-verified contrast 15.71:1). D151/D164 / Spec 27 FR-27-A/B/C/G/H + Spec 28 FR-28-7/8/9/9a/16. **D204 (main):** FP-H built-in-element card (connect+override). **Block-quality 2026-06-11 (feat/block-quality-mirror, not merged):** B3 Advanced-SEO crash fixed (`__experimentalNumberControl`), B4 fresh-card defaults to built-in template (legacy detected by stored InnerBlocks), B5 duplicate bound-mode CTA text/url gated out, B6 trial border overridable (`:where()`); picker-label forwarding (built-in Size/Flavour labels customisable via `pickerLabelFontSize`/`pickerLabelColour`); `packSizes` control wired (typed mode). **Per-element font families 2026-08-27 (D873):** `descFontFamily`/`priceFontFamily`/`priceNoteFontFamily` added — `titleFontFamily` had been the block's ONLY font-family attr, so description/price/note text could never carry a typeface and fell through to the theme. No render.php change was needed: `sgs_typography_css_rule()` builds its key as `$prefix . 'FontFamily'` and render.php already called it for all three prefixes. ⚠ All four are DYNAMIC-KEY attrs — the literal name exists at neither end, so they are carried as documented FALSE POSITIVES in `scripts/block-file-consistency-baseline.json`; a comment naming them does NOT satisfy that gate (it strips comments before grepping). **Typed-card hover 2026-08-27 (D873):** typed cards were deliberately excluded from any hover affordance so clones stayed byte-identical (blub.db 304); Bean REVERSED that — future drafts will carry their own hover effects to clone. A resting 2px transparent border is reserved so only the colour changes on `:hover`/`:focus-within`/`:focus-visible`; ⚠ with the theme's global `box-sizing: border-box` the card's outer size is unchanged but its content box is 4px narrower. **D873 lift bugs CLOSED 2026-08-28 (D875):** the card's own border now correctly renders on the card rather than leaking onto the CTA button (a converter dispatch-order bug, not just a DB fix — see D875), the trial variant's gradient background now paints, and the trial tag's font-size now varies per variant matching its colour. **Card border UI on `SgsBorderControl` (D876/D881)** — the composite matching WP core's native layout. Shape A is CLOSED: all 10 block-private border blocks are migrated (see the Border-controls section above for the standard). ⚠ Two D881 fixes landed on THIS block: its `linked` flag was dropped by the 2026-08-28 migration and restored (without it the card's border colour stored a baked hex instead of the palette token), and a palette-token border colour painted NOTHING here until `sgs_border_states_css()` was fixed to resolve the slug — product-card and `sgs/container` are that helper's only two callers. version 1.16.4) |
| Tabs + Tab | Deployed (first-ever deploy D210 2026-06-11 — native details/summary context-passing, tab-panel `role=tabpanel`; two latent bugs root-caused + fixed live: context-stripped child render and duplicate nested `role=tabpanel`. version 0.2.0) |
| Buybox | Deployed (FR-30-7 / D210 2026-06-11 — thin wrapper block mounting the sgs/product-card Interactivity store; composes N sgs/option-picker pickers + ONE manifest + price row + add-to-cart; proxy-wires the card's view module (`view_script_module_ids`); zero engine duplication; dismissible cart status; operator `soldOutLabel`/`unavailableLabel`; single-variant axes suppressed; foreign-id 4xx handled. **Card-surface colour/border 2026-08-16 (D640 §1/D641 Stream D):** native `supports.color.background`/`text` + border (radius/width/colour/style) + gradients enabled on the root, emitted via `wp_style_engine_get_styles()` (no inline styles) — the root grid was previously zero-paint; `sgs/mega-group` correctly left untouched (no gap). version 1.2.2) |
| Multi Button | Deployed (a group-of-buttons composite mounting N `sgs/button` children; routes through `SGS_Container_Wrapper`, `container_kind='layout'`). **Container-style + child-group-defaults 2026-08-16 (D640/D641 Stream A):** own background colour (pre-existing) + padding (responsive tiers) + background image/video/SVG/overlay + border, full `sgs/container` parity. Child-button LIVE group defaults for background/text/border colour, border radius, font size, font weight — a CSS custom-property fallback chain (`--sgs-mb-btn-<prop>-default`), NOT the Block Context API and NOT editor-time copy (both rejected on evidence). An unset child inherits the group default live; a child with its own explicit value keeps it. Implicit inherit, no visual indicator (Bean's knowingly-accepted tradeoff, D640 §5 — do not re-raise). Distinct from the pre-existing "Apply to all buttons" one-time bulk-fill (`edit.js`'s `applyPresetToAllButtons`) — do not conflate the two mechanisms. version 1.4.0) |
| Product FAQ + Product FAQ Item | Deployed (FR-27-F2 / D202 2026-06-10 — native `<details>`/`<summary>` accordion; ONE merged `FAQPage` JSON-LD via `wp_footer` collector; copy grep-gated to "AI search citation and Bing visibility" — Google deprecated FAQ rich results 2026-05-07. version 0.1.0) |
| Product Search | Deployed (FR-30-5 / D214 2026-06-12 — accessible combobox (ARIA listbox + live region); REST endpoint `GET /sgs/v1/product-search` with 9-step security chain: fail-closed visibility filter (draft products never leak), fixed-window rate-limit (30/IP/min → 429 + `Retry-After`), `no-store`, 1-char guard → 400, XSS-inert (server `wp_strip_all_tags` + client `span.textContent`). `displayMode` attr: `inline` (always-visible search bar) / `icon` (native `<details>` expand-on-click). No-JS GET form fallback (`name=s` + hidden `post_type=product`). `check-product-search-guards.js` (11 guards) wired to prebuild. **Colour + ⌘K overlay + rich results 2026-08-16 (D640 §6/D641 Stream B):** 5 client-controllable colour rows via `SgsColourPanel`; new `command-palette` display mode (Ctrl/Cmd+K, centred blurred-backdrop modal) extends the existing `full-screen-overlay` `<dialog>`/`store('sgs/nav')` containment rather than adding a second mechanism — ARIA combobox wiring unchanged. Response shape widened to `{id,title,permalink,thumbnail,price_html,on_sale,in_stock}`; result rows show image+price+bolded-match+skeleton-loading. **Two bugs found + fixed via live QC, not the build (D641) — both worth reading before touching this block again:** (1) the colour custom-properties are declared on `.{uid}.wp-block-sgs-product-search`, but `view.js` reparents the dialog to `<body>` on open, taking it outside that DOM subtree — the dialog now also carries the uid class directly and the colour rule keys on the uid alone; (2) `price_html` briefly called `wc_get_price_html( $product )`, which does not exist in WooCommerce — the real API is `$product->get_price_html()`, now fixed. version 1.1.0) |
| Filter Search | Deployed (FR-30-6 / D214 2026-06-12 — type-to-find narrowing inside a WC Product Filter group; auto-shown at ≥16 visible terms (Baymard threshold); visibility-scoped term counting (`hide_empty` excludes draft-only terms so the threshold uses published-only counts); ARIA "N of M options shown" live region; "No matching options" empty state; core URL-filtering untouched. **Colour 2026-08-16 (D640 §6/D641 Stream C):** 3 colour attrs via `SgsColourPanel` (input border, focus ring, text); the one hardcoded grey now reads a theme token. version 1.0.0) |
| Collapsible Text | Deployed (D213 2026-06-11 — operator SEO copy block with accessible read-more; full text always SSR'd via CSS `line-clamp` (not `display:none`); toggle labels i18n'd via server-emitted `data-read-more`/`data-read-less`; empty content renders nothing. version 1.0.0) |
| Cart | Deployed (WooCommerce mini-cart count badge v1 — Store API hydrate, SSR 0 then client-hydrate, no jQuery, cart-fragments dequeued, editor static placeholder; badge-increment E2E verified 2026-06-03; drawer mode = Phase 2) |
| Heading | Deployed (redundant `hero` block-style removed 2026-06-03 Task D. version 0.5.1) |
| Responsive Logo | Deployed (Track 2 nav/header/footer merge). **2026-08-05 (D496):** tier attrs renamed prefix→suffix (`desktopLogoId`→`logoId`/`logoIdTablet`/`logoIdMobile`); added string `logoUrl`/`logoUrlTablet`/`logoUrlMobile` mirroring `sgs/media`'s `imageId`+`imageUrl` pair (ID wins, URL falls back) — `alt` now `role='image-alt'` with `alt_companion_attr='logoUrl'`, retiring the interim `authored-alt-text` category for this block (see D490's correction + D496). Also fixed an editor-only data-loss bug: `edit.js` read an undeclared `_desktopLogoUrl` attr that WP silently discarded, so every preview URL went `undefined` on reload despite the ID and frontend both being correct. ⚠ `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` still shows the pre-rename `desktopLogoId` shape as of this writing — that reference is `/sgs-update`-regenerated, not hand-edited; re-run it to refresh. |
| Site Header / Site Footer | Deployed (Track 2 nav/header/footer merge). **2026-08-05 (D496):** 32 flat per-side responsive spacing scalars replaced by 8 box-object attrs (`padding`/`paddingTablet`/`paddingMobile`/`margin`/`marginTablet`/`marginMobile` + siblings) per Spec 32's `box_family`-driven `BoxControl` pattern, matching every other box-object migration rather than carrying bespoke per-side scalars. **Header completeness 2026-08-19 (D681-D684), live-verified:** `contrastSafe` is PER-DEVICE and no longer silently overrides an operator's explicit "None" — an editor advisory naming the affected device tiers replaces the rewrite, and all five behaviours are now uid-scoped per-tier CSS (the LAST `body.sgs-header-behaviour-*` rules are gone; `Sgs_Header_Behaviours` 323→133 lines, its second per-page-load `parse_blocks()` deleted). A four-value enum needed the new N-value emitter `sgs_emit_tier_rules_map()`; the binary `sgs_emit_tier_rules()` now delegates to it. Transparent's two states are client-reachable (`backgroundColourScrolled`/`textColourScrolled` + gradients + `headerTransparentDirection` to invert the pair); `force-solid` emits NO CSS — it is resolved as a SUPPRESSOR of transparent, removing the old `!important` fight. **Header colour migrated off WP-native `supports.color` into `SgsColourPanel`** (sub-flags all false, key retained for the uniformity gate) and `scrolled` is admitted to `golden-controls.json`'s REAL state vocabulary. `shadow` MOUNTED (it rendered but no control existed); 13 unreachable attrs deleted (12 `shapeDivider*` + `tagName`, so the header is permanently a `<header>` landmark), 56→43. ⛔ **Retiring native colour broke 7 header patterns silently** — WP stops registering `backgroundColor`, and `check-dead-pattern-attrs.py` MISSES it because it asks whether `supports.color` is declared, not whether its sub-flags are on; every block adopting the conformant "declared, all-false" shape inherits that blind spot (D683). |
| Site Header Row / Site Footer Row | Deployed. **2026-08-19 (D684 + row colour fix):** behaviour controls renamed by SCOPE ("Row background transparent" / "Collapse this row on scroll" / "Reduce this row's padding on scroll") — the header and row versions produce genuinely different output, so the duplication was a NAMING problem, not redundancy. ⛔ **A palette colour on a row rendered NOTHING and did so silently:** `backgroundColour`/`textColour` went RAW to `wp_style_engine_get_styles()`, and `DesignTokenPicker` stores a token SLUG when `linked: true`. Proven on the canary — the style engine neither resolves nor rejects a bare slug, it emits the literal `background-color:primary;`, which is invalid CSS the browser drops. Both blocks now route through `sgs_colour_value()` (slug → `var(--wp--preset--color--…)`, raw hex passes through). Any block feeding a DesignTokenPicker value to the style engine RAW has this defect. |

> **sgs/svg-background retired 2026-05-28 (D93).** SVG background capability merged into `sgs/container` as `bgSvg*` attrs (7 attrs: `bgSvgContent`, `bgSvgPosition`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `bgSvgOpacity`, `bgSvgMinHeight`, `bgSvgTextShadow`). Existing posts auto-migrate via `deprecated.js` v2 entry in container.

### Form Blocks (12 built)

| Block | Status |
|---|---|
| Form | Deployed |
| Form Step | Deployed |
| Form Review | Deployed |
| Form Field: Text, Email, Phone, Textarea, Checkbox, Radio, Select, Tiles, File, Consent | Deployed |

### Extensions (4 built)

| Extension | Status |
|---|---|
| Animation (15 scroll animation types) | Deployed |
| Responsive Visibility (device show/hide) | Deployed |
| Hover State Controls (bg/text/border colour) | Deployed (4 blocks: Info Box, Card Grid, CTA Section, Hero) |
| Off-Canvas Mobile Nav (M17) | **RETIRED (D337 / Wave 2, commit `7c60b8ff`, 2026-07-14)** — `sgs/mobile-nav` + `sgs/mobile-nav-toggle` deleted; the off-canvas drawer is now owned entirely by `sgs/adaptive-nav` (own burger toggle + native `<dialog>` drawer). *(Corrected 2026-07-16: previously miscited "Task 1 / D336" — D336 is the site-takedown incident, not this deletion. Still present on `main`; deletion lands on branch merge.)* |

### Backend Integrations

| Integration | Settings page | Option key (read by) | Auto-sync | Status |
|---|---|---|---|---|
| Google Reviews | Settings > SGS Google Reviews | `sgs_google_reviews_settings` (sgs/google-reviews block) | Cache TTL (1-168h transient) | Deployed |
| Trustpilot Sync | Settings > SGS Trustpilot Sync | `sgs_trustpilot_data` (sgs/trustpilot-reviews block, `dataSource: synced`) | WP-cron `sgs_trustpilot_sync_event` weekly/daily | Deployed (2026-05-11, commit `06df2807`) |
| Font Library Collection | Site Editor > Styles > Typography > Manage fonts | n/a — `wp_register_font_collection( 'sgs-google-fonts' )` on init | Manifest fetched on modal open only | Deployed (2026-05-12, commit `55a6d73e`) |

**Font Library Collection notes:**
- PHP class at `includes/class-font-collection.php` (`SGS\Blocks\Font_Collection`) — registers the collection with `wp_register_font_collection()` on `init`, guarded by `function_exists()` for WP <6.5 (silent no-op on older WP).
- Manifest at `assets/font-collections/google-fonts.json` (~2.5 MB, 1,923 fonts, 5 categories) — pre-built from uimax `google_fonts` table by `scripts/build-font-collection.py` (idempotent; re-run when uimax google_fonts is refreshed). Gzip + 30-day immutable cache via `assets/font-collections/.htaccess` (Apache + LiteSpeed directives).
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
- Lesson: `~/.openclaw/workspace/memory/learning/2026-05-11-sgs-trustpilot-sync-via-browserless-working-setup.md` and blub.db row 238

### Phase 2 — Not Started (P1 priority)

| Block | Notes |
|---|---|
| Post Grid / Query Loop | Grid/list/masonry/carousel + AJAX pagination + category filtering |
| Countdown Timer | Date-based + evergreen; flip/simple variants |
| Star Rating | SVG stars; Schema.org/Rating |
| Team Member | Photo/name/role/bio/socials; Schema.org/Person |

### Phase 2 — Extensions Not Started (P1 priority)

| Extension | Notes |
|---|---|
| Hover scale transform | `transform: scale()` on hover (GPU-composited) |
| Hover shadow elevation | Box-shadow transition on hover |
| Hover image zoom (inner) | `overflow:hidden` + scale on `<img>` |
| Transition duration/easing control | CSS transition shorthand per block |
| Block link (wrap entire block in link) | URL + target in inspector |

See `docs/plans/2026-02-21-master-feature-audit.md` for the full 354-feature graded roadmap.

Update this table as blocks are committed/deployed.

## Block Customisation Standard (MANDATORY)

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

> **TYPOGRAPHY — use the SHARED component, never bespoke font controls (MANDATORY, Bean R-22-13 2026-06-11).** For ANY per-element typography (font size / weight / style / line-height on a title, label, pill, link, price, etc.) use the shared **`TypographyControls`** component (`src/components/TypographyControls.js`, exported from `../../components`) in edit.js + the shared **`sgs_typography_css_rule( $attributes, $prefix, $selector )`** helper (`includes/helpers-typography.php`, auto-loaded via `render-helpers.php`) in render.php. This gives the canonical SGS inspector UI everywhere: **font size = `<ResponsiveControl>` wrapping a `<UnitControl>` (number + unit in one integrated input — NOT a RangeControl + separate SelectControl dropdown)**, **weight + style = SelectControl dropdowns**,
>
> ⚑ **CORRECTED 2026-08-10 (Spec 35 Phase 1.2).** This line used to read *"`<ResponsiveControl>` **device-icon switcher** wrapping a `<UnitControl>`"*. `ResponsiveControl` **no longer renders any switcher** — its own docblock now says so. The device tier is chosen ONCE, in the global toggle docked at the bottom of the inspector (`src/blocks/extensions/responsive-device-toggle.js`), which is a text-labelled `ToggleGroupControl`, not device icons. `ResponsiveControl` still wraps the control and still passes the tier to its child, so the rest of this rule is unchanged — but anyone building from the old wording would expect per-control device icons that no longer exist. ⛔ Do NOT add a per-control switcher: `inspector-scan` rule 25 flags it. **line-height = `<UnitControl>` (number + unit; empty string unit = unitless, matching the PHP helper's `''` → unitless semantic)**. Attr shape per element: `{prefix}FontSize` (number) + `{prefix}FontSizeUnit`/`Tablet`/`Mobile` + `{prefix}FontWeight`/`FontStyle` + `{prefix}LineHeight`/`Unit`; the helper emits a per-instance uid-scoped `<style>` (base + tablet + mobile) and honours a legacy STRING fontSize verbatim for back-compat. Do NOT hand-roll a TextControl/SelectControl font-size or emit `--x-font-size` CSS vars per block — that path produced the inconsistent stacked-RangeControl + unit-dropdown controls this rule exists to kill. Blocks already on it: text/heading/button/label/quote (canonical) + counter/whatsapp-cta/mobile-nav/option-picker/trust-bar/product-card (migrated 2026-06-11). Adopt it for every new typography control + keep all blocks aligned.

1. Native WordPress `supports` for wrapper-level controls (colour, typography, spacing, border)
2. Custom attributes + controls for each inner text element (colour via `SgsColourPanel` — see "Colour controls" below; font size/weight/style/line-height via the shared `TypographyControls` component — see box above)
3. Custom attributes + controls for interactive elements like CTAs (text colour, background colour)
4. Do NOT use `:not([style*="…"])` fallback guards. Under Spec 32 no block emits an inline `style` property declaration, so the guard always matches and the fallback becomes unconditional — it blocks contextual inheritance and can out-rank the operator's own scoped rule. Instead: let the value inherit (no rule), or emit the fallback inside `:where()` so any `.{uid}` scoped rule wins.
5. Use Block Selectors API in `block.json` to target native typography to primary text element
6. **Variant-bearing blocks MUST declare `supports.sgs.variants`** in `block.json` — a map of `variant_value → [attr/slot names that variant uses]` — so the cloning converter can detect the correct variant from what the draft extracted, without per-block code. The variant-selector attr name (e.g. `variant`, `variantStyle`, `layout`) MUST also be registerable to the `blocks.variant_attr` DB column via `/sgs-update`. (FR-22-20, DESIGN/build-pending — see Spec 22 §FR-22-20 + D133. Build = next session opening task.)

### Border controls — `SgsBorderControl` is the one shape (D876/D881)

⚠ **This line said "ten blocks" for weeks and drifted 4.4x — verified 2026-08-30 by grepping
`<SgsBorderControl` across every `edit.js` rather than trusting the cached figure.** **44 blocks
mount it** (the Shape-B border migration's full rollout — everything from the original 10 through
`before-after`/`product-faq-item`/`form-step`/`form-field-tiles` and the rest). One more
(`sgs/whatsapp-cta`) is radius-private-only and correctly does NOT mount it — it declares no
`borderWidth`/`borderStyle`/`borderColour` at all, radius rides `__experimentalBorder` instead.
Three blocks (`card-grid`, `multi-button`, `trust-bar`) still carry an ACTIVE native
`__experimentalBorder` support (radius+width+colour+style) — the codemod's own `--survey`
refuses them as `ambiguous-anchor`; not yet migrated, not a regression. *(Note: `sgs/media`
migrated to full block-private border attributes at Wave 5b, 2026-09-01 — it left the native
group, and its swap IS done, just not via a direct `edit.js` mount. Border renders through the
shared `box-shape` atom's composition chain — `box-shape.control.js` → `MediaPanelLayout` →
`MediaBoxShapeControls.js`, which already imports and mounts `<SgsBorderControl>` fed the atom's
own `borderWidthValue`/`borderStyleValue`/`borderColourValue`/`borderRadiusValues` props with
zero custom logic. `survey-border-control-migration.py` was corrected 2026-09-02 to follow that
delegation chain [a block declaring the `box-shape` atom in `supports.sgs.mediaElements[].atoms`
now has its border classification resolved by checking whether `MediaBoxShapeControls.js` itself
mounts `SgsBorderControl`, rather than text-searching only the block's own `edit.js`] — `sgs/media`
now correctly classifies `PRIVATE_DONE`.)* **Never cache this count again — run `grep -l '<SgsBorderControl' src/blocks/*/edit.js | wc -l` yourself** (note this grep alone under-counts by one: `sgs/media` mounts it only via the atom chain, not its own `edit.js`).

Census + ratcheted gate: `scripts/survey-border-control-migration.py`
(`PRIVATE_NEEDS_SWAP` ceiling is **0** as of 2026-09-02, after the `sgs/media` misclassification
was fixed at the detector — check `CEILING` in the script rather than trusting a prose figure).
Codemod for the edit.js swap: `scripts/migrate-border-control.js`
(`--survey`/`--fix`/`--check`/`--self-test`). Codemod for the broader Shape-B storage migration
(radius+width+colour off WP-native, per-block): `scripts/migrate-border-shape-b.js`.

The control is a PAIR: border width (box object) + colour, with **border STYLE
inside the colour popover** (native `BorderBoxControl` opens both from one
swatch), plus the SGS-wrapped native radius as the second control when the
caller wires `onRadiusChange`.

⛔ **`linked` is load-bearing — never drop it when wiring a colour row.**
`GradientCapableColourControl` reads it to decide whether a picked colour is
stored as the palette token SLUG or a baked hex. Without it the client's colour
is frozen against every future re-skin. Multi-state carries `linked` per state;
single-state uses `SgsBorderControl`'s `colourLinked` prop. Both hand migrations
AND the codemod dropped it initially and 14 green assertions missed it (D881).

⛔ **Per-device border WIDTH is CANCELLED, not deferred** (Bean, 2026-08-29). No
use case, and it would cost `borderWidthTablet`/`Mobile` attrs plus `@media`
emission in every block. Do not rebuild it.

⚠ **A palette SLUG is not a paintable value.** `sgs_border_states_css()` feeds
its result into `background:` inside a masked `::before` ring that also sets
`border-color:transparent` — so an unresolved slug paints NOTHING rather than
degrading visibly. It resolves through `sgs_colour_value()` since D881. Any new
border path handing a raw slug to CSS has this defect; a raw hex hides it.

**Live check:** `node scripts/qa/check-border-roundtrip.js --blocks sgs/x,sgs/y`
— positive instance + a `borderStyle:"none"` negative control, frontend computed
styles, fail-closed (a missing browser exits non-zero, never green). ⚠ It measures
the OUTERMOST `.wp-block-sgs-<name>`, so it cannot target `sgs/container` on a
page with a header, and NOT RUN is not a pass.

### Colour controls — `SgsColourPanel` is the standard (D609/D618/D622)

**65 of 83 blocks mount `<SgsColourPanel`** (verify: `grep -l "<SgsColourPanel" src/blocks/*/edit.js | wc -l`)
— **never cache this count, re-run the grep.** It is ONE SGS-owned `PanelBody` titled
"Colour" (`src/components/SgsColourPanel.js`), rendered in the `styles` InspectorControls
group, that takes a `rows` array and renders one `DesignTokenPicker`
(or `GradientCapableColourControl` for a `gradientCapable: true` row) per entry. Do NOT
hand-roll a bespoke colour `PanelBody` — mount this component instead.

- **A row that doesn't apply is OMITTED, not disabled (D609 field 9c).** `SgsColourPanel`
  runs `rows.filter(Boolean)` and returns `null` outright if every row is falsy — no empty
  panel, no greyed-out control. The caller inlines the condition directly in the array
  literal (`showIconColourRow && { key: "icon", … }`). Reference implementation:
  `src/blocks/icon-list/edit.js` — read the comment above its `rows={[…]}` block, it cites
  D609 9c by name.
- **Row helpers `fillRow`/`textRow`/`borderRow`** (`src/components/colour-variants/`) return
  row DESCRIPTOR objects, not JSX — they build the `{ key, label, states, … }` shape
  `SgsColourPanel` expects from an attrs+attributes+setAttributes triple. ⚠ **`borderRow` has
  ZERO adopters tree-wide** (`grep -rl "borderRow" src/ --include=*.js` returns only its own
  definition file and the `src/components/index.js` barrel export) — do not treat it as a
  proven pattern; verify before adopting.
- **Colour lives inside an ELEMENT's own panel only where a purpose-built paired composite
  exists** (colour + a non-colour control sharing one row — e.g. border colour sitting next
  to border style/width in `SgsBorderControl`). There is NO general mechanism for mounting a
  colour row inside an element's own panel, and none should be built without a design gate —
  `SgsColourPanel` hardcodes its own `InspectorControls`/`PanelBody`, and zero blocks render
  a colour control directly inside another panel today.
- **Residual gap — 6 blocks still mount raw `<DesignTokenPicker>`** instead of routing through
  `SgsColourPanel`: `hero`, `info-box`, `mega-panel`, `multi-button`, `pricing-table`,
  `trust-bar` (verify: `grep -l "<DesignTokenPicker" src/blocks/*/edit.js`). `sgs/product-card`
  is the fully-standardised reference (1 `SgsColourPanel` mount, 0 raw pickers).

### Touch-safe HOVER helpers — `includes/helpers-hover-state.php` (2026-09-03)

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

⛔ **Layer 1 alone is not enough, and this is measured, not theoretical.** The media feature
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

### Known precedent-function registry (2026-09-05)

**Check this table BEFORE designing any new colour-emission mechanism.** Built because
`sgs_svg_stroke_gradient()` was independently rediscovered as "the answer" for
SVG paint-gradient 3 separate times in one week by investigations that didn't know it
already existed — wasted search time recurring on a schedule. Add a row here whenever a
future session finds (or re-finds) a working precedent for a problem shape not yet
listed.

| Problem shape | Known precedent | Where |
|---|---|---|
| SVG paint (fill/stroke) gradient | `sgs_svg_stroke_gradient()` + `sgs_svg_inject_defs()` | `includes/helpers-svg-gradient.php:51,199` |
| Text colour/gradient, base OR ancestor-hover, one owned scoped rule | `sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()` (+ `sgs_hover_state_rules()`'s 4-arg form for ancestor-hover) | `includes/helpers-tokens.php:1124` + worked example `src/blocks/post-grid/render.php:670-689`, `src/blocks/brand-strip/render.php:502-515` |
| Per-item dynamic-loop colour (repeater/query loop) | `:nth-child(N)`-scoped rule per iteration | `src/blocks/pricing-table/render.php:171,223-248` (`ribbonColour`) |
| Fill or text colour, base+hover, flat-or-gradient, one owned rule | `sgs_fill_states_css()` / `sgs_text_states_css()` | `includes/helpers-colour-variants.php:109,215` |
| Background/border custom-property gradient (static compiled stylesheet consumer) | `sgs_custom_property_gradient_decls()` — emits `--var` + `--var-gradient` siblings; stylesheet needs one added `background-image:var(--x-gradient,none)` (or `border-image`) line next to the existing `background-color:var(--x)` line | `includes/helpers-tokens.php:953` — proven on `brand-strip`, `post-grid`, `social-icons`, `form`, `gallery`, `before-after` |
| A block's own `$root_sel`/`$sel_*`-scoped per-instance `<style>` rule needs to override a static compiled stylesheet default (incl. across a block's own WP style variants) | Emit the override into the block's own `$scoped_css[]` array, keyed to its own already-defined selector (e.g. `$sel_pill`) — the scoped `<style>` block is enqueued after the compiled stylesheet, so equal-or-greater specificity wins by source order. No new mechanism needed; every block that assembles `$scoped_css` already relies on this | `src/blocks/option-picker/render.php:415-419` (explicit comment: rules rooted at `$root_sel` "out-specify the variant") |

⚠ The custom-property-gradient row above is BACKGROUND/BORDER only — every live use
feeds a `background-color` or `border-color` custom property. A `color:`-consuming
custom property is the TEXT row above, not this one — even when the block has multiple
WP style variants consuming the same custom property (the variants differ only in
fallback DEFAULT, not in selector/property shape, so they don't change which mechanism
applies).

### Colour EMISSION helpers — the render.php side (2026-09-03)

**Written because the gap cost real time.** A 2026-09-03 session spent most of its length
hand-fixing render.php CSS assembly one block at a time before realising several of these
helpers already existed and already did the job. This section is the "which one do I call"
reference that should have existed first. All live in `includes/helpers-tokens.php` (the
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

All four `$map` shapes are identical: `['base'=>attr, 'hover'=>attr, 'gradient'=>attr, 'hover_gradient'=>attr]` — only `base` is required, everything else optional. **Attribute names are the caller's own** (Bean's ruling, 2026-08-22) — the map adapts to whatever a block already calls its attrs; nothing gets renamed to fit the helper.

**The button-element aggregate — for a genuinely button-shaped element only:**

| Function | Signature | Does |
|---|---|---|
| `sgs_button_element_style_css()` | `( array $attrs, string $prefix, string $selector ): string` (`includes/helpers-button-style.php`) | ONE call reads `{prefix}ColourBackground`/`ColourText`/`ColourBorder` + `Hover` siblings + `ColourBackgroundGradient`/`ColourBackgroundHoverGradient` (added 2026-09-03) + `ColourBorderGradient`/`ColourBorderHoverGradient` (pre-existing, D636), plus border-style/width/radius, font-weight/size, padding, width-type — ALL from one prefixed attribute set. |

⛔ **This helper supports fill gradient and border gradient, but deliberately NOT text
gradient.** A button-shaped element paints text and background on the SAME selector, and a
text gradient needs `background-clip:text` — which would clip that same-selector background
paint to the glyph shapes. Adding text gradient here needs the `::after`-layer treatment
below applied FIRST; it cannot be bolted onto this helper as-is. `sgs/button` itself does not
use this helper (it has its own, richer emitter) — this one is for OTHER blocks' built-in
CTA-shaped elements (product-card's CTA, container's CTA, etc.) and now also modal's close
button / form's prev button, google-reviews' write-review and arrow buttons (2026-09-03).

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

**Which blocks currently need this precondition solved before they can offer a text
gradient**: 43 elements across ~35 blocks currently declare BOTH a `css:color*` and a
`css:background*` member on the same `supports.sgs.elements` entry (query:
`SELECT block_slug,css_element FROM block_attributes …` isn't quite right — the live check is
reading each block.json's `supports.sgs.elements[*].attrMap` for an element with both a
`css:color*` key and a genuinely separate `css:background*` key, i.e. NOT the attribute's own
`{attr}Gradient` sibling). This is `textSharesElementWithBackground()` in
`scripts/inspector-scan/rules/31-golden-colour-control.js:163` — an EXISTING, already-adopted
exemption mechanism, not something to hand-derive per block. It reads the element manifest,
so no block list is hardcoded and none needs to be kept in sync by hand. This is a real,
sizeable backlog (button, container, hero, product-card, trust-bar, nav-menu, cta-section,
info-box, and ~27 more) — closing all of it is its own project, not a quick follow-up.

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

### Hover Controls Spec (Phase 2)

Blocks with interactive hover states MUST expose these controls in the editor inspector:
- **Per-element colour shifts** — background, text, border colour on hover (DONE in Phase 1.3 for 4 blocks)
- **Scale transform** — `transform: scale()` on hover (GPU-composited, safe)
- **Shadow elevation** — box-shadow transition on hover
- **Image zoom (inner)** — `overflow:hidden` + scale on `<img>` on hover
- **Transition duration** — CSS transition-duration control (default 300ms)
- **Transition easing** — CSS transition-timing-function (ease, ease-in-out, etc.)

These are not just colour shifts. Kadence and Spectra offer transform and shadow controls — SGS must match or exceed.

#### What the UNIVERSAL hover panel is for — and what it is not (D808, 2026-08-26)

**Nobody had written this down, and its absence caused a whole session's work to start from a
false premise.** Read it before adding `"hover"` to any block's
`supports.sgs.enabledExtensions`.

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

⚠ **The zoom/grayscale gap this paragraph used to describe is CLOSED (D817/D821, 2026-08-27) —
per-block scoping, not a root-level rule (D796 refused that).** Of the 6 root-hover blocks: only
`cta-section` had a real image to zoom/desaturate — fixed with a scoped `::before` rule on
`cta-section/style.css`. `pricing-table` / `google-reviews` / `whatsapp-cta` have no image
element at all (icons or none) — their zoom/grayscale toggles are now **withdrawn**, not left
inert, via a new `supports.sgs.hoverExcludeControls` block.json declaration (read by both
`hover-effects.php` and its JS twin), gated at both the class-injection point and the inspector
UI. `team-member` and `info-box` already worked before this fix. **Net: every root-hover block
either has a working zoom/grayscale toggle or doesn't offer one at all — no more silent no-ops.**

**Its shadow vocabulary is four slugs** (`subtle` / `raised` / `floating` / `glow`) **with no
colour input anywhere.** That is why a block-owned `shadowHover` + `shadowHoverColour` pair is
NOT a duplicate of the panel's `sgsHoverShadow` and must not be deleted for looking like one —
deleting it swaps a brand-colour swatch for a four-word dropdown (D796).

**Defaults are separate from the panel and are declared by the block.** `supports.sgs.hoverDefaults`
(`{scalePreset, shadow, imageZoom, focusRing}`) is read by `resolve_hover_defaults()` in
`includes/hover-effects.php` and its JS twin, and is honoured **only when the block also opts the
panel in**. A block can have the panel and declare no defaults — that is `cta-section`, and it is
the fix for a banner that scaled whenever the cursor crossed it. There is no block-name list in
either file any more; a new block declares its own or gets nothing.

⚠ **`focusRing` is near-inert and must not be trusted as a11y cover.** It emits
`.sgs-has-focus-ring:focus-visible` on the block ROOT, and a `<div>`/`<section>` root is not
focusable without `tabindex` — measured 2026-08-26: **zero `tabindex` across card-grid,
post-grid, process-steps, gallery and icon**, so it could never match on any of them. Real focus
styling belongs on the focusable descendant.

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

- **Never pin a WooCommerce loop to one product with `core/query` + `include:[id]` — the filter can silently drop (2026-08-01).** Measured: a canary authored with `include:[540]` rendered **1125** instead (the site's newest product), whose gallery is genuinely empty — and the empty gallery was then reported as a `sgs/buybox` bug. It was not: `buybox`, `product-card` and `Product_Manifest` are all keyed purely on product ID and never on ambient loop state, and product 1125's own PDP shows the identical empty gallery with no loop involved at all. **Use `woocommerce/product-collection` for product loops, or pass `productId` as an explicit attribute** (which is why `sgs/card-grid` is immune by construction). This is WordPress Query-Loop mechanics, not an SGS defect — but it produces a convincing false bug report, so check WHICH product actually rendered (`context.postId`) before diagnosing an empty product block.

- **NO block deprecations (policy, 2026-07-04, D270).** This project does **not** use `deprecated.js`. All deprecation versions were deleted plugin-wide (the framework is pre-production — no live content to migrate, and deprecations set a precedent future agents wrongly copy). When you change a static block's `save.js` output or a stored-attribute schema, just rebuild; any existing dev/canary instances re-clone or are recovered via the Site Editor. **Do NOT add a `deprecated.js` to any block, and do NOT wire `deprecated` into a block's `registerBlockType`.** If a block shows "This block contains unexpected content", re-insert or re-clone it.
- **Core block attribute mismatches** — when `core/heading`, `core/button`, etc. show "unexpected content", the cause is a JSON attribute that doesn't match stored HTML. Fix via the Site Editor: open the template/page, click "Attempt Block Recovery" on each invalid block, then save. NEVER fix via WP-CLI `str_replace` on `post_content` — this breaks block validation and creates cascading failures.
- **Never use `source: html` on dynamic blocks** — if a block's `save()` returns `null` (dynamic render via render.php), attributes with `"source": "html"` can never be read from storage because there is no inner HTML. Use plain `"type": "string", "default": ""` instead. This caused the hero headline bug on 2026-03-22.
- **Dynamic blocks with InnerBlocks slots MUST `save: () => <InnerBlocks.Content />`** — `save: () => null` causes WordPress to drop InnerBlocks from `post_content` during save. Editor shows the right structure in memory, save round-trip emits only the parent. Render.php still drives 100% of frontend output; save's only job is to emit the InnerBlocks marker. Pattern: `import { InnerBlocks } from '@wordpress/block-editor'; export default function Save() { return <InnerBlocks.Content />; }`. Caught 2026-05-04 in product-card / cta-section / info-box. Hero already had it. (NOTE: product-card no longer has an InnerBlocks slot — legacy machinery purged D275, its save is now `null`; the rule still binds every block that DOES have a slot.) Full detail in `.claude/specs/common-wp-styling-errors.md` row B4.
- **Writing `post_content` via WP-CLI / REST is ALLOWED for sgs/* blocks (Bean, 2026-08-08).** The old
  blanket ban existed to protect STATIC blocks: they store `save.js` output as HTML inside
  post_content, so hand-edited markup that no longer matches `save.js` triggers "this block contains
  unexpected content". **Every SGS block is dynamic (84/0)** — only a block comment plus an
  attributes JSON blob is stored, with no saved HTML to mismatch, so that failure cannot occur for an
  sgs/* block. `wp-content-guard.py` is now ADVISORY (it notes, never blocks); its blocking form was
  simultaneously over-broad (matched any command containing `str_replace`, and blocked writing the
  probe content needed to verify a render change live) and under-broad (never matched `wp db query`
  with an `UPDATE`, the most destructive path).
  ⚠ **Still take care with:** CORE blocks (static — hand-edited markup DOES break their validation),
  slot-bearing composites whose serialised CHILDREN may be core blocks, and hand-written attributes
  (WP drops any attr the block.json doesn't declare FROM THE EDITOR — client can't see/edit it — but
  PHP does NOT drop it before render.php runs, so a hand-written undeclared attr may render fine
  until the next editor save deletes it; D338, corrected 2026-08-20). Verify the rendered result.
  For editor-state work (`wp.data.dispatch`) Playwright is still the route.
- **Canary credentials are ALWAYS available — use them, don't ask and don't work around them.**
  `.claude/secrets/sandybrown.env` (gitignored) carries `WP_USER_SANDYBROWN`/`WP_PWD_SANDYBROWN` for
  browser login and `WP_APP_PWD_SANDYBROWN` for REST/Store-API Basic auth. Creating a probe page to
  verify a render change live is a REST call, not a blocker.
- **`style.css` vs `editor.css` are independent** — `style.css` compiles to the frontend-only `style-index.css`. `editor.css` compiles to the editor-only `index.css`. A layout fix in one does not affect the other. When fixing a visual issue in `style.css`, add matching rules to `editor.css` separately if the editor preview should match.
- **`viewScriptModule` vs `viewScript`** — use `viewScriptModule` (ES modules, deferred). Don't use `viewScript` (classic scripts).
- **CSS `color` fallback pattern** — do NOT use `:not([style*="…"])` fallback guards. Under Spec 32 no block emits an inline `style` property declaration, so the guard always matches and the fallback becomes unconditional — it blocks contextual inheritance and can out-rank the operator's own scoped rule. Instead: let the value inherit (no rule), or emit the fallback inside `:where()` so any `.{uid}` scoped rule wins. (Measured 2026-08-06: `sgs/icon-list` painted dark text on a dark drawer at contrast 1:1; `sgs/card-grid`'s guard at (0,3,0) out-ranked its own `.{uid}` title-colour rule at (0,2,0).)
- **`useInnerBlocksProps`** — always use this (not `InnerBlocks` component directly) for proper block editor integration.
- **CPT `custom-fields` support required for meta REST exposure** — a custom post type must declare `'supports' => [ ..., 'custom-fields' ]` in `register_post_type()` for any `register_meta()` call with `'show_in_rest' => true` to expose the `meta` field in REST responses. Without it, meta round-trips silently return nothing. Caught 2026-06-02 during product-card variation-sets panel work.
- **Theme CSS cache-busts off the theme `style.css` Version header, not `block.json`** — SGS theme enqueues `style.css` with `?ver=` derived from the `Version:` field in `theme/sgs-theme/style.css`. Any theme-CSS change (including token updates) requires bumping that Version header (e.g. 1.3.5 → 1.3.6) to bust the browser cache. Bumping `block.json` or plugin version has no effect on theme CSS.
- **No dead controls — parent owns LAYOUT, child owns TYPOGRAPHY (HC2, D192).** When a composite renders its text via child InnerBlocks (`sgs/heading`/`sgs/text`/`sgs/label`), all typography/colour/font-size (every breakpoint) belongs on the CHILD, NOT the parent. A parent control duplicating a child capability is BOTH a forbidden duplicate AND usually **dead by CSS specificity** — a parent scoped rule `.{uid} .sgs-x__y{color}` (0,2,0) cannot beat the child's inline style (1,0,0,0), so it renders nothing. The `check-dead-controls.js` prebuild guard fails the build on any editor-controlled attr that nothing renders. **This scopes the "Block Customisation Standard" §2 ("custom controls per inner text element"): that applies ONLY to blocks that render their own text element — NOT to FR-22-6 InnerBlocks composites, whose text is child-owned.** Verify a control renders via the live DOM (computed style on the actual painted element), not just "the attr appears in render.php".

**HC2 bans a parent PER-ELEMENT typography control, NOT a wrapper inheritable default.** What HC2 forbids is a parent control targeting a specific child element (a rule like `.{uid} .sgs-x__y{font-size}`) — that is a dead duplicate of the child's own typography by CSS specificity. What HC2 PERMITS is the WordPress-native `supports.typography` (`fontSize`/`lineHeight`) declared on the block ROOT (the wrapper element, e.g. `.wp-block-sgs-quote`): WP emits it as an inline style on the wrapper that children INHERIT via normal CSS, and any child's own explicit typography setting still overrides it by cascade. These are two different mechanisms — an inheritable wrapper default vs. a per-element override control — and only the per-element-parent-control form is banned. (Restored on sgs/quote 2026-07-05 after `cd27dca8` removed body typography with no replacement.)

## Block deprecations — not used (policy, 2026-07-04, D270)

This project does **not** use block deprecations. Every `deprecated.js` was deleted plugin-wide and all `deprecated` wiring removed from `index.js`, because the framework is pre-production (no live content to migrate) and the deprecation pattern set a precedent future agents wrongly copied on every block change.

**Do NOT** create a `deprecated.js`, wire `deprecated` into `registerBlockType`, or add block slugs to a deprecation test. When a static block's `save.js` output or a stored-attribute schema changes, just rebuild; existing dev/canary instances are re-cloned or recovered via the Site Editor's "Attempt Block Recovery". Revisit this policy only when the framework goes to production with real client content to preserve.

## Retired blocks

### announcement-bar (D209 2026-06-11)

`sgs/announcement-bar` retired and **absorbed into `sgs/notice-banner`** as `displayMode=announcement`. `/sgs-update` Stage-10 pruned it + 25 orphan attrs from the DB. Any live homepage instance that carried the old block now shows the deleted-block placeholder — re-clone or swap to `sgs/notice-banner displayMode=announcement`.

### back-to-top + reading-progress (2026-05-18, Spec 17 Wave 2 Polish 1b)

The `sgs/back-to-top` and `sgs/reading-progress` blocks were fully removed (`src/` + `build/` directories deleted, no `deprecated.js` shim). Floating UI for both behaviours migrates to the Customiser at *Appearance → Customise → SGS Floating UI* (separate spec; ship date TBD). Existing post content carrying `wp:sgs/back-to-top` or `wp:sgs/reading-progress` markers will render WordPress's generic "block has been deleted" placeholder until operators remove the blocks and reconfigure via the Customiser. A one-shot dismissible admin notice (`Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice`) surfaces the migration path on next admin load for `edit_theme_options` users.

## Forms (Built Into This Plugin)

Forms are NOT a separate plugin. The form blocks (`sgs/form`, `sgs/form-step`, `sgs/form-field-*`, `sgs/form-review`) and the form processing engine all live here.

- Core form blocks needed for Indus Foods: Phase 1b
- Advanced form features (conditional logic, address lookup, payment, GDPR hooks): Phase 2

Database table: `{prefix}sgs_form_submissions`
REST namespace: `sgs-forms/v1`
Notifications: N8N webhooks (not wp_mail)

## Key Rules

- Every block reads colours/fonts from theme.json tokens — never hardcode
- **THE DEFAULT-vs-HARDCODE TEST (Bean-locked, D338 2026-07-15).** The question is NOT *"is it a literal?"* — it is **"does it override a theme-wide default, or hinder the pipeline?"**
  - **A block literal that DUPLICATES a theme.json `styles.elements` default is a silent override that disables the theme** — not a "helpful default". **Check `theme/sgs-theme/theme.json` BEFORE adding any typography literal to a block.** Proven live: `sgs/heading` carried `fontSize default:28` + `font-size:28px` + `font-weight:700` + `line-height:1.2`, all beating theme.json at `(0,2,0)` vs `:root :where(h1..h6)` `(0,1,0)` — so an `<h1>` and an `<h6>` rendered **identically** on every client, through a green build, for months. theme.json already defined the whole scale (`elements.h1..h6` fontSize; `elements.heading` weight/lineHeight/family; h5/h6 per-tag overrides).
  - **A component's OWN constant STAYS** — it overrides no theme-wide default and is overridable per instance: `sgs/label` `fontSize:12` (an eyebrow/kicker `<span>`, NOT an h-tag equivalent — an `<h5>` above an `<h2>` would fragment the heading outline), `sgs/business-info`'s `#e7d768` credit-sweep colour, `SGS_ATTRIBUTION_URL/TEXT`. Sibling rule: a hardcoded CLIENT value is a bug (`framework-block-client-hardcode-is-a-bug-not-a-constant`); the component's own constant is not.
  - **`null` default = inherit** is the canonical pattern (`sgs/button`, `sgs/heading`, `sgs/product-card` `ctaFontSize`). The shared responsive emitter's contract is *"`''` when nothing is set"* (`helpers-responsive.php:67`), so a null default emits no rule and the theme wins.
  - Enforced by **F3b** in `check-hardcoded-render-defaults.js` (D338) — it reads theme.json `styles.elements` and flags a literal block.json `default` that flattens a theme-differentiated property. It fires ONLY on blocks declaring an enum of element keys (`sgs/heading` `level: h1..h6`), so a single-element block never trips it.
- **WordPress silently DROPS any block attribute the block.json does not declare — but only on the EDITOR/JS surface.** `getBlockAttributes()` builds `attributes` from the registered schema, so the client can't see or edit an undeclared attr — no error, no warning, no failing test, no failing build. **⚠ CORRECTED 2026-08-20:** PHP does NOT drop it — `WP_Block_Type::prepare_attributes_for_render()` `continue`s past an unrecognised key rather than `unset()`-ing it (unset only fires for a DECLARED attr that fails schema validation). A value hand-authored into a theme pattern/template (as opposed to saved through the editor, which filters before writing `post_content`) reaches `render.php`'s `$attributes` unchanged and may be painting the frontend right now — e.g. `sgs/container/render.php` genuinely consumes an undeclared `backgroundColor` to emit a live `has-{slug}-background-color` class. **Treat a finding as "editor can't touch this", not "dead at render" — check render.php before deleting an authoring or a read.** **45 found live in shipped patterns (D338); 39 fixed** (19× `"type"` where `sgs/business-info` declares `displayType`; 17× American `"textColor"` where it declares British `"textColour"`). Gate: `python scripts/check-dead-pattern-attrs.py`. **Never blanket-rename `textColor`→`textColour`** — American spelling is CORRECT on core blocks; scope any rename inside `wp:sgs/*` comments only.
- Frontend JS: vanilla only, no jQuery, no external libraries — **bounded by the three-tier motion doctrine (Spec 38 §1, D406 + D422). There are TWO sanctioned library exceptions, both npm-bundled and conditionally loaded: Tier G (GSAP) for effects vanilla cannot reach, and Tier H — a CLOSED list of single-purpose helpers, currently Lenis alone for site-level smooth scrolling, each admitted by a D-numbered decision per §1.2a. Nothing shipped migrates to either, and no CDN ever**
- Use `viewScriptModule` (ES modules) for frontend interactivity
- CSS scroll-snap for carousels, Intersection Observer for animations
- Progressive enhancement: blocks must render meaningful content without JS
- All inner blocks use `useInnerBlocksProps` correctly
- All REST endpoints: nonces, capability checks, sanitised input, prepared statements
- Responsive: every layout block has mobile/tablet/desktop controls

## Build Phase

Phase 1 (core blocks + extensions) is **complete**. Phase 2 is now active — building the highest-impact missing blocks (Post Grid, Gallery, Tabs) and extending hover controls across all blocks. See the Block Build Status tables above for what's done and what's next.

## Deployment

Build locally (`npm run build`), deploy the `build/` directory + PHP files via SCP. No Node.js on the server.
