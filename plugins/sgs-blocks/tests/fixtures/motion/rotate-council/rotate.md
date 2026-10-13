# One modular Rotate: measured validation

Verdict: **VALIDATED**, with four conditions (section 7). Tests ran in Chromium 145.0.7632.6, Firefox 146.0.1 and WebKit 26.0 (Playwright builds, Windows) through the Playwright library (`plugins/sgs-blocks/node_modules/playwright`). The Playwright MCP browser refused `file:` URLs, so no MCP run exists; the same HTML was run headless in all three engines instead. Test files sit beside this report: `rotate-test.html`, `t2.html`, `t3.html`, `run.mjs`, `run2.mjs`, `run3.mjs`, `run4.mjs`, `out.json`.

## 1. Browser composition (individual properties plus a 3D `transform`)

Element 200x100 at (200,100), default centre origin. `translate: 20px 10px; rotate: -1deg; scale: 1.1; transform: perspective(800px) rotateX(10deg) rotateY(5deg)`.

| Measure | Chromium | Firefox | WebKit |
|---|---|---|---|
| getBoundingClientRect, individual properties + transform (`#ind`) | 208.955, 106.098, 221.598 x 109.506 | 208.95, 106.1, 221.6 x 109.5 | 208.762, 106.099, 222.477 x 107.802 |
| Same box with everything in one `transform: translate rotate scale perspective rotateX rotateY` (`#ref`) | identical to `#ind` | identical | identical |
| Wrong order (tilt functions first, then rotate/translate/scale, `#swapped`) | 209.311, 105.85, 221.245 x 109.933 (differs) | 209.317, 105.85, 221.25 x 109.933 | 209.088, 105.848, 222.027 x 107.928 |
| Tilt only (`#tiltonly`) | 198.183, 99.252, 201.449 x 101.508 | 198.183, 99.25, 201.45 x 101.5 | 198.222, 99.252, 203.555 x 101.495 |
| Top-edge angle, tilt only | 1.1706 deg | 1.1709 | 1.17 |
| Top-edge angle, tilt plus Z rest -1deg | 0.1706 deg | 0.1709 | 0.17 |

Computed values (Chromium; Firefox and WebKit equal to 4 decimals): `getComputedStyle(el).transform` = `matrix3d(0.996195, 0.0151344, -0.0858317, 0.00010729, 0, 0.984808, 0.173648, -0.00021706, 0.0871557, -0.172987, 0.98106, -0.00122633, 0, 0, 0, 1)` (the tilt alone; `translate`, `rotate` and `scale` are not folded in). `rotate` reads `-1deg`, `translate` reads `20px 10px`, `scale` reads `1.1`. The single-transform reference reads `matrix3d(1.09808, -0.00140635, -0.0858317, 0.00010729, 0.0145648, 1.08095, 0.173648, -0.00021706, 0.0680093, -0.204194, 0.98106, -0.00122633, 20, 10, 0, 1)`; a hand-built `T*R*S*transform` DOMMatrix matches it to 1e-5.

