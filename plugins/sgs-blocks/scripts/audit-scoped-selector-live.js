/**
 * audit-scoped-selector-live.js — the AUTHORITATIVE live audit + gate for the
 * "scoped selector whose class the element never carries" bug class (the
 * multi-button regression, D303 / P-SCOPED-SELECTOR-MATCH-AUDIT-AND-GATE).
 *
 * WHY LIVE (not static)
 * ---------------------
 *  A block's render.php applies its per-instance scope uid to the element in
 *  many PHP shapes (array_merge, a variable-held class array, esc_attr()
 *  wrapping, the shared wrapper's extra_classes). Static PHP analysis cannot
 *  reliably decide whether the uid actually lands as a CLASS — it false-
 *  positives on those shapes and could false-negative a real dead rule. STOP-21:
 *  emit-green ≠ landed. The painted DOM is the only ground truth.
 *
 * WHAT IT DOES
 * ------------
 *  For each URL:
 *    1. Load it headless.
 *    2. Read every inline <style> the page emitted (the SGS blocks' own scoped
 *       style tags).
 *    3. Extract every PER-INSTANCE SCOPE CLASS TOKEN used in a class-position
 *       selector (`.sgs-<block>-<hash|number>`) — the generated uid the block
 *       scopes its rules to. Framework element classes (`.sgs-hero__content`)
 *       and block-root classes (`.wp-block-sgs-hero`) are NOT scope tokens and
 *       are ignored (no trailing hash/number).
 *    4. For each scope token, assert `getElementsByClassName(token).length > 0`.
 *       A token used in a `.token{…}` rule but present on NO element (applied as
 *       an id only, or omitted) means the whole instance's scoped CSS is a
 *       silent render no-op — THE BUG.
 *    5. Report every dead scope token: the token, the block root it belongs to,
 *       and a sample rule. Exit non-zero if any dead token is found (gate mode).
 *
 * Usage
 * -----
 *   node scripts/audit-scoped-selector-live.js <url> [<url> …]
 *   node scripts/audit-scoped-selector-live.js --page 8        # sandybrown page N
 *   node scripts/audit-scoped-selector-live.js --json <url>
 *
 * Creds (for --page N): .claude/secrets/sandybrown.env (WP_URL_SANDYBROWN).
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );
const { chromium } = require( 'playwright' );

function loadEnv() {
	const envPath = path.resolve( __dirname, '../../../.claude/secrets/sandybrown.env' );
	const txt = fs.readFileSync( envPath, 'utf8' );
	const env = {};
	for ( const line of txt.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
	}
	return env;
}
function loadUrlBase() {
	const url = loadEnv().WP_URL_SANDYBROWN;
	if ( ! url ) throw new Error( 'WP_URL_SANDYBROWN not found in sandybrown.env' );
	return url.replace( /\/$/, '' );
}

// Push a manifest's blocks onto its pageId (so every block on the roster is
// exercised in one pass) — reuses the no-inline harness's REST convention.
async function pushManifest( manifestPath ) {
	const manifest = JSON.parse( fs.readFileSync( manifestPath, 'utf8' ) );
	const env = loadEnv();
	const base = env.WP_URL_SANDYBROWN.replace( /\/$/, '' );
	const auth = 'Basic ' + Buffer.from( `${ env.WP_USER_SANDYBROWN }:${ env.WP_APP_PWD_SANDYBROWN }` ).toString( 'base64' );
	const content = manifest.blocks
		.map( ( b ) => `<!-- wp:${ b.slug } ${ JSON.stringify( b.attrs || {} ) } /-->` )
		.join( '\n\n' );
	const res = await fetch( `${ base }/wp-json/wp/v2/pages/${ manifest.pageId }`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: auth },
		body: JSON.stringify( { content, status: 'publish' } ),
	} );
	if ( ! res.ok ) throw new Error( `REST PUT failed: ${ res.status } ${ res.statusText }\n${ await res.text() }` );
	process.stdout.write( `Pushed ${ manifest.blocks.length } blocks to page ${ manifest.pageId }.\n` );
	return `${ base }/?page_id=${ manifest.pageId }`;
}

const VIEWPORTS = { desktop: 1440, tablet: 768, mobile: 375 };

// Runs in the page. Returns { deadTokens:[…], scanned:N, tokens:[…] }.
const AUDIT = () => {
	// Any full sgs- class token (keeps hashes/numbers/BEM). We then classify each
	// occurrence by whether it is a PER-INSTANCE SCOPE uid — the only thing this
	// audit tests. Two uid signals:
	//   (a) HASH form: ends in `-<6+ hex>` (the md5-substr(8) blocks:
	//       sgs-hero-1a2b3c4d, sgs-container-abcdef01).
	//   (b) NUMERIC form used AS A SCOPE: ends in `-<digits>` (a wp_unique_id
	//       uid: sgs-mb-12, sgs-fg-3) AND, in some selector, is compounded with
	//       another class (`.uid.block`) or scopes a descendant (`.uid .el`).
	// A STANDALONE numeric class (`.sgs-cols-tablet-4{…}`) is a static utility
	// class, NOT a per-instance uid — excluded (it legitimately may have no
	// consumer on a page). BEM element classes (`.sgs-hero__content`) are never
	// uids (no trailing hash/number) and are ignored.
	const CLASS = /\.(sgs[\w-]*\w)/gi;
	const isHash = ( t ) => /-[0-9a-f]{6,}$/i.test( t ) && /[a-f]/i.test( t.split( '-' ).pop() );
	const isNumeric = ( t ) => /-\d+$/.test( t );

	const styles = Array.from( document.querySelectorAll( 'style' ) );
	const uidTokens = new Map(); // token -> a sample selector chunk

	for ( const st of styles ) {
		const css = st.textContent || '';
		for ( const chunk of css.split( '{' ) ) {
			let m;
			CLASS.lastIndex = 0;
			while ( ( m = CLASS.exec( chunk ) ) !== null ) {
				const token = m[ 1 ];
				const next = chunk[ m.index + m[ 0 ].length ] || '';
				if ( next === '_' ) continue; // BEM sub-name my regex truncated
				const usedAsScope = next === '.' || next === ' ' || next === '>' || next === '+' || next === '~';
				const isUid = isHash( token ) || ( isNumeric( token ) && usedAsScope );
				if ( ! isUid ) continue;
				if ( ! uidTokens.has( token ) ) {
					uidTokens.set( token, chunk.trim().slice( -120 ) );
				}
			}
		}
	}

	const dead = [];
	for ( const [ token, sampleSelector ] of uidTokens ) {
		if ( document.getElementsByClassName( token ).length === 0 ) {
			dead.push( { token, sampleSelector } );
		}
	}
	return { deadTokens: dead, scanned: uidTokens.size, tokens: Array.from( uidTokens.keys() ) };
};

async function auditUrl( browser, url ) {
	const perBp = {};
	for ( const [ bp, width ] of Object.entries( VIEWPORTS ) ) {
		const page = await browser.newPage( { viewport: { width, height: 1200 } } );
		await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }_cb=${ Date.now() }`, {
			waitUntil: 'networkidle', timeout: 45000,
		} );
		perBp[ bp ] = await page.evaluate( AUDIT );
		await page.close();
	}
	return perBp;
}

// Plant-test: prove the detector FIRES on an id-only regression and stays SILENT
// on a correctly class-applied block — the STOP-21 requirement, run offline
// against a synthetic fixture (no deploy). Exits 0 only if both hold.
async function plantTest() {
	// GOOD: uid on the element as a CLASS (the rule matches). BAD: uid used in a
	// `.uid` selector but present on the element only as an `id` (dead rule).
	const fixture = `<!doctype html><html><head><style>
	  .sgs-good-1a2b3c4d.sgs-blk{ color:red }
	  .sgs-bad-9f8e7d6c.sgs-blk{ color:blue }
	</style></head><body>
	  <div class="sgs-blk sgs-good-1a2b3c4d">good — uid is a class</div>
	  <div class="sgs-blk" id="sgs-bad-9f8e7d6c">bad — uid only an id</div>
	</body></html>`;
	const browser = await chromium.launch( { headless: true } );
	let dead;
	try {
		const page = await browser.newPage();
		await page.setContent( fixture );
		dead = ( await page.evaluate( AUDIT ) ).deadTokens.map( ( d ) => d.token );
	} finally {
		await browser.close();
	}
	const firedOnBad = dead.includes( 'sgs-bad-9f8e7d6c' );
	const silentOnGood = ! dead.includes( 'sgs-good-1a2b3c4d' );
	process.stdout.write( `plant-test: fired-on-bad=${ firedOnBad } silent-on-good=${ silentOnGood } (dead=${ JSON.stringify( dead ) })\n` );
	const pass = firedOnBad && silentOnGood;
	process.stdout.write( `plant-test: ${ pass ? 'PASS' : 'FAIL' }\n` );
	process.exit( pass ? 0 : 1 );
}

async function main() {
	const args = process.argv.slice( 2 );
	if ( args.includes( '--plant' ) ) return plantTest();
	const json = args.includes( '--json' );
	const rest = args.filter( ( a ) => a !== '--json' );

	const urls = [];
	for ( let i = 0; i < rest.length; i++ ) {
		if ( rest[ i ] === '--page' ) {
			urls.push( `${ loadUrlBase() }/?page_id=${ rest[ ++i ] }` );
		} else if ( rest[ i ] === '--manifest' ) {
			urls.push( await pushManifest( path.resolve( rest[ ++i ] ) ) );
		} else {
			urls.push( rest[ i ] );
		}
	}
	if ( ! urls.length ) {
		process.stderr.write( 'Usage: node audit-scoped-selector-live.js <url> [--page N] [--manifest file.json] …\n' );
		process.exit( 2 );
	}

	const browser = await chromium.launch( { headless: true } );
	const report = {};
	try {
		for ( const url of urls ) report[ url ] = await auditUrl( browser, url );
	} finally {
		await browser.close();
	}

	if ( json ) {
		process.stdout.write( JSON.stringify( report, null, 2 ) + '\n' );
	}

	let anyDead = false;
	process.stdout.write( '\n=== Live scoped-selector match audit ===\n' );
	for ( const [ url, perBp ] of Object.entries( report ) ) {
		process.stdout.write( `\n${ url }\n` );
		for ( const [ bp, res ] of Object.entries( perBp ) ) {
			const dead = res.deadTokens;
			if ( dead.length ) anyDead = true;
			process.stdout.write( `  ${ bp } (${ VIEWPORTS[ bp ] }px): scanned ${ res.scanned } scope tokens; ${ dead.length } DEAD\n` );
			for ( const d of dead ) {
				process.stdout.write( `     DEAD  .${ d.token }  — matches no element  [rule: …${ d.sampleSelector }]\n` );
			}
		}
	}
	process.stdout.write( `\nRESULT: ${ anyDead ? 'FAIL — dead per-instance scoped selectors found' : 'ALL PASS — every scope class lands on an element' }\n` );
	process.exit( anyDead ? 1 : 0 );
}

main().catch( ( e ) => { console.error( e ); process.exit( 2 ); } );
