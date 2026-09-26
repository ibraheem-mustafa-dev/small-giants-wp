<?php
/**
 * Sgs/wishlist-panel — label/text attributes as sanitised data-* values.
 *
 * Every visible string in the panel (Move to basket, Remove, Notify me,
 * sort options, alerts/share copy, the shared-view banner…) is a block
 * attribute, never hard-coded in `view.js` — read here into one data-*
 * attribute map that `render.php` writes onto the root element, so the
 * client-rendered rows/bars can build their own markup from the editor's
 * own copy.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_wishlist_panel_label_data' ) ) {
	/**
	 * Build the data-* attribute map for every label/text attribute.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,string> data-attribute-name (without the "data-"
	 *                               prefix) => sanitised text value.
	 */
	function sgs_wishlist_panel_label_data( $attributes ) {
		$text_defaults = array(
			'view-all-label'        => __( 'View all saved items', 'sgs-blocks' ),
			'sort-label'            => __( 'Sort', 'sgs-blocks' ),
			'sort-recent-label'     => __( 'Recently saved', 'sgs-blocks' ),
			'sort-price-asc-label'  => __( 'Price, low to high', 'sgs-blocks' ),
			'sort-price-desc-label' => __( 'Price, high to low', 'sgs-blocks' ),
			'sort-stock-label'      => __( 'In stock first', 'sgs-blocks' ),
			'date-saved-text'       => __( 'Saved {date}', 'sgs-blocks' ),
			'price-drop-text'       => __( 'Price drop: now {now} ({saved} when you saved it)', 'sgs-blocks' ),
			'move-label'            => __( 'Move to basket', 'sgs-blocks' ),
			'remove-label'          => __( 'Remove', 'sgs-blocks' ),
			'notify-label'          => __( 'Notify me', 'sgs-blocks' ),
			'out-of-stock-label'    => __( 'Out of stock', 'sgs-blocks' ),
			'notify-email-label'    => __( 'Your email', 'sgs-blocks' ),
			'notify-consent-text'   => __( 'Email me when this item is back in stock.', 'sgs-blocks' ),
			'notify-success-text'   => __( "We'll email you when this is back in stock.", 'sgs-blocks' ),
			'error-text'            => __( 'Something went wrong. Please try again.', 'sgs-blocks' ),
			'guest-prompt-text'     => __( 'Sign in to keep your saved items on every device and get price alerts.', 'sgs-blocks' ),
			'sign-in-label'         => __( 'Sign in', 'sgs-blocks' ),
			'alerts-price-label'    => __( 'Email me when a saved item drops in price', 'sgs-blocks' ),
			'alerts-stock-label'    => __( 'Email me when a saved item is back in stock', 'sgs-blocks' ),
			'share-label'           => __( 'Share my list', 'sgs-blocks' ),
			'share-copy-label'      => __( 'Copy link', 'sgs-blocks' ),
			'share-copied-text'     => __( 'Link copied', 'sgs-blocks' ),
			'share-new-link-label'  => __( 'Make a new link', 'sgs-blocks' ),
			'shared-heading'        => __( 'A saved list', 'sgs-blocks' ),
			'add-to-mine-label'     => __( 'Save to my list', 'sgs-blocks' ),
			'shared-gone-text'      => __( 'This saved list is no longer shared.', 'sgs-blocks' ),
			'privacy-link-label'    => __( 'Privacy policy', 'sgs-blocks' ),
		);

		$attr_map = array(
			'view-all-label'        => 'viewAllLabel',
			'sort-label'            => 'sortLabel',
			'sort-recent-label'     => 'sortRecentLabel',
			'sort-price-asc-label'  => 'sortPriceAscLabel',
			'sort-price-desc-label' => 'sortPriceDescLabel',
			'sort-stock-label'      => 'sortStockLabel',
			'date-saved-text'       => 'dateSavedText',
			'price-drop-text'       => 'priceDropText',
			'move-label'            => 'moveLabel',
			'remove-label'          => 'removeLabel',
			'notify-label'          => 'notifyLabel',
			'out-of-stock-label'    => 'outOfStockLabel',
			'notify-email-label'    => 'notifyEmailLabel',
			'notify-consent-text'   => 'notifyConsentText',
			'notify-success-text'   => 'notifySuccessText',
			'error-text'            => 'errorText',
			'guest-prompt-text'     => 'guestPromptText',
			'sign-in-label'         => 'signInLabel',
			'alerts-price-label'    => 'alertsPriceLabel',
			'alerts-stock-label'    => 'alertsStockLabel',
			'share-label'           => 'shareLabel',
			'share-copy-label'      => 'shareCopyLabel',
			'share-copied-text'     => 'shareCopiedText',
			'share-new-link-label'  => 'shareNewLinkLabel',
			'shared-heading'        => 'sharedHeading',
			'add-to-mine-label'     => 'addToMineLabel',
			'shared-gone-text'      => 'sharedGoneText',
			'privacy-link-label'    => 'privacyLinkLabel',
		);

		$data = array();
		foreach ( $attr_map as $data_key => $attr_key ) {
			$default           = $text_defaults[ $data_key ] ?? '';
			$data[ $data_key ] = sanitize_text_field( (string) ( $attributes[ $attr_key ] ?? $default ) );
		}
		return $data;
	}
}
