# Next session — the hover decision, and the gate residue

**Invoke `/autopilot` before anything else.**

This session finishes one planned item and five loose ends left open on 2026-08-25. None
of it is exploratory. Every task below names its file, its done-when, and its hazard.

⚠ **This session is NOT the FR-38-31 gradient work.** That has its own prompt:
`.claude/prompts/2026-08-27-fr3831-hygiene-and-the-look.md`. (The Stripe hero POC is DONE — its
prompt was retired 2026-08-26.)

---

## 1. Read first, in this order

1. `.claude/LEDGER.md` — establish which track you are. **Four tracks share `main`.**
2. `.claude/decisions.md` — D784 and D785.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` §3.3 FR-38-32 — **in full.** Issues surface in
   sections you did not plan to touch, and the whole spec in context is what lets you
   diagnose them.

**Check in the same command as any commit:**
`git branch --show-current` (expect `main`) and
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
⚠ The D-ceiling moves constantly. It moved three times on 2026-08-25. Run the command.

⛔ **The worktree is shared and other tracks commit into it constantly.** Commit by exact
path. Never `git add -A`. Expect `build/` to vanish. A red gate is not necessarily yours —
prove it before acting on it.

**Canary fixtures — do not delete:** 2103 · 2109 · 2113 · 2603 (gate-wired) · 2721 · 2736 ·
2737 · 2740 · 2741 · 2742 · 2744.

---

## 2. TASK A — the hover decision (the only one needing Bean)

⛔ **START HERE, and re-measure before you read any number.**

Three of eleven blocks ship the universal hover panel: `google-reviews`, `pricing-table`,
`whatsapp-cta`. Eight remain: `card-grid`, `info-box`, `cta-section`, `team-member`,
`post-grid`, `process-steps`, `icon`, `gallery`.

⚠ **Every figure previously recorded for these eight is STALE.** LEDGER item 4 says "33
genuine duplicate-control findings + 24 dead-attr ones". The gate that produced those
numbers was wrong in both directions and was fixed on 2026-08-25 (D785). A later hand-audit
put it nearer 13 duplicates and 10 dead, and that too predates the final rewrite.

**Do this first.** For each of the eight, add `"hover"` to `supports.sgs.enabledExtensions`
in `block.json`, run `node scripts/check-duplicate-controls.js --json`, record the findings,
then revert. Three severities matter:

- `controlled` — the block has its own working control AND the panel adds a second. A real
  duplicate. The client sees two knobs for one effect.
- `shadow` — the attribute is declared and rendered but nothing exposes it. Stuck at its
  default forever. The panel is the **fix**, not a conflict.
- `scoped` / `scoped-shadow` — the block's control targets a sub-element. Probably not a
  duplicate. Check before treating it as one.

Then put the real numbers to Bean, per block, and let him choose.

⛔ **Removing any block-owned attribute is a D338 hazard.** WordPress deletes an undeclared
attribute on the next editor save, so a rename or removal destroys stored client settings.
That half needs its own migration pass, never a tail-end edit.

**Done when:** Bean has the corrected per-block numbers and has ruled on each block.

---

## 3. TASK B — gate the three ungated registration points

An fx effect must register in ten places. Five are gated by `check-fx-list-drift.py`, two by
the build's own generators, and **three by nothing at all**:

| where | file:line |
|---|---|
| script-module map | `includes/class-sgs-motion-registry.php:296` |
| per-effect CSS map | `includes/class-sgs-motion-registry.php:405` |
| webpack entry | `webpack.config.js:245` |

Verified: `grep -c motion-registry scripts/check-fx-list-drift.py` returns **0**.

Miss one and the effect registers, the panel appears, the client configures it, and nothing
happens on the page. That is the shape that left morph broken for months (D452).

**Build the gate.** Assert that every effect in `SHIPPED_EFFECTS` carrying a boot module has
an entry in all three. Follow `scripts/check-container-child-lift.py` for the house shape:
a `--check` mode and a `--self-test` that plants a defect and watches it caught.

⛔ **Watch it fail before you trust it.** A gate you have not seen go red is not a gate.

**Done when:** the gate catches a deliberately removed entry in each of the three, its
`--self-test` passes, and `gates.json` registers it at tier `fast`.
⚠ Edit `gates.json` by hand in the file's own style — 2-space indent, `added_D` a **string**.
A `json.dump` reformat turned a 9-line addition into a 1,315-line diff on 2026-08-25.

---

## 4. TASK C — four residual findings in `check-duplicate-controls.js`

An adversarial council raised these on 2026-08-25. They remain open.

1. **`scoped` means two different things.** CHECK 1 computes it from a sub-element test;
   CHECK 3 hardcodes it at `:1208`. Anyone filtering on severity mixes two unrelated claims.
   Either namespace the severities per check, or move CHECK 3 into an informational stream.
2. **CHECK 3's `keeper` is unvalidated free text** (`:1209`) — `child ${childSlug}'s own
   typography/colour controls`. Nothing confirms that child block exists. CHECK 1's keeper is
   existence-checked; this one is not. At minimum, resolve the slug to a real block directory.
3. **CHECK 2 lacks the dispatcher handling CHECK 1 received.** `resolveDynamicWrites` skips
   computed keys, so two dispatcher-driven controls writing the same attribute stay invisible.
   The two checks now disagree about what a control is.
4. **Fail-open paths.** A malformed `block.json` skips a block entirely (`:1303`) and the
   report calls it "not a failure". Babel runs with `errorRecovery: true` (`:459`, `:571`,
   `:1059`), so a broken `edit.js` degrades silently rather than surfacing. Decide per case
   whether silence is right, and say so in the docblock where it is.

**Done when:** each is fixed or explicitly ruled out in the docblock with a reason.

---

## 5. TASK D — measure the particle engine's cap and loop-stop

FR-38-32 ships and is verified on both surfaces. Two claims remain unmeasured, and the
first probe that tried was unreliable, so treat them as unproven.

- **Cap binds.** Sweep the pointer fast across canary **2744** and assert live particles
  never exceed 150.
- **Loop stops.** After the pointer rests, `requestAnimationFrame` calls must stop rising.

⚠ **Instrument the module, not the page.** A global rAF counter catches every other effect
on the page and proves nothing.
⚠ **Sample during the sweep, not after.** Sampling once afterwards read 0 lit pixels and
nearly filed working code as dead; sampling during read 2,417.

**Done when:** both are measured live with a negative control, and Spec 38 §3.3 records the
numbers.

---

## 6. TASK E — design-gate the container layer model

`sgs/container`'s child-lift rules now sit at zero specificity, so any decorative layer that
declares its own `position` wins automatically. That closed the recurring trap.

Bean then proposed a better model: **pair a content attribute with its overlay sibling, and
let the overlay always sit above.** The pairing already exists in the data —
`backgroundImage` ↔ `backgroundOverlayColour`, `mediaBackground` ↔ `mediaOverlayColour`,
consistent across eight-plus blocks. Nothing reads it.

Two findings shape the gate:

- **Declare the pairing; never infer it from the substring "overlay".** `sgs/modal` has
  `closeOnOverlay`, a boolean about click behaviour. A substring rule would stack it.
- **The cloning argument for it is REFUTED.** `computed-parity.js` already blocklists
  `position`/`z-index` by design, and `pseudo_overlay.py` already extracts overlays through a
  DB attribute-existence check. A pairing edge is consumed by nothing today. Do not justify
  this work on clone fidelity.

Pairing covers overlays over media — three or four of the nine former exclusions. The
generative layers (particle canvas, wave gradient, fx path and shape visuals) have no content
attribute to pair with and need a declared role instead.

⛔ **Rule 7: design-gate this before building.** It touches the render path of every block
with an overlay.

**Done when:** Bean has a written design and has approved or rejected it. No code.

---

## 7. Method — earned on 2026-08-25, not theory

- **A no-evidence result is a broken probe until proven otherwise.** Three times in one
  session, evidence that looked like a product defect was a faulty instrument: a canvas
  reading 0 lit pixels, an inspector panel "missing" because the selector only matched
  `PanelBody`, and a menu query that returned the WordPress admin bar.
- **Ask the browser; never reason about specificity.** Enumerating which rules actually
  matched an element solved in one step what two rounds of reasoning got wrong.
- **Look at the diff, not the hash.** A subagent appeared to have clobbered a shared file.
  The diff showed another track's work landing concurrently.
- **Verify a subagent's facts, not just its structure.** Two council raters each returned one
  confidently wrong headline finding. Both were refuted by reading the code.
- **A gate can be inert and still green.** A drift guard shipped with a literal backspace in
  its regex, matched nothing, and passed for hours because it failed open.
- **Enumerate; never estimate.** Every figure reasoned to was wrong; every figure derived by
  listing the items was right.

---

## 8. Tooling

| use | for |
|---|---|
| `/delegate` | every dispatch — route before spawning |
| `/dispatching-parallel-agents` | ⚠ agents must not edit one file concurrently. Have them return patches; integrate serially |
| `/qc-council` | validating a fix-shape before building it |
| `/adversarial-council` | stress-testing a design before building it |
| `/playwright` | all live verification, frontend **and** editor |
| `build-deploy.py --target sandybrown --blocks-only` | every deploy. Never `--allow-dirty` |
| `/sgs-db`, `/wp-blocks` | ground truth — never hardcode a count |

**Gates worth knowing before they surprise you:** the visual-diff gate wants a report at
`reports/visual-diff/<block>-<today>.md` with `verdict: PASS` and a `source_sha:` computed by
`scripts/visual-report-sha.py <block>` from the **staged** bytes. The oldshape audit blocks a
deploy whose schema change would strand stored content — migrate or revert, never force past
it. `--payload` exists to break the deploy-then-commit deadlock.
