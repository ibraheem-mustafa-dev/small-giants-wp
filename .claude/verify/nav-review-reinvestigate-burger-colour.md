# Nav burger colour — re-investigation (Wave 2)

**Date:** 2026-09-12
**Trigger:** Bean pushed back on Wave 1's "invalid QC fixture slug" finding — "I used the test
fixtures for all of my checks, obviously I thought that was what they were made for!" Two
questions re-opened: (1) is "invalid slug renders silently blank" itself a reachable, real
defect; (2) is there a genuine code-level regression in burger colouring separate from the
invalid slug.

**Verdict up front:** Wave 1's root cause stands, with one addition. The specific symptom
Bean saw (`burgerBg: "secondary"`) is **not reachable through the colour-picker UI** — both
colour controls in the codebase can only ever write a registered palette slug or a raw
hex/functional value, never an arbitrary string. But the underlying mechanism — an
**unresolvable token slug silently painting `background-color:transparent`, with zero
warning** — is real and reachable through ordinary site maintenance (renaming/removing a
palette colour after a client has already picked it). That is a genuine defect worth fixing,
independent of what caused this particular ticket. No code-level regression was found in the
burger colour/background emission logic between pre-Spec-41 and current — the default
(untouched) case is provably byte-identical in behaviour across the rewrite, confirmed both
by reading the diff and by live-testing today's actual homepage burger.

---

## Question 1 — Is "invalid slug renders silently blank" a real, reachable defect?

### Mechanism traced

`sgs_colour_value()` (`plugins/sgs-blocks/includes/helpers-tokens.php::sgs_colour_value`,
lines 588-628):

1. Empty input → `''`.
2. `var(...)` passthrough (already-formed custom-property reference) → escaped as-is.
3. A real CSS colour (`sgs_is_css_colour()`) → normalised, returned as-is.
4. **Anything else is treated as a design-token SLUG, unconditionally**: it is
   regex-sanitised to `[a-z0-9-]` and wrapped as
   `var(--wp--preset--color--{slug})` — **with no check that the slug is actually
   registered in the current theme's palette.**

`sgs_background_paint_decl()` → `sgs_background_paint_value()`
(`helpers-tokens.php::sgs_background_paint_value`, lines 794-816) calls `sgs_colour_value()`
for the flat-colour path and emits `background-color:{that value}` — same blind-wrap, no
registration check.

**What happens in the browser when the slug doesn't exist:** `var(--wp--preset--color--secondary)`
resolves against a custom property that was never declared. Per the CSS Custom Properties
spec, a `var()` referencing an undefined custom property with no fallback is a
*guaranteed-invalid value* — the whole declaration is dropped and the property falls back to
its cascaded/inherited value, not to any visible "broken" state. For `background-color` that
means: the browser behaves exactly as if `burgerBg` were never set at all, i.e. the resting
background stays `background:none` (transparent) from `style.css`. **No error, no console
warning, no visual signal that a colour was even attempted.**

**Confirmed live** on the canary's own QC fixture page
(`https://sandybrown-nightingale-600381.hostingersite.com/spec41-step22-qa/`, post ID 3488,
block `#g14-neg-burger`, `burgerBg:"secondary"`): computed
`background-color: rgba(0, 0, 0, 0)` — transparent, indistinguishable from "unset". This is
the exact mechanism Wave 1 named, verified again independently here.

### Can a real operator reach it through the actual colour picker? — No, not this exact value

Both colour controls in the codebase resolve a picked colour through the SAME pattern —
match against the theme's live registered palette, store the matched **slug**; if there's
no match (a custom colour), store the **raw picked value**, never an arbitrary string:

- `DesignTokenPicker.js::makeChangeHandler` (`plugins/sgs-blocks/src/components/DesignTokenPicker.js`,
  lines 122-140): `onChange( match ? match.slug : picked )`, where `match` is looked up in
  `colours` — sourced from `useSettings( 'color.palette' )`, i.e. the theme's *currently
  registered* palette, live from `theme.json`/global styles at edit time.
- `GradientCapableColourControl.js` (the sibling gradient-capable control, lines 277-280):
  identical pattern — `state.onChange( match ? match.slug : picked )`.

