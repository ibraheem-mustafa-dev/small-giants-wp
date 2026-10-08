/**
 * Self-test runner: positive and negative fixtures for both checks.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const { runCheckABasic } = require( './self-test-a-basic' );
const { runCheckAOwnComponent } = require( './self-test-a-own-component' );
const { runCheckAContext } = require( './self-test-a-context' );
const { runCheckAExemptions } = require( './self-test-a-exemptions' );
const { runCheckB } = require( './self-test-b-keyword' );
const { runRealTree } = require( './self-test-real-tree' );
const { runSignals12 } = require( './self-test-signals-12' );
const { runSignals345 } = require( './self-test-signals-345' );

function runSelfTest() {
	const log = ( msg ) => process.stdout.write( msg + '\n' );
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-editor-render-parity-' ) );

	function writeBlock( dirName, files ) {
		const dir = path.join( tmpRoot, dirName );
		fs.mkdirSync( dir, { recursive: true } );
		for ( const [ name, content ] of Object.entries( files ) ) {
			fs.writeFileSync( path.join( dir, name ), content, 'utf8' );
		}
		return dir;
	}

	const ctx = { pass: true, log, writeBlock, tmpRoot, failuresA: [] };

	log( '[check-editor-render-parity --self-test] CHECK A (editor-canvas desync)\n' );
	runCheckABasic( ctx );
	runCheckAOwnComponent( ctx );
	runCheckAExemptions( ctx );
	runCheckAContext( ctx );
	runCheckB( ctx );
	runSignals12( ctx );
	runSignals345( ctx );

	fs.rmSync( tmpRoot, { recursive: true, force: true } );

	runRealTree( ctx );

	return ctx.pass ? 0 : 1;
}


module.exports = {
	runSelfTest,
};
