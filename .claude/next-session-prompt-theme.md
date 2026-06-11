---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-11-theme-R22-13-block-quality-MERGED-D209-next-spec30-wc-pagetype
generated: 2026-06-11
primary_goal: "SGS-THEME THREAD. The R-22-13 block-quality remediation is COMPLETE + merged to main (D209): shared TypographyControls component + sgs_typography_css_rule() helper adopted across 6 blocks (counter/whatsapp-cta/mobile-nav/option-picker/trust-bar/product-card); Wave-1 bug fixes (trust-bar circle/placeholder/badge-size, testimonial italic, notice-banner iconColour, icon alignment); announcement-bar RETIRED → notice-banner displayMode=announcement (sticky/closeable/button); qc-council-gated (security MERGE-OK; dismiss-key content-hash fix). NEXT MAJOR WORK = the WooCommerce page-type build (Spec 30 / D208, delegated from the cloning thread): theme support + single-product/archive block templates + custom SGS search/filter blocks + option-picker→WC variation binding + Mini-Cart drawer styling + schema audit. Opus orchestrator, sonnet dispatch, /qc-council before any WC-write commit, plain English to Bean."
---

# Next Session — SGS THEME thread — R-22-13 block-quality MERGED (D209) — next = WooCommerce page-type build (Spec 30 / D208)

> ## SESSION CLOSE (2026-06-11, theme/blocks thread — READ FIRST) — D209
> **R-22-13 BLOCK-QUALITY REMEDIATION COMPLETE + MERGED to `main` (`bd850804`).** All 12 of Bean's review points shipped across 3 waves on `feat/block-quality-mirror` then FF-pushed to main. Built: shared **`TypographyControls`** component (`src/components/TypographyControls.js`) + **`sgs_typography_css_rule()`** helper (`includes/helpers-typography.php`) — canonical sgs/text UI (responsive size slider+unit, weight/style dropdowns); adopted across 6 blocks (string→number+unit+responsive, legacy-string back-compat). Wave-1 bugs fixed (trust-bar circle border / placeholder / badge-size; testimonial italic; notice-banner iconColour; icon alignment). **announcement-bar RETIRED** → notice-banner `displayMode=announcement` (sticky/closeable/button + view.js, live interaction-tested pages 1080/1096). qc-council finishing gate: security MERGE-OK; dismiss-key per-request bug fixed (content-hash). Typography component now MANDATORY in `plugins/sgs-blocks/CLAUDE.md`. `/sgs-update` reconciled the DB (70 blocks, +72 attrs, announcement-bar pruned). Full record: D209 + `.claude/handoff-theme.md`.
> **THE NEXT MAJOR WORK is the WooCommerce page-type build (Spec 30 / D208)** — delegated to this theme thread from the cloning thread. The product-page clone is GATED on it (deploy to the WC single-product template, not a WP Page).

