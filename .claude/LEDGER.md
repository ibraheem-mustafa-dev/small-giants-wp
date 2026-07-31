---
doc_type: state
project: small-giants-wp
last_updated: 2026-07-31
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or
you) gets ONE true answer instead of three drifting ones.

**Where things stand (2026-07-31, evening).** Today's motion "Wave D" register — the 24-step
list of everything left before the motion system is client-ready — got its first pass. Six
steps are genuinely finished, one pair is correctly on hold, and the rest haven't started yet.
**Corrected 2026-08-01 (D435): it is EIGHT, not six.** Steps 1 and 14 closed in commit `0628800a`,
four minutes after this file was last written, so the table below said "not started" about finished
work. A `/qc-council` caught it. Nothing was lost — the docs were behind the code, not ahead of it.
Two things need your decision before work continues, and one honest limitation was found in the
testing tools themselves (recorded below so nobody re-discovers it the hard way).

**Closed today:** the draw/morph/motion-path menu now only offers what a block can actually do
(no more "draw a path" option on things with no path); the fx picker's dead-control gate no
longer produces 27 false alarms; motion presets (Subtle/Standard/Dramatic) now sit in five real
page patterns, and the bug hiding them from view is fixed; the keyboard story for pinned panels
is measured properly, not guessed; a webpack quirk that was silently turning "only load this
code when needed" into "load it always" is fixed; the image-sequence block is locked down to
agency-only with a frame cap and a working self-check button.

**On hold, correctly:** the shopping-cart drag control. The automatic safety check refused to
let it ship because it couldn't prove it worked yet — that check did its job.

**Two decisions waiting on you:**
1. A background-that-follows-your-cursor effect — three build routes, no build started. Read
   `plans/2026-07-31-step7-cursor-follow-background-design-gate.md` and pick one.
2. A colour-swap (Flip) effect that was ruled dead on 2026-07-27 needs to come back onto the
   plan — it was dropped by mistake, not by decision. Needs your yes/no on whether to build it.

**Also waiting on you:** one heading uses pink-on-cream text at roughly the same low contrast
you already accepted for menu links — but a heading is read differently to a link, so it's
flagged separately rather than assumed to be fine.

**Three honest limits, worth remembering next session:**
1. **Nobody has ever been able to judge the motion "moods" (Subtle/Standard/Dramatic) because
   there has never been a real page showing them.** Not neglect — there was genuinely nothing to
   look at. A proper example page is being built.
2. **Two things the automated browser tool cannot test at all:** whether "reduce motion" (an
   accessibility setting some people turn on) is actually respected, and drag gestures (click,
   hold, move, release). A different, slower tool (Playwright) is the only one that can check
   either — and even that tool's browser got "hijacked" mid-check once today by another AI
   session working in parallel, producing one false reading that was caught and thrown away.
3. **A shortcut was tried and rejected.** A hardcoded list of "which blocks get this control"
   was written, then correctly replaced with a proper rule: each block declares for itself
   whether it qualifies. 19 blocks currently earn a certain motion option through a single
   shared reason — if that reason were ever removed, those 19 would silently lose the option
   too. Noted as a known risk, not fixed pre-emptively.

---

## CURRENT FRONTS

### Track 3 — Spec 38 motion: A + B + C CLOSED · Wave D wave 1 executed 2026-07-31 (D434)

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. A: D414–D417. B: D422/D424. C: D426→D427→D430
(adversarial council). **D434 = Wave D wave 1**, 9 commits, orchestrated as file-disjoint lanes
after `/qc-council` found the plan's own collision map wrong (claimed 3, real count 7 — Spec 38
alone is touched by 5 steps).

**THE PLAN: `plans/2026-07-31-motion-wave-D-client-readiness.md`** — 24 steps, 4 QA gates.

**Step-by-step status (verified against D434 + git log, not carried from memory):**

| Status | Steps |
|---|---|
| **CLOSED (8)** | **1 (touch measured on every drag surface)**, 4 (svg/svg-subtree split), 9 (presets in real patterns), 11 (clean-clone build), 13 (pin/keyboard contract — now in Spec 38 §3.1; the *observed* case is Step 22), **14 (reduced-motion measured for all six reasoned-only effects)**, 16 (image-sequence agency-only), 17 (editor console errors) |
| **HELD** (correctly) | 2/3 — buybox drag toggle. The visual-diff gate refused it: verdict `PARTIAL — CODE-COMPLETE-UNVERIFIED`, gate requires `PASS`. No `--no-verify`, no `--allow-dirty`. Buybox patched-and-reverted, saved for next session. |
| **NOT STARTED (14)** | 3, 5, 6, 6b, 7, 8, 10, 12, 15, 18, 19, 20, 21, **22, 23** (22/23 moved in from parking by Bean 2026-07-31) |

