<?php
/**
 * Media rendering helpers for SGS block server-side rendering.
 *
 * Provides sgs_responsive_image(), sgs_render_stars(), and sgs_render_media() —
 * outputting responsive image tags, inline SVG star ratings, and unified
 * image/video media slots.
 *
 * @package SGS\Blocks
 */

require_once __DIR__ . '/helpers-image-dimensions.php';

/**
 * Output a responsive image tag with srcset when a valid attachment ID is available.
 *
 * Falls back to a plain <img> when the attachment ID is 0 or invalid (e.g. images
 * imported from external URLs or pasted content without media library entries).
 *
 * @param int    $id    WordPress attachment ID (0 = unknown/external).
 * @param string $url   Image URL fallback.
 * @param string $alt   Alt text.
 * @param string $size  WordPress image size name (default: 'large').
 * @param array  $attrs Extra HTML attributes (class, style, loading, etc.).
 * @return string HTML img tag.
 */
function sgs_responsive_image( int $id, string $url, string $alt = '', string $size = 'large', array $attrs = array() ): string {
	// Merge defaults.
	$attrs = array_merge(
		array(
			'loading'  => 'lazy',
			'decoding' => 'async',
		),
		$attrs
	);

	// Use wp_get_attachment_image when we have a real attachment ID.
	if ( $id > 0 ) {
		$image = wp_get_attachment_image( $id, $size, false, array_merge( $attrs, array( 'alt' => $alt ) ) );
		if ( $image ) {
			return $image;
		}
	}

	// Fallback: plain <img> with no srcset.
	// Attempt to retrieve explicit dimensions from the attachment metadata so
	// the browser can reserve the correct space and avoid layout shift (CLS).
	if ( ! isset( $attrs['width'] ) && ! isset( $attrs['height'] ) ) {
		$resolve_id = $id;
		// If no attachment ID was provided, try resolving from URL.
		if ( 0 === $resolve_id && ! empty( $url ) ) {
			$resolve_id = absint( attachment_url_to_postid( $url ) );
		}
		if ( $resolve_id > 0 ) {
			$src_data = wp_get_attachment_image_src( $resolve_id, $size );
			if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
				$attrs['width']  = (int) $src_data[1];
				$attrs['height'] = (int) $src_data[2];
			}
		}
	}

	$attr_str = '';
	foreach ( $attrs as $key => $value ) {
		$attr_str .= ' ' . esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
	}

	return sprintf(
		'<img src="%s" alt="%s"%s />',
		esc_url( $url ),
		esc_attr( $alt ),
		$attr_str
	);
}

/**
 * Open (+1), close (-1) or read (0) the hidden-render depth for this request.
 *
 * @param int $delta +1 on entering a hidden surface, -1 on leaving it, 0 to read.
 * @return int Current depth; never below 0.
 */
function sgs_hidden_render_depth( int $delta = 0 ): int {
	static $depth = 0;
	$depth        = max( 0, $depth + $delta );
	return $depth;
}

/**
 * Whether markup is being rendered for a surface that is not visible on load (a header's mega panel, the nav drawer,
 * a modal, the wishlist panel). Images printed there take no eager slot and no page-wide priority.
 *
 * @return bool True while inside one of those blocks.
 */
function sgs_in_hidden_render_context(): bool {
	return sgs_hidden_render_depth() > 0;
}

/**
 * Block names whose rendered content is hidden until the visitor opens it.
 *
 * @return string[] Block names.
 */
function sgs_hidden_render_blocks(): array {
	return array( 'sgs/mega-panel', 'sgs/nav-drawer', 'sgs/modal', 'sgs/wishlist-panel', 'sgs/cart' );
}

/**
 * `pre_render_block` callback: entering a hidden-surface block opens the hidden context. Runs last, and a block
 * another filter has short-circuited opens nothing, because core then skips the `render_block` filter that closes it.
 *
 * @param mixed $pre_render   Short-circuit value, returned unchanged.
 * @param array $parsed_block Parsed block.
 * @return mixed The unchanged `$pre_render`.
 */
function sgs_hidden_render_enter( $pre_render, array $parsed_block ) {
	if ( null === $pre_render && in_array( $parsed_block['blockName'] ?? '', sgs_hidden_render_blocks(), true ) ) {
		sgs_hidden_render_depth( 1 );
	}
	return $pre_render;
}

