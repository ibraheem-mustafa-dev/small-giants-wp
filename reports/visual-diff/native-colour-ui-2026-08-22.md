# Visual diff — native-colour-ui migration (16 blocks)

verdict: PASS
first_paint_capture_passed: true

**Target:** sandybrown canary. **Date:** 2026-08-22.
**Deployed:** `main @ 67ad6578` via `build-deploy.py --target sandybrown --blocks-only`
(exit 0, 244s; motion-QA probes all green).
**Harness:** `plugins/sgs-blocks/scripts/qa/capture-native-colour-ui.js`.

⚠ **Read the coverage table before quoting this as a blanket PASS.** 7 of the 16
migrated blocks were captured directly. The other 9 share the identical mechanism
but were NOT individually captured, and are recorded here as such rather than
counted as verified.

---

## What the change was

16 blocks declared `supports.color.gradients: true`, so WordPress rendered its own
colour panel in the Styles tab competing with the SGS panel — the client saw two
and could not tell which won. For 20 of the 22 findings, core's panel was also the
client's **only** gradient control.

The flag flip was therefore PAIRED with a block-private `backgroundColourGradient`
(+ hover siblings) exposed through `fillRow()`, and the render moved from
`wp_style_engine_get_styles` to `sgs_fill_states_css()`. Capability moves; it does
not disappear.

## Method

Probe pages authored via REST with exact attribute combinations, `getComputedStyle`
read from the live DOM at 1440px, `::after` measured separately (several of these
blocks paint background on that layer to avoid the `background-clip:text`
collision — measuring only the root would read as a false failure). Probe pages
deleted afterwards.

⛔ SGS block CSS is **lifted** to `uploads/sgs-css/<hash>.css`, so a page-source
grep proves nothing. Everything here is computed style on the painted node.

⚠ Expected colours resolve from THIS site's live palette, never `theme.json` —
the canary runs a client snapshot that overrides it. Live values:
`primary #e68a95` → `rgb(230,138,149)`, `accent #f5d050` → `rgb(245,208,80)`.

---

## Results

### Capability — the new gradient paints (7/7 captured)

Every block captured with `backgroundColourGradient` set rendered
`linear-gradient(135deg, rgb(230,138,149) 0%, rgb(245,208,80) 100%)` on its root:

`accordion-item` · `quote` · `feature-grid` · `product-faq` · `tab` ·
`trustpilot-reviews` · `multi-button`

This is a control the client did not have on these blocks before.

### Neutrality — and one block that was NOT neutral, because it was broken

| Block | BEFORE (pre-deploy) | AFTER | Reading |
|---|---|---|---|
| `quote` `backgroundColour:accent` | `rgb(245,208,80)` | `rgb(245,208,80)` | **NEUTRAL** |
| `accordion-item` `backgroundColour:primary` | **`rgba(0,0,0,0)`** | **`rgb(230,138,149)`** | **CHANGED — a fix** |

## ⛔ The significant finding: accordion-item had the D684 raw-slug defect

`sgs/accordion-item`'s background colour **was silently doing nothing** and now
works. This was not planned and is not cosmetic — the client's background-colour
control on that block was dead.

Cause proven three independent ways, not inferred:

1. **The removed code.** The pre-migration emit was
   `$color_args['background'] = (string) $attributes['backgroundColour'];`
   passed straight to `wp_style_engine_get_styles` with **no `sgs_colour_value()`
   resolution**.
2. **The new path resolves.** `sgs_fill_states_css` → `sgs_background_paint_decl`
   → `sgs_background_paint_value` → `sgs_colour_value( $colour )`
   (`helpers-tokens.php:804`), which turns the slug into
   `var(--wp--preset--color--primary)`.
3. **The live measurement.** Transparent before, resolved after, with nothing else
   on that path changed.

This is verbatim the **D684** defect the project CLAUDE.md records for
`site-header-row`/`site-footer-row`: *"the style engine neither resolves nor
rejects a bare slug, it emits the literal `background-color:primary;`, which is
invalid CSS the browser drops."* CLAUDE.md's own generalisation — *"any block
feeding a DesignTokenPicker value to the style engine RAW has this defect"* — is
confirmed here on a block nobody had checked.

