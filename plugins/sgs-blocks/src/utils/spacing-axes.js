/**
 * Whether a block offers the Vertical / Horizontal paired mode on a padding or margin attribute.
 *
 * `block.json::supports.sgs.spacingAxes` maps a box attribute to `true` to opt in. `SgsBoxControl` then cycles
 * linked, Vertical and Horizontal, each side (its `splitOnAxis` prop); an attribute not declared keeps the two
 * states, linked and each side. The mount passes `splitOnAxis={ spacingAxesFor( name, '<attr>' ) }`.
 */
import { getBlockType } from '@wordpress/blocks';

/**
 * @param {string} blockName The registered block name (`sgs/cta-section`).
 * @param {string} attr      The box attribute (`padding`).
 * @return {boolean} True only when the block declares `true` for the attribute.
 */
export function spacingAxesFor( blockName, attr ) {
	const declared = getBlockType( blockName )?.supports?.sgs?.spacingAxes;
	if ( ! declared || 'object' !== typeof declared || Array.isArray( declared ) ) {
		return false;
	}
	return true === declared[ attr ];
}
