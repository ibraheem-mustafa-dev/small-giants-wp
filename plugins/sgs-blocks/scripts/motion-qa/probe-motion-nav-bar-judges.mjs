/**
 * Spec 38A unit M4.6 (Gate 5b): the pure half of `probe-motion-nav-bar.mjs`, its expectations read from the fixture
 * trees, its judges and the offline self-test (each judge with a negative control that must come out red).
 *
 * @package
 */

import fs from 'node:fs';
import path from 'node:path';
import { FIXTURE_DIR, isRest } from './probe-motion-model-lib.mjs';
import {
	judgeList,
	helperDelays,
	judgeReduced,
} from './probe-motion-nav-drawer.mjs';

export const HEADER_TREE = path.join(
	FIXTURE_DIR,
	'nav-bar-stagger-header.json'
);
export const MEGA_TREE = path.join( FIXTURE_DIR, 'nav-bar-stagger-mega.json' );
export const LADDER_KEYFRAME = 'sgs-nav-bar-menu-panel-item-in';
export const LADDER_STEP_MS = 70;
export const COLUMNS = '.sgs-nav-bar-menu__mega-item';

/* global getComputedStyle */
/**
 * Each column's computed timing and its running animations (runs in the page).
 * @param {string} sel The column selector.
 */
export const READ_COLUMNS = ( sel ) =>
	[ ...document.querySelectorAll( `.m46-bar ${ sel }` ) ].map( ( el ) => {
		const cs = getComputedStyle( el );
		return {
			delay: cs.animationDelay,
			name: cs.animationName,
			opacity: cs.opacity,
			translate: cs.translate,
			running: el.getAnimations().length,
			animations: el
				.getAnimations()
				.filter( ( a ) => /^sgs-me-/.test( a.animationName || '' ) )
				.map( ( a ) => ( {
					duration: a.effect.getTiming().duration,
				} ) ),
		};
	} );

/**
 * The expectations from the two fixture trees on disk.
 *
 * @return {Object} See `expectationsFrom`.
 */
export function readExpectations() {
	return expectationsFrom(
		JSON.parse( fs.readFileSync( HEADER_TREE, 'utf8' ) ),
		JSON.parse( fs.readFileSync( MEGA_TREE, 'utf8' ) )
	);
}

/**
 * The stored values the live page must show, from the two fixture trees.
 * @param {Object[]} header The header tree.
 * @param {Object[]} mega   The mega panel tree.
 * @return {Object} { columns, delays, itemDuration, panelClose, stagger }
 */
export function expectationsFrom( header, mega ) {
	let motion = null;
	let columns = 0;
	const walk = ( blocks ) => {
		for ( const b of blocks ) {
			const attrs = b.attributes || {};
			if (
				b.name === 'sgs/nav-bar-menu' &&
				/\bm46-bar\b/.test( attrs.className || '' )
			) {
				motion = attrs.sgsMotion || null;
			}
			if ( b.name === 'sgs/mega-panel' ) {
				columns = ( b.innerBlocks || [] ).length;
			}
			walk( b.innerBlocks || [] );
		}
	};
	walk( header );
	walk( mega );
	const stagger = motion?.stagger || {};
	const item = motion?.elements?.[ 'mega-item' ]?.entrance?.base || null;
	const panel = motion?.elements?.panel?.entrance?.base || null;
	return {
		columns,
		stagger,
		delays: helperDelays( columns, stagger ),
		itemDuration: item?.values?.duration ?? null,
		panelClose:
			panel?.close?.closeDuration ?? panel?.values?.duration ?? null,
	};
}

/**
 * Every running animation of one name family lasts the expected time. Rows: [{ name, duration }].
 * @param {Object[]} rows     Animations.
 * @param {number}   expected Duration in ms.
 * @return {boolean} True when non-empty and every one matches within 1ms.
 */
export function judgeDurations( rows, expected ) {
	return (
		Array.isArray( rows ) &&
		rows.length > 0 &&
		rows.every(
			( r ) =>
				Number.isFinite( r.duration ) &&
				Math.abs( r.duration - expected ) <= 1
		)
	);
}

export function selfTest() {
	const out = [];
	const ok = ( label, cond ) => out.push( { label, pass: Boolean( cond ) } );
	const exp = readExpectations();
	ok(
		'the trees: 15 columns on a 26ms step capped at 320ms (0, 26 ... 312, 320, 320)',
		exp.columns === 15 &&
			exp.stagger.step === 26 &&
			exp.stagger.cap === 320 &&
			judgeList(
				exp.delays,
				[
					0, 26, 52, 78, 104, 130, 156, 182, 208, 234, 260, 286, 312,
					320, 320,
				]
			)
	);
	ok(
		'the trees: items run 460ms, the panel closes in 200ms',
		exp.itemDuration === 460 && exp.panelClose === 200
	);
	ok(
		'judgeDurations passes matching animations',
		judgeDurations(
			[ { duration: 460 }, { duration: 460.4 } ],
			exp.itemDuration
		)
	);
	ok(
		'control: judgeDurations fails a wrong or missing duration',
		! judgeDurations( [ { duration: 230 } ], 460 ) &&
			! judgeDurations( [], 460 )
	);
	ok(
		'control: an uncapped step differs from the stored list',
		! judgeList( helperDelays( 15, { step: 26 } ), exp.delays )
	);
	ok(
		'control: the ladder step gives other delays than the stored ones',
		! judgeList( helperDelays( 15, { step: LADDER_STEP_MS } ), exp.delays )
	);
	ok(
		'judgeReduced (shared with the drawer probe) rejects a delayed item',
		! judgeReduced( [
			{ delay: '0.026s', running: 0, opacity: '1', translate: 'none' },
		] ) && isRest( 'none' )
	);
	for ( const row of out ) {
		console.log(
			JSON.stringify( {
				check: row.label,
				verdict: row.pass ? 'PASS' : 'FAIL',
			} )
		);
	}
	const failed = out.filter( ( r ) => ! r.pass ).length;
	console.log(
		JSON.stringify( {
			summary: true,
			selfTest: true,
			pass: out.length - failed,
			fail: failed,
		} )
	);
	return failed ? 1 : 0;
}
