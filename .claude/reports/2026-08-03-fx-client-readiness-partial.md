# FX Client-Readiness Audit — Cursor / Audio / Image-Sequence / SVG Motion / Page Transitions

Read-only audit, 2026-08-03. Judged against: can a tech-illiterate client discover, configure via
block inspector, and get a good result — not "does the code exist".

## 1. Cursor systems (`sgs/*` cursor-follow background, FR-38-25)

Runtime split: emitter (`plugins/sgs-blocks/src/shared/effects/cursor-field.js`) publishes pointer
position as CSS custom properties; field TYPES paint via pure CSS
(`plugins/sgs-blocks/assets/css/fx-cursor-field.css`).

Picker options, `FX_FIELD_TYPE_OPTIONS` (`plugins/sgs-blocks/src/blocks/extensions/fx.js:339-345`):

| Picker label | value | CSS rule present? |
|---|---|---|
| "Glow — a soft pool of light" | `''` (default) | Yes — `fx-cursor-field.css:73-79` (`[data-sgs-cursor-field="glow"]`, radial-gradient layer) |
| "Torch — reveals a pattern beneath" | `spotlight-mask` | Yes — `fx-cursor-field.css:91-103` (`[data-sgs-cursor-field="spotlight-mask"]`, separate `mask-image` mechanism) |

Both picker entries have a real paint rule — **no dead-option finding this pass** (unlike the
prompt's cited historical failure mode). Controls: Field style, Field colour (both
`isShownByDefault`, `fx.js:2135-2170`) — genuinely discoverable, not buried.

- **Reachability traced end-to-end:** editor control → `fxFieldType`/`fxFieldColour` attrs →
  server injects `data-sgs-cursor-field="<type>"` (per fx.js docblock lines 128-133, backed by
  `includes/fx-cursor-field.php`) → `cursor-field.js:299` `initCursorField()` reads it → CSS paints.
  Confirmed by reading the emitter source directly (`cursor-field.js:1-428`), not just its docblock claims.
- **Reduced motion:** SIMPLIFY not suppress — static resting field always paints; tracking only is
  dropped (`cursor-field.js:359-363`).
- **Fail-open no-JS:** static CSS fallback custom properties (`fx-cursor-field.css:59-63`) — a
  page with JS blocked still renders one fixed soft field.
- **Touch/coarse pointer:** gated off both in JS (`supportsFinePointer()`/`isTouchInput()`,
  `cursor-field.js:361,406`) and CSS (`fx-cursor-field.css:157-167`) — degrades to "effect off",
  never a misaligned/broken field.
- **Participants (opaque children):** painted automatically at runtime via computed-background
  detection (`cursor-field.js:142-163`) — no per-child client control, deliberately (fx.js
  docblock comment, lines 2126-2133) because exposing it on ~51 blocks would be noise nobody opens.
- **Good-by-default:** yes — glow is the zero-config default and is a standard, tasteful effect.
- **Most likely client failure:** picking a field colour that clashes with the block's own
  background — there's no live-contrast warning in the inspector.

**Verdict: CLIENT-READY.**

## 2. Audio-reactive (`sgs/audio`)

Source: `plugins/sgs-blocks/src/blocks/audio/{view.js,block.json,edit.js}`. 7 `playerStyle`
variants; `REACTIVE` set = `spectrum`, `oscilloscope`, `gradient-pulse`, `radial`
(`view.js:23`), each driven by a shared `AudioContext` + per-instance `AnalyserNode`
(`view.js:26-33,64-89`).

- **Visual quality (read, not assumed):** `spectrum` draws 32 gradient bars with rounded caps
  from live frequency data (`view.js:352-372`); `oscilloscope` draws a glow-stroked waveform from
  time-domain data (`view.js:373-399`); `gradient-pulse` recolours a gradient background by
  bass/treble bias + level (`view.js:321-345`); `radial` draws an SVG progress ring plus a
  level-reactive glow (`view.js:282-314`). All four are genuinely audio-reactive, not decorative
  loops — each reads `analyser.getByteFrequencyData`/`getByteTimeDomainData` per frame.
- **Client-configurable:** source (external URL / media library), player style, and TWO colours —
  "Accent colour" (`accentColour` → `--sgs-audio-accent`) and "Spectrum colour" (`spectrumColour`
  → `--sgs-audio-spectrum`) per `block.json:56-70,147-155`. **No sensitivity/gain control** — grep
  of `block.json` found only the two colour attrs; `analyser.fftSize`/`smoothingTimeConstant` are
  hardcoded in `view.js:75-76` (512 / 0.8), not exposed.
- **Degrades sensibly:** cross-origin audio without CORS taints the analyser silently — audio still
  plays, transport still works, visualiser idles motionless (`view.js:16` docblock + `catch` at
  line 85-88 swallowing `createMediaElementSource` failure). Autoplay-policy safe (context created
  on first play gesture, `view.js:15,101-104`). Off-screen/paused = zero CPU via
  IntersectionObserver gate (`view.js:174-215`). Reduced motion freezes the reactive draw to one
  static frame (`view.js:18,24,177`).
