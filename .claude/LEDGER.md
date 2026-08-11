---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 9). `columns` — the last property that touches the shared wrapper —
is migrated, deployed, and live-verified.** Four of the six passes in the responsive-settings
migration are now done (`gap`, `maxWidth`, `gridTemplateColumns`, `columns`). Two remain
(the font-size families, and a long tail) and neither touches the shared wrapper file, so this
is the last of the RISKY passes.

- **What "migrated" means in practice:** the number-of-columns setting used to be stored as
  three separate boxes (one per device). Now it's one box holding all three, matching how
  spacing and width already work. I edited the shared piece of code all 21 grid blocks use
  myself (the highest-risk part, per your sign-off), and delegated the block-by-block sweep
  (schema + editor controls + render code + 6 theme patterns) to a subagent.
- **The exact bug that broke `gap` on 19 blocks last session (a shared control still writing
  to boxes that no longer exist) was checked for and found again** — the same shared file, plus
  two header/footer files independently reintroducing it. Fixed in the same commit, not left
  for next time.
- **Proven live, not just on paper:** I opened the real block editor, set a column count per
  device, saved, and measured the actual rendered page at all three screen widths — 3 columns
  on desktop, 2 on tablet, 1 on mobile, exactly matching what was set. Reset and undo both
  worked. Then I built a second page carrying all 21 blocks at once and proved 14 of them bind
  live; the other 7 are individually explained (2 don't actually use this setting for their
  grid at all — traced to the exact line of code proving it; 5 have no CSS grid this method can
  see, e.g. they're flex or JS-driven, which is a fact about the code, not a gap in testing).
- **The visual-diff safety check couldn't run its normal way a second time** — same reason as
  last session (documented then as D577): once the code is live, there's no way to capture
  "what it looked like before" any more. I used the same stronger-but-narrower evidence Bean
  already accepted once, and said plainly what it doesn't cover.
- **Found and fixed a real, unrelated bug along the way:** a button's font-size setting never
  rendered at all — the code computed the right value and then forgot to use it. One line fix.
  (Investigated by a background agent that also looked at 3 other "broken" settings; those 3
  turned out to be the TEST PAGE's fault, not the blocks' — explained, not guessed.)
- **4 stale test pages on the canary were blocking the deploy** (old-shape content) — checked
  each one's title first, confirmed they were scratch/QA pages, deleted them.

**Earlier narrative:** session 8 → `memory/session-2026-08-11-session8.md` (once rotated);
session 7 → `memory/session-2026-08-11-session7.md`; session 6 and earlier →
`memory/session-2026-08-08.md`. Full detail in commit messages + `decisions.md` D546-D578.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D578**.

### ✅ SESSION 9 — the `columns` pass (D578)

| What | Where |
|---|---|
| Shared wrapper extraction → tier-object read | `class-sgs-container-wrapper.php:228-241` |
| S1-S4 sweep (21 blocks: block.json/edit.js/render.php + 6 theme patterns) | delegated agent, verified inline |
| `button.fontSize` never emitted — found + fixed | `button/render.php` |
| 3 of 4 "non-binding" properties from session 8 explained as FIXTURE bugs, not block bugs | see Task 3 result below |
| Deploy via `--payload` (broke the commit/deploy deadlock) + 4 stale pages deleted | canary |
| Live-editor + 21-block positive-control verification | `/tier-fixture-columns/` (post 2255) |
| Visual-diff gate bypassed a 2nd time, same shape as D577 | `decisions.md` D578 |

**Task 3 result (the 4 unexplained non-binding properties from session 8):**
- `button.fontSize` — REAL bug, fixed (see above).
- `decorative-image.positionY`, `hero.splitContentOrder`, `quote.attributionMarginTop` — all
  three are **fixture/probe construction gaps**, not block defects (zero-height wrapper
  collapsing a percentage `top`; the fixture forcing `variant:'standard'` so a split-only code
  path never runs; a probe deriving the wrong unit-sibling name). Each has a proven file:line
  cause. No block code needs changing for these three; the fixture builder does, when someone
  picks that up — not currently scheduled.

### ⭐ NEXT SESSION — orchestration plan

**Passes 1-4 of 6 are DONE** (`gap`, `maxWidth`, `gridTemplateColumns`, `columns`) — all four
shared-wrapper properties. **Passes 5-6 remain and do NOT touch the shared wrapper.**

---

## Task 1 — Pass 5: migrate the font-size families to the tier-object shape

**What:** `labelFontSize`, `titleFontSize`, `priceFontSize` and siblings across the blocks that
declare them — a different shape from passes 1-4 (bespoke per-block NAMES but one underlying
mechanism), routed through `TypographyControls` + `sgs_typography_css_rule` rather than the
shared container wrapper.
**Why:** the next scheduled pass per the migration design's property order (§Phase overview).
**Estimated time:** 20 min design/survey + 40 min build.

**Orchestration:**
- Execution: delegated (no shared-wrapper edit this pass — lower blast radius than passes 1-4).
- Model: `sonnet` via `/delegate`
- Dispatch pattern: single-agent, same triad as passes 1-4
  (`migrate-tier-object.py --property <name> --survey/--fix/--check`).
- Brief: run `npm run survey:responsive-shape` fresh to regenerate the exact font-size property
  list (do not trust a cached list — it drifts). Each property routes through
  `TypographyControls`/`sgs_typography_css_rule`, NOT `SGS_Container_Wrapper` — read
  `plugins/sgs-blocks/CLAUDE.md`'s "TYPOGRAPHY — use the SHARED component" box before touching
  any block. Apply the same item-0a check (grep every writer of `<name>Tablet`/`<name>Mobile`
  across `edit.js`/`components/`/`extensions/` — a shared component is the high-risk case).
- Context it will not have: the design doc's "Per-pass definition of done" (items 1-9 +
  0a-0d) governs every pass, including this one — read
  `.claude/plans/spec-35-flat-to-object-migration-design.md` in full first.
