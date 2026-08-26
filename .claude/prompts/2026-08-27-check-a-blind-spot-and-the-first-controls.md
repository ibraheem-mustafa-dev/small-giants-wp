# Next session — CHECK A's blind spot, and the first client controls

**Invoke `/autopilot` before anything else.**

Bean is QC-only. Ask every open question in ONE batch at the start, then work without
interrupting him until a task needs his eye.

---

## ⛔ FIRST: one commit is written but NOT landed

`sgs/hero` carries a complete, verified change that no commit contains. **Land it before
anything else, or you will edit around it.**

Four files, already on disk:
`hero/block.json` · `hero/edit.js` · `hero/render.php` · `hero/style.css`

It does two things, both measured:

1. **Deletes `splitImageBleed`** — the toggle Bean reported as breaking the image's shape.
   His report was right; the cause was already gone. The modifier once carried
   `max-width:calc(50% + spacing-40)`, which capped the media column at roughly half its
   track (measured then: track 736.5px, media 392px), so `object-fit:cover` cropped hard.
   That cap went on 2026-08-25 in `6db78e0e7` — the commit the LEDGER records as
   "Hero media cell 392 → 733px". The toggle has been inert ever since. Measured across
   five conditions — editor desktop/tablet/mobile on the real homepage, the live frontend
   at a narrow width, and test page 2337 — toggling changed nothing. Zero stored
   occurrences, zero theme usage.
   ⚠ The deletion PRESERVES the video/SVG sizing rules by making them unconditional. Those
   tiers had no other sizing anywhere; dropping them would reintroduce D600's overflow bug.

2. **Fixes the `split-image` element manifest.** `border-color`/`-style`/`-width` mapped
   nowhere, so `css_element` was NULL — and `db_lookup.py:1498` reads NULL as the block's
   OWN ROOT, routing a cloned draft's image border onto the hero `<section>`. `object-fit`
   mapped to `media` (the column wrapper) though `render.php:629` paints it on the image.
   All four now map to `split-image`. Verified durable: the generated classifier derives
   `split-image` for all four after a Stage-1 reseed.

**Why it did not land:** the pre-commit F5 gate fails on
`sgs/product-card.titleFontFamily` — a rogue DB seed with a `css_property` that no
classifier declares. It is not from this change (verified absent from
`css-property-classifications.json` in HEAD *and* the working tree; nothing in the hero
diff touches product-card). `.githooks/pre-commit` offers **no scoped bypass** for F5,
only `--no-verify`, which discards gitleaks and every other gate — deliberately not used.

**Do this:** establish who owns that row, clear it, then commit. `extract-signatures.py`
does NOT fix it (re-run: 0 rows written). The visual-diff gate will also ask for a hero
report — the change touches `render.php` and `style.css`, so that request is correct; use
the five measurements above as the evidence.

---

## The state of the tooling you are about to trust

Three proven false negatives in `check-editor-render-parity.js` CHECK A, all found by
opening the editor rather than reading code:

| # | What it missed | How it was found |
|---|---|---|
| 1 | `sgs/hero.backgroundColour` — the canvas ignored it entirely | Bean saw it |
| 2 | The `has-background` half of the same fix | Deploying fix 1 and looking again |
| 3 | `colourVar()` dropping every custom colour across 39 blocks | Probing while proving fix 1 |

CHECK A reports **208 net-new + 27 baselined = 235**, is advisory, and has **no ceiling at
all**. Until its blind spot is characterised, a green result from it means nothing.

---

## TASK 1b — find what else CHECK A cannot see

Use `/dispatching-parallel-agents`, one branch per hypothesis class. Generalise from the
three misses; do not stop at one cause.

Declare the expected population BEFORE the run, by a method independent of the rule's own
code. Every fixture gets watched failing first.

The exemption ladder is `check-editor-render-parity.js:2418-2442`. Two hypotheses, given
free so nobody re-derives them:

