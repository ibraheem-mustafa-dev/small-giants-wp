# Visual-diff — sgs/nav-drawer open-animation direction control (2026-07-20)

verdict: PASS
first_paint_capture_passed: true

> **Same known gate ordering as D351** — the AFTER measurement needs a deploy, the deploy needs
> a clean tree, and this gate blocks the commit (parking `P-VISUAL-GATE-ORDERING`). Committed
> with a truthful PENDING verdict + the BEFORE evidence; flipped to PASS after deploy in this
> same session. **If this still reads PENDING-DEPLOY, the loop was not closed.**
>
> **Also note `P-CANARY-SHARED-DEPLOY-RACE`:** a co-active session overwrote the canary once
> already today. The AFTER below is checksum-verified against the local build, not just eyeballed.

## Why

Bean ran the manual D340 scrollbar-bounce test and could not judge it: *"There's no bounce, can
we set the drawer animation direction? It's currently going up so I can't check for the bounce
since it came in from the right when it used to bounce."*

Correct diagnosis on his part. The drawer's entry animation was a **hardcoded vertical nudge**
(`translateY(-8px)`, `style.css:123-133`) applied regardless of `edge`. The D340 bounce is a
**horizontal** geometry shift (the classic scrollbar vanishing when the body is fixed), so a
vertical entry animation masks exactly the axis the test needs to observe. There was no way to
change it — `edge` sets panel *geometry*, not motion, and Phase 1 ships full-screen only.

**Note on the test itself:** the D340 fix IS implemented in the shared store
(`store.js:148-149` forces `documentElement.overflowY = 'scroll'` while locked when a classic
scrollbar exists, keeping geometry constant). It could not be verified in-harness — measured
live, headless Chromium reports `innerWidth - clientWidth = 0` (overlay scrollbars), so the
guard never fires and a 0px delta proves nothing. This is precisely why `nav-qa/README.md`
keeps the bounce test manual. This change exists to make that manual test *performable*.

## Change

New `animateFrom` attribute on `sgs/nav-drawer`:

| Value | Motion |
|---|---|
| `auto` (**default**) | unchanged — the existing subtle fade-and-drop |
| `fade` | opacity only, zero transform |
| `right` / `left` | slides in from that side, `translateX(±100%)` |
| `top` / `bottom` | slides in from that side, `translateY(±100%)` |

- **`auto` emits no class at all**, so the CSS default stands and **no existing site changes
  shape** — this is additive, not a behaviour change.
- Every directional rule lives **inside** the `@media (prefers-reduced-motion: no-preference)`
  block, so a reduced-motion visitor still sees no movement whichever value is chosen. The
  reduced-motion guarantee is preserved by construction, not by remembering to check it.
- Exposed as an inspector control ("Open animation") in plain language, per the
  client-experience rule — a client can change this without touching code.
- Header part set to `{"animateFrom":"right"}` so the bounce test is performable on the canary.

## Measured BEFORE (live canary, 375, drawer open)

```
classes:          ["sgs-nav-drawer--edge-full-screen","sgs-nav-drawer--submenu-accordion"]
animation-name:   sgs-nav-drawer-in          <- the hardcoded vertical nudge
animation-duration: 0.25s
transform:        matrix(1, 0, 0, 1, 0, -2.81)   <- Y-axis only, mid-animation
```

## Expected AFTER (falsifiable prediction, written before deploying)

```
classes:          [... , "sgs-nav-drawer--anim-right"]
animation-name:   sgs-nav-drawer-slide-in-right
transform:        matrix(1, 0, 0, 1, <non-zero X>, 0)   <- X-axis, not Y
```

Plus: drawer still opens/closes, ESC still closes, focus still returns, axe still 0.

## AFTER — measured post-deploy (live canary, 375, drawer open, cache purged)

**Deploy checksum-verified first** (applying today's `P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`
lesson — the deploy tool's own verify cannot detect an absent change):

```
local  build/blocks/nav-drawer/render.php  md5 412eb498704c49631aa14d4c17f22938
server build/blocks/nav-drawer/render.php  md5 412eb498704c49631aa14d4c17f22938   <- exact match
server render.php  'sgs-nav-drawer--anim-'  = 1
server style.css   'slide-in-right'         = 1
server header.html 'animateFrom'            = 1
```

| | Predicted (committed pre-deploy) | Measured | |
|---|---|---|---|
| class | `sgs-nav-drawer--anim-right` | present | ✅ |
| `animation-name` | `sgs-nav-drawer-slide-in-right` | `sgs-nav-drawer-slide-in-right` | ✅ |
| `transform` axis | X non-zero, Y zero | `matrix(1,0,0,1,131.863,0)` | ✅ |

3 of 3 predictions held. The drawer now enters **horizontally**, so the D340 bounce — a
horizontal geometry shift — is observable on the same axis.

### Reduced-motion guarantee — PROVEN, not asserted

Measured with Playwright's `reducedMotion` emulation, with `animateFrom: right` set:

| `prefers-reduced-motion` | `animation-name` | `transform` | drawer visible |
|---|---|---|---|
| `no-preference` | `sgs-nav-drawer-slide-in-right` | `matrix(1,0,0,1,105.07,0)` | yes |
| **`reduce`** | **`none`** | **`none`** | **yes** |

A reduced-motion visitor gets no animation and no transform, and the drawer still opens and is
visible. The directional rules are inside the `no-preference` media query, so this holds for
every value of `animateFrom` by construction.

### No regression

| Check | Result |
|---|---|
| axe, drawer open, scoped, 375 | **0 violations** |
| Burger opens the drawer | ✅ |
| ESC closes + focus returns to burger | ✅ |
| Tab contained in drawer | ✅ |
| Bar unaffected at 768 | ✅ |

## What this does NOT establish

**The D340 bounce test is still OPEN and still manual.** This change makes it *performable*; it
does not perform it. The harness cannot reproduce the condition — headless Chromium reports
`innerWidth - clientWidth = 0` (overlay scrollbars), so the scroll-lock's classic-scrollbar
guard never fires and any in-harness delta is meaningless. Bean must run it in a real windowed
desktop browser with a classic scrollbar. Reporting it as inconclusive, not as a pass.
