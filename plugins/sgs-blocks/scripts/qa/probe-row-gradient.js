#!/usr/bin/env node
'use strict';

/**
 * Set an attribute on every instance of one block inside a header/footer CPT,
 * measure the live paint, and restore.
 *
 * ⛔ THE ATTRIBUTE JSON IS PARSED, NEVER STRING-SPLICED. An earlier probe inserted
 * the key at the FIRST `}` after the block name. On a row like
 * `{"rowSlot":"top","columns":2,"padding":{},"rowShrink":{}}` that brace closes
 * `"padding":{}`, producing invalid JSON. WordPress then silently dropped ALL the
 * attributes back to defaults — which looked exactly like a rendering defect and was
 * reported as one. The tell was three rows sharing a single uid, impossible for
 * md5($attributes) on rows with different rowSlots.
 *
 * Usage: node probe-row-gradient.js <cpt> <id> <block> <cssClass>
 *   e.g. node probe-row-gradient.js sgs_header 1655 sgs/site-header-row sgs-site-header-row
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execSync } = require( 'child_process' );

let chromium;
try {
	// eslint-disable-next-line import/no-extraneous-dependencies
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	process.stderr.write( `Playwright unavailable: ${ e.message }\n` );
	process.exit( 1 );
}

const [ CPT, ID, BLOCK, CLS ] = process.argv.slice( 2 );
if ( ! CPT || ! ID || ! BLOCK || ! CLS ) {
	process.stderr.write( 'usage: probe-row-gradient.js <cpt> <id> <block> <cssClass>\n' );
	process.exit( 2 );
}

const GRAD = 'linear-gradient(135deg, #ff0000 0%, #0000ff 100%)';
const SSH =
	'ssh -i ~/.ssh/id_ed25519 -p 65002 -o StrictHostKeyChecking=no u945238940@141.136.39.73';
const ROOT =
	'/home/u945238940/domains/sandybrown-nightingale-600381.hostingersite.com/public_html';

function loadEnv() {
	const envPath = path.resolve( __dirname, '../../../../.claude/secrets/sandybrown.env' );
	const env = {};
	for ( const line of fs.readFileSync( envPath, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) {
			env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
		}
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

const purge = () => {
	try {
		execSync( `${ SSH } "cd ${ ROOT } && wp litespeed-purge all && wp cache flush"`, { stdio: 'pipe' } );
		return true;
	} catch ( e ) {
		return false;
	}
};

/**
 * Add an attribute to every OPENING comment of `block`, parsing each attribute
 * object properly. Returns { out, patched, failed }.
 *
 * @param {string} content Post content.
 * @param {string} block   Block name, e.g. 'sgs/site-header-row'.
 * @param {string} key     Attribute name.
 * @param {string} val     Attribute value.
 * @return {Object} Result.
 */
function addAttr( content, block, key, val ) {
	const open = `<!-- wp:${ block }`;
	let out = '';
	let i = 0;
	let patched = 0;
	let failed = 0;

	for ( ;; ) {
		const at = content.indexOf( open, i );
		if ( at < 0 ) {
			out += content.slice( i );
			break;
		}
		// Skip the CLOSING form `<!-- /wp:block -->` — it has a slash before wp:.
		if ( content.slice( Math.max( 0, at - 2 ), at + open.length ).includes( '/wp:' ) &&
			content[ at + 5 ] === '/' ) {
			out += content.slice( i, at + open.length );
			i = at + open.length;
			continue;
		}
		const end = content.indexOf( '-->', at );
		if ( end < 0 ) {
			out += content.slice( i );
			break;
		}
		const inner = content.slice( at + open.length, end );      // " {json} " or " " or " /"
		const selfClose = inner.trimEnd().endsWith( '/' );
		const jsonText = inner.replace( /\/\s*$/, '' ).trim();

		let attrs = {};
		if ( jsonText ) {
			try {
				attrs = JSON.parse( jsonText );
			} catch ( e ) {
				failed++;
				out += content.slice( i, end + 3 );
				i = end + 3;
				continue;
			}
		}
		attrs[ key ] = val;
		out += content.slice( i, at );
		out += `${ open } ${ JSON.stringify( attrs ) } ${ selfClose ? '/' : '' }-->`;
		i = end + 3;
		patched++;
	}
	return { out, patched, failed };
}

async function main() {
	const creds = loadEnv();
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
	const api = `${ creds.url }/wp-json/wp/v2/${ CPT }/${ ID }`;
	const get = async () =>
		( await ( await fetch( `${ api }?context=edit`, { headers: { Authorization: auth } } ) ).json() )
			.content.raw;

	const orig = await get();
	const browser = await chromium.launch( { headless: true } );
	const page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();

	try {
		const { out, patched, failed } = addAttr( orig, BLOCK, 'backgroundColourGradient', GRAD );
		process.stdout.write( `rows patched: ${ patched } · unparseable rows: ${ failed }\n` );
		if ( ! patched ) {
			process.stdout.write( 'NOT RUN — nothing patched; the probe, not the block, is at fault\n' );
			return;
		}
		await fetch( api, {
			method: 'POST',
			headers: { Authorization: auth, 'Content-Type': 'application/json' },
			body: JSON.stringify( { content: out } ),
		} );
		const stored = ( await get() ).includes( 'backgroundColourGradient' );
		purge();
		await new Promise( ( r ) => setTimeout( r, 2500 ) );

		await page.goto( `${ creds.url }/?probe=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: 45000 } );
		await page.waitForTimeout( 1800 );
		const m = await page.evaluate( ( cls ) => {
			const rows = [ ...document.querySelectorAll( '.' + cls ) ];
			const hit = rows.find( ( n ) => /gradient/.test( getComputedStyle( n ).backgroundImage ) );
			return {
				rows: rows.length,
				uids: [ ...new Set( rows.map( ( n ) => [ ...n.classList ].find( ( c ) => /^sgs-(shr|sfr)-/.test( c ) ) ) ) ].join( ',' ),
				painted: hit ? getComputedStyle( hit ).backgroundImage : null,
			};
		}, CLS );

		process.stdout.write( `stored=${ stored } rows=${ m.rows } distinctUids=${ m.uids }\n` );
		process.stdout.write( `VERDICT: ${ m.painted ? 'PASS — ' + m.painted : 'FAIL — nothing painted' }\n` );
	} finally {
		await fetch( api, {
			method: 'POST',
			headers: { Authorization: auth, 'Content-Type': 'application/json' },
			body: JSON.stringify( { content: orig } ),
		} );
		const back = await get();
		process.stdout.write( `restore byte-identical: ${ back === orig } · re-purged: ${ purge() }\n` );
		await browser.close();
	}
}

main();
