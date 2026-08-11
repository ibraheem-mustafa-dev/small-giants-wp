---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## ⛔ MANDATORY READING — before touching any responsive-migration file

Read these two in full before Task 1 or Task 2 below. Skipping either is exactly how last
session's "font-size families" plan went stale within an hour:

1. **`.claude/plans/spec-35-flat-to-object-migration-design.md`** — the whole design, especially
   the "⛔ Per-pass definition of done" items 0a-0d (item 0a is the recurring bug: a shared control
   file keeps writing to deleted flat attrs).
2. **`.claude/plans/spec-35-control-type-contract.md` §12** ("THE RESPONSIVE WRAPPER FAMILY") —
   the TIER axis vs BOX axis distinction. This session's whole finding rests on that distinction:
   a box-typed base attribute is NOT the same claim as a tier-collapsed base attribute, and the
   migration tool currently conflates them.

Also re-read `.claude/STOP-CATALOGUE.md` §C (pre-flight ritual) before any live-editor
verification — item 11 was extended this session with the querySelector document-order trap.

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 9, continued). Corrected the plan for what's left, and it's smaller and
different from what the last plan said.**

- **"Font-size settings are next" was wrong — they're already done.** I checked every block's
  actual saved schema directly rather than trusting the plan document, and every font-size
  setting across the framework is already in the new one-box-per-setting shape. It must have
  been folded into an earlier big batch of changes without anyone updating this specific plan.
- **What's actually left is smaller: 4 settings, 10 blocks total**, and they're a genuinely
  different shape — not "three separate device boxes" but "three separate FOUR-SIDED boxes"
  (padding/spacing settings, which have a top/right/bottom/left each). None of them are broken
  today — they render correctly right now — this is pure tidying, not a fix.
- **One of the four (`contentBandPadding`, used by 7 blocks including the header and footer)
  touches the same shared piece of code the `columns` setting did.** Same rule applies: your
  sign-off before I touch it.
- **The tool that's supposed to find this work currently reports "nothing to migrate" for all
  four** — a real gap I found and am flagging rather than trusting. It only checks "is this
  stored as one box or three", not "is this box the RIGHT shape yet" — so it can't tell a
  finished job from an unfinished one when both look like "one box".

**Earlier narrative:** session 9 (the `columns` migration) → this same file's prior version,
snapshotted to `memory/session-2026-08-11-session9.md` on next rotation. Full detail in commit
messages + `decisions.md` D546-D578.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D578**.

### ✅ Passes 1-4 of the flat→object migration are CLOSED (unchanged from last session)

`gap` (D563), `maxWidth`+`contentWidth` (D568), `gridTemplateColumns`+`gridTemplateRows`
(D569/D570), `columns` (D578) — all four properties that route through
`class-sgs-container-wrapper.php`.

### ⛔ CORRECTED THIS SESSION — "Pass 5" was already shipped; the real remaining work is different

**Verified directly against `block.json` for every block (not from a doc):** every font-size
family (`labelFontSize`, `titleFontSize`, `priceFontSize`, `quoteFontSize`, etc. — checked ~30
attributes across ~20 blocks) is already `"type":"object"` with no `Tablet`/`Mobile` siblings.
Handful of exceptions checked individually (`media.captionFontSize`, `product-card.ctaFontSize`,
`testimonial.quoteFontSize`/`summaryFontSize`, `text.firstLetterFontSize`) — none has
`Tablet`/`Mobile` siblings at all, so none was ever part of this migration; they're plain
non-responsive settings, correctly out of scope.

**What `npm run survey:responsive-shape` genuinely still lists, verified against real schema:**

| Property | Blocks (7+1+1+1 = 10 total) | Shape | Shared wrapper? |
|---|---|---|---|
| `contentBandPadding` | container, cta-section, hero, physics-canvas, site-footer, site-header, trust-bar | box-per-tier, 3 sibling attrs | **YES** — `class-sgs-container-wrapper.php:467-478` |
| `contentPadding` | hero | box-per-tier, 3 sibling attrs | No — `hero/render.php` reads it directly |
| `pillPadding` | option-picker | box-per-tier, 3 sibling attrs | No — `option-picker/render.php` reads it directly |
| `padding` | label | box-per-tier, 3 sibling attrs | No — `label/render.php` reads it directly |

