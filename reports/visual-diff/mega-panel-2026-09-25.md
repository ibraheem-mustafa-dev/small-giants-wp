# Live verification: sgs/mega-panel, 2026-09-25

verdict: PASS
intent_capture_passed: true
commit_sha: f70687138 (fix(mega-panel): opaque by default)

Bean's option (a): an empty `panelBg` paints the surface token, the dark scheme's own fill is opaque, and
translucency comes only from `surfaceOpacity`. Deployed to sandybrown (build-deploy, all gates, motion probes green).

Panel 1745 (`<!-- wp:sgs/mega-panel {} -->`, no settings), rendered in the test drawer on `/qa-scrim/`:

| Check | Before (live, pre-deploy) | After |
|---|---|---|
| `--sgs-mm-panel-bg` | `color-mix(in srgb, #fbf3dc 92%, transparent)` | `#fbf3dc` |
| Painted value of that fill | translucent (92%) | `rgb(251, 243, 220)`, alpha 1, equal to `--wp--preset--color--surface` |

Not measured live: the dark scheme's fill (no page on sandybrown renders a dark panel; panel 2048 is unplaced). Its
value is the literal `rgb(20,20,25)` passed through the same `sgs_surface_fill_alpha()` as the light fill.
