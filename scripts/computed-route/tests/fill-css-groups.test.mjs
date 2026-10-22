// U2 step 3(b): the CSS property groups Fill reads (lib/fill-declared.mjs::extraProps), writes through calibration to the
// setting that paints them (lib/fill-prop.mjs::resolveProperty, real framework-DB settings) and confirms against the render
// (lib/fill-confirm.mjs::confirmRecords). One property per group, on a block whose setting the framework DB records for it;
// the block and setting are found by DB query, never named here. Each group's test title carries its id, which
// data/clone-coverage.json names as its proof. A group no setting paints is a gap whose note names the properties
// (data/clone-coverage.json); the last tests hold those notes to the DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { extraProps } from '../lib/fill-declared.mjs';
import { PROPS } from '../lib/fill-read.mjs';
import { confirmRecords } from '../lib/fill-confirm.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const setting = ( property ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
const WIDTHS = [ 375, 768, 1440 ];
const COVERAGE = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'clone-coverage.json' ), 'utf8' ) ).entries;

// [ group id, property, draft value, the block's value without it, another valid render the code does not declare ]
const GROUPS = [
	[ 'css-group:backgrounds-and-borders', 'background-repeat', 'no-repeat', 'repeat', 'repeat-x' ],
	[ 'css-group:box-sizing', 'max-width', '1200px', 'none', '900px' ],
	[ 'css-group:display', 'order', '2', '0', '5' ],
	[ 'css-group:filter-effects', 'backdrop-filter', 'blur(8px)', 'none', 'blur(2px)' ],
	[ 'css-group:flexible-box-layout', 'flex-direction', 'column', 'row', 'row' ],
	[ 'css-group:grid-layout', 'grid-template-columns', '100px 100px 100px', 'none', '200px 200px 200px' ],
	[ 'css-group:positioned-layout', 'top', '10px', 'auto', '40px' ],
	[ 'css-group:scalable-vector-graphics', 'stroke-width', '2px', '1px', '5px' ],
	[ 'css-group:scrollbars-styling', 'scrollbar-width', 'thin', 'auto', 'none' ],
	[ 'css-group:text-decoration', 'text-decoration-thickness', '2px', 'auto', '6px' ],
	[ 'css-group:webkit-extensions', '-webkit-text-stroke-width', '2px', '0px', '7px' ],
];

// The first (block, setting) the framework DB records for a property at rest whose write the resolver accepts for the draft value.
function written( prop, value, baseline ) {
	const rows = db.prepare( 'SELECT DISTINCT block_slug, attr_name FROM block_attributes WHERE css_property = ? AND css_state IS NULL ORDER BY block_slug, attr_name' ).all( prop );
	for ( const r of rows ) {
		const cal = { elements: { '': {} }, settings: { [ r.attr_name ]: setting( prop ) } };
		const res = resolveProperty( { node: { attributes: {} }, block: r.block_slug, prop, draft: Object.fromEntries( WIDTHS.map( ( w ) => [ w, value ] ) ), baseline: () => baseline, slots: [ '' ], calibration: cal, db, snapshot, log: [] } );
		if ( 'written' === res.status ) {
			return { block: r.block_slug, attr: r.attr_name, res, rows: rows.length };
		}
	}
	return { rows: rows.length };
}

// The confirm records for one write, with the code declaring `declared` and the draft rendering `rendered` at every width.
function confirm( { block, attr, prop, value, declared, rendered } ) {
	const at = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '0:': v } ] ) );
	return confirmRecords( {
		writes: [ { node: 'n', index: 0, block, slot: '', prop, attr, after: value } ],
		nodes: [ { targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/1#0' } } ] } ],
		reads: { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '0:': { styles: { [ prop ]: rendered, 'font-size': '16px' } } } ] ) ), declared: at( { [ prop ]: declared } ) },
		rootComponent: 'Root',
	} );
}

const verdicts = ( records ) => [ ...new Set( records.map( ( r ) => r.verdict ) ) ];

