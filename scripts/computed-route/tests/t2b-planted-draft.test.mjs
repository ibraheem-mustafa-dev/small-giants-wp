// Track T wave T2b (the effect recogniser U13 and the clip reveals U13b), Spec 48 FR-48-77: a planted draft that uses the
// script effects and clip reveals this wave closes (1) raises no seen-but-unsupported row while their coverage entries
// hold a write reference, and raises the row again with that one write reference nulled; (2) is recognised and written
// as validated layers, and with the effect's write ref (the editor's offer of the effect) nulled the same record is
// raised as an unmapped row instead; (3) raises one `effect` review row per recognised effect. The draft is read through
// the real usage read (lib/intake-usage.mjs::draftUsage) and judged against the real coverage map (data/clone-coverage.json)
// by intake's missing-features rule (lib/intake-missing.mjs::coverageMissing), as tests/motion-planted-draft.test.mjs does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { draftUsage } from '../lib/intake-usage.mjs';
import { coverageMissing } from '../lib/intake-missing.mjs';
import { loadCoverage, statusOf } from '../lib/clone-coverage.mjs';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { loadEffectOffers } from '../lib/motion-effects.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { reviewRows, MARKS, ROW_TYPES } from '../lib/intake-review.mjs';
import { SPEC_FILE, DATA_DIR } from '../lib/intake-spec-sync.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const KNOWN = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
const CSS = [
	'.stripe{transform:translateX(-120%) skewX(-18deg)}',
	'.look-layer{clip-path:circle(var(--pr,0px) at var(--mx,50%) var(--my,50%));transition:clip-path .4s ease}',
	'.reveal{clip-path:inset(10% round 24px)}',
].join( '\n' );
const DRAFT = [ { component: 'Page', stamped: { elements: [ { n: '1', tag: 'style', attrs: [], body: CSS }, { n: '2', tag: 'section', attrs: [] } ] } } ];
const USAGE_IDS = [ 'css-function:skewx', 'css-function:circle', 'css-function:inset' ];
const EFFECT_IDS = [ 'fx:magnet', 'fx:sheen', 'fx:ripple', 'fx:glare', 'fx:follow-pointer', 'fx:cursor-field', 'fx:parallax', 'fx:scroll-progress' ];
const rowsFor = ( coverage ) => coverageMissing( { census: { rows: [] }, coverage, usage: draftUsage( { sources: DRAFT, known: KNOWN } ).usage } );

test( 'the planted draft uses each capability the wave closes', () => {
	const usage = draftUsage( { sources: DRAFT, known: KNOWN } ).usage;
	for ( const id of USAGE_IDS ) {
		assert.ok( usage.has( id ), `${ id } is read from the draft` );
	}
} );

