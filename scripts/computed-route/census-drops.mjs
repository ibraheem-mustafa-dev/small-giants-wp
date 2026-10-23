// Writes the conservation drops of Fill runs as a markdown report (the list Track R works from).
//   node census-drops.mjs <report file> <date> <run dir>...
import fs from 'node:fs';
import { dropsReport } from './lib/census-drops-report.mjs';

const [ out, stamp, ...dirs ] = process.argv.slice( 2 );
if ( ! out || ! stamp || ! dirs.length ) {
	console.error( 'usage: node census-drops.mjs <report file> <date> <run dir>...' );
	process.exit( 2 );
}
fs.writeFileSync( out, `${ dropsReport( dirs, stamp ) }\n` );
console.log( `${ out }: ${ dirs.length } run folders` );
