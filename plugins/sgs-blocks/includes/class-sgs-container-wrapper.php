<?php
/**
 * SGS_Container_Wrapper — shared OUTER-wrapper render helper for SGS container blocks.
 *
 * Extracts the full wrapper-assembly logic from sgs/container so every composite block
 * (sgs/hero, sgs/cta-section, sgs/trust-bar, etc.) can MIRROR sgs/container's wrapper
 * capabilities instead of re-implementing them divergently.
 *
 * IMPORTANT — get_block_wrapper_attributes() constraint
 * -------------------------------------------------------
 * get_block_wrapper_attributes() reads WordPress's current-block global context
 * (set by the block renderer immediately before it calls render.php). It MUST
 * therefore be called synchronously within the same render pass — i.e. from inside
 * the static render() method when called from render.php. Caching the return value
 * across requests or calling it from a constructor/init hook is NOT safe.
 *
 * IMPORTANT — $attributes must be passed VERBATIM
 * ------------------------------------------------
 * The responsive-CSS uid is derived from:
 *   md5( wp_json_encode( $attributes ) . anchor )
 * Any array_merge of defaults, ksort, or key mutation changes the JSON encoding and
 * therefore the uid — which changes the scoped <style> selector and causes pixel drift
 * on any instance that uses responsive CSS. Always pass the raw $attributes array that
 * WP handed render.php, never a normalised copy.
 *
 * KIND gating — which layers are emitted
 * ----------------------------------------
 * 'section' — Full surface: bg-image/video/overlay/svg, shape-dividers, widthMode/
 *             customWidth, min-height, grid/flex, gridItem*, gap, contentWidth/__inner.
 *             Matches the complete sgs/container output exactly.
 * 'layout'  — grid/flex + widthMode/customWidth/contentWidth + gap only.
 *             No bg/overlay/svg/shape-divider layers.
 * 'content' — widthMode/customWidth/contentWidth + padding/spacing only.
 *             No bg/overlay/svg/shape/grid layers.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'SGS_Container_Wrapper' ) ) {

	/**
	 * Static helper — call SGS_Container_Wrapper::render() from composite render.php files.
	 */
	final class SGS_Container_Wrapper {

		/**
		 * Render the outer wrapper for a container-style block.
		 *
		 * Returns a single pre-joined string:
		 *   '<style id=uid>…</style>' (if any responsive CSS)
		 *   FOLLOWED BY
		 *   '<tag {wrapper_attrs}>[bg layers][__inner?]$inner_html[/__inner?][fg layers]</tag>'
		 *
		 * The caller echoes this string exactly once — no separate printf for the <style>.
		 *
		 * @param array          $attributes  VERBATIM block attributes as passed by WP to render.php.
		 *                                    DO NOT merge defaults or reorder keys — uid is md5 of
		 *                                    wp_json_encode($attributes).anchor; any mutation causes
		 *                                    a different uid → different scoped <style> selector → pixel drift.
		 * @param \WP_Block|null $block  Block instance (used for anchor in uid derivation).
		 * @param string         $inner_html  The caller's already-built interior HTML (InnerBlocks content).
		 * @param string         $kind        'section'|'layout'|'content' — gates which wrapper layers emit.
		 * @param array          $opts        Optional overrides:
		 *                                    'tag'           => string  HTML tag (default: from htmlTag attr or 'section').
		 *                                    'block_class'   => string  Additional root class appended to $classes
		 *                                                       (e.g. 'sgs-hero'). Merged before wrapper_attrs call.
		 *                                    'extra_classes' => array   Additional classes (merged before wrapper call).
		 *                                    'extra_styles'  => array   Additional inline-style strings (merged before call).
		 *                                    'no_overlay'    => bool    When true the overlay layer is suppressed
		 *                                                       (C3 double-emit guard — composite has its own overlay).
		 *                                    'wrap_inner'    => bool|null  Override the __inner guard. null = use the
		 *                                                       default guard (contentWidth set + layout empty).
		 * @return string  Full HTML output ready for echo.
		 */
		public static function render(
			array $attributes,
			$block,
			string $inner_html,
			string $kind = 'section',
			array $opts = array()
		): string {

			// ----------------------------------------------------------------
			// Resolve options.
			// ----------------------------------------------------------------
			$opt_tag           = isset( $opts['tag'] ) ? (string) $opts['tag'] : '';
			$opt_block_class   = isset( $opts['block_class'] ) ? (string) $opts['block_class'] : '';
			$opt_extra_classes = isset( $opts['extra_classes'] ) && is_array( $opts['extra_classes'] ) ? $opts['extra_classes'] : array();
			$opt_extra_styles  = isset( $opts['extra_styles'] ) && is_array( $opts['extra_styles'] ) ? $opts['extra_styles'] : array();
			$opt_no_overlay    = ! empty( $opts['no_overlay'] );
			$opt_wrap_inner    = array_key_exists( 'wrap_inner', $opts ) ? $opts['wrap_inner'] : null;

			// Allowed kinds — fall back to 'section' on invalid input.
			$allowed_kinds = array( 'section', 'layout', 'content' );
			if ( ! in_array( $kind, $allowed_kinds, true ) ) {
				$kind = 'section';
			}

			$is_section = 'section' === $kind;
			$is_layout  = 'layout' === $kind;
			// content kind = only widthMode/contentWidth/padding; used by content-level composites.

			// ----------------------------------------------------------------
			// Extract attributes (mirrors container/render.php exactly).
			// ----------------------------------------------------------------
			$layout               = $attributes['layout'] ?? '';
			$columns              = $attributes['columns'] ?? 2;
			$columns_mobile       = $attributes['columnsMobile'] ?? 1;
			$columns_tablet       = $attributes['columnsTablet'] ?? 2;
			$grid_template        = $attributes['gridTemplateColumns'] ?? '';
			$grid_template_tablet = $attributes['gridTemplateColumnsTablet'] ?? '';
			$grid_template_mobile = $attributes['gridTemplateColumnsMobile'] ?? '';
			$gap                  = $attributes['gap'] ?? '';
			$gap_tablet           = $attributes['gapTablet'] ?? '';
			$gap_mobile           = $attributes['gapMobile'] ?? '';

			// Section-only bg attrs.
			if ( $is_section ) {
				$bg_image         = $attributes['backgroundImage'] ?? null;
				$bg_image_tablet  = $attributes['backgroundImageTablet'] ?? null;
				$bg_image_mobile  = $attributes['backgroundImageMobile'] ?? null;
				$bg_size          = $attributes['backgroundSize'] ?? 'cover';
				$allowed_bg_sizes = array( 'cover', 'contain', 'auto' );
				if ( ! in_array( $bg_size, $allowed_bg_sizes, true ) ) {
					$bg_size = 'cover';
				}
				$bg_position        = $attributes['backgroundPosition'] ?? 'center center';
				$bg_position        = preg_replace( '/[^A-Za-z0-9\s%]/', '', $bg_position );
				$bg_repeat          = $attributes['backgroundRepeat'] ?? 'no-repeat';
				$allowed_bg_repeats = array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' );
				if ( ! in_array( $bg_repeat, $allowed_bg_repeats, true ) ) {
					$bg_repeat = 'no-repeat';
				}
				$bg_attachment       = $attributes['backgroundAttachment'] ?? 'scroll';
				$allowed_attachments = array( 'scroll', 'fixed' );
				if ( ! in_array( $bg_attachment, $allowed_attachments, true ) ) {
					$bg_attachment = 'scroll';
				}
				$overlay_colour         = $attributes['backgroundOverlayColour'] ?? '';
				$overlay_opacity        = $attributes['backgroundOverlayOpacity'] ?? 50;
				$overlay_gradient       = ! empty( $attributes['overlayGradient'] );
				$overlay_gradient_angle = isset( $attributes['overlayGradientAngle'] ) ? absint( $attributes['overlayGradientAngle'] ) : 180;
				$overlay_gradient_from  = $attributes['overlayGradientFrom'] ?? '';
				$overlay_gradient_to    = $attributes['overlayGradientTo'] ?? '';
				$bg_video               = $attributes['bgVideo'] ?? null;
				$bg_video_mobile        = $attributes['bgVideoMobile'] ?? null;
				$bg_parallax            = ! empty( $attributes['bgParallax'] );
				$bg_ken_burns           = ! empty( $attributes['bgKenBurns'] );
				$bg_animation_duration  = isset( $attributes['bgAnimationDuration'] ) ? absint( $attributes['bgAnimationDuration'] ) : 20;
			} else {
				// Zero out section-only vars for layout/content kinds.
				$bg_image               = null;
				$bg_image_tablet        = null;
				$bg_image_mobile        = null;
				$bg_size                = 'cover';
				$bg_position            = 'center center';
				$bg_repeat              = 'no-repeat';
				$bg_attachment          = 'scroll';
				$overlay_colour         = '';
				$overlay_opacity        = 50;
				$overlay_gradient       = false;
				$overlay_gradient_angle = 180;
				$overlay_gradient_from  = '';
				$overlay_gradient_to    = '';
				$bg_video               = null;
				$bg_video_mobile        = null;
				$bg_parallax            = false;
				$bg_ken_burns           = false;
				$bg_animation_duration  = 20;
			}

			$shadow         = $attributes['shadow'] ?? '';
			$max_width      = $attributes['maxWidth'] ?? '';
			$content_width  = $attributes['contentWidth'] ?? '';
			$content_width  = preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $content_width );
			$min_height     = $attributes['minHeight'] ?? '';
			$vertical_align = $attributes['verticalAlign'] ?? 'start';

			// HTML tag.
			$html_tag     = $opt_tag ? $opt_tag : ( $attributes['htmlTag'] ?? 'section' );
			$allowed_tags = array( 'section', 'div', 'article', 'aside', 'main' );
			if ( ! in_array( $html_tag, $allowed_tags, true ) ) {
				$html_tag = 'section';
			}

			// widthMode.
			$allowed_width_modes   = array( 'default', 'wide', 'full', 'custom' );
			$width_mode            = $attributes['widthMode'] ?? 'default';
			$width_mode_mobile     = $attributes['widthModeMobile'] ?? '';
			$width_mode_tablet     = $attributes['widthModeTablet'] ?? '';
			$width_mode_desktop    = $attributes['widthModeDesktop'] ?? '';
			$custom_width_value    = isset( $attributes['customWidth'] ) ? absint( $attributes['customWidth'] ) : 0;
			$custom_width_unit_raw = $attributes['customWidthUnit'] ?? 'px';
			$allowed_width_units   = array( 'px', 'em', 'rem', '%', 'vw' );
			$custom_width_unit     = in_array( $custom_width_unit_raw, $allowed_width_units, true ) ? $custom_width_unit_raw : 'px';

			if ( ! in_array( $width_mode, $allowed_width_modes, true ) ) {
				$width_mode = 'default';
			}
			if ( '' !== $width_mode_mobile && ! in_array( $width_mode_mobile, $allowed_width_modes, true ) ) {
				$width_mode_mobile = '';
			}
			if ( '' !== $width_mode_tablet && ! in_array( $width_mode_tablet, $allowed_width_modes, true ) ) {
				$width_mode_tablet = '';
			}
			if ( '' !== $width_mode_desktop && ! in_array( $width_mode_desktop, $allowed_width_modes, true ) ) {
				$width_mode_desktop = '';
			}

			// Grid item defaults (SB-1) — section + layout kinds only.
			$grid_item_padding       = $attributes['gridItemPadding'] ?? '';
			$grid_item_background    = $attributes['gridItemBackground'] ?? '';
			$grid_item_border_radius = $attributes['gridItemBorderRadius'] ?? '';
			$grid_item_border        = $attributes['gridItemBorder'] ?? '';
			$grid_item_shadow        = $attributes['gridItemShadow'] ?? '';
			$grid_item_text_colour   = $attributes['gridItemTextColour'] ?? '';

			// QB-1 advanced grid attrs (section + layout kinds only).
			$grid_template_rows        = $attributes['gridTemplateRows'] ?? '';
			$grid_template_rows_tablet = $attributes['gridTemplateRowsTablet'] ?? '';
			$grid_template_rows_mobile = $attributes['gridTemplateRowsMobile'] ?? '';
			$grid_auto_rows            = $attributes['gridAutoRows'] ?? '';
			$justify_items             = $attributes['justifyItems'] ?? 'stretch';
			$align_content             = $attributes['alignContent'] ?? 'stretch';
			$allowed_justify_items     = array( 'stretch', 'start', 'center', 'end' );
			$allowed_align_content     = array( 'stretch', 'start', 'center', 'end', 'space-between', 'space-around', 'space-evenly' );
			if ( ! in_array( $justify_items, $allowed_justify_items, true ) ) {
				$justify_items = 'stretch';
			}
			if ( ! in_array( $align_content, $allowed_align_content, true ) ) {
				$align_content = 'stretch';
			}

			// SVG background attrs (section kind only).
			if ( $is_section ) {
				$bg_svg_content        = $attributes['bgSvgContent'] ?? '';
				$bg_svg_position       = $attributes['bgSvgPosition'] ?? 'background';
				$allowed_svg_positions = array( 'background', 'foreground' );
				if ( ! in_array( $bg_svg_position, $allowed_svg_positions, true ) ) {
					$bg_svg_position = 'background';
				}
				$bg_svg_animation       = $attributes['bgSvgAnimation'] ?? 'none';
				$allowed_svg_animations = array( 'none', 'pulse', 'float', 'wave' );
				if ( ! in_array( $bg_svg_animation, $allowed_svg_animations, true ) ) {
					$bg_svg_animation = 'none';
				}
				$bg_svg_speed       = $attributes['bgSvgAnimationSpeed'] ?? 'medium';
				$allowed_svg_speeds = array( 'slow', 'medium', 'fast' );
				if ( ! in_array( $bg_svg_speed, $allowed_svg_speeds, true ) ) {
					$bg_svg_speed = 'medium';
				}
				$bg_svg_opacity     = isset( $attributes['bgSvgOpacity'] ) ? absint( $attributes['bgSvgOpacity'] ) : 100;
				$bg_svg_min_height  = $attributes['bgSvgMinHeight'] ?? '';
				$bg_svg_text_shadow = ! empty( $attributes['bgSvgTextShadow'] );
				$has_bg_svg         = ! empty( $bg_svg_content );
			} else {
				$bg_svg_content     = '';
				$bg_svg_position    = 'background';
				$bg_svg_animation   = 'none';
				$bg_svg_speed       = 'medium';
				$bg_svg_opacity     = 100;
				$bg_svg_min_height  = '';
				$bg_svg_text_shadow = false;
				$has_bg_svg         = false;
			}

			// ----------------------------------------------------------------
			// Derived booleans.
			// ----------------------------------------------------------------
			$has_bg_image = ! empty( $bg_image['url'] );
			$has_bg_video = ! empty( $bg_video['url'] );

			// ----------------------------------------------------------------
			// Build inline styles.
			// ----------------------------------------------------------------
			$styles = array_merge( array(), $opt_extra_styles );

			// gap — section + layout kinds.
			if ( ( $is_section || $is_layout ) && '' !== $gap ) {
				$styles[] = 'gap:' . sgs_container_gap_value( $gap );
			}

			if ( $is_section && $min_height ) {
				$styles[] = 'min-height:' . esc_attr( $min_height );
			}

			if ( $shadow ) {
				$styles[] = 'box-shadow:var(--wp--preset--shadow--' . esc_attr( $shadow ) . ')';
			}

			// Background image — section kind only.
			if ( $is_section && $has_bg_image && ! $has_bg_video ) {
				$styles[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
				$styles[] = 'background-size:' . esc_attr( $bg_size );
				$styles[] = 'background-position:' . esc_attr( $bg_position );
				$styles[] = 'background-repeat:' . esc_attr( $bg_repeat );
				if ( 'fixed' === $bg_attachment ) {
					$styles[] = 'background-attachment:fixed';
				}
			}

			// Ken-burns duration.
			if ( $is_section && $bg_ken_burns && $has_bg_image ) {
				$styles[] = '--sgs-ken-burns-duration:' . absint( $bg_animation_duration ) . 's';
			}

			// Grid / flex display — section + layout kinds.
			if ( $is_section || $is_layout ) {
				if ( 'grid' === $layout ) {
					$styles[] = 'display:grid';
					if ( '' !== trim( (string) $grid_template ) ) {
						$styles[] = 'grid-template-columns:' . sgs_sanitize_grid_template( $grid_template );
					} else {
						$styles[] = 'grid-template-columns:repeat(' . absint( $columns ) . ',1fr)';
					}
					$styles[] = 'align-items:' . esc_attr( $vertical_align );
					if ( 'stretch' !== $justify_items ) {
						$styles[] = 'justify-items:' . esc_attr( $justify_items );
					}
					if ( 'stretch' !== $align_content ) {
						$styles[] = 'align-content:' . esc_attr( $align_content );
					}
				} elseif ( 'flex' === $layout ) {
					$styles[] = 'display:flex';
					$styles[] = 'flex-wrap:wrap';
					$styles[] = 'align-items:' . esc_attr( $vertical_align );
				}
			}

			// SVG min-height custom property — section kind only.
			if ( $is_section && $has_bg_svg && ! empty( $bg_svg_min_height ) ) {
				$styles[] = '--sgs-svg-min-height:' . esc_attr( $bg_svg_min_height );
			}

			// Grid item defaults (SB-1) — section + layout kinds.
			if ( ( $is_section || $is_layout ) && 'grid' === $layout ) {
				if ( '' !== $grid_item_padding ) {
					$styles[] = '--sgs-gi-padding:' . esc_attr( sgs_sanitize_grid_template( $grid_item_padding ) );
				}
				if ( '' !== $grid_item_background ) {
					$styles[] = '--sgs-gi-bg:' . esc_attr( sgs_colour_value( $grid_item_background ) );
				}
				if ( '' !== $grid_item_border_radius ) {
					$styles[] = '--sgs-gi-radius:' . esc_attr( sgs_sanitize_grid_template( $grid_item_border_radius ) );
				}
				if ( '' !== $grid_item_border ) {
					$safe_border = preg_replace( '/[^A-Za-z0-9\s%(),.\-#]/', '', $grid_item_border );
					$styles[]    = '--sgs-gi-border:' . esc_attr( trim( $safe_border ) );
				}
				if ( '' !== $grid_item_shadow ) {
					$styles[] = '--sgs-gi-shadow:var(--wp--preset--shadow--' . esc_attr( $grid_item_shadow ) . ')';
				}
				if ( '' !== $grid_item_text_colour ) {
					$styles[] = '--sgs-gi-color:' . esc_attr( sgs_colour_value( $grid_item_text_colour ) );
				}
			}

			// QB-1: gridTemplateRows + gridAutoRows — section + layout kinds.
			if ( ( $is_section || $is_layout ) && 'grid' === $layout ) {
				if ( '' !== trim( (string) $grid_template_rows ) ) {
					$styles[] = 'grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_template_rows ) );
				}
				if ( '' !== trim( (string) $grid_auto_rows ) ) {
					$styles[] = 'grid-auto-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_auto_rows ) );
				}
			}

			// ----------------------------------------------------------------
			// Build CSS classes.
			// ----------------------------------------------------------------
			$classes = array( 'sgs-container' );

			// Composite block class (e.g. 'sgs-hero') is appended directly after the
			// base class so composites carry both sgs-container + their own class.
			if ( '' !== $opt_block_class ) {
				$classes[] = $opt_block_class;
			}

			// Merge extra classes from caller.
			foreach ( $opt_extra_classes as $ec ) {
				if ( '' !== $ec ) {
					$classes[] = $ec;
				}
			}

			if ( '' !== $layout ) {
				$classes[] = 'sgs-container--' . esc_attr( $layout );
			}
			if ( '' !== $max_width ) {
				$classes[] = 'sgs-container--width-' . esc_attr( $max_width );
			}

			// widthMode alignment classes.
			if ( 'wide' === $width_mode ) {
				$classes[] = 'alignwide';
			} elseif ( 'full' === $width_mode ) {
				$classes[] = 'alignfull';
			} elseif ( 'custom' === $width_mode && $custom_width_value > 0 ) {
				$styles[] = 'max-width:' . $custom_width_value . $custom_width_unit;
				$styles[] = 'margin-inline:auto';
			}

			// style.dimensions.maxWidth.
			$style_dim = $attributes['style']['dimensions'] ?? array();
			if ( ! empty( $style_dim['maxWidth'] ) ) {
				$styles[] = 'max-width:' . esc_attr( $style_dim['maxWidth'] );
			}

			// Min-height flex-centring class.
			if ( $is_section && ! empty( $min_height ) ) {
				$classes[] = 'sgs-container--has-min-height';
			}

			// Background mode classes — section kind only.
			if ( $is_section ) {
				if ( $has_bg_image && ! $has_bg_video ) {
					$classes[] = 'sgs-container--has-bg-image';
					if ( $bg_parallax ) {
						$classes[] = 'sgs-container--parallax';
					}
					if ( $bg_ken_burns ) {
						$classes[] = 'sgs-container--ken-burns';
					}
				}
				if ( $has_bg_video ) {
					$classes[] = 'sgs-container--has-bg-video';
				}
				if ( $has_bg_svg ) {
					$classes[] = 'sgs-container--has-bg-svg';
					$classes[] = 'sgs-container--svg-' . esc_attr( $bg_svg_position );
					$classes[] = 'sgs-container--svg-anim-' . esc_attr( $bg_svg_animation );
					$classes[] = 'sgs-container--svg-speed-' . esc_attr( $bg_svg_speed );
					if ( $bg_svg_text_shadow ) {
						$classes[] = 'sgs-container--svg-text-shadow';
					}
				}
			}

			// Grid column count classes — section + layout kinds.
			if ( ( $is_section || $is_layout ) && 'grid' === $layout ) {
				$classes[] = 'sgs-cols-' . absint( $columns );
				if ( $columns_tablet ) {
					$classes[] = 'sgs-cols-tablet-' . absint( $columns_tablet );
				}
				if ( $columns_mobile ) {
					$classes[] = 'sgs-cols-mobile-' . absint( $columns_mobile );
				}
			}

			// ----------------------------------------------------------------
			// First call to get_block_wrapper_attributes() — before shapes/uid.
			// This mirrors the original render.php ~line 398 first-pass call.
			// ----------------------------------------------------------------
			$wrapper_attributes = get_block_wrapper_attributes(
				array(
					'class' => implode( ' ', $classes ),
					'style' => implode( ';', $styles ) . ';',
				)
			);

			// ----------------------------------------------------------------
			// Video HTML — section kind only.
			// ----------------------------------------------------------------
			$video_html = '';
			if ( $is_section && $has_bg_video ) {
				$desktop_src = esc_url( $bg_video['url'] );
				$mobile_src  = ! empty( $bg_video_mobile['url'] ) ? esc_url( $bg_video_mobile['url'] ) : $desktop_src;

				if ( $desktop_src === $mobile_src ) {
					$video_html = sprintf(
						'<video class="sgs-container__video-bg" autoplay loop muted playsinline preload="none" aria-hidden="true">' .
						'<source src="%s" type="video/mp4"></video>',
						$desktop_src
					);
				} else {
					$video_html = sprintf(
						'<video class="sgs-container__video-bg sgs-container__video-bg--responsive" autoplay loop muted playsinline preload="none" aria-hidden="true"' .
						' data-src-desktop="%s" data-src-mobile="%s">' .
						'<source src="%s" type="video/mp4"></video>',
						esc_attr( $desktop_src ),
						esc_attr( $mobile_src ),
						$desktop_src
					);
				}
			}

			// ----------------------------------------------------------------
			// Overlay HTML — section kind only; suppressed by no_overlay opt (C3).
			// ----------------------------------------------------------------
			$overlay_html = '';
			if ( $is_section && ! $opt_no_overlay ) {
				$has_any_bg         = $has_bg_image || $has_bg_video;
				$has_overlay_colour = $overlay_colour || ( $overlay_gradient && $overlay_gradient_from );

				if ( $has_any_bg && $has_overlay_colour ) {
					if ( $overlay_gradient && $overlay_gradient_from ) {
						$grad_from     = sgs_colour_value( $overlay_gradient_from );
						$grad_to       = $overlay_gradient_to ? sgs_colour_value( $overlay_gradient_to ) : 'transparent';
						$overlay_style = sprintf(
							'background-image:linear-gradient(%ddeg,%s,%s);opacity:%s',
							$overlay_gradient_angle,
							$grad_from,
							$grad_to,
							esc_attr( $overlay_opacity / 100 )
						);
					} else {
						$overlay_style = sprintf(
							'background-color:%s;opacity:%s',
							sgs_colour_value( $overlay_colour ),
							esc_attr( $overlay_opacity / 100 )
						);
					}
					$overlay_html = '<span class="sgs-container__overlay" style="' . esc_attr( $overlay_style ) . '" aria-hidden="true"></span>';
				}
			}

			// ----------------------------------------------------------------
			// Shape dividers — section kind only.
			// ----------------------------------------------------------------
			$shape_top_html    = '';
			$shape_bottom_html = '';

			if ( $is_section ) {
				$shape_top    = $attributes['shapeDividerTop'] ?? '';
				$shape_bottom = $attributes['shapeDividerBottom'] ?? '';

				if ( $shape_top ) {
					$shape_top_html = sgs_render_shape_divider(
						$shape_top,
						sgs_colour_value( $attributes['shapeDividerTopColour'] ?? 'surface' ),
						(int) ( $attributes['shapeDividerTopHeight'] ?? 60 ),
						! empty( $attributes['shapeDividerTopFlip'] ),
						! empty( $attributes['shapeDividerTopInvert'] ),
						'top'
					);
				}

				if ( $shape_bottom ) {
					$shape_bottom_html = sgs_render_shape_divider(
						$shape_bottom,
						sgs_colour_value( $attributes['shapeDividerBottomColour'] ?? 'surface' ),
						(int) ( $attributes['shapeDividerBottomHeight'] ?? 60 ),
						! empty( $attributes['shapeDividerBottomFlip'] ),
						! empty( $attributes['shapeDividerBottomInvert'] ),
						'bottom'
					);
				}

				if ( $shape_top || $shape_bottom ) {
					$classes[] = 'sgs-container--has-shape-divider';
				}
			} else {
				$shape_top    = '';
				$shape_bottom = '';
			}

			// ----------------------------------------------------------------
			// Responsive CSS + uid — section + layout kinds with responsive attrs.
			// ----------------------------------------------------------------
			$responsive_css      = '';
			$has_responsive_bg   = $is_section && ( ! empty( $bg_image_tablet['url'] ) || ! empty( $bg_image_mobile['url'] ) );
			$has_responsive_attr = ( $gap_tablet || $gap_mobile || $width_mode_mobile || $width_mode_tablet || $width_mode_desktop || $has_responsive_bg )
				|| ( ( $is_section || $is_layout ) && ( $grid_template_tablet || $grid_template_mobile || $grid_template_rows_tablet || $grid_template_rows_mobile ) );

			// uid also needed when parallax/ken-burns is active or bg-video is responsive.
			$needs_uid = $has_responsive_attr
				|| ( $is_section && ( $bg_parallax || $bg_ken_burns ) )
				|| ( $is_section && $has_bg_video && ! empty( $bg_video_mobile['url'] ) );

			$uid = '';
			if ( $needs_uid ) {
				$anchor    = ( $block instanceof \WP_Block ) ? ( $block->parsed_block['attrs']['anchor'] ?? '' ) : '';
				$uid       = 'sgs-container-' . substr( md5( wp_json_encode( $attributes ) . $anchor ), 0, 8 );
				$classes[] = $uid;
			}

			if ( $has_responsive_attr ) {
				if ( $gap_tablet ) {
					$responsive_css .= '@media (max-width:1023px){.' . $uid . '{gap:' . sgs_container_gap_value( $gap_tablet ) . '}}';
				}
				if ( $gap_mobile ) {
					$responsive_css .= '@media (max-width:599px){.' . $uid . '{gap:' . sgs_container_gap_value( $gap_mobile ) . '}}';
				}

				$width_mode_to_css = static function ( $mode ) use ( $custom_width_value, $custom_width_unit ) {
					if ( 'wide' === $mode ) {
						return 'max-width:var(--wp--style--global--wide-size,1200px)';
					}
					if ( 'default' === $mode ) {
						return 'max-width:var(--wp--style--global--content-size,780px)';
					}
					if ( 'full' === $mode ) {
						return 'max-width:none';
					}
					if ( 'custom' === $mode && $custom_width_value > 0 ) {
						return 'max-width:' . $custom_width_value . $custom_width_unit;
					}
					return '';
				};

				if ( '' !== $width_mode_mobile ) {
					$decl = $width_mode_to_css( $width_mode_mobile );
					if ( '' !== $decl ) {
						$responsive_css .= '@media (max-width:599px){.' . $uid . '{' . $decl . '}}';
					}
				}
				if ( '' !== $width_mode_tablet ) {
					$decl = $width_mode_to_css( $width_mode_tablet );
					if ( '' !== $decl ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{' . $decl . '}}';
					}
				}
				if ( '' !== $width_mode_desktop ) {
					$decl = $width_mode_to_css( $width_mode_desktop );
					if ( '' !== $decl ) {
						$responsive_css .= '@media (min-width:1024px){.' . $uid . '{' . $decl . '}}';
					}
				}

				// Responsive bg image overrides — section kind only.
				if ( $is_section ) {
					if ( ! empty( $bg_image_tablet['url'] ) ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{background-image:url(' . esc_url( $bg_image_tablet['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
					}
					if ( ! empty( $bg_image_mobile['url'] ) ) {
						$responsive_css .= '@media (max-width:599px){.' . $uid . '{background-image:url(' . esc_url( $bg_image_mobile['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
					}
				}

				// QB-2: Responsive gridTemplateColumns — section + layout kinds.
				if ( $is_section || $is_layout ) {
					if ( '' !== sgs_sanitize_grid_template( $grid_template_tablet ) ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-columns:' . sgs_sanitize_grid_template( $grid_template_tablet ) . '}}';
					}
					if ( '' !== sgs_sanitize_grid_template( $grid_template_mobile ) ) {
						$responsive_css .= '@media (max-width:599px){.' . $uid . '{grid-template-columns:' . sgs_sanitize_grid_template( $grid_template_mobile ) . '}}';
					}

					// QB-1: Responsive gridTemplateRows — section + layout kinds.
					if ( '' !== sgs_sanitize_grid_template( $grid_template_rows_tablet ) ) {
						$responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-rows:' . sgs_sanitize_grid_template( $grid_template_rows_tablet ) . '}}';
					}
					if ( '' !== sgs_sanitize_grid_template( $grid_template_rows_mobile ) ) {
						$responsive_css .= '@media (max-width:599px){.' . $uid . '{grid-template-rows:' . sgs_sanitize_grid_template( $grid_template_rows_mobile ) . '}}';
					}
				}
			}

			// ----------------------------------------------------------------
			// Rebuild wrapper attributes whenever class list has grown
			// (shapes, uid, bg-video, parallax classes).
			// Mirrors container/render.php conditional rebuild at ~line 581.
			// ----------------------------------------------------------------
			if ( $shape_top || $shape_bottom || $uid ) {
				$wrapper_attributes = get_block_wrapper_attributes(
					array(
						'class' => implode( ' ', $classes ),
						'style' => implode( ';', $styles ) . ';',
					)
				);
			}

			// ----------------------------------------------------------------
			// SVG background HTML — section kind only.
			// ----------------------------------------------------------------
			$svg_html = '';
			if ( $is_section && $has_bg_svg ) {
				$allowed_svg_tags = array(
					'svg'      => array(
						'xmlns'               => true,
						'viewbox'             => true,
						'width'               => true,
						'height'              => true,
						'preserveaspectratio' => true,
						'class'               => true,
						'id'                  => true,
					),
					'g'        => array(
						'transform' => true,
						'class'     => true,
						'id'        => true,
					),
					'path'     => array(
						'd'            => true,
						'fill'         => true,
						'stroke'       => true,
						'stroke-width' => true,
						'class'        => true,
					),
					'circle'   => array(
						'cx'     => true,
						'cy'     => true,
						'r'      => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'rect'     => array(
						'x'      => true,
						'y'      => true,
						'width'  => true,
						'height' => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'polygon'  => array(
						'points' => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'polyline' => array(
						'points' => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'line'     => array(
						'x1'     => true,
						'y1'     => true,
						'x2'     => true,
						'y2'     => true,
						'stroke' => true,
						'class'  => true,
					),
					'ellipse'  => array(
						'cx'     => true,
						'cy'     => true,
						'rx'     => true,
						'ry'     => true,
						'fill'   => true,
						'stroke' => true,
						'class'  => true,
					),
					'text'     => array(
						'x'           => true,
						'y'           => true,
						'fill'        => true,
						'font-size'   => true,
						'font-family' => true,
						'class'       => true,
					),
					'defs'     => array(),
					'style'    => array( 'type' => true ),
					'animate'  => array(
						'attributename' => true,
						'from'          => true,
						'to'            => true,
						'dur'           => true,
						'repeatcount'   => true,
					),
				);

				$svg_html = sprintf(
					'<div class="sgs-container__svg-bg" style="--sgs-svg-opacity:%s;" aria-hidden="true">%s</div>',
					esc_attr( $bg_svg_opacity / 100 ),
					wp_kses( $bg_svg_content, $allowed_svg_tags )
				);
			}

			// SVG position routing.
			$svg_bg_html = ( $has_bg_svg && 'background' === $bg_svg_position ) ? $svg_html : '';
			$svg_fg_html = ( $has_bg_svg && 'foreground' === $bg_svg_position ) ? $svg_html : '';

			// ----------------------------------------------------------------
			// Responsive <style> tag — prepended to output.
			// ----------------------------------------------------------------
			$style_tag = '';
			if ( $responsive_css && $uid ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $responsive_css contains only previously-escaped CSS rules.
				$style_tag = sprintf( '<style id="%s">%s</style>', esc_attr( $uid ), $responsive_css );
			}

			// ----------------------------------------------------------------
			// Content-width inner wrapper (__inner) guard.
			// Default: fires when contentWidth is set AND layout is empty (no grid/flex).
			// Caller can override via $opts['wrap_inner'] => bool.
			// ----------------------------------------------------------------
			$inner_open  = '';
			$inner_close = '';
			$do_wrap     = null !== $opt_wrap_inner ? (bool) $opt_wrap_inner : ( '' !== $content_width && '' === $layout );
			if ( $do_wrap ) {
				$inner_open  = '<div class="sgs-container__inner" style="max-width:' . esc_attr( $content_width ) . ';margin-inline:auto">';
				$inner_close = '</div>';
			}

			// ----------------------------------------------------------------
			// Final assembly — order mirrors container/render.php printf exactly:
			// shape_top / video / overlay / svg_bg / [__inner] content [/__inner] / svg_fg / shape_bottom
			// ----------------------------------------------------------------
			// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- All variables pre-sanitised: $html_tag allowlisted, $wrapper_attributes from get_block_wrapper_attributes(), HTML vars built with esc_*/wp_kses(), $inner_html is caller-rendered blocks, $inner_open/$inner_close built with esc_attr().
			$element = sprintf(
				'<%1$s %2$s>%3$s%4$s%5$s%6$s%7$s%8$s%9$s</%1$s>',
				$html_tag,
				$wrapper_attributes,
				$shape_top_html,
				$video_html,
				$overlay_html,
				$svg_bg_html,
				$inner_open . $inner_html . $inner_close,
				$svg_fg_html,
				$shape_bottom_html
			);
			// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

			return $style_tag . $element;
		}
	}
}
