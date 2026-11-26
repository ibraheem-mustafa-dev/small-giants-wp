// rules.pictureTileGrid: a loop of titled picture tiles, each one link or control, whose parent holds only the tiles, is
// one sgs/card-grid whose cards are the tiles; the overlay style when the picture sits out of flow under the title, the
// default card style when it sits beside it; a card whose link has no address in the draft is a named handover.
// Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on the skeleton
// writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { pictureTileGrids, textTileGrids, handlerNamed } from '../lib/skeleton-picture-tiles.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 360 ) => {
	const b = { x, y, w, h };
	return { 375: b, 768: b, 1440: b };
};
const ABS = { 375: 'absolute', 768: 'absolute', 1440: 'absolute' };
const FIXED = { 375: 'fixed', 768: 'fixed', 1440: 'fixed' };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ tiles }}', as: 's', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: x.snippet ?? `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100, 1200, 80 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const TITLES = [ 'Pilot', 'Wayfarer', 'Round', 'Square' ];
const PHOTO = ( i ) => `background-size: cover; background-image: url("https://example.com/shape-${ i }.jpg");`;

// A tile of the loop: a control (a button whose click runs s.go) holding a picture layer under its title.
const buttonTile = ( i, { words = TITLES[ i ], picture = true, position = ABS } = {} ) => [
	el( `Root/10#${ i }`, 'Root/4#0', 'button', '', { depth: 3, loop: 9, box: place( i * 320, 300 ), snippet: `<button sc-camel-on-click="{{ s.go }}" data-dc-tpl="10"></button>` } ),
	...( picture ? [ el( `Root/11#${ i }`, `Root/10#${ i }`, 'span', '', { depth: 4, loop: 9, position, attrs: { style: PHOTO( i ) } } ) ] : [] ),
	el( `Root/12#${ i }`, `Root/10#${ i }`, 'span', words, { depth: 4, loop: 9 } ),
];
// A tile of the loop: a link with a real address holding a picture above its title, in flow.
const linkTile = ( i ) => [
	el( `Root/10#${ i }`, 'Root/4#0', 'a', '', { depth: 3, loop: 9, box: place( i * 320, 300 ), attrs: { href: `https://example.com/shop/${ TITLES[ i ].toLowerCase() }/` } } ),
	el( `Root/11#${ i }`, `Root/10#${ i }`, 'img', '', { depth: 4, loop: 9, attrs: { src: `https://example.com/${ i }.jpg`, alt: TITLES[ i ] } } ),
	el( `Root/12#${ i }`, `Root/10#${ i }`, 'span', TITLES[ i ], { depth: 4, loop: 9 } ),
];
// A page: a section with a heading and the tiles' grid (Root/4#0), then another section.
const page = ( tiles, { gridExtra = [], gridPosition } = {} ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
	el( 'Root/3#0', 'Root/2#0', 'h2', 'Start with a shape', { depth: 2 } ),
	el( 'Root/4#0', 'Root/2#0', 'div', '', { depth: 2, position: gridPosition } ),
	...gridExtra,
	...tiles,
	el( 'Root/20#0', 'Root/1#0', 'section', 'Visit us in store', { depth: 1 } ),
];
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', db } );
const all = ( tree, name, out = [] ) => {
	for ( const n of tree ) {
		n.name === name && out.push( n );
		all( n.innerBlocks || [], name, out );
	}
	return out;
};
const grids = ( elements, rule = facts().decisions.rules.pictureTileGrid ) => pictureTileGrids( { m: inventoryModel( inv( elements ) ), rule, money: facts().decisions.rules.commerceRegion.money } );
const four = ( make, opts ) => [ 0, 1, 2, 3 ].flatMap( ( i ) => make( i, opts ) );

