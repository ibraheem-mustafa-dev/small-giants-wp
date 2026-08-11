<?php
/**
 * Server-side render for sgs/before-after.
 *
 * Spec 38 FR-38-13 (Wave C, DB-verified NET-NEW). A two-image comparison
 * slider with a draggable divider.
 *
 * CONTENT-KIND, BLOCK-PRIVATE, NO-INLINE (mirrors sgs/quote / sgs/button —
 * D294): box + width only, never used the shared wrapper's grid/section
 * machinery, so it owns its own scoped `<style>` output rather than calling
 * SGS_Container_Wrapper. The root `<div>` IS the block root (single
 * composite element — a comparison slider has no simpler single-tag form).
 *
 * ZERO-JS CONTRACT (non-negotiable, Wave C brief): BOTH images are always
 * present in the markup with their own alt text, and the split position is
 * rendered as a genuine CSS `clip-path` at the configured `startPosition` —
 * not a JS-only state. A visitor with JS blocked sees a real, correctly
 * positioned before/after comparison; they simply cannot drag it. JS
 * (view.js) progressively enhances the same markup: a native
 * `<input type="range">` (always rendered, always keyboard + native-touch
 * operable) drives the CSS custom property `--sgs-before-after-position`,
 * and — when `fxDraggable` is on — GSAP Draggable adds free-drag directly on
 * the image area, writing back to the same range input so there is exactly
 * one source of truth.
 *
 * KEYBOARD: arrow keys on the native range input move the divider — that is
 * a browser-native behaviour of `<input type="range">`, not something this
 * block hand-rolls, and it works whether or not Draggable initialises.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused (no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once __DIR__ . '/media-render.php';

// ---------------------------------------------------------------------------
// 1. Resolve content per slot (image / video / svg — see media-render.php).
// Soft-fail: nothing to render without content on BOTH slots.
// ---------------------------------------------------------------------------

$before_media = sgs_before_after_resolve_media( $attributes, 'before' );
$after_media  = sgs_before_after_resolve_media( $attributes, 'after' );

if ( ! $before_media['has_content'] || ! $after_media['has_content'] ) {
	return;
}

$has_video_slot = 'video' === $before_media['media_type'] || 'video' === $after_media['media_type'];

// Per-device autoplay tier (D-pending). Desktop stays the real attribute the
// no-JS/reduced-motion path already relies on; tablet/mobile overrides ride
// as data-* on the root and are resolved + applied by view.js
// (bootVideoSyncLayer), reusing the same fallback-upward shape as sgs/media's
// tiered playback attrs (null = inherit the tier above).
$video_autoplay_tablet_raw = $attributes['videoAutoplayTablet'] ?? null;
$video_autoplay_mobile_raw = $attributes['videoAutoplayMobile'] ?? null;

$video_autoplay = ! empty( $attributes['videoAutoplay'] );

$video_autoplay_tablet_effective = null !== $video_autoplay_tablet_raw
	? (bool) $video_autoplay_tablet_raw
	: $video_autoplay;
$video_autoplay_mobile_effective = null !== $video_autoplay_mobile_raw
	? (bool) $video_autoplay_mobile_raw
	: $video_autoplay_tablet_effective;

$show_labels  = ! empty( $attributes['showLabels'] ) || ! isset( $attributes['showLabels'] );
$before_label = isset( $attributes['beforeLabel'] ) ? (string) $attributes['beforeLabel'] : '';
$after_label  = isset( $attributes['afterLabel'] ) ? (string) $attributes['afterLabel'] : '';

$orientation_raw   = $attributes['orientation'] ?? 'horizontal';
$orientation       = in_array( $orientation_raw, array( 'horizontal', 'vertical' ), true ) ? $orientation_raw : 'horizontal';
$reverse_direction = ! empty( $attributes['reverseDirection'] );

$fx_draggable = ! empty( $attributes['fxDraggable'] ) || ! isset( $attributes['fxDraggable'] );

// startPosition — clamp 0-100.
$start_position = isset( $attributes['startPosition'] ) ? (float) $attributes['startPosition'] : 50;
$start_position = max( 0, min( 100, $start_position ) );

// ---------------------------------------------------------------------------
// 2. Sanitisers (mirrors sgs/quote — box-object interface contract §D).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$sgs_css_safe_value = static function ( $value ) {
	return preg_replace( '/[;{}<>\\\\]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 3. Frame (root) attributes.
// ---------------------------------------------------------------------------

$box_shadow = $attributes['boxShadow'] ?? '';

// `maxWidth` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11) — ONE attr
// holding {desktop,tablet,mobile}, read through the shared normaliser. The
// `height` family below is still flat and is untouched by this pass.
$max_width_tiers  = sgs_responsive_normalise_object( $attributes['maxWidth'] ?? null );
$max_width        = $max_width_tiers['desktop'] ?? '';
$max_width_tablet = $max_width_tiers['tablet'] ?? '';
$max_width_mobile = $max_width_tiers['mobile'] ?? '';

$height        = isset( $attributes['height'] ) ? (float) $attributes['height'] : 400;
$height_unit   = in_array( $attributes['heightUnit'] ?? 'px', array( 'px', 'vh', 'em', 'rem', '%' ), true ) ? $attributes['heightUnit'] : 'px';
$height_tablet = $attributes['heightTablet'] ?? null;
$height_mobile = $attributes['heightMobile'] ?? null;

$divider_colour  = $attributes['dividerColour'] ?? '';
$divider_width   = isset( $attributes['dividerWidth'] ) ? max( 1, (float) $attributes['dividerWidth'] ) : 3;
$handle_colour   = $attributes['handleColour'] ?? '';
$handle_icon_col = $attributes['handleIconColour'] ?? '';

$label_colour    = $attributes['labelColour'] ?? '';
$label_bg_colour = $attributes['labelBackgroundColour'] ?? '';

// Base border-radius — WP-native style.border.radius (skip-serialised).
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// WP `color`/border supports (skip-serialised → NOT auto-inlined).
$style_color_bg = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$border_width_raw      = $attributes['style']['border']['width'] ?? '';
$border_style_raw      = $attributes['style']['border']['style'] ?? 'none';
$border_colour         = $attributes['style']['border']['color'] ?? '';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

// ---------------------------------------------------------------------------
// 4. Resolve scope. Uid is a CLASS (anchor stays a free `id`).
// ---------------------------------------------------------------------------

$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-before-after-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-before-after';

// ---------------------------------------------------------------------------
// 5. Build scoped CSS.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Root box/visual declarations. ---
$wrapper_decls = array();

if ( $style_color_bg ) {
	$wrapper_decls[] = 'background-color:' . sgs_colour_value( $style_color_bg );
}
if ( 'none' !== $border_style ) {
	if ( $border_width_raw ) {
		$wrapper_decls[] = 'border-width:' . $sgs_css_length( $border_width_raw );
	}
	$wrapper_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$wrapper_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
}
if ( $box_shadow ) {
	$wrapper_decls[] = 'box-shadow:' . sgs_shadow_value( $sgs_css_safe_value( $box_shadow ) );
}
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$wrapper_decls[] = 'max-width:' . $mw_safe;
		$wrapper_decls[] = 'margin-inline:auto';
	}
}

if ( $wrapper_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_decls ) . ';}';
}

// Base border-radius + WP colour support — via the stable core style engine.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();
	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}
	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles( $base_style_engine_args, array( 'selector' => $root_sel ) );
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// Max-width tiers.
$mwt_safe = $max_width_tablet ? $sgs_css_length( $max_width_tablet ) : '';
if ( '' !== $mwt_safe ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{max-width:{$mwt_safe};}}";
}
$mwm_safe = $max_width_mobile ? $sgs_css_length( $max_width_mobile ) : '';
if ( '' !== $mwm_safe ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{max-width:{$mwm_safe};}}";
}

// Border-radius tiers (box family).
$sgs_radius_shorthand = static function ( $box ) use ( $sgs_css_length ) {
	if ( ! is_array( $box ) ) {
		return null;
	}
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};
$radius_tab_val       = $sgs_radius_shorthand( $attributes['borderRadiusTablet'] ?? null );
if ( null !== $radius_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{border-radius:{$radius_tab_val};}}";
}
$radius_mob_val = $sgs_radius_shorthand( $attributes['borderRadiusMobile'] ?? null );
if ( null !== $radius_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{border-radius:{$radius_mob_val};}}";
}

// --- Stage height (base + tiers). ---
$stage_sel    = $root_sel . ' .wp-block-sgs-before-after__stage';
$scoped_css[] = "{$stage_sel}{height:" . round( $height, 2 ) . $height_unit . ';}';
if ( null !== $height_tablet && '' !== $height_tablet ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$stage_sel}{height:" . round( (float) $height_tablet, 2 ) . $height_unit . ';}}';
}
if ( null !== $height_mobile && '' !== $height_mobile ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$stage_sel}{height:" . round( (float) $height_mobile, 2 ) . $height_unit . ';}}';
}

// --- Default split position — the CSS-only, zero-JS comparison state. ---
$scoped_css[] = "{$root_sel}{--sgs-before-after-position:" . round( $start_position, 2 ) . '%;}';

// --- Divider + handle colours/width — CUSTOM-PROPERTY VALUES, not competing
// declarations (Spec 32: "Overrides = CSS custom-property VALUES, never
// inline declarations" — the same rule applies to a scoped <style> selector
// as to an inline style attribute: a selector{property:value} rule here would
// beat style.css's var()-with-fallback declaration by source order, giving
// this one property two writers. Instead we set the VALUE of the var that
// style.css already reads (with the same literal as its CSS fallback), so an
// unset attribute renders identically and a set one flows through the one
// mechanism. ---
$root_var_decls = array();

// Divider width has its own PHP-side default (3, clamped >=1 above) and is
// the thickness for BOTH orientations (style.css reads it as width on the
// horizontal rule, height on the vertical rule) — so it is always emitted,
// not gated on an override check.
$root_var_decls[] = '--sgs-before-after-divider-width:' . round( $divider_width, 2 ) . 'px';

if ( $divider_colour ) {
	$root_var_decls[] = '--sgs-before-after-divider-colour:' . sgs_colour_value( $divider_colour );
}
if ( $handle_colour ) {
	$root_var_decls[] = '--sgs-before-after-handle-colour:' . sgs_colour_value( $handle_colour );
}
if ( $handle_icon_col ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour:' . sgs_colour_value( $handle_icon_col );
}
// Label colour/background — same custom-property-value rule as the divider/
// handle above; style.css reads --sgs-before-after-label-colour and
// --sgs-before-after-label-bg-colour with the current literal as fallback.
if ( $label_colour ) {
	$root_var_decls[] = '--sgs-before-after-label-colour:' . sgs_colour_value( $label_colour );
}
if ( $label_bg_colour ) {
	$root_var_decls[] = '--sgs-before-after-label-bg-colour:' . sgs_colour_value( $label_bg_colour );
}

$scoped_css[] = "{$root_sel}{" . implode( ';', $root_var_decls ) . ';}';

// --- Label typography (font-weight/font-style — plain declarations; these
// have no hardcoded CSS default to compete with, so they stay as direct
// overrides). Colour/background are handled above via custom properties. ---
$label_sel = $root_sel . ' .wp-block-sgs-before-after__label';

$label_decls = array();
if ( $attributes['labelFontWeight'] ?? '' ) {
	$fw_safe = $sgs_css_keyword( $attributes['labelFontWeight'] );
	if ( '' !== $fw_safe ) {
		$label_decls[] = 'font-weight:' . $fw_safe;
	}
}
if ( $attributes['labelFontStyle'] ?? '' ) {
	$fs_safe = $sgs_css_keyword( $attributes['labelFontStyle'] );
	if ( '' !== $fs_safe ) {
		$label_decls[] = 'font-style:' . $fs_safe;
	}
}
if ( $label_decls ) {
	$scoped_css[] = $label_sel . '{' . implode( ';', $label_decls ) . ';}';
}

$label_font_size_unit   = $attributes['labelFontSizeUnit'] ?? 'px';
$label_line_height_unit = $attributes['labelLineHeightUnit'] ?? '';

$css_label_tiers = sgs_responsive_css_rule(
	$attributes,
	array(
		array(
			'attr'         => 'labelFontSize',
			'css'          => 'font-size',
			'unit_default' => $label_font_size_unit,
			'tablet_attr'  => 'labelFontSizeTablet',
			'mobile_attr'  => 'labelFontSizeMobile',
		),
		array(
			'attr'         => 'labelLineHeight',
			'css'          => 'line-height',
			'unit_default' => $label_line_height_unit,
		),
	),
	$label_sel
);
if ( $css_label_tiers ) {
	$scoped_css[] = $css_label_tiers;
}

// --- Reduced motion: the divider is user-driven input, so it stays live
// (Spec 38 §10) — only the decorative handle hover/scale transition is
// suppressed, matching the house pattern on every other block. ---
$scoped_css[] = '@media(prefers-reduced-motion:reduce){' . $root_sel . ' .wp-block-sgs-before-after__handle{transition:none !important;}}';

// ---------------------------------------------------------------------------
// 6. Root classes + attributes.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-before-after', $uid );
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$root_attr_args = array(
	'class'               => implode( ' ', $root_classes ),
	'data-orientation'    => $orientation,
	'data-reverse'        => $reverse_direction ? '1' : '0',
	'data-fx-draggable'   => $fx_draggable ? '1' : '0',
	'data-has-video'      => $has_video_slot ? '1' : '0',
	'data-video-autoplay' => $video_autoplay ? '1' : '0',
);
// Tier overrides — only present when a tier's effective value diverges from
// the tier above it (view.js resolves + applies these on load and resize;
// mirrors sgs/media's sgs_media_tier_data_attrs() shape).
if ( $video_autoplay_tablet_effective !== $video_autoplay ) {
	$root_attr_args['data-video-autoplay-tablet'] = $video_autoplay_tablet_effective ? '1' : '0';
}
if ( $video_autoplay_mobile_effective !== $video_autoplay_tablet_effective ) {
	$root_attr_args['data-video-autoplay-mobile'] = $video_autoplay_mobile_effective ? '1' : '0';
}
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 6b. ART-DIRECTION TIER TOGGLES (2026-08-07) — the IMAGE pair.
//
// The resolver emitted the tier siblings and reported which tiers it actually
// produced; scoping their breakpoint toggles has to happen HERE because $uid
// exists only in this file. An unscoped `.wp-block-sgs-before-after__img--…`
// rule would hide images in every other instance on the page.
//
// ⛔ Selectors descend from $root_sel — a single compound token
// (`.{uid}.wp-block-sgs-before-after`), never a multi-member selector LIST: a
// descendant appended to a list binds to its last member only, which on
// sgs/media hid every image at every width before it was caught live.
// ---------------------------------------------------------------------------
foreach ( array(
	'before' => $before_media,
	'after'  => $after_media,
) as $sgs_slot => $sgs_slot_media ) {
	$sgs_slot_tiers = $sgs_slot_media['tiers'] ?? array();
	if ( empty( $sgs_slot_tiers ) ) {
		continue;
	}
	$sgs_ba_tier_sel = static function ( $tier ) use ( $root_sel, $sgs_slot ) {
		return $root_sel . ' .wp-block-sgs-before-after__img--' . $sgs_slot . '-' . $tier;
	};
	if ( in_array( 'mobile', $sgs_slot_tiers, true ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $sgs_ba_tier_sel( 'desktop' ) . '{display:none}}';
		$scoped_css[] = '@media(min-width:768px){' . $sgs_ba_tier_sel( 'mobile' ) . '{display:none}}';
	}
	if ( in_array( 'tablet', $sgs_slot_tiers, true ) ) {
		$scoped_css[] = '@media(min-width:768px) and (max-width:1023px){' . $sgs_ba_tier_sel( 'desktop' ) . '{display:none}}';
		$scoped_css[] = '@media(max-width:767px){' . $sgs_ba_tier_sel( 'tablet' ) . '{display:none}}';
		$scoped_css[] = '@media(min-width:1024px){' . $sgs_ba_tier_sel( 'tablet' ) . '{display:none}}';
	}
}

// ---------------------------------------------------------------------------
// 7. Enqueue the Draggable enhancement's script modules — gated on the
// block actually rendering (proxy-enqueue, same sanctioned pattern as
// sgs/buybox's view_script_module_ids proxy). @sgs/motion-provider and
// @sgs/gsap-draggable are already REGISTERED at `init` by
// SGS_Motion_Registry::register_modules() (includes/class-sgs-motion-
// registry.php) whenever those two built files exist; this only enqueues
// them, so a page without a before/after block still ships zero GSAP bytes
// (Spec 38 §4.4). The native range input (below) needs neither module and
// keeps the divider fully keyboard + touch operable even if this enqueue is
// skipped or the built files are not yet present.
//
// `is_admin()` GATE (Spec 38 §9 — never active in wp-admin, proven 2026-07-31):
// this block's own render.php runs on every render_block() call for it,
// including the editor's server-side content generation for the iframe
// canvas — a context every OTHER Tier G enqueue path in this codebase
// excludes (SGS_Motion_Registry::sniff_block(), maybe_enqueue_smooth_scroll(),
// maybe_enqueue_page_transitions() all check is_admin()/sgs_is_frontend_render()
// first). This proxy-enqueue was the one path that did not, and it is what put
// `@sgs/gsap-draggable` on the wp-admin page's own <script type="module">
// list without a matching import-map entry — confirmed live via Chrome
// DevTools on wp-admin/post.php?action=edit: the printed import map held only
// `@wordpress/route`, `@wordpress/latex-to-mathml`, `@wordpress/interactivity`,
// `@sgs/gsap`, never the plugin modules, yet gsap-draggable.js was still
// enqueued from here. A STATIC import inside an already-enqueued module
// resolving against a map that doesn't carry it is an uncatchable module-load
// error — no try/catch or promise `.catch()` inside view.js's dynamic
// `import()` calls can intercept it, because the failure never reaches that
// code at all.
// ---------------------------------------------------------------------------

if ( $fx_draggable && ! is_admin() && function_exists( 'wp_enqueue_script_module' ) ) {
	wp_enqueue_script_module( '@sgs/motion-provider' );
	wp_enqueue_script_module( '@sgs/gsap-draggable' );
}

// ---------------------------------------------------------------------------
// 8. Render.
// ---------------------------------------------------------------------------

$range_id = $uid . '-range';

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div class="wp-block-sgs-before-after__stage" data-sgs-before-after-stage>
		<?php
		// Escaped by the resolver (sgs_before_after_resolve_media() in
		// media-render.php — every branch either escapes each part itself or
		// runs the content through wp_kses()/wp_get_attachment_image()).
		echo $before_media['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
		<div class="wp-block-sgs-before-after__after-wrap">
			<?php
			echo $after_media['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			?>
		</div>
		<?php if ( $show_labels && ( '' !== trim( $before_label ) || '' !== trim( $after_label ) ) ) : ?>
			<div class="wp-block-sgs-before-after__labels" aria-hidden="true">
				<?php if ( '' !== trim( $before_label ) ) : ?>
					<span class="wp-block-sgs-before-after__label wp-block-sgs-before-after__label--before"><?php echo esc_html( $before_label ); ?></span>
				<?php endif; ?>
				<?php if ( '' !== trim( $after_label ) ) : ?>
					<span class="wp-block-sgs-before-after__label wp-block-sgs-before-after__label--after"><?php echo esc_html( $after_label ); ?></span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
		<?php if ( $has_video_slot ) : ?>
			<button
				type="button"
				class="wp-block-sgs-before-after__video-toggle"
				data-sgs-before-after-video-toggle
				aria-pressed="false"
				aria-label="<?php esc_attr_e( 'Play comparison videos', 'sgs-blocks' ); ?>"
			>
				<svg class="wp-block-sgs-before-after__video-toggle-icon wp-block-sgs-before-after__video-toggle-icon--play" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
					<polygon points="6 4 20 12 6 20 6 4"></polygon>
				</svg>
				<svg class="wp-block-sgs-before-after__video-toggle-icon wp-block-sgs-before-after__video-toggle-icon--pause" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
					<rect x="5" y="4" width="4" height="16"></rect>
					<rect x="15" y="4" width="4" height="16"></rect>
				</svg>
			</button>
		<?php endif; ?>
		<div class="wp-block-sgs-before-after__divider" aria-hidden="true">
			<div class="wp-block-sgs-before-after__divider-line"></div>
			<div class="wp-block-sgs-before-after__handle">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 6 3 12 9 18"></polyline>
					<polyline points="15 6 21 12 15 18"></polyline>
				</svg>
			</div>
		</div>
		<label class="wp-block-sgs-before-after__range-label sgs-screen-reader-text" for="<?php echo esc_attr( $range_id ); ?>">
			<?php
			echo esc_html(
				sprintf(
					/* translators: %1$s: before label, %2$s: after label */
					__( 'Drag to compare %1$s and %2$s', 'sgs-blocks' ),
					'' !== trim( $before_label ) ? $before_label : __( 'before', 'sgs-blocks' ),
					'' !== trim( $after_label ) ? $after_label : __( 'after', 'sgs-blocks' )
				)
			);
			?>
		</label>
		<input
			type="range"
			id="<?php echo esc_attr( $range_id ); ?>"
			class="wp-block-sgs-before-after__range"
			min="0"
			max="100"
			step="1"
			value="<?php echo esc_attr( round( $start_position ) ); ?>"
			data-sgs-before-after-range
		/>
	</div>
</div>
