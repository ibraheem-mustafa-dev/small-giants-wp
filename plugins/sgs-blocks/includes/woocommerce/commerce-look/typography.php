<?php
/**
 * Cart and Checkout look: the text styles (step titles, line-item name and price, summary heading, total row, terms).
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
		'sgsStepTitle'      => 'step_title',
		'sgsItemName'       => 'item_name',
		'sgsItemPrice'      => 'item_price',
		'sgsSummaryHeading' => 'summary_heading',
		'sgsTotalRow'       => 'total_row',
		'sgsTerms'          => 'terms',
	);
	$css    = '';
	foreach ( $styles as $prefix => $row ) {
		$css .= sgs_commerce_look_text_css( $attrs, $prefix, sgs_commerce_look_selector( $row, $block, $root ) );
	}
	return $css;
}
