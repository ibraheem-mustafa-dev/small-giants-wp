// Layer 4 of the equivalence engine (Spec 48 FR-48-86): the setting's measured effect replaces its declared name.
// Calibration (lib/calibrate.mjs) records, per setting, the computed longhand it paints and the part it paints it on
// (`property`, `slots`, `reaches`), the other longhands it changed as a side effect (`effects`, "part|longhand"), and, for a
// setting with no css_property, what each of its values changed (`discovered`). A draft longhand is matched against every
// one of those under each of its spellings (lib/css-families.mjs: itself, its standard name, its shorthands, its
// longhands), the shared extensions included (wrapper, typography, sgsChildSizing, the visibility toggles, sgsMotion,
// sticky): they are calibrated like any other setting. A value is written only where calibration measured it (a
// discovered value equal to the draft at every width the draft and the measurement share); a setting whose effect reaches
// the longhand but whose emitted value nothing predicts (FR-48-76) is named as the home, never written.
import { canonicalName, shorthandsOf, longhandsOf, physicalOf, expand } from '../css-families.mjs';
import { attrsFor, listedProperties } from '../db.mjs';
import { projectLonghand, sameCanonical } from './values.mjs';

export const WIDTHS = [ 375, 768, 1440 ];

// A part path without its :nth-of-type steps (the rule of lib/resolve.mjs::LOOSE), for a setting of an enclosing block.
const loosen = ( p ) => String( p ?? '' ).replace( /:nth-of-type\(\d+\)/g, '' );
const pathKey = ( anyIndex ) => ( p ) => ( anyIndex ? loosen( p ) : String( p ?? '' ) );

// Every name the paint of `prop` can be recorded under: itself, its standard and physical names, its shorthands (nearest
// first) and its longhands.
export function spellingsOf( prop ) {
	const canon = canonicalName( prop );
	return [ ...new Set( [ prop, canon, physicalOf( canon ), ...shorthandsOf( canon ), ...longhandsOf( canon ) ] ) ];
}

// The block's calibrated default paint of `prop` on one part at one width, read through the spelling layer: the
// longhand's own reading, else its value inside a recorded shorthand. Returns { value, via }, { value: undefined, raw,
// via } for a shorthand recorded in a form the longhand cannot be read from (the paint is measured but unread), or
// undefined when no spelling of the property was measured.
export function paintAt( calibration, slot, prop, w, anyIndex = false ) {
	const key = pathKey( anyIndex );
	const elements = calibration?.elements || {};
	const at = Object.keys( elements ).find( ( k ) => key( k ) === key( slot ) );
	const styles = undefined === at ? null : elements[ at ]?.[ w ];
	if ( ! styles ) {
		return undefined;
	}
	const canon = physicalOf( canonicalName( prop ) );
	for ( const name of [ ...new Set( [ prop, canon ] ) ] ) {
		if ( undefined !== styles[ name ] ) {
			return { value: styles[ name ], via: name };
		}
	}
	let unread;
	for ( const short of shorthandsOf( canon ) ) {
		if ( undefined !== styles[ short ] ) {
			const value = projectLonghand( short, styles[ short ], canon );
			if ( undefined !== value ) {
				return { value, via: short };
			}
			unread ??= { value: undefined, raw: styles[ short ], via: short };
		}
	}
	return unread;
}

// Whether a stored property list (a calibrated `property`, comma-separated) paints one of the spellings.
const paintsAny = ( stored, names ) => String( stored ?? '' ).split( ',' ).map( ( s ) => s.trim() ).filter( Boolean ).flatMap( ( s ) => [ s, ...expand( s ) ] ).some( ( s ) => names.includes( s ) );

// Every setting whose measured effect reaches `prop` on `slot` in `state`: [ { attr, via: 'property' | 'reaches' |
// 'effect' | 'discovered', name (the spelling it was found under) } ], strongest evidence first.
export function measuredHomes( calibration, { slot, prop, state = null, anyIndex = false } ) {
	const key = pathKey( anyIndex );
	const names = spellingsOf( prop );
	const out = [];
	for ( const [ attr, c ] of Object.entries( calibration?.settings || {} ) ) {
		if ( ( c.state ?? null ) !== ( state || null ) ) {
			continue;
		}
		const own = ( c.slots || [ c.slot ] ).map( key ).includes( key( slot ) );
		const reached = ( c.reaches || [] ).map( key ).includes( key( slot ) );
		const name = names.find( ( n ) => paintsAny( c.property, [ n ] ) );
		if ( name && ( own || reached ) ) {
			out.push( { attr, via: own ? 'property' : 'reaches', name } );
			continue;
		}
		const effect = ( c.effects || [] ).map( ( e ) => [ e.slice( 0, e.lastIndexOf( '|' ) ), e.slice( e.lastIndexOf( '|' ) + 1 ) ] ).find( ( [ p, l ] ) => key( p ) === key( slot ) && names.includes( l ) );
		if ( effect ) {
			out.push( { attr, via: 'effect', name: effect[ 1 ] } );
		}
	}
	for ( const [ attr, props ] of Object.entries( calibration?.discovered || {} ) ) {
		const name = names.find( ( n ) => props[ n ] && ( props[ n ].slots || [] ).map( key ).includes( key( slot ) ) && ( props[ n ].state ?? null ) === ( state || null ) );
		name && out.push( { attr, via: 'discovered', name } );
	}
	const rank = { property: 0, discovered: 1, reaches: 2, effect: 3 };
	return out.sort( ( a, b ) => rank[ a.via ] - rank[ b.via ] || a.attr.localeCompare( b.attr ) );
}

