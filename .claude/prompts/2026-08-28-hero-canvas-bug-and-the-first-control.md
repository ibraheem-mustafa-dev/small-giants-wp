---
doc_type: prompt
title: The hero canvas bug, the first real control, and the gate that has been missing for three rounds
date: 2026-08-28
track: colour-golden / tooling
shape: front-loaded design gates, then orchestrated parallel execution, then inline QC + docs
---

Invoke `/autopilot` before anything else.

# How to run this session

Bean is QC-only. The session is built so he answers everything **once, at the start**, and is not
interrupted again until the visual sign-off in TASK 2.

1. **PHASE 0 — ask everything first.** Every open question and design gate is listed below. Put them
   to Bean in ONE batch before any implementation. Do not start work that depends on an unanswered
   question.
2. **PHASE 1-3 — orchestrate, do not hand-code.** Every task below names its dispatch pattern.
   Route each subagent through `/delegate`; never hardcode or omit a model.
3. **QC inline, not at the end.** Run `/qc-inline` per task as it closes, not once at the end. A
   defect found three tasks later costs the context of all three.
4. **Docs inline.** Update `decisions.md`, `LEDGER.md` and the relevant spec **in the same commit as
   the change**. Do not leave a doc pass for the end — that is how the ledger drifts.

# Read first

1. `.claude/LEDGER.md` — colour-golden section. Live status. **If it disagrees with this, it wins.**
2. `.claude/reports/2026-08-27-rule-21-triage.md` — the 83-item worklist TASK 2 draws from.
3. `.claude/reports/2026-08-27-rule-34-false-positives.md` — the three-surface model.
4. `.claude/THE-MIGRATION-METHOD.md` Steps 3, 7b, 8. Graded C+ 2026-08-27.

---

# PHASE 0 — put these to Bean in one batch, before any work

## Design gate A — the motion + hover control shape (blocks TASK 2)

TASK 2 builds ONE control and Bean signs off its shape before the other 27 follow. Show him the
proposed panel on a deployed block and ask: does this feel right? Ten minutes, on a real page.

## Design gate B — C19 crop conversion (Bean SETTLED the shape 2026-08-27; build it)

Bean proposed adapting hero's split-image panel, then answered all three open details. **This is now
a build task with one thing left to decide (marked ⬜ below), not a design question.**

### ✅ SETTLED — `splitImageBleed` is DELETED, not carried forward

> **Bean:** *"This is a vestigial control in the container panel that breaks the sizing of the media
> when switched on, which is going to be removed from the hero block. It was also made redundant by
> object fit and image padding, which defaults to 0."*

So: drop it from the standard **and remove it from `sgs/hero`**. Same shape as the `templateMode`
removal on 2026-08-27 — check stored content for occurrences first; if zero, the removal is
behaviour-neutral and safe.

### ✅ SETTLED — TWO panel variants, split on art direction

> **Bean:** *"For all responsive media slots (image, video, anim, svg) we need art-directed
> responsives, where they are separate and not an object like the easy CSS responsive objects. It
> depends on the shape of their media. Do they have responsive media overrides? If not, use the
> regular responsive object. We could have 2 variant standard panels based on the need for
> responsive media."*

**The distinction, stated precisely:** art direction means different *assets* per breakpoint (a
portrait crop on mobile, a wide crop on desktop). Those cannot be one responsive object because they
are different files, not different values of one property. A regular responsive object is the same
asset with different CSS values per tier.

| | Panel A — no responsive media | Panel B — art-directed |
|---|---|---|
| Source | one | **separate attr per breakpoint** |
| Focal point | one | **per breakpoint** (a different crop needs a different focal point) |
| Box shape, fit, padding | regular responsive object | regular responsive object |

⚠ **Hero already proves the split is real:** it carries `imageObjectPositionTablet` and
`splitImageMobileObjectPosition`. That IS art direction — and it is exactly why its naming went
non-standard (`hero/block.json:283` documents the one-key-per-element constraint). **Normalise the
names when lifting; do not propagate the debt.**

