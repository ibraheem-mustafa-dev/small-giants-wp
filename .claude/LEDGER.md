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

**Where things stand (2026-07-30, end of Wave 2 session 2).** Wave 1 is finished, the measuring
equipment is honest (session 1), and **the slide-out menu now has its own edit screen** — Wave 2's
main job. It is live on the test site.

**What changed for you.** The slide-out menu used to exist only *inside* a header layout — eight
header designs each carrying a private copy. Now there is a **"Menu drawers"** screen under SGS,
like Advanced Headers/Footers: pick one, mark it Active, it appears site-wide. The "Set as active"
button, Preview-on-site link and starter picker all came free from existing machinery. **Nothing was
taken away** — the old way still works alongside it, and with no drawer Active the homepage came back
**byte-for-byte identical**. Full record: `reports/2026-07-30-w2a-gate2-drawer-cpt.md` · D419.
**Not yet judged: how the drawer LOOKS** — that is still the version you rejected.

**Your header-wrapping report is diagnosed and the fix is designed + signed.** It was never a
space problem: a rule tells the row to stack below 767px, and it fires even when everything fits
(at 766px the contents need 733px and have 766px). It hits desktop too because the rule measures
the row, not the screen. Design: `plans/2026-07-30-header-row-fit-cascade-design.md` · D420.
**Built next session — nothing is built yet.**

---

## ⭐ CURRENT FRONTS

> **Standing caveat on motion Wave A evidence:** its probes are re-runnable and committed, but their
> JSON output is not — the tables in
> `reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md` are transcribed readings. Call
> it re-runnable evidence, not reproducible proof. (The 2026-07-30 second-pass QC came back CLEAN;
> narrative in `memory/session-2026-07-30-motion-waveA-closeout.md`.)

### Track 3 — Spec 38 motion system: **WAVE A CLOSED 2026-07-30** (D414–D417)

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. Wave A + close-out shipped, live-verified and
**owner-confirmed** — including two defects Bean's eye caught after every mechanical check read
green. Its plan files were deleted at his instruction. **Full record + carry-forward rules:**
`memory/session-2026-07-30-motion-waveA-closeout.md`.