/**
 * `render_block` callback: leaving a hidden-surface block closes the hidden context.
 *
 * @param mixed $block_content Rendered HTML, returned unchanged.
 * @param array $parsed_block  Parsed block.
 * @return mixed The unchanged `$block_content`.
 */
function sgs_hidden_render_leave( $block_content, array $parsed_block ) {
	if ( in_array( $parsed_block['blockName'] ?? '', sgs_hidden_render_blocks(), true ) ) {
		sgs_hidden_render_depth( -1 );
	}
	return $block_content;
}

if ( function_exists( 'add_filter' ) ) {
	add_filter( 'pre_render_block', 'sgs_hidden_render_enter', PHP_INT_MAX, 2 );
	add_filter( 'render_block', 'sgs_hidden_render_leave', 10, 2 );
}

/**
 * Loading hints for an image that may sit above the fold: the first few visible images on the page load eagerly and
 * exactly one of them, page-wide, takes `fetchpriority="high"` (the slot shared with sgs_next_background_image_index()).
 * Every later image, and any image inside a hidden surface, loads lazily. Call once per image that will print.
 *
 * An ornament (`$can_lead` false) may load eagerly within the count but never takes the priority slot.
 *
 * @param bool $can_lead Whether this image may take the page's one `fetchpriority="high"`.
 * @return array{loading:string,fetchpriority:string,decoding:string} Attribute values.
 */
function sgs_image_loading_attrs( bool $can_lead = true ): array {
	static $eager_count = 0;
	$limit              = (int) apply_filters( 'sgs_eager_image_limit', 16 );
	if ( sgs_in_hidden_render_context() || $eager_count >= $limit ) {
		return array(
			'loading'       => 'lazy',
			'fetchpriority' => 'auto',
			'decoding'      => 'async',
		);
	}
	++$eager_count;
	$is_lead = $can_lead && 1 === sgs_next_background_image_index();
	return array(
		'loading'       => 'eager',
		'fetchpriority' => $is_lead ? 'high' : 'auto',
		'decoding'      => $is_lead ? 'sync' : 'async',
	);
}

/**
 * Return the next 1-based index in the PAGE-WIDE background-image render order.
 *
 * LCP (Largest Contentful Paint) priority is a PAGE-level property, not a
 * per-block one: `fetchpriority="high"` should land on whichever background
 * image renders FIRST on the page, full stop. Every block that renders its
 * own background <img> (sgs/hero, the shared SGS_Container_Wrapper used by
 * sgs/container/trust-bar/etc.) must therefore share ONE counter
 * — a private `static` inside each block's own render path only knows "am I
 * first within MY code path", not "am I first on the page". Two independent
 * counters both returning 1 for their own first call means a page with (say)
 * a hero background image followed by a container background image marks
 * BOTH `fetchpriority="high"`/`loading="eager"` — prioritising two images
 * prioritises neither, defeating the entire reason this exists.
 *
 * A PHP `static` local persists for the lifetime of the current request only
 * (WordPress does not share it across requests), which is exactly the scope
 * needed: "first background image THIS PAGE LOAD rendered." Content images
 * claim the same slot through sgs_content_image_claims_priority().
 *
 * Markup rendered inside a hidden surface (sgs_in_hidden_render_context()) is never the page's lead image: it
 * returns 0 and leaves the counter where it was.
 *
 * @return int 1 on the first call in this request, 2 on the second, etc.; 0 inside a hidden surface.
 */
function sgs_next_background_image_index(): int {
	static $sgs_bg_image_index = 0;
	if ( sgs_in_hidden_render_context() ) {
		return 0;
	}
	++$sgs_bg_image_index;
	return $sgs_bg_image_index;
}

/**
 * Whether the content image about to print is the page's likely LCP image, so it takes `loading="eager"` and
 * `fetchpriority="high"`; every other content image takes `loading="lazy"` and `fetchpriority="auto"`.
 *
 * A content image (a product card's photo, a grid item's photo) claims the priority only when it renders inside the
 * page's first top-level section (`Sgs_Motion_Renderer::in_first_section()`, the same first-section test the Spec 38A
 * §9 LCP rule reads) AND no earlier image on the page has taken the one page-wide priority slot
 * (`sgs_next_background_image_index()`, shared with sgs/hero and SGS_Container_Wrapper's background images). So a
 * repeating grid outside the first section claims nothing, a first-section grid claims it for its first photo only,
 * and the editor's block-renderer preview (no first section) claims nothing. The slot is consumed only by a claim made
 * inside the first section (or by the page's lead image, below), so refused claims never move it.
 *
 * `$leads_page` is for an image that is its page's lead content although it renders outside the post content, where no
 * first section is armed: a product page's own sgs/buybox, which single-product.html prints before the post content. It
 * claims the free slot as a first-section image would.
 *
 * Call it once per image, only when the image will actually print.
 *
 * @param bool $leads_page Whether the image is its page's lead content outside the post content.
 * @return bool True when this image takes the page's priority slot.
 */
