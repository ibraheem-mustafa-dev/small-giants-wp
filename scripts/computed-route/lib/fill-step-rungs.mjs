// A step between the read widths that the written setting cannot hold (Spec 48 FR-48-50, FR-48-8) for Fill. A setting written
// per device holds the value read at 375, 768 and 1440 for the tier around it, so a draft value that changes between two read
// widths (a nav item's padding `w < 1200 ? 10px : 15px`: 10px from 1024 to 1199, the desktop tier read 15px) is wrong across
// the stretch the tier read does not represent. The 16px sweep (lib/fill-read.mjs, `reads.sweep`) records every width's value;
// this pass compares each written property's sweep with the tier read it was written from and, for every stretch where they
// disagree next to a real step (lib/fill-values.mjs::breakpointSteps; a fluid ramp is not a step), adds a scoped `@media` rule
// on the instance at the draft's threshold, snapped to a tier within 5% (a `breakpoint-snap` ledger entry), through the same
// Additional CSS writer as lib/fill-width-ladder.mjs. Any property, block and setting: only the writes and the sweep decide.
// Returns { writes, notes, ledger }.
import { setAttr } from './tree.mjs';
import { breakpointSteps } from './fill-values.mjs';
import { mediaRule, scopedCssPuts, snapThreshold, snapEntry, TIER_RANGES } from './fill-width-gate.mjs';
import { rowTarget } from './fill-regap.mjs';