### ⬜ LAST DETAIL — box shape. Bean proposed harmonising; here is the grounded shape

> **Bean, 2026-08-27:** *"Maybe we could harmonise the height and aspectRatio controls so they work
> together, or at least the aspectRatio is set to custom or blank by default so it doesn't interfere
> unless set, and treated as an authoritative control?"*

Measured 2026-08-27 — the two blocks size their box two different ways:

| | `sgs/hero` | `sgs/image-sequence` |
|---|---|---|
| Box shape from | `imageHeight` (**a TIER OBJECT**, Spec 35 — one attr, all three tiers) | `aspectRatio` (default `16 / 9`) |
| Fit | `imageObjectFit` | not declared |
| Focal point | `imageObjectPosition` (+ tiers) | not declared |

**⛔ THE CSS FACT THAT DECIDES BETWEEN BEAN'S TWO OPTIONS.** `aspect-ratio` applies only when at
least one axis is `auto`. **A definite height already beats it** — that is the CSS spec, not our
emit. So:
- *"blank by default, does not interfere unless set"* costs **nothing** — it is what CSS does anyway.
- *"authoritative when set"* **inverts CSS** and requires forcing `height:auto` whenever a ratio is
  set, or the ratio silently loses. It fights the platform.

**⚠ MIGRATION CATCH — do not simply blank the default.** `image-sequence/render.php:50` reads
`$attributes['aspectRatio'] ?? '16 / 9'` and **always** emits it (`:132`). Every existing
image-sequence block is rendering at 16/9 **from the default**, even though `aspectRatio` is set in
ZERO stored content on the canary. Blanking the default would silently restyle all of them.

**RECOMMENDED — a SIZING MODE picker, which is Bean's "harmonise" option made concrete:**

`Auto` · `Fixed height` · `Aspect ratio` — one control, mutually exclusive, so the conflict **cannot
occur** rather than being resolved by a precedence rule the client must learn.

- It IS the "box shape" step of the chain, so it inherits the grey-out rule: Auto hides both inputs;
  Aspect ratio greys out height; Fixed height greys out ratio.
- **Keeps `image-sequence` visually identical** — default its mode to `Aspect ratio` at `16 / 9`, and
  nothing on the canary changes. This is what makes the migration safe.
- Underneath, keep the emit CSS-native: a ratio paints only when height is auto. The stylesheet then
  reads the way a developer expects even if someone bypasses the control.
- ⚠ `hero.imageHeight` is a **tier object**, so `Fixed height` must stay responsive per tier. Do not
  flatten it. `hero/render.php:163-165` records that an earlier duplicate-height emit was already
  removed once — height now comes solely from that object. Do not reintroduce a second source.

**CLONING IMPACT — asked by Bean, investigated 2026-08-27. It is a SOLVED PATTERN, not a risk.**

The converter already derives discriminator attrs from CSS signature. The exact precedent is
`converter/services/arrangement.py:60` `layout_attrs()`, and its docstring records why it exists:

> *"`gridTemplateColumns` alone is INERT without it — the nested-grid stacking bug (ingredients /
> products / gift / social-proof all stacked because the grid value emitted but the container stayed
> `display:block`)."*

**That is the identical failure shape**: emit `aspectRatio` without setting the mode and the ratio is
inert — value present, nothing painted. The framework has been bitten by this once and built the
generic fix.

Supporting evidence, all measured:
- **`layout` carries `css_property: NULL` on every block that declares it.** A discriminator with no
  CSS property is the established DB shape, not a new concept.
- `layout_attrs()` is already **tier-aware** (a grid appearing only at a breakpoint still makes the
  container a grid) and **universal** (R-31-9), and the caller **DB-gates emission** on the block
  actually declaring the attr — so a block without `sizingMode` never receives a dead one.

