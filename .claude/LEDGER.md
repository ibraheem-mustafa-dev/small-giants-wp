---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, later the same day. Wrapper decomposition step 7 of 7 is BUILT — the last step of
the initiative. Branch `feat/wrapper-step7`, 6 commits, NOT merged, NOT deployed.**

**What step 7 was.** Three separate small things D637 designed: a build-time safety check, a new
client control for shape dividers, and connecting up a setting on the hero block that had been
declared but wired to nothing.

**What actually happened — the honest version.** Two of the three built exactly as designed. The
third could not, because the "fully locked" design rested on two statements that turned out not to
be true of the actual code. Both were caught by reading the code instead of trusting the design
doc, and neither had been caught by the two review passes that signed the design off.

1. **The shape-divider control is built.** You can now scale a divider on both axes with a
   link/unlink toggle, the same way you resize an image in Figma. The design said sideways-scaling
   would "reuse the repeat mechanism the shape already uses" — there is no such mechanism; the
   divider is one stretched shape. You picked the replacement from a menu, and the important
   property is that **at the default setting the output is byte-for-byte what it was before**, so
   nothing on any existing page can shift.
2. **You settled the up/down question.** The design said the divider both "anchors its top edge"
   and "never grows back into the section" — those are opposite results. You ruled: keep what it
   does today. That meant no repositioning work at all.
3. **The hero grid-areas setting is now CLOSED — deleted, not wired.** Tracing it end to end
   showed the flag has no user and needs none. The editor side is already delivered by hero's own
   controls; the cloning side reads the *draft's* CSS to find the named regions, not the block's
   flag — the converter's own code says "no gridAreas lookup is needed". So the flag only restated
   what hero's `contentPadding`/`mediaPadding` settings already say. Deleted: the panel, the flag,
   and the leftover plumbing.
4. **I reverted my own database work from earlier today.** The column I added to close the orphan
   turned out to be a write nothing reads — I'd moved the problem up a level rather than closing
   it. Gone, along with the deferred migration. **That removes the shared-database coordination
   problem entirely** — no held migration, no three-commands-together dance for next session.
5. **Background panel inconsistency fixed** — it was appearing in Settings on four blocks and
   Styles on two. Now Styles everywhere, as you chose.

**Full build passes, exit 0, through all ~50 prebuild gates.**

**A review then found five real defects, including one I had introduced** — moving the Background
panel left an empty leftover control in the header block that a client could find, switch on, and
be shown nothing. The entire ~50-gate build passed with it there, because no gate checks for a
container with its contents removed. There is now one that does. All five are fixed.

## Shipped this session

| Commit | What |
|---|---|
| `dec2a9cc` | `check-wrapper-capability-preconditions.js` (F.2.1 gate, fail-closed, no baseline) + `ScaleAxisControl.js` |
| `5db5da40` | Shape-divider px `Height` → linked X/Y % `Scale` across 6 blocks; SVG-`<pattern>` tiling; `check-shared-panel-schema.js` taught the new object shape |
| `fd70746d` | `BackgroundPanel` renders in **Styles** on all 7 wrapper blocks (was split 4 Settings / 2 Styles) |
| `647e17c6` | `block_composition.grid_areas` migration (**not run**) + `/sgs-update` Stage 1 writer + gate flipped fail-closed |
| `77454b98` | Docs — D639, Spec 35 §F.2 build-status box, this LEDGER |
| `3ff2f0b9` | Review fixes — empty-container gate (new), flip origin, pattern-id collision, stale names |
| `4cec3b6c`, `8bc46467` | Empty-container gate wired into `prebuild`; both new gates registered in every doc that catalogues enforcement |
| (this close-out) | `gridAreas` + `GridAreaPanel` DELETED; DB column/writer/migration REVERTED; gate rule 2 repurposed as a retirement guard |

