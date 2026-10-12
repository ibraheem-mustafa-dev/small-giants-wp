# Motion token defaults: measured from the three client drafts (Spec 38A unit M1.0)

This report fixes each Spec 38A section 7 framework default inside its band, using the motion values measured in the three client drafts, so unit M1.5 can write `theme.json` values with a citation (FR-38A-15: "a report records the three drafts' measured values each default came from"; section 17 open item "Exact framework default token values").

## Method

- **Sources.** Only the committed handoff folders: `sites/eye-care-ward-end/handoff/animations.json` (213 records), `sites/indus-foods/handoff/animations.json` (217 records) and `sites/mamas-munches-redesign/handoff/animations.json` (195 records), all generated 2026-10-11 from each draft's `.dc.html` source. Each record carries `duration_ms`, `easing`, `properties` (from and to) and `source.code`; hover transitions were read from the `transition:` declarations inside `source.code`.
- **Not instrumented.** The Eye Care records say `trace.observed: "not-instrumented"` (source-derived), so these are source values, not live computed values; no Playwright run was made. Source values are reliable here because the transitions are literal inline `style-hover` / `transition:` strings and JS animation calls; the one place source and render could differ is a transition with no easing, which the browser renders as CSS `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`). Eye Care records have `source.line: null` (template-level), so they are cited by record ID and file `Eye Care Birmingham.dc.html`; Indus records cite function and line in `Indus Foods Website v2.dc.html`; Mama's records cite function and line in the named page `.dc.html`.
- **Counting.** "n transitions" means the number of `transition` declarations in the `source.code` of that client's records with that value (a repeated card template counts once per record, so large counts are repeated templates, not distinct design decisions). Per-client values below are each client's modal value for the role.
- **Rule for the framework default.** Take the median of the three clients' own values for that role (equal weight per client, so a client with many repeated templates does not dominate), then clamp into the section 7 band. Where only two clients have a value, the median is their mean, rounded to a whole pixel or 10ms. Where no draft has a value, the current `theme.json` value is kept if it is in band. Curves are taken component by component (median of x1, y1, x2, y2).
- **Rule for client snapshots.** Section 7 ("Per client") and FR-32-21 say each cloned client's exact values come from its own draft; the bands constrain only the framework defaults in `theme/sgs-theme/theme.json`. So client values below are NOT snapped into band. See the ambiguity note at the end.

## Duration family

