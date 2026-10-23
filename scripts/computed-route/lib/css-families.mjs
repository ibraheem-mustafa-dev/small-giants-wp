// CSS shorthand families, derived from mdn-data (FP-1: no hand-written property lists). A family is a shorthand whose
// longhands differ only by an edge, a corner or an axis (`margin` → `margin-top`…, `border-radius` → `border-top-left-radius`…,
// `gap` → `row-gap`/`column-gap`, `overflow` → `overflow-x`/`overflow-y`, `inset` → `top`…, `place-items` → `align-items`/
// `justify-items`). A shorthand whose longhands are different kinds of thing (`outline`, `transition`, `text-decoration`) is a
// `mixed` family: its longhands are known but no one of them holds the shorthand's value, so nothing reaches it from a part
// (the one exception is `VALUE_PRIMARY`).
//
// One key normaliser covers physical and logical spellings: a logical edge or corner (`padding-inline-start`,
// `border-start-start-radius`, `inset-inline`) is its physical equivalent for a horizontal writing mode in `dir`
// (default ltr). A vertical writing mode is not modelled.
import { createRequire } from 'module';

const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );

const CORNERS = [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ];
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const LOGICAL_SIDE = { 'block-start': 'top', 'block-end': 'bottom', 'inline-start': 'left', 'inline-end': 'right' };
const LOGICAL_CORNER = { 'start-start': 'top-left', 'start-end': 'top-right', 'end-start': 'bottom-left', 'end-end': 'bottom-right' };
const AXES = [ 'row', 'column', 'x', 'y', 'align', 'justify' ];
// Longest first, so `block-start` is read before `block` and `top-left` before `top`.
const TOKENS = [ ...CORNERS, ...Object.keys( LOGICAL_CORNER ), ...Object.keys( LOGICAL_SIDE ), ...SIDES, ...AXES ].sort( ( a, b ) => b.length - a.length );
const TOKEN_RE = new RegExp( `(^|-)(${ TOKENS.join( '|' ) })(?=-|$)` );

// The property a longhand's value stands for when the shorthand's own name is not a prefix of it: the one value the
// `text-decoration` settings hold is the line.
const VALUE_PRIMARY = { 'text-decoration-line': 'text-decoration' };

// Whether a name is a CSS property mdn-data knows (a custom property, an attribute name or a pseudo row such as `svg` is not).
export const isCssProperty = ( p ) => p in MDN;

// The longhands a property sets: mdn-data's `computed` list, or where it lists none (`white-space`) the properties its syntax
// is built from (`<'white-space-collapse'> || <'text-wrap-mode'>`).
function subs( p ) {
	const c = MDN[ p ]?.computed;
	if ( Array.isArray( c ) && c.some( ( l ) => l !== p ) ) {
		return c;
	}
	const refs = [ ...String( MDN[ p ]?.syntax ?? '' ).matchAll( /<'([a-z-]+)'>/g ) ].map( ( m ) => m[ 1 ] ).filter( ( n ) => n in MDN && n !== p );
	// A syntax of one reference is an alias (`border-left-color` is `<'border-top-color'>`), not a shorthand.
	return refs.length > 1 ? refs : [];
}
const isShort = ( p ) => subs( p ).length > 0;

const kindOf = ( token ) => ( CORNERS.includes( token ) || token in LOGICAL_CORNER ? 'corner' : ( SIDES.includes( token ) || token in LOGICAL_SIDE ? 'side' : 'axis' ) );

// Reads a longhand name as { template, token } (`border-top-left-radius` → `border-*-radius`, `top-left`), or null.
function templateOf( name ) {
	const m = TOKEN_RE.exec( name );
	return m ? { template: `${ name.slice( 0, m.index + m[ 1 ].length ) }*${ name.slice( m.index + m[ 1 ].length + m[ 2 ].length ) }`, token: m[ 2 ] } : null;
}

let index = null;

