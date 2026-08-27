# Next session — the SGS border control, three lift bugs, then a doc sweep

Invoke `/autopilot` before anything else.

This replaces `2026-08-28-four-carried-clone-track-items.md`, which is done. Of its four items,
three closed and one grew: the product-card work uncovered a converter regression dated
2026-08-22, and investigating it led Bean to a library-wide decision (Task 0) that now leads.

**Task 0 is the big one and is Bean-directed with its target shape already settled.** Tasks 1-3
are the clone-track residue. Task 4 closes with the doc sweep.

**Read the cited D-numbers. Do not ask for them to be restated.**

---

## What closed on 2026-08-27, so you do not re-open it

| Item | Outcome |
|---|---|
| Button font-family control | Shipped, deployed, live-verified: `.sgs-btn-ba3ea562.sgs-button{font-family:"Fraunces", serif}` |
| 375px readable-card floor | **Closed as a decision** (D866). Carousel stays 2-up. Do not re-litigate. |
| Converter numeric-type fix | **CLOSED** (Bean, 2026-08-27). Five number-typed attrs stopped receiving strings; 724 tests green. |
| flexWrap stored-content tidy-up | 100 of 100 applied, verified against the pre-write snapshot |
| flexWrap migration tool | Four real bugs fixed and committed |
| product-card font families + hover | Shipped, deployed, captured (`reports/visual-diff/product-card-2026-08-27.md`) |

⛔ **D851 did not reproduce.** It records page 2884 storing string line-heights. They are numbers,
and were when checked. The *bug* was real and is fixed; that page never showed it. Do not treat
2884 as evidence of anything.

---

## Task 0 — `SgsBorderControl`: native's one-row border UI, extended (Bean-directed, LEADS)

**Bean, 2026-08-27, seeing the native control:** *"I love the native's border control setup, it
has all of those different settings on one line, super intuitive and easy."*

**The decision: keep moving off native, but stop losing the UI.** Vendor WP core's
`BorderBoxControl` shape into a thin SGS wrapper — the pattern this repo already uses for the
time control, the colour picker and `BorderStyleControl` — then replace native across the library.
`cfc12751f` (2026-08-22) took product-card off the native path for a sound reason (one owner for
the box, instead of the native Styles tab and the SGS panel both writing the same object) and
discarded the native *control* as a side effect. Those are separable: own the data, keep the UI.

### The TARGET SHAPE is settled — do not re-derive it (THE-MIGRATION-METHOD Step 3)

One row, native's layout, composed from three components that ALL ALREADY EXIST:

| Slot | Component | Notes |
|---|---|---|
| Width | `SgsLengthControl.js` | linked, with native's per-side split toggle — the stored `{top,right,bottom,left}` object already supports it |
| Style | `BorderStyleControl.js` | native-exact already (solid/dashed/dotted, deselect = none); built 2026-08-19, do not rebuild |
| Colour | `GradientCapableColourControl.js` | **this is the extension** |

**Bean's extension, in his words:** *"match native and extend it to take on the extra
functionality of my border colour helper with the 2 states as well as static and gradient options
in the popovers."* `GradientCapableColourControl` (319 lines) is that helper and already provides
all of it: in-popover Normal/Hover tabs, a Solid/Gradient `ToggleGroupControl`, and
sibling-attribute storage (`{attr}` + `{attr}Gradient`, gradient wins when non-empty, resolved by
`sgs_resolve_text_colour_or_gradient()`). **Compose it; do not re-implement it.**

So the deliverable is a COMPOSITE, not three new controls. Read
`BorderStyleControl.js`'s header first — it documents the vendoring convention: name the exact
core source file and version you read, and record every deliberate divergence.

### Scope: all 62 blocks (Bean chose this over the smaller options)

52 blocks declare native `__experimentalBorder`; 10 already hand-roll block-private border attrs.
Bean chose full replacement so the library has ONE border system — the split between the two is
what produced the 1a regression below, and leaving it guarantees the next block moved off native
repeats it.

**62 blocks means the detector comes first.** Build the survey/fix/check triad
(`THE-MIGRATION-METHOD`), settle nothing by hand. `--survey` classifies each block as
NATIVE / BLOCK-PRIVATE / ALREADY-MIGRATED / UNCLEAR, and refuses to guess rather than
half-migrating an unclear one.

⚠ **Migrating a block off native `supports.border` silently breaks theme patterns that authored
native border attrs** — the D683 failure, where retiring native colour broke 7 header patterns and
`check-dead-pattern-attrs.py` missed it (it asks whether `supports.color` is declared, not whether
its sub-flags are on). Check the pattern/template markup in the same pass.

