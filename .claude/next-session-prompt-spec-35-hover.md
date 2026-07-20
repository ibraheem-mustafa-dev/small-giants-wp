---
doc_type: next-session-prompt
project: small-giants-wp
thread: Track 1 — Spec 35 Task 3 (hover consolidation). Architecture DECIDED + exemplar shipped; the 40-block sweep is NOT started and is blocked on one design gate.
generated: 2026-07-20
---

# Spec 35 Task 3 — hover consolidation — next session

**Invoke `/autopilot` before doing anything else.** Then read this file end-to-end.

> **Track-1-scoped.** Track 2 (header/footer/nav) owns `LEDGER.md`, `next-session-prompt.md`,
> `decisions.md` — do NOT rewrite them. Path-scope every commit; re-check
> `git branch --show-current` in the SAME command as the commit; never `git add -A`.
> Track 2 is CO-ACTIVE in the main worktree — do all work in an isolated worktree
> (`git worktree add -b <branch> /c/tmp/<name> main`), never `git checkout` in the main folder.

## Why this matters (Rule 7)

Spec 35 makes every block's sidebar complete + consistent so a non-coder client self-serves and
Bean is QC only. Hover was the largest remaining inconsistency: 95 block-private hover attributes
plus a universal Hover Effects panel, so a client saw two controls for one effect in two places.

## THE ARCHITECTURE (Bean-locked 2026-07-20 — this is the whole point, do not re-litigate)

> **There is no standalone "hover colour" control. Hover is ALWAYS a STATE of an existing
> control — a `StateToggleControl` (Normal | Hover) sitting exactly where the base control
> sits, mirroring it, inside that element's own panel.**

Corollaries Bean stated:
1. **Element-first wins.** An element's hover setting lives in THAT element's panel, next to its
   other settings — never in a separate hover panel. (`sgs/button`'s icon hover belongs in the
   Icon panel.)
2. **Shadow is element-owned** and gets a toggle, plus **a shadow COLOUR attribute** (new — does
   not exist yet on most blocks).
3. **Image-specific universals come out** of the universal panel (`sgsHoverImageZoom`,
   `sgsHoverGrayscale`) — they belong to blocks that actually render an image.

## What shipped this session (branch `feat/spec-35-hover-consolidation`, merged to main)

| Commit | What |
|---|---|
| `55dcee02` | `sgs/button` icon colours → `StateToggleControl` in the Icon panel. THE reference pattern to copy. Live-verified: toggle renders, Hover writes `iconColourHover` only, block valid, no crash. |
| `b5a56585` | **Real bug fix.** `StateToggleControl`'s swatch legend showed the WRONG colour for any custom hex. It built `colourVar(value)` → `var(--wp--preset--color--#111111)`, invalid CSS, silently discarded, so the swatch kept its previous colour. Now uses `resolveColorToken` + a palette normaliser handling both flat-array and origin-keyed `{default,theme,custom}` shapes. Affected `sgs/brand-strip` live. |

Also: ran `/sgs-update` (all stages ok; Stage 11 WARN is cross-track, see Blockers).

## THE DATA (measured, not estimated — re-derive with the scripts below, don't trust these numbers blind)

95 block-private hover attrs split into three categories:

| Category | Count | Treatment |
|---|---|---|
| **A — true states of a base property** (text/fill colour 26, background 16, border 11, box-shadow 10, text-decoration 1) | **64** | Get the Normal\|Hover toggle |
| **B — hover-only effects, no base counterpart** (`scaleHover`, `effectHover`, `imageZoomHover`, `grayscaleHover`) | **~26** | NO toggle — there is no "base scale", so Normal would be empty. Leave as plain controls. |
| **C — behaviour flags, not styling** (`pauseOnHover`, `autoScrollPauseOnHover`, `overlayHover`) | **4** | DO NOT TOUCH. These pause a marquee on hover; they are not property states. A blanket name-matched sweep WILL break these. |

### The blocker — 40 of the 64 are the HARD shape

| Shape | Count | Why |
|---|---|---|
| Base + hover both block attrs | **24** | Straightforward — copy the `sgs/button` pattern |
| Hover attr with NO matching base attr | **40** | The resting colour comes from **WP-native `supports.color`** (`style.color.background`), not a block attribute |

For the 40, the toggle's Normal side must read/write the **native support** while Hover writes a
block attribute. That is shared styling machinery touching every block's colour handling →
**DESIGN-GATE with Bean before building** (project rule 7). This is why the sweep did not run.

## FIRST ACTION (<5 min, zero risk)

Re-derive the worklist so you are working from live data, not this doc:

```bash
node plugins/sgs-blocks/scripts/check-duplicate-controls.js --json > /c/tmp/hover.json
```
Then the pairing analysis (regenerates the 24/40 split) — the script body is in the session
transcript; re-write it as a small node one-liner over `src/blocks/*/block.json` matching
`normalise(attr minus "hover")` against non-hover attribute names.

## Task 1 — DESIGN GATE: how does the toggle drive a WP-native colour support?

