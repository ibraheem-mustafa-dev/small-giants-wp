---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-17
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-17. The border-colour gradient sweep is done — colour is fully closed. The whole D636
gradient rollout (background/text/border/shape-divider/icon, everywhere it's genuinely used) is now
finished across the framework, not just the 4 blocks the previous session managed.**

**What happened:** four builders ran in parallel, split across 19 blocks (~28 attributes) after
re-checking the real database instead of trusting last session's rough list — it turned out bigger
and more accurate than expected. All four batches came back clean, merged one at a time with a real
build + gate check after each merge (not just a clean `git merge` exit code). One genuine bug
surfaced after merging: a checker script had a hardcoded list that needed updating alongside the new
attributes, and two new controls on the product-card block silently failed the build until that was
fixed — a 2-line fix once found. Deployed to the real site and checked directly on the page (not just
a green build) that the gradient border actually paints correctly on 3 different block types,
including the one that had the bug.

**One thing intentionally left out:** three blocks (`container`, `cta-section`, `hero`) have a
"grid item border" setting that turned out to be a different kind of thing than expected — a raw
text value like `"1px solid white"` rather than a simple colour — so it needs its own short design
decision before a gradient can be added to it safely. Not urgent, flagged below.

**Separately, same day:** a second session fixed an accessibility gap on the same five container-like
blocks — `main` could be picked as the wrapper's HTML tag and produce 2-3 "main content" landmarks on
one page; `nav`/`aside` had no way to give a client-facing accessible label. Fixed, live-verified via
the real browser accessibility tree on sandybrown, deployed.

## Shipped today

| What | Detail lives at |
|---|---|
| Border-colour gradient sweep — 19 blocks, ~28 attrs, merged/deployed/live-verified | `decisions.md` D646 |
| Dead-controls checker fix (product-card's 2 gradient attrs false-flagged) | `decisions.md` D646 |
| Landmark-tag a11y fix — drop `main`, label `nav`/`aside`, 5 blocks, live-verified | `decisions.md` D647 |

## Blockers

**None.**

## Open — ready to pick up

### Task A — CLOSED

Border-colour gradient framework sweep is complete. The D636 gradient rollout as a whole (all 5
mechanisms: background, text, border, shape-divider, icon) is now closed.

### Task B — Typography framework-wide initiative

**What:** not yet scoped — the next framework-wide control-migration initiative after colour, per
D626's sequencing.
**Orchestration:** `/brainstorming` or a design council first (same shape as D626's colour council),
not a build dispatch. Read D626 in full for the colour precedent before scoping.
**Depends on:** nothing (colour work is now fully closed).

### Residual — `gridItemBorder` gradient (parked, not scoped)

**What:** `sgs/container`, `sgs/cta-section`, `sgs/hero` all share a `gridItemBorder` attribute that
is a raw CSS shorthand STRING (e.g. `"1px solid #fff"`, combining colour+style+width in one value),
not a plain colour value — the sibling-attribute gradient pattern (`{attr}Gradient` string, gradient
wins when set) was built for a single colour value and doesn't map cleanly onto a shorthand string.
**Why parked, not built:** discovered mid-session when the actual attribute shape was checked (the
DB's `css_property` column just said "border-color,border-style,border-width", which reads like a
normal candidate until you see the block.json declares ONE string attr, not three separate ones).
Needs a short design call — e.g. does the gradient apply only to the colour component, parsed out of
the shorthand? does the attribute get split into 3 first? — before it's build-dispatch-ready.
**Not urgent.**

## Methodology guardrails (do not skip — carried forward from D645, still true)

- **A clean `git merge` exit code is not proof the merge is correct.** This session's real bug (the
  dead-controls checker's stale suffix list) surfaced only when the FULL build was run after the
  merge, not from the merge itself.
- **A pre-commit gate can fail SILENTLY past a certain point in a long gate chain** — this session's
  merge commits needed `SGS_VISUAL_GATE_SKIP`/`SGS_VISUAL_GATE_REASON` set explicitly even though the
  underlying per-block commits already carried it; the gate chain's failure didn't print an obvious
  "blocked here" message, it just silently exited 1 after ~250 lines of otherwise-passing gate output.
  If a merge commit mysteriously won't complete with no visible error, suspect the visual-diff gate
  needs the skip vars set on the MERGE commit too, not just the commits being merged.
- **Re-derive scope from the database, not a carried-forward candidate list.** Last session's rough
  border-colour candidate list undercounted by ~7 attributes and missed 3 out-of-scope edge cases
  entirely (a different technique, a focus ring, a locked exception). A 5-minute DB query up front is
  cheaper than discovering the gaps mid-dispatch.
- **When Bean approves scope before you've checked the actual attribute shape, re-verify before
  building** — `gridItemBorder` was verbally approved as in-scope based on the DB's property list
  alone; checking the real block.json revealed it's a different data shape entirely. Caught before
  dispatch, not after.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic (unchanged
  standing rule).

## State Snapshot

- **Branch:** `main`, in sync with origin, HEAD `4ad7840c`.
- **D-ceiling:** **D646** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep once reported a hex colour as the ceiling).
- **Build:** green through all ~50 gates. `check-element-manifest-conformance.js`: GATE PASS
  (unclassified 0, role-map-stale 0, state-without-base 4/4 baselined).
- **Canary:** DEPLOYED this session — `main` (`4ad7840c`) to sandybrown, payload checksums 83/83.
  Live-verified: `heading`/`button`/`product-card` gradient borders confirmed via
  `getComputedStyle(el, '::before')`. Scratch page 2478 force-deleted after use.
- **Worktrees:** agent worktrees from this session (and some carried from D645) still exist under
  `.claude/worktrees/agent-*` — branches all merged, worktree dirs not yet cleaned up, low priority.
  `git worktree remove` each when convenient.
- **Pre-existing dirty files, not this session's:** `.claude/hooks/doc-size-baseline.json`,
  `.claude/memory/decisions-archive.md`, `reports/phase4-*.txt`, untracked `.claude/reports/*`,
  `.claude/Border Example HTML.html`.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **Border-colour sweep close-out — full scope/merge/bug record** | **`decisions.md` D646** |
| Gradient rollout Phase 0 + scope + storage decisions | `decisions.md` D636, D643, D644, D645 |
| Wrapper decomposition — full 7-step history, now all closed | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
- **`sgs/cta-section` overlay colour/gradient controls paint nothing** (`no_overlay=>true` passed to
  the shared wrapper) — needs a design call: drop the controls, or stop passing `no_overlay` (D643).
- **`element-manifest-baseline.json`'s two new hover-only entries** (`hero.borderColourHover`,
  `info-box.borderColourHover`) — mechanically forced by this session's attribute list, not
  independently reviewed. Worth a look, not urgent (D646).
