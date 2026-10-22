// Bug-hunter run 5, lib/read-logic.mjs::resolveInPage (reached through askHoles): a chained comparison groups left to right, as in JS.
import test from 'node:test';
import assert from 'node:assert/strict';
import { askHoles } from '../lib/read-logic.mjs';

const ask = async ( expr ) => {
	const logic = { props: {}, renderVals: () => ( {} ) };
	const host = { __reactFiber$x: { stateNode: { logic, __name: 'C' } } };
	globalThis.document = { querySelector: () => host };
	globalThis.CSS = { escape: ( s ) => s };
	try {
		const page = { evaluate: async ( fn, arg ) => fn( arg ) };
		const got = await askHoles( page, { C: [ { k: 'k', expr, loops: [], cap: 1, maxLoop: 1, max: 4 } ] } );
		return got.C.holes.k;
	} finally {
		delete globalThis.document;
		delete globalThis.CSS;
	}
};

test( 'MUST FAIL (chained comparison): \'a\' === \'a\' === true is true', async () => {
	assert.deepEqual( ( await ask( "'a' === 'a' === true" ) ).v, [ { t: 'boolean', v: true } ] );
} );

test( 'a single comparison still reads', async () => {
	assert.deepEqual( ( await ask( "'a' !== 'b'" ) ).v, [ { t: 'boolean', v: true } ] );
} );
