# Next session — build the Shape-B reference on `sgs/accordion`, then roll out

Invoke `/autopilot` before anything else.

**Read D881 in `.claude/decisions.md` first.** Spec 35 §14 opens with an `AMENDED 2026-08-29` box —
read that too, because the rest of §14 still describes the pre-migration UI.

> **Every factual claim below was re-verified against the tree on 2026-08-29** after an audit
> produced several false positives. Where an earlier doc says otherwise, the correction is marked
> ⭐ CORRECTED and the doc is named. Re-verify anyway — other tracks commit constantly.

---

## State of play, verified

| | |
|---|---|
| **Shape A** — edit.js-only swap onto existing private attrs | ✅ **CLOSED.** 10 blocks: `button`, `container`, `heading`, `icon-list`, `option-picker`, `process-steps`, `product-card`, `quote`, `text`, `timeline`. `PRIVATE_NEEDS_SWAP 0`, `PRIVATE_DONE 10`. |
| **Shape B** — native → block-private attrs + `render.php` emission | ❌ **NOT STARTED.** `NATIVE_FULL` still **38**. Zero `block.json` and zero `render.php` were touched by the whole border track (verified: its 12 commits touched 10 × `edit.js`, 2 components, the codemod + fixture, 1 helper, 1 new probe). |
| **ANOMALY** — 7 blocks | ❌ Triaged only. 3 to adopt, 2 settled exclusions, 2 deferred. |
| **Radius pairing** | ❌ **Zero** blocks wire `onRadiusChange`; all 10 still mount their own `ResponsiveBorderRadiusControl`. |

⛔ **"Shape A closed" is NOT "borders done"** — 45 of 83 blocks are still outside the shape.

⛔ **Per-device border WIDTH is CANCELLED** (Bean, 2026-08-29), plumbing removed at `f5c9b66ae`.
Spec 35's "Promotion trigger" for it is explicitly overruled in the §14 amendment box. **Do not
rebuild it and do not cite that trigger as authority to.**

---

## TASK 1 (FIRST ACTION) — Convert `sgs/accordion` as the Shape-B reference

Bean's instruction (2026-08-29): **do this first, and use the result as the shape for the migration
script that converts the rest.** Everything else in this prompt waits behind it.

`accordion` is the right reference for three verified reasons: **zero** theme-authored border values,
**0** live posts authoring a border (31 posts contain `wp:sgs/accordion`; re-check), and its native
border path is **already dead code** — so nothing can regress.

### 1a. Fix the `style` collision first — it is why the native path is dead

**Verified:** `accordion/block.json` declares `"style"` as a **string** (`default: "bordered"`, the
visual preset) while ALSO declaring `__experimentalBorder` with all four sub-flags. The explicit
string declaration wins, so `$attributes['style']` is `"bordered"` and every
`isset($attributes['style']['border']…)`-shaped read in `render.php` evaluates a non-numeric string
offset → `false`. **Its border, colour AND typography supports have never rendered.**

Bean approved renaming the preset attribute to free the native `style` object.
- Back every affected post up to `.claude/backups/` first; migrate the stored preset value.
- The rename is **not** length-preserving, so the zero-byte assertion used for the button rename does
  **not** apply — assert on parsed attributes instead.
- ⛔ Never write `post_content` without `--user=1` (KSES strips CSS); never to a page open in the editor.
- ⚠ `sgs/accordion-item` has the identical `__experimentalBorder` but **no** `style` attribute
  (verified `null`), so ITS native path IS live and functional. Out of scope — but it will be
  inconsistent with its parent afterwards. Flag it.

### 1b. Then the Shape-B conversion, which becomes the codemod's target shape

The target is already determined by shipped code — do not invent it:

- **`block.json`** — drop `color`/`style`/`width` from `supports.__experimentalBorder`; **keep
  `radius: true` + `__experimentalSkipSerialization: true`**. Add `borderWidth` (object, default
  `{}`), `borderStyle` (string, the 9-value enum at `quote/block.json:213-227`, default `"none"`),
  `borderColour` (string `""`).
