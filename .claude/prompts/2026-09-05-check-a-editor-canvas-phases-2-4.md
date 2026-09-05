# CHECK A editor-canvas backlog — phases 2-4 (next session)

**Invoke `/autopilot` before anything else.**

Governing gate: `plugins/sgs-blocks/scripts/check-editor-render-parity.js` (CHECK A —
"editor-canvas desync"). Read its header in full before touching anything; its documented blind
spots are load-bearing and two of them bit this session.

---

## What CHECK A actually is, in one paragraph

A client moves a control in the block editor. The attribute is written, `render.php` uses it
correctly, the published page is right — and the editor canvas shows nothing. The client cannot
see what they are doing. CHECK A finds those. It is NOT a styling gate and it does NOT verify the
CSS is correct (see "Traps" below).

## Where the backlog stands

**210 → 156** over 2026-09-05. Phase 1 fully closed.

| Phase | Group | Count | Mechanism | Status |
|---|---|---|---|---|
| 1 | `bgSvg*` family | 35 | `svgBackgroundPreview()` | **CLOSED — 35/35, 8 blocks** |
| 2 | layout/box on wrapper blocks | 31 | Same wrapper mirror, extended | **NEXT — start here** |
| 3 | Gradient siblings + flat colour | ~96 | Colour atoms + PHP/JS parity gate | The structural one |
| 4 | Long tail | 29 | Split — see below | Last |

Counts drift as peers commit. **Re-derive them, do not trust this table**: run
`node scripts/check-editor-render-parity.js --json` and bucket `editorCanvasDesync.netNew`.

---

## FIRST ACTION (~5 min, zero dependencies)

**Ratchet the CHECK A ceiling.** `CHECK_A_OPEN_BACKLOG` in the gate is **193**; actual is **156**.
That banks 37 findings of slack for a regression to hide in. It was deliberately left un-ratcheted
at 04:00 on 2026-09-05 because 3+ peer sessions were committing concurrently and a tight ceiling
would have failed their builds mid-flight. Do it first thing when the tree is quiet:

1. `node scripts/check-editor-render-parity.js --json` → read `netNew.length`
2. Set `CHECK_A_OPEN_BACKLOG` to exactly that, with a dated comment saying why (the file's existing
   comments show the house style — never lower it silently)
3. `node scripts/check-editor-render-parity.js --check` must report `N/N`

---

## Phase 2 — layout/box on wrapper blocks (31)

**What:** `justifyItems`, `alignContent`, `alignItems`, `gridAutoRows`, `margin`, `maxWidth`,
`contentWidth`, `padding`, `gap`, `backgroundRepeat`, `backgroundAttachment`, `bgVideo`,
`backgroundOverlayBlendMode` — on blocks whose `render.php` calls `SGS_Container_Wrapper`.
Roughly: cta-section 8, gallery 8, hero 5, trust-bar 4, site-footer-row 3, site-header-row 3.

**Why it is the right next step:** identical mechanism to phase 1 — all of these paint through the
ONE shared wrapper, so a single mirror serves every adopting block. Phase 1 proved the pattern end
to end, including live verification.

**How:** extend `src/utils/background-preview.js` the way `svgBackgroundPreview()` was added
(commit `f4fc7333a`), then wire each block. `src/blocks/container/edit.js` is the worked reference.

**Note gallery, site-footer-row and site-header-row have NOT adopted `backgroundPreview` at all** —
for them part of the win is plain adoption of the existing helper, no new code.

**Execution:** parallel subagents, one per 2-3 disjoint blocks, with container as the reference.
That worked cleanly this session (3 agents, 7 blocks, zero collisions). Give each agent EXPLICIT
anti-collision rules: named files only, no git commands, no build, no reseed — the orchestrator
commits. Two of the three agents independently caught a real bug in the reference, so brief them to
report deviations rather than silently copy.

---

## Phase 3 — colour (~96) — THE STRUCTURAL ONE, design-gate first

**96 of the remaining 156 findings are colour** (gradient siblings + flat), spread across ~40 blocks
that each paint colour their own way. Measured this session: the shared PHP primitive
`sgs_text_decls` has only 8 callers and covers 5 of them; `sgs_colour_value` has 62 callers but
only RESOLVES a value — it does not own the selector. **There is no single existing thing to
mirror.** That is why colour cannot be closed the way phases 1 and 2 can.

**The answer is already in this codebase — extend the MEDIA-ATOM pattern past media.**
`src/components/media/atoms/*.js` and `includes/media/atoms/*.php` are 16 PAIRED atoms; each JS
`css()` mirrors its PHP `sgs_media_atom_<id>_css()` byte-for-byte, enforced by
`scripts/tests/test-media-atom-parity.mjs`, which carries an anti-vacuity ratchet
(`IMPLEMENTED_ATOMS = 16`). Read that gate's docblock — it names the architecture in the project's
own words: *"one stylesheet, one descriptor, two thin value-setters… the achievable, testable claim
is that they AGREE."* Evidence it works: only 2 findings touch media-atom-governed
properties.

⛔ **Do NOT start building.** This is a shared-mechanism change across ~40 blocks — CLAUDE.md rule 7
requires a design gate and Bean's approval first. Run `/qc-council` or `/brainstorming` design-mode
on it. Two specific things any design MUST answer, both learned the hard way:

