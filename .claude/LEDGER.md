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

**What happened:** four builders ran in parallel, split across 20 blocks (~30 attributes) after
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

**Also today:** worked through 6 smaller residual items sitting in the backlog. Two real bugs got
fixed (`cta-section` AND `trust-bar` overlay colour/gradient controls were both painting nothing —
same root cause, same fix, both live-verified). A sweep found `templateMode` was declared but doing
nothing on 22 of the 23 blocks that had it — 5 got properly wired (restricting which blocks can go
inside them), 17 had the dead attribute removed outright (either no child-block area at all, or an
existing more-specific restriction a generic preset would only fight). One review found a baseline
file's reasoning was wrong even though its actual effect wasn't — flagged, not fixed, since it needs
your sign-off. One "open item" turned out to already be finished six days ago.

⚠ **Worth knowing — I got that sweep wrong the first time and caught it myself afterwards.** My
original survey command ended in `| head -20`, which silently cut the list off at 20 when the real
answer was 23. I then reported "19 blocks" to you, dispatched agents against that short list, shipped
it, deployed it, and wrote it up as complete — while three blocks (`testimonial-slider`, `trust-bar`,
`trustpilot-reviews`) still had the dead attribute. Fixed in a follow-up pass and redeployed. **No
build gate, deploy check, or live test could have caught this** — they all verify that what you DID
touch is correct, and none of them knows what you should have touched. Only fact-checking the
close-out doc against the repo found it. Two smaller count errors in the same day's docs (D646 said
19 blocks where it was 20) came from the same habit of trusting my own earlier prose over a re-query.

## Shipped today