function sgs_content_image_claims_priority( bool $leads_page = false ): bool {
	$in_first = class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Renderer' ) && \SGS\Blocks\Motion\Sgs_Motion_Renderer::in_first_section();
	if ( ! $in_first && ! $leads_page ) {
		return false;
	}
	return 1 === sgs_next_background_image_index();
}

/**
 * Render inline SVG star icons for a given rating value.
 *
 * Used by star-rating, testimonial, and google-reviews blocks so star markup
 * is defined in exactly one place. Outputs filled, half, and empty SVG stars.
 *
 * @param float  $rating      Rating value, e.g. 4.5.
 * @param int    $best_rating Maximum stars to display (default 5).
 * @param int    $size        SVG width/height in pixels (default 20).
 * @param string $colour_css  CSS colour value for filled stars (default: currentColor).
 * @return string HTML string — a sequence of <span> elements, each wrapping an <svg>.
 */
function sgs_render_stars( float $rating, int $best_rating = 5, int $size = 20, string $colour_css = 'currentColor' ): string {
	$stars_html = '';
	$safe_size  = absint( $size );
	$safe_color = esc_attr( $colour_css );

	for ( $i = 1; $i <= $best_rating; $i++ ) {
		$filled = $i <= floor( $rating );
		$half   = ! $filled && ceil( $rating ) === (float) $i && fmod( $rating, 1 ) >= 0.5;

		if ( $half ) {
			$grad_id     = 'sgs-star-half-' . $i . '-' . wp_unique_id();
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--half" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' .
				'<defs><linearGradient id="%s"><stop offset="50%%" stop-color="%s"/><stop offset="50%%" stop-color="%s" stop-opacity="0.25"/></linearGradient></defs>' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#%s)"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				esc_attr( $grad_id ),
				$safe_color,
				$safe_color,
				esc_attr( $grad_id )
			);
		} elseif ( $filled ) {
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--filled" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="%s"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				$safe_color
			);
		} else {
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--empty" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="%s" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.35"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				$safe_color
			);
		}
	}

	return $stars_html;
}

