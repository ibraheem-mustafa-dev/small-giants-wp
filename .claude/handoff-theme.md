# Session Handoff — 2026-06-03 (SGS THEME thread, session 9 — IDOR fix DEPLOYED + Spec 27 Phase-1 build plan + adversarial-council CONDITIONAL-GO)

> Theme/blocks thread. Cloning pipeline → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. The cloning thread was co-active on this shared tree (its uncommitted `testimonial-slider/*` + `reports/phase4-*` + `theme-snapshot.json` + `lucide-icons.php` were left untouched). Decision: **D162**.

## Completed This Session
1. **Task A — IDOR fix DEPLOYED + proven live.** Surgical single-file scp of `class-product-cpt.php` (commit `d07a7e05`) to the sandybrown canary + OPcache reset (no block rebuild → did NOT bundle the cloning thread's uncommitted slider). Proven 3 ways: live file's 9 per-object `edit_post` checks match local line-for-line; a throwaway **contributor's REST write of `sgs_price` on product 522 → 403 `rest_cannot_edit`** (server price unchanged); **admin write → 200** (legit authoring intact). Cleanup: price restored to 10, test user deleted. (REST base is `sgs-products`, not `sgs_product`.) OUTCOME ACHIEVED.
2. **Task B — Spec 27 Phase-1 build plan written + stress-tested (no build code).** `.claude/plans/2026-06-03-spec27-phase1-configurator-plan.md` — 13 units U0-U12, dependency graph, 4 gates, grounded risk register, effort. `/strategic-plan` Phase-3 HARD GATE via 2 parallel Sonnet risk+effort agents (caught the single-axis store, the `data-wp-text`-strips-sale-HTML trap, the `_sgs_variation_sets` WC-branch read, the shared-state multi-card bug). Then `/adversarial-council` 6-persona brutal round → **CONDITIONAL GO** (grades Ship-PM B+ / Cynic·Spec-Lawyer·Abuse C+ / Competitor·Support D+). Five must-fixes that silently break a live shop folded into plan §8b (freshness/purge model + UK-CRA exposure; attribute/combo-key format; per-instance context not shared state; inventory-denial + qty-cap floor; CSP + manifest escaping).
3. **Two build open-questions RESOLVED (grounded in code).** FR-24 #7: existing `sgs-product/field` source covers image+scalars; repeatable pills go via the SSR-seeded manifest — no new mechanism. FR-24 #9: a `wp_options` `sgs_content_types` flag (default `[]`) + a `manage_options` toggle. (Plan §1.)
4. **WC add-item contract verified live (pulled-forward M-C2).** Canary = **WooCommerce 10.8.1**; `OPTIONS` confirms `variation` is an **array of `{attribute,value}`** — the spec shape is correct. Exact attribute key string still needs the U0 fixture.
5. **U0 + U6 BUILT + HARDENED + LIVE-VERIFIED + COMMITTED (`43ecfce1`, pushed) — pulled-forward server-side spine (Bean-authorised, pixel-diff-safe).** **U0** `seed-48-sku-fixture.php` (idempotent) → canary product **540**, 48 variations (3 OOS / 1 low-stock=563 / 1 scheduled-sale=565). M-C2 PINNED via live add-to-cart: format = `variation:[{attribute:"<display name>",value:"<term slug>"}]` (NOT `pa_`/`attribute_pa_`). **U6** `class-cart-proxy.php` (`POST /sgs/v1/cart/add-item`, wired into `class-sgs-blocks.php`): CSRF→IDOR→publish-gate→purchasable+in-stock→attribute-match→qty-cap→fixed-window rate-limit → in-process `WC()->cart->add_to_cart()` (server-authoritative). **2-rater security+logic review (qc gate) → 5 must-fixes folded** (parent-variable-id, empty-variation, draft gate, sliding-window→fixed, bad sale-hook). **Live adversarial suite ALL PASS** (no-nonce 403 · valid 200 · IDOR 400 · parent-id 400 · OOS 409 · attr-mismatch 400 · empty-variation 400 · qty-cap clamp 50→30). Tracked follow-ups: plan §U6 (Store-API bypass stub, "Any"-term, local-attr, guest-nonce-doc).

## Bean's two negotiated decisions (D162.5)
- **KEEP the single whole gate** (all 13 units before "shipped") — declined the council's GATE-1.5 re-cut (the "less = relief" framing is generic-ADHD; Bean's completionist profile reads a partial gate as an unresolved thread). Must-fixes + honest 3-4-session estimate kept; MVP subset retained only as BUILD ORDER within the single gate.
- **PULL the server-side units forward** (U0 fixture + U6 proxy + WC-contract pinning) to build DURING the cloning wait — they don't touch the rendered card, so don't affect the cloning pixel-diff. Card-rendering units (U3/U4) stay gated until cloning closes.

## Current State
- **Branch:** `main` (no new commits this session — Task A was a live canary deploy, not a repo change; the IDOR fix `d07a7e05` was already committed last session). Plan + decisions.md (D162) are uncommitted doc edits in the working tree (theme-thread paths only). The cloning thread's `testimonial-slider/*` / `reports/phase4-*` / `theme-snapshot.json` / `lucide-icons.php` remain ITS uncommitted files — leave them.
- **Deploy:** the product-meta IDOR fix is now LIVE on the canary + verified. (No block/theme build this session.)
- **Honest estimate (corrected):** Spec 27 Phase 1 = 3-4 AI-agent sessions for the sell-loop (matches Spec 27 §540), NOT 2.

