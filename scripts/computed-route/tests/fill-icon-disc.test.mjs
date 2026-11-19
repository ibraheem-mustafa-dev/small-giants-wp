// A disc the draft draws as one element (a fixed size, round, filled, holding a glyph) is written to the block part that
// draws it: its size reaches the shape's size setting (lib/fill-resolve-state.mjs::alternateSlots, BOX_SIZE, and a setting
// another target reads is that target's own), and its ground carries the switch calibration measured the ground with
// (lib/fill-fixture.mjs::gateFor through lib/calibrate-instances.mjs::gatingToggle). Real case: Mama's Munches Contact's three
// contact discs (2026-11-19 run, unmapped.json: "no width setting on sgs/icon paints \"\" (candidates: iconSize, shapeSize,
// signedInDotSize)"; filled.tree.json held backgroundColour with no showBackground, so the clone drew an empty 32px ring
// with a white glyph on the page's light ground). The calibration is the cache's sgs/icon slot map and its mamas-test
// default paint (tests/fixtures/fill-icon-disc/calibration.json, trimmed to the properties read here).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { alternateSlots } from '../lib/fill-resolve-state.mjs';
import { gateFor } from '../lib/fill-fixture.mjs';
import { blockSchema } from '../lib/resolve.mjs';

const CAL = JSON.parse( fs.readFileSync( new URL( './fixtures/fill-icon-disc/calibration.json', import.meta.url ), 'utf8' ) );
const FIXTURES = JSON.parse( fs.readFileSync( new URL( '../calibration-fixtures.json', import.meta.url ), 'utf8' ) );
const db = openDb();
const WIDTHS = [ 375, 768, 1024, 1440, 1920 ];
const SVG = '.sgs-icon__shape > .sgs-icon__glyph > svg';
const SHAPES = [ '.sgs-icon__shape', '.sgs-icon__link > .sgs-icon__shape' ];
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const sides = ( part, v ) => Object.fromEntries( SIDES.map( ( s ) => [ `border-${ s }-${ part }`, v ] ) );
const snap = ( styles, w ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w, h: w }, inFlow: true, words: '', href: null } );
const GREEN = 'rgb(37, 211, 102)';
const WHITE = 'rgb(255, 255, 255)';
const DISC = { display: 'flex', width: '56px', height: '56px', 'background-color': GREEN, 'background-image': 'none', color: WHITE, ...sides( 'width', '0px' ), ...sides( 'style', 'none' ) };

function run( { disc = DISC, cal = CAL, size = 56, glyph = 26 } = {} ) {
	const skeleton = [ { name: 'sgs/icon', attributes: {}, draftRef: '.disc', draftSlots: { [ SVG ]: '.disc > svg' } } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'contact' );
	const root = nodes[ 0 ].targets.find( ( t ) => '' === t.slot );
	const svg = nodes[ 0 ].targets.find( ( t ) => SVG === t.slot );
	const byWidth = () => ( { [ root.id ]: snap( disc, size ), [ svg.id ]: snap( { display: 'block', width: `${ glyph }px`, height: `${ glyph }px`, color: WHITE }, glyph ) } );
	const declared = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ root.id ]: { width: `${ size }px`, height: `${ size }px` }, [ svg.id ]: { width: `${ glyph }px`, height: `${ glyph }px` } } ] ) );
	const reads = { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, byWidth() ] ) ), declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => cal, fixtures: FIXTURES, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { attrs: tree[ 0 ].attributes, out };
}

test( 'MUST FAIL: the disc\'s width read on the block root is written to the shape\'s size, never the glyph\'s', () => {
	assert.deepEqual( alternateSlots( CAL, 'width', { 1440: '56px' }, [ '', SVG ], '' ), SHAPES );
	const { attrs } = run();
	assert.equal( JSON.stringify( attrs.shapeSize ?? null ).match( /56px/g )?.length > 0, true, `shapeSize holds the disc's 56px: ${ JSON.stringify( attrs.shapeSize ) }` );
	assert.match( JSON.stringify( attrs.iconSize ?? null ), /26px/, 'the glyph keeps its own 26px' );
	assert.doesNotMatch( JSON.stringify( attrs.iconSize ?? null ), /56px/ );
} );

