// The CA bundle the parity walker trusts for the live site's certificate: NODE_EXTRA_CA_CERTS when set, else the certifi
// bundle of the first Python that has it (`python -c "import certifi;print(certifi.where())"`), else none (the walker then
// runs with Node's own store).
import fs from 'fs';
import { spawnSync } from 'child_process';

const PROGRAMS = [ [ 'python' ], [ 'python3' ], [ 'py', '-3' ] ];

// The certifi bundle path from the first interpreter that prints an existing file, or null.
export function certifiPath( { run = ( cmd, args ) => spawnSync( cmd, args, { encoding: 'utf8', timeout: 15000 } ), exists = fs.existsSync } = {} ) {
	for ( const [ cmd, ...pre ] of PROGRAMS ) {
		const r = run( cmd, [ ...pre, '-c', 'import certifi;print(certifi.where())' ] );
		const out = 0 === r?.status ? String( r.stdout ).trim().split( /\r?\n/ ).pop() : '';
		if ( out && exists( out ) ) {
			return out;
		}
	}
	return null;
}

// NODE_EXTRA_CA_CERTS from `env` first, then the discovered certifi bundle, else null.
export const certsPath = ( env = process.env, find = certifiPath ) => env.NODE_EXTRA_CA_CERTS || find();
