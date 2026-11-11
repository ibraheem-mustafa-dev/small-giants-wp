#!/usr/bin/env node
/**
 * Minify hand-written CSS for the deploy payload (deploy_minify.py calls it).
 *
 * Reads a JSON object { "<path>": "<css text>", ... } on stdin and writes { "<path>": "<minified css>", ... } on stdout.
 * csso with `restructure: false`: comments, whitespace and safe value shortening only; rules are never merged, moved
 * or reordered, so the cascade is the source's. `/*!` comments (licences) are kept.
 *
 * Exit 1 with the path on stderr when a file does not parse, so a deploy never ships a half-minified sheet.
 *
 * Self-check: echo '{"a.css":"/* x *\/ .a { color: red }"}' | node plugins/sgs-blocks/scripts/minify-css.mjs
 */
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const csso = require( 'csso' );

let input = '';
process.stdin.setEncoding( 'utf8' );
for await ( const chunk of process.stdin ) {
	input += chunk;
}

const files = JSON.parse( input );
const out = {};
for ( const [ path, css ] of Object.entries( files ) ) {
	try {
		out[ path ] = csso.minify( css, { restructure: false, comments: 'exclamation' } ).css;
	} catch ( error ) {
		process.stderr.write( `minify-css: ${ path }: ${ error.message }\n` );
		process.exit( 1 );
	}
}
process.stdout.write( JSON.stringify( out ) );
