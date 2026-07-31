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

// ---------------------------------------------------------------------------
// 1. Resolve content. Soft-fail: nothing to render without both images.
// ---------------------------------------------------------------------------

$before_url = isset( $attributes['beforeImageUrl'] ) ? (string) $attributes['beforeImageUrl'] : '';
$after_url  = isset( $attributes['afterImageUrl'] ) ? (string) $attributes['afterImageUrl'] : '';

if ( '' === trim( $before_url ) || '' === trim( $after_url ) ) {
	return;
}

$before_alt = isset( $attributes['beforeImageAlt'] ) ? (string) $attributes['beforeImageAlt'] : '';
$after_alt  = isset( $attributes['afterImageAlt'] ) ? (string) $attributes['afterImageAlt'] : '';

$before_id = isset( $attributes['beforeImageId'] ) ? (int) $attributes['beforeImageId'] : 0;
$after_id  = isset( $attributes['afterImageId'] ) ? (int) $attributes['afterImageId'] : 0;

/**
 * Render one comparison image, preferring the media-library ATTACHMENT over
 * the stored URL.
 *
 * WHY THE ID PATH EXISTS AT ALL. The editor stores both an attachment id and a
 * resolved url. Rendering the url alone is what a first pass naturally does and
 * it looks perfectly correct — but it emits a bare `src`, so every visitor
 * downloads the FULL-SIZE original. On a block whose whole job is showing two
 * large photographs at once, that is two full-size downloads on a phone.
 * `wp_get_attachment_image()` emits `srcset`/`sizes` from the registered image
 * sizes, so the browser picks an appropriate one.
 *
 * The url path is a genuine fallback, not dead code: an image may be referenced
 * by url with no attachment behind it (an external/CDN url, or content whose
 * attachment was deleted), and that must still render rather than vanish.
 *
 * ⚠ Deliberately a CLOSURE, not a named function. `render.php` is executed once
 * PER BLOCK INSTANCE, so a top-level `function` declaration here fatals on the
 * second instance of this block on the same page — a documented trap in this
 * plugin's CLAUDE.md, and one that only ever shows up on a page that happens to
 * use the block twice.
 *
 * @param int    $attachment_id Attachment ID, or 0 when only a url is known.
 * @param string $url           Stored image url (fallback source).
 * @param string $alt           Alt text.
 * @param string $modifier      BEM modifier: 'before' or 'after'.
 * @return string Escaped <img> markup.
 */
$sgs_before_after_img = static function ( $attachment_id, $url, $alt, $modifier ) {
	$classes = 'wp-block-sgs-before-after__img wp-block-sgs-before-after__img--' . $modifier;

	if ( $attachment_id > 0 ) {
		$markup = wp_get_attachment_image(
			$attachment_id,
			'full',
			false,
			array(
				'class'    => $classes,
				'alt'      => $alt,
				'loading'  => 'lazy',
				'decoding' => 'async',
			)
		);

		// An id can outlive its attachment (deleted media). Only accept the
		// result when WP actually produced markup, otherwise fall through to
		// the url so the comparison still renders.
		if ( '' !== $markup ) {
			return $markup;
		}
	}

	return sprintf(
		'<img class="%1$s" src="%2$s" alt="%3$s" loading="lazy" decoding="async" />',
		esc_attr( $classes ),
		esc_url( $url ),
		esc_attr( $alt )
	);
};

$show_labels  = ! empty( $attributes['showLabels'] ) || ! isset( $attributes['showLabels'] );
$before_label = isset( $attributes['beforeLabel'] ) ? (string) $attributes['beforeLabel'] : '';
$after_label  = isset( $attributes['afterLabel'] ) ? (string) $attributes['afterLabel'] : '';

$orientation_raw = $attributes['orientation'] ?? 'horizontal';
$orientation     = in_array( $orientation_raw, array( 'horizontal', 'vertical' ), true ) ? $orientation_raw : 'horizontal';

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

$box_shadow       = $attributes['boxShadow'] ?? '';
$max_width        = $attributes['maxWidth'] ?? '';
$max_width_tablet = $attributes['maxWidthTablet'] ?? '';
$max_width_mobile = $attributes['maxWidthMobile'] ?? '';

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
	'class'             => implode( ' ', $root_classes ),
	'data-orientation'  => $orientation,
	'data-fx-draggable' => $fx_draggable ? '1' : '0',
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

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
// ---------------------------------------------------------------------------

if ( $fx_draggable && function_exists( 'wp_enqueue_script_module' ) ) {
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
		// Escaped inside the closure (wp_get_attachment_image() returns safe
		// markup; the url fallback escapes each part).
		echo $sgs_before_after_img( $before_id, $before_url, $before_alt, 'before' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
		<div class="wp-block-sgs-before-after__after-wrap">
			<?php
			echo $sgs_before_after_img( $after_id, $after_url, $after_alt, 'after' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
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
