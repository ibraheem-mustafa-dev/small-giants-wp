# Media element — Waves 5, 6 and 7

**Invoke `/autopilot` before anything else.**

You are finishing a build that is four waves in. The layer exists, is gated, and paints nothing yet.
Your job is to wire it to real blocks, prove it works on a live page, and roll it out.

---

## Read these first, in this order, IN FULL

Not skimmed, not grepped. Each one answers something the next assumes.

| # | File | Why |
|---|---|---|
| 1 | `.claude/plans/2026-08-30-media-element-architecture-v2.md` | The canonical design. §17 is current status; §2 is the four layers; §10 is the build order and the falsification test. **It has been rewritten in place — there are no "this was wrong" annotations, so read it as current truth.** |
| 2 | `.claude/decisions.md` — **D909 and D910** | Every ruling, and the three instruments that read green while proving nothing |
| 3 | `.claude/STOP-CATALOGUE.md` — **§E19**, then §C's pre-flight ritual | E19 is the method you will use all session |
| 4 | `plugins/sgs-blocks/CLAUDE.md` — "A control that doesn't work" + "Block Customisation Standard" | How this repo builds a control |
| 5 | `reports/migrations/media-element-census.json` | The population. Read `presentation.gaps`, `presentation.traps` and `surfaces[].storedAs` |
| 6 | `plugins/sgs-blocks/src/components/media/atoms/registry.js` | The contract. Its docblock carries the three rules the atoms must obey |
| 7 | `reports/visual-diff/media-2026-08-30.md` | Names the three live cases Wave 5 owes |

⛔ **Do NOT read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` for this work.** It governs the
cloning pipeline; this is the client-controls track. Reading it will cost you an hour and mislead you.

---

## ⛔ SCOPE — SIX blocks, and nothing else

`sgs/media` · `sgs/before-after` · `sgs/hero` · `sgs/container` · `sgs/decorative-image` ·
`sgs/product-card`.

**A BACKGROUND IS NOT A MEDIA ELEMENT.** A block with a background image/video/SVG/overlay
gets it from the shared `BackgroundPanel` — a container concern, already standardised. Nine
blocks mount that panel (container, cta-section, hero, multi-button, nav-drawer,
physics-canvas, site-footer, site-header, trust-bar); none joins on that basis.
`site-header` and `site-footer` have nothing to do with this work. The media-element work is
a block with a NESTED element that IS media.

`sgs/container` is in scope because it OWNS that background mechanism (hence the atoms'
`backdrop` scope), and fixing the shared wrapper here is what later lets `hero`'s
`BackgroundPanel` be updated, then every other host.

Excluded with reasons: `responsive-logo` (already better than the shared shape),
`info-box` (dead legacy attrs, real media is in child blocks — attrs being deleted),
`image-sequence` (`inserter: false`, needs a Python/ffmpeg CLI, its media is a canvas frame
sequence not a displayed image).

⚠ `sgs/trust-bar` and `sgs/brand-strip` DO have real nested media (badge images, logos) and
are follow-on work — **limited**. A badge and a logo are small fixed-purpose images; judge
each control on whether it is genuinely useful there rather than offering the full set.

⭐ AFTER the six: upgrade the shared `BackgroundPanel` to match, per media type, taking
account of what is relevant to ROOT background media versus a foreground element, and
aligning enums + the responsive-override/art-direction help text where the picking control
differs.

## The method, and it is not optional

⛔ **When a control "does not work", find a block where it ALREADY works and diff.** Bean-locked
2026-08-31 after a stretch of first-principles reasoning produced nothing and this produced the
answer in minutes.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, css_property, css_element, css_state, css_tier
     FROM block_attributes WHERE css_property='object-fit'"
```

Then open the working block's `render.php` and `style.css` and compare against yours. Every meshing
problem in waves 3-4 resolved this way. The same query also found two blocks
(`sgs/brand-strip` `logoFit`, `sgs/trust-bar` `badgeImageObjectFit`) that a hand-written survey of
"media blocks" had missed — **a hand-picked population is not a census; the DB is.**

⚠ **BUT THE DB IS NOT A COMPLETE CENSUS EITHER — measured 2026-08-31.** That query returns eight
rows and **`sgs/before-after` is not among them**, yet it demonstrably emits `--sgs-object-fit`
(`before-after/render.php:256-277`) and consumes it (`style.css:63-64,346`). Its fit arrives via
`supports.sgs.imageControls`, not a declared attribute, so `block_attributes` cannot see it.