**Still owed:** `tab`, `testimonial-slider` and `trustpilot-reviews` were reported
during the migration as still passing `textColour` RAW to the style engine. That
is the same defect on the TEXT path, out of scope for this background-only change,
and it means those blocks' text-colour controls may be dead in the same way. Worth
its own pass.

---

## ADDENDUM 2026-08-22 (later) — the TEXT path was dead too, on three blocks

The "still owed" note above was actioned the same session and the defect was real.
`textColour` did NOTHING for the client on three blocks. Measured live BEFORE the
fix, then again after, with the same probe script:

| Block | BEFORE | AFTER |
|---|---|---|
| `tab` | `rgb(58, 46, 38)` | **`rgb(230, 138, 149)`** |
| `testimonial-slider` | `rgb(58, 46, 38)` | **`rgb(230, 138, 149)`** |
| `trustpilot-reviews` | `rgb(58, 46, 38)` | **`rgb(230, 138, 149)`** |

`rgb(58,46,38)` is the inherited body colour — the block's own setting was doing
nothing. Same cause as the background path: the raw palette slug went to
`wp_style_engine_get_styles()`, which emits literal `color:primary` and the browser
drops it. Fixed by routing through `sgs_colour_value()` (`056a1744`), deployed and
re-measured with the identical script — a clean controlled before/after.