**Design-gate with Bean before building** (Rule 7): 62 blocks, a shared component, and a data-model
change on every one of them.

## Task 1 — Three lift bugs that share one shape (the main work)

Each has a value in the draft and an attribute in the block. They never meet, because the lift
looks for the declaration at a selector the draft does not use. Nothing errors. Nothing logs.

### 1a — The card's border lands on the CTA button

**A regression, dated.** Commit `cfc12751f` (2026-08-22, "whole root box onto ONE owner") moved
the card's border off WordPress's native style path onto block-private attributes:

```
- "css:border-width": "native:__experimentalBorder.width"
+ "css:border-width": "borderWidth"
```

The reasoning was sound — the native Styles panel and the SGS panel were both writing into one
object. But on the native path WordPress paints the root itself; on the block-private path the
converter must find the element through each attribute's `derived_selector`. Those three were
seeded pointing at `.sgs-product-card__border`, which exists in neither the draft nor the block
(grep both: zero hits).

The comparison is as close to controlled as this codebase offers — same block, same commit, same
`css_element`:

| Attribute | `derived_selector` | Result |
|---|---|---|
| `backgroundColour` | *(none)* | lifted — `#ffffff` landed |
| `borderColour` / `borderStyle` / `borderWidth` | `.sgs-product-card__border` | nothing lifted |

Meanwhile the draft's card-root values reached `ctaBorderStyle` / `ctaBorderWidth` /
`ctaColourBorder`, which the DB confirms target `.sgs-product-card__button`. The draft gives that
button no border at all. So the button wears a border it was never given, and the card lost the
one it was.

**Fix:** clear the `derived_selector` on those three attributes so they route through the
root-domain lift, as `backgroundColour` already does. A data correction, not code.

⚠ Trace how that value reached the CTA attributes before you fix it. The correlation is exact —
1px/solid on the featured card, 2px/dashed on the trial card, matching the two draft rules — but
the mechanism was never proven. Clearing the selector may leave the CTA leak in place.

### 1b — The trial card's gradient background is dropped

**Never worked; do not call it a regression.** `product-card/style.css` records the cause in its
own comment: *"the trial gradient rendered as `none` from the day it was written — measured live
2026-08-25."* That was a CSS specificity bug, since fixed. The CSS now works and there is still
nothing to paint, because the converter emits no gradient value for
`.sgs-product-card--trial { background: linear-gradient(...) }`.

### 1c — The trial tag's font-size does not lift, though its colours do

The draft declares `font-size: 11px` and `font-weight: 700` beside the colours in one rule
(`.sgs-product-card__tag--trial`). The colours lift; the typography does not — from the same
rule. The selector is a **modifier**, not the base `__tag`.

The render side is already waiting: `product-card/render.php:193` calls
`sgs_typography_css_rule( $attributes, 'tag', ... )`. This is a one-sided fix.

### Build the detector, not three patches

All three are the same failure. Before editing, write the check that finds them: **an attribute
whose `derived_selector` names an element appearing nowhere in the block's own markup or in the
draft.** Run it across all blocks — 1a alone sat unnoticed for five days. Read
`.claude/THE-MIGRATION-METHOD.md` first if the census returns more than three blocks.

**Design-gate with Bean before building.** This is the shared converter (Rule 7), and 1a is a DB
seeding change that affects every clone.

**Done when:** a fresh clone carries the card's border on the card, the trial gradient renders,
and the tag keeps its 11px — confirmed by opening the page, not by a passing test.

---

## Task 2 — Five stack-conversion candidates need Bean's eye

`plugins/sgs-blocks/scripts/migrate-container-flexwrap-and-stack-candidates.py --survey-stack-candidates`

⚠ **The figure is 5, not 127.** The brief that said 127 conflated three numbers: ~127 total flex
rows, 85 non-no-op, and **5 genuinely card-shaped**. Only the five need review, across three files:

- `theme/sgs-theme/patterns/testimonials-cards.php` lines 19, 28, 37
- `theme/sgs-theme/patterns/testimonials-highlight.php:12`
- `theme/sgs-theme/templates/single-product.html:12`

Screenshot each at 375/768/1440, show Bean, convert only what he approves. The script has no
`--apply` for this population by design.

---

## Task 3 — Two decisions waiting on Bean

**The attribute-schema gate.** It is wired into `scripts/orchestrator/pipeline-stage-gate.py` and
runs in `--enforce` mode, halting a clone run on any violation — Bean's own earlier "fail closed"
ruling. He asked for warn-only on 2026-08-27 based on a wrong claim that it was not wired at all.
That claim was a same-name file mix-up (`~/.claude/hooks/pipeline-stage-gate.py` is an unrelated
skill-ordering hook). **The recommendation is to leave it enforcing.** If he still wants
warn-only, build the failure log in the same commit — a gate that stops blocking and writes
nowhere is worse than either state.

