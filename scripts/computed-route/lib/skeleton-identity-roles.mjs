// The meaning an element carries, for identification by elimination (Spec 48 §3.4, FR-48-6; plan F1, Bean 2026-10-30):
// facts are compared by role, never by literal tag. Read from the pinned `aria-query` package (the WAI-ARIA and HTML-AAM
// data), never a hand list:
//   - an element's role is its explicit `role` (the first token aria-query knows), else the implicit role of the first
//     `elementRoles` entry its tag, attributes and position match (the most specific entry first: `a` with `href` is
//     `link`, `img` with `alt=""` is `presentation`, `header` scoped to the body is `banner`, `li` in a list is `listitem`);
//   - a role that can carry no accessible name (aria-query lists `aria-label` among its prohibited properties: `generic`,
//     `paragraph`, `strong`, `emphasis`, `presentation`, `code`, …) is no fact: a `div`, a `span` or inline formatting
//     (`b`, `strong`, `em`, `i`) never rules a block out and never ranks one;
//   - a block's tag rows mean the roles those tags carry (`tagRoles`): a block that can print `h3` can show `heading`.
import ariaQuery from 'aria-query';

const { elementRoles, roles } = ariaQuery;

// The roles that carry no accessible name, so no meaning of their own.
export const NAMELESS = new Set( [ ...roles.entries() ].filter( ( [ , d ] ) => ( d.prohibitedProps || [] ).includes( 'aria-label' ) ).map( ( [ r ] ) => r ) );
const meaningful = ( r ) => !! r && roles.has( r ) && ! NAMELESS.has( r );

const ENTRIES = [ ...elementRoles.entries() ].map( ( [ k, v ] ) => ( { name: k.name, attributes: k.attributes || [], constraints: k.constraints || [], roles: [ ...v ] } ) )
	.sort( ( a, b ) => b.attributes.length - a.attributes.length || Number( b.attributes.some( ( x ) => undefined !== x.value ) ) - Number( a.attributes.some( ( x ) => undefined !== x.value ) ) );

// Every tag to the meaningful roles any of its entries gives.
export const tagRoles = new Map();
for ( const x of ENTRIES ) {
	x.roles.filter( meaningful ).forEach( ( r ) => ( tagRoles.get( x.name ) ?? tagRoles.set( x.name, new Set() ).get( x.name ) ).add( r ) );
}
// Every meaningful role to the tags that may carry it.
export const roleTags = new Map();
for ( const [ tag, set ] of tagRoles ) {
	set.forEach( ( r ) => ( roleTags.get( r ) ?? roleTags.set( r, new Set() ).get( r ) ).add( tag ) );
}

const SECTIONING = new Set( [ 'main', 'article', 'aside', 'nav', 'section' ] );
// Whether an entry's attribute conditions and its position constraints hold for an element.
function fits( x, e, { attr, parentTag, ancestorTags } ) {
	for ( const a of x.attributes ) {
		const v = attr( e, a.name );
		const c = a.constraints || [];
		let ok;
		if ( c.includes( 'undefined' ) ) {
			ok = null == v;
		} else if ( c.includes( 'set' ) ) {
			ok = null != v;
		} else if ( c.includes( '>1' ) ) {
			ok = Number( v ) > 1;
		} else if ( undefined !== a.value ) {
			ok = String( v ?? '' ).toLowerCase() === String( a.value );
		} else {
			ok = null != v;
		}
		if ( ! ok ) {
			return false;
		}
	}
	for ( const c of x.constraints ) {
		if ( 'scoped to the body element' === c && ancestorTags().some( ( t ) => SECTIONING.has( t ) ) ) {
			return false;
		}
		if ( c.startsWith( 'scoped to the main element' ) && ! ancestorTags().some( ( t ) => SECTIONING.has( t ) ) ) {
			return false;
		}
		const desc = /^direct descendant of (\w+)$/.exec( c );
		if ( desc && x.constraints.every( ( d ) => ! new RegExp( `^direct descendant of ${ parentTag() }$` ).test( d ) ) ) {
			return false;
		}
	}
	return true;
}

// The meaningful role an element carries, as { role, explicit } (explicit: the draft wrote it), or null.
// o: { attr( e, name ), parentTag(), ancestorTags() }.
export function roleOf( e, o ) {
	const explicit = String( o.attr( e, 'role' ) ?? '' ).trim().split( /\s+/ ).find( ( r ) => roles.has( r ) );
	if ( explicit ) {
		return meaningful( explicit ) ? { role: explicit, explicit: true } : null;
	}
	const hit = ENTRIES.find( ( x ) => x.name === e.tag && fits( x, e, o ) );
	const role = hit ? hit.roles.find( meaningful ) : null;
	return role ? { role, explicit: false } : null;
}
