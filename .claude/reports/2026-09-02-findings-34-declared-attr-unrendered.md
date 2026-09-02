# Detector findings — 34 — Declared attribute, never rendered

**Rule:** `34-declared-attr-unrendered` (`plugins/sgs-blocks/scripts/inspector-scan/rules/34-declared-attr-unrendered.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.
**Corrected:** 2026-09-02 (same day) — the "7 genuine findings, all pre-explained" verdict below was
itself a false positive. 5 of the 7 were `check-dead-controls.js` resolver blind spots on a THIRD
computed-key shape (`SGS_Media_Element::style()` dispatch — see "Resolver fix" below), now closed.
2 were flagged as real dead declarations pending a human decision — since **closed by exemption**
(see "Resolved as documented exemption" below): `splitImage`/`splitImageMobile` are render/editor-
dead by design, kept alive as DB-side routing anchors for the cloning pipeline's scalar-media
mechanism, and are now a formally documented, gate-recognised exemption rather than an open finding.

**Problem:** An attribute is declared in block.json but nothing (render.php/edit.js/anywhere) reads it.

**Effect:** `sgs/hero` reports **0** open findings under this rule. Both attributes are now
`exempt:true, exemptReason:'cloning-pipeline-anchor'` in `check-dead-controls.js --dump-json`, which
rule 34 reads and correctly excludes from its output. No other block has any finding under this rule.

**Validated count:** 0 open finding(s) — 2 resolved as a documented exemption (not deleted)

## Resolver fix (2026-09-02)

`check-dead-controls.js` gained a third computed-key resolver,
`collectMediaElementAtomConsumed()`, alongside the existing `PREFIXED_HELPER_SUFFIXES` (fixed
helper name, literal 2nd-arg prefix) and dynamic-prefix (`$attributes[ $var . 'Suffix' ]`
concatenation) resolvers. The new shape: `SGS_Media_Element::style( $attributes, '<prefix>',
'<block-slug>', $uid, array( 'atom-id', ... ) )` (`includes/class-sgs-media-element.php`), where
each atom's own PHP twin reads `$attributes[ sgs_media_element_stored_attr( $block_slug, $prefix,
$base ) ]` — a bracket access keyed by a **function call**, not a literal or a simple
concatenation, invisible to both existing resolvers.

`MEDIA_ELEMENT_ATOM_BASES` mirrors the atom → base-suffix map `src/components/media/atoms/
registry.js` builds from `MEDIA_BASES` in `src/components/MediaElementControls.js` (the JS
registry this whole mechanism is driven from) — same "keep in sync with the producer's own
doc-comment" discipline `PREFIXED_HELPER_SUFFIXES` already uses. `MEDIA_ELEMENT_TIERED_BASES`/
`MEDIA_ELEMENT_TIERS` mirror `MEDIA_TIERED_BASES`/`MEDIA_TIERS` from the same file, so a tiered
base (e.g. `ObjectPosition`) correctly resolves its `Tablet`/`Mobile` siblings too.

**5 false positives closed** (all `sgs/hero`, all resolved via `SGS_Media_Element::style( $attributes,
'splitMedia', 'sgs/hero', $uid, array( 'object-fit', 'focal-point' ) )` or `SGS_Media_Element::style(
$attributes, 'media', 'sgs/hero', $uid, array( 'overlay' ) )` at `hero/render.php`):

| Attribute | Consumption mechanism |
|---|---|
| `splitMediaObjectPosition` | `focal-point` atom (`includes/media/atoms/focal-point.php:142-145`) — element-scope `ObjectPosition` base |
| `splitMediaObjectPositionTablet` | same atom, tiered sibling (`:147-150`) |
| `splitMediaObjectPositionMobile` | same atom, tiered sibling (`:152-155`) |
| `mediaOverlayColour` | `overlay` atom (`includes/media/atoms/overlay.php:89-98`) — `OverlayColour` base |
| `mediaOverlayGradient` | same atom, `OverlayGradient` base |

Note: `splitMediaObjectPositionTablet`/`Mobile` were already resolving as `renderConsumed:true`
(`renderVia:'responsive-variant'`) BEFORE this fix — the pre-existing rule-(a) responsive-variant
fallback already covered them via a literal substring match, independent of the new resolver. Only
the BASE attribute, `splitMediaObjectPosition`, was actually blind before this fix. The verified NEW
clears from this fix are `splitMediaObjectPosition`, `mediaOverlayColour`, `mediaOverlayGradient`
(confirmed by a direct before/after diff of `check-dead-controls.js --dump-json` across all 2,947
rows — see verification below). The table above lists all bases the new resolver proves for
completeness, but only these three moved from a finding to a clear.

**0 reclassified as exemptions.** None of the 7 belonged to the "deliberately kept for the cloning
pipeline's scalar-media role assignment" bucket the original report guessed at — `check-dead-
controls.js` already has a `system-attr` exemption mechanism and none of these 7 attributes matched
it; all were genuine consumption-resolver gaps or genuine dead declarations.

## Resolved as documented exemption (2026-09-02)

### sgs/hero (2) — `splitImage`, `splitImageMobile`

**Corrected diagnosis.** The earlier verdict above ("orphaned schema, safe to delete") was itself
wrong — independently verified twice on 2026-09-02: (1) tracing that deleting these two attrs would
cause `/sgs-update` Stage 9's orphan-prune to silently delete their `block_attributes` DB rows
(`role='scalar-media'`) and lose the cloning-pipeline routing entirely — the exact 2026-08-02
regression this mechanism was built to fix; (2) the mechanism was independently EXTENDED (not
replaced) the same day to route Tablet tier + video/SVG media types through these same two anchor
attrs, confirmed working with 10/10 passing tests.

So the correct, permanent shape is: **declared, unconsumed by render.php/edit.js (nothing paints
them, no client control), deliberately kept for a non-render consumer** — the Python cloning
pipeline, which reads them via `plugins/sgs-blocks/scripts/data/scalar-media-roles.json`. This is
structurally the same shape `check-dead-controls.js` already had an exemption mechanism for
(`system-attr`/`editor-only`/`key-noise`/`core-supports`), but none of those four vocabularies fit:
not a WP `supports`-backed attr, not editor-only UI wiring, not a naming-convention key, not an
extension-surface attr. A new, fifth `exemptReason` value — `'cloning-pipeline-anchor'` — was added
instead of misusing an existing one.

**What changed:**
- `check-dead-controls.js` — new `CLONING_PIPELINE_ANCHOR_ATTRS` Set, keyed `block::attr`
  (`sgs/hero::splitImage`, `sgs/hero::splitImageMobile`), consulted in both `checkFullyDeadAttrs()`
  (CHECK 4, advisory) and `dumpAttributeRows()` (`--dump-json`). Comment at the definition points to
  `plugins/sgs-blocks/scripts/data/scalar-media-roles.json` as the source of truth.
- `inspector-scan/rules/34-declared-attr-unrendered.js` — `KNOWN_EXEMPT_REASONS` gained
  `'cloning-pipeline-anchor'`, with the same source-of-truth pointer, so the rule's shape-guard
  (`assertDumpRowShape`) doesn't throw when it reads the new reason from the dump. No change needed
  to `classifyKind()` — it already treats any `exempt:true` row with a reason other than
  `'editor-only'` as `null` (not a finding), which is the correct behaviour here.

**Not deleted.** Deleting `splitImage`/`splitImageMobile` from `block.json` would break the cloning
pipeline's routing (see above) — the earlier recommendation to delete was the wrong call, caught
before being acted on.

## Verification

- `check-dead-controls.js --dump-json`: sgs/hero `renderConsumed:false && exempt:false` rows
  5 → 2 (resolver fix) → **0** (exemption, this pass). `splitImage`/`splitImageMobile` now read
  `exempt:true, exemptReason:'cloning-pipeline-anchor'`.
- `check-dead-controls.js --check`: exit 0, "OK — 0 net-new dead controls"; CHECK 4 advisory now
  reports "OK — 0 net-new fully-dead attributes" (previously listed the 2 sgs/hero attrs).
- `inspector-scan/run.js --json`: rule `34-declared-attr-unrendered` finding count **0** (down from
  2). No other rule/block moved — this change only touches the `block::attr` pair
  `sgs/hero::splitImage`/`sgs/hero::splitImageMobile`.
- `npm run gate:fast`: all 85 gates pass.

## Status

**CLOSED** — both attributes are now a documented, gate-recognised exemption rather than an open
finding. Nothing further to decide; if the cloning pipeline's scalar-media mechanism is ever retired,
remove the two entries from `CLONING_PIPELINE_ANCHOR_ATTRS` (`check-dead-controls.js`) and re-run
this rule to confirm they resurface as real findings before deleting the block.json attrs.
