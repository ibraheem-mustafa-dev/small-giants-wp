# Visual diff — sgs/product-search — 2026-06-12

verdict: PASS
first_paint_capture_passed: true

block: sgs/product-search
change: NEW block + hardened REST endpoint (Spec 30 P2 FR-30-5, the security tentpole). An accessible
  combobox product-search box that fetches live suggestions (title + thumbnail + permalink ONLY) from a
  new public endpoint `GET /sgs/v1/product-search`, with a no-JS `<form>` fallback to the theme's
  product-scoped search results. Council-hardened (6-persona adversarial-council, design doc
  reports/FR-30-5-search-design.md): zero data leakage is the primary invariant — this codebase shipped a
  draft-product leak before.
canary: sandybrown-nightingale-600381.hostingersite.com — REST live-probed directly + the block live-tested
  on a throwaway test page (created + force-deleted). Leak controls (draft/private/password/catalog-only/
  XSS-title) + a positive control seeded as real products, probed, then force-deleted.
verified_by: live curl (REST guards) + live Playwright (combobox UI + keyboard + axe) on the deployed canary (R-22-11)
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off at phase close)

## What changed (plain English)
A search box for the shop. As a visitor types (2+ letters), it shows matching products (name + photo +
link) in a dropdown; click or press Enter to go to the product. It is built to never reveal a hidden or
draft product, can't be hammered to overload the server, and works (as a plain search form) even with
JavaScript switched off.

## Server security — QA Gate C (live curl on the canary)

| Check | Result | Verdict |
|---|---|---|
| Draft product never in results (seeded draft + positive control) | only positive control returned; draft absent | PASS |
| Private / password-protected / catalog-only (exclude-from-search) absent | all 4 absent | PASS |
| Positive control present (empty ≠ pass) | present | PASS |
| XSS title `<img src=x onerror=alert(1)>` stripped server-side | response title = plain "ZZLEAKTST" | PASS |
| Response schema = {id,title,permalink,thumbnail} ONLY | no price/meta/variation/stock | PASS |
| `q` < 2 chars → 400 · `q` > 64 chars → 400 · `q[]=` array → 400 | all 400 | PASS |
| `Cache-Control: no-store, no-cache, must-revalidate` on every response | present (200 + 429) | PASS |
| Rate limit → 429 past the per-IP limit | 429 after the limit (15× in a 40-req hammer) | PASS |
| `Retry-After` header on 429/503 | `Retry-After: 11` | PASS |
| Server time `X-SGS-Search-Ms` < 150ms | 1ms | PASS |
| No-JS `/?s=…&post_type=product` product-scoped + visibility-safe | returns the visible product, not the draft | PASS |
| Fail-closed visibility + result-level re-gate (defence in depth) | verified in code (2-layer) | PASS |

## UI / accessibility (live Playwright)

| Check | Result | Verdict |
|---|---|---|
| First paint — combobox renders with no-JS form + hidden listbox | present | PASS |
| Type query → suggestions populate; `aria-expanded=true`; status "2 products found" | works | PASS |
| Title rendered via textContent — XSS inert (no injected `img[onerror]` in DOM) | inert | PASS |
| Keyboard — ArrowDown/Up move `aria-activedescendant` + `.is-active` | works | PASS |
| Escape closes listbox + restores focus to input | works | PASS |
| Option has NO focusable descendant (nested-interactive fixed; li `data-href` nav) | resolved | PASS |
| **axe on the block — WCAG 2.0/2.1/2.2 A+AA** | **0 violations** | PASS |
| Mobile 375px — input 49px, 18px font (no iOS zoom), submit 44×49px, no h-scroll | within target | PASS |

(Note: axe also flagged 2 colour-contrast nodes on the THROWAWAY TEST PAGE's own headings — pink-on-cream
from the theme/client style variation, NOT this block. Logged as a separate theme observation; not an
FR-30-5 defect.)

## Hardening provenance
Built to `reports/FR-30-5-search-design.md` (Step 7a council-hardened contract). Real-client-IP via hcdn
`X-Real-IP` (no Cloudflare; REMOTE_ADDR is the shared edge) + IPv6 /64 bucketing + a global circuit breaker
as the real backstop. Single WP_Query (no custom posts_where), fail-closed visibility, result-level re-gate
with a near-miss canary log. Behavioural leak-check script (`scripts/product-search-leak-check.php`) + a
static pre-flight guard (`scripts/check-product-search-guards.js`) wired into `npm prebuild`.

**Result: PASS. first_paint_capture_passed: true.** Zero data leakage proven with a positive control,
XSS inert, all rate/length/cache guards live-verified, axe-0 on the block, full keyboard combobox.
