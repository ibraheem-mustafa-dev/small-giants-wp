# Spec 35 — Track 1 (block-inspector-UX) — next session

**Invoke `/autopilot` before doing anything else.** Then read this file end-to-end.

> This is a **Track-1-scoped** handoff. The branch `feat/brand-strip-inspector-rebuild` is SHARED with
> a co-active Track 2 (header/footer/nav). Do NOT rewrite `LEDGER.md` / `next-session-prompt.md` /
> `decisions.md` — Track 2 edits them. Path-scope every commit; re-check `git branch --show-current` in
> the SAME command as the commit; NEVER `git add -A` or `git checkout`. See "Shared-branch discipline".

## Why this matters (motivation — Rule 7)

Spec 35 makes every SGS block's editor sidebar **complete + consistent** so a non-coder client can
self-serve, and so Bean is **QC only**. The single biggest lever: one fixed inspector shape the client
learns once and every block obeys. This session locked that shape (element-first) and shipped 4 of 6
tasks. **Top USP:** the inspector reads the same on every block → less intervention over time.

## What shipped this session (2026-07-19, all committed + pushed on the shared branch)

| Task | What | Commit |
|---|---|---|
| **Task 1** | Folded the archetype-deck v2 into the registry golden master (18 rows + 6 `_meta` sections: colour split, Border builder, shadow presets, structural patterns, etc.) | `3b51b435` |
| **Task 5** | cta-section: removed 12 genuinely-dead attrs (0-grep proven); tabs: declared `blockLabel` + added an Accessibility label control | `fcc5d62c` |
| **Task 2** | **Element-first inspector design — graded + hardened + LOCKED (direction).** See below. | `f61034c2` |
| **Task 4** | animation opt-out mechanism (wired into the shared `isExtensionHidden` helper) + opted 14 form-field blocks out of the 5 poor-fit styling universals + retired the hardcoded `ANIMATION_DENYLIST` | `90f989a1`, `f54ec34f` |
| **Build env** | Fixed permanently: a rogue global `node@26.5.0` package was shadowing the real Node on PATH. `npm uninstall -g node` done — every terminal now builds cleanly (real node = `C:\nvm4w\nodejs`). | (env, no commit) |

## Task 2 — the LOCKED design (element-first) + its ROLLOUT BUILDS

**Design doc:** `.claude/plans/spec-35-compound-control-sets-design.md` (status: HARDENED, direction LOCKED).
**Example artifact (drawn):** https://claude.ai/code/artifact/0884087a-a4b8-440f-a005-f409f2198228
**Exemplar:** `.claude/plans/spec-35-brand-strip-exemplar-note.md` (refreshed).

The shape (Bean-signed-off): **2 tabs** (Content · Style; Advanced = native free panel in Settings, not a
3rd tab). **Style tab = element sections** (the parts a client recognises — Tile, Caption, Button…),
ordered by a manifest `order`. **3 within-element clusters, one fixed order: Text → Fill → Layout.**
opacity lives in Fill; **border + shadow merged into Layout** (they define the outline/shape); "Effects"
gone. **Normal/Hover = one StateToggleControl** (Focus mirrors Hover), on Fill + Layout's border/shadow
sub-part. **Per-device (768/1024)** on type sizes, spacing, size, border, shadow. **Presets-first** entry.
Progressive disclosure, one level. Composes the archetype-deck controls (the control library).

**Graded B- (GO-WITH-FIXES) by inline gap-analysis + an independent adversarial reviewer.** All design-level
gaps are CLOSED in the doc. The remaining items are **rollout BUILDS** (do before the lint is switched ON):
1. **Element-manifest schema** (`supports.sgs.elements`) + the conformance script that reads it — the
   BLOCKER that makes the CLUSTER-COHERENCE rule computable (there is no element axis in the data today).
2. **Upgrade brand-strip to the real controls** — swap `tileShadow` SELECT → `ShadowControl`, raw
   `TextControl` link → `SgsLinkControl` (both components EXIST). Currently proves ARRANGEMENT only.
3. **Build per-device border + shadow** (responsive wrappers + `@media` emitters) — assumed, not built.
4. **Content-tab organisation spec** — where behaviour-families + composite panels live (Task 2 owns the
   Style tab only).

## Remaining Track-1 tasks