**The adaptation:** one `sizing_attrs()` beside `layout_attrs()`, same shape:
`aspect-ratio` present → `{sizingMode:'aspect-ratio', aspectRatio:<v>}` · definite `height` present →
`{sizingMode:'fixed-height', imageHeight:<v>}` · neither → `{sizingMode:'auto'}` · **both → height
wins**.

⭐ **Why "both → height wins" makes the clone faithful BY CONSTRUCTION:** the draft rendered in a
real browser, which already applied that precedence. Mirroring CSS is therefore the only rule that
reproduces what the draft actually looked like — any other rule would diverge from the source.

⚠ **One honest caveat, PRE-EXISTING and not added by this.** `hero.imageHeight` is already a
migrated tier object (`{"type":"object","default":{}}`), so it sits inside the set
`orchestrator/check_flat_tier_regression.py` (D554-C) blocks from cloning until Spec 39 lands.
`aspectRatio` is a flat string and is unaffected. The mode picker neither adds to that blockage nor
removes it.

⛔ This touches `converter/` — **Rule 7 design gate applies. Bean's approval before building**, which
is what PHASE 0 is for.

**Put the mode picker to Bean for a yes, then build. It is the last thing blocking C19.**

## Design gate C — the visual column-shape picker is APPROVED but UNBUILT

`.claude/specs/37-HEADER-FOOTER-BUILDER.md` §3.3 records Bean approving it on 2026-07-28: *"A row
of small column diagrams the operator clicks is not a developer concept."* Grep finds no
implementation. **Ask whether it belongs in this session or the queue.**

## Question — C15 Block Bindings (Bean: *"No idea, this is an area where you have to perform some
brainstorming and a research council then propose any gaps we should add to the scope"*)

This is **research, not a decision.** Run `/brainstorming` then `/research-council`. Deliverable: a
proposal of scope gaps to ADD to the register, not a yes/no. Block Bindings connect a block's
displayed content to a data source instead of typed text. Currently wired for 3 blocks + 2 sources.
Establish what the gold standard looks like, then propose.

⚠ Dispatch this EARLY and in parallel with TASK 1 — it is research and blocks nothing.

---

# TASK 1 — The hero background colour is stuck in the editor canvas

**Bean, 2026-08-27:** *"The hero block background colour is stuck as the primary dark shade of pink
in the editor canvas and it doesn't change no matter what colours or gradients I pick in the Colour
control 'Background colour'."*

## The second defect, which matters more

`check-editor-render-parity.js` CHECK A exists to catch exactly this: *"a control set up correctly
on ONE side (editor OR live-page rendering) but not the other."*

**It reports 14 findings for `sgs/hero` and `backgroundColour` is not among them.** Hero declares
`backgroundColour` AND `backgroundColourGradient`. Bean can see both failing. The scanner flags
neither, and instead flags `backgroundRepeat`, `backgroundAttachment`, `bgParallax`, `bgKenBurns`
and nine `bgSvg*` attributes.

⛔ **A proven false negative — the one failure a detector cannot recover from alone**, because it
reads identically to a clean result. Over-reporting announces itself; under-reporting does not.

## Execution

**1a — Fix the bug.** Root-cause before changing anything. **Verify in the editor**, not by reading
code. Spec 38 §9's editor claim was asserted for weeks and proved false when someone finally opened
it. Inline or a single implementer — it is one defect.

**1b — Gap-analyse CHECK A.** `/dispatching-parallel-agents`, one branch per hypothesis class.
The question: **what else is it blind to?** Generalise from the proven miss; do not stop at one cause.
- One unproven hypothesis, offered so nobody re-derives it: the rule asks whether an attribute is
  *referenced* outside its control binding, not whether the reference has an *effect*. An attribute
  passed to a wrapper that never applies it would satisfy the rule and still do nothing.
  **Prove or refute it.**
