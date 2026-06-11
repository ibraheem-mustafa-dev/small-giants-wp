---
doc_type: phase-plan
project: small-giants-wp
phase: "Spec 30 P1 — WooCommerce page-type chassis (working PDP + cart loop)"
spec_ref: specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md
created: 2026-06-11
status: active
thread: sgs-theme
---

# Phase 1 — WC page-type chassis: working PDP + cart loop

**USP:** This unblocks the product-page clone (FR-30-12 gate) AND gives every future shop client a real WooCommerce storefront — the single biggest gap between SGS and a sellable shop framework.
**Plan label:** [PLAN: opus]
**Docscore:** pending (in-flight plan; archived-plan template applies at close)
**Aggregate cost estimate:** ~5 sonnet dispatches + inline Opus orchestration; low single-digit £. Estimated wall time first session: plan (done) + FR-30-0/FR-30-1 ≈ 60–90 min.

**Phase success criteria (done when):**
- [ ] FR-30-0: self-check notice renders on out-of-band WC; dependency manifest exists; gateway matrix recorded; template override confirmed to win on canary
- [ ] FR-30-1: WC "theme does not declare support" notice GONE (Playwright-verified); single-product.html + archive-product.html render from theme, composed of named template parts
- [ ] FR-30-2: real variable product renders full composition; pills update price+gallery; correct variation_id in cart; simple product uses core path; axe 0
- [ ] FR-30-7: ≥3 pill combos add exact variation via /sgs/v1 proxy; foreign variation_id → 4xx; 503 → dismissible error; radiogroup semantics; zero direct /wc/store/v1 cart writes (grep)
- [ ] FR-30-4: PDP add-to-cart opens styled Mini-Cart drawer; test order completes; 3-breakpoint zero-overflow screenshots; axe 0 per surface
- [ ] FR-30-11 phase-close: committed responsive-audit script run green + executed-JS figures + Bean R-22-13 sign-off

**Entry context (read before starting):**
- `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` — the spec; FR-30-0/1/2/4/7 + Reuse Inventory + hard constraints
- `.claude/decisions.md` D208/D209 — design decisions + what just merged
- `plugins/sgs-blocks/includes/class-cart-proxy.php` — THE cart write path (never bypass)
- `plugins/sgs-blocks/src/blocks/option-picker/` + `product-card/view.js` — shipped selection UI + variation manifest consumer
- `plugins/sgs-blocks/CLAUDE.md` — block customisation standard incl. mandatory TypographyControls
- `.claude/dev-setup.md` — build/deploy/SSH

**Ground truth (probed 2026-06-11, this session):**
- Canary WC **10.8.1** (≥9.9 floor ✓), WP 7.0, sgs-theme active
- All 12 relied-on core blocks REGISTERED (product-gallery, add-to-cart-with-options, mini-cart, product-collection, product-filters, active-filters, cart, checkout, breadcrumbs, product-price, product-rating, product-image-gallery)
- `current_theme_supports('woocommerce')` = **NO** (gap confirmed); zero WC templates in theme
- **Gateways enabled: NONE.** Matrix decision: canary test orders via core Cash-on-Delivery (native block-checkout support); Stripe/PayPal block-support verification deferred to first client launch (FR-30-13 item a)
- Reusable canary fixtures: product **540** (`mamas-test-box-48-sku-fixture`, published 48-SKU Size×Flavour variable; 1017 is DRAFT — unusable for guest-front-end tests), products 897/950, pages 946/999/1069

**References:**
- Spec 30 §Reuse Inventory — wire, never rebuild (cart proxy, SEC-1 manifest, option-picker, pricing guards, schema emitters)
- Lessons binding here: `file-scope-wc-class-extends-must-load-lazily`, `wp-interactivity-data-wp-on-rejects-colon-event-names`, `deploy-asset-php-with-viewscriptmodule`, `bump-block-version-with-any-style-css-change`, `guard-on-one-path-is-not-a-guard`, `dont-claim-a-guard-is-enforced-unless-wired-to-something-that-runs`

