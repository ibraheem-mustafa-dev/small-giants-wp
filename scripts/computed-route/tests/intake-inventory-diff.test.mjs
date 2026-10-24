// Spec 48 FR-48-25, lib/intake-inventory-diff.mjs: Claude Design's animations.json and surfaces.json against the
// re-derived inventory. Records pair by what identifies the effect (a code record by file, line and mechanism family, a
// template record by draft and element), never by ID or name; every difference is a row and identical inventories give
// none. No browser: the inventories are written here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diffInventory, diffAnimations, diffSurfaces, pairKey, norm, routeKey, scIfKey } from '../lib/intake-inventory-diff.mjs';

const record = ( id, over = {} ) => ( {
	id, name: `record ${ id }`, mechanism: 'css-transition',
	element: { dc: 'Home', template_tpl_id: '3', selector: 'template element data-dc-tpl=3', description: 'a link' },
	source: { file: 'Home.dc.html', function: 'template', ref: null, line: null, code: 'transition:color .2s' },
	trigger: { type: 'hover', detail: 'style-hover' }, properties: [ { property: 'color', from: '#0A7EA8', to: '#075E80' } ],
	duration_ms: 200, delay_ms: 0, stagger: null, easing: 'ease', iterations: 1, direction: null, fill: null,
	reduced_motion: { behaviour: 'unchanged', detail: '' }, status: 'active', trace: { observed: 'not-instrumented' }, ...over,
} );
const waapi = ( id, over = {} ) => record( id, { mechanism: 'waapi', element: { dc: 'Home', template_tpl_id: '8', selector: 'ref setPanel', description: 'panel' }, source: { file: 'Home.dc.html', function: 'componentDidUpdate', ref: 'setPanel', line: 56 }, trigger: { type: 'state', detail: 'open' }, duration_ms: 300, ...over } );
const anims = ( records ) => ( { records, counts: { animate_calls: { by_dc: {}, total: records.filter( ( r ) => 'waapi' === r.mechanism ).length, record_ids: [] } } } );
const surfaces = ( over = {} ) => ( {
	records: [ { id: 'S-01', kind: 'drawer', name: 'menu', dc: 'Home', template_tpl_id: '7', route: null, opened_by: 'x', closed_by: 'y', states: [ { name: 'open', state_keys: { open: true }, how_to_reach: 'click' } ], time_dependent: { value: false, reason: '' } } ],
	counts: { routes: { by_dc: {}, total: 2, covered_by: { home: 'S-02', about: 'S-03' } }, toggling_sc_ifs: { by_dc: {}, total: 1, covered_by: { 'Home:7': 'S-01' } } }, ...over,
} );
const ours = { animations: anims( [ record( 'TR-001' ), waapi( 'A-01' ) ] ), surfaces: surfaces() };

test( 'POSITIVE: identical inventories give no row, whatever their record IDs, names and spelling', () => {
	const theirs = structuredClone( ours );
	theirs.animations.records = [ waapi( 'A-07', { name: 'Panel slide' } ), record( 'TR-099', { duration_ms: '0.2s', properties: [ { property: 'color', from: '#0a7ea8', to: '#075e80' } ] } ) ];
	theirs.surfaces.counts.routes.covered_by = { '/': 'S-09', '#/about': 'S-10' };
	theirs.surfaces.counts.toggling_sc_ifs.covered_by = { 'Home#7': 'S-11' };
	theirs.surfaces.records[ 0 ].id = 'S-11';
	assert.deepEqual( diffInventory( ours, theirs ), [] );
} );

test( 'MUST FAIL: a changed field of a paired record is one row naming the field with both values', () => {
	const theirs = structuredClone( ours );
	theirs.animations.records[ 1 ].duration_ms = 520;
	const rows = diffInventory( ours, theirs );
	assert.deepEqual( rows.map( ( r ) => [ r.rowId, r.field, r.ours, r.theirs, r.draftId ] ), [ [ 'inventory:anim:Home.dc.html|56|waapi:duration_ms', 'duration_ms', '300', '520', 'Home.dc.html:56' ] ] );
	assert.ok( rows[ 0 ].why );
} );

