---
doc_type: next-session-prompt
project: small-giants-wp
thread: Track 1 — Spec 35 Task 3 (hover consolidation). nav-menu DONE + live-verified on both surfaces. The remaining sweep is planned, harness-first.
generated: 2026-07-20
---

# Spec 35 Task 3 — hover consolidation — next session

**Invoke `/autopilot` before doing anything else.** Then read this file end-to-end, then
read the phase plan `.claude/plans/2026-07-20-spec-35-hover-phase-4-plan.md` IN FULL.

> **Track-1-scoped.** Track 2 (header/footer/nav, Spec 36) owns `LEDGER.md`,
> `next-session-prompt.md` and `decisions.md` — do NOT rewrite them. Track C owns
> `feat/core-block-migration`. Path-scope every commit; re-check
> `git branch --show-current` in the SAME command as the commit; never `git add -A`.
> Work in an isolated worktree (`/c/tmp/sgs-hover` exists on the branch), never
> `git checkout` in Bean's main folder.

## Why this matters (Rule 7)

Spec 35 makes every block's sidebar complete and consistent so a non-coder client
self-serves and Bean is QC only. Hover was the largest remaining inconsistency: a client
could meet two controls for one effect, in two places. **Top USP:** the inspector reads
the same on every block, so intervention drops over time.

## THE ARCHITECTURE (Bean-locked — do not re-litigate)

> There is no standalone "hover colour" control. Hover is ALWAYS a STATE of an existing
> control — a `StateToggleControl` (Normal | Hover) sitting exactly where the base
> control sits, mirroring it, inside that element's own panel.

Element-first wins; shadow is element-owned and gets a toggle plus a shadow colour;
image-specific universals leave the universal panel.

## What shipped this session (branch `feat/spec-35-hover-consolidation`, pushed)

| Commit | What |
|---|---|
| `c3a7b586` | nav-menu hover rebuilt: real `::after` underline bar replacing the ragged `text-decoration:underline` fallback; item text/background split into separate controls each with Normal\|Hover; featured item gains its own hover pair; new `hoverStyle` (pill \| underline \| text). Attr rename `itemHoverColour`→`itemBgHover` (it always held a background). |
| `e8208484` | **Bug found by reading emitted CSS.** `implode(',',$sels).'::after'` attached the pseudo-element to the LAST selector only — the bar appeared on `[aria-current]` but never on `:hover` or `:focus-visible`. |
| `b29d12ef` | **17** hardcoded literal occurrences → attributes/tokens across `render.php` + `style.css`: `border-radius:8px`×3 + `border-radius: 8px`×1, `font-weight:600`×2, `.15s ease`×7, `.2s ease`×1, `150ms ease`×3. Pill shape becomes state-aware (`itemRadiusHover`, `featuredRadiusHover`, `featuredFontWeightHover`). Parked separators + the two-instance duplication. **NOTE: `b29d12ef`'s own commit message says "8 in render.php, 3 in style.css" (=11) — that count is WRONG and cannot be amended (pushed, shared branch). 17 is the verified figure, counted from `git show b29d12ef \| grep '^-'`. Trust this line, not the commit message.** |
| `fc1f2faa` | **A wrong fix, kept in history deliberately.** Widened the type to `["number","null"]` on inference. Did not work. |
| `cf641603` | **The real fix.** Drop the `default` entirely so the key is absent. `""` is a string and matches neither union member. |
| `88e8cb9e` | The phase plan for the remaining sweep. (Committed as `…-wave-4-plan.md`; renamed to `…-phase-4-plan.md` in the handoff commit so it matches the `phase-plan` doc-type glob. Bean used the word "wave"; the docs now say "Phase 4" throughout — same thing.) |

**Live-verified on BOTH surfaces:** frontend collected CSS shows the bar on all three
selectors with token transitions; editor REST returns 200, canvas paints 4 nav wrappers /
10 links, blocks valid, zero crash nodes.

## Mandatory READING (before any Write/Edit)

1. This file, end to end.
2. `.claude/plans/2026-07-20-spec-35-hover-phase-4-plan.md` — IN FULL. It carries the four
   findings that shaped the plan; skimming it loses the reasoning and you will re-derive
   it the hard way.
3. `.claude/STOP-CATALOGUE.md` — the project-wide structural defences.
4. `src/blocks/button/edit.js` + `src/blocks/nav-menu/edit.js` — the two reference
   implementations of the locked pattern.