- `:2424` skips any attr in `EDITOR_INVISIBLE_BY_DESIGN` or `NATIVE_SUPPORTS_ATTR_NAMES`.
- `:2430` asks whether an attribute is *referenced* outside its control binding, not
  whether the reference has an *effect*. An attr passed to a wrapper that never applies it
  satisfies the rule and still does nothing.

**Prove or refute each.**

## TASK 1c — triage the 235

Classify every finding REAL / DETECTOR BUG / ARTEFACT, per `THE-MIGRATION-METHOD.md`
Step 7b. Expect a genuine mix: a static canvas arguably should not animate `bgParallax`,
but `backgroundRepeat` is static and the canvas should show it.

Count only what the exit code counts. Diff on a content key, never the raw one.

## TASK 1d — give CHECK A a ceiling

`CHECK_A_BLOCKS_BUILD = false` at `:3596`, with no numeric ceiling anywhere — worse than
the advisory rules, which at least have one. Add a ceiling; keep it non-blocking.

**Done when:** the blind spot is named and fixtured, the 235 are classified, and a 236th
finding turns the build red.

---

## TASK 2 — the first client controls (hover, and stagger separately)

Rule 21 reports **82** findings. **28 of them are one theme, across NINE blocks**
(`sgs/testimonial` included — the earlier "8 blocks" was wrong).

⛔ **A universal hover panel ALREADY EXISTS**: `src/blocks/extensions/hover-effects.js`,
546 lines, opt-in via `supports.sgs.enabledExtensions: ['hover']`. **No affected block opts
in.** It writes its own `sgsHover*` family, so switching blocks on would give the client
**two of every control** and rule 21 would still report 28 — it cannot see `sgs*`-prefixed
attrs at all (`SYSTEM_ATTR_RE`, `21-render-without-control.js:82`).

**Bean's decision: hover and motion are separate concepts.** Three pieces of evidence
agree: `extensions/animation.js` and `extensions/hover-effects.js` are already distinct
surfaces; `staggerDelay` is mapped `"anim:stagger"` in the element manifest, so the
framework's own data calls it animation; and both extensions already carry a duration and
easing pair, which would make `transitionDuration`/`transitionEasing` a third.

