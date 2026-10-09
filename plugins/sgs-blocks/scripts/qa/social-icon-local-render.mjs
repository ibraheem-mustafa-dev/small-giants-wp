#!/usr/bin/env node
// Renders the QA tree's social-icons rows through the real render.php files (the PHPUnit child fixture) into one static
// page that links the built block stylesheets, so the comparison can run before anything is deployed.
//   node scripts/qa/social-icon-local-render.mjs [--tree <file>] --out <file.html>
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '../..' );
const args = process.argv.slice( 2 );
const arg = ( name, fallback ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : fallback );
const tree = JSON.parse( fs.readFileSync( arg( '--tree', path.join( HERE, 'social-icon-draft-rows.tree.json' ) ), 'utf8' ) );
const out = arg( '--out' );
if ( ! out ) {
	console.error( 'Give --out <file.html>.' );
	process.exit( 2 );
}

const renderRow = ( row ) => {
	const spec = path.join( os.tmpdir(), `sgs-local-render-${ process.pid }.json` );
	fs.writeFileSync(
		spec,
		JSON.stringify( {
			attributes: row.attributes,
			children: ( row.innerBlocks || [] ).map( ( c ) => ( { attributes: c.attributes || {}, bind: '' } ) ),
			site_info: {},
		} )
	);
	try {
		const result = JSON.parse( execFileSync( 'php', [ path.join( PLUGIN, 'tests/php/fixtures/social-icons-render-child.php' ), spec ], { encoding: 'utf8' } ) );
		if ( ! result.ok ) {
			throw new Error( result.error );
		}
		// WordPress's wrapper helper adds the block's own class; the CLI stub does not.
		const html = result.html.replace( 'class="sgs-social-icons ', 'class="wp-block-sgs-social-icons sgs-social-icons ' ).replace( /class="sgs-icon /g, 'class="wp-block-sgs-icon sgs-icon ' );
		return `<div id="${ row.attributes.anchor }">${ html }</div>`;
	} finally {
		fs.unlinkSync( spec );
	}
};

const css = [ 'build/blocks/icon/style-index.css', 'build/blocks/social-icons/style-index.css' ]
	.map( ( f ) => fs.readFileSync( path.join( PLUGIN, f ), 'utf8' ) )
	.join( '\n' );
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>:root{--wp--custom--easing--spring:cubic-bezier(0.34,1.56,0.64,1);--wp--custom--duration--fast:150ms;--wp--preset--color--accent:#d8ca50}body{margin:0;padding:40px;background:#2c3e50;font-family:system-ui}</style>
<style>${ css }</style></head><body>${ tree.map( renderRow ).join( '\n<p>&nbsp;</p>\n' ) }</body></html>`;
fs.writeFileSync( out, html );
console.log( `wrote ${ out }` );
