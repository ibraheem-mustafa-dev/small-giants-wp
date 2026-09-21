<?php
/**
 * Trust bar badge-item styling: icon size, stroke width, item gap and item padding.
 *
 * Everything here returns either CSS custom-property declarations (for the
 * block wrapper's own scoped rule) or scoped CSS text. Nothing is ever an inline
 * `style=""` attribute (Spec 32).
 *
 * - "Bare icon" variant (`badgeStyle: icon-bare`): the icon on its own, with no
 *   circle behind it, at a size chosen in pixels. The circle variant clamps its
 *   disc to 36-64px and draws the icon at 0.45 of it, so a small line icon next to
 *   a label (a ticker strip) is not expressible there.
 * - Stroke width: one control for every outline icon, Lucide sprite or raw SVG.
 * - Item gap and item padding: spacing on each badge item (gap = icon to label),
 *   as responsive tier objects like the block's `gap` and `padding`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH' ) ) {
	// Today's hard-coded stroke width in style.css (`.sgs-trust-bar__circle svg`).
	define( 'SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH', 1.8 );
}
if ( ! defined( 'SGS_TRUST_BAR_DEFAULT_BARE_ICON_SIZE' ) ) {
	define( 'SGS_TRUST_BAR_DEFAULT_BARE_ICON_SIZE', 20 );
}

// Server clamps for the numeric controls. The editor ranges in
// src/blocks/trust-bar/edit-panels.js (TRUST_BAR_LIMITS) mirror these numbers, and
// TrustBarRenderTest::test_editor_ranges_mirror_the_server_clamps fails if they drift.
if ( ! defined( 'SGS_TRUST_BAR_STROKE_WIDTH_MIN' ) ) {
	define( 'SGS_TRUST_BAR_STROKE_WIDTH_MIN', 0.25 );
	define( 'SGS_TRUST_BAR_STROKE_WIDTH_MAX', 4.0 );
	define( 'SGS_TRUST_BAR_BARE_ICON_SIZE_MIN', 8 );
	define( 'SGS_TRUST_BAR_BARE_ICON_SIZE_MAX', 96 );
	define( 'SGS_TRUST_BAR_SCROLL_DURATION_MIN', 2.0 );
	define( 'SGS_TRUST_BAR_SCROLL_DURATION_MAX', 300.0 );
}

if ( ! function_exists( 'sgs_trust_bar_finite_number' ) ) {
	/**
	 * Whether a stored value is a usable number: numeric AND finite.
	 *
	 * `is_numeric( NAN )` and `is_numeric( INF )` are true, and both would otherwise
	 * reach a CSS value as `NaN` / `INF`. Numeric strings such as "1e999" overflow to
	 * INF, so they are checked by their float value too.
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return bool True for a finite int, float or numeric string.
	 */
	function sgs_trust_bar_finite_number( $raw ): bool {
		return ( is_int( $raw ) || is_float( $raw ) || is_string( $raw ) )
			&& is_numeric( $raw )
			&& is_finite( (float) $raw );
	}
}

if ( ! function_exists( 'sgs_trust_bar_icon_stroke_width' ) ) {
	/**
	 * Normalise `iconStrokeWidth`.
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return float 0.25 to 4; the default (1.8) when unset or not numeric.
	 */
	function sgs_trust_bar_icon_stroke_width( $raw ): float {
		if ( ! sgs_trust_bar_finite_number( $raw ) || (float) $raw <= 0 ) {
			return (float) SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH;
		}

		return max( SGS_TRUST_BAR_STROKE_WIDTH_MIN, min( SGS_TRUST_BAR_STROKE_WIDTH_MAX, (float) $raw ) );
	}
}

if ( ! function_exists( 'sgs_trust_bar_icon_bare_size' ) ) {
	/**
	 * Normalise `iconBareSize` (px).
	 *
	 * @param mixed $raw Stored attribute value.
	 * @return int 8 to 96; the default (20) when unset or not numeric.
	 */
	function sgs_trust_bar_icon_bare_size( $raw ): int {
		if ( ! sgs_trust_bar_finite_number( $raw ) || (int) $raw <= 0 ) {
			return (int) SGS_TRUST_BAR_DEFAULT_BARE_ICON_SIZE;
		}

		return max( SGS_TRUST_BAR_BARE_ICON_SIZE_MIN, min( SGS_TRUST_BAR_BARE_ICON_SIZE_MAX, (int) $raw ) );
	}
}