| Destination | Findings | Attributes |
|---|---:|---|
| **Hover** (the existing extension, taught to bind each block's OWN attrs) | **25** | `scaleHover`, `grayscaleHover`, `imageZoomHover`, plus `transitionDuration` and `transitionEasing` |
| **Animation** (`extensions/animation.js`) | **3** | `staggerDelay` — `card-grid`, `gallery`, `testimonial` |

**Per block a client sees 1 to 5 settings, never 16** — a block shows only what it
declares. `hero` gets 2 rows; `card-grid` and `team-member` get 5.

**Build `sgs/team-member` FIRST** — 5 settings, so one panel exercises every control.
Deploy it, get Bean's eye (R-31-13), write the settled shape down, and only then census
the rest. Roll the remaining blocks out behind a detector via
`/subagent-driven-development`.

⚠ Two gates must stay green: `check-duplicate-controls.js` (the exact defect a naive
opt-in causes) and `check-shared-panel-schema.js`.

**After hover, by client impact:** `sgs/site-footer` (16, on every page) · `sgs/hero` (11)
· `sgs/heading` + `sgs/text` (16, one shape twice) · then the tail. ⚠ Some of the tail are
plausibly deliberate developer-only settings — `sgs/form.requireLogin`, `.rateLimit`,
`sgs/buybox.showLadder` — so confirm intent before building.

---

## TASK 2b — two control-surface gaps handed over by the cloning track (2026-08-26)

Bean's call: these belong to the standardisation work, not to a per-block or converter fix.
Fixing them in the converter would be a carve-out (R-31-9); fixing them block-privately now
means redoing them when the standard panel lands.

### `sgs/product-card` TYPED mode — replace is unreachable without destroying first

In typed mode the media area offers only a **"Remove image"** button. No replace control, no
inspector media panel. An operator whose image URL is broken — **exactly the state a freshly
cloned card lands in** — must delete the value to get a picker back.

**Done when:** typed mode is in scope (not just `bound`/`wc-product`), and replace is reachable
WITHOUT removing first. Button, panel, or both — shape is your call. Usual
`block-migration-DONE-checklist.md`.

Pointers: **D787** · `src/blocks/product-card/edit.js`, typed-mode media area. The block is
dual-mode and this is the TYPED path; legacy InnerBlocks was purged at D275, so there is no
legacy editor path to preserve.

⚠ **Read the way this was found, it cost that track three wrong answers.** Reading `edit.js`
says the control exists — and it does. It simply is not reachable without deleting first. Bean
found it by opening the editor.

⭐ **This is a DETECTOR class nothing currently owns.** Rule 21 asks "does the block paint
something with no control?" — here a control exists, so rule 21 is silent. `check-dead-controls`
asks the inverse. **Nothing asks "is this control reachable without first destroying the value?"**
Worth a detector before the sweep, per THE-MIGRATION-METHOD.

### `sgs/hero` split media — video and SVG tiers have NO controls at all

The whole `splitMedia*` family (width / height / border-radius / padding / object-fit) emits only
onto `.sgs-hero__split-image`, a class added only for the IMAGE type
(`hero/render.php:557-665` and `:1215`). The video and SVG tiers therefore have no controls
whatever. If your work covers per-type media controls, pull this in.

⭐ **The cloning track flagged this as BLOCKING the splitImageBleed deletion. It no longer is —
that half is already done and sits in the uncommitted hero commit at the top of this file.** The
bleed CSS was indeed the only thing giving those tiers width/height/border-radius; the deletion
therefore made those rules **UNCONDITIONAL** rather than removing them. Verified: 0 bleed-gated
rules remain in `hero/style.css`, and the `--video`/`--svg` sizing is intact.

**What remains is only the CONTROLS gap**, which was always separate from the sizing. Tell that
track the deletion is unblocked.

---

## TASK 4 — three settled decisions, ready to build

### C14 — panel and control order
Element order follows the DOM: top to bottom, then left to right at the same level. At
root level, WordPress-native ordering — Styles, Colour, Typography. Fixed positions: the
helpers; **Advanced always last in Settings**; **Visibility conditions always second from
last**. Record in Spec 35, then build the enforcing gate. ⚠ The register cites a
`consistency-scanner` that does not exist — verify before citing it.

### C16 — spacing presets
Keep the responsive box-object control; add presets. Selecting a preset changes the value
**and** the measurement type when the preset's unit differs from the attribute's active
unit. The unit switch is the part that is easy to get wrong. Build one, Bean's eye, then
roll out.

### C19 — the sizing-mode picker
`Auto` · `Fixed height` · `Aspect ratio`, mutually exclusive, so height and ratio cannot
compete. Auto hides both inputs; each other mode greys out the one it does not use.

⭐ **Default `sgs/image-sequence` to `Aspect ratio` at `16 / 9`.** `render.php:50` reads
`$attributes['aspectRatio'] ?? '16 / 9'` and always emits it, so every existing block
renders at 16/9 *from the default* even though the attribute is set in zero stored
content. That default is what makes the migration safe.

⚠ `hero.splitMediaHeight` is a **tier object** — `Fixed height` stays responsive per tier.
Do not flatten it, and do not add a second height source.

**Converter side** — a solved pattern. Add one `sizing_attrs()` beside
`converter/services/arrangement.py:61 layout_attrs()`, same shape: `aspect-ratio` present
→ `{sizingMode:'aspect-ratio'}` · definite `height` → `{sizingMode:'fixed-height'}` ·
neither → `{sizingMode:'auto'}` · **both → height wins**, because the draft rendered in a
real browser that already applied that precedence.

⛔ Touches `converter/` — Bean approved the picker; do not widen beyond it without a fresh
Rule 7 gate. Read Spec 31 §13 before the first edit there.

---

## Gate C — the column-shape picker: built, NOT deployed

`FR-37-42`, approved 2026-07-28, built 2026-08-26, committed `2e46fc3f2`, wired to
`sgs/site-footer-row` only.

**Outstanding:** deploy, Bean's eye, then roll out to `sgs/site-header-row` and
`sgs/container` (Bean's call: all three share the control).

Bean asked whether a container needs different proportions per grid row. **CSS answers it:**
`grid-template-columns` applies to the whole grid, every row uses the same tracks, and the
container has no per-item span support. Differing proportions means a second container —
already true today with the count control, so the picker adds no new concept.

### ⭐ Bean's three changes from his eye-review (2026-08-26) — do these FIRST

He saw it live on the canary footer and approved the shape overall. Three corrections:

**1. The bar widths look non-uniform — bars that should match do not.**

He is right, and the cause is arithmetic, not perception. `ShapeDiagram` lays bars out with
`flex: <weight> 1 0` inside a **34px** box with `gap: 2px`. For a 3-bar shape that leaves 30px of
bar space, so:

| Shape | weights | bar widths |
|---|---|---|
| Equal | 1,1,1 | 10 / 10 / 10 |
| Wide centre | 1,2,1 | **7.5** / 15 / **7.5** |
| Wide first | 2,1,1 | 15 / **7.5** / **7.5** |

Those `7.5px` bars land on subpixels, so two bars that are mathematically identical can paint one
device pixel apart — visibly unequal. **Fix by choosing a bar-space that every weight-total
divides into exactly.** Catalogue totals are 2, 3, 4 and 5, so use a common multiple: **60px of
bar space** gives whole-pixel units for every shape (30/20/15/12). Widen the diagram accordingly
rather than nudging values until it looks right.

⚠ Verify by MEASURING `getBoundingClientRect().width` on each bar and asserting that bars of equal
weight are equal to the pixel — do not judge it by eye, which is what let this through.

**2. Six shapes per count, laid out 2 rows of 3.** Two real constraints to put to Bean BEFORE
building, because both are his call:

- ⛔ **FR-37-42 says the catalogue is not open to taste**: *"DO NOT re-derive the shape list from
  taste. It comes from the reference teardowns; any shape added later needs a measured reference
  behind it."* Going 3-4 → 6 needs either measured references for the new shapes, or Bean
  deliberately relaxing that rule. Ask which; do not quietly add three shapes.
- ⛔ **`ToggleGroupControl` does not wrap.** That is exactly why core falls back to
  `Button isPressed` past 6 options (gold-standard report §4). "2 rows of 3" therefore CANNOT be
  TGC — it means either a custom wrapping radiogroup with proper roving `tabindex` and
  `aria-checked`, or losing the radiogroup and returning to pressed buttons. **Losing it costs the
  arrow-key traversal the research specifically told us to gain.** Recommend building the wrapping
  radiogroup; price it honestly before agreeing.

**3. Brand teal for the diagram bars — Bean's value: `#158697`** (given 2026-08-26).

⚠ **It appears NOWHERE in the repo** — grepped, zero matches — and there is no SGS brand-colour
source of truth anywhere in the tree to check it against. It is therefore a FOURTH teal alongside
the three already floating. Bean said "I think", so confirm the value before hardcoding it, and
consider recording it once as a named constant so the next person has something authoritative to
read.

| Source | Value | vs white | vs editor grey |
|---|---|---|---|
| **Bean's brand teal** | **`#158697`** | 4.30:1 | 3.77:1 |
| `theme.json` primary | `#1F7A7A` | 5.09:1 | 4.47:1 |
| older `editor.css` fallback | `#0F7E80` | 4.87:1 | 4.27:1 |

✅ **`#158697` PASSES for this use.** The bars are decorative graphics (`aria-hidden`), so the
governing rule is **WCAG 1.4.11 non-text contrast at 3:1**, not the 4.5:1 text threshold — 4.30:1
and 3.77:1 both clear it comfortably.
⛔ **It would FAIL 4.5:1 if ever reused for TEXT.** Do not promote this literal into a text colour
without re-checking.

⚠ Do NOT reach for `var(--wp--preset--color--primary)`: that is the CLIENT's palette and resolves
to Mama's pink `#e68a95` on the canary. The picker is SGS tool chrome and must look identical for
every client, so it needs the fixed literal.

Research that shaped it: `reports/2026-08-26-column-shape-picker-gold-standard.md`. Core's
own picker is **insert-time only**, so this fills a genuine gap rather than re-implementing
core.

⛔ **One recommendation was rejected and must stay rejected:** storing a shape *slug*
instead of writing `gridTemplateColumns`. A stored slug can disagree with a hand-edited
value — exactly the lying indicator FR-37-28 exists to prevent. The active shape is
DERIVED (`activeShapeKey()`).

---

## C15 — Block Bindings, four items Bean adopted

Full report: `reports/2026-08-28-c15-block-bindings-scope-proposal.md`. Ground truth:
**3 of 83 blocks** are bindable, 2 sources, **6 bindings in the whole tree**, all hand-typed
into two pattern files, and **zero editor-side JS**.

- **C15-2 + C15-3 — the editor UI. The headline item.** Register the source in JS and
  supply `getFieldsList()`, so core's own 6.9 picker lists SGS fields and the client picks
  "Phone" from a dropdown. This single change turns bindings into a client feature.
- **C15-5 — widen past 3 blocks.** ⚠ Bean did not adopt the coverage detector (C15-12), but
  `detector-first-commit-gate.py` will DENY the commit at the 4th file. Raise it with him
  when this starts.
- **C15-6 — KEEP `sgs-product/field`.** ⚠ Bean corrected an earlier summary: product cards
  bind normally. `Product_Bindings` has two doorways — `get_product_data()` (:276) is live
  and renders the cards; only the Block-Bindings callback `get_value()` (:65) is unused,
  and it is *unexposed*, not dead. It becomes usable once C15-2/3 land.
- **C15-1 — the version floor, P3.** `sgs-blocks.php:11` declares `Requires at least: 6.7`;
  the filter it needs is `@since 6.9.0` (verified against core on the canary and the
  published hook docs). On 6.7/6.8 the contact patterns print `placeholder — replaced at
  render` and the two CTA buttons have no href. Costs nothing today — the canary is 7.1 and
  is the only target. One line, take it in passing.

---

## Working conditions

**Five tracks share `main`, and it cost real time this session.** Three deploys aborted on
another track's in-flight files; two commits were blocked by ratchets that grew from their
staged work; the shared index was cleared under me once.

- Commit with explicit paths, always. Never `git add -A`.
- Re-check the branch in the same command as the commit.
- If `.git/index.lock` exists, another session is mid-commit — wait, never delete it.
- ⚠ **The cloning track is live in `converter/**`, `helpers-typography.php`,
  `helpers-button-style.php` and the quote/product-card TYPOGRAPHY paths (G4).** If you
  start on `product-card/edit.js`, PING THEM FIRST — their edit there is the typography
  panel, yours would be the media area. Same file, different regions.
- **Bypass tokens go in the COMMAND string**, not in a message file — the hooks read
  `tool_input.command`. Verified tokens: `[gates-ok:]` `[repeat-ok:]` `[batch-ok:]`
  `[truncate-ok:]`, plus `SGS_INSPECTOR_GATE_SKIP` + `_REASON` and
  `SGS_VISUAL_GATE_SKIP` + `_REASON`, both of which log to
  `reports/visual-diff/manual-skips.log`.

⚠ **A ratchet that grew from another track's staged files is not yours to fix or baseline.**
State the evidence, use the scoped bypass, and leave their debt to them.

## Guardrails

- **Enumerate, never recall.** Every figure here came from a command. Re-run before quoting.
- Rule 21 is **82**, never 94 — `--json` serialises BASELINED alongside FLAGGED.
- **Open it and look.** Every wrong call this session came from reading code; every
  correction came from opening the page.
- `node --check` is vacuous on ES modules — copy to `.mjs`.
- Anchor scripts on `__dirname`.
- A JSON round-trip reformats the whole file — insert surgically, then validate.
- **Never write `post_content` to a page the operator has open in the editor.**
- Do not raise a ratchet ceiling to absorb new debt.
- `decisions.md` size is self-healing. Do not investigate it.