- Declare the expected population BEFORE the run, by a method independent of the rule's own code.

**1c — Triage CHECK A's 235 findings** (208 net-new + 27 accepted) via Step 7b: REAL / DETECTOR BUG
/ ARTEFACT. Expect a mix — a static canvas arguably should not animate `bgParallax`, but
`backgroundRepeat` is static and the canvas should show it.

**1d — Give CHECK A a ratchet.** It is `blocking: false` with **no ceiling at all** — worse than the
advisory rules, which at least have one.

**Done when:** a client can change the hero background in the canvas; the blind spot is named and
fixed with a fixture **watched failing first**; the 235 are classified; CHECK A has a ceiling.
`/qc-inline` before moving on.

---

# TASK 2 — Build the first control (Bean: *"Ok, lets do it next session"*)

Rule 21's 83 findings are attributes the block paints that the client cannot reach. All 83 verified
individually.

**Start with motion and hover — 28 of the 83 across 8 blocks:** `transitionDuration`,
`transitionEasing`, `scaleHover`, `grayscaleHover`, `staggerDelay`, `imageZoomHover`.
**One shape decision covers a third of the worklist.**

This is **Step 3**: build ONE instance, deploy it, Bean's eye (R-31-13), write the settled shape down
**before censusing the rest**. A shape decided against a rendered page costs one block; the same
decision found on block nine costs nine.

Then the remaining 27 go behind a detector via `/subagent-driven-development` — implementer, task
review, fix loop. More than 3 files means the detector is the first deliverable.

**After motion+hover:** `sgs/site-footer` (16, on every page), `sgs/hero` (11),
`sgs/heading` + `sgs/text` (16, one shape twice), then a tail of 11 blocks. Some of the tail may be
deliberate developer-only settings — `sgs/form.requireLogin`, `sgs/buybox.showLadder` — so confirm
intent before building.

---

# TASK 3 — The diff-shape commit gate (Bean approved: *"Sure"*)

**Recoverability has graded D for three rounds and is the ceiling on the method's overall grade.**

Three commit gates exist — `detector-first-commit-gate.py`, `f5-commit-gate.py`,
`spec-drift-commit-gate.py`. **None inspects diff shape** (verified by grep). The only defence
against a whole-file rewrite is a human remembering `git diff --stat`.

It failed twice on 2026-08-27. One track shipped a commit titled *"restore gates.json formatting —
my own edit was a 1,315-line whole-file diff."*

| | |
|---|---|
| Trigger | PreToolUse on a commit, like the existing three |
| Check | Per staged file, compare changed lines (`git diff --cached --numstat`) against file length. Flag when changed ≈ total and the file is neither new nor deleted |
| Second check | **Truncation** — deletions equal the whole file, additions ≈ 0. The dangerous one: a truncated file passes `--check` GREEN, because scanners skip files no longer containing the symbol they search for |
| Bypass | `[reformat-ok:<reason>]`, matching `[gates-ok:]` / `[repeat-ok:]` / `[batch-ok:]` |

Catches all three recorded shapes — CRLF rewrite, JSON round-trip, truncation. All share one tell:
changed-lines ≈ file-length. Roughly half an hour, single implementer.

⛔ **Prove it can fail before wiring it.** A gate never seen fail is not a gate.

---

# TASK 4 — Two settled decisions, ready to build

## C14 — panel and control order (SETTLED, Bean 2026-08-27)

> Element order follows the DOM: whatever appears first from top to bottom, and where two elements
> sit at the same level, left to right.
>
> At root level, follow WordPress-native ordering — Styles at the top, then Colour, then Typography.
>
> Some panels have fixed positions: the helpers; **Advanced is always the bottom of Settings**;
> **Visibility conditions is always second from bottom**.

Record in Spec 35, then build the enforcing gate. The register notes CO-2 element grouping has no
enforcing gate and cites a `consistency-scanner` that does not exist.

