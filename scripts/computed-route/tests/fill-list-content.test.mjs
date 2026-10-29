// Spec 48 FR-48-82 (item arrays), lib/fill-list-content.mjs and lib/fill-list-items.mjs: a block that holds a list takes the
// items the draft draws, never its default items. A loop's copies come from the rendered surface inventory (a loop nested in
// another loop reads this page's copies only); a current-item display (a slider showing items[i]) reads every item from the
// draft's logic; each draft field goes to the item key of its name or role; a list kept as one kind of child block becomes
// those children; a picture goes through the media map; what no key holds is a named row; a held setting is kept. The split
// image of a block whose DB rows name no image setting is found from its block.json image trio (lib/fill-media.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseLogic } from '../lib/intake-ast.mjs';
import { listItems, loopItems, currentItems, holeField } from '../lib/fill-list-items.mjs';
import { listContentWrites, listTarget, matchFields, listDecisions, withPictures, applyChildren, keyRole, loadItemRoles, ITEM_ROLES, ITEM_ROLES_FILE } from '../lib/fill-list-content.mjs';
import { imageSlots, schemaImageSlots, pictureSettles } from '../lib/fill-media.mjs';

const C = 'Demo';
const SCHEMAS = {
	'sgs/milestones': { entries: { type: 'array', default: [ { date: '2020-01-01', title: 'First', description: '<p>Text.</p>', image: 0 } ] } },
	'sgs/steps': { steps: { type: 'array', default: [ { number: '1', title: 'First Step' } ], items: { type: 'object', properties: { icon: { type: 'string' }, number: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } } } } },
	'sgs/gallery': { mediaItems: { type: 'array', default: [], items: { type: 'object', properties: { decorative: { type: 'boolean' }, _key: { type: 'string' }, objectFit: { type: 'string' }, focalPoint: { type: 'object' }, linkUrl: { type: 'string' }, linkUrlSource: { type: 'string' }, linkTarget: { type: 'string' }, linkLabel: { type: 'string' } } } } },
	'sgs/logos': { logos: { type: 'array', default: [] , items: { type: 'object', properties: { media: { type: 'object' }, linkUrl: { type: 'string' } } } } },
	'sgs/quotes': {},
	'sgs/quote': { quote: { type: 'string' }, reviewerName: { type: 'string' }, orgName: { type: 'string' }, avatarMedia: { type: 'object' } },
	'sgs/split': { splitMediaImageUrl: { type: 'string' }, splitMediaImageId: { type: 'integer' }, splitMediaImageAlt: { type: 'string' }, splitMediaVideoUrl: { type: 'string' }, splitMediaVideoId: { type: 'integer' }, ctaUrl: { type: 'string' } },
};
const schemaOf = ( b ) => SCHEMAS[ b ] || null;

function makeDb() {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT, alt_companion_attr TEXT )' );
	db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
	db.exec( `INSERT INTO block_attributes VALUES
		( 'sgs/milestones', 'entries', 'array', 'content', NULL, NULL ), ( 'sgs/milestones', 'titleColour', 'string', 'color', 'color', NULL ),
		( 'sgs/steps', 'steps', 'array', 'content', NULL, NULL ),
		( 'sgs/logos', 'logos', 'array', 'content', NULL, NULL ), ( 'sgs/gallery', 'mediaItems', 'array', 'content', NULL, NULL ),
		( 'sgs/quote', 'quote', 'string', 'text-content', NULL, NULL ), ( 'sgs/quote', 'reviewerName', 'string', 'content', NULL, NULL ),
		( 'sgs/quote', 'orgName', 'string', 'text-content', NULL, NULL ), ( 'sgs/quote', 'avatarMedia', 'object', 'image-object', NULL, NULL ),
		( 'sgs/quote', 'quoteColour', 'string', 'color', 'color', NULL ),
		( 'sgs/split', 'splitMediaImageUrl', 'string', 'content', NULL, NULL ),
		( 'sgs/pic', 'imageAlt', 'string', 'image-alt', NULL, 'imageUrl' )` );
	db.exec( `INSERT INTO block_composition VALUES ( 'sgs/quotes', '["sgs/quote"]' ), ( 'sgs/row', '["sgs/a","sgs/b"]' )` );
	return db;
}

// A fact element: { template: { tag, realTag, holes, parentChain, membership } }.
const fact = ( n, tag, holes = [], chain = [], scFor = [] ) => [ `${ C }/${ n }`, { template: { key: `${ C }/${ n }`, tag, realTag: tag, holes: holes.map( ( [ where, path ] ) => ( { where, path } ) ), parentChain: chain.map( ( x ) => `${ C }/${ x }` ), membership: { scFor } } } ];
// An inventory element: { key, parentKey, tag, words, attrs, membership }.
const inv = ( key, parent, tag, words = '', loops = [], attrs = {} ) => ( { key, parentKey: parent, tag, words, attrs, membership: loops.map( ( [ tpl, as ] ) => ( { kind: 'sc-for', tpl: String( tpl ), as } ) ) } );

