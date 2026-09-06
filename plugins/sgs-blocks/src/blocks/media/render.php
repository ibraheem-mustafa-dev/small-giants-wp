<?php
/**
 * Server-side render for the SGS Media block.
 *
 * Content media block — image or video. Styling attributes (objectFit, objectPosition, maxWidth, borderRadius, etc.) are applied on the frontend via a scoped `<style>` block.
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 *
 * mediaType = 'image' (default): image render path with imageUrl / imageId.
 * mediaType = 'video': <video> (internal WP-library or direct MP4) or
 *             <iframe> (YouTube / Vimeo embed) depending on the resolved URL.
 * mediaType = 'svg': inline sanitised SVG with optional CSS animation (pure CSS,
 *             no JavaScript required). svgContent is sanitised through an explicit
 *             wp_kses() allowlist — identical to the one used by SGS_Container_Wrapper
 *             for bgSvgContent — before output. No <script>, no event handlers,
 *             no <foreignObject>, no external href/xlink:href.
 *
 * Scoping: this block declares `supports.anchor` — the internal CSS-scope
 * token is therefore a CLASS (`.sgs-media-XXXXXXXX`), never an id, so it can
 * never collide with a user-set anchor id (Spec 31 §B3). The block wrapper's
 * `id` attribute is left entirely to WP core's native anchor handling
 * (`get_block_wrapper_attributes()` applies it automatically from
 * `$attributes['anchor']` when the operator sets one — this file never
 * writes an `id` itself).
 *
 * @since 1.1.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Extract shared styling attributes with safe defaults.
// ---------------------------------------------------------------------------
// Sizing (mediaSizing/height/width/maxWidth/maxHeight/aspectRatio), Shape
// and Border (radius/width/style/colour) are now owned entirely by the
// `box-shape` atom (Wave 5b, 2026-09-01) — its own custom-property CSS
// (`--sgs-media-*`, emitted below via $sgs_media_atom_css) replaces this
// block's old hand-rolled max-width/max-height/height responsive rules, the
// native `style.border.radius` base + `borderRadiusTablet`/`borderRadiusMobile`
// tier emission, and the native `style.dimensions.aspectRatio` support —
// all three would otherwise double-write the SAME CSS properties the atom
// now emits. See block.json's `_comment_mediaElements` for the full
// replacement rationale.
$allowed_object_fits = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
$object_fit_raw      = $attributes['objectFit'] ?? 'cover';
$object_fit          = in_array( $object_fit_raw, $allowed_object_fits, true ) ? $object_fit_raw : 'cover';
$object_position     = isset( $attributes['objectPosition'] ) ? (string) $attributes['objectPosition'] : 'center center';

// opacity / box-shadow are now owned entirely by the `opacity`/`shadow`
// atoms (Wave 5c, 2026-09-01) — their own custom-property CSS (emitted below
// via $sgs_media_atom_css) replaces the hand-rolled $opacity/$box_shadow*
// reads and the base+hover box-shadow rules this file used to build here.

$allowed_alignments = array( 'left', 'center', 'right' );
$alignment_raw      = $attributes['alignment'] ?? 'left';
$alignment          = in_array( $alignment_raw, $allowed_alignments, true ) ? $alignment_raw : 'left';

// `order` is a TIER OBJECT (Spec 35 pass 2) — ONE attr holding
// {desktop,tablet,mobile}. Read the object through the shared normaliser so a
// legacy/malformed value can't PHP-coerce to the literal string "Array".
$order_tiers      = sgs_responsive_normalise_object( $attributes['order'] ?? null );
$css_order        = isset( $order_tiers['desktop'] ) && '' !== $order_tiers['desktop'] && null !== $order_tiers['desktop'] ? intval( $order_tiers['desktop'] ) : null;
$css_order_tablet = isset( $order_tiers['tablet'] ) && '' !== $order_tiers['tablet'] && null !== $order_tiers['tablet'] ? intval( $order_tiers['tablet'] ) : null;
$css_order_mobile = isset( $order_tiers['mobile'] ) && '' !== $order_tiers['mobile'] && null !== $order_tiers['mobile'] ? intval( $order_tiers['mobile'] ) : null;

$caption                = isset( $attributes['caption'] ) ? (string) $attributes['caption'] : '';
$allowed_caption_tags   = array( 'figcaption', 'div' );
$caption_tag_raw        = $attributes['captionTag'] ?? 'figcaption';
$caption_tag            = in_array( $caption_tag_raw, $allowed_caption_tags, true ) ? $caption_tag_raw : 'figcaption';
$caption_colour         = isset( $attributes['captionColour'] ) ? (string) $attributes['captionColour'] : '';
$caption_colour_gradient = isset( $attributes['captionColourGradient'] ) ? (string) $attributes['captionColourGradient'] : '';
$caption_font_size      = isset( $attributes['captionFontSize'] ) && null !== $attributes['captionFontSize'] ? absint( $attributes['captionFontSize'] ) : 0;
$caption_font_size_unit = isset( $attributes['captionFontSizeUnit'] ) ? (string) $attributes['captionFontSizeUnit'] : 'px';

$link_url           = isset( $attributes['linkUrl'] ) ? (string) $attributes['linkUrl'] : '';
$link_opens_new_tab = ! empty( $attributes['linkOpensNewTab'] );
$link_rel           = isset( $attributes['linkRel'] ) ? (string) $attributes['linkRel'] : '';

// ---------------------------------------------------------------------------
// 2. Determine media type.
// Auto-detect from populated attrs when mediaType is missing (backwards-compat).
// ---------------------------------------------------------------------------
$media_type_raw = $attributes['mediaType'] ?? '';
if ( '' === $media_type_raw ) {
	// Backwards-compat: if a videoUrl is set and no imageUrl, treat as video.
	$has_video_url = ! empty( $attributes['videoUrl'] ) || ! empty( $attributes['videoId'] );
	$has_image_url = ! empty( $attributes['imageUrl'] ) || ! empty( $attributes['imageId'] );
	if ( $has_video_url && ! $has_image_url ) {
		$media_type_raw = 'video';
	} else {
		$media_type_raw = 'image';
	}
}
$media_type = in_array( $media_type_raw, array( 'image', 'video', 'svg' ), true ) ? $media_type_raw : 'image';

// ---------------------------------------------------------------------------
// 3. Helper: validate allowed CSS dimension units.
// ---------------------------------------------------------------------------
if ( ! function_exists( 'sgs_media_validate_unit' ) ) {
	/**
	 * Validate a CSS dimension unit against an allowed list.
	 *
	 * @param string $unit The raw unit string from block attributes.
	 * @return string A validated unit string, defaulting to 'px'.
	 */
	function sgs_media_validate_unit( string $unit ): string {
		$allowed = array( 'px', '%', 'em', 'rem', 'vw', 'vh', 'svw', 'svh', 'ch' );
		return in_array( $unit, $allowed, true ) ? $unit : 'px';
	}
}

if ( ! function_exists( 'sgs_media_resolve_tier_bool' ) ) {
	/**
	 * Resolve a boolean per-device playback attribute's tablet/mobile
	 * EFFECTIVE values, falling back upward when a tier's own override is
	 * unset (null): tablet inherits desktop, mobile inherits the resolved
	 * tablet value. Same fallback shape as the container block's responsive
	 * video-source swap (`src/blocks/container/view.js`).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $base_key   Desktop/base attribute key (e.g. 'videoAutoplay').
	 * @return array{desktop:bool,tablet:bool,mobile:bool} Effective per-tier values.
	 */
	function sgs_media_resolve_tier_bool( array $attributes, string $base_key ): array {
		$desktop = ! empty( $attributes[ $base_key ] );

		$tablet_raw = $attributes[ $base_key . 'Tablet' ] ?? null;
		$tablet     = null !== $tablet_raw ? (bool) $tablet_raw : $desktop;

		$mobile_raw = $attributes[ $base_key . 'Mobile' ] ?? null;
		$mobile     = null !== $mobile_raw ? (bool) $mobile_raw : $tablet;

		return array(
			'desktop' => $desktop,
			'tablet'  => $tablet,
			'mobile'  => $mobile,
		);
	}
}

