---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-11-theme-spec30-p2-gateB-shop-MERGED-D213-next-step6-search
generated: 2026-06-11
primary_goal: "SGS-THEME THREAD. Spec 30 P2 Gate A (FR-30-8 price coupling + FR-30-10 reviews) AND Gate B (FR-30-3 shop archive) are COMPLETE + merged to main (D213). The shop archive works live on the canary: WC Product Filters sidebar renders + filters the grid instantly (Interactivity router), equal-height cards + baseline-aligned CTAs, accessible mobile filter drawer, new sgs/collapsible-text read-more (i18n'd). NEXT = Steps 6–12 of `.claude/plans/2026-06-11-spec30-p2-differentiators-shop-schema.md`: FR-30-6 searchable attribute filter → FR-30-5 product search tentpole (design-gate + hardened REST, security-critical) → FR-30-9 schema (audit shipped PDP + build net-new Organization/WebSite/noindex/returnPolicyCountry, drop FAQPage) → FR-30-13 go-live → phase close. Opus orchestrator, sonnet dispatch, /qc-council before any WC-write/SGS-block commit, plain English to Bean."
---

# Next Session — SGS THEME thread — Spec 30 P2: Gate A+B DONE → execute Steps 6–12 (orchestration-first)

> ## SESSION CLOSE (2026-06-11 NIGHT, theme thread — READ FIRST) — Gate A + Gate B COMPLETE + MERGED to main (D213)
> **Gate B shipped this session.** FR-30-3 shop archive is live + verified on canary `/shop/` and merged to main. Two hand-authored-markup bugs were root-caused against WC 10.8's own canonical `templates/blockified/archive-product.html`: (1) the `woocommerce/product-filter-*` blocks were authored SELF-CLOSING → empty panels; fixed by nesting each filter's inner control block (`product-filter-price-slider` / `product-filter-chips` / `product-filter-checkbox-list`, per WC `ancestor` decls) + correcting attribute `displayStyle` from `"chips"` → `"woocommerce/product-filter-chips"`. (2) the `woocommerce/product-collection` lacked `tagName:"div"` + the wrapper `<div class="wp-block-woocommerce-product-collection">` + `queryId:0`/`isProductCollectionBlock:true` → WC never injected `data-wp-router-region` → filters changed the URL but never re-queried the grid. Fixed → instant filtering verified (5→3 in 253ms, no reload). Plus: equal-height cards + `.price-row margin-top:auto` baseline-aligns CTAs; accessible mobile drawer; NEW `sgs/collapsible-text` read-more (SSR line-clamp, i18n'd). axe-clean shop content (1 pre-existing core nav `list` = header chrome, FR-30-13). qc-council MERGE-OK (2 rater HIGHs refuted vs code+axe). Commits `7b953761` + `8fb94df1`. Theme v1.5.1.
>
> **RESUME at Step 6** of `.claude/plans/2026-06-11-spec30-p2-differentiators-shop-schema.md` (the plan now carries a `## PROGRESS` marker + `## Ground truth` block — READ BOTH). Order: FR-30-6 searchable filter → QA Gate B already passed (re-run only if Step 6 changes the archive) → **Step 7a FR-30-5 DESIGN GATE** (`/brainstorming` + `/adversarial-council` — the search is the security tentpole; this codebase shipped a draft-leak before) → Step 7b BUILD (hardened REST) → QA Gate C (security, /qc-council security rater MANDATORY) → Step 8 commit → Step 9 schema (PARALLEL-eligible) → Step 10 parked P1 follow-ups → Step 11 go-live doc → Step 12 phase close + merge.
>
> **⚙️ BINDING ORCHESTRATION MODEL (Bean directive 2026-06-11):** Opus main agent does ONLY plan / delegate / QC / live-test / commit. ALL block/PHP/JS/CSS implementation DELEGATED to sonnet subagents (return uncommitted diffs, NO commit/deploy authority). Main agent QCs (`/qc-council` + `/adversarial-council`, fact-check EVERY rater claim against live code/axe/DOM — this session 2 rater HIGHs were false positives), deploys + live-verifies on canary HIMSELF, then commits. SendMessage corrections back; never retype a subagent's file. (Narrow exception: trivial config tweaks — version bumps, a single attribute — done inline during live-test tuning.)
>
> **CO-ACTIVE TREE WARNING (live):** the cloning thread has UNCOMMITTED + STAGED testimonial/converter work in the shared primary worktree's index right now. Commit by EXPLICIT PATH (`git commit -- <paths>`), NEVER `git add -A`/bare commit. Merge to main via an ISOLATED temp worktree (`git worktree add --detach <tmp> origin/main` → cherry-pick → push HEAD:main); NEVER `git checkout main` in the primary worktree (clobbers their staged files). Never `git revert/restore/stash/clean` the shared tree.

## READ BEFORE ANYTHING ELSE — warm-start + STOP catalogue (carried forward + extended; do NOT subtract)
- **STOP — verify the branch before EVERY commit.** `git branch --show-current` + `git log origin/main --oneline -5`. `main` is shared with the co-active cloning thread (it holds the tree + has staged uncommitted work). Commit path-scoped (`git commit -m "..." -- <paths>`); merge to main via temp-worktree cherry-pick, never disrupt the co-active tree. Leave never-stage artefacts untouched: `lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `.parity-golden.json`, phase reports, build/, and the cloning thread's `testimonial*`/`convert.py`/`db_lookup.py`/conformance fixtures.
- **STOP — WC filter/collection markup must match WooCommerce's CANONICAL `templates/blockified/archive-product.html`.** Hand-authored WC block markup is the trap: each `product-filter-*` parent MUST nest its inner control block (price→price-slider, attribute→chips, status/rating→checkbox-list) — self-closing = empty panels; `displayStyle` = the FULL block name (`woocommerce/product-filter-chips`), not `"chips"`. The `product-collection` MUST have `tagName:"div"` + an explicit wrapper `<div class="wp-block-woocommerce-product-collection">` + `queryId:0`/`isProductCollectionBlock:true` or WC never attaches `data-wp-router-region` and instant filtering silently dies (URL changes, grid doesn't). When a WC block "renders empty/half", read WC's own block.json `ancestor` chain + its canonical template FIRST. (Found D213.)
- **STOP — there is NO global `.btn`/`.btn-primary` in the theme.** Those styles live ONLY in `product-card/style.css` scoped to `.product-card`. A bare `btn btn-primary` on any element outside a card matches zero rules (the `styled-nothing` / `dead-by-specificity` blind spot). Reuse the design TOKENS (`--wp--preset--color--primary` + `--sgs-product-card-btn-text`) instead, or extract a global button utility (parked P-NO-GLOBAL-BUTTON-COMPONENT).
- **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change; scp the WHOLE block set; opcache-reset; verify the served `?ver`.** WP reads each block's `style.css`, not `style-index.css`. The plugin build output is `plugins/sgs-blocks/build/blocks/<block>/` (NOT repo-root `build/`).
- **STOP — bump block.json version with ANY block style.css change; bump theme `style.css` Version with ANY theme `assets/css/*.css` change** (two DIFFERENT cache-bust mechanisms — Hostinger CDN caches 7 days on the ?ver URL). A probe contradicting a fresh deploy → check the served ?ver FIRST.
- **STOP — typography controls use the shared `TypographyControls` + `sgs_typography_css_rule()` (D209), NEVER bespoke blank-box font controls.**
- **STOP — a guard on ONE write path is not a guard; enumerate every path. `show_in_rest:false` on PHP-authored metas; strict `'1'===(string)$v` casts, never `(bool)`.**
- **STOP — REST/one-shot gates CANNOT see admin/editor/shop visual defects; a Playwright pass at 375/768/1440 is MANDATORY for any new admin/editor/shop UI.**
- **STOP — clean up superseded controls when changing a block** (ONE control per setting; audit duplicate/dead/render-without-control/vestigial; the dead-control guard is BLIND to render-without-control).
- **STOP — WC products edit in the CLASSIC screen, not Gutenberg** (`use_block_editor_for_post_type('product')` FALSE — no PluginPrePublishPanel for products).
- **STOP — a file-scope `extends \WC_*` class fatals the WHOLE site if required before WC loads; require inside `woocommerce_loaded` + a parse-time `class_exists` guard. After bootstrap-wiring deploys: curl the front page FIRST.**
- **STOP — a CPT capability map with SINGULAR meta-caps breaks the mapped capability SITE-WIDE; use plural primitives; probe the live admin after any CPT-registration change.**
- **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), not theme.json on disk.**
- **STOP — public product/text/XML endpoints: enumerate WC visibility states (`visibility=>'catalog'`/`'search'`), read raw `$post->post_password`, entity-decode display strings, single-flight lock + item cap, `?cb=` CDN-bust when verifying.**
- **STOP — schema/OG/feed price ALWAYS inc-VAT + from the MANIFEST; never `wc_get_price_to_display`/`get_children` in schema/feed emitters; FAQPage is DEAD (drop it, Google removed the appearance 2026-05-07); ONE Product node per PDP.**
- **STOP — NO static fake reviews (UK DMCC Act in force 2026-04-06, displaying trader liable); Trustpilot/verified-buyer only. The FR-30-9 PDP aggregateRating gate reads WC-NATIVE review count but the displayed reviews are TRUSTPILOT — pick a DMCC-honest aggregateRating source (it won't emit despite 5 live Trustpilot reviews).**
- **STOP — passing automated gates ≠ DONE (design + operational + legal); expect Bean's R-22-13 eye to catch more.**
- **STOP — fact-check EVERY subagent/rater claim against live ground truth (code + axe + live DOM) before acting; rater findings are HYPOTHESES.** This session 2 qc-council HIGHs (resize-listener "accumulation", price-slider "target-size fail") were FALSE POSITIVES — refuted by reading the code (listener bound once in init) + axe (0 shop violations) + the alternative price text-inputs.
- **STOP — build via PowerShell (`npm run build`), NOT Bash; WP guard-blocked ops via token-gated webroot one-shot (native PHP, quoted string literals); `POST /wp/v2/pages` is NOT guard-blocked; the creds file `.claude/secrets/sandybrown.env` has an unquoted `)` — parse with grep/cut, never `source`.**
- **STOP — dispatched agents have NO commit/deploy authority; they return uncommitted; the orchestrator reviews + live-verifies + deploys + commits. A rater must NEVER `git checkout/restore/stash/clean` the shared tree.**
- **STOP — WC 10 ships `woocommerce_coming_soon=yes` by default: it masks ALL store pages behind a Coming Soon template for guests. Check the option FIRST when store pages look wrong (canary is set to `no`). FR-30-13 go-live item.**
- **STOP — WC fixture = product 540 (`mamas-test-box-48-sku-fixture`, published 48-SKU variable); product 1017 is a DRAFT. Verify a fixture's post_status before writing tests against it.**
- **STOP — a `wp:html` block CANNOT wrap a following WP block** (self-contained; the next block renders as a SIBLING). To wrap WP blocks in a semantic element use `wp:group {"tagName":"aside"|"section"}`. After building any block-theme layout, live-probe `element.children`.
- **STOP — theme `contentSize` 780px / `wideSize` 1200px** (theme.json L297-298; CLAUDE.md DRIFT claims 1200/1400 — don't trust it). A wide shop layout needs `align:wide` on the DIRECT child of the constrained `<main>`.
- **STOP — the SGS visual-diff pre-commit gate** (`.git/hooks/pre-commit`) blocks any commit touching `plugins/sgs-blocks/src/blocks/<block>/` until `reports/visual-diff/<block>-<TODAY>.md` exists with `verdict: PASS` AND `first_paint_capture_passed: true`. Live-verify the block's RENDERED output FIRST, then write the report.
- **STOP — `sgs/product-card` has a loop-context mode** (`usesContext: postId`): inside a core `woocommerce/product-template` with `sourceMode=wc-product` + no explicit `productId` it binds to the loop's current product. How the shop grid renders SGS cards in a core Product Collection (FR-30-3 Option C).

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (theme/blocks — NOT the cloning pipeline.)
2. What branch is the working tree on? (`git branch --show-current`.) Has origin/main moved? (`git log origin/main --oneline -5`.) Is the cloning thread's testimonial/converter work staged in the index right now? (`git status` — if so, commit ONLY by explicit path.)
3. Have I read Spec 30 (FR-30-1..13) + D208/D209/D213 + the plan's PROGRESS + Ground truth blocks end-to-end before proposing a build sequence?
4. What is the MEASURABLE acceptance for the task I'm about to start (FR criterion + Bean's eye), not "code shipped"?
5. Will this change be visible on a live URL? If so — deploy (build + scp whole block set + asset.php + opcache-reset + verify ?ver) BEFORE measuring.

## State recap (plain English)
The shop now works: filters render and filter the grid live, products sit on a tidy equal-height grid, mobile gets an accessible slide-in filter drawer, and there is a new "read more" SEO text block. That, plus the product-page price-ladder and synced reviews from the last session, is all merged to main. The remaining Spec 30 work is the bigger, newer half: a type-to-find filter for long attribute lists, a custom product **search** box (this is the effort tentpole and is security-critical — it needs a design gate and a hardened search endpoint, because this codebase has shipped a data-leak before), the SEO/structured-data build, and a go-live checklist. After that Spec 30 is complete and SGS is a sellable shop.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | the FR-30-5 search design gate (Step 7a) + any architectural call |
| `/adversarial-council` | MANDATORY red-team on the FR-30-5 search server hardening (Step 7a) + the FR-30-9 draft-leak schema pass |
| `/gap-analysis` | grade any unit vs its FR acceptance |
| `/strategic-plan` + `/phase-planner` | only if Step 7 needs re-planning; the consolidated plan already covers 6–12 |
| `/research` (+ `/library-docs`) | WC Store API search patterns, `@woocommerce/block-data` selectors, combobox a11y, JSON-LD shapes |
| `/sgs-wp-engine` + `/wp-block-development` + `/wp-rest-api` + `/wp-plugin-development` | the WP build (search block + hardened REST) |
| `/qc-council` | MANDATORY before any WC-write / REST / SGS-block commit (blub.db 255); security rater MANDATORY on Step 7b |
| `/verify-loop` | 2-attestation on load-bearing security claims (draft-leak, rate-limit, XSS) |
| `/ui-ux-pro-max` + chrome-devtools/Playwright | MANDATORY visual pass on any new shop/search UI at 375/768/1440 |
| `/dispatching-parallel-agents` + `/subagent-driven-development` | Step 9 schema parallel with the shop steps; implementer→review loops |
| `/sgs-update` | after any block add/change (search + searchable-filter blocks register) |
| `/delegate` | model per dispatch (sonnet default; haiku = 2nd council family) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools / Playwright (switch to chrome-devtools MCP if Playwright "Browser already in use") | live shop/search verification + screenshots + 3-breakpoint + axe (inject axe-core 4.10 from CDN) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | products + variations + fixture seeding |
| SSH + token-gated webroot one-shot | guard-blocked WC ops; `ssh -p 65002 u945238940@141.136.39.73`; creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); read WC source for canonical markup |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | disjoint WP build pieces (searchable filter, search block + REST, schema emitters) — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku) | security / 2nd-council-family review |

## Dependency graph
```
Step 6 FR-30-6 searchable filter (sonnet build; seed 16-term + 15-term fixtures first)
  ↓ (re-run QA Gate B only if the archive markup changed)
Step 7a FR-30-5 DESIGN GATE (inline Opus: /brainstorming + /adversarial-council) → build contract
  ↓
Step 7b FR-30-5 BUILD (sonnet, hardened REST per the contract)
  ↓ QA Gate C (security; /qc-council security rater MANDATORY — draft-leak / 429 / XSS / schema)
Step 8 commit (path-scoped) + /sgs-update
  ‖  Step 9 FR-30-9 schema (PARALLEL — disjoint from shop; hard-depends on FR-30-10 review state for aggregateRating)
  ↓
Step 10 parked P1 follow-ups → Step 11 go-live doc → Step 12 phase close + /qc-council + Bean R-22-13 + merge to main (temp-worktree)
```

## Task 1 — FR-30-6 searchable attribute filter (Step 6)
**What:** a type-to-find input inside a filter group, auto-enabled when an attribute has >15 options (16+ Baymard threshold). **Why:** long flavour/ingredient lists are unusable without search; composes with the core Product Filters (filtering stays core). **Estimated:** 35 min.
**Orchestration:** delegate the build to sonnet (NO commit authority); main agent SEEDS the 16-term + 15-term attribute fixtures via SSH/one-shot, live-probes the boundary + draft-term-absence at 375/768/1440, /qc-council, commits path-scoped.
**Brief:** new searchable-filter enhancement block OR filter-group extension; visibility-scoped `get_terms()` (a draft-only term must NOT appear); client-side narrowing + ARIA live count; 0 matches → "No matching options". The canary's flavour attribute (12 terms) is INSUFFICIENT — seed both fixtures first.
**Acceptance:** 16-term attr renders the input, 15-term renders none (boundary live-probed); typing narrows + announces; draft-only term absent; narrowed option filters identically to core. **/qc gate after:** /qc-council.

## Task 2 — FR-30-5 product search (Steps 7a design-gate + 7b build) — THE security tentpole
**What:** a custom SGS product-search block + a hardened REST endpoint (core live-search is paid-extension-only). **Why:** the spec's largest net-new build and the conversion-critical shop feature. **Estimated:** 30 min design + 60 min build.
**Orchestration:** Step 7a INLINE (Opus design gate: `/brainstorming` combobox UX + no-JS fallback + relevance; then `/adversarial-council` red-team the server hardening → a build contract naming every guard + a NAMED enforcement runner). Step 7b DELEGATED to sonnet per the 7a contract verbatim; main agent runs the security live-tests HIMSELF (curl-hammer 429, draft-leak probe with a seeded draft, XSS-title inert) + commits.
**Brief (hardening, zero-tolerance — this codebase shipped this leak class before):** rate limit ≤30 req/IP/min (transient/object-cache, server-side — client debounce is UX only); <2-char reject; `sanitize_text_field`+`wc_clean`; constrain `post_status='publish'` AND `catalog_visibility IN ('visible','search')`; fixed response schema (ID/title/permalink/thumbnail — NO price/meta/variation); `WP_REST_Response`; `textContent` not innerHTML; combobox a11y (role=search→combobox, aria-autocomplete=list, listbox/option, keyboard, 44px); no-JS `<form method=get>` → `?s={q}&post_type=product`.
**Acceptance:** ≥2-char surfaces prefix-first matches; draft title NEVER appears; 429 past the limit; XSS inert; response has no price/meta; axe 0; <150ms on a 500-product fixture; the regression check is wired to a runner that ACTUALLY runs (grep the wiring). **/qc gate after:** QA Gate C — /qc-council security rater MANDATORY; ANY guard failure = NO commit.

## Task 3 — FR-30-9 schema (Step 9, PARALLEL-eligible)
**What:** AUDIT the shipped PDP `Product`/`Offer` + Shop `ItemList` (D204 guard in `is_publicly_listable()`), then BUILD net-new `returnPolicyCountry`, sitewide `Organization`+`WebSite` (NO SearchAction), and cart/checkout/account `noindex`; DROP FAQPage (remove the emitter AND its `require_once` or the block fatals). **Why:** complete structured data = SEO/AI-search ranking; the last Spec 30 build pillar. **Estimated:** 75 min.
**Orchestration:** split audit-vs-build → delegate to sonnet; main agent runs the local JSON-LD validator + a draft-leak guest probe + grep gates + commits. **DECIDE the PDP aggregateRating source** — the gate `build_aggregate_rating()` reads WC-native review count but the displayed reviews are TRUSTPILOT (won't emit despite 5 live reviews); pick a DMCC-honest source or omit (never stub).
**Acceptance:** local validator 0 errors on PDP/shop/sitewide; draft product as guest → 0 JSON-LD; cart/checkout/account noindex; grep 0 SearchAction + 0 FAQPage; returnPolicyCountry present. **/qc gate after:** /adversarial-council (draft-leak red-team) + /qc-council.

## Task 4 — FR-30-13 go-live checklist + Step 12 phase close
**What:** versioned go-live doc (gateway LIVE / return-policy / review-source / per-unit strings / product-data sweep / allergen statutory content / FR-30-11 script / cookie-consent / `woocommerce_coming_soon=no`), then /qc-council on the full P2 diff + Bean R-22-13 3-breakpoint sign-off + merge to main (temp-worktree). **Estimated:** 25 + 25 min.

## Parked / optional (Bean's choice, not blocking)
- Step 10 P1 follow-ups: per-variation gallery image-swap decision (record in decisions.md) + PECR-guarded notify-me capture (build or re-defer with reason).
- P-NO-GLOBAL-BUTTON-COMPONENT (extract a global `.btn` theme utility); P-COLLAPSIBLE-TEXT-DEFAULT-COPY (per-client SEO-copy onboarding); trust-bar `gridItemPadding` cosmetic NIT.

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on a live URL needs build (PowerShell) + whole-block-set scp + `*.asset.php` + opcache-reset + ?ver check BEFORE any browser/axe test; else you measure stale output.
- **Root cause before instance fix** — ask "what's the class of failure?" When a WC block renders wrong, read WC's block.json `ancestor` + canonical template FIRST (D213 — both shop bugs were hand-authored-markup divergence, not CSS).
- **Outcome vs completion** — code shipped ≠ outcome achieved; don't mark a task done until its FR acceptance + Bean's eye pass.
- **Fact-check every rater claim** against live code/axe/DOM before acting — rater findings are hypotheses (2 false-positive HIGHs this session).
- **/qc-council (cross-model) BEFORE every commit** touching WC-write / REST / SGS-block logic (blub.db 255); security rater MANDATORY on FR-30-5.
- **WCAG 2.2 AA, mobile-first, 44px targets, 4.5:1 contrast. UK English everywhere.**
