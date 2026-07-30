Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this prompt, the LEDGER wins.
> ⚠ **REWRITTEN 2026-07-30 (D422).** The original prompt was for GSAP ScrollSmoother + the D407 header-sticky resolution + a template restructure. **All of that is CANCELLED** — smooth scrolling shipped via Lenis instead, which needs no wrapper and no template change. Do not resurrect it from git history.
> Co-active tracks share this worktree — path-scope every commit; `git branch --show-current` in the same command as each commit.
> **Start in PLAN MODE** — investigate, present the plan, get approval, then build.

# Motion Wave B — CLOSE THE WAVE: page transitions (FR-38-19)

## State recap (plain English — no assumed pretext)

Wave B had two halves. **Half one is DONE:** site-level smooth scrolling is shipped, live-verified
and owner-tuned — it uses **Lenis** (a small library that eases the browser's real scroll), NOT GSAP
ScrollSmoother. That swap happened because ScrollSmoother wraps page content in a moving box, and a
sticky header inside a transformed box silently stops sticking; Lenis needs no box at all. It sits
in a new doctrine tier — **Tier H (helper/utility)**, a closed list containing only Lenis.

**Half two is UNTOUCHED: page transitions (FR-38-19).** These are pure CSS — the cross-document
View Transitions API (`@view-transition`). No GSAP, no Lenis, no JavaScript router. A browser that
doesn't support it simply navigates normally, which IS the fallback.

## ⛔ READ THIS BEFORE PLANNING — what NOT to build

- **D407 / Spec 38 §4.2 is SUPERSEDED.** No wrapper-insertion output filter. No header relocation.
  No per-tier "outside if sticky on ANY tier" edge rule. No `findStickyBreakingAncestor()` tripwire
  extension — the shipped warn-only guard stays exactly as it is.
- **Spec 37 FR-37-40 is NOT to be modified.** It was re-verified under smoothing and passed,
  including the row-collapse leg (gap 0.01px).
- **Do not re-propose touch smoothing.** Built at Bean's request, tested by him on a real phone at
  the lightest setting, rejected as "abrupt and janky". Default OFF, labelled tested-and-rejected.

## First action (<5 min, zero deps)

```bash
git log -1 --stat && git status && git branch --show-current
grep -m1 "^status" .claude/specs/38-SGS-MOTION-SYSTEM.md   # MUST be: active
python .claude/hooks/handoff-preflight.py --check           # must pass before you commit later
```

## Mandatory READING — before any Write/Edit

1. `.claude/specs/38-SGS-MOTION-SYSTEM.md` **IN FULL** — especially §3.5 FR-38-19, the §9 and §10
   rows for page transitions, and §4.2's SUPERSEDED box so you know what not to build.
2. Root `CLAUDE.md` IN FULL.
3. `.claude/memory/session-2026-07-30-motion-waveB-commit1.md` — what shipped, why the library
   changed, and the errors made getting there.
4. `.claude/reports/2026-07-30-motion-waveB-commit1-live-verification.md` — the evidence bar this
   wave is held to, and the named gaps still owed.
5. `.claude/STOP-CATALOGUE.md` §A + the §C pre-flight ritual.

## The work

### Task 1 — Page transitions (FR-38-19)

**What:** cross-document View Transitions as a site setting, with a per-template style
(fade / slide / none), suppressed under reduced motion.
**Why:** closes Wave B — the last spec'd item in it.
**Estimated time:** 45m build, plus live verification.

**Orchestration:**
- Execution: **inline (main thread, Opus).** It is small, and it edits the same settings surface
  (`class-sgs-motion-settings.php` + `class-sgs-motion-registry.php`) that smooth scrolling owns —
  a parallel agent would collide there.
- Depends on: none. Parallel with: none (see collision note).
- `/qc-council` gate after: **yes** — it touches SGS-block PHP (project rule + blub.db 255).

**Build notes already settled — do not re-derive:**
- Settings live on the existing **SGS → Motion** page, in the same `sgs_motion_settings` option
  (add keys; do NOT create a second option or a second sanitiser).
- The dependent-control script `assets/admin/motion-settings.js` already greys out inapplicable
  controls and sets the `disabled` PROPERTY (not just opacity) — extend its `sync()` for new rows.
- Read-side defaulting belongs on `SGS_Motion_Registry::settings()`, NOT the admin class: the
  frontend must never depend on the settings class being loaded.
- Reduced motion: **suppress**. This one is CSS-side, so `@media (prefers-reduced-motion: reduce)`
  is the right mechanism (unlike the smoother, which needed a live JS check because it is a
  long-lived instance).

**Acceptance (measurable, not "code shipped"):**
1. Setting OFF → no `@view-transition` rule in the served HTML (grep it).
2. Setting ON → rule present, and a same-origin navigation visibly transitions in a supporting
   browser.
3. Unsupported browser / reduced motion → navigation still works, instantly.
4. Editor + wp-admin unaffected (§9 row) — assert with an **authenticated** fetch PLUS a positive
   control that the page really is an admin page. A zero from a logged-out fetch proves nothing.
5. Spec 38 §3.5 / §9 / §10 updated to match what shipped; a D-number recorded.

### Task 2 — The two owed qc-council sub-cases

**What:** (a) sticky + transparent on the SAME tier coexisting under smoothing (a proven-live past
regression class); (b) the nav-drawer `<dialog>`-in-header offset — its transformed-ancestor edge is
flagged untested in `header-behaviours.css:44-53`.
**Why:** both named in Spec 38 §8's Wave B regression gate; owed from commit 1.
**Estimated time:** 20m. **Execution:** inline, Playwright/devtools on the canary.
**Acceptance:** both observed with smoothing ON and OFF, recorded in the verification report.

### Task 3 — Long-distance anchor test

**What:** the canary homepage's only anchor target is the skip link (24px), so the header offset is
proven but a long smoothed anchor journey is not.
**Why:** FR-38-18(c). **Estimated time:** 10m. **Execution:** inline.
**Acceptance:** an anchor to a far target lands clear of the sticky header with smoothing ON.

## Dependency graph

```
Task 1 (inline, Opus) ──/qc-council──┐
Task 2 (inline)  ────────────────────┼──→ live verify + Bean's eye ──→ path-scoped commit ──→ WAVE B CLOSED
Task 3 (inline)  ────────────────────┘
```
Tasks 2 and 3 are independent of Task 1 and of each other — run them while Task 1's QC is out.

## Methodology guardrails (do not skip)

- **Deploy before measure.** Anything that should be visible on a URL needs build + deploy + OPcache
  reset FIRST, or the test measures stale output. The shared tree carries a co-active track's
  uncommitted work — deploy from an **isolated worktree pinned to your commit**, never
  `--allow-dirty`.
- **A gate that cannot see your file cannot fail on it.** After adding a file a gate should cover,
  run the gate and confirm the file appears BY NAME in its output.
- **An absence-check needs a positive control.** Prove you were looking in the right place before
  trusting a zero.
- **A grep count is not a measurement.** Block markup emits an opening AND a closing comment per
  block; a self-closing empty block emits one.
- **Verify library option names against the INSTALLED version's types/source.** An option that does
  not exist is discarded in silence and reads as an enforced guarantee.
- **Outcome vs completion** — Wave B closes when FR-38-19 is live-verified, not when it compiles.
  Map any deferral to a named spec STAGE (STOP-29), never "out of scope".
- `python .claude/hooks/handoff-preflight.py --check` must pass before the handoff completes.

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/brainstorming` | Design the per-template transition surface before building |
| `/strategic-plan` | If the work widens beyond the settings surface |
| `/research` | Only if View Transitions support is unclear — verify, don't assume |
| `/gap-analysis` | Grade the result before calling the wave closed |
| `/lifecycle` | If any skill/agent changes fall out of this |
| `/qc-council` | Before the commit (SGS-block PHP) |
| `/sgs-wp-engine` | Theme/template work |
| `/handoff` | Session close |

| Tool / agent | When |
|---|---|
| Playwright or chrome-devtools MCP | Live DOM + transition observation on the canary — use an isolated browser context, another track may hold one |
| `wp-sgs-developer` agent | If the build widens beyond the settings surface |
| `code-reviewer` agent | Before any shared-theme commit |
| `/sgs-db` · `/wp-blocks` | Block ground truth — never a prose count |

## Tool bindings

| Operation | Command |
|---|---|
| Build | `cd plugins/sgs-blocks && npm run build` (run Node/npm via **PowerShell** — the nvm shim is broken in Git Bash) |
| Lint JS | `npx wp-scripts lint-js <paths> --fix` |
| Lint PHP | `phpcs --standard=WordPress <file>` · `php -l <file>` |
| Isolated deploy (shared dirty tree) | `git worktree add -q /c/tmp/<name> <commit>` → `cp -r plugins/sgs-blocks/build /c/tmp/<name>/plugins/sgs-blocks/` → `cd /c/tmp/<name> && python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build` → `git worktree remove --force /c/tmp/<name>` |
| Motion budget gate | `python plugins/sgs-blocks/scripts/check-motion-bundle-budget.py --check` (and `--update-baseline` when a new module is deliberate) |
| Doc-hygiene gate | `python .claude/hooks/handoff-preflight.py --check` |
| Toggle the site setting on the canary | `ssh hd` → `wp option update sgs_motion_settings '{...}' --format=json` |
| Read the module's live settings blob | grep the served HTML for `wp-script-module-data-@sgs/smooth-scroll` |
| Block ground truth | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` · `python ~/.claude/hooks/wp-blocks.py dump` |
| Canary credentials | `.claude/secrets/sandybrown.env` (gitignored). **Parse it in Python, not `source`** — the password contains shell metacharacters and broke a verification run this way. |

## Guardrails

Path-scoped commits. No hand-rolled tar/scp (D336). No CDN. No `deprecated.js` (D270). UK English.
`/handoff` at close.
