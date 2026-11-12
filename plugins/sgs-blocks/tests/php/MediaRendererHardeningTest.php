<?php
/**
 * Spec 49 Stage A hardening of the front-end renderer: caption and link per slot prefix (R1), fractional breakpoint
 * queries (R3), the adopted-markup marker (R4), the shared helper-effect list (R5), the inline SVG sanitiser (R6), embed
 * URLs (R7), the pause button (R8), `sizes` with Max width (R9), attachment dimensions (R10) and item sets (R12).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
class MediaRendererHardeningTest extends TestCase {

	protected function setUp(): void {
		// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stubs.
		if ( ! function_exists( 'esc_attr' ) ) {
			function esc_attr( $v ) {
				return htmlspecialchars( (string) $v, ENT_QUOTES );
			}
		}
		if ( ! function_exists( 'esc_url' ) ) {
			function esc_url( $v ) {
				return htmlspecialchars( (string) $v, ENT_QUOTES );
			}
		}
		if ( ! function_exists( 'absint' ) ) {
			function absint( $v ) {
				return abs( (int) $v );
			}
		}
		if ( ! function_exists( 'sanitize_html_class' ) ) {
			function sanitize_html_class( $v ) {
				return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $v );
			}
		}
		if ( ! function_exists( 'wp_json_encode' ) ) {
			function wp_json_encode( $v ) {
				return json_encode( $v );
			}
		}
		if ( ! function_exists( 'wp_kses' ) ) {
			function wp_kses( $v ) {
				return $v;
			}
		}
		if ( ! function_exists( 'wp_kses_post' ) ) {
			function wp_kses_post( $v ) {
				return $v;
			}
		}
		if ( ! function_exists( 'wp_parse_url' ) ) {
			function wp_parse_url( $u, $c = -1 ) {
				return parse_url( $u, $c );
			}
		}
		if ( ! function_exists( 'add_filter' ) ) {
			function add_filter( ...$args ) {
				return true;
			}
		}
		if ( ! function_exists( 'add_action' ) ) {
			function add_action( ...$args ) {
				return true;
			}
		}
		if ( ! function_exists( 'apply_filters' ) ) {
			function apply_filters( $hook, $value, ...$args ) {
				return $value;
			}
		}
		if ( ! function_exists( '__' ) ) {
			function __( $t ) {
				return $t;
			}
		}
		if ( ! function_exists( 'esc_html__' ) ) {
			function esc_html__( $t ) {
				return $t;
			}
		}
		if ( ! function_exists( 'sanitize_key' ) ) {
			function sanitize_key( $k ) {
				return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $k ) );
			}
		}
		if ( ! function_exists( 'wp_enqueue_script_module' ) ) {
			function wp_enqueue_script_module( ...$args ) {}
		}
		if ( ! function_exists( 'generate_block_asset_handle' ) ) {
			function generate_block_asset_handle( ...$args ) {
				return 'h';
			}
		}
		if ( ! function_exists( 'wp_get_attachment_image' ) ) {
			function wp_get_attachment_image( ...$args ) {
				return '';
			}
		}
		if ( ! function_exists( 'wp_get_attachment_url' ) ) {
			function wp_get_attachment_url( $id ) {
				return 77 === (int) $id ? '/u/id-only.jpg' : '';
			}
		}
		if ( ! function_exists( 'wp_get_attachment_metadata' ) ) {
			function wp_get_attachment_metadata( $id ) {
				return 77 === (int) $id ? array(
					'width'  => 2000,
					'height' => 1000,
				) : false;
			}
		}
		if ( ! function_exists( 'wp_has_noncharacters' ) ) {
			function wp_has_noncharacters( $s ) {
				return false;
			}
		}
		if ( ! function_exists( 'wp_kses_uri_attributes' ) ) {
			function wp_kses_uri_attributes() {
				return array( 'href', 'src', 'poster', 'action', 'xlink:href' );
			}
		}
		// phpcs:enable
		$api = '//wsl$/Ubuntu/var/www/local-sandybrown/wp-includes/html-api/';
		foreach ( array( 'class-wp-html-attribute-token', 'class-wp-html-span', 'class-wp-html-text-replacement', 'class-wp-html-decoder', 'class-wp-html-token', 'class-wp-html-stack-of-open-elements', 'class-wp-html-active-formatting-elements', 'class-wp-html-open-elements', 'class-wp-html-tag-processor' ) as $f ) {
			if ( is_file( $api . $f . '.php' ) ) {
				require_once $api . $f . '.php';
			}
		}
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/motion/class-sgs-motion-fold.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/motion/class-sgs-fold-scan.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/motion/class-sgs-motion-renderer.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-breakpoints.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/helpers-svg-kses.php';
		if ( ! function_exists( 'sgs_allowed_svg_tags' ) ) {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- alias used by the tier helper.
			function sgs_allowed_svg_tags(): array {
				return sgs_svg_kses_allowed_tags();
			}
		}
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-media-element.php';
	}

	private function img( string $name = 'a.jpg' ): array {
		return array(
			'kind'   => 'image',
			'url'    => '/u/' . $name,
			'width'  => 1200,
			'height' => 800,
		);
	}

	private function video(): array {
		return array(
			'kind'   => 'video',
			'url'    => '/u/v.mp4',
			'poster' => array(
				'url'    => '/u/p.jpg',
				'width'  => 1200,
				'height' => 800,
			),
		);
	}

	private function render( string $prefix, array $attrs, array $context = array() ): array {
		return SGS_Media_Element::render(
			array(
				'prefix' => $prefix,
				'kinds'  => array( 'image', 'video', 'embed', 'svg' ),
			),
			$attrs,
			array( 'uid' => 'u1' ) + $context
		);
	}

	// R1.
	public function test_r1_a_prefixed_slot_reads_its_own_caption_and_link_and_ignores_the_blocks(): void {
		$out = $this->render(
			'item',
			array(
				'itemSource'          => array( 'desktop' => $this->img() ),
				'itemAlt'             => 'Pic',
				'itemCaption'         => 'Own caption',
				'itemCaptionTag'      => 'div',
				'itemLinkUrl'         => '/own',
				'itemLinkOpensNewTab' => true,
				'itemLinkRel'         => 'nofollow',
				'caption'             => 'Block caption',
				'linkUrl'             => '/block-link',
			)
		);
		$this->assertStringContainsString( '<div class="sgs-media-caption">Own caption</div>', $out['html'] );
		$this->assertStringContainsString( 'href="/own"', $out['html'] );
		$this->assertStringContainsString( 'target="_blank"', $out['html'] );
		$this->assertStringContainsString( 'rel="nofollow noopener noreferrer"', $out['html'] );
		$this->assertStringNotContainsString( 'Block caption', $out['html'] );
		$this->assertStringNotContainsString( '/block-link', $out['html'] );
	}

	public function test_r1_a_second_prefix_does_not_take_the_first_prefixs_caption(): void {
		$out = $this->render(
			'split',
			array(
				'splitSource' => array( 'desktop' => $this->img() ),
				'itemCaption' => 'Item caption',
				'itemLinkUrl' => '/item',
			)
		);
		$this->assertStringNotContainsString( 'figcaption', $out['html'] );
		$this->assertStringNotContainsString( '<a ', $out['html'] );
	}

	public function test_r1_link_source_top_resolves_and_the_caption_tag_defaults_to_figcaption(): void {
		$out = $this->render(
			'',
			array(
				'source'        => array( 'desktop' => $this->img() ),
				'caption'       => 'Cap',
				'linkUrlSource' => 'top',
			)
		);
		$this->assertStringContainsString( 'href="#top"', $out['html'] );
		$this->assertStringContainsString( 'data-sgs-link-source="top"', $out['html'] );
		$this->assertStringContainsString( '<figcaption class="sgs-media-caption">Cap</figcaption>', $out['html'] );
	}

	// R3.
	private function visible_siblings( string $css, array $classes, float $width ): array {
		$hidden = array();
		preg_match_all( '/@media(\([^{]*\))\{([^{}]+)\{display:none\}\}/', $css, $rules, PREG_SET_ORDER );
		foreach ( $rules as $r ) {
			$ok = true;
			foreach ( explode( ' and ', $r[1] ) as $part ) {
				if ( preg_match( '/\(max-width:\s*([\d.]+)px\)/', $part, $m ) ) {
					$ok = $ok && $width <= (float) $m[1];
				} elseif ( preg_match( '/\(min-width:\s*([\d.]+)px\)/', $part, $m ) ) {
					$ok = $ok && $width >= (float) $m[1];
				}
			}
			if ( $ok ) {
				foreach ( explode( ',', $r[2] ) as $sel ) {
					$hidden[] = trim( (string) preg_replace( '/^.*\.sgs-media-sib\./', '', $sel ) );
				}
			}
		}
		return array_values( array_diff( $classes, $hidden ) );
	}

	public function test_r3_exactly_one_sibling_shows_at_every_width_including_fractional_ones(): void {
		$out     = $this->render(
			'',
			array(
				'source'   => array(
					'desktop' => $this->img( 'd.jpg' ),
					'tablet'  => array(
						'kind' => 'embed',
						'url'  => 'https://youtu.be/abc123',
					),
					'mobile'  => array(
						'kind'   => 'svg',
						'markup' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle r="1"/></svg>',
					),
				),
				'playback' => array(),
			)
		);
		$classes = array( 'sgs-media-sib--image', 'sgs-media-sib--embed-1', 'sgs-media-sib--svg-1' );
		foreach ( array( 320, 767, 767.5, 767.98, 768, 900, 1023, 1023.5, 1023.98, 1024, 1440 ) as $width ) {
			$this->assertCount( 1, $this->visible_siblings( $out['css'], $classes, (float) $width ), "one sibling at {$width}px" );
		}
		$this->assertStringContainsString( '(max-width:767.98px)', $out['css'] );
		$this->assertStringContainsString( '(max-width:1023.98px)', $out['css'] );
	}

	public function test_r3_the_integer_queries_other_callers_use_are_unchanged(): void {
		$this->assertSame( '(max-width:767px)', SGS_Breakpoints::query( 'mobile' ) );
		$this->assertSame( '(min-width:768px) and (max-width:1023px)', SGS_Breakpoints::query( 'tablet-only' ) );
		$this->assertSame( '@media(max-width:1023px)', SGS_Breakpoints::media( 'tablet' ) );
		$this->assertSame( '(min-width:1024px)', SGS_Breakpoints::query_fractional( 'desktop' ) );
	}

	// R4.
	public function test_r4_every_adopted_outer_element_carries_the_renderer_marker(): void {
		$plain = $this->render( '', array( 'source' => array( 'desktop' => $this->img() ) ) );
		$this->assertMatchesRegularExpression( '/<img [^>]*class="sgs-media-el sgs-media sgs-media--renderer u1"/', $plain['html'] );
		$box = $this->render(
			'',
			array(
				'source'        => array( 'desktop' => $this->img() ),
				'overlayColour' => '#000',
			)
		);
		$this->assertMatchesRegularExpression( '/<span class="sgs-media-box sgs-media sgs-media--renderer u1"/', $box['html'] );
		$fig = $this->render(
			'',
			array(
				'source'  => array( 'desktop' => $this->img() ),
				'caption' => 'C',
			)
		);
		$this->assertMatchesRegularExpression( '/<figure class="sgs-media sgs-media--renderer u1"/', $fig['html'] );
	}

	// R5 (the PHP half; the parity test compares it with the JS twin).
	public function test_r5_the_helper_effect_list_accepts_the_registry_id_and_the_alias(): void {
		foreach ( array( 'surface-treatment', 'fx-surface-treatment', 'surface', 'parallax', 'fx-ken-burns' ) as $effect ) {
			$this->assertTrue( sgs_media_effect_paints_layer( $effect ), $effect );
		}
		$this->assertFalse( sgs_media_effect_paints_layer( 'fade' ) );
		$this->assertTrue( sgs_media_needs_helper( '', array(), array( 'effects' => array( 'surface-treatment' ) ) ) );
	}

	// R6.
	public function test_r6_inline_svg_keeps_class_styles_and_refuses_off_site_references(): void {
		if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			$this->markTestSkipped( 'SVG slots need WP_HTML_Tag_Processor.' );
		}
		$styled = $this->render(
			'',
			array(
				'source' => array(
					'desktop' => array(
						'kind'   => 'svg',
						'markup' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.cls-1{fill:#f00}</style><circle class="cls-1" r="5"/></svg>',
					),
				),
				'alt'    => 'Mark',
			)
		);
		$this->assertStringContainsString( '<style>', $styled['html'] );
		$this->assertStringContainsString( 'fill:#f00', $styled['html'] );
		$this->assertStringContainsString( ':where(#u1-s1)', $styled['html'] );
		$remote = $this->render(
			'',
			array(
				'source' => array(
					'desktop' => array(
						'kind'   => 'svg',
						'markup' => '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"><image href="https://evil.example/x.png" width="5" height="5"/></svg>',
					),
				),
				'alt'    => 'Mark',
			)
		);
		$this->assertSame( '', $remote['html'] );
	}

	// R7.
	public function test_r7_embed_urls_keep_the_vimeo_hash_the_start_time_and_accept_live(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/tier-embed.php';
		$this->assertSame( 'https://player.vimeo.com/video/123456789?h=abcdef1234', sgs_media_normalise_embed_url( 'https://vimeo.com/123456789/abcdef1234' ) );
		$this->assertSame( 'https://player.vimeo.com/video/123456789?h=abcdef1234', sgs_media_normalise_embed_url( 'https://player.vimeo.com/video/123456789?h=abcdef1234' ) );
		$this->assertSame( 'https://www.youtube-nocookie.com/embed/abc123?start=90', sgs_media_normalise_embed_url( 'https://www.youtube.com/watch?v=abc123&t=90' ) );
		$this->assertSame( 'https://www.youtube-nocookie.com/embed/abc123?start=90', sgs_media_normalise_embed_url( 'https://youtu.be/abc123?t=1m30s' ) );
		$this->assertSame( 'https://www.youtube-nocookie.com/embed/abc123', sgs_media_normalise_embed_url( 'https://www.youtube.com/live/abc123' ) );
		$this->assertSame( 'https://player.vimeo.com/video/5?h=abc&autoplay=0&muted=0&loop=0&controls=1', sgs_media_normalise_embed_url( 'https://vimeo.com/5/abc', array( 'controls' => true ) ) );
	}

	public function test_r7_an_autoplaying_embed_prints_without_autoplay_and_offers_it_to_the_view_module(): void {
		$out = $this->render(
			'',
			array(
				'source'   => array(
					'desktop' => array(
						'kind' => 'embed',
						'url'  => 'https://youtu.be/abc123',
					),
				),
				'playback' => array( 'autoplay' => true ),
			)
		);
		$this->assertMatchesRegularExpression( '/<iframe[^>]* src="[^"]*autoplay=0/', $out['html'] );
		$this->assertMatchesRegularExpression( '/data-sgs-autoplay-src="[^"]*autoplay=1/', $out['html'] );
	}

	// R8.
	public function test_r8_the_pause_button_prints_only_for_autoplay_with_pause_on(): void {
		$on = $this->render(
			'',
			array(
				'source'   => array( 'desktop' => $this->video() ),
				'playback' => array(
					'autoplay' => true,
					'pause'    => true,
				),
			)
		);
		$this->assertStringContainsString( 'class="sgs-media-pause sgs-focus--duotone"', $on['html'] );
		$this->assertStringContainsString( 'aria-pressed="false" hidden', $on['html'] );
		$off = $this->render(
			'',
			array(
				'source'   => array( 'desktop' => $this->video() ),
				'playback' => array( 'autoplay' => true ),
			)
		);
		$this->assertStringNotContainsString( 'sgs-media-pause', $off['html'] );
		$ctl = $this->render(
			'',
			array(
				'source'   => array( 'desktop' => $this->video() ),
				'playback' => array(
					'autoplay' => false,
					'pause'    => true,
				),
			)
		);
		$this->assertStringNotContainsString( 'sgs-media-pause', $ctl['html'] );
	}

	// R9.
	public function test_r9_sizes_takes_the_smaller_of_width_and_max_width(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/render-sources.php';
		$this->assertSame( '(max-width: 480px) 100vw, 480px', sgs_media_sizes_for_width( null, false, 0, '480px' ) );
		$this->assertSame( '(max-width: 300px) 100vw, 300px', sgs_media_sizes_for_width( '300px', false, 0, '480px' ) );
		$this->assertSame( '(max-width: 480px) 100vw, 480px', sgs_media_sizes_for_width( '600px', false, 0, '480px' ) );
		$this->assertSame( 'min(50vw, 480px)', sgs_media_sizes_for_width( '50vw', false, 0, '480px' ) );
		$this->assertSame( 'auto, (max-width: 480px) 100vw, 480px', sgs_media_sizes_for_width( null, true, 0, '30rem' ) );
		$this->assertSame( '100vw', sgs_media_sizes_for_width( null, false, 0, null ) );
		$out = $this->render(
			'',
			array(
				'source'   => array( 'desktop' => $this->img() ),
				'maxWidth' => '480px',
			)
		);
		$this->assertStringContainsString( 'sizes="auto, (max-width: 480px) 100vw, 480px"', $out['html'] );
	}

	// R10.
	public function test_r10_an_id_only_image_takes_its_size_from_the_attachment(): void {
		$source  = array(
			'kind' => 'image',
			'id'   => 77,
		);
		$sources = sgs_media_resolve_sources(
			array(
				'prefix' => '',
				'kinds'  => array( 'image' ),
			),
			array( 'source' => array( 'desktop' => $source ) )
		);
		$this->assertSame( 2000, $sources['desktop']['width'] );
		$this->assertSame( 1000, $sources['desktop']['height'] );
		$out = $this->render( '', array( 'source' => array( 'desktop' => $source ) ) );
		$this->assertStringContainsString( 'width="2000" height="1000"', $out['html'] );
	}

	// R12.
	public function test_r12_each_item_has_its_own_scope_and_the_block_rules_print_once(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/media-values.php';
		foreach ( glob( SGS_BLOCKS_PLUGIN_DIR . '/includes/media/atoms/*.php' ) as $file ) {
			require_once $file;
		}
		$attrs   = array(
			'itemSource' => array( 'desktop' => $this->img() ),
			'itemRatio'  => '4 / 3',
			'itemFit'    => 'contain',
		);
		$columns = array(
			'desktop' => 3,
			'tablet'  => 2,
			'mobile'  => 1,
		);
		$items   = array();
		foreach ( array( 0, 1, 2 ) as $i ) {
			$items[] = $this->render(
				'item',
				$attrs,
				array(
					'item_set' => array(
						'index'   => $i,
						'columns' => $columns,
					),
				)
			);
		}
		foreach ( $items as $i => $item ) {
			$this->assertStringContainsString( 'sgs-media-group sgs-media sgs-media--renderer u1-i' . $i . ' u1"', $item['html'] );
		}
		$this->assertNotSame( $items[0]['css'], $items[1]['css'] );
		$this->assertStringContainsString( '.u1-i1 .sgs-media-el{object-fit:contain', $items[1]['css'] );
		$this->assertStringContainsString( 'aspect-ratio:4 / 3', $items[0]['css'] );
		$this->assertSame( 1, substr_count( $items[0]['css'] . $items[1]['css'] . $items[2]['css'], 'aspect-ratio' ) );
	}

	public function test_r12_sizes_follow_each_devices_column_count(): void {
		$out = $this->render(
			'item',
			array(
				'itemSource' => array(
					'desktop' => $this->img( 'd.jpg' ),
					'tablet'  => $this->img( 't.jpg' ),
				),
			),
			array(
				'item_set' => array(
					'index'   => 0,
					'columns' => array(
						'desktop' => 4,
						'tablet'  => 2,
						'mobile'  => 1,
					),
				),
			)
		);
		$this->assertStringContainsString( 'sizes="auto, calc(100vw / 4)"', $out['html'] );
		// The tablet file also serves the phone (the mobile device inherits it), so its sizes carry both ranges.
		$this->assertStringContainsString( 'sizes="auto, (max-width:767.98px) 100vw, calc(100vw / 2)"', $out['html'] );
	}
}
