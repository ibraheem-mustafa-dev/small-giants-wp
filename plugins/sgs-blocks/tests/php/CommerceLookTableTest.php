<?php
/**
 * The Cart and Checkout look table (selectors.json `columns` and each row's `columns`): the settings it defines do
 * not repeat a hand-written one, every one is registered on the server, a block with none set prints nothing, and
 * the planned values of the Eye Care checkout print each Custom CSS declaration they replace on the same element
 * list at the same or a higher specificity (fixtures/commerce-look-checkout-table.json: `settings` are the planned
 * attribute values, `expect` each replaced declaration with the Custom CSS selector it came from, and `via` the
 * selector an existing setting prints on when that differs).
 *
 * Run with: php vendor/phpunit/phpunit/phpunit tests/php/CommerceLookTableTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookTableTest extends TestCase {

	private function root(): string {
		return dirname( __DIR__, 2 ) . '/';
	}

	/**
	 * Run one writer expression in a child process (its include files define functions the PHPUnit process must not load).
	 *
	 * @param string $expression PHP expression that returns a string, run after the writer is loaded.
	 */
	private function run_php( string $expression ): string {
		$root   = $this->root();
		$script = tempnam( sys_get_temp_dir(), 'sgsct' );
		// The theme's font families are not loaded here: two stand in so a family slug resolves to its custom property.
		$families = "if ( ! function_exists( 'wp_get_global_settings' ) ) { function wp_get_global_settings() { return array( array( array( 'slug' => 'heading' ), array( 'slug' => 'body' ) ) ); } }
";
		file_put_contents(
			$script,
			"<?php
define( 'ABSPATH', " . var_export( $root, true ) . " );
define( 'SGS_BLOCKS_PATH', ABSPATH );
"
			. $families . "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';
require ABSPATH . 'includes/render-helpers.php';
"
			. "require ABSPATH . 'includes/woocommerce/commerce-look/writer.php';
"
			. 'echo ' . $expression . ';
'
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' -d display_errors=0 ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	/**
	 * The writer's CSS for the attributes.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $block 'cart' or 'checkout'.
	 */
	private function css( array $attrs, string $block = 'checkout' ): string {
		return $this->run_php( '\\SGS\\Blocks\\sgs_commerce_look_css( json_decode( ' . var_export( json_encode( $attrs ), true ) . ', true ), ' . var_export( $block, true ) . ", 'sgs-x' )" );
	}

	/**
	 * @return array<string, array{type: string, row: string, column: string, suffix: string}>
	 */
	private function table_attributes(): array {
		return json_decode( $this->run_php( 'json_encode( \\SGS\\Blocks\\sgs_commerce_look_table_attributes() )' ), true );
	}

	/**
	 * The attribute names written by hand in attributes.js (the table's generated file is not that file).
	 *
	 * @return string[]
	 */
	private function hand_written(): array {
		$src = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' );
		preg_match_all( '/^\s*(sgs[A-Za-z0-9]*)\s*:\s*\{/m', $src, $m );
		return $m[1];
	}

	public function test_the_table_repeats_no_hand_written_attribute(): void {
		$names = array_keys( $this->table_attributes() );
		$this->assertGreaterThan( 150, count( $names ), 'the table defines its settings' );
		$this->assertSame( array(), array_values( array_intersect( $names, $this->hand_written() ) ), 'a table setting repeats a hand-written attribute' );
		$this->assertSame( count( $names ), count( array_unique( $names ) ) );
	}

	public function test_every_table_attribute_is_registered_on_the_server(): void {
		$registered = require $this->root() . 'includes/extension-attributes.generated.php';
		foreach ( $this->table_attributes() as $name => $def ) {
			$this->assertArrayHasKey( $name, $registered, "$name is not in extension-attributes.generated.php (run scripts/generate-extension-attributes.js)" );
			$this->assertSame( $def['type'], $registered[ $name ]['type'], "$name has the wrong type" );
		}
	}

	public function test_a_block_with_no_table_setting_prints_nothing(): void {
		$this->assertSame( '', $this->run_php( '\\SGS\\Blocks\\sgs_commerce_look_table_css( array(), \'checkout\', \'.sgs-x\' )' ) );
	}

	public function test_the_cart_does_not_print_a_checkout_only_row(): void {
		$css = $this->css(
			array(
				'sgsStepNumberFontSize' => 22,
				'sgsStepMargin'         => array( 'desktop' => array( 'bottom' => '40px' ) ),
			),
			'cart'
		);
		$this->assertStringNotContainsString( 'font-size:22px', $css, 'step number is a checkout row' );
	}

	public function test_a_margin_prints_only_the_sides_set(): void {
		$css = $this->css(
			array(
				'sgsItemMargin' => array(
					'desktop' => array( 'top' => '3px' ),
					'mobile'  => array( 'top' => '5px' ),
				),
			)
		);
		$this->assertStringContainsString( '.sgs-x .wc-block-components-order-summary-item{margin-top:3px;}', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{\.sgs-x \.wc-block-components-order-summary-item\{margin-top:5px;\}/', $css, 'the phone value' );
		$this->assertStringNotContainsString( 'margin-bottom', $css );
	}

	public function test_a_column_on_the_block_root_prints_on_the_scope(): void {
		$css = $this->css( array( 'sgsCheckoutRootPadding' => array( 'desktop' => array( 'top' => '0px' ) ) ) );
		$this->assertStringContainsString( '.sgs-x{padding-top:0px;}', $css );
	}

	public function test_stretch_and_align_print_per_device_on_a_selector_that_beats_woocommerce(): void {
		$css = $this->css(
			array(
				'sgsSummaryItemNameFlexGrow'        => array( 'desktop' => '0' ),
				'sgsSummaryItemNameAlignSelf'       => array( 'desktop' => 'flex-start' ),
				'sgsTotalsFooterItemAlignItems'     => array(
					'desktop' => 'flex-start',
					'mobile'  => 'center',
				),
				'sgsTotalsFooterItemJustifyContent' => array( 'desktop' => 'flex-end' ),
			)
		);
		// WooCommerce: `.wc-block-checkout__sidebar .wc-block-components-product-name` (2 classes) and `.wc-block-components-totals-item` (1 class).
		$this->assertStringContainsString( '.sgs-x .wc-block-components-order-summary-item .wc-block-components-product-name{flex-grow:0;}', $css );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-order-summary-item .wc-block-components-product-name{align-self:flex-start;}', $css );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-totals-footer-item{align-items:flex-start;}', $css );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-totals-footer-item{justify-content:flex-end;}', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{\.sgs-x \.wc-block-components-totals-footer-item\{align-items:center;\}/', $css, 'the phone value' );
	}

	public function test_an_alignment_value_outside_the_allowed_keywords_prints_nothing(): void {
		$css = $this->css(
			array(
				'sgsTotalsFooterItemAlignItems' => array( 'desktop' => 'center;}body{display:none' ),
				'sgsSummaryItemNameFlexGrow'    => array( 'desktop' => '7' ),
			)
		);
		$this->assertStringNotContainsString( 'display:none', $css );
		$this->assertStringNotContainsString( 'flex-grow', $css );
	}

	public function test_a_new_underline_prints_with_the_row_text_style(): void {
		$css = $this->css( array( 'sgsItemNameTextDecoration' => 'underline' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-x [^{]*product-name[^{]*\{[^}]*text-decoration:underline/', $css );
	}

	public function test_the_text_field_padding_does_not_reach_the_select_the_textarea_or_stripe(): void {
		$fixture = json_decode( (string) file_get_contents( __DIR__ . '/fixtures/commerce-look-checkout-table.json' ), true );
		foreach ( $this->rules( $this->css( $fixture['settings'] ) ) as $rule ) {
			$joined = implode( ',', $rule['sels'] );
			if ( false !== strpos( $joined, 'select__select' ) || false !== strpos( $joined, 'components-textarea' ) ) {
				$this->assertNotContains( 'padding-top:18px', $rule['decls'], 'the planned top padding is for the text input only, as the Custom CSS rule it replaces was' );
			}
		}
		$this->assertSame( 0, preg_match( '/sgsFieldPadding/', (string) json_encode( array_keys( array_filter( $fixture['settings'], static fn( $v, $k ) => 'sgsFieldPadding' === $k && isset( $v['desktop']['top'] ), ARRAY_FILTER_USE_BOTH ) ) ) ), 'the planned values leave the shared field padding to its left and right sides' );
	}

	// ----- the planned values print each replaced declaration -----

	/**
	 * Top-level rules of desktop CSS: selector list and declarations (at-rules skipped, nested blocks dropped).
	 *
	 * @param string $css CSS text.
	 * @return array<int, array{sels: string[], decls: string[]}>
	 */
	private function rules( string $css ): array {
		$rules = array();
		$len   = strlen( $css );
		$i     = 0;
		while ( $i < $len ) {
			$open = strpos( $css, '{', $i );
			if ( false === $open ) {
				break;
			}
			$prelude = trim( substr( $css, $i, $open - $i ) );
			$depth   = 1;
			$j       = $open + 1;
			$body    = '';
			while ( $j < $len && $depth > 0 ) {
				$ch = $css[ $j ];
				if ( '{' === $ch ) {
					++$depth;
				} elseif ( '}' === $ch ) {
					--$depth;
				} elseif ( 1 === $depth ) {
					$body .= $ch;
				}
				++$j;
			}
			$i = $j;
			if ( '@' === ( $prelude[0] ?? '' ) ) {
				continue;
			}
			$decls = array();
			foreach ( explode( ';', $body ) as $d ) {
				if ( false !== strpos( $d, ':' ) ) {
					$decls[] = $this->norm( $d );
				}
			}
			$rules[] = array(
				'sels'  => array_map( 'trim', $this->split_top( $prelude ) ),
				'decls' => $decls,
			);
		}
		return $rules;
	}

	/**
	 * Split on commas outside brackets.
	 *
	 * @param string $s Text.
	 * @return string[]
	 */
	private function split_top( string $s ): array {
		$out   = array();
		$depth = 0;
		$cur   = '';
		foreach ( str_split( $s ) as $ch ) {
			if ( '(' === $ch || '[' === $ch ) {
				++$depth;
			} elseif ( ')' === $ch || ']' === $ch ) {
				--$depth;
			}
			if ( ',' === $ch && 0 === $depth ) {
				$out[] = $cur;
				$cur   = '';
			} else {
				$cur .= $ch;
			}
		}
		$out[] = $cur;
		return $out;
	}

	/**
	 * A declaration in one comparable form: no spaces round the colon, zero lengths as 0, no leading zero on a fraction.
	 *
	 * @param string $decl `prop:value`.
	 */
	private function norm( string $decl ): string {
		[ $prop, $value ] = array_map( 'trim', explode( ':', $decl, 2 ) );
		$value            = strtolower( $value );
		$value            = str_replace( ', currentcolor)', ')', $value );
		$value            = (string) preg_replace( '/(?<![\d.])0(\.0+)?(px|em|rem|%)(?![a-z])/', '0', $value );
		$value            = (string) preg_replace( '/(?<![\d])0\.(\d)/', '.$1', $value );
		return strtolower( $prop ) . ':' . $value;
	}

	/**
	 * A selector's specificity as one comparable number (ids, classes and pseudo-classes, elements).
	 *
	 * @param string $sel Selector without a combinator list.
	 */
	private function specificity( string $sel ): int {
		$sel = (string) preg_replace( '/"[^"]*"/', '', $sel );
		$a   = 0;
		$b   = 0;
		$c   = 0;
		// Functional pseudo-classes: :where() counts nothing; :not / :is / :has count their argument.
		while ( preg_match( '/:(not|is|has|where)\(([^()]*)\)/', $sel, $m, PREG_OFFSET_CAPTURE ) ) {
			if ( 'where' !== $m[1][0] ) {
				$inner = $this->specificity_parts( $m[2][0] );
				$a    += $inner[0];
				$b    += $inner[1];
				$c    += $inner[2];
			}
			$sel = substr( $sel, 0, $m[0][1] ) . substr( $sel, $m[0][1] + strlen( $m[0][0] ) );
		}
		$own = $this->specificity_parts( $sel );
		return ( $a + $own[0] ) * 1000000 + ( $b + $own[1] ) * 1000 + ( $c + $own[2] );
	}

	/**
	 * @param string $sel Selector with no functional pseudo-class left.
	 * @return int[] Ids, classes, elements.
	 */
	private function specificity_parts( string $sel ): array {
		$a   = preg_match_all( '/#[\w-]+/', $sel );
		$c   = preg_match_all( '/::[\w-]+/', $sel );
		$sel = (string) preg_replace( '/::[\w-]+/', '', $sel );
		$b   = preg_match_all( '/\.[\w-]+|\[[^\]]*\]|:[\w-]+/', $sel );
		$sel = (string) preg_replace( '/\.[\w-]+|\[[^\]]*\]|:[\w-]+|#[\w-]+/', ' ', $sel );
		$c  += preg_match_all( '/(?<![\w-])[a-z][\w-]*/i', (string) preg_replace( '/[>+~*]/', ' ', $sel ) );
		return array( (int) $a, (int) $b, (int) $c );
	}

	public function test_the_planned_values_print_each_replaced_declaration(): void {
		$fixture = json_decode( (string) file_get_contents( __DIR__ . '/fixtures/commerce-look-checkout-table.json' ), true );
		$rules   = $this->rules( $this->css( $fixture['settings'] ) );
		$strip   = static function ( string $s ): string {
			if ( '.sgs-x' === $s ) {
				return '&';
			}
			return 0 === strpos( $s, '.sgs-x ' ) ? substr( $s, 7 ) : $s;
		};
		$missing = array();
		foreach ( $fixture['expect'] as $e ) {
			$want    = $this->norm( $e['decl'] );
			$targets = $e['via'] ?? array( $e['replaces'] );
			$found   = false;
			foreach ( $rules as $rule ) {
				if ( ! in_array( $want, $rule['decls'], true ) ) {
					continue;
				}
				foreach ( $rule['sels'] as $s ) {
					if ( in_array( $strip( $s ), $targets, true ) ) {
						$found = true;
						break 2;
					}
				}
			}
			if ( isset( $e['via'] ) ) {
				foreach ( $e['via'] as $v ) {
					$this->assertGreaterThanOrEqual( $this->specificity( $e['replaces'] ), $this->specificity( $v ), 'the setting prints below the Custom CSS selector: ' . $e['replaces'] );
				}
			}
			if ( ! $found ) {
				$missing[] = 'line ' . $e['line'] . ' ' . $e['replaces'] . ' { ' . $e['decl'] . ' }';
			}
		}
		$this->assertSame( array(), $missing, count( $missing ) . ' replaced declarations are not printed' );
	}
}
