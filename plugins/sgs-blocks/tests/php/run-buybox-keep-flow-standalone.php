<?php
/**
 * Standalone test: the buy box's "keep Add to Cart beside the flow's button" setting (Spec 43 FR-43-25,
 * `keepAddToCartWithFlow`), through the real includes/buybox-linked-flow.php and includes/buybox-modal-cta.php.
 *
 * Run: php tests/php/run-buybox-keep-flow-standalone.php
 * Exit 0 all pass, 1 any failure. BuyboxKeepFlowTest.php runs it under PHPUnit.
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks {
	class Sgs_Block_CPTs {
		/** @var array<string,\WP_Post> */
		public static $flows = array();

		public static function resolve_choice_flow( string $slug ) {
			return self::$flows[ $slug ] ?? null;
		}
	}
}

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	class WP_Post {
		public $post_name    = '';
		public $post_content = '';
	}

	/** A product answering the two questions the keep path asks. */
	class WC_Product {
		public $purchasable = true;
		public $in_stock    = true;
		public function is_purchasable() {
			return $this->purchasable;
		}
		public function is_in_stock() {
			return $this->in_stock;
		}
	}

	$GLOBALS['sgs_t_meta']   = array();
	$GLOBALS['sgs_t_modals'] = 0;
	$GLOBALS['sgs_t_blocks'] = array();

	function get_post_meta( $id, $key = '', $single = false ) {
		return $GLOBALS['sgs_t_meta'][ $id ][ $key ] ?? '';
	}
	function sanitize_title( $s ) {
		return strtolower( preg_replace( '/[^A-Za-z0-9-]+/', '-', (string) $s ) );
	}
	function sanitize_key( $s ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $s ) );
	}
	function sanitize_text_field( $s ) {
		return trim( strip_tags( (string) $s ) );
	}
	function esc_attr( $s ) {
		return htmlspecialchars( (string) $s, ENT_QUOTES );
	}
	function esc_html( $s ) {
		return htmlspecialchars( (string) $s, ENT_QUOTES );
	}
	function __( $s, $d = '' ) {
		return $s;
	}
	function sgs_rich_text_kses( $s, $x = false ) {
		return (string) $s;
	}
	function do_blocks( $c ) {
		$GLOBALS['sgs_t_blocks'][] = $c;
		return (string) preg_replace( '/<!--\s*\/?wp:[^>]*-->\s*/', '', $c ) . ( str_contains( $c, 'add-to-cart-with-options' ) ? '<form class="cart">CORE ADD TO CART</form>' : '' );
	}
	function render_block( array $b ) {
		++$GLOBALS['sgs_t_modals'];
		return '<div class="sgs-modal" id="' . $b['attrs']['anchor'] . '"></div>';
	}
	function parse_blocks( $content ) {
		$attrs = array();
		foreach ( array( 'openerLabel', 'openerNote' ) as $key ) {
			if ( preg_match( '/' . $key . '="([^"]*)"/', (string) $content, $m ) ) {
				$attrs[ $key ] = $m[1];
			}
		}
		return array( array( 'blockName' => 'sgs/choice-flow', 'attrs' => $attrs ) );
	}

	require dirname( __DIR__, 2 ) . '/includes/buybox-modal-cta.php';
	require dirname( __DIR__, 2 ) . '/includes/buybox-linked-flow.php';

	$pass = 0;
	$fail = 0;
	$ok   = static function ( bool $cond, string $name ) use ( &$pass, &$fail ): void {
		if ( $cond ) {
			++$pass;
			echo "ok   $name\n";
		} else {
			++$fail;
			echo "FAIL $name\n";
		}
	};

	$flow               = new WP_Post();
	$flow->post_name    = 'lens-flow';
	$flow->post_content = '<!-- wp:sgs/choice-flow {"openerLabel":"x"} /--> openerLabel="Add prescription lenses"';
	\SGS\Blocks\Sgs_Block_CPTs::$flows['lens-flow'] = $flow;
	$GLOBALS['sgs_t_meta'][52]['_sgs_choice_flow']   = 'lens-flow';

	// 1. Setting off: today's swap, field for field.
	$r = sgs_buybox_apply_linked_flow( 52, false, 'cart', '', false );
	$ok( 'modal' === $r['action'] && 'sgs-flow-lens-flow' === $r['modal_id'] && true === $r['opens_modal'] && $r['flow'] === $flow && 'Add prescription lenses' === $r['label'] && false === $r['keep'], 'off: Add to Cart becomes the flow opener (unchanged)' );
	$r = sgs_buybox_apply_linked_flow( 52, false, 'cart', '', false, false );
	$ok( 'modal' === $r['action'] && false === $r['keep'], 'off, passed explicitly: the same' );

	// 2. Setting on with a linked flow: the buy box keeps its own button, the flow comes back for the opener and modal.
	$r = sgs_buybox_apply_linked_flow( 52, false, 'cart', '', false, true );
	$ok( 'cart' === $r['action'] && '' === $r['modal_id'] && false === $r['opens_modal'] && $r['flow'] === $flow && '' === $r['label'] && true === $r['keep'], 'on + linked flow: action stays cart, flow returned, keep true' );

	// 3. Setting on, no flow linked: nothing changes.
	$r = sgs_buybox_apply_linked_flow( 99, false, 'cart', '', false, true );
	$ok( 'cart' === $r['action'] && null === $r['flow'] && false === $r['keep'], 'on + no flow linked: no opener, no modal' );

	// 4. Existing precedence stays.
	$r = sgs_buybox_apply_linked_flow( 52, false, 'modal', 'my-popup', true, true );
	$ok( 'my-popup' === $r['modal_id'] && null === $r['flow'] && false === $r['keep'], 'on + explicit addToCartAction modal: the explicit popup wins, no second opener' );
	$r = sgs_buybox_apply_linked_flow( 52, true, 'cart', '', false, true );
	$ok( null === $r['flow'] && false === $r['keep'] && 'cart' === $r['action'], 'on + guided layout: never runs a flow' );

	// 5. The opener beside a kept Add to Cart.
	$html = sgs_buybox_flow_opener_html( $flow, '' );
	$ok( str_contains( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' ) && str_contains( $html, 'aria-haspopup="dialog"' ) && str_contains( $html, 'type="button"' ), 'opener opens the flow modal through the open-anywhere attribute' );
	$ok( str_contains( $html, 'wp-element-button buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener' ), 'opener reuses the secondary button look classes' );
	$ok( ! str_contains( $html, '<svg' ), 'opener carries no cart icon' );
	$ok( str_contains( $html, '>Add prescription lenses</span>' ), 'opener wording is the flow\'s own openerLabel' );
	$ok( str_contains( $html, 'data-wp-bind--hidden="!context.inStock"' ) && ! str_contains( $html, ' style=' ), 'opener keeps the stock gate and prints no inline style' );
	$plain          = new WP_Post();
	$plain->post_name = 'plain';
	$ok( str_contains( sgs_buybox_flow_opener_html( $plain, '' ), '>Choose your options</span>' ), 'no openerLabel: the translatable default wording' );
	$ok( str_contains( sgs_buybox_flow_opener_html( $flow, 'secondary' ), 'class="wp-element-button buybox__add-to-cart buybox__add-to-cart--flow-opener"' ), 'Add to Cart already secondary: the opener takes the plain base look' );

	// 5b. The flow's openerNote: a second line inside the opener, after its words, only where the flow sets one.
	$noted               = new WP_Post();
	$noted->post_name    = 'lens-flow';
	$noted->post_content = 'openerLabel="Add my prescription" openerNote="from +£59"';
	$with_note           = sgs_buybox_flow_opener_html( $noted, '' );
	$ok( str_contains( $with_note, '<span class="buybox__cart-label">Add my prescription</span><span class="buybox__add-to-cart-note">from +£59</span></button>' ), 'opener with a flow note: the note follows the words inside the button' );
	$ok( 'from +£59' === sgs_buybox_linked_flow_note( $noted ) && '' === sgs_buybox_linked_flow_note( $flow ), 'the note is the flow root\'s openerNote, else empty' );
	$ok( ! str_contains( $html, 'buybox__add-to-cart-note' ), 'no note on the flow: the opener is exactly as before' );
	$ok( sgs_buybox_modal_cta_html( 'Go', 'a b', false, '', 'm', false ) === sgs_buybox_modal_cta_html( 'Go', 'a b', false, '', 'm', false, '' ), 'an empty note prints nothing' );
	$evil = sgs_buybox_modal_cta_html( 'Go', 'a b', false, '', 'm', false, '<b>x</b>"' );
	$ok( str_contains( $evil, '&lt;b&gt;x&lt;/b&gt;&quot;' ) && ! str_contains( $evil, '<b>' ), 'the note is escaped as text' );
	$priced = sgs_buybox_modal_cta_html( 'Go', 'a b', true, '£10', 'm', false, 'n' );
	$ok( str_contains( $priced, '<span class="buybox__cart-label">Go</span><span class="buybox__add-to-cart-note">n</span></span><span class="buybox__cart-price"' ), 'with the price shown, the note sits after the words and before the price' );

	// 6. The modal helper with its default is unchanged (icon on).
	$default = sgs_buybox_modal_cta_html( 'Go', 'a b', false, '', 'm' );
	$ok( str_contains( $default, '<svg class="buybox__cart-icon"' ) && str_contains( sgs_buybox_modal_cta_html( 'Go', 'a b', false, '', 'm', true ), '<svg' ) && ! str_contains( sgs_buybox_modal_cta_html( 'Go', 'a b', false, '', 'm', false ), '<svg' ), 'modal helper: icon on by default, off only when asked' );

	// 7. A simple product.
	$GLOBALS['sgs_t_modals'] = 0;
	$buyable                 = new WC_Product();
	$simple                  = sgs_buybox_simple_keep_flow_html( 52, $buyable );
	$ok( str_contains( $simple, 'CORE ADD TO CART' ) && str_contains( $simple, 'data-sgs-modal-open="sgs-flow-lens-flow"' ) && str_contains( $simple, 'sgs-buybox__cart-actions--with-flow' ), 'simple + on: core Add to Cart kept, opener beside it in the wrapper' );
	$ok( strpos( $simple, 'CORE ADD TO CART' ) < strpos( $simple, 'data-sgs-modal-open' ) && 1 === substr_count( $simple, 'class="sgs-modal"' ), 'simple + on: opener after the core button, modal printed once' );
	$ok( '' === sgs_buybox_simple_keep_flow_html( 99, $buyable ), 'simple + on + no flow: empty, the caller keeps its core fallback' );
	$off = sgs_buybox_simple_linked_flow_html( 52, 'Add to Cart' );
	$ok( ! str_contains( $off, 'CORE ADD TO CART' ) && ! str_contains( $off, 'with-flow' ) && str_contains( $off, 'Add prescription lenses' ), 'simple + off: the core button is replaced by the opener (unchanged)' );

	// The modal prints once a page (sgs_buybox_render_linked_flow_modal's guard), so these later calls carry none.
	$first = sgs_buybox_simple_keep_flow_html( 52, $buyable, array( 'openerBeforeAddToCart' => true ) );
	$ok( false !== strpos( $first, 'data-sgs-modal-open' ) && strpos( $first, 'data-sgs-modal-open' ) < strpos( $first, 'CORE ADD TO CART' ) && 1 === substr_count( $first, 'CORE ADD TO CART' ) && 1 === substr_count( $first, 'data-sgs-modal-open="sgs-flow-lens-flow"' ) && str_contains( $first, 'sgs-buybox__cart-actions--with-flow' ), 'simple + on + openerBeforeAddToCart: the opener before the core button in the wrapper, each once' );
	$ok( sgs_buybox_simple_keep_flow_html( 52, $buyable ) === sgs_buybox_simple_keep_flow_html( 52, $buyable, array( 'openerBeforeAddToCart' => false ) ), 'simple + on + openerBeforeAddToCart false: byte-identical to the setting absent' );

	// 7b. The keep path's output and the core blocks it asks for are exactly what they were before the markup moved to one place.
	$head_markup = '<!-- wp:woocommerce/product-image-gallery /--><!-- wp:woocommerce/product-price {"isDescendentOfSingleProductBlock":true} /-->';
	$cart_markup = '<!-- wp:woocommerce/add-to-cart-with-options {"isDescendentOfSingleProductBlock":true} /-->';
	$GLOBALS['sgs_t_blocks'] = array();
	sgs_buybox_simple_keep_flow_html( 52, $buyable );
	$ok( array( $head_markup, $cart_markup ) === $GLOBALS['sgs_t_blocks'], 'simple + on: asks core for the gallery and price, then Add to Cart, with the same markup as before' );
	$ok( $simple === '<div class="sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow"><form class="cart">CORE ADD TO CART</form><div class="buybox__cart-form buybox__cart-form--modal" data-wp-bind--hidden="!context.inStock"><button type="button" class="wp-element-button buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener" aria-haspopup="dialog" data-sgs-modal-open="sgs-flow-lens-flow"><span class="buybox__cart-label">Add prescription lenses</span></button></div></div><div class="sgs-modal" id="sgs-flow-lens-flow"></div>', 'simple + on: the whole output is the markup it was before the change (the modal stub follows the wrapper)' );
	$GLOBALS['sgs_t_blocks'] = array();
	sgs_buybox_simple_linked_flow_html( 52, 'Add to Cart' );
	$ok( array( $head_markup ) === $GLOBALS['sgs_t_blocks'], 'simple + off: asks core for the gallery and price only, with the same markup as before' );
	$parts = sgs_buybox_core_fallback_parts();
	$ok( $head_markup === $parts['head'] && $cart_markup === $parts['cart'], 'the no-flow fallback render.php prints (head + cart) is the markup both simple paths build from' );

	// 7c. A simple product that cannot be bought gets no opener and no wrapper: the caller keeps core's own fallback.
	$sold_out           = new WC_Product();
	$sold_out->in_stock = false;
	$unbuyable              = new WC_Product();
	$unbuyable->purchasable = false;
	$ok( '' === sgs_buybox_simple_keep_flow_html( 52, $sold_out ), 'simple + on + out of stock: no opener, no wrapper' );
	$ok( '' === sgs_buybox_simple_keep_flow_html( 52, $unbuyable ), 'simple + on + not purchasable: no opener, no wrapper' );

	// 7d. The setting follows the variable path's precedence on a simple product: the helper agrees with sgs_buybox_apply_linked_flow().
	$agree = true;
	foreach ( array( 'standard', 'guided', 'configurator' ) as $layout ) {
		foreach ( array( 'cart', 'modal', 'Modal', 'bogus' ) as $action ) {
			foreach ( array( '', '  ', 'my-popup' ) as $modal_id ) {
				$attrs = array( 'keepAddToCartWithFlow' => true, 'buyboxLayout' => $layout, 'addToCartAction' => $action, 'addToCartModalId' => $modal_id );
				$act   = sanitize_key( $action );
				$act   = in_array( $act, array( 'cart', 'modal' ), true ) ? $act : 'cart';
				$mid   = sanitize_text_field( $modal_id );
				$wire  = sgs_buybox_apply_linked_flow( 52, 'guided' === $layout, $act, $mid, 'modal' === $act && '' !== $mid, true );
				$agree = $agree && ( sgs_buybox_keep_setting_applies( $attrs ) === ( true === $wire['keep'] ) );
			}
		}
	}
	$ok( $agree, 'the keep setting applies on a simple product exactly when it does on a variable one (layout x action x popup id)' );
	$ok( false === sgs_buybox_keep_setting_applies( array( 'buyboxLayout' => 'standard' ) ) && false === sgs_buybox_keep_setting_applies( array( 'keepAddToCartWithFlow' => false ) ), 'setting off or absent: never applies' );

	// 8. Two buyboxes linking the same flow still print the modal once.
	$GLOBALS['sgs_t_modals'] = 0;
	sgs_buybox_render_linked_flow_modal( $flow );
	sgs_buybox_render_linked_flow_modal( $flow );
	$ok( 0 === $GLOBALS['sgs_t_modals'], 'modal already printed above is not printed twice (static guard)' );

	echo "\n$pass passed, $fail failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