test( 'MUST FAIL: a loop of titled picture controls is one sgs/card-grid in its overlay style, each card\'s link a named handover', () => {
	const { skeleton, proposal } = run( page( four( buttonTile ) ) );
	const blocks = all( skeleton, 'sgs/card-grid' );
	assert.equal( blocks.length, 1 );
	assert.equal( blocks[ 0 ].draftRef?.tpl, 'Root/4#0', 'placed at the tiles\' parent' );
	assert.deepEqual( blocks[ 0 ].attributes, { variant: 'overlay' } );
	assert.deepEqual( blocks[ 0 ].innerBlocks, [] );
	assert.equal( proposal.rows.find( ( r ) => 'Root/12#2' === r.key )?.rule, 'pictureTileGrid', 'the tiles are drawn by the block' );
	const links = blocks[ 0 ].handover.filter( ( h ) => 'link' === h.kind );
	assert.equal( links.length, 4 );
	assert.match( links[ 1 ].detail, /^card 2 "Wayfarer": .*link is left empty.*s\.go/ );
	assert.deepEqual( proposal.pictureTileGrids, { grids: { 'Root/4#0': 4 }, notes: [] } );
	assert.ok( all( skeleton, 'sgs/heading' ).length, 'the section heading outside the grid stays' );
} );

test( 'MUST FAIL: link tiles with an address and a picture in flow are the default card style, with no link handover', () => {
	const { skeleton } = run( page( four( linkTile ) ) );
	const blocks = all( skeleton, 'sgs/card-grid' );
	assert.equal( blocks.length, 1 );
	assert.deepEqual( blocks[ 0 ].attributes, { variant: 'card' } );
	assert.equal( ( blocks[ 0 ].handover || [] ).filter( ( h ) => 'link' === h.kind ).length, 0 );
} );

test( 'a tile still waiting for its photo keeps its place; an inline SVG glyph is named as a handover', () => {
	const tiles = four( buttonTile ).filter( ( e ) => 'Root/11#0' !== e.key );
	tiles.splice( 1, 0, el( 'Root/14#0', 'Root/10#0', 'span', 'Photo to come', { depth: 4, loop: 9, position: ABS } ) );
	tiles.push( el( 'Root/13#1', 'Root/10#1', 'svg', '', { depth: 4, loop: 9 } ) );
	const g = grids( page( tiles ) ).grids.get( 'Root/4#0' );
	assert.equal( g?.tiles.length, 4 );
	assert.equal( g.attributes.variant, 'overlay' );
	assert.match( g.handovers[ 0 ].detail, /^card 1 "Pilot": /, 'the card is named by its title, its last words, not the placeholder' );
	assert.ok( g.handovers.some( ( h ) => /glyph image/.test( h.detail ) ) );
	const bare = four( buttonTile ).map( ( e ) => ( 'button' === e.tag ? { ...e, snippet: '<button data-dc-tpl="10"></button>' } : e ) );
	assert.equal( grids( page( bare ) ).grids.size, 1, 'a button is a control whatever its handler is called' );
} );