## Next Priorities (in order)
1. **Commit the theme-thread doc edits** by explicit path: the new plan + `decisions.md` D162 + this handoff + the next-session-prompt (NEVER `git add -A`; the cloning thread's files stay untouched; verify `git log -1 --stat`).
2. **BUILD the pulled-forward server-side units** (Bean-authorised, pixel-diff-safe, buildable during the cloning wait): **U0** `seed-48-sku-fixture.php` first (every other unit tests against it), then **U6** the `/sgs/v1/cart/add-item` proxy (security spine — fold M-C1/M-C2/M-C4/M-C5 + /qc-council per commit), then pin M-C2's exact attribute key via the fixture's cart read-back. These are a fresh focused session (security-critical).
3. **The card-rendering units (U3/U4/U5 + the rest)** stay GATED until the cloning phase shows CLOSED (`.claude/next-session-prompt.md` + `state.md`) — they re-baseline the pixel-diff.

## Notes for Next Session
- **Plan §8b is the must-fix register** — fold M-C1 (freshness/purge: use real hooks `woocommerce_scheduled_sale_action`/`woocommerce_product_set_sale_price`/`woocommerce_update_product` + a server-side `get_date_modified()` staleness guard at render; `wc_scheduled_sales` is NOT a real hook) before U8; M-C2/M-C3/M-C4/M-C5 before the units they touch.
- **Reframe the spec slogan** "WC never mirrored" → "WC authoritative; SGS holds a seeded read-through cache reconciled server-side on every render + at add-to-cart" (the slogan is what makes maintainers under-build freshness — Cynic).
- **Competitor lens (for the roadmap, not this plan):** pull configurator analytics ("combos tried-but-couldn't-buy") forward — the one revenue-language deal-winner, currently shelved; make the WCAG claim credible (third-party audit OR narrow to "agency-delivered").

---

# Session Handoff — 2026-06-03 (SGS THEME thread, session 8 — theme tasks A/B + button re-clone + Spec 27 master + adversarial-council skill)

> Theme/blocks thread. Cloning pipeline -> `.claude/handoff.md`. Next -> `.claude/next-session-prompt-theme.md`. A parallel CLONING session was live on `testimonial-slider` + `theme-snapshot.json` for most of this session; shared-doc bookkeeping was deferred to avoid the concurrent-commit race (see Next Priorities).

> ## UPDATE (session 8 close-out) - two deferred items are now DONE
> The two "DEFERRED/PENDING" items in the Known Issues + Next Priorities below were completed at session close once the tree cleared:
> 1. **Shared-doc bookkeeping - DONE** (`14bb3a7c`, `7038055f`): Spec 24 + 25 MOVED to `.claude/specs/archive/` (status superseded + `absorbed_by: 27`); **D161** logged in `decisions.md`; `docs-registry.yaml` (27 = master, 24 superseded), `.claude/CLAUDE.md` spec manifest, `parking.md`, and Spec 26 non-goals (auto-contrast) all updated.
> 2. **adversarial-council S-grade - AWARDED** by Bean + the skill hardened with battle-tested persona briefs; recorded in the skill's `correction-ledger.md`.
> The only OPEN item carried to next session is **the canary deploy of the IDOR fix** (`d07a7e05`) + the gated **Spec 27 Phase 1 build**. See `.claude/next-session-prompt-theme.md`.

## Completed This Session
1. **Task A (auto-contrast) DECIDED + Task B (FR-26-D2) SHIPPED.** Bean chose build-time luminance (+ CSS `contrast-color()` as a later progressive-enhancement layer) as the universal WCAG auto-contrast direction. FR-26-D2: extended `push-theme-snapshot.py` to write the live `wp_global_styles` post via `POST /wp/v2/global-styles/{id}` (deterministic post-ID by `wp-global-styles-{stylesheet}` name, app-pwd auth from gitignored env, trailing cache flush). Live-verified reversibly on canary post 7 (marker reached DB + served HTML, then restored). Commit `c468af7a`, pushed.
2. **Mama's homepage re-cloned to page 144 -> hero secondary button FIXED.** Root-caused the "both hero buttons filled primary" as a STALE clone (page 144 predated D147's secondary-modifier detection; the current converter chain verified to emit `inheritStyle=secondary`). Re-clone via `/sgs-clone --mode draft --skip-register --deploy-target page:144`. Live-verified: "Try 3 for £5" now `is-style-secondary` (transparent/outlined). Pixel-diff mean (excl header/footer) 57.78 -> 53.13% (14 sections improved, 3 regressed).
3. **Spec 27 - SGS Product & WooCommerce Layer master WRITTEN + consolidated.** Researched (5 agents: WC native, architecture, competitor-gaps, SEO/AI, security/CWV), written, hardened through TWO qc-council rounds (5 polite + 6 brutal adversarial personas), RE-SCOPED MVP-first (Bean call: AI-builder demoted to roadmap Phase R), final gap-analysis grade A GO. Then folded Spec 24 + Spec 25 into it (v4, 605 lines), em-dashes stripped. Commit `f9b7c8cb`, pushed.
4. **Live security bug fixed (found by the round-2 abuse red-team).** All 7 `sgs_product` meta `auth_callback`s used loose `edit_posts`; tightened to per-object `edit_post` (IDOR: any contributor could tamper price/featured/views on any product via REST). Commit `d07a7e05`, pushed. DEPLOY PENDING to canary.
5. **New skill `adversarial-council` built via /lifecycle.** The "pain-in-the-butt council" pattern bottled: parallel committed-worldview personas + convergence-weighting -> must-fix register + GO/NO-GO. skillscore 96% (A), gap-analysis B -> A- (2 gaps fixed). S-grade showpiece sign-off PENDING Bean. Lives at `~/.claude/skills/adversarial-council/`.

## Current State
- **Branch:** `main` at `f9b7c8cb` (3 commits this session: `c468af7a`, `d07a7e05`, `f9b7c8cb`, all pushed).
- **Build:** n/a (no block build this session); `push-theme-snapshot.py` py_compile clean.
- **Uncommitted:** `lucide-icons.php` (documented auto-regen, never committed). The parallel cloning session's `testimonial-slider/*` + `theme-snapshot.json` are ITS uncommitted files - leave them.
- **Deploy:** the product-meta security fix is committed but NOT yet deployed to the canary.