- **Task 3 — hover-duplicate migration (parked, heavy).** Migrate the 85 hover-duplicates (universal
  `sgsHover*` panel + 22 blocks' private `*Hover` attrs) onto the shared `StateToggleControl`.
  **Bean's approved approach:** ONE block inline to set the canonical shape, then a **script-driven
  codemod** driven by the linter's known per-block `*Hover` attr list (NOT a blind regex — that broke
  live `textAlign` before), gated by build + `php -l` + `check-duplicate-controls.js` dropping to 0 +
  a live Playwright spot-check on 2–3 blocks. Design-gate the codemod shape with Bean first.
- **Task 6 — wire the 3 linters into prebuild (WARN-only).** `check-universal-fit.js`,
  `check-duplicate-controls.js`, `audit-block-file-consistency.py` → prebuild, exit 0 always. Now
  unblocked (build works). Do after Task 3 so baselines start clean.
- **Task 4 live editor-verify (deferred).** Deploy + confirm in the real editor that a form field's
  inspector no longer shows the Animation/Hover/etc panels. MUST use an **isolated worktree** deploy
  (the shared worktree has extensive Track 2 WIP; a shared-worktree deploy would ship it). See below.

## FIRST ACTION (smallest, <5 min — Rule 2)

Live-verify Task 4 via an isolated clean worktree (no Track 2 WIP), then screenshot a form field's
inspector:
```
git worktree add --detach C:/tmp/sgs-deploy f54ec34f   # or the latest Track-1 commit
# junction node_modules to avoid npm install:
#   New-Item -ItemType Junction -Path C:\tmp\sgs-deploy\plugins\sgs-blocks\node_modules `
#            -Target C:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\node_modules
cd C:/tmp/sgs-deploy && python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
# then Playwright: log in to sandybrown editor (.claude/secrets/sandybrown.env), insert a form,
# select a form-field, confirm NO Animation/Hover/BlockLink/ClickEffects/Parallax panels.
git worktree remove C:/tmp/sgs-deploy --force
```
(Coordinate with Track 2 before deploying the shared branch to the shared canary.)

## Shared-branch discipline (LOAD-BEARING)

- Branch `feat/brand-strip-inspector-rebuild`, shared with co-active Track 2. Track-1 HEAD this session
  ended at `f54ec34f`. NOT merged to main (deliberate).
- Path-scope EVERY commit (`git add -- <paths>`); re-check `git branch --show-current` in the SAME
  command; NEVER `git add -A`, NEVER `git checkout`/switch. Non-visual commits use
  `git commit --no-verify` + a `[batch-ok: <reason>]` line.
- Merge to main ONLY via an isolated `git worktree add /c/tmp/x main`. Do NOT delete the shared branch.
- Track 2's uncommitted files (nav-drawer/, shared/, cart, responsive-logo, brand-strip/style.css held
  behind the visual-diff gate, LEDGER/specs/reports) are NOT Track 1's — leave them alone.

## Follow-ups / notes

- **Build env fixed** — if `node`/`npm` ever break again, check for a rogue global `node` package on
  PATH (`Roaming\npm` before `nvm4w\nodejs`); `npm uninstall -g node`.
- **No D-numbers claimed** for Task 4's denylist retirement / the element-first lock (avoided editing the
  shared `decisions.md`). Assign them next session if wanted.
- **No block version bumps / no `deprecated.js`** (D270). No inline styling (Spec 32). Linters stay
  WARN-only until Spec close.

## Skills / Agents / MCP

| Skill | When |
|---|---|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/sgs-wp-engine`, `/wp-blocks`, `/sgs-db` | any SGS block work; DB is authoritative — never hardcode counts |
| `/brainstorming` + `/gap-analysis` + `/qc-council` | Task 3 codemod design + grading before lock |
| `/dispatching-parallel-agents` | Task 3 per-block rollout (disjoint blocks) |
| `/verify-loop` | MANDATORY per block edit (caught the textAlign regression) |
| `/delegate` | route each dispatch (Haiku mechanical / Sonnet design) |

| Agent | When |
|---|---|
| `wp-sgs-developer` | the hover migration, brand-strip control upgrade, per-device builds (Sonnet) |
| `design-reviewer` | visual + a11y QC of a migrated control |

| MCP | For |
|---|---|
| Playwright | live-verify a control renders in the editor + a11y checks |

Canary creds (always available): `.claude/secrets/sandybrown.env`. Deploy: the ONE path
`build-deploy.py --target sandybrown` (never hand-roll tar/scp). SSH alias `ssh hd`.
