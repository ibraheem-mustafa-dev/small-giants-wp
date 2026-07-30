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

**Where things stand (2026-07-30, close of the motion Wave B session).** Three tracks are live and
independent — pick one, they do not block each other.

**What changed for you today. Smooth scrolling is built and live on the test site** — off by
default, zero cost when unused, its own **SGS → Motion** screen, set to strength 3 after 4 felt
sluggish. The touch version you asked for was built, you tried it on your phone and rejected it; it
is off and labelled "tested and rejected" so nobody suggests it again. Built with a **different
library than planned** — the planned one puts the page in a moving box, which silently breaks your
sticky header, so it and all the work that existed only to dodge that were dropped. Your header was
not touched, and was re-tested afterwards. Record:
`memory/session-2026-07-30-motion-waveB-commit1.md` · D422.

**Also finished today: page transitions** — pages now blend into each other instead of jumping,
when you switch it on. Off by default, and you can pick a different look per page type (or none).
It costs **nothing extra to load** — the browser does it itself, so no code is downloaded for it.
Anyone whose device asks for reduced motion never sees it. **That closes this motion wave.** The
test site has it on so you can look: a soft fade everywhere, a slide on pages. D424.

**Still waiting, none built:**
1. **Header stacking on mobile** — you raised this again today. It is **diagnosed and signed off but
   never built** (D420): a rule stacks the header below 767px even when everything fits. Still a
   visible defect on every header.
2. **Drawer architecture gate** — your objections recorded in full;
   `plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md` · D421.
3. **Track 1 verification debt** — code exists, proof does not (D423).

---

## ⭐ CURRENT FRONTS

> **Standing caveat (motion Wave A evidence):** probes are re-runnable and committed, their JSON
> output is not — `reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md` holds
> transcribed readings. Re-runnable evidence, not reproducible proof.

### Track 3 — Spec 38 motion: **WAVE A CLOSED** (D414–D417) · **WAVE B CLOSED 2026-07-30 (D422 + D424)**

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. **Both waves CLOSED.** Wave A: D414–D417
(`memory/session-2026-07-30-motion-waveA-closeout.md`). Wave B: smooth scrolling via **Lenis, NOT
ScrollSmoother** (D422, `memory/…-waveB-commit1.md`) + **page transitions** (D424, `984f2944`,
`memory/…-waveB-commit2.md`, evidence `reports/2026-07-30-motion-waveB-page-transitions-verification.md`).

**Standing constraints — read before touching motion:**
- **⛔ D407 / Spec 38 §4.2 SUPERSEDED — build items CANCELLED, not deferred.** Wrapper filter,
  header relocation, per-tier edge rule, `findStickyBreakingAncestor()` extension existed ONLY to
  dodge ScrollSmoother's transform; Lenis has none. **Spec 37 FR-37-40 NOT modified; the warn-only
  guard stays. Do not build any of it.**
- **Tier H** = CLOSED list (Lenis alone), §1.2a admission test, one D per member.
- **Touch smoothing REJECTED by Bean on a real phone.** Default OFF, labelled tested-and-rejected.
  **Do not re-propose without new real-device evidence.**
- Page transitions target the `root` pair, NOT per-element `view-transition-name`; reduced motion
  gates the **opt-in itself** (as WP core does); `mix-blend-mode:normal` is deliberate, not spare.

**Owed:** **Bean's eye (R-31-13)** — canary is ON (site `fade`, `page → slide`, smoothing on).
Un-run: Firefox (no support — plain navigation IS the fallback), Safari, hide-on-scroll × drawer via
the SETTING, the 2rem slide trailing edge.