for ( const [ id, prop, value, baseline, other ] of GROUPS ) {
	test( `MUST FAIL WITHOUT THE PATH: ${ id } is recognised, written and confirmed (${ prop })`, () => {
		// Recognise: Fill reads the property, on its own list or as a longhand the draft's code declares beyond it.
		assert.ok( PROPS.includes( prop ) || prop in extraProps( { [ prop ]: value }, PROPS ), `${ prop } is read` );
		// Write: a real setting the framework DB records for the property takes the draft value.
		const w = written( prop, value, baseline );
		assert.ok( w.res, `${ w.rows } settings paint ${ prop } and none takes ${ value }` );
		assert.equal( w.res.writes[ 0 ].attr, w.attr );
		assert.equal( resolveProperty( { node: { attributes: {} }, block: w.block, prop, draft: { 1440: value, 768: value, 375: value }, baseline: () => value, slots: [ '' ], calibration: { elements: { '': {} }, settings: { [ w.attr ]: setting( prop ) } }, db, snapshot, log: [] } ).status, 'equal', 'a draft equal to what the block shows writes nothing' );
		// Check: the code's value against the draft's render is confirmed, and a render that differs is reported.
		const after = w.res.writes[ 0 ].value;
		const same = confirm( { block: w.block, attr: w.attr, prop, value: after, declared: value, rendered: value } );
		assert.equal( same.length, 3 );
		assert.deepEqual( verdicts( same ), [ 'confirmed' ] );
		assert.deepEqual( verdicts( confirm( { block: w.block, attr: w.attr, prop, value: after, declared: value, rendered: other } ) ), [ 'render-wins' ] );
		// The coverage map names this test and the three steps.
		const e = COVERAGE[ id ];
		assert.ok( e.recognise && e.write && e.check, `${ id } names recognise, write and check` );
		assert.equal( e.test, `scripts/computed-route/tests/fill-css-groups.test.mjs#${ id }` );
	} );
}

// The groups kept as gaps: each property the coverage note names has no setting stored under that exact property (the
// resolver matches a setting by its exact property), found by DB query.
const GAPS = {
	'basic-user-interface': [ 'accent-color', 'appearance', 'caret-color', 'cursor', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'pointer-events', 'resize', 'user-select' ],
	'logical-properties-and-values': [ 'margin-block-start', 'margin-block-end', 'padding-block-start', 'padding-block-end', 'padding-inline-end', 'block-size', 'inline-size', 'inset-block' ],
	masking: [ 'clip', 'mask', 'mask-image', 'mask-size', 'mask-position', 'mask-repeat', 'mask-mode', 'mask-clip', 'mask-composite', 'mask-origin', 'mask-type', 'clip-rule' ],
	overflow: [ 'overflow-x', 'overflow-y', 'overflow-block', 'overflow-inline', 'text-overflow', 'scroll-behavior', 'scrollbar-gutter' ],
	'overscroll-behavior': [ 'overscroll-behavior', 'overscroll-behavior-x', 'overscroll-behavior-y' ],
	'scroll-snap': [ 'scroll-margin', 'scroll-padding', 'scroll-snap-align', 'scroll-snap-type' ],
	transforms: [ 'rotate', 'scale', 'perspective', 'perspective-origin', 'transform-origin', 'transform-style', 'transform-box', 'backface-visibility' ],
};

test( 'the groups kept as gaps stay gaps, name only properties no setting is stored under, and their notes name them', () => {
	for ( const [ group, props ] of Object.entries( GAPS ) ) {
		const e = COVERAGE[ `css-group:${ group }` ];
		assert.equal( e.write, null, `${ group } stays a gap` );
		for ( const p of props ) {
			assert.equal( db.prepare( 'SELECT COUNT(*) n FROM block_attributes WHERE css_property = ?' ).get( p ).n, 0, `a setting is stored under ${ p }: ${ group } is not a gap for it` );
			assert.ok( e.note.includes( p ), `${ group }'s note names ${ p }` );
		}
	}
} );

test( 'the logical-properties and overflow gaps are exact-name gaps: the longhands have no setting while the shorthands do', () => {
	// The resolver matches a setting by its exact property, so the longhands Fill reads find none.
	for ( const [ prop, shorthand ] of [ [ 'margin-block-start', 'margin-block' ], [ 'overflow-x', 'overflow' ] ] ) {
		const w = written( prop, '8px', '0px' );
		assert.equal( w.res, undefined, `${ prop } has no setting to write` );
		assert.ok( db.prepare( 'SELECT COUNT(*) n FROM block_attributes WHERE css_property = ?' ).get( shorthand ).n > 0, `${ shorthand } does have one` );
	}
} );