**Pre-conditions:**
- Spec 30 v1.1 exists + council-gated (done); D208/D209 merged to main (done)
- Canary reachable; WC 10.8.1 active; fixture product 540 present (probed this session)
- `feat/spec30-wc-chassis` branched from origin/main before the first edit
- Co-active cloning thread NOT holding the files this phase touches (theme/, new plugin includes)

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /subagent-driven-development | steps 3, 5, 6 |
| skill | /qc-council | QA gates C and D (pre-commit) |
| skill | /sgs-update | after any block change (step 6) |
| mcp | chrome-devtools / Playwright | QA gates A–D, FR-30-11 |
| cli | SSH + token-gated webroot one-shot | guard-blocked WC ops |
| cli | npm run build (PowerShell) + tar/scp deploy + opcache reset | every deploy |

---

Step 1 — FR-30-0(b)+(c): dependency manifest + gateway pre-flight record
  Model:       inline
  Action:      Write `plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md`: tested WC band (floor 9.9, ceiling 10.8 tested), the 12 relied-on core block names, `/sgs/v1/cart/*` + Store-API READ surfaces, Beta-block fallback plans (gallery → classic `wc-product-gallery-*` supports; rollback = delete theme template overrides). Record gateway matrix: none installed; COD for canary test orders; client gateways verified at FR-30-13.
  Files:       plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md
  Inputs:      Ground-truth probe results (above); Spec 30 FR-30-0
  Outcome:     Manifest file exists naming every relied-on block + endpoints + band + fallbacks + gateway record.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        10 min
  Tooling:     Write
  On-Fail:     n/a (doc)
  Cold-Entry:  Spec 30 FR-30-0; this plan's Ground truth block
  Test:
    Happy:       file exists; every block name in the probe list appears in it
    Edge:        manifest names NO block that the probe showed unregistered
    Fail:        n/a (static doc) — drift caught by Step 2's self-check
    Integration: consumed by Step 2 self-check + FR-30-5's regression check (P3)

Step 2 — FR-30-0(a): runtime WC compat self-check
  Model:       sonnet
  Action:      New `plugins/sgs-blocks/includes/class-wc-compat-check.php`: on `admin_init` (lazy: bail unless `class_exists('WooCommerce')`), assert WC_VERSION within band AND each manifest block registered; outside band or missing block → dismissible admin notice "SGS: WooCommerce X is newer/older than tested — product pages may need review". Band + block list defined as PHP constants IN THIS FILE mirroring the manifest (single consumer; comment cross-references the manifest). No file-scope WC class references.
  Files:       plugins/sgs-blocks/includes/class-wc-compat-check.php, plugins/sgs-blocks/sgs-blocks.php (require wiring)
  Inputs:      Step 1 manifest
  Outcome:     Self-check renders the notice when band is deliberately falsified; silent when in-band.
  Exec:        SEQUENTIAL
  Deps:        step 1
  Marker:      (none)
  Time:        20 min
  Tooling:     /subagent-driven-development (implementer + spec reviewer); deploy + live admin check
  On-Fail:     Remove the require line from sgs-blocks.php (single-line rollback); site renders without the check.
  Prompt:      [dispatch via /subagent-prompt at execution — context: Spec 30 FR-30-0(a), lazy-load lesson, file ≤300 lines, WPCS]
  Test:
    Happy:       in-band → no notice; admin loads clean
    Edge:        temporarily set ceiling to 10.7 → notice renders on 10.8.1 (live-verified, then restored)
    Fail:        WC deactivated → check bails silently, NO fatal (curl front page)
    Integration: WP admin notices API; canary live admin

Step 3 — FR-30-1: theme support + template scaffolding
  Model:       sonnet
  Action:      `add_theme_support('woocommerce')` + `wc-product-gallery-zoom/-lightbox/-slider` in `theme/sgs-theme/functions.php` (SAME commit as templates). Create `templates/single-product.html` + `templates/archive-product.html` composed of NEW template parts `parts/sgs-pdp-gallery.html`, `parts/sgs-pdp-buybox.html`, `parts/sgs-pdp-content.html`, `parts/sgs-archive-toolbar.html`. Initial composition per FR-30-2 layer table (core gallery/title/rating/price/breadcrumbs/add-to-cart-with-options/related; SGS trust-bar typed; generic content slot for statutory info). No client values hard-coded.
  Files:       theme/sgs-theme/functions.php, theme/sgs-theme/templates/single-product.html, theme/sgs-theme/templates/archive-product.html, theme/sgs-theme/parts/sgs-*.html
  Inputs:      Spec 30 FR-30-1/FR-30-2; existing templates/parts for house style
  Outcome:     Both templates render from THEME on canary (template inspector shows theme source); WC admin support notice gone.
  Exec:        SEQUENTIAL (templates depend on support declaration landing together)
  Deps:        step 1 (manifest names what we compose with)
  Marker:      (none)
  Time:        30 min
  Tooling:     /subagent-driven-development; deploy theme via scp; Site Editor check via Playwright
  On-Fail:     Rollback = remove the two template files + the add_theme_support lines (WC injected defaults resume).
  Prompt:      [dispatch via /subagent-prompt at execution]
  Test:
    Happy:       canary /product/mamas-test-box-48-sku-fixture/ renders via theme single-product template
    Edge:        product with NO variations (simple) renders core add-to-cart path
    Fail:        delete one template part → template renders with missing-part placeholder, no fatal
    Integration: WC template hierarchy + Site Editor; verify override WINS over WC injected default (FR-30-0d)