**None of these are live bugs.** Each currently has a safe `is_array()` guard at its read site —
unlike the pre-migration flat-scalar pattern, an unset tier here can't produce an `Array to
string conversion`. This is schema-consistency cleanup, not an urgency-1 fix.

**⛔ Tool gap found and NOT yet fixed:** `migrate-tier-object.py --property <name> --survey`
reports **"0 blocks to migrate"** for all four of these, misclassifying every one as `ASSET`
shape. Verified by running it live against all four. Its S1 classifier tests only whether the
base attr is `"type":"object"` — it cannot distinguish a box-typed-but-still-flat-tier base
(what these actually are: `contentBandPadding` holds ONE box, `contentBandPaddingTablet` holds
ANOTHER box, `contentBandPaddingMobile` a third — three separate box objects, never merged) from
a genuinely finished nested tier-of-boxes (`contentBandPadding: {desktop:{...}, tablet:{...},
mobile:{...}}`). **Do not trust this tool's verdict for these four properties. Migrate them by
hand, following the exact pattern below — do not spend session time extending the generic tool
for a shape this small (10 blocks total); that would be over-engineering for what looks like the
terminal case of this migration.**

**The target shape, concretely** (mirrors the already-working pattern in
`sgs_responsive_normalise_object()` + `ResponsiveOverride`, just one level deeper):
```json
"contentBandPadding": {
  "type": "object",
  "default": { "desktop": {} }
}
```
Read via `sgs_responsive_normalise_object($attributes['contentBandPadding'] ?? null)` then
`$tier['desktop'] ?? array()` etc. per tier — each tier value is itself the 4-side box object,
unchanged in shape from today's per-tier box. Only the OUTER nesting changes.

---

## Task 1 — Migrate the 3 block-private box-tier properties (contentPadding, pillPadding, padding)

**What:** fold each of `contentPadding` (hero), `pillPadding` (option-picker), `padding` (label)
from 3 sibling box attrs into 1 nested tier-of-boxes object.
**Why:** closes 3 of the 4 remaining properties with zero shared-wrapper risk — no design gate
needed, can start immediately.
**Estimated time:** 25 min (3 single-block edits, same shape repeated).

**Orchestration:**
- Execution: delegated, no design gate needed (none of the three touches the shared wrapper).
- Model: `sonnet` via `/delegate`
- Dispatch pattern: single-agent, all three properties in one dispatch (same shape, low risk,
  no shared file conflict between them).
- Brief: for each of the three, (a) fold `block.json`'s 3 sibling attrs into 1 nested object per
  the target shape above, folding the base's authored default as the desktop tier; (b) find and
  fix every `edit.js`/shared-component writer of the old flat siblings (item 0a — grep
  `<name>Tablet\|<name>Mobile` across `edit.js`, `components/`, `extensions/`); (c) update the
  `render.php` read to `sgs_responsive_normalise_object()` then per-tier box access. **Do NOT
  trust `migrate-tier-object.py --survey`'s verdict on these — it misreports all three as
  already-done. Verify the actual `block.json` type + sibling presence yourself.**
- Context it will not have: `option-picker`'s `edit.js` state is `SHARED` (delegates to a shared
  control) per a stale tool read — check by hand whether that's still true and whether that
  shared control needs the item-0a fix too.
- Depends on: none.
- Parallel with: Task 2's design-gate wait (not its wrapper edit).
- /qc gate after: `/qc-inline` + live-editor verification on at least one of the three (register
  → render the control → write a value → assert stored shape is nested → assert no flat siblings
  → assert zero console errors — same check as this session's `columns` verification, item 0b).

**Acceptance:** all 3 block.json files show the nested shape with 0 flat siblings; `npm run
build` exit 0; live-editor round-trip proven on ≥1 block; `npm run
survey:responsive-shape` no longer lists these 3 as `flat_tiers`/`both_shapes` for the base
(⚠ but re-verify by reading the JSON output's `hint`, not the headline "0 candidates" line — see
the tool-gap note above).

---

## Task 2 — `contentBandPadding` (7 blocks, SHARED WRAPPER) — needs Bean's design gate FIRST

**What:** the last property migration this pass — fold `contentBandPadding`'s 3 sibling box
attrs into 1 nested object, across all 7 blocks that declare it, and update the shared wrapper's
read at `class-sgs-container-wrapper.php:467-478`.
**Why:** the only remaining property that touches shared code (per Rule 7, needs sign-off before
building — same as `columns` last session).
**Estimated time:** 15 min design gate + 35 min build.

**Orchestration:**
- Execution: **inline (main thread) for the wrapper edit** (Rule 7 — same split as `columns`);
  delegated for the 7-block sweep.
- If delegated (sweep only):
  - Model: `sonnet` via `/delegate`
  - Dispatch pattern: single-agent
  - Brief: apply the target shape (above) to all 7 blocks' `block.json` + `edit.js` + any
    `render.php` that reads the attr directly (`container`/`cta-section`/`hero`/`physics-canvas`/
    `trust-bar` are `edit=LEGACY`; `site-footer`/`site-header` are `edit=SHARED` — check what
    that shared control is and whether it needs the item-0a fix, same recurring risk class that
    hit `gap` (D563) and `ContainerWrapperControls.js`/`site-header-row`/`site-footer-row`
    (D578) twice already this migration).
  - Context it will not have: `contentBandPadding` is read at
    `class-sgs-container-wrapper.php:467-478` with an inline `is_array(...) ? X : array()` guard
    already present — that part is safe today; the main-thread wrapper edit changes ONLY the
    read shape (mirror the `columns`/`min_height_obj` precedent from `2d7b0b7c` — read via
    `sgs_responsive_normalise_object()` once, keep every downstream variable name/type
    unchanged), not the guard logic itself.
- Depends on: **Bean's design gate.** Do not start the wrapper edit without it — same ask as
  `columns`: approve migrating `contentBandPadding` to the nested shape, touching the shared
  wrapper's read for 7 blocks.
- Parallel with: Task 1.
- /qc gate after: **yes — code review of the wrapper diff specifically** (same closing step this
  session used for `columns`, `2d7b0b7c`'s wrapper edit) — `/qc-council` if the diff ends up
  larger than a single-read-shape change.

**Acceptance:** `class-sgs-container-wrapper.php`'s `contentBandPadding` read matches the
`columns`/`min_height_obj` pattern; all 7 blocks' `block.json` show the nested shape with 0 flat
siblings; live-editor round-trip proven on ≥1 of the 7 (prefer `container` — matches this
session's `columns` fixture, fastest to reuse); a positive-control fixture built via
`build-tier-fixture-page.py --property contentBandPadding --publish` +
`capture-tier-fixture.py` (the exact toolkit that produced this session's 21-block evidence in
~15 minutes) proves the value binds live across all 7 blocks, not just the one hand-tested.

---

## Task 3 — Close the migration (only after Task 1 AND Task 2 both land)

**What:** confirm nothing real remains, then mark the whole flat→object migration COMPLETE
across every doc that tracks it.
**Why:** this is genuinely the last known property class — closing it properly (not leaving
another stale "next pass" line) matters more here than usual.
**Estimated time:** 15 min.

**Orchestration:**
- Execution: inline (main thread) — this is a verify + doc-write step, not a build.
- Depends on: Task 1 AND Task 2 both committed and deployed.
- /qc gate after: none needed — this task IS the closing verification.

**Steps:**
1. Re-run `npm run survey:responsive-shape --json` fresh. Confirm 0 entries with
   `shape:flat_tiers` or `shape:both_shapes` carry `hint:cascading_value` or `hint:box_family`
   (the two hints that mean "genuine migration candidate" — `asset_like`/`flag_like` are
   correct-as-is by design, never migrate those).
2. Spot-check the `orphan_tier` bucket (94 entries as of this session, dominated by
   `margin`/`padding`/`borderRadius` — confirmed this session to be classifier noise from
   already-fully-migrated box properties, not a hidden candidate list — but RE-confirm rather
   than trusting this line, since it's exactly the kind of cached-count claim this project's
   docs keep getting burned by).
3. Update `decisions.md` (new D-entry), `LEDGER.md` (replace, mark migration COMPLETE),
   `.claude/plans/spec-35-flat-to-object-migration-design.md` (status → COMPLETE, all 6 "passes"
   language retired since the real shape turned out different from the original 6-pass plan),
   `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` Part M, and
   `~/.claude/plans/go-track-1b-playful-hamster.md` Phase 1.6 row — all four, in the SAME commit
   as whatever code change Task 3 itself makes (none expected — this is a verify-and-close task).

**Acceptance:** every doc in step 3 says the same thing about what's done — verified by the same
kind of independent QC subagent cross-check this session used for the `columns` handoff, not by
self-assertion.

---

## Dependency graph

```
Task 1 (3 block-private props, sonnet) ──────────────────────┐
Bean design gate (contentBandPadding) ─► Task 2 (wrapper inline + sweep sonnet) ─┤
                                                                                    ├─► ONE deploy ─► Task 3 (close)