⚠ **Read this table's silence carefully.** It previously omitted Steps 1, 3, 6, 6b, 7, 8, 14, 22 and 23
entirely, and that silence is what made two FINISHED steps look unstarted. Check a step against
`git log` before trusting its absence here.

**Two design gates open for Bean — do not build past them:**
1. **Step 7, cursor-follow background** — `plans/2026-07-31-step7-cursor-follow-background-design-gate.md`, routes A/B/C. The register's own premise was wrong (claimed `data-spotlight` prior art in `nav-menu` — nav-menu has none; the real prior art is a single-consumer `src/shared/effects/spotlight.js`), so nothing was built pending this gate.
2. **FR-38-12 (Flip)** — D426 ruled this a *live* design gate, not parked. It had dropped out of
   the Wave D register entirely (found only by checking, not by reading) and is restored here.

**Also awaiting Bean's eye:** ScrambleText heading contrast ≈2.25:1 (pink-on-cream) — the same
pairing accepted for nav *links* on 2026-07-31, but this is a *heading*, a different reading
context, so it is not auto-extended without asking.

**Three things that must not be re-learned the hard way:**
1. **The motion presets have no canary instance anywhere** — that is the entire reason they have
   never been judged; a fixture is being built, this was never neglect.
2. **Chrome DevTools MCP cannot measure two things:** `emulate` has no `prefers-reduced-motion`
   parameter (schema-checked directly), and there is no trusted mouse down/move/up primitive —
   synthetic `PointerEvent` throws `InvalidPointerId` at `setPointerCapture`. The committed
   Playwright harnesses (`scripts/motion-qa/probe-wave-c.mjs` + `-editor.mjs`) are the ONLY
   instrument for the reduced-motion contract and for gesture-level drag. That Playwright
   browser session is shared across concurrent agents in this run — one tab was hijacked
   mid-measurement and produced a false reading (caught, discarded, re-taken).
3. **A `FORCED_PANEL_HOSTS` hardcoded block-name map was written, rejected by Bean, and replaced**
   with a block-owned `supports.sgs.fx.motionSurface` declaration (commit `4a5cb764`). The
   generator reads per-block fx declarations in `generate-fx-qualifying-blocks.py` — declare in
   `block.json` → generated artefacts → theme/plugin consume, never the reverse. **19 blocks
   currently rest on a single provision category and would be zeroed the same way the
   `svg`/`svg-subtree` split nearly zeroed `sgs/decorative-image` if that category were removed**
   — recorded as a known risk, deliberately not pre-patched.

**Post-D434 findings (two live-verification passes, not yet folded into a D-entry):**
`reports/2026-07-31-motion-wave-d-standards-review.md` (before Wave-D-wave-1 fixes) found the
before-after 767–900px width collapse (instance 1 only, non-monotonic across tiers — diagnosed
as symptom, not cause) and a leftover `SGS-CPT-HEADER-PROOF-20260722` debug marker rendering
live in the site header on every page using it (caveat: concurrent agents were also touching the
header this session — re-check once they are done before treating as a standing defect).
`reports/2026-07-31-simulated-human-check.md` (after) found decorative-image still offering
"Draw" (addressed same session by commit `4a5cb764`) and two editor console warnings about
extension CSS loading into the iframe incorrectly (addressed by commit `1af35b3a`, the
iframe-aware hook). Neither report is fully re-verified against the very latest commits — treat
both as INPUT to next session's QA gates, not as closed.

**Bean rulings still binding (do not re-litigate):** before/after VIDEO is KEPT · physics sandbox
is a DESIGN GATE not a cut, GSAP can do it (Step 8) · morph should eventually reach any block via
its CONTAINED svg · **WCAG AA does NOT gate the nav submenu link colour** (pink-on-cream 2.25:1
intended, do not "fix" back — but see the ScrambleText decision above, which is NOT the same
ruling extended without asking).

⚠ Parked, not ours: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE` (both re-checked 2026-07-31, both genuinely OPEN).
⚠ Two items were briefly filed in parking this session and **Bean moved them out** the same day:
the pin/panel keyboard fixture gap and the before/after test-image artefact are now **Steps 22 and
23 of the Wave D plan**, not parking entries. His ruling: parking is strictly BLOCKED or POSTPONED
work — both of these are planned work with a named next action, so they belong in the register.

**Canaries:** `/motion-canary-wave-c/` (page 2083) · `/motion-roster-canary/` (page 2086).
Harnesses: `scripts/motion-qa/probe-wave-c.mjs` + `probe-wave-c-editor.mjs`, self-verdicting,
cache-busting.

### Tracks 1 / 1b / 1c / 2 / 2+2b — stable, unchanged today

Not touched this session. Full detail lives where it already did — read before acting, do not
assume it is current from memory alone:

- **Track 1 (cloning/Spec 31 verification):** `memory/session-2026-07-31-track1.md` +
  `-track1-session2.md`. Headline still standing: Spec 31 C2 measurable (499 declared / 21.2%
  attributed), 3 false-derivation corrections recorded there (do not re-derive), nav dropdowns
  shipped after 5 live-only defects were found and fixed (D432/D433).
- **Track 1b (Spec 35 components):** editor gap CLOSED (D425); open residue = Part I (2 items),
  Part-L rollout 4–32%, T1 parity 157 gaps/23 blocks. `reports/2026-07-30-track1-verification-audit.md`.
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave strategic plan landed (D413), Wave 1 CLOSED,
  Wave 2 in progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer
  variants) was REJECTED by Bean 2026-07-29 — do not re-present those pairs without real work
  first (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

## Standing constraints (carry forward — these are rules, not history)

- Per-row `position:sticky` REJECTED (short-parent trap, D389). Sticky stays HEADER-level.
- No absolute size value in a shared state-only stylesheet (D386), gated by
  `check-shared-css-state-rules.js`.
- After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor (D388).
- A scoped axe run on a CLOSED surface passes vacuously — guard openness or the run proves
  nothing; any earlier drawer-axe claim from before D418 proves nothing.
- `templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matched by ARRAY
  POSITION (D393) — pass the template only into a genuinely empty container.