- **Discoverability as a general "effect":** **buried.** It only exists as one of 7 style options
  inside the audio-PLAYER block's own settings — nowhere does the block inserter or any other
  block's inspector surface "reactive audio visualiser" as a generic effect a client might pick.
  A client would only find it by already knowing to insert an Audio block and open its style
  dropdown.

**Verdict: NEEDS WORK.** (Visual quality and resilience are genuinely good; the gap is
discoverability + no sensitivity control, not implementation quality.)

## 3. Image sequences (`sgs/image-sequence`)

Source: `plugins/sgs-blocks/src/blocks/image-sequence/edit.js`.

The block's own editor UI states this plainly, unprompted (`edit.js:246-252`):

> "This block is hidden from the block inserter (agency-only) because setting it up needs a
> command-line tool with ffmpeg installed — not something a client is expected to do... To add
> this effect to a NEW section, ask Small Giants Studio to prepare the frames and place the
> block."

And the frame-source panel (`edit.js:296-301`) instructs: "Produce numbered frames with the Image
Sequence Prep tool (`scripts/image-sequence-prep.py`), upload the output folder, and paste its URL
below."

**Honest verdict: developer tool.** A non-technical client cannot produce a working sequence
through the block editor alone — frame export/compression requires `ffmpeg` + a Python script run
outside WordPress, and the block is deliberately hidden from the inserter to prevent a client
starting one from scratch. What the editor DOES give a client, once an agency-prepared instance
exists: poster image, alt text, aspect ratio, per-tier (desktop/tablet/mobile) responsive frame
URLs, a "Verify frames" REST-backed check button (`edit.js:59-113`), scroll-effect pin/start/end/
scrub controls, and an explicit frame-count-over-cap warning (`edit.js:152-164`, cap = 200,
enforced server-side per the docblock at lines 20-27). So: fully client-EDITABLE once built, but
not client-CREATABLE.

**Verdict: DEVELOPER-ONLY.**

## 4. SVG motion (`fx-draw` / `fx-morph` / `fx-motion-path`)

### fx-morph — D452 fix status

Confirmed the fix is IN SOURCE: `includes/fx-shape-routes.php:346-383`. The FROM shape's
`data-sgs-fx="morph"` + target/trigger/duration/ease attrs are now emitted onto the inner
`<path>` element (line 377: `sprintf('<svg class="sgs-fx-shape-visual" ...><path%s d="%s">...',
..., $visual_attrs, ...)`), not the `<svg>` wrapper — matching decisions.md D452's stated fix
(`.claude/decisions.md:1322-1357`), and the code carries an inline comment citing D452 by name
(`fx-shape-routes.php:358`) confirming this is the actual landed change, not a stale doc claim.

**Verification status: UNVERIFIED, per the decision log's own words.** D452 ends: *"⚠ OUTSTANDING:
the fix is unverified. The cause is proven and the emit shape is confirmed locally, but no live
morph has yet been observed... a fix is a hypothesis too."* (`decisions.md:1353-1356`). Searched
`decisions.md` for any D453+ entry that re-confirms morph — none found (the D453+ entries present
cover focus/keyboard/header/footer/carousel-loop work, not morph). No report file matching a
post-D452 morph re-verification was found either. **Treat morph as unverified live, despite the
fix being present in source.**

**fx-morph client-authorability, separately assessed:** the block's own docblock
(`plugins/sgs-blocks/src/shared/effects/gsap/fx-morph.js:44-51`) states the two shapes need
"roughly MATCHED TOPOLOGY... similar point count and winding order" and that a mismatch "can still
produce visible 'travelling' artefacts". Producing matched-topology SVG path pairs requires either
hand-editing path data or purpose-built vector-morph tooling (e.g. exporting from an illustration
tool with manual point-count alignment) — not a skill any of the named realistic SGS clients
(restaurant, wedding planner, law firm) has, and the block editor provides no assistance generating
a matched pair (only a target-selector text field + linked guidance per §7). **Honest verdict: no
realistic SGS client could supply this input themselves — this is agency-authored-asset-only,
structurally similar to image-sequence.**

### fx-draw

Per spec (§3.4 FR-38-15, `specs/38-SGS-MOTION-SYSTEM.md:577-588`): retires Vivus, re-uses the same
`animationStyle` enum (`draw-on-load | hover-redraw | scroll-trigger`) already on
`sgs/responsive-logo`, so stored instances render identically with no deprecation shim
(D270 policy — no `deprecated.js` in this codebase). Marked in the spec text as a completed swap,
not flagged as a WIP item in the sections read. Not independently re-traced end-to-end this pass
(budget) — spec text is the only evidence gathered; treat as **plausible-built, not independently
confirmed**.

### fx-motion-path

