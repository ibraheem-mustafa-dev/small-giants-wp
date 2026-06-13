---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-12-theme-spec30-p2-step9-schema-SHIPPED-D215-next-step10
generated: 2026-06-12
primary_goal: "SGS-THEME THREAD. Spec 30 P2 Step 9 (FR-30-9 schema) SHIPPED + live-verified (D215), committed 8645a472 on feat/spec30-p2-shop-schema (NOT merged — Step 12 merges via temp-worktree). Organization+WebSite JSON-LD (front-page-only, @ids, 7-plugin SEC-9 defer, NO SearchAction) + store-page noindex (cart/checkout/account/wc-endpoint; money pages safe) + shared HEX encoder + returnPolicyCountry (regex-guarded, live GB) + accordion FAQPage HARDENED (FAQPage KEPT not deleted — research reversal: Google dropped the rich result but AI/Bing still use it) + VAT-honest llms label. 5-persona adversarial-council (NO-GO v1 → locked §F) + cross-family review + live canary verify (draft-leak closed, 0 SearchAction, noindex both directions). NEXT = Step 10 (parked P1: gallery-variation-swap decision + notify-me build/defer) → Step 11 (go-live checklist) → Step 12 (phase close + R-22-13 + merge to main). Opus orchestrator, sonnet dispatch, /qc-council + /adversarial-council before any schema/SGS-block commit, plain English to Bean."
---

# Next Session — SGS THEME thread — Spec 30 P2: Step 9 schema DONE → execute Steps 10–12 (parked follow-ups + go-live + close)

