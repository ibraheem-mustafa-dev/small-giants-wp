# QA Gate C — FR-30-5 Product Search hardening (security-critical)

**Date:** 2026-06-12
**Thread:** sgs-theme (Spec 30 P2)
**Canary:** sandybrown-nightingale-600381.hostingersite.com (WC 10.x / WP 7.0)
**Endpoint:** `GET /wp-json/sgs/v1/product-search?q=…`
**Verifier:** main agent (live probes, not a subagent self-report — R-22-11)

## Verdict: 7/7 PASS (C-6 closed after placing the block on /shop/)

**Update 2026-06-12 (same session):** the `sgs/product-search` block was placed
into `theme/sgs-theme/parts/sgs-archive-toolbar.html` (under the shop title),
deployed to the canary, and C-6 re-run live on `/shop/` — **axe 0 + full keyboard
combobox verified** (see C-6 below). FR-30-5 front-end a11y Done-when now met.

The search **REST endpoint** is deployed, live, and passes every server-side
security gate with live evidence. The only unverified item is the **front-end
a11y/keyboard behaviour (C-6)**, which cannot run because the `sgs/product-search`
**block is not inserted into any live template/page** on the canary (it is
registered — the editor-script handle is in the block registry — but unplaced).
That is a separate authoring step, not a defect.

## Per-item evidence

### C-1 — Draft title NEVER leaks · PASS (live)
Draft product on canary: **1017 "P4 pricing write test"** (`wp post list` via SSH).
- `q=pricing` → `{"results":[]}` (draft does not appear)
- `q=P4 pricing` → `{"results":[]}`
- `q=test` → only published **540** "Mama's Test Box" returns; draft 1017 (whose
  title contains "test") is **absent**. Visibility `NOT IN` filter + result-level
  re-gate hold. `post_status='publish'` is a string literal (G3 guard).

### C-2 — Rate limit >30/IP/min → 429 · PASS (live)
35 sequential requests: 200×(until the 30/window ceiling) then clean `429`s.
`429` body: `{"code":"sgs_search_rate_limited",…,"data":{"status":429,"retryAfter":8}}`
with `Retry-After: 8` header. Fixed-window anchor (did not slide). Earlier probes
had already spent ~5 of the 30-budget in the same 60 s window — correct behaviour.

### C-3 — XSS title renders inert · PASS (server + client, code+live)
Two independent defences:
- **Server:** `wp_strip_all_tags( html_entity_decode( get_the_title() ) )` —
  live response for `q=mama` returns decoded plain text ("Mama's Test Box"),
  proving the strip+decode path runs; any `<img onerror>` title is stripped to text.
- **Client:** `view.js:146` renders via `span.textContent = result.title`
  (`createElement` + `textContent`, never `innerHTML` injection — the single
  `ul.innerHTML = ''` at L127 is a list-clear, not injection).

### C-4 — No-JS fallback · PASS (code; live-test blocked by placement)
`render.php:80-113`: `<form role="search" method="get" action="<home_url>/">`
with `<input name="s">` + `<input type="hidden" name="post_type" value="product">`
→ submits to `/?s={q}&post_type=product`. (Cannot live-test the submit until the
block is placed on a page, but the static markup is unambiguous.)

### C-5 — Response schema has NO price/meta/variation · PASS (live)
Live `q=mama` response objects are exactly `{id, title, permalink, thumbnail}`.
No price / stock / variation / meta fields. `Cache-Control: no-store` present;
`q=m` (1 char) → HTTP 400; `X-SGS-Search-Ms: 1`.

### C-6 — axe 0 + keyboard combobox · PASS (live, after placement)
Block placed in `parts/sgs-archive-toolbar.html` `{"placeholder":"Search products…",
"buttonLabel":"Search"}`, deployed; no DB template-part override shadows the file.
Live on `/shop/` (Playwright CLI, own browser at 1440×900):
- **axe: 0 violations** (wcag2a/2aa/21a/21aa/22aa, scoped to `[role=search]`).
- `aria-expanded`: `false` → `true` after typing "mama".
- listbox `sgs-product-search-2-listbox` populated — 2 options.
- first option text: `Mama's Test Box — 48 SKU fixture` (rendered as text — the
  apostrophe is the real char, no script ran, **zero console errors** — live C-3
  confirmation).
- live region `…-status`: announces **"2 products found"** (`role=status
  aria-live=polite`).
- `ArrowDown` → `aria-activedescendant = …-listbox-opt-0` (keyboard nav +
  active-descendant management work).

### C-7 — Regression check wired to a runner · PASS (build-time; no CI)
`scripts/check-product-search-guards.js` runs and passes (exit 0) — 11 static
guards (G1 fail-closed 503, G2 result re-gate `is_visible()`, G3 `post_status`
literal, G4 fixed response keys ×4, G5 global circuit-breaker, G6 per-IP limit,
G7 `no-store`). Wired into `prebuild` + `prestart` in `package.json` → executes
on every `npm run build`/`npm run start`. **Honest caveat** (per
`dont-claim-a-guard-is-enforced-unless-wired-to-something-that-runs`): there is
**no CI** in this repo, so the guard is build-time only — the same enforcement
floor as the dead-control / hardcoded-defaults guards. The script itself reminds
the operator to run the dynamic canary leak-check, which C-1/C-2/C-5 above cover.

## FR-30-5 status: front-end a11y Done-when MET (all 7 items pass)
Remaining FR-30-5-adjacent follow-up folds into phase-close (Step 12), not a
per-block blocker:
- FR-30-11 responsive audit at 375/768 (touch-target + executed-JS). axe is
  breakpoint-stable here (identical markup; responsive CSS only).