test( 'MUST FAIL: the draft raises no row for a covered capability, and raises it again with that one entry\'s write ref nulled', () => {
	const coverage = loadCoverage();
	const raised = new Set( rowsFor( coverage ).map( ( r ) => r.construct ) );
	for ( const id of USAGE_IDS ) {
		assert.equal( statusOf( coverage.entries[ id ] ), 'covered', id );
		assert.ok( ! raised.has( id ), `${ id } raises no row while it is covered` );
		const nulled = { ...coverage, entries: { ...coverage.entries, [ id ]: { ...coverage.entries[ id ], write: null } } };
		const row = rowsFor( nulled ).find( ( r ) => r.construct === id );
		assert.ok( row, `${ id } raises its row again with its write ref nulled` );
		assert.match( row.why, /no clone path yet \(has recognise, check/ );
	}
} );

test( 'MUST FAIL: each script effect\'s coverage entry names its recogniser, writer, check and test, and is a gap with the write ref nulled', () => {
	const coverage = loadCoverage();
	for ( const id of EFFECT_IDS ) {
		const e = coverage.entries[ id ];
		assert.equal( statusOf( e ), 'covered', id );
		assert.match( e.recognise, /lib\/motion-behaviours\.mjs#recogniseBehaviour$/, id );
		assert.match( e.test, /tests\/motion-behaviours\.test\.mjs$/, id );
		assert.ok( e.note.length > 40, `${ id } says how it is solved` );
		assert.equal( statusOf( { ...e, write: null } ), 'gap', id );
	}
} );

// One planted record per effect, each of the mechanism the recogniser reads.
const MINUS = '−';
const TIMES = '×';
const rec = ( id, over ) => ( { id, name: id, mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: '' }, trigger: { type: 'pointer-move', detail: 'a pointer move over a [data-x] element' }, properties: [], duration_ms: 300, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const HOST = '[data-x]';
const PLANTED = [
	[ 'fx:magnet', rec( 'E-1', { element: { dc: 'Site', selector: `closest('${ HOST }')` }, properties: [ { property: 'translate', formula: `((x ${ MINUS } 0.5) ${ TIMES } 10)px ((y ${ MINUS } 0.5) ${ TIMES } 8)px, x,y = pointer position in element (0..1)` } ] } ) ],
	[ 'fx:sheen', rec( 'E-2', { mechanism: 'waapi', element: { dc: 'Site', selector: `span appended to the ${ HOST } element` }, properties: [ { property: 'transform', from: 'translateX(-120%) skewX(-18deg)', to: 'translateX(260%) skewX(-18deg)' } ] } ) ],
	[ 'fx:ripple', rec( 'E-3', { mechanism: 'waapi', trigger: { type: 'press', detail: `pointerdown on a ${ HOST } element` }, element: { dc: 'Site', selector: `span appended to the ${ HOST } element` }, properties: [ { property: 'transform', from: 'scale(0)', to: 'scale(1)' }, { property: 'opacity', from: 1, to: 0 } ] } ) ],
	[ 'fx:glare', rec( 'E-4', { element: { dc: 'Site', selector: `closest('${ HOST }')` }, properties: [ { property: 'rotate', formula: `x,y = pointer position (0..1); rotate = '(0.5${ MINUS }y) (x${ MINUS }0.5) 0 ' + 16 + 'deg' (max ${ '≈' } 11.3deg)` }, { property: '--gx', formula: `x ${ TIMES } 100%` }, { property: '--gy', formula: `y ${ TIMES } 100%` } ] } ) ],
	[ 'fx:follow-pointer', rec( 'E-5', { element: { dc: 'Site', selector: `closest('${ HOST }')` }, properties: [ { property: 'rotate', formula: `pointer position in card; rotate = hypot(x${ MINUS }0.5, y${ MINUS }0.5)${ TIMES }16 + 'deg'` } ] } ) ],
	[ 'fx:cursor-field', rec( 'E-6', { element: { dc: 'Site', selector: `closest('${ HOST }')` }, properties: [ { property: '--mx / --my', to: 'pointer position inside the card (px)', formula: 'clientX - rect.left, clientY - rect.top' } ] } ) ],
	[ 'fx:parallax', rec( 'E-7', { trigger: { type: 'scroll-position', detail: 'window scroll' }, element: { dc: 'Site', selector: `querySelector('${ HOST }')` }, properties: [ { property: 'translate', formula: `'0 ' + round(scrollY * -0.06) + 'px'` } ] } ) ],
	[ 'fx:scroll-progress', rec( 'E-8', { trigger: { type: 'scroll-position', detail: 'window scroll' }, element: { dc: 'Site', selector: `ref setBarEl (${ HOST })` }, properties: [ { property: 'transform', from: 'scaleX(0)', to: 'scaleX(1)', formula: 'scaleX(min(1, scrollY / (scrollHeight - innerHeight)))' } ] } ) ],
];
const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [] } ) ) );
const offersWithout = ( effect ) => {
	const o = loadEffectOffers();
	return { ...o, qualifying: Object.fromEntries( Object.entries( o.qualifying ).map( ( [ b, l ] ) => [ b, l.filter( ( e ) => e !== effect ) ] ) ) };
};
const writeAll = ( record, offers ) => {
	const nodes = [ { index: 0, name: 'sgs/container', targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/10#0' } } ] } ];
	const flat = [ { name: 'sgs/container', attributes: {}, ref: 'r0' } ];
	return motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [ record ], mdb, schema, rawSnapshot: { settings: { custom: {} } }, offers, template: { elements: { 'Site/10': { attrs: { 'data-x': '' } } } }, draftCss: [ '.l{clip-path:circle(var(--pr,0px) at var(--mx,50%) var(--my,50%))}' ] } );
};

