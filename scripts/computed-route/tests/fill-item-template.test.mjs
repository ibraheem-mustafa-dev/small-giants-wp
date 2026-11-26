// A card drawing every record of its query (`eachRecord`, lib/fill-item-template.mjs): the copy Fill reads never chooses the
// block's variant, through the resolver's discovered values or through presence evidence, and the proposers mark the shop's and
// the related products' cards so (RF7: "no variantStyle on a template card"; related cards read at the mounted card's root).
// Tests marked MUST FAIL fail without the code they name. Planted reads and calibration, the real framework database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { holdItemVariants } from '../lib/fill-item-template.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf, walk } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { inventoryIndex, mountedRoot } from '../lib/template-piece-draft.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'background-color': 'rgba(0, 0, 0, 0)', 'box-shadow': 'none' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const snap = ( styles = {}, words = '' ) => ( { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 400 }, inFlow: true, words, href: null } );
const CREAM = 'rgb(250, 240, 230)';
// The product card's calibration as the cache files shape it: the trial variant draws the tag and paints the card cream.
const CAL = {
	block: 'sgs/product-card',
	elements: { '': tiers( DEFAULT ), '.sgs-product-card__tag': tiers( DEFAULT ) },
	settings: {},
	presence: { 'variantStyle=trial': { shows: [ '.sgs-product-card__tag' ], hides: [] } },
	discovered: { variantStyle: { 'background-color': { slots: [ '' ], values: { trial: Object.fromEntries( THREE.map( ( w ) => [ w, CREAM ] ) ), featured: Object.fromEntries( THREE.map( ( w ) => [ w, 'rgb(1, 2, 3)' ] ) ) } } } },
};
const reads = ( spec ) => ( { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, Object.fromEntries( Object.entries( spec ).map( ( [ id, s ] ) => [ id, s ] ) ) ] ) ), declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' } );

function run( skeleton, spec ) {
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const nodes = skeletonNodes( skeleton );
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	const notes = holdItemVariants( { nodes, flat, db, schemaOf: blockSchema, refOf } );
	const out = fillTree( { tree, nodes, reads: reads( spec ), db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( 'sgs/product-card' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out, heldNotes: notes };
}
const card = ( extra = {} ) => [ { name: 'sgs/product-card', draftRef: '.card', draftSlots: { '.sgs-product-card__tag': '.tag' }, attributes: { sourceMode: 'wc-product' }, ...extra } ];
const SPEC = { '0:': snap( { 'background-color': CREAM } ), '0:.sgs-product-card__tag': snap( {}, 'Trial' ) };

test( 'MUST FAIL: a card standing for every product keeps its variant whatever the read copy draws', () => {
	const held = run( card( { itemTemplate: true, eachRecord: true } ), SPEC );
	assert.equal( held.tree[ 0 ].attributes.variantStyle, undefined, 'the first product\'s trial tag and cream ground choose no variant' );
	assert.deepEqual( held.writes.filter( ( w ) => 'variantStyle' === w.attr && 'standard' !== w.after ), [] );
	assert.match( held.heldNotes[ 0 ], /cr-ref-fx-0 sgs\/product-card: draws every record of its query, so its variantStyle stays "standard"/ );
} );

test( 'negative control: a card that is one card (no itemTemplate) still takes the variant the draft draws', () => {
	const one = run( card(), SPEC );
	assert.equal( one.tree[ 0 ].attributes.variantStyle, 'trial' );
	assert.equal( run( card( { itemTemplate: true } ), SPEC ).tree[ 0 ].attributes.variantStyle, 'trial', 'a slide standing for every slide keeps the variant its slides share' );
	assert.deepEqual( one.heldNotes, [] );
} );

test( 'MUST FAIL: presence evidence alone (no ground to match) never chooses a loop card\'s variant', () => {
	const spec = { '0:': snap(), '0:.sgs-product-card__tag': snap( {}, 'Trial' ) };
	assert.equal( run( card(), spec ).tree[ 0 ].attributes.variantStyle, 'trial', 'control: the drawn tag alone chooses trial on one card' );
	assert.equal( run( card( { itemTemplate: true, eachRecord: true } ), spec ).tree[ 0 ].attributes.variantStyle, undefined );
} );

test( 'a loop card already holding a variant keeps it; a block with no variant setting is not held', () => {
	const held = run( card( { itemTemplate: true, eachRecord: true, attributes: { sourceMode: 'wc-product', variantStyle: 'featured' } } ), SPEC );
	assert.equal( held.tree[ 0 ].attributes.variantStyle, 'featured' );
	assert.match( held.heldNotes[ 0 ], /stays "featured"/ );
	const flat = [ { name: 'sgs/text', attributes: {} } ];
	assert.deepEqual( holdItemVariants( { nodes: [ { index: 0, name: 'sgs/text', node: { itemTemplate: true, eachRecord: true } } ], flat, db, schemaOf: blockSchema, refOf: () => 'x' } ), [] );
} );

test( 'MUST FAIL: the card a loop copy mounts is read at the mounted component\'s root, never the loop cell', () => {
	const el = ( key, parentKey, template ) => ( { key, parentKey, template, tag: 'div' } );
	const index = inventoryIndex( { elements: [
		el( 'Root/1#0', 'Root/0#0', 'Root' ), el( 'Root/2#0', 'Root/1#0', 'Root' ), el( 'Root/3#0', 'Root/2#0', 'Root' ),
		el( 'Root>ProductCard@3#0/0#0', 'Root/3#0', 'ProductCard' ), el( 'Root>ProductCard@3#0/1#0', 'Root>ProductCard@3#0/0#0', 'ProductCard' ),
		el( 'Root>ProductCard@3#0/1#0>Badge@1#0/0#0', 'Root>ProductCard@3#0/1#0', 'Badge' ),
	] } );
	assert.equal( mountedRoot( index, 'Root/2#0' ), 'Root>ProductCard@3#0/0#0', 'through a wrapper of its own component, before the badge nested in the card' );
	assert.equal( mountedRoot( index, 'Root/1#0' ), 'Root>ProductCard@3#0/0#0' );
	const bare = inventoryIndex( { elements: [ el( 'Root/1#0', 'Root/0#0', 'Root' ), el( 'Root/2#0', 'Root/1#0', 'Root' ) ] } );
	assert.equal( mountedRoot( bare, 'Root/1#0' ), 'Root/1#0', 'a copy mounting no card is read itself' );
	assert.equal( mountedRoot( bare, 'Root/99#0' ), 'Root/99#0' );
} );
