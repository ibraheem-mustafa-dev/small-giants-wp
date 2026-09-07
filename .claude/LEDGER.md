---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-07
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**A live editor crash got fixed, then you asked for a full sweep of every remaining build-gate
finding — 92 of 92 fast-tier gates now pass, for the first time this ledger has on record.**

**The crash first.** Opening `sgs/text`'s Styles tab threw an error and the block couldn't be
previewed — a same-day typography rework had switched on a font-family control that, on this
theme, hits a known WordPress data-shape bug. Fixed, then verified live in the real editor via
Playwright (not just code review) on both `sgs/text` and `sgs/heading`.

**Then a full gate sweep, all via subagents, none of it in the main session as you asked.**
Dead-looking controls that turned out to be real bugs one layer down (a child block missing
3 context keys, not "dead" at all). A vocabulary gap in the shared design-token registry —
drafted first, applied once you confirmed. A detector blind spot in the cheat-gate check that was
flagging legitimate WCAG motion-reduction overrides on some blocks while letting identical ones
through elsewhere by pure luck — found, fixed, and it found a THIRD genuine edge case beyond what
was predicted. A 40-finding border-styling bug across 15 theme patterns, migrated via a proper
implementer+reviewer workflow. Every step verified with a real command, not a guess.

**What's still open, by design — not lost work.** Two items need your decision, not mine — full
detail under "Two items genuinely needing Bean's decision" below, deliberately NOT added to
`parking.md` without asking first. Separately, 8 branches of real work sitting orphaned in the
repo (a hero drag-crosshair feature, a QA-tooling build, an unfinished border-migration
initiative) got rescued onto GitHub as draft PRs instead of being silently deleted during a
worktree cleanup — see Track C below.

## Shipped today (2026-09-06/07)

| What | Detail lives at |
|---|---|
| **`sgs/text` Styles-tab crash fixed + live-verified** (Playwright, real canary) | D978-D981 · `bcdbde978` · PR #61 |
| **4 heading Typography-panel UX fixes** (dup label, letter-case reset, combined rows, font-family parity) | D978-D981 · `bcdbde978` |
| **5 original gate findings closed** (scaleHover exemption, typography role reclass, role-map auto-regen, missing WP-native props, `contentBandMargin` wire-up) | D978-D981 · `bcdbde978` |
| **All 6 remaining gate clusters resolved or correctly deferred — 92/92 fast-tier gates pass** | D982 · `328fa44f3` `c311ef491` `21d6fcd03` `2575a41f5` `8c61ba2c2` `073d56659` `4f3127a04` `e86533f7f` |
| **dead-pattern-attrs (40 findings) — border migration via `/subagent-driven-development`** | D982 · `.claude/plans/2026-09-07-dead-pattern-attrs-border-migration.md` |
| **8 orphaned branches with real work recovered as draft PRs** (not deleted) | PRs #53-#60, all OPEN, unreviewed |
| **~50 fully-merged worktree/branch clutter removed**, all stashes cleared | git housekeeping only, no commit |

## Blockers

**None load-bearing.** The two decision items below are genuine design calls, not blockers.

## THE FRONT — three live tracks, pick one

No single "next task" — this session closed gate debt, not one narrow track. Three genuinely
active, mutually independent prompts exist:

### Track A — colour conformance, TEXT surface
**Read first (full, not skim):** `.claude/prompts/2026-09-06-colour-conformance-text-surface-next.md`.
FILL surface closed 2026-09-06 (`b30c6bfc4`); TEXT is the next-largest colour category.

### Track B — tier-object migration, Phase 3 remainder
**Read first:** `.claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md` (full read).
Groups 0+1 done and merged; Priorities 1-6 remain (media-atom migration, border-radius stragglers,
a compliance gate — live order in the file). Independent of Tracks A/C.

### Track C — the 8 orphaned-branch draft PRs (#53-#60)
Bean decides per PR whether to pursue: `#53` (hero drag-crosshair, 3.5 weeks old — highest
conflict risk), `#54` (hover-guard QA tooling, 90 files), `#55-#60` (6 branches of an unfinished
"border Shape B" migration, unclear if superseded by tier-object work). None mergeable as-is —
each needs a fresh rebase + real conflict resolution first. Do not merge blind.

