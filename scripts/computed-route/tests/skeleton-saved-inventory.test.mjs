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
