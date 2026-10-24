// Spec 48 FR-48-77 and Spec 38A FR-38A-41: a tilt's glare written by a pointer handler of its own. A draft that rotates an
// element from the pointer in one statement and writes the pointer position into custom properties in others (one record
// each) has a tilt with a glare layer, the same as a draft writing all three in one record; the custom-property records
// are held by that glare and never read as a cursor field. A cursor field on an element no tilt rotates stays a cursor
// field. Also the effect review rows' wording for settings and close behaviours (lib/motion-behaviours.mjs::effectRows).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { recogniseBehaviour, effectRows } from '../lib/motion-behaviours.mjs';
import { fromPointer } from '../lib/motion-tilt.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [] } ) ) );
const HOST = "e.target.closest && e.target.closest('[data-lean]')";
const rec = ( id, over ) => ( { id, name: `js-style-write in bind on ${ HOST }`, mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: HOST }, trigger: { type: 'pointer-move', detail: 'pointermove listener on document' }, properties: [], duration_ms: 0, delay_ms: 0, easing: null, iterations: 1, ...over } );
const TILT = rec( 'J-1', { duration_ms: 600, properties: [ { property: 'rotate', from: null, to: null, formula: "(0.5 - y) + ' ' + (x - 0.5) + ' 0 ' + (Math.hypot(x - 0.5, y - 0.5) * 16).toFixed(2) + 'deg'" } ], source: { file: 'Site.dc.html', function: 'bind', code: "t.style.rotate = (0.5 - y) + ' ' + (x - 0.5) + ' 0 ' + (Math.hypot(x - 0.5, y - 0.5) * 16).toFixed(2) + 'deg'" } } );
const GX = rec( 'J-2', { properties: [ { property: '--gx', from: null, to: null, formula: "(x * 100).toFixed(1) + '%'" } ], source: { file: 'Site.dc.html', function: 'bind', code: "t.style.setProperty('--gx', (x * 100).toFixed(1) + '%')" } } );
const GY = rec( 'J-3', { properties: [ { property: '--gy', from: null, to: null, formula: "(y * 100).toFixed(1) + '%'" } ], source: { file: 'Site.dc.html', function: 'bind', code: "t.style.setProperty('--gy', (y * 100).toFixed(1) + '%')" } } );
// The same pointer write on an element no tilt rotates (another hook): a cursor field.
const FIELD = { ...GX, id: 'J-4', element: { dc: 'Site', template_tpl_id: null, selector: "e.target.closest('[data-look]')" } };
const ALL = [ TILT, GX, GY, FIELD ];
// The same pointer write on the tilting element but from a handler of its own (another function): not that tilt's glare.
const OWN = { ...GX, id: 'J-5', source: { ...GX.source, function: 'trackPointer' } };

const run = ( records, given = null ) => {
	const nodes = [ { index: 0, name: 'sgs/container', targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/10#0' } } ] } ];
	const flat = [ { name: 'sgs/container', attributes: {}, ref: 'r0' } ];
	const template = given || { elements: { 'Site/10': { attrs: { 'data-lean': '' } } } };
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {} } }, template, draftTemplate: template } );
	return { out, doc: out.writes.find( ( w ) => 'sgsMotion' === w.attr )?.after ?? null };
};

test( 'MUST FAIL: pointer-written custom properties on the element a tilt rotates are held by that tilt\'s glare, never a cursor field', () => {
	for ( const r of [ GX, GY ] ) {
		const b = recogniseBehaviour( r, { records: ALL } );
		assert.equal( b.kind, 'covered', r.id );
		assert.equal( b.by, 'glare', r.id );
		assert.match( b.reason, /J-1 tilts: the glare layer of that Follow pointer reads it/ );
	}
} );

test( 'MUST FAIL: the tilt record carries the glare when the glare position is written by its own records', () => {
	const b = recogniseBehaviour( TILT, { records: ALL } );
	assert.deepEqual( b.effects.map( ( e ) => e.effect ), [ 'glare' ] );
	assert.equal( b.hoverState.followPointer, true );
	// Without the glare records, the tilt has no glare.
	assert.deepEqual( recogniseBehaviour( TILT, { records: [ TILT, FIELD ] } ).effects, [] );
} );

test( 'control: a pointer custom-property write on an element no tilt rotates stays a cursor field', () => {
	assert.equal( recogniseBehaviour( FIELD, { records: ALL } ).effects[ 0 ].effect, 'cursor-field' );
	// And with no tilt in the inventory, the same glare record is read as a cursor field (the pointer write alone is the evidence).
	assert.equal( recogniseBehaviour( GX, { records: [ GX, GY ] } ).effects[ 0 ].effect, 'cursor-field' );
	// A pointer write on the tilting element from another handler is a cursor field, and gives the tilt no glare.
	assert.equal( recogniseBehaviour( OWN, { records: [ TILT, OWN ] } ).effects[ 0 ].effect, 'cursor-field' );
	assert.deepEqual( recogniseBehaviour( TILT, { records: [ TILT, OWN ] } ).effects, [] );
} );

