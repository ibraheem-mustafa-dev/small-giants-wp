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

**Doc system fat-cut — 2026-07-28.** The `.claude/` doc set was audited and cut down to what can
actually stay true. What changed, in plain terms: there is now **one spec roster**
(`specs/README.md`) instead of four competing ones; the **doc registry is gone** (it listed deleted
specs as live and missed the three newest); the **two hand-written pipeline maps are archived** (they
described code and were three weeks behind it — the code plus Spec 31 is the truth); the **per-track
next-session prompts are retired** (LEDGER-only, one truth per track). Nothing was deleted from git
history — everything moved to `memory/` or `*/archive/` verbatim with a dated note. Full sweep record
at the bottom of this file.

---

## ⭐ CURRENT FRONTS

### Track 3 (NEW 2026-07-29) — Spec 38 motion system: SIGNED OFF (qc-council-gated) — Wave A is next

**Documents only, nothing built yet.** `specs/38-SGS-MOTION-SYSTEM.md` is `active`: Bean approved 2026-07-29 conditional on a /qc-council, which ran same day (3 code-grounded raters — WP-mechanics, header-forensics, spec-lawyer): **0 architectural refutations, 9 precision amendments applied in-spec** (headline: entrance×scrub needs STRIP on the static-save path; webpack gsap-externals + template wrapper-insertion are NAMED Wave build tasks; sticky edge rule now tri-state-aware "outside if sticky on ANY tier"; smooth-scroll.js suppressed under ScrollSmoother; Wave B regression list += row collapse + 2 sub-cases). D406–D409 logged; vanilla-first rule amended at its 5 homes; P-10 premise dead. **Next: run `plans/2026-07-29-motion-wave-A-session-prompt.md` (plan mode; Waves B/C after A — B∥C possible).**

### Track 2b — Spec 37 header/footer: B3 preset library (DESIGN-GATED, awaiting Bean's sign-off)

**Nothing built.** `plans/2026-07-28-B3-header-footer-style-preset-library-design-gate.md`.
Bean's decisions (2026-07-28): a preset changes EVERYTHING ("exactly what a pattern selector would
give them") · 8+ presets · header AND footer with SEPARATE rosters. **The finding that reshaped the
job: B3 is an AUTHORING job, not a mechanism job** — the 7 existing header starters already carry
colour, padding, rules and behaviours, so the picker already does what a preset control would; what
is missing is VARIETY (every starter paints `surface` behind `primary`, so all seven look alike on
any one site). So: 8 styled header + 8 styled footer patterns through the already-live native
picker — no new block, attribute, admin UI or React component. Three open sign-off questions in §7.

The raw-insert drawer gap is FIXED (`6ddb9f48`, FR-36-9a clause 2, Specs 36+37 amended in the same
commit). ⚠ **FR-37-26's FAIL verdict deliberately STANDS** — the test was not re-run and its
authoritative arm is the blind tester. `P-HEADER-SIMPLICITY-FINDINGS` stays OPEN (findings 2 + 3).

### Track 2 — Spec 36 nav: TASK 5 MEASUREMENT COMPLETE (2026-07-29) — ⛔ awaiting Bean's eye

Gate 3 CLOSED (D401); the 7 drawer variants are BUILT + canary-deployed (D403). Parts 1 and 2 of
Task 5 are DONE; part 3 is delivered but not judged. **21/21 sweep cells PASS** (7 variants ×
375/768/1440) plus multi-instance, header/centred anchors, and `listColumns` editor-canvas
visibility. 7 exact-content fixtures live (pages 1892–1932, menus 102–109).
**Full record — read this rather than duplicating it here:**
`.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`.

⛔ **THE GATE DOES NOT CLOSE ON MEASUREMENT. Bean's eye (R-31-13) is outstanding** — pairs at
`reports/visual-diff/drawer-variants-2026-07-29/` (7/7 ours, 6/7 references; buck.co UNCAPTURED,
recorded not hidden). Named judgement call: the lamalama reference floats its panel TOP-CENTRE, our
`trigger` anchor pins TOP-RIGHT. Palette differences are expected and correct.

**Standing warnings from this work (do not lose these):**
- **The axe openness guard DID NOT EXIST until 2026-07-29** — `axe-run.mjs` only checked that the
  scope selector matched, so a CLOSED drawer returned `0 violations` exactly like an open one.
  **Every scoped drawer/mega axe result recorded before that date proves nothing — re-run it.** The
  guard now reports `VACUOUS` (exit 3) rather than a pass; negative control proven live.