5. `.claude/parking.md` entries `P-NAV-ITEM-SEPARATORS`, `P-NAV-INSTANCE-CONFIG-DUPLICATION`,
   `P-AUDIT-COLOUR-ROLE-KEYED` — open work adjacent to this track.

## First action (<5 min, zero risk)

Phase 0 of the plan — re-derive the worklist. **Do not trust the old 24/40 split**:
nav-menu was filed as one of the "40 hard" blocks whose resting colour comes from native
`supports.color`, and it has no `supports.color` at all. Everything branches on this.

```bash
node plugins/sgs-blocks/scripts/check-duplicate-controls.js --json > /c/tmp/hover.json
```
Then build `scripts/audit-hover-attrs.py` per the plan's Phase 0 to classify every hover
attr into A1 / A2 / B / C with its base attribute and base SOURCE.

## Tasks (full detail + acceptance in the phase plan)

### Task 0 — Re-derive the worklist
**What:** `scripts/audit-hover-attrs.py` → `hover-worklist.json`.
**Why:** unblocks and correctly scopes everything else.
**Time:** 15 min. **Orchestration:** inline (Opus) — its correctness gates the sweep.
**Depends on:** none. **/qc gate after:** `/qc-inline`.
**Acceptance:** counts reconcile to the live attribute total; every Category C entry
(`pauseOnHover`, `autoScrollPauseOnHover`, `overlayHover`) individually justified.

### Task 1 — Build the verification harness FIRST
**What:** `verify-block-css.js` (follow the collected-CSS link, assert selectors) +
`verify-block-editor.mjs` (Playwright: REST 200, isValid, panels render, no console 4xx).
**Why:** these are the two checks that caught this session's bugs. Scripting them is what
makes delegating a multi-block sweep to Haiku safe rather than reckless.
**Time:** 25 min. **Orchestration:** delegated — Sonnet ×2 in parallel via
`/dispatching-parallel-agents` (two independent scripts, no shared state).
**Depends on:** none. **Parallel with:** Task 0.
**Acceptance:** both scripts FAIL at `e8208484^` and PASS at `cf641603`. A harness that
cannot detect the known bug is not a harness.

### Task 2 — DESIGN GATE with Bean (only if Task 0 shows Category A2 is non-empty)
**What:** how `StateToggleControl`'s Normal side reads/writes native
`style.color.background` while Hover writes a block attribute.
**Why:** shared styling machinery across every block — project rule 7.
**Time:** 20 min. **Orchestration:** inline Opus + `/brainstorming`; `/qc-council` the
shape BEFORE dispatch. **Depends on:** Task 0.
**Acceptance:** a pattern Bean approves, proven live on ONE A2 block through BOTH harness legs.

### Task 3 — The sweep
**What:** wrap each base/hover pair in `StateToggleControl` per `src/blocks/button/edit.js`.
**Time:** ~5 min/block. **Orchestration:** Haiku, ONE BLOCK EACH, driven by
`hover-worklist.json` (never a regex). Escalate to Sonnet where Task 0 flags ambiguity.
**Brief:** "WRAP ONLY — never delete, rename or re-type an attribute or control. Do not
touch any attribute not in your list. Do not deploy. Do not commit. Do not run git."
**Depends on:** Task 1; A2 blocks also on Task 2. **/qc gate after:** per block.
**Acceptance:** zero attribute deletions in `git diff`; build green; both harness legs PASS.

### Task 4 — Delete the universal hover controls
**What:** remove `sgsHoverBgColour`/`TextColour`/`BorderColour`/`Shadow`/`ImageZoom`/
`Grayscale` from `extensions/hover-effects.js` + `includes/hover-effects.php`; regenerate
`extension-attributes.generated.php`. **KEEP** scale/tilt/duration/easing/stagger/focus
ring/border accent. **Depends on:** Task 3 (deleting first strands capability).
**Time:** 15 min. **Orchestration:** inline Opus. **/qc gate after:** `/qc-inline`.

### Task 5 — Wire the new gates (WARN-only)
**What:** `check-ssr-null-defaults.js` (fail `render:file:` block + non-string attr with
`default:null`) and `check-pseudo-selector-lists.js`. Plus wire the 4 existing WARN-only
linters (`check-universal-fit`, `check-duplicate-controls`, `audit-block-file-consistency`,
`check-element-manifest-conformance`). **Time:** 20 min. **Orchestration:** Haiku ×2,
inline review before wiring. **Depends on:** none.
**Acceptance:** G1 reproduces nav-menu's 400 at `fc1f2faa`.
**Also:** run G1 across all 80 blocks early — other editors may already be 400-ing.

