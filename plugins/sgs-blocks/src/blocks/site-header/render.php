<?php
/**
 * SGS Site Header — server-side render.
 *
 * The header shell: a vertical stack of up to three sgs/site-header-row blocks
 * (top / middle / bottom). Empty rows emit zero output (handled by the row
 * block itself). Outer rendering is delegated ENTIRELY to the shared
 * SGS_Container_Wrapper (section KIND) per composite-mirror (R-31-9) —
 * no divergent per-block styling path.
 *
 * Rendered with tag <header>: this block IS the site banner landmark.
 * The SGS header engine (Sgs_Header_Rules::filter_template_part) short-circuits
 * core/template-part on every request via the priority-9999 default rule, so
 * core never emits its own <header class="wp-block-template-part"> wrapper.
 * Emitting <header> here provides sticky/transparent/shrink/hide-on-scroll AND
 * the banner landmark. 'header' is in SGS_Container_Wrapper's tag allowlist. The behaviours key on the
 * block-guaranteed '.sgs-site-header' class. No nested landmark in the current
 * template roster: rows render as <div> (site-header-row) and the engine's
 * short-circuit means core's <header class="wp-block-template-part"> wrapper is not
 * emitted. Limitation: if a template/pattern ever resolves the
 * header template-part TWICE on one request, Sgs_Header_Rules::filter_template_part's
 * has_served() branch hands the second slot back to core, which WOULD then wrap a
 * second sgs/site-header in core's <header> = nested banner landmarks. A double-header
 * template would need a guard at that branch.
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes.
 *   $content     string    InnerBlocks HTML (the rendered rows).
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/sgs-header-float-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/sgs-header-force-solid.php';
require_once dirname( __DIR__, 3 ) . '/includes/sgs-header-z-index.php';

// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation (class-sgs-container-wrapper.php)
// rather than the per-request counter wp_unique_id(): identical header attributes
// yield an identical uid on every page, so the CSS collector can dedup this block's
// scoped <style> across pages (no cache fragmentation) and Spec 37 FR-37-16's
// re-save=same-uid golden holds. STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid      = 'sgs-sh-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-site-header';
$classes  = array( 'sgs-site-header', $uid );

$css = '';

// ── Scoped colour + border — no-inline contract (Spec 32). ──────────────────────
// Mirrors sgs/site-header-row + sgs/feature-grid: every value is emitted into
// this block's scoped <style>, never inline.

$sh_style_engine_args = array();

// Colour comes from SGS-OWNED attributes, not the native supports (FR-37-44).
// block.json still DECLARES supports.color — the audit-block-uniformity gate
// requires the key to be present as a pipeline/DB contract signal — but every
// sub-flag is false, so WordPress renders no colour panel of its own and never
// writes $attributes['style']['color'] at all. Reading it here would be dead code.
// The header mirrors sgs/site-header-row exactly — same attribute names, same
// style engine, same scoped emission — so the two read as one system.
// ⚠ EVERY value goes through sgs_colour_value() before the style engine.
// DesignTokenPicker stores a token SLUG ('surface') when a palette swatch is
// picked with linked:true — see its own docblock — and the style engine does
// NOT resolve a bare slug: it would emit the invalid `background-color:surface`.
// sgs_colour_value() turns a slug into var(--wp--preset--color--surface),
// passes a raw hex through untouched, and rejects a declaration breakout
// riding a var() passthrough.
$sh_color_args = array();
if ( isset( $attributes['textColour'] ) && '' !== $attributes['textColour'] ) {
	$sh_text_value = sgs_colour_value( (string) $attributes['textColour'] );
	if ( '' !== $sh_text_value ) {
		$sh_color_args['text'] = $sh_text_value;
	}
}
if ( isset( $attributes['backgroundColour'] ) && '' !== $attributes['backgroundColour'] ) {
	$sh_bg_value = sgs_colour_value( (string) $attributes['backgroundColour'] );
	if ( '' !== $sh_bg_value ) {
		$sh_color_args['background'] = $sh_bg_value;
	}
}
if ( isset( $attributes['backgroundColourGradient'] ) && '' !== $attributes['backgroundColourGradient'] ) {
	$sh_gradient_value = sgs_colour_value( (string) $attributes['backgroundColourGradient'] );
	if ( '' !== $sh_gradient_value ) {
		$sh_color_args['gradient'] = $sh_gradient_value;
	}
}
if ( ! empty( $sh_color_args ) ) {
	$sh_style_engine_args['color'] = $sh_color_args;
}

// Border width/style/colour are block-private attrs, emitted below.

if ( ! empty( $sh_style_engine_args ) ) {
	$sh_scoped_styles = wp_style_engine_get_styles(
		$sh_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $sh_scoped_styles['css'] ) ) {
		$css .= $sh_scoped_styles['css'];
	}
}

// WordPress injects the `textColor` / `backgroundColor` slug attributes ONLY
// while supports.color's sub-flags are true; with them false those attributes
// are never written, so the has-*-color classes could only ever come from
// stale stored content.

// ── Header-level tri-state behaviours (FR-37-14, Spec 35 T1.4) ──────────────
// Sticky, transparent, shrink and hide-on-scroll resolve HERE, per tier, via
// sgs_resolve_tier()/sgs_emit_tier_rules() (FR-37-15), scoped to THIS block's
// own uid, because a site-wide body class cannot express "on for desktop,
// off for mobile".
//
// Two mechanisms, matched to what each behaviour needs:
// 1. STATIC per-tier CSS (sticky's position, transparent's resting
// position/background, shrink's transition/animation setup) is fully
// determined at render time and needs no scroll-state JS at all — emitted
// directly via sgs_emit_tier_rules() with an explicit "off" declaration
// (never '') so a narrower tier can genuinely CANCEL a wider tier's
// unmedia-queried base rule (CSS cascade: the later, narrower @media
// rule only wins if it re-declares the same property).
// 2. SCROLL-STATE classes (is-header-scrolled / is-header-shrunk /
// is-header-scrolling-down) are toggled by view.js on scroll on the header
// ELEMENT, and the CSS rule that gives them any visual effect is ITSELF
// tier-gated via sgs_emit_tier_rules() (keyed to ".is-header-shrunk" etc. as
// part of the selector), so a tier where the behaviour is OFF sees no effect
// even though JS still toggles the class there (correct-by-construction
// gating — no per-tier JS/matchMedia bookkeeping needed at header level,
// unlike the row-level path, which needs it because rows emit their
// gating as data-attrs consumed by matchMedia, not @media CSS).
$sh_sticky      = isset( $attributes['headerSticky'] ) ? $attributes['headerSticky'] : array();
$sh_transparent = isset( $attributes['headerTransparent'] ) ? $attributes['headerTransparent'] : array();
$sh_shrink      = isset( $attributes['headerShrink'] ) ? $attributes['headerShrink'] : array();
$sh_hide        = isset( $attributes['headerHideOnScroll'] ) ? $attributes['headerHideOnScroll'] : array();
$sh_contrast    = isset( $attributes['contrastSafe'] ) ? $attributes['contrastSafe'] : array();

// FORCE-SOLID PAINTS THE HEADER'S RESTING BACKGROUND, THROUGH THE MERGE.
// Force-solid means "solid at this tier": Transparent resolves off here (below)
// AND the header's own fill, or the theme surface token when it has none, is
// contributed as a fourth entry of the merge (sgs_header_force_solid_entry()),
// so the merge stays the single writer of `background`. Painting it anywhere
// else would lose to the merge's `!important`, and a wider transparent tier is
// cancelled with `background:revert !important`, which erases the block's own
// fill unless a `background` is contributed at this tier.
// Every tier is resolved concrete, which the emitters handle identically (the
// differs-from-the-tier-above minimisation still collapses equal tiers).
// DIRECTION. Transparent has TWO states — see-through at rest, solid once
// scrolled. `headerTransparentDirection` chooses which state is which. It
// adds NO new CSS mechanism: it swaps which of the two existing
// rules (the resting one, or the `.is-header-scrolled` one) carries the
// transparency.
$sh_direction   = isset( $attributes['headerTransparentDirection'] )
	? (string) $attributes['headerTransparentDirection']
	: 'transparent-first';
$sh_solid_first = ( 'solid-first' === $sh_direction );

$sh_transparent_effective = array();
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sh_tier ) {
	$sh_tier_transparent = sgs_resolve_tier( $sh_transparent, $sh_tier, 'off' );
	$sh_tier_contrast    = sgs_resolve_tier( $sh_contrast, $sh_tier, 'none' );
	$sh_transparent_effective[ $sh_tier ] = ( 'force-solid' === $sh_tier_contrast['value'] )
		? 'off'
		: $sh_tier_transparent['value'];
}

// Sticky + Transparent both write to the SAME base selector's `position` /
// `top`. (`z-index` is NOT one of them: sgs_header_z_index_css() below is its
// single writer, so no behaviour can revert it.) sgs_merge_tri_state_declarations() resolves both per
// tier FIRST and emits ONE set of declarations per tier, single writer per
// property — an off/never-configured behaviour contributes nothing at all,
// and if both are ever genuinely ON for the same tier, Sticky (listed first)
// wins position/top while Transparent still contributes its own
// non-colliding `background`/`left`/`right` (documented precedence, not an
// accident of source order).
// FLOAT ("pill") is a THIRD entry in the same merge, listed FIRST, so the
// documented precedence is Float > Sticky > Transparent for position/top
// and the single-writer-per-property guarantee is untouched. Float ON for a tier
// IMPLIES the sticky declaration for that tier: a pill that is not pinned is
// just an inset bar that scrolls away. Its `top` is the inset rather than 0 —
// emitted as a custom-property VALUE (Spec 32), published per tier by
// sgs_header_float_css() on this same selector, with a 0px fallback so the
// declaration is still valid on a tier where no inset resolved.
$sh_float = isset( $attributes['headerFloat'] ) ? $attributes['headerFloat'] : array();

$css .= sgs_merge_tri_state_declarations(
	$root_sel,
	array(
		array(
			'raw'   => $sh_float,
			'props' => array(
				'position' => 'sticky',
				'top'      => 'var(--sgs-header-float-inset-top, 0px)',
			),
		),
		array(
			'raw'   => $sh_sticky,
			'props' => array(
				'position' => 'sticky',
				'top'      => '0',
			),
		),
		// Listed before Transparent: a tier that is force-solid has Transparent
		// resolved off, so the two never write `background` at the same tier.
		sgs_header_force_solid_entry( $attributes ),
		array(
			// Under solid-first the header RESTS solid, so the resting rule must
			// not receive the transparent declarations at all — transparency
			// moves to the scrolled rule below. Passing an all-off object (not
			// an empty one) keeps every tier concrete, which is what stops a
			// stored desktop value cascading back in.
			'raw'   => $sh_solid_first
				? array(
					'desktop' => 'off',
					'tablet'  => 'off',
					'mobile'  => 'off',
				)
				: $sh_transparent_effective,
			'props' => array(
				'position'   => 'absolute',
				'top'        => '0',
				'left'       => '0',
				'right'      => '0',
				'background' => 'transparent',
			),
		),
	),
	'off'
);
// STACKING ORDER: the per-tier `zIndex` attribute, written once, here.
$css .= sgs_header_z_index_css( $root_sel, $attributes, sgs_header_z_index_may_publish() );
// SCROLLED-state background for the Transparent behaviour — a distinct STATE
// selector (root_sel + '.is-header-scrolled'), so this rule never collides
// with the merged at-rest declarations above (single-writer design intact;
// this is a separate selector, not a second writer of the same one).
// Emitted PER TIER, gated to tiers where Transparent genuinely resolves ON
// (a tier where it's off has no resting transparency to flip away from, and
// the base rule wins there by default). MUST carry `!important`:
// sgs_merge_tri_state_declarations() emits every resting
// declaration (including Transparent's `background:transparent`) WITH
// `!important`, and an `!important` declaration always beats a non-`!important`
// one regardless of selector specificity or source order, so the extra
// `.is-header-scrolled` class alone never wins. Token-based (theme surface
// preset), never hardcoded.
// SCROLLED STATE — the other half of the transparent pair, client-reachable via
// backgroundColourScrolled / backgroundColourScrolledGradient / textColourScrolled,
// falling back to the same surface token when unset.
//
// MUST CARRY `!important` — do not drop it (see the note above).
//
// Built by hand rather than through wp_style_engine_get_styles() for exactly
// that reason — the style engine has no way to emit `!important`.
if ( $sh_solid_first ) {
	// Inverted pair: solid at rest (emitted above), see-through once scrolled.
	$css .= sgs_emit_tier_rules(
		$root_sel . '.is-header-scrolled',
		$sh_transparent_effective,
		'background:transparent !important;',
		'',
		'off'
	);
} else {
	$sh_scrolled_decls = '';

	$sh_scrolled_bg = isset( $attributes['backgroundColourScrolled'] )
		? sgs_colour_value( (string) $attributes['backgroundColourScrolled'] )
		: '';
	$sh_scrolled_decls .= 'background:' . ( '' !== $sh_scrolled_bg
		? $sh_scrolled_bg
		: 'var(--wp--preset--color--surface,#ffffff)' ) . ' !important;';

	// A gradient paints via background-image, so it LAYERS over the colour
	// above rather than replacing it — the colour stays as the fallback for a
	// browser that cannot render the gradient value.
	if ( isset( $attributes['backgroundColourScrolledGradient'] ) && '' !== $attributes['backgroundColourScrolledGradient'] ) {
		$sh_scrolled_gradient = sgs_colour_value( (string) $attributes['backgroundColourScrolledGradient'] );
		if ( '' !== $sh_scrolled_gradient ) {
			$sh_scrolled_decls .= 'background-image:' . $sh_scrolled_gradient . ' !important;';
		}
	}

	if ( isset( $attributes['textColourScrolled'] ) && '' !== $attributes['textColourScrolled'] ) {
		$sh_scrolled_text = sgs_colour_value( (string) $attributes['textColourScrolled'] );
		if ( '' !== $sh_scrolled_text ) {
			$sh_scrolled_decls .= 'color:' . $sh_scrolled_text . ' !important;';
		}
	}

	$css .= sgs_emit_tier_rules(
		$root_sel . '.is-header-scrolled',
		$sh_transparent_effective,
		$sh_scrolled_decls,
		'',
		'off'
	);
}

// SHADOW ONCE SCROLLED — the elevation a pinned header takes when the page has
// moved under it. Same value vocabulary as the resting `shadow` (a theme shadow
// preset slug, or a raw shape composed with `shadowScrolledColour`) and the SAME
// resolver, sgs_shadow_value_composed(), which the wrapper uses for the resting
// shadow — so a slug resolves to var(--wp--preset--shadow--{slug}) and a colour
// token resolves through sgs_colour_value(), with no second resolution path.
//
// NOTHING PAINTS BY DEFAULT: with `shadowScrolled` empty, $sh_shadow_scrolled_value
// is '' and every branch below is skipped — the emitted CSS is byte-identical to
// a header that has never heard of this attribute.
//
// Not tier-gated, deliberately. The scrolled BACKGROUND rule above is gated on
// where Transparent is ON because it flips away from a resting transparency;
// a shadow has no such precondition, it simply applies once `.is-header-scrolled`
// is present. It is a plain scalar (like the resting `shadow`), not a per-device
// object. `.is-header-scrolled` is a separate STATE selector from the resting
// rules, and the resting `box-shadow` (wrapper, `.uid{}`) never uses !important,
// so the extra class wins by specificity alone — no second writer, no !important.
$sh_shadow_scrolled_shape  = isset( $attributes['shadowScrolled'] ) && is_string( $attributes['shadowScrolled'] )
	? $attributes['shadowScrolled']
	: '';
$sh_shadow_scrolled_colour = isset( $attributes['shadowScrolledColour'] ) && is_string( $attributes['shadowScrolledColour'] )
	? $attributes['shadowScrolledColour']
	: '';
$sh_shadow_scrolled_value  = sgs_shadow_value_composed( $sh_shadow_scrolled_shape, $sh_shadow_scrolled_colour );
$sh_shadow_scrolled_on     = '' !== $sh_shadow_scrolled_value;

// `transition` is a SHORTHAND that Shrink's fallback and Hide-on-scroll below
// already write on this same selector, and a later shorthand replaces an earlier
// one wholesale. So the shadow's easing is not a fourth writer: it is appended to
// each of their lists (and stands in for their `transition:none` off-value), and
// emitted on its own only as the base they override. Empty strings when no
// scrolled shadow is set, which is what keeps their output unchanged.
$sh_shadow_tx_append = $sh_shadow_scrolled_on ? ',box-shadow 200ms ease' : '';
$sh_shadow_tx_off    = $sh_shadow_scrolled_on ? 'transition:box-shadow 200ms ease;' : 'transition:none;';

if ( $sh_shadow_scrolled_on ) {
	// Eases in AND out: the resting rule carries the transition, so the return to
	// the resting shadow (scrolling back to the top) animates as well. The
	// prefers-reduced-motion reset near the end of this file (`transition:none
	// !important` on this selector) removes it for visitors who ask for no motion;
	// the end-state shadow still applies.
	$css .= $root_sel . '{transition:box-shadow 200ms ease;}';
	$css .= $root_sel . '.is-header-scrolled{box-shadow:' . $sh_shadow_scrolled_value . ';}';
}

// Shrink — transition/animation setup per tier, THEN the shrunk padding value
// itself emitted separately (also per tier) keyed to ".is-header-shrunk" so a
// tier where shrink is off never sees the reduced padding even if view.js has
// toggled the class (it toggles unconditionally — CSS is the real gate).
// Rule (a): a behaviour that is off at EVERY tier contributes nothing at all
// (no unconditional off-cancel-decl to collide with a sibling behaviour).
$sh_shrink_any_tier = ! empty( sgs_resolve_on_tiers( $sh_shrink, 'on', 'off' ) );
$sh_hide_any_tier   = ! empty( sgs_resolve_on_tiers( $sh_hide, 'on', 'off' ) );

if ( $sh_shrink_any_tier ) {
	// The two padding ends of the shrink, named once and reused by all three
	// emitters below (keyframes, legacy resting rule, legacy shrunk rule) so the
	// resting end a narrower tier restores is by construction the same value the
	// resting rule sets.
	$sh_shrink_pad_rest   = 'var(--wp--preset--spacing--30,1.5rem)';
	$sh_shrink_pad_shrunk = 'var(--wp--preset--spacing--10,0.5rem)';

	$sh_shrink_scroll_css = sgs_emit_tier_rules(
		$root_sel,
		$sh_shrink,
		'animation-name:sgs-header-shrink-' . $uid . ';animation-duration:1ms;animation-fill-mode:both;animation-timeline:scroll(root block);animation-range:0 200px;',
		'animation-name:none;',
		'off'
	);
	if ( '' !== $sh_shrink_scroll_css ) {
		$css .= '@supports (animation-timeline: scroll()) {' . $sh_shrink_scroll_css
			. '@keyframes sgs-header-shrink-' . $uid . '{from{padding-block:' . $sh_shrink_pad_rest . ';}to{padding-block:' . $sh_shrink_pad_shrunk . ';}}}';
	}

	// Legacy (no `animation-timeline`) fallback: base padding + its own
	// transition. Limitation: with both Shrink and Hide active on the same
	// tier on a browser without `animation-timeline`, whichever rule is
	// emitted later wins the `transition` shorthand on the shared base selector.
	$sh_shrink_fallback_css = sgs_emit_tier_rules(
		$root_sel,
		$sh_shrink,
		'padding-block:' . $sh_shrink_pad_rest . ';transition:padding-block 200ms ease' . $sh_shadow_tx_append . ';',
		$sh_shadow_tx_off,
		'off'
	);
	if ( '' !== $sh_shrink_fallback_css ) {
		// The shrunk VALUE belongs to the LEGACY path only — the scroll-timeline
		// path above animates padding purely from scroll progress, and an
		// animation beats a normal declaration in the cascade, so a rule emitted
		// outside this @supports block would be dead weight on a modern browser
		// at an ON tier and a live leak at an OFF one (where the animation is
		// switched off but the class is still toggled).
		//
		// The OFF declaration restores the resting end rather than being left
		// empty: view.js toggles `.is-header-shrunk` unconditionally, and the
		// desktop rule carries no media query, so an empty off value leaves the
		// wider tier's reduced padding applying at a tier where shrink is off.
		// It cannot be `padding-block:revert` — revert rolls back past the
		// author origin to the user-agent default (no padding at all), which is
		// not this header's resting padding. The resting VALUE is the only
		// honest cancel, and within this fallback the resting value is the one
		// the rule above sets.
		$css .= '@supports not (animation-timeline: scroll()) {' . $sh_shrink_fallback_css
			. sgs_emit_tier_rules(
				$root_sel . '.is-header-shrunk',
				$sh_shrink,
				'padding-block:' . $sh_shrink_pad_shrunk . ';',
				'padding-block:' . $sh_shrink_pad_rest . ';',
				'off'
			) . '}';
	}
}

// Hide on scroll — transition setup + the translate value, both per tier.
//
// TRAVEL UNDER FLOAT. `translateY(-100%)` moves the header by exactly its OWN
// height, which is correct only while its top edge is at 0. A floating pill slid
// by its own height leaves its top inset behind as a visible sliver of bar. The
// travel therefore adds the inset back — as a custom-property VALUE, resolved per
// tier by sgs_header_float_css() (0px on a tier where the pill is not floating).
// With float off at every tier the travel is the plain `-100%`, so a header that
// does not float emits byte-identical CSS.
$sh_float_any_tier = ! empty( sgs_header_float_tiers( $attributes ) );
$sh_hide_travel    = $sh_float_any_tier
	? 'transform:translateY(calc(-100% - var(--sgs-header-float-inset-top, 0px)));'
	: 'transform:translateY(-100%);';
if ( $sh_hide_any_tier ) {
	$css .= sgs_emit_tier_rules(
		$root_sel,
		$sh_hide,
		'transition:transform 200ms ease' . $sh_shadow_tx_append . ';will-change:transform;',
		$sh_shadow_tx_off,
		'off'
	);
	$css .= sgs_emit_tier_rules(
		$root_sel . '.is-header-scrolling-down',
		$sh_hide,
		$sh_hide_travel,
		'transform:revert;',
		'off'
	);
}

// Contrast safety over hero — PER TIER, emitted as per-instance scoped CSS,
// matching the four behaviours above. A body class is site-wide and cannot
// express "scrim on desktop, none on phone", which is the common case for a
// header transparent over a desktop hero only.
//
// Uses sgs_emit_tier_rules_map(), NOT sgs_emit_tier_rules(): this is a
// four-value enum, and the binary helper tests `'on' === $state`, so 'scrim',
// 'shadow' and 'force-solid' would all collapse into its single off branch and
// paint identically.
//
// 'force-solid' is absent here by design — it is resolved above, as a
// suppressor of Transparent, so it needs no CSS of its own.
$sh_contrast_modes = array();
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sh_tier ) {
	$sh_resolved                = sgs_resolve_tier( $sh_contrast, $sh_tier, 'none' );
	$sh_contrast_modes[]        = $sh_resolved['value'];
}

if ( in_array( 'scrim', $sh_contrast_modes, true ) ) {
	// Containing block for the overlay. Emitted unconditionally (not per tier)
	// because it is inert on a tier without the scrim: the overlay there is
	// switched off via `content:none`, so nothing is positioned against it.
	$css .= $root_sel . '{position:relative;}';

	// The scrim itself. The 'none' fallback CANCELS it, which is what makes a
	// per-tier difference work at all — a tier that drops the scrim must
	// actively remove the overlay, not merely decline to add one.
	$css .= sgs_emit_tier_rules_map(
		$root_sel . '::before',
		$sh_contrast,
		array(
			'scrim' => 'content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,0.55),rgba(0,0,0,0));',
		),
		'content:none;',
		'none'
	);

	// Header content sits above the scrim.
	$css .= sgs_emit_tier_rules_map(
		$root_sel . ' > *',
		$sh_contrast,
		array( 'scrim' => 'position:relative;z-index:1;' ),
		'',
		'none'
	);
}

if ( in_array( 'shadow', $sh_contrast_modes, true ) ) {
	// COSMETIC ONLY — never WCAG-conformant. A text-shadow's contrast against
	// arbitrary imagery cannot be computed, so this mode must never be
	// described as meeting a contrast requirement; the inspector label says
	// "not WCAG-safe" for exactly this reason. Do not upgrade that claim.
	//
	// A selector LIST, with no pseudo-element appended — appending one to an
	// imploded list attaches it to the last selector only.
	$css .= sgs_emit_tier_rules_map(
		$root_sel . ' a,' . $root_sel . ' button',
		$sh_contrast,
		array( 'shadow' => 'text-shadow:0 1px 3px rgba(0,0,0,0.6);' ),
		'text-shadow:none;',
		'none'
	);
}

// prefers-reduced-motion: self-contained here (per-instance scoped CSS) rather
// than relying on the shared stylesheet, since the transition/animation
// declarations above are themselves per-instance.
$css .= '@media (prefers-reduced-motion: reduce) {' . $root_sel . '{transition:none !important;animation:none !important;}}';

// Data attrs consumed by view.js: (a) whether ANY tier requests sticky, so the
// "sticky silently broken by an ancestor" warning only fires when relevant;
// (b) whether ANY tier requests a scroll-driven behaviour, so the scroll
// listener is skipped entirely on headers with none active.
// (c) whether the header floats at ANY tier, read by the nav panel-bounds path
// so a dropdown opened from a pill clamps inside the pill instead of the
// viewport. Measured geometry still decides what actually happens at the
// visitor's width — this attribute only says "it is worth measuring".
$sh_extra_attrs = array( 'id' => $uid );
// Float implies sticky, so a float-only header must still get the
// "an ancestor is silently breaking sticky" advisory.
$sh_sticky_any_tier     = ! empty( sgs_resolve_on_tiers( $sh_sticky, 'on', 'off' ) ) || $sh_float_any_tier;
$sh_scroll_behaviour_on = ! empty( sgs_resolve_on_tiers( $sh_transparent, 'on', 'off' ) )
	|| ! empty( sgs_resolve_on_tiers( $sh_shrink, 'on', 'off' ) )
	|| ! empty( sgs_resolve_on_tiers( $sh_hide, 'on', 'off' ) )
	// A scrolled shadow needs view.js to toggle `.is-header-scrolled`, even on a
	// header that is neither transparent, shrinking nor hiding (a plain or merely
	// sticky one). Without this the class is never added and the shadow never shows.
	|| $sh_shadow_scrolled_on;
if ( $sh_sticky_any_tier ) {
	$sh_extra_attrs['data-sgs-header-sticky'] = '1';
}
if ( $sh_scroll_behaviour_on ) {
	$sh_extra_attrs['data-sgs-header-scroll-behaviours'] = '1';
}
if ( $sh_float_any_tier ) {
	$sh_extra_attrs['data-sgs-header-float'] = '1';
}


// ── Block-private border: width / style / colour. ──
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// A style with no width means no border — never fall through to the
	// browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops.
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$css .= $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius via wp_style_engine_get_styles() (base and the
// tablet/mobile tiers use the identical call). The style-engine result is an
// intermediate PHP value ($out array), never appended raw -- only its ['css']
// string is appended to $css. ──
$radius_tiers = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// ── Floating ("pill") geometry — LAST, deliberately. ──
// Its collapse-to-full-width block must out-rank both the pill geometry above it
// and the per-tier border-radius rules emitted just now, and at equal specificity
// that is decided by source order. Emits absolutely nothing unless `headerFloat`
// resolves 'on' at some tier or `backdropBlur` carries a value.
// See includes/sgs-header-float-css.php.
//
// The EFFECTIVE transparency (force-solid already resolved to off) and the
// direction flag are passed in rather than re-read from the raw attributes:
// whether the shadow is suppressed depends on which state is see-through, and
// $sh_transparent_effective / $sh_solid_first above are the single resolver of
// that. A second resolver inside the float file would disagree with this one.
$css .= sgs_header_float_css( $root_sel, $attributes, $sh_transparent_effective, $sh_solid_first );

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	SGS_Container_Wrapper::resolve_kind( $block, 'section' ),
	array(
		// ALWAYS <header> — a site header is a page-unique landmark; offering a
		// plain <div> tag choice would let someone break the page's accessibility
		// landmark structure from a dropdown.
		'tag'           => 'header',
		'extra_classes' => $classes,
		'extra_attrs'   => $sh_extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