// A discovered setting value whose measured paint of `prop` on `slot` equals the draft (layer 2's comparison) at every
// width both state, read under each spelling the discovery recorded (a shorthand's values projected onto the longhand).
// Returns { attr, value, name } for one match, { ambiguous: [ 'attr=value' ] } for several, or null.
export function discoveredWrite( calibration, { slot, prop, perWidth, state = null, anyIndex = false } ) {
	const key = pathKey( anyIndex );
	const canon = physicalOf( canonicalName( prop ) );
	const names = [ ...new Set( [ prop, canon, ...shorthandsOf( canon ) ] ) ];
	const hits = [];
	for ( const [ attr, props ] of Object.entries( calibration?.discovered || {} ) ) {
		for ( const name of names ) {
			const d = props[ name ];
			if ( ! d || 'tier_object' === d.tier || ! ( d.slots || [] ).map( key ).includes( key( slot ) ) || ( d.state ?? null ) !== ( state || null ) ) {
				continue;
			}
			for ( const [ value, values ] of Object.entries( d.values || {} ) ) {
				const ws = WIDTHS.filter( ( w ) => undefined !== perWidth[ w ] && undefined !== values[ w ] );
				const read = ( w ) => ( name === prop || name === canon ? values[ w ] : projectLonghand( name, values[ w ], canon ) );
				if ( ws.length && ws.every( ( w ) => sameCanonical( canon, perWidth[ w ], read( w ) ) ) ) {
					hits.push( { attr, value, name } );
				}
			}
		}
	}
	const distinct = [ ...new Map( hits.map( ( h ) => [ `${ h.attr }=${ h.value }`, h ] ) ).values() ];
	if ( ! distinct.length ) {
		return null;
	}
	return 1 === distinct.length ? distinct[ 0 ] : { ambiguous: distinct.map( ( h ) => `${ h.attr }=${ h.value }` ) };
}

// The timing longhands timingHome answers for.
export const TIMING_LONGHANDS = [ 'transition-duration', 'transition-timing-function', 'transition-delay', 'animation-duration', 'animation-timing-function', 'animation-delay' ];

// Which setting holds a timing longhand on one part of a block (the transitions-per-property lane's question). ctx:
// { calibration, db }. Calibrated evidence first (the setting's own property, a discovered value set, a reach, a side
// effect), then a framework DB row whose css_property names the longhand (`anim:duration` is animation-duration) and that
// calibration has not placed elsewhere. Returns { attr, via, all: [ every setting whose effect reaches it ] } or null
// when no setting holds it.
export function timingHome( { block, slot, longhand, state = null, anyIndex = false }, { calibration, db } ) {
	if ( ! TIMING_LONGHANDS.includes( longhand ) ) {
		throw new Error( `timingHome answers for ${ TIMING_LONGHANDS.join( ', ' ) }, not ${ longhand }` );
	}
	const all = measuredHomes( calibration, { slot, prop: longhand, state, anyIndex } );
	if ( db ) {
		for ( const r of attrsFor( db, block ) ) {
			const placed = calibration?.settings?.[ r.attr_name ];
			if ( ( r.css_state || null ) === ( state || null ) && ! placed && ! all.some( ( h ) => h.attr === r.attr_name ) && listedProperties( r.css_property ).some( ( p ) => spellingsOf( longhand ).includes( p ) ) ) {
				all.push( { attr: r.attr_name, via: 'declared', name: r.css_property } );
			}
		}
	}
	// A side effect or a reach changes the timing without holding its value (another setting's marker re-timed the part),
	// so only a setting that paints the longhand itself, a discovered value set or a declared row holds it.
	const holder = all.find( ( h ) => ! [ 'effect', 'reaches' ].includes( h.via ) );
	return holder ? { attr: holder.attr, via: holder.via, all } : null;
}