// A milestone loop (sc-for 11, `ms`) inside element 10, three copies of item 12 with year, title and description.
const MS_FACTS = { elements: Object.fromEntries( [
	fact( 10, 'div' ),
	fact( 11, 'sc-for', [ [ 'attr:list', 'milestones' ] ], [ 10 ] ),
	fact( 12, 'div', [ [ 'style:gap', 'R.gap' ] ], [ 11, 10 ] ),
	fact( 13, 'span', [ [ 'text', 'ms.year' ] ], [ 12, 11, 10 ] ),
	fact( 14, 'h3', [ [ 'text', 'ms.title' ] ], [ 12, 11, 10 ] ),
	fact( 15, 'p', [ [ 'text', 'ms.desc' ], [ 'style:color', 'ms.fg' ] ], [ 12, 11, 10 ] ),
] ) };
const MS_INV = { elements: [
	inv( 'Root/10#0', null, 'div' ),
	...[ [ '1962', 'A shop opens', 'The first shop.' ], [ '1972', 'Wholesale', 'A wholesale arm.' ], [ 'Now', '5,000 customers', 'Across the UK & Europe.' ] ].flatMap( ( [ y, t, d ], i ) => [
		inv( `Root/12#${ i }`, 'Root/10#0', 'div', '', [ [ 11, 'ms' ] ] ),
		inv( `Root/13#${ i }`, `Root/12#${ i }`, 'span', y, [ [ 11, 'ms' ] ] ),
		inv( `Root/14#${ i }`, `Root/12#${ i }`, 'h3', t, [ [ 11, 'ms' ] ] ),
		inv( `Root/15#${ i }`, `Root/12#${ i }`, 'p', d, [ [ 11, 'ms' ] ] ),
	] ),
] };

const LOGIC = `class Demo {
	renderVals() {
		const items = [
			{ text: 'Always on time.', name: 'Shop owner', company: 'Retail customer', avatar: 'av-1' },
			{ text: 'Great range.', name: 'Chef', company: 'Restaurant', avatar: 'assets/chef.png' },
		];
		const i = this.state.i % items.length;
		return { cur: items[ i ], one: { title: 'Only one' }, dots: items.map( ( x, k ) => ( { on: k === i } ) ) };
	}
}`;
const IDX = parseLogic( LOGIC );
// A slider (element 20) showing cur.text, cur.name, cur.company and the avatar placeholder, and a dots loop with no field.
const Q_FACTS = { elements: Object.fromEntries( [
	fact( 20, 'div' ),
	fact( 21, 'p', [ [ 'text', 'cur.text' ] ], [ 20 ] ),
	fact( 22, 'image-slot', [ [ 'attr:id', 'cur.avatar' ], [ 'attr:placeholder', 'cur.name' ] ], [ 20 ] ),
	fact( 23, 'span', [ [ 'text', 'cur.name' ] ], [ 20 ] ),
	fact( 24, 'span', [ [ 'text', 'cur.company' ] ], [ 20 ] ),
	fact( 25, 'sc-for', [ [ 'attr:list', 'dots' ] ], [ 20 ] ),
	fact( 26, 'button', [ [ 'style:width', 'dt.w' ], [ 'attr:onClick', 'dt.go' ] ], [ 25, 20 ], [ { as: 'dt' } ] ),
	fact( 30, 'div' ),
	fact( 31, 'h3', [ [ 'text', 'one.title' ] ], [ 30 ] ),
] ) };
const Q_INV = { elements: [ inv( 'Root/20#0', null, 'div' ), inv( 'Root/21#0', 'Root/20#0', 'p', 'Always on time.' ), inv( 'Root/26#0', 'Root/20#0', 'button', '', [ [ 25, 'dt' ] ] ), inv( 'Root/26#1', 'Root/20#0', 'button', '', [ [ 25, 'dt' ] ] ) ] };

const MEDIA = { map: { sites: { 'acme-test': { files: [ { asset: 'sites/acme/handoff/assets/chef.png', id: 501, url: 'https://acme.test/chef.png' }, { asset: 'https://images.unsplash.com/photo-1700000000-abcdef12', id: 502, url: 'https://acme.test/p1.jpg', stock: true } ] } } }, site: 'acme-test', origin: '' };

// One skeleton node per block with a tpl draftRef, as lib/fill-skeleton.mjs::skeletonNodes gives them.
function pass( blocks, { facts, inventory, idx = null, pages = null, picturesOf } ) {
	const flat = blocks.map( ( [ name, tpl, attributes = {}, innerBlocks = [] ], i ) => ( { name, attributes: { ...attributes, className: `cr-ref-t-${ i }` }, innerBlocks } ) );
	const nodes = blocks.map( ( [ name, tpl ], index ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl } } ] } ) );
	const r = listContentWrites( { nodes, flat, refOf: ( n ) => n.attributes?.className ?? null, facts, inventory, idxFor: () => idx, db: makeDb(), schemaOf, media: MEDIA, pages, rootComponent: C, picturesOf } );
	return { r, flat };
}

