// A review section that names a review platform (data/skeleton-decisions.json `rules.reviewPlatform`, Bean 2026-11-21) is
// that platform's review block: one rule over the platform table held as data (each platform's block and the signals that
// name it: its mark's file or alt text, its name in the section's own short words, a link to its domain), so another
// platform is another row of the table, never more code. Reviews in the client's own style that name no platform stay
// the testimonial slider (rules.slider).
//   - the reviews: a loop of two or more shown tiles, outside any fixed panel, at least half of them holding a text of at
//     least `minQuoteWords` words (the review; a short review is still a review);
//   - the section: from the tiles' parent, upward while the words outside the tiles stay within `maxSectionWords` (a
//     heading and a rating line, never the next section), short of the surface's root;
//   - the signals, anywhere in that section: an <img> whose file name or alt holds a platform's mark word, a link whose
//     host is a platform's domain or below it, or an element whose own words (at most `maxNameWords`, so a quote that
//     mentions the platform never counts) hold the platform's name as a whole word;
//   - the block is placed at the lowest element holding the tiles and every signal, and draws everything in it.
// A section whose signals name two platforms is left to the scoring and listed in a note; so is a section that names a
// platform without every kind of signal in the rule's `needs` (its mark: a link or the name alone is a mention, and the
// reviews are in the client's own style); a section with no signal is not a platform section. Pure: the inventory model
// and the rule in, the regions out.
import { templateKey } from './fact-key.mjs';

