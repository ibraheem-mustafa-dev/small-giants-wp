Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this plan, the LEDGER wins.
> ⛔ **NEVER add anything from this plan to `parking.md`.** Bean-ruled 2026-07-31: parking is strictly for BLOCKED or POSTPONED work, never a reminder list. **This plan IS the register.**
> ⛔ **DEPLOY HAZARD, PROVEN THREE TIMES.** The shared tree's compiled `build/` contains co-active tracks' uncommitted edits, and `assets/` is a separate directory a partial copy silently misses. Use `build-deploy.py` with `--payload <your paths>` — never `--allow-dirty`, never a hand-rolled tar.

# Spec 38 motion — the OPEN register

> **PRUNED 2026-08-02: every COMPLETED step was DELETED from this file.** Closed work lives in
> `decisions.md` (D-numbered) and `git log`, not here. **If a step has a `### Step` heading below,
> it is OPEN. There are no closed steps in this file.** 6 remain (verify, don't trust this number:
`grep -c '^### Step' <this file>`).

> **Closed since the prune:** Step 8 (FR-38-27, 2026-08-02) · Step Y (both loop arms measured, `216508ce`) · Step W/X/Z earlier · and
> M3 (indus-foods snapshot push — DELETED by Bean, not parked; see `LEDGER.md`).

## Where this stands

> ⚠ **SWEPT 2026-08-21 against the code.** This register had gone stale on 3 of 5 verified items —
> Step Z-residual was fully closed, Step 20 was 3-of-5 closed, and every Step U figure was wrong
> (understated; the files had grown). The gap register's own CAUTION is the reason this matters:
> an agent once called a fix "the single highest-value item in this whole audit" when it had been
> fixed hours earlier, **because it cited a doc and the doc was stale**. Re-verify before acting.


Waves A–E are closed. This session closed **Step X** (the three-list drift gate, D465), **Step W**
(the looping rollout, D466) and **Step Z** (the focus cascade, D467). What is left is below, ranked.

**Four things a fresh session most needs to know:**

1. **Verification state is PER ITEM, never uniform.** Read each step's evidence line. Do not read
   "deployed" as "proven", or "proven" as "rolled out".
2. **Bean's eye set the assertion standard.** Automated checks passed while the drag did not follow
   the mouse and the dots did not track, because they asked "did it move?" rather than "did the dots
   follow the cards?". The looping probe now asserts `dots == real cards`.
3. **A green build proves nothing. Six defects in ONE feature passed one** (2026-08-02): an undefined
   identifier (`node --check` validates syntax not scope; this project's eslint overrides
   `no-undef`), a missing render-layer guard, and absence from three hand-maintained lists — one of
   which only surfaced by live verification after the other fixes shipped. **Step X now gates that
   class.**
4. **Your instrument lies too.** Proven this session: `--dry-run` does not run the dirty gate; a
   page-HTML grep cannot see block CSS (SGS lifts it to `uploads/sgs-css/`); a probe's hardcoded
   selector made its headline assertion `0 === 0`; `networkidle` never settles on a WooCommerce page;
   and `wp post list` returns a false negative unless `--post_status` is explicit.

## Pre-conditions (check these BEFORE starting any step)

1. **Branch + D-ceiling, in the same breath as any commit.**
   `git branch --show-current` (expect `main`) and
   `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
   (**heading-anchored** — the unanchored form reads the hex colour `#0D5557` as D5557).
   ⚠ **A co-active track shares this worktree and committed four times during the last session,
   taking D464 mid-flight.** Re-check immediately before writing any D reference, not at session start.
2. **Commit BY EXACT PATH.** Never `git add -A`. The pre-commit hook now rejects a bare `git commit`
   without a pathspec, and it is right to.
3. **Deploy with `--payload <your paths>`**, so the gate stays armed against another track's dirty
   files. Never `--allow-dirty`.
4. **Any theme CSS change needs a `theme/sgs-theme/style.css` Version bump** or the CDN serves the
   stale file and every probe reads the old rule. Then purge: `wp cache flush` + `wp litespeed-purge all`.
5. **Read Spec 38 §3.3 (FR-38-25 + FR-38-26) and `.claude/LEDGER.md`** before touching motion.

---

## The open steps, in run order

> **Step Z-residual — CLOSED 2026-08-21** (`9c4fd59d` + `b4a15b15`). All three remaining blocks
> (`sgs/button`, `sgs/nav-menu`, `sgs/nav-drawer`) now resolve their focus ring through
> `var(--sgs-focus-color, …)`. `sgs/button`'s "writer UNPROVEN" was answered: the cause was an
> **ABSENCE**, not a losing rule — it had no outline declaration at all, and the WP rule that
> would supply one cannot match because the block never carries `.wp-element-button`.
> ⚠ One residual, not worth its own step: `nav-drawer/block.json:68`'s `_note` still documents
> that close button's outline as "uncontrollable styling", which is no longer accurate.