// Every family: { short, kind, members: [ { name, token } ] }, and the member → families map.
function families() {
	if ( index ) {
		return index;
	}
	const byMember = new Map();
	const list = [];
	for ( const short of Object.keys( MDN ) ) {
		if ( ! isShort( short ) ) {
			continue;
		}
		const all = subs( short );
		const members = all.filter( ( m ) => ! isShort( m ) );
		const reads = members.map( templateOf );
		if ( members.length < 2 || members.length !== all.length || reads.some( ( r ) => ! r ) || new Set( reads.map( ( r ) => r.template ) ).size > 1 ) {
			if ( members.length > 1 ) {
				// Mixed: the members are different properties of one shorthand.
				const fam = { short, kind: 'mixed', members: members.map( ( name ) => ( { name, token: null } ) ) };
				list.push( fam );
				members.forEach( ( m ) => byMember.set( m, [ ...( byMember.get( m ) || [] ), fam ] ) );
			}
			continue;
		}
		const kind = kindOf( reads[ 0 ].token );
		const order = ( t ) => ( 'corner' === kind ? CORNERS : SIDES ).indexOf( LOGICAL_CORNER[ t ] ?? LOGICAL_SIDE[ t ] ?? t );
		const sorted = members.map( ( name, i ) => ( { name, token: reads[ i ].token } ) );
		// A box family lists its members in CSS order (top, right, bottom, left; top-left clockwise), which mdn-data does not.
		'axis' !== kind && sorted.sort( ( a, b ) => order( a.token ) - order( b.token ) );
		const fam = { short, kind, members: sorted };
		list.push( fam );
		members.forEach( ( m ) => byMember.set( m, [ ...( byMember.get( m ) || [] ), fam ] ) );
	}
	index = { list, byMember };
	return index;
}

// A logical longhand as its physical longhand (`margin-inline-start` → `margin-left`, `inset-block-end` → `bottom`,
// `border-start-end-radius` → `border-top-right-radius`); any other name as itself.
export function physicalOf( prop, dir = 'ltr' ) {
	const flip = ( side ) => ( 'rtl' === dir ? { left: 'right', right: 'left' }[ side ] ?? side : side );
	for ( const [ token, corner ] of Object.entries( LOGICAL_CORNER ) ) {
		if ( new RegExp( `(^|-)${ token }(?=-|$)` ).test( prop ) ) {
			const [ v, h ] = corner.split( '-' );
			return prop.replace( token, `${ v }-${ flip( h ) }` );
		}
	}
	for ( const [ token, side ] of Object.entries( LOGICAL_SIDE ) ) {
		const m = new RegExp( `(^|-)${ token }(?=-|$)` ).exec( prop );
		if ( m ) {
			const out = prop.replace( token, flip( side ) );
			return /^inset-(top|right|bottom|left)$/.test( out ) ? out.slice( 6 ) : out;
		}
	}
	return prop;
}

// The physical longhands a property sets, for a logical shorthand too (`margin-block` → margin-top, margin-bottom); a
// longhand is itself, a physical shorthand its members.
export function expand( prop, dir = 'ltr' ) {
	const physical = physicalOf( prop, dir );
	if ( physical !== prop ) {
		return [ physical ];
	}
	if ( isShort( prop ) ) {
		return subs( prop ).flatMap( ( m ) => ( isShort( m ) ? expand( m, dir ) : [ physicalOf( m, dir ) ] ) );
	}
	return [ prop ];
}

// The family a longhand belongs to: { short, kind: 'side' | 'corner' | 'axis' | 'mixed', part (the edge, corner or axis;
// null for mixed), members (physical longhand names; null for mixed) }, or null when it belongs to none. A longhand in two
// families (`border-top-width`: `border-width` and the mixed `border-top`) takes the box family.
export function familyOf( prop, { dir = 'ltr' } = {} ) {
	const physical = physicalOf( prop, dir );
	const found = families().byMember.get( physical ) || [];
	const fam = found.find( ( f ) => 'mixed' !== f.kind ) || found[ 0 ];
	if ( ! fam ) {
		return null;
	}
	if ( 'mixed' === fam.kind ) {
		return { short: fam.short, kind: 'mixed', part: null, members: null };
	}
	return { short: fam.short, kind: fam.kind, part: fam.members.find( ( m ) => m.name === physical ).token, members: fam.members.map( ( m ) => m.name ) };
}

// The shorthand a longhand's value is held under, or the property itself. Edge and corner families, and the row/column
// gap pair, have one: a setting for `padding` holds `padding-top`'s value as the top side. The other axis pairs
// (`overflow-x`, `align-items`) are standalone properties with settings of their own, so they keep their name here and
// reach their shorthand only through `reachedBy`.
export function settingKey( prop, opts = {} ) {
	const fam = familyOf( prop, opts );
	if ( fam && 'mixed' !== fam.kind && ( 'axis' !== fam.kind || /^(row|column)$/.test( fam.part ) ) ) {
		return fam.short;
	}
	return VALUE_PRIMARY[ prop ] ?? prop;
}

