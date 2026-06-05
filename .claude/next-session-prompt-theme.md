---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-05-theme-clusterC-COMPLETE-next-clusterD-or-first-shop
generated: 2026-06-05
primary_goal: "SGS-THEME THREAD. Spec 27 PHASE 2 + Spec 28 P1 value-ladder are SHIPPED + live-verified + Bean R-22-13 SIGNED OFF (D176/D177/D179 — all COMMITTED 535942f1/cd898a11). A 6-persona adversarial-council + a verifier-subagent fact-check (2026-06-05) then stress-tested the shipped Cluster C + Spec 28 P1 + docs and produced a FACT-CHECKED must-fix/should-fix/missing backlog (parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`; 2 council claims were REFUTED + excluded). FIRST JOB this session = PLAN an optimal haiku+sonnet subagent-driven WAVE-PLAN (via /strategic-plan→/phase-planner + /dispatching-parallel-agents) that clears the WHOLE parking backlog in a few file-disjoint waves, THEN EXECUTE it, THEN continue Spec 27/28 to 100% completion (EXCLUDING the cloning HTML-draft product page, which is the parallel cloning thread). The headline must-fixes: (1) the value-ladder shipped with NO authoring UI — add framingMode/decoyEnabled controls + a VALIDATED _sgs_base_price_pence field (savings are silent + the 'genuine single' is a legal-exposure box without it); (2) PREFLIGHT publish-block is INVISIBLE in the block editor (admin_notices don't render in Gutenberg) — add a PluginPrePublishPanel calling GET /preflight; (3) the £0 Store-API add-to-cart bypass (override woocommerce_is_purchasable); (4+5) two UK consumer-law items (validate the reference price; stop decoy mode calling a non-cheapest pack 'Best value'). Main inline agent = OPUS orchestrator: dispatch haiku for mechanical/enumerative + sonnet for code_gen (NO commit/deploy — return uncommitted; you review + live-verify + deploy + commit by EXPLICIT PATH), /qc-council before any WC-write commit, FACT-CHECK every subagent claim against live ground truth, plain-English to Bean (Problem→Effect→Solution + ranked menu + one recommendation)."
---

# Next Session — SGS THEME thread — Spec 27 P2 + Spec 28 P1 SHIPPED — next = plan + execute the council must-fix WAVE, then Spec 27/28 to 100%

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Spec 27 PHASE 1 SHIPPED (D165); PHASE 2 CLUSTER A (D171) + CLUSTER B SEO (D173) + CLUSTER C [R1 `f747e58a`, R2 `e62f337f`, R3+PREFLIGHT `dd9d0d7d`, preflight-fix+e2e `27e54132`] ALL SHIPPED + R-22-13 SIGNED OFF.** Do NOT re-touch shipped units. A parallel **Spec 28 P1** session + the **cloning Method-2** session are co-active on the SAME `main` — commit by EXPLICIT PATH only, `git log -1 --stat` after, never `git add -A`, leave the never-commit artefacts (`lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `product-card/style.css`, Spec-28's `decisions.md` + `spec28-p1-value-ladder.md`) untouched.
>
> **FIRST JOB (decisions ALREADY DONE — do NOT re-append):** D176 + D177 are committed (`535942f1`) and D179 (Spec 28 P1) is committed (`cd898a11`). Verify with `git log --oneline | grep -E '535942f1|cd898a11'`, then proceed. The real FIRST JOB = **PLAN the council must-fix WAVE-PLAN** (read parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE` — the FACT-CHECKED backlog of ~20 must/should/missing items), design optimal file-disjoint waves of haiku+sonnet subagents (via /strategic-plan→/phase-planner + /dispatching-parallel-agents), get Bean's sign-off on the wave shape, then EXECUTE. The 2 REFUTED council claims (unmanaged-stock cap; discount-label-as-code-bug) are NOT in the backlog — do not action them.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch Sonnet subagents for mechanical builds (NO commit/deploy authority — they return uncommitted; you review + live-verify + deploy + commit); run the /qc-council + /subagent-driven-development two-stage review; FACT-CHECK every subagent claim against live ground truth (read the file, grep the wiring, run the live one-shot, open the live page — a subagent's "done" is a HYPOTHESIS); keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) + a ranked menu + one recommendation.
>
> **Bean directive (2026-06-04, locked): in a multi-task batch, DON'T stop between tasks to ask permission — proceed task-to-task on passing+substantiated evidence; only stop for a genuine decision or a hard block.** Memory `dont-stop-between-tasks-in-a-batch`.

