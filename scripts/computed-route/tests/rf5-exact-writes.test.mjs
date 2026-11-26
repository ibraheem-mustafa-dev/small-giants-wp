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
import { SETTLED, passSettled } from '../lib/fill-report.mjs';
import { outcomesOf } from '../lib/census-conservation.mjs';
import { ANSWERING_PASSES } from '../lib/run-ledger-fill.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

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
	assert.equal( undeclaredInitial( 'grid-template-columns', 'none', {}, 'none' ), true );
	assert.equal( undeclaredInitial( 'flex-grow', '0', {}, '0' ), true );
	assert.equal( undeclaredInitial( 'flex-grow', '0', { 'flex-grow': '0' }, '0' ), false, 'the code states it' );
	assert.equal( undeclaredInitial( 'flex-grow', '0', { flex: '0 0 auto' }, '0' ), false, 'the shorthand states it' );
	assert.equal( undeclaredInitial( 'grid-template-columns', '1fr 1fr', {}, 'none' ), false, 'not the initial value' );
	assert.equal( undeclaredInitial( 'grid-template-columns', 'none', null, 'none' ), false, 'a failed declared read judges nothing' );
	assert.equal( undeclaredInitial( 'margin-top', '0px', {}, '0px' ), false, 'only the layout properties' );
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
	assert.equal( undeclaredInitial( 'grid-auto-flow', 'row', {}, 'row' ), true );
	assert.equal( undeclaredInitial( 'grid-auto-flow', 'column', {}, 'row' ), false );
	assert.equal( undeclaredInitial( 'order', '0', {}, '0' ), true );
	assert.equal( undeclaredInitial( 'order', '2', {}, '0' ), false );
	assert.equal( undeclaredInitial( 'align-content', 'normal', {}, 'normal' ), true );
} );

// The framework DB as seeded: block_attributes.owns_css, from each setting's `sgs.ownsCss` in block.json (FP-1).
const db = openDb();

test( 'a property of a setting the node holds is owned, read from the DB: list-style against the icon list marker type', () => {
	const LIST = 'sgs/icon-list';
	assert.equal( ownedBySetting( db, LIST, 'list-style', { markerType: 'check' } ), 'markerType' );
	assert.equal( ownedBySetting( db, LIST, 'list-style-type', { markerType: 'check' } ), 'markerType', 'a shorthand a setting owns owns its longhands' );
	assert.equal( ownedBySetting( db, LIST, 'list-style-position', { markerType: 'check' } ), 'markerType' );
	assert.equal( ownedBySetting( db, LIST, 'list-style', { markerType: '' } ), null, 'a setting holding no value owns nothing here' );
	assert.equal( ownedBySetting( db, LIST, 'list-style', {} ), 'markerType', 'an unsaved setting holds its default (icon), which the block draws list-style: none for' );
	assert.equal( ownedBySetting( db, LIST, 'list-style', { markerType: null } ), 'markerType' );
	assert.equal( ownedBySetting( db, LIST, 'margin', { markerType: 'check' } ), null );
	assert.equal( ownedBySetting( db, 'sgs/text', 'list-style', { markerType: 'check' } ), null, 'an attribute of that name on another block owns nothing' );
	assert.deepEqual( ownedProperties( db, LIST ), [ { attr: 'markerType', props: [ 'list-style' ], fallback: 'icon' } ] );
	assert.deepEqual( ownedProperties( db, 'sgs/text' ), [] );
} );

test( 'a DB with no owns_css column is refused, not read as owning nothing', () => {
	const old = { prepare: ( sql ) => ( { all: () => ( /PRAGMA/.test( sql ) ? [ { name: 'attr_name' } ] : [] ) } ) };
	assert.throws( () => ownedBySetting( old, 'sgs/icon-list', 'list-style', { markerType: 'check' } ), /no block_attributes\.owns_css column: reseed it/ );
} );

test( 'MUST FAIL: an unstated initial value is left alone only where the block\'s own default look paints that initial value', () => {
	assert.equal( undeclaredInitial( 'flex-grow', '0', {}, '0' ), true, 'the block paints the initial value: the draft states nothing more' );
	assert.equal( undeclaredInitial( 'flex-grow', '0', {}, '1' ), false, 'the block paints flex-grow 1 by default: the draft\'s 0 is a value to judge' );
	assert.equal( undeclaredInitial( 'flex-grow', '0', {}, undefined ), false, 'an unmeasured default judges nothing' );
	assert.equal( undeclaredInitial( 'flex-grow', '0', {} ), false );
} );

