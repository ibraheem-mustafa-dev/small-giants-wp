# Media element — Waves 5, 6 and 7

**Invoke `/autopilot` before anything else.**

All eleven atoms are built and gated. The panel that assembles them
(`src/components/MediaElementPanel.js` + `includes/class-sgs-media-element.php`) already exists —
**do not rebuild it.** `sgs/media` is PARTIALLY wired to it already: `object-fit` and
`focal-point` only, absorbed as bare rows into the block's existing panel (not yet reorganised
into §18's "Media panel + type tabs + Image Styling sub-panel + overlay" layout). Every other
atom on `sgs/media`, and every other block, is untouched. Your job: finish wiring `sgs/media` (the
other nine atoms, reorganised to §18's layout), then `before-after`, prove it paints on a live
page, then roll out to the rest.

⛔ **A previous version of this prompt claimed the panel "does not exist" and told you to build
it from scratch. That was wrong — verified false by an independent QC pass, 2026-09-01, after
tracing the claim to a stale docblock in the atom `.control.js` files (written before the panel
existed, never updated once it did) that got carried forward without a direct file check. Confirm
the real state yourself before trusting ANY status claim in this prompt, including this one:**

```bash
ls plugins/sgs-blocks/src/components/MediaElementPanel.js plugins/sgs-blocks/includes/class-sgs-media-element.php
grep -n "MediaElementPanel" plugins/sgs-blocks/src/blocks/media/edit.js
git log --oneline -- plugins/sgs-blocks/src/components/MediaElementPanel.js
```

---

## Read these first, in this order, IN FULL

Not skimmed, not grepped. Each answers something the next assumes.

| # | File | Why |
|---|---|---|
| 1 | `.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 | Current status: what's built, what's gated, what's still missing (the panel layer) |
| 2 | The same file, §18 | **The panel design you are building.** Exact layout: a "Media" panel, type tabs holding each type's own controls, an "Image Styling" sub-panel, overlay at the bottom. Read every subsection — §18.1 was corrected after this prompt was first written; the version in the file is current |
| 3 | The same file, §2 (the four layers) and §10 (build order + the falsification test) | The architecture and the test this wave exists to pass |
| 4 | `.claude/decisions.md` — D909 and D910 | Every ruling, and three instruments that read green while proving nothing |
| 5 | `.claude/STOP-CATALOGUE.md` §E19, then §C's pre-flight ritual | The method you use all session |
| 6 | `plugins/sgs-blocks/CLAUDE.md` — "A control that doesn't work" + "Block Customisation Standard" | How this repo builds a control |
| 7 | `plugins/sgs-blocks/src/components/media/atoms/registry.js` | The contract. Its docblock carries the rules every atom obeys |
| 8 | `.claude/reports/2026-09-01-media-control-comparison.md` | The evidence §18's decisions were built on — six blocks compared control by control |
| 9 | `reports/visual-diff/media-2026-08-30.md` | **Already closed, read so you don't redo it.** D909's server-side autoplay/muted/playsinline coupling on `sgs/media` was measured live on the real canary (JS disabled, desktop + tablet, negative control included) and closed 2026-09-01 — 4/4 assertions passed. This is evidence Wave 4's render-side work already holds up live; it is not outstanding work |

⛔ **Do NOT read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` for this work.** It governs the
cloning pipeline; this is the client-controls track. Reading it costs an hour and misleads you.

---

## What changed since this prompt was first written

- **The panel-assembly layer (`MediaElementPanel.js`) already exists, and `sgs/media` already has
  two atoms wired.** A draft of this prompt claimed otherwise and would have sent you to rebuild
  something that shipped before this session even started — caught by an independent QC pass.
  See "5a" below for the confirmed current state and the verification commands to re-check it.
- Atom count is **eleven**, not ten — `motion` (ken-burns/parallax) was added, harvested from
  `sgs/hero`'s split-media and `sgs/container`'s background implementations. It applies to image,
  video, and SVG alike; nothing in hero's own code restricts it to images. It shares no CSS
  property with `svg-presentation`'s own animations — both compose through one multi-value rule in
  `assets/css/media-atoms/_base.css`, so a pulse animation and a ken-burns zoom can run at once.
- `object-fit` and `focal-point` are now tiered per device. Their `control()` functions already
  wrap the relevant row in `ResponsiveControl`, reading the active tier from the global device
  toggle — mounting them needs no special tier-handling in the panel you build.
- `box-shape`'s border is the standard `SgsBorderControl` — the same component every other
  block's Border panel uses, wired the same way. No bespoke radius mechanism.
- `media-type`, `source`, and `meaning` are finished. Switching media type is **non-destructive**:
  the other type's stored media is never cleared, so a client comparing image versus video never
  loses their upload. Picking an image or video auto-fills its alt text from the attachment's own
  description, unless the client has already typed something different.
- One real WordPress API trap found and fixed this session, worth knowing before you build more
  controls: `ToggleGroupControl` has no group-level `disabled` prop in the stable Gutenberg API
  ([gutenberg#57862](https://github.com/WordPress/gutenberg/issues/57862) is still open). Passing
  `disabled` to the group silently does nothing — it has to go on each `ToggleGroupControlOption`
  instead ([gutenberg#63450](https://github.com/WordPress/gutenberg/pull/63450)). Verify a WP
  component's actual prop contract before relying on it; don't assume from the name.

---

## ⛔ SCOPE — SIX blocks, and nothing else

`sgs/media` · `sgs/before-after` · `sgs/hero` · `sgs/container` · `sgs/decorative-image` ·
`sgs/product-card`.

**A background is not a media element.** A block with a background image, video, SVG, or overlay
gets it from the shared `BackgroundPanel` — a container concern, already standardised. Nine
blocks mount that panel; none joins this work on that basis. `site-header` and `site-footer` have
nothing to do with it. This work is a block with a NESTED element that IS media.

`sgs/container` is in scope because it owns the background mechanism — fixing the shared wrapper
here is what later lets `hero`'s `BackgroundPanel` be updated, then every other host.

Excluded, with reasons: `responsive-logo` (already better than the shared shape), `info-box`
(dead legacy attrs; real media lives in child blocks), `image-sequence` (agency-only, needs a
Python/ffmpeg CLI, its "media" is a canvas frame sequence, not a displayed image).

`sgs/trust-bar` and `sgs/brand-strip` have real nested media (badge images, logos) but are
limited follow-on work. A badge and a logo are small, fixed-purpose images — judge each control
on whether it's genuinely useful there, rather than offering the full set.

⭐ **After the six:** upgrade the shared `BackgroundPanel` to match, per media type — decide what's
relevant to a root background versus a foreground element, and align enums and help text where
the picking control differs.

---

## The method — proven across two atom-building rounds this session

⛔ **When a control "doesn't work," find a block where it already works and diff.** First-principles
reasoning burned a session before this rule was locked; every meshing problem since resolved in
minutes once someone diffed against a working surface instead.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, css_property, css_element, css_state, css_tier
     FROM block_attributes WHERE css_property='object-fit'"
```

Then open the working block's `render.php` and `style.css` and compare against yours. The same
query found two blocks (`sgs/brand-strip` `logoFit`, `sgs/trust-bar` `badgeImageObjectFit`) a
hand-written survey of "media blocks" had missed. A hand-picked population is not a census; the
DB is.

⚠ **The DB is not a complete census either.** `sgs/before-after` doesn't appear in that query
despite emitting `--sgs-object-fit` (`before-after/render.php:256-277`) — its fit arrives via
`supports.sgs.imageControls`, not a declared attribute, invisible to `block_attributes`. This
bites on one question only — "which blocks already carry this capability?" For that question:
DB query first, the census's `presentation.gaps` matrix as the backstop; neither alone is
complete.

⛔ **Never reason from what the canary currently renders.** Pre-production, no client content — a
default changing costs nothing. Whether a default is right is decided on what the other surfaces
measure, never on preserving what the canary shows today.

**Other tools that earned their place:**
`python ~/.claude/hooks/wp-blocks.py schema sgs/media` · `/sgs-db` for any count (never cache
one) · Playwright MCP for the live check · `/qc-inline` per surface · `/qc-council` before a
shared-layer commit.

---

## Wave 5 — wire two surfaces. This is the measurement.

⛔ **`sgs/media` first, then `before-after`. Never in parallel.** Built concurrently, both agents
can quietly bend the shared layer to suit themselves, and the only evidence the abstraction
generalises is gone. Run this inline, serially, yourself.

### 5a — finish wiring `sgs/media` (the panel already exists)

The shared layer may change here. That's expected — this is the surface it was shaped around.

**Confirmed state, 2026-09-01 (verify it yourself before trusting it further):** the panel
(`src/components/MediaElementPanel.js` + `includes/class-sgs-media-element.php`) was built and
committed at `0f246b34a`. `sgs/media/block.json` already declares
`supports.sgs.mediaElements: [{ prefix: "", context: "element", atoms: ["object-fit",
"focal-point"] }]`; `edit.js` already mounts `<MediaElementPanel … insertion="element" atoms={[
'object-fit', 'focal-point' ]} … />` (absorbed into the block's existing panel area, next to
`MediaSizingPanel` with its `showFitControl`/`showFocalControl` suppressed); `render.php` already
gutted the old three-place hand-rolled object-fit code (`style.css:40`'s comment confirms: "the
rule now lives once, in the atom layer"). **object-fit and focal-point are DONE for `sgs/media`.**

**What's left:** the other nine atoms (`source`, `media-type`, `meaning`, `video-behaviour`,
`svg-presentation`, `box-shape`, `overlay`, `motion`; `intrinsic` needs no control) are not wired
into `sgs/media` at all, and the current mounting is a bare-rows absorption into the pre-existing
panel — not yet reorganised to §18's actual layout (a "Media" panel; type tabs, each holding its
own upload control plus type-exclusive atoms — `video-behaviour` in the Video tab,
`svg-presentation` in the SVG tab; an "Image Styling" sub-panel below the tabs holding
`object-fit`/`focal-point`/`box-shape`/`motion`; `overlay` at the bottom). Widening
`supports.sgs.mediaElements`'s `atoms` array and `edit.js`'s `atoms={[…]}` together is enough to
add a new atom's rows — **name only atoms you wire a renderer for in the same commit**, or the
injected attributes become dead controls and `check-dead-controls.js` will say so. Reorganising
the MOUNT (tabs, the Image Styling grouping, `insertion="root"` opening its own "Media" panel
instead of absorbing into `MediaSizingPanel`) is separate, larger surgery — decide whether to
widen atom-by-atom first and reorganise once, or reorganise the mount early and widen into the
new shape; both are legitimate, but state which you're doing and why.

Two markers exist for a reason, already correctly used by the object-fit/focal-point wiring:
`.sgs-media-el` goes on the replaced element (`<img>`/`<video>`) for object-fit, focal-point, and
box-shape; `.sgs-media-box` goes on its container for overlay and source. Neither goes on the SVG
node for replaced-element properties — `hero/render.php:620-623` states why: those properties do
nothing on the SVG tier's `<span>` wrapper, so emitting them there would be a lie about what the
property affects. `overlay.css` paints via `::after`, which a replaced element never generates —
prove that in a browser with a `<div>` positive control before wiring it. `sgs/media`'s naked mode
has no container (`render.php:1307`) — add "no overlay set" to that gate when you wire overlay.

**Verify, then gut, per atom — the discipline already proven on object-fit.** Delete a block's old
hand-rolled attribute handling for an atom only once that atom's new path genuinely renders.

⚠ **The old three-place object-fit specificity trap is CLOSED, not still pending** — kept here so
you understand the shape of the gut discipline for the NEXT atom you wire, not because you need to
redo it. Before the gut, `sgs/media` wrote object-fit in three places at three specificities:

| Source (pre-gut) | Selector | Specificity |
|---|---|---|
| `style.css` (old) | `:where( .sgs-media__img )` | (0,0,0) |
| the atom | `.sgs-media-el` | (0,1,0) |
| `render.php` (old) | `$id_sel` = `.{scope}.sgs-media__img, …` | **(0,2,0)** |

The atom beat the stylesheet default but **lost to `render.php`** — which fired exactly when the
client had set a non-default value, the case a tester actually hits. That's why "it paints" never
proved the gut was complete on its own: a leftover hand-rolled rule whose value happened to agree
with the atom would have looked correct while being a second writer waiting to diverge. All three
were deleted in the same commit as the wiring (`640ad1282`) — confirmed above by `style.css:40`'s
own comment. Apply the same "all writers gone in one commit" discipline to each atom you wire
next.

### 5b — `before-after`, the falsifying case

⛔ **The shared layer must NOT change here.** That's the whole test.

Wiring the second surface must require no edit to the shared layer. The surface's own
`block.json`/`edit.js`/`render.php`/`media-render.php` change by definition; the test measures
the shared layer alone:

> **Pass** = `git diff --name-only` touches no path under `src/components/media/`,
> `src/components/MediaElementControls.js`, `src/components/MediaElementPanel.js`,
> `includes/helpers-media-element.php`, `includes/class-sgs-media-element.php`,
> `includes/media/atoms/`, `assets/css/media-atoms/`,
> `src/blocks/extensions/media-elements.js`, or `includes/media-element-attrs-register.php`.
>
> The five files under `src/blocks/before-after/` are expected to change.

If the shared layer genuinely needs an edit, say so plainly and record what was missing — a
failed falsification test is a real result, not a setback to hide.

⚠ `before-after` has two media elements, which is why it's the test. Per-element scoping
(`{uid}--before` / `{uid}--after`) already exists and is gated; if both slots render the same
value, that gate has regressed.

⚠ It's already best-in-class on two axes — one parameterised picker driving both slots with zero
drift, and the narrowest per-type gating of any surface. A unification that downgrades either has
failed; absorb these patterns, don't flatten them.

### Wave 5 closes on paint, not on gates

Waves 3–4 closed on parity and validators. This one doesn't.

1. Deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`. Never
   hand-roll `tar`/`scp` (D336 took two client sites down for roughly 2.5 hours). No
   `--allow-dirty`, no `--skip-verify`.
2. Open the real page and read the computed style on the rendered element — not the emit, not the
   gate. `check-dead-controls` proves an attribute is consumed; only a live DOM read proves it
   paints.
3. `reports/visual-diff/media-2026-08-30.md` already closed the autoplay/muted/playsinline
   negative-control case for `sgs/media`'s render-side fix — don't re-run that specific check.
   What's still unverified live is the PANEL you're building in this wave: once
   `MediaElementPanel` is mounted, open the block editor and confirm each control genuinely
   reads and writes the attribute it claims to, the same rigour that report applied to one
   server-side coupling.
4. Write a new visual-diff report for the panel itself. Never write `verdict: PASS` for a check
   you didn't run. The
   scoped skip (`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="…"`) exists for exactly
   that, and logs the reason.

---

## Wave 6 — the remaining gates as inspector-scan rules

⛔ `media-no-handroll` ships in Wave 5, not here — it's the only check that proves the gut was
complete, and "it paints" can't do that job.

⭐ **Every rule here inherits Wave 5's silence criterion: a surface that has adopted the panel
and its atoms must return zero findings.** A finding on a migrated surface is a defect, never a
backlog entry. The unmigrated surfaces are each rule's free positive control — write the rules
while that control still exists.

`media-attr-parity` · `media-css-parity` · `media-control-coverage` · `media-svg-sanitised` ·
`media-disclosure-coverage`. Ship them as rule modules under `scripts/inspector-scan/rules/`, not
standalone scripts — read two existing rules for the export contract first.

- `rules.json`'s `_meta`: every new rule starts `mode: "advisory"` with a measured `openBacklog`
  and an `advisoryReason`, plus `zeroIsAClaim` — a rule returning 0 findings must be cross-checked
  against an independently derived population.
- Audit the three existing media-adjacent rules against this contract before writing new ones:
  `14-media-upload-check` (gate, backlog 0), `18-decorative-image-aria` (advisory, backlog 12 —
  already handles shared-component indirection), `08-raw-url-link` (rules that `videoUrl` is a
  media source, not a link).
- `media-markup-parity`, as originally specified, is dropped — it compared rendered DOM, which
  needs a live canary that warns-and-passes when unreachable. `media-css-parity` (a static
  fixture comparison) replaces it.

Every rule ships a negative control proving it doesn't overmatch, and a fixture proving it can
fail.

---

## Wave 7 — the remaining surfaces

⛔ **Per surface, one commit: insert, then verify, then gut. Never gut first.** A surface always
has either the old code or the new code, never neither — rollback is one revert.

Order: `hero`, `container`, `decorative-image`, then `product-card`. `product-card`'s content
migration ships separately, after the abstraction is proven — it keeps the old attribute
alongside the new for one deploy cycle, uses WP-CLI batch under `--user=1` (KSES otherwise strips
CSS from block attributes), and writes a `_sgs_media_legacy_backup` postmeta.

⚠ `sgs/container`'s `BackgroundPanel` is shared by eight host blocks. Changing it changes all
eight — check them before, and after.

---

## The end goal, in Bean's words

> All of the controls are fully wired up, have conditional visibility based on if they are even
> usable, and the controls are consistent across all relevant elements in terms of which controls
> these elements have, and the UI of the control.

Three things, and the third is the one that gets forgotten. Two blocks offering the same
capability through differently-shaped controls have not been unified.

⛔ **Absence is a gap, not a decision.** These surfaces were built ad hoc and never standardised —
a control missing from one is an accidental gap, never evidence it was deliberately excluded. The
only legitimate exclusion is a genuinely different concept: `decorative-image`'s
`positionX`/`positionY` are absolute page placement, not the position of an object inside its
container.

---

## Standing constraints

- **Commit by exact path.** A hook rejects a commit with no pathspec. Two others take a literal
  token IN THE COMMAND, not in a message file: the detector-first gate wants
  `[repeat-ok:<specific reason>]`, the path-scope gate wants `[batch-ok:<reason>]`.
- **Never `git checkout --` a file to undo an edit** — it reverts to the last commit and silently
  takes unrelated uncommitted work with it.
- ⛔ **Zero attribute renames.** WordPress silently discards an attribute a block no longer
  declares — a rename is a stored-`post_content` migration.
- ⛔ **No inline `style=""`** (Spec 32). Values are custom properties; rules live in the
  stylesheet.
- ⛔ **No block deprecations, no version bumps** — pre-production.
- **A grep returning 0 is a hypothesis.** This track's recurring failure is grepping a block's
  own file when a shared helper is the reader — `BackgroundPanel` and `ContainerWrapperControls`
  both live under `src/blocks/container/components/`, not `src/components/`.
- **Every number you write must come from a command you just ran**, not from a doc, a prior
  message, or a subagent. State the command beside the number, or omit the number.
- **Verify a WordPress component's real prop contract before relying on it.** This session found
  `ToggleGroupControl`'s `disabled` prop is a documented no-op at the group level — the component
  name and a plausible-looking prop are not proof it does what it sounds like.

## First action (under 5 minutes)

Run the three verification commands under "What changed" above — confirm the panel exists and
`sgs/media` already has `object-fit`/`focal-point` wired before you plan anything, since this
prompt has already been wrong about that once. Then read
`.claude/plans/2026-08-30-media-element-architecture-v2.md` §18 in full — it's the exact panel
shape the remaining nine atoms need to land in, and starting without it means guessing at a
structure that's already decided. Then open `plugins/sgs-blocks/src/blocks/media/edit.js` around
line 569 (`<MediaElementPanel … atoms={['object-fit','focal-point']} … />`) and read how the
already-wired atoms are mounted — that's the shape to extend, or to knowingly replace when you
reorganise the mount to match §18.
