<?php
/**
 * The container and feature-grid column minimums, the separator width and thickness, the responsive logo sizes and the
 * image-controls height each store one length string per device and print it: the desktop value in the base rule, a
 * different mobile value in a media query, a keyword where the property takes one, and nothing for a hostile string.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter LengthStringSettingsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class LengthStringSettingsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const HOSTILE = '10px;}body{color:red';

	private function css( string $block, array $attrs ): string {
		return $this->render_block( $block, $attrs )['css'];
	}

	public function test_feature_grid_min_item_width_prints_per_device(): void {
		$css = $this->css( 'sgs/feature-grid', array( 'layoutMode' => 'auto-flex', 'minItemWidth' => array( 'desktop' => '15rem', 'mobile' => '100%' ) ) );
		$this->assertStringContainsString( 'minmax(15rem, 1fr)', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*minmax\(100%, 1fr\)/', $css, 'the mobile value prints in a media query' );
	}

	public function test_feature_grid_refuses_a_hostile_min_item_width(): void {
		$css = $this->css( 'sgs/feature-grid', array( 'layoutMode' => 'auto-flex', 'minItemWidth' => array( 'desktop' => self::HOSTILE ) ) );
		$this->assertStringNotContainsString( 'body{', $css );
		$this->assertStringContainsString( 'minmax(240px, 1fr)', $css, 'a refused value falls back to the 240px default' );
	}

	/**
	 * Runs PHP in a child process with the QA stubs and the helpers loaded, and returns its output.
	 *
	 * @param string $body PHP statements that echo the result.
	 * @param string $pre  PHP statements that run before the stubs load (a class the stubs would otherwise define).
	 */
	private function run_php( string $body, string $pre = '' ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsph' );
		$code   = '<?php define( "ABSPATH", "/" ); ' . $pre
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/helpers-css-safety.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/helpers-responsive.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/helpers-container.php', true ) . ';'
			. ' ' . $body;
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_container_min_column_width_resolves_per_device(): void {
		$attrs = var_export( array( 'minColumnWidth' => array( 'desktop' => '20rem', 'mobile' => '9rem' ) ), true );
		$out   = $this->run_php( '$a = ' . $attrs . '; echo sgs_container_tier_min_column_width( $a, "desktop" ), "|", sgs_container_tier_min_column_width( $a, "tablet" ), "|", sgs_container_tier_min_column_width( $a, "mobile" ), "|", sgs_intrinsic_columns_track( 3, "1rem", sgs_container_tier_min_column_width( $a, "mobile" ) );' );
		$this->assertStringStartsWith( '20rem|20rem|9rem|', $out, 'tablet inherits desktop; mobile has its own value' );
		$this->assertStringContainsString( 'max(9rem,', $out, 'the value feeds the intrinsic column track' );

		$bad = array( 'minColumnWidth' => array( 'desktop' => self::HOSTILE ) );
		$out = $this->run_php( '$a = ' . var_export( $bad, true ) . '; var_dump( sgs_container_tier_min_column_width( $a, "desktop" ) );' );
		$this->assertStringContainsString( 'NULL', $out, 'a hostile value falls back to the built-in basis' );
	}

	public function test_separator_width_and_thickness_print_per_device(): void {
		$css = $this->css( 'sgs/separator', array( 'width' => array( 'desktop' => '60%', 'mobile' => '200px' ), 'thickness' => array( 'desktop' => '2px', 'mobile' => '4px' ) ) );
		$this->assertStringContainsString( 'width:60%', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*(?<![-\w])width:200px/', $css );
		$this->assertStringContainsString( 'border-bottom-width:2px', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*border-bottom-width:4px/', $css );
	}

	public function test_separator_defaults_print_a_full_width_hairline_and_refuse_hostile_lengths(): void {
		$css = $this->css( 'sgs/separator', array( 'width' => array( 'desktop' => '100%' ), 'thickness' => array( 'desktop' => '1px' ) ) );
		$this->assertStringContainsString( 'width:100%', $css );
		$this->assertStringContainsString( 'border-bottom-width:1px', $css );
		$bad = $this->css( 'sgs/separator', array( 'width' => array( 'desktop' => self::HOSTILE ), 'thickness' => array( 'desktop' => self::HOSTILE ) ) );
		$this->assertStringNotContainsString( 'body{', $bad );
	}

	public function test_responsive_logo_sizes_print_per_device(): void {
		$css = $this->css(
			'sgs/responsive-logo',
			array(
				'logoUrl'     => 'https://example.test/logo.png',
				'maxWidth'    => array( 'desktop' => '240px', 'mobile' => '50%' ),
				'maxHeight'   => array( 'desktop' => '4rem', 'mobile' => '40px' ),
				'shrinkWidth' => array( 'desktop' => '120px', 'mobile' => '80px' ),
			)
		);
		$this->assertStringContainsString( 'max-width:240px', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*max-width:50%/', $css );
		$this->assertStringContainsString( 'max-height:4rem', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*max-height:40px/', $css );
		$this->assertMatchesRegularExpression( '/\.is-header-shrunk[^{]*\{[^}]*--logo-width:120px/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*\.is-header-shrunk[^{]*\{[^}]*--logo-width:80px/', $css );
	}

	public function test_responsive_logo_refuses_hostile_lengths(): void {
		$css = $this->css( 'sgs/responsive-logo', array( 'logoUrl' => 'https://example.test/logo.png', 'maxWidth' => array( 'desktop' => self::HOSTILE ), 'maxHeight' => array( 'desktop' => self::HOSTILE ), 'shrinkWidth' => array( 'desktop' => self::HOSTILE ) ) );
		$this->assertStringNotContainsString( 'body{', $css );
		$this->assertStringNotContainsString( 'color:red', $css );
	}

	/**
	 * Runs the image-controls render filter on an icon-block shell in a child process.
	 *
	 * @param array<string,mixed> $attrs Extension attributes.
	 */
	private function image_controls( array $attrs ): string {
		$markup = '<figure class="wp-block-sgs-icon"><img src="a.jpg"></figure>';
		$registry = 'if ( ! function_exists( "wp_rand" ) ) { function wp_rand( $a = 0, $b = 0 ) { return mt_rand( $a, $b ); } } class WP_Block_Type_Registry { public static function get_instance() { return new self(); } public function get_registered( $name ) { return (object) array( "supports" => array( "sgs" => array( "imageControls" => true ) ) ); } }';
		return $this->run_php(
			'require ' . var_export( dirname( __DIR__, 2 ) . '/includes/image-controls.php', true ) . ';'
			. ' echo \SGS\Blocks\inject_image_controls( ' . var_export( $markup, true ) . ', array( "blockName" => "sgs/icon", "attrs" => json_decode( ' . var_export( json_encode( (object) $attrs ), true ) . ', true ) ) );',
			$registry
		);
	}

	public function test_image_controls_height_prints_a_custom_property_per_device(): void {
		$out = $this->image_controls( array( 'sgsHeight' => array( 'desktop' => '320px', 'tablet' => '40vh', 'mobile' => 'auto' ) ) );
		$this->assertStringContainsString( '--sgs-height-desktop:320px', $out );
		$this->assertStringContainsString( '--sgs-height-tablet:40vh', $out );
		$this->assertStringContainsString( '--sgs-height-mobile:auto', $out );
		$this->assertStringContainsString( 'sgs-has-image-controls', $out );
	}

	public function test_image_controls_height_refuses_a_hostile_length_and_unset_adds_nothing(): void {
		$bad = $this->image_controls( array( 'sgsHeight' => array( 'desktop' => self::HOSTILE ) ) );
		$this->assertStringNotContainsString( 'body{', $bad );
		$this->assertStringNotContainsString( '--sgs-height', $bad );

		$none = $this->image_controls( array() );
		$this->assertStringNotContainsString( 'sgs-has-image-controls', $none, 'no setting leaves the markup alone' );
	}
}