### Step 12 — the cloning lift: motion that survives a draft (FR-38-22) [OPEN]
  **Model:** inline · **Time:** 3 h
  ⚠ **MEASURED 2026-08-01 — the premise was tested and the answer is NO.** A probe against the REAL
  `convert_section()` with authored drafts (`reports/2026-08-01-motion-clone-probe.md`): **every fx
  attribute vanished — and not even into the skip-with-reason channel Rule 4 requires.** D436 seeded
  the runtime PLAYBACK registry, a different layer entirely. **So this stays a full build.**
  **Start here:** `lift_behavioural_attrs` (`db/db_lookup.py:5051`) is purpose-shaped for exactly
  this, has ZERO callers, and carries a latent bug — it strips `data-sgs-` and keeps the hyphenated
  remainder, so `data-sgs-fx-trigger` could never match `fxTrigger` even if wired.
  ⚠ Collides with Track 1's live converter work — check `LEDGER.md` before dispatching.
  **On-fail:** if it cannot land, AMEND Spec 38's success definition to say motion is applied by hand
  after a clone. Do not leave the claim standing unbuilt.

### Step 20 — spec ↔ code reconciliation [OPEN — 1 of 5 remain]
  **Model:** sonnet · **Time:** 30 min
  ✅ **(a) CLOSED** — `data-sgs-fx-momentum` IS in §11.2's grammar (`38-SGS-MOTION-SYSTEM.md:1310`).
  ✅ **(d) CLOSED** — `generate-fx-qualifying-blocks.py:390-394` now states `sgs/image-sequence`
  EXISTS as an agency-only block; the stale comment was corrected 2026-08-02 and says so.
  ✅ **(b) CLOSED 2026-08-22** — this register was stale on its own item. §11.3's mapping list
  (`38-SGS-MOTION-SYSTEM.md:1447-1448`) was fixed 2026-08-21: `fxShape`/`fxPath` are now listed in
  the 1:1 attr mapping, with a pointer note (`:1451-1454`) to the D427 amendment at §11.2 rather than
  a duplicate of the status text. Verified live in the spec — nothing further to do.
  ⛔ **(c) IS A RULING, NOT A DELETE — this register was wrong to call the row "dead".**
  `seed-motion-fx-registry.py:575-604` documents the `scroll-smoother` `fx_effects` row as
  DELIBERATE: its `scope='site'` proves BY CONSTRUCTION that ScrollSmoother is structurally
  excluded from every block panel — that is the row's own acceptance test. Deleting it removes a
  load-bearing negative proof. Recommend KEEP + annotate. Needs a D-number either way.
  ○ **(e) OPEN** — `sgs_get_fx_qualifying_blocks()` still has zero callers, and
  `generated-fx-qualifying-blocks.php` is never `require`d by any PHP, so the function does not
  exist at runtime at all. Spec 38 (`:1120-1130`) already records this and recommends DELETE.
  **Done when:** (e) is resolved and (c) has a D-numbered ruling.

### Step R-residual — the cursor field's stated limits [OPEN, low priority]
  **Model:** sonnet · **Time:** 1 h
  Three things FR-38-25 states plainly rather than hides. None is a defect; each may want revisiting:
  1. **`floating-objects` is spec'd, not built** — Bean's third example. It is the first field type
     needing per-object JS, so it needs a Tier assignment under §1.3 (not assumed V) and its own §10
     reduced-motion answer, since autonomous object motion is not the static-field SIMPLIFY case.
  2. **A participant with its OWN `background-image` is deliberately not marked**, because our layer
     would replace it; that child keeps a visible seam. Clobbering a client's image is worse. A
     `::before` fallback is possible if the seam is ever reported.
  3. ~~**The participant walk runs at init only.**~~ ✅ **CLOSED — this register was stale on its
     own item.** Spec 38 §3.3 residual 4 records the fix landing **2026-08-02**: `cursor-field.js`
     gained a bounded `MutationObserver` on the emitter (`childList` + `subtree` +
     `attributeFilter: ['style','class']`), rAF-coalesced so a mutation burst costs one
     computed-style pass per frame, created and disconnected inside the same `init`/`cleanup`
     pair. Verified present in `src/shared/effects/cursor-field.js` (its docblock describes the
     observer). Struck 2026-08-21 — a register that still lists a fixed item as open is the trap
     its own sibling gap-register warns about.

### Step O — the drag text-selection symptom [CLOSED 2026-08-22 — Bean confirmed by hand]
  ⛔ **RULED 2026-08-01 (D449) — do NOT dispatch an agent at this.** The cause-agnostic `user-select`
  mitigation shipped and is live. Scripted drags across Chromium, WebKit and Firefox could not
  reproduce the symptom, and per measurement-vs-eye **Bean's report STANDS over the null
  measurement**. An agent would re-run scripted drags and produce a fourth false pass.
  ✅ **CLOSED 2026-08-22 — Bean's own by-hand recheck, exactly what this step was blocked on.**
  Confirmed: the drag/text-selection symptom occurred on physics-simulated sliders, and that was
  fixed too. This is the eye-over-null-measurement verdict D449 required — nothing further to do.