1. **A colour descriptor cannot be written as `prop: value`.** 27% of colour rows name ONE
   declaration of a multi-declaration mechanism. A text gradient is `background-image` PLUS
   `background-clip:text` PLUS `color:transparent` PLUS a mandatory
   `@supports not (background-clip:text)` fallback — emit the property alone and unsupporting
   browsers render INVISIBLE TEXT. 17 rows also hold synthetic pseudo-properties
   (`color-gradient`, `border-color-gradient`, `fill-gradient`) that no browser accepts. Any
   generator must map `css_property` → HELPER FUNCTION, never write the value directly.
2. **The cloning pipeline is pipeline-first, not editor-first.** GenerateBlocks/Stackable write CSS
   into a block attribute when a human edits in the editor. `/sgs-clone` writes attributes
   programmatically and never opens the editor, so that model would ship unstyled clones. Whatever
   is built must keep a PHP path that works without the editor ever running.

---

## Phase 4 — long tail (29). Already split for you.

Measured against the DB descriptors on 2026-09-05:

- **13 have a FULL descriptor** (`css_property` + `css_element`), 12 of them manifest-authored —
  the population an audit measured at ~93% accurate. These are LOOKUP, not investigation:
  `hero.justifyContent` → `justify-content` on `inner`; `post-grid.shadow` → `box-shadow` on `card`;
  `timeline.entryGap` → `margin-bottom` on `entry`; `text.transitionEasing` →
  `transition-timing-function` on `wrapper`.
- **~15 have NO descriptor, correctly.** They are not property emissions:
  `gallery.carouselShowDots`/`carouselShowArrows`, `icon-list.dividers`,
  `timeline.scrollEffect`/`milestoneSize`, `form-field-tiles.selectedStyle` pick a CSS CLASS;
  `multi-button.childBtn*` (5) set custom properties consumed by CHILD `sgs/button` blocks, so the
  painted node is in a different block; `hero.splitMediaDecorative` is an a11y flag. These need a
  class-toggle / child-block preview, a different shape of fix.

⛔ **Use `css_element`, NEVER `derived_selector`.** They are two different coordinate systems:
`derived_selector` is `.sgs-{slug}__{canonical_slot}`, built from the DRAFT-side vocabulary for the
cloning pipeline; `css_element` is the WP-side element. E.g. `hero.mediaBackground` →
`derived_selector` `.sgs-hero__image` (draft) but `css_element` `media` (WP, correct).

---

## TRAPS — all four cost real time this session

1. **Enumerate attributes explicitly at the call site.** CHECK A resolves an attribute as
   canvas-reflected only when its NAME appears outside the Inspector panels. Passing `attributes`
   wholesale to a preview helper renders CORRECTLY and still reads as a desync. Same blind spot as
   the ServerSideRender pass-through wrapper fixed in `89475bb3a`.
2. **A gate's scope is not the defect's scope.** `svgBackgroundPreview()` returns `className` as a
   string ARRAY while its sibling `backgroundPreview()` returns a STRING. `[a, ['x','y']].join(' ')`
   is `"a x,y"` — one unusable comma-joined token, so all four SVG classes were silently dead while
   the layer still rendered. **CHECK A passed throughout.** Read the emitted CSS, never trust green.
   (Sibling case the same week: `check-text-gradient-companion` passed while `sgs_text_decls()`
   shipped broken.)
3. **Block CSS is LIFTED, not inline.** It goes to `wp-content/uploads/sgs-css/*.css`. Grepping page
   HTML for a rule proves NOTHING — a first verification pass this session reported ABSENT for
   three working fixes because of exactly this. Follow the linked stylesheet.
4. **`curl` the canary with `-L`.** Pages 301-redirect; without `-L` you get an empty body and
   conclude the block did not render.

---

## Open design calls — Bean's, not the next agent's

1. **`sgs/nav-drawer` variant-discriminator collision** (F6's last baselined violation). 6 of 7
   variants share an empty discriminator because `variantPreset` gates zero conditional CSS by
   design (`render.php:635-643`) — each variation is a curated bundle of freely-settable attrs, so
   no variant owns an exclusive attribute, and `block.json` faithfully mirrors `variations.js`.
   Fabricating a discriminator would make `detect_variant` confidently pick the WRONG variant on a
   real client clone. An honest collision was judged better than a false pass. Traced by
   `small-giants-wp-29`; needs Bean's decision.
2. **Phase 3's architecture** — see the design-gate requirement above.

---

## Cross-session context

This tree routinely runs 3+ concurrent sessions. On 2026-09-05 the CHECK A work coordinated live
with `small-giants-wp-29` (classifier/descriptors), `-78` and `-90`.

- **Path-scope every commit, and name FILES not DIRECTORIES.** A pathspec-scoped commit re-stages
  the CURRENT WORKING-TREE version of the paths it is given, not just what was staged — that is how
  this session's staged exemptions rode into a peer's commit `ed9e9ccda`. Naming
  `hero/edit.js hero/render.php` rather than `hero/` is what kept a peer's in-flight
  `hero/block.json` out of `a64e9e344`.
- **Re-read `git diff --cached --stat` immediately before every commit.** It showed 14 files/1263
  insertions one moment and the correct 10/257 the next, mid-race with a peer.
- **Never `--allow-dirty` on deploy.** `build-deploy.py`'s dirty gate names only files the deploy
  would actually ship, so it is precise; `--payload <path>` is the sanctioned deadlock-breaker and
  still blocks on any OTHER dirty deploy-relevant file.
