// Which motion target (the block's root or a part its motion_targets name) each draft animate call belongs to. A call
// on the paired element itself is the root's. A call that lands on a descendant of a hero belongs to the hero's media
// parts: in a split hero the outer element (the frame) is the `media` column (`.sgs-hero__media`), and every loop stays on
// `split-media` (the media node, where the block's parallax and float settings sit); the innermost one-shot is the
// image, `split-image`. `split-media` and `split-image` are two classes of one element, so a frame entrance saved on
// either competes with the image's own; a hero that is not a split has the single `media` part. The part names come from
// the framework DB (lib/motion-db.mjs::targetsOf).
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
	// The frame's one-shot goes to the media column where the block offers it; its tpls also stay on split-media so the media
	// node's behaviours (parallax) still find their records.
	const frame = split && names.has( 'media' );
	for ( const { w, c } of inner ) {
		const image = split && Number( c.tpl ) === imageTpl;
		const name = split ? ( image ? 'split-image' : ( frame && ! endless( c ) ? 'media' : 'split-media' ) ) : ( names.has( 'media' ) ? 'media' : null );
		if ( ! name ) {
			continue;
		}
		parts[ name ] ??= { calls: empty(), tpls: new Set(), ...( 'media' === name && split ? { entranceOnly: true } : {} ) };
		parts[ name ].calls[ w ][ endless( c ) ? 'loops' : 'one' ].push( c );
		parts[ name ].tpls.add( c.tpl );
		if ( 'media' === name && split ) {
			parts[ 'split-media' ] ??= { calls: empty(), tpls: new Set() };
			parts[ 'split-media' ].tpls.add( c.tpl );
		}
	}
	parts.root = { calls: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { ...( calls[ w ] || { one: [], loops: [] } ), inner: [] } ] ) ), tpls: new Set() };
	return parts;
}
