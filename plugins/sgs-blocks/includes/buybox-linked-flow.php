<?php
/**
 * Sgs/buybox — product-linked Choice Flow auto-wiring (Spec 43 FR-43-25).
 *
 * When a product has a resolvable `_sgs_choice_flow` link
 * (`includes/product-choice-flow-link.php`), the buybox's Add to Cart button
 * becomes that flow's opener and the buybox renders the full-screen
 * `sgs/modal` that holds it — no per-product template or hand-placed popup
 * needed. Reuses FR-43-22's existing modal-CTA mechanism
 * ({@see sgs_buybox_modal_cta_html()} in `buybox-modal-cta.php`) and
 * `sgs/modal`'s own open-anywhere listener; this file only decides WHEN that
 * mode applies and builds the modal markup, so `buybox/render.php` stays a
 * few hook lines.
 *
 * Precedence (Spec 43 FR-43-25): an explicit `addToCartAction: modal` with
 * its own `addToCartModalId` always wins over the product link. The guided
 * buybox layout (FR-43-23) never runs a saved flow, so it's excluded here
 * too.
 *
 * Keep-both setting (Spec 43 FR-43-25, `keepAddToCartWithFlow`, off by default):
 * for a flow some buyers skip, the buybox keeps its own Add to Cart (and the
 * express Buy now buttons) exactly as without a flow, and the flow's opener is
 * rendered as a second, secondary-looking button beside them
 * ({@see sgs_buybox_flow_opener_html()}). The modal still renders once.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_linked_flow_modal_anchor' ) ) {
	/**
	 * The HTML anchor the auto-wired full-screen modal is given, derived from
	 * the flow's slug so it's stable and unique per flow.
	 *
	 * @param string $flow_slug The linked `sgs_choice_flow` post's slug.
	 * @return string A `sgs_modal` block anchor value, e.g. "sgs-flow-my-product".
	 */
	function sgs_buybox_linked_flow_modal_anchor( string $flow_slug ): string {
		return 'sgs-flow-' . sanitize_title( $flow_slug );
	}
}

if ( ! function_exists( 'sgs_buybox_resolve_linked_flow' ) ) {
	/**
	 * Resolve the product's linked, publishable `sgs_choice_flow` post, or
	 * null when there is none to wire (no link set, or the link's target is
	 * gone) — same fail-closed shape as
	 * {@see \SGS\Blocks\Sgs_Block_CPTs::resolve_choice_flow()}, which this
	 * calls.
	 *
	 * @param int $product_id The product post ID.
	 * @return \WP_Post|null
	 */
	function sgs_buybox_resolve_linked_flow( int $product_id ): ?\WP_Post {
		if ( $product_id <= 0 || ! class_exists( '\SGS\Blocks\Sgs_Block_CPTs' ) ) {
			return null;
		}

		$slug = (string) get_post_meta( $product_id, '_sgs_choice_flow', true );
		if ( '' === $slug ) {
			return null;
		}

		return \SGS\Blocks\Sgs_Block_CPTs::resolve_choice_flow( $slug );
	}
}

if ( ! function_exists( 'sgs_buybox_core_fallback_parts' ) ) {
	/**
	 * The WooCommerce core blocks the buybox falls back to (FR-30-2): the gallery and price (`head`), then core's Add to Cart
	 * (`cart`). The one place the markup lives: render.php prints `head` + `cart` as its no-flow fallback, and a simple product
	 * with a linked flow prints `head` with the flow's opener in place of `cart`, or beside it (`keepAddToCartWithFlow`).
	 *
	 * @return array{head:string,cart:string}
	 */
	function sgs_buybox_core_fallback_parts(): array {
		return array(
			'head' => '<!-- wp:woocommerce/product-image-gallery /--><!-- wp:woocommerce/product-price {"isDescendentOfSingleProductBlock":true} /-->',
			'cart' => '<!-- wp:woocommerce/add-to-cart-with-options {"isDescendentOfSingleProductBlock":true} /-->',
		);
	}
}

if ( ! function_exists( 'sgs_buybox_keep_setting_applies' ) ) {
	/**
	 * Whether `keepAddToCartWithFlow` does anything for these buybox settings: it is on, the layout is not the guided one and
	 * the button is not set to open a named popup (an explicit popup and the guided layout win over a product-linked flow,
	 * FR-43-25). The same precedence {@see sgs_buybox_apply_linked_flow()} applies on a variable product, read here from the
	 * attributes for a simple product, whose render never reaches that function.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @return bool
	 */
	function sgs_buybox_keep_setting_applies( array $attributes ): bool {
		if ( empty( $attributes['keepAddToCartWithFlow'] ) || 'guided' === (string) ( $attributes['buyboxLayout'] ?? 'standard' ) ) {
			return false;
		}
		$action   = sanitize_key( (string) ( $attributes['addToCartAction'] ?? 'cart' ) );
		$modal_id = sanitize_text_field( (string) ( $attributes['addToCartModalId'] ?? '' ) );
		return ! ( 'modal' === $action && '' !== $modal_id );
	}
}

