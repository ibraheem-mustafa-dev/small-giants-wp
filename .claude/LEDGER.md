---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16. Wrapper decomposition step 6 of 7 is done and merged to `main`.** This is
the "background pilot" step — teaching 7 blocks (container, cta-section, trust-bar, hero,
site-header, site-footer, and physics-canvas) to switch their background-image controls
on and off cleanly, instead of always showing them whether the block needed them or not.

**What happened, in order.**

1. Three build agents (working in parallel, each in their own isolated copy of the code)
   wired the 7 blocks up. Physics-canvas is the interesting one — it never had a
   background option before, and now it does.

2. **A real bug was found and fixed before it reached the live site.** Two of the three
   build agents independently spotted the same thing: an early version of the shared
   "which kind of block is this" helper would have silently broken things it shouldn't
   have touched — specifically, site-header and site-footer's minimum height and inner
   spacing, and (worse) physics-canvas's entire "throw and catch" arena, because that
   block's height IS the physical boundary the thrown objects bounce off. Fixed at the
   root before anything shipped.

3. **I then live-tested all of this myself today** on the test site (not just trusted the
   build agents' own checks) — set real background images on container, hero, and
   physics-canvas through the actual editor, confirmed they show up correctly on the
   published page, and confirmed the background image doesn't get in the way of anything
   interactive sitting on top of it. Also built a direct test proving the bug-fix holds:
   set an explicit height and padding on a fresh footer, confirmed both values land
   exactly as set on the live page.

4. **Two independent reviewers looked over the whole set of changes before I merged
   anything.** One found a small paperwork issue — a code comment that hadn't been
   updated to reflect that all 7 blocks were now wired up (not a functional bug, just
   stale wording) — fixed immediately. The other reviewer found nothing wrong.

5. Merged to `main` and pushed. Step 6 of 7 is closed.

**Addendum, later the same session — the step-7 review gap above is now CLOSED, and step 7 has
no remaining design blocker.** The missing second reviewer was re-run successfully, plus an
independent fact-check pass that re-derived every claim in the design from source rather than
trusting either the doc or the first review. Two real corrections came out of that (a wrong
database-column comparison, a gate that would have false-negatived against today's code shape)
— both fixed in the spec. One design (the shape-divider scale control) came back needing an
actual decision, not just a rubber stamp: Bean picked the control shape and, in the same pass,
corrected a piece of my own reasoning that had been wrong (I'd argued the two axes were
"unrelated" — they're not; scaling a shape proportionally by default, with per-axis override
as the exception, is the standard convention, same as any image-resize tool). **All three step-7
designs are now fully locked — gridItems/layout gate, gridAreas flag completion, and the
scale control (render behaviour + control shape + storage, all decided).** See `decisions.md`
D637 and its two later addenda for the full record.

**Full narrative:** `memory/session-2026-08-16-step6-close.md` (this session, once
snapshotted). This session's D-entries: `decisions.md` D638 (step 6 close-out) + D637's two
addenda (step 7 design, fully locked).

## Shipped this session (2026-08-16)

| Commit | What |
|---|---|
| `f1b467f5`/`2113eeb6` (Phase A, landed on `main` ahead of this close-out) | Shared `resolve_kind()` mechanism + the narrowing-bug fix |
| 20 commits on `integrate/wrapper-step6` (Phase B, 3 parallel worktrees merged) | `background` extension wired on all 7 direct-panel blocks; physics-canvas gains the capability net-new |
| `dd750633` | Fixed a stale `resolve_kind()` docblock caught by the close-out review (doc-only, no runtime effect) |
| Merge → `main` (fast-forward, this close-out) | Step 6 of 7 CLOSED. See `decisions.md` D638 for full detail (live-verification results, both reviewers' findings, the disclosed step-7 review gap). |

### Numbers

| Metric | Start of session | End |
|---|---|---|
| Wrapper decomposition steps done | 5 of 7 | **6 of 7** |
| Blocks with a real, gated `background` extension | 0 of 7 (all-or-nothing before) | **7 of 7** |
| Blocks calling `resolve_kind()` instead of a hardcoded `'section'` literal | 0 of 7 | **7 of 7** |
| D-ceiling | D637 | **D638** |

## Blockers

**None** for what shipped. `npm run build` exit 0 (checked twice — before and after the
doc fix). Motion-bundle-budget gate PASSED, no baseline drift. `git status` clean (one
harmless CRLF-only diff on `roster.json` reverted, not committed, both checks). Cheat-gate
18 baselined / 0 new. F5/F6 gates green.

## Open — ready to pick up

### ⭐ Step 7 (remaining wrapper capabilities — shape dividers last) — NO DESIGN BLOCKER, ready to build

**No longer blocked.** All three step-7 designs are fully locked (D637 + its two later
addenda, same D-ceiling, no new number consumed): the `gridItems requires layout`
precondition gate, the `supports.sgs.gridAreas` flag completion, and the shape-divider
`ScaleAxisControl` (render behaviour, control shape, and storage all decided directly by
Bean). This is the most ready-to-build item in the repo right now — read `decisions.md`
D637 + addenda and `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` §F.2 before starting, then
build. Same orchestration lesson as step 6 applies: shared-file work (the gate script,
the DB column, the new component) stays single-owner; per-block wiring parallelises
across isolated worktrees, one per agent.

**Separate, smaller design gate for Bean, still outstanding (unrelated to step 7's own
scope, worth doing alongside it since it touches the same panels):** `sgs/container`'s
Background panel renders in its **Settings** tab; `sgs/hero`'s renders in **Styles**. This
is a real placement inconsistency (D626's own table says Background belongs in Styles for
all blocks) discovered during step 6's live verification, not fixed there (step 6 was
gating visibility, not moving tabs) and not addressed by the step-7 design pass either
(it's an F.2-adjacent question, not one of the three F.2 designs).

**Estimated time:** ~1 session for #1/#2 (the two gates/flags — genuinely mechanical once
started); the `ScaleAxisControl` build is its own smaller slice, same session or a
follow-up, since it needs a real new component, not just wiring.

## Methodology guardrails (do not skip)

- **A ruling in `decisions.md` + a "shipped" line in a status doc is NOT evidence the code
  changed.** Read the code. (Still true, re-confirmed this session — nothing new to add.)
- **This checkout is a dedicated isolated worktree for this task, not the shared
  checkout** — `C:\Users\Bean\Projects\swp-wrapper-integrate`, branch
  `integrate/wrapper-step6`, now merged to `main` and safe to reuse or discard. The
  SHARED-checkout warnings in earlier LEDGER versions applied to a different working
  directory; re-verify which checkout you're in before assuming either warning applies.
- **Live verification beats static/agent-reported verification** — Phase B's own build
  agents flagged the physics-canvas pointer-events question as unverified; this session's
  live Playwright pass closed it with real computed-style evidence, not a re-read of the
  same static reasoning.
- **Two-lens review found one real finding out of two dispatched lenses; disclose lens
  outcomes honestly rather than rounding "1 finding + 1 clean pass" up to "fully
  reviewed, nothing found."**
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.
  (Followed this session — see D638.)

## State Snapshot

- **Branch:** `main`. Verify with `git branch --show-current` before anything.
- **D-ceiling:** **D638** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling
  before).
- **`main` HEAD:** fast-forward merge of `integrate/wrapper-step6` (23 commits including
  `dd750633`), pushed to `origin/main` this session — exact merge commit hash is the
  fast-forwarded `integrate/wrapper-step6` tip itself (no merge-commit object created; a
  true fast-forward moves the `main` ref, it does not create a new commit).
- **Build:** green. `npm run build` exit 0. Motion-bundle-budget gate PASSED. Cheat-gate
  18 baselined / 0 new. F5 coverage-conservation 0 UNACCOUNTED. F6 1 baselined / 0 new.
- **Canary:** sandybrown. This session's live verification (container/hero/physics-canvas
  background painting, physics-canvas pointer-events layering, site-footer minHeight/
  band-padding regression guard) used a scratch test page (id 2453), created and then
  force-deleted via REST at the end of the session — nothing left behind on the canary.
  Not a full redeploy of every block; only the 7 wrapper-decomposition blocks touched by
  this step were exercised.
- **Playwright MCP:** worked fine this session (editor + frontend, both login flows).

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Wrapper decomposition — full 7-step history | `~/.claude/plans/go-read-the-track-encapsulated-hare.md` + `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| This session's full detail (bug found, live verification, review findings) | `decisions.md` D638 |
| Step 7 design — ALL THREE fully locked, no blocker | `decisions.md` D637 + its two later addenda + `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` §F.2 |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
- **Colour Stream 2 item 2b** (custom gradient bar, per-stop palette linking) — unrelated to wrapper decomposition, still open per earlier sessions' notes.