This bites on ONE question only: *"which blocks already carry this capability?"* — the population
step E19 opens with. The census `gaps` matrix catches the extension case (`carries_via_extension`),
so for that question: **DB query first, census as the backstop; neither alone is complete.**

⛔ **This has NOTHING to do with Wave 5b's falsification test**, which is a `git diff --name-only`
over source files. The DB plays no part in it. Do not connect the two.

⛔ **NEVER reason from what the canary currently renders.** Pre-production, no client content, a
default changing costs nothing. Whether a default is RIGHT is a separate question decided on what
the other surfaces measure. Weighing this cost the previous session a stop it should not have taken.

**Other tools that earned their place:**
`python ~/.claude/hooks/wp-blocks.py schema sgs/media` · `/sgs-db` for any count (never cache one) ·
Playwright MCP for the live check · `/qc-inline` per surface · `/qc-council` before a shared-layer
commit.

---

## Wave 5 — wire two surfaces. THIS IS THE MEASUREMENT.

⛔ **`sgs/media` FIRST, then `before-after`. NEVER in parallel.** Built concurrently, both agents can
quietly patch the shared layer to suit themselves and the only evidence the abstraction generalises
is gone. Run this inline, serially, yourself.

### 5a — `sgs/media`

The shared layer may change here. That is expected: this is the surface it was shaped around.

⛔ **PRECONDITION, measured 2026-08-31 — the L3 layer does NOT exist and must be built first.**
Wave 4 was specified as "panel registry + dispatch" and was never written:
`grep -rn "SGS_Media_Element"` returns nothing, and `src/components/MediaElementControls.js` holds
zero JSX (it is the L1 naming module). Every atom's `.control.js` returns bare rows and mounts no
`InspectorControls`, deferring assembly to a caller nobody wrote. **Build it as
`src/components/MediaElementPanel.js` + `includes/class-sgs-media-element.php`** — the old name is
taken. Architecture v2 §2 L3 + §17 carry the full evidence.

0. **Build L3** — the panel/dispatch layer above. It takes its InspectorControls group from
   `insertion`, never hardcoding `group="styles"` (`SgsColourPanel.js:116` is the C14 defect across
   65 blocks), and it must handle `disclosure()`'s TWO legal return shapes — `{state, hiddenReason}`
   or a MAP of base → that — because `video-behaviour` needs the map and one throw kills the whole
   inspector (D910).
1. Declare `supports.sgs.mediaElements` in `block.json` — `[ { "prefix": "", "context": "element",
   "atoms": [ … ] } ]`. **Name only atoms you wire a renderer for in the same commit**, or the
   injected attributes become dead controls and `check-dead-controls.js` will say so.
