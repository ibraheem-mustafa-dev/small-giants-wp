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

**What changed for you.** The slide-out menu now has its own **"Menu drawers"** screen under SGS,
like Advanced Headers/Footers: pick one, mark it Active, it appears site-wide. Nothing was taken
away — the old way still works alongside it, and with no drawer Active the homepage came back
**byte-for-byte identical**. Record: `reports/2026-07-30-w2a-gate2-drawer-cpt.md` · D419.

**Three things you raised are diagnosed and waiting, none built.**
1. **Header wrapping** — never a space problem. A rule tells the row to stack below 767px and fires
   even when everything fits (at 766px the contents need 733px of 766px). Hits desktop too because
   it measures the row, not the screen. Designed + signed: D420.
2. **Drawer architecture** — you rejected my shared-header-row idea and were right; **the spec
   agrees with you**, not me. Held over as next session's FIRST task with your objections recorded
   in full: `plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md` · D421.
3. **The drawer's ugly scrollbar is not the drawer's** — it paints none. It is the page's permanent
   14px scrollbar strip sitting beside it, doing nothing.

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
EXECUTION (§1.2 cross-amend couples the two specs) · drawer → CPT (`variantPreset` dies, 7 looks
become starter patterns, `drawerRef` becomes a post picker) · nav-menu stays a BLOCK with a
controllable burger trigger (DP4) · per-property controllability contract (DP5) · DP7 harness
honesty gates any re-present. **Bean-signed: admin name "Menu drawer" · site-wide Active default +
per-burger override · studionamma first. DP6 — cloning is the FINAL PROOF GATE (wave 4), NOT the
opening task.**

**Header-track inputs shipped 2026-07-28 (D412):** FR-36-9a(2) notice live (`6ddb9f48`) ·
**FR-37-42** column-shape picker APPROVED not built (`7ff5a184` — needs `1fr auto 1fr`; a
faithful-header-clone prerequisite) · teardowns 9/12
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
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (read its CORRECTION box first). **Still
binding: a CPT changes where a drawer LIVES, not how faithfully it PAINTS** — W2-a (D419) proved the
mechanism, not the look.

