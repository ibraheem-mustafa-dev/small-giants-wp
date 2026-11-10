<?php
/**
 * `SGS_Media_Element::render()` (Spec 49 C2, §7.1, §7.3, §7.4, §7.6, §7.9), driven from the shared fixtures.
 *
 * The per-device cases replay `tests/fixtures/media/per-device-kinds.json`: for each width the test works out, from
 * the printed markup and CSS alone, which files a browser would request, and compares that with the fixture.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
class MediaElementRenderTest extends TestCase {

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
		// phpcs:enable
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

	private function fixture( string $name ): array {
		return json_decode( (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/tests/fixtures/media/' . $name ), true );
	}

	/** A fixture source entry as a stored Source object. */
	private function stored( array $s ): array {
		$kind = $s['kind'];
		$out  = array( 'kind' => $kind );
		if ( 'image' === $kind ) {
			$out += array(
				'url'    => '/u/' . $s['url'],
				'width'  => 1200,
				'height' => 800,
			);
		} elseif ( 'video' === $kind ) {
			$out += array(
				'url'    => '/u/' . $s['url'],
				'poster' => array(
					'url'    => '/u/' . $s['poster'],
					'width'  => 1200,
					'height' => 800,
				),
			);
		} elseif ( 'embed' === $kind ) {
			$out['url'] = $s['url'];
		} elseif ( 'svg' === $kind ) {
			$out['markup'] = $s['markup'];
		}
		return $out;
	}

	private function render_case( array $case, array $attrs_extra = array(), array $context = array() ): array {
		$attrs = array(
			'source' => array(),
			'alt'    => 'A photo',
		) + $attrs_extra;
		foreach ( $case['source'] as $device => $s ) {
			$attrs['source'][ $device ] = $this->stored( $s );
		}
		$autoplay = false;
		foreach ( $case['source'] as $s ) {
			$autoplay = $autoplay || ! empty( $s['autoplay'] );
		}
		$attrs['playback'] = array( 'autoplay' => $autoplay );
		return SGS_Media_Element::render(
			array(
				'prefix' => '',
				'kinds'  => array( 'image', 'video', 'embed', 'svg' ),
			),
			$attrs,
			array( 'uid' => 'u1' ) + $context
		);
	}

	private function query_matches( string $query, int $width ): bool {
		$ok = true;
		foreach ( explode( ' and ', $query ) as $part ) {
			if ( preg_match( '/\(max-width:\s*(\d+)px\)/', $part, $m ) ) {
				$ok = $ok && $width <= (int) $m[1];
			} elseif ( preg_match( '/\(min-width:\s*(\d+)px\)/', $part, $m ) ) {
				$ok = $ok && $width >= (int) $m[1];
			}
		}
		return $ok;
	}

	/** Files a browser requests at a width, from the markup and CSS alone (reduced motion off, script off). */
	private function requests( array $out, int $width, bool $reduced = false ): array {
		$hidden = array();
		if ( preg_match_all( '/@media(\([^)]*\)(?: and \([^)]*\))?)\{([^{}]+)\{display:none\}\}/', $out['css'], $rules, PREG_SET_ORDER ) ) {
			foreach ( $rules as $r ) {
				if ( $this->query_matches( $r[1], $width ) ) {
					foreach ( explode( ',', $r[2] ) as $sel ) {
						$hidden[] = trim( (string) preg_replace( '/^.*\.sgs-media-sib\./', '', $sel ) );
					}
				}
			}
		}
		$dom = new DOMDocument();
		libxml_use_internal_errors( true );
		$dom->loadHTML( '<?xml encoding="utf-8"?><body>' . $out['html'] . '</body>' );
		$xp   = new DOMXPath( $dom );
		$seen = array();
		$gone = static function ( DOMNode $n ) use ( $hidden ): bool {
			for ( ; $n instanceof DOMElement; $n = $n->parentNode ) {
				foreach ( explode( ' ', $n->getAttribute( 'class' ) ) as $c ) {
					if ( in_array( $c, $hidden, true ) ) {
						return true;
					}
				}
			}
			return false;
		};
		foreach ( $xp->query( '//picture' ) as $pic ) {
			if ( $gone( $pic ) ) {
				continue;
			}
			$file = null;
			foreach ( $xp->query( './source', $pic ) as $src ) {
				if ( $this->query_matches( $src->getAttribute( 'media' ), $width ) ) {
					$file = $src->getAttribute( 'srcset' );
					break;
				}
			}
			$file ??= $xp->query( './img', $pic )->item( 0 )->getAttribute( 'src' );
			if ( 0 !== strpos( $file, 'data:' ) ) {
				$seen[] = $file;
			}
		}
		foreach ( $xp->query( '//img[not(parent::picture)]' ) as $img ) {
			if ( ! $gone( $img ) && 0 !== strpos( $img->getAttribute( 'src' ), 'data:' ) ) {
				$seen[] = $img->getAttribute( 'src' );
			}
		}
		foreach ( $xp->query( '//video' ) as $video ) {
			if ( $gone( $video ) ) {
				continue;
			}
			foreach ( $xp->query( './source', $video ) as $src ) {
				$media = $src->getAttribute( 'media' );
				$media = $reduced ? $media : str_replace( ' and (prefers-reduced-motion:no-preference)', '', $media );
				$media = '(prefers-reduced-motion:no-preference)' === $media ? '(min-width:0px)' : $media;
				if ( ! $reduced || false === strpos( $media, 'prefers-reduced-motion' ) ) {
					foreach ( explode( ',', $media ) as $q ) {
						if ( '' === trim( $q ) || $this->query_matches( trim( $q ), $width ) ) {
							$seen[] = $src->getAttribute( 'src' );
							break 2;
						}
					}
				}
			}
		}
		foreach ( $xp->query( '//iframe' ) as $frame ) {
			if ( ! $gone( $frame ) ) {
				$seen[] = $frame->getAttribute( 'src' );
			}
		}
		return array_values( array_unique( $seen ) );
	}

	private function same_files( array $expected, array $actual, string $msg ): void {
		$norm = static function ( array $files ): array {
			$files = array_map(
				static fn( string $f ): string => preg_match( '#youtube-nocookie\.com/embed/x#', $f ) ? 'youtube-nocookie.com/embed/x' : basename( $f ),
				$files
			);
			sort( $files );
			return $files;
		};
		$this->assertSame( $norm( $expected ), $norm( $actual ), $msg );
	}

	public function test_per_device_kinds_request_only_the_files_the_fixture_allows(): void {
		$fixture = $this->fixture( 'per-device-kinds.json' );
		foreach ( $fixture['cases'] as $case ) {
			$out = $this->render_case( $case );
			$this->assertNotSame( '', $out['html'], $case['id'] );
			$this->assertStringNotContainsString( 'poster=', $out['html'], $case['id'] . ': a poster attribute downloads on every device' );
			foreach ( $fixture['widths'] as $device => $width ) {
				$this->same_files( $case['requests'][ $device ], $this->requests( $out, $width ), $case['id'] . ' at ' . $width );
			}
			if ( isset( $case['reducedMotion'] ) ) {
				$this->same_files( $case['reducedMotion'], $this->requests( $out, 1440, true ), $case['id'] . ' reduced motion' );
			}
		}
	}

	public function test_video_has_one_video_one_source_per_file_and_no_catch_all(): void {
		$case = $this->fixture( 'per-device-kinds.json' )['cases'][0];
		$out  = $this->render_case( $case );
		$this->assertSame( 1, substr_count( $out['html'], '<video' ) );
		preg_match_all( '/<source src="[^"]*" type="video[^>]*>/', $out['html'], $m );
		$this->assertCount( 1, $m[0] );
		$this->assertStringContainsString( 'media="(min-width:1024px) and (prefers-reduced-motion:no-preference), (min-width:768px) and (max-width:1023px) and (prefers-reduced-motion:no-preference)"', $m[0][0] );
	}

	public function test_a_device_showing_another_kind_gets_the_blank_gif_source(): void {
		$out = $this->render_case( $this->fixture( 'per-device-kinds.json' )['cases'][0] );
		$this->assertStringContainsString( 'srcset="data:image/gif;base64,', $out['html'] );
		$this->assertStringContainsString( 'sgs-media-picture', $out['html'] );
	}

	public function test_inline_svg_ids_are_prefixed_per_sibling(): void {
		if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			$this->markTestSkipped( 'SVG slots need WP_HTML_Tag_Processor; run-media-sizes-filter-standalone.php covers them on a real WordPress.' );
		}
		$svg = '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><circle fill="url(#g)" r="5"/></svg>';
		$out = SGS_Media_Element::render(
			array(
				'prefix' => '',
				'kinds'  => array( 'svg' ),
			),
			array(
				'source' => array(
					'desktop' => array(
						'kind'   => 'svg',
						'markup' => $svg,
					),
					'mobile'  => array(
						'kind'   => 'svg',
						'markup' => str_replace( 'r="5"', 'r="4"', $svg ),
					),
				),
				'alt'    => 'Mark',
			),
			array( 'uid' => 'u1' )
		);
		$this->assertStringContainsString( 'id="u1-s1-g"', $out['html'] );
		$this->assertStringContainsString( 'id="u1-s2-g"', $out['html'] );
		$this->assertStringContainsString( 'url(#u1-s2-g)', $out['html'] );
		$this->assertStringNotContainsString( 'id="g"', $out['html'] );
	}

	public function test_embed_is_a_lazy_iframe_without_width_or_height_and_refuses_other_hosts(): void {
		$case = $this->fixture( 'per-device-kinds.json' )['cases'][4];
		$out  = $this->render_case( $case );
		$this->assertStringContainsString( '<iframe', $out['html'] );
		$this->assertStringContainsString( 'loading="lazy"', $out['html'] );
		$this->assertDoesNotMatchRegularExpression( '/<iframe[^>]*\s(width|height)=/', $out['html'] );
		$bad = $case;
		$bad['source']['desktop']['url'] = 'https://evil.example/embed/x';
		$bad['source']['mobile']         = array( 'kind' => 'none' );
		$this->assertSame( '', $this->render_case( $bad )['html'] );
	}

	public function test_empty_source_returns_empty_html(): void {
		$out = SGS_Media_Element::render( array( 'prefix' => '', 'kinds' => array( 'image' ) ), array(), array( 'uid' => 'u1' ) );
		$this->assertSame( '', $out['html'] );
		$this->assertFalse( $out['needs_helper'] );
	}

	public function test_helper_triggers_follow_the_matrix_fixture(): void {
		$matrix = $this->fixture( 'matrix.json' )['helperTriggers'];
		$base   = array(
			'source' => array(
				'desktop' => array(
					'kind'   => 'image',
					'url'    => '/u/a.jpg',
					'width'  => 600,
					'height' => 400,
				),
			),
		);
		$ctx_keys = array( 'effect', 'entrance', 'hover' );
		$run      = function ( array $case ) use ( $base, $ctx_keys ): array {
			$attrs   = $base;
			$context = array( 'uid' => 'u1' );
			foreach ( $case as $key => $value ) {
				if ( 'effect' === $key ) {
					$context['effects'] = array( $value );
				} elseif ( in_array( $key, $ctx_keys, true ) ) {
					$context[ $key ] = $value;
				} elseif ( in_array( $key, array( 'caption' ), true ) ) {
					$attrs['caption'] = $value;
				} elseif ( 'link' === $key ) {
					$attrs['linkUrl'] = $value;
				} else {
					$attrs[ lcfirst( $key ) ] = $value;
				}
			}
			return SGS_Media_Element::render( array( 'prefix' => '', 'kinds' => array( 'image' ) ), $attrs, $context );
		};
		foreach ( $matrix['prints'] as $case ) {
			$out = $run( $case );
			$this->assertTrue( $out['needs_helper'], 'prints: ' . json_encode( $case ) );
			$this->assertStringContainsString( 'sgs-media-box', $out['html'] );
		}
		foreach ( $matrix['absent'] as $case ) {
			$out = $run( $case );
			$this->assertFalse( $out['needs_helper'], 'absent: ' . json_encode( $case ) );
			$this->assertStringNotContainsString( 'sgs-media-box', $out['html'] );
		}
	}

	public function test_nesting_figure_link_helper_and_the_uid_owner(): void {
		$attrs = array(
			'source'          => array(
				'desktop' => array(
					'kind'   => 'image',
					'url'    => '/u/a.jpg',
					'width'  => 600,
					'height' => 400,
				),
			),
			'caption'         => 'Cap',
			'linkUrl'         => 'https://example.com',
			'overlayColour'   => '#000',
			'height'          => 'fill',
		);
		$out   = SGS_Media_Element::render( array( 'prefix' => '', 'kinds' => array( 'image' ) ), $attrs, array( 'uid' => 'u1' ) );
		$this->assertMatchesRegularExpression( '#^<figure class="sgs-fill-wrap sgs-media u1"><a class="sgs-media-link"[^>]*><span class="sgs-media-box sgs-media-box--fill"><img #', $out['html'] );
		$this->assertStringContainsString( '<figcaption class="sgs-media-caption">Cap</figcaption>', $out['html'] );
		$attrs['caption'] = '';
		$attrs['linkUrl'] = '';
		$bare             = SGS_Media_Element::render( array( 'prefix' => '', 'kinds' => array( 'image' ) ), $attrs, array( 'uid' => 'u1' ) );
		$this->assertMatchesRegularExpression( '#^<span class="sgs-media-box sgs-media-box--fill sgs-media u1">#', $bare['html'] );
	}

	public function test_a_plain_single_image_carries_the_uid_on_the_img_and_no_wrapper(): void {
		$out = SGS_Media_Element::render(
			array( 'prefix' => '', 'kinds' => array( 'image' ) ),
			array(
				'source' => array(
					'desktop' => array(
						'kind'   => 'image',
						'url'    => '/u/a.jpg',
						'width'  => 600,
						'height' => 400,
					),
				),
				'alt'    => 'Photo',
			),
			array( 'uid' => 'u1' )
		);
		$this->assertMatchesRegularExpression( '#^<img [^>]*class="sgs-media-el sgs-media u1"[^>]*width="600" height="400"#', $out['html'] );
		$this->assertStringContainsString( 'alt="Photo"', $out['html'] );
		$this->assertSame( '', $out['css'] );
	}

	public function test_sizes_follow_section_7_6(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/render-sources.php';
		$this->assertSame( '(max-width: 320px) 100vw, 320px', sgs_media_sizes_for_width( '320px', false ) );
		$this->assertSame( '50vw', sgs_media_sizes_for_width( '50vw', false ) );
		$this->assertSame( '(max-width: 320px) 100vw, 320px', sgs_media_sizes_for_width( '20rem', false ) );
		$this->assertSame( '100vw', sgs_media_sizes_for_width( '100%', false ) );
		$this->assertSame( 'auto, 100vw', sgs_media_sizes_for_width( null, true ) );
		$this->assertSame( 'calc(100vw / 3)', sgs_media_sizes_for_width( null, false, 3 ) );
	}

	public function test_atom_emitters_are_collected_when_they_exist(): void {
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- test double for an atom emitter.
		function sgs_media_atom_zz_probe_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
			return '.' . $uid . '{--probe:' . ( $helper ? 'helper' : 'bare' ) . ( ! empty( $slot['wrapper'] ) ? '-wrapped' : '' ) . '}';
		}
		$attrs = array(
			'source'  => array(
				'desktop' => array(
					'kind'   => 'image',
					'url'    => '/u/a.jpg',
					'width'  => 600,
					'height' => 400,
				),
			),
			'caption' => 'Cap',
		);
		$out   = SGS_Media_Element::render( array( 'prefix' => '', 'kinds' => array( 'image' ) ), $attrs, array( 'uid' => 'u1' ) );
		$this->assertStringContainsString( '.u1{--probe:bare-wrapped}', $out['css'] );
	}
}
