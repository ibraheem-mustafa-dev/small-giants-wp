---
doc_type: phase-plan
project: small-giants-wp
phase: "Spec 30 P2 — Differentiators + Shop + Schema (remaining Spec 30 build, consolidated)"
spec_ref: specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md
created: 2026-06-11
status: active
thread: sgs-theme
---

# Phase 2 — Spec 30 remaining build: differentiators, shop, schema (consolidated)

> **PROGRESS (2026-06-12, D214):** Gate A ✅ (Steps 2–4, `93ce8706`, merged). Gate B archive ✅ (Step 5, `7b953761`+`8fb94df1`, merged D213). **SHOP LAYER NOW COMPLETE + LIVE-VERIFIED (D214):** Step 6 FR-30-6 filter (`d0ccf782`) — Gate B filter half live-verified (16/15 boundary, draft-exclusion, narrow+ARIA; canary restored). Step 7a design gate (`e8cbe0a5`) + Step 7b FR-30-5 search (`a9c81af2`) — **placed** in `sgs-archive-toolbar.html` (`30b6ed71`) + **QA Gate C 7/7 live** (draft-leak, 429, XSS-inert, schema, no-JS, axe-0 combobox, guards). Step 8 ✅ `/sgs-update` clean, both blocks registered. Evidence: `plugins/sgs-blocks/reports/spec30-p2/QA-Gate-{B-FR-30-6,C-FR-30-5}-*.md`. ~~RESUME at Step 9~~ **STEP 9 ✅ DONE + LIVE-VERIFIED (D215, 2026-06-12).** FR-30-9 schema SHIPPED on `feat/spec30-p2-shop-schema` (path-scoped, NOT merged — Step 12 merges): NEW `class-org-website-schema.php` (Organization+WebSite, front-page-only, `@id`s, 7-plugin SEC-9 defer, NO SearchAction) + `class-noindex-store-pages.php` (cart/checkout/account/wc-endpoint noindex, money pages safe) + `class-sgs-schema.php` (shared HEX encoder) + `returnPolicyCountry` (regex-guarded, live `GB` verified) + accordion FAQPage HARDENED (HEX+strip+false-guard, honest AI/Bing copy) + VAT-honest llms label ×3. **FAQPage REVERSED:** the plan's "delete it" was overturned by research — Google dropped the rich result but FAQPage still serves AI/Bing; `product-faq` KEPT. 5-persona adversarial-council (NO-GO→locked §F) + cross-family review + live canary verify (draft-leak closed, 0 SearchAction, noindex both-directions, returnPolicyCountry seed→verify→restore). Deferred→parking: F10 hex-flag CI guard, F5 org settings UI, F8 zero-rated VAT precision. Docs: `.claude/reports/spec30-p2/FR-30-9-{schema-design-gate,LOCKED-CONTRACT}.md`. ~~RESUME at Step 10~~ **STEP 10 ✅ DONE (2026-06-12, D216+D217), committed `a04df8a7` on `feat/spec30-p2-step10`.** 10a gallery-variation-swap DEFERRED (D216: keep static-per-variation — no fixture, version-fragile, WC core already swaps featured image). 10b notify-me capture BUILT + live-verified (D217): reusable `SGS\Blocks\Turnstile` (graceful skip unconfigured) + `Stock_Notify` `POST /sgs/v1/notify/subscribe` (nonce→consent→email→IDOR→rate-limit 5/IP/hr→Turnstile→store, {email,ts} only, dedup+cap, IP never stored) + buybox OOS-only form (`data-wp-bind--hidden=context.inStock`, un-ticked required consent + privacy link, self-contained `notify-view.js`). Bean directive: proportionate consent + Turnstile, not PII-red-team theatre. Live-verified via curl+guest nonce (full chain, dedup, RL boundary, Turnstile fail/empty/pass, PDP DOM render); canary restored clean. `notifyMeLabel` now live (dead-control baseline emptied). QC = inline + cross-family haiku rater (all PASS). Both parking entries → `memory/parking-archive.md`. **Operator go-live: paste real Cloudflare Turnstile keys (FR-30-13 item).** **STEP 10a REOPENED + SHIPPED (D218, 2026-06-12, commit `859d0214`):** Bean reversed the D216 defer ("use random photos on the test product"; "all 48 individually") — gallery-variation-swap BUILT via Option A (reuse the FR-27-A4 store engine; design-gate-approved). 2-col PDP product area (store-driven gallery + configurator); per-variation galleries delivered via a HEX-flagged JSON data-island OUTSIDE the 24KB context cap (so ALL variations work, set individually) + additive `product-card/view.js` island fallback (product-card-safe). Cloudflare Turnstile keys CREATED via API + LIVE on the canary (real widget, enforcing). Live-verified all 48 swap (main image + thumb strip + thumb-click + aria-current + 44px + product-name alt fallback); cross-family rater 0 defects; 2 visual-diff reports. buybox 1.2.1 / product-card 1.16.8 / theme 1.5.4. **~~RESUME at Step 11~~ STEP 11 ✅ DONE (2026-06-12):** FR-30-13 go-live checklist shipped at `.claude/go-live-checklist.md` (31 items / 6 sections, each a concrete probe; folds in zero-rated-VAT, org-data-completeness, Turnstile-keys, privacy-policy, gallery-alt; SE-6 = FAQPage PRESENT per D215; FR-30-11 audit script `scripts/wc-pages-responsive-audit.js` confirmed). **RESUME at Step 12** (phase close: `/qc-council` full P2 diff + `/sgs-update` + Bean R-22-13 3-breakpoint sign-off on every new surface incl. the 2-col PDP gallery + OOS notify form + merge `feat/spec30-p2-step10` → main via temp-worktree cherry-pick). Note: Step 5's collapsible SEO slots ship EMPTY by design.