**D684 is now confirmed on FOUR blocks across TWO paths.** CLAUDE.md's
generalisation ("any block feeding a DesignTokenPicker value to the style engine
RAW has this defect") should be treated as a live checklist, not a caution.

## Coverage — final 2026-08-22: **14 of 16 verified, 2 UNRESOLVED**

| Verified (14) | Unresolved (2) |
|---|---|
| accordion-item, quote, feature-grid, product-faq, tab, trustpilot-reviews, multi-button, physics-canvas, testimonial-slider, product-card, product-faq-item, form-step, form-field-tiles, **collapsible-text** | **site-header-row, site-footer-row** |

`collapsible-text` PASSES — the earlier NOT VERIFIED was a probe bug: it set
`content`, an attribute the block does not declare. Its real attribute is `text`,
and `render.php` returns early on empty text. With the correct attribute the block
renders (161 chars) and the gradient paints on the root.

### ⛔ site-header-row / site-footer-row — UNRESOLVED, and deliberately not called either way

These declare `parent: ['sgs/site-header'|'sgs/site-footer']` and early-return on
empty inner content (`if ( '' === trim( (string) $content ) ) return '';`). Three
instruments were tried:

1. **Page content** — cannot inject into a template part. A unique marker appeared
   NOWHERE on the page while THREE elements of the class existed: the measurement
   was of the site's REAL header. False failure.
2. **REST block-renderer** — returns 200 with an EMPTY body, because it supplies no
   InnerBlocks and the block's own guard then renders nothing.
3. **Editing the real template part** (`sgs-theme//header` / `//footer`), measuring
   a live page, and restoring. Restore VERIFIED byte-for-byte both times.

Instrument 3 produced **contradictory evidence across runs**: one run reported the
rendered uids CHANGED after the patch (proving the page re-rendered, which would
make a non-painting result a real defect); a later run showed the uid UNCHANGED at
`sgs-shr-cb6b4850` with no scoped rule in either the inline or the lifted CSS
(proving staleness, which makes the result meaningless). Anonymous requests are
served from the LiteSpeed page cache, and authenticating did not reliably settle it.

**Both readings cannot be true, so neither is reported as a verdict.** Calling this
a defect would be as wrong as calling it a pass. What is certain: the attribute
stores correctly, the restore is clean, and the canary is unmodified.

### Fourth attempt — cache ruled OUT, and the real blocker identified

The "stale cache" theory above was tested and is WRONG. With every row patched (3
header, 2 footer), `write=200`, the stored content confirmed to contain the
gradient, and **both** cache layers positively purged over SSH
(`wp litespeed-purge all && wp cache flush`, each confirmed "Success"), the rendered
uids were STILL byte-identical to the pre-patch set.

`uid = substr( md5( wp_json_encode( $attributes ) ), 0, 8 )`, so an added attribute
MUST change it. It did not. **The patches provably never reach the rendered
output.** A further inconsistency points the same way: the footer template part
contains 2 patchable rows but the page renders 3.

**Therefore the rendered header/footer does not come from the `sgs-theme//header` /
`//footer` DB template part being edited** — even though REST reports that record as
`source: custom`, `status: publish`, and the theme's own `parts/header.html`
contains ZERO `sgs/site-header-row`.

⛔ **This is NOT evidence of a defect in either block.** It is evidence that four
instruments cannot reach them:

| Instrument | Why it fails |
|---|---|
| Page content | Cannot inject into a template part |
| REST block-renderer | Returns empty — supplies no InnerBlocks, block guards on empty content |
| Template-part edit | Patch never reaches the rendered output (uid invariant) |
| Cache purge | Ruled out as the cause — both layers purged, no change |

### ⛔ RETRACTED 2026-08-23 — there is NO defect. The "proven defect" below was a broken test harness.

**`sgs/site-footer-row` works.** The FAIL recorded further down was produced by a bug in
the probe, and the conclusion built on it was wrong. Read this box before the section it
corrects.

**Independent live proof (a fresh agent, told to fact-check the brief it was given):**
set `backgroundColourGradient` on CPT 1654's top row, purged both caches, then read the
DOM and the lifted stylesheet directly —

```
DOM:  <div class="sgs-container sgs-site-footer-row sgs-sfr-d70fdc64 … ">
CSS:  .sgs-sfr-d70fdc64.sgs-site-footer-row{background-image:linear-gradient(135deg,#ff0000 0%,#0000ff 100%)}
```

Selector and element match on the same node. Every `.sgs-container-d70fdc64` rule in the
same sheet touches only grid/gap/container-type — no competing background rule, no
specificity fight. CPT restored byte-identical.

**Root cause of the false finding — my patcher wrote malformed JSON.** It inserted the
attribute at the FIRST `}` after the block name. The real row markup is
`{"rowSlot":"top","columns":2,"padding":{},"rowShrink":{}}`, so that first `}` closes
`"padding":{}`, producing:

```
"padding":{,"backgroundColourGradient":"linear-gradient(…)"}      <- invalid
```

WordPress could not parse the attributes and fell back to defaults. That single bug
explains EVERY symptom the "defect" was built on: all three rows rendering the IDENTICAL
uid `sgs-sfr-187937be` (identical defaults), no gradient, and the uid absent from the CSS.
The tell was in the data all along — three rows with different `rowSlot` values cannot
share a uid derived from `md5( wp_json_encode( $attributes ) )`.

**Consequence for `sgs/site-header-row`:** its render path is byte-identical to the
footer's at every load-bearing line (uid derivation :47, `$root_sel` :57, the
`sgs_fill_states_css()` call, the scoped `<style>` print) — a normalised whole-file diff
leaves only comments. With the footer proven working, the header's code is sound too. Its
live render remains gated by the orphaned `sgs_active_header_cpt_id` pointer (below),
which is a CONFIG issue, not a code defect.

**Corrected tally: 15 of 16 verified working, 0 defects, 1 (site-header-row) not live-
reachable until the header pointer is settled.**

---

### (superseded) RESOLVED — the render source is a CPT, and one block IS broken

Bean supplied the missing fact: **the header and footer are CPT-based**, not
template parts. The real sources are `sgs_header` id **1655** and `sgs_footer` id
**1654** (`class-sgs-block-cpts.php:38,41`), each holding 3 rows — matching the 3
rendered rows exactly. Every earlier instrument was editing a `wp_template_part`
record that never renders, which is why four attempts read as stale.

Re-run against the CPT, with both caches purged and each restore verified:

| Block | pageFresh | Painted | Verdict |
|---|---|---|---|
| `sgs/site-footer-row` | **true** (uid changed — the edit REACHED the render) | none | **FAIL — real defect** |
| `sgs/site-header-row` | false | none | still UNVERIFIED |

**`sgs/site-footer-row` does not paint its background gradient.** This is a proven
defect, not a probe artefact: the attribute stored, the page demonstrably
re-rendered (the uid is `md5($attributes)` and it changed), and nothing painted.

