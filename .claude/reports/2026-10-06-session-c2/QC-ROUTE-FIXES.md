# QC verdict — the four route-defect fix proposals

**2026-10-06.** Four read-only diagnoses (Sonnet, routed via `/delegate`), each QC'd in the main thread
against the cited code. **All four diagnoses are verified on their load-bearing claims.** Three of the
four proposals are approved with modifications; one part is deferred.

The headline is not the artefact cleanup. **Two of the four found live write hazards** — places where the
route would write a wrong value into a client's tree from a measurement artefact. Those are a different
class of defect from the phantom rows we went looking for, and they go first.

---

## The two write hazards (highest value, smallest change, independent of everything else)

### H1 — `sgsAnimationStart: load` written from an artefact

`scripts/computed-route/lib/entrance.mjs::entranceStart` ends:

```js
return { writes: [ { attr: 'sgsAnimationStart', value: 'load', merge: 'replace' } ] };
```

Its premise, from its own header comment, is "a block with an entrance that the draft shows at rest while
live still [hides]". But **live is often hidden because the walker read an armed, paused entrance pose**,
not because anything is wrong.

Why that happens: `scripts/parity/lib/devtools.mjs::unfinishedAnimations` filters
`( 'running' === a.playState || a.pending ) && … Number.isFinite( endTime )`. A **paused** pose is
therefore invisible to the settle, and so is an **infinite** animation. The walker declares the page
settled while an armed element sits at `opacity: 0, translate: 0 26px`, which is exactly what
`animation-observer.js::keyframes` builds as the start frame.

**So Solve can write `sgsAnimationStart: load` onto a block because of a walker artefact.** Verified: the
write exists, the filter ignores paused, and the recorded home report shows `gen-home-10` read at a 26px
offset while the walker reported settled.

**Fix:** narrow `entranceStart` to fire only when the element's rect at `scrollY 0` is inside the first
viewport — the first-screen case it was written for. Below-fold armed elements stop producing the write.

### H2 — a 10x wrong transition duration

`plugins/sgs-blocks/includes/helpers-tokens.php::sgs_transition_vars`:

```php
$duration    = $attributes['transitionDuration'] ?? '';
$duration_ms = preg_replace( '/[^0-9]/', '', $duration );
```

A value of `"0.25s"` becomes `"025"`, emitted as `--sgs-transition-duration:025ms` — **25ms instead of
250ms, silently, a 10x error.**

And `scripts/computed-route/lib/resolve.mjs::formatValue` has **no time branch at all** (verified: no
seconds or ms handling anywhere in it). So a draft `0.25s` would either be refused for a number setting
or written as the string `"0.25s"` for a string setting, producing the 25ms result.

**Status: LIVE.** An earlier reading here called it latent on the grounds that `transitionDuration` is
declared `type: number` on `sgs/button`, `sgs/heading` and `sgs/text` — but **those three blocks do not
call this helper.** All eight that do call it — `sgs/hero`, `sgs/brand-strip`, `sgs/cta-section`,
`sgs/gallery`, `sgs/info-box`, `sgs/post-grid`, `sgs/team-member`, `sgs/testimonial-slider` — declare it
**`type: "string"`, default `"300"`**, so the inspector accepts a decimal: `"0.3"` emits 3ms and `"0.25s"`
emits 25ms today. Only a pure-digit string survives. Eye Care's trees use `"250"` and are unaffected, so no
client is damaged, but that is luck rather than safety. Fixed 2026-10-06 in commit `809d30f8d`:
`sgs_transition_vars` refuses a non-integer instead of stripping it. It remains the hard gate for P4.

**Fix:** add a time branch to `formatValue` converting seconds to integer milliseconds, **before**
enabling any transition calibration. Separately, `sgs_transition_vars` should reject a non-integer rather
than silently strip it.

---

## The four proposals

### P1 — walker icon awareness: APPROVED, scope corrected down

**Diagnosis verified.** `scripts/parity/lib/collect.mjs` guards text properties with
`if ( src && ! /^icon-/.test( p ) )`; `compare.mjs::sameValue` returns false when either side is
`undefined`; and `compare.mjs::partIrrelevant` ends
`return /^icon-/.test( p ) && ( undefined === d[ p ] || undefined === l[ p ] )` — the **only** icon
exemption, rescuing `icon-*` keys and never text keys. So a draft glyph produces 8 text keys, the live
SVG produces none, and every one becomes a row.

