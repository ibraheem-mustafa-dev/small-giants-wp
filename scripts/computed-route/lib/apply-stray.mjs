// Effects and hovers that belong to another element. A paired block whose saved sgsMotion carries a script effect (parallax, glare,
// magnet, sheen, ripple, ...) or a hover pose (scale, lift, turn) is carrying another element's effect when the draft record that gives
// it is found and belongs to a different paired element: a wrapper, child or sibling that another pair holds, or a record whose hook
// selector names another element. Only that is removed. "No record found" is not proof the draft has no effect (parts, other surfaces'
// records and stylesheet rules are not all in the record set), so an effect with no record found at all is kept and reported
// `unchecked`. An effect counts only when the draft's own scripts build that kind of effect somewhere (the names
// lib/motion-behaviours.mjs::recogniseBehaviour finds across every record).
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { MOTION_LOOKS } from './apply-hover.mjs';
import { carriesHook, recordsFor } from './apply-records.mjs';
import { idOfTpl } from './apply-owned.mjs';
import { parseColour, toHex } from './normalise.mjs';

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
const idsOf = ( r ) => [].concat( r.element?.template_tpl_id ?? [] ).map( Number );

// What the draft gives to other elements near this one: { effects: names, pose: whether a hover pose is another element's }. A record is
// another element's when it names none of this element's own draft ids (its tpl and the ids its node owns), sits on an id this
// element reaches, and either another pair holds that id or its hook selector names an element this one is not.
export function foreignEffects( { target, surface, recordsIndex, records, facts } ) {
	const own = new Set( [ idOfTpl( target.tpl ), ...( target.owns || [] ) ] );
	const held = new Set( ( surface?.pairs || [] ).filter( ( p ) => p.ref !== target.ref ).flatMap( ( p ) => [ idOfTpl( p.tpl ), ...( p.owns || [] ) ] ) );
	// `held`/`heldPose`: the records another pair's id holds. A record only its hook selector sends elsewhere may be a part of this block
	// (the hero's photo frame is the hero's own split-media part), so a declared part counts the held ones alone.
	const out = { effects: new Set(), held: new Set(), pose: false, heldPose: false };
	for ( const id of ( target.reach || [] ).filter( ( x ) => ! own.has( x ) ) ) {
		for ( const r of recordsFor( recordsIndex, `Root/${ id }#0` ).filter( ( x ) => ! idsOf( x ).some( ( i ) => own.has( i ) ) && ( held.has( id ) || ! carriesHook( x, facts ) ) ) ) {
			const b = recogniseBehaviour( r, { records } );
			'effect' === b?.kind && b.effects.forEach( ( e ) => ( out.effects.add( e.effect ), held.has( id ) && out.held.add( e.effect ) ) );
			out.pose ||= holdsPose( r );
			out.heldPose ||= held.has( id ) && holdsPose( r );
		}
	}
	return out;
}

// Removes from doc.elements[ part ] the effects and hover pose that another element's record gives. `wanted`: the effect names this
// element's own records recognise; `recs`: those records; `foreign`: foreignEffects(). Returns { whys: removals, unchecked: rows }.
export function strayRemovals( { doc, part, wanted, recs, records, foreign } ) {
	const out = { whys: [], unchecked: [] };
	const el = doc.elements?.[ part ];
	if ( ! el || ! records?.length ) {
		return out;
	}
	const draft = draftEffectNames( records );
	const seen = 'root' === part ? foreign : foreign && { effects: foreign.held, pose: foreign.heldPose };
	const drop = ( list, where ) => ( list || [] ).filter( ( l ) => {
		if ( ! draft.has( l.effect ) || wanted.has( l.effect ) ) {
			return true;
		}
		if ( seen?.effects.has( l.effect ) ) {
			out.whys.push( `${ part } ${ where }${ l.effect } removed: the draft record that gives it belongs to another element` );
			return false;
		}
		out.unchecked.push( { status: 'unchecked', prop: `${ where }${ l.effect }`, why: `effect with no draft record found: ${ part } ${ where }${ l.effect }` } );
		return true;
	} );
	if ( Array.isArray( el.effects ) ) {
		el.effects = drop( el.effects, '' );
		el.effects.length || delete el.effects;
	}
	if ( Array.isArray( el.hover?.effects ) ) {
		el.hover.effects = drop( el.hover.effects, 'hover ' );
		el.hover.effects.length || delete el.hover.effects;
	}
	const values = el.hover?.state?.values;
	const pose = Object.keys( values ?? {} ).filter( ( k ) => POSE.test( k ) );
	if ( pose.length && ! recs.some( holdsPose ) ) {
		if ( seen?.pose ) {
			const left = Object.fromEntries( Object.entries( values ).filter( ( [ k ] ) => ! POSE.test( k ) ) );
			out.whys.push( `${ part } hover pose ${ pose.join( ', ' ) } removed: the draft hover record that gives it belongs to another element` );
			// Timing alone paints nothing.
			Object.keys( left ).some( ( k ) => ! [ 'duration', 'easing', 'delay' ].includes( k ) ) ? ( el.hover.state.values = left ) : delete el.hover.state;
		} else {
			out.unchecked.push( { status: 'unchecked', prop: 'hover pose', why: `effect with no draft record found: ${ part } hover pose ${ pose.join( ', ' ) }` } );
		}
	}
	if ( el.hover && ! Object.keys( el.hover ).length ) {
		delete el.hover;
	}
	return out;
}

