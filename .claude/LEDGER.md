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
- **⛔ `sgs/adaptive-nav` stays registered** as the FR-36-18 rollback path until the Indus cutover is green.

**Prior sessions (swept 2026-07-21, verbatim):** the Spec 35 inspector-UX rollout (2026-07-19/20) and the 2026-07-17 orientation block now live in `memory/session-2026-07-21-ledger-sweep.md`. Track 1b's live status is in **Active tracks** below.

**⭐ LATEST (2026-07-21 evening) — SPEC 17 DELETED, SPEC 37 IS THE HEADER/FOOTER HOME.**
The spec problem that made this morning's work land on the wrong thing is now structurally closed.

**What was wrong.** Spec 17 (1030 lines, 39 FRs) described a header/footer system nobody was
building. It carried **three competing answers** to "where do you edit a header?" — the Site Editor
(its own §3), the **WP Customiser** (Decision 21, 18 mentions, *never built* — and Spec 17 itself
labelled part of that section "RETRACTED FICTION", naming four classes asserted as shipped that never
existed), and the **CPT admin screen** that the P2 design-gate actually decided on. The CODE
implemented the first. The DECISION was the third. A task earlier the same day was built and verified
against the wrong one purely because the governing spec still described the superseded model.

**What replaced it.** **`specs/37-HEADER-FOOTER-BUILDER.md`** — 31 FRs, docscore 100% Grade A, every
FR carrying `BUILT`/`PARTIAL`/`NOT-BUILT` with a `file:line` pointer so nothing gets rebuilt and
nothing is assumed working from a similar-sounding filename. Spec 36 (nav) is its extension.

**The load-bearing find, verified hook by hook:** a CPT-authored header **can never reach the
frontend today**. CPT patterns register on `admin_init` (`class-sgs-block-cpts.php:55`); the rules
engine resolves on `pre_render_block`, a frontend hook (`class-sgs-header-rules.php:51`), via the
pattern registry (`:329`) — finds nothing, returns `null`, falls through to the theme default.
Silent, no error: the D338 class. Spec 37 replaces the mechanism with **direct render**.

**All four open design questions were ANSWERED, not deferred** (your instruction — nothing left to
surface mid-build): columns are an operator-set **count** that stacks on mobile automatically (a
`gridTemplateColumns` ratio override was recommended and **you rejected it** — a CSS grid template is
a developer concept); rows get `templateLock` `'insert'` → **`'all'`**; the per-device cascade is
**HIDE not REMOVE** and **moved to Spec 35**; the Simple-surface controls adopt P2's roster verbatim.

**Three real bugs found while specifying.** (1) The CPT render break above. (2)
`site-footer/edit.js:28-30` sets `columns`/`columnsTablet`/`columnsMobile` on a row whose `block.json`
**declares none of them** — silently discarded at save (D338 again); fixing it *is* FR-37-11. (3)
`templateLock:'insert'` **does not lock reordering** — both containers' comments claim it does, so an
operator can drag the bottom row above the top one.

**The adversarial council caught the spec writing fiction.** FR-37-3 originally justified itself via
`sgs_header_rule_resolved` — a filter with **zero subscribers** (two hits in the tree: the
`apply_filters` and a comment claiming it matters). The real breakage is one file over:
`Sgs_Header_Behaviours` hooks `body_class` and resolves via `get_header_content()`, which reads
`parts/header.html` — the file FR-37-6 empties. Built as written, the header would render and then
**silently not be sticky**. FR-37-3 now carries the corrected contract; FR-37-6 is gated on it. The
council also caught FR-37-16 ordering a reversal of **STOP-NO-KSORT** (D334, council-gated) — struck.

**Earlier the same day (all shipped):** `token-lint.py` was **inert** — it read 0 of every draft's
declarations because `.html` routed to the inline-attribute parser while the drafts put all CSS in a
`<style>` block; fixed, all 11 drafts now read 8–31 declarations each, plus unresolved `var()` is now
a hard fail. A **cross-palette contrast sweep** was built (176 combinations, axe-core) and made
**warn-only** on your ruling. Its 496 findings turned out **not** to be draft defects: `depth-stack`
measures **7.46:1 on its own palette** and only fails where a client's `primary-dark` is not actually
dark (mamas-munches `#c56a7a`). Your call: change nothing. The **footer Site-Editor round trip** was
proven live and then correctly re-scoped — it tested the route P2 rejected.

