<?php
/**
 * Tests: border CSS parity across every element that paints a border.
 *
 * A target is a (block, attribute prefix) pair. Renders the real render.php of each target's block for a
 * matrix of border cases and compares the printed CSS with a recorded golden. The comparison is by the SET
 * of declarations per (media/supports context || selector): rule grouping and declaration order may change,
 * the per-selector declaration set may not.
 *
 * Attribute names follow sgs_typography_attr(): prefix '' reads borderWidth, borderColour and so on; prefix
 * 'field' reads fieldBorderWidth, fieldBorderColour and so on.
 *
 * Determinism: every block derives its scoped class from md5( wp_json_encode( $attributes ) ), so a given case
 * always renders the same class. The class is still normalised to `<prefix>-UID` (regex
 * sgs-<words>-<hex 8..32>) so that a future change to the hash input cannot churn the goldens.
 *
 * Goldens live in tests/php/fixtures/border-element/<block>.json (prefix '') or <block>--<prefix>.json.
 *
 * Record goldens (writes the golden file, then reports the run as skipped; narrow with --filter so only the
 * targets you mean are rewritten):
 *   SGS_RECORD_BORDER_GOLDENS=1 vendor/bin/phpunit --filter 'BorderElementParityTest::test_border_css.*with data set "card-grid /'
 * Assert:
 *   vendor/bin/phpunit --filter BorderElementParityTest
 * One target's cases: --filter 'with data set "tab /' (the opening quote anchors the name, so tab does not
 * match tabs or product-faq). A prefixed target needs its brackets escaped: --filter 'with data set "form\[field\] /'.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Per-target border CSS declaration-set parity.
 */
