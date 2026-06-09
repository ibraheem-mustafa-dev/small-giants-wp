---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-09-theme-17-P2-P3-visualpass-COMPLETE-next-R4-F2
generated: 2026-06-09
primary_goal: "SGS-THEME THREAD. Council backlog 100% CLOSED (#17 shipped D196) + Spec 27 v6 research corrections (D197) + Spec 28 P2 engine (D198) + P3 preview-only authoring (D199) + a Bean-requested 3-rater VISUAL qc-council pass on the P3 admin UI (D200 — caught 2 browser-only functional bugs + 12 findings, all fixed + live-verified). ALL on main through 187c2643. THIS SESSION = the last two Spec 27 units: R4 (agency slug-templates, §FR-27-R4) then F2 (FAQ block + llms.txt + Merchant feed, §FR-27-F2 v6 — build FROM the research pack .claude/reports/2026-06-09-f2-gold-standard-research.md; speakable is DESCOPED; FAQ copy must never claim Google rich results, enforced by the done-when grep gate). Opus orchestrator: dispatch sonnet (no commit/deploy authority), fact-check every claim against live ground truth, /qc-council before any WC-write/SEO-emit commit, plain English to Bean. P4 WC-write + R5 AI-builder STAY GATED."
---

# Next Session — SGS THEME thread — #17 + P2 + P3 + visual pass SHIPPED — next = R4 (slug-templates), then F2 (feeds)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Council backlog 100% closed; Spec 28 P1+P2+P3 shipped (only P4 remains, GATED); Spec 27 needs only R4 + F2 (D196–D200, commits `b273db02`/`21108cfe`/`bf769cee`/`aa599097`/`84899c2c`/`187c2643`).** Do NOT re-touch shipped units. **The cloning thread is co-active and SWITCHED THE SHARED TREE to `feat/stage1-converter-core` mid-session-18** — run `git branch --show-current` BEFORE EVERY COMMIT; if the tree is on their branch, commit via a TEMP WORKTREE on main (`git worktree add C:/tmp/sgs-<x> main` → edit/cherry-pick there → push → `git worktree remove`); NEVER touch their branch ref (the stray duplicate `343d6605` on their tip auto-drops on rebase — leave it). Path-scope every commit (`git commit -- <paths>`), never `git add -A`, leave never-commit artefacts (lucide-icons.php, sgs-framework.db, theme-snapshot.json, phase4 reports, hero/product-card style.css) untouched.
>
> **FIRST JOB:** `git log origin/main --oneline -12` + `git branch --show-current` (the shared tree may still be on their branch — that's FINE, work via worktree); open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` (16 pills + ladder) and the admin `wp-admin/admin.php?page=wc-settings&tab=sgs_pack_pricing` (the SGS Smart Bulk Pricing tab MUST render — it was the session-18 admin-lazy bug). Then start **Task 1 (R4)**. **D-NUMBER CONTENTION:** verify live max with `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (currently D200) before assigning.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch sonnet subagents for mechanical builds (NO commit/deploy authority — they return uncommitted; you review + live-verify + deploy + commit); run /qc-council + /subagent-driven-development; FACT-CHECK every subagent claim against live ground truth (read the file, grep the wiring, run the live one-shot, open the live page — a subagent's "done" is a HYPOTHESIS; session-18 proof: P3 arrived complete but UNWIRED, and a security rater's literal nonce string was WRONG vs live WC source); keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) + a ranked menu + one recommendation.
>
> **Bean directive (2026-06-04, locked): in a multi-task batch, DON'T stop between tasks to ask permission — proceed task-to-task on passing+substantiated evidence; only stop for a genuine decision or a hard block.** Memory `dont-stop-between-tasks-in-a-batch`.

## STOP catalogue (anti-pattern defences — carried forward + EXTENDED; do NOT subtract)

> **STOP — a file-scope `extends \WC_*` class is a DOUBLE timing trap (NEW, session 18).** (a) Requiring it before WooCommerce loads FATALS the whole site (sgs-blocks loads alphabetically BEFORE woocommerce; the parent resolves at parse time) — lazy-require it. (b) The lazy guard itself can be TOO EARLY: `WC_Settings_Page` is admin-LAZY and does NOT exist at `woocommerce_loaded`, so a `class_exists` early-return there silently unregisters the feature. Guard + require at the CONSUMER hook (`woocommerce_get_settings_pages`), where WC guarantees the parent exists; ALSO put a parse-time `class_exists` guard (file-scope `return`) in the class file itself. After any bootstrap-wiring deploy: curl the FRONT page first; on fatal, redeploy HEAD's bootstrap (new files become inert), root-cause from debug.log. Memory `file-scope-wc-class-extends-must-load-lazily`. D199/D200.
> **STOP — inline admin JS attached to a head-printed handle never binds without a DOM-ready guard (NEW, session 18).** `woocommerce_admin` prints in the page HEAD — an IIFE's `if(!btn)return;` runs before the button exists and silently no-binds (no console error). Wrap in a readyState-guarded init. A present `<script>` is not proof it RAN against the DOM — click-test it live.
> **STOP — the shared tree's BRANCH can change under you mid-session (NEW, session 18).** The cloning thread checked out `feat/stage1-converter-core`; a theme commit landed on their tip. `git branch --show-current` before EVERY commit; recover via temp worktree on main + cherry-pick; NEVER move/reset/merge their branch ref. Extends memory `git-commit-must-be-path-scoped-with-coactive-sessions`.
> **STOP — REST/one-shot gates CANNOT see admin-surface defects; a visual pass is MANDATORY for any admin UI (NEW, session 18).** Session-18's preview endpoint passed every server-side gate while the settings tab didn't exist and the preview button was dead. Drive the real admin (chrome-devtools — Playwright is usually HELD by the co-active session) + 3 adversarial raters (operator-empathy / design-WCAG-computed-ratios / consistency) on screenshots. Also: JSON is a DATA channel — esc_html in REST responses surfaces literal entities once the JS renders via textContent; escape-at-render owns escaping (createElement/textContent ONLY, never innerHTML with server data).
> **STOP — a guard on ONE write path is NOT a guard (session 17).** A validation/audit guard that lives only in one code path (e.g. the WC save hook) is bypassed by every OTHER path to the data. `_sgs_base_price_pence` was `show_in_rest:true`, so a REST meta write stored it bypassing the #4 legal floor-check AND the #19 DMCC audit (verified live). FIX = close unneeded doors: `show_in_rest:false` on PHP-authored metas, NOT duplicate the validation. A meta read as a security/legal gate uses STRICT `'1' === (string)$v`, never a `(bool)` cast. Enumerate EVERY path (REST meta, update_post_meta, WP-CLI, classic save, block editor) before trusting a guard. Memory `guard-on-one-path-is-not-a-guard`.
> **STOP — a duplicated calculation DRIFTS silently (session 17).** The lean-seed strip was hand-copied in 3 places; PREFLIGHT's copy drifted → a FALSE `manifest_over_cap` publish-block that reverted the valid 48-SKU fixture to DRAFT. CENTRALISED in #17 (D196): `includes/configurator-seed.php` `sgs_lean_seed_combos()` is THE single source — any new server-only manifest field gets stripped THERE, never inline. Memory `duplicated-calculation-drifts`.
> **STOP — WC products edit in the CLASSIC screen, not Gutenberg (session 17).** `use_block_editor_for_post_type('product')` is FALSE on this stack, so a Gutenberg `PluginPrePublishPanel` will NEVER render for a product. Surface product-edit notices via persisted meta + an `admin_notices` reader (the publish-block revert runs in a redirecting POST, so any notice queued in-request is lost). Probe the real editor flow before building any editor-surface feature.
> **STOP — the Gemini cross-rater is ACCOUNT-BLOCKED (session 17).** The gemini CLI returns 403 "Lightning dunning decision is deny for project" (billing). Use a haiku subagent as the second model family for the cross-family `/qc-council` rater (sonnet + haiku + inline).
> **STOP — a bare `git commit` flushes the WHOLE staged index, not just files you `git add`ed (session 16).** With co-active sessions, `git add <my paths>` does NOT scope the commit. ALWAYS `git commit -- <explicit paths>` (or check `git diff --cached --stat` + `git restore --staged <strays>` first). NEVER history-rewrite shared branches. Memory `git-commit-must-be-path-scoped-with-coactive-sessions`.
> **STOP — passing automated gates ≠ DONE (design + operational + legal).** axe-0 / unit / live-QA green does NOT mean visually correct, usably-authored, or legally safe. Self-review with `/ui-ux-pro-max` + chrome-devtools 3-breakpoint, expect Bean's eye (R-22-13) to catch more, AND adversarial-council + fact-check anything consumer-facing. Spec 28 P1 passed unit+live QA yet a council found 4 launch blockers; session-18's P3 passed every server gate with a dead button and a missing tab. Memory `ship-gate-needs-human-eye-not-just-automated-gates` (D165 + session-16 + session-18).
> **STOP — pre-`wp-load` one-shot token gates must use NATIVE PHP ONLY (session 15).** A token-gated webroot runner checks `$_GET['t']` BEFORE `require wp-load.php`, so WP helpers DO NOT EXIST yet — use raw `$_GET`, `hash_equals`, `json_encode`. `php -l` is syntax-only and does NOT catch the undefined-function fatal. Caught 3×.
> **STOP — token-swap placeholder guard must be a LENGTH check, never a literal `=== 'PLACEHOLDER'` (session 15).** Deploy swaps the token via `sed`, which rewrites the comparison literal too → always-true → permanent 503. Use `if ( strlen( SGS_X_TOKEN ) < 32 ) { 503 }`. Caught 2×.
> **STOP — fact-check subagent WIRING + invented APIs against ground truth (session 15).** A Sonnet build "done" hid: routes NOT wired into `sgs-blocks.php` (grep the `::register()` line); an invented `wc_register_attribute_taxonomies()`; a path-doubling. `php -l` passes on all of these. After any subagent build: grep the wiring, run the live one-shot, read the debug.log. Session-18 re-proof: P3 arrived UNWIRED; a security rater's nonce action string was WRONG vs live WC source (`woocommerce_save_data`, not `woocommerce_save_product`).
> **STOP — the configurator manifest/schema is PUBLISH-GATED (session 15).** `Product_Manifest::build()` returns empty combos for any product whose `post_status !== 'publish'` — a readiness/JSON-LD check on a DRAFT must NOT treat empty JSON-LD as a blocker (PREFLIGHT Check-7 gates on publish status).
> **STOP — golden-master fairness: the "native" reference must derive slugs the SAME way the unit-under-test does (session 15).** WC normalises "Acctest Size" → `acctest-size` (hyphen), NOT a hardcoded `acctest_size`. Build the native side from the NAME, not a hand-picked slug.
> **STOP — manifest growth can trip the product-card 24 KB context cap (D173).** Keep the FULL manifest server-side; render.php seeds the LEAN subset via `sgs_lean_seed_combos()` (post-D196 single source). VERIFY the rendered DOM (`type="radio"` count = 16 on canary 540), not just valid JSON. Memory `manifest-growth-can-trip-capped-client-seed`.
> **STOP — verify a FEATURE FLAG before calling a missing side-effect a defect (D173).** `woocommerce_attribute_lookup_enabled='no'` made a lookup no-op CORRECT. One `get_option()` probe settles it. Memory `verify-feature-flag-before-asserting-defect`.
> **STOP — a rater/council finding is a HYPOTHESIS, not a fact — fact-check it before it drives a single fix.** Re-derive every claim against (a) the real code, (b) the LOCKED spec + the actual rules (Google/DMCC/CPRs), (c) the ACTUAL threat model. Session-16: 2 council claims REFUTED; session-18: a rater's literal fix string was wrong. Memory `feedback_council_validates_the_criterion_it_is_given`.
> **STOP — R1/R2 are COOKIE-AUTH (D173).** The authoring controllers require `X-WP-Nonce` (cookie CSRF); app-password/Basic REST fails the nonce gate (correct for the block-editor use case). R4's endpoints follow the same pattern.
> **STOP — WC variable-product writes go through `set_*()`+`save()`, NEVER raw postmeta (D173).** The ONLY permitted `update_post_meta` is SGS bookkeeping (`_sgs_variation_upsert_key`, pack-pricing config metas), never commerce data.
> **STOP — WC batch is NOT transactional (R2 — SHIPPED).** R2 tracks every created id (ledger) + parent snapshot, deletes-on-failure + restores. Any future bulk WC-write (R4 apply!) must keep this discipline — R4 applies templates VIA R2, never via its own write path.
> **STOP — provisioning a shared `pa_*` taxonomy must not break siblings (R2 — SHIPPED).** Provisioning only ADDS terms; parent attributes MERGED by union; rollback deletes a created term ONLY at zero object-relationships, a created taxonomy ONLY at zero terms.
> **STOP — PREFLIGHT is a HARD block (SEC-5 — SHIPPED).** A £0/no-image/draft/over-cap/no-variesBy product is un-publishable via `transition_post_status`; the cart-proxy independently 422s a £0 add; `woocommerce_is_purchasable` (now in `Cart_Limits`, D196) covers the Store-API path.
> **STOP — authoring is UN-GATED: every presentation/config field ships WITH a friendly editor control, NEVER raw-meta editing (R3 — SHIPPED).** Zero-raw-meta proven by the e2e gate; P3 extended this to pack-pricing config.
> **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change (D168).** A `view.js` change has NO browser effect until its `view.asset.php` (the `?ver` carrier) ships too. scp the WHOLE block set, opcache-reset, verify the served `?ver`. Memory `deploy-asset-php-with-viewscriptmodule`.
> **STOP — WP reads each block's `style.css`, NOT `style-index.css` (D171).** Deploy `style.css` (+ rtl) for any block-CSS change. Memory `wp-reads-block-style-css-not-style-index`.
> **STOP — WP Interactivity does NOT bind `data-wp-on` on imperatively-injected DOM nodes (D171).** Use EVENT DELEGATION on a stable ancestor.
> **STOP — run the ESCAPE-AUDIT before committing any new data→HTML/REST path (D171).** Build a [value → source → sanitise-at-save → escape-at-render → output context] table; /qc-council it. Session-18 nuance: JSON responses are DATA — escape at the DOM-render layer (textContent), not in the JSON payload.
> **STOP — SSR==swap parity (D168).** Any display string PHP computes server-side AND view.js recomputes on swap MUST be byte-identical — seed the literal into context; never re-derive in JS. A directive bound to a JS-only getter resolves empty + WIPES the SSR value. Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`.
> **STOP — WP Interactivity `data-wp-on--<event>` silently will NOT bind a custom event name containing a COLON.** Bridge via `data-wp-init` + a captured-context `addEventListener`. Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`.
> **STOP — schema/OG price ALWAYS inc-VAT + from the MANIFEST (SEC-1/SEC-2).** Never re-read WC for price in the schema/OG path; the CI grep asserts zero `wc_get_price_to_display`/`get_children` in `class-product-schema.php`. **The F2 Merchant feed MUST read prices from the same manifest** — feed↔page↔schema mismatch is the #1 GMC rejection cause (research pack).
> **STOP — canonical: never `add_query_arg`, never `$_GET` (SEC-7).** Build variation URLs from the variation's own server-side `get_attributes()`, validate each `?attribute_*` key/value. F2's feed `g:link` uses these SEC-7 deep-link URLs (parent-URL variant links = GMC policy violation).
> **STOP — detect-and-defer if Yoast/RankMath active (SEC-9).** OG/canonical/sitemap defer to an SEO plugin; only the variant JSON-LD stays. F2's llms.txt/feed must probe for SEO-plugin equivalents first.
> **STOP — scope shared-block changes to the variant the gated surface doesn't use.** `sgs/product-card` renders page-144 Typed clones AND is shared with cloning WS-4 + Spec-28; build against the Bound (`wc-product`) branch + `.product-card--bound`-scoped CSS; option-picker changes ADDITIVE.
> **STOP — don't assert block/WC capability from a partial dump:** read `block.json` + `render.php` + `/wp-blocks` + the live WC object before building on top.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / live DOM / live one-shot) BEFORE dispatching a fix.
> **STOP — verify against git, not the handoff:** run `git log origin/main --oneline -10` + `git branch --show-current` first; cloning + theme threads share the repo AND the tree's branch can have moved (session 18).
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk** (Spec 26 / FR-26-D2). Memory `canary-live-styles-come-from-wp-global-styles-post`.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`/`wp post update`) → token-gated webroot one-shot PHP runner (require wp-load + secret `$_GET['t']`, curl, rm). `POST /wp/v2/pages` is NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`. NB Git-Bash drive-letter quirk: `cd /c/Users/...` works; `cd c:/Users/...` + relative writes can fail.
> **Guardrail (all tasks):** after every change open the canary + run the live one-shot, verify zero console errors + correct live values BEFORE considering the task done. Surgical deploy: build via PowerShell → scp changed `includes/*.php` (+ the WHOLE block set for any block change) → opcache-reset. PHP/JS-only → `git commit --no-verify` (the visual-diff gate's own stated rule).

## State recap (plain English)
**The shop layer is COMPLETE except two Spec 27 units.** The adversarial-council backlog is 100% closed (#17 = D196: one canonical lean-seed stripper + the two oversized files split, canary byte-identical). Spec 28: P1 ladder + P2 engine (53/53 fixture-exact) + P3 preview-only authoring (3 surfaces + cascade + REST preview; zero WC writes proven; security-hardened; visually QC'd by 3 raters with 14 fixes, D200) are ALL live on the canary; only P4 (the actual write-prices-to-shop apply) remains and is deliberately GATED. Spec 27 (v6): only **R4** (export/import product templates → fresh client install gets a working configurator) and **F2** (FAQ block + llms.txt + Merchant feed, research-corrected — speakable descoped, FAQ copy must never claim Google rich results) remain. The real first-shop blocker is still the cloning CONVERTER — do not out-run it.

## First action (smallest step, ≤5 min, zero deps)
`git log origin/main --oneline -8` + `git branch --show-current`; curl the canary configurator page (expect 16 `type="radio"`); open `wp-admin/admin.php?page=wc-settings&tab=sgs_pack_pricing` logged in (creds `.claude/secrets/sandybrown.env`) and confirm the "SGS Smart Bulk Pricing" tab renders. Then read Spec 27 §FR-27-R4 (one paragraph, ~line 515) and start Task 1.

## Mandatory READING (read these before starting Task 1)
1. This prompt's **STOP catalogue** (above — the 4 NEW session-18 entries first) + **`.claude/handoff-theme.md` session-18** (top section) — what shipped + the session's lessons (admin-lazy double trap, dead head-JS, branch-switch recovery, rater-string-was-wrong).
2. **Spec 27 §FR-27-R4** (one paragraph, ~line 515) before Task 1; **parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`** (what remains) + **`P-P3-ADMIN-POLISH`** (deferred — do not rebuild ad hoc).
3. For Task 2 ONLY (at point of use, not before): **`.claude/reports/2026-06-09-f2-gold-standard-research.md`** (the F2 build contract) + **Spec 27 v6 §FR-27-F2** (the corrected done-when list with the grep gate).

**At-point-of-use (do NOT read up-front):** `.claude/reports/visual-p3/VISUAL-PASS-REPORT-2026-06-09.md` — only when Bean gives the polish go-ahead. The deferred first-shop draft (`sites/mamas-munches/…`) belongs to the cloning thread; do NOT read it here.

## What's next — Task 1 R4, Task 2 F2 (then Spec 27/28 is COMPLETE bar the gated P4/R5)

### Task 1 — FR-27-R4 agency slug-templates
**What:** an `sgs_product_template` CPT storing attribute/term SLUGS + presentation config (never IDs); `GET/POST /sgs/v1/product-templates/{id}/export|import` (`manage_woocommerce`, cookie-nonce like R1/R2); applying a template provisions attributes/terms via the SHIPPED R2 controller, then links the card.
**Why:** a fresh client install gets a working configurator from a template — the agency-reuse moat. **Estimated time:** 45–60 min.
**Orchestration:** delegated sonnet via /subagent-driven-development (implementer → spec-review + quality-review), NO commit/deploy authority. Brief must include: R2's provisioning endpoints are the ONLY write path (duplicated-calculation-drifts); export carries slugs not IDs; the CPT declares `supports => ['custom-fields']` if meta-REST is needed (memory `cpt-meta-needs-custom-fields-support-for-rest`); escape-audit table required; files ≤300 lines each, own-deps requires.
**Gates:** /qc-council before commit (WC-write adjacent); live round-trip on canary: export the 540 fixture's template → apply to a NEW product → PREFLIGHT passes + configurator renders 16 pills. **Acceptance:** "export site A → apply site B (no shared IDs) → working configurator" proven live.

### Task 2 — FR-27-F2 (v6, research-corrected)
**What:** `sgs/product-faq` block (or core/details consumption) + FAQPage JSON-LD; `llms.txt` + `llms-full.txt`; self-generated Merchant feed (XML RSS 2.0 `g:` namespace). **Estimated time:** 60–90 min (3 sub-units).
**Orchestration:** READ `.claude/reports/2026-06-09-f2-gold-standard-research.md` FIRST — it is the build contract (text/plain llms.txt + navigation-map-only anti-cloaking; per-variation feed items with `item_group_id` + SEC-7 deep-links + `identifier_exists=false` over fabricated GTINs + prices from the SEC-1 manifest; FAQ copy = "AI search citation + Bing visibility" NEVER "Google rich results"; speakable DESCOPED D197). Sonnet per sub-unit via SDD; fan-out ≤3 (feed | llms.txt | FAQ block are file-disjoint). The FAQ block's editor UI gets the session-18 MANDATORY visual pass.
**Gates:** /qc-council before the SEO-emit commit; the done-when grep gate over client-facing strings (`rich result|expandable answer` must hit nothing); draft-exfil probe (llms.txt leaks no draft/hidden/password products); SSRF probe on feed image URLs; feed↔schema price parity on canary 540. **Acceptance:** Spec 27 v6 §FR-27-F2 done-when list, each item proven on canary.

### Dependency graph
```
Task 1 (R4 — sonnet SDD, alone)
  ↓ /qc-council + live template round-trip on canary
Task 2 (F2 — ≤3 parallel sonnet sub-units: feed | llms.txt | FAQ block)
  ↓ /qc-council + grep gate + exfil/SSRF probes + visual pass on the FAQ block UI
Spec 27 rows flipped → Spec 27/28 COMPLETE (P4/R5 gated) → /handoff
```

**STRATEGIC NOTE (carried):** the real FIRST-SHOP blocker is the CONVERTER (cloning thread — typography/grid/hero don't lift faithfully). The theme thread's value is a correct + safe + complete shop layer — NOT out-running the converter. Do NOT pull Spec 28 P4 or R5 forward.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | R4 template-schema design decisions before building |
| `/gap-analysis` | grade each unit vs its FR acceptance before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` / `/research-check` | gold-standard checks beyond the F2 research pack |
| `/strategic-plan` + `/phase-planner` | only if scope grows beyond R4+F2 |
| `/subagent-driven-development` | per-unit implementer→spec-review→quality-review loop |
| `/dispatching-parallel-agents` | F2's ≤3 disjoint sub-units only |
| `/sgs-wp-engine` + `/wp-rest-api` + `/wp-plugin-development` + `/wp-block-development` | controllers, CPT, feed, FAQ block |
| `/qc-council` | MANDATORY before any WC-write/SEO-emit commit (blub.db 255) |
| `/verify-loop` | 2-attestation on load-bearing claims |
| `/ui-ux-pro-max` + chrome-devtools | the session-18 MANDATORY visual pass on ANY new admin/editor UI |
| `/delegate` | model per dispatch (sonnet default; haiku = second council family) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## Tool bindings (MCP / CLI)
| Tool | For |
|------|-----|
| chrome-devtools (`new_page` + `isolatedContext` — Playwright MCP is usually HELD by the co-active session) | live admin/page verification, screenshots, the visual pass |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` | product + variations |
| SSH + token-gated webroot one-shot runner | guard-blocked WC ops; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env` (file is ONLY at `.claude/secrets/`); plugin path `…/sandybrown…/public_html/wp-content/plugins/sgs-blocks` |
| temp git worktree (`git worktree add C:/tmp/sgs-<x> main`) | committing to main while the shared tree sits on the cloning thread's branch |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-unit mechanical build (no commit/deploy) + spec/quality raters |
| general-purpose (haiku) | cross-family /qc-council rater (gemini account-blocked) + consistency sweeps |
| `wp-sgs-developer` | heavy WC-write build (if preferred) |
| `design-reviewer` | any new visible authoring UI + WCAG 2.2 AA |

## Done — do NOT redo (this session's wave FIXED gaps in these; it does NOT rebuild them)
- Council backlog Waves 1/2/3 INCLUDING #17 — ALL SHIPPED + live-verified (D180/D181/D196; commits `04e62cdd`/`34e7e427`/`dbb96b6c`/`0bf4f2a7`/`b273db02`).
- Spec 28 P1 (`49d63ab8`) + P2 (`bf769cee` D198) + P3 (`aa599097` D199 + visual-pass `84899c2c` D200) — SHIPPED. ONLY P4 remains, GATED.
- Spec 27 Phases 1+2 + Cluster C + PREFLIGHT — SHIPPED (spec v6 feature map is current). Image-sitemap DESCOPED (D173); speakable DESCOPED (D197).
- P3 deferred polish lives in `.claude/reports/visual-p3/VISUAL-PASS-REPORT-2026-06-09.md` — parked pending Bean's go/no-go; do not rebuild ad hoc.

## Methodology guardrails
The standing methodology is NOT restated (duplicate of other sections) — it lives in: the **STOP catalogue** above (4 NEW session-18 entries first), the **orchestrator-role box** (fact-check every claim; no subagent commit authority; plain English to Bean), the **Bean directive** (don't stop between tasks), and the **Skills table** (/qc-council before any WC-write/SEO-emit commit; fan-out ≤3). Read those; nothing new is here.
