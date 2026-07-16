# product-card — live verification (2026-07-15)

verdict: PASS
first_paint_capture_passed: true

**Change (D338, block.json only):** `ctaFontSize` `default: 15` → `null`. Bean's direction:
"should just be the same default as the sgs/button default" — the card's CTA must inherit
whatever a standalone `sgs/button` renders, not carry its own literal.

**Live (sandybrown 1440, computed on painted elements):** product-card CTA font-size
**15px** = standalone `sgs/button` font-size **15px** — IDENTICAL, which is the pass
condition (equality with the button, not any particular px). The 15px both share comes from
the button pipeline/theme, not from the card's removed default; a future theme/button change
now moves both together instead of stranding the card at a stale literal.

**First-paint:** no change to any animated surface (attribute default only; render.php
untouched by this change). M1 static checks clean.