if ( ! function_exists( 'sgs_render_media' ) ) {
	/**
	 * Render an image or video from a unified SGS media-slot attribute.
	 *
	 * Used by any block that accepts both image and video in the same slot
	 * (Gap H-3 — "video everywhere image works"). Pairs with the JS
	 * MediaPicker component which produces the attribute shape this helper
	 * consumes.
	 *
	 * Expected $attrs shape:
	 *   - url           string  Asset URL (required — empty string => silent return).
	 *   - type          string  'image' | 'video'.
	 *   - alt           string  Alt text (image) or aria-label (video). Optional.
	 *   - id            int     Attachment ID (0 = external). Optional.
	 *   - mobile_url    string  Optional mobile-specific source (image only — emits <picture>).
	 *   - video_options array   Optional override for video flags. Keys:
	 *       autoplay (bool, default true)
	 *       loop     (bool, default true)
	 *       muted    (bool, default true)
	 *       controls (bool, default false)
	 *       playsinline (bool, default true)
	 *
	 * For images: emits a lazy-loaded <img> (or <picture> with mobile source).
	 * For videos: emits a <video> with safe defaults — autoplay, loop, muted,
	 * playsinline so the asset autoplays on mobile without a sound prompt.
	 * Empty url returns an empty string so the caller can render a fallback.
	 *
	 * @param array  $attrs   Media attributes (see shape above).
	 * @param string $context Block name for class scoping (e.g. 'sgs/hero').
	 * @return string HTML string, or '' if no url is provided.
	 */
	function sgs_render_media( $attrs, $context = '' ) {
		if ( empty( $attrs ) || ! is_array( $attrs ) ) {
			return '';
		}

		$url = isset( $attrs['url'] ) ? trim( (string) $attrs['url'] ) : '';
		if ( '' === $url ) {
			return '';
		}

		$type = isset( $attrs['type'] ) ? (string) $attrs['type'] : 'image';
		$alt  = isset( $attrs['alt'] ) ? (string) $attrs['alt'] : '';

		// Build a CSS-safe context slug for the class hook.
		$context_slug = preg_replace( '/[^a-z0-9-]/', '-', strtolower( (string) $context ) );
		$context_slug = trim( $context_slug, '-' );
		$context_cls  = '' !== $context_slug ? ' sgs-media--' . $context_slug : '';

		if ( 'video' === $type ) {
			$opts_in = isset( $attrs['video_options'] ) && is_array( $attrs['video_options'] )
				? $attrs['video_options']
				: array();
			$opts    = array_merge(
				array(
					'autoplay'    => true,
					'loop'        => true,
					'muted'       => true,
					'controls'    => false,
					'playsinline' => true,
				),
				$opts_in
			);

			$flags = '';
			if ( ! empty( $opts['autoplay'] ) ) {
				$flags .= ' autoplay';
			}
			if ( ! empty( $opts['loop'] ) ) {
				$flags .= ' loop';
			}
			if ( ! empty( $opts['muted'] ) ) {
				$flags .= ' muted';
			}
			if ( ! empty( $opts['playsinline'] ) ) {
				$flags .= ' playsinline';
			}
			if ( ! empty( $opts['controls'] ) ) {
				$flags .= ' controls';
			}

			// Resolve MIME from extension fallback if not explicit.
			$mime = isset( $attrs['mime'] ) && $attrs['mime'] ? (string) $attrs['mime'] : '';
			if ( '' === $mime ) {
				$ext  = strtolower( pathinfo( wp_parse_url( $url, PHP_URL_PATH ) ?? '', PATHINFO_EXTENSION ) );
				$map  = array(
					'mp4'  => 'video/mp4',
					'webm' => 'video/webm',
					'ogv'  => 'video/ogg',
					'mov'  => 'video/quicktime',
				);
				$mime = isset( $map[ $ext ] ) ? $map[ $ext ] : 'video/mp4';
			}

			$aria = '' !== $alt ? $alt : esc_attr__( 'Background video', 'sgs-blocks' );

			return sprintf(
				'<video class="sgs-media sgs-media--video%s"%s aria-label="%s"><source src="%s" type="%s"></video>',
				esc_attr( $context_cls ),
				$flags,
				esc_attr( $aria ),
				esc_url( $url ),
				esc_attr( $mime )
			);
		}

		// Image branch.
		$mobile_url = isset( $attrs['mobile_url'] ) ? trim( (string) $attrs['mobile_url'] ) : '';
		$img_class  = 'sgs-media sgs-media--image' . $context_cls;
		$img_tag    = sprintf(
			'<img src="%s" alt="%s" class="%s"%s loading="lazy" decoding="async" />',
			esc_url( $url ),
			esc_attr( $alt ),
			esc_attr( $img_class ),
			sgs_image_size_attrs( $url )
		);

		if ( '' !== $mobile_url ) {
			return sprintf(
				'<picture class="sgs-media-picture%s"><source media="%s" srcset="%s" />%s</picture>',
				esc_attr( $context_cls ),
				esc_attr( SGS_Breakpoints::query( 'mobile' ) ),
				esc_url( $mobile_url ),
				$img_tag
			);
		}

		return $img_tag;
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_hint_sizes' ) ) {
	/**
	 * A `sizes` value from a per-device `displayWidth` (px the image is drawn at); a device without its own value
	 * inherits the wider device's.
	 *
	 * @param mixed $raw Stored `displayWidth` value ({desktop,tablet,mobile}).
	 * @return string The sizes value, or '' when the desktop value is unset or SGS_Breakpoints is not loaded.
	 */
	function sgs_media_cover_crop_hint_sizes( $raw ): string {
		if ( ! class_exists( 'SGS_Breakpoints' ) || ! function_exists( 'sgs_responsive_normalise_object' ) ) {
			return '';
		}
		$tiers = sgs_responsive_normalise_object( $raw );
		$out   = array();
		$last  = 0;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$value = $tiers[ $tier ] ?? null;
			if ( is_numeric( $value ) && (int) $value > 0 ) {
				$last = (int) $value;
			}
			$out[ $tier ] = $last;
		}
		if ( $out['desktop'] <= 0 ) {
			return '';
		}
		return sprintf(
			'(max-width: %dpx) %dpx, (max-width: %dpx) %dpx, %dpx',
			(int) SGS_Breakpoints::MOBILE_MAX,
			$out['mobile'],
			(int) SGS_Breakpoints::TABLET_MAX,
			$out['tablet'],
			$out['desktop']
		);
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_plan' ) ) {
	/**
	 * Work out how a cover-cropped image is drawn relative to its box, and the `sizes` value that describes it.
	 *
	 * The browser picks a srcset file for the width `sizes` describes, and core's lazy-image `sizes="auto"` describes
	 * the box width only. A cover-cropped image is drawn at box width x max( 1, image ratio / box ratio ), so a file
	 * chosen by box width is too small when the crop is wider than the box and the photo looks soft.
	 *
	 * Outcomes:
	 * - `widens` false: `auto` is right (contain or any other fit, a box that follows the image, or a crop that is
	 *   not wider than the box).
	 * - `widens` true and `sizes` set: every device's drawn width is known, so `sizes` carries one concrete px value
	 *   per device (breakpoints from SGS_Breakpoints).
	 * - `widens` true and `sizes` empty: the drawn width cannot be known; the caller keeps the attachment's own
	 *   hint with `auto` removed.
	 *
	 * A `displayWidth` hint (px per device: the width the image is drawn at) is the author's measurement of the drawn
	 * width and wins in every mode. Without it, a fill box, or a height box with no px width, has no size the server
	 * can read, so the plan is `unknown` unless the image is no wider than the narrowest ratio the box could have
	 * (it is portrait, so a crop never widens it).
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $prefix        The media element's attribute prefix ('' for an unprefixed element).
	 * @param string $block_slug    Block name, e.g. 'sgs/media'.
	 * @param int    $attachment_id The image's attachment ID.
	 * @return array{widens:bool,sizes:string}
	 */
	function sgs_media_cover_crop_plan( array $attributes, string $prefix, string $block_slug, int $attachment_id ): array {
		$keep_auto = array(
			'widens' => false,
			'sizes'  => '',
		);
		$unknown   = array(
			'widens' => true,
			'sizes'  => '',
		);
		if ( ! function_exists( 'sgs_media_element_stored_attr' ) || ! function_exists( 'sgs_media_atom_box_shape_resolve_sizing_mode' ) ) {
			return $keep_auto;
		}
		$fit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		if ( 'cover' !== ( $attributes[ $fit_key ] ?? 'cover' ) ) {
			return $keep_auto;
		}
		$hint = sgs_media_cover_crop_hint_sizes( $attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, 'DisplayWidth' ) ] ?? null );
		if ( '' !== $hint ) {
			return array(
				'widens' => true,
				'sizes'  => $hint,
			);
		}
		$sizing_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaSizing' );
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null, $attributes, $prefix, $block_slug );
		if ( 'auto' === $mode ) {
			return $keep_auto;
		}
		$meta   = $attachment_id > 0 ? wp_get_attachment_metadata( $attachment_id ) : array();
		$width  = (int) ( is_array( $meta ) ? ( $meta['width'] ?? 0 ) : 0 );
		$height = (int) ( is_array( $meta ) ? ( $meta['height'] ?? 0 ) : 0 );
		if ( $width <= 0 || $height <= 0 ) {
			return $unknown;
		}
		$image_ratio = $width / $height;

		// Per-device px width and height; a device without its own value inherits the wider device's. A device whose
		// value is set but is not px (for example `100%`) is null: its width is unknown and stops the inheritance.
		$px      = static function ( $raw ): array {
			$out = array();
			foreach ( sgs_media_atom_box_shape_resolve_tier_object( $raw ) as $tier => $value ) {
				$out[ $tier ] = preg_match( '/^\s*(\d+(?:\.\d+)?)\s*px\s*$/i', $value, $m ) ? (float) $m[1] : null;
			}
			return $out;
		};
		$inherit = static function ( array $tiers ): array {
			$out  = array();
			$last = null;
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $tiers[ $tier ] ) ) {
					$last = $tiers[ $tier ];
				}
				$out[ $tier ] = $last;
			}
			return $out;
		};
		$widths  = $inherit( $px( $attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidth' ) ] ?? null ) );
		$heights = 'height' === $mode ? $inherit( $px( $attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, 'Height' ) ] ?? null ) ) : array();

		$set_ratio = 0.0;
		if ( 'ratio' === $mode ) {
			$ratio_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'AspectRatio' );
			$ratio     = sgs_media_atom_box_shape_normalise_ratio( $attributes[ $ratio_key ] ?? null );
			if ( ! preg_match( '#^([\d.]+) / ([\d.]+)$#', $ratio, $m ) || (float) $m[2] <= 0.0 ) {
				return $unknown;
			}
			$set_ratio = (float) $m[1] / (float) $m[2];
		}

		$drawn = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$box_w = $widths[ $tier ] ?? null;
			$box_h = $heights[ $tier ] ?? null;
			if ( $set_ratio > 0.0 ) {
				$box_ratio = $set_ratio;
			} elseif ( null !== $box_w && null !== $box_h && $box_h > 0.0 ) {
				$box_ratio = $box_w / $box_h;
			} else {
				// The box shape is unknowable here: only a portrait image (or a square one) is certain not to widen.
				if ( $image_ratio > 1.0 ) {
					return $unknown;
				}
				$drawn[ $tier ] = null;
				continue;
			}
			$factor = max( 1.0, $image_ratio / $box_ratio );
			if ( $factor <= 1.01 ) {
				$drawn[ $tier ] = null;
			} elseif ( null !== $box_w ) {
				$drawn[ $tier ] = (int) ceil( $box_w * $factor );
			} else {
				return $unknown;
			}
		}
		$known = array_filter( $drawn, 'is_int' );
		if ( array() === $known ) {
			return $keep_auto;
		}
		if ( count( $known ) < 3 || ! class_exists( 'SGS_Breakpoints' ) ) {
			// One sizes list cannot hold a concrete width for some devices and `auto` for others.
			return $unknown;
		}
		$sizes = sprintf(
			'(max-width: %dpx) %dpx, (max-width: %dpx) %dpx, %dpx',
			(int) SGS_Breakpoints::MOBILE_MAX,
			$drawn['mobile'],
			(int) SGS_Breakpoints::TABLET_MAX,
			$drawn['tablet'],
			$drawn['desktop']
		);
		return array(
			'widens' => true,
			'sizes'  => $sizes,
		);
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_widens' ) ) {
	/**
	 * Whether a cover-cropped image needs core's `auto` taken out of its `sizes` (see sgs_media_cover_crop_plan).
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $prefix        The media element's attribute prefix ('' for an unprefixed element).
	 * @param string $block_slug    Block name, e.g. 'sgs/media'.
	 * @param int    $attachment_id The image's attachment ID.
	 * @return bool
	 */
	function sgs_media_cover_crop_widens( array $attributes, string $prefix, string $block_slug, int $attachment_id ): bool {
		return sgs_media_cover_crop_plan( $attributes, $prefix, $block_slug, $attachment_id )['widens'];
	}
}

