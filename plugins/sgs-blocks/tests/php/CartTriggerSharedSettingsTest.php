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

	public function test_a_size_below_24px_is_held_at_24px(): void {
		$css = $this->css( array( 'triggerSize' => array( 'desktop' => array( 'width' => '10px', 'height' => '16px' ) ) ) );
		$this->assertStringContainsString( self::TRIGGER . '{min-width:24px;min-height:24px;}', $css );
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
}
