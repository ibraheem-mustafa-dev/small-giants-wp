// A link to a messaging app (data/skeleton-decisions.json `rules.messagingLink`: per app its block, its domains and
// schemes, its Site Info key and the link source a plain text link takes), decided by what the link is, never by its
// words, so another app is another row of the table:
//   - holding the app's mark (a picture or a glyph) and one run of words: the app's button block, its label those words;
//     fixed to the viewport at every width it shows it is the floating style, and a label the draft shows only from some
//     width up is hidden below that width; anywhere else the inline style;
//   - holding the mark and two runs of words (a title over a line): the block's card style, its title and line;
//   - a label or a title runs to at most `maxRunWords` words and a card's line to at most `maxLineWords` (a paragraph is no
//     label);
//   - holding words and no mark: a text link whose link reads the app's Site Info address (the app's `textLink`);
//   - holding no words (a social icon) or more than two runs of words: not decided here.
// The link's number is the site's Site Info address for the app (the block falls back to it), named as a handover with
// the draft's address; a message the draft's address carries (`?text=`) is the block's message, and an address with none
// opens an empty chat. A tel: link or any other host is not a messaging app's. Pure: an element, the model and the rule in.

const hostOf = ( href ) => {
	try {
		return new URL( String( href ) ).hostname.toLowerCase();
	} catch {
		return null;
	}
};
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const widthsShown = ( e ) => Object.entries( e.visible || {} ).filter( ( [ , v ] ) => v ).map( ( [ w ] ) => Number( w ) );
const count = ( s ) => String( s ?? '' ).split( /\s+/ ).filter( ( w ) => /[\p{L}\p{N}]/u.test( w ) ).length;

// The app of the rule's table a link address belongs to (its host is a domain of the app's or below one, or it starts with
// one of the app's schemes), or null.
export function messagingApp( href, rule ) {
	const h = String( href ?? '' ).trim();
	const host = hostOf( h );
	return ( rule?.apps || [] ).find( ( a ) => ( a.schemes || [] ).some( ( s ) => h.toLowerCase().startsWith( s ) ) || ( !! host && ( a.domains || [] ).some( ( d ) => host === d || host.endsWith( `.${ d }` ) ) ) ) ?? null;
}

// The verdict for a link element ({ block, attributes, handover, reason }), or null.
export function messagingLink( { e, m, rule } ) {
	if ( ! rule || 'a' !== e?.tag ) {
		return null;
	}
	const app = messagingApp( e.attrs?.href, rule );
	if ( ! app ) {
		return null;
	}
	const inside = [];
	const walk = ( x ) => m.kids( x ).forEach( ( k ) => shown( k ) && inside.push( k ) && walk( k ) );
	walk( e );
	const runs = [ e, ...inside ].filter( ( d ) => count( m.words( d ) ) );
	const mark = inside.some( ( d ) => 'img' === d.tag || 'svg' === d.tag || /background(?:-image)?\s*:[^;]*url\(/i.test( String( d.attrs?.style ?? '' ) ) );
	if ( ! runs.length || runs.length > 2 || count( m.words( runs[ 0 ] ) ) > rule.maxRunWords || ( runs[ 1 ] && count( m.words( runs[ 1 ] ) ) > rule.maxLineWords ) ) {
		return null;
	}
	const S = rule.settings;
	const words = ( d ) => m.words( d ).replace( /\s+/g, ' ' ).trim();
	const text = new URLSearchParams( String( e.attrs.href ).split( '?' )[ 1 ] || '' ).get( rule.messageParam ) ?? '';
	const handover = { owner: 'site-info', kind: 'text', detail: `Site Info "${ app.siteInfoKey }" must read: ${ String( e.attrs.href ).split( '?' )[ 0 ] } (the ${ app.name } link's number; the block reads it there)` };
	if ( ! mark ) {
		return 1 === runs.length && app.textLink ? { block: app.textLink.block, attributes: { ...app.textLink.attributes, [ app.textLink.label ]: words( runs[ 0 ] ) }, handover, reason: `a text link to ${ app.name } with no mark` } : null;
	}
	const V = rule.variant;
	if ( 2 === runs.length ) {
		return { block: app.block, attributes: { [ V.setting ]: V.card, [ S.title ]: words( runs[ 0 ] ), [ S.subline ]: words( runs[ 1 ] ), [ S.message ]: text }, handover, reason: `a link to ${ app.name } holding its mark, a title and a line under it` };
	}
	const shownAt = widthsShown( e );
	const fixed = shownAt.length && shownAt.every( ( w ) => 'fixed' === e.position?.[ w ] );
	const label = runs[ 0 ];
	const from = Math.min( ...widthsShown( label ) );
	const hides = fixed && shownAt.some( ( w ) => w < from );
	return { block: app.block, attributes: { [ V.setting ]: fixed ? V.fixed : V.flow, [ S.label ]: words( label ), [ S.message ]: text, ...( hides ? { [ S.hideLabelBelow ]: from } : {} ) }, handover, reason: `a link to ${ app.name } holding its mark and a label, ${ fixed ? 'fixed to the viewport' : 'in the page flow' }${ hides ? `, its label shown from ${ from }px up` : '' }` };
}
