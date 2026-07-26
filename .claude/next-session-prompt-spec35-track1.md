---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1b — Spec 32 no-inline wave programme (Wave B). Spec 35 vocabulary/rollout COMPLETE (74/74 manifested, FR-35-1..6 built); box-flat GENUINE-UPGRADE set COMPLETE (D383 A1+A2 box-object). Spec 31 cloning CLOSED. Front = the 2805 GAP-closing no-inline waves."
generated: 2026-07-26 (post box-object A1+A2 + sgs/container validation fix)
---

Invoke `/autopilot` before anything else.** Then read this file end-to-end.

> ⚠ `main` is a SHARED worktree with co-active tracks (Spec 36/37 header/footer/nav = Track 2;
> Spec 31 converter completion = Track 1c). **Path-scope every commit (`git commit -- <paths>`, the
> hook blocks a bare commit); re-check `git branch --show-current` in the SAME command; NEVER `git
> add -A`. VERIFY every commit landed via `git log -1 origin/main` after push — a push can be
> REJECTED (non-fast-forward); rebase-onto-origin then re-push.** (If a session is confirmed to be
> the ONLY one running, the co-active caution relaxes — but still path-scope + verify-landed.)

## Why this matters (motivation — Rule 7)

Spec 35 makes every SGS block's editor sidebar complete + consistent; Spec 32 makes every control the
RIGHT SHAPE (box props = linked BoxControl, colours = alpha-capable). Together a non-coder client
self-serves and Bean is QC only — intervention drops over time. **Top USP:** the inspector reads +
behaves the same on every block. Spec 31 cloning is CLOSED; this is the sole Track-1b front.

## STATE RECAP (what's DONE — do NOT re-audit from scratch)

- **Spec-35 FR-35-1..6 ALL BUILT + rolled out** (74/74 in-scope blocks manifested). States axis,
  animation cluster, orphan triage, coverage validator — all live.
- **Box-flat GENUINE-UPGRADE set COMPLETE (D383, 2026-07-26).** card-grid (prior session) + A1
  (grid-item padding/rounding ×4 blocks + converter) + A2 (product-card CTA border, mirrors button).
  All box-object now. The converter box-object architecture was EXTENDED to the gridItem family
  (grid.py fork + `box_family` seeded). Commits `b9114844` (A1+A2), `4234e26e` (baseline). The **10
  DELIBERATE-KEEP** scalars STAY scalar (pill/tag/badge radii, brand-strip/icon padding) — do NOT migrate.