test( 'a loop the draft draws fills the block\'s array setting with its items, field to key by role (MUST FAIL)', () => {
	const { r, flat } = pass( [ [ 'sgs/milestones', 'Root/10#0' ] ], { facts: MS_FACTS, inventory: MS_INV } );
	assert.deepEqual( flat[ 0 ].attributes.entries, [
		{ date: '1962', title: 'A shop opens', description: '<p>The first shop.</p>' },
		{ date: '1972', title: 'Wholesale', description: '<p>A wholesale arm.</p>' },
		{ date: 'Now', title: '5,000 customers', description: '<p>Across the UK &amp; Europe.</p>' },
	] );
	assert.equal( r.writes.length, 1 );
	assert.equal( r.writes[ 0 ].attr, 'entries' );
	assert.equal( r.handover.length, 0 );
} );

test( 'the item keys come from the block.json item schema, a plain default stays plain (MUST FAIL)', () => {
	const { flat } = pass( [ [ 'sgs/steps', 'Root/10#0' ] ], { facts: MS_FACTS, inventory: MS_INV } );
	assert.deepEqual( flat[ 0 ].attributes.steps[ 0 ], { title: 'A shop opens', description: 'The first shop.' } );
	// `year` has no key in a steps item (no date role), so it is a named row, never dropped silently.
	assert.equal( flat[ 0 ].attributes.steps.length, 3 );
} );

