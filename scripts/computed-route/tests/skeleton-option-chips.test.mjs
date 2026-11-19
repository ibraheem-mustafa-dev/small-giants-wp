// A group of pressable chips outside a form is the option picker (rule optionSet / optionSetFilter), which draws its own
// options. Its chips are absorbed, so nothing read their look: Help's topic chips came out grey outlines under a stray "Choose an
// option" legend (2026-11-19). The picker now switches its own legend off (rules.optionSet.hideLabel) and reads its pill settings
// at the draft's chips at the position each calibrated slot names (lib/skeleton-part-slots.mjs::chipSlots). Pure functions only:
// no command is spawned and no site is contacted. Mutation list: tests/skeleton-option-chips.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, run, find, facts, REPO } from './fixtures/skeleton-widgets/build.mjs';
import { chipSlots } from '../lib/skeleton-part-slots.mjs';
import { openDb } from '../lib/db.mjs';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';

const P = '.sgs-option-picker__options > .sgs-option-picker__option';
const cal = {
	pillBgColour: { slot: `${ P }:nth-of-type(2) > .sgs-option-picker__pill` },
	pillSelectedBgColour: { slot: `${ P }:nth-of-type(1) > .sgs-option-picker__pill` },
	pillBorderWidth: { slot: `${ P }:nth-of-type(1) > .sgs-option-picker__pill` },
	pillBorderColourGradient: { slot: `${ P }:nth-of-type(1) > .sgs-option-picker__pill::before` },
	pillShadow: { slot: `${ P }:nth-of-type(7) > .sgs-option-picker__pill` },
	maxWidth: { slot: '' },
};
const calSettings = ( slug ) => ( 'sgs/option-picker' === slug ? cal : {} );
const chip = ( words ) => N( 'button', { attrs: { 'aria-pressed': 'false' }, words } );
const page = () => N( 'section', {}, [ N( 'div', {}, [ chip( 'All' ), chip( 'Ordering' ), chip( 'Allergens' ) ] ) ] );
const picker = ( r ) => find( r.skeleton, ( x ) => 'sgs/option-picker' === x.name )[ 0 ];

test( 'MUST FAIL: a chip group is an option picker with its own legend switched off', () => {
	assert.equal( picker( run( page(), '' ) ).attributes.showLabel, false );
} );

test( 'MUST FAIL: the picker reads each pill setting at the draft chip at the position its calibrated slot names', () => {
	const slots = picker( run( page(), '', { calSettings } ) ).draftSlots;
	assert.deepEqual( slots[ `${ P }:nth-of-type(2) > .sgs-option-picker__pill` ], { tpl: 'Root/4#0' }, 'the resting setting is read at the second chip' );
	assert.deepEqual( slots[ `${ P }:nth-of-type(1) > .sgs-option-picker__pill` ], { tpl: 'Root/3#0' }, 'the selected settings are read at the first chip' );
	assert.equal( slots[ `${ P }:nth-of-type(1) > .sgs-option-picker__pill::before` ], undefined, 'a pseudo-element slot is not read' );
	assert.equal( slots[ '' ], undefined, 'the picker\'s own settings are not chip settings' );
} );

test( 'negative control: with no calibration the picker reads no chip, and a chip position the draft lacks is said', () => {
	assert.equal( picker( run( page(), '' ) ).draftSlots, undefined );
	const out = chipSlots( { db: openDb(), block: 'sgs/option-picker', part: 'pill', chips: [ { key: 'a' } ], finder: ( e ) => ( { tpl: e.key } ), calibrated: cal } );
	assert.deepEqual( Object.keys( out.slots ), [ `${ P }:nth-of-type(1) > .sgs-option-picker__pill` ] );
	assert.match( out.notes.join( ' ' ), /pillBgColour: its calibrated slot is chip 2 and the draft has 1/ );
} );

test( 'a decisions entry naming a legend setting the block lacks is a problem; the shipped one is not', () => {
	const f = facts( REPO );
	assert.deepEqual( decisionsProblems( f ).filter( ( p ) => /rules\.optionSet/.test( p ) ), [] );
	f.decisions = structuredClone( f.decisions );
	f.decisions.rules.optionSet.hideLabel.setting = 'noSuchSetting';
	assert.match( decisionsProblems( f ).join( ' ' ), /rules\.optionSet\.hideLabel names noSuchSetting/ );
} );
