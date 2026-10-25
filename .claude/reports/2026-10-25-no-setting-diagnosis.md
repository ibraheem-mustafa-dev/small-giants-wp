# Fill's "no-setting" rows on Indus: what they really are (2026-10-25)

Population: every `no-setting` UNMAPPED row of the 25 Indus Phase 2 Fill runs (`sites/indus-foods/build/qa/fill/<surface>/2026-10-25T*/unmapped.json`): 6,912 rows, 433 block and property pairs. Four read-only diagnosis lanes (box and paint, size and layout, motion, typography and forms) followed `/systematic-debugging`, each verdict reproduced with `lib/resolve.mjs::resolve` on the Indus calibration, a DB query or the run files. Lane outputs and scratch scripts were session scratch; the counts below are theirs, overlapping where a node appears in two lanes (form fields, the ring spans), so they are approximate.

`lib/gap-classes.mjs::mapResolverGap` classes every `no-setting` row as F-setting (a framework gap) by its label alone. The diagnosis shows most are not.

## Verdicts

| Verdict | What it means | Rows (approx.) |
|---|---|---|
| R2 | the draft value equals the block's default, inherited or browser value, or is a design-tool artefact; it should be held | ~2,780 |
| R1 | a setting exists and the route never reaches it | ~1,300 |
| Ring decision | 69 draft ring spans (`data-ring`, absolute, bordered, 50% radius) paired by `skeleton-decisions.json::rules.decorativeShape` to `sgs/decorative-image`, which has no border, radius, size or inset setting | ~1,380 |
| Route reporting faults | duplicate timing rows, refused motion writes with the reason lost, live transition superset | ~840 |
| R4 | a genuine missing setting | ~570 |
| Not triaged | | ~330 |

## Root causes, by rows closed

1. **`sgs/media` font longhands (896, R2).** Every media node is an `<image-slot>`; `handoff/image-slot.js` sets `:host{font:…}`, resetting 14 font longhands. `lib/fill-held.mjs::classify` holds inherited properties only on nodes with children, and `lib/calibrate-props.mjs` reads none of the 14. Fix layer: route (treat a custom element's `:host` font reset, or font on a node that prints no text, as not declared).
2. **Forms have no `sgs/form` host (577, R1 + R2).** The apply, careers, catalogue and contact skeletons hold no `sgs/form` (checked: 0 in each); `lib/skeleton-form-steps.mjs::formStepNodes` makes the host only for multi-step forms, and each `<input>` is paired to the field wrapper instead of `.sgs-form-field__input`. `sgs/form` owns `fieldBorder*`, `fieldBackground`, `fieldPadding`, `fieldFontSize` and others on `field-input`. Fix layer: skeleton.
3. **`position` and `z-index` never measured (~560, R2).** Neither is in `lib/calibrate-props.mjs` read lists (checked), so the default paint is "unmeasured" and nothing judges `position:relative` (painted by `.sgs-container`, `.sgs-hero`) or `z-index:1` (`container/style.css` `:where(.sgs-container) > *`). Fix layer: calibration read list (re-measures every block calibration).
4. **Transition timing reported twice (~376).** `lib/fill-timing.mjs` raises its own timing rows, and the generic pass reports the same longhands again because `lib/fill-read.mjs::PROPS` includes them; `lib/fill-held.mjs::coveredByMotion` also ignores the layer's `paintDuration`/`shadowDuration` (67). Fix layer: route.
5. **Refused motion writes lose their reason (~317).** `lib/fill-motion.mjs::writeNode` joins refusal objects into `sgsMotion refused: [object Object]` (in all 25 runs). Fix layer: route, then re-read the real refusals.
6. **Box and paint properties never try another slot (574, R1).** `lib/fill-resolve-state.mjs::alternateSlots` widens the slot only for its `CARRIED` list (text, gap, alignment): a label's background (painted on `::after`), an icon's radius (on `.sgs-icon__shape`) and form field paint (on `sgs/form`, through `lib/resolve.mjs::resolveViaAncestor`, which only Solve calls) never land. Fix layer: route.
7. **`display` blockification (~280, R2).** A draft `inline-flex` inside a flex parent computes `flex`; `lib/css-equivalence/tolerance.mjs::paintCanon` has no blockification rule. Fix layer: route.
8. **An undeclared `0s` transition duration read as a design value (263, R2).** `lib/fill-prop.mjs::notPainted` treats delay and timing-function as inert at 0s, never duration. Fix layer: route.
9. **Hover shorthand resets (196, R2).** A hover `background:` resets seven longhands to their initial values; `lib/css-equivalence/index.mjs::consult` never compares a hover value with the resting paint. Fix layer: route.
10. **Smaller:** same-box inner part paint not consulted (`breadcrumbs` list, `icon` shape: ~150); `bgSvgMinHeight` ties with `minHeight` (35); `held:default` rows still classed F by `mapResolverGap` (52); `option-picker` has no Indus calibration (52); the label's dot never emitted (268, plausible).

## Genuine missing settings (R4, ~570 rows)

`sgs/container` hover box-shadow (94) and `overflow: clip` (142); `sgs/media` aspect-ratio (64); container hover padding (28); `font-variant-numeric` (83), `cursor` (51), `text-shadow` and `text-overflow` (27) on text blocks; button hover font-weight (28); form input width and transition (51). The ring (cause list above) is a separate decision: a block that draws a bordered ring, or a skeleton rule that pairs rings to one that can.

## What this changes

- About 8% of the "missing settings" are missing settings; about 80% are the route's own recognition, settle or reporting faults, or skeleton pairing (forms, rings).
- The census must not class a resolver `no-setting` verdict as a framework gap on its label alone (`lib/gap-classes.mjs::mapResolverGap`).
- The skeleton is not fault-free: forms lack their host and rings are paired to a block that cannot draw them.