| What | Detail lives at |
|---|---|
| Border-colour gradient sweep — 20 blocks, ~30 attrs, merged/deployed/live-verified | `decisions.md` D646 |
| Dead-controls checker fix (product-card's 2 gradient attrs false-flagged) | `decisions.md` D646 |
| Landmark-tag a11y fix — drop `main`, label `nav`/`aside`, 5 blocks, live-verified | `decisions.md` D647 |
| `gridItemBorder` gradient + hover, 4 blocks — deployed, live-verified | `decisions.md` D648 |
| `cta-section` overlay controls fixed (were painting nothing); testimonial/image-sequence image controls fixed | `decisions.md` D650 |
| `trust-bar` overlay controls fixed (same bug as cta-section); `templateMode` sweep — 5 wired, 17 dead attrs removed, across all 23 declaring blocks | `decisions.md` D651 |
| ⚠ Truncated-survey incident: the sweep above shipped incomplete (`head -20` on a 23-row population), caught by fact-checking the close-out doc | `decisions.md` D651 |

## Blockers

**None.**

## Open — ready to pick up

### Task A — CLOSED

Border-colour gradient framework sweep is complete. The D636 gradient rollout as a whole (all 5
mechanisms: background, text, border, shape-divider, icon) is now closed.

### Task B — Typography framework-wide initiative — ✅ SCOPED 2026-08-17 (D649), ready to build

**What:** scoping is DONE — 3 research streams + a 5-seat design council, Bean-approved.
**Read first:** `decisions.md` **D649** (the rulings + 3 live defects it surfaced), then the plan at
`~/.claude/plans/read-all-of-spec-soft-fairy.md` (workstreams, gated order, verification).

**Scope:** 8 properties (font-family CUT). Native WP typography UI off everywhere. All 39 blocks,
in two populations: **A** = 22 blocks with SGS typography attrs; **B** = 17 blocks declaring
`supports.typography` with ZERO attrs (greenfield).

⛔ **Gate G1 blocks every strip.** 24 `render.php` files read `attributes.style.typography` and
paint it live, 3 shipped patterns store it, deprecations are banned (D270/D293) — so nothing is
stripped until a stored-content migration is proven on a canary page saved BEFORE the change.
Stripping first silently destroys typography clients already set.

**Start here (both ungated):** W1 = 14 `sgs/*` orphan element declarations, then ONE scheduled
`/sgs-update`. W2 = 4 small local components + 1 import + re-skin `TypographyControls` **in place**
(zero forks) + one SCSS rule. W2b = `text-align` needs NEW PHP emission — it is not a re-skin.
**Orchestration:** 4 agents, not 16, one worktree each; pilot on `sgs/label`. Critical path ≈2h40m.

**Three live defects it surfaced, worth fixing regardless of the initiative:**
- **9 blocks hardcode `<h3>` with no level control** — the framework skips h2 by construction on
  every client page (`card-grid`, `form-review`, `gallery`, `post-grid`, `pricing-table`,
  `process-steps`, `team-member`, `timeline`, `trustpilot-reviews`).
- **The F3b gate AND the cloning converter are both blind to 3 of 4 heading-level attributes** —
  `icon-list` has no enum; `product-card`/`product-faq` use numeric enums that filter to `[]`.
- **`text-align` has zero emission in `sgs_typography_css_rule()`** and no entry in
  `check-dead-controls.js`'s `PREFIXED_HELPER_SUFFIXES` — every new alignment control would
  false-flag as dead. *(That array also still lists the 6 dead `*Tablet`/`*Mobile` families.)*

### `gridItemBorder` gradient — CLOSED

Built, deployed, live-verified same session. `sgs/container`, `sgs/cta-section`, `sgs/hero`, and
`sgs/trust-bar` (a 4th block found mid-build — it mounts the same shared panel and wasn't in the
original 3-block scope) all gained `gridItemBorderGradient` (resting) + `gridItemBorderGradientHover`
(hover — a genuinely new capability; grid items never had a hover state before). `gridItemBorder`
itself stays an unparsed shorthand string (width+style, no content migration); the gradient siblings
paint only the colour via the existing masked `::before` mechanism, using a new `sgs_grid_border_parts()`
PHP helper that mirrors the editor's existing `_gridBorderParts()` token classification. Live-verified
via the generated lifted CSS file (not a DOM query — a hand-typed test page's nested block markup
didn't render as real child blocks, a test-authoring artefact, not a code defect): the masked-ring CSS,
correct parsed width, resting gradient, and hover gradient all confirmed byte-correct in the deployed
stylesheet. Commit `b0182f1c`.

## Methodology guardrails (do not skip — carried forward from D645, still true)

- ⛔ **NEVER pipe a population-defining survey through `head -N`.** A `head` on the command that
  DEFINES a sweep's scope is not a display convenience, it is a silent data-loss step, and it
  truncates at exactly the band where the short answer still looks complete (cut 23 → 20 on
  2026-08-17; the sweep shipped and deployed missing 3 blocks). Count first (`| wc -l`), page second.
  This is the memory-indexed `a-truncated-search-manufactures-a-false-absence` lesson, reproduced.
- ⛔ **A completeness error is invisible to every correctness gate.** The ~50-gate build chain, the
  deploy payload-checksum verify, and live DOM checks all validate what WAS touched; not one of them
  knows what SHOULD have been in scope. The only thing that caught the incomplete sweep was
  re-deriving the roster from the repo while fact-checking the close-out doc. **Re-query the
  population at close-out; never close a sweep against the same list you opened it with.**
- **Count from the repo, never from your own earlier prose.** Two separate count errors on
  2026-08-17 (D646's "19 blocks" where the commit log says 20; D651's "19" where the real population
  was 23) both came from carrying a number forward instead of re-deriving it.
- **A subagent's fact-check needs fact-checking too.** The doc fact-checker that found the two real
  count errors also reported a third finding — "the `build/` directory doesn't exist, so the bundle
  verification is unverifiable" — which was itself wrong: `build/` is gitignored, so it checked via
  `git` and missed a directory that is plainly on disk. Right method, wrong source.

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

- **Branch:** `main`, in sync with origin, HEAD `3cf842be`.
- **D-ceiling:** **D651** — verify with
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

- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`) — real cause found
  2026-08-17: `sgs/mega-group` sets `templateLock:'all'`, which drops a locked block's stored child
  content on every editor load/save. Deleting/recreating the page reproduces the same loss; the real
  fix is relaxing/removing that lock on `sgs/mega-group`. It's Track 2's canary — check with them first.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
- **`element-manifest-baseline.json`'s reasoning text is factually wrong** (spotted 2026-08-17
  reviewing the two `hero.borderColourHover`/`info-box.borderColourHover` entries): the accepted
  gate count is correct (neither block has a resting-state GRADIENT border — WP core never supported
  one), but the written reason claims "no resting border-colour attribute at all", which is false —
  both blocks have a real, working resting border colour via WP-native `__experimentalBorder.color`,
  already correctly wired. No build-gate risk either way; a future reader could be misled by the
  wrong reasoning into skipping a real gap elsewhere under the false premise. Text-only fix, needs
  sign-off since edits to that file are treated as needing one.