Bean's insight holds: `sgs/icon/block.json` already models an icon as a source plus a size —
`iconSource` enum `['lucide','wp-icon','dashicon','emoji','custom']`, `iconSvg`, `emojiChar`, and one
`iconSize`. An emoji icon *is* text; a lucide icon *is* an SVG. The walker is the only layer that does
not know this.

**Three QC modifications:**

1. **Drop `icon-size` for mixed glyph-versus-SVG pairs.** The proposal compares a glyph's `font-size` em
   box against an SVG's box width and admits this is a convention, not pixel parity; its mitigation adds a
   conditional with an unsettled threshold. The pair's `box` `w`/`h` rows already carry the pixel check,
   so the convention buys nothing and can mislead. Compare `icon-colour` only.
2. **Tighten the glyph detector.** A single non-alphanumeric grapheme alone would catch a stand-alone
   `•` separator and silently drop its text comparison. Require the single-grapheme test **plus** an
   icon context — an icon-ish class (`__icon`, `sgs-icon`) or a control parent (`button`, `summary`).
3. **Blast radius corrected, and it is smaller than claimed.** The proposal left three cases unverified;
   I checked all three against the walk reports:

| Pair | Reality | Does P1 apply? |
|---|---|---|
| `help` `faq-icon-1` / `-2` | draft 8 text keys, live 0, live has all 4 `icon-*` keys | **YES** — the genuine glyph-versus-SVG case |
| `footer` `social-whatsapp` | **both** sides carry all 4 `icon-*` keys | **NO** — svg-versus-svg. Its rows are a real difference (draft box 40x40, live 44x44 — the touch target again) |
| `lens` `gen-lens-0` | **both** sides carry `icon-*` keys, and both carry 5 text keys | **NO** — svg-versus-svg |
| `product` `gen-product-4` | draft has `icon-*`, live has none; pair root is the whole buybox grid | **NO** — this is P2's icon-reader-scope defect |

**So P1's real payoff is the 11 help accordion rows, not the ~15 implied.** Approve on that basis.

### P2 — walker pairing: part (b) APPROVED, part (a) DEFERRED

**Diagnosis verified and it reframes the problem usefully: only one of the three is a mispair.**

| Instance | Real cause | Fix |
|---|---|---|
| `process-steps` | **A genuine hand-config error.** `sites/eye-care-ward-end/build/qa/parity/home.mjs` targets live `.sgs-process-steps__step:nth-of-type(i) .sgs-process-steps__title` — the title, not the step. The config's own accept note describes the mispair ("The draft's step element contains its number") | Retarget the live finder to the step; delete the stale accept entry |
| `gen-help-17` | **Not a mispair.** `parity/lib/paint.mjs::layoutElement` descends through single rendered children; the draft removes the answer when closed so it descends to the button, while live's closed `<details>` still has two rendered children so it stays put | Exclude non-`summary` children of a closed `<details>` |
| `gen-product-4` | **Not a mispair.** `collect.mjs` reads `el.querySelector('svg')` — the first SVG *anywhere* inside — so on a container it reads whichever icon comes first, differently on each side | Read `icon-*` only when the element is an SVG or contains exactly one painted SVG |

**Part (a), the twin-containment gate, is deferred.** It needs new capture (word indices inside each pair
element) and its own exact count is unsettled — the proposal says only a check-only run across 17 surfaces
can give it. **Its negative work is valuable and should be kept on record:** it tested the box-ratio signal
and found it unsafe (flags 40 pairs, at least 12 legitimate — a phone link 91 vs 109 wide, a submit button
166 vs 335). That rules out the obvious gate, which is worth knowing before anyone proposes it again.

**Do part (b) first**, as the proposal recommends: the gate needs a corrected `about-step` config as its
own positive control.

### P3 — unsettled state: APPROVED, and it found a false green

**Diagnosis verified.** Beyond H1 above, the proposal found that instance 3 is **not** a forced-hover
limitation, as I had assumed. `brand-track` already uses a real pointer
(`chrome-walk.mjs::hoverChrome` calls `page.mouse.move`). The recorded pointer positions are the proof:

| Width | live `at.x` | draft `at.x` |
|---|---|---|
| 768 | **−1786** | 1301 |
| 1440 | **−1452** | 1301 |
| 1920 | **−1228** | 1298 |

`collect.mjs::centreOf` returns the centre of the element's **raw rect**. The marquee track is far wider
than the viewport and mid-translate, so the live pointer lands off-screen, `mouseenter` never fires, and
the pause class is never added.

**And 768 is a false green:** both sides' pointers are off-screen there (a draft `at.x` of 1301 against a
768px viewport), so neither pauses and the row matches *by accident*. **A false green is worse than a
false red** — it is a test that passes for the wrong reason, and nothing would have surfaced it.

**Fix:** clamp the hover point to the intersection of the rect and the viewport, verify with
`document.elementFromPoint`, and return `unreached: true` rather than reading "no change" as a pass.

**One modification:** the proposal also wants to tighten triage's `transientOf` because it currently
swallows a genuine resting difference (`brand-link` opacity 0.75 against live 1). Approved, but as a
**separate** change after the walker fix lands, so the two are not entangled.

### P4 — transition calibration: APPROVED, strictly gated behind H2

**Diagnosis verified, and it corrects two of my own claims.**

1. **"No `transition,*` row calibrates anywhere" is too strong.** Transition rows carrying `enum_values`
   already take the enum branch. The proposal said 12 and this verdict first said 7 with a block list that
   summed to 6 and named `sgs/nav-bar-menu` three times. **The DB says 6**, re-queried 2026-10-06:

   ```
   sgs-db.py sql "SELECT block_slug, attr_name, css_property, enum_values FROM block_attributes
     WHERE css_property LIKE 'transition%' AND enum_values IS NOT NULL AND enum_values != ''"
   ```

   `sgs/heading::transitionEasing`, `sgs/text::transitionEasing`, `sgs/nav-bar-menu::burgerMorphEasing`,
   `sgs/nav-bar-menu::itemMotionEasing`, `sgs/icon-list::itemMotionEasing` and
   `sgs/nav-drawer-menu::itemMotionEasing` — so `sgs/nav-bar-menu` twice, not three times, and
   `sgs/nav-drawer-menu` was missing from the list. **All six are `transition-timing-function`: no duration
   row takes the enum branch at all**, so P4's integer-millisecond duration marker cannot collide with one.
2. **Most of Eye Care's transition rows are not a route gap at all.** `sgs/google-reviews`,
   `sgs/accordion-item`, `sgs/media` and `sgs/choice-flow-question` have **no `transition*` attribute in
   the DB**. Their rows are a *framework* gap (no control exists), S1-adjacent — not something a marker
   would make actionable. Of 107 transition rows in the sweep, roughly 19 are plausibly actionable.

**The marker design is sound and its constraints are real**, both traced to PHP:
- Duration marker must be an **integer millisecond** (`437`), never a CSS time — because of H2's strip.
- Easing marker must come from the whitelist `['ease','ease-in','ease-out','ease-in-out','linear']` and
  must **not** be `ease-in-out`, which is the fallback and also the default on some blocks, so it would
  read dead for the wrong reason.

**Hard gate: H2's `formatValue` time branch lands first.** Enabling calibration before it means the route
writes 25ms where 250ms was intended. The proposal says this itself and it is correct.

---

## Recommended order

| # | Change | Why this position |
|---|---|---|
| 1 | **H1** narrow `entranceStart` to the first viewport | Live write hazard, small, independent |
| 2 | **H2** `formatValue` time branch + reject non-integer in `sgs_transition_vars` | Write hazard, and the hard gate for P4 |
| 3 | **P3** clamp the hover point | Fixes a false green, which outranks phantom rows |
| 4 | **P2 part (b)** three targeted fixes | ~59 rows, well-understood, one config and two reader scopes |
| 5 | **P1** icon normalisation, modified | 11 rows |
| 6 | **P4** transition marker | Only after 2 |
| 7 | **P2 part (a)** twin-containment gate | Needs new capture; count unsettled |
| 8 | **P3's** triage `transientOf` tightening | After 3 lands |

Every change carries the negative control its proposal named: a test that goes red on revert, and a test
that proves it does not over-suppress. 523 route tests pass today and must still pass.
