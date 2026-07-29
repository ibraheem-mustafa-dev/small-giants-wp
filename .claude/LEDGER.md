---
doc_type: state
project: small-giants-wp
last_updated: 2026-07-29
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where things stand (2026-07-29, updated same day).** The doc system is finished and mechanically
enforced — see the sweep record at the bottom. **Spec 38 motion Wave A is SHIPPED** (Waves B/C
prompts ready). The **MERGED Spec 36+37 nav/header/footer track** now has everything it needs: you
signed the architecture gate (drawer→CPT "Menu drawer", trigger controls, clone as final proof)
AND the full strategic plan is written, peer-reviewed and graded B (D413). Next session executes
Wave 1 (fixtures). The drawer clones you rejected get NO rework until Wave 2's CPT move lands —
exactly as you decided.

**On the drawers, plainly:** the checks all passed and the clones still look nothing like the real
sites, because the checks measured whether the menu WORKS (keyboard, screen-reader, motion, no-JS),
never whether it LOOKS right — and that was written up in a way that read as if it had. Two real
faults were found afterwards and are still open: some menu text is painted the same colour as its
own background, so it is invisible rather than missing; and the "centred" style never centres its
links because the setting only centres boxes, not the menu inside them. **Nothing more gets built on
the current setup until your CPT design decision lands** — rebuilding the test pages now would be
wasted if the drawer stops being a block.

---

## ⭐ CURRENT FRONTS

> **QC-BYPASSED (2026-07-30):** handoff's independent `/qc` doc-reconcile subagent not
> dispatched (context exhausted). Mechanical gate DID pass 6/6. Unverified: that every
> progress marker matches what shipped — spot-check Track 3 vs `git log` before building.

### Track 3 — Spec 38 motion system: Wave A shipped + qc-council'd; **5 close-out items open**

`specs/38-SGS-MOTION-SYSTEM.md` is `active` (D406–D409). Wave A is on main (A1-A9), then a
2-rater cross-model **qc-council** vs a GSAP gold standard
(`reports/2026-07-29-gsap-scrolltrigger-splittext-gold-standard.md`, 32 items) closed several
real defects — see D414/D415 and `git log --grep "fix(motion)"`.

**Verified live on real SGS blocks** (all 3 arms): scrub, pin-scrub (pins at 93px, clears the
sticky header), split-reveal (a11y intact), horizontal-panel (pins + mobile reachable).
Zero GSAP bytes on a no-fx page.

**fx roster is DERIVED, not hardcoded (D414)** — `fx_effects.scope` + `.requires` seeded from
spec §2; a block qualifies when it provides what an effect requires. cta-section + trust-bar now
qualify automatically; 22 of 81 blocks carry the panel; ScrollSmoother is `scope=site` so it
cannot reach a block panel. Gate: `db-consistency/check_fx_qualifying_blocks_stale.py`.

**OPEN — 5 items, see `plans/2026-07-30-motion-wave-A-closeout-prompt.md`:**
1. **Horizontal panel travels ~264px short** (owner-reported, UNRESOLVED after 3 attempts).
   Tween reaches its target; the TARGET is wrong. Full measurements + both failed formulas are
   recorded in the block comment above `getTravelDistance()` in `fx-horizontal-panel.js` —
   **read it before trying a 4th**. Two attempts were built on a band width INFERRED as 969px
   (`1200-231`) and never measured; it is 1200.
2. Apply the matchMedia consumer change to `fx-horizontal-panel.js` (provider side shipped).
3. `fxEnd` has no control (semantics differ per effect — needs a design call); `fxTrigger` is
   registered + emitted + PHP-mirrored and read by **no** effect module.
4. Confirm the panel's desktop reduced-motion arm (one probe showed it unreachable; unconfirmed).
5. Bean's eye on the 7 `/motion-canary-*` pages (each now states its own pass/fail criteria
   on the page — the first round asked for sign-off without saying what correct looked like).