- **Two further harness bugs manufactured false results, both fixed:** the automation's own cursor
  sat on a link, so axe measured its `:hover` colour and reported a *serious* 2.14:1 contrast
  violation that vanished when the pointer moved; and the JS-off check compared raw text against
  HTML, so `Arts & Culture` (served `Arts &amp; Culture`) read as missing when present twice.
- **Open findings:** F1 `listColumns` uses `grid-auto-flow:row`, so a 7-item menu interleaves across
  columns (keyboard/SR order is correct; reference splits 4+3) — shared-block change, needs sign-off,
  parked `P-NAV-MENU-LISTCOLUMNS-READING-ORDER`, recommended to change. F2 (header track) at 375px
  the theme header is `position:absolute`, 251px tall, rendering the DESKTOP logo over page content.
  F3 `sgs/social-icons` has no Vimeo or Dribbble slug.

Parked follow-ons (not lost): `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` ·
`P-NAV-MENU-LISTCOLUMNS-READING-ORDER` · `P-NAV-DRAWER-DUPLICATE-DEFAULT-REF`. None is GSAP — the
stack is vanilla JS + CSS transform/opacity only.

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

**Indus "Our Brands" clone fidelity — DONE 2026-07-17 (D343, live-verified).** Detail: `decisions.md`
D343. Remaining Indus tasks (Bean-directed 2026-07-17):

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

**Standing programmes (not the active front):** no-inline styling roster effectively COMPLETE
(11-condition DONE audit 2026-07-26; real remaining = 5 block-fixes in that report) · WooCommerce
layer (Spec 30) COMPLETE + merged (D220) · cloning L1–L4 cascade DONE (D290). Still parked and NOT
ours: `P-CONFORMANCE-GOLDEN-DRIFT` (27 stale goldens — a blind re-seed is forbidden) +
`P-ARCHIVE-PRODUCT-WC-VALIDATION`.

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

## NEXT SESSION — orchestration plan

**Where we are, plainly.** The doc system is finished and enforced: one spec roster, no registry, no
code-mirrors, a normalised parking register, and a hook that mechanically fails a handoff if any of
it drifts. **No doc work is outstanding.** The next session goes back to building, and there are
three fronts, ALL of which are waiting on *you*, not on more engineering:

1. **Spec 38 motion system** — authored, `status: draft`. Every wave is gated on your sign-off.
2. **B3 header/footer preset library** — design-gated, nothing built. Three open questions in its §7.
3. **Spec 36 nav Task 5** — all measurement PASSES (21/21 cells). Only **your eye** (R-31-13) is
   outstanding; the pairs are rendered and waiting at
   `reports/visual-diff/drawer-variants-2026-07-29/`.

The honest read: engineering is ahead of decision-making. The highest-value next session is you
looking at three things, not an agent writing more code.

### Task 1 — Bean's eye on the 7 drawer variants (UNBLOCKS Spec 36 Task 5)

**What:** open the side-by-side pairs and judge them. **Why:** measurement cannot close this gate by
rule (R-31-13 — numbers and eye are co-authoritative). **Time:** 15 min.
**Orchestration:** inline, no subagent — this is a human judgement, not work to dispatch.
**Named call to make:** the lamalama reference floats its panel TOP-CENTRE; our `trigger` anchor
pins TOP-RIGHT. Accept or change. Palette differences are expected and correct.
**Depends on:** nothing. **Parallel with:** Tasks 2, 3. **QC gate after:** no — it IS the gate.
**Acceptance:** each of the 7 variants marked accept / change-this. `buck.co` is UNCAPTURED, recorded
not hidden — decide whether it needs capturing before sign-off.

### Task 2 — Sign off (or redirect) Spec 38, then run Wave A

