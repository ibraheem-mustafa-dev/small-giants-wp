<?php
/**
 * sgs/product-card display switches: button icon and shadow, colour dots, per-device description and card padding,
 * the photo-fills-its-box modifier and the image size choice. Each is off by default and prints nothing then.
 *
 * Run with: vendor/bin/phpunit --filter ProductCardDisplaySwitchesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ProductCardDisplaySwitchesTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function card( array $extra = array() ): array {
		return $this->render_block(
			'sgs/product-card',
			array_merge(
				array(
					'productName'    => 'Frame',
					'priceLarge'     => '£12',
					'ctaText'        => 'Buy',
					'description'    => 'A short description',
					'colourSwatches' => array( array( 'key' => 'a', 'label' => 'Red', 'colour' => '#ff0000' ), array( 'key' => 'b', 'label' => 'Blue', 'colour' => '#0000ff' ) ),
				),
				$extra
			)
		);
	}

	public function test_button_shadow_off_emits_box_shadow_none_for_rest_and_hover(): void {
		$off = $this->card( array( 'showCtaShadow' => false ) );
		$this->assertMatchesRegularExpression( '/product-card__add-to-cart[^{]*:hover[^{]*\{box-shadow:none;\}/', $off['css'] );

		$default = $this->card();
		$this->assertStringNotContainsString( 'box-shadow:none', $default['css'], 'negative control: nothing emitted by default' );
		$on = $this->card( array( 'showCtaShadow' => true ) );
		$this->assertSame( $default['css'], $on['css'], 'negative control: explicit on equals default' );
	}

	public function test_button_icon_off_hides_the_icon(): void {
		$off = $this->card( array( 'showCtaIcon' => false ) );
		$this->assertMatchesRegularExpression( '/\.product-card__cart-icon\{display:none;\}/', $off['css'] );
		$this->assertStringNotContainsString( 'cart-icon{display:none', $this->card()['css'], 'negative control' );
	}

	public function test_swatch_dots_off_removes_them_all(): void {
		$on  = $this->card();
		$off = $this->card( array( 'showSwatches' => false ) );
		$this->assertStringContainsString( 'sgs-product-card__swatch', $on['html'], 'positive control: dots render by default' );
		$this->assertStringNotContainsString( 'sgs-product-card__swatch', $off['html'] );
	}

	public function test_description_per_device(): void {
		$tier = $this->card( array( 'showDescriptionTier' => array( 'mobile' => 'off' ) ) );
		$this->assertMatchesRegularExpression( '/@media[^{]*max-width:767px[^{]*\{[^{]*sgs-product-card__description[^{]*\{display:none;\}/', $tier['css'] );
		$this->assertStringContainsString( 'A short description', $tier['html'], 'the markup stays; only CSS hides it' );

		$this->assertSame( $this->card()['css'], $this->card( array( 'showDescriptionTier' => array() ) )['css'], 'negative control: an empty tier object emits nothing' );
		$inherit = $this->card( array( 'showDescriptionTier' => array( 'desktop' => 'on', 'tablet' => 'on', 'mobile' => 'on' ) ) );
		$this->assertSame( $this->card()['css'], $inherit['css'], 'negative control: every tier on emits nothing' );
	}

	public function test_card_padding_on_tablet_and_mobile(): void {
		$out = $this->card( array( 'cardPadding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20' ), 'cardPaddingTier' => array( 'mobile' => array( 'top' => '8', 'right' => '8', 'bottom' => '8', 'left' => '8' ) ) ) );
		$this->assertMatchesRegularExpression( '/@media[^{]*max-width:767px[^{]*\{[^{]*sgs-product-card__body[^{]*\{[^}]*padding-top:8px/', $out['css'] );

		$base = $this->card( array( 'cardPadding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20' ) ) );
		$this->assertStringNotContainsString( 'padding-top:8px', $base['css'], 'negative control: no tier, no tier rule' );
		$this->assertSame( $base['css'], $this->card( array( 'cardPadding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20' ), 'cardPaddingTier' => array() ) )['css'] );
	}

	public function test_photo_sized_modifier_only_when_the_photo_slot_sets_a_ratio_or_height(): void {
		$this->assertStringContainsString( 'product-card--image-sized', $this->card( array( 'imageRatio' => array( 'desktop' => '1 / 1' ) ) )['html'] );
		$this->assertStringContainsString( 'product-card--image-sized', $this->card( array( 'imageHeight' => array( 'desktop' => '180px' ) ) )['html'] );
		$this->assertStringNotContainsString( 'product-card--image-sized', $this->card( array( 'imageHeight' => array( 'desktop' => 'fill' ) ) )['html'], 'Height Fill keeps the fixed-height box: the photo fills it' );
		$this->assertStringNotContainsString( 'product-card--image-sized', $this->card()['html'], 'negative control' );
	}
}
