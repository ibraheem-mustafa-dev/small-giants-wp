// Pictures a draft paints as backgrounds (Spec 48 FR-48-6, lib/skeleton-rules.mjs `rules.backgroundPicture` and the pill rule): on
// Eye Care Home the shape tiles are <button>s whose photo is an absolutely placed span painting a url(), and the product cards'
// photo is an empty role="img" div painting a url(). The tile was read as a pill that absorbed its photo, and the card photo
// was left unresolved, so 8 of 14 tiles drew no picture.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { sgsOnly } from '../lib/skeleton-classify.mjs';
import { makeRules } from '../lib/skeleton-rules.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';
import { handoverProblems } from '../lib/fill-handover.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
// Facts for a client with no Site Info map and no decisions; `off` removes those rules from a copy of the decisions.
const facts = ( ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => ( id.includes( '.' ) ? delete f.decisions[ id.split( '.' )[ 0 ] ][ id.split( '.' )[ 1 ] ] : delete f.decisions.rules[ id ] ) );
	return f;
};

// A fixture tree: E( tag, { words, attrs, style, snippet, display, box }, children ) -> an inventory in the shape
// lib/skeleton-inventory.mjs reads (keys Root/<n>#0, parent keys, depth, words, allText, boxes and visibility).
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const attrs = { ...( node.o.attrs || {} ), ...( node.o.style ? { style: node.o.style } : {} ) };
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs, words, allText: words, membership: node.o.membership || [], srcTag: node.tag, srcOwnText: words,
			snippet: node.o.snippet || `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, node.o.box || { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root, o = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: o.facts || facts(), surface: 'fixture', surfaceKind: o.kind || 'page', surfaceName: o.name || 'Fixture', built: o.built || null, motion: o.motion || new Set(), db, factRecord: o.factRecord } );
const row = ( r, pred ) => r.proposal.rows.find( pred );
const byWords = ( r, w ) => row( r, ( x ) => x.words === w );
const byTag = ( r, t ) => row( r, ( x ) => x.tag === t );
const settled = ( x ) => ( x ? { block: x.block, action: x.action, rule: x.rule } : null );
const svg = () => E( 'svg', {}, [ E( 'path' ) ] );
const section = ( kids ) => E( 'section', { display: 'block' }, kids );

const PHOTO = 'position:absolute;inset:0;background-size:cover;background-image:url(https://images.example/photo.jpg)';
const tile = () => E( 'button', { attrs: {}, display: 'flex' }, [
	E( 'span', { style: PHOTO } ),
	E( 'span', { style: 'position:absolute;inset:0;background:rgba(0,0,0,.2)' } ),
	E( 'span', { words: 'Wayfarer' } ),
] );
const pill = () => E( 'button', { attrs: {} }, [ E( 'span', {}, [ svg() ] ), E( 'span', { words: 'Add to bag' } ) ] );
const cardPhoto = () => E( 'div', { attrs: { role: 'img', 'aria-label': 'Cat-eye sunglasses' }, style: 'width:100%;height:100%;background-size:cover;background-image:url(https://images.example/card.jpg)' } );
const plainRole = () => E( 'div', { attrs: { role: 'img', 'aria-label': 'A picture' }, style: 'width:100%;height:100%;background:#eee' } );

test( 'MUST FAIL: a button tile holding a photo layer is a container whose photo layer is a decorative image, not a pill that absorbs it', () => {
	const r = run( section( [ tile() ] ) );
	const t = byTag( r, 'button' );
	assert.notEqual( t.rule, 'pillButton', 'a tile is no pill' );
	assert.equal( t.block, 'sgs/container' );
	const layers = r.proposal.rows.filter( ( x ) => 'span' === x.tag && ! x.words );
	assert.deepEqual( layers.map( ( x ) => [ x.block, x.rule, x.action ?? null ] ), [ [ 'sgs/decorative-image', 'decorationLayer', null ], [ 'sgs/decorative-image', 'decorationLayer', null ] ] );
} );

test( 'negative control: a button holding only a glyph and a label is still a pill', () => {
	const r = run( section( [ pill() ] ) );
	assert.deepEqual( settled( byTag( r, 'button' ) ), { block: 'sgs/button', action: null, rule: 'pillButton' } );
} );

test( 'MUST FAIL: an empty role="img" element painting a url() is a media block', () => {
	const r = run( section( [ cardPhoto() ] ) );
	const d = byTag( r, 'div' ) && r.proposal.rows.find( ( x ) => 'div' === x.tag && x.depth === 1 );
	assert.deepEqual( [ d.block, d.rule ], [ 'sgs/media', 'backgroundPicture' ] );
	assert.deepEqual( run( section( [ cardPhoto() ] ), { facts: facts( 'backgroundPicture' ) } ).proposal.rows.find( ( x ) => 'div' === x.tag && x.depth === 1 ).rule === 'backgroundPicture', false, 'MUST FAIL without its decisions entry' );
} );

test( 'negative control: a role="img" element that paints no url() is not a background picture', () => {
	const r = run( section( [ plainRole() ] ) );
	assert.notEqual( r.proposal.rows.find( ( x ) => 'div' === x.tag && x.depth === 1 ).rule, 'backgroundPicture' );
} );