## STOP catalogue (anti-pattern defences — carried forward + EXTENDED; do NOT subtract)

> **STOP — a bare `git commit` flushes the WHOLE staged index, not just files you `git add`ed (NEW, session 16).** With co-active sessions on shared `main`, `git add <my paths>` does NOT scope the commit — a following bare `git commit` swept in 3 Spec-28 staged files under my message. ALWAYS `git commit -- <explicit paths>` (or check `git diff --cached --stat` + `git restore --staged <strays>` first). NEVER history-rewrite shared `main` to fix an over-broad commit. Memory `git-commit-must-be-path-scoped-with-coactive-sessions`.
> **STOP — green automated gates ≠ legally/operationally safe; a council's claim is a HYPOTHESIS (NEW, session 16).** The Spec 28 P1 ladder passed unit + live QA but a 6-persona adversarial-council + a verifier fact-check found: no authoring UI (savings dead by default), a fabricated-reference-price legal exposure, a "Best value"-on-a-non-cheapest-pack DMCC risk, and an invisible PREFLIGHT block. The fact-check also REFUTED 2 council claims — so ALWAYS fact-check council findings against real code before they drive a single fix (memory `feedback_council_validates_the_criterion_it_is_given`). Backlog: parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`.
> **STOP — pre-`wp-load` one-shot token gates must use NATIVE PHP ONLY (NEW, session 15).** A token-gated webroot runner checks `$_GET['t']` BEFORE `require wp-load.php`, so WP helpers (`wp_json_encode`/`wp_unslash`/`sanitize_text_field`) DO NOT EXIST yet — use raw `$_GET`, `hash_equals`, `json_encode`. `php -l` is syntax-only and does NOT catch the undefined-function fatal. Caught 3× this session.
> **STOP — token-swap placeholder guard must be a LENGTH check, never a literal `=== 'PLACEHOLDER'` (NEW, session 15).** Deploy swaps the token via `sed s/PLACEHOLDER/<token>/g`, which rewrites the comparison literal too → `'<token>' === SGS_X_TOKEN` is always true → permanent 503. Use `if ( strlen( SGS_X_TOKEN ) < 32 ) { 503 }` (also enforces ≥32-byte entropy). Caught 2×.
> **STOP — fact-check subagent WIRING + invented APIs against ground truth (NEW, session 15).** A Sonnet build "done" hid: R2 routes NOT wired into `sgs-blocks.php` (grep the `::register()` line); an invented `wc_register_attribute_taxonomies()`; a `plugin_dir_path(__DIR__)` path-doubling. `php -l` passes on all of these — only `grep sgs-blocks.php` + a LIVE run catch them. After any subagent build: grep the wiring, run the live one-shot, read the debug.log.
> **STOP — the configurator manifest/schema is PUBLISH-GATED (NEW, session 15).** `Product_Manifest::build()` returns empty combos for any product whose `post_status !== 'publish'`. So any readiness/JSON-LD check on a DRAFT (e.g. a pre-publish `GET /preflight`) must NOT treat empty JSON-LD as a blocker — PREFLIGHT Check-7 now gates on publish status. At the publish TRANSITION the status is already 'publish' (the hook fires post-DB-update), so the real gate still validates.
> **STOP — golden-master fairness: the "native" reference must derive slugs the SAME way the unit-under-test does (NEW, session 15).** WC's `wc_create_attribute`/`wc_sanitize_taxonomy_name` normalises an attribute name "Acctest Size" → slug `acctest-size` (hyphen via sanitize_title), NOT a hardcoded `acctest_size` (underscore). A mismatched reference produces a false diff. Build the native side from the NAME, not a hand-picked slug.
> **STOP — manifest growth can trip the product-card 24 KB context cap (D173).** Adding server-only fields to `Product_Manifest` bloats the seed the card writes into `data-wp-context`; the 48-SKU fixture went 23→31.8 KB → DROPPED the interactive configurator to the static "From" card (`type="radio"` 16→0). Keep the FULL manifest server-side; render.php seeds a LEAN subset (`unset` schema-only keys + drop <2-image galleries). VERIFY the rendered DOM (`type="radio"` count), not just valid JSON. Memory `manifest-growth-can-trip-capped-client-seed`.
> **STOP — verify a FEATURE FLAG before calling a missing side-effect a defect (D173).** R1's `wc_product_attributes_lookup` stayed 0 rows — NOT a bug: `woocommerce_attribute_lookup_enabled='no'`, so native WC also skips it. One `get_option()` probe settles it. Memory `verify-feature-flag-before-asserting-defect`.
> **STOP — a cross-model rater's "ERROR" can contradict the LOCKED spec (D173).** Re-derive any rater finding against the spec + Google's actual rules before acting (memory `feedback_council_validates_the_criterion_it_is_given`).
> **STOP — R1/R2 are COOKIE-AUTH (D173).** The authoring controllers require `X-WP-Nonce` (cookie CSRF); app-password/Basic REST fails the nonce gate (correct for the block-editor UI use case). R3's authoring UI calls them from a logged-in admin context with `wp_create_nonce('wp_rest')`.
> **STOP — WC variable-product writes go through `set_*()`+`save()`, NEVER raw postmeta (D173).** The raw-postmeta seed left `wc_product_attributes_lookup` empty; the data-store path produces byte-identical output + triggers lookup sync. The ONLY permitted `update_post_meta` is SGS bookkeeping (`_sgs_variation_upsert_key`), never commerce data.
> **STOP — WC batch is NOT transactional (R2 rollback, FR-27-R2 — SHIPPED).** A cartesian generate that fails midway leaves orphan variations + a corrupt product. R2 tracks every created id (ledger) + parent snapshot, deletes-on-failure + restores; UI shows created-vs-failed. PROVEN: injected failure → 0 orphans. Any future bulk WC-write must keep this discipline.
> **STOP — provisioning a shared `pa_*` taxonomy must not break siblings (R2 — SHIPPED).** Provisioning only ADDS terms; parent attributes are MERGED by union, never replaced (a re-run with fewer attributes must not orphan an existing attribute's variations). Rollback deletes a created term ONLY if it has zero object-relationships, a created taxonomy ONLY if zero terms. PROVEN: shared-subset add → sibling unchanged.
> **STOP — PREFLIGHT is a HARD block (SEC-5 — SHIPPED).** A £0/no-image/draft/over-24KB-cap/no-valid-variesBy product is un-publishable via `transition_post_status` (revert to draft + `_sgs_preflight_issues` meta + admin notice), AND the cart-proxy independently rejects a £0 add (422 `sgs_price_not_set`) + the `woocommerce_add_to_cart_validation` filter covers the Store-API path. Re-entrancy guard (static flag + remove/add_action) on the revert.
> **STOP — authoring is UN-GATED: every presentation/config field ships WITH a friendly editor control (R3 — SHIPPED), NEVER raw-meta editing.** R3 writes the Step-0 `Configurator_Meta` keys through the term/variation screens + the variesBy `<select>`. Zero-raw-meta proven by the e2e gate.
> **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change (D168).** A `view.js` change has NO browser effect until its `build/blocks/<block>/view.asset.php` (the `?ver` carrier) is ALSO deployed. scp the WHOLE block set, opcache-reset, verify the served `?ver`. Memory `deploy-asset-php-with-viewscriptmodule`.
> **STOP — WP reads each block's `style.css`, NOT `style-index.css` (D171).** Deploy `style.css` (+ `style-rtl.css`) for any block-CSS change. Memory `wp-reads-block-style-css-not-style-index`.
> **STOP — WP Interactivity does NOT bind `data-wp-on` on imperatively-injected DOM nodes (D171).** Use EVENT DELEGATION on a stable ancestor. Memory `interactivity-no-bind-on-injected-nodes`.
> **STOP — green automated gates ≠ design-complete (D165).** axe-0/tests passing ≠ visually correct. Self-review with `/ui-ux-pro-max` + chrome-devtools 3-breakpoint AND expect Bean's eye (R-22-13) to surface more. Memory `ship-gate-needs-human-eye-not-just-automated-gates`.
> **STOP — run the ESCAPE-AUDIT before committing any new data→HTML/REST path (D171).** Build a [value → source → sanitise-at-save → escape-at-render → output context] table; /qc-council it.
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
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`/`wp post update`) → token-gated webroot one-shot PHP runner (require wp-load + secret `$_GET['t']`, curl, rm). `POST /wp/v2/pages` is NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`. NB the Git-Bash drive-letter quirk: `cd /c/Users/...` works, `cd c:/Users/...` + relative `secrets/` writes can fail — use the working form.
> **STOP — fact-check every security/QC-rater "blocker" against the ACTUAL threat model** (an authenticated authoring controller is a write path — be STRICT; a public-read shop endpoint is not). Memory `feedback_council_validates_the_criterion_it_is_given`.
> **Guardrail (all tasks):** after every change open the canary + run the live one-shot, verify zero console errors + correct live values BEFORE considering the task done. Surgical deploy: build via PowerShell → scp `build/blocks/<block>/*` (incl `*.asset.php` + `style.css`) + changed `includes/*.php` → opcache-reset. PHP/JS-only → `git commit --no-verify`.

## State recap (plain English)
**Spec 27 is functionally COMPLETE.** A first client shop is now: sellable (secure cart proxy + the live 48-SKU pill-swap configurator, 0-XHR variant swap), discoverable (valid Google `ProductGroup` rich-results — verified live: AggregateOffer 48 offers £9.99–£59.99, per-variant offers + OOS, variesBy=size, BreadcrumbList), and **client-authorable** end-to-end with ZERO raw fields/WP-CLI: a non-coder PROVISIONS attributes+terms and GENERATES the full variation grid (R2, with a transactional rollback so a half-finished build never corrupts a product), edits swatches/galleries/labels/variesBy through normal WP screens (R3), and CANNOT publish a £0/no-image/broken product (PREFLIGHT hard gate + cart £0 guard). Cluster C was built by Sonnet implementers under Opus orchestration, cross-model reviewed, and PROVEN on the canary via 4 token-gated acceptance one-shots (golden-master byte-identity, 0-orphan rollback, sibling-safety, hard publish-block, full authoring journey). Bean signed off (R-22-13) after seeing the live page + JSON-LD.

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD on `main` at/after `cd898a11`. **Decisions are DONE — D176/D177 (`535942f1`) + D179 Spec 28 P1 (`cd898a11`) are committed; do NOT re-append.** Read parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE` (the FACT-CHECKED ~20-item backlog) end-to-end. Then open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` and confirm the configurator + value-ladder still render (16 pills + per-pack ladder + price). **D-NUMBER CONTENTION: three threads (theme/cloning/Spec-28) share one decisions.md — VERIFY the live max D-number with `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` before assigning a new one; commit decisions by `git commit -- <path>` only.**

## Mandatory READING (read these 3 before the wave; everything else is at-point-of-use)
1. This prompt's **STOP catalogue + State recap** (above) + **`.claude/handoff-theme.md` session-16** (top) — what shipped + the council/fact-check + new lessons.
2. **parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`** — the wave backlog (the operative work; it cites every must-fix's source file:line, so read the named source file at the point you action each item, NOT all up-front).
3. The Spec 28 P1 plan `.claude/plans/2026-06-04-spec28-p1-value-ladder.md` ONLY for the value-ladder cluster (Wave 2 touches the same files; its PD-1..PD-15 decisions + KJC-A/B are the design constraints). Skip if not on Wave 2 yet.

**At-point-of-use (do NOT read up-front — read when you reach that work):**
- PHASE 2 only: Spec 27 §FR-27-R4 / §FR-27-F2 (R4 slug-templates + F2 feed, ~lines 513/528) + Spec 28 §P2/P3 — when you START Phase 2, not before.
- The deferred first-shop draft (`sites/mamas-munches/…`) belongs to the cloning thread; do NOT read it for this thread's work.

## What's next — the council must-fix WAVE-PLAN, then Spec 27/28 to 100% (Bean directive 2026-06-05)

**PHASE 1 (this session's FIRST work) — clear the adversarial-council backlog in a few subagent waves.** The full FACT-CHECKED backlog is parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE` (~20 must/should/missing items; 2 refuted claims excluded). **PLAN it properly first** (`/strategic-plan`→`/phase-planner`), get Bean's sign-off on the wave shape, then execute with `/dispatching-parallel-agents` + `/subagent-driven-development`. Model routing per item: **haiku** for mechanical/enumerative (file-splits #17, message/TTL tweaks #15/#16, the OPTIONS-gate #8, the 403 #7, the placeholder check #11); **sonnet** for code_gen (the £0 `is_purchasable` override #3, rate-limit-by-variation #6, rollback-check #12, the legal validation #4/#5/#14, the cron #10); **opus inline** only for the value-ladder authoring-UI design (#1) + the legal anchor-validation design (#4) + the PREFLIGHT-in-Gutenberg approach (#2).

**Suggested wave grouping (refine in planning — the rule is FILE-DISJOINT per wave, ≤3-4 heavy agents at once, /qc-council before any WC-write commit):**
- **Wave 1 (parallel, disjoint files):** (A) `class-cart-proxy.php` £0 `is_purchasable` override (#3, sonnet); (B) `class-product-provisioning*.php`+`-security.php` (#6/#7/#8/#12, sonnet); (C) `class-configurator-edit-safety.php` (#15/#16, haiku); (D) `class-product-preflight.php` non-UI (#10 cron/#11 placeholder, haiku); (E) a Jest/PHP lean-seed ≤24KB size-assert test (#18, haiku).
- **Wave 2 (the value-ladder cluster — SHARED files render.php/render-helpers.php/edit.js/block.json/class-configurator-meta.php → SINGLE coordinated implementer, sequenced):** the authoring UI (#1: framingMode SelectControl + decoyEnabled ToggleControl + a VALIDATED `_sgs_base_price_pence` field), the legal fixes (#4 reference-price validation + #5 decoy non-superlative badge + #14 label word-deny-list), termLabel axis-pick (#9), the sale-tail denominator (#13), the VAT-basis guard (#20), the claim audit-trail (#19). Opus designs #1/#4/#2; sonnet builds. LIVE-VERIFY on canary 540 (set `_sgs_base_price_pence` via a token one-shot to exercise the savings path; restore after) + re-run axe (the saving-text contrast already needed a live fix once).
- **Wave 3:** PREFLIGHT block-editor visibility (#2 — a `PluginPrePublishPanel` JS calling `GET /preflight` + auto-set variesBy at provisioning) — touches edit.js + provisioning; sequence after Wave 2's edit.js work. Then file-cohesion split (#17 render-helpers → colour/configurator-pricing/value-ladder/svg-kses) LAST (it moves functions the other waves edit).

**PHASE 2 — Spec 27/28 to 100% (after the backlog is clear; EXCLUDING the cloning HTML-draft product page — that's the parallel cloning thread):**
- **R4 (agency slug-templates) + F2 (FAQPage / llms.txt / llms-full.txt / Merchant feed)** — bounded, testable on the canary 48-SKU fixture (540/589), complete Spec 27. (Read Spec 27 §FR-27-R4/§FR-27-F2.)
- **Spec 28 P2/P3** (preview-only engine + the `_sgs_base_price_pence` authoring cascade) — P3 partly overlaps Wave-2 #1, so reconcile. **P4 WC-write stays deferred** (the spec's anti-stall gate; Cluster C IS done so it's technically unblocked but is NOT the priority).
- **R5 (AI-builder) STAYS GATED** (the OC-Protector stall trap; design its untrusted-LLM safety model via `/brainstorming` but do NOT build before a real shop validates the stack).

**STRATEGIC NOTE (council Ship-PM, carried):** the real FIRST-SHOP blocker is the CONVERTER (cloning D178 — typography/grid/hero don't lift faithfully), which runs in the PARALLEL cloning session. The theme thread's value here is to make the shipped shop layer correct + safe (the wave) and complete the spec — NOT to out-run the converter. Do NOT pull Spec 28 P4 forward ahead of the converter.

Research the gold standard before recommending (Rule 16): for the legal fixes, current DMCC 2024 / CPRs / ASA price-comparison rules; for R4/F2, current Merchant-feed + llms.txt conventions.

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

## Done — do NOT redo
- Spec 27 Phase 1 (D165) + Phase 2 Cluster A (D171) + Cluster B SEO (D173) + **Cluster C: R1 `f747e58a`, R2 `e62f337f`, R3+PREFLIGHT `dd9d0d7d`, preflight-fix+e2e `27e54132`** — ALL SHIPPED, live-verified, R-22-13 signed. Image-sitemap DESCOPED (Bean, D173).

## Methodology guardrails (do not skip)
- **You are the orchestrator; fact-check every subagent claim** against live ground truth (read file + grep wiring + run the live one-shot + open the live page). `php -l` does NOT catch un-wired routes, undefined functions, or path bugs.
- **WC writes via `set_*()`+`save()`, NEVER raw postmeta.** Transactional rollback on any non-transactional WC batch.
- **/subagent-driven-development two-stage review + /qc-council BEFORE every commit** touching a WC-write path (blub.db 255).
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; you review + live-verify + deploy + commit by explicit path. Fan out ≤3 concurrent.
- **In a batch, don't stop between tasks to ask** — proceed on passing+substantiated evidence; only stop for a real decision/hard-block.
- **Token-gated acceptance one-shots: native PHP before wp-load; strlen<32 token guard; rm the server copy after running (it carries a real token).**
- **Communicate in plain English** (Problem→Effect→Solution; ranked menu + one recommendation).
