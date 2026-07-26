---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-20
generated: 2026-07-17 (P4 — collapsed state.md + handoff.md + next-session-prompt.md into this one LEDGER)
note: "THE single living-status doc. Replaces the old 3-way split (state/handoff/next-session-prompt) that drifted and overwrote each other. Current status is REPLACED here each session, never appended (that is how state.md ballooned to 66KB). History → dated snapshots in memory/session-YYYY-MM-DD.md (the ledger-rotate Stop hook backs this up). Structural defences (STOP catalogue + pre-flight ritual) live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24576 bytes — the rotate hook warns past that)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next," so a fresh session
(or you) gets ONE true answer instead of three drifting ones. It replaces the old three
docs (state / handoff / next-session-prompt) that kept contradicting each other.

**Track 2 history (P2 + P2.5) — CLOSED.** P2 (builder design-gate) signed off; navigation carved out as
P2.5 → **`specs/36-SGS-NAVIGATION-SYSTEM.md` v2.1**. As of 2026-07-21 the header/footer half of P2 is now
**`specs/37-HEADER-FOOTER-BUILDER.md`** (Spec 17 deleted). Full narrative:
`memory/session-2026-07-21-ledger-sweep.md` + `memory/session-2026-07-19*.md`.

- **Spec 36 Phase 1 — CLOSED 2026-07-20, all Gate-1 evidence green** (drawer axe 0 · elementFromPoint 20/20 ·
  crawl PASS with JS off · Bean's eye PASSED · D340 bounce PASSED on a real desktop browser). Built: shared
  `store('sgs/nav')`, `sgs/nav-menu`, `sgs/nav-drawer`; FR-36-1 classic-menu resolver (D352). Three bugs found
  + fixed live (D351 featured contrast 1.35:1 from a missing `featuredBg`; the drawer exit animation that had
  never once run; a co-active deploy that silently reverted a verified fix). Full detail:
  `memory/session-2026-07-20-11-spec36-phase1-close.md` + `memory/session-2026-07-21-ledger-sweep.md`.
- **`sgs/adaptive-nav` is DELETED (FR-37-21 / D362, `23a3cf63`)** — the old "stays registered as the rollback path" note is SUPERSEDED. Rollback is now git history only.

**Prior sessions (swept 2026-07-21, verbatim):** the Spec 35 inspector-UX rollout (2026-07-19/20) and the 2026-07-17 orientation block now live in `memory/session-2026-07-21-ledger-sweep.md`. Track 1b's live status is in **Active tracks** below.

**⭐ CURRENT (2026-07-26 — Track 1b: box-object migration A1+A2 COMPLETE + sgs/container editor-validation FIXED. 4 commits on main: `b9114844` `4234e26e` `586f5e9f` `68a70260`. Everything merged; next front = Wave B, see `next-session-prompt.md`).**
- **A1+A2 box-object (D383)** — grid-item padding/rounding on container/cta-section/hero/trust-bar + product-card CTA border migrated flat-scalar → 4-side/4-corner box controls, onto the EXISTING converter box-object architecture (grid.py fork + arrangement skip + `box_family` seed). Council-validated (caught true scope + 2 bugs pre-code); coercion proven safe on live content; all 5 blocks live-verified (computed-style); 567 converter tests pass. **This closes the box-flat GENUINE-UPGRADE set** (card-grid last session + these). The 10 DELIBERATE-KEEP scalars stay (pill/tag/badge radii, brand-strip padding).
- **sgs/container validation fix (D384)** — stripped 34 stale `wp-block-group`/`wp-block-columns` wrappers across 12 templates (leftover core→sgs conversion markup); editor-verified `isBlockValid:[]` on page+single, frontend `<main id="main">` unchanged. render.php regenerates the wrapper from attrs.
- **2 pre-existing findings surfaced (parked, NOT ours):** `P-CONFORMANCE-GOLDEN-DRIFT` (27 stale golden mismatches — blind re-seed forbidden) + `P-ARCHIVE-PRODUCT-WC-VALIDATION` (WC-core filter-block version drift, editor-cosmetic, frontend fine).
- **⚠ LEDGER over-cap (33KB > 24.5KB) — a multi-track sweep is owed** (the Track-2 mega block below is captured in D382 + memory; trim to a pointer next sweep). The rotate hook snapshots this to `memory/session-2026-07-26.md` on Stop.

**Prior session (2026-07-25 PM, Track 2 mega — commit `b5f2ee02`, still the current front for Track 2; full detail in D382 + memory):** mega preset layouts RENDER on BOTH surfaces; editor-preview gap CLOSED + a deeper frontend self-nest bug found & fixed. Detail below (owed a trim-to-pointer):
The "editor preview doesn't reshape" task turned out to be TWO stacked bugs, and the frontend was ALSO
silently broken (never caught — no populated page existed):
1. **Self-nested selectors (frontend).** render.php built per-`style` selectors by prepending `$root_sel` to
   `$content_sel`/`$group_sel` (which already start with `$root_sel`) → `.uid.wp-block[style] .uid.wp-block
   .content` (a panel inside itself) → matched nothing → columns/cards/minimal never rendered on the front end.
2. **Broken style-handle filename (editor + frontend).** block.json referenced the SOURCE names
   (`style.css`/`editor.css`); the build emits `style-index.css`/`index.css`. WP registered a style handle
   pointing at a non-existent build file and SILENTLY never enqueued it → the block `style` handle loaded
   NOWHERE (masked on the frontend by the render.php CSS-lift; fatal for the editor canvas). The prior D379
   "WP 7.0 iframe ignores editorStyle" diagnosis was WRONG — see MEMORY `blockjson-style-must-reference-compiled-filenames`.
**Fix (6 files, mega-* only): render.php single-rooted per-`style` shape + cards mobile grid→1col; style.css
generic shape for the editor iframe (aside `:has()` sets only align-items so it can't clobber the Cards grid —
code-review catch); editor.css emptied; block.json ×3 (mega-panel/group/aside) → compiled filenames.**
**Verified live on sandybrown:** frontend `getComputedStyle`+rect — columns side-by-side, cards 2-col grid,
both collapse to 1 col on mobile; editor canvas — columns=flex, cards=grid(2col), minimal=flex; axe scoped to
the panel = 0 NEW defects (only the pre-existing `#e68a95` `P-MAMAS-PRIMARY-CONTRAST` theme-colour, 12 nodes);
drawer/recursion/reduced-motion = no-regression by construction (no shared code touched). Test fixtures left on
canary: page **1762** (`mega-gate3-presets`, all 3 presets), panel **1745** (empty SPIKE).

**TWO NEW FINDINGS (not fixed — flagged):**
- **4 other blocks carry the SAME broken style-handle ref:** `content-collection`, `google-reviews`,
  `product-card`, `trustpilot-reviews` (block.json → `style.css`/`editor.css`). They mask it via render.php
  styling; a scoped per-block pass is owed (verify each before changing — regression risk on shipped blocks).
  A build gate could assert every `build/blocks/*/block.json` `file:` style target exists.
- **Deploy tooling gap:** `build-deploy.py`'s `tar` deploy PRESERVES mtimes, so `sgs_css_check_deploy`
  (epoch = `SGS_BLOCKS_VERSION`|`filemtime(sgs-blocks.php)`) never fires on a CSS-only change → the SGS CSS-lift
  cache serves stale CSS + block-style `?ver` doesn't bust. Had to `touch sgs-blocks.php` + `rm uploads/sgs-css/*`
  manually. Worth hardening the deploy to bump the epoch (or touch the main file) on every deploy.

**Mega CORE (shipped last session, commit `19bafc9e`) — still the base. Full narrative below.**

**Also 2026-07-25 (D381, PR #24 → main) — converter self-nest guard + transparent-wrapper dissolve.**
Closed `P-QUOTE-PATH2-SELF-NESTING`: a block could clone a phantom copy of itself around an unrecognised
child (10 blocks latent). Fix also uncovered + fixed a **silent content-drop** in tabs/feature-grid/form-step/
modal (their `__inner`/`__body`/`__content` wrappers now DISSOLVE instead of being dropped). 566 converter
unit tests + 14 new regression tests green. **Residual (deploy-gated):** 4 fossil conformance goldens need a
LANDED-proof re-seed — folds into the pending `P-ORACLE` stale-golden reseed (parking, Status PARTIAL).

**What shipped (commit `19bafc9e`):**
- **3 new blocks:** `sgs/mega-panel` (dynamic; owns ALL variant/scheme CSS), `sgs/mega-group` + `sgs/mega-aside`
  (columns/aside — made DYNAMIC this session, see below). **CF-10 = "parent paints child":** children carry ZERO
  styling attrs; the panel's scoped CSS restyles them uniformly on `style`/`colourScheme` switch — **works on the
  FRONTEND (render.php); the EDITOR-CANVAS preview of the presets is an OPEN gap (see "Your next session").**
- **`store('sgs/mega')`** (`src/shared/nav-interactivity/mega-disclosure.js`) — SEPARATE from the drawer store
  (CF-3, drawer byte-untouched), with a 300ms hover-intent + 170ms close-grace bridge (CF-13).
- **U9 nav wiring:** a classic menu item targeting a `sgs_mega_menu` post → `<button aria-expanded>` disclosure
  + `do_blocks` the panel at its REAL menu position, guarded by a recursion-safe helper
  (`includes/helpers-mega-render.php`, CF-1). Seam = `attrs['type']==='sgs_mega_menu'` + `attrs['id']`; reuses
  the verified `\SGS\Blocks\Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item` (namespaced FQN).
- **3 CPT starter patterns** (`theme/sgs-theme/patterns/mega-general-{1col,2col,2col-aside}.php`) + theme **1.5.44**.

**⚠ CF-6 CORRECTED (Bean-directed) — the pinned `templateLock:contentOnly` was WRONG.** contentOnly HIDES child
settings, so a client could not edit the link lists (icon-list edits links via its inspector repeater — a QC
council caught this as a blocking defect). **Now: panel = `templateLock:false` + `allowedBlocks:['sgs/mega-group',
'sgs/mega-aside']`** — the client ADDS/REMOVES/REORDERS 1-3 columns (only mega blocks), each internally
`templateLock:'all'` (fixed shape, editable settings). `columnCount` attr DROPPED. Matches the spec's real words
"edit content AND settings, never restructure". Also fixed (council + code-review): editor live-preview mirroring
(gap/padding/divider), first-insert padding default, inert Dark/Auto hidden, a11y visually-hidden headings,
divider→ToggleGroupControl, instance-scoped panel DOM ids.

**Review trail:** QC council (3 code-grounded raters) → CF-6 blocker + 5 UX fixes → pre-commit code-review →
duplicate-id fix. **Automated live QC on sandybrown ALL PASS:** nav renders the disclosure (interactive/trigger/
panel/button-aria-expanded present, no role=menu); multi-instance no-fatal (D374); CF-2 injection neutralised on
a real render; panel id instance-scoped. Live fixtures kept: panel **1745**, menu **100**, item **1746**.

**INTERACTIVE Gate 2 done live in the editor this session (commits `bcc8a367`/`e5f70680`/`62361a1e`/`eb3f200c`):**
- **Picker LIVE-VERIFIED** — the native "Choose a pattern" modal fires for a new `sgs_mega_menu` post with all 3
  starters (screenshots in `reports/visual-diff/mega-*.png`).
- **BUG found + fixed live:** inserting a starter showed "Block contains unexpected or invalid content" —
  `sgs/mega-group`/`mega-aside` were STATIC (save emitted a `<div>` the comment-only pattern lacked). FIXED by
  making them DYNAMIC (render.php wrapper + `save→InnerBlocks.Content`); re-verified: pattern inserts real
  editable columns + aside. (Only a live editor caught this — invisible to every server-side gate.)
- **Aside media capped** (170px object-fit) so an empty/large image doesn't dominate (render.php + editor.css).
- **✅ CLOSED 2026-07-25 PM — editor-canvas preset preview WORKS** + the two follow-on findings are now BOTH FIXED
  (D382). (a) the 4 other blocks with the broken style-handle ref (content-collection/google-reviews/product-card/
  trustpilot-reviews) were fixed + verified no-regression (commit `c3524de8`); (b) `build-deploy.py` now
  auto-bumps the CSS epoch (`touch sgs-blocks.php` + clear `uploads/sgs-css/*.css` on every deploy — epoch-bump
  proven, commit `dbda2976`). All merged to main.

**⭐ Your next session — Spec 36 mega CORE is DONE (both surfaces, all findings closed). Pick the next Spec-36 front.**
The mega preset rendering is complete + merged to main. Two candidate fronts — Bean steers:
1. **(prerequisite for the composed nav test) Basic new header (Spec 37) so the nav+mega can be composed.** Bean
   flagged the full composed-nav Gate 3 (mega inside a real nav in a header, open on hover/tap/keyboard + the live
   recursion test) as blocked until a basic version of the new header exists. If the priority is closing Spec 36's
   nav end-to-end, the basic header is the unlock. Spec 37 = `specs/37-HEADER-FOOTER-BUILDER.md`; live status +
   the per-row identity design/plan are in the co-active Track-2 next-session prompts already on main.
2. **DEFERRED mega follow-on (Spec 36 §0.5, declared NOT cut — STOP-29):** `media-cards`+`brands` variants, the 5
   motion effects (KEEP caret), night/day `dark` value-set, aside `feature`/`preview`, full manifest conformance,
   the true safe-triangle (CF-13 currently ships the 170ms bridge). Each maps to a named Spec-36 §0.5 stage.
Recommended: **do the basic header first (unblocks the composed nav Gate 3), then the mega §0.5 follow-on.** The
composed nav test itself: attach panel 1745 (populate it first — empty) to menu 100, put `sgs/nav-menu` on a page,
open the mega, run the LIVE recursion test (panel embedding a nav bound to its own menu → plain link, no loop).
Regression-safe (recursion guard + drawer byte-unchanged this session) but not re-run live.
**Cheap hardening worth doing (from D382):** a build gate asserting every `build/blocks/*/block.json` `file:`
style/editorStyle target actually EXISTS in the build dir — would have caught the whole D382 style-handle class.

**⚠ TOOLING FLAG:** `/sgs-wp-engine` is BLOCKED by its freshness gate (skill `db_schema_version: spec-31` vs DB
`spec-15-p1`) — its DB pointers may be stale. Worked from live DB + code instead this session. A `/lifecycle`
fix (re-index + review + bump the frontmatter) is owed. Also: the deploy oldshape-audit gate FALSE-POSITIVES on
`sgs/team-member` textAlign (a valid typography-support-injected attr, `verify-framework-injected-attrs-before-delete`)
— skipped with `--skip-oldshape-audit` for this deploy; someone owning team-member should baseline or fix the gate.

**Latent + open (unchanged, not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) ·
two unnamed `<main>` landmarks (framework `landmark-unique`/`region` axe) · `minmax()` guard absent · both sites
GENERIC proof headers (sandybrown #1570/#1571; palestine-lives #360, admin "Clear active" restores) · FR-37-36.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main` (2026-07-24; a co-active Spec-31/35 track commits between handoffs, so real HEAD is
  likely higher — re-check with `git log -1`). **D-ceiling: D378.** THIS session was DESIGN/SPEC only (no
  code): the mega-menu BUILD-SPEC + strategic plan + council/fact-check/qc-council pass — committed as the
  handoff `docs(mega, D378)` commit (path-scoped: the 2 plan docs + LEDGER/next-session-prompt/decisions/parking).
  Prior shipped D374–D377 (header/footer): `43cabf68`+`a89e54e0`, `62ee4acb`→`98e32cd0`→`614fa890` — verify
  with `git log`, never a cached hash.
  ⚠ **Shared branch** — a co-active Spec-35/31 track commits between handoffs (its WIP stays uncommitted).
  Run `git log -1 --format=%h` for the real HEAD; verify D-ceiling with
  `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`; re-check the branch in the SAME
  command as any commit (STOP-RECHECK-BRANCH). **Gate note:** both icon-list commits used `--no-verify`
  (the visual-diff gate's OWN sanctioned bypass for logic-predominant changes — STOP-VISUAL-DIFF-GATE-
  NO-VERIFY-FOR-LOGIC), path-scoped, deployed via an isolated worktree at the commit so the co-active
  `lucide-icons.php` WIP stayed out; checksum-verified local↔server. The co-active `sgs/tabs` db-consistency
  finding is still RED in the shared prebuild (not ours). **Uncommitted tree = co-active track's**
  (`lucide-icons.php`, `behavioural-analyser/*`, `sgs-update-v2.py`, `phase4-*.txt`, `mistakes.md`,
  `next-session-prompt-spec35*`) — do NOT commit.
- **Canonical spec:** `specs/31-UNIVERSAL-CLONING-PIPELINE.md` — the standing governing spec for cloning-pipeline work; read IN FULL each cloning session.
  For the header/footer/nav front: **`specs/36-SGS-NAVIGATION-SYSTEM.md`** (the canonical nav home) + `specs/37-HEADER-FOOTER-BUILDER.md`.
  ⛔ **DELETED specs — never cite:** `34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` (P2.5 Phase 6 → Spec 36) and
  **`17-HEADER-FOOTER-ARCHITECTURE.md` (2026-07-21 → Spec 37**; coverage matrix:
  `reports/2026-07-21-spec17-to-spec37-coverage.md`).
- **Sites:** dev = palestine-lives.org (Indus). staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both **WP 7.0.2** (verified 2026-07-20 by `wp core version` over SSH on both — docs previously said 7.0.1).
- **Live DB counts (verified 2026-07-20, do NOT cache elsewhere):** 80 `sgs/*` blocks · 2,817 `block_attributes`
  · 103 `slots` · 29 `roles`. Query `/sgs-db` rather than trusting any prose figure, including this one.
- **Verify every session (no cached line is authoritative):**
  - `git log -1 --stat` + `git status` + `git branch --show-current`
  - D-ceiling: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  - Framework counts: `/sgs-db` or `/wp-blocks` (the DB is authoritative; counts are NOT in prose)
  - Commit by EXACT PATH, never `git add -A`. `main` is the source of truth. Re-check the
    branch in the SAME command as the commit (STOP-RECHECK-BRANCH).

---

## Setup-simplification track (the meta plan) — CLOSED

Plan: `plans/archive/2026-07-16-setup-simplification-and-protocol.md` — **fully executed
(P0–P6) and ARCHIVED 2026-07-17.** Historical reference only. All 7 phases done and live on
`main`: P0–P2 culls + archive-with-redirect · P3proj project enforcement (`spec-drift-commit-gate.py`
wired, f5 machine-evidence converter guard) · P4 the 3-doc collapse into this LEDGER +
`STOP-CATALOGUE.md` + the `ledger-rotate.py` Stop hook · P3glob 3 global hooks (machine-evidence
sgs-selfreport, `baseline-update-gate.py`, handoff uncommitted-work warn) · P5 agent + skills
refresh + WCAG 2.1 AA baseline (incl. the LEAN-RULER pivot and the `reasoning-skill-judge`) ·
P6 global CLAUDE.md 276→51 lines + 2 new commit gates.

**Full per-phase detail** (it ran to ~20KB and was crowding this ledger out):
`memory/session-2026-07-17-p5-skills-lean-ruler.md` + the archived plan + `~/.claude` commits
`394a671` / `0a96908` / `f225c01` / `fd63ccc`.

**Two durability caveats still standing:** `~/.agents` is NOT a git repo, so the skillscore
script + the 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED (recovery = per-file
`.bak-2026-07-17-*`); and the `lifecycle-gate-stop.py` unwire is done locally but NOT yet
committed to the `~/.claude` repo.

**Stray thread CLOSED 2026-07-17 (was the last incomplete non-P6 item, plan §3.5):** the `lifecycle-gate-stop.py` no-op stub was **unwired from `~/.claude/settings.json` + the stub file deleted** (JSON re-validated; wiring hits = 0). Global CLAUDE.md doc-drift fixed (2 refs now say "unwired+deleted"). Also reworded the phantom `seo-geo` refs in `seo-technical.md` + `wp-sgs-developer.md` to make explicit it is the `/seo-geo` **skill**, not an agent. Backup: `~/.claude/settings.json.bak-2026-07-17-preLifecycleUnwire`. NOT yet committed to the `~/.claude` repo (offer stands).

**The go-forward protocol (plan §5) — captured as a lesson:** (1) one ledger, Stop-rotated;
(2) structural gates over prose; (3) done = machine evidence; (4) minimal always-on context
(≤80-line cap on the GLOBAL CLAUDE.md only); (5) clean folders; (6) docs gated like code;
(7) verify contents not filenames; (8) protect architecture, cull description.

---

## Product queue (the website-builder work — reconcile before acting, some is already live)

**Indus "Our Brands" clone fidelity — DONE 2026-07-17 (D343, live-verified).** Matched to the
reference at hero-grade via computed-CSS extraction. Shipped: NEW `sgs/separator` block (its
replaces-table entry REVERTED pending the migration pairing — task A below), brand-strip tile
controls, the WP `border-width` var-name-collision fix (STOP-WP-STYLE-SUBSTRING-COLLISION), a
framework letter-spacing fix, NEW `extract-css-diff.js` (the standard extract-and-diff tool,
`--why` = CDP provenance), NEW theme-CSS hardcode lint. Detail: `decisions.md` D343.

**Indus next-session tasks (Bean-directed 2026-07-17, ties to Track C + the replaces table):**
- **A — core→SGS migration (the "I thought all core blocks were already SGS" item).** Atomic unit:
  (1) **build the `sgs/separator` migration pairing** — `migrate-core-blocks/pairings/separator_pairing.py`
  does NOT exist (follow heading_pairing.py/image_pairing.py); (2) **re-add** `sgs/separator`→`core/separator`
  to `block-replacements.json` + `/sgs-update` (this session reverted it — `49e6fc4f` — because it
  build-blocked with no pairing); (3) **migrate the 4 theme patterns still using core/separator**
  (`footer-centred`, `footer-columns`, `mega-menu-split-info-cta`, `pricing-columns`) — `check-no-core-blocks`
  will pass once done; (4) **page 13**: convert the "Our Brands" band `core/group` → `sgs/container`
  (already has `verticalAlign`/`justifyContent`/stack — use `verticalAlign:center`, drop the padding fudge)
  + audit page 13 for all remaining replaceable core blocks (`core/heading`, `core/columns`, …) and migrate.
- **B — wire `lint-theme-css-hardcodes.py` into prebuild** (currently runnable but not gated).
- **C — deferred:** Services-section 768 overflow (hardcoded `139/250/123/187=771px` columns →
  responsive `fr`); Services button-border decision; Task-2 detection-method brainstorm (the
  extractor is the core of it — decide if it becomes a standard pre-close gate).

**Earlier, both superseded (detail in `decisions.md` D341/D342 + `memory/session-2026-07-1*.md`):** the
2026-07-16 nav/logo fixes + Track C core→SGS migration (395→0 replaceable core blocks), and the 2026-07-17
drawer polish — both absorbed by the Spec 36 rebuild.

2. **~~Phase 3 — finish Spec 34~~ — STRUCK 2026-07-20 (stale).** Spec 34 was DELETED in P2.5 Phase 6, absorbed
   into **Spec 36**. Drawer settings shipped in `sgs/nav-drawer`; the live-QC gate is now FR-36-16 / Gate-1,
   **PASSED**. ~~Genuinely still open: prove the Site-Editor→frontend round trip for the FOOTER~~ —
   ⚠ **MIS-SCOPED TASK — the inherited wording tested the route P2 REJECTED. Corrected below.**
   **Bean, 2026-07-21:** header + footer are to be edited in dedicated Header/Footer editor pages in
   the admin sidebar, backed by CPTs, following the `sgs_mega_menu` CPT pattern (D353) — **not the
   Site Editor**. This is P2 §2.1/§2.2 verbatim ("the EDITING HOME is a CPT admin screen, not the Site
   Editor"), and §2.2 **explicitly REJECTS the dual-home option** (edit in both) because "WP has no
   native CPT↔template-part sync". The Site-Editor round trip proven below is therefore the LEGACY
   route, not the target. It is retained only because it documents the DB-override-outranks-theme-file
   behaviour that the CPT migration has to reckon with.
   **What actually exists vs what P2 designed (verified 2026-07-21, not assumed):**
   - BUILT: `sgs_header`/`sgs_footer` CPTs + "Advanced Headers"/"Advanced Footers" admin submenus
     (`class-sgs-block-cpts.php`, Spec 17 FR-S3-4); the `Sgs_Header_Rules` display-conditions engine.
     The mega-menu CPT submenu docblock says it "mirrors `Sgs_Block_CPTs::register_submenus()`" — the
     two already follow one pattern, as Bean said.
   - NOT BUILT (P2 §2.2): the "Set as active header" action writing `wp_options['sgs_active_header_cpt_id']`;
     the early `if ( get_option(...) )` branch in `Sgs_Header_Rules::filter_template_part()` before
     `evaluate()`; that branch's own re-entrancy guard; re-applying `sgs_header_rule_resolved` on the
     fast path (skip it and sticky/transparent/shrink silently stop working); the "Active" badge column.
   - **🔴 CONFIRMED BUG (P2 listed it as "unverified as a live bug" — now proven by code inspection):**
     a CPT-targeted header/footer rule **silently falls back to the theme default on the frontend**.
     Chain: CPT patterns register on **`admin_init` only** (`class-sgs-block-cpts.php:55`) → the rules
     engine resolves on **`pre_render_block`**, a frontend hook (`class-sgs-header-rules.php:51`) →
     `render_pattern()` looks up `WP_Block_Patterns_Registry::get_registered($slug)` (`:329`) → the
     pattern was never registered on that request → returns `null` (`:330-331`) → `filter_template_part`
     returns `$pre` unchanged → theme template part renders instead. **No error, no warning** — the
     D338 silent-failure class. P2's named first-P3 task ("create a CPT header, add a rule, hit the
     frontend cold, confirm") is the live confirmation; the static chain above already shows the
     mechanism. Fix per P2 §2.2 = the `cpt:{post_id}` direct-render branch (`do_blocks()` + re-apply
     the filter), which is correct by construction and does not depend on pattern registration at all.
   **The Site-Editor round trip (legacy route) — PROVEN 2026-07-21 on the sandybrown canary:**
   - **The "wired differently" concern was REAL and is now resolved.** `parts/header.html` contains blocks
     directly; `parts/footer.html` is a single `<!-- wp:pattern {"slug":"sgs/framework-footer-default"} /-->`
     reference (61 bytes). The open risk was whether a Site Editor edit survives, or is discarded when the
     pattern re-expands at render. **It survives:** WP EXPANDS the pattern on load into real blocks
     (`getBlocks()` → `sgs/site-footer` + 2 × `sgs/site-footer-row`, 20 blocks; `hasPatternBlock: false`),
     so the save writes real blocks, not a pattern reference.
   - **Evidence chain (fail-closed at each step):** baseline HTTP 200 / 139,969 bytes with the marker
     provably ABSENT → edited a heading in the Site Editor → saved via the real UI Save button
     (`isEditedPostDirty()` true → false) → live cache-busted fetch shows the marker INSIDE
     `<footer class="wp-block-template-part">`, footer text `"Quick Links SGS-ROUNDTRIP-PROOF-20260721"`.
     Reverted by DELETEing the override; `source` back to `theme`, footer text **byte-identical to baseline**.
   - **⚠ The acceptance wording "appears on the live frontend AFTER DEPLOY" was wrong and is corrected here:
     NO deploy is involved.** A Site Editor edit writes a `wp_template_part` DB record whose `source` flips
     `theme` → `custom`, and it renders immediately. Deploy only ships theme FILES — which the DB override
     then outranks. Anyone waiting for a deploy to see a Site Editor change is measuring the wrong pipeline.
   - **Measurement trap recorded:** `<footer>` is a generic element — the page has 5, of which 4 are
     `sgs-quote__attribution` / `sgs-testimonial__footer`. A naive `<footer.*?</footer>` regex grabs a
     testimonial's 98-byte attribution and reads `"© Zainab, Founder of Mama's Munches"`. The site footer is
     the LAST one, `<footer class="wp-block-template-part">`, 6,688 bytes. Key the assertion on the CLASS.
3. **Step 1 — SPLIT framework vs per-site header/footer.** Move/delete
   ~~`theme/sgs-theme/patterns/footer-indus-foods.php`~~ **DELETED 2026-07-22 (`94ab240f`)** (was the only client-named framework
   pattern; leaks "Indus Foods Footer" + a hardcoded Google Place CID to every install);
   decide the per-site channel (JSON snapshot vs REST); gitignore per-site files. Do this
   BEFORE Goals 4/1 so they write to the per-site channel.
4. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`):
   fix its 2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns;
   maps the hamburger to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/nav-menu` + `sgs/nav-drawer` (adaptive-nav is also deleted now — D362).
   Bean's heading-specific eye pass (R-31-13) lands here.
5. **Goal 1 — replicate the Indus header/footer.** BASELINE = the preserved hand-built
   Astra/Spectra site https://lightsalmon-tarsier-683012.hostingersite.com/ (NOT the
   `mockups/*.html`). Capture it AS A FILE FIRST (`reports/visual-diff/header-footer-baseline-indus.json`).
   Open defects: logo mobile-tier switch (confirm the D341 `custom` mode covers it); buttons/rows/bg
   not preserved; sticky+shrinking header; mega-menu shows on mobile+desktop. NEW:
   `P-INDUS-BRANDSTRIP-OVERFLOW-9PX` (width-independent 9px overflow, source = `sgs-brand-strip` marquee).
6. **Goal 3 — de-hardcode base blocks.** `site-header/edit.js` + `site-footer/edit.js`
   TEMPLATEs + row blocks — remove the content hardcoded into them (NOT "empty containers").
   REMOVE the `Quick Links`/`Contact`/`Opening Hours` heading blocks from
   `framework-footer-default` (rich versions exist as opt-in patterns). Does NOT overlap Track C.

**Open reconciliation:** Track B (`feat/track-b-content-restore`, Indus page content) stayed
unmerged/paused — check its branch state before touching its files.

---

## Active tracks (parallel — SHARED WORKTREE, commit path-scoped only)

- **Track 1 — Indus / product / inline-zero rollout** (the front in `next-session-prompt.md`; co-active). Product queue below.
- **Track 1b — Spec 35 block-inspector-UX** (prompt: `next-session-prompt-spec35.md` — the `-spec35-track1.md` file was deleted; pointer corrected 2026-07-22; co-active). **2026-07-21: cluster/element VOCABULARY REWORK shipped** — 3 clusters → 5 (D354/D355), ELEMENT is now the primary mapping axis and `flow` was built-then-reversed the same day; coverage validator (unclustered = error), orphan detection, and the `layer` field (OUTER/CONTENT/GRID/GRID_AREA, shared with the converter, declarative only). Rollout wave 1 = 20 blocks. **2026-07-25/26 update:** FR-35-1..6 ALL BUILT + rolled out (74/74 in-scope manifested); the box-flat GENUINE-UPGRADE set is now COMPLETE (D383 A1+A2 box-object — grid-item ×4 + product-card CTA — landed 2026-07-26; card-grid last session). **Live 2026-07-26: OK 1129 | GAP 2805 | ORPHAN 104 | style-defect 0** (re-run `check-element-manifest-conformance.js` for today's figure — never quote cached). **⚠ 2026-07-26 — the "2805-GAP no-inline wave" front is a PHANTOM (debunked by an 11-condition DONE audit).** The GAP count is semantic noise, NOT work: even 100%-DONE exemplars carry 23–151 gaps (object-fit on a button etc.). The Spec-32 no-inline programme is **effectively COMPLETE** — 0 inline-via-render sites, 0 enabled supports lacking skip-serialization, 0 box-family violations, 0 dead controls across all accessible blocks. **Real remaining backlog = 5 block-fixes:** F3 hardcode drain on `content-collection`/`form`/`pricing-table`/`product-card` + a device-tier breakpoint fix on `feature-grid` (1024/768→1023/767). Full matrix + debunk list + a separate Spec-35 inspector-quality layer (12 WARN): **`reports/2026-07-26-spec32-11-condition-done-audit.md`** (THIS is the trustworthy backlog — do NOT re-chase the GAP count). Canonical: `plans/block-migration-DONE-checklist.md` (11 conditions) + `plans/2026-07-26-A1-griditem-box-object-migration.md`.
- **Track 1c — Spec 31 converter completion** (prompt: `next-session-prompt-track1-converter.md`). **2026-07-22: completion wave shipped — 11 commits.** Grounding found most of §12.6 ALREADY BUILT (spec lagged code). Landed: `::before/::after` overlay lift (B1 `5a7466cc`); **transform/filter/top/left un-excluded + hover-lift** (B3 `f8a4388e` — hover scale/zoom/grayscale on 15+ blocks was silently dropping; Bean-caught); F3 LANDED runtime + batch runner (C1a `51629e37`); **UNACCOUNTED 14->0** (C1b `321293a6` — the 14 were ACCOUNTING bugs in the D1 bucket/join, NOT converter drops; baseline now empty). 764+200+66 tests; **0 UNACCOUNTED**. **Next → Spec 31 100%: (1) deploy phase-f fixtures as canary pages [gating dep], (2) wire `check_landed()` (unwired on purpose — no live URLs = F5 fails for everyone), (3) 14 UNACCOUNTED → 0, (4) live verify + Bean's eye. THEN conformance-audit Spec 35 to 100% the same way.** Plan: `plans/2026-07-22-spec31-completion-to-100.md`. **2026-07-23 (D372–D373): declarative CSS-routing shipped — css_layer L1-L4 FULLY seeded (block.json `layer` field + name-convention fallback + leaf guard, authoritative reseed) + css_element normalised to `wrapper` (120 attrs/26 blocks); P3a base-resolver OUTER union (26 wrapper attrs recovered) + P4 declarative area resolver (+213 routes, −6 wrong, 3 conflicts fixed), qc-council-validated; product-card cta → box-object (last block off the axis pair — every block now box-object). Full `/sgs-update` ran (F6 green). 5 commits pushed. NEXT: deploy sandybrown for the live BoxControl check (BLOCKED on shared dirty tree — `P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`); then the pre-2026-07-23 phase-f/check_landed items above.**
- **Track 2 — Header/Footer/Nav FULL REBUILD** (2026-07-17). Roadmap: `plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` (6 phases). **P1 CLOSED (D344)** — verdict: BUILD, full clean rebuild, rich-but-simple, tiered tri-state, informational-only a11y (DP2a), converter-emittable by construction (DP6); decision doc `plans/2026-07-18-P1-architecture-decision-header-footer-nav.md`. **P2 (builder design-gate) CLOSED + signed off.** **P2.5 → Spec 36 signed off v2.1.** **Spec 36 Phase 1 CLOSED 2026-07-20** (see the summary at the top). **Next: Spec 36 Phase 2** — mega CPT + Indus + rich desktop/mobile modes.

## Standing programmes (parallel / deferred — not the active front)

- **No-inline styling roster — effectively COMPLETE (11-condition DONE audit, 2026-07-26).**
  The old "~52 blocks remaining" framing was the phantom GAP-count metric; the audit found 0
  inline sites / 0 unserialized supports / 0 box-family violations across accessible blocks.
  Real remaining = 5 block-fixes (`reports/2026-07-26-spec32-11-condition-done-audit.md`).
  Hard architecture SETTLED (mechanism, D294 pattern selector, grid-scoping). Reusable LANDED
  harness: `plugins/sgs-blocks/scripts/no-inline-land-verify.js`. Canonical: Spec 31
  §3.A/§13.4/§13.6 + Spec 32 §6.1 + the DONE-checklist + the migration-contract plan.
- **WooCommerce layer (Spec 30) — COMPLETE + merged (D220).** Deferred roadmap → parking.md.
- **Cloning pipeline (L1–L4 cascade / L4 per-area extraction) — DONE (D290).** No longer active.

---

## Pointers

| For | Read |
|---|---|
| Hook off-switches (turn off a nagging/blocking guard-rail) | `.claude/secrets/hook-off-switches.md` (gitignored operator cheat-sheet, P3glob) |
| Structural defences (STOP catalogue + pre-flight ritual) | **`STOP-CATALOGUE.md`** (uncapped, D101) |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative (swept from the old handoff/state) | `memory/session-YYYY-MM-DD.md` + `memory/state-archive.md` |
| Governing cloning spec | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each cloning session) |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` (computed-parity, Stage 11.6) |
| Build / deploy / SSH / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) |
| Goals + exit criteria | `goals.md` |

## Blockers

None block the next session. Known-open items are the numbered Product queue + parking.md.
