// tools/probe-openers.mjs: the parts that read a row without a browser. The verdict says why intake's openers() would
// drop (or wrongly offer) a state, the outcome says what a probed row proves, and the gap ids come from state-values rows only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gapSurfaceIds, openerVerdict, outcomeOf } from '../tools/probe-openers.mjs';

const surface = ( states ) => ( { id: 'S-1', component: 'Comp', states, openedBy: null } );
const verdict = ( name, keys ) => {
	const st = { name, state_keys: keys };
	return openerVerdict( surface( [ st ] ), st, null );
};

test( 'MUST FAIL gapSurfaceIds names the surfaces of state-values rows only, once each', () => {
	const gaps = [
		{ construct: 'state-values', draftId: 'S-52:in progress, S-52:draft restored, S-53:active' },
		{ construct: 'state-values', draftId: 'S-03:current section, S-52:errors' },
		{ construct: 'census', draftId: 'S-99:other' },
		{ construct: 'state-values', draftId: 'Comp' },
	];
	assert.deepEqual( gapSurfaceIds( gaps ), [ 'S-52', 'S-53', 'S-03' ] );
} );

test( 'MUST FAIL openerVerdict gives the reason a state is not a concrete opener', () => {
	assert.equal( verdict( 'open', {} ), 'no state keys' );
	assert.match( verdict( 'pinned', { 'R.pin': true } ), /not a state key name: R\.pin/ );
	assert.match( verdict( 'selected', { cat: '<category>' } ), /placeholder or description value for cat/ );
	assert.match( verdict( 'errors', { errs: '{a, b}' } ), /placeholder or description value for errs/ );
	assert.match( verdict( 'item open', { faqOpen: { '<page>-<bi>': true } } ), /placeholder or description value for faqOpen/ );
	assert.match( verdict( 'topic', { topic: [ '<label>' ] } ), /placeholder or description value for topic/ );
	assert.equal( verdict( 'closed', { active: null } ), 'closed/default state is not an opener' );
} );

test( 'MUST FAIL a concrete state is offered', () => {
	assert.equal( verdict( 'open', { active: 1 } ), 'concrete (offered)' );
	assert.equal( verdict( 'open', { mobileOpen: true } ), 'concrete (offered)' );
	// A width key's comparison is the viewport's bound, never a description; without the width keys it is one.
	const st = { name: 'open', state_keys: { mobileOpen: true, w: '>= 768' } };
	assert.equal( openerVerdict( surface( [ st ] ), st, null, new Map( [ [ 'Comp', new Set( [ 'w' ] ) ] ] ) ), 'concrete (offered)' );
	assert.match( openerVerdict( surface( [ st ] ), st, null ), /placeholder or description value for w/ );
} );

test( 'MUST FAIL outcomeOf: no instance, a key the instance did not hold, a placeholder, then the sc-if count', () => {
	const row = ( over ) => ( { mounted: 1, notLiveKeys: [], opener: 'concrete (offered)', scIf: { listed: 3, before: 0, after: 2 }, ...over } );
	assert.equal( outcomeOf( row( { mounted: 0, notLiveKeys: [ 'x' ] } ) ), 'no live instance on this page' );
	assert.equal( outcomeOf( row( { notLiveKeys: [ 'isDesktop' ] } ) ), 'not a state key of the live instance: isDesktop' );
	assert.match( outcomeOf( row( { opener: 'placeholder inside the value of errs (openers() offers it)' } ) ), /^placeholder value applied: 2 of 3 sc-if render/ );
	assert.equal( outcomeOf( row() ), 'own keys applied: 0 -> 2 of 3 sc-if render' );
	assert.equal( outcomeOf( row( { scIf: { listed: 0, before: 0, after: 0 } } ) ), 'own keys applied: no sc-if listed' );
} );
