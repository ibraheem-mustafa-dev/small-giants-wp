/**
 * The shape in force at a device and whether a slot has a mask. The mask shapes come from `includes/data/icon-shapes.json`,
 * which `src/components/media/atoms/shape.js` registers here when it loads (`registerMaskShapes`); `emitters.js` imports
 * that module, so every collector that goes through it sees them. PHP twin: `sgs_media_atom_shape_at()` and
 * `sgs_media_shape_has_mask()` in `includes/media/atoms/shape.php`.
 *
 * @package SGS\Blocks
 */

import { DEVICES, resolved } from './core.js';

/** The shapes drawn as `border-radius`, with the radius each prints. */
export const RADIUS_OF = { circle: '50%', ellipse: '50%', pill: '9999px' };

const NO_SHAPE = Object.freeze( { kind: 'none', slug: '', proportions: 'stretch' } );

let masks = {};

/**
 * Register the mask shapes: every entry of the shape registry that is not a box shape.
 *
 * @param {Array<{slug:string,d:string}>} list Registry entries.
 */
export function registerMaskShapes( list ) {
	masks = Object.fromEntries( list.map( ( s ) => [ s.slug, { d: s.d, proportions: 'stretch' } ] ) );
}

/**
 * @return {Object} The registered mask shapes by slug.
 */
export function maskShapes() {
	return masks;
}

/**
 * The shape in force at a device.
 *
 * @param {Object} attrs  Attributes.
 * @param {Object} slot   Slot.
 * @param {string} device Device.
 * @return {{kind:string,slug:string,proportions:string}} `kind` is `none`, `radius` or `mask`.
 */
export function shapeAt( attrs, slot, device ) {
	const raw = resolved( attrs, slot, 'Shape', device );
	let slug = '';
	let props = '';
	if ( raw && 'object' === typeof raw ) {
		slug = 'string' === typeof raw.shape ? raw.shape : '';
		props = 'string' === typeof raw.proportions ? raw.proportions : '';
	} else if ( 'string' === typeof raw ) {
		slug = raw;
	}
	if ( RADIUS_OF[ slug ] ) {
		return { kind: 'radius', slug, proportions: 'stretch' };
	}
	const entry = masks[ slug ];
	if ( entry ) {
		return { kind: 'mask', slug, proportions: 'keep' === props || 'stretch' === props ? props : entry.proportions };
	}
	return NO_SHAPE;
}

/**
 * @param {Object} attrs Attributes.
 * @param {Object} slot  Slot.
 * @return {boolean} Whether any device has a mask shape (so the mask layer is printed).
 */
export function shapeHasMask( attrs, slot ) {
	return DEVICES.some( ( device ) => 'mask' === shapeAt( attrs, slot, device ).kind );
}
