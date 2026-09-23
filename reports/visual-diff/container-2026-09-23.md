# Live verification: sgs/container and the wrapper blocks, 2026-09-23 (universal shadow-tone check, U-1 4e blur)

verdict: PASS
intent_capture_passed: true
commit_sha: f9f20b8e7 (tip); the change set is 7dcedb346 (resolver + wrapper), c82ec0fb4 (default colour, style-engine fallbacks, elevated styles, dark-mode light reset), 298f7e45c (editor mirror, drawer and mega-panel surfaces), d53805634 + 9759d039b (stylesheet colours, one forced-colours owner), f9f20b8e7 (canvas wiring), cb2bb4d46 (4e blur fan-out)
design: `.claude/reports/2026-09-23-shadow-tone-design.md`

## Environment and method
- Site: eye-care-test (`darkcyan-grouse-898606.hostingersite.com`), plugin and theme 1.5.95 deployed with `--skip-gate-full` and `--payload` for another session's uncommitted `sgs/google-reviews` files, `sgs-blocks.php` and `includes/helpers-slider-nav.php` (their in-progress work, shipped to this test site only; `gate:full` failed only on their files).
- Fixture page 53 `/qa-dark-shadow/`: bands of `#121212`, `#F3F0E8`, `#075E80`, `linear-gradient(135deg,#075E80,#0F4C4C)`, a photo with a `#000000` overlay at 70%, `#777777`, `#555555`, and a white band with `surfaceBlur:12px`, `surfaceSaturate:150`; each holds a white `lifted` card (the dark band holds a `#1E1E1E` card and a nested light card with its own child).
- One headed Chrome window (chrome-devtools) at 1440x900, pages fully loaded; values read with `getComputedStyle`. Forced-colours emulation through the Playwright MCP (the chrome-devtools tool cannot emulate it), in a second window opened for that check alone and closed straight after.

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Band tone on the page | PASS | dark: `#121212`, `#075E80`, the gradient, the photo with overlay, `#555555`; light: `#F3F0E8`, `#777777`, white |
| 2 | Cards on dark bands | PASS | ring layer `color(srgb 0.9098 0.9098 0.9098 / 0.12) 0 0 0 1px` first, then black at 2.2x (teal, gradient, photo, `#555555`, `#1E1E1E` cards) |
| 3 | Cards on light bands | PASS | original site-colour layers (`#1A202C` at 0.05 / 0.08 / 0.12) on `#F3F0E8`, `#777777`, white |
| 4 | Nested light card | PASS | the light card's own shadow follows its dark parent; its child resets to the site colour |
| 5 | Editor canvas | PASS (after f9f20b8e7) | the same classes and shadows in the editor iframe as on the page, band for band. Before f9f20b8e7 only the photo band was marked and no band showed its blur: every `backgroundPreview` call site omitted `backgroundColour`, `backgroundColourGradient`, `surfaceBlur`, `surfaceSaturate` |
| 6 | 4e blur on a wrapper block | PASS | `backdrop-filter: saturate(1.5) blur(12px)` on the page and in the canvas |
| 7 | Forced colours | PASS | every shadowed element: `box-shadow: none` and `outline: 1px solid` in the system text colour; negative control with forced colours off: shadow present, `outline: none` |
| 8 | Screenshot | PASS | local only (git-ignored scratchpad); white cards keep a readable edge on teal, gradient, photo and grey |

## Not measured / known limits
- Site dark mode was not re-run in this pass (it was measured on 2026-09-22; the dark-mode light-surface reset added in c82ec0fb4 is unit-tested only).
- A theme gradient preset referenced by slug reads as unknown in the canvas until block callers pass `useSettings( 'color.gradients' )`.
- An image with no overlay is never sampled, on the page or in the canvas.
- Bean's eye (R-31-13): signed off 2026-09-23, every band looks right.

---

# Live verification: shadow lift on hover (every shadowed block), 2026-09-23 (appended)

verdict: PASS
intent_capture_passed: true
commit_sha: 9a309281a (hover map, resolver, dark variants, stylesheet lift), 8b18b9d75 (PHP emitters, switch, overlays, media atom guard)
design: `.claude/reports/2026-09-23-shadow-hover-lift-design.md`

## Environment and method
- Site: eye-care-test, plugin and theme 1.5.96 deployed after 8b18b9d75 (declared payload for another session's uncommitted google-reviews, `sgs-blocks.php`, `includes/helpers-slider-nav.php`; test site only).
- Fixture page 53 `/qa-dark-shadow/` (sgs/container cards through `SGS_Container_Wrapper`, the path every wrapper block shares), plus a band holding a `lifted` card with `shadowLiftOnHover:false` and a `hard` card.
- One headed Chrome window; real pointer hover through chrome-devtools at 1440x900; a touch tap with touch emulation at 390x844; `getComputedStyle` read before, during and after.

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Lifted card on a light band, hovered | PASS | rest = the lifted layers; hover = the floating layers (2px 4px, 8px 16px, 24px 48px -8px, 48px 96px -16px) |
| 2 | Lifted card on the deep-teal band, hovered | PASS | hover = the dark variant of floating: the 1px light ring first, then black at 2.2x (0.088, 0.132, 0.264) |
| 3 | Pointer moves away | PASS | the light card returns to its resting value exactly |
| 4 | `shadowLiftOnHover:false` (negative control) | PASS | hovered, shadow unchanged |
| 5 | Decorative preset `hard` | PASS | `4px 4px 0 0` rest, `6px 6px 0 0` hover (its own matching hover, not a soft float) |
| 6 | Touch tap (390x844, touch emulated) | PASS | `(hover:hover) and (pointer:fine)` is false; after the tap the card still reports `:hover` (sticky hover) but its shadow is unchanged, so the lift does not stick |

## Not measured
- Every other block family (card-grid items, post-grid cards, team-member, the supports.shadow blocks, media, stylesheet shadows) is covered by standalone tests (`run-shadow-hover-rules-standalone.php` 30, `run-post-grid-hover-shadow-standalone.php` 9, `run-media-atom-shadow-hover-standalone.php` 9) and the build gates (`shadow-lift --check`, `check-shadow-sources.py --check`), not hovered live one by one.
- Overlay blocks not lifting (mega-panel, nav-drawer, modal, cart) is declared in block.json and tested in PHP; not hovered live.
- The editor's Lift on hover toggle was not clicked through.
