// A4 (register), Spec 48 FR-48-82: a list item that holds the unified media-slot shape (a `url`, an `id` and an `alt` of its own, as
// sgs/gallery's mediaItems read by render.php) takes the draft's picture into that slot through the media map. The block declares
// the keys (block.json `items.properties`), so the route can write them. An item whose picture the draft names no uploaded file
// for (an image placeholder, as the Indus brands panel draws) keeps an empty picture and the list has ONE named row. Each test
// fails against the code before this change (the gallery's items declared no picture and the picture was an unwritable field).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDecisions, pictureSlot } from '../lib/fill-list-content.mjs';
import { loopItems } from '../lib/fill-list-items.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const GALLERY = path.resolve( HERE, '../../../plugins/sgs-blocks/src/blocks/gallery/block.json' );
const items = JSON.parse( fs.readFileSync( GALLERY, 'utf8' ) ).attributes.mediaItems.items.properties;
const keys = Object.entries( items ).map( ( [ key, p ] ) => ( { key, type: p.type, html: false } ) );
const target = { kind: 'attr', attr: 'mediaItems', keys };
const MEDIA = { map: { sites: { 'acme-test': { files: [ { asset: 'sites/acme/handoff/assets/chef.png', id: 501, url: 'https://acme.test/chef.png' }, { asset: 'sites/acme/handoff/assets/logo-b.png', id: 502, url: 'https://acme.test/logo-b.png' } ] } } }, site: 'acme-test', origin: '' };
const FIELDS = [ { name: 'href', image: false }, { name: 'logo', image: true }, { name: 'name', image: false, alt: true } ];
const decide = ( list, media = MEDIA ) => listDecisions( { block: 'sgs/gallery', target, node: { innerBlocks: [] }, list: { source: 'loop', fields: FIELDS, ...list }, media, pages: [ { route: 'a', slug: 'a', postType: 'page' } ] } );

test( 'MUST FAIL: sgs/gallery declares the picture of each item (id, url, alt, caption) after its link keys', () => {
	assert.deepEqual( keys.map( ( k ) => k.key ).slice( -4 ), [ 'id', 'url', 'alt', 'caption' ] );
	assert.deepEqual( [ items.id.type, items.url.type, items.alt.type, items.caption.type ], [ 'integer', 'string', 'string', 'string' ] );
	assert.ok( keys.findIndex( ( k ) => 'linkUrl' === k.key ) < keys.findIndex( ( k ) => 'url' === k.key ), 'the link key comes first, so a draft link is never taken for the picture address' );
	assert.deepEqual( pictureSlot( keys ), { url: 'url', id: 'id', alt: 'alt' } );
} );

test( 'MUST FAIL: a draft picture the media map holds is written as the item\'s url and attachment id, with the draft\'s alt text; the link stays in linkUrl', () => {
	const d = decide( { items: [ { href: '#/a', logo: 'assets/chef.png', name: 'Chef Co' }, { href: null, logo: 'assets/logo-b.png', name: 'Logo B' } ] } );
	assert.deepEqual( d.writes[ 0 ].value, [
		{ linkUrl: '/a/', url: 'https://acme.test/chef.png', id: 501, alt: 'Chef Co', linkLabel: 'Chef Co' },
		{ url: 'https://acme.test/logo-b.png', id: 502, alt: 'Logo B', linkLabel: 'Logo B' },
	] );
	assert.deepEqual( d.rows, [] );
} );