| token key | band (section 7) | Eye Care measured | Indus measured | Mama's measured | chosen framework default | why |
|---|---|---|---|---|---|---|
| `duration.instant` | 50 to 100ms | none (no state flip below 200ms; hover `style-hover` colour rules have `duration_ms: 0`, i.e. no transition) | none (the only sub-200ms value, 40ms, is a regex artefact, not a flip; the next shortest is TR-017 `padding-left .22s ease-out`) | none (all hover transitions 200ms or more) | 60ms (unchanged) | No draft measures an instant; today's 60ms is in band, so it stays. |
| `duration.fast` | 200 to 250ms | 250ms (68 transitions; 200ms 37), e.g. `background .25s`, `border-color .25s` | 250ms (89; 200ms 85), e.g. `transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s` | 200ms (213; 250ms 19), e.g. `transform .2s cubic-bezier(.3,1.6,.5,1), box-shadow .2s, background .2s` | 250ms | Median of client modes 250, 250, 200. Today's 150ms is below every draft. |
| `duration.medium` | 300 to 350ms | 300ms (transform `.3s`, 8; fade entrances CA-12/16/17/18 at 300ms) | 300ms (46; 350ms 41), e.g. `transform .3s cubic-bezier(.16,.84,.32,1)` (6 transitions) | 300ms (40; 350ms 18), e.g. `transform .3s cubic-bezier(.3,1.4,.5,1)` (16) | 300ms | All three modal values agree; 350ms is every client's second value. |
| `duration.slow` | 450 to 600ms | 400ms drawer CA-53 (slide-in, `cubic-bezier(.2,.7,.2,1)`); modal CA-14 500ms | 560ms drawer slide-in A-36 (`animateMobile`, line 1264); mega panel 340ms A-13 | 420ms nav drawer entrance A-10 (`SiteHeader.dc.html::navIn`, line 188); Basket TR-051 500ms | 450ms | Median of 400, 560, 420 is 420, below the band, so it clamps to the 450 floor. Today's 500ms is also in band; 450 is the in-band value nearest the evidence. |
| `duration.extra-slow` | 700 to 1000ms | 900ms (hero rise CA-06, 07, 08, 5 records) | 1000ms (image reveal A-08, `setupReveal`, line 1241; hero frame A-22 1100ms is out of band) | 800ms (Order-confirmed badge A-09, `Confirmation.dc.html::componentDidMount`, line 105; reveal A-04 800ms, `Home.dc.html::motion`, line 282) | 900ms | Median of 900, 1000, 800. |
| `entrance.duration` | 600 to 900ms | 500ms (14 rise records; 600ms 7, 800ms 6, 900ms 5) | 900ms hero copy A-21 (`animateEntrance`, line 1403); heading reveal 850ms A-07 (line 1240) | 750ms (A-05 to A-08, `motion`, e.g. `Product.dc.html` line 175); A-04 800ms | 750ms | Median of 500, 900, 750. Eye Care's modal value is below band but its 600 to 900ms records are in band. |
| `transition.fast` | `duration.fast` with `easing.default` | n/a (drafts use `ease` or per-property curves) | n/a | n/a | `250ms cubic-bezier(0.4, 0, 0.2, 1)` | Equals `duration.fast` plus `easing.default`, as the spec requires (today's `0.15s ease` fails the band). |
| `transition.medium` | `duration.medium` with `easing.default` | n/a | n/a | n/a | `300ms cubic-bezier(0.4, 0, 0.2, 1)` | Same rule. |
| `transition.slow` | `duration.slow` with `easing.default` | n/a | n/a | n/a | `450ms cubic-bezier(0.4, 0, 0.2, 1)` | Same rule. |

## Easing family

| token key | band (section 7) | Eye Care measured | Indus measured | Mama's measured | chosen framework default | why |
|---|---|---|---|---|---|---|
| `easing.ease-out` | x1 at most 0.35, y1 at least 0.6, y2 = 1 | `cubic-bezier(.2,.7,.2,1)` (CA-04 Ken Burns, CA-53 drawer, TR-02, TR-39, TR-53, 9 transitions); hover and entrance otherwise plain `ease` | `cubic-bezier(.16,.84,.32,1)` (all reveals A-05 to A-09, A-12 to A-14, A-21 to A-23; 22 transitions); `cubic-bezier(.2,.8,.2,1)` on 25 hover transitions | `cubic-bezier(.2,.7,.2,1)` (reveals A-04 to A-08); `cubic-bezier(.2,.8,.2,1)` (A-10 drawer, TR-051) | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Component median of (.2,.7,.2,1), (.16,.84,.32,1), (.2,.7,.2,1). In band (x1 0.2, y1 0.7, y2 1). Today's `(0.16, 1, 0.3, 1)` is also in band but matches no draft. |
| `entrance.easing` | same band | `ease` on 48 rise records (not in band: x1 .25, y1 .1); `(.2,.7,.2,1)` on CA-04 and the drawer | `(.16,.84,.32,1)` on every reveal | `(.2,.7,.2,1)` on every reveal | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Same median; Eye Care's `ease` is out of band, so only its explicit curve counts. |
| `easing.default` | no band in section 7 | CSS `ease` on every plain hover (`background .25s`, no curve) | CSS `ease` on 115 plain hover transitions, curves otherwise | CSS `ease` on 203 plain hover transitions | `cubic-bezier(0.4, 0, 0.2, 1)` (unchanged) | Section 7 gives no band and says names are kept (D1); see ambiguity note on whether it should move to the drafts' `ease` value `cubic-bezier(0.25, 0.1, 0.25, 1)`. |
| `easing.spring` (existing) | none | `(.34,1.56,.64,1)` is already the framework value; no draft use | `(.34,1.56,.64,1)` (31 transitions; tilt, logo and form-result groups) | `(.3,1.6,.5,1)` (45 + 5 transitions) and `(.3,1.4,.5,1)` (16 + 8 + 5) | `cubic-bezier(0.34, 1.56, 0.64, 1)` (unchanged) | No band applies; `easing.spring` is kept. |

## Distance family and entrance travel

Lifts are the `translate` values in hover transitions (counts from `source.code`); entrance travel is the `from` translate in reveal and entrance records.

| token key | band (section 7) | Eye Care measured | Indus measured | Mama's measured | chosen framework default | why |
|---|---|---|---|---|---|---|
| `entrance.distance` | 16 to 32px | 18px (44 records `translateY(18px)`, CA-05 to CA-18) | 28px hero copy A-21 (line 1403); 22px heading A-07 (line 1240); 40px grid items A-09 (line 1242, out of band) | 28px (A-05 to A-08); 32px A-04 | 28px | Median of 18, 28, 28. Today's 30px is in band but matches no draft. |
| `distance.xs` | 2 to 3px | -2px (5 hover lifts) | -2px (31) | -2px,-2px (40) | 2px | All three agree; this is each draft's most common lift (subtle). |
| `distance.sm` | 3 to 4px | -3px (8); -4px (2) | -3px (19); -4px (4) | -3px,-3px (27); -4px,-4px (17) | 3px | -3px is every client's second lift and sits in both the xs and sm band edges; -4px is the alternative if a visibly stronger standard lift is wanted (see ambiguity note on xs and sm being 1px apart). |
| `distance.md` | 6 to 12px | none | -6px (5 lifts), -8px (2), -12px (1) | -10px (2) and -12px (2) | 8px | Only two clients; mean of 6 and 10, rounded to the 8px grid, in band. |
| `distance.lg` | 12 to 24px | 18px (entrance travel, 44 records) | 14px (2), 20px, 22px (A-07) | 18px (nav drawer x travel, A-10) | 18px | Median of 18, 20 (middle of Indus's 14 to 22), 18. |
| `distance.xl` | 24 to 48px | 26px (2 records, one is the 460ms ease-out-cubic reveal) | 40px (A-09), 36px, 32px (A-14 drawer rows) | 32px (A-04) | 32px | Median of 26, 36 (middle of Indus's 32 to 40), 32 rounds to 32. |

## Spring curves (`linear()`)

Overshoot of the drafts' cubic-bezier springs, measured by sampling the bezier 4000 times: `(.34,1.56,.64,1)` (Indus, and today's `easing.spring`) peaks at 1.098; `(.3,1.6,.5,1)` (Mama's, 45 + 5 transitions plus A-09 badge pop, A-01 wobble) peaks at 1.110; `(.3,1.4,.5,1)` (Mama's, 16 + 8 + 5 transitions) peaks at 1.053. Eye Care has no spring curve in its draft.

Both strings below were generated from a damped spring `x(t) = 1 - e^(-zeta*omega*t) * (cos(wd*t) + zeta*omega/wd * sin(wd*t))` (`wd = omega * sqrt(1 - zeta^2)`), sampled at 24 equal steps with the last sample forced to 1. The damping ratio comes from the target overshoot (`zeta = L / sqrt(pi^2 + L^2)` with `L = -ln(overshoot - 1)`), and `omega = 6.5 / (zeta * duration)` so the spring is within about 0.2% of 1 by the end.

| token key | band (section 7) | chosen framework default | derivation |
|---|---|---|---|
| `easing.spring-gentle` | peak at most 1.05 | `linear(0, 0.06, 0.197, 0.365, 0.532, 0.68, 0.801, 0.894, 0.959, 1.001, 1.026, 1.037, 1.04, 1.037, 1.031, 1.025, 1.018, 1.012, 1.007, 1.004, 1.001, 1, 0.999, 0.998, 1)` | Target peak 1.04, zeta 0.716, omega 18.17, 0.5s design duration. Only Mama's `(.3,1.4,.5,1)` is gentle, and its 1.053 peak is just over the 1.05 cap, so the default is pulled to 1.04. Sampled peak 1.040, dense peak 1.040. |
| `easing.spring-bouncy` | peak 1.05 to 1.2 | `linear(0, 0.087, 0.283, 0.511, 0.722, 0.889, 1.003, 1.07, 1.097, 1.098, 1.082, 1.06, 1.038, 1.019, 1.005, 0.996, 0.991, 0.99, 0.991, 0.993, 0.995, 0.997, 0.999, 1, 1)` | Target peak 1.10 (the two drafts' 1.098 and 1.110), zeta 0.591, omega 15.71, 0.7s design duration. Sampled peak 1.098, dense peak 1.100. |

The peak is a property of the curve alone; the duration a preset pairs with it comes from the duration tokens.

## Per-client snapshot values

Each cloned client's snapshot carries its own draft's values under the same keys (section 7 "Per client", FR-32-21, FR-38A-15). Values are the client's modal value for the role, not snapped into band; a key with no draft value carries the framework default.

Current state: all four snapshots (`sites/eye-care-ward-end/theme-snapshot.json`, `sites/indus-foods/theme-snapshot.json`, `sites/mamas-munches/theme-snapshot.json`, `sites/mamas-munches-redesign/theme-snapshot.json`) still carry the old framework duration, easing and transition defaults, none carries `distance` or the springs, and Eye Care already carries `entrance` 18px, 600ms, `cubic-bezier(0.2,0.7,0.2,1)`.

| key | Eye Care (`sites/eye-care-ward-end/`) | Indus (`sites/indus-foods/`) | Mama's redesign (`sites/mamas-munches-redesign/`) |
|---|---|---|---|
| `duration.instant` | framework 60ms | framework 60ms | framework 60ms |
| `duration.fast` | 250ms | 250ms | 200ms |
| `duration.medium` | 300ms | 300ms | 300ms |
| `duration.slow` | 400ms | 560ms | 420ms |
| `duration.extra-slow` | 900ms | 1000ms | 800ms |
| `easing.default` | `cubic-bezier(0.25, 0.1, 0.25, 1)` (the drafts' plain `ease`) | same | same |
| `easing.ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `cubic-bezier(0.16, 0.84, 0.32, 1)` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| `easing.spring-gentle` | framework default | framework default | linear() fitted to peak 1.053 (the draft's `(.3,1.4,.5,1)`) |
| `easing.spring-bouncy` | framework default | linear() fitted to peak 1.098 (the draft's `(.34,1.56,.64,1)`) | linear() fitted to peak 1.110 (the draft's `(.3,1.6,.5,1)`) |
| `entrance.distance` | 18px | 28px | 28px |
| `entrance.duration` | 500ms (mode); the snapshot's existing 600ms is the second most common | 900ms | 750ms |
| `entrance.easing` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `cubic-bezier(0.16, 0.84, 0.32, 1)` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| `distance.xs` | 2px | 2px | 2px |
| `distance.sm` | 3px | 3px | 3px |
| `distance.md` | framework 8px | 6px | 10px |
| `distance.lg` | 18px | 22px | 18px |
| `distance.xl` | 26px | 40px | 32px |
| `transition.fast` / `.medium` / `.slow` | each equals the client's own `duration` key with its `easing.default` (250ms / 300ms / 400ms) | (250ms / 300ms / 560ms) | (200ms / 300ms / 420ms) |

Where the Mama's values go: the draft's values belong in `sites/mamas-munches-redesign/theme-snapshot.json`, which is built fresh from that draft (its `CLAUDE.md`: independent of the canary, "nothing here changes the canary"). `sites/mamas-munches/theme-snapshot.json` is the canary's snapshot (the site built live on the framework, not from this draft) and carries the framework defaults from the table above, plus the new `distance` keys and both springs by the wholesale rule of FR-32-21; its values must not be taken from the redesign draft.

## Disagreements, gaps and ambiguities

- **Strong disagreement.** `duration.slow` (400, 560, 420ms: median below the 450 floor), `entrance.duration` (Eye Care mostly 500ms against Indus 900ms), `distance.xl` (26 to 40px) and Mama's `(.3,1.4,.5,1)` spring peaking at 1.053 against the 1.05 gentle cap.
- **No draft value.** `duration.instant` and Eye Care's `distance.md` and springs. The Indus 40ms hit is a parsing artefact of one declaration, not a state flip.
- **`transition.*` versus `easing.default`.** Section 7 requires each transition key to equal its duration with `easing.default`, but every draft's plain hover transition renders CSS `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`). The framework default is left at `(0.4, 0, 0.2, 1)` because section 7 gives `easing.default` no band; the per-client table uses the drafts' `ease`. If the framework should match the drafts, set `easing.default` to `cubic-bezier(0.25, 0.1, 0.25, 1)` in M1.5. This needs a decision from Bean or the spec owner.
- **Band applies to snapshots?** FR-38A-15 says "every token in the section 7 table holds a value inside its band", while section 7 and FR-32-21 say bands bind only the framework `theme.json` and a client's values come from its own draft. This report follows the second reading; `check-motion-token-consumers.py --bands` should therefore run against `theme.json` only, not against `sites/*/theme-snapshot.json` (several client values above are out of band by design, for example Eye Care `duration.slow` 400ms and Indus `duration.extra-slow` 1000ms is the band edge).
- **`distance.xs` and `.sm`.** The bands (2 to 3px and 3 to 4px) overlap, and all three drafts' dominant lifts are -2px and -3px, so the defaults are 2px and 3px, only 1px apart. If a clearer step is wanted, `distance.sm` = 4px is in band and appears in all three drafts (-4px, 23 uses in total against 54 for -3px).
- **Not live-measured.** No Playwright computed-style run was made; all values are source-derived from the handoff records. The `.dc.html` drafts also never load their tokens, so no value here was matched to a token.
