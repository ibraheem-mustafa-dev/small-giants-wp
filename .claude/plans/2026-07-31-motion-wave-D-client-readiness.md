Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this plan, the LEDGER wins.
> ⚠ **GATE 1:** Spec 38 must read `status: active`. **GATE 2:** Waves A, B and C are CLOSED (D414–D417, D422, D424, D426, D427, D430). This wave consumes all three. If a gate fails, STOP.
> ⛔ **DEPLOY HAZARD, PROVEN TWICE.** The shared tree's compiled `build/` contains co-active tracks' uncommitted `render.php` edits, and `assets/` is a separate directory a partial worktree copy silently misses (that error shipped a 404 stylesheet on 2026-07-31 and rendered a hidden SVG as a 1200×1200 black shape). Use the isolated-worktree recipe in Tool bindings and copy **src + includes + scripts + assets + build**.
> ⛔ **NEVER add anything from this plan to `parking.md`.** Bean-ruled 2026-07-31: parking is strictly for BLOCKED or POSTPONED work, never a reminder list. This plan IS the register.
> **This session runs in PLAN MODE first** — investigate, present, get approval, then build.

# Phase — Motion Wave D: client-readiness

**This is a REVIEW session.** You have not been at your PC for several sessions. Read the next
three sections before anything else — they are the "what did we do, where are we, what's left"
walkthrough. Everything after that is the working plan, reordered so it reads top-to-bottom in the
order it will actually be executed.

---

## 1. The timeline — three sessions, in plain English

**Session 1 — Wave C ("does the engine work?")**
Built the actual motion effects: drag-to-scroll galleries, SVG drawing/morphing, text scramble,
image sequences, motion paths. Deployed it. Did NOT check it worked on a real page yet — that was
deliberately left for the next session, and the pre-commit safety gate refused to let anyone claim
otherwise.

**Session 2 — Wave C verification ("prove it actually works")**
Opened the live site and checked. Found real bugs a code-read would never have caught — a
misfiring keyboard-focus check, a colour token that was reverted for good reasons, a menu that
opened 89px in the wrong place. Fixed what was found. Also discovered two measurement tools have
blind spots (see Section 4 below) — worth knowing before you trust any future "PASS" from them.

**Session 3 — Wave D, first pass ("make it usable by a client, not just by us")**
This is the session that produced most of the plan below: making effects reachable from the
block editor, making sure a clean checkout of the code actually builds, checking accessibility
(can someone using only a keyboard operate a pinned scroll section?), and checking the drag
effects work on a touchscreen, not just a mouse. **9 of the 24 steps closed in this one session** (8 original-numbered, plus Step J)
(see the CLOSED table). Two more (the "buybox" drag control) got proven to work by hand but were
correctly refused a full sign-off by the safety gate until a couple of loose ends are tied up.

**Where this leaves us today:** the engine works, most of the client-facing gaps are closed or
have a clear next action, and you looked at the results yourself and found a handful of things
worth fixing that no automated check caught — those are folded into this rewrite (Section 3).

---

## 2. Where we are right now — the honest state

**CLOSED this wave (9 of 24 steps — the 8 below, plus Step J, which is kept in place at its own heading because the reasoning behind it is load-bearing).** Full detail moved to `memory/`; here is the one-line
version of each:

| Was step | What it closed | Commit(s) |
|---|---|---|
| 1 | Touch-drag measured for real (not just reasoned about) on the two motion canaries | `0628800a` |
| 4 | Split the "this block has SVG" signal into two separate signals, so the wrong shape-morph control stops appearing on plain container/hero blocks | `80868f80`, `fb6adccd`, `4a5cb764` |
| 9 | Motion presets added into 3–5 real starter patterns, so inserting a pattern gives a client tasteful movement with zero setup | `c75add9c` |
| 11 | A clean checkout of the code can now run the full build without a private database file | `c674edea` |
| 13 | Keyboard-focus contract for pinned scroll sections written and tested (contract now lives in Spec 38 §3.1) | `b74d2b07` |
| 14 | Every effect's "reduced motion" behaviour is now measured, not just reasoned about | `0628800a` |
| 16 | The image-sequence tool's frame-count is capped and it verifies its own frame files, so it can't silently half-fail | `3a0bf4e5` |
| 17 | Two console errors that appeared in the editor (on every page, motion or not) are gone | `67c91a47`, `d1e164c9`, `82a08b8a`, `350bc9a7` |

**HELD, not closed — the buybox drag control (was Steps 2/3).** This is a case where the safety
net did exactly its job: an agent proved by directly poking the page (cursor turned to a "grab"
hand, a real drag moved the strip, the product picker still worked afterwards) that the drag
control genuinely works — but the automated report could only say "looks right, not fully proven"
and the sign-off gate correctly refused to pass an unverified control. What's still owed: deploy
it properly, confirm the setting comes from the block's own render code rather than from the test
script that proved it, then check the block-editor panel shows the same control. Small, mechanical,
not risky.

**Also folded in — items 22 and 23,** moved into this plan from the parking list on 2026-07-31
because parking is for blocked/postponed work only, and these are planned work with a clear next
action (a keyboard-focus re-check that observes real content instead of inferring from how the
code is built, and a swap of some placeholder test images that were making a working feature look
broken).

**Everything else below is what remains** — reordered into the order it will actually run, with
Bean's rulings from the review folded in as their own steps.

---

## 3. Residual list — beyond this wave

Two items live outside Wave D entirely, still open in `parking.md` (read-only reference — this
plan does not own them, do not edit parking.md from here):

- **`P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR`** — the test pages themselves have some blocks
  the block editor considers "invalid" (7 of 21 blocks on one test page). Cause: those blocks were
  generated by a script writing raw HTML rather than built through the editor, so the markup
  doesn't quite match what the block's own code would have produced. Doesn't affect the frontend;
  makes those specific blocks unopenable for editing until re-inserted.
- **`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE`** — the motion effects panel in the block editor
  is invisible to three automated checks that are supposed to catch "a control that does nothing"
  or "a setting nobody can find". They all skip past it because of how they're scoped. This is why
  a dead control sat there unnoticed for a while — the safety net has a hole exactly where motion
  controls live.

---

## 4. Measurement limits — what future sessions can and cannot check

Discovered during Wave C verification, and they still apply:

- **Chrome DevTools' built-in device-emulation tool cannot simulate "reduced motion" mode at
  all** — there is no setting for it. It also cannot simulate a real mouse-down-drag-up gesture;
  it throws an error if you try. **The only tool that can check either of these is the committed
  Playwright test harness** (`scripts/motion-qa/probe-wave-c.mjs` and friends) — if a future
  session wants to re-verify reduced-motion behaviour or drag behaviour, that is the one instrument
  that actually works.
- **The browser session used for live checks is shared across whatever else is running
  concurrently** — a tab was taken over mid-check by another task once already, producing a false
  reading. Always confirm which tab/page you're actually looking at before trusting a result.

---

## 5. The live test pages (canaries)