Per spec §3.4 FR-38-17 (`specs/38-SGS-MOTION-SYSTEM.md:594-626`) — Tier V by default
(`offset-path`/`offset-distance`), Tier G only when scroll-scrubbed. D441 (2026-08-01) documents a
resting-position fix (four named presets, CSS `calc()`/`max()` against `--sgs-header-height`) with
detailed live-measurement evidence in the spec text itself. Separately, decisions.md D451
(`decisions.md:1358+`) records a DIFFERENT motion-path defect ("the trigger that switched itself
off could never switch back on" — animated once per page load, not on repeat scroll) — not
re-checked here for current status; flag as **an open motion-path defect of unconfirmed
current state**, distinct from D452/morph.

**Verdict: NEEDS WORK** (draw: plausible-built but unverified this pass; morph: fix present but
explicitly unverified live per D452, AND the input it requires is realistically unreachable by any
SGS client even once verified; motion-path: resting-position fixed with evidence, but a separate
D451 defect's current status is unconfirmed).

## 5. Page transitions (Spec 38 §3.5 FR-38-19)

Read spec section in full (`specs/38-SGS-MOTION-SYSTEM.md:677-717`). Marked
**`✅ BUILT + LIVE-VERIFIED 2026-07-30`** with a named evidence report
(`reports/2026-07-30-motion-waveB-page-transitions-verification.md`, not re-opened this pass —
budget). Cross-document View Transitions API, CSS-only (`@view-transition`), zero frontend JS
(spec states this is itself verified: "the feature ships one stylesheet and nothing else"), named
transition styles (fade/slide/none) settable site-wide AND per-template via a "SGS → Motion"
settings page. Default OFF.

Spec-stated mandatory conditions, all marked live-verified in the spec text: (a) OFF ships zero
bytes per-template, not a no-op stylesheet; (b) reduced motion gates the opt-in itself inside
`@media (prefers-reduced-motion: no-preference)` rather than cancelling after the fact — fails
safe on UAs that can't evaluate the media feature; (c) never active in editor/wp-admin; (d)
per-template list is enumerated live from `get_block_templates()` (measured 15 templates on
canary), not a hardcoded roster. Two implementation decisions are explicitly recorded so they
aren't re-litigated: transitions target the `root` snapshot pair only (no per-element continuity —
that would be a new FR), and `mix-blend-mode: normal` is set explicitly to prevent a UA-default
additive-blend banding artefact.

I did not independently re-run the live verification this pass (out of budget; the spec's own
verification report is cited evidence, not re-opened). Based on the spec text alone, this is the
most convincingly finished of the five categories — narrow scope (CSS-only, no runtime JS to trace)
and detailed, falsifiable live-measurement claims (byte counts, template counts, explicit
"safety was accidental, now stated" corrections that read as genuine engineering rather than
box-ticking).

**Verdict: CLIENT-READY** (with the caveat that this verdict rests on the spec's cited evidence
report, which was not independently re-opened this session — treat as high-confidence but
second-hand for the live-verification claim specifically).

---

## Ranked list — what would most raise the client-facing standard

1. **Independently re-verify fx-morph on a live canary page** (watch actual path geometry change
   over time, per D452's own outstanding item) before trusting it in front of a client. Smallest
   plausible effort: ~10 min (open canary page 2113, sample `d` attribute over ~1.6s as D452's
   own method did).
2. **Confirm current status of the D451 motion-path repeat-trigger defect** (animates once per
   page load, not on repeat scroll) — unconfirmed whether this shipped fixed or is still open.
   ~10 min to re-read D451 in full + spot-check live.
3. **Add a sensitivity/gain control to `sgs/audio`'s 4 reactive styles** — currently hardcoded
   (`fftSize`/`smoothingTimeConstant`), so a client stuck with a quiet source can't make the
   visualiser more responsive. ~15 min (one RangeControl + one attr + wire into `AnalyserNode`).
4. **Surface the audio visualiser as a discoverable "effect" concept**, not just a style dropdown
   buried inside the Audio block — e.g. a short inspector help note or a pattern-library example —
   so a client browsing for effects would find it. ~15 min (copy + one example pattern).
5. **Add a live colour-contrast warning to the cursor-field colour picker** — the most likely way
   an untrained client makes the effect look bad is picking a field colour too close to the
   block's own background/text. ~15 min (reuse existing contrast-check utility already used
   elsewhere in the codebase per WCAG rules).
6. **Do not attempt to make fx-morph "client-authorable"** — it structurally can't be, given
   matched-topology path pairs are a vector-illustration skill no realistic SGS client has. Instead,
   document it internally (like image-sequence) as agency-prepared-asset-only so it stops being
   miscounted as a self-serve client feature in future audits/specs. ~5 min (one doc line).
7. **Independently re-run the page-transitions live-verification** rather than trusting the cited
   2026-07-30 report at face value, since it's the one CLIENT-READY verdict in this audit that
   wasn't re-opened this session. ~20 min (repeat the byte-count + reduced-motion + template-count
   checks the report describes).
