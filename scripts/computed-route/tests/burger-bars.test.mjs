// A hover that changes an element's width (the burger's bars growing to full length when the menu button is hovered)
// is the motion hover layer's width channel (Spec 38A FR-38A-60: hover.state.values width and restWidth), with the
// record's own duration and delay, and a hover the draft drives from an ancestor's :hover plays from the block's item
// host (source `item`, supports.sgs.animationItems). A planted draft modelled on a real burger: three 2.5px bars at
// 18, 13 and 8px, the second and third growing to 18px (0.3s; 0.35s with a 40ms delay) when the button is hovered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const db = openDb();
const schema = loadMotionSchema();
const EMPH = 'cubic-bezier(.16,.84,.32,1)';
const raw = { settings: { custom: { duration: { fast: '250ms', medium: '300ms' }, easing: { emphasised: 'cubic-bezier(0.16, 0.84, 0.32, 1)' } } } };
const ICON = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon';
const bar = ( n, tpl ) => ( { id: `0:bar${ n }`, slot: `${ ICON } > .sgs-nav-bar-menu__burger-bar-${ n }`, finder: { tpl: `Root/${ tpl }#0` } } );
const NODES = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/50#0' } }, bar( 2, 61 ), bar( 3, 62 ) ] } ];
// The inventory's records for the two growing bars (lib/intake-inventory-tpl.mjs: the button's style-hover sets --b2, --b3).
const grow = ( id, tpl, v, ms, delay ) => ( { id, name: `Transition on <span> ${ tpl }`, mechanism: 'css-transition', status: 'active', element: { dc: 'Draft', template_tpl_id: tpl }, trigger: { type: 'hover', detail: `the parent's style-hover sets ${ v }` }, properties: [ { property: 'width', from: `var(${ v },${ '--b2' === v ? 13 : 8 }px)`, to: '18px' } ], duration_ms: ms, delay_ms: delay, easing: EMPH } );
const RECORDS = [ grow( 'TR-015', '61', '--b2', 300, 0 ), grow( 'TR-016', '62', '--b3', 350, 40 ) ];
const run = ( { records = RECORDS, handle = db } = {} ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes: NODES, flat, refOf: ( x ) => x.ref, records, mdb: motionDb( handle ), db: handle, schema, rawSnapshot: raw, rootComponent: 'Draft' } );
	return { out, motion: flat[ 0 ].attributes.sgsMotion };
};

test( 'MUST FAIL: a width hover is the hover layer\'s width channel, resting at the draft\'s fallback length, on the record\'s own timing', () => {
	const { out, motion } = run();
	const b2 = motion?.elements?.[ 'burger-bar-2' ]?.hover?.state;
	const b3 = motion?.elements?.[ 'burger-bar-3' ]?.hover?.state;
	assert.ok( b2 && b3, JSON.stringify( out.unmapped ) );
	assert.deepEqual( [ b2.values.restWidth, b2.values.width, b2.values.duration, b2.values.delay ], [ '13px', '18px', 'token:duration.medium', undefined ] );
	assert.deepEqual( [ b3.values.restWidth, b3.values.width, b3.values.duration, b3.values.delay ], [ '8px', '18px', 350, 40 ], 'only the third bar waits 40ms' );
	assert.equal( b2.values.easing, 'token:easing.emphasised' );
	assert.equal( out.unmapped.filter( ( u ) => /layout-property hover|routed by hand/.test( u.reason ) ).length, 0, 'no width hover is left to be routed by hand' );
	assert.equal( validateMotionWrite( motion, schema ).valid, true );
} );

test( 'MUST FAIL: a hover driven from an ancestor plays from the block\'s item host; without one it is a named row', () => {
	const { motion } = run();
	assert.equal( motion.elements[ 'burger-bar-2' ].hover.state.source, 'item', 'the menu button drives the bars (supports.sgs.animationItems)' );
	// The same block with no item host declared (a framework DB whose block_supports row carries none).
	const bare = openDb( fixtureDb( {
		motion_targets: [ { block_slug: 'sgs/nav-bar-menu', target: 'root', css_element: 'root', kind: 'root' }, { block_slug: 'sgs/nav-bar-menu', target: 'burger-bar-2', css_element: 'burger-bar-2', kind: 'part' }, { block_slug: 'sgs/nav-bar-menu', target: 'burger-bar-3', css_element: 'burger-bar-3', kind: 'part' } ],
		motion_fields: db.prepare( "SELECT * FROM motion_fields WHERE layer = 'hover.state'" ).all(),
	} ) );
	const none = run( { handle: bare } );
	assert.equal( none.motion.elements[ 'burger-bar-2' ].hover.state.source, undefined );
	assert.ok( none.out.unmapped.some( ( u ) => /drives this hover from an ancestor's hover, and the block declares no item host/.test( u.reason ) ) );
	// A hover on the element's own :hover takes no source.
	const own = run( { records: [ { ...RECORDS[ 0 ], trigger: { type: 'hover', detail: 'style-hover rule on the same element (!important)' } } ] } );
	assert.equal( own.motion.elements[ 'burger-bar-2' ].hover.state.source, undefined );
} );

test( 'MUST FAIL: a width the hover layer cannot hold as a px length is a named row, never a guessed width', () => {
	const { out, motion } = run( { records: [ { ...RECORDS[ 0 ], properties: [ { property: 'width', from: 'var(--b2)', to: '18px' } ] } ] } );
	assert.equal( motion?.elements?.[ 'burger-bar-2' ], undefined );
	assert.ok( out.unmapped.some( ( u ) => /width hover from var\(--b2\) to 18px: the hover layer's width and restWidth take px lengths, and var\(--b2\) is not one/.test( u.reason ) ) );
} );