test( 'MUST FAIL: a record only one side has is a row; a count total that differs is a row', () => {
	const rows = diffAnimations( ours.animations, anims( [ record( 'TR-001' ), record( 'PS-001', { mechanism: 'css-pseudo', element: { dc: 'Home', template_tpl_id: '4', selector: 'x', description: 'y' } } ) ] ) );
	assert.deepEqual( rows.map( ( r ) => r.rowId ), [ 'inventory:anim:Home.dc.html|56|waapi:only-ours', 'inventory:anim:theirs:Home|tpl|4|css:only-theirs', 'inventory:count:animate_calls' ] );
} );

test( 'MUST FAIL: a route or a toggling sc-if only one side lists, a surface kind or state count that differs, each is a row', () => {
	const theirs = surfaces( { counts: { routes: { by_dc: {}, total: 3, covered_by: { home: 'S-02', about: 'S-03', contact: 'S-04' } }, toggling_sc_ifs: { by_dc: {}, total: 1, covered_by: { 'Home:9': 'S-01' } } } } );
	theirs.records[ 0 ] = { ...theirs.records[ 0 ], kind: 'menu', states: [ ...theirs.records[ 0 ].states, { name: 'closed', state_keys: { open: false }, how_to_reach: 'click' } ] };
	assert.deepEqual( diffSurfaces( ours.surfaces, theirs ).map( ( r ) => r.rowId ), [
		'inventory:surface:route:contact:only-theirs', 'inventory:surface:toggling-sc-if:Home:7:only-ours', 'inventory:surface:toggling-sc-if:Home:9:only-theirs',
		'inventory:surface-count:routes', 'inventory:surface:Home|7:kind', 'inventory:surface:Home|7:states' ] );
} );

test( 'a missing or unreadable Claude Design copy is one row each, never a silent pass', () => {
	assert.deepEqual( diffInventory( ours, { animations: null, animationsError: 'Unexpected token', surfaces: null } ).map( ( r ) => [ r.rowId, r.why ] ), [
		[ 'inventory:animations:missing', 'Unexpected token' ], [ 'inventory:surfaces:missing', 'not in the export' ] ] );
} );

test( 'pairing keys and normalisation', () => {
	assert.equal( pairKey( waapi( 'A-01' ) ), 'Home.dc.html|56|waapi' );
	assert.equal( pairKey( record( 'TR-001' ) ), 'Home|tpl|3|css' );
	assert.equal( pairKey( record( 'RM-01', { mechanism: 'css-media', element: { dc: 'Home', template_tpl_id: '6', selector: 's', description: 'd' } } ) ), 'Home|css-media' );
	assert.deepEqual( [ norm( '.2s' ), norm( '200ms' ), norm( 'rnd() * 3000' ), norm( 'auto' ) ], [ 200, 200, 'rnd()*3000', 'none' ] );
	assert.deepEqual( [ routeKey( '#/about' ), routeKey( '/' ), routeKey( 'Home.dc.html' ), scIfKey( 'Home:115 isSub' ), scIfKey( 'Indus#63' ) ], [ 'about', 'home', 'home', 'Home:115', 'Indus:63' ] );
} );

