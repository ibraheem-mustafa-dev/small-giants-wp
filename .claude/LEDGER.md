---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, later same day. The 7-step wrapper-decomposition initiative is now FULLY CLOSED —
deployed and eyes-on-the-real-editor verified. A stale docstring turned out to hide a bigger mess
than expected, now cleaned up too.**

**Wrapper decomposition: 7 of 7 done, deployed, live-verified.** Steps 6 and 7 had actually shipped
and merged earlier today (D638/D639) but step 7 had never been put on the canary or looked at — this
session's brief claimed it had been, the project's own docs said otherwise, and the docs were right.
Deployed it, then checked two specific things in the real block editor: the new shape-divider Size
control (both X and Y axes, above AND below 100%) and the Background panel's move into the Styles tab
on all 7 wrapper blocks. Both correct, both proven with real computed CSS on a scratch page (deleted
after). `hero`/`GridAreaPanel` — the one open question left over from D639 — turned out to already be
resolved by a second commit later that same day (`fb9625dd`): deleted, tombstoned, done. Nothing left
to decide there.

**Separately: a session was booked to fix one lying docstring in the converter — it had already been
fixed, by deleting the dead file it was lying about (D642).** That deletion was correct (verified four
independent ways, including a cold reviewer briefed specifically to try to prove it wrong), but it left
10 stale references behind — two of them in Spec 31, the governing spec read in full every session.
All 10 repaired and committed (`98bb5ce0`).

## Shipped this session

### Wrapper decomposition step 7 — deployed + live-verified (closes the 7-step initiative)

Deployed `main` (`ea4514fc`) to sandybrown via `build-deploy.py --target sandybrown` — clean run, dirty
tree gate passed (all dirty files outside the deploy payload), payload checksums verified (83/83
block.json match), smoke check green.

Live-verified in the real block editor (not the emit, not a screenshot — computed CSS on the rendered
page):
- **Shape-divider Size control** — `shapeDividerTopScale` set to `{x:160, y:60}` (X above 100%, Y
  below). Confirmed via the live frontend DOM: X applies via the SVG pattern's
  `transform="scale(1.6 1)"` (tiling); Y applies via the wrapper's computed `height:71.99px` against
  the expected `120 × 0.6 = 72px` — two deliberately different CSS mechanisms, both correct.
- **Background panel in Styles tab** — confirmed on all 7 wrapper blocks (container, cta-section,
  trust-bar, hero, physics-canvas, site-header, site-footer).

Scratch probe page force-deleted after verification; `git status` confirmed no unintended mutation.

**Wrapper decomposition steps done: 7 of 7. All live, all deployed, all verified.**

### grid_area stale-reference repair (D642 follow-up, commit `98bb5ce0`)

D642 (earlier today) deleted the dead `resolvers/grid_area.py` (proven dead 4 independent ways: its
trigger `ctx.area_name` was never set by any production `Ctx`-builder, only test fixtures — confirmed
by D642's own author, an Explore agent, direct `git grep`, and a cold reviewer briefed to refute the
conclusion) and fixed the one docstring this session was originally booked to fix. It left 10 other
references stale, none of them caught before this session:

- **Spec 31** (`:297`, `:500`) — two lines named the deleted file as still live. Highest blast radius:
  this spec is read in full every session.
- **11 in-code tombstones** cited D639 (which *found* the dead code) instead of D642 (which *removed*
  it) — repointed, D639 kept as "where it was found".
- **One live `xfail(strict=True)` test's docstring** (`test_l4_area_wiring.py`) still named a deleted
  symbol (`grid_area._area_box_write`) — rewritten to name the actual live mechanism.
- **`unit_companion_attr()`** lost its only production caller when `grid_area.py` was deleted — NOT
  deleted itself (DB-driven, unit-tested, and the live path genuinely lacks the capability it provided);
  tombstoned honestly and recorded as a real Spec 39 input instead.
- **A fake-`Ctx` test fixture** still carried the retired `area_name` kwarg — dropped, proven inert.
- **3 live planning docs** (`spec-39-seed-requirements.md`, the converter/DB-drift incident record, the
  wrapper-recognition reading list) cited stale call-site counts or the deleted file by path — figures
  re-derived live from source (13 call sites across 5 files, was 15/6; 5 non-`validate()` sites, was 6),
  never subtracted on paper.

QC'd before landing: a cold reviewer tried specifically to refute "keep D642, don't revert" and could
not — but did catch that the first-draft fix list (5 edits) was incomplete (true count: 10) and one
verification command that would have false-alarmed on a correct tree. Docstrings/comments/planning-doc
prose only — no logic change. Full converter suite unchanged before and after (665 passed, 1 skipped,
11 xfailed, same in this environment on both trees — note this is NOT the 910/2/11 figure D642's own
commit message cited; re-verified as environment/DB-state drift, not a regression from either D642 or
this session's edits, by stashing this session's changes and re-running in the identical environment).

### GridAreaPanel — confirmed already resolved, no action needed

D639 left this as an open residual ("delete vs rebuild, Bean's call"). Checked before bringing it to
Bean as a decision: it was already settled by a second commit the SAME day (`fb9625dd`) — deleted,
tombstoned, negative-control-verified. D639's "residual, not closed" line is itself now stale (not
touched this session — flagging for whoever next edits that entry).

### Doc corrections

`go-track-1b-playful-hamster.md` §1.4's 7-step table still marked steps 6 and 7 "❌ NOT STARTED" when
both had shipped (D638/D639) — corrected to closed, with evidence, and the "2 of 7" summary line fixed
to "all seven closed".

## Blockers

**None.**

## Open — ready to pick up

