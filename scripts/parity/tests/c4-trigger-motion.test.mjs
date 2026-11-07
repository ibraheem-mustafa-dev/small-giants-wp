import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTrigger, summarise, applyRulings } from '../detectors/c4-trigger-motion.mjs';

let n = 0;
const anim = ( over = {} ) => ( { t: 20, kind: 'CSSAnimation', target: '.item', delay: 0, duration: 300, easing: 'ease-out', props: [ 'opacity', 'transform' ], hidden: null, uid: ++n, loop: false, ...over } );
const stagger = ( n, step, over = {} ) => Array.from( { length: n }, ( _, i ) => anim( { delay: i * step, ...over } ) );
const rec = ( anims, longest = 30, trigger = 'drawer-accordion-1' ) => ( { trigger, status: 'ok', anims, longest } );
const checks = ( fs ) => fs.map( ( f ) => f.check ).sort();

test( 'FAIL fixture: draft runs a 9-item stagger at the accordion, live starts nothing (item 5)', () => {
	const f = compareTrigger( rec( stagger( 9, 60 ) ), rec( [] ), { page: 'home', width: 375 } );
	assert.deepEqual( checks( f ), [ 'no-animation-at-trigger' ] );
} );

test( 'FAIL fixture: 58 animations on hidden accordion children and a 212ms frame (item 17)', () => {
	const live = rec( [ ...stagger( 28, 30 ), ...stagger( 58, 30, { hidden: 'closed-details' } ) ], 212, 'drawer-open' );
	const f = compareTrigger( rec( stagger( 28, 30 ), 38, 'drawer-open' ), live, { page: 'home', width: 375 } );
	assert.ok( checks( f ).includes( 'animations-on-hidden-elements' ) );
	assert.ok( checks( f ).includes( 'longest-frame' ) );
} );

test( 'FAIL fixture: stagger restarts per gallery and opens later (item 4 detail)', () => {
	const draft = rec( [ ...Array.from( { length: 10 }, ( _, i ) => anim( { delay: i * 26, t: 110 } ) ) ], 20, 'mega-3' );
	const live = rec( [ 0, 26, 52, 78, 0, 26, 52, 0 ].map( ( d ) => anim( { delay: d, t: 185 } ) ), 20, 'mega-3' );
	const c = checks( compareTrigger( draft, live, {} ) );
	assert.ok( c.includes( 'stagger-span' ) && c.includes( 'start-latency' ) );
} );

test( 'NEGATIVE control: equal timing passes (About mega)', () => {
	const a = rec( stagger( 6, 40, { t: 100 } ), 20, 'mega-1' );
	const b = rec( stagger( 6, 42, { t: 110 } ), 22, 'mega-1' );
	assert.deepEqual( compareTrigger( a, b, {} ), [] );
} );

test( 'a frame under the 50ms floor passes even when the draft frame is smaller', () => {
	assert.deepEqual( compareTrigger( rec( stagger( 3, 50 ), 10 ), rec( stagger( 3, 50 ), 45 ), {} ), [] );
} );

test( 'a trigger that cannot be measured is reported, never passed', () => {
	const f = compareTrigger( rec( stagger( 3, 50 ) ), { trigger: 'x', status: 'unmeasured', reason: 'no button', anims: [], longest: 0 }, {} );
	assert.equal( f[ 0 ].severity, 'unmeasured' );
} );

test( 'summarise reads stagger step and span from distinct delays', () => {
	const s = summarise( rec( stagger( 5, 50 ) ) );
	assert.equal( s.step, 50 );
	assert.equal( s.span, 200 );
} );

test( 'a recorded ruling turns a fail into ruled', () => {
	const f = compareTrigger( rec( stagger( 4, 50 ) ), rec( [] ), { page: 'home', width: 375 } );
	const r = applyRulings( f, [ { id: 'D-9', scope: 'home', node: 'drawer-accordion-1', property: 'motion' } ] );
	assert.equal( r[ 0 ].severity, 'ruled' );
} );
