<?php
/**
 * The cart trigger's radius, size and padding are one setting each for the icon button and the text pill, and the sweep moves the old
 * two-setting content across with the same result. The backgrounds stay two settings (iconBg* and pillBgColour*), each painted only
 * in the devices that show its own style, so a block that shows the pill on desktop and the icon button on tablet keeps both fills.
 *
 * Renders the real src/blocks/cart/render.php through the QA harness (an opt-in WooCommerce presence stub); the sweep's rewrite is
 * loaded from scripts/lib/cart-trigger-sweep.php, which needs no WordPress.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartTriggerSharedSettingsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/scripts/lib/cart-trigger-sweep.php';

final class CartTriggerSharedSettingsTest extends TestCase {

	/**
	 * The scoped CSS a cart prints for these attributes, with the block's uid class replaced by UID.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 */
	private function css( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsct' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/cart --attrs-file ' . escapeshellarg( $file )
				. ' --context-file ' . escapeshellarg( $file ) . ' --global-settings-file ' . escapeshellarg( $file ) . ' --stub-woocommerce 2>&1'
			);
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = json_decode( false === $start ? $out : substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed' );
		return (string) preg_replace( '/sgs-cart-[0-9a-f]{8}/', 'UID', (string) $decoded['css'] );
	}

	private const TRIGGER = '.UID.wp-block-sgs-cart .sgs-cart__trigger';

	public function test_an_icon_button_prints_the_shared_radius_size_padding_and_its_own_fill(): void {
		$css = $this->css(
			array(
				'triggerBorderRadius' => '999px',
				'triggerSize'         => array( 'desktop' => array( 'width' => '48px', 'height' => '40px' ) ),
				'triggerPadding'      => array( 'desktop' => array( 'top' => '1px', 'right' => '2px', 'bottom' => '3px', 'left' => '4px' ) ),
				'iconBg'              => '#112233',
			)
		);
		$this->assertStringContainsString( self::TRIGGER . '{border-radius:999px;}', $css );
		$this->assertStringContainsString( self::TRIGGER . '{min-width:48px;min-height:40px;}', $css );
		$this->assertStringContainsString( 'padding-top:1px;padding-right:2px;padding-bottom:3px;padding-left:4px', $css );
		$this->assertStringContainsString( self::TRIGGER . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;', $css );
		$this->assertStringContainsString( self::TRIGGER . '{isolation:isolate;}', $css );
	}

	public function test_a_pill_takes_the_height_only(): void {
		$css = $this->css(
			array(
				'triggerStyle' => 'pill',
				'triggerSize'  => array( 'desktop' => array( 'width' => '200px', 'height' => '48px' ) ),
			)
		);
		$this->assertStringContainsString( self::TRIGGER . '{min-height:48px;}', $css );
		$this->assertStringNotContainsString( 'min-width', $css );
	}

	public function test_a_mixed_block_gives_each_device_the_size_its_style_reads(): void {
		$css = $this->css(
			array(
				'triggerStyle'       => 'pill',
				'triggerStyleTablet' => 'icon',
				'triggerSize'        => array(
					'desktop' => array( 'height' => '48px' ),
					'tablet'  => array( 'width' => '48px', 'height' => '48px' ),
				),
			)
		);
		// The desktop pill: height only. The tablet icon button and the mobile device inheriting it: both.
		$this->assertMatchesRegularExpression( '/@media \(min-width:1024px\)\{' . preg_quote( self::TRIGGER, '/' ) . '\{min-height:48px;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media \(min-width:768px\) and \(max-width:1023\.98px\)\{' . preg_quote( self::TRIGGER, '/' ) . '\{min-width:48px;min-height:48px;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media \(max-width:767\.98px\)\{' . preg_quote( self::TRIGGER, '/' ) . '\{min-width:48px;min-height:48px;\}\}/', $css );
	}

	public function test_a_saved_size_prints_as_saved_with_no_floor(): void {
		$css = $this->css( array( 'triggerSize' => array( 'desktop' => array( 'width' => '10px', 'height' => '16px' ) ) ) );
		$this->assertStringContainsString( self::TRIGGER . '{min-width:10px;min-height:16px;}', $css );
	}

	/** The css a pill prints for a saved pill height, before the sweep (the old setting) and after it (the swept setting). */
	private function pill_height_css_after_sweep( $saved_height ): string {
		$old   = array( 'triggerStyle' => 'pill', 'pillMinHeight' => array( 'desktop' => $saved_height ) );
		$swept = sgs_cart_trigger_sweep_attrs( $old )['attrs'];
		$this->assertArrayNotHasKey( 'pillMinHeight', $swept );
		return $this->css( $swept );
	}

	public function test_a_swept_pill_height_below_24px_renders_as_it_did(): void {
		// The old block printed the saved height as it was: no floor on a pill.
		$this->assertStringContainsString( self::TRIGGER . '{min-height:20px;}', $this->pill_height_css_after_sweep( '20px' ) );
		$this->assertStringContainsString( self::TRIGGER . '{min-height:20px;}', $this->pill_height_css_after_sweep( 20 ) );
	}

	public function test_a_swept_pill_height_of_zero_renders_as_it_did(): void {
		// The old block printed `min-height:0px` for 0, "0" and "0px".
		foreach ( array( 0, '0', '0px' ) as $zero ) {
			$this->assertStringContainsString( self::TRIGGER . '{min-height:0px;}', $this->pill_height_css_after_sweep( $zero ), 'saved ' . var_export( $zero, true ) );
		}
	}

	public function test_a_swept_icon_size_keeps_the_old_24px_floor(): void {
		$swept = sgs_cart_trigger_sweep_attrs( array( 'iconTriggerSize' => array( 'desktop' => 20 ) ) )['attrs'];
		$this->assertSame( array( 'desktop' => array( 'width' => '24px', 'height' => '24px' ) ), $swept['triggerSize'] );
		$this->assertStringContainsString( self::TRIGGER . '{min-width:24px;min-height:24px;}', $this->css( $swept ) );
	}

	public function test_a_flat_scalar_size_is_dropped_because_the_old_block_ignored_it(): void {
		$swept = sgs_cart_trigger_sweep_attrs(
			array(
				'triggerStyle'    => 'pill',
				'pillMinHeight'   => '48px',
				'iconTriggerSize' => 48,
			)
		)['attrs'];
		$this->assertArrayNotHasKey( 'triggerSize', $swept );
		$this->assertArrayNotHasKey( 'pillMinHeight', $swept );
		$this->assertArrayNotHasKey( 'iconTriggerSize', $swept );
		$this->assertStringNotContainsString( 'min-height', $this->css( $swept ) );
		$tablet_only = sgs_cart_trigger_sweep_attrs( array( 'pillMinHeight' => 40, 'iconTriggerSize' => array( 'tablet' => 30 ) ) )['attrs'];
		$this->assertSame( array( 'tablet' => array( 'width' => '30px', 'height' => '30px' ) ), $tablet_only['triggerSize'] ?? null );
	}

	public function test_apply_holds_back_a_post_with_a_value_that_cannot_be_kept_unless_accepted(): void {
		$this->assertTrue( sgs_cart_trigger_sweep_blocked( array( 'corner radius: the icon style carried "50%"' ), false ) );
		$this->assertFalse( sgs_cart_trigger_sweep_blocked( array( 'corner radius: the icon style carried "50%"' ), true ) );
		$this->assertFalse( sgs_cart_trigger_sweep_blocked( array(), false ) );
		// The content rewrite hands the script the conflict lines the check reads.
		$content = '<!-- wp:sgs/cart ' . json_encode( array( 'pillBorderRadius' => '999px', 'iconTriggerRadius' => '50%', 'triggerStyle' => 'pill', 'triggerStyleTablet' => 'icon' ) ) . ' /-->';
		$result  = sgs_cart_trigger_sweep_content( $content, static fn( array $a ): string => json_encode( $a ) );
		$this->assertCount( 1, $result['conflicts'] );
		$this->assertTrue( sgs_cart_trigger_sweep_blocked( $result['conflicts'], false ) );
	}

	public function test_the_old_settings_print_nothing(): void {
		$css = $this->css(
			array(
				'pillPadding'       => array( 'desktop' => array( 'top' => '9px', 'right' => '9px', 'bottom' => '9px', 'left' => '9px' ) ),
				'pillMinHeight'     => array( 'desktop' => '77px' ),
				'iconTriggerSize'   => array( 'desktop' => 66 ),
				'pillBorderRadius'  => '11px',
				'iconTriggerRadius' => '22px',
			)
		);
		$this->assertStringNotContainsString( '77px', $css );
		$this->assertStringNotContainsString( '66px', $css );
		$this->assertStringNotContainsString( '11px', $css );
		$this->assertStringNotContainsString( '22px', $css );
		$this->assertStringNotContainsString( 'padding-top:9px', $css );
	}

	/** Mama's hand-built header: a pill on desktop with its own fill and hover, an icon button on tablet with only a hover fill. */
	private function two_fill_attrs(): array {
		return array(
			'triggerStyle'       => 'pill',
			'triggerStyleTablet' => 'icon',
			'pillBgColour'       => '#ffeecc',
			'pillBgColourHover'  => '#ffee00',
			'iconBgHover'        => '#ffaabb',
		);
	}

	public function test_a_mixed_block_paints_each_fill_only_in_its_own_style(): void {
		$css = $this->css( $this->two_fill_attrs() );
		$this->assertMatchesRegularExpression( '/@media \(min-width:1024px\)\{[^@]*#ffeecc[^@]*#ffee00[^@]*\}(?=@media|$)/', $css );
		$this->assertMatchesRegularExpression( '/@media \(max-width:1023\.98px\)\{[^@]*#ffaabb[^@]*\}$/', $css );
		// The desktop pill never takes the icon button's hover fill, and the tablet icon button never takes the pill's fill or hover.
		$desktop = (string) preg_replace( '/@media \(max-width:1023\.98px\)\{.*$/s', '', $css );
		$tablet  = (string) preg_replace( '/^.*@media \(max-width:1023\.98px\)\{/s', '', $css );
		$this->assertStringNotContainsString( '#ffaabb', $desktop );
		$this->assertStringNotContainsString( '#ffeecc', $tablet );
		$this->assertStringNotContainsString( '#ffee00', $tablet );
	}

	public function test_a_block_showing_one_style_paints_only_that_styles_fill(): void {
		$pill = $this->css( array( 'triggerStyle' => 'pill', 'pillBgColour' => '#ffeecc', 'iconBg' => '#ffaabb', 'iconBgHover' => '#aa00ff' ) );
		$this->assertStringContainsString( '#ffeecc', $pill );
		$this->assertStringNotContainsString( '#ffaabb', $pill );
		$this->assertStringNotContainsString( '#aa00ff', $pill );
		$icon = $this->css( array( 'pillBgColour' => '#ffeecc', 'pillBgColourHover' => '#ffee00', 'iconBg' => '#ffaabb' ) );
		$this->assertStringContainsString( '#ffaabb', $icon );
		$this->assertStringNotContainsString( '#ffeecc', $icon );
		$this->assertStringNotContainsString( '#ffee00', $icon );
	}

	/** The saved header of a pill on desktop and an icon button on tablet, as the hand-built Mama's header carries it. */
	private function mixed_old_attrs(): array {
		return array(
			'triggerStyle'       => 'pill',
			'triggerStyleTablet' => 'icon',
			'pillPadding'        => array( 'desktop' => array( 'top' => '0px', 'right' => '18px', 'bottom' => '0px', 'left' => '14px' ) ),
			'pillMinHeight'      => array( 'desktop' => '48px' ),
			'iconTriggerSize'    => array( 'tablet' => 48 ),
			'pillBorderRadius'   => '999px',
			'iconTriggerRadius'  => '999px',
		) + $this->two_fill_attrs();
	}

	public function test_the_sweep_merges_the_mixed_header_per_device(): void {
		$result = sgs_cart_trigger_sweep_attrs( $this->mixed_old_attrs() );
		$new    = $result['attrs'];
		$this->assertSame(
			array(
				'desktop' => array( 'height' => '48px' ),
				'tablet'  => array( 'width' => '48px', 'height' => '48px' ),
			),
			$new['triggerSize']
		);
		// The padding stays on the desktop pill and is zeroed on the tablet icon button, which would otherwise inherit it.
		$this->assertSame( '18px', $new['triggerPadding']['desktop']['right'] );
		$this->assertSame( '0px', $new['triggerPadding']['tablet']['right'] );
		$this->assertSame( '999px', $new['triggerBorderRadius'] );
		// The two styles' fills are left exactly as saved, and the sweep reports nothing about them.
		$this->assertSame( '#ffeecc', $new['pillBgColour'] );
		$this->assertSame( '#ffee00', $new['pillBgColourHover'] );
		$this->assertSame( '#ffaabb', $new['iconBgHover'] );
		$this->assertArrayNotHasKey( 'triggerBgColour', $new );
		$this->assertSame( array(), $result['conflicts'] );
		$this->assertSame( array(), array_intersect_key( $new, array_flip( sgs_cart_trigger_sweep_old_keys() ) ) );
	}

	public function test_the_sweep_reports_a_radius_the_two_styles_carried_differently(): void {
		$old                      = $this->mixed_old_attrs();
		$old['iconTriggerRadius'] = '50%';
		$result                   = sgs_cart_trigger_sweep_attrs( $old );
		$this->assertSame( '999px', $result['attrs']['triggerBorderRadius'] );
		$this->assertCount( 1, $result['conflicts'] ); // The icon style carried a different radius.
	}

	public function test_the_sweep_is_idempotent_and_leaves_a_block_without_old_settings_alone(): void {
		$once  = sgs_cart_trigger_sweep_attrs( $this->mixed_old_attrs() )['attrs'];
		$twice = sgs_cart_trigger_sweep_attrs( $once );
		$this->assertSame( $once, $twice['attrs'] );
		$untouched = array( 'triggerStyle' => 'icon', 'iconSize' => array( 'desktop' => 22 ) );
		$this->assertSame( $untouched, sgs_cart_trigger_sweep_attrs( $untouched )['attrs'] );
	}

	/** The rewrite changes what the old data would print for a device only where the new cascade needs an explicit value. */
	public function test_the_swept_header_prints_what_the_old_one_printed(): void {
		$old       = $this->mixed_old_attrs();
		$new       = sgs_cart_trigger_sweep_attrs( $old )['attrs'];
		$new_css   = $this->css( $new );
		$this->assertMatchesRegularExpression( '/@media \(min-width:1024px\)\{' . preg_quote( self::TRIGGER, '/' ) . '\{min-height:48px;\}\}/', $new_css );
		$this->assertMatchesRegularExpression( '/@media \(min-width:768px\) and \(max-width:1023\.98px\)\{' . preg_quote( self::TRIGGER, '/' ) . '\{min-width:48px;min-height:48px;\}\}/', $new_css );
		$this->assertStringContainsString( 'padding-right:18px', $new_css );
		$this->assertMatchesRegularExpression( '/@media\s*\(max-width:1023\.98px\)\{[^}]*' . preg_quote( self::TRIGGER, '/' ) . '\{padding-top:0px;padding-right:0px/', str_replace( '@media(', '@media (', $new_css ) );
	}

	public function test_the_content_rewrite_changes_only_the_cart_delimiter(): void {
		$content = "<!-- wp:paragraph -->\n<p>pillPadding stays</p>\n<!-- /wp:paragraph -->\n<!-- wp:sgs/cart " . json_encode( array( 'pillMinHeight' => array( 'desktop' => '40px' ), 'triggerStyle' => 'pill' ) ) . " /-->\n";
		$result  = sgs_cart_trigger_sweep_content( $content, static fn( array $a ): string => json_encode( $a ) );
		$this->assertSame( 1, $result['changed'] );
		$this->assertSame( array( 'pillMinHeight' => 1 ), $result['keys'] );
		$this->assertStringContainsString( '<p>pillPadding stays</p>', $result['content'] );
		$this->assertStringContainsString( '"triggerSize":{"desktop":{"height":"40px"}}', $result['content'] );
		$this->assertStringNotContainsString( '"pillMinHeight"', $result['content'] );
		$again = sgs_cart_trigger_sweep_content( $result['content'], static fn( array $a ): string => json_encode( $a ) );
		$this->assertSame( 0, $again['changed'] );
	}

	/** @return array<string, array{0: mixed, 1: bool, 2: string}> A saved pill height, whether the sweep must list it, and what the new control prints ('' for nothing, 'any' for a function value). */
	public static function pill_heights(): array {
		return array(
			'px'              => array( '20px', false, '20px' ),
			'a number'        => array( 48, false, '48px' ),
			'the px cap'      => array( '640px', false, '640px' ),
			'over the px cap' => array( '700px', true, '640px' ),
			'rem'             => array( '3rem', false, '3rem' ),
			'over the rem cap' => array( '41rem', true, '40rem' ),
			'percent'         => array( '50%', false, '50%' ),
			'over 100 percent' => array( '120%', true, '100%' ),
			'vmin'            => array( '20vmin', true, '' ),
			'ch'              => array( '5ch', true, '' ),
			'svh'             => array( '10svh', true, '' ),
			'pt'              => array( '12pt', true, '' ),
			'clamp'           => array( 'clamp(20px,5vw,40px)', false, 'any' ),
			'calc'            => array( 'calc(100% - 10px)', false, 'any' ),
			'var'             => array( 'var(--x)', false, 'any' ),
		);
	}

	/**
	 * The sweep lists a pill height the new size control prints differently, and the list agrees with the real renderer.
	 *
	 * @dataProvider pill_heights
	 * @param mixed  $saved    The saved pill height.
	 * @param bool   $listed   Whether the sweep must list it as a conflict.
	 * @param string $prints   What the renderer prints after `min-height:`.
	 */
	public function test_a_pill_height_the_new_control_prints_differently_is_listed( $saved, bool $listed, string $prints ): void {
		$result = sgs_cart_trigger_sweep_attrs( array( 'triggerStyle' => 'pill', 'pillMinHeight' => array( 'desktop' => $saved ) ) );
		$this->assertSame( $listed, array() !== $result['conflicts'], var_export( $saved, true ) . ' conflicts: ' . implode( ' | ', $result['conflicts'] ) );
		$css = $this->css( $result['attrs'] );
		if ( 'any' === $prints ) {
			$this->assertStringContainsString( 'min-height:', $css );
		} elseif ( '' === $prints ) {
			$this->assertStringNotContainsString( 'min-height', $css );
		} else {
			$this->assertStringContainsString( self::TRIGGER . '{min-height:' . $prints . ';}', $css );
		}
	}

	public function test_an_icon_size_over_the_cap_is_listed_and_apply_holds_the_post_back(): void {
		$result = sgs_cart_trigger_sweep_attrs( array( 'iconTriggerSize' => array( 'desktop' => 700 ) ) );
		$this->assertCount( 2, $result['conflicts'] ); // Width and height.
		$this->assertStringContainsString( self::TRIGGER . '{min-width:640px;min-height:640px;}', $this->css( $result['attrs'] ) );
		$this->assertTrue( sgs_cart_trigger_sweep_blocked( $result['conflicts'], false ) );
		$this->assertFalse( sgs_cart_trigger_sweep_blocked( $result['conflicts'], true ) );
	}

	/** A `$wpdb` stand-in: rows per table, or a failure. */
	private function wpdb( array $by_table, string $error = '' ): object {
		return new class( $by_table, $error ) {
			public $posts    = 'wp_posts';
			public $options  = 'wp_options';
			public $postmeta = 'wp_postmeta';
			public $last_error = '';
			public array $queries = array();
			private array $by_table;
			private string $error;
			public function __construct( array $by_table, string $error ) {
				$this->by_table = $by_table;
				$this->error    = $error;
			}
			public function get_results( string $query ) {
				$this->queries[] = $query;
				if ( '' !== $this->error ) {
					$this->last_error = $this->error;
					return null;
				}
				foreach ( $this->by_table as $table => $rows ) {
					if ( false !== strpos( $query, $table ) ) {
						return $rows;
					}
				}
				return array();
			}
		};
	}

	public function test_a_database_error_is_never_an_empty_site(): void {
		$this->assertNull( sgs_cart_trigger_sweep_post_rows( $this->wpdb( array(), 'Table is marked as crashed' ) ) );
		$this->assertNull( sgs_cart_trigger_sweep_outside_rows( $this->wpdb( array(), 'Table is marked as crashed' ) ) );
		$this->assertSame( array(), sgs_cart_trigger_sweep_post_rows( $this->wpdb( array() ) ) );
	}

	public function test_an_old_key_in_an_option_or_post_meta_row_is_found(): void {
		$old   = '<!-- wp:sgs/cart {"pillPadding":{"desktop":{"top":"1px"}}} /-->';
		$new   = '<!-- wp:sgs/cart {"triggerPadding":{"desktop":{"top":"1px"}}} /-->';
		$hits  = sgs_cart_trigger_sweep_outside_rows(
			$this->wpdb(
				array(
					'wp_options'  => array( (object) array( 'label' => 'option a', 'content' => $old ), (object) array( 'label' => 'option b', 'content' => $new ) ),
					'wp_postmeta' => array( (object) array( 'label' => 'post 9 meta _x', 'content' => $old ) ),
				)
			)
		);
		$this->assertSame( array( 'option a', 'post 9 meta _x' ), array_column( $hits, 'label' ) );
		$this->assertSame( array( 'pillPadding' ), $hits[0]['keys'] );
	}

	private const OLD_MARKUP = '<!-- wp:sgs/cart {"pillPadding":{"desktop":{"top":"1px"}},"triggerStyle":"pill"} /-->';
	private const NEW_MARKUP = '<!-- wp:sgs/cart {"triggerPadding":{"desktop":{"top":"1px"}}} /-->';

	/** @return array<string, array{0: callable(string): string, 1: bool}> How a stored value can hold a basket (a function from the markup to the stored text) and whether the markup holds an old key. */
	public static function stored_forms(): array {
		$plain      = static fn( string $m ): string => $m;
		$json_str   = static fn( string $m ): string => (string) json_encode( $m );
		$json_obj   = static fn( string $m ): string => (string) json_encode( array( 'content' => $m, 'n' => 3 ) );
		$serialised = static fn( string $m ): string => serialize( array( 'a' => 1, 'b' => array( 'markup' => $m ) ) );
		$ser_json   = static fn( string $m ): string => serialize( array( 'blob' => json_encode( array( 'markup' => $m ) ) ) );
		return array(
			'plain'                          => array( $plain, true ),
			'json string (wp:sgs\\/cart)'    => array( $json_str, true ),
			'json object'                    => array( $json_obj, true ),
			'serialised array'               => array( $serialised, true ),
			'json inside a serialised array' => array( $ser_json, true ),
			'plain, no old key'              => array( $plain, false ),
			'json string, no old key'        => array( $json_str, false ),
			'serialised array, no old key'   => array( $serialised, false ),
			'json inside serialised, no old key' => array( $ser_json, false ),
		);
	}

	/**
	 * @dataProvider stored_forms
	 * @param callable(string): string $store The stored form.
	 * @param bool                     $old   Whether the markup holds an old key.
	 */
	public function test_a_basket_in_an_option_or_post_meta_row_is_found_in_every_stored_form( callable $store, bool $old ): void {
		$stored = $store( $old ? self::OLD_MARKUP : self::NEW_MARKUP );
		$db     = $this->wpdb(
			array(
				'wp_options'  => array( (object) array( 'label' => 'option a', 'content' => $stored ) ),
				'wp_postmeta' => array( (object) array( 'label' => 'post 9 meta _x', 'content' => $stored ) ),
			)
		);
		$hits = sgs_cart_trigger_sweep_outside_rows( $db );
		$this->assertSame( $old ? array( 'option a', 'post 9 meta _x' ) : array(), array_column( $hits, 'label' ) );
		if ( $old ) {
			$this->assertSame( array( 'pillPadding' ), $hits[0]['keys'] );
			// The SQL pre-filter must also match the stored text, or the row is never read: LIKE `%a%b%` as a regular expression.
			$pattern = '';
			foreach ( $db->queries as $query ) {
				$this->assertSame( 1, preg_match( "/LIKE '([^']+)'/", $query, $m ) );
				$pattern = '/^' . str_replace( '%', '.*', preg_quote( $m[1], '/' ) ) . '$/s';
				$this->assertSame( 1, preg_match( $pattern, $stored ), 'the query pattern ' . $m[1] . ' misses ' . $stored );
			}
		}
	}

	public function test_an_unrelated_or_unreadable_stored_value_is_not_a_hit_and_does_not_stop_the_scan(): void {
		$rows = array(
			(object) array( 'label' => 'option text', 'content' => 'the sgs cart page, wp:sgs and cart apart' ),
			(object) array( 'label' => 'option broken', 'content' => 'a:2:{s:1:"a";s:5:"short";' ),
			(object) array( 'label' => 'option json', 'content' => '{"broken":' ),
			(object) array( 'label' => 'option object', 'content' => 'O:8:"stdClass":1:{s:1:"m";s:' . strlen( self::OLD_MARKUP ) . ':"' . self::OLD_MARKUP . '";}' ),
		);
		$hits = sgs_cart_trigger_sweep_outside_rows( $this->wpdb( array( 'wp_options' => $rows ) ) );
		$this->assertSame( array( 'option object' ), array_column( $hits, 'label' ) );
	}

	public function test_a_value_that_mentions_a_basket_but_cannot_be_decoded_is_refused_not_passed(): void {
		$cut  = substr( (string) json_encode( array( 'markup' => self::OLD_MARKUP ) ), 0, -6 ); // Cut off mid-value: not valid JSON.
		$rows = array(
			(object) array( 'label' => 'option cut json', 'content' => $cut ),
			(object) array( 'label' => 'option cut serialised', 'content' => substr( serialize( array( 'm' => self::OLD_MARKUP ) ), 0, -9 ) ),
			(object) array( 'label' => 'option cut, no basket', 'content' => substr( (string) json_encode( array( 'markup' => 'hello' ) ), 0, -3 ) ),
		);
		$hits = sgs_cart_trigger_sweep_outside_rows( $this->wpdb( array( 'wp_options' => $rows ) ) );
		$this->assertSame( array( 'option cut json', 'option cut serialised' ), array_column( $hits, 'label' ) );
		$this->assertSame( array( 'unreadable' ), $hits[0]['keys'] );
	}

	public function test_the_multisite_refusal_says_what_to_do(): void {
		$this->assertStringContainsString( 'multisite', sgs_cart_trigger_sweep_multisite_message() );
		$this->assertStringContainsString( '--url', sgs_cart_trigger_sweep_multisite_message() );
	}
}