final class BorderElementParityTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * Every target as array( block folder, attribute prefix ).
	 *
	 * Not here, because the render harness cannot run it: buybox (a variable WooCommerce product is needed
	 * before it prints any CSS; without WooCommerce it echoes core fallback blocks that carry none). Its root
	 * border is the same single sgs_border_element_decls() call and is read on the live site instead.
	 */
	private const TARGETS = array(
		array( 'quote', '' ),
		array( 'counter', '' ),
		array( 'heading', '' ),
		array( 'icon-list', '' ),
		array( 'process-steps', '' ),
		array( 'timeline', '' ),
		array( 'accordion-item', '' ),
		array( 'form-field-tiles', '' ),
		array( 'form-step', '' ),
		array( 'google-reviews', '' ),
		array( 'multi-button', '' ),
		array( 'physics-canvas', '' ),
		array( 'post-grid', '' ),
		array( 'pricing-table', '' ),
		array( 'site-footer', '' ),
		array( 'site-footer-row', '' ),
		array( 'site-header', '' ),
		array( 'site-header-row', '' ),
		array( 'trust-bar', '' ),
		array( 'card-grid', '' ),
		array( 'feature-grid', '' ),
		array( 'gallery', '' ),
		array( 'hero', '' ),
		array( 'info-box', '' ),
		array( 'tab', '' ),
		array( 'testimonial', '' ),
		array( 'testimonial-slider', '' ),
		array( 'brand-strip', '' ),
		array( 'countdown-timer', '' ),
		array( 'notice-banner', '' ),
		array( 'product-faq', '' ),
		array( 'product-faq-item', '' ),
		array( 'team-member', '' ),
		array( 'breadcrumbs', '' ),
		array( 'business-info', '' ),
		array( 'product-search', '' ),
		array( 'star-rating', '' ),
		array( 'text', '' ),
		array( 'cta-section', '' ),
		array( 'modal', '' ),
		array( 'form', '' ),
		array( 'container', '' ),
		array( 'accordion', '' ),
		array( 'product-card', '' ),
		array( 'social-icons', 'wrapper' ),
		array( 'form', 'field' ),
		array( 'tabs', '' ),
		array( 'table-of-contents', '' ),
		array( 'trustpilot-reviews', '' ),
		array( 'audio', '' ),
		array( 'responsive-logo', '' ),
		array( 'store-selector', '' ),
		array( 'nav-drawer', '' ),
		array( 'before-after', '' ),
		array( 'theme-toggle', '' ),
		array( 'mega-aside', 'aside' ),
		array( 'filter-search', 'input' ),
	);

	/**
	 * Minimum extra attributes, ancestor context and inner content a block needs before it prints any CSS.
	 * Keyed by target name, falling back to the block folder name.
	 */
	private const BASES = array(
		'quote'                 => array( 'attrs' => array( 'attribution' => 'Parity' ) ),
		'google-reviews'        => array( 'attrs' => array( 'dataSource' => 'placeholder' ) ),
		'site-footer-row'       => array( 'content' => '<p>Parity</p>' ),
		'site-header-row'       => array( 'content' => '<p>Parity</p>' ),
		'card-grid'             => array(
			'attrs' => array(
				'items' => array(
					array(
						'title'       => 'One',
						'description' => 'Two',
					),
				),
			),
		),
		'testimonial'           => array(
			'attrs' => array(
				'quote'          => 'Parity quote',
				'nameFontWeight' => '700',
			),
		),
		'star-rating'           => array( 'attrs' => array( 'displayMode' => 'stars-only' ) ),
		'product-faq-item'      => array( 'attrs' => array( 'question' => 'Q?' ) ),
		'text'                  => array( 'attrs' => array( 'text' => 'Parity' ) ),
		'business-info'         => array( 'attrs' => array( 'displayType' => 'attribution' ) ),
		'tabs'                  => array(
			'attrs'   => array( 'tabAlignment' => 'start' ),
			'harness' => array(
				'inner-blocks' => array(
					array(
						'name'       => 'sgs/tab',
						'attributes' => array( 'label' => 'One' ),
						'html'       => '<p>Parity</p>',
					),
				),
			),
		),
		'table-of-contents'     => array(
			'harness' => array( 'post-content' => '<!-- wp:sgs/heading {"level":"h2","content":"One"} /--><!-- wp:sgs/heading {"level":"h3","content":"Two"} /-->' ),
		),
		'trustpilot-reviews'    => array( 'attrs' => array( 'dataSource' => 'placeholder' ) ),
		'audio'                 => array( 'attrs' => array( 'audioUrl' => 'https://example.test/parity.mp3' ) ),
		'responsive-logo'       => array( 'attrs' => array( 'logoUrl' => 'https://example.test/parity.png' ) ),
		'store-selector'        => array(
			'attrs' => array(
				'stores' => array(
					array(
						'label' => 'UK',
						'url'   => 'https://example.test/uk',
					),
				),
			),
		),
		'nav-drawer'            => array(
			'attrs' => array(
				'drawerAlign'  => 'start',
				'submenuModel' => 'accordion',
			),
		),
		'before-after'          => array(
			'attrs' => array(
				'heightUnit'     => 'px',
				'beforeImageUrl' => 'https://example.test/before.jpg',
				'afterImageUrl'  => 'https://example.test/after.jpg',
			),
		),
		'theme-toggle'          => array(
			'harness' => array( 'global-settings' => array( 'custom' => array( 'dark' => array( 'background' => '#111111' ) ) ) ),
		),
		'filter-search[input]'  => array(
			'attrs'   => array(
				'taxonomy'  => 'product_brand',
				'threshold' => 2,
			),
			'harness' => array(
				'taxonomies' => array(
					'product_brand' => array(
						'label'        => 'Brand',
						'object_types' => array( 'product' ),
						'terms'        => array(
							array(
								'term_id' => 1,
								'slug'    => 'a',
								'name'    => 'A',
							),
							array(
								'term_id' => 2,
								'slug'    => 'b',
								'name'    => 'B',
							),
						),
					),
				),
			),
		),
		'social-icons[wrapper]' => array(
			'attrs' => array(
				'icons' => array(
					array(
						'platform' => 'facebook',
						'url'      => 'https://example.test/fb',
					),
				),
			),
		),
	);

	/**
	 * Data-set name of a target: the block, plus [prefix] when it has one.
	 *
	 * @param string $block  Block folder name.
	 * @param string $prefix Attribute prefix.
	 */
	private static function target_name( string $block, string $prefix ): string {
		return '' === $prefix ? $block : $block . '[' . $prefix . ']';
	}

	/**
	 * An attribute name for a prefix, following sgs_typography_attr().
	 *
	 * @param string $prefix Attribute prefix.
	 * @param string $name   Unprefixed camelCase name, e.g. borderWidth.
	 */
	private static function attr( string $prefix, string $name ): string {
		return '' === $prefix ? $name : $prefix . ucfirst( $name );
	}

	/**
	 * The attribute names a block.json declares.
	 *
	 * @param string $block Block folder name.
	 * @return array<int, string>
	 */
	private static function block_attrs( string $block ): array {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/' . $block . '/block.json' ), true );
		return array_keys( $json['attributes'] ?? array() );
	}

	/**
	 * Case => unprefixed attribute names that must be declared for the case to apply.
	 *
	 * @return array<string, array<int, string>>
	 */
	private static function case_requirements(): array {
		return array(
			'a_baseline'           => array(),
			'b_equal_sides'        => array( 'borderWidth', 'borderColour' ),
			'c_unequal_dashed_raw' => array( 'borderWidth', 'borderStyle', 'borderColour' ),
			'd_style_none'         => array( 'borderWidth', 'borderStyle', 'borderColour' ),
			'e_widths_no_colour'   => array( 'borderWidth' ),
			'f_colour_no_widths'   => array( 'borderColour' ),
			'g_gradient'           => array( 'borderWidth', 'borderColourGradient' ),
			'h_hover_flat'         => array( 'borderWidth', 'borderColour', 'borderColourHover' ),
			'i_hover_gradient'     => array( 'borderWidth', 'borderColourGradient', 'borderColourHoverGradient' ),
			'j_radius_uniform'     => array( 'borderRadius' ),
			'k_radius_tiers'       => array( 'borderRadius' ),
			'l_inherit_style'      => array( 'borderWidth', 'borderColour', 'inheritStyle' ),
		);
	}

	/**
	 * Attributes for a case, with the border names carrying the target's prefix.
	 *
	 * @param string $case   Case name.
	 * @param string $prefix Attribute prefix.
	 * @return array<string, mixed>
	 */
	private static function case_attrs( string $case, string $prefix = '' ): array {
		$out = array();
		foreach ( self::case_attrs_unprefixed( $case ) as $name => $value ) {
			$out[ 'inheritStyle' === $name ? $name : self::attr( $prefix, $name ) ] = $value;
		}
		return $out;
	}

	/**
	 * Attributes for a case under the unprefixed names.
	 *
	 * @param string $case Case name.
	 * @return array<string, mixed>
	 * @throws InvalidArgumentException For a case name the matrix does not define.
	 */
	private static function case_attrs_unprefixed( string $case ): array {
		$two = array(
			'top'    => '2px',
			'right'  => '2px',
			'bottom' => '2px',
			'left'   => '2px',
		);
		switch ( $case ) {
			case 'a_baseline':
				return array();
			case 'b_equal_sides':
				return array(
					'borderWidth'  => $two,
					'borderColour' => 'primary',
				);
			case 'c_unequal_dashed_raw':
				return array(
					'borderWidth'  => array(
						'top'  => '1px',
						'left' => '4px',
					),
					'borderStyle'  => 'dashed',
					'borderColour' => '#ff0000',
				);
			case 'd_style_none':
				return array(
					'borderWidth'  => $two,
					'borderStyle'  => 'none',
					'borderColour' => 'primary',
				);
			case 'e_widths_no_colour':
				return array( 'borderWidth' => $two );
			case 'f_colour_no_widths':
				return array( 'borderColour' => 'primary' );
			case 'g_gradient':
				return array(
					'borderWidth'          => array(
						'top'    => '3px',
						'right'  => '3px',
						'bottom' => '3px',
						'left'   => '3px',
					),
					'borderColourGradient' => 'linear-gradient(90deg,#f00,#00f)',
				);
			case 'h_hover_flat':
				return array(
					'borderWidth'       => $two,
					'borderColour'      => 'primary',
					'borderColourHover' => 'secondary',
				);
			case 'i_hover_gradient':
				return array(
					'borderWidth'               => $two,
					'borderColourGradient'      => 'linear-gradient(90deg,#f00,#00f)',
					'borderColourHoverGradient' => 'linear-gradient(45deg,#0f0,#ff0)',
				);
			case 'j_radius_uniform':
				return array( 'borderRadius' => '8px' );
			case 'k_radius_tiers':
				return array(
					'borderRadius' => array(
						'desktop' => array(
							'topLeft'     => '12px',
							'topRight'    => '12px',
							'bottomRight' => '4px',
							'bottomLeft'  => '4px',
						),
						'tablet'  => array( 'topLeft' => '6px' ),
						'mobile'  => array(
							'topLeft'  => '2px',
							'topRight' => '3px',
						),
					),
				);
			case 'l_inherit_style':
				return array(
					'borderWidth'  => $two,
					'borderColour' => 'primary',
					'inheritStyle' => true,
				);
		}
		throw new InvalidArgumentException( 'unknown case ' . esc_html( $case ) );
	}

	/**
	 * Every (target, case) pair whose attributes the block declares.
	 *
	 * @return array<string, array{0: string, 1: string, 2: string}>
	 */
	public static function cases(): array {
		$out = array();
		foreach ( self::TARGETS as $target ) {
			list( $block, $prefix ) = $target;
			$attrs                  = self::block_attrs( $block );
			$name                   = self::target_name( $block, $prefix );
			foreach ( self::case_requirements() as $case => $needs ) {
				$needs = array_map(
					static fn( string $n ): string => 'inheritStyle' === $n ? $n : self::attr( $prefix, $n ),
					$needs
				);
				if ( array() === array_diff( $needs, $attrs ) ) {
					$out[ $name . ' / ' . $case ] = array( $block, $prefix, $case );
				}
			}
		}
		return $out;
	}

	/**
	 * Targets whose block declares the prefixed radius attribute and that are not a known order exception.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function radius_targets(): array {
		$out = array();
		foreach ( self::TARGETS as $target ) {
			list( $block, $prefix ) = $target;
			$name                   = self::target_name( $block, $prefix );
			if ( in_array( self::attr( $prefix, 'borderRadius' ), self::block_attrs( $block ), true ) ) {
				$out[ $name ] = array( $block, $prefix );
			}
		}
		return $out;
	}

	/**
	 * Render one target with its minimum base attributes, context and inner content.
	 *
	 * @param string               $block Block folder name.
	 * @param string               $prefix Attribute prefix.
	 * @param array<string, mixed> $attrs  Case attributes.
	 * @return array{html: string, css: string}
	 */
	private function render_target( string $block, string $prefix, array $attrs ): array {
		$name    = self::target_name( $block, $prefix );
		$base    = self::BASES[ $name ] ?? self::BASES[ $block ] ?? array();
		$attrs   = array_merge( $base['attrs'] ?? array(), $attrs );
		$context = $base['context'] ?? array();
		$content = $base['content'] ?? '';
		$extra   = $base['harness'] ?? array();
		if ( '' === $content && array() === $extra ) {
			return $this->render_block( 'sgs/' . $block, $attrs, $context );
		}
		return $this->render_block_with_content( 'sgs/' . $block, $attrs, $context, $content, $extra );
	}

	/**
	 * Render a real block in a child process with inner content (the trait cannot pass --content).
	 *
	 * @param string               $slug    Block slug, e.g. 'sgs/site-footer-row'.
	 * @param array<string, mixed> $attrs   Block attributes.
	 * @param array<string, mixed> $context Ancestor block context.
	 * @param string               $content Rendered inner-block HTML.
	 * @param array<string, mixed> $extra   Harness inputs: 'inner-blocks' (list of name/attributes/html), 'post-content'
	 *                                      (serialised global post content), 'global-settings' (settings tree), 'taxonomies' (registry).
	 * @return array{html: string, css: string}
	 */
	private function render_block_with_content( string $slug, array $attrs, array $context, string $content, array $extra = array() ): array {
		$harness   = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$attrs_f   = tempnam( sys_get_temp_dir(), 'sgsat' );
		$context_f = tempnam( sys_get_temp_dir(), 'sgsct' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $context_f, json_encode( (object) $context, JSON_THROW_ON_ERROR ) );
		$files = array( $attrs_f, $context_f );
		$flags = '';
		if ( isset( $extra['inner-blocks'] ) ) {
			$f = tempnam( sys_get_temp_dir(), 'sgsib' );
			file_put_contents( $f, json_encode( $extra['inner-blocks'], JSON_THROW_ON_ERROR ) );
			$files[] = $f;
			$flags  .= ' --inner-blocks-file ' . escapeshellarg( $f );
		}
		if ( isset( $extra['post-content'] ) ) {
			$f = tempnam( sys_get_temp_dir(), 'sgspc' );
			file_put_contents( $f, (string) $extra['post-content'] );
			$files[] = $f;
			$flags  .= ' --post-content-file ' . escapeshellarg( $f );
		}
		if ( isset( $extra['taxonomies'] ) ) {
			$f = tempnam( sys_get_temp_dir(), 'sgstx' );
			file_put_contents( $f, json_encode( $extra['taxonomies'], JSON_THROW_ON_ERROR ) );
			$files[] = $f;
			$flags  .= ' --taxonomies-file ' . escapeshellarg( $f );
		}
		if ( isset( $extra['global-settings'] ) ) {
			$f = tempnam( sys_get_temp_dir(), 'sgsgs' );
			file_put_contents( $f, json_encode( $extra['global-settings'], JSON_THROW_ON_ERROR ) );
			$files[] = $f;
			$flags  .= ' --global-settings-file ' . escapeshellarg( $f );
		}

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ' --attrs-file ' . escapeshellarg( $attrs_f )
				. ' --context-file ' . escapeshellarg( $context_f )
				. $flags
				. ' --content ' . escapeshellarg( $content ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			foreach ( $files as $tmp ) {
				@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			}
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );

		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	/**
	 * The desktop radius rule prints BEFORE the tablet and mobile media rules.
	 *
	 * Both carry the root selector at the same specificity, so whichever comes
	 * later wins; a desktop rule printed after the media rules silently beats
	 * the tablet and mobile radius. The declaration-set comparison cannot see
	 * order, so this test does.
	 *
	 * @param string $block  Block folder name.
	 * @param string $prefix Attribute prefix.
	 */
	#[DataProvider( 'radius_targets' )]
	public function test_desktop_radius_precedes_the_tier_radius( string $block, string $prefix ): void {
		$name    = self::target_name( $block, $prefix );
		$css     = $this->render_target( $block, $prefix, self::case_attrs( 'k_radius_tiers', $prefix ) )['css'];
		$desktop = strpos( $css, 'border-top-left-radius:12px' );
		$tablet  = strpos( $css, 'border-top-left-radius:6px' );
		$mobile  = strpos( $css, 'border-top-left-radius:2px' );
		$this->assertNotFalse( $desktop, "{$name}: desktop radius not printed" );
		$this->assertNotFalse( $tablet, "{$name}: tablet radius not printed" );
		$this->assertNotFalse( $mobile, "{$name}: mobile radius not printed" );
		$this->assertLessThan( $tablet, $desktop, "{$name}: the desktop radius prints after the tablet media rule, so it beats it" );
		$this->assertLessThan( $mobile, $tablet, "{$name}: the tablet radius prints after the mobile media rule, so it beats it" );
	}

	/**
	 * Render, parse and compare (or record) one case.
	 *
	 * @param string $block  Block folder name.
	 * @param string $prefix Attribute prefix.
	 * @param string $case   Case name.
	 */
	#[DataProvider( 'cases' )]
	public function test_border_css_declaration_sets_are_unchanged( string $block, string $prefix, string $case ): void {
		$name = self::target_name( $block, $prefix );
		$out  = $this->render_target( $block, $prefix, self::case_attrs( $case, $prefix ) );
		$map  = self::parse_css( $out['css'] );

		$file = __DIR__ . '/fixtures/border-element/' . $block . ( '' === $prefix ? '' : '--' . $prefix ) . '.json';

		if ( '1' === getenv( 'SGS_RECORD_BORDER_GOLDENS' ) ) {
			$golden          = is_file( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : array();
			$golden          = is_array( $golden ) ? $golden : array();
			$golden[ $case ] = $map;
			ksort( $golden );
			if ( ! is_dir( dirname( $file ) ) ) {
				mkdir( dirname( $file ), 0777, true );
			}
			file_put_contents( $file, json_encode( $golden, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( "RECORD MODE: wrote golden for {$name} / {$case}; nothing was asserted." );
		}

		$this->assertFileExists( $file, 'no golden for ' . $name . '; record with SGS_RECORD_BORDER_GOLDENS=1' );
		$golden = json_decode( (string) file_get_contents( $file ), true );
		$this->assertArrayHasKey( $case, $golden, "no golden for {$name} / {$case}" );

		$diff = self::diff( $golden[ $case ], $map );
		$this->assertSame( '', $diff, "{$name} / {$case}: printed CSS declaration set changed:\n" . $diff );
	}

	/**
	 * Human-readable difference between two declaration maps.
	 *
	 * @param array<string, array<int, string>> $want Golden.
	 * @param array<string, array<int, string>> $got  Actual.
	 */
	private static function diff( array $want, array $got ): string {
		$lines = array();
		foreach ( array_unique( array_merge( array_keys( $want ), array_keys( $got ) ) ) as $key ) {
			$w       = $want[ $key ] ?? null;
			$g       = $got[ $key ] ?? null;
			$missing = array_diff( $w ?? array(), $g ?? array() );
			$extra   = array_diff( $g ?? array(), $w ?? array() );
			if ( null === $w ) {
				$lines[] = "  [{$key}] selector is NEW; declarations: " . implode( '; ', $g );
			} elseif ( null === $g ) {
				$lines[] = "  [{$key}] selector is GONE; declarations were: " . implode( '; ', $w );
			} elseif ( $missing || $extra ) {
				$lines[] = "  [{$key}] missing: " . ( $missing ? implode( '; ', $missing ) : '-' ) . ' | extra: ' . ( $extra ? implode( '; ', $extra ) : '-' );
			}
		}
		return implode( "\n", $lines );
	}

	/**
	 * Parse CSS into "context || selector" => sorted unique "prop:value" list.
	 *
	 * @param string $css Raw printed CSS.
	 * @return array<string, array<int, string>>
	 */
	public static function parse_css( string $css ): array {
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		// Per-render unique class (md5 of the attributes) is normalised.
		$css = (string) preg_replace( '/\bsgs-([a-z]+(?:-[a-z]+)*)-[0-9a-f]{8,32}\b/', 'sgs-$1-UID', $css );
		$map = array();
		self::walk( $css, '', $map );
		foreach ( $map as $key => $decls ) {
			$decls = array_values( array_unique( $decls ) );
			sort( $decls, SORT_STRING );
			$map[ $key ] = $decls;
		}
		ksort( $map );
		return $map;
	}

	/**
	 * Split text at depth-0 occurrences of a delimiter, respecting (), [], quotes and {}.
	 *
	 * @param string $text  Text.
	 * @param string $delim Single-character delimiter.
	 * @return array<int, string>
	 */
	private static function split_top( string $text, string $delim ): array {
		$parts = array();
		$cur   = '';
		$depth = 0;
		$quote = '';
		$len   = strlen( $text );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $text[ $i ];
			if ( '' !== $quote ) {
				$cur .= $c;
				if ( '\\' === $c && $i + 1 < $len ) {
					$cur .= $text[ ++$i ];
				} elseif ( $c === $quote ) {
					$quote = '';
				}
				continue;
			}
			if ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '(' === $c || '[' === $c || '{' === $c ) {
				++$depth;
			} elseif ( ')' === $c || ']' === $c || '}' === $c ) {
				--$depth;
			} elseif ( $c === $delim && 0 === $depth ) {
				$parts[] = $cur;
				$cur     = '';
				continue;
			}
			$cur .= $c;
		}
		$parts[] = $cur;
		return $parts;
	}

	/**
	 * Collapse whitespace, including around structural punctuation.
	 *
	 * @param string $s Text.
	 */
	private static function norm( string $s ): string {
		$s = trim( (string) preg_replace( '/\s+/', ' ', $s ) );
		$s = (string) preg_replace( '/\s*([,>+~])\s*(?![^(]*\))/', '$1', $s );
		return (string) preg_replace( '/\s*([:,])\s+/', '$1', $s );
	}

	/**
	 * Walk a stylesheet body, filling $map.
	 *
	 * @param string                            $css     CSS text.
	 * @param string                            $context Wrapping at-rule chain.
	 * @param array<string, array<int, string>> $map     Output.
	 */
	private static function walk( string $css, string $context, array &$map ): void {
		$len = strlen( $css );
		$i   = 0;
		while ( $i < $len ) {
			// Find the next '{' or ';' at depth 0 (prelude end).
			$j     = $i;
			$depth = 0;
			$quote = '';
			for ( ; $j < $len; $j++ ) {
				$c = $css[ $j ];
				if ( '' !== $quote ) {
					if ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '(' === $c ) {
					++$depth;
				} elseif ( ')' === $c ) {
					--$depth;
				} elseif ( 0 === $depth && ( '{' === $c || ';' === $c ) ) {
					break;
				}
			}
			$prelude = trim( substr( $css, $i, $j - $i ) );
			if ( $j >= $len || ';' === $css[ $j ] ) {
				$i = $j + 1; // Statement at-rule (@import/@charset) or trailing junk.
				continue;
			}
			// Match the closing brace.
			$d     = 0;
			$quote = '';
			$k     = $j;
			for ( ; $k < $len; $k++ ) {
				$c = $css[ $k ];
				if ( '' !== $quote ) {
					if ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '{' === $c ) {
					++$d;
				} elseif ( '}' === $c ) {
					--$d;
					if ( 0 === $d ) {
						break;
					}
				}
			}
			$body = substr( $css, $j + 1, $k - $j - 1 );
			$i    = $k + 1;

			$prelude = self::norm( $prelude );
			if ( '' !== $prelude && '@' === $prelude[0] && 1 === preg_match( '/^@(media|supports|container|layer|keyframes|-webkit-keyframes)\b/', $prelude ) ) {
				self::walk( $body, '' === $context ? $prelude : $context . ' >> ' . $prelude, $map );
				continue;
			}
			self::rule( $prelude, $body, $context, $map );
		}
	}

	/**
	 * Record one style rule's declarations (nested rules are keyed under their parent selector).
	 *
	 * @param string                            $selector Selector as printed, whitespace-normalised.
	 * @param string                            $body     Rule body.
	 * @param string                            $context  At-rule chain.
	 * @param array<string, array<int, string>> $map      Output.
	 */
	private static function rule( string $selector, string $body, string $context, array &$map ): void {
		$key           = $context . ' || ' . $selector;
		$map[ $key ] ??= array();
		foreach ( self::split_top( $body, ';' ) as $segment ) {
			$segment = trim( $segment );
			if ( '' === $segment ) {
				continue;
			}
			if ( false !== strpos( $segment, '{' ) ) {
				$brace = strpos( $segment, '{' );
				$inner = self::norm( substr( $segment, 0, $brace ) );
				self::rule( $selector . ' >> ' . $inner, substr( $segment, $brace + 1, -1 ), $context, $map );
				continue;
			}
			$colon = strpos( $segment, ':' );
			if ( false === $colon ) {
				continue;
			}
			$prop          = strtolower( trim( substr( $segment, 0, $colon ) ) );
			$val           = trim( (string) preg_replace( '/\s+/', ' ', substr( $segment, $colon + 1 ) ) );
			$val           = (string) preg_replace( '/\s*,\s*/', ',', $val );
			$val           = (string) preg_replace( '/\(\s+/', '(', $val );
			$val           = (string) preg_replace( '/\s+\)/', ')', $val );
			$map[ $key ][] = $prop . ':' . $val;
		}
		if ( array() === $map[ $key ] ) {
			unset( $map[ $key ] );
		}
	}
}