if ( ! function_exists( 'sgs_trust_bar_number' ) ) {
	/**
	 * Format a float for CSS without a locale decimal separator or trailing zeros.
	 *
	 * @param float $value Number.
	 * @return string e.g. "1.6", "2".
	 */
	function sgs_trust_bar_number( float $value ): string {
		return rtrim( rtrim( sprintf( '%.2F', $value ), '0' ), '.' );
	}
}

if ( ! function_exists( 'sgs_trust_bar_icon_style_vars' ) ) {
	/**
	 * CSS custom-property declarations for the icon variants, for the wrapper's scoped rule.
	 *
	 * Both icon variants: stroke width, only when it differs from the default so an
	 * untouched block's output is unchanged. Bare variant only: icon size, icon
	 * colour and label colour (the circle variant emits its own colour vars).
	 *
	 * @param array  $attributes  Block attributes.
	 * @param string $badge_style Active variant (`icon-circle`, `icon-bare`, ...).
	 * @return string[] Declarations such as "--sgs-trust-badge-icon-size: 15px".
	 */
	function sgs_trust_bar_icon_style_vars( array $attributes, string $badge_style ): array {
		$vars = array();

		if ( 'icon-circle' !== $badge_style && 'icon-bare' !== $badge_style ) {
			return $vars;
		}

		$stroke = sgs_trust_bar_icon_stroke_width( $attributes['iconStrokeWidth'] ?? null );
		if ( abs( $stroke - (float) SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH ) > 0.001 ) {
			$vars[] = '--sgs-trust-badge-icon-stroke-width: ' . sgs_trust_bar_number( $stroke );
		}

		if ( 'icon-bare' !== $badge_style ) {
			return $vars;
		}

		$size = sgs_trust_bar_icon_bare_size( $attributes['iconBareSize'] ?? null );
		if ( SGS_TRUST_BAR_DEFAULT_BARE_ICON_SIZE !== $size ) {
			$vars[] = '--sgs-trust-badge-icon-size: ' . $size . 'px';
		}

		$icon_colour = sgs_colour_value( $attributes['iconColour'] ?? 'primary-dark' );
		$vars[]      = '--sgs-trust-badge-icon-colour: ' . ( $icon_colour ? $icon_colour : 'var(--wp--preset--color--primary-dark)' );

		$text_colour = sgs_colour_value( $attributes['textColour'] ?? 'text' );
		if ( $text_colour ) {
			$vars[] = '--sgs-trust-badge-text-colour: ' . $text_colour;
		}

		return $vars;
	}
}

if ( ! function_exists( 'sgs_trust_bar_icon_stroke_force_css' ) ) {
	/**
	 * Make a non-default stroke width reach every drawn element inside the icon.
	 *
	 * The stylesheet sets `stroke-width` on the `<svg>`; children inherit it unless
	 * they carry their own `stroke-width` attribute (common in a draft's raw SVG).
	 * Only when the operator has chosen a non-default width, force the children to
	 * inherit it so the control means what it says for Lucide and raw-SVG icons
	 * alike. Empty for the default, so an untouched block's output is unchanged.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param string $badge_style Active variant.
	 * @param string $uid_scope   Scoped selector for this instance, e.g. ".sgs-tb-3".
	 * @return string CSS text.
	 */
	function sgs_trust_bar_icon_stroke_force_css( array $attributes, string $badge_style, string $uid_scope ): string {
		if ( 'icon-circle' !== $badge_style && 'icon-bare' !== $badge_style ) {
			return '';
		}

		$stroke = sgs_trust_bar_icon_stroke_width( $attributes['iconStrokeWidth'] ?? null );
		if ( abs( $stroke - (float) SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH ) <= 0.001 ) {
			return '';
		}

		$icon = 'icon-bare' === $badge_style ? '.sgs-trust-bar__icon' : '.sgs-trust-bar__circle';

		return $uid_scope . ' ' . $icon . ' svg *{stroke-width:inherit;}';
	}
}