test( 'a field no item key takes is a named handover row (MUST FAIL)', () => {
	const { r } = pass( [ [ 'sgs/steps', 'Root/10#0' ] ], { facts: MS_FACTS, inventory: MS_INV } );
	const row = r.handover.find( ( h ) => 'year' === h.evidence.key );
	assert.ok( row, 'the year field is a row' );
	assert.match( row.reason, /no place in sgs\/steps's steps/ );
	assert.equal( row.evidence.draft, '1962 | 1972 | Now' );
	assert.equal( row.owner, 'content-page' );
} );

test( 'a loop nested in an outer loop reads this page\'s rendered copies only (MUST FAIL)', () => {
	// The block element sits inside an outer `b` loop (sc-for 9); its own loop is 11.
	// The block also prints a field of the outer item (`b.title`): the outer loop is never the block's list.
	const facts = { elements: { ...MS_FACTS.elements, ...Object.fromEntries( [ fact( 16, 'h2', [ [ 'text', 'b.title' ] ], [ 10 ] ) ] ) } };
	const nested = { elements: [ ...MS_INV.elements, inv( 'Root/16#0', 'Root/10#0', 'h2', 'Our story' ) ].map( ( e ) => ( { ...e, membership: [ { kind: 'sc-for', tpl: '9', as: 'b' }, ...e.membership ] } ) ) };
	const r = loopItems( { inventory: nested, facts, rootKey: 'Root/10#0', rootComponent: C } );
	assert.equal( r.items.length, 3 );
	assert.match( r.source, /loop ms \(sc-for 11\)/ );
} );

test( 'a current-item display reads every item from the draft\'s logic and becomes the host\'s child blocks (MUST FAIL)', () => {
	const { r, flat } = pass( [ [ 'sgs/quotes', 'Root/20#0' ] ], { facts: Q_FACTS, inventory: Q_INV, idx: IDX } );
	assert.equal( r.children.length, 1 );
	applyChildren( flat, r.children );
	assert.deepEqual( flat[ 0 ].innerBlocks.map( ( c ) => c.name ), [ 'sgs/quote', 'sgs/quote' ] );
	assert.deepEqual( flat[ 0 ].innerBlocks[ 0 ].attributes, { quote: 'Always on time.', reviewerName: 'Shop owner', orgName: 'Retail customer' } );
	// The second item's avatar is a draft file the media map holds: its attachment.
	assert.deepEqual( flat[ 0 ].innerBlocks[ 1 ].attributes.avatarMedia, { id: 501, url: 'https://acme.test/chef.png' } );
	// The first item's avatar is a placeholder the draft fills at run time: a named row.
	assert.equal( r.handover.length, 1 );
	assert.match( r.handover[ 0 ].reason, /item 1's picture \(avatar "av-1"\)/ );
	assert.equal( r.writes.find( ( w ) => 'innerBlocks' === w.attr ).after.length, 2 );
} );

test( 'a head that resolves to one object is no list, and no draft folder is a named reason', () => {
	assert.equal( currentItems( { facts: Q_FACTS, rootKey: 'Root/30#0', rootComponent: C, idx: IDX } ), null );
	assert.match( currentItems( { facts: Q_FACTS, rootKey: 'Root/20#0', rootComponent: C, idx: null } ).reason, /no draft folder/ );
	// The loop path wins when the inventory shows one; the dots loop prints no field, so the slider has none.
	assert.equal( loopItems( { inventory: Q_INV, facts: Q_FACTS, rootKey: 'Root/20#0', rootComponent: C } ), null );
	assert.equal( listItems( { inventory: Q_INV, facts: Q_FACTS, rootKey: 'Root/20#0', rootComponent: C, idx: IDX } ).items.length, 2 );
	// A loop variable is never a current-item display, even when the logic's root data has a list of the same name.
	const looped = { elements: Object.fromEntries( [ fact( 60, 'div' ), fact( 61, 'sc-for', [], [ 60 ] ), fact( 62, 'p', [ [ 'text', 'cur.text' ] ], [ 61, 60 ], [ { as: 'cur' } ] ) ] ) };
	assert.equal( currentItems( { facts: looped, rootKey: 'Root/60#0', rootComponent: C, idx: IDX } ), null );
} );

test( 'a held setting is kept and a host with other children is not this list (negative controls)', () => {
	const held = [ { title: 'Kept' } ];
	const a = pass( [ [ 'sgs/milestones', 'Root/10#0', { entries: held } ] ], { facts: MS_FACTS, inventory: MS_INV } );
	assert.deepEqual( a.flat[ 0 ].attributes.entries, held );
	assert.equal( a.r.writes.length, 0 );
	const b = pass( [ [ 'sgs/quotes', 'Root/20#0', {}, [ { name: 'sgs/heading', attributes: {}, innerBlocks: [] } ] ] ], { facts: Q_FACTS, inventory: Q_INV, idx: IDX } );
	assert.equal( b.r.children.length + b.r.writes.length + b.r.handover.length, 0 );
	// A block with no list setting and no single child block is never touched.
	const c = pass( [ [ 'sgs/row', 'Root/10#0' ] ], { facts: MS_FACTS, inventory: MS_INV } );
	assert.equal( c.r.writes.length + c.r.unmapped.length, 0 );
} );

test( 'skeleton children that are the list take only the item values they lack; a count that differs is a row', () => {
	const kids = [ { name: 'sgs/quote', attributes: { quote: 'Own words' }, innerBlocks: [] }, { name: 'sgs/quote', attributes: {}, innerBlocks: [] } ];
	const { r, flat } = pass( [ [ 'sgs/quotes', 'Root/20#0', {}, kids ] ], { facts: Q_FACTS, inventory: Q_INV, idx: IDX } );
	assert.equal( flat[ 0 ].innerBlocks[ 0 ].attributes.quote, 'Own words' );
	assert.equal( flat[ 0 ].innerBlocks[ 0 ].attributes.reviewerName, 'Shop owner' );
	assert.equal( flat[ 0 ].innerBlocks[ 1 ].attributes.quote, 'Great range.' );
	assert.equal( r.children.length, 0 );
	const one = pass( [ [ 'sgs/quotes', 'Root/20#0', {}, [ kids[ 1 ] ] ] ], { facts: Q_FACTS, inventory: Q_INV, idx: IDX } );
	assert.match( one.r.handover[ 0 ].reason, /draws 2 items and the skeleton holds 1/ );
} );

test( 'items holding only links are written, never dropped (S7); a hash route goes through the page map (MUST FAIL)', () => {
	const facts = { elements: Object.fromEntries( [ fact( 40, 'div' ), fact( 41, 'sc-for', [], [ 40 ] ), fact( 42, 'a', [ [ 'attr:href', 'l.href' ] ], [ 41, 40 ] ), fact( 43, 'image-slot', [ [ 'attr:id', 'l.id' ] ], [ 42, 41, 40 ] ) ] ) };
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ), ...[ 0, 1 ].flatMap( ( i ) => [ inv( `Root/42#${ i }`, 'Root/40#0', 'a', '', [ [ 41, 'l' ] ], { href: `#/brand-${ i }` } ), inv( `Root/43#${ i }`, `Root/42#${ i }`, 'image-slot', '', [ [ 41, 'l' ] ] ) ] ) ] };
	const pages = [ { route: 'brand-0', slug: 'brand-0', postType: 'page' } ];
	const bare = pass( [ [ 'sgs/logos', 'Root/40#0' ] ], { facts, inventory, pages } );
	assert.equal( bare.r.writes.length, 1, 'the items are written with their links' );
	assert.deepEqual( bare.flat[ 0 ].attributes.logos.map( ( l ) => l.linkUrl ), [ '/brand-0/', undefined ] );
	assert.ok( bare.r.handover.some( ( h ) => /picture \(id\) is chosen by the draft at run time/.test( h.reason ) ), 'each unread picture is a named row' );
	// With a drawn picture per item the pictures are written, each link as its page's permalink.
	const drawn = pass( [ [ 'sgs/logos', 'Root/40#0' ] ], { facts, inventory, pages, picturesOf: () => [ 'https://images.unsplash.com/photo-1700000000-abcdef12?w=600', 'assets/chef.png' ] } );
	assert.deepEqual( drawn.flat[ 0 ].attributes.logos.map( ( l ) => l.media ), [ { id: 502, url: 'https://acme.test/p1.jpg' }, { id: 501, url: 'https://acme.test/chef.png' } ] );
	assert.deepEqual( drawn.flat[ 0 ].attributes.logos.map( ( l ) => l.linkUrl ), [ '/brand-0/', undefined ] );
	assert.match( drawn.r.handover.find( ( h ) => 'href' === h.evidence.key ).reason, /item 2's link "#\/brand-1" goes to no page/ );
} );