**What:** Decide how `StateToggleControl`'s Normal side reads/writes `style.color.background`
(and `.text`) for the 40 blocks whose resting colour is a native WP support, while the Hover side
writes a block attribute.
**Why:** Unblocks 40 of the 64 migrations. Without it the sweep can only cover 24.
**Time:** 20 min of design with Bean.
**Orchestration:** inline (main thread, Opus). Use `/brainstorming` design mode. `/qc-council`
the resulting fix-shape before any dispatch.
**Depends on:** none. **Acceptance:** a written pattern Bean approves, proven on ONE of the 40
blocks live in the editor.

## Task 2 — Universal deletion

**What:** Remove `sgsHoverBgColour`, `sgsHoverTextColour`, `sgsHoverBorderColour`,
`sgsHoverShadow`, `sgsHoverImageZoom`, `sgsHoverGrayscale` — attrs + controls in
`src/blocks/extensions/hover-effects.js`, the CSS branch in `includes/hover-effects.php`
(~lines 118-120 + emission), and regenerate `includes/extension-attributes.generated.php`.
**KEEP:** scale, tilt, duration, easing, stagger, focus ring, border accent (whole-block motion,
no base control to mirror).
**Why:** These are the standalone hover controls the architecture forbids.
**Time:** 15 min. **Orchestration:** inline — small, deterministic, one location.
**Depends on:** Task 1 landing first (deleting before replacements exist strands capability).
**/qc gate after:** yes, `/qc-inline`.
**Acceptance:** zero `sgsHover*Colour` / Shadow / ImageZoom / Grayscale references in src or
includes; build green; a block with a migrated toggle still renders hover correctly live.

## Task 3 — The sweep (24 easy + 40 after Task 1)

**What:** Wrap each base↔hover pair in `StateToggleControl` per the `sgs/button` pattern.
**Time:** ~5 min per block. **Orchestration:** delegated — parallel Haiku subagents, ONE BLOCK
EACH, via `/dispatching-parallel-agents`; pick model per dispatch with `/delegate`.
**Brief each subagent:** "Wrap these named base/hover attribute pairs in `StateToggleControl`
following `src/blocks/button/edit.js` exactly. WRAP ONLY — never delete or rename an attribute
or control. Do not touch any attribute not in your list."
**Context they need:** the `sgs/button` diff as the reference; their block's exact pair list; the
Category C exclusion list.
**/qc gate after:** yes — per block: `git diff` shows zero attribute deletions, build green, and
a live editor spot-check on 2-3 blocks.
**Acceptance:** every Category-A pair renders as one toggle in its element's panel, live-verified.

## Dependency graph

```
Task 1 (inline, Opus, design gate with Bean)
  ↓
Task 2 (inline, Opus)   +   Task 3 first 24 (parallel Haiku — can start before Task 1)
  ↓ /qc-inline
Task 3 remaining 40 (parallel Haiku, needs Task 1's pattern)
  ↓ /qc multi-rater
Merge to main via isolated worktree
```

## INCIDENT this session — I broke Track 2's canary twice (fixed)

Deploying `--blocks-only` from an isolated worktree based on an OLDER `main` shipped a build
missing Track 2's nav-menu featured-pill fix, overwriting their verified deploy — twice, the
second time AFTER they had redeployed to fix the first. Measured, not inferred: server
`nav-menu/render.php` was 15,865 B with `grep -c featured_bg_hex` = 0 while their correct local
was 17,462 B / md5 `738c4558`.

**Fixed:** merged `origin/main` into the branch (no conflicts), rebuilt, redeployed. Server md5
now `738c4558…` == local, `featured_bg_hex`=4 (Track 2 live) AND `sgs-state-toggle`=1 (Track 1
live). Both tracks coexist.

**Root cause:** an isolated worktree protects FILES but the canary is SHARED, and `--blocks-only`
ships the WHOLE plugin, not just changed blocks. Two tracks deploying from different base commits
silently overwrite each other. `build-deploy.py`'s verify leg only asserts HTTP 200 + generic SGS
markers, so it passes on ANY working page including one running the other track's old code
(Track 2 logged this as `P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`).

**Rule going forward — before ANY deploy to a shared canary:**
```bash
git fetch origin main && git merge --no-edit origin/main   # rebuild on current main FIRST
# after deploy, verify CHANGE-SPECIFICALLY, never on the generic marker check:
md5sum plugins/sgs-blocks/build/blocks/<block>/render.php
ssh hd 'md5sum <server path>'   # must match, and grep a marker unique to EACH active track
```

## Blockers / known issues

- **The linter's count is NOT the success criterion.** `check-duplicate-controls.js` reports 85
  hover-duplicates and flags element-scoped hovers (e.g. `sgs/button.iconColourHover`) that are
  now CORRECT under the locked architecture. Driving it to 0 would delete real capability.
  **Teach the linter to distinguish element-scoped from whole-block hover before trusting it.**
