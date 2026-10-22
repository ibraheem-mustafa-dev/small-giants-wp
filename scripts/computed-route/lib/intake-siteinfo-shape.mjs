// Site Info shape validation and the shared draft locators for intake (Spec 48 FR-48-32, FR-48-33). The validators
// judge a draft value by shape only: a UK phone of 10 to 11 digits after removing spaces and punctuation (or a +44
// prefix), an address WordPress's is_email() accepts with a TLD of two letters or more, a social link with an http or
// https scheme on a brand-registry host, a UK postcode in a postal address, and opening hours that expand to per-day
// keys. A value holding `{{ }}`, a placeholder host or a `#` link is refused with its reason. No Python is imported
// (R-47-1); the provisioning script re-validates whatever reaches it.
import { brandRegistry, brandDomains, brandOwnsAddress } from './brand-registry.mjs';
import { attrOf, decodeEntities } from './intake-ast.mjs';

export const DAYS = [ 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ];
// Hosts that stand for no real business: the reserved example domains and the reserved test and local names.
const PLACEHOLDER_HOST = /(^|\.)(example\.(com|org|net)|test|localhost|invalid)$/i;
// WhatsApp's short-link host: the brand registry derives hosts from slugs and so does not claim wa.me (its own
// documented gap); WhatsApp publishes wa.me as its click-to-chat host.
const SHORT_HOSTS = { 'wa.me': 'whatsapp' };
export const POSTCODE = /\b(GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})\b/i;

const bad = ( reason, normalised = null ) => ( { valid: false, normalised, reason } );
const good = ( normalised ) => ( { valid: true, normalised, reason: null } );

