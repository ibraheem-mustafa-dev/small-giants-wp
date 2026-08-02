Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this plan, the LEDGER wins.
> ⛔ **NEVER add anything from this plan to `parking.md`.** Bean-ruled 2026-07-31: parking is strictly for BLOCKED or POSTPONED work, never a reminder list. **This plan IS the register.**
> ⛔ **DEPLOY HAZARD, PROVEN THREE TIMES.** The shared tree's compiled `build/` contains co-active tracks' uncommitted edits, and `assets/` is a separate directory a partial copy silently misses. Use `build-deploy.py` with `--payload <your paths>` — never `--allow-dirty`, never a hand-rolled tar.

# Spec 38 motion — the OPEN register

> **PRUNED 2026-08-02: every COMPLETED step was DELETED from this file.** Closed work lives in
> `decisions.md` (D-numbered) and `git log`, not here. **If a step has a `### Step` heading below,
> it is OPEN. There are no closed steps in this file.** Nine remain.

## Where this stands

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

### Step Z-residual — one block-scoped focus sweep [OPEN — the top item]
  **Model:** sonnet · **Time:** 45 min
  **Action:** Every block-scoped `:focus-visible` still using `currentColor` or a hardcoded
  `primary-dark` joins the shared `--sgs-focus-*` family (now accent, per D467):
  `nav-menu/style.css:123`, `responsive-logo` (lifted CSS), `brand-strip/style.css:459`,
  `card-grid/style.css:264`, `cta-section/style.css:287`.
  ⛔ **`sgs/button` is NOT in the sweep until its writer is FOUND.** 7 elements compute `#3a2e26`
  while both matching rules resolve to accent — something the rule-scan missed is winning. Prove the
  cause first.
  ⛔ **`sgs/nav-menu` was built, deployed and measured working, then REVERTED** — the visual-diff
  gate's `first_paint_capture_passed` cannot be honestly claimed for a block that renders a hidden
  second copy inside the drawer (the capture reads `2/4 visible`, a probe artefact). Either fix that
  probe for multi-instance blocks or get a genuine capture. **Do not fake the field.**
  **Done when:** re-running the baseline method in `reports/2026-08-02-focus-cascade-baseline.md`
  shows the accent count rising from 15/25 with nothing regressed off-palette.

### Step Y — the loop's UNTESTED arms: reduced motion + keyboard wrap [OPEN]
  **Model:** sonnet · **Time:** 45 min
  **Action:** Two arms of the looping contract are built but never exercised — and now across FIVE
  blocks, not one.
  1. **Reduced motion.** `fx-draggable.js`'s contract is SIMPLIFY (drag is user-driven input) and is
     unchanged. **The LOOP module has no measured reduced-motion behaviour at all.** A clone-and-reseat
     is not autonomous motion, so SIMPLIFY is the likely answer — but it is currently unstated.
  2. **Keyboard arrow-wrap at the boundary.** Arrows are present and correctly never disable, but the
     wrap was driven by pointer and `scrollLeft`, never by repeated arrow activation. WCAG 2.5.7
     rests on that alternative working around the loop point.
  ⚠ **Playwright ONLY** — Chrome DevTools MCP has no `prefers-reduced-motion` and no trusted pointer.
  **Also:** Spec 38 §10 carries NO reduced-motion row for `cursor-field` or `carousel-loop`.
  **Done when:** both arms have a live measurement in `probe-carousel-loop.mjs`, and §10 has its rows.

### Step 8 — physics sandbox: the FR write-up is owed [OPEN]
  **Model:** inline · **Time:** 30 min
  **DECISION ALREADY MADE (D447) — do not re-present the menu.** Bean ruled physics are permitted on
  **non-interactive decorative layers only**, which dissolves the WCAG 2.5.7 problem (nothing a user
  must reach is throwable) and lets reduced motion disable the surface outright. Shape: a **dedicated
  container-equivalent "physics sandbox" block** whose children become throwable bodies — NOT a
  physics toggle bolted onto existing blocks with preset shapes.
  **Remaining work: write the FR into Spec 38 §2/§3.3.** The BLOCK itself is a separate design-gated
  build (new block = high blast radius, project rule 7) — do not start it from this step.