### ⭐ Two independent next items — pick either, they don't collide

**Stage 2 — the gradient rollout (D636).** Unblocked — Track 1's colour attrs are live, so any NEW
colour attribute lands in the background-family bucket and gets gradient support automatically.
**Run `/sgs-update` FIRST** — new attrs from recent tracks aren't in the DB yet.

| Builder | Mechanism | Scale |
|---|---|---|
| Background | `background-image: <gradient>`; fold Solid/Gradient into `DesignTokenPicker.js`/`SgsColourPanel.js` behind `gradientCapable` | ~78 attrs |
| Text (real text only) | `background-clip: text` + `color: transparent`; `text-shadow` breaks under it — flag per block | ~80 attrs |
| Border | masked `::before` + `mask`; **NOT `border-image`** (breaks `border-radius`) | ~32 attrs |
| Icon/SVG | inline `<linearGradient>` + `stroke="url(#id)"`; simplest of the four | ~10+, re-derive |

Isolated worktree each — builders 1-3 touch the same two shared files. `/qc` mandatory before merge.
Full detail: `decisions.md` D636 + addendum.

**Typography** — queued as the next framework-wide initiative after colour's Track A+B, per D626. Not
yet scoped; needs its own council pass before build.

### Carried, low priority

- **`feat/dead-api-checker`** (merged) — run `npm run check:dead-api-calls` standalone for a couple
  of weeks, trim its 305-entry baseline as real WP/WC functions get promoted into the curated
  allowlist, then decide with Bean whether/where it joins the hard `prebuild` gate.
- **`decisions.md` D639's "Residual, explicitly not closed" line for GridAreaPanel** is stale (overtaken
  by `fb9625dd` the same day) — a one-line note next time that entry is touched, not urgent.

## Methodology guardrails (do not skip)

- **A grep count is not a measurement.** `grep -c 'xfail(strict=True' tests/*.py` summed to 12 on a
  tree with 11 real markers — one hit was prose mentioning the marker, not the marker itself. Use
  `grep -rn "@pytest.mark.xfail"` and read what matched.
- **A "residual, not closed" note in a decision record can be overtaken the SAME day by a later
  commit.** Check git log for anything after the note before treating it as still open — GridAreaPanel
  was already deleted and tombstoned by the time this session went looking for it.
- **A session brief's claimed state is a claim, not a fact — verify branch/HEAD/D-ceiling against the
  actual repo before trusting "deployed and live-verified".** This session's brief said both; neither
  was true (one commit ahead of the claimed HEAD; D-ceiling one higher; step 7 built-and-merged but
  never deployed). Three independent sources (LEDGER, the decision record, `git log`) agreed with each
  other and disagreed with the brief — trust the majority of independent sources, not the brief.
- **Deleting code that turns out to be genuinely dead can still orphan something else.** Deleting
  `grid_area.py` left `unit_companion_attr()` with zero production callers — the same class of dead
  code the deletion was fixing. The fix was to tombstone it honestly and record the capability gap,
  not to reflexively delete the next thing that looks orphaned.
- **A test's `xfail(strict=True)` marker can be legitimately retired WITH its subject** — deleting
  `test_grid_area_tier_suffix` when its subject (`grid_area.resolve`) was deleted is not the "clean-up
  before R1 lands" the seed doc's own ⛔ forbids; a doc noting the count dropped 12→11 that day should
  say why, not just show a stale "12".
- **A green ~50-gate build is not proof the code works.** Live canary verification (computed CSS on a
  real rendered page, not the emit or a screenshot) is what actually confirmed both step-7 checks.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic — caught a
  completeness gap (5 claimed edits vs 10 real ones) and a false-alarming verification command before
  either shipped.

## State Snapshot

- **Branch:** `main`. This session's commits: `98bb5ce0` (grid_area doc repair). Step 7's deploy was a
  fast-forward of already-merged code (`ea4514fc`), no new commit for the deploy itself.
- **D-ceiling:** **D642** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling before).
- **Build:** green. Full converter suite 665 passed / 1 skipped / 11 xfailed both before and after this
  session's doc-only edits (re-verified via stash/pop in the identical environment — proves the edits
  changed nothing functional). `npm run build` exit 0 as part of the sandybrown deploy.
- **Canary:** sandybrown carries step 7's deploy (`ea4514fc`), live-verified. Scratch probe page (id
  2466) force-deleted after verification — nothing left behind.
- **Pre-existing dirty files, not this session's:** `reports/phase4-*.txt`, `.claude/hooks/doc-size-baseline.json`,
  `.claude/memory/decisions-archive.md`, untracked `.claude/reports/*`, `.claude/Border Example HTML.html`.
  Left untouched throughout — verified via `git status` before and after every commit this session.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Wrapper decomposition — full 7-step history, now all closed | `~/.claude/plans/go-read-the-track-encapsulated-hare.md` + `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Step 7 — built + design corrections + gridAreas retirement | `decisions.md` **D639** |
| gridAreas/GridAreaPanel final closure (same day, later commit) | `decisions.md` — commit `fb9625dd` |
| grid_area dead-code deletion + docstring fix | `decisions.md` **D642** |
| This session's grid_area doc repair (10 files, commit `98bb5ce0`) | `git show 98bb5ce0` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Cloning pipeline governing spec (2 lines corrected this session, `:297`/`:500`) | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Spec 39 seed requirements (call-site counts re-derived this session) | `.claude/plans/spec-39-seed-requirements.md` |
| Colour panel rollout (T4, D618 — separate from D640) | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d |
| Gradient scope + architecture (council, storage, icon correction) | `decisions.md` D636 + addendum |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