### Step U — file-length debt — SUPERSEDED 2026-08-21, see the plan [OPEN, reframed]
  **The register's four filenames and all four numbers were wrong** (they had grown: 815/947/619/
  1181, not 617/671/523/1045) — and, more importantly, four files was never the scope. **Measured:
  110 files breach the limits** (51 `render.php` > 300, 59 `edit.js` > 250; 42,207 excess lines).
  ⛔ **Bean REJECTED a file-length gate** (2026-08-21) — dev friction, and it punishes legitimate
  size. Do not re-propose one. He reframed the task: find the common bloat SHAPES and fix those.
  **Measured shapes:** change-narrative documentation **5,739 lines** (the biggest); inline
  sanitiser closures **663** across 129 definitions; JS `ResponsiveBoxControl` glue 1,377 —
  **refuted**, it is call-site glue around an already-shared component, not duplication.
  ⚠ **Counted on CODE lines only, over-limit `render.php` is 26, not 51** — a third of those files
  is documentation. Rank targets by duplication DENSITY, never raw line count.
  **Where this went (all IN-REPO — the earlier pointer was to a `~/.claude/` path a fresh session
  on another machine cannot read):** the owed list + the 11-gate-backed-vs-37-UNENFORCED
  prohibition split is `.claude/reports/2026-08-21-unenforced-prohibition-register.md`; the
  remaining ~70-file comment sweep is an open unblocked track at
  `.claude/plans/2026-08-21-comment-narrative-cleanup-track.md`; three ready-to-paste session
  prompts are in `.claude/prompts/`. Decisions: D722 (closures), D723 (scroll-smoother),
  D727 (comments explain function, not change).

### Step 21 — re-run the adversarial council [OPEN — DELIBERATELY LAST]
  **Model:** inline · **Time:** 30 min · **Deps:** every other step above, no exceptions
  Run `/adversarial-council` on the post-wave surface to catch what these fixes introduced. The
  2026-07-31 run found what a single reviewer never would; a second round after the fixes is the
  documented two-round pattern. Compare grades against B−/B−/C+/C+/C−/D+.
  ⚠ Council findings are HYPOTHESES — fact-check before acting. **Proven again 2026-08-02:** a rater
  claimed a token was "chosen because D463 measured it"; the token was hardcoded 2026-04-29 and D463
  is 2026-08-02, measuring a different token entirely.

---

## Measurement limits — what a session can and cannot check

- **Chrome DevTools MCP cannot simulate reduced motion and cannot do a real drag gesture.** The only
  instrument that does either is the committed Playwright harness (`scripts/motion-qa/*.mjs`).
- **The browser session is shared** with whatever else is running — confirm which page you are on
  before trusting a reading.
- **`networkidle` never settles on a WooCommerce page.** `probe-carousel-loop.mjs` falls back to
  `load` + settle and announces it.

## The live test pages (canaries)

- `/motion-canary-wave-c/` (2083) general effects · `/motion-roster-canary/` (2086) every
  motion-capable block · `/fx-preset-comparison-columns/` (2105) scramble presets
- Loop fixtures (2026-08-02): `/loop-carousel-canary/` gallery · `/loop-fixture-post-grid/` ·
  `/loop-fixture-trustpilot-v3/` · `/loop-fixture-google-reviews/` · `/loop-fixture-buybox/`
- Cursor field: `/cursor-field-canary-2/` (2120)

⚠ **Building a fixture:** `wp post create`, never `wp post update` (a project hook blocks it). Never
hand-author `post_content` — serialise from a known-clean page. The fingerprint of the contamination
that killed six old fixtures is a stored `<div class="wp-block-sgs-container"></div>`, which
`container/save.js` never emits. **Verify per BLOCK in the real editor (`isValid`), not per page** —
the frontend was never the broken surface.

## Tooling

| Type | Name | Used for |
|---|---|---|
| skill | `/delegate` | every dispatched step |
| skill | `/qc-council` | validating fix-shapes against a measured baseline before building |
| skill | `/adversarial-council` | Step 21 only |
| cli | `build-deploy.py --target sandybrown --payload <paths>` | every deploy |
| cli | `probe-carousel-loop.mjs <url> <item-selector>` | loop verification |
| cli | `probe-first-paint.mjs <url> <item-selector>` | no-JS first-paint capture |
| cli | `check-fx-list-drift.py --self-test` | the drift gate |
| external | Playwright | all live verification |

## Parking lot

**Deliberately EMPTY, and it must stay empty.** Bean-ruled 2026-07-31: `parking.md` is strictly for
BLOCKED or POSTPONED work, never a reminder list — and **every open Spec 38 item lives in this file
instead**. Nothing here is parked: the nine steps above are all actionable now, in the order given.

If a step later becomes genuinely blocked on something outside this track, move it to `parking.md`
with a `**Status:** BLOCKED` field and the blocker named — and **ask Bean first** (never add a
parking entry unilaterally).