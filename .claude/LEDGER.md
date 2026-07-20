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

**Track 2 history (P2 + P2.5) — CLOSED, detail archived.** P2 (the header/footer/nav BUILDER
design-gate) is DONE + SIGNED OFF: `plans/2026-07-18-P2-builder-ux-design-gate.md` — the
settings panel a non-coder uses, over a CPT editing home (`sgs_header`/`sgs_footer`, NOT the
Site Editor), tri-state per-device controls, starter-template picker, bound to Spec 35.
Navigation was then carved out as P2.5 (full rework — Bean overrode the council's "salvage
adaptive-nav"). **P2.5 outcome: `specs/36-SGS-NAVIGATION-SYSTEM.md` SIGNED OFF v2.1
(2026-07-19)** — the single canonical nav home; 7-persona adversarial council + qc-council
fact-check, all 26 FRs survive; code-salvage audit evidenced to `file:line`
(`reports/2026-07-19-P2.5-phase6.5-salvage-audit.md`); safe doc-purge done (spec 34 DELETED,
Spec 17/02 → Spec 36 pointers). Menu data = **CLASSIC WP menus PRIMARY** (`wp_navigation` is a
Phase-3 extra — an earlier "wp_navigation locked" line was a stale carry, corrected 07-19).
**Post-build deferrals — WORKED 2026-07-20 (see the Phase-1 close-out below).** The roster items
(Spec 17 §S9-1, `00 §2.1`, `no-header-footer-block.py`, Spec 29) are DONE; the DB-row retirement was
struck as not-actionable. **Still genuinely open:** the block-registration deletion + Indus header
cutover (**FR-36-18**) and the Spec 33 Part 2 emit-target repoint (**FR-36-15**) — both Phase-2 scope.
Full narrative: `memory/session-2026-07-19*.md`.
**Phase 1 CLOSED. Plan (historical, was QC-clean 92/100): `plans/2026-07-19-spec36-phase1-mvp-nav-plan.md`.**
- **WAVES 0–4 + Gate-1 — ALL COMPLETE, Phase 1 CLOSED (2026-07-20).** Full blow-by-blow narrative swept to
  **`memory/session-2026-07-20-11-spec36-phase1-close.md`** (verbatim) now that the phase is shut; the compressed
  record follows. Built: the shared `store('sgs/nav')` (D323 body-reparent + D340 scroll-lock ported verbatim, the
  two old focus-traps MERGED); **`sgs/nav-menu`** (flat bar + burger→drawer, menu picker, collapse-point, featured
  checklist); **`sgs/nav-drawer`** (full-screen `<dialog showModal>`, × as undeletable chrome, `animateFrom`
  direction control) — **content-KIND block-private**, because a `<dialog>` cannot be hosted by
  `SGS_Container_Wrapper` (D294, Bean-approved; now documented as Spec 36 FR-36-13's `<dialog>` exception).
  `scripts/nav-qa/` Gate-1 tooling; header re-authored in `parts/header.html`; `sgs/adaptive-nav` left registered
  but dormant as the rollback path.
- **Gate-1 evidence (all green, live on the canary):** drawer axe **0** · elementFromPoint sweep **20/20** (10/10
  at 375, the Spec 36 §8 baseline, `probes.mamas.json`) · crawl-assert PASS with JS off · burger/ESC/focus/Tab ·
  CLS 0.0000–0.0144 · **Bean's eye PASSED** · **D340 bounce PASSED** (Bean, manual, real desktop browser — the
  harness CANNOT judge this; see STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR).
- **Three real bugs found + fixed during Wave 4, each live-verified:** (1) **D351** — the featured item rendered at
  **1.35:1**; root cause was a MISSING `featuredBg` attribute, so the converter silently dropped the draft's pill
  fill. The fidelity fix and the a11y fix were one fix (draft pairing 5.28:1). (2) The drawer's **exit animation had
  never once run** — `runClose()` called `dialog.close()` in the same tick, making the element `display:none` before
  a frame painted; native ESC also bypassed the close handler entirely. (3) A co-active session's deploy **silently
  reverted** the D351 fix and a false `verdict: PASS` reached Bean — `build-deploy.py`'s verify leg cannot detect an
  absent change. All three are now STOP entries.
- **FR-36-1 classic-menu resolver — BUILT + LIVE-VERIFIED (D352, `4a4c220a`).** Classic menus are the PRIMARY source
  per spec but resolved to nothing. Now CLASSIC-FIRST then `wp_navigation` (**Bean's ruling:** keep the single numeric
  `ref`, classic wins the id tie — no new attr, no reshape), normalising classic items into the same block-shaped
  array so `flatten()`/drawer/edit.js needed ZERO changes; FR-36-1's missing fallback order also implemented; editor
  picker now lists classic menus (they were unpickable). ⚠ **The first acceptance run was VACUOUS and was caught** —
  the labels asserted also come from the header's block menu, so it would have passed with the feature absent.
  Redone with a marker present on the classic page and ABSENT on the homepage. No regression.
- **Phase-1 close-out (roster + DB):** `no-header-footer-block.py` needs NO change, proven by EXECUTING it
  (`nav-menu`/`nav-drawer` → 0; `nav`/`header` → 2) · Spec 00 §2.1 refreshed (still named the six-days-deleted
  `sgs/mobile-nav`) · **`/sgs-update` Stage 11 had been FAILING (exit 1)** — detection was right, the hardcoded
  roster stale (`nav-menu`+`brand-strip` layout, `nav-drawer` content); now exits 0 · **30 attrs registered**
  (`sgs/nav-menu` had 2 of its 9 `featured*`).
- **⛔ One handoff instruction REFUSED:** "retire the adaptive-nav / mega-menu / mobile-nav DB rows". `mobile-nav`
  is ALREADY gone from `src/` and the DB; `adaptive-nav` MUST stay as the FR-36-18 rollback path; `mega-menu` is
  **Phase-2 scope**. Executing it as written would have deleted the rollback path — struck, not carried forward.
- **Known-open, NOT blockers:** featured-item HOVER diverges from the draft (`box-shadow: inset 0 -2px 0 accent`
  has no attribute) — **⛔ Bean-locked DO-NOT-FIX: the planted TEST CASE for header cloning**
  (`P-NAV-FEATURED-HOVER-DRAFT-PARITY`, BLOCKED). Bean also reported the inspector's **Styles tab blanking the
  sidebar** — **NOT REPRODUCED** (all 3 nav blocks, every panel forced open, zero console errors); he
  deprioritised it (`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`).
- **NOT nav, recorded so it is not re-flagged:** 2 page contrast fails (button 3.67:1, Trustpilot 2.63:1) + a
  **duplicate `<main>` landmark** traced to a `core/group` in the PAGE content — belongs to the queued core→SGS
  migration (product-queue task A), not to nav. ("Our Story" has a submenu, flattened in Phase 1 by design;
  menu 1467's `/gifts/` → `/gift-ideas/` was fixed by Bean himself.)

**Latest (2026-07-20, Track 1 — Spec 35 rollout, 4 commits, all merged to main via `5672b4c6`).**
Element-first inspector design LOCKED + its machine contract BUILT + the exemplar made real:
(1) **Parallax split** — background parallax = a toggle in the native Colour panel (`group="color"`,
background-capable blocks only) with conditional Strength; element parallax = its own renamed+explained
panel with conditional Strength; both drive the one `sgsParallax` enum (mutually exclusive) → zero
render/data-model change; live-verified (`1d476c26`). (2) **Task 2 #1 — element manifest** (`supports.sgs.elements`
= `{label,order,clusters[],prefix?,isWrapper?,attrMap?}`) + `cluster-member-sets.json` (text/fill/layout
member sets from the registry) + `check-element-manifest-conformance.js` (CLUSTER-COHERENCE rule, WARN-only);
brand-strip manifest seeded — honest run **16 OK / 22 gaps** (`869fe84d`). (3) **Task 2 #2 — brand-strip
exemplar now CONSUMES the real controls**: `tileShadow` → `ShadowControl` (scoped `<style>`, no inline),
per-logo link → `SgsLinkControl` (`869fe84d`). (4) **ShadowControl crash fix** — live-verify caught it
crashing on first render (`useSettings('shadow.presets')` returns WP's origin-keyed `{default,theme,custom}`
object on WP 7.0.x, not an array); normalised + slug-deduped; re-verified live (`bffb00ff`). Also: **Task 4
live-verified** (form-field inspector decluttered). **Next:** Task 3 (hover-duplicate codemod — design-gate
first), Task 6 (wire linters WARN-only), Task 2 #3 (per-device border/shadow — design-gate), #4 (content-tab
spec), step-5 (per-block manifest gap-closing from the 22-gap list). Handoff: `next-session-prompt-spec35-track1.md`.

