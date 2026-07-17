# adaptive-nav — drawer link colour: prefer client text token over binary WCAG fallback (2026-07-17)

verdict: PASS
first_paint_capture_passed: true

**Change:** `sgs/nav-menu` drawer links now render the client's `text` palette token at
REST (charcoal `#3a2e26` on mamas-munches) instead of the binary `#000`/`#fff` WCAG
auto-contrast the drawer previously always used — WITHOUT ever shipping a contrast
failure on any client. Bean-requested (Phase 1 drawer polish).

## Root cause (traced, not assumed)

`sgs-nav-menu__link` never sets its own resting colour — `style.css:38` deliberately
declares `color: inherit` at `(0,1,0)` so it beats the theme's global `a{}` rule, and
lets whatever ANCESTOR sets `color` flow through. The actual colour SOURCE is
`plugins/sgs-blocks/src/blocks/adaptive-nav/render.php`'s `$sgs_anav_surface` closure
(originally L273-283): it emits `.{uid}.sgs-adaptive-nav__drawer{background-color:<drawerBg
hex>;color:<sgs_wcag_text_colour_for_bg(hex)>;}` — a BINARY `#000`/`#fff` pick, never the
client's own `text` token. `sgs/nav-menu` inherits this from the dialog ancestor (its
content zone re-parents there, FR-34-3).

## Fix — structural, no per-client hardcoding

Added `sgs_wcag_preferred_text_colour_for_bg( $bg_hex, $preferred_hex )` to
`plugins/sgs-blocks/includes/helpers-colour-wcag.php`: returns the preferred colour
(the client's `text` token) when it clears 4.5:1 against the background, else falls back
to the existing `sgs_wcag_text_colour_for_bg()` binary choice. Wired into
`$sgs_anav_surface` in `adaptive-nav/render.php` — the colour SOURCE, not a nav-menu-local
carve-out, so every drawer link (including any other block placed in the drawer content
zone) picks up one consistent, correct colour. No cascade trap: the fix changes what
`color: inherit` resolves TO, not a competing rule.

## 8-palette WCAG gate (structural — computed per render, not hand-verified once)

Only 3/8 committed client snapshots declare a `text` palette slug at all (the other 5 use
`text-primary` — a separate, pre-existing framework naming inconsistency, out of scope
here; `sgs_resolve_palette_hex('text','')` returns `''` for them and the function no-ops
to the unchanged binary fallback):

| Client | `text` token | `primary` (drawerBg default) | Contrast | Result |
|---|---|---|---|---|
| mamas-munches | `#3a2e26` | `#e68a95` | **5.28:1** | **PASS — adopts charcoal token** |
| helping-doctors | `#1a1a1a` | `#2d6e5e` | 2.90:1 | FAIL — keeps binary `#fff` (unchanged) |
| indus-foods | `#2C3E50` | `#0A7EA8` | 2.39:1 | FAIL — keeps binary `#fff` (unchanged) |
| eye-care-ward-end | no `text` slug | `#0D1B2A` | n/a | unaffected (binary fallback, unchanged) |
| sgs-construction | no `text` slug | `#1C1C1C` | n/a | unaffected (binary fallback, unchanged) |
| sgs-healthcare | no `text` slug | `#1A5F6B` | n/a | unaffected (binary fallback, unchanged) |
| sgs-mosque | no `text` slug | `#1A3D2B` | n/a | unaffected (binary fallback, unchanged) |
| sgs-professional | no `text` slug | `#1E2D5E` | n/a | unaffected (binary fallback, unchanged) |

The gate is per-render, not a one-time manual check: it can never regress a client below
AA on any current or future palette, because the preference only ever WINS when it passes.

## Live verification (sandybrown canary, mamas-munches drawer, 375px, full LiteSpeed purge)

Standalone Playwright (isolated browser instance — the shared MCP browser session was
locked by a co-active session), real keyboard Tab for `:focus-visible` (a programmatic
`.focus()` call does not reliably match `:focus-visible` in Chromium — verified this
matters, see below).

| State | link | computed `color` | computed `background-color` | note |
|---|---|---|---|---|
| REST | "Shop" | `rgb(58, 46, 38)` = **`#3a2e26`** | transparent | matches the `text` token exactly |
| FOCUS (`:focus-visible`, real Tab) | "Our Story" | `rgb(0, 0, 0)` | `rgb(245, 208, 80)` = accent yellow | WCAG-computed pill, independent mechanism |
| HOVER (real mouse) | "Shop" | `rgb(0, 0, 0)` | `rgb(245, 208, 80)` = accent yellow | same pill mechanism |
| Dialog ancestor (the colour SOURCE) | — | `rgb(58, 46, 38)` | `rgb(230, 138, 149)` = `#e68a95` | confirms the fix landed at the right layer |
| `style=""` on the link | — | — | — | **none** — `hasInlineStyleAttr: false` (Spec 32 no-inline holds) |
| Console errors on open+interact | — | — | — | **0** |

Screenshot: `reports/visual-diff/nav-menu-drawer-link-colour-2026-07-17.png` — visually
confirms REST links ("Send to Ward", "Gift Ideas", "FAQs") render a warm dark brown,
distinct from the pure black of the yellow-pill hover/focus state.

## Cascade-trap check — result: not applicable today (documented honestly)

The task brief was written expecting hover/focus to fall through the SAME `color: inherit`
chain as REST (the underline-fallback branch in `nav-menu/render.php`, reached only when
`hoverBgColour` — default `accent` — fails to resolve). On mamas-munches, `accent`
(`#f5d050`) DOES resolve, so hover/focus use an entirely INDEPENDENT WCAG-computed
background-pill mechanism (`nav-menu/render.php` L552-570) that never reads the dialog's
inherited colour at all. This fix therefore has **zero effect on hover/focus** — they were
already yellow-pill/black-text before and after. No regression; the "keep focus mirroring
base" concern doesn't bite for mamas-munches because the two states aren't actually
coupled today. If a future client's `accent` token is absent, the underline-fallback branch
(`color: inherit`) WOULD pick up this fix's new preferred-token colour automatically — the
fix is at the correct shared source for that case.

## Out-of-scope observation (not fixed — outside this task's brief)

Traced (not guessed) via `document.styleSheets` iteration: opening the drawer
programmatically moves DOM focus onto the first link (an intentional a11y open-focus
pattern), and theme.json's global `:root :where(a:where(:not(.wp-element-button)):focus)
{ text-decoration: underline; }` ties the block's `.sgs-nav-menu__link{text-decoration:
none}` at equal `(0,1,0)` specificity, and wins on source order — so the first link shows
an underline immediately on open regardless of REAL keyboard focus. Pre-existing,
unrelated to this colour fix (I did not touch `text-decoration` or any focus specificity),
and not part of Bean's ask. Flagging for awareness, not fixing — would need its own
design-gated pass (same class of bug as the `nav-menu-2026-07-16.md` colour-specificity
fix, but on a different property).

## First-paint (M1)

No change to animation/transition timing in this fix — only a `color` value swap in a
server-computed string. `transition-duration: !important` present is the pre-existing
`prefers-reduced-motion` kill-switch (baselined, unrelated to this change).

## Files changed

- `plugins/sgs-blocks/includes/helpers-colour-wcag.php` — added
  `sgs_wcag_preferred_text_colour_for_bg()`.
- `plugins/sgs-blocks/src/blocks/adaptive-nav/render.php` — `$sgs_anav_surface` now
  resolves the client's `text` token and prefers it when it passes AA.