**Verification actually performed:** full `npm run build` exit 0, twice · 20/20 + 7/7 shape-divider
render assertions incl. the byte-identical-default negative control (still holds after the review
fixes) · 11/11 Stage-1 writer assertions on a THROWAWAY DB (shared DB verified untouched after) ·
11/11 + 7/7 gate self-tests · 0 empty inspector containers across 110 files · **canary measured: 0
of 1,375 posts carry a shape divider**, with a positive control run first.

## Blockers

**None on what's committed.** Nothing is DEPLOYED, and no editor/visual verification has run —
the divider control and the Background tab move have not been seen by a human in a real editor.
The only canary contact was a read-only database query (0 of 1,375 posts carry a shape divider).
That is the honest gap, not a claim of completeness.

## Open — ready to pick up

### ⭐ DEPLOY + VERIFY, then merge to `main`

Everything in step 7 is now built and the hero residual is CLOSED. Nothing is deferred and there
is **no database migration to coordinate** — that was reverted. Remaining:

1. Deploy the branch to the sandybrown canary (`build-deploy.py --target sandybrown`).
2. Verify in a real editor, both default/unset AND value-set (the standing rule — a regression can
   be invisible in the unset state): the shape-divider **Size** control on a wrapper block (both
   axes, above and below 100%), and the **Background** panel now sitting in the Styles tab on all
   seven wrapper blocks.
3. Merge to `main` once clean.

⚠ **D-NUMBER COLLISION to resolve at merge:** `main` and `feat/gradient-palette-stops` both minted
a **D638** — step 6 close-out vs the colour-gap council. One needs renumbering.

### Carried, unrelated thread

- **Colour Stream 2 / gradient rollout** — `feat/gradient-palette-stops`, PR #29, 4 live worktrees
  (`stream-a`…`stream-d`). Separate branch, separate thread. That branch's own LEDGER carries its
  status; do not merge the two threads' status docs.

## Methodology guardrails (do not skip)

- **A "fully locked" design is still a claim to check against the code.** Two of D637's premises
  were false and had survived two review lenses. Read the source before building on a design doc.
- **A passing gate stack is not coverage.** An empty `<ToolsPanelItem>` — a client-visible dead
  control — survived all ~50 prebuild gates, because the nearest gate checks the opposite direction.
- **Two regexes, opposite wrong answers, same question:** 0 findings and 471 findings. Parse the
  tree; do not pattern-match it.
- **Verify the FIX landed, not just that the defect is gone.** My first removal left an unterminated
  comment — worse than the original bug — and the scanner still read clean.
- **A green exit code proves nothing on its own.** A PHP test file exited 0 both when every
  assertion passed and when an `ABSPATH` guard made it run nothing at all.
- **A self-test can silently stop testing.** Four fixtures went green by reading the real tree
  instead of their fixture, while still reporting PASS. Inject the dependency.
- **Run the gate, don't read it.** `check-shared-panel-schema.js` flagged 6 *correct* declarations
  as wrong — only running it surfaced that.
- **The framework DB is ONE file shared by every worktree.** A schema change is a cross-track
  action; `check_schema_drift.py` runs in every prebuild.
- **Shared checkout, branch can change under you.** Re-run `git branch --show-current` +
  `git status` before every commit.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `feat/wrapper-step7` (off `origin/main`), own worktree at
  `C:/Users/Bean/Projects/sgs-wp-worktrees/step7`. ⛔ Its `node_modules` is a **junction** to the
  main checkout — `git worktree remove --force` would empty the real one (962 → 0). **Unlink
  before removing the worktree.**
- **D-ceiling:** **D639**. Always re-derive:
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **`main` HEAD:** `35d71a1f` (unchanged by this session).
- **Build:** green — `npm run build` exit 0, full ~50-gate run.
- **Canary:** NOT deployed. Nothing from this session is live.
- **Shared DB:** untouched — `block_composition` still has no `grid_areas` column (verified).

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **Step 7 build record + both falsified premises** | **`decisions.md` D639** |
| Step 7 design (as locked, with D639's corrections applied inline) | `decisions.md` D637 + 2 addenda · `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` §F.2 |
| Wrapper capability grouping / panel-mount table | `decisions.md` D626 |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