// The writes whose value a read width stands for: a per-device or single value written from the tier reads.
const READ_HOW = [ 'tiers', 'single' ];
const TIER_READ = { mobile: 375, tablet: 768, desktop: 1440 };
const SAFE_VALUE = /^[\w\s#%.,()+/"'-]*$/;
const SAFE_SLOT = /^[\w\s.#>:()+~[\]="'*-]*$/;

const tierOf = ( w ) => Object.keys( TIER_RANGES ).find( ( t ) => TIER_RANGES[ t ][ 0 ] <= w && w < TIER_RANGES[ t ][ 1 ] );
const px = ( v ) => ( /^-?[\d.]+px$/.test( String( v ) ) ? parseFloat( v ) : null );
const sameValue = ( a, b ) => ( null !== px( a ) && null !== px( b ) ? Math.abs( px( a ) - px( b ) ) <= 0.5 : String( a ) === String( b ) );
const rangeText = ( [ lo, hi ] ) => ( Infinity === hi ? `${ lo }px and up` : `${ lo }-${ hi - 1 }px` );

// The stretches of a sweep series where the draft's value differs from the tier read that stands for it, each next to a step:
// [ { range: [lo, hi), value } ], one per run of widths of one value that no tier read stands for. `tierValue(tier)` is the read value of a tier.
export function stepStretches( prop, series, tierValue ) {
	const steps = new Set( breakpointSteps( prop, series ).map( ( s ) => s.at ) );
	const off = series.map( ( s ) => undefined !== s.value && undefined !== tierValue( tierOf( s.width ) ) && ! sameValue( s.value, tierValue( tierOf( s.width ) ) ) );
	const out = [];
	for ( let i = 0; i < series.length; i++ ) {
		if ( ! off[ i ] ) {
			continue;
		}
		let j = i;
		while ( j + 1 < series.length && off[ j + 1 ] && sameValue( series[ j + 1 ].value, series[ i ].value ) ) {
			j++;
		}
		const touches = steps.has( series[ i ].width ) || ( j + 1 < series.length && steps.has( series[ j + 1 ].width ) );
		touches && out.push( { range: [ 0 === i ? 0 : series[ i ].width, j + 1 < series.length ? series[ j + 1 ].width : Infinity ], value: series[ i ].value } );
		i = j;
	}
	return out;
}

// The writes of a Fill run grouped by node, slot and property: Map `${node}|${slot}|${prop}` -> { node, slot, prop }.
function written( writes ) {
	const out = new Map();
	for ( const w of writes ) {
		if ( ! READ_HOW.includes( w.how ) || w.state || ! w.prop || ! w.node ) {
			continue;
		}
		out.set( `${ w.node }|${ w.slot ?? '' }|${ w.prop }`, { node: w.node, slot: w.slot ?? '', prop: w.prop } );
	}
	return [ ...out.values() ];
}

export function stepRungWrites( { nodes, flat, refOf, reads, writes, scope = '', entries = [], date = new Date().toISOString().slice( 0, 10 ) } ) {
	const out = { writes: [], notes: [], ledger: [] };
	const rules = new Map();
	for ( const g of written( writes ) ) {
		const hit = rowTarget( { nodes, flat, refOf }, { node: g.node, slot: g.slot } );
		const series = hit ? reads.sweep?.[ hit.target.id ]?.[ g.prop ] : null;
		if ( ! series?.length || ! /^[a-z-]+$/.test( g.prop ) || ! SAFE_SLOT.test( g.slot ) ) {
			continue;
		}
		const tierValue = ( tier ) => reads.widths?.[ TIER_READ[ tier ] ]?.[ hit.target.id ]?.styles?.[ g.prop ];
		for ( const s of stepStretches( g.prop, series, tierValue ) ) {
			if ( ! SAFE_VALUE.test( s.value ) || /url\(|expression|javascript|@import/i.test( s.value ) ) {
				continue;
			}
			const snapped = s.range.map( ( edge ) => {
				const snap = 0 === edge || Infinity === edge ? null : snapThreshold( edge );
				snap && out.ledger.push( snapEntry( { scope, ref: g.node, snap: { draft: edge, tier: snap.tier, distance: snap.distance }, entries: [ ...entries, ...out.ledger ], date } ) );
				return snap ? snap.tier : edge;
			} );
			// A stretch the snap to a tier absorbs entirely is the tier boundary's: nothing is left to write.
			if ( snapped[ 0 ] >= snapped[ 1 ] ) {
				continue;
			}
			const key = `${ g.node }|${ g.slot }|${ snapped.join( '-' ) }`;
			const rule = rules.get( key ) || { node: g.node, rec: hit.rec, slot: g.slot, range: snapped, decls: [] };
			rule.decls.push( `${ g.prop }: ${ s.value };` );
			rules.set( key, rule );
		}
	}
	out.ledger = out.ledger.filter( Boolean );
	const byNode = new Map();
	for ( const r of rules.values() ) {
		byNode.set( r.node, [ ...( byNode.get( r.node ) || [] ), r ] );
	}
	for ( const [ ref, list ] of byNode ) {
		const rec = list[ 0 ].rec;
		const node = flat[ rec.index ];
		const css = list.map( ( r ) => mediaRule( r.range, `&${ r.slot ? ` ${ r.slot }` : '' } { ${ r.decls.join( ' ' ) } }` ) ).join( ' ' );
		const label = `Step ladder: ${ list.map( ( r ) => `${ r.slot || 'root' } ${ rangeText( r.range ) } ${ r.decls.join( ' ' ) }` ).join( ', ' ) }`;
		for ( const x of scopedCssPuts( node, { css, index: rec.index, why: 'step ladder', label } ) ) {
			const { before, after } = setAttr( node, { attr: x.attr, value: x.value } );
			out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: x.prop, attr: x.attr, before, after, widths: [], how: 'width-gate' } );
		}
		out.notes.push( `${ ref } ${ rec.name }: the draft changes ${ [ ...new Set( list.flatMap( ( r ) => r.decls.map( ( d ) => d.split( ':' )[ 0 ] ) ) ) ].join( ', ' ) } between the read widths, which a per-device setting cannot hold; written as scoped @media rules in Additional CSS (${ list.map( ( r ) => `${ rangeText( r.range ) }` ).join( ', ' ) })` );
	}
	return out;
}
