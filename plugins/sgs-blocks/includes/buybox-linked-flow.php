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
 * A simple product takes the same path as a variable one: render.php gives it a one-choice manifest
 * (`Product_Manifest::build_simple()`), so the opener, the kept Add to Cart and their order are the same markup on both.
 *
 * The opener's own look is the built-in button kit's `flowOpener` button (`block.json` `supports.sgs.builtinButtons`; attributes
 * `flowOpener*`), and it applies to every opener the flow prints: the second button beside a kept Add to Cart, and the Add to
 * Cart button itself where the flow replaces it (without the keep setting). Every `flowOpener*` setting is unset by default, and then the opener renders as it always has: the secondary
 * preset (the plain base look when Add to Cart is already secondary), wearing Add to Cart's rules through
 * `buybox__add-to-cart`. A setting left unset keeps following Add to Cart's value; a set one prints through
 * {@see sgs_button_kit_css()} on the opener's own selector (the opener's class is `buybox__add-to-cart--flow-opener`, added
 * only when a setting prints), and its preset's shared rules through the classes {@see sgs_buybox_flow_opener_kit_classes()}.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// sgs_style_tags(): render.php cuts the opener's shared preset groups out of its CSS into tags of their own.
require_once __DIR__ . '/helpers-shared-rules.php';

/** The opener's element as the kit's shared preset rule chains it onto the minted class: Add to Cart's own class, so the rule out-ranks the block's rules for it. */
const SGS_BUYBOX_FLOW_OPENER_ELEMENT = '.buybox__add-to-cart';

/**
 * The state guard both buy box buttons' kit rules carry: a hover or focus rule skips a disabled button. The opener wears Add to
 * Cart's class, so Add to Cart's hover rules reach it too; the opener's own rules print after them with the same guard, so they
 * weigh the same and the opener's own hover look wins on the opener.
 */
const SGS_BUYBOX_BUTTON_STATE_GUARD = ':not([disabled])';

if ( ! function_exists( 'sgs_buybox_add_to_cart_kit_css' ) ) {
	/**
	 * Add to Cart's own look as CSS: the built-in button kit's `addToCart` button (block.json supports.sgs.builtinButtons) on
	 * `$root_sel .buybox__add-to-cart`. Colours (and their hover colours), border, padding, "fit to the text" or full width, type,
	 * minimum height and shadow each print only when set, so an unset button keeps the stylesheet's own look. The preset stays the
	 * variant class on the element (`buybox__add-to-cart--{preset}`), so the kit prints the look alone (`preset` false). The hover
	 * rules skip a disabled button, as the stylesheet's own do, and the shadow's automatic lift follows `addToCartShadowLiftOnHover`.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @param string              $root_sel   The block instance's selector.
	 * @return string CSS text ('' when nothing is set).
	 */
	function sgs_buybox_add_to_cart_kit_css( array $attributes, string $root_sel ): string {
		require_once __DIR__ . '/helpers-button-style.php';
		return sgs_button_kit_css(
			$attributes,
			'addToCart',
			$root_sel . ' .buybox__add-to-cart',
			array(
				'preset'      => false,
				'state_guard' => SGS_BUYBOX_BUTTON_STATE_GUARD,
				'lift_prefix' => 'addToCart',
				'block'       => 'sgs/buybox',
			)
		);
	}
}

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
	 * The WooCommerce core blocks the buybox falls back to (FR-30-2) where it cannot render its own markup (WooCommerce absent,
	 * no product, a grouped or external product, no manifest, the context over its size cap): the gallery and price (`head`),
	 * then core's Add to Cart (`cart`). The one place the markup lives; render.php prints `head` + `cart`.
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

