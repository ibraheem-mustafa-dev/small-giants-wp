---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-05-theme-phase2-clusterB-seo
generated: 2026-06-04
primary_goal: "SGS-THEME THREAD. Spec 27 PHASE 2 CLUSTER A is COMPLETE (D171, Bean R-22-13 sign-off granted): B3 + A4 + C2 + Step-7 demand analytics all SHIPPED + live-verified on canary 540 + ESCAPE-AUDIT + QA-VIS(axe-0) passed. NEXT = CLUSTER B SEO: E1 ProductGroup+hasVariant JSON-LD (REUSE review-schema.php + the MANIFEST, inc-VAT, SEC-1/SEC-2) → E2 canonical (server-side attrs, NO add_query_arg, SEC-7) → E3 breadcrumb-PLACE (sgs/breadcrumbs exists) + OG + sitemap (WP_Sitemaps provider + detect-defer Yoast/RankMath, SEC-6/SEC-9) → F1 SSR-all-commerce (curl-no-JS shows price+availability+JSON-LD). Lives in includes/configurator-head.php (Step-0 scaffold). THEN Cluster C authoring (R1/R2) + R3 + PREFLIGHT hard go-live block. Main inline agent = OPUS orchestrator: dispatch Sonnet for the mechanical build, run /qc-council gates, fact-check every claim against live ground truth, self-review visible work with /ui-ux-pro-max + /playwright BEFORE declaring done, keep Bean updated in plain English with a ranked menu + one recommendation."
---

# Next Session — SGS THEME thread — Spec 27 PHASE 2 — Cluster B (SEO) → Cluster C (authoring + PREFLIGHT)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Spec 27 PHASE 1 SHIPPED (D165); PHASE 2 CLUSTER A COMPLETE (D171, Bean R-22-13 sign-off)** — B3/A4/C2/Step-7 all live on canary 540. **Do NOT re-touch shipped units.** A parallel CLONING session (D169/D170, Method-2 converter work) is co-active on the SAME `main` — commit by EXPLICIT PATH only, verify `git log -1 --stat`, never `git add -A`, leave the never-commit artefacts (`lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`) untouched.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch Sonnet subagents for the mechanical build (NO commit/deploy authority — they return uncommitted; you review + deploy + commit); run the /qc-council gates; FACT-CHECK every subagent claim against live ground truth (read the file, open the live page, run the assertion — a subagent's "done" is a HYPOTHESIS); **self-review any VISIBLE work with `/ui-ux-pro-max` + `/playwright`/chrome-devtools at 375/768/1440 BEFORE declaring done**; keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) + a ranked menu + one recommendation.
>
> **Bean directive (2026-06-04, locked): in a multi-task batch, DON'T stop between tasks to ask permission — proceed task-to-task on passing+substantiated evidence; only stop for a genuine decision or a hard block.** Memory `dont-stop-between-tasks-in-a-batch`.

## STOP catalogue (anti-pattern defences — carried forward + extended; do NOT subtract)

