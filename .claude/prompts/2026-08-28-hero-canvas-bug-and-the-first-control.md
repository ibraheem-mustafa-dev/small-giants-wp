---
doc_type: prompt
title: The hero canvas bug, the first real control, and the gate that has been missing for three rounds
date: 2026-08-28
track: colour-golden / tooling
---

Invoke `/autopilot` before anything else.

# Read first

1. `.claude/LEDGER.md` — the colour-golden section. It is the live status. **If it disagrees with
   this prompt, the LEDGER wins.**
2. `.claude/reports/2026-08-27-rule-21-triage.md` — the 83-item worklist TASK 2 draws from.
3. `.claude/reports/2026-08-27-rule-34-false-positives.md` — the three-surface model everything
   below rests on.
4. `.claude/THE-MIGRATION-METHOD.md` — Steps 3, 7b and 8. Graded C+ on 2026-08-27; nine findings
   were corrected in place.

---

# What is true now

Measured 2026-08-27, not recalled. Re-run before trusting any figure.

| Rule | Findings | State |
|---|---|---|
| `31-golden-colour-control` | 291 | Untriaged. Ceiling 291, zero slack |
| `21-render-without-control` | 83 | **Triaged. All 83 real** |
| `01-tab-group` | 57 | Untriaged |
| `34-declared-attr-unrendered` | 2 | **Triaged. Was 319** |
| Scanner total | **499** | Was 945 |

Two of thirteen rules now carry numbers anyone can act on.

---

# TASK 1 — The hero background colour is stuck in the editor canvas

**Bean, 2026-08-27:** *"The hero block background colour is stuck as the primary dark shade of pink
in the editor canvas and it doesn't change no matter what colours or gradients I pick in the Colour
control 'Background colour'."*

A client picks a colour and the canvas ignores them. Fix it.

## The second defect, which matters more

`check-editor-render-parity.js` CHECK A exists to catch exactly this class: *"a control set up
correctly on ONE side (editor OR live-page rendering) but not the other."*

**It reports 14 findings for `sgs/hero` and `backgroundColour` is not among them.** Hero declares
`backgroundColour` and `backgroundColourGradient`. Bean can see both failing. The scanner flags
neither, and instead flags `backgroundRepeat`, `backgroundAttachment`, `bgParallax`, `bgKenBurns`,
and nine `bgSvg*` attributes.

⛔ **That is a proven false negative, and a false negative is the one failure a detector cannot
recover from alone** — it reads identically to a clean result.

## Do this

1. **Fix the bug.** Root-cause it first: prove why the canvas ignores the value before changing
   anything. Verify in the editor, not by reading code — the canvas is a separate surface and this
   project has been wrong about it before (Spec 38 §9's editor claim was asserted for weeks and was
   false when finally opened).
2. **Then run a full gap analysis of CHECK A with subagents** (`/dispatching-parallel-agents`).
   The question: **what is it blind to?** Start from the proven miss and generalise. Do not stop at
   one cause.
   - One hypothesis, unproven, offered only so nobody re-derives it: the rule asks whether an
     attribute is *referenced* outside its control binding, not whether the reference has an
     *effect*. An attribute passed to a wrapper that never applies it would satisfy the rule and
     still do nothing. **Prove or refute it; do not assume it.**
   - Declare the expected population before the run, by a method independent of the rule's own code.
3. **Triage CHECK A's 235 findings** (208 net-new + 27 accepted) using Step 7b: REAL / DETECTOR BUG
   / ARTEFACT. Some are certainly by design — a static canvas arguably should not animate
   `bgParallax`. But `backgroundRepeat` is static and the canvas should show it. Expect a mix.
4. **Give CHECK A a ratchet.** It is `blocking: false` with **no ceiling at all** — worse than the
   advisory rules, which at least have one. A detector that cannot fail produces a number nobody
   trusts, and a number nobody trusts never gets worked.

**Done when:** a client can change the hero background in the canvas; the blind spot is named and
fixed with a fixture watched failing first; the 235 are classified; CHECK A has a ceiling.

---

# TASK 2 — Build the first control, and settle the shape (Bean: "lets do it next session")

Rule 21's 83 findings are attributes the block paints that the client cannot reach. All 83 verified:
the attribute appears nowhere in that block's own control surface.

**Start with motion and hover — 28 of the 83 across 8 blocks:** `transitionDuration`,
`transitionEasing`, `scaleHover`, `grayscaleHover`, `staggerDelay`, `imageZoomHover`.

**One shape decision covers a third of the worklist.**

This is **Step 3**: build ONE instance, deploy it, get Bean's eye on it (R-31-13), write the settled
shape down — *before* censusing the rest. A shape decided against a rendered page costs one block;
the same decision found on block nine costs nine.

Bean needs ten minutes on a real page, not a design review.

Then: `sgs/site-footer` (16, on every page), `sgs/hero` (11), `sgs/heading` + `sgs/text` (16, one
shape twice), and a tail of 11 blocks. Some of the tail may be deliberate developer-only settings —
`sgs/form.requireLogin`, `sgs/buybox.showLadder` — so confirm intent before building.

⛔ Once the shape is settled, the remaining 27 go behind a detector. More than 3 files means the
detector is the first deliverable.

---

# TASK 3 — The diff-shape gate (Bean approved: "Sure")

**Recoverability has graded D for three rounds and is the ceiling on the whole method's grade.**