> ## SESSION CLOSE (2026-06-12, theme thread — READ FIRST) — STEP 9 FR-30-9 SCHEMA SHIPPED + LIVE-VERIFIED (D215)
> **FR-30-9 structured-data completeness is built, live-verified on the canary, and committed `8645a472` on `feat/spec30-p2-shop-schema` (NOT merged — mid-phase; Step 12 merges via temp-worktree).** NEW `class-org-website-schema.php` (Organization+WebSite, front-page-only, stable `@id`s `#organization`/`#website`, `WebSite.publisher`→org, NO SearchAction, identity-only fields, SEC-9 detect-and-defer widened to **7 SEO plugins**, dismissible admin notice) + NEW `class-noindex-store-pages.php` (noindex cart/checkout/account/wc-endpoint; negative-guard-first keeps shop/PDP/home/category indexable) + NEW `class-sgs-schema.php` (shared `Sgs_Schema::encode_jsonld()` HEX encoder; `Product_Schema::encode()` delegates) + `returnPolicyCountry` on PDP+Org (regex `^[A-Z]{2}$`, runtime-only) + accordion FAQPage HARDENED (HEX flags + `wp_strip_all_tags` + false-guard + honest AI/Bing copy) + VAT-honest llms label ×3 (`vat_suffix()` on `woocommerce_calc_taxes==='yes'`). **The plan's "delete FAQPage" was REVERSED by research** — Google dropped the FAQ *rich result* (May 2026) but FAQPage still feeds AI search (ChatGPT/Perplexity/AI Overviews) + Bing; `product-faq` KEPT unchanged. **Live-verified (canary, R-22-11):** front page Organization+WebSite+`@id`s+publisher + **0 SearchAction sitewide**; **draft 1017 as guest → 404, 0 ProductGroup** (draft-leak closed); noindex on cart+my-account, ABSENT on shop/home/PDP; **`returnPolicyCountry:"GB"`** confirmed via seed→verify→restore (canary restored clean). Design gate = 5-persona `/adversarial-council` (NO-GO v1 → all findings fact-checked against live code → locked §F contract). Deferred→parking: **F10** hex-flag CI guard, **F5** org `sameAs`/`contactPoint` settings UI, **F8** zero-rated-VAT precision. Design docs: `.claude/reports/spec30-p2/FR-30-9-{schema-design-gate,LOCKED-CONTRACT}.md`.
>
> **RESUME at Step 10** of `.claude/plans/2026-06-11-spec30-p2-differentiators-shop-schema.md` (its `## PROGRESS` marker + `## Ground truth` block are updated — READ BOTH). Order: **Step 10** (parked P1: gallery-variation-swap decision + notify-me build/defer; serialise on the buybox) → **Step 11** (FR-30-13 go-live checklist; fold in the zero-rated-VAT edge + org-data-completeness items) → **Step 12** (phase close + `/qc-council` full P2 diff + `/sgs-update` + Bean R-22-13 + merge to main via temp-worktree). After Step 12, Spec 30 is COMPLETE and SGS is a sellable shop. FR-30-12 product-page clone stays UNGATED (cloning thread's call).
>
> **⚙️ BINDING ORCHESTRATION MODEL (Bean directive 2026-06-11):** Opus main agent does ONLY plan / delegate / QC / live-test / commit. ALL block/PHP/JS/CSS implementation DELEGATED to sonnet subagents (return uncommitted diffs, NO commit/deploy authority). Main agent QCs (`/qc-council` + `/adversarial-council`, fact-check EVERY rater claim against live code/axe/DOM), deploys + live-verifies on canary HIMSELF, then commits. SendMessage corrections back; never retype a subagent's file. (Narrow exception: trivial config tweaks — version bumps, a single attribute, a `phpcs:ignore` comment, a one-line template placement.)
>
> **CO-ACTIVE TREE WARNING (live):** the cloning thread shares the primary worktree + `main`, and `origin/main` is ACTIVELY MOVING (cloning thread pushing — was at a cloning-thread commit at this session's close, divergent from the theme work). The feat branch `feat/spec30-p2-shop-schema` carries BOTH threads' commits. Commit by EXPLICIT PATH (`git commit -- <paths>`), NEVER `git add -A`/bare commit. Merge to main via an ISOLATED temp worktree (`git worktree add --detach <tmp> origin/main` → cherry-pick the theme commit(s) → push HEAD:main → `git worktree prune`); NEVER `git checkout main` in the primary worktree. Never `git revert/restore/stash/clean` the shared tree. After pushing, fast-forward local main + verify `git merge-base --is-ancestor`. **Do NOT attempt a mid-phase merge of one commit onto the divergent main — Step 12 lands the coherent theme work with full attention.**

## READ BEFORE ANYTHING ELSE — warm-start + STOP catalogue (carried forward + extended; do NOT subtract)
- **STOP — verify the branch before EVERY commit.** `git branch --show-current` + `git log origin/main --oneline -5`. `main` is shared with the co-active cloning thread (it holds the tree + pushes to main). Commit path-scoped (`git commit -m "..." -- <paths>`); merge to main via temp-worktree cherry-pick. Leave never-stage artefacts untouched: `lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `.parity-golden.json`, phase4 reports, build/, and the cloning thread's `convert.py`/`db_lookup.py`/testimonial/conformance fixtures.
- **STOP — new block-theme `patterns/*.php` won't register until the theme `style.css` `Version:` BUMPS** (WP caches the pattern-file list against the theme version) + `wp transient delete --all`. (D214.)
- **STOP — for an expand-on-click control, use native `<details>`/`<summary>`, not a JS-only toggle** (works no-JS, a11y for free; JS only enhances). (D214.)
- **STOP — WC filter/collection markup must match WooCommerce's CANONICAL `templates/blockified/archive-product.html`** — each `product-filter-*` parent MUST nest its inner control block; `displayStyle` = the FULL block name; `product-collection` needs `tagName:"div"` + wrapper div + `queryId:0`/`isProductCollectionBlock:true` or no `data-wp-router-region` + instant filtering dies. (D213.)
- **STOP — there is NO global `.btn`/`.btn-primary` in the theme** — those live ONLY in `product-card/style.css` scoped to `.product-card`. Reuse design TOKENS or extract a global utility (parked P-NO-GLOBAL-BUTTON-COMPONENT).
- **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change; scp the WHOLE block set; opcache-reset; verify the served `?ver`.** Plugin build output is `plugins/sgs-blocks/build/blocks/<block>/`. `build/` is gitignored (src is the git SoT; the server gets build/ via scp).
- **STOP — bump block.json version with ANY block style.css change; bump theme `style.css` Version with ANY theme `assets/css/*.css` change OR new `patterns/*.php`** (TWO cache-bust mechanisms — Hostinger CDN caches 7 days on ?ver). A probe contradicting a fresh deploy → check the served ?ver FIRST.
- **STOP — typography controls use the shared `TypographyControls` + `sgs_typography_css_rule()` (D209), NEVER bespoke blank-box font controls.**
- **STOP — a guard on ONE write path is not a guard; enumerate every path. `show_in_rest:false` on PHP-authored metas; strict `'1'===(string)$v` casts, never `(bool)`.**
- **STOP — REST/one-shot gates CANNOT see admin/editor/shop visual defects; a Playwright/chrome-devtools pass at 375/768/1440 is MANDATORY for any new admin/editor/shop UI.**
- **STOP — clean up superseded controls when changing a block** (ONE control per setting; audit duplicate/dead/render-without-control/vestigial; the dead-control guard is BLIND to render-without-control).
- **STOP — WC products edit in the CLASSIC screen, not Gutenberg** (`use_block_editor_for_post_type('product')` FALSE — no PluginPrePublishPanel for products).
- **STOP — a file-scope `extends \WC_*` class fatals the WHOLE site if required before WC loads; require inside `woocommerce_loaded` + a parse-time `class_exists` guard. After bootstrap-wiring deploys: curl the front page FIRST.**
- **STOP — a CPT capability map with SINGULAR meta-caps breaks the mapped capability SITE-WIDE; use plural primitives; probe the live admin after any CPT-registration change.**
- **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), not theme.json on disk.**
- **STOP — public product/text/XML endpoints: enumerate WC visibility states (`visibility=>'catalog'`/`'search'`), read raw `$post->post_password`, entity-decode display strings, single-flight lock + item cap, `?cb=` CDN-bust when verifying.**
- **STOP — schema/OG/feed price ALWAYS inc-VAT *value* + from the MANIFEST; never `wc_get_price_to_display`/`get_children` in schema/feed emitters; ONE Product/ProductGroup node per PDP.** (Note: the inc-VAT *VALUE* is correct; the *LABEL* "inc. VAT" must be gated — see the new VAT STOP below.)
- **STOP — FAQPage is NOT dead — KEEP it (REVERSED 2026-06-12, D215).** Google dropped the visual FAQ *rich result* (7 May 2026) but `FAQPage` is still a valid schema type consumed by AI search (ChatGPT/Perplexity/AI Overviews) + Bing + Google page-understanding; spec FR-30-9 carves out "FR-27-F2's AI-citation FAQ blocks keep their non-Google framing." `product-faq` + `accordion` BOTH emit FAQPage (hardened with HEX flags + `wp_strip_all_tags`). Do NOT delete them; frame the copy as AI/Bing, never "Google rich result". (Supersedes the old "FAQPage is DEAD, drop it" entry — falsified by research.)
- **STOP — NO static fake reviews (UK DMCC Act, displaying trader liable); Trustpilot/verified-buyer only. aggregateRating gate reads WC-NATIVE review count (omit, never stub the Trustpilot score).**
- **STOP — never hardcode "inc. VAT" labels (NEW, D215).** UK VAT only above the ~£90k registration threshold; most clients (incl. canary, `woocommerce_calc_taxes='no'`) charge none. Gate every "(inc. VAT)" label on `get_option('woocommerce_calc_taxes')==='yes'`; bare "Price:" otherwise. Schema must NEVER emit `valueAddedTaxIncluded:true` unless VAT actually applies. Memory `inc-vat-not-default-gate-on-vat-registered`.
- **STOP — before executing any "delete/remove X because it's dead/deprecated" step whose deprecation date post-dates the knowledge cutoff, web-verify the current status FIRST (NEW, D215).** Deprecations are often partial (visible feature removed, data path still used). Default KEEP+reframe over DELETE when the value path is uncertain. Bean asking "are you sure?" on a deletion = a mandate to research, not reassure. Memory `research-before-executing-delete-on-deprecation-premise`.
- **STOP — new sitewide identity schema (Organization/WebSite) is FRONT-PAGE-ONLY + must SEC-9 detect-and-defer across the 7-plugin market (NEW, D215)** — Yoast/RankMath/SEOPress/AIOSEO/SEO-Framework/Slim-SEO/Squirrly (drop the brittle `class_exists('RankMath')`; use `defined('RANK_MATH_VERSION')`). Sitewide emit duplicates on paginated pages + risks full-page-cache-across-auth-context; front-page-only avoids both. Give nodes stable `@id`s.
- **STOP — every JSON-LD echo via the shared `Sgs_Schema::encode_jsonld()` HEX-flag encoder (NEW, D215)** — `JSON_HEX_TAG|HEX_AMP|HEX_APOS|HEX_QUOT|UNESCAPED_SLASHES|UNESCAPED_UNICODE`. NEVER bare `json_encode` or `esc_attr`/`esc_html` as the JSON-LD escape. Sanitise operator option values (`esc_url_raw` per URL dropping `javascript:`, `sanitize_text_field` on text) before encoding. Guard `wp_json_encode`'s `false` return.
- **STOP — passing automated gates ≠ DONE (design + operational + legal); expect Bean's R-22-13 eye to catch more.**
- **STOP — fact-check EVERY subagent/rater claim against live ground truth (code + axe + live DOM) before acting; rater findings are HYPOTHESES.** (This session: an adversarial-council found a REAL second FAQPage emitter + 3 existing Org nodes — confirmed by grep before acting.)
- **STOP — build via PowerShell (`npm run build`), NOT Bash (broken node wrapper); WP guard-blocked ops via token-gated webroot one-shot; `POST /wp/v2/pages` is NOT guard-blocked; the creds file `.claude/secrets/sandybrown.env` has an unquoted `)` — parse with grep/cut, never `source`.**
- **STOP — dispatched agents have NO commit/deploy authority; they return uncommitted; the orchestrator reviews + live-verifies + deploys + commits. A rater must NEVER `git checkout/restore/stash/clean` the shared tree.** Send corrections via SendMessage; the agentId persists.
- **STOP — a subagent's truncated/cut-off final message = possible PARTIAL work in the tree (NEW, D215).** Verify what actually landed (`git status` + grep the contract checkpoints), not the report. Recover with ONE tight follow-up agent. (This session: a build agent overflowed mid-summary, leaving the noindex emitter + bootstrap wiring unbuilt — caught by grep, recovered.)
- **STOP — WC 10 ships `woocommerce_coming_soon=yes` by default** (masks store pages for guests). Canary is `no`. FR-30-13 go-live item.
- **STOP — WC fixture = product 540 (`mamas-test-box-48-sku-fixture`, published 48-SKU variable); product 1017 is a DRAFT.** Verify a fixture's post_status before writing tests.
- **STOP — a `wp:html` block CANNOT wrap a following WP block** (use `wp:group {"tagName":...}`). Live-probe `element.children` after building any block-theme layout.
- **STOP — theme `contentSize` 780px / `wideSize` 1200px** (theme.json L297-298). A wide shop layout needs `align:wide` on the DIRECT child of the constrained `<main>`.
- **STOP — the SGS visual-diff pre-commit gate** (`.git/hooks/pre-commit`) blocks any commit touching `plugins/sgs-blocks/src/blocks/<block>/` until `reports/visual-diff/<block>-<TODAY>.md` exists with `verdict: PASS` + `first_paint_capture_passed: true`. **For a NON-VISUAL block change (schema/PHP-logic/editor-copy only, frontend render byte-identical), the gate's own message sanctions `git commit --no-verify`** (D215 used this for the accordion schema/copy change). For a VISUAL change, write the report.
- **STOP — `sgs/product-card` has a loop-context mode** (`usesContext: postId`): binds to the loop's current product inside a `woocommerce/product-template` with `sourceMode=wc-product` + no explicit `productId`.
- **STOP — on Playwright MCP "Browser is already in use" (co-active thread holds it), switch to the chrome-devtools MCP / a self-contained Playwright CLI script** (own browser, no MCP lock). curl is sufficient for HTML-source/schema/noindex probes (this session verified Step 9 entirely via curl).

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (theme/blocks — NOT the cloning pipeline.)
2. What branch is the working tree on? (`git branch --show-current`.) Has `origin/main` moved? (`git log origin/main --oneline -5` — it is ACTIVELY moving.) Is the cloning thread's work in the index right now? (`git status` — if so, commit ONLY by explicit path.)
3. Have I read Spec 30 (FR-30-1..13) + D208/D209/D213/D214/**D215** + the plan's PROGRESS + Ground truth blocks end-to-end before proposing a build sequence?
4. What is the MEASURABLE acceptance for the task I'm about to start (FR criterion + Bean's eye), not "code shipped"?
5. Will this change be visible on a live URL? If so — deploy (build + scp whole block set + asset.php + opcache-reset + verify ?ver) BEFORE measuring.

## State recap (plain English)
The shop is done AND the structured-data (schema) layer is now done too: the site tells Google and AI search engines who the business is (`Organization`/`WebSite`), keeps cart/checkout/account pages out of search, declares the return-policy country, and the FAQ data is kept + hardened for AI search and Bing (Google dropped the *visual* FAQ result but the data still helps). Prices never falsely say "inc. VAT" for businesses below the VAT threshold. All of this is live-verified on the canary and committed (not yet merged — that happens at phase close). The remaining Spec 30 work is small: a couple of parked decisions (gallery image swap, a "notify me when back in stock" capture), a go-live checklist, then the final phase close with Bean's visual sign-off and the merge to main.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — any architectural/design call (the gallery-swap decision, notify-me design) |
| `/gap-analysis` | ALWAYS — grade any unit vs its FR acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — PECR/consent capture rules, WC notify-me patterns, gallery Interactivity context |
| `/strategic-plan` + `/phase-planner` | only if a step needs re-planning; the consolidated plan covers 10–12 |
| `/adversarial-council` | MANDATORY PII/consent red-team on the notify-me capture (Step 10) |
| `/qc-council` | MANDATORY before any REST/SGS-block commit (blub.db 255) — Step 10 notify-me + Step 12 full diff |
| `/subagent-driven-development` + `/dispatching-parallel-agents` | implementer→review loops; disjoint steps |
| `/subagent-prompt` | cold dispatch prompts (embed contract verbatim) |
| `/sgs-wp-engine` + `/wp-plugin-development` + `/wp-rest-api` | notify-me REST endpoint build |
| `/sgs-update` | after any block add/change |
| `/delegate` | model per dispatch (sonnet default; haiku/gemini-flash = 2nd council family) |
| `/verify-loop` | 2-attestation on any consent/rate-limit claim |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools / Playwright (switch to chrome-devtools or a self-contained Playwright CLI if MCP "Browser already in use"); curl for HTML/schema/noindex probes | live verification + screenshots + 3-breakpoint + axe |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | products + options |
| SSH + token-gated webroot one-shot | guard-blocked WC ops + `wp eval`; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary webroot `domains/sandybrown-nightingale-600381.hostingersite.com/public_html`; creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | the notify-me capture build (PECR-guarded REST + buybox UI) — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku / gemini-flash) | security / 2nd-council-family review on the consent/PII pass |
| design-reviewer | visual verify of any new visible surface (notify-me UI; Step 12 3-breakpoint set) |

## Dependency graph
```
Step 10a gallery-variation-swap DECISION (inline Opus → decisions.md; build only if driven + a multi-image variation fixture exists)
Step 10b notify-me: /adversarial-council PII/consent red-team → sonnet build (PECR guards) → main agent live-tests consent+rate-limit + commits   ‖  serialise on buybox (after FR-30-8 edits, already committed)
  ↓ /qc-council + /adversarial-council
Step 11 FR-30-13 go-live checklist doc (sonnet; fold in zero-rated-VAT edge + org-data-completeness)
  ↓
Step 12 phase close — /qc-council full P2 diff + /sgs-update + Bean R-22-13 3-breakpoint sign-off + merge to main (temp-worktree cherry-pick) + archive the plan
```

## Task 1 — Step 10: parked P1 follow-ups (gallery-swap decision + notify-me)
**What:** (a) **P-WC-GALLERY-VARIATION-SWAP** — decide driven-into-Beta-gallery (`selectedImageId` → gallery Interactivity context from the buybox bridge; version-fragile) vs static-per-variation (current). Record the decision + rationale in `decisions.md`; build ONLY if driven AND a multi-image variation fixture exists. (b) **P-WC-NOTIFY-ME-CAPTURE** — build the PECR-guarded capture endpoint (`sanitize_email`+`is_email`+nonce+≤3/IP/hour+un-pre-ticked consent+privacy link, store email+product_id+timestamp ONLY, data stays in WP) + wire the buybox notify-me UI; remove the `notifyMeLabel` dead-control baseline entry on ship — OR explicitly re-defer with a recorded reason.
**Why:** clears the last parked P1 items so Step 12 closes cleanly. **Estimated:** 10 min (decision) / 40 min (notify-me build).
**Orchestration:** 10a INLINE Opus decision. 10b: `/adversarial-council` (PII/consent red-team) → delegate the build to sonnet with the PECR guard list → main agent live-tests consent+rate-limit himself + `/qc-council` + commits. Serialise on the buybox (FR-30-8 edits already committed).
**Acceptance:** gallery decision recorded with rationale; notify-me submit stores email+product_id+timestamp ONLY, consent required (un-ticked → no store), 4th submit/IP/hour → rejected, `sanitize_email` enforced — OR a recorded re-defer reason. **/qc gate:** `/adversarial-council` + `/qc-council`.

## Task 2 — Step 11: FR-30-13 go-live checklist doc
**What:** versioned go-live doc (gateway LIVE-mode / return-policy populated / review source connected / per-unit denomination strings / product-data sku-gtin sweep / allergen statutory content / FR-30-11 responsive-audit on the LIVE site / cookie-consent if any capture active / `woocommerce_coming_soon=no`), each item with a named probe/manual step. **Fold in the two council-surfaced items:** (1) confirm the client's VAT-registration state matches the price labelling (the zero-rated-VAT edge — F8/parking P-VAT-ZERO-RATED-PRECISION); (2) Organization-data completeness (logo/address/`sameAs` set, or consciously blank — F5/parking P-ORG-SCHEMA-SETTINGS-UI). **Estimated:** 25 min. **Orchestration:** delegate the doc to sonnet; main agent reviews.
**Acceptance:** checklist doc exists, each item has a named probe/manual step, the two new items present.

## Task 3 — Step 12: phase close + R-22-13 + merge
**What:** `/qc-council` on the full P2 diff (security + logic raters); `/sgs-update` (new blocks/emitters); present 3-breakpoint screenshots of every new visible surface (PDP price coupling, reviews, shop archive, search, filter; schema has no visible surface) to Bean for R-22-13 sign-off; path-scoped commit(s) + **merge to main via temp-worktree cherry-pick** (the theme thread's coherent Spec 30 P2 work — D215 commit `8645a472` + any Step 10/11 commits — landed onto the actively-moving `origin/main`, cloning WIP untouched); archive the plan at close. **Estimated:** 25 min. **Orchestration:** inline.
**Acceptance:** merged; Spec 30 all-FR Done-whens green; plan archived; SGS is a sellable shop.

## Parked / optional (Bean's choice, not blocking)
- **F10** P-JSONLD-HEX-FLAG-GUARD (build `check-jsonld-hex-flags.js` prebuild gate); **F5** P-ORG-SCHEMA-SETTINGS-UI (operator UI for org `sameAs`/`contactPoint`); **F8** P-VAT-ZERO-RATED-PRECISION (per-product tax-rate gate). All in `.claude/parking.md`.
- P-NO-GLOBAL-BUTTON-COMPONENT; P-COLLAPSIBLE-TEXT-DEFAULT-COPY; trust-bar `gridItemPadding` NIT.
- B2B ex-VAT price display (Indus Foods) — Spec 30 Open Q3. Subscriptions/subscribe-and-save — Spec 30 Open Q4.
- FR-30-12 product-page clone (UNGATED) — cloning thread's call.
- **MEMORY.md is at 24558/24576 bytes (at the cap)** — do an archive-pass to `MEMORY-archive.md` before adding the next index pointer (the `research-before-executing-delete-on-deprecation-premise` lesson is in blub.db id 348 + its feedback file but unindexed in MEMORY.md).

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on a live URL needs build (PowerShell) + whole-block-set scp + `*.asset.php` + opcache-reset + ?ver check BEFORE any browser/axe test; else you measure stale output. For a NEW theme pattern, ALSO bump the theme `style.css` Version.
- **Root cause before instance fix** — ask "what's the class of failure?" When a WC block renders wrong, read WC's block.json `ancestor` + canonical template FIRST (D213). When a new pattern won't register, check the theme version (D214). When a subagent report is truncated, grep the tree for what actually landed (D215).
- **Outcome vs completion** — code shipped ≠ outcome achieved; don't mark a task done until its FR acceptance + Bean's eye pass.
- **Fact-check every rater/subagent claim** against live code/axe/DOM before acting — findings are hypotheses (the adversarial-council found REAL bugs this session, confirmed by grep before acting).
- **/qc-council (cross-model) BEFORE every commit** touching schema / REST / SGS-block logic (blub.db 255); `/adversarial-council` MANDATORY on any PII/consent or draft-leak pass.
- **WCAG 2.2 AA, mobile-first, 44px targets, 4.5:1 contrast. UK English everywhere.**
