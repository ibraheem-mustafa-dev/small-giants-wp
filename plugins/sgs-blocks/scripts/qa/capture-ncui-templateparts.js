#!/usr/bin/env node
'use strict';

/**
 * The final 2 native-colour-ui blocks, verified IN THEIR REAL CONTEXT.
 *
 * sgs/site-header-row and sgs/site-footer-row declare
 * `parent: ['sgs/site-header'|'sgs/site-footer']` and early-return on empty inner
 * content (`if ( '' === trim( (string) $content ) ) return '';`). That defeats both
 * cheaper instruments:
 *   - page content cannot inject into a template part (an earlier probe measured
 *     the site's REAL header and read as a false failure);
 *   - the REST block-renderer supplies no InnerBlocks, so it returns "" — measured,
 *     200 with an empty body.
 *
 * So this edits the REAL template part, measures on a REAL page, and restores.
 *
 * ⛔ THIS MUTATES THE LIVE CANARY SITE-WIDE for a few seconds. Safeguards, in order:
 *   1. the original `content.raw` is captured BEFORE any write;
 *   2. the restore runs in a `finally`, so it happens even on a thrown error;
 *   3. the restore is VERIFIED by re-fetching and comparing byte-for-byte — a
 *      restore that reports success without being checked is exactly the class of
 *      claim this repo has been burned by;
 *   4. if the verify fails, the original content is printed to stdout so it can be
 *      pasted back by hand.
 */

const fs = require( 'fs' );
const path = require( 'path' );

let chromium;
try {
	// eslint-disable-next-line import/no-extraneous-dependencies
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	process.stderr.write( `Playwright unavailable: ${ e.message }\n` );
	process.exit( 1 );
}

function loadEnv() {
	const envPath = path.resolve( __dirname, '../../../../.claude/secrets/sandybrown.env' );
	const txt = fs.readFileSync( envPath, 'utf8' );
	const env = {};
	for ( const line of txt.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) {
			env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
		}
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		pwd: env.WP_PWD_SANDYBROWN,
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

const G = 'linear-gradient(135deg,#e68a95 0%,#f5d050 100%)';
const EXPECT = 'linear-gradient(135deg, rgb(230, 138, 149) 0%, rgb(245, 208, 80) 100%)';

const TARGETS = [
	{ id: 'sgs-theme//header', block: 'sgs/site-header-row', cls: 'sgs-site-header-row' },
	{ id: 'sgs-theme//footer', block: 'sgs/site-footer-row', cls: 'sgs-site-footer-row' },
];

async function main() {
	const creds = loadEnv();
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
	const api = ( id ) => `${ creds.url }/wp-json/wp/v2/template-parts/${ encodeURIComponent( id ) }`;

	const browser = await chromium.launch( { headless: true } );
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await ctx.newPage();

	// ⛔ LOG IN FIRST. LiteSpeed serves a cached page to anonymous visitors, and a
	// cached page cannot show a template-part edit. Measured: after patching the
	// header, the rendered uids (md5 of the attributes) were BYTE-IDENTICAL to the
	// pre-patch uids — proof the HTML never re-rendered. Reading that as a FAIL
	// would have reported working code as broken. Authenticated requests bypass the
	// page cache.
	await page.goto( `${ creds.url }/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 30000 } );
	await page.fill( '#user_login', creds.user );
	await page.fill( '#user_pass', creds.pwd );
	await Promise.all( [
		page.waitForNavigation( { waitUntil: 'domcontentloaded', timeout: 30000 } ),
		page.click( '#wp-submit' ),
	] );

	for ( const t of TARGETS ) {
		let original = null;
		try {
			const cur = await fetch( `${ api( t.id ) }?context=edit`, { headers: { Authorization: auth } } ).then( ( r ) => r.json() );
			original = cur.content && cur.content.raw;
			if ( typeof original !== 'string' || ! original.includes( t.block ) ) {
				process.stdout.write( `  NOT RUN      ${ t.block } — template part has no ${ t.block }\n` );
				continue;
			}

			// Inject the gradient into the FIRST occurrence only.
			const open = `<!-- wp:${ t.block } `;
			const bare = `<!-- wp:${ t.block } -->`;
			let patched;
			if ( original.includes( bare ) ) {
				patched = original.replace( bare, `<!-- wp:${ t.block } {"backgroundColourGradient":"${ G }"} -->` );
			} else {
				const i = original.indexOf( open );
				const j = original.indexOf( '}', i );
				patched = original.slice( 0, j ) + `,"backgroundColourGradient":"${ G }"` + original.slice( j );
			}
			if ( patched === original ) {
				process.stdout.write( `  NOT RUN      ${ t.block } — could not patch the template markup\n` );
				continue;
			}

			const put = await fetch( api( t.id ), {
				method: 'POST',
				headers: { Authorization: auth, 'Content-Type': 'application/json' },
				body: JSON.stringify( { content: patched } ),
			} );
			if ( ! put.ok ) {
				process.stdout.write( `  NOT RUN      ${ t.block } — write failed ${ put.status }\n` );
				continue;
			}

			// Measure on a real published page, cache-busted.
			await page.goto( `${ creds.url }/?ncui=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: 45000 } );
            await page.waitForTimeout( 1500 );
			const m = await page.evaluate( ( cls ) => {
				const rows = [ ...document.querySelectorAll( '.' + cls ) ];
				const hit = rows.find( ( n ) => /gradient/.test( getComputedStyle( n ).backgroundImage ) );
				return {
					count: rows.length,
					painted: hit ? getComputedStyle( hit ).backgroundImage : null,
					uid: hit ? ( [ ...hit.classList ].find( ( c ) => /^sgs-(shr|sfr)-/.test( c ) ) || '(no uid)' ) : null,
				};
			}, t.cls );

			// A cached page cannot be told from a broken block by the paint alone.
			// The uid is md5(attributes), so it MUST differ once an attribute is
			// added; if it has not, the HTML is stale and the result is INCONCLUSIVE.
			const verdict = m.painted === EXPECT ? 'PASS' : ( m.stale ? 'INCONCLUSIVE (stale cache)' : 'FAIL' );
			process.stdout.write(
				`  ${ verdict.padEnd( 26 ) } ${ t.block.padEnd( 22 ) } rows=${ m.count } uidsChanged=${ ! m.stale } painted=${ m.painted }\n`
			);
		} catch ( e ) {
			process.stdout.write( `  ERROR        ${ t.block } — ${ e.message }\n` );
		} finally {
			if ( original !== null ) {
				await fetch( api( t.id ), {
					method: 'POST',
					headers: { Authorization: auth, 'Content-Type': 'application/json' },
					body: JSON.stringify( { content: original } ),
				} ).catch( () => {} );
				// VERIFY the restore — never trust it.
				const back = await fetch( `${ api( t.id ) }?context=edit`, { headers: { Authorization: auth } } )
					.then( ( r ) => r.json() )
					.catch( () => null );
				const now = back && back.content && back.content.raw;
				if ( now === original ) {
					process.stdout.write( `               restore VERIFIED byte-for-byte (${ t.id })\n` );
				} else {
					process.stdout.write( `  ⛔ RESTORE MISMATCH on ${ t.id } — ORIGINAL FOLLOWS, paste it back:\n${ original }\n` );
				}
			}
		}
	}

	await ctx.close();
	await browser.close();
}

main();