Three commit gates exist — `detector-first-commit-gate.py`, `f5-commit-gate.py`,
`spec-drift-commit-gate.py`. **None inspects diff shape.** Verified by grep. The only defence
against a whole-file rewrite is a human remembering `git diff --stat`.

It failed twice on 2026-08-27. One track shipped a commit titled *"restore gates.json formatting —
my own edit was a 1,315-line whole-file diff."*

Build a fourth gate on the same pattern:

| | |
|---|---|
| Trigger | PreToolUse on a commit, like the existing three |
| Check | Per staged file, compare changed lines (`git diff --cached --numstat`) against file length. Flag when changed ≈ total and the file is neither new nor deleted |
| Second check | **Truncation** — deletions equal the whole file, additions ≈ 0. This is the dangerous one: a truncated file passes `--check` GREEN, because scanners skip files no longer containing the symbol they search for |
| Bypass | `[reformat-ok:<reason>]`, matching `[gates-ok:]` / `[repeat-ok:]` / `[batch-ok:]` |

Catches all three recorded shapes: the CRLF rewrite, the JSON round-trip, and truncation. All share
one tell — changed-lines ≈ file-length. Roughly half an hour.

⛔ Prove it can fail before wiring it. A gate never seen fail is not a gate.

---

# TASK 4 — Two settled decisions, ready to build

Bean answered these on 2026-08-27. They no longer block anything.

## C14 — canonical panel and control order (SETTLED)

> Element order follows the DOM: whatever appears first from top to bottom, and where two elements
> sit at the same level, left to right.
>
> At root level, follow WordPress-native ordering — Styles at the top, then Colour, then Typography.
>
> Some panels have fixed positions: the helpers; **Advanced is always the bottom of Settings**;
> **Visibility conditions is always second from bottom**.

Record it in Spec 35, then build the enforcing gate. The register noted CO-2 element grouping has no
enforcing gate and cites a `consistency-scanner` that does not exist.

## C16 — spacing presets (SETTLED)

> The current standard for most spacing controls is a responsive box-object control: an input box, a
> measurement-type picker, and a slider. Add presets for easy picking. Selecting a preset changes the
> value in the input box **and** the measurement type, when the preset's unit differs from the
> attribute's currently active unit.

The unit switch is the part that is easy to get wrong. Build one, get Bean's eye, then roll out.

---

# TASK 5 — Four decisions still open

Explained to Bean on 2026-08-27; his answers are still needed. Batch them.

- **C15 Block Bindings** — wired for 3 blocks and 2 sources. Is 3 the finished scope?
- **C17 Section Styles** — WP 6.6 container-level looks that also restyle children. We have our own
  per-block equivalents (Styles panel on info-box/heading/text, button's style-variations dropdown,
  hero's variant picker). Should any be rebuilt on the native mechanism?
- **C18 façade controls** — one control writing several attributes has nowhere to record itself in a
  single-value column. Record once against a primary attribute, N times identically, or as a new
  type?
- **C19 crop conversion** — `testimonial` and `image-sequence` each handle image fitting their own
  way. Needs a per-block call.

---

# Still open, unchanged

- **`31-golden-colour-control` — 291 untriaged.** The largest rule left, and it IS the colour
  conformance work already on the register. Same triage, same three verdicts.
- **`01-tab-group` 57** and the tail — untriaged.
- **flexWrap default flip** — BLOCKED. Needs a stored-content migration, not a default change.
  Proven unsafe as a bare flip: 3 elements moved on `/` and 6 on `/shop/`.
- **The 83 accidental-columns candidates** — needs Bean's eye per candidate, with screenshots.
  ⛔ Retire the "52 / 5 / 59" figure; it cannot be reproduced from any artefact on disk.
- **Spec 39** — still does not exist as a file. 37 conformance goldens sit `xfail(strict=True)`
  waiting for it.
- **The Cutter's remaining cuts** — roughly 40 lines in `THE-MIGRATION-METHOD.md`: the "Why this
  exists" section, the duplicated anchoring incident, the third `--allow-dirty` telling.

---

# Guardrails

- **Enumerate, never recall.** Every figure here came from a command. Re-run before trusting one.
- **Count only what the gate counts.** `--json` serialises BASELINED alongside FLAGGED while the
  exit code filters to FLAGGED. Quote rule 21 as 83, never 94.
- **Diff findings on a content key, never the raw one.** On 2026-08-27 a naive diff showed 17 new
  and 16 cleared on rule 31; content-keyed, exactly ONE was genuinely new. The rest was line-shift
  noise.
- **A quoted bash heredoc here collapses one backslash level.** `'\\b'` written via `<<'EOF'` lands
  as `'\b'` — character code 8. This produced four wrong measurements on 2026-08-27, across three
  different agents. Use the Write tool for content with backslashes, or regex literals (`/\b/`),
  which survive.
- **`node --check` is vacuous on ES modules** — it exits 0 on broken code. Copy to `.mjs` to check.
- **Anchor a script on `__dirname`, and run comparison copies from the same directory.** A copy run
  from a temp directory scans nothing and reports a false regression. This happened twice.
- **Five tracks share `main`.** Path-scoped commits, branch re-checked in the same command. Never
  `git add -A`, never a bare `git checkout .`. If `.git/index.lock` exists, another session is
  mid-commit — wait, never delete it.
- **Do not raise a ratchet ceiling to absorb new debt.** On 2026-08-27 rule 31 hit 292 against 291
  and `main` went red. That was the ratchet working. The owning track fixed the finding.
- **`decisions.md` size is self-healing.** A Stop hook sweeps it. Do not investigate it.