Neither control has any path that writes a slug string that ISN'T in `colours` at the moment
of picking. `theme.json`'s palette (`theme/sgs-theme/theme.json`) has never, at any point in
its git history, contained a slug called `secondary` (`git log -p` on the file has zero hits
for `"slug": "secondary"`) — so this specific value could only have been hand-typed into
block markup, which is exactly what happened: the fixture's own JSON literally reads
`"burgerBg":"secondary"` inside a block comment authored directly in the page's
`post_content`, under a heading labelled **"G14 negative burgerBg blocks sweep"** — "negative"
strongly suggesting this was written as a deliberate bad-input probe, not a realistic client
scenario. Confirmed via `wp post get 3488 --field=post_content` on the canary: 4 total hits
for `burgerBg`, all reading `"secondary"`, all under `g14*` headings.

**Conclusion on Q1:** unreachable via the picker as an *arbitrary typo*, but genuinely
reachable via a different, real path — **a palette colour renamed or deleted after a client
has already picked it on their burger.** Nothing in the render path checks that a stored
slug still resolves; nothing warns the editor; nothing falls back to a safe default colour.
A client's burger (or any block using `sgs_colour_value()`/`sgs_background_paint_decl()` on a
slug-typed attribute — this is universal, not burger-specific) can go silently invisible
after an unrelated palette edit, with no way to discover why short of inspecting computed
styles. **This is a real defect, worth flagging and fixing as its own item** — recommend
either (a) a build-time/save-time audit that walks stored colour attributes against the live
palette and warns on drift, or (b) render-time defensive fallback
(`var(--wp--preset--color--{slug}, {sane-default})`) so an orphaned slug degrades to a
visible colour instead of `transparent`. Scope note: this is a **separate ticket** from the
symptom that prompted this investigation — the QC fixture itself is not evidence of the
orphaning path, it's evidence the underlying mechanism has no guard rail.

---

## Question 2 — Is there a code-level regression in burger colouring, separate from the invalid slug?

### Historical trace

`git log --follow` on `nav-menu-css.php` dead-ends at the Spec 41 step-15 rewrite
(`070fbc9a8`), same as Wave 1 found. But the burger CSS did not live in
`nav-menu-css.php` pre-split — it lived inline in the monolithic `render.php`, which was
split into 4 files one commit earlier:

```
f4e38d429  refactor(nav-menu): split render.php into 4 PHP files … (Spec 41 step 8)
  ├─ parent: 2883e0a3e
070fbc9a8  feat(nav-menu): Spec 41 step 15 — the three-state CSS-emission rewrite
```

Extracted the pre-split burger block via
`git show f4e38d429^:plugins/sgs-blocks/src/blocks/nav-menu/render.php` (lines 1278-1313)
and diffed it property-by-property against the current
`plugins/sgs-blocks/includes/nav-menu-trigger-css.php::sgs_nav_menu_trigger_css`:

| Property | Pre-Spec-41 (`2883e0a3e`) | Current (`nav-menu-trigger-css.php`) | Regression? |
|---|---|---|---|
| `burgerColour` resolution | `sgs_resolve_text_colour_or_gradient( $burger_colour, $burger_colour_gradient )` | **identical call** | No |
| `burgerColour` emission (no hover) | `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()`, unconditional when non-empty | **identical**, now gated behind `'' === $burger_sweep['base']` — but sweep only fires when `t_burger==='sweep' AND burgerColourHover !== ''`; with no hover set (the default/most-common case) `$burger_sweep['base']` is always `''`, so the `elseif` branch runs identically to before | No — new branch is additive, default path unchanged |
| `burgerColourHover` emission | `sgs_hover_state_rules(...)` fires whenever `burgerColourHover !== ''`, unconditionally | Same call, now gated `'none' !== $t_burger` — but `$t_burger` defaults to `'swap'` (line 32: `?? 'swap'`), so an operator who never touches the new treatment control gets the SAME unconditional emission as before | No — default treatment preserves old behaviour; only an explicit opt-in to `'none'` changes anything, which is a new feature, not a regression |
| `burgerBg` resolution + emission | `sgs_background_paint_decl( $burger_bg, $burger_bg_gradient )`, unconditional when `$burger_bg !== ''` | **byte-identical call and condition** (line 87-89) | No |
| `burgerHoverColour` (background hover) emission | `sgs_hover_state_rules(...)` unconditional when slug set | Same call, gated `'none' !== $t_burger_bg`, which defaults to `'swap'` (line 33) — same reasoning as above | No |
| `burgerSize` default | `'44px'`, applied to width/height/min-width/min-height unconditionally (fixed square always) | `'44px'` default identical; now conditionally `width:auto` when `trigger_mode !== 'icon'` — but `triggerMode` defaults to `'icon'` (`block.json::attributes.triggerMode.default`), so the default case still emits the fixed 44px square, identically | No — divergence only applies to the (newer) text/icon-and-text trigger modes, which didn't functionally exist in the same form pre-split |

