<?php
/**
 * Per-product card content for sgs/product-card: the badge, price note and button
 * label (and what the button does) read from each product's own meta, so one card
 * block inside a product template can say something different for every product.
 *
 * The block's `cardContentSource` attribute switches this on ("product"); "typed"
 * (the default) leaves every attribute untouched. The values are written into the
 * render-time attributes (never saved), so every render branch prints them through
 * the existing override pipeline (sgs_product_card_resolve_element). The product
 * edit screen's Card tab (includes/class-product-card-fields.php) writes the meta.
 *
 * Render-time keys (never block attributes): _sgsBadgeFromProduct and
 * _sgsPriceNoteFromProduct.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_card_meta_keys' ) ) {
	/**
	 * The standard meta key for each per-product card value.
	 *
	 * @return array<string,string> Field => meta key.
	 */
	function sgs_product_card_meta_keys(): array {
		return array(
			'badge'  => '_sgs_card_badge',
			'note'   => '_sgs_card_price_note',
			'label'  => '_sgs_card_cta_label',
			'action' => '_sgs_card_cta_action',
		);
	}
}

if ( ! function_exists( 'sgs_product_card_meta_key_for' ) ) {
	/**
	 * The meta key one card reads a field from: its own setting, else the standard key.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $field      badge|note|label|action.
	 * @return string Meta key.
	 */
	function sgs_product_card_meta_key_for( array $attributes, string $field ): string {
		$setting  = array(
			'badge'  => 'badgeMetaKey',
			'note'   => 'priceNoteMetaKey',
			'label'  => 'ctaLabelMetaKey',
			'action' => 'ctaActionMetaKey',
		);
		$standard = sgs_product_card_meta_keys();
		$typed    = isset( $setting[ $field ] ) ? trim( (string) ( $attributes[ $setting[ $field ] ] ?? '' ) ) : '';
		$typed    = (string) preg_replace( '/[^A-Za-z0-9_\-]/', '', $typed );
		return '' !== $typed ? $typed : ( $standard[ $field ] ?? '' );
	}
}

if ( ! function_exists( 'sgs_product_card_per_product_read' ) ) {
	/**
	 * Read one product's card values from its meta, and whether it needs choices.
	 *
	 * @param int                 $product_id Product ID.
	 * @param array<string,mixed> $attributes Block attributes (for the key settings).
	 * @return array{badge:string,note:string,label:string,action:string,needs_choices:bool}
	 */
	function sgs_product_card_per_product_read( int $product_id, array $attributes ): array {
		$out = array(
			'badge'         => '',
			'note'          => '',
			'label'         => '',
			'action'        => '',
			'needs_choices' => false,
		);
		if ( $product_id <= 0 ) {
			return $out;
		}
		foreach ( array( 'badge', 'note', 'label', 'action' ) as $field ) {
			$out[ $field ] = trim( wp_strip_all_tags( (string) get_post_meta( $product_id, sgs_product_card_meta_key_for( $attributes, $field ), true ) ) );
		}
		if ( function_exists( 'wc_get_product' ) ) {
			$product = wc_get_product( $product_id );
			if ( $product ) {
				$out['needs_choices'] = $product->is_type( array( 'variable', 'grouped', 'variable-subscription' ) ) || ! $product->is_purchasable();
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_product_card_per_product_apply' ) ) {
	/**
	 * Apply one product's values to the card's render-time attributes.
	 *
	 * Unchanged unless cardContentSource is "product". In that mode the badge, the
	 * price note and the button label are the product's values (empty = none, so the
	 * usual live label and no badge); the button action is the product's own when set
	 * (add or page), else a card with ctaChoicesToPage sends a product that needs
	 * choices to its page.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param array<string,mixed> $values     From sgs_product_card_per_product_read().
	 * @return array<string,mixed> Attributes.
	 */
	function sgs_product_card_per_product_apply( array $attributes, array $values ): array {
		if ( 'product' !== ( $attributes['cardContentSource'] ?? 'typed' ) ) {
			return $attributes;
		}
		$overrides = isset( $attributes['overrideElements'] ) && is_array( $attributes['overrideElements'] )
			? array_values( array_diff( $attributes['overrideElements'], array( 'badge', 'cta' ) ) )
			: array();

		$badge = (string) ( $values['badge'] ?? '' );
		$label = (string) ( $values['label'] ?? '' );
		if ( '' !== $badge ) {
			$overrides[] = 'badge';
		}
		if ( '' !== $label ) {
			$overrides[] = 'cta';
		}
		$attributes['overrideElements'] = $overrides;
		$attributes['featuredTag']      = $badge;
		$attributes['trialTag']         = '';
		$attributes['ctaText']          = $label;
		$attributes['priceNote']        = (string) ( $values['note'] ?? '' );

		$attributes['_sgsBadgeFromProduct']     = '' !== $badge;
		$attributes['_sgsPriceNoteFromProduct'] = '' !== $attributes['priceNote'];

		$action = (string) ( $values['action'] ?? '' );
		if ( 'add' === $action ) {
			$attributes['ctaBehaviour'] = 'add-to-basket';
		} elseif ( 'page' === $action ) {
			$attributes['ctaBehaviour'] = 'learn-more';
		} elseif ( ! empty( $attributes['ctaChoicesToPage'] ) && ! empty( $values['needs_choices'] ) ) {
			$attributes['ctaBehaviour'] = 'learn-more';
		}
		return $attributes;
	}
}

if ( ! function_exists( 'sgs_product_card_per_product_fill' ) ) {
	/**
	 * Read and apply the per-product values for a connected card.
	 *
	 * @param array<string,mixed> $attributes  Block attributes.
	 * @param int                 $product_id  Resolved product ID.
	 * @param string              $source_mode The card's sourceMode.
	 * @return array<string,mixed> Attributes.
	 */
	function sgs_product_card_per_product_fill( array $attributes, int $product_id, string $source_mode ): array {
		if ( 'wc-product' !== $source_mode || 'product' !== ( $attributes['cardContentSource'] ?? 'typed' ) ) {
			return $attributes;
		}
		return sgs_product_card_per_product_apply( $attributes, sgs_product_card_per_product_read( $product_id, $attributes ) );
	}
}

if ( ! function_exists( 'sgs_product_card_badge_from_product' ) ) {
	/**
	 * Whether the card's badge text comes from the product's own meta.
	 *
	 * @param array<string,mixed> $attributes Attributes after sgs_product_card_per_product_apply().
	 * @return bool
	 */
	function sgs_product_card_badge_from_product( array $attributes ): bool {
		return ! empty( $attributes['_sgsBadgeFromProduct'] );
	}
}

if ( ! function_exists( 'sgs_product_card_price_note_markup' ) ) {
	/**
	 * The per-product price note beside the price on a connected card.
	 *
	 * @param array<string,mixed> $attributes Attributes after sgs_product_card_per_product_fill().
	 * @return string Safe HTML or ''.
	 */
	function sgs_product_card_price_note_markup( array $attributes ): string {
		if ( empty( $attributes['_sgsPriceNoteFromProduct'] ) ) {
			return '';
		}
		return '<span class="sgs-product-card__price-note">' . esc_html( (string) ( $attributes['priceNote'] ?? '' ) ) . '</span>';
	}
}
