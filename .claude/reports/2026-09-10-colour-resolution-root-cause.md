# Colour resolution root cause — why 389/1,286 (now ~253/802) colour attrs are UNRESOLVED

**Type:** `/systematic-debugging` root-cause investigation. Read-only — no fixes proposed here.
**Question asked:** why can't the 389 unresolved colour attributes just use `SgsColourPanel`'s
existing logic?

## Answer, up front

**`SgsColourPanel` cannot help, because it is not part of this resolver at all — it solves a
different problem, on a different side of the stack.**

- `SgsColourPanel` (`src/components/SgsColourPanel.js`) is an **editor-side (JS) inspector
  control**. It renders a colour swatch bound to whatever attribute name the calling block wires
  it to, and writes that value via `setAttributes()`. It has zero knowledge of CSS properties or
  server-side emission.
- The "389 unresolved" figure comes from a **server-side (PHP) classifier**:
  `extract_css_property_and_layer()` — TASK A of
  `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py::extract_css_property_and_layer`
  (cited in `.claude/plans/cloning-pipeline-tier-migration-requirements.md` R10 as "Rule 31's own
  resolver"). Its job is to read each block's own `render.php` + `style.css`/`.scss` and work out,
  by static analysis, which real CSS property (`background-color`, `color`, `border-color`, …) an
  attribute's value ends up driving — this is the `block_attributes.css_property` DB column the
  **cloning-pipeline converter** (`converter/resolvers/styling_content.py::lift_styling_content`,
  `converter/services/root_supports.py::lift_root_supports_to_style`) later reads to know where a
  *draft's* CSS should land when cloning a page. It is a build-time census tool, not a runtime
  control.

So "reuse `SgsColourPanel`'s logic" is a category mismatch: `SgsColourPanel` never determines a
CSS property for anything, and nothing in the 253/389-attr set is missing an editor control — the
gap is entirely in the PHP-source classifier that feeds the cloning pipeline's DB routing.

## Numbers: re-measured live, not reproduced from the cited figure

I could not find the exact run that produced "389 of 1,286" (it is cited once, in the
requirements doc, with no artefact path). The DB now shows a **different, smaller** figure for
the same query shape — evidence the framework has been narrowing this gap since R10 was written
(a `sgs-framework.db.pre-role-remediation-*.bak` pair in `.claude/scratch/` confirms a role-reseed
pass ran after R10):

```
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql
  "SELECT COUNT(*) FROM block_attributes WHERE role='color'
   AND (css_property IS NULL OR css_property='')"
```
→ **253 of 802** `role='color'` attrs currently unresolved (~31.5%, same ballpark as R10's ~30%,
different denominator — role assignment itself has been reseeded since). I built the
categorisation below against this live 253, sampling across every distinct block rather than the
first few rows (`prove-the-cause-before-fix.md` / whole-codebase-sweep discipline).

## Categories, with evidence

| Category | Count (of 253) | % |
|---|---|---|
| A — fx/motion canvas-painted colour family | 128 | 51% |
| B — `core/*` WordPress blocks (never in scope) | 40 | 16% |
| C — hover-state companions routed through a shared composer | 54 | 21% (overlaps D) |
| D — shared-composer / config-map static-analysis blind spot (non-hover) | 21 | 8% |
| shape-divider colour (subset of the wiring-gap shape, not separately counted) | 10 | — |

### Category A — fx/motion canvas-painted colour (128/253, the largest single bucket)

`fxFieldColour`, `fxParticleColour`, `fxGridDotColour`, `fxGridDotHoverColour` recur across
**dozens of unrelated blocks** (before-after, button, buybox, collapsible-text, container,
counter, cta-section, decorative-image, …) — every one of them shows up unresolved.

```
grep -rln "fxFieldColour\|fxParticleColour\|fxGridDotColour" plugins/sgs-blocks/src plugins/sgs-blocks/includes
```
→ only `src/blocks/extensions/fx.js` and the PHP attribute-registration files
(`includes/fx-attributes.php`, `includes/extension-attributes.generated.php`). **Zero hits in any
individual block's `render.php` or `style.css`.**

These are the ~78-attr fx/motion roster (R8 of the requirements doc — the FR-38-22 fx-attribute
lift). They are painted by `view.js` reading the attribute directly at runtime and drawing to a
`<canvas>` — never via a CSS declaration. `extract_css_property_and_layer()` only ever opens
`{block_dir}/render.php` and `{block_dir}/style.css` (`extract-signatures.py::extract_css_property_and_layer`,
the `for slug in block_slugs:` loop) — it has no visibility into `fx.js` (a shared extension file,
not a per-block file) and no mechanism at all for tracing a JS canvas fill. This is the task's
category (b): **a genuinely different paint mechanism the resolver was never built to handle**,
not a bug.

### Category B — `core/*` WordPress blocks (40/253)

`core/button`, `core/cover`, `core/group`, `core/heading`, `core/media-text`, `core/navigation`,
`core/paragraph`, `core/post-featured-image`, `core/pullquote`, `core/separator`,
`core/social-links`, `core/table` all show unresolved colour attrs (`backgroundColor`,
`textColor`, `overlayColor`, …).

```python
cur.execute("SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug")
```
(`extract-signatures.py::extract_css_property_and_layer`) — the block-iteration query is hard
filtered to `sgs/%`. Core blocks have no `render.php`/`style.css` in this repo at all (they
render through WordPress core's own block-supports serialisation) and are **structurally
excluded from this resolver's scan by construction**. Also the task's category (b) — not a bug.

### Category C+D — shared-composer / config-map indirection (the closest match to the `lingua_franca.py` shape)

This is the category the orchestrating brief specifically asked me to check for: working logic
that exists and genuinely runs, but that the classifier never actually consults. It is real, and
I traced two concrete instances end to end.

**Instance 1 — `backgroundOverlayColour` (unresolved on 6 blocks: container, cta-section,
multi-button, physics-canvas, site-footer, site-header).**

```
grep -n "backgroundOverlayColour" plugins/sgs-blocks/src/blocks/container/render.php
  plugins/sgs-blocks/includes/class-sgs-container-wrapper.php
```
→ zero hits in `container/render.php`. The read is `$attributes['backgroundOverlayColour'] ?? ''`
at `includes/class-sgs-container-wrapper.php` (~L446, `resolve()`'s overlay branch) — a **shared
class** consumed by all 6 flagged blocks via `SGS_Container_Wrapper`. `extract_css_property_and_layer()`
only ever opens `{block_dir}/render.php` (the block's own file) — it never reads
`includes/class-sgs-container-wrapper.php` or any other shared `includes/*.php` file. A colour
that is genuinely, correctly painted — but only through the shared wrapper class — is invisible
to this classifier by construction. Same shape recurs for `container.gridItemShadowColour`,
`cta-section.backgroundOverlayColour`, `physics-canvas.backgroundOverlayColour`, etc. — anything
routed exclusively through `class-sgs-container-wrapper.php` rather than referenced again inside
the block's own `render.php`.

**Instance 2 — `linkColour`/`linkColourHover` on `sgs/testimonial`.**

```
grep -n "linkColour" plugins/sgs-blocks/src/blocks/testimonial/render.php
```
→ `array( $sgs_tm_link_sel, 'linkColour', 'linkColourHover', 'linkColourGradient',
'linkColourHoverGradient' )` (`testimonial/render.php:244`). The attribute name appears as a
**bare PHP string literal inside a config-array argument** to a shared colour composer (the
`$map = ['base'=>attr, 'hover'=>attr, …]` convention documented in
`plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" section). The actual
`$attributes['linkColour']` bracket read happens **inside** the shared composer
(`includes/helpers-colour-variants.php`/`includes/helpers-tokens.php`), which
`extract_css_property_and_layer()` never opens. The extractor's regex
(`extract-signatures.py::PHP_ATTR_PATTERN`) only matches a literal `$attributes['key']`/
`$attrs['key']` bracket expression in the scanned file; it does have dedicated detectors for
*some* known helper-call shapes (`_attrs_from_helper_calls`, `_attrs_from_state_colour_helper_calls`,
`_attrs_from_text_colour_resolver_calls` — proof the extractor's own author already recognised and
partially solved this exact problem class for other composers) — but this bare-string config-array
shape isn't one of the recognised patterns, so it falls through all of them.

**Instance 3 (partial trace, same shape, different mechanism) — `sgs/container.backgroundColourHover`.**
Here the bracket access IS literally present in `container/render.php` (`$attributes['backgroundColourHover']
?? ''` at L187), so the raw-token regex DOES fire — but the value is passed to
`sgs_background_paint_decl()` and the RETURN VALUE is pushed into a PHP array variable
(`$sgs_container_hover_decls[]`), assembled into a CSS rule several statements later. The
extractor's chain-tracer (`extract-signatures.py`'s `_resolve_var_chain`) is built to follow
`--sgs-` CSS custom-property chains through the compiled stylesheet, not arbitrary PHP-array
value flow across statements inside `render.php` itself — so even a directly-referenced attribute
can still end up unresolved when its value crosses an intermediate PHP variable before reaching a
CSS-emitting statement the extractor recognises.

**Category C (hover companions, 54/253)** is largely this same shape — hover-state colour
attrs are the family most likely to be routed through a shared composer
(`sgs_emit_state_colour_css`, `sgs_text_states_css`, `sgs_fill_states_css`, or the block's own
config-map convention) rather than a bare per-attribute bracket-to-CSS-property assignment, so
they trip the same blind spot at a higher rate than "base" (non-hover) colour attrs.

## What this is NOT

- **Not** an "unwired connection" in the `lingua_franca.py` sense of *dead code that a real gate
  bypasses*. In every traced instance the colour genuinely renders correctly on the live page —
  the emission logic runs, the composer is called, the CSS is real. The gap is that the
  **classifier** (`extract_css_property_and_layer`, a static-analysis census tool) cannot see
  through: (a) a shared PHP class/include file it never opens (Category C/D, Instance 1), (b) a
  config-array indirection that names the attribute as a string rather than a bracket access
  (Instance 2), or (c) a PHP-array value flow it wasn't built to trace (Instance 3).
- **Not** an `SgsColourPanel` gap. No sampled attribute across any category lacks an editor
  control; the 253/389 figure has nothing to do with the client-facing colour picker.
- **Not** one root cause. Two of the four categories (A: fx/motion, B: core blocks) are
  **correct, structural non-participants** — the resolver was never meant to reach them, and
  routing them through it would be architecturally wrong, not a fix. Only categories C/D
  represent a genuine classifier coverage gap on attributes the resolver SHOULD be able to
  resolve.

## Verification

Instances 1–3 above are each backed by a direct `grep`/file-read pairing the DB's unresolved-attr
row against the exact PHP source (or its absence) that would need to satisfy
`extract_css_property_and_layer()`'s pattern set. The 802/253 baseline counts were re-run live
against `sgs-framework.db` rather than trusted from the cited 1,286/389 (which I could not locate
an artefact for). Category-A and Category-B counts were verified by SQL (`attr_name LIKE 'fx%'`,
`block_slug LIKE 'core/%'`) against the same 253-row unresolved set, not estimated.

## Not done here (out of scope for this task)

Fix-shape design for categories C/D (e.g. teaching the extractor to open shared `includes/*.php`
files, or to recognise the config-map string convention) is a follow-up `/qc-council` step, per
the brief. Not proposed here.
