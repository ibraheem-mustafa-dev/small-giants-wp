<?php
/**
 * Cart and Checkout look: the text styles (step titles, field labels, line-item name, price, brand, variant text and remove link, delivery card title and description, summary heading, summary rows, total label and value, terms).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';

/**
 * The text-style rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when no text setting is set.
 */
function sgs_commerce_look_typography_css( array $attrs, string $block, string $root ): string {
	$styles = array(
		'sgsStepTitle'       => array( 'step_title' ),
		'sgsFieldLabel'      => array( 'field_label', 'field_label_active' ),
		'sgsItemName'        => array( 'item_name' ),
		'sgsItemPrice'       => array( 'item_price' ),
		'sgsItemVariant'     => array( 'item_variant' ),
		'sgsItemRemove'      => array( 'item_remove' ),
		'sgsItemBrand'       => array( 'item_brand' ),
		'sgsDeliveryTitle'   => array( 'delivery_title' ),
		'sgsDeliveryDescription' => array( 'delivery_description' ),
		'sgsSummaryHeading'  => array( 'summary_heading' ),
		'sgsSummaryRowLabel' => array( 'summary_row_label' ),
		'sgsSummaryRowValue' => array( 'summary_row_value' ),
		'sgsTotalLabel'      => array( 'total_label' ),
		'sgsTotalValue'      => array( 'total_value' ),
		'sgsTerms'           => array( 'terms' ),
		'sgsButton'          => array( 'button_primary' ),
	);
	$css    = '';
	foreach ( $styles as $prefix => $rows ) {
		$list = array();
		foreach ( $rows as $row ) {
			$one = sgs_commerce_look_selector( $row, $block, $root );
			if ( '' !== $one ) {
				$list[] = $one;
			}
		}
		$css .= sgs_commerce_look_text_css( $attrs, $prefix, implode( ',', $list ) );
	}
	return $css;
}
