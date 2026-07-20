---
doc_type: next-session-prompt
project: small-giants-wp
thread: Track 1 — Spec 35 block-inspector-UX. Parallax split + Task 2 #1+#2 (element manifest + conformance script + brand-strip real controls) SHIPPED + merged to main (2026-07-20, `cdfbd9e0`). Next = Task 3 (hover codemod, design-gate first), Task 6 (linters WARN-only), Task 2 #3/#4/step-5.
generated: 2026-07-20
---

# Spec 35 — Track 1 (block-inspector-UX) — next session

**Invoke `/autopilot` before doing anything else.** Then read this file end-to-end.

> **Track-1-scoped handoff.** Branch `feat/brand-strip-inspector-rebuild` is SHARED with a co-active
> Track 2 (header/footer/nav) and a Track C (`feat/core-block-migration`). Do NOT rewrite `LEDGER.md` /
> `next-session-prompt.md` / `decisions.md` — Track 2 owns them. Path-scope every commit; re-check
> `git branch --show-current` in the SAME command as the commit; NEVER `git add -A` or `git checkout`.
> See "Shared-branch discipline".

## Why this matters (motivation — Rule 7)

Spec 35 makes every SGS block's editor sidebar **complete + consistent** so a non-coder client can
self-serve and Bean is **QC only**. The single biggest lever: one fixed inspector shape the client learns
once and every block obeys (element-first: Content · Style tabs; Style tab = element sections; clusters
Text → Fill → Layout). **Top USP:** the inspector reads the same on every block → less intervention over
time. The element-first shape is now LOCKED, the machine contract that enforces it is BUILT, and the
exemplar (brand-strip) genuinely embodies it with real controls.

## What shipped this session (2026-07-20, all committed + pushed on the shared branch)

| Item | What | Commit |
|---|---|---|
| **Parallax split** | Background parallax → a toggle in the native Colour panel (`group="color"`), shown only on background-capable blocks, with a conditional Strength slider. Element parallax → its own renamed panel with a plain-English explanation + conditional Strength. Both drive the one `sgsParallax` enum (mutually exclusive) → zero render/data-model change. Live-verified. | `1d476c26` |
| **Task 2 #1** | Element-manifest schema (`supports.sgs.elements` = `{label,order,clusters[],prefix?,isWrapper?,attrMap?}`) + `cluster-member-sets.json` (text/fill/layout member sets sourced from the golden-master registry) + `check-element-manifest-conformance.js` (computes the CLUSTER-COHERENCE rule, WARN-only). brand-strip manifest seeded (4 elements). Honest run: **16 OK / 22 gaps**. | `869fe84d` |
| **Task 2 #2** | brand-strip exemplar upgraded to REAL controls: `tileShadow` SELECT → `ShadowControl` (scoped `<style>`, no inline), per-logo link → `SgsLinkControl` (→ linkUrl/linkTarget/linkRel). | `869fe84d` |
| **ShadowControl fix** | Live-verify caught a crash: `useSettings('shadow.presets')` returns WP's origin-keyed `{default,theme,custom}` object on WP 7.0.x, not a flat array → `(o||[]).map` threw. Normalised to a flat, slug-deduped array. brand-strip was the first LIVE render of ShadowControl. Live re-verified: 10 deduped preset buttons, no crash. | `bffb00ff` |
| **Task 4 live-verify** | Confirmed in the real editor: a form-field's inspector shows only Field Settings / Visibility Conditions / Spacing / Advanced — Animation/Hover/BlockLink/ClickEffects/Parallax all absent. | (verified, env) |
| **Bash node shim** | Fixed permanently: removed the leftover blank `node` placeholder in `nvm/v24.16.0` (rogue-package remnant) that shadowed `node.exe` in Git Bash. `node`/`npm` now work in Bash. | (env, no commit) |
| **info-box question** | Confirmed the child-`sgs/icon` emoji design is built + working (not broken); the audit finding was one stale converter-test post (trashed). | (investigation) |

## Remaining Track-1 tasks (next-session priorities)

- **Task 3 — hover-duplicate migration (parked, heavy).** Migrate the 85 hover-duplicates (universal
  `sgsHover*` panel + 22 blocks' private `*Hover` attrs) onto the shared `StateToggleControl`.
  **Bean's approved approach:** ONE block inline to set the canonical shape, then a **script-driven
  codemod** driven by the linter's known per-block `*Hover` attr list (NOT a blind regex — that broke
  live `textAlign` before), gated by build + `php -l` + `check-duplicate-controls.js` dropping to 0 +
  a live Playwright spot-check on 2–3 blocks. **Design-gate the codemod shape with Bean first.**
- **Task 6 — wire the 3 linters into prebuild (WARN-only).** `check-universal-fit.js`,
  `check-duplicate-controls.js`, `audit-block-file-consistency.py` → prebuild, exit 0 always. Do after
  Task 3 so baselines start clean. Note: `check-element-manifest-conformance.js` (built this session) is
  a 4th WARN-only candidate — wire it too, but the manifest only exists on brand-strip so far.
- **Task 2 #3 — per-device border + shadow (DESIGN-GATE first).** Responsive wrappers + PHP `@media`
  emitters for border (width/style/colour) + box-shadow, under the Spec 32 no-inline contract. Shared
  styling machinery → design-gate the wrapper + emitter shape with Bean BEFORE building.
- **Task 2 #4 — Content-tab organisation spec.** A doc: where the registry's behaviour-families +
  composite panels live in the Content tab (Task 2 owned the Style tab only).