test( 'negative controls: no link or control, a price, a long text, too few pictures, a lone tile, a fixed panel, two actions in a tile', () => {
	const plain = four( buttonTile ).map( ( e ) => ( 'button' === e.tag ? { ...e, tag: 'div', srcTag: 'div', snippet: '<div data-dc-tpl="10"></div>' } : e ) );
	assert.equal( grids( page( plain ) ).grids.size, 0, 'a picture grid with no link or control is not a card grid' );
	assert.equal( grids( page( four( buttonTile ).map( ( e ) => ( 'Root/12#1' === e.key ? { ...e, words: 'Wayfarer £139' } : e ) ) ) ).grids.size, 0, 'a priced tile is a product card\'s' );
	assert.equal( grids( page( four( ( i ) => buttonTile( i, { words: 'The team were kind and patient and found the right frames for me' } ) ) ) ).grids.size, 0, 'a review is no tile title' );
	assert.equal( grids( page( four( ( i ) => buttonTile( i, { picture: i < 1 } ) ) ) ).grids.size, 0, 'fewer than half the tiles paint a picture' );
	assert.equal( grids( page( four( ( i ) => buttonTile( i, { picture: i < 2 } ) ) ) ).grids.size, 1, 'half the tiles painting a picture is enough' );
	assert.equal( grids( page( four( ( i ) => buttonTile( i, { words: '' } ) ) ) ).grids.size, 0, 'an untitled picture link is a logo wall\'s, not a card' );
	assert.equal( grids( page( buttonTile( 0 ) ) ).grids.size, 0, 'one tile is no grid' );
	assert.equal( grids( page( four( buttonTile ), { gridPosition: FIXED } ) ).grids.size, 0, 'a fixed panel is an overlay' );
	const twoLinks = four( ( i ) => [
		el( `Root/10#${ i }`, 'Root/4#0', 'div', '', { depth: 3, loop: 9 } ),
		el( `Root/11#${ i }`, `Root/10#${ i }`, 'img', '', { depth: 4, loop: 9, attrs: { src: 'x.jpg' } } ),
		el( `Root/12#${ i }`, `Root/10#${ i }`, 'a', TITLES[ i ], { depth: 4, loop: 9, attrs: { href: 'https://example.com/a/' } } ),
		el( `Root/13#${ i }`, `Root/10#${ i }`, 'a', 'More', { depth: 4, loop: 9, attrs: { href: 'https://example.com/b/' } } ),
	] );
	assert.equal( grids( page( twoLinks ) ).grids.size, 0, 'a tile with two actions is not one card' );
	const oneLink = twoLinks.filter( ( e ) => ! e.key.startsWith( 'Root/13#' ) );
	assert.equal( grids( page( oneLink ) ).grids.size, 1, 'a tile holding exactly one link is a card' );
} );