if ( ! function_exists( 'sgs_media_tier_data_attrs' ) ) {
	/**
	 * Build the `data-{name}-tablet` / `data-{name}-mobile` override attribute
	 * fragment for one boolean per-device family — emitted ONLY when a tier's
	 * effective value differs from the tier immediately above it, so a block
	 * with no tier overrides renders byte-identical markup to before this
	 * feature existed (the desktop value is always the block's real HTML
	 * attribute/property, never a data-* — no-JS visitors get the correct
	 * desktop behaviour with zero script involvement).
	 *
	 * @param string $data_name Kebab-case data-attribute base (e.g. 'autoplay', 'plays-inline').
	 * @param array  $tiers     { desktop, tablet, mobile } from sgs_media_resolve_tier_bool().
	 * @return string HTML attribute fragment with a leading space, or ''.
	 */
	function sgs_media_tier_data_attrs( string $data_name, array $tiers ): string {
		$out = '';
		if ( $tiers['tablet'] !== $tiers['desktop'] ) {
			$out .= ' data-' . $data_name . '-tablet="' . ( $tiers['tablet'] ? '1' : '0' ) . '"';
		}
		if ( $tiers['mobile'] !== $tiers['tablet'] ) {
			$out .= ' data-' . $data_name . '-mobile="' . ( $tiers['mobile'] ? '1' : '0' ) . '"';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_css_length' ) ) {
	/**
	 * Normalise a dimensional value to a validated CSS length string.
	 *
	 * Accepts unit-embedded strings ("440px", "100%", "50vh"), bare numbers
	 * (back-compat — the legacy `*Unit` attr is appended, defaulting to px), and
	 * a `var(--…)` custom-property reference. Every non-var value is validated
	 * against the sgs_media_validate_unit() allowlist so no CSS injection passes.
	 *
	 * @param string $value         The raw dimension string from block attributes.
	 * @param string $unit_fallback Legacy unit to append when $value is a bare number.
	 * @return string A validated CSS length, or '' when the value is empty/invalid.
	 */
	function sgs_media_css_length( string $value, string $unit_fallback = 'px' ): string {
		$value = trim( $value );
		if ( '' === $value ) {
			return '';
		}
		// Bare number → append the matching legacy unit (validated).
		if ( is_numeric( $value ) ) {
			return $value . sgs_media_validate_unit( $unit_fallback );
		}
		// var(--token) or var(--token, fallback) — no braces/semicolons allowed.
		if ( preg_match( '/^var\(\s*--[a-zA-Z0-9-]+(?:\s*,\s*[^;{}()]+)?\)$/', $value ) ) {
			return $value;
		}
		// Unit-embedded length: numeric prefix + an allowed unit.
		if ( preg_match( '/^(-?\d*\.?\d+)([a-z%]+)$/i', $value, $mm ) ) {
			$allowed = array( 'px', '%', 'em', 'rem', 'vw', 'vh', 'svw', 'svh', 'ch' );
			$unit    = strtolower( $mm[2] );
			if ( in_array( $unit, $allowed, true ) ) {
				return $mm[1] . $unit;
			}
		}
		return '';
	}
}

// ---------------------------------------------------------------------------
// 4. Anchor / internal scope token.
//
// `id` is left ENTIRELY to WP core's native anchor handling (only present in
// $wrapper_attributes when the operator sets one via supports.anchor). The
// scope token used to build every scoped CSS selector below is a CLASS —
// deterministic from the attribute fingerprint so it survives fragment-cached
// re-renders (same attrs → same class on every request) without ever
// colliding with the anchor id (Spec 31 §B3).
// ---------------------------------------------------------------------------
$scope_class = 'sgs-media-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$scope_esc   = esc_attr( $scope_class );

// Targets the inner media element (img or video). The FIRST selector matches
// the NAKED <img> (D6 — where the scope class and element are the SAME node);
// the descendant forms match figure-mode img/video.
$id_sel  = '.' . $scope_esc . '.sgs-media__img, .' . $scope_esc . ' .sgs-media__img, .' . $scope_esc . ' .sgs-media__video';
// Targets the element carrying the scope class itself — the <figure> wrapper
// in figure-mode, or the <img> itself in naked-mode (same class either way).
$id_wrap = '.' . $scope_esc;

// ---------------------------------------------------------------------------
// 5. Build scoped CSS — base (non-responsive) declarations for the media
// element: object-fit, object-position, aspect-ratio, opacity, box-shadow,
// and the native border group (colour/width/style/radius). NONE of these are
// emitted inline any more (no-inline contract §A).
// ---------------------------------------------------------------------------
$media_base_decls = array();

// object-fit is OWNED BY THE ATOM LAYER (Wave 5a) and is deliberately not
// emitted here. This rule sat on $id_sel at (0,2,0) and therefore BEAT the
// shared `.sgs-media-el` rule at (0,1,0) — but only once a client had set a
// non-default value, which is exactly the case anyone testing the new control
// would try. Leaving it would have made the atom look broken.
// The default is unchanged: the atom stylesheet carries `cover` as its measured
// fallback, replacing style.css's old `:where( .sgs-media__img )` rule.

// object-position is OWNED BY THE ATOM LAYER (focal-point atom) and is
// deliberately not emitted here. Same as object-fit — the atom owns this property now.

// opacity and box-shadow (base + hover) are OWNED BY THE ATOM LAYER
// (`opacity`/`shadow` atoms, Wave 5c 2026-09-01) and are deliberately not
// emitted here — their own custom-property CSS is emitted below via
// $sgs_media_atom_css, applied to the shared `.sgs-media-el` marker rather
// than this file's own $id_sel.

$media_base_css = '';
if ( $media_base_decls ) {
	$media_base_css = $id_sel . '{' . implode( ';', $media_base_decls ) . '}';
}

// Border (width/style/colour/radius) and aspect-ratio are now emitted
// entirely by the `box-shape` atom below (`$sgs_media_atom_css`) via
// `--sgs-media-border-*`/`--sgs-media-aspect-ratio` custom properties
// applied to `.sgs-media-el` — the old native `style.border.radius` +
// `style.dimensions.aspectRatio` style-engine calls that used to live here
// are retired (Wave 5b, 2026-09-01; see block.json's `_comment_mediaElements`).

// ---------------------------------------------------------------------------
// 6. Wrapper/scope-level base declarations (alignment margin).
// ---------------------------------------------------------------------------
$wrap_base_decls = array();
if ( 'center' === $alignment ) {
	$wrap_base_decls[] = 'margin-left:auto;margin-right:auto';
} elseif ( 'right' === $alignment ) {
	$wrap_base_decls[] = 'margin-left:auto';
}
$wrap_base_css = '';
if ( $wrap_base_decls ) {
	$wrap_base_css = $id_wrap . '{' . implode( ';', $wrap_base_decls ) . '}';
}

// ---------------------------------------------------------------------------
// 7. Per-viewport responsive CSS (emitted as a scoped <style> tag).
// Breakpoints use the framework 767/1023 standard (D3): mobile
// @media(max-width:767px), tablet @media(max-width:1023px).
// ---------------------------------------------------------------------------

// max-width / max-height / height / aspect-ratio / border are now owned
// entirely by the `box-shape` atom's own custom-property CSS
// ($sgs_media_atom_css below) — the hand-rolled base/tablet/mobile rule
// arrays this block used to build here are retired (Wave 5b, 2026-09-01).
// Border-radius Tablet/Mobile tier emission (formerly via
// wp_style_engine_get_styles() on $border_radius_tablet_obj/
// $border_radius_mobile_obj) is retired the same way — see §7b below, now
// gone, and block.json's `_comment_mediaElements`.

// The media-element ATOM layer (Wave 5b). It contributes custom-property
// VALUES only — every rule lives in assets/css/media-element.css, loaded in
// both the canvas and the front end, so the editor and the page cannot drift.
// `atoms` lists only the CSS-EMITTING atoms declared in block.json's
// supports.sgs.mediaElements — media-type/source/meaning/video-behaviour/
// caption/link contribute no CSS (control-only atoms), so they are
// correctly absent here even though they are declared there for attribute
// injection. `opacity`/`shadow`/`media-padding` (Wave 5c, 2026-09-01) join
// the CSS-emitting set, replacing this file's old hand-rolled opacity/
// box-shadow declarations.
$sgs_media_atoms    = array( 'object-fit', 'focal-point', 'svg-presentation', 'motion', 'box-shape', 'overlay', 'opacity', 'shadow', 'media-padding' );
$sgs_media_atom_css = class_exists( 'SGS_Media_Element' )
	? SGS_Media_Element::style( $attributes, '', 'sgs/media', $scope_class, $sgs_media_atoms )
	: '';

$responsive_css  = $media_base_css . $wrap_base_css . $sgs_media_atom_css;

/**
 * Art-direction tier visibility CSS — ONE implementation for every media family
 * in this block (images §11, SVG §12b), so the two can never drift apart.
 *
 * Implements the CANONICAL cascade: a tier with no value of its own inherits
 * from the next WIDEST tier that has one — mobile -> tablet -> desktop. This
 * matches `sgs_resolve_tier()` (includes/helpers-responsive.php:685-694) and
 * Spec 35 D3/D5, which warn against a second inheritance mechanism.
 *
 * ⛔ The hand-rolled per-family rules this replaced got ONE case wrong: with a
 * TABLET tier set and MOBILE empty, they hid the tablet element below 768px and
 * left desktop visible — i.e. mobile fell back to DESKTOP, skipping the tablet
 * value it should have inherited. Measured against the canonical resolver, not
 * assumed. Visible band ownership is now computed, not enumerated by hand:
 *
 *   tiers set | <=767px | 768-1023px | >=1024px
 *   none      | desktop | desktop    | desktop
 *   mobile    | mobile  | desktop    | desktop
 *   tablet    | TABLET  | tablet     | desktop
 *   both      | mobile  | tablet     | desktop
 *
 * ⛔ Each hide rule is emitted SEPARATELY rather than comma-joined. A descendant
 * appended to a multi-member selector list binds to the LAST member only — the
 * bug that once hid every image at every width in this very file.
 *
 * ⛔ The hide selector is COMPOUND (`.base.base--tier`), not just the modifier.
 * `style.css` sets `display:block` on both `.wp-block-sgs-media .sgs-media__img`
 * and `.sgs-media__svg` at specificity (0,2,0); a bare `.scope .base--tier` rule
 * is ALSO (0,2,0), so which one won would be decided purely by source order —
 * and this block's CSS is LIFTED into uploads/sgs-css/, where enqueue order is
 * not ours to guarantee. The compound form is (0,3,0) and wins outright.
 *
 * @param string   $modifier_base BEM base for the tier elements, e.g. 'sgs-media__img'.
 * @param string[] $tiers_present Tier keys that actually rendered ('tablet'/'mobile').
 * @return string CSS, or '' when no tier exists (single element, always visible).
 */
$sgs_tier_visibility_css = static function ( $modifier_base, array $tiers_present ) use ( $id_wrap ) {
	if ( empty( $tiers_present ) ) {
		return '';
	}
	$has = static function ( $t ) use ( $tiers_present ) {
		return in_array( $t, $tiers_present, true );
	};
	// Which element OWNS each width band, per the canonical upward cascade.
	$owner = array(
		'mobile'  => $has( 'mobile' ) ? 'mobile' : ( $has( 'tablet' ) ? 'tablet' : 'desktop' ),
		'tablet'  => $has( 'tablet' ) ? 'tablet' : 'desktop',
		'desktop' => 'desktop',
	);
	$queries  = array(
		'mobile'  => '@media(max-width:767px)',
		'tablet'  => '@media(min-width:768px) and (max-width:1023px)',
		'desktop' => '@media(min-width:1024px)',
	);
	$rendered = array_merge( array( 'desktop' ), $tiers_present );
	$css      = '';
	foreach ( $queries as $band => $query ) {
		foreach ( $rendered as $element ) {
			if ( $element === $owner[ $band ] ) {
				continue;
			}
			// Built from $id_wrap (the BARE scope token), never a selector LIST,
			// and COMPOUND on the element so it outranks style.css's display rule.
			$css .= $query . '{' . $id_wrap . ' .' . $modifier_base . '.' . $modifier_base . '--' . $element . '{display:none}}';
		}
	}
	return $css;
};

// max-width/max-height/height (all tiers) and border-radius Tablet/Mobile
// are emitted by the `box-shape` atom (`$sgs_media_atom_css` above, folded
// into `$responsive_css` at its assembly point) — the hand-rolled rule
// blocks that used to sit here are retired (Wave 5b, 2026-09-01).

// order — base + tablet + mobile on the SAME wrapper/scope selector (Pattern A).
if ( null !== $css_order ) {
	$responsive_css .= $id_wrap . '{order:' . intval( $css_order ) . ';}';
}
if ( null !== $css_order_tablet ) {
	$responsive_css .= '@media(max-width:1023px){' . $id_wrap . '{order:' . intval( $css_order_tablet ) . ';}}';
}
if ( null !== $css_order_mobile ) {
	$responsive_css .= '@media(max-width:767px){' . $id_wrap . '{order:' . intval( $css_order_mobile ) . ';}}';
}

// ---------------------------------------------------------------------------
// 8. Caption colour/font-size — scoped CSS, base only (no tiers), targeting
// the caption element nested inside the scoped wrapper.
// ---------------------------------------------------------------------------
$caption_decls = array();
$caption_sel   = $id_wrap . ' .sgs-media__caption';
// D636 gap-closure — captionColour gains a gradient-capable paint path
// (sibling attribute, matches sgs/counter's labelColour/labelColourGradient).
// sgs_text_colour_decl() picks flat colour vs background-clip:text
// automatically from a single resolved value; the fallback rule is the
// mandatory companion (self-no-ops on a flat colour).
$caption_colour_effective = sgs_resolve_text_colour_or_gradient( $caption_colour, $caption_colour_gradient );
if ( '' !== $caption_colour_effective ) {
	$caption_colour_decl = sgs_text_colour_decl( $caption_colour_effective );
	if ( '' !== $caption_colour_decl ) {
		$caption_decls[] = $caption_colour_decl;
	}
}
if ( $caption_font_size > 0 ) {
	$caption_decls[] = 'font-size:' . $caption_font_size . sgs_media_validate_unit( $caption_font_size_unit );
}
if ( $caption_decls ) {
	$responsive_css .= $caption_sel . '{' . implode( ';', $caption_decls ) . '}';
}
$responsive_css .= sgs_text_colour_gradient_fallback_rule( $caption_sel, $caption_colour_effective );

// ---------------------------------------------------------------------------
// 9. Build caption element (no inline style attr — see step 8 above).
// The `caption` atom is registered for image/video only (`registry.js`
// `caption.types`) — svg is deliberately excluded there, and the editor
// hides the Caption control once mediaType is svg. Media-type switching is
// non-destructive (the stored value is preserved, not cleared), so gate the
// FRONTEND render on the current media type too: stop painting a stale
// caption under an svg without deleting the attribute the operator may
// switch back to.
// ---------------------------------------------------------------------------
$caption_html = '';
if ( '' !== $caption && in_array( $media_type, array( 'image', 'video' ), true ) ) {
	$caption_tag_escaped = tag_escape( $caption_tag );
	$caption_html        = sprintf(
		'<%1$s class="sgs-media__caption">%2$s</%1$s>',
		$caption_tag_escaped,
		wp_kses_post( $caption )
	);
}

// ---------------------------------------------------------------------------
// 10. Build link wrapper parts (image mode only; video has own controls).
// ---------------------------------------------------------------------------
$link_open  = '';
$link_close = '';
if ( 'image' === $media_type && '' !== $link_url ) {
	$link_rel_attr = '';
	if ( $link_opens_new_tab ) {
		$rel_values    = array_filter(
			array_merge(
				array( 'noopener' ),
				$link_rel ? array( sanitize_text_field( $link_rel ) ) : array()
			)
		);
		$link_rel_attr = ' rel="' . esc_attr( implode( ' ', array_unique( $rel_values ) ) ) . '"';
	} elseif ( '' !== $link_rel ) {
		$link_rel_attr = ' rel="' . esc_attr( sanitize_text_field( $link_rel ) ) . '"';
	}

	$new_tab_attrs = $link_opens_new_tab ? ' target="_blank"' : '';
	$link_open     = '<a href="' . esc_url( $link_url ) . '"' . $new_tab_attrs . $link_rel_attr . ' class="sgs-media__link">';
	$link_close    = '</a>';
}

// ---------------------------------------------------------------------------
// 11. IMAGE RENDER PATH.
// ---------------------------------------------------------------------------
$image_html = '';
// WCAG 2.1 AA 1.1.1 (Non-text Content) — declared here (not just inside the
// `'image' === $media_type` branch below) so the naked-mode re-render path
// further down the file (§14) can read it without a static-analysis
// "possibly undefined" warning; naked mode only fires when media_type is
// 'image', so this is always populated by the time that branch runs.
$image_is_decorative = false;
if ( 'image' === $media_type ) {
	$image_id     = isset( $attributes['imageId'] ) ? absint( $attributes['imageId'] ) : null;
	$image_url    = isset( $attributes['imageUrl'] ) ? (string) $attributes['imageUrl'] : '';
	$image_alt    = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';
	$image_width  = isset( $attributes['imageWidth'] ) ? absint( $attributes['imageWidth'] ) : 0;
	$image_height = isset( $attributes['imageHeight'] ) ? absint( $attributes['imageHeight'] ) : 0;
	// WCAG 2.1 AA 1.1.1 (Non-text Content) — a decorative image MUST be hidden
	// from assistive tech via both empty alt AND aria-hidden, not alt="" alone
	// (some AT/browser combinations still expose an empty-alt image without
	// aria-hidden). Spec 35 T3.4.
	$image_is_decorative = ! empty( $attributes['imageDecorative'] );
	if ( $image_is_decorative ) {
		$image_alt = '';
	}

	// Resolve final image URL: imageId wins; fall back to imageUrl.
	$resolved_url = '';
	$resolved_id  = 0;

	if ( $image_id ) {
		$src_result = wp_get_attachment_image_src( $image_id, 'full' );
		if ( $src_result ) {
			$resolved_url = $src_result[0];
			$resolved_id  = $image_id;
			if ( ! $image_width && isset( $src_result[1] ) ) {
				$image_width = absint( $src_result[1] );
			}
			if ( ! $image_height && isset( $src_result[2] ) ) {
				$image_height = absint( $src_result[2] );
			}
		}
	}

	if ( '' === $resolved_url && '' !== $image_url ) {
		$resolved_url = $image_url;
	}

	if ( '' === $resolved_url ) {
		echo '<!-- sgs/media: no image set -->';
		return;
	}

	// Build srcset / sizes from the media library when imageId is available.
	$img_srcset = '';
	$img_sizes  = '';
	if ( $resolved_id ) {
		$srcset_value = wp_get_attachment_image_srcset( $resolved_id, 'full' );
		$sizes_value  = wp_get_attachment_image_sizes( $resolved_id, 'full' );
		if ( $srcset_value ) {
			$img_srcset = ' srcset="' . esc_attr( $srcset_value ) . '"';
		}
		if ( $sizes_value ) {
			$img_sizes = ' sizes="' . esc_attr( $sizes_value ) . '"';
		}
	}

	$img_width_part  = $image_width ? ' width="' . esc_attr( $image_width ) . '"' : '';
	$img_height_part = $image_height ? ' height="' . esc_attr( $image_height ) . '"' : '';
	$img_aria_hidden = $image_is_decorative ? ' aria-hidden="true"' : '';

	// ART-DIRECTION TIERS (2026-08-07). Same shape as sgs/hero's split-image trio and
	// the same ID-wins-URL-falls-back pairing as sgs/responsive-logo (D496), so ONE
	// routing rule covers a nested composite element (hero) and a standalone block
	// (this) rather than two per-block special cases.
	//
	// Emitted as sibling <img>s carrying BEM tier modifiers, toggled by breakpoint —
	// deliberately matching hero rather than <picture>/<source>, because the draft
	// vocabulary the cloning pipeline reads IS the BEM modifier. One convention on
	// both ends means the clone round-trips.
	//
	// Device-tier breakpoints are the SGS standard 768/1024. Each tier's rules are
	// emitted independently, so a tier left empty simply falls back to the base image
	// at that width — degrade to MORE content, never less.
	$tier_imgs = array();
	foreach ( array( 'Tablet', 'Mobile' ) as $sgs_tier ) {
		$tier_id  = isset( $attributes[ 'imageId' . $sgs_tier ] ) ? absint( $attributes[ 'imageId' . $sgs_tier ] ) : 0;
		$tier_url = isset( $attributes[ 'imageUrl' . $sgs_tier ] ) ? (string) $attributes[ 'imageUrl' . $sgs_tier ] : '';
		if ( $tier_id ) {
			$tier_src = wp_get_attachment_image_src( $tier_id, 'full' );
			if ( $tier_src ) {
				$tier_url = $tier_src[0];
			}
		}
		if ( '' === $tier_url ) {
			continue;
		}
		$tier_imgs[ strtolower( $sgs_tier ) ] = $tier_url;
	}

	// `sgs-media-el` is the shared atom layer's marker for the REPLACED element.
	// It carries no appearance of its own — it is what the one shared stylesheet
	// keys on, and it does nothing until an atom sets a custom property.
	// ⛔ Never on the SVG wrapper: object-fit and object-position are
	// replaced-element properties and do nothing on a <div>, so putting the
	// marker there would claim a capability that cannot work.
	$base_class = 'sgs-media__img sgs-media-el';
	if ( ! empty( $tier_imgs ) ) {
		$base_class .= ' sgs-media__img--desktop';
	}

	foreach ( $tier_imgs as $tier_key => $tier_url ) {
		$image_html .= sprintf(
			'<img src="%s" alt="%s"%s class="sgs-media__img sgs-media-el sgs-media__img--%s" loading="lazy" decoding="async" />',
			esc_url( $tier_url ),
			esc_attr( $image_alt ),
			$img_aria_hidden,
			esc_attr( $tier_key )
		);
	}
	// Tier visibility via the SHARED cascade helper (§8) — the same one the SVG
	// tiers use, so the two families cannot drift apart. It builds every selector
	// from $id_wrap (the BARE scope token), never from $id_sel: $id_sel is a
	// three-member selector LIST (:252) and a descendant appended to a list binds
	// to the LAST member ONLY — which once left an unqualified
	// `.scope .sgs-media__img{display:none}` and hid EVERY image at EVERY width
	// (measured live: 3 imgs in the DOM, 0 visible, at all three breakpoints).
	//
	// It also fixes a cascade bug these hand-rolled rules carried: with a TABLET
	// tier set and MOBILE empty, mobile fell back to DESKTOP instead of inheriting
	// the TABLET value that `sgs_resolve_tier()` resolves to.
	$responsive_css .= $sgs_tier_visibility_css( 'sgs-media__img', array_keys( $tier_imgs ) );

	$image_html .= sprintf(
		'<img src="%s" alt="%s"%s%s%s%s%s class="%s" loading="lazy" decoding="async" />',
		esc_url( $resolved_url ),
		esc_attr( $image_alt ),
		$img_width_part,
		$img_height_part,
		$img_srcset,
		$img_sizes,
		$img_aria_hidden,
		esc_attr( $base_class )
	);
}

// ---------------------------------------------------------------------------
// 12. VIDEO RENDER PATH.
// ---------------------------------------------------------------------------
$video_html = '';
if ( 'video' === $media_type ) {
	$video_url      = isset( $attributes['videoUrl'] ) ? (string) $attributes['videoUrl'] : '';
	$video_source   = isset( $attributes['videoSource'] ) ? (string) $attributes['videoSource'] : 'external';
	$video_id       = isset( $attributes['videoId'] ) ? absint( $attributes['videoId'] ) : 0;
	$video_mime     = isset( $attributes['videoMimeType'] ) ? (string) $attributes['videoMimeType'] : '';
	$thumbnail      = isset( $attributes['thumbnail'] ) ? (string) $attributes['thumbnail'] : '';
	$thumbnail_id   = isset( $attributes['thumbnailId'] ) ? absint( $attributes['thumbnailId'] ) : 0;
	// Per-device playback-behaviour tiers (D-pending). Desktop stays the real
	// HTML attribute/property (progressive enhancement — correct with JS
	// disabled); tablet/mobile overrides are carried as data-* below and
	// applied by view.js only for the direct-file <video> path (a YouTube/
	// Vimeo <iframe> embed's autoplay/loop/mute/controls are URL query
	// params baked in once at render — reconstructing them per-tier would
	// force an iframe reload on every resize, which is worse than the fixed
	// desktop behaviour it would replace, so tiers are deliberately inert for
	// the embed paths below and only wired for the direct-file branch).
	// Autoplay/muted/playsinline are resolved TOGETHER, not independently —
	// `sgs_media_atom_video_behaviour_requires()` (video-behaviour atom,
	// includes/media/atoms/video-behaviour.php) enforces the registry's
	// `VideoAutoplay: [ 'VideoMuted', 'VideoPlaysInline' ]` coupling at every
	// device tier: a browser refuses to autoplay an unmuted video, and iOS
	// needs playsinline or the video takes over the screen. Building these
	// three flags independently (the old shape) served no-JS visitors markup
	// the browser cannot play, silently "fixed" only client-side by view.js.
	$video_behaviour = sgs_media_atom_video_behaviour_requires( $attributes, '' );
	$autoplay_tiers  = $video_behaviour['autoplay'];
	$muted_tiers     = $video_behaviour['muted'];
	$inline_tiers    = $video_behaviour['plays_inline'];
	$loop_tiers      = sgs_media_resolve_tier_bool( $attributes, 'videoLoop' );
	$controls_tiers  = sgs_media_resolve_tier_bool( $attributes, 'videoControls' );
	$lazy_tiers      = sgs_media_resolve_tier_bool( $attributes, 'videoLazyLoad' );

	$video_autoplay = $autoplay_tiers['desktop'];
	$video_loop     = $loop_tiers['desktop'];
	$video_muted    = $muted_tiers['desktop'];
	$video_controls = $controls_tiers['desktop'];
	$video_inline   = $inline_tiers['desktop'];
	$video_lazy     = $lazy_tiers['desktop'];

	// Resolve poster image URL: thumbnailId wins; fall back to thumbnail.
	$poster_url = '';
	if ( $thumbnail_id ) {
		$poster_src = wp_get_attachment_image_url( $thumbnail_id, 'full' );
		if ( $poster_src ) {
			$poster_url = $poster_src;
		}
	}
	if ( '' === $poster_url && '' !== $thumbnail ) {
		$poster_url = $thumbnail;
	}

	// Resolve internal video source from WP media library.
	$resolved_video_url  = $video_url;
	$resolved_video_mime = $video_mime;
	if ( 'internal' === $video_source && $video_id ) {
		$attachment_url = wp_get_attachment_url( $video_id );
		if ( $attachment_url ) {
			$resolved_video_url = $attachment_url;
		}
		$attachment_mime = get_post_mime_type( $video_id );
		if ( $attachment_mime && str_starts_with( $attachment_mime, 'video/' ) ) {
			$resolved_video_mime = $attachment_mime;
		}
	}

	if ( '' === $resolved_video_url ) {
		echo '<!-- sgs/media: no video set -->';
		return;
	}

	// Detect embed source: YouTube, Vimeo, or direct video file.
	$is_youtube = (bool) preg_match( '/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{11})/', $resolved_video_url, $yt_matches );
	$is_vimeo   = (bool) preg_match( '/(?:vimeo\.com\/)(\d+)/', $resolved_video_url, $vm_matches );

	// -----------------------------------------------------------------------
	// VIDEO-SOURCE ART-DIRECTION TIERS (2026-08-07, Bean-decided).
	//
	// Images tier by rendering siblings and letting CSS hide all but one. A
	// video CANNOT: three <video> elements each begin fetching and three embeds
	// each load a player. So the source is swapped by view.js, reusing
	// sgs/hero's established data-src-desktop/tablet/mobile contract (same
	// upward fallback: mobile → tablet → desktop).
	//
	// The DESKTOP source is still rendered as real markup below, so a visitor
	// with JS disabled gets a working video rather than an empty box.
	//
	// Each tier resolves through the SAME closure as the desktop source, so the
	// two cannot drift apart, and each tier's embed URL is built from THAT
	// tier's own playback flags.
	// -----------------------------------------------------------------------

	/**
	 * Resolve one tier's raw source attrs to a final, playable spec.
	 *
	 * @param string $raw_url    Raw URL attribute for this tier.
	 * @param int    $attach_id  Attachment ID (0 when none/external).
	 * @param bool   $autoplay   This tier's resolved autoplay flag.
	 * @param bool   $loop       This tier's resolved loop flag.
	 * @param bool   $controls   This tier's resolved controls flag.
	 * @param bool   $muted      This tier's resolved muted flag.
	 * @return array{kind:string,src:string,type:string}|null Null when this tier sets no source.
	 */
	$sgs_resolve_video_spec = static function ( string $raw_url, int $attach_id, bool $autoplay, bool $loop, bool $controls, bool $muted ) use ( $video_source ) {
		$url = $raw_url;
		if ( 'internal' === $video_source && $attach_id ) {
			$attach_url = wp_get_attachment_url( $attach_id );
			if ( $attach_url ) {
				$url = $attach_url;
			}
		}
		if ( '' === $url ) {
			return null;
		}

		if ( preg_match( '/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{11})/', $url, $yt ) ) {
			$embed = 'https://www.youtube-nocookie.com/embed/' . $yt[1];
			$query = array();
			if ( $autoplay ) {
				$query['autoplay'] = '1';
			}
			if ( $loop ) {
				$query['loop']     = '1';
				$query['playlist'] = $yt[1];
			}
			if ( ! $controls ) {
				$query['controls'] = '0';
			}
			if ( $muted ) {
				$query['mute'] = '1';
			}
			return array(
				'kind' => 'youtube',
				'src'  => $query ? $embed . '?' . http_build_query( $query ) : $embed,
				'type' => '',
			);
		}

		if ( preg_match( '/(?:vimeo\.com\/)(\d+)/', $url, $vm ) ) {
			$embed = 'https://player.vimeo.com/video/' . $vm[1];
			$query = array();
			if ( $autoplay ) {
				$query['autoplay'] = '1';
			}
			if ( $loop ) {
				$query['loop'] = '1';
			}
			if ( ! $controls ) {
				$query['controls'] = '0';
			}
			if ( $muted ) {
				$query['muted'] = '1';
			}
			return array(
				'kind' => 'vimeo',
				'src'  => $query ? $embed . '?' . http_build_query( $query ) : $embed,
				'type' => '',
			);
		}

		$ext = strtolower( (string) pathinfo( (string) wp_parse_url( $url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
		return array(
			'kind' => 'file',
			'src'  => $url,
			'type' => match ( $ext ) {
				'mp4'   => 'video/mp4',
				'webm'  => 'video/webm',
				'ogg'   => 'video/ogg',
				'ogv'   => 'video/ogg',
				'mov'   => 'video/quicktime',
				default => 'video/mp4',
			},
		);
	};

	$sgs_video_tier_specs = array();
	foreach ( array( 'Tablet', 'Mobile' ) as $sgs_v_tier ) {
		$tier_key      = strtolower( $sgs_v_tier );
		$tier_raw_url  = isset( $attributes[ 'videoUrl' . $sgs_v_tier ] ) ? (string) $attributes[ 'videoUrl' . $sgs_v_tier ] : '';
		$tier_attach   = isset( $attributes[ 'videoId' . $sgs_v_tier ] ) ? absint( $attributes[ 'videoId' . $sgs_v_tier ] ) : 0;
		$tier_spec     = $sgs_resolve_video_spec(
			$tier_raw_url,
			$tier_attach,
			$autoplay_tiers[ $tier_key ],
			$loop_tiers[ $tier_key ],
			$controls_tiers[ $tier_key ],
			$muted_tiers[ $tier_key ]
		);
		if ( null === $tier_spec ) {
			continue;
		}
		$sgs_video_tier_specs[ $tier_key ] = $tier_spec;
	}

	// Per-tier POSTER. Cheap and independent of the source — a tier may override
	// only the still frame and keep the desktop clip.
	$sgs_poster_tiers = array();
	foreach ( array( 'Tablet', 'Mobile' ) as $sgs_v_tier ) {
		$tier_poster    = isset( $attributes[ 'thumbnail' . $sgs_v_tier ] ) ? (string) $attributes[ 'thumbnail' . $sgs_v_tier ] : '';
		$tier_poster_id = isset( $attributes[ 'thumbnailId' . $sgs_v_tier ] ) ? absint( $attributes[ 'thumbnailId' . $sgs_v_tier ] ) : 0;
		if ( $tier_poster_id ) {
			$tier_poster_src = wp_get_attachment_image_url( $tier_poster_id, 'full' );
			if ( $tier_poster_src ) {
				$tier_poster = $tier_poster_src;
			}
		}
		if ( '' === $tier_poster ) {
			continue;
		}
		$sgs_poster_tiers[ strtolower( $sgs_v_tier ) ] = $tier_poster;
	}

	/**
	 * Build the data-* attribute string carrying every tier's resolved spec.
	 * Emitted ONLY for tiers that actually set something, so a block with no
	 * tier overrides renders byte-identically to before this feature.
	 *
	 * The DESKTOP spec is always emitted when any tier exists — view.js needs
	 * something to fall back UP to when returning to a wide viewport.
	 *
	 * The desktop kind/src are PARAMETERS, not captured: each branch below
	 * builds its own embed URL after this point, so a `use` here would close
	 * over a value that does not exist yet.
	 *
	 * @param string $desktop_kind 'youtube' | 'vimeo' | 'file'.
	 * @param string $desktop_src  Final desktop URL (embed URL, or file URL).
	 * @return string Attribute fragment, leading space included, or ''.
	 */
	$sgs_video_tier_attrs = static function ( string $desktop_kind, string $desktop_src ) use ( $sgs_video_tier_specs, $sgs_poster_tiers, $resolved_video_mime, $poster_url ) {
		if ( empty( $sgs_video_tier_specs ) && empty( $sgs_poster_tiers ) ) {
			return '';
		}

		$out  = ' data-src-desktop="' . esc_url( $desktop_src ) . '"';
		$out .= ' data-src-kind-desktop="' . esc_attr( $desktop_kind ) . '"';
		if ( 'file' === $desktop_kind ) {
			$out .= ' data-src-type-desktop="' . esc_attr( $resolved_video_mime ) . '"';
		}
		if ( '' !== $poster_url ) {
			$out .= ' data-poster-desktop="' . esc_url( $poster_url ) . '"';
		}
		foreach ( $sgs_video_tier_specs as $tier_key => $spec ) {
			$out .= ' data-src-' . $tier_key . '="' . esc_url( $spec['src'] ) . '"';
			$out .= ' data-src-kind-' . $tier_key . '="' . esc_attr( $spec['kind'] ) . '"';
			if ( 'file' === $spec['kind'] ) {
				$out .= ' data-src-type-' . $tier_key . '="' . esc_attr( $spec['type'] ) . '"';
			}
		}
		foreach ( $sgs_poster_tiers as $tier_key => $tier_poster ) {
			$out .= ' data-poster-' . $tier_key . '="' . esc_url( $tier_poster ) . '"';
		}
		return $out;
	};

	if ( $is_youtube ) {
		// Convert any YouTube watch URL to embed URL.
		$video_id_yt = $yt_matches[1];
		$embed_url   = 'https://www.youtube-nocookie.com/embed/' . $video_id_yt;
		$embed_query = array();
		if ( $video_autoplay ) {
			$embed_query['autoplay'] = '1';
		}
		if ( $video_loop ) {
			$embed_query['loop']     = '1';
			$embed_query['playlist'] = $video_id_yt;
		}
		if ( ! $video_controls ) {
			$embed_query['controls'] = '0';
		}
		if ( $video_muted ) {
			$embed_query['mute'] = '1';
		}
		if ( $embed_query ) {
			$embed_url .= '?' . http_build_query( $embed_query );
		}
		$poster_attr  = '' !== $poster_url ? ' data-poster="' . esc_url( $poster_url ) . '"' : '';
		$loading_attr = $video_lazy ? ' loading="lazy"' : '';
		$video_html   = sprintf(
			'<iframe class="sgs-media__video" src="%s" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen%s%s%s></iframe>',
			esc_url( $embed_url ),
			$poster_attr,
			$loading_attr,
			$sgs_video_tier_attrs( 'youtube', $embed_url ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value inside is passed through esc_url()/esc_attr() by the closure.
		);

	} elseif ( $is_vimeo ) {
		// Convert Vimeo watch URL to embed URL.
		$video_id_vm = $vm_matches[1];
		$embed_url   = 'https://player.vimeo.com/video/' . $video_id_vm;
		$embed_query = array();
		if ( $video_autoplay ) {
			$embed_query['autoplay'] = '1';
		}
		if ( $video_loop ) {
			$embed_query['loop'] = '1';
		}
		if ( ! $video_controls ) {
			$embed_query['controls'] = '0';
		}
		if ( $video_muted ) {
			$embed_query['muted'] = '1';
		}
		if ( $embed_query ) {
			$embed_url .= '?' . http_build_query( $embed_query );
		}
		$poster_attr  = '' !== $poster_url ? ' data-poster="' . esc_url( $poster_url ) . '"' : '';
		$loading_attr = $video_lazy ? ' loading="lazy"' : '';
		$video_html   = sprintf(
			'<iframe class="sgs-media__video" src="%s" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen%s%s%s></iframe>',
			esc_url( $embed_url ),
			$poster_attr,
			$loading_attr,
			$sgs_video_tier_attrs( 'vimeo', $embed_url ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value inside is passed through esc_url()/esc_attr() by the closure.
		);

	} else {
		// Direct video file (MP4, WebM, etc.) or internal WP media library video.
		// Auto-detect MIME type from URL extension when not already set.
		if ( '' === $resolved_video_mime ) {
			$ext                 = strtolower( pathinfo( wp_parse_url( $resolved_video_url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
			$resolved_video_mime = match ( $ext ) {
				'mp4'  => 'video/mp4',
				'webm' => 'video/webm',
				'ogg'  => 'video/ogg',
				'ogv'  => 'video/ogg',
				'mov'  => 'video/quicktime',
				default => 'video/mp4',
			};
		}

		$autoplay_attr = $video_autoplay ? ' autoplay' : '';
		$loop_attr     = $video_loop ? ' loop' : '';
		$muted_attr    = $video_muted ? ' muted' : '';
		$controls_attr = $video_controls ? ' controls' : '';
		$inline_attr   = $video_inline ? ' playsinline' : '';
		$preload_attr  = $video_lazy ? ' preload="none"' : ' preload="metadata"';
		$poster_attr   = '' !== $poster_url ? ' poster="' . esc_url( $poster_url ) . '"' : '';

		// Tier overrides (data-*) — only present when a tier's effective value
		// diverges from the tier above it (view.js resolves + applies these on
		// load and on resize; see sgs_media_tier_data_attrs() docblock above).
		$tier_data_attrs  = sgs_media_tier_data_attrs( 'autoplay', $autoplay_tiers );
		$tier_data_attrs .= sgs_media_tier_data_attrs( 'loop', $loop_tiers );
		$tier_data_attrs .= sgs_media_tier_data_attrs( 'muted', $muted_tiers );
		$tier_data_attrs .= sgs_media_tier_data_attrs( 'controls', $controls_tiers );
		$tier_data_attrs .= sgs_media_tier_data_attrs( 'plays-inline', $inline_tiers );
		$tier_data_attrs .= sgs_media_tier_data_attrs( 'lazy', $lazy_tiers );

		/*
		 * WCAG 1.2.2 Captions (Prerecorded) is LEVEL A — below the stated AA
		 * baseline, and the framework emitted zero <track> elements anywhere.
		 *
		 * Scope is deliberately THIS BLOCK ONLY, and that is a measured call
		 * rather than a shortcut: every other <video> in the plugin is emitted
		 * through a shared helper whose callers all pass muted => true
		 * (helpers-media.php's defaults, class-sgs-container-wrapper, hero,
		 * before-after, cta-section). A permanently-silent decorative video has
		 * no audio content to caption, so 1.2.2 is not engaged. `sgs/media` is
		 * the ONLY surface exposing a client control to unmute (videoMuted,
		 * default true) alongside real player chrome (videoControls, default
		 * true), so it is the only place a visitor can hear speech.
		 */
		$captions_url = isset( $attributes['videoCaptionsUrl'] ) ? (string) $attributes['videoCaptionsUrl'] : '';
		if ( '' === $captions_url && ! empty( $attributes['videoCaptionsId'] ) ) {
			$captions_url = (string) wp_get_attachment_url( (int) $attributes['videoCaptionsId'] );
		}

		$track_html = '';
		if ( '' !== $captions_url ) {
			$captions_label = isset( $attributes['videoCaptionsLabel'] ) && '' !== $attributes['videoCaptionsLabel']
				? (string) $attributes['videoCaptionsLabel']
				: __( 'English', 'sgs-blocks' );
			// A bare language subtag, per BCP 47. Anything else is dropped
			// rather than emitted: an invalid srclang makes the track
			// unselectable in some browsers, which fails silently and looks
			// exactly like having no captions at all.
			$captions_lang = isset( $attributes['videoCaptionsSrcLang'] ) ? (string) $attributes['videoCaptionsSrcLang'] : 'en';
			if ( ! preg_match( '/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/', $captions_lang ) ) {
				$captions_lang = 'en';
			}
			$track_html = sprintf(
				'<track kind="captions" src="%s" srclang="%s" label="%s" default>',
				esc_url( $captions_url ),
				esc_attr( $captions_lang ),
				esc_attr( $captions_label )
			);
		}

		$video_html = sprintf(
			'<video class="sgs-media__video sgs-media-el"%s%s%s%s%s%s%s%s%s%s>' .
			'<source src="%s" type="%s">' .
			'%s' .
			'</video>',
			$autoplay_attr,
			$loop_attr,
			$muted_attr,
			$controls_attr,
			$inline_attr,
			$preload_attr,
			$poster_attr,
			$tier_data_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built exclusively from sgs_media_tier_data_attrs(), which only ever emits the fixed literal strings 'data-{name}-tablet="1"'/'"0"' — no attribute-derived text passes through unescaped.
			$sgs_video_tier_attrs( 'file', $resolved_video_url ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value inside is passed through esc_url()/esc_attr() by the closure.
			' aria-label="' . esc_attr( '' !== $caption ? $caption : __( 'Video', 'sgs-blocks' ) ) . '"',
			esc_url( $resolved_video_url ),
			esc_attr( $resolved_video_mime ),
			$track_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled immediately above from esc_url()/esc_attr() only; srclang is additionally validated against a BCP 47 subtag pattern.
		);
	}
}

// ---------------------------------------------------------------------------
// 12b. SVG RENDER PATH.
// ---------------------------------------------------------------------------
$svg_html = '';
if ( 'svg' === $media_type ) {
	$svg_content_raw = isset( $attributes['svgContent'] ) ? (string) $attributes['svgContent'] : '';

	$allowed_svg_animations = array( 'none', 'pulse', 'float', 'wave' );
	$svg_animation_raw      = $attributes['svgAnimation'] ?? 'none';
	$svg_animation          = in_array( $svg_animation_raw, $allowed_svg_animations, true ) ? $svg_animation_raw : 'none';

	$allowed_svg_speeds = array( 'slow', 'medium', 'fast' );
	$svg_speed_raw      = $attributes['svgAnimationSpeed'] ?? 'medium';
	$svg_speed          = in_array( $svg_speed_raw, $allowed_svg_speeds, true ) ? $svg_speed_raw : 'medium';

	if ( '' === $svg_content_raw ) {
		echo '<!-- sgs/media: no SVG content set -->';
		return;
	}

	// Sanitise SVG through an explicit wp_kses() allowlist.
	// Mirrors the identical allowlist used by SGS_Container_Wrapper for bgSvgContent.
	// Strips: <script>, <foreignObject>, event-handler attributes (on*), external
	// href/xlink:href. Only the shapes/structure tags below pass through.
	// Sanitise SVG through the SHARED wp_kses() allowlist.
	// Was an 86-line hand-rolled copy of sgs_allowed_svg_tags(). Verified
	// byte-equivalent as parsed data before collapsing, with a negative
	// control proving the comparison detects a planted difference - so this
	// is behaviour-neutral by measurement, not by assertion.
	// One list, one place to harden. Strips <script>, <foreignObject>,
	// event-handler attributes (on*) and external href/xlink:href.
	$allowed_svg_tags = sgs_allowed_svg_tags();

	$sanitised_svg = wp_kses( $svg_content_raw, $allowed_svg_tags );

	// ART-DIRECTION TIERS for SVG (Spec 35 Part D5).
	//
	// Inline SVG is markup that costs no extra network fetch, so tiers render as
	// SIBLINGS toggled by scoped @media CSS — the images pattern (§11), NOT the
	// video runtime swap. Three <div>s cost nothing meaningful, it needs no JS,
	// and the BEM tier modifier is the vocabulary the cloning pipeline reads.
	//
	// EVERY tier goes through the SAME wp_kses() allowlist as the base. A tier
	// that skipped it would reopen the <script>/on*/external-href hole the base
	// field is explicitly hardened against — the allowlist is the whole defence,
	// so it cannot be applied to only one of the three sources.
	//
	// An empty tier is simply omitted, so that width falls back UP to the next
	// widest tier that IS present — degrade to MORE content, never less.
	$tier_svgs = array();
	foreach ( array( 'Tablet', 'Mobile' ) as $sgs_tier ) {
		$tier_raw = isset( $attributes[ 'svgContent' . $sgs_tier ] ) ? (string) $attributes[ 'svgContent' . $sgs_tier ] : '';
		if ( '' === trim( $tier_raw ) ) {
			continue;
		}
		$tier_clean = wp_kses( $tier_raw, $allowed_svg_tags );
		// A tier whose markup was entirely stripped by the allowlist must NOT
		// emit an empty sibling — that would hide the inherited tier behind a
		// blank box at that width.
		if ( '' === trim( $tier_clean ) ) {
			continue;
		}
		$tier_svgs[ strtolower( $sgs_tier ) ] = $tier_clean;
	}

	// Animation classes are shared by every tier, so a tier override changes the
	// artwork without silently dropping the animation the operator chose.
	$svg_anim_classes = array();
	if ( 'none' !== $svg_animation ) {
		$svg_anim_classes[] = 'sgs-media__svg--' . esc_attr( $svg_animation );
		$svg_anim_classes[] = 'sgs-media__svg--speed-' . esc_attr( $svg_speed );
	}

	$svg_classes = array_merge( array( 'sgs-media__svg' ), $svg_anim_classes );
	if ( ! empty( $tier_svgs ) ) {
		$svg_classes[] = 'sgs-media__svg--desktop';
	}

	$svg_html = '';
	foreach ( $tier_svgs as $tier_key => $tier_markup ) {
		$tier_classes = array_merge(
			array( 'sgs-media__svg' ),
			$svg_anim_classes,
			array( 'sgs-media__svg--' . $tier_key )
		);
		$svg_html .= sprintf(
			'<div class="%s" aria-hidden="true">%s</div>',
			esc_attr( implode( ' ', $tier_classes ) ),
			$tier_markup // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- processed through the SAME wp_kses() allowlist as the base SVG above; no <script>/event-handlers/external-href pass through.
		);
	}

	$svg_html .= sprintf(
		'<div class="%s" aria-hidden="true">%s</div>',
		esc_attr( implode( ' ', $svg_classes ) ),
		$sanitised_svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- processed through wp_kses() with explicit SVG allowlist above; no <script>/event-handlers/external-href pass through.
	);

	// Tier visibility via the SHARED cascade helper (§8) — the same call the image
	// tiers make, so the two families cannot drift apart, and both inherit the
	// canonical mobile -> tablet -> desktop fallback rather than a second
	// hand-rolled one. Every selector is built from the BARE scope token.
	//
	// This CSS is appended to $responsive_css, which is assembled into the block's
	// <style> further down. Appending it AFTER that assembly compiles cleanly and
	// emits nothing — the defect that shipped on sgs/image-sequence.
	$responsive_css .= $sgs_tier_visibility_css( 'sgs-media__svg', array_keys( $tier_svgs ) );
}

// ---------------------------------------------------------------------------
// 13. Assemble wrapper attributes via get_block_wrapper_attributes().
// No 'id' is passed — WP core applies it automatically from the anchor
// support when the operator sets one. No 'style' is passed — nothing is
// inline (no-inline contract §A). The scope class is always present.
// ---------------------------------------------------------------------------
$wrapper_classes = array( 'sgs-media', 'sgs-media--align-' . esc_attr( $alignment ), $scope_class );
if ( 'svg' === $media_type ) {
	$wrapper_classes[] = 'sgs-media--svg';
}

// The `overlay` atom paints via `.sgs-media-box::after` — it needs a real
// container to attach the pseudo-element to (`SGS_Media_Element::
// requires_box()`, class-sgs-media-element.php). The scope class is already
// in $wrapper_classes above, so only the bare marker needs adding.
//
// VALUE-AWARE, not declaration-aware: `overlay` is declared in $sgs_media_atoms
// for every instance of this block, but produces no box-scope CSS until an
// operator actually sets an overlay colour/gradient — declaring it alone must
// not force a `<figure>` wrapper nothing will use. `requires_box()` computes
// each box atom's real CSS output for THESE attribute values before deciding.
$sgs_media_requires_box = class_exists( 'SGS_Media_Element' ) && SGS_Media_Element::requires_box( $attributes, '', 'sgs/media', $sgs_media_atoms );
if ( $sgs_media_requires_box ) {
	$wrapper_classes[] = SGS_Media_Element::CLASS_BOX;
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $wrapper_classes ),
	)
);

// ---------------------------------------------------------------------------
// 14. Naked-mode for image: emit bare <img> with merged classes when no
// caption and no link wrapper are present. Matches canonical mockup pattern
// `.sgs-foo__image` so per-class CSS rules cascade to the right element.
// Naked-mode is image-only; video always emits a <figure> wrapper.
// ---------------------------------------------------------------------------
// ART-DIRECTION TIERS SUPPRESS NAKED MODE. Naked mode makes the <img> the block ROOT
// (Spec 32: no useless wrapper) by REBUILDING $image_html from scratch below, which
// would discard the tier <img>s built in §11 — so naked mode is gated off whenever
// tier images are present.
//
// A block root can only be ONE element, so the tier siblings need a wrapper — and with
// two or three real images in it that wrapper is STRUCTURAL, not the useless one Spec
// 32 bans. Falling back to the figure path also keeps ONE convention across sgs/hero
// and sgs/media (sibling <img>s + BEM tier modifiers + breakpoint CSS), which is the
// point of proving the routing on both a nested element and a standalone block.
//
// A BOX ATOM ALSO SUPPRESSES NAKED MODE (Wave 5b, 2026-09-01) — `overlay`
// paints via `.sgs-media-box::after`, and a replaced element (a naked <img>)
// has nowhere for that pseudo-element to attach (`class-sgs-media-element.php`'s
// own docblock names this exact scenario as the reason `requires_box()`
// exists: "a renderer can ask the question BEFORE choosing its markup").
$naked_mode = ( 'image' === $media_type ) && ( '' === $caption ) && empty( $link_open ) && empty( $tier_imgs ) && ! $sgs_media_requires_box;
// SVG mode always uses the <figure> wrapper (needed for consistent sizing + caption support).

if ( $naked_mode && '' !== $image_html ) {
	// Parse class= and id= from wrapper_attributes string; merge with sgs-media__img.
	// The scope class is already present in $cm[1] (built into $wrapper_classes
	// above), so alignment/order/border/etc scoped rules ($id_wrap / $id_sel)
	// apply to this naked <img> exactly as they do to the <figure> in figure-mode.
	preg_match( '/class="([^"]*)"/', $wrapper_attributes, $cm );
	preg_match( '/id="([^"]*)"/', $wrapper_attributes, $im );
	// The marker rides along here too: in naked mode this <img> IS the block
	// root, so it carries the scope class (already in $cm[1]) and the atom
	// marker on the same node. That is the shape sgs_media_element_scope_class()
	// was written for.
	$merged_classes = trim( ( $cm[1] ?? '' ) . ' sgs-media__img sgs-media-el' );
	$id_attr        = ! empty( $im[1] ) ? ' id="' . esc_attr( $im[1] ) . '"' : '';

	$image_id_attr     = isset( $attributes['imageId'] ) ? absint( $attributes['imageId'] ) : null;
	$image_width_attr  = isset( $attributes['imageWidth'] ) ? absint( $attributes['imageWidth'] ) : 0;
	$image_height_attr = isset( $attributes['imageHeight'] ) ? absint( $attributes['imageHeight'] ) : 0;
	$image_alt_attr    = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';
	if ( $image_is_decorative ) {
		$image_alt_attr = '';
	}

	// Rebuild the resolved URL (already computed above; carry forward).
	$naked_resolved_url = '';
	if ( $image_id_attr ) {
		$naked_src = wp_get_attachment_image_src( $image_id_attr, 'full' );
		if ( $naked_src ) {
			$naked_resolved_url = $naked_src[0];
			if ( ! $image_width_attr && isset( $naked_src[1] ) ) {
				$image_width_attr = absint( $naked_src[1] );
			}
			if ( ! $image_height_attr && isset( $naked_src[2] ) ) {
				$image_height_attr = absint( $naked_src[2] );
			}
		}
	}
	if ( '' === $naked_resolved_url ) {
		$naked_resolved_url = isset( $attributes['imageUrl'] ) ? (string) $attributes['imageUrl'] : '';
	}

	$naked_srcset = '';
	$naked_sizes  = '';
	if ( $image_id_attr ) {
		$naked_srcset_value = wp_get_attachment_image_srcset( $image_id_attr, 'full' );
		$naked_sizes_value  = wp_get_attachment_image_sizes( $image_id_attr, 'full' );
		if ( $naked_srcset_value ) {
			$naked_srcset = ' srcset="' . esc_attr( $naked_srcset_value ) . '"';
		}
		if ( $naked_sizes_value ) {
			$naked_sizes = ' sizes="' . esc_attr( $naked_sizes_value ) . '"';
		}
	}

	$naked_width_part  = $image_width_attr ? ' width="' . esc_attr( $image_width_attr ) . '"' : '';
	$naked_height_part = $image_height_attr ? ' height="' . esc_attr( $image_height_attr ) . '"' : '';
	$naked_aria_hidden = $image_is_decorative ? ' aria-hidden="true"' : '';

	$image_html = sprintf(
		'<img src="%s" alt="%s"%s%s%s%s%s%s class="%s" loading="lazy" decoding="async" />',
		esc_url( $naked_resolved_url ),
		esc_attr( $image_alt_attr ),
		$naked_width_part,
		$naked_height_part,
		$naked_srcset,
		$naked_sizes,
		$id_attr,
		$naked_aria_hidden,
		esc_attr( $merged_classes )
	);
}

// ---------------------------------------------------------------------------
// 15. Emit the scoped responsive <style> block (before the main element).
// wp_strip_all_tags (not esc_html) matches the proven SGS_Container_Wrapper /
// sgs/button pattern: it blocks a </style> breakout while leaving CSS
// combinators like `>` intact.
// ---------------------------------------------------------------------------
if ( $responsive_css ) {
	printf(
		'<style id="%s-css">%s</style>',
		esc_attr( $scope_class ),
		wp_strip_all_tags( $responsive_css ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_attr()/sanitiser-validated components + the trusted wp_style_engine_get_styles() core API throughout; wp_strip_all_tags guards </style> breakout.
	);
}

// ---------------------------------------------------------------------------
// 16. Final output.
// ---------------------------------------------------------------------------
if ( 'image' === $media_type ) {
	if ( $naked_mode ) {
		// Naked img — no <figure> wrapper.
		echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every attribute escaped individually above.
	} else {
		printf(
			'<figure %s>%s%s%s%s</figure>',
			$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
			$link_open,          // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_url() + esc_attr() above.
			$image_html,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every attribute escaped individually above.
			$link_close,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- always '' or '</a>'.
			$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
		);
	}
} elseif ( 'svg' === $media_type ) {
	// SVG — always wrapped in <figure> for consistent sizing and caption support.
	printf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
		$svg_html,           // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG content processed through wp_kses() with explicit allowlist; wrapper attrs from esc_attr().
		$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
	);
} else {
	// Video always emits a <figure> wrapper (needed for caption + accessible labelling).
	printf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes internally.
		$video_html,         // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from esc_url() + esc_attr() above.
		$caption_html        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from wp_kses_post() + esc_attr() above.
	);
}
