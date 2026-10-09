/**
 * The spacing presets a block declares as the defaults of its untouched padding and margin sides.
 *
 * `block.json::supports.sgs.spacingDefaults` names, per attribute and side, the
 * `var(--wp--preset--spacing--<slug>)` the block's stylesheet paints when the side is unset. The preset is declared,
 * never stored: the attribute default stays empty, the stylesheet paints the preset as its last fallback, and
 * `SgsBoxControl` shows it through its `defaults` prop the way it shows a value inherited from a wider tier.
 */
import { getBlockType } from '@wordpress/blocks';

/**
 * @param {string} blockName The registered block name (`sgs/cart`).
 * @param {string} attr      The box attribute (`panelFooterPadding`).
 * @return {Object} `{ side: 'var(--wp--preset--spacing--<slug>)' }` for the declared sides; `{}` when none.
 */
export function spacingDefaultsFor( blockName, attr ) {
	const declared = getBlockType( blockName )?.supports?.sgs?.spacingDefaults?.[ attr ];
	if ( ! declared || 'object' !== typeof declared || Array.isArray( declared ) ) {
		return {};
	}
	return Object.fromEntries(
		Object.entries( declared ).filter( ( [ , value ] ) => 'string' === typeof value && '' !== value )
	);
}
