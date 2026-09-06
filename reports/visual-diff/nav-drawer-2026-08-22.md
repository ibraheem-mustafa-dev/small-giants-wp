---
block: sgs/nav-drawer
date: 2026-08-22
verdict: PASS
editor_capture_passed: true
editor_capture_run: true
capture_method: chrome-devtools MCP against the live sandybrown canary — computed-style reads inside the editor-canvas iframe, wp.data selectBlock/updateBlockAttributes for the editability probe, wp.blocks.serialize for the serialisation check, plus a frontend open/close pass at 500px. All post-deploy.
deployed_build: deploy 2026-08-22 16:42 (build-deploy.py --target sandybrown, blocks)
change: collapsed-by-default editor preview shell + explicit "Preview drawer open" inspector toggle; height/width neutralisers so style.css's 100dvh/100vw no longer fill the canvas
source_sha: 6425f728
discharges_skips:
  - "2026-08-22 16:35:44 | nav-drawer | editor-canvas capture requires the CSS live in the editor"
  - "2026-08-22 16:4x | nav-drawer | follow-up specificity fix, same constraint"
---

## What this report verifies

`edit.js` and `editor.css` only — neither is a frontend surface. The change makes
the editor preview shell collapse to a summary strip by default and expand from an
explicit inspector toggle, and neutralises the `height:100dvh` / `width:100vw` that
`style.css` was applying to the shell inside the editor canvas.

## Before (measured, pre-deploy, on the live editor)

Template `page`, canvas iframe, `.sgs-nav-drawer__editor`:

| Measure | Value |
|---|---|
| computed height | **771px** |
| canvas viewport height | **771px** |
| fills above the fold | **true** |
| computed width | 1440px |

The shell was exactly `100dvh` of the canvas. This is the defect as reported.

## After (measured, post-deploy)

**Collapsed (default)** — template `page`:

| Measure | Value | Gate |
|---|---|---|
| computed height | **46px** (6% of fold, was 100%) | ≤80px PASS |
| body `display` | `none` | PASS |
| body still in DOM | true, 2 children | nothing unmounted |
| horizontal canvas overflow | false | PASS |
| `--collapsed` class applied | true | PASS |

**Expanded (toggle on)** — template part `header`:

| Measure | Value | Gate |
|---|---|---|
| computed height | **240px** | ≤420px PASS |
| body `display` | `flex` | PASS |
| body children | 3 | PASS |
| `--collapsed` class | removed | PASS |

## Editability when expanded (the highest-risk check)

Collapsing hides the body with CSS and never unmounts it. Proven rather than assumed:

- Both children selectable: `sgs/nav-menu` and `sgs/responsive-logo`, each reporting
  `getBlockEditingMode === "default"` (not disabled, not locked).
- A real mutation landed and was reverted: `updateBlockAttributes` on `sgs/nav-menu`
  set `sgsCustomCss`, read back `applied: true`, then reverted, read back
  `reverted: true`.
- Editor breadcrumb while expanded read
  `Template Part › SGS Nav Drawer › SGS Responsive Logo`, i.e. an inner block was
  genuinely selected in place.

## The toggle does not serialise

`wp.blocks.serialize` on the drawer returned:

```
<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu /-->

<!-- wp:sgs/responsive-logo {"width":140} /-->
<!-- /wp:sgs/nav-drawer -->
```

No attributes at all on the drawer; `mentionsPreview: false`; no attribute whose name
matches `preview|open|collapse`. The preview flag is component state, so it cannot
reach saved content.

## Frontend unaffected (proves editor.css did not leak)

Homepage, 500px viewport:

| State | Result |
|---|---|
| at rest | `<dialog>`, no `open` attribute, `display:none`, height 0 |
| editor class present on frontend | false |
| `nav-drawer/index.css` (editorStyle) in frontend stylesheets | **false** |
| after burger click | `open=true`, `display:block`, height 844 = full viewport, `aria-expanded=true` |
| after close × | `open=false`, `display:none` |

STOP-DIALOG-DISPLAY-GATE holds: no `display` is set on the `<dialog>` base rule, so
the UA's `dialog:not([open]){display:none}` still does the hiding.

## A defect this capture caught

The first deploy of this change was visibly wrong and the measurement is what found
it. The shell came down from 771px to 231px, but its body was still `display:flex`
and still laid out. `.sgs-nav-drawer__editor--collapsed .sgs-nav-drawer__body` and
`.sgs-nav-drawer__editor .sgs-nav-drawer__body` are both (0,2,0); at equal
specificity the later rule wins, and `display:flex` sits ~35 lines below
`display:none` in the same file. The collapsed selectors now also carry the
block-name class, making them (0,3,0). Fixed in `6425f728` and re-measured above.

A rule that loses is indistinguishable from one that is absent. Only reading the
computed value on the live element separates them.

## Unrelated observation, recorded not fixed

On one load of template `page`, two `sgs/business-info` blocks rendered
"Error loading block: [object Object]". The 500 response body was
`{"code":"wp_die","message":"<h1>Error establishing a database connection</h1>"}` —
the host's database briefly refusing connections under a burst of ~12 concurrent
block-renderer requests, not a defect in the block. A reload returned zero error
blocks. Recorded because this error class appears and disappears between loads and
could otherwise be mistaken for a code fault.

## Gates

- `audit-inline-styling.js --check` — PASS, 0 violations across 83 blocks
- `check-editor-render-parity.js --check` — exit 0 (its one nav-drawer entry,
  `ariaLabel`, is advisory and belongs to the accessible-name control added by the
  colour track, not to this change)
- `check-no-core-blocks.py` — clean, 58 theme files
- `npm run build` — exit 0
