Invoke /autopilot before doing anything else. This is **Track 1 — Spec 35 block-inspector-UX, the cleanup + rollout phase** (continues from the registry + archetype design work).

## State recap (plain English)

Spec 35 makes every SGS block's editor sidebar complete + consistent so a non-coder client can
self-serve. Last session produced, reviewed, and locked the two foundations:
1. **The optimal-control registry** — `plugins/sgs-blocks/scripts/consistency/setting-registry.json`:
   all 82 genuine settings (60 CSS-property + 11 input-type + 11 behaviour-family), each mapped to its
   optimal editor control. Drafted → Bean-reviewed (6 flagged rows ruled) → `/qc-council`-validated
   (24 corrections applied). The design spine + Bean's rulings: `.claude/plans/spec-35-setting-registry-design.md`.
2. **The archetype design deck (v2)** — the optimal UI *drawn* for every setting, three-agent
   gap-reviewed (build-feasibility / UX-a11y / coverage) and Bean-redlined. Two artifacts (private):
   the catalog `https://claude.ai/code/artifact/f9646fa6-44cc-49dc-a4b2-aedca6f9502f` and the archetype
   deck `https://claude.ai/code/artifact/a35048a9-1c06-4e41-b03f-4c5b48ce0090`. The v2 detail (colour
   split, border builder, on-canvas toolbar, control-states, Focus=Hover, etc.) is NOT yet folded into
   the registry — that is Task 1.
3. **A 3-linter cleanup suite** — `check-universal-fit.js` (universals bolted onto blocks that don't
   fit), `check-duplicate-controls.js` (two knobs for one setting; found 85 hover-duplicates), and
   `audit-block-file-consistency.py` (cross-file attr alignment). All WARN-only. ~40 genuinely-dead
   attrs were cleaned from 13 blocks. **A live-code regression was caught + reverted** (a Haiku agent
   deleted live `textAlign` reads because the linter falsely flagged WP-support-provided attrs as
   "undeclared") — the linter has since been fixed (support-aware + pattern-aware). Bean confirmed the
   3 utility universals (custom-css, conditional-visibility, responsive-visibility) are universal by
   design; only `animation` is a real opt-out gap.

**Bean approved doing tasks 1–6 below this session.**

## Branch + state (verify first)

- **Branch:** `feat/brand-strip-inspector-rebuild` (SHARED with co-active Track 2 — header/footer/nav).
  HEAD `d45df607`. All Spec 35 work committed + pushed (8 commits `45c90dc6`→`d45df607`).
