// What calibration reads and how a setting's css_property maps onto it (FR-47-2).
import { DEFAULT_PROPS, HOVER_PROPS, PSEUDO_PROPS } from '../../parity/lib/collect.mjs';
import { REF_PROPS } from '../../parity/lib/ref-trace.mjs';

export const WIDTHS = [ 375, 768, 1440 ];
export const MARKER_HEX = '#13579b';
export const MARKER_RGB = 'rgb(19, 87, 155)';
export const MARKER_GRADIENT = 'linear-gradient(90deg, #13579b 0%, #9b1357 100%)';
// A resting gradient that differs from MARKER_GRADIENT, for a hover gradient to be compared with.
export const MARKER_REST_GRADIENT = 'linear-gradient(90deg, #9b1357 0%, #13579b 100%)';
export const CAL_PREFIX = 'cr-ref-cal-';

// Properties calibration reads beyond the walker's own: a setting painting one of them is still located (its slot
// and default paint are recorded) even before the walker compares that property.
export const CAL_EXTRA_PROPS = [ 'height', 'min-width', 'max-height', 'stroke', 'fill', 'grid-template-rows', 'grid-auto-columns', 'column-count', 'flex-basis', 'writing-mode', 'background-attachment', 'background-size', 'background-position', 'border-image-source', 'object-position', 'text-indent', 'border-bottom-style', 'border-left-style', 'border-right-style', 'text-decoration-style', 'animation-delay', 'mix-blend-mode' ];

export const READ_PROPS = [ ...new Set( [ ...DEFAULT_PROPS.filter( ( p ) => ! /^icon-/.test( p ) ), ...REF_PROPS, ...HOVER_PROPS, ...CAL_EXTRA_PROPS ] ) ];

// Properties read on ::before / ::after layers: the walker's own list, so both sides read a layer alike.
export { PSEUDO_PROPS };
// Properties read on ::placeholder and ::first-letter.
export const TEXT_PSEUDO_PROPS = [ 'color', 'font-size', 'font-family', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'opacity', 'float' ];

// Inherited properties are never default paint (R-47-5 compares them with the parent's live value instead).
export const INHERITED = [ 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-wrap', 'text-shadow' ];

const SIDES = [ 'top', 'right', 'bottom', 'left' ];

// A css_property that names a paint the browser computes under another property: a text gradient is a clipped
// background-image, a gradient border is a ring layer's background-image (or border-image), a shadow colour lives
// inside box-shadow.
const ALIASES = {
	'color-gradient': [ 'background-image' ],
	'background-color-gradient': [ 'background-image' ],
	'border-color-gradient': [ 'background-image', 'border-image-source' ],
	'box-shadow-color': [ 'box-shadow' ],
	'text-shadow-color': [ 'text-shadow' ],
	flex: [ 'flex-grow', 'flex-basis' ],
	inset: [ 'top', 'right', 'bottom', 'left' ],
};

// The longhand properties a setting's css_property covers, as calibration reads them.
export function longhands( cssProperty ) {
	return [ ...new Set( cssProperty.split( ',' ).map( ( s ) => s.trim() ).flatMap( ( p ) => {
		if ( ALIASES[ p ] ) {
			return ALIASES[ p ];
		}
		if ( /^(padding|margin)$/.test( p ) ) {
			return SIDES.map( ( s ) => `${ p }-${ s }` );
		}
		const m = p.match( /^border-(width|color|style)$/ );
		if ( m ) {
			return SIDES.map( ( s ) => `border-${ s }-${ m[ 1 ] }` );
		}
		if ( 'gap' === p ) {
			return [ 'row-gap', 'column-gap', 'gap' ];
		}
		if ( 'text-decoration' === p ) {
			return [ 'text-decoration-line' ];
		}
		return [ p ];
	} ) ) ].filter( ( p ) => READ_PROPS.includes( p ) );
}