## Outcome vs Completion (Gate 3.5)
- Task A: OUTCOME ACHIEVED (direction decided + recorded). Task B: OUTCOME ACHIEVED (live-verified write path). Hero button: OUTCOME ACHIEVED (live-verified outlined secondary). Spec 27: OUTCOME ACHIEVED (master spec written + consolidated + grade-A). Security fix: CODE SHIPPED, OUTCOME NOT YET HIT (deploy to canary pending). adversarial-council: OUTCOME ACHIEVED (live skill, graded); S-grade award pending Bean.

## Known Issues / Blockers
- **Shared-doc bookkeeping DEFERRED** (parallel session held the docs): retire Spec 24/25, record the Spec-27 decision, update docs-registry + CLAUDE.md, record auto-contrast + the snapshot/live divergence. This is the next session's FIRST job once the tree is clear.
- **Hero desktop (+19pp@1440) + ingredients (+11pp@1440) pixel regressions** from the re-clone - cloning thread owns these (structural, not the buttons).
- Product-meta security fix awaits a canary deploy.

## Next Priorities (in order)
1. **Deferred bookkeeping (once tree clear):** retire Spec 24+25 (absorbed_by:27, status superseded, move to specs/archive); record Spec-27 decision (D159+) in decisions.md; update docs-registry.yaml (27 master) + CLAUDE.md spec list; record auto-contrast (build-time luminance) into Spec 26/parking P-AUTO-CONTRAST + the post-7 divergence note (page-29 = throwaway WC-extension test CSS).
2. **Deploy the product-meta security fix** to the canary (build-deploy plugin + OPcache reset).
3. **S-grade sign-off** for adversarial-council (Bean decision).
4. **Spec 27 Phase 1 MVP build** (read-through configurator) - deferred until the cloning phase closes; it re-baselines the pixel-diff.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/push-theme-snapshot.py` | FR-26-D2 REST-write to wp_global_styles post (commit c468af7a) |
| `plugins/sgs-blocks/includes/content-types/class-product-cpt.php` | per-object edit_post auth on 7 meta fields (commit d07a7e05) |
| `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` | NEW v4 master, absorbs Spec 24+25 (commit f9b7c8cb) |
| `~/.claude/skills/adversarial-council/` | NEW skill (SKILL.md + references/ + scripts/ + hooks/) |
| canary page 144 (DB) | re-cloned; hero secondary button now outlined |

## Notes for Next Session
- **adversarial-council is the bottled "pain-in-the-butt council"** - run it on any spec/plan/design BEFORE building (polite-then-brutal = two rounds for high stakes). It found Spec 27's structural over-scope that the polite round missed.
- **Spec 27 is now the single master** for the product + WooCommerce layer; Spec 24/25 are superseded but not yet formally retired (deferred bookkeeping).
- **Canary live styles = `wp_global_styles` post (ID 7)**, not theme.json on disk - and FR-26-D2 now writes it; but `push-theme-snapshot` still re-diverges with disk-only edits until you use the new push path.
- **Verify against git, not handoffs** - this session worked alongside a live cloning session; commit by explicit path only.

---

# Session Handoff — 2026-06-03 (SGS THEME thread, session 7 — Spec 26 global-styles design)

> Theme/blocks thread. Cloning pipeline → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. Design + research session (no production code): resolved Bean's question about the global-CSS setup into a written, ratified, build-deferred spec.

## Completed This Session
1. **Spec 26 — SGS Global Styles & Per-Client Theming WRITTEN + committed** (`15a2b183`; docscore 100% A). Resolved via research-buddies (WP 7.0 global-styles, 13 sources) + a 4-persona design council (standards / agency-ops / pipeline-integration / non-coder-UX — all ranked Candidate C #1) + a CLI/abilities investigation + a converter-routing investigation. D158.
2. **Corrected the mental model** (supersedes D156 "override precedence" framing): WP 7.0 global styles is a **data-layer merge** (default→blocks→theme(theme.json+variations)→custom `wp_global_styles` CPT, merged in PHP then emitted as inline CSS), NOT a CSS override. The `wp_global_styles` post is the live source of truth; `theme.json` is the factory seed.
3. **Architecture decided (Candidate C):** one lean framework `theme.json` baseline + per-client **style-variation DELTA** (kills the full-theme.json-copy fork-tax) + scoped per-site deploy with Browse-Styles suppressed (super-fixes Decision 18) + sync = EXTEND `push-theme-snapshot.py` to write the live `wp_global_styles` post via `POST /wp/v2/global-styles/{id}` (no new endpoint/ability; no Create Block Theme runtime dep — confirmed no `wp global-styles` CLI exists) + a pull/round-trip + a pre-deploy guard.
4. **Block-styling + pipeline-derivation FRs captured** — Bean's "Middle" path (presets prominent + raw values available, WCAG contrast linter, inspector reads merged custom-origin value) + Bean's pipeline-derivation proposal (converter emits RAW → post-pass derives globals from repetition + a hero-button-position rule: 1st hero button → PRIMARY preset, 2nd → SECONDARY).
5. **FR-26-D1 corrected to RESOLVED/MOOT** (uncommitted spec edit finalised this session) — live verification inverted the council's "clear canary post 7" recommendation: theme.json AND post 7 already mirror Mama's full palette + WCAG CSS, so the canary already renders correctly; clearing post 7 is unnecessary + risky. Do NOT clear it.
6. **Doc-walk wrap-up** — reconciled D158 (removed the stale "clear post 7" urgent), added Spec 26 to `docs-registry.yaml`, refreshed `state.md`, walked all 33 canonical docs (verdicts in `.doc-walk-receipt.md`).

## Current State
- **Branch:** `main` (theme thread works on main; commit by explicit path).
- **Build:** n/a — no production code changed this session (design + docs only).
- **Uncommitted:** the Spec 26 FR-26-D1 edit + doc reconciliations (committed at wrap-up); `lucide-icons.php` auto-regen (never committed — documented).

## Outcome vs Completion (Gate 3.5)
- Spec 26 design + ratification: **OUTCOME ACHIEVED** — spec written, council-ratified, docscore 100% A, committed.
- The global-styles **build**: **OUTCOME REVISED — deferred by Bean's scope call** until the cloning phase closes (avoids re-baselining the cloning pixel-diff gate mid-thread). Only FR-26-D2 (REST-write extension) stays urgent/low-risk.

## Known Issues / Blockers
- Without FR-26-D2, the canary's two style layers (theme.json + post 7) re-diverge on the next disk-only `push-theme-snapshot` or any Site-Editor edit — they are synced now ONLY because both were hand-written last session.

## Next Priorities (in order)
1. **FR-26-D2** — extend `push-theme-snapshot.py` to write the live `wp_global_styles` post (the one urgent, low-risk, build-now item; closes `P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES`).
2. Remaining Spec 26 build (Groups A/B/C) — deferred until the cloning phase closes.
3. The pre-existing theme tasks in the orchestration plan (auto-contrast decision, product-page emit, SKU matrix, Wave-2A).

## Files Modified
| File path | What changed |
|-----------|--------------|
| `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` | FR-26-D1 corrected to RESOLVED/MOOT (do NOT clear post 7) |
| `.claude/decisions.md` | D158 reconciled — stale "clear post 7" urgent replaced with FR-26-D1 correction note |
| `.claude/docs-registry.yaml` | Spec 26 entry added |
| `.claude/state.md` | theme-thread Spec 26 line + last_updated 2026-06-03 |

## Notes for Next Session
- Spec 26 SUPERSEDES the Spec 01 §"Per-site theme.json Model" D156 framing — read Spec 26 before touching global styles.
- FR-26-D1 is closed/MOOT; do not re-open the "clear post 7" idea — verification proved it unnecessary and risky (shared canary).

---

# Session Handoff — 2026-06-03 (SGS THEME thread, session 6)

> Theme/blocks thread. Cloning pipeline → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. Big session: Phase D + E + Task D + QC-council + WCAG colour defaults + skip-link, all orchestrated via parallel subagents.

## Completed This Session
1. **Phase E — `sgs/content-collection` block SHIPPED** (new; deployed). Dedicated block, own `WP_Query`, 7 selection rules (newest/featured/most-expensive/cheapest/most-popular/handpicked/category) via meta_query/tax_query, renders each result as a Bound `sgs/product-card`, designed empty state, `contentType` whitelist. Live-verified: queries CPT 522, renders pills, empty state works. block.json 1.1.0. (D154, Spec 24 FR-24-4/5/6.)
2. **Phase D — converter emits `sgs/option-picker`** (D153). DB: `slots` row (pill-group→sgs/option-picker via seed-slot-synonyms.py) + `block_composition has_inner_blocks=0`. convert.py: `_atomic_attrs_for` option-picker handler + a G3-attrs `elif` (calls `_atomic_attrs_for(..., allow_text_fallback=False)`). Live-verified emitting `<!-- wp:sgs/option-picker {optionItems,defaultSelected:"12-pack",typeKey:"pack-size"} /-->`. DB changes are live (not git-tracked).
3. **Task D** — removed redundant `hero` heading block-style (`sgs-heading-variations.php`, D155). heading 0.5.1.
4. **Wave-2A roster CORRECTED** — real FR-22-6 single-`text` targets are `sgs/label`/`sgs/heading`/`sgs/text` (report `reports/2026-06-02-fr22-6-wave2-roster-rederived.md`); the old social-proof/featured-product/... list was mockup SECTION names (not blocks) — fixed in the prompt + classification report + parking last session.
5. **QC-council (3 cross-model raters) + all findings fixed** — pill contrast (WCAG), card max-width, no-JS add-to-cart `<a>` fallback, add-to-cart pending guard, N+1 meta-cache prime, contentType security whitelist, IDOR guard kept, edit.js split (403→203), price-helper dedup, box-shadow, body gap, the G3-attrs text-fallback gate (Opus rater caught it injecting garbage into 11 blocks).
6. **WCAG global colour/spacing defaults** (D156) — theme.json now enables raw custom colour + spacing values (fixes the "gap rejected raw px" class); button-hover + framework-default pairings pass; overridable `--sgs-*` vars + editor controls (cardMaxWidth). Per Bean's constraint: defaults overridable + accept raw CSS.
7. **Mama's canary WCAG fixed + live-verified** — selected pill + Add-to-Cart button now dark-on-pink **5.28:1 PASS** (was 2.49:1). Root cause: live styles come from the `wp_global_styles` DB post (ID 7), which supersedes theme.json; override written to BOTH theme-snapshot.json + the live post via REST. (Memory `canary-live-styles-come-from-wp-global-styles-post`.)
8. **Skip-link theme bug fixed** (D157) — removed a duplicate theme skip link (WP core already provides one); clip-rect hide-until-focus; deployed theme 1.3.9; live-verified.
9. **Security** — anchored the `cardMaxWidth` CSS-injection regex (background review MEDIUM); self-tested + live-verified rejection.
10. **Docs** — Spec 25 (authoritative SGS WooCommerce Experience Layer) created; Spec 24 status→active + meta-keys fixed; decisions D153–D157; plugins CLAUDE.md block status; parking +5 entries; 2 memory lessons (raw-css-controls, wp_global_styles) + MEMORY tidied (24254→~20.2KB).

## Current State
- **Branch:** `main` (committed this session — see commit hash in git log). Origin was `a6d215e2` (cloning D152); this session's commit sits on top.
- **Build:** `npm run build` green; `php -l` clean; converter imports clean; R-22-3 self-test PASS.
- **Deploy:** blocks + theme deployed to sandybrown canary (theme 1.3.9); OPcache reset; live-verified.
- **Uncommitted:** `lucide-icons.php` (documented auto-regen, never committed). DB changes (slots/block_composition) live in sgs-framework.db (not git-tracked).
- **Canary fixtures:** WC product 513, sgs_product 522 (variation-sets), test page 514 `/cart-increment-test/` (cart + bound WC card + content-collection).

## Outcome vs Completion (Gate 3.5)
- Phase D / E / Task D / skip-link / security regex / QC fixes / Mama's WCAG: **OUTCOME ACHIEVED** — each live-verified (render / emit / contrast measured).
- WCAG "out of the box on the majority": **OUTCOME ACHIEVED for normal palettes** (framework defaults pass; raw-value overrides enabled) + Mama's edge case fixed. **Universal auto-contrast for ANY light primary with no per-client override: OUTCOME NOT YET HIT** — deferred (needs CSS `contrast-color()` / build-time luminance; parking P-AUTO-CONTRAST-LIGHT-PRIMARIES). Flagged to Bean as a feature decision.
- Phase D product-PAGE clone: **NOT DONE** — that mockup isn't SGS-BEM (parking P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM); homepage emit works.

## Known Issues / Blockers
- `push-theme-snapshot.py` does NOT update the live `wp_global_styles` post — snapshot pushes silently miss live styles (parking P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES).
- Pill→price/image swap wired but DORMANT (no per-option data; parking P-PRODUCT-CARD-PILL-SWAP-DORMANT, needs SKU matrix).
- Phase D DB rows are live but not git-tracked — survive `/sgs-update`; a fresh clone of the repo won't have them until re-seeded.

## Next Priorities (in order)
1. **Bean decision: universal auto-contrast** (P-AUTO-CONTRAST-LIGHT-PRIMARIES) — pick CSS `contrast-color()` (when support is safe) vs build-time luminance vs per-client-override-only.
2. **Fix `push-theme-snapshot.py`** to also POST the `wp_global_styles` post (P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES) — else future client styling silently fails to deploy.
3. **Phase D product-page** — migrate the product mockup to SGS-BEM, then emit option-pickers there.
4. **Per-option data model (SKU matrix)** to activate the dormant pill swap (Spec 24 FR-24-14).
5. **FR-22-6 Wave-2A real migration** (label/heading/text — HIGH blast radius; deliberate session).

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/src/blocks/content-collection/*` | NEW block (block.json/render.php/edit.js/index.js/style.css + components/) |
| `plugins/sgs-blocks/src/blocks/product-card/{block.json,render.php,edit.js,view.js,style.css}` | Bound mode polish: no-JS cart link, pending guard, overridable vars, cardMaxWidth + anchored regex, box-shadow, gap |
| `plugins/sgs-blocks/includes/class-product-bindings.php` | price-helper dedup (C1) |
| `plugins/sgs-blocks/src/blocks/option-picker/{block.json,style.css}` | selected-pill contrast → foreground default |
| `plugins/sgs-blocks/src/blocks/heading/block.json` + `includes/variations/sgs-heading-variations.php` | hero block-style removed (Task D) |
| `plugins/sgs-blocks/scripts/{orchestrator/converter_v2/convert.py,seed-composition-roles.py,uimax-tools/seed-slot-synonyms.py}` | Phase D option-picker emit + G3-attrs fallback gate |
| `theme/sgs-theme/{theme.json,style.css,assets/css/utilities.css,assets/css/header-modes.css,parts/header.html}` | raw custom values + skip-link fix + version 1.3.9 |
| `sites/mamas-munches/theme-snapshot.json` | Mama's WCAG override vars |
| `.claude/specs/{24,25}`, `decisions.md`, `parking.md`, `reports/2026-06-02-fr22-6-wave2-roster-rederived.md`, `plugins/sgs-blocks/CLAUDE.md` | docs |

