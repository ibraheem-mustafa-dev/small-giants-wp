---
doc_type: state
project: small-giants-wp
last_updated: 2026-07-29
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## ⭐ FOR BEAN — plain English (read this first)

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

### Track 3 (NEW 2026-07-29) — Spec 38 motion system: AUTHORED, awaiting Bean's design gate

**Documents only, nothing built.** `specs/38-SGS-MOTION-SYSTEM.md` (two-tier V/G motion doctrine + GSAP Tier G roster; D406–D409) + wave prompts `plans/2026-07-29-motion-wave-{A,B,C}-session-prompt.md`. The vanilla-first rule was amended at its five written homes; parking P-10's paid-GSAP premise marked dead. **Every wave is GATED on Spec 38 `status: draft → active` (Bean's sign-off) — no implementation before it.**

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

### Track 2 — Spec 36 nav: TASK 5, the pre-registered exit gate (nothing else before it)

Gate 3 CLOSED (D401) and the 7 drawer desktop variants are BUILT + council-fixed + canary-deployed
(D403, `faa14924` · `cab1b916` · `69dfbaf9`). Task 5 is:
1. **Build the 7 EXACT-CONTENT POC fixtures** — one canary page per variant, each with its OWN
   classic menu carrying the reference's real labels + the reference's actual secondary copy
   (labels/copy from `reports/2026-07-28-drawer-code-extraction/*.json` html_outlines; re-read the
   live site where truncated). **§6 POC rule (Bean, binding): POC fixtures are EXACT clones
   INCLUDING content**, so differences are attributable to the block, never content; genericise
   pre-production (a named pre-production step, not optional).
2. **Live sweep per variant per width** (375/768/1440 + non-default collapsePoint): openness-GUARDED
   axe (assert open + focusables>0 or report VACUOUS), keyboard/ESC/focus-return, reduced-motion full
   end state, JS-off crawl, a 2+-instance page (D374), `listColumns` editor-canvas visibility
   (unresolved — SSR + lifted-CSS interplay), the header anchor on a real pinned/unpinned header.
3. **Side-by-side same-content pairs vs the reference for Bean's eye** (R-31-13 — co-authoritative;
   numbers alone don't close).

Parked follow-ons (not lost): `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS`. Neither follow-on
is GSAP — the stack is vanilla JS + CSS transform/opacity only.

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

## Live status (machine-checkable — verify, don't trust the cache)

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

## Sweep record — 2026-07-29 parking normalise + enforcement

**The doc rules are now machine-enforced, not asserted.** `.claude/hooks/handoff-preflight.py`
(6 checks: LEDGER byte cap · D101 STOP carry-forward · parking Status conformance · parking
archive-on-resolve · tombstones at live paths · dangling links). `--check` gates `/handoff`;
`--self-test` proves each check can still fail. Built because five rules were documented as
"enforced every /handoff" and enforced nowhere — which is why the LEDGER reached 38,799 bytes
against a prose-only cap, and why a 2026-05-09 `CONVERSATION-HANDOFF.md` sat at the repo root
being copied to OpenClaw every session under a passing gate (now archived).

- **The negative control earned its keep on first run:** it caught that the STOP-count regex was
  compiled without `re.M`, so it anchored to the start of the *string* and counted 0 on any real
  file — the check would have reported "no defence dropped" forever while measuring nothing.
- **`docscore.py` fixed twice, both caught by testing not assumption:** the size check now covers
  `LEDGER.md` via a `SIZE_CAPS` table; the D101 carry-forward audit now sees `STOP-CATALOGUE.md`
  (it was gated on `doc_type`, but that file declares `doc_type: reference` and frontmatter beats
  the filename map — and its counter only recognised markdown *table* rows while the catalogue uses
  bullets). Proven by injecting a real 5-STOP drop; both gates caught it.

**`parking.md` normalised: 296,456 → 124,641 bytes, 151 entries.** Verbatim pre-normalise copy at
`memory/archived-2026-07-28-parking-pre-normalise.md`. The bloat was never closed entries (there
were none) — it was **shipped history trapped inside still-open entries**. The convention moves a
CLOSED *entry* to the archive but never addressed a closed *clause* inside an OPEN one, so every
partially-completed programme accreted forever. One layout, one `**Status:**` syntax (the two
variants were why any regex gate silently passed ~68% of entries), six real buckets, every entry
dated. **Slug conservation caught real losses:** the delegated batches dropped 18 slugs, 5 of them
cited from live docs — and one agent listed three slugs in its own manifest that it never wrote.
All recovered by hand. P-17's IconPicker spec extracted to
`plans/2026-07-29-icon-picker-component-design.md` (a plan, not a spec — it has had no design gate).

