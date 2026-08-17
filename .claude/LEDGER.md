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

### CLOSED this session — no action needed

- **Task A / D636 gradient rollout** — all 5 mechanisms (background, text, border, shape-divider,
  icon) shipped across the framework. `gridItemBorder` gradient + hover was the last parked piece
  (D648, `b0182f1c`), now done. Nothing gradient-related remains open.
- **`templateMode`** — all 23 declaring blocks resolved (5 wired, 17 removed, `container` was already
  correct). Verify end state with
  `git grep -l '"templateMode"' -- 'plugins/sgs-blocks/src/blocks/*/block.json'` → expect exactly 6,
  all consuming it.
- **`cta-section` + `trust-bar` overlay controls** — both were painting nothing, both fixed and
  live-verified.

### Task B — Typography framework-wide initiative — ✅ SCOPED 2026-08-17 (D649), ready to build

**What:** the next framework-wide control-standardisation initiative, after colour. Scoping is DONE.
**Why:** typography is the last group of settings with no standard — a client changing a heading's
size gets a different control depending on the block, and 7 values the framework paints can't be set
by a client at all.
**Estimated time:** ~2h40m critical path (per the plan's own estimate; treat as optimistic).

**Orchestration:**
- Execution: **delegated** — 4 agents, one worktree each. NOT 16: the work is mostly subtractive and
  driven by one shared component's defaults, so 16 agents would all queue on the same file.
- Model: sonnet per batch via `/delegate` (mechanical, well-spec'd); reserve opus for the W2
  component design if it turns out to need real design judgement.
- Dispatch pattern: `/dispatching-parallel-agents`, batched — pilot on `sgs/label` first (3
  divergences, all prop-flips, no storage change) before fanning out.
- ⛔ **Give every agent the "run builds synchronously, never background them" instruction.** Three of
  five agents this session stalled by backgrounding their own build and ending the turn — background
  subagents are not woken mid-tool-call, so they just sit. Cost: three resume round-trips.
- Depends on: nothing. **Parallel with:** the residuals below.
- `/qc` gate after: yes — multi-rater before any commit touching converter/pipeline/SGS-block logic.

**Acceptance:** `npm run survey:typography` → divergence 0 across all 8 properties, AND the W4
detector green and proven able to fail on a seeded break, AND — the leg every other gate misses —
a canary page saved BEFORE the change still paints its pre-existing typography after migration.

**Read first:** `decisions.md` **D649** (rulings + 3 live defects), then the plan at
`~/.claude/plans/read-all-of-spec-soft-fairy.md` (workstreams, gated order, verification).

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

### Dependency graph

```
Task B — Typography (delegated, 4 agents, one worktree each)
  pilot: sgs/label (inline check first)
    ↓
  W1 (data layer, 14 orphans) + W2 (components) — parallel, both ungated
    ↓ /qc multi-rater
  W3 (layout) → W4 (detector, must be green + self-tested)
    ↓
  W5-A (22 blocks) → ⛔ G1 stored-content migration proof → W5-B (17 blocks)
    ↓
  commit + merge to main

Residuals below — independent, parallel with all of the above.
```

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

- **Branch:** `main`. Last CODE commit of this session's work: `bc67f11f` (the `trustpilot-reviews`
  templateMode removal); the D651 doc commit `ea3e9e73` follows it. ⚠ **Do not treat any hash here
  as "current HEAD"** — this is a SHARED worktree with concurrent sessions committing to `main`, and
  a HEAD written into a doc is stale the moment that doc is itself committed (the previous version
  of this line was 12 commits behind at publication). Run `git rev-parse --short HEAD` and
  `git log --oneline -5` to see where things actually are. A concurrent track merged D649
  heading-level work (`6c994ef5`) on top of this session's; it was unpushed at handoff time.
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

**Two items surfaced 2026-08-17 have a ready-to-paste follow-up session prompt:**
`.claude/plans/2026-08-17-followup-session-prompt.md` — (1) `sgs/mega-group`'s `templateLock:'all'`
silently dropping stored child content (the real cause of Track 2's canary text-node loss), and
(2) `element-manifest-baseline.json`'s reason text asserting a false premise. Deliberately NOT
parked — they are next-session work with a written brief, not deferred work.

- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
