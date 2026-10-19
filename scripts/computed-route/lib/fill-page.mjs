// The page baseline for inherited properties (R-47-5). Calibration records no default for an inherited property
// (lib/calibrate-props.mjs::INHERITED) and the parent of a surface's top blocks is the page, which is not built when Fill
// runs. What the page shows comes from the client's theme snapshot: root typography and text colour, then the element
// styles that apply to the node's tag (heading and h1..h6 for a heading, link for a link, button), then the CSS initial
// value for what neither sets.
import { parseColour, toPx, round } from './normalise.mjs';

// The CSS initial values of the inherited properties a theme rarely sets.
export const INITIAL = { 'font-style': 'normal', 'text-align': 'start', 'text-wrap': 'wrap', 'text-shadow': 'none', 'text-transform': 'none', 'letter-spacing': 'normal' };

// A unitless line height (a ratio of the element's own font size) as px at that size; a px value as it is; unknown
// without a font size or a value.
export function lineHeightPx( lh, fontPx ) {
	if ( undefined === lh || null === lh ) {
		return undefined;
	}
	if ( /px$/.test( String( lh ) ) ) {
		return String( lh );
	}
	return fontPx ? `${ round( Number( lh ) * fontPx ) }px` : undefined;
}

const TAG_LAYERS = { a: [ 'link' ], button: [ 'button' ] };
const HEADING = /^h[1-6]$/;
const rgb = ( hex ) => {
	const c = parseColour( hex );
	return c ? ( c.a < 1 ? `rgba(${ c.r }, ${ c.g }, ${ c.b }, ${ round( c.a ) })` : `rgb(${ c.r }, ${ c.g }, ${ c.b })` ) : undefined;
};

// The layers of styles that apply to a tag, nearest last: the snapshot's root styles, the generic heading style and the
// tag's own element style. Each layer is { typography, color }.
function layersFor( styles, tag ) {
	const el = styles.elements || {};
	const names = HEADING.test( tag || '' ) ? [ 'heading', tag ] : ( TAG_LAYERS[ tag ] || [] );
	return { root: { typography: styles.typography || {}, color: styles.color || {} }, element: names.map( ( n ) => el[ n ] ).filter( Boolean ).map( ( l ) => ( { typography: l.typography || {}, color: l.color || {} } ) ) };
}

// raw: the parsed theme-snapshot.json; tag: the node's element tag (the heading level, the block's tag). Returns
// { value( prop, width, ownFontPx ), own( prop ) }: value is what the page shows for an inherited property on that tag
// (undefined when the snapshot cannot say), own( prop ) whether an element style (not the root) sets it, in which case it
// beats whatever a parent block shows.
export function pageBaseline( raw, tag ) {
	const settings = raw?.settings || {};
	const { root, element } = layersFor( raw?.styles || {}, tag );
	const preset = ( v, list, key ) => {
		const m = /^var:preset\|[a-z-]+\|(.+)$/.exec( String( v ) );
		return m ? ( settings[ list[ 0 ] ]?.[ list[ 1 ] ] || [] ).find( ( x ) => x.slug === m[ 1 ] )?.[ key ] : v;
	};
	const FIELD = { 'font-family': [ 'typography', 'fontFamily' ], 'font-size': [ 'typography', 'fontSize' ], 'font-weight': [ 'typography', 'fontWeight' ], 'line-height': [ 'typography', 'lineHeight' ], 'text-transform': [ 'typography', 'textTransform' ], 'letter-spacing': [ 'typography', 'letterSpacing' ], 'font-style': [ 'typography', 'fontStyle' ], color: [ 'color', 'text' ] };
	const layerValue = ( layers, prop ) => {
		const [ group, field ] = FIELD[ prop ] || [];
		return layers.map( ( l ) => l[ group ]?.[ field ] ).filter( ( v ) => undefined !== v ).at( -1 );
	};
	const resolveRaw = ( prop, v ) => {
		if ( undefined === v ) {
			return undefined;
		}
		switch ( prop ) {
			case 'font-family':
				return preset( v, [ 'typography', 'fontFamilies' ], 'fontFamily' );
			case 'font-size': {
				const s = preset( v, [ 'typography', 'fontSizes' ], 'size' );
				const px = toPx( s );
				return null === px || undefined === px ? undefined : `${ round( px ) }px`;
			}
			case 'color': {
				const c = preset( v, [ 'color', 'palette' ], 'color' );
				return c ? rgb( c ) : undefined;
			}
			default:
				return String( v );
		}
	};
	return {
		own: ( prop ) => undefined !== layerValue( element, prop ),
		value( prop, width, ownFontPx ) {
			const v = layerValue( [ root, ...element ], prop );
			if ( 'line-height' === prop ) {
				return lineHeightPx( v, ownFontPx );
			}
			const r = resolveRaw( prop, v );
			if ( 'letter-spacing' === prop && /em$/.test( String( r ) ) ) {
				return ownFontPx ? `${ round( parseFloat( r ) * ownFontPx ) }px` : r;
			}
			return undefined === r ? INITIAL[ prop ] : r;
		},
	};
}
