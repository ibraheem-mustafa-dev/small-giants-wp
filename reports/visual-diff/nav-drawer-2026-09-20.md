# Live verification — non-modal drawer background freeze — 2026-09-20

```
verdict: PASS
intent_capture_passed: true
blocks: nav-drawer
target: sandybrown-nightingale-600381.hostingersite.com
date:   2026-09-20
branch: main @ b198c2e7f ("fix(nav): a non-modal drawer opened from in-content freezes the rest of the page")
```

Deployed with `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` from commit
91444e40b (which contains b198c2e7f). The drawer's own markup and CSS are unchanged; the change is which page
regions are marked `inert` while a non-modal drawer is open (`src/shared/nav-interactivity/freeze-background.js::collectFreezeTargets`).

Command: `node scripts/nav-qa/w2u-probe.mjs qa-w2u-nonmodal-drawer 1440 content` (fixture: non-modal drawer, trigger inside page content).

| Check | Before the change | After the change | Verdict |
|---|---|---|---|
| Elements marked `inert` with the drawer open | 15 | 47 | PASS |
| Content burger (the trigger) stays operable | live | live (`burgerInert=false`) | PASS |
| Mega trigger inside `main` | live | `inert` (`megaTriggerInert=true`) | PASS |
| Focus moves into the drawer on open | yes | yes (`button.sgs-nav-drawer__close`) | PASS |
| ESC closes and returns focus to the burger | yes | yes (`isBurger=true`) | PASS |
| Body scroll lock engages and releases | yes | yes (closed / `fixed` / closed) | PASS |
| Tab walk stays within drawer and live trigger row | not contained | 23/25 inside the legal set, 0 landed in an inert subtree; the 2 others landed on `<body>` (focus leaving the last focusable) | MEASURED |

Header-triggered behaviour is unchanged by construction (the pure function is unit-tested for it, with a negative control:
`scripts/tests/test-nonmodal-freeze-background.mjs`, in the fast gate tier).

Not measured: the same probe at 375px and with the header burger were not re-run after this change.
