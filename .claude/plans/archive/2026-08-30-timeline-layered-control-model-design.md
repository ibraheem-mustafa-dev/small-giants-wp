# sgs/timeline — layered control model (DESIGN GATE)

**Status:** PROPOSED — not approved, no code written.
**Date:** 2026-08-30
**Owner decision required before build.**
**Council:** `/qc-council` run 2026-08-30. Two raters (code-path tracer, client-experience),
both returned REQUEST REVISION. Every required revision is applied below. Rater scores on the
PRE-revision draft: Accuracy 4/10 (D) / Clarity 6/10 (A); Completeness 6 and 5; Practicality 7
and 7. The 4/10 was earned by §6, whose diagnosis was wrong twice — see §6.

**Council verdict: the layered model itself was not challenged by either rater.** Both attacked
the evidence and the client-facing surface, and both accepted the axis model, the valid-
combination matrix, the breakpoint spec, the a11y conditions and the `data-sgs-fx` mechanism as
sound. Revisions are to §2 (labels + panel consolidation), §6 (diagnosis), §7 (migration
conditioning), and Q1 (dropping a false technical argument).

---

## 1. Why this exists

Three problems, one root cause.

**Problem A — the client cannot express a mobile layout at all.** `orientation` and `alignment`
are single global attributes with no per-device axis. One setting drives 375px and 1440px alike.
Verified: `block.json` declares neither with an `enum`, and there is no `*Mobile`/`*Tablet`
sibling for either.

**Problem B — `alignment` conflates two independent decisions** — where the rail sits, and how
content distributes around it. That is why `centre` is vestigial (it renders as a near-duplicate
of `left`: node hard-left, single column, differing only by an 8px rail offset), why the
middle-rail-with-content-both-sides layout is actually called `alternating`, and why the owner's
requested option — *content on both sides but consistently on one side, not zig-zagging* — has
nowhere to live.

**Problem C — the three built GSAP effect modules are wired to nothing.**
`fx-pin-scrub.js`, `fx-scrub.js` and `fx-horizontal-panel.js` exist and are unclaimed. Spec 38
names `sgs/timeline` as "an unclaimed candidate". Verified:
`generated-fx-qualifying-blocks.json` lists `sgs/timeline` against
`carousel-loop, draggable, magnet, morph, motion-path, particles, scramble, scrub, split-reveal,
surface-treatment` — `pin-scrub` and `horizontal-panel` are **absent**.

A preset model was considered and REJECTED by the owner: presets bundle decisions that are
independently meaningful, so choosing a motion style would force an arrangement. The model below
keeps each decision on its own axis and uses progressive disclosure to keep the panel calm.

---

## 2. The layered control model

Five layers. Each layer's visibility depends only on layers above it.

### Layer 1 — Structure (always visible)

| Control | Attribute | Values | Default |
|---|---|---|---|
| Direction | `orientation` | `vertical` · `horizontal` | `vertical` |
| Mobile layout | `mobileLayout` | `stacked` · `carousel` | `stacked` |

**`mobileLayout` is deliberately at Layer 1, not inside the motion panel.** It is the single
fallback target for every visualisation mode (see §6), so it must be visible whatever else is
chosen.

### Layer 2 — Arrangement (panel; contents depend on Direction)

| Control (client-facing label) | Attribute | Vertical values | Horizontal values | Default |
|---|---|---|---|---|
| **How entries line up** | `contentLayout` | `alternating` · `same-side` · `single-column` | `alternating` · `same-side` · `single-row` | `alternating` |
| **Which side of the line** | `contentSide` | `start` · `end` | `above` · `below` | `end` |
| Date position | `datePosition` | `own-column` · `inline` | `inline` only | `inline` |

Client-facing values for Date position: **"In its own column"** / **"Next to the title"**.
⚠ `own-column` is silently ignored at ≤767px (§5). It therefore needs its own permanent help
text — *"On phones the date always sits above the title, so there's room for it."* — for the
same reason as Layer 5's: a client sets it, sees it on desktop, and never learns it collapses.
| ~~Media placement~~ | ~~`milestoneMediaPlacement`~~ | **REMOVED 2026-08-30** | — | — |