- **`main`'s pre-commit uniformity audit is RED for every track** — `sgs/nav-drawer` +
  `sgs/nav-menu` have UK colour attrs without `supports.color` (from Track 2's `e6c10428`, which
  itself bypassed). Until fixed, commits need `--no-verify` + a `[batch-ok: <reason>]` line.
- **`/sgs-update` Stage 11 WARN** — container roster mismatch: `brand-strip`, `nav-menu` detected
  as LAYOUT and `nav-drawer` as CONTENT, none expected. Cross-track; it correctly refused to
  write block.json. Needs Track 2 + Track 1 to agree the roster.
- **Doc drift:** canary is on **WP 7.0.2**; `CLAUDE.md` still says 7.0.1.
- **WP 7.1 (19 Aug 2026) removes the 36px control default** — TextControl/SelectControl/
  RangeControl warn plugin-wide. Not urgent, but dated.

## Structural defences (STOP catalogue — carry forward, never subtract)

- **STOP-SWEEP-BY-NAME-NOT-SEMANTICS** (new): `pauseOnHover` matches every "hover" regex and is a
  marquee behaviour flag, not a colour state. Classify by SEMANTICS before any sweep. Same class
  as the Haiku swarm that deleted live `textAlign` off 4 blocks.
- **STOP-CHECK-WORKING-TREE-NOT-JUST-BRANCH** (new): this session ran `git checkout -b` on a
  worktree whose files a co-active Track 2 session had modified 7 minutes earlier. Check
  `git status` AND file mtimes before any branch operation on a shared folder.
- **STOP-SCRATCH-CONTENT-STRANDS-DEPLOYS** (new): a test block inserted in the editor autosaves a
  draft; if its attributes are later removed, the deploy's oldshape-audit HARD-FAILS on stranded
  content. Delete scratch drafts immediately after verifying.
- **STOP-LIVE-VERIFY-SHARED-COMPONENTS**: build-green + unit-pass is NOT proof a shared editor
  component renders. Open every tab that renders it. (ShadowControl crashed live after passing
  180 tests; this session's swatch bug passed everything and showed the wrong colour.)
- **STOP-VERIFY-SUBAGENT-FACTS**: fact-check subagent-invented specifics vs ground truth.
- **STOP-BLIND-REGEX-CODEMOD**: drive codemods off a KNOWN per-block attr list, `/verify-loop`
  per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE**: always deploy from an isolated worktree at a committed SHA.
- **STOP-SHARED-CANARY-STALE-BASE-DEPLOY** (new, incident above): an isolated worktree pinned to
  an older `main` + `--blocks-only` (which ships the WHOLE plugin) silently overwrites a
  co-active track's deploy. ALWAYS `git merge origin/main` before deploying to a shared canary,
  and verify with a per-track marker + md5 match — never the generic HTTP-200 verify.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270): pre-production; additive metadata +
  re-clone, never a `deprecated.js`.

## Pre-flight ritual (answer before first Write/Edit)

1. Am I in an ISOLATED worktree, and did I check `git status` + file mtimes, not just the branch?
2. Is what I'm about to change a shared component or shared mechanism? → design-gate + live-verify.
3. Will this change render live? → deploy from the isolated worktree, then verify in the REAL
   editor, not build-green alone.
4. Am I classifying by NAME or by SEMANTICS? (Category C exists because of this.)
5. Is anything I'm reporting a subagent claim or a linter claim? → fact-check vs ground truth.

## Skills / Agents / MCP

| Skill | When |
|---|---|
| `/brainstorming` | Task 1 design gate (design mode) |
| `/strategic-plan` | order Tasks 2-3 once Task 1 lands |
| `/gap-analysis` | grade the Task 1 pattern before lock |
| `/research` | any gold-standard check before a design menu |
| `/lifecycle` | if teaching the linter (it is project tooling) |
| `/qc-council` | multi-rater the Task 1 fix-shape BEFORE dispatching Task 3 |
| `/qc-inline` | per-block checks during the sweep |
| `/verify-loop` | MANDATORY per block edit |
| `/dispatching-parallel-agents` | the Task 3 sweep |
| `/delegate` | route each dispatch (Haiku mechanical / Sonnet design) |
| `/sgs-wp-engine`, `/wp-blocks`, `/sgs-db` | any SGS block work; DB is authoritative — never hardcode counts |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 3 per-block wrapping (constrain: no deploy, no git commit — main thread commits path-scoped, deploys from the isolated worktree, and LIVE-verifies) |
| `design-reviewer` | visual + a11y QC of the migrated toggles |

| MCP / tool | For |
|---|---|
| Chrome DevTools MCP | live editor verification — worked well this session while Track 2 held the Playwright profile |
| Playwright MCP | live-verify (only if the shared browser is free) |

Canary creds (always available, gitignored): `.claude/secrets/sandybrown.env`. NOTE: the file
cannot be `source`d — the password contains `)` and `$`. Read values with
`sed -n 's/^KEY=//p'`. Deploy: `build-deploy.py --target sandybrown --blocks-only` from an
ISOLATED worktree. SSH alias `ssh hd`.
