# Motion track — deploy what is built, then build the timeline connector (2026-08-29)

**Invoke `/autopilot` before anything else.**

## Where you are

The cursor grid-dot field (FR-38-33) is built, live and working. Bean has seen it. He then found
two faults in it, both now fixed but **not yet deployed**. Nothing here is blocked on a decision —
every design gate is closed.

The timeline connector is the one genuinely new build, and it is smaller than the old plan claimed.

**Read first, in this order:**
1. `.claude/LEDGER.md` — the motion block. Confirm nothing below has moved.
2. `.claude/decisions.md` **D864–D870** — yesterday's session, single-sourced.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` — **in full** before touching any motion surface.

**Verify in the same command as any commit:**
```bash
git branch --show-current
grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1
```

⛔ **Re-run that grep immediately before writing a decision, never once at session start.** The
ceiling moved five times inside one session yesterday.

---

## Task 1 — Deploy three commits, then verify each live

**Why:** all three fix faults Bean reported by eye. None is on the canary, which still runs
`4494e6e1d`.

| Commit | Fixes |
|---|---|
| `03b96af22` | Dot colour: accent measured **1.35:1** on cream. Default is now `primary` (~7:1), plus a per-instance override. |
| `9f1df2c3e` | The motion-budget notice rendered at **half** the sidebar width. |
| `f46436954` | Grid-dots had **no controls at all**. Adds six, plus a static lattice preview in the editor canvas. |