⚠ Parked, not ours: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE` · `/sgs-update` Stage 11 mega-* warnings.
Next motion front = **Wave C** (Draggable roster + before-after, Flip pairing, DrawSVG + Vivus retirement, MorphSVG, ScrambleText, image-sequence).

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

> **⭐ The Track-1 "one deploy unblocks four things" plan lives in the `## NEXT SESSION` section
> below — it was duplicated here verbatim and the copy was removed 2026-07-30 (de-dup only, no
> content lost; the LEDGER was over its byte cap).** Read before calling any Track-1 item done:
> `reports/2026-07-30-track1-verification-audit.md` (3 findings WITHDRAWN there — don't re-raise).

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

**Standing programmes (pointers only):** no-inline — the SUPPORTS migration is complete, but
**11 inline FR-32 sites across 9 blocks were found 2026-07-30** (10 fixed-not-committed, 1 still
live: `cta-section:333`) — the old "COMPLETE bar 5 block-fixes" line is SUPERSEDED by
`reports/2026-07-30-track1-verification-audit.md` · Spec 30 COMPLETE (D220) · L1–L4 DONE
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

## NEXT SESSION — CLOSE ALL FOUR TRACK-1 POINTS. **Start in PLAN MODE; decompose it yourself.**

**Read FIRST:** `reports/2026-07-30-track1-verification-audit.md` (the register — it records three
findings as WITHDRAWN; do not re-raise them) + **D423**. Narrative + the swept nav/drawer front:
`memory/session-2026-07-30-track1-verification.md`.

**You are the SGS framework engineer closing a verification debt.** Almost nothing here is
unbuilt — what is missing is PROOF. Plan the order yourself, optimising for delegation and
parallel agents; the constraint below is the only fixed one.

**⛔ THE LOAD-BEARING CONSTRAINT: ONE DEPLOY UNBLOCKS POINTS 1 + 2 — they are COUPLED.** Last
session assumed they were separable and was proven wrong by a gate: the FR-32 fixes change
markup, so the visual-diff gate demands visual evidence, which needs a build + deploy. Points 3
and 4 are genuinely separable and can run in PARALLEL with the deploy work.

**Point 2's code already exists** — live in the working tree AND banked at
`.claude/reports/2026-07-30-fr32-inline-fixes.patch` (8 files, **10 sites — NOT all 11**). `php -l` clean, `phpcs`
no new violations. It is UNVERIFIED visually — that is the whole remaining job.

### The four points

| # | Work | State | Coupling |
|---|---|---|---|
| 1 | Open the REAL block editor on the ~18-package Spec 35 wave + D372's owed BoxControl check | NOT STARTED | needs deploy |
| 2 | Fix `cta-section:333` (MISSED — see below), then commit all 11 FR-32 sites + promote `--deep` | code written, gate-blocked | needs the SAME deploy |
| 3 | Triage Spec 31 C2's 33 UNVERIFIED / 33 GUARD-FAIL / 393 unattributed cells | measurement banked (`aa45737d`) | independent |
| 4 | 140 unexplained feature-parity gaps across 22 blocks + wire the audit into prebuild | NOT STARTED | independent |

### Orchestration (suggested — improve it if you can justify it)

- **Deploy chain (1+2), INLINE + Opus, sequential:** isolated worktree (the tree is SHARED and the
  motion track holds WIP) → `build-deploy.py --target sandybrown` → **open the real editor** →
  7 visual-diff reports → commit the blocks → flip `--deep` to default + re-baseline.
  **Delegate the visual-diff report generation** (mechanical, per-block, parallel-safe).
  ⚠ **NEVER fabricate a PASS report** — that is exactly what this gate exists to stop, and the
  reason point 2 is still open.
- **Point 3, DELEGATED (sonnet), parallel with the deploy:** triage the non-LANDED cells. Expect
  ~30 of 33 GUARD-FAILs to be the five `rt-*` red-team fixtures behaving as designed — the real
  question is the 393 unattributed. Spec 31 §5 defines completion as ZERO UNVERIFIED.
- **Point 4, DELEGATED (sonnet), parallel:** classify the 140 gaps as REAL vs OVER-REPORT before
  fixing anything. Several look like naming artefacts (`sgs/quote: citation/value`, `sgs/text:
  content` are core's content attrs that SGS models differently). Record every verdict in
  `feature-parity-exceptions.json`, which currently has ZERO block entries.
- **`/qc` multi-rater before any commit** touching block render or converter logic.

### Acceptance (measurable — not "code shipped")

1. The editor opens clean on every block touched by the Spec 35 wave; any crash is fixed or parked
   with a named cause. 2. `check-no-inline.py --live-default --deep` exits 0 against the FRESH
deploy, and `--deep` is the default. 3. Every one of the 7 blocks has an HONEST visual-diff report.
4. Spec 31's UNVERIFIED count is either ZERO or each residual cell has a named reason.
5. Each of the 140 parity gaps is REAL-and-fixed, or recorded as an exception with a wave.

### Guardrails (do not skip)

- **Deploy before measure.** `batch_runner.py` and `check-no-inline.py` both probe DEPLOYED pages.
  Measuring before deploying measures stale output — that is why `--deep` reports 16 stale
  card-grid hits today.
- **Shared worktree.** Commit by EXACT PATH, never `git add -A`; never touch the motion track's
  files; re-check the branch in the SAME command as the commit. Use an isolated worktree to build.
- **5 of the 8 fixed blocks are on NO canary page** — no scan mode can verify them. That needs a
  seeded canary page, not a code change (`P-NO-INLINE-GATE-COVERAGE-GAPS` item 1).
- **After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor** (D388 —
  two editor-killing crashes shipped past ALL-GREEN gates).
- **`python .claude/hooks/handoff-preflight.py --check` must pass before committing.**
- **Four phantom parking slugs were found last session.** Before citing any `P-` slug, confirm it
  resolves in `parking.md` or `memory/parking-archive.md`. Adding that check to
  `handoff-preflight` is the cheapest durable fix and is still OWED.

**Alternative front (independent, was the previous front): the nav/drawer Track 2 work** — the
D421 drawer-architecture design gate + the D420 header-row fit cascade. Full detail preserved in
`memory/session-2026-07-30-track1-verification.md` + D419/D420/D421 +
`plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md`.

### Tooling for the next session (WordPress project — Gate 5)

**Skills:** `/strategic-plan` (decompose the 4 points — the session OPENS in plan mode) ·
`/dispatching-parallel-agents` (points 3 + 4 run parallel to the deploy chain) · `/delegate` (pick
a model per branch) · `/brainstorming` · `/gap-analysis` · `/lifecycle` · `/research` (auto-tiers) ·
`/sgs-wp-engine` · `/wp-block-development` · `/wp-sgs-deploy` (the deploy ceremony) · `/qc-council`
(before any block-render or converter commit) · `/visual-qa` (the 7 owed reports).
**MCP / tools:** **Playwright MCP** — the editor-canvas check (point 1) is a browser job, not a
static one · `/sgs-db` + `/wp-blocks` for block ground truth, never a prose count ·
`build-deploy.py --target sandybrown` is the ONE deploy path (never hand-roll tar/scp — D336).
**Agents:** `wp-sgs-developer` (deploy + block execution) · `code-reviewer` before any shared
commit · `design-reviewer` for the visual-diff reports · `general-purpose` ×2 for points 3 and 4.

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
