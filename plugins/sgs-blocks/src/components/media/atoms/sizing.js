/**
 * `sizing` atom: Ratio, Width, Height and the four limits (Spec 49 §7.2), logic half. PHP twin:
 * `includes/media/atoms/sizing.php`.
 *
 * Each setting prints its own property; the browser combines them. The width default is resolved per device from the
 * resolved values, a helper keeps the file's own ratio when it has a Height and no Ratio, and a narrower device cancels an
 * inherited value with a keyword. Width and the width limits paint the layout box; Ratio, Height and the height limits
 * paint the surface.
 *
 * @package SGS\Blocks
 */

import { DEVICES, add, nodes, resolved, rulesCss } from '../emit/core.js';
import { mediaLength, mediaRatio } from '../emit/values.js';

const CANCEL = {
	'aspect-ratio': 'auto',
	height: 'auto',
	width: 'auto',
	'min-width': '0',
	'max-width': 'none',
	'min-height': '0',
	'max-height': 'none',
};
const LAYOUT_PROPS = [ 'width', 'min-width', 'max-width' ];

const text = ( v ) => ( 'string' === typeof v ? v.trim() : '' );
const limit = ( raw ) => ( 'none' === raw || '' === mediaLength( raw ) ? null : mediaLength( raw ) );

/**
 * The checked sizing values in force at a device; null for a base that is unset, `auto` or `natural`.
 *
 * @param {Object} attrs  Attributes.
 * @param {Object} slot   Slot.
 * @param {string} device Device.
 * @return {Object} By base.
 */
function resolveSizing( attrs, slot, device ) {
	const get = ( base ) => text( resolved( attrs, slot, base, device ) );
	const ratio = get( 'Ratio' );
	const height = get( 'Height' );
	const width = mediaLength( get( 'Width' ), [ 'auto' ] );
	let heightValue = limit( height );
	if ( 'fill' === height ) {
		heightValue = 'fill';
	} else if ( 'auto' === height ) {
		heightValue = null;
	}
	return {
		Ratio: 'natural' === ratio || '' === mediaRatio( ratio ) ? null : mediaRatio( ratio ),
		Height: heightValue,
		Width: '' !== width ? width : null,
		MinWidth: limit( get( 'MinWidth' ) ),
		MaxWidth: limit( get( 'MaxWidth' ) ),
		MinHeight: limit( get( 'MinHeight' ) ),
		MaxHeight: limit( get( 'MaxHeight' ) ),
	};
}

function fileRatio( attrs, slot, device ) {
	const source = resolved( attrs, slot, 'Source', device );
	const w = source && 'object' === typeof source ? parseInt( source.width, 10 ) || 0 : 0;
	const h = source && 'object' === typeof source ? parseInt( source.height, 10 ) || 0 : 0;
	return w > 0 && h > 0 ? `${ w } / ${ h }` : '';
}

/**
 * C3 emitter: the sizing rules of one slot.
 *
 * @param {Object}  slot   Slot `{ prefix, kinds, context, wrapper }`.
 * @param {Object}  attrs  Attributes.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @return {string} CSS, '' when nothing is set.
 */
export function emit( slot, attrs, uid, helper ) {
	const n = nodes( slot, uid, helper );
	const rules = {};
	let prev = {};
	for ( const device of DEVICES ) {
		const r = resolveSizing( attrs, slot, device );
		const fill = 'fill' === r.Height;
		const height = fill ? null : r.Height;
		const ratio = fill ? null : r.Ratio;
		const any = Object.values( r ).some( ( v ) => null !== v );
		let width;
		if ( null !== r.Width ) {
			width = r.Width;
		} else if ( ! any ) {
			width = helper ? 'fit-content' : null;
		} else if ( null !== ratio && null !== height ) {
			width = 'auto';
		} else {
			width = '100%';
		}
		const cur = {
			'aspect-ratio': ratio,
			height: fill ? '__fill' : height,
			width,
			'min-width': r.MinWidth,
			'max-width': r.MaxWidth,
			'min-height': r.MinHeight,
			'max-height': r.MaxHeight,
		};
		if ( helper && null === ratio && null !== height && 'auto' === width ) {
			const file = fileRatio( attrs, slot, device );
			if ( '' !== file ) {
				cur[ 'aspect-ratio' ] = file;
			}
		}
		for ( const [ prop, cancel ] of Object.entries( CANCEL ) ) {
			const was = prev[ prop ] ?? null;
			const now = cur[ prop ];
			if ( now === was || '__fill' === now ) {
				continue;
			}
			const node = LAYOUT_PROPS.includes( prop ) ? n.layout : n.surface;
			if ( null === now ) {
				if ( null === was || ( 'width' === prop && 'auto' === was ) || '__fill' === was ) {
					continue;
				}
				add( rules, node, device, prop, cancel );
			} else {
				add( rules, node, device, prop, now );
			}
		}
		prev = cur;
	}
	return rulesCss( rules );
}

/**
 * @param {*} value Candidate Ratio.
 * @return {string} A checked ratio, or ''.
 */
export function validate( value ) {
	return mediaRatio( value );
}

/**
 * C4 rule: Ratio is omitted while Height is Match its space; everything else is shown.
 *
 * @param {Object} attrs  Attributes.
 * @param {string} device Device the editor is showing.
 * @param {string} prefix Slot prefix.
 * @return {Object} By base: `{ state, hiddenReason }`.
 */
export function disclosure( attrs = {}, device = 'desktop', prefix = '' ) {
	const slot = { prefix };
	const fill = 'fill' === resolved( attrs, slot, 'Height', device );
	const shown = { state: 'shown', hiddenReason: null };
	const out = {};
	[ 'Width', 'Height', 'MinWidth', 'MaxWidth', 'MinHeight', 'MaxHeight' ].forEach( ( base ) => {
		out[ base ] = shown;
	} );
	out.Ratio = fill
		? { state: 'omitted', hiddenReason: 'A ratio does not apply while the height matches its space.' }
		: shown;
	return out;
}
