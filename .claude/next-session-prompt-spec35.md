# Spec 35 — next session

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> `main` is SHARED with a co-active Track 2 (Spec 36 header/footer/nav). Track 2 owns
> `LEDGER.md`, the D-numbering cadence in `decisions.md`, and
> `next-session-prompt-nav-rework-P2.5.md`. **This file is Track 1's (Spec 35) prompt.**
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the
> commit; NEVER `git add -A`.

## Agent identity

You are continuing Spec 35: making every SGS block's editor sidebar complete and
consistent, so a non-coder client can self-serve and Bean is QC only.

## State recap (plain English)

Every SGS block now carries an "element manifest" — a machine-readable description of which
parts it renders and which settings control each part. A linter reads those manifests and
reports three things: settings that resolve (OK), settings a block declares but has no
attribute for (GAP), and attributes nothing claims (ORPHAN). A fourth axis, "states",
covers hover/selected/focus variants.

**As of 2026-07-21 the roster is 67 of 80 blocks manifested and the entire
resting-state defect class is closed.** 13 blocks are deliberately skipped (verified: no
styling surface at all). The remaining work is not more rollout — it is triaging the
2,554 GAPs and 123 ORPHANs that the manifests have now made visible.

## Where things stand (verified 2026-07-21, all pushed to main)

| Commit | What |
|---|---|
| `a72a3c2d` | FR-35-5 states axis + FR-35-6 animation cluster, wired to 9 blocks |
| `42a34700` | Rollout wave 2 — 17 blocks |
| `aee121be` | Rollout wave 3 — 19 blocks |
| `6ea12136` | card-grid resting-state fix, live-verified |
| `726da506` | tabs + team-member resting-state bases — STATE_WITHOUT_BASE 4 -> 0 |
| `efec9359` | nav trio manifested + resting-state bases — 64 -> 67 |

**Live baseline:**
```
Blocks with a manifest: 67 | skipped: 13
Members checked: 3545 | OK: 991 | GAP: 2554 | ORPHAN: 123
STATE_OK: 49 | STATE_GAP: 0 | STATE_WITHOUT_BASE: 0
```

The 13 unmanifested blocks split into TWO different categories — do not conflate them:

**8 skipped with evidence** (zero styling supports, zero style attrs, no style.css — they
inherit appearance wholly from a parent): `form-field-address`, `form-field-consent`,
`form-field-date`, `form-field-file`, `form-field-hidden`, `form-field-number`,
`form-field-phone`, `form-review`. These are genuinely out of Spec 35 scope.

**5 EXCLUDED, not assessed** — Track 2 (Spec 36) owns them: `adaptive-nav`, `site-header`,
`site-footer`, `site-header-row`, `site-footer-row`. These may well NEED manifests; nobody
has looked. Do not treat them as dismissed. Coordinate with Track 2 before touching.

## First action (<5 min)

`node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`

Read the summary line. That is the baseline every task below moves.

## Tasks

### Task 1 — Triage the ORPHAN class (123)

**What:** classify every ORPHAN as legitimate or a real defect.
**Why:** nobody has ever read this list. Agents repeatedly reported orphans as "honest —
selector/scalar control with no cluster member", which is true for many but was never
verified across the whole set. `mega-menu`'s `badgeColour` was found to be DEAD WIRING
(emitted as a `data-` attribute, never consumed by any CSS rule — a client can set it and
nothing happens). There may be more of those.
**Estimated time:** 25 min.

**Orchestration**
- Execution: **delegated**, 3 sonnet agents in parallel via `/dispatching-parallel-agents`,
  ~40 orphans each, ALL DISPATCHED IN ONE RESPONSE
- Brief: for each ORPHAN, read the block's render.php + style.css and classify as
  (a) legitimate — a scalar/selector control with genuinely no style-cluster member;
  (b) MISSING VOCABULARY — a real style property Spec 35 has no member for; or
  (c) DEAD WIRING — the attribute is emitted but never consumed by any CSS rule.
  Category (c) is a client-facing bug: the control does nothing.
- Context they won't have: an orphan is NOT automatically a defect. `iconSize`,
  `iconSource`, `panelWidth`, `featuredItemIds` are legitimately outside the style
  vocabulary. The judgement is whether the attribute DOES something when set.
- Depends on: none. Parallel with: Task 2.
- `/qc` gate after: yes — main-thread verification of a sample against live render.

