// A background image the draft sizes is not written to Custom CSS alone (lib/fill-residual-css.mjs::FILLS_BOX): a footer credit
// link underlined with `linear-gradient(gold, gold) no-repeat left bottom / 0% 1px` has a background-size of 0% 1px, and a rule
// holding only the gradient would fill the link's whole box with gold behind its white text. Fill reads background-size as a tie
// read (lib/fill-read.mjs::TIE_PROPS) so the writer can see it; the row stays unmapped with the reason. A background whose size
// fills the box, or that was not read, is written as before. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { residualCssWrites } from '../lib/fill-residual-css.mjs';
import { PROPS, TIE_PROPS } from '../lib/fill-read.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const ext = ( block ) => [ 'sgsCustomCss', 'sgsCustomCssId', 'sgsCustomCssNote' ].map( ( a ) => ( { block_slug: block, attr_name: a, attr_type: 'string', source: 'sgs-ext' } ) );
const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/field', title: 'Field', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [ ...ext( 'sgs/field' ), { block_slug: 'sgs/field', attr_name: 'fieldColour', attr_type: 'string', css_property: 'color', role: 'colour' } ],
} ) );
const W = [ 375, 768, 1440 ];
const perW = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
const cal = { settings: { fieldColour: { slot: '', slots: [ '' ], property: 'color', state: null, reachedAt: W, effects: [] } }, elements: { '': perW( { display: 'block', color: 'rgb(0, 0, 0)', 'background-image': 'none' } ) } };
const GRADIENT = 'linear-gradient(rgb(216, 202, 80), rgb(216, 202, 80))';

function world( styles ) {
	const flat = [ { name: 'sgs/field', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/field', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'a' } ] } ];
	const widths = Object.fromEntries( W.map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 300, h: 20 }, styles: { display: 'block', ...styles }, layoutDisplay: 'block' } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
const row = { node: 'n0', block: 'sgs/field', slot: '', state: null, property: 'background-image', value: GRADIENT, reason: 'no-setting: sgs/field has no setting for background-image; equivalence: 1 spelling | 2 values | 3 inert: no | 4 effect: no setting\'s measured effect reaches background-image on this element | 5 judges: nothing written' };
const run = ( w ) => residualCssWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: [ row ], calFor: () => cal, snapshot: { palette: [], spacing: [], fontSizes: [] }, scope: 'footer', date: '2026-11-19' } );

test( 'MUST FAIL: a gradient the draft sizes to an underline is refused, and the box is not filled', () => {
	for ( const size of [ '0% 1px', '100% 1px', '12px 12px' ] ) {
		const w = world( { 'background-size': size } );
		const r = run( w );
		assert.equal( w.flat[ 0 ].attributes.sgsCustomCss, undefined, `${ size } was written` );
		assert.equal( r.refused.length, 1, size );
		assert.match( r.refused[ 0 ].reason, new RegExp( `background-size ${ size.replace( '%', '%' ) }` ) );
	}
} );

test( 'negative control: a background that fills the box, or one whose size was not read, is still written', () => {
	for ( const styles of [ { 'background-size': 'auto' }, { 'background-size': 'cover' }, { 'background-size': '100% 100%' }, {} ] ) {
		const w = world( styles );
		const r = run( w );
		assert.deepEqual( r.refused, [], JSON.stringify( styles ) );
		assert.match( w.flat[ 0 ].attributes.sgsCustomCss, /background-image: linear-gradient/, JSON.stringify( styles ) );
	}
} );

test( 'MUST FAIL: Fill reads background-size on every draft element as a tie read', () => {
	assert.ok( TIE_PROPS.includes( 'background-size' ) );
	assert.ok( PROPS.includes( 'background-size' ) );
} );