**Skills repaired for LEDGER mode** (10 files): `/handoff` (single hoisted `## LEDGER MODE` block;
Gate 4a copies LEDGER not the archived root handoff; Gates 6/6.5 no longer recreate the deleted
`next-session-prompt.md`; `HANDOFF_GATE_OFF` now requires a recorded `QC-BYPASSED:` reason),
autopilot SKILL + `living-docs-protocol.md` (which still routed phase-change → `state.md` and would
have recreated it), the three doc templates that re-seed archived filenames into new projects,
`/where-am-i`, `/mark-step-done`, the handoff rubric (it demanded a field `/handoff` forbids), and
`/doc-audit`. Autopilot Stage 0 also lightened: it no longer swallows a 58KB correction ledger and a
195KB spec before intent is classified.

**Follow-up, deliberately NOT done:** the staleness review of the ~96 parking entries that no live
doc references. With the file readable, that pass is now cheap.

---

## Sweep record — 2026-07-28 docs fat-cut

Swept narrative → `memory/session-2026-07-28-ledger-sweep-docs-fatcut.md` (Gate-3 close detail,
drawer-variant build detail, Spec 35 close-out, prior-session pointer blocks, setup-simplification
history). Everything above is either a current front, a standing constraint, or a pointer.

**Doc-system changes this session** (each verbatim-archived, nothing deleted from git history):

| Change | Where it went / why |
|---|---|
| `docs-registry.yaml` DISSOLVED + `scripts/doc-walk-audit.py` deleted | A fourth roster listing deleted Specs 17/34 as live, duplicate Spec 33, missing 35/36/37 — while its own grep pattern matched nothing. Credentials → `dev-setup.md`; pipeline run-artefact inventory → Spec 31 Appendix C. Consumers rewired: `/handoff` Gate 4.5, `/autopilot` Stage-0 step 6 (both skill trees), `/doc-audit`, `tooling-map-drift-check.py`. |
| `cloning-pipeline-flow.md` + `-stages.md` ARCHIVED | 86KB of hand-maintained code-mirror, 3 weeks behind the code, self-disclaiming. Replaced by ONE stage-index table in Spec 31 Appendix D. → `memory/archived-2026-07-28-*` |
| `.claude/CLAUDE.md` manifest → pointer-only | Its cached spec roster cited a deleted spec and omitted three live ones. Now points at `specs/README.md` and caches nothing. |
| `specs/README.md` → THE roster | Spec 37 row added; 36 + 35 statuses corrected; DEAD-never-cite list moved here; 02-REFERENCE annotated gitignored; every link resolution-tested. |
| Spec 29 folded → Spec 31 §13.6; Spec 06 → `specs/archive/` | 8 and 3 live refs respectively, zero code refs. |
| Specs 32 + 35 KEPT SEPARATE, cross-labelled | Bean reversed the proposed fold: 202 live code citations (incl. the fail-closed `check-no-inline.py` gate) made it a waste. 32 = styling/token emission; 35 = inspector-UX. Read together for block work. |
| `plan.md` tombstone + both per-track next-session prompts ARCHIVED | LEDGER-only (Bean). Track state lives in this file's per-track sections; co-active-track etiquette is now a STOP entry. |
| `go-live-checklist.md` → `specs/` | Spec 30 FR-30-13 owns it; it failed all three keep-at-root tests. |
| `decisions.md` swept + indexed · `plans/` root swept | Routine/superseded entries and executed plans moved verbatim to their archives; live-only at root. |

**Rotate-hook ground truth (checked, not assumed):** `ledger-rotate.py` IS wired as the sole project
Stop hook (`.claude/settings.json`), HAS been firing (709-line `.ledger-rotate.log`, 49 auto
snapshots, 10 on 2026-07-28 alone, last recorded `size=38799`). It warns + snapshots and **never
edits this file by design** — the missing leg was always the manual sweep, done here.
