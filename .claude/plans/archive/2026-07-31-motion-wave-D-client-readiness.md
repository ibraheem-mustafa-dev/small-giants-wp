Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this plan, the LEDGER wins.
> ⛔ **NEVER add anything from this plan to `parking.md`.** Bean-ruled 2026-07-31: parking is strictly for BLOCKED or POSTPONED work, never a reminder list. **This plan IS the register.**
> ⛔ **DEPLOY HAZARD, PROVEN THREE TIMES.** The shared tree's compiled `build/` contains co-active tracks' uncommitted edits, and `assets/` is a separate directory a partial copy silently misses. Use `build-deploy.py` with `--payload <your paths>` — never `--allow-dirty`, never a hand-rolled tar.

# Spec 38 motion — the OPEN register

> **PRUNED 2026-08-02: every COMPLETED step was DELETED from this file.** Closed work lives in
> `decisions.md` (D-numbered) and `git log`, not here. **If a step has a `### Step` heading below,
> it is OPEN.** 2 remain by heading count (`grep -c '^### Step' <this file>`), both pre-existing
> exceptions to that convention out of today's scope: Step O is a completed step whose heading was
> never pruned; Step U is deliberately reframed ongoing debt-tracking, not a blocking gate.
> **Every dispatched item this wave closed 2026-09-04, same
> session:** Step 12 (D949/D951), Step 20 and Step R-residual (decisions the register hadn't caught
> up to — D723, D839/FR-38-33), and Step 21 itself (D952/D953) — see the struck-through summaries
> below. This wave-D register is now fully closed bar Step U's ongoing, non-blocking debt-tracking.

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

> **Step 12 — CLOSED 2026-09-04** (D949 + D951, `reports/2026-09-04-motion-clone-probe-verified.md`).
> D949 fixed two real bugs (missing `block_attributes` rows for `fx*` attrs; a kebab-case/camelCase
> matching bug in `lift_behavioural_attrs`) but closed on a synthetic unit test — D951 caught that
> `lift_behavioural_attrs` was STILL never called anywhere in the live walker (D949's "has real
> callers now" claim was wrong, sourced from an unverified docstring comment) and wired one
> additive call into `build_block_markup`. Re-ran the 2026-08-01 probe's exact drafts against the
> REAL `convert_section()`: fx attrs that vanished with zero trace on 2026-08-01 now appear
> correctly in the emitted markup, content still clones fine, Gate A + the wider test suite both
> pass clean. Rule 4's skip-with-reason reporting for an `fx*` attr with no destination on the
> resolved block — flagged as unbuilt here, then actually built same session, D955. ⚠ **One item
> still genuinely open:** this is pipeline-level proof, not a live-canary Playwright/DOM check —
> R-31-13 still wants Bean's eye before the spec's success claim is finalised.

> **Step 20 — CLOSED 2026-09-04.** All 5 sub-items resolved: (a)/(b)/(d) were already closed per
> this register's own prior annotations; **(c)** got its D-numbered ruling at **D723** (2026-08-21,
> KEEP the `scroll-smoother` row as a deliberate negative proof — this register just hadn't been
> swept to reflect it); **(e)** is closed by deletion — `sgs_get_fx_qualifying_blocks()` and
> `generated-fx-qualifying-blocks.php` no longer exist (`generate-fx-qualifying-blocks.py:300` and
> `check_fx_qualifying_blocks_stale.py:19` both reference the removal in the past tense; zero live
> definitions grepped tree-wide).

> **Step R-residual — CLOSED 2026-09-04.** Item 1 (`floating-objects`) was reclassified by **D839**
> (2026-08-27, INCIDENT): the spec had recorded the wrong effect for seven weeks — the owner's real
> ask is a canvas grid-dot field, now **FR-38-33**, **BUILT 2026-08-28** (Spec 38 §3.3:1407). A
> sibling item, FR-38-34 (repulsion particle field), was recorded at the same time and is NOT
> BUILT, but that's newly-scoped work this register never named, not the task described here. Item
> 2 (a participant's own `background-image` seam) stays a legitimate low-priority design note —
> explicitly not to build speculatively — but doesn't warrant its own step. Item 3 was already
> closed in this register's own prior text.

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
  prohibition split is `.claude/reports/2026-08-21-unenforced-prohibition-register.md` (extended
  2026-08-22 with a second classification pass). The ~70-file comment sweep is ✅ **DONE** — the
  track closed 2026-08-22 at ~91 files / ~593 lines, and its plan + prompt files were deleted on
  completion, so do not go looking for them. Decisions: D722 (closures), D723 (scroll-smoother),
  D727 (comments explain function, not change).

> **Step 21 — CLOSED 2026-09-04** (D952/D953, `decisions.md`). Six-persona council run against
> D949/D951, grades D/C+/C/C+/D/F — below the 2026-07-31 baseline (B−/B−/C+/C+/C−/D+), and the
> council's own point stood: it found what a single reviewer wouldn't have. Every finding
> fact-checked before acting (per this step's own warning) — independently re-verified the
> ghost-row query, the missing-attribute count, and the type-coercion bug against the real code
> before fixing any of them, not taken on the council's word. Five real defects found, all fixed
> same session: the D949 ghost-row self-destruct bug, the 29-of-78 incomplete attribute roster,
> hardcoded string types breaking a real PHP strict-boolean check, missing value coercion, and a
> separate pre-existing stored-XSS-class defect in the converter's block-comment serialiser
> (`emit_block_markup` + a second identical emitter + a re-parse consumer that would have silently
> stripped the fix — found by tracing every reachable consumer, not assumed safe). Regression test
> coverage added for the fx-lift path specifically (the Verification-Skeptic's finding) and for the
> escaping fix (17 tests, each paired with a negative control proving the payload is genuinely
> dangerous unescaped). Two shared-worktree collisions handled by checking with the owning session
> rather than forcing past a gate; one genuine near-miss (a commit briefly swept up a concurrent
> subagent's in-progress edit to the same file) caught and corrected by the subagent's own
> follow-up commit — recorded honestly, not glossed over.

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