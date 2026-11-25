// A header that shrinks once the page has scrolled (lib/motion-behaviour-settings.mjs::scrollShrinkOf, placed by
// lib/fill-behaviour.mjs::behaviourIndex's placedFor through lib/fill-motion.mjs::motionWrites): the draft keys the shrink by a
// `scrolled` state, with no box-shadow write for the box-shadow recogniser to read. The looks come from the fact record's
// state reads (`holesByState`), so each case plants a fact record shaped like lib/fact-record.mjs's and asserts the settings
// written on the tree nodes, against the blocks' own block.json files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { templateOf } from '../lib/fill-behaviour.mjs';
import { scrolledLooksOf, paddingBox } from '../lib/motion-behaviour-settings.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const BLOCKS = path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );
const declared = ( block, attr ) => !! JSON.parse( fs.readFileSync( path.join( BLOCKS, block.split( '/' )[ 1 ], 'block.json' ), 'utf8' ) ).attributes?.[ attr ];
const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/site-header': [], 'sgs/site-header-row': [], 'sgs/responsive-logo': [] } ) ) );

const JOB = 'S-3:scrolled (shrunk)';
const str = ( v ) => ( { v: [ { t: 'string', v } ], n: 1, loop: false } );
const num = ( v ) => ( { v: [ { t: 'number', v } ], n: 1, loop: false } );
const atEach = ( make, by ) => Object.fromEntries( Object.entries( by ).map( ( [ w, v ] ) => [ w, make( v ) ] ) );
const WIDTHS = [ 375, 768, 1440 ];
const same = ( make, v ) => atEach( make, Object.fromEntries( WIDTHS.map( ( w ) => [ w, v ] ) ) );

// A header (13), its main row (14) whose padding is bound to navPad, and two logos (29 bound to logoW, 30 to wordmarkW).
// `scrolledPad`: the shrunk padding by width; `states`: the surface's states.
function facts( { scrolledPad = same( str, '10px 24px' ), restPad = { 375: '12px 16px', 768: '20px 28px', 1440: '20px 28px' }, states, tag = 'header', threshold = 40 } = {} ) {
	const el = ( n, parentChain, template, logic = {} ) => [ `Site/${ n }`, { template: { key: `Site/${ n }`, tag: 'div', realTag: 'div', parentChain: parentChain.map( ( k ) => `Site/${ k }` ), style: { static: [], holes: [] }, holes: [], ...template }, logic: { holes: {}, ...logic } } ];
	const hole = ( id, where, path ) => ( { id, where, expr: path, path, whole: true } );
	const header = el( 13, [], { tag, realTag: tag } );
	header[ 1 ].effects = [ { id: 'J-05', mechanism: 'js-style-write', trigger: { type: 'scroll-position', detail: `window 'scroll' listener; the same handler sets state.scrolled = scrollY > ${ threshold }.`, state_keys: [ 'scrolled' ] } } ];
	header[ 1 ].surfaces = [ { id: 'S-3', kind: 'header', otherStates: states ?? [ { name: 'top', state_keys: { scrolled: false } }, { name: 'scrolled (shrunk)', state_keys: { scrolled: true }, animation_ids: [ 'TR-02' ] } ] } ];
	return { elements: Object.fromEntries( [
		header,
		el( 14, [ 13 ], { holes: [ hole( 'style:padding#1', 'style:padding', 'navPad' ) ] }, { holes: { 'style:padding#1': atEach( str, restPad ) }, holesByState: { [ JOB ]: { 'style:padding#1': scrolledPad } } } ),
		el( 29, [ 14, 13 ], { holes: [ hole( 'attr:width#0', 'attr:width', 'logoW' ) ] }, { holes: { 'attr:width#0': same( num, 48 ) }, holesByState: { [ JOB ]: { 'attr:width#0': same( num, 40 ) } } } ),
		el( 30, [ 14, 13 ], { holes: [ hole( 'attr:width#0', 'attr:width', 'wordmarkW' ) ] }, { holes: { 'attr:width#0': same( num, 110 ) }, holesByState: { [ JOB ]: { 'attr:width#0': same( num, 92 ) } } } ),
	] ) };
}

// The records the Fill reads are intake's re-derived inventory: one transition per element, naming the property and carrying
// no scrolled state key; the draft's own records (with the threshold) sit in the fact record under each element's `effects`.
const rec = ( id, tpl, property, over = {} ) => ( { id, name: id, mechanism: 'css-transition', status: 'active', element: { dc: 'Site', template_tpl_id: tpl, selector: '', description: '' }, trigger: { type: 'state', detail: 'state-bound inline value ({{ }})' }, properties: [ { property, from: null, to: null } ], duration_ms: 350, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const ROW = rec( 'TR-001', '14', 'padding' );
const LOGO = rec( 'TR-005', '29', 'width' );
const WORDMARK = rec( 'TR-006', '30', 'width' );

const NODES = [ [ 'sgs/site-header', '13' ], [ 'sgs/site-header-row', '14' ], [ 'sgs/responsive-logo', '29' ], [ 'sgs/responsive-logo', '30' ] ];
function run( records, f = facts(), blocks = NODES ) {
	const nodes = blocks.map( ( [ name, tpl ], index ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } ) );
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {}, color: { palette: [] } } }, template: templateOf( f ), hasAttr: declared } );
	return { out, attrs: ( i ) => flat[ i ].attributes };
}
const BOX = { top: '10px', right: '24px', bottom: '10px', left: '24px' };

