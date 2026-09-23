# Live verification: sgs/nav-drawer, 2026-09-23 (U-1 4c surface ground and shadow, non-modal on a blurred header)

verdict: PASS
intent_capture_passed: true
commit_sha: 0980e8b1d (4c), 298f7e45c (drawer surface tone)

## Environment and method
- Site: eye-care-test, active drawer post 14 set temporarily to `surfaceBlur:12px`, `surfaceSaturate:150`, `surfaceOpacity:0.8`, `shadow:lifted`, `modality:non-modal`, then restored byte for byte from a saved copy (verified).
- The site's header is the theme's own template part, so the header blur was applied in the browser (`backdrop-filter: blur(12px)`, the same declaration the wrapper emits); the risk under test (a `backdrop-filter` ancestor becoming the containing block of a `position:fixed` drawer) depends on that property alone.
- One headed Chrome window at 390x844; the drawer opened with a real click on the burger. Logged in as an admin, Hostinger's own chat assistant overlay covered the burger and was hidden in the tab (admin-only, not rendered for visitors).

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Fill opacity | PASS | `background-color: color(srgb 0.98 0.9765 0.9647 / 0.8)` (drawerBg `surface` at 80%) |
| 2 | Backdrop | PASS | `backdrop-filter: saturate(1.5) blur(12px)` |
| 3 | Shadow | PASS | the Lifted preset layers on the drawer root |
| 4 | Surface tone | PASS | the drawer root carries `sgs-on-light` (light fill) |
| 5 | Non-modal on a blurred header: position | PASS | the dialog is not inside the header (no containing-block capture); it opened at 0,0 and 375x844 inside a 390x844 viewport |
| 6 | Non-modal: page behind stays live | PASS | not `:modal`; the header is not inert; header z-index 100 sits above the drawer's 90, so the burger stays on top (`elementsFromPoint` at the burger: the admin bar, admin-only, then the burger) |
| 7 | Default drawer unchanged | PASS | standalone test: no new attribute set means no new CSS (29 passed) |

## Not measured
- The edge fade (4d, `surfaceFadeEdge`) was not checked live: this site's header is the theme's template part and no header post exists to set it on; its render output is proved by `tests/php/run-header-fade-edge-standalone.php` (9 passed) only.
- The editor inspector for the drawer's Surface panel was not clicked through in this pass.
