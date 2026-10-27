// The one opener builder intake and Fill share (lib/state-openers.mjs; Spec 48 §3.4 step 1): Fill's stateOpener and
// intake's openers decide which keys are width bounds from the export's width keys, and which state_keys values are
// values, by the same rules. Records are the shapes handoff `surfaces.json` holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stateOpener, waysAt } from '../lib/fill-open.mjs';
import { openers } from '../lib/intake-openers.mjs';
import { isDescription, openStates, plainState, describeWay } from '../lib/state-openers.mjs';

// Home writes `w` from the viewport width (lib/state-reach.mjs::widthStateKeys over the export's breakpoints).
const W = new Map( [ [ 'Home', new Set( [ 'w' ] ) ] ] );
const FACTS = { state: { Home: { keys: [ 'acc', 'nav', 'menu', 'w', 'menuOpen' ], widthKeys: [] } } };
const fill = ( states, widthKeys = W ) => stateOpener( { entry: { states: Object.fromEntries( states.map( ( s ) => [ s.name, null ] ) ) }, skeleton: { id: 'S-01', root: { viaState: true } }, record: { id: 'S-01', dc: 'Home', route: '*', states }, facts: FACTS, rootComponent: null, widthKeys } );
const intake = ( states ) => openers( { id: 'S-01', component: 'Home', states, openedBy: null }, null, W );
const shape = ( ways ) => ways.map( ( w ) => [ w.via, w.state, w.keys ?? null, ( w.bounds || [] ).map( ( b ) => `${ b.key }:${ b.min }-${ b.max }` ) ] );

const ROW = { name: 'row 2 open', state_keys: { acc: '0–3' }, how_to_reach: 'L.setState({acc:2})', sc_if_tpl_ids: [] };

test( 'MUST FAIL: an accordion range key is not a width bound in Fill, so its way is offered at every width', () => {
	const o = fill( [ ROW ] );
	assert.deepEqual( shape( o.ways ), [ [ 'reach', 'row 2 open', null, [] ] ] );
	assert.deepEqual( waysAt( o, 375 ).map( ( w ) => w.via ), [ 'reach' ], 'offered at 375' );
	assert.deepEqual( waysAt( o, 1440 ).map( ( w ) => w.via ), [ 'reach' ], 'offered at 1440' );
	assert.deepEqual( o.dropped, [ { key: 'acc', why: 'a placeholder or description, not a value' } ] );
	assert.deepEqual( shape( intake( [ ROW ] ) ), shape( o.ways ), 'intake builds the same ways' );
} );

test( 'negative controls: a width key\'s comparison is still a bound in Fill and intake; a Fill run without width keys bounds nothing', () => {
	const st = { name: 'open', state_keys: { menuOpen: true, w: '>= 768' }, how_to_reach: 'L.setState({menuOpen:true, w:1400})', sc_if_tpl_ids: [] };
	const o = fill( [ st ] );
	assert.deepEqual( shape( o.ways ), [ [ 'reach', 'open', null, [ 'w:768-null' ] ], [ 'state', 'open', { menuOpen: true }, [ 'w:768-null' ] ] ] );
	assert.deepEqual( waysAt( o, 375 ), [], 'no way at 375' );
	assert.deepEqual( shape( intake( [ st ] ) ), shape( o.ways ) );
	assert.deepEqual( shape( fill( [ st ], new Map() ).ways ), [ [ 'reach', 'open', null, [] ], [ 'state', 'open', { menuOpen: true }, [] ] ], 'no width key: the comparison is a description, never a bound or a value' );
} );

test( 'MUST FAIL: a prose value ("menu is open") is decided the same way by Fill and intake: never set, the call first', () => {
	const st = { name: 'open', state_keys: { nav: true, menu: 'menu is open' }, how_to_reach: 'L.setState({nav:true})', sc_if_tpl_ids: [] };
	const o = fill( [ st ] );
	assert.deepEqual( shape( o.ways ), [ [ 'reach', 'open', null, [] ], [ 'state', 'open', { nav: true }, [] ] ] );
	assert.deepEqual( shape( intake( [ st ] ) ), shape( o.ways ) );
	// Negative control: a state of plain values sets them first, in both.
	const plain = { name: 'open', state_keys: { nav: true, menu: 'mobile' }, how_to_reach: 'L.setState({nav:true})', sc_if_tpl_ids: [] };
	assert.deepEqual( shape( fill( [ plain ] ).ways ), [ [ 'state', 'open', { nav: true, menu: 'mobile' }, [] ], [ 'reach', 'open', null, [] ] ] );
	assert.deepEqual( shape( intake( [ plain ] ) ), shape( fill( [ plain ] ).ways ) );
} );

test( 'MUST FAIL: isDescription keeps values and refuses descriptions (the cases the three clients\' handoffs hold)', () => {
	const descriptions = [ '<category>', 'new|<address id>', '{open:true}', '{}', '[]', '[{pid,size,lens}]', '{…}', '{â€¦}', 'IND-######', 'MM-####', '> 0', '>= 1', '<5 night feed', '0–3', '768-1023', '0–3 (default 0)', '0–3 (default)', 'menu is open', 'any filter set', 'forgot → sent → reset → done', { '<page>-<bi>': true }, { '<field>': '<message>' }, [ '<label>' ], { a: '> 0' } ];
	for ( const v of descriptions ) {
		assert.equal( isDescription( v ), true, `${ JSON.stringify( v ) } is a description` );
	}
	const values = [ true, false, 0, 3, null, 'All', 'about', 'sun', 'm|t', 'details', '2024-01-05', {}, { '0-1': true }, { 'about-1': true }, [ 'a', 'b' ], { open: true, step: 3 } ];
	for ( const v of values ) {
		assert.equal( isDescription( v ), false, `${ JSON.stringify( v ) } is a value` );
	}
} );

test( 'openStates drops closed and default and puts a state named open first, the rest in record order', () => {
	const names = openStates( [ { name: 'closed' }, { name: 'show' }, { name: 'Default' }, { name: 'hover' }, { name: 'open wide' } ] ).map( ( s ) => s.name );
	assert.deepEqual( names, [ 'open wide', 'show', 'hover' ] );
	assert.equal( plainState( { state_keys: { menuOpen: true } } ), true );
	assert.equal( plainState( { state_keys: { menuOpen: true, w: '< 768' } } ), false, 'a width bound puts the call first' );
} );

test( 'describeWay writes each way kind, with its bounds', () => {
	assert.equal( describeWay( { via: 'state', state: 'open', keys: { nav: true }, bounds: [] } ), 'state "open" {"nav":true}' );
	assert.equal( describeWay( { via: 'reach', state: 'open', calls: [ { ident: 'L', args: '{nav:true}' } ], bounds: [ { key: 'w', min: null, max: 767 } ] } ), 'reach "open" L.setState({nav:true}) at w <= 767' );
	assert.equal( describeWay( { via: 'trigger', draftId: 'Home:12', event: 'onClick', method: 'openNav' } ), 'trigger onClick on Home:12 (openNav)' );
} );