if ( ! function_exists( 'sgs_buybox_apply_linked_flow' ) ) {
	/**
	 * Decide whether the product-link auto-wiring should override the
	 * buybox's own `addToCartAction`/`addToCartModalId`, and return the
	 * (possibly overridden) pair plus the resolved flow post (or null).
	 *
	 * Never overrides when the buybox is already in an explicit modal mode
	 * (`$add_to_cart_opens_modal` true) or is the guided layout — both win
	 * over the product link per FR-43-25.
	 *
	 * @param int    $product_id              The buybox's product ID.
	 * @param bool   $is_guided               Whether the buybox layout is 'guided'.
	 * @param string $add_to_cart_action      The buybox's own resolved action ('cart'|'modal').
	 * @param string $add_to_cart_modal_id    The buybox's own resolved modal anchor (may be '').
	 * @param bool   $add_to_cart_opens_modal Whether the buybox's own settings already open a modal.
	 * @param bool   $keep_cart_button        The `keepAddToCartWithFlow` setting: keep Add to Cart and show the flow's opener beside it.
	 * @return array{action:string,modal_id:string,opens_modal:bool,flow:?\WP_Post,label:string,keep:bool} Same three CTA values, overridden when a linked flow applies (left alone when `keep` is true), plus the resolved flow post, its opener label and whether the opener goes beside the kept Add to Cart.
	 */
	function sgs_buybox_apply_linked_flow( int $product_id, bool $is_guided, string $add_to_cart_action, string $add_to_cart_modal_id, bool $add_to_cart_opens_modal, bool $keep_cart_button = false ): array {
		$result = array(
			'action'      => $add_to_cart_action,
			'modal_id'    => $add_to_cart_modal_id,
			'opens_modal' => $add_to_cart_opens_modal,
			'flow'        => null,
			'label'       => '',
			'keep'        => false,
		);

		if ( $is_guided || $add_to_cart_opens_modal ) {
			// Explicit modal mode or the guided layout always wins (FR-43-25).
			return $result;
		}

		$flow = sgs_buybox_resolve_linked_flow( $product_id );
		if ( ! $flow instanceof \WP_Post ) {
			return $result;
		}

		if ( $keep_cart_button ) {
			// The buybox's own buttons stay; only the flow (for its opener and modal) is handed back.
			$result['flow'] = $flow;
			$result['keep'] = true;
			return $result;
		}

		$modal_id = sgs_buybox_linked_flow_modal_anchor( $flow->post_name );

		$result['action']      = 'modal';
		$result['modal_id']    = $modal_id;
		$result['opens_modal'] = true;
		$result['flow']        = $flow;
		$result['label']       = sgs_buybox_linked_flow_label( $flow );

		return $result;
	}
}

if ( ! function_exists( 'sgs_buybox_render_linked_flow_modal' ) ) {
	/**
	 * Render the full-screen `sgs/modal` holding the linked flow, once per
	 * page even when two buyboxes on the same page link the same flow (a
	 * static per-request guard keyed by anchor — the second call is a silent
	 * no-op, matching the "one saved flow, its placements" architecture:
	 * the modal is a placement of the flow, not a per-buybox instance).
	 *
	 * Built from a block array + `render_block()` rather than a hand-written
	 * HTML string, so the modal gets its OWN real render.php output (styling,
	 * Interactivity bindings, open-anywhere wiring) exactly as if an author
	 * had placed it and linked the flow through the block editor's own
	 * "Linked flow" picker (FR-43-6) — `flowIsLinked: true` is what stops the
	 * flow rendering itself if the flow post's own content were ever reused.
	 *
	 * @param \WP_Post $flow The resolved `sgs_choice_flow` post.
	 * @return void Echoes the modal markup directly.
	 */
	function sgs_buybox_render_linked_flow_modal( \WP_Post $flow ): void {
		static $rendered_anchors = array();

		$anchor = sgs_buybox_linked_flow_modal_anchor( $flow->post_name );
		if ( isset( $rendered_anchors[ $anchor ] ) ) {
			return;
		}
		$rendered_anchors[ $anchor ] = true;

		$choice_flow_block = array(
			'blockName'    => 'sgs/choice-flow',
			'attrs'        => array(
				'flowId'       => $flow->post_name,
				'flowIsLinked' => true,
			),
			'innerBlocks'  => array(),
			'innerHTML'    => '',
			'innerContent' => array(),
		);

		$modal_block = array(
			'blockName'    => 'sgs/modal',
			'attrs'        => array(
				'anchor'       => $anchor,
				'size'         => 'fullscreen',
				'triggerStyle' => 'none',
			),
			'innerBlocks'  => array( $choice_flow_block ),
			'innerHTML'    => '',
			'innerContent' => array( null ),
		);

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() renders through the registered sgs/modal + sgs/choice-flow render.php callbacks, which escape their own output.
		echo render_block( $modal_block );
	}
}

