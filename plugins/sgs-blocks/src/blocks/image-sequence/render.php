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
 * `aspectRatio` is a per-instance value, so it is emitted into the block's
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

$thumbnail_media = $attributes['thumbnail'] ?? null;

// Nothing to render without a thumbnail — no half-built block, no empty
// canvas (FR-38-2's fail-open contract has nothing to fail open TO without
// one).
if ( empty( $thumbnail_media['url'] ) ) {
	return;
}

$thumbnail_url        = (string) $thumbnail_media['url'];
$thumbnail_id         = isset( $thumbnail_media['id'] ) ? absint( $thumbnail_media['id'] ) : 0;
$thumbnail_alt        = (string) ( $attributes['thumbnailAlt'] ?? '' );
$thumbnail_decorative = ! empty( $attributes['thumbnailDecorative'] );
$aspect_ratio         = (string) ( $attributes['aspectRatio'] ?? '16 / 9' );

// Decorative fallback thumbnail (WCAG 2.1 AA 1.1.1). Block-level, not
// per-tier — the tablet/mobile thumbnails are art-directed crops of the
// SAME photo (2026-08-07 art-direction tiers), not different pictures, so
// one editorial choice covers all of them. Blanking the alt here (rather
// than only adding aria-hidden) matches the sgs/timeline pattern: an empty
// alt already tells assistive tech to skip the image; aria-hidden reinforces
// it for browsers/ATs that still expose an empty-alt <img> to the a11y tree.
if ( $thumbnail_decorative ) {
	$thumbnail_alt = '';
}

// Whitelist — this reaches a scoped <style> rule, so it is validated against
// known-good values rather than trusted as free text. This array is the
// ORIGINAL/canonical six-value ratio set (C19, 2026-08-27) — this block's
// own edit.js now imports the JS-side mirror of this exact list from
// `src/components/MediaSizingPanel.js`'s exported `RATIO_OPTIONS`, and
// card-grid/gallery/post-grid's edit.js files do the same. PHP cannot
// import a JS constant, so this array must be kept BYTE-IDENTICAL to
// `RATIO_OPTIONS`'s values by hand if the set ever changes.
$allowed_ratios = array( '16 / 9', '21 / 9', '4 / 3', '1 / 1', '3 / 4', '9 / 16' );
if ( ! in_array( $aspect_ratio, $allowed_ratios, true ) ) {
	$aspect_ratio = '16 / 9';
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

// fx params — Spec 38 §11.2. Empty values are simply omitted; the runtime's
// resolveStart()/resolveScrub() fall back to their own module defaults, and
// an author-set value is never silently overridden (D417 pattern).
$fx_start = trim( (string) ( $attributes['fxStart'] ?? '' ) );
$fx_end   = trim( (string) ( $attributes['fxEnd'] ?? '' ) );
$fx_scrub = $attributes['fxScrub'] ?? 1;
$fx_pin   = ! empty( $attributes['fxPin'] );

$uid      = 'sgs-is-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid;

$scoped_css   = array();
$scoped_css[] = "{$root_sel}{aspect-ratio:" . $aspect_ratio . ';}';

// Shared media-element atom layer (rule 37-media-no-handroll) — object-fit
// ONLY, no client control (see block.json's `_comment_mediaElements`: the
// canvas's own drawCover() always centre-crops every frame with zero
// configurability, so exposing a fit control here would let an operator set
// a value the canvas can never honour). `style()` returns '' with no
// `objectFit`/`objectFitTablet`/`objectFitMobile` attribute set (none is
// ever written — no edit.js control writes it), so nothing is appended to
// $scoped_css; the shared stylesheet's own `.sgs-media-el{object-fit:var(
// --sgs-media-object-fit,cover)}` default (assets/css/media-atoms/
// object-fit.css) supplies the exact same 'cover' resting behaviour the old
// local hardcode did — just sourced from the shared layer, not duplicated.
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_is_media_css = SGS_Media_Element::style( $attributes, '', 'sgs/image-sequence', $uid, array( 'object-fit' ) );
	if ( '' !== $sgs_is_media_css ) {
		$scoped_css[] = $sgs_is_media_css;
	}
}

