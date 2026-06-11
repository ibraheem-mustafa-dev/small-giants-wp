---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
spec: 22
generated: 2026-06-11
status: COMPLETE + SHIPPED + LIVE-VERIFIED 2026-06-12 (on main: 3938a7b0 converter + 09a908fd block-side + d0c083f8/2518914a docs/ledger). Page-8 empty-slides fixed; quote/name/5★ render at 1440/768/~500. Residual (other typed fields + FR-22-20 generalisation + lift-data durability) → parking P-TESTIMONIAL-CONVERTER-FR2220 (PARTIAL) + P-TESTIMONIAL-LIFT-DATA-DURABILITY. ARCHIVED.
primary_goal: "Make the testimonial slider on LIVE page 8 render quote/name/stars again (currently empty) — via the UNIVERSAL DB-driven converter lift (Spec 22 §FR-22-2), NOT a bespoke per-block handler, NOT a new DB table. Then the same mechanism serves every future typed content-block."
---

# Build — testimonial empty-slides fix via the UNIVERSAL multi-scalar lift

> **Invoke `/autopilot` first.** This is a converter-mechanism build → **`/qc-council` is MANDATORY per converter commit** (blub.db 255) and the change is high-blast-radius (design already gated via `/adversarial-council` 2026-06-11 — see "Council must-fixes" below; do NOT re-gate, just incorporate). Commit by explicit path (`git commit -- <paths>`; threads share `main`).

## ⛔ THE 7 NON-NEGOTIABLE RULES (gate every converter action — full text in CLAUDE.md)
1. CONVERT don't mirror · 2. NO CHEATS · 3. UNIVERSAL no carve-outs · 4. NO SKIPPING (every draft class transfers or is reported skipped-with-reason) · 5. VERIFY ON THE REAL HOMEPAGE (live page-8 DOM) · 6. RESPONSIVE VALUES IN ATTRS not inline CSS · 7. DESIGN-GATE shared/converter changes (DONE for this build).