QA Gate A — Chassis live verification
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 1–3
  Check:   Playwright (sandybrown.env creds): (1) wp-admin WC status page shows NO "theme does not declare support" notice; (2) Site Editor template inspector lists single-product + archive-product with source = sgs-theme; (3) curl front page HTTP 200 (no fatal); (4) /product/{fixture}/ renders gallery+price+add-to-cart.
  Pass:    All 4 observable signals green; screenshots saved to .claude/reports/spec30-p1/.
  Fail:    Root-cause via debug.log; if fatal → Step 3 rollback (template removal) within minutes; never iterate a broken deploy live.
  Marker:  QA

Step 4 — Commit checkpoint 1 (FR-30-0 + FR-30-1)
  Model:       inline
  Action:      /qc-council (cross-model: sonnet + haiku) on the chassis diff; then path-scoped commit `git commit -- plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md plugins/sgs-blocks/includes/class-wc-compat-check.php plugins/sgs-blocks/sgs-blocks.php theme/sgs-theme/...` on `feat/spec30-wc-chassis` (created from origin/main BEFORE Step 1 — KJC-2 + pre-emptive decision).
  Files:       (commit only)
  Inputs:      QA Gate A evidence
  Outcome:     Chassis committed; clean SESSION-START boundary.
  Exec:        SEQUENTIAL
  Deps:        QA Gate A
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /qc-council; git
  On-Fail:     Council blockers fixed before commit; never commit past a BLOCK verdict.
  Test:
    Happy:       commit lands; git show --stat lists ONLY the named paths
    Edge:        never-stage artefacts (lucide-icons.php, .parity-golden.json) absent from the commit
    Fail:        council BLOCK → fix + re-gate
    Integration: shared branch with co-active cloning thread

Step 5 — FR-30-7: option-picker → cart bridge [SESSION-START]
  Model:       opus (bridge design inline) + sonnet (build)
  Action:      Design then build the cross-block bridge: option-picker's `sgs:option-selected` CustomEvent → captured-context `data-wp-init` + plain addEventListener (colon-event lesson) → validate variation_id against the SEC-1 seeded manifest (current product, is_purchasable, is_in_stock) → POST via `/sgs/v1/cart/add-item` proxy. Failure path: 400/409/503 → dismissible inline ARIA-live error, button re-enables. Operator controls: unavailable-label, notify-me CTA label, per-unit denomination (inspector). Notify-me PII path: ship fully guarded (sanitize_email + nonce + ≤3/IP/hour + un-pre-ticked PECR consent) or explicitly DEFER in the commit.
  Files:       plugins/sgs-blocks/src/blocks/option-picker/ (view.js, block.json, render.php, edit.js); bridge home decided by the design half (see Pre-emptive decisions)
  Inputs:      Reuse Inventory paths; Step 3 templates; fixture product 540
  Outcome:     ≥3 distinct pill combos (incl. multi-axis) each add the EXACT variation via the proxy on canary.
  Exec:        SEQUENTIAL after step 4 (PARALLEL with step 6 once bridge design is fixed)
  Deps:        step 4
  Marker:      SESSION-START
  Time:        45 min
  Tooling:     /subagent-driven-development; chrome-devtools live cart inspection; grep gate (zero direct /wc/store/v1 cart writes)
  On-Fail:     view.js + asset.php redeploy of previous build (keep pre-change build/ copy); block version revert.
  Cold-Entry:  Spec 30 FR-30-7 + Reuse Inventory; option-picker + product-card view.js; class-cart-proxy.php; this plan
  Prompt:      [dispatch via /subagent-prompt at execution]
  Test:
    Happy:       multi-axis combo → cart contains exact variation_id (proxy response inspected)
    Edge:        deleted-variation lookup (valid combo, null manifest hit) → error state, NO silent wrong add
    Fail:        foreign variation_id POST → 4xx; simulated 503 → dismissible error + button re-enables
    Integration: shipped cart proxy + SEC-1 manifest + WP Interactivity; radiogroup keyboard semantics (axe + manual)

