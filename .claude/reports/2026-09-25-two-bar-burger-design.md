# Two-bar burger design (M-27 residue)

Wave 3C lane A. Owed by U-6 + U-7 (plan `2026-09-21-wave-3c-implementation-plan.md` §4, the U-6 + U-7
paragraph); first named as residue in `2026-09-24-u9-u11-design.md` §3 row M-27 and §7.

## 1. The problem

The menu button's default glyph is always three bars
(`includes/nav-menu-markup.php::sgs_nav_bar_menu_burger_toggle_markup`, `str_repeat( …burger-bar…, 3 )`).
Three references draw it with two bars, and wearecollins morphs those two into an X. `burgerMorph: x`
and `burgerMorphDuration: 450` already express the motion; nothing expresses the bar count.

## 2. Exit cells

| Reference | Tier | Bars | Bar size | Gap | Open state | Motion |
|---|---|---|---|---|---|---|
| wearecollins | 375 / 768 / 1440 | 2 | 16 x 1.5px | not captured (button 28 x 18) | the two bars cross into an X in the same slot | `transform 0.45s cubic-bezier(0.645,0.045,0.355,1)` |
| halcyon | 375 / 768 | 2 | 18 x 1.5px | 5px | separate × in the overlay top row (no morph) | none |
| indus-foods | 375 / 768 | 2 | 18 x 1.5px | 5px | separate × in the overlay top row (no morph) | none |

Source: `.claude/reports/reference-requirements/<ref>.json`, rows with `surface: trigger-close`,
`cells.geometry` and `cells.motion`.

## 3. The design

**One new attribute on `sgs/nav-bar-menu`:** `burgerBarCount`, number, `enum: [2, 3]`, default `3`.
Collision check: `sgs-db.py sql "SELECT block_slug FROM block_attributes WHERE attr_name='burgerBarCount'"`
returns no rows. Like `burgerMorph`, it applies only to the default glyph; a custom `triggerIcon` keeps
its own shape.

**Markup.** `sgs_nav_bar_menu_burger_toggle_markup()` gains a trailing `int $bar_count = 3` parameter.
The default-glyph branch repeats the bar span `$bar_count` times and, only when it is 2, adds the
modifier `sgs-nav-bar-menu__burger-icon--two-bar` to the icon span. At 3 the markup is byte-identical to
today (asserted by the test, §5). `render.php` resolves the value against `array( 2, 3 )`, falling back
to 3.

**Geometry.** The two-bar icon box keeps its 24px width and 2px bars and sets
`--sgs-nbm-icon-h: 8.5px`, which gives a 4.5px gap and a 6.5px bar-centre spacing, the same spacing as
halcyon's and indus-foods' 1.5px bars with a 5px gap. The existing `justify-content: space-between`
places the two bars at the top and bottom of that box, so no new layout rule is needed.

**Morph poses for two bars**, all gated on the existing `data-sgs-nav-burger-morph` attribute plus the
two-bar modifier. The travel `d` is `(var(--sgs-nbm-icon-h) - 2px) / 2` (3.25px), derived from the icon
box the same way the `line` pose already derives it; no px twin.

| `burgerMorph` | Bar 1 (open) | Bar 2 (open) | Icon box |
|---|---|---|---|
| `x` | `translateY(d) rotate(45deg)` | `translateY(-d) rotate(-45deg)` | unchanged |
| `x-rotate` | as `x` | as `x` | `rotate(180deg)` (the existing rule already matches) |
| `line` | `translateY(d)` | `translateY(-d)` | unchanged: the two bars meet on one line |
| `none` | no rule | no rule | unchanged |

The three-bar rules select `:nth-child(1)`, `(2)` and `(3)`. With two bars, `(2)` would match the bottom
bar and hide it under `x`, so every three-bar rule is left untouched and the two-bar rules are written
with the modifier class at higher specificity, overriding `:nth-child(2)`'s `opacity: 0` with
`opacity: 1`. The existing duration, easing and reduced-motion rules already cover both bar counts.

**Editor.** `BurgerPanel.js`: a two-option `ToggleGroupControl` "Bars" (Three / Two), shown under the
same condition as "Morph" (the icon is shown). The editor preview is server-rendered, so it follows the
markup with no JS mirror.

**Pipeline.** block.json change → `sgs-update-v2.py --stage 1`, `generate-attr-role-map.py`; commit the
regenerated `css-property-classifications.json` and `attr-role-map.json` with the code.

## 4. Risks

- **The `x` pose's middle-bar hide leaks onto two bars.** The two-bar rules restate `opacity: 1` for bar
  2; the live check reads bar 2's computed opacity at open.
- **Custom icon plus two bars.** The count is ignored (no bars are generated); the control's help text
  says so.
- **Recorded divergences, no new setting:** bar thickness (2px here, 1.5px in all three references) and
  bar width (24px here, 16px and 18px there) are structural defaults with no attribute today. A bar-size
  pair is the next step if a Wave 4 clone needs pixel parity; the bar-centre spacing already matches.
  wearecollins' curve `cubic-bezier(0.645,0.045,0.355,1)` is not a named preset but `burgerMorphEasing`
  accepts a hand-typed curve (`includes/helpers-motion-easing.php`'s cubic-bezier validator), so the
  motion is exact.

## 5. Tests and verification

- `tests/php/run-burger-two-bar-standalone.php`: the three-bar default output is byte-identical to the
  pre-change function (loaded from `<sha>~1` via `git show`); two bars emit exactly two bar spans and the
  modifier; an off-list count falls back to three; a custom icon ignores the count. Negative control: the
  pre-change function, called with a count of 2, still emits three bars, so the two-bar assertions can
  fail.
- Live, sandybrown `/qa-scrim/` at 1440 (the fixture's burger), chrome-devtools window: set the fixture
  nav to two bars with `burgerMorph: x` and duration 450; read the two bars' boxes closed, click, read the
  computed transforms and opacity after 450ms (both rotated ±45deg, both opacity 1, centres coincident),
  and confirm the three-bar burger elsewhere is unchanged.

**Done when** a two-bar burger morphs to an X live at 450ms and the three-bar default is byte-identical
in markup.
