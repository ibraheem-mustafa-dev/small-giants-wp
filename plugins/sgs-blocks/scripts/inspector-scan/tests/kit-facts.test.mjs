// node --test plugins/sgs-blocks/scripts/inspector-scan/tests/kit-facts.test.mjs
// core/kit-facts.js asks kit_wiring.py which kit attributes a block wires. The Python command differs by machine
// (python on Windows, python3 on Linux and WSL); a missing one must fall through to the next, and a real failure must say
// what failed instead of crashing rules 21 and 34 with a bare spawn error.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { kitFacts, pythonCandidates } = require( '../core/kit-facts.js' );
const BLOCKS = path.resolve( path.dirname( new URL( import.meta.url ).pathname.replace( /^\/([A-Z]:)/, '$1' ) ), '..', '..', '..', 'src', 'blocks' );

test( 'MUST FAIL before pythonCandidates: a missing first command falls through to the next', () => {
	const before = process.env.PYTHON;
	process.env.PYTHON = 'no-such-python-command';
	try {
		assert.deepEqual( pythonCandidates().slice( 0, 2 ), [ 'no-such-python-command', 'python' ] );
		assert.ok( pythonCandidates().includes( 'python3' ) );
		const facts = kitFacts( BLOCKS );
		assert.ok( facts[ 'sgs/buybox' ]?.addToCartColourBackground?.includes( 'L2' ), 'the kit facts still come back' );
	} finally {
		if ( undefined === before ) {
			delete process.env.PYTHON;
		} else {
			process.env.PYTHON = before;
		}
	}
} );