Step 6 — FR-30-4: cart / checkout / Mini-Cart styling
  Model:       sonnet
  Action:      Brand-style core Cart, Checkout, Mini-Cart drawer (header placement; drawer width as CSS custom property via global styles). Enable COD on canary for the test order. Stable-selector CSS only; any block style.css change bumps block.json version.
  Files:       theme/sgs-theme (templates/parts for header Mini-Cart placement, theme CSS); client-specific colour values go to sites/mamas-munches/theme-snapshot.json, never framework CSS
  Inputs:      Step 3 chassis; FR-30-0 gateway record
  Outcome:     PDP add-to-cart opens styled drawer; COD test order completes end-to-end on canary.
  Exec:        PARALLEL with step 5 (disjoint files) — but final verification needs step 5's add-to-cart
  Deps:        step 4
  Marker:      (none)
  Time:        30 min
  Tooling:     /subagent-driven-development; wp_global_styles REST (canary styles live in the DB post, NOT theme.json on disk)
  On-Fail:     CSS-only changes — revert the stylesheet edits; no data risk.
  Prompt:      [dispatch via /subagent-prompt at execution]
  Test:
    Happy:       add-to-cart → drawer slides out styled; cart→checkout→COD order completes
    Edge:        375px: drawer + checkout zero horizontal overflow
    Fail:        gateway absent at checkout → WC's native "no payment methods" state renders un-broken
    Integration: core Mini-Cart markup (re-verify selectors per WC band)

QA Gate B — Working PDP + cart loop (FR-30-2 + FR-30-7 + FR-30-4 acceptance)
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 5–6
  Check:   On canary product 540: pills update price+gallery; 3 combos add exact variations (proxy responses captured); foreign variation_id 4xx (curl); simple product renders core path; a SINGLE-variant fixture renders NO selector pills; an unavailable option renders DISABLED (operator-editable label), never hidden; COD order completes; axe 0 violations on PDP+cart+checkout; FR-30-11 script run at 375px/768px/1440px + executed-JS ≤50KB measured. Evidence → .claude/reports/spec30-p1/.
  Pass:    Every FR Done-when item green with captured evidence in .claude/reports/spec30-p1/.
  Fail:    Per-item root-cause (/systematic-debugging); no closing on assertion output — live DOM only.
  Marker:  QA

Step 7 — Phase close: /qc-council + /sgs-update + Bean R-22-13 + commit/merge
  Model:       inline
  Action:      /qc-council on the full P1 diff (security + logic raters); /sgs-update (option-picker attrs changed); present 3-breakpoint screenshot set to Bean for R-22-13 sign-off; path-scoped commit(s) + FF-merge to main; unblock FR-30-12 (notify cloning thread via next-session-prompt.md).
  Files:       (commit + docs: decisions.md D210, state.md, this plan → archive at close)
  Inputs:      QA Gate B evidence
  Outcome:     P1 closed; product-page cloning UNGATED.
  Exec:        SEQUENTIAL
  Deps:        QA Gate B
  Marker:      HANDOFF
  Time:        20 min
  Tooling:     /qc-council, /sgs-update, /handoff
  On-Fail:     Bean's eye finds gaps → fix-wave on the same branch before merge (D209 precedent: expect this).
  Test:
    Happy:       merged; cloning thread's gate row flipped
    Edge:        co-active main worktree blocks checkout-merge → FF-push or temp worktree (D209 precedent)
    Fail:        council BLOCK → fix before merge
    Integration: cross-thread handoff docs

## Key Judgement Calls

### Primary decisions