**Acceptance:** every one of the 123 orphans carries a classification; all category (c)
dead-wiring instances listed with the block and attribute named.

### Task 2 — Triage the GAP class (2,554)

**What:** turn the GAP list into a prioritised product backlog.
**Why:** a GAP means "this block declares a setting the vocabulary knows about, but the
block has no attribute for it" — i.e. a capability the block lacks. 2,554 of them is not a
defect list, it is a roadmap nobody has read. Some will be genuinely irrelevant
(a separator does not need `line-height`); some are real client-facing gaps.
**Estimated time:** 30 min.

**Orchestration**
- Execution: **delegated**, sonnet, single agent with a narrow output contract
- Brief: aggregate the linter's `--json` GAP findings by (cluster member × block KIND) and
  return the TOP 20 gaps by frequency, each with a one-line judgement on whether it is a
  real missing capability or noise. Do NOT attempt to fix any of them.
- Context: GAP rising is CORRECT behaviour, not regression — it is the vocabulary naming
  absence that was previously invisible. The output is a decision document for Bean, not a
  work order.
- Depends on: none. Parallel with: Task 1.
- `/qc` gate after: no — it is an analysis artefact, reviewed by Bean directly.

**Acceptance:** a ranked top-20 list Bean can read in 5 minutes and pick from.

### Task 3 — nav-menu current-page vs hover (DESIGN GATE FIRST)

**What:** `nav-menu`'s `hover` and `selected` states share an IDENTICAL attrMap because
`render.php:304-309` groups `:hover`, `:focus-visible` and `[aria-current="page"]` into one
CSS selector. A client cannot style the current page differently from a hovered link.
**Why:** "you are here" vs "you are pointing at this" is a normal thing to want on a nav,
and it is currently impossible.
**Estimated time:** 20 min after the design gate.

**Orchestration**
- Execution: **inline design gate via `/brainstorming` FIRST**, then delegated build (sonnet)
- Do NOT build before Bean approves: splitting that selector changes live navigation
  styling on EVERY page. Blast radius is site-wide.
- COORDINATION: nav is Track 2's active surface. Confirm with Track 2 before touching.
- Depends on: Bean's approval. Parallel with: nothing.
- `/qc` gate after: yes — deploy + live-verify the real header nav is unchanged.

**Acceptance:** a client can set a distinct current-page style, AND the live homepage
header nav is provably unchanged when the new attr is unset.

### Task 4 — nav-drawer + mega-menu uncontrollable styling (small)

**What:** three rules have no attribute behind them:
`.sgs-nav-drawer__close:hover{opacity:.75}` (style.css:90-92), its `:focus-visible` outline
(style.css:94-97), and `mega-menu`'s dead `badgeColour` wiring.
**Why:** each is a thing a client cannot control. The focus-visible outline is a standard
a11y default and arguably correct as-is — judgement needed, not a blanket fix.
**Estimated time:** 15 min.

**Orchestration**
- Execution: **delegated**, sonnet
- Depends on: Task 1 (orphan triage may find more of the same class — batch them).
- `/qc` gate after: yes — these touch style.css, so the visual-diff gate applies.

**Acceptance:** each of the three is either given an attribute + control, or explicitly
documented as intentionally fixed with a reason.

## Dependency graph

```
Task 1 (orphan triage, 3x sonnet)  ‖  Task 2 (gap triage, 1x sonnet)
        ↓ main-thread verification
Task 4 (uncontrollable styling — batch with Task 1 findings)
        ↓ deploy + visual-diff gate
Task 3 (nav current-page — DESIGN GATE + Bean approval + Track 2 coordination)
```

## Pattern for every resting-state fix (Bean-locked: OPTION A, TOKEN FALLBACK)

An empty control means inherit the theme token exactly as today. Hardcoded values become
custom-property FALLBACKS: `var(--sgs-x, <existing token>)`. NEVER ship a pre-filled
explicit default — it bakes a value into every instance and stops it tracking
`theme-snapshot.json` (Spec 33), breaking per-client theming. Bean chose this explicitly on
2026-07-21 over the "pre-filled default" alternative.

## The visual-diff gate + deploy/verify loop (learned the hard way)