⛔ **`milestoneMediaPlacement` and its `date-over-media` value were REMOVED on owner verdict
(2026-08-30).** The owner judged the overlay "awful" and specifically questioned why it existed on
the stacked/mobile layout at all — where the entry is already single-column with room above the
media, so overlaying the date buys nothing and costs legibility. It had shipped one day earlier
(`bc52064a8`), was referenced only inside the block's own four files, and no theme pattern or
template used it. Media now always sits under the date.

⚠ This deleted CSS that had been fixed hours earlier the same day (the overlay's own
`min-width: 768px` scoping). That work was not wasted — it proved the specificity mechanism and
validated the identical fix for `--media-under`, which stays — but the overlay code itself is gone.
Recorded so nobody re-derives the deleted rules from the earlier addenda and reinstates them.

⭐ **The owner's eye overruled a controller "correct by design" verdict, and was right to.** The
controller had measured the date pill at 180px against a 180px media width, concluded it spanned
the image exactly as intended, and closed the open debt. That was a statement about MECHANISM.
Whether it looks good is the owner's call (R-31-13), and it did not.

`contentSide` renders only when `contentLayout === 'same-side'`.
`datePosition: own-column` is desktop/tablet only — see §5.

### Layer 3 — Rail (panel, always available)

| Control | Attribute | Values | Default |
|---|---|---|---|
| Connector style | `connectorStyle` | `line` · `dashed` | `line` |
| Connector colour | `connectorColour` | token | `border` |
| Animated progress fill | `connectorProgressFill` | bool | `false` |
| Fill colour | `connectorFillColour` | token | `accent` |
| *(keep shipped label)* Reveal each milestone | `revealTrigger` | `viewport` · `connector` | `viewport` |
| *(keep shipped label)* Stagger delay (ms) | `revealStagger` | ms | `100` |

⚠ **Do NOT rename these to "Reveal trigger" / "Reveal stagger".** The shipped labels in
`edit.js:911-927` are already clearer and carry good help text; the first draft proposed a
regression to developer jargon. Same for the row-stripes label — "Alternating row colours" is
shipped and better than "Row background bands".

`revealTrigger: connector` renders only when `connectorProgressFill` is on — the connector cannot
trigger a reveal if it is not drawn.

### Layer 4 — Appearance (panel)

| Control | Attribute | Values | Default |
|---|---|---|---|
| Alternating row colours | `rowStripes` | bool | `false` |
| Band colours A / B | `rowStripeColourA` / `B` | token | `""` / `surface-alt` |
| Milestone spacing | `entryGap` | box/length | theme |
| Heading level | `headingLevel` | `h2`–`h6` | `h3` |

### Layer 5 — Scroll effect (panel)

| Control | Attribute | Values | Client-facing option strings | Default |
|---|---|---|---|---|
| Scroll effect | `scrollEffect` | `basic` · `pinned-journey` · `pinned-horizontal` | "Standard" · "Pin and reveal" · "Pin and slide sideways" | `basic` |

Gated by Direction — see §4.

⚠ **Renamed from "Visualisation" on council review.** A non-technical client reads
"Visualisation" as a chart or infographic, not a scroll behaviour. The attribute is
`scrollEffect`, not `visualisation`.

**Mandatory dynamic help text** whenever `pinned-journey` or `pinned-horizontal` is selected —
naming the CURRENT `mobileLayout` value, not an abstraction:

> "On phones this always shows as *[Stacked | Swipeable cards]* instead — the pinning effect
> needs a full screen to work."

It must be permanent help text, not a dismissible notice: the editor canvas does not render at
375px by default, so the client has no other reliable channel to discover the fallback.

### Panel consolidation — DECIDED (both raters flagged this)

`edit.js` today has **8** `PanelBody` panels (Timeline Settings, Timeline entries, Layout,
Milestone media, Connector, Spacing, Border, Scroll reveal) plus a separate `SgsColourPanel`.
The five layers **REPLACE and ABSORB** four of them, they do not sit beside them:

| Existing panel | Fate |
|---|---|
| Layout | → absorbed into Layer 1 + Layer 2 |
| Connector | → absorbed into Layer 3 |
| Scroll reveal | → absorbed into Layer 3 |
| Milestone media | → absorbed into Layer 2 (**including its existing `milestoneMediaWidth` and `milestoneMediaDecorative` controls, which the first draft dropped — they are retained, not removed**) |
| Timeline entries | unchanged (the repeater) |
| Spacing / Border | unchanged (shared box controls) |
| `SgsColourPanel` | unchanged — colour rows stay there; Layer 3/4 reference colours but do not re-home them |

Resulting total: **Layers 1–5 (5) + Entries + Spacing + Border = 8 panels + SgsColourPanel** —
the same count as today, not an increase. R3's "five panels is the ceiling" was wrong as written
and is corrected here: the ceiling is *no net increase over today's 8*.

---

## 3. Attribute changes

| Attribute | Change | Notes |
|---|---|---|
| `orientation` | **enum added** (`vertical`,`horizontal`) | `block.json` declares no enum, but `render.php:108` ALREADY sanitises via `in_array($orientation, ['vertical','horizontal'], true)` and `:387` emits the class from the sanitised value. Adding the enum is defence-in-depth for the EDITOR surface, not a fix for a live render bug — do not claim otherwise |
| `mobileLayout` | **NEW** | closes Problem A |
| `contentLayout` | **NEW**, replaces `alignment` | closes Problem B |
| `contentSide` | **NEW** | the owner's missing option |
| `datePosition` | **NEW**, replaces `showDateColumn` | boolean → enum; same two states, clearer naming, room for a third later |
| `visualisation` | **NEW** | closes Problem C |
| `entryGap` | **NEW** | currently a hardcoded `margin-bottom` |
| `alignment` | **RETIRED** | migrated, see §7 |
| `showDateColumn` | **RETIRED** | migrated to `datePosition` |
| everything else | unchanged | |

⛔ **No `deprecated.js`.** This project deleted every block deprecation plugin-wide (D270) and
bans adding one. Migration is a WP-CLI batch rewrite of stored `post_content` — §7.

---

## 4. Valid-combination matrix

`orientation` × `visualisation`:

| | basic | pinned-journey | pinned-horizontal |
|---|---|---|---|
| **vertical** | VALID | VALID | **NOT OFFERED** — a pinned horizontal translate has no meaning on a vertical rail. Hidden from the control, not disabled. |
| **horizontal** | VALID | **NOT OFFERED** — `fx-pin-scrub` staggers entries down a pinned vertical section; on a horizontal rail it duplicates `pinned-horizontal` badly | VALID |

`orientation` × `contentLayout` — all 6 valid; the terms transpose (left/right → above/below).

`contentLayout` × `datePosition`:

| | own-column | inline |
|---|---|---|
| alternating | VALID | VALID |
| same-side | VALID | VALID |
| single-column | VALID | VALID |

No forbidden cell — but `own-column` is suppressed at ≤767px in all three (§5).

`visualisation` × `revealTrigger`: when `visualisation === 'pinned-journey'`, the pin timeline
owns each entry's opacity/transform. `revealTrigger`/`revealStagger` must be **disabled with
helper text**, not silently ignored — running both is a double-driver defect.

---

## 5. Per-breakpoint layout spec

Breakpoints are fixed framework-wide: mobile ≤767, tablet ≤1023, desktop ≥1024.
Tablet follows desktop for every axis (no third tier — see §10 Q3).

### Vertical, desktop/tablet

- `alternating` — `grid-template-columns: 1fr auto 1fr`; odd entries populate col 1, even col 3;
  rail centred in the `auto` track.
- `same-side` — same grid; the column named by `contentSide` is populated on **every** row.
- `single-column` — `grid-template-columns: auto 1fr`; rail hard-left, everything in col 2.
- `datePosition: own-column` prepends a gutter:
  `grid-template-columns: minmax(0, var(--sgs-timeline-gutter-width,100px)) auto 1fr`.

Rail offset is declared ONCE as `--sgs-timeline-rail-offset` and read by BOTH the static
`::before` and the animated `.sgs-timeline__progress`. This is now the standing rule — see §6.

### Vertical, mobile (`mobileLayout: stacked`)