test( 'MUST FAIL: a settled report row named rest-width is a known reason, so census conservation does not refuse it', () => {
	assert.ok( SETTLED.includes( 'rest-width' ) );
	const row = { node: 'r0', block: 'sgs/nav-bar-menu', slot: '.bar', property: 'width', value: '16px', widths: [ 375, 768, 1440 ], reason: 'rest-width', detail: 'x' };
	assert.deepEqual( outcomesOf( { report: { settled: [ row ] }, unmapped: [] } ).unreasoned, [] );
	assert.ok( ANSWERING_PASSES.includes( 'rest-width' ), 'the run ledger records it as written, not as judged equal' );
	const [ s ] = passSettled( [ { ...row, reason: 'no-setting: x' } ], [], 'rest-width', [ row ] );
	assert.equal( s.reason, 'rest-width' );
	assert.match( s.detail, /fill-rest-width\.mjs/ );
} );

// ---- Fill: what the block paints, and where the property applies ----
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const calOf = ( paint ) => ( { 'sgs/text': { block: 'sgs/text', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...BASE, ...paint } ] ) ) }, settings: {}, discovered: {} } } );
function fill( styleAt, { paint = {}, declared = {} } = {} ) {
	const skeleton = [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: { ...BASE, ...styleAt( w ) }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );
	const declaredAt = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': declared } ] ) );
	const cal = calOf( paint );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: declaredAt, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => cal[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const rowsOf = ( out, prop, reason ) => out.settled.filter( ( s ) => prop === s.property && reason === s.reason );

test( 'MUST FAIL: flex-grow 0 the draft never declares is settled as the block\'s own layout only where the block paints 0 by default', () => {
	const styles = () => ( { 'flex-grow': '0' } );
	const painted = fill( styles, { paint: { 'flex-grow': '0' } } );
	assert.equal( rowsOf( painted, 'flex-grow', 'not-painted' ).filter( ( s ) => /initial value/.test( s.detail ) ).length, THREE.length, 'a block painting 0: the initial value is left to the block' );
	const other = fill( styles, { paint: { 'flex-grow': '1' } } );
	assert.deepEqual( rowsOf( other, 'flex-grow', 'not-painted' ).filter( ( s ) => /initial value/.test( s.detail ) ), [], 'a block painting 1: the draft\'s 0 is not settled as the initial value' );
} );

test( 'MUST FAIL: a width where the property applies to no box the element is gets a not-painted row naming why, and the equal row covers only the widths it applies at', () => {
	// justify-content on a block box with no columns paints nothing; at 1440 the box is a flex container and the value is stated.
	const styles = ( w ) => ( { 'justify-content': 'center', 'column-count': 'auto', 'column-width': 'auto', display: 1440 === w || 1920 === w ? 'flex' : 'block' } );
	const out = fill( styles );
	const gone = rowsOf( out, 'justify-content', 'not-painted' );
	assert.deepEqual( gone.map( ( s ) => s.widths[ 0 ] ).sort( ( a, b ) => a - b ), [ 375, 768 ], 'one row per width it does not apply at' );
	assert.match( gone[ 0 ].detail, /justify-content applies to .*display block/ );
	assert.ok( ! out.settled.some( ( s ) => 'justify-content' === s.property && 'equal' === s.reason && ( s.widths || [] ).some( ( w ) => w < 1440 ) ), 'no equal row claims the widths it does not apply at' );
	// Where the block already paints that value, the equal row covers the widths the property applies at, and those alone.
	const held = fill( styles, { paint: { 'justify-content': 'center' } } );
	assert.deepEqual( rowsOf( held, 'justify-content', 'equal' ).map( ( s ) => s.widths ), [ [ 1440 ] ] );
	assert.deepEqual( rowsOf( held, 'justify-content', 'not-painted' ).map( ( s ) => s.widths[ 0 ] ).sort( ( x, y ) => x - y ), [ 375, 768 ] );
	// Every width inapplicable: not-painted rows, no equal row, no write.
	const all = fill( () => ( { 'justify-content': 'center', 'column-count': 'auto', 'column-width': 'auto', display: 'block' } ) );
	assert.deepEqual( rowsOf( all, 'justify-content', 'not-painted' ).map( ( s ) => s.widths[ 0 ] ).sort( ( a, b ) => a - b ), THREE );
	assert.deepEqual( rowsOf( all, 'justify-content', 'equal' ), [] );
	assert.deepEqual( all.writes.filter( ( w ) => /justify-content/.test( w.prop ) ), [] );
} );