- **D-ceiling:** D348 (verify: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`).
- **NOT merged to main** — deliberate: shared branch + co-active Track 2. Merge ONLY via an isolated
  `git worktree add /c/tmp/<x> main` when both tracks reach a checkpoint; NEVER delete the shared branch.
- Uncommitted files (LEDGER.md, next-session-prompt.md, specs/34, lucide-icons.php, brand-strip/style.css,
  reports/*) are **Track 2's / pre-existing carry-over — NOT Track 1's. Do not commit them.**

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/autopilot` | FIRST — live skill routing + ADHD support for the whole session |
| `/brainstorming` | ALWAYS — Task 2 (compound control-sets) + Task 3 (hover migration) are design calls |
| `/gap-analysis` | ALWAYS — grade the compound-control-set design before locking |
| `/lifecycle` | ALWAYS — before any skill/agent/linter change |
| `/research` | ALWAYS — auto-routes ("best WP pattern for X") |
| `/strategic-plan` | ALWAYS — order the rollout |
| `/dispatching-parallel-agents` | Task 3 hover-migration + Task 5 cta-section (disjoint blocks) |
| `/subagent-driven-development` | Task 3 if per-block review loops are wanted |
| `/verify-loop` | MANDATORY on every block edit — proved its worth (caught the textAlign regression) |
| `/delegate` | route every dispatch (Haiku mechanical / Sonnet design) |
| `/qc-council` | multi-rater before locking the compound-control-set design + before shared-surface commits |
| `/sgs-db`, `/wp-blocks` | DB is authoritative — never hardcode counts |
| `/sgs-wp-engine` | any SGS block/component work |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright | live-verify a migrated hover/StateToggle control renders + the 44px/contrast a11y checks |
| `/sgs-db` (sgs-db.py) | query `block_attributes` / `block_supports` — the registry + linter source |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | the hover-migration, cta-section redo, animation opt-out builds (Sonnet) |
| `design-reviewer` | visual + a11y QC of any migrated control (StateToggleControl, etc.) |

---

## Task 1 — Fold the archetype v2 corrections into the registry

**What:** update `setting-registry.json` (+ the design spine) so the data matches the Bean-approved v2 UI.
**Why:** the registry is the golden master the future lint enforces; it currently lags the v2 deck.
**Estimated time:** ~30 min.
**Orchestration:** inline (Opus) — it's editing the JSON + doc to match decisions already made. Context:
the v2 changes are colour split (text/border solid vs background Solid|Gradient via ColorGradientControl),
the compound **Border builder**, per-stop gradient colour + angle, shadow 6-presets + Normal/Hover,
media bulk + alt/decorative, repeater split (sidebar vs InnerBlocks), Focus=Hover, the on-canvas
Block-Toolbar + control-states structural patterns, the 8th composite (per-field conditional). Depends on: none.
/qc gate after: `/qc-inline`. **Acceptance:** every v2 change is reflected in the matching registry row(s);
`python scripts/consistency/reclassify.py` still reproduces cleanly.

## Task 2 — Design the compound per-category control-sets (Bean's grouping vision)

**What:** the Border builder generalised — for each recurring CATEGORY (typography, spacing, colour,
border, effects), define the one interwoven control-SET, check which blocks are missing a control that
*should* be in the set, and specify the canonical set so a category is a matching whole, not a random list.
**Why:** Bean's core ask — categories become consistent interwoven sets, not per-block ad-hoc lists.
**Estimated time:** ~1–1.5h design.
**Orchestration:** inline design (`/brainstorming`) + Bean's input; grade with `/gap-analysis` + `/qc-council`
before locking. Use the registry (settings→category) + `check-duplicate-controls.js` output (what diverges).
Depends on: Task 1. /qc gate after: `/qc-council`. **Acceptance:** a per-category control-set spec Bean signs off,
each set naming its member controls + which blocks need a control added to conform.

## Task 3 — Migrate the 85 hover-duplicates to one StateToggleControl

**What:** the two parallel hover systems (universal `sgsHover*` panel + 22 blocks' private `*Hover` attrs)
converge on the shared `StateToggleControl` (Normal/Hover, Focus mirrors Hover); retire the private duplicates.
**Why:** clients currently see two "hover" knobs (or a private attr with no control) on many blocks.
**Estimated time:** design ~1h + per-block rollout (parallel).
**Orchestration:** `/brainstorming` the migration shape first (shared-surface → `/qc-council` + Bean design-gate),
then `/dispatching-parallel-agents` (Sonnet, disjoint blocks) with `/verify-loop` each. Re-run
`check-duplicate-controls.js` to confirm 0 hover-dupes after. Depends on: Task 1. Parallel with: Task 4.
/qc gate after: `/qc-council` + design-reviewer live. **Acceptance:** `check-duplicate-controls.js` hover-duplicate
count = 0; the migrated control renders live (Playwright) with Focus mirroring Hover; Bean's eye.

## Task 4 — Give `animation` a hideExtensions opt-out

**What:** add a `hideExtensions:["animation"]` opt-out path to `src/blocks/extensions/animation.js` (it's the
one styling universal with no opt-out) + opt the 14 form-field/utility blocks out of animation/hover/parallax
/blockLink/clickEffects where inappropriate (per `check-universal-fit.js` inappropriate-fit list).
**Why:** form fields carry styling controls they can't shed — clutter with no purpose.
**Estimated time:** ~45 min.
**Orchestration:** delegated (Sonnet, `wp-sgs-developer`). Shared-surface (the extension) → design-gate the
opt-out mechanism first. Then per-block `hideExtensions` is mechanical. Depends on: none. Parallel with: Task 3.
/qc gate after: re-run `check-universal-fit.js` (inappropriate-fit drops). **Acceptance:** the 4th no-opt-out
gap closes; form-field blocks no longer carry the styling universals; live-verify a form field's inspector.

## Task 5 — Redo cta-section's attr cleanup properly + tabs blockLabel

**What:** cta-section was fully reverted last session (its button/textAlign* orphans re-appeared). Re-verify
each with the NOW-FIXED linter (support-aware + pattern-aware) and remove the genuinely-dead ones; also
resolve tabs' `blockLabel` (undeclared read).
**Why:** finish the cleanup that was reverted for safety; the linter is now trustworthy.
**Estimated time:** ~30 min.
**Orchestration:** delegated (Haiku) with `/verify-loop` — but the linter is fixed now, so its findings are
reliable; still grep-verify each (incl. patterns) before removing. Depends on: none. /qc gate after: re-run
`audit-block-file-consistency.py` (cta-section + tabs clear). **Acceptance:** cta-section + tabs show 0
cross-file findings; no live read/pattern broken (php -l + pattern-attr gate pass).

## Task 6 — Wire the trustworthy linters into prebuild (WARN-only)

**What:** add `check-universal-fit.js`, `check-duplicate-controls.js`, `audit-block-file-consistency.py` to the
prebuild step as WARN-only (exit 0), so new debt is surfaced automatically.
**Why:** the auto-pickup — new dead/duplicate/mis-fit controls caught forever, per "Bean as QC only".
**Estimated time:** ~20 min.
**Orchestration:** inline. WARN-only (never block Track 2's build). Depends on: Tasks 3–5 (so the baselines
start from a cleaned state). /qc gate after: run `npm run build`, confirm the linters run + exit 0.
**Acceptance:** prebuild runs all three; they report but never fail the build.

## Dependency graph
```
Task 1 (inline, Opus)
  └► Task 2 (inline design + Bean) ──► (feeds the compound-set spec)
  └► Task 3 (design-gate → parallel Sonnet + verify-loop) ┐
Task 4 (Sonnet, shared-surface design-gate) ──────────────┤ parallel
Task 5 (Haiku + verify-loop) ─────────────────────────────┘
                                     └► Task 6 (inline, WARN-only prebuild wiring — after 3/4/5)
```

## Methodology guardrails (do not skip)

- **SHARED BRANCH `feat/brand-strip-inspector-rebuild` + Track 2 co-active (LOAD-BEARING).** Path-scope EVERY
  commit with an explicit `-- <paths>` pathspec; re-check `git branch --show-current` IN THE SAME command as
  the commit; NEVER `git add -A`, NEVER `git checkout`/branch-switch here. Merge to main ONLY via an isolated
  `git worktree add /c/tmp/<x> main` (real merge). Do NOT delete the shared branch. Do NOT wholesale-rewrite
  `LEDGER.md`/`next-session-prompt.md`/`decisions.md` — Track 2 edits them too (this prompt is a Track-1-scoped
  file for exactly that reason).
- **Windows commits:** commit via PowerShell if Bash has a stale view of Write-tool files; do NOT pipe
  `git commit` through `Select-Object -First` / `Select-String -First` (silently aborts — use `-Last`). The
  `@'...'@` here-string's closing `'@` MUST be at column 0.
- **VERIFY SUPPORT-PROVIDED ATTRS BEFORE DELETING (new, hard-won).** WP injects top-level attrs from block
  supports — `textAlign` from `supports.typography.textAlign`, `align`/`anchor`/`className`, `style` from
  color/spacing/border/typography. A render read of one is NOT dead even if block.json doesn't list it. The
  cross-file linter is now support-aware, but ALWAYS confirm a block's `supports` before removing any attr a
  render.php reads. A Haiku swarm broke live text-align on 4 blocks by trusting the pre-fix linter.
- **Verify live + verify the wiring, not the emit** — a control isn't done until the LIVE computed value is
  correct (D302 strips functional colours; object/enum attrs coerce silently — D291/D328). READ THE SOURCE to
  confirm a gate/support is actually wired.
- **Fact-check subagent output** (invented paths/dates/counts, AND "it's dead" claims) against ground truth
  before acting — grep patterns + converter + supports, not just the block's own files.
- **Deploy before measure** — visible-on-URL changes need build + `build-deploy.py --target sandybrown` +
  OPcache reset BEFORE any browser/pixel test. Stash uncommitted deployed-runtime files first.
- **THE GATE IS BEAN'S EYE (R-31-13)** — never close a visual/UX task on a number alone; screenshot 375/768/1440.
- **No block version bumps / no `deprecated.js`** (D270). No inline styling (Spec 32 — scoped `<style>`).
  Complete code only, no stubs.
- **DB is authoritative** — query `/sgs-db`/`/wp-blocks`; never hardcode counts. Re-run `/sgs-update` if the DB may be stale.
- **Linters/audits stay WARN-only** until Spec close — never block the co-active Track 2 build
  (`a11y-validation-informational-not-gate`).
- **Non-visual commits** (block.json metadata, PHP logic, scripts) that trip the visual-diff gate use
  `git commit --no-verify` with a `[batch-ok: <reason>]` line — the gate itself directs this. Genuinely-visual
  changes need a `reports/visual-diff/<block>-<date>.md` with `verdict: PASS`.
- **STOP-29 / definition-of-done** — Spec 35 is a spec'd subsystem: done = the spec's FULL scope; map every
  deferral to a named spec stage, never "out of scope".
- **Dedup safety** — any new setting/category grouping: default to MATCHING; justify any "unique"; identity =
  the property/input-type/behaviour, NOT the name.

## Uncommitted carry-over (leave alone — not Track 1's)
- `plugins/sgs-blocks/src/blocks/brand-strip/style.css` — a reduced-motion CSS fix HELD behind the visual-diff
  gate (needs deploy + `reports/visual-diff/brand-strip-<date>.md` verdict:PASS). Land it with a UNIT-D-style deploy.
- LEDGER.md / next-session-prompt.md / specs/34 / lucide-icons.php / reports/* — Track 2's live edits.
