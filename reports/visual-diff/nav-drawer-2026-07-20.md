# Visual-diff — sgs/nav-drawer open-animation direction control (2026-07-20)

verdict: PENDING-DEPLOY
first_paint_capture_passed: false

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

## AFTER — measured post-deploy

_Pending. To be completed in this session._