test( 'a pictures list of another length leaves the placeholder rows', () => {
	const list = { items: [ { img: null }, { img: null } ], fields: [ { name: 'img', image: true } ], source: 's' };
	assert.equal( withPictures( list, [ 'a.png' ], MEDIA ), list );
	assert.equal( withPictures( list, null, MEDIA ), list );
	assert.deepEqual( withPictures( list, [ 'assets/chef.png', 'x.png' ], MEDIA ).items, [ { img: 'assets/chef.png' }, { img: 'x.png' } ] );
	// An item whose own value is an uploaded picture keeps it.
	const own = { ...list, items: [ { img: 'assets/chef.png' }, { img: null } ] };
	assert.deepEqual( withPictures( own, [ 'x.png', 'y.png' ], MEDIA ).items, [ { img: 'assets/chef.png' }, { img: 'y.png' } ] );
} );

test( 'a list block with no list in its draft element is a row naming the default it keeps', () => {
	const facts = { elements: Object.fromEntries( [ fact( 50, 'div' ), fact( 51, 'p', [ [ 'text', 'intro' ] ], [ 50 ] ) ] ) };
	const { r } = pass( [ [ 'sgs/milestones', 'Root/50#0' ] ], { facts, inventory: { elements: [ inv( 'Root/50#0', null, 'div' ) ] }, idx: IDX } );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /keeps its default items/ );
	const none = pass( [ [ 'sgs/milestones', 'Root/10#0' ] ], { facts: null, inventory: MS_INV } );
	assert.match( none.r.unmapped[ 0 ].reason, /no fact record/ );
} );

test( 'roles: a key takes its first role, a field each role in order, a tie goes to the shared word', () => {
	assert.equal( keyRole( 'orgLogo' ), 'image' );
	assert.equal( keyRole( 'orgName' ), 'organisation' );
	assert.equal( keyRole( 'reviewerName' ), 'author' );
	assert.equal( keyRole( 'reviewDate' ), 'date' );
	const keys = [ { key: 'orgLogo' }, { key: 'avatarMedia' }, { key: 'reviewerName' }, { key: 'title' } ];
	assert.deepEqual( matchFields( [ { name: 'avatar', image: true }, { name: 'name', image: false } ], keys ).map, { avatar: 'avatarMedia', name: 'reviewerName' } );
	// With no author key, a name is a title.
	assert.deepEqual( matchFields( [ { name: 'name', image: false } ], [ { key: 'title' } ] ).map, { name: 'title' } );
} );

test( 'MUST FAIL: a key\'s later role takes a field when the block\'s item has no key of that primary role (a team member\'s name takes the draft title)', () => {
	// sgs/team-member's item keys as the DB lists them (photo, name, role, bio): `name` is an author first and a title second.
	const member = [ { key: 'photo' }, { key: 'name' }, { key: 'role' }, { key: 'bio' } ];
	const got = matchFields( [ { name: 'image', image: true }, { name: 'title', image: false }, { name: 'position', image: false }, { name: 'description', image: false } ], member );
	assert.deepEqual( got.map, { image: 'photo', title: 'name', position: 'role', description: 'bio' } );
	assert.deepEqual( got.unmatched, [] );
	// A product's `text` (a quote first, a description second) takes the draft description; with a quote key beside it, the
	// quote key keeps quotes and `text` is never preferred over a key whose primary role is the field's.
	assert.deepEqual( matchFields( [ { name: 'description', image: false } ], [ { key: 'name' }, { key: 'text' } ] ).map, { description: 'text' } );
	assert.deepEqual( matchFields( [ { name: 'heading', image: false } ], [ { key: 'reviewerName' }, { key: 'title' } ] ).map, { heading: 'title' }, 'a key whose primary role is the field\'s wins over one naming it later' );
	assert.deepEqual( matchFields( [ { name: 'customer', image: false }, { name: 'heading', image: false } ], [ { key: 'name' }, { key: 'title' } ] ).map, { customer: 'name', heading: 'title' } );
} );

