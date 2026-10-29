// lib/skeleton-saved-inventory.mjs::servedInventoryOf (site-run.mjs and skeleton.mjs inventory --saved): intake's saved inventory of a state-only surface (a drawer, a mega-menu panel) is
// rewritten into the served draft's key space, where Fill's finders resolve (the runtime hosts the entry component as `Root`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { servedInventoryOf as servedInventory } from '../lib/skeleton-saved-inventory.mjs';

const inv = {
	root: '[data-sgs-skeleton-root="menu"]',
	checks: { rootName: 'Site', rootKey: 'Site/67#0' },
	elements: [
		{ key: 'Site/67#0', parentKey: 'Site/65#0', template: 'Site', tpl: 67 },
		{ key: 'Site/70#0', parentKey: 'Site/67#0', template: 'Site', tpl: 70 },
		{ key: 'Site>Card@12#0/2#0', parentKey: 'Site/70#0', template: 'Card', tpl: 2 },
		{ key: 'Site>Card@12#0/3#0', parentKey: 'Site>Card@12#0/2#0', template: 'Card', tpl: 3 },
	],
};

test( 'MUST FAIL: the entry component\'s keys, parents, host and root become Root, and an imported host chain starts at Root with its own template kept', () => {
	const out = servedInventory( inv, 'Site' );
	assert.deepEqual( out.elements.map( ( e ) => [ e.key, e.parentKey, e.template ] ), [ [ 'Root/67#0', null, 'Root' ], [ 'Root/70#0', 'Root/67#0', 'Root' ], [ 'Root>Card@12#0/2#0', 'Root/70#0', 'Card' ], [ 'Root>Card@12#0/3#0', 'Root>Card@12#0/2#0', 'Card' ] ] );
	assert.deepEqual( out.checks, { rootName: 'Root', rootKey: 'Root/67#0' } );
	assert.equal( out.root, inv.root );
	assert.equal( inv.elements[ 0 ].key, 'Site/67#0', 'the saved inventory is not changed' );
} );

test( 'an inventory with no entry component is unchanged', () => {
	assert.deepEqual( servedInventory( inv, null ).elements.map( ( e ) => e.key ), inv.elements.map( ( e ) => e.key ) );
} );

test( 'MUST FAIL: the siblings read beside the root (a footer\'s fixed chat link) are named in the served space, so the footer finds its floating strip', () => {
	const out = servedInventory( { ...inv, beside: [ { key: 'Site/728#0', side: 'after', distance: 1, position: 'fixed', renders: true, holdsOtherRoot: false } ], elements: [ ...inv.elements, { key: 'Site/728#0', parentKey: null, strip: { side: 'after', distance: 1 }, template: 'Site', tpl: 728 } ] }, 'Site' );
	assert.deepEqual( out.beside.map( ( b ) => [ b.key, b.side, b.position ] ), [ [ 'Root/728#0', 'after', 'fixed' ] ] );
	assert.ok( out.elements.some( ( e ) => e.key === out.beside[ 0 ].key ), 'the beside key names an element of the inventory' );
} );

test( 'negative control: an inventory read with no siblings beside its root gains no beside list', () => {
	assert.equal( 'beside' in servedInventory( inv, 'Site' ), false );
} );
