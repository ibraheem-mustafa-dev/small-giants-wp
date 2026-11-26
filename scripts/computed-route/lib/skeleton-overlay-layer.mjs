// A bare layer that covers its host block's whole box is the host's own overlay (Spec 48 section 3.4, paint conservation;
// Bean, 2026-11-21: a draft layer's look is absorbed by its parent when the parent has an equivalent setting, otherwise it
// stays a block of its own). The skeleton rule `decorationLayer` makes a bare layer that paints only a fill or a gradient a
// decorative image; where the host block (the block whose own draft element holds the layer) has an overlay setting, the
// layer is instead that overlay's draft element, read by Fill at the overlay's calibrated slot. Several such layers stack into
// the one setting in the draft's drawing order: the layer drawn last is on top, so it comes first in the value.
//
// A layer is the host's overlay only when all of these hold (anything else stays a decorative image, as before):
//   - it is a direct child of the host's own draft element, positioned absolutely, and has the host's box (to a pixel) at
//     every width the host is drawn at, and is drawn at each of them;
//   - its declared style holds only what an overlay holds (`rules.overlayLayer.layerProps`: its place, its size, its
//     background, an opacity of 1, a z-index of auto or 0, a blend mode); a radius, a transform, an animation, a filter or a
//     mask is something the overlay cannot express;
//   - it paints a gradient at every width it is drawn at (stacked into the overlay's gradient setting), or one flat colour (the
//     overlay's colour setting); a mix of the two, or more than one flat layer, is no one setting's value;
//   - it sits above the host's background and below its content in the drawing order: every earlier sibling is the host's
//     background (a wordless box covering the host), another such layer or draws nothing (content, or a decoration that stays
//     a block and so would be drawn above the overlay, keeps it a block), and no later sibling is a wordless box covering the
//     host (a picture drawn over it);
//   - the host block's calibration paints the layer's property (`background-image` for a gradient, `background-color` for a
//     flat colour) in its resting state at a slot the decisions name as covering the host (`rules.overlayLayer.coverSlots`),
//     through a setting whose framework-database role is the layer's (`roles`: colour-gradient, color).
// Pure functions over the inventory model, the declared styles, the calibration's slot map and a role lookup: no browser, no
// site; the database is read only through `roleOf`.

import { paintedProps } from './css-families.mjs';

const ws = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const ZERO = /^(?:0|0px|0%|-0px)$/;
const off = ( v ) => [ '', 'auto', '0', 'none', 'normal', 'initial', 'unset' ].includes( ws( v ).toLowerCase() );

