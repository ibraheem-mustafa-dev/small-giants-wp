// A grid of picture tiles, each a titled link or control (data/skeleton-decisions.json `rules.pictureTileGrid`), is one
// card grid whose cards are the tiles: the block draws each card's picture, title and link, so the tiles' elements are
// absorbed and Fill writes the draft's loop into the block's items (lib/fill-list-content.mjs).
//   - the tiles: a loop of `minTiles` or more shown tiles with one parent, outside any fixed panel, whose parent's block
//     children are all the tiles;
//   - each tile is one action: the tile is itself a link or a control (a click handler), or holds exactly one;
//   - each tile is titled: it shows words, at most `maxTileWords` in all (a review or a description is no tile title);
//   - no tile shows a price (a priced tile is a product card: rules.productTile, rules.commerceRegion);
//   - at least `pictureShare` of the tiles paint a picture (an <img> or a url() background), so a tile still waiting for its
//     photo keeps its place in the grid.
// The card style is read from where the picture sits: a picture out of flow under the title (absolutely placed, or the
// tile's own background) is the overlay style; a picture in flow beside the title is the default card style.
// A card whose action has no address in the draft (a "#" link or a control whose click navigates by script) gets a named
// handover for its link, never a guessed address; a tile drawing an inline SVG glyph names the glyph as a handover too.
//
// A grid of text tiles (`rules.textTileGrid`, the same function in its text mode) is one card grid too: a loop of `minTiles`
// or more whole-link tiles (the tile is itself the link or control, not a box holding one), each showing between
// `minTileLines` and `maxTileLines` lines of text (a title over a subtitle, at most two lines: the card's title and subtitle),
// no picture, glyph, price or second control inside, whose parent holds only the tiles. A run of one-line links is a link
// list (structural.linkList), never a card grid, and a tile of three lines or more (a kicker, a price and a description) is a
// container of its own. The card style is the default; no picture is written.
// Pure: the inventory model, the rule and the currency pattern in, the grids out.
import { templateKey } from './fact-key.mjs';

