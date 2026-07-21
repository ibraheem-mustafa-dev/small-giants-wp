# Spec 35 — next session

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> `main` is SHARED with a co-active Track 2 (Spec 36 header/footer/nav). Track 2 owns
> `LEDGER.md`, the D-numbering cadence, and `next-session-prompt-nav-rework-P2.5.md`.
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as
> the commit; NEVER `git add -A`.

## Where things stand (verified 2026-07-21, all pushed)

| Commit | What |
|---|---|
| `a72a3c2d` | FR-35-5 states axis + FR-35-6 animation cluster, wired to 9 blocks |
| `42a34700` | Rollout wave 2 — 17 blocks |
| `aee121be` | Rollout wave 3 — 19 blocks |
| `6ea12136` | card-grid resting-state fix, live-verified |

**Roster: 64 blocks manifested** (from 28). Members 3236 | OK 950 | GAP 2286 |
ORPHAN 117 | STATE_OK 31 | STATE_GAP 0 | **STATE_WITHOUT_BASE 4**.

8 blocks legitimately skipped (7 `form-field-*` + `form-review`): zero styling supports,
zero style attrs, no style.css — they inherit appearance from the parent `sgs/form`.

## First action (<5 min)

`node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`

Read the summary line. That is the baseline every task below moves.

## Tasks

### Task 4b — tabs resting state (~15 min)

3 of the 4 remaining STATE_WITHOUT_BASE findings. VERIFIED FACTS, do not re-derive:

- `tabTextColour` ALREADY EXISTS and is consumed at `style.css:84` as
  `var(--sgs-tab-text, var(--wp--preset--color--text-muted,#555))`. The resting TEXT
  colour is NOT the defect. (A previous session misdiagnosed this by reading
  `style.css:63-72` and missing line 84.)
- The 3 real findings are background/border only: `tabActiveBgColour`,
  `tabActiveIndicatorColour` (selected), `tabHoverBgColour` (hover).
- Fix: add `tabBgColour` (resting background — currently hardcoded `transparent` at
  `style.css:68` with no custom property) and a resting indicator/border base.
- Ownership CONFIRMED: these map to custom properties consumed on `.sgs-tabs__tab`, the
  tab BUTTON, which `sgs/tabs` emits itself. They never touch panel content (nested
  blocks it does not own). Safe to de-hardcode.
- `tabActive*` renders as `[aria-selected="true"]`, NOT CSS `:active`
  (`tabs/render.php:232`, `style.css:110`).

### Task 4c — team-member resting state (~10 min)

1 finding: `shadowHover` with no resting shadow. Same fix shape as card-grid.

### Task 4d — nav trio: mega-menu, nav-menu, nav-drawer (Bean-approved 2026-07-21)

Manifest them AND apply the state fixes. **Bean explicitly included these**, overriding
an earlier recommendation to exclude them.

- COORDINATION RISK, raise before starting: Track 2 committed `feat(spec-36): FR-36-5
  sgs_mega_menu CPT` on 2026-07-20 — this surface is actively theirs. Confirm Track 2 is
  parked before editing, or agree a file split.
- FACT-CHECKED: the `sgs/mega-menu` BLOCK is NOT superseded by the CPT. Both are live and
  do different jobs — the CPT stores panel content, the block is the menu item. The block
  is still referenced by `class-sgs-adaptive-nav-renderer.php:112` and
  `class-sgs-nav-menu-source.php`. Do not delete or "migrate" the block.
- `adaptive-nav` and `src/blocks/site-*` remain Track 2's — still excluded.

## Pattern for every resting-state fix (Bean-locked: OPTION A, token fallback)

An empty control means inherit the theme token exactly as today. Hardcoded values become
custom-property FALLBACKS: `var(--sgs-x, <existing token>)`. NEVER ship a pre-filled
explicit default — it bakes a value into every instance and stops it tracking
`theme-snapshot.json` (Spec 33), breaking per-client theming.

## The visual-diff gate (learned the hard way this session)

A commit touching `style.css` / `render.php` / `edit.js` is BLOCKED until
`reports/visual-diff/<block>-YYYY-MM-DD.md` exists with `verdict: PASS` AND
`first_paint_capture_passed: true`. Metadata-only `block.json` changes are N/A.
`--no-verify` is available and is the WRONG move — it converts "unverified" into
"on main, looking verified".

The gate reads the WORKING TREE, not just the staged set: an unrelated dirty file for a
gated block blocks the commit. Stash it (`git stash push -- <path>`) and commit the rest.

Deploy/verify loop that works (chicken-and-egg: commit needs report, report needs deploy,
deploy needs commit):

1. `git worktree add -b scratch/<name> /c/tmp/<dir> HEAD` — never switch the shared checkout
2. copy WIP files in, commit there with `--no-verify` (scratch never merges)
3. junction `node_modules`, then `build-deploy.py --target sandybrown --blocks-only`
4. **md5sum the built file local vs server** — the `[verify] HTTP 200` leg passes on ANY
   working SGS page including one running old code
5. verify with a NEGATIVE CONTROL: two pages, identical content, differing only in the new
   attrs. Block CSS is LIFTED to `uploads/sgs-css/` — grepping page HTML proves nothing
6. write the report, commit to main (gate now passes), clean up pages + worktree

## Structural defences (carry forward, never subtract)

- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from `--json`.
- **STOP-VERIFY-SUBAGENT-FACTS** — 9 agents ran this session; **3 invented specifics** (a
  concurrency incident, a double-resolution complete with a defence of it, a block list
  naming 2 blocks that do not carry the attr). Code was correct every time; narratives
  were not. Zero survived tool verification.
- **STOP-FACT-CHECK-YOUR-OWN-OUTPUT** — the main thread ALSO made 2 errors this session:
  diagnosed tabs from a partial line range, and ran a JSON validator without
  `encoding='utf-8'` which falsely flagged a good file on Windows.
- **STOP-NEGATIVE-CONTROL** — "would this still pass if the feature were absent?" The
  animation cluster shipped INERT while its coverage validator passed, because that
  validator cannot fail when nothing declares the cluster.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — a cluster with neither resolves ZERO
  members and makes the score WORSE.
- **STOP-FALSY-EMPTY-STRING** — an explicit empty-string prefix is legitimate; test
  `!== undefined`, never truthiness.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `pauseOnHover` / `effectHover` / `imageZoomHover` /
  `grayscaleHover` are BOOLEANS, not styles.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — isolated worktree at a committed SHA, always.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production.
- Bash tool is POSIX sh: PowerShell here-strings are taken LITERALLY and corrupt commit
  messages. Use a real heredoc or `-F <file>`.

## Reading

**Tier 1:** `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md`
(FR-35-1..6 in full); `cluster-member-sets.json` `_meta`;
`check-element-manifest-conformance.js` header; `.claude/STOP-CATALOGUE.md`.

**Tier 2:** exemplars — `container` (4-layer), `card-grid` (states + the resting fix),
`quote` (content-KIND), `tabs` (states via attrMap), `content-collection`
(`_ownership_note` — delegation boundary).

## Open, unresolved

- **ORPHAN 117 has never been triaged as a class.** Many are honest (icon-source/scalar
  controls with no vocabulary member) but nobody has confirmed all of them are.
- **GAP 2286 likewise:** a declared member with no backing attribute is an honest gap AND
  a capability the block lacks. That list is a product backlog nobody has read.
