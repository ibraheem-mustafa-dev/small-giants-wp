/**
 * Delegated parts in the editor (Spec 38A §6.2): the twin of `includes/motion/class-sgs-motion-delegate.php`.
 *
 * A block whose source mode prints each result as another block (an `sgs/card-grid` with `source` `wc-product` or
 * `cpt-collection` prints one `sgs/product-card` per result) never prints its own parts in that mode. The block
 * declares the hand-off in `supports.sgs.motionDelegate` (`{ attribute, values, block, parts }`, `parts` mapping each
 * handed-over part to the child block's target); in a delegating mode only the wrapper parts and the mapped parts are
 * offered as motion targets, and the server moves the mapped parts' layers onto each child. A part left out that still
 * holds a stored layer stays offered, marked `notInMode`, so the client can find the layer and remove it.
 */

import { getBlockType } from '@wordpress/blocks';
import { targetsWithLayers } from './layers/use-motion-layers';

/**
 * The block's declared delegation, validated, or null.
 *
 * @param {Object|undefined} supportsSgs The block type's `supports.sgs`.
 * @return {{attribute:string,values:string[],block:string,parts:Object<string,string>}|null} The delegation.
 */
export function delegateConfig( supportsSgs ) {
	const raw = supportsSgs?.motionDelegate;
	if (
		! raw ||
		typeof raw !== 'object' ||
		typeof raw.attribute !== 'string' ||
		typeof raw.block !== 'string' ||
		! Array.isArray( raw.values ) ||
		! raw.parts ||
		typeof raw.parts !== 'object'
	) {
		return null;
	}
	const parts = {};
	Object.entries( raw.parts ).forEach( ( [ from, to ] ) => {
		if ( from !== '' && typeof to === 'string' && to !== '' ) {
			parts[ from ] = to;
		}
	} );
	return {
		attribute: raw.attribute,
		values: raw.values.filter( ( value ) => typeof value === 'string' ),
		block: raw.block,
		parts,
	};
}

/**
 * The delegation in force for these attributes, or null when the block's current mode prints its own parts.
 *
 * @param {Object|undefined} supportsSgs The block type's `supports.sgs`.
 * @param {Object|undefined} attributes  The block's attributes.
 * @return {{block:string,parts:Object<string,string>}|null} The child block and the part map.
 */
export function activeDelegation( supportsSgs, attributes ) {
	const config = delegateConfig( supportsSgs );
	if ( ! config ) {
		return null;
	}
	const value = attributes?.[ config.attribute ];
	return typeof value === 'string' && config.values.includes( value )
		? { block: config.block, parts: config.parts }
		: null;
}

/**
 * The targets that hold at least one stored layer in any panel.
 *
 * @param {Object|undefined} motion The block's motion value.
 * @return {string[]} The target keys.
 */
export function heldTargets( motion ) {
	return [
		...new Set(
			[ 'hover', 'entrance', 'effects' ].flatMap( ( panel ) =>
				targetsWithLayers( motion, panel )
			)
		),
	];
}

/**
 * The block's `supports.sgs.elements` with the parts its current source mode does not print left out: in a
 * delegating mode only the wrapper parts and the parts the delegation maps stay, plus any part that holds a stored
 * layer, marked `notInMode: true` (its layer does not reach the page in this mode, and the Target row says so). Outside
 * a delegating mode (or for a block that declares none) the elements come back unchanged.
 *
 * @param {Object|undefined} supportsSgs The block type's `supports.sgs`.
 * @param {Object|undefined} attributes  The block's attributes.
 * @param {string[]}         [held]      Targets that hold a stored layer (`heldTargets`).
 * @return {Object|undefined} The elements to offer.
 */
export function elementsForSourceMode( supportsSgs, attributes, held = [] ) {
	const elements = supportsSgs?.elements;
	const delegation = activeDelegation( supportsSgs, attributes );
	if ( ! delegation || ! elements || typeof elements !== 'object' ) {
		return elements;
	}
	return Object.fromEntries(
		Object.entries( elements ).flatMap( ( [ key, spec ] ) => {
			if (
				spec?.isWrapper === true ||
				Object.prototype.hasOwnProperty.call( delegation.parts, key )
			) {
				return [ [ key, spec ] ];
			}
			return held.includes( key )
				? [ [ key, { ...spec, notInMode: true } ] ]
				: [];
		} )
	);
}

/**
 * `elementsForSourceMode` for a registered block, by name: the Target row's call.
 *
 * @param {string}           blockName  Block name.
 * @param {Object|undefined} attributes The block's attributes.
 * @return {Object|undefined} The elements to offer.
 */
export function blockElementsForSourceMode( blockName, attributes ) {
	return elementsForSourceMode(
		getBlockType( blockName )?.supports?.sgs,
		attributes,
		heldTargets( attributes?.sgsMotion )
	);
}