A commit touching `style.css` / `render.php` / `edit.js` is BLOCKED until
`reports/visual-diff/<block>-YYYY-MM-DD.md` exists with `verdict: PASS` AND
`first_paint_capture_passed: true`. Metadata-only `block.json` changes are N/A.
`--no-verify` is available and is the WRONG move — it converts "unverified" into "on main,
looking verified".

The gate reads the WORKING TREE, not just the staged set: an unrelated dirty file for a
gated block blocks the commit. Stash it (`git stash push -- <path>`) and commit the rest.

Chicken-and-egg (commit needs report, report needs deploy, deploy needs commit):

1. `git worktree add -b scratch/<name> /c/tmp/<dir> HEAD` — never switch the shared checkout
2. copy WIP src files in, commit there with `--no-verify` (scratch never merges)
3. **copy `build/` in — do NOT junction `node_modules`** (see STOP-JUNCTION below), then
   `build-deploy.py --target sandybrown --blocks-only --skip-build`
4. **md5sum the built file local vs server** — the `[verify] HTTP 200` leg passes on ANY
   working SGS page including one running old code
5. verify with a NEGATIVE CONTROL: two pages, identical content, differing only in the new
   attrs. Best form: one page containing BOTH an untouched and a client-set instance
6. write the report, commit to main (gate now passes), delete test pages + remove worktree

## Structural defences (carry forward, never subtract)

- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from `--json`.
- **STOP-VERIFY-SUBAGENT-FACTS** — 14 agents ran on 2026-07-21; **at least 4 invented
  specifics**: a concurrency incident that never happened, a double-resolution complete
  with a written defence of it, a 10-block list naming 2 blocks that do not carry the
  attribute, and a claim that a concurrent agent's fix "may have been miscounted". Code was
  correct nearly every time; narratives were not. Zero inventions survived tool verification.
- **STOP-FACT-CHECK-YOUR-OWN-OUTPUT** — the MAIN THREAD made **five** measurement errors in
  one session, all the same shape (real tool output, wrong assumption about what it
  described): read `style.css:63-72` and missed line 84; ran a JSON validator without
  `encoding='utf-8'` (falsely flagged a good file on Windows); ran `ls node_modules` without
  checking `pwd` (measured the repo root, not the plugin); grepped the lifted CSS file when
  the rule lives in the separately-enqueued `style-index.css`; measured the SELECTED tab
  when testing a RESTING-state fix. Two of these nearly reached Bean as false claims.
  **Before stating any diagnostic value, confirm which file/element/directory it describes.**
- **STOP-NEGATIVE-CONTROL** — "would this still pass if the feature were absent?" The
  animation cluster shipped INERT while its coverage validator passed, because that
  validator cannot fail when nothing declares the cluster.
- **STOP-JUNCTION-TEARDOWN** *(new 2026-07-21)* — do NOT `mklink /J` `node_modules` into a
  scratch worktree. `git worktree remove --force` traverses the junction and guts the real
  dependency tree; `npm run build` broke mid-session and needed `npm ci` to repair, and two
  running agents hit it. Copy `build/` into the worktree and deploy with `--skip-build`
  instead. A later deploy done that way left `node_modules` intact.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — a cluster declared on an element with neither
  a prefix nor an attrMap resolves ZERO members and makes the score WORSE (+36 GAP measured).
- **STOP-FALSY-EMPTY-STRING** — an explicit empty-string prefix is legitimate; test
  `!== undefined`, never truthiness.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `tabActive*` means `[aria-selected="true"]`, NOT CSS
  `:active`. `pauseOnHover` / `effectHover` / `imageZoomHover` / `grayscaleHover` are
  BOOLEANS, not styles.
- **STOP-OWNERSHIP-BOUNDARY** *(new 2026-07-21)* — a block may only declare/de-hardcode
  styles for markup it actually EMITS. `content-collection` and `testimonial-slider`
  delegate rendering to child blocks via `render_block()` / `$inner_block->render()`;
  `card-grid` does the same in `wc-product` mode. Declaring the delegated block's internals
  crosses an ownership boundary. Record the boundary in an `_ownership_note`.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — isolated worktree at a committed SHA, always.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production.
- **STOP-29 / SPEC-SCOPE-BINDING** — definition-of-done is the spec's FULL scope, not the
  minimum increment. Map every deferral to a named spec STAGE; never "out of scope".
- Bash tool is POSIX sh: PowerShell here-strings are taken LITERALLY and corrupt commit
  messages. Use a real heredoc or `-F <file>`. Nested heredocs in one command break parsing.

