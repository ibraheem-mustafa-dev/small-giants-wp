#!/usr/bin/env node
/**
 * Minify hand-written JavaScript for the deploy payload (deploy_minify.py calls it).
 *
 * Reads a JSON object { "<path>": "<js text>", ... } on stdin and writes { "<path>": "<minified js>", ... } on stdout.
 * terser with compress and mangle off: comments and whitespace go, every statement, name and string stays, so the code
 * behaves as written (globals other scripts read, function names, `wp_localize_script` objects). `/*!`, `@license` and
 * `@preserve` comments are kept. A file holding an `import` or `export` statement is parsed as a module, any other as
 * a classic script.
 *
 * Exit 1 with the path on stderr when a file does not parse, so a deploy never ships a half-minified script.
 *
 * Self-check: echo '{"a.js":"/* x *\/ var a = 1; // y"}' | node plugins/sgs-blocks/scripts/minify-js.mjs
 */
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { minify } = require( 'terser' );

let input = '';
process.stdin.setEncoding( 'utf8' );
for await ( const chunk of process.stdin ) {
	input += chunk;
}

const MODULE_SYNTAX = /^\s*(?:import\s*[\w{*'"]|export\s)/m;
const files = JSON.parse( input );
const out = {};
for ( const [ path, js ] of Object.entries( files ) ) {
	try {
		const result = await minify( js, {
			module: MODULE_SYNTAX.test( js ),
			compress: false,
			mangle: false,
			format: { comments: /^!|@license|@preserve/ },
		} );
		out[ path ] = result.code ?? '';
	} catch ( error ) {
		process.stderr.write( `minify-js: ${ path }: ${ error.message }\n` );
		process.exit( 1 );
	}
}
process.stdout.write( JSON.stringify( out ) );
