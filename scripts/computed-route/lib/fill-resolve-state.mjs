// Fill resolution state (FR-47-4 steps 2 and 3): the run state built once, the baselines an element is judged against,
// the divergence ledger view and the spacing-ownership plan per node.
import { HOVER_PROPS } from '../../parity/lib/collect.mjs';
import { blockSchema } from './resolve.mjs';
import { refOf, walk } from './tree.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { INHERITED, CARRIED, defaultPaint } from './fill-prop.mjs';
import { pageBaseline } from './fill-page.mjs';
import { spacingOwnership } from './fill-spacing.mjs';
import { unstyledBaseline } from './fill-fixture.mjs';
import { match as ledgerMatch } from './ledger.mjs';

export const GAP_PROPS = [ 'row-gap', 'column-gap' ];
export const slugClass = ( name ) => `sgs-${ name.replace( /^sgs\//, '' ) }`;
export const json = ( v ) => JSON.stringify( v );

// A draft's per-width values as one readable value: the value itself when every width agrees, else { width: value }.
export function valueText( draft ) {
	const vals = Object.values( draft );
	return vals.every( ( v ) => v === vals[ 0 ] ) ? String( vals[ 0 ] ) : json( draft );
}

// The settings (other than the slot itself) a carried property could be painted by: the slots of the block's settings for
// that property, from calibration.
export function alternateSlots( cal, prop, draft = {} ) {
	// A layout setting calibration discovered painting display sits on the element laying out the children. A hide
	// (display:none at any width) stays on the element's own slot: the layout element is not the one the draft hides.
	if ( 'display' === prop ) {
		if ( Object.values( draft ).some( ( v ) => 'none' === String( v ).trim() ) ) {
			return [];
		}
		return Object.values( cal?.discovered || {} ).flatMap( ( d ) => d.display?.slots || [] );
	}
	if ( ! CARRIED.includes( prop ) ) {
		return [];
	}
	const short = prop.replace( /^(row|column)-gap$/, 'gap' );
	return Object.values( cal?.settings || {} ).filter( ( s ) => ( s.property === prop || s.property === short ) && ! s.state ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] );
}

// The state a Fill run reads: one object built once, passed to every step.
export function makeState( o ) {
	const flat = [];
	walk( o.tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	return {
		...o, flat,
		out: { writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], unread: [], images: [] },
		shown: new Map(), // `${index}|${prop}` -> { width: value } for the node's own element, once resolved
		gapSet: new Map(), // `${index}|${prop}` -> { width: value } the parent decided from rendered gaps
		margins: new Map(), // child index -> { width: [margin sides the parent owns] }
		pages: o.pages ?? null, // the page map rows (a hash route is written as its page's permalink)
		notedBlocks: new Set(),
		fixtureViews: new Map(), // block -> its calibration fixture's styling preconditions (lib/fill-fixture.mjs)
		page: ( ( cache ) => ( tag ) => {
			if ( ! cache.has( tag ) ) {
				cache.set( tag, pageBaseline( o.rawSnapshot, tag ) );
			}
			return cache.get( tag );
		} )( new Map() ),
	};
}

// The element tag a node paints, for the theme's element styles: a heading's level, a block's tag, else the root tag
// calibration saw.
const tagOf = ( st, rec, cal ) => {
	const a = st.flat[ rec.index ].attributes || {};
	return a.level || a.tagName || cal?.elements?.[ '' ]?._tag;
};

// The value an ancestor's element shows for an inherited property at a width, nearest first. A line height is inherited
// as a ratio of the element's own font size, so it is carried as that ratio.
function inheritedFrom( st, rec, prop, w, ownFontPx ) {
	for ( let i = rec.parent; null !== i; i = st.nodes[ i ].parent ) {
		const v = shownAt( st, i, prop, w, ownFontPx );
		if ( undefined !== v ) {
			return v;
		}
	}
	return undefined;
}

// What node `index` shows for an inherited property at a width, as the value a node of font size ownFontPx inherits.
function shownAt( st, index, prop, w, ownFontPx ) {
	const v = st.shown.get( `${ index }|${ prop }` )?.[ w ];
	if ( 'line-height' !== prop || undefined === v || ! ownFontPx ) {
		return v;
	}
	const fs = parseFloat( st.shown.get( `${ index }|font-size` )?.[ w ] );
	return fs ? `${ Math.round( ( parseFloat( v ) / fs ) * ownFontPx * 100 ) / 100 }px` : v;
}

