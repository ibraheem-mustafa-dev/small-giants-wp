---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-26
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

- **Spec 36 Phase 1 — CLOSED 2026-07-20, all Gate-1 evidence green** (drawer axe 0 · elementFromPoint 20/20 · crawl PASS with JS off · Bean's eye PASSED · D340 bounce PASSED on a real desktop browser). Built: shared `store('sgs/nav')`, `sgs/nav-menu`, `sgs/nav-drawer`, FR-36-1 classic-menu resolver (D352). Three bugs found + fixed live (D351). Detail: `memory/session-2026-07-20-11-spec36-phase1-close.md`.
- **`sgs/adaptive-nav` is DELETED (FR-37-21 / D362, `23a3cf63`)** — the old "stays registered as the rollback path" note is SUPERSEDED. Rollback is now git history only.

**Prior sessions (swept 2026-07-21, verbatim):** the Spec 35 inspector-UX rollout (2026-07-19/20) and the 2026-07-17 orientation block now live in `memory/session-2026-07-21-ledger-sweep.md`. Track 1b's live status is in **Active tracks** below.

**⭐ CURRENT (2026-07-27 — mega DEFERRED follow-on shipped + deployed to canary; motion UNPROVEN.)**

- **Track 2 mega — the 5 DEFERRED items are BUILT, committed `db2b96d3`, pushed, deployed to sandybrown.**
  Bean un-deferred them this session (menu presented → "all five"). Shipped: media-cards + brands variants
  (+2 starter patterns) · dark value set · 5 motion effects (NEW `src/shared/effects/`, ONE shared rAF loop,
  framework-reusable) · mega-aside's real control surface (was ZERO attributes) · TRUE safe-triangle + bfcache reset.
- **⚠ MOTION IS NOT LIVE-VERIFIED. Do not treat it as done.** Canary panel **1745 is EMPTY**, so there is
  nothing for the stagger to reveal and no open panel to axe. Visual-diff reports are committed as
  **`verdict: INCOMPLETE` / `first_paint_capture_passed: false`** — deliberately NOT fabricated as PASS.
  The visual-diff commit gate was BYPASSED with the reason stated in full in `db2b96d3`'s message (circular
  dependency: gate needs a report → report needs live render → deploy needs a commit). **Bean's R-31-13
  sign-off NOT obtained.**
- **⭐ NEXT (unchanged, now gating): Gate 3 composed-nav.** Populate panel 1745, attach to menu 100, put
  `sgs/nav-menu` on a page. That single fixture unblocks ALL the owed verification at once: stagger firing,
  axe on an open panel, the indicator pill shape, dark scheme, both new variants rendering, the live
  recursion test.
- **THREE "built but inert" bugs caught pre-commit — every one passed `php -l`, eslint AND all prebuild gates:**
  (1) stagger observed a `hidden` attr the panel never carries → could never fire (now observes the trigger's
  `aria-expanded`; validated against live served DOM); (2) indicator used `scaleX` on a radius-bearing 1px box
  → corners stretched ~120× (now animates `width`, scoped out-of-flow exception); (3) 2 new patterns with NO
  theme version bump → WP caches the pattern list, so both variants would have been **uninsertable**
  (1.5.46→1.5.47; **verified live: 5 mega patterns register, was 3**).
