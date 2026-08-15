# Colour Token Storage Investigation — `linked` mode on `DesignTokenPicker`

**Date:** 2026-08-14
**Scope:** read-only. No code changed, no live content written. One SSH session ran a
read-only `wp eval-file` PHP scan (`parse_blocks()` + `SELECT`, no writes) against the
sandybrown canary to count real stored values.

## Verdict

**Store bare theme-palette slugs (turn `linked` on), not raw hex.** Three independent lines
of evidence converge on this:

1. The server helper `sgs_colour_value()` (Q1) already resolves all three candidate forms
   correctly and prefers the slug path — a slug is the "native" storage shape it was built
   for; raw hex is a fallback branch bolted on afterwards for functional-notation
   normalisation.
2. The cloning converter (Q2) **already writes bare slugs today**, unconditionally, for
   every SGS-native colour attribute — it has done since before this rollout existed. Live
   data confirms this: bare slugs (`primary`, `accent`, `text-muted`, `text`) already
   outnumber hex 118-to-20 across the whole site's `sgs/*` colour attributes, entirely from
   clones, with `linked` never having been wired up anywhere that produced these rows.
   **The 9 newly-migrated blocks not passing `linked` is therefore not "neutral" — it is
   the ONE storage path (the human-operator editor picker) that is out of step with what
   the machine path (the converter) has been writing all along.**
3. The editor display code (Q4) already assumes slugs can appear — `resolveColourToken`
   exists specifically to turn a stored slug back into a swatch — but it is only invoked
   when `linked` is true. Because none of the 9 blocks pass `linked`, any button/etc. block
   on the canary today that already holds a converter-written slug (there are several, see
   Q3) shows its colour swatch as **unset in the editor**, even though the frontend renders
   the correct theme colour perfectly via PHP. Turning `linked` on for these blocks would
   fix this existing display bug, not just future-proof rebranding.

The one real cost, surfaced in Q5, is that **two other blocks (`sgs/nav-menu`,
`sgs/nav-drawer`) already ship `linked` today and their `render.php` WCAG-contrast helper
assumes slug-only storage** — it will silently mis-resolve if an operator ever picks a
*custom* (non-palette) colour on those specific hover-background controls. That is a
pre-existing latent bug in two already-shipped blocks, not a reason to avoid `linked` on
the 9 new ones — but it should be fixed alongside, or before, extending `linked` further,
because more `linked` blocks means more surfaces hitting that same trap.

---

## Q1 — What does the server accept?

`sgs_colour_value()` in `plugins/sgs-blocks/includes/helpers-tokens.php:580-622`:

```php
function sgs_colour_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}
	$value = trim( $slug_or_value );

	if ( str_starts_with( $value, 'var(' ) ) {
		return sgs_css_value_has_breakout( $value ) ? '' : esc_attr( $value );
	}

	if ( sgs_is_css_colour( $value ) ) {
		$hex = sgs_functional_colour_to_hex( $value );
		return sgs_css_value_has_breakout( $hex ) ? '' : esc_attr( $hex );
	}

	// Sanitise slug to valid WordPress preset characters only (prevents CSS injection).
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );
	return 'var(--wp--preset--color--' . $slug . ')';
}
```

All three candidate forms are handled, none mangled or rejected:

| Stored form | Path taken | Result |
|---|---|---|
| `var(--wp--preset--color--accent)` | `str_starts_with($value,'var(')` branch, line 595 | Passed through verbatim (minus a CSS-breakout check added 2026-07-28) |
| `#f5d050` (hex) | `sgs_is_css_colour()` true (line 601, via the hex regex at line 86) | Normalised through `sgs_functional_colour_to_hex()` (a no-op for already-hex values) and emitted verbatim |
| `accent` (bare slug) | Falls through both branches to line 618-621 | Sanitised to `[a-z0-9-]` and **wrapped** into `var(--wp--preset--color--accent)` |

