// A client handoff that states a time zone sets WordPress's timezone_string; one that does not leaves the site alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPTS = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', 'plugins', 'sgs-blocks', 'scripts' );
const MODULE = process.env.PROVISION_MODULE || path.join( SCRIPTS, 'provision-site-info-from-draft.py' );
const py = ( code, ...args ) => spawnSync( 'python', [ '-c', `import importlib.util,sys,json\nsys.path.insert(0,${ JSON.stringify( SCRIPTS ) })\ns=importlib.util.spec_from_file_location('p',${ JSON.stringify( MODULE ) });m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n${ code }`, ...args ], { encoding: 'utf8' } );
const handoff = ( files ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'hand-' ) );
	Object.entries( files ).forEach( ( [ n, v ] ) => fs.writeFileSync( path.join( dir, n ), v ) );
	return dir;
};
const zoneOf = ( dir ) => {
	const r = py( 'from pathlib import Path\nprint(json.dumps(m.handoff_timezone(Path(sys.argv[1]))))', dir );
	assert.equal( r.status, 0, r.stderr );
	return JSON.parse( r.stdout );
};

test( 'a handoff that states one zone sets timezone_string, and the option is planned as a WRITE', () => {
	assert.equal( zoneOf( handoff( { 'README.md': 'Opening hours computed from Europe/London time.', 'surfaces.json': '{}' } ) ), 'Europe/London' );
	assert.equal( zoneOf( handoff( { 'surfaces.json': JSON.stringify( { timezone: 'Europe/Dublin', note: 'Europe/London' } ) } ) ), 'Europe/Dublin', 'a structured key wins' );
	const r = py( 'e=[{"owner":"wp-option","key":"timezone_string","address":"Europe/London","ref":"handoff"}]\nprint(json.dumps(m.plan(e,{},{"timezone_string":"UTC"})[0]["action"]))' );
	assert.equal( JSON.parse( r.stdout ), 'WRITE', r.stderr );
	assert.equal( JSON.parse( py( 'print(json.dumps(m.wp_option_problem("timezone_string","Europe/London")))' ).stdout ), null );
	const real = path.resolve( SCRIPTS, '..', '..', '..', 'sites', 'indus-foods', 'handoff' );
	fs.existsSync( real ) && assert.equal( zoneOf( real ), 'Europe/London', 'the Indus handoff states Europe/London' );
} );

test( 'negative control: no stated zone, two zones or a malformed zone leave the site alone', () => {
	assert.equal( zoneOf( handoff( { 'README.md': 'Hours are shown in local time.' } ) ), null );
	assert.equal( zoneOf( handoff( { 'README.md': 'Europe/London and America/New_York' } ) ), null );
	assert.equal( zoneOf( handoff( {} ) ), null );
	assert.equal( zoneOf( handoff( { 'surfaces.json': JSON.stringify( { timezone: 'London' } ) } ) ), null );
	assert.match( JSON.parse( py( 'print(json.dumps(m.wp_option_problem("timezone_string","London")))' ).stdout ), /IANA/ );
} );