test( "MUST FAIL (a setting takes the field named for it first): a client's testimonial loop prints title, text, name and date; the reviewer's name takes the name field, never the headline, and no setting takes the headline by a word that only qualifies it", () => {
	// The fields Mama's testimonial loop prints (the fact record's holes r.title, r.text, r.name, r.date, in document order)
	// and sgs/testimonial's content keys as the DB lists them (lib/fill-list-content.mjs::listTarget on sgs/testimonial-slider).
	const fields = [ 'title', 'text', 'name', 'date' ].map( ( name ) => ( { name, image: false } ) );
	const keys = [ 'quote', 'summaryPhrase', 'reviewerName', 'reviewerRole', 'orgName', 'avatarMedia', 'orgLogo', 'workMedia', 'reviewDate', 'sourcePlatform' ].map( ( key ) => ( { key } ) );
	const got = matchFields( fields, keys );
	assert.deepEqual( got.map, { text: 'quote', name: 'reviewerName', date: 'reviewDate' } );
	assert.deepEqual( got.unmatched, [ 'title' ], 'the headline is a named row, never the organisation' );
	// Negative control: a key whose word is its primary role's keeps taking a later role (the team member's name above).
	assert.deepEqual( matchFields( [ { name: 'title', image: false } ], [ { key: 'name' } ] ).map, { title: 'name' } );
} );

test( 'the item-role vocabulary is data: a file breaking its schema or naming a role twice is refused', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'item-roles-' ) );
	fs.copyFileSync( ITEM_ROLES_FILE.replace( /\.json$/, '.schema.json' ), path.join( dir, 'item-roles.schema.json' ) );
	const write = ( data ) => {
		fs.writeFileSync( path.join( dir, 'item-roles.json' ), JSON.stringify( data ) );
		return path.join( dir, 'item-roles.json' );
	};
	assert.deepEqual( loadItemRoles( write( { roles: [ { role: 'title', words: [ 'title' ] } ] } ) ).map( ( [ r, w ] ) => [ r, [ ...w ] ] ), [ [ 'title', [ 'title' ] ] ] );
	assert.throws( () => loadItemRoles( write( { roles: [ { role: 'title', words: [ 'Title' ] } ] } ) ), /does not match/ );
	assert.throws( () => loadItemRoles( write( { roles: [ { role: 'title', words: [ 'title' ] }, { role: 'title', words: [ 'name' ] } ] } ) ), /names "title" twice/ );
	assert.throws( () => loadItemRoles( write( { roles: [ { role: 'title', words: /title/.source } ] } ) ), /does not match/ );
	fs.rmSync( dir, { recursive: true, force: true } );
	assert.ok( ITEM_ROLES.length > 0 && ITEM_ROLES.every( ( [ r, w ] ) => 'string' === typeof r && w.size > 0 ), 'the committed vocabulary loads' );
} );

test( 'list targets come from the DB: one content array, else one child block', () => {
	const db = makeDb();
	assert.equal( listTarget( db, 'sgs/milestones', schemaOf ).attr, 'entries' );
	assert.equal( listTarget( db, 'sgs/milestones', schemaOf ).keys.find( ( k ) => 'description' === k.key ).html, true );
	assert.deepEqual( listTarget( db, 'sgs/quotes', schemaOf ).keys.map( ( k ) => k.key ), [ 'quote', 'reviewerName', 'orgName', 'avatarMedia' ] );
	assert.equal( listTarget( db, 'sgs/row', schemaOf ), null );
	assert.equal( listDecisions( { block: 'sgs/quotes', target: listTarget( db, 'sgs/quotes', schemaOf ), node: { innerBlocks: [] }, list: { items: [ { text: 'x' } ], fields: [ { name: 'text', image: false } ], source: 's' } } ).children[ 0 ].attributes.quote, 'x' );
} );

test( 'holes: only content holes with a head and a field are item fields', () => {
	assert.deepEqual( holeField( { where: 'text', path: 'ms.year' }, 'span' ), { head: 'ms', name: 'year', image: false, text: true, attr: null } );
	assert.equal( holeField( { where: 'style:color', path: 'ms.fg' }, 'span' ), null );
	assert.deepEqual( holeField( { where: 'attr:placeholder', path: 'ms.title' }, 'image-slot' ), { head: 'ms', name: 'title', image: false, text: false, attr: 'placeholder' }, 'the placeholder of an image placeholder is its alt, an item field' );
	assert.equal( holeField( { where: 'attr:placeholder', path: 'ms.title' }, 'input' ), null, 'the placeholder of an input is no item content' );
	assert.equal( holeField( { where: 'attr:id', path: 'ms.key' }, 'div' ), null );
	assert.equal( holeField( { where: 'text', path: 'arrowIcon' }, 'span' ), null );
	assert.equal( holeField( { where: 'attr:id', path: 't.img' }, 'image-slot' ).image, true );
} );