**All three `contentLayout` values collapse to one shape.** At 375px a centre rail leaves ~150px
per side, which cannot hold a heading + paragraph + image; the collapse is not a preference.

```
grid-template-columns: auto 1fr;   /* node | content */
```
- node → col 1, spans all rows
- date, media, content → col 2
- `datePosition: own-column` is **ignored**; the date renders inline above the title
- `--sgs-timeline-rail-offset: calc(var(--sgs-node-size) / 2)`

### Mobile (`mobileLayout: carousel`) — either Direction

```
overflow-x: auto;
scroll-snap-type: x mandatory;
```
- each entry `flex: 0 0 min(85%, 320px)`; `scroll-snap-align: start`
- the ~85% leaves a deliberate peek of the next card (the strong discoverability cue)
- the 320px ceiling satisfies WCAG G225
- container carries `tabindex="0"` + `role="region"` + accessible name, **only at this
  breakpoint** (SC 2.1.1 — a native scroller with no focusable children is keyboard-unreachable
  in Safari entirely, and in Chromium before 127)
- the rail renders as a per-card filled/unfilled top border, not a continuous scrub

### Horizontal, desktop/tablet

Flex row; rail horizontal; `--sgs-timeline-h-line-top` positions both halves.

---

## 6. The bug this design must not inherit

**Verified on the deployed canary, 2026-08-30. THE DIAGNOSIS WAS CORRECTED TWICE — read the
corrections, because both wrong versions were confidently held.**

⛔ **Wrong version 1:** "no media-query rule matches the date at all." FALSE. It came from a probe
that filtered rules on `/grid-column|grid-row/` — the mobile rules use the **`grid-area`
shorthand**, which that regex does not match. A false negative manufactured by the instrument.

⛔ **Wrong version 2:** "the mobile rule is absent from the deployed CSS." FALSE. All 40
stylesheets on the page are reachable (0 cross-origin skips, checked explicitly) and the mobile
rule is present.

✅ **The real cause is a SPECIFICITY LOSS, not an absence.** Two rules place the date:

| Rule | Specificity | Media query |
|---|---|---|
| `.--vertical.--align-alternating .__entry:nth-child(2n+1) .__date` → `grid-area: 2 / 2` | **(0,5,0)** | `max-width: 767px` |
| `.--media-under.--vertical.--align-alternating .__entry--has-media:nth-child(2n+1) .__date` → `grid-area: 1 / 1` | **(0,6,0)** | **NONE** |

The `--media-under` placement carries one extra class AND no media query, so it applies at every
width and outranks the mobile collapse. Measured at 375px across all four media-bearing
alternating timelines: `dateArea` is `1 / 1` (`2 / 1` for `--media-overlay`), never the `2 / 2`
the mobile rule asks for; entry columns stay `267.969px 76.0312px`.

So the mobile collapse works for a timeline with NO media, and silently loses for every timeline
WITH media. That is why content is 76px wide and the date sits at x=0 under the rail's glow —
the apparent "clipped 023" is the glow painting over the "2", not clipping.

**Source locations (verified 2026-08-30, re-grep rather than trusting these numbers):**

- Mobile collapse — `style.scss:~1067`, inside the `@media (max-width: 767px)` opened at `:954`.
  Present in `src/` since commit `a7f85a4a6b` (2026-05-18) and present in the current build
  output. It correctly beats the plain desktop alternating rule at `:503` (same (0,5,0), later).
- The rule that beats IT — `style.scss:1142` opens
  `.sgs-timeline--media-under.sgs-timeline--vertical.sgs-timeline--align-alternating {`
  with `.sgs-timeline__entry--has-media:nth-child(odd)` at `:1156`. **No media query**, and it
  sits AFTER the mobile block. So it wins on specificity AND on source order.

**Fix shape (hypothesis, needs its own measurement before build):** scope the `--media-under` /
`--media-overlay` placement blocks to `@media (min-width: 768px)` so they stop applying at
mobile. Preferred over raising the mobile rule's specificity, which starts an arms race.
**Do not treat this as validated — measure `dateArea` before and after; expected `1 / 1` → `2 / 2`
at 375px on a media-bearing alternating timeline, and unchanged at desktop.**

