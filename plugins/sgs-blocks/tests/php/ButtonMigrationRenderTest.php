<?php
/**
 * Tests: the buttons the button migration moved onto the built-in button kit print their look through sgs_button_kit_css under the kit's
 * names: sgs/buybox's Add to Cart (`addToCart*`), sgs/product-card's CTAs (`cta*`, `cta2*`) and sgs/account's sign-in and register buttons
 * (`loginButton*`, `registerButton*`). The old names print nothing (no fallback reads them; saved content is swept by
 * scripts/sweep-builtin-button-attrs.php), and the looks the old names produced are proved equal in the browser by
 * tests/playwright/button-migration/probe.mjs.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonMigrationRenderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ButtonMigrationRenderTest extends TestCase {

	/** Run the QA harness for one block; returns its HTML (the scoped `<style>` tags are in it). */
	private static function render( string $slug, array $files ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$cmd     = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug ) . ' --motion-targets';
		$tmp     = array();
		foreach ( $files as $key => $data ) {
			$tmp[ $key ] = tempnam( sys_get_temp_dir(), 'sgsmr' );
			file_put_contents( $tmp[ $key ], json_encode( $data, JSON_THROW_ON_ERROR ) );
			$cmd .= ' --' . $key . '-file ' . escapeshellarg( $tmp[ $key ] );
		}
		try {
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			array_map( 'unlink', $tmp );
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) || ! ( $decoded['ok'] ?? false ) ) {
			throw new RuntimeException( 'render.php failed for ' . $slug . ': ' . ( $decoded['error'] ?? $out ) );
		}
		return (string) $decoded['html'];
	}

	private static function buybox( array $attrs ): string {
		$fx = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/buybox/standard.json' ), true, 512, JSON_THROW_ON_ERROR );
		return self::render( 'sgs/buybox', array( 'attrs' => $attrs + $fx['attrs'], 'product' => $fx['product'], 'manifest' => $fx['manifest'], 'context' => $fx['context'] ) );
	}

	private static function card( string $path, array $attrs ): string {
		$fx   = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/motion/render-paths.json' ), true, 512, JSON_THROW_ON_ERROR )['blocks']['product-card'];
		$p    = $fx['paths'][ $path ];
		$file = array( 'attrs' => $attrs + $p['attrs'] + $fx['base'] + array( 'cta2Text' => 'Details' ) );
		foreach ( array( 'product', 'manifest', 'post', 'attachments' ) as $key ) {
			if ( isset( $p[ $key ] ) ) {
				$file[ $key ] = $p[ $key ];
			}
		}
		return self::render( 'sgs/product-card', $file );
	}

	private static function account( array $attrs ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgsma' );
		file_put_contents( $file, json_encode( (object) $attrs ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/../playwright/support/button-migration-account-css.php' ) . ' ' . escapeshellarg( dirname( __DIR__, 2 ) ) . ' ' . escapeshellarg( '@' . $file ) . ' ' . escapeshellarg( '{}' ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$json = json_decode( substr( $out, (int) strpos( $out, '{' ) ), true );
		if ( ! is_array( $json ) ) {
			throw new RuntimeException( 'runner failed: ' . $out );
		}
		return (string) $json['css'];
	}

	public function test_add_to_cart_prints_its_look_under_the_kit_names_and_keeps_its_preset_variant_class(): void {
		$html = self::buybox(
			array(
				'addToCartStyle'                  => 'primary',
				'addToCartColourBackground'       => 'mm-yellow',
				'addToCartColourBackgroundHover'  => 'mm-cocoa',
				'addToCartColourBorder'           => 'mm-cocoa',
				'addToCartMinHeight'              => array( 'desktop' => '64px' ),
				'addToCartPadding'                => array( 'desktop' => array( 'top' => '10px', 'bottom' => '10px' ) ),
			)
		);
		$this->assertStringContainsString( '.wp-block-sgs-buybox .buybox__add-to-cart{background-color:var(--wp--preset--color--mm-yellow', $html, 'MUST FAIL: the colour prints through the kit' );
		$this->assertStringContainsString( 'border-color:var(--wp--preset--color--mm-cocoa', $html );
		$this->assertStringContainsString( 'min-height:64px', $html );
		$this->assertStringContainsString( 'padding-top:10px', $html );
		$this->assertStringContainsString( '.buybox__add-to-cart:not([disabled]):hover{background-color:var(--wp--preset--color--mm-cocoa', $html, 'a disabled button does not change on hover' );
		$this->assertStringContainsString( 'buybox__add-to-cart--primary', $html, 'the preset stays the variant class on the button' );
		$this->assertStringNotContainsString( 'sgs-btn-kit-', $html, 'and the kit prints no second copy of the preset' );
	}

	public function test_add_to_cart_with_the_old_names_prints_nothing_and_nothing_reads_them(): void {
		$html = self::buybox( array( 'addToCartBackgroundColour' => 'mm-yellow', 'addToCartBorderColour' => 'mm-cocoa', 'addToCartMinHeight' => '64px' ) );
		$this->assertStringNotContainsString( 'mm-yellow', $html, 'MUST FAIL if a fallback reads the old name (FP-14)' );
		$this->assertStringNotContainsString( 'min-height:64px', $html );
	}

	public function test_add_to_cart_shadow_lift_follows_its_own_switch_and_a_disabled_button_does_not_lift(): void {
		$rest = array( 'addToCartShadow' => '0 4px 12px 0', 'addToCartShadowColour' => 'mm-cocoa' );
		$on   = self::buybox( $rest );
		$off  = self::buybox( $rest + array( 'addToCartShadowLiftOnHover' => false ) );
		$this->assertStringContainsString( '.buybox__add-to-cart:not([disabled]):hover{box-shadow:', $on, 'MUST FAIL: a resting shadow lifts on hover by default' );
		$this->assertStringNotContainsString( '.buybox__add-to-cart:not([disabled]):hover{box-shadow:', $off, 'the switch off keeps the resting shadow' );
		$this->assertStringContainsString( '.wp-block-sgs-buybox .buybox__add-to-cart{box-shadow:', $off, 'the resting shadow still prints' );
	}

	public function test_nothing_set_prints_no_add_to_cart_rule(): void {
		$html = self::buybox( array() );
		$this->assertDoesNotMatchRegularExpression( '/\.wp-block-sgs-buybox \.buybox__add-to-cart[{:,]/', $html, 'an unset Add to Cart keeps the stylesheet look and prints no rule' );
	}

	public function test_the_secondary_cta_takes_the_kit_look_in_typed_and_live_markup(): void {
		$look = array( 'cta2ColourBackground' => 'mm-yellow', 'cta2BorderRadius' => array( 'desktop' => array( 'topLeft' => '4px' ) ), 'cta2MinHeight' => array( 'desktop' => '50px' ) );
		$typed = self::card( 'typed', $look );
		$this->assertStringContainsString( '.sgs-product-card__cta--secondary{background-color:var(--wp--preset--color--mm-yellow', $typed, 'MUST FAIL: typed markup' );
		$this->assertStringContainsString( 'min-height:50px', $typed );
		$live = self::card( 'live-wc-simple', $look );
		$this->assertStringContainsString( '.product-card__cta-secondary{background-color:var(--wp--preset--color--mm-yellow', $live, 'live markup' );
		$this->assertStringNotContainsString( 'cta-secondary{background-color', self::card( 'live-wc-simple', array() ), 'negative control: nothing set, no rule' );
	}

	public function test_the_primary_cta_width_choice_prints_fit_content_only_when_chosen(): void {
		$this->assertStringNotContainsString( 'width:fit-content', self::card( 'typed', array() ), 'unset keeps the CTA\'s own width' );
		$this->assertStringContainsString( 'width:fit-content', self::card( 'typed', array( 'ctaWidthType' => 'fit' ) ), 'MUST FAIL: fit is a choice that does something' );
		$this->assertStringContainsString( 'width:100%', self::card( 'typed', array( 'ctaWidthType' => 'full' ) ) );
	}

	public function test_the_primary_cta_shapes_print_per_device_and_in_pixels(): void {
		$html = self::card(
			'typed',
			array(
				'ctaFontSize'     => array( 'desktop' => 15 ),
				'ctaLineHeight'   => array( 'desktop' => '1.6' ),
				'ctaPadding'      => array( 'desktop' => array( 'top' => '16px', 'right' => '0px', 'bottom' => '16px', 'left' => '0px' ) ),
				'ctaBorderRadius' => array( 'desktop' => array( 'topLeft' => '999px', 'topRight' => '999px', 'bottomLeft' => '999px', 'bottomRight' => '999px' ) ),
			)
		);
		$this->assertStringContainsString( 'font-size:15px', $html, 'a font size object prints in pixels, never as one pixel' );
		$this->assertStringContainsString( 'line-height:1.6', $html );
		$this->assertStringContainsString( 'padding-top:16px', $html );
		$this->assertStringContainsString( 'border-top-left-radius:999px', $html );
		$this->assertStringNotContainsString( 'font-size:1px', $html );
	}

	public function test_the_register_button_has_its_own_look_beside_a_sign_in_look_that_stops_at_sign_in(): void {
		$css = self::account( array( 'loginButtonColourBackground' => 'mm-yellow', 'registerButtonColourBackground' => 'mm-cocoa' ) );
		$this->assertStringContainsString( '.woocommerce-form-login__submit{background-color:var(--wp--preset--color--mm-yellow', $css, 'MUST FAIL: the sign-in look' );
		$this->assertStringContainsString( '.woocommerce-form-register__submit{background-color:var(--wp--preset--color--mm-cocoa', $css, 'the register look prints though the scope stops at the sign-in button' );
		$this->assertStringNotContainsString( '.woocommerce-form-register__submit{background-color:var(--wp--preset--color--mm-yellow', $css, 'and the sign-in look does not reach it' );
	}

	public function test_with_the_all_forms_scope_the_register_button_shares_the_sign_in_look_and_its_own_wins(): void {
		$css = self::account( array( 'loginButtonScope' => 'all-forms', 'loginButtonColourBackground' => 'mm-yellow', 'registerButtonColourBackground' => 'mm-cocoa' ) );
		$yellow = strpos( $css, '.woocommerce-form-register__submit{background-color:var(--wp--preset--color--mm-yellow' );
		$cocoa  = strpos( $css, '.woocommerce-form-register__submit{background-color:var(--wp--preset--color--mm-cocoa' );
		$this->assertNotFalse( $yellow, 'the shared sign-in look prints on the register button' );
		$this->assertNotFalse( $cocoa, 'MUST FAIL: the register look prints too' );
		$this->assertGreaterThan( $yellow, $cocoa, 'after the shared one, so it wins a tie' );
	}

	public function test_the_width_choice_stretches_the_form_buttons_and_never_the_buttons_in_the_account_content(): void {
		$full = self::account( array( 'loginButtonScope' => 'all-forms', 'loginButtonWidthType' => 'full' ) );
		$this->assertStringContainsString( '.woocommerce-form-login__submit{width:100%;}', $full, 'MUST FAIL: the sign-in button stretches' );
		$this->assertStringNotContainsString( '.sgs-wishlist-panel__empty-cta{width:100%', $full, 'the extra buttons keep their natural width' );
		$this->assertStringNotContainsString( 'a.button:not(.view):not(.wc-block-components-notice-banner__content *){width:100%', $full );
		$fit = self::account( array( 'loginButtonWidthType' => 'fit' ) );
		$this->assertStringContainsString( '.woocommerce-form-login__submit{width:fit-content;}', $fit, 'fit is a choice that does something' );
	}

	public function test_a_resting_shadow_on_a_form_button_never_lifts_and_a_hover_shadow_prints_when_set(): void {
		$rest = self::account( array( 'loginButtonShadow' => '4px 4px 0 0', 'loginButtonShadowColour' => 'mm-cocoa' ) );
		$this->assertStringContainsString( 'box-shadow:', $rest );
		$this->assertStringNotContainsString( ':hover{box-shadow:', $rest, 'MUST FAIL: the account buttons never took the automatic lift' );
		$hover = self::account( array( 'loginButtonShadow' => '4px 4px 0 0', 'loginButtonShadowColour' => 'mm-cocoa', 'loginButtonShadowHover' => '7px 7px 0 0' ) );
		$this->assertStringContainsString( ':hover{box-shadow:', $hover );
	}

	public function test_the_old_account_names_print_nothing(): void {
		$css = self::account( array( 'loginButtonBackground' => 'mm-yellow', 'loginButtonText' => 'mm-cocoa', 'loginButtonFullWidth' => true, 'loginButtonPreset' => 'primary' ) );
		$this->assertSame( '', $css, 'MUST FAIL if a fallback reads an old name (FP-14)' );
	}
}