- `/motion-canary-wave-c/` (page 2083) — general effects
- `/motion-roster-canary/` (page 2086) — every motion-capable block, one after another
- `/fx-preset-comparison/` (page 2103, **NEW**) — the three scramble-text presets (Subtle/
  Standard/Dramatic) side by side — this is where Bean found the presets timing bug (Section 6)
- Single-effect pages: `/motion-canary-scrub/`, `/motion-canary-pin-scrub/`,
  `/motion-canary-split-reveal/`, `/motion-canary-horizontal-panel/`

---

## 6. Two things explained fresh, no jargon

### 6a. Step 7 — "a background that follows your mouse"

**What it is, in one sentence:** a container's background can glow or shift colour toward
wherever your cursor is hovering, instead of sitting still.

**What already exists:** this exact effect is already built and working on the mega-menu dropdown
panel. Nobody needs to invent it — the question is only how far to spread it.

**Your three choices, in plain terms:**

| | Route A | Route B | Route C |
|---|---|---|---|
| **What you'd get** | The glow effect on the "Container" block only — you'd switch it on for one section at a time | The glow effect built into the shared building-block every section-style block is made from — so every hero, every call-to-action box, every card grid would automatically be able to use it | The glow effect offered as a general-purpose motion option on almost any block in the whole picker |
| **What it risks** | Nothing outside that one block — easiest to undo if you don't like it | Touches a piece of code many other blocks depend on, so a mistake here could ripple into things that have nothing to do with backgrounds. Also: if a client puts light text over a moving glow, the text could become unreadable in places nobody checked | Same shared-code risk as B, but spread even wider, and offered on blocks that don't even have a background for it to work on |
| **Effort** | About 45 minutes | About 2 hours | About 3 hours plus an extra review pass |
| **Undo cost if wrong** | Cheap | Moderate | Hard, once it's live everywhere |

**My recommendation: Route A now.** It gets you the visible feature this week, touches nothing
shared, and lets us check the "is the text still readable when the glow moves under it" question
on one real block before deciding whether it's safe to switch on everywhere.

**The one open question that's genuinely about your taste, not risk:** what should the glow
actually *look* like? Right now there's only one option built — a soft round glow. I can bring you
a few alternatives (a colour that shifts as you move, a subtle pattern that shifts with you, a
reveal that uncovers a second image underneath) if you want to see options before picking.

Full detail if you want it: `.claude/plans/2026-07-31-step7-cursor-follow-background-design-gate.md`.

### 6b. FR-38-12 — "Flip" on filtered product grids

**What it is, in one sentence:** when a client narrows down a grid of products using a filter,
instead of the remaining products just snapping into their new positions, they smoothly glide
there — so a card that was bottom-left slides visibly up to where it now belongs, rather than
teleporting.

**Why it was proposed:** it's a well-known, polished-feeling upgrade for any "filter narrows a
grid" interaction — the kind of touch that makes a site feel expensive.

**Why it can't be built as originally planned:** the plan assumed the filter block and the product
grid block already talk to each other — that choosing a filter tells the grid "re-arrange
yourself now" so the glide effect has a moment to animate. Checking the actual code found that
this conversation doesn't happen. The filter block only shows or hides its own filter *options*
(the little buttons); it never tells the product grid anything. And the product grid re-filters
itself on the server, by reloading, not by rearranging live in the browser. So there's no "the
grid rearranged" moment for the glide effect to attach to — the feature has nothing to animate.

**What's actually being asked of you:** not "should this exist", but "is it worth the redesign".
The two real blocks were the wrong pair for this feature. The right pair — a filter and a grid
that genuinely rearrange live in the browser — exists in WooCommerce's own newer building blocks,
which is a different piece of work with a different risk profile (it touches WordPress's own
grid-refresh mechanism, not ours). Your options: (1) park this as a "nice to have, revisit when we
build on the WooCommerce blocks", (2) commission the redesign now as its own small project, or
(3) drop it. This has been kept as a live decision rather than silently parked, because a
previous review explicitly said not to bury it.

---

## 7. The steps, in execution order

**Reading old step numbers:** several steps below carry a `(was Step N)` note so any earlier
notes or commits that referenced the old number still resolve. The file's reading order is now
the intended execution order — the very last step (the adversarial council re-run) is deliberately
last regardless of what number it carries.

**Phase success criteria (done when):**
- [ ] Nothing in the fx picker is inert on the block it is offered on, and nothing needs a developer to tune it to look right
- [ ] A clean clone of the repo can run `npm run build` to completion — **CLOSED this wave**
- [ ] Motion survives a draft→WordPress clone, or the success definition is amended to say it does not
- [ ] Every drag effect has a measured touch result, not a code-reading claim — **CLOSED this wave**
- [ ] Bean has signed the physics-sandbox shape or ruled it out
- [ ] `sgs/image-sequence` is operable by someone who has never opened a terminal, or it is explicitly agency-only — **CLOSED this wave (tool hardened); the pin/scrub composition question is now its own **Steps F and G** below, per Bean's D435 ruling**

