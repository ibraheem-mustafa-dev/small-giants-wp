/**
 * `shape` atom: Shape, Corners and Border (Spec 49 §7.5), logic half. PHP twin: `includes/media/atoms/shape.php`.
 *
 * Circle, ellipse and pill are `border-radius` on the surface and keep ordinary borders. Every other shape in
 * `includes/data/icon-shapes.json` is a mask on `.sgs-media-box__mask`; while a device has one, Corners is not printed
 * there, and a slot that has a mask at any device prints no border.
 *
 * @package SGS\Blocks
 */

import { MEDIA_SHAPES } from '../../../utils/icon-shapes.js';
import { DEVICES, add, nodes, own, resolved, rulesCss, scalar } from '../emit/core.js';
import { RADIUS_OF, maskShapes, registerMaskShapes, shapeAt, shapeHasMask } from '../emit/mask.js';
import { maskCss } from '../emit/mask-css.js';
import { isNumeric, mediaColour, mediaGradient, mediaPx } from '../emit/values.js';

const CORNERS = {
	topLeft: 'border-top-left-radius',
	topRight: 'border-top-right-radius',
	bottomRight: 'border-bottom-right-radius',
	bottomLeft: 'border-bottom-left-radius',
};
const BORDER_STYLES = [ 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' ];

registerMaskShapes( MEDIA_SHAPES.filter( ( entry ) => 'mask' === entry.paint ) );

export { shapeAt, shapeHasMask };

function addBorder( rules, hover, attrs, slot, selector ) {
	const widths = scalar( attrs, slot, 'BorderWidth' );
	let set = false;
	if ( widths && 'object' === typeof widths ) {
		for ( const side of [ 'top', 'right', 'bottom', 'left' ] ) {
			const value = mediaPx( widths[ side ], 40 );
			if ( '' !== value ) {
				add( rules, selector, 'desktop', `border-${ side }-width`, value );
				set = set || 0 !== parseFloat( value );
			}
		}
	}
	if ( ! set ) {
		return;
	}
	const style = scalar( attrs, slot, 'BorderStyle' );
	add( rules, selector, 'desktop', 'border-style', BORDER_STYLES.includes( style ) ? style : 'solid' );
	const background = mediaColour( scalar( attrs, slot, 'Background' ) );
	const gradient = mediaGradient( scalar( attrs, slot, 'BorderColourGradient' ) );
	const gradientHover = mediaGradient( scalar( attrs, slot, 'BorderColourHoverGradient' ) );
	const colour = mediaColour( scalar( attrs, slot, 'BorderColour' ) );
	const colourHover = mediaColour( scalar( attrs, slot, 'BorderColourHover' ) );
	// A gradient cannot be a border colour: it paints as the surface's background across the border box, the
	// Background colour (if any) painted over it in the padding box, so corners and a circle or pill follow
	// `border-radius`. The border itself is transparent.
	const layers = ( paint ) => ( '' !== background ? `linear-gradient(${ background },${ background }),${ paint }` : paint );
	if ( '' !== gradient || '' !== gradientHover ) {
		add( rules, selector, 'desktop', 'background-origin', 'border-box' );
		add( rules, selector, 'desktop', 'background-clip', '' !== background ? 'padding-box,border-box' : 'border-box' );
	}
	if ( '' !== gradient ) {
		add( rules, selector, 'desktop', 'border-color', 'transparent' );
		add( rules, selector, 'desktop', 'background-image', layers( gradient ) );
	} else if ( '' !== colour ) {
		add( rules, selector, 'desktop', 'border-color', colour );
	}
	let decls = null;
	if ( '' !== gradientHover ) {
		decls = { 'background-image': layers( gradientHover ), 'border-color': 'transparent' };
	} else if ( '' !== colourHover ) {
		decls = { 'border-color': colourHover };
		if ( '' !== gradient ) {
			decls[ 'background-image' ] = '' !== background ? layers( 'linear-gradient(transparent,transparent)' ) : 'none';
		}
	}
	if ( decls ) {
		hover.push( [ `${ selector }:hover`, selector, decls ] );
	}
}

/**
 * C3 emitter: radius shapes and corners on the surface, the mask on the mask layer, the border on the surface.
 *
 * @param {Object}  slot   Slot.
 * @param {Object}  attrs  Attributes.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @return {string} CSS.
 */
export function emit( slot, attrs, uid, helper ) {
	const hasMask = shapeHasMask( attrs, slot );
	const n = nodes( slot, uid, helper, hasMask );
	const rules = {};
	const hover = [];
	let prev = '';
	let prevRadius = '';
	for ( const device of DEVICES ) {
		const shape = shapeAt( attrs, slot, device );
		const now = 'mask' === shape.kind ? `mask:${ shape.slug }:${ shape.proportions }` : 'none';
		if ( now !== prev && ( 'none' !== now || '' !== prev ) ) {
			for ( const [ prop, value ] of Object.entries( maskCss( shape ) ) ) {
				add( rules, n.mask, device, prop, value );
			}
		}
		prev = now;
		const radius = 'radius' === shape.kind ? RADIUS_OF[ shape.slug ] : '';
		if ( '' !== radius ) {
			if ( radius !== prevRadius ) {
				add( rules, n.surface, device, 'border-radius', radius );
			}
		} else if ( 'none' === shape.kind ) {
			const corners = own( attrs, slot, 'Radius', device );
			const isBox = corners && 'object' === typeof corners && ! Array.isArray( corners );
			if ( isBox || '' !== prevRadius ) {
				for ( const [ corner, prop ] of Object.entries( CORNERS ) ) {
					const value = isBox ? mediaPx( corners[ corner ] ) : '';
					if ( '' !== value ) {
						add( rules, n.surface, device, prop, value );
					} else if ( '' !== prevRadius ) {
						add( rules, n.surface, device, prop, '0' );
					}
				}
			}
		} else if ( '' !== prevRadius ) {
			add( rules, n.surface, device, 'border-radius', '0' );
		}
		prevRadius = radius;
	}
	if ( ! hasMask ) {
		addBorder( rules, hover, attrs, slot, n.surface );
	}
	return rulesCss( rules, hover );
}

/**
 * The atom contract's custom-property declarations: none, this atom prints real properties through emit().
 *
 * @return {string[]} Always empty.
 */
export function css() {
	return [];
}

/**
 * @param {*} value Candidate Shape value.
 * @return {string} The shape slug when it is a circle, ellipse, pill or a registry mask shape; `none` otherwise.
 */
export function validate( value ) {
	const slug = value && 'object' === typeof value ? value.shape : value;
	return RADIUS_OF[ slug ] || maskShapes()[ slug ] ? slug : 'none';
}

/**
 * C4 rule: Corners are omitted with a mask, circle, ellipse or pill; border settings are omitted with a mask, and style
 * and colour wait for a width.
 *
 * @param {Object} attrs  Attributes.
 * @param {string} device Device.
 * @param {string} prefix Slot prefix.
 * @return {Object} By base: `{ state, hiddenReason }`.
 */
export function disclosure( attrs = {}, device = 'desktop', prefix = '' ) {
	const slot = { prefix };
	const shape = shapeAt( attrs, slot, device );
	const mask = 'mask' === shape.kind;
	const shown = { state: 'shown', hiddenReason: null };
	const omitBorder = {
		state: 'omitted',
		hiddenReason: 'Borders are not available on this shape. Choose Circle, Ellipse or Pill to keep a border.',
	};
	const widths = scalar( attrs, slot, 'BorderWidth' );
	const hasWidth =
		widths && 'object' === typeof widths && Object.values( widths ).some( ( w ) => isNumeric( w ) && Number( w ) > 0 );
	const wait = { state: 'disabled', hiddenReason: 'Set a border width first.' };
	const after = hasWidth ? shown : wait;
	return {
		Shape: shown,
		Radius: 'none' === shape.kind ? shown : { state: 'omitted', hiddenReason: 'Corners follow the shape.' },
		BorderWidth: mask ? omitBorder : shown,
		BorderStyle: mask ? omitBorder : after,
		BorderColour: mask ? omitBorder : after,
	};
}
