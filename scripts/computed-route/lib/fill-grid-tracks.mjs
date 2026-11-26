// A grid node's explicit tracks against what the clone puts in them (Spec 48 FR-48-8, the post-Fill track check). Fill writes a
// grid node's `gridTemplateColumns` from the draft element's tracks, one track for each cell the draft draws in its row. When a
// cell is dissolved (the skeleton unwraps the cell's wrapper, or the host block takes the cell's picture) the cell's children
// join the grid as items of their own, so the draft's tracks no longer describe what the grid holds: the hero's words, four
// items promoted from one cell, sat in the first of two tracks beside a picture the hero draws itself.
// The tracks are re-derived from what each draft cell became:
//   - a cell the host block draws itself (a draft element the node reads as one of its own parts: a split hero's content column
//     and its picture) holds that one part, whatever it holds inside, so the node's tracks are the host's own and stay;
//   - a cell that kept one item keeps its track, a cell that kept none (absorbed by its host) loses it;
//   - items promoted from one cell, when it is the only cell left with items, stack in that cell's one track;
//   - anything else (two cells left, one of them promoting several items) no track list holds: a row says so.
// Only a single-row grid is re-derived (the draft shows as many cells as it has tracks at that width, each cell the track at its
// place in the row); a grid that wraps or leaves a track empty keeps its tracks. Pure
// over the node's skeleton children and the draft inventory model: no browser, no site.
import { gridTracks } from './skeleton-record.mjs';

const TIER_WIDTH = { desktop: 1440, tablet: 768, mobile: 375 };
const within = ( m, key, ancestor ) => {
	for ( let p = m.byKey[ key ]; p; p = m.byKey[ p.parentKey ] ) {
		if ( p === ancestor ) {
			return true;
		}
	}
	return false;
};

/**
 * @param {Object}   o
 * @param {string}   o.value     The written `gridTemplateColumns` at one tier.
 * @param {Object}   o.element   The node's draft element (an inventory element).
 * @param {string[]} o.children  The draft element keys of the node's skeleton children shown at the tier's width.
 * @param {string[]} [o.parts]   The draft element keys the node reads as parts of its own (its draftSlots finders).
 * @param {number}   o.width     375, 768 or 1440.
 * @param {Object}   o.m         lib/skeleton-model.mjs::inventoryModel.
 * @return {{ok:true}|{ok:true, value:string, count:number, why:string}|{ok:false, why:string}} Nothing to change, the new
 *         tracks, or why no track list holds the children.
 */
export function retrack( { value, element, children, parts = [], width, m } ) {
	const tracks = gridTracks( value );
	// Every cell the draft draws at this width, one that shows only at some widths (a phone-only cell) included: such a cell is
	// an alternative of the grid for the reference width, but it holds items at its own.
	const cells = [ ...m.blockKids( element ), ...m.widthKids( element ) ].filter( ( k ) => k.visible?.[ width ] );
	// The track a cell sits in is read from its place in the row, which only holds while each track has one cell.
	if ( tracks.length < 2 || ! cells.length || cells.length !== tracks.length ) {
		return { ok: true };
	}
	const held = cells.map( ( cell ) => ( parts.some( ( key ) => within( m, key, cell ) ) ? 1 : children.filter( ( key ) => within( m, key, cell ) ).length ) );
	const orphans = children.filter( ( key ) => ! cells.some( ( cell ) => within( m, key, cell ) ) );
	if ( orphans.length ) {
		return { ok: false, why: `${ orphans.length } item${ 1 === orphans.length ? '' : 's' } of the node (${ orphans.join( ', ' ) }) sit${ 1 === orphans.length ? 's' : '' } in none of the ${ cells.length } cells the draft's ${ tracks.length } tracks hold` };
	}
	if ( held.every( ( n ) => 1 === n ) ) {
		return { ok: true };
	}
	const left = cells.map( ( cell, i ) => i ).filter( ( i ) => held[ i ] > 0 );
	if ( ! left.length ) {
		return { ok: true };
	}
	if ( left.length > 1 && left.some( ( i ) => held[ i ] > 1 ) ) {
		return { ok: false, why: `the draft's ${ cells.length } cells hold ${ held.join( ', ' ) } items here, so the ${ tracks.length } tracks (${ value }) hold neither the cells nor their items` };
	}
	const next = left.map( ( i ) => tracks[ i ] ).join( ' ' );
	return { ok: true, value: next, count: left.length, why: `the draft's ${ cells.length } cells hold ${ held.join( ', ' ) } items here: ${ left.length } track${ 1 === left.length ? '' : 's' } (${ next }) instead of ${ tracks.length }` };
}

