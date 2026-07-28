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

### Track 2 — Spec 36 nav: TASK 5 MEASUREMENT COMPLETE (2026-07-29) — ⛔ awaiting Bean's eye

Gate 3 CLOSED (D401); the 7 drawer variants are BUILT + canary-deployed (D403). **Task 5's parts 1
and 2 are DONE and part 3 is delivered but not judged.** Full record:
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`.

- **21/21 sweep cells PASS** (7 variants × 375/768/1440): openness-guarded axe · resting contrast
  (8.43–19.29:1) · focus containment · ESC-closes-and-returns-focus · reduced-motion end state ·
  JS-off crawl. Geometry corroborates the references — `floating-capped-card` measures 438px at
  768/1440 and **343px at 375** = `min(438px, 100vw−32px)`, the exact recorded fluid cap.
- **Also PASS:** D374 multi-instance (unique ids, each burger opens its own panel, no fatals) ·
  `header` anchor DERIVES from the header (top 93 = header height) verified in a genuinely PINNED
  state · `centred` anchor exactly centred (420px at left=510 on 1440) · **`listColumns` IS visible
  in the editor canvas** (`display:grid`, two 318.9px columns) — the design gate's one open question,
  now answered by measurement, not reasoning.
- **7 exact-content fixtures live** (§6 rule) — pages 1892/1897/1903/1907/1914/1922/1926,
  multi-instance 1930, anchor probes 1932; menus 102–109. All 7 link counts independently match last
  session's extraction. Rebuild/inventory/delete:
  `plugins/sgs-blocks/scripts/nav-qa/build-poc-fixtures.py` + `poc-content-plan.json`.
- ⛔ **THE GATE DOES NOT CLOSE ON THIS. Bean's eye (R-31-13) is outstanding** — pairs at
  `reports/visual-diff/drawer-variants-2026-07-29/` (**7/7 ours, 6/7 references**; buck.co UNCAPTURED,
  recorded not hidden). Named judgement call: the lamalama reference floats its panel TOP-CENTRE, our
  `trigger` anchor pins it TOP-RIGHT. Palette differences are expected and correct (variants set
  defaults; the site's own tokens supply colour).
- **⚠ METHOD — the axe openness guard DID NOT EXIST until 2026-07-29.** `axe-run.mjs` only checked
  that the scope selector MATCHED, so a CLOSED drawer returned `0 violations` exactly like an open
  one. **Every scoped drawer/mega axe result recorded before this date proves nothing — re-run it.**
  The guard now asserts `dialog[open]` + non-zero box + not hidden + ≥1 visible focusable, reporting
  `VACUOUS` (exit 3), never a pass. Negative control proven live on `/t1-nav/`: closed +
  `--allow-closed` → 0 violations exit 0 · closed + guard → VACUOUS exit 3 · open → PASS.
- **⚠ Two further harness bugs that manufactured false results, both fixed:** the automation's own
  cursor stayed on a link after clicking the burger, so axe measured its **:hover** colour and
  reported a *serious* 2.14:1 contrast violation that vanished the moment the pointer moved (pointer
  now parked; a DELIBERATE resting-contrast check added in its place); and the JS-off check compared
  raw text against HTML, so `Arts & Culture` (served `Arts &amp; Culture`) was reported missing when
  it was present twice.
- **Findings (report §4):** **F1** `listColumns` uses `grid-auto-flow:row`, so a 7-item menu
  interleaves across columns (column 1 reads Home·Services·Studio·News; menu order is
  Home·Work·Services·Approach·Studio·Plans·News). Keyboard/SR order is correct; the reference splits
  4+3. Shared-block change → needs sign-off; parked `P-NAV-MENU-LISTCOLUMNS-READING-ORDER`,
  recommended to change. **F2 (belongs to the header track)** at 375px the theme header is
  `position:absolute`, 251px tall, rendering the **desktop** logo (305×102) over page content —
  matches the known-open "logo mobile-tier switch" item; proven via `elementFromPoint`. **F3**
  `sgs/social-icons` has no Vimeo or Dribbble slug.

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
All recovered by hand.

**Then a full staleness CULL (2026-07-29): all 151 entries verified against LIVE code** by four
parallel agents, under one rule — a DONE verdict needs positive evidence from the code, never the
entry's own prose and never the absence of evidence. **Only 8 closed** (5 already-done, 3 moot);
three of four batches returned ZERO archivable entries. **The register was overwhelmingly honest** —
the long file was real work buried in narrative, not phantom work. The pass's actual value was
**four FALSE CLAIMS in entries that stay open**, now corrected in place: `P-DECISIONS-BACKTAG`
understated its scale ~12x (≈124 untagged headings, not 10) · `P-SPEC35-STATE-AUTOSUGGEST` said one
block carries a `states` key when 16 do · `P-TESTIMONIAL-CONVERTER-FR2220`'s residual is narrower
(`reviewDate` is wired) · `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` listed the already-shipped
FR-33-12 freshness gate as remaining. Full record + why the other ~140 stayed open:
`memory/parking-archive.md` (sixth pass). **P-17 closed as ALREADY-DONE — the shared `IconPicker`
component exists (`src/components/IconPicker/`, 6 files) and is adopted in 12 blocks**, so the
design doc extracted from it earlier that day was deleted rather than left at a live path.
⚠ **`seed_conformance_goldens.py --check` is NOT a dry run — it re-seeds.** It rewrote 28 goldens
during the pass before being reverted; tree independently confirmed clean.

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

## Sweep record — 2026-07-28 docs fat-cut (condensed 2026-07-29)

`.claude/` root cut 18 files to 10. One spec roster (`specs/README.md`); the doc registry dissolved
(it listed deleted specs as live and omitted the newest three) with its credentials rehomed to
`dev-setup.md` and its run-artefact inventory to Spec 31 Appendix C; the two hand-maintained
pipeline code-mirrors archived and replaced by Spec 31 Appendix D; the `plan.md` tombstone and both
per-track next-session prompts retired to LEDGER-only; Specs 29 and 06 folded/archived; Specs 32
and 35 deliberately KEPT SEPARATE and cross-labelled (202 live code citations made the proposed
fold a net loss); `decisions.md` swept 877KB→714KB and indexed; `plans/` root 37→14.
**Full detail: `memory/session-2026-07-28-ledger-sweep-docs-fatcut.md` + the commits
`b922290a`…`9d44d929`.**
