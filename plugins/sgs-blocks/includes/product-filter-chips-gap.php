<?php
/**
 * WooCommerce attribute filter chips: "Gap between chips" (the `sgsChipGap` attribute).
 *
 * `woocommerce/product-filter-chips` has no setting for the space between its
 * chips. WooCommerce paints it with `:where(.wc-block-product-filter-chips__items){gap:4px}`
 * (zero specificity), and the parent block's own gap only spaces the heading from the
 * list. This extension adds one per-device length, `sgsChipGap` ({desktop,tablet,mobile},
 * a blank tier inherits the tier above), to that block only.
 *
 * The frontend rule is a scoped `<style>` tag, never a style="" attribute (Spec 32):
 * `.sgs-chip-gap.<scope> .wc-block-product-filter-chips__items{gap:…}`. The scope class is the
 * block's own uid class when it has one, otherwise a freshly minted `sgs-chip-gap-<8hex>`.
 * An unset value (the default) emits nothing, so WooCommerce's and the theme's spacing stay.
 *
 * The attribute reaches the editor's server-side schema through
 * extension-attrs-rest-register.php (generated from the extension JS), the same path every
 * other `sgs*` extension attribute takes.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/product-filter-look.php';

const SGS_CHIP_GAP_BLOCK_NAME = 'woocommerce/product-filter-chips';

add_filter( 'render_block', __NAMESPACE__ . '\sgs_inject_chip_gap', 10, 2 );

/**
 * The scoped CSS for a chip gap value.
 *
 * @param mixed  $value Stored `sgsChipGap` value ({desktop,tablet,mobile}).
 * @param string $scope Scope class name, no leading dot.
 * @return string CSS text without a <style> wrapper; '' when no tier holds a safe length.
 */
function sgs_chip_gap_css( $value, string $scope ): string {
	if ( ! is_array( $value ) || '' === $scope ) {
		return '';
	}
	require_once __DIR__ . '/render-helpers.php';

	$tiers = array();
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$raw            = $value[ $tier ] ?? null;
		$safe           = is_scalar( $raw ) ? sgs_css_single_length_value( (string) $raw ) : '';
		$tiers[ $tier ] = '' === $safe ? null : $safe;
	}
	if ( null === $tiers['desktop'] && null === $tiers['tablet'] && null === $tiers['mobile'] ) {
		return '';
	}

	// Two classes (marker + scope) plus the list class outrank any single-class theme rule.
	return sgs_emit_responsive_css(
		'.sgs-chip-gap.' . $scope . ' .wc-block-product-filter-chips__items',
		array(
			array(
				'value' => $tiers,
				'css'   => 'gap',
			),
		)
	);
}

/**
 * Render-block filter: add the scope classes and the scoped gap rule.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_inject_chip_gap( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	if ( SGS_CHIP_GAP_BLOCK_NAME !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$value = $block['attrs']['sgsChipGap'] ?? null;
	if ( ! is_array( $value ) ) {
		return $block_content;
	}

	return sgs_inject_scoped_block_css(
		$block_content,
		'sgs-chip-gap',
		static fn( string $scope ): string => sgs_chip_gap_css( $value, $scope )
	);
}
