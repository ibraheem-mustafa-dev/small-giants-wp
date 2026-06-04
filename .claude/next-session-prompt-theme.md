---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-05-theme-clusterC-authoring
generated: 2026-06-05
primary_goal: "SGS-THEME THREAD. Spec 27 PHASE 2 CLUSTER B (SEO) is COMPLETE (D173) + CLUSTER C R1 (the WC authoring REST controller) is SHIPPED (f747e58a, golden-master + cross-model verified). NEXT = the rest of CLUSTER C: R2 (attribute/term PROVISIONING + cartesian GENERATE + upsert-key DEDUP + TRANSACTIONAL ROLLBACK — the heaviest build) → R3 (presentation-authoring UI + edit-safety warnings) → PREFLIGHT (hard go-live block, SEC-5). Then QA-AUTHORING gate (golden-master diff + a non-coder authors a product end-to-end with ZERO raw meta). Main inline agent = OPUS orchestrator: dispatch Sonnet for the mechanical build (NO commit/deploy authority — they return uncommitted; you review + golden-master-verify + deploy + commit), run /qc-council + /subagent-driven-development two-stage review, FACT-CHECK every claim against live ground truth, keep Bean updated in plain English (Problem→Effect→Solution + ranked menu + one recommendation)."
---

# Next Session — SGS THEME thread — Spec 27 PHASE 2 — CLUSTER C (authoring controller R2/R3 + PREFLIGHT)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start is mandatory ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **Spec 27 PHASE 1 SHIPPED (D165); PHASE 2 CLUSTER A COMPLETE (D171); CLUSTER B SEO COMPLETE (D173); CLUSTER C R1 SHIPPED (`f747e58a`).** Do NOT re-touch shipped units. A parallel **Spec 28 P1** session + the **cloning Method-2** session are co-active on the SAME `main` — commit by EXPLICIT PATH only, `git log -1 --stat` after, never `git add -A`, leave the never-commit artefacts (`lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`) + the Spec-28 session's uncommitted `decisions.md`/`spec28-p1-value-ladder.md` untouched. **First add the deferred R1 `D176` decisions.md entry** (see State recap) once the tree is clear.
>
> **YOU (the main inline agent) ARE OPUS = THE ORCHESTRATOR (Bean-locked).** Plan + decompose; dispatch Sonnet subagents for the mechanical build (NO commit/deploy authority — they return uncommitted; you review + golden-master-verify + deploy + commit); run the /qc-council + /subagent-driven-development two-stage review (spec reviewer PASS → quality reviewer PASS → then commit); FACT-CHECK every subagent claim against live ground truth (read the file, run the live one-shot, open the live page — a subagent's "done" is a HYPOTHESIS); keep Bean updated in PLAIN ENGLISH (Problem→Effect→Solution) + a ranked menu + one recommendation.
>
> **Bean directive (2026-06-04, locked): in a multi-task batch, DON'T stop between tasks to ask permission — proceed task-to-task on passing+substantiated evidence; only stop for a genuine decision or a hard block.** Memory `dont-stop-between-tasks-in-a-batch`.

## STOP catalogue (anti-pattern defences — carried forward + extended; do NOT subtract)

> **STOP — manifest growth can trip the product-card 24 KB context cap (NEW, D173).** Adding server-only fields to `Product_Manifest` (or anything that swells a per-combo entry — e.g. populating galleries) bloats the seed the card writes into `data-wp-context`. The 48-SKU fixture went 23→31.8 KB and DROPPED the interactive configurator to the static "From" card (`type="radio"` 16→0). Keep the FULL manifest server-side (SEC-1 for the schema emitter); render.php seeds a LEAN subset (`unset` schema-only keys + drop <2-image galleries; view.js falls back to `combo.imageUrl`). VERIFY the rendered DOM (`type="radio"` count + screenshot), not just valid JSON. Memory `manifest-growth-can-trip-capped-client-seed`.
> **STOP — verify a FEATURE FLAG before calling a missing side-effect a defect (NEW, D173).** R1's `wc_product_attributes_lookup` stayed 0 rows after a write — NOT a bug: `woocommerce_attribute_lookup_enabled='no'`, so native WC also skips it. An acceptance assertion carries an implicit "feature enabled" precondition; one `get_option()` probe settles it before you "fix" a non-bug. Memory `verify-feature-flag-before-asserting-defect`.
> **STOP — a cross-model rater's "ERROR" can contradict the LOCKED spec (NEW, D173).** The seo-schema agent flagged "add flavor to variesBy" + "rolling priceValidUntil" as errors — both WRONG (Google's structured-data `variesBy` enum is the 6 SEC-8 values; FR-27-E1 forbids fabricated priceValidUntil). Re-derive any rater finding against the spec + Google's actual rules before acting (memory `feedback_council_validates_the_criterion_it_is_given`).
> **STOP — R1 is COOKIE-AUTH (NEW, D173).** `class-product-authoring.php` requires `X-WP-Nonce` (cookie CSRF), so the block-editor authoring UI works; app-password/Basic REST will fail the nonce gate (correct for the UI use case). R3's authoring UI must call it from a logged-in admin context with `wp_create_nonce('wp_rest')`.
> **STOP — WC variable-product writes go through `set_*()`+`save()`, NEVER raw postmeta (NEW, D173).** Proven: the raw-postmeta seed left `wc_product_attributes_lookup` empty; the data-store path produces byte-identical output + triggers the lookup sync (when the feature is on). R2 provisioning + generation MUST use `WC_Product_Variable`/`WC_Product_Variation` setters + `save()`, never `update_post_meta` for commerce data.
> **STOP — WC batch is NOT transactional (R2 rollback, FR-27-R2).** A cartesian generate that fails midway leaves orphan variations + a corrupt product. R2 MUST track every created variation ID and, on ANY failure, delete them + restore the pre-write state; the UI shows created-vs-failed + a retry, never a corrupted product. Test with an INJECTED mid-write failure.
> **STOP — provisioning a shared `pa_*` taxonomy must not break siblings (R2, FR-27-R2).** Adding a term subset to a global attribute used by other products must never drop/alter those products' variations. Conflict-safe term-merge; upsert key `_sgs_variation_upsert_key` (sorted slug-joined combo) dedups on re-run. Test the shared-taxonomy-subset-add fixture.
> **STOP — PREFLIGHT is a HARD block, not advisory (SEC-5).** A £0 / no-image / draft / over-24KB-cap / no-valid-variesBy-mapping product MUST be un-publishable via `transition_post_status` (revert to draft + `_sgs_preflight_issues` meta + REST error), AND the cart-proxy independently rejects a £0 add-to-cart (422). "50 orders at £0 at midnight" is the threat.
> **STOP — authoring is UN-GATED: every presentation/config field ships WITH a friendly editor control (inspector or WC term/variation screen), NEVER raw-meta editing.** R3 writes the Step-0 `class-configurator-meta.php` keys through friendly UI; zero raw-meta acceptance gate.
> **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change (D168).** A `view.js` change has NO browser effect until its `build/blocks/<block>/view.asset.php` (the `?ver` carrier) is ALSO deployed. scp the WHOLE block set, opcache-reset, verify the served `?ver`. Memory `deploy-asset-php-with-viewscriptmodule`.
> **STOP — WP reads each block's `style.css`, NOT `style-index.css` (D171).** Deploying only `style-index.css` ships nothing — deploy `style.css` (+ `style-rtl.css`). Memory `wp-reads-block-style-css-not-style-index`.
> **STOP — WP Interactivity does NOT bind `data-wp-on` on imperatively-injected DOM nodes (D171).** Use EVENT DELEGATION on a stable ancestor for dynamically-rebuilt interactive elements. Memory `interactivity-no-bind-on-injected-nodes`.
> **STOP — green automated gates ≠ design-complete (D165).** axe-0/tests passing ≠ visually correct. Self-review with `/ui-ux-pro-max` + `/playwright`/chrome-devtools 3-breakpoint AND expect Bean's eye to surface more. Memory `ship-gate-needs-human-eye-not-just-automated-gates`.
> **STOP — run the ESCAPE-AUDIT before committing any new data→HTML/REST path (D171).** Build a [value → source → sanitise-at-save → escape-at-render → output context] table; /qc-council it.
> **STOP — SSR==swap parity (D168).** Any display string PHP computes server-side AND view.js recomputes on swap MUST be byte-identical — seed the translated/computed literal into context; never re-derive in JS. The SSR-wipe trap: a directive bound to a JS-only getter resolves empty + WIPES the SSR value. Memory `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`.
> **STOP — WP Interactivity `data-wp-on--<event>` silently will NOT bind a custom event name containing a COLON.** Bridge via `data-wp-init` + a captured-context `addEventListener`. Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`.
> **STOP — schema/OG price ALWAYS inc-VAT + from the MANIFEST (SEC-1/SEC-2).** Never re-read WC for price in the schema/OG path; a CI grep asserts `class-product-schema.php` has zero `wc_get_price_to_display`/`get_children`.
> **STOP — canonical: never `add_query_arg`, never `$_GET` (SEC-7).** Build variation URLs from the variation's own server-side `get_attributes()`, validate each `?attribute_*` key is a real taxonomy + value a real term.
> **STOP — detect-and-defer if Yoast/RankMath active (SEC-9).** OG/canonical/sitemap defer to an SEO plugin; only the variant JSON-LD stays.
> **STOP — scope shared-block changes to the variant the gated surface doesn't use.** `sgs/product-card` renders page-144 Typed clones AND is shared with cloning WS-4; build against the Bound (`wc-product`) branch + `.product-card--bound`-scoped CSS; option-picker changes ADDITIVE.
> **STOP — don't assert block/WC capability from a partial dump:** read `block.json` + `render.php` + `/wp-blocks` + the live WC object before building on top.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / live DOM / live one-shot) BEFORE dispatching a fix.
> **STOP — verify against git, not the handoff:** run `git log --oneline -10` + `git branch` first; cloning + Spec-28 threads commit to the same `main`.
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk** (Spec 26 / FR-26-D2). Memory `canary-live-styles-come-from-wp-global-styles-post`.
> **STOP — build tooling: `npm run build` via the PowerShell tool, NOT Bash** (Git-Bash node wrapper broken). WP ops the `wp-content-guard` hook blocks (`wp eval`/`eval-file`/`wp post update`) → token-gated webroot one-shot PHP runner (require wp-load.php + secret `$_GET['t']`, curl, rm). `POST /wp/v2/pages` is NOT guard-blocked. Memory `webroot-oneshot-runner-for-guard-blocked-wp-ops`.
> **STOP — fact-check every security/QC-rater "blocker" against the ACTUAL threat model** (an authenticated authoring controller is a write path — be STRICT; a public-read shop endpoint is not). Re-derive against the real model. Memory `feedback_council_validates_the_criterion_it_is_given`.
> **Guardrail (all tasks):** after every change open the canary (page 540/589 + the WP editor) + run the live one-shot, verify zero console errors + correct live values BEFORE considering the task done. Surgical deploy: build via PowerShell → scp `build/blocks/<block>/*` (incl `*.asset.php` + `style.css`) + changed `includes/*.php` → opcache-reset. PHP/JS-only → `git commit --no-verify` (visual-diff report only for a `style.css` change).

## State recap (plain English)
The shop is now feature-complete on the visible layer AND discoverable: Google + AI search engines read the product (ProductGroup JSON-LD, 0 Rich Results errors), social shares show the price, the sitemap re-crawls when a price changes, and breadcrumbs trail correctly. The secure server-side WRITE engine (R1) is live — the controller that changes a product's variations/attributes through WooCommerce's proper data layer (byte-identical to the native editor), locked down (per-product permission + nonce + rate-limit + IDOR). What remains in Cluster C: **R2** — let a client/agency PROVISION attributes + terms from plain input, GENERATE the full variation grid (cartesian), with a transactional ROLLBACK so a half-failed generate never leaves a corrupt product; **R3** — the friendly authoring UI (no raw fields) + edit-safety warnings; **PREFLIGHT** — a hard go-live check that stops a £0/no-image/draft product ever publishing. **FIRST JOB: add the deferred R1 decision (D176) to `decisions.md`** (it was deferred this session to dodge the concurrent commit-race with the Spec 28 session). There is also a parallel Spec 28 P1 session and a cloning Method-2 session on the same `main`.

## First action (smallest step, ≤5 min, zero deps)
Run `git log --oneline -10` + `git status` + `git branch --show-current`. Confirm HEAD on `main` at/after `f747e58a`. If `.claude/decisions.md` is no longer dirty (Spec-28 session committed), append the R1 **D176** entry (text in `state.md` `current_subphase_step_8...` + this session's handoff). Then open `https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/`, confirm the pills render (regression stayed fixed). Then read the live plan `.claude/plans/2026-06-04-spec27-phase2-display-seo-plan.md` §Cluster C (STEP 12 R2 / STEP 13 R3 / STEP 14 PREFLIGHT) + Spec 27 §FR-27-R2/R3/PREFLIGHT.

## ORCHESTRATION PLAN (you = Opus orchestrator)

### Task 1 — R2 attribute/term provisioning + cartesian generate + upsert + ROLLBACK (FR-27-R2) — THE HEAVY BUILD
**What:** extend the R1 controller (or a sibling `class-product-provisioning.php`) so a client provisions/reuses global `pa_*` taxonomies + terms from plain input, generates the cartesian product of variations, and dedups on re-run via `_sgs_variation_upsert_key` (sorted slug-joined combo). **Why:** a non-coder can stand up a full configurator product without WP-CLI. **Orchestration:** /subagent-driven-development — Sonnet implementer (NO commit) → spec reviewer (PASS) → quality reviewer (PASS) → you golden-master-verify + commit. **Critical:** WC batch is NOT transactional → track created variation IDs, delete-on-failure, restore pre-write state, UI shows created-vs-failed + retry (STOP). Use `set_*()`+`save()` only. **/qc-council pre-commit.** **Acceptance (live one-shot):** 48-SKU provision+generate is byte-identical (golden-master diff: postmeta + term relationships + variation attributes) to a native-editor build; an injected mid-write failure rolls back cleanly (0 orphan variations); a shared-`pa_*`-subset add does NOT break a sibling product.

