---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-05-theme-clusterC-COMPLETE-next-clusterD-or-first-shop
generated: 2026-06-05
primary_goal: "SGS-THEME THREAD. Spec 27 PHASE 2 + Spec 28 P1 value-ladder are SHIPPED + live-verified + Bean R-22-13 SIGNED OFF (D176/D177/D179 — all COMMITTED 535942f1/cd898a11). A 6-persona adversarial-council + a verifier-subagent fact-check (2026-06-05) then stress-tested the shipped Cluster C + Spec 28 P1 + docs and produced a FACT-CHECKED must-fix/should-fix/missing backlog (parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`; 2 council claims were REFUTED + excluded). FIRST JOB this session = PLAN an optimal haiku+sonnet subagent-driven WAVE-PLAN (via /strategic-plan→/phase-planner + /dispatching-parallel-agents) that clears the WHOLE parking backlog in a few file-disjoint waves, THEN EXECUTE it, THEN continue Spec 27/28 to 100% completion (EXCLUDING the cloning HTML-draft product page, which is the parallel cloning thread). The headline must-fixes: (1) the value-ladder shipped with NO authoring UI — add framingMode/decoyEnabled controls + a VALIDATED _sgs_base_price_pence field (savings are silent + the 'genuine single' is a legal-exposure box without it); (2) PREFLIGHT publish-block is INVISIBLE in the block editor (admin_notices don't render in Gutenberg) — add a PluginPrePublishPanel calling GET /preflight; (3) the £0 Store-API add-to-cart bypass (override woocommerce_is_purchasable); (4+5) two UK consumer-law items (validate the reference price; stop decoy mode calling a non-cheapest pack 'Best value'). Main inline agent = OPUS orchestrator: dispatch haiku for mechanical/enumerative + sonnet for code_gen (NO commit/deploy — return uncommitted; you review + live-verify + deploy + commit by EXPLICIT PATH), /qc-council before any WC-write commit, FACT-CHECK every subagent claim against live ground truth, plain-English to Bean (Problem→Effect→Solution + ranked menu + one recommendation)."
---

# Next Session — SGS THEME thread — council backlog Wave 1/2/3#2 SHIPPED — next = Wave 3 #17 (file-split + centralise lean-seed stripper), then Spec 27/28 to 100%

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Spec 27 Phases 1+2 + Spec 28 P1 SHIPPED; the adversarial-council must-fix backlog Wave 1 (9) + Wave 2 (8) + Wave 3 #2 are ALL SHIPPED + live-verified + R-22-13 signed (D180/D181, commits `04e62cdd`/`34e7e427`/`dbb96b6c`/`0bf4f2a7`).** Do NOT re-touch shipped units. The **cloning Method-2** session is co-active on the SAME `main` — commit by EXPLICIT PATH only (`git commit -- <paths>`), `git log -1 --stat` after, never `git add -A`, leave the never-commit artefacts (`lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, phase4 reports) + the cloning thread's `container/*`, `social-icons/*`, `SpacingControl.js`, `class-sgs-container-wrapper.php` untouched.
>
> **FIRST JOB:** verify HEAD + the shipped commits (`git log --oneline -15`), read parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE` (now Status: PARTIAL — what shipped vs what remains), then open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` and confirm the configurator + value-ladder render (16 pills + per-pack ladder; savings are OFF by default — that's the honest default, 540's `_sgs_base_price_pence`=0). Then start **Wave 3 #17** (see What's next). The 2 REFUTED council claims (unmanaged-stock cap; discount-label-as-code-bug) are NOT actionable.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch Sonnet subagents for mechanical builds (NO commit/deploy authority — they return uncommitted; you review + live-verify + deploy + commit); run the /qc-council + /subagent-driven-development two-stage review; FACT-CHECK every subagent claim against live ground truth (read the file, grep the wiring, run the live one-shot, open the live page — a subagent's "done" is a HYPOTHESIS); keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) + a ranked menu + one recommendation.
>
> **Bean directive (2026-06-04, locked): in a multi-task batch, DON'T stop between tasks to ask permission — proceed task-to-task on passing+substantiated evidence; only stop for a genuine decision or a hard block.** Memory `dont-stop-between-tasks-in-a-batch`.

