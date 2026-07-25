---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1 — Spec 35 block-inspector-UX + Spec 32 box-object control-shape. Spec 35 vocabulary/rollout COMPLETE (74/74 in-scope manifested, FR-35-1..6 built). Spec 31 cloning CLOSED (D380). Front = the Spec 32 box-flat GENUINE-UPGRADE batch (card-grid LANDED 2026-07-25 s2) + the 2805 GAP-closing (no-inline waves)."
generated: 2026-07-25 s2 (post Spec-35 audit + structural pass + first box migration deployed)
---

# Spec 35 / Spec 32 — Track 1 (block-inspector-UX + control-shape) — next session

**Invoke `/autopilot` before anything else.** Then read this file end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`,
> the D-numbering cadence, and `src/blocks/site-*` + `mega-*` + `adaptive-nav`. **Path-scope every
> commit (`git commit -- <paths>`, the path-scoped hook blocks a bare commit); re-check `git branch
> --show-current`; NEVER `git add -A`. VERIFY every commit landed via `git log -1 origin/main` after
> push — Track 2 races commits, and a push can be REJECTED (non-fast-forward) so rebase-onto-origin
> then re-push.** (Hit 3× this session: 043d399f, aa29540a, a push rejection all mid-work.)

## Why this matters (motivation — Rule 7)

Spec 35 makes every SGS block's editor sidebar complete + consistent; Spec 32 makes every control
the RIGHT SHAPE (box props = linked BoxControl, colours = alpha-capable). Together: a non-coder
client self-serves, Bean is QC only. **Top USP:** the inspector reads + behaves the same on every
block, so intervention drops over time. Spec 31 (cloning) is CLOSED — this is the sole Track-1 front.

## STATE RECAP (what's DONE — do NOT re-audit from scratch)

Session 2026-07-25 s2 delivered (all committed to `main`, all gates green):
- **Spec-35 audit** corrected a badly-stale prior prompt: FR-35-1..6 are ALL BUILT + rolled out
  (states axis 16 blocks, animation cluster ~23, orphan triage, coverage validator). The prior
  "FR-35-5/6 not built / 28 manifested" was wrong.
- **Structural pass** (`9468fd94`): wired the FR-35-3 coverage validator + box-family guard into
  `prebuild` (was orphaned) via `run-consistency-gates.py`; universal `*Unit`-companion orphan fix
  (style-defect 1→0); 3 discovery tools (`check-box-flat.py`, `report-colour-alpha.py`).
- **nativeSupportsPath map completed** (`2d2eeded`): +112 OK (typography family + box members).
- **Rollout COMPLETE** (`55b8ae36`): the last 8 form blocks manifested → **74/74 in-scope**.
- **Colour-alpha proven a NON-ISSUE** (`a63e5105`): 58/60 "candidates" were false — SGS colours get
  alpha from the shared `DesignTokenPicker` (default on). Report fixed (60→2, both info-box).
- **Box-flat triaged** 22 → **11 GENUINE-UPGRADE / 10 DELIBERATE-KEEP / 1 spot-check**.
- **FIRST box migration LANDED** (`d3f04b96`): `card-grid::cardBorderWidth` scalar→4-side BoxControl,
  deployed to sandybrown (md5-verified), visual-diff report PASS, `splitOnAxis={false}` locked.

Live baseline post-session: `check-element-manifest-conformance.js` → OK 1129 | GAP 2805 | ORPHAN
104 (style-defect 0). **Re-run for today's figure — never quote a cached count.**

## First action (smallest, <5 min — Rule 2)

`git -C <isolated-worktree> log --oneline -1 origin/main` after `git fetch` — confirm HEAD carries
`d3f04b96` (card-grid) in history and see what Track 2 landed since. Then run
`node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js | grep "Members checked"` for
today's live GAP/OK. Zero risk, zero deploy.

## THE FRONT — two fronts, pick with Bean

### Front A (recommended first): finish the box-flat GENUINE-UPGRADE batch (pattern PROVEN)

card-grid proved the flat→box pattern end-to-end (edit.js `ResponsiveBoxControl` + render.php
per-side scoped emit + style.css shorthand→per-side + deploy + visual-diff report + commit). Two
units remain:

## Task A1 — Shared `GridItemDefaultsPanel` → BoxControl (8 attrs, ONE change)
**What:** `gridItemPadding` + `gridItemBorderRadius` on container/cta-section/hero/trust-bar all
route through ONE shared component (`plugins/sgs-blocks/src/blocks/container/components/ContainerWrapperControls.js:1106`).
Convert the two flat `TextControl`s there to `ResponsiveBoxControl` (padding, 4-side) +
`ResponsiveBorderRadiusControl` (radius, 4-corner). Both default `''`→`{}` → visually neutral.
**Why:** highest-value box upgrade (8 attrs, asymmetric card padding + top-only-rounded cards) in one
universal change (R-31-9).
**Estimated time:** ~25 min build + deploy + verify.
**Orchestration:** delegate the build to `wp-sgs-developer` (Sonnet) from a precise spec (mirror the
card-grid commit `d3f04b96` diff); EXECUTE + build in an ISOLATED worktree, NO deploy/commit.
Then MAIN THREAD: deploy (`--skip-build --allow-dirty`), Playwright live-verify **all 4 blocks**
(shared component → STOP-LIVE-VERIFY-SHARED-COMPONENTS), write `reports/visual-diff/gridItem-*.md`,
commit. `/qc-council` before commit (shared mechanism, blub.db 255).
**Depends on:** none. **Parallel with:** A2 (disjoint files). **/qc gate:** yes — qc-council.
**Acceptance:** 4 blocks' grid-item padding/radius render per-side; empty `{}` neutral (md5-verified
deploy + oldshape PASS + live computed-style); visual-diff report PASS.

## Task A2 — `product-card` CTA border → BoxControl (2 attrs, PRESERVE DEFAULTS)
**What:** `ctaBorderWidth` (default **2**) + `ctaBorderRadius` (default **10**) scalar→object. Unlike
card-grid, these have NON-EMPTY defaults → the object default MUST be seeded to the uniform value
`{top:2,right:2,bottom:2,left:2}` / `{topLeft:10,…:10}` or the render must fall through to 2/10 when
empty, or existing CTAs flatten (`object-typed-attr-coerces-flat-to-default` — see STOP below).
**Why:** completes the genuine-upgrade set; CTA mirrors `sgs/button` which already uses box-objects.
**Estimated time:** ~15 min.
**Orchestration:** `wp-sgs-developer` (Sonnet), same pattern; main-thread deploy+verify+commit.
**Depends on:** none. **Parallel with:** A1. **/qc gate:** yes — qc-inline (single block).
**Acceptance:** existing CTAs render byte-identical (2px/10px preserved); visual-diff PASS.

**After A1+A2:** one batch `/sgs-update` to seed `box_family` for the migrated attrs (confirm Track 2
blocks are committed first — STOP-RESEED). **DO NOT touch the 10 DELIBERATE-KEEP scalars.**
**OPEN for Bean:** `trust-bar::badgeImageBorderRadius` (square/circle toggle) — recommended keep-scalar,
awaiting his call before the batch.

### Front B: the 2805 GAP-closing (the Spec 32 no-inline wave programme)

A block declares a cluster but hasn't wired every member's control. ~492 close by native-support
flips (typography/spacing/border) with the skip-serialization scoped pattern; the rest are bespoke.
This IS the existing Spec 32 no-inline wave programme (per-block, deploy-gated, multi-session). Scope
a wave with Bean before starting; it is NOT a Spec-35 vocabulary task.

## Structural defences (STOP catalogue — carry forward, never subtract — D101)

Spec-35/32 defences (carried):
- **STOP-LIVE-VERIFY-SHARED-COMPONENTS** — build-green + unit-pass is NOT proof a shared editor
  component renders. Live-verify in the real editor (ShadowControl passed 180 tests, crashed live).
- **STOP-VERIFY-SUBAGENT-FACTS** — fact-check subagent specifics (paths/versions/counts) vs ground truth.
- **STOP-BLIND-REGEX-CODEMOD** — a blind `*Hover` regex broke live `textAlign`. Drive codemods off a
  KNOWN per-block attr list; `/verify-loop` per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — deploy from an ISOLATED worktree at a committed SHA; the
  agent-run `npm install` inside a worktree is fine, but `git worktree remove --force` deletes its
  node_modules — never junction the main one in.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production; additive metadata + re-clone.
- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from the tool's `--json`.
- **STOP-FALSY-EMPTY-STRING** — `element.prefix || fallback` mis-handles an explicit `""`; test `!== undefined`.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — declaring a cluster with neither resolves ZERO members + scores WORSE.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `tabActive*` = `[aria-selected]` not `:active`; `*Hover` booleans aren't styles.

From the 2026-07-25 Spec-31 close (carried):
- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be Track 2's;
  verify via `git log -1 origin/main` after push, and expect push REJECTIONS (rebase-onto-origin then re-push).
- **STOP-RESEED-PICKS-UP-TRACK2-UNTRACKED-BLOCKS** — a `/sgs-update` reseed on the shared tree seeds
  Track 2's untracked blocks into shared artefacts. Confirm derived files carry only your rows / reseed
  with Track 2 committed. A cross-track pre-commit hook failure can block YOUR commit — fix at the
  audit/exempt layer, never `--no-verify`.
- **STOP-VERIFY-THE-FIX-EMITS-NOT-JUST-THAT-CODE-EXISTS** — a render fix's code can be correct and not
  paint. Live-verify emission.
- **STOP-AUDIT-BY-SEMANTIC-NOT-SUBSTRING** — a `"X" in name` heuristic false-positives (`colourScheme`).
  Fix false positives at the audit, don't misconfigure the block.

NEW from 2026-07-25 s2 (carry forward):
- **STOP-VERIFY-YOUR-OWN-AUDIT-SIGNAL** — `report-colour-alpha.py` grepped the literal `enableAlpha`
  string per-block → 60 false "candidates"; the real capability lived in the shared `DesignTokenPicker`
  (default on). Before ACTING on a discovery tool's candidate list, verify WHAT SIGNAL it measures vs
  how the codebase actually provides the capability. A check that measures the wrong thing manufactures
  work. (Extends STOP-COUNTS-FROM-THE-TOOL to the tool's own correctness.)
- **STOP-PROVE-THE-PREMISE-BEFORE-AUTOMATING** — asked to bulk-fix "22 box + 60 colour" via haiku/script;
  investigation cut it to ~3 box units + 0 colour (colour already done; box had 10 deliberate-uniform
  keeps that a codemod would REGRESS). Prove the fixes are REAL (and not deliberate design) before
  firing a fleet. The premise you're handed is a hypothesis.
- **STOP-BOX-OBJECT-MIGRATION-COERCION** — a `string`→`object` attr TYPE change silently coerces an
  existing stored scalar (`"1px"`) to `{}` → the value VANISHES (`object-typed-attr-coerces-flat-to-default`).
  Two guards: (1) the deploy `oldshape-audit` gates incompatible stored content — read its PASS/FAIL;
  (2) for a NON-EMPTY scalar default, seed the object default to the uniform value on all sides, or
  render must fall through to the old default. Prove empty `{}` → the SAME visual as the old scalar.
- **STOP-VISUAL-DIFF-GATE-IS-DEPLOY-VERIFY-FIRST** — a frontend-affecting commit (render.php/style.css)
  is BLOCKED by the pre-commit visual-diff gate until `reports/visual-diff/<block>-<date>.md` exists at
  repo-ROOT with `verdict: PASS` + `first_paint_capture_passed: true`. The flow is deploy→verify→report
  →commit, so the verify-deploy runs on UNCOMMITTED code: `build-deploy.py --skip-build --allow-dirty`
  is the SANCTIONED path (the script itself says so; `--allow-dirty`'s D336 warning is about REFLEX use
  on a permanently-dirty repo, not a deliberate verify-deploy). NEVER `--skip-verify`. md5 the deployed
  file local↔server BEFORE measuring (`verify-deploy-by-checksum-not-liveness` — the generic HTTP-200
  leg passes on any working page). block.json-meta-only changes may `--no-verify`; render/style changes may NOT.

## Pre-flight ritual (answer before the first Write/Edit)

1. On `main`? Next commit path-scoped away from Track 2's files (`LEDGER`/`parking`/`decisions`/
   `STOP-CATALOGUE`/`next-session-prompt.md`/`src/blocks/site-*`/`mega-*`/`adaptive-nav`)?
2. About to touch a shared component/mechanism (`ResponsiveBoxControl`, `GridItemDefaultsPanel`,
   `DesignTokenPicker`)? → design-gate + qc-council + live-verify EVERY consuming block.
3. Will it render live? → deploy from an isolated worktree; visual-diff gate REQUIRES a passing report
   (deploy→verify→report→commit); never build-green alone.
4. About to accept a subagent claim OR a count OR a discovery-tool candidate list? → re-derive/verify
   the SIGNAL from ground truth before stating or acting on it.
5. Migrating a scalar→box attr? → is the current default non-empty (must preserve uniform), and does
   the deploy oldshape-audit PASS for existing stored content?
6. After committing → `git fetch` + `git log -1 origin/main` shows MY message at (or in) HEAD? Push
   rejected → rebase-onto-origin, re-push, re-verify.
7. About to reseed / commit a derived artefact? → free of Track 2's untracked-block contamination?

## Mandatory READING (tiered)

**Tier 1 — before any edit:** `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md`
(FR-35-1..6, now marked BUILT) · `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` (box-object
contract + the 2026-07-25 s2 box-flat migration note) · `reports/visual-diff/card-grid-2026-07-25.md`
+ `product-card-2026-07-25.md` (the box-migration + report TEMPLATE) · `.claude/STOP-CATALOGUE.md`.
**Tier 2 — before touching the roster:** `src/components/ResponsiveBoxControl.js` (the shared box
control; `splitOnAxis=false` locked) · `container/components/ContainerWrapperControls.js:1106`
(GridItemDefaultsPanel — the A1 target) · `check-box-flat.py` + `box-flat-baseline.json` ·
`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13 (box-family DB seeding, read if reseeding).
**Tier 3 — context:** `CLAUDE.md` binding rules R-31-1..15 · `.claude/decisions.md` head (Track 2
owns the cadence) · `check-element-manifest-conformance.js` header.