if ( ! function_exists( 'sgs_media_cover_crop_sizes' ) ) {
	/**
	 * The concrete `sizes` value for a cover-cropped image whose drawn width is known on every device.
	 *
	 * @param array  $attributes    Block attributes.
	 * @param string $prefix        The media element's attribute prefix ('' for an unprefixed element).
	 * @param string $block_slug    Block name, e.g. 'sgs/media'.
	 * @param int    $attachment_id The image's attachment ID.
	 * @return string The sizes value, or '' to leave WordPress's own.
	 */
	function sgs_media_cover_crop_sizes( array $attributes, string $prefix, string $block_slug, int $attachment_id ): string {
		return sgs_media_cover_crop_plan( $attributes, $prefix, $block_slug, $attachment_id )['sizes'];
	}
}

if ( ! function_exists( 'sgs_media_drop_auto_sizes' ) ) {
	/**
	 * `wp_content_img_tag` filter: take core's `auto` out of `sizes` on an image marked `data-sgs-cover-crop`.
	 *
	 * Core adds `auto` to every lazy image before this filter runs (wp-includes/media.php::wp_filter_content_tags).
	 * Without it the browser reads the attachment's own sizes hint, which picks a file wide enough for the crop.
	 * Parameters stay untyped: a typed hook callback fatals on an unexpected value.
	 *
	 * @param mixed $filtered_image The image tag.
	 * @return mixed The tag, `auto` removed from a marked image's sizes.
	 */
	function sgs_media_drop_auto_sizes( $filtered_image ) {
		if ( ! is_string( $filtered_image ) || false === strpos( $filtered_image, 'data-sgs-cover-crop' ) ) {
			return $filtered_image;
		}
		return (string) preg_replace( '/\ssizes="auto,\s*/i', ' sizes="', $filtered_image, 1 );
	}
}