if ( ! function_exists( 'sgs_trust_bar_scrub_spacing' ) ) {
	/**
	 * Drop everything from a spacing value that cannot become a CSS length.
	 *
	 * `sgs_responsive_format_atom_value()` (helpers-responsive.php, shared, not changed
	 * here) stringifies whatever it is given: a nested array became `gap:Array;` (plus an
	 * "Array to string conversion" warning) and INF became `INFpx`. Validate first: only
	 * strings and finite numbers survive; booleans, null, non-finite numbers and arrays
	 * deeper than the property's shape are dropped.
	 *
	 * @param mixed $value Stored value: a scalar, a tier object, or (box) a tier object of sides.
	 * @param int   $depth Levels of array allowed below this one (gap 1; box 2).
	 * @return mixed|null The scrubbed value, or null when nothing usable is left.
	 */
	function sgs_trust_bar_scrub_spacing( $value, int $depth ) {
		if ( is_array( $value ) ) {
			if ( $depth <= 0 ) {
				return null;
			}
			$clean = array();
			foreach ( $value as $key => $item ) {
				$item = sgs_trust_bar_scrub_spacing( $item, $depth - 1 );
				if ( null !== $item ) {
					$clean[ $key ] = $item;
				}
			}
			return $clean ? $clean : null;
		}
		if ( is_string( $value ) && ! is_numeric( $value ) ) {
			return $value;
		}

		return sgs_trust_bar_finite_number( $value ) ? $value : null;
	}
}

if ( ! function_exists( 'sgs_trust_bar_library_icon_svg' ) ) {
	/**
	 * SVG for an icon slug (Lucide, WordPress or SGS library), sanitised for output.
	 *
	 * The generated map is a trusted build artefact, but it is echoed into the page, so
	 * it goes through the same wp_kses allowlist as the raw-SVG branch anyway. That is
	 * defence in depth ONLY: `sgs_svg_kses_allowed_tags()` still allows <use>/<image>
	 * href (responsive-logo needs them), so the real gate against a hostile library
	 * icon is scripts/generate-icons.js + assets/icons/svg-allowlist.json.
	 *
	 * @param string $slug Icon slug (already sanitize_key()'d).
	 * @return string Sanitised SVG markup; the `check` icon when the slug is unknown.
	 */
	function sgs_trust_bar_library_icon_svg( string $slug ): string {
		$svg = sgs_get_lucide_icon( $slug );
		if ( ! $svg ) {
			$svg = sgs_get_lucide_icon( 'check' );
		}

		return wp_kses( $svg, sgs_svg_kses_allowed_tags() );
	}
}

if ( ! function_exists( 'sgs_trust_bar_item_css' ) ) {
	/**
	 * Scoped CSS for the badge item's own spacing: `itemGap` (icon to label) and
	 * `itemPadding`, both responsive tier objects.
	 *
	 * The selector carries the block root plus the item class ((0,3,0)) so it beats
	 * the per-variant defaults in style.css (`.sgs-trust-bar--icon-circle
	 * .sgs-trust-bar__badge`, (0,2,0)) without needing `!important`.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Block root selector, e.g. ".sgs-tb-3.wp-block-sgs-trust-bar".
	 * @return string CSS text; '' when neither attribute is set.
	 */
	function sgs_trust_bar_item_css( array $attributes, string $root_sel ): string {
		$props = array();

		$gap     = isset( $attributes['itemGap'] ) && is_array( $attributes['itemGap'] )
			? sgs_trust_bar_scrub_spacing( $attributes['itemGap'], 1 ) : null;
		$padding = isset( $attributes['itemPadding'] ) && is_array( $attributes['itemPadding'] )
			? sgs_trust_bar_scrub_spacing( $attributes['itemPadding'], 2 ) : null;

		if ( null !== $gap ) {
			$props[] = array(
				'value'        => $gap,
				'css'          => 'gap',
				'unit_default' => 'px',
			);
		}
		if ( null !== $padding ) {
			$props[] = array(
				'value'        => $padding,
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			);
		}

		if ( ! $props ) {
			return '';
		}

		return sgs_emit_responsive_css( $root_sel . ' .sgs-trust-bar__badge', $props, array( 'container' => false ) );
	}
}
