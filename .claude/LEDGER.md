---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-17
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-17 (later same day). ALL FOUR typography-initiative loose ends are now closed — committed,
pushed, and deployed live.** Alignment (left/centre/right) can now be sent to the page for the first
time; two blocks' "nothing here yet" placeholder text stopped being mis-tagged as a page heading
(checked against real accessibility research first); three blocks' heading-level settings now survive
the "clone a design" pipeline correctly; a safety-check that only watched 1 of 11 relevant blocks now
watches all 11, properly scoped so it can't wrongly flag unrelated settings (the two shortcuts that
would have caused that were already tried and reverted before today — this fix does it properly); and
a colour setting that worked but wasn't properly recorded in the framework's own bookkeeping is now
registered generally, which caught a second, previously-unknown instance of the same gap for free.
Everything independently re-verified against the actual code/gate output before merging, not just
trusted from the background work.

**Earlier the same day:** the border-colour gradient sweep finished — colour is fully closed. The
whole D636 gradient rollout (background/text/border/shape-divider/icon, everywhere it's genuinely
used) is now finished across the framework, not just the 4 blocks the previous session managed.

**What happened:** four parallel builders across 20 blocks (~30 attrs), scope re-derived from the DB
rather than last session's list; merged one at a time with a real build + gate check after each. One
genuine bug (a checker's hardcoded list, 2-line fix). Deployed and checked on the page, not just
green. Full record: `decisions.md` D646.

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
| `mega-group`/`mega-aside` templateLock `'all'`→`'insert'` (content-loss bug, real cause of D650's post-2164 incident) — deployed, live-verified via editor round-trip | `decisions.md` D652 |
| `element-manifest-baseline.json` hero/info-box border-gradient reason text corrected (count unchanged) | `decisions.md` D652 |
| R1 — `text-align` now emits from the shared typography helper (8th property, was 0) | `decisions.md` D653 |
| R4 — gallery/post-grid empty-state placeholder `<h3>`→`<p>` (researched first via `/research-check`) | `decisions.md` D653 |
| R3 — 3 blocks' `headingLevel` reclassified `role='tag-identity'`, unblocking the D649 converter fix | `decisions.md` D653 |
| R2 — E12 gate scoped via attrMap, now covers 11/11 heading-level blocks (was 1/11) — deployed, live-verified | `decisions.md` D654 |
| Counter classifier fix — `numberColour` + a second bonus catch (`testimonial.quoteColour`) now survive a reseed | `decisions.md` D654 |
| **Track 1b / Spec 35 / Spec 32 completion audit** (`ee4bdcaf`) — 79 claims predicate-checked, 3 stale cross-doc claims corrected, 1 plan archived | `reports/2026-08-17-track1b-spec35-32-completion-audit.md` |

## Blockers

**None.**

## Open — ready to pick up

### CLOSED this session — no action needed

- **Task A / D636 gradient rollout** — all 5 mechanisms shipped across the framework. Nothing
  gradient-related remains open.
- **`templateMode`** — all 23 declaring blocks resolved. Verify with
  `git grep -l '"templateMode"' -- 'plugins/sgs-blocks/src/blocks/*/block.json'` → expect exactly 6.
- **`cta-section` + `trust-bar` overlay controls** — both fixed, live-verified.
- **Task B's 4 prerequisite residuals (R1-R4) + the counter classifier finding** — ALL CLOSED,
  merged, deployed (`decisions.md` D653/D654, `LEDGER.md` State Snapshot below has hashes). The
  typography initiative below is now genuinely unblocked, not just scoped.

### Task B — Typography framework-wide initiative — prerequisites cleared, ready to EXECUTE

**Agent identity:** you are picking up a fully-scoped, prerequisite-cleared framework initiative.
The scoping decision (D649) and every blocking defect it surfaced (D653/D654) are done — this is
now pure build work following an already-approved plan, not a design session.

**State recap:** typography is the last group of block settings with no standard — a client
changing a heading's size gets a different control depending on which block they're on, and one
property (`text-align`) couldn't be set by a client at all until today. That gap is now closed. All
four residuals D649 surfaced (hardcoded `<h3>` tags, numeric/string heading-level mismatch, the
converter's blindness to 3 blocks, `text-align`'s missing emission, plus a safety-gate scoping gap
and one unrelated DB classifier gap found along the way) are fixed, merged to `main`, and — where
applicable — deployed live. Nothing is blocking W1/W2 from starting.

## Task 1 — W1: data layer (14 orphan element declarations + one reseed)

**What:** declare `supports.sgs.elements` on 14 `sgs/*` blocks that are missing it, then run ONE
scheduled `/sgs-update`.
**Why:** the shared `TypographyControls` re-skin (Task 2) and the eventual detector (Task 4) both
read this manifest — building on top of an incomplete one means redoing work later.
**Estimated time:** ~20 min (mechanical, well-spec'd).

**Orchestration:**
- Execution: delegated, 1 agent, isolated worktree.
- Model: sonnet via `/delegate` (mechanical).
- Depends on: nothing. **Parallel with:** Task 2.
- `/qc` gate after: no (pure data-layer declaration, no rendering behaviour change) — but DO run the
  full build + `check-element-manifest-conformance.js --check` before committing.

**Acceptance:** all 14 blocks show a populated `supports.sgs.elements` manifest; F6 gate stays clean
(current baseline: `unclassified 0, role-map-stale 0, state-without-base 4/4 baselined` — must not
regress).

## Task 2 — W2 + W2b: shared component re-skin

**What:** 4 small local components + 1 import, re-skin `TypographyControls.js` **in place** (zero
forks) + one SCSS rule. `text-align` is a NEW PHP emission path (built this session, R1) — treat it
as new capability to wire into the re-skinned component, not something already working.
**Why:** this is the client-facing inspector UI every block's typography control will route through.
**Estimated time:** ~40 min.

**Orchestration:**
- Execution: delegated, 1 agent, isolated worktree — **pilot on `sgs/label` first** (3 known
  divergences, all prop-flips, no storage-shape change) before fanning out to other blocks.
- Model: sonnet via `/delegate`; escalate to opus only if the component re-skin turns out to need
  real design judgement beyond following the existing dialect.
- Depends on: nothing (reads the CURRENT manifest state; doesn't need Task 1 to finish first, but
  will need Task 1's blocks eventually for full coverage — sequence W3 after both).
- `/qc` gate after: yes — multi-rater before any commit touching shared editor components.

**Acceptance:** `sgs/label`'s typography controls render through the re-skinned component with zero
visual regression (screenshot/manual check), `text-align` control present and functional.

⛔ **Give every agent the "run builds synchronously, never background them" instruction.** Five
agents across this session's earlier work stalled by backgrounding their own build and ending the
turn — a backgrounded subagent process is not woken mid-tool-call, it just sits. Cost each time:
a full resume round-trip.

## Task 3 — W3: layout (blocked on Tasks 1+2)

**What:** apply the re-skinned component + completed manifest across the block layout layer.
**Depends on:** Task 1 AND Task 2 both complete.
**Orchestration:** plan at dispatch time once Tasks 1/2's actual diff is known — do not pre-commit
to an agent count here.
**`/qc` gate after:** yes, multi-rater.

## Task 4 — W4: the detector (blocked on Task 3)

**What:** build/verify the typography-divergence detector (`npm run survey:typography` target:
divergence 0 across all 8 properties). Must be proven able to FAIL on a seeded break, not just pass
once — a detector that can't fail is not a detector.
**Depends on:** Task 3.
**Acceptance:** self-tested, green on current state, red on an injected regression.

## Task 5 — W5-A / G1 gate / W5-B (blocked on Task 4)

**What:** migrate Population A (22 blocks with SGS typography attrs) first. ⛔ **Gate G1 blocks
every native-supports STRIP** — 24 `render.php` files actively read `attributes.style.typography`
and paint it, 3 shipped patterns store it, deprecations are banned (D270/D293). Nothing is stripped
until a stored-content migration is proven on a canary page **saved BEFORE the change**. Only after
G1 clears does Population B (17 blocks declaring `supports.typography` with ZERO attributes —
genuinely greenfield, not a re-skin) proceed.
**Depends on:** Task 4 (detector must exist and be trustworthy before migrating real blocks).
**`/qc` gate after:** yes, multi-rater, every commit.

### Dependency graph

```
Task 1 (W1, data layer)  ──┐
Task 2 (W2/W2b, pilot sgs/label first)  ──┤
                                          ↓ both complete
                                    Task 3 (W3, layout)
                                          ↓ /qc multi-rater
                                    Task 4 (W4, detector — must prove it can FAIL)
                                          ↓
                        Task 5a (W5-A, 22 blocks) → ⛔ G1 canary-proof gate → Task 5b (W5-B, 17 blocks)
                                          ↓ /qc multi-rater every commit
                                    commit + merge to main + deploy
```

**Read first, in this order:** `decisions.md` D649 (rulings), D653+D654 (the residuals that are now
closed — confirms nothing here is still blocked), then the plan at
`~/.claude/plans/read-all-of-spec-soft-fairy.md` (full workstream detail + verification criteria).

## Methodology guardrails (do not skip — carried forward from D645, still true)

- **A bypass token belongs to ONE hook — verify which hook printed the block before using it.**
  Confirmed twice on this repo (2026-08-12 and again 2026-08-17): `[gates-ok:...]` only works for
  the Claude-Code-level `f5-commit-gate.py` PreToolUse hook. The real git-level `.githooks/pre-commit`
  chain understands ONLY `--no-verify` (never without explicit permission) or a gate's own mechanism
  (e.g. `db-consistency/run.py --update-baseline`, itself gated by a THIRD token,
  `[baseline-ok:<reason>]`). Three distinct token vocabularies confirmed in this one repo — read the
  actual blocking script's own output before typing any bypass syntax from memory.
- **A worktree-isolated agent's gate failures unrelated to its own diff can be pure staleness vs
  `main`, not real regressions.** If `main` moved (a concurrent fix touched a shared
  DB/classifier/baseline file) after the worktree branched, the agent's gate check compares against
  stale state and produces a wall of spurious findings. Fix: `git merge origin/main` into the
  worktree BEFORE committing — not re-investigation, not baselining. Confirmed twice in one session
  (2026-08-17).
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

- **Branch:** `main`. All 5 fixes from today's later session (R1/R2/R3/R4 + the counter classifier
  finding) are committed, merged, pushed, and deployed: `66527712` (R3), `2205dfa9`/`fe5e1078` (R1),
  `2a6000be`/`22deee71` (R4), `2db9a2ac`/`372f2b3e` (counter classifier), `d7b82965`/`2fe4f7ff` (R2).
  ⚠ **Do not treat any hash here as "current HEAD"** — this is a SHARED worktree with concurrent
  sessions committing to `main`, and a HEAD written into a doc is stale the moment that doc is itself
  committed. Run `git rev-parse --short HEAD` and `git log --oneline -5` to see where things actually
  are.
- **D-ceiling:** **D654** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep once reported a hex colour as the ceiling).
- **Build:** green through all ~50 gates, including the git-level `db-consistency`/`cheat-gate`/F5/F6
  commit floor (`.githooks/pre-commit`). `check-element-manifest-conformance.js`: GATE PASS
  (unclassified 0, role-map-stale 0, state-without-base 4/4 baselined — unchanged by today's work).
  `check-hardcoded-render-defaults.js --self-test`: 5/5 pass (R2's negative controls, re-run directly).
- **Converter test suite:** 676 passed / 11 xfailed (unchanged baseline) — the 19 tag-identity tests
  that were previously blocked by R3's misclassification now pass for real.
- **Canary:** ALL of today's later-session work is deployed and live-verified. R1/R4 (`fa72594f`) and
  R2 (`2fe4f7ff`) both confirmed via `payload-verify PASS: all 83`; R1/R4's actual code content
  additionally re-confirmed by reading the deployed files directly over SSH (not just the deploy log).
  R3 and the counter-classifier fix are DB-only, no site deploy needed. Last deploy hash: `2fe4f7ff`.
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
| ⛔ **Wrapper decomposition — NOT complete (corrected 2026-08-17).** The 7 steps are individually done, but the monolith they exist to split **GREW**: `ContainerWrapperControls.js` 1,728→**1,887**, `class-sgs-container-wrapper.php` 2,599→**2,787**, and `components/` still holds exactly one file. Steps 6–7 wired a flag-based opt-in layer ONTO the monolith; **no capability has been extracted.** Next step = the first real extraction, not another flag | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).

### From the 2026-08-17 completion audit (`reports/2026-08-17-track1b-spec35-32-completion-audit.md`)

⚠ **Six gates look like enforcement and are not** — this is the "stop diverging" purpose Track 1b was
written to serve, and it is not met. **Its own scoped build, not a doc edit.** Five prebuild entries
are shell-neutralised (`(script --check || echo [ADVISORY])` — `||` eats the exit 1); one fails only
under `--strict` that prebuild never passes; one exits 0 always while wired with `--check`; three of
the four commit-floor gates no-op silently without the local DB; Spec 32's live gate PASSES when the
canary is unreachable. Rule modes in `rules.json` are correct and DO gate — but `openBacklog` is stale
on 3 rules (21: 129→65, 24: 1→0, 26: 8→2) and rule 24 is `gate` with no `promotedOn`.

**Bean's calls, not started:** (a) the control-type contract is `AUTHORITATIVE` but lives in `plans/` —
fold into Spec 35 or promote to `specs/`; (b) Spec 32 §6.1 says "ROLLOUT ONGOING", root `CLAUDE.md`
says "COMPLETE (D346)" — and D405 already records D346's win as partly vacuous; (c) **"Track 1b" names
TWO different tracks** (this inspector work AND the gradient rollout) — a session has already had to
stop and disambiguate; needs a rename.

**Also open:** D543's owed `LinkControl` sweep (never done, grown 8→11 lines in Spec 35; `dev-setup.md`
still missing `SgsLinkControl`); 4 parking entries; `~/.claude/plans/` holds **68** files of which 11
are uncited stale Track 1b docs — a population the project-only sweep misses.

### ⛔ NEW defects found by the step-level verification (2026-08-17)

1. **`site-header` + `site-footer` each declare 13 `shapeDivider*` attributes with NO control and no
   `ShapeDividersPanel` mount — 26 dead attributes a client can never reach.** Found by triaging the
   wrapper-capability survey's 12 orphan findings: 4 blocks were detector false positives, these 2
   are real. Exactly the class **B4** exists to catch; B4 being unbuilt is why nothing caught it.
2. **`survey-wrapper-capability.js --self-test` is 38/39, not the 39/39 recorded.** One assertion
   fails ("overlay gradient family IS controlled"), reproduced twice. A detector with a failing
   self-test is not trustworthy until fixed.
3. **`StateToggleControl` is an orphan of a design D609 explicitly rejected** — states are a tab
   toggle inside the colour popover, "never a sibling control". 0 mounts; 60 blocks use the D609
   route. **Delete the component and reword Spec 35 Part L** — this is cruft, not a gap.
4. **Track 1b §1.3 waves are NOT done:** WAVE 2 has D2/D3/D4 still open; **WAVE 3 is 1 of 8**, and
   most of its items are gated on those open Wave-2 decisions.

⚠ **Search hygiene:** `.claude/worktrees/` holds 17 stale doc copies. `grep -r` returns **54** hits
where `git grep` returns **3**. Use `git grep`; the worktrees are worth cleaning up.