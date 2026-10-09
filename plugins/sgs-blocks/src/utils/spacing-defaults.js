/**
 * The defaults a block declares for its untouched padding and margin sides.
 *
 * `block.json::supports.sgs.spacingDefaults` names, per attribute and side, what the block's stylesheet paints when
 * the side is unset: `var(--wp--preset--spacing--<slug>)` when that value equals a theme spacing preset's size
 * exactly, otherwise the literal length (`20px`). The default is declared, never stored: the attribute default stays
 * empty, the stylesheet paints the same value, and `SgsBoxControl` shows it through its `defaults` prop the way it
 * shows a value inherited from a wider tier ("Default (M)", "Default (20px)").
 */
import { getBlockType } from '@wordpress/blocks';

/**
 * @param {string} blockName The registered block name (`sgs/cart`).
 * @param {string} attr      The box attribute (`panelFooterPadding`).
 * @return {Object} `{ side: value }` (a preset var() or a length) for the declared sides; `{}` when none.
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