## Tool bindings — Skills / Agents / MCP

| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — any design gate before a shared mechanism |
| `/gap-analysis` | ALWAYS — grade output before declaring done |
| `/lifecycle` | ALWAYS — editing any skill/agent/linter-as-tooling |
| `/research` + `/library-docs` | ALWAYS — gold-standard check (e.g. WP BoxControl props) before a design menu |
| `/strategic-plan` | ALWAYS — sequence before executing |
| `/delegate` | route every dispatch (python/haiku/sonnet/opus triage) |
| `/qc-council` | multi-rater before any shared-component/converter/SGS-block commit (blub.db 255) |
| `/verify-loop` | 2-attestation on any load-bearing claim |
| `/sgs-db`, `/wp-blocks` | DB authoritative — never hardcode a count |

| Agent | When |
|---|---|
| `wp-sgs-developer` | box-migration builds. Constrain: EXECUTE + build in an ISOLATED worktree, NO deploy/commit — main thread deploys (`--skip-build --allow-dirty`), live-verifies, writes the report, commits path-scoped |
| `general-purpose` (Sonnet) | evidence-gathering triage + a cross-model adversarial refuter on a shared-mechanism change |
| `design-reviewer` | visual + a11y QC of the migrated BoxControls in the live editor |

| MCP / tool | For |
|---|---|
| Playwright MCP | live editor + frontend computed-style verification (the visual-diff report evidence) |
| Chrome DevTools CLI | fallback if Track 2 holds the shared browser profile |

Canary creds (always available, CRLF-encoded — strip `\r` on source): `.claude/secrets/sandybrown.env`.
Deploy: `build-deploy.py --target sandybrown --blocks-only --skip-build --allow-dirty` from an ISOLATED
worktree (verify-deploy of uncommitted change; NEVER `--skip-verify`). SSH alias `ssh hd`. Card-grid
+ product-card oracle pages: `f3-oracle-sgs-<block>` on sandybrown (card-grid renders empty / 1069
wc-delegated — no native `.sgs-card-grid__item`; author a native instance to positive-verify a border).