## Dependency graph

```
Task 0 (worklist) ──┬─────────────────────────► Task 5 (gates, anytime)
Task 1 (harness) ───┼──► Task 3 A1 sweep ──┐
Task 2 (design gate)┴──► Task 3 A2 sweep ──┴──► Task 4 (delete universals)
```
Tasks 0, 1, 5 are independent and can start cold. Only Task 2 needs Bean.

## Methodology guardrails (do not skip)

- **Deploy before measure** — any change that should be visible live needs build + deploy
  + OPcache reset BEFORE any browser test, or you are measuring stale output.
- **Verify BOTH surfaces** — frontend page AND real editor. Frontend-perfect coexisted
  with a 400 editor this session.
- **Root cause before instance fix** — ask "what's the CLASS of failure?" first.
- **Outcome vs completion** — code shipped ≠ outcome achieved.
- **`/qc` multi-rater before every commit** touching converter / pipeline / SGS block logic.
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page.
- **Merge `origin/main` before every shared-canary deploy**; verify with a per-track marker
  + md5, never the generic HTTP-200 leg.

## Blockers / known issues

- **`check-duplicate-controls.js`'s count is NOT the success criterion.** It reports 85
  duplicates and flags element-scoped hovers (e.g. `sgs/button.iconColourHover`) that are
  CORRECT under the locked architecture. Driving it to 0 deletes real capability. Teach it
  element-scoped vs whole-block before trusting it.
- **CLAUDE.md doc conflict** — it promotes "`null` default = inherit" as canonical. True
  for STATIC blocks, a guaranteed editor 400 for ServerSideRender ones. Write the asymmetry
  in; do not let it be rediscovered per block.
- **Uniformity audit — status CHANGED.** The previous prompt recorded it as RED for every
  track (`sgs/nav-drawer` + `sgs/nav-menu` UK colour attrs without `supports.color`). It
  ran **CLEAN** on all five commits this session, so `--no-verify` was not needed. Kept
  here because the underlying name-keyed check is still wrong — see parking
  `P-AUDIT-COLOUR-ROLE-KEYED`.
- **`/sgs-update` Stage 11 WARN** — container roster mismatch: `brand-strip`, `nav-menu`
  detected as LAYOUT and `nav-drawer` as CONTENT, none expected. Cross-track; it correctly
  refused to write block.json. Needs Track 2 + Track 1 to agree the roster.
- **MEMORY.md** compacted 2026-07-20 (23.5KB → 10.7KB, no entries dropped). Three lessons
  are `pending_upload: true` — the blub dashboard was down (no TCP listener on 5050).
  Re-POST to `http://localhost:5050/api/learning` when it is back.
- **No D-numbers claimed** (avoided editing the shared `decisions.md`). Assign if wanted.
- **Not merged to main** — deliberate; the branch is shared with co-active tracks.
- **Doc drift:** canary is on **WP 7.0.2**; `CLAUDE.md` still says 7.0.1.
- **WP 7.1 (19 Aug 2026) removes the 36px control default** — TextControl/SelectControl/
  RangeControl warn plugin-wide. Not urgent, but dated.

## Structural defences (STOP catalogue — carry forward, never subtract)

Carried forward from the previous prompt (9) + 5 new from this session = **14**.

- **STOP-VERIFY-BOTH-SURFACES** (new): frontend-correct ≠ editor-correct. nav-menu's
  frontend CSS was verified in detail while the editor canvas was HTTP 400. Bean saw it
  first. Verify both, always.
- **STOP-BLOCK-CSS-IS-NOT-INLINE** (new): `class-sgs-css-registry.php` lifts every block
  `<style>` at `render_block` p99 into a hashed file under `uploads/sgs-css/`. Grepping page
  HTML finds nothing and looks exactly like a broken emit. Cost ~40 min this session.
- **STOP-SSR-NULL-DEFAULT** (new): `default: null` on a non-string attr makes
  ServerSideRender send `""`, which the REST block-renderer rejects → 400 → dead canvas.
  Omit the default. Widening to `["number","null"]` does NOT work.
- **STOP-PSEUDO-ON-SELECTOR-LIST** (new): `implode(',',$sels).'::after'` attaches the
  pseudo-element to the LAST selector only. Map over the list, never append to the join.