const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const loopOf = ( e ) => ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => templateKey( { dc: e.template, tpl: x.tpl } ) ).at( -1 ) ?? null;
const count = ( s ) => String( s ?? '' ).split( /\s+/ ).filter( ( w ) => /[\p{L}\p{N}]/u.test( w ) ).length;
// The click handler a control names (`{{ s.go }}` read as `s.go`), or ''.
export const handlerNamed = ( e ) => /sc-camel-on-click="\{\{\s*([^}\s]+)\s*\}\}"/.exec( e.snippet || '' )?.[ 1 ] || '';
const control = ( e ) => ( 'a' === e.tag && null != e.attrs?.href ) || 'button' === e.tag || !! handlerNamed( e );
// A destination the draft writes as an address (not "#", not a template binding).
const addressOf = ( e ) => ( 'a' === e.tag && e.attrs?.href && '#' !== e.attrs.href && ! /\{\{/.test( e.attrs.href ) ? e.attrs.href : null );
const paintsPicture = ( e ) => 'img' === e.tag || /background(?:-image)?\s*:[^;]*url\(/i.test( String( e.attrs?.style ?? '' ) );
// The elements that draw a picture or stand for one still to come (an <image-slot> the client fills later): no text tile holds one.
const PICTURE_TAGS = new Set( [ 'img', 'picture', 'svg', 'video', 'canvas', 'iframe', 'image-slot' ] );
const onlyOne = ( list ) => ( 1 === list.length ? list[ 0 ] : null );
const outOfFlow = ( e ) => Object.entries( e.visible || {} ).filter( ( [ , v ] ) => v ).every( ( [ w ] ) => [ 'absolute', 'fixed' ].includes( e.position?.[ w ] ) );

// { grids: Map( parent key -> { block, attributes, tiles, handovers, reason } ), notes: [ text ] }.
export const pictureTileGrids = ( o ) => tileGrids( { ...o, text: false } );
export const textTileGrids = ( o ) => tileGrids( { ...o, text: true } );

function tileGrids( { m, rule, money, text } ) {
	const grids = new Map();
	const notes = [];
	if ( ! rule?.block ) {
		return { grids, notes };
	}
	const price = money ? new RegExp( money ) : null;
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
		const holder = m.byKey[ holders[ 0 ] ];
		if ( items.length < ( rule.minTiles ?? 2 ) || 1 !== holders.length || ! holder || items.some( overlay ) ) {
			continue;
		}
		const inside = items.map( ( it ) => [ it, ...below( it ) ].filter( shown ) );
		// One action per tile: the tile itself, or the one link or control it holds.
		const actions = items.map( ( it, i ) => ( control( it ) && ( ! text || 'a' === it.tag ) ? it : onlyOne( inside[ i ].slice( 1 ).filter( control ) ) ) );
		if ( actions.some( ( a ) => ! a ) ) {
			continue;
		}
		const words = inside.map( ( els ) => els.reduce( ( n, d ) => n + count( m.words( d ) ), 0 ) );
		if ( words.some( ( n ) => ! n || n > rule.maxTileWords ) ) {
			continue;
		}
		if ( price && inside.some( ( els ) => els.some( ( d ) => price.test( m.words( d ) ) ) ) ) {
			continue;
		}
		const pictures = inside.map( ( els ) => els.find( paintsPicture ) ?? null );
		if ( text ) {
			// Lines of text: the shown elements of the tile with words of their own. Nothing else is drawn in a text tile.
			const lines = inside.map( ( els ) => els.filter( ( d ) => m.words( d ) ).length );
			if ( lines.some( ( n ) => n < ( rule.minTileLines ?? 2 ) || n > rule.maxTileLines ) || pictures.some( Boolean ) || inside.some( ( els ) => els.some( ( d ) => PICTURE_TAGS.has( d.tag ) || ( d !== els[ 0 ] && control( d ) ) ) ) ) {
				continue;
			}
		} else if ( pictures.filter( Boolean ).length < items.length * ( rule.pictureShare ?? 0.5 ) ) {
			continue;
		}
		if ( ! m.blockKids( holder ).every( ( k ) => items.includes( k ) ) ) {
			notes.push( `the ${ text ? 'text' : 'picture' } tiles of loop ${ loop } share their parent ${ holder.key } with other blocks, so they are not taken as one card grid` );
			continue;
		}
		const V = rule.variant;
		const over = pictures.filter( Boolean ).every( ( p ) => items.includes( p ) || outOfFlow( p ) );
		const titleOf = ( els ) => {
			const t = els.findLast( ( d ) => m.words( d ) );
			return t ? m.words( t ) : '';
		};
		const handovers = [];
		items.forEach( ( it, i ) => {
			if ( addressOf( actions[ i ] ) ) {
				return;
			}
			const by = handlerNamed( actions[ i ] );
			handovers.push( { owner: 'behaviour', kind: 'link', detail: `card ${ i + 1 } "${ titleOf( inside[ i ] ) }": ${ rule.linkHandover }${ by ? ` (the draft's click runs ${ by })` : '' }` } );
		} );
		inside.some( ( els ) => els.some( ( d ) => 'svg' === d.tag ) ) && rule.glyphHandover && handovers.push( { owner: 'content-page', kind: 'presence', detail: rule.glyphHandover } );
		grids.set( holder.key, {
			block: rule.block,
			attributes: V ? { [ V.setting ]: over ? V.over : V.beside } : {},
			tiles: items.map( ( it ) => it.key ),
			handovers,
			reason: text
				? `${ items.length } whole-link text tiles (loop ${ loop }), no picture, each one ${ actions.every( addressOf ) ? 'link' : 'link or control' }`
				: `${ items.length } titled tiles (loop ${ loop }), ${ pictures.filter( Boolean ).length } with a picture ${ over ? 'under the title' : 'beside the title' }, each one ${ actions.every( addressOf ) ? 'link' : 'link or control' }`,
		} );
	}
	return { grids, notes };
}
