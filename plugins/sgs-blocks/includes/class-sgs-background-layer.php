<?php
/**
 * SGS_Background_Layer — the background logic of the shared container wrapper.
 *
 * Owns every background decision SGS_Container_Wrapper::render() makes: reading the
 * background attributes, the image <img> fast path and the CSS media layer on
 * `.{uid}::before`, the background video, the colour/gradient overlay, the inline SVG
 * layer, the modifier classes and the scoped CSS each of them emits. Every method is
 * static and takes what it needs as arguments; nothing reads the wrapper's state.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/render-helpers.php';
require_once __DIR__ . '/motion/class-sgs-motion-background-lottie.php';

if ( ! class_exists( 'SGS_Background_Layer' ) ) {

	/**
	 * Static helper — called from SGS_Container_Wrapper::render().
	 */
	final class SGS_Background_Layer {

		/**
		 * Read and validate the image, video and overlay attributes.
		 *
		 * Background attributes read universally: a block gets a working background only
		 * when its own block.json declares them (WordPress never passes an undeclared
		 * attribute), so there is no kind gate.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @param array<string,mixed> $opts       The wrapper's options (`no_background_holder`).
		 * @return array<string,mixed> Keys: image, image_tablet, image_mobile, size, position, repeat,
		 *                             attachment, overlay_colour, overlay_opacity, overlay_gradient,
		 *                             overlay_opacity_tablet, overlay_opacity_mobile, video, video_tablet,
		 *                             video_mobile, has_lottie_layer, has_image, has_video.
		 */
		public static function read( array $attributes, array $opts ): array {
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
			$overlay_colour = $attributes['backgroundOverlayColour'] ?? '';
			// backgroundOverlayOpacity is a TIER OBJECT {desktop,tablet,mobile}. A raw read would hand
			// sgs_overlay_decls() an array, which is_numeric() silently rejects, so the desktop opacity
			// would vanish with no error.
			$overlay_opacity_obj = sgs_responsive_normalise_object( $attributes['backgroundOverlayOpacity'] ?? null );
			$overlay_opacity     = $overlay_opacity_obj['desktop'] ?? null;
			// overlayGradient holds the complete CSS gradient value (any stop count), validated through
			// sgs_css_gradient_value() at the point of emission.
			$overlay_gradient = $attributes['overlayGradient'] ?? '';
			// The responsive tier axis lives on OPACITY, not colour. null means "this tier does not override".
			$overlay_opacity_tablet = $overlay_opacity_obj['tablet'] ?? null;
			$overlay_opacity_mobile = $overlay_opacity_obj['mobile'] ?? null;
			$bg_video               = $attributes['bgVideo'] ?? null;
			$bg_video_tablet        = $attributes['bgVideoTablet'] ?? null;
			$bg_video_mobile        = $attributes['bgVideoMobile'] ?? null;
			// A `lottie` layer on the background part plays in a holder the wrapper prints (Spec 38A FR-38A-52).
			$has_bg_lottie_layer = empty( $opts['no_background_holder'] ) && \SGS\Blocks\Motion\Sgs_Motion_Background_Lottie::has_layer( $attributes );

			return array(
				'image'                  => $bg_image,
				'image_tablet'           => $bg_image_tablet,
				'image_mobile'           => $bg_image_mobile,
				'size'                   => $bg_size,
				'position'               => $bg_position,
				'repeat'                 => $bg_repeat,
				'attachment'             => $bg_attachment,
				'overlay_colour'         => $overlay_colour,
				'overlay_opacity'        => $overlay_opacity,
				'overlay_gradient'       => $overlay_gradient,
				'overlay_opacity_tablet' => $overlay_opacity_tablet,
				'overlay_opacity_mobile' => $overlay_opacity_mobile,
				'video'                  => $bg_video,
				'video_tablet'           => $bg_video_tablet,
				'video_mobile'           => $bg_video_mobile,
				'has_lottie_layer'       => $has_bg_lottie_layer,
				'has_image'              => ! empty( $bg_image['url'] ),
				'has_video'              => ! empty( $bg_video['url'] ),
			);
		}

		/**
		 * Read and validate the inline SVG background attributes.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @return array<string,mixed> Keys: content, position, opacity, min_height, text_shadow, has_svg.
		 */
		public static function read_svg( array $attributes ): array {
			$bg_svg_content        = $attributes['bgSvgContent'] ?? '';
			$bg_svg_position       = $attributes['bgSvgPosition'] ?? 'background';
			$allowed_svg_positions = array( 'background', 'foreground' );
			if ( ! in_array( $bg_svg_position, $allowed_svg_positions, true ) ) {
				$bg_svg_position = 'background';
			}
			$bg_svg_opacity     = isset( $attributes['bgSvgOpacity'] ) ? absint( $attributes['bgSvgOpacity'] ) : 100;
			$bg_svg_min_height  = is_string( $attributes['bgSvgMinHeight'] ?? null ) ? sgs_css_length_value( $attributes['bgSvgMinHeight'] ) : '';
			$bg_svg_text_shadow = ! empty( $attributes['bgSvgTextShadow'] );

			return array(
				'content'     => $bg_svg_content,
				'position'    => $bg_svg_position,
				'opacity'     => $bg_svg_opacity,
				'min_height'  => $bg_svg_min_height,
				'text_shadow' => $bg_svg_text_shadow,
				'has_svg'     => ! empty( $bg_svg_content ),
			);
		}

		/**
		 * The image media: the real <img> fast path, or the CSS layer on `.{uid}::before`.
		 *
		 * A CSS background-image is invisible to the browser's preload scanner until the
		 * render-blocking stylesheet that declares it has downloaded; a real <img> is not.
		 * `is_simple` gates the <img> path to what it can express faithfully: no tiling, cover
		 * or contain only, no fixed attachment and no tablet or mobile tier (the tiers swap the
		 * image on the ::before layer inside @media rules, which an <img> does not join).
		 *
		 * The declarations are built here and emitted by scoped_css() once $uid exists.
		 *
		 * @param array<string,mixed> $bg        Result of read().
		 * @param string              $img_class Extra class on the background <img>.
		 * @return array<string,mixed> Keys: is_simple, img_html, img_style_decls, video_style_decls, layer_decls.
		 */
		public static function media( array $bg, string $img_class ): array {
			$bg_image        = $bg['image'];
			$bg_image_tablet = $bg['image_tablet'];
			$bg_image_mobile = $bg['image_mobile'];
			$bg_size         = $bg['size'];
			$bg_position     = $bg['position'];
			$bg_repeat       = $bg['repeat'];
			$bg_attachment   = $bg['attachment'];
			$has_bg_image    = $bg['has_image'];
			$has_bg_video    = $bg['has_video'];

			$sgs_bg_img_is_simple = ( 'no-repeat' === $bg_repeat )
				&& in_array( $bg_size, array( 'cover', 'contain' ), true )
				&& 'fixed' !== $bg_attachment
				&& empty( $bg_image_tablet['url'] )
				&& empty( $bg_image_mobile['url'] );

			$bg_img_html = '';
			if ( $has_bg_image && ! $has_bg_video && $sgs_bg_img_is_simple ) {
				// PAGE-SCOPED counter: LCP priority is a property of the page's render order, so the
				// same shared counter sgs/hero uses decides which background image is first on the page.
				$sgs_bg_img_is_first = 1 === sgs_next_background_image_index();

				$bg_img_html = sgs_responsive_image(
					! empty( $bg_image['id'] ) ? absint( $bg_image['id'] ) : 0,
					$bg_image['url'],
					'',
					'full',
					array(
						'class'         => trim( ( $bg['has_lottie_layer'] ? \SGS\Blocks\Motion\Sgs_Motion_Background_Lottie::POSTER_CLASS : 'sgs-container__image-bg' ) . ' ' . $img_class ),
						'aria-hidden'   => 'true',
						'fetchpriority' => $sgs_bg_img_is_first ? 'high' : 'auto',
						'loading'       => $sgs_bg_img_is_first ? 'eager' : 'lazy',
						'decoding'      => $sgs_bg_img_is_first ? 'sync' : 'async',
					)
				);
			}

			// object-fit/object-position for the <img> path: the values route to the scoped <style>,
			// never onto the <img> tag (Spec 32 no-inline contract).
			$sgs_bg_img_style_decls = array();
			if ( '' !== $bg_img_html ) {
				$sgs_bg_img_style_decls[] = 'object-fit:' . esc_attr( $bg_size );
				$sgs_bg_img_style_decls[] = 'object-position:' . esc_attr( $bg_position );
			}

			// object-fit/object-position for the <video> background: the same size/position pair
			// the whole Background panel writes.
			$sgs_bg_video_style_decls = array();
			if ( $has_bg_video ) {
				$sgs_bg_video_style_decls[] = 'object-fit:' . esc_attr( $bg_size );
				$sgs_bg_video_style_decls[] = 'object-position:' . esc_attr( $bg_position );
			}

			// The CSS media layer: the image paints on `.{uid}::before`, below the overlay span
			// (z-index 0) and the content (z-index 1). Its box properties are emitted here, not as a
			// blanket style.css rule, so ::before only becomes a box on containers with a background
			// image. `content` is mandatory or ::before generates no box.
			$sgs_media_layer_decls = array();
			if ( $has_bg_image && ! $has_bg_video && ! $sgs_bg_img_is_simple ) {
				$sgs_media_layer_decls[] = 'content:""';
				$sgs_media_layer_decls[] = 'position:absolute';
				$sgs_media_layer_decls[] = 'inset:0';
				$sgs_media_layer_decls[] = 'z-index:-1';
				$sgs_media_layer_decls[] = 'pointer-events:none';
				$sgs_media_layer_decls[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
				$sgs_media_layer_decls[] = 'background-size:' . esc_attr( $bg_size );
				$sgs_media_layer_decls[] = 'background-position:' . esc_attr( $bg_position );
				$sgs_media_layer_decls[] = 'background-repeat:' . esc_attr( $bg_repeat );
				if ( 'fixed' === $bg_attachment ) {
					$sgs_media_layer_decls[] = 'background-attachment:fixed';
				}
			}

			return array(
				'is_simple'         => $sgs_bg_img_is_simple,
				'img_html'          => $bg_img_html,
				'img_style_decls'   => $sgs_bg_img_style_decls,
				'video_style_decls' => $sgs_bg_video_style_decls,
				'layer_decls'       => $sgs_media_layer_decls,
			);
		}

		/**
		 * The modifier classes the background adds to the wrapper element.
		 *
		 * @param array<string,mixed> $bg  Result of read().
		 * @param array<string,mixed> $svg Result of read_svg().
		 * @return string[]
		 */
		public static function modifier_classes( array $bg, array $svg ): array {
			$classes = array();
			if ( $bg['has_image'] && ! $bg['has_video'] ) {
				$classes[] = 'sgs-container--has-bg-image';
			}
			if ( $bg['has_video'] ) {
				$classes[] = 'sgs-container--has-bg-video';
			}
			if ( $svg['has_svg'] ) {
				$classes[] = 'sgs-container--has-bg-svg';
				$classes[] = 'sgs-container--svg-' . esc_attr( $svg['position'] );
				if ( $svg['text_shadow'] ) {
					$classes[] = 'sgs-container--svg-text-shadow';
				}
				if ( ! empty( $svg['min_height'] ) ) {
					$classes[] = 'sgs-container--has-svg-min-height';
				}
			}
			return $classes;
		}

		/**
		 * The background <video> markup, with the per-device sources when a tier is set.
		 *
		 * @param array<string,mixed> $bg Result of read().
		 * @return string
		 */
		public static function video_html( array $bg ): string {
			$bg_video        = $bg['video'];
			$bg_video_tablet = $bg['video_tablet'];
			$bg_video_mobile = $bg['video_mobile'];

			$video_html = '';
			if ( $bg['has_video'] ) {
				$has_bg_video_tablet = ! empty( $bg_video_tablet['url'] );
				$desktop_src         = esc_url( $bg_video['url'] );
				// Fall back upward when a tier has no override: tablet falls back to desktop, mobile
				// falls back to tablet, mirroring the client-side swapVideoSrc() fallback.
				$tablet_src = $has_bg_video_tablet ? esc_url( $bg_video_tablet['url'] ) : $desktop_src;
				$mobile_src = ! empty( $bg_video_mobile['url'] ) ? esc_url( $bg_video_mobile['url'] ) : $tablet_src;

				if ( $desktop_src === $tablet_src && $tablet_src === $mobile_src ) {
					$video_html = sprintf(
						'<video class="sgs-container__video-bg" autoplay loop muted playsinline preload="none" aria-hidden="true">' .
						'<source src="%s" type="video/mp4"></video>',
						$desktop_src
					);
				} else {
					// data-src-tablet is printed only when a tablet override was set.
					$tablet_attr = $has_bg_video_tablet ? sprintf( ' data-src-tablet="%s"', esc_attr( $tablet_src ) ) : '';
					$video_html  = sprintf(
						'<video class="sgs-container__video-bg sgs-container__video-bg--responsive" autoplay loop muted playsinline preload="none" aria-hidden="true"' .
						' data-src-desktop="%s"%s data-src-mobile="%s">' .
						'<source src="%s" type="video/mp4"></video>',
						esc_attr( $desktop_src ),
						$tablet_attr,
						esc_attr( $mobile_src ),
						$desktop_src
					);
				}
			}
			return $video_html;
		}

		/**
		 * The background Lottie layer's holder takes the image's place, with the image inside
		 * as its poster; a video gives way to it.
		 *
		 * @param bool   $has_lottie_layer Whether a lottie layer sits on the background part.
		 * @param string $bg_img_html      The <img> markup.
		 * @param string $video_html       The <video> markup.
		 * @return string[] array( image markup, video markup ).
		 */
		public static function lottie_holder( bool $has_lottie_layer, string $bg_img_html, string $video_html ): array {
			if ( $has_lottie_layer ) {
				$bg_img_html = \SGS\Blocks\Motion\Sgs_Motion_Background_Lottie::holder( $bg_img_html );
				$video_html  = '';
			}
			return array( $bg_img_html, $video_html );
		}

		/**
		 * The overlay span and its paint declarations.
		 *
		 * sgs_overlay_decls() yields '' when there is nothing to paint, so "is there an overlay?"
		 * and "what does it paint?" are one decision. The paint is emitted by scoped_css() as the
		 * scoped overlay rule, never inline on the span.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @param bool                $no_overlay True when the caller suppresses the overlay layer.
		 * @return string[] array( overlay markup, overlay declarations ).
		 */
		public static function overlay( array $attributes, bool $no_overlay ): array {
			$overlay_html  = '';
			$overlay_decls = '';
			if ( ! $no_overlay ) {
				// backgroundOverlayOpacity is a tier object; its desktop value is the base opacity.
				$overlay_opacity_obj    = sgs_responsive_normalise_object( $attributes['backgroundOverlayOpacity'] ?? null );
				$overlay_decls_computed = sgs_overlay_decls(
					$attributes['backgroundOverlayColour'] ?? '',
					$attributes['overlayGradient'] ?? '',
					$overlay_opacity_obj['desktop'] ?? null,
					$attributes['backgroundOverlayBlendMode'] ?? ''
				);
				if ( '' !== $overlay_decls_computed ) {
					$overlay_decls = $overlay_decls_computed;
					$overlay_html  = '<span class="sgs-container__overlay" aria-hidden="true"></span>';
				}
			}
			return array( $overlay_html, $overlay_decls );
		}

		/**
		 * The scoped CSS for the media layer, the <img> and <video> object-fit rules and the overlay.
		 *
		 * Must be appended before the @media tier overrides of tier_css() so a narrower viewport
		 * still wins.
		 *
		 * @param string              $uid           The instance scope class.
		 * @param array<string,mixed> $media         Result of media().
		 * @param string              $overlay_decls Overlay declarations from overlay().
		 * @param array<string,mixed> $bg            Result of read().
		 * @param array<string,mixed> $attributes    Block attributes, verbatim (the hover siblings).
		 * @return string
		 */
		public static function scoped_css( string $uid, array $media, string $overlay_decls, array $bg, array $attributes ): string {
			$css = '';

			if ( $media['layer_decls'] && $uid ) {
				$css .= '.' . $uid . '::before{' . implode( ';', $media['layer_decls'] ) . '}';
			}

			// The <img> and the <video> sit directly inside .{uid}, so each rule targets it as a direct child.
			if ( $media['img_style_decls'] && $uid ) {
				$css .= '.' . $uid . ' > .sgs-container__image-bg{' . implode( ';', $media['img_style_decls'] ) . '}';
			}

			if ( $media['video_style_decls'] && $uid ) {
				$css .= '.' . $uid . ' > .sgs-container__video-bg{' . implode( ';', $media['video_style_decls'] ) . '}';
			}

			// $overlay_decls is pre-sanitised (sgs_colour_value + esc_attr on the opacity/angle).
			if ( '' !== $overlay_decls && $uid ) {
				$css .= '.' . $uid . ' .sgs-container__overlay{' . $overlay_decls . '}';

				// Overlay HOVER state: only colour/gradient change, so opacity and blend mode are not
				// re-passed. Gated on the span existing at all.
				$overlay_colour_hover   = $attributes['backgroundOverlayColourHover'] ?? '';
				$overlay_gradient_hover = $attributes['overlayGradientHover'] ?? '';
				if ( '' !== $overlay_colour_hover || '' !== $overlay_gradient_hover ) {
					$overlay_hover_paint = sgs_overlay_decls( $overlay_colour_hover, $overlay_gradient_hover );
					if ( '' !== $overlay_hover_paint ) {
						$css .= sgs_emit_state_colour_css(
							'.' . $uid . ' .sgs-container__overlay',
							array(),
							array( $overlay_hover_paint )
						);
					}
				}

				// Overlay responsive TIERS: only the opacity declaration is re-emitted, never the whole
				// paint, so colour, gradient and blend mode keep one owner. An unset tier inherits the
				// desktop rule by cascade.
				$overlay_opacity_tablet = $bg['overlay_opacity_tablet'];
				$overlay_opacity_mobile = $bg['overlay_opacity_mobile'];
				if ( null !== $overlay_opacity_tablet && '' !== $overlay_opacity_tablet ) {
					$css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . ' .sgs-container__overlay{opacity:' . esc_attr( (float) $overlay_opacity_tablet / 100 ) . '}}';
				}
				if ( null !== $overlay_opacity_mobile && '' !== $overlay_opacity_mobile ) {
					$css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . ' .sgs-container__overlay{opacity:' . esc_attr( (float) $overlay_opacity_mobile / 100 ) . '}}';
				}
			}

			return $css;
		}

		/**
		 * The tablet and mobile image overrides.
		 *
		 * They target the same ::before media layer as the base tier; targeting the scope class
		 * itself would leave the desktop image showing through underneath.
		 *
		 * @param string              $uid The instance scope class.
		 * @param array<string,mixed> $bg  Result of read().
		 * @return string
		 */
		public static function tier_css( string $uid, array $bg ): string {
			$css             = '';
			$bg_image_tablet = $bg['image_tablet'];
			$bg_image_mobile = $bg['image_mobile'];
			$bg_size         = $bg['size'];
			$bg_position     = $bg['position'];
			if ( ! empty( $bg_image_tablet['url'] ) ) {
				$css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . '::before{background-image:url(' . esc_url( $bg_image_tablet['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
			}
			if ( ! empty( $bg_image_mobile['url'] ) ) {
				$css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . '::before{background-image:url(' . esc_url( $bg_image_mobile['url'] ) . ');background-size:' . esc_attr( $bg_size ) . ';background-position:' . esc_attr( $bg_position ) . '}}';
			}
			return $css;
		}

		/**
		 * The scoped rule that carries the SVG layer's opacity.
		 *
		 * The custom-property VALUE is scoped to the instance, never inline on the layer div.
		 *
		 * @param string              $uid The instance scope class.
		 * @param array<string,mixed> $svg Result of read_svg().
		 * @return string
		 */
		public static function svg_opacity_css( string $uid, array $svg ): string {
			if ( $svg['has_svg'] && $uid ) {
				return '.' . $uid . ' .sgs-container__svg-bg{--sgs-svg-opacity:' . esc_attr( $svg['opacity'] / 100 ) . ';}';
			}
			return '';
		}

		/**
		 * The inline SVG background layer markup.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim (`bgSvgParts`, `bgSvgPartsTrigger`).
		 * @param array<string,mixed> $svg        Result of read_svg().
		 * @return string
		 */
		public static function svg_html( array $attributes, array $svg ): string {
			$svg_html = '';
			if ( $svg['has_svg'] ) {
				$allowed_svg_tags = sgs_allowed_svg_tags();

				// A motion layer on the `svg-bg` part (the `draw` effect) reaches this element through the
				// part's own selector, so the div carries no effect attributes of its own.
				// A block that stores `bgSvgParts` animates named parts of the SVG: the cleaned document rides on the
				// layer as `data-sgs-svg-parts`, read by src/shared/svg-parts/svg-parts.js. Nothing is printed without parts.
				$svg_parts_attr = '';
				if ( ! empty( $attributes['bgSvgParts'] ) ) {
					require_once __DIR__ . '/helpers-svg-parts.php';
					$svg_parts_json = sgs_svg_parts_data( $attributes['bgSvgParts'], (string) ( $attributes['bgSvgPartsTrigger'] ?? 'load' ) );
					$svg_parts_attr = '' !== $svg_parts_json ? ' data-sgs-svg-parts="' . esc_attr( $svg_parts_json ) . '"' : '';
				}
				$svg_html = sprintf(
					'<div class="sgs-container__svg-bg"%s aria-hidden="true">%s</div>',
					$svg_parts_attr,
					wp_kses( $svg['content'], $allowed_svg_tags )
				);
			}
			return $svg_html;
		}
	}
}
