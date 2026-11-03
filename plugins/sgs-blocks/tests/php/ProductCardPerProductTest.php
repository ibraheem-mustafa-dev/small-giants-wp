<?php
/**
 * sgs/product-card "Card content: From each product" mode and the product edit screen's Card tab.
 *
 * Run with: vendor/bin/phpunit --filter ProductCardPerProductTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ProductCardPerProductTest extends TestCase {

	use BlockHarnessRenderTrait;

	private static function load(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/product-card-per-product.php';
	}

	/** @return array<string,mixed> */
	private static function values( array $over = array() ): array {
		return array_merge(
			array(
				'badge'         => 'Gift favourite',
				'note'          => 'gift-boxed',
				'label'         => 'Choose amount',
				'action'        => '',
				'needs_choices' => false,
			),
			$over
		);
	}

	public function test_typed_mode_leaves_every_attribute_untouched(): void {
		self::load();
		$attrs = array( 'featuredTag' => 'Typed', 'ctaText' => 'Typed button', 'priceNote' => 'typed note', 'overrideElements' => array( 'cta' ) );
		$this->assertSame( $attrs, sgs_product_card_per_product_apply( $attrs, self::values() ), 'negative control: default mode changes nothing' );
		$explicit = $attrs + array( 'cardContentSource' => 'typed' );
		$this->assertSame( $explicit, sgs_product_card_per_product_apply( $explicit, self::values() ), 'explicit typed changes nothing' );
	}

	public function test_product_mode_writes_the_products_values(): void {
		self::load();
		$out = sgs_product_card_per_product_apply( array( 'cardContentSource' => 'product', 'featuredTag' => 'Typed', 'overrideElements' => array( 'name' ) ), self::values() );

		$this->assertSame( 'Gift favourite', $out['featuredTag'] );
		$this->assertSame( 'gift-boxed', $out['priceNote'] );
		$this->assertSame( 'Choose amount', $out['ctaText'] );
		$this->assertEqualsCanonicalizing( array( 'name', 'badge', 'cta' ), $out['overrideElements'], 'other overrides are kept, badge and button join' );
		$this->assertTrue( $out['_sgsBadgeFromProduct'] );
		$this->assertTrue( $out['_sgsPriceNoteFromProduct'] );
	}

	public function test_an_empty_product_value_prints_nothing_and_does_not_blank_the_card(): void {
		self::load();
		$out = sgs_product_card_per_product_apply( array( 'cardContentSource' => 'product', 'featuredTag' => 'Typed', 'ctaText' => 'Typed button' ), self::values( array( 'badge' => '', 'note' => '', 'label' => '' ) ) );

		$this->assertSame( '', $out['featuredTag'], 'the typed badge no longer shows in this mode' );
		$this->assertSame( '', $out['ctaText'] );
		$this->assertSame( array(), $out['overrideElements'], 'no override ticked, so the live button label stands' );
		$this->assertFalse( $out['_sgsBadgeFromProduct'] );
		$this->assertSame( '', sgs_product_card_price_note_markup( $out ) );
	}

	public function test_button_action_the_product_sets_wins_then_the_choices_rule(): void {
		self::load();
		$base = array( 'cardContentSource' => 'product', 'ctaBehaviour' => 'learn-more' );

		$this->assertSame( 'add-to-basket', sgs_product_card_per_product_apply( $base, self::values( array( 'action' => 'add' ) ) )['ctaBehaviour'] );
		$this->assertSame( 'learn-more', sgs_product_card_per_product_apply( array( 'ctaBehaviour' => 'add-to-basket' ) + $base, self::values( array( 'action' => 'page' ) ) )['ctaBehaviour'] );

		$basket = array( 'ctaBehaviour' => 'add-to-basket', 'cardContentSource' => 'product' );
		$this->assertSame( 'learn-more', sgs_product_card_per_product_apply( $basket + array( 'ctaChoicesToPage' => true ), self::values( array( 'needs_choices' => true ) ) )['ctaBehaviour'], 'needs choices goes to the page' );
		$this->assertSame( 'add-to-basket', sgs_product_card_per_product_apply( $basket + array( 'ctaChoicesToPage' => true ), self::values( array( 'needs_choices' => false ) ) )['ctaBehaviour'], 'a simple product still adds' );
		$this->assertSame( 'add-to-basket', sgs_product_card_per_product_apply( $basket, self::values( array( 'needs_choices' => true ) ) )['ctaBehaviour'], 'negative control: the switch off leaves the behaviour' );
		$this->assertSame( 'add-to-basket', sgs_product_card_per_product_apply( $basket + array( 'ctaChoicesToPage' => true ), self::values( array( 'needs_choices' => true, 'action' => 'add' ) ) )['ctaBehaviour'], 'the product\'s own action beats the rule' );
	}

	public function test_the_key_setting_names_the_meta_field_and_empty_uses_the_standard_key(): void {
		self::load();
		$this->assertSame( '_sgs_card_badge', sgs_product_card_meta_key_for( array(), 'badge' ) );
		$this->assertSame( 'my_badge', sgs_product_card_meta_key_for( array( 'badgeMetaKey' => ' my_badge ' ), 'badge' ) );
		$this->assertSame( 'evil', sgs_product_card_meta_key_for( array( 'badgeMetaKey' => 'ev il"<>' ), 'badge' ), 'characters outside a key are dropped' );
	}

	public function test_the_note_markup_is_escaped(): void {
		self::load();
		if ( ! function_exists( 'esc_html' ) ) {
			eval( 'function esc_html( $v ) { return htmlspecialchars( (string) $v, ENT_QUOTES ); }' );
		}
		$out = sgs_product_card_per_product_apply( array( 'cardContentSource' => 'product' ), self::values( array( 'note' => '<b>x</b>' ) ) );
		$this->assertSame( '<span class="sgs-product-card__price-note">&lt;b&gt;x&lt;/b&gt;</span>', sgs_product_card_price_note_markup( $out ) );
	}

	/** The Card tab's saver: nonce, capability, sanitising and the action allow-list. */
	#[RunInSeparateProcess]
	#[PreserveGlobalState( false )]
	public function test_the_product_screen_saver_checks_nonce_capability_and_sanitises(): void {
		$GLOBALS['sgs_t_meta']  = array();
		$GLOBALS['sgs_t_nonce'] = true;
		$GLOBALS['sgs_t_can']   = true;
		eval(
			'function wp_unslash( $v ) { return $v; }
			function wp_verify_nonce( $n, $a ) { return $GLOBALS["sgs_t_nonce"] && "good" === $n && "sgs_product_card_fields_save" === $a; }
			function current_user_can( $c, $id = 0 ) { return $GLOBALS["sgs_t_can"] && "edit_post" === $c; }
			function update_post_meta( $id, $k, $v ) { $GLOBALS["sgs_t_meta"][ $id ][ $k ] = $v; }
			function delete_post_meta( $id, $k ) { unset( $GLOBALS["sgs_t_meta"][ $id ][ $k ] ); }
			function add_action() {} function add_filter() {}'
		);
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/product-card-fields.php';

		$post = array(
			'sgs_product_card_fields_nonce' => 'good',
			'_sgs_card_badge'               => '  <script>x</script>Build your own ',
			'_sgs_card_price_note'          => '£1.19 a cookie',
			'_sgs_card_cta_label'           => '',
			'_sgs_card_cta_action'          => 'javascript:alert(1)',
		);

		$_POST = $post;
		\SGS\Blocks\sgs_product_card_fields_save( 7 );
		$this->assertSame( 'xBuild your own', $GLOBALS['sgs_t_meta'][7]['_sgs_card_badge'], 'tags stripped, trimmed' );
		$this->assertSame( '£1.19 a cookie', $GLOBALS['sgs_t_meta'][7]['_sgs_card_price_note'] );
		$this->assertArrayNotHasKey( '_sgs_card_cta_label', $GLOBALS['sgs_t_meta'][7], 'empty removes the key' );
		$this->assertArrayNotHasKey( '_sgs_card_cta_action', $GLOBALS['sgs_t_meta'][7], 'an action outside the allow-list is dropped' );

		$GLOBALS['sgs_t_meta'] = array();
		$_POST                 = array_merge( $post, array( 'sgs_product_card_fields_nonce' => 'bad' ) );
		\SGS\Blocks\sgs_product_card_fields_save( 7 );
		$this->assertSame( array(), $GLOBALS['sgs_t_meta'], 'negative control: a bad nonce saves nothing' );

		$_POST                = $post;
		$GLOBALS['sgs_t_can'] = false;
		\SGS\Blocks\sgs_product_card_fields_save( 7 );
		$this->assertSame( array(), $GLOBALS['sgs_t_meta'], 'negative control: without edit_post nothing is saved' );

		$GLOBALS['sgs_t_can'] = true;
		$_POST                = array( '_sgs_card_badge' => 'No nonce at all' );
		\SGS\Blocks\sgs_product_card_fields_save( 7 );
		$this->assertSame( array(), $GLOBALS['sgs_t_meta'], 'negative control: a missing nonce saves nothing' );
		$this->assertSame( 'add', \SGS\Blocks\sgs_product_card_field_clean( 'action', 'add' ), 'positive control: a valid action is kept' );
	}

	public function test_a_typed_card_renders_the_same_bytes_whatever_the_mode_attributes_say(): void {
		$attrs = array( 'title' => 'Frame', 'price' => '£12', 'priceNote' => 'typed note', 'featuredTag' => 'Typed', 'variantStyle' => 'featured', 'ctaText' => 'Buy' );
		$plain = $this->render_block( 'sgs/product-card', $attrs );
		$mode  = $this->render_block( 'sgs/product-card', $attrs + array( 'cardContentSource' => 'product', 'ctaChoicesToPage' => true, 'badgeMetaKey' => 'x' ) );

		$this->assertStringContainsString( 'typed note', $plain['html'], 'positive control: the typed note rendered' );
		$this->assertSame( $plain['html'], $mode['html'], 'a typed (no product) card ignores the mode' );
		$this->assertSame( $plain['css'], $mode['css'] );
	}
}
