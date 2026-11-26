// The setState calls a surfaces.json state's how_to_reach prose gives (lib/intake-reach-calls.mjs::reachCalls, Spec 48A
// FR-48A-7), here the runtime's own lookup of a component's logic: Mama's records write their ways as
// `dcLogic('SiteHeader').setState({ nav: true })`, and a compound way (`MM.cart.clear(); dcLogic('SiteHeader').setState(...)`)
// needs its second call read beside the store call. Such a call names its component and runs on that component's logic only
// (lib/intake-state.mjs::logicState). Tests marked MUST FAIL fail before the dcLogic reading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reachCalls } from '../lib/intake-reach-calls.mjs';
import { logicState } from '../lib/intake-state.mjs';
import { describeWay } from '../lib/state-openers.mjs';

test( 'MUST FAIL: a dcLogic(\'<component>\').setState(...) call is a reach call naming its component, in either quote', () => {
	assert.deepEqual( reachCalls( 'dcLogic(\'Account\').setState({ tab: "subs", confirm: "s1" })' ), [ { ident: 'dcLogic', args: '{ tab: "subs", confirm: "s1" }', component: 'Account' } ] );
	assert.deepEqual( reachCalls( 'dcLogic( "SiteHeader" ) . setState({ nav: true })' ), [ { ident: 'dcLogic', args: '{ nav: true }', component: 'SiteHeader' } ] );
	assert.deepEqual( reachCalls( 'MM.cart.clear(); dcLogic(\'SiteHeader\').setState({ basket: true })' ), [ { ident: 'dcLogic', args: '{ basket: true }', component: 'SiteHeader' } ], 'the second call of a compound way' );
	assert.equal( describeWay( { via: 'reach', state: 'confirming', calls: reachCalls( 'dcLogic("Account").setState({x:1})' ) } ), 'reach "confirming" dcLogic(\'Account\').setState({x:1})' );
	assert.deepEqual( reachCalls( 'dcLogic(`Basket`).setState({ open: true })' ), [ { ident: 'dcLogic', args: '{ open: true }', component: 'Basket' } ], 'a name in backticks' );
	assert.deepEqual( reachCalls( 'dcLogic(\'Basket\')?.setState({ open: true })' ), [ { ident: 'dcLogic', args: '{ open: true }', component: 'Basket' } ], 'an optional call' );
	assert.deepEqual( reachCalls( 'L?.setState({a:1})' ), [ { ident: 'L', args: '{a:1}' } ] );
} );

test( 'negative controls: a lookup assigned to a name first is the name\'s call; mismatched quotes, another object\'s dcLogic and a lookup with no setState are no call', () => {
	assert.deepEqual( reachCalls( 'L = dcLogic(\'X\'); L.setState({a:1})' ), [ { ident: 'L', args: '{a:1}' } ] );
	assert.deepEqual( reachCalls( 'dcLogic(\'A").setState({x:1})' ), [] );
	assert.deepEqual( reachCalls( 'dcLogic(`${ name }`).setState({x:1})' ), [], 'a template literal with a hole names no component' );
	assert.deepEqual( reachCalls( 'dcLogic(`A\').setState({x:1})' ), [], 'a backtick closed by a quote' );
	assert.deepEqual( reachCalls( 'dcLogic(\'A$B\').setState({x:1})' ), [ { ident: 'dcLogic', args: '{x:1}', component: 'A$B' } ], 'a $ in a quoted name is part of it' );
	assert.deepEqual( reachCalls( 'dcLogic(`A$B`).setState({x:1})' ), [ { ident: 'dcLogic', args: '{x:1}', component: 'A$B' } ], 'a $ with no brace in a backtick name too' );
	assert.deepEqual( reachCalls( 'window.dcLogic(\'X\').setState({a:1})' ), [] );
	assert.deepEqual( reachCalls( 'dcLogic(\'X\').state.open' ), [] );
	assert.deepEqual( reachCalls( 'dcLogic(\'X\').setState({open:true' ), [], 'unbalanced arguments' );
	assert.deepEqual( reachCalls( 'L.setState({a:1})' )[ 0 ], { ident: 'L', args: '{a:1}' }, 'a plain call names no component' );
} );

test( 'MUST FAIL: in the page the call runs on the named component\'s logic, never on another component\'s', () => {
	const made = [];
	const host = ( name ) => ( { dataset: { scName: name }, '__reactFiber$t': { stateNode: { __name: name, logic: { state: {}, setState: ( p ) => made.push( [ name, p ] ) } } } } );
	const was = [ globalThis.document, globalThis.window ];
	globalThis.document = { querySelectorAll: () => [ host( 'Account' ), host( 'Basket' ) ] };
	globalThis.window = {};
	try {
		logicState( { comp: null, op: 'reach', patch: { calls: reachCalls( 'dcLogic(\'Account\').setState({tab:"subs"})' ) } } );
	} finally {
		[ globalThis.document, globalThis.window ] = was;
	}
	assert.deepEqual( made, [ [ 'Account', { tab: 'subs' } ] ] );
} );

test( 'MUST FAIL: a component name holding the other quote character, and an optional call of the lookup, are read', () => {
	assert.deepEqual( reachCalls( `dcLogic("Shop's Home").setState({ sub: true })` ), [ { ident: 'dcLogic', args: '{ sub: true }', component: "Shop's Home" } ] );
	assert.deepEqual( reachCalls( `dcLogic('Say "hi"').setState({a:1})` ), [ { ident: 'dcLogic', args: '{a:1}', component: 'Say "hi"' } ] );
	assert.deepEqual( reachCalls( "dcLogic?.('Basket').setState({ open: true })" ), [ { ident: 'dcLogic', args: '{ open: true }', component: 'Basket' } ] );
	assert.deepEqual( reachCalls( "dcLogic ?. ( 'Basket' )?.setState({ open: true })" ), [ { ident: 'dcLogic', args: '{ open: true }', component: 'Basket' } ], 'spaces and both optional steps' );
	assert.equal( describeWay( { via: 'reach', state: 's', calls: reachCalls( `dcLogic("Shop's Home").setState({x:1})` ) } ), `reach "s" dcLogic("Shop's Home").setState({x:1})`, 'the way\'s text quotes the name so it reads back' );
	assert.deepEqual( reachCalls( describeWay( { via: 'reach', state: 's', calls: reachCalls( `dcLogic("Shop's Home").setState({x:1})` ) } ) ), [ { ident: 'dcLogic', args: '{x:1}', component: "Shop's Home" } ] );
} );

test( 'negative controls: a quote of one kind is still closed only by the same kind, and an optional call on another object is no lookup', () => {
	assert.deepEqual( reachCalls( `dcLogic('A").setState({x:1})` ), [] );
	assert.deepEqual( reachCalls( `dcLogic("A').setState({x:1})` ), [] );
	assert.deepEqual( reachCalls( "window.dcLogic?.('X').setState({a:1})" ), [] );
	assert.deepEqual( reachCalls( "dcLogic?.('').setState({a:1})" ), [], 'an empty name names nothing' );
	assert.equal( describeWay( { via: 'reach', state: 's', calls: reachCalls( "dcLogic('Account').setState({x:1})" ) } ), "reach \"s\" dcLogic('Account').setState({x:1})", 'a plain name keeps its single quotes' );
} );
