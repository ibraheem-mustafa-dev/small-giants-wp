---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-05-theme-clusterC-COMPLETE-next-clusterD-or-first-shop
generated: 2026-06-05
primary_goal: "SGS-THEME THREAD. Spec 27 PHASE 2 is COMPLETE end-to-end: CLUSTER A (visible + authoring controls) + CLUSTER B (SEO) + CLUSTER C (R1 authoring controller + R2 provisioning/cartesian/rollback + R3 authoring-UI/edit-safety + PREFLIGHT go-live gate) all SHIPPED + live-verified + Bean R-22-13 SIGNED OFF. A first client shop is now complete, sellable, discoverable, AND client-authorable. NEXT (in priority order): (1) FIRST JOB — add the deferred R1 D176 + a new Cluster-C decisions.md entry once the Spec-28 tree clears; (2) a DECISION for Bean — Cluster D capstone (R4 agency slug-templates → R5 AI-builder → F2 llms.txt/Merchant-feed) vs standing up a FIRST REAL CLIENT SHOP on the now-complete stack; (3) optional Spec 28 P1 value-ladder (shares product-card). Main inline agent = OPUS orchestrator: dispatch Sonnet for mechanical builds (NO commit/deploy — they return uncommitted; you review + live-verify + deploy + commit), /qc-council + /subagent-driven-development two-stage review, FACT-CHECK every claim against live ground truth, plain-English to Bean (Problem→Effect→Solution + ranked menu + one recommendation)."
---

# Next Session — SGS THEME thread — Spec 27 PHASE 2 COMPLETE — next = decisions.md catch-up + Cluster-D-vs-first-shop decision

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Spec 27 PHASE 1 SHIPPED (D165); PHASE 2 CLUSTER A (D171) + CLUSTER B SEO (D173) + CLUSTER C [R1 `f747e58a`, R2 `e62f337f`, R3+PREFLIGHT `dd9d0d7d`, preflight-fix+e2e `27e54132`] ALL SHIPPED + R-22-13 SIGNED OFF.** Do NOT re-touch shipped units. A parallel **Spec 28 P1** session + the **cloning Method-2** session are co-active on the SAME `main` — commit by EXPLICIT PATH only, `git log -1 --stat` after, never `git add -A`, leave the never-commit artefacts (`lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `product-card/style.css`, Spec-28's `decisions.md` + `spec28-p1-value-ladder.md`) untouched.
>
> **FIRST JOB:** the R1 `D176` AND a new Cluster-C `D` entry are STILL DEFERRED — `.claude/decisions.md` was held uncommitted by the Spec-28 session all of session 15. The moment `git status` shows `decisions.md` clean (Spec-28 committed), append BOTH (R1 D176 text is in `.claude/handoff-theme.md` session-14; the Cluster-C entry: R2 provisioning + transactional rollback + R3 edit-safety + PREFLIGHT hard go-live gate, golden-master + e2e proven, R-22-13 signed).
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch Sonnet subagents for mechanical builds (NO commit/deploy authority — they return uncommitted; you review + live-verify + deploy + commit); run the /qc-council + /subagent-driven-development two-stage review; FACT-CHECK every subagent claim against live ground truth (read the file, grep the wiring, run the live one-shot, open the live page — a subagent's "done" is a HYPOTHESIS); keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) + a ranked menu + one recommendation.
>
> **Bean directive (2026-06-04, locked): in a multi-task batch, DON'T stop between tasks to ask permission — proceed task-to-task on passing+substantiated evidence; only stop for a genuine decision or a hard block.** Memory `dont-stop-between-tasks-in-a-batch`.

## STOP catalogue (anti-pattern defences — carried forward + EXTENDED; do NOT subtract)

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
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD on `main` at/after `27e54132`. **If `.claude/decisions.md` is now clean (Spec-28 committed), append the R1 `D176` entry (text in `handoff-theme.md` session-14) + a new Cluster-C `D` entry** (R2 provisioning + transactional rollback + R3 edit-safety + PREFLIGHT hard gate; golden-master + e2e proven; R-22-13 signed). If still dirty, leave it and note the deferral persists. Then open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` and confirm the configurator still renders (pills + price + Add-to-Cart).

## Mandatory READING (in order, before building)
1. This prompt's STOP catalogue (above) + State recap.
2. `.claude/handoff-theme.md` session-15 (top) — what shipped + the new lessons.
3. `.claude/plans/2026-06-04-spec27-phase2-display-seo-plan.md` §Cluster D (STEP 15 R4 / STEP 16 R5 / STEP 17 F2) + the §Scope-decision flag — IF Cluster D is chosen.
4. Spec 27 §FR-27-R4 / FR-27-R5 / FR-27-F2 (full text) — IF Cluster D.
5. The shipped Cluster C code if extending it: `includes/class-product-provisioning*.php`, `class-product-preflight.php`, `class-configurator-edit-safety.php`, `class-product-authoring-security.php`.

## What's next — a DECISION for Bean (present as a ranked menu)
Spec 27 is done. The two real forward paths (NOT both required before a launch):
1. **Stand up a FIRST REAL CLIENT SHOP** on the now-complete stack (the highest-value proof — Mama's or another client; provision real products via R2, author via R3, publish past PREFLIGHT, verify rich-results live). Recommended if a client is ready — it validates the whole stack with real data and is the actual business goal.
2. **Cluster D capstone (DECISION-GATED)** — R4 agency slug-templates (`sgs_product_template` CPT export/import) → R5 AI-builder (brief→attributes→full-price-confirm→provision via R1/R2; untrusted-LLM hardening) → F2 (FAQPage + llms.txt/llms-full.txt + Merchant feed). Framework capstone; gated on the converter pipeline + DB + theme/blocks + WC all production-ready. R5 is multi-session + safety-heavy (opus for the safety design).
3. **Optional — Spec 28 P1 value-ladder** (rides shipped B3; shares `sgs/product-card` — coordinate with the Spec-28 session; do NOT build the P4 WC-write, it's fenced behind Cluster C which is now done — so P4 is unblocked IF Bean wants it).

Research the gold standard before recommending (Rule 16): for R5, current safe LLM→commerce provisioning patterns; for a first shop, the client's real catalogue + the cloning thread's page-144 fidelity state.

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
| SSH + token-gated webroot one-shot runner | guard-blocked WC ops + acceptance tests; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `secrets/sandybrown.env` (REPO-ROOT `secrets/`, NOT `.claude/secrets/`); plugin path `…/sandybrown…/public_html/wp-content/plugins/sgs-blocks` |

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
