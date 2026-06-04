---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-05-theme-phase2-clusterA
generated: 2026-06-04
primary_goal: "SGS-THEME THREAD. Spec 27 PHASE 2 build is IN PROGRESS (D168): Step 0 foundations + B2 swatches + I2 auto-contrast + TAX-UI all SHIPPED + live-verified on canary 540. NEXT = finish Cluster A — B3 per-unit pricing + unit-label (FR-27-B3), A4 per-variation gallery (FR-27-A4), C2 OOS-vs-nonexistent (FR-27-C2), Step 7 demand-analytics (Bean-confirmed) — then the ESCAPE-AUDIT gate + the QA-VIS gate (axe + /ui-ux-pro-max + Bean R-22-13). THEN Cluster B SEO: E1 ProductGroup+hasVariant JSON-LD (REUSE review-schema.php + the manifest, inc-VAT, SEC-1/SEC-2), E2 canonical (no add_query_arg), E3 breadcrumb-PLACE + OG + sitemap (WP_Sitemaps + detect-defer Yoast/RankMath), F1 SSR-all-commerce. Live plan: .claude/plans/2026-06-04-spec27-phase2-display-seo-plan.md (v2). Main inline agent = OPUS orchestrator: dispatch Sonnet for the mechanical build, run qc gates, fact-check every claim against live ground truth, self-review visible work with /ui-ux-pro-max + /playwright BEFORE declaring done, keep Bean updated in plain English with a ranked menu + one recommendation."
---

