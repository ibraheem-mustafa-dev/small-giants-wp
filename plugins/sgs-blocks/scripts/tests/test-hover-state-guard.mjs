/**
 * Gate wrapper for the touch-safe hover emitter's PHP self-test.
 *
 * The assertions live in `scripts/test-hover-state-guard.php` because the thing
 * under test is PHP: `includes/helpers-hover-state.php`, which every SGS
 * `:hover` rule is emitted through. Testing a JS reimplementation of it would
 * only prove the reimplementation works.
 *
 * This wrapper exists because `run-gates.py` deliberately allows only `python`
 * and `node` as gate interpreters (`_ALLOWED_EXE`). Widening that safety
 * boundary for one gate is the wrong trade, so the gate shells out instead.
 *
 * ⛔ FAILS CLOSED. If `php` cannot be executed this exits NON-ZERO rather than
 * skipping. A gate that passes when it could not run is the exact vacuity this
 * repo has been bitten by before (a live check that WARNS-and-PASSES when its
 * target is unreachable proves nothing on a disconnected machine).
 *
 * Run:  node scripts/tests/test-hover-state-guard.mjs
 * Exit: 0 = green, non-zero = red.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const target = path.join( here, '..', 'test-hover-state-guard.php' );

const result = spawnSync( 'php', [ target ], {
	cwd: path.join( here, '..', '..' ),
	encoding: 'utf8',
} );

if ( result.error ) {
	process.stdout.write(
		'FAIL: could not execute php — the hover-guard assertions did NOT run.\n' +
			'      This gate fails closed on purpose: a skipped check is not a passing one.\n' +
			`      ${ result.error.message }\n`
	);
	process.exit( 2 );
}

process.stdout.write( result.stdout || '' );
if ( result.stderr ) {
	process.stderr.write( result.stderr );
}

process.exit( result.status === null ? 2 : result.status );