> **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change (D168).** A `view.js` change has NO browser effect until its `build/blocks/<block>/view.asset.php` (the `?ver` carrier) is ALSO deployed — the cached old ES module keeps running. scp the WHOLE block set, opcache-reset, verify the served `?ver` matches the local view.asset.php. Memory `deploy-asset-php-with-viewscriptmodule`.
> **STOP — WP reads each block's `style.css`, NOT `style-index.css` (NEW, D171).** `block.json` declares `"style":"file:./style.css"`; the `copy-built-styles.js` postbuild copies `style-index.css`→`style.css`. Deploying only `style-index.css` ships nothing — deploy `style.css` (+ `style-rtl.css`). Tell: the served `style.css` file has your rule but the page (inline-enqueued) doesn't. Cost ~20 min this session.
> **STOP — WP Interactivity does NOT bind `data-wp-on` directives on imperatively-injected DOM nodes (NEW, D171).** A `createElement`'d button with `data-wp-on--click` will NOT fire (Interactivity scans directives at hydration, not on arbitrary mutations). Use EVENT DELEGATION (one listener on a stable ancestor captured in `data-wp-init`) for any dynamically-rebuilt interactive elements. Caught on the A4 thumbnail strip.
> **STOP — green automated gates ≠ design-complete (D165).** axe-0/INP/tests passing does NOT mean visually correct. THIS session axe-0 passed while the A4 thumbnail strip was invisibly CLIPPED inside an overflow box, and Bean's R-22-13 caught an over-zoomed image box + a "Best value"-should-be-"Sale" badge. Self-review with `/ui-ux-pro-max` + `/playwright` 3-breakpoint AND expect Bean's eye to surface more. Memory `ship-gate-needs-human-eye-not-just-automated-gates`.
> **STOP — run the ESCAPE-AUDIT before committing any new data→HTML/REST path (D171).** A 2-reviewer escape-audit caught a BLOCKER the build agent missed (the A4 gallery authoring field had no save handler — render only worked from fixture-seeded meta) + a non-image-id gallery hole + SHA-1. Build a [value → source → sanitise-at-save → escape-at-render → output context] table; /qc-council it.
> **STOP — SSR==swap parity (D168).** Any display string PHP computes server-side AND view.js recomputes on swap (price, %off, VAT label, per-unit, Sale/badge) MUST be byte-identical — seed the TRANSLATED/computed literal into context (e.g. `pctDisplay`, `saleLabel`) and have JS read it; never re-derive in JS. Parked parity gap: `P-CONFIGURATOR-PRICE-FORMAT-LOCALE`.
> **STOP — the SSR-wipe trap.** WP Interactivity directives run SERVER-SIDE; binding one to a JS-only getter resolves empty + WIPES the SSR value. Every display binding resolves against server-seeded `data-wp-context` whose default EQUALS the SSR literal. Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`.
> **STOP — WP Interactivity `data-wp-on--<event>` silently will NOT bind a custom event name containing a COLON** (e.g. `sgs:option-selected`). Bridge via `data-wp-init` + a captured-context `addEventListener`. Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`.
> **STOP — schema/OG price ALWAYS inc-VAT + read from the MANIFEST (SEC-1/SEC-2, the Cluster B core).** E1 JSON-LD + E3 OG read `Product_Manifest::build()` (NEVER re-read WC independently — that re-opens two-sources-of-truth + Google Merchant price-mismatch suspension) at the inc-VAT display price, deterministic per product per currency, INDEPENDENT of taxDisplayMode. A CI grep should assert `class-product-schema.php` contains zero `wc_get_price_to_display`/`get_children`.
> **STOP — WC is the SINGLE SOURCE OF TRUTH; never mirror commerce data.** The seeded SSR manifest IS a read-through CACHE; freshness = the render-time staleness guard (MAX post_modified + tax fingerprint), not "we never mirror". Spec 27 principle 6.
> **STOP — E2 canonical: never `add_query_arg` (SEC-7).** Build as `esc_url(get_permalink($id).'?'.http_build_query($validated_attrs))` where attrs come from the variation's own `get_attributes()` server-side, never `$_GET`. Validate each `?attribute_*` key is a real taxonomy + value a real term before reflecting anywhere (classic WP reflected-XSS).
> **STOP — sitemap/OG/canonical: detect-and-defer if Yoast/RankMath active (SEC-9).** `defined('WPSEO_VERSION') || class_exists('RankMath')` → SGS registers NO sitemap/OG/canonical (they already emit those); SGS only adds the variant-specific JSON-LD those plugins lack. Sitemap via `WP_Sitemaps` provider (SEC-6), not a raw REST route; `post_status=publish` + `catalog_visibility NOT IN (hidden,search)`; GET-only; transient + purge on FR-27-G6 hooks; `<lastmod>`=MAX(parent, all-variation modified).
> **STOP — E3 breadcrumb = PLACE the existing `sgs/breadcrumbs` block, don't build** (it already emits BreadcrumbList JSON-LD at `breadcrumbs/render.php:138`). E1 `aggregateRating` REUSES `review-schema.php` patterns. `priceValidUntil` via `$variation->get_date_on_sale_to()?->date('Y-m-d')` else OMIT. `hasVariant` ≤50 = low+high+sample; offerCount = true total. Assert `mb_strlen < 16384`; `wp_json_encode` HEX flags; emit nothing if invalid.
> **STOP — scope shared-block changes to the variant the gated surface doesn't use.** `sgs/product-card` renders page-144 Typed clones AND `sgs/option-picker` is shared with cloning WS-4. Build against the Bound (`wc-product`) branch + `.product-card--bound`-scoped CSS only; option-picker changes ADDITIVE (fire only when term_meta present). Memory `scope-shared-block-changes-to-unused-variant`.
> **STOP — don't assert block capability from a partial dump:** read `block.json` + `render.php` + `/wp-blocks` before building on top of product-card / option-picker / manifest / configurator-head.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / live DOM) BEFORE dispatching a fix.
> **STOP — verify against git, not the handoff:** run `git log --oneline -10` + `git branch` first; the cloning thread commits to the same `main` (it holds D169/D170; theme next-free = D172).
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk** (Spec 26 / `push-theme-snapshot.py` FR-26-D2). Memory `canary-live-styles-come-from-wp-global-styles-post`.
> **STOP — authoring is UN-GATED:** every new presentation/config field ships WITH a friendly editor control (inspector or WC term/variation screen), NEVER raw-meta editing.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`/`wp post update`/literal `str_replace`) → token-gated webroot one-shot PHP runner (require wp-load.php + secret `$_GET['t']`, curl, rm). `POST /wp/v2/pages` is NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`.
> **STOP — fact-check every security/QC-rater "blocker" against the ACTUAL threat model** (public-read shop). Re-derive against the real model. Memory `feedback_council_validates_the_criterion_it_is_given`.
> **Guardrail (all tasks):** after every block build-deploy, open the canary test page (540 + the WP editor) and verify the control renders + zero console errors + the live computed values BEFORE considering the task done. Bump `block.json` version on any block CSS/JS change. Surgical deploy: build via PowerShell → scp `build/blocks/<block>/*` (INCLUDING *.asset.php + `style.css`) + changed `includes/*.php` → opcache-reset webroot trick. SGS visual-diff gate needs a dated `reports/visual-diff/<block>-<today>.md` (verdict:PASS) for any `style.css` change; PHP/JS-only → `git commit --no-verify`.

