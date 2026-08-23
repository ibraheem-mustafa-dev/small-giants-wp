---
doc_type: session-archive
project: small-giants-wp
swept: 2026-08-23
reason: "LEDGER byte cap — section CLOSED with nothing pending; swept VERBATIM"
---

## ▶ FR-38-12 FLIP — CLOSED 2026-08-22 (D741)

**Nothing pending.** Five prior sessions (D698, D699, D702, the 2026-08-21 report, the
2026-08-21 Tier W close above) left it genuinely inconclusive or dormant. Two real bugs, both
found and fixed same session: (1) `sgs/container` — the shop archive's own Product Collection
toolbar wrapper — tripped WooCommerce's client-nav kill-switch, same shape D702 already fixed
for `sgs/text` (`c01ed84a`); (2) `fx-flip.js`'s `settle()` called `MatchMedia#add(fn)` with a
bare function where the API requires `(conditions, func)`, so `Flip.from()` was registered but
never invoked — every upstream check looked healthy while GSAP never ticked (`da580d8e`). Live
on sandybrown, `animate_product_filtering` ON, Bean watched it animate. Full writeup:
`decisions.md` D741. Spec 38 §3.3 FR-38-12 updated to SHIPPED. Design-gate plan archived.