- The D343 phantom border was WP core's `html :where([style*="border-width"])` substring-matching
  a custom property *named* `--sgs-tile-border-width` — not shadows-as-borders. Width vars are
  named `--*-thickness`. Do not re-propagate the wrong diagnosis.
- No-login shareable preview link is DROPPED, not deferred (Bean, 2026-07-27).
- `<footer>` is generic — key any assertion on the CLASS `wp-block-template-part`, never a naive
  regex; the canary page has 5 `<footer>` elements, four are quote attributions.
- `~/.agents` is NOT a git repo — the skillscore script + 5 grafted skills + `nextjs-testing` are
  LIVE but UNVERSIONED (recovery = per-file `.bak-2026-07-17-*`).
- **No block version bumps / deprecations pre-production** (Bean D293, overrides STOP-57).

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. Commit by EXACT PATH, never `git add -A`; never touch another track's
  uncommitted files.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` + `git status` +
  `git branch --show-current` · D-ceiling `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  (currently D434 — a co-active track took D432/D433 the same day; re-check live) · framework
  counts via `/sgs-db` or `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2 (verified 2026-07-20 over SSH on both).
- **Fixtures on the canary (not assumed clean):** motion 2083/2086; mega page 1762, panel 1745,
  menu 100, item 1746; header CPT 1570, footer CPT 1654.
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) ·
  two unnamed `<main>` landmarks · both sites GENERIC proof headers · FR-37-36.

---

## Product queue (the website-builder work)

**LIVE backlog:** `plans/strategy/product-queue.md`. Holds the Indus core→SGS migration (A/B/C),
sequenced header/footer goals, Track B reconciliation. Reconcile before acting.

**Standing programmes:** no-inline SUPPORTS migration complete, but 11 inline FR-32 sites across
9 blocks found 2026-07-30 (`reports/2026-07-30-track1-verification-audit.md`, 1 still live:
`cta-section:333`) · Spec 30 (WooCommerce) COMPLETE (D220) · L1–L4 DONE (D290). Parked, not ours:
`P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101; 144 STOPs as of 2026-07-31) |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored) |

## Blockers

**None hard.** Two design gates await Bean's decision (Step 7 routes, FR-38-12 restore) before
Wave D can continue past them — see Track 3 above. Everything else in the register is buildable
without him.

---

## NEXT SESSION — continue Motion Wave D

**Read FIRST:** `plans/2026-07-31-motion-wave-D-client-readiness.md` in full, then D426→D427→
D430→D434 in that order, then Spec 38 IN FULL.

**Smallest first action, ≤20 min, zero deps:** Step 5 (morph on any block) or Step 10 (preset/
param normalisation outside the editor) — both NOT STARTED and file-disjoint from the two design
gates. Do not start Step 7 or the FR-38-12 build until Bean has answered both gates.

**Before building anything on the fx/motion-surface roster:** read the "19 blocks on a single
provision" risk above — it is not a blocker, but do not silently widen or narrow the provision
categories without checking what else rides on them.

#### Methodology guardrails (earned 2026-07-31 — do not inherit as solved)

- A probe that never reaches the effect is measuring the probe.
- A test can pass the very defect it was written to catch — check the KNOWN FAILURE, not just
  the KNOWN GOOD, through any new gate.
- Fact-check every register/council claim before acting on it — D434 alone found four false
  claims that prose review had already waved through.
- Cache-bust every canary measurement; a LiteSpeed-cached page can read a working fix as broken.
- A prose claim in a report is not a committed artefact — verify the change actually reached the
  file/seeder before writing that it landed.
- `python .claude/hooks/handoff-preflight.py --check` must pass before a handoff completes.

Full structural defences (144 STOP entries + pre-flight ritual): **`.claude/STOP-CATALOGUE.md`**.