/**
 * The re-derived tracks of every grid node that wrote explicit ones, applied to the node's settings and to Fill's writes.
 *
 * @param {Object}   o
 * @param {Object[]} o.nodes    lib/fill-skeleton.mjs::skeletonNodes.
 * @param {Object[]} o.flat     The tree's nodes by index.
 * @param {Function} o.refOf    The node's ref.
 * @param {Object}   o.m        lib/skeleton-model.mjs::inventoryModel of the surface.
 * @param {Object[]} o.writes   Fill's writes (a rewritten tier is updated in place).
 * @return {{writes:Object[], unmapped:Object[], notes:string[]}} Rewritten tiers, rows no track list answers, notes.
 */
export function gridTrackWrites( { nodes, flat, refOf, m, writes } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const rewritten = [];
	for ( const rec of nodes ) {
		const node = flat[ rec.index ];
		const tracks = node?.attributes?.gridTemplateColumns;
		const element = m.byKey[ rec.node?.draftRef?.tpl ];
		if ( ! tracks || 'object' !== typeof tracks || ! element ) {
			continue;
		}
		const parts = Object.values( rec.node?.draftSlots || {} ).map( ( f ) => f?.tpl ).filter( ( key ) => m.byKey[ key ] );
		for ( const [ tier, width ] of Object.entries( TIER_WIDTH ) ) {
			const value = tracks[ tier ];
			if ( 'string' !== typeof value ) {
				continue;
			}
			const children = rec.children.map( ( i ) => nodes[ i ].node?.draftRef?.tpl ).filter( ( key ) => m.byKey[ key ]?.visible?.[ width ] );
			const r = retrack( { value, element, children, parts, width, m } );
			if ( ! r.ok ) {
				out.unmapped.push( { node: refOf( node ), block: rec.name, slot: '', property: 'grid-template-columns', value, widths: [ width ], reason: `tracks: ${ r.why }` } );
			} else if ( undefined !== r.value && r.value !== value ) {
				rewritten.push( { node, rec, attr: 'gridTemplateColumns', width, before: structuredClone( tracks ) } );
				tracks[ tier ] = r.value;
				// The count setting that held the draft's track count holds the new one.
				const counts = node.attributes.columns;
				if ( counts && 'object' === typeof counts && gridTracks( value ).length === Number( counts[ tier ] ) ) {
					rewritten.push( { node, rec, attr: 'columns', width, before: structuredClone( counts ) } );
					counts[ tier ] = r.count;
				}
				out.notes.push( `${ refOf( node ) } ${ rec.name } grid-template-columns at ${ width }px: ${ r.why }` );
			}
		}
	}
	// A rewritten setting is the write Fill already made with its new value, kept under its own `how` and judged against the draft
	// only at the widths no rewrite reached (`retracked`: the draft's own tracks are the cells' tracks); a setting no write names
	// is a write of its own.
	for ( const w of rewritten ) {
		const ref = refOf( w.node );
		const now = structuredClone( w.node.attributes[ w.attr ] );
		const prior = writes.filter( ( x ) => x.node === ref && w.attr === x.attr );
		prior.forEach( ( x ) => Object.assign( x, { after: now, retracked: [ ...new Set( [ ...( x.retracked || [] ), w.width ] ) ] } ) );
		if ( ! prior.length ) {
			const mine = out.writes.find( ( x ) => x.node === ref && w.attr === x.attr );
			mine ? Object.assign( mine, { after: now, widths: [ ...mine.widths, w.width ] } )
				: out.writes.push( { node: ref, index: w.rec.index, block: w.rec.name, slot: '', prop: 'grid-template-columns', attr: w.attr, before: w.before, after: now, widths: [ w.width ], how: 'grid-tracks' } );
		}
	}
	return out;
}

/**
 * Fill's writes as the confirm check reads them: a write a rewrite reached is judged only at the widths it did not reach.
 *
 * @param {Object[]} writes Fill's writes.
 * @return {Object[]} The writes to judge against the draft.
 */
export function confirmable( writes ) {
	return writes.map( ( w ) => ( w.retracked ? { ...w, widths: ( w.widths || [] ).filter( ( x ) => ! w.retracked.includes( x ) ) } : w ) ).filter( ( w ) => ! w.retracked || w.widths.length );
}