if ( ! function_exists( 'sgs_buybox_flow_opener_attrs' ) ) {
	/**
	 * The `flowOpener*` attributes the author set that print something. An absent key, an empty string, an empty array, an
	 * object holding only empty values (`{desktop:{}}`) and a value the kit refuses (an unknown preset name) are unset, so a
	 * block that sets none of them renders the opener exactly as before the built-in button kit, with no scope class.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @return array<string,mixed> The set `flowOpener*` attributes (empty when none prints).
	 */
	function sgs_buybox_flow_opener_attrs( array $attributes ): array {
		$prune = static function ( $value ) use ( &$prune ) {
			if ( is_array( $value ) ) {
				return array_filter( array_map( $prune, $value ), static fn( $one ): bool => null !== $one && '' !== $one && array() !== $one );
			}
			return $value;
		};
		$set = array();
		foreach ( $attributes as $key => $value ) {
			if ( 0 === strpos( (string) $key, 'flowOpener' ) ) {
				$value = $prune( $value );
				if ( null !== $value && '' !== $value && array() !== $value ) {
					$set[ (string) $key ] = $value;
				}
			}
		}
		if ( array() === $set ) {
			return array();
		}
		require_once __DIR__ . '/helpers-button-style.php';
		return '' === sgs_button_kit_css( $set, 'flowOpener', '.x', array( 'element' => SGS_BUYBOX_FLOW_OPENER_ELEMENT ) ) ? array() : $set;
	}
}

if ( ! function_exists( 'sgs_buybox_flow_opener_names_preset' ) ) {
	/**
	 * Whether `flowOpenerStyle` names a button preset the site knows ({@see sgs_button_preset_resolve()}: the starters, and the
	 * names a site that opted in carries). Then the kit prints that preset and the opener drops the "secondary unless" modifier.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @return bool
	 */
	function sgs_buybox_flow_opener_names_preset( array $attributes ): bool {
		$name = $attributes['flowOpenerStyle'] ?? '';
		if ( ! is_string( $name ) || '' === $name ) {
			return false;
		}
		require_once __DIR__ . '/helpers-button-preset.php';
		return '' !== sgs_button_preset_resolve( $name );
	}
}

if ( ! function_exists( 'sgs_buybox_flow_opener_selector' ) ) {
	/**
	 * The opener's selector for the kit's rules: Add to Cart's own class, with the opener's class inside `:where()`, under `$scope`.
	 * The opener's class adds no weight, so the opener's resting rule out-ranks Add to Cart's own resting rules by its place alone
	 * and every hover and pressed rule of the block's stylesheet (`.buybox__add-to-cart--secondary:hover:not([disabled])`, which
	 * keeps the text readable on the hover fill) out-ranks it. A rule printed after Add to Cart's wins a tie.
	 *
	 * @param string $scope A scope selector: the buy box root plus a descendant combinator (`.uid.wp-block-sgs-buybox `, with the
	 *                      trailing space).
	 * @return string
	 */
	function sgs_buybox_flow_opener_selector( string $scope ): string {
		return $scope . SGS_BUYBOX_FLOW_OPENER_ELEMENT . ':where(.buybox__add-to-cart--flow-opener)';
	}
}

if ( ! function_exists( 'sgs_buybox_flow_opener_kit_css' ) ) {
	/**
	 * The opener's own look as CSS: the built-in button kit's rules for the `flowOpener` button on `$selector`. '' when no
	 * `flowOpener*` attribute is set. The caller prints it through its usual style channel (never an inline `style` attribute).
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @param string              $selector   The opener's selector ({@see sgs_buybox_flow_opener_selector()}).
	 * @return string CSS text.
	 */
	function sgs_buybox_flow_opener_kit_css( array $attributes, string $selector ): string {
		$set = sgs_buybox_flow_opener_attrs( $attributes );
		if ( array() === $set ) {
			return '';
		}
		require_once __DIR__ . '/helpers-button-style.php';
		return sgs_button_kit_css(
			$set,
			'flowOpener',
			$selector,
			array(
				'element'     => SGS_BUYBOX_FLOW_OPENER_ELEMENT,
				'state_guard' => SGS_BUYBOX_BUTTON_STATE_GUARD,
			)
		);
	}
}