// Hover settings the draft lacks. A hover setting is written only from a draft hover record that targets the element, but "no record
// found" is not proof the draft has no hover (parts, other surfaces' records and stylesheet hovers are not all in the record set), so
// only what is proven is removed. For a paired block whose own draft elements (its tpl, the ids its node owns, the ids it reaches that
// no other pair holds) hold no hover record:
//   - a stored text hover colour equal to the element's own resting colour at every width read is a copied-in no-op that blocks an
//     ancestor's hover: removed;
//   - any other hover setting on the block's own element (shadow, border, background, lift, a colour that differs from rest) is an
//     `unchecked` row naming the settings;
//   - a part or element-prefixed hover (a setting whose element is not the wrapper, or named number*, drawer*, caption*, header*, icon*)
//     is never touched here.
const PART_NAMED = /^(?:number|drawer|caption|header|icon)[A-Z]/;
const colourOf = ( value, snapshot ) => {
	const held = snapshot?.palette?.find( ( t ) => t.slug === value )?.colour ?? parseColour( value );
	return held ? toHex( held ) : null;
};

export function strayHovers( { target, block, saved, surface, recordsIndex, db, draft, live, snapshot } ) {
	if ( ! db || ! block || target.slot || ! draft?.[ 1440 ] ) {
		return [];
	}
	const held = new Set( ( surface?.pairs || [] ).filter( ( p ) => p.ref !== target.ref ).flatMap( ( p ) => [ idOfTpl( p.tpl ), ...( p.owns || [] ) ] ) );
	const ids = [ idOfTpl( target.tpl ), ...( target.owns || [] ), ...( target.reach || [] ).filter( ( id ) => ! held.has( id ) ) ];
	if ( ids.some( ( id ) => recordsFor( recordsIndex, `Root/${ id }#0` ).some( ( r ) => 'hover' === r.trigger?.type ) ) ) {
		return [];
	}
	const filled = ( v ) => undefined !== v && null !== v && '' !== v && false !== v && ! ( v && 'object' === typeof v && ! Object.keys( v ).length );
	const rows = db.prepare( "SELECT attr_name, css_property, css_element FROM block_attributes WHERE block_slug = ? AND css_state = 'hover'" ).all( block )
		.filter( ( r ) => ( ! r.css_element || 'wrapper' === r.css_element ) && ! PART_NAMED.test( r.attr_name ) && filled( saved?.[ r.attr_name ] ) );
	const rest = [ 1440, 768, 375 ].map( ( w ) => live?.[ w ]?.styles?.color ).filter( Boolean ).map( ( c ) => colourOf( c ) );
	const noop = ( r ) => 'color' === r.css_property && rest.length > 0 && 'string' === typeof saved[ r.attr_name ] && rest.every( ( c ) => c && c === colourOf( saved[ r.attr_name ], snapshot ) );
	const remove = rows.filter( noop ).map( ( r ) => r.attr_name );
	const review = rows.filter( ( r ) => ! noop( r ) ).map( ( r ) => r.attr_name );
	return [
		...( remove.length ? [ { status: 'op', prop: 'stray hover', state: 'hover', why: `${ target.tpl } has no hover record in the draft and ${ remove.join( ', ' ) } repeats its resting colour, which only blocks an ancestor's hover: removed`, writes: remove.map( ( attr ) => ( { attr, unset: true } ) ), checks: [] } ] : [] ),
		...( review.length ? [ { status: 'unchecked', prop: 'stray hover', state: 'hover', why: `hover with no draft record found: ${ review.join( ', ' ) }` } ] : [] ),
	];
}
