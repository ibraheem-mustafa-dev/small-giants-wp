<?php
/**
 * Server-side render for the SGS Image Sequence block.
 *
 * Spec 38 FR-38-9. Outputs TWO layers, always both present:
 *
 *   1. A real `<img>` thumbnail frame — the fail-open surface (FR-38-2). With
 *      JS blocked, under reduced motion, or before the Tier G effect module
 *      finishes loading its first frame, this is the ONLY thing a visitor
 *      ever sees. It is never a placeholder box.
 *   2. A `<canvas data-sgs-fx="image-sequence">` layered on top, which
 *      `SGS_Motion_Registry::sniff_block()` (`render_block` priority 99)
 *      detects from this exact markup string to enqueue GSAP core +
 *      ScrollTrigger + `@sgs/fx-image-sequence` — no per-block view module
 *      is registered (mirrors `sgs/responsive-logo`'s DrawSVG wiring).
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * `thumbnailRatio` is a per-device value, so it is emitted into the block's
 * OWN scoped `<style>` tag rather than a `style="aspect-ratio:…"` attribute.
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
require_once dirname( __DIR__, 3 ) . '/includes/media/media-values.php';

// The thumbnail is one media slot (`thumbnail`, Spec 49 §7): the renderer prints the picture for every device (the
// responsive `thumbnailSource` object carries the tablet and mobile files), with Fit from the slot's settings. The stage
// owns the aspect ratio, so the renderer is not given `thumbnailRatio`.
$thumbnail_slot  = array(
	'prefix'  => 'thumbnail',
	'kinds'   => array( 'image' ),
	'context' => 'content',
);
$thumbnail_attrs = $attributes;
unset( $thumbnail_attrs['thumbnailRatio'] );

// Nothing to render without a thumbnail: no half-built block, no empty canvas (FR-38-2's fail-open contract has
// nothing to fail open TO without one).
if ( ! class_exists( 'SGS_Media_Element' ) || array() === array_filter( (array) ( $attributes['thumbnailSource'] ?? array() ) ) ) {
	return;
}

$uid      = 'sgs-is-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid;

$thumbnail_out = SGS_Media_Element::render(
	$thumbnail_slot,
	$thumbnail_attrs,
	array(
		'uid'         => $uid . '-thumbnail',
		'block'       => 'sgs/image-sequence',
		'extra_class' => 'sgs-image-sequence__thumbnail',
		'in_editor'   => defined( 'REST_REQUEST' ) && REST_REQUEST,
	)
);
if ( '' === $thumbnail_out['html'] ) {
	return;
}

// The stage's ratio, per device. Natural is the thumbnail file's own shape; a ratio the renderer's grammar does not accept
// falls back to 16 / 9.
$sgs_is_natural = '16 / 9';
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_is_device ) {
	$sgs_is_entry = $attributes['thumbnailSource'][ $sgs_is_device ] ?? null;
	if ( is_array( $sgs_is_entry ) && ! empty( $sgs_is_entry['width'] ) && ! empty( $sgs_is_entry['height'] ) ) {
		$sgs_is_natural = absint( $sgs_is_entry['width'] ) . ' / ' . absint( $sgs_is_entry['height'] );
		break;
	}
}
$ratio_tiers = array();
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_is_device ) {
	$sgs_is_raw = is_array( $attributes['thumbnailRatio'] ?? null ) ? ( $attributes['thumbnailRatio'][ $sgs_is_device ] ?? null ) : null;
	if ( 'natural' === $sgs_is_raw ) {
		$sgs_is_raw = $sgs_is_natural;
	}
	$ratio_tiers[ $sgs_is_device ] = null === $sgs_is_raw ? null : ( '' !== sgs_media_ratio( $sgs_is_raw ) ? sgs_media_ratio( $sgs_is_raw ) : '16 / 9' );
}
if ( null === $ratio_tiers['desktop'] ) {
	$ratio_tiers['desktop'] = '16 / 9';
}

$allowed_ext = array( 'jpg', 'jpeg', 'png', 'webp', 'avif' );

// Hard cap on frames per tier (Step 16, Motion Wave D, Route B). Uncapped
// before this — an operator (or a pattern/clone bringing in a stale
// attribute value from before the cap existed) could set an arbitrary
// frame count. 200/tier is comfortably above the prep tool's own
// recommended 60-150 range (IMAGE-SEQUENCE-PREP-README.md Step 2) while
// still rejecting runaway values (e.g. 500) that would push a three-tier
// instance's page-weight well past the realistic ~8 MB ballpark. This is
// the ONE authoritative enforcement point: the block is dynamic
// (`save: () => null`), so every render surface — direct page view,
// pattern insertion, /sgs-clone output, the converter — executes THIS
// render.php; there is no static-markup path that bypasses it. Keep this
// value in sync with MAX_FRAME_COUNT in edit.js (editor-side warning only,
// not an enforcement point on its own).
$sgs_max_frame_count = 200;

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
$sgs_frame_tier = static function ( string $url_attr, string $count_attr, string $pad_attr, string $ext_attr ) use ( $attributes, $allowed_ext, $sgs_max_frame_count ) {
	$url   = trim( (string) ( $attributes[ $url_attr ] ?? '' ) );
	$count = absint( $attributes[ $count_attr ] ?? 0 );

	if ( '' === $url || $count < 1 ) {
		return null;
	}

	// Enforce the cap regardless of what the stored attribute says.
	$count = min( $count, $sgs_max_frame_count );

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

$scoped_css   = array();
$scoped_css[] = sgs_emit_responsive_css(
	$root_sel,
	array(
		array(
			'value' => $ratio_tiers,
			'css'   => 'aspect-ratio',
		),
	)
);
if ( '' !== $thumbnail_out['css'] ) {
	$scoped_css[] = $thumbnail_out['css'];
}

$style_tag = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';

$block_props = get_block_wrapper_attributes(
	array( 'class' => 'sgs-image-sequence ' . $uid )
);

$canvas_attrs = array(
	'class'       => 'sgs-image-sequence__canvas sgs-media-el',
	'aria-hidden' => 'true',
);

// Only wire the Tier G effect when at least one tier's pipeline output is
// configured. Without it the block is a plain thumbnail image — a legitimate,
// fully-rendered state for a fresh block, not a broken one, and the sniff
// registry never sees a data-sgs-fx marker, so zero GSAP bytes load for it.
// The scroll range, scrub smoothing and pin come from the block's sgsMotion
// image-sequence layer through the motion renderer, not from this block.
if ( ! empty( $has_any_tier ) ) {
	$canvas_attrs['data-sgs-fx']                    = 'image-sequence';
	$canvas_attrs['data-sgs-image-sequence-frames'] = wp_json_encode( $frames_config );
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

echo $thumbnail_out['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by SGS_Media_Element::render() with per-attribute escaping.

printf(
	'<canvas %s></canvas>',
	implode( ' ', $canvas_attr_html ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attr already escaped above.
);

echo '</div></div>';