⚠ Parked, not caused by this work: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE`. Also open: `/sgs-update` Stage 11 warns on the
mega-* container roster (nav track's blocks — not ours to reconcile).

Next motion front = Waves B ∥ C.

### Tracks 2 + 2b MERGE (Bean, 2026-07-29) — ONE nav/header/footer track; **STRATEGIC PLAN LANDED (D413)**

**⭐ THE PLAN: `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`** — 5 waves (fixtures →
capabilities incl. drawer CPT → polish → 10-clone proof gate → Spec 33 Part 2 walker), peer-reviewed,
gap-graded B. Criteria: `verify/merged-spec36-37-track.md`. **Wave 1 CLOSED; Wave 2 in progress
(W2-i + W2-a done).** Effort forecast 18–22 taxed sessions.

**The SIGNED gate that produced it:**
`plans/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`. Binding locks: merged 36/37
EXECUTION (specs stay separate docs; §1.2 cross-amend keeps them coupled) · drawer → CPT
(`variantPreset` dies, 7 looks become starter patterns, `drawerRef` becomes a post picker) ·
nav-menu stays a BLOCK with a fully controllable burger trigger (DP4) · per-property
controllability contract (DP5) · each accepted clone yields the B3 presets · DP7 harness honesty
gates any re-present. **Bean-signed: CPT admin name "Menu drawer" · site-wide Active default +
per-burger override · studionamma first. DP6 RE-SEQUENCED — cloning is the FINAL PROOF GATE
(wave 4), NOT the opening task.**

**Header-track inputs shipped 2026-07-28 (D412):** FR-36-9a(2) burger-opens-nothing notice live
(`6ddb9f48`) · **FR-37-42** column-shape picker APPROVED not built (`7ff5a184` — needs
`1fr auto 1fr`; a faithful-header-clone prerequisite) · teardowns 9/12
(`~/.claude/pipeline-state/sgs-discover/20260728-112649-7bc4a8/FINDINGS.md`; Away/ButcherBox/
rabbit.tech owed = W4-a; Lama Lama sticky by Bean's eye — probe-unmeasured ≠ non-sticky) · **SCOPE
SOURCE: `reports/2026-07-28-spec36-37-remaining-work-inventory.md`** · floating UI STAYS in the
Customiser.

Header residue: FR-37-26 FAIL verdict deliberately STANDS (blind-tester arm);
`P-HEADER-SIMPLICITY-FINDINGS` OPEN (findings 2 + 3).

### Track 2 — Spec 36 nav: TASK 5 ⛔ REJECTED BY BEAN 2026-07-29; W2-a CPT SHIPPED 2026-07-30

**Bean rejected the pairs: "night and day" — R-31-13, the eye is co-authoritative and it overrode a
21/21 mechanical pass. Do NOT re-present these; every variant needs real work first.** Narrative:
`memory/session-2026-07-29-task5-drawer-rejection.md` · **D411** ·
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (read its CORRECTION box first — the
"21/21 PASS" headline is true only of the checks that ran). **The counterweight, still binding: a
CPT changes where a drawer LIVES, not how faithfully it PAINTS** — W2-a (D419) proved the mechanism
and claims nothing about the look.

**Two defects PROVEN LIVE, both OPEN, fixes scheduled W2-g/W2-h** (details in their parking
entries): `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (6 elements at **1:1** contrast on the 2
dark-`footer-bg` variants — Bean's "arrows with no labels"; **now harness-detectable**, D418) ·
`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` (no align class emitted, so `centred-statement` renders
left-aligned).

**Rework scope:** parking `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`. **The capture script must assert
the panel is OPEN before it shoots** — enforced since D418 on BOTH sides with a non-zero exit; an
unassertable reference returns UNVERIFIED.

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
as canary pages [gating dep], (2) wire `check_landed()`, (3) live verify + Bean's eye — was BLOCKED
on the shared dirty tree (`P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`); the isolated-worktree deploy
proven 2026-07-30 routes around it.** Plan: `plans/2026-07-22-spec31-completion-to-100.md`.

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

**Indus "Our Brands" clone — DONE (D343).** Remaining Indus tasks (Bean-directed):

- **A — core→SGS migration.** (1) build `migrate-core-blocks/pairings/separator_pairing.py` (does
  NOT exist — follow `heading_pairing.py`); (2) **re-add** `sgs/separator`→`core/separator` to
  `block-replacements.json` + `/sgs-update` (reverted `49e6fc4f`: build-blocked with no pairing);
  (3) migrate the 4 theme patterns still on `core/separator` (`footer-centred`, `footer-columns`,
  `mega-menu-split-info-cta`, `pricing-columns`); (4) **page 13**: "Our Brands" band `core/group` →
  `sgs/container` (`verticalAlign:center`, drop the padding fudge) + audit for remaining core blocks.
- **B — wire `lint-theme-css-hardcodes.py` into prebuild** (runnable, not gated).
- **C — deferred:** Services 768 overflow (hardcoded `139/250/123/187=771px` columns →
  responsive `fr`); Services button-border decision; Task-2 detection-method brainstorm.

**Header/footer goals (sequenced):**
1. **Step 1 — SPLIT framework vs per-site header/footer.** `footer-indus-foods.php` DELETED
   (`94ab240f`). To do: decide the per-site channel (JSON snapshot vs REST); gitignore per-site
   files. Do this BEFORE goals 4/1 so they write to the per-site channel.
2. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`): fix
   its 2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns; maps the
   hamburger to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/nav-menu` + `sgs/nav-drawer`;
   `sgs/adaptive-nav` also deleted, D362). Bean's heading eye pass (R-31-13) lands here.