// The names under which a stored css_property can be the home of a draft property: itself, its physical spelling, and
// the shorthand of its (non-mixed) family.
export function reachedBy( prop, opts = {} ) {
	const fam = familyOf( prop, opts );
	return [ ...new Set( [ prop, physicalOf( prop, opts.dir ), ...( fam && 'mixed' !== fam.kind ? [ fam.short ] : [] ), ...( VALUE_PRIMARY[ prop ] ? [ VALUE_PRIMARY[ prop ] ] : [] ) ] ) ];
}

// A stored css_property as the names it can be matched by: itself and its physical spelling.
export const storedKeys = ( stored, opts = {} ) => [ ...new Set( [ stored, physicalOf( stored, opts.dir ) ] ) ];

// The family members in the shorthand's own order, for a shorthand name (`border-radius` → the four corners clockwise from
// the top left); null when `short` is no non-mixed family.
export function membersOf( short ) {
	const fam = families().list.find( ( f ) => f.short === short && 'mixed' !== f.kind );
	return fam ? fam.members.map( ( m ) => m.name ) : null;
}

// The shorthand's CSS serialisation of its parts. parts: { [member longhand]: value } — all must be given for a value.
// Returns { equal, value (the one value when every part is equal), css (the shorthand, 1 to 4 values for a box family, 1 or
// 2 for an axis pair), distinct (the different values), missing (members not given) }.
export function foldParts( short, parts ) {
	const members = membersOf( short );
	if ( ! members ) {
		return null;
	}
	const given = members.filter( ( m ) => undefined !== parts[ m ] && null !== parts[ m ] );
	const missing = members.filter( ( m ) => ! given.includes( m ) );
	const values = given.map( ( m ) => String( parts[ m ] ).trim() );
	const distinct = [ ...new Set( values ) ];
	const out = { equal: given.length > 0 && 1 === distinct.length, value: 1 === distinct.length ? distinct[ 0 ] : undefined, distinct, missing, css: null };
	if ( ! missing.length ) {
		const v = members.map( ( m ) => String( parts[ m ] ).trim() );
		if ( 4 === v.length ) {
			const [ a, b, c, d ] = v;
			out.css = a === c && b === d ? ( a === b ? a : `${ a } ${ b }` ) : ( b === d ? `${ a } ${ b } ${ c }` : v.join( ' ' ) );
		} else {
			out.css = v[ 0 ] === v[ 1 ] ? v[ 0 ] : v.join( ' ' );
		}
	}
	return out;
}

// A shorthand value split into its members' values (the inverse of foldParts), or null when it is not 1 to 4 plain
// space-separated values (a `/` elliptical radius, a function) or `short` is no non-mixed family.
export function unfoldValue( short, css ) {
	const members = membersOf( short );
	const v = String( css ?? '' ).trim().split( /\s+(?![^(]*\))/ ).filter( Boolean );
	if ( ! members || ! v.length || v.length > members.length || v.some( ( x ) => '/' === x ) || String( css ).includes( '/' ) ) {
		return null;
	}
	const [ a, b = a, c = a, d = b ] = v;
	const list = 4 === members.length ? [ a, b, c, d ] : [ a, b ];
	return Object.fromEntries( members.map( ( m, i ) => [ m, list[ i ] ] ) );
}

// A paint ({ prop: value }) with each family completed both ways: a shorthand present and its members absent gains the
// members; every member present and the shorthand absent gains the shorthand. Values already present are kept.
export function completePaint( paint ) {
	const out = { ...paint };
	for ( const fam of families().list.filter( ( f ) => 'mixed' !== f.kind ) ) {
		const names = fam.members.map( ( m ) => m.name );
		if ( undefined !== out[ fam.short ] && names.some( ( n ) => undefined === out[ n ] ) ) {
			const parts = unfoldValue( fam.short, out[ fam.short ] );
			parts && names.forEach( ( n ) => undefined === out[ n ] && ( out[ n ] = parts[ n ] ) );
		} else if ( undefined === out[ fam.short ] && names.every( ( n ) => undefined !== out[ n ] ) ) {
			out[ fam.short ] = foldParts( fam.short, out ).css;
		}
	}
	return out;
}

// The key a box setting stores a part under: a side is itself, a corner is camel case (`top-left` → `topLeft`).
export const partKey = ( token ) => token.replace( /-([a-z])/g, ( _, c ) => c.toUpperCase() );
