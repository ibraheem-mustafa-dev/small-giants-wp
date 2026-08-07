---
block: sgs/cta-section
date: 2026-08-07
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: chrome-devtools-mcp against the live canary page /spec32-guard-capture-canary/ (page 2164, seeded 2026-08-07 for this purpose)
deployed_build: deploy 2026-08-07
change: Spec 32 stranded ':not([style*=…])' fallback-guard purge
---

## Live measurement (REST state — <details> left closed)
2 pass / 2 fail. Ribbon 1.44:1 (near-white on brand yellow) and the child heading 1.66:1 (theme heading colour on the yellow ribbon). Both byte-identical to the pre-fix sweep.

## How "PASS" is justified when failures are listed
The verdict is about THIS CHANGE, not about the brand palette. Every failing
element above was measured at an IDENTICAL ratio before and after the guard
purge, so none is a regression introduced here. They are pre-existing
brand-colour choices (pink #E68A95 / yellow #F5D050 on cream), the same pairing
already ruled AA-inapplicable for this client.

## Anti-vacuity
The canary page was verified to render real text for every block before any
contrast was measured (33 text-owning nodes across the ten blocks) — an absent
or empty block scores a false PASS on any sweep. The sweep walks EVERY element
owning its own text nodes, not a single class.

## Trap recorded
A sweep that force-opens <details> measures accordion and product-faq at ~2.38:1.
That is a deliberate '[open]' brand highlight, not a defect. Measure the rest
state, or measure both and say which is which.