3. **Goal 1 — replicate the Indus header/footer.** BASELINE = the preserved hand-built Astra site
   https://lightsalmon-tarsier-683012.hostingersite.com/ (NOT `mockups/*.html`). Capture AS A FILE
   FIRST (`reports/visual-diff/header-footer-baseline-indus.json`). Open defects: logo mobile-tier
   switch; buttons/rows/bg not preserved; sticky+shrinking header; mega-menu on mobile+desktop.
   NEW: `P-INDUS-BRANDSTRIP-OVERFLOW-9PX`.
4. **Goal 3 — de-hardcode base blocks.** `site-header/edit.js` + `site-footer/edit.js` TEMPLATEs +
   row blocks — remove hardcoded content (NOT "empty containers"). REMOVE the `Quick Links`/
   `Contact`/`Opening Hours` headings from `framework-footer-default` (rich versions are opt-in
   patterns). Register: `plans/strategy/2026-07-15-header-footer-hardcoding-register.md`.

**Open reconciliation:** Track B (`feat/track-b-content-restore`, Indus page content) unmerged/
paused — check its branch state before touching its files.

**Standing programmes (closed — pointers only):** no-inline COMPLETE bar 5 block-fixes
(`reports/2026-07-26-spec32-11-condition-done-audit.md`) · Spec 30 COMPLETE (D220) · L1–L4 DONE
(D290). Parked, not ours: `P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

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

## NEXT SESSION — Wave 2 unit `W2-b` (per-burger `drawerRef` picker). `W2-a` + GATE 2 CLOSED 2026-07-30

**Wave 1 · `W2-i` · `W2-a` all CLOSED.** W2-a = `bd67a641`, deployed to sandybrown, **GATE 2 PASSED
on the MECHANISM, not fidelity** — evidence + every negative control in
**`reports/2026-07-30-w2a-gate2-drawer-cpt.md`** + **D419**; read before starting. Plan:
`~/.claude/plans/spec-36-37-iterative-kahn.md`. Gate 2 says nothing about how the drawer LOOKS —
still the rejected D411 design; **Bean's eye (R-31-13) not yet given** on
`reports/visual-diff/w2a-cpt-drawer-open-390.png`. Landmark blocker negative-control proven: guard
off → **2** `<dialog id="sgs-nav-drawer">`, guard on → **1**.
**Canary fixtures:** `sgs_drawer` **2056** published + **ACTIVE** · page **2058**
`/w2a-gate2-precpt-drawer/` = pre-CPT parity subject, keep for W2-b/W2-d.

**⭐ START HERE — the HEADER-ROW FIT CASCADE (Bean-raised 2026-07-30, design SIGNED, D420).**
It jumps the queue ahead of W2-b: it is a live visible defect on every header, and Bean reported it.
**Root cause PROVEN, not inferred:** `site-header-row/style.css`'s `@container (max-width:767px)`
sets `flex-basis:100%` on every child, so the row STACKS — at 766px the children need 733px and
have 766px, i.e. they FIT and it stacks anyway. Hits desktop too (the query reads the ROW's width,
not the viewport). Design + build order + verification bar:
**`plans/2026-07-30-header-row-fit-cascade-design.md`** · **D420**.
Build stages 1-3 (CSS only): delete the `flex-basis` block + `nowrap`; `shrinkRole` attr with
type-derived defaults + inspector override; fluid `clamp()` with a MANDATORY `rem` component
(unit-only breaks browser zoom, WCAG 1.4.4) + 44px floor. Stage 4 (JS More-menu inside
`sgs/nav-menu`) is deferred until Bean has seen stages 1-3 live.
**⚠ Verify with a width SWEEP, never 3 fixed tiers — this defect lived BETWEEN the tiers** — plus a
negative control that re-injects the rule and proves the sweep fails.

**Orchestration — Task 1 (header fit cascade).** Execution: **inline, Opus** (shared mechanism on
every header; R-31-9 universality judgement + the device-tier-vs-visual-breakpoint call are exactly
the "a mechanical agent CANNOT make this judgment" class). Depends on: none. Parallel with: none.
`/qc-council` gate BEFORE commit (shared mechanism). **Acceptance:** the 766px cliff is gone on a
continuous width SWEEP 1400→320px — row height constant, `scrollWidth ≤ clientWidth` throughout —
AND the negative control (re-inject the rule) makes that sweep FAIL, AND 200% zoom still reaches
full text size, AND every interactive child ≥44px at every swept width, AND Bean's eye at 390/1440.
Code shipped ≠ done here: stage 4 (JS More-menu) stays named and deferred, never "out of scope".

**Then `W2-b`** (execution: inline, Opus; depends on Task 1 only for tree-cleanliness): re-type
`drawerRef` from DOM-id string to a drawer-POST reference with a picker (Spec 36 clause 3). The
per-request burger registry in `class-sgs-drawer-render.php` was built to carry requested post ids
with no re-architecture — its intended next use. Then W2-c (7 starter looks), W2-d (8 patterns drop
their embedded drawer + `variantPreset` retires). **W2-d is the first DESTRUCTIVE step — re-run
Gate 2 before it.**

**Both Gate-2 harness residuals are FIXED, not parked** (`29f732a8`): `extract-css-diff.js` prints a
MEASURED n/N tally and fails closed when a requested breakpoint went unmeasured
(`--allow-unmeasured` accepts knowingly; `measured==0` always exits 3); `openSurface()` separates
"trigger hidden here" (UNMEASURED) from "visible and won't open" (VACUOUS) — guard self-test 10/10.
`check-markup-neutral.py` (self-test 6/6) gives the visual-diff gate a deterministic path for
PHP-only no-output changes, so `--no-verify` is no longer the escape. **Its hook wiring lives in the
UNTRACKED `.git/hooks/pre-commit` — local only; the checker is tracked, re-wiring is six lines.**

**Gate 2 instrument:** `extract-css-diff.js --scope 'dialog.sgs-nav-drawer' --open
'.sgs-nav-menu__burger'` — `--open` takes the **TRIGGER**, not the surface; only 375px has an open
state (burger CSS-hidden at/above `collapsePoint` 768). **Cloner's `computed-parity.js` untouched.**

**Design gates SIGNED — builds deferred, both edit `site-header/render.php`:** `W2-j` = **A1-lite**
(any-tier auto-scrim + relabel "Text shadow" decorative-only; **NO reshape — D402**) · new **`W2-v`**
= B1 header-offset primitive (double-correction risk audited and ABSENT; **preserve D391's
zero-when-unpinned**) · `W2-p` = B2 pill, after `W2-v`, **pill persists at mobile**.

**Bean touchpoints:** roster **10, or 11 if resn's FX prove reachable** — assess at W4-a teardown,
not early · W4-a2 substitution policy before the first clone · W3-d blind-tester at Wave 3.

**Alternative front (independent): motion Waves B ∥ C** — prompts unchanged under `plans/`. Session
record +
carry-forward rules: `memory/session-2026-07-30-motion-waveA-closeout.md`. **Before Wave B ships an
effect, prove its `data-sgs-fx-*` writer on a live page** — two Wave A defects were attribute
contracts read by code and written by nothing.

### Tooling for the next session (WordPress project — Gate 5)

**Skills:** `/brainstorming` · `/gap-analysis` · `/lifecycle` · `/research` (auto-tiers) ·
`/strategic-plan` · `/sgs-wp-engine` · `/wp-block-development` · `/delegate` · `/qc-council`
(Task 1's pre-commit gate — shared mechanism).
**MCP / tools:** Playwright MCP (live DOM + computed style on the canary — the width sweep needs it)
· `/sgs-db` + `/wp-blocks` for block ground truth, never a prose count.
**Agents:** `wp-sgs-developer` (build execution) · `code-reviewer` before any shared-theme commit ·
`design-reviewer` once clone work starts.

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