test( 'a split image held as content is found from the block.json image trio (MUST FAIL)', () => {
	const db = makeDb();
	assert.deepEqual( imageSlots( db, 'sgs/split', SCHEMAS[ 'sgs/split' ] ), [ { alt: 'splitMediaImageAlt', url: 'splitMediaImageUrl' } ] );
	// A video URL with an id and no alt, or a link URL, is no image trio; DB rows win over the trio.
	assert.deepEqual( schemaImageSlots( { aUrl: { type: 'string' }, aId: { type: 'string' }, aAlt: { type: 'string' } } ), [] );
	assert.deepEqual( imageSlots( db, 'sgs/pic', SCHEMAS[ 'sgs/split' ] ), [ { alt: 'imageAlt', url: 'imageUrl' } ] );
	assert.deepEqual( imageSlots( db, 'sgs/split' ), [] );
} );

test( 'the page editor\'s picture row on the node is settled once the node holds the draft\'s attachment (MUST FAIL)', () => {
	const row = { owner: 'content-page', kind: 'presence', detail: 'the hero image: choose it' };
	assert.equal( pictureSettles( row, [ { id: 7 } ] ), true );
	// Negative controls: no picture written, another owner, another kind, a slot's row.
	assert.equal( pictureSettles( row, [] ), false );
	assert.equal( pictureSettles( { ...row, owner: 'site-info' }, [ { id: 7 } ] ), false );
	assert.equal( pictureSettles( { ...row, kind: 'text' }, [ { id: 7 } ] ), false );
	assert.equal( pictureSettles( { ...row, slot: '.x' }, [ { id: 7 } ] ), false );
} );

// The Indus brands mega gallery: ten logo slots (image placeholders the client fills), each inside a link. The block's items hold
// no picture setting, so the picture field matches no key; the links are still the draft's content.
test( 'MUST FAIL: a gallery of linked image slots keeps its ten links, and the picture field it holds no setting for is one row', () => {
	const facts = { elements: Object.fromEntries( [ fact( 40, 'div' ), fact( 41, 'sc-for', [], [ 40 ] ), fact( 42, 'a', [ [ 'attr:href', 'l.href' ] ], [ 41, 40 ] ), fact( 43, 'image-slot', [ [ 'attr:id', 'l.id' ] ], [ 42, 41, 40 ] ) ] ) };
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ), ...[ 0, 1, 2 ].flatMap( ( i ) => [ inv( `Root/42#${ i }`, 'Root/40#0', 'a', '', [ [ 41, 'l' ] ], { href: `#/brand-${ i }` } ), inv( `Root/43#${ i }`, `Root/42#${ i }`, 'image-slot', '', [ [ 41, 'l' ] ] ) ] ) ] };
	const pages = [ 0, 1, 2 ].map( ( i ) => ( { route: `brand-${ i }`, slug: `brand-${ i }`, postType: 'page' } ) );
	const { r, flat } = pass( [ [ 'sgs/gallery', 'Root/40#0' ] ], { facts, inventory, pages } );
	assert.deepEqual( flat[ 0 ].attributes.mediaItems, [ { linkUrl: '/brand-0/' }, { linkUrl: '/brand-1/' }, { linkUrl: '/brand-2/' } ] );
	assert.equal( r.handover.filter( ( h ) => 'id' === h.evidence.key && /draws a picture in each of its 3 items/.test( h.reason ) ).length, 1, 'one row for the picture field, not one per item' );
} );

test( 'NEGATIVE: items carrying nothing at all are still not written; one row names the list', () => {
	const facts = { elements: Object.fromEntries( [ fact( 40, 'div' ), fact( 41, 'sc-for', [], [ 40 ] ), fact( 43, 'image-slot', [ [ 'attr:id', 'l.id' ] ], [ 41, 40 ] ) ] ) };
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ), ...[ 0, 1 ].map( ( i ) => inv( `Root/43#${ i }`, 'Root/40#0', 'image-slot', '', [ [ 41, 'l' ] ] ) ) ] };
	const { r, flat } = pass( [ [ 'sgs/gallery', 'Root/40#0' ] ], { facts, inventory } );
	assert.equal( flat[ 0 ].attributes.mediaItems, undefined );
	assert.match( r.handover[ 0 ].reason, /carry no words, link or uploaded picture/ );
} );

