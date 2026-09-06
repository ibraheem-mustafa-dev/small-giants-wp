<?php
/**
 * SGS Block Variations — card-grid
 *
 * Variations registered via the `get_block_type_variations` filter (WP 6.5+).
 *
 * `register_block_style()` for this block was RETIRED (2026-08-11). The three
 * styles it used to register (elevated/boxed/borderless) emitted hardcoded CSS
 * keyed on `.is-style-{name}` at specificity (0,3,0) — that ALWAYS beat this
 * block's own per-instance override rule `.sgs-card-grid--card
 * .sgs-card-grid__item` at (0,2,0), so an operator's own
 * cardBackground/cardBorderColour/cardBorderWidth/cardRadius/cardShadow choice
 * silently rendered as if it was never set. The fix is a single source of
 * truth: the 4 inserter variations below now write the SAME 5 attributes the
 * "Card Styling (resting state)" inspector controls read/write (see edit.js),
 * so there is only ever one CSS rule per property. The values below are the
 * closest real-token equivalent of what the retired CSS produced — see the
 * per-variation comments for the theme.json line each value was read from.
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Inject SGS variations for sgs/card-grid via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_card_grid_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/card-grid' !== $block_type->name ) {
		return $variations;
	}

	// "Elevated" — theme.json settings.color.palette slug "surface" (line 48)
	// for the background, settings.custom.borderRadius.medium = 8px (line 373)
	// for the radius. The retired CSS's box-shadow referenced
	// `var(--wp--custom--border-radius--medium)`... `var(--wp--custom--shadow--medium)`,
	// a custom token that does NOT exist anywhere in theme.json (only
	// settings.shadow.presets subtle/raised/floating/glow exist, i.e.
	// `--wp--preset--shadow--*`) — so the old "Elevated" box-shadow was already
	// silently rendering as none. "raised" (theme.json line 310-312,
	// `0 4px 12px rgba(0,0,0,0.1)`) is the closest real preset to the elevated
	// look the style's name promised.
	$elevated_card_style = array(
		'cardBackground'    => 'surface',
		'cardBorderColour'  => '',
		'cardBorderWidth'   => array(),
		'cardRadius'        => '8px',
		// Bare preset slug — self-contained (colour baked in by theme.json), so
		// cardShadowColour stays empty; sgs_shadow_value_composed() ignores it
		// for a preset slug (D621/D622 colour-panel split).
		'cardShadow'        => 'raised',
		'cardShadowColour'  => '',
	);

	// "Boxed" — background "surface" + border colour "border" + 1px border on
	// all sides + the
	// same 8px radius, with the shadow explicitly zeroed out (the retired CSS
	// set `box-shadow: none`). cardShadow doesn't accept the literal keyword
	// "none" (an empty string instead falls back to the block's own
	// `--wp--preset--shadow--raised` default in style.css:40) — a zero-length
	// raw SHAPE value is the real equivalent of "no shadow" and is what
	// ShadowControl's own builder would produce for x=y=blur=spread=0. No
	// colour token embedded any more (D621/D622) — colour is moot at zero
	// offset/blur/spread regardless.
	$boxed_card_style = array(
		'cardBackground'    => 'surface',
		'cardBorderColour'  => 'border',
		'cardBorderWidth'   => array(
			'top'    => '1px',
			'right'  => '1px',
			'bottom' => '1px',
			'left'   => '1px',
		),
		'cardRadius'        => '8px',
		'cardShadow'        => '0px 0px 0px 0px',
		'cardShadowColour'  => '',
	);

	// "Borderless" — transparent background (a recognised raw CSS colour
	// keyword, passes through sgs_colour_value() unchanged), zero border, zero
	// radius, no shadow — matches the retired CSS's
	// `border: 0; box-shadow: none; background: transparent; border-radius: 0;`
	// line for line.
	$borderless_card_style = array(
		'cardBackground'    => 'transparent',
		'cardBorderColour'  => '',
		'cardBorderWidth'   => array(
			'top'    => '0px',
			'right'  => '0px',
			'bottom' => '0px',
			'left'   => '0px',
		),
		'cardRadius'        => '0px',
		'cardShadow'        => '0px 0px 0px 0px',
		'cardShadowColour'  => '',
	);

	$sgs_variations = array(
		array(
			'name'        => 'cardgrid-product',
			'title'       => __( 'Product Cards', 'sgs-blocks' ),
			'description' => __( 'Image, title, price, and buy button — for product or service showcases.', 'sgs-blocks' ),
			'icon'        => 'cart',
			'scope'       => array( 'inserter' ),
			'attributes'  => array_merge(
				array( 'columns' => array( 'desktop' => 3 ) ),
				$elevated_card_style
			),
		),
		array(
			'name'        => 'cardgrid-feature',
			'title'       => __( 'Feature Cards', 'sgs-blocks' ),
			'description' => __( 'Icon, title, and supporting text — for showcasing features or benefits.', 'sgs-blocks' ),
			'icon'        => 'star-filled',
			'scope'       => array( 'inserter' ),
			'attributes'  => array_merge(
				array( 'columns' => array( 'desktop' => 3 ) ),
				$boxed_card_style
			),
		),
		array(
			'name'        => 'cardgrid-person',
			'title'       => __( 'Person Cards', 'sgs-blocks' ),
			'description' => __( 'Avatar, name, and role — for team or client showcases.', 'sgs-blocks' ),
			'icon'        => 'admin-users',
			'scope'       => array( 'inserter' ),
			'attributes'  => array_merge(
				array( 'columns' => array( 'desktop' => 4 ) ),
				$boxed_card_style
			),
		),
		array(
			'name'        => 'cardgrid-testimonial',
			'title'       => __( 'Testimonial Cards', 'sgs-blocks' ),
			'description' => __( 'Quote, author photo, and attribution — for social proof sections.', 'sgs-blocks' ),
			'icon'        => 'format-quote',
			'scope'       => array( 'inserter' ),
			'attributes'  => array_merge(
				array( 'columns' => array( 'desktop' => 3 ) ),
				$borderless_card_style
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_card_grid_variations', 10, 2 );