- **STOP-DONT-SHIP-AN-INFERRED-FIX** (new): proving the CAUSE does not make the FIX proven.
  Re-run the cause-proving probe against the fix before deploying. Never report "fixed"
  from a green build — only from a re-run of the failing check.
- **STOP-SWEEP-BY-NAME-NOT-SEMANTICS**: `pauseOnHover` matches every "hover" regex and is a
  marquee behaviour flag, not a colour state. Classify by SEMANTICS before any sweep. Same
  class as the Haiku swarm that deleted live `textAlign` off 4 blocks.
- **STOP-CHECK-WORKING-TREE-NOT-JUST-BRANCH**: check `git status` AND file mtimes before any
  branch operation on a shared folder.
- **STOP-SCRATCH-CONTENT-STRANDS-DEPLOYS**: a test block inserted in the editor autosaves a
  draft; if its attributes are later removed, the deploy's oldshape-audit HARD-FAILS on
  stranded content. Delete scratch drafts immediately after verifying. (This session
  verified in the Site Editor WITHOUT saving, precisely to avoid this.)
- **STOP-LIVE-VERIFY-SHARED-COMPONENTS**: build-green + unit-pass is NOT proof a shared
  editor component renders. Open every tab that renders it. (ShadowControl crashed live
  after passing 180 tests; the swatch bug passed everything and showed the wrong colour.)
- **STOP-VERIFY-SUBAGENT-FACTS**: fact-check subagent-invented specifics vs ground truth.
- **STOP-BLIND-REGEX-CODEMOD**: drive codemods off a KNOWN per-block attr list;
  `/verify-loop` per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE**: always deploy from an isolated worktree at a
  committed SHA.
- **STOP-SHARED-CANARY-STALE-BASE-DEPLOY**: an isolated worktree pinned to an older `main`
  + `--blocks-only` (which ships the WHOLE plugin) silently overwrites a co-active track's
  deploy. `git merge origin/main` first; verify per-track marker + md5.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270): pre-production; additive metadata +
  re-clone, never a `deprecated.js`.

## Pre-flight ritual (answer before first Write/Edit)

Carried forward (5) + 1 new = **6**.

1. Am I in an ISOLATED worktree, and did I check `git status` + file mtimes, not just the
   branch?
2. Is what I'm about to change a shared component or shared mechanism? → design-gate +
   live-verify.
3. Will this change render live? → deploy from the isolated worktree, then verify in the
   REAL editor AND on the frontend — not build-green alone.
4. Am I classifying by NAME or by SEMANTICS? (Category C exists because of this.)
5. Is anything I'm reporting a subagent claim or a linter claim? → fact-check vs ground truth.
6. **(new)** Am I about to report something "fixed" on the strength of a green build, or on
   a re-run of the check that was failing?

## Tool bindings

| Skill | When |
|---|---|
| `/brainstorming` | Task 2 design gate (design mode) |
| `/strategic-plan` | re-order Tasks 3–5 once Task 0 lands |
| `/gap-analysis` | grade the Task 2 pattern before lock |
| `/research` | any gold-standard check before a design menu |
| `/lifecycle` | wiring the new linters (project tooling) |
| `/qc-council` | multi-rater the Task 2 fix-shape BEFORE dispatching Task 3 |
| `/qc-inline` | per-block checks during the sweep |
| `/verify-loop` | MANDATORY per block edit |
| `/dispatching-parallel-agents` | Task 1 (2 Sonnet) + Task 3 (N Haiku) |
| `/delegate` | route each dispatch |
| `/sgs-wp-engine`, `/wp-blocks`, `/sgs-db` | any SGS block work; DB is authoritative — never hardcode counts |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 3 per-block wrapping (constrain: no deploy, no git; main thread commits path-scoped, deploys from the isolated worktree, and verifies BOTH surfaces) |
| `design-reviewer` | visual + a11y QC of the migrated toggles |

| MCP / tool | For |
|---|---|
| Playwright MCP | live editor verification — was free this session and worked well |
| Chrome DevTools MCP | fallback if Track 2 holds the Playwright profile |

Canary creds (gitignored, always available): `.claude/secrets/sandybrown.env` — NOTE it
lives in Bean's MAIN worktree, not the isolated one, and cannot be `source`d (the password
contains `)` and `$`). Read with `sed -n 's/^KEY=//p'`. Deploy:
`build-deploy.py --target sandybrown --blocks-only` from the ISOLATED worktree. SSH `ssh hd`.