**USP:** P1 gave a working PDP + cart loop; this phase ships the things that actually convert and rank — the live value-ladder price coupling (the food-DTC moat core can't do), real reviews, a usable shop with search/filter, and complete structured data. Closing it makes SGS a *sellable* shop framework, not just a buyable one.

**Plan label:** [PLAN: opus] — spans architectural design gates (FR-30-5 search, FR-30-9 schema adversarial pass) + implementation-heavy sonnet steps; the orchestrator stays Opus and dispatches sonnet builders.

## ⚙️ ORCHESTRATION MODEL (binding — Bean directive 2026-06-11)

**The Opus main agent ORCHESTRATES; subagents IMPLEMENT. The main thread must NOT hand-write block/PHP/JS implementation inline.** This is the efficiency lever — keep Opus context free for the judgement work, push all mechanical building to sonnet/haiku subagents.

**Main agent (Opus) does ONLY these five things:**
1. **Plan** — read the spec FR + ground truth, decide the build contract, sequence the steps, resolve KJCs.
2. **Delegate** — write the cold dispatch prompt (`/subagent-prompt`), pick the model (`/delegate`), spawn the implementer (`/subagent-driven-development` = implementer + 2 reviewers; or `/dispatching-parallel-agents` for disjoint steps). Subagents have NO commit/deploy authority — they return uncommitted diffs.
3. **QC** — run `/qc-council` (cross-family) + `/adversarial-council` on the returned diff BEFORE accepting it; fact-check every subagent claim against live ground truth (rater findings are HYPOTHESES — `acceptance-is-the-ledger-not-the-mechanism`).
4. **Test** — deploy (build + scp whole block set + opcache + ?ver check) and live-verify on the canary HIMSELF (Playwright/chrome-devtools DOM + computed style + axe). NEVER close a step on a subagent's self-report or on assertion output — open the real page. This is the one hands-on thing the main agent does.
5. **Commit** — path-scoped commit + `/sgs-update` + decisions/state doc updates, after QC + live-test pass.

**What the main agent must NOT do:** hand-write a block.json / render.php / view.js / CSS implementation inline; "just quickly fix" a subagent's returned file by retyping it (send it back via SendMessage with the correction instead); close a step on green automated gates alone (Bean's R-22-13 eye + the main agent's own live test are co-authoritative — `ship-gate-needs-human-eye-not-just-automated-gates`).

**Per-step role tags (used below):** every implementation step carries `Model: sonnet (subagent)` and `Orchestrator role:` naming what the main agent does for that step (design-the-contract / delegate / QC / live-test / commit). Steps tagged `inline` are the ONLY ones the main agent executes itself: design gates, QC gates, KJC resolution, live testing, commits, doc updates.

**Docscore:** pending (in-flight; archived-plan template applies at close).

**Aggregate cost estimate:** ~10–14 sonnet dispatches + inline Opus orchestration + 3 design gates; low-tens-of-£. Wall time: multi-session — realistically 3–4 sessions (P2 differentiators ≈ 1, shop FR-30-3/6 ≈ 1, FR-30-5 search ≈ 1 with its own design gate, schema+go-live ≈ 0.5). Estimates default LOW per `time-estimates.md`; recalibrate down if steps finish 3× faster.

**Phase success criteria (done when):**
- [ ] FR-30-8: PDP shows headline + per-unit price from real product data, both consistent with WC tax-display setting; live value-ladder updates per selected tier; no reference price set → zero strikethrough/badge (grep confirms no client-side %-off arithmetic); denomination string operator-editable.
- [ ] FR-30-10: canary PDP renders only synced/verified reviews; empty/disabled source → graceful state (toggle: hidden vs "coming soon"), no layout gap; zero hardcoded review text; schema review/aggregateRating emits ONLY when live data exists.
- [ ] FR-30-3: at 375px archive paints filters-closed + sticky Filter button → drawer; Active-Filters chips render/remove/persist across paginate-away-and-back; curl of archive HTML contains FULL bottom SEO text pre-expand; top/bottom text + collapsed-line-count N editable with zero code; axe 0.
- [ ] FR-30-6: a 16-term attribute renders the type-to-find input, a 15-term one renders none (boundary tested); typing narrows + announces count; a draft-only term is absent (live-probed); narrowed option filters identically to core.
- [ ] FR-30-5: ≥2-char query surfaces matching products prefix-first on canary; draft title NEVER appears (live-probed); rate-limit returns 429; no-JS Enter lands on product-scoped results URL; `<img onerror>` title renders inertly; axe 0; registered via `/sgs-update`.
- [ ] FR-30-9: local JSON-LD validator zero errors against the per-page-type shapes; draft/scheduled product fetched as guest emits ZERO JSON-LD; cart/checkout/account each `noindex`; grep zero `SearchAction` + zero rich-result `FAQPage`; `returnPolicyCountry` present in PDP + Organization.
- [ ] FR-30-13: versioned go-live checklist doc exists, each item has a named probe/manual step, first client launch records a completed pass.
- [ ] Parked P1 follow-ups resolved or consciously re-deferred (gallery-variation-swap decision recorded; notify-me capture built-guarded OR re-deferred with reason).
- [ ] FR-30-11 phase-close: committed responsive-audit script run green at 375/768/1440 + executed-JS figures + Bean R-22-13 sign-off on every new visible surface.

**Entry context (read before starting):**
- `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` — FR-30-3/5/6/8/9/10/13 full contracts + Reuse Inventory + Hard constraints
- `.claude/plans/archive/2026-06-11-spec30-p1-wc-chassis-COMPLETE.md` — what P1 shipped (buybox, tabs, shop cards, templates)
- `plugins/sgs-blocks/src/blocks/buybox/` + `product-card/{render.php,view.js}` — the configurator the price-coupling hangs off
- `plugins/sgs-blocks/includes/class-cart-proxy.php` — the ONLY cart write path
- `plugins/sgs-blocks/includes/` Spec 28 pricing (`sgs_value_ladder()`, `sgs_saving_display()`, `Pack_Pricing_Resolver`) + `review-schema.php` + `class-product-*.php` schema emitters
- `plugins/sgs-blocks/includes/trustpilot/` — shipped Trustpilot sync (FR-30-10 source)
- `.claude/decisions.md` D204 (schema gating + draft-leak fix), D208/D210 (WC page-type)
- `.claude/parking.md` P-WC-GALLERY-VARIATION-SWAP + P-WC-NOTIFY-ME-CAPTURE

**References:**
- Spec 30 §Reuse Inventory — wire/audit, never rebuild (cart proxy, SEC-1 manifest, pricing engine, schema emitters)
- Lessons binding here: `guard-on-one-path-is-not-a-guard`, `dont-claim-a-guard-is-enforced-unless-wired-to-something-that-runs`, `manifest-growth-can-trip-capped-client-seed`, `deploy-asset-php-with-viewscriptmodule`, `bump-block-version-with-any-style-css-change`, `wp-interactivity-data-wp-on-rejects-colon-event-names`, `public-text-xml-endpoint-gotchas`, `ship-gate-needs-human-eye-not-just-automated-gates`, `js-budget-measures-executed-not-prefetched`
- DMCC Act (in force 2026-04-06): fake/undisclosed-incentivised reviews illegal; displaying trader liable — FR-30-10 hard constraint
- Google removed FAQPage rich result 2026-05-07 → FR-30-9 drops it

## Pre-conditions
- Spec 30 P1 COMPLETE + on `origin/main` (`1c13a08c`); FR-30-12 ungated
- Canary reachable; WC 10.8.1; fixture product 540 (published 48-SKU variable). **Reference-price meta correction (qc-council 2026-06-11):** there is NO `_sgs_reference_price_pence` — the shipped single-unit reference is `_sgs_base_price_pence` gated by the boolean attestation flag `_sgs_base_price_attested` (both in `class-configurator-meta.php`); the strict `'1'===(string)$v` guard applies to the ATTESTATION flag. Reference implementation: `product-card/render.php:548-554`.
- Branch `feat/spec30-p2-shop-schema` from origin/main before first edit
- Co-active cloning thread NOT holding the plugin/theme files this phase touches (search block, schema emitters, archive templates)

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /subagent-driven-development | steps 2, 5, 7, 8, 9 |
| skill | /brainstorming | FR-30-5 design gate (step 7a), FR-30-3 (step 5a) |
| skill | /qc-council | QA gates before every WC-write / SGS-block / search-endpoint commit |
| skill | /adversarial-council | FR-30-5 server-hardening pre-build + FR-30-9 schema pre-build |
| skill | /sgs-update | after any block add/change (FR-30-5/6/8 register) |
| mcp | chrome-devtools / Playwright | live verify + 3-breakpoint + axe |
| cli | SSH + token-gated webroot one-shot | guard-blocked WC ops, fixture seeding |
| cli | npm run build (PowerShell) + tar/scp + opcache reset | every deploy |
| external | Google Rich Results Test | FR-30-9 post-deploy verification (not the primary gate) |

---

Step 1 — Branch + P2 ground-truth probe
  Model:       inline
  Action:      Create `feat/spec30-p2-shop-schema` from origin/main. Probe the canary: does product 540 have `_sgs_reference_price_pence` / `_sgs_base_price_pence` set (FR-30-8 strikethrough precondition)? Is `woocommerce_attribute_lookup_enabled` on (affects FR-30-6 term population)? Which Trustpilot sync state is live (FR-30-10 source)? Enumerate the shipped schema emitters (`grep -l JsonLD\|schema includes/`) + confirm the D204 draft-leak guard is in place. Record findings in a `## Ground truth` block appended to this plan.
  Files:       (probe only; branch create)
  Inputs:      Spec 30 FR-30-8/9/10 preconditions
  Outcome:     Branch exists; a recorded ground-truth block names the live state of every precondition each FR rests on (verify-feature-flag-before-asserting-defect).
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        10 min
  Tooling:     SSH/wp-cli, grep, git
  On-Fail:     n/a (read-only probe)
  Cold-Entry:  Spec 30 §Reuse Inventory + §Hard constraints; this plan's Entry context
  Test:
    Happy:       branch created; ground-truth block lists reference-price/lookup-flag/trustpilot/emitter state
    Edge:        product 540 has NO reference price → FR-30-8 strikethrough path is correctly a no-op (not a bug)
    Fail:        a precondition unverifiable → flag in the block, do NOT assume; FR depending on it stalls until seeded
    Integration: feeds every downstream FR's "is the feature even enabled" check

## ── P2 DIFFERENTIATORS (the moat) ──

Step 2 — FR-30-8: PDP price-display coupling (per-unit + value-ladder, live per tier)
  Model:       sonnet (build) + inline (design of the home/coupling)
  Orchestrator role: delegate the build contract → sonnet implementer; main agent QCs the diff + live-tests the per-unit/value-ladder coupling on 540 + commits.
  Action:      Wire the per-unit + value-ladder display as a SIBLING output of the buybox/configurator (pre-decided v1.1 — NOT a product-card attr; preserves D204 price-never-overridable). Server-side computation only (render.php/REST, never client arithmetic). Reference = operator `_sgs_base_price_pence` gated by `_sgs_base_price_attested` with the strict `'1'===(string)$v` guard on the attestation flag (qc-council correction — NOT `_sgs_reference_price_pence`, which does not exist); never derived from regular_price, never auto-computed; no attested reference → no strikethrough/badge anywhere (reference impl `product-card/render.php:548-554`). Displayed prices follow WC tax-display setting (headline + per-unit agree). Per-unit denomination = inspector control. **JS HOME (qc-council HIGH correction):** the buybox has NO own view.js — it mounts the `sgs/product-card` store. SSR value-ladder rows are seeded in `buybox/render.php`; the live tier-swap update goes in `product-card/view.js` (the running store, in `applyPillSelection`), NOT a new buybox/view.js. Reuse `sgs_value_ladder()` / `sgs_saving_display()` from `includes/helpers-value-ladder.php` server-side.
  Files:       plugins/sgs-blocks/src/blocks/buybox/{render.php,block.json,style.css} (SSR ladder rows + denomination control); plugins/sgs-blocks/src/blocks/product-card/view.js (live tier-swap ladder update in the shared store — buybox has no view.js); reuse includes/helpers-value-ladder.php (do NOT fork)
  Inputs:      Step 1 ground truth (reference-price state); buybox shipped P1; Spec 28 pricing engine
  Outcome:     PDP shows headline + per-unit derived from real data both tax-consistent; tier selection updates the value-ladder live; no reference price → no badge (grep-confirmed no client %-off math).
  Exec:        SEQUENTIAL
  Deps:        step 1
  Marker:      SESSION-START
  Time:        45 min
  Tooling:     /subagent-driven-development; /qc-council (pre-commit); chrome-devtools live; grep gate (zero client-side %-off arithmetic)
  On-Fail:     view.js + asset.php redeploy of prior build; block version revert.
  Cold-Entry:  Spec 30 FR-30-8; buybox render.php/view.js; Spec 28 helpers; this plan
  Prompt:      [dispatch via /subagent-prompt at execution — embed FR-30-8 contract + the "sibling output not card attr" home + strict-guard pattern]
  Test:
    Happy:       select 24-pack → per-unit + value-ladder line update live, tax-consistent
    Edge:        product with NO reference price → zero strikethrough/badge renders (live + grep)
    Fail:        client-side %-off arithmetic introduced → grep gate fails the commit
    Integration: buybox context (selectedKey) + Spec 28 server pricing; WC tax-display setting

Step 3 — FR-30-10: DMCC-compliant reviews on the PDP
  Model:       sonnet
  Orchestrator role: delegate; main agent live-tests both the populated AND empty review states + grep-audits for hardcoded text + commits.
  Action:      Wire PDP reviews from the shipped Trustpilot sync (`sgs/trustpilot-reviews`) or a verified-buyer source into the FR-30-2 reviews slot. Static/baked review content BANNED (DMCC — displaying trader liable). Empty/failed/down source → graceful state: inspector toggle chooses hidden vs "Reviews coming soon" placeholder, never a broken gap; schema emits nothing when empty (FR-30-9 gate). Grep templates + converter emit for zero hardcoded review text.
  Files:       theme/sgs-theme/parts/sgs-pdp-content.html (reviews slot); plugins/sgs-blocks/src/blocks/trustpilot-reviews/* (shipped `dataSource` enum already has synced/placeholder — qc-council confirmed; wire the empty-state toggle to it); the aggregateRating empty-gate lives in `includes/class-product-schema.php:build_aggregate_rating()` (qc-council: NOT `review-schema.php`, which is the sgs/testimonial emitter)
  Inputs:      Step 1 (live Trustpilot state); shipped Trustpilot sync infra
  Outcome:     PDP renders only synced/verified reviews; empty source → toggle-controlled graceful state, no layout gap; zero hardcoded review text.
  Exec:        PARALLEL with step 2 (disjoint files — buybox vs reviews slot)
  Deps:        step 1
  Marker:      (none)
  Time:        30 min
  Tooling:     /subagent-driven-development; chrome-devtools (empty + populated states)
  On-Fail:     Revert the reviews-slot template edit + toggle attr; PDP renders without reviews section.
  Prompt:      [dispatch via /subagent-prompt — embed FR-30-10 + DMCC constraint + empty-state toggle]
  Test:
    Happy:       canary PDP shows synced reviews; populated state renders cleanly
    Edge:        sync disabled/empty → toggle switches hidden vs "coming soon", zero gap
    Fail:        hardcoded review text present anywhere → grep finds it, fix before commit
    Integration: Trustpilot sync option + FR-30-9 schema empty-gate

QA Gate A — P2 differentiators live + DMCC/honesty gates
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 2–3
  Check:   On canary 540: (1) per-unit + value-ladder update on tier select (chrome-devtools); (2) no-attested-reference fixture shows zero badge — grep gate targets `product-card/view.js` (qc-council: buybox has no view.js): confirm any NEW value-ladder %/saving is server-seeded from `sgs_value_ladder()`, not client-computed (the pre-existing `pctOff` fallback at product-card/view.js ~L481 is NOT a regression — leave it); (3) reviews empty-state toggle works both ways; (4) `grep -rn` templates+emit for hardcoded review strings = 0; (5) axe 0 on PDP. Evidence → .claude/reports/spec30-p2/.
  Pass:    All 5 green with captured evidence.
  Fail:    Per-item root-cause (/systematic-debugging); live DOM only, never assertion output.
  Marker:  QA

Step 4 — Commit checkpoint: P2 differentiators
  Model:       inline
  Action:      /qc-council (sonnet + haiku cross-family) on the FR-30-8 + FR-30-10 diff; path-scoped commit on feat/spec30-p2-shop-schema; /sgs-update if block attrs changed.
  Files:       (commit only)
  Inputs:      QA Gate A evidence
  Outcome:     P2 differentiators committed; clean SESSION-START boundary.
  Exec:        SEQUENTIAL
  Deps:        QA Gate A
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /qc-council; git (path-scoped); /sgs-update
  On-Fail:     Council BLOCK → fix before commit; never commit past a BLOCK.
  Test:
    Happy:       commit lands; git show --stat lists only named paths
    Edge:        never-stage artefacts (lucide-icons.php, .parity-golden.json) absent
    Fail:        council BLOCK → fix + re-gate
    Integration: shared main with co-active cloning thread (commit by explicit path)

## ── SHOP (FR-30-3 archive shell → FR-30-6 searchable filter → FR-30-5 search tentpole) ──

Step 5 — FR-30-3: shop archive UX shell (toggle filters + chips + SEO text)
  Model:       sonnet (build) + inline (375px drawer design review)
  Orchestrator role: design the drawer/SEO-collapse contract (inline /brainstorming) → delegate the build; main agent live-tests at 375/768/1440 + paginate-persist + commits.
  Action:      Compose Product Collection + Product Filters into the archive: (a) mobile = filters closed behind a sticky "Filter" button opening a full-screen/bottom-sheet drawer (never an open filter wall at 375px); desktop sidebar permitted. (b) Applied-filter chips = the core Active Filters block STYLED (not a custom component; JS enhancement only if core can't meet scrolling-row + removable — document in commit), reflecting URL query across pagination. (c) Filter group per card-displayed attribute. (d) Top SEO RichText attr (1–3 sentences) above grid, operator-editable. (e) Bottom SEO RichText with read-more: full text server-rendered, collapsed via `height:0;overflow:hidden;visibility:hidden`+`aria-hidden` (NOT display:none, NOT JS-injected), toggle `<button>` with aria-expanded/aria-controls, name flips Read more/less, ≥44px, collapsed-line-count N = inspector integer.
  Files:       theme/sgs-theme/templates/archive-product.html; theme/sgs-theme/parts/sgs-archive-toolbar.html; theme/sgs-theme/assets/css/woocommerce.css; a small SGS block OR theme-level RichText for the SEO text slots (decide at KJC-2)
  Inputs:      Spec 30 FR-30-3; P1 archive (content-collection cards already there)
  Outcome:     375px: filters-closed + sticky Filter → drawer; chips render/remove/persist across paginate; curl HTML has FULL bottom text pre-expand; top/bottom/N editable zero-code.
  Exec:        SEQUENTIAL
  Deps:        step 4
  Marker:      SESSION-START
  Time:        45 min
  Tooling:     /brainstorming (drawer pattern); /subagent-driven-development; chrome-devtools (375/768/1440)
  On-Fail:     Revert template/CSS edits; P1 archive (cards only) resumes.
  Cold-Entry:  Spec 30 FR-30-3; archive-product.html; this plan
  Prompt:      [dispatch via /subagent-prompt — embed FR-30-3(a)-(e) + the SSR-collapse spec verbatim]
  Test:
    Happy:       375px archive paints filters-closed + Filter button → drawer; chips removable
    Edge:        paginate away + back → applied filters + chips persist (URL query state)
    Fail:        bottom text JS-injected or display:none → fails curl-has-full-text + a11y; rebuild SSR-collapse
    Integration: core Product Collection + Product Filters + Active Filters (URL params)

Step 6 — FR-30-6: SGS searchable attribute filter (16+ threshold)
  Model:       sonnet
  Orchestrator role: delegate; main agent SEEDS the 16/15-term fixtures + live-probes the boundary + draft-term-absence + commits.
  Action:      A type-to-find input INSIDE a filter group, auto-enabled when an attribute has >15 options (16+, single Baymard threshold). Composes with core Product Filters (same query params — filtering stays core). Matches client-side; announces narrowed count via ARIA live; 0 matches → "No matching options". Term population MUST be visibility-scoped (terms counted against published/visible products only — a draft-only term must NOT appear; no unscoped `get_terms()`).
  Files:       plugins/sgs-blocks/src/blocks/* (new searchable-filter enhancement block OR a filter-group extension); render.php (visibility-scoped term query) + view.js (client narrowing)
  Inputs:      Step 5 archive shell; Step 1 (attribute-lookup flag state)
  Outcome:     16-term attr renders the input, 15-term renders none (boundary); typing narrows + announces; draft-only term absent (live-probed); narrowed option filters identically to core.
  Exec:        SEQUENTIAL (composes into the step-5 archive)
  Deps:        step 5
  Marker:      (none)
  Time:        35 min
  Tooling:     /subagent-driven-development; chrome-devtools; SSH (seed a 16-term + 15-term attribute fixture)
  On-Fail:     Remove the enhancement block from the archive; core filters resume unchanged.
  Prompt:      [dispatch via /subagent-prompt — embed FR-30-6 + visibility-scoped term rule]
  Test:
    Happy:       16-term attribute → input renders; typing narrows + count announced
    Edge:        exactly 15 terms → NO input (boundary); narrowing to 0 → "No matching options"
    Fail:        unscoped get_terms() leaks a draft-only term → live probe catches; switch to visibility-scoped query
    Integration: core Product Filters query params (filtering stays core)

QA Gate B — Shop archive + searchable filter
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 5–6
  Check:   At 375/768/1440 (chrome-devtools + axe): archive filters-closed-on-mobile + drawer; chips persist across paginate; curl archive HTML contains full bottom SEO text; searchable filter 16-vs-15 boundary live; draft-only term absent (live probe); FR-30-11 responsive-audit script run + executed-JS recorded. Evidence → .claude/reports/spec30-p2/.
  Pass:    Every FR-30-3 + FR-30-6 Done-when green with captured evidence.
  Fail:    Per-item /systematic-debugging; live DOM only.
  Marker:  QA

Step 7a — FR-30-5 DESIGN GATE: SGS product search block (the effort tentpole)
  Model:       inline (opus design gate) — /brainstorming + /adversarial-council
  Action:      Design-gate the search block BEFORE building (spec calls it the largest net-new build, own design gate). /brainstorming the combobox UX + no-JS fallback + relevance ordering; then /adversarial-council (red-team) the server hardening: rate limit (≤30 req/IP/min via transient/object-cache — client debounce is UX only), <2-char reject, sanitise (`sanitize_text_field`+`wc_clean`), constrain `post_status='publish'` AND `catalog_visibility IN ('visible','search')` (this codebase shipped exactly this leak before), fixed response schema (ID/title/permalink/thumbnail — NO price/meta/variation), `WP_REST_Response`, `textContent` not innerHTML (XSS via titles). Produce the build contract.
  Files:       (design doc → .claude/reports/spec30-p2/FR-30-5-search-design.md)
  Inputs:      Spec 30 FR-30-5 (full red-team must-fix list)
  Outcome:     A council-hardened build contract naming every server guard + the combobox a11y pattern + the regression-check wiring.
  Exec:        SEQUENTIAL
  Deps:        QA Gate B
  Marker:      SESSION-START
  Time:        30 min
  Tooling:     /brainstorming; /adversarial-council (security/abuse personas)
  On-Fail:     n/a (design doc)
  Cold-Entry:  Spec 30 FR-30-5; this plan; `guard-on-one-path-is-not-a-guard` + `dont-claim-a-guard-is-enforced-unless-wired-to-something-that-runs`
  Test:
    Happy:       design doc names all 8 red-team guards + combobox roles + regression wiring
    Edge:        the "wired to something that runs" requirement has a NAMED runner (not "code can check")
    Fail:        a guard listed without an enforcement path → council NO-GO until wired
    Integration: feeds step 7b build verbatim

Step 7b — FR-30-5 BUILD: product search block + hardened REST
  Model:       sonnet (build) per the 7a contract
  Orchestrator role: delegate the 7a contract verbatim → sonnet; main agent runs the security live-tests himself (curl-hammer 429, draft-leak probe, XSS inert) + commits.
  Action:      Build the search block: debounce 300ms client; suggestions = title+thumbnail+permalink only; no-JS `<form method=get>` → `?s={q}&post_type=product`; empty → visible "No products found" + ARIA live. REST handler per 7a contract (all server guards). Combobox a11y (`role=search`→`combobox`+`aria-autocomplete=list`+`aria-controls`→`listbox`/`option`, keyboard, 44px). Quality floor: prefix+in-title match, exact-prefix-before-substring ordering, <150ms server on a 500-product fixture. Maintenance gate: a SCRIPTED regression check wired to a real runner re-runs the search fixture on WC band bump.
  Files:       plugins/sgs-blocks/src/blocks/product-search/* (new); plugins/sgs-blocks/includes/class-product-search-rest.php (lazy-loaded behind class_exists('WooCommerce'))
  Inputs:      Step 7a build contract
  Outcome:     ≥2-char query surfaces prefix-first matches; draft title never appears; 429 past rate limit; no-JS Enter → product-scoped URL; XSS title inert; axe 0; registered via /sgs-update.
  Exec:        SEQUENTIAL
  Deps:        step 7a
  Marker:      (none)
  Time:        60 min
  Tooling:     /subagent-driven-development; /adversarial-council (re-verify guards on the built code); chrome-devtools; SSH (500-product fixture + curl-hammer rate-limit test)
  On-Fail:     view.js + asset.php redeploy of prior build; remove the REST route registration (single-line) to disable.
  Prompt:      [dispatch via /subagent-prompt — embed the 7a build contract verbatim]
  Test:
    Happy:       type "coo" → "Cookies…" prefix-first; <150ms server on 500 fixture
    Edge:        exactly 2 chars → results; 1 char → rejected; 500-product perf measured
    Fail:        draft title in suggestions OR 31st req/min not 429 OR `<img onerror>` fires → fix before commit
    Integration: WP_REST_Response + object cache rate-limit counter + /sgs-update registration

QA Gate C — FR-30-5 search hardening (security-critical)
  Model:   inline + /qc-council (security rater MANDATORY)
  Exec:    SEQUENTIAL
  Deps:    step 7b
  Check:   Live on canary: (1) draft product title NEVER in suggestions (seed a draft, live-probe); (2) curl-hammer >30 req/IP/min → 429; (3) query `<img src=x onerror=alert(1)>`-titled product → renders inertly (textContent, no alert); (4) no-JS Enter → `?s=&post_type=product` URL; (5) response schema has NO price/meta/variation fields (curl + jq); (6) axe 0 + keyboard combobox run; (7) the regression check is wired to a runner that actually executes (grep the wiring, not just the script). Evidence → .claude/reports/spec30-p2/.
  Pass:    All 7 green; /qc-council security rater MERGE-OK.
  Fail:    ANY guard fails → NO commit; the leak class shipped here before (merchant feed) — zero tolerance.
  Marker:  QA

Step 8 — Commit checkpoint: shop (FR-30-3/6/5)
  Model:       inline
  Action:      /qc-council (cross-family + security) on the shop diff; /sgs-update (search + searchable-filter blocks register); path-scoped commit(s) on feat/spec30-p2-shop-schema.
  Files:       (commit + /sgs-update)
  Inputs:      QA Gates B + C evidence
  Outcome:     Shop layer committed; search/filter blocks registered in sgs-framework.db.
  Exec:        SEQUENTIAL
  Deps:        QA Gate C
  Marker:      HANDOFF
  Time:        20 min
  Tooling:     /qc-council; /sgs-update; git
  On-Fail:     Council BLOCK → fix before commit.
  Test:
    Happy:       commit lands; sgs-db shows product-search in block_attributes + block_capabilities
    Edge:        never-stage artefacts absent from the commit
    Fail:        council BLOCK → fix + re-gate
    Integration: /sgs-update DB reconcile

## ── SCHEMA + GO-LIVE + PARKED FOLLOW-UPS ──

Step 9 — FR-30-9: schema — AUDIT shipped Product/Offer + BUILD the missing sitewide/noindex pieces
  Model:       sonnet (build) + inline opus (adversarial check)
  Orchestrator role: split-design the audit-vs-build scope → delegate; main agent runs the local JSON-LD validator + draft-leak guest probe + grep gates + commits.
  Action:      **qc-council RECLASSIFICATION: this is NOT "audit/align only" — three pieces are NET-NEW (verified absent).**
    (A) AUDIT/ALIGN the SHIPPED PDP emitter `class-product-schema.php` (ProductGroup): confirm Product + nested Offer (price/priceCurrency/availability/priceValidUntil-when-sale-end/url) + brand + sku/gtin/mpn + offers.shippingDetails + hasMerchantReturnPolicy + BreadcrumbList; variants via shipped ProductGroup gating; NO positiveNotes/negativeNotes. Confirm the Shop URL-only ItemList (D204 walker) — NO per-item Product.
    (B) ADD `returnPolicyCountry` to the return-policy object (NET-NEW — absent codebase-wide; source from `get_option('woocommerce_default_country')` unless an override is set in the `sgs_configurator_returns` settings) — both PDP + Organization output.
    (C) BUILD the sitewide Organization (logo/sameAs/contactPoint/address + org-level hasMerchantReturnPolicy + hasShippingService) + WebSite (NO SearchAction) emitters (NET-NEW — no Organization/WebSite emitter exists).
    (D) BUILD the cart/checkout/account noindex via a `wp_head` hook with `is_cart()||is_checkout()||is_account_page()||is_wc_endpoint_url()` (NET-NEW — `grep is_cart\|is_checkout` returns zero schema/noindex hits).
    (E) REMOVE rich-result FAQPage: delete the `sgs_emit_faq_page_jsonld()` add_action in `includes/product-faq-schema.php` AND remove its `require_once` from `product-faq/render.php` (qc-council: removing the schema file without updating the render require PHP-FATALS the block) — KJC-4 decides block-retire vs emitter-only. Grep zero SearchAction.
    GUARD HOME (qc-council MEDIUM): the D204 draft-leak guard is `is_publicly_listable()` in `class-product-item-list.php` (called via `configurator-head.php:sgs_get_bound_configurator_product_ids()`), NOT inside `class-product-schema.php::build_script()` — AUDIT that path is tight; do NOT add a redundant guard in build_script. aggregateRating/review ONLY if FR-30-10 has live data (omit, never stub) — the gate is `class-product-schema.php:build_aggregate_rating()`.
  Files:       plugins/sgs-blocks/includes/class-product-schema.php (audit + returnPolicyCountry); NEW includes/class-org-website-schema.php (Organization+WebSite); NEW theme or includes noindex `wp_head` emitter; includes/product-faq-schema.php + src/blocks/product-faq/render.php (FAQPage removal); confirm guard in class-product-item-list.php/configurator-head.php
  Inputs:      Step 3 (FR-30-10 review-data state); D204 schema work; Step 1 emitter enumeration
  Outcome:     Local JSON-LD validator zero errors; draft/scheduled product → zero JSON-LD as guest; cart/checkout/account noindex; grep zero SearchAction + zero rich-result FAQPage; returnPolicyCountry present in PDP + Organization.
  Exec:        PARALLEL with steps 5–8 (schema emitters vs shop templates are disjoint — but the aggregateRating gate depends on step 3's review state)
  Deps:        step 3 (review-data state for the aggregateRating gate)
  Marker:      SESSION-START
  Time:        75 min (qc-council: was 40 — Organization+WebSite+noindex+returnPolicyCountry are net-new builds, not an align)
  Tooling:     /subagent-driven-development; /adversarial-council (the codebase had a draft→public JSON-LD leak — red-team it); local JSON-LD validator; Google Rich Results Test (post-deploy verification only)
  On-Fail:     Revert emitter edits; shipped Product/Offer emitter resumes (already live-safe). New Organization/noindex files: delete the require/hook (single line) to disable.
  Cold-Entry:  Spec 30 FR-30-9; D204; class-product-schema.php + class-product-item-list.php + configurator-head.php + product-faq-schema.php; `public-text-xml-endpoint-gotchas`
  Prompt:      [dispatch via /subagent-prompt — embed the FR-30-9 per-page-type shape table verbatim]
  Test:
    Happy:       local validator zero errors on PDP/shop/sitewide shapes
    Edge:        scheduled/draft product as guest → ZERO JSON-LD (live-probed)
    Fail:        a SearchAction or rich-result FAQPage survives → grep finds it; remove
    Integration: WC store base-country (returnPolicyCountry) + FR-30-10 review-data gate

Step 10 — Parked P1 follow-ups: gallery-variation-swap decision + notify-me
  Model:       inline (gallery decision) + sonnet (notify-me build IF chosen)
  Action:      (a) P-WC-GALLERY-VARIATION-SWAP: decide — drive `selectedImageId` into the Beta gallery's Interactivity context from the buybox bridge (version-fragile) vs accept static-per-variation (current). Record the decision + rationale in decisions.md; build only if the driven path is chosen AND a multi-image variation fixture exists. (b) P-WC-NOTIFY-ME-CAPTURE: build the PECR-guarded capture endpoint (sanitize_email+is_email+nonce+≤3/IP/hour+un-pre-ticked consent+privacy link, email+product_id+timestamp only, data stays in WP) and wire the buybox notify-me UI; remove the `notifyMeLabel` baseline entry from dead-controls — OR explicitly re-defer with a recorded reason.
  Files:       plugins/sgs-blocks/src/blocks/buybox/* (notify-me); includes/class-notify-capture-rest.php (new, lazy-loaded); plugins/sgs-blocks/scripts/dead-controls-baseline.json (remove entry on ship)
  Inputs:      parking.md P-WC-GALLERY-VARIATION-SWAP + P-WC-NOTIFY-ME-CAPTURE
  Outcome:     Gallery decision recorded; notify-me either shipped-guarded (capture works, rate-limited, consent-gated) or re-deferred with reason.
  Exec:        SEQUENTIAL after step 7 (touches buybox — must not collide with FR-30-8's buybox edits; serialise on buybox)
  Deps:        step 4 (FR-30-8 buybox edits committed first)
  Marker:      (none)
  Time:        40 min (notify-me build) / 10 min (gallery decision only)
  Tooling:     /subagent-driven-development; /adversarial-council (PII/consent red-team on notify-me); chrome-devtools
  On-Fail:     notify-me: remove the REST route + UI (re-defer); gallery: no code, decision only.
  Prompt:      [dispatch via /subagent-prompt IF notify-me build chosen — embed the PECR guard list]
  Test:
    Happy:       notify-me submit stores email+product_id+timestamp, consent required, rate-limited
    Edge:        4th submit/IP/hour → rejected; un-ticked consent → no store
    Fail:        email stored without consent OR without sanitize_email → red-team catches; fix or re-defer
    Integration: WP options/table storage; buybox UI

Step 11 — FR-30-13: go-live checklist doc
  Model:       sonnet (doc + automatable probes)
  Action:      Write a versioned go-live checklist doc: (a) gateway LIVE-mode verified; (b) return-policy fields populated (FR-30-9 validator passes, no empty hasMerchantReturnPolicy); (c) review source connected with ≥1 genuine review OR empty-state toggle deliberately set; (d) per-unit denomination strings set (no placeholder); (e) product-data completeness sweep — published products missing sku/gtin listed; (f) statutory content present (food: allergen info in the FR-30-2 content slot); (g) FR-30-11 script green on the LIVE site; (h) cookie-consent verified if any capture/analytics active (PECR). Each item gets a named probe or manual step.
  Files:       .claude/specs/30-go-live-checklist.md (or plugins/sgs-blocks/WC-GO-LIVE-CHECKLIST.md); any automatable probe scripts
  Inputs:      All prior FR Done-whens; WC 10 coming-soon default (D210 — already an item)
  Outcome:     Versioned checklist exists; each item has a named probe/manual step; ready for the first client launch to record a pass.
  Exec:        SEQUENTIAL
  Deps:        steps 9, 10
  Marker:      (none)
  Time:        25 min
  Tooling:     /subagent-driven-development
  On-Fail:     n/a (doc)
  Test:
    Happy:       checklist doc exists with 8 items each carrying a probe/manual step
    Edge:        the WC `woocommerce_coming_soon=yes` default is an explicit go-live item (D210)
    Fail:        an item without a probe/step → add one
    Integration: FR-30-9 validator + FR-30-11 script as named probes

Step 12 — Phase close: /qc-council + /sgs-update + Bean R-22-13 + commit/merge
  Model:       inline
  Action:      /qc-council on the full P2 diff (security + logic raters); /sgs-update (new blocks); present 3-breakpoint screenshot set of every new visible surface (PDP price coupling, reviews, shop archive, search, filter) to Bean for R-22-13 sign-off; path-scoped commit(s) + FF-merge to main (temp-worktree cherry-pick if main held by the co-active thread — D210-cont precedent); archive this plan at close.
  Files:       (commit + docs: decisions.md D-entry, state.md, this plan → archive)
  Inputs:      All QA gates + Bean sign-off
  Outcome:     Spec 30 COMPLETE; all FRs closed; framework is a sellable shop.
  Exec:        SEQUENTIAL
  Deps:        steps 9, 10, 11
  Marker:      HANDOFF
  Time:        25 min
  Tooling:     /qc-council; /sgs-update; /handoff
  On-Fail:     Bean's eye finds gaps → fix-wave on the same branch before merge (D209/D210 precedent: expect this).
  Test:
    Happy:       merged; Spec 30 all-FR Done-whens green; this plan archived
    Edge:        co-active main held → temp-worktree cherry-pick (D210-cont precedent)
    Fail:        council BLOCK or Bean gap → fix before merge
    Integration: cross-thread main reconcile

## Key Judgement Calls

### Primary decisions

- **Decision (KJC-1):** Build order within the phase.
  - **Options:** A) P2 differentiators → shop → schema (spec order) / B) schema first (unblocks SEO) / C) shop first (biggest risk first)
  - **Recommendation:** A — differentiators first. FR-30-8 price coupling is the conversion moat AND the smallest/lowest-risk (reuses Spec 28 + the shipped buybox); it banks a visible win fast (ADHD Rule 2/12) and FR-30-9 schema's aggregateRating gate DEPENDS on FR-30-10 reviews shipping first. Schema (step 9) parallelises against the shop steps once reviews land.
  - **Cost of wrong choice:** Low — re-sequencing is free; only the schema/review dependency is hard-ordered.
  - **Who decides:** architect (taken).

- **Decision (KJC-2):** Home for the FR-30-3 SEO text slots (top/bottom RichText).
  - **Options:** A) a small new SGS block / B) theme-level RichText in the archive template / C) extend an existing block (e.g. sgs/text)
  - **Recommendation:** B if the archive template can carry editable RichText cleanly; else A (a thin `sgs/collapsible-text` block with the read-more SSR-collapse baked in — reusable on category pages too). Decide at step 5 against the live editor surface (archive templates edit in the Site Editor — confirm RichText editability there first).
  - **Cost of wrong choice:** Medium — wrong home = re-plumbing the read-more SSR-collapse. Confirm editor surface before building.
  - **Who decides:** architect at step 5, flagged to Bean at R-22-13.

- **Decision (KJC-3):** FR-30-5 search — extend core or full custom block.
  - **Options:** A) full custom SGS block + REST (spec mandates — core live-search is paid-extension-only) / B) wrap a core search block
  - **Recommendation:** A — the spec is explicit that live keyword product-search is NOT core (paid extension), so there is nothing to wrap. Full custom block + hardened REST per the FR-30-5 red-team list. This is the effort tentpole; its own design gate (step 7a) is mandatory.
  - **Cost of wrong choice:** High — shipping an unhardened search endpoint re-opens the exact draft-leak/XSS class this codebase shipped before. The design gate + security qc-council are non-negotiable.
  - **Who decides:** architect (taken); security qc-council gates the commit.

- **Decision (KJC-4):** FAQPage removal scope (FR-30-9 step 9E).
  - **Options:** A) remove only the footer `sgs_emit_faq_page_jsonld()` emitter + its add_action, keep the `sgs/product-faq` block rendering its Q&A content without schema / B) retire the `sgs/product-faq` block entirely
  - **Recommendation:** A — strip only the rich-result schema (Google dropped FAQ rich results), keep the block + its on-page Q&A content (still useful UX + the AI-citation FAQ framing per FR-27-F2). MUST also remove the `require_once` in `product-faq/render.php` or the block PHP-fatals (qc-council caught this).
  - **Cost of wrong choice:** Medium — deleting the block loses authored FAQ content; leaving the require after deleting the schema file fatals the block.
  - **Who decides:** architect, confirm with Bean if any client has authored FAQ content.

### Pre-emptive decisions (Hidden Decisions pass — inline analysis; gemini-flash/cerebras account-blocked this session, flagged for re-run at execution)

- **Buybox serialisation (FR-30-8 vs notify-me, step 2 vs step 10).** Both touch `buybox/render.php` + `view.js`. They MUST NOT run in parallel — step 10's notify-me build depends on step 4 (FR-30-8 committed first), serialising the buybox edits. Recorded in step 10 Deps.
- **Schema aggregateRating gate (step 9 ⟂ step 3).** FR-30-9 emits review/aggregateRating ONLY if FR-30-10 has live review data. Step 9 parallelises with the shop steps BUT hard-depends on step 3's review state — if FR-30-10 ships an empty-state-only canary (no live reviews), the schema emitter MUST omit review nodes, never stub them. Recorded in step 9 Deps + Test.
- **Reference-price precondition (FR-30-8, step 2).** The strikethrough/value-ladder badge needs an operator `_sgs_reference_price_pence`. Product 540 may not have one set (verify in step 1). With none set, "no badge renders" is CORRECT behaviour, not a bug — the Test Edge encodes this (verify-feature-flag-before-asserting-defect).
- **Searchable-filter fixture (FR-30-6, step 6).** The 16-vs-15 boundary test needs a real WC attribute with exactly 16 and exactly 15 terms. Seed both fixtures via SSH BEFORE the boundary test (recorded in step 6 Tooling); the canary's existing flavour attribute (12 terms) is insufficient.
- **FR-30-11 runs at EVERY phase-close gate, not just the end.** The responsive-audit script + executed-JS measurement is a gate condition on QA Gates A/B/C, not a single final step (recorded in each gate's Check).
- **Deploy-before-measure on EVERY visible change.** view.js changes need their `*.asset.php` deployed (the ?ver carrier) + opcache reset + served-?ver check before any browser test — else the test measures stale output. Binding across all build steps.

## QC Council receipt (2026-06-11)

Cross-family council (sonnet ground-truth verifier + haiku spec-fidelity checker + inline structural pre-gate + adversarial synthesis) ran on this plan BEFORE execution. **Spec fidelity: FAITHFUL** — every FR Done-when captured, all 8 FR-30-5 server-hardening guards + the SSR-collapse spec + DMCC + thresholds (16+, 30/IP/min, 300ms, <150ms, 44px) exact, zero dropped requirements. **Ground-truth defects found + FIXED in this revision (8, all empirically validated):**
1. HIGH — `buybox/view.js` does not exist (buybox mounts the product-card store); FR-30-8 live update goes in `product-card/view.js`. Steps 2 + QA-Gate-A corrected.
2. HIGH — `_sgs_reference_price_pence` absent codebase-wide; real key `_sgs_base_price_pence` + `_sgs_base_price_attested` (strict guard on the attestation flag). Pre-conditions + Step 2 corrected.
3. HIGH — QA-Gate-A grep gate targeted the non-existent file (false-green); retargeted to `product-card/view.js` with the pre-existing-fallback note.
4. MEDIUM — D204 draft-leak guard lives in `is_publicly_listable()` (`class-product-item-list.php` via `configurator-head.php`), NOT the schema emitter; Step 9 corrected to audit that path, not add a dup.
5. MEDIUM — FAQPage removal must update `product-faq/render.php`'s require or the block PHP-fatals; Step 9E + KJC-4 added.
6. MEDIUM — `returnPolicyCountry` absent → NET-NEW build, not align; Step 9B + time bump.
7. LOW-MED — `review-schema.php` is the sgs/testimonial emitter; the aggregateRating gate is `class-product-schema.php:build_aggregate_rating()`. Step 3 corrected.
8. MEDIUM — Organization + WebSite + cart/checkout noindex are UNSHIPPED → FR-30-9 reclassified from "audit-only" to "audit + 3 net-new builds"; Step 9 estimate 40→75 min.

**Verdict: plan VALIDATED-with-corrections.** No falsified steps; the spec contract was sound, the ground-truth file targets were stale. Saved ~1–2 build waves (a subagent told to edit a non-existent `buybox/view.js` or probe a non-existent meta would have produced a dead-on-arrival diff + a false-green gate). gemini-flash/cerebras peer raters were account-blocked — re-run the cross-family pass at execution if a third family is wanted.

## Parking lot

- B2B ex-VAT price display (Indus Foods) — Spec 30 Open Question 3; decide before Indus's shop build, not blocking Mama's. Stays parked.
- Subscriptions / subscribe-and-save / one-click reorder / build-a-box / A-B price hooks — Spec 30 Open Question 4 (council: subscriptions = the food-DTC deal-winner); Bean's scope call + extension-licence decision. Stays parked roadmap.
- Account page styling (FR: "none — CSS only, deferred") — not in this phase.
- GA4 funnel events on the configurator — parked (Spec 27 sibling).