### Step 12 — the cloning lift: motion that survives a draft (FR-38-22) [OPEN]
  **Model:** inline · **Time:** 3 h
  ⚠ **MEASURED 2026-08-01 — the premise was tested and the answer is NO.** A probe against the REAL
  `convert_section()` with authored drafts (`reports/2026-08-01-motion-clone-probe.md`): **every fx
  attribute vanished — and not even into the skip-with-reason channel Rule 4 requires.** D436 seeded
  the runtime PLAYBACK registry, a different layer entirely. **So this stays a full build.**
  **Start here:** `lift_behavioural_attrs` (`db/db_lookup.py:4454`) is purpose-shaped for exactly
  this, has ZERO callers, and carries a latent bug — it strips `data-sgs-` and keeps the hyphenated
  remainder, so `data-sgs-fx-trigger` could never match `fxTrigger` even if wired.
  ⚠ Collides with Track 1's live converter work — check `LEDGER.md` before dispatching.
  **On-fail:** if it cannot land, AMEND Spec 38's success definition to say motion is applied by hand
  after a clone. Do not leave the claim standing unbuilt.

### Step 20 — spec ↔ code reconciliation [OPEN]
  **Model:** sonnet · **Time:** 1 h
  **Action:** add `data-sgs-fx-momentum` to §11.2's grammar; mark `fxShape`/`fxPath` seed status
  honestly in §11.3; retire the dead `scroll-smoother` `fx_effects` row (D422 moved smoothing to
  Lenis/Tier H); correct `generate-fx-qualifying-blocks.py`'s stale comment claiming
  `sgs/image-sequence` does not exist; wire or delete `sgs_get_fx_qualifying_blocks()` (zero callers
  while its docstring claims the render layer uses it).
  **Done when:** every grammar attr has a control, a DB row and a consumer — in both directions.

### Step R-residual — the cursor field's stated limits [OPEN, low priority]
  **Model:** sonnet · **Time:** 1 h
  Three things FR-38-25 states plainly rather than hides. None is a defect; each may want revisiting:
  1. **`floating-objects` is spec'd, not built** — Bean's third example. It is the first field type
     needing per-object JS, so it needs a Tier assignment under §1.3 (not assumed V) and its own §10
     reduced-motion answer, since autonomous object motion is not the static-field SIMPLIFY case.
  2. **A participant with its OWN `background-image` is deliberately not marked**, because our layer
     would replace it; that child keeps a visible seam. Clobbering a client's image is worse. A
     `::before` fallback is possible if the seam is ever reported.
  3. **The participant walk runs at init only.** A child whose background is set or inserted later
     will not participate until re-init. Fix if a dynamic case appears: a `MutationObserver` in
     `cursor-field.js`, never per-block code.

### Step O — the drag text-selection symptom [OPEN — ⛔ Bean re-checks BY HAND]
  ⛔ **RULED 2026-08-01 (D449) — do NOT dispatch an agent at this.** The cause-agnostic `user-select`
  mitigation shipped and is live. Scripted drags across Chromium, WebKit and Firefox could not
  reproduce the symptom, and per measurement-vs-eye **Bean's report STANDS over the null
  measurement**. An agent would re-run scripted drags and produce a fourth false pass.

### Step U — file-length debt on the grid blocks [OPEN]
  **Model:** haiku · **Time:** 2 h
  Against the project's own limits (PHP 300, JS 250): `card-grid/render.php` 617,
  `card-grid/edit.js` 671, `post-grid/render.php` 523, `post-grid/edit.js` **1,045**.
  Bean ruled 2026-08-01: log it, tackle separately — splitting large files while agents are mid-edit
  in a shared worktree invites clobbering. **Do this in a clean session.**

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
