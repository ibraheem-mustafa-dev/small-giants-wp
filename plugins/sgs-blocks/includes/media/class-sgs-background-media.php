<?php
/**
 * SGS_Background_Media — the adopted background of the shared container wrapper (Spec 49 §7.8).
 *
 * Every block that runs through the wrapper renders its background through this class. A block that declares no
 * background attributes gets an empty plan, so it prints no background element.
 *
 * What is printed is `includes/media/render-background.php`'s: one `.sgs-bg-media` element holding the picture, the tile
 * layer, the video or the SVG, then `.sgs-bg-overlay`. The kept SVG layer (`bgSvg*`, an SVG drawn over an image or
 * video) is the block's own, unchanged: it prints through this class's `svg_html()`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/render-background.php';

if ( ! class_exists( 'SGS_Background_Media' ) ) {

	/**
	 * Static helper — called from SGS_Container_Wrapper::render().
	 */
	final class SGS_Background_Media {

		/**
		 * Read what the wrapper needs to know about the background, without printing anything.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @param array<string,mixed> $opts       The wrapper's options (`no_background_holder`, `hidden_surface`).
		 * @return array<string,mixed> Keys the wrapper reads (`image`, `overlay_*`, `has_image`, `has_video`, `has_lottie_layer`, the legacy tier keys as null) plus `adopted`, `attrs` and `plan`.
		 */
		public static function read( array $attributes, array $opts ): array {
			$slot    = sgs_bg_media_slot();
			$plan    = sgs_bg_media_plan( $slot, $attributes );
			$image   = null;
			foreach ( $plan['sources'] as $source ) {
				if ( $source && 'image' === $source['kind'] ) {
					$image = $source;
					break;
				}
			}
			$opacity = sgs_responsive_normalise_object( $attributes['backgroundOverlayOpacity'] ?? null );
			return array(
				'adopted'                => true,
				'attrs'                  => $attributes,
				'plan'                   => $plan,
				'hidden'                 => ! empty( $opts['hidden_surface'] ),
				'image'                  => $image,
				'image_tablet'           => null,
				'image_mobile'           => null,
				'overlay_colour'         => $attributes['backgroundOverlayColour'] ?? '',
				'overlay_opacity'        => $opacity['desktop'] ?? null,
				'overlay_gradient'       => $attributes['backgroundOverlayGradient'] ?? '',
				'overlay_opacity_tablet' => $opacity['tablet'] ?? null,
				'overlay_opacity_mobile' => $opacity['mobile'] ?? null,
				'video'                  => null,
				'video_tablet'           => null,
				'video_mobile'           => null,
				'has_lottie_layer'       => empty( $opts['no_background_holder'] ) && \SGS\Blocks\Motion\Sgs_Motion_Background_Lottie::has_layer( $attributes ),
				'has_image'              => (bool) array_intersect( array( 'image', 'css' ), array_values( $plan['paint'] ) ),
				'has_video'              => in_array( 'video', $plan['paint'], true ),
				'has_source_svg'         => in_array( 'svg', $plan['paint'], true ),
			);
		}

		/**
		 * The kept SVG layer's attributes (`bgSvg*`): an SVG drawn over an image or video, the block's own.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @return array<string,mixed>
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
		 * The background element (and a lead's preload links), and whether any rule needs a scope class.
		 *
		 * @param array<string,mixed> $bg        Result of read().
		 * @param string              $img_class Unused: the element has one class set.
		 * @return array<string,mixed> `img_html` carries the whole element, `img_style_decls` is non-empty when per-instance CSS is needed.
		 */
		public static function media( array $bg, string $img_class ): array {
			unset( $img_class );
			$slot = sgs_bg_media_slot();
			$done = sgs_bg_media_html( $slot, $bg['attrs'], array( 'hidden' => $bg['hidden'], 'lottie' => $bg['has_lottie_layer'] ) );
			return array(
				'is_simple'         => false,
				'img_html'          => $done['preload'] . $done['html'],
				'img_style_decls'   => '' !== $done['html'] && sgs_bg_media_has_css( $slot, $bg['attrs'] ) ? array( 'scoped' ) : array(),
				'video_style_decls' => array(),
				'layer_decls'       => array(),
				'printed'           => '' !== $done['html'],
				'has_image'         => $done['has_image'],
				'has_video'         => $done['has_video'],
				'has_svg'           => (bool) ( $bg['has_source_svg'] ?? false ),
			);
		}

		/**
		 * The modifier classes the background adds to the wrapper element.
		 *
		 * The state classes keep the names the shared container CSS already keys on (`--has-bg-image`, `--has-bg-video`,
		 * `--has-bg-svg`, `--svg-*`); `--bg-front` is an SVG set to show in front of the content.
		 *
		 * @param array<string,mixed> $bg  Result of read().
		 * @param array<string,mixed> $svg Result of read_svg().
		 * @return string[]
		 */
		public static function modifier_classes( array $bg, array $svg ): array {
			$classes = array();
			if ( $bg['has_image'] ) {
				$classes[] = 'sgs-container--has-bg-image';
			}
			if ( $bg['has_video'] ) {
				$classes[] = 'sgs-container--has-bg-video';
			}
			if ( ! empty( $bg['has_source_svg'] ) ) {
				$classes[] = 'sgs-container--has-bg-svg';
				if ( 'front' === ( $bg['attrs']['backgroundSvgLayer'] ?? 'behind' ) ) {
					$classes[] = 'sgs-container--bg-front';
				}
				if ( ! empty( $bg['attrs']['backgroundSvgTextShadow'] ) ) {
					$classes[] = 'sgs-container--svg-text-shadow';
				}
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
		 * A video prints inside the background element, so there is no separate video markup.
		 *
		 * @param array<string,mixed> $bg Result of read().
		 * @return string
		 */
		public static function video_html( array $bg ): string {
			unset( $bg );
			return '';
		}

		/**
		 * A Lottie layer's holder is the background element itself (it takes the `sgs-container__lottie-bg` class).
		 *
		 * @param bool   $has_lottie_layer Whether a lottie layer sits on the background part.
		 * @param string $bg_img_html      The background element.
		 * @param string $video_html       Unused.
		 * @return string[] array( element markup, '' ).
		 */
		public static function lottie_holder( bool $has_lottie_layer, string $bg_img_html, string $video_html ): array {
			unset( $has_lottie_layer, $video_html );
			return array( $bg_img_html, '' );
		}

		/**
		 * The overlay span and its paint declarations.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @param bool                $no_overlay True when the caller suppresses the overlay layer.
		 * @return string[] array( overlay markup, overlay declarations ).
		 */
		public static function overlay( array $attributes, bool $no_overlay ): array {
			if ( $no_overlay ) {
				return array( '', '' );
			}
			$opacity = sgs_responsive_normalise_object( $attributes['backgroundOverlayOpacity'] ?? null );
			$decls   = sgs_overlay_decls(
				(string) ( $attributes['backgroundOverlayColour'] ?? '' ),
				(string) ( $attributes['backgroundOverlayGradient'] ?? '' ),
				$opacity['desktop'] ?? null,
				(string) ( $attributes['backgroundOverlayBlend'] ?? '' )
			);
			if ( '' === $decls ) {
				return array( '', '' );
			}
			return array( '<span class="' . esc_attr( sgs_bg_media_capability()['overlay_class'] ) . '" aria-hidden="true"></span>', $decls );
		}

		/**
		 * The scoped CSS for the element and the overlay.
		 *
		 * @param string              $uid           The instance scope class.
		 * @param array<string,mixed> $media         Result of media().
		 * @param string              $overlay_decls Overlay declarations from overlay().
		 * @param array<string,mixed> $bg            Result of read().
		 * @param array<string,mixed> $attributes    Block attributes, verbatim.
		 * @return string
		 */
		public static function scoped_css( string $uid, array $media, string $overlay_decls, array $bg, array $attributes ): string {
			unset( $bg );
			$css = '';
			if ( '' !== $uid && ! empty( $media['printed'] ) ) {
				$css .= sgs_bg_media_css( $uid, sgs_bg_media_slot(), $attributes );
			}
			return $css . sgs_bg_overlay_css( $uid, $overlay_decls, $attributes );
		}

		/**
		 * Tablet and mobile files are part of the element's own rules (`scoped_css()`), so there are no tier overrides.
		 *
		 * @param string              $uid The instance scope class.
		 * @param array<string,mixed> $bg  Result of read().
		 * @return string
		 */
		public static function tier_css( string $uid, array $bg ): string {
			unset( $uid, $bg );
			return '';
		}

		/**
		 * The kept SVG layer's opacity rule.
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
		 * The kept SVG layer's markup.
		 *
		 * @param array<string,mixed> $attributes Block attributes, verbatim.
		 * @param array<string,mixed> $svg        Result of read_svg().
		 * @return string
		 */
		public static function svg_html( array $attributes, array $svg ): string {
			$svg_html = '';
			if ( $svg['has_svg'] ) {
				$allowed_svg_tags = sgs_allowed_svg_tags();

				// A motion layer on the `svg-bg` part (the `draw` effect) reaches this element through the
				// part's own selector, so the div carries no effect attributes of its own.
				// A block that stores `backgroundSvgParts` animates named parts of the SVG: the cleaned document rides on the
				// layer as `data-sgs-svg-parts`, read by src/shared/svg-parts/svg-parts.js. Nothing is printed without parts.
				$svg_parts_attr = '';
				if ( ! empty( $attributes['backgroundSvgParts'] ) ) {
					require_once dirname( __DIR__ ) . '/helpers-svg-parts.php';
					$svg_parts_json = sgs_svg_parts_data( $attributes['backgroundSvgParts'], (string) ( $attributes['backgroundSvgPartsTrigger'] ?? 'load' ) );
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