**Two defects PROVEN LIVE, both OPEN, fixes scheduled W2-g/W2-h** (details in their parking
entries): `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (6 elements at **1:1** contrast on the 2
dark-`footer-bg` variants — Bean's "arrows with no labels"; **now harness-detectable**, D418) ·
`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` (no align class, so `centred-statement` renders left).

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

> **⭐⭐ NEXT SESSION — ONE DEPLOY UNBLOCKS FOUR THINGS (2026-07-30).** The 9 FR-32 inline fixes
> are WRITTEN, in the working tree, and banked as `.claude/reports/2026-07-30-fr32-inline-fixes.patch`
> — but **uncommittable**: the visual-diff gate correctly blocked them (markup changes,
> `check-markup-neutral.py` NOT-neutral on all 7 blocks, no deploy to evidence it; a PASS report
> was NOT fabricated). Sequence: isolated-worktree build → deploy sandybrown → **open the REAL
> editor** (never done for Spec 35) → 7 visual-diff reports → commit blocks → promote
> `check-no-inline.py --deep` to default (today it correctly flags the 16 stale card-grid hits the
> patch fixes). ⚠ 5 of the 8 blocks sit on NO canary page — needs a seeded canary, not code.
>
> **⭐ TRACK 1 AUDIT — read before calling any Track-1 item done:**
> `reports/2026-07-30-track1-verification-audit.md`. Specs 31/32/35 read end-to-end; 3 findings
> WITHDRAWN there (don't re-raise). Almost nothing is unbuilt; what's missing is **verification**.
> No parking entries created — that report is the record.

### Track 1b — Spec 35: COMPONENT LAYER + Part-K gate complete; ROLLOUT is not

Components + the fail-closed gate ARE done (D400/D402/D405). **"No remaining build items"
RETRACTED 2026-07-30**: Part I lists 2 open (Spacing token, Dynamic content), Part-L rollout is
4–32%, T1 parity 140 unexplained gaps, and **no Spec 35 work has ever been opened in the real
editor** (Part M's own words; D388). Register: the Track 1 audit above. Next = Spec 37 Group B.

### Track 1c — Spec 31 converter completion

Completion wave + declarative CSS-routing shipped (D372/D373). **The three "NEXT" items this cell
carried until 2026-07-30 were ALL ALREADY DONE** — phase-f canaries deployed 2026-07-23
(`oracle/fixture-canary-urls.json`, 35 URLs), `check_landed()` wired
(`ledger/coverage_check.py:386`, called `:857`), live verify ran 2026-07-24/25. **The real open
item is PROOF, not build:** the C2 "0 WRITTEN-not-LANDED" claim in Spec 31's v0.6 front-matter is
backed only by a prose note inside the same commit that made the fix, while the committed
artefact (`batch-report.json`, last written `1669a785`) still shows 2 WRITTEN-not-LANDED + 36
UNVERIFIED — and Spec 31 §5 defines completion as **zero UNVERIFIED cells**. Re-run the batch +
`coverage_check.py --with-landed --check` and COMMIT the artefacts. Full register:
`reports/2026-07-30-track1-verification-audit.md`. Plan:
`plans/2026-07-22-spec31-completion-to-100.md`.

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

## Product queue (the website-builder work)

**LIVE backlog, split out 2026-07-30 to keep this file under its cap — not archived:**
**`plans/strategy/product-queue.md`**. Holds the Indus core→SGS migration (A/B/C), the four
sequenced header/footer goals, and the Track B reconciliation. Reconcile before acting — some of
it is already live.

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

**None.** Known-open items are the Product queue + `parking.md`.

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

**⭐⭐ TASK 1 — HOLD THE DRAWER-ARCHITECTURE DESIGN GATE (Bean-directed, D421). Nothing decided,
nothing built.** Bean REJECTED the shared-header-row proposal and judged there was too little
context left for a proper gate, so he made it next session's opening task. **His contentions are
recorded in full in `plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md` — read it and run
the gate FROM his position; do not open by proposing a solution.** The spec (FR-36-6: "One
InnerBlocks container … templateLock:false", full-screen `<dialog>` modal) **backs HIM, not the
rejected proposal** — the right shared primitive is `sgs/container`, not `sgs/site-header-row`.
Already measured so the gate need not re-derive: **7 of his 8 named controls exist** (only the
top row logo+close sharing a background is missing) · **the ugly scrollbar is the PAGE's inert 14px
gutter, not the drawer's** (drawer scrollbar width = 0) · **mega panels do NOT overflow the drawer**
(285px in 340px). Gate needs `/brainstorming` + `/research-buddies` + `/gh-research` + a council,
then amend FR-36-6 (its default template order IS the logo bug) in the same commit.

**⭐ TASK 2 — the HEADER-ROW FIT CASCADE (design SIGNED, D420).** A live visible defect on every
header, Bean-reported, ahead of W2-b. **Root cause PROVEN:** `site-header-row/style.css`'s
`@container (max-width:767px)` sets `flex-basis:100%` on every child, so the row STACKS — at 766px
the children need 733px of 766px available, i.e. they FIT and it stacks anyway. Hits desktop too
(the query reads the ROW's width, not the viewport). Build order + verification bar:
**`plans/2026-07-30-header-row-fit-cascade-design.md`** · **D420**. Stages 1-3 are CSS-only; stage 4
(JS More-menu in `sgs/nav-menu`) waits until Bean has seen 1-3 live.
**⚠ Verify with a width SWEEP, never 3 fixed tiers — this defect lived BETWEEN the tiers** — plus a
negative control that re-injects the rule and proves the sweep fails.

**Orchestration.** **Task 1 (drawer gate):** inline, Opus + research subagents + a council. Depends
on: none. Deliverable = a SIGNED design + amended FR-36-6, **not code**. Acceptance = Bean picks
from ranked options and the spec is amended in the same commit. **Task 2 (fit cascade):** inline,
Opus (the R-31-9 and device-tier-vs-visual-breakpoint calls are the "a mechanical agent CANNOT make
this judgment" class); `/qc-council` BEFORE commit. **Acceptance:** the 766px cliff is gone on a
continuous SWEEP 1400→320px — row height constant, `scrollWidth ≤ clientWidth` throughout — AND the
negative control (re-inject the rule) makes that sweep FAIL, AND 200% zoom still reaches full text,
AND every interactive child ≥44px at every swept width, AND Bean's eye at 390/1440. Stage 4 stays
named and deferred, never "out of scope".

**Then `W2-b`** (inline, Opus; after Tasks 1-2): re-type
`drawerRef` from DOM-id string to a drawer-POST reference with a picker (Spec 36 clause 3). The
per-request burger registry in `class-sgs-drawer-render.php` was built to carry requested post ids
with no re-architecture — its intended next use. Then W2-c (7 starter looks), W2-d (8 patterns drop
their embedded drawer + `variantPreset` retires). **W2-d is the first DESTRUCTIVE step — re-run
Gate 2 before it.**

**Both Gate-2 harness residuals FIXED, not parked** (`29f732a8`): `extract-css-diff.js` prints a
MEASURED n/N tally and fails closed on any unmeasured requested breakpoint (`--allow-unmeasured`
accepts knowingly; `measured==0` always exits 3); `openSurface()` separates "trigger hidden here"
(UNMEASURED) from "visible and won't open" (VACUOUS) — self-test 10/10. `check-markup-neutral.py`
(6/6) gives the visual-diff gate a deterministic path for PHP-only no-output changes, retiring
`--no-verify`. **Hook wiring is in the UNTRACKED `.git/hooks/pre-commit` — local only; the checker
is tracked, re-wiring is six lines.**

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