// What a layer paints at one width from its resolved values: 'gradient' (one or more gradient functions, no picture),
// 'colour' (no image, a colour that is not transparent) or null.
export function paintAt( resolved = {} ) {
	const img = ws( resolved[ 'background-image' ] );
	if ( img && 'none' !== img ) {
		return /url\(/i.test( img ) || ! /gradient\(/i.test( img ) ? null : 'gradient';
	}
	const col = ws( resolved[ 'background-color' ] ).replace( /\s+/g, '' );
	return col && ! /^(?:transparent|rgba\(\d+,\d+,\d+,0\))$/i.test( col ) ? 'colour' : null;
}

// The reason a layer cannot be its host's overlay on its own account (its look, place and declared style), or null.
// layer, host: inventory elements; st: the layer's declared style; m: the inventory model; layerProps: the declared
// properties an overlay holds.
export function layerRefusal( { layer, host, st = {}, m, layerProps = [] } ) {
	if ( layer.parentKey !== host.key ) {
		return 'not a direct child of the host element';
	}
	const widths = m.shownAt( host );
	if ( ! widths.length || widths.some( ( w ) => ! layer.visible?.[ w ] ) ) {
		return 'not drawn at every width its host is';
	}
	if ( widths.some( ( w ) => 'absolute' !== ( layer.position?.[ w ] ?? st.position ) ) ) {
		return 'not placed absolutely at every width';
	}
	const differs = widths.find( ( w ) => {
		const a = layer.box?.[ w ];
		const b = host.box?.[ w ];
		return ! a || ! b || [ 'x', 'y', 'w', 'h' ].some( ( k ) => Math.abs( ( a[ k ] ?? 0 ) - ( b[ k ] ?? 0 ) ) > 1 );
	} );
	if ( undefined !== differs ) {
		return `its box differs from its host's at ${ differs }px`;
	}
	const extra = Object.keys( st ).filter( ( p ) => ! layerProps.includes( p ) );
	if ( extra.length ) {
		return `it declares ${ extra.join( ', ' ) }, which the overlay cannot express`;
	}
	if ( undefined !== st.opacity && 1 !== Number( st.opacity ) ) {
		return `its opacity ${ st.opacity } is not the overlay's to hold`;
	}
	if ( undefined !== st[ 'z-index' ] && ! off( st[ 'z-index' ] ) ) {
		return `its z-index ${ st[ 'z-index' ] } places it apart from its siblings`;
	}
	const radius = widths.find( ( w ) => [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].some( ( c ) => ! ZERO.test( ws( layer.resolved?.[ w ]?.[ `border-${ c }-radius` ] ?? '0px' ) ) ) );
	if ( undefined !== radius ) {
		return `it has a radius at ${ radius }px`;
	}
	const paints = widths.map( ( w ) => paintAt( layer.resolved?.[ w ] ) );
	if ( paints.some( ( p ) => ! p ) || new Set( paints ).size > 1 ) {
		return 'it paints no single fill or gradient at every width';
	}
	return null;
}

// Whether an element covers the host's box at every width the host is drawn at, holding no words.
const coversWordless = ( m, k, host ) => ! ws( k.allText ?? k.words ) && m.shownAt( host ).every( ( w ) => {
	const a = k.box?.[ w ];
	const b = host.box?.[ w ];
	return k.visible?.[ w ] && a && b && a.w >= b.w - 1 && a.h >= b.h - 1;
} );

// Whether an element draws a box (some width and height) at a width it is shown at.
const drawsBox = ( m, k ) => [ 375, 768, 1440 ].some( ( w ) => k.visible?.[ w ] && ( k.box?.[ w ]?.w ?? 0 ) > 0 && ( k.box?.[ w ]?.h ?? 0 ) > 0 );

// The host's overlay setting for a kind of layer from its calibration: { slot, setting, property } or null. `settings` is
// the block's calibrated slot map, `roleOf( attr )` the setting's framework-database role, `coverSlots` the slots that cover
// their block, `roles` { gradient, colour } the role a setting of each kind carries.
export function overlaySetting( { settings = {}, kind, coverSlots = [], roleOf = () => null, roles = {} } ) {
	const property = 'gradient' === kind ? 'background-image' : 'background-color';
	const hits = Object.entries( settings || {} ).filter( ( [ name, c ] ) => c && ! c.state && paintedProps( c ).includes( property ) && roles[ kind ] === roleOf( name ) )
		.map( ( [ name, c ] ) => ( { name, slot: [ c.slot, ...( c.slots || [] ) ].find( ( s ) => coverSlots.includes( s ) ) } ) )
		.filter( ( h ) => undefined !== h.slot )
		.sort( ( a, b ) => a.name.localeCompare( b.name ) );
	return hits.length ? { slot: hits[ 0 ].slot, setting: hits[ 0 ].name, property } : null;
}

// The overlay of one host element: { slot, setting, property, kind, layers: [ keys in drawing order ], others: [ settings
// at the slot ], widthVaries, refused: { key: reason } }, or { refused } alone when no layer is absorbed. `candidates` are the
// host element's children the rules make decorative layers (in document order, which is their drawing order: positioned,
// no z-index); `declaredOf( e )` an element's declared style.
export function overlayOf( { host, candidates, m, declaredOf, settings, roleOf, R = {} } ) {
	const refused = {};
	const kids = m.kids( host );
	const fit = [];
	for ( const layer of candidates ) {
		const why = layerRefusal( { layer, host, st: declaredOf( layer ), m, layerProps: R.layerProps || [] } );
		const at = kids.indexOf( layer );
		// Drawn before the layer, so beneath it in the draft: only the host's background (a wordless box covering the host),
		// another candidate layer, or nothing drawn at all. Content, or a decoration that stays a block (it would be drawn
		// above the host's overlay in the clone), keeps the layer a block of its own.
		const above = why ? null : kids.slice( 0, at ).find( ( k ) => ! candidates.includes( k ) && ! coversWordless( m, k, host ) && drawsBox( m, k ) );
		const over = why || above ? null : kids.slice( at + 1 ).find( ( k ) => ! candidates.includes( k ) && coversWordless( m, k, host ) );
		const reason = why || ( above ? `it is drawn above ${ ws( above.allText ?? above.words ) ? 'content' : 'a decoration that stays a block' } (${ above.key })` : over ? `a wordless box covering the host (${ over.key }) is drawn above it` : null );
		reason ? ( refused[ layer.key ] = reason ) : fit.push( layer );
	}
	if ( ! fit.length ) {
		return { refused };
	}
	const kinds = new Set( fit.map( ( l ) => paintAt( l.resolved?.[ m.shownAt( host )[ 0 ] ] ) ) );
	const blends = new Set( fit.map( ( l ) => ws( declaredOf( l )[ 'mix-blend-mode' ] ?? 'normal' ) ) );
	const refuseAll = ( why ) => ( fit.forEach( ( l ) => ( refused[ l.key ] = why ) ), { refused } );
	if ( kinds.size > 1 ) {
		return refuseAll( 'the full-cover layers mix a flat colour and a gradient, which no one overlay setting holds' );
	}
	const [ kind ] = kinds;
	if ( 'colour' === kind && fit.length > 1 ) {
		return refuseAll( 'more than one flat colour covers the host, which no one overlay setting holds' );
	}
	if ( blends.size > 1 ) {
		return refuseAll( 'the full-cover layers blend differently, which no one overlay setting holds' );
	}
	const s = overlaySetting( { settings, kind, coverSlots: R.coverSlots || [], roleOf, roles: R.roles || {} } );
	if ( ! s ) {
		return refuseAll( `the host block has no calibrated overlay setting painting ${ 'gradient' === kind ? 'background-image' : 'background-color' } over its whole box` );
	}
	// The other settings painting the overlay element (its opacity, its blend mode): Fill reads the top layer there. The
	// overlay's opacity is a setting of its own whose default is not full strength, so without one calibrated the gradient
	// would not show at its own alpha; a blend mode the draft's layers declare needs the overlay's blend setting.
	const at = Object.entries( settings ).filter( ( [ name, c ] ) => c && ! c.state && name !== s.setting && [ c.slot, ...( c.slots || [] ) ].includes( s.slot ) );
	const others = at.map( ( [ name ] ) => name ).sort();
	if ( ! at.some( ( [ , c ] ) => paintedProps( c ).includes( 'opacity' ) ) ) {
		return refuseAll( 'the host block has no calibrated opacity setting at its overlay, so the overlay would not show at the layers\' own strength' );
	}
	const [ blend ] = blends;
	if ( 'normal' !== blend && ! at.some( ( [ , c ] ) => paintedProps( c ).includes( 'mix-blend-mode' ) ) ) {
		return refuseAll( `the layers blend ${ blend } and the host block has no calibrated blend setting at its overlay` );
	}
	const stackAt = ( w ) => fit.map( ( l ) => ws( l.resolved?.[ w ]?.[ s.property ] ) ).reverse().join( ', ' );
	const widths = m.shownAt( host );
	const widthVaries = new Set( widths.map( stackAt ) ).size > 1;
	return { ...s, kind, layers: fit.map( ( l ) => l.key ), others, widthVaries, refused };
}