test( 'MUST FAIL: the effect rows give the tilt one row "glare + follow-pointer", no cursor-field row for its glare position, and the cursor field elsewhere its own row', () => {
	const rows = effectRows( ALL );
	assert.deepEqual( rows.map( ( r ) => [ r.rowId, r.effect ] ), [ [ 'effect:J-1', 'glare + follow-pointer' ], [ 'effect:J-4', 'cursor-field' ] ] );
} );

test( 'MUST FAIL: Fill writes one glare layer and the follow-pointer state on the tilting element, and no cursor field', () => {
	const { doc } = run( [ TILT, GX, GY ] );
	const root = doc.elements.root;
	assert.equal( root.hover.state.values.followPointer, true );
	assert.deepEqual( ( root.hover.effects || [] ).map( ( l ) => l.effect ), [ 'glare' ] );
	assert.deepEqual( ( root.effects || [] ).map( ( l ) => l.effect ), [] );
} );

test( 'MUST FAIL: settings and close rows say what they are, never "the no SGS effect effect"', () => {
	const slider = { id: 'A-1', name: 'Web Animation on a testimonial card', mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: '.x', description: 'testimonial card' }, trigger: { type: 'state', detail: 'every 5 s setInterval' }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 400 };
	const close = { id: 'A-2', name: 'Web Animation in closeMobile on ref setDrawerEl', mechanism: 'waapi', status: 'active', fill: 'forwards', element: { dc: 'Site', template_tpl_id: null, selector: 'ref setDrawerEl' }, trigger: { type: 'press', detail: '' }, source: { function: 'closeMobile' }, properties: [ { property: 'opacity', from: 1, to: 0 } ], duration_ms: 300 };
	assert.equal( recogniseBehaviour( slider ).kind, 'settings' );
	assert.equal( recogniseBehaviour( close ).kind, 'close' );
	const rows = effectRows( [ slider, close ] );
	assert.equal( rows.length, 2 );
	rows.forEach( ( r ) => assert.doesNotMatch( r.text, /no SGS effect effect/ ) );
	assert.match( rows[ 0 ].text, /is written as the block settings sgs\/testimonial-slider autoplay, autoplaySpeed, slidesVisible/ );
	assert.equal( rows[ 0 ].effect, 'settings: sgs/testimonial-slider autoplay, autoplaySpeed, slidesVisible, transitionDuration' );
	assert.match( rows[ 1 ].text, /is the close of the same element's open entrance/ );
	assert.equal( rows[ 1 ].effect, 'close' );
} );

// The draft's glare layers: a span inside each tilting element painted a radial highlight at the pointer position the
// glare records write (`--gx`, `--gy`).
const GLARE_BG = ( alpha ) => `radial-gradient(circle at var(--gx,50%) var(--gy,0%),rgba(255,255,255,${ alpha }),rgba(255,255,255,0) 55%)`;
const hostsWith = ( ...layers ) => ( { elements: Object.fromEntries( layers.flatMap( ( bg, i ) => [
	[ `Site/${ 10 + 2 * i }`, { attrs: { 'data-lean': '' }, parent: null } ],
	[ `Site/${ 11 + 2 * i }`, { attrs: {}, parent: `Site/${ 10 + 2 * i }`, style: { static: null === bg ? [] : [ [ 'position', 'absolute' ], [ 'background', bg, 'unexpanded' ] ] } } ],
] ) ) } );

test( 'MUST FAIL: the tilt\'s largest angle is read from the pointer distance times a factor, the corner angle (16 x √0.5)', () => {
	assert.equal( recogniseBehaviour( TILT, { records: ALL } ).hoverState.maxAngle, 11.3 );
} );

test( 'MUST FAIL: a tilt whose formula states no angle raises a named row instead of the default angle standing silently', () => {
	const bare = { ...TILT, properties: [ { ...TILT.properties[ 0 ], formula: "(0.5 - y) + ' ' + (x - 0.5) + ' 0 ' + a + 'deg'" } ] };
	const b = recogniseBehaviour( bare, { records: [ bare ] } );
	assert.equal( b.hoverState.maxAngle, undefined );
	assert.deepEqual( b.unread.map( ( u ) => u.field ), [ 'maxAngle' ] );
	assert.ok( effectRows( [ bare ] ).some( ( r ) => 'effect:J-1:maxAngle' === r.rowId && /states no largest angle/.test( r.unmapped ) ) );
	assert.deepEqual( recogniseBehaviour( TILT, { records: ALL } ).unread, [] );
} );