## READ BEFORE ANYTHING ELSE — warm-start + STOP catalogue (carried forward + extended; do NOT subtract)
- **STOP — verify the branch before EVERY commit.** `git branch --show-current` + `git log origin/main --oneline -5`. `main` is checked out in the cloning thread's worktree `C:/tmp/sgs-p4`; `feat/block-quality-mirror` is a SHARED branch (both threads commit to it). Commit path-scoped (`git commit -m "..." -- <paths>`, never `git add -A`); merge to main via FF-push or a temp worktree, never disrupt the co-active tree. Leave never-stage artefacts untouched: `lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `.parity-golden.json`, phase4 reports, build/.
- **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change; scp the WHOLE block set; opcache-reset; verify the served `?ver`.** WP reads each block's `style.css`, not `style-index.css`.
- **STOP — bump block.json version with ANY style.css change** (Hostinger CDN caches block CSS 7 days on the ?ver URL; a probe contradicting a fresh deploy → check the served ?ver first).
- **STOP — typography controls use the shared `TypographyControls` + `sgs_typography_css_rule()` (D209), NEVER bespoke blank-box font controls** (see plugins/sgs-blocks/CLAUDE.md Block Customisation Standard). Font size = responsive RangeControl + unit; weight/style = dropdowns; one default per tag (no token-slug size picker).
- **STOP — a guard on ONE write path is not a guard; enumerate every path. `show_in_rest:false` on PHP-authored metas; strict `'1'===(string)$v` casts, never `(bool)`.**
- **STOP — REST/one-shot gates CANNOT see admin/editor defects; a visual pass (Playwright at 375/768/1440) is MANDATORY for any new admin/editor/shop UI.**
- **STOP — clean up superseded controls when changing a block** (ONE control per setting; audit duplicate/dead/render-without-control/vestigial; the dead-control guard is BLIND to render-without-control).
- **STOP — WC products edit in the CLASSIC screen, not Gutenberg** (`use_block_editor_for_post_type('product')` FALSE — no PluginPrePublishPanel for products).
- **STOP — a file-scope `extends \WC_*` class fatals the WHOLE site if required before WC loads; require inside `woocommerce_loaded` + a parse-time `class_exists` guard. After bootstrap-wiring deploys: curl the front page FIRST.**
- **STOP — a CPT capability map with SINGULAR meta-caps breaks the mapped capability SITE-WIDE; use plural primitives; probe the live admin after any CPT-registration change.**
- **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), not theme.json on disk.**
- **STOP — public product/text/XML endpoints: enumerate WC visibility states (`visibility=>'catalog'`), read raw `$post->post_password`, entity-decode display strings, single-flight lock + item cap, `?cb=` CDN-bust when verifying.**
- **STOP — schema/OG/feed price ALWAYS inc-VAT + from the MANIFEST; never `wc_get_price_to_display`/`get_children` in schema/feed emitters; FAQPage is DEAD (drop it, Google removed the appearance 2026-05-07); ONE Product node per PDP.**
- **STOP — NO static fake reviews (UK DMCC Act in force 2026-04-06, displaying trader liable); Trustpilot/verified-buyer only.**
- **STOP — passing automated gates ≠ DONE (design + operational + legal); expect Bean's R-22-13 eye to catch more.**
- **STOP — fact-check EVERY subagent/rater claim against live ground truth before acting; rater findings are HYPOTHESES (this session: BLOCKER #1 was a false positive caught by checking the isBuiltIn gate).**
- **STOP — build via PowerShell (`npm run build`), NOT Bash; WP guard-blocked ops via token-gated webroot one-shot (native PHP, quoted string literals); `POST /wp/v2/pages` is NOT guard-blocked; the creds file `.claude/secrets/sandybrown.env` has an unquoted `)` — parse with grep/cut, never `source`.**
- **STOP — dispatched agents have NO commit/deploy authority; they return uncommitted; the orchestrator reviews + live-verifies + deploys + commits. A rater must NEVER `git checkout/restore/stash/clean` the shared tree (wiped uncommitted work 2026-06-09).**

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (theme/blocks — NOT the cloning pipeline.)
2. What branch is the working tree on? (`git branch --show-current`.) Has origin/main moved? (`git log origin/main --oneline -5`.)
3. Have I read Spec 30 (FR-30-1..12) + D208 + D209 end-to-end before proposing a build sequence?
4. What is the MEASURABLE acceptance for the task I'm about to start (FR criterion + Bean's eye), not "code shipped"?
5. Will this change be visible on a live URL? If so — deploy (build + scp whole block set + opcache-reset + verify ?ver) BEFORE measuring.

## State recap (plain English)
The block library's quality + consistency pass is done and on main: every per-element font control across the framework now uses one shared, uniform component (a proper size slider + dropdowns, not blank boxes), the trust-bar/testimonial/notice-banner/icon bugs are fixed, and the flaky old announcement-bar block is gone — replaced by a sticky, dismissible "announcement" mode on the notice banner. The next big job is building the **WooCommerce shop chassis** (Spec 30): the product page needs to be a real WooCommerce product template (not a plain page), with WordPress's native commerce blocks doing the cart/checkout/gallery machinery and SGS custom-building only the differentiated bits (the pill configurator, value-ladder, trust styling, a custom search + filter). The product-page clone can't proceed until this lands.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/brainstorming` | architectural/feature decisions (Spec 30 build sequencing) |
| `/gap-analysis` | grade any unit vs its FR acceptance |
| `/strategic-plan` + `/phase-planner` | plan the Spec 30 build before code |
| `/research` (+ `/library-docs`) | WC block APIs (Store API, `@woocommerce/block-data` variation selectors), 2026 WC block ecosystem |
| `/sgs-wp-engine` + `/wp-block-development` + `/wp-rest-api` + `/wp-plugin-development` | the WP build |
| `/qc-council` | MANDATORY before any WC-write / converter / SGS-block commit (blub.db 255) |
| `/verify-loop` | 2-attestation on load-bearing claims |
| `/ui-ux-pro-max` + chrome-devtools/Playwright | MANDATORY visual pass on any new editor/admin/shop UI |
| `/dispatching-parallel-agents` + `/subagent-driven-development` | disjoint build pieces / implementer→review loops |
| `/sgs-update` | after any block add/change |
| `/delegate` | model per dispatch (sonnet default; haiku = 2nd council family; Gemini account-blocked) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools / Playwright (often HELD by the co-active session) | live editor/shop verification + screenshots + 3-breakpoint |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | products + variations |
| SSH + token-gated webroot one-shot | guard-blocked WC ops; `ssh -p 65002 u945238940@141.136.39.73`; creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | disjoint WP build pieces (templates, blocks, bindings) — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku) | security / 2nd-council-family review |

