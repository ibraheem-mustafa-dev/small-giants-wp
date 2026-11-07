// Per-property duration and easing of a state's records (hover, focus), against the block's timing settings for that state
// (block_attributes rows for transition-duration / transition-timing-function). A block with one value per state takes a
// record whose properties share one duration; properties with different durations are reported, never averaged.
import { candidates } from './db.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { stateItem } from './apply-state-resolve.mjs';

export const TIMED = [ [ 'transition-duration', ( ms ) => `${ ms }ms`, 'duration_ms' ], [ 'transition-timing-function', ( v ) => v, 'easing' ] ];
export const TIMED_PROPS = TIMED.map( ( [ prop ] ) => prop );

export function timingItems( ctx ) {
	const { target, recordsIndex, db, block, calFor } = ctx;
	const items = [];
	const records = recordsFor( recordsIndex, target.tpl );
	// A record whose properties change with the block's own state (aria, class) times them as a resting transition.
	const timed = ( r ) => ( r.properties || [] ).map( ( x ) => ( { duration_ms: 'number' === typeof x.duration_ms ? x.duration_ms : r.duration_ms, easing: x.easing ?? r.easing ?? null } ) );
	for ( const state of [ 'hover', 'focus', 'state' ] ) {
		const looks = 'state' === state
			? records.filter( ( r ) => 'state' === r.trigger?.type && 'css-transition' === r.mechanism ).flatMap( timed )
			: records.map( stateLook ).filter( ( l ) => state === l?.state ).flatMap( ( l ) => l.looks );
		for ( const [ prop, fmt, key ] of TIMED ) {
			const values = [ ...new Set( looks.map( ( l ) => l[ key ] ).filter( ( v ) => null !== v && undefined !== v ) ) ];
			if ( ! values.length ) {
				continue;
			}
			const label = 'state' === state ? `state-transition ${ prop }` : `${ state } ${ prop }`;
			const row = candidates( db, block, prop, 'state' === state ? null : state )[ 0 ];
			if ( ! row ) {
				items.push( { status: 'no-setting', prop: label, state, why: `${ block } has no ${ state } ${ prop } setting; the records give ${ values.join( ', ' ) }` } );
			} else if ( values.length > 1 ) {
				items.push( { status: 'no-setting', prop: label, state, why: `the records give ${ values.join( ', ' ) } for different properties; ${ row.attr_name } holds one value` } );
			} else {
				items.push( stateItem( { ctx, prop, value: fmt( values[ 0 ] ), state: 'state' === state ? null : state, slot: calFor( block )?.settings?.[ row.attr_name ]?.slot ?? '', label } ) );
			}
		}
	}
	return items;
}