- **Task 2 step 5 — per-block manifest rollout + gap-closing.** brand-strip has 22 conformance gaps
  (tile lacks opacity/overlay/width/height/min-max/border-style; caption typography partially disabled;
  strip-spacing lacks gap/width/height/box-shadow). Either add the missing controls or narrow an
  element's declared `clusters`. Then roll `supports.sgs.elements` out to the other blocks.

## FIRST ACTION (smallest, <5 min — Rule 2)

Read the LOCKED design doc `.claude/plans/spec-35-compound-control-sets-design.md` §"Rollout steps" +
run `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` to see brand-strip's live
16-OK/22-gap output — that IS the Task 2 step-5 gap list you'll work from. Zero deploy, zero risk.

## Shared-branch discipline (LOAD-BEARING)

- Branch `feat/brand-strip-inspector-rebuild`, shared with co-active Track 2 + Track C. Track-1 HEAD this
  session ended at `bffb00ff`. NOT merged to main (deliberate).
- Path-scope EVERY commit (`git add -- <paths>`); re-check `git branch --show-current` in the SAME
  command; NEVER `git add -A`, NEVER `git checkout`/switch. Non-visual commits use
  `git commit --no-verify` + a `[batch-ok: <reason>]` line.
- Merge to main ONLY via an isolated `git worktree add /c/tmp/x main`. Do NOT delete the shared branch.
- **Deploy ONLY via an isolated worktree** (`git worktree add --detach C:/tmp/sgs-deploy <commit>` +
  junction node_modules + `build-deploy.py --target sandybrown --blocks-only`) — the shared worktree
  carries Track 2 + Track C WIP; a deploy from it would ship their work. Remove the junction (PowerShell
  `rmdir`) before `git worktree remove --force`.
- `brand-strip/style.css` is HELD behind the visual-diff gate (carries pre-existing reduced-motion work +
  this session's dead-shadow-rule cleanup) — leave it uncommitted; it renders fine without it (shadow via
  render.php). Track 2/C's uncommitted files (nav-drawer/, shared/, cart, responsive-logo, LEDGER/specs)
  are NOT Track 1's — leave them alone.

## Structural defences (STOP catalogue — carry forward, never subtract)

- **STOP-LIVE-VERIFY-SHARED-COMPONENTS** (new this session): a subagent's build-green + unit-pass report
  is NOT proof a shared editor component renders. Live-verify it in the real editor (insert block, open
  EVERY tab that renders it, watch the error boundary + console) before closing. ShadowControl compiled +
  passed 180 tests but crashed on first live render (origin-keyed `shadow.presets`). Memory:
  `live-verify-shared-components-build-green-not-enough`.
- **STOP-VERIFY-SUBAGENT-FACTS**: fact-check subagent-invented specifics (paths/versions/claims) vs
  ground truth; STRUCTURE can be faithful while FACTS are wrong.
- **STOP-BLIND-REGEX-CODEMOD** (Task 3): a blind `*Hover` regex broke live `textAlign` before — drive the
  Task 3 codemod off the linter's KNOWN per-block attr list, `/verify-loop` per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE**: always deploy from an isolated worktree at a committed SHA.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270): pre-production; additive metadata + re-clone, never
  a `deprecated.js`.

## Pre-flight ritual (answer before first Write/Edit)

1. Am I on `feat/brand-strip-inspector-rebuild`, and is my next commit path-scoped?
2. Am I about to touch a shared component / shared mechanism? → design-gate + plan to live-verify.
3. Will this change render live? → deploy via isolated worktree, then verify in the real editor (not
   build-green alone).
4. Is anything I'm reporting a subagent claim? → fact-check vs ground truth before closing.

## Follow-ups / notes

- **MEMORY.md is ~20.4KB** (limit 24.4KB) — compact soon (one line per entry; move detail to topic files).
- **No D-numbers claimed** (avoided editing the shared `decisions.md`). Assign next session if wanted.
- Linters stay WARN-only until Spec close. No block version bumps / no `deprecated.js`.

## Skills / Agents / MCP

| Skill | When |
|---|---|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/brainstorming` | design-gate the Task 2 #3 responsive machinery + Task 3 codemod shape |
| `/strategic-plan` | order the remaining Task 2 / 3 / 6 work |
| `/gap-analysis` | grade the Task 3 codemod design + the content-tab spec before lock |
| `/research` | any gold-standard check before a design menu |
| `/lifecycle` | if wiring linters / editing any skill/agent |
| `/sgs-wp-engine`, `/wp-blocks`, `/sgs-db` | any SGS block work; DB is authoritative — never hardcode counts |
| `/qc-council` | multi-rater validate the Task 3 codemod fix-shape before dispatch |
| `/verify-loop` | MANDATORY per block edit (caught the textAlign regression) |
| `/delegate` | route each dispatch (Haiku mechanical / Sonnet design) |

| Agent | When |
|---|---|
| `wp-sgs-developer` | hover migration, per-device border/shadow build, per-block manifest rollout (Sonnet). Constrain: no deploy, no git commit — main thread commits path-scoped + deploys via isolated worktree + LIVE-verifies |
| `design-reviewer` | visual + a11y QC of a migrated control |

| MCP / tool | For |
|---|---|
| Chrome DevTools CLI (`chrome-devtools <tool>`) | live editor verification WITHOUT the shared MCP Playwright browser (Track 2 holds that profile). Installed globally this session. Log in via `.claude/secrets/sandybrown.env`; session drops on CLI reconnect — re-login each time |
| Playwright MCP | live-verify (only if the shared browser is free) |

Canary creds (always available): `.claude/secrets/sandybrown.env` (`WP_USER/PWD_SANDYBROWN`). Deploy: the
ONE path `build-deploy.py --target sandybrown` from an ISOLATED worktree (never the shared one). SSH alias
`ssh hd`. Conformance script: `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`.