- **`render.php`** — per-side `sgs_css_length_value()` over the width object; style checked against an
  `in_array` allowlist (the convention 9 of 10 migrated blocks already use); **emit `border-style`
  ONLY alongside a real width** (the G5 rule — `product-card/render.php:330-346`); colour + gradient
  via `sgs_border_states_css()`. Radius keeps going to `wp_style_engine_get_styles()`. Scoped
  `<style>`, never inline (Spec 32).
- **`edit.js`** — mount `<SgsBorderControl>`, and **wire `onRadiusChange`** so accordion is also the
  reference for Task 2's pairing.

⛔ **Before removing native sub-flags on ANY block, grep the theme** for authored border values on
that block (D683: `check-dead-pattern-attrs.py` asks whether the support KEY is declared, not whether
its sub-flags are on). For accordion this is verified clean; for the other 37 it is not.

### 1c. Only then build the Shape-B codemod

With one proven conversion, extend the triad (`--survey` / `--fix` / `--check` / `--self-test`) as its
own script — **not** a branch of `migrate-border-control.js`, whose header states a hard Shape-B
exclusion. Fixtures + a negative control, per `.claude/THE-MIGRATION-METHOD.md`.

⚠ **Two traps this track already hit, both cheap to avoid here:**
- **Run `--check` against the POST-apply state before registering it.** `migrate-border-control.js`
  shipped with `FIXABLE_FLOOR = 6`, which would have gone red *because* the migration succeeded.
- **A fixture carrying a field nothing asserts on is untested surface.** The `linked: true` drop
  sailed through 14 green assertions for exactly that reason.
- **A reference commit is a valid oracle only for properties it was itself verified to have.** The
  PROOF assertions replayed two commits that had both dropped `linked`.

---

## TASK 2 — Pair the native radius into `SgsBorderControl` across the 10

`SgsBorderControl` renders `ResponsiveBorderRadiusControl` as the pair's second control when the
caller passes `onRadiusChange`. **Verified: no block does.** Move each block's standalone radius
control into the mount and delete the original.

⚠ **Radius storage is NOT uniform — read each block.** Some use `style.border.radius` base-only;
`icon-list` also writes `borderRadiusTablet`/`borderRadiusMobile`; `whatsapp-cta` has **only**
`borderRadiusTablet`/`borderRadiusMobile` attrs (base rides native `style.border.radius`).

⚠ Three radius attrs are flagged untriaged in
`.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md:98-99,124`:
`multi-button.childBtnBorderRadius`, `mega-panel.borderRadius`, `product-card.ctaBorderRadius`.
⭐ **CORRECTED:** that doc also says `check-box-flat` is "wired into prebuild but its exit code is not
propagated". **It is not wired at all** — `scripts/consistency/check-box-flat.py` exists with a
baseline, but has zero references in `package.json` and `gates.json`.

---

## TASK 3 — The 3 ANOMALY adopters

Exclusions settled, do not revisit: `filter-search` (border belongs to its inner `<input>`) and
`social-icons` (per-item, only under the `outlined` style). `mega-panel` + `product-search` stay
deferred while another track holds them.

⚠ **Decide gradient-border routing BEFORE building.** `sgs_border_gradient_css()` has
⭐ **26 callers** (the plan doc says 21 — stale) and covers gradient borders only. `mega-aside`
declares `asideBorderColourGradient`, so the composite and that helper meet in this task.

1. **`mega-aside`** — smallest. Verified: has `asideBorderWidth` / `asideBorderColour` /
   `asideBorderColourGradient`; only `borderStyle` is missing, and `render.php:109` hardcodes
   `border-style:solid`.
2. **`label`** — verified `borderRadius` only. ⚠ Its box CSS comes from the shared
   `sgs_label_box_css_rule()`, also used by `product-card` — adopting here **retro-changes a block
   already declared closed**, so it carries a re-verification obligation on product-card.
3. **`whatsapp-cta`** — verified radius-tier attrs only; the `<a>` IS the block root, and
   `style.css:13` sets `border:none`, so the composite's rules must come from the `.uid` rule.

---

## TASK 4 — Close the two blocks that are NOT live-proven

`sgs/container` and `sgs/option-picker`. The probe measures the OUTERMOST `.wp-block-sgs-<name>`, so
on container it matches the page header's container; option-picker returned NOT RUN.