```

⛔ **ONE deploy per cycle, run by the main thread.** Combine Task 1 + Task 2's changes into a
single deploy/commit, same as this session did for `columns` + the concurrent hero-gradient work
— do not deploy Task 1 and Task 2 separately unless something blocks one of them.

## Methodology guardrails (do not skip)

- **Do not trust a survey/tool's headline verdict without reading what it actually checked** —
  this session's whole finding was `migrate-tier-object.py` silently misclassifying box-shaped
  properties as done. The same trap can recur for any shape the tool wasn't built for.
- **The `--payload` escape hatch for the commit/deploy deadlock works** — `build-deploy.py
  --payload <path>` (repeatable flag) deploys declared uncommitted files without
  `--allow-dirty`, letting you capture live evidence before committing. Used successfully this
  session.
- **querySelector on any WP page returns the FIRST document-order match** — scope every live
  DOM query to `.entry-content <selector>` or a unique uid class, never a bare block-type class
  (STOP-CATALOGUE.md §B, new entry this session).
- **Root cause before instance fix; verify the EFFECT landed, not the exit code.**
- **`/qc-council` before every commit touching shared-wrapper/SGS block logic** (blub.db 255).
- **`git commit --amend` IGNORES the original pathspec** and flushes the WHOLE index. Amend only
  when the index is empty.
- **Re-run the D-ceiling command immediately before writing a decision entry.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.
- **Concurrent session (not this track):** hero gradient-overlay work continued past session 9's
  close (further edits to `container`/`cta-section`/`site-footer`/`site-header`/`trust-bar`
  `block.json` + `GradientOverlayControl.js` appeared uncommitted after this session's commits
  landed). Not this track's work — leave it alone; check its own commits before touching any of
  those files for Task 1/2 above, since some of them (`container`, `cta-section`, `trust-bar`,
  `site-footer`, `site-header`) overlap the `contentBandPadding` block list.

---

## State Snapshot

- **Branch:** `main`. ⛔ **Do not trust this line for tree state — run `git status`.** Commit by
  EXACT PATH (co-active sessions share `main`).
  ⛔ **`git commit --amend` IGNORES the original pathspec and flushes the WHOLE index.** Amend
  only when the index is EMPTY.
- **Tests/build:** `npm run build` exit 0 as of `969c9a61` (session 9 close).
- **⛔ THE CANARY IS CONTENDED.** A parallel session (hero gradient work) deploys to it from its
  own worktree. **After ANY deploy, verify the REGISTERED schema, not just HTTP 200.**
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. Fixture pages from prior passes
  still live and reusable: `/tier-fixture-columns/` (post 2255). Build a fresh one for
  `contentBandPadding` via the same toolkit. ⚠ **11 WP installs share that server** — always
  name the full path, never glob. Credentials `.claude/secrets/sandybrown.env` (always
  available; do not ask).
- **DB:** snapshot at `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-10-pre-T0-classifier`.
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **THE migration triad — survey/fix/gate, all 4 shapes (⚠ box-tier is a 5th shape it doesn't handle yet — see above)** | `plugins/sgs-blocks/CLAUDE.md` §"Tier-object migration triad" + §"S4" |
| **THE procedure + the two axes (TIER vs BOX) this session's finding turns on** | `plans/spec-35-flat-to-object-migration-design.md` + `plans/spec-35-control-type-contract.md` §12 |
| **THE GOVERNING SPEC for this track** | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| Decisions (D-numbered) | `decisions.md` — D578 is session 9 |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **contentBandPadding (Task 2) is GATED, not blocked** — needs Bean's design-gate approval
  before the wrapper edit starts, same shape as the `columns` gate last session.
- **Task 1 has no blocker** — can start immediately next session.

## Open — carried, not ours to close

- **The two pre-commit hooks are still unreconciled** (`.git/hooks/pre-commit` vs
  `.githooks/pre-commit`). ⛔ Do not `cp` one over the other.
- **`migrate-tier-object.py` cannot correctly classify a box-typed-but-flat-tier property** —
  found this session (see above). Whether to extend the generic tool or keep hand-migrating the
  rare box-tier case is an open design question; this session judged hand-migration faster for
  the 10-block scope actually remaining, but if a 6th shape turns up later, revisit.
- **`sgs/site-header` / `sgs/site-footer`** — no inert-attribute audit done beyond `gap`/`columns`.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had
  a value. ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **`card-grid`'s `maxWidth` + `contentWidth` are still `type:string`** — the one measured
  storage-shape residual from pass 2 (D568), unrelated to this session's box-tier finding,
  verified directly 2026-08-11. Not scheduled; note if picking up pass-2-family work again.
- **The fixture builder's own bugs, found session 9, not fixed:** `build-tier-fixture-page.py`'s
  wrapper gives decorative/positioned media no height (collapses percentage `top`); its
  `example.attributes` merge doesn't override `variant` for split-only properties; its
  unit-sibling deriver only matches the exact `{prop}Unit` pattern.