## Pre-flight ritual (answer before the first Write/Edit)

1. Am I on `main`, and is my next commit path-scoped away from Track 2's files
   (`LEDGER.md`, `next-session-prompt-nav-rework-P2.5.md`, `src/blocks/site-*`,
   `adaptive-nav`, `includes/class-sgs-mega-menu-cpt.php`)?
2. Am I about to touch a shared component or shared mechanism? → design-gate it and plan to
   live-verify.
3. Will this change render live? → deploy from an isolated worktree, then verify with a
   negative control (never build-green alone).
4. Is anything I am about to report a subagent claim? → re-derive it from the tool first.
5. Am I about to declare a cluster or a state? → does the element have a `prefix`, an
   `attrMap`, or a `layer` to make it resolve — or will it silently score worse?
6. *(new)* Am I about to state a diagnostic value? → have I confirmed WHICH file, element,
   or directory that output describes? Five errors of exactly this shape in one session.

## Mandatory READING (tiered)

**Tier 1 — before any edit:**
- `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md` (FR-35-1..6 IN FULL)
- `plugins/sgs-blocks/scripts/consistency/cluster-member-sets.json` `_meta` (all notes)
- `plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` header comment
- `.claude/STOP-CATALOGUE.md`

**Tier 2 — before touching the roster:**
- `.claude/plans/phase-spec35-vocabulary-rework.md`
- Worked exemplars: `container` (4-layer composite), `card-grid` (root IS the grid; states +
  the resting-base fix), `quote` (content-KIND), `brand-strip` (multi-element with
  prefixes), `hero` (variant-heavy), `tabs` (states via attrMap), `content-collection`
  (`_ownership_note` — delegation boundary), `nav-menu` (6 elements, states)
- `plugins/sgs-blocks/scripts/consistency/check-cluster-coverage.py`
- `reports/visual-diff/{card-grid,tabs,team-member,nav-menu,mega-menu,nav-drawer}-2026-07-21.md`

**Tier 3 — context:**
- `CLAUDE.md` binding rules R-31-1..15
- `.claude/decisions.md` head (D-ceiling D355 at 2026-07-21; Track 2 owns the cadence)
- `plugins/sgs-blocks/scripts/converter/services/layer_detect.py` (L1–L4 vocabulary)

## Tool bindings

| Skill | When |
|---|---|
| `/brainstorming` | Task 3's design gate — mandatory before building |
| `/gap-analysis` | grade the triage output before declaring it done |
| `/lifecycle` | if editing any skill/agent/linter-as-tooling |
| `/research` | any gold-standard check before a design menu |
| `/strategic-plan` | if the GAP triage turns into a multi-phase programme |
| `/dispatching-parallel-agents` | Task 1 — 3 agents, ONE response |
| `/delegate` | route every dispatch |
| `/verify-loop` | 2-attestation on any load-bearing claim |
| `/sgs-db`, `/wp-blocks` | DB is authoritative — never hardcode a count |
| `/qc-council` | multi-rater before any converter/pipeline/shared-block commit |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Tasks 1, 2, 4. Constrain: no deploy, no git commit |
| `design-reviewer` | visual + a11y QC if Task 3 proceeds |

| MCP / tool | For |
|---|---|
| Playwright MCP | live verification (Tasks 3, 4) |
| Chrome DevTools CLI | fallback if Track 2 holds the shared browser profile |

Canary creds (always available, no need to ask): `.claude/secrets/sandybrown.env`. NOTE the
password contains shell metacharacters — parse the file in Python, do not `source` it.
Deploy: `build-deploy.py --target sandybrown --blocks-only` from an ISOLATED worktree.
SSH alias `ssh hd`.

## Open, unresolved

- **ORPHAN 123 and GAP 2554 have never been triaged** — Tasks 1 and 2 above. These are the
  real remaining Spec 35 work; the rollout itself is done.
- **Editor-canvas verification is outstanding across the board.** Every fix this session was
  verified by REST attribute registration + frontend render, NOT by opening the block editor
  and looking at the inspector panels. `ShadowControl` has crashed on first live render
  before despite passing 180 unit tests. A human eye on the new panels is worth having
  (R-31-13).
- **No live mega-menu instance exists on the canary**, so its dropdown render is untested.
