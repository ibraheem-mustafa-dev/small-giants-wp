// Presence and content for Fill (FR-47-4): which elements a block shows, and the draft's words and links, decided
// from calibration's `presence`, `text` and `link` keys (all optional; a block with none of a kind omits the key):
//   presence: { "<attr>": { shows: [paths], hides: [paths] }, "<variantAttr>=<value>": { shows, hides } }
//             what appears and disappears when that setting moves off its default (a boolean flips, a variant takes the value)
//   text:     { "<attr>": { path, reachedAt } }   the element a content setting prints its text in
//   link:     { "<attr>": { path, attr } }        the element a link setting makes a link
// A path is a selector path from the block root, BEM classes joined by ' > ' (the format of `elements` keys). Each
// function returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes }.
import { LOOSE } from './resolve.mjs';

const same = ( a, b ) => LOOSE( a ) === LOOSE( b );
const holds = ( list, p ) => ( list || [] ).some( ( x ) => same( x, p ) );
const empty = () => ( { writes: [], unmapped: [], notes: [] } );
const unset = ( v ) => undefined === v || null === v || '' === String( v ).trim();
const isBool = ( def ) => [].concat( def?.type || [] ).includes( 'boolean' );

// Text as a visitor reads it: markup removed, entities decoded, whitespace collapsed.
export const plainText = ( s ) => String( s ?? '' ).replace( /<[^>]*>/g, ' ' ).replace( /&amp;/g, '&' ).replace( /&lt;/g, '<' ).replace( /&gt;/g, '>' ).replace( /&quot;/g, '"' ).replace( /&#0?39;/g, "'" ).replace( /&nbsp;/g, ' ' ).replace( /\s+/g, ' ' ).trim();

// How well one presence entry matches the draft: +1 for each element it shows that the draft shows and each it hides that
// the draft lacks, -1 for each the other way. evidence: { path: true | false } for the elements the skeleton named.
function margin( entry, evidence ) {
	const at = ( p ) => Object.entries( evidence ).find( ( [ k ] ) => same( k, p ) )?.[ 1 ];
	let score = 0;
	const phrases = [];
	for ( const p of entry.shows || [] ) {
		if ( true === at( p ) ) {
			score++;
			phrases.push( `shows ${ p }` );
		} else if ( false === at( p ) ) {
			score--;
		}
	}
	for ( const p of entry.hides || [] ) {
		if ( false === at( p ) ) {
			score++;
			phrases.push( `lacks ${ p }` );
		} else if ( true === at( p ) ) {
			score--;
		}
	}
	return { score, phrases };
}

// Visibility and variant settings from `presence`. schema: the block's block.json attributes ({ type, default }).
// attributes: what the node already holds (a skeleton's value is kept; a contradiction with the draft is reported).
// evidence: { path: true | false } for each declared slot (true: the draft shows it, false: the draft has none).
export function presenceDecisions( { calibration, schema, attributes = {}, evidence = {} } ) {
	const out = empty();
	const presence = calibration?.presence;
	if ( ! presence ) {
		return out;
	}
	const setTo = ( attr, value, phrases ) => {
		if ( undefined !== attributes[ attr ] ) {
			if ( JSON.stringify( attributes[ attr ] ) !== JSON.stringify( value ) ) {
				out.notes.push( `${ attr } is ${ JSON.stringify( attributes[ attr ] ) } in the skeleton; the draft ${ phrases.join( ' and ' ) }, which needs ${ attr }=${ JSON.stringify( value ) }` );
			}
			return;
		}
		out.writes.push( { attr, value, merge: 'replace' } );
	};
	const variants = new Map();
	for ( const [ key, entry ] of Object.entries( presence ) ) {
		const m = margin( entry, evidence );
		if ( key.includes( '=' ) ) {
			const [ attr, ...rest ] = key.split( '=' );
			variants.set( attr, [ ...( variants.get( attr ) || [] ), { value: rest.join( '=' ), ...m } ] );
		} else if ( m.score > 0 ) {
			if ( isBool( schema?.[ key ] ) ) {
				setTo( key, ! schema[ key ].default, m.phrases );
			} else {
				out.unmapped.push( { property: 'presence', value: m.phrases.join( ' and ' ), slot: [ ...( entry.shows || [] ), ...( entry.hides || [] ) ][ 0 ] ?? '', reason: `${ key } is a ${ [].concat( schema?.[ key ]?.type || 'unknown' ).join( '/' ) } setting, not a boolean: calibration's presence key without "=" must name a boolean` } );
			}
		}
	}
	for ( const [ attr, options ] of variants ) {
		const best = Math.max( ...options.map( ( o ) => o.score ) );
		const top = options.filter( ( o ) => o.score === best );
		if ( best <= 0 ) {
			continue;
		}
		if ( top.length > 1 ) {
			out.notes.push( `${ attr }: values ${ top.map( ( o ) => o.value ).join( ', ' ) } fit the draft equally well; none written` );
			continue;
		}
		setTo( attr, top[ 0 ].value, top[ 0 ].phrases );
	}
	const known = Object.keys( calibration.elements || {} );
	const listed = Object.values( presence );
	for ( const [ p, shown ] of Object.entries( evidence ) ) {
		if ( '' === p ) {
			continue;
		}
		if ( shown && ! holds( known, p ) && ! listed.some( ( e ) => holds( e.shows, p ) ) ) {
			out.unmapped.push( { property: 'presence', value: 'shown', slot: p, reason: `the draft shows "${ p }" and no setting of the block shows it (calibration found it in no default render and in no presence list)` } );
		} else if ( ! shown && holds( known, p ) && ! listed.some( ( e ) => holds( e.hides, p ) ) ) {
			out.unmapped.push( { property: 'presence', value: 'hidden', slot: p, reason: `the draft hides "${ p }" and no setting of the block hides it (calibration found it in the default render and in no presence list)` } );
		}
	}
	return out;
}

// The draft's words into the content settings calibration's `text` ties to each element. slots: { path: the draft
// element's text }. leaf: false for a block holding other blocks (their words are theirs, so its root text is skipped).
// A setting that already holds words is never overwritten; a difference is a note.
export function textDecisions( { calibration, attributes = {}, slots = {}, leaf = true } ) {
	const out = empty();
	const text = calibration?.text;
	if ( ! text ) {
		return out;
	}
	const draft = Object.entries( slots ).filter( ( [ p, t ] ) => ( leaf || '' !== p ) && ! unset( plainText( t ) ) ).map( ( [ p, t ] ) => [ p, plainText( t ) ] );
	const claimed = new Set();
	for ( const [ attr, def ] of Object.entries( text ) ) {
		const hit = draft.find( ( [ p ] ) => same( p, def.path ) );
		if ( ! hit ) {
			continue;
		}
		claimed.add( hit[ 0 ] );
		if ( unset( attributes[ attr ] ) ) {
			out.writes.push( { attr, value: hit[ 1 ], merge: 'replace' } );
		} else if ( plainText( attributes[ attr ] ) !== hit[ 1 ] ) {
			out.notes.push( `${ attr } holds "${ plainText( attributes[ attr ] ) }"; the draft shows "${ hit[ 1 ] }"` );
		}
	}
	const strings = Object.values( attributes ).filter( ( v ) => 'string' === typeof v ).map( plainText );
	for ( const [ p, t ] of draft ) {
		if ( ! claimed.has( p ) && ! strings.some( ( s ) => s.includes( t ) ) ) {
			out.unmapped.push( { property: 'text', value: t, slot: p, reason: `no setting of the block prints text in "${ p }" (calibration's text lists ${ Object.keys( text ).join( ', ' ) })` } );
		}
	}
	return out;
}

// A draft href as a WordPress site can hold it, or null for one that links nowhere (#, empty, javascript:) or to a draft
// file (a relative page name). A link into the draft's own origin keeps its path, query and fragment.
export function normaliseHref( href, origin ) {
	const h = String( href ?? '' ).trim();
	if ( ! h || h.startsWith( '#' ) || /^javascript:/i.test( h ) ) {
		return null;
	}
	if ( h.startsWith( '/' ) && ! h.startsWith( '//' ) ) {
		return h;
	}
	let u;
	try {
		u = new URL( h, h.startsWith( '//' ) ? 'https://x/' : undefined );
	} catch {
		return null;
	}
	return u.origin === origin ? `${ u.pathname }${ u.search }${ u.hash }` : h;
}

// The Site Info key a node's own binding gives a setting (`metadata.bindings.<attr>.args.key` with source sgs/site-info), or null.
const siteInfoKey = ( attributes, attr ) => {
	const b = attributes?.metadata?.bindings?.[ attr ];
	return 'sgs/site-info' === b?.source && 'string' === typeof b?.args?.key && '' !== b.args.key ? b.args.key : null;
};

// The draft's links into the link settings calibration's `link` ties to each element. slots: { path: href | null }.
// A setting bound to Site Info still receives the draft address (it is the fallback shown when Site Info is blank) and
// also yields a `handover` row { attr, slot, siteInfoKey, address } so the clone reports the address for Site Info.
export function linkDecisions( { calibration, attributes = {}, slots = {}, origin = '' } ) {
	const out = { ...empty(), handover: [] };
	const link = calibration?.link;
	if ( ! link ) {
		return out;
	}
	const draft = Object.entries( slots ).map( ( [ p, h ] ) => [ p, normaliseHref( h, origin ) ] ).filter( ( [ , h ] ) => null !== h );
	const claimed = new Set();
	// A block with one link element (one distinct path) takes the address the draft's root element carries when no slot
	// names that element: the draft's own anchor IS the element the node copies, while the block nests its anchor.
	const onlyOnePath = new Set( Object.values( link ).map( ( d ) => d.path ) ).size === 1;
	for ( const [ attr, def ] of Object.entries( link ) ) {
		const hit = draft.find( ( [ p ] ) => same( p, def.path ) ) || ( onlyOnePath ? draft.find( ( [ p ] ) => '' === p ) : undefined );
		if ( ! hit ) {
			continue;
		}
		claimed.add( hit[ 0 ] );
		if ( siteInfoKey( attributes, attr ) ) {
			out.handover.push( { attr, slot: hit[ 0 ], siteInfoKey: siteInfoKey( attributes, attr ), address: hit[ 1 ] } );
		}
		if ( unset( attributes[ attr ] ) ) {
			out.writes.push( { attr, value: hit[ 1 ], merge: 'replace' } );
		} else if ( String( attributes[ attr ] ) !== hit[ 1 ] ) {
			out.notes.push( `${ attr } holds "${ attributes[ attr ] }"; the draft links to "${ hit[ 1 ] }"` );
		}
	}
	for ( const [ p, h ] of draft ) {
		if ( ! claimed.has( p ) ) {
			out.unmapped.push( { property: 'link', value: h, slot: p, reason: `no setting of the block makes "${ p }" a link (calibration's link lists ${ Object.keys( link ).join( ', ' ) })` } );
		}
	}
	return out;
}