⚠ **Third recurrence of a tripled defence** — `STOP-CATALOGUE.md:2352-2360`, `:2505-2511` and
`mistakes.md:253-256` all say: scope every live-DOM query to `.entry-content` or the block's own uid
class, never a bare block-type class. Fix the probe to scope by uid, then close both.
**NOT RUN is not a pass.**

⚠ **The probe is UNWIRED** — verified zero references in `package.json` and `gates.json`. Either wire
it or state in `plugins/sgs-blocks/CLAUDE.md` that it is manual-only. This repo's recorded failure
mode is exactly "built but never wired" (D338/D493).

---

## TASK 5 — Doc debt this rollout left

- **4 of the 10 migrated blocks have NO row in the Block Build Status table** (verified 0 rows each):
  `button`, `quote`, `text`, `timeline`.
- **5 rows exist without mentioning the migration**: Container, Icon List, Process Steps, Option
  Picker, Heading. Container is also a `sgs_border_states_css()` caller AND unverifiable by the probe.
- **Accordion's row** is `| Accordion + Accordion Item | Deployed |` — misleading given Task 1a.
- **The Border-controls section** omits: `PRIVATE_DONE 10` / `NATIVE_FULL 38` / `ANOMALY 7`; that
  width is `ResponsiveBoxControl` with the switcher OFF; that `option-picker` returns NOT RUN; the
  probe's 16/16 self-test; and the sibling gate `check-border-style-without-width.py`.
- **`dev-setup.md:1630`** — the `migrate-border-control.js` catalogue row begins mid-sentence, losing
  the verb and the component name, and omits the script's hard Shape-B exclusion.
- **Spec 35 §14** fields 1/3, `:123`, `:651-654`, `:2373-2377` still describe the old UI. The
  amendment box flags this; the fields themselves are untouched.
- **`mistakes.md` is at 35 entries** against its own ~30 target; 2 of the oldest duplicate STOP
  entries verbatim, and 7 remain in the retired stub shape (2 written after that convention was retired).

---

## TASK 6 — STOP catalogue

8 findings from 2026-08-29 are NEW (2 already covered, 1 a sharpening, 1 half-covered):
1. A field a fixture carries but no assertion reads is untested surface pretending to be tested.
2. A historical reference is a valid oracle only for properties it was itself verified to have.
   ⚠ This CORRECTS `STOP-14` (`:1174`) and `STOP-REBUILD-THE-TREE-…` (`:2441`), which prescribe the trap.
3. Where a path resolves tokens, the TEST VALUE must be a token — sharpen `:1022-1028`.
4. A guard must not go red because the work succeeded (`FIXABLE_FLOOR`). Adds a 4th gate shape to
   `THE-MIGRATION-METHOD.md:544-547` and contradicts `:284-286`.