const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const loopOf = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => templateKey( { dc: e.template, tpl: x.tpl } ) ).at( -1 ) ?? null;
const count = ( s ) => String( s ?? '' ).split( /\s+/ ).filter( ( w ) => /[\p{L}\p{N}]/u.test( w ) ).length;
const escape = ( s ) => String( s ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
const wordRe = ( w ) => new RegExp( `(^|[^\\p{L}\\p{N}])${ escape( w ) }($|[^\\p{L}\\p{N}])`, 'iu' );
const hostOf = ( href ) => {
	try {
		return new URL( String( href ) ).hostname.toLowerCase();
	} catch {
		return null;
	}
};

// The platforms an element names, as [ { platform, kind, key } ].
export function signalsOf( e, words, rule ) {
	const out = [];
	const own = words( e );
	const file = String( e.attrs?.srcBasename ?? e.attrs?.src ?? '' ).split( /[?#]/ )[ 0 ].split( '/' ).at( -1 );
	const host = 'a' === e.tag ? hostOf( e.attrs?.href ) : null;
	for ( const p of rule.platforms || [] ) {
		const hit = ( kind ) => out.push( { platform: p.name, kind, key: e.key } );
		'img' === e.tag && ( p.marks || [] ).some( ( w ) => wordRe( w ).test( file.replace( /[-_.]/g, ' ' ) ) || wordRe( w ).test( e.attrs?.alt ?? '' ) ) && hit( 'mark' );
		host && ( p.domains || [] ).some( ( d ) => host === d || host.endsWith( `.${ d }` ) ) && hit( 'link' );
		own && count( own ) <= rule.maxNameWords && ( p.words || [] ).some( ( w ) => wordRe( w ).test( own ) ) && hit( 'name' );
	}
	return out;
}

// { regions: Map( region key -> { platform, block, attributes, signals, reason } ), notes: [ text ] }.
export function reviewPlatformRegions( { m, rule } ) {
	const regions = new Map();
	const notes = [];
	if ( ! rule?.platforms?.length ) {
		return { regions, notes };
	}
	const kidsOf = new Map();
	m.els.forEach( ( e ) => ( kidsOf.get( e.parentKey ) || kidsOf.set( e.parentKey, [] ).get( e.parentKey ) ).push( e ) );
	const below = ( e ) => {
		const out = [];
		const walk = ( x ) => ( kidsOf.get( x.key ) || [] ).forEach( ( k ) => out.push( k ) && walk( k ) );
		walk( e );
		return out;
	};
	const chain = ( e ) => {
		const out = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	const overlay = ( e ) => chain( e ).some( ( a ) => shown( a ) && Object.entries( a.visible || {} ).filter( ( [ , v ] ) => v ).every( ( [ w ] ) => 'fixed' === a.position?.[ w ] ) );
	const loops = new Map();
	m.els.filter( ( e ) => shown( e ) && loopOf( e ) ).forEach( ( e ) => ( loops.get( loopOf( e ) ) || loops.set( loopOf( e ), [] ).get( loopOf( e ) ) ).push( e ) );
	for ( const [ loop, list ] of loops ) {
		const items = list.filter( ( e ) => ! list.includes( m.byKey[ e.parentKey ] ) );
		const holders = [ ...new Set( items.map( ( e ) => e.parentKey ) ) ];
		if ( items.length < 2 || 1 !== holders.length || items.some( overlay ) ) {
			continue;
		}
		if ( items.filter( ( it ) => [ it, ...below( it ) ].some( ( d ) => shown( d ) && count( m.words( d ) ) >= rule.minQuoteWords ) ).length * 2 < items.length ) {
			continue;
		}
		const inItems = new Set( items.flatMap( ( it ) => [ it, ...below( it ) ] ).map( ( d ) => d.key ) );
		// The section: the highest ancestor of the tiles' parent whose words outside the tiles stay within the limit.
		let top = null;
		for ( const a of chain( m.byKey[ holders[ 0 ] ] ) ) {
			if ( a === m.root || ! a ) {
				break;
			}
			const outside = below( a ).filter( ( d ) => ! inItems.has( d.key ) && shown( d ) ).reduce( ( n, d ) => n + count( m.words( d ) ), count( m.words( a ) ) );
			if ( outside > rule.maxSectionWords ) {
				break;
			}
			top = a;
		}
		if ( ! top ) {
			continue;
		}
		const signals = [ top, ...below( top ) ].filter( shown ).flatMap( ( d ) => signalsOf( d, m.words, rule ) );
		const platforms = [ ...new Set( signals.map( ( s ) => s.platform ) ) ];
		if ( ! platforms.length ) {
			continue;
		}
		if ( platforms.length > 1 ) {
			notes.push( `the review section ${ top.key } (loop ${ loop }) names ${ platforms.join( ' and ' ) }, so it is not taken as one platform's reviews` );
			continue;
		}
		// The platform's own look, never a mention of it: the section names the platform by every kind of signal the rule
		// asks for (`needs`: its mark). Reviews in the client's own style that only name or link the platform stay its blocks.
		const kinds = [ ...new Set( signals.map( ( s ) => s.kind ) ) ];
		const lacks = ( rule.needs || [] ).filter( ( k ) => ! kinds.includes( k ) );
		if ( lacks.length ) {
			notes.push( `the review section ${ top.key } (loop ${ loop }) names ${ platforms[ 0 ] } without its ${ lacks.join( ', ' ) }, so its reviews stay the draft's own blocks` );
			continue;
		}
		// The lowest element holding the tiles and every signal.
		const need = [ m.byKey[ holders[ 0 ] ], ...signals.map( ( s ) => m.byKey[ s.key ] ) ];
		const region = chain( need[ 0 ] ).find( ( a ) => need.every( ( n ) => chain( n ).includes( a ) ) );
		const p = rule.platforms.find( ( x ) => x.name === platforms[ 0 ] );
		regions.set( region.key, { platform: p.name, block: p.block, attributes: { ...( p.attributes || {} ) }, signals, handover: p.handover ?? null, reason: `${ items.length } reviews (loop ${ loop }) in a section naming ${ p.name } by its ${ kinds.join( ', ' ) } (${ signals.length } signal${ 1 === signals.length ? '' : 's' })` } );
	}
	return { regions, notes };
}