- **FOLLOW-ON FIXES - ALL RESOLVED 2026-07-27 (commit `9f8a6437`):**
  - **`sgs/table-of-contents` rendered COMPLETELY UNSTYLED - FIXED.** `index.js` imported neither `style.css`
    nor `editor.css`, so webpack compiled neither, so `block.json`'s `file:./style-index.css` +
    `file:./index.css` pointed at non-existent files and WP silently enqueued NOTHING. 5th instance of the
    D382 class. Now builds 2,386 B + 2,953 B.
  - **NEW PERMANENT GATE `scripts/check-block-asset-targets.js` - BUILT + WIRED.** Resolves every `file:`
    reference (string OR array) in every compiled `block.json` against real build output. 81 blocks, 0
    failures. **Negative control independently re-run: it genuinely fails (exit 1) on a corrupted reference
    and returns to 0 on restore - not a vacuous gate.** Wired to **`postbuild`, NOT `prebuild`** - `prebuild`
    runs `clean:build` which deletes `build/`, so the gate could only ever false-fail there. (The dispatch
    said prebuild; the agent worked out it was wrong and explained why. Verified: `prebuild` does contain
    `clean:build`.)
  - **`hoverStyle` JSON `enum` - REMOVED,** PHP `in_array(..., true)` validation added mirroring
    `indicatorStyle`. The value reaches the scoped `<style>`, so this is also a security boundary. All 3
    valid values behave identically to before.
  - **`supports.interactivity` (36 viewScriptModule vs 9 declaring) - INVESTIGATED, SETTLED, DO NOT
    RE-INVESTIGATE.** Verdict: **harmless inconsistency today; a real but DORMANT gap.** Evidence from WP core
    source (`WP_Block::render()`): the flag's ONLY runtime effect is electing a "root interactive block" whose
    HTML gets passed to `wp_interactivity_process_directives()`. Safe here because **(a)** render.php already
    writes the correct literal initial value beside every directive (`aria-expanded="false"` next to
    `data-wp-bind--aria-expanded` - verified in source AND in the live served HTML), so the pre-hydration
    paint is right; **(b)** ZERO blocks use `data-wp-each`, the one directive needing SSR/CSR expansion to
    avoid an empty first paint; **(c)** the client runtime hydrates from `viewScriptModule` and is NOT gated
    by this PHP flag; **(d)** `clientNavigation` is consumed only by `@wordpress/interactivity-router`, and
    the repo has ZERO router usage. Origin: an incomplete 2026-03-10 "QA remediation batch 1" pass, not an
    architectural choice. **Action: add it opportunistically next time nav-menu/nav-drawer are touched for
    something else - never as a standalone task. RE-OPEN ONLY IF the framework adopts Interactivity-Router
    client-side navigation**, at which point every block missing it silently breaks that feature, with no
    error surfaced.
  - **NOTE: the canary is now BEHIND `main`** - it was deployed before the ToC + hoverStyle fixes. Redeploy
    before the next verification pass or you measure stale code.
- **DOC CORRECTIONS - DONE 2026-07-27 (`9f8a6437`), verified by `/qc-inline` BEFORE editing:**
  - **Spec 36 6a "mega-panel presets" row was FALSE ON THREE COUNTS - CORRECTED.** It claimed the frontend
    "works by construction" (it was broken too), blamed WP 7.0's iframed editor canvas for ignoring
    `editor.css`, and prescribed a "PROVEN FIX (not yet landed)". `git show b5f2ee02` (D382) proves the real
    causes were (1) self-nested selectors that broke BOTH surfaces and (2) `block.json` naming SOURCE
    filenames so WP enqueued nothing anywhere. Row replaced with the verified causes + an explicit retraction
    so nobody re-applies the phantom fix.
  - **BUILD-SPEC 4's 4th dark-cascade rule CONTRADICTED binding CF-7 - REMOVED** with a do-not-reinstate
    note. It would have let `auto` follow the visitor's OS preference with no site switcher; CF-7 forbids
    exactly that, and 0.5 supersedes 1-10 on conflict. It was never built.
  - **RETRACTED - MY OWN CLAIM WAS WRONG, no edit made.** I recorded that Spec 36 FR-36-5 overstates a
    Kadence Pro accessibility claim. Verifying BEFORE editing proved otherwise: FR-36-5 makes a product
    REPLACEMENT claim about Kadence and confines its ACCESSIBILITY claims to Max Mega Menu, which the
    research independently supports. **The doc was right; I would have corrected it into being wrong.**
    Lesson: verify a doc is lying before you fix it - the same discipline applied to subagent findings.