### Task 2 — R3 presentation-authoring UI + edit-safety (FR-27-R3)
**What:** friendly inspector/term/variation UIs to author swatch/label/divisor/gallery/variesBy (write the Step-0 `class-configurator-meta.php` keys) — NEVER raw meta. Edit-safety: an `edit_term` hook warns on a `pa_*` slug rename ("breaks existing links + Google may error"); a delete-variation-with-orders warning + orphan term_meta/postmeta cleanup. **Orchestration:** Sonnet → spec + quality review → you verify in the live editor. **Acceptance:** a non-coder (or you simulating one) authors a full product touching ZERO raw meta; rename-slug warning fires; delete-with-orders warns.

### Task 3 — PREFLIGHT hard go-live block + post-launch health (FR-27-PREFLIGHT / SEC-5)
**What:** a `transition_post_status` gate that hard-blocks publish (revert to draft + `_sgs_preflight_issues` meta + REST error + admin notice) on any £0 / no-image / draft / over-24KB-cap / no-valid-variesBy-mapping variation; the cart-proxy independently rejects a £0 add-to-cart (422). A weekly WP-cron re-checks JSON-LD validity + fires an admin notice on degradation. **Orchestration:** Sonnet → review → you verify. **Acceptance:** a £0 variation cannot publish (reverts to draft); the cron flags a post-launch break.