### Two items genuinely needing Bean's decision (NOT in parking.md — his call whether to add them)
1. **Cheat-gate Check #9 vs section-anchor classes** — `section_passes.py`'s
   `ensure_root_section_class` (`:134,144`) writes a real, intentional `sgs-{section_id}` class
   Check #9 can't distinguish from an actual Rule-1 violation, so it's baselined not closed. Option
   A: special-case Check #9 for this write site (recommended, same idiom as Check #2's allowlist).
   Option B: remove the write, but trace its downstream consumers first (unknown blast radius).
2. **`sgs/media`'s border has no hover-colour/gradient variant** — owned by the shared `box-shape`
   atom (also used by `sgs/hero`), no hover-colour capability at all. Rule-7 design-gate item.

## Open — carried from before this session (not touched, still real)

- **`push-theme-snapshot.py`** — last known (2026-08-18): aborts safely for mamas-munches, refuses
  to write `wp_global_styles` without a verified backup. NOT re-verified this session.
- **`text-secondary` client-only slug read by framework code** (`sgs-text-variations.php:83`) —
  needs per-client resolution or a decision to seed it for all clients.
- **5 blocks missing `:focus-visible`** on `:hover`: `hero`, `icon-list`, `mega-panel`,
  `process-steps`, `testimonial` (35 comply).
- **45 attributes a client can never reach** — needs per-attribute judgement, not a blind fix.
- **Two dead components** (`StateToggleControl`, `SgsLinkControl`) — clutter, not gaps.

## Methodology guardrails (carried forward — all still true; extended this session)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees can inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A verdict function needs the same can-this-fail proof as a gate.**
- ⛔ **A subagent must never mutate a repo file as a test fixture** — require temp fixtures.
- ⛔ **Metadata is not evidence.** Filename, line count, file existence, grep-hit count — open the file.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines of output — never `--no-verify`; use
  the scoped `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.
- **NEW (2026-09-07): a new `block.json` attribute needs `sgs-update-v2.py --stage 1` +
  `generate-attr-role-map.py` immediately, not at session end** — hit `orphan_unclassified`/
  `orphan_role_map_stale` twice this session from declaring an attribute the DB hadn't rescanned.
- **NEW (2026-09-07): a "dead control" can mean the CHILD block is missing context** — `accordion`'s
  3 "dead" attrs were fully wired on the parent; `accordion-item` never declared `usesContext`.
- **NEW (2026-09-07): an exemption heuristic must check what CONTAINS a rule** (`@media`,
  `@container`), not just the rule's own selector text.

## State Snapshot

- **Branch:** `main` at `9a3ee9e01` (pre-this-write; this handoff's own commits land after). All
  session commits pushed directly to `main`, no feature branches — per Bean's explicit correction
  this session against defaulting to branch+PR for everything.
- **D-ceiling:** **D982** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npx wp-scripts build` exit 0. **`python scripts/run-gates.py --tier fast` — 92/92
  gates pass** (verified this session, not assumed).
- **Canary:** deployed and live-verified via Playwright this session (crash fix + UX fixes +
  `contentBandMargin` CSS emission all confirmed on sandybrown, not just code-reviewed).
  `push-theme-snapshot.py`/`wp_global_styles` status from 2026-08-18 NOT re-checked this session.
- **Open PRs:** #53-#60 (8 draft PRs, orphaned-branch recovery, awaiting Bean's per-branch
  decision — see Track C above). No other open PRs; #31/#32/#35/#52/#61 all merged this session.
- **Uncommitted:** `.claude/handovers/2026-08-26-product-card-media-panel.md` shows deleted —
  NOT from this session, left untouched per shared-worktree discipline. Re-check `git status`
  yourself; ask before removing it.

## Pointers

| For | Read |
|---|---|
| **Colour conformance TEXT surface (Track A)** | `.claude/prompts/2026-09-06-colour-conformance-text-surface-next.md` |
| **Tier-object migration Phase 3 (Track B)** | `.claude/prompts/2026-09-06-tier-object-phase-3-remaining-work.md` |
| **Typography Task 3 status (PARTIAL — re-verify before trusting)** | `.claude/prompts/2026-09-06-typography-task3-close-plus-converter-bug.md` |
| **This session's dead-pattern-attrs plan (SDD)** | `.claude/plans/2026-09-07-dead-pattern-attrs-border-migration.md` |
| **8 recovered orphaned-branch PRs (Track C)** | GitHub PRs #53-#60 |
| **Open design decisions from this session (NOT in parking.md — Bean's call)** | This file's "Two items genuinely needing Bean's decision" section above |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