**Every property in the DEFAULT (no colour attributes touched) path resolves through the
exact same helper calls, in the exact same order, with the exact same fallback defaults, in
both eras.** The only behavioural additions are the Sweep hover treatment and the
trigger-mode-aware width — both strictly additive, both defaulting to the pre-existing
behaviour, neither touched by the "worse colours" complaint (which is about resting/hover
*colour values*, not treatment mode or width).

### Live regression test — does today's untouched default match the historical default?

Rather than trust the diff alone, tested the actual rendered default on two independent live
surfaces on the canary (`sandybrown-nightingale-600381.hostingersite.com`):

1. **Real production homepage nav** (untouched attributes, whatever ships to visitors today):
   `getComputedStyle()` on `.sgs-nav-menu__burger` → `color: rgb(58, 46, 38)`,
   `background-color: rgba(0, 0, 0, 0)`, `width/height: 44px`.
2. **QC fixture's own untouched control burger** (same page, different block instance, no
   burger attrs set) → same values: `color: rgb(58, 46, 38)`, `background-color: rgba(0, 0, 0, 0)`.

Both match `style.css`'s declared base rule exactly (`.sgs-nav-menu__burger { color: inherit;
background: none; … }`, `plugins/sgs-blocks/src/blocks/nav-menu/style.css::.sgs-nav-menu__burger`)
— `color: inherit` resolves to the page's inherited text colour (`rgb(58,46,38)`, the theme's
`text` token), `background: none` resolves to transparent. This base stylesheet rule was
**not touched by the Spec 41 step-15 split at all** — it lives in `style.css`, a sibling file
untouched by the PHP CSS-emission refactor, and neither the pre-split render.php nor the
current trigger-css module emits any competing declaration for the default case, so nothing
overrides it in either era.

**Conclusion on Q2: no code-level regression found.** The default/untouched burger renders
identically today to what the pre-Spec-41 code would have produced for the same
unset-attributes case — same helper calls, same conditions, same fallback values, and
confirmed identical on the live rendered page. The step-15 rewrite added new *opt-in*
capability (sweep treatment, text-mode width) without altering the resolution path for any
attribute an operator hasn't touched.

---

## Summary for Bean

- **Your instinct to push back was right to raise, and the underlying mechanism you hit IS a
  real bug** — just not the one your specific test exposed. An invalid/orphaned colour slug
  silently paints `transparent` with zero warning, and that's reachable in real life if a
  palette colour ever gets renamed or removed after a client picks it. Recommend treating
  that as its own fix (defensive fallback or a palette-drift audit) — separate from this
  ticket.
- **The specific value you saw (`"secondary"`) could not have come from the colour picker** —
  I traced both colour controls in the codebase and neither can write a slug that isn't in
  the theme's live palette. It came from hand-authored block markup on the QC fixture page,
  under a heading literally labelled "negative burgerBg" — i.e. it looks like it was built
  as a deliberate bad-input test, not a normal-use fixture.
- **No code regression** — I traced the burger colour/background logic back through the
  Spec 41 rewrite to the pre-split code (one commit further back than Wave 1 reached) and
  the default-case behaviour is provably identical, then verified that live against today's
  actual homepage.

## What was checked (for the record)

- `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` (current burger CSS module) — read in full.
- `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_colour_value`,
  `::sgs_background_paint_value`, `::sgs_background_paint_decl` — read in full.
- `git show f4e38d429^:plugins/sgs-blocks/src/blocks/nav-menu/render.php` — pre-split burger
  block (lines 1278-1313), diffed property-by-property against current code.
- `plugins/sgs-blocks/src/components/DesignTokenPicker.js::makeChangeHandler` and
  `GradientCapableColourControl.js` `StateContent` onChange — both colour-picker write paths.
- `theme/sgs-theme/theme.json` current palette + full git history for a `secondary` slug
  (none found, ever).
- Canary post 3488 (`/spec41-step22-qa/`) `post_content` via `wp post get 3488
  --field=post_content` — confirmed the fixture's exact JSON and heading label.
- Live `getComputedStyle()` on `.sgs-nav-menu__burger` on both the canary homepage and the
  QC fixture page (control instance + the `burgerBg:"secondary"` instance).
- `plugins/sgs-blocks/src/blocks/nav-menu/style.css::.sgs-nav-menu__burger` base rule.
- `block.json::attributes.triggerMode.default` = `"icon"`.