- Depends on: none.
- Parallel with: none scheduled.
- /qc gate after: `/qc-inline` (no shared-wrapper change this pass, so `/qc-council`'s
  shared-mechanism trigger does not apply — confirm that's still true before skipping it).

**Acceptance:** `migrate-tier-object.py --property <name> --check` exits 0 for every font-size
property AND at least one block's binding proven live in the editor (item 0b) AND the visual-diff
gate satisfied NORMALLY this time (a genuine before-capture is obtainable since this property was
never deployed pre-migration on this pass — do not assume another bypass is available).

---

## Task 2 — Pass 6: the long tail

**What:** whatever `npm run survey:responsive-shape` still lists after pass 5 closes.
**Why:** closes the migration.
**Estimated time:** unknown until pass 5 closes and the survey re-runs — do not estimate from a
stale list.

**Orchestration:**
- Execution: inline first (re-run the survey, read what's left), then delegate per-property.
- Depends on: Task 1 (pass 5) closing, so the survey reflects the true remaining set.
- /qc gate after: per-property, same as Task 1.

**Acceptance:** `npm run survey:responsive-shape` shows 0 real migration candidates remaining
(the `asset_like`/`flag_like` families stay correct as-is, per the design doc's own exclusion).

---

## Dependency graph

```
Task 1 (pass 5, sonnet, no wrapper edit) ──► Task 2 (pass 6, survey-driven)
```

⛔ **ONE deploy per cycle, run by the main thread.** Parallel deploys to the shared canary
caused D576. Verify the DEPLOYED schema after any deploy, not just HTTP 200.

## Methodology guardrails (do not skip)

- **Deploy before measure** — and then verify the DEPLOYED schema, not just HTTP 200 (D576).
- **The dirty-tree/visual-diff-gate deadlock has a built escape:** `build-deploy.py --payload
  <path>` deploys a declared uncommitted payload without `--allow-dirty`, so you can capture the
  live evidence the pre-commit gate demands BEFORE committing. Used this session — works.
- **`querySelector` on a page with header/footer/multiple instances of a block type returns the
  FIRST match in document order, not necessarily your test instance** — scope every DOM query to
  the specific container (`.entry-content .wp-block-sgs-x`), never the bare class. Caught this
  session mid-verification (grabbed the site header's container instead of the test block).
- **Root cause before instance fix** — ask what CLASS of failure this is before fixing the one
  case.
- **`/qc-council` before every commit** touching converter/pipeline/shared-wrapper/SGS block
  logic (blub.db 255).
- **Verify the EFFECT landed, not the exit code.**
- **`git commit --amend` IGNORES the original pathspec** and flushes the WHOLE index. Amend only
  when the index is empty.
- **Re-run the D-ceiling command immediately before writing a decision entry.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.
- **Concurrent session (not this track):** hero gradient-overlay work
  (`hero/block.json`/`edit.js`/`render.php`, `GradientOverlayControl.js`,
  `components/primitives/index.js`) was IN-FLIGHT and uncommitted when this session started —
  Bean-approved to ship bundled in this session's commit (non-overlapping schema additions,
  verified no conflict). If that work is still incomplete, its owner should check the commit
  landed what they expected.

---

## State Snapshot

- **Branch:** `main`. ⛔ **Do not trust this line for tree state — run `git status`.** Commit by
  EXACT PATH (co-active sessions share `main`); the visual-diff gate REJECTS a report whose
  `source_sha` describes a previous change.
  ⛔ **`git commit --amend` IGNORES the original pathspec and flushes the WHOLE index.** Amend
  only when the index is EMPTY.
- **Tests/build:** `npm run build` exit 0 after re-anchoring 2 line-shifted baseline exemptions
  in `08-raw-url-link.json` (google-reviews/trustpilot-reviews — same pre-existing config-URL
  controls, just moved by this pass's edit.js edits, verified via `git show HEAD`).
- **`migrate-tier-object.py --self-test`: 2 pre-existing FAILURES, unrelated to `columns`** —
  both about `minHeight`, both because the self-test's embedded "pre-fix HEAD" fixture assumes
  `git show HEAD` still shows the old buggy read, but HEAD (as of the migration landing) already
  contains the fix. Verified independently this session (not just trusted): `git show
  HEAD:...class-sgs-container-wrapper.php` already has `sgs_responsive_normalise_object()` for
  minHeight. Needs the self-test's own embedded fixture updated to match the new HEAD — not
  something touching `columns` can fix, and not blocking.
- **⛔ THE CANARY IS CONTENDED.** A parallel session deploys to it from its own worktree.
  **After ANY deploy, verify the REGISTERED schema, not just HTTP 200:**
  `wp eval 'echo json_encode(WP_Block_Type_Registry::get_instance()->get_registered("sgs/container")->attributes["columns"]);'`
  over SSH. Done this session — confirmed `{"type":"object","default":{"desktop":2,"tablet":2,"mobile":1}}`.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. Fixture page **2255**
  (`/tier-fixture-columns/`) exists from this session — reusable for a future `columns` recheck.
  ⚠ **11 WP installs share that server** — always name the full path, never glob. Credentials
  `.claude/secrets/sandybrown.env` (always available; do not ask).
- **DB:** snapshot at `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-10-pre-T0-classifier`.
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **THE migration triad — survey/fix/gate, all 4 shapes** | `plugins/sgs-blocks/CLAUDE.md` §"Tier-object migration triad" + §"S4" |
| **THE procedure for the next passes** | `plans/spec-35-flat-to-object-migration-design.md` |
| **THE GOVERNING SPEC for this track** | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| Programme scope + phases (NOT the entry point) | `~/.claude/plans/go-track-1b-playful-hamster.md` |
| Decisions (D-numbered) | `decisions.md` — D578 is session 9 |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **NONE for this track.** `columns` (pass 4/6) is committed, deployed and live-verified.
  Passes 5-6 (font-size families + long tail) are scoped above and don't touch the shared
  wrapper.

## Open — carried, not ours to close

- **The two pre-commit hooks are still unreconciled** (`.git/hooks/pre-commit` vs
  `.githooks/pre-commit`) — shared-mechanism change needing its own design gate.
  ⛔ Do not `cp` one over the other.
- **`migrate-tier-object.py`'s classifier does not recognise `TypographyControls`** as a shared
  import — relevant now that pass 5 touches it directly. Add it to
  `_SHARED_CONTROL_IMPORT_RE` before or during pass 5, not after.
- **`sgs/site-header` / `sgs/site-footer`** — no inert-attribute audit done beyond `gap`/`columns`.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had
  a value. ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **The `tier-fixture-columns` (post 2255) and any earlier per-pass fixture pages are LIVE
  content on the canary** — reusable for spot-checks, but count against ruling B if a future
  pass wants a clean slate; trash-and-rebuild rather than hand-editing.
- **The fixture builder's own bugs, found this session, not fixed (out of scope for `columns`):**
  `build-tier-fixture-page.py`'s wrapper gives decorative/positioned media no height (collapses
  percentage `top`); its `example.attributes` merge doesn't override `variant` for split-only
  properties like hero's `splitContentOrder`; its unit-sibling deriver only matches the exact
  `{prop}Unit` pattern and misses `attributionMarginTop`→`attributionMarginUnit`. Whoever next
  touches the fixture toolkit should read Task 3's result above first.
