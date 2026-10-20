// The confirm record (Spec 48 FR-48-8, FR-48-36): for every value Fill writes, at each read width, the value the
// draft's code declares on the element against the value the draft renders (D–R), with the tolerance its type takes and
// the verdict. Fill runs before the live page exists, so the rendered-live value (R–L) stays empty here and the check
// fills it; the verdict is D–R's: `confirmed` (agree, or a value the code resolves at run time, which the render is),
// `render-wins` (disagree: the rendered value is written and the row reported), `draft-defect` (disagree where intake
// lists the element's declaration as never painting, FR-48-34) and `open` (no declared value: the render alone decides).
import { parseColour, deltaE, toPx, COLOUR_DE } from './normalise.mjs';
import { transformMatrix, sameMatrix } from './css-matrix.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

// FR-48-36's tolerances by property type (provisional until calibrated on the first client clone).
export const TOLERANCE = { colour: `ΔE ${ COLOUR_DE }, alpha 0.02`, length: '0.5px', 'font-family': 'first family', 'font-weight': 'exact', 'line-height': '0.5px', transform: 'matrix entries 0.01', time: '10ms', keyword: 'exact' };

// A value the code computes at run time: its rendered value is what it resolves to, so there is nothing to compare.
const RUNTIME = /\b(?:var|calc|clamp|min|max|env|attr)\(|%|\bv[wh]\b|\d(?:vw|vh|vmin|vmax|dvh|svh|lvh|cq[whib])\b/;
const FONT_WEIGHTS = { normal: 400, bold: 700 };
const firstFamily = ( v ) => String( v ).split( ',' )[ 0 ].trim().replace( /^["']|["']$/g, '' ).toLowerCase();
const ms = ( v ) => {
	const m = /^(-?\d*\.?\d+)(ms|s)$/.exec( String( v ).trim() );
	return m ? Number( m[ 1 ] ) * ( 's' === m[ 2 ] ? 1000 : 1 ) : null;
};

// The type a property's comparison takes: by the property where its values have a form of their own, else by value.
export function propertyType( prop, declared, rendered ) {
	if ( 'font-family' === prop || 'font-weight' === prop || 'line-height' === prop || 'transform' === prop ) {
		return prop;
	}
	if ( /(?:^|-)colou?r$/.test( prop ) || ( parseColour( declared ) && parseColour( rendered ) ) ) {
		return 'colour';
	}
	if ( /-(?:duration|delay)$/.test( prop ) ) {
		return 'time';
	}
	return null !== lengthPx( declared ) && null !== lengthPx( rendered ) ? 'length' : 'keyword';
}

// A length in px (a unitless 0 is 0), or null.
const lengthPx = ( v, fontPx = 16 ) => ( '0' === String( v ?? '' ).trim() ? 0 : toPx( String( v ?? '' ).trim(), fontPx ) );
const colourOf = ( v ) => ( 'transparent' === String( v ).trim().toLowerCase() ? { r: 0, g: 0, b: 0, a: 0 } : parseColour( v ) );
// A value's top-level parts (split on spaces and commas outside brackets).
const parts = ( v ) => String( v ).match( /(?:[^\s,(]+|\([^)]*\))+/g ) || [];
// Two parts agree: colours within ΔE and alpha, lengths within 0.5px, anything else equal ignoring case.
function samePart( a, b, fontPx ) {
	const [ ca, cb ] = [ colourOf( a ), colourOf( b ) ];
	if ( ca && cb ) {
		return deltaE( ca, cb ) <= COLOUR_DE && Math.abs( ca.a - cb.a ) <= 0.02;
	}
	const [ la, lb ] = [ lengthPx( a, fontPx ), lengthPx( b, fontPx ) ];
	if ( null !== la && null !== lb ) {
		return Math.abs( la - lb ) <= 0.5;
	}
	return a.toLowerCase() === b.toLowerCase();
}

// D–R for one property at one width: { dr: 'agree' | 'disagree' | 'runtime' | 'no-declared' | 'unreadable', type,
// tolerance }. fontPx is the element's font size there (em lengths and unitless line heights).
export function compareDR( prop, declared, rendered, fontPx = 16 ) {
	if ( null == declared || '' === String( declared ).trim() ) {
		return { dr: 'no-declared', type: null, tolerance: null };
	}
	const d = String( declared ).trim().replace( /\s*!important$/, '' );
	const r = String( rendered ?? '' ).trim();
	// A value the browser resolves itself: run-time functions and relative units, a CSS-wide keyword (the default),
	// `currentcolor`, and a keyword the render states as a plain length (`thin`, `medium`, `auto` laid out): its render
	// is its value.
	if ( RUNTIME.test( d ) || /^(?:initial|inherit|unset|revert|revert-layer|currentcolor)$/i.test( d ) || ( /^[a-z-]+$/i.test( d ) && null !== lengthPx( r ) ) ) {
		return { dr: 'runtime', type: null, tolerance: null };
	}
	const type = propertyType( prop, d, r );
	const out = ( ok ) => ( { dr: null === ok ? 'unreadable' : ok ? 'agree' : 'disagree', type, tolerance: TOLERANCE[ type ] } );
	switch ( type ) {
		case 'colour': {
			const [ a, b ] = [ colourOf( d ), colourOf( r ) ];
			return out( a && b ? deltaE( a, b ) <= COLOUR_DE && Math.abs( a.a - b.a ) <= 0.02 : null );
		}
		case 'font-family':
			return out( firstFamily( d ) === firstFamily( r ) );
		case 'font-weight': {
			const [ a, b ] = [ FONT_WEIGHTS[ d ] ?? Number( d ), FONT_WEIGHTS[ r ] ?? Number( r ) ];
			return out( Number.isFinite( a ) && Number.isFinite( b ) ? a === b : null );
		}
		case 'line-height': {
			const unitless = /^\d*\.?\d+$/.test( d ) ? Number( d ) * fontPx : null;
			const [ a, b ] = [ unitless ?? toPx( d, fontPx ), toPx( r, fontPx ) ];
			return out( null !== a && null !== b ? Math.abs( a - b ) <= 0.5 : null );
		}
		case 'transform': {
			const [ a, b ] = [ transformMatrix( d ), transformMatrix( r ) ];
			return out( a && b ? sameMatrix( a, b, { tol: 0.01, tolPx: 0.01 } ) : null );
		}
		case 'time': {
			const [ a, b ] = [ ms( d ), ms( r ) ];
			return out( null !== a && null !== b ? Math.abs( a - b ) <= 10 : null );
		}
		case 'length':
			return out( Math.abs( lengthPx( d, fontPx ) - lengthPx( r, fontPx ) ) <= 0.5 );
		default: {
			// Part by part; a value the browser serialises in another shape (a shadow with its colour moved first and a
			// spread added, a radius expanded to four corners) cannot be compared here.
			const [ a, b ] = [ parts( d ), parts( r ) ];
			return out( a.length === b.length ? a.every( ( x, i ) => samePart( x, b[ i ], fontPx ) ) : null );
		}
	}
}

// The draft ID of a target finder ({ tpl: 'Root/220#0' } or 'Root>Child/12#0'): the component that stamps it and its
// template number, with the served root named by the entry draft's component.
export function draftIdOf( finder, rootComponent ) {
	const m = /^(.*)\/(\d+)#\d+$/.exec( String( finder?.tpl ?? '' ) );
	if ( ! m ) {
		return null;
	}
	const comp = m[ 1 ].split( '>' ).pop();
	return `${ 'Root' === comp ? rootComponent : comp }:${ m[ 2 ] }`;
}

// The declarations intake lists as never painting, by draft ID: { draftId: Set(property) }, from each defect row's
// declared text (intake.json `draftDefects`).
export function defectIndex( draftDefects = [] ) {
	const out = new Map();
	for ( const row of draftDefects.flatMap( ( g ) => g.rows || [ g ] ) ) {
		const props = String( row.evidence?.declared ?? '' ).split( ';' ).map( ( d ) => d.slice( 0, d.indexOf( ':' ) ).trim().toLowerCase() ).filter( Boolean );
		const set = out.get( row.draftId ) || new Set();
		props.forEach( ( p ) => set.add( p ) );
		out.set( row.draftId, set );
	}
	return out;
}

// The verdict a D–R result gives, with intake's defect list for the element.
export function verdictOf( dr, defect ) {
	if ( 'no-declared' === dr || 'unreadable' === dr ) {
		return 'open';
	}
	if ( 'disagree' === dr ) {
		return defect ? 'draft-defect' : 'render-wins';
	}
	return 'confirmed';
}

// Every write's confirm records. writes: Fill's writes ({ node, index, block, slot, prop, attr, after }); nodes:
// lib/fill-skeleton.mjs::skeletonNodes; reads: lib/fill-read.mjs::readDraft's result; defects: defectIndex();
// rootComponent: the entry draft's component.
export function confirmRecords( { writes, nodes, reads, defects = new Map(), rootComponent } ) {
	const out = [];
	for ( const w of writes.filter( ( x ) => x.prop && ! x.prop.startsWith( '(' ) ) ) {
		// A write made through another setting (lib/fill-equivalents.mjs) is confirmed on the element whose property it
		// holds: a parent's Align items against the child that asked align-self.
		const src = w.from || w;
		const slot = String( src.slot ?? '' );
		// A painted pseudo layer (`::before`, `::after`) is its element's: rendered from the layer, with no declared read.
		const layer = /::(?:before|after)$/.exec( slot )?.[ 0 ] ?? null;
		const base = layer ? slot.slice( 0, -layer.length ) : slot;
		const target = nodes[ src.index ]?.targets.find( ( t ) => t.slot === base );
		const record = { node: w.node, block: w.block, attribute: w.attr, property: w.prop, state: 'default', emitted: w.after ?? null, renderedLive: null };
		if ( ! target ) {
			out.push( { ...record, draftId: null, width: null, declared: null, renderedDraft: null, dr: 'no-target', tolerance: null, verdict: 'open' } );
			continue;
		}
		const draftId = draftIdOf( target.finder, rootComponent );
		for ( const width of READ_WIDTHS ) {
			const snap = reads.widths?.[ width ]?.[ target.id ];
			if ( ! snap || snap.missing ) {
				continue;
			}
			const declared = layer ? null : reads.declared?.[ width ]?.[ target.id ]?.[ w.prop ] ?? null;
			const rendered = ( layer ? snap.pseudo?.[ layer ]?.[ w.prop ] : snap.styles?.[ w.prop ] ) ?? null;
			const c = compareDR( w.prop, declared, rendered, parseFloat( snap.styles?.[ 'font-size' ] ) || 16 );
			out.push( { ...record, draftId, width, declared, renderedDraft: rendered, dr: c.dr, tolerance: c.tolerance, verdict: verdictOf( c.dr, defects.get( draftId )?.has( w.prop ) ) } );
		}
	}
	return out;
}