**Prior (2026-07-19, Track 1 — Spec 35 block-inspector-UX, 11 commits).** Phase 0 foundations DONE +
attribute-registry mapped through Phase 1c. Built: the inspector DONE-checklist; the block roster
(DB-derived); all 3 audits (inspector-conformance JSX-AST, feature-parity, shrink-to-fit — WARN-only);
3 shared components (`DesignTokenPicker` enableAlpha, `SgsLinkControl`, `ShadowControl`); brand-strip as
the pilot exemplar; the **min-width:0 wrapper backstop** (built + deployed, but NOT live-emission-proven —
the homepage has no wrapper-grid container; UNIT D will prove it). **Registry insight (Bean-driven):**
944 attr names → ~80 TRUE settings; the "282 one-offs" were classifier laziness (dedup by NAME not
property-identity), fully adjudicated to 0 genuinely-unique. `plugins/sgs-blocks/scripts/consistency/`.
Full narrative: `memory/session-2026-07-19*.md`.

**Where we are (2026-07-17).** Two things run in parallel:
1. **The website builder itself** — the header/footer/nav system + the drawer menu are built
   and LIVE on both your test site (sandybrown) and the Indus site (palestine-lives). The
   last real product work (Phase 2 nav/logo fixes + the disclosure drawer) shipped and was
   merged to the `main` line. A few small polish items and the Indus header/footer match are
   still queued (below).