test( 'MUST FAIL: each planted script effect is written as a validated layer, and with that effect\'s write ref nulled (the block no longer offers it) the record is raised as an unmapped row', () => {
	for ( const [ id, record ] of PLANTED ) {
		const effect = id.replace( 'fx:', '' );
		const written = writeAll( record, loadEffectOffers() );
		const wrote = JSON.stringify( written.writes.filter( ( w ) => 'sgsMotion' === w.attr ).map( ( w ) => w.after ) );
		assert.deepEqual( written.unmapped, [], `${ id } raises nothing while it is written` );
		// follow-pointer is the hover state's values, not a layer of its own.
		assert.ok( wrote.includes( 'follow-pointer' === effect ? 'followPointer' : `"effect":"${ effect }"` ), `${ id } is written: ${ wrote }` );
		if ( 'follow-pointer' === effect ) {
			continue;
		}
		const raised = writeAll( record, offersWithout( effect ) );
		assert.match( raised.unmapped.map( ( u ) => u.reason ).join( '\n' ), new RegExp( `${ effect }: sgs/container does not offer ${ effect }` ), `${ id } is raised again with its write ref nulled` );
	}
} );

test( 'MUST FAIL: the clip reveals the wave writes keep no corner radius; a reveal that is only a rounded clip is still written as the clip channel', () => {
	const reveal = { id: 'E-9', mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'scroll-into-view' }, duration_ms: 1000, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal',
		properties: [ { property: 'clip-path', from: 'inset(10% 10% 10% 10% round 24px)', to: 'inset(0 0 0 0 round 0px)' } ] };
	const out = writeAll( reveal, loadEffectOffers() );
	assert.deepEqual( out.unmapped, [] );
	const layer = out.writes.find( ( w ) => 'sgsMotion' === w.attr ).after.elements.root.entrance.base;
	assert.deepEqual( layer.values.from, { clip: 10 } );
	assert.doesNotMatch( JSON.stringify( layer ), /radius|round/i );
} );

test( 'MUST FAIL: a planted draft raises one effect review row per recognised effect, the row type is in the schema enum and in Appendix C, and its marks are the spec\'s', () => {
	const rows = reviewRows( { inventory: { animations: { records: PLANTED.map( ( [ , r ] ) => r ) }, diff: [] } } ).filter( ( r ) => 'effect' === r.rowType );
	assert.deepEqual( rows.map( ( r ) => r.draftId ), PLANTED.map( ( [ , r ] ) => r.id ) );
	assert.ok( rows.every( ( r ) => 'accept' === r.acceptAll ) );
	assert.ok( ROW_TYPES.includes( 'effect' ) );
	const schemaEnum = JSON.parse( fs.readFileSync( `${ DATA_DIR }/intake.schema.json`, 'utf8' ) ).properties.review.items.properties.rowType.enum;
	assert.deepEqual( schemaEnum, ROW_TYPES, 'the schema enum equals the review row types' );
	const spec = fs.readFileSync( SPEC_FILE, 'utf8' );
	const line = spec.split( '\n' ).find( ( l ) => l.startsWith( '| Script effect' ) );
	assert.ok( line, 'Appendix C lists the Script effect row type' );
	assert.deepEqual( [ ...line.split( '|' )[ 2 ].matchAll( /`([^`]+)`/g ) ].map( ( m ) => m[ 1 ] ).slice( 0, 3 ), [ 'accept', 'block:<slug>', 'difference' ], 'the table lists the marks in the review\'s order' );
	for ( const m of MARKS.effect ) {
		assert.ok( line.includes( `\`${ m.value ?? m.shape }\`` ), `Appendix C names the mark ${ m.value ?? m.shape }` );
	}
} );
