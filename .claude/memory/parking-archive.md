---
doc_type: parking-archive
project: small-giants-wp
generated: 2026-05-24
source: .claude/parking.md (Phase 6c split — doc-op programme)
---

# Parking archive — resolved + closed + retired entries

## 2026-06-06 — archived from parking.md

> **P-TRUSTBAR-BOUND-GRID** — NEW 2026-06-02. **Status: OPEN** (pipeline/converter). trust-bar gap-4: in bound mode the converter-emitted `sgs/container.sgs-trust-bar__inner` grid renders 584px wide / uneven auto columns (143/132/111/160) instead of 1100 / 4×266. Root cause (Bean's diagnosis, confirmed; now mapped to WS-3/C2 in the standardisation plan): the grid lives on the block's own `.sgs-trust-bar--icon-circle` STATIC CSS (trust-bar/style.css:43-101) NOT attr-driven render; bound mode echoes `$content` (the emitted `__inner` container relying on draft CSS) → the block's own grid CSS wins / shrink-wraps. Composite-block CSS conflict — fix = make trust-bar's grid attr-driven (mirror sgs/container) per WS-3/WS-4. Measure live DOM (R-22-11). **RESOLVED 2026-06-05 (D178, commit `e75db509`):** the static `repeat(4,1fr)` grid CSS + `data-columns` overrides were removed from trust-bar/style.css; the grid is now driven by the universal container `layout=grid`/`gridTemplateColumns` wrapper mechanism (+ defaults), and the converter's grid bridge (`c97f85f1`) lifts a draft's grid onto `sgs-trust-bar__inner`. Live-verified: badges render a horizontal row (were collapsed).
> **Archived:** 2026-06-06

> **P-PRODUCT-CARD-PILL-SWAP-DORMANT** — **RESOLVED 2026-06-04 (D164).** No longer dormant: Spec 27 Phase-1 U3/U4 shipped (`7f096976`/`6b4af10a`) — the Bound card reads WC's live per-variation data (NOT `_sgs_variation_sets`, retired for commerce per Spec 27 principle 6) into a seeded 48-combo manifest and swaps price/sale/stock/image on pill click with 0 XHR, live-verified on page 589. The `_sgs_sku_matrix` dependency this entry assumed is DROPPED (WC variations are the matrix).
> **Bucket:** Feature build / Spec
> **Archived:** 2026-06-06

## 2026-06-04 — theme thread Cluster A escape-audit items (RESOLVED)

> **P-IMAGEALT-DOUBLE-ENCODE** — **RESOLVED 2026-06-04 (commit 5fe7cfd5).** `Product_Bindings::get_product_data()` now `sanitize_text_field()`s `image_alt` at storage (was `esc_attr()` → double HTML-entity encode that showed literal entities on the JS image swap). Every output consumer still `esc_attr()`s at output (render.php 152/351/637 + JSON-encoded `data-wp-context` seeds verified). Fix-comprehensive: both array branches (~332 product, ~382 CPT).

> **P-DEMAND-RL-XFF-SPOOF** — **RESOLVED 2026-06-04 (working-as-intended, no code change).** `class-demand-analytics.php` uses `WC_Geolocation::get_ip_address()` which is the WP/WC-standard IP source: it returns `REMOTE_ADDR` by DEFAULT and only trusts `X-Forwarded-For` when the site admin has explicitly configured a trusted upstream proxy (where XFF is the legitimate client IP). Forcing `REMOTE_ADDR`-only would BREAK legitimately-proxied/CDN setups (all guests share one rate-limit bucket). The 200-combo-per-product hard cap is the structural backstop + the counter only increments (no integrity risk). Disposition: keep WC_Geolocation. (Escape-audit reviewer flagged a theoretical mis-config case; the framework-standard call is correct.)

Entries here were moved out of `.claude/parking.md` at Phase 6c of the doc-op programme (2026-05-24). Grouped by completion date (YYYY-MM-DD) where parseable from the original entry text or its source section title; undated entries at the bottom. Original section context preserved as the `_From:_` line on each entry.

## 2026-05-24

_From: Opened 2026-05-24 (Step 1.6 agent audit)_

**P-HALF-MADE-BODY-PATTERNS-NEED-PRODUCTION-READINESS-GATE** — RESOLVED 2026-05-24 (same session). Hand-made body patterns (9 entries: `sgs/featured-product`, `sgs/gift-section`, `sgs/social-proof`, bare `sgs/header`, bare `sgs/footer`, + 4 misnamed inverted-order `sgs/<client>-<role>` header/footer entries) deleted from `sgs-framework.db.patterns` table. Three corresponding .php files removed from `theme/sgs-theme/patterns/`; the other five were already missing (DB/disk drift). Keeper `sgs/footer-indus-foods` retained (canonical naming, shared file with one of the deletions). Long-term architectural enforcement (+REGISTER pixel-diff gate that only INSERTs a pattern after Stage 11 ≤ 1% across 375/768/1440) folded into Phase 1 Step 1.5 as a 5th sub-task — not parked.


_From: Opened 2026-05-24 (Step 1.6 agent audit)_

**P-BLOCKQUOTE-TAG-OVERRIDE-FOR-QUOTE-CANONICAL** — RESOLVED 2026-05-24 second pass via data-layer (NOT tag-side-channel). Initial attempt (Change 3 first attempt) added `canonical_for_html_tag` DB helper + walker `html_tag_priority` branch reading `slot_synonyms.html_semantic_tag` column — Bean rejected as Spec 00 violation (BEM is canonical naming layer; tag-based routing creates a competing canonical path that won't generalise to draft authoring). Reverted that approach. Final resolution = data-layer fix: moved "quote" alias from text canonical to quote canonical in `slot_synonyms` (DB + seed-slot-synonyms.py), added "blockquote" + "pullquote" as quote canonical aliases. Brand mockup BEM also renamed to `<div class="sgs-brand__quote">` for consistency (tag-neutral). Existing composite_element walker branch routes `__quote` BEM to sgs/quote via the corrected data. Zero walker code added beyond section_inner_absorb. Brand emits `<!-- wp:sgs/quote {"className":"sgs-brand__quote","attribution":"— Zainab…",...} /-->`. Universal: any draft using `__quote` / `__blockquote` / `__pullquote` BEM routes to sgs/quote naturally. Captured architectural lesson at `feedback_evidence_based_deduction_not_probabilistic.md`. Original — historical record:


## 2026-05-23

_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-PHASE-5B-INERT-CUSTOMISER-OUTPUT** — RESOLVED 2026-05-23 (Wave B1). Code-evidence audit confirmed: the `:root` CSS custom property emission has ALREADY SHIPPED — `class-sgs-header-renderer.php:73-78` emits `:root{--sgs-header-bg:...;--sgs-header-text:...;--sgs-header-link:...;--sgs-header-width:...;}` and `class-sgs-footer-renderer.php:68` does the same for footer. Both renderers are wired via `Sgs_Header_Renderer::register()` and `Sgs_Footer_Renderer::register()` at `sgs-blocks.php:213+215`, hooked to `wp_head`. Paint rules consume the vars on `header.wp-block-template-part` / `footer.wp-block-template-part` (the WP-canonical wrappers — also part of commit `0ef032fe`). The "consume via theme.json" half referenced in the original entry is an architectural-preference cleanup (vs the current inline-style paint) — it does not change user-visible behaviour. Surfaced as new entry P-PHASE-5B-THEMEJSON-CONSUMPTION-PURITY below for future cleanup. Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY** — RESOLVED 2026-05-23 (Wave A). Playwright on sandybrown Customiser confirmed WP 7.0 native `wp_enqueue_view_transitions_admin_css` is firing — characteristic `@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } #adminmenu > .menu-top { view-transition-name: attr(...); } }` CSS present inline. 0 SGS polyfill injections detected. `document.documentElement` carries `viewTransitionName: "root"`. Stylesheet bundle loads `ver=7.0` confirming WP 7.0 surface. Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP** — RESOLVED 2026-05-23 (Wave A bonus closure). Playwright verification of P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY confirmed the WP 6.x fallback at `plugins/sgs-blocks/sgs-blocks.php:200-217` is NOT firing on the WP 7.0 site (0 bare `@view-transition` injections; `function_exists('wp_enqueue_view_transitions_admin_css')` evaluates true). Cleanup completed per sgs-blocks.php:219 comment 2026-05-22. Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-QC-COUNCIL-FIXTURE-SMOKE-TEST** — RESOLVED 2026-05-23 (Wave A). Sonnet rater walked through `~/.agents/skills/qc-council/scripts/fixtures/example-council.json` against current SKILL.md. Stage 5 hard gate logic verified against the fixture's `expected_stage_5_verdicts`: both G2 and G4 falsified as expected (G2 — consumer never received scope-prefixed input; G4 — `el.screenshot()` already clips bounding box, chrome was never in captured pixels). Schema drift check: NO drift between fixture and current SKILL.md. Stage 1.5 structural pre-gates (added since fixture was written) are non-breaking. Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF** — RESOLVED 2026-05-23 (Wave A). Haiku rater enumerated 8 dispatch-graph node references in `~/.agents/skills/subagent-driven-development/SKILL.md`; 7 resolved cleanly; the lone gap was `superpowers:writing-plans` at line 319 (legacy reference; absorbed by /strategic-plan + /phase-planner during SGS lifecycle migration). Fixed inline by updating the reference to name both successor skills. NOTE: skillscore hook flagged the SKILL.md at 84% (pre-existing structural debt — no numbered stages, no hooks/, no scripts/, body 317 lines). My one-line xref fix did NOT introduce those; they pre-date this session. Surfaced as new entry P-SUBAGENT-DRIVEN-DEV-SKILLSCORE-DEBT below. Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-WPCS-FUNCTIONS-PHP-DEBT** — RESOLVED `1be164ce` 2026-05-23. phpcbf auto-fixed 45/58; manual docblock pass closed remaining 13. `phpcs --standard=WordPress theme/sgs-theme/functions.php` now exits 0. Moved to resolved section below.


_From: Session B (2026-05-22) — parked follow-ups_

### P-5A-CLIENT-VARIATION-CSS-PATH — orchestrator helper writes intermediate to retired deploy surface

**Status:** REFRAMED 2026-05-23 by /qc-council. Original framing ("redirect to `sites/<client>/theme-overrides.css`") and the "retire Stage 0.7 entirely" hypothesis were both **falsified**. Council found a downstream pipeline consumer at `sgs-clone-orchestrator.py:1412-1421` (the G2 merge — reads the file back into `_section_css` so cv2's `_collect_css_decls_for_element` can see scoped rules). The `.css` file is a **legitimate pipeline intermediate**, not dead code — but it's written to the retired deploy-side path `theme/sgs-theme/styles/<client>.css`.

**Bean's directive (2026-05-23):** "We're not supposed to have per client CSS variation files. It's just supposed to be the general wp theme css/styles structure which we customise per client via cli to align with their local json snapshot which is why those folders are empty. They were emptied on purpose." → applies to **DEPLOY artefacts** (the empty `theme/sgs-theme/styles/` folder is intentional and must not be repopulated with WP-enqueued files). Does NOT apply to pipeline-internal intermediates.

**Refined fix-shape:** Relocate the Stage 0.7 intermediate `.css` from `theme/sgs-theme/styles/<client>.css` to `pipeline-state/<run>/variation.css` (or similar pipeline-state location). The orchestrator + cv2 still merge it via the existing G2 path; `theme/sgs-theme/styles/` stops carrying the illusion that it's a live deploy surface.

**Where:**
- `sgs-clone-orchestrator.py:319` — `_client_variation_css_path(client)` returns the legacy deploy path
- `sgs-clone-orchestrator.py:462` + `:516` — writers via the helper
- `sgs-clone-orchestrator.py:1412-1421` — G2 merge reader (the downstream consumer that proves this is NOT dead code)
- `css_router.py:719` — comment refers to old path; needs update
- `convert.py:3009` — comment refers to `mamas-munches.css`; needs update

**Estimated effort:** ~30-45 min (4 file touches + a run-pipeline-and-verify-G2-still-merges sanity check). Was originally classified as a 15-min quick win — council promoted it.

**Trigger:** Task 4 / Wave 2 reshape — sequenced alongside the G1+G3+G5 wiring fix (touches the same orchestrator stage boundary).


## 2026-05-22

_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-PHASE-5B-PROPERTY-COVERAGE-AUDIT** — RESOLVED 2026-05-22 (Session B). Coverage audit confirmed all properties covered by WP 7.0 native theme.json button support — no PHP shim required. Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-UNEXPECTED-CONTENT-BACKLOG** — RESOLVED `830f627b` + `d18b7354` 2026-05-22. Step 0 audit fixed 33 invalid block instances across 9 template parts (WP 7.0 save-format changes). Moved to resolved section below.


_From: Opened 2026-05-22 (Phase 1.5 session)_

**P-EXPLICIT-DEFAULT-STYLE-RETROFIT** — DECIDED 2026-05-22. Bean confirmed: "implicit Default is fine". Closing as decided — no work required. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-1** — RESOLVED (pre-2026-05-22, prior session). DB merge shipped as prerequisite for Phases 2-4. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-4** — RESOLVED `39d32799`→`99081252` (6 commits) 2026-05-22. All 9 stages of sgs-update-v2 shipped — scaffold, Stages 1/2/3/4/5/6/7/8/9, entrypoint swap, DB cleanup. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-7** — RESOLVED `da19374c` + `b26abf56` 2026-05-22. `Sgs_Ai_Connector` PHP wrapper shipped (Step 7.1); 10 WP-family skills audited for WP 7.0 alignment (Step 7.2 report at `reports/2026-05-22-phase-7-wp-skills-audit.md`). Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-WP70-BUTTON-BRIDGE-AUDIT** — SUBSUMED by P-PHASE-5B-PROPERTY-COVERAGE-AUDIT (RESOLVED 2026-05-22). Audit confirmed full WP 7.0 coverage — no shim needed. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-WP-SKILLS-AUDIT-SCOPE** — RESOLVED `b26abf56` 2026-05-22. 10 wp-* skills audited for WP 7.0 alignment; consolidated report at `reports/2026-05-22-phase-7-wp-skills-audit.md`. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-AI-CONNECTORS-PROVIDER-ROSTER** — RESOLVED `da19374c` 2026-05-22. `Sgs_Ai_Connector` shipped with `@roadmap` PHPDoc listing OpenAI/Anthropic/Gemini/Ollama as documented future providers. Infrastructure-only as planned. Moved to resolved section below.

---


_From: Session B (2026-05-22) — parked follow-ups_

### P-5A-COMMIT-B-RETIRED — delete `plugins/sgs-blocks/_retired/` after soak

**Status:** STILL OPEN — `_retired/` directory confirmed still present on disk (verified 2026-05-22). Sandybrown ran stable for the entire session post-deploy; eligible for deletion. Commit B (`git rm -r plugins/sgs-blocks/_retired/`) is the next action when Bean gives the go-ahead.
**Source:** Phase 5a two-commit safety pattern (Decision 32, Session B). Commit A (`43a93df9`) MOVED the picker classes to `_retired/`. Commit B = the actual `rm` of `_retired/`.
**Soak status:** sandybrown ran for the entire session post-deploy with zero `register_block_variation`-unrelated fatals attributable to the archived classes. Eligible for deletion.
**Acceptance when this lands:**
- `git rm -r plugins/sgs-blocks/_retired/`
- Single commit on main
- Re-deploy + smoke test confirms no regression


_From: Session B (2026-05-22) — parked follow-ups_

### P-5A-MAMAS-MUNCHES-CSS — fold `theme/sgs-theme/styles/mamas-munches.css` into the site

**Status:** RESOLVED `202922c1` 2026-05-22. Housekeeping commit confirmed this was not Bean's manual edit — the file was an orphan from Phase 5a's variation system kill. Deleted. `theme/sgs-theme/styles/` is now empty. Mama's branding intact via `theme-snapshot.json`. Moved to resolved section below.
**Why:** Phase 5a's variation kill emptied `theme/sgs-theme/styles/` of JSON files but the `mamas-munches.css` file remains there (pre-existing uncommitted edits from Bean). Acceptance criterion "styles/ is empty" therefore unmet on this file.
**Options:**
- A. Fold its CSS into `sites/mamas-munches/theme-snapshot.json`'s `styles.css` field (single canonical surface)
- B. Move it to `sites/mamas-munches/theme-overrides.css` + enqueue via per-site mu-plugin
**Acceptance when this lands:**
- `theme/sgs-theme/styles/` contains zero files
- Mama's branding still renders correctly on sandybrown


_From: Session B (2026-05-22) — parked follow-ups_

### P-6-MISSING-BLOCK-JSON — 4 DB rows have no source `block.json`

**Status:** PARTIALLY RESOLVED `874a841d` 2026-05-22. Phase 4 Step 4.7 retired 3 stale DB rows with no implementation. The remaining discrepancy (69 of 73 markup_examples) needs Bean's decision: create the 4 missing `block.json` files (Option A) or set those DB rows to `status='retired'` (Option B). **DECISION-NEEDED.**
**Why:** Phase 6 Step 6.1 hit 69 markup_examples not the expected 73 because 4 blocks present in the DB (status `built` or `planned`) have no source `block.json` file. Examples: `stats-bar`, `icon-grid` (subagent named these); 2 others unnamed in the subagent's report.
**Options:**
- A. Create the 4 missing `block.json` files (would let the markup-example generator complete the set)
- B. Set the orphan DB rows to `status='retired'` or remove them
**Acceptance when this lands:**
- `SELECT COUNT(*) FROM markup_examples WHERE source='sgs'` matches `SELECT COUNT(*) FROM blocks WHERE source='sgs' AND status IN ('built','planned')`
- Discrepancy is intentional and documented if not zero


_From: Session B (2026-05-22) — parked follow-ups_

### P-PRE-EXISTING-LUCIDE-ICONS-PHP — Bean's uncommitted edits to lucide-icons.php

**Status:** RESOLVED `202922c1` 2026-05-22. Housekeeping commit reverted the uncommitted lucide-icons.php diff (was a 1-line auto-generation timestamp bump, not Bean's manual edit). Moved to resolved section below.

---


_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-PHASE-5B-INERT-CUSTOMISER-OUTPUT** — **REOPENED 2026-05-22 by /qc-council Rater C.** Commit `0ef032fe` fixed the Customiser paint targets (`header.wp-block-template-part` / `footer.wp-block-template-part`), but `state.md:68` describes a remaining Option A step: emit `:root { --sgs-header-bg: ...; --sgs-footer-bg: ...; }` from the renderer + consume via theme.json. ~30 min, scoped follow-up. The selector fix landed; the CSS-custom-property emission path has NOT shipped. Moved back to open section below.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-PHASE-5B-PROPERTY-COVERAGE-AUDIT** — RESOLVED 2026-05-22 (Session B). Coverage audit confirmed full WP 7.0 native theme.json button coverage — no PHP shim required.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-UNEXPECTED-CONTENT-BACKLOG** — RESOLVED `830f627b` + `d18b7354` 2026-05-22. Step 0 fixed 33 invalid block instances across 9 template parts for WP 7.0 save-format changes.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-EXPLICIT-DEFAULT-STYLE-RETROFIT** — DECIDED 2026-05-22. Bean confirmed implicit Default is fine; no retrofit required.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-1** — RESOLVED (prior session, pre-2026-05-22). DB merge shipped as prerequisite for Phases 2–4.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-4** — RESOLVED `39d32799`→`99081252` (6 commits) 2026-05-22. All 9 stages of sgs-update-v2 shipped.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-7** — RESOLVED `da19374c` + `b26abf56` 2026-05-22. `Sgs_Ai_Connector` + 10 WP-family skills audited for WP 7.0.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-VARIATION-KILL-OPEN-QUESTIONS** — SUBSUMED by P-ARCH-PHASE-5A (RESOLVED `43a93df9`). Both questions answered during Phase 5a implementation.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-WP70-BUTTON-BRIDGE-AUDIT** — SUBSUMED by P-PHASE-5B-PROPERTY-COVERAGE-AUDIT (RESOLVED 2026-05-22). No shim needed.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY** — **REOPENED 2026-05-22 by parking-vs-plan alignment check.** Decision 27 in the architecture staging plan explicitly requires a verification gate: "Phase 5b implementer MUST verify in live testing that view transitions actually fire when navigating between Customiser panels." Phase 5b shipped the `customize_controls_enqueue_scripts` wiring, and this session retired the WP 6.x fallback (`c09d24cc`) — but no live verification of view transitions firing in Customiser has been recorded. **Trigger:** before declaring Phase 5b fully shipped.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-WP-SKILLS-AUDIT-SCOPE** — RESOLVED `b26abf56` 2026-05-22. Consolidated WP 7.0 skills audit report at `reports/2026-05-22-phase-7-wp-skills-audit.md`.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-AI-CONNECTORS-PROVIDER-ROSTER** — RESOLVED `da19374c` 2026-05-22. `@roadmap` PHPDoc on `Sgs_Ai_Connector` lists OpenAI/Anthropic/Gemini/Ollama.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-BLOCK-COMPOSITIONS-READ-PATH** — SUBSUMED by P-ARCH-PHASE-3 (RESOLVED `79158da5`). Phase 3 rewrite is the read-path this item requested.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-5A-MAMAS-MUNCHES-CSS** — RESOLVED `202922c1` 2026-05-22. File confirmed orphan; deleted. `theme/sgs-theme/styles/` is now empty. Mama's branding intact via `theme-snapshot.json`.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-PRE-EXISTING-LUCIDE-ICONS-PHP** — RESOLVED `202922c1` 2026-05-22. Reverted auto-generation timestamp bump; not Bean's manual edit.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-5A-COMMIT-B-RETIRED** — RESOLVED `db69b693` 2026-05-22. `plugins/sgs-blocks/_retired/` deleted; 5 files removed (~1453 LoC). Soak period since Phase 5a passed; sandybrown stable. Confirmed by /qc-council Rater B + Rater C.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP** — RESOLVED `c09d24cc` 2026-05-22. WP 6.x view-transitions fallback retired in `sgs-blocks.php:218-228`; all clients on WP 7.0+. Confirmed by /qc-council. NOTE: the original "DECISION-NEEDED" stub at the top of this file may still reference this entry — clean up on next parking touch.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-PHASE8-17** — RESOLVED `9a32a164` (pre-this-session). All 7 remaining static SGS blocks converted to dynamic via parallel agent dispatch. Confirmed by /qc-council Rater B and explicit "DONE" marker at parking.md:702.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-EXTRACT-GENERALISE** — **ABANDONED 2026-05-22.** Legacy `tools/recogniser-v2/extract.py` path permanently retired per Decision 2026-05-15(d) (`.claude/decisions.md:375`). `sgs-clone-orchestrator.py:1203` confirms "Legacy tools/recogniser-v2/extract.py subprocess is permanently retired." cv2 + Spec 16 universal extraction replaced it. Mechanism gone; no work pending.


_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-PHASE8-16** — RESOLVED 2026-05-22. `_STILL_STATIC_SGS_BLOCKS = frozenset()` shipped at `convert.py:961`. Spec 16 FR-NEW addition landed in the same-session doc-walker pass: `is_dynamic` DB check now documented in Spec 16 §FR-NEW (`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`).

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-PHASE8-8** — RESOLVED 2026-05-22. Per-section closure-gate shipped at `autonomy_gate.py:102` (binding rule blub.db row 256). Spec 16 §Phase 4 FR7 text updated in the same-session doc-walker pass to require per-section ≤1% with `--selector` flag.

## 2026-05-21

_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-0.5** — RESOLVED `6eaadbc2` 2026-05-21. Structural QC enforcement hook + edit tracker shipped. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-2** — RESOLVED `cc541e94` 2026-05-21. 12 composite block variations + styles shipped via `get_block_type_variations` filter. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-3** — RESOLVED `79158da5` 2026-05-21. INNER_BLOCK_PATTERNS retired; DB-backed lookup via `blocks.parent_block` + `slot_synonyms.standalone_block`. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-5A** — RESOLVED `43a93df9` 2026-05-21. Variation system killed + per-site snapshots + push CLI shipped. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-5B** — RESOLVED `60220b13` + `0ef032fe` 2026-05-21/22. Customiser migration + button presets + view transitions shipped; paint fix for header/footer selectors applied. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-PHASE-6** — RESOLVED `d307c8b0` 2026-05-21. Markup examples + supports backfill + WP 7.0 audit shipped. Lucide REST partial (see P-6-LUCIDE-REST-ENTRY-POINT for remaining gap). Moved to resolved section below.


_From: Opened 2026-05-21 (Wave 2 reshape + pipeline reality findings + qc-trio follow-ups)_

**P-SGS-WAVE-1-G2-COMMIT** — RESOLVED `affca3f1` 2026-05-21. G2 Step 1+2 squashed and committed — orchestrator merges variation CSS into `_section_css`, cv2 strips `.page-id-N` scope prefix. Moved to resolved section below.

---


_From: Opened 2026-05-19 (post-rename + Stage 10 wiring)_

**P-NO-HEADER-FOOTER-BLOCK-HOOK** — RESOLVED `8838b6fb` 2026-05-21. PostToolUse blocker for `src/blocks/(header|footer|nav)/` shipped and wired via `.claude/settings.json`. Moved to resolved section below.


_From: Opened 2026-05-21 (Option A cleanup sprint outcomes)_

**P-DRIFT-CHECK-HOOK-UPDATE — RESOLVED 2026-05-21.** Replaced by `.claude/hooks/drift-check-dispatcher.py` — single PostToolUse hook wired via `.claude/settings.json` that runs 5 checks against the 4 high-drift-risk truth-doc surfaces:
- Check 1 (POSTURE A — warn): Script inventory drift in `cloning-pipeline-flow.md`
- Check 2 (POSTURE B — block via exit 2): DB schema row-count drift (sgs-framework.db ↔ flow doc / Spec 16 §12)
- Check 3 (POSTURE A): Skill dispatch chain drift (~/.claude/skills/*/SKILL.md vs flow doc)
- Check 4 (POSTURE A): Stage status nudge (stage-owning script edited → verify STATUS line)
- Check 5 (POSTURE A): Spec 16 FR/R drift nudge (cv2/orchestrator edited → verify §3 FR + §2 R)

Old `tooling-map-drift-check.py` stays tombstoned (not wired). Posture A checks emit systemMessage JSON; posture B (DB) writes to stderr + exit 2 (blocks until acknowledged). Smoke-tested 2026-05-21 with synthetic payloads; false-positive on regex tightness already caught + fixed (tight pattern requires `(N rows)` parens within 40 chars of table name).


_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-0.5** — RESOLVED `6eaadbc2` 2026-05-21. Structural QC enforcement hook + edit tracker shipped (Decision 31).

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-2** — RESOLVED `cc541e94` 2026-05-21. 12 composite block variations + styles via `get_block_type_variations` filter.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-3** — RESOLVED `79158da5` 2026-05-21. INNER_BLOCK_PATTERNS retired; DB-backed `blocks.parent_block` + `slot_synonyms.standalone_block` lookup.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-5A** — RESOLVED `43a93df9` 2026-05-21. Variation system killed; per-site theme-snapshot.json + push CLI shipped.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-5B** — RESOLVED `60220b13` + `0ef032fe` 2026-05-21/22. Customiser migration + button presets + view transitions + paint fix.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-ARCH-PHASE-6** — RESOLVED `d307c8b0` 2026-05-21. Markup examples + supports backfill + WP 7.0 audit. (Lucide REST entry point remains open as P-6-LUCIDE-REST-ENTRY-POINT.)

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-SGS-WAVE-1-G2-COMMIT** — RESOLVED `affca3f1` 2026-05-21. G2 Step 1+2 squashed and committed.

_From: Resolved (auto-closed during 2026-05-22 architecture programme close-out)_

- **P-NO-HEADER-FOOTER-BLOCK-HOOK** — RESOLVED `8838b6fb` 2026-05-21. PostToolUse blocker for header/footer/nav src paths wired.

## 2026-05-20

_From: 2026-05-14 parked items (Spec 16 session)_

### P-S18-LEGACY-CUSTOMISER-CONTROLS-ORPHANED — RESOLVED 2026-05-20
**Resolution.** Branch J deleted all 7 theme-side files (985 lines): `inc/floating-ui-customiser.php`, `inc/floating-ui-output.php`, plus 4 CSS/JS theme assets (`back-to-top.css`, `reading-progress.css`, `back-to-top.js`, `reading-progress.js`, `customiser-preview.js`). `theme/sgs-theme/functions.php` updated to drop the two `require_once` lines. Customiser → SGS Floating UI section now shows exactly 7 Spec 18 canonical controls. All output handled by the plugin's `Sgs_Floating_UI_Renderer` (no more theme-side parallel system). Commits `af5755b2` + `2be7c648`.

---


_From: 2026-05-14 parked items (Spec 16 session)_

### P-PHASE-2A-WRAPPER-CLASS-NOT-INJECTED — RESOLVED 2026-05-20
**Resolution.** Branch I replaced both DOM-injection attempts with a body_class strategy. PHP `add_filter('body_class', ...)` walks rules + appends `sgs-has-header` (always) + `sgs-has-header-behaviour` + `sgs-header-behaviour-{slug}` to the body. CSS targets `body.sgs-header-behaviour-* header.wp-block-template-part`. JS reads behaviour from body class, toggles `body.is-header-scrolled` + `body.is-header-scrolling-down` for state. WP-core specificity conflict on `position`+`top` resolved via `!important` on those two properties only (z-index won naturally). Version bumped 0.1.1 → 0.1.2 to bust browser cache.

**Verified live on sandybrown 2026-05-20:**
- `body_sticky: true`, `css_ver: ?ver=0.1.2`
- `header_position: 'sticky'`, `header_top: '0px'`
- `scroll_padding_top: '80px'` (WCAG 2.4.11 fix live)
- `--sgs-header-height: '80px'` (ResizeObserver publisher works)

Commits: `6dc19f07` (Branch I body_class strategy) + `9a6808d5` (merge) + `0201c0d9` (!important + version bump).

Sibling parking entry `P-S18-TRANSPARENT-PATTERN-IS-STUB` can now be acted on — recommendation per Branch J audit: delete the 3 stub patterns (`framework-header-transparent`, `framework-header-sticky`, `framework-header-shrink`) since behaviour layer replaces them. Decision needs Bean confirmation.

---


## 2026-05-19

_From: Opened 2026-05-19 (Spec 17 council outcome — header/footer architecture)_

### P-S17-A — Independent colour + typography preset split — PROMOTED TO IN-SCOPE 2026-05-19 — see Spec 17 §S8

**Status:** DONE. Implemented as Wave 1 Task E. Commit: [hash].

**What:** Today each style variation JSON bundles colour + typography + spacing together. Top block themes (Twenty Twenty-Five, Ollie) split colour stacks and typography stacks into separate `/styles/colors/` and `/styles/typography/` folders. Result: 8 colour presets × 9 typography presets = 72 design combinations from 17 files instead of 72 separate variation JSONs.

**Fix shape:** Refactor `theme/sgs-theme/styles/` into two subdirectories. Update Site Editor Styles panel to surface both axes. Existing variations remain as bundled "complete" presets but operators can mix.

**Trigger (historical):** When SGS reaches 8+ client style variations OR a client requests "I like Mama's colours but with the Indus typography."

**Source:** Spec 17 council, Seat 1 Round 2 endorsement. Promoted by Bean 2026-05-19.


_From: Opened 2026-05-19 (Spec 17 council outcome — header/footer architecture)_

### P-S17-TESTS-BOOTSTRAP — RESOLVED 2026-05-19

**Resolution:** `test_site_info.php` moved to `plugins/sgs-blocks/tests/php/SiteInfoTest.php` (renamed class `Test_Sgs_Site_Info` → `SiteInfoTest` per PHPUnit `*Test.php` discovery + PSR-4 convention). Inherits the existing `tests/php/bootstrap.php` which autoloads composer + PHPUnit. `test_site_info_binding.php` retained at `scripts/tests/` — it uses a self-contained `t_equals`/`t_contains` standalone runner (not PHPUnit), runs directly via `php`.

**Verification:** `vendor/bin/phpunit --filter SiteInfoTest` is the canonical run command once `composer install` populates `vendor/`. Wave 1B's original 10/10 pass came via the file's `class_exists('PHPUnit\Framework\TestCase')` fallback runner — that fallback is still intact, so the file runs both via PHPUnit (after composer install) and via raw `php` (without).

**intelephense note:** intelephense still flags `TestCase` + assertion methods as undefined until `composer install` runs and `vendor/autoload.php` is on its include path. Existing `BlockRegistrationTest.php` / `FormSubmissionTest.php` / `RenderOutputTest.php` show the same warnings. Not a blocker.


_From: 2026-05-14 parked items (Spec 16 session)_

### P-S17-W3-HEADER-RULES-SPLIT: Split class-sgs-header-rules.php — RESOLVED 2026-05-19

**Resolution:** ReDoS guard helpers + static-blacklist regex table extracted to `class-sgs-header-rules-redos-guard.php`. Main engine dropped to ~280 lines. Footer rules engine (`class-sgs-footer-rules.php`) authored with the post-split structure from the start. Both engines under 300-line cap.

Source: Round 1 Wave 3 dispatch 2026-05-18.


_From: 2026-05-14 parked items (Spec 16 session)_

### P-S17-W3-HEADER-RULES-TESTS: Add HeaderRulesTest + HeaderRulesReDoSGuardTest — RESOLVED 2026-05-19

**Resolution:** Follow-up dispatch in the same session added `HeaderRulesTest.php` (8 engine tests) + `HeaderRulesReDoSGuardTest.php` (7 guard tests) to `plugins/sgs-blocks/tests/php/`. All 15 tests passing.

Source: Round 1 Wave 3 truncated final response 2026-05-18.


_From: 2026-05-14 parked items (Spec 16 session)_

### P-S17-W3-VARIATION-PICKER-SPLIT: Split class-sgs-variation-picker.php — RESOLVED 2026-05-19

**Resolution:** Legacy theme_mod migration helpers extracted to `class-sgs-legacy-theme-mod-migrator.php` (~70 lines). Main picker class dropped to ~245 lines. `wp sgs theme-mod restore` CLI command wraps the migrator as planned.

Source: Round 1 Wave 3 dispatch 2026-05-18.


_From: 2026-05-14 parked items (Spec 16 session)_

### P-S17-W1B-SANITIZE-KEY-STRIPS-SLASH: `Sgs_Template_Part_Meta::mark_seeded()` mangles pattern slugs — RESOLVED 2026-05-19

**Resolution:** `sanitize_key()` replaced with custom sanitiser allowing `[a-z0-9_/\-]` (preserves slash). Round-trip integrity test added to the template-part-meta PHPUnit file. `wp sgs reset-template-parts` now displays the canonical slug without mangling.

Touch points: `plugins/sgs-blocks/includes/class-sgs-template-part-meta.php` + `plugins/sgs-blocks/tests/php/TemplatePartMetaTest.php`.

Source: FR-S2-1 Round 1 subagent finding 2026-05-18.


## 2026-05-18

_From: Opened 2026-05-17 (architecture fix surfaced at session close)_

### P-USE-PAGES-NOT-POSTS — Pipeline target should be WP PAGES, not POSTS (FOUNDATION, ~30 min) — **CLOSED 2026-05-18**

**Resolution:** Page 131 (`/cv2-output-mamas-munches/`) created via REST; page 132 (`/mockup-baseline-mamas-munches/`) created as baseline sibling. `reports/brand-walkdown-2026-05-19/upload_and_patch.py` rewritten with `argparse` — accepts `--target page|post` + `--target-id <N>`, defaults to `--target page --target-id 131`. Convention documented in root `CLAUDE.md` under "Site Migration". Pushed yesterday's `extract.patched.json` block_markup to page 131; rendered HTML confirms `<main class="...is-layout-flow...">` (no 800px cap) vs post 65 which still renders `is-layout-constrained`. Architectural existence proof matches hero-clone-poc. Captured 2026-05-18.

**Bean's question 2026-05-17:** "Why are you using post templates for pages anyway?"

**Honest answer:** historical inertia. Posts 65 + 66 were created early in the project as test surfaces with slugs `spec16-p7-converter-v2-output-2026-05-15` + `spec16-p7-mockup-baseline-2026-05-15`. The handoff said "Post 65 (cv2 output)" — I just kept pushing there. The `reports/brand-walkdown-2026-05-19/upload_and_patch.py` script hardcodes `/wp/v2/posts/65`.

**Why it's wrong:** SGS framework clones *websites*. Websites are PAGES (homepage as static front-page, plus sub-pages) — never blog POSTS. The WP `single.html` template was designed for blog-post content reading: `.entry-content { max-width: 800px }`, `is-layout-constrained` main wrapper, no `alignfull` defaults. None of that applies to landing pages.

**The fix:**

1. Create a new WP page `/cv2-output-mamas-munches/` (or repurpose hero-clone-poc URL pattern)
2. Update `upload_and_patch.py`: change `posts/65` → `pages/{new-id}` (REST endpoint `/wp-json/wp/v2/pages/{id}`)
3. Update mockup-baseline post 66 similarly → page 66
4. Add a CLI flag `--target page|post` to upload_and_patch.py (page default)
5. Document the pages-not-posts convention in CLAUDE.md so future sessions don't inherit the wrong pattern
6. Optionally: parking P-PIPELINE-REGISTER-TO-WP-STAGE — promote the `upload_and_patch.py` one-shot into a proper orchestrator stage with `--target` flag built-in

**Trigger:** START OF NEXT SESSION — this is the foundation under P-WP-ALIGNMENT-WIDTH-SYSTEM. With pages, much of the alignment-width work simplifies because `page.html` already gives sections more room.

Captured 2026-05-17 at session close.

---


_From: Opened 2026-05-17 (architecture fix surfaced at session close)_

### P-WP-ALIGNMENT-WIDTH-SYSTEM — Per-mockup theme content widths + per-block alignment selectors (PRIORITY, after P-USE-PAGES-NOT-POSTS) (~2-3 hrs) — **CLOSED 2026-05-18**

**Resolution:** Shipped in `86172812`. Container Branches A + C + Converter Branch B + 2× `/qc-inline` passes (caught BEM regex bug, scored editor UI 96/100). 6 new container attrs + 5 new converter helpers + InspectorControls UI + visual-diff PASS report at `reports/visual-diff/container-2026-05-17.md`. Brand pixel-diff at 1440 unchanged post-deploy (43.73%) — expected because block markup on page 131 still dates from yesterday's pre-widthMode converter output. **The framework infrastructure is shipped; the ROI measurement requires a full orchestrator pipeline re-run with `--client-slug=mamas-munches`, which is the next session's first concrete step.** See decisions.md D3 and next-session-prompt.md.

**TL;DR:** Even after switching to pages, mockups author sections at non-WP-aligned widths (Mama's brand at `max-width: 1000px`) which need a per-mockup `contentSize`/`wideSize` AND a sgs/container `widthMode` selector to map cleanly to WP-native alignment. Hero-clone-poc at https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/ proves the alignfull mechanism works on a PAGE. This work is downstream of P-USE-PAGES-NOT-POSTS but still needed for true mockup fidelity.

**Live evidence (2026-05-17):**

Post 65 (post template, `single.html`):
- `.entry-content { max-width: 800px }` parent → caps every section to 800
- Brand declares `max-width: 1000px` inline → SGS theme caps at 800
- Hero declares `max-width: 100%` → 800 (filled to parent)

Hero-clone-poc (page template, `page.html`):
- `.entry-content { max-width: none }` parent → no cap
- Hero has `alignfull` class → renders 1440 (full viewport)
- ALSO main wrapper is `is-layout-flow` (vs `is-layout-constrained` on post)

Raw mockup file:// (no WP template):
- Sections fill body at viewport width (1440)
- Brand has its own `max-width: 1000px` → 1000
- All other sections: 1440 (no max-width)

**Bean's proposed proper solution (2026-05-17):**

Two layers, both within WordPress block-theme conventions:

1. **Per-mockup theme content widths.** Each client's `theme/sgs-theme/styles/{client}.json` (style variation) declares its own `settings.layout.contentSize` + `wideSize` derived from the mockup CSS. The cloning pipeline reads the mockup's section widths and writes the matching contentSize/wideSize per-client (and per-viewport — mobile/tablet/desktop). Possible in WP — theme.json supports `settings.layout` per style variation. Also possible to expose in Customiser/Site Editor as Bean has done on other websites.

2. **sgs/container width selector.** Add a new attr `widthMode` enum: `"default" | "wide" | "full" | "custom"` × per-viewport (`widthModeMobile`, `widthModeTablet`, `widthModeDesktop`). Plus `customWidth + customWidthUnit` (already exists). When `widthMode="full"` the block emits `alignfull` class (escapes content-area via WP's standard mechanism). When `widthMode="wide"` emits `alignwide`. When `"custom"` emits inline `max-width: {customWidth}{customWidthUnit}`. When `"default"` no override — inherits theme contentSize.

**Reference: WP block-theme alignment system**

How WP block-theme handles widths:
- `theme.json:settings.layout.contentSize` (e.g. 800px) — default content width
- `theme.json:settings.layout.wideSize` (e.g. 1200px) — `alignwide` width
- `alignfull` = full viewport via negative margin escape from `.entry-content`
- Blocks declare `supports.align: ["wide", "full"]` in block.json to allow these modes
- Site Editor exposes a global Layout panel for setting these widths
- Customiser-side: requires either Site Editor (block themes) OR custom Customiser controls writing to theme mods

**Implementation plan (next session):**

A. **Discovery + reference reading** (~30 min)
   - Read `~/.agents/skills/wp-block-development/SKILL.md` for `supports.align` semantics
   - Read `~/.agents/skills/wp-block-themes/SKILL.md` for theme.json contentSize/wideSize patterns
   - Read `~/.agents/skills/wp-wpcli-and-ops/SKILL.md` for theme.json reload commands
   - Read existing `theme/sgs-theme/theme.json` to see current contentSize/wideSize
   - Read existing `theme/sgs-theme/styles/mamas-munches.json` to see if it overrides layout
   - Check hero block.json for current `supports.align` declaration — that's what made hero-clone-poc work

B. **Per-client contentSize/wideSize lift** (~1.5 hrs)
   - Modify `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` Stage 0.5 or 0.7 (CSS-lift): detect the LARGEST max-width value declared on top-level sections in the mockup CSS → set as `wideSize` candidate. Detect the SMALLEST (or most-frequent) → `contentSize` candidate.
   - Add a stage that writes these values into `theme/sgs-theme/styles/{client}.json` under `settings.layout.contentSize` / `wideSize` (per-viewport variants if mockup CSS has them).
   - Bonus: emit `mobile`/`tablet`/`desktop` variants by reading mockup's `@media` query overrides.

C. **sgs/container widthMode attr + render** (~1 hr)
   - Add `widthMode` (enum default/wide/full/custom) × per-viewport to sgs/container/block.json
   - In sgs/container/render.php: read widthMode attrs → emit appropriate WP alignment class (`alignfull`, `alignwide`) + responsive `<style>` block for per-viewport switching
   - In `theme/sgs-theme/theme.json` confirm `supports.align: ["wide","full"]` is declared at the container level (or in block.json)

D. **Converter wiring** (~30 min)
   - When `_lift_root_supports_to_style` lifts a section's max-width:
     - If max-width == theme.wideSize → emit `widthMode: "wide"`
     - If max-width == theme.contentSize → emit `widthMode: "default"`
     - If max-width is between or exotic → emit `widthMode: "custom"` + `customWidth/Unit` (current behaviour)
     - If max-width: none / 100vw / `var(--site-max)` etc. → emit `widthMode: "full"`

E. **Verification** (~30 min)
   - Re-run pipeline on Mama's mockup
   - Re-update post 65 (still on single.html template — KEEP the constraint to test the alignfull escape)
   - Re-measure brand pixel-diff vs file:// raw mockup
   - Expected: ≤5% on at least one viewport (mockup brand at 1000 + WP-aligned width matched)
   - Bonus: change post 65 to use a PAGE template (or set its custom field to use page.html via _wp_page_template meta) — should drop diff further if page template's wider content-area is closer to mockup's body width

F. **Backwards-compat audit** (~30 min)
   - Existing sgs/container instances without widthMode default to "default" (current behaviour) — should be backwards-compat
   - Verify on palestine-lives.org (production) doesn't regress

**Reading list for next session (load these in order):**
1. `https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/` — view-source comparison shows the alignfull pattern that worked
2. `theme/sgs-theme/theme.json` — current contentSize/wideSize values
3. `theme/sgs-theme/styles/mamas-munches.json` — does style variation override layout?
4. `plugins/sgs-blocks/src/blocks/hero/block.json` — find `supports.align` declaration that lets hero use alignfull
5. `plugins/sgs-blocks/src/blocks/container/block.json` — current container schema, no align support yet
6. `plugins/sgs-blocks/src/blocks/container/render.php` — current width handling via `sgs-container--width-{wide|content|full}` class
7. `~/.agents/skills/wp-block-themes/SKILL.md` — `theme.json` layout configuration
8. `~/.agents/skills/wp-block-development/SKILL.md` — `supports.align` block.json semantics + alignment behaviour
9. `~/.agents/skills/wp-wpcli-and-ops/SKILL.md` — theme.json reload + cache purge commands
10. `.claude/parking.md` THIS ENTRY (P-WP-ALIGNMENT-WIDTH-SYSTEM)
11. WordPress official docs (https://developer.wordpress.org/themes/global-settings-and-styles/settings/layout/) on theme.json layout settings
12. WordPress Block API reference for `supports.align`: https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/#align

**Why this is the right architectural call:**
- Aligns with WP-native conventions — no custom hacks; uses standard alignment system
- Per-client theme widths via style variations (already proven on Bean's other sites)
- Operator gets familiar Site Editor + Customiser controls for content widths
- Future clients with different design widths each get their own contentSize/wideSize without code changes
- sgs/container's widthMode selector composes with existing widthMode-by-class — backwards-compat preserved
- Fully testable via pixel-diff against file:// mockup with parent context now matching

**Trigger:** Next session — this is the #1 priority that unblocks brand pixel-diff and similar cross-client cloning fidelity. All other Phase 9 work is downstream of this.

Captured 2026-05-17 at session close. Bean's directive: "I think the proper solution is probably to change the default website max content width for each website based on the mockup … sgs/containers should be able to choose to their own content width either, default, custom or full and make it customisable for mobile, tablet and desktop like the rest of our setup. Lets check what they actually allow for /wp-blocks"


## 2026-05-17

_From: CLOSED 2026-05-17 (10-commit session)_

- **P-PHASE9-4** — Block-root styling lift via WP native supports ✓ **DONE** via commit `90692106`. New `_lift_root_supports_to_style()` in convert.py reads block-root CSS, queries `db.block_supports_for(slug)`, emits `style.spacing/border/color/typography` attrs only when the block declares native WP support. Universal — wired into all 3 emission paths. +3 attrs/section avg across 7 sections.

_From: CLOSED 2026-05-17 (10-commit session)_

- **P-PHASE8-NEW-4** — CSS-lift media-query support ✓ **DONE** via commit `20ef1d66`. Root cause was the `parse_css` regex bug — 0/13 @media blocks captured because `[^{}]+` couldn't span the whitespace between sibling rules. Brace-balanced scanner replacement now captures 13/13. Hero `headlineFontSizeDesktop` now correctly 58 (was 34 from base-CSS only).

_From: CLOSED 2026-05-17 (10-commit session)_

- **P-PHASE8-NEW-3** — Hero 768px height delta ✓ **DONE** via commit `2f075073`. Architectural mismatch closed: mockup migrated from dual-variant pattern (`--mobile` + `--desktop` siblings) to single-grid responsive matching SGS hero block DOM 1:1. Height delta: -267px → +85px.

_From: CLOSED 2026-05-17 (10-commit session)_

- **P-PHASE8-NEW-2** — Stage 4 pattern routing ✓ **DONE (REFRAMED)** via commit `df3a6cbf`. Original framing abandoned (theme patterns don't carry per-instance overrides). Real fix: walker preserves SGS-BEM grouping wrappers as nested sgs/container, matching pattern's structural composition while keeping mockup content.

_From: CLOSED 2026-05-17 (10-commit session)_

- **P-PHASE8-NEW-1** — Recogniser stale heritage-strip references ✓ **DONE** via commit `e34618f9`. Voter `RETIRED_BLOCK_REMAP` dict + iteration-order safety + disjoint-keys assertion + mockup migration to `sgs-brand*` + unit test.
- **DB-first refactor** ✓ **DONE** via commit `168fd2ca`. `_CSS_PROP_TO_SUFFIX` + `_BREAKPOINT_SUFFIXES` removed; `db_lookup.py` gains `css_property_suffixes()` + `breakpoint_suffix_rules()`. Property_suffixes seeded with 18 per-side longhand rows via idempotent migration. Blub.db row 260 (DB-first rule) + Rule 11 HARD-GATE in `/sgs-clone` SKILL.md.


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE8-NEW-2 — Stage 4 converter doesn't honour pattern: routing ✓ **REFRAMED + CLOSED 2026-05-17**

**Original framing:** Stage 4 ignores `pattern_ref` and emits sgs/container instead of `<!-- wp:pattern -->`.

**Reframe after deeper investigation:** Theme patterns in WordPress don't carry per-instance overrides — a bare `wp:pattern` reference renders the pattern's PLACEHOLDER text, not Mama's actual content. Universal pattern-attr-mapping is a multi-day infrastructure design, not a 30-min fix. The PRACTICAL fix turned out to be different: the walker was unwrapping authored SGS-BEM grouping wrappers (`<div class="sgs-brand__content">`) via the unnamed-wrapper PASS-THROUGH, losing the pattern's structural contract.

**Closed via commit `df3a6cbf`:** walker now preserves any `sgs/container` target with a BEM `__element` as a nested `sgs/container` with className preserved. Brand section now emits 2-col grid + nested __content stack + __image right column matching brand.php structure. Pixel-diff: 99.6% → 12.9% at tablet (87pp improvement).


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE8-NEW-3 — Hero 768px viewport selector height mismatch (NEW 2026-05-17)

**What:** Hero pixel-diff at 768px tablet = 99.9% (mockup 693px tall, SGS 426px tall — 267px delta). Other viewports (1440 = 70%, 375 = 80%) are normal. Tablet-only height collapse.

**Trigger:** Before per-section pixel-diff for hero can close OR when an SGS client needs reliable tablet hero rendering.

**Approach:** DOM inspect at 768px to identify which element shrinks (likely image object-fit or column-ratio difference). `@media (max-width:767px)` cutoff means 768 uses desktop layout — so the 2-col grid is in play. Mockup vs SGS column-width ratios may differ. Check `splitColumnRatio` attr and `.sgs-hero__split-image` rendering. ~30-45 min.


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE8-NEW-4 — CSS-lift media-query support (NEW 2026-05-17)

**What:** Walker's CSS-driven container detection reads ONLY base CSS rules — `@media (min-width:768px)` overrides of `grid-template-columns` are ignored. Net for brand section: `columnsMobile:2` when mockup intends 1-col stack on mobile (mobile base CSS has `grid-template-columns: 1fr`, desktop media-query overrides to `1fr 1fr`).

**Trigger:** Any responsive grid container where mobile and desktop columns differ. Affects every clone.

**Approach:** Extend `_detect_grid_container_from_css()` to read media-query nested rules and emit `columnsMobile`/`columnsTablet`/`columns` based on viewport breakpoints. Map standard breakpoints (768/1024 px) to columnsTablet/columns; everything else stays columnsMobile. ~1-2 hours.


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE9-3 — Per-instance lift fidelity sweep (renamed from generic "lift gaps", NEW 2026-05-17)

**What:** 538 extraction_failed entries on Mama's latest run dominated by config-attrs at defaults (textColour, padding, hoverEffect, transitionDuration) — these are intentionally unset, not real gaps. Real high-impact gaps:
- Ingredients section (147 entries): info-box children — emoji/icon, heading, description per item not lifting at full fidelity
- Gift section (106 entries): same info-box family
- Hero (151 entries): mix of CSS-lift styling + image attrs

Pixel-diff confirms: ingredients/gift sit at 30-62% across viewports — lift fidelity is the bottleneck once structural composition is right.

**Trigger:** When pixel-diff closure on ingredients/gift becomes priority OR when adding a new client with info-box-heavy layouts.

**Approach:** (a) Add a `_HIGH_IMPACT_ROLES` filter in leftover-bucket-router to distinguish noise (default-OK config) from real content gaps. (b) Per-section sweep — identify the 5-10 attrs that actually visually matter per block type. (c) Improve `_lift_bem_child_array()` BEM-walker to handle info-box per-item icon/emoji content (currently lifts heading + description but not media). Open-ended; ~2-4 hours per section.


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE9-4 — Block-root styling lift via WP native supports (NEW 2026-05-17, HIGH IMPACT)

**What:** The mockup CSS authors styling at the BLOCK ROOT (e.g. `.sgs-info-box { padding: 22px 16px; border-radius: 12px; border: 1px solid var(--border); background: white; }`). The converter's `_lift_styling_attrs` only runs at SLOT-ELEMENT level (heading, description) — never at block root. Net: every block with native WP `supports: { spacing, border, color }` ships without its root styling. The mockup's authored padding/border/background never lands on the block, so the rendered output uses block defaults.

Affects EVERY block using WP supports: container, hero, info-box, brand-pattern container, card-grid, feature-grid, label, button, testimonial, gallery, etc. Cross-section impact — this is one of the highest-leverage script flaws.

**Discovered 2026-05-17** during pixel-diff hero/info-box analysis. The mockup explicitly sets `.sgs-info-box { background: white; border-radius: 12px; padding: 22px 16px; ... }` but the converter emits info-box blocks with empty `style` attr.

**Trigger:** When closing pixel-diff on info-box / card-grid / hero / brand sections OR when any client mockup styles block roots (universally true).

**Approach:**
1. New function `_lift_root_supports_to_style(node, block_slug, schema, attrs, css_rules)` — reads block-root CSS, maps CSS props to WP native `style` attribute object:
   - `padding-*` → `style.spacing.padding.{top,right,bottom,left}`
   - `margin-*` → `style.spacing.margin.{top,right,bottom,left}`
   - `border-*` → `style.border.{width,radius,style,color}`
   - `background-color` / `color` → `style.color.{background,text}`
   - `gap` → `style.spacing.blockGap`
2. Invoke at every block emission point (FR1 path, composite-element fast path, atomic-text path).
3. Validate against WordPress block.json supports declaration — only emit `style` properties the block declares support for (e.g. don't emit `style.border` on a block with `supports.border = false`).
4. Schema lookup: the `block.json` `supports` object declares what `style` properties are allowed.

~2-3 hours including FR1 + composite-element wiring + validation gate + unit tests.


## 2026-05-16

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-1** — Heritage-strip as Brand Story PATTERN ✓ **DONE** in commit `9a32a164`. Block deleted, `theme/sgs-theme/patterns/brand.php` created. Hardcoded lift guards removed from convert.py.

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-2** — Per-block render.php audits (round 1+2) ✓ **DONE** for the 10 cv2-eligible blocks (commits `7a2a777d` + `9a32a164`). Static → dynamic conversion. WP file-render wrapper echo-style discovered. Extension-hook wiring (animation/responsive-visibility/image-controls) deferred → P-PHASE9-1.

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-3** — Hyperspecific `if block_slug == "sgs/hero":` / `if block_slug == "sgs/heritage-strip":` guards ✓ **PARTIAL** — heritage-strip guard removed with the block. sgs/hero guard remains (sgs/hero lift code is still hero-specific) — re-park as P-PHASE9-2.

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-11** — `severity_totals` dashboard ✓ **DONE** in commit `d859da4c`.

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-12** — Wrong-block-type plausibility check ✓ **DONE** in commit `d859da4c` with depth-aware section-root parsing.

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-13** — Populate `block_attributes.role` via slot_synonyms.role ✓ **DONE** in commit `d859da4c`. Migration script + assign-canonical.py second-pass propagation with property-suffix guard.

_From: CLOSED 2026-05-16 (previous session)_

- **P-PHASE8-17** — Convert remaining 7 static SGS blocks to dynamic ✓ **DONE** in commit `9a32a164` (parallel agent dispatch).


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE9-1 — Per-block extension hook wiring sweep

**What:** The 9 newly-dynamic blocks (trust-bar, label, certification-bar, counter, divider, heading, notice-banner, process-steps, tab) don't yet wire `animation` / `responsive-visibility` / `image-controls` extension hooks into their render.php. Existing already-dynamic blocks deferred this too — broader sweep needed. (Heritage-strip is NOT in this list — it was retired as a block in this session; lives as `theme/sgs-theme/patterns/brand.php`.)

**Trigger:** When a client mockup uses one of these blocks with animation/visibility controls AND it doesn't render OR when a cohesive cleanup sweep is opened.

**Approach:** Identify the existing dynamic blocks that DO wire extensions correctly (likely sgs/hero, sgs/product-card) and copy the wiring pattern across all dynamic blocks. ~2-3 hours.


_From: CLOSED 2026-05-16 (previous session)_

### P-PHASE9-2 — sgs/hero hardcoded lift cleanup

**What:** `lift_subtree_into_block_attrs` still has `if block_slug == "sgs/hero":` block at line ~1037 with hardcoded splitImage / splitImageMobile / variant logic. Heritage-strip's equivalent was removed when the block retired; hero's remains as the last hyperspecific block_slug guard.

**Trigger:** Need a non-Mama's hero shape OR cohesive refactor.

**Approach:** Refactor to BEM-modifier-driven generic lift via DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design). ~70-80 lines + DB seed.


## 2026-05-11

_From: Resolved 2026-05-11_

- **P-TP-SYNC** → Trustpilot review sync infrastructure shipped. 4 classes under `plugins/sgs-blocks/includes/trustpilot/` (Trustpilot_Sync, Trustpilot_REST, Trustpilot_Cron, Trustpilot_Settings), admin JS at `assets/admin/trustpilot-sync.js`. Settings -> SGS Trustpilot Sync page with Browserless creds (AES-256-CBC encrypted at rest), weekly/daily WP-cron (`sgs_trustpilot_sync_event`), Sync-now button via `POST /wp-json/sgs/v1/trustpilot-sync`. JSON-LD parser harvests standalone Review entities from `@graph` (Trustpilot's reference pattern). Browserless `/content` uses `?token=` not Bearer (HTTP 500 on Bearer — captured as lesson, blub.db row 238). Telegram alerts dropped — settings page activity log + last_sync_status is the operator failure surface. End-to-end proven on sandybrown: 4 Mama's reviews captured (TrustScore 4.0 "Great"), smoke-test-2 page flipped to `dataSource: synced` and renders the live reviews. Commit `06df2807`. Visual diff at `reports/visual-diff/trustpilot-sync-2026-05-11.md`.

_From: Resolved 2026-05-11_

- **P-Trustpilot block** → `sgs/trustpilot-reviews` block shipped at `plugins/sgs-blocks/src/blocks/trustpilot-reviews/`. Looping carousel, white pill header, theme-inherited typography, hover scale + theme-primary-coloured border, clickable Trustpilot logo, Schema.org JSON-LD, inline + synced + placeholder data sources. Live on sandybrown at /trustpilot-smoke-test-2/. Commit `c6bd4980`. Visual diff report at `reports/visual-diff/trustpilot-reviews-2026-05-11.md`.

_From: Resolved 2026-05-11_

- **P-Orchestrator multi-section walker** → Voter `auto_detect_sections` walks into `<main>`; stage 4-8 loops per-boundary in `--auto-section` mode. End-to-end run on Mama's: 9 sections processed, 212 slots scaffolded, 213 leftover entries persisted to recognition_log. Patches uncommitted but tested -- pending Commit A.

_From: Resolved 2026-05-11_

- **P-Style.css enqueue gap (systemic)** → wp-scripts emits `style-index.css` but `register_block_type_from_metadata` looks for `style.css`. New `plugins/sgs-blocks/scripts/copy-built-styles.js` postbuild step copies for all 48 blocks (96 files copied first run). Wired in `package.json`. Resolves the silent CSS-not-enqueued issue affecting every SGS block since the build pipeline was set up.

_From: Resolved 2026-05-11_

- **P-image-controls.php namespace fatal** → Line 45 `WP_Block_Type_Registry` was resolving as `SGS\Blocks\WP_Block_Type_Registry`. Added leading backslash. Was fatalling on every block render the first time `inject_image_controls` fired (silent until I created a draft on sandybrown today).
- **Dashboard `/api/learning` POST UPDATE bug** → Subagent D applied COALESCE-based patch to `~/.openclaw/workspace/tools/blub-dashboard-v2/src/app/api/learning/route.ts`; `/rebuild-dashboard` ran (PID 64452 → 16720); patch active; row 69 modernisation re-POSTed and confirmed; test row 219 archived.

---


## 2026-05-10

_From: Resolved 2026-05-10_

- **P-12** block_compositions seed → 36 rows seeded into sgs-framework.db; seed script at `plugins/sgs-blocks/scripts/uimax-tools/seed-block-compositions.py` is idempotent (re-run preserves count). QC PASS.

_From: Resolved 2026-05-10_

- **P-13** uimax-write-validator integration → validator script confirmed already enforcing rows 211 + 213; 5/5 `/uimax-*` skills mandate validator calls; new `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` Python helper provides atomic validate-then-write. QC PASS.

_From: Resolved 2026-05-10_

- **P-15** `/sgs-update` Stage 3+4 → REWRITTEN late-session per Bean's catch: DB is now canonical, CSVs are regenerated mirrors. New `regenerate-csvs` subcommand on `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py` mirrors all 46 DB tables → CSV. `sgs-update-uimax-sync.py` Stage 3 writes SGS blocks to uimax DB via `uimax_write.py` validate chain (skip-if-exists preserves existing Rosetta Stone), then subprocess-calls `update-db.py regenerate-csvs`. Round-trip safe (regen → compile-sqlite → regen) verified by `/qc` 5/5 PASS. Closes the silent-data-loss vector across all uimax tables.

_From: Resolved 2026-05-10_

- **P-4** Trustpilot scrape (Mama's Munches) → 4/4 reviews captured to `sites/mamas-munches/research/trustpilot-reviews.json`. QC PASS.


## Undated

_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-VARIATION-KILL-OPEN-QUESTIONS** — SUBSUMED by P-ARCH-PHASE-5A (RESOLVED `43a93df9`). Both questions answered during Phase 5a implementation. Moved to resolved section below.


_From: Opened 2026-05-21 (architecture session — 31-decision programme)_

**P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY** — SUBSUMED by P-ARCH-PHASE-5B (RESOLVED `60220b13`). Phase 5b shipped with `customize_controls_enqueue_scripts` fallback wired. Moved to resolved section below.


_From: Opened 2026-05-21 (Wave 2 reshape + pipeline reality findings + qc-trio follow-ups)_

**P-BLOCK-COMPOSITIONS-READ-PATH** — SUBSUMED by P-ARCH-PHASE-3 (RESOLVED `79158da5`). Phase 3 rewrote `_lift_inner_blocks` using `blocks.parent_block` + `slot_synonyms.standalone_block` — the read-path this item requested. Moved to resolved section below.


_From: Opened 2026-05-20 (Phase 1 closure follow-ups + Phase 2 medium-severity items)_

**P-G2-PAGE-ID-SCOPE-STRIP** — P1.B.x scoped variation CSS to `.page-id-N .sgs-X` but cv2's `_collect_css_decls_for_element` searches for bare `.sgs-X`. Match fails. Silently kills 60-80% of value-lift on every SGS block. **STATUS: PARTIALLY RESOLVED by Wave 1 G2 Step 1+2 (commit `affca3f1`).** Orchestrator merges variation CSS into `_section_css`; cv2 strips `.page-id-N` scope prefix in selector matcher. The root cause (scope isolation needed for D2 CSS) is architecturally addressed by the variation-kill in P-ARCH-PHASE-5A — once per-site theme.json replaces the overlay system, scope prefixes are no longer needed.


_From: Opened 2026-05-21 (Option A cleanup sprint outcomes)_

**P-RETIRED-BLOCK-REMAP-PHYSICAL-DELETION** — `RETIRED_BLOCK_REMAP` dict + consultation branch soft-emptied today (Wave 3c). Consultation retained as no-op for safety. **Trigger:** audit confirms no remaining consultation paths.


_From: Opened 2026-05-21 (Option A cleanup sprint outcomes)_

**P-SKILL-MD-LICENSING-HARD-RULE-CLEAN** — `~/.claude/skills/sgs-clone/SKILL.md` Hard Rule 1 retired today (replaced with retirement comment). The numbered rule list now has a gap (Rule 2-14 remain). Renumbering deferred. **Trigger:** next SKILL.md edit / `/skill-writer` pass.

---


_From: Opened 2026-05-18 (post P-WP-ALIGNMENT-WIDTH-SYSTEM orchestrator re-run findings)_

### P-INTRA-SECTION-CLOSURE — Phase 9b: residual 40-65% intra-section diff class (next phase)

**What:** With P-WP-ALIGNMENT-WIDTH-SYSTEM closed, the clean-baseline pixel-diff at 1440 across 9 sections shows:

| Section | 1440 diff | Suspected root cause |
|---|---|---|
| sgs-hero | 66.96% | image positioning + content layout (eyebrow/CTA missing) |
| sgs-featured-product | 68.20% | grid template / card variant (mockup: 1 hero card + gallery; SGS: 2 stacked cards) |
| sgs-social-proof | 56.77% | layout variant (mockup: stacked list; SGS: carousel) |
| sgs-ingredients-section | 51.23% | image positioning + grid |
| sgs-gift-section | 47.32% | image positioning + typography + mojibake (see P-UTF8) |
| sgs-brand | 43.71% | image positioning + typography (single mockup card vs SGS stacked images) |
| sgs-trust-bar | 31.71% | duplicated labels + missing icon SVGs |
| sgs-header | 24.08% | possible selector mismatch (P-HEADER-WRAPPER-CLASS-AUDIT) |
| sgs-footer | 98.67% | selector mismatch (P-FOOTER-WRAPPER-CLASS-MISSING) |

**Fix shape:** open one parking entry per section, with a screenshot pair + root-cause hypothesis + estimated fix time. Treat each section as a Phase 9b workstream. The framework-level alignment infrastructure is done; remaining work is content-layout fidelity inside each section, which is properly converter / block-CSS / mockup-discipline work.

**Trigger:** next session, after P-DETECT-INNER-ELEMENT-WIDTHS + P-FOOTER-WRAPPER-CLASS-MISSING + P-HEADER-WRAPPER-CLASS-AUDIT are closed (so further measurements are trustworthy).

---


_From: Opened 2026-05-19 (brand walkdown — universal core-block CSS lift session)_

### P-CHILD-CSS-LIFT — Universal child-block CSS lift (CLOSED via this session's commit, partial coverage)

**What:** Per-element CSS rules targeting BEM-element children (`.sgs-brand__image`, `.sgs-brand__headline`, `.sgs-brand__body`) weren't being lifted into emitted core/* child blocks. Walker emitted core/image/heading/paragraph with only HTML-attribute data (url, alt, level, anchor), dropping every per-class CSS declaration.

**Closed via:** Sonnet subagent commit `99b344d7` (merged 2026-05-19) — new `_lift_core_block_style()` helper applied to atomic_image / atomic_heading / atomic_paragraph branches + (rater 1 fix) atomic_text_fallback branch.

**Remaining caveats:**
- Coverage% metric doesn't count nested style paths yet → P-COVERAGE-METRIC-CORE-STYLE above
- `tag-only selectors` (e.g. `blockquote p { font-size }`) aren't lifted by class-matched lookup. Would need a parallel tag-matched lookup. Park as P-TAG-SELECTOR-LIFT for next session.
- Pixel-diff requires redeploy + re-screenshot to verify visible improvement — current 31% pixel diff on brand unchanged because post 65 hasn't been redeployed with new converter output. Park as P-PHASE9-REDEPLOY-BASELINE.




---

# Triage-pass additions (2026-05-24)

## 2026-05-23

_From: Opened 2026-05-22 (Phase 1.5 session) - triage: commit 700ff211 - Stage 10 phantom-page halt_

**P-STAGE-10-DEPLOY-SILENT-PHANTOM-PAGE** — NEW 2026-05-23 (HIGH PRIORITY — silent-failure defect). The orchestrator's Stage 10 deploy reports `[stage-10] deploy: patched page <N> — OK` even when page `<N>` does not exist on the target WP install. Verified 2026-05-23: fresh /sgs-clone run with `--deploy-target page:131` returned "OK" but `wp/v2/pages` REST query confirmed page 131 was deleted between 2026-05-20 and 2026-05-23. The actual current canary is page 144 (`/rc-fix-verification-mamas-munches/`). Stage 10 must HALT with a clear error when the target page returns 404 / doesn't exist, NOT silently report success. Also: `upload_and_patch.py` defaults need updating from 131 → 144. **Trigger:** Phase B verify-loop dispatched 2026-05-23 to diagnose root cause.


_From: Opened 2026-05-22 (Phase 1.5 session) - triage: commit 1331f23a - Stage 11 per-section pixel-diff_

**P-PIXEL-DIFF-NOT-IN-ORCHESTRATOR** — NEW 2026-05-23 (architectural enhancement). The orchestrator deploys to a target page but does NOT run pixel-diff against the rendered output as its final stage. Operators must invoke `scripts/pixel-diff.py` separately, AND must remember to point it at the right page (compounded by P-STAGE-10-DEPLOY-SILENT-PHANTOM-PAGE — Stage 10 may have deployed to a phantom page, so the operator's separate pixel-diff against a hardcoded URL doesn't measure the actual deploy target). **Fix shape:** add Stage 11 (or extend Stage 10) to invoke pixel-diff against the page Stage 10 actually patched, captured per-section at 375/768/1440, results written to `pipeline-state/<run>/pixel-diff/` and surfaced in the deliverable. **Trigger:** Phase B verify-loop dispatched 2026-05-23 for feasibility + integration shape.


_From: Opened 2026-05-22 (Phase 1.5 session) - triage: CLAUDE.md updated to page 144 + phantom-page halt closes underlying issue_

**P-CANARY-PAGE-131-DELETED** — NEW 2026-05-23 (doc-drift consequence of P-STAGE-10-DEPLOY-SILENT-PHANTOM-PAGE). Page 131 (`/cv2-output-mamas-munches/`) was deleted from sandybrown between 2026-05-20 and 2026-05-23. CLAUDE.md references updated 2026-05-23 to point at page 144 (the actual current canary). `reports/brand-walkdown-2026-05-19/upload_and_patch.py` still defaults to `--target-id 131` and needs updating. **Trigger:** small follow-up after the silent-failure Stage 10 fix lands.


_From: Opened 2026-05-22 (Phase 1.5 session) - triage: duplicate of 2026-05-20 entry; merge note only_

**P-G1-HERO-INNERBLOCKS** — REFRAMED 2026-05-23 (Wave B2 live verification). Playwright on sandybrown page 144 found `.sgs-hero__ctas` empty at all 3 viewports (`heroHasCTAs = 0`). Per Bean's architectural directive + Spec 16 §15 + cloning-pipeline-flow.md:1603 — G1 is NOT a per-block hero fix. It's a symptom of the ONE universal-extraction wiring gap: cv2's walker doesn't walk every class, assign CSS ownership per class, or record parent-child relations via `blocks.parent_block` + `slot_synonyms.standalone_block` queries. **Closure path:** rolled into P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP. Will close automatically when Wave 2 reshape ships.


_From: Opened 2026-05-22 (Phase 1.5 session) - triage: duplicate of 2026-05-20 entry; merge note only_

**P-G3-STAGE-3-VISUAL-SLOT-MAPPING** — PARTIAL-RESOLVED 2026-05-23 (Wave B2). `.sgs-feature-grid` composite section renders correctly across 375/768/1440 — slot-aware DOM walker works for that subtype. `.sgs-card-grid` + `.sgs-cta-section` weren't on page 144 so unverified for those subtypes. **Closure path for full verification:** confirmed by P-WAVE-2-RESHAPE landing (Spec 16 §15 architectural change closes G1+G3+G5 simultaneously per cloning-pipeline-flow.md:1603).


_From: Opened 2026-05-22 (Phase 1.5 session) - triage: merged into P-WAVE-2-RESHAPE_

**P-G5-PER-BLOCK-DOM-SHAPE-FIXES** — MERGED INTO P-WAVE-2-RESHAPE 2026-05-23. Per Bean's architectural directive + Spec 16 §15: G5's "per-block DOM mismatches" are NOT per-block fixes; they dissolve simultaneously with G1+G3 when the universal-extraction wiring lands. The entry name is misleading. Closure tracked via P-WAVE-2-RESHAPE acceptance criteria.


_From: Opened 2026-05-22 (Phase 1.5 session) - triage: merged into P-WAVE-2-RESHAPE (second copy)_

**P-UNIVERSAL-EXTRACTION-RC-FIXES** — MERGED INTO P-WAVE-2-RESHAPE 2026-05-23. Same root cause; same fix. The "RC fixes" framing predated Spec 16 §15's reshape (2026-05-21) which collapsed G1+G3+G5+universal-extraction into ONE architectural change.


_From: Opened 2026-05-21 (Wave 2 reshape + pipeline reality findings + qc-trio follow-ups) - triage: RESOLVED 2026-05-23 (Wave A) - archive copy present_

**P-QC-COUNCIL-FIXTURE-SMOKE-TEST** — `~/.agents/skills/qc-council/scripts/fixtures/example-council.json` has the canonical 2026-05-21 Wave-1 (G2 + G4) case study with expected verdicts. Should be run through `/qc-council` to confirm the skill actually catches the planted no-ops as designed. **Trigger:** first real `/qc-council` invocation.


_From: Opened 2026-05-21 (Option A cleanup sprint outcomes) - triage: merged into P-WAVE-2-RESHAPE (second copy)_

**P-UNIVERSAL-EXTRACTION-RC-FIXES** — 4 root causes from Wave 3 verification (full evidence at `reports/2026-05-21-wave-3-verification.md`): RC-3 `slot_synonyms` DB gaps for composite slot names; RC-2 `_SUPPORTS_HANDLED_PROPS` over-exclusion; RC-1 D3 Mode 2 breakpoint coverage gap; RC-4 `_collect_css_decls_for_element` grouped-selector bug. **Trigger:** next session Phase 1 — universal-extraction completeness work.


## 2026-05-22

_From: New 2026-05-16 — Phase 8 in-flight backlog - triage: RESOLVED 2026-05-22 - _STILL_STATIC_SGS_BLOCKS = frozenset()_

### P-PHASE8-16 — Spec 16 invariant: cv2-eligible blocks must be dynamic

**What:** Multi-rater /qc panel (architecture lens) on the 2026-05-16 render.php audit fix recommended codifying as a Spec 16 FR: every block that cv2 may emit via self-closing block comment MUST have a `render.php` registered via `"render": "file:./render.php"` in `block.json`. Static blocks (save.js only, no render.php) silently produce empty HTML when cv2 emits them as self-closing comments — caught for trust-bar + label on Mama's. 7 other static blocks (certification-bar, counter, divider, heading, notice-banner, process-steps, tab) would hit the same bug if cv2 starts emitting them.

**Trigger:** Next cv2 extension that gains the ability to emit one of those 7 static blocks (currently not in the emit set on Mama's), OR a fresh-eyes adversarial test surfaces it.

**Approach:** (1) Add an FR-NEW to Spec 16 stating the invariant. (2) Add a cv2 pre-flight gate: walk the emit candidate set from `db.standalone_block_for()` + block-root lookups + INNER_BLOCK_PATTERNS, hard-reject the run if any candidate block has no `render.php` file in its src/. Implement in `convert_page.py` / orchestrator init. ~25 lines.


_From: New 2026-05-16 — Phase 8 in-flight backlog - triage: commit 9a32a164 - 7 static blocks converted_

### P-PHASE8-17 — Convert remaining 7 static SGS blocks to dynamic

**What:** certification-bar, counter, divider, heading, notice-banner, process-steps, tab — all currently static (no render.php). Add render.php for each as a PHP port of save.js. Required before cv2 can safely emit them.

**Trigger:** P-PHASE8-16's pre-flight gate is wired AND any of these blocks needs to enter the cv2 emit set.

**Approach:** Mirror the 2026-05-16 trust-bar + label pattern: write render.php, add `"render": "file:./render.php"` to block.json, remove any `"source": "html"` on attrs (gotcha #3 from CLAUDE.md), keep save.js as-is for editor block validation. ~30-60 min per block depending on save.js complexity.


_From: New 2026-05-15 — Phase 8 backlog (after Spec 16 Phase 7 architectural close) - triage: commit 9a32a164 - heritage-strip Brand Story pattern_

### P-PHASE8-1 — Heritage-strip as Brand Story PATTERN (Bean's 2026-05-15 redirect)

**What:** Retire the `sgs/heritage-strip` block entirely. Replace with a registered pattern composing `sgs/container` (2-col grid) + `core/heading` + `core/paragraph` + `sgs/quote` (or sgs/testimonial-slider for the author bit) + `sgs/button`. Image goes in the right column.

**Trigger:** Phase 8 section-by-section closure work reaches the heritage section, OR a new client needs the Brand Story composition.

**Approach:**
- Register pattern at `theme/sgs-theme/patterns/brand-story.php` with placeholder content
- Update Spec 16 §Phase-4 + framework block-build-status table to remove heritage-strip
- Migrate existing posts using sgs/heritage-strip via WP-CLI block-recovery (or accept they stay on the deprecated block until manually re-laid)
- Update converter — remove the `if block_slug == "sgs/heritage-strip":` guard at line 1016 (it's currently dead code since the CSS-driven path catches the section)

**Spec ref:** Bean's 2026-05-15 redirect in conversation; capture in Spec 16 v0.3.


_From: New 2026-05-15 — Phase 8 backlog (after Spec 16 Phase 7 architectural close) - triage: RESOLVED 2026-05-22 - per-section closure-gate in autonomy_gate.py:102_

### P-PHASE8-8 — Spec 16 v0.3 — closure gate revision

**What:** Spec 16 §Phase 4 currently says "≤ 1% pixel diff" without specifying per-section vs full-page. 2026-05-15 work proved per-section cropped diff is the honest measurement. Spec needs revision to define:
- Closure unit = section (cropped via `--selector .sgs-X`)
- Threshold = ≤ 1% across 375 / 768 / 1440 viewports per section
- Page-level closure = ALL sections close
- Methodology rule: read leftover-buckets.json BEFORE any pixel-diff conjecture

**Trigger:** First Phase 8 session (this is a 30-min doc update, do it early).

**Approach:** edit `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §Phase 4 closure-gate definition.


_From: New 2026-05-14 — Phase 6 v2 deferrals - triage: OUTDATED - references deleted Spec 15 + retired tools/recogniser-v2/extract.py (Decision 10)_

### P-S15-ROLE-TEMPLATES-MIGRATE — Migrate role-templates.json into property_suffixes DB table (~2 hr)

**What:** `tools/recogniser-v2/data/role-templates.json` carries 20 role definitions + cross-platform extraction recipes. Spec 15 §6 Stage 4 + FR2 marks this TO-MIGRATE in Phase 1 - migration was deferred and never completed. The file is currently functioning (read by extract.py at load_role_templates() line 227) but accumulates silent drift versus the DB (every Spec 15 Phase 3/3.5 pass updates the DB but the JSON file might be stale).

**Trigger:** Post-Phase-6 doc-hygiene sweep, OR when an extract.py regression surfaces that traces to JSON-vs-DB divergence, whichever comes first.

**Approach:**
- Write migration script `plugins/sgs-blocks/scripts/migrate-role-templates-to-db.py` that walks role-templates.json + INSERTs/UPDATEs the matching property_suffixes rows
- Update extract.py.load_role_templates() to read from DB instead of file (or retain JSON as fallback during transition)
- Verify byte-parity per-role between JSON values and migrated DB values
- Add the `role-templates-vs-property-suffixes-check.py` drift-check hook (see docs-registry section 7)
- Delete role-templates.json after operator approval

**Spec ref:** Spec 15 §6 Stage 4 + FR2 + Appendix E ("role-templates.json TO-MIGRATE Phase 1").

**Why parked until after Phase 6:** Phase 6 closes the pixel-parity gate via integration work (wiring 14 modules + generalising extract.py CSS-consumption). Adding the role-templates migration to Phase 6 risks the working Stage 4 dispatch path for no parity-gate benefit. Cleaner to land Phase 6 first, then sweep this migration as a focused mini-phase.

**Mitigation while parked:** the new drift-check hook `role-templates-vs-property-suffixes-check.py` (added to docs-registry section 7 as a future hook) would surface drift if built. For now, drift is implicit risk.



Items here have a clear next-step but aren't urgent. Each entry: the work, the trigger to resume, the spec, and rough effort. Resolved items are kept as one-line summaries (no ORIGINAL retention to keep the file scannable).


_From: New 2026-05-12 (evening) — Spec 15 Phase 4.5 follow-ups - triage: OUTDATED - references retired theme/sgs-theme/styles/ + completed Phase 6_

### P-S15-STYLEVAR-GEN — Auto-generate style variations from uimax font_pairings + colour palettes (~60-90 min)

**What:** uimax has 57 font_pairings + 269 colour palettes + UX reasoning rows curated by industry / mood / product type. Build a generator that picks a `font_pairing` + a `palette` from uimax, emits a complete `theme/sgs-theme/styles/<slug>.json` style variation. Used to bulk-create 20+ "starter looks" (e.g. `restaurant-warm`, `legal-conservative`, `tech-minimal`) so new clients pick a starting point rather than starting from blank.

**Trigger (primary, added 2026-05-12 operator framing):** Step 1 of the draft-design process for every new client — generate 3-5 candidate style variations from uimax pairings appropriate to the client's industry/mood, then test draft designs against each. Pick the favoured one to anchor the rest of the work. This converts uimax pairings from a passive reference into an active part of the pipeline.

**Trigger (secondary):** When the operator wants a richer style-variation library OR as a one-off "seed 20 starter looks" task.

**Approach:**
- Script at `plugins/sgs-blocks/scripts/build-style-variations.py`
- Query uimax for a `font_pairings` row + matching `colors` palette row (joined on industry/mood)
- Emit JSON matching the schema of existing variations (`mamas-munches.json` etc.)
- One row pair = one variation. Idempotent on slug.
- Optional: pull recommended typography sizes + UX rule defaults from uimax `ux_guidelines` for the variation's `styles.elements.h1/h2/p` defaults.

**Spec ref:** Not in any spec — captured from operator request 2026-05-12. Sits **after Phase 6** per operator framing 2026-05-12 (cross-platform output extension lands first; the pickers + generator are the operator-facing layer that builds on top).

**Why parked until after Phase 6:** Phase 4.5 ships token-discovery infrastructure (single-draft → single-variation flow). Phase 5 is E2E clone. Phase 6 is cross-platform output. The style-variation generator becomes meaningful when all three are in place — at that point, "pick a style → drop a draft → clone to SGS → optionally emit to other platforms" is a coherent pipeline. Doing the generator earlier would build it before its consumers exist.


_From: New 2026-05-12 (evening) — Spec 15 Phase 4.5 follow-ups - triage: OUTDATED - references retired theme/sgs-theme/styles/ style variations_

### P-S15-PAIRINGS-PICKER — Site Editor SlotFill panel for browsing uimax pairings (~4-6 hr)

**What:** A "Browse Pairings" custom panel inside the WordPress Site Editor's Styles section. Operator browses font_pairings + colour palettes from uimax via REST endpoint backed by the uimax DB. Preview live in the editor; "Apply" writes the selected pair to the active style variation.

**Trigger:** After P-S15-STYLEVAR-GEN ships AND operator has 20+ starter looks to validate the picker UX. Don't build the picker before there's content worth picking.

**Approach:**
- Register a SlotFill via `@wordpress/edit-site` (or `wp.plugins.registerPlugin` if SlotFill API doesn't fit).
- REST endpoint `sgs-blocks/v1/uimax/pairings` reading from the uimax DB.
- Preview component renders font samples + palette swatches.
- Apply writes to `wp_global_styles` via `core/edit-site` data store.

**Spec ref:** Not in any spec yet. Phase 6+ feature.

**Why parked:** Phase 4.5 scope is convention + token discovery. Custom Site Editor UI is a separate cycle of work with its own QA gates.


_From: New 2026-05-12 — Spec 15 Phase 1 QC panel deferrals - triage: OUTDATED - references deleted Spec 15_

### P-S15-F3 — Decide root-level structural attr handling (~30 min in Phase 2)

**What:** 1023 of 1343 `block_attributes` rows (76.2%) legitimately have `canonical_slot = NULL` because the v1 slot vocabulary is content-identity only. Phase 2 drift validator must rule on: (a) accept NULL as the canonical state for structural attrs, or (b) add a `__root__` pseudo-slot for schema uniformity, or (c) extend slot vocab with structural canonicals (`container`, `wrapper`, `inner`).

**Trigger:** Phase 2 Step 2.3 (drift validator). The validator's behaviour spec must commit to one of the three options before it can flag violations.

**Spec ref:** `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §11 Phase 1 success criteria (updated 2026-05-12).

**Effort:** ~30 min inline architectural call once Phase 2 Step 2.3 begins.


_From: New 2026-05-12 — Spec 15 Phase 1 QC panel deferrals - triage: OUTDATED - references deleted Spec 15_

### P-S15-F4 — Lift output_signature coverage above 90% (~60-90 min in Phase 2)

**What:** Static analyser at 74.1% (995/1343). The 300 NULL attrs are design-shape CSS values that flow through PHP interpolation rather than `esc_*()` calls. Lifting coverage requires a small PHP-AST-light pass (e.g. detect `style=" ... {$attrs['X']} ..."` interpolations or array-keyed style maps).

**Trigger:** Phase 2 Step 2.4 (gap detection). Either accept 74.1% as ceiling and surface the rest as gap candidates, or invest 60-90 min to lift coverage.

**Spec ref:** §11 + §5.3 signature schema. Decision needed: extend the analyser, or accept the gap.

**Effort:** 60-90 min if pursued (Sonnet dispatch + tests).


_From: New 2026-05-11 - triage: OUTDATED - proposed tools/recogniser-v3/ reorganisation; orchestrator settled at plugins/sgs-blocks/scripts/recogniser/ in place_

### P-RECOG-V3 — Consolidate recogniser scripts to tools/recogniser-v3/ (20-30 min)

**What:** Move the active pipeline code into a single canonical location:
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` -> `tools/recogniser-v3/orchestrator.py`
- `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` -> `tools/recogniser-v3/voter.py`
- `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` -> `tools/recogniser-v3/confidence_matrix.py` (underscore so importable normally)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` -> `tools/recogniser-v3/leftover_bucket_router.py`
- `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py` -> `tools/recogniser-v3/review_renderer.py`
- `tools/recogniser-v2/extract.py` -> `tools/recogniser-v3/extract.py`

Also write `tools/recogniser-v3/README.md` with pipeline diagram + Spec 12 link.

**Trigger:** After Commit A (orchestrator multi-section patches) lands. Two-commit sequence: Commit B does the move, Commit C deletes `tools/recogniser/` and `tools/recogniser-v2/` once a clean orchestrator run confirms nothing else references them.

**Spec:** All path references in orchestrator (VOTER_SCRIPT, MATRIX_SCRIPT, ROUTER_SCRIPT, REVIEW_SCRIPT, extract.py path) need updating. Skill bodies that mention these paths need updating (/sgs-clone). Spec 12 file inventory section needs refresh. state.md current_step needs path update.

**Effort:** 20-30 min including a smoke-test rerun.


_From: New 2026-05-11 - triage: ABANDONED 2026-05-22 - legacy tools/recogniser-v2/extract.py retired per Decision 10_

### P-EXTRACT-GENERALISE — extract.py beyond hero (Phase 8 critical-path blocker; was misframed as Phase 9)

**What:** `tools/recogniser-v2/extract.py` currently has hardcoded attribute mappings only for sgs/hero. On the 2026-05-11 multi-section orchestrator run, 8 of 9 sections produced empty `attributes` for this reason. **Phase 8 CANNOT ship a meaningful Mama's clone without this work** -- a deploy with 8 empty sections isn't a clone.

**Reframe (2026-05-11):** Bean caught the misframing. Earlier docs put this as "Phase 9 backlog, no fixed trigger". The honest read: extract.py generalisation IS THE remaining Phase 8 work. Until it lands, the orchestrator produces structurally valid block markup with empty inner content. Phase 8 visual parity validation + live deploy + eyes-on review all depend on this.

**Spec:** Extend `extract.py` in-place (don't build a separate slot-filler.py -- previous planning's misdirection). Needs:
- Convention-driven extractors that match SGS-BEM `__element--modifier` selectors against block.json attribute names (already have Stage 3 schema)
- Per-attribute-type strategies: text from RichText / src from `<img>` / colour from computed style / spacing from CSS custom properties / icon name from SVG / link href from `<a>`
- Playwright cascade resolution for CSS-driven attributes (already in extract.py for hero; generalise the pattern)
- Role-templates catalogue defining selector-strategy + value-extractor + fallback-strategy per attribute type
- Per-platform translation rules for the lingua-franca conversion (Spec 13) when source class names aren't SGS-BEM

**Recommended sequence:** Do a 4-model peer review of the architecture FIRST (per the 2026-05-08 pattern that caught 11 fixes before the first real clone), then build. Estimated 4-6 hours focused + 30 min peer review.

**Trigger:** Next active session that can commit to a 4-6 hour focused window. This unblocks Phase 8 visual parity + deploy + eyes-on review.



_From: Session B (2026-05-22) — parked follow-ups - triage: commit c09d24cc - WP 6.x view-transitions fallback retired_

### P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP — drop the WP 6.9 inline fallback now that WP 7.0 is live

**Status:** DECISION-NEEDED (parking sweep 2026-05-22) — Bean must confirm: are any active client sites still on WP 6.x? If no, retire the fallback. If yes, keep until upgrade.
**Where:** `plugins/sgs-blocks/sgs-blocks.php:200-217` — the `customize_controls_enqueue_scripts` hook has a `function_exists('wp_enqueue_view_transitions_admin_css')` branch + inline `@view-transition{navigation:auto;}` fallback.
**Why:** Post WP 7.0 upgrade, the native function exists on sandybrown. The fallback is dead code on this site but kept for any client site still on WP 6.x.
**Decision needed:** Are any active client sites on WP 6.x? If not, retire the fallback. If yes, keep until those clients also upgrade.


## 2026-05-20

_From: 2026-05-14 parked items (Spec 16 session) - triage: archive copy already present at parking-archive.md line 354_

### P-S18-LEGACY-CUSTOMISER-CONTROLS-ORPHANED (original capture, archived after resolution)
**Captured 2026-05-20.** Customiser section `sgs_floating_ui` has 23 controls registered, not 7. The canonical 7 (`sgs_floating_ui_*` prefix from Spec 18) are present. But 16 legacy controls with prefixes `sgs_back_to_top_*` (8) and `sgs_reading_progress_*` (8) are ALSO registered to the same section — orphan registrations from a prior iteration.

**Operator impact:** opening `Appearance → Customise → SGS Floating UI` shows 23 controls. Some duplicate the canonical 7's purpose (e.g. `sgs_back_to_top_enabled` vs `sgs_floating_ui_back_to_top_enabled`). Confusing UX and risks operator setting one prefix while the renderer reads the other.

**Touch points to investigate:**
- `plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php` (the canonical 7)
- Grep for `add_control.*sgs_back_to_top` or `add_control.*sgs_reading_progress` (the orphans)

**Fix sketch:** identify which file registers the legacy 16 and either delete (replacement is built, per build-replacement-before-retiring rule) or migrate any still-useful settings into the canonical 7.

**Acceptance:** `wp eval` enumerating `sgs_floating_ui` section returns exactly 7 controls matching Spec 18.

Source: Session 2026-05-20 sandybrown smoke test (Spec 17 live verification, Task 1).


_From: 2026-05-14 parked items (Spec 16 session) - triage: archive copy already present at parking-archive.md line 362_

### P-PHASE-2A-WRAPPER-CLASS-NOT-INJECTED (original capture, archived after resolution)
**Captured 2026-05-20.** Branch A's `Sgs_Header_Behaviours::inject_behaviour_class` filter hooks `sgs_header_rule_resolved` (fires INSIDE `Sgs_Header_Rules::evaluate()`). At that point the rule has matched and `render_pattern()` has returned the inner content of the header — but that content has NO `<header>` tag. WP core adds the `<header class="wp-block-template-part">` wrapper LATER, via `render_block_core_template_part()`'s html_tag wrapping logic. 

Tried adding a second filter on `render_block_core/template-part` to inject the class onto the wrapper after core wraps. Filter IS registered (verified via `has_filter`) but never fires in practice — when `pre_render_block` short-circuits with our content, WP core appears to skip the `render_block_{name}` filter chain OR the wrapper isn't added when pre_render returns non-null.

**Verified live on sandybrown (2026-05-20):**
- Rule with `behaviour: "sticky"` stored correctly in `wp_options['sgs_header_rules']`
- `Sgs_Header_Rules::evaluate()` returns 13421 bytes of header content
- Live homepage shows `<header class="wp-block-template-part">` WITHOUT `.sgs-header` or `.sgs-header--sticky`
- Position: `static` (CSS sticky not applied)
- Behaviour CSS file IS enqueued, JS view.js IS enqueued

**Three fix strategies for follow-up:**

1. **Body data attribute + CSS** (recommended). PHP reads active rule's behaviour on `wp_head`, outputs `<body class="sgs-header-behaviour-sticky">` via `body_class` filter. CSS targets `body.sgs-header-behaviour-sticky header.wp-block-template-part`. No DOM rewriting needed.

2. **Client-side JS injection.** Pass active behaviour via `wp_localize_script` → view.js reads it on DOMContentLoaded → adds class to `header.wp-block-template-part`. Risks FOUC (flash of unstyled content before JS runs).

3. **Replace pre_render_block short-circuit with a different rendering strategy.** Don't short-circuit; instead modify the template-part `slug` attribute on `render_block_data` to point at the rule-resolved pattern. Then WP core's normal rendering happens and the wrapper is added; our class injection on `render_block_core/template-part` runs as intended.

Strategy 1 is the cleanest 30-min fix. Strategy 3 is the architecturally correct fix but requires re-thinking Sgs_Header_Rules::filter_template_part (~2 hours).

**Impact on Phase 2A:** behaviour CSS + JS modules SHIPPED but currently unreachable from operator workflow. PR is mergeable; behaviours simply don't fire until follow-up lands. Test rule on sandybrown (rule_06711ea0) deleted to keep staging clean.

Touch points:
- `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php` (current second-filter attempt)
- `plugins/sgs-blocks/includes/class-sgs-header-rules.php` (where filter_template_part returns content)

Source: Session 2026-05-20 Phase 2A integration verification.


## 2026-05-16

_From: New 2026-05-16 — Phase 8 in-flight backlog - triage: commit d859da4c - severity_totals dashboard_

### P-PHASE8-11 — Severity totals dashboard in leftover-buckets.json

**What:** Multi-rater /qc panel (architecture lens) on the 2026-05-16 bucket-router upgrade flagged that `gap_level_totals` collapses all `structural` buckets (`unrecognised_section` severity=high, `cv2_handled_no_top_level_match` severity=low, `chrome_skipped` severity=info) under the same `structural` count. An operator reading `gap_level_totals.structural = 5` can't tell whether 5 are blocking or noise.

**Trigger:** Next bucket-router pass, OR operator-review dashboard work surfaces the gap.

**Approach:** Add a `severity_totals` dict in parallel to `gap_level_totals` — keys: `info / low / medium / high`. Counts derived from the existing `severity` field already on each bucket item. ~4 lines.


_From: New 2026-05-16 — Phase 8 in-flight backlog - triage: commit d859da4c - wrong-block-type detection_

### P-PHASE8-12 — Wrong-block-type detection in cv2-handled sections

**What:** Multi-rater /qc panel (architecture lens) flagged that `route_structural_mismatch` now skips ALL cv2-handled sections to avoid double-bucketing. But a cv2-handled section that emits e.g. `sgs/product-card` when the mockup clearly shows a hero section is a wrong-block-type error that silently vanishes from `structural_mismatch_or_orphan`.

**Trigger:** Phase 8 finds a section where cv2 emits a plausibly-wrong block, OR adversarial mockup testing surfaces this.

**Approach:** Cross-reference emitted slugs against `match.ranked_candidates` — if cv2 emitted a block that wasn't in the top-3 candidates AND the candidate-confidence delta is large, flag as wrong-block-type. ~15 lines.


_From: New 2026-05-16 — Phase 8 in-flight backlog - triage: commit d859da4c - block_attributes.role population_

### P-PHASE8-13 — Populate block_attributes.role column via /sgs-update

**What:** The 2026-05-16 bucket-router upgrade filters cv2_emitted_dynamic by `role IN ('text-content', 'content', 'select-from-enum')` to keep the signal meaningful. Currently most rows have role=NULL — the filter conservatively keeps them. Once /sgs-update Stage 4 (canonical pass) populates `block_attributes.role` properly, the filter will cut more noise. Today's Mama's run: 286 cv2_emitted entries; expected after role population: ~80-120.

**Trigger:** Next /sgs-update Stage 4 enhancement pass.

**Approach:** Extend `behavioural-analyser/assign-canonical.py` to also infer role from output_signature + attr_type combinations. ~20 lines.


## 2026-05-10

_From: Active items (cloning pipeline focus) - triage: block_compositions seed - commit fc0ee721_

### P-12 — `block_compositions` table seed for existing 36 patterns

**Captured:** 2026-05-08

**What:** sgs-db `block_compositions` table is currently empty (0 rows). The schema exists; the cloning pipeline will populate it for new patterns. But the existing 36 patterns in `theme/sgs-theme/patterns/` and `plugins/sgs-blocks/patterns/` need their composition data seeded too — otherwise existing patterns are invisible to the recogniser's pattern-vs-block-composition queries.

**Method:** Walk each existing pattern .php file, parse the block markup (recursive parser per CLAUDE.md gotcha), extract block_slugs JSON list, INSERT one row per pattern.

**Effort:** ~30 min Cerebras script + my QC.

**Resume trigger:** alongside P-11 (cloning-skill build) — runs as part of Milestone 1.

---


_From: Active items (cloning pipeline focus) - triage: uimax write validator integration - already enforcing_

### P-13 — Validator on uimax writes (no-licensing + Rosetta Stone discipline)

**Captured:** 2026-05-08 (audit finding from Stage +Register)

**What:** Two captured rules — `no-licensing-talk-in-sgs-cloning-context` (blub.db row 211) and `uimax-is-the-rosetta-stone-of-design` (blub.db row 213) — are embedded in skill bodies and the project CLAUDE.md, but no automated validator on uimax writes prevents reintroduction. New `/uimax-*` tools could still write rows that violate either rule.

**Spec:** Pre-write hook in each `/uimax-*` command that:
1. Greps the row payload for licensing-related keywords (`license`, `provenance_license`, `IP-firewall`) → reject + surface row 211
2. For artefact-shaped rows (patterns / components / animations / naming_conventions), validates `equivalent_implementations` is populated with at minimum `sgs_block` (or explicit `null` + gap-candidate flag) → reject otherwise + surface row 213

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** During P-11 Milestone 6 (recognition_log + operator UI) — same surface area.

---



_From: Active items (cloning pipeline focus) - triage: /sgs-update Stage 3+4 - REWRITTEN, /qc 5/5 PASS_

### P-15 — `/sgs-update` Stage 3+4 (uimax sync extension)

**Captured:** 2026-05-08

**What:** `/sgs-update` currently mirrors block.json files into sgs-db. The audit identified two missing stages:
- Stage 3 — Mirror sgs-db blocks → uimax `component_libraries` (one row per SGS block, populated as part of P-11 anyway but the auto-sync is the durable mechanism)
- Stage 4 — Scan uimax `animations.is_gap_candidate=1` rows; if an SGS block has an attribute matching the gap, surface a "gap candidate ready to close" report for operator review

**Why separate from P-11:** Bean may want this independently of the full cloning-skill build, e.g. for solving the "uimax stays stale every block change" problem before full Option A ships.

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** Either P-11 Milestone 1 OR a smaller dedicated 30-min session if Bean wants the sync gap fixed before the full build.

---

## 2026-05-24 (council-validated)

_Triage-pass additions — moved by /qc-council recommendations, applied by implementer._

_From: Cloning pipeline — commit `e3cd1a04` + archive line 21 RESOLVED_

**P-BLOCKQUOTE-TAG-OVERRIDE-FOR-QUOTE-CANONICAL-history** — RESOLVED 2026-05-24 (council-validated). Commit `e3cd1a04` + prior archive line 21 (P-BLOCKQUOTE-TAG-OVERRIDE-FOR-QUOTE-CANONICAL) confirms resolution via data-layer fix: "quote" alias moved from text canonical to quote canonical in `slot_synonyms`; "blockquote" + "pullquote" added as quote canonical aliases. Brand mockup BEM renamed to `<div class="sgs-brand__quote">`. The `-history` variant entry in parking.md tracked the walker fix shape that was ultimately superseded by the data-layer approach. No further action needed.

_From: Framework + SGS — commit `8af7b6b9` — block files exist at `plugins/sgs-blocks/src/blocks/quote/`_

**P-SGS-QUOTE-BLOCK** — RESOLVED 2026-05-17 via commit `8af7b6b9`. Block files confirmed at `plugins/sgs-blocks/src/blocks/quote/`. The parking entry predated the block being built. `sgs/quote` ships with body array + attribution + variant styles as specced.

_From: Cloning pipeline — commit `62e8e23d`_

**P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG** — RESOLVED 2026-05-17 via commit `62e8e23d`. Primary BEM class disambiguation landed in that commit. Council-validated closed 2026-05-24.

_From: Cloning pipeline — commit `62e8e23d`_

**P-CSS-IMPORTANT-STRIP** — RESOLVED 2026-05-17 via commit `62e8e23d`. `!important` strip before equality checks in `_detect_grid_container_from_css` landed in that commit. Council-validated closed 2026-05-24.

_From: Cloning pipeline — commit `62e8e23d`_

**P-VOTER-IMPORT-ASSERT-UX** — RESOLVED 2026-05-17 via commit `62e8e23d`. Voter assert moved to orchestrator-called function with explicit error logging. Council-validated closed 2026-05-24.

_From: Cloning pipeline — commit `62e8e23d`_

**P-PIXEL-DIFF-LAZY-LOAD-DYNAMIC-WAIT** — RESOLVED 2026-05-17 via commit `62e8e23d`. `page.wait_for_timeout(1200)` replaced with `wait_for_function` lazy-load image completion check. Council-validated closed 2026-05-24.

_From: Skills — archive line 48 RESOLVED 2026-05-23 + SKILL.md:319 fix confirmed_

**P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF** — RESOLVED 2026-05-23 (Wave A). Haiku rater enumerated 8 dispatch-graph node references; the lone gap (line 319 `superpowers:writing-plans` legacy reference) fixed inline by updating to successor skills `/strategic-plan` + `/phase-planner`. Full resolution details in parking-archive.md 2026-05-23 section. Council-validated and confirmed closed 2026-05-24.

_From: Cloning pipeline — Group 4 quick-close, heritage-strip migration completed 2026-05-24_

**P-MAMAS-ANNOTATED-INDEX-MIGRATION** — RESOLVED 2026-05-24 (Group 4 quick-close). `sites/mamas-munches/mockups/homepage/annotated-index.html` migrated from `.sgs-heritage-strip*` to `.sgs-brand*` CSS and HTML, matching the canonical `index.html`. All 8 `.sgs-heritage-strip` references replaced: 5 in CSS block (incl. 2 `@media` overrides), 3 in HTML section. Verified 0 remaining references via grep. DOM restructured to match canonical BEM: `sgs-brand`, `sgs-brand__content`, `sgs-brand__headline`, `sgs-brand__quote`, `sgs-brand__attribution`, `sgs-brand__cta`, `sgs-brand__image`.

_From: Framework + SGS — Group 4 quick-close, int interpolation fixed 2026-05-24_

**P-PHP-FOOD-SERVICE-INT-INTERPOLATION** — RESOLVED 2026-05-24 (Group 4 quick-close). `sites/indus-foods/deploy/food-service-page.php` line 415: `{$result}` string interpolation of int replaced with `absint( $result )` concatenation. Intelephense diagnostic cleared.

---

## Archived 2026-06-02 (prune pass — moved from live parking.md)

_21 entries removed from the live doc. All were Status: CLOSED, RESOLVED, DROPPED, SUPERSEDED, or SHIPPED+VERIFIED. Verbatim text preserved below for audit trail._

---

_From: 2026-05-31 (pm) wrapper-perfection follow-ups_

> **P-HERO-DOUBLE-WRAPPER-AND-SPLIT-IMAGE** — UPDATED 2026-06-01 (qc-council locked fix-shape → Spec 22 §FR-22-19). Code-level root cause (R-22-11): the WALKER emits the hero interior as two generic `sgs/container` columns (§FR-22-4.1); render.php ALSO wraps `$content` in `.sgs-hero__content` + renders its own scalar media column → double `.sgs-hero__content` + classless `sgs/media` children the art-direction CSS can't target. **render.php is ALREADY correct** — its 169-attr image pipeline + the `--mobile/--desktop` `@media` art-direction CSS (render.php:760-788) already work for a bare-content + scalar-media model. **FIX = converter-side H-conv** (route content→bare `$content` InnerBlocks; images→scalar `splitImage`/`splitImageMobile`). The render.php thin-shell approach (H2) was REJECTED by the 3-rater qc-council: it retires the image pipeline + the art-direction CSS onto `sgs/media` (can't replicate) → violates "preserve full functionality"; blast radius 7 sections + 5 block files. Full design + build sequence + **OPEN GAP** (no DB column yet maps a composite's media-column BEM element → its scalar attr target; build MUST add DB-first, never a per-block slug conditional) in **Spec 22 §FR-22-19** + decisions D126. Council brief: `.claude/scratch/2026-06-01-hero-fix-shape-qc-brief.md`.
> **Status:** SHIPPED + LIVE-DOM VERIFIED 2026-06-01 (commits 83a55820/5859c42d/b83cd312; decisions D130-D131). Hero live DOM = 1 `.sgs-hero__content` (double-wrapper fixed) + media column + 2 art-directed split-images. Residual = real image sideload (media-map) for the images to load (dry-run 404 now) — see next-session-prompt REMAINING #1. · **Bucket:** Pipeline / converter.

---

_From: 2026-05-31 (pm) wrapper-perfection follow-ups_

> **P-TRUST-BAR-HYBRID-MIGRATION** — UPDATED 2026-06-01 → reframed as DUAL-MODE (Spec 24 §FR-24-10), NOT a naive FR-22-6 migration. The renamed `sgs/trust-bar` renders on the canary via its DEFAULT `items` (coincidental match to Mama's), ignoring the converter's emitted badge InnerBlocks (run-223313 ground truth: `sgs/trust-bar > sgs/container.__inner > 4× sgs/container.__badge > sgs/icon + sgs/text`). A naive `echo $content` migration would GUT the curated icon-picker repeater + 3 badge variants (icon-circle/text-only/image-badge) + autoScroll + title → violates "client experience primary". **Resolution = dual-mode** (Typed curated repeater OR Bound `echo $content`) via a Source-toggle mode attr — same pattern as product-card (Spec 24 FR-24-2). R-22-14 clean (mode attr, not `empty($content)` fallback). Bean chose full dual-mode 2026-06-01 (accepted it continues past the hero into a focused session). Badge children use existing primitives (container+icon+text/label+media) — no new atomic block. All 18 attrs + 3 variants preserved (full schema enumerated 2026-06-01). Design: **Spec 24 §FR-24-10** + decisions D127.
> **Status:** SHIPPED + LIVE-DOM VERIFIED 2026-06-01 (commit d6358f32; decisions D127/D130). Bound mode renders the 4 cloned badges live (`sourceMode:bound`); pixel −5.2 to −6.7pp (strongest measured win); Typed curated repeater preserved. Converter sets `sourceMode='bound'` on cloned dual-mode blocks. · **Bucket:** Block migration (dual-mode).

---

_From: 2026-05-31 (pm) wrapper-perfection follow-ups_

> **P-D1-INFOBOX-EXISTING-POST-MIGRATION** — DROPPED 2026-05-31 (Bean). No live SGS-theme sites exist (scratch pages only, due to be remade once the pipeline is production-ready), so info-box deprecated.js v4 not migrating existing posts is moot. Revisit only when a real production SGS-theme site exists (then: WP-CLI batch existing-post migration per R-22-14). **→ GENERALISED 2026-06-01 to P-FR226-NULL-SAVE-MIGRATION** (the same null-save→InnerBlocks auto-migrate gap applies to every FR-22-6 block, not just info-box; the moot/dropped disposition stands until a production site exists).
> **Status:** DROPPED · **Bucket:** Block migration.

---

_From: 2026-05-31 FR-22-6 converter content-routing + Spec 24 follow-ups_

> **P-UNIFY-CONTAINER-ABSORPTION** — NEW 2026-05-31 (Bean directive). **RESOLVED by §FR-22-4.1 (D118, 2026-05-31).** Two mechanisms previously handled container nesting: `_absorb_transparent_wrappers` (D52 pre-pass) and the walker's `_is_layout_bearing_wrapper` depth-2 gate (D117 G2). §FR-22-4.1 unifies both into the single four-step precedence rule — rule #2 covers the D52 merge case (direct-descendant with no block match folds CSS into parent), and rule #4 covers the D117 G2 preservation case (non-direct-descendant gets its own container). Code cleanup (replacing the two discrete functions with the §FR-22-4.1 implementation) can be done when next touching the walker.
> **Status:** RESOLVED (principle formalised in §FR-22-4.1; code-architecture cleanup still pending — low priority)
> **Bucket:** Pipeline / converter
> **Trigger:** When next touching the walker's container-routing path — replace `_absorb_transparent_wrappers` + `_is_layout_bearing_wrapper` with a single §FR-22-4.1 implementation.

---

_From: 2026-05-27 Phase 1.5 close + Phase 2 reorder follow-ups — closed inline_

<!-- P-MIRROR-DB-DIVERGENCE-ROOT-CAUSE: closed — both DBs verified at 89 rows + identical canonical_slot hash (0ad10db82ebd). Fix 2 rollback was clean; pre-existing divergence concern dormant. Stream A's Step A3 keeps the watch active. -->
<!-- P-FIX-4-WORKTREE-PRESERVATION: closed — Fix 4 hero diff committed to branch `worktree-agent-adf7827adc88aea77` as preservation commit `0bc0ea9a` + pushed to origin. Diff survives any local worktree auto-cleanup. Stream B can fetch from `origin/worktree-agent-adf7827adc88aea77` when activated. -->
<!-- P-ROOT-CLAUDE-MD-R-22-14-PROPAGATION: closed — Root CLAUDE.md + .claude/CLAUDE.md both updated with R-22-14 in the binding-rules block + Active Focus section + authoritative-pointers section (commit incoming). -->

---

_From: 2026-05-27 Spec 22 walker deferred routing work_

**P-SLOT-SYNONYMS-CONTENT-GAPS-AUDITED** — NEW 2026-05-27 (pre-Phase-1 audit, closed same-day). Initial finding: 11 content-bearing slot_synonyms rows had NULL standalone_block. Per-row audit (via block_attributes usage query) revealed 10 of 11 are CORRECTLY NULL by design: `alt`/`ariaLabel` (accessibility props of parent, not InnerBlocks children); `bar`/`feature`/`header` (only catch *Colour/*Background color attrs); `nav`/`slot` (0 usage); `progress`/`ribbon` (role=visual, excluded by positive-allowlist); `options` (form-field internal rendering, Phase 2 scope). One gap filled: `role.standalone_block = sgs/label` (activates walker routing for team-member.role + testimonial.role per existing aliases `authorRole`/`jobTitle`/`speakerRole`/`category`). Walker activation verified: `equivalent_block_for('sgs/team-member', 'role') → sgs/label` post-fill. All 5/5 + 4/4 + 30/30 tests still PASS. Triple-NULL baseline unchanged at 1090.
> **Status:** CLOSED 2026-05-27

---

_From: 2026-05-27 Spec 22 walker deferred routing work_

**P-SGS-UPDATE-ROLE-DETECTION-IMPROVE** — CLOSED 2026-05-27 (Spec 22 Phase 0.1.b implementation). Role-detection module added to `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (`detect_role_from_block_json()` + dry-run + apply mode). Three-tier heuristic: (1) attr-name regex against the 5 content-bearing role families; (2) JSON-schema `format` hint (uri/email → link-href); (3) description-keyword scan as low-confidence fallback. Hard guard: only proposes values in `_CONTENT_BEARING_ROLES` (text-content / image-object / content / link-href / identity) — never styling roles. Dry-run output: `pipeline-state/_snapshots/role-detection-diff-2026-05-26T12-03-24Z.json` (94 high-confidence proposals: 42 text-content, 31 link-href, 12 identity, 7 image-object, 2 content). Acceptance verified: sgs/icon.iconSource/iconName resolve to `identity`, linkTarget to `link-href`, sgs/timeline.entries to `content` (all four match spec's expected outcomes). 11 unit-test cases pass via `--self-test`. Apply with `--apply-roles --role-diff-file <path>`.
> **Status:** CLOSED 2026-05-27

---

_From: 2026-05-27 Spec 22 walker deferred routing work_

**P-D85-BASELINE-CONSTANT-DRIFT** — CLOSED 2026-05-27 (Spec 22 Phase 0.1.b implementation). Replaces the hardcoded `1142` triple-NULL baseline constant in assign-canonical.py with a file-backed snapshot at `pipeline-state/_snapshots/triple-null-baseline.json`. Sanity check now reads the snapshot at script start and reports `OK — guardrail intact, matches snapshot` on match, or a drift message naming the snapshot + capture date on mismatch. New `--recapture-baseline` CLI flag writes a fresh snapshot with the current count when /sgs-update Stage 4 legitimately adds new blocks. Eliminates alert fatigue when DB grows.
> **Status:** CLOSED 2026-05-27

---

_From: 2026-05-28 Spec 22 walker deferred routing work_

**P-SLOT-SYNONYMS-ATOMIC-CLEANUP** — CLOSED 2026-05-28. Five conflicting `slot_synonyms.html_semantic_tag` rows NULL'd inline as part of Track A DB-first cleanup: `subheading.h2`, `tab.button`, `review.article`, `step.li`, `items.ul`. `standalone_block` values left untouched (no walker-routing effect). Guardrail tests 39/39 PASS post-NULL (zero behavioural impact — atomic_tag_map no longer queries this column, html_tag_for_slot() helper has no production callers). Future cleanup of remaining slot-contextual-only rows (avatar.img, buttonSecondary.a, social.a, star.svg, ribbon.span, price.span, rating.span, etc.) is no-cost low-priority; left until a /sgs-update audit sweep picks it up.
> **Status:** CLOSED 2026-05-28

---

_From: 2026-05-28 Spec 22 walker deferred routing work_

**P-COMPOSITE-ATTR-ROUTING** — DROPPED 2026-05-28. Originally raised as a needed `slot_synonyms.composite_attr` column to handle composite-block routing in the walker (label/headline/sub attr-targeting on sgs/heading). The Track B γ-rebuild on 2026-05-28 collapsed sgs/heading from composite to single-element + `headingRole` enum, eliminating the underlying need. The remaining single-attr routing concern is captured by `P-SUBHEADING-ROUTING-TO-SGS-HEADING` above.
> **Status:** DROPPED (superseded by sgs/heading γ-rebuild + P-SUBHEADING-ROUTING-TO-SGS-HEADING)

---

_From: Cloning pipeline (cv2 / orchestrator / DOM walker / pixel-diff)_

**P-PIXEL-DIFF-VERTICAL-ANCHOR-FIX** — Closed by Phase 0.3 (Spec 22 Commit 0.3). 60px chrome-bleed on hero-clone-poc identified as `position:sticky;top:0` template-part header overlaying `el.screenshot()` viewport. Mitigated by pre-screenshot `visibility:hidden` on detected sticky/fixed chrome. Telemetry: `sgs_chrome_height_px` + `wait_fonts` now written to every `diff.json`. See `pipeline-state/_phase-0-3-regression/` for postfix evidence.
**Status:** CLOSED 2026-05-28

---

_From: Cloning pipeline — D99 port + DB table work_

**P-UTF8-MOJIBAKE-IN-CONVERTER** — **Status:** RESOLVED 2026-05-30. Root cause was source-file corruption in `plugins/sgs-blocks/src/blocks/announcement-bar/block.json` line 38 (cp1252 double-encoding). Fixed 2026-05-30 by editing to proper UTF-8 emoji + em-dash. Repo-wide grep for encoding byte signatures returned 0 other hits. Pre-commit hook to reject mojibake byte signatures parked separately as P-PRE-COMMIT-MOJIBAKE-GUARD.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-SECTION-ROOT-INHERITANCE-SCRIPT** — **Status:** RESOLVED 2026-05-30 D112 (sync-container-wrapping-blocks.py shipped at commit 062c69d1). 468 LOC inheritance script shipped. Populates `block_composition.wraps_block` for 4 blocks (`sgs/hero`, `sgs/cta-section`, `sgs/modal`, `sgs/quote`). Flags 174 attrs missing from wrapping blocks plus 14 naming-drift dedups across diff Markdown files in `pipeline-state/section-root-sync/`. Operator review path; never auto-edits block.json. See decisions.md D112.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-SECTION-ROOT-INHERITANCE-SCRIPT-LEGACY** — Pre-resolution design body for P-SECTION-ROOT-INHERITANCE-SCRIPT above (hero/container parity audit, 41 missing attrs, 3 naming drifts, fix-shape sketch). **Status:** SUPERSEDED by the RESOLVED entry above.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-PRODUCT-CARD-GIFT-VARIANT-AUDIT** — **Status:** CLOSED 2026-06-01 (D140 — `gift` removed from the `variantStyle` enum in block.json + the editor SelectControl; render.php had no gift branch so existing posts unaffected; enum now `[standard, trial, featured]`). Investigation confirmed gift variant was UNUSED in Mama's mockup; gift-section cards use `sgs-gift-section__card` class not product-card.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-XS-2-TIER-CRITERIA-DECISION** — **Status:** RESOLVED 2026-05-30 D107. Option 1 chosen: operator declares `supports.sgs.is_section_root: true` in block.json. `/sgs-update` Stage 1 reads the flag and writes `blocks.tier='class-section'`. Shipped roster: `sgs/hero`, `sgs/cta-section` (commit e2c8597e). Voter queries the column for section-root candidates.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-XS-3-TRIGGER-REFINEMENT** — **Status:** RESOLVED 2026-05-31 by §FR-22-4.1 (D118). Refined XS-3 predicate in `_is_layout_bearing_wrapper()` + `get_block_composition_role()` in db_lookup.py (commit 0a212e3c). Five conditions: sgs-* BEM class + parent is a Tag + parent composition_role section-root/wrapper-shell via block_composition + has element children + has CSS rules. Formalised as §FR-22-4.1 — the canonical four-step precedence rule superseding `walk_passthrough`, `_absorb_transparent_wrappers` (D52), and the depth-2 gate.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-XS-3-NEW-TABLE-FOR-CONTAINER-WRAPPED-BLOCKS** — **Status:** RESOLVED 2026-05-30 D108. `block_composition` table (188 rows, block_slug PK, wraps_block, composition_role enum [section-root|wrapper-shell|content-block|leaf], has_inner_blocks, accepts_allowed_blocks) shipped. Walker consumption reverted at c76aa107 pending refined trigger — moved to P-XS-3-TRIGGER-REFINEMENT (now also RESOLVED above).

---

_From: Cloning pipeline — D99 port + DB table work_

**P-XS-12-RETIRED** — **Status:** RESOLVED 2026-05-30 (Bean directive D8). Chrome-skip observability log retired because header/footer-specific scripts will be built post-1%-per-device pixel-diff target; this code will be replaced anyway. No commit needed; XS-12 entry dropped from the diagnostic register fix sequence.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-ASSIGN-CANONICAL-D99-PORT** — **Status:** RESOLVED 2026-05-30 D110 (port + batch backfill shipped at commit 04fa0f2b). 9 references migrated to `slots WHERE scope='element'` + `roles` table join. Batch backfill ran cleanly: canonical_slot coverage 52→659 (2.5%→31.8%), role coverage 110→676 (5.3%→32.6%). 1316 rows remain NULL — gap candidates for future enrichment, no errors. See decisions.md D110.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-ASSIGN-CANONICAL-D99-PORT-LEGACY** — Pre-resolution design body for P-ASSIGN-CANONICAL-D99-PORT above (port from `slot_synonyms` to `slots WHERE scope='element'` + roles table join, batch backfill rollout). **Status:** SUPERSEDED by the RESOLVED entry above.

---

_From: Cloning pipeline — D99 port + DB table work_

**P-UTF8-MOJIBAKE-IN-CONVERTER-OBSOLETE** — **Status:** RESOLVED — XS-11 investigation 2026-05-30 narrows the search to downstream stage-10 deploy / WP REST path. Root cause ultimately confirmed as source-file corruption (see P-UTF8-MOJIBAKE-IN-CONVERTER above). The subagent's initial mojibake claim was a Windows cp1252 tool-output rendering artefact, not file corruption. Entry superseded by P-UTF8-MOJIBAKE-IN-CONVERTER (RESOLVED above).


---

_From: Theme thread — 2026-06-02 session 5 (archived on resolve, D150 standard)_

**P-CART-INCREMENT-E2E** — **Status:** RESOLVED 2026-06-02. `sgs/cart` badge-increment-on-add-to-cart was untested (canary had 0 WooCommerce products). Resolved: created WC product 513, live-verified via Playwright on `/cart-increment-test/` (page 514) — add-to-cart → `POST /wc/store/v1/cart/add-item` 201 → badge 0→1, no full reload, no `?wc-ajax=get_refreshed_fragments`, `wc-blocks_added_to_cart` fired. `sgs/cart` now fully OUTCOME-ACHIEVED. The product 513 fixture also unblocked product-card Phase C (D151). Original entry NEW 2026-06-02.

---

_From: Cloning thread — 2026-06-02 (archived on resolve/supersede, D150 standard)_

**P-CONTAINER-KIND-ROSTER** — **Status:** RESOLVED 2026-06-02 (D152, commit `0d746073`). Workstream A built + shipped: `sync-container-wrapping-blocks.py` rewritten to the D150 "wraps children" detection + 3-KIND model + KIND→attr-scope diff; `block_composition.container_kind` migration added (db_lookup.py); seed-composition-roles.py renamed trust-badges→trust-bar row + inserted option-picker + flipped post-grid/gallery/card-grid; trust-bar/modal block.json containerKind:"section". 4-rater qc-council SHIP-WITH-FIXES (caught + fixed the UPDATE-only silent-undercount: --apply now fails-loud + rolls back on missing rows). `--apply` wrote all 28 (4 section/13 layout/11 content), verified. Editor /qc of the 4 D150 save-null deprecations also PASSED. Original entry NEW 2026-06-02 (D150).

**P-CSS-TRANSFER-CONTENTWIDTH** — **Status:** SUPERSEDED 2026-06-02 (D152) by **P-CONTAINER-WRAPPER-STANDARDISATION** (WS-1 of the 5-workstream programme). The old "Option B = add contentWidth that caps+centres each CHILD via :where()" design was CORRECTED this session to the inner-WRAPPER model (container renders an `sgs-container__inner` div that caps content as a group; children keep their own CSS incl. alignment — resolves the eyebrow-label-centring concern). The fix-shape doc `2026-06-04-css-transfer-gaps-1-2-fix-shape.md` is retained as the WS-1 baseline reference but its cap-each-child mechanism is superseded. Now tracked as WS-1 in `.claude/plans/2026-06-02-container-wrapper-standardisation.md` + Spec 22 §FR-22-21. Original entry NEW 2026-06-02 (extends D136 gaps 1+2).

---

_From: Theme thread — 2026-06-04 fast-follows (archived on resolve, D150 standard)_

**P-JEST-BLOCK-EDIT-MOCK-ROT** — **Status:** RESOLVED 2026-06-04 (commit `b80907c6`). The 8 pre-existing `block-edit.test.js` failures are fixed; full Jest suite 31/31 passes; production build compiles. Root causes (found via the test error chain, evidence-first): (1) `@wordpress/components` mock missing `ButtonGroup` (used by `ResponsiveControl`); (2) `@wordpress/block-editor` mock missing `useSettings` (plural — used by `DesignTokenPicker` + `SpacingControl`; mock had only singular `useSetting`); (3) a genuine React key bug in `ContainerWrapperControls.js` (cloning thread's WS-4 component) — it passed React `key` as a function arg into `renderPanel({...,key})` instead of keying the list child, so multi-panel kinds logged duplicate-key warnings (real editor-console issue, not just tests) — fixed with a keyed `<Fragment>`, behaviour-neutral. Original entry NEW 2026-06-04 (U12).

**P-CONFIGURATOR-JS-WEIGHT-DEQUEUE** — **Status:** RESOLVED 2026-06-04 (commit `2bbec95a`, `includes/configurator-asset-optimiser.php`). The FR-27-H1 ≤150KB budget is MET. New include conditionally dequeues the redundant WooCommerce jQuery frontend stack (`jquery`, `jquery-migrate`, `jquery-blockui`, `woocommerce.min`, `wc-add-to-cart`, `sourcebuster-js`, `wc-order-attribution`, `js-cookie`) on pages with a bound (wc-product) configurator card; jQuery itself removed only when no other enqueued script still depends on it (defensive). This brought EXECUTED JS from ~183KB (over) to **73KB (under 150KB ✓)**. Live-verified on canary 589: jQuery gone, pill swap (£24.49 sale, 0 XHR), add-to-cart → proxy 200 + badge 0→1 + "Added to your basket.", availability grey-out intact, axe-core 0 violations, 0 new console errors. **KEY CORRECTION:** the original "207KB miss" was a MEASUREMENT ERROR — it conflated executed scripts with `<link rel="prefetch">` resources. The ~2MB "site-wide wc-blocks bundle" is WooCommerce deliberately PREFETCHING the cart/checkout bundle (`AssetsController::get_prefetch_resource_hints()`) into cache for fast future checkout navigation — `initiatorType: "link"`, `transferSize: 0` (cache-amortised), never parsed/executed, zero INP/main-thread cost. An intentional WC conversion feature, left in place (optionally disable via the `wp_resource_hints` filter). The "5 SGS animation scripts" sub-item was deliberately NOT dequeued (tiny + dequeuing risks cosmetic regressions on pages with animated blocks; budget met without them). Original entry NEW 2026-06-04 (D165, U10). Memory: prefetch-vs-executed JS measurement gotcha.

## P-STALE-SLOT-SYNONYMS-SCRIPT-REFS — RESOLVED 2026-06-07 (commit 0f4e1a9b)
Opened + resolved same day. The `slot_synonyms` table was dropped at D99 (live DB: gone; `slots`/`roles` replaced it) but offline scripts still queried it. **Resolved:** migrated all active SQL → `slots`/`roles` across 9 scripts (drift-validator/validate, gap-detection ×5, uimax-tools/enrich-db, sgs-update-v2 docstring, converter_v2 test fixture). Mapping: canonical_slot→slot_name, description→notes, +scope='element', role→roles, html_semantic_tag dropped. Bonus: the converter_v2 test was 0/8 (stale `_slot_to_html_tag` ref) → now 8/8. Final grep: zero active `slot_synonyms` SQL outside historical `migrations/` + `_retired/`. Bucket: Tooling.

---

## 2026-06-07 — staleness sweep (27 entries archived)

> **P-PRODUCT-CARD-PHASE-DE** — ARCHIVED 2026-06-07 (verified: Phase D shipped `c68b8cb6` 2026-06-03 + pill-swap resolved 2026-06-04; DB row CONFIRMED present (real DB ~/.agents/.../sgs-framework.db slots: option-picker ← aliases [pill-group,...] → sgs/option-picker).) — UPDATED 2026-06-03. **Status: OPEN** (framework). Product-card Phase A (option-picker) + Phase B (variation-sets meta + panel + custom-fields fix) + Phase C (Bound mode WC/CPT wrapper+bridge, D151) + **Phase E (`sgs/content-collection` query block, Spec 24 FR-24-4/5/6, version 1.1.0) ALL SHIPPED + deployed to sandybrown canary.** Remaining: **Phase D** = clone-emit (converter outputs `sgs/option-picker` for a pill group — TRUTH-SPEC + slot_synonyms/slots + converter, per D144.4; design proposal in `.claude/scratch/2026-06-02-phase-d-pill-emit-design.md` is SUPERSEDED BY BUILD — actual implementation kept option-picker as content-block + used G3-attrs path with `allow_text_fallback=False`, see scratch note). **Plus a Phase-2 data-model task (see P-PRODUCT-CARD-PILL-SWAP-DORMANT):** pill→price/image swap is wired but dormant. Full design: Spec 24 §FR-24 + D144/D149/D151.

> **P-FR2241-FOLD-IMPLEMENTATION** — ARCHIVED 2026-06-07 (verified: recursive fold shipped to main `ce07728d`+`8424d92d`) — UPDATED 2026-05-31. **FR-22-4.1 recursive fold IMPLEMENTED + structurally verified on branch `feat/fr22-4-1-universal-wrapper` (commit after `8f900750`).** Three evidence-driven fixes (each root-caused via trace + live-DOM, not pixel): (1) recursive **fold** — a slug-None sgs-wrapper that is the SOLE element child of an emitted container folds its layout onto the parent's native attrs (no new div); multiple children = structural items, each own container; (2) **sole-shell gate** — fixed brand +44→ (folding a grid COLUMN like `__content` collapses N-col layouts; restores the `_absorb_transparent_wrappers` 1-child guard); (3) **wrapper-div leak** — `_emit_section_container` now emits InnerBlocks directly (matching `sgs/container` save.js `<InnerBlocks.Content/>`); the static `<div class=wp-block-sgs-container>` placeholder was leaking into the dynamic block's `$content` as an extra nesting level, breaking grid-on-section. **VERIFIED live DOM (R-22-11/R-22-13):** trust-bar = 4 icon+text badge grid items (was 1 collapsed label); brand = 2-col side-by-side (`__content` left x=233 + `sgs/media` right x=743); social-proof testimonials+stars render; no structural regressions. Plus leaf-with-element-children guard (D115 blind spot). **Pixel-diff +1.70pp (66.30 vs 64.60) — fidelity NOT structure:** dominated by (a) missing sideloaded images (brand right column empty, hero), (b) trust-bar renders 2-col not the mockup's responsive 4-col (only BASE grid-template-columns lifted to native attr, not the `@media` 4-col), (c) hero composite block shows BOTH art-direction images + internal layout, (d) header +32@768 = NOISE (theme template part, not converter output). /qc-council (cross-family Sonnet+Haiku) on the diff: no canary-blocking bugs; CSS-loss on folded shells is a generality gap (native-lift covers the canary; no worse than baseline drop) — documented. **Status was:** OPEN (WIP preserved on branch; canary 144 currently has the regressed WIP deployed — next step re-deploys main baseline then implements the fold). **Bucket:** Pipeline / converter.

> **P-CONVERTER-CONTENT-ROUTING-FIX** — ARCHIVED 2026-06-07 (verified: merged to main `1761eb35`; Method-2 is the active converter path) — NEW 2026-05-31. **G1 + G2 SHIPPED (commit 1fcb0742 on branch, D117) — content + side-by-side layout now RENDER (live-DOM verified).** G1 = FR-22-2 leaf content-routing + the `attr_type` fallback-bug fix. G2 = FR-23-6 depth-2 grid-wrapper preservation (council-designed; formalised as §FR-22-4.1 per D118 — the canonical container rule all future container-routing implementations MUST follow). Remaining for full pixel-acceptance: see P-FR226-FIDELITY-AND-MERGE. **Status was:** PARTIAL (renders correctly; pixel-acceptance pending). **Bucket:** Pipeline / converter.

> **P-PRODUCT-CPT-DEPLOY-SEED** — ARCHIVED 2026-06-07 (verified: CPT deployed `9fc9fecb` + 48-SKU WC fixture seeded `43ecfce1`) — NEW 2026-05-31. `sgs_product` CPT + `seed-mamas-products.php` are built + committed (branch c9c6544d) but NOT deployed/seeded. To create the 2 reference products: deploy the plugin + create the entries (work around the `wp eval-file` content-guard hook — use `wp post create` over SSH or wp.data via Playwright). Also decide per-site opt-in gating for the CPT (currently registers unconditionally). ~15 min. **Status was:** OPEN. **Bucket:** Feature build.

**P-SGS-UPDATE-V2-COGNITIVE-COMPLEXITY-REFACTOR** — ARCHIVED 2026-06-07 (verified: cc sweep closed `44aa91f8` 2026-05-24) — PARTIAL-RESOLVED 2026-05-24 (3 of ~9 functions shipped this session; 6 remain). SonarLint surfaced 9 functions in `plugins/sgs-blocks/scripts/sgs-update-v2.py` (2,400-line `/sgs-update` orchestrator) with Cognitive Complexity above the 15 allowed. **Status was:** PARTIAL.

Shipped 2026-05-24: Proposal A — `stage_5_slot_synonym_auto_seed` cc 29 → ~10 (commit `4c5aaa5c`). Proposal B — `stage_4_style_variation_sync` cc 85 → ~9 (commit `8127f880`). Proposal C — `_mode_b_refresh_upstream` cc 142 → ~28 (commit `c0fb9639`). Full detail in original parking.md entry (pre-archive). **Trigger to action (remaining 6):** dedicated session after current doc-op programme closes.

### P-DETECT-INNER-ELEMENT-WIDTHS — ARCHIVED 2026-06-07 (verified: `4a505319` 2026-05-17) — `_detect_client_layout_widths` misses `__inner` element widths (~20 min)
**Status was:** OPEN

**What:** Today's orchestrator re-run wrote `theme/sgs-theme/styles/mamas-munches.json:settings.layout = {contentSize: 1000px, wideSize: 1000px}` — both keys carry the same value because only one block-root selector (`.sgs-brand { max-width: 1000px }`) matched. The mockup actually authors content widths on `__inner` elements: `.sgs-header__inner: 1280px`, `.sgs-trust-bar__inner: 1100px`, `.sgs-featured-product__inner: 1040px`, `.sgs-ingredients-section__inner: 960px`, `.sgs-gift-section__card-inner: 960px`, `.sgs-social-proof__inner: 960px`. The current SGS-BEM-block-root regex correctly rejects these (per Section T of common-wp-styling-errors.md), but in doing so loses real layout-width signal. **Fix shape:** extend `_detect_client_layout_widths` to ALSO accept `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*__inner$` selectors.

### P-SGS-ATOMIC-RICH-TEXT-AUDIT — ARCHIVED 2026-06-07 (verified: `40a6f8ab` 2026-05-30) — SGS atomic emissions (sgs/heading, sgs/text, sgs/button, sgs/quote) don't preserve inline rich-text (~60 min)
**Status was:** OPEN

**What:** XS-9 (2026-05-30 D104) added rich-text preservation for `<br>`, `<strong>`, `<em>`, `<a>` etc. in core/* atomic-tag swaps (core/heading, core/paragraph, core/quote, core/button). SGS atomic emissions retain `node.get_text(strip=True)` behaviour pending render.php audit because their content escape policy is unknown — applying rich-text without confirming `wp_kses_post()` wrap on render could either (a) lose tags to `esc_html()` escaping or (b) introduce XSS. Full detail in original parking.md entry (pre-archive). Captured 2026-05-30.

### P-HEADING-DEFAULTS-NORMALISE-FOR-SERIF — ARCHIVED 2026-06-07 (verified: `aefefe76` 2026-05-17) — `headlineLetterSpacing: -0.01em` default not universal (~20 min)
**Status was:** OPEN

**What:** Rater 1 finding. sgs/heading render.php fallback default `headlineLetterSpacing: -0.01em` actively hurts readability on loose serif faces (DM Serif Display, Playfair). Sans-serif display (Inter, Montserrat) benefits from -0.01 tracking; serifs don't. **Approach:** Change default to empty string in render.php (no inline style emitted unless explicitly set). Same audit for `headlineLineHeight: 1.2` etc. **Trigger:** First serif-typography client OR when adding a non-Inter style variation.

### P-BORDER-STYLE-ENUM-PARITY — ARCHIVED 2026-06-07 (verified: `aefefe76` 2026-05-17) — sgs/heading vs sgs/quote borderStyle enum mismatch (~5 min)
**Status was:** OPEN

**What:** Rater 4 finding. quote allows `["none","solid","dashed","dotted","double"]`. heading only allows 4 (no "double"). Setting `borderStyle: double` on heading silently downgrades to `none`. **Approach:** Standardise to the 5-value set across heading + text + quote + future. One-line edit in each block.json.

### P-HEADING-TRANSITION-ATTRS — ARCHIVED 2026-06-07 (verified: `aefefe76` 2026-05-17) — Add transitionDuration + transitionEasing attrs to sgs/heading hover (~15 min)
**Status was:** OPEN

**What:** Rater 4 finding (partially false — attrs don't exist today). sgs/heading hover transition is hardcoded `300ms ease`. Non-configurable; should expose attrs for parity with hover-controls extension. **Approach:** Add `transitionDuration` (number, default 300) + `transitionEasing` (string, default "ease") to block.json. Render.php reads them. Same for sgs/text + sgs/quote.

### P-WRAPPER-ATTR-LEADING-SPACE-AUDIT — ARCHIVED 2026-06-07 (verified: `59ee4490` 2026-05-17) — Sweep `<element<?php echo` across all dynamic blocks (~45 min)
**Status was:** OPEN

**What:** sgs/heading rendered malformed HTML `<divstyle="..."` when WP's block-supports filter injected a style attr via regex without leading space. Fixed today via explicit space: `<div <?php echo $wrapper_attrs; ?>>`. The same pattern likely exists in other dynamic blocks (sgs/info-box, sgs/feature-grid, sgs/testimonial, sgs/card-grid, sgs/container, sgs/hero, sgs/button, sgs/cta-section, sgs/media, sgs/text) — any wrapper tag rendered as `<tag<?php echo $wrapper_attrs; ?>>` without explicit leading space is at risk when block-supports adds inline-style attrs. **Approach:** grep for `<\w+<\?php echo \\\$wrapper_attrs` across all `plugins/sgs-blocks/src/blocks/*/render.php`. Captured 2026-05-17 from /qc-inline finding 1 (HIGH).

### P-IMAGE-UPLOAD-INTO-PIPELINE — ARCHIVED 2026-06-07 (verified: `51e9ab13` 2026-06-04, live-verified canary) — Promote upload_and_patch.py into the orchestrator (~30 min)
**Status was:** OPEN

**What:** The 2026-05-17 session built `reports/brand-walkdown-2026-05-19/upload_and_patch.py` as a one-shot fix to upload mockup images + patch block_markup. The orchestrator's stage-4i media-sideload runs in `--dry-run` mode by default; live upload is never triggered through the canonical pipeline. **Approach:** Add `--upload-media` flag to `sgs-clone-orchestrator.py`. When set: pass `upload=True` to `sideload_batch`; add a post-sideload "URL rewrite" step; save patched extract as authoritative for post-deploy `register_to_wp`. Captured: 2026-05-17.

### P-PHASE9-REDEPLOY-BASELINE — ARCHIVED 2026-06-07 (verified: superseded by parity2 `2ddea70b` + Spec 22 canary workflow) — Refresh sandybrown post 65 with post-lift converter output (~20 min)
**Status was:** OPEN

**What:** Pixel-diff baseline (post 65 at sandybrown) was last refreshed 2026-05-17. The 2026-05-19 commit adds new `style.*` attrs into emitted block markup. Until post 65 is redeployed with the new markup, pixel-diff% won't reflect the visible improvement. Superseded by the parity2 canary workflow (page 144) which replaced the old post-65 baseline model.

### P-COVERAGE-SCOPE-FILTER — RESOLVED 2026-06-07 (commit b0c9e0d4: selector_scope field added to expected_rules.py. NOTE: the original 'superseded by parity2' archive was WRONG — file-truth found expected_rules.py still live at sgs-clone-orchestrator.py:1441; the field was actually built this session.) — Add `selector_scope` field to expected-rules baseline (~30 min)
**Status was:** OPEN

**What:** Coverage% currently treats every CSS rule in `expected-rules-<boundary>.jsonl` as a candidate for SGS-attr matching. Universal selectors, generic-tag selectors, and pseudo-only-state selectors have no SGS-attr equivalent by design. Including them in the denominator deflates coverage% on every section. This baseline model was superseded by parity2 `2ddea70b` which replaced the expected-rules baseline approach entirely.

### P-PHASE9-6 — ARCHIVED 2026-06-07 (verified: guard shipped `8444d4e4`; RETIRED_BLOCK_REMAP now empty) — RETIRED_BLOCK_REMAP future-block-registration guard (Adversarial C1)
**Status was:** OPEN

**What:** `RETIRED_BLOCK_REMAP = {"heritage-strip": "brand"}` silently locks pattern routing even if `sgs/brand` is later registered as a real block. The remap fires unconditionally; Tier 2 always picks the pattern over the block. **Approach:** Add a module-load assertion that no `RETIRED_BLOCK_REMAP` value collides with a currently-registered block slug. Guard shipped `8444d4e4`; RETIRED_BLOCK_REMAP is now empty so the guard always passes harmlessly.

### P-PHASE9-NITS-BATCH — RESOLVED 2026-06-07 (commit b0c9e0d4: the _css_prop_to_suffix/_breakpoint_suffixes wrapper fns were inlined+dropped. NOTE: the original 'deleted by da3de993' archive was PARTLY WRONG — file-truth found the wrappers still existed; the DB-delegation was done but the inline-and-drop nit was completed this session.) — Fresh-eyes nits in convert.py / db_lookup.py
**Status was:** DEFERRED

- **P-PHASE9-8:** `convert.py:_css_prop_to_suffix()` and `_breakpoint_suffixes()` are thin wrappers with no transformation. Inline the calls at the 3 call sites; drop the wrapper functions. ~10 lines removed.
- **P-PHASE9-9:** `db_lookup._kind_for(suffix, role)` is opaque on cold read. Rename to `_value_kind_for_suffix()`. Update the 1 call site.

Both targets deleted by the walker rewrite `da3de993`; suffix handling DB-migrated `dce5a496`. No action needed.

### P-PHASE8-2 — ARCHIVED 2026-06-07 (verified: render audit fix `7a2a777d` + universal responsive lift `d9c11ed7`) — Per-block render.php audits
**Status was:** OPEN

**What:** Many lifted styling attrs aren't honoured by block render.php. The converter lifts `headlineFontSizeTablet` correctly but the block's render.php doesn't emit a `@media (min-width:768px) { .sgs-Xxx__headline { font-size:N }}` rule for it. Audit 6-8 blocks (hero, product-card, info-box, heritage-strip, testimonial-slider, feature-grid, card-grid, cta-section). **Approach:** for each block: list all *Tablet / *Mobile / *Desktop variant attrs in block.json; confirm render.php emits matching media-query CSS; confirm CSS uses `:not([style*="<prop>"])` fallback pattern per SGS standard. **Effort:** ~30 min per block × 6-8 = 3-4 hours. Resolved via render audit `7a2a777d` + universal responsive lift `d9c11ed7`.

### P-PHASE8-3 — ARCHIVED 2026-06-07 (verified: `lift_subtree_into_block_attrs` + per-block guards deleted `da3de993`) — Remove hyperspecific block_slug guards in `lift_subtree_into_block_attrs`
**Status was:** OPEN

**What:** `if block_slug == "sgs/hero":` at line 1016 and `if block_slug == "sgs/heritage-strip":` at line 1048 are pre-existing technical debt the multi-model QC panel surfaced as "in scope of NEEDS-REFACTOR but not new". Refactor to BEM-modifier-driven generic lift via a DB-backed `block_image_slots` table. All targets deleted by the walker rewrite `da3de993`; the function no longer exists in the current converter.

### P-PHASE8-5 — ARCHIVED 2026-06-07 (verified: product-card architecture superseded by Spec 27; no packSizes attr in current block) — Pack-size pills not rendering on featured-product cards
**Status was:** OPEN

**What:** Lift code in `_extract_attr_value` and the lift_subtree loop correctly emits `packSizes` array in the converter's WP block markup for Zookies card. Render.php has `if ( ! $is_trial && ! empty( $pack_sizes ) )` gate. Pills don't render visibly on the deployed page. Architecture superseded by Spec 27 (no packSizes attr in current block — variation-sets model replaced it per D129/D144).

### P-PHASE8-7 — ARCHIVED 2026-06-07 (verified: hardcoded `_BREAKPOINT_SUFFIXES` replaced by DB-driven `breakpoint_suffix_rules()` `dce5a496`) — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop
**Status was:** OPEN

**What:** The styling-lifter's `_BREAKPOINT_SUFFIXES` table covers 5 industry-standard breakpoints (min-width 768/1024/1280, max-width 767/640). Non-standard breakpoints (e.g. `min-width: 900px` or `min-width: 576px`) are silently ignored — the responsive attr family doesn't get lifted. **Approach:** add a stderr warning when a media-query selector matches a known class but the breakpoint isn't in the table. Long-term: read breakpoints from theme.json or a new config rather than a hardcoded set. **Resolved:** `_BREAKPOINT_SUFFIXES` dict replaced by DB-driven `breakpoint_suffix_rules()` in `dce5a496`.

### P-MM-1 — ARCHIVED 2026-06-07 (verified: superseded by deterministic-only pattern rule; Bean directive `c1aa4cc5`) — Create 4 gap-candidate patterns for Mama's homepage
**Status was:** OPEN

**What:** Four mockup sections have no matching pattern yet: `featured-product`, `products` (4× `sgs/product-card` grid), `gift-section` (3 cards: 1 trial + 2 gifts), `social-proof` (containing `sgs/testimonial-slider` + trustpilot bar). Each needs a pattern file under `theme/sgs-theme/patterns/` following the same shape as `ingredients-section.php` and `header-mamas-munches.php`. **Superseded:** Bean directive `c1aa4cc5` established deterministic-only patterns rule — no stub patterns created speculatively. Converter handles these sections directly.

### P-MM-3 — ARCHIVED 2026-06-07 (verified: sgs/cart built + added to header `f9e3ae0c`, live-verified) — Add cart element to header-mamas-munches pattern
**Status was:** OPEN

**What:** Current `theme/sgs-theme/patterns/header-mamas-munches.php` uses `core/site-logo` + `core/navigation` + `sgs/mobile-nav-toggle` + `sgs/mobile-nav`. The renamed mockup has cart button + cart badge that the pattern doesn't model. Structural drift between mockup and pattern. **Resolved:** `sgs/cart` block built + added to header `f9e3ae0c`; live-verified on canary.

### P-PH8-1 — ARCHIVED 2026-06-07 (verified: test referenced dead Spec 15/16 infra; deleted `da3de993`) — Hero parity test file scaffold
**Status was:** OPEN

**What:** Phase 6 Step 6 specified running `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py::test_hero_filled_slots_match_baseline_count -v` as a sanity check. The test file doesn't exist yet — Phase 8 deliverable. The test references Spec 15/16 recogniser infra (tools/recogniser-v2) which was permanently retired per Decision 2026-05-15(d) and physically deleted by `da3de993`. The test premise is moot — Spec 22 universal walker replaced it entirely.

### P-11-M9 — ARCHIVED 2026-06-07 (verified: entire M9 scope superseded by Spec 22 universal walker + parity2) — REOPENED 2026-05-09 (false-claim ship, milestone never actually validated)
**Status was:** OPEN

**What:** The M9 milestone was claimed shipped by the previous session but was NOT actually validated. The orchestrator extension code shipped (commit dcb185b). The 6521-file foundation committed. But the multi-section orchestrator NEVER RAN on the live site. **Superseded:** The M9 scope (multi-section orchestrator, 14 visual-diff reports, coverage gates, pre-commit STOP GATE) was entirely superseded by the Spec 22 universal walker (`da3de993`) + parity2 canary workflow (`2ddea70b`), which replaced both the recogniser-v2 pipeline and the per-block visual-diff infrastructure with a universal single-path architecture.

### P-COVERAGE-METRIC-CORE-STYLE — ARCHIVED 2026-06-07 (verified: Phase-9 coverage infra superseded by parity2 `2ddea70b`; premise retired; re-park fresh if it resurfaces in the Spec 22 walker) — Extend `attribute_coverage` to count core-block nested style paths (~30 min)
**Status was:** OPEN

**What:** `scripts/pixel-diff.py compute_attribute_coverage` does suffix-anchored match on SGS-flat-attr keys. The new universal-lift helper emits nested `style.color.text`, `style.typography.fontSize`, `image.style.scale` etc. — the coverage matcher doesn't recognise these paths as covering CSS rules. The Phase-9 `compute_attribute_coverage` infrastructure was retired when parity2 `2ddea70b` replaced the measurement model. Premise retired; re-park as a fresh entry if coverage measurement resurfaces in the Spec 22 walker context.

### P-PARENT-QUALIFIED-TAG-LIFT — ARCHIVED 2026-06-07 (verified: targets deleted `_lift_core_block_style` `da3de993`; premise retired) — Smarter SGS-class guard allowing parent-qualified tag selectors (~45-60 min)
**Status was:** OPEN

**What:** The 2026-05-19 commit's `_lift_core_block_style` SGS-class guard rejects lift on any node without an `sgs-` class. This correctly blocks the tag-blast-radius bug but ALSO rejects parent-qualified tag selectors like `.sgs-brand__body p { font-size }` — the inner `<p>` has no SGS class but the matching selector IS class-qualified via the ancestor. **Superseded:** `_lift_core_block_style` and its entire call chain were deleted in the walker rewrite `da3de993`. The premise is retired. Re-park as a fresh entry scoped to the Spec 22 converter architecture if parent-qualified tag lift resurfaces as a gap.

### P-TAG-SELECTOR-LIFT — ARCHIVED 2026-06-07 (verified: targets deleted `_lift_core_block_style` `da3de993`; premise retired) — Lift CSS from tag-only selectors targeting atomic children (~30-45 min)
**Status was:** OPEN

**What:** `_lift_core_block_style` reads CSS via `_collect_css_decls_for_element` which matches by class + parent-qualified class selectors. Pure tag selectors (`blockquote p`, `blockquote footer`, `h1, h2, h3 { font-family }`, `img { max-width }`, `a { color }`) aren't picked up because the node's classes don't match. **Superseded:** `_lift_core_block_style` deleted in walker rewrite `da3de993`. Premise retired. Re-park in Spec 22 context if tag-selector lift is needed in the Method-2 converter.

---

## 2026-06-07 — pipeline/phase entries resolved (commit b0c9e0d4)

> **P-CONFIGURATOR-PRICE-FORMAT-LOCALE** — NEW 2026-06-04 (D168, surfaced by the TAX-UI qc-council). **Status: DEFERRED** (framework / i18n). The configurator's client price formatter (`view.js formatPrice` → `toLocaleString(undefined, …)`) uses the browser/OS locale's thousand + decimal separators, while the PHP SSR (`wc_price` via `sgs_configurator_format_minor`) uses WooCommerce's configured `woocommerce_price_thousand_separator` / `_decimal_separator`. For UK en-GB + prices <£100 these match exactly (Mama's case), so it does not bite the current canary. But for any price ≥£1000 OR a non-UK browser locale OR a non-default WC separator, the SSR string and the on-swap string can diverge (e.g. `£1,234.00` vs `£1.234,00`) — an SSR==swap parity break. **Fix:** seed `thousandSeparator`/`decimalSeparator` (from `wc_get_price_thousand_separator()`/`wc_get_price_decimal_separator()`) + the price format into the manifest/context and format manually in `view.js` instead of `toLocaleString(undefined,…)`. Pre-existing (predates TAX-UI; TAX-UI did not widen it). **Bucket:** Framework / i18n. — RESOLVED 2026-06-07 (commit b0c9e0d4: already implemented in product-card view.js formatPrice; verified)

## 2026-06-02 — cloning thread: container/wrapper standardisation programme (D152)

> **P-PRODUCT-CARD-COSMETIC-POLISH** — NEW 2026-06-03. **Status: OPEN** (framework). Two minor cosmetic gaps surfaced during QC (P2/P3 priority): (1) WooCommerce placeholder image shown when a product has no featured image — needs a graceful no-image state (hide `<img>` or show a styled empty placeholder instead of the WC default broken image). (2) `priceNote` font size renders at 13px — should be 14px per design. Neither is a blocker for the Bound mode launch. — RESOLVED 2026-06-07 (commit b0c9e0d4: priceNote 14px + no-image state)
> **Bucket:** Feature build

**P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION** — NEW 2026-05-27 (Phase 1.3b regression). The pre-1.3b `sgs/team-member.render.php` emitted Schema.org `Person` JSON-LD with a `sameAs` array populated from the flat `socialLinks[].url` values. Phase 1.3b converted `socialLinks` to a child `sgs/social-icons` InnerBlocks slot — the social URLs are now inside child block markup, not accessible as flat attrs from team-member's render.php. The `sameAs` Schema.org array was REMOVED rather than parsed back from `$content`. **Effect:** team-member blocks no longer emit `sameAs` Schema.org structured data → SEO regression for any team-member pages relying on Schema.org Person markup. **Resolution options:** (a) parse `$content` via `parse_blocks()` in team-member render.php and walk the child sgs/social-icons block's `icons` attr to extract URLs — cheapest, most localised; (b) move Schema.org JSON-LD emission into sgs/social-icons render.php with a `context: 'person'` flag passed down via block ancestry; (c) server-side meta marker on team-member that the new sgs/social-icons render.php reads up-tree. Option (a) is recommended. — RESOLVED 2026-06-07 (commit b0c9e0d4: sameAs JSON-LD restored from child social-icons)
> **Status:** OPEN
> **Bucket:** SEO / structured-data regression
> **Trigger:** Phase 2 (post Phase 1.5) OR sooner if any team-member-using client surfaces an SEO Schema audit issue.

## Cloning pipeline (cv2 / orchestrator / DOM walker / pixel-diff)

_60 entries._

### P-FOOTER-WRAPPER-CLASS-MISSING — sgs/footer render.php doesn't emit `.sgs-footer` on wrapper (~10 min) — RESOLVED 2026-06-07 (commit b0c9e0d4: sgs-footer wrapper class emitted)
**Status:** OPEN


**What:** Pixel-diff against page 144 (canary — page 131 was deleted) selecting `.sgs-footer` at 1440 returns 98.7% diff — but the cause isn't the footer rendering badly; it's that `.sgs-footer` matches a stray `<h2 class="...sgs-footer-label">` heading on the page, NOT the actual `<footer>` wrapper. The sgs/footer block's render.php emits the `<footer>` element without adding `sgs-footer` as its block-root class. Selector-by-prefix mismatches cause this collision.

**Fix shape:** audit sgs/footer (and sgs/header — same issue suspected; header diff 24% may also be wrong-element-matched) render.php to add `sgs-<block-name>` class to the wrapper alongside any existing `wp-block-sgs-<name>`. Re-measure with the corrected wrapper class to get a real footer diff.

**Trigger:** before any further pixel-diff measurement on `.sgs-footer` or `.sgs-header` — selector reliability gate.

### P-HEADER-WRAPPER-CLASS-AUDIT — sgs/header same suspected pattern (~10 min) — RESOLVED 2026-06-07 (commit b0c9e0d4: sgs-header wrapper class emitted)
**Status:** PARTIAL


**What:** Similar to footer. Header at 24% (clean baseline) is suspiciously low given the visual rendering shows substantial differences. Possible that the selector is matching only a partial header sub-tree. Confirm by checking what `.sgs-header` matches on page 144 (canary page — page 131 was deleted).

**Fix shape:** read first `<*[class*=sgs-header]>` element on page 144; if it's not a `<header>` wrapper, apply the same fix as P-FOOTER-WRAPPER-CLASS-MISSING. **Closure criterion:** Playwright confirms `.sgs-header` matches a `<header>` wrapper element on page 144.

**Trigger:** alongside P-FOOTER-WRAPPER-CLASS-MISSING.

### P-PHASE9-5 — Empty-DB defensive assertion (Adversarial A1) — RESOLVED 2026-06-07 (commit b0c9e0d4: empty property_suffixes table now warns)
**Status:** OPEN


**What:** `db_lookup.css_property_suffixes()` returns `[]` silently if the `property_suffixes` table is empty or DB file is missing (sqlite3 auto-creates an empty file on connect). The lifter then extracts zero CSS-driven attrs across the entire pipeline with no error raised.

**Approach:** Add `assert len(rows) > 0` at module load. Or fail-fast with a clear `RuntimeError` message naming the canonical DB path + `/sgs-update` recovery command. ~5 line fix.

### P-PHASE8-14 — Section-collapses-into-leaf-block guard — RESOLVED 2026-06-07 (commit b0c9e0d4: nested-depth leaf-collapse diagnostic guard added to leftover-bucket-router)
**Status:** OPEN


**What:** Multi-rater /qc panel (fresh-eyes lens) flagged an adversarial scenario: a section whose class accidentally matches a leaf-level block name (e.g. `<section class="sgs-product-card">` rather than `<section class="sgs-products"><div class="sgs-product-card">…</div>…</section>`). Stage 2 matches the registered `sgs/product-card` at confidence 1.0. The block-root fast path fires at the section root. `lift_subtree_into_block_attrs` collapses the entire multi-component section into a single product-card block with whatever the first descendant's attrs were. No bucket captures this — silent collapse.

**Trigger:** Real client mockup hits the pattern, OR Phase 8 closure work uses an adversarial test to demonstrate the gap.

**Approach:** Add a new check `route_section_complexity_mismatch` (or extend `route_wrong_block_type`): when Stage 2 matches a registered LEAF block (no InnerBlocks slot in block.json) at confidence ≥ threshold AND the section DOM contains > N child elements OR descendant depth > D, emit `structural_mismatch_or_orphan` with `source="section_collapsed_into_leaf_block"` and severity `high`. Need to read block.json `supports` to determine "is this a leaf vs composite block". ~25 lines + DB lookup.

### P-PHASE8-15 — severity_totals key in orchestrator router-failure fallback — RESOLVED 2026-06-07 (commit b0c9e0d4: severity_totals added to stage-9 schema + fixtures)
**Status:** OPEN


**What:** Multi-rater /qc panel (ecosystem lens) noted the orchestrator's bucket-router subprocess-fail fallback initialiser hardcodes `{"leftover_buckets": {}, "totals": {}, "total_count": 0}` — no `severity_totals` key. If the router subprocess fails (non-zero exit) AND a downstream consumer eventually reads `severity_totals`, it'll throw KeyError. No consumer reads it yet, but future operator-review HTML / handoff regen may.

**Trigger:** First downstream consumer of `severity_totals` is wired in.

**Approach:** Add `"severity_totals": {}` to the fallback init dict at `orchestrator_main.py` (stale ref `sgs-clone-orchestrator.py:1606` → file renamed to `orchestrator_main.py`; verify exact line before editing). Note: `severity_totals` fallback grepped 0 hits there — may need adding, verify first. 1 line.

### P-PHASE8-10 — Standalone-block column validation on walker startup — RESOLVED 2026-06-07 (commit b0c9e0d4: standalone_block_for() cross-checks registered/built blocks → container fallback)
**Status:** DEFERRED


**What:** Multi-rater /qc panel (architecture lens) raised a deferred concern: a bad row in `slot_synonyms.standalone_block` (e.g. `text → sgs/paragraph`, `media → sgs/image`) would route every leaf-text element through the composite path, conflicting with `ATOMIC_TAG_MAP`. No load-time validation today.

**Trigger:** Next time someone proposes adding a synonym for a tag covered by `ATOMIC_TAG_MAP`, OR the converter exhibits unexpected routing under DB extension.

**Approach:** In `db_lookup._slot_to_standalone_block()`, reject any row where the standalone_block matches a value in `ATOMIC_TAG_MAP.values()`. Emit stderr warning + drop the row from the map. ~10 lines.

### P-PHASE8-4 — `convert_page.py` line 198 still hardcodes `extracted_attributes: {}` — RESOLVED 2026-06-07 (commit b0c9e0d4: convert_page.py extracted_attributes now wired (brace-depth harvest))
**Status:** OPEN


**What:** During the 2026-05-15 styling-lift work, the implementer fixed `convert_section()` in `__init__.py` to populate extracted_attributes via brace-depth extraction. The parallel `convert_page.py` function still has the hardcoded empty dict. If the orchestrator routes through convert_page.py instead of convert_section, Stage 9 sees empty extracted_attributes.

**Trigger:** Next session start (Phase 8 will run convert_page.py at orchestrator invocation; surface this as one of the first investigations).

**Approach:** apply the same brace-depth extractor logic. ~15 lines.

### P-QC-COUNCIL-PHASE-B-BACKPORTS — RESOLVED 2026-06-07 (verified by file-read of ~/.agents/skills/qc-council/SKILL.md: hard iteration-cap at Stage 8 line 287 + rationalisation-table integration at Stage 4 lines 183-190 both present; Phase B done).
Hard iteration-cap and rationalisation-table integration confirmed present in the qc-council SKILL.md; Phase B backports fully implemented.

## RESOLVED 2026-06-10 — P-SPEC27-28-COUNCIL-MUSTFIX-WAVE (Spec 27 R4 `0d7badb8`+`f5f3449b` + F2 `95754224` shipped, D202 — the entry's last open scope; council backlog had closed at D196. Deferred sub-items remain recorded inside: single-on-sale anchor (re-evaluate at P4), ex-plus-vat basis label, Cyrillic-homoglyph deny-list, optional pre-publish readiness check.)

> **P-SPEC27-28-COUNCIL-MUSTFIX-WAVE** — NEW 2026-06-05 (6-persona adversarial-council on the shipped Cluster C + Spec 28 P1 + docs; every item below FACT-CHECKED against real code/git by a verifier subagent — 2 council claims were REFUTED and are NOT listed). **Status: PARTIAL — Wave 1 (9 items: #3 #6 #7 #8 #10 #11 #12 #15 #16 #18) + Wave 2 (8 items: #1 #4 #5 #9 #13 #14 #19 #20) SHIPPED + live-verified + pushed 2026-06-06 (D180; commits `04e62cdd`, `34e7e427`). A 3-team adversarial red-team then found + fixed 5 more gaps + a PREFLIGHT false-positive (lean-subset drift). **Wave 3 #2 SHIPPED 2026-06-06 (D181; commits `dbb96b6c`, `0bf4f2a7`):** grounding showed WC products edit CLASSIC (not Gutenberg), so #2 = a classic-editor edit-screen notice surfacing the persisted `_sgs_preflight_issues` (the publish-block was silent because the in-request notice was lost on the post-save redirect) + auto-set Google variesBy at provisioning (built via /subagent-driven-development, sonnet-spec + haiku-quality reviewed, mapping live-verified).** **Wave 3 #17 SHIPPED 2026-06-09 (D196):** lean-seed stripper centralised into `includes/configurator-seed.php` (3 callers delegate; drift class dead) + render-helpers.php 1533→46-line loader + 7 cohesive helpers files + cart-proxy 1029→749 with Cart_Limits/Cart_Cache_Purge extracted; 3-rater /qc-council gated; canary 540 byte-identical post-deploy; PREFLIGHT ready=true; live lean seed 20,326 B. **THE COUNCIL BACKLOG IS NOW 100% CLOSED.** Session-18 continuation also shipped: Spec 27 v6 (D197), Spec 28 P2 engine (D198, `bf769cee`), P3 preview-only authoring (D199, `aa599097`) + the P3 visual qc-council pass (D200, `84899c2c` — 2 browser-only functional bugs + 12 findings fixed). REMAINING (now the only open scope): **Spec 27 R4 + F2** (next-session-prompt-theme.md Tasks 1+2). #2 deferred sub-item: an optional proactive pre-publish readiness check (lower value now the block reason is visible). DEFERRED (recorded D180): Spec 28 single-on-sale anchor (needs P3 linked single-unit SKU — P3 now exists, re-evaluate when P4 builds); ex-plus-vat trade-mode ladder/header basis label (opt-in, unused on canary); Cyrillic-homoglyph deny-list (operator self-authored — accepted residual). P3 admin-UI deferred polish → see P-P3-ADMIN-POLISH below. **Bucket:** Framework / shop layer.
>
> **MUST-FIX (before a real paying client uses the value ladder / shop):**
> 1. **Value-ladder has NO authoring UI (C1/C2/C3 VERIFIED).** `framingMode`/`decoyEnabled` have no controls in `product-card/edit.js`; `_sgs_base_price_pence`/`_sgs_decoy_enabled` are READ-only meta ("UI is P3", `class-configurator-meta.php:187`). With no base price set, `sgs_saving_display` returns '' for every row (`render-helpers.php:746-748,883`) → savings SILENT by default; a non-coder can't enable them without WP-CLI. **Fix:** add a `framingMode` SelectControl + `decoyEnabled` ToggleControl to edit.js (gated to non-typed mode) + a validated `_sgs_base_price_pence` product field.
> 2. **PREFLIGHT publish-block is INVISIBLE in the block editor (P1 VERIFIED).** It surfaces only via `admin_notices` (`class-product-preflight.php:181`) which Gutenberg doesn't render; `grep preflight src/` = 0. A client's product silently reverts to Draft with no reason. **Fix:** a `PluginPrePublishPanel`/`@wordpress/notices` JS integration calling the existing `GET /sgs/v1/products/{id}/preflight`; + an actionable `no_variesby` message (link to the term screen) + auto-set a sensible `variesBy` at provisioning.
> 3. **Live £0 Store-API add-to-cart bypass (P2 VERIFIED — self-documented `TODO FR-MISSING-3`, `class-cart-proxy.php:966-986`).** The `woocommerce_add_to_cart_validation` filter may not cover the Block Store-API path; `woocommerce_is_purchasable` is NOT overridden (grep=0). **Fix:** override `woocommerce_is_purchasable` → false when `wc_get_price_to_display() <= 0` (blocks every add path at once).
> 4. **LEGAL — fabricated reference price (Consumer-Law MF-1; C4 VERIFIED).** `_sgs_base_price_pence` sanitises with `absint` ONLY — no check a real single is sold at it → "save X% vs buying singly" is an unsubstantiated comparison (DMCC 2024 / CPRs). **Fix:** validate at save (≥ smallest-pack per-unit + a "this single is genuinely available" confirmation) OR derive from a real single-unit SKU; suppress the "vs buying singly" tail when no single exists.
> 5. **LEGAL — "Best value" on a non-cheapest pack (Consumer-Law MF-2; C5 VERIFIED).** Decoy mode targets the 2nd-largest row (`render-helpers.php:955-957`) but the badge says the literal words "Best value" (`render.php:653`) while a cheaper-per-unit pack is visible — a DMCC misleading action. **Fix:** when `decoy_enabled`, use a non-superlative label ("Popular choice"); reserve "Best value" for the actually-cheapest-per-unit row.
>
> **SHOULD-FIX:**
> 6. Rate-limit counts REQUESTS not variations (P5 VERIFIED) — one `/provision` writes up to 300 against 1 token (~18k writes/min @ 60 req). Budget by variations created. `class-product-authoring-security.php:143`.
> 7. `can_edit_product` returns a bare bool → REST 401 not 403 (P4 VERIFIED). Return a `WP_Error` 403. `class-product-authoring-security.php:51-54`.
> 8. `_sgs_test_fail_after` visible in the public OPTIONS schema (P3 VERIFIED; dead code, low risk) — gate its registration behind `WP_DEBUG`/`SGS_TESTING`. `class-product-provisioning-args.php:135-145`.
> 9. termLabel size-axis detection is English-only `/size/i` + first-axis fallback (P10 VERIFIED) — breaks on "Roast"/"Größe". Let the operator pick the pack-size axis, or detect by unitDivisor-correlation. `render.php:417`.
> 10. Health cron checks only the 50 OLDEST products (`ORDER BY ID ASC LIMIT 50`, P7 VERIFIED) — new products never checked. Rotate/randomise selection or hook `woocommerce_update_product`. `class-product-preflight.php:514`.
> 11. `no_image` preflight passes a WC PLACEHOLDER image (P8 VERIFIED) — replicate render.php's `woocommerce-placeholder` URL check in the preflight loop. `class-product-preflight.php:374-376`.
> 12. Rollback `wp_delete_post($vid,true)` return unchecked (P9 VERIFIED) — non-atomic; check + surface "manual cleanup: variation IDs X,Y" rather than a clean "rolled back". `class-product-provisioning.php:742-743`.
> 13. "vs sale price" tail can mismatch the saving's denominator (C6 PARTIAL) — the saving is vs the single-item anchor, not the sale price; make the tail describe the actual denominator. `render-helpers.php:786-792`.
> 14. **LEGAL** — cosmetic discount-label strips digits/% but NOT price-claim WORDS (C7: by-design as a code matter, but a legal product-decision) — add a deny-list (half/free/cheapest/lowest/guaranteed/bogof/save/off/deal/sale/discount) + length cap. `class-configurator-meta.php:298-307`.
> 15. slug-rename warning transient TTL = 60s, too tight (Support S1) → `DAY_IN_SECONDS`. `class-configurator-edit-safety.php:41`.
> 16. variation-delete warning dual-fires on trash + permanent-delete (Support S2) — gate on trash-vs-permanent + clearer copy ("restore from the WooCommerce Trash"). `class-configurator-edit-safety.php:204-227`.
> 17. File-cohesion debt — `render-helpers.php` = 1514 lines, `class-cart-proxy.php` = 988 (C8 VERIFIED, both over the 300 guideline). Split render-helpers into colour / configurator-pricing / value-ladder / svg-kses.
>
> **MISSING (add whole dimensions):**
> 18. No test asserting the lean-seed `data-wp-context` stays ≤24KB — the exact regression that bit Cluster B (`3a1e95df`). Add a size-assert (current baseline 22408B).
> 19. No substantiation/audit trail for a price claim (Lawyer MISSING) — timestamp + provenance when `_sgs_base_price_pence` is set (DMCC expects an evidence file).
> 20. No VAT-basis guard: the consumer-facing ladder per-unit can be ex-VAT when `tax_mode==='ex-plus-vat'` (Lawyer SF-1) — force the consumer ladder to inc-VAT, or label the basis. `render-helpers.php:858-864`.
>
> **REFUTED by the fact-check (do NOT action):** "unmanaged-stock qty uncapped" (a hard 50-cap exists, `class-cart-proxy.php:608`); "discount-label sanitiser is broken" (digit/% strip is intentional SEC-4 scope — only the LEGAL word-deny-list #14 is worth doing).
>
> **STRATEGIC (Ship-PM, single-voice but load-bearing):** the real first-shop blocker is the CONVERTER (cloning D178: typography/grid/hero don't lift), NOT more shop capability. Do NOT pull Spec 28 P2/P3/P4 forward ahead of the converter. The shop LAYER is complete; a first client's actual page can't be produced until the converter is faithful.

## 2026-06-12 — Spec 30 P2 Step 10 RESOLVED (theme thread) — moved from parking.md

> **P-WC-GALLERY-VARIATION-SWAP** — RESOLVED 2026-06-12 (D216): DEFERRED the driven gallery-swap, kept static-per-variation. Reasons: no multi-image variation fixture on the canary to validate it (R-22-11); the driven path couples to WooCommerce's internal gallery Interactivity store (version-fragile, violates "works on ANY WC version"); WC core already swaps the single featured image per variation, so the launch-critical behaviour exists. Revisit only when a real client ships per-variation galleries + a fixture exists. [Original entry:] **Status: OPEN** (framework). At P1 the PDP gallery uses the stable classic `woocommerce/product-image-gallery` (the Beta `woocommerce/product-gallery` rendered an empty large-image shell on WC 10.8.1). The classic gallery does NOT swap the main image per selected variation. **Decision needed at P2:** (a) drive `selectedImageId` into the Beta gallery's Interactivity context (version-fragile) or (b) accept static-per-variation (current). Probe findings: `.claude/reports/spec30-p1/STEP5-BRIDGE-DESIGN.md`. **Bucket:** Framework / shop layer.

> **P-WC-NOTIFY-ME-CAPTURE** — RESOLVED 2026-06-12 (D217): BUILT + live-verified on the canary, committed `a04df8a7` on `feat/spec30-p2-step10`. Proportionate consent (un-ticked required checkbox + privacy link) + reusable `SGS\Blocks\Turnstile` for spam safety (Bean directive 2026-06-12 "don't go overboard on the legal side"). `POST /sgs/v1/notify/subscribe` chain nonce→consent→email→IDOR→rate-limit(5/IP/hr)→Turnstile→store; stores ONLY {email,ts}; `notifyMeLabel` now live (removed from dead-control baseline). Operator go-live action: paste real Cloudflare Turnstile keys (FR-30-13). [Original entry:] **Status: DEFERRED** (framework). The buybox notify-me email capture was shipped DEFERRED — no PECR-compliant capture path existed yet; `notifyMeLabel` sat in `scripts/dead-controls-baseline.json` with a remove-on-ship note. **Bucket:** Framework / shop layer.
