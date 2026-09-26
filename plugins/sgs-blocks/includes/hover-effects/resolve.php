<?php
/**
 * Hover Effects — per-block default/exclusion resolution.
 *
 * Split out of the former includes/hover-effects.php (the orchestrator now
 * lives in hover-effects.php in this same folder). Verbatim move; no
 * behaviour change.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Whether a hover-shadow value is a theme shadow preset SLUG. The panel offers every preset in
 * `settings.shadow.presets`, so this checks the shape of the value, not a fixed list of names.
 *
 * @param mixed $value Stored `sgsHoverShadow` value.
 * @return bool
 */
function is_hover_shadow_slug( $value ): bool {
	return is_string( $value ) && 1 === preg_match( '/^[a-z][a-z0-9-]*$/', $value );
}

/**
 * Resolve per-block hover defaults from the BLOCK'S OWN DECLARATION.
 *
 * Mirrors resolveBlockDefaults() in src/blocks/extensions/hover-effects/resolve.js —
 * both read the same `supports.sgs.hoverDefaults` object, so there is ONE declaration per block
 * and no roster to keep in step.
 *
 * ⛔ REPLACED three hardcoded block-name arrays (D805). Those arrays named 11
 * blocks and NOTHING gated them, so eight blocks received injected hover
 * motion with the hover panel switched off and no editor control to change it
 * — a default the client cannot see or reach. Same shape as the 47-name
 * `:not()` list D784/D793 deleted: named exceptions standing in for a
 * classification. A twelfth block now declares its own defaults in its own
 * block.json instead of somebody hand-editing PHP.
 *
 * TWO conditions, both required, so "declared but unreachable" cannot recur:
 *   1. the block declares `supports.sgs.hoverDefaults`, AND
 *   2. the block opts the hover panel in via `supports.sgs.enabledExtensions`.
 * Condition 2 is what makes this structural rather than a promise: a default
 * with no control is exactly the defect being fixed, so the mechanism refuses
 * to emit one.
 *
 * @param string $block_name Block name (e.g. 'sgs/card-grid').
 * @return array { scale_preset: string, shadow: string, image_zoom: bool, focus_ring: bool, lift: int, zoom: int, zoom_duration: int }
 */
function resolve_hover_defaults( string $block_name ): array {
	$all_off = array(
		'scale_preset' => '',
		'shadow'       => '',
		'image_zoom'    => false,
		'focus_ring'    => false,
		'lift'          => 0,
		'zoom'          => 0,
		'zoom_duration' => 0,
	);

	if ( '' === $block_name ) {
		return $all_off;
	}

	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	if ( ! $type instanceof \WP_Block_Type ) {
		return $all_off;
	}

	$sgs = $type->supports['sgs'] ?? array();
	if ( ! is_array( $sgs ) ) {
		return $all_off;
	}

	// Condition 2 — no hover panel means no injected default. A value the
	// client cannot reach is the bug, not a feature.
	$enabled = $sgs['enabledExtensions'] ?? array();
	if ( ! is_array( $enabled ) || ! in_array( 'hover', $enabled, true ) ) {
		return $all_off;
	}

	// Condition 1 — the block's own declaration.
	$declared = $sgs['hoverDefaults'] ?? null;
	if ( ! is_array( $declared ) ) {
		return $all_off;
	}

	$excluded = resolve_hover_excluded_controls( $block_name );

	// ONE control (Bean's ruling, 2026-09-24): a block that draws the automatic shadow
	// lift (declares `shadowLiftOnHover`, the Shadow panel's own switch) must NEVER also
	// get a non-empty `sgsHoverShadow` DEFAULT from `hoverDefaults.shadow` — that would
	// silently pre-select a preset on every fresh instance before the operator ever opens
	// either panel, contradicting "Automatic (matching lift)" being the real default.
	// Found live on sgs/info-box and sgs/team-member, both of which declare
	// `hoverDefaults.shadow: 'soft'` AND `shadowLiftOnHover` in the SAME block.json — every
	// new instance was silently overriding the automatic lift with a hardcoded 'soft'
	// before this fix. JS twin: resolveBlockDefaults() in src/blocks/extensions/hover-effects/resolve.js.
	$has_shadow_lift = is_array( $type->attributes ?? null ) && array_key_exists( 'shadowLiftOnHover', $type->attributes );

	return array(
		'scale_preset' => is_string( $declared['scalePreset'] ?? null ) ? $declared['scalePreset'] : '',
		'shadow'       => $has_shadow_lift ? '' : ( is_string( $declared['shadow'] ?? null ) ? $declared['shadow'] : '' ),
		// Gate A cleanup: a block that declares an imageZoom default but has no
		// image element to bind it to is the D805 shape (a client-visible
		// default with no effect) — see resolve_hover_excluded_controls() below.
		'image_zoom'   => in_array( 'imageZoom', $excluded, true ) ? false : (bool) ( $declared['imageZoom'] ?? false ),
		'focus_ring'   => (bool) ( $declared['focusRing'] ?? false ),
		// Panel units (px, %, ms); 0 = off / the block's own default. Mirrors resolve.js.
		'lift'          => absint( $declared['lift'] ?? 0 ),
		'zoom'          => absint( $declared['zoom'] ?? 0 ),
		'zoom_duration' => absint( $declared['zoomDuration'] ?? 0 ),
	);
}

/**
 * Resolve a block's declared hover-control exclusions.
 *
 * Gate A cleanup (D808 follow-up, 2026-08-27): pricing-table, google-reviews
 * and whatsapp-cta are root-hover blocks (D808) but have no image element for
 * the panel's "Zoom image on hover" / "Grayscale to colour" toggles to bind
 * to — cta-section is the only one of the four with a real (optional
 * background) image; see plugins/sgs-blocks/src/blocks/cta-section/style.css.
 * Leaving the toggles present-but-inert on the other three is exactly the
 * D805 failure shape (a control the client can flip that does nothing), so
 * they are suppressed structurally rather than left for the client to
 * discover are dead.
 *
 * Declared per-block via `supports.sgs.hoverExcludeControls` (a plain array
 * of control keys, e.g. `["imageZoom", "grayscale"]`), read identically by
 * the JS twin (resolveHoverExcludedControls() in
 * src/blocks/extensions/hover-effects/resolve.js). ONE declaration per block,
 * no named-block array in this shared file — the same discipline D805
 * already enforced for hoverDefaults/enabledExtensions.
 *
 * @param string $block_name Block name (e.g. 'sgs/pricing-table').
 * @return string[] Excluded control keys.
 */
function resolve_hover_excluded_controls( string $block_name ): array {
	if ( '' === $block_name ) {
		return array();
	}

	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	if ( ! $type instanceof \WP_Block_Type ) {
		return array();
	}

	$sgs = $type->supports['sgs'] ?? array();
	if ( ! is_array( $sgs ) ) {
		return array();
	}

	$excluded = $sgs['hoverExcludeControls'] ?? array();
	if ( ! is_array( $excluded ) ) {
		return array();
	}

	// NOT sanitize_key() — it lowercases, and every caller compares against the
	// literal camelCase control key ('imageZoom'/'grayscale'). sanitize_key()
	// would silently turn 'imageZoom' into 'imagezoom', breaking every
	// in_array( 'imageZoom', $excluded, true ) check downstream (caught live by
	// a standalone harness against this exact function before deploy — 'grayscale'
	// happened to survive because it has no capital letters to begin with, so
	// only imageZoom's suppression was silently broken). This mirrors
	// `enabledExtensions` immediately above, which is also compared unsanitised.
	return array_values( array_filter( $excluded, 'is_string' ) );
}