**Entry context (read before starting):**
- `.claude/LEDGER.md` — live status; the Track 3 cell
- `.claude/decisions.md` — **D426, D427, D430, D434, D435** (Wave C build → verify → council → Bean's rulings)
- `.claude/specs/38-SGS-MOTION-SYSTEM.md` — IN FULL, including §11.2's D427 amendment and §3.1's keyboard contract (added D434)
- `reports/visual-diff/*-2026-07-31.md` — per-block reports; each states what it does NOT claim
- `plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs` + `probe-wave-c-editor.mjs` — the re-runnable harnesses, both self-verdicting

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /qc-council | fix-shape validation steps |
| skill | /adversarial-council | the last step (re-review after the wave) |
| skill | /sgs-clone | cloning-lift step |
| skill | /a11y-audit | accessibility steps |
| skill | /brainstorming | palette-audit + pair-library steps |
| cli | build-deploy.py | every deploy |
| cli | probe-wave-c.mjs | touch/reduced-motion steps |
| external | Playwright | all live verification |

---

### Step A — buybox drag: finish what was proven [HELD, was Steps 2/3]
> ⚠ **The code is NOT in the working tree — it is a patch.** Apply it first:
> `git apply reports/visual-diff/buybox-drag-toggle-2026-08-01.patch`
> It was deliberately reverted on 2026-08-01 because leaving it dirty in this SHARED worktree blocked
> the co-active track's deploy. Re-apply it when you start this step, and either commit it honestly
> (once the attribute is proven to come from a real render) or revert it again before you stop.
  **Model:** sonnet
  **Action:** The drag control was proven working by direct browser interaction (cursor became a
  "grab" hand, a real drag moved the strip 0→53px of scroll, the variant picker kept working
  afterwards) but the visual-diff sign-off gate correctly refuses an "INDICATIVE, not proven"
  report. Deploy the control, confirm the emitted attribute is written by `render.php` rather than
  by the proving script's own injection, then check the block-editor inspector panel exposes the
  same toggle.
  **Files:** `src/blocks/buybox/{block.json,edit.js,gallery-col.php}`, `reports/visual-diff/buybox-*.md`
  **Inputs:** **product 540, default variation 541** on the canary ("Mama's Test Box — 48 SKU fixture"; its gallery was deliberately expanded 3→10 images so the strip overflows). The live-injection proof is in `reports/visual-diff/buybox-2026-07-31.md`. ⚠ An earlier draft of this line said "product 1125", which exists nowhere — do not go looking for it.
  **Outcome:** buybox's thumbnail strip drags with a clean sign-off, not a held one.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 30 min
  **Tooling:** wp-cli, WooCommerce, Playwright, build-deploy.py
  **On-Fail:** if the attribute does NOT come from render.php, that is the real defect to fix before re-attempting sign-off.
  **Test:**
  - Happy: thumbs strip overflows and drags on a product page, attribute confirmed server-emitted
  - Edge: simple (non-variable) product — the fallback path
  - Fail: no product context → block renders nothing → do not claim a capture
  - Integration: drag must not interfere with the variant picker's own pointer handling

## QA Gate A — no inert controls remain
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step A
  **Check:** For every block in `generated-fx-qualifying-blocks.json` with `draggable`, AND every block with its own `dragToScroll` attr, a `reports/visual-diff/<block>-<date>.md` exists showing `cursor: grab` and `scrollWidth > clientWidth`, with a clean (not held) verdict.
  **Pass:** every drag-capable block has that evidence, or has no control.
  **Fail:** remove the control; do not baseline the gap.
  **Marker:** QA

---

### Step B — Testimonial slider: fix the arrow proportions (Bean finding, split 1 of 2)
  **Model:** haiku
  **Action:** Bean's ruling: this and Step C were reported as one "slider defect" and they are not
  — two unrelated causes needing two unrelated fixes. This step is the arrow only. The prev/next
  buttons render a bare `‹`/`›` text character inside a 44px circular button
  (`render.php:369-370`), and that character measures roughly 8×27px — a thin, off-centre mark
  rattling around inside a much bigger circle. Replace it with the SVG chevron icon already used
  elsewhere in the framework (`lucide-icons.php` `chevron-left`/`chevron-right`, already the
  pattern used by `accordion-item` and `nav-menu`), sized and centred to fill the button properly.
  **Files:** `src/blocks/testimonial-slider/render.php` (lines ~369-370), `style.css` (`.sgs-testimonial-slider__arrow`)
  **Inputs:** `includes/lucide-icons.php:421,424` (`chevron-left`/`chevron-right` SVGs)
  **Outcome:** the arrow glyph visually fills its 44px button the way the icon-based arrows do elsewhere in the framework.
  **Exec:** PARALLEL with Step C · **Deps:** none · **Time:** 20 min
  **Tooling:** Playwright (screenshot before/after — this is a look-at-it defect)
  **On-Fail:** revert to the text glyph; the button's click target and aria-label are unaffected either way.
  **Test:**
  - Happy: arrow icon is visually centred and proportionate inside the 44px circle
  - Edge: hover/active/focus states still render correctly with the new icon
  - Fail: a screenshot at 375/768/1440 all show the same proportion — no viewport-dependent regression
  - Integration: `aria-label="Previous/Next testimonial"` unchanged; keyboard activation unchanged

### Step C — Testimonial slider: fix the dot contrast (Bean finding, split 2 of 2)
  **Model:** haiku
  **Action:** The idle-state navigation dots use `var(--wp--preset--color--border-subtle, #0D5557)`
  (`style.css:220`) against the slider's background, measuring 1.29:1 — a near-invisible contrast
  failure, unrelated to the arrow defect in Step B. **Read Step D below before fixing this** — the
  fallback colour here (`#0D5557`) is itself an instance of the wider palette-integrity problem
  Step D is auditing, so fix this dot against whatever Step D determines `border-subtle` SHOULD be,
  not by picking an arbitrary new colour that then has to be redone.
  **Files:** `src/blocks/testimonial-slider/style.css` (`.sgs-testimonial-slider__dot::before`, lines ~215-225)
  **Inputs:** Step D's palette-audit findings; WCAG 2.1 AA — UI component contrast floor is 3:1
  **Outcome:** idle dots are visible against the slider background at 3:1 or better.
  **Exec:** SEQUENTIAL · **Deps:** Step D · **Time:** 20 min
  **Tooling:** Playwright, a contrast calculator
  **On-Fail:** if Step D's fix already resolves this by correcting the token, this step may close with zero code change — verify before writing new CSS.
  **Test:**
  - Happy: idle dot measures ≥3:1 against the slider background on every client palette
  - Edge: hover/active dot states (already teal/primary) remain visually distinct from idle
  - Fail: fix must not defeat the active-dot's own hover/active colour change
  - Integration: same token used by any other component reading `border-subtle` should not regress (see Step D)

### Step D — Palette-integrity audit: right colours in the right slots (Bean's biggest new finding)
  **Model:** sonnet
  **Action:** **Framework-wide, not a testimonial-slider fix — this is the bigger finding Step C's
  dot problem was a symptom of.** `border-subtle` — a slot meant to be a quiet, low-contrast
  neutral divider colour — is set to a *saturated brand accent* colour in 7 of 8 client palette
  snapshots (orange, green, gold, plum, blue); only `helping-doctors` has it as a genuine neutral.
  The framework's own base `theme.json` sets it to `#D4DBE5` (a correct light neutral), but the
  component-level CSS fallback (`var(--wp--preset--color--border-subtle, #0D5557)`, a dark teal) is
  ALSO wrong — it doesn't match the token it's supposedly falling back to. Audit EVERY preset
  colour slot across EVERY client palette (`theme/sgs-theme/theme.json` + all 8
  `sites/*/theme-snapshot.json`) for: (a) a colour that doesn't match the ROLE its slot name
  implies (a "subtle/muted" slot holding a saturated brand colour is the class of bug found here),
  (b) any slot missing entirely in a given palette, (c) any duplicated slot definition.
  **Files:** `theme/sgs-theme/theme.json`, `sites/*/theme-snapshot.json`, any component CSS with a
  hardcoded `var(--wp--preset--color--X, #hex)` fallback that disagrees with X's intended role
  **Inputs:** the 7-of-8 finding above; Spec 33 (draft global-styles extractor) for how snapshots are generated
  **Outcome:** a named list of every slot/palette mismatch, missing entry and duplicate, with each one fixed to the colour that role actually implies — right colours in the right slots, everywhere, not just on one block.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 1.5 h
  **Tooling:** /brainstorming (agree the audit method before running it wide), /sgs-wp-engine
  **On-Fail:** if a client's saturated `border-subtle` turns out to be a deliberate design choice for that client (verify against that client's own `sites/<client>/CLAUDE.md` before assuming it's a bug), record it as intentional and move on — do not silently overwrite an owner's deliberate brand choice.
  **Test:**
  - Happy: every "subtle/muted/light" slot name across all 8 palettes measures as visually quiet against its typical background, not brand-saturated
  - Edge: a palette that deliberately wants a stronger border (confirm against that client's CLAUDE.md before "fixing" it)
  - Fail: a slot present in `theme.json` but absent from a snapshot is reported, not silently defaulted
  - Integration: re-run Step C's dot-contrast check against the corrected token on all 8 palettes

---

### Step 5 — Morph on any block (Bean ask #1) [SESSION-START]
  **Model:** inline
  **Action:** `fx-morph.js` rewrites `el`'s own `d`, so today the traveller must itself be a shape. Bean wants morph reachable from any block. Design and build the render-layer hop: a `-morph-source` selector, or the same descendant-attachment pattern `sgs_fx_data_attr_string()` already provides, so a block's CONTAINED SVG morphs. Then build the curated matched-topology pair library and the §7 asset gate.
  **Files:** `includes/fx-attributes.php`, a new pair-library data file, `src/blocks/extensions/fx.js`, `fx-morph.js` (read-only if possible)
  **Inputs:** D427's signed preset-first design; the `svg`/`svg-subtree` split closed this wave means `morph` is now correctly scoped to real shape-bearing blocks before this step widens its reach
  **Outcome:** a client picks a shape pair from thumbnails on any block, and it morphs.
  **Exec:** SEQUENTIAL · **Deps:** none (prerequisite split already closed) · **Time:** 2.5 h
  **Tooling:** /brainstorming (pair library), /qc-council before build
  **On-Fail:** ship the control gated to shape-bearing blocks only; do not ship an unreachable control (`SHIPPED_EFFECTS` exists to prevent exactly that).
  **Test:**
  - Happy: a `sgs/icon` inside a `sgs/container` morphs between a preset pair
  - Edge: block contains MULTIPLE SVGs — which is chosen, and is that predictable?
  - Fail: mismatched topology → warn and skip, element stays at its rendered shape
  - Integration: reduced motion = SUPPRESS (final shape only), per §10

## QA Gate B — morph is reachable and safe
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step 5
  **Check:** `morph` appears in `SHIPPED_EFFECTS` AND a live canary instance morphs AND a deliberately mismatched pair produces a console warning with the element unchanged.
  **Pass:** all three.
  **Fail:** remove `morph` from `SHIPPED_EFFECTS` and re-run.
  **Marker:** QA

### Step 6 — before/after video and SVG sources (Bean ask #2)
  **Model:** sonnet
  **Action:** `sgs/before-after` renders via `wp_get_attachment_image()` with a URL fallback — not
  the shared media helper — so no video, and SVG only as a flat image. Bean ruled this KEPT (the
  council's delivery lead wanted it cut; Bean overrode, and the competitor persona agreed with
  Bean: it is what every physio/beauty/renovation brief asks for). Adopt `sgs/media`'s proven
  `mediaType` fork rather than inventing a second media model.
  **Files:** `src/blocks/before-after/{block.json,edit.js,render.php,view.js,style.css}`
  **Inputs:** `sgs/media`'s mediaType implementation; `reports/visual-diff/before-after-2026-07-31.md`
  **Outcome:** before/after compares two videos, two images, or a mix, with synchronised playback for the video case.
  **Exec:** PARALLEL with Step 6b · **Deps:** none · **Time:** 1.5 h
  **Tooling:** /wp-block-development
  **On-Fail:** ship image+SVG only and record video as owed — do NOT ship a half-working video path.
  **Prompt:** *(generate at dispatch.)*
  **Test:**
  - Happy: two videos, both playing, divider splits them in sync
  - Edge: videos of different durations / one fails to load
  - Fail: JS blocked → both media still present, CSS-only split still correct (the existing fail-open contract)
  - Integration: reduced motion — autoplay must not fire; §10 SIMPLIFY for the drag

### Step 6b — before/after: all FOUR reveal directions (Bean ask #5)
  **Model:** sonnet
  **Action:** The block currently reveals AFTER on the LEFT (horizontal) — coherent, and Bean has
  ruled it stays the DEFAULT. Add the other three directions as options: horizontal reversed
  (after on the right, the more common convention), vertical after-on-top, and vertical
  after-on-bottom. `orientation: horizontal|vertical` ALREADY EXISTS as an attribute and the
  vertical `clip-path` already exists in `style.css:64-66`; what is missing is a REVERSE option per
  axis, and the matching label ordering.
  **Files:** `src/blocks/before-after/{block.json,edit.js,render.php,style.css}`,
  `reports/visual-diff/before-after-*.md`
  **Inputs:** `reports/visual-diff/before-after-labels-2026-07-31.md` — read it first. It records
  the defect fixed on 2026-07-31 (labels sat over the WRONG image because `__labels` is
  `justify-content: space-between`, render.php emits BEFORE first, and the clip puts AFTER on the
  left) and the CSS `order` fix. **Every new direction needs its own label-order rule or it
  reintroduces exactly that bug** — which no numeric probe caught, because they all asked whether
  the divider MOVED and none asked what was on each side of it.
  **Outcome:** four working reveal directions, each with labels sitting over the image they name.
  **Exec:** PARALLEL with Step 6 · **Deps:** none (but coordinate: same block as Step 6's video
  work — do them in one agent or sequence them) · **Time:** 45 min
  **Tooling:** Playwright (screenshot each direction — this is a LOOK-AT-IT defect class)
  **On-Fail:** the current default is correct and shipped; a failed variant is revertible alone.
  **Prompt:** *(generate at dispatch — it MUST require a screenshot per direction with the label
  side measured against the clipped image's src, not just "the divider moved".)*
  **Test:**
  - Happy: each of the 4 directions reveals the right image on the right side, labels matching
  - Edge: dragging to 0% and 100% in each direction — no flipped or stranded label
  - Fail: reduced motion + keyboard range input still operate every direction
  - Integration: the drag gesture and the native range input must agree in all four

### Step 23 — Replace the before/after test imagery
  **Model:** haiku
  **Action:** At ≤768px both `sgs/before-after` canary instances show a small black/white
  checkerboard mark in the top-left corner, overlapping the "After" label. PROVEN (not guessed) to
  be baked into the source test images: `frame_0001.webp` / `frame_0048.webp` carry the marker even
  when loaded with zero page styling. It is the frame-index stamp the motion-canary test-image
  generator puts on every frame. `object-fit: cover` crops it out above ~1024px and back into frame
  below it — which is why it reads as a responsive bug and is not one. Swap in real photography so
  the canary stops showing a defect that is not in the code.
  **Files:** canary media only — no source change
  **Outcome:** the before/after canary can be judged on its own merits without a false defect on it.
  **Exec:** PARALLEL with anything · **Deps:** none · **Time:** 15 min
  **On-Fail:** none — worst case the marker stays and is a known cosmetic artefact of test media.
  **Test:**
  - Happy: no marker at 375/768; labels sit over the image they name (do not regress the D431 fix)
  - Edge: check 1024 and 1440 too — the crop behaviour differs by width
  - Fail: if a marker persists with real imagery, it is NOT the source images and needs re-diagnosis
  *(Was briefly filed in parking.md; Bean moved it here 2026-07-31 for the same reason as Step 22.)*

---

### Step E — Motion-path: fix the skew, two fixes required together (Bean ruling D3, approved)
  **Model:** sonnet
  **Action:** An element moving along a motion path renders skewed/rotated wrongly, and separately
  jumps ~2,705px on load. **Two independent causes, BOTH must be fixed — neither alone solves it.**
  (1) `preserveAspectRatio="none"` at `includes/fx-path-routes.php:324` is what causes the
  skew/rotation. (2) The element has no local positioned wrapper, so GSAP's MotionPath measures
  against the nearest positioned ancestor — which today is `.entry-content`, a 7,934px-tall block —
  producing the huge jump. Fix both; this is class-wide, not specific to one canary: any block
  using motion-path outside a positioned container will show the same jump.
  **Files:** `includes/fx-path-routes.php` (line ~324), the motion-path runtime module, any block
  template using `motion-path` without its own positioned wrapper
  **Inputs:** D435 (Bean's approval + the two-stacked-fix diagnosis); Spec 38 §3.3 MotionPath section
  **Outcome:** motion-path elements travel along the path without skew and without an oversized initial jump, on every qualifying block, not just the canary.
  **Exec:** PARALLEL with Steps F/G · **Deps:** none · **Time:** 1 h
  **Tooling:** Playwright (measure the actual travel distance + rotation, don't eyeball it)
  **On-Fail:** if fixing only one of the two still leaves a visible defect, that confirms both are load-bearing — do not ship a half fix.
  **Test:**
  - Happy: element travels the path with correct orientation and starts at the path's actual start point, not 2,705px away
  - Edge: a motion-path block nested inside another positioned container — does the wrapper fix still measure correctly?
  - Fail: skew persists after the `preserveAspectRatio` fix alone → the wrapper fix is also required, confirm both landed
  - Integration: reduced motion (§10 SUPPRESS) still lands the element at its final path position

### Step F — Image-sequence: scrub only while fully visible (Bean ruling D4, part 1 of 2)
  **Model:** sonnet
  **Action:** **Bean rejected the block's own documented workaround** (compose it inside
  `sgs/container` with pin+scrub) as janky, useless to anyone who doesn't want pinning, and
  patchwork — remove that docblock guidance once this is fixed. Today the scrub treats a mere
  sliver of the canvas on screen as "visible", so it is still scrubbing frames when the canvas is
  mostly scrolled past. It must run ONLY while the canvas is FULLY on screen, by default.
  **Read the code before touching it:** `fx-image-sequence.js:396-412` already documents a decision
  table showing a shorter same-anchor scroll window was tried and rejected — it produced a "mirror"
  defect (everything happens at the very start, then the last frame freezes for the rest of the
  scroll). **This is not "just shorten the range" — it needs a genuinely different anchoring
  method**, most likely one keyed to "canvas top enters viewport" through "canvas bottom leaves
  viewport" rather than a fixed pixel window. `end` is already per-instance overridable via
  `data-sgs-fx-end` (line 418) if a client needs a non-default range.
  **Files:** `src/blocks/image-sequence/fx-image-sequence.js` (lines ~396-412), its docblock
  **Inputs:** the documented decision table at lines 396-412; Bean's D435 ruling
  **Outcome:** the scrub anchors to full-visibility by default, without reintroducing the
  previously-rejected mirror defect.
  **Exec:** PARALLEL with Steps E/G · **Deps:** none · **Time:** 1.5 h
  **Tooling:** Playwright (scroll through the full range and capture frame progress at each step)
  **On-Fail:** if the new anchoring reproduces the mirror defect, that confirms the documented
  rejection was correct — try a different anchor method, do not fall back to the old sliver-visible behaviour.
  **Test:**
  - Happy: scrub starts only once the canvas is fully in view and ends before it starts leaving
  - Edge: a canvas taller than the viewport — can it ever be "fully" visible? Define the fallback.
  - Fail: re-run against the documented mirror-defect symptom (everything at the start, frozen last frame) — must NOT reproduce it
  - Integration: Step G's pin option must compose with this anchoring, not fight it

### Step G — Image-sequence: pin as a first-class block option (Bean ruling D4, part 2 of 2)
  **Model:** sonnet
  **Action:** Pinning must become a customisable option INSIDE the block itself, like its other
  controls — not something a client has to know to compose manually inside `sgs/container`. If
  scrub-while-visible (Step F) and pinning genuinely cannot coexist cleanly on the same element, the
  block MAY emit its own internal pin wrapper so it behaves like the current ad-hoc `sgs/container`
  composition but is intuitive: a client ticks a box, they don't build a structure.
  **Files:** `src/blocks/image-sequence/{block.json,edit.js,render.php,fx-image-sequence.js,style.css}`
  **Inputs:** Step F's anchoring fix; the rejected docblock guidance being removed by Step F
  **Outcome:** "pin while scrubbing" is a toggle in the inspector, not a composition instruction in a docblock.
  **Exec:** SEQUENTIAL · **Deps:** Step F · **Time:** 2 h
  **Tooling:** /wp-block-development, Playwright
  **On-Fail:** ship without the internal-wrapper fallback and document pin as "compose inside a container" as an interim state — but only if the internal wrapper genuinely cannot be built safely; do not ship a docblock-only answer as done.
  **Test:**
  - Happy: pin toggle ON → canvas pins and scrubs through its full range, then releases
  - Edge: pin toggle ON but the block is the only content on the page (no scroll room below it)
  - Fail: pin toggle OFF → behaves exactly as Step F specified, no pinning artefact left behind
  - Integration: reduced motion + pin together — pin should not itself become autonomous motion once released

### Step H — Scramble-text presets: fix the timing (Bean's live finding on the new canary)
  **Model:** sonnet
  **Action:** On the new preset canary (`/fx-preset-comparison/`, page 2103) Bean found: Subtle and
  Dramatic animate at very similar times, and Balanced only fires after scrolling much further down
  the page than the other two. **The measured parameter differences between the presets were real**
  (confirmed by prior measurement) — **the TIMING behaviour those parameters produce is not what
  they imply.** This is a fresh defect only visible once a canary existed to compare all three side
  by side — investigate why Balanced's scroll trigger point diverges from the other two, and why
  Subtle/Dramatic read as near-identical despite different declared parameters.
  **Files:** `src/blocks/extensions/fx-presets.json`, the scramble runtime module, `fx-attributes.php`
  **Inputs:** `/fx-preset-comparison/` (page 2103); the prior parameter-level measurement (correct) vs this timing-level finding (wrong)
  **Outcome:** Subtle, Standard/Balanced and Dramatic are visibly, meaningfully distinct from each other, each firing at a sensible point in the scroll.
  **Exec:** PARALLEL with Steps E/F/G · **Deps:** none · **Time:** 1 h
  **Tooling:** Playwright (capture trigger scroll-position + animation duration per preset)
  **On-Fail:** if the presets' scroll-trigger settings are the cause, fix at the preset definition, not by hacking the runtime per-preset.
  **Test:**
  - Happy: three presets fire at three visibly different points/speeds on `/fx-preset-comparison/`
  - Edge: presets applied to a heading near the very top of a short page (little scroll room)
  - Fail: re-run the original parameter-level measurement — must still hold (this is a timing bug, not a parameter regression)
  - Integration: reduced motion still suppresses scramble entirely for all three presets

---

### Step 7 — Background cursor-follow effects (Bean ask #4) [DESIGN GATE — HANDOFF]
  **Model:** inline
  **Action:** Present Bean the plain-English explainer in Section 6a above and get a route choice
  (A/B/C or not now) plus a decision on the visual look. Do NOT build until signed. See Section 6a
  for the ADHD-friendly version of this decision — read that, not this line, before deciding.
  **Files:** Spec 38 (new FR-38-25 if Route A signed), `class-sgs-container-wrapper.php` (Route B/C only)
  **Inputs:** `.claude/plans/2026-07-31-step7-cursor-follow-background-design-gate.md` (full detail)
  **Outcome:** a signed route + look, or an explicit "not now".
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** HANDOFF · **Time:** 15 min decision + 45 min–3 h build depending on route
  **On-Fail:** n/a — a decision, not a build.
  **Test:**
  - Happy: Bean picks a route from the menu in Section 6a
  - Edge: he wants the look explored first before committing to a route — bring options per Section 6a Q2
  - Fail: no decision → it stays a live gate here, NOT a parking entry
  - Integration: whatever is signed amends Spec 38 the SAME session it's built

### Step 8 — DESIGN GATE: physics sandbox (Bean ask #3) [HANDOFF]
  **Model:** inline
  **Action:** Present Bean a ranked menu; do NOT build. **Correct the record first:** GSAP absolutely CAN do this — InertiaPlugin + Physics2DPlugin + Draggable give throwable objects with velocity, gravity and bounce, and both plugins are already bundled and free. The objection is NOT capability. It is (a) FR-38-14 says physics are easing FLAVOURS, "never standalone toggles", so a sandbox is out of spec as written; and (b) the accessibility auditor's specific point: every current drag effect clears WCAG 2.5.7 because it maps onto a discrete single-pointer alternative (a range input, arrow buttons, dots) and a thrown object has none, while objects still moving after release are AUTONOMOUS motion, so the "drag survives reduced motion" reasoning does not transfer.
  **Files:** Spec 38 (amend §2/§3.3 if Bean signs), `.claude/decisions.md`
  **Inputs:** D430; FR-38-13's unbuilt "hero decorative layers (draggable ornaments)" — the nearest thing already in spec
  **Outcome:** Bean signs a shape with an accessibility answer, or rules it out.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** HANDOFF · **Time:** 30 min
  **On-Fail:** n/a — a decision, not a build.
  **Test:**
  - Happy: Bean picks from a ranked menu
  - Edge: he wants it anyway without an a11y answer → record the accepted risk explicitly
  - Fail: no decision → it stays a live gate, NOT a parking entry
  - Integration: whatever is signed must amend Spec 38 the SAME session

### Step I — DESIGN GATE: Flip on filtered grids, FR-38-12 (restored to the menu) [HANDOFF]
  **Model:** inline
  **Action:** Present Bean the plain-English explainer in Section 6b above. The premise D426 found
  false (the two named blocks don't actually talk to each other) means this needs a genuine
  decision, not a quiet drop — D426 + D434 both explicitly kept it live rather than parking it.
  **Files:** Spec 38 (§3.3 FR-38-12, amend or retire per Bean's answer), `.claude/decisions.md`
  **Inputs:** D426 (the false-premise finding), D434 ("Open for Bean" list)
  **Outcome:** Bean picks park-for-later / commission the WooCommerce-blocks redesign now / drop it.
  **Exec:** SEQUENTIAL · **Deps:** none · **Marker:** HANDOFF · **Time:** 15 min
  **On-Fail:** n/a — a decision, not a build.
  **Test:**
  - Happy: Bean picks one of the three options in Section 6b
  - Edge: he wants a fourth option not listed — capture it as its own line in Key Judgement Calls below
  - Fail: no decision → stays a live gate here, never silently dropped from the spec
  - Integration: whatever is decided amends Spec 38 §3.3 the same session

---

### Step 10 — Preset + param normalisation OUTSIDE the editor
  **Model:** sonnet
  **Action:** Preset application and stale-param clearing live in the editor's control handlers, so content arriving from a pattern, a clone or the converter bypasses both. Measured this session: setting `fxPreset` via the data store wrote no params, and `fxSplit: "chars"` survived a switch to `scrub`. Move normalisation to a render-time or `register_block_type` filter so stored content is normalised regardless of origin.
  **Files:** `includes/fx-attributes.php`, `src/blocks/extensions/fx.js`
  **Inputs:** the `/qc-inline` partials recorded in D430
  **Outcome:** a cloned or pattern-authored block behaves identically to a hand-configured one.
  **Exec:** SEQUENTIAL · **Deps:** none (prerequisite pattern-presets work already closed) · **Time:** 45 min
  **On-Fail:** the editor path already works; a failed filter is revertible with no data loss.
  **Test:**
  - Happy: attributes set via the data store produce the same rendered result as via the UI
  - Edge: a preset name that no longer exists in `fx-presets.json`
  - Fail: params for a non-active effect are stripped, not silently rendered
  - Integration: must not fight `/sgs-update`'s attr extraction

## QA Gate C — client-operability
  **Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Step 10
  **Check:** Insert a stock pattern on a clean page, publish, and load it. Motion is present, correctly ranged, and required zero inspector interaction.
  **Pass:** effects fire; `probe-wave-c.mjs`-style assertions hold on a pattern-authored page.
  **Fail:** the pattern-presets work already closed this wave — if this fails, that is a regression, not a fresh gap.
  **Marker:** QA

### Step 12 — The cloning lift: motion that survives a draft (§11.3, FR-38-22)
  **Model:** inline
  **Action:** Grep confirms **zero** `data-sgs-fx` handling anywhere in `scripts/converter/`. §11.3 defines the mapping and defers the build. The competitor persona named this the one thing they could not buy their way out of; the cynic named it "the framework's stated purpose", absent. Build the lift as a Spec 31 §3.A routing-unit class, with the Rule 4 skip-with-reason report already specified.
  **Files:** `scripts/converter/**`, Spec 31 §3.A, Spec 38 §11.3
  **Inputs:** §11.2's grammar including `-shape`/`-path`/`-momentum`
  **Outcome:** a draft carrying `data-sgs-fx="pin-scrub"` clones into a WordPress page with the effect intact.
  **Exec:** SEQUENTIAL · **Deps:** Step 10 (prerequisite `svg`/`svg-subtree` split already closed) · **Time:** 3 h
  **Tooling:** /sgs-clone, /qc-council before build
  **On-Fail:** if it cannot land this wave, AMEND the success definition to say motion is applied by hand after a clone — do not leave the claim standing unbuilt.
  **Test:**
  - Happy: draft HTML in → live WP page out → effect fires
  - Edge: an unrecognised `data-sgs-fx` value → skip-with-reason, per class, never silent
  - Fail: fx on a block whose resolved slug declares no fx attrs → reported, not coerced
  - Integration: Stage 11.6 computed-parity must not regress

### Step 15 — Per-breakpoint motion disable
  **Model:** sonnet
  **Action:** §6 item 4 says per-tier fx values are a v2 candidate. But "turn animation off on mobile" is, per the competitor persona, the single most common post-launch agency request — and it needs only a BOOLEAN per tier, not per-tier values. Add `fxDisableTablet`/`fxDisableMobile` using the EXISTING breakpoint suffix vocabulary, gating both the registry's enqueue and the module's matchMedia.
  **Files:** `includes/fx-attributes.php`, `class-sgs-motion-registry.php`, `src/blocks/extensions/fx.js`, seeder
  **Outcome:** a client can switch an effect off per device tier.
  **Exec:** SEQUENTIAL · **Deps:** Step 10 · **Time:** 1 h
  **Test:**
  - Happy: disabled on mobile → zero GSAP bytes on a mobile viewport
  - Edge: disabled on ALL tiers → same as no effect
  - Fail: attr present but registry still enqueues → the byte claim breaks
  - Integration: FR-38-3's zero-bytes promise must still hold

### Step 18 — Support surface for Bean
  **Model:** sonnet
  **Action:** Skip-with-reason writes to `error_log` behind `WP_DEBUG` — on Hostinger, Bean will never see it. When a client says "the animation is broken" there is nothing to look at. Build an admin panel listing effects in use on a page, bytes shipped, and effects skipped with reason.
  **Files:** a new admin page under the SGS settings surface
  **Outcome:** Bean can diagnose a motion complaint without SSH.
  **Exec:** PARALLEL with Step 19 · **Deps:** none · **Time:** 1 h
  **Test:**
  - Happy: a page with 3 effects lists all 3 + byte total
  - Edge: a page with zero effects says so plainly
  - Fail: a skipped effect appears WITH its reason
  - Integration: must not run on the frontend

### Step 19 — Per-PAGE motion budget
  **Model:** haiku
  **Action:** `check-motion-bundle-budget.py` measures modules, not pages. Pin-scrub + split-reveal + draw + scramble + an image sequence is constructible in the editor and lands ~55 KB gz against Spec 02's <50 KB. Assert per-page in the canary probe and warn in the editor.
  **Files:** `scripts/check-motion-bundle-budget.py`, `probe-wave-c.mjs`
  **Outcome:** the budget claim is enforced where it is actually spent.
  **Exec:** PARALLEL with Step 18 · **Deps:** none · **Time:** 45 min
  **Test:**
  - Happy: a heavy page trips the warning
  - Edge: exactly at the threshold
  - Fail: §4.4 declares Tier G "OUTSIDE" the Spec 02 budget — decide whether that exemption stands and record it
  - Integration: must not fire on a zero-motion page

### Step 20 — Spec ↔ code reconciliation
  **Model:** sonnet
  **Action:** Close the spec-lawyer's divergence table: add `data-sgs-fx-momentum` to §11.2's grammar; mark `fxShape`/`fxPath` seed status honestly in §11.3; retire the dead `scroll-smoother` `fx_effects` row (D422 moved smoothing to Lenis/Tier H); correct `generate-fx-qualifying-blocks.py`'s stale comment claiming `sgs/image-sequence` does not exist; wire or delete `sgs_get_fx_qualifying_blocks()` (zero callers today while its docstring claims the render layer uses it). (The nine "UNSHIPPED — placeholder" seeder annotations this step originally targeted were resolved by the `svg`/`svg-subtree` split closed this wave — re-check before re-doing that part.)
  **Files:** Spec 38, `seed-motion-fx-registry.py`, `generate-fx-qualifying-blocks.py`, `class-sgs-motion-registry.php`
  **Outcome:** two competent implementers reading the spec build the same thing.
  **Exec:** SEQUENTIAL · **Deps:** Step 15 · **Time:** 1 h
  **Test:**
  - Happy: every grammar attr has a control, a DB row and a consumer — both directions
  - Edge: a generated file with no reader is deleted, not documented
  - Fail: `--self-test` proves each new gate can fail
  - Integration: `/sgs-update` reproduces the seed byte-identically

### Step J — Motion seeding + artefact regeneration into `/sgs-update` [✅ DONE 2026-08-01, D436]

  **Status: COMPLETE, both halves.** Commits `075baa9b` (the database layer) and `c112ba7d`
  (Stage 12, the artefact regeneration). Kept here rather than moved to the completed table because
  the *reason* it was done is load-bearing for anyone who later touches motion data.

  **What Bean asked for, in two parts.** First: *"motion seeding needs to be worked into the
  sgs-update pipeline and not be some independent competing script that gets forgotten about or we
  end up losing all our motion/FX data."* Then, on the half that was initially deferred: *"the
  sgs-update motion layer should also update the data into the artefacts for use in the actual
  websites. The DB is the centre of it... the main point of adding this data to the db was to make
  sure these artefacts are always up to date."*

  **Why it mattered (D432 is the proof, not a theory).** Two scripts wrote the same database column
  without knowing about each other. An unrelated track simply running the normal updater swept up 7
  motion rows and broke both tracks at once. **And the hand-written patch for that incident was
  ALREADY incomplete** — 8 blocks carry real fx attributes but only 4 of the 7 patched blocks had
  entries; `sgs/buybox` was undeclared and would have hit the identical failure next time its rows
  were recreated. A list of exceptions cannot keep up. A mechanism can.

  **What shipped.** The fx namespace is a native layer inside `/sgs-update`, importing the seeder's
  own dictionary so there is ONE definition rather than a copy that drifts. The seeder is
  verify-only. Stage 1 runs it. **Stage 12 (new — the pipeline is now 12 stages) regenerates all
  four artefacts the live websites load.** The 7 hand-written override rows are gone.

  **The trap that was avoided, and it is worth knowing.** "Regenerate from the DB" misdescribes
  these artefacts. Two come from the database alone — but `generated-fx-qualifying-blocks.{php,json}`
  are a **JOIN**: effect facts from the database, UNION block facts read from `block.json`,
  `edit.js` and `style.css`. A naive database-only regeneration would have dropped that half and
  produced **confidently wrong** artefacts — worse than stale ones, because they would look freshly
  generated.

  **One writer per artefact, which was the whole point.** Stage 12 writes; the build only verifies
  (`--check`). `run-motion-fx-generators.js` was already check-only — verified by reading it, not
  assumed. Had it been a writer too, the two-writer bug would have been recreated one commit after
  being fixed.

  **⚠ Carry this forward:** if you ever add another generator, check whether the build also writes
  it. Two writers to one artefact are unfalsifiable — you cannot tell which one won.

---

### Step 22 — Pin/panel keyboard contract: observe it, don't infer it
  **Model:** sonnet
  **Action:** The keyboard story for both pinning effects was measured and closed (Spec 38 §3.1) —
  but every canary fixture with an active pin contains NO focusable element inside the pin. So the
  one case accessibility review actually worried about (a Tab press landing on a control while the
  panel is pinned) has never been exercised. The recorded pass is by MECHANISM (the pin does not
  trap focus, reasoned from how it is built), not by OBSERVATION. Build a fixture with real
  interactive content inside a pinned section — links, a button, a form field — and re-run the
  probe against it.
  **Files:** a new canary fixture; `scripts/motion-qa/probe-step13-pin-focus.mjs` (extend)
  **Inputs:** Spec 38 §3.1's keyboard focus contract (added D434); `probe-step13-pin-focus.mjs`
  **Outcome:** the contract is observed, not inferred — or a real 2.4.11 defect surfaces.
  **Exec:** SEQUENTIAL · **Deps:** none · **Time:** 40 min
  **On-Fail:** if focus IS trapped or scrolled out of view, that is a genuine WCAG 2.4.11 failure
  and outranks the rest of the wave.
  **Test:**
  - Happy: Tab onto a button inside an active pin → focus visible, pin does not desync
  - Edge: Tab THROUGH the pinned content and out the far side
  - Fail: focused control scrolls out of view → 2.4.11 failure, must be fixed
  - Integration: reduced-motion arm must preserve the same focus order
  *(Was briefly filed in parking.md; Bean moved it here 2026-07-31 — parking is strictly BLOCKED or
  POSTPONED work, and this is planned work with a named next action.)*

---

### Step 21 — Re-run the adversarial council [HANDOFF — DELIBERATELY LAST]
  **Model:** inline
  **Action:** Run `/adversarial-council` again on the post-Wave-D surface to catch what these fixes introduced. The 2026-07-31 run found what a single reviewer never would; a second round after the fixes is the documented two-round pattern.
  **Outcome:** a fresh convergence map, and grades to compare against B−/B−/C+/C+/C−/D+.
  **Exec:** SEQUENTIAL · **Deps:** every other step in this file, with no exceptions · **Marker:** HANDOFF · **Time:** 30 min
  **Test:**
  - Happy: supportability rises above D+
  - Edge: a fix introduced a new convergent finding — that is the point
  - Fail: council findings are HYPOTHESES — fact-check before acting (D435's `/qc-council` re-check found no code regression, but that was verified, not assumed)
  - Integration: feeds the next wave

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Does the cloning lift (Step 12) land this wave, or does the success definition change?
  - **Options:** [A] build it now · [B] defer and amend Spec 38's success definition to say motion is hand-applied post-clone · [C] leave it unbuilt and unamended
  - **Recommendation:** [A], and if it slips, [B] — never [C]
  - **Why:** two independent personas called it the product's whole point and the one thing a competitor cannot buy. [C] leaves a standing claim that is false.
  - **Cost of wrong choice:** the framework's headline differentiator stays at zero lines of code while the spec says otherwise.
  - **Who decides:** Bean

- **Decision:** image-sequence — the pin/scrub composition is now DECIDED (Bean rejected the
  ad-hoc `sgs/container` answer, D435) — Steps F/G above are the build. The remaining open decision
  is only sequencing: does Step G's internal pin wrapper ship this wave, or is a documented interim
  ("compose inside a container, still works, just not as polished") acceptable for one more wave?
  - **Options:** [A] both F and G this wave (~3.5 h total) · [B] F only this wave, G next wave with an honest interim note
  - **Recommendation:** [A] — Bean explicitly called the interim state "janky" and "patchwork"; shipping it again after saying that is a regression against his own ruling.
  - **Who decides:** Bean

- **Decision:** Does Tier G stay exempt from Spec 02's <50 KB JS budget?
  - **Options:** [A] keep the §4.4 exemption · [B] bring Tier G inside the budget · [C] publish a per-page motion cost readout and let the operator decide
  - **Recommendation:** [C]
  - **Why:** the exemption was written by the team that owns the budget; a buyer with a Lighthouse report reads it as a broken promise. A visible cost turns an engineering property into a sales asset.
  - **Who decides:** Bean

- **Decision:** FR-38-12 (Flip) — see Step I / Section 6b. Park-for-later vs commission the
  WooCommerce-blocks redesign now vs drop entirely.
  - **Who decides:** Bean

### Pre-emptive decisions

> **Honesty note:** the mandatory two-cold-reviewer Hidden Decisions pass was NOT dispatched — this section was reasoned inline at the end of a very long session. Treat it as lower-confidence than a plan whose peer review actually ran, and consider running it before executing Step 5 or 12.

- **Decision:** when a step says "remove the control if unverified", does that mean removing the attribute too?
  - **Recommendation:** remove the CONTROL and the emit; keep the attribute only if stored content already carries it (removing a declared attribute makes WP discard stored values — the D338 class, and exactly what blocked a deploy on 2026-07-31).
- **Decision:** which canary page do new fixtures go on?
  - **Recommendation:** `/motion-canary-wave-c/` for effects, `/motion-roster-canary/` for roster/first-paint, `/fx-preset-comparison/` for scramble-preset comparisons. Recreate rather than edit — `wp post update` is blocked by a hook; `wp post create` is not.
- **Decision:** how much of Spec 38 must be read before a step?
  - **Recommendation:** in full for Steps 5, 7, 12, 20 and any spec-changing decision (§I, §8); §-scoped for the rest.
- **Decision:** what if a council finding turns out to be wrong?
  - **Recommendation:** record the refutation in the plan and D-log. D435's `/qc-council` re-check found the code sound and only documentary defects — but each was checked first — do not inherit that as a prior.
- **Decision:** a client palette deliberately wants a saturated `border-subtle` (Step D) — how is "deliberate" distinguished from "bug"?
  - **Recommendation:** check that client's own `sites/<client>/CLAUDE.md` design notes before changing anything; absence of a note there is itself evidence it was never a deliberate choice.

---

## Honesty notes (what this plan does NOT have)

1. **The Hidden Decisions peer-review pass was not dispatched** (see above).
2. **Docscore was not run** on this document.
3. **The six raw Wave D council persona reports were not persisted to disk** — only their synthesis in D430 and this plan. If the detail matters later, the council must be re-run.
4. **Time estimates are per the low-by-default rule** and are not calibrated against `plan_actuals` (that table is still empty).
5. **No new step here (B, C, D, E, F, G, H, I, J) has been validated by `/qc-council`** — they are fix-shapes derived directly from Bean's own live review, which is a stronger basis than a council hypothesis, but they are still unbuilt and unmeasured until executed.
6. **This rewrite reorganised the file for readability (execution order, new letter-labelled steps for Bean's rulings) but did not re-verify any already-closed step's evidence** — the CLOSED table in Section 2 is a compressed summary of D434/D435; read those decisions directly for the full detail if a closed step is disputed.