**Bean's eye on the product-card hover.** The CSS is proven delivered; nobody has looked at it.
R-31-13 makes his eye co-authoritative and it has not been applied. Playwright was held by a
concurrent session all evening.

---

## Task 4 — Close the session with a doc sweep

Everything above touches docs that already drifted once today. Sweep them, and check for what is
**missing or stale**, not only what is wrong.

**Read before editing:** `.claude/CLAUDE.md` for the doc-op rules, and
`~/.agents/skills/shared-references/doc-templates/` for the canonical shapes.

| Doc | What to check |
|---|---|
| `.claude/LEDGER.md` | Replace this track's status, fold in — never delete another track's lines. Byte cap 24,576. |
| `.claude/decisions.md` | Entries for whatever this session ships. Verify the D-ceiling with the **anchored** grep (`^## D[0-9]+`) — the unanchored one once returned D5557 by matching a hex colour. |
| `.claude/parking.md` | Only if Bean approves an entry. Parking is a standing commitment; never add one unasked. |
| `plugins/sgs-blocks/CLAUDE.md` | The product-card row now understates the block: font families exist for desc/price/priceNote, and typed cards have a hover affordance. |
| `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` | If the `derived_selector` contract changes, the spec is the system — amend it with the decision. |
| `.claude/mistakes.md` | The KSES lesson below belongs here. Target ~30 entries; prune oldest to `memory/mistakes-archive.md`. |

**Two doc claims to correct, both found false today:**

1. **D834 names the wrong mechanism.** It says the schema gate is wired into
   `pipeline-stage-gate.py` without saying *which* — and two files carry that name. The
   orchestrator one is correct; the hooks one is unrelated. Name the path.
2. **Check what else asserts wiring.** Three separate gates in this repo have been documented as
   wired while wired to nothing (D338, D493, D643). Run `npm run gate:list` rather than grepping
   `package.json`, which returns a false positive by design since 2026-08-24.

Finish with `/handoff`, then `python .claude/hooks/handoff-preflight.py --check`.

---

## Standing hazards — carried forward and extended

The first four are inherited. **Never subtract one** (D101); add what you learn.

1. `main` is shared with other live sessions. Commit with explicit paths (`git commit -- <paths>`),
   never a bare commit after `git add`, and never a glob pathspec.
2. Never write `post_content` to a page Bean has open in the editor.
3. Verify subagent and tooling claims — including this prompt's own citations — against ground
   truth before acting.
4. A local edit to a theme pattern changes nothing live. The site renders the deployed copy.
   Deploy before verifying.
5. **`wp post update` without `--user` silently strips CSS from block attributes.** WordPress
   applies KSES with no user context. Post 2145's `{"style":{"css":"color: red;"}}` became `{}`,
   then the post emptied entirely; `--user=1` round-tripped it byte-for-byte. **This applies to
   any tool writing post_content, not just the migration script.**
6. **A deploy can report `[ABORTED]` while its payload landed.** Seen 2026-08-27:
   `remote-extract-failed`, yet the files were on the server and the post-deploy cache purge had
   been skipped. Check the server, not the exit code.
7. **Git Bash can show a stale view of files on Windows.** A file read as reverted was intact when
   checked through PowerShell. Confirm through PowerShell before concluding work was lost.
8. **The visual-diff gate strips comments before grepping.** Naming an attribute in a comment does
   not satisfy it. Dynamic-key attributes belong in
   `scripts/block-file-consistency-baseline.json`, with the precedent's verify-before-trusting
   clause.
9. **Never hand-escape JSON into block markup.** `"` decoded into literal quotes, invalidated
   the attributes, and the block stopped rendering. Use a serialiser and assert the result parses.
10. **Two agents editing one block both run `npm run build`.** Rebuild cleanly and verify both
    changes in the compiled output before trusting either.

---

## Tools

| For | Use |
|---|---|
| The three lift bugs | `/sgs-clone`; `/sgs-db` for `derived_selector` (open the DB read-only — **never import `converter/db/db_lookup.py`**, it runs schema migrations on import) |
| Design-gate before building | `/brainstorming`, then `/qc-council` before commit |
| Live verification | Playwright MCP — open it and look (R-31-11, R-31-13) |
| Deploy | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the one path. Never hand-roll tar/scp (D336). |
| Session close | `/handoff`, then `handoff-preflight.py --check` |
