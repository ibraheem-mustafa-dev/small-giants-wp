import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { SourceCache } = require( '../core/sources.js' );

function tempFile( name, text ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sources-regressions-' ) );
	const file = path.join( dir, name );
	fs.writeFileSync( file, text );
	return file;
}

test( 'strippedText keeps newlines inside a multi-line JS comment', () => {
	const file = tempFile( 'a.js', 'const a = 1;\n/* x\ny */\nconst b = 2;\n' );
	const stripped = new SourceCache().strippedText( file );
	assert.equal( stripped.split( '\n' ).length, 5 );
	assert.equal( stripped.split( '\n' )[ 3 ].trim(), 'const b = 2;' );
} );

test( 'strippedText keeps newlines inside a multi-line PHP block comment', () => {
	const file = tempFile( 'a.php', '<?php\n/* a\nb */\n$x = 1;\n' );
	const stripped = new SourceCache().strippedText( file );
	assert.equal( stripped.split( '\n' ).length, 5 );
	assert.equal( stripped.split( '\n' )[ 3 ].trim(), '$x = 1;' );
} );
