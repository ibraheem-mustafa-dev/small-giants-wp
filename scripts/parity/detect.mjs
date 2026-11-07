// Parity detectors CLI. Usage:
//   node scripts/parity/detect.mjs --client <slug> --site <url> --draft <url> [--pages a,b] [--widths 375,768,1024,1440] [--only C1,C2] --out <dir>
// Each detector is one module under scripts/parity/detectors/ with an exported run( opts ) returning { findings };
// add a detector by adding a line to DETECTORS. Writes <out>/detect.json and <out>/detect.md.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const DETECTORS = {
	C1: './detectors/c1-extra-effect.mjs',
	C2: './detectors/c2-hover-region.mjs',
	C3: './detectors/c3-scrollbars.mjs',
	C4: './detectors/c4-trigger-motion.mjs',
	C5: './detectors/c5-geometry.mjs',
	C6: './detectors/c6-connectors.mjs',
};

const argv = process.argv.slice( 2 );
const flag = ( n ) => {
	const i = argv.indexOf( n );
	return -1 === i ? null : argv[ i + 1 ];
};
const client = flag( '--client' );
const site = flag( '--site' );
const draft = flag( '--draft' );
const out = flag( '--out' );
if ( ! client || ! site || ! draft || ! out ) {
	console.error( 'Usage: node detect.mjs --client <slug> --site <url> --draft <url> [--pages a,b] [--widths 375,768,1024,1440] [--only C1,C2] --out <dir>' );
	process.exit( 2 );
}
const widths = ( flag( '--widths' ) || '375,768,1024,1440' ).split( ',' ).map( Number );
const buildDir = path.resolve( HERE, '../../sites', client, 'build' );
const map = JSON.parse( fs.readFileSync( path.join( buildDir, 'page-map.json' ), 'utf8' ) ).filter( ( p ) => p.route && p.id );
const wanted = flag( '--pages' )?.split( ',' );
const pages = wanted ? map.filter( ( p ) => wanted.includes( p.route ) ) : map;
const divFile = path.join( buildDir, 'qa', 'divergences.json' );
const divergences = fs.existsSync( divFile ) ? JSON.parse( fs.readFileSync( divFile, 'utf8' ) ) : [];
const only = flag( '--only' )?.split( ',' ).map( ( s ) => s.toUpperCase() );
fs.mkdirSync( out, { recursive: true } );

const all = {};
const md = [ `# Parity detectors: ${ client }`, '' ];
for ( const [ id, rel ] of Object.entries( DETECTORS ) ) {
	if ( only && ! only.includes( id ) ) {
		continue;
	}
	const mod = await import( pathToFileURL( path.join( HERE, rel ) ).href );
	const res = await mod.run( { client, site, draft, pages, widths, outDir: out, divergences } );
	all[ id ] = res;
	md.push( `## ${ id }`, ...( mod.summaryLines ? mod.summaryLines( res.findings ) : [] ).map( ( l ) => '- ' + l ), '' );
	for ( const f of res.findings.filter( ( x ) => 'fail' === x.severity ).slice( 0, 40 ) ) {
		md.push( `- FAIL ${ f.page } ${ f.width } ${ f.ref ?? '' } ${ f.trigger } ${ f.check }: draft ${ JSON.stringify( f.draft ) } live ${ JSON.stringify( f.live ) }` );
	}
	md.push( '' );
}
fs.writeFileSync( path.join( out, 'detect.json' ), JSON.stringify( all, null, 1 ) );
fs.writeFileSync( path.join( out, 'detect.md' ), md.join( '\n' ) + '\n' );
console.log( md.join( '\n' ) );