Wave B ∥ C unblocked (`plans/2026-07-29-motion-wave-B/C-session-prompt.md`).

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
but its burger trigger becomes fully controllable (word/symbol/burger + open-state morph, DP4) ·
per-property controllability contract (DP5) · **clone-first POC: studionamma 100% first — header +
drawer + footer, content/imagery/colours/typography — then the other 6** · each accepted clone
yields the B3 presets (7 cloned pairs + Utility/Overlay/Directory invented fills; Warm cut;
Q3 = retire `centred/minimal/full` starters, keep scratch + 3 search) · DP7 harness honesty gates
any re-present. **GATE SIGNED (Bean, 2026-07-29): CPT admin name = "Menu drawer" · site-wide Active
default + per-burger picker override · studionamma first. DP6 RE-SEQUENCED same day: cloning is the
FINAL PROOF GATE (inventory wave 4), NOT the opening task — matching Bean's own 2026-07-28 decision
in the inventory; FR-37-42 + DP4 trigger controls + the CPT move are prerequisites a faithful clone
needs anyway. NEXT SESSION = the full `/strategic-plan` for the merged track, scope =
`reports/2026-07-28-spec36-37-remaining-work-inventory.md`, architecture = this gate's DP1–DP7
(CPT + trigger controls + harness fixes → capability wave; mega/cart/search fixture wave first).**
B3's old standalone plan (`2026-07-28-B3-…`) is subsumed — its §7 answers are recorded in the gate §0.

**Header-track inputs shipped 2026-07-28 (D412):** FR-36-9a(2) burger-opens-nothing notice +
one-click fix LIVE on the canary (`6ddb9f48`, negative-controlled) · **FR-37-42** visual
column-shape picker APPROVED not built (`7ff5a184` — needs `1fr auto 1fr`; prerequisite for
faithful header clones) · measured reference teardowns 9/12
(`~/.claude/pipeline-state/sgs-discover/20260728-112649-7bc4a8/FINDINGS.md`; Away/ButcherBox/
rabbit.tech owed; Lama Lama sticky by Bean's eye — probe-unmeasured ≠ non-sticky) · **the merged
track's SCOPE SOURCE: `reports/2026-07-28-spec36-37-remaining-work-inventory.md`** (both specs'
remaining work verified against their own status lines) · floating UI STAYS in the Customiser.

Header residue unchanged: FR-37-26 FAIL verdict deliberately STANDS (blind-tester arm);
`P-HEADER-SIMPLICITY-FINDINGS` OPEN (findings 2 + 3).

### Track 2 — Spec 36 nav: TASK 5 ⛔ REJECTED BY BEAN 2026-07-29 — CPT design gate is next

**Bean reviewed the pairs and rejected them: "the difference between our version and theirs is night
and day" — R-31-13, the eye is co-authoritative and it overrode a 21/21 mechanical pass.** Do NOT
re-present these; every variant needs real work first. *"All of these clone attempts need huge fixes
to reach completion now."* Full narrative + evidence:
`memory/session-2026-07-29-task5-drawer-rejection.md`; decision record **D411**; measurement record
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (read its CORRECTION box first — the
"21/21 PASS" headline is true only of the checks that ran).

**⭐ THE CPT DESIGN GATE IS NOW WRITTEN (same day) — see the merged-track section above.** No
block-path rework before Bean signs it. The counterweight it preserves: a CPT changes where a
drawer LIVES, not how faithfully it PAINTS — the styling/imagery/motion gap is rendering-and-
controls work either way.

