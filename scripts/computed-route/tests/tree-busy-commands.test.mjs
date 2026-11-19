// The deploy-or-reseed check (lib/tree.mjs::busyCommands, R-47-11, used by assertQuiet before calibration and builds): a Python
// process counts only when its script is build-deploy.py, sgs-update*.py or a seed-/seed_ script. It had matched `seed-`
// anywhere in a command line, so a render check's `--seed-step` argument stopped every calibration on the machine (MUST FAIL).
// Pure function; no process list is read. Mutation list: tests/fixtures/tree-busy-commands/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { busyCommands } from '../lib/tree.mjs';

test( 'MUST FAIL: a script argument naming a seed step is no reseed; the deploy and reseed scripts are', () => {
	const lines = [
		String.raw`C:\Python313\python.exe C:\repo\scripts\render-check\render-check.py --from local-x --seed-step "wsl -- php seed-thing.php" --jobs 4`,
		String.raw`C:\Python313\python.exe C:\repo\plugins\sgs-blocks\scripts\build-deploy.py --target sandybrown`,
		String.raw`"C:\Python313\python.exe" "C:\repo\plugins\sgs-blocks\scripts\dbschema\seed_reference_data.py"`,
		'/usr/bin/python3 /repo/plugins/sgs-blocks/scripts/seed-component-adoption.py --check',
		String.raw`python C:\Users\x\.claude\skills\sgs-wp-engine\scripts\sgs-update-v2.py`,
	].join( '\r\n' );
	const busy = busyCommands( lines );
	assert.equal( busy.length, 4, 'MUST FAIL: the render check is not busy' );
	assert.ok( ! busy.some( ( l ) => /render-check/.test( l ) ) );
} );

test( 'negative control: other Python scripts and empty input are quiet', () => {
	assert.deepEqual( busyCommands( String.raw`python C:\repo\scripts\check-md-wrap.py --check` + '\npython -m http.server' ), [] );
	assert.deepEqual( busyCommands( '' ), [] );
	assert.deepEqual( busyCommands( String.raw`python C:\repo\scripts\reseed_notes.py` ), [], 'a script whose name only contains seed is not a reseed' );
} );