2. **A tidy-up of how the project is run** — a signed-off plan
   (now `plans/archive/2026-07-16-setup-simplification-and-protocol.md`) culled cruft and added
   automatic guard-rails so the AI needs less babysitting. **FULLY COMPLETE (P0–P6) and archived.**

**Why it matters.** You are QC-only on the framework; every drifting doc or missing guard-rail
is time you have to spend catching mistakes.

**⭐ LATEST (2026-07-20, session close) — SPEC 36 PHASE 1 IS CLOSED.** The new navigation is finished,
live, signed off by you, and its paperwork is straight. This session: built the **classic-menu reader**
(FR-36-1 — your *Appearance → Menus* menus now drive the nav; they rendered nothing before, D352), then
worked the roster close-out. Two things worth knowing: a build gate (`/sgs-update` Stage 11) had been
**silently failing** and is now green, and the database knew only **2 of 9** of the nav block's featured
settings — 30 attributes were re-registered. I also **refused one instruction**: the handoff said to retire
the `adaptive-nav` / `mega-menu` / `mobile-nav` database rows; checking showed `mobile-nav` was already gone,
`adaptive-nav` is your rollback path, and `mega-menu` is Phase-2 work — so it was struck, not done.
**Deliberately NOT fixed (your call):** the featured item's hover still differs from the draft — that gap is
now the planted TEST CASE for header cloning and is marked DO-NOT-FIX in parking.

**Your single next action.** Nothing is blocked. Two independent fronts to pick from: the
**product** front — the drawer link-colour polish (a 5-minute fix) at the top of the "Product
queue" below, then the Indus header/footer match; or the **setup** front — the setup-simplification plan is now **FULLY CLOSED**: P5
(WCAG 2.1 baseline + agent refresh + skills refresh) and **P6 (global tidy-ups — CLAUDE.md
276→51 lines, `__pycache__` gone, situational rules path-scoped, plus 2 new auto-gates that
stop CLAUDE.md re-bloating and big blobs entering commits) are both COMPLETE.** So the only
remaining work is the **product** front (drawer polish, Indus header/footer). P3glob (the
global enforcement hooks — the AI now has to PROVE it verified SGS work before it can close a
session) and P4 (the LEDGER collapse) are done + live.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main` (verified 2026-07-20). **This session's commits (pushed):** `4a4c220a` (FR-36-1 resolver)
  → `62caa887` (D352 docs) → `0258137c` (parking recheck) → `19757245` (Phase-1 close-out).
  ⚠ **Not HEAD** — co-active sessions push between handoffs (3 Spec-35 commits landed right after this close).
  Run `git log -1 --format=%h` for the real HEAD; a cached hash here went stale within minutes and QC caught it.
  **D-ceiling:** **D352** (FR-36-1 classic-menu resolution, 2026-07-20, `4a4c220a`). Re-check the branch in
  the SAME command as any commit (STOP-RECHECK-BRANCH) — these values drift, verify rather than trust this line.
- **Canonical spec:** `specs/31-UNIVERSAL-CLONING-PIPELINE.md` — the standing governing spec for cloning-pipeline work; read IN FULL each cloning session.
  For the header/footer/nav front: **`specs/36-SGS-NAVIGATION-SYSTEM.md`** (the canonical nav home) + `specs/17` §S9.
  ⛔ **`specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` was DELETED in P2.5 Phase 6 — never cite it; Spec 36 absorbed it.**
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
   **PASSED**. **Genuinely still open:** prove the Site-Editor→frontend round trip for the **FOOTER** (the header
   half is proven; the two are wired differently). Belongs to Spec 17 §S9 / Phase-2 footer work.
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