// ART-DIRECTION TIERS (2026-08-07) — the fail-open <img> only. The canvas frame
// sequence already art-directs itself through its own per-tier pipelines
// (tierDesktop/tierTablet/tierMobile), so this closes the one surface that could
// not: the frame a visitor sees with JS blocked or under reduced motion.
//
// Tier attrs are OBJECT-typed to match `thumbnail`; a flat string would be
// silently coerced to the default by WP and drop the whole value.
//
// ⚠ This block builds $style_tag ONCE, here, and prints it inside the opening
// printf() further down — so the tier rules must be appended to $scoped_css
// BEFORE that string is assembled. Appending them next to the <img> echo (which
// runs after the printf) compiles fine and emits nothing.
$sgs_tier_thumbs = array();
foreach ( array( 'Tablet', 'Mobile' ) as $sgs_tier ) {
	$sgs_tier_media = $attributes[ 'thumbnail' . $sgs_tier ] ?? null;
	if ( empty( $sgs_tier_media['url'] ) ) {
		continue;
	}
	$sgs_tier_thumbs[ strtolower( $sgs_tier ) ] = array(
		'id'  => isset( $sgs_tier_media['id'] ) ? absint( $sgs_tier_media['id'] ) : 0,
		'url' => (string) $sgs_tier_media['url'],
	);
}

// `sgs-media-el` is the shared media-element atom layer's marker for the
// replaced element (SGS_Media_Element::CLASS_ELEMENT) — carried by the
// thumbnail <img>(s) AND the canvas below so both read the shared
// stylesheet's `.sgs-media-el{object-fit:var(--sgs-media-object-fit,cover)}`
// default rule (see the `$sgs_is_media_css` block above).
$thumb_class = 'sgs-image-sequence__thumbnail sgs-media-el';
if ( ! empty( $sgs_tier_thumbs ) ) {
	// ⛔ Build tier selectors from $root_sel — a BARE single-class token
	// ('.' . $uid, above), never a multi-member selector list: a descendant
	// appended to a list binds to its last member only.
	$sgs_tier_sel = static function ( $tier ) use ( $root_sel ) {
		return $root_sel . ' .sgs-image-sequence__thumbnail--' . $tier;
	};
	$tier_css     = '';
	if ( isset( $sgs_tier_thumbs['mobile'] ) ) {
		$tier_css .= '@media(max-width:767px){' . $sgs_tier_sel( 'desktop' ) . '{display:none}}';
		$tier_css .= '@media(min-width:768px){' . $sgs_tier_sel( 'mobile' ) . '{display:none}}';
	}
	if ( isset( $sgs_tier_thumbs['tablet'] ) ) {
		$tier_css .= '@media(min-width:768px) and (max-width:1023px){' . $sgs_tier_sel( 'desktop' ) . '{display:none}}';
		$tier_css .= '@media(max-width:767px){' . $sgs_tier_sel( 'tablet' ) . '{display:none}}';
		$tier_css .= '@media(min-width:1024px){' . $sgs_tier_sel( 'tablet' ) . '{display:none}}';
	}
	$scoped_css[] = $tier_css;
	$thumb_class .= ' sgs-image-sequence__thumbnail--desktop';
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
	// D435 Part 2 — pin is a first-class inspector toggle, not a composition
	// workaround. Only emitted when true; the runtime treats its absence as
	// "not pinned" (see fx-image-sequence.js).
	if ( $fx_pin ) {
		$canvas_attrs['data-sgs-fx-pin'] = 'true';
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

$thumb_attrs = array( 'class' => $thumb_class );
if ( $thumbnail_decorative ) {
	$thumb_attrs['aria-hidden'] = 'true';
}

echo sgs_responsive_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes internally.
	$thumbnail_id,
	$thumbnail_url,
	$thumbnail_alt,
	'large',
	$thumb_attrs
);

foreach ( $sgs_tier_thumbs as $sgs_tier_key => $sgs_tier_media ) {
	$sgs_tier_attrs = array( 'class' => 'sgs-image-sequence__thumbnail sgs-media-el sgs-image-sequence__thumbnail--' . $sgs_tier_key );
	if ( $thumbnail_decorative ) {
		$sgs_tier_attrs['aria-hidden'] = 'true';
	}
	echo sgs_responsive_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes internally.
		$sgs_tier_media['id'],
		$sgs_tier_media['url'],
		$thumbnail_alt,
		'large',
		$sgs_tier_attrs
	);
}

printf(
	'<canvas %s></canvas>',
	implode( ' ', $canvas_attr_html ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attr already escaped above.
);

echo '</div></div>';