## Dependency graph
```
Read Spec 30 + D208/D209 (inline, Opus)
  ↓
/strategic-plan + /phase-planner the Spec 30 build (inline, Opus)
  ↓
Build chassis (theme support + templates) → then parallel: search/filter blocks · option-picker→WC binding · Mini-Cart styling · schema audit
  ↓ /qc-council before each WC-write/SGS-block commit
Live-verify on canary (R-22-11) + Bean R-22-13 sign-off → commit + FF-merge to main
```

## Task 1 — WooCommerce page-type build (Spec 30 / D208)
**What:** build the WC page-type chassis the cloned product page needs. **Why:** the product-page clone is GATED on D-1 (deploy to the WC single-product block template, not a WP Page); outcome = a working product template carrying the differentiated SGS UX. **Estimated:** multi-session; first session = plan + the theme-support/template chassis.
**Orchestration:** plan inline (Opus); delegate disjoint build pieces to sonnet subagents (no commit authority) via /subagent-driven-development; /qc-council before any WC-write commit.
**Brief:** read Spec 30 (FR-30-1..12) + D208 end-to-end. Build: `add_theme_support('woocommerce')` + single-product/archive block templates + custom SGS search+filter blocks (framework asset, no per-client licence) + option-picker→WC variation binding via Store API `add-item` (confirm the `@woocommerce/block-data` variation-read selector first) + Mini-Cart drawer styling (core block, style only) + price-display + archive UX + schema per the D-8 table (PDP `Product`+`Offer`+`returnPolicyCountry`+`aggregateRating`/genuine reviews+`BreadcrumbList`, ONE Product node; shop = `BreadcrumbList`+URL-only `ItemList`; cart/checkout/account = none+`noindex`; sitewide `Organization`+`WebSite` no SearchAction; DROP FAQPage). All responsive 375/768/1440. NO static fake reviews (DMCC).
**Acceptance:** FR-30 acceptance criteria met + Bean R-22-13 visual sign-off at 3 breakpoints.
**Depends on:** none. **Parallel with:** sub-pieces parallelise after the chassis lands. **/qc gate after:** /qc-council (cross-model) before every WC-write/SGS-block commit.

## Parked / optional (Bean's choice, not blocking)
- announcement-bar homepage fixture: 1 live instance shows the deleted-block placeholder — re-clone or manually swap to notice-banner announcement mode.
- Refactor the 5 canonical typography blocks (text/heading/button/label/quote) to use the shared `TypographyControls` (they duplicate the pattern inline) — pure consistency.
- trust-bar `gridItemPadding` is inert on a split layout (cosmetic); option-picker `labelFontWeight` block.json position NIT.

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on a live URL needs build + whole-block-set scp + opcache-reset BEFORE any pixel-diff/browser test; else you measure stale output.
- **Root cause before instance fix** — ask "what's the class of failure?" before fixing a specific instance.
- **Outcome vs completion** — code shipped ≠ outcome achieved; don't mark a task done until its FR acceptance + Bean's eye pass.
- **/qc-council (cross-model) BEFORE every commit** touching converter / WC-write / SGS-block logic (blub.db 255).
- **WCAG 2.2 AA, mobile-first, 44px targets, 4.5:1 contrast. UK English everywhere.**
