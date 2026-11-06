// Which motion target (the block's root or a part its motion_targets name) each draft animate call belongs to. A call on the
// paired element itself is the root's. A call that lands on a descendant of a hero belongs to the hero's media part: the
// frame (`split-media`) for the outer element and every loop, the image (`split-image`) for the innermost one-shot, or the
// single `media` part where the hero is not a split. The part names come from the framework DB (lib/motion-db.mjs::targetsOf).
import { endless } from './apply-motion-calls.mjs';

const WIDTHS = [ 1440, 768, 375 ];
const empty = () => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { one: [], loops: [], inner: [] } ] ) );

// { part: { calls: { width: { one, loops, inner } }, tpls: Set } } for a target's calls.
export function splitParts( { block, saved, mdb, calls } ) {
	const names = new Set( mdb.targetsOf( block ).map( ( t ) => t.target ) );
	const parts = { root: { calls, tpls: new Set() } };
	const inner = WIDTHS.flatMap( ( w ) => ( calls[ w ]?.inner || [] ).map( ( c ) => ( { w, c } ) ) ).filter( ( { c } ) => c.tpl );
	if ( ! inner.length || ! [ 'media', 'split-media', 'split-image' ].some( ( n ) => names.has( n ) ) || ! block.endsWith( '/hero' ) ) {
		return parts;
	}
	const split = 'split' === saved.variant && names.has( 'split-media' );
	const oneShot = [ ...new Set( inner.filter( ( { c } ) => ! endless( c ) ).map( ( { c } ) => Number( c.tpl ) ) ) ].filter( Number.isFinite ).sort( ( a, b ) => a - b );
	const imageTpl = split && names.has( 'split-image' ) && oneShot.length > 1 ? oneShot[ oneShot.length - 1 ] : null;
	for ( const { w, c } of inner ) {
		const name = split ? ( Number( c.tpl ) === imageTpl ? 'split-image' : 'split-media' ) : ( names.has( 'media' ) ? 'media' : null );
		if ( ! name ) {
			continue;
		}
		parts[ name ] ??= { calls: empty(), tpls: new Set() };
		parts[ name ].calls[ w ][ endless( c ) ? 'loops' : 'one' ].push( c );
		parts[ name ].tpls.add( c.tpl );
	}
	parts.root = { calls: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { ...( calls[ w ] || { one: [], loops: [] } ), inner: [] } ] ) ), tpls: new Set() };
	return parts;
}
