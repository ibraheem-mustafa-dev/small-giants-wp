// solve.mjs's run summary prints the live judge's held and raised UNMAPPED counts beside the confirm counts
// (lib/solve-summary.mjs::confirmLiveLine over lib/confirm-live.mjs::writeConfirmLive's return).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { confirmLiveLine } from '../lib/solve-summary.mjs';

test( 'MUST FAIL: the confirm-live line carries the held and raised counts beside the confirm counts', () => {
	const line = confirmLiveLine( { file: 'out/confirm-live.json', counts: { agree: 4, differ: 1 }, unmapped: { held: 7, raised: 2 } } );
	assert.equal( line, 'confirm-live: {"agree":4,"differ":1}; unmapped held 7, raised 2 -> out/confirm-live.json' );
	// Zero is a count, never an absent judge.
	assert.match( confirmLiveLine( { file: 'f', counts: {}, unmapped: { held: 0, raised: 0 } } ), /unmapped held 0, raised 0/ );
} );

test( 'a result without the judge\'s unmapped counts says so, never prints zero', () => {
	assert.equal( confirmLiveLine( { file: 'f', counts: { agree: 1 } } ), 'confirm-live: {"agree":1}; unmapped not judged -> f' );
	assert.match( confirmLiveLine( { file: 'f', counts: {}, unmapped: { held: 3 } } ), /unmapped not judged/ );
} );

test( 'MUST FAIL: solve.mjs prints the live judge\'s result through confirmLiveLine', () => {
	const src = readFileSync( new URL( '../solve.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /import \{[^}]*\bconfirmLiveLine\b[^}]*\} from '\.\/lib\/solve-summary\.mjs'/ );
	assert.match( src, /const cl = writeConfirmLive\([^\n]*\n\t\tconsole\.log\( confirmLiveLine\( cl \) \);/ );
	assert.doesNotMatch( src, /`confirm-live: \$\{ JSON\.stringify\( cl\.counts \) \}/, 'the bare confirm counts line is gone' );
} );