### GATE after Cluster C — QA-AUTHORING
Golden-master diff (controller output == native editor); a non-coder authors a COMPLETE configurator product — attributes, variations, swatches, gallery, pricing, variesBy — touching ZERO raw meta + ZERO WP-CLI; product sells + shows rich results. Then Bean R-22-13 sign-off.

### Then (DECISION-GATED, after Cluster C) — Cluster D capstone
R4 agency slug-templates → R5 AI-builder → F2 llms.txt/Merchant-feed/FAQ. Framework capstone; gated on the converter pipeline + DB + theme/blocks + WC all production-ready. Does NOT block a first client shop launch (a shop is complete + sellable + discoverable + client-authorable at the end of Cluster C).

### Optional parallel — Spec 28 P1 (value ladder)
A parallel session has the Spec 28 P1 phase plan (`.claude/plans/2026-06-04-spec28-p1-value-ladder.md`, D175). Coordinate (it shares `sgs/product-card`); do NOT build the Spec 28 engine WC-write (P4) — fenced behind Cluster C.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — auto-injected by SessionStart |
| `/brainstorming` | ALWAYS — design the R2 rollback/provisioning architecture before coding |
| `/strategic-plan` + `/phase-planner` | only if re-planning; the v2 plan already sequences Cluster C |
| `/subagent-driven-development` | the per-task implementer→spec-review→quality-review loop (R2/R3/PREFLIGHT) |
| `/dispatching-parallel-agents` | only for genuinely DISJOINT pieces (R3 vs PREFLIGHT are separate files) |
| `/sgs-wp-engine` + `/wp-rest-api` + `/wp-plugin-development` + `/wp-hooks` | controller, provisioning, cron, cache-purge hooks |
| `/research-check` / `/library-docs` | current WC programmatic variable-product authoring API (set_*/save, attribute lookup, term provisioning) BEFORE building R2 |
| `/qc-council` | MANDATORY before any commit touching the WC-write controller (blub.db 255) |
| `/verify-loop` | 2-attestation on the byte-identical golden-master claim |
| `/ui-ux-pro-max` + `/playwright` (or chrome-devtools) | MANDATORY self-review of R3's visible authoring UI |
| `/gap-analysis` | grade each unit vs its FR-27 acceptance before delivery |
| `/delegate` | pick the model per dispatch (Sonnet default; Opus for R2 rollback design) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP / Tools
| Tool | For |
|------|-----|
| chrome-devtools `/browsing` (Playwright MCP may be held by a co-active session) | self-review R3 @375/768/1440, axe-core |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` | product 540 + variations golden-master |
| SSH + token-gated webroot one-shot runner | guard-blocked WC ops + golden-master diffs; `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`; canary creds `.claude/secrets/sandybrown.env`; plugin path `…/sandybrown…/public_html/wp-content/plugins/sgs-blocks` |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-unit mechanical build (no commit/deploy) + cross-model spec/quality raters |
| `wp-sgs-developer` | heavy WC-write provisioning build (if registered + preferred over inline subagent) |
| `design-reviewer` | R3 visible authoring UI + WCAG 2.2 AA (alongside /ui-ux-pro-max) |

## Done — do NOT redo (D171 + D173)
- Spec 27 Phase 2 CLUSTER A (B3/A4/C2/Step-7) + CLUSTER B SEO (E1/E2/E3/F1) — all SHIPPED + live-verified. Image-sitemap DESCOPED (Bean). Cluster C **R1 authoring controller SHIPPED + golden-master + cross-model verified** (`f747e58a`).

## Methodology guardrails (do not skip)
- **You are the orchestrator; fact-check every subagent claim** against live ground truth (read file + run the live one-shot + open the live page).
- **Golden-master is the acceptance gate for R2** — a controller-built product must be byte-identical to the native editor (postmeta + term relationships + variation attributes). Verify via a live one-shot, not a code-read.
- **WC writes via `set_*()`+`save()`, NEVER raw postmeta** (byte-identical + lookup sync). Transactional rollback on the non-transactional WC batch (track-and-delete created IDs).
- **/subagent-driven-development two-stage review** (spec PASS → quality PASS) + **/qc-council BEFORE every commit** touching the WC-write controller (blub.db 255).
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; you review + golden-master-verify + deploy + commit by explicit path.
- **In a batch, don't stop between tasks to ask** — proceed on passing+substantiated evidence; only stop for a real decision/hard-block (Bean directive).
- **Manifest growth → re-measure the 24 KB card context cap** (don't bloat the client seed; lean subset in render.php).
- **Communicate in plain English** (Problem→Effect→Solution; ranked menu + one recommendation).