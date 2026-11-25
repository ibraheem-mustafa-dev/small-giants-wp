// RF5 (clone root fixes 2026-11-25): a stated value is written unless it equals the default exactly; the tolerance is only for
// comparing measured renders and lives in one module; a length takes a token only when equal; an unstated initial value and a
// property that does not apply are not written; a setting that owns a property keeps a Custom CSS rule off it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { exactPaint, samePaint, PX_TOL } from '../lib/css-equivalence/tolerance.mjs';
import { createRequire } from 'module';
import { tiersDiffering, undeclaredInitial, INITIAL_UNSTATED } from '../lib/fill-prop.mjs';
import { snapLength } from '../lib/normalise.mjs';
import { ownedBySetting, ownedProperties } from '../lib/fill-residual-owned.mjs';
import { openDb } from '../lib/db.mjs';

// The tolerance-literal lint is tests/tolerance-literals.test.mjs.

test( 'a 1.5px stated bar is not the 2px default; 2px is; the measured-render tolerance still holds a 0.4px difference', () => {
	assert.equal( exactPaint( 'height', '1.5px', '2px' ), false );
	assert.equal( exactPaint( 'height', '2.5px', '2px' ), false );
	assert.equal( exactPaint( 'height', '2px', '2px' ), true );
	assert.equal( samePaint( 'height', '2.4px', '2px' ), true );
	assert.equal( samePaint( 'height', '2.6px', '2px' ), false );
	assert.equal( PX_TOL, 0.5 );
} );

test( 'a colour within the ΔE rule still matches exactly-written equals', () => {
	assert.equal( exactPaint( 'background-color', 'rgb(250, 250, 250)', 'rgb(250, 250, 250)' ), true );
	assert.equal( exactPaint( 'background-color', 'rgb(250, 250, 250)', 'rgb(10, 10, 10)' ), false );
} );

test( 'tiersDiffering writes the 1.5px and 2.5px bars over a 2px default, and holds an equal 2px', () => {
	assert.deepEqual( tiersDiffering( 'height', { 1440: '1.5px' }, () => '2px' ), { 1440: '1.5px' } );
	assert.deepEqual( tiersDiffering( 'height', { 1440: '2.5px' }, () => '2px' ), { 1440: '2.5px' } );
	assert.deepEqual( tiersDiffering( 'height', { 1440: '2px' }, () => '2px' ), {} );
} );

test( 'a length takes a token only when its px equals the token\'s', () => {
	const tokens = [ { slug: 'sm', px: 8 }, { slug: 'md', px: 16 } ];
	assert.equal( snapLength( 8.3, tokens )?.slug ?? null, null );
	assert.equal( snapLength( 16.5, tokens )?.slug ?? null, null );
	assert.equal( snapLength( 16, tokens )?.slug, 'md' );
} );

test( 'an initial layout value no code declares is not written; a declared one, or another property, is', () => {
	assert.equal( undeclaredInitial( 'grid-template-columns', 'none', {} ), true );
	assert.equal( undeclaredInitial( 'flex-grow', '0', {} ), true );
	assert.equal( undeclaredInitial( 'flex-grow', '0', { 'flex-grow': '0' } ), false, 'the code states it' );
	assert.equal( undeclaredInitial( 'flex-grow', '0', { flex: '0 0 auto' } ), false, 'the shorthand states it' );
	assert.equal( undeclaredInitial( 'grid-template-columns', '1fr 1fr', {} ), false, 'not the initial value' );
	assert.equal( undeclaredInitial( 'grid-template-columns', 'none', null ), false, 'a failed declared read judges nothing' );
	assert.equal( undeclaredInitial( 'margin-top', '0px', {} ), false, 'only the layout properties' );
} );

test( 'MUST FAIL: the properties judged as unstated initial values are the ones mdn-data says apply only inside a grid or flex layout, with initial values from mdn-data', () => {
	const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );
	const roles = [ ...INITIAL_UNSTATED ].filter( ( p ) => MDN[ p ] );
	for ( const p of [ 'grid-template-columns', 'grid-auto-flow', 'grid-row-start', 'flex-grow', 'flex-basis', 'order', 'align-self', 'align-content', 'justify-self', 'place-self', 'place-content', 'flex', 'grid-row' ] ) {
		assert.ok( INITIAL_UNSTATED.has( p ), `${ p } applies to ${ MDN[ p ].appliesto }` );
	}
	// no property that applies to every element, a flex container's own direction or the gaps
	for ( const p of [ 'margin-top', 'color', 'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap', 'row-gap', 'column-gap' ] ) {
		assert.ok( ! INITIAL_UNSTATED.has( p ), `${ p } (${ MDN[ p ].appliesto }) is judged by its own rule` );
	}
	assert.ok( roles.every( ( p ) => /grid|flex|multiline|absolutely|blockLevel/i.test( MDN[ p ].appliesto ) ), 'every one is a layout role mdn-data names' );
	// the initial value the judgement compares with is mdn-data's: a non-initial value is written
	assert.equal( undeclaredInitial( 'grid-auto-flow', 'row', {} ), true );
	assert.equal( undeclaredInitial( 'grid-auto-flow', 'column', {} ), false );
	assert.equal( undeclaredInitial( 'order', '0', {} ), true );
	assert.equal( undeclaredInitial( 'order', '2', {} ), false );
	assert.equal( undeclaredInitial( 'align-content', 'normal', {} ), true );
} );

// The framework DB as seeded: block_attributes.owns_css, from each setting's `sgs.ownsCss` in block.json (FP-1).
const db = openDb();

test( 'a property of a setting the node holds is owned, read from the DB: list-style against the icon list marker type', () => {
	const LIST = 'sgs/icon-list';
	assert.equal( ownedBySetting( db, LIST, 'list-style', { markerType: 'check' } ), 'markerType' );
	assert.equal( ownedBySetting( db, LIST, 'list-style-type', { markerType: 'check' } ), 'markerType', 'a shorthand a setting owns owns its longhands' );
	assert.equal( ownedBySetting( db, LIST, 'list-style-position', { markerType: 'check' } ), 'markerType' );
	assert.equal( ownedBySetting( db, LIST, 'list-style', { markerType: '' } ), null, 'a setting holding no value owns nothing here' );
	assert.equal( ownedBySetting( db, LIST, 'list-style', {} ), null );
	assert.equal( ownedBySetting( db, LIST, 'margin', { markerType: 'check' } ), null );
	assert.equal( ownedBySetting( db, 'sgs/text', 'list-style', { markerType: 'check' } ), null, 'an attribute of that name on another block owns nothing' );
	assert.deepEqual( ownedProperties( db, LIST ), [ { attr: 'markerType', props: [ 'list-style' ] } ] );
	assert.deepEqual( ownedProperties( db, 'sgs/text' ), [] );
} );

test( 'a DB with no owns_css column is refused, not read as owning nothing', () => {
	const old = { prepare: ( sql ) => ( { all: () => ( /PRAGMA/.test( sql ) ? [ { name: 'attr_name' } ] : [] ) } ) };
	assert.throws( () => ownedBySetting( old, 'sgs/icon-list', 'list-style', { markerType: 'check' } ), /no block_attributes\.owns_css column: reseed it/ );
} );