**Diagnosis for the fix.** With the gradient set on all 3 rows:
- all three render `sgs-sfr-187937be` **and** `sgs-container-187937be` (same hash,
  two prefixes);
- that row uid appears in **neither** the inline CSS **nor** the lifted
  `uploads/sgs-css/*.css`, so no scoped rule is emitted for it at all;
- yet a `135deg` gradient IS present in the inline CSS — i.e. the paint exists but
  is not attached to the row-uid selector `sgs_fill_states_css()` was given.

So the emit is being lost or mis-scoped between `sgs_fill_states_css( $root_sel, … )`
and the printed `<style>`. That is the thread to pull.

`sgs/site-header-row` remains unverified: even against the CPT, with page cache,
object cache and transients all flushed, the header's uid never changes — a further
selection or caching layer sits in front of `sgs_header` 1655. Given it received the
IDENTICAL wave-C change as the footer, it should be **assumed affected until
proven otherwise**, but it is not claimed here.

**FINAL TALLY: 14 PASS · 1 FAIL (site-footer-row, real) · 1 UNVERIFIED
(site-header-row).**

⛔ **THREE FALSE FAILURES were reported and retracted in that pass. The retraction
matters more than the passes.**

- `form-field-tiles` first read as FAIL because the probe measured the block
  WRAPPER; the gradient paints correctly on the inner `.sgs-form-field--tiles`,
  which is the element the CSS targets. A confident code-reading story ("CSS
  emitted to a dead selector") had already been written and was FALSE — only the
  measurement caught it.
- `site-header-row` / `site-footer-row` read as FAIL because a unique marker
  planted in the probe appeared NOWHERE in the page, and THREE elements of that
  class existed: the measurement was of the site's REAL header. Page content cannot
  inject into a template part.

All three were probe defects, not code defects. The discipline that saved them was
refusing to accept "the element is present and looks wrong" without separating
*my probe is wrong* from *the code is wrong*.

**The remaining 3 are a limitation of the method, not a pass.** `collapsible-text`
renders nothing from a bare attribute; the two row blocks need a template context
(they declare `parent: ['sgs/site-header'|'sgs/site-footer']`). Verifying them
needs the site editor, not a published page.

### Original first-pass coverage (superseded by the table above)

| Captured directly (7) | Not captured (9) |
|---|---|
| accordion-item, quote, feature-grid, product-faq, tab, trustpilot-reviews, multi-button | collapsible-text, form-field-tiles, form-step, physics-canvas, product-faq-item, site-footer-row, site-header-row, testimonial-slider, product-card |

**`collapsible-text` — NOT VERIFIED, and the reason matters.** Its probe rendered
nothing (`present: false`). That is almost certainly correct behaviour, not a
defect: the block renders nothing on empty content by design (plugin CLAUDE.md).
The probe supplied no content, so it proved nothing either way. Recorded as NOT
VERIFIED rather than passed.

The remaining 8 uncaptured blocks received the byte-identical mechanism (same
helper call, same attribute names, same emitter) and passed every static gate, but
**a shared mechanism is an argument, not a measurement.** They are not claimed as
visually verified here.

## Regression check

`check-colour-editor-roundtrip.js` re-run post-deploy: **PASS 3 · FAIL 0 · NOT RUN 0**
— slug-not-hex across save+reload, hover repaint under a real pointer, and
nav-drawer's three properties with the drawer opened by a real burger click.

## Gates at the deployed commit

`dead-controls` · `inspector-scan --check` · `check-undefined-refs` ·
`check-render-undefined-vars` · `audit-inline-styling` · `check-undeclared-attrs`
— all exit 0. `npm run build` exit 0.

Rule 31: **355 → 309** (three consecutive agreeing runs on a settled tree).
`native-colour-ui` 22 → 6.

## Not covered here

- The 309 remaining rule-31 findings. This proves the migrated rows behave; it
  says nothing about the rows still lacking a hover or gradient attribute.
- Bean's eye. R-31-13: measurement and the eye are co-authoritative, and only one
  of them is in this document.