if ( ! function_exists( 'sgs_buybox_flow_opener_html' ) ) {
	/**
	 * The flow's opener as a second button beside a kept Add to Cart
	 * (`keepAddToCartWithFlow`). It reuses the Add to Cart button's own look
	 * classes in the secondary preset (the plain base look when the Add to Cart
	 * is already secondary, so the two stay distinguishable), carries no cart
	 * icon, and
	 * opens the same modal the buybox renders through `sgs/modal`'s
	 * open-anywhere listener.
	 *
	 * @param \WP_Post $flow             The linked `sgs_choice_flow` post.
	 * @param string   $add_to_cart_look The Add to Cart button's preset slug ('' for the default look).
	 * @return string Fully escaped HTML.
	 */
	function sgs_buybox_flow_opener_html( \WP_Post $flow, string $add_to_cart_look = '' ): string {
		$label = sgs_buybox_linked_flow_label( $flow );
		if ( '' === $label ) {
			$label = __( 'Choose your options', 'sgs-blocks' );
		}
		$look = 'secondary' === $add_to_cart_look ? '' : ' buybox__add-to-cart--secondary';
		return sgs_buybox_modal_cta_html( $label, 'wp-element-button buybox__add-to-cart' . $look . ' buybox__add-to-cart--flow-opener', false, '', sgs_buybox_linked_flow_modal_anchor( $flow->post_name ), false );
	}
}

if ( ! function_exists( 'sgs_buybox_simple_keep_flow_html' ) ) {
	/**
	 * A simple (non-variable) product with a linked flow and `keepAddToCartWithFlow`
	 * on: the core fallback exactly as without a flow, with the flow's opener
	 * beside core's Add to Cart and the flow's modal after it. Returns '' when
	 * the product has no resolvable flow, or cannot be bought (not purchasable or
	 * out of stock: core shows no Add to Cart then, and the opener's stock gate is
	 * inert outside the Interactivity context), so the caller keeps its core fallback.
	 *
	 * @param int         $product_id Product ID.
	 * @param \WC_Product $product    The product.
	 * @return string Markup (pre-escaped).
	 */
	function sgs_buybox_simple_keep_flow_html( int $product_id, \WC_Product $product ): string {
		$flow = sgs_buybox_resolve_linked_flow( $product_id );
		if ( null === $flow || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
			return '';
		}
		$parts = sgs_buybox_core_fallback_parts();
		ob_start();
		echo do_blocks( $parts['head'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core block output.
		echo '<div class="sgs-buybox__cart-actions sgs-buybox__cart-actions--with-flow">';
		echo do_blocks( $parts['cart'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core block output.
		echo sgs_buybox_flow_opener_html( $flow ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the helper escapes every value.
		echo '</div>';
		sgs_buybox_render_linked_flow_modal( $flow );
		return (string) ob_get_clean();
	}
}

if ( ! function_exists( 'sgs_buybox_simple_linked_flow_html' ) ) {
	/**
	 * A simple (non-variable) product with a linked flow: the gallery and
	 * price from WooCommerce's own blocks, then the flow's opener and its
	 * full-screen modal in place of WooCommerce's Add to Cart. Returns '' when
	 * the product has no resolvable flow, so the caller keeps its core fallback.
	 *
	 * @param int    $product_id Product ID.
	 * @param string $label      The buybox's Add to Cart label.
	 * @return string Markup (pre-escaped).
	 */
	function sgs_buybox_simple_linked_flow_html( int $product_id, string $label ): string {
		$flow = sgs_buybox_resolve_linked_flow( $product_id );
		if ( null === $flow ) {
			return '';
		}
		ob_start();
		echo do_blocks( sgs_buybox_core_fallback_parts()['head'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core block output.
		$flow_label = sgs_buybox_linked_flow_label( $flow );
		if ( '' !== $flow_label ) {
			$label = $flow_label;
		}
		echo sgs_buybox_modal_cta_html( '' !== $label ? $label : __( 'Add to Cart', 'sgs-blocks' ), 'wp-element-button buybox__add-to-cart', false, '', sgs_buybox_linked_flow_modal_anchor( $flow->post_name ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the helper escapes every value.
		sgs_buybox_render_linked_flow_modal( $flow );
		return (string) ob_get_clean();
	}
}

if ( ! function_exists( 'sgs_buybox_linked_flow_label' ) ) {
	/**
	 * The saved flow's own opener wording (its root block's `openerLabel`),
	 * e.g. "Choose your flavours"; '' when the flow leaves it to the buybox.
	 *
	 * @param \WP_Post $flow The linked `sgs_choice_flow` post.
	 * @return string
	 */
	function sgs_buybox_linked_flow_label( \WP_Post $flow ): string {
		foreach ( parse_blocks( $flow->post_content ) as $block ) {
			if ( 'sgs/choice-flow' === ( $block['blockName'] ?? '' ) ) {
				return sanitize_text_field( (string) ( $block['attrs']['openerLabel'] ?? '' ) );
			}
		}
		return '';
	}
}