test( 'MUST FAIL: pictures the draft names no uploaded file for leave empty pictures and ONE named row for the list', () => {
	const d = decide( { items: [ { href: '#/a', logo: null, name: 'Chef Co' }, { href: '#/a', logo: null, name: 'Logo B' }, { href: '#/a', logo: null, name: null } ] } );
	assert.deepEqual( d.writes[ 0 ].value.map( ( v ) => [ v.url, v.id ] ), [ [ undefined, undefined ], [ undefined, undefined ], [ undefined, undefined ] ] );
	assert.equal( d.rows.length, 1 );
	assert.match( d.rows[ 0 ].reason, /3 of the draft's 3 items draw a picture \(logo:.*no uploaded file.*the client supplies the pictures/ );
	// one picture missing among several is that item's own row
	const some = decide( { items: [ { href: '#/a', logo: 'assets/chef.png', name: 'A' }, { href: '#/a', logo: null, name: 'B' } ] } );
	assert.equal( some.rows.length, 1 );
	assert.match( some.rows[ 0 ].reason, /item 2's picture \(logo\) is chosen by the draft at run time or is no uploaded file/ );
	assert.equal( some.writes[ 0 ].value[ 0 ].id, 501 );
} );

test( 'NEGATIVE: an item with a key for the image role, or without both url and id, has no picture slot; a draft field named url is a link', () => {
	assert.equal( pictureSlot( [ ...keys, { key: 'media', type: 'object' } ] ), null );
	assert.equal( pictureSlot( keys.filter( ( k ) => 'id' !== k.key ) ), null );
	assert.equal( pictureSlot( keys.map( ( k ) => ( 'id' === k.key ? { ...k, type: 'string' } : k ) ) ), null );
	assert.deepEqual( pictureSlot( keys.filter( ( k ) => 'alt' !== k.key ) ), { url: 'url', id: 'id', alt: null } );
	// a link field named like the picture key never lands in the picture address
	const d = decide( { fields: [ { name: 'url', image: false }, { name: 'logo', image: true } ], items: [ { url: '#/a', logo: 'assets/chef.png' } ] } );
	assert.deepEqual( d.writes[ 0 ].value[ 0 ], { linkUrl: '/a/', url: 'https://acme.test/chef.png', id: 501 } );
	// a second picture field is a named row, never written over the first
	const two = decide( { fields: [ { name: 'logo', image: true }, { name: 'badge', image: true } ], items: [ { logo: 'assets/chef.png', badge: 'assets/logo-b.png' } ] } );
	assert.equal( two.writes[ 0 ].value[ 0 ].id, 501 );
	assert.ok( two.rows.some( ( r ) => 'badge' === r.field ) );
} );

test( 'MUST FAIL: a loop of logo links names the picture field and marks an image placeholder text (or an alt attribute) as the picture description', () => {
	const C = 'Demo';
	const fact = ( n, tag, holes = [], chain = [], scFor = [] ) => [ `${ C }/${ n }`, { template: { key: `${ C }/${ n }`, tag, realTag: tag, holes: holes.map( ( [ where, path ] ) => ( { where, path } ) ), parentChain: chain.map( ( x ) => `${ C }/${ x }` ), membership: { scFor } } } ];
	const inv = ( key, parent, tag, attrs = {}, loops = [] ) => ( { key, parentKey: parent, tag, words: '', attrs, membership: loops.map( ( [ tpl, as ] ) => ( { kind: 'sc-for', tpl: String( tpl ), as } ) ) } );
	const facts = { elements: Object.fromEntries( [
		fact( 40, 'div' ), fact( 41, 'sc-for', [ [ 'attr:list', 'logos' ] ], [ 40 ] ),
		fact( 42, 'a', [ [ 'attr:href', 'l.href' ] ], [ 41, 40 ] ),
		fact( 43, 'image-slot', [ [ 'attr:id', 'l.id' ], [ 'attr:placeholder', 'l.name' ] ], [ 42, 41, 40 ] ),
		fact( 44, 'img', [ [ 'attr:src', 'l.src' ], [ 'attr:alt', 'l.desc' ] ], [ 42, 41, 40 ] ),
	] ) };
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ), ...[ 0, 1 ].flatMap( ( i ) => [ inv( `Root/42#${ i }`, 'Root/40#0', 'a', { href: `#/b${ i }` }, [ [ 41, 'l' ] ] ), inv( `Root/43#${ i }`, `Root/42#${ i }`, 'image-slot', { placeholder: `Brand ${ i }` }, [ [ 41, 'l' ] ] ), inv( `Root/44#${ i }`, `Root/42#${ i }`, 'img', { alt: `Desc ${ i }` }, [ [ 41, 'l' ] ] ) ] ) ] };
	const list = loopItems( { inventory, facts: { elements: Object.fromEntries( Object.entries( facts.elements ).map( ( [ k, v ] ) => [ k.replace( 'Demo', 'Root' ), v ] ) ) }, rootKey: 'Root/40#0', rootComponent: null } );
	const byName = Object.fromEntries( list.fields.map( ( f ) => [ f.name, f ] ) );
	assert.equal( byName.id.image, true );
	assert.equal( byName.id.alt, undefined, 'the picture field itself is not the description' );
	assert.equal( byName.name.alt, true, 'an image placeholder text is the picture description' );
	assert.equal( byName.desc.alt, true, 'an alt attribute is the picture description' );
	assert.equal( byName.href.alt, undefined, 'a link is not' );
} );