**Council note:** Rater D independently challenged the earlier version of this section and
predicted the resolution — its revision request listed "losing to something not yet identified
(a third rule…)" as hypothesis (a). The third rule is the `--media-under` block above. D also
correctly ruled out the stale-build explanation by grepping the local build output and
`git blame`-ing the rule to 2026-05-18.

⭐ **This is the project's own `a-losing-css-rule-looks-identical-to-an-absent-one` rule, hit
twice in one session by the person who cited it.** A rule that loses produces the same rendered
output as a rule that is missing; only a specificity comparison distinguishes them. Never
conclude "absent" from a probe that filters rule text — enumerate what matches the element and
compare specificity.

Separately fixed on 2026-08-29 (`0ee282b0f`): the rail's two halves sat 171px apart at mobile,
because the collapse moved only the `::before` and not `.sgs-timeline__progress`.

**Standing rule for this design:** every breakpoint rule that moves the rail must move BOTH
halves, via one declared `--sgs-timeline-rail-offset`. Every breakpoint rule that changes
`grid-template-columns` must re-place EVERY child it affects in the same rule — a grid change
without matching placements is the defect above.

---

## 7. Migration

One WP-CLI batch rewrite of stored `post_content` (FR-31-6 convention; no runtime legacy
fallback in `render.php`, no `deprecated.js`).

| Old | New |
|---|---|
| `alignment: "alternating"` | `contentLayout: "alternating"` |
| `alignment: "left"` | `contentLayout: "single-column"` |
| `alignment: "centre"` | `contentLayout: "single-column"` |
| `showDateColumn: true` **AND** `alignment === "left"` | `datePosition: "own-column"` |
| `showDateColumn: true` but `alignment !== "left"` | `datePosition: "inline"` — see below |
| `showDateColumn: false` | `datePosition: "inline"` |

⛔ **The migration MUST condition on `alignment === 'left'`, exactly as `render.php:133` does:**
`$date_gutter = ! empty($attributes['showDateColumn']) && 'left' === $alignment;`. The toggle is
also only rendered in the editor when `alignment === 'left'` (`edit.js:723`), so a stored
`showDateColumn: true` on an `alternating`/`centre` row is DEAD today — it has zero visual
effect. A blind 1:1 boolean map would silently ACTIVATE a gutter layout that never rendered
before, changing pages nobody asked to change. Reachable via import/REST even though the UI
gates it.
| *(absent)* | `mobileLayout: "stacked"` |
| *(absent)* | `visualisation: "basic"` |

