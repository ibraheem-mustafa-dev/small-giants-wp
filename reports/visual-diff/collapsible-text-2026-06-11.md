# Visual diff — sgs/collapsible-text — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

block: sgs/collapsible-text
change: NEW block (Spec 30 P2 FR-30-3) — operator-editable shop/category SEO body copy with an
  accessible Read more / Read less toggle. Full text always server-rendered into the page (SSR) so it
  stays available to crawlers + assistive technology in every state; collapsed state clips via CSS
  line-clamp (`overflow:hidden` + `--sgs-collapsible-text-collapsed-lines`), NOT display:none, NOT
  JS-injected. No-JS shows the full text.
canary: standalone test page (created + verified + force-deleted via REST — framework template's
  collapsible-text slots ship EMPTY for operators to fill, no client copy hardcoded in the framework)
verified_by: live Playwright on the deployed canary (R-22-11)
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off)

## What changed (plain English)
A new content block for the bottom of shop/category pages: the operator types SEO body copy; it shows
a few lines with a "Read more" button that expands to the full text and flips to "Read less". The full
copy is always in the page source (good for SEO + screen readers); only the visual height is clipped
when collapsed.

## Live verification (standalone test page, seeded 598-char 2-paragraph copy)

| Check | Result | Verdict |
|---|---|---|
| First paint — block renders with copy | `.sgs-collapsible-text` present, body 598 chars | PASS |
| Full text in source when collapsed (SSR / crawler / AT) | 2nd paragraph present in page HTML while clamped | PASS |
| Collapsed clamp (collapsedLines=4) | rendered 140px vs scrollHeight 495px, `overflow:hidden`, isClamped=true | PASS |
| Toggle present + 44px target | "Read more", `aria-expanded=false`, `aria-controls` wired, h=44px | PASS |
| Expand on click | height 140→569px = scrollHeight (fully shown) | PASS |
| Label + state flip | text → "Read less", `aria-expanded` → true | PASS |
| Empty state (no copy) | renders nothing (no empty wrapper) — verified on the shop template | PASS |
| Console errors | 0 | PASS |

**Result: PASS. first_paint_capture_passed: true.** The block's read-more is keyboard/AT accessible,
SSR-complete, line-clamp-collapsed (not display:none), and the empty state renders nothing — so the
framework template ships the slots empty without leaving stray markup.
