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

// A slot with its position in a repeated set removed (`.bar > .item:nth-of-type(3) > .link` -> `.bar > .item > .link`): the
// selector of every sibling of the measured one.
const SIBLING_POS = /:nth-(?:of-type|child)\(\d+\)/g;
export const siblingSlot = ( slot ) => slot.replace( SIBLING_POS, '' );

// The measured elements of one setting that share a repeated set, as the rules each needs: when every measured sibling of a set shows the
// same stretches, the rule goes on the whole set (a per-device setting is one block-level attribute, so the unmeasured siblings
// carry the same draft value as the measured ones); a sibling that disagrees keeps its own rule and the set is not generalised.
function placeRules( members ) {
	const sig = ( m ) => JSON.stringify( m.stretches.map( ( x ) => [ x.snapped, x.value ] ) );
	const same = members.every( ( m ) => sig( m ) === sig( members[ 0 ] ) );
	const set = siblingSlot( members[ 0 ].g.slot );
	return same && members[ 0 ].stretches.length && set !== members[ 0 ].g.slot ? [ { ...members[ 0 ], slot: set, covers: members.length } ] : members.map( ( m ) => ( { ...m, slot: m.g.slot, covers: 0 } ) );
}

export function stepRungWrites( { nodes, flat, refOf, reads, writes, scope = '', entries = [], date = new Date().toISOString().slice( 0, 10 ) } ) {
	const out = { writes: [], notes: [], ledger: [] };
	const rules = new Map();
	const sets = new Map();
	for ( const g of written( writes ) ) {
		const hit = rowTarget( { nodes, flat, refOf }, { node: g.node, slot: g.slot } );
		const series = hit ? reads.sweep?.[ hit.target.id ]?.[ g.prop ] : null;
		if ( ! series?.length || ! /^[a-z-]+$/.test( g.prop ) || ! SAFE_SLOT.test( g.slot ) ) {
			continue;
		}
		const tierValue = ( tier ) => reads.widths?.[ TIER_READ[ tier ] ]?.[ hit.target.id ]?.styles?.[ g.prop ];
		const stretches = stepStretches( g.prop, series, tierValue ).filter( ( s ) => SAFE_VALUE.test( s.value ) && ! /url\(|expression|javascript|@import/i.test( s.value ) )
			.map( ( s ) => ( { ...s, snaps: s.range.map( ( edge ) => ( 0 === edge || Infinity === edge ? null : snapThreshold( edge ) ) ) } ) )
			.map( ( s ) => ( { ...s, snapped: s.range.map( ( edge, i ) => ( s.snaps[ i ] ? s.snaps[ i ].tier : edge ) ) } ) );
		const key = `${ g.node }|${ siblingSlot( g.slot ) }|${ g.prop }`;
		sets.set( key, [ ...( sets.get( key ) || [] ), { g, hit, stretches } ] );
	}
	for ( const members of sets.values() ) {
		for ( const m of placeRules( members ) ) {
			for ( const s of m.stretches ) {
				s.snaps.forEach( ( snap, i ) => {
					snap && out.ledger.push( snapEntry( { scope, ref: m.g.node, snap: { draft: s.range[ i ], tier: snap.tier, distance: snap.distance }, entries: [ ...entries, ...out.ledger ], date } ) );
				} );
				// A stretch the snap to a tier absorbs entirely is the tier boundary's: nothing is left to write.
				if ( s.snapped[ 0 ] >= s.snapped[ 1 ] ) {
					continue;
				}
				const key = `${ m.g.node }|${ m.slot }|${ s.snapped.join( '-' ) }`;
				const rule = rules.get( key ) || { node: m.g.node, rec: m.hit.rec, slot: m.slot, range: s.snapped, decls: [], covers: m.covers };
				rule.decls.push( `${ m.g.prop }: ${ s.value };` );
				rules.set( key, rule );
			}
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
		out.notes.push( `${ ref } ${ rec.name }: the draft changes ${ [ ...new Set( list.flatMap( ( r ) => r.decls.map( ( d ) => d.split( ':' )[ 0 ] ) ) ) ].join( ', ' ) } between the read widths, which a per-device setting cannot hold; written as scoped @media rules in Additional CSS (${ list.map( ( r ) => `${ rangeText( r.range ) }${ r.covers ? ` on every sibling of ${ r.covers } measured` : '' }` ).join( ', ' ) })` );
	}
	return out;
}