**`centre` → `single-column` is visually lossless** — `centre` already rendered as a
near-duplicate of `left`. The only loss is an 8px rail offset that was itself a bug (it put the
line on the node's right edge rather than through the dots).

⚠ **It is NOT lossless to the client, and the migration must say so.** Someone who deliberately
picked "Centre" will find that option gone from the dropdown with no explanation, and
`deprecated.js` is banned (D270) so there is no in-editor notice available. **The migration
script must log every affected post ID** so the change can be raised with the client
deliberately, rather than discovered by them.

⚠ `wp post update` without `--user=1` strips CSS out of block attrs via KSES. Any migration
script must pass a user.

---

## 8. Accessibility conformance conditions

1. **WCAG 1.4.10 Reflow** — the mobile carousel conforms via **Sufficient Technique G225**
   (a horizontally-scrolling section panel inside a vertically-scrolling page), provided each
   panel fits within 320 CSS px and nothing outside the scroller is pushed off-axis. It does not
   need, and must not be argued from, the two-dimensional-layout exception.
2. **SC 2.1.1 Keyboard** — `tabindex="0"` + `role="region"` + accessible name on the scroller,
   scoped to the breakpoint where it scrolls.
3. **SC 2.5.7 Dragging Movements** — native `overflow` scrolling is exempt because the user agent
   provides the mechanism; content that suppresses native scrolling and implements its own is
   not. **Therefore `pinned-journey` and `pinned-horizontal` must never run at ≤767px.** They
   fall back to `mobileLayout`. The existing module already gates this way:
   `fx-horizontal-panel.js:124` uses `gsap.matchMedia().add('(min-width: 768px)')`, and its own
   comment at `:337` states that below 768px the instance registers no handler. Neither module
   calls `normalizeScroll`, which is what breaks touch in the reported cases.
4. **Reduced motion** — every hidden-until-revealed state must be gated on `.is-js` AND have its
   reduced-motion override at matching specificity. A losing rule is indistinguishable from an
   absent one.
5. **Meaningful sequence (1.3.2)** — alternation must stay CSS-only (`nth-child` placement), never
   DOM reordering, so reading order stays chronological.

---

## 9. Build sequence

1. Fix §6's mobile placement bug on the CURRENT model — it is broken today and independent of
   this design.
2. Add `mobileLayout` + the mobile carousel (Layer 1). Highest value, lowest risk.
3. Split `alignment` → `contentLayout` + `contentSide`; add `datePosition`. Migration + reseed.
4. Add `visualisation`, wiring `fx-pin-scrub` / `fx-horizontal-panel` block-private
   (`data-sgs-fx` on the root), NOT via the generic fx panel.
5. Add `entryGap`, heading level surfacing (Layer 4).

Steps 2–4 each need a visual-diff report and a live 375px measurement.

---

## 10. Open questions for the owner

**Q1 — does `scrollEffect` wire block-private or through the generic fx panel?**
Recommendation: **block-private**, on CURATION grounds only. The generic panel would expose raw
knobs (pin length, ease, `start`/`end`) beside scrub/magnet/particles — the opposite of the
curated "standard setups" the owner asked for. D294's "content-KIND composites render
block-private" precedent supports it.

The mechanism is verified real: `includes/class-sgs-motion-registry.php:1199` runs
`preg_match_all('/data-sgs-fx="([a-z0-9-]+)"/i', ...)` server-side to find the effect name in
markup, and both modules read `data-sgs-fx-*` companions.

⚠ **An earlier draft justified this on a technical incompatibility that does not exist.** It
claimed `fx-pin-scrub.js`'s `resolveParticipants()` requires `sgs-container__inner` descendants
that this block lacks. Rater D showed the function has **three** tiers (`:219-244`): explicit
`[data-sgs-fx-child]`, then unwrap via `WRAPPER_CLASSES`, then a **fallback to
`laidOutElements(el.children)`** at `:243`. For the timeline's root `<ol>` that fallback resolves
to the `<li>` entries — a perfectly sane participant set. The recommendation stands; the
technical-blocker argument does not, and must not be repeated.

**Q2 — build `contentSide` (the "same side" option) now or after the mobile work?**
It is net-new layout with no migration risk, but it is the owner's originally-requested option.

**Q3 — does tablet get its own tier?**
Recommendation: **no.** Tablet follows desktop. A third tier doubles the matrix for a device
class that rarely needs divergent treatment here.

**Q4 — `entryGap` as a box attribute or a single length?**
Recommendation: single length. Vertical rhythm only; a 4-side box invites nonsense values.

---

## 11. Risks

- **R1 — PARTLY RESOLVED (2026-08-30 structural pre-gate).** `render.php:57` reads `orientation`,
  `:108` sanitises it against `['vertical','horizontal']`, `:387` emits
  `sgs-timeline--{orientation}` and `:388` branches on vertical. So the class mechanism is
  understood and each new axis can emit its own modifier class the same way. STILL UNREAD: how
  `alignment` and the media/stripe modifiers compose in the same wrapper list — read
  `render.php:380-400` in full before step 3.
- **R2 — shared-DB reseed.** Steps 3–4 need `/sgs-update`; announce first, it breaks other
  tracks' builds mid-run.
- **R3 — control-panel sprawl.** Five panels is the ceiling. If Layer 4 grows, it merges into
  the block's existing Styles tab rather than adding a sixth.
- **R4 — the entry grid is shared.** Per `style.scss:1097-1102` (line refs re-verified
  2026-08-30 after an earlier edit shifted the file by 34 lines), the entry grid is shared with
  the connector, the fill mask and the spark positions; an unconditional change moves the
  milestone dots and silently breaks FR-38-35. Every step must re-measure the dots.
- **R5 — line references in this doc rot.** The R4 citation above was stale within one day, from
  this session's own edit. Re-grep for the quoted text, never trust a cached line number.
