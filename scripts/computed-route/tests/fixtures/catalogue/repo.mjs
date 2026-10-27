// A throwaway repository holding one catalogue fixture export under sites/demo/handoff (tests/catalogue-read.test.mjs,
// tests/site-build-catalogue.test.mjs). `edit( handoffDir )` may change the copy before it is read.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname( fileURLToPath( import.meta.url ) );

export function repoWith( name, edit = null ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'catalogue-' ) );
	const to = path.join( repo, 'sites', 'demo', 'handoff' );
	fs.cpSync( path.join( here, name ), to, { recursive: true } );
	edit && edit( to );
	return repo;
}