**What:** review `specs/38-SGS-MOTION-SYSTEM.md` and flip `status: draft → active`, or redirect.
**Why:** three wave prompts are written and blocked behind it; nothing may be implemented first.
**Time:** 20 min to review; Wave A ~45 min after.
**Orchestration:** review inline (Opus). Wave A implementation → delegated, model via `/delegate`,
dispatch pattern single-agent, brief = `plans/2026-07-29-motion-wave-A-session-prompt.md` verbatim.
**Context the subagent will not have:** the stack is vanilla JS + CSS `transform`/`opacity` only;
D406–D409 carry the doctrine; `prefers-reduced-motion` is non-negotiable on every effect.
**Depends on:** your sign-off. **Parallel with:** Task 1. **QC gate after:** `/qc-inline`.
**Acceptance:** Spec 38 `status: active` recorded with a D-number, and Wave A's FRs shipped *and*
live-verified — not merely built (STOP-29: acceptance is the spec's full scope for the surface).

### Task 3 — B3 preset library: answer §7, then author the patterns

**What:** answer the three sign-off questions in
`plans/2026-07-28-B3-header-footer-style-preset-library-design-gate.md` §7, then author 8 header +
8 footer patterns. **Why:** the picker mechanism already exists; what is missing is VARIETY (all 7
current starters paint `surface` behind `primary`, so they look alike on any one site).
**Time:** 15 min to decide; ~90 min to author.
**Orchestration:** decisions inline. Authoring → delegated, `/delegate` for model, dispatch pattern
**parallel** (header roster ∥ footer roster) via `/dispatching-parallel-agents`.
**Context the subagents will not have:** this is an AUTHORING job, not a mechanism job — **no new
block, attribute, admin UI or React component**. Patterns go through the already-live native picker.
**Depends on:** your §7 answers. **Parallel with:** Tasks 1, 2. **QC gate after:** `/qc` multi-rater
(it touches shared theme patterns).
**Acceptance:** 16 patterns render distinctly on one site without editing tokens, and
`check-no-core-blocks.py` passes.

### Dependency graph

```
Task 1 (inline — Bean's eye)          ┐
Task 2 review (inline, Opus)          ├─ all three independent, run in any order
Task 3 §7 answers (inline, Opus)      ┘
        ↓ (each unblocks its own build)
Task 2 Wave A (delegated)   ∥   Task 3 authoring (2 parallel agents)
        ↓ /qc-inline                      ↓ /qc multi-rater
                    Commit + push (Gate 2)
```

### Tooling for the next session (WordPress project — Gate 5)

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision — all three tasks start with one |
| `/strategic-plan` | Before writing code for Wave A or the B3 pattern roster |
| `/research` | Auto-routes to the right tier; use before any unfamiliar choice |
| `/gap-analysis` | Grade the B3 patterns before calling them done |
| `/lifecycle` | Only if a skill/agent/pipeline itself changes |
| `/sgs-wp-engine` | The framework skill — block/theme/pattern work |
| `/wp-block-development` | Core WP block-API questions |
| `/delegate` | Pick the model for every dispatched task |
| `/qc` · `/qc-inline` | Per the per-task QC gates above |
| `/visual-qa` · `/a11y-audit` | Verifying the B3 patterns and any motion work |

| MCP / tool | For |
|---|---|
| Playwright MCP | Live DOM + computed-style verification on the canary (the only way to close Task 1-adjacent checks) |
| `/sgs-db` | Block/attr/slot ground truth — never trust a count in prose |
| `/wp-blocks` | Block schema dump |
| Chrome DevTools MCP | Motion/perf tracing if Wave A needs it |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Wave A implementation + B3 pattern authoring |
| `design-reviewer` | B3 preset variety — does each of the 16 actually look different |
| `code-reviewer` | Before committing shared-theme or motion changes |

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

## Sweep record — doc-system programme (2026-07-28 → 29), CLOSED

Two sessions cut the `.claude/` doc set to what can stay true, then made the rules mechanical.
**Headlines:** `.claude/` root 18 files → 10 · one spec roster (`specs/README.md`) · registry
DISSOLVED · pipeline code-mirrors archived (→ Spec 31 Appendices C/D) · per-track prompts retired
(LEDGER-only) · `decisions.md` 877KB → 714KB · `plans/` root 37 → 14 · **`parking.md` 296KB → 123KB,
151 entries normalised then culled** (8 archived, 4 FALSE CLAIMS corrected in place; the register
proved overwhelmingly honest — three of four verification batches found nothing archivable) ·
**`handoff-preflight.py` now enforces six doc-hygiene rules that were previously prose only.**

Full detail: `memory/session-2026-07-28-ledger-sweep-docs-fatcut.md` (includes the 2026-07-29
appendix) · `memory/parking-archive.md` (sixth pass) · **D410** · commits `b922290a`…`7fe4126e`.