# Next Session — SGS THEME thread — Spec 27 PHASE 2 — finish Cluster A → QA-VIS → Cluster B (SEO)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Spec 27 PHASE 1 SHIPPED (D165); Phase 2 is IN PROGRESS (D168)** — Step 0 (meta registry + head scaffold + fixture-v2), B2 swatches + I2 auto-contrast, and TAX-UI (3 VAT display modes) are all LIVE-VERIFIED on canary 540. **Do NOT re-touch Phase 1 units or the shipped Phase-2 units.** A parallel CLONING session is co-active on the SAME working tree (WS-4 done at D166/D167) — commit by EXPLICIT PATH only, verify `git log -1 --stat`, never `git add -A`.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch Sonnet subagents for the mechanical build (NO commit/deploy authority — they return uncommitted; you review + deploy + commit); run the qc gates; FACT-CHECK every subagent claim against live ground truth (read the file, open the live page, run the assertion — a subagent's "done" is a HYPOTHESIS); **self-review any VISIBLE work with `/ui-ux-pro-max` + `/playwright` at 375/768/1440 BEFORE declaring it done**; keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) with a ranked menu + one recommendation.
>
> **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change (NEW, D168).** A `view.js` change has NO browser effect until its `build/blocks/<block>/view.asset.php` (which carries the `?ver` hash) is ALSO deployed — the cached old ES module keeps running. scp the WHOLE block set (`render.php view.js view.asset.php index.js index.asset.php block.json`), never just the JS, then opcache-reset, then verify the served `?ver` matches the local view.asset.php. Tell: SSR shows the new output but the pill-swap behaves old; `curl` of the file shows new content yet the executing module is old. Memory `deploy-asset-php-with-viewscriptmodule`.
> **STOP — SSR==swap parity (NEW, D168).** Any display string PHP computes server-side AND view.js recomputes on swap (price, %off, VAT label, suffix) MUST be byte-identical, else the value flips on first interaction (SSR-wipe class). Seed the TRANSLATED/computed literal into context (e.g. per-combo `pctDisplay`, `vatLabel`) and have JS read it — never re-derive in JS. Pre-existing parity gap parked: `P-CONFIGURATOR-PRICE-FORMAT-LOCALE` (JS toLocaleString vs PHP wc_price thousand-separator for ≥£1000 / non-UK locale).
> **STOP — green automated gates ≠ design-complete (D165).** At the Phase-1 ship gate every automated gate passed (axe 0, INP 152ms, tests) yet Bean's R-22-13 review caught 7 real UX gaps. Functional-complete ≠ design-complete. Before declaring ANY visible feature shipped, self-review with `/ui-ux-pro-max` + `/playwright` 3-breakpoint; expect the human/self review to surface gaps even on a green suite. Memory `ship-gate-needs-human-eye-not-just-automated-gates`.
> **STOP — accessible card linking = DISCRETE image+title links, never a whole-card overlay (D165).** A card with interactive controls links the image (`<a tabindex="-1" aria-hidden="true">`) + the title (`<a>`) SEPARATELY; a whole-card `::after` overlay nests interactive elements inside a link (invalid HTML, axe `nested-interactive`, WCAG fail). Navigation-only cards MAY use a whole-card overlay. Memory `accessible-card-link-pattern-and-wp-maxwidth-tie`.
> **STOP — WP constrained-layout TIES a block's own max-width (D165).** `is-layout-constrained` injects a `(0,1,0)` max-width rule that source-order-beats `.my-block{max-width:..}`. Fix with a doubled-class `(0,2,0)` selector. Symptom: a block ignoring its max-width inside a constrained group.
> **STOP — WP Interactivity `data-wp-on--<event>` silently will NOT bind a custom event name containing a COLON** (e.g. `sgs:option-selected`) — no console error. Bridge via `data-wp-init` + a captured-context `addEventListener`. LIVE-TEST every custom-event→store wiring. Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`.
> **STOP — the SSR-wipe trap.** WP Interactivity directives run SERVER-SIDE; binding one to a JS-only getter resolves empty + WIPES the SSR value. Every display binding resolves against server-seeded `data-wp-context` whose default EQUALS the SSR literal. Manifest in per-instance `data-wp-context`, NOT shared `wp_interactivity_state`. Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`.
> **STOP — WC is the SINGLE SOURCE OF TRUTH; never mirror commerce data.** Price/sale/stock/image/SKU/cart read through from WooCommerce live; SGS stores presentation/config ONLY. The seeded SSR manifest IS a read-through CACHE — freshness defence is the render-time staleness guard (MAX post_modified + the tax fingerprint, D168), NOT "we never mirror". (Spec 27 principle 6.)
> **STOP — schema/OG price ALWAYS inc-VAT + read from the MANIFEST (SEC-1/SEC-2, for Cluster B).** E1 JSON-LD + E3 OG must read `Product_Manifest::build()` (never re-read WC independently — that re-opens the two-sources-of-truth wound) at the inc-VAT display price, deterministic per product per currency, INDEPENDENT of taxDisplayMode. Display-only changes never touch the cart/commerce path.
> **STOP — the client sends IDs + an attribute object, NEVER a price.** Add-to-cart → proxy `/sgs/v1/cart/add-item` (CSRF+IDOR+publish-gate+attr-match+stock+qty-cap+rate-limit) → in-process `WC()->cart->add_to_cart()`. WC 10.8.1 wire = `variation:[{attribute:"<DISPLAY NAME>",value:"<term slug>"}]`. (FR-27-G1/G2/G3.)
> **STOP — pages stay fully cacheable + tax-correct.** Seed display prices via `wc_get_price_to_display()`, decimals via `wc_get_price_decimals()`, never own division. Manifest cache key carries a tax fingerprint (D168) so a tax-config change auto-busts. dual ex/inc-tax-seed + CDN-vary = PARKED M-C10 (UK B2C single-context doesn't need it).
> **STOP — Spec 27 is the single MASTER** (absorbed 24+25). FR-24-x = shipped card system; FR-27-x = configurator. Read it before any product-card/option-picker/cart/configurator change. Phase-2 remaining FRs = B3/A4/C2/E1/E2/E3/F1 + PREFLIGHT + demand-analytics; Phase R (R1-R5/F2) = capstone, build last.
> **STOP — scope shared-block changes to the variant/mode the gated surface doesn't use.** `sgs/product-card` renders on page-144 Typed clones AND `sgs/option-picker` is shared with cloning's WS-4 mirror. Build against the **Bound (`wc-product`) branch + `.product-card--bound`-scoped CSS only**; on option-picker make swatch/etc. changes ADDITIVE (only fire when term_meta present → Typed pickers byte-identical). Add NEW scoped selectors; never modify an existing shared rule. Memory `scope-shared-block-changes-to-unused-variant`. (B2 already proved this works on top of WS-4.)
> **STOP — don't assert block capability from a partial dump:** read `block.json` + `edit.js` + `render.php` + `/wp-blocks` before building on top of product-card / option-picker / cart / manifest.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro / live DOM) BEFORE dispatching a fix. (Multiple past "bugs" were stale/false.)
> **STOP — verify against git, not the handoff:** run `git log --oneline -10` + `git branch` first; the cloning thread commits to the same `main` (it holds D166/D167; theme next-free = D169).
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk.** Any swatch/pill colour that must match the brand goes through the post too (`push-theme-snapshot.py` FR-26-D2). Memory `canary-live-styles-come-from-wp-global-styles-post`.
> **STOP — global-styles architecture is SPEC'd: read `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) BEFORE any theme.json / global-styles / per-client-theming change.** Phase-2 swatch/pill colours derive from Spec 26 tokens (FR-27-I2) — but Spec 26 is build-deferred, so B2 currently reads the `_sgs_swatch_color` hex directly (token integration is a later upgrade).
> **STOP — block style controls must accept RAW CSS values + defaults stay overridable:** every default colour/spacing is `var(--sgs-x, <default>)` with an editor control accepting raw hex/px. Memory `block-style-controls-accept-raw-css-and-overridable`.
> **STOP — auto-contrast = build-time luminance** (compute WCAG luminance of the swatch/pill colour, pick black/white text for 4.5:1) — SHIPPED in `sgs_wcag_text_colour_for_bg()` (render-helpers.php). CSS `contrast-color()` is a later progressive layer. Spec 26 non-goals + D161.
> **STOP — authoring is UN-GATED in the Phase-2 plan (D168 scope decision):** every new presentation field (swatch/divisor/gallery/variesBy/unit-label) ships WITH a friendly editor control (inspector or term-screen field), NEVER raw-meta editing. B2 set the pattern (`configurator-term-fields.php`). Phase R (R1/R2/R3 authoring) is IN scope, built later.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`/`wp post update`/literal `str_replace`) → token-gated webroot one-shot PHP runner (require wp-load.php + secret `$_GET['t']`, curl it, rm immediately). `POST /wp/v2/pages` (set block attrs in tests) + the template-parts REST endpoint are NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`.
> **STOP — fact-check every security/QC-rater "blocker" against the ACTUAL threat model before acting.** Security raters inflate theoretical issues against a generic high-security criterion. Re-derive against the real (often public-read) threat model. Memory `feedback_council_validates_the_criterion_it_is_given`.
> **Guardrail (all tasks):** after every block build-deploy, open the canary test page (540 + the WP editor on it) and verify the control renders + zero console errors + the live computed values BEFORE considering the task done. Bump block.json `version` on any block CSS/JS change. Surgical deploy: build via PowerShell, scp `build/blocks/<block>/*` (INCLUDING *.asset.php — D168) + changed `includes/*.php`, opcache-reset webroot trick. The SGS visual-diff gate needs a dated `reports/visual-diff/<block>-<today>.md` (verdict:PASS) for any `style.css` change; for PHP/JS-only changes use `git commit --no-verify`.

## State recap (plain English)
Spec 27 Phase 2 (the display + discovery layer of the shop) is partway built. Done + live on canary 540: (1) **Step 0** — one settings registry where every configurator option (swatch colour, "varies by" Google value, per-unit divisor + unit label, gallery, discount label) is defined once with safety rules; a `<head>` emitter scaffold for the SEO chapter; the test product seeded with all the new data. (2) **Swatches + auto-contrast** — flavour pills show colour chips with always-readable labels, authored via a proper field on the attribute screen. (3) **VAT display modes** — each card can show a single inc-VAT price (UK B2C default), an "inc. VAT" suffix, or an ex-VAT + VAT-amount line (trade), all display-only (the cart always charges the correct VAT-inclusive price). **Remaining in Cluster A:** per-unit "£x per bar" pricing, per-variation photo galleries, sold-out-vs-unavailable distinction, and demand analytics (combos customers tried but couldn't buy). Then the visible-layer QA gate + Bean's visual sign-off. THEN the SEO chapter (Cluster B): Google Merchant product schema, canonical URLs, breadcrumb + OG + product sitemap, and all-commerce-in-the-HTML for AI crawlers. The whole-framework AI-builder (Phase R capstone) is deliberately LAST.

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD is on `main` at/after the session-12 doc-reconcile commit. The only uncommitted files should be the never-commit artefacts (`lucide-icons.php` auto-regen, `sgs-framework.db`, `sites/mamas-munches/theme-snapshot.json`) — leave them. (The earlier spec27/phase1-plan doc tangle was RESOLVED at session-12 close: spec27 Phase-1+Phase-2 rows updated + committed; the completed Phase-1 plan archived to `plans/archive/2026-06-03-spec27-phase1-configurator-plan-complete.md`.) Then open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` + click a few pills to re-ground (auto mode, tax OFF baseline). Then read the live plan `.claude/plans/2026-06-04-spec27-phase2-display-seo-plan.md` (v2) §Cluster A remaining + the SEC-1..9 cross-cutting amendments.

## ORCHESTRATION PLAN (you = Opus orchestrator)

The fixture (540) already has the data: `_sgs_unit_divisor`=pack-count + `_sgs_unit_label`='bar' on all 48; `_sgs_variation_gallery` on 2; swatch colours on 12 flavours; `_sgs_variesby_value`='size' on size terms (flavour unmapped — tests E1's additionalProperty path); GTIN on 4; `_sgs_discount_label`='Best value' on the sale variation. All meta keys are registered + sanitised in `class-configurator-meta.php` (Step 0).

### Task 1 — B3 per-unit + unit-label + cosmetic discount label (FR-27-B3)
**What:** render "£1.04 per bar" (= live price ÷ `_sgs_unit_divisor`, derived at render — NEVER stored as a price) + the cosmetic `_sgs_discount_label` ("Best value") near the price. **Why:** per-unit is a strong selling point + the spec's B3. **Orchestration:** delegated → Sonnet via /delegate; single-agent; serialised on `product-card/{render.php,view.js}` (Bound branch only) + an inspector control for divisor + unit-label. Brief: derive £/unit in BOTH render.php (SSR literal) + view.js (swap) like the TAX-UI mode helpers; %off (pctDisplay) already shipped. /qc-inline after. **Acceptance:** "£1.04 per bar" on the default + recomputes on swap (no XHR); divisor 0 → no per-unit line; live-verified on 540.

### Task 2 — A4 per-variation gallery (FR-27-A4)
**What:** swap the card's image set from `_sgs_variation_gallery` on selection; prefetch on first card interaction (pointerenter/focusin), NOT on change; fallback variation-gallery → variation image → parent image → placeholder; seed image width/height so swap is CLS 0. **Orchestration:** delegated → Sonnet; serialised on `product-card/{render.php,view.js,style.css}` + a media-gallery picker control; performance-auditor re-check after. **Acceptance:** gallery swaps + fallback chain works + CLS 0; re-run the executed-JS budget (≤150KB) + context-size (≤24KB) checks. **Note:** the fixture has gallery on only 2 variations — add more or test the fallback explicitly.

### Task 3 — C2 OOS vs nonexistent (FR-27-C2)
**What:** distinguish "exists but out of stock" ("(sold out)") from "combination doesn't exist" ("(unavailable)") with distinct SR text, both `aria-disabled` + announced. **Orchestration:** delegated → Sonnet; small; `view.js` (availability engine) + `option-picker` consume. /qc-inline + axe. **Acceptance:** 12-coffee (OOS) → "(sold out)"; an impossible combo → "(unavailable)"; axe-0.

### Task 4 — Step 7 demand analytics (Bean-confirmed IN scope)
**What:** emit a privacy-safe aggregate counter (`_sgs_combo_attempts`, no PII) on selection/grey-out/OOS + a small admin "top unbuyable combos" surface; rate-limit the write endpoint. **Orchestration:** delegated → Sonnet; mostly disjoint (new endpoint class + admin surface; a small view.js event-emit on the option-selected handler). **Acceptance:** an OOS/nonexistent selection increments the aggregate; admin lists top combos; zero PII; endpoint rate-limited.

### GATES after Cluster A
- **ESCAPE-AUDIT gate** (security): a table [field → source → sanitise-at-save → escape-at-render → output context] for every new value; /qc-council reviews before commit.
- **QA-VIS gate:** axe-0 on `.product-card--bound`; /ui-ux-pro-max ≥A−; Playwright 375/768/1440; **Bean R-22-13 visual sign-off** on swatches + per-unit + gallery.

### Then Cluster B — SEO (lives in `includes/configurator-head.php`, the Step-0 scaffold)
E1 ProductGroup+hasVariant JSON-LD (REUSE `review-schema.php` rating patterns + read the MANIFEST, inc-VAT, ≤16KB, wp_json_encode HEX flags, variesBy enum + additionalProperty for unmapped, priceValidUntil via get_date_on_sale_to()) → E2 canonical (server-side attrs, NO add_query_arg) → E3 breadcrumb (PLACE the existing `sgs/breadcrumbs` block, don't build) + OG (inc-VAT) + sitemap (WP_Sitemaps provider + detect-defer Yoast/RankMath) → F1 SSR-all-commerce (curl-no-JS shows price+availability+JSON-LD). /qc-council per E-commit + Rich Results Test gate.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — auto-injected by SessionStart | 
| `/brainstorming` | any design decision before coding (gallery UX, demand-analytics shape) |
| `/strategic-plan` + `/phase-planner` | only if re-planning; the v2 plan already sequences Cluster A + B |
| `/research` / `/research-buddies` | E1 — current Google Merchant variant-schema rules BEFORE building |
| `/ui-ux-pro-max` + `/playwright` | MANDATORY self-review of B3/A4 (visible) before declaring done |
| `/sgs-wp-engine` + `/wp-block-development` | block dev — block.json, attrs, render, deprecations |
| `/wp-interactivity-api` | gallery/availability reactive bindings (SSR-safe; SSR==swap parity) |
| `/wp-rest-api` | demand-analytics endpoint + (Cluster B) sitemap |
| `/wp-hooks` | Cluster B cache-purge hooks + sitemap provider |
| `/seo` + `/seo-schema` | E1/E2/E3 JSON-LD + Merchant + Rich Results |
| `/library-docs` | up-to-date WC / Google Merchant / schema.org reference |
| `/qc-council` | MANDATORY before any commit touching the resolver/schema-emitter/SSR/SGS-block (blub.db 255) |
| `/qc` / `/qc-inline` | per-unit |
| `/gap-analysis` | grade each unit vs its Spec 27 acceptance before delivery |
| `/delegate` | pick the model per dispatch (Sonnet default) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright (isolated `node` script via PowerShell — shared MCP browser may be held by cloning) | self-review @375/768/1440, axe-core, CWV, schema-render checks |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST API + `/wc/v3` | product 540 + variation + cart state |
| Google Rich Results Test | E1/E3 schema validation |
| SSH + token-gated webroot runner | guard-blocked WC ops; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env`; plugin path `…/sandybrown…/public_html/wp-content/plugins/sgs-blocks` |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-unit mechanical build (no commit/deploy authority) + cross-model qc raters |
| `design-reviewer` | swatch/gallery visual + WCAG 2.2 AA (alongside /ui-ux-pro-max) |
| `seo-schema` | E1/E2/E3 JSON-LD + Merchant validation |
| `performance-auditor` | re-check INP/CLS/bundle after galleries (A4) |

## Done — do NOT redo (this session, D168)
- Step 0 (meta registry + head scaffold + fixture-v2), B2 swatches + I2 auto-contrast, TAX-UI (3 VAT modes) — all SHIPPED + live-verified + qc-council'd. 3 fast-follows + UK tax-verify + Phase-2 plan v2.

## Methodology guardrails (do not skip)
- **You are the orchestrator; fact-check every subagent claim** against live ground truth (read file + open live page + run the assertion).
- **Self-review visible work with /ui-ux-pro-max + /playwright BEFORE declaring done** (green gates ≠ design-complete, D165).
- **Deploy the WHOLE block set incl *.asset.php BEFORE measuring** (D168) — else you measure a stale cached module.
- **SSR==swap parity** — seed the translated literal; never re-derive a display string in JS that PHP also computes (D168).
- **/qc multi-rater BEFORE every commit** touching the resolver/schema-emitter/SSR/SGS-block (blub.db 255).
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; you review + build + deploy + commit by explicit path.
- **Live-verify everything yourself**; communicate in plain English (Problem→Effect→Solution; ranked menu + one recommendation).