**Deploy:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`

The Composer autoloader trap is now handled in-script (D849 + `62809c801`): it dumps `--no-dev`
before packaging, refuses to package if that fails, and restores dev-included afterwards. **No
manual composer dance.** ⛔ Never hand-roll tar/scp; never reach for `--allow-dirty`.

**Then verify all four, on the canary — measurement alone never closes a visual claim (R-31-13):**

1. **Dots are visible.** Page **3038**. They must read against the cream background, not vanish
   into it. This is the fault Bean reported; a contrast number is not the test, his eye is.
2. **Six controls appear.** Editor, page 3038, `sgs/container` → Styles tab → "Scroll & effects".
   Expect: Dot colour, Spacing, Dot size, Reach, Lean, Settle.
3. **The budget notice spans the full sidebar width.**
4. **The static lattice shows in the editor canvas** — resting dots at the chosen spacing and size.
   It deliberately does not animate there.

⚠ **Log into the editor and look.** Yesterday every frontend signal was green while the editor
showed a half-width notice above an empty panel. Credentials are in
`.claude/secrets/sandybrown.env` and are always available — never ask for them, never work around
them. Drive it with Playwright: `wp-login.php`, then `post.php?post=3038&action=edit`.

⛔ **Take a screenshot before concluding anything is absent.** Three times yesterday a narrow
selector returned nothing and got reported as "the thing does not exist". Once it was a whole
inspector panel that was plainly there in Bean's screenshot.

---

## Task 2 — Build the timeline connector

**What:** per-entry progressive fill on scroll, then themed connector styles — pulse, vine, tree,
falling bricks. MIC (Muslims in Construction) asked for these for their journey page.

⛔ **The sketch's structural premises are STALE. Both were checked against source and both are
wrong.** The real sketch is `P-TIMELINE-ADVANCED-VISUAL-EFFECTS` at
`.claude/memory/archived-2026-07-28-parking-pre-normalise.md:1229-1264`. (An older prompt cited
FR-38-26 twice — that is looping carousels, not this.)

| The sketch assumes | Source says |
|---|---|
| a `.sgs-timeline__connector` element | **No such class exists.** The connector is one root-level `::before` on `.sgs-timeline--vertical` (`style.scss:55-65`) and `--horizontal` (`:229-237`). |
| replacing per-segment `<svg>` | **There is no per-segment DOM.** Entries are flat `<li class="sgs-timeline__entry">` (`render.php:373-432`). |

**Two findings that make this easier than the old estimate:**

- **The root `::after` is free** — zero occurrences of "after" in `timeline/style.scss`. So the base
  fill needs **no new markup**: paint a fill layer over the existing `::before` track and drive it
  from one custom property.
- **`view.js` already observes each entry**, but one-shot (`obs.unobserve` after firing, threshold
  0.15) and only for an opacity reveal. Continuous scroll tracking is genuinely new.

**But it is a feature, not a CSS tweak.** It needs two new attributes plus inspector controls,
because a client-facing setting is not done until the client can reach it — which is exactly the
fault Bean found in grid-dots. Budget ~45–60 min for the base, not the ~20 the old plan claimed.

**Stage A — base fill (inline).** New attributes `connectorProgressFill` (boolean) and
`connectorFillColour`; inspector controls for both; a root `::after` fill layer; rAF scroll tracking
writing `--sgs-timeline-fill-progress`. Reuse `prefersReducedMotion()` from
`shared/effects/motion-utils.js:19-25` — it re-checks live, unlike `view.js:23-25`'s module-load
cache.

⛔ **Settle where the per-entry markup lives BEFORE Stage B fans out**, or four agents will invent
four different structures that all pass every gate.

**Stage B — four styles (parallel).** Independent once the base exists. Dispatch one agent per style
via `/dispatching-parallel-agents`.

**Acceptance:** fill tracks scroll at 375/768/1440; reduced motion falls back to a plain line;
decorative SVG carries `aria-hidden`; the controls work in the editor.

---

## Task 3 — Two gate-design gaps, both found yesterday, neither owned

Report them; fix only if the owner agrees.

1. **`inspector-scan` rule 21 misses the whole `fx` family.** Its `SYSTEM_ATTR_RE` already excludes
   extension-injected attributes by design — its own comment says the rule "structurally CANNOT
   see `src/blocks/extensions/`" — but it matches on the NAME SHAPE `^sgs[A-Z_]`. So declaring any
   extension-owned attr fails gate B while leaving it undeclared fails gate A, and neither state
   satisfies both. Yesterday's workaround was a baseline entry (see D870). **The real fix keys the
   exclusion on extension OWNERSHIP, not on a name prefix.**
2. **`check-render-undefined-vars` passes only with the dev autoloader.** A fresh clone that has
   never run `composer install` gets `exit 1` with "0 findings", which reads as a real failure
   rather than a missing dependency.

---

## Guardrails

**Carried forward. Never subtract from this list (D101) — only add.**

- **`git commit -- <path>` DISCARDS a partial stage.** The pathspec commits the WORKING TREE state
  of those paths and ignores the index entirely. Yesterday this swept another track's unfinished
  work into a commit whose message said it had not. **After `git apply --cached`, use a BARE
  `git commit`.** Check `git diff --cached --name-only` first — the index is shared, and it has
  twice held another session's staged files. (D870)
- **`main` is shared by five tracks.** Commit by exact path or a verified index. Never `git add -A`,
  never a glob pathspec.
- ⛔ **Never run `git checkout -- .`, `git restore .`, `git stash` or `git clean` in the shared
  tree.** A `git stash -u` for "temporary isolation" took every session's uncommitted work
  yesterday, including three untracked files. It was recoverable only because someone found the
  stash.
- **Verify the EDITOR, not just the frontend.** Both of yesterday's client-facing faults were
  invisible to every frontend check and every gate.
- **An absence verdict is only as wide as its search.** Three false absences yesterday: a probe
  page's own slug faking a match, a minifier dropping the leading zero from `0.42`, and a panel
  found by neither of two guessed class selectors. Screenshot before concluding.
- **A brand accent is a GROUND, never an indicator.** Accents are chosen to sit behind content, so
  they are mid-luminance and fail on light and dark alike. This shipped at 1.35:1 — worse than the
  1.44:1 incident quoted in the same file as the reason for care.
- **A green measurement is not fidelity.** The grid-dot field passed four gates, eleven registration
  points and a clean build while painting **zero dots**.
- **Registration is ELEVEN points, not ten.** D784 counts ten; `extension-attributes.generated.php`
  has its own pre-commit gate and is the eleventh.
- **Announce before `/sgs-update` or any shared-DB write.** Announcing yesterday revealed the change
  was already blocking two other sessions' gates.
- **Never restore a trashed fixture** (2023, 2114 carry pre-migration authoring). Author fresh.
- **Deploy before you measure.** A test against undeployed code measures stale output.
- **Visual-diff report before any commit touching a block** (STOP-67). If the capture genuinely
  needs the deploy first, use the SCOPED `SGS_VISUAL_GATE_SKIP` with a reason — never
  `--no-verify`, which disables six unrelated working gates — and write the report next commit.

- ⛔ **Deploy from an ISOLATED `git worktree`, not the shared tree** (junction `node_modules` and
  `vendor` from main). Task 1 is a deploy, so this binds today. On 2026-08-27 the dirty-tree gate
  correctly refused a deploy because another track's uncommitted `fx-wave-gradient` work sat in the
  same files — `--allow-dirty` would have pushed their unfinished code live. A clean worktree at the
  committed HEAD carries your work and none of theirs. **`--allow-dirty` is not the way past that
  gate; a worktree is.** (Restored 2026-08-27 — dropped in a prompt rewrite while Task 1 was a
  deploy.)
- ⛔ **The ownership gate refusing your deploy is it WORKING.** If it says the live target carries a
  commit that is not an ancestor of your HEAD, merge that work and rebuild. **Never `--takeover`** —
  that discards whatever is live and not in your checkout.
- ⛔ **Re-run the D-ceiling grep IMMEDIATELY before writing a decision, never once at session
  start.** It moved FOUR times inside one session on 2026-08-27 (835 → 838 → 845 → 852 → 862), and
  D-numbers already written into code comments had to be renumbered mid-flight.
- ⛔ **`wp_update_post()` strips backslashes — pass `wp_slash()`.** Writing `post_content` back
  without it turned a stored em dash into literal `u2014` on a live page. Every automated signal
  stayed green: valid content, blocks parsed, HTTP 200. Back up BEFORE the write, and read the
  RENDERED result, not the exit code.

## Live canary facts

- Canary: `sandybrown-nightingale-600381.hostingersite.com`, currently on `4494e6e1d`.
- Probe pages, both titled `[GATE — DO NOT DELETE]`: **2900** (decorative-image surface treatment,
  two instances, the second exercising the default-preset fallback) and **3038** (grid-dot field
  plus a no-fx negative-control container).
- ⛔ Editing template part **2671 does nothing** — `parts/header.html` is a one-line `wp:pattern`
  reference; the rendered header comes from `patterns/framework-header-default.php`. When a change
  stores correctly and still does not render, stop verifying the change and start verifying what
  renders.

## Still parked, deliberately

- `P-PARTICLE-TRAIL-VARIATIONS` — sparkler and continuous-connected trail. **Post-launch**, Bean's
  own timing. Do not start.
- **Treatment + art-direction tiers samples the desktop image at every width.** Named limitation,
  recorded in `decorative-image/render.php`. The fix belongs in the shared JS module every
  treatment-qualifying block uses — a design-gate change, not a side effect of one block's fix.