5. `read_text` normalises CRLF; assert byte-preservation ON DISK. File beside `:223-234`.
6. A directory pathspec commits a tracked deletion but skips an untracked addition.
7. `git index.lock` — retry, never delete.
8. A block key colliding with a core-reserved attribute silently disables the support (accordion's `style`).

To `mistakes.md`: *a verification check that masks the region it should inspect*.
To `THE-MIGRATION-METHOD.md`: `ensure_ascii` mutates VALUES (unmentioned anywhere), and the
JSON-round-trip hazard is scoped to files, not to attribute JSON inside `post_content`.

---

## TASK 7 — FINAL ACTION: collapse this track's LEDGER section

Bean's instruction: once everything above is done, collapse `## ▶ MAMA'S CLONE TRACK + TASK 0` in
`.claude/LEDGER.md` to a pointer, matching the finished tracks (e.g. `## ▶ EDITOR-ERRORS TRACK —
CLOSED 2026-08-22 (D743)` — one line, "nothing pending", detail single-sourced to its D-number).

Target: heading + closure date + `Detail: D881 (+ this session's D-numbers)` + one line naming any
still-open work and where it lives.

⛔ **LAST, not earlier** — it is the only in-LEDGER pointer to this work.
⛔ **Trim only THIS track's section.** The file went over cap twice on 2026-08-29 because *other*
tracks grew it; the rule is to trim your own, never theirs.

---

## ⭐ Claims from earlier docs that are FALSE — do not act on them

Verified against the tree 2026-08-29. Each was in a doc or an audit report and would have wasted a session.

1. **"All 10 Shape-A blocks still declare native border supports — the duplicate Border panel is
   unmet."** FALSE. All 10 declare `__experimentalBorder` with **`radius: true` only** — deliberate,
   because radius stays native. There is no duplicate width/style/colour panel.
2. **"9 `render.php` reference `borderStyle` and are unaudited; no gate"**
   (`plans/2026-08-25-road-to-uniform-then-spec-39.md:96`). FALSE NOW. All 10 sanitise — 9 via an
   `in_array` allowlist, `button` via the `sgs_css_keyword` helper. An allowlist is STRONGER than the
   `preg_replace('/[^a-zA-Z-]/')` that doc prescribes. Not a security blocker.
3. **"The counts disagree — 48 blocks declare `__experimentalBorder` vs 38 NATIVE_FULL; reconcile."**
   FALSE. Different predicates, and they reconcile exactly: **49 declare it at all = 38 with all four
   sub-flags (NATIVE_FULL) + 11 radius-only.** Nothing to reconcile.
4. **"The LEDGER is 1,712 bytes OVER cap."** FALSE — an audit agent's arithmetic. The gate reported
   24,418/24,576 and PASSED. Run the gate, not a recount.

---

## Standing hazards — carried forward, never subtract (D101)

1. `main` is shared. `git commit -- <explicit FILE paths>`; never a bare commit, never `--amend`, and
   **never a directory pathspec** — it commits tracked deletions but skips untracked additions.
2. **`index.lock` collisions are frequent.** Retry in a bounded loop; NEVER delete the lock.
3. Never write `post_content` to a page Bean has open in the editor.
4. `wp post update` without `--user=1` silently strips CSS from block attributes.
5. A deploy can report `[ABORTED]` while its payload landed — check the server.
6. Git Bash can show a stale view on Windows; confirm via PowerShell.
7. **A page-HTML grep cannot prove CSS absence** — block CSS is lifted into `uploads/sgs-css/`.
8. **Python `read_text` normalises CRLF.** Use `newline=""` on read AND write; assert on-disk bytes.
9. **`json.dumps` reformats.** Never re-serialise stored block attributes to change a key.
10. Verify subagent and tooling claims against ground truth — four in this prompt's own audit were false.
11. A dispatched agent's "completed" status is not proof; check for an artefact.
12. Two commit-gate layers: `[gates-ok:<reason>]` for the session hook, `--no-verify` for git's native one.
13. **D851 still does not reproduce.** Do not cite page 2884 as evidence of anything.

## Environment notes

- Built deploy worktree at `C:/tmp/sgs-deploy-wt` (`vendor/` copied in) — reuse to skip a ~5-min
  `npm ci`. NOT auto-cleaned; check out the commit you intend to deploy and rebuild first.
- Deploys currently need `--payload plugins/sgs-blocks/includes/extension-attributes.generated.php`
  and `--skip-gate-full` (two `grayscaleHover` converter tests fail at the PRE-session commit —
  proven at `c38607940~1`, not inherited). **Re-prove both.**
- `.claude/secrets/sandybrown.env` recovered 2026-08-29 from `.claude/worktrees/product-archive-p2/`.
- ⚠ **D875's gradient fix is largely reverted in the shared DB** — its own gate reports 74 unfixed
  rows. Effect proven, cause NOT. Not this track's to fix.
- ⚠ **There is no border-control PLAN document** (zero hits across 40 live plans + archive). If Shape
  B proceeds at scale it needs one, not another prompt.

## Cross-track — RAISE with Bean, do not action

1. The client-controls track has TWO prompts; `2026-08-29-recovery-residuals-and-the-root-filter-nogo.md:3`
   declares `2026-08-28-rollout-detectors-and-the-null-element-tail.md` superseded, but both are on disk.
2. `.claude/plans/2026-08-24-stack-layout-rebuild.md` is archivable — `status: COMPLETE`, commit SHAs,
   QC 7/7, zero references anywhere.
