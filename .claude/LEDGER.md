---
doc_type: state
project: small-giants-wp
last_updated: 2026-07-30
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where things stand (2026-07-30, end of Wave 2 session 1).** Wave 1 is finished. **Wave 2 has
started: the measuring equipment is now honest, and the drawer's own edit screen is next.**

**The headline: our tools were lying, and fixing them found something bigger.** Four separate
checking scripts could report "all clear" while actually looking at a menu that was shut — so they
were testing nothing. That's fixed, and each one is now *proven* able to fail rather than assumed to.

**And the invisible menu text is real.** Six items — Contact, Latest, Careers, Team, Press — are
painted the exact same brown as the panel behind them. Completely unreadable. This is what you saw
as "arrows with no labels". Nothing could detect it before; the new check catches all six and
correctly leaves the light-coloured menus alone. **It is detectable now, not yet fixed** — the fix
is scheduled next.

**A warning worth keeping:** standard accessibility tools **cannot** check colour contrast inside a
slide-out panel at all — not misconfigured, structurally unable. So the tool was confidently
reporting "no problems" over eight items it had quietly given up on. This also killed a fix I had
proposed and you had approved: it would have made the checking worse while looking like progress.
Caught before building, by the review panel you asked for.

**Next up:** moving the slide-out menu onto its own edit screen (Wave 2's main job). Nothing was
deployed this session — the work was all to the checking tools, so your sites are unchanged.

**On the drawers, unchanged:** the clones you rejected get no rework until the CPT move lands. Both
real faults found then are still open and scheduled inside Wave 2.

---

## ⭐ CURRENT FRONTS

> **QC (2026-07-30, second pass — independent subagent, D414–D417): CLEAN on code, decisions and
> numbers.** The prior note here — "panel defect genuinely unresolved… no canary artefact in the
> repo… carried-forward assertion, not reproducible proof" — is **SUPERSEDED and was false by the
> time it was read**: the panel defect closed at `810a15f9`, and the evidence artefact
> (`reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md`, 281 lines, pre/post probe
> tables) plus two re-runnable probes under `plugins/sgs-blocks/scripts/motion-qa/` are committed.
> **Standing caveat, stated honestly:** the probes are re-runnable and committed, but their JSON
> output is not — the tables are transcribed readings. Call it re-runnable evidence, not
> reproducible proof.

### Track 3 — Spec 38 motion system: **WAVE A CLOSED 2026-07-30** (D414–D417)

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. Wave A + its close-out are shipped, live-verified on
real SGS blocks and **owner-confirmed** — including two defects Bean's eye caught that every
mechanical check had called green. Wave A's plan files were deleted at his instruction.

**Full record, commits, and the carry-forward rules:**
`memory/session-2026-07-30-motion-waveA-closeout.md` · evidence
`reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md`.

⚠ Parked, not caused by this work: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE`. Also open: `/sgs-update` Stage 11 warns on the
mega-* container roster (nav track's blocks — left alone, not ours to reconcile).

Next motion front = Waves B ∥ C.

### Tracks 2 + 2b MERGE (Bean, 2026-07-29) — ONE nav/header/footer track; **STRATEGIC PLAN LANDED (D413)**

**⭐ THE PLAN EXISTS: `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`** — 5 waves
(fixtures → capabilities incl. drawer CPT → polish → 10-clone proof gate → Spec 33 Part 2 walker),
peer-reviewed (risk pre-mortem + PERT + cold hidden-work review), gap-graded B. Verification
criteria: `verify/merged-spec36-37-track.md`. **Entry point = Wave 1 (W1-a: canary mega panel
1745, confirm EMPTY, populate, Gate-3 live pass).** Two Bean touchpoints queued inside it: confirm
the 10-clone roster (resn + Warm named exclusions of "all 12") at Gate 1; sign the font/imagery
substitution policy (W4-a2) before the first clone. Effort forecast 18–22 taxed sessions.

**The gate that produced it (SIGNED):**
`plans/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`. It locks: merged 36/37
EXECUTION (specs stay separate docs, §1.2 cross-amend rule keeps them coupled) · drawer → CPT
(`variantPreset` dies, 7 looks become CPT starter patterns; `drawerRef` becomes a post picker) ·
nav-menu stays a BLOCK (its content home is the classic menu; its edit surface is the header CPT)
but its burger trigger becomes fully controllable (DP4) · per-property controllability contract
(DP5) · each accepted clone yields the B3 presets (Q3 = retire `centred/minimal/full`, keep scratch
+ 3 search) · DP7 harness honesty gates any re-present. **GATE SIGNED (Bean, 2026-07-29): CPT admin
name = "Menu drawer" · site-wide Active default + per-burger picker override · studionamma first.
DP6 RE-SEQUENCED: cloning is the FINAL PROOF GATE (wave 4), NOT the opening task — FR-37-42 + DP4 +
the CPT move are prerequisites a faithful clone needs anyway.** B3's old standalone plan is
subsumed — its §7 answers live in the gate §0.

**Header-track inputs shipped 2026-07-28 (D412):** FR-36-9a(2) burger-opens-nothing notice live
(`6ddb9f48`) · **FR-37-42** column-shape picker APPROVED not built (`7ff5a184` — needs
`1fr auto 1fr`; a faithful-header-clone prerequisite) · teardowns 9/12
(`~/.claude/pipeline-state/sgs-discover/20260728-112649-7bc4a8/FINDINGS.md`; Away/ButcherBox/
rabbit.tech owed = W4-a; Lama Lama sticky by Bean's eye — probe-unmeasured ≠ non-sticky) · **SCOPE
SOURCE: `reports/2026-07-28-spec36-37-remaining-work-inventory.md`** · floating UI STAYS in the
Customiser.

Header residue unchanged: FR-37-26 FAIL verdict deliberately STANDS (blind-tester arm);
`P-HEADER-SIMPLICITY-FINDINGS` OPEN (findings 2 + 3).

### Track 2 — Spec 36 nav: TASK 5 ⛔ REJECTED BY BEAN 2026-07-29 — CPT design gate is next

**Bean rejected the pairs: "the difference between our version and theirs is night and day" —
R-31-13, the eye is co-authoritative and it overrode a 21/21 mechanical pass.** Do NOT re-present
these; every variant needs real work first. Narrative + evidence:
`memory/session-2026-07-29-task5-drawer-rejection.md`; **D411**;
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (read its CORRECTION box first — the
"21/21 PASS" headline is true only of the checks that ran). The CPT gate is signed (merged-track
section above); the counterweight it preserves: a CPT changes where a drawer LIVES, not how
faithfully it PAINTS.

**Two defects PROVEN LIVE, both OPEN, fixes scheduled W2-g/W2-h** (details in their parking
entries): `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (6 elements at **1:1** contrast on the 2
dark-`footer-bg` variants — Bean's "arrows with no labels"; **now harness-detectable**, D418) ·
`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` (no align class emitted, so `centred-statement` renders
left-aligned).

**Rework scope, PARKED BEHIND the gate:** parking `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`. **The
capture script must assert the panel is OPEN before it shoots** — enforced since D418 on BOTH sides,
with a non-zero exit; an unassertable reference now returns UNVERIFIED.

**Standing warnings (do not lose these):** **every scoped drawer/mega axe result from before
2026-07-29 proves nothing — re-run it** (no openness guard existed; a CLOSED drawer returned
`0 violations` identically to an open one). **And axe can NEVER measure contrast inside an open
`<dialog>`** — top-layer `::backdrop` defeats its background resolution, so all text lands in its
INCOMPLETE bucket; use `checkRestContrast()` in `sweep-drawer-variants.mjs` (D418). Two further
harness bugs manufactured false results, both fixed (phantom `:hover` 2.14:1 reading; JS-off check
comparing raw text to HTML so `Arts & Culture` read as missing). **F1 `listColumns`
`grid-auto-flow:row` is DOWNGRADED TO UNDECIDED** — the "reading order is wrong" claim assumed
column-wise reading; Bean's counter stands
(rows-of-2 reads correctly across rows), and there is no ground truth because the reference capture
for that exact variant failed. **F2** (header track) at 375px the theme header is `position:absolute`,
251px tall, rendering the DESKTOP logo over content. **F3** `sgs/social-icons` has no Vimeo/Dribbble slug.

**Re-runnable assets:** `plugins/sgs-blocks/scripts/nav-qa/` — all guarded + self-testing since
D418; **read its `README.md` §1b/§1c before trusting or extending any of them.** Canary fixtures:
pages 1892/1897/1903/1907/1914/1922/1926, multi-instance 1930, anchor probes 1932; menus 102-109.

Parked follow-ons: `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` ·
`P-NAV-MENU-LISTCOLUMNS-READING-ORDER` · `P-NAV-DRAWER-DUPLICATE-DEFAULT-REF` ·
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` · `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. None is GSAP.

### Track 1b — Spec 35: BUILD SURFACE COMPLETE

No remaining build items (closed 2026-07-28, ~18 packages; D400/D402/D405). Next front here =
**Spec 37 Group B proper** (FR-37-14 BUILT + live-proven, so Group B is UNBLOCKED) or B3 presets.
Canonical: `plans/block-migration-DONE-checklist.md` + Spec 32 §6.1; audit
`reports/2026-07-26-spec32-11-condition-done-audit.md`.

### Track 1c — Spec 31 converter completion

Completion wave + declarative CSS-routing shipped (D372/D373). **NEXT: (1) deploy phase-f fixtures
as canary pages [gating dep], (2) wire `check_landed()`, (3) live verify + Bean's eye — BLOCKED on
the shared dirty tree (`P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`). NB the isolated-worktree deploy
used 2026-07-30 routes around that block.** Plan: `plans/2026-07-22-spec31-completion-to-100.md`.

---

## Standing constraints (carry forward — these are rules, not history)

- **Per-row `position:sticky` is REJECTED** on the short-parent trap (D389). Sticky stays
  HEADER-level; a hidden row COLLAPSES to height 0 (gap measured 0.00 at all 3 tiers). The D4
  multi-sticky warning and the sticky↔hide-on-scroll exclusion were deliberately **NOT built** (both
  specified against the rejected model — do not "finish the job"). **Footer rows get NO sticky** —
  that is Spec 18 Floating UI (D390).
- **No absolute size value in a shared state-only stylesheet** (D386's GROW bug), gated by
  `check-shared-css-state-rules.js`.
- **After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor** (D388 —
  two editor-killing crashes shipped past ALL-GREEN gates).
- **A scoped axe run on a CLOSED surface passes vacuously** — guard openness or the run proves
  nothing. Any earlier drawer-axe claim from that harness proves nothing.
- **A pattern verified by its METADATA is not verified by its CHILDREN** (D377 retro-invalidated).
  Anything else banked on metadata-only evidence deserves a second look.
- **`templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matching children by
  ARRAY POSITION** (D393) — pass the template only into a genuinely empty container.
- **The D343 phantom border was never caused by shadows-as-borders.** Cause: WP core's
  `html :where([style*="border-width"])` substring-matching a custom property *named*
  `--sgs-tile-border-width`. Fix (shipped) = name width vars `--*-thickness`. Do not re-propagate the
  wrong diagnosis.
- **The no-login shareable preview link is DROPPED, not deferred** (Bean 2026-07-27) — a client who
  should see work-in-progress has an account or is shown a test site. Do not re-open it.
- **`<footer>` is generic** — the canary page has 5, four of them quote/testimonial attributions.
  The site footer is the LAST one, `<footer class="wp-block-template-part">`. **Key assertions on the
  CLASS**, never a naive regex.
- **Two durability caveats (setup-simplification track):** `~/.agents` is NOT a git repo, so the
  skillscore script + 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED (recovery =
  per-file `.bak-2026-07-17-*`); the `lifecycle-gate-stop.py` unwire is local but NOT committed to
  the `~/.claude` repo.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. ⚠ **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. **Commit by EXACT PATH, never `git add -A`; never touch their uncommitted files**
  (`STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE`).
- **Verify every session, no cached line is authoritative:**
  - `git log -1 --stat` + `git status` + `git branch --show-current` (re-check branch in the SAME
    command as any commit)
  - D-ceiling: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  - Framework counts: `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are never in prose
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each cloning
  session; its Appendix D is the stage index, Appendix C the run-artefact inventory). Nav =
  `specs/36-SGS-NAVIGATION-SYSTEM.md`; header/footer = `specs/37-HEADER-FOOTER-BUILDER.md`. Full
  roster + the DEAD-never-cite list: **`specs/README.md`** (the ONE roster).
- **Sites:** dev = palestine-lives.org (Indus). staging/canary =
  sandybrown-nightingale-600381.hostingersite.com. Both **WP 7.0.2** (verified 2026-07-20 by
  `wp core version` over SSH on both).
- **Fixtures left on the canary (do not assume they are clean):** mega page 1762, panel 1745, menu
  100, item 1746; header CPT 1570, footer CPT 1654.
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) · two
  unnamed `<main>` landmarks · `minmax()` guard absent · both sites GENERIC proof headers
  (sandybrown #1570/#1571; palestine-lives #360) · FR-37-36.

---

## Product queue (the website-builder work — reconcile before acting, some is already live)

**Indus "Our Brands" clone — DONE (D343).** Remaining Indus tasks (Bean-directed 2026-07-17):

- **A — core→SGS migration.** (1) build the `sgs/separator` migration pairing
  (`migrate-core-blocks/pairings/separator_pairing.py` does NOT exist — follow
  `heading_pairing.py`/`image_pairing.py`); (2) **re-add** `sgs/separator`→`core/separator` to
  `block-replacements.json` + `/sgs-update` (reverted at `49e6fc4f` because it build-blocked with no
  pairing); (3) migrate the 4 theme patterns still using `core/separator` (`footer-centred`,
  `footer-columns`, `mega-menu-split-info-cta`, `pricing-columns`); (4) **page 13**: convert the "Our
  Brands" band `core/group` → `sgs/container` (`verticalAlign:center`, drop the padding fudge) +
  audit page 13 for all remaining replaceable core blocks.
- **B — wire `lint-theme-css-hardcodes.py` into prebuild** (runnable but not gated).
- **C — deferred:** Services-section 768 overflow (hardcoded `139/250/123/187=771px` columns →
  responsive `fr`); Services button-border decision; Task-2 detection-method brainstorm.

**Header/footer goals (sequenced):**
1. **Step 1 — SPLIT framework vs per-site header/footer.** `footer-indus-foods.php` DELETED
   2026-07-22 (`94ab240f`). Still to do: decide the per-site channel (JSON snapshot vs REST);
   gitignore per-site files. Do this BEFORE goals 4/1 so they write to the per-site channel.
2. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`): fix its
   2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns; maps the hamburger
   to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/nav-menu` + `sgs/nav-drawer`;
   `sgs/adaptive-nav` is also deleted, D362). Bean's heading-specific eye pass (R-31-13) lands here.
3. **Goal 1 — replicate the Indus header/footer.** BASELINE = the preserved hand-built Astra/Spectra
   site https://lightsalmon-tarsier-683012.hostingersite.com/ (NOT the `mockups/*.html`). Capture it
   AS A FILE FIRST (`reports/visual-diff/header-footer-baseline-indus.json`). Open defects: logo
   mobile-tier switch; buttons/rows/bg not preserved; sticky+shrinking header; mega-menu shows on
   mobile+desktop. NEW: `P-INDUS-BRANDSTRIP-OVERFLOW-9PX`.
4. **Goal 3 — de-hardcode base blocks.** `site-header/edit.js` + `site-footer/edit.js` TEMPLATEs + row
   blocks — remove the hardcoded content (NOT "empty containers"). REMOVE the
   `Quick Links`/`Contact`/`Opening Hours` heading blocks from `framework-footer-default` (rich
   versions exist as opt-in patterns). Register:
   `plans/2026-07-15-header-footer-hardcoding-register.md`.

**Open reconciliation:** Track B (`feat/track-b-content-restore`, Indus page content) stayed
unmerged/paused — check its branch state before touching its files.

**Standing programmes (closed — pointers only):** no-inline COMPLETE bar 5 block-fixes
(`reports/2026-07-26-spec32-11-condition-done-audit.md`) · Spec 30 COMPLETE (D220) · L1–L4 DONE
(D290). Parked, not ours: `P-CONFORMANCE-GOLDEN-DRIFT` · `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Spec roster + DEAD-never-cite list | `specs/README.md` (the ONE roster) |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored operator cheat-sheet) |

## Blockers

None block the next session, except Track 1c's deploy step
(`P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`). Known-open items are the Product queue + `parking.md`.

---

## NEXT SESSION — Wave 2 unit `W2-a` (the drawer CPT). `W2-i` CLOSED 2026-07-30

**Wave 1 CLOSED** (`memory/session-2026-07-30-wave1.md`). **`W2-i` CLOSED** — commits `4f9dc0ba`
`66084dc9` `4effc395`, pushed. Read **`memory/session-2026-07-30-wave2-harness.md`** + **D418**
before starting; the plan is **`~/.claude/plans/spec-36-37-iterative-kahn.md`** (Part 2 = W2-a,
Part 5 = the council findings). Nothing was deployed; the canary is unchanged.

**START HERE — `W2-a`, then GATE 2 before ANY destructive step.** Four council fixes MUST land in
the same commit as the render path (plan Part 2 §2c):
1. **BLOCKER — `src/blocks/nav-drawer/render.php` has ZERO refs to `Sgs_Active_Layout`** (verified by
   grep), so the planned landmark guard has no input and **two `<dialog id="sgs-nav-drawer">` would
   ship**. Call `Sgs_Active_Layout::mark_served( AREA_DRAWER )` on the ordinary block path —
   precedent `class-sgs-header-rules.php:253-258`. Gate 2 step 8 fails without it.
2. Give the new "a burger asked" static registry a reset seam like `reset_request_state()` (`:94-98`).
3. Write that registry **before** `do_blocks()`, mirroring `render_active()` (`:157-165`) — the
   drawer's own content contains a `sgs/nav-menu` with no nesting check.
4. `wp_footer` never fires in the editor (`class-sgs-css-registry.php:32-36`) — **Bean-decided:**
   declare it AND add an editor-only notice on the burger (reuse the FR-36-9a pattern, `6ddb9f48`).

**Gate 2 uses `scripts/parity/extract-css-diff.js --scope 'dialog.sgs-nav-drawer' --open …`**
(text-keyed per rule 4a; exit 3 = VACUOUS). **The cloner's `computed-parity.js` stays untouched.**

**Design gates SIGNED — builds deferred, both edit `site-header/render.php`:** `W2-j` = **A1-lite**
(any-tier auto-scrim + relabel "Text shadow" decorative-only; **NO reshape — D402**) · new **`W2-v`**
= B1 header-offset primitive (double-correction risk audited and ABSENT; **preserve D391's
zero-when-unpinned**) · `W2-p` = B2 pill, after `W2-v`, **pill persists at mobile**.

**Bean touchpoints:** roster **10, or 11 if resn's FX prove reachable** — assess at W4-a teardown,
do NOT decide early · W4-a2 substitution policy before the first clone · W3-d blind-tester at Wave 3.

**Alternative front (independent): motion Waves B ∥ C** — prompts unchanged under `plans/`. Wave A
is CLOSED (D416/D417); its two plan files were deleted at Bean's instruction. Session record +
carry-forward rules: `memory/session-2026-07-30-motion-waveA-closeout.md`. **Before Wave B ships an
effect, prove its `data-sgs-fx-*` writer on a live page** — two Wave A defects were attribute
contracts read by code and written by nothing.

### Tooling for the next session (WordPress project — Gate 5)

**Skills:** `/strategic-plan` (Task 1's deliverable) + `/brainstorming` for any open design point ·
`/research` (auto-tiers) · `/sgs-wp-engine` (the framework skill) · `/wp-block-development` for
core-WP block-API questions · `/delegate` to pick every model · `/qc` + `/qc-inline` per the
per-task gates · `/gap-analysis` to grade the strategic plan before Bean reads it.
**MCP / tools:** Playwright MCP (live DOM + computed style on the canary) · `/sgs-db` and
`/wp-blocks` for block ground truth, never a prose count · Chrome DevTools MCP if Wave A needs
motion tracing.
**Agents:** `wp-sgs-developer` (Wave A execution) · `design-reviewer` (only once the merged plan's
clone work starts — no drawer/preset build happens before the gate is signed) · `code-reviewer`
before any shared-theme or motion commit.

### Methodology guardrails (do not skip)

- **Run `python .claude/hooks/handoff-preflight.py --check` before committing.** Six checks; a
  failure is a hard gate. `--self-test` proves it can still fail.
- **Deploy before measure** — any change that should be visible on a URL needs build + deploy +
  OPcache reset BEFORE any browser test, or the test measures stale output.
- **A scoped axe run on a CLOSED surface passes vacuously.** The openness guard only exists from
  2026-07-29; any earlier scoped drawer/mega axe result proves nothing — re-run it.
- **`seed_conformance_goldens.py --check` is NOT a dry run — it re-seeds.** It rewrote 28 goldens
  during the 2026-07-29 cull.
- **After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor** (D388 —
  two editor-killing crashes shipped past all-green gates).
- **Outcome vs completion** — code shipped ≠ outcome achieved. Map every deferral to a named spec
  STAGE, never "out of scope" (STOP-29).
- **Shared worktree** — commit by EXACT PATH, never `git add -A`; never touch the co-active track's
  uncommitted files; re-check the branch in the same command as the commit.
- **`/qc` multi-rater before every commit** touching converter / pipeline / SGS-block logic.

---