- **Standards re-validated 2026-07-27 (no pinned spec value needed changing):** safe-triangle still current
  (floating-ui ships `safePolygon`; PrimeVue #8448 open since Feb 2026) · 300ms hover-open backed by Baymard
  (300–500ms) · the transform/opacity-only ban still correct for 2026 (animated `backdrop-filter` still spikes
  GPU in current Chrome) · 170ms close-grace has NO evidence base but is now backstopped by the real triangle.

**⭐ ALSO CURRENT (2026-07-27, Track 2b — separate session, co-active with the mega work above.)**

- **A defect that silently corrupted 15 of 16 header/footer STARTER PATTERNS is FIXED (D393, `ae9b1db4`).**
  `templateLock:'all'` makes WP re-apply a container's OWN template on EVERY mount — not only when empty
  (core: `shouldApplyTemplate = length===0 || lock==='all' || lock==='contentOnly'`) — and
  `synchronizeBlocksWithTemplate` then matches rows by **ARRAY POSITION + name only**; `rowSlot` is never
  consulted. It **DESTROYED content**, not just added it (header-search-bar-below lost its search bar;
  footer-centred lost its copyright line) and produced duplicate `rowSlot` values §3.3a called impossible.
  Fix = pass the template only into a genuinely EMPTY container; the lock is unchanged. Measured 15/16
  corrupt → **0/16**, raw-insert seeding intact, and the row-reorder lock still REFUSES a real
  `moveBlockToPosition` (behavioural, not inferred). **It fired on every re-open too** — the inherited
  "re-opening is safe" result was a property of the FIXTURE (CPT 1570 is already template-shaped), not the
  mechanism, so an insert-only patch would not have held.
- **⚠ D377's picker verification is RETRO-INVALIDATED.** It banked the starter picker as live-verified
  because the saved post carried the right `metadata.patternName` — it did, while the tree BENEATH it had
  been rewritten. **A pattern verified by its METADATA is not verified by its CHILDREN.** Anything else
  banked on metadata-only evidence deserves a second look.
- **A second, unrelated latent fatal surfaced and is FIXED (D394, `46749091`).** `sgs/responsive-logo`
  called two shared helpers with NO `require_once` — the ONLY such render.php of 81 (swept). ORDER-DEPENDENT:
  fine when a sibling block loaded the helper first, **HTTP 500 rendered alone** (6/6 isolated renders). It
  hid because the canary's active header has no logo — but **the immutable default header (FR-37-4) does**,
  so clearing the active header could have white-screened a site. Pre-existing; surfaced, not caused.
- **FR-37-41 preview-before-active BUILT (D395, `20ec422c`) — closes residual B2.** "Preview on site" row
  action renders an unpublished layout on the real homepage for a capable, nonce-bearing user. Overrides
  `get_active_id()` (NOT `render_active()`) so the BEHAVIOUR resolver previews too — proven: previewing 1655
  emits `sgs-header-behaviour-hide-on-scroll-down` while active 1570 emits none. 4 negative controls incl.
  anonymous-with-a-valid-URL and a cross-post replayed nonce. No write path. **Bean DROPPED the no-login
  shareable preview link** (test site or the client has an account) — a decision, not a deferral.
- **Track prompt: `next-session-prompt-spec37.md`** (this track owns that file; `next-session-prompt.md` is
  the co-active track's). Detail: `decisions.md` D393–D395 + Spec 37 §3.3a / FR-37-41 / §5.
- ⚠ **This file is 30KB, over the 24,576-byte cap** — both tracks appended today. A sweep of the older
  CURRENT blocks to pointers is owed at the next handoff by whichever track gets there first.

**Prior CURRENT (2026-07-26) - swept to a pointer 2026-07-27 to hold this file under its 24,576-byte cap.**
Two tracks closed that day, both DONE with no live front: **Track 2b** (Spec 37 per-row header/footer,
FR-37-40 - per-row `position:sticky` REJECTED as a short-parent trap; sticky stays HEADER-level, a hidden row
COLLAPSES to height 0, gap 0.00 unrounded at all 3 tiers; the unconditional `scroll-padding-top` defect fixed
by gating the publisher on MEASURED computed position - it had reserved 93px desktop / 252px mobile on every
non-sticky page) and **Track 1b** (Spec-32 no-inline rollout - the "2805-GAP Wave B" front was a PHANTOM;
GAP count is semantic noise, and the real 5-fix backlog landed). Full detail: `decisions.md` D385-D392 +
`.claude/reports/2026-07-26-spec32-11-condition-done-audit.md` + the Active-tracks entries below (both
verified present before trimming). Still parked, NOT ours: `P-CONFORMANCE-GOLDEN-DRIFT` (27 stale goldens -
blind re-seed forbidden) + `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

**Prior sessions, swept to pointers 2026-07-26 (this handoff) — the LEDGER was 38.7KB against a 24.5KB cap and its own note flagged this trim as owed:**
- **Track 2 mega-menu (2026-07-25, `b5f2ee02` + `c3524de8` + `dbda2976`) — COMPLETE on both surfaces, all findings closed.** Two stacked bugs: render.php self-nested its per-`style` selectors (so columns/cards/minimal never rendered on the FRONT end either), and block.json named the SOURCE stylesheet filenames so WP silently enqueued nothing — the earlier "WP 7.0 iframe ignores editorStyle" diagnosis was WRONG. Both fixed; the same block.json bug was swept from 4 other blocks; `build-deploy.py` now auto-bumps the CSS epoch. **Full detail: `decisions.md` D382 + `memory/session-2026-07-2*.md` (both verified present before this trim).**
- **Mega CORE (`19bafc9e`) + INTERACTIVE Gate 2 (`bcc8a367`/`e5f70680`/`62361a1e`/`eb3f200c`)** — 3 new blocks (`sgs/mega-panel`/`mega-group`/`mega-aside`), `store('sgs/mega')`, U9 nav wiring, 3 CPT starter patterns, native "Choose a pattern" picker live-verified. CF-6 corrected (Bean-directed): the panel is `templateLock:false` + `allowedBlocks`, NOT `contentOnly` (which hid the child settings a client needs). Detail: D377/D378/D382 + memory.
- **Converter self-nest guard + transparent-wrapper dissolve (2026-07-25, PR #24 -> main)** — closed `P-QUOTE-PATH2-SELF-NESTING` (10 blocks latent) and uncovered a silent content-drop in tabs/feature-grid/form-step/modal. 566+14 tests green. Detail: D381.

**Fixtures left on the canary (do not assume they are clean):** mega page **1762**, panel **1745** (empty), menu **100**, item **1746**; header CPT **1570**, footer CPT **1654**.

**⭐ Next Spec-36 front (unchanged by this handoff):** the composed nav Gate 3 — mega inside a real nav in a header, opened on hover/tap/keyboard, plus the live recursion test — is **unblocked now that Spec 37's header work is done**. Populate panel 1745 first (it is empty), attach it to menu 100, put `sgs/nav-menu` on a page, run the recursion test. Alternative: the DEFERRED mega §0.5 follow-on (media-cards/brands variants, 5 motion effects, dark value-set, aside feature/preview, true safe-triangle). **Cheap hardening worth doing (D382):** a build gate asserting every `build/blocks/*/block.json` `file:` style target actually EXISTS in the build dir — it would have caught the whole style-handle class.

**Latent + open (unchanged, not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) ·
two unnamed `<main>` landmarks (framework `landmark-unique`/`region` axe) · `minmax()` guard absent · both sites
GENERIC proof headers (sandybrown #1570/#1571; palestine-lives #360, admin "Clear active" restores) · FR-37-36.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main` (2026-07-26; a co-active Spec-31/35 track commits between handoffs, so real HEAD is
  likely higher — re-check with `git log -1`).
  **D-ceiling: D397** (verify with the grep below, never this line — it moved from D395 to D397 mid-handoff
  as the co-active track committed). Track 2b on 2026-07-27 shipped
  `ae9b1db4` (D393 starter corruption) + `46749091` (D394 responsive-logo fatal) + `20ec422c` (D395 /
  FR-37-41 preview-before-active) + docs `36c8fd3f` / `5edc39cc` / `53bb40b7`. Prior (2026-07-26) Track 2b
  FR-37-40: `5716f7b7` (scroll-padding gate, D391) + `494e5d50` (collapse-when-pinned + ancestor guard,
  D392) + docs `4ba0cbbd` / `a2d6af96` / `e698ec7a`. Prior same-day Track-1b: `3e98861b` `6adc932f`
  `33272bd3` `23d27246` (D385). Verify with `git log`, never a cached hash.
  ⚠ **Shared branch** — a co-active Spec-35/31 track commits between handoffs (its WIP stays uncommitted).
  Run `git log -1 --format=%h` for the real HEAD; verify D-ceiling with
  `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`; re-check the branch in the SAME
  command as any commit (STOP-RECHECK-BRANCH). **Uncommitted tree = the co-active track's**
  (`lucide-icons.php`, `.claude/next-session-prompt.md`, `reports/inline-styling-audit-*`,
  `.claude/memory/session-2026-07-2*.md`, the deleted `next-session-prompt-nav-rework-P2.5.md`)
  — do NOT commit those.
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

## Setup-simplification track (the meta plan) - CLOSED, archived

Fully executed P0-P6 and ARCHIVED 2026-07-17; historical only. Plan: `plans/archive/2026-07-16-setup-simplification-and-protocol.md`. Per-phase detail: `memory/session-2026-07-17-p5-skills-lean-ruler.md` + `~/.claude` commits `394a671`/`0a96908`/`f225c01`/`fd63ccc`.

**Two durability caveats still standing:** `~/.agents` is NOT a git repo, so the skillscore script + 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED (recovery = per-file `.bak-2026-07-17-*`); and the `lifecycle-gate-stop.py` unwire is done locally but NOT committed to the `~/.claude` repo.

**Go-forward protocol (captured as a lesson):** one ledger, Stop-rotated; structural gates over prose; done = machine evidence; minimal always-on context; clean folders; docs gated like code; verify contents not filenames; protect architecture, cull description.

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

2. **~~Phase 3 - finish Spec 34~~ - STRUCK (stale): Spec 34 was DELETED into Spec 36.** The inherited task also MIS-SCOPED the editing home: **Bean, 2026-07-21 - header/footer are edited in dedicated CPT admin screens (the `sgs_mega_menu` pattern, D353), NOT the Site Editor**; P2 §2.2 explicitly REJECTED the dual-home option (WP has no native CPT<->template-part sync). The Site-Editor round trip was proven on the canary but is the **LEGACY** route, and no deploy is involved - a Site Editor edit writes a `wp_template_part` DB record whose `source` flips `theme`->`custom` and renders immediately; deploy only ships theme FILES, which the DB override then outranks.
   **Two load-bearing findings kept from that block:**
   - **CONFIRMED BUG (by code inspection):** CPT patterns register on **`admin_init` only** (`class-sgs-block-cpts.php:55`) while the rules engine resolves on **`pre_render_block`**, a frontend hook - so `render_pattern()` finds nothing registered, returns `null`, and a CPT-targeted header/footer rule **silently falls back to the theme default on the frontend**. The D338 silent-failure class. Fix per P2 §2.2 = the `cpt:{post_id}` direct-render branch (`do_blocks()` + re-apply `sgs_header_rule_resolved`), correct by construction and independent of pattern registration. NOT BUILT: the "Set as active" option write, the early `get_option` branch + its re-entrancy guard, the Active badge column.
   - **Measurement trap:** `<footer>` is generic - the canary page has 5, of which 4 are `sgs-quote__attribution` / `sgs-testimonial__footer`. A naive `<footer.*?</footer>` regex grabs a 98-byte testimonial attribution. The site footer is the LAST one, `<footer class="wp-block-template-part">`. **Key the assertion on the CLASS.**
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
- **Track 1b — Spec 35 block-inspector-UX + Spec 32 no-inline — CLOSED 2026-07-26 (D385).** Its track prompt was deleted at close; there is no live Track-1b front. Spec 35 FR-35-1..6 all built + rolled out (74/74 in-scope manifested); box-flat genuine-upgrade set COMPLETE (D383). Spec 32 no-inline COMPLETE + re-verified — the GAP metric is semantic noise, not work-remaining. **Only open residual: an inspector-QUALITY layer (12 WARN in `audit-inspector-conformance.js` — 10 raw-url-link controls that should be `SgsLinkControl`, 1 missing MediaUploadCheck, 1 reduced-motion gap)** — a future Spec-35 session. Canonical: `plans/block-migration-DONE-checklist.md` + Spec 32 §6.1; audit: `.claude/reports/2026-07-26-spec32-11-condition-done-audit.md`.
- **Track 1c — Spec 31 converter completion** (prompt: `next-session-prompt-track1-converter.md`). 2026-07-22 completion wave shipped (11 commits): `::before/::after` overlay lift, transform/filter/top/left un-excluded + hover-lift (Bean-caught: hover scale/zoom/grayscale on 15+ blocks was silently dropping), F3 LANDED runtime + batch runner, **UNACCOUNTED 14->0** (they were ACCOUNTING bugs in the D1 bucket/join, not converter drops). 2026-07-23 (D372/D373): declarative CSS-routing shipped — `css_layer` L1-L4 seeded, `css_element` normalised, +213 routes, product-card cta -> box-object (every block now box-object). **NEXT: (1) deploy phase-f fixtures as canary pages [gating dep], (2) wire `check_landed()`, (3) live verify + Bean's eye — BLOCKED on the shared dirty tree (`P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`).** Plan: `plans/2026-07-22-spec31-completion-to-100.md`; detail: decisions D372/D373.
- **Track 2 — Header/Footer/Nav FULL REBUILD** (2026-07-17). Roadmap: `plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` (6 phases). **P1 CLOSED (D344)** — verdict: BUILD, full clean rebuild, rich-but-simple, tiered tri-state, informational-only a11y (DP2a), converter-emittable by construction (DP6); decision doc `plans/2026-07-18-P1-architecture-decision-header-footer-nav.md`. **P2 (builder design-gate) CLOSED + signed off.** **P2.5 → Spec 36 signed off v2.1.** **Spec 36 Phase 1 CLOSED 2026-07-20** (see the summary at the top). **Next: Spec 36 Phase 2** — mega CPT + Indus + rich desktop/mobile modes.

- **Track 2b — Spec 37 header/footer — REOPENED + closed again 2026-07-27 (D393–D395): starter-corruption
  fix, a latent `responsive-logo` fatal, and FR-37-41 preview-before-active (residual B2). See "ALSO CURRENT"
  above; track prompt `next-session-prompt-spec37.md`.** Per-row phases below remain closed (D386–D392).
- **Track 2b — Spec 37 header/footer PER-ROW identity — ✅ ALL PHASES CLOSED 2026-07-26 (D386–D392).** (prompt: `next-session-prompt-spec37.md`; design: `plans/2026-07-26-per-row-sticky-mini-design.md`, now historical — canonical record = **Spec 37 FR-37-37/38/39/40**.) Each row carries its own transparent / hide-on-scroll / shrink (device-tier, inherit-upward). **Shrink shipped a GROW bug and was fixed (D386):** an absolute `padding-block` in the shared stylesheet out-specified each row's own padding rule, so an unpadded row went 0px→4px; now emitted per instance as `calc(own padding / 2)` via `sgs_emit_responsive_css()` — proportional by construction. New prebuild gate `check-shared-css-state-rules.js` (nothing scanned `assets/css/` before). Hide-a-chosen-element ships with a DECLARATIVE `supports.sgs.headerEssential` guardrail, proven server-side (D387). Footer parity verified on the ACTIVE footer **CPT 1654** (not the obvious 1571). 44px floor measured and deliberately NOT built. **D388 [INCIDENT]: two editor-killing crashes shipped past ALL-GREEN gates** — only opening the real editor caught them.
  **Sticky build COMPLETE (D391 `5716f7b7` + D392 `494e5d50`), FR-37-40 done.** Per-row `position:sticky` was REJECTED (short-parent trap, D389); sticky stays HEADER-level and a row that should disappear while pinned **COLLAPSES** (height→0) — gap measured **0.00 unrounded** at desktop/tablet/mobile, non-pinned path byte-identical `translateY(-100%)` with no inline height written. The D2 offset chain was NOT built (nothing to chain). **The scroll-padding defect is FIXED:** the publisher is gated on MEASURED computed position (not the sticky body class — sticky+transparent both set `position` with `!important` at equal specificity, so the class lies) and publishes an explicit `0px` otherwise; it had been reserving 93px desktop / **252px mobile** on every non-sticky page. Plus a sticky-breaking-ancestor guard (advisory `console.warn`). Evidence: `reports/visual-diff/scroll-padding-pinned-gate-2026-07-26.md` + `row-collapse-when-pinned-2026-07-26.md`.
  **NEXT for this track = SIDE TRACK B deal-winners, not plumbing** — B3 preset library (NOT started; highest client-facing ROI left here). ~~B2 preview-scroll button (partly addressed by the shipped "Show me the shrunk size" editor toggle)~~ **— B2 is CLOSED 2026-07-27 by FR-37-41 (D395, `20ec422c`); the "partly addressed" framing was optimistic (that toggle covers shrink ONLY, while sticky/hide-on-scroll/transparent are scroll-triggered and unpreviewable in a canvas).** B1 simplicity test RUN, verdict FAIL → `P-HEADER-SIMPLICITY-FINDINGS`. **Deliberately NOT built + recorded:** the D4 multi-sticky warning and the sticky↔hide-on-scroll exclusion (both specified against the rejected per-row model — neither condition can occur). **Not live-verified:** `prefers-reduced-motion` on the collapse. **Open:** `P-THEME-SCROLL-PADDING-SECOND-INSTANCE`.


## Standing programmes (parallel / deferred — not the active front)

- **No-inline styling roster — effectively COMPLETE (11-condition DONE audit, 2026-07-26).**
  The old "~52 blocks remaining" framing was the phantom GAP-count metric; the audit found 0
  inline sites / 0 unserialized supports / 0 box-family violations across accessible blocks.
  Real remaining = 5 block-fixes (`.claude/reports/2026-07-26-spec32-11-condition-done-audit.md`).
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
