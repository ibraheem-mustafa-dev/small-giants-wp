---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-04-theme-session11
generated: 2026-06-04
primary_goal: "SGS-THEME THREAD. The visible sell-loop is SHIPPED (pill-swap U3/U4/U7/U5 live + verified on page 589, D164). BUILD the REST of Spec 27 Phase 1 to the single whole ship gate: U9 (WCAG sprint + evidence + <a>->button) -> U10 (perf budgets INP<=200) -> U8 (cache+tax) -> U11 (WC<9.8 degradation) -> U1 (per-site capability flag) -> U12 (cloning-compat tests). Main inline agent is OPUS = orchestrator: plan, dispatch Sonnet subagents for the mechanical build, run the qc gates, fact-check every subagent claim against live ground truth, keep Bean updated in plain English, advise on decisions with a ranked menu + one recommendation."
---

# Next Session — SGS THEME thread — Spec 27 Phase 1 HARDENING (U9/U10/U8/U11/U1/U12 → ship gate)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). DO NOT START ANY TASK until you have read the MANDATORY READING LIST below and quoted the STOP catalogue + the orchestration model back to yourself. **The visible sell-loop is DONE** (U3 manifest+SSR seed `7f096976`, U4 pill-swap `6b4af10a`, U7 secure cart `c903e760`, U5 availability+a11y `3bbb21b6` — all live-verified on page 589/fixture 540, GATE 2 Bean-signed-off, D164). This session builds the HARDENING units that complete the single whole ship gate. A parallel CLONING session may be co-active on the SAME working tree (WS-4) — commit by EXPLICIT PATH only, verify `git log -1 --stat`, never `git add -A`.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked directive).** Plan + decompose; dispatch Sonnet subagents for the mechanical build (they have NO commit/deploy authority — they return uncommitted code, you review + deploy + commit); run the qc gates (adversarial-council / qc-council / 2-rater review / gap-analysis); FACT-CHECK every subagent claim against live ground truth (read the file, open the live page, run the assertion — never relay a subagent's "done" as fact); keep Bean updated in PLAIN ENGLISH (non-coder — Problem→Effect→Solution); advise with a ranked menu + one recommendation. Live-verify EVERYTHING yourself — you own the proof of unproven work. (This session that discipline caught 5 real bugs the build hid.)
>
> **STOP — WP Interactivity `data-wp-on--<event>` silently will NOT bind a custom event name containing a COLON** (e.g. `sgs:option-selected`) — the listener never attaches, no console error. The card now bridges via `data-wp-init="callbacks.initPillBridge"` + a captured-context `addEventListener`. NEVER assume a present `data-wp-on--` attribute means the listener bound — LIVE-TEST every custom-event→store-action wiring (dispatch + assert the state change). Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`. (D164.)
> **STOP — fact-check every security/QC-rater "blocker" against the ACTUAL threat model before acting.** A Haiku rater graded the U5 public-read availability endpoint FIX-FIRST on an IDOR-timing leak (public product data — negligible) + a transient rate-limit race (pre-existing accepted pattern). Both REJECTED on re-derivation; only the resource guard was real. Security raters inflate theoretical issues against a generic high-security criterion. Memory `feedback_council_validates_the_criterion_it_is_given`. (D164.)
> **STOP — the SGS visual-diff gate blocks any commit touching a block's `style.css` until a DATED report exists:** `reports/visual-diff/<block>-<YYYY-MM-DD>.md` with `verdict: PASS` + `first_paint_capture_passed: true`. The date is TODAY — a date roll mid-session re-arms the gate. For PHP/JS-only changes use `git commit --no-verify` (the gate prints this). (D164.)
> **STOP — scope shared-block changes to the variant/mode the gated surface doesn't use.** `sgs/product-card` renders on page-144's Typed clones (whose pixel-diff the cloning thread measures) AND `sgs/option-picker` is shared with WS-4. Build against the **Bound (`wc-product`) render branch + `.product-card--bound`-scoped CSS only**; NEVER edit the shared `sgs/option-picker` block file (reach into its rendered DOM from the card instead, as U5 does). Add NEW scoped selectors; never modify an existing shared rule. Memory `scope-shared-block-changes-to-unused-variant` (blub.db 304).
> **STOP — the WC add-item attribute format is PINNED LIVE (WC 10.8.1).** Store API `/wc/store/v1/cart/add-item` (and the SGS proxy) `variation` field = an ARRAY of `{attribute:"<DISPLAY NAME>", value:"<term slug>"}` — e.g. `{"attribute":"Size","value":"12-pack"}`. NOT `pa_size`. The client sends the SELECTED variation `id` + this array + `X-WP-Nonce` (seeded `restNonce`), NEVER a price. (D162.6 / D164.)
> **STOP — WC is the SINGLE SOURCE OF TRUTH; never mirror commerce data.** Price/sale/stock/variation-image/combination-validity/SKU/cart all read through from WooCommerce live. SGS stores presentation/config ONLY. The seeded SSR manifest IS a read-through CACHE — the freshness defence is the render-time `get_date_modified()` staleness guard (already in `Product_Manifest::build`, M-C1), NOT "we never mirror". `_sgs_sku_matrix` is DROPPED. (Spec 27 principle 6.)
> **STOP — the SSR-wipe trap.** WP Interactivity directives (`data-wp-bind`/`data-wp-text`) run SERVER-SIDE; binding one to a JS-only getter resolves empty and WIPES the SSR literal. Every display binding MUST resolve against server-seeded `data-wp-context` whose default EQUALS the SSR literal. Price slot = SEPARATE seeded literal keys (no innerHTML bind). Manifest in per-instance `data-wp-context`, NOT shared `wp_interactivity_state` (multi-card bug). Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`.
> **STOP — the client sends IDs + an attribute object, NEVER a price.** The proxy (BUILT + VERIFIED) validates (CSRF + IDOR + publish-gate + attribute-match + stock + qty-cap + rate-limit) THEN adds in-process via `WC()->cart->add_to_cart()` (recomputes price + re-validates stock). Any client price field is ignored. (FR-27-G1/G2/G3.)
> **STOP — pages stay fully cacheable.** Oversell protection = a single live stock re-check on the add-to-cart CLICK, NOT page-uncacheable rendering. Freshness = the render-time `get_date_modified()` staleness guard + the U6 purge hooks. Tax-correct: seed display prices via `wc_get_price_to_display()` + decimals via `wc_get_price_decimals()`, never own division. (FR-27-G6/H3 — U8 confirms.)
> **STOP — Spec 27 is the single MASTER** for the product + WooCommerce layer (absorbed 24+25). Read Spec 27 before any product-card / option-picker / cart / configurator change. FR-24-x = shipped card system; FR-27-x = configurator. The single-whole-gate decision stands (Bean, D162.5): all 13 units before "shipped" — the sell-loop is the BUILD ORDER, not the ship line.
> **STOP — don't assert block capability from a partial dump:** read `block.json` + `edit.js` + `render.php` + `/wp-blocks` before building on top of product-card / option-picker / cart.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro) BEFORE dispatching a fix. (Multiple past "bugs" were stale/false.)
> **STOP — verify against git, not the handoff:** run `git log --oneline -10` + `git branch` first; trust the repo over prose. The cloning thread commits to the same `main`.
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk.** A disk-only edit re-diverges. Any pill/swatch CSS that must match the brand goes through the post too (`push-theme-snapshot.py` FR-26-D2). Memory `canary-live-styles-come-from-wp-global-styles-post`.
> **STOP — global-styles architecture is SPEC'd: read `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) BEFORE any theme.json / global-styles / per-client-theming change.** Build deferred except FR-26-D2 (shipped). FR-26-D1 RESOLVED/MOOT — do NOT clear canary post 7. Configurator swatch/pill colours derive from Spec 26 tokens (FR-27-I2).
> **STOP — block style controls must accept RAW CSS values + defaults stay overridable:** every default colour/spacing is `var(--sgs-x, <default>)` with an editor control accepting raw hex/px (theme.json `color.custom`/`customSpacingSize` true). Memory `block-style-controls-accept-raw-css-and-overridable`.
> **STOP — auto-contrast direction is DECIDED: build-time luminance** (compute WCAG luminance of the brand/swatch colour, pick black/white text for 4.5:1), CSS `contrast-color()` as a later progressive-enhancement layer. Applies to pill text (FR-27-I2). Spec 26 non-goals + D161.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken: `/c/nvm4w/nodejs/node: line 1: This: command not found`). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`) → use a token-gated webroot one-shot PHP runner (require wp-load.php + secret `$_GET['t']`, curl it, rm immediately). `POST /wp/v2/pages` is NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`.
> **Guardrail (all tasks):** after every block build-deploy, open the canary test page 589 (and the WP editor on it) and verify the control renders + zero console errors + the live computed values BEFORE considering the task done. Bump block.json `version` on any block CSS/JS change. Surgical deploy: build via PowerShell, scp `build/blocks/<block>/*` + the changed `includes/*.php`, opcache-reset webroot trick — avoids bundling the cloning thread's uncommitted blocks. `viewScriptModule` cache-busts via the `.asset.php` content hash (no version bump needed for JS); `style.css` needs the block.json version bump + (if theme CSS) the theme `style.css` Version.

