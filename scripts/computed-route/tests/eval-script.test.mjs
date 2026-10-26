// The PHP body a wp-cli eval runner sends (lib/calibration-refs.mjs::evalScript). Real case: 2026-10-26, the template-copy
// and test-order PHP builders start with their own opening tag, so the runner sent `<?php <?php` and wp-cli refused it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evalScript } from '../lib/calibration-refs.mjs';

test( 'MUST FAIL: a body with its own opening tag gets exactly one', () => {
	const out = evalScript( '<?php\necho 1;' );
	assert.equal( out.match( /<\?php/g ).length, 1 );
	assert.match( out, /echo 1;/ );
} );

test( 'a bare body gets one opening tag', () => {
	assert.equal( evalScript( 'echo 2;' ), '<?php\necho 2;\n' );
} );