- **Decision (KJC-1):** Gateway for canary test orders.
  - **Options:** A) core COD / B) install Stripe sandbox now / C) defer all checkout testing
  - **Recommendation:** A — COD. Native block-checkout support, zero setup, proves the loop. Stripe/PayPal block-support verification is a FIRST-CLIENT launch item (FR-30-13a), not a chassis item.
  - **Cost of wrong choice:** Low — gateway swap is config, not code.
  - **Who decides:** architect (taken).

- **Decision (KJC-2):** Branch for P1 work.
  - **Options:** A) continue on `feat/block-quality-mirror` (shared, both threads) / B) fresh `feat/spec30-wc-chassis` from main
  - **Recommendation:** B — fresh branch. block-quality-mirror's purpose (D209) is merged + closed; a fresh branch keeps the WC chassis reviewable as one unit and avoids dragging the cloning thread's interleaved doc commits into the diff again (D209 noted they "rode along").
  - **Cost of wrong choice:** Merge-review noise only.
  - **Who decides:** architect (taken — Step 4 commits on the fresh branch).

- **Decision (KJC-3):** Where the FR-30-2 "buybox" SGS pieces live.
  - **Options:** A) compose option-picker directly in the template part / B) keep product-card as the buybox wrapper
  - **Recommendation:** A — the PDP template context wires the STANDALONE option-picker (FR-30-7's explicit scope); product-card remains the card/grid surface. Avoids nesting a card inside a PDP.
  - **Cost of wrong choice:** Medium — re-plumbing the bridge context.
  - **Who decides:** architect, flagged to Bean at R-22-13.

### Pre-emptive decisions (Hidden Decisions pass — sonnet + haiku cold reviewers, 2026-06-11)

- **Branch creation timing (both reviewers).** `feat/spec30-wc-chassis` is created from `origin/main` BEFORE Step 1's first file edit — not at Step 4. All P1 work lands there.
- **Where the FR-30-7 bridge lives (sonnet #4/#5 — the big one).** In the PDP template the option-picker is STANDALONE: no product-card parent exists to seed the SEC-1 variation manifest or consume `sgs:option-selected`. Candidate answer: option-picker's render.php seeds its own lean manifest context when rendered inside a product context (`is_product()` / queried product ID), and the bridge listener + add-to-cart button live with the picker (its own view.js or a thin buybox wrapper). **Rater claims are hypotheses** — Step 5's opus design half MUST first read the shipped `product-card/view.js` + `option-picker/view.js` ground truth and confirm which side currently owns manifest/seeding before choosing (a) self-seed in option-picker render.php vs (b) a buybox wrapper block that provides context.
- **Notify-me at P1 (sonnet #6).** Verify the shipped cart-proxy demand-capture's guards FIRST (sanitize_email, nonce, rate limit, PECR consent). If all present → wire it; if ANY missing → explicit DEFER note in the commit, never half-guarded.
- **Single-variant suppression + disabled-not-hidden (sonnet #7 — spec FR-30-2 rule the draft dropped).** Added to QA Gate B: a single-variant fixture must render NO selector pills; an unavailable option renders disabled with operator-editable label, never hidden. Grep option-picker render.php for an existing guard before building one.
- **Mechanical pre-answers (haiku):** resolve product 1017's slug + attribute axes via SSH/`/sgs-db` before Step 3's URL tests; WC version check = `version_compare(WC_VERSION, FLOOR/CEILING)`; breakpoints are explicitly 375/768/1440; all screenshots + evidence to `.claude/reports/spec30-p1/`; global-styles updates go to the `wp_global_styles` post via `/wp/v2/global-styles/{id}` REST (canary lesson — theme.json on disk is inert).
- **FR-30-0(c) satisfaction (sonnet #8).** The ground-truth probe (gateways: NONE; COD decision) IS the recorded matrix; Step 1 copies it into the manifest verbatim — no extra blocking step.
- **Step 2/Step 3 file-collision check (sonnet #2).** Step 2 wires into `sgs-blocks.php` (plugin); Step 3 edits `functions.php` (theme) — disjoint, no conflict.

## Parking lot

- B2B ex-VAT price display (Indus Foods) — Open Question 3; decide before Indus's shop build, not blocking Mama's.
- Subscriptions / reorder / build-a-box / A-B price hooks — parked roadmap (Spec 30 Open Question 4, Bean's call).
- Stripe/PayPal block-support verification — first-client launch item (FR-30-13a), not a P1 item.
- announcement-bar homepage fixture placeholder (carried from D209 handoff) — re-clone or manual swap, Bean's choice.