test( 'MUST FAIL: a row whose padding the draft changes with its scrolled state shrinks on scroll: rowShrink, the shrunk padding and the draft threshold on the header', () => {
	const { out, attrs } = run( [ ROW, LOGO, WORDMARK ] );
	assert.deepEqual( attrs( 1 ), { rowShrink: { desktop: 'on' }, rowShrinkPadding: { desktop: BOX }, rowShrinkDuration: 350 } );
	assert.deepEqual( attrs( 0 ), { scrolledOffset: 40 } );
	assert.deepEqual( out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` ), [] );
} );

test( 'MUST FAIL: a logo whose width the draft changes with its scrolled state gets its shrunk width as the block own setting', () => {
	const { attrs } = run( [ ROW, LOGO, WORDMARK ] );
	assert.deepEqual( attrs( 2 ), { shrinkWidth: { desktop: '40px' } } );
	assert.deepEqual( attrs( 3 ), { shrinkWidth: { desktop: '92px' } } );
} );

test( 'MUST FAIL: a narrower tier whose shrunk padding differs is written on its own tier; a width with no change is off beneath a tier that shrinks', () => {
	const own = facts( { scrolledPad: { 375: str( '8px 12px' ), 1440: str( '10px 24px' ) } } );
	const { attrs } = run( [ ROW ], own );
	assert.deepEqual( attrs( 1 ), { rowShrink: { desktop: 'on', tablet: 'off', mobile: 'on' }, rowShrinkPadding: { desktop: BOX, mobile: { top: '8px', right: '12px', bottom: '8px', left: '12px' } }, rowShrinkDuration: 350 } );
} );

test( 'negative: the threshold is written only when it differs from the header default 50', () => {
	const { attrs } = run( [ ROW ], facts( { threshold: 50 } ) );
	assert.equal( attrs( 0 ).scrolledOffset, undefined );
	assert.deepEqual( attrs( 1 ).rowShrink, { desktop: 'on' } );
	assert.equal( run( [ ROW ], facts( { threshold: null } ) ).attrs( 0 ).scrolledOffset, undefined, 'a draft stating no distance leaves the header default' );
} );

test( 'negative: a header with no scrolled state (no look, or another state key) writes nothing', () => {
	const quiet = facts( { states: [ { name: 'open', state_keys: { menuOpen: true } } ] } );
	assert.deepEqual( scrolledLooksOf( quiet ), {} );
	for ( const n of [ 0, 1, 2, 3 ] ) {
		assert.deepEqual( run( [ ROW, LOGO, WORDMARK ], quiet ).attrs( n ), {} );
	}
	assert.deepEqual( run( [ ROW ], null ).attrs( 1 ), {}, 'a run with no fact record' );
} );

test( 'negative: a record of a property the scrolled state does not change, an element with no look, and a row outside any header write nothing', () => {
	assert.deepEqual( run( [ rec( 'TR-009', '14', 'color' ) ] ).attrs( 1 ), {} );
	assert.deepEqual( run( [ rec( 'TR-010', '13', 'padding' ) ] ).attrs( 0 ), {} );
	const noHeader = facts();
	noHeader.elements[ 'Site/14' ].template.parentChain = [];
	noHeader.elements[ 'Site/13' ].template.tag = 'div';
	noHeader.elements[ 'Site/13' ].template.realTag = 'div';
	assert.deepEqual( run( [ ROW ], noHeader ).attrs( 1 ), {} );
} );

test( 'a padding that is not in pixels keeps rowShrink on without a shrunk padding, and says so', () => {
	const calc = facts( { scrolledPad: same( str, 'calc(1rem + 2px) 24px' ) } );
	const { out, attrs } = run( [ ROW ], calc );
	assert.deepEqual( attrs( 1 ), { rowShrink: { desktop: 'on' }, rowShrinkDuration: 350 } );
	assert.match( out.notes.map( ( n ) => n.text ).join( ' ' ), /not in pixels at every width/ );
} );

test( 'paddingBox reads one to four pixel lengths as the four sides, else null', () => {
	assert.deepEqual( paddingBox( '10px 24px' ), BOX );
	assert.deepEqual( paddingBox( '8' ), { top: '8px', right: '8px', bottom: '8px', left: '8px' } );
	assert.equal( paddingBox( '1rem 2px' ), null );
	assert.equal( paddingBox( '1px 2px 3px 4px 5px' ), null );
} );

test( 'MUST FAIL: the row shrinks with the draft\'s own duration and easing (rowShrinkDuration, rowShrinkEasing), a default or an unnamed curve writes none', () => {
	const timed = ( over ) => run( [ { ...ROW, ...over } ] ).attrs( 1 );
	assert.deepEqual( timed( { duration_ms: 350, easing: 'ease-in-out' } ), { rowShrink: { desktop: 'on' }, rowShrinkPadding: { desktop: BOX }, rowShrinkDuration: 350, rowShrinkEasing: 'ease-in-out' } );
	const bezier = timed( { duration_ms: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } );
	assert.deepEqual( [ bezier.rowShrinkDuration, bezier.rowShrinkEasing, bezier.rowShrinkEasingCustom ], [ 400, 'custom', 'cubic-bezier(0.4, 0, 0.2, 1)' ] );
	// Negative controls: the block's own 200ms and ease are not written; an easing with no name and no bezier is noted, not guessed.
	assert.deepEqual( timed( { duration_ms: 200, easing: 'ease' } ), { rowShrink: { desktop: 'on' }, rowShrinkPadding: { desktop: BOX } } );
	assert.deepEqual( timed( { duration_ms: null } ), { rowShrink: { desktop: 'on' }, rowShrinkPadding: { desktop: BOX } }, 'a record with no duration' );
	assert.equal( timed( { easing: 'ease-in' } ).rowShrinkEasing, undefined );
} );