test( 'MUST FAIL: a number spelt two ways inside a value is one value; a different number or a hex colour digit is not', () => {
	const media = ( to ) => record( 'RM-01', { mechanism: 'css-media', element: { dc: 'Home', template_tpl_id: null, selector: '@media (prefers-reduced-motion: reduce)', description: 'd' }, properties: [ { property: 'animation-duration', from: null, to } ] } );
	assert.deepEqual( diffAnimations( anims( [ media( '0.01ms !important' ) ] ), anims( [ media( '.01ms !important' ) ] ) ), [] );
	assert.deepEqual( diffAnimations( anims( [ media( 'cubic-bezier(0.16,0.84,0.32,1.0)' ) ] ), anims( [ media( 'cubic-bezier(.16,.84,.32,1)' ) ] ) ), [] );
	assert.equal( diffAnimations( anims( [ media( '0.01ms !important' ) ] ), anims( [ media( '.02ms !important' ) ] ) ).length, 1 );
	assert.equal( diffAnimations( anims( [ media( 'translateX(-120%)' ) ] ), anims( [ media( 'translateX(120%)' ) ] ) ).length, 1 );
	assert.equal( diffAnimations( anims( [ media( '#00aa00' ) ] ), anims( [ media( '#0aa00' ) ] ) ).length, 1 );
	assert.deepEqual( [ norm( '.01ms !important' ), norm( '#0A7EA8' ), norm( 'rgba(0,0,0,.50)' ) ], [ '0.01ms!important', '#0a7ea8', 'rgba(0,0,0,0.5)' ] );
} );

test( 'MUST FAIL: two effects at one call site pair with their own counterparts whatever order each side lists them in', () => {
	const at = { file: 'Home.dc.html', function: 'fx', ref: null, line: 90 };
	const sheen = ( id ) => waapi( id, { source: at, trigger: { type: 'pointer-move' }, duration_ms: 750, properties: [ { property: 'transform', from: 'translateX(-120%)', to: 'translateX(260%)' } ] } );
	const ripple = ( id ) => waapi( id, { source: at, trigger: { type: 'press' }, duration_ms: 650, properties: [ { property: 'transform', from: 'scale(0)', to: 'scale(1)' }, { property: 'opacity', from: 1, to: 0 } ] } );
	assert.deepEqual( diffAnimations( anims( [ ripple( 'A-30' ), sheen( 'A-31' ) ] ), anims( [ sheen( 'A-18' ), ripple( 'A-19' ) ] ) ), [] );
	// A real difference still shows, against the counterpart it belongs to.
	const rows = diffAnimations( anims( [ ripple( 'A-30' ), sheen( 'A-31' ) ] ), anims( [ { ...sheen( 'A-18' ), duration_ms: 800 }, ripple( 'A-19' ) ] ) );
	assert.deepEqual( rows.map( ( r ) => [ r.field, r.ours, r.theirs, r.text.slice( 0, 15 ) ] ), [ [ 'duration_ms', '750', '800', 'A-31 (theirs A-' ] ] );
} );

test( 'MUST FAIL: a record of Claude Design\'s naming several template elements covers each re-derived record at its call site', () => {
	const at = { file: 'Home.dc.html', function: 'floatIt', ref: 'setFloatEl', line: 70 };
	const float = ( id, tpl, over = {} ) => waapi( id, { source: at, element: { dc: 'Home', template_tpl_id: tpl, selector: 'ref', description: 'd' }, trigger: { type: 'mount' }, ...over } );
	// The call count differs by design (one theirs record, two of ours); only the record rows are asserted.
	const records = ( rows ) => rows.filter( ( r ) => ! r.rowId.startsWith( 'inventory:count:' ) );
	assert.deepEqual( records( diffAnimations( anims( [ float( 'A-27', '215' ), float( 'A-28', '287' ) ] ), anims( [ float( 'A-16', [ '215', '287' ] ) ] ) ) ), [] );
	// One difference both share is listed once; an element the record does not name is still only ours.
	const rows = records( diffAnimations( anims( [ float( 'A-27', '215' ), float( 'A-28', '287' ), float( 'A-29', '300' ) ] ), anims( [ float( 'A-16', [ '215', '287' ], { trigger: { type: 'loop' } } ) ] ) ) );
	assert.deepEqual( rows.map( ( r ) => r.rowId ), [ 'inventory:anim:Home.dc.html|70|waapi:trigger.type', 'inventory:anim:Home.dc.html|70|waapi:only-ours' ] );
	assert.match( rows[ 1 ].text, /^A-29 / );
} );