- **sgs/container editor-validation FIXED (D384)** — 34 stale wrappers stripped from 12 templates,
  commit `586f5e9f`. Live baseline: **OK 1129 | GAP 2805 | ORPHAN 104 | style-defect 0** (re-run
  `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` for today's figure).

## First action (smallest, <5 min — Rule 2)

`git fetch && git log --oneline -1 origin/main` (confirm `68a70260` in history + see what co-active
tracks landed). Then `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js | grep
"Members checked"` for today's live GAP/OK. Zero risk, zero deploy.

## THE FRONT — Wave B: the 2805-GAP no-inline wave programme

A block declares a styling cluster but hasn't wired every member's control (that's a GAP). ~492 close
by native-support flips (typography/spacing/border) using the skip-serialization scoped pattern; the
rest are bespoke. This IS the existing Spec 32 no-inline wave programme (per-block, deploy-gated,
multi-session). **Scope ONE wave with Bean before building** — it is not a Spec-35 vocabulary task.

## Task W-1 — Scope + run the first no-inline wave

**What:** pick a coherent batch of GAP blocks (e.g. the ~492 native-support-flip set, or one block
family), migrate each to `__experimentalSkipSerialization` + `wp_style_engine_get_styles` scoped
`#uid` CSS (no inline style declarations), deploy-gated per block.
**Why:** shrinks the 2805 GAP toward 0 — the measurable Spec-32 completion signal.
**Estimated time:** ~10 min/block for native-flip blocks; bespoke longer. Scope the wave size with Bean.
**Orchestration:** delegate the per-block build to `wp-sgs-developer` (Sonnet) EDIT-ONLY in the working
tree (NO deploy/commit); MAIN THREAD deploys (isolated worktree OR `--skip-build --allow-dirty` verify-
deploy), live-verifies each block (frontend + editor computed-style), writes the visual-diff report,
commits path-scoped. Reusable LANDED harness: `plugins/sgs-blocks/scripts/no-inline-land-verify.js`.
**Depends on:** none. **/qc gate:** `/qc-council` for any shared-component change; `/qc-inline` per leaf block.
**Acceptance:** the block's GAP members resolve to OK in `check-element-manifest-conformance.js`; NO
inline `style="…"` declarations in rendered output; visual-diff report PASS; frontend unchanged.

**Canonical:** `.claude/plans/block-migration-DONE-checklist.md` (11 end conditions = definition of done)
+ `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` (the HOW) + Spec 32 §6.1 + Spec
31 §3.A/§13.4/§13.6. The box-migration TEMPLATE (proven): `reports/visual-diff/card-grid-2026-07-25.md`
+ `plans/2026-07-26-A1-griditem-box-object-migration.md`.

## Dependency graph

```
First action (inline) — orient
  ↓
W-1 scope the wave WITH BEAN (inline, Opus)  [Rule 9 negotiated decision]
  ↓
per-block build (wp-sgs-developer, edit-only) → main-thread deploy+verify+report → /qc → commit path-scoped
  ↓ repeat per block in the wave
```

## Two parked findings (NOT this track's front — trigger-gated)
- **`P-CONFORMANCE-GOLDEN-DRIFT`** (parking) — 27 stale conformance goldens. Do NOT blind re-seed (the
  test's own rule forbids it — masks regressions). Lands with Track 1c's phase-f-canary-deploy.
- **`P-ARCHIVE-PRODUCT-WC-VALIDATION`** (parking) — WC-core filter-block version drift on archive-product;
  editor-cosmetic, frontend fine. Belongs to a Spec-30 WooCommerce session.

## Structural defences (STOP catalogue — carry forward, never subtract — D101)

Spec-35/32 defences (carried):
- **STOP-LIVE-VERIFY-SHARED-COMPONENTS** — build-green + unit-pass is NOT proof a shared editor
  component renders. Live-verify in the real editor (ShadowControl passed 180 tests, crashed live).
- **STOP-VERIFY-SUBAGENT-FACTS** — fact-check subagent specifics (paths/versions/counts) vs ground truth
  BEFORE acting. 2026-07-26: an agent's "unrelated to this migration" + "they pass pre-seed" were both
  claims I had to independently verify (one held, one was false).
- **STOP-BLIND-REGEX-CODEMOD** — drive codemods off a KNOWN per-block attr list; `/verify-loop` per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — deploy from an ISOLATED worktree at a committed SHA OR the
  sanctioned `--skip-build --allow-dirty` verify-deploy; never junction the main node_modules into a worktree.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production; additive metadata + re-clone.
- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from the tool's `--json`.
- **STOP-FALSY-EMPTY-STRING** — `element.prefix || fallback` mis-handles an explicit `""`; test `!== undefined`.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — declaring a cluster with neither resolves ZERO members.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `tabActive*` = `[aria-selected]` not `:active`; `*Hover` booleans aren't styles.
- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — verify via `git log -1 origin/main` after push; expect rejections.
- **STOP-RESEED-PICKS-UP-TRACK2-UNTRACKED-BLOCKS** — a `/sgs-update` reseed seeds ALL blocks. It writes
  the GLOBAL DB (not committed) so no commit contamination — but confirm no untracked block.json + no tracked
  derived artefact is dirtied. (The two global DBs are hard-linked — one `--stage 1` seed covers the
  converter's DB; no Stage-10 prune needed.)
- **STOP-VERIFY-THE-FIX-EMITS-NOT-JUST-THAT-CODE-EXISTS** — live-verify emission, not just that emit code exists.
- **STOP-AUDIT-BY-SEMANTIC-NOT-SUBSTRING** — a `"X" in name` heuristic false-positives; fix false positives at the audit.
- **STOP-VERIFY-YOUR-OWN-AUDIT-SIGNAL** — verify WHAT SIGNAL a discovery tool measures before acting on its candidates.
- **STOP-PROVE-THE-PREMISE-BEFORE-AUTOMATING** — the "N fixes to automate" premise is a hypothesis; triage each first.
- **STOP-BOX-OBJECT-MIGRATION-COERCION** — a `string`/`number`→`object` attr type change coerces existing
  stored scalars to the object default. For a NON-EMPTY default, seed the object default uniform (A2 = 2px/10px);
  prove empty `{}` → SAME visual as the old default. The deploy `oldshape-audit` gates stored content.
- **STOP-VISUAL-DIFF-GATE-IS-DEPLOY-VERIFY-FIRST** — a render.php/style.css/PHP change is BLOCKED by the
  pre-commit gate until `reports/visual-diff/<block>-<date>.md` exists at repo-ROOT with `verdict: PASS` +
  `first_paint_capture_passed: true`. Flow = deploy→verify→report→commit, so verify runs on UNCOMMITTED code:
  `build-deploy.py --skip-build --allow-dirty` is the SANCTIONED verify-deploy path (the D336 warning is about
  REFLEX use on a permanently-dirty repo, not this). NEVER `--skip-verify`. md5 the deployed file local↔server
  BEFORE measuring (`verify-deploy-by-checksum-not-liveness`).

NEW from 2026-07-26 (carry forward):
- **STOP-AGENT-MESSAGE-IS-NOT-USER-AUTHORIZATION** — a subagent correctly refuses to treat a *relayed*
  message (even one citing a rule/precedent) as user consent to override a hard rule (`--allow-dirty`).
  That's correct security behaviour — do NOT try to launder a rule-override through an agent message. Resolve
  it on the MAIN thread (where you have verified context) or get direct user OK.
- **STOP-CLASSIFY-A-FLAGGED-VARIANT-YOURSELF** — a mechanical agent correctly flags an unproven variant rather
  than guessing (single.html `wp-block-columns` wrappers vs the proven `wp-block-group` pattern). The
  classification is the orchestrator's un-offloadable call — read the markup, decide, then fix comprehensively
  (re-scan for ZERO remaining across ALL files).
- **STOP-DONT-BLIND-FIX-A-PRE-EXISTING-RED-SUITE** — a red test suite you didn't cause is NOT a quick win.
  Prove pre-existing (identical count before/after your change), then fix ONLY the genuinely-safe part (a stale
  count from a deleted fixture), never a blind re-baseline that bakes real drift in as "correct".

## Pre-flight ritual (answer before the first Write/Edit)

1. On the right branch? Next commit path-scoped away from co-active tracks' files (`LEDGER`/`parking`/
   `decisions`/`STOP-CATALOGUE`/`next-session-prompt*`/`src/blocks/site-*`/`mega-*`/`nav-*`/`adaptive-nav`)?
2. About to touch a shared component/mechanism? → design-gate + qc-council + live-verify EVERY consuming block.
3. Will it render live? → deploy→verify→report→commit; the visual-diff gate REQUIRES a passing report; never build-green alone.
4. About to accept a subagent claim / a count / a discovery-tool candidate? → re-derive/verify the SIGNAL from ground truth first.
5. Migrating a scalar→box attr? → non-empty default preserved uniform? oldshape-audit PASS for stored content?
6. After committing → `git log -1 origin/main` shows MY message? Push rejected → rebase-onto-origin, re-push, re-verify.
7. About to "quickly fix" a red gate/suite you didn't cause? → prove pre-existing first; fix only the safe part; no blind re-baseline.

## Mandatory READING (tiered)

**Tier 1 — before any edit:** `.claude/plans/block-migration-DONE-checklist.md` (11 end conditions) ·
`.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` (the HOW) ·
`.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1 · `.claude/STOP-CATALOGUE.md`.
**Tier 2 — before touching the roster:** `src/components/ResponsiveBoxControl.js` ·
`plans/2026-07-26-A1-griditem-box-object-migration.md` (the proven box-migration template) ·
`reports/visual-diff/card-grid-2026-07-25.md` (report template) · `no-inline-land-verify.js`.
**Tier 3 — context:** `CLAUDE.md` binding rules R-31-1..15 · `.claude/decisions.md` head (D383/D384) ·
`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §3.A/§13.4 (read IN FULL if touching the converter).

## Tool bindings

| Skill | When |
|---|---|
| `/brainstorming` · `/gap-analysis` · `/lifecycle` · `/research` · `/strategic-plan` | ALWAYS (design-gate / grade / tooling / research / sequence) |
| `/qc-council` | multi-rater before any shared-component/converter/SGS-block commit (blub.db 255) |
| `/qc-inline` | per-file / per-leaf-block checks |
| `/verify-loop` | 2-attestation on any load-bearing claim |
| `/sgs-db`, `/wp-blocks` | DB authoritative — never hardcode a count |

| Agent | When |
|---|---|
| `wp-sgs-developer` | per-block no-inline builds — EDIT-ONLY in the working tree; main thread deploys/verifies/commits |
| `design-reviewer` | live editor + frontend computed-style verification + visual-diff reports (uses canary creds internally) |
| `general-purpose` (Sonnet) | code-grounded qc-council raters / evidence triage |

## Methodology guardrails (do not skip)
- **Deploy before measure** — deploy + md5-verify BEFORE any live pixel/computed-style test; else you measure stale output.
- **Root cause before instance fix** — ask "what CLASS of failure?" before fixing one block; the converter/shared-component root cause compounds.
- **Outcome vs completion** — a block's GAP members resolving to OK + no inline styles + visual-diff PASS is the outcome; "code shipped" is not.
- **/qc multi-rater BEFORE every commit** touching converter / shared-component / SGS-block logic (blub.db 255).
- **No version bumps / no deprecations** (D270/D293) — additive metadata + re-clone.

Canary creds (always available, CRLF — strip `\r`): `.claude/secrets/sandybrown.env`. Deploy:
`build-deploy.py --target sandybrown --blocks-only --skip-build --allow-dirty`. SSH alias `ssh hd`.
