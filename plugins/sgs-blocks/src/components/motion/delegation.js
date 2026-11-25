/**
 * A block's source-mode delegation (Spec 38A §6.2), read from `supports.sgs.motionDelegate`: in a delegating mode the block prints each result as another block, so none of its own parts is drawn but its wrappers. The motion Target row and the element switcher (`components/element-switcher/`) both ask it which parts a block draws now.
 *
 * @package
 */

/**
 * The block's declared delegation, validated, or null.
 *
 * @param {Object|undefined} supportsSgs The block type's `supports.sgs`.
 * @return {{attribute:string,values:string[],block:string}|null} The delegation.
 */
export function delegateConfig( supportsSgs ) {
	const raw = supportsSgs?.motionDelegate;
	if (
		! raw ||
		typeof raw !== 'object' ||
		typeof raw.attribute !== 'string' ||
		typeof raw.block !== 'string' ||
		! Array.isArray( raw.values )
	) {
		return null;
	}
	return {
		attribute: raw.attribute,
		values: raw.values.filter( ( value ) => typeof value === 'string' ),
		block: raw.block,
	};
}

/**
 * The delegation in force for these attributes, or null when the block's current mode prints its own parts.
 *
 * @param {Object|undefined} supportsSgs The block type's `supports.sgs`.
 * @param {Object|undefined} attributes  The block's attributes.
 * @return {{block:string}|null} The child block.
 */
export function activeDelegation( supportsSgs, attributes ) {
	const config = delegateConfig( supportsSgs );
	if ( ! config ) {
		return null;
	}
	const value = attributes?.[ config.attribute ];
	return typeof value === 'string' && config.values.includes( value )
		? { block: config.block }
		: null;
}