## Notes for Next Session
- **Live styles on the canary = `wp_global_styles` post (ID 7), NOT theme.json on disk.** Edit BOTH + POST the post via REST, or changes don't show. `mamas-munches.css` is an orphan (not enqueued).
- **The framework default is white-on-primary** (WCAG-safe for saturated primaries); light-pastel primaries need a per-client dark-text override in their snapshot + the wp_global_styles post.
- **Phase D deviated from its scratch design doc** (kept option-picker as content-block + G3-attrs path, not `→leaf`) — the scratch doc is marked SUPERSEDED.
- **Verify against git, not handoffs** — last session's handoffs were stale on merge-status + parallel-session; this session caught it via `git log`.

---

# Session Handoff — 2026-06-02 (SGS THEME thread, session 5)

> Theme/blocks thread. Cloning pipeline → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`.

## Completed This Session
1. **Stale-handoff correction (ground truth).** The session-4 handoff + next-session-prompt said theme wave-1 was "pushed, NOT merged" on `feat/theme-blocks-wave1` and that no parallel session was active. BOTH were stale: git shows wave-1 WAS merged (`a8cb3ff9`), and a parallel CLONING session is LIVE on `main` (it committed+pushed workstream-A `0d746073`/D150 mid-session). Worked from `main`, committed by explicit pathspec (concurrent-commit-race safe).
2. **Task A — cart badge-increment E2E CLOSED.** Created WooCommerce product 513 (canary had 0). Live-verified (Playwright): add-to-cart → `POST /wc/store/v1/cart/add-item` 201 → `sgs/cart` badge 0→1, no reload, no `wc-ajax`/fragments. `sgs/cart` now fully OUTCOME-ACHIEVED. (P-CART-INCREMENT-E2E resolved → archived.)
3. **Product-card Phase C BUILT + LIVE-VERIFIED + COMMITTED + PUSHED (`6bcdf48c`, D151).** Design gate first: `/research` (research-pipeline, WC Block-Bindings) + Bean sign-off. Bean reframed the model: **SGS card = always-on wrapper; WooCommerce = primary backing store; CPT = no-WC fallback** (D151 refines D149). New `sgs-product/field` Block Bindings source (WC vs CPT routing); render.php Bound mode (explicit `sourceMode`, R-22-14); Interactivity-API pill→context swap + add-to-cart via Store API (reuses Task-A path); editor product picker + ServerSideRender. Build via Sonnet subagent + 2-rater cross-model QC (Sonnet+Haiku) → fixed an IDOR guard, a `wc_get_availability()` fatal (real bug — that fn doesn't exist), and an SSR-getter-wipe bug. Live-verified WC bound (513: price+add-to-cart+badge) + CPT bound (522: pills) + empty state + IDOR guard. Visual-diff report at `reports/visual-diff/product-card-2026-06-02.md`.

## Current State
- **Branch:** `main` @ `6bcdf48c` (pushed). Phase C committed by explicit path. Concurrent cloning session also on main (`0d746073` pushed).
- **Build:** `npm run build` green; `php -l` clean; deployed to sandybrown canary + OPcache reset.
- **Uncommitted:** `lucide-icons.php` (documented auto-regen, never committed).
- **Canary fixtures (kept):** WC product 513, sgs_product 522 (has `_sgs_variation_sets`), test page 514 `/cart-increment-test/`.

## Known Issues / Blockers
- **Pill→price/image swap is wired but DORMANT** — Phase-B `_sgs_variation_sets` stores only `{key,label}` per option (no per-option price/image). Visible swap needs the per-option data model (Phase 2 SKU matrix). NOT a bug; documented in render.php + the visual-diff report.
- **Editor double-wrapper fix is logic-level** — the ServerSideRender bound preview was de-duplicated; not re-opened in a live editor this session (low risk, frontend unaffected).
- **state.md is messy** (duplicate `current_subphase_step` keys accumulated) — needs a `/handoff` regen.

## Next Priorities
1. Phase D — clone-emit (converter outputs `sgs/option-picker` for pill groups; TRUTH-SPEC + slots) per D144.4.
2. Phase E — collection/query block (Spec 24 FR-24-4/5).
3. Per-option data model (Phase 2 SKU matrix) to activate the dormant pill→price/image swap.
4. Remaining theme tasks: FR-22-6 Wave-2A (gated on P-FR226), heading/text dormant-variant tweak (Task D), cart drawer (Phase 2).

## Notes for Next Session
- **VERIFY handoff claims against git before trusting them** — this session's opening handoffs were stale on merge-status AND parallel-session-active. Run `git log --oneline -8` + `git branch` first.
- **Concurrent session on main is real** — commit by explicit pathspec (`git commit -F msg -- <paths>`), never `git add .`; the Bash tool is NOT PowerShell (the `@'...'@` heredoc fails — use `-F <file>`).
- **Option-picker event contract (verified):** `sgs:option-selected`, `detail:{ typeKey, selectedKey, contentImpact }`.

---

# Session Handoff — 2026-06-02 (SGS THEME thread, session 4)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session
1. **`sgs/option-picker`** built + verified (`ee6807d3`). Battle-ready radio-group pill chooser (Spec 24 FR-24-15 / D144 Phase A); native ARIA, no-JS-safe SSR, bubbling `sgs:option-selected` event. Live-verified: default-select renders, click swaps via CSS `:checked`, event contract exact.
2. **notice-banner FR-22-6 migration** (`d8c30a74`) — `echo $content` + sgs/text child + deprecated.js v3 (mirrors shipped info-box v4). Live render clean.
3. **Mega-menu layout library** (`e70cc07a`) — 7 generic patterns + `mega-menu-layouts` category + registered orphan sectors part + "create panel" editor shortcut. Research-gated (block-patterns chosen). All 7 register live.
4. **4 /ui-ux-pro-max design fixes** (`3b85dad1`) — featured-card contrast 3.32→11.86:1, option-picker non-colour selected cue + spacing, card-grid borders. Theme version 1.3.5→1.3.6 (theme-CSS cache-bust).
5. **`sgs/icon` enhancements** (`d7a75870`) — shape backgrounds (circle/pill/square/outline) + clickable (reuses linkUrl) + hover; deprecated.js v1. 5 shapes verified.
6. **Duplicate-animation-panel fix** (`609299e1`) — root cause: `animation.js` imported by two webpack entry points → filter ran twice. Verified: exactly one `sgs/animation-controls` handler now.
7. **Product-card Phase B** (`7115a60d`) — `_sgs_variation_sets` meta + Gutenberg panel + **`custom-fields` CPT fix** (without it the CPT REST schema omitted `meta` → no product meta round-tripped). Verified: meta round-trips via REST, panel renders 0 errors.
8. **`sgs/cart`** WooCommerce count badge v1 (`b6369224`) — Store API hydrate, SSR 0, no jQuery, cart-fragments dequeued. Verified: hydration fetch fires, badge + aria correct.
9. **FR-22-6 roster classification** + null-save migration finding (`470b2149`, parking P-FR226). **4-issue triage:** 3 of 4 reported editor bugs were stale/false (verified vs ground truth); only the animation panel was real.

## Current State
- **Branch:** `feat/theme-blocks-wave1` at `0afd6ab1` — 12 commits, pushed, NOT merged to main (Bean times the merge with the cloning thread per the commit-race lesson).
- **Tests:** no unit suite; `php -l` clean on all touched PHP; `npm run build` green.
- **Build/deploy:** all blocks + theme deployed to sandybrown canary; live-verified. `/sgs-update` run 3× clean (68 blocks).
- **Uncommitted changes:** none — working tree clean.

## Outcome vs Completion (Gate 3.5)
- Waves 1–3 blocks/fixes: **OUTCOME ACHIEVED** — each live-verified (render + behaviour + measurement), committed, gated.
- Product-card Phase B: **OUTCOME ACHIEVED** — data model round-trips via REST + panel renders. (Phases C/D/E are correctly future work, not completion theatre.)
- `sgs/cart`: **CODE SHIPPED, OUTCOME PARTIALLY HIT** — core mechanism (SSR + hydrate + no-jQuery + a11y) verified live; the badge-INCREMENT-on-add-to-cart E2E is NOT yet tested (canary has 0 WC products). Next session seeds a WC product to close it.

## Known Issues / Blockers
- **Cart badge-increment E2E untested** — needs a WooCommerce product on the canary (0 exist). Same Store API fetch path as the verified hydration; low risk.
- **FR-22-6 Wave-2A migrations gated** on resolving the null-save→InnerBlocks finding (parking P-FR226) framework-wide first.
- **Merge to main pending** — Bean directs it when the cloning thread is at a clean point (concurrent-commit-race avoidance).

## Notes for Next Session
- **Theme CSS cache-bust:** theme assets (e.g. `mega-menu-panels.css`) key `?ver=` off the theme `Version:` header — bump `theme/sgs-theme/style.css` Version on any theme-CSS change. Block CSS busts via block.json version. (Caught live this session — the contrast fix didn't apply until the theme version bumped.)
- **CPT meta needs `custom-fields` support** — a CPT must declare `supports => 'custom-fields'` for `register_meta`+`show_in_rest` to expose the `meta` field in REST. Without it, zero meta round-trips.
- **Triage before fixing** — 3 of 4 reported editor bugs were already fixed/false; verifying against ground truth (REST render, edit.js read, editor repro) before dispatching saved a wasted wave.
- **Product-card Phase C = dual-source** (D149): bind to WC-native data when WooCommerce present, custom CPT meta otherwise. Brainstorm + research the WC Block-Bindings pattern BEFORE building.

## Next Session Prompt
See `.claude/next-session-prompt-theme.md` (manual WC product to close cart + enable Phase C testing; product-card Phase C dual-source binding; remaining theme tasks).

---

# Session Handoff — 2026-06-01 (SGS THEME thread, session 3)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session

1. **Mobile-nav full-fix** (`1f985c9a`, deployed + live-verified, D143). Bean's report ("opens tiny, no menu, can't close") root-caused live (CDP, 375px, logged-out) and fixed in 4 parts: **(a) overlay sizing** — `--overlay` variant now overrides the Popover UA `fit-content` defaults (`width:100vw + height:100vh/100dvh + inset:0`) → fills viewport 375×812 (was 208×158); **(b) 16px block-gap strip** — WP flow-layout `:root :where(.is-layout-flow) > *{margin-block-start:16px}` was pushing the drawer down; doubled block class `.sgs-mobile-nav.wp-block-sgs-mobile-nav` (0,2,0) beats it → flush at y:0; **(c) empty menu [universal bug]** — `render_menu_items()` didn't handle `core/page-list` (WP's DEFAULT nav content), so default headers showed 0 menu items; added a `core/page-list` case expanding the published page hierarchy (verified 0 → 13 items + link nav to `/hero-clone-poc/`); **(d) header-only inserter** — new `mobile-nav-inserter-scope.php` (`allowed_block_types_all`, fail-open) removes the 2 chrome blocks from the post/page inserter, keeps them in the Site Editor. view.js confirmed close/ESC/accordions bind without a trigger. block.json 3.0.1→3.0.3 (cache-bust). Visual report `reports/visual-diff/mobile-nav-2026-06-01.md`. `/sgs-update` run clean (10 stages).

2. **Product-card / `sgs/option-picker` design RATIFIED** (D144). Bean answered the 6 open decisions in `.claude/reports/2026-06-01-product-card-option-picker-design.md`; all accepted, two upgrade the design: **(1)** per-type `display_as` mode (`pills` | `static-list` "Available in 3 flavours: …" | `hidden`) + card-level "price only" toggle; **(2)** SKU matrix deferred (editor warning, first type wins); **(3)** filled-in-card/outlined-global pills + 3 CSS states (resting/considering/selected); **(4)** emit `sgs/option-picker` DIRECTLY from the clone (Bean corrected 2026-06-01 — opposite of rec; build the picker ASAP + battle-ready, then wire into the pipeline); **(5)** source toggle in BOTH toolbar + inspector; **(6)** Gutenberg-panel editor UI. Encoded into Spec 24 §FR-24-11/12/15. **The product-card BUILD (Task 2) is now a near-term priority** (Bean: build the option-picker ASAP + battle-ready) — these are the recorded contract the build session inherits.

3. **`/qc-council` doc-consistency audit** (`352bd804`) — 3 cross-model raters over this session's touched docs; resolved 3 real findings (Spec 24 ↔ prompt Phase-D contradiction; stale state.md commit; prompt Task-2 ambiguity) + dismissed 1 false positive (visual-diff report path). `/sgs-update` then run clean (10 stages, 66 SGS blocks, 188 total, WP 7.0, no schema drift).

4. **Full doc-currency sweep across registry + `.claude/` + specs + plans** (Bean-directed; landed in `603cbaaf` — see the commit-race note below). 5 cross-model reader agents over the un-audited doc set. Fixes: documented the cloning thread's D145 (is-style carry + tag-authoritative leaf) + D146 (sgs/button replaces core/button) from their commits; added the missing Spec 11 to `docs-registry.yaml`; Spec 02 §5 trust-bar RETIRED→ACTIVE (slug-reuse clarified); block-count drift 67→66 / attrs 2074→2077 / core 121→122 (verified vs DB); FR-22-20 "design-pending"→"PARTIALLY SHIPPED" (D134); **struck the R-22-14-violating "add legacy fallback" instructions in the phase-2 plan** (a future implementer would have broken a P1-locked rule); parking gift-variant OPEN→CLOSED + duplicate-header OPEN→PARTIAL; duplicate-D93 → D93b; two future-dated headers corrected; pipeline-flow D145/D146 callout; strategy/step2 SUPERSEDED marker.

## Current State
- **Branch:** `main` @ `66444790` — this thread's work (theme code `1f985c9a`; doc commits `ffdbc8d2` D143/D144 + `352bd804` qc-council + the doc-sweep inside `603cbaaf`) is MERGED to main + pushed; the shared `feat/fr22-4-1-universal-wrapper` is DELETED (local + remote); GitHub clean. Bean directed the merge (2026-06-03) once both threads closed (no-ff, zero conflicts). Future theme work starts fresh from `main`.
- **Tests:** no unit suite for mobile-nav; `php -l` clean on all touched PHP; `npm run build` green.
- **Build/deploy:** mobile-nav v3.0.3 deployed to sandybrown canary; live-verified.
- **Uncommitted changes:** none — everything (both threads' code + docs + the leftover lucide/trust-badges/reports/TRUTH-SPEC) is committed + merged to main. Working tree clean.

## Outcome vs Completion (Gate 3.5)
- Mobile-nav: **OUTCOME ACHIEVED** — full-screen + populated 13-item menu + closeable (button+ESC) + links navigate, all live-verified on canary.
- Product-card 6 decisions: **OUTCOME ACHIEVED** — decisions ratified + recorded in Spec 24/D144/report. The BUILD is correctly scoped as deferred (Task 2), not completion theatre.

## Known Issues / Blockers
- **Merge done (2026-06-03)** — both threads closed, Bean directed the merge; `feat/fr22-4-1-universal-wrapper` merged to main + deleted. No longer a blocker.
- **Mobile-nav editor-inserter E2E deferred** — the `allowed_block_types_all` filter is logic-reviewed + fail-open (can't break the editor); the editor-side confirmation (open post inserter, verify the 2 blocks absent) wasn't run. Low risk.
- **Heading/text dormant-variant values (from 7b)** — Bean may want to tweak the agent-added default CSS or drop heading `hero` as redundant.
- **Concurrent-commit race (resolved by the merge)** — during the two-thread session, the theme doc sweep got swept into the cloning thread's `603cbaaf` commit (both threads `git add`/commit the same working tree). Nothing lost; history co-mingled but now all on main. Captured as memory `feedback_concurrent_commit_race_shared_tree`. **Avoid recurrence:** don't run two sessions on one shared branch/tree — use a fresh short-lived branch or separate worktree per thread, commit by explicit path (never `git add .`).

## Notes for Next Session
- **CDP top-layer quirk:** synthetic `dispatchMouseEvent` clicks on popover-internal elements don't reliably trigger anchor nav / hit-test in headless Chrome; programmatic `.click()` + real taps work. Verify popover interactions via `.click()` or visual screenshot, not a CDP click + URL check.
- **Cache-bust on block CSS/JS changes:** bump the block.json `version` field — WP keys the asset `?ver=` off it; redeploying without a bump serves stale CSS to returning visitors (caught live this session).
- **Mobile-nav menu source:** the drawer reads the header `core/navigation` → resolves `ref`/innerBlocks → falls back to the newest `wp_navigation` post; `core/page-list` is now expanded. If a site's mobile menu is empty, check the header nav has a populated `wp_navigation` or page-list.
- **Cloning thread moved under us (parallel, same branch):** since this thread's last code commit, the cloning thread shipped D145 (is-style carry + tag-authoritative leaf routing), D146 (`sgs/button` replaces `core/button` + `sgs/multi-button` grouping), D147 (button `inheritStyle` presets + `video`/`iframe`→`sgs/media`). Net effect for theme work: bare `<a>`/`<button>` now clone as `sgs/button`, and CTA groups as `sgs/multi-button`. Its current priority is CSS-transfer fidelity (D136). Read `.claude/decisions.md` D145-D147 if Task 2's Phase-D clone-emit interacts with the button/multi-button routing.

## Next Session Prompt
See `.claude/next-session-prompt-theme.md` (mobile-nav marked DONE; Task 2 product-card decisions RESOLVED → build now unblocked; Task 5 mega-menu library, Task 9 hybrid migrations, sgs/cart remain; reading list + guardrails intact).

---

# Session Handoff — 2026-06-02 (SGS THEME thread, session 2)

> Theme/blocks/editor-UX thread. Cloning pipeline → `.claude/handoff.md`. Next steps → `.claude/next-session-prompt-theme.md`.

## Completed This Session (Tasks 1, 4, 3 — all live-verified, committed, pushed)

1. **Task 1 — shared visual IconPicker** (`c40c9a49`). New reusable component `plugins/sgs-blocks/src/components/IconPicker/`. Searchable keyboard-navigable grid modal across 4 tabs: Lucide 1,917 / Emoji 1,914 / WordPress 49 / Dashicons. Wired into `sgs/icon` + `sgs/icon-list`. SVGs NOT inlined (avoids core/icon bundle-bloat); static JSON in `assets/icons/`, fetched on demand. Live-verified on canary 144.

2. **Task 4 — notice-banner 5 variants + per-type icons + picker** (`e8048a18`). Added `error` to info/success/warning/accent. Per-type default Lucide icon, overridable via IconPicker; `showIcon` toggle; fixed a frontend bug (old emoji menu rendered nothing). Corner-radius = native Border control. version 0.3.0.

3. **Task 3 — team-member Compact vs Full display modes** (`a55f5a71`). New `displayMode` attr (full default | compact). Photo picker already existed. Live-verified via CDP.

## Bugs Found (→ fixed by cloning thread D141)
- `sgs/media` editor crash (`imageId` undefined) + `sgs/container` validation — both fixed in the cloning thread.

## Current State
- **Branch:** `feat/fr22-4-1-universal-wrapper`. 3 commits pushed (c40c9a49, e8048a18, a55f5a71). Build green; canary deployed.
