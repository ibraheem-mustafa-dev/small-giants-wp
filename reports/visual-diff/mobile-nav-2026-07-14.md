---
report: sgs/mobile-nav drawerGradient CSS-injection fix (council must-fix #1)
date: 2026-07-14
session: D332 (§S9 adversarial-council must-fixes)
target: https://sandybrown-nightingale-600381.hostingersite.com/
blocks_changed: [sgs/mobile-nav]
verdict: PASS
first_paint_capture_passed: true
---

# sgs/mobile-nav — drawerGradient injection fix

The adversarial-council abuse red-teamer found (and I confirmed on the live code)
that `drawerGradient` was emitted after only a PREFIX check
(`/^(linear|radial|conic)-gradient\(/`), so a value like
`linear-gradient(red,red);position:fixed;inset:0;…url(https://evil/x)` passed and
injected arbitrary declarations into the block's inline CSS — an Author-level
user could plant a full-viewport phishing overlay or a network beacon.

**Fix:** a new shared `sgs_css_gradient_value()` (`includes/helpers-tokens.php`)
validates the WHOLE value (one fully-bounded gradient function, safe char set)
and rejects any `;`, `{`, `}`, `url(`, `<`, `>`, `@`, or `expression`. mobile-nav
routes `drawerGradient` through it. Swept the whole plugin — mobile-nav was the
only prefix-only gate; all other gradient uses go through whitelists /
`sanitize_html_class` / `sgs_colour_value` (safe).

## Verification (live server probe, sandybrown, plugin 0.1.8)

| Check | Evidence | Verdict |
|---|---|---|
| Malicious gradient rejected | `render_block` with `drawerGradient` = `linear-gradient(red,red);position:fixed;…url(https://evil/x)` → `--sgs-mn-gradient` NOT emitted, no `position:fixed`/`evil/x` in output | PASS |
| Legitimate gradient still works | `drawerGradient` = `linear-gradient(#fff, #000)` → `--sgs-mn-gradient` emitted | PASS |
| Unit proof | `sgs_css_gradient_value('linear-gradient(red,red);position:fixed')` → `''`; `('linear-gradient(#fff,#000)')` → passes | PASS |
| No regression | header/footer render, 6 nav links, 0 console errors, no overflow | PASS |

first_paint_capture_passed: true — no visual change (the drawer's legitimate
gradient still renders); the fix only rejects malicious values.