## C16 — spacing presets (SETTLED, Bean 2026-08-27)

> The current standard for most spacing controls is a responsive box-object control: an input box, a
> measurement-type picker, and a slider. Add presets for easy picking. Selecting a preset changes the
> value in the input box **and** the measurement type, when the preset's unit differs from the
> attribute's currently active unit.

The unit switch is the part that is easy to get wrong. Build one, Bean's eye, then roll out.

---

# CLOSED — do not re-open

- **C17 Section Styles — CLOSED.** Bean accepted the recommendation: do not rebuild our per-block
  equivalents (Styles panel on info-box/heading/text, button's style-variations dropdown, hero's
  variant picker) on WP 6.6's native mechanism. Ours work; the native one mainly buys cross-block
  cascade we do not need.
- **C18 façade `inspector_control_type` — CLOSED as a non-problem.** Investigated 2026-08-27:
  (a) the reasoning Bean asked for IS documented — `specs/37-HEADER-FOOTER-BUILDER.md` §3.3
  establishes `cluster` vs `columns` as row layout MODES, Bean-locked 2026-07-21; (b) the column is
  advisory metadata with **zero converter consumers** and is **64.6% NULL** framework-wide, carrying
  a recorded rule that **NULL must not be read as "no control"**. The NULL is not a defect.
  **The one real residual became design gate C above** — the approved visual column-shape picker is
  unbuilt.

---

# Still open, unchanged

- **`31-golden-colour-control` — 291 untriaged.** Largest rule left, and it IS the colour
  conformance work already on the register. Same triage, same three verdicts.
- **`01-tab-group` 57** and the tail — untriaged.
- **flexWrap default flip** — BLOCKED. Needs a stored-content migration, not a default change.
  Proven unsafe as a bare flip: 3 elements moved on `/`, 6 on `/shop/`.
- **The 83 accidental-columns candidates** — Bean's eye per candidate, with screenshots.
  ⛔ Retire the "52 / 5 / 59" figure; it cannot be reproduced from any artefact on disk.
- **Spec 39** — still does not exist as a file. 37 conformance goldens sit `xfail(strict=True)`.
- **The Cutter's remaining cuts** — ~40 lines in `THE-MIGRATION-METHOD.md`: the "Why this exists"
  section, the duplicated anchoring incident, the third `--allow-dirty` telling.

---

# Guardrails

- **Enumerate, never recall.** Every figure here came from a command. Re-run before trusting one.
- **Count only what the gate counts.** `--json` serialises BASELINED alongside FLAGGED while the
  exit code filters to FLAGGED. Quote rule 21 as 83, never 94.
- **Diff findings on a content key, never the raw one.** On 2026-08-27 a naive diff showed 17 new
  and 16 cleared on rule 31; content-keyed, exactly ONE was genuinely new.
- **A quoted bash heredoc here collapses one backslash level.** `'\\b'` written via `<<'EOF'` lands
  as `'\b'` — character code 8. Four wrong measurements on 2026-08-27 across three agents. Use the
  Write tool for content with backslashes, or regex literals (`/\b/`), which survive.
- **`node --check` is vacuous on ES modules** — exits 0 on broken code. Copy to `.mjs`.
- **Anchor scripts on `__dirname`, and run comparison copies from the same directory.** A copy run
  from a temp directory scans nothing and reports a false regression. Happened twice.
- **Five tracks share `main`.** Path-scoped commits, branch re-checked in the same command. Never
  `git add -A`, never a bare `git checkout .`. If `.git/index.lock` exists, another session is
  mid-commit — wait, never delete it.
- **Do not raise a ratchet ceiling to absorb new debt.** On 2026-08-27 rule 31 hit 292 against 291
  and `main` went red. That was the ratchet working.
- **`decisions.md` size is self-healing.** A Stop hook sweeps it. Do not investigate it.
