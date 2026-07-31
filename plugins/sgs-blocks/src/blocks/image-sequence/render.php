<?php
/**
 * Server-side render for the SGS Image Sequence block.
 *
 * Spec 38 FR-38-9. Outputs TWO layers, always both present:
 *
 *   1. A real `<img>` poster frame — the fail-open surface (FR-38-2). With
 *      JS blocked, under reduced motion, or before the Tier G effect module
 *      finishes loading its first frame, this is the ONLY thing a visitor
 *      ever sees. It is never a placeholder box.
 *   2. A `<canvas data-sgs-fx="image-sequence">` layered on top, which
 *      `SGS_Motion_Registry::sniff_block()` (`render_block` priority 99)
 *      detects from this exact markup string to enqueue GSAP core +
 *      ScrollTrigger + `@sgs/fx-image-sequence` — no per-block view module
 *      is registered (mirrors `sgs/responsive-logo`'s DrawSVG wiring).
 *
 * No inline CSS property declarations (Spec 32): `aspectRatio` is a
 * per-instance value, so it is emitted into the block's OWN scoped `<style>`
 * tag rather than a `style="aspect-ratio:…"` attribute.
 *
 * Frame source config (resolution ladder + filename convention) is passed to
 * the runtime as a JSON blob in `data-sgs-image-sequence-frames` — the same
 * shape `scripts/image-sequence-prep.py` documents in its README. This is
 * block-private data, not part of the Spec 38 §11.2 `fx-*` grammar (which
 * covers cross-effect params like start/end/scrub, all still emitted here).
 *
 * @var array     $attributes Block attributes.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$poster_media = $attributes['posterMedia'] ?? null;

// Nothing to render without a poster — no half-built block, no empty canvas
// (FR-38-2's fail-open contract has nothing to fail open TO without one).
if ( empty( $poster_media['url'] ) ) {
	return;
}

$poster_url   = (string) $poster_media['url'];
$poster_id    = isset( $poster_media['id'] ) ? absint( $poster_media['id'] ) : 0;
$poster_alt   = (string) ( $attributes['posterAlt'] ?? '' );
$aspect_ratio = (string) ( $attributes['aspectRatio'] ?? '16 / 9' );

// Whitelist — this reaches a scoped <style> rule, so it is validated against
// known-good values rather than trusted as free text.
$allowed_ratios = array( '16 / 9', '21 / 9', '4 / 3', '1 / 1', '3 / 4', '9 / 16' );
if ( ! in_array( $aspect_ratio, $allowed_ratios, true ) ) {
	$aspect_ratio = '16 / 9';
}

$allowed_ext = array( 'jpg', 'jpeg', 'png', 'webp', 'avif' );

/**
 * Build one tier's frame config, or null when the operator has not run the
 * asset pipeline for it yet. `desktopFramesUrl`/`desktopFrameCount` etc. are
 * the block attributes the inspector's "Frame source" panel writes.
 *
 * @param string $url_attr   Attribute key holding the frames folder URL.
 * @param string $count_attr Attribute key holding the frame count.
 * @param string $pad_attr   Attribute key holding the zero-pad digit count.
 * @param string $ext_attr   Attribute key holding the file extension.
 * @return array{base:string,count:int,pad:int,ext:string}|null
 */
$sgs_frame_tier = static function ( string $url_attr, string $count_attr, string $pad_attr, string $ext_attr ) use ( $attributes, $allowed_ext ) {
	$url   = trim( (string) ( $attributes[ $url_attr ] ?? '' ) );
	$count = absint( $attributes[ $count_attr ] ?? 0 );

	if ( '' === $url || $count < 1 ) {
		return null;
	}

	$pad = absint( $attributes[ $pad_attr ] ?? 4 );
	$pad = $pad > 0 && $pad <= 8 ? $pad : 4;

	$ext = (string) ( $attributes[ $ext_attr ] ?? 'webp' );
	$ext = in_array( $ext, $allowed_ext, true ) ? $ext : 'webp';

	return array(
		'base'  => esc_url_raw( $url ),
		'count' => $count,
		'pad'   => $pad,
		'ext'   => $ext,
	);
};

$frames_config = array(
	'desktop' => $sgs_frame_tier( 'desktopFramesUrl', 'desktopFrameCount', 'desktopFramePad', 'desktopFrameExt' ),
	'tablet'  => $sgs_frame_tier( 'tabletFramesUrl', 'tabletFrameCount', 'tabletFramePad', 'tabletFrameExt' ),
	'mobile'  => $sgs_frame_tier( 'mobileFramesUrl', 'mobileFrameCount', 'mobileFramePad', 'mobileFrameExt' ),
);

$has_any_tier = array_filter( $frames_config );

// fx params — Spec 38 §11.2. Empty values are simply omitted; the runtime's
// resolveStart()/resolveScrub() fall back to their own module defaults, and
// an author-set value is never silently overridden (D417 pattern).
$fx_start = trim( (string) ( $attributes['fxStart'] ?? '' ) );
$fx_end   = trim( (string) ( $attributes['fxEnd'] ?? '' ) );
$fx_scrub = $attributes['fxScrub'] ?? 1;

$uid      = 'sgs-is-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid;

$scoped_css   = array();
$scoped_css[] = "{$root_sel}{aspect-ratio:" . $aspect_ratio . ';}';
$style_tag    = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';

$block_props = get_block_wrapper_attributes(
	array( 'class' => 'sgs-image-sequence ' . $uid )
);

$canvas_attrs = array(
	'class'       => 'sgs-image-sequence__canvas',
	'aria-hidden' => 'true',
);

// Only wire the Tier G effect when at least one tier's pipeline output is
// configured. Without it the block is a plain poster image — a legitimate,
// fully-rendered state for a fresh block, not a broken one, and the sniff
// registry never sees a data-sgs-fx marker, so zero GSAP bytes load for it.
if ( ! empty( $has_any_tier ) ) {
	$canvas_attrs['data-sgs-fx']                    = 'image-sequence';
	$canvas_attrs['data-sgs-image-sequence-frames'] = wp_json_encode( $frames_config );
	if ( '' !== $fx_start ) {
		$canvas_attrs['data-sgs-fx-start'] = $fx_start;
	}
	if ( '' !== $fx_end ) {
		$canvas_attrs['data-sgs-fx-end'] = $fx_end;
	}
	if ( is_numeric( $fx_scrub ) ) {
		$canvas_attrs['data-sgs-fx-scrub'] = (string) round( (float) $fx_scrub, 2 );
	}
}

$canvas_attr_html = array();
foreach ( $canvas_attrs as $key => $value ) {
	$canvas_attr_html[] = sprintf( '%s="%s"', esc_attr( $key ), esc_attr( $value ) );
}

printf(
	'<div %1$s>%2$s<div class="sgs-image-sequence__stage">',
	$block_props, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
	$style_tag // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-validated via whitelist + wp_strip_all_tags.
);

echo sgs_responsive_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes internally.
	$poster_id,
	$poster_url,
	$poster_alt,
	'large',
	array( 'class' => 'sgs-image-sequence__poster' )
);

printf(
	'<canvas %s></canvas>',
	implode( ' ', $canvas_attr_html ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attr already escaped above.
);

echo '</div></div>';