So the server's contract is: give it *anything* — a full `var()`, a hex, or a bare slug —
and it always ends up as a valid CSS colour on the page. Nothing is rejected; nothing is
mangled. The only value that gets *transformed* is the bare slug, which is the intended
behaviour (that's the whole point of a token).

## Q2 — What does the cloning converter WRITE?

Two genuinely different write paths exist in the converter, and they write **different**
forms — but only one of them ever reaches the SGS-native colour attrs that
`DesignTokenPicker`/`SgsColourPanel` edit.

**Path A — SGS-native colour attrs (`colourBackground`, `iconColour`, etc.) — always bare
slug or raw hex, NEVER a full `var()` string.**

`plugins/sgs-blocks/scripts/converter/resolvers/styling_content.py:425-437`:

```python
    # Routing is driven by the DB-owned attr `role`, NEVER a hardcoded css_property
    # allowlist (R-31-1): ANY colour property — color / background-color / border-color /
    # ... — routes here iff its attr carries role='color'.
    if role == "color":
        return extract_token_or_hex(raw)
```

`extract_token_or_hex()` (`plugins/sgs-blocks/scripts/converter/services/styling_helpers.py:440-517`)
returns ONE of: a bare slug (e.g. `'primary'`, only when it's a real, validated theme
palette slug — line 493 `if slug in _theme_palette_slugs()`), a raw hex (line 496-497), or
a raw `rgb()/rgba()/hsl()/hsla()` literal (line 505-516). **It never returns a `var(...)`
string** — even when the draft source has an explicit
`var(--wp--preset--color--X)`, line 485-490 strips it down to the bare slug `X` before
returning.

This is the function every SGS custom colour attribute goes through (also used by
`typography.py:123`, `outer_box.py:363`, `content_band.py:224`). It is the ONLY path that
feeds `DesignTokenPicker`-controlled attributes.

**Path B — WP-native block `supports.color` (a completely different attribute:
`style.color.background`, not the SGS `colourBackground` custom attr) — writes WP's
internal shorthand notation, not a literal string either.**

`styling_helpers.py:530-544`:

```python
def _colour_value_to_style(raw: str) -> str | None:
    ...
    token_or_hex = extract_token_or_hex(raw)
    if token_or_hex is None:
        return None
    if token_or_hex.startswith("#") or token_or_hex.lower().startswith(("rgb", "hsl")):
        return token_or_hex
    return f"var:preset|color|{token_or_hex}"
```

`"var:preset|color|X"` is WordPress's own internal shorthand for a preset reference,
stored inside `attrs.style.color.background` — WordPress core itself expands this to the
literal CSS `var(--wp--preset--color--X)` only when it serialises the inline `style`
attribute on save. **This is not the same attribute family the `linked` question is
about** — it belongs to native WP block supports, which the 9 migrated blocks explicitly
turn OFF (`supports.color.background`/`text` flipped `true→false` in the D609/D618
rollout commits) precisely so the new `SgsColourPanel` UI is the only colour control shown.

`token_snap.py` (colour/spacing token-snapping utility referenced in its own docstring) is
currently an **identity passthrough for colour** — `token_snap()` only implements the
`max-width`-family literal-exemption; the colour-snapping logic it describes lives inside
`extract_token_or_hex()` itself, not here.

**Conclusion for Q2:** for the attributes `DesignTokenPicker` actually edits, the converter
writes bare slug (when it resolves to a real palette token) or raw hex/rgb (when it
doesn't) — never a `var()` string. The `var()` form only exists for a structurally
different attribute (native WP colour supports) that these 9 blocks have deliberately
disabled.

## Q3 — What is actually stored today? (live canary, read-only scan)

Scanned every post/page containing any `wp:sgs/` block (146 posts) via
`parse_blocks()` over `post_content`, read-only (`SELECT` + WP-CLI's own block parser, no
writes). Classified each colour-role attribute's stored string by regex: `var(...)`, hex,
functional (`rgb()`/`hsl()`), bare slug, or other.

**Scoped to the 9 migrated blocks** (`sgs/icon`, `sgs/accordion`, `sgs/audio`,
`sgs/before-after`, `sgs/brand-strip`, `sgs/breadcrumbs`, `sgs/business-info`,
`sgs/button`, `sgs/countdown-timer`):

```
bare-slug: 7
hex: 2
```

All 9 rows come from `sgs/button` (the only one of the 9 blocks with any authored colour
values live right now):

```
post=1324 (draft)   colourBackground = 'text'      → bare-slug
post=1484 (publish) colourText       = 'text'       → bare-slug
post=1484 (publish) colourBackground = 'accent'     → bare-slug
post=1485 (publish) colourText       = 'text'       → bare-slug
post=1485 (publish) colourBackground = 'accent'     → bare-slug
post=1486 (publish) colourText       = 'text'       → bare-slug
post=1486 (publish) colourBackground = 'accent'     → bare-slug
post=1537 (draft)   iconColour       = '#111111'    → hex
post=1537 (draft)   iconColourHover  = '#ff0066'    → hex
```

**Site-wide, across every `sgs/*` block with a `role='color'` attribute (257 attr rows
from the DB, all blocks, not just the 9)** — this is the positive control proving the scan
itself can find every form, not just failing to match on the narrow set:

```
bare-slug: 118
hex: 20
functional (rgb/hsl): 1
var():  0
```

Sample hex hits (proving the hex-detection regex works): `sgs/hero backgroundOverlayColour
= '#8b6f4e'`, `sgs/product-card titleColour = '#3a2e26'`, etc.
Sample bare-slug hits (proving the slug-detection regex works): `sgs/text textColour =
'text-muted'`, `sgs/heading textColour = 'primary'`, etc.

**Zero `var(...)` values were found anywhere in any `sgs/*` block's colour-role attribute,
site-wide.** This is a genuine disagreement with the background brief's claim of three
forms in live use — see "Disagreement" below.

A `var:preset|color|` string (WP's internal shorthand, Q2 Path B) DOES exist in the
database — 23 posts contain the literal substring `var:preset|color|` — but that is inside
native WP `supports.color` attributes on other block types, not an SGS `role='color'`
custom attribute. Separately, the literal text `var(--wp--preset--color--` also appears in
`wp_posts` (e.g. post ID 7), but tracing the surrounding JSON shows it lives inside the
**site's `wp_global_styles` custom-CSS field** (theme/global styles configuration), not
inside any `sgs/*` block instance's attributes at all.

**Disagreement with the brief:** the background states a prior check found three storage
forms live (bare slug / `var(--wp--preset--color--accent)` / raw hex). This investigation's
scan — which includes a positive control proving it can detect all three forms, and covers
every `role='color'` attribute across every SGS block, not just the 9 — found **zero**
`var()`-form values on any `sgs/*` block colour attribute anywhere on the canary. The
`var()` text that genuinely exists in the database belongs to unrelated storage
locations (native WP block supports' internal shorthand, and the site's global-styles
custom CSS) — not to any `DesignTokenPicker`/`SgsColourPanel`-controlled attribute. Recorded
here rather than reconciled away, per the task's instruction.

## Q4 — Does `resolveColourToken` round-trip every form without loss?

`resolveColourToken` (`DesignTokenPicker.js:80-89`):

```javascript
export function resolveColourToken( value, palette ) {
	if ( ! value ) {
		return undefined;
	}
	if ( /^(#|rgb|hsl|var\()/i.test( value ) ) {
		return value;
	}
	const match = ( palette || [] ).find( ( c ) => c.slug === value );
	return match ? match.color : `var(--wp--preset--color--${ value })`;
}
```

Per stored form:

| Stored value | `resolveColourToken` returns | `ColorPalette`'s selected-swatch behaviour |
|---|---|---|
| `#f5d050` (hex) | Returned unchanged (regex short-circuit) | `ColorPalette` matches it against each palette entry's `color` field directly — selected if any palette entry has that exact hex, else shows as a custom/unset colour. Lossless. |
| `var(--wp--preset--color--accent)` | Returned unchanged (regex short-circuit) | `ColorPalette` cannot match a `var()` string against a hex `color` field at all — it will not show as any palette swatch selected, even though it IS a valid, correctly-resolving colour on the frontend. **Lossy at the editor-display level** (frontend is unaffected). |
| `accent` (bare slug) | Looked up in `palette` by `c.slug === value`; returns the matching hex, or synthesises `var(--wp--preset--color--accent)` if no match | If found: returns the palette's own hex, which `ColorPalette` WILL match and highlight correctly. **Lossless and is the only form of the three that reliably shows the correct swatch selected.** |

**Critical dependency: this all only fires when `linked` is true.** With `linked=false`
(the current state of all 9 migrated blocks — `DesignTokenPicker.js:370`:
`const displayValue = linked ? resolveColourToken( value, colours ) : value;`),
`resolveColourToken` is never called for display — the raw stored value is passed to
`ColorPalette` as-is. For the 7 already-live bare-slug values found in Q3 (`sgs/button`
`colourBackground='accent'` etc.), that means `ColorPalette` receives the literal string
`'accent'` as its `value` prop today, tries to match it against palette entries' `color`
(hex) field, finds no match, and shows the swatch as **unset** — even though the
underlying attribute is a perfectly valid, already-resolving colour. This is a live,
observable defect *right now*, independent of any future rebranding scenario, caused
purely by `linked` being off while the converter has always written slugs.

**Answer to the specific question:** yes, a bare slug round-trips losslessly through
`resolveColourToken` to a correctly-highlighted swatch — but only once `linked` is turned
on. Today it does not, because the display path is gated off.

## Q5 — What breaks if we switch to bare slugs?

Searched for any render path, gate, survey script, or converter test assuming a colour
attribute holds a literal.

**Positive control first** (proving a "not found" result elsewhere isn't a broken search):
grepping for hex-parsing code in the plugin DOES surface real hits —
`helpers-colour-wcag.php:38-40` (`hexdec(substr($hex,...))`), `helpers-tokens.php:86`,
`fx-cursor-field.php:94`, `shape-dividers.php:180`, `class-button-presets-customiser.php:189`,
`class-product-templates-validators.php:161` — so the search technique works and finds
genuine hex-only code where it exists.

**What actually breaks — a real, already-shipped bug, found via that search:**

`plugins/sgs-blocks/src/blocks/nav-menu/render.php:970-972`:
```php
$item_bg_hover     = isset( $attributes['itemBgHover'] ) ? sanitize_html_class( $attributes['itemBgHover'] ) : '';
$item_bg_hover_hex = '' !== $item_bg_hover ? sgs_resolve_palette_hex( $item_bg_hover, '' ) : '';
```
and the mirror at `render.php:1060-1062` (`featuredBg`/`featuredBg_hex`) and
`render.php:1123-1125` (`featuredBgHover`/`featured_bg_hover_hex`), and
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php:174-176` (`drawerBg`/`drawer_bg_hex`).

These four lines feed the WCAG auto-contrast helpers (`sgs_wcag_text_colour_for_bg()` /
`sgs_wcag_preferred_text_colour_for_bg()`, called at `nav-menu/render.php:985-986,
1076, 1131-1132` and `nav-drawer/render.php:177`) and assume the attribute is **always** a
bare theme-palette slug:
- `sanitize_html_class()` strips any character not valid in an HTML class — including the
  leading `#` of a hex colour.
- `sgs_resolve_palette_hex()` (`helpers-colour-wcag.php:163-192`) does an exact `slug ===
  entry['slug']` match against the palette; it has no hex/`var()`/rgb fallback branch at
  all (unlike `sgs_colour_value()`).

So if `itemBgHover`/`featuredBg`/`featuredBgHover`/`drawerBg` ever holds anything other
than a bare slug, `sgs_resolve_palette_hex()` returns the empty-string fallback, and the
WCAG contrast calculation silently falls back to the plain black/white binary choice
instead of the client's actual token — a wrong-but-not-crashing degrade, not a fatal error.

**This is directly relevant to the `linked` decision, but points the other way from a
"blocker":** `sgs/nav-menu` and `sgs/nav-drawer` ALREADY pass `linked` on these exact
controls (`nav-menu/edit.js:1199` `linked`, `:1467` `linked` — confirmed by reading the
file). Under the current `makeChangeHandler` contract, `linked=true` stores a raw hex
whenever the operator picks a *custom* (non-palette) colour (`DesignTokenPicker.js:120-121`:
`onChange( match ? match.slug : picked )`). So this bug can ALREADY be triggered today, on
two shipped blocks, simply by an operator choosing a custom hover-background colour rather
than a palette swatch — with or without the 9-block `linked` rollout. It is a
pre-existing gap in those two blocks' render.php, not a new risk introduced by extending
`linked` to more blocks. It should be fixed (route those four lines through
`sgs_colour_value()`/a slug-or-hex-aware helper, the way `sgs/mega-panel` already does —
see `mega-panel/render.php:136,160`, which explicitly resolves "token slug or raw colour").

**Everywhere else searched, no literal-only assumption was found** for the 9 migrated
blocks' own colour attrs (`iconColour`, `headerColour`, `accentColour`, `spectrumColour`,
`labelColour`, `dividerColour`, `handleColour`, `handleIconColour`,
`backgroundColourHover`/`textColourHover`/`borderColourHover`, `nameColour`,
`tileBorderColour`, `tileBackgroundColour`, `linkColour`, `separatorColour`,
`currentColour`, `iconColour`/`textColour`/`labelColour`/`linkHoverColour`,
`colourText(Hover)`/`colourBackground(Hover)`/`colourBorder(Hover)`/`iconColour(Hover)`,
`numberColour`) — each render.php for those 9 blocks was checked to route through
`sgs_colour_value()` (or an equivalent typography/`sgs_font_size_value`-style helper for
non-colour props), which per Q1 accepts all three forms.

---

## What I could not verify

- **Whether nav-menu's/nav-drawer's WCAG-slug-only bug has actually manifested in live
  content.** The read-only scan found `sgs/nav-menu` (20 instances), `sgs/nav-drawer` (7
  instances), and `sgs/mega-panel` (16 instances) present on the canary, but none of them
  currently have `itemBgHover`/`featuredBg`/`featuredBgHover`/`drawerBg`/`panelBg` set to a
  non-default value — so the bug is real by code inspection but unobserved in current data.
- **Whether any client site OTHER than the sandybrown canary** (e.g. a production client
  build not yet migrated to this canary) stores colour attrs differently. Only the
  sandybrown canary was accessible per the task's credentials.
- **The exact number of theme-snapshot palette slugs (`primary`/`accent`/`text`/etc.)
  currently defined for this client**, and whether every slug found in stored content
  (`text`, `text-muted`, `primary`, `accent`) currently resolves to a real palette entry —
  this wasn't checked against the live `theme-snapshot.json`/`wp_global_styles` palette, so
  it's possible (though architecturally unlikely, since `extract_token_or_hex` only emits a
  slug when it validates against `_theme_palette_slugs()` at converter-run time) that a
  stored slug from an older client palette no longer resolves after a rebrand — that would
  be the strongest possible argument FOR `linked` mode (a slug is supposed to survive a
  rebrand) but I did not independently confirm the palette hasn't already drifted.