test( 'MUST FAIL: the glare\'s colour, strength and size are read from the draft\'s glare layer', () => {
	const b = recogniseBehaviour( TILT, { records: ALL, template: hostsWith( GLARE_BG( '.42' ) ) } );
	assert.deepEqual( b.effects[ 0 ].values, { glareColour: '#ffffff', glareOpacity: 0.42, glareSize: 55 } );
	assert.deepEqual( b.unread, [] );
	const { doc } = run( [ TILT, GX, GY ], hostsWith( GLARE_BG( '.42' ) ) );
	assert.deepEqual( doc.elements.root.hover.effects[ 0 ].values, { glareColour: '#ffffff', glareOpacity: 0.42, glareSize: 55 } );
} );

test( 'MUST FAIL: glare layers that differ, or a host with no readable glare layer, raise named rows; the values they agree on are kept', () => {
	const two = recogniseBehaviour( TILT, { records: ALL, template: hostsWith( GLARE_BG( '.42' ), GLARE_BG( '.36' ) ) } );
	assert.deepEqual( two.effects[ 0 ].values, { glareColour: '#ffffff', glareSize: 55 } );
	assert.deepEqual( two.unread.map( ( u ) => u.field ), [ 'glareOpacity' ] );
	assert.match( two.unread[ 0 ].reason, /0\.42 on Site\/10, 0\.36 on Site\/12/ );
	const none = recogniseBehaviour( TILT, { records: ALL, template: hostsWith( null ) } );
	assert.deepEqual( none.effects[ 0 ].values, {} );
	assert.deepEqual( none.unread.map( ( u ) => u.field ), [ 'glare' ] );
	// A radial highlight not placed at the pointer position the glare records write is not the glare layer.
	const fixed = recogniseBehaviour( TILT, { records: ALL, template: hostsWith( 'radial-gradient(circle at 50% 0%,rgba(255,255,255,.42),rgba(255,255,255,0) 55%)' ) } );
	assert.deepEqual( fixed.unread.map( ( u ) => u.field ), [ 'glare' ] );
	// A highlight that does not fade to nothing is not the glare's shape.
	const solid = recogniseBehaviour( TILT, { records: ALL, template: hostsWith( 'radial-gradient(circle at var(--gx,50%) var(--gy,0%),rgba(255,255,255,.42),rgba(255,255,255,.2) 55%)' ) } );
	assert.deepEqual( solid.unread.map( ( u ) => u.field ), [ 'glare' ] );
} );

test( 'MUST FAIL: a property is pointer-written by its own formula or value, never by the words of the statement around it', () => {
	const code = "sp.style.cssText = 'position:absolute;pointer-events:none;left:' + (e.clientX - r.left) + 'px'";
	assert.equal( fromPointer( { property: 'position', to: 'absolute' }, { source: { code } } ), false );
	assert.equal( fromPointer( { property: 'left', formula: '(e.clientX - r.left) + \'px\'' }, { source: { code } } ), true );
	// A fixed custom-property write in a pointer handler on the tilting element is no glare position.
	const fixedVar = rec( 'J-6', { properties: [ { property: '--gx', from: null, to: '50%' } ], source: { file: 'Site.dc.html', function: 'bind', code: "t.style.setProperty('--gx', '50%') // reset after pointer" } } );
	assert.deepEqual( recogniseBehaviour( TILT, { records: [ TILT, fixedVar ] } ).effects, [] );
} );

test( 'the same-handler rule: the same function in another file, or two records with no function, are not the same handler (each clause has its mutation)', () => {
	const OWN_FILE = { ...GX, id: 'J-7', source: { ...GX.source, file: 'Other.dc.html' } };
	assert.equal( recogniseBehaviour( OWN_FILE, { records: [ TILT, OWN_FILE ] } ).effects[ 0 ].effect, 'cursor-field' );
	assert.deepEqual( recogniseBehaviour( TILT, { records: [ TILT, OWN_FILE ] } ).effects, [] );
	const tiltNoFn = { ...TILT, source: { ...TILT.source, function: null } };
	const NULL_FN = { ...GX, id: 'J-8', source: { ...GX.source, function: null } };
	assert.equal( recogniseBehaviour( NULL_FN, { records: [ tiltNoFn, NULL_FN ] } ).effects[ 0 ].effect, 'cursor-field' );
	assert.deepEqual( recogniseBehaviour( tiltNoFn, { records: [ tiltNoFn, NULL_FN ] } ).effects, [] );
} );