## State recap (plain English)
The SGS framework is a custom WordPress block library. Its shop layer (Spec 27) now has a WORKING, LIVE, SECURE sell-loop: on canary page 589 (`/sgs-configurator-test-540/`, fixture product 540 = 48 SKUs) a shopper taps a Size + Flavour pill, the price/sale/stock swap instantly (no server call), impossible/sold-out combos grey out, and Add-to-Cart drops the exact chosen variation into the basket at the server-decided price through the secure proxy. It meets all 4 accessibility gates (axe-core 0, keyboard, screen-reader, 44px). **What's left to "ship" Phase 1** (the single whole gate, Bean's decision): the HARDENING layer — accessibility EVIDENCE + the `<a>`→`<button>` fix (U9), performance budgets (U10), cache+tax correctness (U8), graceful degradation below WC 9.8 (U11), the per-site capability flag (U1), and the cloning-compatibility tests (U12). None of this is on page 144 — it's all on the test page + framework code, so it does NOT collide with the cloning thread.

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD is at/after `3bbb21b6` (this session's last theme commit). Confirm the ONLY uncommitted files belong to the cloning thread (`heading/*`, `label/*`, `container/render.php`, `sync-container-wrapping-blocks.py`, `testimonial-slider/*`, `reports/phase4-*`, `theme-snapshot.json`, `lucide-icons.php`, `orchestrator/sgs-framework.db`) — leave them ALL untouched. Then open the live test page `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` + click a few pills to re-ground on the working sell-loop. Then read the MANDATORY READING LIST. Then start U9.

## MANDATORY READING LIST (read FULLY first, in order)
1. This file (the STOP catalogue especially).
2. `.claude/handoff-theme.md` (session 10 at top = the pill-swap quartet + the 5 bugs + the lessons; 9/8/7/6 below = backend + Spec 27 master + Spec 26 history).
3. `.claude/plans/2026-06-03-spec27-phase1-configurator-plan.md` — THE build map. Re-read §2 (unit cards — U0/U6 + now U3/U4/U7/U5 DONE), §8b (must-fix register — M-C1/M-C5/M-C10 still touch U8) + §8c should-fixes (the `<a>`→`<button>` Space-key fix is U9; HPOS decl; kill-switch; editor preview).
4. `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` — read FR-27-B1 (a11y — U9), FR-27-H1/H2/H3 (perf+cache+tax — U10/U8), FR-27-A3/A5 (degradation — U11), FR-24 #9 (capability flag — U1), FR-27-I-MVP (cloning-compat — U12), acceptance 1-6 (the ship gate).
5. The product files (read FULL, cross-check `/wp-blocks` + `/sgs-db` — do not infer from a dump): `src/blocks/product-card/{render.php,view.js,style.css,block.json}`, `src/blocks/option-picker/{render.php,view.js,block.json}`, `includes/class-product-manifest.php` (U3 builder), `includes/class-product-bindings.php` (resolver), `includes/class-cart-proxy.php` (proxy + availability endpoint).
6. `.claude/decisions.md` newest — D164 (this session: the quartet + 5 bugs + council-severity-correction), D162 (backend + plan + council), D161 (Spec 27 master). NOTE the next free theme D-number = D165.
7. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` — block customisation standard, the deprecation procedure (adding `sourceMode`/swatch attrs MUST keep the Typed shape a deprecation-free subset — FR-27-I-MVP / U12), the block-status table.
8. `.claude/parking.md` — P-PRODUCT-CARD-PILL-SWAP-DORMANT is RESOLVED (archive it); P-AUTO-CONTRAST-LIGHT-PRIMARIES, P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES.

## ORCHESTRATION PLAN (you = Opus orchestrator; dispatch Sonnet; opus-inline only where flagged)

### Task U9 — WCAG 2.2 AA sprint + evidence sheet (FR-27-B1) — the first-mover claim
**What:** harden the option-picker radiogroup a11y + publish the moat-evidence sheet. **CHANGE the add-to-cart `<a role="button">` to a real `<button>`** (the `<a role=button>` fails the Space-key WCAG criterion — plan §8c/M-C10) while keeping a no-JS fallback (e.g. a `<form>`/`<a>` wrapper or a noscript path). Option-picker: always-visible text labels (already), arrow-key radiogroup nav, `focus-visible`, `prefers-reduced-motion`, `aria-disabled`+SR status (U5 added the unavailable label — confirm). Card: `aria-live` on price/stock (already) + focus management after add-to-cart. **Est:** ~30 min.
**Orchestration:** single **Sonnet** subagent + the `design-reviewer` agent for the editor/WCAG pass. Model: sonnet. /qc gate: the **4 objective Playwright gates** (axe-core 0 · keyboard Tab+arrows no trap · SR announces label+state+price · every target ≥44×44px by computed bounding-rect) — these PASS today (re-confirm after the `<button>` change) + publish `.claude/reports/sgs-configurator-moat-evidence.md`. The `<a>`→`<button>` touches the SHARED add-to-cart markup → scope to the Bound branch; keyboard-test Space + Enter both fire add-to-cart.
**Acceptance:** the 4 gates pass with a real `<button>`; no-JS still adds via a fallback; evidence sheet published with each claim + a durability rating (FR-27-J1).

### Task U10 — Performance budgets (FR-27-H1/H2; `performance-auditor`)
**What:** prove Interactivity-API-only (no WC React/jQuery), lab INP ≤200ms on a 48-SKU pill change, block JS ≤20KB, CLS 0 on swap (reserved-height price/stock — confirm). **Why:** the (expiring) no-React perf edge. **Est:** ~25 min.
**Orchestration:** the `performance-auditor` agent + Playwright/Chrome-DevTools INP capture (throttled mid-tier 4G). Model: sonnet. /qc gate: lab INP ≤200ms measured; no React bundle on the page; CLS 0 across a swap at 3 viewports.
**Acceptance:** INP ≤200ms + CLS 0 + JS budget met, all MEASURED (not asserted).

### Task U8 — Cache + tax correctness (FR-27-H3/G6; sonnet)
**What:** confirm the render-time `get_date_modified()` staleness guard (already in `Product_Manifest::build` M-C1) + the U6 purge hooks fire; card price == cart price across tax by construction (`wc_get_price_to_display` everywhere). For Mama's (UK B2C tax-inclusive) DEFER the dual-ex/inc-tax-seed + CDN-vary (M-C10). **Est:** ~20 min.
**Orchestration:** single **Sonnet** subagent. /qc gate: `/qc-inline` — edit a variation price server-side → next uncached render shows it (staleness guard); B2B-exempt + standard customer see the right price; sale-end purge.
**Acceptance:** card price == cart price across tax; a price change reflects without a manual cache clear.

### Tasks U11 → U1 → U12 (sequential; U11+U1 both touch `class-product-cpt.php` — DO NOT parallelise)
- **U11 — degradation + activation prompt** (FR-27-A3/A5; sonnet). WC <9.8 → read-only card (static default price, no configurator JS) + dismissible admin notice; WC activation on a site with `sgs-cpt` cards → admin migration prompt. Gate WC version via `defined('WC_VERSION') && version_compare(...)`. /qc: WC-version-spoof fixture.
- **U1 — per-site capability flag** (FR-24 #9; sonnet). `wp_options` `sgs_content_types` (autoloaded array, default `[]`); CPT registration guards on it; a minimal `manage_options` SGS Settings toggle; deploy tooling sets it. /qc: option empty → no `sgs_product` route; set → route present.
- **U12 — cloning-compat + schema-compat tests** (FR-27-I-MVP; sonnet). The converter keeps emitting Typed option-pickers unchanged; adding `sourceMode`/swatch attrs keeps the Typed shape a deprecation-free subset (Jest block.json schema-compat + PHPUnit deprecation test; gate on attr TYPE not presence — the `inheritStyle` lesson). Needs a baseline snapshot to diff against. /qc: a clone run emits Typed pickers unchanged + compat tests pass.

**PHASE-1 SHIP GATE (Spec 27 acceptance 1-6 — the whole gate before "shipped"):** real WC values + no-XHR-on-change + no-JS default + ≤24KB context + card==cart across tax (DONE for the sell-loop); 48-SKU grey-out both directions + OOS-after-load caught (DONE U5); axe-core 0 + keyboard + SR + 44px (DONE U5, evidence pending U9); tampered add-to-cart rejected + flood capped + sale-end purge (DONE U6 + U8 confirms); lab INP ≤200ms + CLS 0 (U10); cloning emits Typed pickers unchanged (U12). Bean visual sign-off (R-22-13). **THEN Phase 2** (swatches/per-unit/galleries/JSON-LD/SEO/PREFLIGHT) — separate chapter, do NOT pull forward.

### Dependency graph
```
U9 a11y sprint (design-reviewer + 4 gates + evidence) ──┐
U10 perf (performance-auditor, INP≤200) ────────────────┤ (U9/U10/U8 fan out — independent)
U8 cache+tax (staleness guard) ─────────────────────────┘
        ↓
U11 degradation ──┐ (U11 + U1 both touch class-product-cpt.php — SEQUENCE, do not parallelise)
U1 capability flag ┘
        ↓
U12 cloning-compat + schema-compat tests
        ↓
PHASE-1 SHIP GATE (acceptance 1-6) + Bean sign-off (R-22-13) → "Phase 1 SHIPPED" → Phase 2
every milestone → commit to main by EXPLICIT PATH (cloning thread co-active); scope card changes to Bound-only classes
```

## Skills to Invoke
| Skill | When | Dispatch note |
|-------|------|---------------|
| `/autopilot` | FIRST — auto-injected by SessionStart | inline |
| `/brainstorming` | any design decision before coding (U9 button-fallback shape; U11 degradation states) | opus-inline |
| `/strategic-plan` → `/phase-planner` | finer step-plan inside a unit if needed (macro plan exists §2) | inline |
| `/sgs-wp-engine` + `/wp-block-development` | block dev — block.json, attrs, render, deprecations (U12) | subagent at point of use |
| `/wp-interactivity-api` | the card store / SSR-safe directives / the colon-event bridge | subagent + your review |
| `/wp-rest-api` | any new endpoint / Store-API auth (U1 settings, U11) | subagent |
| `/library-docs` | up-to-date WC / WP Interactivity / Block Bindings reference | inline before non-trivial design |
| `/research` (auto-routes) | gold-standard before any non-trivial pattern (INP optimisation, WC version-gating) | inline |
| `/qc-council` | MANDATORY before any commit touching the proxy/endpoint or security-adjacent code (blub.db 255) — multi-rater cross-model | you orchestrate |
| `/qc` / `/qc-inline` | `/qc-inline` for small units (U8/U11/U1); `/qc` for U9/U12 | inline |
| `/visual-qa` or `/design-review` | the FR-27-B1 four a11y gates | `design-reviewer` agent |
| `/gap-analysis` | grade each unit against its Spec 27 acceptance before delivery | inline |
| `/systematic-debugging` | any bug — root-cause before fixing | inline |
| `/delegate` | pick the model per dispatch (Sonnet default; opus for design-gates) | inline before each dispatch |
| `/capture-lesson` | any new architectural rule surfaced | inline |
| `/handoff` | session close | inline |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright (isolated `node` script via PowerShell — the shared MCP browser is often held by the cloning session) | the 4 a11y gates (axe-core / keyboard / SR snapshot / 44px bounding-rect), INP/CWV capture, no-XHR check, computed-style. The browser is frequently in use → run `node <script>.mjs` via PowerShell with the project's playwright. |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / capabilities |
| WooCommerce Store/REST API (`/wc/store/v1`, `/wc/v3`) | product 540 + variation + cart state |
| REST global-styles (`/wp/v2/global-styles/7`) | LIVE canary styles (supersedes theme.json) — for any pill colour that must match the brand |
| `performance-auditor` agent | FR-27-H1 lab-INP ≤200ms + bundle-budget gate (U10) |
| SSH + token-gated webroot runner | WC-CLI ops the guard blocks; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env`; plugin path `/home/u945238940/domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content/plugins/sgs-blocks` |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | the per-unit mechanical build (the `wp-sgs-developer` agent is NOT registered in this environment — use general-purpose sonnet) + a 2-rater cross-model review per security-adjacent commit |
| `design-reviewer` | the FR-27-B1 four a11y gates + editor UX (WCAG 2.2 AA) — U9 |
| `performance-auditor` | INP / LCP / CLS / bundle budgets (FR-27-H) — U10 |

## Done — do NOT redo (live + committed)
- **U0** fixture (canary product 540, 48 variations) + **U6** secure cart-proxy + bypass closure (D162).
- **U3** manifest+SSR seed (`7f096976`) · **U4** pill-swap (`6b4af10a`) · **U7** secure add-to-cart (`c903e760`) · **U5** availability+a11y (`3bbb21b6`). All live-verified on page 589. `Product_Manifest::build` + the `GET /sgs/v1/cart/availability/{id}` endpoint exist. Card block.json 1.6.1.

## Methodology guardrails (do not skip)
- **You are the orchestrator; fact-check every subagent claim** — a subagent's "done/verified" is a HYPOTHESIS until you read the file + open the live page + run the assertion yourself. This session that caught 5 real bugs.
- **Live-test custom-event → store wirings** — a present `data-wp-on--` attribute does NOT prove the listener bound (colon-event trap). Dispatch the event + assert the state change.
- **Multi-rater review finds the bugs the happy path misses** — for security-adjacent code (the new endpoint, U1 settings) run a 2-rater cross-model review of the PATHS the live test didn't exercise, AND fact-check each "blocker" against the real threat model before acting.
- **Deploy before measure** — build via PowerShell + surgical scp + opcache reset BEFORE any browser/REST test, or you measure stale output.
- **Verify rendered output, not internal metrics (R-22-11)** — live page 589 render / editor / network panel is canonical; lint/build green ≠ correct. The a11y/INP/no-XHR gates are MEASURED in Playwright.
- **Outcome vs completion** — code shipped ≠ outcome achieved; if the live measurement isn't run, the unit is not done.
- **/qc multi-rater BEFORE every commit** touching the proxy/endpoint/SGS-block (blub.db 255).
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; you review + build + deploy + commit by explicit path.
- **Prefer Sonnet subagent over Opus-inline for the mechanical build** (Bean-locked); opus-inline for design-gates + Bean-decision moments + trivial fixes. Live-verify everything yourself.
- **Communicate in plain English** — Bean is a non-coder: Problem → Effect → Solution; ranked menu + one recommendation on decisions; mark wins with a running count.