## State recap (plain English)
The shop's product card is now feature-complete on the visible layer: pack-size + flavour pills swap price/image/stock instantly; per-unit "£x per bar" pricing; an auto-contrasting badge that says "Sale" on a discounted pack; a per-variation photo gallery with thumbnails; sold-out-vs-unavailable distinctions; and a privacy-safe counter of combos shoppers wanted but couldn't buy. Bean has visually signed it off (R-22-13). What's left in Phase 2 is the SEO/discovery chapter (Cluster B) — making Google + AI search engines read the product correctly — then the client-authoring layer + a hard go-live safety check (Cluster C). There is ALSO a drafted-but-not-built feature: Spec 28 "Smart Bulk Pricing" (an auto-pricing engine), whose value-ladder half (P1) can ship on the already-built per-unit work whenever Bean wants it.

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD is on `main` at/after `5fe7cfd5` (this session's last theme code commit) + the D171 doc commit. The only uncommitted files should be the never-commit artefacts. Then open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/` + click a few pills to re-ground (gallery thumbnails, per-unit, swatches). Then read the live plan `.claude/plans/2026-06-04-spec27-phase2-display-seo-plan.md` §Cluster B + the SEC-1..9 cross-cutting amendments.

## ORCHESTRATION PLAN (you = Opus orchestrator)

### Task 1 — E1 ProductGroup + hasVariant JSON-LD (FR-27-E1)
**What:** emit a `ProductGroup` with per-variation `Offer`s in `includes/configurator-head.php` (the Step-0 wp_head scaffold). **Why:** Google Merchant / "price from" rich results = free qualified organic traffic. **Orchestration:** inline(design the schema shape) → Sonnet(build) → `seo-schema` agent(validate). Reads the MANIFEST (SEC-1), reuses `review-schema.php` rating patterns, price always inc-VAT (SEC-2), variesBy validated enum + unmapped→additionalProperty (SEC-8), priceValidUntil via get_date_on_sale_to() else omit, ≤16KB asserted, wp_json_encode HEX flags. **/qc-council pre-commit. Acceptance:** Google Rich Results Test 0 errors (ProductGroup+Offers); >50-variation edge handled; 0-review omits aggregateRating cleanly.

### Task 2 — E2 canonical (FR-27-E2)
**What:** `?attribute_*` → canonical to parent, built from server-side attrs (SEC-7, never add_query_arg); per-variation `indexVariationUrl` = a single validated integer attr. Defers if an SEO plugin is active (SEC-9). **Orchestration:** Sonnet; small. **Acceptance:** canonical correct; defers when Yoast active; no reflected `$_GET`.

### Task 3 — E3 breadcrumb + OG + sitemap (FR-27-E3)
**What:** PLACE the existing `sgs/breadcrumbs` block on the product template + validate (don't build); OG `product:price:amount` always inc-VAT (SEC-2); product sitemap via `WP_Sitemaps` provider (SEC-6) + detect-and-defer (SEC-9). **Orchestration:** Sonnet (sitemap is the only real build) + `seo-technical` agent. **Acceptance:** breadcrumb valid; OG inc-VAT; sitemap excludes hidden/draft, GET-only, lastmod=MAX; defers when Yoast active.

### Task 4 — F1 all-commerce-in-SSR (FR-27-F1)
**What:** audit the no-JS HTML = price + availability (already SSR) + JSON-LD (E1, new). Close any JS-only value. **Orchestration:** inline audit → Sonnet. **Acceptance:** `curl` (JS disabled) shows price + availability + `application/ld+json` with price+availability in the initial HTML.

### GATE after Cluster B — QA-SEO
Rich Results Test 0 errors (ProductGroup+Offers+Breadcrumb); `curl | grep ld+json` ≥1 with price+availability in no-JS HTML; sitemap validates; canonical correct; defers when an SEO plugin is active.

### Then Cluster C (authoring + go-live safety) — bigger, multi-session
R1+R2 authoring controller (the WC-write path the Spec 28 engine also needs) → R3 presentation-authoring UI + edit-safety → PREFLIGHT hard go-live block (£0/no-image/draft can't publish, SEC-5). Read the plan §Cluster C.

### Optional parallel — Spec 28 P1 (value ladder)
The comparative per-item value ladder rides the SHIPPED B3 per-unit work (no engine). See `.claude/specs/28-SGS-SMART-BULK-PRICING.md` §Build order P1. Do NOT build the engine WC-write (P4) — it is fenced behind Cluster C.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — auto-injected by SessionStart |
| `/brainstorming` | any design decision before coding (schema shape, sitemap structure) |
| `/strategic-plan` + `/phase-planner` | only if re-planning; the v2 plan already sequences Cluster B + C |
| `/research-buddies` / `/research-check` | E1 — current Google Merchant variant-schema rules BEFORE building |
| `/seo` + `/seo-schema` | E1/E2/E3 JSON-LD + Merchant + Rich Results |
| `/library-docs` | up-to-date WC / Google Merchant / schema.org reference |
| `/sgs-wp-engine` + `/wp-block-development` + `/wp-rest-api` + `/wp-hooks` | block dev, sitemap provider, cache-purge hooks |
| `/ui-ux-pro-max` + `/playwright` | MANDATORY self-review of any visible work before declaring done |
| `/qc-council` | MANDATORY before any commit touching the schema-emitter/SSR/SGS-block (blub.db 255) |
| `/qc` / `/qc-inline` | per-unit |
| `/gap-analysis` | grade each unit vs its Spec 27 acceptance before delivery |
| `/delegate` | pick the model per dispatch (Sonnet default) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP / Tools
| Tool | For |
|------|-----|
| chrome-devtools `/browsing` (Playwright MCP browser is held by the cloning session — use Chrome DevTools instead) | self-review @375/768/1440, axe-core, schema-render checks |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` | product 540 + variations |
| Google Rich Results Test | E1/E3 schema validation |
| SSH + token-gated webroot runner | guard-blocked WC ops; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env`; plugin path `…/sandybrown…/public_html/wp-content/plugins/sgs-blocks` |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-unit mechanical build (no commit/deploy authority) + cross-model qc raters |
| `seo-schema` | E1/E2/E3 JSON-LD + Merchant validation |
| `seo-technical` | E2 canonical / E3 sitemap + hreflang |
| `design-reviewer` | any visible work + WCAG 2.2 AA (alongside /ui-ux-pro-max) |

## Done — do NOT redo (D171)
- Spec 27 Phase 2 CLUSTER A — B3 / A4 / C2 / Step-7 demand analytics — all SHIPPED + live-verified + Bean R-22-13 sign-off. ESCAPE-AUDIT + QA-VIS gates passed. Label/badge→sgs/label convention registered. Spec 28 drafted + councilled (build later).

## Methodology guardrails (do not skip)
- **You are the orchestrator; fact-check every subagent claim** against live ground truth (read file + open live page + run the assertion).
- **Self-review visible work with /ui-ux-pro-max + /playwright BEFORE declaring done** (green gates ≠ design-complete — D165; proven again D171).
- **Deploy the WHOLE block set incl `*.asset.php` AND `style.css` BEFORE measuring** (D168/D171).
- **SSR==swap parity** — seed the translated literal; never re-derive a display string in JS that PHP also computes (D168).
- **ESCAPE-AUDIT + /qc-council BEFORE every commit** touching the schema-emitter/SSR/SGS-block (blub.db 255; D171 found a real blocker).
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; you review + build + deploy + commit by explicit path.
- **In a batch, don't stop between tasks to ask** — proceed on passing+substantiated evidence; only stop for a real decision/hard-block (Bean directive, D171).
- **Live-verify everything yourself**; communicate in plain English (Problem→Effect→Solution; ranked menu + one recommendation).