**Your single next action.** The **6-FR minimum core** — `FR-37-2` → `3` → `4` → `25` → `5` → `6`,
in that order, `FR-37-6` last so `parts/header.html` stays the rollback. About a day for the header,
~45 min more for the footer. Everything else in Spec 37 is deferrable without touching the outcome.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **This session's commits (pushed):** `f0fe7b9d` (token-lint fix) → `1169060e`
  (contrast sweep) → `d7985f10` (warn-only) → `d4d57693` (parking) → `b151d312` + `729ccf87` (Task 4
  + its correction) → **`9dbe94fd` (Spec 37 + Spec 17 DELETED + 14 docs repointed)**.
  ⚠ **Not HEAD** — a co-active Spec-35 track commits between handoffs (`2e455c5a`, `8a5b6ac4` landed
  mid-session). Run `git log -1 --format=%h` for the real HEAD. **D-ceiling: D358** — verify with
  `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`; re-check the branch in the SAME
  command as any commit (STOP-RECHECK-BRANCH).
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
   `theme/sgs-theme/patterns/footer-indus-foods.php` (the only client-named framework
   pattern; leaks "Indus Foods Footer" + a hardcoded Google Place CID to every install);
   decide the per-site channel (JSON snapshot vs REST); gitignore per-site files. Do this
   BEFORE Goals 4/1 so they write to the per-site channel.
4. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`):
   fix its 2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns;
   maps the hamburger to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/adaptive-nav`).
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
- **Track 1b — Spec 35 block-inspector-UX** (prompt: `next-session-prompt-spec35-track1.md`; co-active). **2026-07-21: cluster/element VOCABULARY REWORK shipped** — 3 clusters → 5 (D354/D355), ELEMENT is now the primary mapping axis and `flow` was built-then-reversed the same day; coverage validator (unclustered = error), orphan detection, and the `layer` field (OUTER/CONTENT/GRID/GRID_AREA, shared with the converter, declarative only). Rollout wave 1 = 20 blocks. **Live: 28 of 67 blocks manifested | OK 432 | GAP 1101 | ORPHAN 62** (site-header/footer/-row + adaptive-nav excluded — Track 2 owns them). **Next: build FR-35-5 (`states` axis) + FR-35-6 (`animation` cluster) — both APPROVED, NOT BUILT — then rollout waves 2-3, then the card-grid resting-state defect.** Canonical: `plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md`.
- **Track 2 — Header/Footer/Nav FULL REBUILD** (2026-07-17). Roadmap: `plans/2026-07-17-header-footer-nav-full-rebuild-strategic-plan.md` (6 phases). **P1 CLOSED (D344)** — verdict: BUILD, full clean rebuild, rich-but-simple, tiered tri-state, informational-only a11y (DP2a), converter-emittable by construction (DP6); decision doc `plans/2026-07-18-P1-architecture-decision-header-footer-nav.md`. **P2 (builder design-gate) CLOSED + signed off.** **P2.5 → Spec 36 signed off v2.1.** **Spec 36 Phase 1 CLOSED 2026-07-20** (see the summary at the top). **Next: Spec 36 Phase 2** — mega CPT + Indus + rich desktop/mobile modes.

## Standing programmes (parallel / deferred — not the active front)

- **No-inline styling roster (~52 blocks, phased waves).** Hard architecture SETTLED
  (mechanism, D294 pattern selector, grid-scoping). Roster count drifts in prose — the DB +
  `plans/block-migration-DONE-checklist.md` are authoritative. Reusable LANDED harness:
  `plugins/sgs-blocks/scripts/no-inline-land-verify.js`. Canonical: Spec 31 §3.A/§13.4/§13.6
  + Spec 32 §6.1 + the DONE-checklist + the migration-contract plan.
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