// Why any value is refused before its key's shape is judged, or null.
export function refusal( raw ) {
	const v = String( raw ?? '' ).trim();
	if ( /\{\{[\s\S]*\}\}/.test( v ) ) {
		return 'holds an unresolved {{ }} binding';
	}
	if ( '' === v ) {
		return 'empty value';
	}
	if ( /^#\/?$/.test( v ) ) {
		return `placeholder link "${ v }"`;
	}
	const host = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec( v )?.[ 1 ] || /@([^@\s?#]+)$/.exec( v )?.[ 1 ];
	if ( host && PLACEHOLDER_HOST.test( host ) ) {
		return `placeholder host ${ host.toLowerCase() }`;
	}
	return null;
}

// A UK phone number: the national digits (0 + 9 or 10 digits) when the shape holds.
export function phoneShape( raw ) {
	const v = String( raw ).replace( /^tel:/i, '' ).trim();
	if ( ! /^\+?[\d\s().\-/]+$/.test( v ) ) {
		return bad( 'phone holds characters other than digits, spaces and punctuation' );
	}
	let digits = v.replace( /\D/g, '' );
	if ( v.startsWith( '+' ) ) {
		if ( ! digits.startsWith( '44' ) ) {
			return bad( `international prefix +${ digits.slice( 0, 3 ) } is not +44` );
		}
		digits = `0${ digits.slice( 2 ).replace( /^0/, '' ) }`;
	}
	return digits.length >= 10 && digits.length <= 11 ? good( digits ) : bad( `phone has ${ digits.length } digits; a UK number has 10 or 11`, digits );
}

// WordPress is_email(): length 6+, an @ after the first character, local-part characters, no `..` in the domain, no
// leading or trailing dot, two or more labels each alphanumeric or hyphen without a leading or trailing hyphen; this
// route also requires an alphabetic TLD of two letters or more.
export function emailShape( raw ) {
	const v = String( raw ).replace( /^mailto:/i, '' ).split( '?' )[ 0 ].trim();
	if ( v.length < 6 ) {
		return bad( 'email shorter than 6 characters' );
	}
	const at = v.indexOf( '@', 1 );
	if ( at < 0 ) {
		return bad( 'email has no @ after its first character' );
	}
	const [ local, domain ] = [ v.slice( 0, at ), v.slice( at + 1 ) ];
	if ( ! /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test( local ) ) {
		return bad( 'email local part holds characters is_email() refuses' );
	}
	if ( /\.{2,}/.test( domain ) || /^\.|\.$/.test( domain ) ) {
		return bad( 'email domain has an empty label' );
	}
	const labels = domain.split( '.' );
	if ( labels.length < 2 ) {
		return bad( 'email domain has no dot' );
	}
	if ( labels.some( ( l ) => /^-|-$/.test( l ) || ! /^[a-z0-9-]+$/i.test( l ) ) ) {
		return bad( 'email domain label is not alphanumeric and hyphens' );
	}
	return /^[a-z]{2,}$/i.test( labels[ labels.length - 1 ] ) ? good( `${ local }@${ domain.toLowerCase() }` ) : bad( 'email top-level domain is not two letters or more' );
}

// The social brands of the registry (a siteInfoKey `socials.<name>`).
export const socialBrands = () => brandRegistry().filter( ( b ) => /^socials\./.test( b.siteInfoKey || '' ) );

// The Site Info key a social address belongs to, or null: a registry-owned host, or WhatsApp's wa.me.
export function socialKey( href ) {
	let host;
	try {
		const u = new URL( href );
		host = /^https?:$/.test( u.protocol ) ? u.hostname.toLowerCase().replace( /^www\./, '' ) : null;
	} catch {
		return null;
	}
	if ( ! host ) {
		return null;
	}
	const short = SHORT_HOSTS[ host ];
	const brand = socialBrands().find( ( b ) => ( short ? b.slug === short : brandOwnsAddress( b, href ) ) );
	return brand?.siteInfoKey ?? null;
}

// The social brand an accessible label names ("LinkedIn", "Follow us on Instagram"), or null.
export function brandByLabel( label ) {
	const text = String( label || '' ).toLowerCase();
	const word = ( w ) => new RegExp( `(^|[^a-z0-9])${ w.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }([^a-z0-9]|$)` ).test( text );
	return socialBrands().find( ( b ) => [ b.label, ...brandDomains( b ) ].map( ( n ) => n.toLowerCase().replace( /\s*\(.*\)$/, '' ) )
		.some( ( n ) => ( n.length > 2 ? word( n ) : text === n ) ) ) ?? null;
}

export function socialShape( key, raw ) {
	const v = String( raw ).trim();
	if ( ! /^https?:\/\//i.test( v ) ) {
		return bad( 'social link has no http or https scheme' );
	}
	return socialKey( v ) === key ? good( v ) : bad( `host is not a known ${ key } host in brand-registry.json` );
}

export function addressShape( raw ) {
	const v = String( raw ).replace( /[–—]/g, '-' ).replace( /\s+/g, ' ' ).replace( /\s*,\s*/g, ', ' ).replace( /[,\s]+$/, '' ).trim();
	const pc = POSTCODE.exec( v );
	return pc ? good( v.replace( pc[ 0 ], pc[ 0 ].toUpperCase() ) ) : bad( 'address holds no UK postcode', v );
}

const hm = ( m ) => `${ String( Math.floor( m / 60 ) ).padStart( 2, '0' ) }:${ String( m % 60 ).padStart( 2, '0' ) }`;

// One day's opening ranges ([[start, end]] in minutes from midnight; [] is closed) as its per-day value.
export function hoursShape( ranges ) {
	if ( ! Array.isArray( ranges ) || ranges.some( ( r ) => ! Array.isArray( r ) || 2 !== r.length || ! r.every( Number.isInteger ) ) ) {
		return bad( 'hours are not [start, end] minute pairs' );
	}
	if ( ranges.some( ( [ a, b ] ) => a < 0 || b > 1440 || a >= b ) ) {
		return bad( 'an hours range does not run forwards within one day' );
	}
	return good( ranges.length ? ranges.map( ( [ a, b ] ) => `${ hm( a ) }–${ hm( b ) }` ).join( ', ' ) : 'closed' );
}

const TIME = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?`;
const toMin = ( h, m, ap, apEnd ) => {
	let hh = Number( h ) % ( ap || apEnd ? 12 : 24 );
	if ( 'pm' === ( ap || apEnd )?.toLowerCase() ) {
		hh += 12;
	}
	return hh * 60 + Number( m || 0 );
};

// Hours text ("Mon-Fri 9:30am-5pm, Sat 10-3"): { day: ranges } for every day it names, or null when it names none.
// `day` pins a value with no day names to that day ("9.30-17.30" printed for opening_hours.monday).
export function parseHoursText( text, day = null ) {
	const t = String( text ).toLowerCase().replace( /[–—]/g, '-' );
	if ( day && /^\s*closed\s*$/.test( t ) ) {
		return { [ day ]: [] };
	}
	const out = {};
	const span = String.raw`(sun|mon|tue|wed|thu|fri|sat)[a-z]*`;
	const re = new RegExp( `(?:${ span }(?:\\s*(?:-|to)\\s*${ span })?\\s*:?\\s*)?${ TIME }\\s*(?:-|to)\\s*${ TIME }`, 'g' );
	for ( const m of t.matchAll( re ) ) {
		const from = m[ 1 ] ? DAYS.findIndex( ( d ) => d.startsWith( m[ 1 ] ) ) : null;
		const to = m[ 2 ] ? DAYS.findIndex( ( d ) => d.startsWith( m[ 2 ] ) ) : from;
		const days = null === from ? ( day ? [ day ] : [] ) : Array.from( { length: ( ( to - from + 7 ) % 7 ) + 1 }, ( _, i ) => DAYS[ ( from + i ) % 7 ] );
		const range = [ toMin( m[ 3 ], m[ 4 ], m[ 5 ], m[ 8 ] ), toMin( m[ 6 ], m[ 7 ], m[ 8 ] ) ];
		if ( ! m[ 5 ] && ! m[ 8 ] && range[ 1 ] <= range[ 0 ] && range[ 1 ] < 720 ) {
			range[ 1 ] += 720;
		}
		if ( ! m[ 5 ] && m[ 8 ] && range[ 0 ] >= range[ 1 ] ) {
			range[ 0 ] -= 720;
		}
		days.forEach( ( d ) => ( out[ d ] = [ ...( out[ d ] || [] ), range ] ) );
	}
	return Object.keys( out ).length ? out : null;
}

// Validates one candidate: { valid, normalised, reason }. `hours.<day>` values are range lists or hours text.
export function validate( key, raw ) {
	const refused = 'object' === typeof raw ? null : refusal( raw );
	if ( refused ) {
		return bad( refused );
	}
	if ( 'phone' === key ) {
		return phoneShape( raw );
	}
	if ( 'email' === key ) {
		return emailShape( raw );
	}
	if ( 'address' === key ) {
		return addressShape( raw );
	}
	if ( key.startsWith( 'socials.' ) ) {
		return socialShape( key, raw );
	}
	if ( key.startsWith( 'hours.' ) ) {
		const day = key.slice( 6 );
		const ranges = Array.isArray( raw ) ? raw : parseHoursText( raw, day )?.[ day ];
		return ranges ? hoursShape( ranges ) : bad( 'hours text does not expand to per-day ranges' );
	}
	if ( 'hours' === key ) {
		return bad( 'hours text does not expand to per-day ranges' );
	}
	return good( String( raw ).trim() );
}

// Locators. A template element's draft ID is the census format `<component>:<data-dc-tpl>` when the census's sources
// (staticCensus().sources: file, component, stamped.elements) hold the element, else `<file>:<line>:<col>`; a logic
// node's is `<file>:js:<line>:<column>`. Elements pair on tag plus identity attributes, in occurrence order.
const IDENTITY = [ 'href', 'src', 'id', 'placeholder', 'aria-label', 'onsubmit', 'name' ];
const tagKey = ( name, get ) => [ name.replace( /^sc-raw-/, '' ), ...IDENTITY.map( ( a ) => get( a ) ?? '' ) ].join( '\u0001' );

export function locator( census ) {
	const byFile = new Map();
	for ( const s of census?.sources || [] ) {
		const slots = new Map();
		for ( const e of s.stamped?.elements || [] ) {
			const k = tagKey( e.tag, ( a ) => e.attrs.find( ( [ n ] ) => n.toLowerCase() === a )?.[ 1 ] );
			slots.set( k, [ ...( slots.get( k ) || [] ), e.n ] );
		}
		byFile.set( s.file, { component: s.component, slots } );
	}
	const seen = new Map();
	return {
		tag( d, t ) {
			const loc = `${ d.file }:${ t.line }:${ t.col }`;
			const f = byFile.get( d.file );
			if ( ! f ) {
				return { draftId: loc, location: loc };
			}
			const k = tagKey( t.name, ( a ) => attrOf( t, a ) );
			const order = d.tags.filter( ( x ) => x.index < t.index && tagKey( x.name, ( a ) => attrOf( x, a ) ) === k ).length;
			const n = f.slots.get( k )?.[ order ];
			seen.set( loc, n );
			return { draftId: null == n ? loc : `${ f.component }:${ n }`, location: loc };
		},
		node( d, n ) {
			const loc = `${ d.file }:js:${ d.idx.line( n ) }:${ ( n.loc?.start.column ?? 0 ) + 1 }`;
			return { draftId: loc, location: loc };
		},
	};
}

// The template's text runs in order: { text, tag (the start tag before it), joined (true when only <br> tags separate
// it from the run before) }. Closing tags end a run; script and style bodies are not text.
export function textRuns( d ) {
	if ( ! d.cut ) {
		return [];
	}
	const runs = [];
	let lastEnd = -1;
	d.tags.forEach( ( t, i ) => {
		if ( 'script' === t.name || 'style' === t.name ) {
			return;
		}
		const to = i + 1 < d.tags.length ? d.tags[ i + 1 ].index : d.cut.templateEnd;
		const chunk = d.text.slice( t.end, to );
		const re = /<\/[^>]*>/g;
		let from = 0;
		for ( const m of [ ...chunk.matchAll( re ), { index: chunk.length, 0: '' } ] ) {
			const raw = chunk.slice( from, m.index );
			const text = decodeEntities( raw ).replace( /\s+/g, ' ' ).trim();
			if ( text ) {
				const at = t.end + from + raw.search( /\S/ );
				const between = lastEnd < 0 ? '' : d.text.slice( lastEnd, at );
				runs.push( { text, tag: t, joined: /^\s*(<br\s*\/?>\s*)+$/i.test( between ) } );
				lastEnd = t.end + from + raw.trimEnd().length;
			}
			from = m.index + m[ 0 ].length;
		}
	} );
	return runs;
}