Reading: the order is CSS Transforms 2 (translate, rotate, scale, then transform; the transform acts on the element's points first). The Z rest rotate survives the tilt exactly: tilt-only edge angle 1.1706 minus the combined 0.1706 is 1.0000 deg. The card tilts about its own axes and then sits at -1deg. The proposal's key premise holds in all three engines.

## 2. Registered custom properties summed inside `rotateX(calc(...))`

`@property --a, --b, --c, --ry` typed `<angle>`; `transform: perspective(800px) rotateX(calc(var(--a) + var(--b) + var(--c))) rotateY(var(--ry))`; `transition: --a 1000ms linear, --b 2000ms linear, --ry 1000ms linear`; `--c: 5deg` held. All three engines created exactly three CSS transitions (`--a`, `--b`, `--ry`).

Paused-animation sampling (identical in all three engines, matrices equal to 6 digits; Chromium shown):

| t (ms) | --a | --b | --c | --ry | X sum | matches reference `rotateX(sum)` |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 5 | 0 | 5 | yes |
| 500 | 10 | 7.5 | 5 | 5 | 22.5 | yes, equals a static `perspective(800px) rotateX(22.5deg) rotateY(5deg)` element |
| 1000 | 20 | 15 | 5 | 10 | 40 | yes (a finished, b still running) |
| 2000 | 20 | 30 | 5 | 10 | 55 | yes |

Independence in real time (`requestAnimationFrame` sampling; `--b` started at 0 ms, `--a` started at about 610 ms while `--b` was mid-flight at about 9.1 deg):

| | Chromium | Firefox | WebKit |
|---|---|---|---|
| Frames sampled | 140 | 232 | 140 |
| `--b` max deviation from its own linear ramp | 0.14 deg | 0.07 | 0.09 |
| `--a` largest frame step | 0.34 deg | 0.20 | 0.34 |
| `--b` largest frame step | 0.25 deg | 0.15 | 0.26 |
| `--a` first moved | 625 ms | 616 | 627 |
| Final `a`, `b` | 20, 30 | 20, 30 | 20, 30 |

Reading: starting `--a` did not disturb `--b`; there are no jumps. Negative control: an unregistered `--u` produced 0 transitions in all three engines, so `@property` registration is mandatory (the stylesheet already does this).

## 3. Perspective on self versus parent

Child 100x80 offset inside a 400x300 parent (so the parent's perspective origin differs from the child's), rotateX(10deg) rotateY(5deg).

| Case | Child matrix perspective terms (4th column) | Pixel extent / area (Chromium, Firefox) |
|---|---|---|
| Parent `perspective: 800px`, child has no `perspective()` | `0, 0, 0, 1` (the parent's perspective is not in the child's matrix) | 250..349 wide, area 7838 |
| Child `perspective(800px)` in its own transform | `0.00010729, -0.00021706, -0.00122633` | starts at x 249, area 7845 |
| Parent perspective AND child `perspective(800px)` | same matrix as self (the parent adds its own projection on top) | extends to y 230, area 7815 / 7800: differs from both single cases |
| Parent perspective, child `perspective(none)` | `0, 0, 0, 1`, equal to the parent-only case | area 7838 |
| No perspective anywhere | `0, 0, 0, 1` | area 7900 |
| `perspective(var(--pf))`, `--pf` registered `<length> \| none`, value `none` | identity (matrix equals a plain rotateX) | n/a |
| Same with `--pf: 800px` | perspective terms `-0.00021706`, `-0.00123101` present | n/a |

Large-angle check (60deg rotateY, 400px perspective; box widths x heights): Chromium and Firefox parent 39.6 x 112.1, self 50.6 x 112.1, none 50.0 x 100.0. **WebKit 26.0 (Playwright Windows build): parent 50.0 x 100.0 (pixel-confirmed identical to no perspective), self 60.8 x 110.8.** In that build a parent `perspective` property has no effect on the child while the `perspective()` function does. This is one Playwright WebKit measurement; real Safari was not available and is UNVERIFIED.

What the formula must become:
- Self: `transform: perspective(var(--sgs-persp-self)) rotateX(...) rotateY(...)`.
- Parent: `--sgs-persp-self` is `none` on the element (`perspective(none)` works in all three engines, and a registered `<length> | none` property works, so the identity initial value becomes `none`; this also removes today's exception that `--sgs-tilt-persp` starts at a non-identity 800px), and the parent gets a real `perspective: <length>`.
- Two owners can disagree, and doubling is real (third row): if the entrance says self and tilt says parent, the card is projected twice. Perspective must therefore be one per-element setting, not per owner. Rule: the element resolves a single perspective (where and how much) from the first owner in layer order that declares one, every other owner reads it, and the schema rejects two owners that declare different values on one element.
- Parent mode caveats: it gives the parent a stacking context and containing block, is shared by every sibling card (one vanishing point, which the Indus draft wants), and the renderer can only write it for a parent it renders (a grid block). For a root target whose parent belongs to another block, parent mode cannot be emitted and must be disabled with a message.

## 4. What a 2D `rotate` axis-angle can do, and the three drafts

Searched every `sites/*/handoff/animations.json` for `rotateX`, `rotateY`, `rotate3d`, `perspective`, `rotateZ` and tilt-like pointer code. Literal `rotateX`/`rotateY`/`rotate3d`/`rotateZ`/`perspective` hits in animations.json: 0 in all three. `perspective` appears only in Indus's source (`Indus Foods Website v2.dc.html` lines 320 and 516, `perspective:1100px` on the sector-card parent grids).

| Draft case | Where | Proposal reproduces? |
|---|---|---|
| Indus J-09 pointer tilt: `t.style.rotate = (0.5-y) (x-0.5) 0 <hypot*16>deg`, a 3D axis-angle on the `rotate` property under parent `perspective:1100px`, no transition, about 11.3 deg at a corner | indus-foods animations.json J-09 | **Yes within tolerance, not exactly.** Mapping rotateX = 16(0.5-y), rotateY = 16(x-0.5) (8 deg and 8 deg at a corner). Over an 11x11 pointer grid on a 400x300 card with 1100px perspective the worst projected-corner error is 2.53 px (X then Y) or 2.54 px (Y then X), at the corner. Real boxes at that corner: draft 102.323, 106.56, 403.942 x 304.809; proposal 100.823, 104.654, 404.034 x 304.839. The difference is the roll component that axis-angle lacks; not visible in practice. |
| Indus A-20 tilt reset: `rotate` from current to `0 0 1 0deg`, 600 ms spring | indus A-20 | Yes: each owner property transitions on its own (section 2); reset on the spring token. |
| Indus glare: radial highlight reading `--gx/--gy` | J-09 | Yes: glare as its own layer reading the pointer values (already the spec's design). |
| Z rotates inside `transform` lists, for example `scale(1.15) translateY(-3px) rotate(-8deg)`, `rotate(90deg) scale(1.08)`, `translateY(-4px) rotate(-1deg)`, `scale(1.12) rotate(-8deg)` | indus (about 20 hover entries); mamas-munches `rotate(-9deg)` to `rotate(-3deg) translateY(-12px)`, `rotate({{ t.rot }})` to `rotate(0deg) translate(-4px,-6px)`, `scale(1) rotate(0)` to `scale(1.08) rotate(-8deg)` | Yes, through the existing `rotate`, `translate` and `scale` channels, which this proposal does not touch. A pre-existing, unrelated order difference remains: a function list orders its operations as written, the individual properties always order translate, rotate, scale. |
| Indus infinite spin `rotate 0deg` to `360deg`, 40 s (animations.json line 1480) | indus | Yes: Z `rotate` channel, ambient loop. |
| Eye Care | eye-care-ward-end | No rotation of any kind found. |
| Mamas-munches pointer drag (`onPointerMove`, line 11863) | mamas-munches | Not a tilt; unaffected. |

Loss assessment: `rotate` axis-angle about an arbitrary axis (a diagonal flip, a tilt with no roll) cannot be written exactly as rotateX then rotateY; the drafts' only use is the pointer tilt above, reproduced within 2.5 px. The current spec already specifies rotateX/rotateY for tilt (FR-38A-41), so the proposal loses nothing relative to the current design. No draft uses rotateZ inside the same transform as rotateX/rotateY, so the proposed order (X, Y inside; Z outside through the `rotate` channel) is never contradicted. Order effect to document: X and Y angles do not commute, so an entrance Y flip combined with a pointer X tilt is order-dependent (Y inner, X outer as written); owners on the same axis sum exactly. Flip-in beyond 90 deg works (rotateX/Y accept any angle); `backface-visibility` is a separate styling choice.

## 5. What exists today and what changes

Today (read): Spec 38A section 10 `transform` row is "tilt only", single owner, formula `perspective(var(--sgs-tilt-persp)) rotateX(var(--sgs-tilt-x)) rotateY(var(--sgs-tilt-y))`; `plugins/sgs-blocks/schemas/motion.schema.json::x-sgs-channels` entry `transform` (composition `single-owner`, owners `tilt` and `tier-g`); `plugins/sgs-blocks/assets/css/motion.css` rule `[data-sgs-mc~="transform"]` plus `@property --sgs-tilt-persp`, `--sgs-tilt-x`, `--sgs-tilt-y`. `includes/motion/` has no perspective handling (grep: no hit) and `assets/js/tilt-3d.js` is the old writer, so FR-38A-41 is not built; this is a spec and schema change ahead of the build.

Change list:

1. `.claude/specs/38A-SGS-MOTION-MODEL.md` section 10 `transform` row: owners become entrance `--sgs-me-rx`, `--sgs-me-ry`; hover state `--sgs-rx-rest`, `--sgs-ry-rest`, `--sgs-mh-rx`, `--sgs-mh-ry`; follow pointer `--sgs-tilt-x`, `--sgs-tilt-y`; composition "sum per axis"; formula `transform: perspective(var(--sgs-persp-self)) rotateX(calc(rx-rest + me-rx + mh-rx + tilt-x)) rotateY(calc(ry-rest + me-ry + mh-ry + tilt-y))`. Update FR-38A-41 (tilt becomes "Follow pointer" on the hover state; glare a separate hover layer), FR-38A-42 (hover rotate gains X/Y), the entrance fields (a flip-in), the Appendix A tilt line.
2. `plugins/sgs-blocks/schemas/motion.schema.json`: `x-sgs-channels[transform]` composition `sum-per-axis`; new owners and properties typed `<angle>` initial `0deg`; `--sgs-persp-self` syntax `<length> | none`, initial `none` (replacing `--sgs-tilt-persp` 800px); `$defs/TiltValues` (`perspective`, `perspectiveOn`, `maxAngle`, `axisLock`, `glare`) split so follow-pointer sits on the hover state and glare is its own `hover.effects` layer; rest and hover `rotateX/Y` fields on the hover-state values and from/to `rotateX/Y` on the entrance values (each `x-sgs-field.cssProperty` set to its owner property); `x-sgs-writes` for the new owners; one-perspective-per-element rule.
3. `plugins/sgs-blocks/assets/css/motion.css`: `@property` blocks for the six new angle properties and `--sgs-persp-self`; the `[data-sgs-mc~="transform"]` rule becomes the summed formula; a new `@keyframes sgs-me-transform` declaring the full composite (section 9 entrance rule); hover to-values for rx/ry beside the existing `--sgs-mh-to-*` set.
4. Renderer: `includes/motion/class-sgs-motion-emitter.php` (write the rest values and `--sgs-mh-to-rx/ry` as hover minus rest, mirroring the existing rotate pair), `class-sgs-motion-renderer.php` and `class-sgs-motion-markup.php` (add `transform` to `data-sgs-mc` and `data-sgs-me` when an X/Y owner exists; emit the one resolved perspective, and the parent `perspective` only where the renderer owns the parent), `class-sgs-motion-layers.php` and `class-sgs-motion-layer-drops.php` (glare as its own layer; tilt stops being the sole claimant of `transform`; constants `CROSS_ROWS_RULE`/`CROSS_TEXT_RULE` renamed), regenerated `src/components/motion/generated-motion-defs.json`, `assets/js/tilt-3d.js` replaced by a custom-property writer (enqueue in `includes/class-sgs-blocks.php`), `src/blocks/extensions/hover-effects/panels/HoverPanel.js` (new fields), fixtures `tests/fixtures/motion/valid-three-panel-stacked-hover.json` and `tests/php/MotionRendererTest.php`.
5. Refusal table: the `transform` row becomes "any X/Y owner (entrance rotateX/Y, hover rotateX/Y or rest, follow pointer) together with a Tier G effect that tweens transform on the same element (scrub with an x, y, scale or rotate row, pin-scrub child, flip, motion-path, draggable)", text "<owner> and <effect> both drive this element's transform. Move one of them to a different part." The schema pairs `transform-tilt-tier-g-scrub` and `transform-tilt-tier-g` keep their effect lists but their `a` side widens from `hover.effects` tilt to also `hover.state` and `entrance.base` X/Y fields. New refusal: two owners declaring different perspective. GSAP stays refused: it writes the whole inline `transform`, which beats the stylesheet rule (same mechanism, wider trigger).

## 6. Risks

1. Wider Tier G conflict surface: today only tilt blocks Tier G transform effects; afterwards a flip-in entrance or a resting rotateX blocks them too. The scroll-effect rule (a scrub that owns transform suppresses the entrance at render time) covers part of it.
2. Any non-`none` transform (even `perspective(none) rotateX(0deg)`) creates a stacking context and a containing block for fixed descendants. The "never held" promise survives only if the channel is emitted when an owner is declared and an entrance releases it to `none` at its end; a resting rotateX/Y is persistent by design.
3. Parent perspective is not honoured by the Playwright WebKit build and is unconfirmed in Safari.
4. The draft tilt is reproduced within 2.5 px, not exactly; FR-38A-41's "11.3 deg at a corner" wording measures an axis-angle, so its Done-when must be reworded to the X/Y mapping (8 deg and 8 deg) or the matrix.
5. Doubled perspective if self and parent are both set (measured).
6. The editor iframe and the front end both need the new `@property` blocks.
7. Not tested: real Safari, touch devices, and the full renderer (not built).

## 7. Verdict and check

**VALIDATED**, on four conditions: (a) one perspective per element, registered `<length> | none`, default self; (b) parent mode only for a parent the renderer owns, with Safari checked before FR sign-off; (c) FR-38A-41's Done-when reworded to the X/Y mapping; (d) refusal rules widened as in 5.5.

Predicted outcome after the change, on a fixture card with rest rotate -1deg, rest rotateX 10deg, hover rotateY 5deg engaged, self perspective 800px, translate 20px 10px, scale 1.1 (Chromium and Firefox): `getComputedStyle(el).transform` equals `matrix3d(0.996195, 0.0151344, -0.0858317, 0.00010729, 0, 0.984808, 0.173648, -0.00021706, 0.0871557, -0.172987, 0.98106, -0.00122633, 0, 0, 0, 1)`, `rotate` is `-1deg`, the bounding box is 208.955, 106.098, 221.598 x 109.506 (tolerance 0.05 px), and a transition on `--sgs-mh-ry` alone moves the matrix while `--sgs-me-rx` is held. Entrance flip: `--sgs-me-rx` 90deg to 0deg over 800 ms, paused at 400 ms, reads rotateX 45deg plus rest.

Check commands after the change: run the harness here against the rendered fixture (`node run.mjs` in this folder, pointing `url` at the fixture page) and compare to the numbers above; in the repo `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` (exit 0, no `style` attribute written) and `php plugins/sgs-blocks/vendor/bin/phpunit --filter MotionRendererTest` once the fixture gains an X/Y owner.