test( 'MUST FAIL (register C4): an element drawing two loops names the loop its list block does not hold, never drops it silently (S7)', () => {
	const facts = { elements: Object.fromEntries( [
		fact( 40, 'div' ),
		fact( 41, 'sc-for', [], [ 40 ] ), fact( 42, 'a', [ [ 'text', 'l.name' ] ], [ 41, 40 ] ),
		fact( 51, 'sc-for', [], [ 40 ] ), fact( 52, 'a', [ [ 'text', 'k.name' ] ], [ 51, 40 ] ),
	] ) };
	const listed = ( tpl, as ) => ( { kind: 'sc-for', tpl: String( tpl ), as, list: `{{ ${ as === 'l' ? 'styles' : 'shopBy' } }}` } );
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ),
		...[ 'Pilot', 'Round' ].map( ( w, i ) => ( { ...inv( `Root/42#${ i }`, 'Root/40#0', 'a', w ), membership: [ listed( 41, 'l' ) ] } ) ),
		...[ 'Best sellers', 'Under 100' ].map( ( w, i ) => ( { ...inv( `Root/52#${ i }`, 'Root/40#0', 'a', w ), membership: [ listed( 51, 'k' ) ] } ) ) ] };
	const r0 = loopItems( { inventory, facts, rootKey: 'Root/40#0', rootComponent: C } );
	assert.equal( r0.others.length, 1 );
	assert.equal( r0.others[ 0 ].tpl, '51' );
	const { r } = pass( [ [ 'sgs/gallery', 'Root/40#0' ] ], { facts, inventory } );
	assert.ok( r.unmapped.some( ( u ) => /draws 2 lists and sgs\/gallery holds one.*sc-for 51 over shopBy/.test( u.reason ) ), JSON.stringify( r.unmapped.map( ( u ) => u.reason ) ) );
	// Negative control: one loop names nothing.
	const one = { elements: inventory.elements.filter( ( e ) => ! /^Root\/52/.test( e.key ) ) };
	assert.deepEqual( loopItems( { inventory: one, facts, rootKey: 'Root/40#0', rootComponent: C } ).others, [] );
	assert.ok( ! pass( [ [ 'sgs/gallery', 'Root/40#0' ] ], { facts, inventory: one } ).r.unmapped.some( ( u ) => /draws 2 lists/.test( u.reason ) ) );
} );

test( 'MUST FAIL: the brand a logo slot names in its placeholder is the link label of its item, and the picture it holds no setting for stays one row', () => {
	const facts = { elements: Object.fromEntries( [ fact( 40, 'div' ), fact( 41, 'sc-for', [], [ 40 ] ), fact( 42, 'a', [ [ 'attr:href', 'l.href' ] ], [ 41, 40 ] ), fact( 43, 'image-slot', [ [ 'attr:id', 'l.id' ], [ 'attr:placeholder', 'l.name' ] ], [ 42, 41, 40 ] ) ] ) };
	const names = [ 'Sanam', 'Shan', 'Green Leaf' ];
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ), ...names.flatMap( ( n, i ) => [ inv( `Root/42#${ i }`, 'Root/40#0', 'a', '', [ [ 41, 'l' ] ], { href: `#/brand-${ i }` } ), inv( `Root/43#${ i }`, `Root/42#${ i }`, 'image-slot', '', [ [ 41, 'l' ] ], { id: `brand-${ i }`, placeholder: n } ) ] ) ] };
	const pages = [ 0, 1, 2 ].map( ( i ) => ( { route: `brand-${ i }`, slug: `brand-${ i }`, postType: 'page' } ) );
	const { r, flat } = pass( [ [ 'sgs/gallery', 'Root/40#0' ] ], { facts, inventory, pages } );
	assert.deepEqual( flat[ 0 ].attributes.mediaItems, names.map( ( n, i ) => ( { linkUrl: `/brand-${ i }/`, linkLabel: n } ) ) );
	assert.equal( r.handover.filter( ( h ) => 'id' === h.evidence.key && /draws a picture in each of its 3 items/.test( h.reason ) ).length, 1 );
} );

test( 'NEGATIVE: a placeholder the inventory did not record gives no link label', () => {
	const facts = { elements: Object.fromEntries( [ fact( 40, 'div' ), fact( 41, 'sc-for', [], [ 40 ] ), fact( 42, 'a', [ [ 'attr:href', 'l.href' ] ], [ 41, 40 ] ), fact( 43, 'image-slot', [ [ 'attr:id', 'l.id' ], [ 'attr:placeholder', 'l.name' ] ], [ 42, 41, 40 ] ) ] ) };
	const inventory = { elements: [ inv( 'Root/40#0', null, 'div' ), ...[ 0, 1 ].flatMap( ( i ) => [ inv( `Root/42#${ i }`, 'Root/40#0', 'a', '', [ [ 41, 'l' ] ], { href: `#/brand-${ i }` } ), inv( `Root/43#${ i }`, `Root/42#${ i }`, 'image-slot', '', [ [ 41, 'l' ] ] ) ] ) ] };
	const pages = [ 0, 1 ].map( ( i ) => ( { route: `brand-${ i }`, slug: `brand-${ i }`, postType: 'page' } ) );
	const { flat } = pass( [ [ 'sgs/gallery', 'Root/40#0' ] ], { facts, inventory, pages } );
	assert.deepEqual( flat[ 0 ].attributes.mediaItems, [ { linkUrl: '/brand-0/' }, { linkUrl: '/brand-1/' } ] );
} );
