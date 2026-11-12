/**
 * ItemSlotPicture: the canvas picture for one item of an item set (Spec 49 §8.3, §9.7).
 *
 * The editor's twin of `includes/media/render-item-slot.php::sgs_media_item_slot_attrs` plus the renderer: an item is
 * `{source, alt, decorative, fit, focal, ...}`; its own fields are laid over the block's `{prefix}*` settings (Border,
 * Radius, Shape, Width, Height, Ratio, Padding, Shadow and the rest), and the picture is drawn by `SlotPicture`, which
 * prints the same CSS as the page through `mediaPreview()`. Every block with an item set calls this one component, so
 * a setting a shared panel offers for the slot shows in the canvas as it does on the page.
 *
 * Each picture carries its own scope class, `{uid}-i{index}`, so one item's rules never reach another's.
 *
 * @package
 */
import SlotPicture from './SlotPicture.js';
import { DEVICES } from './deviceValues.js';
import { mediaAttrName } from '../MediaElementControls.js';

const noop = () => {};

/**
 * Whether a stored value is a blank (unset, empty, or `inherit`).
 *
 * @param {*} value Stored value.
 * @return {boolean} True when blank.
 */
function blank( value ) {
	return undefined === value || null === value || '' === value || 'inherit' === value || ( Array.isArray( value ) && ! value.length );
}

/**
 * A responsive value resolved for every device, each inheriting from the next wider one (`sgs_media_device_values`).
 *
 * @param {*} raw Stored value: a `{desktop,tablet,mobile}` object or a plain (desktop) value.
 * @return {Object} Device to value (undefined where nothing is set at or above the device).
 */
function deviceValues( raw ) {
	const isTier = raw && 'object' === typeof raw && ! Array.isArray( raw ) && DEVICES.some( ( d ) => d in raw );
	const own = isTier ? raw : { desktop: raw };
	const out = {};
	let last;
	DEVICES.forEach( ( device ) => {
		if ( ! blank( own[ device ] ) ) {
			last = own[ device ];
		}
		out[ device ] = last;
	} );
	return out;
}

/**
 * The item's Fit per device, the item's own cascade winning over the block's (`sgs_media_item_fit`).
 *
 * @param {*} blockFit The block-level Fit.
 * @param {*} itemFit  The item's own `fit`.
 * @return {Object} Only the devices where the value changes from the wider one.
 */
export function itemFit( blockFit, itemFit ) {
	const item = deviceValues( itemFit );
	const block = deviceValues( blockFit );
	const out = {};
	let prev;
	DEVICES.forEach( ( device ) => {
		const value = item[ device ] ?? block[ device ];
		if ( undefined !== value && value !== prev ) {
			out[ device ] = value;
		}
		prev = value ?? prev;
	} );
	return out;
}

/**
 * The attributes the renderer reads for one item: the block's, with the item's source, alt, decorative flag, focal point
 * and fit laid over them (`sgs_media_item_slot_attrs`).
 *
 * @param {string} prefix     Slot prefix.
 * @param {Object} item       One item.
 * @param {Object} attributes Block attributes.
 * @return {Object} Attributes for `mediaPreview()` and `SlotPicture`.
 */
export function itemSlotAttrs( prefix, item, attributes ) {
	const name = ( base ) => mediaAttrName( prefix, base );
	const attrs = { ...attributes };
	attrs[ name( 'Source' ) ] = item?.source ?? null;
	attrs[ name( 'Alt' ) ] = 'string' === typeof item?.alt ? item.alt : '';
	attrs[ name( 'Decorative' ) ] = !! item?.decorative;
	if ( item?.focal ) {
		attrs[ name( 'Focal' ) ] = item.focal;
	}
	const fit = itemFit( attributes?.[ name( 'Fit' ) ], item?.fit );
	if ( Object.keys( fit ).length ) {
		attrs[ name( 'Fit' ) ] = fit;
	}
	[ 'Caption', 'LinkUrl', 'LinkUrlSource', 'LinkOpensNewTab', 'LinkRel' ].forEach( ( own ) => {
		delete attrs[ name( own ) ];
	} );
	return attrs;
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes  Block attributes (the slot's shared settings).
 * @param {Object}   props.item        The item: `{source, alt, decorative, fit, focal, ...}`.
 * @param {number}   props.index       The item's position, for its scope class.
 * @param {string}   props.prefix      The slot's prefix.
 * @param {string}   props.uid         The block's scope class base, unique to the block instance.
 * @param {string[]} [props.kinds]     The slot's kinds; default image.
 * @param {string}   [props.context]   The slot's context; default item.
 * @param {string}   [props.className] Extra class for the picture.
 * @return {JSX.Element|null} The picture, or null when the item has no file.
 */
export default function ItemSlotPicture( { attributes, item, index, prefix, uid, kinds = [ 'image' ], context = 'item', className = '' } ) {
	return (
		<SlotPicture
			attributes={ itemSlotAttrs( prefix, item, attributes ) }
			setAttributes={ noop }
			prefix={ prefix }
			kinds={ kinds }
			context={ context }
			uid={ `${ uid }-i${ index }` }
			className={ className }
			placeholder={ false }
		/>
	);
}