if ( ! function_exists( 'sgs_buybox_flow_opener_kit_classes' ) ) {
	/**
	 * The minted classes of the opener's preset rules ({@see sgs_button_kit_classes()}), each with a leading space: the classes the
	 * button carries so the kit's shared rules apply, beside `buybox__add-to-cart--flow-opener`, which the kit's selector names and
	 * the caller adds. '' when no setting prints or no preset is chosen, so a button with no setting keeps its markup byte for byte.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @return string
	 */
	function sgs_buybox_flow_opener_kit_classes( array $attributes ): string {
		$set = sgs_buybox_flow_opener_attrs( $attributes );
		if ( array() === $set ) {
			return '';
		}
		require_once __DIR__ . '/helpers-button-style.php';
		return sgs_button_kit_classes( $set, 'flowOpener', SGS_BUYBOX_FLOW_OPENER_ELEMENT );
	}
}

if ( ! function_exists( 'sgs_buybox_flow_opener_cta_classes' ) ) {
	/**
	 * The classes Add to Cart carries where the flow replaces it (a variable product without `keepAddToCartWithFlow`), so the
	 * opener's look settings reach it: the opener's own class, which the kit's selector names, and the preset's minted classes
	 * ({@see sgs_buybox_flow_opener_kit_classes()}), each with a leading space. '' when no `flowOpener*` setting prints, so the
	 * button's class list is as it always was.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @return string
	 */
	function sgs_buybox_flow_opener_cta_classes( array $attributes ): string {
		return array() === sgs_buybox_flow_opener_attrs( $attributes ) ? '' : ' buybox__add-to-cart--flow-opener' . sgs_buybox_flow_opener_kit_classes( $attributes );
	}
}

if ( ! function_exists( 'sgs_buybox_opener_note_css' ) ) {
	/**
	 * The flow opener note's colour rule (`openerNoteColour`) on `$scope .buybox__add-to-cart-note`; '' when unset. render.php prints it
	 * with the buy box's own scope.
	 *
	 * @param array<string,mixed> $attributes The buybox block attributes.
	 * @param string              $scope      The selector the rule is scoped to.
	 * @return string CSS text.
	 */
	function sgs_buybox_opener_note_css( array $attributes, string $scope ): string {
		$colour = sgs_colour_value( (string) ( $attributes['openerNoteColour'] ?? '' ) );
		return '' === $colour ? '' : $scope . ' .buybox__add-to-cart-note{color:' . $colour . ';}';
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
	 * @param array<string,mixed> $attributes The buybox block attributes: `flowOpenerStyle` naming a preset replaces the secondary look (the kit prints that preset).
	 * @return string Fully escaped HTML.
	 */
	function sgs_buybox_flow_opener_html( \WP_Post $flow, string $add_to_cart_look = '', array $attributes = array() ): string {
		$label = sgs_buybox_linked_flow_label( $flow );
		if ( '' === $label ) {
			$label = __( 'Choose your options', 'sgs-blocks' );
		}
		$look = 'secondary' === $add_to_cart_look || sgs_buybox_flow_opener_names_preset( $attributes ) ? '' : ' buybox__add-to-cart--secondary';
		return sgs_buybox_modal_cta_html( $label, 'wp-element-button buybox__add-to-cart' . $look . ' buybox__add-to-cart--flow-opener' . sgs_buybox_flow_opener_kit_classes( $attributes ), false, '', sgs_buybox_linked_flow_modal_anchor( $flow->post_name ), false, sgs_buybox_linked_flow_note( $flow ) );
	}
}

if ( ! function_exists( 'sgs_buybox_linked_flow_note' ) ) {
	/**
	 * The saved flow's own note for its opener (its root block's `openerNote`), a second line after the opener's words, e.g.
	 * "from +£59"; '' when the flow sets none.
	 *
	 * @param \WP_Post $flow The linked `sgs_choice_flow` post.
	 * @return string
	 */
	function sgs_buybox_linked_flow_note( \WP_Post $flow ): string {
		foreach ( parse_blocks( $flow->post_content ) as $block ) {
			if ( 'sgs/choice-flow' === ( $block['blockName'] ?? '' ) ) {
				return sanitize_text_field( (string) ( $block['attrs']['openerNote'] ?? '' ) );
			}
		}
		return '';
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
