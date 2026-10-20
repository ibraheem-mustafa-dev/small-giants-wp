// The checks for the draft's head (Spec 48 FR-48-84), on what lib/intake-head.mjs::readHead read:
// - fontCheck: every family the draft loads has a family in the client's theme snapshot that serves it from the site
//   (a self-hosted `fontFace` covering each loaded weight and style, or `google: true`, which
//   includes/class-google-fonts-self-host.php downloads to the server);
// - headCheck: the live page's head holds what the draft's head asks for: one charset, the draft's viewport, a title
//   naming the site, and a description when the draft gives one.

const norm = ( s ) => String( s ?? '' ).replace( /^['"]|['"]$/g, '' ).trim().toLowerCase();
const firstFamily = ( stack ) => norm( String( stack ?? '' ).split( ',' )[ 0 ] );

// The families the draft loads, merged by name: [ { family, weights, italic, draftIds } ].
export function loadedFamilies( head ) {
	const by = new Map();
	for ( const f of head.fonts ) {
		const list = f.families.length ? f.families : f.family ? [ { family: f.family, weights: [], italic: false } ] : [];
		for ( const x of list ) {
			const e = by.get( norm( x.family ) ) || { family: x.family, weights: new Set(), italic: false, draftIds: new Set() };
			x.weights.forEach( ( w ) => e.weights.add( w ) );
			e.italic = e.italic || x.italic;
			e.draftIds.add( f.draftId );
			by.set( norm( x.family ), e );
		}
	}
	return [ ...by.values() ].map( ( e ) => ( { ...e, weights: [ ...e.weights ].sort( ( a, b ) => a - b ), draftIds: [ ...e.draftIds ] } ) );
}

// Whether a fontFace weight (`400`, `100 900`) covers a weight.
const weightCovers = ( face, w ) => {
	const [ lo, hi = lo ] = String( face ?? '400' ).trim().split( /\s+/ ).map( Number );
	return w >= lo && w <= hi;
};

// The snapshot's font families as [ { slug, name, fontFamily, google, fontFace } ].
export const snapshotFamilies = ( snapshot ) => snapshot?.settings?.typography?.fontFamilies || [];

// Every loaded family the snapshot does not serve, as sentences; empty when it serves them all.
export function fontCheck( head, snapshot ) {
	const families = snapshotFamilies( snapshot );
	const problems = [];
	for ( const f of loadedFamilies( head ) ) {
		const entries = families.filter( ( e ) => norm( e.name ) === norm( f.family ) || firstFamily( e.fontFamily ) === norm( f.family ) );
		const faces = entries.flatMap( ( e ) => e.fontFace || [] ).filter( ( face ) => ! face.fontFamily || norm( face.fontFamily ) === norm( f.family ) );
		if ( ! entries.length ) {
			problems.push( `${ f.family } (loaded at ${ f.draftIds.join( ', ' ) }) has no font family in the theme snapshot` );
			continue;
		}
		if ( ! faces.length ) {
			if ( ! entries.some( ( e ) => e.google ) ) {
				problems.push( `${ f.family } has a snapshot family but no font face and is not marked google, so nothing serves it` );
			}
			continue;
		}
		for ( const w of f.weights ) {
			if ( ! faces.some( ( face ) => weightCovers( face.fontWeight, w ) && 'italic' !== face.fontStyle ) ) {
				problems.push( `${ f.family } weight ${ w } is loaded but no snapshot face covers it` );
			}
		}
		if ( f.italic && ! faces.some( ( face ) => 'italic' === face.fontStyle ) ) {
			problems.push( `${ f.family } italic is loaded but no snapshot face is italic` );
		}
	}
	return problems;
}

// The head of a served page: { charsets, viewport, title, description }.
export function pageHead( html ) {
	const head = String( html ).split( /<\/head>/i )[ 0 ];
	const metas = [ ...head.matchAll( /<meta\b[^>]*>/gi ) ].map( ( [ m ] ) => m );
	const attr = ( tag, name ) => new RegExp( `\\b${ name }\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i' ).exec( tag )?.slice( 2 ).find( ( v ) => undefined !== v ) ?? null;
	const named = ( n ) => metas.find( ( m ) => n === ( attr( m, 'name' ) || '' ).toLowerCase() );
	return {
		charsets: metas.filter( ( m ) => null !== attr( m, 'charset' ) ).length,
		viewport: named( 'viewport' ) ? attr( named( 'viewport' ), 'content' ) : null,
		title: /<title[^>]*>([\s\S]*?)<\/title>/i.exec( head )?.[ 1 ].trim() ?? null,
		description: named( 'description' ) ? attr( named( 'description' ), 'content' ) : null,
	};
}

const decode = ( s ) => String( s ?? '' ).replace( /&#0*39;|&#x27;|&apos;/gi, '\'' ).replace( /&amp;/g, '&' ).replace( /&#8211;/g, '–' ).replace( /&#8217;/g, '’' );
const sameViewport = ( a, b ) => norm( a ).replace( /\s+/g, '' ) === norm( b ).replace( /\s+/g, '' );

// What the live page's head lacks against the draft's head, as sentences; `siteTitle` is the confirmed site title.
export function headCheck( head, html, { siteTitle = null } = {} ) {
	const live = pageHead( html );
	const problems = [];
	if ( head.metas.some( ( m ) => 'charset' === m.kind ) && 1 !== live.charsets ) {
		problems.push( `the page has ${ live.charsets } charset declarations, not one` );
	}
	for ( const m of head.metas.filter( ( x ) => 'viewport' === x.kind ) ) {
		if ( ! sameViewport( m.value, live.viewport ) ) {
			problems.push( `the page's viewport is ${ JSON.stringify( live.viewport ) }, the draft's ${ JSON.stringify( m.value ) } (${ m.draftId })` );
		}
	}
	if ( head.metas.some( ( m ) => 'description' === m.kind ) && ! live.description ) {
		problems.push( 'the draft gives a description and the page prints none' );
	}
	if ( siteTitle && ! decode( live.title ).includes( siteTitle ) ) {
		problems.push( `the page title ${ JSON.stringify( live.title ) } does not name the site ${ JSON.stringify( siteTitle ) }` );
	}
	return problems;
}