**Two defects PROVEN LIVE, both OPEN (neither fixed — they wait on the gate):**
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` — `sgs-icon-list__text` renders `rgb(58,46,38)` on a
`rgb(58,46,38)` drawer, contrast **1:1**, invisible; 6 elements across exactly the 2 dark-`footer-bg`
variants (this is what Bean saw as "arrows with no labels" — they are present, just unpainted).
`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` — the drawer emits no align class at all; `drawerAlign`
centres direct children as boxes while the nav-menu stretches full width with `text-align:start`, so
`centred-statement` renders left-aligned.

**Rework scope, PARKED BEHIND the gate** (`P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`): rebuild fixtures
to genuinely exact reference content (fail the build when label COUNT/TEXT disagree with
`reports/2026-07-28-drawer-code-extraction/*.json`) · fix the two defects above · capture real
menu-OPEN references for `two-column-editorial`, `solid-brand-light` and `buck.co` — **the capture
script must assert the panel is open before it shoots** · close the design gap Bean named (text /
border / symbol / button styling, cycling background imagery + its motion, the animated secondary
media) · only then re-present.

**Standing warnings (do not lose these):** the **axe openness guard did not exist until 2026-07-29** —
a CLOSED drawer returned `0 violations` exactly like an open one, so **every scoped drawer/mega axe
result from before that date proves nothing; re-run it** (it now reports `VACUOUS`, exit 3). Two more
harness bugs manufactured false results, both fixed: the automation's leftover cursor put a link in
`:hover` so axe measured a phantom *serious* 2.14:1 violation, and the JS-off check compared raw text
to HTML so `Arts & Culture` read as missing. **F1 `listColumns` `grid-auto-flow:row` is DOWNGRADED TO
UNDECIDED** — the "reading order is wrong" claim assumed column-wise reading; Bean's counter stands
(rows-of-2 reads correctly across rows), and there is no ground truth because the reference capture
for that exact variant failed. **F2** (header track) at 375px the theme header is `position:absolute`,
251px tall, rendering the DESKTOP logo over content. **F3** `sgs/social-icons` has no Vimeo/Dribbble slug.

**Re-runnable assets:** `plugins/sgs-blocks/scripts/nav-qa/` — `build-poc-fixtures.py`
(+`poc-content-plan.json`; `--list`/`--delete-all`), `sweep-drawer-variants.mjs`,
`shoot-drawer-pairs.mjs`, `axe-run.mjs` (guarded). Canary fixtures: pages
1892/1897/1903/1907/1914/1922/1926, multi-instance 1930, anchor probes 1932; menus 102-109.

Parked follow-ons: `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` ·
`P-NAV-MENU-LISTCOLUMNS-READING-ORDER` · `P-NAV-DRAWER-DUPLICATE-DEFAULT-REF` ·
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` · `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. None is GSAP.

### Track 1b — Spec 35: BUILD SURFACE COMPLETE

No remaining build items (closed late 2026-07-28 across ~18 delegate-routed packages; detail in the
sweep file + D400/D402/D405). Next front for this branch of work = **Spec 37 Group B proper**
(FR-37-14 is BUILT and live-proven, so Group B is UNBLOCKED) or the B3 preset library above.
Canonical: `plans/block-migration-DONE-checklist.md` + Spec 32 §6.1;
audit `.claude/reports/2026-07-26-spec32-11-condition-done-audit.md`.

### Track 1c — Spec 31 converter completion

2026-07-22 completion wave shipped (11 commits); 2026-07-23 declarative CSS-routing shipped
(D372/D373). **NEXT: (1) deploy phase-f fixtures as canary pages [gating dep], (2) wire
`check_landed()`, (3) live verify + Bean's eye — BLOCKED on the shared dirty tree
(`P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`).** Plan: `plans/2026-07-22-spec31-completion-to-100.md`.

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

## NEXT SESSION — Wave 1 of the merged track (plan landed 2026-07-29, D413)

**Where we are, plainly.** The gate is signed AND the strategic plan is written, reviewed and
graded (this session). Motion Wave A shipped separately (commits `e991b8f6`…`16e4b00e`; Waves B/C
prompts exist under `plans/`). The next session **executes, not plans**: open
`plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`, hand Wave 1 to `/phase-planner`
(the plan's Wave-1 handoff block names the entry context), then run the fixture wave —
first action is ≤5 min and self-contained in the plan's "First action" section (canary mega
panel 1745). Delegate per the plan's parallel-opportunities notes; `/qc` before any
converter/pipeline/SGS-block commit.

**Bean touchpoints queued:** confirm the 10-clone roster at Gate 1 · sign the W4-a2
substitution policy before the first clone · W3-d blind-tester session (booked at Wave 3 close).

**Alternative front (independent):** motion Waves B ∥ C per their session prompts.

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
