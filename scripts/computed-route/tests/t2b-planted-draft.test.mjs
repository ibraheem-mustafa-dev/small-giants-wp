// Track T wave T2b (the effect recogniser U13 and the clip reveals U13b), Spec 48 FR-48-77: a planted draft that uses the
// script effects and clip reveals this wave closes (1) raises no seen-but-unsupported row while their coverage entries
// hold a write reference, and raises the row again with that one write reference nulled; (2) is recognised and written
// as validated layers, and with the effect's write ref (the editor's offer of the effect) nulled the same record is
// raised as an unmapped row instead; (3) raises one `effect` review row per recognised effect. The draft is read through
// the real usage read (lib/intake-usage.mjs::draftUsage) and judged against the real coverage map (data/clone-coverage.json)
// by intake's missing-features rule (lib/intake-missing.mjs::coverageMissing), as tests/motion-planted-draft.test.mjs does.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { draftUsage } from '../lib/intake-usage.mjs';
import { coverageMissing } from '../lib/intake-missing.mjs';
import { loadCoverage, statusOf, declaredWrites } from '../lib/clone-coverage.mjs';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { loadEffectOffers } from '../lib/motion-effects.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { reviewRows, MARKS, ROW_TYPES } from '../lib/intake-review.mjs';
import { SPEC_FILE, DATA_DIR } from '../lib/intake-spec-sync.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';
import { allowedSvg } from '../lib/fill-icon.mjs';

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

// Track T wave T2b, delivery units U14 and U13a (FR-48-80): the draft constructs the script behaviours stand on (a data
// hook, an event handler, an observer, a timer) are covered by the settings and exit writers, and each raises its
// missing-feature row again with that one entry's write ref nulled.
const BEHAVIOUR_CENSUS = [ 'data-hook', 'handler', 'observer', 'timer' ].map( ( kind ) => ( { kind, draftId: `Page:${ kind }` } ) );
const BEHAVIOUR_DRAFT = [ { component: 'Page', stamped: { elements: [ { n: '1', tag: 'section', attrs: [ [ 'data-x', '' ] ] } ] } } ];
const BEHAVIOUR_IDS = [ 'construct:data-hook', 'construct:handler', 'construct:observer', 'construct:timer', 'html-attr:global.data' ];
const behaviourRows = ( coverage ) => coverageMissing( { census: { rows: BEHAVIOUR_CENSUS }, coverage, usage: draftUsage( { sources: BEHAVIOUR_DRAFT, known: KNOWN } ).usage } );