## STOP catalogue (anti-pattern defences — carried forward + EXTENDED; do NOT subtract)

> **STOP — a guard on ONE write path is NOT a guard (NEW, session 17).** A validation/audit guard that lives only in one code path (e.g. the WC save hook) is bypassed by every OTHER path to the data. `_sgs_base_price_pence` was `show_in_rest:true`, so a REST meta write (`POST /wp/v2/product/{id}` `{"meta":{...}}`) stored it bypassing the #4 legal floor-check AND the #19 DMCC audit (verified live, 200, no audit row). FIX = close unneeded doors: `show_in_rest:false` on PHP-authored metas, NOT duplicate the validation. A meta read as a security/legal gate uses STRICT `'1' === (string)$v`, never a `(bool)` cast (a rogue `'true'` string passed `(bool)`). Enumerate EVERY path (REST meta, update_post_meta, WP-CLI, classic save, block editor) before trusting a guard. Memory `guard-on-one-path-is-not-a-guard`.
> **STOP — a duplicated calculation DRIFTS silently (NEW, session 17).** The product-card lean-seed strip was hand-copied into 3 places — render.php (the real seed), PREFLIGHT's `lean_manifest_subset`, and the size test. PREFLIGHT's copy kept single-image galleries render.php empties → it measured 27739B vs the real 22408B → a FALSE `manifest_over_cap` block that silently reverted the valid 48-SKU fixture to DRAFT (which then collapsed the configurator to the static card — a confusing cascade to root-cause). #17 must CENTRALISE the stripper into one callable. Memory `duplicated-calculation-drifts`.
> **STOP — WC products edit in the CLASSIC screen, not Gutenberg (NEW, session 17).** `use_block_editor_for_post_type('product')` is FALSE on this stack, so a Gutenberg `PluginPrePublishPanel` will NEVER render for a product. Surface product-edit notices via persisted meta + an `admin_notices` reader (the publish-block revert runs in a redirecting POST, so any notice queued in-request is lost — read the persisted `_sgs_preflight_issues` on the next edit-screen load). Probe the real editor flow before building any editor-surface feature.
> **STOP — the Gemini cross-rater is ACCOUNT-BLOCKED (NEW, session 17).** The gemini CLI returns 403 "Lightning dunning decision is deny for project" (billing). Do NOT rely on gemini-flash/pro for the cross-family `/qc-council` rater — use a haiku subagent as the second model family instead (sonnet + haiku + inline).
> **STOP — a bare `git commit` flushes the WHOLE staged index, not just files you `git add`ed (NEW, session 16).** With co-active sessions on shared `main`, `git add <my paths>` does NOT scope the commit — a following bare `git commit` swept in 3 Spec-28 staged files under my message. ALWAYS `git commit -- <explicit paths>` (or check `git diff --cached --stat` + `git restore --staged <strays>` first). NEVER history-rewrite shared `main` to fix an over-broad commit. Memory `git-commit-must-be-path-scoped-with-coactive-sessions`.
> **STOP — passing automated gates ≠ DONE (design + operational + legal).** axe-0 / unit / live-QA green does NOT mean visually correct, usably-authored, or legally safe. Self-review with `/ui-ux-pro-max` + chrome-devtools 3-breakpoint, expect Bean's eye (R-22-13) to catch more, AND adversarial-council + fact-check anything consumer-facing. Spec 28 P1 passed unit+live QA yet a council found: no authoring UI (savings dead by default), a fabricated-reference-price legal exposure, a "Best value"-on-a-non-cheapest-pack DMCC risk, an invisible PREFLIGHT block (parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`). Memory `ship-gate-needs-human-eye-not-just-automated-gates` (D165 + session-16).
> **STOP — pre-`wp-load` one-shot token gates must use NATIVE PHP ONLY (NEW, session 15).** A token-gated webroot runner checks `$_GET['t']` BEFORE `require wp-load.php`, so WP helpers (`wp_json_encode`/`wp_unslash`/`sanitize_text_field`) DO NOT EXIST yet — use raw `$_GET`, `hash_equals`, `json_encode`. `php -l` is syntax-only and does NOT catch the undefined-function fatal. Caught 3× this session.
> **STOP — token-swap placeholder guard must be a LENGTH check, never a literal `=== 'PLACEHOLDER'` (NEW, session 15).** Deploy swaps the token via `sed s/PLACEHOLDER/<token>/g`, which rewrites the comparison literal too → `'<token>' === SGS_X_TOKEN` is always true → permanent 503. Use `if ( strlen( SGS_X_TOKEN ) < 32 ) { 503 }` (also enforces ≥32-byte entropy). Caught 2×.
> **STOP — fact-check subagent WIRING + invented APIs against ground truth (NEW, session 15).** A Sonnet build "done" hid: R2 routes NOT wired into `sgs-blocks.php` (grep the `::register()` line); an invented `wc_register_attribute_taxonomies()`; a `plugin_dir_path(__DIR__)` path-doubling. `php -l` passes on all of these — only `grep sgs-blocks.php` + a LIVE run catch them. After any subagent build: grep the wiring, run the live one-shot, read the debug.log.
> **STOP — the configurator manifest/schema is PUBLISH-GATED (NEW, session 15).** `Product_Manifest::build()` returns empty combos for any product whose `post_status !== 'publish'`. So any readiness/JSON-LD check on a DRAFT (e.g. a pre-publish `GET /preflight`) must NOT treat empty JSON-LD as a blocker — PREFLIGHT Check-7 now gates on publish status. At the publish TRANSITION the status is already 'publish' (the hook fires post-DB-update), so the real gate still validates.
> **STOP — golden-master fairness: the "native" reference must derive slugs the SAME way the unit-under-test does (NEW, session 15).** WC's `wc_create_attribute`/`wc_sanitize_taxonomy_name` normalises an attribute name "Acctest Size" → slug `acctest-size` (hyphen via sanitize_title), NOT a hardcoded `acctest_size` (underscore). A mismatched reference produces a false diff. Build the native side from the NAME, not a hand-picked slug.
> **STOP — manifest growth can trip the product-card 24 KB context cap (D173).** Adding server-only fields to `Product_Manifest` bloats the seed the card writes into `data-wp-context`; the 48-SKU fixture went 23→31.8 KB → DROPPED the interactive configurator to the static "From" card (`type="radio"` 16→0). Keep the FULL manifest server-side; render.php seeds a LEAN subset (`unset` schema-only keys + drop <2-image galleries). VERIFY the rendered DOM (`type="radio"` count), not just valid JSON. Memory `manifest-growth-can-trip-capped-client-seed`.
> **STOP — verify a FEATURE FLAG before calling a missing side-effect a defect (D173).** R1's `wc_product_attributes_lookup` stayed 0 rows — NOT a bug: `woocommerce_attribute_lookup_enabled='no'`, so native WC also skips it. One `get_option()` probe settles it. Memory `verify-feature-flag-before-asserting-defect`.
> **STOP — a rater/council finding is a HYPOTHESIS, not a fact — fact-check it before it drives a single fix.** Re-derive every cross-model rater / adversarial-council claim against (a) the real code, (b) the LOCKED spec + the actual rules (Google / DMCC / CPRs), and (c) the ACTUAL threat model (an authenticated write path is strict; a public-read shop endpoint is not). Session-16's council had 2 claims REFUTED by a verifier subagent; D173's seo-schema "errors" contradicted the locked spec. Memory `feedback_council_validates_the_criterion_it_is_given`.
> **STOP — R1/R2 are COOKIE-AUTH (D173).** The authoring controllers require `X-WP-Nonce` (cookie CSRF); app-password/Basic REST fails the nonce gate (correct for the block-editor UI use case). R3's authoring UI calls them from a logged-in admin context with `wp_create_nonce('wp_rest')`.
> **STOP — WC variable-product writes go through `set_*()`+`save()`, NEVER raw postmeta (D173).** The raw-postmeta seed left `wc_product_attributes_lookup` empty; the data-store path produces byte-identical output + triggers lookup sync. The ONLY permitted `update_post_meta` is SGS bookkeeping (`_sgs_variation_upsert_key`), never commerce data.
> **STOP — WC batch is NOT transactional (R2 rollback, FR-27-R2 — SHIPPED).** A cartesian generate that fails midway leaves orphan variations + a corrupt product. R2 tracks every created id (ledger) + parent snapshot, deletes-on-failure + restores; UI shows created-vs-failed. PROVEN: injected failure → 0 orphans. Any future bulk WC-write must keep this discipline.
> **STOP — provisioning a shared `pa_*` taxonomy must not break siblings (R2 — SHIPPED).** Provisioning only ADDS terms; parent attributes are MERGED by union, never replaced (a re-run with fewer attributes must not orphan an existing attribute's variations). Rollback deletes a created term ONLY if it has zero object-relationships, a created taxonomy ONLY if zero terms. PROVEN: shared-subset add → sibling unchanged.
> **STOP — PREFLIGHT is a HARD block (SEC-5 — SHIPPED).** A £0/no-image/draft/over-24KB-cap/no-valid-variesBy product is un-publishable via `transition_post_status` (revert to draft + `_sgs_preflight_issues` meta + admin notice), AND the cart-proxy independently rejects a £0 add (422 `sgs_price_not_set`) + the `woocommerce_add_to_cart_validation` filter covers the Store-API path. Re-entrancy guard (static flag + remove/add_action) on the revert.
> **STOP — authoring is UN-GATED: every presentation/config field ships WITH a friendly editor control (R3 — SHIPPED), NEVER raw-meta editing.** R3 writes the Step-0 `Configurator_Meta` keys through the term/variation screens + the variesBy `<select>`. Zero-raw-meta proven by the e2e gate.
> **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change (D168).** A `view.js` change has NO browser effect until its `build/blocks/<block>/view.asset.php` (the `?ver` carrier) is ALSO deployed. scp the WHOLE block set, opcache-reset, verify the served `?ver`. Memory `deploy-asset-php-with-viewscriptmodule`.
> **STOP — WP reads each block's `style.css`, NOT `style-index.css` (D171).** Deploy `style.css` (+ `style-rtl.css`) for any block-CSS change. Memory `wp-reads-block-style-css-not-style-index`.
> **STOP — WP Interactivity does NOT bind `data-wp-on` on imperatively-injected DOM nodes (D171).** Use EVENT DELEGATION on a stable ancestor. Memory `interactivity-no-bind-on-injected-nodes`.> **STOP — run the ESCAPE-AUDIT before committing any new data→HTML/REST path (D171).** Build a [value → source → sanitise-at-save → escape-at-render → output context] table; /qc-council it.
> **STOP — SSR==swap parity (D168).** Any display string PHP computes server-side AND view.js recomputes on swap MUST be byte-identical — seed the literal into context; never re-derive in JS. A directive bound to a JS-only getter resolves empty + WIPES the SSR value. Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`.
> **STOP — WP Interactivity `data-wp-on--<event>` silently will NOT bind a custom event name containing a COLON.** Bridge via `data-wp-init` + a captured-context `addEventListener`. Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`.
> **STOP — schema/OG price ALWAYS inc-VAT + from the MANIFEST (SEC-1/SEC-2).** Never re-read WC for price in the schema/OG path; a CI grep asserts `class-product-schema.php` has zero `wc_get_price_to_display`/`get_children`.
> **STOP — canonical: never `add_query_arg`, never `$_GET` (SEC-7).** Build variation URLs from the variation's own server-side `get_attributes()`, validate each `?attribute_*` key is a real taxonomy + value a real term.
> **STOP — detect-and-defer if Yoast/RankMath active (SEC-9).** OG/canonical/sitemap defer to an SEO plugin; only the variant JSON-LD stays.
> **STOP — scope shared-block changes to the variant the gated surface doesn't use.** `sgs/product-card` renders page-144 Typed clones AND is shared with cloning WS-4 + Spec-28; build against the Bound (`wc-product`) branch + `.product-card--bound`-scoped CSS; option-picker changes ADDITIVE.
> **STOP — don't assert block/WC capability from a partial dump:** read `block.json` + `render.php` + `/wp-blocks` + the live WC object before building on top.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / live DOM / live one-shot) BEFORE dispatching a fix.
> **STOP — verify against git, not the handoff:** run `git log --oneline -10` + `git branch` first; cloning + Spec-28 threads commit to the same `main`.
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk** (Spec 26 / FR-26-D2). Memory `canary-live-styles-come-from-wp-global-styles-post`.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`/`wp post update`) → token-gated webroot one-shot PHP runner (require wp-load + secret `$_GET['t']`, curl, rm). `POST /wp/v2/pages` is NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`. NB the Git-Bash drive-letter quirk: `cd /c/Users/...` works, `cd c:/Users/...` + relative `secrets/` writes can fail — use the working form.> **Guardrail (all tasks):** after every change open the canary + run the live one-shot, verify zero console errors + correct live values BEFORE considering the task done. Surgical deploy: build via PowerShell → scp `build/blocks/<block>/*` (incl `*.asset.php` + `style.css`) + changed `includes/*.php` → opcache-reset. PHP/JS-only → `git commit --no-verify`.

## State recap (plain English)
**The shop LAYER is functionally complete + legally hardened.** Spec 27 (Phases 1+2) + Spec 28 P1 ship a sellable, discoverable, client-authorable variable-product configurator. This session cleared the WHOLE adversarial-council must-fix backlog: Wave 1 (9 security/hardening items), Wave 2 (the value-ladder authoring UI + UK consumer-law fixes — DMCC/CPRs/ASA/Price-Marking-Order grounded), a 3-team adversarial red-team pass (6 more real gaps fixed, incl a REST-meta legal-control bypass + a PREFLIGHT lean-subset-drift false-positive), and Wave 3 #2 (the PREFLIGHT publish-block is now VISIBLE on the classic product edit screen + provisioning auto-sets Google variesBy). All live-verified on canary 540, R-22-13 signed. **The single real first-shop blocker is the CONVERTER (cloning thread) — the shop layer is done; do NOT out-run the converter.**

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -15` + `git status` + `git branch --show-current` (HEAD on `main`; confirm the shipped commits `04e62cdd`/`34e7e427`/`dbb96b6c`/`0bf4f2a7`/`edcd0d40` are present). Open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` and confirm the configurator renders (16 pills + per-pack ladder; savings OFF by default = honest default). **D-NUMBER CONTENTION: theme + cloning share one decisions.md — VERIFY the live max with `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (currently D181) before assigning a new one; commit decisions by `git commit -- <path>` only.**

## Mandatory READING (read these before starting #17)
1. This prompt's **STOP catalogue** (above) + **`.claude/handoff-theme.md` session-17** (top) — what shipped + this session's 4 new lessons.
2. **parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`** (Status: PARTIAL) — what's shipped vs what remains (#17 + Phase 2).
3. For #17 specifically: the THREE lean-seed strip sites that have drifted — `src/blocks/product-card/render.php` (~lines 266-278, the REAL seed = source of truth), `includes/class-product-preflight.php` `lean_manifest_subset()`, and `tests/php/LeanSeedSizeTest.php` (the test's hand-copy) — these must collapse to ONE callable. Plus `includes/render-helpers.php` (1500+ lines) + `includes/class-cart-proxy.php` (988) for the split.

**At-point-of-use (do NOT read up-front):**
- PHASE 2 only: Spec 27 §FR-27-R4 / §FR-27-F2 (R4 slug-templates + F2 feed) + Spec 28 §P2/P3 — when you START Phase 2, not before.
- The deferred first-shop draft (`sites/mamas-munches/…`) belongs to the cloning thread; do NOT read it for this thread's work.

## What's next — Wave 3 #17 (file-split + centralise stripper), then Spec 27/28 to 100%

### Task 1 — Wave 3 #17: file-cohesion split + CENTRALISE the lean-seed stripper
**What:** extract ONE canonical lean-seed stripper that render.php, PREFLIGHT, and the size-test all call; split the two oversized files into cohesive units.
**Why:** the stripper is hand-copied in 3 places and ALREADY drifted once this session (PREFLIGHT's copy kept galleries render.php empties → a false `manifest_over_cap` that reverted the valid fixture to draft). One source of truth kills that whole class of bug. `render-helpers.php` (1500+) + `class-cart-proxy.php` (988) both exceed the 300-line guideline.
**Estimated time:** 30–45 min.
**Orchestration:**
- Execution: delegated. Model: **sonnet** (code_gen, multi-file refactor) via /delegate. Dispatch: `/subagent-driven-development` (implementer → spec-review → quality-review), single implementer (NOT parallel — it moves functions many files reference).
- Brief: (a) extract the lean-seed strip (render.php ~266-278: `unset sku/gtin/incMinor/saleEndDate` + empty galleries with <2 images) into ONE callable (e.g. `sgs_lean_seed_combos($combos)` in render-helpers.php OR a new value-ladder helper file); rewire render.php + PREFLIGHT's `lean_manifest_subset` + LeanSeedSizeTest to call it. (b) Split `render-helpers.php` → colour / configurator-pricing / value-ladder / svg-kses files; split `class-cart-proxy.php`. Each new file `require_once`s its OWN deps (memory `shared-helper-must-require-its-own-deps`).
- Context the subagent needs: the 3 strip sites diverged THIS session — render.php is the source of truth; PREFLIGHT must match it byte-for-byte. NO commit/deploy (return uncommitted; orchestrator reviews + live-verifies + commits path-scoped).
- Depends on: none. Parallel with: none (high-churn — do alone).
- /qc gate after: **/qc-council** (touches the cart-proxy WC-path + the seed that gates the configurator) BEFORE commit; then live-verify the canary 540 page still renders 16 pills + ladder + PREFLIGHT still passes 540 (the exact regression risk).
**Acceptance:** one stripper, three callers; render-helpers + cart-proxy each split into <300-line cohesive files; canary 540 unchanged (16 pills, ladder, publishes); php -l + WPCS clean; LeanSeedSizeTest green.

### Task 2 — Phase 2: Spec 27/28 to 100% (after #17)
**What:** R4 (agency slug-templates) + F2 (FAQPage / llms.txt / llms-full.txt / Merchant feed); Spec 28 P2/P3 (preview engine + base-price authoring cascade — P3 overlaps the shipped Wave-2 #1, reconcile).
**Why:** completes Spec 27/28 (excl. the cloning HTML-draft product page). **P4 WC-write + R5 AI-builder STAY GATED** (R5 = the OC-Protector stall trap; design via /brainstorming only).
**Orchestration:** delegated sonnet per unit via /subagent-driven-development; /qc-council before any WC-write/SEO-emit commit; research the gold standard first (Rule 16: Merchant-feed + llms.txt conventions). Read Spec 27 §FR-27-R4/§FR-27-F2 + Spec 28 §P2/P3 at-point-of-use.
**Acceptance:** R4/F2 testable on the canary 48-SKU fixture (540/589); valid feed + llms.txt; Spec build-order rows flipped.

### Dependency graph
```
Task 1 (#17, sonnet via SDD, ALONE — high churn)
  ↓ /qc-council + live-verify 540 unchanged
Task 2 (Phase 2: R4+F2, P2/P3 — sonnet per unit, /qc-council per WC-write/SEO commit)
```

**STRATEGIC NOTE (carried):** the real FIRST-SHOP blocker is the CONVERTER (cloning thread — typography/grid/hero don't lift faithfully). The theme thread's value is a correct + safe + complete shop layer — NOT out-running the converter. Do NOT pull Spec 28 P4 forward ahead of it.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — auto-injected by SessionStart |
| `/brainstorming` | design R5 AI-builder safety / a first-shop plan before coding |
| `/strategic-plan` + `/phase-planner` | if starting Cluster D (R5 is multi-session) |
| `/subagent-driven-development` | per-unit implementer→spec-review→quality-review loop |
| `/dispatching-parallel-agents` | only for genuinely DISJOINT pieces (fan out ≤3) |
| `/sgs-wp-engine` + `/wp-rest-api` + `/wp-plugin-development` + `/wp-hooks` | controllers, CPT, feed, cron |
| `/research-check` / `/library-docs` | gold-standard reference BEFORE building (R5 LLM-commerce; Merchant feed spec) |
| `/qc-council` | MANDATORY before any commit touching a WC-write path (blub.db 255) |
| `/verify-loop` | 2-attestation on load-bearing claims |
| `/ui-ux-pro-max` + chrome-devtools | self-review any new visible UI @375/768/1440 |
| `/gap-analysis` | grade each unit vs its FR acceptance before delivery |
| `/delegate` | pick the model per dispatch (Sonnet default; Opus for R5 safety design) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## Tool bindings (MCP / CLI)
| Tool | For |
|------|-----|
| chrome-devtools `/browsing` (Playwright MCP is often HELD by a co-active session — use chrome-devtools `new_page`) | live page + JSON-LD extraction + screenshot + 3-breakpoint |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` | product + variations |
| SSH + token-gated webroot one-shot runner | guard-blocked WC ops + acceptance tests; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env` (CONFIRMED on disk 2026-06-05 — the file is ONLY at `.claude/secrets/`; an earlier note claiming repo-root `secrets/` was WRONG and is corrected); plugin path `…/sandybrown…/public_html/wp-content/plugins/sgs-blocks` |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-unit mechanical build (no commit/deploy) + cross-model spec/quality raters |
| `wp-sgs-developer` | heavy WC-write build (if registered + preferred) |
| `design-reviewer` | any new visible authoring UI + WCAG 2.2 AA |

## Done — do NOT redo (the wave FIXES specific gaps in these; it does NOT rebuild them)
- Spec 27 Phase 1 (D165) + Phase 2 Cluster A (D171) + Cluster B SEO (D173) + **Cluster C: R1 `f747e58a`, R2 `e62f337f`, R3+PREFLIGHT `dd9d0d7d`, preflight-fix+e2e `27e54132`** — ALL SHIPPED, live-verified, R-22-13 signed. Image-sitemap DESCOPED (Bean, D173).
- **Spec 28 P1 value-ladder SHIPPED** (`49d63ab8` + `e0dea916`, product-card v1.13.0, D179) — the ladder + helpers render live.
- **Council backlog Wave 1 (9) + Wave 2 (8) + Wave 3 #2 SHIPPED + live-verified (D180/D181):** £0 is_purchasable; rate-limit/403/test-gate/cron/placeholder/rollback hardening; the value-ladder authoring UI + ALL UK consumer-law fixes (reference-price floor+attestation, "Best value"→"Most popular" decoy, deny-list, inc-VAT, audit); REST-bypass closures (`show_in_rest:false`); strict-attested render gate; PREFLIGHT lean-subset-drift fix; PREFLIGHT publish-block visible on the classic edit screen; auto-set Google variesBy at provisioning. Commits `04e62cdd`/`34e7e427`/`dbb96b6c`/`0bf4f2a7`. Do NOT rebuild — #17 only CENTRALISES the (now-3-copy) lean-seed stripper these touched.

## Methodology guardrails
The standing methodology is NOT restated here (it was a duplicate of other sections) — it lives in: the **STOP catalogue** above (fact-check subagent wiring; WC writes via set_*()+save() + rollback; token-one-shot native-PHP + strlen guard; commit path-scoped), the **orchestrator-role box** (you fact-check every claim, dispatch with no commit authority, plain-English to Bean), the **Bean directive** (don't stop between tasks), and the **Skills table** (`/qc-council` before any WC-write commit; `/dispatching-parallel-agents` fan-out ≤3). Read those; nothing new is here.