// What the node shows at a slot with nothing written. A non-inherited property shows its calibrated default paint. An
// inherited one (R-47-5) shows what its parent shows, or at the top of the surface what the theme gives the page; a theme
// element style (a heading's family and weight) beats the parent. ownFontPx( width ): the element's own font size.
export function baselineFn( st, rec, cal, prop, ownFontPx = () => undefined ) {
	const page = st.page( tagOf( st, rec, cal ) );
	return ( slot, w ) => {
		if ( INHERITED.includes( prop ) && ! slot.includes( '::' ) ) {
			const fs = ownFontPx( w );
			if ( page.own( prop ) ) {
				return page.value( prop, w, fs );
			}
			const here = '' === slot ? undefined : shownAt( st, rec.index, prop, w, fs );
			return here ?? inheritedFrom( st, rec, prop, w, fs ) ?? page.value( prop, w, fs ) ?? defaultPaint( cal, slot, w, prop );
		}
		// A property the calibration fixture switched on (lib/fill-fixture.mjs) is compared with its unstyled value.
		return unstyledBaseline( st, rec.name, cal, blockSchema( rec.name ), slot, prop ) ?? defaultPaint( cal, slot, w, prop );
	};
}

// The divergence ledger over one property's draft values (R-47-8): a value entry replaces the draft at its widths, a rule
// entry leaves the width unwritten. Returns { draft, rules, held }.
export function ledgerView( st, rec, ref, prop, draft, pseudo ) {
	const out = { draft: { ...draft }, rules: [], held: [] };
	for ( const w of Object.keys( draft ).map( Number ) ) {
		for ( const state of st.ledgerStates.length ? st.ledgerStates : [ undefined ] ) {
			const e = ledgerMatch( st.ledger, { ref, block: slugClass( rec.name ), property: prop, state, width: w, kind: 'style', pseudo: pseudo || null } );
			if ( e ) {
				if ( 'value' in e.expected && HOVER_PROPS.includes( prop ) && '*' !== e.state ) {
					// The walker judges this entry against hover rows too, and Fill reads the rest state: a decided hover
					// value is never a rest value. Solve applies it where the row exists.
					out.held.push( { id: e.id, width: w, applied: false } );
				} else if ( 'value' in e.expected ) {
					out.draft[ w ] = e.expected.value;
					out.held.push( { id: e.id, width: w, applied: true } );
				} else {
					delete out.draft[ w ];
					out.rules.push( { id: e.id, width: w, rule: e.expected.rule } );
				}
				break;
			}
		}
	}
	return out;
}

// The node's element that holds its gap: the target at the calibrated slot of the block's `gap` setting when the
// skeleton gives one (a container's inner element), else the node's own element.
export const gapTarget = ( st, rec ) => {
	const slot = st.calFor( rec.name )?.settings?.gap?.slot;
	return ( slot && rec.targets.find( ( t ) => t.slot === slot ) ) || rec.targets.find( ( t ) => '' === t.slot ) || null;
};

export const snapsOf = ( st, id ) => Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, st.reads.widths[ w ]?.[ id ] ] ).filter( ( [ , s ] ) => s && ! s.missing ) );
export const draftOf = ( snaps, get ) => Object.fromEntries( Object.entries( snaps ).map( ( [ w, s ] ) => [ Number( w ), get( s ) ] ).filter( ( [ , v ] ) => undefined !== v && '' !== v ) );

// Spacing ownership for one node's children, per tier (step 3): fills gapSet (the parent's gap per width) and margins
// (the sides each child gives up), and logs the decision. A parent with no element of its own, or children without one,
// decides nothing.
export function planSpacing( st, rec ) {
	const kids = rec.children;
	if ( ! kids.length || ! rec.targets.length ) {
		return;
	}
	const measured = kids.filter( ( c ) => st.nodes[ c ].targets.length );
	const unmeasured = kids.length - measured.length;
	const holder = gapTarget( st, rec );
	for ( const w of READ_WIDTHS ) {
		const rects = measured.map( ( c ) => {
			const s = st.reads.widths[ w ]?.[ `${ c }:` ];
			return s && ! s.missing ? { ...s.rect, inFlow: s.inFlow } : null;
		} );
		const ownership = spacingOwnership( rects, { unmeasured, declared: ( holder && st.reads.declared?.[ w ]?.[ holder.id ] ) || null } );
		if ( 'unknown' === ownership.owner || ownership.decisions.length ) {
			st.out.spacing.push( { node: refOf( st.flat[ rec.index ] ), index: rec.index, width: w, owner: ownership.owner, count: ownership.count, decisions: ownership.decisions } );
		}
		const rendered = measured.filter( ( c, i ) => rects[ i ] && false !== rects[ i ].inFlow && ( rects[ i ].w > 0 || rects[ i ].h > 0 ) );
		for ( const d of ownership.decisions ) {
			const gaps = st.gapSet.get( `${ rec.index }|${ d.prop }` ) || {};
			gaps[ w ] = d.value;
			st.gapSet.set( `${ rec.index }|${ d.prop }`, gaps );
			if ( 'parent' !== d.owner ) {
				continue;
			}
			// Margins between siblings move into the parent's gap; a first child's leading margin and a last child's
			// trailing margin are not between siblings, so they stay.
			rendered.forEach( ( c, i ) => {
				const per = st.margins.get( c ) || {};
				per[ w ] = [ ...( per[ w ] || [] ), ...d.margins.filter( ( side, k ) => ( 0 === k ? i > 0 : i < rendered.length - 1 ) ) ];
				st.margins.set( c, per );
			} );
		}
	}
}
