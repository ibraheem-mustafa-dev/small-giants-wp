<?php
/**
 * A block's Custom CSS always out-ranks every setting the framework prints for the same part.
 *
 * Custom CSS is scoped with the scope class repeated SGS_CUSTOM_CSS_SCOPE_REPEAT times (includes/custom-css.php); a settings
 * emitter may repeat the scope class at most SGS_SETTINGS_SCOPE_REPEAT_MAX times, one fewer, so for the same part selector
 * the Custom CSS selector is always the more specific. This test holds the two numbers apart, finds every emitter that
 * repeats a scope class (PHP and JS) and fails when one reaches Custom CSS's count.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit tests/php/CustomCssOutranksSettingsTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CustomCssOutranksSettingsTest extends TestCase {

	private function root(): string {
		return dirname( __DIR__, 2 ) . '/';
	}

	private function constant( string $file, string $name ): int {
		$src = (string) file_get_contents( $this->root() . $file );
		$this->assertSame( 1, preg_match( '/' . preg_quote( $name, '/' ) . '\s*(?:=|,)\s*(\d+)/', $src, $m ), "$name is not defined in $file" );
		return (int) $m[1];
	}

	public function test_custom_css_repeats_the_scope_more_often_than_any_settings_emitter_may(): void {
		$custom = $this->constant( 'includes/custom-css.php', 'SGS_CUSTOM_CSS_SCOPE_REPEAT' );
		$max    = $this->constant( 'includes/custom-css.php', 'SGS_SETTINGS_SCOPE_REPEAT_MAX' );
		$this->assertGreaterThan( $max, $custom );
		$this->assertSame( $custom, $this->constant( 'src/utils/custom-css-scope.js', 'CUSTOM_CSS_SCOPE_REPEAT' ), 'the editor canvas repeats the scope as often as the page' );
		$this->assertSame( $max, $this->constant( 'src/utils/custom-css-scope.js', 'SETTINGS_SCOPE_REPEAT_MAX' ) );
	}

	public function test_no_table_row_repeats_the_scope_past_the_settings_maximum(): void {
		$max  = $this->constant( 'includes/custom-css.php', 'SGS_SETTINGS_SCOPE_REPEAT_MAX' );
		$data = json_decode( (string) file_get_contents( $this->root() . 'includes/woocommerce/commerce-look/selectors.json' ), true );
		foreach ( $data['rows'] as $id => $row ) {
			$this->assertLessThanOrEqual( $max, (int) ( $row['root_repeat'] ?? 1 ), "row $id repeats the scope as often as Custom CSS" );
		}
	}

	public function test_no_emitter_repeats_a_scope_class_as_often_as_custom_css(): void {
		$max      = $this->constant( 'includes/custom-css.php', 'SGS_SETTINGS_SCOPE_REPEAT_MAX' );
		$found    = array();
		$iterator = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $this->root(), FilesystemIterator::SKIP_DOTS ) );
		foreach ( $iterator as $file ) {
			$path = str_replace( '\\', '/', (string) $file );
			$skip = ! preg_match( '#/(includes|src)/.*\.(php|js)$#', $path )
				|| preg_match( '#/(node_modules|build|vendor|tests)/|\.generated\.#', $path )
				|| str_ends_with( $path, '/includes/custom-css.php' )
				|| str_ends_with( $path, '/src/blocks/extensions/custom-css.js' );
			if ( $skip ) {
				continue;
			}
			$src = (string) file_get_contents( $path );
			// `'.' . $uid . '.' . $uid ...`
			if ( preg_match_all( '/\'\.\' \. (\$\w+)((?: \. \'\.\' \. \1)+)/', $src, $all, PREG_SET_ORDER ) ) {
				foreach ( $all as $m ) {
					$found[ $path . ' ' . $m[0] ] = 1 + substr_count( $m[2], "'.'" );
				}
			}
			// `$root_sel . $root_sel ...`
			if ( preg_match_all( '/(\$\w+)((?: \. \1\b(?! \. \'\.\'))+)/', $src, $all, PREG_SET_ORDER ) ) {
				foreach ( $all as $m ) {
					if ( preg_match( '/(root|scope|uid|sel)/i', $m[1] ) ) {
						$found[ $path . ' ' . $m[0] ] = 1 + substr_count( $m[2], $m[1] );
					}
				}
			}
			// `str_repeat( $root, n )` and JS `.repeat(`.
			if ( preg_match_all( '/str_repeat\(\s*\$(?:root|scope|uid)\w*/i', $src, $all ) ) {
				foreach ( $all[0] as $hit ) {
					$found[ $path . ' ' . $hit ] = $max; // Bounded by the table test above.
				}
			}
		}
		$this->assertNotEmpty( $found, 'the survey finds the known emitters' );
		foreach ( $found as $where => $count ) {
			$this->assertLessThanOrEqual( $max, $count, "an emitter repeats the scope $count times, as often as Custom CSS: $where" );
		}
	}

	/**
	 * Run PHP after the writer and Custom CSS filter are loaded.
	 */
	private function run_php( string $expression ): string {
		$root   = $this->root();
		$script = tempnam( sys_get_temp_dir(), 'sgscc' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\n"
			. "if ( ! function_exists( 'wp_get_global_settings' ) ) { function wp_get_global_settings() { return array( array( array( 'slug' => 'heading' ) ) ); } }\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. "require ABSPATH . 'includes/woocommerce/commerce-look/writer.php';\nrequire ABSPATH . 'includes/custom-css.php';\necho " . $expression . ";\n"
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' -d display_errors=0 ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	/**
	 * Classes, attribute selectors and pseudo-classes in one compound selector chain.
	 */
	private function classes( string $sel ): int {
		return (int) preg_match_all( '/\.[\w-]+|\[[^\]]*\]|(?<!:):[\w-]+/', $sel );
	}

	public function test_custom_css_beats_a_five_class_table_setting_for_the_same_part(): void {
		$setting = $this->run_php( '\SGS\Blocks\sgs_commerce_look_css( array( \'sgsTotalsItemPadding\' => array( \'desktop\' => array( \'top\' => \'0px\' ) ) ), \'checkout\', \'sgs-commerce-look-x\' )' );
		$custom  = $this->run_php( '\SGS\Blocks\render_custom_css( \'<div class="a"></div>\', array( \'blockName\' => \'woocommerce/checkout\', \'attrs\' => array( \'sgsCustomCss\' => \'& .wc-block-components-totals-item{padding:0}\', \'sgsCustomCssId\' => \'abcd\' ) ) )' );
		$this->assertSame( 1, preg_match( '/([^{}]+)\{padding-top:0px/', $setting, $s ), 'the setting prints: ' . $setting );
		$this->assertSame( 1, preg_match( '/<style[^>]*>([^{]+)\{padding:0\}/', $custom, $c ), 'Custom CSS prints: ' . $custom );
		$this->assertGreaterThan( $this->classes( $s[1] ), $this->classes( $c[1] ), 'Custom CSS (' . $c[1] . ') must out-rank the setting (' . $s[1] . ')' );
	}
}