## STOP catalogue (this build's specific traps — do NOT repeat)
- **STOP-A — Do NOT add a bespoke `if slug == "sgs/testimonial"` handler in `_atomic_attrs_for`.** Bean's directive + Spec 22 §FR-22-2: this is a UNIVERSAL DB-data + lift problem. A per-block branch is the exact carve-out R-22-9 forbids. (The existing option-picker/trust-bar handlers are array-of-objects cases; testimonial is pure SCALAR lift and must use the universal path.)
- **STOP-B — Do NOT create a new DB table.** Spec 22 §FR-22-2.3: "Adding a new role-to-block relationship is achieved by adding rows to `slots` + populating `canonical_slot`/`role`/`derived_selector` on `block_attributes`. No new DB table required."
- **STOP-C — Flip `has_inner_blocks` 1→0 for `sgs/testimonial` ONLY. LEAVE `sgs/testimonial-slider` at 1.** The slider correctly iterates `$block->inner_blocks` (testimonial-slider/render.php:50,112) — flipping it breaks the slide loop. (Ship-PM + Converter-RT council, CRITICAL.)
- **STOP-D — The flag flip ALONE = still empty (different cause).** With `allow_text_fallback=False` on the G3 path (convert.py:3772) and no lift data, `_atomic_attrs_for` returns `{}`. The flag + the DB data + the multi-lift wiring must land together or page 8 stays empty.
- **STOP-E — Do NOT let the new multi-lift run for the 4 grid blocks.** `card-grid`/`post-grid`/`gallery`/`content-collection` are also `has_inner_blocks=0` and render from WP_Query/arrays. The lift must be driven by per-attr `derived_selector`/`role` data (which they don't have) so it is a no-op for them — ADD A NEGATIVE TEST proving it returns `{}` for them (Converter-RT M2 + Cynic MISSING-2).
- **STOP-F — Verify the LIVE DOM, not the pixel-diff/golden.** Empty slides score a FALSE pixel WIN against the background (CLAUDE.md root-cause rule #4). Acceptance = `el.innerText.length` on live `.sgs-testimonial__quote`/`__name`/`.sgs-testimonial__stars` at 3 viewports, 2-attestation (emitted markup + live DOM).
- **STOP-G — Populate ONLY the attrs you have hard evidence for.** Set `ratingStars` from `__stars`; NEVER speculatively set `ratingScale`/`reviewDate`/`verified` — `detect_variant` (convert.py:3796-3799) would flip the variant to `rating-led` and render the wrong CSS-only layout. The page-8 draft is `classic-card`.

## ROOT CAUSE (CONFIRMED — 3 evidence sources; do NOT re-investigate)
The D8 rebuild (2026-06-11) turned `sgs/testimonial` from an FR-22-6 InnerBlocks block into a TYPED leaf (typed attrs + 7 variants registered via `/sgs-update`), but `block_composition.has_inner_blocks` stayed **1** (hardcoded stale in `seed-composition-roles.py:60`). So the converter still descends and emits `sgs/star-rating` + 2× `sgs/text` children → the typed `render.php` ignores InnerBlocks (R-22-14 forbids a `$content` fallback) → **empty slides**.
1. **Stored markup** (page 8, sandybrown REST `?context=edit`): each `sgs/testimonial` holds `sgs/star-rating` + 2× `sgs/text` children.
2. **Live rendered output** (REST `content.rendered` = `do_blocks`): **0** `class="sgs-testimonial "` elements; quote text absent.
3. **DB**: `block_composition.has_inner_blocks=1` for `sgs/testimonial` (should be 0, like option-picker/trust-bar/card-grid).

## THE APPROACH — UNIVERSAL DB-DRIVEN LIFT (Spec 22 §FR-22-2 / Spec 00 §3.1)
Bean's directive (verified against the specs): testimonial's content is extracted by the EXISTING universal mechanism — `equivalent_block_for()` + the scalar-lift path (FR-22-5 D1) — once the DB data is populated. The mechanism exists; the DATA is incomplete. Working reference blocks `sgs/text` / `sgs/quote` already carry the rows testimonial lacks:

| attr | role (target) | canonical_slot | derived_selector (DRAFT element) | attr_type | extraction |
|---|---|---|---|---|---|
| `quote` | `text-content` | `text` (or keep `quote`) | `.sgs-testimonial__text` | string | rich-text (wp_kses_post-safe) |
| `reviewerName` | `text-content` | (per resolver) | `.sgs-testimonial__author` | string | **text/plain (esc_html)** |
| `ratingStars` | rating | (per resolver) | `.sgs-testimonial__stars` | number | star-count |

CURRENT DB STATE (verified 2026-06-11): `quote` has canonical_slot=`quote`, derived_selector=`.sgs-testimonial__quote` (rendered element, NOT the draft `__text`), role=**NULL**. `reviewerName`/`ratingStars` are fully NULL. Compare `sgs/text.text` = role `text-content`, canonical_slot `text`, derived_selector `.sgs-text__text` (WORKS).

> **Draft input (real):** `<article class="sgs-testimonial"><div class="sgs-testimonial__stars" aria-label="5 stars">★★★★★</div><p class="sgs-testimonial__text">"…quote…"</p><p class="sgs-testimonial__author">Reham, London</p></article>`. THREE naming spaces: draft (`stars`/`text`/`author`) ≠ typed attr (`ratingStars`/`quote`/`reviewerName`) ≠ rendered (`stars`/`quote`/`name`). The `derived_selector` must point at the DRAFT element (`__text`/`__author`/`__stars`).

## BUILD STEPS (each step: model, file, gate)

**Step 1 — Flag flip (Part C).** `seed-composition-roles.py:60` `"sgs/testimonial": 1` → `0`; add to `ENFORCE_HAS_INNER_BLOCKS` for idempotency. Run `python plugins/sgs-blocks/scripts/seed-composition-roles.py`. Verify DB: testimonial=0, slider=1. (Haiku/inline.)

**Step 2 — DB data (Part A).** Populate `quote`/`reviewerName`/`ratingStars` `role` + `derived_selector` (DRAFT elements) + confirm `attr_type` via the canonical path (`/sgs-update assign-canonical.py` or the seed). Add any missing `slots` aliases so `__text`/`__author`/`__stars` resolve to the SCALAR lift (NOT to a child block — `equivalent_block_for(testimonial, text)` must return NULL so content lifts to the parent's `quote` attr per FR-22-5 D1). **Decision (locked):** `reviewerName` = the WHOLE `__author` string ("Reham, London"), do NOT split name/role (faithful to the draft's single author line; avoids a guess). (Sonnet + `/wp-blocks` + `/sgs-db`.)

**Step 3 — Universal multi-scalar lift (Part B).** Wire the ONE missing piece: in the G3-attrs path (convert.py ~3756-3800), for a typed (`has_inner_blocks=0`) block, read its content attrs' `derived_selector` + `attr_type` + `role` and lift EACH matching inner element's value into its scalar attr — text (`get_text`/`esc`), rich-text (`_rich_text_content`, wp_kses_post-safe attrs only), star-count (aria-label `\d{1,2}` bounded-regex FIRST, then ★ glyph count, **clamp 0-5**; set `showRating = ratingStars > 0`). Driven entirely by DB data — **NO `if slug==`** (STOP-A). The current single-attr graceful fallback (convert.py:3094) does ONE attr; this generalises it to N attrs by derived_selector. (Opus/Sonnet; `/qc-council` MANDATORY before commit; `/subagent-driven-development` implementer + 2 reviewers.)

**Step 4 — Security must-fixes (Abuse-RT council, build-blockers).** `testimonial/render.php:280,283,286` — change `reviewerName`/`reviewerRole`/`orgName` from `wp_kses_post()` → `esc_html()` (plain-text identity fields; stored-XSS otherwise). Clamp `ratingStars`/`ratingScale` in render.php (`min(5,max(0,...))`) AND in the converter star-count extractor. Fix the dead `rating` attr read in `testimonial-slider/render.php:136` (should be `ratingStars`). (Sonnet.)

**Step 5 — Rule-4 card chrome (Support-RT + Converter-RT must-fix).** The draft `.sgs-testimonial` card has `border:1px solid`, `border-radius:12px`, `padding:20px`, `background:white` — currently DROPPED (the block lacks background/border container-mirror attrs → borderless ghost cards). **Decision (locked):** ADD the mirror attrs (`backgroundColour`/`borderColour`/`borderRadius`/`borderWidth`/`borderStyle`) to `testimonial/block.json` + wire into `edit.js` + `render.php` (`__experimentalBorder` already in supports gives native controls — wire `style.border.*` through `get_block_wrapper_attributes()`). Faithful clone (Bean's eye WILL catch borderless cards — measurement-vs-eye rule). If deferred, MUST emit a per-class skip report (Rule 4). (Sonnet; `/qc-council`.)

**Step 6 — Conformance + negative tests (Gate A).** Seed `tests/fixtures/conformance/sgs-testimonial.golden.json` locking the extracted attrs (quote/reviewerName/ratingStars) AND detected variant (classic-card) for the page-8 draft. ADD a negative test: the universal lift returns `{}` (no garbage) for `card-grid`/`post-grid`/`gallery`/`content-collection` (STOP-E). (Sonnet.)

**Step 7 — Deploy, re-clone, LIVE-VERIFY (Rule 5 / STOP-F).** Build (`npm run build`, `--webpack-copy-php`; bump block.json version for the style.css/Rule-4 change — CDN ?ver, memory `bump-block-version-with-any-style-css-change`). Deploy (`build-deploy.py --blocks-only` + OPcache reset). Re-clone page 8 (`/sgs-clone … --converter-v2`). **VERIFY LIVE:** `el.innerText.length > 0` on `.sgs-testimonial__quote`/`__name`/`.sgs-testimonial__stars` on the real page 8 at 375/768/1440, 2-attestation (emitted `wp:` markup + live DOM). Flip ledger rows SP-C/D/E. (`/verify-loop`, `/gap-analysis` before delivery.)

## COUNCIL MUST-FIXES (incorporated above — adversarial-council 2026-06-11, 6 personas)
- Security (M1/M2): esc_html names + clamp stars + bounded star regex [Step 4]. **Build-blocker.**
- Rule-4 card chrome dropped [Step 5]. Converging Support-RT + Converter-RT.
- Flag flip child-only [Step 1 / STOP-C]. Ship-PM CRITICAL.
- Grid-block regression negative test [Step 6 / STOP-E]. Converter-RT M2.
- Variant safety — only ratingStars [STOP-G]. Spec-Lawyer + Converter-RT.
- Live-DOM verify not pixel [Step 7 / STOP-F]. Multiple.
- Existing page-8 delivery = re-clone [Step 7].

## SKILLS TO INVOKE
| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/qc-council` | MANDATORY before EVERY converter/db_lookup commit (Steps 3,5) — blub.db 255 |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Step 3/5 build with reviewers |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" (Step 2 DB data) — query `python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py sql "…"` |
| `/sgs-clone` + `/sgs-update` | Step 7 re-clone + DB sync (`--converter-v2` required on prod runs) |
| `/verify-loop` | Step 7 2-attestation |
| `/gap-analysis` | grade before delivery |
| `/systematic-debugging` | if the lift mis-fires — root cause before fix |

## MCP / TOOLS
| Tool | For |
|---|---|
| chrome-devtools MCP (Playwright fallback on "Browser already in use") | live page-8 DOM/computed-style at 375/768/1440 |
| REST (read-only, no browser) | `curl -s -u "Claude:$WP_APP_PWD" "$URL/wp-json/wp/v2/pages/8?context=edit&_fields=content.raw"` (stored markup) and `?_fields=content.rendered` (do_blocks render). Creds: `.claude/secrets/sandybrown.env` (page 8 = "Homepage", slug `mamas-munches-homepage`). |
| `sgs-db.py` | DB ground truth + data population |

## KEY FILE:LINE (gathered this session)
- `plugins/sgs-blocks/scripts/seed-composition-roles.py:60` — the flag (HAS_INNER_BLOCKS dict)
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — `_atomic_attrs_for` ~2782; graceful single-attr fallback ~3079-3096; G3 gate ~3688-3712; G3-attrs call `_atomic_attrs_for(..., allow_text_fallback=False)` ~3772; `detect_variant` ~3796-3799; `_route_composite_interior` ~3125 (composite reference, not leaf)
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` — `equivalent_block_for` (FR-22-2.1 Tier A/B); `block_accepts_inner_blocks`; `attr_name_for_slot_or_alias` ~410
- `plugins/sgs-blocks/src/blocks/testimonial/render.php` — typed render; guard ~383; names `wp_kses_post` 280/283/286 (→esc_html); SGS_Container_Wrapper 'content' kind ~391
- `plugins/sgs-blocks/src/blocks/testimonial/deprecated.js` — v8inner.migrate() (the className-first+positional extraction the lift mirrors)
- `plugins/sgs-blocks/src/blocks/testimonial-slider/render.php:50,112` — iterates inner_blocks (do NOT flip its flag); :136 dead `rating` read
- `sites/mamas-munches/mockups/homepage/index.html` — draft testimonial section (`__stars`/`__text`/`__author`)
- Spec 22 §FR-22-2 / §FR-22-2.1-2.5 / §FR-22-5 D1 / §FR-22-21 step 5 (parent-scoped resolution); Spec 00 §3.1

## ACCEPTANCE
Ledger rows SP-C/D/E flip to VERIFIED with live page-8 evidence cited per row (innerText > 0 on quote/name/stars at 3 viewports). The aggregate differ score is NOT the gate. `/qc-council` passed on the converter commit. Negative test proves no grid-block regression.

---

## BUILD LOG / RESUME STATE (2026-06-12)

**DONE + COMMITTED (`75f2ffea` — converter mechanism, path-scoped, Gate A pass):**
- Step 1 ✅ `has_inner_blocks` 1→0 for testimonial only (slider stays 1). seed-composition-roles.py.
- Step 2 ✅ DB lift data: `quote`→`.sgs-testimonial__text, .sgs-testimonial__quote` (multi-selector), `reviewerName`→`.sgs-testimonial__author`, `ratingStars`→`.sgs-testimonial__stars`; roles text-content/text-content/rating. (Direct SQL — see parking **P-TESTIMONIAL-LIFT-DATA-DURABILITY**.)
- Step 3 ✅ universal `_lift_scalar_attrs_by_selector` (convert.py G3-attrs path); DB-driven; multi-selector; star clamp 0–5; showRating coupling; **no per-block branch**.
- Step 6 ✅ Gate-A golden re-baselined (self-closing testimonial + quote + reviewerName) + unit tests (positive page-8 + expanded negatives proving the GATE no-ops countdown-timer/decorative-image/star-rating/post-grid/core-image). 22 converter_v2 + 43 conformance pass.
- **qc-council finding (Bean-approved Option A):** the role+derived_selector trigger exists on ~50 blocks, so the lift was over-broad (would re-introduce the suppressed text-dump into date/URL attrs). Narrowed to a DB-driven **opt-in capability** `scalar-content-lift` (block.json `supports.sgs.scalarContentLift` → `/sgs-update` Stage 1 → `block_capabilities` row). Only testimonial opts in.

**DONE + STAGED (block-side commit awaiting live-verify evidence):** Steps 4+5.
- testimonial/render.php: esc_html names + clamp stars/scale; testimonial-slider/render.php:136 dead `rating`→`ratingStars`.
- testimonial/style.css: variant card chrome → `:where()` (Rule-4 faithful transfer, no dead-control attrs); block.json `scalarContentLift` + version 0.3.3.
- **Why staged not committed:** the visual-diff gate wants a passing report for testimonial-slider; deferring to attach REAL live-page-8 visual-diff evidence (verify-then-commit) rather than `--no-verify`.

**REMAINING (Bean deploys, then I verify — Bean's choice 2026-06-12):**
1. **Bean:** `python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty` (plugin-only → avoids theme thread's woocommerce/archive WIP; NOTE: still bundles theme thread's uncommitted product-card — deploy when canary is safe). Then OPcache reset (build-deploy may do it).
2. **Bean or me:** re-clone page 8 on sandybrown via `/sgs-clone --converter-v2` (deploy-target page 8). Page 8 = "Homepage", slug `mamas-munches-homepage`.
3. **Me:** live-DOM verify via chrome-devtools MCP — `el.innerText.length > 0` on `.sgs-testimonial__quote` / `.sgs-testimonial__name` / `.sgs-testimonial__stars` at 375/768/1440 (2nd attestation; 1st = emit smoke/conformance, DONE).
4. **Me:** write visual-diff reports (testimonial + testimonial-slider) → commit block-side (4 staged files) → flip ledger SP-C/D/E to VERIFIED with per-row live evidence.

**Branch:** `feat/spec30-p2-shop-schema` (co-active theme thread shares this worktree — all commits path-scoped). Converter commit is on this branch; merges to main via the temp-worktree cherry-pick pattern at thread close.