2. Mount `MediaElementPanel` in `edit.js` (it composes the atoms' `control()` rows).
3. In `render.php`, build the element's scope class with `sgs_media_element_scope_class( $uid, '' )`
   and emit `sgs_media_element_style( … )` into the block's existing scoped `<style>`
   (`$responsive_css`, seeded `media/render.php:446`, echoed `:1377-1389`).
4. Ensure the media element carries the right marker — **and there are TWO, not one.**
   `.sgs-media-el` goes on the REPLACED element (`<img>`/`<video>`) for object-fit / focal-point /
   box-shape; `.sgs-media-box` goes on its CONTAINER for overlay / source. ⛔ **Neither goes on the
   SVG node** for the replaced-element properties — `hero/render.php:620-623` states the reason:
   *"these are replaced-element properties and do nothing on the SVG tier's `<span>` wrapper, so
   emitting them there would be a lie about what the property actually affects."*
   ⚠ `overlay.css` paints via `::after`, which **a replaced element never generates** — that is why
   the second marker exists. Prove it in a browser (with a `<div>` positive control) before building.
   ⚠ `sgs/media`'s naked mode has NO container (`render.php:1307`): add "no overlay set" to that gate.
5. **VERIFY, then GUT.** Delete the old attribute handling only once the new path renders.

⚠ **Start with ONE atom end-to-end** (`object-fit` is smallest and its cascade is already understood)
before wiring the rest. Settling the shape on one instance is this repo's own rule and it makes a
mistake cheap.

⚠ **`sgs/media` writes object-fit in THREE places, at three specificities. Know all three before
you touch it.**

| Source | Selector | Specificity |
|---|---|---|
| `style.css:45-47` | `:where( .sgs-media__img )` | (0,0,0) |
| the atom | `.sgs-media-el` | (0,1,0) |
| `render.php:294-306`, flushed `:325` | `$id_sel` = `.{scope}.sgs-media__img, …` | **(0,2,0)** |

The atom beats the stylesheet default but **loses to `render.php`** — which fires precisely when the
client has set a non-default value, the exact case a tester sets.

**So GUT is load-bearing, not tidy-up.** Delete all three in the same commit: the `object-fit`
branch (`:294-296`), the `object-position` branch (`:302-306`), and `style.css:45-47`.
⚠ "It paints" does not prove the GUT was complete. A leftover hand-rolled rule whose value agrees
with the atom looks correct and is a second writer waiting to diverge. `media-no-handroll` catches
it, which is why it ships in Wave 5.

### 5b — `before-after`, the falsifying case

⛔ **The shared layer must NOT change here.** That is the whole test.

**Falsification test.** Wiring the second surface must require **no edit to the shared layer**. The
surface's own `block.json` / `edit.js` / `render.php` / `media-render.php` change by definition, so
the test measures the shared layer alone:

> **PASS** = `git diff --name-only` touches **no** path under `src/components/media/`,
> `src/components/MediaElementControls.js`, `src/components/MediaElementPanel.js`,
> `includes/helpers-media-element.php`, `includes/class-sgs-media-element.php`,
> `includes/media/atoms/`, `assets/css/media-atoms/`,
> `src/blocks/extensions/media-elements.js`, or `includes/media-element-attrs-register.php`.
>
> The five files under `src/blocks/before-after/` are **expected** to change.

If you need to edit the shared layer, say so plainly and record what was missing — a failed
falsification test is a real result, not a setback to hide.

⚠ `before-after` has TWO media elements, which is why it is the test. Per-element scoping
(`{uid}--before` / `{uid}--after`) already exists and is gated; if both slots render the same value,
that gate has regressed.

⚠ **It is BEST-IN-CLASS on two axes** — one parameterised picker driving both slots with zero drift,
and the narrowest per-type gating of any surface. A unification that downgrades it has failed.
Absorb those patterns; do not flatten them.

### Wave 5 closes on PAINT

Waves 3-4 closed on parity and validators. This one does not.

1. Deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`. **Never
   hand-roll tar/scp** (D336 took two client sites down ~2.5h). No `--allow-dirty`, no
   `--skip-verify`.
2. Open the real page and read the computed style on the rendered element — not the emit, not the
   gate. `check-dead-controls` proves an attribute is CONSUMED; only a live DOM read proves it
   PAINTS (STOP-CONSUMED-IS-NOT-PAINTED).
3. **The three cases `reports/visual-diff/media-2026-08-30.md` owes**, including the negative control:
   autoplay-off must still render an unmuted video. If both cases produce a muted video the fix has
   over-applied, and checking only the first would not show it.
4. Write the visual-diff report. ⛔ **Never write `verdict: PASS` for a check you did not run.** The
   scoped skip (`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="…"`) exists for that and logs
   the reason.

---

## Wave 6 — the remaining FIVE gates as inspector-scan rules

⛔ **`media-no-handroll` ships in WAVE 5, not here** — it is the only check that proves the GUT
was COMPLETE, and "it paints" cannot do that job. See Wave 5's close.

⭐ **Every rule here inherits Wave 5's silence criterion (Bean, 2026-08-31): a surface that has
adopted L3 and its atoms must return ZERO findings.** Consequences: `openBacklog` counts only
UNMIGRATED surfaces and falls to zero as a by-product of Wave 7; a finding on a MIGRATED surface is
a **defect, never a backlog entry**; and the unmigrated surfaces are each rule's **free positive
control** — write the rules while that control still exists, because a rule authored after every
surface has migrated has nothing left to prove it can fire. This is how `zeroIsAClaim` is satisfied
without hand-building a fixture.

`media-attr-parity` · `media-css-parity` · `media-control-coverage` ·
`media-svg-sanitised` · `media-disclosure-coverage`.

Bean's ruling: **rule modules under `scripts/inspector-scan/rules/`, not standalone scripts.** Read
two existing rules for the export contract before writing one.

- `rules.json`'s `_meta` is Bean-locked: **every new rule starts `mode: "advisory"`** with a measured
  `openBacklog` and an `advisoryReason`. It also carries `zeroIsAClaim` — a rule returning 0 findings
  must be cross-checked against an independently derived population.
- **Audit the three existing media-adjacent rules** against the new contract and repurpose or replace
  any that conflict: `14-media-upload-check` (gate, backlog 0), `18-decorative-image-aria` (advisory,
  backlog 12 — it already handles shared-component indirection, which is the blind spot a naive media
  rule hits), `08-raw-url-link` (carries the ruling that `videoUrl` is a media source, not a link).
- ⛔ `media-markup-parity` as originally specified is DROPPED — it compared rendered DOM, which needs
  a live canary, and the repo's live-canary gate warns-and-passes when unreachable. `media-css-parity`
  (a static fixture comparison) replaces it.

Every rule ships a negative control proving it does not overmatch, and a fixture proving it can fail.

---

## Wave 7 — the remaining surfaces

⛔ **Per surface, ONE commit: INSERT → VERIFY → GUT. Never gut first.** A surface always has either
the old code or the new code, never neither, and rollback is one revert.

Order: `hero`, `container`, `decorative-image`, then `product-card`. ⚠ The census's `wire_order`
field is populated ONLY for the two Wave 5 surfaces (`media`=1, `before-after`=2) and is `null` for
these four — do not read it as the ordering signal for Wave 7.
`product-card`'s content migration ships **separately**, after the abstraction is proven — it keeps
the old attribute alongside the new for one deploy cycle, uses WP-CLI batch under `--user=1` (KSES
strips CSS from block attributes otherwise), and writes a `_sgs_media_legacy_backup` postmeta.

⚠ `sgs/container`'s `BackgroundPanel` is shared by **eight** host blocks. Changing it changes all
eight. Check them before, and after.

---

## The end goal, in Bean's words

> All of the controls are fully wired up, have conditional visibility based on if they are even
> usable, and the controls are consistent across all relevant elements in terms of **which controls
> these elements have** and **the UI of the control**.

Three things, and the third is the one that gets forgotten. Two blocks offering the same capability
through differently-shaped controls have not been unified.

⛔ **ABSENCE IS A GAP, NOT A DECISION.** These surfaces were built ad hoc and never standardised, so
a control missing from one is an accidental gap — never evidence it was deliberately excluded. The
census's `gaps` matrix is the operative output; the inventory is not. **Six real gaps** today. The
only legitimate exclusion is a genuinely DIFFERENT concept: `decorative-image`'s `positionX`/`positionY`
are absolute page placement, not the position of an object inside its container.

---

## Standing constraints

- **Commit by exact path.** A hook rejects a commit with no pathspec. Two other hooks will stop you
  and both take a literal token IN THE COMMAND, not in a `-F` message file: the detector-first gate
  wants `[repeat-ok:<specific reason>]`, the path-scope gate wants `[batch-ok:<reason>]`.
- **Never `git checkout --` a file to undo an edit** — it reverts to the last commit and silently
  takes unrelated uncommitted work with it. Save bytes, patch, restore, verify md5.
- ⛔ **Zero attribute renames.** WordPress silently discards an attribute a block no longer declares,
  so a rename is a stored-`post_content` migration (D338).
- ⛔ **No inline `style=""`** (Spec 32). Values are custom properties; rules live in the stylesheet.
- ⛔ **No block deprecations, no version bumps** — pre-production (D270/D293).
- **A grep returning 0 is a hypothesis.** This track's recurring failure is grepping a block's own
  file when a SHARED helper is the reader. `BackgroundPanel` and `ContainerWrapperControls` both live
  under `src/blocks/container/components/`, not `src/components/`.
- **Every number you write must come from a command you just ran**, not from a doc, a prior message
  or a subagent. State the command beside the number or omit the number.

## First action (< 5 min)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes
     WHERE css_property IN ('object-fit','object-position') ORDER BY block_slug"
```

Read your own output rather than trusting a count here — this repo's rule is that every number
comes from a command you just ran. Then open `sgs/hero`'s `render.php` around the
`$sgs_hero_split_media_fit_selector` assignment and read how a working object-fit is scoped. That is
the shape `sgs/media` adopts in Wave 5a, and reading it first will save you the hour the last session
spent arriving at it another way.