test( 'a parent shared with other blocks is a note, and the rule is switched by its entry', () => {
	const shared = grids( page( four( buttonTile ), { gridExtra: [ el( 'Root/5#0', 'Root/4#0', 'p', 'Pick one', { depth: 3 } ) ] } ) );
	assert.equal( shared.grids.size, 0 );
	assert.match( shared.notes[ 0 ], /share their parent Root\/4#0 with other blocks/ );
	assert.equal( grids( page( four( buttonTile ) ), null ).grids.size, 0 );
	assert.equal( handlerNamed( { snippet: '<button sc-camel-on-click="{{ s.go }}">' } ), 's.go' );
	assert.equal( handlerNamed( { snippet: '<button>' } ), '' );
} );

// rules.textTileGrid: a loop of three or more whole-link tiles, each two lines of text and no picture, is one card grid.
const NAMES = [ 'Pilot', 'Wayfarer', 'Round', 'Square' ];
// A tile: a link (with an address, or a script click) holding a title over a count; `lines` sets how many text leaves.
const textTile = ( i, { lines = 2, script = false, tag = 'a' } = {} ) => [
	el( `Root/10#${ i }`, 'Root/4#0', tag, '', { depth: 3, loop: 9, box: place( i * 320, 300 ), ...( script ? { attrs: { href: '#' }, snippet: `<${ tag } href="#" sc-camel-on-click="{{ s.go }}" data-dc-tpl="10"></${ tag }>` } : { attrs: { href: `https://example.com/shop/${ i }/` } } ) } ),
	...[ NAMES[ i ], '48 frames', 'In stock' ].slice( 0, lines ).map( ( w, n ) => el( `Root/${ 11 + n }#${ i }`, `Root/10#${ i }`, 'span', w, { depth: 4, loop: 9 } ) ),
];
const textGrids = ( elements, rule = facts().decisions.rules.textTileGrid ) => textTileGrids( { m: inventoryModel( inv( elements ) ), rule, money: facts().decisions.rules.commerceRegion.money } );

test( 'MUST FAIL: a loop of whole-link tiles of two text lines and no picture is one sgs/card-grid with no style written, its tiles absorbed', () => {
	const { skeleton, proposal } = run( page( four( textTile ) ) );
	const blocks = all( skeleton, 'sgs/card-grid' );
	assert.equal( blocks.length, 1 );
	assert.equal( blocks[ 0 ].draftRef?.tpl, 'Root/4#0' );
	assert.deepEqual( blocks[ 0 ].attributes, {} );
	assert.deepEqual( textGrids( page( four( textTile ) ) ).grids.get( 'Root/4#0' ).attributes, {}, 'no picture style is written for a text grid' );
	assert.deepEqual( blocks[ 0 ].innerBlocks, [] );
	const rule = proposal.rows.find( ( r ) => 'Root/10#2' === r.key ) ?? proposal.rows.find( ( r ) => 'Root/11#2' === r.key );
	assert.equal( rule?.rule, 'textTileGrid', 'the tiles are drawn by the block' );
	assert.equal( proposal.rows.find( ( r ) => 'Root/4#0' === r.key )?.rule, 'textTileGrid' );
	assert.deepEqual( proposal.pictureTileGrids, { grids: { 'Root/4#0': 4 }, notes: [] } );
	assert.equal( ( blocks[ 0 ].handover || [] ).filter( ( h ) => 'link' === h.kind ).length, 0, 'links with an address need no handover' );
	const scripted = run( page( four( ( i ) => textTile( i, { script: true } ) ) ) );
	assert.equal( ( all( scripted.skeleton, 'sgs/card-grid' )[ 0 ]?.handover || [] ).filter( ( h ) => 'link' === h.kind ).length, 4, 'a script click is a named link handover' );
} );

test( 'MUST FAIL: a text tile is named by its title in its link handover, not by its subtitle; a bound address has its own wording', () => {
	const scripted = run( page( four( ( i ) => textTile( i, { script: true } ) ) ) );
	const card = all( scripted.skeleton, 'sgs/card-grid' )[ 0 ];
	const link = ( card.handover || [] ).filter( ( h ) => 'link' === h.kind );
	assert.match( link[ 0 ].detail, /^card 1 "Pilot": /, 'named by the first line of the tile' );
	assert.doesNotMatch( link[ 0 ].detail, /48 frames/ );
	const bound = textGrids( page( four( textTile ).map( ( e ) => ( 'Root/10' === e.key.split( '#' )[ 0 ] ? { ...e, attrs: { href: '{{ s.url }}' } } : e ) ) ) ).grids.get( 'Root/4#0' );
	assert.equal( bound.handovers.length, 4 );
	assert.match( bound.handovers[ 0 ].detail, /binds each card's address to the loop's own data/, 'a bound address is not "goes somewhere by script"' );
	assert.doesNotMatch( bound.handovers[ 0 ].detail, /goes somewhere by script/ );
	const picture = pictureTileGrids( { m: inventoryModel( inv( page( four( buttonTile ) ) ) ), rule: facts().decisions.rules.pictureTileGrid, money: facts().decisions.rules.commerceRegion.money } ).grids.get( 'Root/4#0' );
	assert.match( picture.handovers[ 0 ].detail, /^card 1 "Pilot": / );
} );

test( 'negative controls for text tiles: one-line links (a link list), three lines, a picture, a glyph, a price, two controls, two tiles, a plain box, a shared parent, no entry', () => {
	assert.equal( textGrids( page( four( ( i ) => textTile( i, { lines: 1 } ) ) ) ).grids.size, 0, 'a run of one-line links is a link list' );
	assert.equal( textGrids( page( four( ( i ) => textTile( i, { lines: 3 } ) ) ) ).grids.size, 0, 'three lines is a container of its own' );
	assert.equal( textGrids( page( four( ( i ) => textTile( i, { lines: 3 } ) ) ), { ...facts().decisions.rules.textTileGrid, maxTileLines: undefined } ).grids.size, 0, 'a rule naming no maximum still caps a tile at two lines' );
	const withPicture = [ ...four( textTile ), ...[ 0, 1, 2, 3 ].map( ( i ) => el( `Root/14#${ i }`, `Root/10#${ i }`, 'img', '', { depth: 4, loop: 9, attrs: { src: 'x.jpg' } } ) ) ];
	assert.equal( textGrids( page( withPicture ) ).grids.size, 0, 'a tile with a picture is a picture tile' );
	const slot = [ ...four( textTile ), ...[ 0, 1, 2, 3 ].map( ( i ) => el( `Root/17#${ i }`, `Root/10#${ i }`, 'image-slot', '', { depth: 4, loop: 9 } ) ) ];
	assert.equal( textGrids( page( slot ) ).grids.size, 0, 'a tile holding a picture slot still to be filled is a picture tile' );
	const stepTabs = four( ( i ) => textTile( i, { script: true, tag: 'button' } ) );
	assert.equal( textGrids( page( stepTabs ) ).grids.size, 0, 'a button is a step tab or a picker, not a link tile' );
	const painted = [ ...four( textTile ), ...[ 0, 1, 2, 3 ].map( ( i ) => el( `Root/18#${ i }`, `Root/10#${ i }`, 'span', '', { depth: 4, loop: 9, attrs: { style: PHOTO( i ) } } ) ) ];
	assert.equal( textGrids( page( painted ) ).grids.size, 0, 'a tile painting a background picture is a picture tile' );
	const withGlyph = [ ...four( textTile ), el( 'Root/14#0', 'Root/10#0', 'svg', '', { depth: 4, loop: 9 } ) ];
	assert.equal( textGrids( page( withGlyph ) ).grids.size, 0, 'a tile drawing a glyph is not text only' );
	assert.equal( textGrids( page( four( textTile ).map( ( e ) => ( 'Root/12#1' === e.key ? { ...e, words: '£139' } : e ) ) ) ).grids.size, 0, 'a priced tile belongs to the product card' );
	const nested = [ ...four( textTile ), el( 'Root/15#0', 'Root/10#0', 'a', '', { depth: 4, loop: 9, attrs: { href: 'https://example.com/x/' } } ) ];
	assert.equal( textGrids( page( nested ) ).grids.size, 0, 'a tile holding a second control is not one action' );
	assert.equal( textGrids( page( [ ...textTile( 0 ), ...textTile( 1 ) ] ) ).grids.size, 0, 'two tiles are below the minimum' );
	assert.equal( textGrids( page( [ ...textTile( 0 ), ...textTile( 1 ), ...textTile( 2 ) ] ) ).grids.size, 1, 'three tiles are enough' );
	const plain = four( textTile ).map( ( e ) => ( 'Root/4#0' === e.parentKey ? { ...e, tag: 'div', srcTag: 'div', attrs: {} } : e ) );
	assert.equal( textGrids( page( plain ) ).grids.size, 0, 'a box with no link or click is no whole-link tile' );
	const boxed = four( textTile ).map( ( e ) => ( 'Root/4#0' === e.parentKey ? { ...e, tag: 'div', srcTag: 'div', attrs: {} } : e ) );
	const holdsLink = [ ...boxed, ...[ 0, 1, 2, 3 ].map( ( i ) => el( `Root/16#${ i }`, `Root/10#${ i }`, 'a', '', { depth: 4, loop: 9, attrs: { href: 'https://example.com/y/' } } ) ) ];
	assert.equal( textGrids( page( holdsLink ) ).grids.size, 0, 'a box holding a link is the tile shape of the picture rule, never a whole-link text tile' );
	const shared = textGrids( page( four( textTile ), { gridExtra: [ el( 'Root/5#0', 'Root/4#0', 'p', 'Pick one', { depth: 3 } ) ] } ) );
	assert.equal( shared.grids.size, 0 );
	assert.match( shared.notes[ 0 ], /the text tiles of loop .* share their parent Root\/4#0/ );
	assert.match( run( page( four( textTile ), { gridExtra: [ el( 'Root/5#0', 'Root/4#0', 'p', 'Pick one', { depth: 3 } ) ] } ) ).proposal.pictureTileGrids.notes[ 0 ], /the text tiles of loop/, 'the proposal lists the note' );
	assert.equal( textGrids( page( four( textTile ) ), null ).grids.size, 0, 'the rule is switched by its entry' );
	assert.equal( pictureTileGrids( { m: inventoryModel( inv( page( four( textTile ) ) ) ), rule: facts().decisions.rules.pictureTileGrid, money: facts().decisions.rules.commerceRegion.money } ).grids.size, 0, 'the picture rule leaves text tiles alone' );
} );
