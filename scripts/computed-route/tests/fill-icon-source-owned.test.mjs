// The icon's source is the icon writer's (lib/fill-icon.mjs, decided from the draft's mark): the resolver never answers a
// look of the SVG part (its display) by turning the icon into a source that draws no SVG. Calibration discovered that
// iconSource "emoji" paints display:block where the SVG sits; a draft SVG drawn display:block keeps the source its mark
// decides (custom), and the display it paints is a named row, never an iconSource write. Run through fillTree on the real
// framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { resolveDiscovered } from '../lib/resolve.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const SVG = '.sgs-icon__svg';
const BASE = { display: 'inline', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const block = Object.fromEntries( THREE.map( ( w ) => [ w, 'block' ] ) );
const CAL = {
	block: 'sgs/icon',
	elements: { '': tiers( { ...BASE, display: 'block' } ), [ SVG ]: tiers( BASE ) },
	settings: {},
	discovered: { iconSource: { display: { slots: [ SVG ], state: null, tier: 'flat', values: { emoji: block } } } },
};
const MARK = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h9v9H2zM13 13h9v9h-9z" fill="currentColor"></path></svg>';

function fillIcon() {
	const skeleton = [ { name: 'sgs/icon', draftRef: 'main', draftSlots: { [ SVG ]: 'svg' }, attributes: { iconSource: 'lucide', iconName: 'star' } } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'ic' );
	const root = { styles: { ...BASE, display: 'block' }, pseudo: {}, rect: { x: 0, y: 0, w: 24, h: 24 }, inFlow: true, words: '', href: null, svg: { markup: MARK, position: 'only' } };
	const svg = { styles: { ...BASE, display: 'block' }, pseudo: {}, rect: { x: 0, y: 0, w: 24, h: 24 }, inFlow: true, words: '', href: null };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': root, [ `0:${ SVG }` ]: svg } ] ) );
	const reads = { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': {}, [ `0:${ SVG }` ]: { display: 'block' } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( 'sgs/icon' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}

test( 'MUST FAIL: the SVG part\'s display never turns an SVG icon into an emoji; the source stays the one the mark decides', () => {
	const r = fillIcon();
	assert.equal( r.tree[ 0 ].attributes.iconSource, 'custom' );
	assert.ok( r.tree[ 0 ].attributes.iconSvg, 'the draft mark is written as the icon' );
	assert.deepEqual( r.writes.filter( ( w ) => 'display' === w.prop ), [] );
	assert.ok( r.unmapped.some( ( u ) => 'display' === u.property && SVG === u.slot ), JSON.stringify( r.unmapped.map( ( u ) => [ u.property, u.slot ] ) ) );
} );

test( 'negative control: with no owned source the discovered emoji still answers display (an emoji-drawn draft)', () => {
	const res = resolveDiscovered( { slot: SVG, prop: 'display', perWidth: block, siblings: {} }, CAL );
	assert.deepEqual( res?.writes, [ { attr: 'iconSource', value: 'emoji', merge: 'replace' } ] );
	assert.equal( resolveDiscovered( { slot: SVG, prop: 'display', perWidth: block, siblings: {}, owned: { iconSource: 'custom' } }, CAL ), null );
} );
