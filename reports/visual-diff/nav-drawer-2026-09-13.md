# Visual diff — sgs/nav-drawer — 2026-09-13 (FR-41-36 drawer contrast context)

verdict: PASS
intent_capture_passed: true
source_sha: e33eb78e3e135edd

## What changed

`nav-drawer/block.json::providesContext` gained one new entry:
`"sgs/navDrawerBg": "drawerBg"` — publishing the drawer's own `drawerBg` attribute to any
`sgs/nav-menu` nested inside its content, mirroring the existing
`"sgs/navDrawerSubmenuModel": "submenuModel"` pair already declared there. No attribute was
added, removed, or renamed; no markup or CSS in this block changed. This is a metadata-only
change enabling `sgs/nav-menu` (the consumer) to genuinely contrast-check its own drawer
submenu text colour against this drawer's resolved background, instead of hardcoding
`color:inherit`.

## Why intent_capture, not first_paint

`nav-drawer` itself renders byte-identical markup/CSS before and after this change — the
new context key is read only by `sgs/nav-menu`'s own `render.php`. There is no visual state
of `nav-drawer` in isolation to diff; the assertion is "does providing this context produce
the correct downstream effect in the consumer", checked directly on the live canary.

## Live result — sandybrown canary, drawer open, `drawerBg` at its framework default (`primary`, `#e68a95`)

| Check | Result |
|---|---|
| `sgs/nav-drawer` own rendered markup/CSS | unchanged — no diff against pre-change baseline (metadata-only edit) |
| Downstream consumer (`sgs/nav-menu` inside this drawer) | its `.sgs-nav-menu__sublink` colour rule resolved to `color:#000` (was `color:inherit`), genuinely contrast-checked against this drawer's own `drawerBg` — confirmed via live stylesheet fetch |
| Screenshot | `reports/visual-diff/nav-menu-submenu-lip-2026-09-13-drawer-submenu-open.png` — "Ingredients"/"Our Promise" legible dark text against the pink drawer background |

Full root-cause + fix narrative (shared with the `sgs/nav-menu` side of this change):
`reports/visual-diff/nav-menu-submenu-lip-drawer-contrast-2026-09-13.md`.

## Risk

Additive-only `providesContext` entry. A `sgs/nav-menu` instance that does not declare
`usesContext: ["sgs/navDrawerBg"]` simply never receives it (standard WP block-context
behaviour) — no effect on any other consumer of this drawer's context.

## Files changed

- `plugins/sgs-blocks/src/blocks/nav-drawer/block.json` — `providesContext` +=
  `sgs/navDrawerBg: drawerBg`.
