// Effects the draft lacks. A paired block whose saved sgsMotion carries a script effect (parallax, tilt, glare, magnet, sheen,
// ripple) or a hover pose (scale, lift, turn) that no draft record of its own elements gives is carrying another element's effect
// (a record once taken from a neighbour). The writer removes it. An effect counts only when the draft's own scripts build that kind
// of effect somewhere (the names lib/motion-behaviours.mjs::recogniseBehaviour finds across every record), so an effect the draft
// never mentions is left to its author.
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { MOTION_LOOKS } from './apply-hover.mjs';
import { recordsFor } from './apply-records.mjs';
import { idOfTpl } from './apply-owned.mjs';

const names = new WeakMap();

// The effect names the draft's scripts build, over the whole inventory.
export function draftEffectNames( records ) {
	if ( ! names.has( records ) ) {
		const out = new Set();
		for ( const r of records || [] ) {
			const b = recogniseBehaviour( r, { records } );
			'effect' === b?.kind && b.effects.forEach( ( e ) => out.add( e.effect ) );
		}
		names.set( records, out );
	}
	return names.get( records );
}

const POSE = /^(?:scale|translate[XYZ]?|rotate[XYZ]?|skew[XY]?)$/;
const holdsPose = ( r ) => 'hover' === r.trigger?.type && ( r.properties || [] ).some( ( p ) => MOTION_LOOKS.includes( p.property ) && null !== p.to && undefined !== p.to );

// Removes from doc.elements[ part ] every effect and hover pose the draft's records for this element do not give.
// `wanted`: the effect names the element's own records recognise; `recs`: those records. Returns the reasons, one per removal.
export function strayRemovals( { doc, part, wanted, recs, records } ) {
	const el = doc.elements?.[ part ];
	if ( ! el ) {
		return [];
	}
	if ( ! records?.length ) {
		return [];
	}
	const draft = draftEffectNames( records );
	const whys = [];
	const drop = ( list, where ) => {
		const keep = ( list || [] ).filter( ( l ) => ! draft.has( l.effect ) || wanted.has( l.effect ) );
		( list || [] ).filter( ( l ) => ! keep.includes( l ) ).forEach( ( l ) => whys.push( `${ part } ${ where }${ l.effect } removed: no draft record of this element gives it` ) );
		return keep;
	};
	if ( Array.isArray( el.effects ) ) {
		el.effects = drop( el.effects, '' );
		el.effects.length || delete el.effects;
	}
	if ( Array.isArray( el.hover?.effects ) ) {
		el.hover.effects = drop( el.hover.effects, 'hover ' );
		el.hover.effects.length || delete el.hover.effects;
	}
	const values = el.hover?.state?.values;
	if ( values && ! recs.some( holdsPose ) && Object.keys( values ).some( ( k ) => POSE.test( k ) ) ) {
		const left = Object.fromEntries( Object.entries( values ).filter( ( [ k ] ) => ! POSE.test( k ) ) );
		whys.push( `${ part } hover pose ${ JSON.stringify( Object.fromEntries( Object.entries( values ).filter( ( [ k ] ) => POSE.test( k ) ) ) ) } removed: the draft element does not move on hover` );
		// Timing alone paints nothing.
		const paints = Object.keys( left ).some( ( k ) => ! [ 'duration', 'easing', 'delay' ].includes( k ) );
		paints ? ( el.hover.state.values = left ) : delete el.hover.state;
	}
	if ( el.hover && ! Object.keys( el.hover ).length ) {
		delete el.hover;
	}
	return whys;
}

// Hover settings the draft lacks. A hover setting (colour, background, border, shadow, pose, on any element) is written only from a
// draft hover record that targets that element; a paired block whose own draft elements hold no hover record carries none, whatever
// its ancestors do on hover (a card is one connected hover, its children have no hover state of their own). The elements are the
// block's own tpl, the ids its node owns and the ids it reaches that no other pair holds. Returns one op item that unsets every stored
// hover setting (`css_state` hover in the framework DB), or [].
export function strayHovers( { target, block, saved, surface, recordsIndex, db, draft } ) {
	if ( ! db || ! block || target.slot || ! draft?.[ 1440 ] ) {
		return [];
	}
	const held = new Set( ( surface?.pairs || [] ).filter( ( p ) => p.ref !== target.ref ).flatMap( ( p ) => [ idOfTpl( p.tpl ), ...( p.owns || [] ) ] ) );
	const ids = [ idOfTpl( target.tpl ), ...( target.owns || [] ), ...( target.reach || [] ).filter( ( id ) => ! held.has( id ) ) ];
	if ( ids.some( ( id ) => recordsFor( recordsIndex, `Root/${ id }#0` ).some( ( r ) => 'hover' === r.trigger?.type ) ) ) {
		return [];
	}
	const filled = ( v ) => undefined !== v && null !== v && '' !== v && false !== v && ! ( v && 'object' === typeof v && ! Object.keys( v ).length );
	const attrs = db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND css_state = 'hover'" ).all( block ).map( ( r ) => r.attr_name ).filter( ( a ) => filled( saved?.[ a ] ) );
	return attrs.length ? [ { status: 'op', prop: 'stray hover', state: 'hover', why: `${ target.tpl } has no hover record in the draft, so ${ attrs.join( ', ' ) } ${ 1 === attrs.length ? 'is' : 'are' } removed`, writes: attrs.map( ( attr ) => ( { attr, unset: true } ) ), checks: [] } ] : [];
}