test( 'MUST FAIL: the disc\'s ground turns on the switch calibration measured the ground with', () => {
	const { attrs } = run();
	assert.ok( undefined !== attrs.backgroundColour, 'the ground colour is written' );
	assert.equal( attrs.showBackground, true, 'and the background switch with it' );
	assert.equal( gateFor( { fixtures: null, db }, 'sgs/icon', CAL, blockSchema( 'sgs/icon' ), 'backgroundColourGradient', {} ), 'showBackground', 'a gradient ground carries it too' );
} );

test( 'negative control: a disc with no ground writes no switch; a hover ground, a node already holding the switch and an unmeasured setting add none', () => {
	const { attrs } = run( { disc: { ...DISC, 'background-color': 'rgba(0, 0, 0, 0)' } } );
	assert.equal( attrs.backgroundColour, undefined );
	assert.equal( attrs.showBackground, undefined, 'no ground, no switch' );
	const schema = blockSchema( 'sgs/icon' );
	const st = { fixtures: null, db };
	assert.equal( gateFor( st, 'sgs/icon', CAL, schema, 'backgroundColourHover', {} ), null, 'a hover ground paints without the switch' );
	assert.equal( gateFor( st, 'sgs/icon', CAL, schema, 'backgroundColour', { showBackground: false } ), null, 'the node holds the switch already' );
	assert.equal( gateFor( st, 'sgs/icon', { settings: {} }, schema, 'backgroundColour', {} ), null, 'calibration never measured the setting' );
	assert.equal( gateFor( st, 'sgs/icon', CAL, schema, 'iconColour', {} ), null, 'no switch gates the glyph colour' );
} );

test( 'negative control: a part of another size, or a size setting on a slot another target reads, offers the root\'s size nothing', () => {
	const grown = { ...CAL, elements: { ...CAL.elements, '.sgs-icon__shape': Object.fromEntries( Object.entries( CAL.elements[ '.sgs-icon__shape' ] ).map( ( [ w, s ] ) => [ w, { ...s, width: '40px' } ] ) ) } };
	assert.deepEqual( alternateSlots( grown, 'width', { 1440: '56px' }, [ '', SVG ], '' ).filter( ( s ) => '.sgs-icon__shape' === s ), [], 'the shape is not the root\'s box' );
	assert.ok( ! alternateSlots( CAL, 'width', { 1440: '56px' }, [ '', SVG ], '' ).some( ( s ) => s.includes( '__glyph' ) ), 'the glyph size belongs to the svg target' );
	assert.deepEqual( alternateSlots( CAL, 'width', { 1440: '56px' }, [ '', ...SHAPES ], '' ), [], 'a draft with its own shape element reads the shape there' );
	const box = ( w ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( x ) => [ x, { width: `${ w }px`, height: `${ w }px` } ] ) );
	const padded = { elements: { '': box( 32 ), '.sgs-icon__shape': box( 32 ) }, settings: { partPadding: { property: 'padding', slot: '.sgs-icon__shape', slots: [ '.sgs-icon__shape' ] } } };
	assert.deepEqual( alternateSlots( padded, 'padding-top', { 1440: '8px' }, [ '' ], '' ), [], 'padding never moves to a part, even one of the same box' );
	const reaching = { elements: { '': box( 32 ), '.a': box( 10 ), '.b > .c': box( 32 ) }, settings: { size: { property: 'width', slot: '.a', slots: [ '.a' ], reaches: [ '.b > .c' ] } } };
	assert.deepEqual( alternateSlots( reaching, 'width', { 1440: '32px' }, [ '', '.b' ], '' ), [], 'a slot inside another target\'s element is that element\'s' );
	assert.deepEqual( alternateSlots( reaching, 'width', { 1440: '32px' }, [ '' ], '' ), [ '.b > .c' ], 'control: with no target there, the same-box slot is offered' );
} );