test( 'MUST FAIL: the behaviour constructs raise no row while covered, and each raises its row again with its write ref nulled', () => {
	const coverage = loadCoverage();
	const raised = new Set( behaviourRows( coverage ).map( ( r ) => r.construct ) );
	for ( const id of BEHAVIOUR_IDS ) {
		assert.equal( statusOf( coverage.entries[ id ] ), 'covered', id );
		assert.match( coverage.entries[ id ].write, /lib\/fill-behaviour\.mjs#applySettings$/, id );
		assert.match( coverage.entries[ id ].test, /tests\/motion-settings\.test\.mjs$/, id );
		assert.ok( ! raised.has( id ), `${ id } raises no row while it is covered` );
		const nulled = { ...coverage, entries: { ...coverage.entries, [ id ]: { ...coverage.entries[ id ], write: null } } };
		const row = behaviourRows( nulled ).find( ( r ) => r.construct === id );
		assert.ok( row, `${ id } raises its row again with its write ref nulled` );
		assert.match( row.why, /no clone path yet \(has recognise, check/ );
	}
} );

// One planted record per settings behaviour; with the block's setting undeclared (the write ref nulled) it is raised as an unmapped row.
const SETTINGS_PLANTED = [
	[ 'sgs/site-header', 'scrolledOffset', { id: 'B-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setHeaderEl', description: 'Sticky header' }, trigger: { type: 'scroll-position', detail: 'window scroll: scrollY > 8' }, properties: [ { property: 'box-shadow', from: 'none', to: '0 10px 30px -18px rgba(20,40,60,.35)' } ] } ],
	[ 'sgs/business-info', 'openStatusDotPulse', { id: 'B-2', mechanism: 'waapi', status: 'active', iterations: 'infinite', duration_ms: 1600, element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setPulseEl', description: 'Status dot' }, trigger: { type: 'mount', detail: '' }, properties: [ { property: 'box-shadow', from: '0 0 0 0 currentColor', to: '0 0 0 8px transparent' } ] } ],
	[ 'sgs/testimonial-slider', 'autoplaySpeed', { id: 'B-3', mechanism: 'waapi', status: 'active', duration_ms: 520, element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setCard', description: 'Testimonial card' }, trigger: { type: 'state', detail: 'state.i changes or the 6.5s setInterval', state_keys: [ 'i' ] }, properties: [ { property: 'opacity', from: 0, to: 1 } ] } ],
	[ 'sgs/timeline', 'panelCounter', { id: 'B-4', mechanism: 'js-text-write', status: 'active', element: { dc: 'Site', template_tpl_id: '10', selector: '[data-pin] -> [data-pin-count]' }, trigger: { type: 'scroll-position', detail: 'updatePins() on window scroll' }, properties: [ { property: 'textContent', from: '01 / NN', to: 'NN / NN' } ] } ],
];

test( 'MUST FAIL: each planted settings behaviour is written, and with its setting undeclared the record is raised as an unmapped row', () => {
	for ( const [ block, attr, record ] of SETTINGS_PLANTED ) {
		const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/10#0' } } ] } ];
		const call = ( hasAttr ) => {
			const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
			const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [ record ], mdb, schema, rawSnapshot: { settings: { custom: {} } }, hasAttr } );
			return { out, flat };
		};
		const wrote = call( () => true );
		assert.deepEqual( wrote.out.unmapped, [], `${ record.id } raises nothing while written` );
		assert.ok( attr in wrote.flat[ 0 ].attributes, `${ record.id } writes ${ attr }` );
		const nulled = call( () => false );
		assert.deepEqual( nulled.flat[ 0 ].attributes, {}, `${ record.id } writes nothing with ${ block } declaring none` );
		assert.match( nulled.out.unmapped.map( ( u ) => u.reason ).join( '\n' ), new RegExp( `${ block } declares no ` ), `${ record.id } is raised again` );
	}
} );

// ---- Track T wave T2b, the media, icon, safe-area and styling writers (U5, U6, U4b, U8) ----
// A planted draft that holds an image in a figure, a map iframe, an inline SVG icon, the drawer foot's env() padding and a
// scroller's own scrollbar raises no seen-but-unsupported row for the capabilities this wave closes, and raises the row
// again with that one entry's write reference nulled.
describe( 'T2b media, icon, safe-area and scrollbar writers', () => {
	const MEDIA_CSS = '.foot{padding:14px 20px calc(16px + env(safe-area-inset-bottom))}.scroll::-webkit-scrollbar{width:8px}.scroll::-webkit-scrollbar-track{background:transparent}.scroll::-webkit-scrollbar-thumb{background:red}';
	const MEDIA_DRAFT = [ { component: 'Page', stamped: { elements: [
		{ n: '1', tag: 'style', attrs: [], body: MEDIA_CSS },
		{ n: '2', tag: 'figure', attrs: [] },
		{ n: '3', tag: 'img', attrs: [ [ 'src', 'assets/a.png' ], [ 'alt', 'A loaf' ] ] },
		{ n: '4', tag: 'figcaption', attrs: [] },
		{ n: '5', tag: 'iframe', attrs: [ [ 'src', 'https://www.google.com/maps?q=1+High+Street&z=14&output=embed' ] ] },
		{ n: '6', tag: 'svg', svg: 'svg', attrs: [ [ 'viewBox', '0 0 24 24' ] ] },
		{ n: '7', tag: 'path', svg: 'path', attrs: [ [ 'd', 'M0 0h24' ] ] },
		{ n: '8', tag: 'circle', svg: 'circle', attrs: [ [ 'cx', '12' ] ] },
		{ n: '9', tag: 'g', svg: 'g', attrs: [] },
	] } } ];
	const MEDIA_IDS = [ 'html:img', 'html-attr:img.alt', 'html-attr:img.src', 'html:figure', 'html:figcaption', 'html:iframe', 'html-attr:iframe.src', 'css-function:env', 'css-pseudo-element:-webkit-scrollbar', 'css-pseudo-element:-webkit-scrollbar-thumb', 'css-pseudo-element:-webkit-scrollbar-track' ];
	const mediaRows = ( coverage ) => coverageMissing( { census: { rows: [] }, coverage, usage: draftUsage( { sources: MEDIA_DRAFT, known: KNOWN } ).usage } );

	test( 'the planted draft uses each capability this wave closes', () => {
		const usage = draftUsage( { sources: MEDIA_DRAFT, known: KNOWN } ).usage;
		for ( const id of MEDIA_IDS ) {
			assert.ok( usage.has( id ), `${ id } is read from the draft` );
		}
	} );

	test( 'MUST FAIL: the media, map, safe-area and scrollbar entries raise no row while covered, and raise it again with that one write reference nulled', () => {
		const coverage = loadCoverage();
		const raised = new Set( mediaRows( coverage ).map( ( r ) => r.construct ) );
		for ( const id of MEDIA_IDS ) {
			assert.equal( statusOf( coverage.entries[ id ] ), 'covered', id );
			assert.ok( declaredWrites()[ coverage.entries[ id ].write.split( '#' )[ 0 ] ].includes( id ), `the writer declares ${ id }` );
			assert.ok( ! raised.has( id ), `${ id } raises no row while it is covered` );
			const nulled = { ...coverage, entries: { ...coverage.entries, [ id ]: { ...coverage.entries[ id ], write: null } } };
			const row = mediaRows( nulled ).find( ( r ) => r.construct === id );
			assert.ok( row, `${ id } raises its row again with its write ref nulled` );
		}
	} );

	test( 'MUST FAIL: every inline SVG tag the block\'s sanitiser keeps names the one subtree writer, and is a gap with that write ref nulled', () => {
		const coverage = loadCoverage();
		const kept = Object.keys( allowedSvg() );
		const ids = Object.keys( coverage.entries ).filter( ( id ) => id.startsWith( 'svg:' ) && kept.includes( id.slice( 4 ).toLowerCase() ) && ! coverage.entries[ id ].excluded && 'svg:animate' !== id );
		assert.ok( ids.length >= 30, `${ ids.length } svg entries` );
		for ( const id of ids ) {
			const e = coverage.entries[ id ];
			assert.match( e.write, /lib\/fill-icon\.mjs#iconDecisions$/, id );
			assert.ok( declaredWrites()[ 'scripts/computed-route/lib/fill-icon.mjs' ].includes( id ), `the writer declares ${ id }` );
			assert.equal( statusOf( e ), 'covered', id );
			assert.equal( statusOf( { ...e, write: null } ), 'gap', id );
		}
		const usage = draftUsage( { sources: MEDIA_DRAFT, known: KNOWN } ).usage;
		for ( const id of [ 'svg:svg', 'svg:path', 'svg:circle', 'svg:g' ] ) {
			assert.ok( usage.has( id ), `${ id } is read from the draft` );
			const nulled = { ...coverage, entries: { ...coverage.entries, [ id ]: { ...coverage.entries[ id ], write: null } } };
			assert.ok( mediaRows( nulled ).some( ( r ) => r.construct === id ), `${ id } raises its row again with its write ref nulled` );
		}
	} );
} );

