# Visual-diff — sgs/container WS-1c (A3 + A4) — 2026-06-03

**Block:** sgs/container · **Change:** A3 custom-width `margin-inline:auto` centring + A4 `sgs_container_gap_value()` raw-px gap passthrough.
**Target:** canary page 144 (`/rc-fix-verification-mamas-munches/`) @1440, post deploy + OPcache reset.
**Method:** Playwright computed-style (`getBoundingClientRect`) — `C:\tmp\gateB-verify.mjs`.

## Result — PASS (live-DOM, R-22-11)

| Section | section width | inner (`__inner`) width | Expected | Verdict |
|---|---|---|---|---|
| featured-product | 1440 (full-bleed) | 1040 | full-bleed + 1040 | ✅ |
| ingredients | 1440 | 960 | full-bleed + 960 | ✅ |
| gift | 1440 | 960 | full-bleed + 960 | ✅ |
| social-proof | 1440 | 960 | full-bleed + 960 | ✅ |
| brand | 1000 (custom, centred) | — | 1000 custom, centred | ✅ (A3 margin-inline:auto holds) |

No regression on the WS-1 A1/A2 sections; A3 keeps the custom-width brand section centred at 1000; A4 gap passthrough shows no invalid-token regression. Matches the WS-1 acceptance gate.

## Not in this commit (deferred — honest status)
- **#3 heading/label textAlign** — block capability added + build-clean, but the "Zookies" featured-product heading still computes `text-align:center` live (the converter does not yet EMIT `text-align:start` onto cloned headings → needs a converter-emit + re-clone to land the visible outcome). Capability is correct (R-22-9 parity); end-to-end outcome PENDING. Uncommitted.
- **#8 testimonial-slider** — improved vs Bean's "half-width" report (3 cards + both arrows now show), but residual defects: pause button floats top-right outside `__controls`; lucide icons render as broken `?` (icon-sideload gap); track 627/960 not fully filling. NOT clean — HELD uncommitted; folds into the WS-4 LAYOUT remodel of testimonial-slider + a focused pass.
